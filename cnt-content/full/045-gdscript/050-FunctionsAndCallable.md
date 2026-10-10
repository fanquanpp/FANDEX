---
order: 50
title: 函数与 Callable
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 从函数声明默认参数到可变参数递归，再到一等公民 Callable 与 lambda 闭包的完整用法
author: fanquanpp
updated: '2026-10-07'
related:
  - 'gdscript/030-BasicDataTypesConversion'
  - 'gdscript/090-SignalsAwaitCoroutines'
prerequisites:
  - 'gdscript/030-BasicDataTypesConversion'
---

函数把一段逻辑打包成可复用的单元，是所有 GDScript 代码的骨架。但 GDScript 在函数这件事上有不少独到设计：函数本身是"第一类值"，可以像普通数据一样被存进变量、传给别的函数，这个身份就叫 Callable（可调用体）；此外还有可选参数、可变参数、lambda 闭包、静态方法与抽象方法等特性。本篇从最基本的函数声明讲起，一路讲到 Callable 的进阶用法，为后续的信号与协程主题打底。

## 知识点地图

- 知识类别：GDScript 的函数体系——声明与作用域、返回值与参数规则、Callable 一等公民化、lambda 闭包、static 函数。
- 解决什么问题：逻辑怎么封装复用、函数怎么当值传递（回调、策略）、lambda 捕获的语义与代价。
- 什么时候用到：拆分长函数、给信号接回调、把行为当参数传递（排序比较器、按钮回调）、写工具类静态函数。

## 学习目标

- 掌握函数声明的完整语法：参数类型标注、返回类型与作用域查找规则；
- 理解"无返回类型默认返回 null"与各种返回类型标注下的 return 约束；
- 准确理解参数按值传递对值类型与引用类型分别意味着什么；
- 会用可选参数、可变参数（4.5+）与递归组织函数；
- 把函数当作 Callable 使用：call、callv、bind、unbind、call_deferred；
- 会写 lambda 闭包，并了解闭包捕获的语义与官方内存警告；
- 了解 static 函数与 @abstract 抽象方法的规则。

## 函数声明与作用域

用 func 关键字声明函数，参数可以标注类型，`->` 后写返回类型：

```gdscript
func add(a: int, b: int) -> int:
    return a + b

func greet(name: String = "玩家") -> void:
    print("你好，%s" % name)
```

函数体写在函数头的下一行、缩进一格，空函数体用 pass 占位。

名字查找遵循"局部 -> 类成员 -> 全局"的优先级：先找函数内的局部变量与参数，找不到再看类成员，最后才看全局。这意味着局部名字会遮蔽同名的类成员：

```gdscript
var speed := 300.0        # 类成员变量

func move(delta: float) -> void:
    var step = speed * delta   # 局部没有 speed，向上找到类成员
    print(step)
```

self 在方法内始终指向当前实例，可用但通常省略。它不像 Python 那样作为第一个参数显式传入——GDScript 的成员访问默认就隐式经过 self：

```gdscript
func set_speed(value: float) -> void:
    speed = value        # 等价于 self.speed = value
```

## 返回值规则

返回值有三条基本规则：

- 没有标注返回类型的函数默认返回 null，即使函数体没有任何 return；
- 标注了返回类型后，所有代码路径都必须 return 一个匹配的值；`-> void` 是例外，它只能裸 return（或不写 return），不能返回值；
- 想一次返回多个值，用 Array 或 Dictionary 打包：

```gdscript
func get_stats() -> Dictionary:
    return {"hp": 100, "mp": 50}

var stats = get_stats()
print(stats["hp"])   # 100
```

另外有一条 Godot 4.7 的行为变更需要留意：继承自带返回类型标注的方法时，重写方法会自动继承同样的返回类型，并且必须显式 return。

## 参数传递：按值传参的真实含义

