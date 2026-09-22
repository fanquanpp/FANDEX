---
order: 70
title: ATL：变换与动画
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 用变换语言给图像定位缩放淡入淡出，掌握插值缓动并行随机与事件驱动的动画写法
author: fanquanpp
updated: '2026-09-22'
related:
  - 'renpy/030-ImagesSceneShowAndTransitions'
  - 'renpy/080-ScreensAndScreenLanguage'
prerequisites:
  - 'renpy/030-ImagesSceneShowAndTransitions'
---

第三篇里我们用 at right、at left 把立绘摆到固定位置，但那只是变换（transform）的最浅层用法。Ren'Py 内置了一门专用的小语言——ATL（Animation and Transformation Language，动画与变换语言），用声明式的语句块描述图像的位置、缩放、透明度如何随时间变化。打字机式移动的 logo、随机切换的表情、按钮的脉冲呼吸、淡入淡出的转场，都可以用 ATL 写出来。

ATL 的价值在于它是数据而不是代码：一段 ATL 块可以附着在 transform、image 或 show 语句上，被引擎按帧解释执行。本篇从三种承载方式讲起，逐个过一遍 ATL 语句，最后说清 transform 相互替换时的继承规则。

## 学习目标

- 理解 ATL 的三种承载方式：transform 语句、image 语句加 ATL 块、show/scene 语句加 ATL 块；
- 会用常用 transform 属性（xalign、zoom、alpha、rotate、blur 等）与内置位置变换；
- 掌握 ATL 基础语句：属性语句、pause、插值语句、repeat、block；
- 认识常用 warper（缓动函数）：linear、ease、easein、easeout 与 Robert Penner 家族；
- 会用 parallel 做并行动画，用 choice 做随机选择，用 animation 固定动画时间基；
- 会用 on 语句响应 show、hide、hover 等事件。

## 三种承载方式

第一，transform 语句定义一个可复用的变换，之后任何 show 都能 at 它，还支持参数：

```renpy
transform left_to_right:
    xalign 0.
    linear 2 xalign 1.
    repeat
```

第二，image 语句可以直接跟一个 ATL 块，把动画固化成一张"图"：

```renpy
image animated_ariana_img:
    "ariana"
    pause 1.
    "ariana_reverse"
    pause 1.
    repeat
```

这个图像显示 1 秒 ariana，再显示 1 秒 ariana_reverse，无限循环——帧动画就这么写。

第三，show 或 scene 语句后面直接跟 ATL 块，现场包裹一次性变换：

```renpy
show eileen happy:
    xalign 1.0
    linear 2.0 xalign -1.0
```

立绘从屏幕右侧滑到左侧，只此一次，不留名字。三种方式共享同一套 ATL 语法，学会了语句就全都通了。

## 常用属性与内置位置

写 ATL 主要就是在摆弄一组变换属性：

```text
xpos / ypos      水平 / 垂直位置（像素或相对值）
xalign / yalign  0 到 1 的对齐：0 贴左（上），1 贴右（下），0.5 居中
anchor           锚点，决定"图像上的哪个点"对到给定坐标
zoom             整体缩放
xzoom / yzoom    水平 / 垂直单独缩放
alpha            不透明度 0.0 到 1.0
rotate           旋转角度
xysize           尺寸
blur             高斯模糊强度
```

其中 xalign/yalign 是最常用的定位方式：一个数字同时表达"放在哪"与"以哪点对齐"。此外 ATL 有一个 Properties 语句的概念——一行里直接写多个属性即为属性语句，如 xanchor .3 xpos 100，立即生效。

引擎也内置了一批位置变换，它们就是用 ATL 写好的现成 transform：

```text
center                        水平居中、贴底（show 的默认位置）
left / right                  贴左 / 贴右
truecenter                    水平垂直都居中
top / topleft / topright      顶部系列
offscreenleft / offscreenright 完全移出屏幕左 / 右
reset                         重置位置属性
default                       默认位置
```

注意 offscreenleft 与 offscreenright：图像被移出屏幕后仍在被"显示"，引擎不会自动回收，需要时应当用 hide 隐藏以释放资源。

## ATL 基础语句

### pause 与插值

pause 语句让画面停顿：pause 2.0 等 2 秒，也可以直接写裸数字 3.0，pause 关键字可选。

插值语句是 ATL 的核心，形式为"warper 时长 属性..."：第一个词是缓动函数（warper），随后是时长与一组目标属性：

```renpy
show logo base:
    xalign 0.0 yalign 0.0
    # Take 2.0 seconds to move things to the bottom-left corner.
    linear 2.0 yalign 1.0
```

logo 先瞬移到左上角，再用 2 秒匀速滑到底部。第一行是不带 warper 的属性语句（立即生效），第二行是插值语句（渐进生效）。插值语句也可以写成块形式，把多个属性的插值目标放进缩进块里一次完成。

### repeat 与 block

repeat 让语句序列循环，可带次数（repeat 3）；它必须是所在块的最后一条语句。想让"一段序列"整体循环，用 block: 分组：

```renpy
show eileen thinking:
    block:
        linear 1.0 xalign 0.0
        linear 1.0 xalign 1.0
    repeat
```

立绘在左右两端之间往返。

## 缓动 warper

warper 决定插值的节奏曲线。内置五个：

```text
pause    不改属性，纯等待
linear   匀速
ease     慢-快-慢
easein   先快后慢
easeout  先慢后快
```

此外还有一整个 Robert Penner 缓动家族：ease_back、ease_bounce、ease_circ、ease_cubic、ease_elastic、ease_expo、ease_quad、ease_quart、ease_quint，以及各自的 easein_ 与 easeout_ 变体（如 easeout_bounce）。bounce 弹跳、elastic 橡皮筋、back 回弹过冲，都在其中，给 UI 动画挑节奏时值得逐个试。

