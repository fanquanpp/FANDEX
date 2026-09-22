---
order: 120
title: 翻译与多语言
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 用官方翻译生成器产出多语言骨架，理解 translate 语句字符串翻译与语言切换的完整机制
author: fanquanpp
updated: '2026-09-22'
related:
  - 'renpy/060-TextInterpolationAndTags'
  - 'renpy/130-BuildingDistributions'
prerequisites:
  - 'renpy/020-FirstScriptSayAndCharacters'
---

想让同一份剧本支持多种语言，不必复制整个项目再手工替换文本。Ren'Py 内建了一套从"生成翻译骨架"到"运行时切换语言"的完整翻译体系：对白、界面字符串、图片乃至字体都能按语言切换。理解这套机制的关键只有几个概念：translate 语句、翻译标识符、字符串翻译与语言切换 action。

本篇按实际工作流讲解：先弄清什么内容可以翻译、主语言与备用语言的关系，然后用 launcher 生成翻译骨架，接着逐一掌握对白翻译、翻译锁定、字符串翻译、语言切换、图片与样式翻译，最后理清默认语言的选择顺序与延迟加载。

## 学习目标

- 说出游戏里哪四类内容可以被翻译；
- 理解主语言（None 语言）与备用语言的关系；
- 会用 launcher 的 Generate Translations 生成翻译骨架；
- 掌握 translate 语句的结构，会对翻译块做拆分、删除与条件改写；
- 会用 say 的 id 子句锁定翻译，改原句不丢译文；
- 掌握字符串翻译（translate strings）与 {#...} 语境标记；
- 分清 _()、__()、_p() 与 renpy.translate_string 的用途；
- 会用 Language action 与 renpy.change_language 切换语言；
- 了解图片文件翻译、样式翻译、默认语言选择顺序与延迟加载。

## 哪些内容可以翻译

Ren'Py 把可翻译内容分成四类：

- 对白：翻译块可以对原句做拆分、合并、重排乃至省略，适配不同语言的语序；
- 菜单与界面字符串：menu 选项、按钮文字等走"字符串翻译"通道；
- 图片与文件：同一文件名可以有按语言区分的变体文件；
- 样式：不同语言可以切换不同的字体、字号。

## 主语言与备用语言

编写游戏时使用的语言称为主语言，在 Ren'Py 内部表示为 None——你没做任何翻译设置时，游戏就运行在 None 语言上。备用语言的名字必须能作为 Python 标识符，例如 piglatin、simplified_chinese。

一个容易被忽略的细节：引擎自己呈现的界面字符串（默认 screen 上的按钮文字等）也在翻译范围内。当 None 语言本身不是英语时，game/tl/None/common.rpym 文件存放引擎内建字符串的翻译，供这类项目使用。

## 生成翻译骨架

在 launcher 中选择 Generate Translations，输入目标语言名，Ren'Py 会在 game/tl/<语言>/ 下生成翻译文件：每个游戏脚本文件对应一个翻译文件，外加一个 common.rpy（对应项目自带 screen 中的字符串）。生成之后你要做的就是把每个翻译块里的原句换成译文。

## translate 语句：对白翻译

打开生成的文件，会看到这样的结构（官方 piglatin 示例）：

```renpy
# game/script.rpy:95
translate piglatin start_636ae3f5:
    # e "Thank you for taking a look."
    e "Ankthay ouyay orfay akingtay a ooklay."
```

三个组成部分：

- translate <语言> <标识符>:：翻译块头。标识符（如 start_636ae3f5）由引擎自动分配，与原句绑定且跨版本稳定；
- 注释行 # e "Thank you..."：原句以注释形式保留，方便译者对照；
- 译文语句：实际显示的内容。

翻译块不要求与原句一一对应：长句可以拆成多条语句，多条可以合并，顺序可以重排，也可以整块省略——用 pass 占位即可删掉一条对白。块内还可以运行 Python 语句、使用 if 等条件语句，按运行时状态调整译文。官方文档提供了一个把数字转换成罗马数字（to_roman_numerals）的完整示例，需要按语言改写数字、称谓等动态内容时值得直接参考。

## 锁定翻译与隐藏内容

翻译块与原句的对应关系由标识符维护，而标识符默认从原句内容推导。这意味着一旦你修改了原句文本，重新生成翻译时标识符可能变化，已有译文就会失联。

解决办法是给 say 语句显式指定 id 子句，把标识符固定下来：

```renpy
e "Hello, world." id start_61b861a2
```

id 一经指定，之后修改这句台词的文字、把它移动到别的位置，都不会让译文丢失。

反过来，有些内容不该进入翻译流程（例如仅供开发者查看的内部文本）。把它放进带 hide 子句的 label，生成翻译时就会跳过：

```renpy
label ignored_by_translation hide:
    "这段不会出现在生成的翻译文件里。"
```

## 字符串翻译：translate strings

对白之外，menu 选项与 _() 包住的字符串走另一条通道——字符串翻译（string translation）。生成翻译时引擎扫描这些字符串，产出 old/new 对照的块：

```renpy
translate piglatin strings:

    old "Save"
    new "Avesay"
```

同一个英文原文在不同语境下可能需要不同译文。用 {#...} 注释区分语境，注释部分不显示：

```renpy
old "New{#game}"
new "Neuay{#game}"
```

字符串翻译也可以面向 None 语言（translate None strings:），适合主语言本身需要润色或多版本的项目。此外，插值配合 !t 转换旗标可以翻译变量中保存的字符串：

```renpy
$ place = _("图书馆")
"我们出发，前往 [place!t]。"
```

## 翻译相关函数

- _()：标记字符串可翻译，显示时按当前语言翻译；
- __()：立即翻译并返回译文，适合需要在逻辑中拿到译文的场合；
- _p()：多行重排（paragraph）标记函数，用于需要按语言重新断行组合的文本；
- renpy.translate_string：把字符串在指定语言下翻译。

## 切换语言

语言切换的核心是一个 action 加几个函数：

- Language(language)：screen 里语言切换按钮用的 action，None 表示默认语言；
- renpy.change_language：在代码中切换语言；
- renpy.known_languages：列出游戏已知的语言；
- _preferences.language：当前语言，只读；
- config.default_language：默认语言配置。

## 图片与文件的翻译

图片也能按语言替换：当某语言被激活时，Ren'Py 优先使用 game/tl/<语言>/ 目录下的同名文件（包含子目录结构），找不到才回落到主语言文件。例如 tl/piglatin/gui/main_menu.png 会在 piglatin 语言激活时替换主菜单背景。界面上的带字图片（标题图、Logo）靠这个机制本地化。

## 样式翻译

不同语言常常需要不同字体。第一种写法是样式翻译块：

```renpy
translate piglatin style default:
    font "stonecutter.ttf"
```

第二种是在 translate python 块里修改 gui 变量：

```renpy
translate piglatin python:
    gui.text_font = "stonecutter.ttf"
```

两者的机制基础是同一条规则：语言激活时，样式先重置到 Init 阶段结束时的状态，再依次应用所有 translate 块。所以翻译块之间不会互相污染，你也不必担心普通脚本对样式的运行时改动被翻译覆盖出诡异结果。

## 默认语言的选择顺序

游戏启动时按以下顺序决定初始语言，命中即停：

```text
RENPY_LANGUAGE 环境变量 → config.language → 玩家历史选择 → autodetect（探测系统语言） → config.default_language → None
```

所有环节都没有给出语言时，退回主语言 None。想让新玩家自动进入母语界面，靠的是 autodetect 与 config.default_language 这两级。

## 延迟加载翻译脚本

翻译文件全部随游戏启动加载会拖慢启动速度。设置：

```renpy
define config.defer_tl_scripts = True
```

之后，tl 目录下的脚本会延迟到对应语言首次激活时才加载。注意配套纪律：被延迟加载的翻译文件应当只包含 translate 块，不要往里写普通剧本语句，否则那些语句不会在开局时执行。

## 顺带一提

Ren'Py 的官方文档站本身也做了多语言，提供日语等版本（如 ja.renpy.org）——连文档都在实践翻译，这个生态对多语言的重视可见一斑。

## 小结

- 可翻译内容分四类：对白、菜单与界面字符串、图片与文件、样式；
- 主语言在引擎内部是 None；备用语言名须可作 Python 标识符；tl/None/common.rpym 承载引擎内建字符串翻译；
- launcher 的 Generate Translations 输出 game/tl/<语言>/，每个脚本文件对应一个翻译文件加 common.rpy；
- translate 块的标识符由引擎分配；块内可拆分、合并、重排、省略（pass），也可运行 Python 与条件语句；
- say 的 id 子句锁定翻译标识符，改原句不丢译文；label ignored_by_translation hide 让内容退出翻译流程；
- 字符串翻译用 old/new 对照，{#...} 区分语境，!t 翻译插值字符串；
- _() 显示时翻译，__() 立即翻译，_p() 处理多行重排，renpy.translate_string 按语言翻译；
- Language action 与 renpy.change_language 切换语言；样式在语言激活时重置到 init 末状态再应用 translate 块；
- 默认语言按环境变量、config.language、历史选择、autodetect、config.default_language、None 的顺序决定；config.defer_tl_scripts 延迟加载翻译脚本。

## 参考链接

- [翻译与多语言（官方文档）](https://www.renpy.org/doc/html/translation.html)
- [文本、插值与文本标签（官方文档）](https://www.renpy.org/doc/html/text.html)
- [屏幕与屏幕语言（官方文档）](https://www.renpy.org/doc/html/screens.html)
- [快速上手（官方文档）](https://www.renpy.org/doc/html/quickstart.html)
