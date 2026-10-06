---
order: 90
title: 角色移动与碰撞检测
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 用 CharacterBody2D 实现平台跳跃与俯视角移动，理解 move_and_slide 与碰撞形状的正确用法
author: fanquanpp
updated: '2026-09-28'
related:
  - 'godot/060-InputEventsAndActions'
  - 'godot/070-TwoDGameObjects'
  - 'godot/085-RigidBodyAreaAndCollisionLayers'
  - 'godot/090-TilemapsAndLevelDesign'
prerequisites:
  - 'godot/060-InputEventsAndActions'
  - 'godot/070-TwoDGameObjects'
---

## 知识点地图

- **知识类别**：角色物理（CharacterBody2D）——玩家可控运动的实现层，2D 物理体系的"代码控制"半边。
- **解决什么问题**：角色怎么移动、跳跃、被墙挡住、站在斜坡上不滑落；以及怎么把"移动"写成引擎能稳定解算的形式（物理帧、velocity、碰撞 API）。
- **什么时候用到**：任何可控角色——平台跳跃、俯视角 RPG、动作游戏。角色之外的物理体（弹珠、箱子）与触发器见 [085 篇](/godot/085-RigidBodyAreaAndCollisionLayers)。

先看一个真实项目的目录。动作游戏几何构成（speed-rouge）里，玩家角色被拆成了这样几块：

```text
scripts/entities/player.gd              总装
scripts/entities/player/player_input.gd 只管读输入
scripts/entities/player/movement_core.gd 只管速度与位移
scripts/entities/player/mechanism_surface.gd 只管特殊表面（弹跳板、滑雪面）
scripts/data/movement_tuning.gd         只放数值：速度、跳跃力、加速度
```

为什么要拆？因为平台游戏手感的打磨 90% 是在改数字：跳得再高一点、空中再飘一点。数值集中在 `movement_tuning.gd`，改手感就不用碰逻辑。而这一整套的地基，只是一个不到二十行的 CharacterBody2D 脚本。本篇就从这个最小骨架写起，最后你会明白几何构成的拆分是自然长出来的。

## 动手：官方平台跳跃模板

新建 CharacterBody2D 节点，挂 CollisionShape2D 子节点（形状选胶囊），挂上脚本：

```gdscript
extends CharacterBody2D

var speed = 300.0
var jump_speed = -400.0

func _physics_process(delta):
    velocity += get_gravity() * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_speed
    var direction = Input.get_axis("ui_left", "ui_right")
    velocity.x = direction * speed
    move_and_slide()
```

给它一块站得住脚的地面（StaticBody2D 加矩形碰撞，或直接用瓦片地图），运行，左右移动、跳跃就都通了。逐行解释：

- extends CharacterBody2D：脚本挂在 CharacterBody2D 节点上。
- speed 与 jump_speed：水平速度与起跳速度。2D 坐标系 Y 轴向下为正，所以向上跳要赋负值。
- 移动代码写在 `_physics_process(delta)` 中：它以固定速率调用（默认每秒 60 次，可在 Project Settings -> Physics -> Common -> Physics Fps 修改）。物理相关的一切必须放在这里，而不是与渲染帧率挂钩的 `_process`。
- `velocity += get_gravity() * delta`：每个物理帧给速度累加重力加速度。velocity 跨帧保留，所以角色下落速度会持续增大。
- 跳跃判定：`Input.is_action_just_pressed("jump")` 判断"jump"动作是否在本帧刚按下，并用 `is_on_floor()` 确认站在地面上。两个条件缺一不可——漏掉着地检查就会无限连跳。
- `Input.get_axis("ui_left", "ui_right")`：返回 -1 到 1 的轴向值，负为左、正为右。
- `velocity.x = direction * speed`：水平速度每帧直接设定（不累加），松开按键立即归 0，手感干脆。
- `move_and_slide()`：真正执行移动，并在过程中处理碰撞与滑动。

跑通之后先做一件事：把 300.0 和 -400.0 改到你觉得"顺脚"。改数字调手感，就是几何构成把数值抽进 movement_tuning.gd 的全部动机——下一步你也会这样做。

## 讲为什么：两套移动 API

CharacterBody2D 是"代码控制的运动学碰撞体"。与受物理引擎自动施力的刚体不同，它不受引擎自动施力，物理引擎也不会替它移动半步——所有移动都由你在代码里完成，引擎只负责在移动过程中做碰撞检测与响应。这让它的手感完全可控、行为完全可预测，是玩家角色、敌人、NPC 的首选节点。它最核心的属性是 velocity：Vector2 类型，表示每秒移动量；velocity 会在帧与帧之间保留，这正是重力能够"累积"、角色越落越快的原因。

它提供两套移动方法，行为差别很大：

### move_and_slide()：滑动移动，日常首选

