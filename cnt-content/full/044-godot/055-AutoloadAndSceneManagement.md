---
order: 60
title: Autoload 单例与场景切换管理
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 用 Autoload 实现跨场景全局状态，掌握官方场景切换器的时序原理与单例生命周期纪律
author: fanquanpp
updated: '2026-10-07'
related: ['godot/050-ResourcesAndCustomData', 'godot/125-SaveSystemAndPersistence']
prerequisites: ['godot/020-NodesScenesAndInstancing']
---

## 知识点地图

- **知识类别**：Autoload 单例与场景管理——全局状态与流程控制，属于"应用架构"类知识。
- **解决什么问题**：GDScript 没有全局变量，场景切换后旧节点连同数据一起销毁；而玩家血量、金币、设置项、存档管理器这类状态必须跨场景存活。切换场景时"信号回调里删场景会崩溃"也是新手最常见的一类闪退。
- **什么时候用到**：游戏开始时注册全局管理器（存档、音频、事件总线）；做主菜单到关卡的跳转；任何"两个互不相识的场景要共享一份数据"的场合。数据文件形态的配置不归本篇管，见 [资源系统与自定义数据](/godot/050-ResourcesAndCustomData)。

> 分工声明：本篇承载原"资源与自动加载单例"篇的 Autoload 半边（概念、场景树位置、场景切换器），并新增"生命周期纪律"一节；资源半边留在 050 篇。

## 学习目标

- 理解 Autoload 的定位：启动时自动实例化并注册全局名的普通节点
- 说出 Autoload 在场景树中的固定位置，并利用它实现场景切换器
- 逐行解释官方场景切换器，掌握 call_deferred 延迟删除的时序红线
- 对比两种单例静态引用的生命周期写法，防住"悬挂引用"与"装配顺序"两类事故

## 1. Autoload：跨场景的全局状态

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

## 2. Autoload 在场景树中的位置

Autoload 节点被加在根视口（root viewport）下，并且排在所有其他场景节点之前。利用这个固定顺序有一个实用技巧：root.get_child(-1)（最后一个子节点）总是当前场景。官方教程的场景切换器正是靠这个技巧在启动时拿到当前场景：

```gdscript
extends Node

var current_scene = null

func _ready():
    var root = get_tree().root
    current_scene = root.get_child(-1)
```

因为 Autoload 最早加载，此刻 _ready 执行时根视口下最后一个孩子恰好是游戏主场景的根节点。

## 3. 官方场景切换器逐行讲解

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

## 4. 易错点清单

- 永远不要对 Autoload 节点调用 free() 或 queue_free()。它与项目同生命周期，删除它会导致崩溃。
- 信号回调中不要直接删除当前场景，一律用 call_deferred 推迟到稍后执行，上一节的切换器就是标准写法。
- Autoload 并不是语言层面的强制单例：它只是"启动时自动实例化并注册全局名"的普通节点，引擎不会替你保证设计模式意义上的唯一性语义，别与其他语言中受保护的 singleton 画等号。

## 5. Autoload 生命周期纪律：两种真实写法对照

Autoload 是全项目唯一"确定在场景树里活得最久"的节点，所以它天然适合充当其他系统的静态引用锚点。但"静态引用什么时候赋值、什么时候清空"是真实项目里出过事故的地方。本仓库两个真实项目恰好各占一种写法，放在一起看。

写法一：_EnterTree 赋静态引用（花语花园 flower-card，C#）。它的全局事件总线 EventBus 用静态字段 I 指向自己：

```csharp
// Scripts/Core/EventBus.cs（节选）
public partial class EventBus : Node
{
    public static EventBus I;              // 静态引用：其他系统写 EventBus.I.Xxx 事件

    public override void _EnterTree()
    {
        I = this;                          // 进树瞬间赋值，早于一切 _Ready
    }
}
```

要点：赋值动作放在 _EnterTree 而不是 _Ready。节点生命周期顺序是 _EnterTree -> _Ready（子节点就绪后） -> _ExitTree，而消费方的 _Ready 可能早于 Autoload 自身的 _Ready（取决于 Autoload 列表与节点的先后），_EnterTree 是"保证任何消费方需要时引用已就绪"的最早可靠时机。flower-card 的其他管理器还会在装配顺序未定时走"静态队列"：单例尚未进树时回调先入队，_EnterTree 时再消费——这是"不能假设 Autoload 已就位"时的兜底手法。

写法二：_init 赋引用、_exit_tree 判等清空（几何构成 speed-rouge，GDScript）。它的存档管理器反过来处理：

```gdscript
# scripts/core/save_manager.gd（节选）
extends Node

static var I: SaveManager

func _init() -> void:
    I = self                       # 构造即赋值：Autoload 脚本在启动最早期被实例化

func _exit_tree() -> void:
    if I == self:                  # 判等再清空：只清自己的引用
        I = null
```

