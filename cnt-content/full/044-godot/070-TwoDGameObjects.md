---
order: 70
title: 2D 游戏对象：精灵与相机
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 用 Node2D Sprite2D AnimatedSprite2D 与 Camera2D 搭建 2D 画面，理解坐标变换与镜头缩放边界
author: fanquanpp
updated: '2026-09-22'
related:
  - 'godot/030-FirstScriptAndLifecycle'
  - 'godot/080-CharacterPhysicsAndCollision'
  - 'godot/110-AnimationAndTween'
prerequisites:
  - 'godot/030-FirstScriptAndLifecycle'
---

在 Godot 的 2D 世界里，你能"看见"的一切都出自同一族节点：角色、敌人、子弹、背景，最后还得加上一台 Camera2D（2D 相机）决定玩家看到哪里。本篇从继承关系讲起，依次介绍 Node2D 的变换属性、Sprite2D（2D 精灵）的静态贴图与图集帧、AnimatedSprite2D（2D 动画精灵）的帧动画，最后落到 Camera2D 的锚点、缩放与边界控制。读完本篇，你应该能独立搭出一个"会动、会播动画、镜头会跟人"的 2D 场景。

前置说明：本篇默认你已经了解节点与场景的基本概念，会挂脚本、会用 _process 回调，这些内容在《第一个脚本与生命周期》中讲解。角色如何真正"走上斜坡、撞墙停下"，属于物理话题，由《角色移动与碰撞检测》负责，本篇只关心"显示"。

## 学习目标

- 画出 Node2D < CanvasItem < Node 的继承链，说清 Node2D 与 Control 的共同点
- 熟练使用 position、rotation、scale、skew 等变换属性及其全局对应版本
- 用 to_local、to_global、look_at、get_angle_to 完成坐标换算与朝向控制
- 掌握 Sprite2D 的图集帧属性，会做鼠标命中检测
- 分清 AnimatedSprite2D 中 pause 与 stop、animation_finished 与 animation_looped 的区别
- 配置 Camera2D 的锚点、缩放、边界与平滑，避开 zoom 的反直觉陷阱

## 1. CanvasItem 与 Node2D：一切可见 2D 物体的根基

Godot 的类继承链是 Node2D < CanvasItem < Node < Object。CanvasItem（画布项）是所有能在 2D 画布上绘制内容的基类，它的两个重要子类是 Node2D 与 Control：Node2D 承载游戏世界中的物体，Control 承载 UI 界面。因为它们都继承 CanvasItem，所以共享一批基础属性——例如 z_index（绘制顺序）与 visible（可见性），你可以在游戏物体和 UI 上用同一套思路控制它们。

Node2D 在 CanvasItem 之上补上了"空间变换"能力，核心属性如下：

- position：Vector2 类型，节点在父节点坐标系中的位置。
- rotation：float 类型，旋转角，单位是弧度；配套的 rotation_degrees 以角度读写，二者改一个，另一个自动同步。
- scale：Vector2 类型，缩放。有个值得知道的细节：把 X 设为负值做"水平镜像"时，引擎会把它分解为"负 Y 缩放 + 旋转 180 度"的等价形式，看到数值变化不要慌，这是矩阵分解的正常结果。
- skew：float 类型，倾斜（错切）角。
- transform：Transform2D 类型，把平移、旋转、缩放合并表达的完整变换矩阵。

每个属性还有全局对应版本：global_position、global_rotation、global_scale、global_transform，读写在全局坐标系中的值。本地坐标相对父节点，全局坐标相对整个画布，二者沿父节点链换算。

来看官方的第一个脚本示例，它同时用到了 rotation 与 position：

```gdscript
extends Sprite2D

var speed = 400
var angular_speed = PI

func _process(delta):
    rotation += angular_speed * delta
    var velocity = Vector2.UP.rotated(rotation) * speed
    position += velocity * delta
```

每一帧先让 rotation 增加，再让 position 沿"自身朝向"前进：Vector2.UP.rotated(rotation) 得到旋转后的方向向量，乘速度、乘 delta，就是帧率无关的移动。运行后节点会一边自转一边朝自身朝向前进，画出一条圆形轨迹。

## 2. 常用坐标与朝向方法

Node2D 提供了一组高频工具方法，做瞄准、跟随、命中判断时离不开它们：

