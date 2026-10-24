import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright-core');
const base = process.env.DETECTIVE_URL || 'http://127.0.0.1:4191';
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'deliverables');
const live = process.argv.includes('--live');
await mkdir(resolve(output, 'screenshots'), {recursive: true});
await mkdir(resolve(output, 'exports'), {recursive: true});

const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
const page = await browser.newPage({viewport: {width: 1440, height: 1050}, deviceScaleFactor: 1});
const checks = [];
const consoleErrors = [];
let investigateRequests = 0;
let lastPayload = null;
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => consoleErrors.push(error.message));
page.on('request', request => {
  if (new URL(request.url()).pathname === '/investigate') {
    investigateRequests++;
    try { lastPayload = request.postDataJSON(); } catch { lastPayload = null; }
  }
});

function check(name, condition, details = '') {
  checks.push({name, passed: Boolean(condition), details});
  if (!condition) throw new Error(`UI 验证失败：${name} ${details}`);
}

async function openCase(id) {
  await page.goto(`${base}/?case=${id}`, {waitUntil: 'networkidle'});
  await page.locator('.round').first().waitFor();
  check(`案例 ${id} 独立链接加载`, (await page.locator('#case-number').textContent()).includes(`案卷 ${id}`));
  check(`案例 ${id} 保留三轮真实查询`, await page.locator('.round').count() === 3);
  check(`案例 ${id} 来源链接可点击`, await page.locator('.source a').evaluateAll(links => links.length > 0 && links.every(link => /^https?:\/\//.test(link.href) && link.target === '_blank')));
  check(`案例 ${id} 请求 ID 可见`, await page.locator('#results').textContent().then(text => /[0-9a-f]{8}-[0-9a-f-]{20,}/.test(text)));
  check(`案例 ${id} 条件证据卡加载`, await page.locator('.evidence-card').count() === 1);
  check(`案例 ${id} 恰好拆为三项承诺`, await page.locator('.claim-card').count() === 3);
  check(`案例 ${id} 条件来源可点击`, await page.locator('.condition a').evaluateAll(links => links.length >= 3 && links.every(link => /^https:\/\//.test(link.href) && link.target === '_blank')));
  check(`案例 ${id} 初始需求可判断`, await page.locator('#fit-result').getAttribute('data-status') === 'applies');
  const expectedStatuses = ['applies', 'does_not_apply', 'insufficient'];
  for (const [index, expected] of expectedStatuses.entries()) {
    await page.locator('.example-needs button').nth(index).click();
    check(`案例 ${id} 需求示例 ${index + 1} → ${expected}`, await page.locator('#fit-result').getAttribute('data-status') === expected);
    check(`案例 ${id} 需求重算未搜索`, await page.locator('#fit-result').getAttribute('data-searched') === 'false');
  }
  if (id === '01') {
    await page.locator('#card-need').fill('我想确认有没有紫色主题皮肤。');
    await page.locator('#reevaluate').click();
    check('超出现有证据的维度要求再次查证', await page.locator('#fit-result').getAttribute('data-status') === 'out_of_scope');
    await page.screenshot({path: resolve(output, 'screenshots/need-change-case-01.png'), fullPage: true});
    await page.locator('.example-needs button').first().click();
  }
  check(`案例 ${id} 默认未人工复核`, !(await page.locator('#review-confirmed').isChecked()));
  await page.screenshot({path: resolve(output, `screenshots/case-${id}.png`), fullPage: true});
  const jsonPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: '导出完整 JSON 案卷'}).click();
  const json = await jsonPromise;
  const jsonPath = resolve(output, `exports/case-${id}.json`);
  await json.saveAs(jsonPath);
  const exported = JSON.parse(await readFile(jsonPath, 'utf8'));
  check(`案例 ${id} JSON 含证据卡与适用判断`, exported.evidenceCard?.claims?.length === 3 && Boolean(exported.applicability?.status) && Boolean(exported.need));
  check(`案例 ${id} 导出保持未人工复核`, exported.humanReview.status === 'unreviewed');
  const markdownPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: '导出证据卡 Markdown'}).click();
  const markdown = await markdownPromise;
  await markdown.saveAs(resolve(output, `exports/case-${id}.md`));
}

try {
  for (const id of ['01', '02', '03']) await openCase(id);
  check('三次真实案例回放均未触发新调查', investigateRequests === 0, `investigate=${investigateRequests}`);

  const caseList = await fetch(`${base}/cases`, {signal: AbortSignal.timeout(15000)}).then(response => response.json());
  const generated = caseList.cases.find(item => item.generated === true && /Copilot/.test(item.claim)) || caseList.cases.find(item => item.generated === true);
  if (generated) {
    const id = generated.id;
    await page.goto(`${base}/?case=${id}`, {waitUntil: 'networkidle'});
    await page.locator('.round').first().waitFor();
    check('本机生成案卷独立链接可加载', (await page.locator('#case-number').textContent()).includes(`案卷 ${id}`));
    check('本机生成案卷保留真实轮次与来源', await page.locator('.round').count() === 3 && await page.locator('.source a').count() > 0);
    check('本机生成案卷加载证据卡', await page.locator('.evidence-card').count() === 1 && await page.locator('.claim-card').count() === 3);
    check('本机生成案卷条件可展开来源', await page.locator('.condition a').evaluateAll(links => links.length >= 3 && links.every(link => /^https:\/\//.test(link.href) && link.target === '_blank')));
    const firstStatus = await page.locator('#fit-result').getAttribute('data-status');
    check('本机生成案卷需求判断有结构化结论', ['applies', 'does_not_apply', 'insufficient'].includes(firstStatus), firstStatus);
    check('本机生成案卷需求重算不搜索', await page.locator('#fit-result').getAttribute('data-searched') === 'false');
    if (/Copilot/.test(generated.claim)) {
      await page.locator('.example-needs button', {hasText: '公司项目'}).first().click();
      check('公司项目但未查明的商用许可 → 证据不足', await page.locator('#fit-result').getAttribute('data-status') === 'insufficient');
      check('公司项目结论未声称条件冲突', await page.locator('#fit-result').textContent().then(text => !text.includes('至少一项已核实条件与你的需求冲突')));
      await page.locator('#card-need').fill('公司要求提供 IP indemnity 和 SAML SSO，才能用于公司项目里的代码。');
      await page.locator('#reevaluate').click();
      check('明确要求官方未包含的保障 → 条件不适用', await page.locator('#fit-result').getAttribute('data-status') === 'does_not_apply');
      check('企业保障结论引用官方缺项而非禁止', await page.locator('#fit-result').textContent().then(text => text.includes('免费档不能覆盖')));
      await page.locator('.example-needs button', {hasText: '个人学习'}).first().click();
      check('个人学习需求 → 适用', await page.locator('#fit-result').getAttribute('data-status') === 'applies');
    }
    await page.locator('#card-need').fill('我只想知道界面有没有紫色主题皮肤。');
    await page.locator('#reevaluate').click();
    check('本机生成案卷超范围要求再次查证', await page.locator('#fit-result').getAttribute('data-status') === 'out_of_scope');
    await page.locator('.example-needs button').first().click();
    check('本机生成案卷默认未人工复核', !(await page.locator('#review-confirmed').isChecked()));
    await page.screenshot({path: resolve(output, `screenshots/generated-${id}.png`), fullPage: true});
    const genJsonPromise = page.waitForEvent('download');
    await page.getByRole('button', {name: '导出完整 JSON 案卷'}).click();
    const genJson = await genJsonPromise;
    check('本机生成案卷导出文件名含案卷号', genJson.suggestedFilename().includes(id), genJson.suggestedFilename());
    const genJsonPath = resolve(output, 'exports/generated-case.json');
    await genJson.saveAs(genJsonPath);
    const genExported = JSON.parse(await readFile(genJsonPath, 'utf8'));
    check('本机生成案卷导出含证据卡与需求', genExported.evidenceCard?.claims?.length === 3 && Boolean(genExported.need) && Boolean(genExported.applicability?.status));
    check('本机生成案卷导出保持未人工复核', genExported.humanReview.status === 'unreviewed');
    await page.reload({waitUntil: 'networkidle'});
    await page.locator('.round').first().waitFor();
    check('本机生成案卷刷新后仍可加载', (await page.locator('#case-number').textContent()).includes(`案卷 ${id}`));
    check('本机生成案卷回放未触发新调查', investigateRequests === 0, `investigate=${investigateRequests}`);
  } else {
    checks.push({name: '本机生成案卷可用', passed: false, details: '未找到 save-* 案卷，先用 save-card.mjs 保存一份再跑验收'});
  }

  await page.goto(`${base}/?case=02`, {waitUntil: 'networkidle'});
  await page.reload({waitUntil: 'networkidle'});
  await page.locator('.round').first().waitFor();
  check('刷新后仍加载指定案例', (await page.locator('#claim').inputValue()).includes('WorkBuddy'));

  await page.goto(`${base}/?case=99`, {waitUntil: 'networkidle'});
  await page.getByText('没有找到这个案卷').waitFor();
  check('无效案例清楚提示', (await page.locator('#notice').textContent()).includes('未发起任何元宝搜索'));
  check('无效案例没有触发调查', investigateRequests === 0);
  await page.screenshot({path: resolve(output, 'screenshots/invalid-case.png'), fullPage: true});

  await page.setViewportSize({width: 390, height: 844});
  await page.goto(`${base}/?case=01`, {waitUntil: 'networkidle'});
  await page.locator('.round').first().waitFor();
  check('移动端无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.screenshot({path: resolve(output, 'screenshots/mobile-case-01.png'), fullPage: true});
  await page.setViewportSize({width: 1440, height: 1050});

  if (live) {
    await page.goto(base, {waitUntil: 'networkidle'});
    await page.locator('#claim').fill('Notion AI 免费版是否支持商用？');
    await page.locator('#need').fill('我每月使用 100 次，只需个人非商业用途，不需要 API。');
    await page.locator('#domain').fill('notion.com');
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/investigate', {timeout: 100000});
    await page.locator('#submit').click();
    const response = await responsePromise;
    check('新问题查询接口可达', response.status() === 200, `HTTP ${response.status()}`);
    check('新问题请求携带具体需求', lastPayload?.need === '我每月使用 100 次，只需个人非商业用途，不需要 API。');
    await page.locator('.round').first().waitFor({timeout: 100000});
    check('新问题走通真实三步查证', await page.locator('.round').count() >= 1 && investigateRequests === 1);
    check('新问题未伪造条件卡', await page.locator('.card-absent').count() === 1 && await page.locator('.evidence-card').count() === 0);
    check('新问题未冒充 AI 自动结论', await page.locator('#results').textContent().then(text => text.includes('尚未生成条件证据卡')));
    await page.screenshot({path: resolve(output, 'screenshots/live-card-workflow.png'), fullPage: true});
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', {name: '导出完整 JSON 案卷'}).click();
    const download = await downloadPromise;
    await download.saveAs(resolve(output, 'exports/live-card-workflow.json'));
    const exported = JSON.parse(await readFile(resolve(output, 'exports/live-card-workflow.json'), 'utf8'));
    check('新问题导出保留需求且不伪造证据卡', exported.need.includes('每月使用 100 次') && exported.evidenceCard === null && exported.applicability === null);
    checks.push({name: '新问题实际查询时间', passed: true, details: new Date().toISOString()});
  }

  check('浏览器无脚本或 CSP 错误', consoleErrors.length === 0, consoleErrors.join(' | '));
  const report = {testedAt: new Date().toISOString(), base, live, checks, consoleErrors, passed: checks.every(item => item.passed)};
  await writeFile(resolve(output, live ? 'ui-live-test-report.json' : 'ui-test-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const report = {testedAt: new Date().toISOString(), base, live, checks, consoleErrors, passed: false, error: error.message};
  await writeFile(resolve(output, live ? 'ui-live-test-report.json' : 'ui-test-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
