---
order: 30
title: 第一个脚本与生命周期
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 写出第一个 GDScript 脚本，逐行理解官方示例，掌握 _init _ready _process _physics_process 的调用时机与 delta 的用法
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'godot/020-NodesScenesAndInstancing'
  - 'godot/040-SignalsObserving'
  - 'gdscript/010-GDScriptLanguageOverview'
prerequisites:
  - 'godot/020-NodesScenesAndInstancing'
---

上一篇我们理解了节点与场景的组织方式，但那只是"骨架"：节点自己不会动、不会思考。让节点行为起来的工具是脚本（Script）。本篇带你给节点挂上第一个 GDScript 脚本，逐行读懂官方的第一个示例，并系统梳理引擎调用脚本的时机——_init、_ready、_process、_physics_process 各自在什么时候触发，delta 参数到底怎么用。这些回调是之后所有游戏逻辑的地基，值得一次讲透。

需要说明的是：本篇聚焦"脚本如何与引擎协作"，GDScript 语言本身的细节（变量类型、函数语法、match 等）将在 gdscript 模块中系统展开，本篇只解释示例中用到的最小语法集合。

## 学习目标

- 在编辑器中给节点挂载脚本，理解 extends 的作用与 res:// 保存约定；
- 逐行读懂官方第一个脚本示例，理解 delta 与运动的关系；
- 说清 _init、_ready、_process、_physics_process 四个回调的调用时机与差异；
- 用 delta 编写帧率无关的运动代码，避免帧率假设带来的错误；
- 用 set_process、set_physics_process 与 is_processing() 开关和查询处理状态；
- 按顺序复述脚本成员的初始化链条，理解 @onready 与导出值在链条中的位置；
- 记住三个命名与语法易错点：Title Case 与 snake_case、下划线开头约定、缩进即语法。

## 挂上第一个脚本

在场景中选中一个节点，为它附加脚本（Attach Script），编辑器会引导你创建一个 `.gd` 文本文件并自动写入开头两行。脚本文件保存在项目目录下，也就是 `res://` 路径之下，随项目一起分发。

脚本的第一行通常是 `extends` 语句，声明这个脚本扩展哪个内置类。例如 `extends Sprite2D` 的含义是：这个脚本描述的就是一个 Sprite2D 节点，它拥有 Sprite2D 的全部属性和方法，同时可以新增自己的变量与函数。换一个说法：挂了脚本的节点还是原来的节点类型，只是被"加装"了一层自定义行为。

## 官方第一个脚本：逐行讲解

下面是官方入门教程中的第一个完整脚本，功能是让一个精灵（Sprite2D）一边自转一边沿自身朝向前进：

```gdscript
extends Sprite2D

var speed = 400
var angular_speed = PI

func _process(delta):
    rotation += angular_speed * delta
    var velocity = Vector2.UP.rotated(rotation) * speed
    position += velocity * delta
```

把它挂到一个 Sprite2D 节点上并运行场景，精灵就会画出一条圆形轨迹。逐行拆解：

- `extends Sprite2D`：声明基类，本脚本扩展 Sprite2D；
- `var speed = 400`：线速度，每秒 400 像素；
- `var angular_speed = PI`：角速度，每秒 PI 弧度。PI 弧度等于半圈，所以精灵每两秒自转一整周；
- `func _process(delta):`：_process 是引擎每帧自动调用的回调，delta 是距上一帧经过的秒数；
- `rotation += angular_speed * delta`：rotation 是节点的旋转角（单位弧度）。每帧增加"角速度乘以经过秒数"，累积起来就是匀速旋转；
- `var velocity = Vector2.UP.rotated(rotation) * speed`：这一行是示例的精髓。Vector2.UP 是一个"向上"的单位方向向量；rotated(rotation) 把它按当前旋转角旋转，也就是把「向上」的方向旋转成精灵此刻的朝向；再乘以 speed，得到一个"每秒走多少像素、朝哪个方向走"的速度向量；
- `position += velocity * delta`：每帧把"速度乘以经过秒数"累加到位置上，精灵就沿自身朝向匀速前进。

旋转改变了朝向，朝向又决定了移动方向，两者叠加正好形成圆周运动。请务必亲手输入并运行一次：官方教程的编程第一课，核心就是让这两行 `+= ... * delta` 成为肌肉记忆。

## 生命周期：四个关键回调

Godot 不会随意调用你的代码，而是在明确的时机调用明确的回调。初学阶段必须掌握四个：

**_init()：构造函数**。对象在内存中被创建时调用，此时它还没有进入场景树。适合做与场景无关的初始化，例如给成员变量赋初值。

**_ready()：节点就绪**。当节点**及其全部子节点**都就绪后调用。三个关键性质：每个节点只调用一次；同一棵子树中**子节点先于父节点**调用——所以父节点的 _ready 里可以放心访问全部子节点；把节点从树上移除再添加回来，_ready **不会**再次触发。

**_process(delta)：每帧回调**。每一帧调用一次，delta 为距上一帧的秒数。适合放视觉表现、非物理的状态更新等"跟着画面走"的逻辑。

**_physics_process(delta)：物理帧回调**。以固定速率调用（默认每秒 60 次），在**每个物理步之前**执行。速率可以在 Project Settings（项目设置）的 Physics -> Physics -> Common 分区中通过 Physics Fps 修改。规则很明确：**与物理相关的移动代码必须写在这里**，例如角色移动、碰撞体位移，否则物理模拟会出现不稳定。

一句话记忆：创建时 _init，就绪时 _ready，每帧 _process，每个物理步 _physics_process。

