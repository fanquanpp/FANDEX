---
order: 80
title: 注解与导出属性
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 用 @export 家族把字段暴露到检查器，用 @onready 与 @tool 等注解控制初始化与编辑器行为
author: fanquanpp
updated: '2026-09-22'
related:
  - 'gdscript/070-ClassesOOPAndMemory'
  - 'godot/020-NodesScenesAndInstancing'
prerequisites:
  - 'gdscript/070-ClassesOOPAndMemory'
---

注解（Annotation）是写在脚本或语句前的特殊标记，以 @ 开头，用来改变代码的编译或编辑器行为。其中最庞大的一族是 @export 家族：它们把脚本里的成员变量"导出"到检查器（Inspector），让策划和未来的你在编辑器里直接调数值，而不用改代码。本篇先讲注解的通用规则，再系统过一遍 @export 各专用形态，最后收拢 @onready、@tool 等常用注解。

## 学习目标

- 理解注解的通用规则：作用对象、常量表达式参数与书写位置；
- 用 @export 导出各种类型的变量，并用分组与分类整理检查器界面；
- 掌握路径、多行文本、数值范围、缓动、颜色、节点路径等专用导出注解；
- 掌握标志位与枚举导出，分清 @export_enum 与 @export_flags 的取值规则差异；
- 了解 @export_storage、@onready、@tool、@icon、@static_unload、@abstract、@warning_ignore 的用途与坑。

## 注解总则

- 注解以 @ 开头；
- 默认作用于下一条非注解语句；部分注解（如 @tool）作用于整个脚本；
- 可以逐行书写，也可以与语句写在同一行；
- 注解的参数必须是常量表达式，可以用 const 常量参与运算：

```gdscript
const MAX_SPEED := 100.0

@export_range(0.0, 0.5 * MAX_SPEED) var acceleration: float
```

## @export 基础

@export 把成员变量暴露到检查器，编辑后的值随场景或资源序列化保存：

```gdscript
enum Direction { LEFT, RIGHT, UP, DOWN }

@export var player_name := ""
@export var max_hp := 100
@export var speed := 300.0
@export var tint: Color
@export var spawn_offset: Vector2
@export var direction: Direction          # 枚举：检查器显示为下拉框
@export var scores: Array[int]            # 类型化数组
@export var portrait: Texture2D           # 资源类型
@export var target: Node                  # 节点引用：只能是 Node 派生类型
```

版本注意：Godot 4.5 之前，@export 的变量必须提供初始值或显式声明类型（例如 `@export var x: int`），"裸导出" `@export var x` 会报错；4.5 起才允许省略。

## 分组与分类

变量一多，检查器就需要整理。@export 家族提供了三个整理工具：

```gdscript
@export_group("玩家属性")
@export var max_hp := 100
@export var speed := 300.0

@export_subgroup("移速")
@export var walk_speed := 120.0

@export_group("武器")
@export var damage := 10

@export_category("调试")
@export var show_hitbox := false
```

- @export_group("名字") 开启一个分组，之后的导出变量都归入其中，直到下一个分组出现；
- 分组还有第二个参数——前缀省略：@export_group("远程武器", "arrow_") 会把 arrow_speed 显示成 speed。变量名保留前缀便于代码检索，检查器里显示则更干净；
- @export_subgroup 开子分组；
- @export_category 直接开一个全新分类，切断与前面分组的嵌套关系。

## 路径与文本

路径类注解导出 String，并在检查器提供文件选择对话框：

```gdscript
@export_file var any_file                          # 项目内任意文件
@export_file("*.txt", "*.csv") var dialogue_path   # 限定扩展名
@export_dir var levels_folder                      # 项目内目录
@export_global_file var config_file                # 文件系统全局文件（项目外也可选）
@export_global_dir var backup_folder               # 文件系统全局目录
```

多行文本用 @export_multiline，检查器显示为可拉伸的文本框：

```gdscript
@export_multiline var description: String
@export_multiline var patch_notes: Array[String]
```

## 数值范围

@export_range(最小值, 最大值, [步长], [提示...]) 让 int/float 变量在检查器中渲染为滑条，各形态逐个看：

```gdscript
@export_range(0, 20) var number: int                                # 0 到 20
@export_range(-10, 20, 0.2) var number_2: float                     # 步长 0.2
@export_range(0, 100, 1, "or_greater") var power_percent: int       # 允许输入大于 100
@export_range(0, 100, 1, "or_less") var low_power: int              # 允许输入小于 0
@export_range(-180, 180, 0.001, "radians_as_degrees") var angle_radians: float  # 检查器按角度编辑，代码里存弧度
@export_range(0, 360, 1, "degrees") var heading: float              # 值以角度为单位
@export_range(0, 100, 1, "suffix:px") var border_width: int         # 显示单位后缀 px
@export_range(0, 1000, 0.01, "hide_slider") var exact_value: float  # 隐藏滑条，只能手动输入
@export_range(0, 100000, 0.01, "exp") var exponential: float        # 指数刻度滑条，小值微调、大值快调
```

提示参数可以组合使用，例如 "or_greater" 与 "suffix:px" 同用。

## 缓动、颜色与节点路径

```gdscript
@export_exp_easing var transition_speed          # 缓动曲线编辑器
@export_exp_easing("attenuation") var falloff    # 只显示衰减模式
@export_exp_easing("positive_only") var bounce   # 限制为正值

@export_color_no_alpha var dye_color: Color      # 颜色选择器不带透明度通道

@export_node_path("Button", "TouchScreenButton") var some_button   # 限制可选节点类型
```