`move_and_slide()` 无参数调用——它内部自动用 delta 计算位移，并最多循环 5 次来实现在墙面、斜坡上的平滑滑动。它还有一个重要副作用：会修改 velocity。例如落地时垂直速度被自动归零，不会把越落越快的速度"攒"在身体里。

读取本次移动中的碰撞：`get_slide_collision_count()` 返回碰撞数量，`get_slide_collision(i)` 取出每一条碰撞信息。注意它只统计真正改变了移动方向的碰撞，贴着墙平滑滑过的情况不会算作一次碰撞。

### move_and_collide()：碰到就停，自己写响应

`move_and_collide(motion: Vector2)` 需要你自己传入本帧位移（通常是 velocity * delta），一旦发生碰撞就立即停下，没有任何自动响应；返回一个 KinematicCollision2D 对象携带碰撞详情，没碰上则返回 null。它适合需要自定义碰撞逻辑的场景，官方的子弹反弹示例就是典型：

```gdscript
func _physics_process(delta):
    var collision = move_and_collide(velocity * delta)
    if collision:
        velocity = velocity.bounce(collision.get_normal())
        if collision.get_collider().has_method("hit"):
            collision.get_collider().hit()
```

- `velocity.bounce(collision.get_normal())`：以碰撞面法线为镜面反射速度向量，实现反弹。
- `collision.get_collider()` 拿到被撞对象；先用 `has_method("hit")` 探测它有没有 hit 方法，有则调用。这是 Godot 里典型的"鸭子类型"写法，比强行类型转换更松耦合。

## 关键属性与俯视角变体

- velocity：每秒位移量，跨帧保留，是两套 API 的共同输入。
- motion_mode：运动模式。默认 MOTION_MODE_GROUNDED，平台视角：区分地面、墙与天花板，is_on_floor() 等判定可用。俯视角游戏没有"上下"概念，应改为 MOTION_MODE_FLOATING，方向键推哪走哪，也不会有坡度、台阶的阻挡逻辑。
- up_direction：定义"哪边是上"，默认 Vector2(0, -1)（屏幕上方）。is_on_floor()、is_on_wall()、is_on_ceiling() 三个判定都依赖它（在 GROUNDED 模式下）。
- floor_max_angle：能站住的最大坡角，默认 45 度，超过就算墙。
- wall_min_slide_angle：撞墙时开始滑动的最小角度，默认 15 度；近似正对的墙不会滑动，而是直接顶住。

把模板改成俯视角只需三步：换 motion_mode、用四方向向量替代水平轴、去掉重力。

```gdscript
extends CharacterBody2D

@export var speed := 300.0

func _ready():
    motion_mode = CharacterBody2D.MOTION_MODE_FLOATING

func _physics_process(delta):
    var direction = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
    velocity = direction * speed
    move_and_slide()
```

## 动手进阶：把模板长成几何构成的形状

跑通最小版并调过手感后，按三个小步骤重构，每步做完都运行验证一次。

第一步，数值出走。建 `movement_tuning.gd`（继承 Resource 或直接用常量类均可，教学版用最简单的常量预加载）：

```gdscript
# movement_tuning.gd
class_name MovementTuning

const SPEED := 300.0
const JUMP_SPEED := -400.0
```

玩家脚本里 `var speed := MovementTuning.SPEED`。此后调手感只动这一个文件，改动在版本管理里一目了然。

第二步，输入出走到 player_input.gd。让输入模块只回答"玩家想往哪走、想不想跳"，输出方向向量与布尔值，movement_core 拿结果做物理。这一刀切下去，将来接手柄重映射、录像回放（程序化生成输入，见输入篇）都不用动物理代码。

第三步，特殊表面交给区域。弹跳板、加速带这类"踩上去行为不一样"的机关，在几何构成里由 mechanism_surface.gd 统一处理：机关本体是一个 Area2D，检测到角色进入后直接改写角色的 velocity（比如 `velocity.y = launch_speed`）。角色代码不需要认识每一个机关——这是一个可复用的模式：CharacterBody2D 只负责"常规物理"，一切非常规速度都由外部机关注入（这个模式的完整实现位与信号时序解释见 [085 篇第 4 节](/godot/085-RigidBodyAreaAndCollisionLayers)）。

## 手感参数化：几何构成的二段式重力

上面三步重构完，你手里有了一个"能跑"的角色；但平台跳跃"好玩"和"能跑"之间的差距，全部藏在运动参数的设计里。几何构成的 movement_core.gd 是一份可以照着学的参数化范本（文件头注释区就是它的参数表），核心思想一句话：**重力不是常数，手感是曲线**。

### 二段式重力：上升飘、下落沉

教科书版跳跃只有一段重力（`velocity += get_gravity() * delta`），起跳和下落对称。真实平台游戏几乎都做两段——上升段轻盈滞空、下落段干脆利落。几何构成按速度区间拆成两半：

