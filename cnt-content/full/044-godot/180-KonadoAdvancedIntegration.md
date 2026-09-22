---
order: 180
title: Konado 进阶：变量存档与深度定制
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 打通 KonadoDialogueManager 的变量存档回退能力，自定义对话框与角色背景场景，接入本地化与成就系统
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related: ['godot/160-KonadoVisualNovelFramework', 'godot/170-KonadoScriptAuthoring']
prerequisites: ['godot/170-KonadoScriptAuthoring']

前两篇解决了"装起来"和"写剧本"，这一篇进入真正的工程化环节：把 KonadoDialogueManager 的导出属性、信号、变量存储、存档与回退机制用熟，替换默认对话框，用场景化的角色与背景资源接入任意表现技术，最后接入本地化、成就系统等扩展组件，并学会用日志与错误码诊断问题。所有内容基于 2.8+ API。

## 学习目标

- 熟悉 KonadoDialogueManager 按组划分的导出属性与六个主要信号；
- 掌握 KonadoVariableStore 的代码侧变量操作与持久化思路；
- 会调用存档 API，理解存档内容、校验机制与文件格式；
- 理解回退（Rollback）的边界规则与 Backlog 对话历史的行为；
- 会按角色场景协议与背景场景协议自定义演出资源，替换默认对话框；
- 会配置剧情本地化、设置系统、成就系统，并使用日志与错误码排查故障。

## KonadoDialogueManager 的关键导出属性

KonadoDialogueManager 是整个框架的入口类，它的导出属性在 Inspector 中按功能分组。先看 Playback Settings（播放设置）：

```gdscript
# Playback Settings
@export var require_visible_in_tree := true
@export var initialize_on_ready := true
@export var start_on_ready := true
@export var actor_auto_highlight := true
@export var autoplay := false
@export var typing_interval := 0.04
@export var auto_play_delay := 2.0
```

`initialize_on_ready` 与 `start_on_ready` 决定模板是否在进入场景时自动初始化并自动开始播放默认镜头；`autoplay` 控制是否像看动画一样自动推进对话；`typing_interval` 是打字机每字符间隔（默认 0.04 秒）；`auto_play_delay` 是自动模式下每句之间的停留时间。第二组只有一个成员但极其重要：

```gdscript
# Global Variable
@export var variable_store: KonadoVariableStore
```

变量仓库是剧本变量与游戏逻辑共享的唯一存储，下一篇位置会反复用到它。第三组是 UI Settings：

```gdscript
# UI Settings
@export var auto_show_dialogue_box := true
@export var horizontal_division := 5
@export var dialogue_box: KonadoDialogueBox
```

`auto_show_dialogue_box` 让对话框在台词出现时自动显示；`horizontal_division` 是上一篇讲过的立绘区块等分数；`dialogue_box` 就是"自定义对话框"一节的替换入口。第四组是 Dialogue Resources（对话资源），即起始镜头与五张资源表：

```gdscript
# Dialogue Resources
@export var start_dialogue_shot: KonadoShot
@export var character_list: KonadoCharacterList
@export var background_list: KonadoBackgroundList
@export var background_music_list: KonadoBackgroundMusicList
@export var voice_list: KonadoVoiceList
@export var sound_effect_list: KonadoSoundEffectList
```

剧本里写的每一个标识符（角色、背景、音乐、语音、音效）都要在这五张资源表里登记，运行时才能解析到实际资源；`start_dialogue_shot` 指定进入场景后自动播放的剧情镜头。

## 六个主要信号：把剧本接进游戏

KonadoDialogueManager 定义了六个信号：

```gdscript
signal shot_start
signal shot_end
signal dialogue_line_start(instruction_id: String)
signal dialogue_line_end(instruction_id: String)
signal custom_signal(content: String)
signal runtime_failed(message: String, instruction_id: String, source_line: int)
```

镜头开始与结束用 shot_start/shot_end 观察；每一句台词的前后用 dialogue_line_start/dialogue_line_end 跟踪；运行出错时 runtime_failed 会带上错误消息、指令标识与源码行号。而 `custom_signal` 是剧本到游戏的正式桥梁：剧本用 signal 指令发射任意文本，GDScript 侧按内容分发处理。例如剧本里写一句 `signal play_thunder`，游戏侧播放雷声：

```gdscript
func _ready() -> void:
	if dialogue_manager:
		dialogue_manager.custom_signal.connect(_on_script_signal)

func _on_script_signal(content: String) -> void:
	if content == "play_thunder":
		$ThunderPlayer.play()
```

