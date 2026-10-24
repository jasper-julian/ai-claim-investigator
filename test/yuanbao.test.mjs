import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePages, investigationPlan, searchYuanbao} from '../src/yuanbao.mjs';

test('兼容官方的 JSON 字符串 Pages，去重并剔除无效链接', () => {
  const p = {title: '官方说明', url: 'https://example.com/docs', passage: '<strong>限制</strong>说明'};
  const result = normalizePages({Response: {Pages: [JSON.stringify(p), p, '{broken', {url:'javascript:alert(1)'}], RequestId:'test-only'}});
  assert.equal(result.pages.length, 1);
  assert.equal(result.pages[0].passage, '限制说明');
  assert.equal(result.requestId, 'test-only');
});
test('官方错误不能伪装为零结果', () => {
  assert.throws(() => normalizePages({Response:{Error:{Code:'ResourceUnavailable'}}}), error => {
    assert.equal(error.code, 'ResourceUnavailable');
    assert.match(error.message, /资源不可用/);
    return true;
  });
});
test('搜索固定请求官方服务，密钥不出现在请求体', async () => {
  await searchYuanbao('公开产品测试', 'test-secret', async (url, init) => {
    assert.equal(url, 'https://api.wsa.cloud.tencent.com/SearchPro');
    assert.equal(init.headers.Authorization, 'Bearer test-secret');
    assert.deepEqual(JSON.parse(init.body), {Query:'公开产品测试'});
    return new Response(JSON.stringify({Response:{Pages:[]}}));
  });
});
test('按具体需求生成三步查证计划，并拒绝非法官方域名', () => {
  const plan=investigationPlan('某产品永久免费', 'example.com', '我每月生成 20 个模型，需要商用');
  assert.equal(plan.length, 3);
  assert.equal(plan[0].site,'example.com');
  assert.equal(plan[1].site,'example.com');
  assert.equal(plan[2].site,undefined);
  assert.match(plan[1].label, /额度/);
  assert.match(plan[1].label, /商用/);
  assert.match(plan[1].query, /额度 次数 使用量/);
  assert.match(plan[1].query, /商用 授权 许可/);
  assert.throws(() => investigationPlan('某产品永久免费', 'https://example.com/path', '我需要商用'), /官方域名/);
  assert.throws(() => investigationPlan('某产品永久免费', 'example.com', ''), /需求/);
});

test('不同具体需求产生不同的检索词，而不是固定关键词', () => {
  const quota=investigationPlan('某产品永久免费', 'example.com', '我每月需要 20 次生成');
  const format=investigationPlan('某产品永久免费', 'example.com', '我需要导出 PNG 格式');
  assert.notEqual(quota[1].query, format[1].query);
  assert.match(quota[1].query, /额度 次数 使用量/);
  assert.match(format[1].query, /导出 格式 下载/);
  assert.doesNotMatch(format[1].query, /额度 次数 使用量/);
});
test('官方域名通过 API 的 Site 参数发送，不依赖检索词中的运算符',async()=>{
  await searchYuanbao('产品收费条件','test-secret',async(url,init)=>{
    assert.deepEqual(JSON.parse(init.body),{Query:'产品收费条件',Site:'example.com'});
    return new Response(JSON.stringify({Response:{Pages:[]}}));
  },{site:'example.com'});
});
