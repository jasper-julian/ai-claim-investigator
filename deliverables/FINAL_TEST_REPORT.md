# 最终验收报告

测试日期：2026-10-24（北京时间 UTC+8，最后一轮修复于 23:45 前后完成）
项目目录：`/Users/gongao/Documents/waytoagi/detective`
运行环境：macOS 26.6（25G72）、Node.js v22.22.2、npm 10.9.7、Chrome（本机 `/Applications/Google Chrome.app`）、ffmpeg 9.0.1
服务地址：`http://127.0.0.1:4191/`（仅本机监听，未部署公网）

> 说明：本报告区分「真实外部调用」「真实浏览器回放」「离线模拟测试」三类证据。离线测试使用合成的协议样本，只证明代码行为，不作为元宝外呼成功的证明。

## 1. 结论

| 检查项 | 结果 | 证据 |
|---|---|---|
| 离线自动化测试 | **通过** 31/31，0 失败 | 2026-10-24 23:47 UTC+8 执行 `npm test` |
| 浏览器真实页面验收 | **通过** 76/76，0 控制台错误 | 2026-10-24 23:47 UTC+8，`deliverables/ui-test-report.json` |
| 判定语义回归（证据不足 ≠ 不适用） | **通过** 4 项新测试 + 4 项浏览器断言 | 第 5 节 |
| 新问题真实查证（Skill 闭环） | **通过** 3/3 轮成功，生成并保存证据卡 | 请求 ID 见第 6.1 节 |
| 主演示视频 | **已完成** 3 分 22 秒，1280×720，H.264 | `docs/videos/ai-claim-investigator-demo.mp4` |
| 三个案例视频 | **已完成** 各约 30 秒 | `docs/videos/query-01..03.mp4` |
| 真实开发对话导出 | **已完成** 40 条可见消息 | `docs/conversation/workbuddy-conversation-export.md` |
| 真实用户试用 | **尚无真人试用** | 未招募外部用户，不虚构反馈 |

## 2. 离线自动化测试

```sh
cd /Users/gongao/Documents/waytoagi/detective
npm test        # 2026-10-24 23:47 UTC+8，Node v22.22.2
```

结果：`# tests 31 / # pass 31 / # fail 0`（较上一版 27 项新增 4 项）。

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
- 本机生成案卷保存、刷新读取、拒绝凭据字段与错误 CSRF；
- **新增语义回归**：公司项目 → `insufficient`（说明中不含“禁止/冲突”定性）；明确要求 IP indemnity/SAML SSO 或已由组织提供 Copilot → `does_not_apply`；写了“已付费/已有付费计划”的需求不被误判；新卡四个示例覆盖 `applies / insufficient / insufficient / does_not_apply`。

## 3. 浏览器真实验收

脚本：`scripts/validate-ui.mjs`（Playwright 驱动本机 Chrome，headless，桌面 1440×1050 与移动 390×844）。

结果：**76 项断言全部通过**，`consoleErrors: []`，`passed: true`。

逐项结果（摘要）：

- 案例 01/02/03：独立链接加载、3 轮真实记录、请求 ID 可见、来源链接 `target=_blank` 且为 https、条件卡 3 项承诺、条件来源 ≥3 条可点击；
- 每个案例的三个需求示例分别得到 `applies` / `does_not_apply` / `insufficient`，且 `data-searched=false`；
- Case 01 输入“紫色主题皮肤”→ `out_of_scope`，提示需再次查证；
- 三次案例回放调用 `/investigate` 次数为 **0**；
- 本机生成案卷（Copilot）独立链接可加载、刷新、导出文件名含案卷号、导出保持 `unreviewed`；
- **Copilot 案卷语义**：点“公司项目”→ `insufficient` 且页面不出现“至少一项已核实条件与你的需求冲突”；填“要求 IP indemnity 与 SAML SSO”→ `does_not_apply` 且说明引用官方缺项；“个人学习”→ `applies`；全程 `data-searched=false`；
- `/?case=99` 提示无效且不触发搜索；
- Markdown/JSON 实际触发浏览器下载并落盘；
- 390px 无横向溢出；无脚本或 CSP 错误。

## 4. 本轮修复的三个问题

### 4.1 证据不足被判成“条件冲突”

原 `evidence/live/copilot-free-card.json` 的 `org-project` 规则对“公司项目”直接返回 `fail`，页面对
“我要在公司项目里用 Copilot 写代码，团队没有采购付费计划，想直接用免费版。”输出
**“至少一项已核实条件与你的需求冲突”**。但卡内的官方原文只说明“免费档面向未通过组织或企业获得 Copilot 的个人开发者”，并列出免费档缺少的企业保障，**没有**禁止在公司项目中使用。

修复后把三件事分开：

