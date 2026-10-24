# AI 宣传查证所

WaytoAGI 1024 切磋大会侦探赛道作品：输入一句公开 AI 产品宣传，用**元宝搜索**寻找原始说明、限制条款和交叉来源，形成带时间、请求 ID、可点击出处和不确定性说明的查证案卷。

本选题面向使用 AI 工具的普通用户和创作者，不是官网限定题目。只研究公开产品信息，不查个人传闻或时政。

## 演示视频与快速入口

### 主演示视频（可直接播放）

https://github.com/user-attachments/assets/1b558e78-c714-4b59-a676-4f819362cb09

- 主演示视频（3 分 22 秒，1280×720，H.264）：[`docs/videos/ai-claim-investigator-demo.mp4`](docs/videos/ai-claim-investigator-demo.mp4)｜[直接下载（7.3 MB）](https://raw.githubusercontent.com/jasper-julian/ai-claim-investigator/main/docs/videos/ai-claim-investigator-demo.mp4)
- 三个真实案例录屏：[`query-01.mp4`](docs/videos/query-01.mp4)、[`query-02.mp4`](docs/videos/query-02.mp4)、[`query-03.mp4`](docs/videos/query-03.mp4)
- 录制时间、参数、SHA256、真实/回放标识与剪辑说明：[`docs/videos/README.md`](docs/videos/README.md)
- 三个案例（本机运行后打开）：`/?case=01`、`/?case=02`、`/?case=03`；新案卷 `/?case=save-cc091f7fc1ca`（Copilot Free）、`/?case=save-4789ff258808`（Notion AI）
- 深查报告：[`deliverables/deep-investigation-case-01.md`](deliverables/deep-investigation-case-01.md)
- 最终验收报告（离线/浏览器/真实查询逐项结果）：[`deliverables/FINAL_TEST_REPORT.md`](deliverables/FINAL_TEST_REPORT.md)
- 参赛提交包说明：[`SUBMISSION_READY.md`](SUBMISSION_READY.md)
- 开发记录：[`workbuddy.md`](workbuddy.md)（摘要）｜[真实对话导出](docs/conversation/workbuddy-conversation-export.md)（2026-10-24 19:21—23:32，含范围与脱敏说明）

## 快速启动

```sh
cd /Users/gongao/Documents/waytoagi/detective
npm start        # 打开 http://127.0.0.1:4191/
npm test         # 31 项离线测试，不访问外部搜索
```

视频中的「网页 → Skill → 证据卡」链路是两段：网页只做检索与案卷，条件卡由 WorkBuddy 加载 `skills/yuanbao-claim-investigator/SKILL.md` 后完成，再用 `save-card.mjs` 保存为本机案卷。主视频前段是现场真实检索，后段是对已保存案卷的回放；字幕明确写“载入 Skill 先前生成的证据卡”，不把回放讲成现场新查询，也不把复用的卡说成针对某次新查询现场生成。

## 已交付

- 本机网页案卷工具：新查询、按需求生成检索计划、三轮检索过程、来源去重与展开、失败/零结果、真实案例回放、人工复核、Markdown/JSON 导出。
- **条件证据卡闭环**：宣传原句 → 最多 3 项可验证承诺 → 带原文的条件（T1…Tn）→ 我的使用需求 → 适用结论。三张真实案例卡各自稳定给出“适用 / 条件不适用 / 证据不足”三种结果，且需求重算**不发起新搜索**。
- **“未知”不冒充“冲突”**：需求提到公司项目，但官方原文只说明适用人群与缺项、没有禁止商用时，结论返回“证据不足”；只有官方原文与用户明确要求（如 IP indemnity、SAML SSO、已由组织提供 Copilot）直接冲突时，才判“条件不适用”。
- 可运行的 `yuanbao-claim-investigator` Skill：指导 AI 拆承诺、按需求调用元宝、打开关键原文、写条件卡，并可把结果保存为本机独立案卷。
- 三次真实元宝查询：`evidence/case-01.json` 至 `case-03.json`，保留时间、请求 ID、结果及 Codex AI 草案；条件卡另存于 `evidence/cards/`，未改写原始记录。
- 三次案例截图、完整导出案卷、Case 01 深查报告和浏览器验证记录，位于 `deliverables/`。
- 额外真实新问题验证：Canva 免费版商用（只有原始检索案卷，没有 AI 证据卡）、Notion AI 免费版商用与 GitHub Copilot Free 商用/额度（两者都有请求 ID、证据卡和可刷新的本机案卷）。它们证明流程不依赖三个写死案例，也如实保留了“只做到检索”的中间状态。
- 主演示视频 + 三段案例录屏，参数与哈希见 `docs/videos/README.md`。
- 完整源码与脱敏证据随本仓库提供；可通过 GitHub 的 Code → Download ZIP 下载。个人 `.local/`、环境文件或密钥不随仓库发布。

**边界：网页没有独立大模型接口。** 网页负责元宝检索和案卷整理，不会把检索摘要自动冒充 AI 结论；新问题的 AI 深查由加载 Skill 的 AI 助手继续阅读原文并完成。已保存案例中的 `analysis` 是 Codex 核对公开来源后形成的草案，贡献说明未改写。

## 启动

要求 Node.js 22 或更新版本，无项目 npm 依赖，无需 `npm install`。

```sh
cd /Users/gongao/Documents/waytoagi/detective
lsof -nP -iTCP:4191 -sTCP:LISTEN
npm start
```

如果端口已经监听，先确认是否为本项目，不要重复启动。访问：

- 网页：<http://127.0.0.1:4191/>
- 独立配置：<http://127.0.0.1:4191/settings>
- 案例 01：<http://127.0.0.1:4191/?case=01>
- 案例 02：<http://127.0.0.1:4191/?case=02>
- 案例 03：<http://127.0.0.1:4191/?case=03>
- 本机生成案卷（Copilot Free 证据卡）：<http://127.0.0.1:4191/?case=save-cc091f7fc1ca>
- 本机生成案卷（Notion AI 证据卡）：<http://127.0.0.1:4191/?case=save-4789ff258808>

服务仅监听 `127.0.0.1`，尚未发布云端站点。

## 配置元宝搜索

程序按以下顺序读取服务 Key：

1. 环境变量 `TENCENTCLOUD_WSA_APIKEY`；
2. 本项目 `.local/config.json` 的 `apiKey` 字段。

也可打开 `/settings`，在本机填写自己的服务 API Key。连接验证会实际使用 1 次搜索。密钥不会出现在状态接口、网页、案卷导出或日志中，不要把密钥粘贴到聊天中。

官方接入文档：<https://cloud.tencent.com/document/product/1806/130615>。接口为 `POST https://api.wsa.cloud.tencent.com/SearchPro`，指定官方域名通过请求体 `Site` 参数发送，而不是只写 `site:` 查询运算符。活动额度请在官方控制台和赛道渠道确认。

`.local/`、`.env*` 已在 `.gitignore` 中排除，交付包也不包含这些文件。

## 使用流程

1. 输入 4—500 字公开产品说法，可选填 `example.com` 形式的官方域名。
2. **填写你的具体需求**（4—500 字，例如“我每月用 30 次，只做个人作品，不需要 API”）。检索词会按需求涉及的额度、商用、功能、地区等维度变化，不是固定三轮模板。
3. 网页依次执行“找原始出处、查限制与例外、交叉核对”，最多 3 次真实元宝搜索。
4. 查看每轮查询词、Site、状态、请求 ID、失败原因、来源日期和摘要；点击来源打开原文。
5. 已保存案例会显示条件证据卡：3 项承诺、带原文的条件、来源日期与核查时间。修改需求后点击“重新判断”，只对已核实条件重新匹配，页面明确写“本次判断未发起新搜索”；超出现有条件的维度会返回 `out_of_scope` 并要求再次查证。
6. 给来源添加人工复核标记。摘要只是线索，零结果不等于说法为假。
7. 新查询可复制“AI 深查任务”，交给加载 Skill 的 AI 助手；AI 必须继续打开关键原文，不可只转发摘要，完成证据卡后用 `save-card.mjs` 保存为本机独立案卷。
8. 在人工复核区填写结论、复核人和说明，并明确勾选确认后，导出才会标记“已人工复核”。否则始终保持“尚未人工复核”。
9. 导出 Markdown/JSON。文件名区分 `case-01` 与本机 `save-*` 案卷，内容包含完整查询台账、AI 草案引用、出处类型、来源日期、证据卡、需求、适用判断和人工状态。

案例链接覆盖已保存的 01—03 与本机生成的 `save-*` 案卷。无效编号会明确提示，且不会触发外部搜索。网页新查询默认不写入服务器，需在 Skill 完成后保存，或及时导出。

## 运行查证 Skill

先加载并遵循 `skills/yuanbao-claim-investigator/SKILL.md`，再执行脚本取证。

新调查：

```sh
node skills/yuanbao-claim-investigator/scripts/investigate.mjs \
  --claim '要查证的公开产品说法' \
  --domain '产品官方域名' \
  --need '我的具体使用需求，例如每月次数、是否商用、是否需要 API' \
  --output 'evidence.json'
```

把 AI 已完成、含真实检索与条件证据卡的结果保存为本机独立案卷（不发起搜索）：

```sh
node skills/yuanbao-claim-investigator/scripts/save-card.mjs \
  --record deliverables/exports/live-card-workflow.json \
  --card deliverables/exports/live-notion-card.json
```

`save-card.mjs` 只接受本机 `127.0.0.1:4191`，会先读取页面 nonce 再提交；服务端校验同源与 CSRF，拒绝含 `apiKey`、`authorization`、`secret`、`password`、`credential` 字段的案卷，写入 `.local/generated/`（目录 0700、文件 0600）。

真实案例回放（不消耗搜索）：

```sh
node skills/yuanbao-claim-investigator/scripts/investigate.mjs \
  --case 01 --output deliverables/exports/skill-case-01.json
```

脚本只负责检索与整理证据来源。AI 助手必须按 Skill 继续完成命题拆解、原文访问记录、限制与冲突比较、逐项引用和不确定性说明。无法打开原文时，只能将摘要作为线索并保持证据不足。

## 架构

- `server.mjs`：原生 Node HTTP 服务、路由、同源/CSRF 校验、单次查询串行控制、案例与本机 `save-*` 案卷读取；导出可注入依赖的测试服务器。
- `src/yuanbao.mjs`：SearchPro 适配、Site 参数、响应清洗、超时和鉴权/额度/限流错误分类、按需求 facets 生成检索计划。
- `src/evidencecard.mjs`：承诺/条件/需求模型、facet 识别、确定性适用性评估（不搜索、不出概率）。
- `src/case-store.mjs`：本机生成案卷校验、凭据字段拒绝与 0600 落盘。
- `src/settings.mjs`：本机配置与 0600 权限保存，不回传密钥。
- `public/`：无框架网页、案卷渲染、证据卡与需求重算、统一 Markdown/JSON 导出模块。
- `skills/yuanbao-claim-investigator/`：AI 深查流程与本机取证/保存脚本。
- `evidence/`：三次真实查询原始案卷与条件卡，不是模拟响应。
- `test/`：完全离线的协议、证据卡、导出和 HTTP 安全测试。
- `scripts/validate-ui.mjs`：可选 Playwright 浏览器验证、截图与真实新问题入口。

## 测试

```sh
npm test
```

当前 **31 项离线测试全部通过**，不访问外部搜索。覆盖参数、Site、错误分类、案例回放、动态检索计划、证据卡与三态适用结论、需求重算不搜索、“未知不判冲突”的语义回归、本机案卷保存与凭据拒绝、导出完整性、人工复核、同源/CSRF、密钥不回传和项目配置隔离。

浏览器验证结果见 `deliverables/ui-test-report.json` 与 `deliverables/TESTING.md`（76 项检查）。验证脚本需要本机 Chrome 和隔离安装的 `playwright-core`，不属于运行作品所需依赖；默认只回放，只有显式加 `--live` 才会消耗新搜索。

## 实际限制

- 固定三轮检索是取证起点，不保证每个问题都召回完整条款；检索词会随需求变化，但轮数上限仍为 3，AI 可在 Skill 中根据证据缺口继续补充调查并如实记录。
- 条件证据卡由 AI 助手按 Skill 生成：网页不会自动把检索摘要变成承诺卡。未生成卡时页面明确显示“原始检索案卷”，不伪造结论。
- 需求重算是**本地确定性匹配**，只判断已核实条件是否覆盖需求；它不验证新事实，超范围会要求再次查证。
- 官方原文没写明的维度返回**证据不足**，不把缺项当成禁止；例如“公司项目能否用免费版”仍取决于组织政策与许可，作品不给统一答案。
- 搜索摘要可能过时、截断或偏离问题；主要判断必须打开原文。动态价格和活动只对应查询时点。
- 指定域名零命中是覆盖不足，不能据此证伪。补充直访官方原文与元宝命中始终分开标记。
- 服务同一时间处理一份新调查；接口失败会停止后续轮次，避免鉴权或额度错误继续消耗请求。
- 未实现持续盯梢、截图识别、云端多用户、跨案例自动条件抽取或网页内大模型自动判决。
- 公开分享、正式报名和提交均未自动执行。侦探赛道奖项另有公开分享要求，请按官网最新规则操作。
