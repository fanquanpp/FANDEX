---
order: 20
title: 第一个剧本：对话与角色
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 用 label 与 say 语句写出第一段对话，定义带颜色的角色对象并理解缩进与转义规则
author: fanquanpp
updated: '2026-09-22'
related: ['renpy/010-RenPyOverviewAndSetup', 'renpy/030-ImagesSceneShowAndTransitions', 'renpy/040-LabelsControlFlowAndMenus']
prerequisites: ['renpy/010-RenPyOverviewAndSetup']
---

上一篇我们创建了第一个 Ren'Py 项目，本篇正式动笔：打开 script.rpy，写出第一段对话，让两位角色登场，并顺带搞清楚 Ren'Py 脚本最基础的几条规则——缩进、字符串转义与注释。读完本篇，你就能独立写出一段有旁白、有角色、能正常开始与结束的小剧本。

## 学习目标

- 理解 label start 为什么是剧本的起点；
- 掌握缩进规则：语句块必须用空格缩进，且同一块内保持一致；
- 会用 say 语句的两种形式书写旁白与对白；
- 会用 define 语句创建 Character（角色）对象，并用 color 参数给角色名上色；
- 知道字符串里的引号、花括号、方括号与百分号如何转义；
- 会写注释、让一条语句跨多行，并用 return 优雅地结束游戏。

## 从 label start 开始

在 Launcher 中选中项目，点击 Edit File 下的 script.rpy，用编辑器打开它。新建项目的 script.rpy 里已经有一些示例内容，可以先清空，从零写起。

剧本的起点是一个特殊的标签（label）：

```renpy
label start:

    "这是游戏的第一句话。"
```

label 的作用是把一个名字绑定到程序中的某个位置，而 start 这个名字是特殊的：玩家在主菜单点击 "Start Game" 之后，Ren'Py 就从 label start 处开始执行剧本。可以把主菜单理解成"门"，而 start 是门后的第一站。

注意 label start 冒号下面的那句台词：它比 label 多缩进了 4 个空格。Ren'Py 对缩进有硬性规定：

- label 之下的语句必须缩进（官方示例使用 4 个空格）；
- 缩进只能用空格，不能用制表符；
- 同一个块内的缩进必须完全一致。

缩进在 Ren'Py 中不是排版偏好，而是语法本身——它告诉引擎哪些语句属于这个 label，以及后面会学到的 menu、if 等块的边界在哪里。

## say 语句：两种形式

让角色说话的语句叫 say（说）语句。它有两种形式：

- 单个字符串：作为旁白（narration）显示，没有角色名；
- 两个字符串：第一个是角色名，第二个是台词。

下面先用纯字符串的形式改写官方快速入门的示例，暂不定义角色对象：

```renpy
label start:

    "Sylvie" "Hi there! How was class?"

    "Me" "Good..."

    "I can't bring myself to admit that it all went in one ear and out the other."

    "Sylvie" "Are you going home now? Wanna walk back with me?"

    "Me" "Sure!"
```

逐行拆解：

- 第一行 `"Sylvie" "Hi there! How was class?"` 是两个字符串的 say：第一个字符串 "Sylvie" 是说话人名字，第二个字符串是台词。运行时会显示为 Sylvie 说出这句话。
- 第二行同理，换成 "Me" 说话。
- 第三行只有一个字符串，因此是旁白：没有角色名，直接以普通文字显示在对话框里。这句旁白用第一人称交代了主角的心声——"我不敢承认那节课的内容全从左耳进右耳出了"。
- 最后两行又回到双字符串形式，完成一段下课路上的寒暄。

写完保存，回到 Launcher 点击 "Launch Project"，点 Start Game，就能看到这段对话逐句上演，还能用滚轮回滚、用菜单存档读档——这些都是模板项目自带的。

## 用 define 定义 Character 对象

字符串形式的角色名能用，但问题很明显：每次都要把名字抄一遍，而且角色名没有颜色、无法扩展。标准做法是用 define 语句创建 Character 对象（角色对象）：

```renpy
define s = Character('Sylvie', color="#c8ffc8")
define m = Character('Me', color="#c8c8ff")

label start:

    s "Hi there! How was class?"

    m "Good..."

    "I can't bring myself to admit that it all went in one ear and out the other."

    s "Are you going home now? Wanna walk back with me?"

    m "Sure!"
```

要点：

