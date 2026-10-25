---
order: 40
title: 运算符与流程控制
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 理解运算符优先级与短路求值，掌握 if while for 与 match 模式匹配的完整语法
author: fanquanpp
updated: '2026-09-22'
related:
  - 'gdscript/030-BasicDataTypesConversion'
  - 'gdscript/050-FunctionsAndCallable'
prerequisites:
  - 'gdscript/030-BasicDataTypesConversion'
---

运算符决定"表达式怎么算"，流程控制决定"语句什么时候执行"。GDScript 在这两件事上都有自己鲜明的个性：所有二元运算符一律左结合（连幂运算也不例外）；整数除法向下取整；match 是比 switch 简洁得多的模式匹配语句。本篇把优先级表、算术与位运算细节、逻辑短路、各类分支与循环、以及 match 的全部模式形态一次讲透。

## 学习目标

- 记住运算符优先级表，理解"所有二元运算符左结合"对幂运算的影响；
- 掌握整数除法、取模、常用数学函数与位运算标志位惯用法；
- 理解逻辑运算的短路求值并正确安排判断顺序；
- 用 in/not in 与 is/is not 做成员与类型判断，用三元表达式简化赋值；
- 熟练使用 if/elif/else、while、for 与 range() 的四种形态、break 与 continue；
- 掌握 match 语句的类型严格性、全部模式形态与 when 模式防护。

## 运算符优先级与结合性

GDScript 运算符优先级从高到低共 23 级：

1. `()` 分组；
2. `x[index]` 下标访问；
3. `x.attribute` 属性访问；
4. `foo()` 方法调用；
5. `await x`；
6. `x is Node`、`is not`；
7. `**` 幂；
8. `~x` 按位取反；
9. `+x`、`-x` 一元正负；
10. `*`、`/`、`%`；
11. 二元 `+`、`-`；
12. `<<`、`>>` 移位；
13. `&`；
14. `^`；
15. `|`；
16. `==`、`!=`、`<`、`>`、`<=`、`>=`；
17. `in`、`not in`；
18. `not`；
19. `and`；
20. `or`；
21. 三元 `a if cond else b`；
22. `as`；
23. 赋值（=、+=、-= 等）。

粗略记忆：算术高于移位，移位高于按位与、异或、或；比较高于 in，再高于 not、and、or；as 与三元先于赋值。

重点：所有二元运算符都是左结合，包括幂运算。所以 `2 ** 2 ** 3` 等于 `(2 ** 2) ** 3`，也就是 64，而不是数学习惯的 `2 ** (2 ** 3)`（256）。写连续幂运算时务必加括号，不要依赖默认结合性。

## 算术运算的细节

整数除法向下取整：

```gdscript
print(5 / 2)         # 2：两个 int 相除得 int，向下取整
print(5 / 2.0)       # 2.5：任一操作数是浮点，按浮点除
print(float(5) / 2)  # 2.5
```

取模 `%` 只能用于整数；浮点取模用 fmod()。负数取模的结果带被除数的符号，要数学意义的余数用 posmod()：

```gdscript
print(-7 % 3)          # -1：带符号
print(posmod(-7, 3))   # 2：数学余数
print(fmod(-7.5, 2))   # -1.5：浮点取模
```

常用数学函数（全局函数，不少提供 int/float 专版）：abs、absi、absf 求绝对值；sign 取符号；clamp、clampi、clampf 限制范围；lerp、lerpf 线性插值；round 四舍五入；floor 向下取整；ceil 向上取整；snapped 吸附到步长；fmod、posmod 取模；sin、cos、tan 三角函数；atan2 二参数反正切；min、max 系最值；wrap、wrapf、wrapi 数值环绕。这些函数覆盖了游戏数值计算的绝大多数需求，建议在官方类参考里过一遍签名。

## 位运算与标志位惯用法

位运算符有：`~` 取反、`<<` 左移、`>>` 右移、`&` 按位与、`|` 按位或、`^` 按位异或，以及对应的复合赋值 `&=`、`|=`、`^=`、`<<=`、`>>=`。

游戏里最常见的用途是标志位（flags）：用一个 int 的各个二进制位表示一组开关：

