# 深度查证报告 · Tripo 插件免费，是否代表生成也免费？

- 案卷：case-01
- 原始说法：Tripo 的插件免费安装，是否代表 3D 模型生成也免费？
- 元宝检索时间：2026-10-24 08:05:22—08:05:23 UTC
- Codex AI 草案时间：2026-10-24 08:12:47 UTC
- WorkBuddy 补充原文复核：2026-10-24 11:25—11:37 UTC
- 指定官方域名：tripo3d.ai
- 结论：**需要补充条件（qualified）**
- 人工复核状态：**尚未人工复核**

> 本报告保留 Codex 既有草案的贡献说明，并加入 WorkBuddy 本次对官方定价页、Blender Bridge 页的再次直访核对。它不是人工复核记录，也不读取任何私人账户。

## 一、结论摘要

“插件可以免费下载安装”本身有官方依据，但不能推出“通过插件生成模型也免费”，更不能推出“不限量、可商用”。

Tripo 官方当前同时存在三条不同边界：

1. **Studio 免费档**：每月 200 积分，官方估算约 13 个模型；输出标注为公开模型、非商用，并有导出等限制。
2. **Studio 的 Blender Bridge**：插件下载免费，但通过 Bridge 发送模型需要 Pro、Max 或 Team 计划；Free 不包含 Bridge。
3. **API 插件**：与 Studio Bridge 是不同产品入口，需要 Tripo API Key，API 用量与 Studio 订阅分开计费。

因此，准确说法应是：**Tripo 提供有限的免费生成入口；插件下载、Studio 生成、Bridge 传输、API 调用和商用授权必须分别判断。**

## 二、命题拆解

| 命题 | 判断 | 依据 |
|---|---|---|
| 插件是否可以免费下载？ | 有证据支持 | 官方 Bridge FAQ 明确说下载免费 |
| 免费账户是否能通过 Bridge 发送模型？ | 有证据反驳 | 官方要求 Pro、Max 或 Team，Free 不包含 |
| Studio 是否完全不能免费生成？ | 有证据反驳 | 官方有 Free 档和每月积分 |
| 免费生成是否不限量？ | 有证据反驳 | 200 积分/月，约 13 个模型，生成消耗积分 |
| 免费档输出是否可商用？ | 有证据反驳 | Free 标注 Non-Commercial Use |
| API 插件是否使用 Studio 免费额度？ | 有证据反驳 | 官方说明 API 单独计费，Studio 计划和积分不适用 |

## 三、实际元宝搜索台账

| 轮次 | 目的 | Site 参数 | 状态 | 请求 ID | 返回 |
|---|---|---|---|---|---|
| 1 | 找原始出处 | tripo3d.ai | success | 44b2571d-dd5c-403d-8fcc-f28ed5b8dce5 | 10 |
| 2 | 查限制与例外 | tripo3d.ai | success | 7c5be187-89a5-4fc0-ba50-bdcf8dec41e3 | 10 |
| 3 | 交叉核对 | 未指定 | success | dbb21f40-c487-4cbb-8c8d-61d6d477aec0 | 10 |

三轮均为已保存的真实元宝响应。本报告回放这些记录，没有为截图重复调用搜索。完整摘要和全部来源见 `exports/case-01.json` 与 `exports/case-01.md`。

## 四、证据链与原文核对

### E1 · 插件下载免费，但使用 Bridge 有计划门槛

