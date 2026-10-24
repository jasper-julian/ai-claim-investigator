import {createRequire} from 'node:module';
import {mkdir, rename, rm, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright-core');

const base = process.env.DETECTIVE_URL || 'http://127.0.0.1:4191';
const root = resolve(import.meta.dirname, '..');
const rawDir = resolve(root, 'deliverables/video-raw');
const shotDir = resolve(root, 'deliverables/screenshots');
await mkdir(rawDir, {recursive: true});
await mkdir(shotDir, {recursive: true});

const only = process.argv.find(arg => arg.startsWith('--only='))?.split('=')[1] || 'all';
const claim = 'GitHub Copilot 免费版每月提供 2000 次代码补全和 50 次对话，个人开发者可以免费使用。';
const need = '我在公司项目里写代码，想知道免费版能不能用于商业开发，是否限制团队或组织使用。';
// 该案卷由 WorkBuddy Skill 于 2026-10-24 22:45（UTC+8）基于真实检索与官方原文生成，并已保存为本机案卷。
// 录制只做回放与页面交互，不把这张卡说成针对录制时新查询现场生成。
const savedCase = process.env.COPILOT_CASE_ID || 'save-cc091f7fc1ca';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--force-device-scale-factor=1', '--hide-scrollbars']
});

async function newRecording(name) {
  const context = await browser.newContext({
    viewport: {width: 1280, height: 720},
    deviceScaleFactor: 1,
    recordVideo: {dir: rawDir, size: {width: 1280, height: 720}},
    acceptDownloads: true,
    locale: 'zh-CN'
  });
  const page = await context.newPage();
  return {context, page, name};
}

async function finish({context, page, name}) {
  const video = page.video();
  await context.close();
  const source = await video.path();
  const target = resolve(rawDir, `${name}.webm`);
  await rm(target, {force: true});
  await rename(source, target);
  return target;
}

async function caption(page, title, sub = '') {
  await page.evaluate(([t, s]) => {
    let el = document.getElementById('__caption');
    if (!el) {
      el = document.createElement('div');
      el.id = '__caption';
      document.body.appendChild(el);
    }
    el.textContent = '';
    const b = document.createElement('b');
    b.textContent = t;
    b.style.display = 'block';
    b.style.fontWeight = '700';
    el.appendChild(b);
    if (s) {
      const span = document.createElement('span');
      span.textContent = s;
      span.style.display = 'block';
      span.style.fontSize = '13px';
      span.style.opacity = '.78';
      span.style.marginTop = '3px';
      el.appendChild(span);
    }
    Object.assign(el.style, {
      position: 'fixed', left: '50%', bottom: '16px', transform: 'translateX(-50%)',
      maxWidth: '1040px', padding: '12px 20px', borderRadius: '10px',
      background: 'rgba(22,27,23,.9)', color: '#fff', font: '16px/1.55 -apple-system,PingFang SC,sans-serif',
      textAlign: 'center', zIndex: 99999, boxShadow: '0 10px 30px rgba(0,0,0,.28)', pointerEvents: 'none'
    });
  }, [title, sub]);
}

const hold = (page, ms) => page.waitForTimeout(ms);

