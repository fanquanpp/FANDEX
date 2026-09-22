---
order: 90
title: 音频与视频
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 用 play queue stop 三条语句控制音乐音效与语音，了解音频通道与视频播放
author: fanquanpp
updated: '2026-09-22'
related:
  - 'renpy/030-ImagesSceneShowAndTransitions'
  - 'renpy/100-SaveLoadAndRollback'
prerequisites:
  - 'renpy/030-ImagesSceneShowAndTransitions'
---

声音负责情绪，画面负责信息。Ren'Py 把音频控制在剧本层做成了三条语句：play、queue、stop，配合通道（channel）概念覆盖音乐、音效与语音的全部需求；视频则通过 movie_cutscene 与 Movie displayable 支持过场动画、动态立绘与动态菜单背景。本篇讲清这套系统的概念与写法。

## 学习目标

- 知道 Ren'Py 支持哪些音频格式；
- 理解通道概念：music、sound、audio、voice 四个通道各自的定位；
- 会用 game/audio 目录与 audio 命名空间简化文件引用；
- 熟练使用 play、stop、queue 三条语句及其子句（fadeout、fadein、loop、if_changed、volume）；
- 理解视频的编解码与容器选择，会用 movie_cutscene 与 Movie displayable。

## 支持的音频格式

```text
Opus
Ogg Vorbis
MP3
MP2
FLAC
WAV（仅支持未压缩的 16 位 PCM）
```

素材准备阶段建议统一转成 Opus 或 Ogg Vorbis，体积与兼容性都比较稳妥。

## 通道：音频的组织单位

Ren'Py 用通道管理同时存在的多路声音。默认提供两个普通通道：

- music：音乐通道，播 BGM；
- sound：音效通道，播 UI 音、环境音。

普通通道一次只播放一个文件，新文件顶掉旧文件。此外还有两个特殊通道：

- audio：可以同时叠加播放多个文件，谁也不顶掉谁，适合多轨环境音与密集音效；但它的每个文件播完即止，不支持 queue 与 stop 语句；
- voice：语音通道，由语音系统自动播放与停止，玩家可以在偏好界面单独调节它的音量。

默认通道不够用时，可以用 renpy.music.register_channel 注册自己的新通道（细节见官方文档）。

## 音频目录与 audio 命名空间

play 与 queue 引用文件时的查找顺序是：先在 game/ 目录下找，找不到再到 game/audio/ 目录（含其子目录）找。

放置在 game/audio 下的音频文件还有一项福利：受支持扩展名的文件会自动进入 audio 命名空间——文件名去掉扩展名、强制小写后，成为一个可直接使用的变量名（因此必须是合法的 Python 变量名）。若两个文件去掉扩展名后重名，按路径的字母顺序取第一个。于是播放可以省掉引号和路径：

```renpy
play music illurock
```

不在 game/audio 下的文件也可以手动注册进命名空间：

```renpy
define audio.sunflower = "my_music/sun-flower-slow-jam.ogg"
```

之后同样可以写 play music sunflower。

## play、stop、queue 三条语句

### play：立即播放

```renpy
play music "mozart.ogg"
play sound "woof.mp3"
play music [ "a.ogg", "b.ogg" ] fadeout 1.0 fadein 1.0
```

play 后跟通道名与文件；文件也可以是列表，按顺序作为播放队列。可用子句：

- fadeout 秒数：淡出旧曲目，省略时使用 config.fadeout_audio 的默认值；
- fadein 秒数：新曲目淡入；
- loop 或 noloop：是否循环；
- if_changed：要播的曲子与当前正在播的相同，就不重新开始——循环 BGM 的场景切换反复 play 也不会被打断；
- volume 0.5：本句的播放音量。

音效叠加用 audio 通道，可以连续多条同时响：

```renpy
play audio "sfx1.opus"
play audio "sfx2.opus"
```

### stop：停止

```renpy
stop sound
stop music fadeout 1.0
```

stop 后跟通道名，可带 fadeout 淡出后停止。

### queue：排队

```renpy
queue music "next.opus"
```

queue 把文件排到当前曲目的后面，播完自动接续。语义上，每次交互开始后的第一条 queue 语句会先清空队列再入队，保证排队的意图以最新一次为准。

### 为什么用语句而不是函数

renpy.music 模块也提供了等价的 Python 函数，但官方建议用语句：写了 play 与 queue 语句，Lint 会检查引用的音频文件是否存在，素材缺失在发布前就能被发现。

