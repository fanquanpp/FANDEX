---
order: 120
title: 2D 导航与寻路
module: 'godot'
category: 游戏开发
difficulty: intermediate
description: NavigationRegion2D/NavigationAgent2D/NavigationObstacle2D 三件套、导航网格烘焙、velocity 与 distance_to_target 的正确用法、TileMap 生成导航数据与横版取舍分析
author: fanquanpp
updated: '2026-10-07'
related: ['godot/085-RigidBodyAreaAndCollisionLayers', 'godot/090-TilemapsAndLevelDesign', 'godot/100-UiControlAndContainers']
prerequisites:
  - 'godot/080-CharacterPhysicsAndCollision'
  - 'godot/090-TilemapsAndLevelDesign'
---

## 知识点地图

- **知识类别**：2D 导航与寻路——`NavigationRegion2D` / `NavigationAgent2D` / `NavigationObstacle2D` 三件套与背后的 NavigationServer2D，对应 Godot 官方文档 Navigation introduction（2D 部分）。
- **解决什么问题**：怪物要绕开障碍物走到玩家身边——直线移动会卡墙，「追最近直线方向」的 AI 在 L 形房间永远贴墙打转。导航系统把「从 A 到 B 怎么走」交给引擎：你在地图上标出可行走区域（导航多边形），角色问「下一步往哪走」，引擎沿导航网格算给你。
- **什么时候用到**：俯视角/RPG/塔防的怪物追击与巡逻；NPC 自动寻路到目标点；单位绕开动态障碍（搬来的箱子、关闭的门）。
- **什么时候不该用**：横版平台跳跃类——本篇第 5 节给出完整的取舍分析，先想清楚再引入。
- **本篇不讲**：物理碰撞本身（见 [080 篇](/godot/080-CharacterPhysicsAndCollision)与 [085 碰撞层](/godot/085-RigidBodyAreaAndCollisionLayers)）；瓦片地图的基础绘制（见 [090 瓦片篇](/godot/090-TilemapsAndLevelDesign)，本篇只讲它的导航层）。

预计 35 到 50 分钟。

## 学习目标

1. 用三件套搭出最小寻路：Region 标可行走区，Agent 挂角色，`get_next_path_position()` 逐帧走过去；
2. 解释导航多边形的烘焙来源（编辑器手绘 / 运行时烘焙 / TileMap 导航层自动生成）；
3. 正确使用 `velocity` + `velocity_computed` 走避障（avoidance）路径，并说清它与直接移动的分工；
4. 给「怪物卡墙」「寻路目标不动」「避障时穿透」三类现场各准备一套排查顺序。

## 1. 心智模型：问路的角色与画地图的引擎

把导航系统想象成「问路」：角色（Agent）不认识路，它只做两件事——告诉系统「我要去哪」（`target_position`），每帧问一次「下一步迈向哪」（`get_next_path_position()`）。真正懂路的是 NavigationServer2D：它维护着地图上所有「可行走区域」（导航多边形），用 A* 沿这些区域找路。

三件套的分工：

| 节点 | 一句话职责 | 挂在哪 |
| --- | --- | --- |
| `NavigationRegion2D` | 声明一块可行走区域（持有 NavigationPolygon） | 场景里，覆盖地面 |
| `NavigationAgent2D` | 问路并（可选）避障 | 每个会移动的角色上 |
| `NavigationObstacle2D` | 动态障碍：挡路或参与避障 | 会移动的物体上（箱子、门） |

关键认知：**导航网格与物理碰撞是两套数据**。导航多边形告诉 AI「哪里能走」，碰撞体告诉物理引擎「哪里进不去」。两者通常形状相近但绝不共用——角色沿导航路径走时仍会被物理碰撞挡住，所以导航多边形要画得比墙壁碰撞**内缩**一点（贴墙路径会让角色蹭墙卡顿）。

## 2. 最小可运行示例：五分钟跑通寻路

