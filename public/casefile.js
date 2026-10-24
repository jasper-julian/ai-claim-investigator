export const verdictLabels = {
  unreviewed: '待核实 / 证据不足',
  supported: '有证据支持',
  qualified: '需要补充条件',
  contradicted: '有证据反驳',
  insufficient: '证据不足'
};

export const assessmentLabels = {
  unreviewed: '尚未复核',
  supports: '支持该说法',
  contradicts: '与说法矛盾',
  limited: '存在条件或限制',
  irrelevant: '不足以说明'
};

export function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function collectSources(rounds = []) {
  const sources = [];
  for (const [index, round] of rounds.entries()) {
    for (const page of round.pages || []) {
      const url = validHttpUrl(page.url);
      if (!url) continue;
      const existing = sources.find(item => item.url === url);
      if (existing) {
        if (!existing.rounds.includes(index + 1)) existing.rounds.push(index + 1);
        continue;
      }
      sources.push({
        title: String(page.title || new URL(url).hostname),
        url,
        passage: String(page.passage || ''),
        date: String(page.date || ''),
        site: String(page.site || new URL(url).hostname),
        rounds: [index + 1],
        provenance: 'yuanbao_search',
        assessment: 'unreviewed'
      });
    }
  }
  return sources;
}

export function parseCaseId(value) {
  return /^(?:0[1-3]|save-[a-f0-9]{12})$/.test(String(value || '')) ? String(value) : null;
}

export function reviewState(review = {}) {
  const verdict = Object.hasOwn(verdictLabels, review.verdict) ? review.verdict : 'unreviewed';
  const reviewer = String(review.reviewer || '').trim();
  const notes = String(review.notes || '').trim();
  const completed = review.confirmed === true && verdict !== 'unreviewed' && verdict !== 'insufficient' && Boolean(reviewer) && Boolean(notes);
  return {
    status: completed ? 'reviewed' : 'unreviewed',
    reviewer: completed ? reviewer : '',
    reviewedAt: completed ? review.reviewedAt || null : null,
    verdict,
    notes
  };
}

export function buildCaseExport(record, sources, review = {}, exportedAt = new Date().toISOString(), context = {}) {
  const humanReview = reviewState({...review, reviewedAt: exportedAt});
  return {
    schemaVersion: '1.1',
    caseId: record.caseId || null,
    claim: String(record.claim || ''),
    domain: String(record.domain || ''),
    need: String(context.need ?? record.need ?? record.card?.exampleNeed ?? ''),
    startedAt: record.startedAt || null,
    completedAt: record.completedAt || null,
    exportedAt,
    outcome: record.outcome || 'replay',
    rounds: structuredClone(record.rounds || []),
    sources: structuredClone(sources),
    evidenceCard: record.card ? structuredClone(record.card) : null,
    applicability: context.applicability ? structuredClone(context.applicability) : null,
    verdict: humanReview.verdict,
    notes: humanReview.notes,
    analysis: record.analysis ? structuredClone(record.analysis) : null,
    humanReview
  };
}

export function exportFileName(data, extension) {
  const identity = data.caseId ? `case-${data.caseId}` : `new-${String(data.startedAt || data.exportedAt).replace(/[-:.]/g, '').replace(/Z.*$/, 'Z')}`;
  return `AI宣传查证所-${identity}.${extension}`;
}

function provenanceLabel(value) {
  return value === 'direct_official' ? '补充直访官方原文' : '元宝检索后打开核实';
}

const cardClaimStatus = {
  supported: '有来源支持',
  supported_with_conditions: '有来源支持，附条件',
  contradicted: '有来源反驳',
  unknown: '尚不明确'
};

const cardFitStatus = {
  applies: '在你的条件下适用',
  does_not_apply: '在你的条件下不适用',
  insufficient: '证据不足以判断',
  out_of_scope: '超出现有证据，需再次查证'
};

