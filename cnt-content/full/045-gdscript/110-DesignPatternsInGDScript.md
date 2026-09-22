---
order: 110
title: GDScript 设计模式
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 把经典设计原则与常用模式落到 GDScript 惯用法上，知道什么时候该用什么时候不该用
author: fanquanpp
updated: '2026-09-22'
related:
  - 'gdscript/070-ClassesOOPAndMemory'
  - 'gdscript/090-SignalsAwaitCoroutines'
  - 'godot/050-ResourcesAndAutoload'
prerequisites:
  - 'gdscript/070-ClassesOOPAndMemory'
  - 'gdscript/090-SignalsAwaitCoroutines'
---

设计模式（design patterns）是前人总结的代码组织套路，GoF 的 23 种模式按创建型、结构型、行为型分类，配合 SOLID 等设计原则一起流传。但套路不能照搬：GDScript 有自己的惯用法——信号、Callable、Autoload、枚举加 match——很多经典模式在 GDScript 里不需要"搭架子"，语言本身已经给了现成的对应物。

本篇先速览设计原则，再把几个最常用的模式逐一映射到 GDScript 写法上，最后讨论最重要的问题：什么时候不该用模式。类与对象的基础（继承、静态成员、抽象类）见 070 篇，信号与 await 见 090 篇。

## 学习目标

- 用一句话说出 SOLID 五原则与合成复用原则、迪米特法则在 GDScript 语境中的含义；
- 用 static var 与 Autoload 两种方式实现单例，并知道如何选择；
- 认识信号就是观察者模式的官方实现，写出解耦的成就监听示例；
- 用 enum 加 match 实现有限状态机，理解它比布尔标志组合好在哪里；
- 用 Callable 实现命令队列，理解撤销与重放的思路；
- 掌握静态工厂方法与场景工厂两种工厂写法；
- 了解迭代器模式与对象池在 GDScript 中的对应物；
- 建立克制意识：知道什么时候不该引入模式。

## 设计原则速览

SOLID 五原则各用一句话落到 GDScript 语境：

- 单一职责原则（SRP）：一个脚本只因为一个原因被修改——移动逻辑和战斗数值不要挤在同一个文件里；
- 开闭原则（OCP）：对扩展开放、对修改关闭——用新脚本和新信号扩展行为，而不是反复修改已经稳定的旧代码；
- 里氏替换原则（LSP）：任何用到父类的地方换成子类都必须正常工作——重写方法时保持父类约定的行为，is 类型检查才不会失效；
- 接口隔离原则（ISP）：不强迫类依赖它用不到的方法——与其写一个臃肿的基类，不如拆成多个小脚本按需组合；
- 依赖倒置原则（DIP）：高层逻辑依赖抽象而非具体实现——通过信号、Callable 这样的抽象通道通信，而不是把具体类硬编码进调用链。

再补两条常与 SOLID 并列的原则：

- 合成复用原则：优先组合已有对象来实现复用，少用继承——Godot 场景树的节点组合本身就是这种思路的体现；
- 迪米特法则：只与直接协作者通信，不要顺着引用链一路深挖——在 Godot 里表现为少写 a.b.c.d 式的长链访问，多用信号把数据送过来。

关于"统一接口"：GDScript 没有 interface 接口关键字，4.5 起引入的 @abstract 抽象类与抽象方法承担了这个角色——抽象类不能实例化，具体子类必须实现全部抽象方法，详见 070 篇。

## 单例模式：static var 与 Autoload

单例模式（Singleton）保证一个类在全项目只有一个实例。传统写法用静态变量保存唯一实例：

```gdscript
class Singleton:
    static var instance: Singleton:
        get: return _instance
    static var _instance: Singleton = new()
```

static var 属于类而不属于实例，全项目访问到的都是同一份 _instance。

不过官方文档明确提示：在 Godot 中，单例通常用 Autoload 实现——在项目设置里注册一个脚本或场景，引擎启动时自动实例化并加入场景树，同时注册一个全局名称。两者的差异决定了选择：

