---
order: 110
title: GUI 定制与样式系统
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 替换图片调整 gui.rpy 变量改头换面，并用 style 语句精细控制每个界面元素的外观
author: fanquanpp
updated: '2026-09-22'
related:
  - 'renpy/080-ScreensAndScreenLanguage'
  - 'renpy/130-BuildingDistributions'
prerequisites:
  - 'renpy/080-ScreensAndScreenLanguage'
---

用 Ren'Py 新建项目后，你得到的是一套现成的现代 GUI：主菜单、存档读档、偏好设置一应俱全。这套界面的外观由三层东西驱动：game/gui/ 目录下的图片、gui.rpy 里的变量、以及底层的样式（style）系统。三者是逐层深入的关系——换图最快，改变量次之，写样式最灵活。

本篇按这条路线走一遍：先讲 launcher 的 Change/Update GUI 为什么必须第一个做，再依次介绍游戏身份变量、图片替换、gui.rpy 常用变量与九宫格边框，最后进入样式系统，覆盖状态前缀、继承规则与 style 语句的全部子句。

## 学习目标

- 分清 GUI 定制的三层路径：替换图片、修改 gui.rpy 变量、编写样式；
- 理解为什么 Change/Update GUI 应该在其他定制之前执行；
- 会替换主菜单、游戏菜单、对话框、选项按钮与窗口图标等图片；
- 会调整颜色、字体、字号与按钮相关变量；
- 理解 Frame 与 Borders 的九宫格拉伸机制；
- 掌握样式属性的状态前缀与三种使用方式；
- 理解样式继承规则与 style 语句的 is、clear、take、variant 子句；
- 会用 Python 定义样式，并用 Shift+I 检查器调试外观。

## 动手前先做：Change/Update GUI

新版 GUI（new GUI）的所有外观变量都集中在 gui.rpy 文件里，新项目默认使用这套 GUI。launcher 提供 Change/Update GUI 功能，可以整体修改游戏的分辨率与配色方案。

但要注意：这个操作会覆盖大部分 gui/ 目录下的图片文件，也可能覆盖你在 gui.rpy 里已经做过的修改。所以官方给出的顺序非常明确——先用它把分辨率和配色定下来，再开始你的其他定制。先改图后变分辨率，等于白改。

## 游戏身份变量（options.rpy）

游戏名、版本号这类"身份信息"不在 gui.rpy，而在 options.rpy：

```renpy
define config.name = _('Old School High School')
define gui.show_name = True
define config.version = "1.0"
define gui.about = _("Created by PyTom.\n\nHigh school backgrounds by Mugenjohncel.")
```

逐个解释：

- config.name：游戏名，同时用作窗口标题；
- gui.show_name：是否在主菜单上显示游戏名；
- config.version：版本号字符串；
- gui.about：关于（About）页面的正文。

字符串外面包着一层 _()，表示这个字符串可被翻译（详见翻译与多语言一篇）。

## 替换图片：game/gui/ 目录

GUI 用到的图片都放在 game/gui/ 目录下，用同名文件直接覆盖即可替换：

- gui/main_menu.png：主菜单背景；
- gui/game_menu.png：游戏菜单（存档、读档、偏好等）背景；
- gui/window_icon.png：窗口图标。注意 exe 与 app 文件自身的图标需要在打包阶段提供 icon.ico 与 icon.icns（见打包发布篇）；
- gui/textbox.png：对话框背景。这是一张全宽图片，对白文本占据其中央约 60% 的宽度，替换时保持这个比例才不会错位；
- gui/button/choice_idle_background.png 与 gui/button/choice_hover_background.png：选项按钮非聚焦与聚焦时的背景；
- overlay 系列：叠加在主菜单与游戏菜单背景之上的覆盖图。

配合接下来要讲的文字颜色变量，替换这几张图就足以完成一次"换皮"。

## gui.rpy 常用变量

gui.rpy 里的变量按功能分组，命名规律一致。

颜色：

- gui.accent_color：强调色，角色名默认使用强调色；
- gui.idle_color、gui.hover_color、gui.selected_color、gui.insensitive_color：界面元素在非聚焦、聚焦、选中、不可用四种状态下的文字颜色；
- gui.interface_text_color：界面通用文字颜色。

想让某个角色用特殊颜色，不必改全局变量，直接在 Character 上覆盖即可：

```renpy
define e = Character("Eileen", who_color="#104010")
```

字体：

- gui.text_font：对白字体；
- gui.interface_text_font：界面字体；
- gui.system_font：系统字体；
- gui.glyph_font：字形字体（提供箭头等符号字形）。