async function scrollTo(page, selector) {
  await page.evaluate(sel => {
    const node = document.querySelector(sel);
    if (node) node.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, selector);
}

async function recordLiveRun(record) {
  const target = resolve(root, 'evidence/live/copilot-free-recording-run.json');
  await writeFile(target, JSON.stringify(record, null, 2) + '\n');
  return target;
}

async function recordLive() {
  const session = await newRecording('live');
  const {page} = session;
  let liveRecord = null;
  page.on('response', async response => {
    if (!new URL(response.url()).pathname.endsWith('/investigate')) return;
    try {
      liveRecord = await response.json();
    } catch {
      liveRecord = null;
    }
  });

  await page.goto(base, {waitUntil: 'networkidle'});
  await caption(page, 'AI 宣传查证所 · 有出处，再相信', '公开宣传 → 可验证承诺 → 官方条件 → 我的需求是否成立');
  await hold(page, 6000);

  await caption(page, '① 输入要查证的公开说法，以及我自己的使用需求', '需求会决定检索维度；网页不会自动编造承诺拆解或 AI 判决');
  await page.locator('#claim').click();
  await page.locator('#claim').type(claim, {delay: 22});
  await hold(page, 1600);
  await page.locator('#need').click();
  await page.locator('#need').type(need, {delay: 20});
  await hold(page, 1400);
  await page.locator('#domain').fill('github.com');
  await hold(page, 2400);

  await caption(page, '② 真实元宝搜索：三轮，由问题与需求共同决定', '指定官方域名通过 Site 参数发送；失败与零结果同样记录');
  await page.locator('#submit').click();
  await page.waitForTimeout(900);
  await page.locator('.round').first().waitFor({timeout: 90000});
  await hold(page, 5200);

  await caption(page, '③ 每轮都有查询词、请求 ID、来源日期与可点击链接', '搜索摘要只是线索，不等于读过全文');
  await scrollTo(page, '#results');
  await hold(page, 5600);
  await page.locator('.source summary').first().click();
  await hold(page, 4600);
  await page.locator('.source').first().screenshot({path: resolve(shotDir, 'demo-source-expanded.png')});

  await caption(page, '④ 这一份是原始检索案卷：网页不自动生成证据卡', 'AI 深查交给 Skill：打开原文、拆承诺、写条件');
  await scrollTo(page, '.card-absent');
  await hold(page, 5200);

  if (!liveRecord) throw new Error('没有捕获到本次 /investigate 响应');
  await recordLiveRun(liveRecord);
  console.log(JSON.stringify({segment: 'live', file: await finish(session)}));
}

// 回放段：只做页面交互与已保存案卷的回放，不发起搜索。
// 证据卡由 Skill 于 2026-10-24 22:45 基于真实检索与官方原文生成并保存；字幕必须说明这是“载入”，不是录制时现场生成。
async function recordReplay() {
  const session = await newRecording('replay');
  const {page} = session;

  await page.goto(`${base}/?case=${savedCase}`, {waitUntil: 'networkidle'});
  await page.locator('.evidence-card').waitFor();
  await caption(page, '⑤ 载入 Skill 先前生成的证据卡（本段为回放）', '这张卡对应 22:45 的检索记录与官方原文，请求 ID 见案卷；不是录制时现场生成');
  await hold(page, 7600);
  await page.locator('.evidence-card').screenshot({path: resolve(shotDir, 'demo-evidence-card.png')}).catch(() => {});

  await caption(page, '⑥ 三项承诺、五条条件：原文摘录、来源日期、核查时间都在卡上', '支持、未知与附条件分开写，不合并成一句结论');
  await scrollTo(page, '.claim-card');
  await hold(page, 6200);
  await scrollTo(page, '.completed');
  await hold(page, 5400);

  await page.goto('https://docs.github.com/en/copilot/get-started/plans', {waitUntil: 'domcontentloaded', timeout: 60000});
  await caption(page, '⑦ 打开官方原文核对（不是只看搜索摘要）', 'GitHub Docs · Plans for GitHub Copilot：2000 次补全与“仅个人开发者”的原文');
  await hold(page, 3000);
  await page.mouse.wheel(0, 900);
  await hold(page, 3800);
  await page.screenshot({path: resolve(shotDir, 'demo-official-doc.png')}).catch(() => {});

  await page.goto(`${base}/?case=${savedCase}`, {waitUntil: 'networkidle'});
  await page.locator('.evidence-card').waitFor();
  await caption(page, '⑧ 换需求重算：适用 / 证据不足 / 明确冲突分开判断', '只做本地确定性匹配：不发起搜索，也不输出真假概率');
  await scrollTo(page, '.need-box');
  await hold(page, 3200);
  const statuses = [];
  const exampleCount = await page.locator('.example-needs button').count();
  for (let index = 0; index < exampleCount; index++) {
    await page.locator('.example-needs button').nth(index).click();
    await hold(page, 3400);
    statuses.push(await page.locator('#fit-result').getAttribute('data-status'));
  }
  await page.locator('.need-box').screenshot({path: resolve(shotDir, 'demo-need-states.png')});

  await caption(page, '⑨ 超出现有证据的维度，明确要求再次查证', '不拿已有条件硬套新问题，也不假装已经搜索过');
  await page.locator('#card-need').fill('我只想知道界面有没有紫色主题皮肤。');
  await page.locator('#reevaluate').click();
  await hold(page, 4200);
  await page.locator('#fit-result').screenshot({path: resolve(shotDir, 'demo-out-of-scope.png')});

  await caption(page, '⑩ 导出完整案卷：承诺、条件、来源、请求 ID、复核状态', '未真正人工复核，就始终标注“尚未人工复核”');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: '导出完整 JSON 案卷'}).click();
  const download = await downloadPromise;
  await download.saveAs(resolve(root, 'deliverables/exports/demo-export.json'));
  await hold(page, 4600);
  await page.screenshot({path: resolve(shotDir, 'demo-export.png')});

  await page.goto(`file://${resolve(root, 'deliverables/exports/demo-export.json')}`, {waitUntil: 'domcontentloaded'});
  await caption(page, '⑪ 打开导出的案卷文件核对字段', 'schemaVersion 1.1：evidenceCard、applicability、humanReview、rounds 都在');
  await hold(page, 5200);
  await page.mouse.wheel(0, 1200);
  await hold(page, 3600);
  await page.screenshot({path: resolve(shotDir, 'demo-export-file.png')});

  await page.goto(`${base}/?case=01`, {waitUntil: 'networkidle'});
  await page.locator('.round').first().waitFor();
  await caption(page, '⑫ 同一套方法可以换产品：Tripo 插件免费 ≠ 生成免费', '历史真实查询回放：2026-10-24 的请求 ID 与来源日期');
  await scrollTo(page, '.evidence-card');
  await hold(page, 6200);
  for (let index = 0; index < 3; index++) {
    await page.locator('.example-needs button').nth(index).click();
    await hold(page, 2200);
  }

  await page.goto(`${base}/?case=03`, {waitUntil: 'networkidle'});
  await page.locator('.round').first().waitFor();
  await caption(page, '⑬ 活动额度、地区与时间条件同样适用', '案例 03：6000 次需要进群核销邀请码，有效期以活动说明为准');
  await scrollTo(page, '.evidence-card');
  await hold(page, 5200);
  for (let index = 0; index < 3; index++) {
    await page.locator('.example-needs button').nth(index).click();
    await hold(page, 2000);
  }

  await page.goto(base, {waitUntil: 'networkidle'});
  await caption(page, '本机运行 · 未部署公网 · 元宝搜索是核心取证手段', '三步：检索 → 打开原文 → 条件判断；查不到就写证据不足');
  await hold(page, 6000);

  console.log(JSON.stringify({segment: 'replay', savedCase, statuses, file: await finish(session)}));
}

