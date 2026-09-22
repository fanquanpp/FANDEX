---
order: 80
title: 屏幕语言与界面
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 用 screen 语句构建菜单与 HUD，掌握按钮容器控制语句与 call screen 的交互返回
author: fanquanpp
updated: '2026-09-22'
related:
  - 'renpy/040-LabelsControlFlowAndMenus'
  - 'renpy/110-GuiStylesAndCustomization'
prerequisites:
  - 'renpy/040-LabelsControlFlowAndMenus'
---

screen 语句是 Ren'Py 提供的第二门语言：屏幕语言（Screen Language）。剧本语言描述"故事的推进"，屏幕语言描述"界面的样子与反应"——主菜单、存读档界面、设置页、HUD 覆盖层、自定义选项菜单，全部由它构建。新项目里的 screens.rpy 就是一组现成的屏幕定义，学会读它、改它，就掌握了界面定制的钥匙。

屏幕本质上是一个"界面描述"：它声明有哪些控件、摆在哪里、点击后做什么。理解它有两个前提约定，先讲清楚。

## 学习目标

- 理解屏幕的四种显示方式与两条重要约束；
- 会读 screen 语句与它的属性（modal、tag、zorder、variant、style_prefix、layer）；
- 会用常用 UI 语句搭建界面：text、add、button、textbutton、imagebutton、布局容器、input、timer、bar；
- 掌握控制语句 default、for、if、use、showif 在屏幕内的用法；
- 会用 show screen、hide screen、call screen 控制屏幕生命周期，理解 _return；
- 认识特殊屏幕（say、choice、input、nvl）与游戏菜单屏幕，了解屏幕变体 variants。

## 两条重要约束

第一，屏幕在每次交互（interaction）开始时更新。玩家每点击一次、剧本每推进一步，屏幕都会按当前变量重新求值，所以屏幕会"自动跟着数据变"。

第二，屏幕不得产生对外可见的副作用（side effect）。Ren'Py 在图像预测（image prediction）时会多次运行屏幕代码，写在上面的赋值、文件操作会被反复执行。屏幕里只做"描述界面"这件事；改状态请交给 action。

## 四种显示方式

屏幕有四种出现的方式：其一，脚本语句隐式触发——say 语句自动显示 say 屏幕来呈现对白，menu 自动显示 choice 屏幕呈现选项；其二，自动显示——游戏启动时自动显示 main_menu；其三，作为按钮 action 的一部分被显示（如 ShowMenu）；其四，用显式语句 show screen 与 call screen。本篇重点是第四种，其余三种会在特殊屏幕一节收拢。

## screen 语句

```renpy
screen say(who, what):
    window id "window":
        vbox:
            spacing 10
            text who id "who"
            text what id "what"
```

这是官方的 say 屏幕示例，逐行读：screen say(who, what): 定义了一个带两个参数的屏幕；window 是对白窗口容器，id "window" 给它命名；vbox 纵向排列两行文本，spacing 10 设定行距；text who 显示说话者，text what 显示台词，二者分别命名为 id "who" 与 id "what"——引擎要求 say 屏幕必须含这两个 id，播放语音、跳过等功能都按 id 找到对应控件。

screen 语句自身可带属性：modal（True 时阻断本屏之下的交互）、tag（同 tag 的屏幕互斥，隐藏也按 tag）、zorder（叠放次序）、variant（变体选择）、style_prefix（给子控件套样式前缀）、layer（放在哪个图层），以及 sensitive、roll_forward 等。

## 常用 UI 语句

### 文本与显示

- text 显示一段文本，支持插值：text "分数：[score]"；
- add 把一个已有的 displayable 加进屏幕：add "logo.png" xalign 1.0 yalign 0.0，图像、动画、Movie 都可以进来。

### 按钮

