---
order: 170
title: KonadoScript 剧本编写
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 系统学习 KonadoScript 指令，从对话立绘背景运镜到选项分支变量与自定义信号写出完整剧情
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related: ['godot/160-KonadoVisualNovelFramework', 'godot/180-KonadoAdvancedIntegration']
prerequisites: ['godot/160-KonadoVisualNovelFramework']

上一篇我们把 Konado 模板接进了 Godot 场景，这一篇来解决真正核心的问题：剧情怎么写。Konado 提供了一门为视觉小说定制的剧本语言 KonadoScript，你不需要编程基础，用一行行近似自然语言的指令就能描述对话、立绘、背景、运镜、音频、选项分支与变量。本篇将逐类讲清每一条指令，最后用一个完整的咖啡厅小剧本把它们串起来。

## 学习目标

- 理解 KonadoScript 的设计理念与文件约定（.ks、UTF-8、标识符引用资源）；
- 掌握普通对话行的完整语法，包括三种说话者形式与配音、打字速度参数；
- 会用演员（立绘）、背景、音频、运镜四族指令搭建舞台演出；
- 会用持久变量与临时变量记录状态，并在文本中插值；
- 会用 choice、branch、jump、if/else 写出可交互的分支剧情；
- 了解剧本导出加密与 Godot 内置 KS 编辑器的能力。

## 设计理念：故事内容与程序逻辑分离

KonadoScript 的设计理念是"故事内容与程序逻辑分离"：编剧不需要任何编程知识，只描述"谁说了什么、画面怎么变"；而资源（角色、背景、音乐）全部通过标识符（identifier）引用，与脚本本身解耦——剧本里只写 `background night_street fade`，至于 night_street 对应哪张图，由资源表决定。这样做的好处是换美术资源不动剧本，改剧本不动工程。

文件约定只有两条：源文件后缀为 `.ks`，编码为 UTF-8。纯文本格式让剧本天然跨平台，也能被 Git 正常做逐行 diff 与合并，团队协作时改了哪句剧情一目了然。以下所有示例都可以保存为 `.ks` 文件放进项目，由 Godot 插件自动编译。

## 普通对话行

普通对话是使用频率最高的指令，语法结构为：

```text
[说话者] "对话文本" [配音标签] [参数=值]
```

方括号中的部分都是可选的。说话者有三种写法：

- 裸演员 ID：直接写演员标识符，如 `alice`，运行时按演员表解析显示名；
- 变量：`$var` 或 `%var`，变量的值是演员 ID，适合"同一行台词由谁来说"需要动态决定的场合；
- 带引号署名：纯文本署名，如 `"旁白"`，支持变量插值；写空字符串可以隐藏署名。

2.8 版本为对话行新增了两个命名参数：`speed`（本句打字速度倍率，需大于 0）与 `interval`（每字符打字间隔秒数，不能与 speed 同用）。行尾还可以写配音标签，标签会被语音列表解析并播放对应语音，播放时对话框默认显示音频进度。

把官方示例完整照录，覆盖上面全部要点：

```konado
alice "你好，我叫爱丽丝！" alice_intro_01
alice "这一句会显示得更快。" [speed=1.5]
"narrator" "暴风雨越来越猛烈了..."
set $speaker "alice"
$speaker "今天由变量决定谁在说话。"
set %current_speaker "alice"
%current_speaker "持久变量同样可以作为说话者。"
set $guest_index 2
"访客 $guest_index" "很高兴见到你。"
```

第一行：演员 alice 说话，行尾 `alice_intro_01` 是配音标签；第二行：speed 命名参数让这句打得更快；第三行：引号署名"narrator"充当旁白；后面几行演示了变量作说话者，以及署名文本里插入变量值（`"访客 $guest_index"` 会显示成"访客 2"）。

## 演员（立绘）指令族

演员指令控制角色立绘的登场、退场、移动与表情切换：

```text
actor show [角色ID] [状态] at [水平坐标]
actor exit [角色ID]
actor move [角色ID] [坐标]
actor change <角色> <新状态>
actor motion <角色> <动作> [时长]
```

`actor show alice normal at 2` 表示让角色 alice 以 normal 状态出现在 2 号位。这里的"水平坐标"不是像素，而是区块索引：画面横向被等分为 division 份（由 KonadoDialogueManager 的 horizontal_division 属性控制，默认 5，可配 2 到 5），索引范围是 0 到 division，官方建议使用 1 到 division-1 之间的整数，避免角色被切在屏幕边缘。