async function recordCase(id, lines) {
  const session = await newRecording(`query-${id}`);
  const {page} = session;
  await page.goto(`${base}/?case=${id}`, {waitUntil: 'networkidle'});
  await page.locator('.round').first().waitFor();

  await caption(page, lines[0], '历史真实查询回放：请求 ID 与来源日期均来自当日实际调用');
  await hold(page, 5000);
  await scrollTo(page, '#results');
  await hold(page, 4200);
  await page.locator('.source summary').first().click();
  await hold(page, 3800);
  await page.screenshot({path: resolve(shotDir, `query-${id}-sources.png`)});

  await caption(page, lines[1], '结论写成有来源支持 / 附条件 / 证据不足，不给出真假概率');
  await scrollTo(page, '.evidence-card');
  await hold(page, 4800);
  for (let index = 0; index < 3; index++) {
    await page.locator('.example-needs button').nth(index).click();
    await hold(page, 2600);
  }

  await caption(page, lines[2], '需求重算不发起新搜索；未覆盖的新事实会要求再次查证');
  await page.locator('.need-box').screenshot({path: resolve(shotDir, `query-${id}-fit.png`)}).catch(() => {});
  await hold(page, 3600);

  console.log(JSON.stringify({segment: `query-${id}`, file: await finish(session)}));
}

