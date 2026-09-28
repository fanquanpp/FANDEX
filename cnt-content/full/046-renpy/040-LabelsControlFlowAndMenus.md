---
order: 40
title: 标签、控制流与选项菜单
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 用 label jump call return 组织剧本骨架，用 menu 提供选项分支并用 if 与 flag 变量驱动多结局
author: fanquanpp
updated: '2026-09-28'
related: ['renpy/020-FirstScriptSayAndCharacters', 'renpy/030-ImagesSceneShowAndTransitions', 'renpy/050-VariablesPythonAndStores']
prerequisites: ['renpy/020-FirstScriptSayAndCharacters']
---

到目前为止，我们的剧本都是从上到下一条直线执行到底。真正的视觉小说需要岔路：玩家在选项面前做出选择，故事走向不同的支线，最后汇入不同的结局。本篇带你从零搭出一段完整可玩的分支剧情：一次两难选择、两条支线、一个汇合点、按选择历史分档的结局。搭完这一段，Ren'Py 的控制流四件套——label、jump、call、return，加上 menu 语句——你就全部上手了。

## 动手：分支再汇合的最小骨架

目标剧情：同学小邀你周末同去，你可以选"去看展"或"去书店"，不管选哪条，最后在车站汇合。新建或打开 script.rpy，写下：

```renpy
define s = Character('小邀', color="#c8ffc8")
define m = Character('我', color="#c8c8ff")

label start:

    s "周末有空吗？一起出去走走？"

    menu:

        "去看展吧。":
            jump gallery

        "去书店吧。":
            jump book

label gallery:

    m "去看展吧，听说这期有印象派特展。"

    jump station

label book:

    m "去书店吧，我想找一本绝版画集。"

    jump station

label station:

    s "好，那周六上午车站见！"

    ".:. Good Ending."

    return
```

走读这段结构：

- menu 语句后跟冒号，每个选项是"字符串 + 冒号"，其下再缩进一层写要执行的语句。玩家选中哪项，就执行哪项下面的缩进块；
- 选"看展"执行 jump gallery 跳进 gallery 标签；选"书店"同理。jump 是单向跳转、不压栈——引擎不记住"从哪里来"，所以两条支线各自用 jump station 汇合到 station 标签；
- station 播报汇合台词，显示 ".:. Good Ending." 结局文字，最后 return 结束游戏回到主菜单。

保存运行：主菜单点 Start Game，做一次选择，确认两条路都通向车站。这就是"分支再汇合"的最小骨架，绝大多数商业视觉小说的章节内部都是这个形状的放大版。

## 动手：用标志变量记下玩家的选择

汇合点现在只会说同一句话。需求升级：选过书店的玩家，在车站会多聊一句画集。这需要"记住玩家选过什么"——标志变量（flag）：

```renpy
default book = False

label book:

    $ book = True

    m "去书店吧，我想找一本绝版画集。"

    jump station

label station:

    s "好，那周六上午车站见！"

    if book:
        s "对了，画集找到了记得借我看看。"
    else:
        s "听说特展的人很多，早点出门哦。"

    ".:. Good Ending."

    return
```

三件新东西：

- default 语句在游戏开始（以及读档之后）检查变量 book 是否未定义，未定义则设为 False。用 default 声明的变量会参与存档与读档，是游戏过程中会变化的状态的标准声明方式——这与 define 声明不可变常量形成对照；
- `$ book = True`：以 $ 开头的行是一条单行 Python 语句，把标志置真；
- `if book:` 在汇合点分流，else 兜底。if 与 Python 一致，支持 elif 与 else：

```renpy
    if points >= 10:
        jump best_ending
    elif points >= 5:
        jump good_ending
    elif points >= 1:
        jump bad_ending
    else:
        jump worst_ending
```

条件自上而下依次检查，命中哪个块就执行哪个块。menu 制造即时分支，标志变量与分数记录历史，汇合点用 if 汇总决算——这就是多结局游戏的全部零件。

## 动手：把公共桥段抽成子程序

两条支线如果都要播一段相同的"换衣服出门"过场，复制粘贴两遍太蠢。用 call 把它抽成可返回的子程序：

```renpy
label gallery:

    call get_ready(30)
    m "去看展吧，听说这期有印象派特展。"

    jump station

label book:

    call get_ready(15)
    $ book = True
    m "去书店吧，我想找一本绝版画集。"

    jump station

label get_ready(minutes=10):

    "你花了 [minutes] 分钟换好衣服出门。"

    return
```

- call 跳到目标标签，但会把当前位置压入调用栈；目标里的 return 弹出栈顶，回到 call 之后继续执行。jump 与 call 的本质区别就在这一个栈上；
- 子程序可以带参数：第一次传 30，第二次传 15，不传则用默认值 10。台词里的 [minutes] 会被插值；
- call 还支持 expression 形式，目标由表达式算出，如 `call expression "get_" + "ready"`；当 call expression 还要附带参数时，必须插入 pass 关键字分隔：`call expression "get_ready" pass (minutes=20)`；
- return 也可以携带表达式，结果存入特殊变量 _return，调用方可读取；
- 子程序里最后一次 return 弹出空栈时——栈空，游戏回到主菜单。start 标签末尾的 return 正是靠这个行为收尾的。

### from 子句与存档安全

