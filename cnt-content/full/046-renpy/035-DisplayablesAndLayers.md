---
order: 40
title: 显示件与图层体系
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: Image Solid Composite ConditionSwitch 等 displayable 族与 layer zorder camera 的全局调度
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：显示件（displayable）与图层（layer）——Ren'Py 画面组织的底层抽象，图像、场景与转场（见 [图像、场景与转场](/renpy/030-ImagesSceneShowAndTransitions)）一层的下一步深入。
- **解决什么问题**：show 的到底是什么？想"太阳升起时天空渐变""表情随好感度自动切换""给弹窗垫一层半透明底板"，单靠 show image 做不到——需要理解引擎把什么画在屏幕上（displayable）、按什么顺序画（layer 与 zorder）。
- **什么时候用到**：拼装复合画面（Composite）、按条件切换图（ConditionSwitch）、随变量实时变化（DynamicDisplayable）、纯色底板（Solid）、控制一切的全局调度（camera 与图层）。
- **前置知识**：show/scene/hide 的基本用法与 tag 概念。

## 学习目标

- 理解 displayable 这一对象抽象：show 语句显示的其实是 displayable；
- 会用常用显示件族：Image、Solid、Composite、LiveComposite、ConditionSwitch、DynamicDisplayable、Frame、Tile；
- 理解图层 layer 的默认划分与 zorder 的作用，会用 show ... onlayer 与 at 表达式控制层级；
- 会用 camera 语句对整个图层施加变换，理解它与 show 层级变换的分工。

## displayable：show 的真正对象

show 语句写的 "eileen happy" 看起来是"图像名加属性"，但引擎最终显示的是一个 displayable（显示件）对象——一切可被绘制的东西的统称。图片文件被包成 Image，纯色是 Solid，多张图的组合可以是 Composite。理解这一点后，"显示一张图"与"显示一个动态画面"就统一了：它们都是 displayable，只是复杂度不同。

```renpy
# 三行做的事本质相同：把一个 displayable 放上 layer master
show eileen happy
show expression Solid("#101020") as backdrop
show expression Composite((1920, 1080), (0, 0), "bg_room.png", (960, 540), "prop_cup.png")
```

- 第一行按图像属性解析出对应的 displayable（详见 030 篇）；
- 第二行用 expression 子句直接给一个表达式求值结果——Solid 纯色块，as backdrop 给它起 tag；
- 第三行 Composite 把多张子图按坐标拼成一张固定尺寸的合成图。

易错点：expression 后面写 displayable 表达式，不是字符串路径；写 show expression "bg_room.png" 时显示的是字符串本身会被当作文件名再包一层，与直接 show bg_room.png 等价，但 show expression Solid(...) 这种对象表达式则必须用 expression。

## 常用显示件族

```text
Image("file.png")               静态图片，show 字符串默认走它
Solid(color)                    纯色填充，尺寸由容器或 xysize 决定
Frame(image, Borders(...))      九宫格拉伸（GUI 定制篇讲过它的变量层）
Composite(size, pos1, d1, ...)  多个子显示件按坐标静态合成
LiveComposite(size, pos1, d1..) 运行时合成的老写法，动态子件会持续更新
ConditionSwitch(cond1, d1, ...) 按条件从多个 displayable 中选一个显示
DynamicDisplayable(func)        每帧或每次交互调用函数返回要显示的 displayable
Tile(image)                     平铺
Flatten(d)                      把分层对象压平成单层
Null()                          什么都不画的占位
```

逐个说明关键差异：

- Composite 与 LiveComposite：Composite 在构建时把子件拼死，适合静态拼装（标题画面拼字、装备图标合成）；LiveComposite 的子件表达式每次交互重新求值，适合"换装"——身体不变、服装随变量变。动态内容用 Composite 是常见错误：图不会更新，排查半天才发现要 LiveComposite。新版代码更推荐 LayeredImage（分层立绘系统，官方有专章），但老项目与简单场景 LiveComposite 仍然常见；
- ConditionSwitch 是"哪个条件为真显示哪张图"的静态选择器，条件在显示时求值；Switch 按 tag 选择，ShowingSwitch 按当前显示状态选择。表情系统是 ConditionSwitch 的招牌用法；
- DynamicDisplayable 是"每次都问函数"的动态版本，函数签名为 (st, at)，返回 displayable 或 (displayable, redraw_time)。它最灵活，但每帧重建 displayable 有开销，能用 ConditionSwitch 解决就别上它。

场景一：表情切换用 ConditionSwitch。好感度驱动的自动表情，不用在剧本里手动 show 对应表情：

