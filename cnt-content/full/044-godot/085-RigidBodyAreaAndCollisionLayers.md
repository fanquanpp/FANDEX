---
order: 100
title: 刚体物理与碰撞层
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 用 RigidBody2D 的引擎驱动参数做出可信的物理运动，用 Area2D 做触发器，用碰撞层与掩码设计谁与谁交互
author: fanquanpp
updated: '2026-10-07'
related: ['godot/080-CharacterPhysicsAndCollision', 'godot/070-TwoDGameObjects']
prerequisites: ['godot/080-CharacterPhysicsAndCollision']
---

## 知识点地图

- **知识类别**：刚体物理与碰撞层——2D 物理体系中 CharacterBody2D 之外的另一半，属"物理交互设计"类知识。
- **解决什么问题**：角色移动之外，游戏还需要"引擎替我算"的运动（弹珠、掉落物、可推动箱子）与"只检测不阻挡"的区域（机关、拾取、伤害区）；还需要一套规则决定"谁能撞谁、谁能看见谁"——这就是刚体（RigidBody2D）、区域（Area2D）与碰撞层/掩码（collision layer/mask）三件套。
- **什么时候用到**：弹珠台、砸地鼠的锤子、物理解谜、可推动箱子、拾取金币、进入毒圈扣血、机关弹射——凡是"我不想自己写物理"或"我不想要物理阻挡"的场合。

> 前置说明：角色移动（CharacterBody2D 的 move_and_slide）见 [080 篇](/godot/080-CharacterPhysicsAndCollision)；本篇讲它的两个伙伴。080 篇练习里"推箱子"留下的疑问，本篇给出完整答案。

## 学习目标

- 说清 RigidBody2D 与 CharacterBody2D 的分工：谁的位移由代码控制，谁的由物理引擎解算
- 掌握刚体六个关键参数的语义与典型取值：gravity_scale、CCD、contact monitor、can_sleep、lock_rotation、physics material
- 用 Area2D 实现触发器：monitoring/monitorable 两开关与三组信号
- 设计碰撞层与掩码：layer 是"我是谁"、mask 是"我看见谁"，并用矩阵表落位

## 1. 两类物理体，两种控制哲学

080 篇讲过 CharacterBody2D：代码控制的运动学碰撞体，物理引擎不替它移动半步，一切位移由你写。它的搭档是 RigidBody2D（刚体）：**你只提供初始条件（速度、冲量、重力系数），之后每一帧的位移、旋转、反弹、堆叠都由物理引擎解算**。两句话记住分工：

- 想要"手感完全可控"（玩家角色、敌人 AI）：CharacterBody2D。
- 想要"物理上可信"（弹珠滚动、箱子倒下、假人布娃娃）：RigidBody2D。

第三位成员 Area2D 更特殊：它没有实体碰撞响应，只有"检测"——谁进来了、谁出去了。它是机关、拾取、伤害区的载体。

| 节点 | 位移谁控制 | 阻挡别人吗 | 典型用途 |
| --- | --- | --- | --- |
| CharacterBody2D | 你的代码 | 会阻挡 | 玩家、NPC |
| RigidBody2D | 物理引擎 | 会阻挡，且会被推 | 弹珠、箱子、掉落物 |
| Area2D | 不移动或你移动 | 不阻挡 | 触发器、传感器、判定区 |

一个真实项目里三者各司其职：花语花园（flower-card）的弹珠玩法里，弹珠是 RigidBody2D（引擎算滚动反弹），花钉与墙体是 StaticBody2D（阻挡），而"弹珠进入恐吓范围"的判定是 Area2D（只报告不阻挡）。本篇就以这套真实配置为主例。

## 2. 主例拆解：一颗弹珠的完整刚体配置

下面是 flower-card 项目 PinballBall.cs 的配置核心（C#，参数注释保留了原项目"锚定策划文档"的写法），每个参数都值得逐个讲：

