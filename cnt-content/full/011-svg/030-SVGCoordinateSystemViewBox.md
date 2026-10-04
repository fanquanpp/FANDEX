---
order: 30
title: "坐标系与 viewBox：一张取景框管住所有尺寸"
module: 'svg'
category: 前端技术
difficulty: beginner
description: "以「100x100 的画布怎么装进 48x48 的按钮」引入，讲透视口与 viewBox 的分工、preserveAspectRatio 的 meet/slice 对照、y 轴向下与数学坐标的差异，附图标失真的排查实录。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'svg/020-SVGBasicSyntaxDocStructure'
  - 'svg/040-SVGBasicShapeDetailed'
  - 'svg/090-SVGTransform'
  - 'html5/140-ImagesAndResponsiveImages'
prerequisites:
  - 'svg/020-SVGBasicSyntaxDocStructure'
---

## 前置知识

- 已完成 [SVG 文档结构](/svg/020-SVGBasicSyntaxDocStructure)：会 defs/use 复用、知道 xmlns 的作用。

## 学习目标

读完本文你将能够：

1. 区分「视口」与「viewBox」两个坐标系，并解释图标失真的根源；
2. 用 viewBox 一行代码让任意尺寸画布等比缩放适配任意容器；
3. 预测 preserveAspectRatio 的 meet 与 slice 在不同宽高比容器里的表现；
4. 解释 y 轴为什么向下，并在写形状时不再犯方向错误。

预计 45 到 60 分钟。viewBox 是 SVG 最容易翻车也最有威力的概念，值得慢读。

## 1. 你现在要解决什么问题

设计稿里的图标按 100x100 画好，按钮只有 48x48——直接改 width/height，图形被裁掉一半。痛点根源：你把「画布内容多大」和「屏幕显示多大」搅在一起了。SVG 用两个独立坐标系解决：**视口**（viewport：屏幕上占多大地方）与 **viewBox**（取景框：描述「画布坐标系里看哪一块」）。理解它们的分工，图标失真问题从根上消失。

## 2. 最小可运行示例：一行代码任意缩放

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"
     width="48" height="48">
  <circle cx="50" cy="50" r="40" fill="#39C5BB" />
