---
order: 50
title: 变量、Python 语句与存储
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 分清 define 与 default 的保存语义，学会在剧本中嵌入 Python 代码并理解 store 命名空间
author: fanquanpp
updated: '2026-09-22'
related:
  - 'renpy/040-LabelsControlFlowAndMenus'
  - 'renpy/100-SaveLoadAndRollback'
prerequisites:
  - 'renpy/040-LabelsControlFlowAndMenus'
---

上一篇我们用 default 声明标志变量、用 $ 修改它们，已经摸到了 Ren'Py 与 Python 结合的门槛。但"什么时候用 define、什么时候用 default、什么时候用 init python"是每个 Ren'Py 作者迟早要回答的问题——答案取决于变量的保存语义：它要不要进存档、要不要参与回滚（rollback）。本篇系统梳理在剧本中嵌写 Python 的全部方式，并解释这些变量最终住在哪里、怎么被保存、怎么被读取。

Ren'Py 引擎本身用 Python 编写（8.4 版起各平台统一使用 Python 3.12），脚本语言天然可以嵌入 Python。理解本篇之后，你在剧本里拥有的就不只是"写台词的能力"，而是一门完整的编程语言来管理游戏状态。

## 学习目标

- 说清 define 与 default 的本质区别与各自的适用场景；
- 掌握 define 的进阶写法：命名 store、+= 与 |=、init 优先级；
- 会用 $ 写单行 Python，会用 python 块写多行逻辑，理解 hide 与 in 两个修饰符；
- 会用 init python 在初始化阶段定义函数与配置变量，理解 init 优先级的执行顺序；
- 记住三条官方警告：__slots__、下划线前缀、define 变量与标志变量的冲突；
- 理解 store、命名 store 与常量 store 三个概念。

## define 与 default：两条声明路线

### define：初始化时设置的常量

define 语句在 init 阶段把单个变量设为给定值，此后该变量被视为常量（constant）：不参与保存与读取，设置之后不应再更改。最典型的用途是角色对象：

```renpy
define e = Character("Eileen")
```

define 等价于下面的 init python 写法：

```renpy
init python:

    e = Character("Eileen")
```

但官方明确建议优先使用 define，因为它有两个等价写法没有的优势：

- define 会记录这次赋值所在的文件名与行号，在 launcher 中可以据此直接跳转到定义处；
- Lint（Check Script）能够检查 define 变量，例如发现重复定义一类的问题。

define 还支持写入命名 store：

```renpy
define character.e = Character("Eileen")
```

以及复合赋值运算符 += 与 |=：

```renpy
define config.keymap["dismiss"] += [ "K_KP_PLUS" ]
define endings |= { "best_ending" }
```

第一行往 config.keymap 的 dismiss 列表追加一个按键，第二行往 endings 集合并入一个结局。此外 define 也接受 init 优先级，数字写在 define 与变量名之间，例如 define -1 value = ... 会在普通优先级的 define 之前执行。

### default：游戏开始与读档后的默认值

```renpy
default points = 0
```

default 在变量未定义时把它设为默认值——这发生在两个时机：游戏开始时，以及读档后（存档里没有这个变量时）。实际设置发生在 splashscreen 与主菜单之前，因此主菜单阶段的代码就可以安全使用 default 变量。若读档后发现某个变量未定义，其效果等价于在 after_load 标签里手动补一次默认值赋值。

与 define 相反，default 声明的变量总是参与保存。它同样支持命名 store：

```renpy
default schedule.day = 0
```

### 一句话经验规则

会被游戏过程改变的玩家状态用 default；角色、样式、转场这类不变的常量用 define。回看上一篇的标志变量 book：玩家可能把它改成 True，它要进存档，所以必须用 default；而 Character 对象整局游戏都不会变，适合 define。

## 单行 Python：$ 语句

以 $ 开头的行是一条单行 Python 语句，它始终在默认 store 中运行：

```renpy
$ flag = True
$ romance_points = 0
$ romance_points += 1
$ renpy.movie_cutscene("opening.ogv")
```

一个 $ 只能写一条语句，但语句本身可以是任意 Python 表达式——赋值、自增、调用函数都可以。上一篇用它改标志变量，这里最后一行还演示了调用引擎函数的用法。

## python 块：多行 Python

需要多行逻辑时使用 python 块：

```renpy
python:
    player_health = max(player_health - damage, 0)
    if enemy_vampire:
        enemy_health = min(enemy_health + damage, enemy_max_health)
```

这个官方示例展示了 python 块的价值：块内可以写 if 判断与多行计算，而不必拆成一长串 $ 语句。python 块有两个修饰符：