字号：

- gui.text_size 与 gui.name_text_size：对白与角色名字号；
- gui.interface_text_size、gui.label_text_size、gui.notify_text_size、gui.title_text_size：界面、标签、通知与标题的字号。

按钮：

- gui.button_width 与 gui.button_height 控制按钮尺寸；
- gui.button_text_size、gui.button_text_idle_color、gui.button_text_hover_color 控制按钮文字；
- 选项菜单的文字颜色另有 gui.choice_button_text_idle_color 与 gui.choice_button_text_hover_color。

其余界面元素（滑条、滚动条、通知等）也都有各自的变量，命名规律一致，学会一组就能举一反三。

## 边框与九宫格拉伸

界面里大量出现"带边框和圆角的面板"。这类图片用 Frame（九宫格）displayable 处理：把图片切成九块，四个角原样保留，四条边各沿一个方向拉伸，中间区域双向拉伸——面板因此可以任意放大而不变形：

```renpy
Frame("gui/frame.png", Borders(40, 40, 40, 40))
```

Borders(40, 40, 40, 40) 的四个数字依次是左、上、右、下的边框宽度。Frame 还支持 padding（内边距）与 tile=True（用平铺代替拉伸）。gui.rpy 中与 frame 相关的变量是 gui.frame_borders（指定 gui/frame.png 的边框宽度）与 gui.frame_tile（决定是否平铺）。

## 样式系统：属性、状态前缀与三种用法

样式（style）是一组样式属性（style property）的集合，是 GUI 变量与界面元素之间的最终执行层。很多属性可以带状态前缀：

- hover_background：元素被聚焦（hover）时使用的背景；
- idle_background：元素非聚焦（idle）时使用的背景；
- 直接写 background 等于同时设置两者。

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

前两种写在哪里就作用于哪里；第三种引用命名样式，可以在样式里集中定义、多处复用。

## 样式继承：parent 从哪里来

每个样式都有一个 parent（父样式），未显式指定的属性从父样式逐级取用。没有写 parent 时，Ren'Py 根据 displayable 的类型选择默认父样式——按钮类型的元素默认继承 button 样式。

样式命名还有一条隐规则：如果样式名里包含下划线，默认父样式就是第一个下划线之后的部分。例如 my_button 没写 parent 时自动继承 button；而以下划线开头的样式名保留给 Ren'Py，请不要使用。

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

## 用 Python 定义与修改样式

在 init python 块里也可以用 Python 方式创建样式：

```renpy
init python:
    style.big_red = Style(style.default)
```

之后可以逐个设置属性，例如 style.big_red.size = 40。注意：样式属性只能写、不能读——读取属性值没有意义，引擎要到显示时才完成属性的逐级解析。

## 调试利器：Shift+I 样式检查器

游戏运行时按 Shift+I 打开样式检查器（style inspector），再把鼠标指向任意界面元素，就能看到它用了哪个样式、每个属性最终取自哪一层。样式"不生效"的问题，十有八九用 Shift+I 一眼定位：要么被父样式链上的值覆盖，要么元素根本不在这个样式的作用范围内。

## 小结

- GUI 定制三层：换图片最快，改 gui.rpy 变量其次，写样式最灵活；
- Change/Update GUI 会覆盖图片并可能覆盖 gui.rpy，务必最先执行；
- options.rpy 管游戏身份（config.name、gui.about 等），game/gui/ 管图片，gui.rpy 管颜色、字体、字号与按钮；
- textbox.png 全宽、文本占中央 60%；选项按钮分 idle 与 hover 两张背景图；
- Frame 加 Borders 实现九宫格拉伸面板，gui.frame_borders 与 gui.frame_tile 控制默认 frame；
- 样式属性支持 hover 与 idle 状态前缀；样式按 parent 继承，名字含下划线时默认继承下划线之后的样式；
- style 语句支持 is、clear、take、variant、properties；命名样式在 Init 阶段后不应再改；
- Python 里用 Style() 创建样式，属性只能写不能读；Shift+I 是样式调试的第一入口。

## 参考链接

- [GUI 定制指南（官方文档）](https://www.renpy.org/doc/html/gui.html)
- [样式系统（官方文档）](https://www.renpy.org/doc/html/style.html)
- [屏幕与屏幕语言（官方文档）](https://www.renpy.org/doc/html/screens.html)
- [快速上手（官方文档）](https://www.renpy.org/doc/html/quickstart.html)