反方向的"游戏到剧本"则靠 waitsignal 配对：剧本写 `waitsignal thunder_done` 暂停等待，游戏侧在小游戏或动画结束时调用 `dialogue_manager.emit_wait_signal("thunder_done")` 放行。一去一回，剧情就能与任意玩法系统协作。

## 变量持久化：KonadoVariableStore

KonadoVariableStore 是剧本 `%变量` 与代码共享的同一份存储。常用方法有三类：`set_value()` 直接赋值；`get_bool()` 按布尔读取；`apply_operation()` 按 Operation 枚举（SET/ADD/SUB/MUL/DIV）执行与剧本 set/add/sub/mul/div 指令等价的运算。最小用法：

```gdscript
var store: KonadoVariableStore = dialogue_manager.variable_store
store.set_value("love", 10)
var unlocked := store.get_bool("unlocked")
```

持久变量会随存档一起保存、跨镜头保留；临时变量只活在当前镜头内。工程上的建议是：游戏开局集中初始化所有持久变量（上一篇给过官方模板代码），剧本内只做运算与判断，避免"某个变量某天突然未初始化"。

## 存档系统

默认模板自带快速保存、快速读取按钮与完整的存档面板。槽位规则：默认共 20 个槽位（编号 0 到 19），其中 0 号固定为快速存档。五个 API 全部挂在对话管理器上：

```gdscript
if not dialogue_manager.save_game(1):
	push_error("保存失败，请检查槽位与磁盘")
if not dialogue_manager.load_game(1):
	push_error("读取失败：存档可能缺失或与新版本剧本不兼容")
dialogue_manager.delete_save(1)
var info := dialogue_manager.get_save_info(1)
var all_saves := dialogue_manager.get_all_save_info()
```

注意 save_game、load_game、delete_save 都返回布尔值，**失败必须处理**，不要假设永远成功；get_save_info 返回单个槽位信息，get_all_save_info 返回全部槽位列表，适合渲染存档界面。

存档保存的是完整运行状态：当前指令、临时与持久变量、对话框、角色、背景、相机与音频状态整体打包保存与恢复，**不能选择性关闭**某一部分。读取时有严格校验：存档格式、编译器 ABI、剧本指纹与指令标识都会核对，一旦无法准确恢复就明确失败，绝不静默跳错剧情——这正是上一篇编译模型的工程红利。

存档文件落在 `user://konado_saves/[槽位ID].kns`，是带格式版本、长度和 SHA-256 完整性校验的二进制封装。SHA-256 校验能发现文件损坏，但它**不是加密也不是防篡改机制**，不要拿它保护敏感数据。

## 回退与对话历史

"上一句"按钮背后的回退机制复用虚拟机的可逆事务回滚：按目标行做完整快照、精确恢复，并在同一帧内重放画面，不会闪现旧内容。快照保留最近 128 句、约 4 MiB 预算。代码侧有两个方法：

```gdscript
if dialogue_manager.can_rollback(1):
	dialogue_manager.rollback(1)
```

回退的边界规则要记牢：只有 `end` 指令构成回退边界，回退不能跨越已结束的剧本；`jump` 跨剧本跳转则可以被回退跨越。副作用指令分两类处理：`signal` 与 `asyncam` 在回退跨越后重放时会重新执行；成就指令跨越后不重放，成就只增不减。

Backlog（对话历史）是会话级的：只存在内存中、不写入存档，条目上限默认 256 条，记录每句的说话者、文本、来源镜头与行号等信息。历史面板里每一行都是回退入口——点击已提交的历史条目即可直接回退到那一句，这是玩家最常用的"翻回去重选"入口。

## 场景化资源：角色与背景场景

2.8 中角色与背景资源不再是"一张图片字段"，而是 PackedScene：资源列表保存场景，剧本指令只表达剧情意图（谁登场、切什么背景），资源场景自己负责表现——图片、视频、Spine、Live2D、shader 都可以塞进去，演出与剧本彻底解耦。

自定义角色场景要继承 KonadoCharacterSceneBase，系统实例化后会调用 apply_status(status_name) 切换状态，你需要覆写的协议方法有三个：

- `_apply_status(resolved_status_name, original_status_name)`：必需，把解析后的状态应用到自己的节点上；
- `_has_status(...)`：可选，查询是否拥有某状态；
- `_get_status_transition_frame(...)`：可选的状态帧协议，返回一个新建的独立帧 KonadoCharacterTransitionFrame，即可实现真正的像素交融转场；不实现则自动退回"淡出、应用状态、淡入"。

状态别名（status_aliases）解决"剧本用语义名、资源用文件名"的错位：把剧本里的语义名映射到资源实际名，例如 `angry` 映射到 `face_anger_01`，编剧全程不用关心贴图命名。

