# world.execute(me); · 如果爱是一条指令

一支由浏览器实时绘制的 Canvas 动画 MV。九个 AI 产品的人格化形象是同一个程序借来的身份：它不断改变自己以维持连接，最终清空界面，却再次等待回应。

画面不是预录视频播放器，而是时间 `t` 的确定性函数。同一时间点始终生成同一帧，因此播放、跳转、审片和逐帧导出共用同一套渲染代码。

原版使用 DeepSeek V4.1 Flash 辅助制作；v3 由 GPT-6 Astra 修订剧情、分镜与动画。作品是对 Mili《world.execute(me);》的非商业同人视觉演绎，不代表官方剧情、翻译或品牌合作。

九个形象按顶部起点顺时针排列：DeepSeek → GPT → Claude → Grok → Kimi → Gemini → 智谱 GLM → 千问 → 豆包。间奏展示与结尾使用同一顺序。

## 版权与素材归属

| 内容 | 位置与分发情况 | 权利说明 |
| --- | --- | --- |
| Mili 歌曲录音与歌词 | `original/`、`assets/` 与生成的 `index.html` 不随公开仓库分发 | 歌曲、录音、歌词的权利归 Mili 及相关版权方 |
| 中文歌词意译 | 本地 `original/translation.json`，生成到 `assets/translation.js`；不随公开仓库分发 | 基于原歌词的衍生翻译，用于本片字幕，并非官方译文 |
| 歌曲转写 MIDI | 本地 `original/*.mid`；不随公开仓库分发 | 不主张歌曲、转写素材的权利；转写来源与许可须分别确认 |
| 人物素材及闭眼处理版本 | `art/girl-*.jpg`；当前仓库实际包含这些文件 | 素材来源标注为 ai-girls / ZipZipPipe「AI 娘化」；相关插画权利归各自原作者。豆包使用现有官方卡通头像，不是本项目原创立绘 |
| 产品标识与名称 | `art/mark-*.jpg`；当前仓库实际包含这些文件 | 商标与相关美术权利归各厂商；展示不表示官方合作或认可 |
| 动画代码、流程脚本与文档 | `src/`、`_build/`、`_tools/` 等 | 仓库未设置 `LICENSE`，不据此宣称已有正式开源许可 |
| 导出视频、封面与复核图片 | 本地 `dist/`；不随公开仓库分发 | 同时包含第三方素材，其权利不会因本项目渲染或修改而转移 |

本项目为非商业同人创作，不主张歌曲、人物和商标的所有权。署名或注明非商业用途不等于获得使用、上传或再分发许可；公开仓库也不会自动授予第三方素材的版权。`art/` 已包含素材，不能将本仓库描述为“不含第三方素材”。

English: This fan work does not claim ownership of Mili's song or lyrics, the MIDI transcription, the portraits, or the product marks. Audio, lyric inputs, generated lyric data and video outputs are excluded from the public repository. Portraits and product marks **are included** under `art/`; attribution is not a redistribution license. This repository has no `LICENSE` file.

## 当前叙事与画面

开场是人与程序的聊天界面，保留到间奏开始。随后，同一个程序借九种外形与能力接近对方。离开后的未回应消息碎成满屏记忆；反复的 EXECUTION 分散增加，TRAPPED 在固定囚笼中随音符变速、变大。程序擦去自己借来的界面后，执行警报中重新浮现开场对话，停在等待回应。

一般镜头保留一个主要人物，减少重复头像、背景代码和调试读数；中英文字幕按原歌词时间显示。英文关键词完整出现，不再依赖短句中的音符数量才能打完。

v3 重写了 75 个歌词镜头的动作。点集聚成空间、圆周离开自身围住对方、切线托起对方；紫色茄子、红色番茄、琥珀虎斑猫分别给予养分、保护和呼噜。改变电流、性别与角色都作用于同一条连接。“学会爱”回收前面的四种尝试，推导完成而回复仍为空；对方离开后，心形回路只剩自己。

## 目录

```text
index.src.html       页面骨架
build.js             音频、MIDI、LRC 与可选中文翻译构建
_build/              输入解析与分镜绑定
original/            本地歌曲、歌词、MIDI、可选 translation.json
assets/              本地生成的节奏、歌词、人格与字幕数据
src/                 确定性 Canvas 动画与播放器
art/                 现有九个形象、产品标识与闭眼素材
_tools/check.js      18 组检查
_tools/review.js     浏览器逐幕与接缝渲染
_tools/contact_sheet.py  复核联系表
_tools/cover.py      两种比例分别排版的封面
_tools/cover_duel.py 双主角“龙娘怒改大肥鱼”封面
_tools/export.js     逐帧取图并导出视频
_tools/verify_export.py  导出文件、时间戳与抽帧对照
HANDOFF.md           当前设计与复现说明
BILIBILI.md          标题、简介与上传素材位置
dist/                成片、封面与复核产物（不进公开仓库）
```

## 复现

自备并确认可使用的三个输入，放入 `original/`：`Mili - world.execute (me) ;.mp3`、`world.execute (me) ;.mid`、`timeline.lrc`。LRC 必须与 `_build/scenes.js` 的分镜吻合，构建会检查。

中文翻译是可选的。提供 `original/translation.json` 时，以 scene id 为键、中文字符串为值，覆盖全部非空歌词 cue；未提供时构建空翻译表并显示英文。

```powershell
npm install
npm run build
npm run check
node _tools/export.js --pipe=png --workers=6 --crf=15 --preset=slow --ffmpeg="<ffmpeg 路径>" --out=dist/world-execute-me_v3_1600x900_30fps.mp4
```

构建后双击本地 `index.html` 播放；浏览器可能需要一次点击才允许播放音频。导出需要 Node.js 20+、Chrome 或 Edge，以及含 libx264/AAC 的 FFmpeg。浏览器路径会自动检测，也可用 `--chrome="<路径>"` 或环境变量 `CHROME_PATH` 指定。

审片工具由 `npm install` 安装 Playwright。封面、联系表和成片复核另需 Python 3.10+；依赖记录在 `requirements-dev.txt`。

```powershell
python -m pip install -r requirements-dev.txt
npm run review
python _tools/contact_sheet.py dist/review-v3-final
python _tools/cover.py
python _tools/cover_duel.py
```

画面以 `t` 重建，MIDI 只供节奏，LRC 只供文字时序；播放与导出共享合成器。当前视频为 1600×900、30 fps；4K 不在本轮导出范围。原视频与原封面仍保留在本地。
