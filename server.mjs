import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {investigationPlan, searchYuanbao, YuanbaoSearchError} from './src/yuanbao.mjs';
import {serveSettings} from './src/settings.mjs';
import {saveGeneratedCase, readGeneratedCase, listGeneratedCases, validCaseId} from './src/case-store.mjs';

const defaultPort = 4191;

async function defaultKeyProvider() {
  if (process.env.TENCENTCLOUD_WSA_APIKEY) return process.env.TENCENTCLOUD_WSA_APIKEY;
  try {
    return JSON.parse(await readFile(new URL('./.local/config.json', import.meta.url), 'utf8')).apiKey;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function reply(res, code, data) {
  res.writeHead(code, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(data));
}

async function readJson(req, maxBytes = 8000) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    const error = new Error('请求须使用 application/json。');
    error.statusCode = 415;
    throw error;
  }
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error('输入过长。');
      error.statusCode = 413;
      throw error;
    }
    parts.push(chunk);
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}

export function createDetectiveServer({keyProvider = defaultKeyProvider, search = searchYuanbao, fetcher = fetch, caseDirectory} = {}) {
  const nonce = randomBytes(24).toString('hex');
  let busy = false;

  const server = http.createServer(async (req, res) => {
    const localPort = req.socket.localPort || defaultPort;
    const origin = `http://127.0.0.1:${localPort}`;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'`);
    if (req.headers.host !== `127.0.0.1:${localPort}`) return reply(res, 403, {error: '请从本机访问。'});

    try {
      const url = new URL(req.url || '/', origin);
      if (url.pathname.startsWith('/settings')) return await serveSettings(req, res, {nonce, origin});
      if (req.method === 'GET' && url.pathname === '/') {
        const html = (await readFile(new URL('./public/index.html', import.meta.url), 'utf8')).replaceAll('__NONCE__', nonce);
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
        return res.end(html);
      }
      if (req.method === 'GET' && ['/app.js', '/casefile.js', '/evidencecard.js'].includes(url.pathname)) {
        const location = url.pathname === '/evidencecard.js' ? './src/evidencecard.js' : `./public${url.pathname}`;
        const script = await readFile(new URL(location, import.meta.url), 'utf8');
        res.writeHead(200, {'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store'});
        return res.end(script);
      }
      if (req.method === 'GET' && url.pathname === '/status') return reply(res, 200, {configured: Boolean(await keyProvider())});
      if (req.method === 'GET' && url.pathname === '/cases') {
        const cases = await listGeneratedCases(caseDirectory);
        for (const id of ['01', '02', '03']) {
          try {
            const record = JSON.parse(await readFile(new URL(`./evidence/case-${id}.json`, import.meta.url), 'utf8'));
            let hasCard = false;
            try {
              await readFile(new URL(`./evidence/cards/card-${id}.json`, import.meta.url), 'utf8');
              hasCard = true;
            } catch (error) {
              if (error.code !== 'ENOENT') throw error;
            }
            cases.push({id, claim: record.claim, startedAt: record.startedAt, hasCard});
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
        }
        return reply(res, 200, {cases});
      }
      const caseMatch = url.pathname.match(/^\/cases\/([^/]+)$/);
      if (req.method === 'GET' && caseMatch) {
        const id = caseMatch[1];
        if (!validCaseId(id)) return reply(res, 404, {error: '案例编号无效；可使用已保存案例或本机生成的独立链接。'});
        if (['01', '02', '03'].includes(id)) {
          try {
            const record = JSON.parse(await readFile(new URL(`./evidence/case-${id}.json`, import.meta.url), 'utf8'));
            let card = null;
            try {
              card = JSON.parse(await readFile(new URL(`./evidence/cards/card-${id}.json`, import.meta.url), 'utf8'));
            } catch (error) {
              if (error.code !== 'ENOENT') throw error;
            }
            return reply(res, 200, {...record, caseId: id, replay: true, card});
          } catch (error) {
            if (error.code === 'ENOENT') return reply(res, 404, {error: '该案卷尚未保存。'});
            throw error;
          }
        }
        const generated = await readGeneratedCase(id, caseDirectory);
        return generated ? reply(res, 200, generated) : reply(res, 404, {error: '该本机生成案卷不存在或已被移除。'});
      }
      if (req.method === 'POST' && url.pathname === '/skill/cases') {
        if (req.headers.origin !== origin || req.headers['x-csrf-token'] !== nonce) return reply(res, 403, {error: '同源或 CSRF 校验失败，请从本机 Skill 重新读取页面。'});
        const input = await readJson(req, 600000);
        const record = await saveGeneratedCase(input, caseDirectory);
        return reply(res, 201, {caseId: record.caseId, path: `/?case=${record.caseId}`, message: '本机案卷已保存；未发布到外部。'});
      }
      if (req.method === 'POST' && url.pathname === '/investigate') {
        if (req.headers.origin !== origin || req.headers['x-csrf-token'] !== nonce) return reply(res, 403, {error: '同源或 CSRF 校验失败，请刷新本机页面。'});
        if (busy) return reply(res, 429, {error: '上一份查证还在进行，请稍候。'});
        const input = await readJson(req);
        const plan = investigationPlan(input?.claim, input?.domain, input?.need);
        const apiKey = await keyProvider();
        if (!apiKey) return reply(res, 503, {error: '元宝搜索尚未配置。请先在本机配置页完成连接。', needsSetup: true});
        busy = true;
        const rounds = [];
        const startedAt = new Date().toISOString();
        try {
          for (const step of plan) {
            try {
              const result = await search(step.query, apiKey, fetcher, {site: step.site});
              rounds.push({...step, status: 'success', requestId: result.requestId, pages: result.pages.map(page => ({...page, passage: page.passage.slice(0, 480)}))});
            } catch (error) {
              let message = '无法连接元宝搜索，请检查网络。';
              let errorCode = 'NetworkError';
              if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                message = '本轮元宝搜索超时，未获得结果。';
                errorCode = 'Timeout';
              } else if (error instanceof YuanbaoSearchError || String(error.message).startsWith('元宝搜索')) {
                message = error.message;
                errorCode = error.code || 'ProviderError';
              }
              rounds.push({...step, status: 'error', errorCode, error: message, requestId: null, pages: []});
              break;
            }
          }
          const outcome = rounds.some(round => round.status === 'error') ? 'partial' : rounds.every(round => round.pages.length === 0) ? 'empty' : 'success';
          return reply(res, 200, {
            claim: String(input.claim).trim(),
            domain: String(input.domain || '').trim().toLowerCase(),
            need: String(input.need).trim(),
            startedAt,
            completedAt: new Date().toISOString(),
            rounds,
            outcome,
            verdict: 'unreviewed'
          });
        } finally {
          busy = false;
        }
      }
      return reply(res, 404, {error: '页面不存在。'});
    } catch (error) {
      const status = error.statusCode || 400;
      const validationMessage = /^(请输入|请用|官方域名|案卷|证据卡|第 )/.test(String(error.message || '')) ? error.message : null;
      return reply(res, status, {error: error.statusCode ? error.message : validationMessage || '请求未完成，请检查查询内容和官方域名格式。'});
    }
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createDetectiveServer();
  const origin = `http://127.0.0.1:${defaultPort}`;
  server.listen(defaultPort, '127.0.0.1', () => console.log(`Detective preview: ${origin}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