```csharp
// Scripts/Pinball/PinballBall.cs（节选，出处锚点为项目策划文档章节号）
public partial class PinballBall : RigidBody2D
{
    public override void _Ready()
    {
        // 策划以 600 为设计重力，引擎默认 980；折算成缩放系数而不是改项目设置
        GravityScale = 600f / 980f;                        // 约等于 0.61

        // 防穿钉：弹珠速度快、花钉薄，离散检测会整帧跨过去
        ContinuousCd = CCDMode.CastRay;

        // 每次物理帧结束上报最多 8 个接触点，供"撞到花钉计分"用
        ContactMonitor = true;
        MaxContactsReported = 8;

        // 弹珠不能睡死：挂机画面的弹珠必须永远在滚
        CanSleep = false;

        // 弹珠是球，滚动翻转让画面更活；不需要它像陀螺一样自稳
        LockRotation = false;

        // 谁都不许把我挤到别的层去——见第 4 节位掩码
        CollisionLayer = 1 << 3;                           // 第 4 层：pinball
        CollisionMask = LayerTerrain | LayerFlowerPeg | LayerThreat | LayerSensor;

        PhysicsMaterialOverride = new PhysicsMaterial
        {
            Bounce = 0.65f,                                // 弹性：撞钉后仍保留 65% 法向速度
            Friction = 0.1f,                               // 摩擦小：滚动顺畅，落进缝隙不卡
        };
    }
}
```

逐参数讲"为什么"：

- **GravityScale（重力缩放）**：引擎默认 2D 重力 980 像素/秒平方，策划文档定的却是 600。两种改法：改项目默认重力（影响全项目所有刚体），或只给弹珠乘缩放系数。选后者——重力是弹珠手感的专属参数，不该绑架全场。反过来，如果你发现"全项目物体都飘"，那才该去 Project Settings -> Physics 里调默认重力。
- **ContinuousCd（连续碰撞检测，CCD）**：物理引擎默认按"离散步进"移动——每物理帧把物体瞬移一段再查重叠。弹珠一帧能飞十几像素，花钉只有几像素厚，瞬移可能整帧跨过钉子不产生碰撞（术语叫"隧穿"）。CastRay 模式在位移路径上投射一条射线补检；CastShape 更精确也稍贵。规则很简单：**高速 + 薄目标 = 必开 CCD**。子弹、弹珠、下落尖刺都是候选。
- **ContactMonitor + MaxContactsReported（接触上报）**：默认情况下刚体的碰撞信号是关闭的（引擎为省性能不做接触收集）。想接到"弹珠撞到了什么"的通知（body_entered 等信号），必须开 ContactMonitor，并给 MaxContactsReported 一个上限——它限制每帧上报的接触点数量，不是"最多能撞几个物体"，正常玩法给 8 足够；设 0 等于没开。
- **CanSleep（允许休眠）**：物理引擎会让长时间低速的刚体"睡着"停止解算以省 CPU。对掉落物是优化，对弹珠是灾难——挂机展示画面里的弹珠滚着滚着停在半坡睡着了，玩家看到的不是"物理休眠"而是"游戏卡死"。所以这里显式关掉。经验法则：**玩家视线内要持续运动的物体关休眠，场景装饰性物体保持默认**。
- **LockRotation（锁定旋转）**：锁死后刚体永不自旋。推箱子、电梯平台这类"只该平移"的物体要锁——不然被轻轻一蹭就开始打转，永远停不下来。弹珠相反，翻滚恰是它可信感的来源，故保持 false。
- **PhysicsMaterialOverride（物理材质）**：Bounce（弹性系数，0 到 1，碰撞后保留的法向速度比例）与 Friction（摩擦系数）放在材质资源上而不是刚体属性上，因为"橡胶球"和"铁球"是材质差异不是物体差异——你可以把同一个 `bouncy.tres` 材质拖给任意多颗球复用。换成别的写法（每帧在代码里反弹后手动乘 0.65）不是不行，但引擎材质让所有碰撞路径（钉、墙、其他球）统一生效，手写只有你想到的那条路径生效。

GDScript 版对照（等价写法）：

```gdscript
func _ready() -> void:
    gravity_scale = 600.0 / 980.0
    continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY
    contact_monitor = true
    max_contacts_reported = 8
    can_sleep = false
    collision_layer = 1 << 3
    collision_mask = LAYER_TERRAIN | LAYER_FLOWER_PEG | LAYER_THREAT | LAYER_SENSOR
    var mat := PhysicsMaterial.new()
    mat.bounce = 0.65
    mat.friction = 0.1
    physics_material_override = mat
```

## 3. 给刚体施加力：三种注入方式