export function caseToMarkdown(data) {
  const lines = [
    '# AI 宣传查证所 · 查证案卷', '',
    `- 案卷编号：${data.caseId || '新查询（未分配持久编号）'}`,
    `- 原始说法：${data.claim}`,
    `- 指定官方域名：${data.domain || '未指定'}`,
    `- 查询开始：${data.startedAt || '未记录'}`,
    `- 查询完成：${data.completedAt || '未记录'}`,
    `- 导出时间：${data.exportedAt}`,
    `- 人工复核状态：${data.humanReview.status === 'reviewed' ? `已人工复核（${data.humanReview.reviewer}，${data.humanReview.reviewedAt}）` : '尚未人工复核'}`,
    `- 复核结论：${verdictLabels[data.humanReview.verdict] || data.humanReview.verdict}`,
    `- 复核说明：${data.humanReview.notes || '尚未填写'}`, '',
    '> 元宝搜索摘要是线索，不等于已阅读全文。没有搜索结果不等于说法为假。AI 草案与人工复核是不同状态。', '',
    `- 我的具体需求：${data.need || '未填写'}`, ''
  ];
  if (data.evidenceCard) {
    const card = data.evidenceCard;
    lines.push('## 条件证据卡', '', `- 卡片整理：${card.cardAuthor || '未注明'}`, `- 检索贡献：${card.searchContributor || '未注明'}`, `- 总体判断：${cardClaimStatus[card.overallStatus] || card.overallStatus}`, `- 摘要：${card.summary || '未填写'}`, '');
    for (const claim of card.claims || []) {
      lines.push(`### ${claim.id} · ${cardClaimStatus[claim.status] || claim.status}`, '', claim.text || '', `- 时间范围：${claim.timeScope || '未注明'}`, '');
      for (const id of claim.conditionIds || []) {
        const condition = card.conditions?.[id];
        if (!condition) continue;
        lines.push(`- **条件 ${id} · ${condition.label}**：${condition.text}`, `  - 原文${condition.quoteType === 'paraphrase' ? '转述' : '摘录'}：${condition.quote}`, `  - 核查时间：${condition.checkedAt || '未记录'}`);
        for (const source of condition.sources || []) {
          const url = validHttpUrl(source.url);
          lines.push(`  - 来源：[${source.title}](${url || '#'}) · ${provenanceLabel(source.provenance)} · 来源日期：${source.date || '未提供'}`);
        }
      }
      lines.push('');
    }
    lines.push('### 补全条件后的说法', '', card.completedStatement || '未填写', '');
    if (card.limitations?.length) {
      lines.push('### 限制条件', '');
      for (const item of card.limitations) lines.push(`- ${item}`);
      lines.push('');
    }
    if (card.uncertainties?.length) {
      lines.push('### 仍不确定', '');
      for (const item of card.uncertainties) lines.push(`- ${item}`);
      lines.push('');
    }
  }
  if (data.applicability) {
    lines.push('## 对“我的需求”的适用判断', '', `- 当前需求：${data.need || '未填写'}`, `- 判断：${cardFitStatus[data.applicability.status] || data.applicability.status}`, `- 说明：${data.applicability.summary || '未填写'}`, '- 是否重新搜索：否。此判断只使用上方已核实条件；超范围维度需要再次查证。', '');
    if (data.applicability.checks?.length) {
      lines.push('| 需求维度 | 结果 | 依据 |', '|---|---|---|');
      for (const check of data.applicability.checks) {
        const result = check.result === 'pass' ? '满足' : check.result === 'fail' ? '冲突/不满足' : '证据不足';
        lines.push(`| ${check.label} | ${result} | ${String(check.detail || '').replaceAll('|', '/')} |`);
      }
      lines.push('');
    }
  }
  lines.push('## 实际查询步骤', '');
  for (const [index, round] of data.rounds.entries()) {
    lines.push(`### ${index + 1}. ${round.label}`, '',
      `- 查询词：${round.query}`,
      `- Site 参数：${round.site || '未指定'}`,
      `- 状态：${round.status}`,
      `- 请求 ID：${round.requestId || '无（请求失败或服务未返回）'}`,
      `- 返回条数：${(round.pages || []).length}`);
    if (round.error) lines.push(`- 失败原因：${round.error}`);
    lines.push('');
  }
  if (data.analysis) {
    const analysis = data.analysis;
    lines.push('## AI 查证草案（非人工复核）', '',
      `- 贡献者：${analysis.reviewer || '未注明'}`,
      `- 草案时间：${analysis.reviewedAt || '未记录'}`,
      `- 草案结论：${verdictLabels[analysis.status] || analysis.status || '未注明'}`,
      `- 摘要：${analysis.summary || '未填写'}`, '');
    for (const [index, finding] of (analysis.findings || []).entries()) {
      lines.push(`### 发现 ${index + 1}`, '', finding.text || '未填写', '');
      for (const source of finding.sources || []) {
        const url = validHttpUrl(source.url);
        if (url) lines.push(`- [${source.title || url}](${url}) · ${provenanceLabel(source.provenance)}${source.date ? ` · 来源日期：${source.date}` : ''}`);
      }
      lines.push('');
    }
    for (const [title, key] of [['限制条件', 'limitations'], ['来源冲突', 'conflicts'], ['原文访问记录', 'evidenceAccess']]) {
      if (!analysis[key]?.length) continue;
      lines.push(`### ${title}`, '');
      for (const item of analysis[key]) lines.push(`- ${typeof item === 'string' ? item : JSON.stringify(item)}`);
      lines.push('');
    }
    if (analysis.uncertainties?.length) {
      lines.push('### 仍不能确定', '');
      for (const item of analysis.uncertainties) lines.push(`- ${item}`);
      lines.push('');
    }
  } else {
    lines.push('## AI 查证草案', '', '本案尚未附加 AI 深查草案。网页检索结果本身不是 AI 结论。', '');
  }
  lines.push('## 去重证据来源（元宝检索所得）', '');
  if (!data.sources.length) lines.push('本次没有可用来源，不能据此判断说法真伪。', '');
  for (const [index, source] of data.sources.entries()) {
    lines.push(`### 证据 ${String(index + 1).padStart(2, '0')} · ${source.title}`, '',
      `- 链接：${source.url}`,
      `- 来源站点：${source.site || new URL(source.url).hostname}`,
      `- 来源日期：${source.date || '服务未提供'}`,
      `- 出现于查询轮次：${(source.rounds || []).join('、')}`,
      `- 出处类型：元宝检索所得`,
      `- 原文复核标记：${assessmentLabels[source.assessment] || source.assessment || '尚未复核'}`,
      `- 搜索摘要：${source.passage || '服务未提供摘要；请打开原文。'}`, '');
  }
  lines.push('## 使用边界', '', '- 来源未提供日期不等于资料仍然有效。', '- 指定域名零命中只说明本次检索覆盖不足。', '- 公开分享或正式提交前，请打开关键原文并完成人工复核。', '');
  return lines.join('\n');
}
