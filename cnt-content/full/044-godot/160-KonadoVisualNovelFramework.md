---
order: 160
title: Konado 视觉小说框架入门
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 认识 Konado 框架与多许可证模式，完成插件安装并把对话模板接入 Godot 场景播放第一段剧情
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites:
  - 'godot/020-NodesScenesAndInstancing'
---

如果你的目标是做一款视觉小说（Visual Novel）、Galgame 或者带大量剧情对话的 RPG，用 Godot 从零手写对话框、打字机、选项分支、存档和立绘调度，工作量会大得吓人。Konado（中文名"可娜多"）就是为了解决这个问题而生的：它是基于 Godot Engine 的视觉小说引擎框架，官方把它描述为"对话创建工具包"（dialogue creation toolkit），内置对话模板与对话管理器，帮助你快速构建视觉小说、Galgame、RPG 等故事驱动项目。它的核心卖点是让创作者专注于故事叙述本身，而不必陷入程序细节。

本篇是 Konado 三部曲的第一篇：先认识这个项目和它的许可证模式，然后完成插件安装与项目配置，最后把官方对话模板接入你自己的 Godot 场景，播放出第一段剧情。后续两篇会系统讲解 KonadoScript 剧本编写，以及变量、存档与深度定制。

## 学习目标

- 了解 Konado 的定位、版本线（2.8 正式版与 2.4 LTS）以及三选一许可证模式；
- 完成 Konado 插件的安装与推荐项目显示配置；
- 把默认对话模板 dialogue_runtime.tscn 实例化进自己的场景，并用最小脚本播放一段对话；
- 看懂默认模板的场景结构与 CanvasLayer 图层约定；
- 理解 KonadoScript 的"先编译后执行"模型与对话播放生命周期。

## Konado 是什么

Konado 是一个 Godot 插件形态的视觉小说框架（Visual Novel Framework），仓库地址为 github.com/godothub/konado。它已经收录进 Godot 官方维护的 awesome-godot 项目列表，并获得了 2025 AtomGit 百大开源项目荣誉。官方用它制作过《福尔摩斯：斑点带子案》《逃离精神病院》等完整作品，展示页在 godothub.com/game/visual-novel，想直观感受它能做到什么程度，可以先去看看。

几条对你有实际影响的信息：

- 文档站是 godothub.com/oss/konado/zh/latest/，支持简体中文、繁体中文、英语、日语、韩语五种语言；
- 插件下载走 GitHub Releases 的 ZIP 压缩包（不是 Godot Asset Library）；中国大陆用户推荐使用 AtomGit 镜像 atomgit.com/godothub/konado，release 下载速度更快；
- 社区渠道包括 QQ 频道、Discord 与爱发电，联系邮箱 konado@godothub.com。

一句话记住它的形态：Konado 不是独立引擎，而是装进 Godot 工程里的一套节点、资源与剧本语言。你仍然在正常的 Godot 项目里开发，随时可以混用 GDScript、Godot 的动画、UI 与粒子系统。

## 版本线：认准 2.8 正式版与 2.4 LTS

截至本文写作时，Konado 的版本格局如下：

- 最新正式版是 2.8.x，代号 Nanguoli（南果梨），首个 2.8 版本 v2.8.0 发布于 2026-09-07；
- 2.4 是 LTS（Long Term Support，长期支持）版本，提供 18 个月的维护支持；
- 上一代稳定版本号是 2.7.x，代号 Wontons（馄饨）。

要特别注意的是，2.4 到 2.8 是一次破坏性大版本升级：2.4 时代的节点名使用 KND_ 前缀（例如 KND_DialogueManager），2.8 统一改为 Konado 前缀（KonadoDialogueManager），API 并不兼容。**本篇与后续两篇的所有讲解、类名与指令语法，全部按 2.8+ 的 API 编写。**如果你手上是 2.4 或 2.7 的旧项目，请先阅读官方升级文档再动手。