async function recordSupplement() {
  const session = await newRecording('supplement');
  const {page} = session;

  await page.goto(`${base}/?case=02`, {waitUntil: 'networkidle'});
  await page.locator('.round').first().waitFor();
  await caption(page, '同一套流程，换一个产品同样成立：WorkBuddy 体验版与 CLI', '历史真实查询回放 · 案例 02');
  await hold(page, 4200);
  await scrollTo(page, '.evidence-card');
  await hold(page, 4600);
  for (let index = 0; index < 3; index++) {
    await page.locator('.example-needs button').nth(index).click();
    await hold(page, 2400);
  }

  await caption(page, '导出 Markdown 证据卡，便于人工复核与归档', '导出仍保留“尚未人工复核”，直到有人真的确认');
  const markdownPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: '导出证据卡 Markdown'}).click();
  const markdown = await markdownPromise;
  const mdPath = resolve(root, 'deliverables/exports/demo-export.md');
  await markdown.saveAs(mdPath);
  await hold(page, 2600);
  await page.goto(`file://${mdPath}`, {waitUntil: 'domcontentloaded'});
  await caption(page, '打开导出的 Markdown：条件、来源与复核状态都在文件里', '尚未人工复核的状态不会被导出成“已复核”');
  await hold(page, 4800);
  await page.mouse.wheel(0, 800);
  await hold(page, 3600);
  await page.screenshot({path: resolve(shotDir, 'demo-markdown-file.png')});

  await page.goto(base, {waitUntil: 'networkidle'});
  await caption(page, '从检索到条件判断，再到可复核的案卷文件', '本机运行；未部署公网；元宝搜索是核心取证手段');
  await hold(page, 4200);

  console.log(JSON.stringify({segment: 'supplement', file: await finish(session)}));
}

async function recordExtra() {
  const session = await newRecording('extra');
  const {page} = session;

  await page.goto(base, {waitUntil: 'networkidle'});
  await caption(page, '边界：网页负责检索与案卷，AI 深查由 WorkBuddy Skill 完成', '网页没有独立大模型接口，不会自动生成承诺拆解或判决；这条链路在视频里如实分开');
  await hold(page, 8000);
  await scrollTo(page, '.boundary');
  await hold(page, 6200);

  await page.goto(`${base}/?case=01`, {waitUntil: 'networkidle'});
  await page.locator('.condition a').first().waitFor();
  await caption(page, '每条条件都能点回原文；元宝命中与补充直访分开标注', '来源日期、核查时间与出处类型都写在卡上');
  await scrollTo(page, '.condition');
  await hold(page, 7400);
  await page.mouse.wheel(0, 600);
  await hold(page, 4800);

  console.log(JSON.stringify({segment: 'extra', file: await finish(session)}));
}

if (only === 'all' || only === 'main') {
  await recordLive();
  await recordReplay();
}
if (only === 'live') await recordLive();
if (only === 'replay') await recordReplay();
if (only === 'all' || only === 'supplement') await recordSupplement();
if (only === 'all' || only === 'extra') await recordExtra();
if (only === 'all' || only === 'cases') {
  await recordCase('01', [
    '案例 01 · Tripo：插件免费安装，是否代表 3D 生成也免费？',
    '官方定价：Studio Free 每月 200 积分、约 13 个模型、公开模型且非商用',
    '个人每月 ≤5 个且非商用可覆盖；每月 20 个并商用则不覆盖'
  ]);
  await recordCase('02', [
    '案例 02 · WorkBuddy：免费体验版包含什么，CLI 是否免费？',
    '官方版本权益表：体验版 500 基础积分，CLI 访问在体验版为「—」；5 个项目/人、单项目 3 人、5GB 资料库',
    '个人轻量使用可覆盖；必须免费用 CLI 则不覆盖'
  ]);
  await recordCase('03', [
    '案例 03 · 元宝活动：6000 次免费搜索如何领取，有哪些条件？',
    '官方说明：活动期 6000 次，需要扫码进侦探赛道群、按群内指引获取并核销邀请码；有效期以活动说明为准',
    '进群核销可覆盖；要求自动到账则不覆盖'
  ]);
}

await browser.close();
