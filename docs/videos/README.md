# 演示视频

录制日期：2026-10-24（北京时间 UTC+8）。录制主体：Playwright 驱动本机 Chrome 的真实渲染页面（Chromium 无头浏览器，1280×720 视口），不是静态截图拼接。字幕为页面内叠加层，无配音，未加速、未删改失败片段。

## 文件

| 文件 | 时长 | 分辨率 / 编码 | 大小 | SHA256 | 类型 |
|---|---|---|---|---|---|
| `ai-claim-investigator-demo.mp4` | 3:22（202.03s） | 1280×720 / H.264 (yuv420p) / 30fps | 7,635,287 B | `a289ec6f69e82f02cc740f17a3d47bd408c6b6299f7bfb9f64df0b108dfa704e` | 现场真实检索 + 已保存案卷回放 + 历史案例回放 |
| `query-01.mp4` | 30.27s | 1280×720 / H.264 / 30fps | 1,495,597 B | `baa88db725bfde123b41c97fb8a2212a489350d3bd9021d33ba123c20772972e` | 历史真实查询回放 |
| `query-02.mp4` | 30.53s | 1280×720 / H.264 / 30fps | 1,489,825 B | `df0dd509a99687b3b89dacfe58ffb0ca77105659dbfcdafbd346fe8da70ab7de` | 历史真实查询回放 |
| `query-03.mp4` | 32.73s | 1280×720 / H.264 / 30fps | 1,473,031 B | `215763b3024f57436a1c1b3f5bd38d68880c16f48c36edbb1d14003595417389` | 历史真实查询回放 |

下载：

- 主视频（GitHub 直接下载，7.3 MB）：<https://raw.githubusercontent.com/jasper-julian/ai-claim-investigator/main/docs/videos/ai-claim-investigator-demo.mp4>
- 仓库内文件：`docs/videos/ai-claim-investigator-demo.mp4`、`docs/videos/query-01..03.mp4`
- **Release：未创建**。当前环境没有 GitHub API 凭据（无 `gh` 登录、无 token），SSH 只能推 git 对象。视频已作为仓库普通文件提供，可直接下载观看；无需为形式补建 Release。

## 主视频结构与剪辑说明

主视频由四段**连续录制**拼接，未加速、未替换画面：

1. **00:00—00:39 现场检索（真实外呼）**：输入说法、需求与官方域名 → 点击“开始查证” → 三轮元宝 SearchPro（请求 ID `726d8c1f-3170-4780-8b74-263472410c8e`、`5f523fd3-0280-4f5b-88dd-359e0f7c76e4`、`d33588cf-eb4b-4ffa-95d4-22a68ce9b8c3`，2026-10-24 23:33 UTC+8）→ 展开来源 → 显示“本次是原始检索案卷，尚未生成条件证据卡”。这次检索的原始记录保存在 `evidence/live/copilot-free-recording-run.json`。
2. **00:39—02:16 载入案卷回放**：打开 `/?case=save-cc091f7fc1ca`，字幕明确写“载入 Skill 先前生成的证据卡（本段为回放）”。该卡由 WorkBuddy Skill 于 2026-10-24 22:45 基于 `evidence/live/copilot-free.json` 的三轮真实检索与直访官方原文生成，**不是**针对第 1 段那次新查询现场生成。随后直访 GitHub Docs 官方页面核对原文，回到案卷依次演示四种需求结论与超范围提示，导出 JSON 并打开文件。
3. **02:16—02:49 补录**：案例 02 回放、导出 Markdown 证据卡并打开文件。
4. **02:49—03:22 补录**：网页与 Skill 的边界说明、条件来源链接。

四段为文件级拼接（ffmpeg concat），分辨率、编码一致；每段开头都有字幕说明当前片段性质。拼接点分别为 00:39、02:16、02:49。

**为什么第 1 段和第 2 段分开**：网页没有独立大模型后端，新查询只会得到原始检索案卷；证据卡必须由 AI 在 WorkBuddy 中按 Skill 阅读原文后生成并保存。把两段讲成同一次“现场自动生成”会夸大能力，因此本片把“真实检索”和“载入已生成卡”分开标注，并保留卡对应的请求 ID 供核对。

**未剪辑原片**：`deliverables/video-raw/live.webm`（第 1 段完整原片，23:33 录制）、`replay.webm`、`supplement.webm`、`extra.webm`（VP9）。这些文件只在本机保留，已通过 `.gitignore` 排除，**不作为 Release 或仓库附件提供**。

## 生成方式

```sh
# 录制（需要本机 Chrome 与隔离安装的 playwright-core，不属于作品运行依赖）
NODE_PATH=/Users/gongao/.workbuddy/binaries/node/workspace/node_modules \
  node scripts/record-demo.mjs --only=live       # 会消耗 3 次元宝搜索
  node scripts/record-demo.mjs --only=replay     # 不搜索，回放已保存案卷
  node scripts/record-demo.mjs --only=supplement # 不搜索
  node scripts/record-demo.mjs --only=extra      # 不搜索
  node scripts/record-demo.mjs --only=cases      # 不搜索，三段案例回放

# 转码（H.264 MP4，faststart，统一 tv range）
ffmpeg -ss 0 -t 39.4 -i deliverables/video-raw/main.webm \
  -i deliverables/video-raw/replay.webm \
  -i deliverables/video-raw/supplement.webm \
  -i deliverables/video-raw/extra.webm \
  -filter_complex "[0:v]fps=30,scale=1280:720:in_range=full:out_range=tv,setsar=1,format=yuv420p[v0];..." \
  -map "[out]" -c:v libx264 -crf 22 -pix_fmt yuv420p -color_range tv -movflags +faststart \
  docs/videos/ai-claim-investigator-demo.mp4
```

说明：第 1 段来自 23:33 那次 `--only=main` 录制的前 39.4 秒（当时 `main` 会连续录直播与回放）；后续为修正字幕时序改为一律“先跳转、后打字幕”，重录了回放、补录与边界三段，因此主视频由这四段拼成。

## 检查结果

- `ffprobe`：4 个文件均为 H.264、1280×720、30fps、`yuv420p`、`color_range=tv`，完整解码无错误；
- `blackdetect`：主视频无 ≥1 秒的黑屏段；
- 抽帧检查：00:01、00:30、00:40、00:50、01:10、01:40、02:10、02:40、03:10、03:21 均为实际页面内容，文字可读，字幕未被裁切；
- 无音轨，因此没有音频可听性检查项；
- 单文件均小于 500 MB（最大 7.3 MB）。

录屏过程中没有展示密钥、`.local/config.json`、Authorization 头或其他私人窗口；页面只显示本机 `127.0.0.1` 服务与公开网页。