`actor change` 负责表情与状态切换，Konado 为它准备了两套转场：如果角色场景能提供"状态帧"，就用预乘 Alpha shader 做**像素交融**（两幅画面逐像素过渡，效果高级）；否则自动退回"淡出、应用状态、淡入"的安全转场。转场相关参数在 KonadoStageController 检查器里配置：actor_state_transition_enabled 默认开启，actor_state_transition_duration 默认 0.3 秒。无论转场选哪种，剧情都会等转场完成后再继续，不会出现"表情还没换完台词先跑了"的穿帮。

`actor motion` 播放舞台动作（如震动、跳跃），由 KonadoActorMotionLayer 播放角色场景中 AnimationPlayer 的同名动画。以上每条指令都可以附加命名参数 `duration` 控制过渡时长，写法与对话行的命名参数一致。

## 背景指令

背景切换的语法是 `background <背景资源名> [效果类型]`，效果类型默认为 `none`（直接切换）。内置了 9 种转场效果，每一种都是官方提供的 shader：

- `none`：无效果，直接切换；
- `fade`：淡化，前一幅渐隐、后一幅渐显，最常用的过场；
- `erase`：擦除；
- `blinds`：百叶窗；
- `wave`：波浪；
- `vortex`：旋涡，适合进入梦境、幻境；
- `windmill`：风车；
- `cyberglitch`：赛博故障，适合黑客、系统异常桥段；
- `blink`：眨眼，类似眨眼 blackout 的闪切。

除内置效果外，还可以写自定义效果名，由资源侧的背景场景响应。看几个官方示例：

```konado
background night_street fade
background memory_flash erase
background dream vortex
background bg1 custom
```

## 音频指令

音频指令非常简单，而且全部"即时执行、不阻塞"，不会打断对话推进：

```konado
play bgm cafe_theme
stop bgm
play sfx door_bell
```

`play bgm` 播放背景音乐，`stop bgm` 停止，`play sfx` 播放一次性音效。至于语音（角色台词的人声），不单独占一条指令，而是写在对话行的配音标签位置，例如 `Kona "……" voice_01`，运行时由语音列表解析播放。三种音频的文件都通过资源表（background_music_list、sound_effect_list、voice_list）与标识符关联。

## 运镜：cam 与 asyncam

视觉小说的"电影感"很大程度来自镜头运动。同步运镜指令会**阻塞**剧情直到镜头动画播完：

```text
cam move [目标镜头ID] [过渡类型] [过渡时间]
cam reset [过渡类型] [过渡时间]
cam shake [持续时间]
```

- `cam move` 移动到指定镜头机位；过渡类型可不填或写 `none`（直接切）、`linear`（线性）、`ease_in_out`（缓入缓出）；只写过渡类型不写时间时，默认时长 1.0 秒；
- `cam reset` 回到默认机位（屏幕中心、缩放 1.0）；
- `cam shake` 随机抖动，强度从强到弱，默认 1.0 秒，适合爆炸、撞击、惊吓瞬间。

如果不想让玩家在运镜时干等，把 cam 换成 asyncam 即可：`asyncam move`、`asyncam reset`、`asyncam shake` 都不阻塞对话，玩家可以继续点击推进；`asyncam stop` 则强制终止所有异步相机动画并瞬间定格，用来收回控制权。

镜头目标"机位"是在背景场景里添加的 KonadoCameraMarker 节点：它只保存位置与缩放数据，本身不渲染任何画面，真正取景由模板里的相机完成。同一场景中机位节点名称必须唯一。

## 变量系统

KonadoScript 有两种变量：

- 持久变量 `%`：跨镜头保留、随存档一起保存，可以在检查器预设或用代码初始化，适合好感度、章节标记这类要长期记住的数据；
- 临时变量 `$`：只在当前镜头内有效、不写入存档、在脚本里用 set 初始化，适合本段剧情内的临时状态。

变量操作共五种：`set`（赋值）、`add`（加）、`sub`（减）、`mul`（乘）、`div`（除）。语法为 `<操作> <变量名> <值>`，也可以写成 `<操作> <变量名> = <值>`。除法遇到除数为零会报错并跳过该操作，不会中断剧情。值支持四种类型：整数、浮点数、布尔值（true/false，参与条件判断时等价于 1/0）与双引号字符串。