刚体的"操作接口"只有给速度或力，直接改 position 会打断引擎解算（同 080 篇"不要直接改 position 移动角色"的红线，后果更严重——刚体会丢掉速度积累，堆叠物会互相穿插）。三种常用注入：

```gdscript
# 冲量（Impulse）：瞬间踢一脚，质量越大效果越小。发射器、爆炸击退用它
apply_central_impulse(Vector2(0, -800))

# 恒力（Force）：持续按住才算数，_physics_process 里每帧调用。喷气机、磁铁用它
apply_central_force(Vector2(0, -50))

# 直接设速度（LinearVelocity）：无视当前状态硬改。读档复位、传送门出口用它
linear_velocity = Vector2(200, -300)
```

080 篇练习三"推箱子"的标准答案就在这里：CharacterBody2D 想推 RigidBody2D 箱子，不是把箱子当敌人撞——move_and_slide 碰到刚体时位移会停下来但不施力。正确姿势是在滑动碰撞里给箱子施加冲量：

```gdscript
# 玩家（CharacterBody2D）侧
for i in get_slide_collision_count():
    var col := get_slide_collision(i)
    var box := col.get_collider() as RigidBody2D
    if box and Input.is_action_pressed("push"):
        # 沿碰撞法线反方向推：法线指向玩家，取负就是推离方向
        box.apply_central_impulse(-col.get_normal() * push_strength * get_physics_process_delta_time())
```

易错点：冲量是"一次性的速度变化"，放在 `_physics_process` 里每帧调用就成了恒力（箱子越推越快收不住）；恒力才是每帧调用的。两者写反的症状很典型：箱子一推就疯跑（误用冲量每帧刷），或完全推不动（漏乘 delta 把恒力写成了冲量量级）。

## 4. Area2D：只检测、不阻挡的触发器

Area2D 的语义是"报告进出，不做响应"。两个开关决定它的两种身份：

- monitoring（监视别人）：我能感知谁进出了我——触发器的主体功能。
- monitorable（可被别人监视）：别的 Area2D 能不能检测到我——当你需要"两个区域互判"（比如"技能范围区"检测"危险区"）时才需要开。

三组信号对应三种检测对象：

```gdscript
body_entered(body: Node2D)      # 物理体（CharacterBody2D/RigidBody2D/StaticBody2D）进入
body_exited(body: Node2D)       # 物理体离开
area_entered(area: Area2D)      # 另一个 Area2D 进入
```

真实工程例——几何构成（speed-rouge）的弹跳板机关：Area2D 检测到角色进入后直接改写角色的 velocity，角色代码不需要认识每一个机关：

```gdscript
# mechanism_surface.gd（节选）：挂在弹跳板的 Area2D 上
func _on_body_entered(body: Node2D) -> void:
    if body is CharacterBody2D:
        body.velocity.y = -launch_speed   # 注入非常规速度，角色常规物理不感知来源
```

为什么在 body_entered 里改 velocity 是安全的，而在 `_process` 里随手改就不行？因为 body_entered 是物理引擎在物理步进末尾发出的信号，此时改速度会在下一次 move_and_slide 之前生效，语义干净；而 `_process` 跑在渲染帧、时机与物理步进错位，改了也可能在下一物理帧被 move_and_slide 的地面判定覆盖。这也是 080 篇"机关注入速度"模式的标准实现位。

第二类例子：RPG 的拾取金币。金币 Area2D 勾选 monitoring，`body_entered` 判断 `body.is_in_group("player")` 后播放音效、加金币、queue_free 自己——金币不需要任何阻挡，纯检测。

第三类例子：塔防的毒圈。Area2D 常驻监控，用 `get_overlapping_bodies()` 每物理帧检查圈内敌人并扣血——注意这用的是轮询接口而不是进出信号，因为"持续在圈内持续受伤"没有明确的"进入瞬间"，进出信号反而表达不了。

## 5. 碰撞层与掩码：位掩码设计

每个物理体有两个 32 位整数属性：

- **collision_layer（层）**：我"存在"于哪些层——我是谁的身份声明。
- **collision_mask（掩码）**：我"看见"哪些层——我关心与谁发生交互。

判定规则：A 能与 B 发生交互，当且仅当 **A 的 mask 包含 B 的 layer**。注意这是单向的：B 撞不撞 A 由 B 自己的 mask 决定，与 A 的 mask 无关（Area2D 的 body_entered 也遵循此规则——Area 的 mask 决定它感知谁）。