## 三选一的许可证（Tri-License）

Konado 采用"多许可证"模式：你可以在三个许可证中三选一来遵守，这在国内开源项目里相当少见。

- MIT 许可证：限制最少，保留版权与许可声明即可；
- BSD 3-Clause 许可证：在 MIT 的基础上额外禁止用版权方名义为衍生产品背书；
- 木兰宽松许可证第 2 版（Mulan PSL v2）：中文世界自己的宽松许可证，额外包含明确的专利许可条款。

对普通使用者的实际含义：无论选哪个，分发（比如发布你的游戏）时只要保留你所选许可证要求的版权声明、许可证正文和免责声明即可；Konado **不强制**要求你在游戏启动画面展示 Konado 标识。仓库里 LICENSE、LICENSE-BSD、LICENSE-MULANPSL 三个文件分别对应三份许可证。另有一处容易忽略：项目内置字体（Noto Sans、资源圆体）附带独立的许可证文件，随游戏分发字体时同样要遵守。

## 系统要求与安装四步

Konado 的最低且经过开发者实测确认的 Godot 版本是 4.7.1，建议直接使用该版本或更高。安装按官方四步走：

1. 在 Godot 工程目录下新建插件文件夹 `addons`；
2. 下载 release 页提供的插件 ZIP 压缩包（大陆推荐 AtomGit 镜像，生产环境建议用稳定正式版而非开发分支）；
3. 把压缩包解压到 `addons` 目录下，解压完成后应得到 `addons/konado/` 目录，其入口脚本是 `konado_editor_plugin.gd`；
4. 在 Godot 的项目设置中启用 Konado 插件，然后重新加载当前项目。

启用后编辑器会多出 Konado 的编辑器能力（例如后面会讲到的内置 .ks 剧本编辑器）。

## 推荐的项目显示配置

视觉小说多为横屏静态构图，官方给出了一组针对此类项目的显示设置建议，可在项目设置的 Display 分区逐项修改：

- Display > Window > Size > Width / Height：1920 / 1080；
- Resizable：true（允许玩家调整窗口大小）；
- Stretch > Mode：viewport；Stretch > Aspect：keep（保持宽高比不变形）；
- Stretch > Scale：1.0；Scale Mode：fractional；
- Allow HiDPI：true（高分屏清晰显示）；
- 启动图像：项目设置里的 application/boot_splash/image，可以换成你的标题画面。

其中 Stretch 的 viewport + keep 组合是关键：无论玩家把窗口拖成什么形状，画面都按 16:9 等比缩放，不会出现拉伸变形。

## 把对话模板接入你的场景

Konado 的所有对话能力都封装在一个"对话模板"场景里，路径为：

```text
res://addons/konado/templates/default/dialogue_runtime.tscn
```

接入方法：在 Godot 编辑器的文件面板中找到这个 .tscn，把它拖进你自己的场景树，成为你某个节点的子节点。然后在挂在你场景根节点上的脚本里，用导出变量绑定它：

```gdscript
extends Control

@export var dialogue_manager: KonadoDialogueManager
```

保存后回到编辑器，在 Inspector 面板中把拖进来的模板节点拖到 dialogue_manager 属性槽上完成绑定。下面是官方 demo.gd 的最小示例，我们逐行看它做了什么：

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

- `@export var dialogue_manager: KonadoDialogueManager`：声明一个导出变量，类型就是 Konado 的对话管理器（KonadoDialogueManager，模板场景的根节点类）。它是对你暴露最多的入口类，播放、存档、变量都从这里走；
- `if dialogue_manager:`：先判空。如果你忘了在 Inspector 里绑定，这里不会崩溃，只是什么都不做；
- `custom_signal.connect(...)`：连接剧本与游戏之间的自定义信号通道。剧本里可以用 signal 指令向外发射任意文本内容，GDScript 侧通过这个信号接收（回调函数 `_on_konado_dialogue_manager_play_sfx` 的实现需要在脚本中自行补上，官方示例中省略了它的函数体）；
- 后面三行新建了一个变量仓库（KonadoVariableStore），写入一个初始值为 0 的持久变量 `love`，再把它交给 dialogue_manager 使用。这就是"在代码侧同步外部变量"的标准做法，细节会在第三篇展开。

