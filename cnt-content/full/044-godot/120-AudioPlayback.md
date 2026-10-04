---
order: 120
title: 音频播放
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 区分三种音频播放节点，理解总线音量与音高，掌握播放结束信号的准确行为
author: fanquanpp
updated: '2026-10-05'
related: ['godot/110-AnimationAndTween']
prerequisites:
  - 'godot/110-AnimationAndTween'
---

打开键盘编曲工具编趣 Quaver 的混音面板，你会看到一棵总线树：顶上是 Master 总线（挂了十段 EQ 与限制器），下面分 Music 与 Drum 两条汇集总线，再往下每条音轨都有自己独立的总线，各带音量、声像与效果。看起来很专业，但拆开看，这套结构的每一个零件都来自 Godot 最基础的三个播放节点和一条总线属性。本篇的目标是带你亲手搭一个缩小版：一条循环 BGM、一套随机脚步声、一个音量滑条，并把最容易踩坑的 finished 信号行为一次性搞清楚。

## 动手：先选对播放节点

Godot 的音频模型非常直白：音频数据装在 AudioStream 资源里，播放器节点负责把它放出来。第一个决策是三种播放器选哪个，按"声音有没有空间位置"分：

- AudioStreamPlayer：非位置音频播放器，声音不分方位与远近。BGM 和 UI 音效用它；
- AudioStreamPlayer2D：2D 位置播放器，根据节点在 2D 世界中的位置计算左右声像与音量衰减——声音在角色左边就偏左耳，离得越远越小。挂在角色、怪物、发声物体上；
- AudioStreamPlayer3D：3D 位置播放器，提供完整的 3D 定位，支持混响总线；多普勒（Doppler）效果需要手动启用。它还提供按渲染帧（Idle）或物理帧（Physics）更新的选项，物体移动越快，越应该选择与物理同步的更新方式，否则定位计算跟不上运动。

一个常用的配套机制：Area2D 与 Area3D 区域可以把区域内播放器的声音重定向到指定总线。典型用法是"水下区域"：角色带着自己的播放器走进 Area2D，声音被转到经过滤波的水下总线，出区域再转回来，全程不用改播放器本身。

场景搭建：根 Node2D 下放两个 AudioStreamPlayer，分别命名 BGM 与 Footstep。BGM 拖一首完整曲子到 stream 属性（音乐文件建议 Ogg 或 MP3），Footstep 的 stream 稍后配随机化。

## 动手：BGM 循环与随机脚步声

脚本挂根节点：

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

两点说明：BGM 的循环没有依赖任何循环标志，而是把 finished 连接到 `play()`，自然播完自动重来；脚步声每次 `play()` 都从头播，正是短音效想要的行为。如果角色移动很快、脚步密集，可以把 Footstep 的 max_polyphony 调大，让连续的脚步声自然重叠而不是互相打断。

给 Footstep 配 AudioStreamRandomizer：在 stream 属性里新建 AudioStreamRandomizer 资源，往里加三到五条略有差异的脚步切片（音效切片用 WAV），并为每条设置随机音高与音量范围。AudioStreamRandomizer 本身也是一个 AudioStream，每次播放随机挑一条——脚步声、打击声这类高频重复的音效，靠它一个节点配置就能告别"复制粘贴感"。

最后做音量滑条。给 BGM 加一条 HSlider，连接 value_changed：

```gdscript
func _on_volume_changed(value: float) -> void:
    # volume_linear 接受 0 到 1 的线性值，由引擎换算成分贝
    bgm.volume_linear = value
```

做滑条直接用 volume_linear 而不是 volume_db：线性值天然匹配滑条的 0 到 1 区间，不必自己算对数。

## 讲为什么：属性与信号的准确语义

AudioStreamPlayer 的核心属性：

