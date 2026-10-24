import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDetectiveServer} from '../server.mjs';
import {providerError} from '../src/yuanbao.mjs';

async function fixture(t, options = {}) {
  const server = createDetectiveServer({keyProvider: async () => 'test-secret-not-real', search: async () => ({pages: [], requestId: 'req-zero'}), ...options});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {base, server};
}

async function pageAndNonce(base) {
  const response = await fetch(base + '/');
  const html = await response.text();
  return {html, nonce: html.match(/script type="module" nonce="([a-f0-9]+)"/)?.[1]};
}

const NEED = '我每月生成 5 个模型，只做个人非商业用途。';

async function post(base, nonce, body, extraHeaders = {}) {
  return fetch(base + '/investigate', {method: 'POST', headers: {Origin: base, 'Content-Type': 'application/json', 'X-CSRF-Token': nonce, ...extraHeaders}, body: JSON.stringify(body)});
}

test('带案例参数的独立链接可刷新加载，回放保留真实贡献与出处', async t => {
  let searches = 0;
  const {base} = await fixture(t, {search: async () => { searches++; return {pages: [], requestId: null}; }});
  const response = await fetch(base + '/?case=01');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /AI 宣传查证所/);
  const recordResponse = await fetch(base + '/cases/01');
  const record = await recordResponse.json();
  assert.equal(record.caseId, '01');
  assert.equal(record.replay, true);
  assert.equal(record.analysis.reviewer, 'Codex（AI 助手）');
  assert.equal(record.analysis.findings[0].sources[0].provenance, 'direct_official');
  assert.equal(record.card.cardId, '01');
  assert.equal(record.card.claims.length, 3);
  assert.equal(record.card.claims[0].conditionIds[0], 'T1');
  assert.equal(searches, 0);
});

test('无效案例返回清楚错误且不触发外部搜索', async t => {
  let searches = 0;
  const {base} = await fixture(t, {search: async () => { searches++; return {pages: [], requestId: null}; }});
  for (const id of ['99', '..%2F01', '01.json']) {
    const response = await fetch(`${base}/cases/${id}`);
    assert.equal(response.status, 404);
    assert.match((await response.json()).error, /无效|不存在/);
  }
  assert.equal(searches, 0);
});

test('Skill 生成的证据卡可保存为本机独立案卷并刷新加载', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'detective-cases-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  let searches = 0;
  const {base} = await fixture(t, {caseDirectory: directory, search: async () => { searches++; return {pages: [], requestId: null}; }});
  const original = JSON.parse(await readFile(new URL('../evidence/case-01.json', import.meta.url), 'utf8'));
  const card = JSON.parse(await readFile(new URL('../evidence/cards/card-01.json', import.meta.url), 'utf8'));
  const {nonce} = await pageAndNonce(base);
  const payload = {claim: original.claim, domain: original.domain, need: card.exampleNeed, rounds: original.rounds, card, analysis: original.analysis};
  const response = await fetch(base + '/skill/cases', {method: 'POST', headers: {Origin: base, 'Content-Type': 'application/json', 'X-CSRF-Token': nonce}, body: JSON.stringify(payload)});
  assert.equal(response.status, 201);
  const saved = await response.json();
  assert.match(saved.caseId, /^save-[a-f0-9]{12}$/);
  assert.equal(saved.path, `/?case=${saved.caseId}`);
  assert.equal(searches, 0);

  const loadedResponse = await fetch(base + saved.path.replace('/?case=', '/cases/'));
  assert.equal(loadedResponse.status, 200);
  const loaded = await loadedResponse.json();
  assert.equal(loaded.caseId, saved.caseId);
  assert.equal(loaded.card.claims.length, 3);
  assert.equal(loaded.need, card.exampleNeed);
  assert.equal(loaded.generated, true);
  assert.equal(loaded.analysis.reviewer, 'Codex（AI 助手）');

  const list = await fetch(base + '/cases').then(item => item.json());
  assert.equal(list.cases.filter(item => item.id === saved.caseId).length, 1);
  assert.equal(list.cases.find(item => item.id === saved.caseId).hasCard, true);
  assert.equal((await fetch(base + '/cases/save-000000000000')).status, 404);
});

test('本机案卷保存拒绝凭据字段和错误 CSRF', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'detective-cases-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const {base} = await fixture(t, {caseDirectory: directory});
  const original = JSON.parse(await readFile(new URL('../evidence/case-01.json', import.meta.url), 'utf8'));
  const card = JSON.parse(await readFile(new URL('../evidence/cards/card-01.json', import.meta.url), 'utf8'));
  const payload = {claim: original.claim, domain: original.domain, need: card.exampleNeed, rounds: original.rounds, card, analysis: original.analysis};
  const {nonce} = await pageAndNonce(base);
  const wrong = await fetch(base + '/skill/cases', {method: 'POST', headers: {Origin: base, 'Content-Type': 'application/json', 'X-CSRF-Token': 'wrong'}, body: JSON.stringify(payload)});
  assert.equal(wrong.status, 403);
  const secret = await fetch(base + '/skill/cases', {method: 'POST', headers: {Origin: base, 'Content-Type': 'application/json', 'X-CSRF-Token': nonce}, body: JSON.stringify({...payload, apiKey: 'must-not-store'})});
  assert.equal(secret.status, 400);
  assert.match((await secret.json()).error, /凭据|请求未完成/);
});

