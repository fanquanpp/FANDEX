---
order: 90
title: 信号、await 与协程
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 声明与连接自定义信号，用 await 等待信号与计时器，理解协程函数的暂停恢复机制
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'gdscript/050-FunctionsAndCallable'
  - 'godot/040-SignalsObserving'
prerequisites:
  - 'gdscript/050-FunctionsAndCallable'
---

信号是 Godot 最重要的解耦机制：某个对象宣布"这件事发生了"，但不需要关心谁在听、之后会发生什么。在 godot 模块的 040 篇里，你已经从引擎与设计层面见过信号——在编辑器里通过"节点"面板连线、把信号当作观察者模式（Observer Pattern）的载体。本篇把镜头拉到语言层，回答三个具体问题：如何在 GDScript 里声明信号、发射信号、把信号连接到回调函数，并在此基础上引入与信号形影不离的 await 与协程（coroutine）机制。

阅读本篇的前提是熟悉函数与可调用体（Callable）的用法，见 050 篇。

## 学习目标

- 用 signal 关键字声明自定义信号，为参数标注类型，并在运行时用 add_user_signal 创建信号；
- 用 emit() 与 emit_signal() 两种形式发射信号；
- 掌握连接信号的四种写法，理解官方为什么推荐属性式连接；
- 使用四个连接标志定制连接行为，并用 | 组合标志；
- 安全地断开与查询连接，理解 Callable 的同一性；
- 用 Callable.bind() 为回调追加参数；
- 理解协程函数：await 的暂停与恢复、捕获信号参数、用 SceneTree 定时器实现延迟。

## 声明信号

信号用 signal 关键字声明，写在类里：

```gdscript
signal my_signal                              # 无参数信号
signal my_signal()                            # 带括号的空参数形式，与上一行等价
signal item_changed(item: String, amount: int)  # 带类型参数
signal health_changed(old_value, new_value)   # 不标注类型也可以
```

要点：

- 信号参数写在括号里，可以带类型标注，但不允许可选参数，信号也没有返回值——它只是一次广播，不负责应答；
- 参数名不只是摆设：它们会显示在编辑器的信号面板里，帮助连接信号的人理解每个参数的含义；
- 命名遵循风格指南：过去时 snake_case，因为信号广播的是"已经发生的事件"，如 door_opened、score_changed；
- 除了静态声明，还可以在运行时用 `add_user_signal("hurt", [...])` 给对象动态创建信号。不过绝大多数场景直接在脚本里写 signal 声明即可，运行时创建是少数高级需求才用到的手段。

## 发射信号

发射信号推荐使用 `signal.emit(args)` 形式：

```gdscript
signal item_changed(item: String, amount: int)

func _ready():
    item_changed.connect(_on_item_changed)
    change_item("stone", 100)

func change_item(item: String, amount: int) -> void:
    item_changed.emit(item, amount)
    # 等价写法：emit_signal("item_changed", item, amount)

func _on_item_changed(item: String, amount: int) -> void:
    print("item %s changed!" % item)
```

`item_changed.emit(item, amount)` 与 `emit_signal("item_changed", item, amount)` 效果完全相同。区别在于：前者直接访问信号属性，信号名写错了解析期就能发现；后者把信号名写成字符串，拼写错误要等到运行时才暴露。所以日常写代码请优先用 emit()。

## 连接信号的四种方式

把信号连接到回调函数有四种写法，功能等价：

```gdscript
button.connect("button_down", _on_button_down)                    # 选项 1
button.connect("button_down", Callable(self, "_on_button_down"))  # 选项 2
button.button_down.connect(_on_button_down)                       # 选项 3（官方推荐）
button.button_down.connect(Callable(self, "_on_button_down"))     # 选项 4
```

官方推荐选项 3：信号作为对象的属性被直接访问，信号名与方法名的拼写错误在编译期就能发现，编辑器还能给出补全。选项 1 与 2 把信号名写成字符串，拼错了只能等运行时执行到那一行才报错。选项 2 与 4 显式构造 Callable，多在需要动态指定对象或方法时使用。

连接时要注意重复连接：对同一个信号连接同一个 Callable，第二次会返回 ERR_INVALID_PARAMETER 并报错。如果确实需要"一个 Callable 被连接多次、每连接一次触发一次"，要改用 CONNECT_REFERENCE_COUNTED 标志（见下节）。

## 连接标志：定制连接行为

connect() 可以接受连接标志（connect flags），常用的有四个：

| 标志 | 作用 |
|---|---|
| CONNECT_DEFERRED | 延迟到当前帧结束时才触发回调 |
| CONNECT_PERSIST | 连接被序列化保存；编辑器里创建的连接总是持久的 |
| CONNECT_ONE_SHOT | 触发一次后自动断开 |
| CONNECT_REFERENCE_COUNTED | 允许重复连接同一个 Callable，按计数管理 |

标志之间用 | 组合，这与位标志的惯用法一致：

```gdscript
button.button_down.connect(_on_button_down, CONNECT_DEFERRED | CONNECT_ONE_SHOT)
```

这一行的含义是：回调推迟到帧末执行，且只触发一次。CONNECT_DEFERRED 适合希望"本轮逻辑全部收尾之后再响应"的场合；CONNECT_ONE_SHOT 常用于一次性事件（例如只等第一次确认）。

## 断开与查询连接

