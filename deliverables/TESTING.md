# 测试结果

测试日期：2026-10-24。测试不包含任何真实密钥；离线测试使用明确标记的合成协议样本，真实案例与新增查询单独记录。

## 1. 离线自动化

命令：`npm test`

结果：**27/27 通过，0 失败**。

覆盖：

- SearchPro JSON 字符串 Pages、去重、无效 URL 和 HTML 摘要清洗；
- Site 参数、密钥只在 Authorization 头、不进入请求体；
- 官方错误、鉴权失败、零结果与网络失败不混同；
- 查询参数和非法域名校验；
- 动态检索计划随“具体需求”改变，不是固定三轮关键词；
- `/?case=01` 页面、案例读取、无效案例不触发搜索；
- 错误 Origin、错误 CSRF Token、错误 Content-Type 不触发搜索；
- 导出包含请求 ID、查询状态、Site、来源日期、AI 引用和不确定性；
- 未明确确认或信息不完整时，人工状态始终为 `unreviewed`；
- 文件名按案例区分，额外密钥字段不会进入导出；
- 配置页不包含其他项目设置；
- 三张条件证据卡均不超过 3 项承诺，且条件来源均为可打开的 https 链接；
- 三个案例的需求示例分别得到 `applies`、`does_not_apply`、`insufficient`，需求重算 `searched=false`；
- 超出现有条件的维度返回 `out_of_scope` 并要求再次查证；
- 需求长度、空白与缺字段校验，facet 识别；
- 本机生成案卷可保存、刷新读取，并拒绝凭据字段与错误 CSRF。

首次运行曾发现 2 项测试需要适配新错误对象及 URL 规范化行为，修正断言后全部通过；没有把失败测试删除或跳过。新增证据卡与本机案卷测试后，测试数从 18 增至 27。

## 2. 浏览器真实页面回放

脚本：`scripts/validate-ui.mjs`，本机 Chrome，1440px 桌面与 390px 移动端。

结果：**71/71 检查通过**，详见 `ui-test-report.json`。

- 三个独立案例均加载三轮记录、请求 ID 和可点击来源；
- 每个案例均加载条件证据卡、3 项承诺和可点击条件来源；
- 每个案例的三个需求示例分别得到 `applies` / `does_not_apply` / `insufficient`，且 `data-searched=false`；
- Case 01 填入“紫色主题皮肤”后得到 `out_of_scope`，页面明确要求再次查证；
- 三次回放调用 `/investigate` 的次数为 0；
- 本机生成案卷 `/?case=save-4789ff258808` 独立链接可加载、可刷新，保留 3 轮真实查询与 22 个去重来源；
- 本机生成案卷导出文件名含案卷号，含证据卡、需求与适用判断，且保持 `unreviewed`；
- 刷新 `/?case=02` 仍回到 Case 02；
- `/?case=99` 清楚提示，且不触发调查；
- Markdown 和 JSON 实际触发浏览器下载并保存；
- 默认均未标记人工复核；
- 390px 页面无横向溢出；
- 最终无页面脚本或 CSP 控制台错误。

首轮浏览器验证发现 favicon 404 控制台错误，已用内嵌空 favicon 修复并重新跑通。浏览器退出时，沙箱曾阻止 Chrome 清理其自身临时文件；这不属于页面断言失败，最终报告已写入 `passed: true`，项目测试没有删除或修改这些个人/系统临时文件。

## 3. 真实新问题验证

时间：2026-10-24 11:34:59—11:35:01 UTC。

问题：Canva 免费版生成的内容是否都可以商用？指定 `canva.com`。

结果：**三轮 SearchPro 均成功，`outcome=success`**。请求 ID：

1. `0b5def9f-825c-4178-b7b1-8247c9cbace3`
2. `22d9daa8-2c2e-49b5-8d1a-2d5eda3b621e`
3. `e355bb5a-848e-4f79-8ae8-33f97bf0e74a`

输出：`exports/live-validation.json`；截图：`screenshots/live-validation.png`。它证明新问题走通真实检索流程。该输出尚无 AI 深查草案，也未人工复核，不能当成已经完成的商用法律结论。

## 4. Skill 实际运行

命令：`node skills/yuanbao-claim-investigator/scripts/investigate.mjs --case 01 --output deliverables/exports/skill-case-01.json`

