---
order: 80
title: 角色移动与碰撞检测
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 用 CharacterBody2D 实现平台跳跃与俯视角移动，理解 move_and_slide 与碰撞形状的正确用法
author: fanquanpp
updated: '2026-09-22'
related:
  - 'godot/060-InputEventsAndActions'
  - 'godot/070-TwoDGameObjects'
  - 'godot/090-TilemapsAndLevelDesign'
prerequisites:
  - 'godot/060-InputEventsAndActions'
  - 'godot/070-TwoDGameObjects'
---

让角色在关卡里走动、跳跃、撞墙停下、站上斜坡，是绝大多数游戏的第一个需求。Godot 为此准备了 CharacterBody2D：一个完全由代码驱动的运动学（kinematic）碰撞体。本篇先用官方平台跳跃模板逐行拆解标准写法，再对比两套移动 API 的行为差异与适用场景，最后讲清碰撞形状（Collision Shape）的添加规则、形状家族的分工与常见误区。学完本篇，你就能写出可控手感的 2D 角色控制脚本。

输入动作的创建（Input Map、is_action_just_pressed 等）在输入篇已经讲过，本篇直接使用；关卡地面怎么铺，见瓦片地图篇。

## 学习目标

- 理解 CharacterBody2D 的运动学定位：引擎不替你移动，一切移动由代码完成
- 逐行读懂官方平台跳跃模板，养成在 _physics_process 中写移动代码的习惯
- 区分 move_and_slide() 与 move_and_collide() 的行为差异，并知道何时选用哪一个
- 用 motion_mode、up_direction、floor_max_angle 等属性适配平台与俯视角两种玩法
- 掌握 CollisionShape2D 的添加规则、各形状类型的分工与易错点

## 1. CharacterBody2D 是什么

CharacterBody2D 是"代码控制的运动学碰撞体"。与受物理引擎自动施力的刚体不同，CharacterBody2D 不受引擎自动施力，物理引擎也不会替它移动半步——所有移动都由你在代码里完成，引擎只负责在移动过程中做碰撞检测与响应。这让它的手感完全可控、行为完全可预测，是玩家角色、敌人、NPC 的首选节点。

它最核心的属性是 velocity：Vector2 类型，表示每秒移动量。特别注意：velocity 会在帧与帧之间保留，这正是重力能够"累积"、角色越落越快的原因。

## 2. 官方平台跳跃模板逐行讲解

Godot 官方文档给出了一个最小可用的平台跳跃模板，先原样贴出：

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

逐行解释：

- extends CharacterBody2D：脚本挂在 CharacterBody2D 节点上（节点下还需一个 CollisionShape2D，见第 6 节）。
- speed 与 jump_speed：水平速度与起跳速度。2D 坐标系 Y 轴向下为正，所以向上跳要赋负值。
- 移动代码写在 _physics_process(delta) 中：它以固定速率调用（默认每秒 60 次，可在 Project Settings -> Physics -> Common -> Physics Fps 修改）。物理相关的一切必须放在这里，而不是与渲染帧率挂钩的 _process。
- velocity += get_gravity() * delta：每个物理帧给速度累加重力加速度。velocity 跨帧保留，所以角色下落速度会持续增大。
- 跳跃判定：Input.is_action_just_pressed("jump") 判断"jump"动作是否在本帧刚按下，并用 is_on_floor() 确认站在地面上。两个条件缺一不可——漏掉着地检查就会无限连跳。
- var direction = Input.get_axis("ui_left", "ui_right")：返回 -1 到 1 的轴向值，负为左、正为右。
- velocity.x = direction * speed：水平速度每帧直接设定（不累加），松开按键立即归 0，手感干脆。
- move_and_slide()：真正执行移动，并在过程中处理碰撞与滑动。

## 3. 两套移动 API

CharacterBody2D 提供两套移动方法，行为差别很大，务必分清。

### 3.1 move_and_slide()：滑动移动，日常首选

move_and_slide() 无参数调用——它内部自动用 delta 计算位移，并最多循环 5 次来实现在墙面、斜坡上的平滑滑动。它还有一个重要副作用：会修改 velocity。例如落地时垂直速度被自动归零，不会把越落越快的速度"攒"在身体里。

读取本次移动中的碰撞：get_slide_collision_count() 返回碰撞数量，get_slide_collision(i) 取出每一条碰撞信息。注意它只统计真正改变了移动方向的碰撞，贴着墙平滑滑过的情况不会算作一次碰撞。

### 3.2 move_and_collide()：碰到就停，自己写响应

