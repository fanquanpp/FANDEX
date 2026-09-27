---
order: 700
title: transform 与 3D 变换：让卡片抬起、翻转而不卡顿
module: 'css'
category: 前端技术
difficulty: beginner
description: 从「hover 时卡片轻轻抬起」出发，讲透 translate/scale/rotate/skew 一族函数与 transform-origin，用 perspective、preserve-3d、backface-visibility 搭出最小 3D 翻转卡，弄清 transform 只动合成层的性能真相，并学会配合 transition 做出丝滑过渡。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'css/330-CSSAnimationTransition'
  - 'css/220-PositionDetailed'
  - 'css/230-StackingContext'
  - 'css/540-CSSPerformanceOptimizationDetailed'
prerequisites:
  - 'css/050-CSS3BoxModelDetailed'
  - 'css/110-CSSValuesAndUnits'
---

## 前置知识

- 已完成 [CSS3 盒模型详解](/css/050-CSS3BoxModelDetailed)：知道每个元素是一块盒子；会用 `:hover`（伪类全家福在第 140 篇，本文只用这一个）；
- 建议先读 [CSS 值与单位深入](/css/110-CSSValuesAndUnits)：本文会出现 px、%、deg 三种值，没读过也行，首次出现都有交代。

## 学习目标

读完本文你将能够：

1. 用 `transform: translateY` 配合 transition 写出 hover 时轻轻抬起的卡片，并解释为什么不用 margin-top；
2. 说出 transform 函数链按书写顺序依次生效，预测交换顺序后的不同落点；
3. 用 transform-origin 解释同一个 rotate 为什么能绕中心转、也能绕角转；
4. 独立写出最小 3D 翻转卡，说清 perspective、preserve-3d、backface-visibility 各管什么；
5. 复述「transform 只动合成层」的原理与 fixed 失效副作用。

预计 40 到 60 分钟。

## 1. 问题引入：hover 时卡片轻轻抬起

游戏库里一排游戏卡，想要最常见的微交互：鼠标移上去，卡片轻轻上浮几像素，移开后落回。第一反应多半是改布局属性：`margin-top: -8px`？卡片上去了，下方元素整个被顶上来一截，整页跟着抖。`position: relative` 加 `top: -8px`？下方元素不顶了，但移入移出是生硬的瞬间跳动，没有过渡。

要同时解决两件事：位移不能惊动布局——transform 的本职；平滑过渡——transition 的本职。位移、缩放、旋转、倾斜全归 transform 管，浏览器还为它单独开了性能通道。本文先玩熟 2D，再搭 3D 翻转卡，最后揭开不卡顿的底。

## 2. 最小示例：一张会抬起的卡片

新建文件夹 `transform-experiment`，放两个文件。`index.html` 沿用第 010 篇的页面骨架，body 里放一张卡片：`<div class="card">` 内含 `<h3>跳跳岛</h3>` 与一句 `<p>` 简介。

`styles.css`：

```css
.card {
  width: 260px;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
  transition: transform 0.25s ease;
}

.card:hover {
  transform: translateY(-8px);
}
```

预期动效：鼠标移入，卡片在 0.25 秒内平滑上浮 8px；移出，原路落回，页面其余部分纹丝不动。三处关键：`translateY(-8px)` 沿 Y 轴向上平移 8px（Y 轴向下为正，负值向上）；`transition: transform 0.25s ease` 表示「transform 的变化用 0.25 秒平滑完成」（第 330 篇）；transform 的位移不占布局空间，下方元素全程静止——这正是它替代 margin 的原因。

## 3. 核心概念：变换一族

### 3.1 基础函数、链式顺序与变换中心

四个 2D 基础函数：`translateX/Y` 位移、`scale` 缩放（1 为原大，0.5 缩半）、`rotate` 旋转（单位 deg，正值顺时针）、`skew` 倾斜。一个 transform 可以挂多个函数，空格隔开，从左到右依次生效：hover 规则改成 `transform: translateY(-8px) scale(1.03)`，预期动效是抬起的同时轻微放大 3%，像卡片向你凑近了一点。

顺序有讲究：后一个函数在前一个建立的新坐标系里执行。`rotate(45deg) translateX(60px)` 先转 45 度再沿「已转向的 X 轴」走，卡片斜着飞出去；`translateX(60px) rotate(45deg)` 先水平移再原地转，落点在正右方。

transform-origin 决定变换中心点，默认 `center`。同一句 `rotate(10deg)`，origin 在中心时卡片原地自转；改成 `transform-origin: bottom left` 后，卡片像被左下角钉住、绕着那个角摆动。