```renpy
define akari = Character("Akari")

image akari normal:
    ConditionSwitch(
        "affection > 80", "akari_face_joy.png",
        "affection > 40", "akari_face_normal.png",
        "True", "akari_face_sad.png",
    )

default affection = 50

label start:
    show akari normal
    akari "今天也请多指教。"
    $ affection += 45
    akari "诶，下次一起去海边？"
```

逐行解释：image 语句把 ConditionSwitch 固化成名为 akari normal 的图像属性组，条件从上到下短路匹配——把最严格的条件放最前、True 兜底放最后是固定写法；$ affection += 45 后的下一行台词，引擎在交互开始时重新求值条件，画面自动切到 joy 脸，剧本一行 show 都不用写。换成"在每个剧情节点手动 show 表情"的写法会发生什么：漏写一处表情就停滞，条件一多剧本没法维护。

场景二：动态天气用 DynamicDisplayable。天空颜色随游戏内时间平滑变化，条件枚举写不完，交给函数算：

```renpy
init python:
    def sky_color(st, at):
        hour = store.game_time.hour
        if 6 <= hour < 8:
            top = (250, 180, 120)
        elif 8 <= hour < 17:
            top = (120, 170, 255)
        elif 17 <= hour < 19:
            top = (220, 110, 90)
        else:
            top = (10, 10, 40)
        return Solid("#%02x%02x%02x" % top), 1.0

image dynamic_sky = DynamicDisplayable(sky_color)
```

函数返回 Solid 与重绘间隔 1.0 秒——每秒按游戏时间重算一次天空色。store.game_time 是剧本维护的变量（前缀 store. 是因为在 init python 里引用运行期 store 的写法，见 Python 语句与 store 篇）。这个模式的真实工程价值：天气、水位、电量条背景这类"连续变化的环境量"，用 ConditionSwitch 要写几十档条件，用 DynamicDisplayable 一个函数收场。

场景三：弹窗底板用 Solid 加 Composite。半透明遮罩加居中面板，是 call screen 弹窗的标准底座：

```renpy
screen confirm_panel(message):
    modal True
    add Solid("#000000b0")           # 全屏半透明黑，挡住下层画面
    add Composite(
        (600, 360),
        (40, 40),   Frame("gui/frame.png", Borders(40, 40, 40, 40)),
        (80, 100),  Text(message, size=28, xysize=(440, 120), text_align=0.5),
        (140, 260), TextButton("确定", action Return(True)),
        (340, 260), TextButton("取消", action Return(False)),
    )
```

Solid("#000000b0") 的颜色带 alpha 通道（末两位 b0 是十六进制透明度），铺满整个屏幕做压暗层；Composite 用固定尺寸容器把面板背景、文字与按钮拼在一起。注意 add 放 displayable 与 show 放 displayable 的区别：screen 里用 add，剧本里用 show；同一套 displayable 两边通用——这正是 displayable 抽象的价值。

## 图层 layer 与 zorder

引擎把屏幕划分成若干命名图层，按固定顺序从下到上绘制：

```text
master        场景与立绘，show/scene 默认落点
transient     转场与临时元素（引擎自管，勿手动占用）
screens       屏幕的默认图层
overlay       界面覆盖层
```

show 语句用 onlayer 子句指定落点，zorder 控制同图层内的次序：

```renpy
show dust behind eileen          # 同图层内按 tag 排序
show dust onlayer overlay        # 换一个图层
show dust onlayer master zorder 2
```

- behind eileen：让 dust 画在 eileen 之前（更靠后）——同图层内最常用的层级手法；
- zorder 是数字排序，未写默认 0；同 zorder 按显示先后；
- 跨图层无法用 zorder 比较：master 上 zorder 99 的元素仍在 screens 图层之下。要"立绘压过屏幕"就只能改图层结构。

什么时候动图层：立绘与 UI 抢层（把立绘 show 到 overlay 之上的做法宁可不做）、特效粒子要盖在 UI 下画面上（放 master 高 zorder）、过场字幕要盖住一切（自建图层）。自建图层用 config.layers 列表追加：

```renpy
define config.layers = [ 'master', 'submaster', 'transient', 'screens', 'overlay' ]
```

在 master 之后插入 submaster，此后 show x onlayer submaster 即可使用。易错点：config.layers 是引擎图层顺序的唯一权威，改它要连带检查所有 onlayer 引用；transient 与 screens 的位置关系引擎有约定，乱序会破坏转场。

## camera：整图层变换

show 加 at transform 只作用于单个显示件；camera 语句把变换施加在整条图层上——所有元素一起移动、缩放、模糊：

```renpy
camera:
    subpixel True
    truecenter
    zoom 1.2

camera master at shake_transform
camera at reset
```

- 第一段 camera: 块对当前上下文图层（默认 master）施加持续变换：整屏放大 1.2 倍且居中；
- camera master at shake_transform 只对 master 图层挂抖动效果，screens 图层不动——HUD 稳定而画面摇晃，这正是 camera 存在的意义；
- camera at reset 复位。