## 模板场景结构与图层约定

看懂模板的结构，后面做自定义界面才不慌。用缩进树表示 dialogue_runtime.tscn 的层级：

```text
KonadoDialogue (Control, KonadoDialogueManager)
├─ KonadoUI (Node)
│  ├─ StageLayer (CanvasLayer, layer=1)
│  │  └─ StageController (PanelContainer, KonadoStageController)
│  │     ├─ BackgroundLayer (ColorRect)
│  │     │  ├─ BackgroundContainer (Control)
│  │     │  └─ CameraRoot (Node2D) ─ Camera2D
│  │     ├─ BackgroundTransitionLayer (Control)
│  │     ├─ ActorLayer (Control)
│  │     └─ EffectLayer (ColorRect)
│  ├─ DialogueLayer (CanvasLayer, layer=10)
│  │  ├─ DialogInterface (Control)
│  │  │  ├─ KonadoDialogueBox（实例）
│  │  │  ├─ ChoiceContainer (VBoxContainer)
│  │  │  └─ ScreenText (ColorRect)
│  │  └─ FunctionBar（功能栏：QuickSave/QuickLoad/Save/Backlog/Back/Autoplay 等）
│  ├─ SystemLayer (CanvasLayer) ─ KonadoErrorToolTip
│  ├─ SaveLayer (CanvasLayer) ─ KonadoSavePanel（实例）
│  └─ BacklogLayer (CanvasLayer) ─ KonadoBacklogPanel（实例）
└─ KonadoAudioController (Node2D)
   ├─ BackgroundMusicPlayer (AudioStreamPlayer)
   ├─ VoicePlayer (AudioStreamPlayer)
   └─ SoundEffectPlayer (AudioStreamPlayer)
```

结构可以概括为"一个大舞台 + 一个对话框 + 一组系统面板 + 三个音频播放器"。舞台层（StageController）负责背景、立绘、运镜与特效；对话框层负责文本、选项与全屏文字；存档、历史记录面板各自独立成层；音频控制器挂三个播放器分别对应背景音乐、语音与音效。

模板对 CanvasLayer 的层级（layer 值）有一套约定，自己加界面时必须遵守，否则会出现遮挡错乱：

- layer 1：舞台、背景与演出层；
- layer 10：对话框、选项与功能工具栏；
- layer 50：存档界面；
- layer 100：设置、成就等模态面板；
- layer 110：成就解锁等短时通知；
- layer 120：运行时错误提示。

规则很简单：**自定义界面不要占用 120 及以上的层级**，那是留给运行时错误提示的。

## KonadoScript 的编译模型

Konado 用一门专属剧本语言 KonadoScript 描述剧情，源文件后缀为 `.ks`、UTF-8 编码。一个重要的架构事实是：`.ks` 源文件**不在运行时逐行解释**。你在导入或保存剧本时，Konado 编译器就把源文件编译成运行数据。完整流程是：

```text
KonadoScript 源文件 → 词法与语法分析 → 语义检查与资源索引 → KonadoProgram → KonadoShot → KonadoVirtualMachine
```

三个关键名词：

- KonadoShot（剧情镜头）：一个可加载的剧情单元，记录源文件、镜头标识（ShotId）、依赖的角色资源与本地化覆盖层，持有唯一可执行产物；
- KonadoProgram：紧凑只读的指令程序，内含常量池、操作码、操作数与控制流信息，运行时按程序计数器直接执行数组，性能远好于逐行解析文本；
- KonadoVirtualMachine（虚拟机）：真正驱动指令执行的角色，但普通游戏逻辑不需要直接碰它——一切都通过 KonadoDialogueManager 驱动。