对话文本里可以直接插值：写 `%var` 或 `$var`，运行时会替换为变量的实际值，前面"访客 $guest_index"就是例子。在 GDScript 侧初始化持久变量的官方写法是：

```gdscript
func _ready() -> void:
	if dialogue_manager.variable_store == null:
		var store = KonadoVariableStore.new()
		store.set_value("love", 0)
		store.set_value("player_name", "")
		store.set_value("unlocked", false)
		dialogue_manager.variable_store = store
```

这样剧本里的 `%love` 与代码里 set_value("love") 操作的是同一个存储，双向互通。

## 分支与选项：choice、branch、jump

选项与分支是视觉小说交互性的核心。选项指令的语法是：

```text
choice "选项内容" -> 分支名称
```

多条相邻的 choice 行会自动合并为一个选项组，同时展示给玩家。三条书写规则要记牢：分支名区分大小写、不可含空格和特殊符号；选项内容必须用英文双引号；`->` 分隔符不可省略。

分支用 branch 块定义：由分支名和缩进包裹的内容就是该分支的剧情，玩家没有跳到这个分支时它不会播放。分支不可嵌套，块内缩进层级必须与对话行保持一致。在分支结尾用 `jump_branch 分支名` 跳到汇合点，是组织"分叉再合流"剧情的标准手法：

```konado
choice "接受邀请" -> accept
choice "婉言拒绝" -> refuse

branch accept
    set %favor 1
    alice "太好了，一言为定！" accept_voice
    jump_branch after_choice

branch refuse
    alice "没关系，下次一定。" refuse_voice
    jump_branch after_choice
```

如果剧情跨多个文件，用 `jump` 做跨剧本跳转：

```konado
jump res://sample/demo/demo_02.ks
```

## 条件：if、else、endif

条件指令让剧情根据变量状态走向不同文本，语法为：

```konado
if %变量 == 值:
    <对话>
else:
    <对话>
endif
```

要点有四条：`else:` 分支可以省略；条件判断不支持嵌套（不能在 if 里再写 if）；可用运算符共六个：`==`、`!=`、`>`、`<`、`>=`、`<=`；引用了未初始化的变量时条件视为不成立。因此用 `if %favor >= 3:` 这类判断前，先确保变量已在剧本或代码里初始化过。

## 其他常用指令

- screentext：全屏文本块，以 NVL 覆盖层形式居中展示。逐行淡入，每行末尾有闪烁的三角指示器，玩家点击后显示下一行，最后一行确认后覆盖层淡出。适合章节引言、信件、独白。
- showtextbox / hidetextbox：显示或隐藏对话框，可带 duration 参数。duration 省略或为 0.0 时立即显隐；大于 0 时播放淡入淡出并等待完成。hidetextbox 完成后还会清除角色名与文本。
- signal：发射自定义信号，内容可以是任意文本，由外部 GDScript 连接 KonadoDialogueManager 的 `custom_signal(content)` 信号接收。它是"可重放"的一次性副作用：对话回退可以跨越它，重放时会重新发射。
- waitsignal：暂停对话流程，等待外部触发。外部代码调用 `emit_wait_signal("信号名")` 后对话继续，常用于等待一段过场动画、QTE 或小游戏结束。
- achievement：三条指令直接联动成就系统：`achievement unlock "first_blood"` 解锁成就、`achievement increment "explorer" 1` 增加计数、`achievement set_flag "secret_ending_found" true` 设置标志。成就是回退屏障：回退可以跨越成就指令但不会重放它，成就只增不减。
- end：对话终止指令，立即终结当前对话流程，其后所有内容都不再执行。官方推荐在每个剧本结尾和每个 branch 收尾处使用。end 还是回退边界——"上一句"功能不能跨越已经结束的剧本。

## 综合示例：咖啡厅的下午

把上面所有指令串起来，下面是一个约五十行的完整小剧本：背景切换、角色登场换表情、运镜、音频、好感度变量、双选项分支与 end 收尾，可以直接保存为 .ks 体会：