要点有三处。第一，_init 里赋引用是安全的——它只做"把 this 存进静态变量"这一件事，不碰场景树；想在这里调 get_tree() 就会踩空，因为节点还没进树。第二，_exit_tree 清空引用是防"悬挂引用"的关键：Autoload 若被释放（编辑器里换场景重载插件、测试框架反复装卸主场景），静态变量还指着一块已释放内存，后续调用就是 `previously freed instance` 报错。第三，`if I == self` 判等不可省：如果新实例已接管了静态引用，退出中的旧实例不能把别人的引用清掉——释放顺序交错时，先退的旧实例会把新实例的引用误清成 null。

两种写法怎么选：静态引用一旦发布就"只进不出"的用法（事件总线、配置中心，整个项目生命周期都活着）用写法一即可；会被反复装卸（测试、热重载）或持有可释放资源的管理器，用写法二把生命周期闭环补全。共同的纪律是：**静态引用的赋值与清空必须成对设计，谁赋值谁负责在合适时机清空**。

易错点补充：

- 消费方不要在静态变量上缓存 Autoload 的子节点或资源引用后再跨场景使用——Autoload 自己清了引用，你的副本还在指向旧对象。
- Autoload 列表顺序即加载顺序：A 的 _init/_EnterTree 里访问 B，B 必须排在 A 上面。装配顺序出问题时，最快的验证法就是把列表里两项换个位置。
- 静态引用仅限"全局唯一"的对象。给普通场景节点赋静态引用，场景一切换就是悬挂引用。

## 6. 动手实践

练习一（做一个全局游戏状态单例）。任务：注册一个 Game autoload，带 score 与 add_score() 方法；主场景放一个按钮与 Label，点击按钮调 Game.add_score(10) 并刷新显示；切到第二个场景再切回来，验证分数还在。提示：第二个场景里直接写 `Game.score` 读取即可——这正是"跨场景存活"的验收方式。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```gdscript
# game.gd（注册名 Game）
extends Node

var score: int = 0

func add_score(amount: int) -> void:
    score += amount
```

```gdscript
# main.gd
extends Control

@onready var label: Label = $VBox/ScoreLabel

func _ready():
    _refresh()

func _refresh():
    label.text = "Score: %d" % Game.score
```

对照要点：_refresh 里读的是 `Game.score` 而不是本地变量——切场景回来重新 _ready 时，读到的还是 Autoload 里那一份，这正是验收点；如果把分数存在主场景脚本里，切场景回来就归零，两种存法对比一次印象最深。

</details>

练习二（把切换器改造得更安全）。任务：基于第 3 节的官方切换器，加两项防御——切换进行中重复调用 goto_scene 时忽略后续调用；加载失败（路径写错）时打印错误而不是崩溃。提示：一个 bool 标志位 + 判断 ResourceLoader.load 的返回值是否为 null，两行的事，但都是真实项目里必须有的护栏。

练习三（复现悬挂引用）。任务：照第 5 节写法二建一个带 static var I 的 autoload，再写一个普通场景脚本缓存 `MyAutoload.some_node` 的引用存进自己的成员变量；在编辑器里停掉运行再启动（或用 Project 里的"重新加载当前场景"），观察悬挂引用报错；然后给消费方补上 `is_instance_valid()` 检查，验证不再报错。目的：亲眼见到"freed instance"报错长什么样，比任何文字描述都管用。

## 小结

Autoload 是 GDScript 缺乏全局变量的官方解法：启动时按列表顺序实例化、注册全局名、挂在根视口最前。利用"Autoload 最先加载"这一事实，root.get_child(-1) 总能拿到当前场景，官方切换器靠它 + call_deferred 实现"信号回调中安全换场景"。三条红线：不对 Autoload 调 free()、信号回调不直接删场景、别把 Autoload 当语言级强制单例。生命周期纪律落在静态引用上：_EnterTree/_init 赋值要有明确时机，_exit_tree 判等清空防悬挂引用，赋值与清空成对设计。需要把数据存成文件（而非运行时状态）时，见 [存档与持久化](/godot/125-SaveSystemAndPersistence)。

## 参考链接

- 单例（自动加载 Autoload）官方教程：https://docs.godotengine.org/en/stable/tutorials/scripting/singletons_autoload.html
- SceneTree 类文档：https://docs.godotengine.org/en/stable/classes/class_scenetree.html
- 项目设置（Project Settings）官方文档：https://docs.godotengine.org/en/stable/tutorials/editor/project_settings.html
- 动作游戏几何构成 speed-rouge（生命周期纪律写法二出处）：https://github.com/fanquanpp/geometric-construct