```gdscript
const FLAG_FIRE := 1 << 0     # 1
const FLAG_WATER := 1 << 1    # 2
const FLAG_WIND := 1 << 2     # 4

var flags := 0
flags |= FLAG_FIRE | FLAG_WATER     # | 组合标志
if flags & FLAG_FIRE:               # & 检查标志
    print("着火了")
flags &= ~FLAG_WATER                # & ~ 清除标志
flags ^= FLAG_WIND                  # ^ 翻转标志
```

口诀：`|` 组合、`&` 检查、`& ~` 清除、`^` 翻转。@export_flags 注解可以让这套标志位直接出现在编辑器检查器里，后续注解篇会展开。

## 逻辑运算与短路求值

逻辑非、与、或有英文写法 not、and、or 与符号写法 !、&&、|| 两种，官方风格指南推荐英文写法。

and 与 or 都会短路求值（short-circuit evaluation）：and 左侧为 false 时不再求右侧；or 左侧为 true 时不再求右侧。这是空安全的常用手法：

```gdscript
# and 短路：object 为 null 时不会调用 has_method
print(object != null and object.has_method("foo"))
```

注意顺序不能颠倒：先判空、再使用。如果写成 `object.has_method("foo") and object != null`，短路保护就完全失效了。

## 比较、成员与类型判断

== 做数值比较：`1 == 1.0` 为 true；跨不可比类型（如 int 对 String）比较会在运行时报错；需要"严格同一"的判断用 is_same()（见数据类型篇）。

in 与 not in 有四种用途：

```gdscript
if "ell" in "Hello":               # String：子串判断
    print("包含子串")
if 3 in [1, 2, 3]:                 # Array：成员判断
    print("数组里有 3")
if "hp" in {"hp": 100}:            # Dictionary：判断键
    print("有 hp 键")
if "position" in get_parent():     # Object：判断成员
    print("父节点有 position")
```

对 Object 而言，名称对应的属性或方法存在即成立。

is 与 is not 做类型检查：

```gdscript
if node is Node2D:
    print("是 2D 节点")
if body is not PlayerController:
    print("不是玩家控制器")
```

对编译期已知类型、结果必为 false 的 is 检查，解析器会直接报编译错误——这能把"类型写错了"这类问题提前到解析期。

## 三元表达式

条件表达式 `a if cond else b` 是表达式版的 if-else，适合按条件二选一赋值：

```gdscript
y += 3 if y < 10 else -1
```

三元可以嵌套，但嵌套超过两层就难以阅读，官方建议改写成 if-elif-else 语句。

## if / elif / else

```gdscript
if 1 + 1 == 2:
    print("1+1=2")
elif 1 + 2 == 3:
    print("1+2=3")
else:
    print("都不是")
```

三条规则：条件的括号可以省略；多分支时只执行第一个成立的分支（后面即使也成立也会被跳过）；嵌套建议不超过 3 层，超过时优先用提前 return 或拆分函数来"拍平"结构。

## while 循环

```gdscript
var count := 0
while count < 10:
    count += 1
```

Godot 的场景由主线程逐帧驱动，while 写出无限循环会卡死整个主线程，表现为游戏与编辑器双双无响应。条件必须朝结束方向变化；需要长时间运算时改用协程（await）分帧处理，例如借助 SceneTree 定时器让出执行权（协程详见函数与协程篇）。

## for 循环与 range()

for 可以迭代范围、数组、字符串、字典等。直接迭代整数与 range() 的三种形态合计四种常用写法：

```gdscript
for i in 10:                 # 0 到 9
    print(i)
for i in range(2, 5):        # 2 3 4
    print(i)
for i in range(0, 10, 2):    # 0 2 4 6 8
    print(i)
for i in range(10, 0, -2):   # 10 8 6 4 2
    print(i)
```

字符串可以逐字符迭代：

```gdscript
for c in "Hello":
    print(c)     # H e l l o
```

从 Godot 4.2 起，迭代变量可以标注类型：

```gdscript
for name: String in names:
    print(name)
```

迭代变量由 for 自动声明，作用域仅限循环体；在循环体内手动修改它只在当轮生效，下一轮会被重新赋值。

## break 与 continue

