---
order: 50
title: 资源系统与自定义数据
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 理解 Godot 资源的数据容器本质与共享缓存机制，学会自定义 Resource 并保存为 .tres 数据文件
author: fanquanpp
updated: '2026-10-07'
related: ['godot/020-NodesScenesAndInstancing', 'godot/055-AutoloadAndSceneManagement']
prerequisites: ['godot/020-NodesScenesAndInstancing']
---

## 知识点地图

- **知识类别**：资源系统（Resource）——Godot 数据层的核心概念，与节点系统并列为引擎的两大支柱。
- **解决什么问题**：游戏里大量数据（贴图、音效、数值表、关卡配置）需要"在编辑器里编辑、保存成文件、在多个对象之间复用"。资源就是这套数据管线的统一抽象。
- **什么时候用到**：给敌人配数值、给武器做配置表、把策划案落成数据文件、需要 Inspector 可视化编辑的一切数据——都靠资源实现。跨场景存活的运行时状态（玩家血量、金币）不归资源管，那是 [Autoload 单例](/godot/055-AutoloadAndSceneManagement) 的主题，两篇原本同属一篇，现已按主题拆开。

> 分工声明：本篇只讲资源（数据容器）；Autoload 单例与场景切换管理见 055 篇。

Godot 的世界由两类东西构成：负责"做事"的节点（Node），和负责"装数据"的资源（Resource）。前几篇我们一直在和节点、场景打交道，本篇补上另一半拼图：理解资源的本质，以及它最容易踩坑的共享缓存机制。

## 学习目标

- 说清资源与节点的分工，能列出至少五种常用资源子类
- 深入理解资源共享缓存机制：改一处为什么会影响所有引用者，以及 duplicate() 与 Make Unique 两种解法
- 区分 load() 与 preload() 的加载时机与使用限制
- 创建自定义资源（class_name + extends Resource + @export）并保存为 .tres 文件

## 1. 资源是什么：纯数据容器

官方文档对资源（Resource）的定义只有一句话："Resources are data containers"（资源是数据容器）。资源本身不做任何事：它不进入场景树、不接收 _process 回调、不参与物理碰撞。真正"做事"的是节点，节点读取资源里的数据来完成渲染、播放、物理等具体工作。

几个你几乎每天都在用的资源子类：

- Texture（纹理）：Sprite2D 显示图像时读取的像素数据
- Script（脚本）：挂在节点上的 .gd 文件本身也是资源
- Mesh（网格）：3D 模型的几何数据
- Animation（动画）：AnimationPlayer 播放的动画数据
- AudioStream（音频流）：音频播放器读取的声音数据
- Font（字体）与 Translation（翻译）：UI 文字与本地化数据

场景本身也是资源：你保存的 .tscn 文件在引擎里对应 PackedScene 类。正因为如此，才能用 load() 加载一个场景文件，再调用 instantiate() 生成节点树。

## 2. 外部资源与内置资源

资源有两种存在形态：

- 外部资源（External Resource）：独立文件，例如 res://robi.png，可以被多个场景共同引用。
- 内置资源（Built-in Resource）：直接嵌在 .tscn 场景文件内部的资源，例如你在 Inspector 中临时新建并保存的渐变、曲线等子资源。

两者可以互相转换：在 Inspector（检查器）中选中该资源属性，清空它的 path 字段再保存场景，外部资源就变成了内置资源。内置资源的优点是场景自包含，移动或重命名外部文件不会丢引用；缺点是不便于在多个场景间复用。

## 3. 共享缓存：最重要的易错点

Godot 对资源做了共享缓存：同一份磁盘资源在整个项目里只加载一次，之后所有请求返回的都是同一个实例。于是得到一个关键结论：

多个节点引用同一资源时，你在代码里修改这个资源，会影响到所有引用它的节点。

举例说明。假设我们有一个自定义资源类 BotStats（下一节会讲怎么定义），两个机器人场景实例在编辑器里都被拖入了同一个 bot_stats.tres：