还有一个与存档相关的福利：Ren'Py 保存的内部状态里包含"正在播放的音乐"。也就是说玩家读档后，BGM 会自动恢复到存档时刻正在播的曲目，不需要你手工记录与重放。

## Quick Start 的完整示例走读

官方快速入门把这几条语句串成了一段典型流程：

```renpy
play music "audio/illurock.ogg"

play music "audio/illurock.ogg" fadeout 1.0 fadein 1.0

queue music "audio/next_track.opus"

stop music

play sound "audio/effect.ogg"

pause

pause 3.0
```

- 第一句立即开始播 BGM；
- 第二句演示带淡出淡入的切换：旧曲 1 秒淡出、新曲 1 秒淡入，比硬切柔和；
- 第三句把下一首排进队列，当前曲自然播完后无缝接续；
- stop music 结束音乐；play sound 在 sound 通道打一发音效；
- 最后的 pause 与 pause 3.0 是剧本语句：pause 等玩家点击，pause 3.0 等 3 秒，给音效留出被听见的时长。

## 视频：格式与全屏过场

视频部分先记编解码与容器。Ren'Py 支持的编解码：AV1、VP9、VP8、Theora、MPEG-4 part 2、MPEG-2、MPEG-1；容器：WebM、Matroska、Ogg、AVI。官方建议商用游戏使用 AV1/VP9/VP8/Theora 视频，配 Opus/Vorbis 音频，装在 WebM/Matroska/Ogg 容器里——MPEG 系列涉及专利授权，商用要留意。

全屏播放过场动画用 movie_cutscene：

```renpy
$ renpy.movie_cutscene("opening.webm")
```

视频全屏播完（或被玩家点击跳过）后剧本继续；若播放被用户中断，函数返回 True，可以据此决定后续分支。

## Movie displayable：动态立绘与菜单背景

视频也可以像图片一样被显示，这就是 Movie displayable：

```renpy
image eileen movie = Movie(play="eileen_movie.webm", side_mask=True)

show eileen movie
e "I'm feeling quite animated today."
hide eileen
```

把 image 绑定到 Movie，之后 show/hide 照常用法操作，立绘就"动"了起来。参数 side_mask=True 启用左右并排掩码（side mask）：视频画面一分为二，左半是正常彩色画面，右半是对应的灰度掩码，引擎用掩码把左半画面抠出透明背景——因为解码器不支持带 alpha 通道的视频，透明动态立绘必须走这条掩码路线。

动态菜单背景同理：

```renpy
image main_menu = Movie(play="main_menu.ogv")
screen main_menu:
    add "main_menu"
    textbutton "Start" action Start() xalign 0.5 yalign 0.5
```

image 语句把 Movie 绑成名为 main_menu 的 displayable，同名屏幕里 add "main_menu" 把它铺作背景，按钮浮在视频之上。

## 小结

- 支持格式：Opus、Ogg Vorbis、MP3、MP2、FLAC 与仅限未压缩 16 位 PCM 的 WAV。
- 通道：music 与 sound 一次一文件；audio 通道可叠加多文件但不支持 queue/stop；voice 由语音系统管理、可在偏好中调音量；新通道用 renpy.music.register_channel 注册。
- game/audio 下的受支持文件自动进入 audio 命名空间：去扩展名强制小写、须是合法变量名、重名按路径字母序取第一；也可 define audio.名字 = "路径" 手动注册；play/queue 先查 game/ 再查 game/audio/。
- play 立即播放（列表按序、子句 fadeout/fadein/loop/noloop/if_changed/volume）；stop 停止；queue 排队且每次交互后的第一条 queue 先清空队列；用语句而非函数可让 Lint 检查缺失文件。
- 视频：编解码支持 AV1/VP9/VP8/Theora/MPEG-4 part 2/MPEG-2/MPEG-1，容器 WebM/Matroska/Ogg/AVI，商用建议 AV1/VP9/VP8/Theora 加 Opus/Vorbis 加 WebM/Matroska/Ogg；movie_cutscene 全屏过场，被中断返回 True。
- Movie displayable 让视频成为可 show/hide 的图像：side_mask 左右并排掩码实现透明动态立绘，add 进屏幕可做动态菜单背景；解码器不支持 alpha 通道视频。

## 参考链接

- [音频（Audio）](https://www.renpy.org/doc/html/audio.html)
- [视频（Movie Displayable）](https://www.renpy.org/doc/html/movie.html)
- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
- [存档、读档与回滚](https://www.renpy.org/doc/html/save_load_rollback.html)