```gdscript
# enemy.gd —— 挂在 CharacterBody2D 怪物上，子节点 NavigationAgent2D
extends CharacterBody2D

@onready var agent: NavigationAgent2D = $NavigationAgent2D

const SPEED := 120.0

func _ready() -> void:
    # 等第一帧物理同步后再设目标：导航网格在物理帧末才就绪
    await get_tree().physics_frame
    agent.target_position = get_tree().get_first_node_in_group("player").global_position

func _physics_process(_delta: float) -> void:
    if agent.is_navigation_finished():
        return
    var next_pos := agent.get_next_path_position()
    var dir := global_position.direction_to(next_pos)
    velocity = dir * SPEED
    move_and_slide()
```

逐段拆解：

- `await get_tree().physics_frame`：**最容易漏的一行**。NavigationServer2D 在物理帧末才同步所有 Region 数据，`_ready` 里立刻设 `target_position` 时导航地图可能还没就绪，路径计算返回起点自己，表现为「怪物原地不动或瞬移」。官方模板与示例工程都带这一帧等待；
- `is_navigation_finished()`：到达终点后为 true。不判它的话，`direction_to` 会拿到零向量到无效点的方向，角色抖动或报错；
- `get_next_path_position()`：返回路径上下一个拐点（不是每帧重算全路径）。Agent 内部沿路径推进，拐点到达后自动取下一个——所以这个 API 便宜，可以每帧调；
- `velocity = dir * SPEED` + `move_and_slide()`：移动仍然是 080 篇的物理职责，导航只给方向。**换成「直接设置 global_position = next_pos」** 会发生什么：角色无视墙体穿模——导航多边形与碰撞体只要有一处不齐就穿墙，移动永远交给物理。

## 3. 导航多边形的三种来源

### 3.1 编辑器手绘（小地图）

选中 NavigationRegion2D，在 Inspector 里新建 NavigationPolygon，用编辑器顶部的导航绘制工具直接描出可行走区。适合小场景与不对称地形。注意 outline 绘制模式是「描边成面」，画洞（障碍物）要另外用挖孔工具。

### 3.2 运行时烘焙（动态关卡）

由几何数据烘焙导航网格，适合程序生成或玩家改造地形：

```gdscript
var nav_poly := NavigationPolygon.new()
nav_poly.add_outline(PackedVector2Array([
    Vector2(0, 0), Vector2(512, 0), Vector2(512, 288), Vector2(0, 288),
]))
# 把静态障碍物的轮廓加进 agent_radius 挖孔
nav_poly.agent_radius = 16.0   # 按角色半径内缩，等效「贴墙留缝」
region.navigation_polygon = nav_poly
nav_poly.make_polygons_from_outlines()   # 已弃用的旧 API，仅示意流程
```

真实推荐路径是用 `NavigationServer2D.parse_source_geometry_data()` + `bake_from_source_geometry_data()` 的两段式（可放线程，不卡主循环）。新手只需记住两点：烘焙是**重操作**，别每帧做；`agent_radius` 让网格自动离墙一个角色半径，是防蹭墙的第一道保险。

### 3.3 TileMap 导航层自动生成（关卡游戏首选）

在 TileSet 上添加导航层（Navigation 层 0），给地面图块画上导航多边形（通常是整格矩形），之后 [090 篇](/godot/090-TilemapsAndLevelDesign)里画的每一枚地面瓦片都会自动把自己的导航块贡献给所在 TileMapLayer 的导航地图——**画地图即画导航**，不需要手绘 Region：

- TileMapLayer 的导航层默认合并相邻瓦片的导航块，整片地面自动连成一张网格；
- 墙壁图块不加导航多边形（或其瓦片不含导航层定义），自然不可通行；
- 坑位：图块画了导航多边形但忘了把该图块所在 TileMapLayer 的 `navigation_enabled` 保持开启（默认开启），或给墙壁误加了导航块——怪物沿着墙顶行走就是后者的现场。

