---
order: 180
title: 样式系统与样式属性
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 状态前缀、样式继承、style 语句子句与 Shift+I 检查器：界面外观的最终执行层
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Ren'Py 样式系统（style system）——GUI 变量与界面元素之间的最终执行层。
- **解决什么问题**：换图与改 gui.rpy 变量都动不了的细节（某个按钮的四态颜色、一段文字的字距、自定义控件的整套皮肤），要在样式层解决。样式"不生效"也是新手第一大外观疑难。
- **什么时候用到**：按钮悬停变色、做选中/禁用四态皮肤、继承默认按钮造自定义按钮、排查"改了样式没反应"。
- **前置知识**：GUI 定制的三层路径（换图最快、改 gui.rpy 变量其次、写样式最灵活），见 [GUI 定制](/renpy/110-GuiCustomization)；样式属性写在 screen 里最常见，见 [屏幕语言与界面](/renpy/080-ScreensAndScreenLanguage)。

## 学习目标

- 掌握样式属性的状态前缀与三种使用方式（displayable 参数、screen 属性、命名样式）；
- 理解样式继承规则：parent 从哪里来、下划线命名的隐规则；
- 会用 style 语句的 is、clear、take、variant、properties 子句；
- 会用 Python 创建与修改样式，知道属性只能写不能读；
- 会用 Shift+I 样式检查器定位样式问题，并了解样式重建（style rebuild）的成本。

## 样式属性、状态前缀与三种用法

样式（style）是一组样式属性（style property）的集合。很多属性可以带状态前缀：

- hover_background：元素被聚焦（hover）时使用的背景；
- idle_background：元素非聚焦（idle）时使用的背景；
- 直接写 background 等于同时设置两者。

除 hover 与 idle 外，还有 selected（被选中）与 insensitive（不可用）两个状态词，可以组合出 selected_hover 这类复合前缀。一个按钮的完整四态皮肤，就是四个前缀属性各配一张图或一种颜色。

在脚本里使用样式属性有三种方式：

```renpy
# 1. displayable 的构造参数
$ t = Text("Hello", size=40)

# 2. screen 语句属性
screen hello():
    text "Hello, World." size 40

# 3. 引用命名样式
screen red():
    textbutton "Big Red" style "big_red"
```

前两种写在哪里就作用于哪里；第三种引用命名样式，可以在样式里集中定义、多处复用。选择标准：只出现一次的用内联（前两种），同一效果出现两次以上就该提成命名样式。

场景一：按钮悬停变色。选项按钮的"指上去变亮"不需要图片，两个颜色属性就够：

```renpy
style choice_button_text:
    idle_color "#c0c0c0"
    hover_color "#ffffff"
    selected_color "#a0d0a0"
    insensitive_color "#606060"
```

这段样式与 gui.rpy 里 gui.button_text_idle_color 等变量对应——GUI 变量最终就是被喂给这些样式属性的。

## 样式继承：parent 从哪里来

每个样式都有一个 parent（父样式），未显式指定的属性从父样式逐级取用。没有写 parent 时，Ren'Py 根据 displayable 的类型选择默认父样式——按钮类型的元素默认继承 button 样式。

样式命名还有一条隐规则：如果样式名里包含下划线，默认父样式就是第一个下划线之后的部分。例如 my_button 没写 parent 时自动继承 button；而以下划线开头的样式名保留给 Ren'Py，请不要使用。

场景二：继承 gui.button 造自定义按钮。想要一套"圆角描边按钮"，不必从零写属性，继承现成按钮样式、只覆盖差异项：

```renpy
style tag_button is gui.button:
    background Frame("gui/tag_button.png", Borders(12, 12, 12, 12))
    hover_background Frame("gui/tag_button_hover.png", Borders(12, 12, 12, 12))
    xpadding 12
    ypadding 6

screen tag_list():
    hbox:
        textbutton "悬疑" style "tag_button" action Return("mystery")
        textbutton "日常" style "tag_button" action Return("slice")
```

tag_button 继承 gui.button 的字号、颜色与尺寸，只换背景与内边距——这正是继承的价值：父样式升级（比如整体换字体）时子样式自动跟随。改成"另起炉灶不继承"会发生什么：字号、颜色、hover 全要重写一遍，而且默认字号一变它就脱节。

## style 语句

命名样式用 style 语句定义与修改：

```renpy
style my_text is text:
    size 40
    font "gentium.ttf"
```

style 语句支持这些子句：

- is style-name：更换父样式；
- clear：清空该样式已设置的全部属性；
- take style-name：取来另一个样式的全部属性；
- variant：条件子句，让样式只在特定设备变体（如 touch 触屏）下生效；
- properties：批量给定一组属性。

take 子句的官方示例：

```renpy
# Style a has all the properties of style c, except that when not present
# in c, the properties are taken from b.
style a is b:
    take c
```

含义是：样式 a 以 b 为父样式，同时先取来样式 c 的全部属性；c 中没有的属性再从 b 逐级继承。

同一条命名样式可以被多条 style 语句先后修改：

```renpy
# Creates a new style, inheriting from default.
style big_red:
    size 40
# Updates the style.
style big_red color "#f00"
```

由于 style 语句在 init 阶段执行，多条语句的最终结果取决于执行顺序（init 优先级与文件路径顺序），所以请保持定义集中、顺序清晰。也正因为如此，命名样式应该在 Init 阶段结束后就不再修改。

场景三：variant 写触屏差异。给触屏设备放大点击区域，桌面保持原样，一份样式两个变体：

```renpy
style next_button:
    size 24

style next_button variant "touch":
    size 30
    yminimum 60
```

variant 子句在低优先级 style 语句中声明即可，运行时按设备变体选择（变体机制本身见 080 篇屏幕变体一节）。