结果：成功读取 Case 01，输出 26 个去重来源，`searchRequests=0`，三轮状态均成功。Skill 新增要求已覆盖拆命题、实际打开原文、记录访问状态与摘录、比较冲突、保留失败和不确定性；没有把三轮摘要直接称为 AI 报告。

## 5. 创新闭环：需求驱动检索与证据卡（真实运行）

### 5.1 真实新问题与动态检索

时间：2026-10-24 11:52—11:53 UTC（查询记录见 `exports/live-card-workflow.json`）。

问题：“Notion AI 免费版是否支持商用？”；官方域名 `notion.com`；需求：“我每月使用 100 次，只需个人非商业用途，不需要 API。”

结果：**三轮 SearchPro 均成功**，请求 ID：

1. `a4ded514-cb34-433a-b8e0-a6e731dedd17`
2. `8c2679f6-9c1a-4085-98ed-d61254be069d`
3. `64a2dce0-2208-4f86-b1d0-9bd2f0bfaf43`

查询词由问题与需求共同决定（原文/官方说明、额度与商用条件、反例与例外），不是固定模板。该次新查询在网页上**没有**生成证据卡，页面显示“本次是原始检索案卷，尚未生成条件证据卡”，导出 `evidenceCard:null`，没有伪造 AI 结论。

### 5.2 AI 证据卡与条件

基于上述真实检索记录，并由 WorkBuddy 直访 Notion 官方定价页与帮助页（核查时间 2026-10-24 11:55 UTC）后生成 `exports/live-notion-card.json`：

- 3 项承诺：Free 含 AI 有限试用（部分成立）、Free 有持续每月 100 次额度（未知）、试用输出可用于客户商业项目（未知）；
- 5 条结构化条件 T1—T5，含原文摘录、出处类型 `direct_official`、来源链接与来源日期；
- 明确写出官方页面未公布 Free 的每月固定次数、未明确商业授权，因此两项保持“证据不足”。

### 5.3 需求改变后的重新判断（不搜索）

在 `/?case=save-4789ff258808` 中实际点击三个示例需求：

| 需求 | 结果 | 是否重新搜索 |
|---|---|---|
| 只做个人非商业记录，无固定用量，不需要 API | `applies` | 否（`data-searched=false`） |
| 每月必须使用 100 次，且不购买付费计划 | `insufficient` | 否 |
| 把免费试用输出用于客户商业广告 | `insufficient` | 否 |
| 只想确认有没有紫色主题皮肤 | `out_of_scope`，要求再次查证 | 否 |

`does_not_apply`（条件不适用）由三张静态真实案例卡稳定覆盖，每张卡的示例 2 均得到该结果。Notion 卡没有为了凑结论而制造反驳：现有官方证据不足以支持“不适用”。

### 5.4 本机生成案卷

命令：

```sh
node skills/yuanbao-claim-investigator/scripts/save-card.mjs \
  --record deliverables/exports/live-card-workflow.json \
  --card deliverables/exports/live-notion-card.json
```

结果：生成 `save-4789ff258808`，写入 `.local/generated/`（目录 0700、文件 0600），返回本机链接 `http://127.0.0.1:4191/?case=save-4789ff258808`。浏览器实测：3 轮真实查询、22 个去重来源、1 张证据卡、3 项承诺、5 条条件，刷新后仍可加载，导出 `AI宣传查证所-case-save-4789ff258808.json`，`humanReview.status=unreviewed`。

过程中修复了两个真实缺陷：`save-card.mjs` 参数解析未递增索引；页面 nonce 正则要求 nonce 后立即 `>`，与实际 `<script type="module" nonce="..." src="/app.js">` 不符。修复后才得到上述成功结果，没有绕过校验。

## 6. 尚未覆盖

- 未做云端多用户、并发压力或长期稳定性测试。
- 未对所有搜索结果逐一打开原文；参赛深查只对支撑主要判断的关键官方页面做了直访。
- 未测试每一种服务商错误码的真实触发，只用离线样本验证分类与停止逻辑。
- 未自动公开发布、报名或提交。
- 证据卡目前由 AI 助手按 Skill 生成并保存，网页本身不会自动生成卡；跨案例的自动条件抽取尚未实现。
