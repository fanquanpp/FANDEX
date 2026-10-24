---
order: 100
title: 信号、await 与协程
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 声明与连接自定义信号，用 await 等待信号与计时器，理解协程函数的暂停恢复机制
author: fanquanpp
updated: '2026-10-11'
related:
  - 'gdscript/050-FunctionsAndCallable'
  - 'godot/040-SignalsObserving'
prerequisites:
  - 'gdscript/050-FunctionsAndCallable'
---

设想你在给一个编曲工具（比如编趣 Quaver 这类桌面应用）加"导出 WAV"功能：点下导出按钮后，后台开始合成整曲，需要几秒钟。此时有两拨人关心这件事：界面要把按钮变回可用状态、弹个提示；日志面板想记一笔"导出耗时"。如果导出代码直接去调用界面方法、再去调用日志方法，每加一个关心者就要改一次导出代码——而"导出完成"这件事，天然是导出模块广播、别人来听。这正是信号要解决的问题。本篇就从这个场景出发，把 GDScript 语言层的信号、以及与信号形影不离的 await 与协程一次讲透。

阅读本篇的前提是熟悉函数与可调用体（Callable）的用法，见 050 篇。

## 动手：声明并发射一个自定义信号

在导出模块的脚本里，用 signal 关键字声明信号：

```gdscript
signal export_finished                    # 无参数信号
signal export_finished()                  # 带括号的空参数形式，与上一行等价
signal export_finished(song: String, seconds: float)  # 带类型参数
```

要点：

- 信号参数写在括号里，可以带类型标注，但不允许可选参数，信号也没有返回值——它只是一次广播，不负责应答；
- 参数名不只是摆设：它们会显示在编辑器的信号面板里，帮助连接信号的人理解每个参数的含义；
- 命名遵循风格指南：过去时 snake_case，因为信号广播的是"已经发生的事件"，如 export_finished、door_opened；
- 除了静态声明，还可以在运行时用 `add_user_signal("hurt", [...])` 给对象动态创建信号。不过绝大多数场景直接在脚本里写 signal 声明即可，运行时创建是少数高级需求才用到的手段。

发射信号推荐 `signal.emit(args)` 形式：

```gdscript
signal export_finished(song: String, seconds: float)

func _ready() -> void:
    export_finished.connect(_on_export_finished)
    do_export("小星星", 12.5)

func do_export(song: String, seconds: float) -> void:
    # ...合成与写文件...
    export_finished.emit(song, seconds)
    # 等价写法：emit_signal("export_finished", song, seconds)

func _on_export_finished(song: String, seconds: float) -> void:
    print("export %s done in %.1fs" % [song, seconds])
```

`export_finished.emit(song, seconds)` 与 `emit_signal("export_finished", song, seconds)` 效果完全相同。区别在于：前者直接访问信号属性，信号名写错了解析期就能发现；后者把信号名写成字符串，拼写错误要等到运行时才暴露。所以日常写代码请优先用 emit()。

## 动手：把界面和日志接上来

连接信号有四种写法，功能等价：

```gdscript
export_panel.connect("export_finished", _on_export_finished)                    # 选项 1
export_panel.connect("export_finished", Callable(self, "_on_export_finished"))  # 选项 2
export_panel.export_finished.connect(_on_export_finished)                       # 选项 3（官方推荐）
export_panel.export_finished.connect(Callable(self, "_on_export_finished"))     # 选项 4
```

官方推荐选项 3：信号作为对象的属性被直接访问，信号名与方法名的拼写错误在编译期就能发现，编辑器还能给出补全。选项 1 与 2 把信号名写成字符串，拼错了只能等运行时执行到那一行才报错。选项 2 与 4 显式构造 Callable，多在需要动态指定对象或方法时使用。

现在界面与日志各连一个回调，导出代码对它们一无所知——这就是解耦。连接时要注意重复连接：对同一个信号连接同一个 Callable，第二次会返回 ERR_INVALID_PARAMETER 并报错。如果确实需要"一个 Callable 被连接多次、每连接一次触发一次"，要改用 CONNECT_REFERENCE_COUNTED 标志（见下节）。

### 连接标志：定制连接行为

