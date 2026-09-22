---
order: 70
title: 对话管理器 API 全解
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 系统梳理 KonadoDialogueManager 的导出属性信号与生命周期方法，打通剧本与游戏逻辑
author: fanquanpp
updated: '2026-09-22'
related:
  - 'konado/020-KonadoArchitecture'
  - 'konado/050-KonadoVariablesAndBranching'
prerequisites:
  - 'konado/020-KonadoArchitecture'
---

前几篇里我们一直在"用"KonadoDialogueManager 这个名字：绑定它、调用它、连它的信号。这一篇把它的 API 面板彻底摊开：所有导出属性、全部信号、完整的生命周期方法，以及围绕它的资源表与子控制器。读完本篇，你就能不查文档地回答"这个功能该找哪个属性、哪个方法、哪个信号"。

KonadoDialogueManager（对话管理器）继承自 Control，是默认对话模板场景 dialogue_runtime.tscn 的根节点，也是 Konado 所有运行时能力的统一入口。播放、暂停、存档、回退、信号、变量——一切都从它出发。普通游戏逻辑应该通过它来驱动对话，而不是直接操作底层的虚拟机与指令对象。

## 学习目标

- 理解 KonadoDialogueManager 在模板场景中的定位与标准集成方式；
- 逐组掌握全部导出属性：Playback Settings、Global Variable、UI Settings、Dialogue Resources、Log Tool；
- 掌握全部信号：shot_start/shot_end、dialogue_line_start/dialogue_line_end、custom_signal、runtime_failed 系列信号；
- 掌握生命周期方法 init_dialogue、set_shot、start_dialogue、stop_dialogue、start_autoplay、emit_wait_signal、reload_localized_script；
- 理解五张资源表"剧本标识符到实际资源"的映射意义；
- 会用打字机与音频子 API，并能独立完成从绑定到播放的最小集成。

## 定位：模板场景的根节点

标准集成方式只有三步：把 res://addons/konado/templates/default/dialogue_runtime.tscn 实例化进你自己的场景；在你的脚本里写 @export var dialogue_manager: KonadoDialogueManager 并在检查器（Inspector）中绑定到该实例；之后所有交互都通过这个引用进行。

```gdscript
extends Control

@export var dialogue_manager: KonadoDialogueManager

func _ready() -> void:
    if dialogue_manager:
        dialogue_manager.custom_signal.connect(_on_konado_dialogue_manager_play_sfx)
        # 可以在脚本中同步外部变量
        var store = KonadoVariableStore.new()
        store.set_value("love", 0)
        dialogue_manager.variable_store = store
```

这段是官方示例 demo.gd 的最小用法，值得逐行品味：先判空再使用，说明管理器可能尚未就绪或未绑定；custom_signal 的连接让剧本信号进入代码侧；variable_store 的赋值则展示了"外部变量注入"的入口——所有全局变量操作都经由管理器上的这一个属性。

## 导出属性分组详解

KonadoDialogueManager 的导出属性在源码里按功能分成五组，下面是完整摘录，随后逐组解释：

```gdscript
# Playback Settings
@export var require_visible_in_tree := true
@export var initialize_on_ready := true
@export var start_on_ready := true
@export var actor_auto_highlight := true
@export var autoplay := false
@export var typing_interval := 0.04
@export var auto_play_delay := 2.0
@export var deterministic_seed := 0
# Global Variable
@export var variable_store: KonadoVariableStore
# UI Settings
@export var auto_show_dialogue_box := true
@export var horizontal_division := 5
@export var dialogue_box: KonadoDialogueBox
@export var screen_text: KonadoScreenText
@export var stage_controller: KonadoStageController
@export var audio_controller: KonadoAudioController
# Dialogue Resources
@export var start_dialogue_shot: KonadoShot
@export var character_list: KonadoCharacterList
@export var background_list: KonadoBackgroundList
@export var background_music_list: KonadoBackgroundMusicList
@export var voice_list: KonadoVoiceList
@export var sound_effect_list: KonadoSoundEffectList
# Log Tool
@export var enable_overlay_log := true
@export var report_runtime_failures_to_console := true
```

**Playback Settings（播放设置）**控制"怎么播、何时播"：

- require_visible_in_tree：要求管理器节点进入场景树且可见后才执行播放，默认 true。把它关掉可以配合自定义的显示时机；
- initialize_on_ready 与 start_on_ready：分别控制节点就绪时是否自动初始化、是否自动开始播放。两者都开着时，模板一进场就会播放 start_dialogue_shot 指定的镜头；想完全由代码掌控时就把它们关掉，手动调用生命周期方法；
- actor_auto_highlight：说话角色自动高亮，让玩家一眼看出"现在谁在说话"；
- autoplay：是否自动播放（相当于替玩家持续点击）；
- typing_interval：打字机每字符间隔，默认 0.04 秒；
- auto_play_delay：自动播放模式下每句之间的停留时间，默认 2.0 秒；
- deterministic_seed：确定性种子，默认 0。当你需要同一剧本在相同操作序列下产生一致的运行表现时用到它。