- 来源：[Tripo 官方 DCC Bridge for Blender](https://tripo3d.ai/integrations/blender)
- 出处类型：**元宝检索所得，之后打开官方原文核实**（第 1 轮）
- 原文访问：成功；WorkBuddy 于 2026-10-24 本次复核时段读取
- 页面日期：页面未提供明确发布日期
- 关键原文：
  - “Downloading the add-on is free, but sending a model needs a signed-in Tripo Studio account on one of those plans.”
  - “DCC Bridge is included with the Pro, Max and Team plans. The Free plan does not include it.”
  - “The Tripo API plugin for Blender is documented on the developer site… API usage is billed separately from your Studio subscription, so Studio plans and credits do not apply to it.”
- 支持的判断：免费下载不等于免费使用 Bridge；Studio 与 API 插件不能混为一谈。

### E2 · Studio 免费生成存在，但有额度和非商用限制

- 来源：[Tripo Studio 官方定价](https://www.tripo3d.ai/pricing)
- 出处类型：**补充直访官方原文**；Codex 既有草案已列出，WorkBuddy 本次再次读取
- 原文访问：成功；2026-10-24 本次复核时段读取
- 页面日期：动态定价页未提供明确发布日期，结论只对应本次访问时的页面
- 关键原文：
  - Free：“200 Monthly Credits ≈ 13 Models”
  - Free：“Public Models · Non-Commercial Use”
  - FAQ：“Each model generation and editing consume credits depending on complexity and settings.”
  - Pro / Max / Team 标注 “Private Models · Commercial Use”，并列出 DCC Bridge。
- 支持的判断：免费档不是无限生成，也不等于可商用；不同功能消耗积分，估算模型数不是固定保证。

### E3 · 官方首页“免费生成”是入口描述，不是无条件承诺

- 来源：[Tripo 官方首页](https://tripo3d.ai/)
- 出处类型：**元宝检索所得**（第 1 轮）；本报告只使用检索摘要作线索
- 搜索摘要提示：“Tripo 提供免费方案……可以免费使用文本生成 3D 和图像生成 3D 功能”。
- 核对状态：本次没有把这段摘要当作完整条款；具体边界由 E2 当前定价页确定。
- 与 E2 的关系：两者不必矛盾。“能免费生成”可以成立，但须补上积分、公开模型、非商用和导出限制。

### E4 · 第三方免费额度口径只作交叉线索

- 来源：[Tooliverse 的 Tripo 页面](https://tooliverse.ai/tools/tripo)
- 出处类型：**元宝检索所得**（第 3 轮），来源日期 2026/10/21
- 搜索摘要提示：免费档 200 月度积分、约 13 个模型、公开且非商用，与当前官方定价摘要接近。
- 核对状态：本报告未将该第三方页面作为官方规则替代品；最终判断仍依据 E1、E2。

## 五、冲突与时间口径

1. **官方旧教程与当前定价额度不同**：元宝结果中的官方教程（来源日期 2026/03/10）摘要写“Free plan offers 300 credits per month”；当前官方定价页写 200。报告采用当前定价页作为查询时点的口径，并保留旧教程用于说明规则可能变化，不把两者拼成同一事实。
2. **“免费安装”与“免费使用”表面冲突**：E1 已解释，它们描述不同动作，不构成真正的规则冲突。
3. **Studio 与 API 额度混用**：E1 明确两者分开计费，因此不能用 Studio 免费积分推断 API 插件调用免费。
4. **第三方文章只作旁证**：转载、评测或旧价格不替代当前官方条款；第三方与官方冲突时应保留日期和产品入口差异。

## 六、限制条件

- 额度：免费 Studio 每月 200 积分；实际可生成数量随功能、复杂度和附加设置变化。
- 商用：免费档为公开模型、非商用；商用权利应按实际输出、计划和最新条款复核。
- 版本：Bridge 需要 Blender 4.1+、Windows/macOS，并对 Studio 浏览器有要求。
- 产品入口：Studio Bridge 与 API 插件是不同链路，费用和密钥不通用。
- 时间：动态价格、额度和限免活动可能变化；本报告只对应上述查询与访问时点。
- 地区：本次未核查所有地区的币种、税务、产品可用性或差异化条款。

## 七、仍不能确定

- 未逐一核查所有 Tripo 插件、所有 API 操作和每种导出格式的具体积分价格。
- 未读取任何用户账户，不确认个人账户余额、历史赠送权益或实际订阅状态。
- 当前官方页面未提供清晰发布日期，无法仅凭页面判断每项规则的确切生效时间。
- 本报告不是法律意见；具体商业项目仍需核对适用的服务协议、输入素材权利和输出内容。

## 八、复核与导出

网页案卷：<http://127.0.0.1:4191/?case=01>。该链接用于本机演示，刷新可加载，不触发新搜索。

当前结论为 AI 查证草案。只有在网页人工复核区填写复核人、结论和说明并明确确认后，导出才会标为“已人工复核”；本报告交付时仍保持“尚未人工复核”。