发布游戏后你可能继续更新剧本。若某个 call 没有 from 子句，更新后标签的位置发生变化，旧存档里记录的"返回位置"就可能失效，导致读档后返回栈损坏。from 子句相当于在 call 之后隐式插入一个同名标签，把返回点固定下来：

```renpy
    call get_ready(30) from _call_get_ready_1
```

手工为每个 call 写 from 很繁琐，构建（打包）时勾选 "Add from clauses to calls" 选项，Ren'Py 会自动为所有 call 补上 from 子句。发布正式版本时，记得打开这个选项。

## 讲为什么：label 的进阶用法

label 把名字绑定到程序中的某个位置，是所有控制流的地标。三个进阶用法：

第一，label 可以带参数：

```renpy
label sample2(a="default"):

    "Here is 'sample2' label."
    "a = [a]"
```

调用时传入的值会赋给参数 a。需要注意：由 label 参数赋值的变量是动态作用域（dynamic scope）的——label 结束执行 return 时，这些变量会被还原为调用前的样子。

第二，label 可以是局部的（local label）。以点号开头的标签从属于它上方最近的全局标签，适合在一个章节内部做细粒度跳转：

```renpy
label global_label:

    "Under a global label.."

label .local_label:

    "..resides a local one."

    jump .another_local

label .another_local:

    "And another!"

    jump .local_label
```

.local_label 与 .another_local 都从属于 global_label，jump 用点号前缀即可在它们之间往来。8.5.0 起，局部标签的声明规则进一步放宽，可以在任何全局标签下跨文件声明。

第三，标签可以跨文件。Ren'Py 把 game 目录下所有 .rpy 文件等价地看作一个大文件，因此 jump 的目标可以写在任何文件里——这正是按章节拆分剧本文件的基础。jump expression 形式（`jump expression "sub" + "routine"`）在"目标由变量决定"时有用。

## 条件与循环的边界

if/elif/else 已在实战里用过。循环使用 while 语句：

```renpy
label countdown:

    $ count = 10

    while count > 0:
        "T-minus [count]."
        $ count -= 1

    "Liftoff!"
```

count 从 10 递减，每轮播报一句 "T-minus [count]."，归零后跳出循环显示 "Liftoff!"。注意一个限制：Ren'Py 脚本没有 continue、break、for 语句——需要提前退出或跳过一轮时，可以用跳转到 label 的方式模拟；遍历列表这类需求则要等到学习 Python 语句后再处理。

如果某个分支暂时不想写内容，可以放一条 pass 语句占位，它什么都不做，只是为了满足"块里必须有语句"的语法。

## 特殊 label 一览

除了 start，Ren'Py 还预留了一批特殊标签，在特定时机自动执行。常用的有：

```text
start              主菜单点击 Start Game 后的入口
quit               游戏退出时执行
after_load         读档之后执行
before_load        读档之前执行
splashscreen       启动画面阶段执行
before_main_menu   主菜单出现之前执行
main_menu          构建主菜单时执行
```

其中 main_menu 有一个著名技巧：在项目里写

```renpy
label main_menu:

    return
```

主菜单构建标签立即返回，游戏就会跳过主菜单直接开局——适合做章节选择式或演示型的短篇。其余特殊标签的详细行为，遇到具体需求时查阅官方 label 文档即可。

## 坑点与自检

- 想用 return 回到 menu 之前的语句——jump 不压栈，回不去；需要能回来的跳转一律用 call；
- 读档后角色像"失忆"，走错分支——状态变量用了 define 而不是 default。define 是常量、不参与存档，会变化的状态必须 default；
- 某个选项永远选不中——检查上一轮 if/elif 的条件是否提前命中，条件自上而下短路；
- 更新版本后旧存档读档崩溃——call 没写 from 子句。发布前勾选 "Add from clauses to calls"；
- menu 选项写成了中文全角冒号"："——语法要求的英文冒号。选项格式是 "字符串": 加缩进块；
- 自检问题：label 参数在 return 后会被还原，而 default 变量会随存档保留，两者谁能用来记录"玩家好感度"？后者。参数是临时的、动态作用域的。

## 练习

1. 给车站汇合点加第二个标志变量 gallery，让"先看展又去书店"（重玩不重置的情况下不可能，改成分支里把另一个选项也提一句）的台词与单选不同——体会标志变量的组合。
2. 把"换衣服出门"子程序改造成返回值版本：return "天气不错"，在调用方用 `[ _return ]` 插值显示，验证 _return 的用法。
3. 用 while 写一段"等公交"过场：播报三轮 "公交车还没来"，第三轮后 jump 到上车场景。故意在其中一轮用 jump 跳出，体会"没有 break"时的替代写法。

## 下一步

- 变量系统的完整规则（store、保存范围）：变量、Python 与 store（050 篇）；
- 多结局的收尾仪式：第一个剧本篇（020 篇）末尾的 ".:. Good Ending." 约定；
- 骨架有了，给场景加上立绘与转场：图像、场景与转场（030 篇）。

## 参考链接

- [标签与控制流（Labels and Control Flow）](https://www.renpy.org/doc/html/label.html)
- [菜单（Menus）](https://www.renpy.org/doc/html/menus.html)
- [条件语句（Conditional Statements）](https://www.renpy.org/doc/html/conditional.html)
- [Python 语句（Python Statements）](https://www.renpy.org/doc/html/python.html)
- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