- static var 单例：纯代码层，不进场景树，适合与节点生命周期无关的全局数据与工具函数；
- Autoload：是场景树里的真实节点，能收发信号、有完整的生命周期回调，适合游戏全局服务（存档、音频、任务系统）。

选择标准很简单：需要进场景树、需要信号与生命周期，用 Autoload；只是共享数据与函数，static var 更轻。Autoload 的注册步骤与使用细节见 godot 模块 050 篇。

## 观察者模式：信号就是官方答案

观察者模式（Observer）定义"一对多"的依赖：被观察者状态变化时，自动通知所有观察者。GDScript 的信号（Signal 加 Callable）就是这个模式的官方实现：发射者只需要 emit，监听者用 connect 订阅，双方互不知道对方的存在。

以成就系统为例——玩家死亡时要解锁成就，但玩家脚本完全不该知道成就系统的存在：

```gdscript
# player.gd
class_name Player

signal player_died

var health: int = 100:
    set(value):
        var old_val = health
        health = value
        if old_val > 0 and health <= 0:
            player_died.emit()
```

```gdscript
# achievements.gd —— 监听者不需要知道玩家内部如何扣血
@onready var player: Player = get_node("../Player")

func _ready() -> void:
    player.player_died.connect(_on_player_died)

func _on_player_died() -> void:
    print("成就解锁：首次阵亡")
```

收益是彻底的解耦：以后再加"死亡统计""战绩回放"等监听者，只需各自 connect，玩家脚本一行都不用改——这正是开闭原则的落地。090 篇讲过，信号参数、连接标志、bind 追加参数在这里都照常可用。

## 状态模式：enum 加 match 的有限状态机

状态模式（State）把"对象在不同状态下行为不同"显式建模。GDScript 里最惯用的做法是枚举加 match：

```gdscript
enum State { IDLE, RUN, JUMP }

var state: State = State.IDLE

func change_state(next: State) -> void:
    state = next

func _physics_process(delta: float) -> void:
    match state:
        State.IDLE:
            pass    # 待机逻辑：检测移动输入，可 state = State.RUN
        State.RUN:
            pass    # 奔跑逻辑：检测离地，可 state = State.JUMP
        State.JUMP:
            pass    # 跳跃逻辑：检测落地，可 state = State.IDLE
```

为什么比布尔标志组合好？如果用 is_idle、is_running、is_jumping 三个 bool 描述状态，就会出现"既在跑又在跳"的非法组合，每个方法都得防御所有组合情况；枚举保证同一时刻只有一个状态，match 从上到下匹配、命中即止，把每个状态的行为集中在同一处，新增状态只需加一个分支。

状态多、转移规则复杂的角色（比如 Boss 战），可以把每个状态做成独立节点组成节点化状态机——社区有成熟实现，但核心思路与上面的枚举版本完全相同。

## 命令模式：Callable 天然是命令对象

命令模式（Command）把"一次操作"封装成对象，从而可以排队、记录、撤销与重放。GDScript 的 Callable 就是现成的命令对象：它本身封装了"在哪个对象上调用哪个方法、带什么参数"，还能用 bind 追加参数。

```gdscript
var command_queue: Array[Callable] = []

func _ready() -> void:
    command_queue.push_back(jump)
    command_queue.push_back(shoot.bind(1))

func run_next() -> void:
    if not command_queue.is_empty():
        var command = command_queue.pop_front()
        command.call()
```

把执行过的命令依次存进历史列表，就得到"重放"能力；为每类命令配一个逆操作，就能实现撤销。输入缓冲、回合制行动队列、录像回放，本质都是这个思路。

## 工厂模式：静态工厂与场景工厂

工厂模式（Factory）把"创建对象的细节"收拢到一处。GDScript 有两种常见形态。

第一种是静态工厂方法，用 static func 提供有语义的构造入口：