```gdscript
# bot.gd
extends CharacterBody2D

@export var stats: BotStats

func take_damage(amount: int) -> void:
    stats.health -= amount
```

运行时 Bot A 受伤扣血，Bot B 的血量也莫名其妙跟着减少——因为两个 Bot 持有的是同一个资源实例，修改的就是同一份数据。这不是 bug，是资源的默认行为。

解法有两种：

1. 在代码中调用 duplicate()，为当前对象生成一份独立副本：

```gdscript
func _ready():
    stats = stats.duplicate()
```

2. 在编辑器中右键该属性，选择 Make Unique，让这个节点单独持有一份副本。

另外注意：内置资源同样遵守共享规则，实例化场景时，场景内部的内置资源也只加载一份。把"资源默认共享、按需复制"这个模型记牢，你就能解释绝大多数"我改了 A，为什么 B 也变了"的灵异现象。

## 4. load 与 preload

```gdscript
var tex = load("res://robi.png")          # 运行时加载
var tex2 = preload("res://robi.png")      # 编译时加载
$sprite.texture = tex
```

两者的区别：

- load() 在程序执行到这一行时才加载资源，路径可以保存在变量里动态拼接。
- preload() 在脚本编译阶段就完成加载，因此它的参数必须是常量字符串路径；这个关键字只在 GDScript 中可用，C# 没有对应物。
- 由于共享缓存的存在，对同一路径无论 load 还是 preload，拿到的都是同一个资源实例。

需要"确保依赖在脚本加载时就绪"时用 preload（例如子弹场景模板），需要"按需加载、路径动态"时用 load。

## 5. 用资源实例化场景

既然 .tscn 是 PackedScene 资源，"生成子弹"这样的需求就变成了两步：加载资源，实例化节点。

```gdscript
func _on_shoot():
    var bullet = preload("res://bullet.tscn").instantiate()
    add_child(bullet)
```

这是 Godot 中最高频的代码模式之一：任何"按模板生成对象"的需求——子弹、敌人、掉落物、特效——都从这两行起步。注意实例化出来的节点还需要 add_child() 挂到场景树上才会真正进入游戏。

## 6. 自定义资源

当一组数据需要"在 Inspector 里编辑、保存成文件、在多个对象间复用"时，自定义资源就是正解。写法非常固定：class_name + extends Resource，再用 @export 把字段暴露给 Inspector。

```gdscript
class_name BotStats
extends Resource

@export var health: int
@export var sub_resource: Resource
@export var strings: PackedStringArray

# 每个参数必须有默认值，否则 Inspector 编辑会出错
func _init(p_health = 0, p_sub_resource = null, p_strings = []):
    health = p_health
    sub_resource = p_sub_resource
    strings = p_strings
```

几个要点：

- 必须写 class_name：只有注册了全局类名，它才会出现在资源创建对话框的搜索结果里。
- _init 的每个参数都必须有默认值：Inspector 需要在无参数情况下构造资源实例，缺默认值会导致编辑时出错。
- 保存格式二选一：.tres 是文本格式，diff 一目了然，利于版本控制；.res 是二进制格式，体积略小。团队项目一般统一用 .tres。

在编辑器中的完整使用流程：

1. 保存上面这个 bot_stats.gd。
2. 在文件系统（FileSystem）停靠栏右键 -> 新建资源（New Resource），搜索 BotStats 并创建。
3. 保存为 bot_stats.tres。
4. 在 Inspector 中像编辑普通对象一样填写 health 等字段。
5. 把 .tres 文件拖到任意节点的 @export var stats: BotStats 属性上，各节点可引用同一份或各自一份。

最后一个坑：脚本内部类（inner class）不能正确序列化自定义属性，自定义资源请写成独立的脚本文件。