## 4. 三个工程场景

### 场景一：俯视角怪物的「巡逻-发现-追击」（完整状态机）

真实工程形态：怪物平时沿巡逻点循环走，视野内出现玩家切入追击，丢失视野后走到最后目击点再徘徊。寻路只是移动的「腿」，状态切换才是 AI 的骨架：

```gdscript
extends CharacterBody2D

enum State { PATROL, CHASE, INVESTIGATE }

@onready var agent: NavigationAgent2D = $NavAgent
@onready var vision: RayCast2D = $Vision

const SPEED_PATROL := 60.0
const SPEED_CHASE := 130.0
const VISION_RANGE := 220.0

var state := State.PATROL
var patrol_points: PackedVector2Array = []
var patrol_index := 0
var last_seen := Vector2.ZERO

func _physics_process(delta: float) -> void:
    match state:
        State.PATROL:
            _walk_to(patrol_points[patrol_index], SPEED_PATROL)
            if _can_see_player():
                state = State.CHASE
        State.CHASE:
            # 追击时目标持续移动：每 0.25s 才重设一次 target（节流）
            _chase_timer -= delta
            if _chase_timer <= 0.0:
                _chase_timer = 0.25
                agent.target_position = _player.global_position
            _follow_path(SPEED_CHASE)
            if not _can_see_player():
                last_seen = _player.global_position
                agent.target_position = last_seen
                state = State.INVESTIGATE
        State.INVESTIGATE:
            _follow_path(SPEED_PATROL)
            if agent.is_navigation_finished():
                state = State.PATROL

func _walk_to(target: Vector2, speed: float) -> void:
    if agent.is_navigation_finished():
        patrol_index = (patrol_index + 1) % patrol_points.size()
        agent.target_position = patrol_points[patrol_index]
        return
    _follow_path(speed)

func _follow_path(speed: float) -> void:
    if agent.is_navigation_finished():
        return
    var dir := global_position.direction_to(agent.get_next_path_position())
    velocity = dir * speed
    move_and_slide()

func _can_see_player() -> bool:
    var to_player := _player.global_position - global_position
    if to_player.length() > VISION_RANGE:
        return false
    vision.target_position = to_player
    vision.force_raycast_update()
    return not vision.is_colliding()
```

讲解：

- **巡逻点之间也走导航**：`_walk_to` 对巡逻点设 `target_position`，怪物在巡逻段也会绕障——手绘巡逻点只要落在导航网格上即可，不必精确贴着走廊走；
- **追击目标节流重设**（`_chase_timer`）：玩家每帧都在动，每帧重设 target 会让 Agent 每帧重算全路径，十只怪就是十倍开销。0.25 秒的重设间隔在视觉上无感、成本上减一个量级，官方文档明确建议「不要每帧更新目标」；
- **视野检测与寻路解耦**：`_can_see_player` 用 085 篇讲过的射线（配碰撞层：只检测墙层），导航管「怎么走」、射线管「能不能直接看见」——丢失视野时不立刻回巡逻，而是去 `last_seen` 最后目击点，AI 行为的「聪明感」多来自这类状态衔接；
- **切换到 INVESTIGATE 时立刻设一次 target**：状态切换与目标更新在同一帧完成，避免用上一状态的旧路径走新目标。

### 场景二：TileMap 关卡的批量敌人寻路

真实工程形态：塔防/俯视角 RPG 的关卡是 TileMap 画的，刷怪点与家基都在格子上。敌人按瓦片出生，寻路目标随家基位置固定：

```gdscript
# spawner.gd —— 挂在场景里
extends Node2D

const ENEMY_SCENE := preload("res://enemy.tscn")

func _ready() -> void:
    await get_tree().physics_frame   # 等 TileMap 导航数据同步
    var tilemap: TileMapLayer = $Ground
    var spawn_cell := Vector2i(2, 10)
    var home_cell := Vector2i(22, 8)

    for i in 5:
        var enemy := ENEMY_SCENE.instantiate()
        enemy.global_position = tilemap.map_to_local(spawn_cell)
        add_child(enemy)
        enemy.set_home(tilemap.map_to_local(home_cell))
```