## parallel：并行执行

parallel 块让多段动画同时进行；所有块都结束后，整条语句才算结束。各块应当修改不同的属性，否则会互相覆盖：

```renpy
show logo base:
    parallel:
        xalign 0.0
        linear 1.3 xalign 1.0
        linear 1.3 xalign 0.0
        repeat
    parallel:
        yalign 0.0
        linear 1.6 yalign 1.0
        linear 1.6 yalign 0.0
```

这个官方示例让 logo 水平方向 1.3 秒一趟左右往返循环，垂直方向 1.6 秒一趟上下往返循环——两个周期叠加，轨迹是一个利萨如曲线式的漂移。

## choice：按权重随机

choice 块从多个分支中按权重随机选一个执行，默认权重 1.0：

```renpy
image eileen random:
    choice:
        "eileen happy"
    choice:
        "eileen vhappy"
    choice 2.0:
        # More likely to be chosen.
        "eileen concerned"
    pause 1.0
    repeat
```

每次循环随机挑一个表情显示 1 秒；choice 2.0 的块被选中的概率是普通块的两倍。这种"随机待机表情"是 galgame 的常见演出。

## animation：固定动画时间基

animation 语句必须是 ATL 块的第一条，它让该块改用动画时间基（at 而不是 st）。效果是：当图像属性被替换（例如换表情）时，动画的进度不会从头重放，而是沿着自己的时钟继续走：

```renpy
image eileen happy moving:
    animation
    "eileen_happy_a.png"
    pause 1.0
    "eileen_happy_b.png"
    pause 1.0
    repeat
```

对循环待机动画加 animation，可以避免"每次换表情动画都重新跳回第一帧"的违和感。

## on：事件驱动

on 语句为具名事件指定处理块。引擎会在特定时机发出事件：show、replace（被同 tag 图像替换）、hide、replaced（替换掉旧图），以及按钮状态事件 hover、idle、selected_hover 等：

```renpy
show logo base:
    on show:
        alpha 0.0
        linear .5 alpha 1.0
    on hide:
        linear .5 alpha 0.0

transform pulse_button:
    on hover, idle:
        linear .25 zoom 1.25
        linear .25 zoom 1.0
```

第一个示例让 logo 出现时半秒淡入、隐藏时半秒淡出。第二个示例是按钮脉冲：一行 on hover, idle 同时声明两个事件的处理（进入 hover 与回到 idle 时都播放），按钮在鼠标悬停时放大又缩回，形成一次"心跳"。on 也可以显式声明 event 语句产生的事件。

## 其他语句与进阶运动

- function 语句：每帧调用一个签名为 (trans, st, at) 的自定义函数，返回下一次调用的时间（返回 None 表示停止），是 ATL 的逃生舱口，适合程序化动画；
- time 语句：到达指定时间后强制切换到下一语句，常用来给动画定节拍；
- event 语句：产生一个具名事件，可被其他 on 块或屏幕捕获；
- contains 语句：在一个 ATL 块里容纳多个子对象，各自带各自的动画。

样条与圆周运动：插值语句支持 knot 控制点，让图像沿样条曲线运动（1 个控制点为二次贝塞尔曲线，2 个为三次贝塞尔曲线，3 个以上为 Catmull-Rom 样条）；ATL 还提供 clockwise 与 counterclockwise 圆周运动的写法。细节见官方 transforms 文档，本篇不展开。

## transform 的替换规则

最后是三个容易踩坑的规则：

- show 不带 at 子句时，图像会沿用它当前已在使用的 transform——已经滑到屏幕中间的立绘，不会因为一句 show eileen happy 就跳回默认位置；
- 一个 ATL transform 替换另一个时，属性会被继承：新 transform 没写的属性沿用旧值；
- 想完全重置，要么 hide 之后再 show（从零开始），要么显式 at reset。

## 小结

- ATL 是 Ren'Py 内置的动画与变换语言，三种承载方式：transform 语句（可复用、支持参数）、image 语句加 ATL 块（帧动画）、show/scene 加 ATL 块（一次性包裹）。
- 常用属性：xpos/ypos、xalign/yalign、anchor、zoom、xzoom/yzoom、alpha、rotate、xysize、blur；内置位置有 center、left、right、truecenter、top 系列、offscreenleft/right 与 reset，离屏图像记得 hide 释放。
- 基础语句：属性语句立即生效；pause 2.0 或裸 3.0 停顿；插值语句"warper 时长 属性"渐进生效；repeat 可带次数且必须是块最后一条；block 分组配合 repeat 循环一段序列。
- warper：pause、linear、ease（慢快慢）、easein（先快后慢）、easeout（先慢后快），以及 Robert Penner 家族及其 easein_/easeout_ 变体。
- parallel 多块并行、全完才完、各改各的属性；choice 按权重（默认 1.0）随机选块；animation 必须是块第一条，改用 at 时间基，换属性不重置动画。
- on 响应 show/replace/hide/replaced 与 hover/idle/selected_hover 等事件；另有 function、time、event、contains 等语句；样条 knot 与顺逆时针圆周运动见官方文档。
- 替换规则：无 at 子句沿用旧 transform；ATL 相互替换属性继承；彻底重置用 hide 加 show 或 reset。

## 参考链接

- [变换与 ATL（Transforms and ATL）](https://www.renpy.org/doc/html/transforms.html)
- [图像显示（Displaying Images）](https://www.renpy.org/doc/html/displaying_images.html)
- [屏幕语言（Screen Language）](https://www.renpy.org/doc/html/screens.html)
- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