| 规则 | 官方原文依据 | 判定 |
|---|---|---|
| `org-project` 公司/团队项目 | 只说明适用人群，未涉商用许可 | `unknown` → 页面显示**证据不足以判断**，并要求另行查证 |
| `enterprise-guarantee` 明确要求 IP indemnity / 企业级安全 / SAML SSO / 组织策略 / 审计 | 定价页明确 `Not included` | `fail` → **条件不适用**（直接冲突） |
| `org-provided` 已通过组织获得 Copilot | 文档：仅面向未通过组织或企业获得 Copilot 的个人 | `fail` → **条件不适用**（不符合适用人群） |
| `chat-quota` 每月对话次数 | 现行页面无固定数字 | `unknown` → **证据不足** |

同时给 `src/evidencecard.js` 增加 `detailText`，让“未知”项使用独立说明，不再借用 `failText`；页面文案仍是“已核实资料没有覆盖其中一项需求”，不会写成“冲突”。

同类检查：`card-01` 的 API 与 Blender Bridge、`card-02` 的 CLI 原本只要出现关键词就判 `fail`。现在把“已单独付费购买 API”“已有 Pro/Max/Team 计划”“已订阅/已购买付费版”排除，避免把“用户愿意付费”误判成“条件冲突”。

### 4.2 录屏中证据卡生成步骤的标注不准确

原 `scripts/record-demo.mjs` 从磁盘读取预生成卡，把卡与本次新检索记录一起保存，字幕却称“Skill 读取这份检索记录……生成证据卡”。实际上没有录到 Skill 针对当次记录现场分析的过程。

修复：

- 删除“把预生成卡当作本次检索结果保存”的步骤，改为打开 Skill 先前保存的案卷；
- 字幕改为“**载入 Skill 先前生成的证据卡（本段为回放）**”，并注明该卡对应 22:45 的检索记录与官方原文、请求 ID 见案卷、不是录制时现场生成；
- 卡片与当前案卷记录核对一致：卡内三条承诺引用的 `T1/T2/T3` 来源、日期与案卷 `rounds` 中的请求 ID 对得上；
- 修正“先打字幕再跳转导致字幕被页面刷新清掉”的脚本缺陷，官方文档段改用跳转后注入字幕。

### 4.3 开发对话未导出

`workbuddy.md` 原只有摘要。现从本项目会话文本流导出 `docs/conversation/workbuddy-conversation-export.md`：
2026-10-24 19:21:57—23:32:05（UTC+8），用户实际发言 5 条、助手可见回复 35 条，共 40 条；
排除系统注入、30 条后台任务通知、工具调用与原始返回、内部推理、2 条上下文压缩摘要与 1 条系统续接提示；
家目录、邮箱与令牌模式已脱敏。`workbuddy.md` 顶部已建索引，并保留“摘要≠完整记录”的说明。

## 5. 语义回归实测（本地，无新搜索）

对 `save-cc091f7fc1ca` 实际执行：

| 需求 | 结果 | 依据 |
|---|---|---|
| 我只做个人学习，每月最多 300 次补全，不需要对话，也没有公司提供的 Copilot。 | `applies` | 补全额度 ≤2000；个人定位不冲突 |
| 我要在公司项目里用 Copilot 写代码，团队没有采购付费计划，想直接用免费版。 | `insufficient` | 官方未就商用许可给出结论，缺项不等于禁止 |
| 我每月需要 500 次对话，补全用量很小，想知道免费版够不够。 | `insufficient` | 现行页面无固定对话条数 |
| 公司要求提供 IP indemnity 和 SAML SSO，才能用于公司项目里的代码。 | `does_not_apply` | 官方明确写免费档不含这些保障 |
| 公司已经给我开通了 Copilot 企业版，我还想用免费版补足额度。 | `does_not_apply` | 不符合免费档适用人群 |
| 我只想知道界面有没有紫色主题皮肤。 | `out_of_scope` | 超出证据范围，要求再次查证 |

全部 `searched=false`，未输出真假概率。

## 6. 真实元宝调用记录

### 6.1 Skill 查证（生成证据卡，案卷 `save-cc091f7fc1ca`）

- 时间：2026-10-24 22:40:35—22:40:37 UTC+8
- 说法：GitHub Copilot 免费版每月提供 2000 次代码补全和 50 次对话，个人开发者可以免费使用。
- 域名：`github.com`（通过 `Site` 参数）
- 结果：三轮均 `success`，共 21 个去重来源

| 轮次 | 请求 ID |
|---|---|
| 找宣传原句与官方说明 | `adcf20bf-4432-4bbc-92a4-bd1254239111` |
| 核对商用、功能 | `283b2407-5ae0-4ca7-8848-6f83f0d9f393` |
| 找反例与例外 | `7fefe0a8-6fb6-4408-8f2e-72e7bf955b8b` |

