import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--help') {
    console.log('node save-card.mjs --record evidence.json --card card.json\n把 AI 已完成、含真实检索与原文条件的证据卡保存为本机案卷。不会调用搜索。');
    process.exit(0);
  }
  if (!['--record', '--card'].includes(args[index]) || !args[index + 1]) {
    console.error('参数无效；请使用 --help。');
    process.exit(1);
  }
  options[args[index].slice(2)] = args[++index];
}
if (!options.record || !options.card) {
  console.error('请同时提供 --record 和 --card。');
  process.exit(1);
}

const base = 'http://127.0.0.1:4191';
try {
  const record = JSON.parse(await readFile(resolve(options.record), 'utf8'));
  const card = JSON.parse(await readFile(resolve(options.card), 'utf8'));
  const page = await fetch(base, {signal: AbortSignal.timeout(10000)}).then(response => response.text());
  const nonce = page.match(/<script type="module" nonce="([a-f0-9]+)"/)?.[1];
  if (!nonce) throw new Error('本机查证服务版本不兼容。');
  const response = await fetch(base + '/skill/cases', {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: {Origin: base, 'Content-Type': 'application/json', 'X-CSRF-Token': nonce},
    body: JSON.stringify({
      claim: record.claim,
      domain: record.domain || '',
      need: record.need || card.exampleNeed || '',
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      rounds: record.rounds,
      card,
      ...(record.analysis ? {analysis: record.analysis} : {})
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '案卷保存失败。');
  console.log(JSON.stringify({caseId: data.caseId, url: base + data.path, message: data.message, localOnly: true}, null, 2));
} catch (error) {
  console.error(error.cause?.code === 'ECONNREFUSED' ? '本机查证服务未运行。请先在侦探项目目录运行 npm start。' : error.message);
  process.exitCode = 1;
}
