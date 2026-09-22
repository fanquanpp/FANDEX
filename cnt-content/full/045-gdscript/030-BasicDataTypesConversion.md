---
order: 30
title: 基本数据类型与类型转换
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 分清值类型与引用类型，掌握数字字符串与向量等基本类型的行为差异以及安全的类型转换方法
author: fanquanpp
updated: '2026-09-22'
related:
  - 'gdscript/020-VariablesConstantsEnums'
  - 'gdscript/040-OperatorsAndControlFlow'
  - 'gdscript/060-CollectionsArraysDictionaries'
prerequisites:
  - 'gdscript/020-VariablesConstantsEnums'
---

同一行 `var b = a`，对 int 是复制一份，对数组却是共享同一份数据——分不清值类型与引用类型，是初学者 bug 的高发源头。本篇先建立值类型（value type）与引用类型（reference type）的心智模型，再逐一过一遍 null、bool、int、float、String、StringName、NodePath 这些基本类型的关键行为，最后系统讲清 GDScript 的类型转换手段：构造函数、type_convert、str 系列序列化、as 强制转换与 is 检查。

## 学习目标

- 区分值类型与引用类型的传递语义，预判赋值与传参的行为；
- 掌握 null 的赋值边界，理解 GDScript 的空安全设计；
- 掌握 bool、int、float、String、StringName、NodePath 的关键特性；
- 理解向量类型内部 32 位单精度带来的精度差异；
- 按官方惯例书写布尔语境判断与判空；
- 熟练选择构造函数、type_convert、str 系列、as 与 is 完成类型转换与检查。

## 值类型与引用类型

GDScript 的类型分两大类：

- 值类型：基本类型在栈上分配，赋值与传参时按值传递——拿到的是副本，修改互不影响；
- 引用类型：Object 及其派生类型按引用传递——多个变量指向同一个对象，修改同步可见。

特别要记住这条："除了集合类型，其他内置变体类型都是值类型"。也就是说数组（Array）与字典（Dictionary）虽然是内置类型，却是引用语义；字符串（String）是值类型，内部用写时复制优化。集合类型的细节留给集合篇，这里先看两种语义的对比：

```gdscript
var a := 10
var b := a
b += 1
print(a, " ", b)    # 10 11：int 是值类型，b 拿到的是副本

var arr1 := [1, 2]
var arr2 := arr1
arr2.push_back(3)
print(arr1)         # [1, 2, 3]：数组是引用类型，两个变量指向同一数组
```

## 基本类型速览

| 类型 | 默认值 | 关键点 |
|---|---|---|
| null | null | 只能赋给动态类型变量或引用类型；不能赋给值类型 |
| bool | false | true/false 大小写敏感；可隐式转 int/float |
| int | 0 | 带符号 64 位；溢出绕回 |
| float | 0.0 | 64 位双精度；比较用 is_equal_approx()；支持科学计数法 |
| String | "" | 可变、写时复制；索引读写、负索引、三引号、% 格式化 |
| StringName | &"" | 不可变；同值同实例；性能优于 String，适合字典键 |
| NodePath | ^"" | 节点/属性路径；/ 分层级、: 指属性、.. 父节点 |

## null：空安全的第一道边界

null 只能赋给动态类型变量（Variant）或引用类型变量；赋给静态标注的值类型变量是解析错误：

```gdscript
var hp: int = null          # 解析错误：int 不可能为 null
var player: Node = null     # 合法：Node 是引用类型
var anything = null         # 合法：动态类型
```

这条规则划出了 GDScript 的空安全（null safety）边界：静态类型化的值类型变量永远不可能为 null，用它之前不需要判空；而引用类型变量可能为 null，访问其成员之前必须先确认非空。写代码时先问自己"这个变量可能是 null 吗"，答案由类型系统直接给出。

## bool、int 与 float

bool 的字面量是小写的 true 与 false，大小写敏感——TRUE 不是合法字面量。bool 可以隐式转换为 int/float（true 视为 1、false 视为 0）。

int 是带符号 64 位整数，范围极大，但溢出时会绕回（wrap around）：从最大值跳到最小值。做计数、累加或序列号生成时留意量级即可。

float 是 64 位双精度浮点，约有 14 到 15 位可靠的十进制位。由于二进制浮点的表示误差，不要用 == 直接比较浮点数，而应使用 is_equal_approx()：

```gdscript
print(0.1 + 0.2 == 0.3)                   # false：表示误差
print(is_equal_approx(0.1 + 0.2, 0.3))    # true：近似相等
```

这是一条必须养成的习惯：任何"判断两个浮点是否相等"的场合，都用 is_equal_approx()。

## String：字符串

String 是可变（mutable）的值类型，内部用写时复制（copy-on-write）优化：多个变量共享同一份数据，直到某一方修改时才真正复制，兼顾了值语义与性能。

它支持索引读写与负索引：

```gdscript
var s := "Hello"
print(s[0])      # H
print(s[-1])     # o：负索引从尾部计数
s[0] = "J"       # 索引写入单个字符
print(s)         # Jello
```

三引号字符串可以跨行书写；常用转义符如下：

| 转义序列 | 含义 |
|---|---|
| \n | 换行 |
| \t | 制表符 |
| \" | 双引号 |
| \\ | 反斜杠 |
| \uXXXX | Unicode 字符 |

% 格式化是拼日志与提示文案的常用手段，三种典型用法：

