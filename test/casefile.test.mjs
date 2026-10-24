import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCaseExport, caseToMarkdown, collectSources, exportFileName, parseCaseId} from '../public/casefile.js';

const record = {
  caseId: '01',
  claim: '某产品免费版可以商用',
  domain: 'example.com',
  startedAt: '2026-10-24T08:00:00.000Z',
  completedAt: '2026-10-24T08:00:03.000Z',
  outcome: 'success',
  apiKey: 'must-not-leak',
  rounds: [{label: '找原始出处', query: '某产品 官方', site: 'example.com', status: 'success', requestId: 'req-test', pages: [{title: '官方定价', url: 'https://example.com/pricing', passage: '免费版仅限个人使用', date: '2026/10/01', site: 'example.com'}]}],
  analysis: {reviewer: 'Codex（AI 助手）', status: 'qualified', summary: '需补充条件', findings: [{text: '免费不等于可商用', sources: [{title: '官方定价', url: 'https://example.com/pricing', provenance: 'direct_official'}]}], uncertainties: ['地区范围未知']}
};

test('独立案例参数只接受已保存编号', () => {
  assert.equal(parseCaseId('01'), '01');
  assert.equal(parseCaseId('03'), '03');
  assert.equal(parseCaseId('save-a1b2c3d4e5f6'), 'save-a1b2c3d4e5f6');
  for (const value of ['1', '99', '../.local/config', 'save-../../x', '', null]) assert.equal(parseCaseId(value), null);
});

test('来源去重保留轮次、日期和元宝出处类型', () => {
  const rounds = [record.rounds[0], {...record.rounds[0], label: '交叉核对', pages: [...record.rounds[0].pages, {title: '无效', url: 'javascript:alert(1)'}]}];
  const sources = collectSources(rounds);
  assert.equal(sources.length, 1);
  assert.deepEqual(sources[0].rounds, [1, 2]);
  assert.equal(sources[0].date, '2026/10/01');
  assert.equal(sources[0].provenance, 'yuanbao_search');
});

test('未确认人工复核时，导出明确保持未复核并排除密钥字段', () => {
  const data = buildCaseExport(record, collectSources(record.rounds), {verdict: 'qualified', notes: '看起来有条件', reviewer: '', confirmed: false}, '2026-10-24T10:00:00.000Z');
  assert.equal(data.humanReview.status, 'unreviewed');
  assert.equal(data.humanReview.reviewer, '');
  assert.equal(data.humanReview.reviewedAt, null);
  assert.equal(data.rounds[0].requestId, 'req-test');
  assert.equal(data.analysis.reviewer, 'Codex（AI 助手）');
  assert.equal(data.domain, 'example.com');
  assert.ok(!JSON.stringify(data).includes('must-not-leak'));
  const markdown = caseToMarkdown(data);
  assert.match(markdown, /尚未人工复核/);
  assert.doesNotMatch(markdown, /已人工复核（/);
});

test('只有明确确认且信息完整才记录人工复核', () => {
  const base = {verdict: 'qualified', notes: '已核对定价原文', reviewer: '复核员', confirmed: true};
  const reviewed = buildCaseExport(record, collectSources(record.rounds), base, '2026-10-24T10:00:00.000Z');
  assert.equal(reviewed.humanReview.status, 'reviewed');
  assert.equal(reviewed.humanReview.reviewedAt, '2026-10-24T10:00:00.000Z');
  assert.match(caseToMarkdown(reviewed), /已人工复核（复核员/);
  for (const review of [{...base, reviewer: ''}, {...base, notes: ''}, {...base, verdict: 'unreviewed'}, {...base, confirmed: false}]) {
    assert.equal(buildCaseExport(record, [], review).humanReview.status, 'unreviewed');
  }
});

test('Markdown 包含查询步骤、请求 ID、域名、日期、AI 引用和不确定性', () => {
  const data = buildCaseExport(record, collectSources(record.rounds), {}, '2026-10-24T10:00:00.000Z');
  const markdown = caseToMarkdown(data);
  for (const expected of ['req-test', 'Site 参数：example.com', '来源日期：2026/10/01', 'Codex（AI 助手）', '补充直访官方原文', 'https://example.com/pricing', '地区范围未知', '尚未人工复核']) assert.ok(markdown.includes(expected), expected);
});

test('不同案例和新查询导出文件名可区分', () => {
  const one = buildCaseExport(record, [], {});
  const two = buildCaseExport({...record, caseId: '02'}, [], {});
  const fresh = buildCaseExport({...record, caseId: null, startedAt: '2026-10-24T09:00:00.000Z'}, [], {});
  assert.notEqual(exportFileName(one, 'md'), exportFileName(two, 'md'));
  assert.match(exportFileName(one, 'json'), /case-01\.json$/);
  assert.match(exportFileName(fresh, 'md'), /new-.*\.md$/);
});
