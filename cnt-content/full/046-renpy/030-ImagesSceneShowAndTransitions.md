---
order: 30
title: 图像、场景与转场
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 掌握 image scene show hide 四条图像语句，用 tag 与属性管理立绘并用 with 播放转场
author: fanquanpp
updated: '2026-09-22'
related: ['renpy/020-FirstScriptSayAndCharacters', 'renpy/040-LabelsControlFlowAndMenus', 'renpy/070-ATLTransformsAndAnimation']
prerequisites: ['renpy/020-FirstScriptSayAndCharacters']
---

只有文字的剧本很快会显得单调。视觉小说的灵魂是"图配文"：背景交代地点，立绘（character sprite）表现角色表情，转场让画面切换变得柔和。本篇系统讲解 Ren'Py 的图像显示系统：图像名如何构成、Ren'Py 如何自动找到你的图片文件、scene/show/hide/image 四条语句各自负责什么，以及如何用 with 播放转场、用 at 摆放位置。

## 学习目标

- 理解图像名由标签（tag）与属性（attributes）组成，以及"同 tag 同时只能显示一张"的规则；
- 会把图片放进 images/ 目录，依靠自动图像定义直接使用；
- 会用 scene、show、hide 三条语句管理背景与立绘，知道官方的使用建议；
- 会用 image 语句手动定义图像名，绑定文件之外的 displayable；
- 会用 with 播放 dissolve、fade 等转场，并理解 with None 的分步技巧；
- 会用 at 子句与内置位置摆放图像，了解 as、behind、onlayer、zorder 等属性。

## 图像名：标签与属性

Ren'Py 用"图像名（image name）"指代一张图像。图像名由空格分隔的多个单词组成：第一个单词是标签（tag），后面的单词是属性（attributes）。例如：

```text
sylvie green smile
```

其中 sylvie 是标签，green 和 smile 是属性，合起来表示"穿绿衣服、微笑的 Sylvie"。

标签是图像的"身份"：同一时间，同一个标签的图像在屏幕上只能显示一张。这正是表情切换的基础——当你 show 一张新的 sylvie 图像时，旧的 sylvie 会被自动替换掉。

## 自动图像定义：把文件丢进 images 目录

最省心的用法是完全不写定义代码：Ren'Py 会自动扫描项目的 images/ 目录，把里面的图片注册为可用图像。规则是：

- 图像名 = 文件名去掉扩展名，并强制转为小写。例如 bg meadow.jpg 会被注册为 bg meadow；
- 子目录名被忽略：images/bg/meadow.jpg 与 images/meadow.jpg 注册出的是同一个图像名 bg meadow；
- 立绘建议使用 PNG/WEBP/AVIF 这类带透明通道的格式，背景还可以用 JPG/JPEG；
- 支持超采样（supersampling）：文件名以 @数字 结尾（例如 eileen happy@2.png 表示 2 倍分辨率），供高分辨率屏幕显示更清晰的画面；当请求的倍率文件不存在时，Ren'Py 会自动查找更高倍率的文件来代替。

也就是说，你只要把 sylvie_green_smile.png 改名整理成符合图像名的文件（如 sylvie green smile.png，或放进任意子目录），脚本里就能直接使用 sylvie green smile 这个名字。

## 四条图像语句

Ren'Py 有四条与图像直接相关的语句：scene、show、hide 与 image。前三条在剧本运行时使用，第四条在初始化时定义。

先看官方快速入门中的示例，走读一遍：

```renpy
label start:

    scene bg meadow

    "After a short while, we reach the meadows."

    m "Hey... Umm..."

    show sylvie green smile

    "She turns to me and smiles."

    show sylvie green surprised

    "Silence."
```

- `scene bg meadow`：scene 会清空图层上的所有图像，然后显示指定的背景。这是切换场景、更换背景的标准做法。
- `show sylvie green smile`：show 在现有画面之上显示立绘，不清空其他内容。Sylvie 就此登场。
- `show sylvie green surprised`：新图像与旧图像标签同为 sylvie，因此旧立绘被自动替换——表情从微笑切换成惊讶，背景不动。
- 后续的旁白与对白照常进行，画面上始终是草地背景加上 Sylvie 的立绘。

hide 语句按标签移除图像（例如 `hide sylvie`），本例没有用到。至于 image 语句，它是文件顶层的定义语句（不缩进），用于手动指定图像名，常用于文件名不便直接作图像名、或需要绑定其他 displayable 的情况：

```renpy
image logo = "renpy logo.png"
image eileen happy = "eileen_happy_blue_dress.png"
image black = "#000"
image bg tiled = Tile("tile.jpg")
```

前两行把图像名映射到图片文件；后两行展示了 image 语句更强大的用法——它可以绑定任意 displayable（可显示对象），比如 #000 写出的纯黑色，或者用 Tile() 平铺一张贴图。定义之后，这些图像名同样可以用于 scene 与 show。

### 官方使用建议

什么时候用哪条语句？官方给出的经验法则值得直接记住：

- 更换角色表情：用 show，同 tag 自动替换，干净利落；
- 全员离场、切换场景：用 scene 清空图层；
- 只有"角色离开但场景保持不变"这一种情况，才需要 hide；
- 不要写 hide sylvie 之后紧接着 show sylvie ...：这是多余的两次操作，直接写一次 show 即可。

## 用 with 播放转场

图像的显示与替换默认是瞬间完成的，看起来很生硬。with 语句用于播放转场（transition）动画。两个最常用的内置转场是：

- dissolve：交叉淡化，新旧画面互相融合；
- fade：先淡出到黑屏，再从黑屏淡入，适合大场景切换。

