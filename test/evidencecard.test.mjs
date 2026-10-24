import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {detectNeedFacets, evaluateCard, validateNeed} from '../src/evidencecard.js';
import {buildCaseExport, caseToMarkdown, collectSources} from '../public/casefile.js';

async function card(id) {
  return JSON.parse(await readFile(new URL(`../evidence/cards/card-${id}.json`, import.meta.url), 'utf8'));
}

test('三张真实证据卡均不超过 3 项承诺，条件都有可点击来源', async () => {
  for (const id of ['01', '02', '03']) {
    const value = await card(id);
    assert.equal(value.claims.length, 3);
    assert.ok(value.completedStatement.length > 20);
    assert.ok(value.needExamples.length >= 3);
    for (const claim of value.claims) {
      assert.ok(['supported', 'supported_with_conditions', 'contradicted', 'unknown'].includes(claim.status));
      for (const conditionId of claim.conditionIds) {
        const condition = value.conditions[conditionId];
        assert.ok(condition, `${id}/${claim.id}/${conditionId}`);
        assert.ok(condition.quote && condition.quoteType && condition.checkedAt);
        if (condition.sources.length) {
          for (const source of condition.sources) {
            assert.match(source.url, /^https:\/\//);
            assert.ok(['search', 'direct_official'].includes(source.provenance));
            assert.ok(source.date);
          }
        }
      }
    }
  }
});

test('实际案例需求分别得到适用、不适用和证据不足', async () => {
  for (const id of ['01', '02', '03']) {
    const value = await card(id);
    const results = value.needExamples.map(example => evaluateCard(value, example.text, '2026-10-24T12:00:00.000Z').status);
    assert.deepEqual(results, ['applies', 'does_not_apply', 'insufficient'], `case-${id}`);
    for (const example of value.needExamples) {
      const result = evaluateCard(value, example.text, '2026-10-24T12:00:00.000Z');
      assert.equal(result.searched, false);
      assert.ok(result.checks.length > 0);
    }
  }
});

test('修改需求只重算条件，不产生搜索或概率', async () => {
  const value = await card('02');
  const before = evaluateCard(value, '我只需要个人轻量办公，每月使用不超过 100 积分，不要求 CLI。', '2026-10-24T12:00:00.000Z');
  const after = evaluateCard(value, '我必须使用免费 CLI。', '2026-10-24T12:00:01.000Z');
  assert.equal(before.status, 'applies');
  assert.equal(after.status, 'does_not_apply');
  assert.equal(after.searched, false);
  assert.equal(after.evaluatedAt, '2026-10-24T12:00:01.000Z');
  assert.ok(after.checks.some(check => check.id === 'cli-access' && check.result === 'fail'));
  assert.doesNotMatch(JSON.stringify(after), /概率|probability|confidence/i);
});

test('超出现有条件的维度明确要求再次查证，而非猜结论', async () => {
  const value = await card('03');
  const result = evaluateCard(value, '我想确认是否提供中文人工客服和发票。', '2026-10-24T12:00:00.000Z');
  assert.equal(result.status, 'out_of_scope');
  assert.equal(result.needsResearch, true);
  assert.equal(result.searched, false);
});

test('需求校验和检索维度识别可用', () => {
  assert.equal(validateNeed('查').valid, false);
  assert.equal(validateNeed('我每月需要导出 PNG 并用于商用').valid, true);
  const facets = detectNeedFacets('我每月需要导出 PNG 并用于商用');
  assert.deepEqual(facets.map(item => item.id), ['quota', 'commercial', 'format']);
});

test('公司项目不等于条件冲突：未查明的商用许可返回证据不足', async () => {
  const live = JSON.parse(await readFile(new URL('../evidence/live/copilot-free-card.json', import.meta.url), 'utf8'));
  const need = '我要在公司项目里用 Copilot 写代码，团队没有采购付费计划，想直接用免费版。';
  const result = evaluateCard(live, need, '2026-10-24T12:00:00.000Z');
  assert.equal(result.status, 'insufficient');
  assert.equal(result.searched, false);
  assert.equal(result.needsResearch, true);
  const orgCheck = result.checks.find(check => check.id === 'org-project');
  assert.equal(orgCheck.result, 'unknown');
  assert.match(orgCheck.detail, /另行查证/);
  assert.doesNotMatch(orgCheck.detail, /禁止商用|违反|与你的需求冲突/);
  assert.doesNotMatch(JSON.stringify(result), /概率|probability|confidence/i);
});

test('只有官方原文与明确要求直接冲突时才判不适用', async () => {
  const live = JSON.parse(await readFile(new URL('../evidence/live/copilot-free-card.json', import.meta.url), 'utf8'));
  const guarantee = evaluateCard(live, '公司要求提供 IP indemnity 和 SAML SSO，才能用于公司项目里的代码。', '2026-10-24T12:00:00.000Z');
  assert.equal(guarantee.status, 'does_not_apply');
  assert.ok(guarantee.checks.some(check => check.id === 'enterprise-guarantee' && check.result === 'fail'));
  assert.equal(guarantee.searched, false);
  const provided = evaluateCard(live, '公司已经给我开通了 Copilot 企业版，我还想用免费版补足额度。', '2026-10-24T12:00:00.000Z');
  assert.equal(provided.status, 'does_not_apply');
  assert.ok(provided.checks.some(check => check.id === 'org-provided' && check.result === 'fail'));
});

test('需求里写了已付费或已有付费计划时，不把免费档缺项当成冲突', async () => {
  const first = await card('01');
  assert.equal(evaluateCard(first, '我每月生成 5 个模型，API 我单独付费购买。').status, 'applies');
  assert.equal(evaluateCard(first, '我每月生成 5 个模型，个人非商业，使用 Blender Bridge 发送，已有 Pro 计划。').status, 'applies');
  const second = await card('02');
  const paidCli = evaluateCard(second, '我已订阅标准版，CLI 用付费额度，只想确认体验版额度。');
  assert.notEqual(paidCli.status, 'does_not_apply');
});

test('新真实卡的需求示例覆盖适用、证据不足与直接冲突', async () => {
  const live = JSON.parse(await readFile(new URL('../evidence/live/copilot-free-card.json', import.meta.url), 'utf8'));
  const statuses = live.needExamples.map(example => evaluateCard(live, example.text, '2026-10-24T12:00:00.000Z').status);
  assert.deepEqual(statuses, ['applies', 'insufficient', 'insufficient', 'does_not_apply']);
});

test('导出同时包含证据卡、当前需求、适用判断和来源', async () => {
  const value = await card('01');
  const record = {
    caseId: '01',
    claim: value.claim,
    domain: 'tripo3d.ai',
    startedAt: '2026-10-24T08:05:22.457Z',
    completedAt: '2026-10-24T08:05:23.903Z',
    rounds: [{label: '找宣传原句与官方说明', query: 'Tripo 官方', status: 'success', requestId: 'req-card', pages: [{title: '官方', url: 'https://tripo3d.ai/integrations/blender', passage: '线索', date: ''}]}],
    card: value
  };
  const need = value.needExamples[1].text;
  const applicability = evaluateCard(value, need, '2026-10-24T12:00:00.000Z');
  const data = buildCaseExport(record, collectSources(record.rounds), {}, '2026-10-24T12:01:00.000Z', {need, applicability});
  assert.equal(data.schemaVersion, '1.1');
  assert.equal(data.evidenceCard.claims.length, 3);
  assert.equal(data.applicability.status, 'does_not_apply');
  assert.equal(data.need, need);
  assert.equal(data.humanReview.status, 'unreviewed');
  const markdown = caseToMarkdown(data);
  for (const expected of ['条件证据卡', '补全条件后的说法', '对“我的需求”的适用判断', '在你的条件下不适用', '是否重新搜索：否', 'tripo3d.ai/integrations/blender', '尚未人工复核']) {
    assert.ok(markdown.includes(expected), expected);
  }
});