```gdscript
# movement_core.gd（教学化节选，数值出处：scripts/entities/player/movement_core.gd）
const APEX_THRESHOLD := 60.0     # apex 窗口：|上升速度| 低于此值视作"跳跃顶点附近"
const APEX_GRAV_MULT := 0.86     # 顶点区重力打折：滞空感的来源
const FALL_MULT := 1.24          # 下落段重力加重的倍率

func apply_gravity(delta: float) -> void:
    if velocity.y < 0.0:
        # 上升段：速度接近 0（顶点窗口内）时重力乘 0.86
        var mult := APEX_GRAV_MULT if absf(velocity.y) < APEX_THRESHOLD else 1.0
        velocity += get_gravity() * mult * delta
    else:
        # 下落段：按当前速度渐进加重，封顶 max_fall
        var v_n := clampf(velocity.y / max_fall_speed, 0.0, 1.0)   # 归一化到 0..1
        var g := get_gravity() * FALL_MULT * (1.0 - v_n * v_n)     # 越接近极速加得越少
        velocity.y = minf(velocity.y + g * delta, max_fall_speed)
```

逐行为什么这样写：

- **apex 窗口**：跳跃最高点附近，速度接近 0。这段停留时间越长，玩家越有"在空中悬了一瞬"的操作余地——马里奥的"大师跳"、蔚蓝的可变跳高都利用这个窗口。重力乘 0.86 不是让角色跳更高，而是让顶点停留更久，同样一跳多出约十几毫秒的空中微调时间。
- **下落段渐进加重**：FALL_MULT=1.24 让下落比重力加速度更狠——快速下落是平台游戏节奏感的一半（升得慢落得快，玩家才不会觉得"角色像气球"）。但加重必须封顶：`(1.0 - v_n * v_n)` 是一个阻尼式递减因子，速度归一值 v_n 越接近 1（越接近极速），额外加重越少，最终由 `minf(..., max_fall_speed)` 硬封顶。没有封顶的渐进加重，长落差会让速度爆到穿地。
- **换成别的写法会怎样**：只用一段重力——跳跃弧线对称，顶点一晃而过，"手感廉价"；加重但不封顶——从高台坠落直接穿透薄地板（配合 085 篇讲的 CCD 也不够，速度爆表时谁都不保险）。这两个参数（APEX_GRAV_MULT 与 FALL_MULT）都在 movement_tuning.gd 数值表里，调手感改表不改逻辑——这就是第一步"数值出走"的完整回报。

### 空中动量分级与超速带

水平方向同样被参数化了。空中转向不是"松开右键立刻往左"——几何构成按当前水平速度分级转向权重：

```gdscript
# 教学化节选：空中动量分级（movement_core.gd 的输入混合段）
var speed_ratio := absf(velocity.x) / max_run_speed          # 当前速度占极速的比例
var turn_weight := lerpf(TURN_FULL, TURN_MIN, speed_ratio)   # 越接近极速，转向权越低
velocity.x = lerpf(velocity.x, input_dir.x * max_run_speed, turn_weight * delta * 10.0)
```

静止时转向权给满（TURN_FULL，起手跟手），全速冲刺时压到下限（TURN_MIN，带惯性）——这正是"手感"二字的量化：跟手与惯性不是对立选项，而是一条可调的曲线。

超速带处理的是边界情况：冲刺技能会把速度推过 max_run_speed。朴素写法（每帧 clamp 到极速）会把冲刺余速瞬间吃掉，冲刺就没了意义。几何构成的写法是**同号超速不回拉**：速度方向与输入方向一致且已超速时，不动它，只让它按地面摩擦自然渗漏衰减——冲刺余速顺滑消散而不是被一刀砍断。反向输入则正常拉回（那是玩家在主动刹车）。

把这一节与前三步连起来看：movement_tuning 存参数、movement_core 存曲线、player_input 存意图——平台跳跃手感是"参数 + 曲线 + 意图"三层各自可调的系统，而不是一个 if 一个数值的事故现场。这也是为什么它能把跳跃手感改到第十几版而不伤逻辑：手感的每次迭代只是表里两个数字。

## 碰撞形状：CollisionShape2D 与形状家族

CharacterBody2D 自身没有形状，碰撞范围由 CollisionShape2D 子节点定义。使用规则有三条：

1. CollisionShape2D 必须是 PhysicsBody2D 的直接子节点，挂在更深的层级（比如 body 下某个 Node2D 的子节点）会被直接忽略。
2. 必须给 CollisionShape2D 指定一个 Shape2D 资源（shape 属性），否则等于没有碰撞。
3. 同一个 body 可以挂多个 CollisionShape2D，这些形状之间可以重叠，互不碰撞——常见做法是角色用一个胶囊形状做身体，再挂一个小矩形做脚底传感器。