## 4. 最小 3D：翻转卡

2D 在平面内活动；3D 多了第三根轴——Z 轴，指向屏幕外你的脸。最小翻转卡：移入时卡片绕竖直轴翻转半圈，露出背面情报。结构三层：容器 `.flip-card`、翻转层 `.flip-inner`、两个面 `.face`：

```html
<div class="flip-card">
  <div class="flip-inner">
    <div class="face front">史莱姆 · 图鉴卡</div>
    <div class="face back">HP 30 · 弱点：火</div>
  </div>
</div>
```

```css
.flip-card {
  width: 240px;
  height: 150px;
  perspective: 800px;
}

.flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s;
}

.flip-card:hover .flip-inner {
  transform: rotateY(180deg);
}

.face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  backface-visibility: hidden;
}

.front { background: #2563eb; }

.back {
  background: #dc2626;
  transform: rotateY(180deg);
}
```

预期动效：移入后卡片绕竖直中轴立体翻转——左右边缘有近大远小的透视感，不是纸片平移——停在红色背面「HP 30 · 弱点：火」；移出翻回正面。`inset: 0` 是「四条边贴到父容器边界」的定位简写（第 220 篇）。

三件套各自的职责：

- `perspective: 800px` 挂在父容器上，制造「观察者到屏幕」的景深：数值越小透视越夸张，越大越平缓。它只对子元素生效——写在被翻转元素自己身上毫无作用（第 7 节实录二）；`translateZ(20px)` 则让元素朝脸的方向移动，但效果完全依赖这份景深——删掉 perspective，位移肉眼不可见；
- `transform-style: preserve-3d` 挂在翻转层上，让子元素保持 3D 空间关系。不写它，两面被压扁到同一平面；
- `backface-visibility: hidden` 挂在每个面上：元素背对观察者时整面隐藏。背面的 `rotateY(180deg)` 让它天生背对——正面朝你时它隐身，翻过去后它正脸朝你，两半拼成一次完整翻转。

## 5. 性能真相：为什么动 transform 不卡

浏览器从「拿到新样式」到「画出像素」是三段流水线：重排（layout）、重绘（paint）、合成（composite），一段比一段便宜。改 top/left/margin 这类布局属性，每帧触发三段全家桶，动画一多就掉帧；动 transform（和 opacity），布局与绘制原地不动，浏览器只把卡片所在的层交给合成器挪位置，由 GPU 出图，足以稳定 60 帧。

当场验证：DevTools 的 Rendering 面板勾选 Paint flashing，各做一个用 top 与用 transform 位移的动画——动 top 时整页大片闪绿（正在重绘），动 transform 时基本只有卡片闪绿；Performance 录制里，top 动画的帧挤满紫色 Layout 条，transform 的帧几乎只剩合成。

两条推论：transform 只是视觉搬家，**不改变文档流**，需要「真的腾出位置」时替代不了布局属性；它还会**创建包含块**——卡片有了 transform 后，内部 `position: fixed` 的后代改为相对这张卡定位（第 220 篇与第 230 篇）。

## 6. 修改实验

对第 2 节的抬卡实验动手，每步先预测再刷新：

1. `translateY(-8px)` 改成 `-20px`：幅度变大；改成 `8px`（正值）：卡片向下沉；
2. hover 规则追加 `scale(1.05)`：抬起兼放大；把 `transform-origin` 改成 `bottom center` 再试：卡片像从脚底向上「长」，顶端动得更多；
3. transform 链末尾追加 `rotate(-1deg)`：抬起时微微左倾；
4. transition 的 `0.25s` 改成 `0.8s`、`ease` 改成 `linear`：抬升变得迟缓而机械（第 330 篇）。

## 7. 常见错误与调试实录

错误一：链式顺序想反，位移方向跑偏。写了 `transform: rotate(90deg) translateX(80px)`，预期「向右移 80px 再转 90 度」，实际卡片跑到正下方——rotate 先把坐标系转了 90 度，translateX 沿着已经朝下的 X 轴走。排查：把链拆成单函数逐个上，每加一个看一眼落点。

错误二：perspective 写错位置，翻转变成纸片平移。把 `perspective: 800px` 写在 `.flip-inner`（被翻转的元素）上，翻转照样发生，但毫无立体感。原因：perspective 属性只对子元素生效，对自身无效。修复：挪到父容器 `.flip-card`。