```renpy
    scene bg meadow
    with fade

    "After a short while, we reach the meadows."

    show sylvie green smile
    with dissolve
```

走读：scene 之后紧跟 with fade，草地背景从黑屏中淡入；show 之后紧跟 with dissolve，Sylvie 的立绘以交叉淡化方式浮现。

with 的作用范围值得注意：一条 with 写在多条 scene/show/hide 之后时，会同时作用于它们全部。也就是说，连续的几条 show 加一条 with，玩家看到的是这几处变化一次性融合完成的画面。

say 语句同样可以直接在行尾携带 with 子句，让这句台词伴随转场出现，官方示例是 `"Bam!!" with vpunch` 这种写法。

还有一个进阶技巧：with None。它不播放任何动画，但会产生一次不改变画面的简短交互，把当前画面记录为"上一屏"快照，作为下一次转场的起点。利用它可以把"背景换了但立绘不动"这类复杂变化拆成多步转场，逐步控制每一层何时变化、如何变化。

## 位置与 at 子句

不指定位置时，图像默认水平居中、底边贴住屏幕底部，这正适合立绘的常规站位。要改变位置，使用 at 子句：

```renpy
    show sylvie green smile at right
```

Ren'Py 内置了几个常用的位置：

```text
left         贴左侧
right        贴右侧
center       水平居中（默认位置）
truecenter   水平与垂直都居中
```

例如 at truecenter 会把图像摆到屏幕正中央，常用于标题、logo 或回忆画面的呈现。位置本质上是可复用的 transform（变换），本模块后续讲 ATL 的篇章会带你自定义位置与动画。

## show 的高级属性

show 语句还支持一组修饰属性，应对更讲究的构图需求：

```renpy
    show mary night happy at right

    show mary night sad as mary2 at left

    show moon behind mary, mary2

    show moon onlayer user_layer

    show susan -happy
```

逐行解释：

- 第一行是常规写法：mary night happy 显示在右侧。
- 第二行用了 as：给这次显示指定一个别名标签 mary2。同一个 mary 图像因此能同时显示两份——一份 mary 在右，一份 mary2 在左，常用于表现分身、镜像或回忆中的同一角色。
- 第三行 behind：让月亮显示在 mary 与 mary2 的后面，控制同层内的遮挡关系。
- 第四行 onlayer：把图像放到指定图层（layer）上，这里是一个名为 user_layer 的图层。Ren'Py 有多个图层，scene/show/hide 默认操作 master 层；此外还有每次交互结束清空的 transient 层、以及 screens、overlay 等图层。
- 第五行是属性减法：show susan -happy 表示保留 susan 当前显示的属性、但移除 happy 属性。与之相对的"加法"就是前面见过的 show sylvie green surprised（补上属性）。

show 的匹配规则可以概括为：先尝试精确匹配你写的图像名；找不到时，在同名标签的图像里寻找同时满足"包含你给出的所有属性、且与当前显示的同标签图像共享最多属性"的那一张；由于同 tag 只显示一张，新 show 会替换旧图。

另外两条相关语句：scene 也可以只写标签省略属性（如 scene bg beach，清空图层再显示新背景）；scene 后面完全省略图像名时，则只清空图层、不显示任何东西。zorder 属性可以调整图像在层内的叠放次序，与 behind 互为补充。

## camera 与图层简述

如果想对整个图层施加变换（例如让全部画面轻微模糊或旋转），新写法是 camera 语句：

```renpy
    camera at flip
```

或者使用 ATL 块形式：

```renpy
    camera:
        xalign 0.5
        rotate 180
```

camera 对整层应用 transform，是对旧式写法 `show layer master: blur 10` 的替代——后者仍能见到，但新项目建议使用 camera。关于 transform 与 ATL 的完整语法，本模块后续篇章会专门展开。

## 完整示例回顾

把本篇要点串起来，一个标准的开场大致是：

```renpy
    scene bg meadow
    with fade

    "After a short while, we reach the meadows."

    show sylvie green smile at right
    with dissolve

    "She turns to me and smiles."

    show sylvie green surprised

    "Silence."
```

背景淡入，立绘在右侧淡化登场，表情原地切换，全部只用了 scene、show 与 with 三样工具。

## 小结

- 图像名 = 标签 + 属性；标签是身份，同 tag 同时只能显示一张，show 新图自动替换旧图。
- images/ 目录自动扫描：文件名去扩展名、转小写即图像名，子目录名忽略；立绘用 PNG/WEBP/AVIF，背景可另用 JPG；@2 文件名提供超采样倍率。
- scene 清空图层再显示，是换背景与换场景的标准动作；show 显示或替换立绘；hide 仅在"角色离场而场景不变"时使用；官方明确不建议 hide 后紧跟 show 同一 tag。
- image 语句在文件顶层手动定义图像名，可绑定文件、纯色、Tile 等任意 displayable。
- with 播放转场：dissolve 交叉淡化、fade 黑屏淡入；一条 with 作用于其前面的多条语句；with None 更新上一屏快照实现分步转场；say 行尾可直接带 with 子句。
- 默认位置水平居中贴底；at 子句搭配 left、right、center、truecenter 摆位；as、behind、onlayer、zorder 与属性加减法（如 -happy）覆盖更复杂的构图需求；camera 语句对整层施加 transform，取代旧式 show layer 写法。

## 参考链接

- [显示图像（Displaying Images）](https://www.renpy.org/doc/html/displaying_images.html)
- [变换与动画（Transforms and ATL）](https://www.renpy.org/doc/html/transforms.html)
- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
