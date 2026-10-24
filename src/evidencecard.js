export const claimStatusLabels = {
  supported: '有来源支持',
  supported_with_conditions: '有来源支持，附条件',
  contradicted: '有来源反驳',
  unknown: '尚不明确'
};

export const fitLabels = {
  applies: '在你的条件下适用',
  does_not_apply: '在你的条件下不适用',
  insufficient: '证据不足以判断',
  out_of_scope: '超出现有证据，需再次查证'
};

export function validateNeed(need) {
  const text = String(need || '').trim();
  if (text.length < 4 || text.length > 500) return {valid: false, error: '请用 4—500 字说明你的具体使用需求。'};
  return {valid: true, value: text};
}

export function detectNeedFacets(need) {
  const text = String(need || '').trim();
  const definitions = [
    {id: 'quota', pattern: /额度|次数|每月|每个月|月内|用量|生成量|使用量|积分/, terms: '额度 次数 使用量'},
    {id: 'commercial', pattern: /商用|商业|售卖|广告|客户项目|版权|授权/, terms: '商用 授权 许可'},
    {id: 'format', pattern: /格式|下载|导出|PNG|JPG|JPEG|GLB|FBX|OBJ|STL|CSV|PDF|MP4|ZIP/i, terms: '导出 格式 下载'},
    {id: 'feature', pattern: /功能|CLI|API|插件|无水印|4K|HD|分辨率|协作|多人|团队|并发|接口/i, terms: '功能 版本 权限'},
    {id: 'region', pattern: /地区|区域|国家|中国香港|香港|澳门|台湾|海外|境外|大陆/, terms: '地区 可用范围'},
    {id: 'time', pattern: /时间|截止|到期|活动期|11月|12月|之后|以前|长期|永久/, terms: '活动时间 有效期'}
  ];
  const facets = definitions.filter(item => item.pattern.test(text));
  return facets.length ? facets : [{id: 'general', pattern: null, terms: '适用条件 限制'}];
}

export function evaluateCard(card, need, evaluatedAt = new Date().toISOString()) {
  const checked = validateNeed(need);
  if (!checked.valid) {
    return {
      status: 'insufficient',
      label: fitLabels.insufficient,
      summary: checked.error,
      checks: [],
      searched: false,
      evaluatedAt,
      invalidNeed: true
    };
  }
  const text = checked.value;
  const checks = [];
  for (const criterion of card.applicability?.criteria || []) {
    let value = null;
    let matched = false;
    if (criterion.type === 'numeric_limit') {
      const match = text.match(new RegExp(criterion.pattern));
      if (match) {
        matched = true;
        value = Number(match[1]);
        const passes = criterion.operator === 'lte' ? value <= criterion.limit : value >= criterion.limit;
        checks.push({
          id: criterion.id,
          label: criterion.label,
          result: passes ? 'pass' : 'fail',
          detail: passes ? criterion.passText : criterion.failText.replaceAll('{value}', String(value)).replaceAll('{limit}', String(criterion.limit)),
          conditionIds: criterion.conditionIds || []
        });
      }
    } else if (criterion.type === 'trigger') {
      const hit = new RegExp(criterion.pattern, criterion.flags || '').test(text);
      const excluded = criterion.negativePattern ? new RegExp(criterion.negativePattern, criterion.flags || '').test(text) : false;
      if (hit && !excluded) {
        matched = true;
        checks.push({
          id: criterion.id,
          label: criterion.label,
          result: criterion.result,
          detail: criterion.result === 'pass' ? criterion.passText : criterion.failText,
          conditionIds: criterion.conditionIds || []
        });
      }
    }
    if (matched && value !== null) checks.at(-1).value = value;
  }

  if (!checks.length) {
    return {
      status: 'out_of_scope',
      label: fitLabels.out_of_scope,
      summary: '这个需求维度没有已核实的结构化条件，不能仅凭现有证据卡判断。需要交给 AI 查证 Skill 针对新问题再次搜索并打开原文。',
      checks: [],
      searched: false,
      needsResearch: true,
      evaluatedAt
    };
  }
  if (checks.some(item => item.result === 'fail')) {
    return {
      status: 'does_not_apply',
      label: fitLabels.does_not_apply,
      summary: '至少一项已核实条件与你的需求冲突。这只说明当前条件下不适用，不等于对宣传作“虚假”定性。',
      checks,
      searched: false,
      evaluatedAt
    };
  }
  if (checks.some(item => item.result === 'unknown')) {
    return {
      status: 'insufficient',
      label: fitLabels.insufficient,
      summary: '已核实资料没有覆盖其中一项需求。需要针对该维度继续查证，不能用现有摘要补齐。',
      checks,
      searched: false,
      needsResearch: true,
      evaluatedAt
    };
  }
  return {
    status: 'applies',
    label: fitLabels.applies,
    summary: '现有已核实条件覆盖了这次需求中的维度。适用仍以卡片所列来源日期和限制为准，未重新发起搜索。',
    checks,
    searched: false,
    evaluatedAt
  };
}