**Global Variable（全局变量）**只有一个 variable_store: KonadoVariableStore，它是全局变量与持久变量的家，也是外部代码向剧本注入状态的唯一正规通道。变量系统本身在变量与分支一篇已详细讲过。

**UI Settings（界面设置）**把模板里各块 UI 挂到管理器上：

- auto_show_dialogue_box：有新对话时自动显示对话框，默认 true；
- horizontal_division：舞台横向等分份数，默认 5（可取 2 到 5），actor show 的 at 区块坐标就是相对它计算的；
- dialogue_box / screen_text / stage_controller / audio_controller：分别指向对话框、全屏文本、舞台控制器与音频控制器节点。自定义对话框时，你就是把副本场景里的 KonadoDialogueBox 赋给这里的 dialogue_box。

**Dialogue Resources（对话资源）**是 start_dialogue_shot 与五张资源表，后文单独展开。

**Log Tool（日志工具）**包含 enable_overlay_log（运行出错时是否弹出覆盖层日志窗口，默认 true）与 report_runtime_failures_to_console（是否把运行时故障报告到控制台，默认 true）。调试期建议全开，正式发布可按需关闭覆盖层。

## 信号全表

管理器对外发射的全部信号如下：

```gdscript
signal shot_start
signal shot_end
signal dialogue_line_start(instruction_id: String)
signal dialogue_line_end(instruction_id: String)
signal custom_signal(content: String)
signal runtime_failed(message: String, instruction_id: String, source_line: int)
signal runtime_failure_reported(failure: Dictionary)
signal runtime_failure_resolved(failure: Dictionary, resolution: StringName)
```

- shot_start / shot_end：一个镜头（Shot，即可加载的剧情单元）开始与结束时发射，适合做"进入章节/退出章节"的界面切换与资源加载；
- dialogue_line_start / dialogue_line_end：每一句对话开始与结束时发射，参数是稳定指令 ID（instruction_id）。这个 ID 在剧本重编译后保持稳定，因此你可以放心地用它做"某句话播放时弹出立绘特写"这类绑定，而不怕剧本改几个字就失效；
- custom_signal(content: String)：剧本 signal 指令的接收端，上一篇已经完整讲过，这里给一个播音效的完整闭环例子：

```gdscript
func _ready() -> void:
    dialogue_manager.custom_signal.connect(_on_konado_dialogue_manager_play_sfx)

func _on_konado_dialogue_manager_play_sfx(content: String) -> void:
    # 剧本里写：signal play_sfx thunder
    if content == "play_sfx thunder":
        print("播放雷声音效")
```

- runtime_failed / runtime_failure_reported / runtime_failure_resolved：运行时故障三部曲。runtime_failed 携带错误消息、指令 ID 与源码行号；runtime_failure_reported 携带一个更完整的 failure 字典（含稳定错误码、资源信息、严重级别等字段）；runtime_failure_resolved 在故障被处理解决后发射。有关错误码体系与日志的细节，在本地化与扩展组件一篇还会系统介绍。

## 生命周期方法

从加载剧本到停止播放，管理器提供一组明确的生命周期方法：

```gdscript
init_dialogue(callback: Callable = Callable())
set_shot(new_shot: KonadoShot)
start_dialogue()
stop_dialogue()
start_autoplay(value: bool)
emit_wait_signal(signal_name: String)
reload_localized_script(locale: String) -> bool
```

- set_shot：装入一个 KonadoShot（编译产物）。通常先由编译器生成：
- init_dialogue：初始化运行时，可传入一个 Callable 回调；
- start_dialogue / stop_dialogue：开始与停止播放；
- start_autoplay：开关自动播放；
- emit_wait_signal：触发剧本里 waitsignal 的等待，让暂停的流程继续；
- reload_localized_script：按语言重新加载本地化剧本，返回是否成功，是多语言剧情切换的运行时入口。

代码方式编译并播放的完整写法：

```gdscript
var compiler = KonadoScriptCompiler.new()
var shot = compiler.compile_file("res://story/intro.ks")
dialogue.set_shot(shot)
dialogue.init_dialogue()
dialogue.start_dialogue()
```

如果你更喜欢检查器驱动的零代码方式：把编译好的 .ks 拖到 start_dialogue_shot 属性上，保持 initialize_on_ready 与 start_on_ready 开启，运行即播。

## 资源表：剧本标识符到实际资源的映射

Dialogue Resources 组里除 start_dialogue_shot 外的五张表，是 Konado"内容与资源解耦"理念的落点：

- character_list: KonadoCharacterList——角色（立绘）表；
- background_list: KonadoBackgroundList——背景表；
- background_music_list: KonadoBackgroundMusicList——背景音乐表；
- voice_list: KonadoVoiceList——语音表；
- sound_effect_list: KonadoSoundEffectList——音效表。

