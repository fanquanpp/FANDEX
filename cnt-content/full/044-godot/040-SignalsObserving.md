---
order: 40
title: 信号：节点间的广播通信
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 用 Godot 信号的观察者模式解耦节点，掌握声明连接发射与编辑器连线两种方式
author: fanquanpp
updated: '2026-09-22'
related:
  - 'godot/030-FirstScriptAndLifecycle'
  - 'gdscript/090-SignalsAwaitCoroutines'
prerequisites:
  - 'godot/030-FirstScriptAndLifecycle'
---

上一篇我们让单个节点动了起来，但游戏从来不是孤立节点的集合：按钮被按下时计分板要刷新，敌人进入范围时陷阱要触发，血量归零时游戏要结算。如果让按钮的代码直接去操作计分板，两个节点就被焊死在一起了。Godot 为此提供了信号（Signal）：节点在特定事件发生时向外广播的"消息"，任何关心这个事件的节点都可以监听它，而发射者完全不需要知道谁在听。这是 Godot 中最重要的解耦机制，本篇从概念到实操完整讲一遍。

本篇的示例是官方"第一个脚本"课程的延续——同一个旋转的精灵，这次它学会了听从按钮与计时器的指挥。自定义信号的完整语法、连接标志以及用 await 等待信号的写法，将在 gdscript 模块的 090 篇深入展开。

## 学习目标

- 说清信号是什么，理解它作为观察者模式实现所带来的解耦价值；
- 了解 Godot 4 起信号是一等类型，可直接作为值传递；
- 用 signal 关键字声明无参与带参信号，用 emit() 发射，并遵循过去时命名建议；
- 用编辑器连线与代码 connect() 两种方式连接信号，掌握回调命名约定；
- 认识 Button.pressed、Timer.timeout、Area2D.body_entered 等常用内置信号；
- 逐行读懂官方完整示例，理解 timer.timeout.connect(_on_timer_timeout) 的作用；
- 用 Callable.bind() 给回调附加额外参数；
- 规避三个典型错误：节点改名后路径失效、回调中直接删除当前场景、同一信号重复连接。

## 信号是什么

信号（Signal）是节点在特定事件发生时发出的"消息"。按钮被按下时发出 pressed，计时器到点时发出 timeout，物体进入检测区域时发出 body_entered。机制本身没有魔力：它只是"某个事件发生了"这条信息的广播。

官方文档对信号的定位是：**Godot 对观察者模式（Observer Pattern）的实现**。观察者模式的价值在于解耦——发射者不需要知道谁在监听、有多少个监听者、监听者拿到消息后做什么。按钮只负责宣布"我被按下了"，至于这条消息是让计分板加分、让门打开还是让游戏退出，按钮一概不知，也不必知道。

这种解耦在实践中的回报非常直接：更换 UI 时不用改游戏逻辑；同一个事件可以同时被任意多个节点响应；每个节点只维护自己的职责，脚本更短、更好测试。上一篇提到官方不建议用 `..` 访问父节点，推荐的替代方案正是信号——用"发布事件"代替"伸手到别人家里改东西"。

## Godot 4：信号是一等类型

从 Godot 4.0 起，信号是**一等类型（First-class）**：与 Callable 一样，信号可以直接作为值来传递——赋给变量、当作函数参数、在代码中直接引用，不再需要 3.x 时代那种基于字符串的形式。这意味着 `timer.timeout` 本身就是一个值，你可以把它传给任何需要它的地方。本篇用到的 connect() 与之后的 await，都建立在"信号即值"这个语言特性之上。

## 声明与发射自定义信号

内置信号覆盖不了的场景，可以用 signal 关键字声明自己的信号：

```gdscript
signal health_depleted
signal health_changed(old_value, new_value)
```

第一行声明了一个不带参数的信号，语义是"血量耗尽了"这个事件发生了；第二行声明了带两个参数的信号，把旧值与新值一起广播出去。参数名不只是文档：它们会显示在编辑器的信号面板中，连接时帮助你看清这个信号会传什么。

