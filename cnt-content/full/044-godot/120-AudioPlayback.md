---
order: 120
title: 音频播放
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 区分三种音频播放节点，理解总线音量与音高，掌握播放结束信号的准确行为
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related: ['godot/110-AnimationAndTween', 'godot/130-ExportingProjects']
prerequisites: ['godot/110-AnimationAndTween']

音效与音乐承担了游戏一半的氛围，但 Godot 的音频系统模型其实非常直白：音频数据装在 AudioStream（音频流）资源里，播放器（Player）节点负责把它放出来。真正的难点在两处：面对三种播放器节点选哪个，以及 finished 这类信号的准确行为到底是什么。本篇就围绕这两点展开，最后用一个"背景音乐加随机脚步声"的实战把它们串起来。

## 学习目标

- 分清 AudioStreamPlayer、AudioStreamPlayer2D、AudioStreamPlayer3D 的适用场景；
- 掌握 stream、volume_db、pitch_scale、bus、max_polyphony 等核心属性的行为；
- 说清 play、stop、seek 与 finished 信号的准确语义；
- 会用 AudioStreamRandomizer 做随机音效；
- 了解 Web 平台的音频限制，并完成一个 BGM 循环加随机脚步的组合示例。

## 三种播放节点：按空间关系选

- AudioStreamPlayer：非位置音频播放器，声音不分方位与远近，背景音乐（BGM）和 UI 音效用它；
- AudioStreamPlayer2D：2D 位置播放器，根据节点在 2D 世界中的位置计算左右声像与音量衰减——声音在角色左边就偏左耳，离得越远越小。挂在角色、怪物、发声物体上；
- AudioStreamPlayer3D：3D 位置播放器，提供完整的 3D 定位，支持混响总线；多普勒（Doppler）效果需要手动启用。它还提供按渲染帧（Idle）或物理帧（Physics）更新的选项，物体移动越快，越应该选择与物理同步的更新方式，否则定位计算跟不上运动。

一个常用的配套机制：Area2D 与 Area3D 区域可以把区域内播放器的声音重定向到指定总线。典型用法是"水下区域"：角色带着自己的播放器走进 Area2D，声音被转到经过滤波的水下总线，出区域再转回来，全程不用改播放器本身。

## AudioStreamPlayer 的核心属性

- stream：要播放的 AudioStream 资源。注意：修改它会立刻停止当前播放；
- volume_db：以分贝为单位的音量；另有 volume_linear，接受 0 到 1 的线性值并由引擎换算成分贝，做音量滑条时直接用它更直观；
- pitch_scale：音高倍率，默认 1；2.0 正好升高一个八度。配合随机化可以做出千变万化的脚步与打击声；
- playing：反映当前是否正在播放；autoplay：勾选后进入场景自动播放；
- bus：输出总线（bus）名称，默认 &"Master"。要留意：把它设成一条不存在的总线时不会报错，而是静默回退到 Master——总线名拼错了声音照常出，问题被悄悄藏起来；
- max_polyphony：最大复音数，默认 1。调大后同一个播放器可以同时叠放多个声音（比如连发的枪声），超出数量时切断最旧的声音；
- stream_paused：暂停音频流，恢复后从中断处继续。

## 播放控制与 finished 信号

四个核心方法：play(from_position: float = 0.0) 从指定秒数开始播放；stop() 停止；seek(to_position) 跳转到指定位置；get_playback_position() 查询当前播放位置。

两个行为细节必须咬文嚼字。第一，重复调用 play() 是从头重播，不是继续播放——想接着播，要么别乱调 play()，要么用 stream_paused 暂停后再恢复。第二，finished 信号只在音频自然播完时发出；手动调用 stop()，或节点退出场景树，都不会发出 finished。这意味着靠 finished 串联"播完一首自动换下一首"的播放列表是可靠的；但如果别处还会 stop() 这条音频，就不能指望 finished 来做收尾逻辑。

## 音频资源：格式与随机化

音频数据以 AudioStream 资源的形式存在，常用格式三种都能导入：WAV、Ogg Vorbis、MP3。一般经验是音效切片用 WAV，音乐用 Ogg 或 MP3，具体导入参数见官方音频流文档。

AudioStreamRandomizer（随机音频流）是做自然感音效的利器：它本身也是一个 AudioStream，内部收录多条音频流，每次播放随机挑一条，还能为每条设置随机音高与音量范围。脚步声、打击声这类高频重复的音效，靠它一个节点配置就能告别"复制粘贴感"。

## Web 平台的音频

导出到 Web 时有两点特殊。一是播放方式：4.3 起默认使用 Sample 播放模式，延迟更低。二是浏览器的自动播放限制：页面加载后不允许直接出声，必须等用户与页面发生第一次交互（点击、按键）之后，音频才能启动。所以 Web 版的 BGM 要设计成"点击开始游戏"之后再播放，而不是进页面就响。

## 实战：BGM 循环与随机脚步声

组合前面的知识，做一个最常见的配置：一首循环播放的背景音乐，加一套随机脚步声。

```gdscript
extends Node2D

@onready var bgm: AudioStreamPlayer = $BGM
@onready var footstep: AudioStreamPlayer = $Footstep

func _ready() -> void:
    # finished 只在自然播完时发出，正好用来循环 BGM
    bgm.finished.connect(bgm.play)
    bgm.play()

func _on_player_stepped() -> void:
    # Footstep 节点的 stream 使用 AudioStreamRandomizer：
    # 每次播放随机挑一条流，并可带随机音高与音量
    footstep.play()   # 重复调用是重播，对脚步声正合适
```

两点说明：BGM 的循环没有依赖任何循环标志，而是把 finished 连接到 play()，自然播完自动重来；脚步声每次 play() 都从头播，正是短音效想要的行为。如果角色移动很快、脚步密集，可以把 Footstep 的 max_polyphony 调大，让连续的脚步声自然重叠而不是互相打断。

## 易错点清单

- 给 stream 赋值会立刻停止当前播放，切换曲目时别忘了这一点；
- bus 指向不存在的总线会静默回退 Master，总线名拼错不报错；
- 重复调用 play() 是重播，不是继续；
- finished 在手动 stop() 与节点退出场景树时都不发出；
- pitch_scale 为 2.0 才是一个八度；
- Web 平台必须等首次用户交互后才有声音。

## 小结

音频系统的选择逻辑一句话：有没有空间属性决定用哪种 Player，其余都是 AudioStreamPlayer 的属性题。四条行为背下来能避开九成 bug：stream 一改就停、bus 拼错静默回退、play 重复即重播、finished 只认自然播完。想让音效自然，交给 AudioStreamRandomizer 的随机挑流与随机音高；想让声音跟着场景走，交给 2D/3D 播放器加区域总线重定向。

## 参考链接

- [音频流（Audio Streams）](https://docs.godotengine.org/en/stable/tutorials/audio/audio_streams.html)
- [AudioStreamPlayer 类文档](https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer.html)
- [AudioStreamPlayer2D 类文档](https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer2d.html)
- [AudioStreamPlayer3D 类文档](https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer3d.html)