</svg>
```

预期效果：浏览器窗口里出现一枚 48x48 的圆。**关键在于：形状的坐标完全按 100x100 写，显示尺寸由 width/height 决定**——viewBox 声明「内容坐标系是 0,0 到 100,100」，浏览器自动把这个坐标系整体缩放进 48x48 的视口。同一份文件把 width/height 改成 480x480，图形完美放大，一个坐标都不用改。

## 3. 发生了什么：两个坐标系与一个缩放

- **视口坐标系**：`width`/`height` 决定，单位是屏幕像素——回答「占多大地方」；
- **用户坐标系**：`viewBox="minX minY width height"` 决定——回答「内容的坐标怎么算」。例子里所有坐标都按 0-100 书写；
- 浏览器把用户坐标系「取景、缩放、平移」进视口。改 viewBox 的 minX/minY 就是在移动取景框（平移效果），改 width/height 就是在变焦。

再看 y 轴：**SVG 的原点在左上角，y 轴向下**——与数学课本的坐标系相反。写 `cy="10"` 的圆永远偏上，不是偏下；做图表时所有「向上」的量都要用减法换算。

## 4. 核心概念：preserveAspectRatio 的两种脾气

当视口宽高比与 viewBox 宽高比不一致时（如 48x48 的框装 100x50 的内容），`preserveAspectRatio` 决定谁让步：

| 取值 | 行为 | 效果 |
| --- | --- | --- |
| `xMidYMid meet`（默认） | 完整显示内容，短边留白 | 不裁切、可能留边 |
| `xMidYMid slice` | 撑满视口，长边溢出裁切 | 不留边、可能裁切 |

实验：用 200x100 的视口装 `viewBox="0 0 100 100"` 的圆——默认 meet 时圆完整但左右留白；改为 slice 后圆撑满高度、左右被裁。图标工程的经验值：**图标用默认 meet 保完整；海报类整图用 slice 保构图**。

## 5. 调试实录：图标失真的三步排查

现象：按钮里的图标被压扁或裁掉一角。

1. 查 viewBox 是否存在：没有 viewBox 的 svg，改 width/height 时内容**不会缩放**（用户坐标系与像素 1:1 绑定），只会露出更多/更少的画布——这是「图标失真」的第一嫌疑人；
2. 查宽高比：viewBox 与 width/height 的宽高比不一致而未声明 preserveAspectRatio 意图——按默认 meet 观察是否留白超出预期；
3. 查容器：CSS 给 svg 元素设了 `width: 100%` 而 viewBox 又是正方形——容器非正方形时按 meet 必然留白。

修法统一：**viewBox 按设计稿比例写，width/height 或 CSS 控制实际占位，preserveAspectRatio 显式声明**——三者职责分明后，缩放永远等比。

## 6. 修改实验

1. 把示例的 viewBox 改成 `"20 20 60 60"`：预测取景框向右下平移后圆还剩多少可见，验证；
2. 保持 viewBox 不变，把 width 改为 96、height 改为 48，观察默认 meet 的留白；再改 `preserveAspectRatio="xMidYMid slice"` 对比裁切方向；
3. 在 020 篇的六枚圆点文件上只加 viewBox（内容坐标 0-220x60）与 width="110" height="30"，实现整图减半——零坐标改动。

## 7. 小练习

预测题：`viewBox="0 0 100 50"` 配 `width="100" height="100"` 与默认 preserveAspectRatio，一个 `cx="50" cy="25" r="20"` 的圆显示在哪？左右留白各多少？

修改题：把挑战题（020 篇）的三枚图标文件加上 `viewBox="0 0 140 40"`，使其在任意宽度按钮里等比居中。

修 Bug 题：设计师给的图标文件 viewBox="0 0 24 24"，但前端按 40x64 的按钮位展示时上下被裁——指出 slice 引擎与 meet 引擎各自的结果，并给出「完整显示且尽量大」的参数组合。

挑战题（不看提示）：用一张 svg 实现「同一文件在 16x16 favicon 与 512x512 应用图标两种场景下都完美」——要求：内容坐标 0-100、显式 viewBox、说明两处的 width/height 取值，并解释为什么内容坐标一个字都不用改。

先自己算或动手验证，再展开参考答案对照：

<details>
<summary>参考答案（先自己算，再展开对照）</summary>

预测题：meet 的缩放系数取 min(100/100, 100/50) = 1，内容以原始 100x50 尺寸放进视口；xMidYMid 使其水平占满、垂直居中。所以圆心显示在视口正中 (50, 50)，半径 20px；**左右留白为 0，上下各留白 25**。若你算出「左右留白」，多半是把 meet 的系数取成了 max——那是 slice 的规则。

修改题：在根元素加 `viewBox="0 0 140 40"`（与三个 40x40 格加间距的总内容范围一致），删掉或保留 width/height 交给 CSS 控制即可。按钮任意宽度时，浏览器按 meet 等比缩放整幅内容并居中——加 viewBox 前后内容坐标零改动，这就是第 2 节「一行代码任意缩放」的复用。

修 Bug 题：视口 40x64（5:8），viewBox 24x24（1:1）。slice 引擎：系数取 max(40/24, 64/24) = 8/3，内容放大到 64x64，左右各裁掉 12px——「上下被裁」的现场其实是横向溢出后的裁切（或按钮位再窄时纵向裁切，机理相同）。meet 引擎：系数取 min = 5/3，内容 40x40 完整居中，上下各留 12px 白。「完整显示且尽量大」：显式写 `preserveAspectRatio="xMidYMid meet"`；若按钮位允许，把展示容器改成 40x40 正方形，留白彻底消失——修参不如修容器。

挑战题：文件写 `<svg xmlns="..." viewBox="0 0 100 100" width="16" height="16">`，favicon 场景直接用；应用图标场景同一份文件把 width/height 改为 512。内容坐标一个字不改的原因：viewBox 把「内容坐标系」与「显示尺寸」解耦了，width/height 只是每次使用时声明取景结果投到多大的屏幕区域——这正是第 3 节两个坐标系分工的最终回报。

</details>

## 8. 什么时候应该 / 不应该动 viewBox

应该：需要内容平移或变焦（放大局部、镜头跟随）；同一图形适配多种容器尺寸；制作响应式插画。

不应该：只改显示尺寸时去改 viewBox（那是 width/height 的职责）；用负值 minX 制造「出界」效果而不理解内容仍在坐标系内（调试困难）。

## 9. 与之前和之后的知识的关系

- 往前：020 的元素树终于有了「以什么比例呈现」的总开关；
- 往后：040 的形状属性（圆角、描边）在正确的坐标系里才有意义；090 的 transform 与 viewBox 是两套独立变换（先 viewBox 后 transform 的叠加顺序）；
- 更远：响应式图标、自适应图表、地图缩放——全部是「视口 + 取景框」这一对概念的产品化。

## 10. 官方文档

- MDN：SVG 坐标系与 viewBox：https://developer.mozilla.org/zh-CN/docs/Web/SVG/Attribute/viewBox
- MDN：preserveAspectRatio：https://developer.mozilla.org/zh-CN/docs/Web/SVG/Attribute/preserveAspectRatio

## 11. 自我检查

- 能一句话区分视口与 viewBox；
- 能预测 meet/slice 在三种宽高比容器里的表现；
- 能解释「为什么改了内容坐标一个字，显示就能任意缩放」；
- 已完成失真排查的三步流程并修好一个真实案例。

## 本章总结

视口管占位，viewBox 管坐标系，preserveAspectRatio 管不一致时的让步方式——三者职责分离后，「一份图形、任意尺寸」成为一行属性的免费午餐。y 轴向下与取景框思想是后续所有 SVG 变换的地基。

## 下一步

进入 [基本形状详解](/svg/040-SVGBasicShapeDetailed)：六件套各自的完整属性与组合技巧。