断开连接用 disconnect()。稳妥的做法是先查询再断开，避免对未连接的信号调用 disconnect 而报错：

```gdscript
if button.button_down.is_connected(_on_button_down):
    button.button_down.disconnect(_on_button_down)
```

这里有个容易踩的坑：Callable 的同一性。指向不同对象的同名方法，不是同一个 Callable：

```gdscript
Callable(node_a, "_on_button_down")   # 与下一行不是同一个 Callable
Callable(node_b, "_on_button_down")
```

每个 Callable 都绑定了具体的对象与方法，连接时用的 Callable 和断开时用的 Callable 必须指向同一个对象、同一个方法，否则断不开。这也解释了为什么建议全程使用方法引用（如 `_on_button_down`）这种简明形式，让连接与断开天然对称。

## 用 bind() 为回调追加参数

有时回调需要信号参数之外的信息。Callable.bind() 可以把参数追加到回调参数列表的末尾，排在信号自身参数之后：

```gdscript
player.hit.connect(_on_player_hit.bind("剑", 100))
# 回调先收到信号自身的参数，随后是追加的 "剑" 与 100
```

这个技巧让你用同一个回调函数服务多个信号来源：绑定不同的参数，就能在回调里区分"是谁、因为什么"触发的。

## 内置信号用法相同

引擎节点自带大量信号：Button 的 pressed 与 toggled、HTTPRequest 的 request_completed、SceneTreeTimer 的 timeout 等。它们与自定义信号的用法完全一致——同样的四种连接方式、同样的标志、同样的 emit 机制。本篇接下来演示 await 时就会直接使用 Button 的信号。

## await 与协程

函数体内只要使用了 await，这个函数就成为协程函数（coroutine）。await 一个信号时，函数在这里暂停执行，把控制权交还给引擎；等信号发出后，再从这个暂停点继续往下跑。

```gdscript
func await_button_pressed():
    print("等待按钮按下")
    await $Button.pressed
    print("按钮被按下")
```

调用它时会先打印"等待按钮按下"，然后整个函数暂停——等待期间游戏的其余部分照常运转；直到按钮发出 pressed 信号，才打印"按钮被按下"。

协程也可以有返回值：

```gdscript
func wait_confirmation() -> bool:
    print("Prompting user")
    await $Button.button_up
    return true
```

关于协程的调用，有四条规则需要记住：

1. 需要返回值就必须 await：`var confirmed = await wait_confirmation()`。不写 await 直接取返回值会报错，错误信息会提示你这是一个协程函数；
2. 不需要返回值时，可以不 await 直接调用——协程会执行到第一个 await 处把控制权交回，当前函数不会被暂停；
3. await 的对象不是信号、也不是协程时（比如一个普通表达式），不会发生暂停，立即返回该表达式的值；
4. await 信号还能顺便捕获参数：信号只有一个参数时，直接得到该类型的值，如 `var toggled = await $Button.toggled` 得到 bool；有多个参数时得到一个 Array；没有参数时得到 null。

与 Godot 3 的 yield 相比，4.x 的 await 无法再拿到一个描述"函数执行到哪了"的状态对象。这是为类型安全做的取舍：你不再能手工驱动函数状态，暂停与恢复的语义完全交给语言处理。

## 用 SceneTree 定时器实现延迟

延迟一段时间再继续，是 await 最常见的应用。标准手法是创建一个 SceneTree 定时器，等待它的 timeout 信号：

```gdscript
func is_onesec_passed() -> bool:
    await get_tree().create_timer(1.0).timeout
    return true
```

`get_tree().create_timer(1.0)` 创建一个一秒后发出 timeout 信号的 SceneTreeTimer，await 让函数在这里"睡"一秒。冷却时间、技能读条、动画衔接，用的都是这一招。

顺带提醒：while 写出的无限循环会卡死主线程。如果确实需要长时间运算，可以在循环中适当 await（例如等待场景树的 process_frame 信号）让出一帧，让引擎有机会处理输入与渲染。

## 小结

- 用 signal 声明信号：参数可带类型，不允许可选参数，没有返回值；参数名会显示在编辑器信号面板；命名用过去时 snake_case；运行时创建用 add_user_signal()；
- 发射用 signal.emit(args)，等价形式是 emit_signal("名字", args)，前者更推荐；
- 连接有四种写法，官方推荐 signal 属性式连接（编译期即可发现拼写错误）；重复连接同一 Callable 默认报 ERR_INVALID_PARAMETER，除非 CONNECT_REFERENCE_COUNTED；
- 四个连接标志 CONNECT_DEFERRED、CONNECT_PERSIST、CONNECT_ONE_SHOT、CONNECT_REFERENCE_COUNTED 可用 | 组合；
- 断开前先用 is_connected() 查询；注意不同对象的同名方法不是同一个 Callable；
- Callable.bind() 把参数追加到回调末尾，一个回调可以服务多个来源；
- 函数体内使用 await 即成为协程：await 信号时暂停，信号发出后从暂停处恢复；取返回值必须 await；await 还能捕获信号参数（单参得值、多参得 Array、无参得 null）；
- `await get_tree().create_timer(秒数).timeout` 是标准的延迟手法。

## 参考链接

- [GDScript 基础（Godot 官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [使用信号（Godot 官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/signals.html)
- [GDScript 中文教程：信号（godothub）](https://godothub.com/oss/gdscript-tutorial/)