@export_node_path 导出的值是 NodePath（节点路径），不是节点引用本身；类型参数用来限制能选哪些节点。

## 标志位与枚举

@export_flags 把 int 变量变成标志位复选界面，第 n 个名字对应 1 左移 n（1 << n）：

```gdscript
@export_flags("Fire", "Water", "Earth", "Wind") var spell_elements = 0
# Fire=1，Water=2，Earth=4，Wind=8

@export_flags("Self:4", "Allies:8", "Foes:16") var target_layers = 0   # 显式指定每个名字的值
```

引擎内置的层遮罩也有现成的注解族：@export_flags_2d_render、@export_flags_2d_physics、@export_flags_2d_navigation、@export_flags_3d_render、@export_flags_3d_physics、@export_flags_3d_navigation：

```gdscript
@export_flags_2d_physics var layers_2d_physics
```

@export_enum 把 int（或 String）变量变成下拉框，值默认从 0 依次递增：

```gdscript
@export_enum("Warrior", "Magician", "Thief") var character_class: int
@export_enum("Slow:30", "Average:60", "Fast:200") var move_speed: int   # 显式指定值
@export_enum("Slow", "Average", "Fast") var enemy_speeds: Array[int]    # 也可以导出数组
```

这里有一组容易混淆的取值规则差异：

- @export_enum 与脚本内的 enum 一样，"显式值影响后续"：@export_enum("Slow:30", "Average") 里的 Average 是 31——从上一个显式值继续递增；
- @export_flags 则始终按"第几个名字就是 1 << n"分配，不受前面显式值的影响：@export_flags("Fire:8", "Water") 里的 Water 仍是 2（1 << 1），不会变成 16。

## @export_storage

```gdscript
@export_storage var internal_state
```

普通 var 的值默认不随场景序列化；@export 既序列化又显示在检查器；@export_storage 则只做序列化——变量值会保存进场景或资源文件，但不显示在编辑器里，适合保存编辑器工具脚本的内部状态。

## @onready

```gdscript
@onready var my_label: Label = get_node("MyLabel")
```

成员变量在对象构造时就完成初始化，而对 Node 来说，那一刻子节点往往还没进入场景树，get_node 会找不到目标。@onready 把初始化推迟到 _ready() 执行时，此时整棵节点树已就绪。

@onready 与 @export 不能同用于一个变量：两者语义冲突——导出值在实例化时赋入，而 onready 又在 _ready 时重新初始化。同时使用会产生 ONREADY_WITH_EXPORT 警告，且默认按错误处理。

## @tool

```gdscript
@tool
extends Button
```

@tool 让脚本在编辑器内也运行，而不只在运行游戏时：改导出属性、改节点，效果即时反映到编辑器视图。它是编写编辑器插件与自定义编辑器控件的基础。两个注意点：

- @tool 必须放在文件顶部；
- 编辑器里跑的代码与游戏共用同一个引擎进程，慎用 queue_free() 等删除操作，删错对象可能导致编辑器崩溃。

## 其他注解速览

- @icon("res://icon.png")：给 class_name 注册的类自定义图标，写在 class_name/extends 之前；
- @static_unload：允许在脚本卸载时同时清理其静态变量状态（默认静态状态随脚本常驻内存），同样置于 class_name/extends 之前；
- @abstract（4.5+）：声明抽象类与抽象方法，完整规则见"类、面向对象与内存管理"篇；
- @warning_ignore("unused_variable")：局部忽略指定警告；警告名与项目设置 GDScript 区的警告项一一对应。还可以用 @warning_ignore_start("...") 与 @warning_ignore_restore() 圈定一段区域批量忽略。

## 小结

- 注解以 @ 开头，作用于下一条非注解语句或整个脚本，参数为常量表达式，可逐行或同行书写。
- @export 把变量暴露到检查器并随场景序列化；支持基础类型、枚举、类型化数组、资源与 Node 派生类型；4.5 以下必须有初始值或类型声明。
- @export_group/subgroup/category 整理界面；group 的第二参数是前缀省略。
- 路径族 @export_file/dir 与 global 版本限定文件选择；@export_multiline 多行文本。
- @export_range 支持步长与提示："or_greater"、"or_less"、"radians_as_degrees"、"degrees"、"suffix:px"、"hide_slider"、"exp"；另有 @export_exp_easing、@export_color_no_alpha、@export_node_path。
- @export_flags 第 n 个名字固定为 1 << n，不受显式值影响；@export_enum 与 enum 一样受显式值影响、后续递增；层遮罩族 @export_flags_2d_physics 等直接可用。
- @export_storage 只序列化不显示；@onready 推迟到 _ready 初始化，与 @export 同用触发默认按错误处理的 ONREADY_WITH_EXPORT。
- @tool 让脚本在编辑器内运行，必须置顶，慎用 queue_free；@icon、@static_unload、@abstract、@warning_ignore（支持 start/restore 区域）各有其位。

## 参考链接

- [GDScript 导出属性（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_exports.html)
- [GDScript 基础（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [GDScript 警告系统（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/warning_system.html)
- [GDScript 教程：注解（中文，代码 MIT 开源）](https://godothub.com/oss/gdscript-tutorial/)