- stream：要播放的 AudioStream 资源。注意：修改它会立刻停止当前播放；
- volume_db：以分贝为单位的音量；另有 volume_linear，接受 0 到 1 的线性值并由引擎换算成分贝；
- pitch_scale：音高倍率，默认 1；2.0 正好升高一个八度。配合随机化可以做出千变万化的脚步与打击声。Quaver 内置音色的力度分层（pp/mf/ff 三档）在听觉上就是"音量 + 音高微调"的组合应用；
- playing：反映当前是否正在播放；autoplay：勾选后进入场景自动播放；
- bus：输出总线名称，默认 &"Master"。这就是 Quaver 那棵总线树的入口：把若干播放器的 bus 指到同一条自建总线，就能用一个 Volume 控制整组声音；
- max_polyphony：最大复音数，默认 1。调大后同一个播放器可以同时叠放多个声音（比如连发的枪声），超出数量时切断最旧的声音；
- stream_paused：暂停音频流，恢复后从中断处继续。

四个核心方法：`play(from_position: float = 0.0)` 从指定秒数开始播放；`stop()` 停止；`seek(to_position)` 跳转到指定位置；`get_playback_position()` 查询当前播放位置。

两个行为细节必须咬文嚼字。第一，重复调用 `play()` 是从头重播，不是继续播放——想接着播，要么别乱调 play()，要么用 stream_paused 暂停后再恢复。第二，finished 信号只在音频自然播完时发出；手动调用 `stop()`，或节点退出场景树，都不会发出 finished。这意味着靠 finished 串联"播完一首自动换下一首"的播放列表是可靠的；但如果别处还会 stop() 这条音频，就不能指望 finished 来做收尾逻辑。

音频文件格式方面，WAV、Ogg Vorbis、MP3 三种都能导入。一般经验是音效切片用 WAV，音乐用 Ogg 或 MP3，具体导入参数见官方音频流文档。

## Web 平台的音频

导出到 Web 时有两点特殊。一是播放方式：4.3 起默认使用 Sample 播放模式，延迟更低。二是浏览器的自动播放限制：页面加载后不允许直接出声，必须等用户与页面发生第一次交互（点击、按键）之后，音频才能启动。所以 Web 版的 BGM 要设计成"点击开始游戏"之后再播放，而不是进页面就响。

## 坑点与自检

- 给 stream 赋值会立刻停止当前播放，切换曲目时别忘了这一点；
- bus 指向不存在的总线会静默回退 Master——总线名拼错不报错、声音照常出，问题被悄悄藏起来。搭总线树后逐条核对拼写；
- 重复调用 play() 是重播，不是继续；
- finished 在手动 stop() 与节点退出场景树时都不发出；
- pitch_scale 为 2.0 才是一个八度，1.0 与 1.2 的差别很多人会想当然；
- Web 平台必须等首次用户交互后才有声音；
- 自检问题一：BGM 循环中途手动调了 stop() 做静音，恢复播放后 finished 再也不响、BGM 变成单次播放——因为 stop() 不会触发 finished，循环链断了。改用 stream_paused 做静音即可；
- 自检问题二：音量滑条拉满反而比默认轻——检查滑条最大值是否为 1.0，以及是否误用了 volume_db 槽（分贝刻度 0 是"不变"，正数才是放大）。

## 练习

1. 给场景加一条自定义总线 SFX（音频面板右键添加），把 Footstep 的 bus 指过去，再给 SFX 总线加一个 Effect；用 `AudioServer.set_bus_volume_db()` 写一个一键静音所有音效的函数。
2. 用 pitch_scale 随机化替代 AudioStreamRandomizer 的部分功能：给 Footstep 换回普通 WAV 流，在 `_on_player_stepped` 里每次设置 `footstep.pitch_scale = randf_range(0.9, 1.1)` 后再 play()。对比两种方案的听感与配置成本。
3. 实现一个简单的播放列表：三条曲子依次播放，播完自动换下一首，全部播完从头再来。要求正确处理"中途切歌"——切歌用的 stop() 不能破坏 finished 链。