GDScript 的参数始终按值传递。对 int、float、String 这类值类型，复制的值本身；对数组、字典、对象这类引用类型，复制的不是数据，而是"引用的副本"——引用被复制了一份，但两个引用仍指向同一份数据。由此得出两条推论：

- 在函数里给参数重新赋值（换成新实例），只改了这份引用副本，外部不受影响；
- 通过参数引用去修改属性或元素，改的是共享的那份数据，外部看得见。

```gdscript
func try_replace(arr: Array) -> void:
    arr = [9, 9, 9]     # 换新数组：只影响参数这份副本，外部不变

func try_fill(arr: Array) -> void:
    arr.append(4)       # 通过引用改内容：外部数组被改到

var my_arr = [1, 2, 3]
try_replace(my_arr)
print(my_arr)           # [1, 2, 3]
try_fill(my_arr)
print(my_arr)           # [1, 2, 3, 4]
```

## 可选参数

带默认值的参数是可选参数，必须写在必选参数之后；调用时不支持跳位传参——想给后面的可选参数传值，就必须把前面的可选参数也一并写出来：

```gdscript
func attack(target: Node, damage: int = 10, critical: bool = false) -> void:
    pass

attack(enemy)               # damage、critical 都用默认值
attack(enemy, 30)           # damage = 30
attack(enemy, 10, true)     # 想只传 critical，也得先写 damage
```

## 可变参数（4.5+）

Godot 4.5 起支持可变参数：用三个点声明，接收调用时多出来的所有实参：

```gdscript
func f(a: int, b: int = 0, ...args: Array):
    prints(a, b, args)

f(1, 2, 3, 4)   # 输出：1 2 [3, 4]
```

三条硬性规则：可变参数必须标注为 Array 类型；只能放在参数列表的最末尾；每个函数最多声明一个。上例中 a、b 正常接收前两个实参，剩下的 3、4 被收进 args 数组。

## 递归

函数可以调用自身，但必须有终止条件，否则调用栈会被耗尽，报错 Stack overflow (stack size: 1024)——错误信息里的 1024 就是默认调用栈深度上限：

```gdscript
func sum_to(n: int) -> int:
    if n <= 0:                  # 终止条件：n 到 0 就停
        return 0
    return n + sum_to(n - 1)    # 问题规模每层缩小 1，必然到达终止条件

print(sum_to(100))   # 5050
```

写递归前先想清楚两件事：基准情形（什么时候停）与递推（每层如何缩小问题）。可能递归上万层的场景，改用 while 循环实现更安全。

## Callable：函数是第一类值

在 GDScript 里，函数本身可以作为值传递。在需要 Callable 的地方直接写函数名，就会自动生成引用该函数的 Callable。注意：Callable 不能像函数那样直接加括号调用，必须调用它的 call() 方法：

```gdscript
func double(x: int) -> int:
    return x * 2

var c := double        # 函数名自动生成 Callable
print(c.call(21))      # 42
# c(21)                # 错误：Callable 只能通过 call() 调用
```

构造 Callable 的常用方式有两种：

```gdscript
var empty := Callable()                  # 空 Callable
var bound := Callable(self, "double")    # 绑定对象与方法名
```

对 String、Vector2 这类内置 Variant 类型的成员方法，构造函数不适用，要改用静态方法 Callable.create(值, "方法名") 来创建。

call() 逐个传参，callv() 把参数打包进数组一次传入：

```gdscript
print(c.callv([21]))   # 42
```

bind() 把参数追加到实参末尾，返回一个新的 Callable，原来的 Callable 不受影响；bindv() 作用相同，只是参数用数组传入。这在信号连接中非常常用——信号自带的参数在前，绑定的参数在后：

```gdscript
func greet(name: String, greeting: String) -> void:
    print("%s，%s！" % [name, greeting])

var bound := greet.bind("早上好")
bound.call("小明")     # 小明，早上好！
```