```gdscript
class_name Item

var health: int
var damage: int

func _init(health: int, damage: int) -> void:
    self.health = health
    self.damage = damage

static func create_potion() -> Item:
    return Item.new(50, 0)

static func create_sword() -> Item:
    return Item.new(0, 10)
```

顺带一提：_init 定义了必填参数后，这个类就只能通过代码实例化（PackedScene.instantiate() 之类会失败）——这反而强化了"只能走工厂入口"的约束。

第二种是场景工厂，把加载与实例化封装起来：

```gdscript
const BULLET_SCENE := preload("res://bullet.tscn")

func spawn_bullet() -> Node:
    return BULLET_SCENE.instantiate()
```

调用方不需要知道子弹的资源路径与具体类型，资源换版只改工厂一处。

## 迭代器模式：语言层已内置

迭代器模式（Iterator）让对象能被逐个访问而不暴露内部结构。GDScript 在语言层为它准备了直接对应物：实现 _iter_init、_iter_next、_iter_get 三个迭代器接口方法，你的对象就能直接写进 `for value in object:` 循环。完整示例见 060 篇（迭代器接口），此处一句话带过。

## 对象池：为高频创建复用实例

子弹、伤害数字这类对象往往大量、频繁地创建销毁。节点必须手动 free() 或 queue_free()（帧末移除并递归删除子节点），频繁的实例化与释放会带来可观的开销。对象池（object pool）的思路是：实例用完不销毁，放回池子，下次直接取用——用 visible 开关或重新挂到场景树（re-parent）代替反复 instantiate/free：

```gdscript
const BULLET_SCENE := preload("res://bullet.tscn")

var _pool: Array[Node] = []

func acquire_bullet() -> Node:
    if not _pool.is_empty():
        var bullet = _pool.pop_back()
        bullet.visible = true
        return bullet
    return BULLET_SCENE.instantiate()

func release_bullet(bullet: Node) -> void:
    bullet.visible = false
    _pool.push_back(bullet)
```

注意对象池是"思路"而不是银弹：数量少、频率低的对象直接实例化即可，不必套池子。

## 何时不要用模式

最后也是最重要的一节。GDScript 脚本通常短小，一个角色脚本几十行就够，此时引入模式是负资产——多一层抽象就多一处跳转。经验法则：

- 先让代码工作，再考虑抽象；重复出现第三次以上再提取；
- 模式是为可读性与可维护性服务的，不是简历上的装饰；
- 觉得"这里应该用设计模式"之前，先问"现在的代码哪里难读了"。答案说不出来，就说明还不需要模式。

## 小结

- SOLID 五原则与合成复用、迪米特法则共同回答同一个问题：如何让代码改起来不痛；GDScript 没有接口关键字，4.5 的 @abstract 抽象类承担统一接口角色；
- 单例：static var 保存唯一实例是传统写法；Godot 官方方案是 Autoload——需要进场景树与信号用 Autoload，纯全局数据用 static var；
- 观察者模式：信号（Signal 加 Callable）就是官方实现，发射者 emit、监听者 connect，双方互不知道对方；
- 状态模式：enum 加 match 是惯用的有限状态机，避免布尔标志的非法组合；复杂状态可节点化；
- 命令模式：Callable 天然是命令对象，入队、重放、撤销都建立在它上面；
- 工厂模式：静态工厂方法（static func 返回新实例）与场景工厂（封装 preload 加 instantiate）；
- 迭代器模式对应 _iter_init/_iter_next/_iter_get 接口；对象池用复用代替高频 instantiate/free；
- 模式为可读性服务：先让代码工作再抽象，过度设计比没有设计更糟。

## 参考链接

- [GDScript 基础（Godot 官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [单例（Autoload）（Godot 官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/singletons_autoload.html)
- [GDScript 中文教程：设计原则与设计模式（godothub）](https://godothub.com/oss/gdscript-tutorial/)
