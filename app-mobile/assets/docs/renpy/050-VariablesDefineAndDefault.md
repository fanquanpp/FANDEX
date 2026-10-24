---
order: 60
title: 变量声明：define 与 default
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 分清 define 与 default 的保存语义，掌握常量与玩家状态两条声明路线与三条官方警告
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：变量声明语义（Ren'Py 剧本语言的状态管理基础）。
- **解决什么问题**：一个变量到底该用 define 还是 default 声明？答案取决于保存语义——它要不要进存档、要不要参与回滚。选错路线的典型症状是"读档后变量莫名复位"或"存档里塞满了不该存的东西"。
- **什么时候用到**：写下第一个 `define e = Character(...)` 的那一刻；之后每引入一个新变量都要做一次这个判断。角色、样式、转场这类不变量走 define；金钱、好感度、剧情标志走 default。
- **本篇不讲**：在剧本中嵌写 Python（`$` 语句、`python` 块、`init python`）与 store 命名空间，这些内容见下一篇 [Python 语句与 store](/renpy/055-PythonBlocksAndStores)。

## 学习目标

- 说清 define 与 default 的本质区别与各自的适用场景；
- 掌握 define 的进阶写法：命名 store、+= 与 |=、init 优先级；
- 理解 default 的两个设置时机：游戏开始与读档后；
- 记住三条官方警告：__slots__、下划线前缀、define 变量不得再当标志变量。

## define 与 default：两条声明路线

上一篇我们用 default 声明标志变量、用 $ 修改它们，已经摸到了 Ren'Py 与 Python 结合的门槛。但"什么时候用 define、什么时候用 default"是每个 Ren'Py 作者迟早要回答的问题——答案取决于变量的保存语义：它要不要进存档、要不要参与回滚（rollback）。

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

判断拿不准时问自己一个问题：这个变量在读档之后应当是什么值？如果应当是"玩家离开时的值"，用 default；如果应当是"和刚启动时一模一样"，用 define。

## 三个必须记住的警告

第一，类不支持 __slots__。在 Ren'Py 中创建的、不继承任何类的类不支持 __slots__——使用它会破坏回滚。如果确实需要 slotted 类，应显式继承 python_object，但这样的对象不支持回滚。

第二，下划线开头的名字保留给 Ren'Py。自己定义的变量、函数不要以 _ 开头。

第三，define 变量不得再当标志变量用。写下 define e = Character("Eileen") 之后，就不要再把 e 当作游戏过程中的标志或计数器去赋值——define 变量是常量，语义上不保存也不回滚，混用会让存档行为变得难以预测。游戏过程会变的状态，请回到 default。

## 动手实践

**任务一：给现有项目做一次变量审计（约 15 分钟）**

打开你手头任意一个 Ren'Py 项目（没有就用 launcher 新建），把所有 define 与 default 语句列成一张表，逐行检查：有没有哪个 define 变量在剧本里被 $ 或 = 重新赋值？有没有哪个 default 变量其实从没变过？

提示：用 launcher 的 Check Script（Lint）跑一遍，define 相关的问题它会主动报；再用编辑器全局搜索变量名，看它出现在多少个赋值位置。参考自检结论：一旦发现 define 变量被游戏过程赋值，把它改回 default（或者改用一个新变量），否则读档后它的值会退回初始值——这正是"读档后好感度清零"类 bug 的常见来源。

**任务二：体验读档后 default 的补设行为（约 15 分钟）**

写一个小剧本：default flag = False，游戏中把 flag 改成 True 并存档；然后在存档文件生成之后，往脚本里新增一行 default new_flag = True，重新启动游戏读那个存档，观察 new_flag 的值。

提示：default 的补设时机发生在 after_load 语义上（存档里没有这个变量时设为默认值），所以读档后 new_flag 是 True。参考验证方式：读档后用 Shift+O 控制台输入 new_flag 查看（开发者工具的用法见开发者工具与调试一篇）。这个实验做完，"default 在两个时机设置"就不再是文档上的一句话，而是你亲手观察到的事实。

## 小结

- define 在 init 时把变量设为常量：不保存、不读取、设置后不应更改，适合角色、样式、转场；它比等价的 init python 多了文件行号记录与 Lint 检查，还支持命名 store、+=、|= 与 init 优先级。
- default 在变量未定义时（游戏开始或读档后）设置默认值，实际设置发生在 splashscreen 与主菜单之前，声明的变量总是参与保存，适合会变化的玩家状态。经验规则一句话：会变的用 default，不变的用 define；拿不准时问"读档后它应当是什么值"。
- 三条警告：Ren'Py 自建类不支持 __slots__（需要时显式继承 python_object，但失去回滚）；下划线开头的名字保留给 Ren'Py；define 出的变量不能再当标志变量赋值。

## 参考链接

- [Python 语句与 store](https://www.renpy.org/doc/html/python.html)
- [存档、读档与回滚](https://www.renpy.org/doc/html/save_load_rollback.html)
- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