camera 与 show at 的分工：个体走 show at（立绘入场、单件动画），群体走 camera（镜头推拉、全屏震动、整体调色）。两者叠加时变换会复合——camera 已放大 1.2，个体又 zoom 1.1，最终是 1.32，排查"为什么立绘比预想大"时先查 camera。与 030 篇的转场衔接：with 语句的转场发生在图层切换处，camera 变化本身不触发转场，需要配 with None 与 with 语句的节奏控制，写法在 070 篇 ATL 的 on 事件一节有交叉。

## 动手实践

**任务一：条件切换与动态显示对比（约 25 分钟）**

用 ConditionSwitch 做一个"三档电量图标"（default battery = 100，大于 60 高、大于 20 中、否则低），再用 DynamicDisplayable 做一个每秒重算的"时间色块"（颜色随 renpy.get_game_time? 用自定义变量）。各自放进一个 screen，观察两者更新时机的差异。

提示：ConditionSwitch 在交互开始时求值——$ battery -= 30 后下一次交互才变；DynamicDisplayable 按 redraw 间隔自动重算，不依赖交互。参考骨架：

```renpy
image battery_icon:
    ConditionSwitch(
        "battery > 60", "battery_high.png",
        "battery > 20", "battery_mid.png",
        "True", "battery_low.png",
    )
```

验收点：把 battery 从 70 改到 10 的那条 $ 之后如果没有 say 或 menu，ConditionSwitch 不会刷新——这就是"交互边界求值"的可观察证据。

**任务二：图层分工实验（约 20 分钟）**

在一个场景里同时显示背景、立绘、一个自定义 submaster 图层上的雾效、一个 screen 上的 HUD；用 zorder 与 behind 调整立绘与雾效的前后关系，再用 camera master 加 zoom 看哪些元素跟着缩放、哪些不跟。

提示：config.layers 里在 master 后插入 submaster；雾效用半透明 Solid 加 blur 的 ATL。参考骨架：

```renpy
define config.layers = [ 'master', 'submaster', 'transient', 'screens', 'overlay' ]

label fog_test:
    scene bg room
    show eileen happy
    show fog onlayer submaster:
        alpha 0.4
        blur 3.0
    camera master:
        zoom 1.2
        linear 2.0 zoom 1.0
    pause
```

预期观察：HUD（screens 层）纹丝不动，立绘与雾一起被推拉——这就是图层级别的镜头隔离。

**任务三：弹窗组件化（约 20 分钟）**

把"半透明遮罩 + Composite 面板"封装成可复用 screen popup(title, body, on_yes)，在两个不同场景调用它并验证 Return 值的正确传递。

提示：call screen popup(...) 后用 _return 取值；Composite 里文字要给 xysize 才能自动换行。参考实现骨架：

```renpy
screen popup(title, body, on_yes):
    modal True
    add Solid("#000000b0")
    frame:
        background Frame("gui/frame.png", Borders(40, 40, 40, 40))
        xalign 0.5 yalign 0.4
        xysize (640, 400)
        vbox:
            spacing 16
            text title size 32
            text body size 24
            hbox:
                xalign 1.0
                textbutton "确定" action Return(on_yes)
                textbutton "取消" action Return(None)
```

## 小结

- show 的真正对象是 displayable：Image、Solid、Frame、Composite、Tile、Null 是基础族，ConditionSwitch 按条件选择、DynamicDisplayable 按函数动态产出，动态内容选错家族（Composite 与 LiveComposite）是"画面不更新"的常见根源。
- 图层按固定顺序绘制（master/transient/screens/overlay，可用 config.layers 追加），同层内用 behind 与 zorder 排序，跨层不可比。
- camera 把变换施加到整条图层，与 show at 的个体变换分工明确、叠加时复合；HUD 稳定而画面摇晃的镜头效果靠 camera master 实现。
- expression 子句让 show/screen add 直接接受 displayable 表达式，两处通用同一抽象。

## 参考与致谢

- [Displayables（Ren'Py 官方文档）](https://www.renpy.org/doc/html/displayables.html)——CC BY-NC-SA 许可，本篇的显示件族清单与 ConditionSwitch/DynamicDisplayable 机制以此为底本整理改写；
- [Transitions and Cameras（Ren'Py 官方文档）](https://www.renpy.org/doc/html/transitions.html)
- 本仓库 [图像、场景与转场](/renpy/030-ImagesSceneShowAndTransitions)、[ATL：变换与动画](/renpy/070-ATLTransformsAndAnimation)、[屏幕语言与界面](/renpy/080-ScreensAndScreenLanguage) 交叉引用。