声明只是登记，事件发生时要主动发射（emit）：

```gdscript
health_changed.emit(old_health, health)
```

emit 的实参按声明顺序对应信号的参数。结合变量，一个最小的完整用法是：

```gdscript
signal health_changed(old_value, new_value)

var health = 100

func take_damage(amount):
    var old_health = health
    health -= amount
    health_changed.emit(old_health, health)
```

命名方面，官方建议信号名使用**过去时动词**，例如 door_opened、score_changed、health_changed——信号表达的是"某件事已经发生了"，监听者据此决定反应。这与函数命名（动词原形，描述"要做什么"）形成清晰对照。

## 连接信号的两种方式

信号发出去了，要有接收者才有意义。把"接收者及其回调函数"登记到信号上，这个动作叫连接（connect）。Godot 提供编辑器与代码两种方式，效果等价。

**编辑器方式**：在场景停靠栏选中发射信号的节点，切换到节点（Node）停靠栏的 Signals（信号）标签，找到目标信号并双击；在弹出的连接对话框中选择接收节点与方法，点击 Connect。对话框分两种模式：简单模式会自动生成回调函数的骨架代码；高级模式则可以把信号连接到任意节点的方法，还能附加参数。这种方式直观，适合固定的、场景内的连接。

**代码方式**：调用信号对象的 connect() 方法，传入一个 Callable（可调用引用）：

```gdscript
character_node.health_changed.connect(lifebar_node._on_Character_health_changed)
```

这行代码的含义是：每当 character_node 发出 health_changed，就调用 lifebar_node 上的 _on_Character_health_changed 方法。代码方式适合运行时动态建立的关系，例如给刚实例化的子弹连接信号。

无论哪种方式，回调函数的命名都遵循同一约定：`_on_节点名_信号名`，例如按钮回调叫 _on_button_pressed。统一的命名让看到函数名就知道它挂在哪个信号上。

## 常用内置信号

每个节点类都自带一批信号，初学阶段最常打交道的三个：

- **Button.pressed**：按钮被按下时发出，UI 交互的起点；
- **Timer.timeout**：计时器到点时发出，配合 wait_time 可以实现延时触发、周期刷新；
- **Area2D.body_entered**：有物理体进入检测区域时发出，拾取物、触发器、危险区域都靠它。

它们的连接方式与自定义信号完全一致，学会了自定义信号就学会了全部。

## 官方完整示例逐行讲解

下面是官方信号教程的完整示例：同一个旋转移动的精灵，这次由计时器控制闪烁、由按钮控制暂停。场景中有一个挂载本脚本的 Sprite2D 节点，它带一个名为 Timer 的子节点；场景里另有一个按钮（Button），其 pressed 信号连接到本脚本的 _on_button_pressed：

```gdscript
extends Sprite2D

var speed = 400
var angular_speed = PI

func _ready():
    var timer = get_node("Timer")
    timer.timeout.connect(_on_timer_timeout)

func _process(delta):
    rotation += angular_speed * delta
    var velocity = Vector2.UP.rotated(rotation) * speed
    position += velocity * delta

func _on_button_pressed():
    set_process(not is_processing())

func _on_timer_timeout():
    visible = not visible
```

逐行看新增的部分：

- `func _ready():`：节点就绪回调，是建立连接的标准位置——此时子节点都已存在；
- `var timer = get_node("Timer")`：按相对路径找到名为 Timer 的子节点；
- `timer.timeout.connect(_on_timer_timeout)`：把计时器的 timeout 信号连接到自己的 _on_timer_timeout 方法。从此计时器每次到点，这一行登记的回调就会被调用——这就是"订阅"；
- `func _process(delta):` 中的三行与上一篇完全相同：旋转并沿自身朝向移动；
- `func _on_button_pressed():`：按钮的回调。`set_process(not is_processing())` 用当前状态的取反值开关 _process，实现"暂停/恢复移动"——按钮的 pressed 信号可以像上面一样在编辑器里连线到这个方法，也可以在 _ready 中用 `$Button.pressed.connect(_on_button_pressed)` 以代码连接；
- `func _on_timer_timeout():`：计时器的回调，`visible = not visible` 切换可见性，精灵便按计时节奏闪烁。