- to_local(global_point)：把全局坐标点换算成本地坐标。
- to_global(local_point)：把本地坐标点换算成全局坐标。
- look_at(point)：旋转节点，让自身局部 +X 轴指向全局点 point。注意是 +X 轴：素材默认朝右时可以直接用，素材朝上就要自己补一个偏转。
- get_angle_to(point)：返回从自身指向目标点所需的角度差（弧度），常配合 rotate() 使用。
- translate(offset)：在本地坐标下平移 offset。
- rotate(radians)：在当前旋转基础上再转 radians 弧度。

CanvasItem 层面还有几个常用的显示属性：z_index 控制同层物体的绘制先后；modulate 用颜色调制节点整体，做受击闪红很常用；y_sort_enabled 开启后按 Y 坐标排序绘制，俯视角"后面的物体遮住前面的"就靠它；texture_filter 控制纹理过滤方式（线性插值或最近邻），像素风游戏通常会调整它。

下面是一个鼠标命中检测的例子：

```gdscript
func _unhandled_input(event):
    if event is InputEventMouseButton and event.pressed:
        if get_rect().has_point(to_local(event.position)):
            print("命中精灵")
```

get_rect() 返回精灵在本地坐标系中的矩形范围，把鼠标事件位置 to_local 之后用 has_point 判断是否落在矩形内。如果还想"点到透明像素不算命中"，再用 is_pixel_opaque(pos) 检查该点像素是否不透明。

## 3. Sprite2D：显示一张图与一串帧

Sprite2D 是最常用的 2D 显示节点，属性围绕一张贴图展开：

- texture：Texture2D 类型，要显示的贴图。
- centered：bool，默认 true，贴图中心对齐节点原点。像素风游戏常改成 false，或改用项目设置里的 snap_2d_vertices_to_pixel，避免贴图落在半像素位置导致的模糊变形。
- offset：Vector2，绘制偏移，只挪图不挪节点本身。
- flip_h / flip_v：水平、垂直翻转，切换角色左右朝向时比换素材省事。
- hframes / vframes：把 texture 横向、纵向各切成多少格。两者有大于 1 的值时，texture 就成了一张网格图集（sprite sheet），配合 frame 属性选择显示第几格（从 0 开始）。
- region_enabled / region_rect：不做网格切分，而是只显示贴图中 region_rect 指定的子区域。

一个易错点：frame 属性只有当 hframes > 1 或 vframes > 1 时才有意义，默认状态下改它看不到任何效果。Sprite2D 还提供两个信号：frame_changed（帧号变化时发出）与 texture_changed（贴图变化时发出），适合做"帧变化时同步碰撞盒"这类联动。

## 4. AnimatedSprite2D：让图动起来

逐帧动画不需要 AnimationPlayer，AnimatedSprite2D 一个节点就够。它的动画数据放在 sprite_frames 属性里，指向一个 SpriteFrames 资源：内部管理若干个"动画"，每个动画由一组帧贴图与帧率等参数组成，在编辑器底部面板中编辑帧与动画。autoplay 属性填一个动画名，场景一运行就自动播放它。

播放控制方法的语义差异是本节的考试重点：

- play(name = &"", custom_speed = 1.0, from_end = false)：开始播放。无参调用会从当前位置恢复播放当前动画。
- play_backwards(name = &"")：倒着播放。
- pause()：暂停。保留当前 frame 与 frame_progress，之后无参 play() 能从暂停处继续。
- stop()：停止。播放位置归 0，速度重置。
- set_frame_and_progress(frame, progress)：跳帧的同时保留进度，比直接给 frame 赋值更平滑（直接设置 frame 会重置 frame_progress）。
- speed_scale：播放速度倍率，设为负值即可倒放。
- is_playing() 与 get_playing_speed()：查询播放状态与当前速度。

信号方面注意两点：

1. animation_finished 只有没有设置循环的动画播完时发出；循环动画永远不会"结束"，它发出的是 animation_looped（每绕一圈一次）。想让循环动画每圈触发一次逻辑，请连接 animation_looped。
2. 非循环动画播完时，AnimatedSprite2D 处于"暂停"而非"停止"状态：进度还在原地，无参 play() 可以接着播。这与 stop() 的归零行为完全不同。

另外，4.x 的 animation_finished 信号不带参数，回调里若要区分是哪个动画播完，需要自己读 animation 属性判断。

```gdscript
extends AnimatedSprite2D

func _ready():
    sprite_frames = preload("res://player_frames.tres")
    animation_finished.connect(_on_animation_finished)
    animation_looped.connect(_on_animation_looped)
    play("run")

func _on_animation_finished():
    # 只有非循环动画才会走到这里；此刻是暂停而非停止，无参 play 即可续播
    play()

func _on_animation_looped():
    # 循环动画每绕一圈发出一次
    pass
```