这套"自定义资源当配置表"的用法在真实项目里能把数据与代码彻底分离。花语花园（flower-card）项目的 data/ 目录就是纯 .tres 数据目录：flowers（18 个花种）、synergy（协同）、roguelike（规则卡）、talent（天赋）等 12 类数据全部用 .tres 外置，策划案里的"新增 100 种花种组合"不需要改一行核心代码——这就是把第 6 节的流程用到极致的工程形态。数值外置的另一个好处与第 3 节呼应：不同花种各自一份 .tres 文件，天然避开了共享缓存的"改 A 动 B"问题。

## 7. 动手实践

练习一（资源 vs 节点辨析）。任务：在新建场景里依次拖入一张 Texture、一段 .gd 脚本、一个保存过的 .tscn 文件，观察 Inspector 里它们各自的图标与属性；然后回答：哪个不是资源？为什么场景也能算资源？提示：回想第 1 节的定义——看它是否以"文件"形态存在于文件系统停靠栏，是否不进场景树就能被引用。

练习二（亲手复现共享缓存陷阱）。任务：按第 6 节流程创建 BotStats 自定义资源，保存两份 .tres：一份拖给两个 Bot 共用，另一份给两个 Bot 各复制一份（duplicate 或 Make Unique）；运行后对两个 Bot 各调一次 take_damage，打印双方血量。验证标准：共用版两边血量同时变，独立版互不影响。这个实验做一次，第 3 节的结论就从"背下来的"变成"见过的"。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```gdscript
# main.gd：场景里放两个 Bot 节点，分别引用同一份或两份不同的 bot_stats.tres
extends Node

func _ready():
    var bot_a: CharacterBody2D = $BotA
    var bot_b: CharacterBody2D = $BotB
    print("before: A=%d B=%d" % [bot_a.stats.health, bot_b.stats.health])
    bot_a.take_damage(30)
    print("after:  A=%d B=%d" % [bot_a.stats.health, bot_b.stats.health])
    # 共用版输出 after: A=70 B=70（同一实例被改）
    # 独立版输出 after: A=70 B=100（各改各的）
```

对照要点：打印放在 take_damage 之后一行内同时输出两个 Bot，才能一眼看出"改 A 动没动 B"；要进一步验证"是同一个实例"，再打印 `bot_a.stats == bot_b.stats`——共用版为 true，独立版为 false，直接确认共享缓存的行为。

</details>

练习三（把配置表落成 .tres）。任务：给一个射击游戏定义 WeaponStats 自定义资源（伤害、射速、弹药量三个字段），创建三种武器的 .tres（手枪、霰弹枪、狙击枪），切换武器时用 load() 按路径动态加载。提示：路径可以用字符串拼接（如 `"res://data/weapons/%s.tres" % weapon_name`），这正是第 4 节说的"load 的路径可以动态"的用武之地。

## 易错点清单

- 修改资源前先想清楚谁在共享它；需要独立副本时用 duplicate() 或编辑器的 Make Unique。
- 脚本内部类不能序列化自定义属性，自定义资源写成独立脚本文件。
- _init 参数缺默认值，Inspector 编辑时就会出错——报错信息不会提示你缺的是默认值，逐个补齐即可。

## 小结

资源是纯数据容器，节点消费数据做事；.tscn 场景本身也是资源（PackedScene）。资源默认全局共享一份，改一处会影响所有引用者，需要独立时用 duplicate() 或 Make Unique。preload 在编译期加载且仅限常量路径，load 在运行期加载。自定义资源用 class_name + extends Resource + @export，保存为利于版本控制的 .tres——真实项目里它就是"数据与代码分离"的配置表方案。跨场景存活的运行时状态不属于资源，答案在 [Autoload 单例与场景切换管理](/godot/055-AutoloadAndSceneManagement)。

## 参考链接

- 资源（Resources）官方教程：https://docs.godotengine.org/en/stable/getting_started/step_by_step/resources.html
- 实例化（Instancing）官方教程：https://docs.godotengine.org/en/stable/getting_started/step_by_step/instancing.html
- 项目设置（Project Settings）官方文档：https://docs.godotengine.org/en/stable/tutorials/editor/project_settings.html