每题先自己动手，写完再展开参考实现对照：

<details>
<summary>练习 1 参考实现（先自己写，再展开对照）</summary>

```gdscript
var sfx_restore_db := 0.0

func mute_sfx(muted: bool) -> void:
    var idx := AudioServer.get_bus_index("SFX")
    if idx == -1:
        push_warning("SFX 总线不存在，检查拼写")
        return
    if muted:
        sfx_restore_db = AudioServer.get_bus_volume_db(idx)
        AudioServer.set_bus_volume_db(idx, -80.0)   # 压到几乎无声
    else:
        AudioServer.set_bus_volume_db(idx, sfx_restore_db)
```

对照要点：get_bus_index 找不到总线时返回 -1 而不是报错——这正是正文"总线名拼错静默回退"坑的代码层版本，先判 -1 再操作；用 volume_db 做静音必须先记住原音量，否则取消静音时回不到原值。实战里更推荐 `AudioServer.set_bus_mute(idx, muted)`，它不碰音量、天然可逆，这里按题目要求用 volume_db 实现一遍，正是为了体会两者的差别。

</details>

<details>
<summary>练习 2 参考实现（先自己写，再展开对照）</summary>

```gdscript
func _on_player_stepped() -> void:
    footstep.pitch_scale = randf_range(0.9, 1.1)
    footstep.play()
```

对照要点与方案对比：一行代码就有效果，配置成本远低于 Randomizer，适合"同一份切片快速去重"；但 pitch_scale 改变音高的同时会改变时长（音调高脚步更急促），且所有随机只来自一条曲线。AudioStreamRandomizer 的优势是每条切片可以配独立的音高与音量范围、还能给切片加权，素材多、要求细腻时再升级到它。听感结论留给你自己跑：切片少于三条时两者差距很小。

</details>

<details>
<summary>练习 3 参考实现（先自己写，再展开对照）</summary>

```gdscript
extends Node

@onready var player: AudioStreamPlayer = $MusicPlayer

var playlist: Array[AudioStream] = []
var current := 0

func _ready() -> void:
    playlist = [
        preload("res://audio/track_a.ogg"),
        preload("res://audio/track_b.ogg"),
        preload("res://audio/track_c.ogg"),
    ]
    player.finished.connect(_on_finished)
    _play_current()

func _play_current() -> void:
    player.stream = playlist[current]   # 注意：换 stream 会立刻停止当前播放
    player.play()

func _on_finished() -> void:
    current = (current + 1) % playlist.size()   # 走完最后一首自动回到 0
    _play_current()

func next_song() -> void:
    player.stop()   # stop 不触发 finished，切歌不会误入 _on_finished
    current = (current + 1) % playlist.size()
    _play_current()
```

对照要点：循环播放列表不需要任何额外标志，一个取模就完成"播完最后一首从头再来"；切歌时也不需要防御性布尔——stop() 压根不发 finished，这是正文反复强调的信号语义，读懂它这段代码就没有分支。反过来验证一遍：如果把切歌改成先 stop 再等什么回调，你会发现永远等不到。

</details>

## 下一步

- 想知道 Quaver 的音色是怎么"合成"出来的、总线树如何组织混音与发送效果，可以直接读它的仓库：https://github.com/fanquanpp/quaver（scripts/synth_engine.gd 与混音面板代码）。
- 角色移动与脚步触发的联动：角色移动与碰撞检测（080 篇）。
- 声音跟着动画走：动画与补间（110 篇）里动画播放器的音频轨道。

## 参考链接

- [音频流（Audio Streams）](https://docs.godotengine.org/en/stable/tutorials/audio/audio_streams.html)
- [AudioStreamPlayer 类文档](https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer.html)
- [AudioStreamPlayer2D 类文档](https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer2d.html)
- [AudioStreamPlayer3D 类文档](https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer3d.html)
- 键盘编曲工具编趣 Quaver（总线树实战样本）：https://github.com/fanquanpp/quaver