讲解：

- `map_to_local` 把格子坐标换算成世界坐标（090 篇的坐标互转），出生点必须落在**有导航多边形的瓦片**上——生成器刷在墙壁格子上，敌人原地不动且无报错，这是「TileMap 导航」最高频的事故；
- 等待一帧的逻辑与最小示例相同：TileMap 的导航合并同样发生在物理帧同步；
- 敌人脚本复用场景一的 Agent 移动逻辑，`set_home` 只设一次 `target_position`——固定目标的寻路几乎零持续开销，这正是「导航成本 = 重设次数 x 路径长度」的直观体现。

### 场景三：取舍分析——横版平台游戏为什么常不该用导航网格

反例场景：团队给横版平台跳跃游戏接了 NavigationRegion2D，发现敌人「会绕路却不会跳」。取舍分析：

- **模型不匹配**：导航网格回答「在同一平面上绕过障碍」，平台游戏的移动是「重力 + 跳跃弧线」。网格里两个平台即使水平相邻，跳跃所需的高度差、水平距离、起跳时机都不在导航数据里——引擎算出的「路径」到了平台边缘就断头；
- **官方给的补丁与它的代价**：NavigationLink2D 可以在两个平台间手工连一条「链接边」，Agent 会沿它走——但链接只提供直线穿越，起跳与落点的运动仍要自己写，等于导航系统只做了「标记」没做「移动」；链接多了维护成本反超收益；
- **平台游戏的常规方案**：敌人 AI 用「水平直冲 + 边缘检测（RayCast2D 向下探地）+ 跳距检查」的组合——不需要全图路径，只需要「别掉下去」与「够得着就跳」两条局部规则；需要全局决策时（Boss 战场地划分）用格子化 A*（AStar2D 手动建图，把跳跃作为带代价的边）而不是导航网格；
- **判断口诀**：角色移动靠重力就慎用导航网格；移动是「贴地滑行」（俯视角、顶视角、塔防）导航网格就是标准答案。

## 5. 避障（avoidance）：velocity 的正确用法

基础寻路只保证「沿网格能到」，多角色互相挤在一起时需要 avoidance（RVO 避免）。NavigationAgent2D 的避障协议是**请求-应答**式：

```gdscript
@onready var agent: NavigationAgent2D = $NavAgent

func _physics_process(_delta: float) -> void:
    if agent.avoidance_enabled:
        # 1. 把「我想走的方向」交给避障系统
        agent.velocity = global_position.direction_to(agent.get_next_path_position()) * SPEED
    else:
        _move(agent.get_next_path_position())

# 2. 避障系统物理帧末回话：给你一个避开同伴的安全速度
func _on_velocity_computed(safe_velocity: Vector2) -> void:
    velocity = safe_velocity
    move_and_slide()
```

并在 `_ready` 里连接：`agent.velocity_computed.connect(_on_velocity_computed)`。

要点与易错点：

- `agent.velocity` 的语义在开启避障后**变了**：它不再是最终速度，而是「意向速度」。最终速度以 `velocity_computed` 信号的参数为准——直接把意向速度拿去 `move_and_slide()`，避障等于没开；
- `path_desired_distance`（默认 20px）决定「离拐点多近算到达」：设太小角色在拐点附近打转，设太大切角穿进碰撞体。角色半径大就调大它；
- NavigationObstacle2D 两个模式分清：`avoidance_enabled` 时它参与 velocity 避让（推挤别的 Agent）；`affect_navigation_mesh` 时它在烘焙时把自身轮廓挖进导航网格（静态门板类）。「门开关改变可行走区」要重烘焙网格，运行时频繁开关的门更适合 avoidance 模式或直接用碰撞 + 区域逻辑。

