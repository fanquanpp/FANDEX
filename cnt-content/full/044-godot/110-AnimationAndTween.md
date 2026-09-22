---
order: 110
title: 动画系统：AnimationPlayer 与 Tween
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 用 AnimationPlayer 制作属性关键帧动画，用 Tween 在代码里驱动补间，避开循环与复用的常见坑
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites:
  - 'godot/030-FirstScriptAndLifecycle'
---

血条的缓动、按钮的按压反馈、Boss 的出场演出——动画是游戏"手感"的直接来源。Godot 提供两条互补的动画路线：AnimationPlayer（动画播放器）在编辑器里打关键帧，适合美术向的复杂编排；Tween（补间）在代码里创建，适合程序驱动的一次性过渡。本篇把两条路线的用法与各自的坑一次讲清。

## 学习目标

- 理解 AnimationPlayer 的属性轨道模型：节点路径加属性，可动画 Inspector 里的任意属性；
- 分清轨道的更新模式（Continuous/Discrete/Capture）与插值方式（Nearest/Linear/Cubic）；
- 会用 RESET 动画、Autoplay on load，并用代码控制播放与倍速；
- 掌握 Tween 的创建纪律：必须 create_tween()、创建即开始、不可复用、重播先 kill；
- 会用并行、循环、缓动与等待惯用法，知道何时选 AnimationPlayer、何时选 Tween。

## AnimationPlayer：编辑器里的关键帧动画

AnimationPlayer 继承自裸的 Node——不是 Node2D 也不是 Node3D。这带来一条铁律：挂在该节点下的子节点不会继承它的任何变换（transform）。它只负责"播放动画数据"，不负责"站在哪"，所以不要把带位置、旋转的节点挂在 AnimationPlayer 下面指望它们跟着动。

选中节点后打开编辑器底部的动画面板，它分四部分：动画控制（播放、新建、切换动画）、轨道列表（每条轨道对应一个被动画的属性）、关键帧时间轴（钻石形关键帧沿时间排布）与时间轴控制（缩放、吸附）。

属性轨道的本质是"节点路径 + 属性"的组合，因此 Inspector 里任何属性都能被动画：位置、缩放、颜色，乃至导出的脚本变量。添加关键帧有两种顺手的方式：轨道上的钥匙按钮，或直接点 Inspector 属性右侧的小钥匙图标。

轨道有三个设置值得细讲。更新模式（update mode）：Continuous 连续模式每帧都更新属性，适合位置这类连续量；Discrete 离散模式只在关键帧处改值，适合切换贴图、布尔开关这类"跳变"属性；Capture 捕获模式会在动画开始时记住属性的当前值，再平滑混合到第一个关键帧上——它的典型用途是"从任意当前状态过渡"：门开到一半时开始播关门动画，Capture 能让门从它此刻实际的角度开始合拢，而不是瞬移到动画起点。

插值（interpolation）决定关键帧之间怎么走：Nearest 最近邻直接跳变，Linear 线性匀速，Cubic 三次曲线进出柔和。另外三条常用设置：名为 RESET（注意区分大小写）的动画用来定义各属性的默认值，是所有姿态的"基准位"，编辑器的 Reset On Save 选项会在保存场景时应用重置；动画面板上的 Autoplay on load 按钮让动画在进入场景时自动播放。

动画的组织单位是动画库（AnimationLibrary）：AnimationPlayer 里的动画按库存放，未指定库的动画位于默认库，面板上显示为 [Global]；放进自定义库后，引用名要写成"库名/动画名"的形式。

## 用代码控制 AnimationPlayer

```gdscript
@onready var anim: AnimationPlayer = $AnimationPlayer

func _ready() -> void:
    anim.play("walk")   # 播放名为 walk 的动画
    anim.animation_finished.connect(_on_anim_finished)

func _on_anim_finished() -> void:
    print("一段动画播完了")
```

play 的完整签名是 play(name: StringName = &"", custom_blend: float = -1, custom_speed: float = 1.0, from_end: bool = false)：name 指定动画名；custom_blend 指定与上一段动画的混合时长；custom_speed 指定本次播放倍速；play_backwards 是专门的反向播放方法。全局倍速用 speed_scale 属性调整。

两个信号要分清：animation_finished 在非循环动画播完时发出；循环动画永远不会"播完"，它发出的是 animation_looped。还有一个新手必踩的坑：新建动画的默认长度是 1 秒，做完动作记得在时间轴上把长度改成实际需要的值。

## Tween：三行代码的补间

Tween 是纯代码路线：给定"哪个对象的哪个属性、到什么目标值、用多久"，引擎逐帧帮你插值。创建方式有且只有一种——调用 Node.create_tween() 或 SceneTree.create_tween()，手动 Tween.new() 创建的对象无效；而且补间一创建就立即开始，不需要再调"开始"。

看一段典型代码，逐行读：

```gdscript
var tween = get_tree().create_tween()
tween.tween_property($Sprite, "modulate", Color.RED, 1.0)
tween.tween_property($Sprite, "scale", Vector2(), 1.0)
tween.tween_callback($Sprite.queue_free)
```