## 理解 delta：帧率无关的运动

delta 是"距上一帧的秒数"。它的存在是为了解决一个经典问题：同样每帧移动 5 像素，在每秒 30 帧的机器上每秒移动 150 像素，在每秒 120 帧的机器上每秒移动 600 像素——游戏速度完全取决于帧率。正确做法是把"每秒的变化量"乘以 delta，得到"这一帧应该变化多少"：

```gdscript
func _process(delta):
    position.x += 5             # 错误示范：每帧移动 5 像素，帧率越高移动越快
    position.y += 200 * delta   # 正确写法：每秒 200 像素，与帧率无关
```

由此派生三条纪律：

- **不要假设帧率固定**。玩家的设备、场景复杂度、后台程序都会让帧率波动，任何按"每帧固定变化"设计的逻辑都是隐患；
- **不要忽略 delta**。忘记乘 delta 是新手最常见的 bug 来源，表现为"在别人的电脑上游戏变快或变慢"；
- **不要用 delta 精确测量真实时间**。帧率骤降时 delta 会被放大（上一帧到这一帧真实隔了很久），它反映的是帧间隔而非稳定时钟。需要计时时，应使用专门的计时机制，例如 SceneTree 的 create_timer()。

## 打开、关闭与查询处理

引擎提供了手动控制回调开关的方法，这在"暂停游戏"、"只在特定状态更新"等场景非常有用：

- `set_process(true/false)`：开启或关闭本节点的 _process；
- `set_physics_process(true/false)`：开启或关闭本节点的 _physics_process；
- `is_processing()`：查询 _process 当前是否开启。

官方信号教程的示例中就有这样一个回调，一行完成"暂停/恢复移动"的切换：

```gdscript
func _on_button_pressed():
    set_process(not is_processing())
```

按下按钮时，用当前状态的取反值重新设置开关：正在处理就停，停着就恢复。这个惯用法会在下一篇的完整示例中再次出现。

## 成员初始化顺序

脚本成员变量什么时候被赋值、回调按什么顺序触发，官方给出了完整的链条：

默认值 -> 按脚本顺序赋值 -> _init() -> 导出值 -> @onready -> _ready()

逐段解释：引擎先写入类型的默认值；接着**按脚本中出现顺序**执行成员初始化器，所以写在后面的变量可以引用前面已初始化的变量；然后调用 _init()；随后，从场景数据写入**导出值**（@export 变量在检查器中设置的值会覆盖代码默认值）；再执行 @onready 变量的初始化；最后进入 _ready()。用一个带注释的骨架看全貌：

```gdscript
extends Node

var first = 10            # 按脚本顺序执行的初始化器
var second = first * 2    # 可以引用上面已初始化的成员

func _init():
    pass                  # _init 在这里执行，此时还未进入场景树

@export var health = 100  # 导出值稍后从场景数据写入，覆盖这里的默认值

@onready var label = get_node("Label")  # 就绪前一刻才查找子节点

func _ready():
    pass                  # 最后执行，此时可以放心访问全部子节点
```

记住这条链，就能解释前一篇的几个"怪现象"：为什么变量定义处的 get_node() 拿不到子节点（初始化器执行得太早），为什么 @onready 能解决（被推迟到 _ready 前一刻），为什么检查器里改的值总能生效（导出值在代码初始化之后写入）。

## 命名与语法的三个易错点

- **检查器显示与代码名称不一致**。检查器（Inspector）里的属性用 Title Case 显示，例如 Texture；而在代码里访问同一属性要用 snake_case，例如 texture。看到教程写"设置 Texture 属性"，代码里对应的就是 `$sprite.texture = ...`；
- **引擎虚方法以下划线开头**。_init、_ready、_process、_physics_process 这些由引擎调用的回调，按惯例都以单个下划线开头，用来区分"引擎调用我"与"我自己定义的函数"。你自己写的普通函数不要随意套用这个前缀；
- **GDScript 基于缩进**。与 Python 类似，缩进决定代码块的归属：函数体、if 分支内的每一行都要保持一致的缩进层级，缩进错了代码就不是你以为的结构了。

## 小结

本篇完成了从"场景骨架"到"活的游戏对象"的跨越：脚本通过 extends 扩展节点类型，保存在 res:// 之下；引擎在明确时机调用明确回调——对象创建时 _init()，节点及子节点就绪时 _ready()（每节点一次、子先于父、重挂不再触发），每帧 _process(delta)，每个物理步之前 _physics_process(delta)。delta 是距上一帧的秒数，一切运动代码都应写成"每秒变化量乘以 delta"，不假设帧率、不忽略 delta、不用它精确计时。set_process 与 set_physics_process 提供运行时开关，is_processing() 负责查询。成员初始化遵循"默认值 -> 按脚本顺序赋值 -> _init -> 导出值 -> @onready -> _ready"的固定链条。命名上记住三件事：检查器 Title Case 对应代码 snake_case，引擎虚方法以 _ 开头，缩进即语法。语言层面的更多细节——类型系统、函数、match、协程——将在 gdscript 模块展开；下一篇我们学习让节点之间说话的机制：信号。

## 参考链接

- [编写第一个脚本（官方入门教程）](https://docs.godotengine.org/en/stable/getting_started/step_by_step/scripting_first_script.html)
- [Idle 与物理处理（官方教程）](https://docs.godotengine.org/en/stable/tutorials/scripting/idle_and_physics_processing.html)
- [节点与场景（官方入门教程）](https://docs.godotengine.org/en/stable/getting_started/step_by_step/nodes_and_scenes.html)
