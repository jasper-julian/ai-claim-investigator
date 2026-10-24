# WorkBuddy 实际开发记录（摘要）

日期：2026-10-24

> 本文是本次开发工作的**摘要**，不是完整对话导出，也不冒称完整聊天记录。真实开发对话仍保留在 WorkBuddy 会话中，之后可按产品能力另行导出。用户要求的当前模型选择未改变。

## 接手前的 Codex 基础

本次不是推倒重做。接手时已有：

- Node 原生本地服务器与 4191 端口；
- 元宝 SearchPro 适配、三步搜索、Site 参数、来源去重；
- 真实案例回放、证据复核、Markdown/JSON 导出初版；
- `evidence/case-01.json` 至 `case-03.json` 三次真实元宝查询，含时间、请求 ID 和结果；
- 案例中的 `analysis` 为 **Codex（AI 助手）**实际核对公开来源后生成的草案；
- `skills/yuanbao-claim-investigator` 初版；
- 5 项离线测试。

WorkBuddy 保留了真实记录、指定域名零命中、补充直访官方来源的标记和 Codex 贡献说明，没有改写成 WorkBuddy 原创，也没有用模拟响应替代真实证据。

## 本次 WorkBuddy 实际完成

1. 阅读官方规则、README、交接说明、源码、Skill 和三份真实证据，并查阅 SearchPro 官方接入文档。
2. 重构服务器为可注入依赖的 `createDetectiveServer`，保持原生 Node 和零项目依赖；支持带查询参数的 `/` 页面、独立案例 API、静态前端模块和明确错误状态。
3. 新增 `public/app.js`，实现 `/?case=01` 等链接、刷新恢复、无效案例拦截、案例加载、真实查询加载、失败/空结果、来源展开、移动端布局和独立链接。
4. 新增 `public/casefile.js`，统一 JSON/Markdown 导出：案例文件名、查询步骤、请求 ID、状态、Site、来源日期、AI 草案引用、出处类型和人工复核状态。
5. 将 AI 草案与人工复核分离。只有勾选确认且结论、复核人、说明完整时，导出才会写“已人工复核”。
6. 强化元宝错误分类：鉴权、资源/额度、未开通、限流、参数、HTTP、超时和网络失败；失败后停止后续请求，不伪装成零结果。
7. 扩充 Skill 闭环：先拆命题，再建立检索台账、打开关键原文、记录访问状态和原文摘录、交叉比较日期/版本/入口，最后输出限制、冲突与不确定性。明确禁止只转发三轮摘要。
8. 新增离线测试并实际运行，最终 **18/18 通过**。
9. 用本机 Chrome 实际验证页面并生成截图。最终浏览器回放 **21 项检查通过**；修复过 favicon 404。
10. 运行 Skill 的 Case 01 回放，得到 26 个去重来源，新增搜索请求为 0。
11. 用新问题“Canva 免费版生成的内容是否都可以商用？”实际完成三轮元宝查询，保存请求 ID、来源和截图，证明并非三个写死案例。
12. 补充直访 Tripo 当前定价与 Blender Bridge 官方原文，完成 `deliverables/deep-investigation-case-01.md`。其中保留 Codex 草案贡献，WorkBuddy 只声明本次实际补充核对。
13. 完善 README、SUBMISSION、测试说明和本摘要，准备不含 `.local/` 的交付包。没有发布、上传、报名或公开分享。

## 第二阶段：需求驱动的证据卡闭环

用户要求先完成真实链路，再实现 `INNOVATION_BRIEF.md` 中今天优先的闭环。WorkBuddy 的实际工作：

1. 新增 `src/evidencecard.mjs`：承诺（≤3）、条件、需求 facet 识别与确定性适用性评估。结果为 `applies` / `does_not_apply` / `insufficient` / `out_of_scope`，始终 `searched: false`，不输出真假概率。
2. 新增 `evidence/cards/card-01..03.json`：为三次真实案例各写 3 项承诺、带原文与来源日期的条件，以及三个需求示例；每张卡都能稳定得到三类结论。原始 `evidence/case-01..03.json` 未改写。
3. 改造 `src/yuanbao.mjs`：`investigationPlan(claim, domain, need)` 按需求维度生成检索词，不再是固定三轮关键词。
4. 改造前端：新增“02 / 你的具体需求”，渲染条件证据卡，支持改需求后本地重算，并明确显示“本次判断未发起新搜索”；新查询未生成卡时显示“原始检索案卷”，不伪造 AI 结论。
5. 新增 `src/case-store.mjs` 与 `POST /skill/cases`：把 Skill 完成的真实记录 + 证据卡保存为本机独立案卷（`save-<12 hex>`），目录 0700、文件 0600，拒绝凭据字段、校验同源与 CSRF。
6. 新增 `skills/.../scripts/save-card.mjs`，AI 完成证据卡后可一键保存为 `/?case=save-...`。
7. 真实运行：用 Notion AI 免费版商用问题完成三轮 SearchPro（请求 ID 见 `deliverables/TESTING.md`），网页如实显示“尚未生成条件证据卡”；随后直访 Notion 官方定价页与帮助页生成条件卡，保存为 `save-4789ff258808`。
8. 修复两个真实缺陷：`save-card.mjs` 参数解析未递增索引；nonce 正则要求 nonce 后立即 `>`，与实际带 `src` 的 script 标签不符。修好后保存与刷新验证才通过。
9. 离线测试扩至 **27/27 通过**；浏览器回放扩至 **71/71 检查通过**，含本机生成案卷加载、需求重算、超范围提示、导出与刷新。
10. 更新 README、SUBMISSION、TESTING 和本记录，重新打包源码。