自定义背景场景继承 KonadoBackgroundSceneBase；背景列表的每一项配置 `background_name` 加 `background_scene` 两个字段。背景场景内可以放一个 AnimationPlayer 响应切换动画，命名约定是：`enter`/`exit` 为兜底动画；`enter_fade`/`exit_fade` 对应 fade 效果；`enter_custom`/`exit_custom` 供自定义效果名优先播放。最简单的图片背景建议用 TextureRect 并按以下方式设置：锚点预设 Full Rect（铺满父节点）、Expand Mode 设为 Ignore Size、Stretch Mode 设为 Keep Aspect Covered，这样任意分辨率下都不会变形。

## 自定义对话框

想换对话框皮肤时，第一步永远是把模板复制到自己的目录再修改，例如复制到 `res://ui/dialogue/` 下。**不要直接改 `res://addons/konado/` 里的文件**，插件升级会覆盖你的修改。改完副本后，把副本中的 KonadoDialogueBox 赋给 dialogue_manager 的 `dialogue_box` 属性，模板即刻换装。

代码控制对话框显隐时，注意 hide 与 dismiss 两族方法的区别：

```gdscript
dialogue_box.hide_dialogue_box()                 # 保留内容，暂时隐藏
dialogue_box.hide_dialogue_box_with_duration(0.5)
dialogue_box.dismiss_dialogue_box()              # 隐藏并清除内容
dialogue_box.dismiss_dialogue_box_with_duration(0.5)
```

hide 系列"藏而不清"，dismiss 系列"藏且清空"，做过聊天软件的同学可以理解为最小化与关闭的区别。

对话框里的文字由打字机组件 KonadoTypewriterText 渲染，它有 GPU 加速的逐字符淡入、BBCode 富文本（b/i/u/s/color/font 标签）、任意角度淡入方向与完善的 CJK 支持。基本用法：

```gdscript
var typewriter = $KonadoTypewriterText
typewriter.set_bbcode("[color=yellow]你好[/color]，[b]玩家[/b]！")
typewriter.start()
```

API 还有 start/skip/reset/is_playing/is_finished/get_progress；可调属性包括 chars_per_second（默认 25.0）、fade_width（默认 3.0）与 fade_angle（默认 0.0 度）；打字过程会发出 typewriter_started、typewriter_finished、typewriter_skipped 与 character_revealed(index) 信号，配合 skip 可以实现"点击跳过打字"的标配体验。打字音效在 KonadoDialogueBox 上配置：enable_typing_effect_audio（默认开启）、typing_effect_audio 指定 AudioStream、audio_trigger_chance 控制每字符发声概率（默认 0.8）、min_audio_interval/max_audio_interval 限频、audio_volumn 控制音量（默认 0.6——注意 `audio_volumn` 是官方源码的实际拼写，volume 的笔误，照抄才能找到该属性）。内置音效素材在 `res://addons/konado/assets/audio/typewriter/`。

## 剧情本地化

Konado 的语言状态直接建立在 Godot 的 TranslationServer 之上，内置界面翻译以原生 .po 文件提供简中、繁中、英、日、韩五种。切换语言并持久化的官方写法是：

```gdscript
KonadoSettings.set_setting("display", "language", "ja")
```

只想临时切换当前会话而不落盘，则调用 `TranslationServer.set_locale("ja")`。

剧情内容的本地化按文件命名约定组织：基础剧本 `chapter.ks` 旁边放置 `chapter.zh_Hans.ks`、`chapter.en.ks`、`chapter.ja.ks` 等语言版本，运行时按"完整语言码、推导语言与书写系统、基础语言、默认剧情"的顺序查找。有一条硬性约束：**本地化剧本可以改文本与演出参数，但指令类型、控制流和稳定指令 ID 必须与基础剧本一致**，否则存档与回退会错位。切换语言后调用 `dialogue_manager.reload_localized_script(locale)`（返回 bool）即可重新加载当前镜头的对应语言版本；也可以手动加载：`KonadoStoryLocalization.load_localized_script("res://dialogues/chapter.ks")` 会返回一个 KonadoShot。

## 扩展组件一览