**第 4 节弹珠的位掩码就是按这个语义设计的**：弹珠自己住在第 4 层（`1 << 3`，位编号从 0 起），它的 mask 是四个层的位或——terrain（墙体地面，让它弹）、flower_peg（花钉，让它计分）、threat（恐吓物，让它受惊）、sensor（传感器，让它触发机关）。它看不见 player 层与 enemy 层，所以角色可以从弹珠堆里穿过去而不撞飞弹珠——这不是巧合，是设计。

层名要注册进 Project Settings -> Layer Names -> 2D Physics，给第 4 层起名 pinball 之后，编辑器的物理属性下拉框会显示名字而不是裸数字。代码里则用常量表收编魔法数字：

```gdscript
# physics_layers.gd：全项目共享的层号常量表
class_name PhysicsLayers

const LAYER_TERRAIN := 1 << 0      # 第 1 层：地形
const LAYER_PLAYER := 1 << 1       # 第 2 层：玩家
const LAYER_ENEMY := 1 << 2        # 第 3 层：敌人
const LAYER_PINBALL := 1 << 3      # 第 4 层：弹珠
const LAYER_FLOWER_PEG := 1 << 4   # 第 5 层：花钉
const LAYER_THREAT := 1 << 5       # 第 6 层：恐吓物
const LAYER_SENSOR := 1 << 6       # 第 7 层：传感器
```

设计层表时建议先画一张"谁看见谁"的矩阵，再照着填 mask。下表是弹珠玩法的完整设计（行=谁的 mask，列=谁的 layer）：

| mask \ layer | terrain | player | enemy | pinball | flower_peg | threat | sensor |
| --- | --- | --- | --- | --- | --- | --- | --- |
| player | 有 | 无 | 有 | 无 | 无 | 有 | 有 |
| enemy | 有 | 有 | 无 | 无 | 无 | 无 | 有 |
| pinball | 有 | 无 | 无 | 无 | 有 | 有 | 有 |
| 弹跳板(Area2D) | 无 | 有 | 无 | 无 | 无 | 无 | 无 |

读法示例：player 行 pinball 列为"无"——玩家不感知弹珠，互相穿过；enemy 行 player 列为"有"——敌人会被玩家阻挡并追逐玩家。矩阵里每个格子都能说出一句"为什么"时，层表才算设计完；说不出理由的格子，宁可先空着。

再给两个不同场景的用法。横版射击三阵营（玩家/敌机/子弹）：玩家 mask = 敌机+敌弹+地形；敌机 mask = 玩家+玩家弹+地形；玩家弹 layer 独立、mask = 敌机；敌弹 mask = 玩家——子弹之间互不可见，海量子弹零碰撞开销。平台游戏的单向平台：平台 layer 单独一层，玩家 mask 包含它，但真正的"单向性"靠形状（WorldBoundaryShape2D 或带 one_way_collision 的 CollisionShape2D），层只负责"从下方也能穿过时不受其他物体干扰"。

## 6. 易错点清单

- 对刚体直接赋 position/rotation：打断解算、丢速度、堆叠穿插。要挪动用 `PhysicsServer2D.body_set_state` 或 freeze 后再挪；要移动用冲量/恒力/速度接口。
- contact_monitor 开了但 max_contacts_reported 还是 0：信号永远不来。两个要一起配。
- 把"层"当成了"阵营开关"忘了 mask：以为设了 layer 就会碰撞，其实 mask 才是"我看见谁"。单向判定（子弹打人）恰恰依赖这种不对称。
- Area2D 检测不到 CharacterBody2D：先查三层——Area 的 mask 是否包含对方的 layer；对方是不是刚被移动过来（传送瞬移的下一帧才会触发）；Area 自己的 monitoring 是否被关了。
- 高速小物体没开 CCD：穿墙、穿钉，症状是"偶尔穿透"而非"总是穿透"，最容易误判为随机 bug。
- 玩家与刚体互相推挤导致抖动：玩家用 CharacterBody2D 挤刚体时给刚体的质量调大（mass 属性），或玩家 mask 干脆不包含刚体层、推力走 apply_impulse。

## 7. 动手实践