```konado
# 咖啡厅的下午 —— KonadoScript 综合示例
# 演示：背景切换、立绘登场与表情、运镜、音频、变量、选项分支

play bgm cafe_theme
background cafe_noon fade

actor show alice normal at 2

alice "欢迎光临，请问我能帮你点什么？" hello_01

cam move counter_close linear
alice "咦？是你？上次在图书馆帮我捡起书的那位同学。" surprise_01 [speed=1.2]
cam reset ease_in_out

alice "今天这杯算我请客，就当谢谢你。" smile_01
actor motion alice jump
play sfx chime_soft

set %favor 0

choice "爽快地接过咖啡并道谢" -> say_thanks
choice "有点害羞地点了点头" -> nod_quietly

branch say_thanks
    set %favor 1
    actor change alice happy
    alice "不客气，以后常来哦。" happy_02
    jump_branch after_branch

branch nod_quietly
    actor change alice shy
    alice "……嗯，谢谢。" shy_01
    jump_branch after_branch

branch after_branch
    alice "对了，明天同一时间，我还在这里等你。" promise_01
    play sfx door_bell
    actor exit alice
    background cafe_evening fade
    cam move window_view ease_in_out
    "narrator" "午后的阳光，慢慢变成了傍晚的橙色。"
    if %favor == 1:
        "narrator" "那杯咖啡的味道，你记了很久。"
    else:
        "narrator" "你决定，下次一定要好好道谢。"
    endif
    cam reset
    end
```

注意几个编排细节：两个相邻 choice 自动成为一组选项；每个分支结尾都 jump_branch 到公共的 after_branch，避免重复写收尾内容；end 放在最后，保证回退不会越界。仓库 sample/demo 目录下还有变量、动作、背景特效等六组官方示例剧本，可与本例对照阅读。

## 剧本导出保护

发布游戏时，剧情源文件不需要随包暴露。导出预设里有专门的 `Konado -> Script Encryption Key` 配置项：填入密钥后，Konado 会自动加密编译后的剧情数据；密钥留空或格式错误时会随机生成一个 256 位密钥，密钥保存在项目的 `.godot/konado_export_credentials.cfg` 中。两点提醒：后续发布补丁或热更新必须使用**相同的导出预设与密钥**，否则旧存档与新剧情对不上；这套机制防的是通用工具直接读取包体明文，不能替代专业 DRM 方案。

## 内置 KS 编辑器

启用插件后，在 Godot 文件面板里**双击 .ks 文件**，就会在 Godot 原生脚本工作区中打开内置编辑器，左侧脚本列表会变成组件与指令树，点击即可插入语句。它的能力覆盖了编剧的日常：

- 语法高亮，以及按指令上下文的命名参数补全；
- 项目资源标识符补全：演员、状态、动作、背景、音频、镜头都能自动列出，不会写错资源名；
- Ctrl+点击跳转、悬停签名提示、转到定义、查找引用与安全重命名；
- 右键格式化与快速修复，实时诊断最多给出三条修复建议；
- 运行时调试：断点会打开对应的 .ks 行，并显示当前镜头、节点与持久、临时变量的值。

编辑器保存时写回原始 .ks 文件，并自动重新编译运行时使用的 KonadoShot，改完即生效，不需要手动重启。

## 小结

- KonadoScript 以 .ks、UTF-8 纯文本编写，故事与程序逻辑分离，资源靠标识符引用，天然兼容 Git 协作；
- 对话行语法为 `[说话者] "文本" [配音标签] [参数=值]`，说话者可用演员 ID、变量或引号署名，speed 与 interval 是 2.8 新增的打字节奏参数；
- 演出四件套：actor 家族管立绘（区块索引默认 5 等分，建议 1 到 division-1）、background 管 9 种内置转场、play bgm/sfx 管音频、cam/asyncam 管运镜（机位用 KonadoCameraMarker 标记）；
- 变量分持久（%）与临时（$），set/add/sub/mul/div 五种操作，文本内可插值，与代码侧共享同一存储；
- 交互靠 choice 加 branch（不可嵌套、相邻 choice 成组）与 if/else/endif（六运算符、不支持嵌套、未初始化视为不成立）实现；
- signal/waitsignal 打通剧本与 GDScript，achievement 联动成就，end 终止剧本并构成回退边界；
- 发布前可配置 Konado -> Script Encryption Key 加密剧情；双击 .ks 即可在 Godot 内置编辑器中获得高亮、补全与断点调试。

## 参考链接

- [Konado 官方文档（中文主页，剧本指令详见 tutorial/script 章节）](https://godothub.com/oss/konado/zh/latest/)
- [Konado 安装教程](https://godothub.com/oss/konado/zh/latest/tutorial/install.html)
- [Konado GitHub 仓库（sample/demo 内含官方示例剧本）](https://github.com/godothub/konado)
- [Konado AtomGit 镜像仓库](https://atomgit.com/godothub/konado)