整个示例没有任何一处直接"调用"别的节点的代码：计时器不知道精灵会闪烁，按钮不知道精灵会暂停，它们只是发出信号；精灵订阅了这两个事件并决定自己的反应。这正是观察者模式的解耦效果。

## 用 Callable.bind() 附加参数

有时多个信号源共用同一个回调，回调里需要知道"是谁触发的"；或者回调需要一些额外的上下文。Callable 的 bind() 方法可以为回调**预先绑定参数**，规则是：绑定的值会附加在信号自身参数**之后**传给回调。

```gdscript
signal health_changed(old_value, new_value)

func _ready():
    health_changed.connect(_on_health_changed.bind(get_node("Lifebar")))

func _on_health_changed(old_value, new_value, lifebar):
    pass  # 前两个参数来自信号本身，lifebar 是 bind() 附加的值
```

信号传两个参数，回调签名就先接两个信号参数，再接 bind() 绑定的一个参数。有了这个机制，"一个回调服务多个来源"或"回调需要环境引用"都不再需要为每个来源复制一份几乎相同的函数。

## 易错点

- **节点改名后路径失效**。get_node("Timer") 按名称查找，一旦在编辑器里把节点改名，代码里的路径必须同步修改，否则运行时会找不到节点。重命名节点时记得全局检查代码中的引用路径；
- **信号回调中直接删除当前场景**。在信号回调里立即 free() 当前场景会出问题——回调自身还运行在即将被销毁的对象上。官方场景切换教程的解决方案是先推迟：定义一个 `_deferred_goto_scene` 函数，回调里通过 `call_deferred` 把真正的释放与切换推迟到稍后安全时机执行；
- **同一信号与同一 Callable 重复连接会报错**。写在 _ready 这类可能被多次执行路径中的 connect 要格外小心，重复连接同一信号到同一个 Callable 会直接报错。确有需要时，先确认连接状态或了解连接标志（详见 gdscript/090 篇）。

## 小结

信号是 Godot 对观察者模式的实现：节点在事件发生时广播消息，监听者自行响应，发射者与接收者完全解耦。Godot 4 起信号是一等类型，可直接作为值传递。声明用 signal 关键字（参数名会显示在编辑器信号面板），发射用 emit()，命名建议过去时动词；连接既可以在编辑器中双击信号完成（简单模式自动生成回调、高级模式可连任意节点并附加参数），也可以在代码中用 signal.connect(callable)，回调按 `_on_节点名_信号名` 约定命名。Button.pressed、Timer.timeout、Area2D.body_entered 是最常见的三个内置信号，连接方式与自定义信号完全一致。Callable.bind() 能把额外参数附加到信号参数之后。避开三个坑：改名后同步路径、回调中删场景用 call_deferred 推迟、避免重复连接。至此，节点、场景、脚本、信号四件套已经凑齐，你已具备搭建一个完整小游戏交互的全部基础。想进一步深挖信号——自定义信号完整语法、连接标志、用 await 等待信号——请前往 gdscript 模块的 090 篇。

## 参考链接

- [信号（官方入门教程）](https://docs.godotengine.org/en/stable/getting_started/step_by_step/signals.html)
- [编写第一个脚本（官方入门教程）](https://docs.godotengine.org/en/stable/getting_started/step_by_step/scripting_first_script.html)
- [单例（Autoload）（官方教程）](https://docs.godotengine.org/en/stable/tutorials/scripting/singletons_autoload.html)