第一行创建补间；第二行让 $Sprite 的 modulate 在 1 秒内渐变到红色；第三行接着让 scale 在 1 秒内缩到零。默认情况下各步骤按顺序执行：先变色、再缩小，最后 tween_callback 在结尾调用 queue_free 回收节点。"变色、缩小、消失"一气呵成，没有一行状态机代码。

全部 Tweener（补间步骤）方法如下：

```gdscript
PropertyTweener tween_property(object: Object, property: NodePath, final_val: Variant, duration: float)
IntervalTweener tween_interval(time: float)
CallbackTweener tween_callback(callback: Callable)
MethodTweener tween_method(method: Callable, from: Variant, to: Variant, duration: float)
SubtweenTweener tween_subtween(subtween: Tween)
AwaitTweener tween_await(signal: Signal)   # 4.7 新增
```

tween_property 是主力；tween_interval 插入一段纯等待；tween_callback 到点回调任意 Callable；tween_method 更灵活，把从 from 到 to 的插值中间值逐帧传给指定方法，做"数字滚动"计数器就靠它；tween_subtween 把另一条补间作为子步骤嵌入；4.7 新增的 tween_await 可以在补间中途等待某个信号发出后再继续。

## 并行、循环与缓动

默认所有步骤排成一条队列，三个方法可以改变节奏：set_parallel(true) 让之后添加的步骤全部并行；parallel() 只把下一个步骤与它的前一步并行；chain() 则相反，强制回到严格顺序。组合使用可以拼出"前两步同时进行、都结束后再走下一步"的结构。

set_loops() 控制循环，把整条补间重复指定次数；持续漂浮的金币、缓慢摆动的装饰常用无限循环。缓动由 set_trans() 与 set_ease() 决定：过渡类型共 12 种，默认 TRANS_LINEAR，想要先慢后快、回弹、弹性这类效果就换过渡类型（例如常用的 TRANS_SINE、TRANS_BOUNCE，完整清单见 Tween 类文档）；缓动方向默认 EASE_IN_OUT。set_delay() 给某个步骤加起始延迟。

一个容易被忽略的机制：补间由 SceneTree 直接驱动，独立于被动画的节点运行。bind_node(node) 把补间绑定到某个节点——绑定后，节点不在场景树内时补间暂停，节点被释放时补间自动销毁。给挂在会频繁销毁的节点上的补间做绑定，是避免悬空操作的好习惯。

Tween 的信号有三个：finished（整条补间结束）、loop_finished(loop_count)（每轮循环结束）、step_finished(idx)（每步结束）。

## 等待与重播的惯用法

补间与 await 配合能写出非常干净的异步代码，官方惯用的"延时两秒"只有一行：

```gdscript
await create_tween().tween_interval(2).finished
```

而"同一动画反复触发"是重灾区。Tween 不可复用：一条补间结束后就失效，想再来一次必须重新创建。更要命的是，同一属性被多个 Tween 同时动画时，后创建的会覆盖先创建的，旧补间还在和新补间抢属性。所以重播前先杀掉旧补间：

```gdscript
var tween

func animate():
    if tween:
        tween.kill()   # 上一次还没播完，先杀掉
    tween = create_tween()
    tween.tween_property(self, "scale", Vector2(1.2, 1.2), 0.15)
```

## 易错点清单

- Tween 必须用 create_tween() 创建，Tween.new() 无效，且创建即开始；
- Tween 不可复用，结束即失效；
- 同一属性多个 Tween 并存时后者覆盖前者，重播前先 kill()；
- 无限循环的补间必须包含有时长的步骤（tween_property 或 tween_interval）：整条循环若全是瞬时回调，会在同一帧内无限步进，直接卡死游戏；
- AnimationPlayer 新建动画默认 1 秒长，记得改；
- 循环动画不发 animation_finished，改听 animation_looped；
- AnimationPlayer 是裸 Node，别把带变换的节点挂到它下面。

## 何时用 AnimationPlayer，何时用 Tween

经验法则：美术向、多轨道、需要在编辑器里反复打磨的动作与演出（角色待机动画、过场剧情、多节点协同的复杂编排）交给 AnimationPlayer；代码向、运行时才确定参数的一次性过渡（UI 弹出、受击闪白、数值渐变、相机轻推）交给 Tween。两者并不互斥——很多项目里过场演出用 AnimationPlayer 编排，界面小动效用 Tween 兜底。

## 小结

AnimationPlayer 把"属性 + 关键帧 + 插值"做成可在编辑器里打磨的数据，记住 RESET 动画、Capture 模式与"新动画默认 1 秒"这三件事；Tween 把同样的思想搬进代码，create_tween() 创建即播，tween_property、tween_interval、tween_callback 三件套覆盖大多数需求，并行、循环与缓动按需叠加。共通的纪律是：循环动画听 animation_looped 信号，重播补间先 kill。

## 参考链接

- [动画简介（Introduction）](https://docs.godotengine.org/en/stable/tutorials/animation/introduction.html)
- [Tween 类文档](https://docs.godotengine.org/en/stable/classes/class_tween.html)
- [Godot 4.7 发布说明](https://godotengine.org/releases/4.7/)