## 常用样式属性速查

样式属性数量庞大（完整清单见官方 Styles and Style Properties 章），按用途记住四组骨架即可举一反三：

```text
位置尺寸    xalign / yalign / xpos / ypos / xmaximum / ymaximum
            xfill / yfill（撑满父容器）/ xminimum / yminimum
背景边距    background / foreground / padding（xpadding / ypadding）
            margins / Borders（配 Frame 九宫格，见 GUI 定制篇）
文字排版    font / size / color / bold / italic / outlines / kerning
            text_align / layout / line_spacing
交互状态    hover_* / idle_* / selected_* / insensitive_* 前缀
            focus_mask（点击判定区域）/ activate_sound
```

易错点：文字类的属性大多有 text_ 变体的归属问题——设置按钮里的文字要用 button 的 *_text 系列样式（如 button_text 的 color），而不是把 color 写在 button 上；"改了没反应"的案例一多半是属性写错了层级，Shift+I 一看便知。

## 用 Python 定义与修改样式

在 init python 块里也可以用 Python 方式创建样式：

```renpy
init python:
    style.big_red = Style(style.default)
```

之后可以逐个设置属性，例如 style.big_red.size = 40。注意：样式属性只能写、不能读——读取属性值没有意义，引擎要到显示时才完成属性的逐级解析。

Python 方式的价值在"程序化生成样式"：给 8 个角色批量造同构的按钮样式，循环比手写 8 段 style 语句干净得多。

## 样式重建与 Shift+I 检查器

样式在 Init 结束时汇总构建。开发期改样式文件后，Ren'Py 会做一次样式重建（style rebuild）再刷新画面；构建期间界面会短暂停顿，样式越多停顿越明显。这带来两条纪律：

- 样式改动只发生在 init 阶段（style 语句或 init python），运行期改样式的行为未定义，可能到下一次交互才生效甚至不生效；
- 样式总量控制在合理范围，避免把几百个一次性小样式堆进公共文件——它们会在每次样式重建时被一起处理。

游戏运行时按 Shift+I 打开样式检查器（style inspector），再把鼠标指向任意界面元素，就能看到它用了哪个样式、每个属性最终取自哪一层。样式"不生效"的问题，十有八九用 Shift+I 一眼定位：要么被父样式链上的值覆盖，要么元素根本不在这个样式的作用范围内。

## 动手实践

**任务一：四态皮肤（约 15 分钟）**

为一个 textbutton 写齐 idle、hover、selected、insensitive 四个状态的文字颜色与背景，运行后逐个状态验证（选中态需要 action 返回值恰好等于当前选中项；禁用态用 sensitive False 强制）。

提示：背景可以先用纯色 color 占位，不必先画图。参考实现：

```renpy
style quiz_button:
    idle_background "#202028"
    hover_background "#34344c"
    selected_background "#3a5a3a"
    insensitive_background "#181820"
    idle_color "#c0c0c0"
    hover_color "#ffffff"
    selected_color "#a0e0a0"
    insensitive_color "#606060"
    xpadding 16
    ypadding 8
```

**任务二：继承改造（约 15 分钟）**

写一个继承 gui.button 的 pill_button（胶囊按钮），只覆盖背景（用 Frame 加 Borders 的圆角图或纯色）与内边距；然后故意删掉 is gui.button，观察哪些属性消失，体会继承链的作用。

提示：删除 is 子句后，pill_button 按下划线隐规则继承 button——所以字号颜色仍在；换成 my_pill 这类不含下划线的名字才会退回 default。参考实现：

```renpy
style pill_button is gui.button:
    background "#4a4a6a"
    hover_background "#5c5c86"
    xpadding 24
    ypadding 10
```

**任务三：Shift+I 排查赛（约 15 分钟）**

故意制造三个样式 bug：属性写错层级（把 color 写在 button 上想改文字颜色）、被父样式覆盖（子样式没写 size 却以为改过）、样式名拼错（style "big_red" 写成 "bigred"）。逐个用 Shift+I 找出原因并修复。

提示：Shift+I 面板从上到下是继承链，某一行属性右侧会标出值来自哪一层；拼错的名字引擎通常回退到默认样式，界面上"完全不搭"就是信号。这道练习的产物不是代码，而是你自己的排查路径清单——之后遇到样式问题先按它走一遍。

## 小结

- 样式是样式属性的集合，支持 hover/idle/selected/insensitive 状态前缀；三种使用方式：displayable 构造参数、screen 语句属性、命名样式引用——两处以上复用就提成命名样式。
- 样式按 parent 逐级继承，未写 parent 时按 displayable 类型选默认父样式；名字含下划线时默认继承下划线之后的部分，下划线开头的名字保留给 Ren'Py。
- style 语句支持 is（换父）、clear（清空）、take（取属性）、variant（设备变体）、properties（批量属性）；样式在 init 阶段执行与汇总，多条语句按优先级与文件顺序生效，Init 结束后不再修改。
- Python 里用 Style() 创建样式、程序化批量生成；属性只能写不能读。样式改动只发生在 init 阶段，运行期改样式行为未定义；样式重建在开发期刷新画面，大样式库会拖慢它。
- Shift+I 样式检查器显示继承链与每个属性的来源，是样式调试的第一入口；常用属性按位置尺寸、背景边距、文字排版、交互状态四组记忆。

## 参考链接

- [样式系统（Styles and Style Properties）](https://www.renpy.org/doc/html/style.html)
- [样式语句（Style Statement）](https://www.renpy.org/doc/html/style_statement.html)
- [屏幕与屏幕语言（官方文档）](https://www.renpy.org/doc/html/screens.html)
- [快速上手（官方文档）](https://www.renpy.org/doc/html/quickstart.html)