- button 是通用按钮容器，内部可放任意子控件；action 决定点击时做什么，同时决定按钮是否敏感（sensitive）、是否呈选中态（selected）；hovered 与 unhovered 在指针进出时执行；alternate 绑定右键；
- textbutton 是最常用的文字按钮：textbutton "Wine" action Jump("wine")；
- imagebutton 是图片按钮，auto 参数按 %s 模式自动找状态图：imagebutton auto "save_%s.png" action ShowMenu('save') 会自动使用 save_idle.png、save_hover.png 等文件。

### 布局容器

```text
hbox / vbox  横向 / 纵向排列子控件，spacing 控制间距
frame        带背景的窗口容器
fixed        子控件按各自位置属性自由布局，可以重叠
grid         网格，必须给出列数与行数
side         多边布局
null         空占位容器
```

### 输入与计时

- input：文本输入框；
- key：把某个按键绑定到 action；
- timer 3.0 action Jump("too_slow")：3 秒后触发 action；
- bar value Preference("sound volume")：滑条，value 指明取值来源，可以绑定音量、文字速度等偏好；
- viewport 与 vpgrid：可滚动区域与其网格版，适合长列表，本篇一句话带过，细节见官方文档。

## 控制语句

屏幕语言有自己的流程控制，写法与剧本一致但作用于屏幕作用域。

### default 与屏幕局部变量

```renpy
screen scheduler():
    default club = None
    vbox:
         text "What would you like to do?"
         textbutton "Art Club" action SetScreenVariable("club", "art")
         textbutton "Writing Club" action SetScreenVariable("club", "writing")
         if club:
             textbutton "Select" action Return(club)
```

default 给屏幕局部变量 club 设默认值 None；SetScreenVariable("club", "art") 修改屏幕局部变量，屏幕随即按新值重绘，if club 分支里的 Select 按钮出现；点击 Select 时 Return(club) 结束交互并把所选值交回给剧本。这个小小的选社界面演示了屏幕交互的完整闭环：default 备好初始值，action 改屏幕变量驱动界面变化，Return 把结果带回。

### for 与 if

```renpy
$ numerals = [ 'I', 'II', 'III', 'IV', 'V' ]
screen five_buttons():
    vbox:
        for i, numeral in enumerate(numerals):
            textbutton numeral action Return(i + 1)
```

for 遍历列表生成一排按钮，支持 index 子句指定循环变量名，也支持 continue 与 break。if、elif、else 与剧本语法相同，按条件决定渲染哪些控件。

### use 与 showif

use 把其他屏幕当作组件复用，参数照传；写成 use xxx as yyy 可把被 use 屏幕的局部变量捕获进来；use 还能带块并用 transclude 实现可复用布局——调用处块里的内容会被嵌入被 use 的屏幕。showif 与 if 的区别：showif 控制一组子控件的显示与隐藏，显示隐藏会触发 appear、show、hide 等 ATL 事件，因此可以配动画过渡；if 则是干脆不渲染。

最后，屏幕内也可以写 python 与 $，它们运行于屏幕作用域，同样受"不得有副作用"约束。

## show screen、hide screen 与 call screen

```renpy
show screen clock_screen(hour=11, minute=30)
```

show screen 显示屏幕并让它常驻，直到显式隐藏，适合 HUD、时钟这类覆盖层；可以像函数一样传参数。hide screen 按 tag 隐藏屏幕。

call screen 则是"让屏幕接管一次交互"：

```renpy
call screen my_imagemap
```

call screen 显示屏幕、开始交互，屏幕中某个 action 调用 Return() 时交互结束，屏幕自动隐藏，Return() 携带的值存入 _return 变量，剧本随后可用。自定义选项菜单、点击图（imagemap）、小游戏界面都是这个模式。call screen 还支持 with 子句，在屏幕显示时播放转场。

## 屏幕变量解析顺序

屏幕里引用一个名字时，按以下顺序查找：

```text
1. 被 use 进来的屏幕的局部变量
2. 屏幕内 default 定义的变量
3. 屏幕参数
4. 全局 store
```

注意屏幕参数不能被 action 直接修改；要改全局变量用 SetVariable，要改屏幕局部变量用 SetScreenVariable，两者别混。