```gdscript
var player = "玩家"
print("正在等待%s" % player)                 # %s 占位
print("%s当前生命为：%s" % [player, 100])    # 多个占位用数组提供
print("pi:%.2f" % 3.1415926)                # %.2f 保留两位小数
```

## StringName 与 NodePath

StringName 用 `&` 前缀书写，是不可变（immutable）字符串：同值的 StringName 在引擎里只有一个实例，比较与哈希都极快，整体性能优于 String，非常适合做字典键或高频比较的标签：

```gdscript
var key := &"player"
```

NodePath 用 `^` 前缀书写，表示节点或属性路径：`/` 分隔层级，`:` 指向属性，`..` 表示父节点：

```gdscript
var path1 := ^"Player/Sprite"      # 子节点路径
var path2 := ^"Player:position"    # Player 节点的 position 属性
var path3 := ^"../Player"          # 父节点下的 Player
```

StringName 与 NodePath 看起来都像字符串，但语义完全不同：前者是"更快的字符串"，后者是"场景树的地址"。

## 向量类型的内部精度

Vector2、Vector3、Vector4 内部是 32 位单精度浮点，只有约 7 位可靠数字——与 64 位的 float 并不相同。日常游戏逻辑完全够用，但两类场景要留心：一是长时间累加的位置（误差会慢慢累积），二是对精度敏感的数学计算。必要时可以换用 double 精度的方案或在逻辑层控制误差。

## 布尔语境与判空惯例

任何值都可以直接放进 if 条件：当值为"该类型的默认值"时视为 false。包括：0、0.0、空字符串、空数组、空字典、null，以及 Vector2(0, 0)。

理解了 truthiness 规则，再来看官方风格指南的三个建议——它们让"条件里到底在判断什么"一目了然：

```gdscript
if is_leap_year:                    # bool 直接用，不要写 == true
    print("闰年")

if object != null:                  # 对象判空显式写 != null
    print("存在")

if not my_array.is_empty():         # 数组判空用 is_empty()
    print("有内容")
```

## 类型转换：构造函数与 type_convert

最常见的转换是调用目标类型的构造函数：

```gdscript
var a := int("100")            # 100
var b := float("3.14")         # 3.14
var c := bool(1)               # true
var node_path := ^"Player/Sprite"
var d := String(node_path)     # "Player/Sprite"
```

注意：字符串转整数失败并不报错，`int("abc")` 得到 0。所以转换前应先检查：

```gdscript
var text := "abc"
if text.is_valid_int():
    var value := int(text)
else:
    push_error("不是合法整数：%s" % text)
```

type_convert() 是万能转换函数：第一个参数是值，第二个参数是目标类型的 TYPE_* 常量，失败时返回目标类型的默认值而不是报错：

```gdscript
var n := type_convert("42", TYPE_INT)      # 42
var m := type_convert("oops", TYPE_INT)    # 0：失败返回默认值
```

str() 可以把任意参数转成 String；var_to_str() 与 str_to_var() 负责序列化与反序列化，适合把数据结构写进文本文件再原样读回来。

## as 强制转换与 is 检查

as 把值强制转换成目标类型，行为取决于类型的种类：

```gdscript
var my_node2D := $Sprite2D as Node2D    # 成功
var maybe := $Button as Node2D          # Button 不是 Node2D：得到 null，不报错
```

- 引用类型：转换失败时静默得到 null，不报错；
- 内置类型：不兼容时直接报错；
- 不能作用于字面量：`"123" as int` 报错；把变量写 `my_str as int` 则合法。

官方提示：as 失配时静默返回 null，问题容易被藏到很晚才暴露。更安全的做法是用 is 检查，或用 assert() 在调试期确认：

```gdscript
if body is not PlayerController:
    push_error("Bug: body is not PlayerController")
```

is 与 is not 检查一个值的类型（对引用类型还包括整条继承链）。原则：预期"通常就是"用 as 简洁处理；预期"可能不是"用 is 显式分支。

## is_same 与 == 的区别

== 做数值层面的比较：`1 == 1.0` 为 true，int 与 float 只要数值相等就算相等；而跨不可比类型（如 int 与 String）比较会在运行时报错。is_same() 更严格：类型必须一致（引用类型还要求是同一实例）才算相同，因此 `is_same(10, 10.0)` 为 false。

经验法则：判断"数值上等不等"用 ==；判断"是不是同一个东西"用 is_same()。

## 小结

- 基本类型按值传递、栈上分配；Object 派生类型按引用传递；集合类型是内置类型中的引用语义例外。
- null 只能进入动态类型变量与引用类型变量；静态标注的值类型变量天然空安全。
- float 比较一律用 is_equal_approx()；int 溢出绕回；向量内部是 32 位单精度、约 7 位可靠数字。
- 布尔语境以"类型默认值"为 false；按官方惯例：bool 直接判断、对象判空 != null、数组判空 is_empty()。
- 转换优先用构造函数并先做 is_valid_int() 之类的检查（int("abc") 得 0 不报错）；type_convert 失败返回默认值；str 系列负责与序列化相关的转换。
- as 失配静默返回 null 且不能作用于字面量；预期可能失配时优先 is/is not 检查与 assert()；严格同一性用 is_same()。

## 参考链接

- [GDScript 教程：基本数据类型（中文，代码 MIT 开源）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 教程：类型转换（中文）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 基础（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [GDScript 静态类型（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html)
- [GDScript 风格指南（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_styleguide.html)