- hide：python hide: 在匿名作用域中运行，块内创建的变量是临时的，不会留在 store 里、不可保存。做"用完即弃"的工作（比如临时文件操作）时用它，避免临时变量污染游戏状态；
- in：python in 名字: 在指定的命名 store 中运行，详见后文。

## init python：初始化阶段执行

init python 块在游戏载入前的初始化阶段运行，适合定义函数、初始化样式、设置 config 变量与 persistent 数据：

```renpy
init python:

    def auto_voice_function(ident):
        return "voice/" + ident + ".ogg"

    config.auto_voice = auto_voice_function

    if persistent.endings is None:
        persistent.endings = set()

init 1 python:

    # The bad ending is always unlocked.
    persistent.endings.add("bad_ending")
```

### init 优先级

init 与 python 之间可以写一个优先级数字（如 init 1 python:），不写时默认为 0。所有 init 块按优先级从低到高运行；优先级相同的，按文件路径的 Unicode 顺序执行。上例中 init 1 python 保证在默认优先级的 init python 之后运行，于是 persistent.endings 集合一定已被初始化，随后的 add 才不会出错。

官方约定：创作者应把自定义优先级控制在 -999 到 999 的范围内；低于 0 的优先级一般保留给库（library）与主题（theme）。另外要注意：init python 中赋值的变量不会被保存与读取，也不参与回滚——这符合"初始化产出的东西属于游戏结构、而非玩家状态"的直觉。

## 三个必须记住的警告

第一，类不支持 __slots__。在 Ren'Py 中创建的、不继承任何类的类不支持 __slots__——使用它会破坏回滚。如果确实需要 slotted 类，应显式继承 python_object，但这样的对象不支持回滚。

第二，下划线开头的名字保留给 Ren'Py。自己定义的变量、函数不要以 _ 开头。

第三，define 变量不得再当标志变量用。写下 define e = Character("Eileen") 之后，就不要再把 e 当作游戏过程中的标志或计数器去赋值——define 变量是常量，语义上不保存也不回滚，混用会让存档行为变得难以预测。游戏过程会变的状态，请回到 default。

## store 与命名 store

所有变量的默认存储处叫 store。脚本里用 define、default、$ 直接操作的都是它。

除了默认 store，还可以创建命名 store（named store），把一组变量与主 store 隔离：

```renpy
init python in mystore:
    a = 1
```

要从命名 store 取出变量，使用 Python 的导入语法：

```renpy
from store.named import variable
```

注意：导入是重绑定（rebinding）而不是起别名——导入之后两边是各自独立的变量绑定，一边改动不会同步到另一边。

### 常量 store

在某个 store 中设置 _constant = True，可以把整个 store 声明为常量 store：其中的变量不参与保存，其中可达的对象也不参与回滚。Ren'Py 内置了若干常量 store，例如 audio（音频命名空间）、build（构建配置）、achievement、layeredimage 等，按需直接使用即可。

## 小结

- define 在 init 时把变量设为常量：不保存、不读取、设置后不应更改，适合角色、样式、转场；它比等价的 init python 多了文件行号记录与 Lint 检查，还支持命名 store、+=、|= 与 init 优先级。
- default 在变量未定义时（游戏开始或读档后）设置默认值，实际设置发生在 splashscreen 与主菜单之前，声明的变量总是参与保存，适合会变化的玩家状态。经验规则一句话：会变的用 default，不变的用 define。
- $ 是运行于默认 store 的单行 Python 语句；python 块写多行逻辑，hide 修饰符提供不可保存的匿名作用域，in 修饰符把代码送进指定命名 store。
- init python 在初始化时运行，用于定义函数、初始化样式、config 与 persistent；优先级写在 init 与 python 之间，默认 0，从低到高执行、同优先级按文件路径 Unicode 顺序，创作者应使用 -999 到 999，低于 0 留给库与主题；其中赋值的变量不保存、不参与回滚。
- 三条警告：Ren'Py 自建类不支持 __slots__（需要时显式继承 python_object，但失去回滚）；下划线开头的名字保留给 Ren'Py；define 出的变量不能再当标志变量赋值。
- 变量默认住在 store；init python in 名字: 创建命名 store，用 from store.名字 import 变量 导入（重绑定而非别名）；_constant = True 声明常量 store，其变量不保存、可达对象不回滚。

## 参考链接

- [Python 语句与 store](https://www.renpy.org/doc/html/python.html)
- [存档、读档与回滚](https://www.renpy.org/doc/html/save_load_rollback.html)
- [持久化数据（Persistent）](https://www.renpy.org/doc/html/persistent.html)
- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
- [标签与控制流（Labels and Control Flow）](https://www.renpy.org/doc/html/label.html)