帧动画适合逐帧绘制的素材；如果要做属性级的补间（位移、缩放、透明度过渡）或复杂时间线，Godot 还有 AnimationPlayer 与 Tween 两条路线，属于动画与补间篇章的内容，本篇不展开。

## 5. Camera2D：决定玩家看到哪里

2D 世界可以做得很大，屏幕却只有一块，Camera2D 就是那块"取景框"。它是普通节点，放进场景、（可选地）挂到玩家下面，启用后所在 Viewport 就以它为准显示画面。

基础控制：

- anchor_mode：锚定模式。默认 DRAG_CENTER，相机节点的 position 对应屏幕中心；FIXED_TOP_LEFT（枚举值 0）则对应屏幕左上角，做像素级精确的地图时更直观。
- enabled：bool，默认 true。场景里有多个相机时，调用 make_current() 让某个相机接管画面，用 is_current() 查询它是否正在生效。每个 Viewport 同一时刻只有一个活动相机。

缩放（重点，容易反直觉）：

- zoom 越大，画面越拉近。zoom = Vector2(2, 2) 时视野是原来的四分之一；zoom = Vector2(0.5, 0.5) 时视野反而扩大四倍——与"数值大等于看得多"的直觉正好相反。
- zoom 的 X 与 Y 必须设成相同的值，否则画面会被拉伸变形。

边界与平滑：

- limit_left / limit_top / limit_right / limit_bottom：限定镜头能到达的像素范围，防止玩家看到地图之外。limit_smoothed 可以让镜头抵达边界时平滑停下，但它只在开启了位置平滑时生效。
- position_smoothing_enabled 与 position_smoothing_speed（默认 5.0）：镜头位置平滑跟随，不做瞬移。传送或重开关卡后想立刻到位，调用 reset_smoothing()。
- offset：在锚点基础上整体偏移画面，并且可以突破 limit 的限制。
- ignore_rotation：默认 true，相机旋转时画面保持端正，一般保持默认即可。
- 另有一组 drag_*_margin（默认 0.2）：拖拽边距，玩家移出屏幕边缘一定比例后镜头才跟动，适合做有"松弛感"的跟随。

最后一个高频易错点：Camera2D 节点的 global_position 并不等于画面实际中心——平滑、限界、拖拽边距都会让二者错开。想知道"此刻画面中心在世界中的位置"，请调用 get_screen_center_position()。

```gdscript
extends Camera2D

func _ready():
    make_current()
    zoom = Vector2(2, 2)               # 拉近两倍，视野为原来的四分之一
    limit_left = 0
    limit_top = 0
    limit_right = 3200
    limit_bottom = 640
    position_smoothing_enabled = true
    position_smoothing_speed = 5.0

func teleport_to(pos: Vector2) -> void:
    global_position = pos
    reset_smoothing()                  # 传送后立刻对齐，不做平滑过渡
```

## 小结

- 继承链是 Node2D < CanvasItem < Node；Node2D 与 Control 都继承 CanvasItem，共享 z_index、visible 等属性。
- position、rotation、scale、skew、transform 加 global_ 前缀就是全局版本；to_local 与 to_global 负责两套坐标换算，look_at 让局部 +X 指向目标点。
- Sprite2D 用 hframes、vframes、frame 显示图集帧，frame 需要 hframes 或 vframes 大于 1 才生效；get_rect 配合 to_local 可做鼠标命中检测。
- AnimatedSprite2D 的 pause 保留进度、无参 play 可恢复，stop 位置归零；循环动画不发 animation_finished，改用 animation_looped；非循环动画播完处于暂停态而非停止态。
- Camera2D 的 zoom 越大越拉近且 X/Y 要同值；limit 限制范围，position_smoothing 提供平滑，reset_smoothing 立即到位；真实画面中心要用 get_screen_center_position() 获取。

## 参考链接

- [Node2D 类文档](https://docs.godotengine.org/en/stable/classes/class_node2d.html)
- [Sprite2D 类文档](https://docs.godotengine.org/en/stable/classes/class_sprite2d.html)
- [AnimatedSprite2D 类文档](https://docs.godotengine.org/en/stable/classes/class_animatedsprite2d.html)
- [Camera2D 类文档](https://docs.godotengine.org/en/stable/classes/class_camera2d.html)