对编剧与开发者的实际影响是：语法错误在导入期就会暴露，运行时执行的是编译好的程序；这也是 Konado 存档系统能做严格校验（下一篇会讲）的基础。

## 播放生命周期与代码播放

接入模板后，对话管理器围绕四个方法工作：

- `init_dialogue(callback: Callable = Callable())`：初始化对话运行时；
- `set_shot(new_shot: KonadoShot)`：装载一个剧情镜头；
- `start_dialogue()`：开始播放；
- `stop_dialogue()`：停止播放。

在 Inspector 里把编译好的 .ks 生成物指定给 start_dialogue_shot 属性后，配合默认的自动初始化设置，模板可以开箱即播。而"代码方式编译并播放"则更灵活，官方示例只有五行：

```gdscript
var compiler = KonadoScriptCompiler.new()
var shot = compiler.compile_file("res://story/intro.ks")
dialogue.set_shot(shot)
dialogue.init_dialogue()
dialogue.start_dialogue()
```

先 new 一个编译器，把 `.ks` 编译成 Shot，依次调用 set_shot、init_dialogue、start_dialogue，对话就开始播放了。此外还有 `start_autoplay(value)`（自动播放）、`emit_wait_signal(signal_name)`（响应剧本的 waitsignal 等待）等方法，会在后续两篇按需介绍。

## 与 Ren'Py 的定位差异

最后用一句话划清边界：Ren'Py 是一门自带脚本语言与运行时的独立视觉小说引擎，而 Konado 是 Godot 生态内的插件，你的项目本质仍然是 Godot 项目，可以直接复用 Godot 的节点、物理、渲染与发布管线。如果你还在选型，可以对比阅读 Ren'Py 模块的同系列文章再决定；如果已经决定留在 Godot 生态，那么接下来请进入第二篇，系统学习 KonadoScript 的写法。

## 小结

- Konado 是基于 Godot Engine 的视觉小说框架与对话创建工具包，已收录进 Godot 官方 awesome-godot 列表，仓库在 github.com/godothub/konado，文档站支持五语，大陆下载可用 AtomGit 镜像；
- 版本认准两条线：2.8.x 正式版（本系列采用的 API）与提供 18 个月维护的 2.4 LTS；2.4 的 KND_ 前缀类名在 2.8 中已更名为 Konado 前缀，两代不兼容；
- 许可证为 MIT、BSD 3-Clause、木兰 PSL v2 三选一，保留声明即可分发，不强制启动画面标识；内置字体有独立许可证；
- 最低要求 Godot 4.7.1；安装四步：新建 addons 文件夹、下载 release ZIP、解压到 addons、项目设置启用并重载项目；
- 接入开发只需三件事：实例化 dialogue_runtime.tscn、用导出变量绑定 KonadoDialogueManager、设置或装载起始镜头；
- 剧本不是运行时解释，而是导入/保存时编译为 KonadoProgram，由 Shot 装载、虚拟机执行；
- CanvasLayer 图层约定：1 舞台、10 对话框、50 存档、100 模态面板、110 通知、120 错误提示，自定义界面不要占用 120 及以上。

## 参考链接

- [Konado 官方文档（中文主页）](https://godothub.com/oss/konado/zh/latest/)
- [Konado 安装教程](https://godothub.com/oss/konado/zh/latest/tutorial/install.html)
- [Konado 升级到 2.8 指南](https://godothub.com/oss/konado/zh/latest/tutorial/upgrade-2.8.html)
- [Konado GitHub 仓库](https://github.com/godothub/konado)
- [Konado AtomGit 镜像仓库](https://atomgit.com/godothub/konado)
- [Konado 官方作品展示](https://godothub.com/game/visual-novel)