unbind(n) 返回一个忽略指定数量传入实参的新 Callable，用于"实参比形参多"的场合。call_deferred() 则把调用推迟到当前帧处理结束（帧末）再执行，常用于避免在物理或场景树遍历过程中直接改动场景树。

链式 bind 时要留意参数的追加顺序——后绑定的参数排在先绑定的后面，整体效果等价于从右往左依次追加：

```gdscript
func f(a, b, c):
    prints(a, b, c)

f.bind(1).bind(2).call(3)   # 输出：3 2 1
```

执行过程拆开看：call(3) 先提供第一个实参 3，然后从右往左依次追加 bind 的参数——先加 2，再加 1，最终调用的是 f(3, 2, 1)。

## Lambda 与闭包

lambda 是匿名函数，用 func 表达式创建，必须赋给变量使用——GDScript 不允许在函数内部再声明普通函数，lambda 是"就地写函数"的唯一方式：

```gdscript
var lambda := func(x):
    print(x)

lambda.call("Hello!")
```

lambda 也可以写成单行、起名字（便于调试时识别）或标注参数与返回类型：

```gdscript
var named := func my_lambda(x): print(x)
var typed := func (x: int) -> void: print(x)
```

给 lambda 起名字不会改变它的匿名本质，只是让报错信息与调试器里显示这个名字，排错时能认出"这是哪一个 lambda"。

几条限制与语义：

- lambda 内不允许递归，不能调用它自己；
- lambda 不能声明为 static；
- 闭包捕获：lambda 会捕获所在作用域的局部变量，且是"按值捕获一次"——捕获之后，外层变量再怎么变化，lambda 里看到的仍是捕获那一刻的值；
- 官方特别警告：避免把 lambda 存入 RefCounted 对象的成员变量。lambda 会隐式持有捕获到的环境（其中可能包含对象引用），放进引用计数管理的对象里容易形成引用循环，造成内存泄漏。

**捕获对象后对象先亡：freed 陷阱（真实工程实录）。** "按值捕获一次"捕获的是引用值，但引用指向的对象可能比 lambda 先死——之后 lambda 一执行就是访问已释放对象。speed-rouge 的 adaptive.gd 留有实录（66-70 行形态，注释原话「捕获变 null 须先挡」）：卡片退出场景后 Tween 的回调 lambda 仍捕获着 card，执行时崩溃。修复模式是把判活写成 lambda 的第一行：

```gdscript
card.tree_exited.connect(func():
    if not is_instance_valid(card):
        return          # 捕获的对象先亡：直接让路
    cards.erase(card)
)
```

判断准则一句话：**lambda 里只要出现捕获的 Node/对象引用，第一行先 is_instance_valid 判活**。这是闭包生命周期的头号坑位，完整展开（含静态缓存防线）见第 75 篇《对象生命周期与内存管理》第 4、5 节。

## static 函数

static func 声明静态方法，属于类本身而非实例：不能访问实例成员，也不能使用 self：

```gdscript
class MathUtil:

    static func sum2(a, b):
        return a + b

print(MathUtil.sum2(1, 2))   # 3
```

一个容易忽略的细节：通过实例调用静态方法时，会按实例的真实类型动态分派——子类重写了静态方法后，经由父类引用调用会拿到子类的版本，行为类似多态；而通过类名调用则没有这种动态分派，写的是谁就调谁。

## 抽象方法（4.5+）

@abstract 注解声明抽象方法——只有声明、没有函数体的方法，用于强制子类去实现：

```gdscript
@abstract func eat() -> void
```

规则有三条：抽象方法只能出现在 @abstract 声明的抽象类中；抽象类的具体子类必须实现全部抽象方法，否则报错；抽象方法不能用于 static 方法。抽象类的完整规则（不能实例化、注解置于 class_name 之前等）在下一篇"类、面向对象与内存管理"中展开。

## 动手实践

