---
order: 10
title: GDScript 语言概述
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 认识 GDScript 的定位与版本演进，写出第一个脚本并掌握缩进注释与代码区域等基础规则
author: fanquanpp
updated: '2026-09-22'
related:
  - 'godot/030-FirstScriptAndLifecycle'
  - 'gdscript/020-VariablesConstantsEnums'
prerequisites: []
---

GDScript 是 Godot 引擎的内置脚本语言（built-in scripting language），官方对它的定义是：高级（high-level）、面向对象（object-oriented）、命令式（imperative）、渐进类型（gradually typed）。它的语法风格与 Python 相近，但官方文档明确声明 "GDScript is not based on Python"——它不是 Python 的移植，而是为 Godot 的节点（Node）与场景（Scene）体系量身定制的语言：你可以直接重写 _ready()、_process() 这类生命周期虚方法，用 $NodePath 取节点，用 @export 把变量导出到检查器面板。你在 godot 模块里已经见过这些身影，本模块开始正式学习这门语言本身。

作为渐进类型语言，GDScript 允许同一个脚本里混用动态与静态两种风格：写原型时可以不加类型标注快速迭代，稳定后再逐步补上类型。静态类型不只是写在代码里的文档——编译期已知类型时，GDScript 会使用优化后的 opcode（操作码），执行速度更快。这意味着给变量补类型标注，既提升可读性，也实实在在提升运行性能。

## 学习目标

- 说清 GDScript 的语言定位，以及它与 Python 的真实关系；
- 了解 Godot 4.2 到 4.7 各版本引入的语言层新能力，以及 4.7 的两条破坏性变更；
- 写出第一个脚本并挂到节点上，在输出面板查看结果；
- 使用单行注释、文档注释（##）与代码区域（#region）组织代码；
- 掌握缩进、续行、一条语句等代码结构规则与标识符命名规则；
- 认识 Godot 4.7 的关键字完整列表与常见字面量写法。

## 语言定位：为 Godot 而生

GDScript 与引擎共享同一套类型系统（Variant 体系），节点、信号、资源都能作为"一等公民"直接书写，不需要额外的绑定层。在脚本里：

- `_ready()` 在节点及其全部子节点就绪后被调用，且每个节点只调用一次；
- `$Sprite` 是 `get_node("Sprite")` 的简写；`%UniqueName` 按唯一名称取节点；
- `@export var speed = 300` 会把变量显示在编辑器检查器中，直接在面板里改值。

这些能力都是语言内建的。对初学者而言，GDScript 是官方文档与教程的默认语言，也是从"会点编辑器"到"能写游戏逻辑"之间最短的那条路。

## 静态类型的收益

```gdscript
var dynamic_value = 10          # 动态风格：Variant，可以再赋其他类型
var typed_value: int = 10       # 静态风格：显式标注 int
var inferred_value := 10        # 静态风格：:= 由右侧推断为 int
```

三种写法都能运行，区别在于：类型在编译期已知的变量，编译器可以使用优化后的 opcode，执行更快；同时类型错误能在解析期就被发现，而不是等到运行时才崩溃。本模块后续各篇会反复强调这一点，并给出官方推荐的静态类型写法。

## 版本演进：从 4.2 到 4.7

GDScript 在 Godot 4 系列中持续演进，以下时间点值得记住（引用特性时注意版本，不要张冠李戴）：

| 版本 | 语言层要点 |
|---|---|
| 4.2 | for 循环变量可标注类型：`for name: String in names:` |
| 4.4 | 类型化字典 `Dictionary[K, V]` |
| 4.5 | 可变参数 `...args: Array`；`@abstract` 抽象类与抽象方法 |
| 4.6 | `is not`、`not in` 与 match 的 `when` 模式防护已在文档中存在（并非 4.7 新增） |
| 4.7 | 语言层破坏性变更仅两条（见下） |

Godot 4.7（2026 年中发布，主题 "Lights, Camera, Action!"）在 GDScript 层面的破坏性变更只有两条：

1. 设置紧缩数组（Packed Array）的元素，不再触发整个紧缩数组属性的 setter；
2. 继承自带类型返回值的方法时，重写方法会继承返回类型，必须显式 `return`。

对绝大多数存量项目而言这两条影响很小。本教程以 stable（当前 4.7）官方文档为准。

## 第一个脚本

```gdscript
extends Node

func _ready() -> void:
    print("Hello, Godot!")
```

操作步骤：

1. 在场景中选中一个节点，为其附加脚本（新建脚本时基类选 Node）；
2. 写入上面的代码并保存；
3. 运行场景，在编辑器下方的"输出"面板中看到 `Hello, Godot!`。

`_ready()` 是放置初始化逻辑的标准位置：调用时机是节点及子节点全部就绪之后，每节点仅一次。如果需要在每帧执行的逻辑，则重写 `_process(delta)`，参数 `delta` 是上一帧到这一帧的间隔秒数。

## 输出与诊断：print、push_error 与 push_warning

```gdscript
func _ready() -> void:
    print("生命值：", 80, "/", 100)     # print 接收任意数量的参数
    push_warning("生命值低于安全阈值")   # 警告，附带调用堆栈
    push_error("配置项缺失")            # 错误，附带调用堆栈
    printerr("写入错误输出的另一途径")   # 另一个错误输出函数
```