练习一（弹珠台最小版）。任务：一个 RigidBody2D 圆球 + 一排 StaticBody2D 柱子 + 底部一条 StaticBody2D 地板。要求：球从顶部落下，撞柱弹跳，落在地板上后仍能被玩家用左右方向键的恒力推动。验收：球不穿柱（开 CCD 前后各试一次高速下落，观察差异）。提示：推动用 `apply_central_force(Vector2(Input.get_axis(...), 0))` 每帧调用。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```gdscript
# pinball.gd：挂在 RigidBody2D 上
extends RigidBody2D

func _ready() -> void:
    gravity_scale = 600.0 / 980.0
    continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY   # 高速 + 薄柱，必须开
    contact_monitor = true
    max_contacts_reported = 8

func _physics_process(_delta: float) -> void:
    # 恒力不是冲量：每帧调用、随按随停，手感和街机弹珠台的挡板一致
    var push := Input.get_axis("ui_left", "ui_right")
    apply_central_force(Vector2(push * 120.0, 0.0))
```

对照要点：`CCD_MODE_CAST_RAY` 与 C# 的 `CCDMode.CastRay` 是同一枚举；恒力放进 `_physics_process` 而不是 `_process`（物理量在物理帧里注入）；力度 120 是经验起点，太大球会飞出台面——正好用来说明为什么这类数值该外置成常量。

</details>

练习二（弹跳板机关）。任务：做一个 Area2D 弹跳板：角色（用 080 篇的 CharacterBody2D 模板）踩上去后被弹起 1.5 倍跳跃高度；要求弹跳板对普通敌人无效。提示：在 body_entered 里判断对方的 collision_layer，或用分组 is_in_group("player")。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```gdscript
# bounce_pad.gd：挂在 Area2D 上，需接 body_entered 信号
extends Area2D

@export var launch_speed := -800.0

func _on_body_entered(body: Node2D) -> void:
    if body is CharacterBody2D and body.collision_layer == PhysicsLayers.LAYER_PLAYER:
        body.velocity.y = launch_speed
```

对照要点：弹起高度与初速度是平方关系（h = v^2 / 2g），1.5 倍高度约对应 1.22 倍速度，所以 launch_speed 别按 1.5 倍写——这是"按高度想、按速度写"的经典换算坑；用层号判断比字符串分组更快且和第 5 节的矩阵表一致。

</details>

练习三（设计一张三阵营碰撞矩阵）。任务：为"玩家、敌机、玩家子弹、敌机子弹"四个角色设计层表：玩家可被敌弹击中、敌机可被玩家弹击中、子弹互不干扰、双方都不被子弹阻挡移动。要求先在纸上画出第 5 节那样的矩阵表，再写常量表并在编辑器里逐体配 layer/mask。自检标准：敌机子弹打中玩家时双方 mask/layer 互为镜像（子弹 mask 含玩家 layer，玩家 mask 含敌弹 layer——玩家的 mask 含敌弹是因为玩家 Area2D 需要感知受击，若受击判定全靠子弹方的 Area2D，则玩家 mask 可以不含敌弹）。提示：想一想"受击判定放在哪一方"决定了矩阵的对称性。

## 小结

CharacterBody2D 管手感，RigidBody2D 管可信，Area2D 管检测。刚体的关键参数每个都有明确动机：gravity_scale 让单个物体脱离全局重力、CCD 防高速隧穿、contact monitor 才能接到碰撞信号、can_sleep 关掉防"睡死"、lock_rotation 区分球与箱。给刚体注入运动只用冲量/恒力/速度三个接口。Area2D 靠 monitoring/monitorable 两个开关与三组信号覆盖触发器需求。碰撞层是身份（layer）、掩码是视野（mask），交互判定是"我 mask 里有你 layer"的单向规则——先画矩阵再填代码，弹珠的 layer4/mask 四层组合就是一张可以直接抄的答卷。

## 参考链接

- [RigidBody2D 类文档](https://docs.godotengine.org/en/stable/classes/class_rigidbody2d.html)
- [Area2D 类文档](https://docs.godotengine.org/en/stable/classes/class_area2d.html)
- [2D 运动物体（Physics Introduction）](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html)
- 花语花园 flower-card（PinballBall.cs 主例出处，本仓库真实项目素材）
- 动作游戏几何构成 speed-rouge（弹跳板机关出处）：https://github.com/fanquanpp/geometric-construct
