# world.execute(me); — 一次修订

一支网页动画 MV：画面**不是一个被播放的文件，而是被算出来的**——同一秒永远得到同一帧，
拨动时间轴回来是同一个画面。双击 `index.html` 即可播放（不装依赖、不构建、不起服务器、不联网）。

---

## 版权与归属（明确标注 · RIGHTS AND ATTRIBUTION）

这个仓库里**混着三种东西**，权利归属完全不同。公开分发前请逐条看清：

| 内容 | 位置 | 权利归属 | 本仓库的做法 |
| --- | --- | --- | --- |
| 歌曲《world.execute(me);》的**录音** | `original/*.mp3` | 词曲与录音版权归 **Mili** 及其发行方。**非本仓库所有。** | **不随仓库分发**（`.gitignore` 排除）；复现时请自备 |
| **歌词**（LRC 与全部逐字时间戳） | `original/timeline.lrc`、`assets/cues.js`、`assets/lrc-embed.txt`、构建产物 `index.html` 内嵌副本 | 歌词版权归 **Mili** / 版权方。 | 同上：**不随仓库分发**，随仓库提供的是"怎么把它读进来"的代码 |
| **MIDI**（卡的来源） | `original/*.mid` | 由歌曲转写而来，非本仓库所有。 | 同上：**不随仓库分发** |
| **借来的九张立绘** | `art/girl-*.jpg`（含 `-blink` 版） | 来自 **ai-girls / ZipZipPipe「AI 娘化」** 项目，版权归原作者。 | 片中以"**借来的身份**"展示并署名；**再分发前请先确认原作者许可** |
| **九个产品标识** | `art/mark-*.jpg` | DeepSeek / GPT / Claude / Grok / Kimi / Gemini / 智谱 GLM / 千问 / 豆包 的官方标识，**商标归各自厂商**。 | 片中是"身份证"，不是本作品的美术；不主张任何权利 |
| **片子本身** | `src/`、`_build/`、`_tools/`、`index.src.html`、`build.js`、文档 | 本作品自己的代码与文字。 | 见下方"代码的使用" |

**一句话**：这是一件**非商业的同人作品**。它引用别人的歌、别人的脸、别人的商标来谈论这些东西，
并且把每一次引用都写在画面上；它**不声称拥有任何一项**。要把它公开（或再分发），必须：
去掉音频与歌词、给立绘与标识署名、并保留本节。

**English, one paragraph.** This is a non-commercial fan work. The song, its lyrics and the MIDI
belong to Mili and their rights holders; the nine portraits are fan art from the ai-girls /
ZipZipPipe project; the nine marks are the trademarks of their respective companies. **None of
them are included in this repository**, and nothing here claims any right over them. Redistribute
only with attribution and only after checking each right holder's terms.

## 代码的使用

`src/` / `_build/` / `_tools/` 是为这部片子写的：确定性内核、版图式绘图内核、17 组自我断言、
以及"按 `t` 取帧"的导出器。**看、学、借用其中的做法都可以**（注明出处即可）；
要正式的开源许可，请与作者确认后再加 `LICENSE`——本仓库刻意**没有**替作者预先声明一个许可证。

## 目录

```
index.html          构建产物：双击即播（内嵌歌词副本，故不进公开仓库）
index.src.html      页面骨架
build.js            三个输入 -> assets/ + index.html（带交叉校验）
original/           三个输入（音频/LRC/MIDI）——见上方版权section，不随仓库分发
_build/gen.js       自写的 SMF 读取器 + MPEG 逐帧行走 + LRC 绑定
assets/             生成物：onsets / waveform / cues / personas
src/                片子本身（00_core … 60_app）
_tools/             check.js（17 组断言）· export.js（出片）· scoretable.js / whydeaf.js /
                    sweep.js / sheet.html（诊断与出图）· stub.js / probe.js
HANDOFF.md          这本片子的说明书：设计、铁律、每一处改动的理由与旋钮
dist/               成片（不进公开仓库）
```

## 复现

```powershell
$node = "<你的 node>"
& $node build.js          # 三个输入 -> assets/ + index.html
& $node _tools\check.js   # 17 组断言
& $node _tools\export.js --workers=6   # 出片（参数见 HANDOFF.md）
```

自备音频：把同名 mp3 放进 `original/`，再把对应的 LRC 放进去，构建即可复现全部读数。