## 特殊屏幕与游戏菜单

若干屏幕名有特殊含义，引擎会在固定时机调用它们：

- say(who, what)：对白屏，必须含 id "who" 与 id "what"，通常还有 id "window"；
- choice(items)：选项菜单屏，items 的每项含 caption（选项文字）、action（选中动作）与 chosen（以前是否选过），改它就能重排选项样式；
- input(prompt)：输入屏，必须含 input id "input"；
- nvl(dialogue, items=None)：NVL 对白屏；
- 另有 notify、skip_indicator、ctc 等。

游戏菜单类屏幕：

- main_menu：主菜单，按钮 action 如 Start()、ShowMenu("load")、Quit(confirm=False)；
- navigation：各菜单共用的导航栏；
- save 与 load：存读档屏，核心控件是 FilePage（页切换）、FileScreenshot（存档截图）、FileTime（存档时间）、FileSaveName（存档名）与 FileAction（执行存/读）。官方示例以网格组织，示意如下：

```renpy
# 简化示意：官方 screens.rpy 的存读档屏幕以此结构组织
screen load():
    grid 2 5:
        for i in range(1, 11):
            button:
                action FileAction(i)
                add FileScreenshot(i)
```

- preferences：设置屏， Preference("display", "fullscreen") 这类 action 切换选项，bar value Preference("text speed") 调文字速度；
- confirm：是/否确认对话框，被 Quit 等需要确认的 action 调起。

## 屏幕变体 variants

同一屏幕可以定义多份，各自标上 variant，运行时按 config.variants 列表的顺序选择第一个存在的变体。设备相关的变体是自动判定的：steam_deck、large（电脑屏）、medium（平板）、small（手机或电视）、tablet、phone、touch、tv、android、ios、mobile、pc、web 等。

```renpy
# A variant hello_world screen, used on small touch-based devices.
screen hello_world():
     tag example
     zorder 1
     modal False
     variant "small"
     text "Hello, World." size 30
```

给小屏设备写一份布局更紧凑的屏幕、给电脑写一份完整版，是移动适配的标准做法。

## 小结

- 屏幕语言描述界面；屏幕在每次交互开始时更新，且不得有对外可见的副作用（图像预测会多次运行屏幕）。
- 四种显示方式：say/menu 隐式触发、启动自动显示 main_menu、作为 action、显式 show screen/call screen。
- screen 语句可带参数与属性（modal、tag、zorder、variant、style_prefix、layer）；say 屏幕必须有 id "who" 与 id "what"。
- UI 语句：text、add 显示内容；button/textbutton/imagebutton（auto 按 %s 自动找状态图）负责交互；hbox/vbox/frame/fixed/grid/side/null 负责布局；input、key、timer、bar、viewport/vpgrid 覆盖输入计时滚动。
- 控制语句：default 设屏幕局部变量（配 SetScreenVariable），for（index、continue/break）、if/elif/else、use（as 捕获与 transclude）、showif（带 appear/show/hide 动画事件）。
- show screen 常驻适合 HUD，hide screen 按 tag 隐藏；call screen 接管一次交互，Return() 的值进 _return，支持 with 转场。
- 变量解析顺序：used 屏幕局部、屏幕变量、屏幕参数、全局 store；改全局用 SetVariable、改屏幕用 SetScreenVariable。
- 特殊屏幕 say/choice/input/nvl 与游戏菜单 main_menu/navigation/save/load/preferences/confirm 构成默认界面；变体按 config.variants 顺序选择，覆盖 small/phone/tablet/pc/web 等平台。

## 参考链接

- [屏幕语言（Screen Language）](https://www.renpy.org/doc/html/screens.html)
- [特殊屏幕（Special Screens）](https://www.renpy.org/doc/html/screen_special.html)
- [标签与控制流（Labels and Control Flow）](https://www.renpy.org/doc/html/label.html)
- [GUI 定制指南（GUI Customization Guide）](https://www.renpy.org/doc/html/gui.html)