原始记录：`evidence/live/copilot-free.json`；证据卡：`evidence/live/copilot-free-card.json`（3 项承诺、5 条条件 T1—T5）。

### 6.2 主视频前段的现场查询（本轮新增 3 次）

- 时间：2026-10-24 23:33:27 UTC+8，`outcome=success`
- 请求 ID：`726d8c1f-3170-4780-8b74-263472410c8e`、`5f523fd3-0280-4f5b-88dd-359e0f7c76e4`、`d33588cf-eb4b-4ffa-95d4-22a68ce9b8c3`
- 原始记录：`evidence/live/copilot-free-recording-run.json`
- 该次查询**不用于生成证据卡**，只用于演示网页真实检索与“原始检索案卷”状态。

### 6.3 历史记录（不重复消耗）

- 2026-10-24 22:47 的演示录制曾用同一问题检索 3 次（`52cb8fac-…`、`31c5849a-…`、`fd9a8eae-…`），记录保留在 `evidence/live/copilot-free-demo-run.json`。
- 更早的 Canva、Notion 查询与三次参评案例均为当日真实调用，见 `deliverables/TESTING.md`。

## 7. 视频重录与核验

| 文件 | 时长 | 规格 | 大小 | SHA256 |
|---|---|---|---|---|
| `ai-claim-investigator-demo.mp4` | 3:22（202.03s） | 1280×720 / H.264 / 30fps / yuv420p / tv | 7,635,287 B | `a289ec6f…dfa704e` |
| `query-01.mp4` | 30.27s | 同上 | 1,495,597 B | `baa88db7…72972e` |
| `query-02.mp4` | 30.53s | 同上 | 1,489,825 B | `df0dd509…70ab7de` |
| `query-03.mp4` | 32.73s | 同上 | 1,473,031 B | `215763b3…417389` |

结构：00:00—00:39 现场真实检索（3 次外呼）；00:39—02:16 载入 Skill 案卷回放（卡片、官方原文、四种需求、导出）；02:16—02:49 案例 02 与 Markdown；02:49—03:22 边界说明与条件来源。

核验：`ffprobe` 参数一致；`ffmpeg -f null` 完整解码无错误；`blackdetect` 无 ≥1 秒黑屏；抽帧 10 个时点均为实际页面且字幕可读；无音轨。旧版主视频（3:14，`869d4e21…`）已作废，不再引用。

## 8. 真实与模拟的边界

- 真实：第 6 节三组 SearchPro 调用、Notion 与 Canva 的历史真实调用、GitHub 官方页面的直访、浏览器中的实际渲染与下载。
- 真实回放：`/?case=01..03`、`/?case=save-cc091f7fc1ca` 展示的是当日真实查询记录与已保存证据卡，视频与页面均标注“历史真实查询回放”“载入先前生成的证据卡”。
- 模拟：`npm test` 中的协议样本由测试构造，用于验证解析、错误分类与安全校验，不代表外部服务当时的状态。
- 未伪造：没有把搜索摘要写成已读全文；指定域名零命中未改写成命中；人工复核未自动勾选；没有把复用的证据卡说成针对某次新查询现场生成。

## 9. 剩余限制

- 网页没有独立大模型后端，新查询只产出原始检索案卷；承诺拆解、原文阅读与条件卡必须由 WorkBuddy Skill 完成。
- 适用判断只回答“已核实条件是否覆盖需求”。官方没有写明的维度返回证据不足，不把缺项推导成禁止；但这也意味着“公司项目能否用免费版”仍取决于组织政策与许可条款，作品不给统一答案。
- 免费档对话条数、AI credits 具体数值会随官方页面变化，卡片只对 2026-10-24 的页面负责。
- 本轮新增 **3 次**元宝请求（主视频现场演示）；上一阶段累计 12 次，未再重复调用。
- 未做并发压力、长时间稳定性、多用户与云端部署测试。
- 尚无真人试用反馈；未部署公网；未执行正式提交、社交发布或法律声明勾选。

## 10. 产物清单

- 主视频：`docs/videos/ai-claim-investigator-demo.mp4`（3:22，1280×720，H.264，7.3 MB）
- 案例视频：`query-01.mp4`、`query-02.mp4`、`query-03.mp4`
- 证据卡：`evidence/cards/card-01..03.json`、`evidence/live/copilot-free-card.json`、Notion 卡 `deliverables/exports/live-notion-card.json`
- 导出：`deliverables/exports/case-01..03.*`、`generated-case.json`、`demo-export.json`、`demo-export.md`
- 截图：`deliverables/screenshots/`（案例、需求变化、生成案卷、封面、录制抽帧）
- 开发对话：`docs/conversation/workbuddy-conversation-export.md`
- 测试记录：`deliverables/ui-test-report.json`、`deliverables/TESTING.md`