move_and_collide(motion: Vector2) 需要你自己传入本帧位移（通常是 velocity * delta），一旦发生碰撞就立即停下，没有任何自动响应；返回一个 KinematicCollision2D 对象携带碰撞详情，没碰上则返回 null。它适合需要自定义碰撞逻辑的场景，官方的子弹反弹示例就是典型：

```gdscript
func _physics_process(delta):
    var collision = move_and_collide(velocity * delta)
    if collision:
        velocity = velocity.bounce(collision.get_normal())
        if collision.get_collider().has_method("hit"):
            collision.get_collider().hit()
```

- velocity.bounce(collision.get_normal())：以碰撞面法线为镜面反射速度向量，实现反弹。
- collision.get_collider() 拿到被撞对象；先用 has_method("hit") 探测它有没有 hit 方法，有则调用。这是 Godot 里典型的"鸭子类型"写法，比强行类型转换更松耦合。

## 4. 关键属性与地面判定

- velocity：每秒位移量，跨帧保留，是两套 API 的共同输入。
- motion_mode：运动模式。默认 MOTION_MODE_GROUNDED，平台视角：区分地面、墙与天花板，is_on_floor() 等判定可用。俯视角游戏（从上往下看的玩法）没有"上下"概念，应改为 MOTION_MODE_FLOATING，方向键推哪走哪，也不会有坡度、台阶的阻挡逻辑。
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

Input.get_vector 的四个参数依次为左、右、上、下动作名，返回归一化（长度为 1）的方向向量，因此斜向移动不会比直走更快。

## 5. 三条铁律

初学者最常见的三类错误，官方文档反复强调，这里合并成三条铁律：

1. 移动代码放 _physics_process()。物理帧以固定步长推进，而 _process 跟随渲染帧率波动，把移动写错地方会导致运动不稳定、碰撞漏检。
2. 不要给 move_and_slide() 传 velocity * delta。它内部已经处理了 delta，你再乘一次，角色就会以双倍速度移动。要自己乘 delta 的是 move_and_collide()。
3. 不要直接改 position 来移动。对 position 赋值绕过了碰撞检测，角色会径直穿墙。正确姿势是设置 velocity（或算好本帧位移），再调用两套移动 API 之一。

## 6. 碰撞形状：CollisionShape2D 与形状家族

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

另外有个提效小技巧：选中 Sprite2D，打开 2D 视口上方工具栏的菜单，选择 Create CollisionPolygon2D Sibling，编辑器会按贴图轮廓自动生成一个碰撞多边形兄弟节点，还可以调整轮廓的简化程度。

最后是两个易错点：

- 不要平移、旋转、缩放 CollisionShape2D 节点本身，这会破坏物理引擎的 broad phase（宽相检测）优化。要调整形状位置，应移动 body，或修改形状资源的尺寸参数。
- 动态物体（角色、可推动的箱子）的形状数量尽量少、形状尽量简单。物理开销主要来自形状数量，而不是单个形状的复杂度。

## 小结

- CharacterBody2D 是代码控制的运动学碰撞体，不受引擎自动施力，移动完全由你编写；velocity 跨帧保留。
- 官方模板的骨架是：_physics_process 中累加重力、判定着地后跳跃、按轴向设定水平速度，最后 move_and_slide()。
- move_and_slide() 无参、内部处理 delta、最多循环 5 次滑动、会改写 velocity；move_and_collide(velocity * delta) 碰到即停、返回 KinematicCollision2D 或 null，适合子弹反弹这类自定义响应。
- 滑动碰撞用 get_slide_collision_count() 与 get_slide_collision(i) 读取，只统计改变移动方向的碰撞。
- motion_mode 默认 GROUNDED，俯视角改用 FLOATING；is_on_floor 等判定依赖 up_direction；floor_max_angle 默认 45 度。
- 三条铁律：移动写 _physics_process；move_and_slide() 不乘 delta；不直接改 position 移动。
- CollisionShape2D 必须是 PhysicsBody2D 的直接子节点并指定 Shape2D 资源；凹形形状对 CharacterBody 无效；不要变换 CollisionShape2D 节点本身，动态物体形状宜少宜简。

## 参考链接

- [使用 CharacterBody2D](https://docs.godotengine.org/en/stable/tutorials/physics/using_character_body_2d.html)
- [2D 碰撞形状](https://docs.godotengine.org/en/stable/tutorials/physics/collision_shapes_2d.html)
- [空闲与物理处理](https://docs.godotengine.org/en/stable/tutorials/scripting/idle_and_physics_processing.html)