剧本里只写语义标识符，例如 actor show kona normal at 2、background night_street fade、play bgm main_theme。kona、night_street、main_theme 这些名字本身不指向任何文件，运行时由对应资源表把它们解析成实际的角色场景、背景场景与音频流。好处是三重的：编剧不用关心文件路径；同一个剧本换一套美术资源无需改一个字；美术与程序可以完全并行工作。每张表的具体配置项（如角色场景协议、背景场景协议）在场景化资源一篇详细展开。

## 打字机与音频子 API

管理器之下还有两个高频使用的子系统，这里做 API 级的简述。

KonadoTypewriterText（打字机文本）的核心方法是 set_bbcode、start、skip，核心属性是 chars_per_second（每秒打出的字符数）。它还带一套打字机音效配置，位于 KonadoDialogueBox 上，其中音量属性的官方实际拼写就是 audio_volumn（volume 的笔误，引用时请照抄官方拼写）：

```gdscript
@export var enable_typing_effect_audio := true   # 打字音效开关
@export var typing_effect_audio: AudioStream     # 音效资源
@export var audio_trigger_chance := 0.8          # 触发概率
@export var min_audio_interval := 0.02           # 最小触发间隔
@export var max_audio_interval := 0.08           # 最大触发间隔
@export var audio_volumn := 0.6                  # 音量（官方拼写即 volumn）
```

KonadoAudioController（音频控制器）提供背景音乐、音效与语音三类播放 API，官方代码照录如下：

```gdscript
@export var audio_interface: KonadoAudioController
audio_interface.play_background_music(bgm, "main_theme")   # 非阻塞循环播放
audio_interface.stop_background_music()
audio_interface.play_sound_effect(sound_effect)            # 非阻塞
audio_interface.play_voice(voice)                          # 非阻塞
var completed := await audio_interface.play_voice_and_wait(voice)  # true=自然完成
audio_interface.stop_voice()
audio_interface.voice_finished.connect(_on_voice_finished) # 仅自然播放完成时发出
```

使用前提是在模板中配置好 background_music_player、sound_effect_player、voice_player 三个播放器节点（默认模板已配好）。注意 play_voice_and_wait 是协程式等待，且 voice_finished 只在语音自然播完时发出——被中途打断时不触发，这个区分对"听完再继续"的逻辑很关键。

## 最小集成范例整合

最后把全篇内容收拢成一个可以直接照抄的最小集成。场景结构：你的主场景（Control 根）+ 实例化的 dialogue_runtime.tscn。脚本采用 demo.gd 风格：

```gdscript
extends Control

@export var dialogue_manager: KonadoDialogueManager

func _ready() -> void:
    if dialogue_manager == null:
        push_error("请先在检查器绑定 dialogue_manager")
        return
    # 1. 接收剧本信号
    dialogue_manager.custom_signal.connect(_on_konado_dialogue_manager_play_sfx)
    # 2. 初始化全局变量（若检查器未配置 variable_store）
    if dialogue_manager.variable_store == null:
        var store = KonadoVariableStore.new()
        store.set_value("love", 0)
        dialogue_manager.variable_store = store

func _on_konado_dialogue_manager_play_sfx(content: String) -> void:
    # 剧本中 signal play_sfx thunder 会走到这里
    if content == "play_sfx thunder":
        print("播放雷声音效")
```

配合检查器里设置 start_dialogue_shot（或上面给出的编译三行代码），从绑定、注入变量、信号联动到播放的链路就完整了。之后无论你要接存档（save_game/load_game）、回退（rollback）还是本地化（reload_localized_script），入口都还是同一个 dialogue_manager。

## 小结

- KonadoDialogueManager extends Control，是模板场景根节点与全部运行时能力的统一入口，标准做法是 @export 导出后在检查器绑定；
- 导出属性分五组：Playback Settings 控制播放行为与时机，variable_store 承载全局变量，UI Settings 挂接对话框与各控制器，Dialogue Resources 装载镜头与五张资源表，Log Tool 控制日志与故障上报；
- 信号八枚：镜头级的 shot_start/shot_end，句级的 dialogue_line_start/end（带稳定指令 ID），剧本文本级的 custom_signal，以及运行时故障三部曲；
- 生命周期七件套：set_shot 装镜头、init_dialogue 初始化、start/stop_dialogue 启停、start_autoplay 自动播放、emit_wait_signal 解除等待、reload_localized_script 切换本地化剧本；
- 五张资源表把剧本语义标识符映射到实际资源，实现内容与资源解耦；
- 打字机与音频控制器各有一套子 API，audio_volumn 为官方实际拼写；
- 最小集成 = 实例化模板 + 绑定引用 + 连信号 + 注入变量 + 指定起始镜头。

## 参考链接

- [Konado 官方文档（中文）](https://godothub.com/oss/konado/zh/latest/)
- [Konado 核心概念教程](https://godothub.com/oss/konado/zh/latest/tutorial/core/)
- [KonadoScript 剧本教程](https://godothub.com/oss/konado/zh/latest/tutorial/script/)
- [Konado GitHub 仓库](https://github.com/godothub/konado)
- [Konado AtomGit 镜像](https://atomgit.com/godothub/konado)
