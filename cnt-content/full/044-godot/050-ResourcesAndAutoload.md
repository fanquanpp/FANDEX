---
order: 50
title: 资源与自动加载单例
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 理解 Godot 资源的数据容器本质与共享缓存机制，学会自定义 Resource 与用 Autoload 实现跨场景全局状态
author: fanquanpp
updated: '2026-09-22'
related: ['godot/020-NodesScenesAndInstancing', 'godot/040-SignalsObserving']
prerequisites: ['godot/020-NodesScenesAndInstancing']
---

Godot 的世界由两类东西构成：负责"做事"的节点（Node），和负责"装数据"的资源（Resource）。前几篇我们一直在和节点、场景打交道，本篇补上另一半拼图：理解资源的本质，以及它最容易踩坑的共享缓存机制。之后我们再解决一个真实游戏中绕不开的问题：玩家血量、分数这类数据如何跨场景存活？官方给出的答案就是自动加载单例（Autoload Singleton）。

## 学习目标

- 说清资源与节点的分工，能列出至少五种常用资源子类
- 深入理解资源共享缓存机制：改一处为什么会影响所有引用者，以及 duplicate() 与 Make Unique 两种解法
- 区分 load() 与 preload() 的加载时机与使用限制
- 创建自定义资源（class_name + extends Resource + @export）并保存为 .tres 文件
- 配置 Autoload 单例，掌握官方场景切换器的写法与背后的时序原理

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

## 7. Autoload：跨场景的全局状态

为什么需要 Autoload（自动加载）？因为 GDScript 没有全局变量——每个脚本的数据都隶属于它的实例，场景切换后旧节点连同数据一起销毁。而游戏总有些状态必须跨场景存活：玩家血量、金币、物品栏、设置项。

配置路径：Project -> Project Settings -> Globals > Autoload。点添加，填入注册名和 res:// 脚本或场景路径。可以添加场景或脚本，但脚本必须继承 Node；条目名称会成为该节点的 name；列表按从上到下的顺序依次加载。

```gdscript
# player_variables.gd
extends Node

var health = 100
var score = 0
```

配置完成后，任何脚本都可以直接用注册名访问它：

```gdscript
PlayerVariables.health -= 10
```

不需要 get_node，不需要 import——注册名就是一个全局可用的标识符。

## 8. Autoload 在场景树中的位置

Autoload 节点被加在根视口（root viewport）下，并且排在所有其他场景节点之前。利用这个固定顺序有一个实用技巧：root.get_child(-1)（最后一个子节点）总是当前场景。官方教程的场景切换器正是靠这个技巧在启动时拿到当前场景：

```gdscript
extends Node

var current_scene = null

func _ready():
    var root = get_tree().root
    current_scene = root.get_child(-1)
```

因为 Autoload 最早加载，此刻 _ready 执行时根视口下最后一个孩子恰好是游戏主场景的根节点。

## 9. 官方场景切换器逐行讲解

```gdscript
func goto_scene(path):
    # 信号回调中立即删场景会崩溃，推迟到稍后执行
    _deferred_goto_scene.call_deferred(path)

func _deferred_goto_scene(path):
    current_scene.free()
    var s = ResourceLoader.load(path)
    current_scene = s.instantiate()
    get_tree().root.add_child(current_scene)
    get_tree().current_scene = current_scene   # 与 change_scene_to_file 行为兼容
```

逐行拆解：

- goto_scene(path) 是对外入口。它自己不做任何实际工作，只把真正的切换逻辑用 call_deferred 推迟执行。原因是：切换场景通常由信号回调触发（比如按钮按下），此刻还处在场景树的信号处理过程中，立即删除当前场景会崩溃，必须等到当前流程结束后再动手。
- _deferred_goto_scene(path) 中先用 free() 删除旧场景。此时已经脱离信号回调上下文，立即销毁是安全的。
- ResourceLoader.load(path) 加载新场景资源，效果等价于 load()。
- instantiate() 把 PackedScene 实例化为节点树。
- add_child() 把新场景挂到根视口下。
- 最后把 get_tree().current_scene 指向新场景根节点，使其与内置的 change_scene_to_file() 行为保持兼容（例如 reload_current_scene() 才能正确工作）。

顺带了解 SceneTree 官方切换场景的时序：当前场景先被移出场景树（此刻旧场景调用 get_tree() 会返回 null），到帧末旧场景被安全删除，新场景加入树。如果你没有特殊需求，直接使用 get_tree().change_scene_to_file() 更简单；手动写切换器的价值在于完全掌控每一步。

## 10. 易错点清单

- 永远不要对 Autoload 节点调用 free() 或 queue_free()。它与项目同生命周期，删除它会导致崩溃。
- 信号回调中不要直接删除当前场景，一律用 call_deferred 推迟到稍后执行，上一节的切换器就是标准写法。
- Autoload 并不是语言层面的强制单例：它只是"启动时自动实例化并注册全局名"的普通节点，引擎不会替你保证设计模式意义上的唯一性语义，别与其他语言中受保护的 singleton 画等号。
- 修改资源前先想清楚谁在共享它；需要独立副本时用 duplicate() 或编辑器的 Make Unique。

## 小结

资源是纯数据容器，节点消费数据做事；.tscn 场景本身也是资源（PackedScene）。资源默认全局共享一份，改一处会影响所有引用者，需要独立时用 duplicate() 或 Make Unique。preload 在编译期加载且仅限常量路径，load 在运行期加载。自定义资源用 class_name + extends Resource + @export，保存为利于版本控制的 .tres。Autoload 是 GDScript 缺乏全局变量的官方解法，注册名全局可访问；删除当前场景或操作 Autoload 本身时牢记 call_deferred 与"不要 free()"两条红线。

## 参考链接

- 资源（Resources）官方教程：https://docs.godotengine.org/en/stable/getting_started/step_by_step/resources.html
- 单例（自动加载 Autoload）官方教程：https://docs.godotengine.org/en/stable/tutorials/scripting/singletons_autoload.html
- 实例化（Instancing）官方教程：https://docs.godotengine.org/en/stable/getting_started/step_by_step/instancing.html
- SceneTree 类文档：https://docs.godotengine.org/en/stable/classes/class_scenetree.html
- 项目设置（Project Settings）官方文档：https://docs.godotengine.org/en/stable/tutorials/editor/project_settings.html