**任务一：Callable 三种来源对照。** 用三种方式拿到同一个"开火"行为的 Callable——方法引用（`_fire`）、bind 预绑定参数（`_deal_damage.bind(10)`）、lambda——分别赋给变量、`call()` 执行、传给另一个函数执行，观察三者在调试器里的名字与可读性。提示：bind 的价值在"给通用回调填上具体参数"；lambda 的价值在"就地封一个短逻辑"——三者的适用场合在实验里自然浮现。

**任务二：默认参数与可变参数混用。** 写 `func spawn(kind: String, count: int = 1, tags: Array = []) -> Node`，验证：a) 调 `spawn("goblin")` 与 `spawn("goblin", 3, ["elite"])` 的行为；b) 默认数组是不是每次调用新建（改返回节点的 tags 会不会污染下一次调用）。提示：默认值表达式在每次调用时求值，与某些语言"默认值只算一次"不同——亲自验证一遍。

**任务三：修一个必崩的 lambda（freed 陷阱）。** 创建一个 Button，给它的 `pressed` 信号接一个 lambda（lambda 里访问按钮的父节点）；点击后立刻 `queue_free` 父节点，再连点按钮触发崩溃；用 `is_instance_valid` 先挡修复。提示：崩溃信息会指向 lambda 内那一行——这正是"捕获变 null 须先挡"要防的现场；修复后再想一层：信号连接会不会随对象销毁自动断开、什么时序下仍会踩空。

先自己操作，再对照参考实现：

<details>
<summary>任务三参考实现</summary>

```gdscript
extends Control

@onready var btn: Button = $KillMe

func _ready() -> void:
    btn.pressed.connect(func():
        # 捕获了 self（Control）——若本节点先于按钮死亡，lambda 执行即踩空
        if not is_instance_valid(self):
            return                  # 先挡：捕获对象已亡，直接让路
        print("parent still alive: ", name)
    )

func kill_parent_first() -> void:
    # 复现：先杀本节点，按钮若还在别处被引用并触发，lambda 就会踩空
    queue_free()
```

要点：a) lambda 捕获按值发生在创建时，但对象可以在捕获之后、执行之前死亡——两个时刻之间的空窗就是事故现场；b) `is_instance_valid` 判活是防御性写法，成本一行代码；c) 更根治的思路是让信号连接随接收方一起死（connect 时保证接收方是会先死的那个对象），防御性判活是兜底不是设计。
</details>

## 小结

- 函数用 func 声明，参数与返回值都可标注类型；名字按局部、类成员、全局的顺序查找；self 可用但通常省略，不像 Python 那样显式传入。
- 无返回类型默认返回 null；标注返回类型后所有代码路径必须 return（void 只能裸 return）；多值返回用 Array/Dictionary 打包；4.7 起重写方法继承返回类型。
- 参数按值传递：引用类型传的是引用的副本——给参数赋新实例不影响外部，通过引用改内容外部可见。
- 可选参数必须在必选参数之后，不能跳位传参；可变参数（4.5+）写 ...args: Array，只能放末尾、每函数最多一个。
- 递归必须有终止条件，否则报 Stack overflow (stack size: 1024)。
- 函数是第一类值：函数名自动生成 Callable，必须 call()/callv() 调用；bind/bindv 把参数追加到末尾并返回新 Callable，链式 bind 从右往左生效；unbind 忽略实参；call_deferred 延迟到帧末。
- lambda 必须赋给变量、不能递归、不能 static；局部变量按值捕获一次；勿存入 RefCounted 成员以免内存泄漏。
- static func 不能访问实例成员与 self；经实例调用静态方法有动态分派，经类名调用没有。
- @abstract func（4.5+）只能出现在抽象类中，具体子类必须全部实现，不能修饰静态方法。

## 参考链接

- [GDScript 教程：函数（中文，代码 MIT 开源）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 教程：可调用体（中文）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 基础（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [升级到 Godot 4.7（官方文档）](https://docs.godotengine.org/en/stable/tutorials/migrating/upgrading_to_godot_4.7.html)