形状家族的分工如下：

- RectangleShape2D：矩形。箱体、平台、墙体。
- CircleShape2D：圆形。滚球、圆形敌人，任何方向的碰撞都平滑。
- CapsuleShape2D：胶囊。人形角色首选，上下圆润，不易卡在台阶边缘。
- SegmentShape2D：线段。细线形碰撞。
- SeparationRayShape2D：分离射线，专为角色设计。
- WorldBoundaryShape2D：无限平面，性能最好的基本形状，适合做关卡底部的"掉出即死"地板。
- ConvexPolygonShape2D：凸多边形，所有顶点朝外，可近似多数不规则物体的轮廓。
- ConcavePolygonShape2D：凹多边形（trimesh 三角网格），限制很严：只能用于 StaticBody，或 motion mode 为 Static 的 RigidBody，对 CharacterBody 无效。所以别指望角色能站上单个凹形形状——凹形地形应该用多个凸形状或基本形状拼出来。

编辑器里还有个更直观的 CollisionPolygon2D 节点：直接用多边形画出碰撞范围，构建模式（Build Mode）分 Solids（实心）与 Segments（仅边线段）两种。

提效小技巧：选中 Sprite2D，打开 2D 视口上方工具栏的菜单，选择 Create CollisionPolygon2D Sibling，编辑器会按贴图轮廓自动生成一个碰撞多边形兄弟节点，还可以调整轮廓的简化程度。

## 坑点与自检

三条铁律（官方文档反复强调的初学者三大错误）：

1. 移动代码放 `_physics_process()`。物理帧以固定步长推进，而 `_process` 跟随渲染帧率波动，把移动写错地方会导致运动不稳定、碰撞漏检。
2. 不要给 `move_and_slide()` 传 velocity * delta。它内部已经处理了 delta，你再乘一次，角色就会以双倍速度移动。要自己乘 delta 的是 `move_and_collide()`。
3. 不要直接改 position 来移动。对 position 赋值绕过了碰撞检测，角色会径直穿墙。正确姿势是设置 velocity（或算好本帧位移），再调用两套移动 API 之一。

再加两条形状相关的：

- 不要平移、旋转、缩放 CollisionShape2D 节点本身，这会破坏物理引擎的 broad phase（宽相检测）优化。要调整形状位置，应移动 body，或修改形状资源的尺寸参数。
- 动态物体（角色、可推动的箱子）的形状数量尽量少、形状尽量简单。物理开销主要来自形状数量，而不是单个形状的复杂度。

自检问题：角色站在移动平台上跟着走两步就滑落；按下跳跃有时没反应。前者检查平台是否也在用物理方式移动（移动 StaticBody 也应改其位置于 `_physics_process`）；后者多半是 `is_action_just_pressed` 写在了 `_process` 里而移动判定在 `_physics_process` 里，两帧错位导致按键被跳过。

## 练习

1. 给跳跃加"土狼时间"（离地后 0.1 秒内仍可起跳）：用 `get_tree().create_timer()` 或一个倒数计时器记录"离地时刻"，放宽 `is_on_floor()` 的判定窗口。改完把数值抽进 movement_tuning.gd。
2. 做一个弹跳板：Area2D 加矩形碰撞，角色碰到后 velocity.y 被设为 -800，弹起高度明显超过普通跳跃。想一想为什么在 Area2D 的 body_entered 里改 velocity 是安全的，而在 `_process` 里随手改就不行。
3. 把模板改成俯视角后，加一个"推箱子"：RigidBody2D 箱子加 push 动作，角色接触并按住 push 时给箱子施加冲量。观察 CharacterBody2D 与 RigidBody2D 相互推动时的行为差异。标准实现（以及为什么 move_and_slide 碰到刚体不会自动施力）见 [085 篇第 3 节](/godot/085-RigidBodyAreaAndCollisionLayers)。

## 下一步

- 地面从哪来：瓦片地图与关卡设计（090 篇），几何构成的 levels_native 关卡正是按幕分场组织的。
- 跳跃落地时的音效与随机化：音频播放（120 篇）。
- 输入动作的创建细节回看输入篇（060 篇），几何构成的真实输入表在那里逐项拆过。

## 参考链接

- [使用 CharacterBody2D](https://docs.godotengine.org/en/stable/tutorials/physics/using_character_body_2d.html)
- [2D 碰撞形状](https://docs.godotengine.org/en/stable/tutorials/physics/collision_shapes_2d.html)
- [空闲与物理处理](https://docs.godotengine.org/en/stable/tutorials/scripting/idle_and_physics_processing.html)
- 动作游戏几何构成 speed-rouge（本篇拆分结构的出处）：https://github.com/fanquanpp/geometric-construct
