# 最终验收报告

测试日期：2026-10-24（北京时间 UTC+8）
项目目录：`/Users/gongao/Documents/waytoagi/detective`
运行环境：macOS 26.6（25G72）、Node.js v22.22.2、npm 10.9.7、Chrome（本机 `/Applications/Google Chrome.app`）、ffmpeg 9.0.1
服务地址：`http://127.0.0.1:4191/`（仅本机监听，未部署公网）

> 说明：本报告区分「真实外部调用」「真实浏览器回放」「离线模拟测试」三类证据。离线测试使用合成的协议样本，只证明代码行为，不作为元宝外呼成功的证明。

## 1. 结论

| 检查项 | 结果 | 证据 |
|---|---|---|
| 离线自动化测试 | **通过** 27/27，0 失败 | 2026-10-24 22:39 UTC+8 执行 `npm test` |
| 浏览器真实页面验收 | **通过** 71/71，0 控制台错误 | 2026-10-24 22:56 UTC+8，`deliverables/ui-test-report.json` |
| 新问题真实查证（Skill 闭环） | **通过** 3/3 轮成功，生成并保存证据卡 | 请求 ID 见第 4 节 |
| 主演示视频 | **已完成** 3 分 14 秒，1280×720，H.264 | `docs/videos/ai-claim-investigator-demo.mp4` |
| 三个案例视频 | **已完成** 各约 30 秒 | `docs/videos/query-01..03.mp4` |
| 真实用户试用 | **尚无真人试用** | 未招募外部用户，不虚构反馈 |

## 2. 离线自动化测试

命令与时间：

```sh
cd /Users/gongao/Documents/waytoagi/detective
npm test        # 2026-10-24 22:39 UTC+8，约 0.43s
```

结果：`# tests 27 / # pass 27 / # fail 0`。

覆盖范围：

- SearchPro `Pages` 为 JSON 字符串、去重、无效 URL、HTML 摘要清洗；
- `Site` 参数、密钥仅出现在 `Authorization` 头、不进入请求体；
- 官方错误、鉴权失败、额度不足、零结果与网络失败不混同，失败后停止后续轮次；
- 说法与需求参数校验、非法域名校验；
- 检索计划随需求变化，不是固定三轮关键词；
- `/?case=01` 页面、案例读取、无效案例不触发搜索；
- 错误 `Origin`、错误 `CSRF Token`、错误 `Content-Type` 不触发搜索；
- 导出含请求 ID、状态、`Site`、来源日期、AI 引用与不确定性；
- 未明确确认时人工复核状态始终 `unreviewed`；
- 证据卡 ≤3 项承诺、条件来源可打开、三种需求结论与超范围判断；
- 本机生成案卷保存、刷新读取、拒绝凭据字段与错误 CSRF。

## 3. 浏览器真实验收

脚本：`scripts/validate-ui.mjs`（Playwright 驱动本机 Chrome，headless，桌面 1440×1050 与移动 390×844）。

结果：**71 项断言全部通过**，`consoleErrors: []`，`passed: true`。

逐项结果（摘要）：

- 案例 01/02/03：独立链接加载、3 轮真实记录、请求 ID 可见、来源链接 `target=_blank` 且为 https、条件卡 3 项承诺、条件来源 ≥3 条可点击；
- 每个案例的三个需求示例分别得到 `applies` / `does_not_apply` / `insufficient`，且 `data-searched=false`；
- Case 01 输入“紫色主题皮肤”→ `out_of_scope`，提示需再次查证；
- 三次案例回放调用 `/investigate` 次数为 **0**；
- 本机生成案卷（Copilot 演示案卷）独立链接可加载、刷新、导出文件名含案卷号、导出保持 `unreviewed`；
- `/?case=99` 提示无效且不触发搜索；
- Markdown/JSON 实际触发浏览器下载并落盘；
- 390px 无横向溢出；无脚本或 CSP 错误。

## 4. 真实元宝调用记录（本轮新增）

### 4.1 Skill 查证（生成证据卡）

- 时间：2026-10-24 22:40:35—22:40:37 UTC+8
- 说法：GitHub Copilot 免费版每月提供 2000 次代码补全和 50 次对话，个人开发者可以免费使用。
- 需求：我在公司项目里写代码，想知道免费版能不能用于商业开发，是否限制团队或组织使用。
- 域名：`github.com`（通过 `Site` 参数）
- 结果：三轮均 `success`，共 21 个去重来源

| 轮次 | 请求 ID |
|---|---|
| 找宣传原句与官方说明 | `adcf20bf-4432-4bbc-92a4-bd1254239111` |
| 核对商用、功能 | `283b2407-5ae0-4ca7-8848-6f83f0d9f393` |
| 找反例与例外 | `7fefe0a8-6fb6-4408-8f2e-72e7bf955b8b` |

原始记录：`evidence/live/copilot-free.json`

### 4.2 演示视频中的现场查询（同一问题）