connect() 可以接受连接标志（connect flags），常用的有四个：

| 标志 | 作用 |
|---|---|
| CONNECT_DEFERRED | 延迟到当前帧结束时才触发回调 |
| CONNECT_PERSIST | 连接被序列化保存；编辑器里创建的连接总是持久的 |
| CONNECT_ONE_SHOT | 触发一次后自动断开 |
| CONNECT_REFERENCE_COUNTED | 允许重复连接同一个 Callable，按计数管理 |

标志之间用 | 组合，这与位标志的惯用法一致：

```gdscript
export_panel.export_finished.connect(_show_toast, CONNECT_DEFERRED | CONNECT_ONE_SHOT)
```

这一行的含义是：回调推迟到帧末执行，且只触发一次。CONNECT_DEFERRED 适合希望"本轮逻辑全部收尾之后再响应"的场合；CONNECT_ONE_SHOT 常用于一次性事件（例如只等第一次导出完成）。

### 断开与查询连接

断开连接用 disconnect()。稳妥的做法是先查询再断开，避免对未连接的信号调用 disconnect 而报错：

```gdscript
if export_panel.export_finished.is_connected(_on_export_finished):
    export_panel.export_finished.disconnect(_on_export_finished)
```

这里有个容易踩的坑：Callable 的同一性。指向不同对象的同名方法，不是同一个 Callable：

```gdscript
Callable(node_a, "_on_export_finished")   # 与下一行不是同一个 Callable
Callable(node_b, "_on_export_finished")
```

每个 Callable 都绑定了具体的对象与方法，连接时用的 Callable 和断开时用的 Callable 必须指向同一个对象、同一个方法，否则断不开。这也解释了为什么建议全程使用方法引用（如 `_on_export_finished`）这种简明形式，让连接与断开天然对称。

### 用 bind() 为回调追加参数

有时回调需要信号参数之外的信息。Callable.bind() 可以把参数追加到回调参数列表的末尾，排在信号自身参数之后：

```gdscript
player.hit.connect(_on_player_hit.bind("剑", 100))
# 回调先收到信号自身的参数，随后是追加的 "剑" 与 100
```

这个技巧让你用同一个回调函数服务多个信号来源：绑定不同的参数，就能在回调里区分"是谁、因为什么"触发的。

内置信号用法与自定义完全一致：Button 的 pressed 与 toggled、HTTPRequest 的 request_completed、SceneTreeTimer 的 timeout，同样的四种连接方式、同样的标志、同样的 emit 机制。接下来演示 await 时就会直接用 Button 的信号。

## 动手：用 await 等待导出完成

界面有时不想用回调，而想写"顺序执行"的代码：弹进度条、等导出完成、关进度条。函数体内只要使用了 await，这个函数就成为协程函数（coroutine）。await 一个信号时，函数在这里暂停执行，把控制权交还给引擎；等信号发出后，再从这个暂停点继续往下跑。

```gdscript
func run_export_with_progress() -> void:
    show_progress_bar()
    await exporter.export_finished
    hide_progress_bar()
```

调用它时，函数在 await 处暂停——等待期间游戏的其余部分照常运转；直到 export_finished 发出，才继续执行 hide_progress_bar()。

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
4. await 信号还能顺便捕获参数：信号只有一个参数时，直接得到该类型的值，如 `var info = await exporter.export_finished` 里如果信号是单参的 toggled 之类会得到值本身（`var toggled = await $Button.toggled` 得到 bool）；有多个参数时得到一个 Array；没有参数时得到 null。

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

## 坑点与自检

- 回调被执行了两次——同一个 Callable 被连接了两次（常见于 _ready 与编辑器面板各连一次）。连接前先 is_connected() 判断，或查清是谁多连了一手；
- 断开连接报"未连接"——连接与断开用的 Callable 不是同一个对象的方法引用。全程用方法引用写法；
- await 写在了 _ready 里但节点被提前释放，信号再发出时恢复代码崩溃——长等待的协程要考虑节点生命周期，必要时先断开或用 CONNECT_ONE_SHOT；
- emit_signal("名字拼错了") 不报编译错误、运行时静默无事件——统一改用属性式 emit()；
- 自检问题：`signal hp_changed(hp)` 单参信号，`var v = await enemy.hp_changed` 得到什么？得到 hp 的值本身（单参得值、多参得 Array、无参得 null）。