test('同源和 CSRF 校验失败时不调用搜索', async t => {
  let searches = 0;
  const {base} = await fixture(t, {search: async () => { searches++; return {pages: [], requestId: null}; }});
  const {nonce} = await pageAndNonce(base);
  const wrongToken = await post(base, 'bad-token', {claim: '某产品永久免费'});
  assert.equal(wrongToken.status, 403);
  const wrongOrigin = await post(base, nonce, {claim: '某产品永久免费'}, {Origin: 'https://evil.example'});
  assert.equal(wrongOrigin.status, 403);
  assert.equal(searches, 0);
});

test('参数错误和错误 Content-Type 不触发外部搜索', async t => {
  let searches = 0;
  const {base} = await fixture(t, {search: async () => { searches++; return {pages: [], requestId: null}; }});
  const {nonce} = await pageAndNonce(base);
  const badDomain = await post(base, nonce, {claim: '某产品永久免费', domain: 'https://example.com/path', need: NEED});
  assert.equal(badDomain.status, 400);
  const missingNeed = await post(base, nonce, {claim: '某产品永久免费', domain: 'example.com'});
  assert.equal(missingNeed.status, 400);
  assert.match((await missingNeed.json()).error, /需求|4—500/);
  const wrongType = await fetch(base + '/investigate', {method: 'POST', headers: {Origin: base, 'Content-Type': 'text/plain', 'X-CSRF-Token': nonce}, body: '{}'});
  assert.equal(wrongType.status, 415);
  assert.equal(searches, 0);
});

test('真实请求路径传入 Site，响应只含案卷且不回传密钥', async t => {
  const calls = [];
  const {base} = await fixture(t, {search: async (query, key, fetcher, options) => {
    calls.push({query, key, options});
    return {pages: [{title: '官方', url: 'https://example.com/docs', passage: '条件', date: '', site: 'example.com'}], requestId: `req-${calls.length}`};
  }});
  const {nonce} = await pageAndNonce(base);
  const response = await post(base, nonce, {claim: '某产品永久免费', domain: 'example.com', need: NEED});
  assert.equal(response.status, 200);
  const text = await response.text();
  const data = JSON.parse(text);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map(call => call.options.site), ['example.com', 'example.com', undefined]);
  assert.equal(data.outcome, 'success');
  assert.equal(data.need, NEED);
  assert.match(calls[0].query, /官方 说明 原文/);
  assert.match(calls[1].query, /额度.*条件 限制/);
  assert.match(calls[2].query, /不适用.*例外/);
  assert.equal(data.rounds[2].requestId, 'req-3');
  assert.equal(data.verdict, 'unreviewed');
  assert.ok(!text.includes('test-secret-not-real'));
  const status = await fetch(base + '/status').then(item => item.text());
  assert.ok(!status.includes('test-secret-not-real'));
  assert.deepEqual(JSON.parse(status), {configured: true});
});

test('零结果与鉴权失败严格区分，失败后不继续消耗查询', async t => {
  const zero = await fixture(t);
  const zeroPage = await pageAndNonce(zero.base);
  const zeroResponse = await post(zero.base, zeroPage.nonce, {claim: '某不存在的公开产品永久免费', need: NEED});
  const zeroData = await zeroResponse.json();
  assert.equal(zeroData.outcome, 'empty');
  assert.equal(zeroData.rounds.length, 3);
  assert.ok(zeroData.rounds.every(round => round.status === 'success' && round.pages.length === 0));

  let calls = 0;
  const failure = await fixture(t, {search: async () => { calls++; throw providerError('UnauthorizedOperation'); }});
  const failurePage = await pageAndNonce(failure.base);
  const failureResponse = await post(failure.base, failurePage.nonce, {claim: '某产品永久免费', need: NEED});
  const failureData = await failureResponse.json();
  assert.equal(failureData.outcome, 'partial');
  assert.equal(failureData.rounds.length, 1);
  assert.equal(failureData.rounds[0].status, 'error');
  assert.equal(failureData.rounds[0].errorCode, 'UnauthorizedOperation');
  assert.match(failureData.rounds[0].error, /鉴权失败/);
  assert.equal(calls, 1);
});

test('配置页和项目源码不出现其他项目设置', async t => {
  const {base} = await fixture(t);
  const html = await fetch(base + '/settings').then(response => response.text());
  assert.match(html, /侦探 · 元宝搜索配置/);
  assert.doesNotMatch(html, /用餐|餐厅|4192/);
});
