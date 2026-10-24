import {assessmentLabels, buildCaseExport, caseToMarkdown, collectSources, exportFileName, parseCaseId, validHttpUrl, verdictLabels} from '/casefile.js';
import {claimStatusLabels, evaluateCard, fitLabels, validateNeed} from '/evidencecard.js';

const $ = id => document.getElementById(id);
const nonce = document.querySelector('script[nonce]')?.nonce;
const overallLabels = {
  supported: '宣传有来源支持',
  supported_with_conditions: '宣传成立但附条件',
  partially_supported: '宣传部分成立',
  contradicted: '宣传有来源反驳',
  unknown: '证据尚不明确'
};
let current = null;
let currentNeed = '';
let currentEvaluation = null;
let sources = [];
let busy = false;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function notice(message, isError = false) {
  $('notice').textContent = message;
  $('notice').classList.toggle('error', isError);
}

function matchHost(value, domain) {
  const url = validHttpUrl(value);
  if (!url || !domain) return false;
  const host = new URL(url).hostname;
  return host === domain || host.endsWith('.' + domain);
}

function sourceLink(source, className = '') {
  const url = validHttpUrl(source.url);
  if (!url) return node('span', source.title || '无效来源链接', className);
  const link = node('a', `${source.title || url} ↗`, className);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function provenanceText(source) {
  return `${source.provenance === 'direct_official' ? '补充直访官方原文' : '元宝检索后打开核实'}${source.date ? ` · 来源日期 ${source.date}` : ' · 来源日期未提供'}`;
}

function copyResearchTask(record, need) {
  return `请使用当前侦探项目中的 yuanbao-claim-investigator Skill 查证以下公开产品说法：${record.claim}。我的具体需求：${need}。官方域名提示：${record.domain || '待确定'}。请先把宣传拆成最多 3 个可验证承诺，再调用元宝搜索寻找支持与限制/反例，打开关键原文并记录访问状态和摘录；最后给出逐项条件、补全条件后的说法、对我的需求是否适用，以及仍不确定的部分。搜索摘要不等于原文已核实，不要给没有依据的真假概率。`;
}

async function copyTask(record, need) {
  try {
    await navigator.clipboard.writeText(copyResearchTask(record, need));
    notice('AI 深查任务已复制。请交给已加载查证 Skill 的 AI 助手；网页本身没有独立大模型接口。');
  } catch {
    notice('复制未完成。可先导出 JSON 案卷，再交给 Skill 继续调查。', true);
  }
}

function renderAnalysis(analysis) {
  const box = node('div', undefined, 'verdict');
  box.append(node('h3', 'AI 查证草案 · 非人工复核'));
  const contributor = node('p', `${analysis.reviewer || 'AI 助手'} · ${analysis.reviewedAt || '未记录时间'} · ${verdictLabels[analysis.status] || '待核实'}`, 'tiny');
  box.append(contributor, node('p', analysis.summary || '未填写摘要'));
  for (const finding of analysis.findings || []) {
    const item = node('div', undefined, 'finding');
    item.append(node('p', finding.text));
    for (const source of finding.sources || []) {
      const line = node('p', undefined, 'tiny');
      line.append(sourceLink(source), node('span', ` · ${provenanceText(source)}`));
      item.append(line);
    }
    box.append(item);
  }
  for (const [title, key] of [['限制条件', 'limitations'], ['来源冲突', 'conflicts'], ['仍不能确定', 'uncertainties']]) {
    if (!analysis[key]?.length) continue;
    const list = node('ul');
    for (const value of analysis[key]) list.append(node('li', typeof value === 'string' ? value : JSON.stringify(value)));
    box.append(node('h4', title), list);
  }
  box.append(node('p', '这是 AI 整理公开资料形成的草案。只有人工复核区明确完成后，导出才会标为“已人工复核”。', 'tiny'));
  return box;
}

function renderFit(result, target) {
  target.className = `fit-result ${result.status}`;
  target.dataset.status = result.status;
  target.dataset.searched = String(result.searched);
  target.replaceChildren(
    node('strong', fitLabels[result.status] || result.label),
    node('p', result.summary),
    node('p', result.searched ? '本次判断发起了搜索。' : '本次判断未发起新搜索，只使用上方已核实条件。', 'no-search-note')
  );
  if (result.checks?.length) {
    const list = node('ul');
    for (const check of result.checks) {
      const icon = check.result === 'pass' ? '✓' : check.result === 'fail' ? '✕' : '?';
      list.append(node('li', `${icon} ${check.label}：${check.detail}`));
    }
    target.append(list);
  }
  if (result.needsResearch) {
    target.append(node('p', '这类新条件没有被现有证据覆盖，需要 Skill 再次查证；不能只修改需求文本就声称已经重新搜索。', 'tiny'));
  }
}

function renderEvidenceCard(record) {
  const card = record.card;
  const box = node('section', undefined, 'evidence-card');
  const meta = node('div', undefined, 'card-meta');
  const heading = node('div');
  heading.append(node('span', '条件证据卡 / EVIDENCE CARD', 'label'), node('h3', '宣传原句 → 条件 → 对你是否成立'), node('p', card.summary, 'tiny'));
  meta.append(heading, node('span', overallLabels[card.overallStatus] || '待判断', 'overall'));
  box.append(meta);

  for (const claim of card.claims || []) {
    const claimBox = node('article', undefined, 'claim-card');
    const head = node('div', undefined, 'claim-head');
    head.append(node('h4', `${claim.id} · ${claim.text}`), node('span', claimStatusLabels[claim.status] || claim.status, `claim-state ${claim.status}`));
    claimBox.append(head, node('p', `核查时间范围：${claim.timeScope || '未注明'}`, 'tiny'));
    for (const id of claim.conditionIds || []) {
      const condition = card.conditions?.[id];
      if (!condition) continue;
      const detail = node('div', undefined, 'condition');
      detail.append(node('strong', `${id} · ${condition.label}`), node('p', condition.text));
      detail.append(node('blockquote', `${condition.quoteType === 'paraphrase' ? '官方内容转述：' : '原文摘录：'}${condition.quote}`));
      detail.append(node('p', `核查时间：${condition.checkedAt || '未记录'}`, 'condition-meta'));
      for (const source of condition.sources || []) {
        const cite = node('span', undefined, 'evidence-cite');
        cite.append(sourceLink(source), node('span', ` · ${provenanceText(source)}`));
        detail.append(cite);
      }
      claimBox.append(detail);
    }
    box.append(claimBox);
  }

  const completed = node('div', undefined, 'completed');
  completed.append(node('h4', '补全条件后的说法'), node('p', card.completedStatement));
  box.append(completed);
  const lists = node('div', undefined, 'card-lists');
  for (const [title, key] of [['限制条件', 'limitations'], ['仍不确定', 'uncertainties']]) {
    if (!card[key]?.length) continue;
    const col = node('div');
    col.append(node('strong', title));
    const list = node('ul');
    for (const value of card[key]) list.append(node('li', value));
    col.append(list);
    lists.append(col);
  }
  box.append(lists);

  const needBox = node('div', undefined, 'need-box');
  needBox.append(node('label', '把“我的需求”放回去', 'label'), node('p', '修改需求后只重新匹配已核实条件，不会发起搜索；超出条件卡范围会要求再次查证。', 'tiny'));
  const examples = node('div', undefined, 'example-needs');
  for (const example of card.needExamples || [{label: '示例需求', text: card.exampleNeed}]) {
    const button = node('button', example.label);
    button.type = 'button';
    button.onclick = () => {
      needInput.value = example.text;
      evaluateNeed(card);
    };
    examples.append(button);
  }
  const needInput = node('textarea');
  needInput.id = 'card-need';
  needInput.maxLength = 500;
  needInput.minLength = 4;
  needInput.value = currentNeed;
  needInput.setAttribute('aria-label', '我的具体使用需求');
  const evaluate = node('button', '按现有证据重新判断');
  evaluate.type = 'button';
  evaluate.id = 'reevaluate';
  evaluate.onclick = () => evaluateNeed(card);
  const skill = node('button', '复制 Skill 深查任务');
  skill.type = 'button';
  skill.onclick = () => copyTask(record, needInput.value.trim());
  const entry = node('div', undefined, 'skill-entry');
  entry.append(evaluate, skill);
  const fit = node('div');
  fit.id = 'fit-result';
  needBox.append(examples, needInput, entry, fit);
  box.append(needBox);

  function evaluateNeed(cardData) {
    currentNeed = needInput.value.trim();
    currentEvaluation = evaluateCard(cardData, currentNeed);
    renderFit(currentEvaluation, fit);
  }
  evaluateNeed(card);

  box.append(node('p', `卡片整理：${card.cardAuthor || '未注明'}。检索贡献：${card.searchContributor || '未注明'}。这是 AI 草案，不是人工复核结论。`, 'tiny'));
  return box;
}

function renderNoCard(record) {
  const box = node('div', undefined, 'card-absent');
  box.append(node('h4', '本次是原始检索案卷，尚未生成条件证据卡'));
  box.append(node('p', `原说法：${record.claim}`));
  box.append(node('p', `我的需求：${record.need || '未填写'}`));
  box.append(node('p', '网页没有独立大模型接口，无法把这次元宝检索自动拆成承诺和条件。请把下方任务交给 AI 查证 Skill；在 Skill 返回结构化证据卡前，不能声称已经完成适用性判断。', 'tiny'));
  const button = node('button', '复制 Skill 深查任务');
  button.type = 'button';
  button.onclick = () => copyTask(record, record.need || '');
  const holder = node('div', undefined, 'skill-entry');
  holder.append(button);
  box.append(holder);
  return box;
}

function renderReview(record) {
  const box = node('div', undefined, 'verdict');
  box.append(node('h3', '人工复核区'));
  const grid = node('div', undefined, 'review-grid');
  const verdictWrap = node('label', '案卷结论');
  const verdict = node('select');
  verdict.id = 'verdict';
  verdict.setAttribute('aria-label', '案卷结论');
  for (const [value, text] of Object.entries(verdictLabels)) {
    const option = node('option', text);
    option.value = value;
    verdict.append(option);
  }
  verdict.value = ['supported', 'qualified', 'contradicted', 'insufficient'].includes(record.verdict) ? record.verdict : 'unreviewed';
  verdictWrap.append(verdict);
  const reviewerWrap = node('label', '复核人（完成复核时必填）');
  const reviewer = node('input');
  reviewer.id = 'reviewer';
  reviewer.autocomplete = 'off';
  reviewer.placeholder = '填写姓名或代号';
  reviewerWrap.append(reviewer);
  grid.append(verdictWrap, reviewerWrap);
  const notes = node('textarea');
  notes.id = 'notes';
  notes.placeholder = '写下原文依据、适用条件、需求判断和仍不确定的部分。';
  notes.setAttribute('aria-label', '人工复核说明');
  const check = node('label', undefined, 'review-check');
  const confirmed = node('input');
  confirmed.type = 'checkbox';
  confirmed.id = 'review-confirmed';
  check.append(confirmed, node('span', '我已打开关键原文并完成人工复核（勾选且填写结论、复核人和说明后才会标为已复核）'));
  box.append(grid, notes, check, node('p', '网页整理检索证据并做本地条件匹配，不自动给出真假判决；AI 草案与证据卡都不会替代人工复核。', 'tiny'));
  return box;
}

function render(record) {
  current = record;
  currentNeed = record.need || record.card?.exampleNeed || '';
  currentEvaluation = record.card ? evaluateCard(record.card, currentNeed) : null;
  sources = collectSources(record.rounds);
  sources.sort((a, b) => Number(matchHost(b.url, record.domain)) - Number(matchHost(a.url, record.domain)));
  const root = $('results');
  root.replaceChildren();
  root.setAttribute('aria-busy', 'false');
  const replay = record.caseId ? `案卷 ${record.caseId} · 真实记录回放` : '新查询 · 尚未持久保存';
  $('case-number').textContent = `${replay} · ${record.startedAt ? new Date(record.startedAt).toLocaleString('zh-CN', {hour12: false}) : '时间未知'}`;

  root.append(record.card ? renderEvidenceCard(record) : renderNoCard(record));
  if (record.analysis) root.append(renderAnalysis(record.analysis));

  for (const [index, round] of (record.rounds || []).entries()) {
    const card = node('div', undefined, 'round');
    const head = node('div', undefined, 'round-head');
    head.append(node('strong', `${String(index + 1).padStart(2, '0')} / ${round.label}`), node('span', round.status === 'error' ? '查询失败' : (round.pages || []).length ? '查询成功' : '零结果', `badge ${round.status}`));
    card.append(head, node('p', round.query, 'query'));
    card.append(node('p', `Site 参数：${round.site || '未指定'} · 请求 ID：${round.requestId || '无'}`, 'tiny'));
    if (round.status === 'error') card.append(node('p', round.error || '本轮查询失败。', 'error'));
    else if (!(round.pages || []).length) card.append(node('p', '本轮没有返回来源。零结果不等于说法为假。', 'tiny'));
    else card.append(node('p', `返回 ${round.pages.length} 条来源；摘要仅作线索。`, 'tiny'));
    root.append(card);
  }

  const summary = node('p', `共 ${sources.length} 个去重来源。请展开并打开关键原文核对；来源展开不会发起新搜索。`, 'tiny');
  root.append(summary);
  if (record.domain && !sources.some(source => matchHost(source.url, record.domain))) root.append(node('p', '本次元宝检索未获得指定官方域名的结果。证据卡中如有“补充直访官方原文”，已单独标记，不计作元宝命中。', 'notice'));
  if (!sources.length) root.append(node('p', '尚未获得可用检索证据；本案不能据此判断真伪。可检查查询词或由 Skill 调整策略后继续查证。', 'notice'));

  for (const [index, source] of sources.entries()) {
    const card = node('article', undefined, 'source');
    card.hidden = index >= 5;
    const top = node('div', undefined, 'source-top');
    top.append(node('span', `证据 ${String(index + 1).padStart(2, '0')} · ${new URL(source.url).hostname}`), node('span', source.date || '来源未提供日期'));
    const details = node('details');
    details.open = index < 2;
    const summaryElement = node('summary');
    summaryElement.append(sourceLink(source));
    details.append(summaryElement, node('p', source.passage || '该来源未提供摘要，请打开原文。', 'passage'));
    details.append(node('p', `元宝检索所得 · 第 ${source.rounds.join('、')} 轮${matchHost(source.url, record.domain) ? ' · 匹配指定官方域名' : ''}`, 'tiny'));
    const review = node('label', '原文复核标记', 'source-review tiny');
    const select = node('select');
    select.setAttribute('aria-label', `证据 ${index + 1} 的复核结果`);
    for (const [value, text] of Object.entries(assessmentLabels)) {
      const option = node('option', text);
      option.value = value;
      select.append(option);
    }
    select.onchange = () => { source.assessment = select.value; };
    review.append(select);
    details.append(review);
    card.append(top, details);
    root.append(card);
  }
  if (sources.length > 5) {
    const more = node('button', `展开其余 ${sources.length - 5} 条证据`);
    more.type = 'button';
    more.onclick = () => {
      root.querySelectorAll('.source').forEach(item => { item.hidden = false; });
      more.remove();
    };
    const holder = node('div', undefined, 'actions');
    holder.append(more);
    root.append(holder);
  }
  root.append(renderReview(record));

  const actions = node('div', undefined, 'actions');
  if (record.caseId) {
    const share = node('a', '独立案例链接 ↗');
    share.href = `/?case=${record.caseId}`;
    share.target = '_blank';
    share.rel = 'noopener';
    actions.append(share);
  }
  const ai = node('button', '复制 AI 深查任务');
  ai.type = 'button';
  ai.onclick = () => copyTask(record, ($('card-need')?.value || record.need || '').trim());
  const markdown = node('button', '导出证据卡 Markdown');
  markdown.type = 'button';
  markdown.onclick = () => exportCase('md');
  const json = node('button', '导出完整 JSON 案卷');
  json.type = 'button';
  json.onclick = () => exportCase('json');
  actions.append(ai, markdown, json);
  root.append(actions);
}

function exportCase(type) {
  if (!current) return;
  const confirmed = $('review-confirmed').checked;
  const review = {
    verdict: $('verdict').value,
    notes: $('notes').value,
    reviewer: $('reviewer').value,
    confirmed
  };
  if (confirmed && (!review.reviewer.trim() || !review.notes.trim() || ['unreviewed', 'insufficient'].includes(review.verdict))) {
    notice('要标记“已人工复核”，请选择支持、反驳或需补充条件，并填写复核人和复核说明。', true);
    return;
  }
  const need = ($('card-need')?.value || current.need || current.card?.exampleNeed || '').trim();
  const applicability = current.card ? evaluateCard(current.card, need) : null;
  currentNeed = need;
  currentEvaluation = applicability;
  const data = buildCaseExport(current, sources, review, undefined, {need, applicability});
  const text = type === 'json' ? JSON.stringify(data, null, 2) : caseToMarkdown(data);
  const blob = new Blob([text], {type: type === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = node('a');
  link.href = url;
  link.download = exportFileName(data, type);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice(data.humanReview.status === 'reviewed' ? `已导出 ${link.download}，包含人工复核记录。` : `已导出 ${link.download}；本案仍标为“尚未人工复核”。`);
}

function loadingView(label = '正在收集本次查证的证据…') {
  const box = node('div', undefined, 'empty');
  const line = node('div', undefined, 'loading-line');
  const flow = node('div', undefined, 'flow');
  for (const [index, text] of ['按需求定检索', '找原始出处', '查条件与反例'].entries()) flow.append(node('span', `${String(index + 1).padStart(2, '0')} ${text}`, 'active'));
  box.append(line, node('h3', label), flow, node('p', '真实查询可能需要数十秒。失败或零结果会如实保留，不会生成替代结论。'));
  $('results').replaceChildren(box);
  $('results').setAttribute('aria-busy', 'true');
}

function invalidCase(value) {
  current = null;
  currentNeed = '';
  currentEvaluation = null;
  sources = [];
  $('case-number').textContent = '无效案卷链接';
  $('results').replaceChildren(node('div', undefined, 'empty'));
  $('results').firstChild.append(node('h3', '没有找到这个案卷'), node('p', `案例链接“${value || '空'}”无效。请从左侧真实案例或本机生成案卷列表重新选择。`));
  notice('独立案例链接无效；未发起任何元宝搜索。', true);
}

async function loadCase(id, {push = false} = {}) {
  if (!parseCaseId(id)) return invalidCase(id);
  loadingView(`正在读取真实案卷 ${id}，不会发起新搜索…`);
  try {
    const response = await fetch(`/cases/${id}`);
    const record = await response.json();
    if (!response.ok) throw new Error(record.error || '案例加载失败。');
    render(record);
    $('claim').value = record.claim;
    $('need').value = record.need || record.card?.exampleNeed || '';
    $('domain').value = record.domain || '';
    if (push) history.pushState({case: id}, '', `/?case=${id}`);
    notice(`已载入真实案卷 ${id}（${new Date(record.startedAt).toLocaleString('zh-CN', {hour12: false})}）；回放与需求重算均未发起新搜索。`);
    if (matchMedia('(max-width:680px)').matches) $('case-section').scrollIntoView({block: 'start'});
  } catch (error) {
    current = null;
    $('results').replaceChildren(node('p', error.message, 'notice error'));
    $('case-number').textContent = `案卷 ${id} · 加载失败`;
    notice(`${error.message} 未发起元宝搜索。`, true);
  }
}

document.querySelectorAll('[data-claim]').forEach(button => {
  button.onclick = () => {
    $('claim').value = button.dataset.claim;
    $('need').value = button.dataset.need || '';
    $('domain').value = button.dataset.domain;
    $('claim').focus();
  };
});

$('query-form').onsubmit = async event => {
  event.preventDefault();
  if (busy) return;
  const claim = $('claim').value.trim();
  const needCheck = validateNeed($('need').value);
  const domain = $('domain').value.trim().toLowerCase();
  if (claim.length < 4 || claim.length > 500) return notice('请输入 4—500 字的公开产品说法。', true);
  if (!needCheck.valid) return notice(needCheck.error, true);
  if (domain && !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) return notice('官方域名请填写 example.com，不要包含协议、路径或空格。', true);
  const need = needCheck.value;
  busy = true;
  $('submit').disabled = true;
  $('submit').textContent = '元宝查证中…';
  current = null;
  currentNeed = need;
  currentEvaluation = null;
  sources = [];
  loadingView();
  notice('正在按你的需求确定检索维度并调用元宝搜索；最多 3 次查询，请稍候…');
  try {
    const response = await fetch('/investigate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-CSRF-Token': nonce},
      body: JSON.stringify({claim, domain, need})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '查询未完成。');
    history.replaceState({}, '', '/');
    render(data);
    $('case-section').scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    notice(data.rounds.some(round => round.status === 'error') ? '部分查询未成功，已保留返回结果和失败原因。' : '检索完成。这是原始检索案卷；承诺拆解与适用性判断需由 Skill 深查后形成。');
  } catch (error) {
    $('results').replaceChildren(node('div', undefined, 'empty'));
    $('results').firstChild.append(node('h3', '本次查证未完成'), node('p', '没有生成结论。可以检查连接与配置后重试；已有真实案例仍可回放。'));
    $('case-number').textContent = '查询失败';
    notice(error.message, true);
  } finally {
    busy = false;
    $('submit').disabled = false;
    $('submit').textContent = '开始查证 →';
    $('results').setAttribute('aria-busy', 'false');
  }
};

window.addEventListener('popstate', () => {
  const value = new URLSearchParams(location.search).get('case');
  if (value !== null) loadCase(value);
  else location.reload();
});

fetch('/cases').then(response => response.json()).then(data => {
  for (const item of data.cases || []) {
    const link = node('a', `${item.id} · ${item.claim}${item.hasCard ? ' · 条件卡' : ''} ↗`);
    link.href = `/?case=${item.id}`;
    link.onclick = event => {
      event.preventDefault();
      loadCase(item.id, {push: true});
    };
    $('saved-cases').append(link);
  }
}).catch(() => notice('真实案例列表暂时无法读取；新查询仍可使用。', true));

fetch('/status').then(response => response.json()).then(status => {
  $('connection').textContent = status.configured ? '元宝搜索已配置' : '元宝搜索待连接';
  $('connection').classList.toggle('ready', status.configured);
}).catch(() => { $('connection').textContent = '连接状态未知'; });

const initialCase = new URLSearchParams(location.search).get('case');
if (initialCase !== null) loadCase(initialCase);