错误三：背面透出来，翻转中看到镜像文字。翻转进行到一半，正面文字的镜像与背面文字叠在一起闪现——`.face` 忘写 `backface-visibility: hidden`，每个面背对时依然可见。排查：两个面都有这条声明、拼写没错（少字母的声明会被整条划掉）、`.back` 自带 `rotateY(180deg)`，缺一条就露馅。

错误四：fixed 元素突然「装进」卡片。卡片里的 `position: fixed` 分享按钮，在卡片加了 transform 后改为相对卡片定位——transform 会成为 fixed 后代的包含块。处理：挪出该祖先，或去掉那个 transform（第 220 篇）。

## 8. 实际场景

- 微交互三件套：卡片 hover 抬起、按钮按下 `scale(0.97)` 的手感、图标 hover 轻微 rotate，全是 transform 加 transition 十行以内的活；
- 模态框入场：opacity 从 0 到 1 配 `translateY(20px)` 到 0，「浮上来」比「闪现」高级一个档次；
- 翻转卡：图鉴卡、问答卡、抽奖转盘，第 4 节的模板直接套；
- 何时不用：需要周围元素让位的真实移动走布局方案；循环播放的复杂编排交给第 330 篇的 @keyframes；大面积 3D 在移动端注意电量。

## 9. 小练习

预测题（5 分钟）：两个同款 div，hover 时分别应用 `transform: rotate(90deg) translateX(80px)` 与 `transform: translateX(80px) rotate(90deg)`。先预测两者的最终落点再实测。

答案（写完再对照）：第一个停在正下方 80px——先转 90 度，X 轴已指向下；第二个停在正右方 80px——先平移再原地旋转。两者朝向都转了 90 度，落点不同。

修 Bug 题（10 分钟）：把第 4 节的翻转卡抄到本地，它被人改了两处：`perspective: 800px` 的位置被挪过，`.face` 里还有一条声明拼错了。症状是「翻转毫无立体感」且「翻转中途看到镜像文字与背面重叠」。先用 F12 找出被划线与挂错位置的声明，对照三件套清单修复；验收：翻转有透视感，全程无镜像文字。

挑战题（半小时，不看正文独立完成）：用六个面做一个 CSS 3D 立方体骰子。验收：六个面各印 1 到 6，用 absolute 定位叠在容器中心，再用 transform 组合转到对应方位（提示：每个面先 `rotateX/rotateY` 转向再 `translateZ(60px)` 推出去）；容器有 perspective、中间层 preserve-3d；加载时同时可见三个面；hover 时整体再转 90 度平滑过渡；全程看不到镜像数字。

## 10. 与之前和之后的知识的关系

- 之前：[CSS3 盒模型详解](/css/050-CSS3BoxModelDetailed) 的盒子是 transform 的作用对象，「transform 不占布局空间」要对照盒模型体会；[CSS Grid 快速上手](/css/690-GridQuickStart) 的网格卡片正是本文动效的最佳宿主；
- 之后：[CSS 动画与过渡](/css/330-CSSAnimationTransition) 把一行 transition 升级成关键帧动画系统；[定位详解](/css/220-PositionDetailed) 解释 transform 与 fixed 的包含块纠葛；[层叠上下文](/css/230-StackingContext) 解释 transform 元素为何能盖住别人；[CSS 性能优化详解](/css/540-CSSPerformanceOptimizationDetailed) 展开合成层原理。

## 11. 官方文档

- MDN transform 属性参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/transform
- MDN「使用 CSS 变换」教程：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_transforms/Using_CSS_transforms

## 12. 自我检查

- 能默写抬卡的核心四行，并说清为什么不用 margin-top；
- 能预测 transform 链交换顺序后的落点差异，说清「先转后走」与「先走后转」；
- 能解释 perspective 为什么挂在父容器、preserve-3d 缺了会怎样、backface-visibility 管什么；
- 能复述三段流水线里 transform 跳过了哪两段与 fixed 失效副作用。

## 本章总结

transform 是一族不改布局的视觉变换：translate 位移、scale 缩放、rotate 旋转、skew 倾斜，按书写顺序依次作用，transform-origin 是共用的钉子。它不占文档流、动画只走合成层（GPU 出图），配 transition 是网页微交互的标准姿势。3D 三件套：父容器 perspective 给景深，翻转层 preserve-3d 保立体，两个面 backface-visibility: hidden 各管一面。副作用记两条：会创建层叠上下文，会成为 fixed 后代的包含块。

## 下一步

下一篇进入 [CSS @scope 规则](/css/710-ScopeAtRule)；想深挖动效，可跳进 [CSS 动画与过渡](/css/330-CSSAnimationTransition)，把 0.25 秒过渡升级成完整动画系统。