- KonadoSettings（设置系统）：用 JSON 配置定义设置项，控件类型有 SLIDER、TOGGLE、OPTION 三种，支持平台过滤。它是 Autoload 单例，get_setting 与 set_setting 负责带验证的读写并持久化到 `user://konado_settings.cfg`，任何修改会发出 setting_changed(category, key, value) 信号。
- KonadoAchievements（成就系统）：同样 JSON 配置，条件类型分 counter（计数达标）与 flag（标志等于目标值），成就属性含 id、name、description、icon、hidden、category、points、conditions。API 包括 unlock_achievement、increment_progress、set_flag、is_unlocked、get_unlock_percentage、show_panel/hide_panel 与 reset_all；解锁与进度变化分别发出 achievement_unlocked(id, data) 与 achievement_progress_updated(id, current, target) 信号。上一篇的三条剧本 achievement 指令正是与它联动的。
- Konado.NET（C# 适配层）：前提是 Konado 主插件加支持 C# 的 Godot .NET 4.7.1+。启用顺序必须遵守：先启用 Konado，构建 C# 项目，再启用 Konado.NET，最后重开项目。C# 侧通过自动加载入口 KonadoApi 访问 `KonadoApi.DialogueManagerApi`（IsReady、BindDialogueManager(node)、SetShot、InitDialogue、StartDialogue/StopDialogue、SaveGame/LoadGame 等），事件与 GDScript 信号一一对应：ShotStart、ShotEnd、DialogueLineStart/End、CustomSignal、RuntimeFailed。
- Konado WebTool：解决 Godot 4.x Web 导出会捕获全部键盘快捷键的问题，通过注入 JavaScript 放行浏览器开发者工具快捷键（F12/F5/F11 等）；`allow_in_release` 默认为 false，正式发布时按需打开。

## 诊断：日志、覆盖层与错误码

排查问题有三个抓手。其一，KonadoLogger 基于 Godot Logger，日志文件写入 `user://konado_log.log`。其二，运行出错时屏幕会弹出覆盖式日志窗口并中断运行，便于当场定位；发布版如果不希望玩家看到，可在对话管理器上设置 `KonadoDialogueManager.enable_overlay_log = false` 关闭。其三，运行时故障对象携带结构化信息：错误码与标识、消息、来源脚本与行号、严重级别等字段，配合 runtime_failed 信号可以接入自己的上报系统。

Konado 的错误码是稳定编号，按模块前缀划分：AC（表演与舞台）、AH（成就）、AU（音频）、CA（相机）、CP（编译与链接）、DL（对话与选项）、RS（资源校验）、RT（运行时契约）、SC（脚本与跳转）、VA（变量与条件）。看到错误码先看前缀就能判断问题出在哪一层。内部 API 的返回遵循 KonadoResult 约定，成功形如：

```json
{ "ok": true, "value": "..." }
```

完整错误码列表请查阅官方文档站核心概念章节。

## 小结

- KonadoDialogueManager 的导出属性按播放设置、变量仓库、UI 设置、对话资源四组组织；五张资源表是剧本标识符与实际资源的绑定处；
- custom_signal 信号是剧本到游戏的桥，waitsignal 与 emit_wait_signal 是反向的路，一去一回即可与任意玩法协作；
- 存档共 20 槽（0 号快速存档），save_game/load_game/delete_save 返回 bool 必须判错；存档整体保存运行状态并带格式、编译器 ABI、剧本指纹与指令标识校验，文件为 user://konado_saves/ 下的 .kns 二进制封装（SHA-256 防损坏、非加密）；
- 回退按快照同帧重放，end 是唯一回退边界，signal/asyncam 跨越后重放、成就不重放；Backlog 内存保存最近 256 条、点击历史行即可回退；
- 角色场景继承 KonadoCharacterSceneBase 并覆写 _apply_status（可选状态帧实现像素交融），背景场景继承 KonadoBackgroundSceneBase 用 AnimationPlayer 的 enter/exit 系列动画响应切换；状态别名解耦剧本语义名与资源命名；
- 自定义界面先复制模板再改副本，hide 与 dismiss 两族显隐语义不同；打字机 KonadoTypewriterText 支持 BBCode 与 skip；打字音量属性的实际拼写是 audio_volumn；
- 本地化按 chapter.ks 加语言后缀命名文件，指令类型、控制流与稳定指令 ID 必须与基础一致；设置、成就各有 Autoload 单例与信号；C# 走 Konado.NET，Web 导出配 WebTool；
- 出问题先看 user://konado_log.log 与错误码模块前缀，发布版可用 enable_overlay_log 关闭覆盖层日志。

## 参考链接

- [Konado 官方文档（中文主页，核心概念与错误码详见 tutorial/core 章节）](https://godothub.com/oss/konado/zh/latest/)
- [Konado 升级到 2.8 指南](https://godothub.com/oss/konado/zh/latest/tutorial/upgrade-2.8.html)
- [Konado 安装教程](https://godothub.com/oss/konado/zh/latest/tutorial/install.html)
- [Konado GitHub 仓库（sample 内含 demo、错误码演示与 .NET 示例）](https://github.com/godothub/konado)
- [Konado AtomGit 镜像仓库](https://atomgit.com/godothub/konado)