日常调试输出用 `print()`；需要提示问题但不中断程序时用 `push_warning()` 与 `push_error()`——它们会在编辑器输出中显示调用堆栈（call stack），比 print 更容易定位问题来源。此外还有一个 `printerr()`，用于向错误输出写内容。

## 注释体系：单行、文档注释与代码区域

单行注释从 `#` 开始到行尾：

```gdscript
# 初始化玩家状态
var health := 100
```

文档注释用双井号 `##`，写在成员声明的正上方。它会进入脚本文档：在编辑器中悬停该成员名即可看到；对 @export 导出的变量，这些文字还会成为检查器里的提示。

```gdscript
## 玩家的最大生命值。
## 超过该值的治疗无效。
@export var max_health: int = 100
```

注释标记（comment marker）会被编辑器高亮：TODO、FIXME、WARNING 显示为黄色，NOTE、INFO 显示为绿色等。用它标记待办与警示非常直观：

```gdscript
# TODO: 接入存档系统
# FIXME: 边界情况下碰撞判断错误
# WARNING: 该函数尚未做输入校验
# NOTE: 仅在调试构建中生效
# INFO: 自 4.7 起行为有变化
```

代码区域用 `#region` 与 `#endregion` 包裹（注意 # 与 region 之间不能有空格），编辑器中可以整体折叠：

```gdscript
#region 生命值系统
var health := 100

func take_damage(amount: int) -> void:
    health -= amount
#endregion
```

## 代码结构规则：缩进、续行与一条语句

缩进（indentation）是 GDScript 语法的一部分，不是可选的排版习惯：

- 同一文件中空格与 Tab 不能混用，混用会直接报错；
- 官方风格指南推荐 Tab 缩进（也是编辑器的默认设置）。

一条语句占一行；用分号把多条语句挤在一行是官方禁止的。跨行长表达式优先用括号自然续行，反斜杠续行可用但官方不推荐：

```gdscript
# 不推荐：反斜杠续行
var total := 1 + \
    2 + \
    3

# 推荐：括号内的换行是自由的
var total_paren := (
    1 + 2 + 3
)
```

## 标识符与命名

标识符（identifier）由字母、数字、下划线组成，不能以数字开头，并且区分大小写——health 与 Health 是两个不同的名字。命名惯例采用蛇形命名（snake_case）：变量与函数如 `move_speed`、`load_level()`；前置下划线 `_` 表示私有成员，如 `var _counter = 0`。完整的命名约定（类用 PascalCase、常量用全大写等）见官方风格指南，本模块会逐步用到。

## 关键字

Godot 4.7 的关键字完整列表如下，这些名字不能用作标识符：

```text
if elif else for while match when break continue pass return
class class_name extends is in as self super signal func static
const enum var breakpoint preload await yield assert void
PI TAU INF NAN
```

其中 PI、TAU、INF、NAN 是常量关键字，分别表示圆周率、两倍圆周率（tau = 2 × pi）、无穷大与非数（NaN）。其余关键字将在后续各篇逐一登场：var/const/enum 在变量篇，func/signal/await 在函数与信号篇，class/class_name/extends 在面向对象篇。

## 字面量速览

```gdscript
var bits := 0b1001              # 二进制，等于 9
var mask := 0xF5                # 十六进制
var population := 10_000_000    # 下划线分位，便于阅读大数
var g := 2.1e9                  # 科学计数法
var poem := """
白日依山尽，
黄河入海流。
"""                             # 三引号字符串，可跨行
var raw := r"C:\new\test"       # 原始字符串：反斜杠不转义
var key := &"player"            # StringName 字面量
var path := ^"Player/Sprite"    # NodePath 字面量
```

整数支持二进制 `0b` 与十六进制 `0x` 前缀，以及下划线分位；浮点支持科学计数法；字符串可以用单引号、双引号与三引号书写，`r` 前缀表示原始字符串；`&` 前缀创建 StringName，`^` 前缀创建 NodePath。它们的行为差异将在数据类型篇展开。

## 小结

- GDScript 是 Godot 内置的高级、面向对象、命令式、渐进类型语言；语法像 Python，但官方明确声明它并不基于 Python。
- 静态类型的变量在编译期使用优化后的 opcode，执行更快；动态与静态风格可以混用。
- 版本要点：4.2 循环变量类型标注；4.4 类型化字典；4.5 可变参数与 @abstract；is not、not in 与 when 在 4.6 已存在；4.7 只有两条破坏性变更（紧缩数组元素赋值不再触发 setter；重写带类型返回值的方法必须显式 return）。
- 第一个脚本：重写 `_ready()`，用 `print()` 输出，在输出面板查看。
- 注释分三层：`#` 单行、`##` 文档注释（写在成员正上方）、`#region` 折叠区域；TODO/FIXME/WARNING 黄色，NOTE/INFO 绿色。
- 缩进是语法：Tab 优先、不能与空格混用；一行一条语句；折行用括号。
- 标识符区分大小写、不能数字开头；变量函数 snake_case，前置下划线表示私有。

## 参考链接

- [GDScript 教程（中文，代码 MIT 开源）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 基础（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [GDScript 风格指南（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_styleguide.html)
- [GDScript 文档注释（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_documentation_comments.html)
- [升级到 Godot 4.7（官方文档）](https://docs.godotengine.org/en/stable/tutorials/migrating/upgrading_to_godot_4.7.html)