## 6. 动手实践

任务：搭一个「巡逻-追击」小关卡，把三件套与 TileMap 导航层全部用到。

1. 按 090 篇画一张含内外墙的俯视角小地图（TileSet 地面图块配导航多边形），确认 TileMapLayer 导航生效：临时写一行 `print(get_tree().get_first_node_in_group("nav_debug"))` 前先直接观察怪物能否绕墙；
2. 实现场景一的完整状态机（巡逻点 3 个、视野 220px），验证怪物能绕 L 形墙追到玩家；
3. 制造事故一：注释掉 `await physics_frame`，观察首帧行为并解释；
4. 制造事故二：给墙壁瓦片也画上导航多边形，观察怪物行为并修复；
5. 复制 5 只怪开避障，观察挤门时的让行；再把 `velocity_computed` 的连接去掉，记录现象并解释「意向速度」语义。

<details>
<summary>参考现象与解释（先自己试，再展开对照）</summary>

第 3 题：首帧 `target_position` 设进未同步的地图，部分版本表现为怪物原地静默（路径即当前位置，`is_navigation_finished` 直接 true），恢复等待后正常——「不报错但不工作」是导航时序问题的统一长相。

第 4 题：怪物沿墙壁顶端「走上去」——墙壁瓦片带导航块意味着它在导航世界里是可行走的。修复：墙壁图块的导航多边形删掉；规则一句话：**导航多边形只画「允许 AI 站立」的瓦片**，与视觉上的碰撞与否无关。

第 5 题：去掉 `velocity_computed` 连接后，5 只怪挤成一团互相顶撞（各自按意向速度硬走，避障白算）；连接后怪群在门口自发排队绕行。这个对比是「请求-应答」协议最直观的演示。

</details>

## 7. 常见错误与对策

| 现象 | 常见原因 | 解决办法 |
| --- | --- | --- |
| 怪物原地不动、无报错 | `_ready` 里设 target 时导航未同步 | 等 `physics_frame` 再设目标；或 `call_deferred` |
| 怪物卡墙蹭墙 | 导航网格贴着碰撞墙生成 | 烘焙设 `agent_radius`；TileMap 导航块画在瓦片内缩位置 |
| 怪物沿墙顶走 | 可行走瓦片误配了导航多边形 | 导航块只画地面瓦片 |
| 十只怪后帧率下降 | 每帧重设 target 触发全量重算 | 目标节流（0.2-0.3s 或位移超阈值才重设） |
| 避障不生效、怪群互挤 | 没接 `velocity_computed`，意向速度被直接使用 | 连接信号并用安全速度移动 |
| 出生在墙里的敌人不动 | 生成点落在无导航的瓦片 | 生成前用 `map_to_local` 换算并校验格子 |

## 8. 与之前和之后的知识的关系

- 往前：移动与碰撞是 080 的 CharacterBody2D 职责；射线视野检测复用 085 的碰撞层思想；TileMap 导航层建立在 090 的 TileSet 分层认知上；
- 往后：多敌人编队与仇恨表属于 AI 设计而非导航；状态机的更多形态见 045-gdscript 模块的状态与协程篇；本机扫描的 speed-rouge 与 flower-card 两个真实项目均未使用导航系统（竞速与弹珠玩法不需要），本篇示例以 Godot 官方文档与示例工程模式改编——这本身也是选型知识：**导航不是 2D 游戏的必配项，而是「贴地寻路」需求的专属解**。

## 参考与致谢

本文三件套职责、时序约束（物理帧同步）、避障协议与 TileMap 导航层机制参考 Godot 官方文档 Navigation introduction 与 NavigationAgent2D 类文档，按 CC-BY 4.0 许可（https://creativecommons.org/licenses/by/4.0/）使用并重新组织改写。来源：https://docs.godotengine.org/en/stable/tutorials/navigation/index.html