- break 立即跳出所在的那一层循环；
- continue 结束本轮，直接进入下一轮；
- 循环嵌套时，二者都只作用于它们所在的那一层，不会影响外层循环。

## match 语句与模式匹配

match 是 GDScript 的模式匹配语句，对应其他语言的 switch，但更简洁：没有 case 关键字、不需要 break（命中一个分支执行完即止）、default 分支换成通配符 `_`。匹配从上到下逐个尝试，命中即止：

```gdscript
match command:
    "start":
        print("开始")
    "stop":
        print("停止")
    _:
        print("未知命令")
```

match 的类型匹配比 == 严格：1 不会匹配 1.0；唯一的例外是 String 与 StringName 可以互相匹配（"hello" 与 &"hello" 视为相等）。

下面用一段代码展示全部模式形态（实际使用时按需组合）：

```gdscript
match x:
    1:                                    # 字面量模式
        print("one")
    1, 2, 3:                              # 多重模式：任一命中即可
        print("1 - 3")
    []:                                   # 空数组
        print("Empty array")
    [1, 3, "test", null]:                 # 精确数组
        print("Very specific")
    [var start, _, "test"]:               # 绑定 + 通配
        print(start)
    [42, ..]:                             # 开放式数组：首元素是 42 即可
        print("Open ended")
    {}:                                   # 空字典
        print("Empty dict")
    {"name": "Dennis", "age": var age}:   # 键值匹配 + 绑定
        print(age)
    {"name", "age"}:                      # 只检查键存在
        print("has keys")
    _:                                    # 通配符（default）
        print("other")
    var new_var:                          # 绑定模式：任何值都命中并绑定
        print(new_var)
```

数组模式逐元素匹配：`[]` 匹配空数组；`[1, 3, "test", null]` 要求长度与内容完全一致；`[var start, _, "test"]` 把第一个元素绑定到 start、第二个元素用 `_` 忽略；`[42, ..]` 是开放式数组，只要求开头是 42。字典模式默认要求长度与模式一致：`{"name": "Dennis", "age": var age}` 要求恰好有这些键且值匹配；`{"name", "age"}` 只检查键是否存在、不关心值；要允许额外的键，用 `..` 结尾的开放式字典，如 `{"name": var name, ..}`。`_` 是通配符，等价于 default；`var new_var` 是绑定模式，任何值都命中并绑定到新变量。

when 写在模式后面，构成模式防护（pattern guard）：

```gdscript
match point:
    [0, 0]:
        print("Origin")
    [var x, var y] when y == x:
        print("Point on line y = x")
```

只有当模式本身匹配成功时才求值守卫表达式；守卫为 false 时继续尝试下一个分支。上例中，[0, 0] 会被第一个分支优先捕获，其余满足 y == x 的点落入第二个分支——分支顺序在这里就是语义。

## 小结

- 优先级从高到低：分组、下标、属性、调用、await、is、幂、一元正负、乘除模、加减、移位、按位与/异或/或、比较、in、not、and、or、三元、as、赋值；所有二元运算符左结合，连续幂务必加括号（2 ** 2 ** 3 是 64 不是 256）。
- 整数除法向下取整（5 / 2 == 2）；% 仅限整数，小数用 fmod，数学余数用 posmod。
- 标志位口诀：| 组合、& 检查、& ~ 清除、^ 翻转。
- and/or 短路求值：先判空、再使用，顺序即安全。
- in/not in 四用途：子串、数组成员、字典键、对象成员；is/is not 类型检查，必为 false 的检查直接编译报错。
- if 只执行第一个成立分支、括号可省略；while 无限循环卡死主线程；for 迭代变量自动声明、4.2 起可标类型；break/continue 只作用于本层。
- match 命中即止、类型严格（仅 String 与 StringName 互相匹配）；模式有字面量、多重、数组（精确/绑定/通配/开放式）、字典（键值/键存在/绑定/开放式）、通配与绑定；when 防护在模式命中后才求值。

## 参考链接

- [GDScript 教程：算术和位运算符（中文，代码 MIT 开源）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 教程：match 语句（中文）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 教程：循环语句（中文）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 基础（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [GDScript 风格指南（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_styleguide.html)
