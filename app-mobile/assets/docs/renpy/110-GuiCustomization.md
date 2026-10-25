---
order: 170
title: GUI 定制
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 替换图片与调整 gui.rpy、options.rpy 变量给游戏改头换面，理解九宫格边框机制
author: fanquanpp
updated: '2026-10-07'
related:
  - 'renpy/080-ScreensAndScreenLanguage'
  - 'renpy/115-StyleSystemAndStyleProperties'
  - 'renpy/130-BuildingDistributions'
prerequisites:
  - 'renpy/080-ScreensAndScreenLanguage'
---

用 Ren'Py 新建项目后，你得到的是一套现成的现代 GUI：主菜单、存档读档、偏好设置一应俱全。这套界面的外观由三层东西驱动：game/gui/ 目录下的图片、gui.rpy 里的变量、以及底层的样式（style）系统。三者是逐层深入的关系——换图最快，改变量次之，写样式最灵活。

本篇覆盖前两层（图片替换与 gui.rpy / options.rpy 变量），样式系统已拆分为独立一篇：[样式系统与样式属性](/renpy/115-StyleSystemAndStyleProperties)。

## 学习目标

- 分清 GUI 定制的三层路径：替换图片、修改 gui.rpy 变量、编写样式；
- 理解为什么 Change/Update GUI 应该在其他定制之前执行；
- 会替换主菜单、游戏菜单、对话框、选项按钮与窗口图标等图片；
- 会调整颜色、字体、字号与按钮相关变量；
- 理解 Frame 与 Borders 的九宫格拉伸机制。

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

## 动手实践

**任务一：完成一次换皮（约 25 分钟）**

从 launcher 新建项目，依次完成：用 Change/Update GUI 把分辨率改成 1280x720、配色换一个主题；替换 main_menu.png 与 textbox.png（可以用任意同尺寸图片占位）；在 options.rpy 改游戏名与版本号。

提示：顺序不能反——先 Change/Update GUI 再换图，否则图片被覆盖白换；textbox.png 记得保持"全宽、中央 60% 是文字区"的比例。参考自检：启动游戏后主菜单背景、对话框、窗口标题三处全部换新，且对白没有错位。

**任务二：角色专属配色（约 15 分钟）**

给两个角色分别设置不同的 who_color，再改 gui.accent_color，观察"全局强调色"与"角色覆盖"两个层级各自影响哪里。

提示：Character 上的 who_color 只影响该角色名字，gui.accent_color 影响默认强调位置（如界面高亮）。参考片段：

```renpy
define e = Character("Eileen", who_color="#104010")
define l = Character("Lucy", who_color="#401010")
```

**任务三：九宫格面板实验（约 15 分钟）**

拿一张带圆角边框的图，分别在 Borders(0,0,0,0)（整图拉伸）与 Borders(40,40,40,40)（九宫格）两种设置下放进 screen 的 frame，把容器拉到三种尺寸对比变形程度。

提示：Borders 四个数字是左上右下边框宽，数值应与图片圆角半径匹配；设小了圆角被切，设大了中间区域太窄。参考片段：

```renpy
screen panel_test():
    frame:
        background Frame("gui/frame.png", Borders(40, 40, 40, 40))
        xysize (600, 300)
        text "面板内容"
```

## 小结

- GUI 定制三层：换图片最快，改 gui.rpy 变量其次，写样式最灵活（样式层见下一篇）；
- Change/Update GUI 会覆盖图片并可能覆盖 gui.rpy，务必最先执行；
- options.rpy 管游戏身份（config.name、gui.about 等），game/gui/ 管图片，gui.rpy 管颜色、字体、字号与按钮；
- textbox.png 全宽、文本占中央 60%；选项按钮分 idle 与 hover 两张背景图；
- Frame 加 Borders 实现九宫格拉伸面板，gui.frame_borders 与 gui.frame_tile 控制默认 frame。

## 参考链接

- [GUI 定制指南（官方文档）](https://www.renpy.org/doc/html/gui.html)
- [样式系统（官方文档）](https://www.renpy.org/doc/html/style.html)
- [屏幕与屏幕语言（官方文档）](https://www.renpy.org/doc/html/screens.html)
- [快速上手（官方文档）](https://www.renpy.org/doc/html/quickstart.html)