- 时间：2026-10-24 22:47:02—22:47:03 UTC+8，`outcome=success`
- 请求 ID：`52cb8fac-58be-4db0-bd9c-cfce17525f6a`、`31c5849a-fe69-4475-9f21-fb2853c7f5e3`、`fd9a8eae-7e6a-45d7-9ff9-02a6aa9487a9`
- 该次查询的原始记录：`evidence/live/copilot-free-demo-run.json`
- 保存后的案卷：`save-e4aa6cf73922`（`/?case=save-e4aa6cf73922`）

## 5. 本轮新增的真实 Skill 闭环结果

证据卡：`evidence/live/copilot-free-card.json`（3 项承诺、5 条条件 T1—T5）。

| 承诺 | 结论 | 依据 |
|---|---|---|
| 免费版每月 2000 次代码补全 | 有来源支持 | GitHub Docs：`Limited to 2000 completions per month on Copilot Free.`；定价页 `2,000 completions per month` |
| 免费版每月 50 次对话 | 尚不明确 | 2024-12-18 公告写 50 条；2026-10-24 页面只写 `Limited chat and agent usage` 与 AI credits，无固定数字 |
| 个人开发者可免费使用 | 有来源支持，附条件 | 文档：`Copilot Free plans are only available to individual developers who don't have access to Copilot through an organization or enterprise.` |

公司/商用维度：定价页显示免费档 `IP indemnity — Not included`、`Enterprise-grade security — Not included`、`User management in github.com — Not included`、`SAML SSO — Not included`。本次打开的官方页面既没有明确允许、也没有明确禁止商业使用，因此卡片把“公司项目”判为**条件不覆盖（does_not_apply）**，而不是“官方禁止商用”。

需求重算实测（本地，无新搜索）：

| 需求 | 结果 |
|---|---|
| 个人学习，每月最多 300 次补全，不需要对话，没有公司提供的 Copilot | `applies` |
| 在公司项目里用 Copilot 写代码，团队没采购付费计划 | `does_not_apply` |
| 每月需要 500 次对话 | `insufficient`（当前官方无固定数字） |
| 只想确认有没有紫色主题皮肤 | `out_of_scope`，要求再次查证 |

## 6. 本轮修复

1. `skills/yuanbao-claim-investigator/scripts/investigate.mjs` 的 nonce 正则要求 `<script nonce="…">`，与页面实际的 `<script type="module" nonce="…" src="/app.js">` 不符，导致**任何 Skill 新查证都会直接失败**并报“本机查证服务版本不兼容”。已改为 `<script[^>]*\snonce="([a-f0-9]+)"`，修复后新查证成功（见 4.1）。
2. 页面页脚“本机预览”改为“本机运行”，与实际交付状态一致。
3. `docs/videos/README.md` 原写“尚未录制”，已替换为真实文件、参数与哈希。
4. 清理了验证过程中产生的重复测试案卷（`save-7a63c5f09470`、`save-9f3ce2444b97`），保留与视频对应的 `save-e4aa6cf73922`；原始检索记录仍保留在 `evidence/live/`。

录制脚本 `scripts/record-demo.mjs` 在开发中出现过两个字幕/取 nonce 的实现错误，已修复；它属于录制工具，不影响产品运行。

## 7. 真实与模拟的边界

- 真实：第 4 节两组 SearchPro 调用、Notion 与 Canva 的历史真实调用、GitHub 官方页面的直访、浏览器中的实际渲染与下载。
- 真实回放：`/?case=01..03` 展示的是 2026-10-24 当天的真实查询记录，视频与截图标注为“历史真实查询回放”，不是现场新发起。
- 模拟：`npm test` 中的协议样本由测试构造，用于验证解析、错误分类与安全校验，不代表外部服务当时的状态。
- 未伪造：没有把搜索摘要写成已读全文；指定域名零命中未改写成命中；人工复核未自动勾选。

## 8. 剩余限制

- 网页没有独立大模型后端，新查询只产出原始检索案卷；承诺拆解、原文阅读与条件卡必须由 WorkBuddy Skill 完成。
- 免费档对话条数、AI credits 具体数值会随官方页面变化，卡片只对 2026-10-24 的页面负责。
- 本轮共新增 **12 次**元宝请求（Skill 查证 3 次 + 三次演示录制各 3 次，其中两次录制因脚本缺陷作废但查询本身成功），正好用满 12 次预算，未超额。
- 未做并发压力、长时间稳定性、多用户与云端部署测试。
- 尚无真人试用反馈。
- 未执行官网正式提交、社交平台发布或法律声明勾选。

## 9. 产物清单

- 主视频：`docs/videos/ai-claim-investigator-demo.mp4`（3:14，1280×720，H.264，7.2 MB，SHA256 `869d4e21…8015a1`）
- 案例视频：`query-01.mp4`、`query-02.mp4`、`query-03.mp4`
- 证据卡：`evidence/cards/card-01..03.json`、`evidence/live/copilot-free-card.json`、Notion 卡 `deliverables/exports/live-notion-card.json`
- 导出：`deliverables/exports/case-01..03.*`、`generated-case.json`、`demo-export.json`、`demo-export.md`
- 截图：`deliverables/screenshots/`（案例、需求变化、超范围、生成案卷、录制抽帧）