## 练习

1. 给上面的导出场景补一个 export_progress(percent: int) 信号，让进度条每 10% 更新一次；用 CONNECT_DEFERRED 连接，并用 print 验证回调确实发生在帧末。
2. 写一个"倒计时三连"：连续三次 await `get_tree().create_timer(1.0).timeout`，每次打印剩余秒数，最后返回 true。再把三次循环改成一个 while 循环版本。
3. 模拟"谁在说话要到运行时才知道"：两个节点各声明 speaker_changed(name: String) 信号，第三个节点用 Callable.bind() 把"来源标记"绑定进同一个回调，打印是谁发出的。

每题先自己动手，写完再展开参考实现对照：

<details>
<summary>练习 1 参考实现（先自己写，再展开对照）</summary>

```gdscript
signal export_progress(percent: int)

func _ready() -> void:
    export_progress.connect(_on_progress, CONNECT_DEFERRED)
    _fake_export()

func _fake_export() -> void:
    for percent in [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]:
        export_progress.emit(percent)

func _on_progress(percent: int) -> void:
    print("progress %d%%, frame=%d" % [percent, Engine.get_process_frames()])
```

对照要点：DEFERRED 连接下，同一帧里 emit 十次，回调全部排在帧末才依次执行——打印的帧号全部相同且晚于发射帧，这就是"延迟到帧末"的可观测证据；若去掉 CONNECT_DEFERRED 再跑一遍，帧号会随发射逐次递增。这个对照实验是理解两种触发时机的最快路径。

</details>

<details>
<summary>练习 2 参考实现（先自己写，再展开对照）</summary>

```gdscript
func countdown_three() -> bool:
    for remain in [3, 2, 1]:
        await get_tree().create_timer(1.0).timeout
        print("%d..." % remain)
    print("GO")
    return true

func countdown_while(seconds: int) -> bool:
    while seconds > 0:
        await get_tree().create_timer(1.0).timeout
        print("%d..." % seconds)
        seconds -= 1
    print("GO")
    return true
```

对照要点：两个版本行为一致，说明 for 写死次数与 while 由参数控制次数只是同一协程的两种组织方式；真正的新知识是"一个函数里可以多次 await"——每次 await 都是一次暂停与恢复，函数状态（局部变量 remain、seconds）在暂停期间完整保留，这就是协程的直观感受。

</details>

<details>
<summary>练习 3 参考实现（先自己写，再展开对照）</summary>

```gdscript
# speaker_a.gd / speaker_b.gd（两个节点各一份，脚本可以相同）
signal speaker_changed(name: String)

func say() -> void:
    speaker_changed.emit(name)
```

```gdscript
# hub.gd：第三个节点
extends Node

@onready var speaker_a: Node = $SpeakerA
@onready var speaker_b: Node = $SpeakerB

func _ready() -> void:
    speaker_a.speaker_changed.connect(_on_speaker.bind("A"))
    speaker_b.speaker_changed.connect(_on_speaker.bind("B"))

func _on_speaker(speaker_name: String, source: String) -> void:
    print("%s says: %s" % [source, speaker_name])
```

对照要点：回调参数顺序是"信号自身的参数在前，bind 追加的在后"——speaker_name 是信号给的，source 是绑定的；两个来源连同一个回调，运行时才区分出是谁。如果哪天要在运行时动态增删发言者，这个模式不用改回调一行代码，新增者自己 connect 加 bind 即可，解耦的好处立刻可见。

</details>

## 下一步

- 信号的引擎侧视角（编辑器连线、观察者模式）：godot 模块 040 篇；
- 生命周期与方法参数的底座：函数与可调用体（050 篇）；
- Quaver 仓库里 transport.gd、edit_history.gd 是"信号解耦编辑器组件"的完整实战样本：https://github.com/fanquanpp/quaver

## 参考链接

- [GDScript 基础（Godot 官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [使用信号（Godot 官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/signals.html)
- [GDScript 中文教程：信号（godothub）](https://godothub.com/oss/gdscript-tutorial/)
