// API contract: https://cloud.tencent.com/document/product/1806/130615
import {detectNeedFacets} from './evidencecard.js';

const providerMessages = {
  UnauthorizedOperation: '元宝搜索鉴权失败，请检查服务 API Key。',
  ResourceUnavailable: '元宝搜索资源不可用，请检查账号欠费或搜索额度。',
  ResourceNotFound: '元宝搜索服务尚未开通，请先在官方控制台开通。',
  RequestLimitExceeded: '元宝搜索请求频率超限，请稍后重试。',
  InvalidParameter: '元宝搜索拒绝了查询参数，请检查输入。',
  InternalError: '元宝搜索服务内部错误，请稍后重试。'
};

export class YuanbaoSearchError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'YuanbaoSearchError';
    this.code = code;
  }
}

export function providerError(code = 'UnknownError') {
  return new YuanbaoSearchError(code, providerMessages[code] || `元宝搜索返回错误（${String(code).slice(0, 80)}），请检查服务状态。`);
}

export function normalizePages(response) {
  const payload = response.Response ?? response;
  if (payload.Error) throw providerError(payload.Error.Code);
  const pages = [];
  for (const item of payload.Pages ?? []) {
    let page;
    try { page = typeof item === 'string' ? JSON.parse(item) : item; } catch { continue; }
    if (!page || typeof page !== 'object') continue;
    let url;
    try { url = new URL(page.url); } catch { continue; }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) continue;
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ['openid', 'refer', 'strategy', 'tbkt'].includes(key.toLowerCase())) url.searchParams.delete(key);
    }
    if (pages.some(item => item.url === url.href)) continue;
    pages.push({
      title: String(page.title || url.hostname),
      url: url.href,
      passage: String(page.passage || '').replace(/<[^>]*>/g, ''),
      date: String(page.date || ''),
      site: String(page.site || url.hostname)
    });
  }
  return {pages, requestId: payload.RequestId ?? null};
}

export async function searchYuanbao(query, apiKey, fetcher = fetch, options = {}) {
  if (!apiKey) throw new YuanbaoSearchError('NotConfigured', '尚未配置元宝搜索服务 API Key。');
  const response = await fetcher('https://api.wsa.cloud.tencent.com/SearchPro', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(options.timeoutMs || 25000),
    headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json; charset=utf-8'},
    body: JSON.stringify({Query: query, ...(options.site ? {Site: options.site} : {})})
  });
  if (!response.ok) {
    if ([401, 403].includes(response.status)) throw providerError('UnauthorizedOperation');
    if (response.status === 402) throw providerError('ResourceUnavailable');
    if (response.status === 429) throw providerError('RequestLimitExceeded');
    throw new YuanbaoSearchError(`Http${response.status}`, `元宝搜索 HTTP ${response.status}，请检查服务状态。`);
  }
  return normalizePages(await response.json());
}

export function investigationPlan(claim, domain = '', need = '') {
  claim = String(claim || '').trim();
  if (claim.length < 4 || claim.length > 500) throw new Error('请输入 4—500 字的公开产品说法。');
  need = String(need || '').trim();
  if (need.length < 4 || need.length > 500) throw new Error('请用 4—500 字说明你的具体使用需求。');
  const host = String(domain || '').trim().toLowerCase();
  if (host && !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host)) throw new Error('官方域名请填写类似 example.com 的格式。');
  const facets = detectNeedFacets(need);
  const terms = [...new Set(facets.map(facet => facet.terms))].join(' ');
  const focus = facets.map(facet => facet.id === 'general' ? '适用条件' : facet.terms.split(' ')[0]).join('、');
  return [
    {label: '找宣传原句与官方说明', query: `${claim} 官方 说明 原文`, facet: 'source', ...(host ? {site: host} : {})},
    {label: `核对${focus}`, query: `${claim} ${terms} 条件 限制 官方`, facet: facets.map(facet => facet.id).join(','), ...(host ? {site: host} : {})},
    {label: '找反例与例外', query: `${claim} ${terms} 不适用 例外 实际使用 公告`, facet: 'counterexample'}
  ];
}