未完成或未验证：证据卡仍需 AI 按 Skill 生成，网页不会自动抽条件；没有做跨案例条件抽取、云端持久化和多人并发；Notion 案例只覆盖单个新问题，不能代表所有产品。

## 第三阶段：最终修复、验收、录屏与 GitHub 交付

用户要求实际完成修复、验收、真实录屏和 GitHub 上传。WorkBuddy 的实际工作：

1. 重新核对规则与项目状态，发现并修复一个会阻断全部新查证的缺陷：`investigate.mjs` 的 nonce 正则只匹配 `<script nonce="…">`，与页面实际的 `<script type="module" nonce="…" src="/app.js">` 不符，导致 Skill 新查证必然报“本机查证服务版本不兼容”。修复后新查证成功。
2. 用新问题「GitHub Copilot Free 每月 2000 次补全和 50 次对话」完成真实 Skill 闭环：三轮元宝检索（请求 ID `adcf20bf-…`、`283b2407-…`、`7fefe0a8-…`），直访 GitHub 官方文档与定价页，写出 3 项承诺、5 条条件的证据卡，保存为本机案卷。
3. 验证四类需求结论：个人学习 `applies`、公司项目 `does_not_apply`、500 次对话 `insufficient`、紫色皮肤 `out_of_scope`，全部 `searched=false`。
4. 新增 `scripts/record-demo.mjs`，用 Playwright 录制真实浏览器（1280×720）操作：主演示 3:14，另有三段案例录屏。录制中出现并修复了字幕变量与 nonce 读取两个脚本问题；两次作废的录制消耗的搜索次数已如实计入预算。
5. 用 ffmpeg 合成、转码为 H.264 MP4，检查时长、分辨率、像素格式，抽帧确认无黑屏，计算 SHA256。
6. 重新运行离线测试 27/27、浏览器验收 71/71，写 `deliverables/FINAL_TEST_REPORT.md`。
7. 在 `.local/publish/repo` 克隆公开仓库，选择性同步 49 个文件后提交（`385a377`），使用 `id_ed25519_jasper_julian` 推送 main 与 tag `v1.0-submission`。默认 SSH 身份是另一个账号（`leyuansugar`），无写权限，已改用仓库所有者密钥，未改写历史、未 force push。
8. 生成 1600×1200 封面、`SUBMISSION_READY.md` 与 `deliverables/submission/` 清单，停在正式提交之前。

未完成：GitHub Release 未创建（本机没有 `gh` 登录或 API token，SSH 只能推 git 对象）；视频已作为仓库文件提供。未做真人试用、未部署公网、未发布社交动态、未提交比赛。

## 主要修改与新增文件

- 修改：`server.mjs`、`src/yuanbao.mjs`、`public/index.html`、`public/app.js`、`public/casefile.js`、`skills/yuanbao-claim-investigator/SKILL.md`、`skills/.../scripts/investigate.mjs`、`scripts/validate-ui.mjs`、`README.md`、`SUBMISSION.md`、`deliverables/TESTING.md`、`test/*.mjs`。
- 新增：`src/evidencecard.mjs`、`src/case-store.mjs`、`evidence/cards/card-01..03.json`、`test/evidencecard.test.mjs`、`skills/.../scripts/save-card.mjs`、`deliverables/exports/live-notion-card.json`、`deliverables/exports/live-card-workflow.json`、`deliverables/exports/generated-case.json`。
- 新增交付材料：`SUBMISSION.md`、`workbuddy.md`、`deliverables/` 下的截图、导出、深查报告与测试结果。

`evidence/case-01.json` 至 `case-03.json` 的原始事实记录未改写。配置页仍只属于侦探项目，没有加入其他项目设置。

## 实际结果与限制

- 本机地址：<http://127.0.0.1:4191/>；配置：<http://127.0.0.1:4191/settings>。
- 真实案例：`/?case=01`、`02`、`03`；新案卷：`/?case=save-e4aa6cf73922`（Copilot）、`/?case=save-4789ff258808`（Notion）。
- 公开仓库：<https://github.com/jasper-julian/ai-claim-investigator>，tag `v1.1-submission`（最终提交版本）。
- 网页没有独立大模型接口；新问题的 AI 深查必须由 Skill 驱动 AI 助手继续阅读原文，并用 `save-card.mjs` 保存后才有独立链接。
- 需求重算只匹配已核实条件，不搜索、不出概率；超范围会要求再次查证。
- GitHub Release 未创建（无 API 凭据）；演示视频已作为仓库文件提供，可直接下载。
- 浏览器退出时沙箱曾阻止 Chrome 清理自身临时文件，已在测试说明中如实记录；最终页面断言全部通过。
- 持续盯梢、截图识别、云端部署、真人试用和正式提交未实现或未执行。
