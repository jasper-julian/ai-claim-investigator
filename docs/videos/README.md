# 演示视频

录制日期：2026-10-24（北京时间 UTC+8）。录制主体：Playwright 驱动本机 Chrome 的真实渲染页面（Chromium 无头浏览器，1280×720 视口），非静态截图拼接。字幕为页面内叠加层，未使用配音。

| 文件 | 时长 | 分辨率 / 编码 | 大小 | SHA256 | 类型 |
|---|---|---|---|---|---|
| `ai-claim-investigator-demo.mp4` | 3:14（193.87s） | 1280×720 / H.264 (yuv420p) / 30fps | 7,621,179 B | `869d4e210f5c60767892ac0efed6159ef33e8f008272004fe3703844688015a1` | 现场真实查询 + 历史回放（分段标注） |
| `query-01.mp4` | 30.27s | 1280×720 / H.264 / 30fps | 1,495,597 B | `baa88db725bfde123b41c97fb8a2212a489350d3bd9021d33ba123c20772972e` | 历史真实查询回放 |
| `query-02.mp4` | 30.53s | 1280×720 / H.264 / 30fps | 1,489,825 B | `df0dd509a99687b3b89dacfe58ffb0ca77105659dbfcdafbd346fe8da70ab7de` | 历史真实查询回放 |
| `query-03.mp4` | 32.73s | 1280×720 / H.264 / 30fps | 1,473,031 B | `215763b3024f57436a1c1b3f5bd38d68880c16f48c36edbb1d14003595417389` | 历史真实查询回放 |

下载：

- 主视频 Release 附件（同时作为本仓库文件）：<https://github.com/jasper-julian/ai-claim-investigator/releases/latest>
- 仓库内文件：`docs/videos/ai-claim-investigator-demo.mp4`、`docs/videos/query-01..03.mp4`

## 主视频结构与剪辑说明

主视频由三段**连续录制**拼接，未做加速、未删除失败片段、未替换画面：

1. 00:00—02:08 主录：输入说法与需求 → 现场真实元宝检索（请求 ID `52cb8fac-…`、`31c5849a-…`、`fd9a8eae-…`）→ 展开来源 → 原始案卷（无证据卡）→ 保存本机案卷 → 证据卡 → 打开 GitHub 官方文档 → 三种需求结论 → 超范围提示 → 导出 JSON → 打开导出文件 → 案例 01/03 回放；
2. 02:08—02:41 补录：案例 02 回放与 Markdown 导出、打开导出文件；
3. 02:41—03:14 补录：网页与 Skill 的边界说明、条件来源链接。

三段之间为文件级拼接（ffmpeg concat），画面比例、分辨率一致；每段开头都有字幕说明当前片段性质。**未剪辑原片**为 `deliverables/video-raw/*.webm`（VP9），随 Release 附件 `demo-raw-recordings.zip` 提供，本地保留同一份。

现场查询与历史回放的区分：主视频前半段点击“开始查证”的那一刻是真实外呼（请求 ID 见上）；`/?case=01..03` 段落与 `query-0X.mp4` 是 2026-10-24 当天的历史真实查询回放，页面右上角与字幕均写明“历史真实查询回放”。

## 生成方式

```sh
# 录制（需要本机 Chrome 与隔离安装的 playwright-core，不属于作品运行依赖）
NODE_PATH=/Users/gongao/.workbuddy/binaries/node/workspace/node_modules \
  node scripts/record-demo.mjs --only=main      # 也可 --only=supplement / extra / cases

# 转码（H.264 MP4，faststart）
ffmpeg -i deliverables/video-raw/main.webm ... -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  docs/videos/ai-claim-investigator-demo.mp4
```

## 检查结果

- `ffprobe`：4 个文件均为 H.264、1280×720、30fps、`yuv420p`、`color_range=tv`，可正常解码；
- 抽帧检查：开头、中段、结尾均有实际页面内容，无黑屏、无空白；文字可读；
- 无音轨，因此没有音频可听性检查项；
- 单文件均小于 500 MB（最大 7.3 MB）。

录屏过程中没有展示密钥、`.local/config.json`、Authorization 头或其他私人窗口；页面只显示本机 `127.0.0.1` 服务与公开网页。