- define 语句在游戏初始化时把变量设为给定值。被 define 的变量应视为常量（constant）：设置之后不应更改，也不会参与存档。角色、样式、转场这类固定不变的东西都适合用 define。
- `Character('Sylvie', color="#c8ffc8")` 创建了一个角色对象：第一个参数是角色名；color 参数用十六进制 RGB 值给对话框里显示的角色名上色，这里 Sylvie 用淡绿色 #c8ffc8，Me 用淡蓝色 #c8c8ff。
- define 必须写在文件顶层（不缩进），习惯上放在 label start 之前。
- 此后 `s "..."` 就等于让 Sylvie 说话，`m "..."` 让 Me 说话；单个字符串依然是旁白。
- 用 define 而不是手写等价的 init python 赋值，还有一个实际的好处：define 会记录这次赋值所在的文件名与行号，Launcher 可以据此导航，官方的脚本检查工具 Lint 也能检查 define 变量的使用情况。初学者记住结论即可：定义角色一律用 define。

对比两种写法可以看出：角色对象把"名字"和"外观"收敛到了一处，之后即使要给角色加语音、加头像，也只改 define 这一行。

## 字符串转义与特殊字符

台词都写在双引号字符串里，有几类字符需要特别处理。

第一类是双引号本身。字符串内部再出现双引号会提前终止字符串，因此要用反斜杠转义：

```renpy
"Sylvie" "Did you ever hear \"The problem...\""
```

反斜杠能转义的还有单引号 `\'`、反斜杠自身 `\\`、换行 `\n` 等，规则与 Python 一致：在字符前加反斜杠，表示"取它的字面意思"或"表示特殊含义"。

第二类是花括号与方括号，它们在 Ren'Py 文本里各有专属含义：

- `{` 开始一个文本标签（text tag），例如后面章节会见到的字体、颜色控制；
- `[` 开始插值（interpolation），即把变量的值嵌入台词；
- 想原样显示它们，就要双写：`{{` 显示一个 `{`，`[[` 显示一个 `[`。

```renpy
"想显示 [ 方括号，写成 [[ 就可以。"
"想显示 { 花括号，写成 {{ 就可以。"
"游戏完成度已经达到 50%%。"
```

第三类是百分号：`%%` 会显示为一个 `%`。这一点在写进度、比例类台词时经常用到。

## 注释与逻辑行

- 注释以 `#` 开始，延伸到行尾，引擎会完全忽略。给剧本分段、提醒自己某段剧情的用途，都靠注释。
- 要注意字符串内部的 `#` 不是注释，它只是台词里的一个普通字符。

一条语句通常占源码中的一行，Ren'Py 把它称为一个逻辑行（logical line）。当一条语句太长写不下时，有两种让它跨多行的方法：一是在行尾放一个反斜杠 `\` 续行；二是让括号或字符串保持未闭合，下一行会自然延续。无论怎么折行，引擎看到的仍是同一条语句。

## 结束游戏：return

剧本写到什么时候算完？答案是：执行一条没有与 call 配对的 return 语句，游戏就会结束并回到主菜单。直接在对话结束后写 return 会让游戏戛然而止，官方建议先显示一段结局文字，再执行 return：

```renpy
".:. Good Ending."

return
```

这样玩家会先看到 "Good Ending." 字样，点击之后游戏才结束。这个小小的仪式感能让作品显得完整，也是处理多结局时的标准收尾方式——后面的章节会基于它扩展出真正的多结局分支。

## 小练习

光看不练容易忘，试试这三个小任务：

1. 把示例中 Sylvie 与 Me 的台词全部换成中文，运行确认显示正常；记得台词里的中文引号可以直接写，英文双引号才需要转义。
2. 新增第三个角色：仿照 s 与 m 的写法，用 define 定义一个新 Character，起名字、选一个自己的十六进制颜色，再让它说两句话。
3. 在 return 之前再插入一句旁白和一行 `.:. True Ending.`，运行确认它们会在游戏结束前出现——体会"先显示结局文字再 return"的节奏。

## 小结

- label start 是特殊标签，玩家点击 Start Game 后从这里开始执行；label 下的语句必须缩进 4 个空格，同一块内缩进一致。
- say 语句两种形式：单字符串是旁白；双字符串是"角色名 + 台词"。
- define 在初始化时创建常量变量，`Character('名字', color="#十六进制RGB")` 生成带颜色角色名的角色对象；define 的变量不参与存档、不应更改。
- 字符串内的双引号用反斜杠转义；`{` 与 `[` 分别开始文本标签与插值，原样显示需双写为 `{{` 与 `[[`；`%%` 显示百分号。
- 注释以 `#` 开始，字符串内的 `#` 不算注释；一条语句可用反斜杠或未闭合的括号跨多行。
- 执行未配对的 return 即结束游戏回到主菜单，建议先显示 ".:. Good Ending." 这样的结局文字。

## 参考链接

- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
- [脚本语言基础（Language Basics）](https://www.renpy.org/doc/html/language_basics.html)
- [对话与角色（Dialogue）](https://www.renpy.org/doc/html/dialogue.html)
- [文本（Text）](https://www.renpy.org/doc/html/text.html)
