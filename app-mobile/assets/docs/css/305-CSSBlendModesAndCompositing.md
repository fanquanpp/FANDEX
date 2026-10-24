---
order: 330
title: 混合模式与合成（Blending and Compositing）
module: 'css'
category: 前端技术
difficulty: beginner
description: mix-blend-mode 与 background-blend-mode 的两套体系差异、isolation 裁剪混合范围、hover 单色化/反色标题/双色 duotone 三实战——图像与颜色合成的专篇
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---


## 知识点地图

- **知识类别**：CSS 合成与混合（Compositing and Blending）。260 渐变、
  310 滤镜都改变元素「自己长什么样」，本篇改变的是**元素与它下面
  的内容怎么相乘相加**——像素级的颜色运算。
- **解决什么问题**：不用修图就能实现单色化 hover、反色文字、双色
  海报、水印融合这类「上层与底层颜色互动」的效果；这类效果
  PS 里叫图层混合模式，CSS 里是同名的那 16 个关键字。
- **什么时候用到**：图片交互态（hover 变主色调）、文字压在复杂
  背景上的可读性处理、设计系统里的品牌色衍生、暗色模式下的
  图片降亮度。判断标志：效果需要「读取下层颜色」——滤镜做不到，
  混合模式才能。

## 真实场景：卡片 hover 单色化

素材库（本仓库扫描素材的「CSS 属性实战页」）里有一页黑白灰配色的
综合练习：linear-gradient 四向叠加 + rgba 半透明容器。把它推进
一步就是最常见的工程需求：作品集页面的图片卡片，hover 时整张图
染上品牌主色。三个候选方案：

1. 准备两张图切换（设计成本翻倍，色值不可维护）；
2. `filter: sepia + hue-rotate + saturate` 链（310 滤镜——能近但
   不准，色相环上兜圈子）；
3. **灰度图 + 品牌色叠加 `mix-blend-mode: screen`**（一张灰度图
   + 一行 CSS，色值直接用设计令牌）。

方案 3 的原理：screen 模式「底色与上色相乘后再归一」，黑（0）被
完全替换成上色、白（1）保持白——灰度图喂进去，出来就是主色调
单色图。**颜色完全由 CSS 变量控制，换主题色不用重新出图**，
这就是混合模式的工程价值。

## 1. 两套属性：元素混合与背景内混合

同一个混合模式关键字，用在两个不同的属性上，作用对象完全不同：

```css
/* A. 元素与「它下面的所有内容」混合 */
.badge {
  mix-blend-mode: multiply;
}

/* B. 同一个元素的「多层背景之间」互相混合 */
.banner {
  background-image: linear-gradient(rgba(52,152,219,.8), rgba(46,204,113,.8)),
                    url("photo.jpg");
  background-blend-mode: multiply;   /* 渐变层 x 照片层 */
}
```

**逐行讲解**：A 是「我这个元素作为一个整体，跟页面上盖在我下面
的东西做颜色运算」——参与运算的是整个元素（含文字与背景）；
B 是「我这个元素自己内部的多个背景层之间运算」——外界看不到
混合过程，只有结果。**换成别的写法会发生什么**：把 B 的效果用 A
实现需要两个叠加的元素 + 定位，DOM 与层级复杂度上升；把 A 的效果
用 B 实现则根本做不到（B 碰不到元素外面的世界）。选择依据只有
一条：**混合发生在「元素与外界」还是「元素内部」**。

16 个模式分三组（与 PS 同名同义）：

| 组 | 模式 | 直觉 |
| --- | --- | --- |
| 变暗系 | multiply / darken / color-burn | 结果趋向更暗；multiply 白色透明化 |
| 变亮系 | screen / lighten / color-dodge | 结果趋向更亮；screen 黑色透明化 |
| 对比/综合 | overlay / hard-light / soft-light / difference / exclusion / hue / saturation / color / luminosity | 中性灰上下翻转、反色、通道移植 |

记忆锚点：`multiply` 吃白色（白底去白）、`screen` 吃黑色（黑底去黑）
——「去底色抠图」的两个方向；`difference` 造反色（第 3.2 节）。

## 2. isolation：混合范围的围栏

`mix-blend-mode` 最反直觉的行为：它混合的是「下面的所有内容」，
包括预期外的祖先背景。

```html
<section style="background: linear-gradient(90deg,#3498db,#2ecc71)">
  <div class="card">               <!-- isolation: isolate -->
    <img src="cover.jpg" style="mix-blend-mode: screen">
    <h3>标题不被卷入混合</h3>
  </div>
</section>
```

```css
.card {
  isolation: isolate;  /* 混合只发生在 card 内部 */
}
```

**逐行讲解**：没有 `isolation` 时，img 的 screen 混合会穿透 card
把 section 的渐变背景也算进来——图与渐变相加，效果失控；
`isolation: isolate` 创建一个隔离组（实现上是创建层叠上下文，
联动 230-StackingContext），把混合范围围在 card 内部。
**易错点**：很多属性会「顺带」创建隔离组——`opacity < 1`、
`transform`、`filter`、`will-change` 都会。效果时灵时不灵，多半
是祖先上某个顺带属性改了隔离边界，查它的 computed style 而不是
怀疑浏览器。

## 3. 三个实战

### 3.1 图片 hover 单色化（screen 染色）

```css
.work-card {
  position: relative;
  --brand: #3498db;
}
.work-card img {
  filter: grayscale(1);          /* 先统一变灰度 */
  transition: filter .3s;
}
.work-card::after {              /* 主色层盖在图上 */
  content: "";
  position: absolute;
  inset: 0;
  background: var(--brand);
  mix-blend-mode: screen;        /* 灰度图 x 主色 = 主色调图 */
  opacity: 0;
  transition: opacity .3s;
}
.work-card:hover::after { opacity: 1; }
.work-card:hover img { filter: grayscale(1) contrast(1.05); }
```

**为什么 screen 而不是 multiply**：screen 吃黑色保白色，灰度图染
出来的主色调图明亮清晰；multiply 吃白色保黑色，得到的是暗调图。
同一段结构换一个关键字就是两种色调的 hover——**混合模式的选择
就是设计方向的选择**。伪元素方案（而非直接给 img 上混合）的好处：
文字等其他子元素不被卷入，无需额外 isolation。

### 3.2 反色标题（difference）

文字压在深浅不定的图片/动画背景上，白字可能消失黑字可能消失：

```css
.hero {
  background: linear-gradient(120deg, #111 0 50%, #eee 50% 100%); /* 黑白分界 */
}
.hero h1 {
  color: #fff;
  mix-blend-mode: difference;    /* 与下层求差：黑底变白、白底变黑 */
}
```

difference 的像素公式是 `|上层 - 下层|`：白字（255）压黑底（0）
得 255（白），压白底（255）得 0（黑）——**文字自动反色，永远
与背景形成最大对比**。分界线穿过文字时每个像素独立反色，形成
「劈开文字」的戏剧效果（营销页头图的常用招）。注意 difference
下的中间灰色不可读（255-128=127 反的还是 127），背景避免大面积
中灰。

### 3.3 双色 duotone 海报（background-blend-mode 双层渐变）

把素材页「黑白灰 + 渐变叠加」的练习升级为品牌 duotone：

```css
.poster {
  aspect-ratio: 3 / 4;
  background-image:
    linear-gradient(160deg, #3498db, #9b59b6),  /* 上层：双色渐变 */
    url("portrait.jpg");                          /* 下层：原图 */
  background-size: cover;
  background-blend-mode: luminosity;  /* 取渐变的色相饱和度 + 照片的明度 */
  filter: contrast(1.1) saturate(1.2); /* 310 滤镜收尾微调 */
}
```

**逐行讲解**：luminosity 模式取「上层的色相与饱和度 + 下层的明度」
——照片的明暗结构保留，颜色整体替换成渐变的品牌色系，一张图
零修图变海报。两个渐变色就是设计令牌里的 `--brand-primary` 与
`--brand-secondary`，主题色一换海报色系跟着换。
**换成 hue 模式**：保留照片自身明度与饱和度、只借渐变的色相，
效果更接近原片调色而非 duotone——四通道移植类模式（hue/saturation/
color/luminosity）的选择就是「借对方什么」的选择。

## 4. 性能与 230 的联动

- 混合模式把元素从常规绘制路径引入合成器路径，效果层（大面积图 +
  混合）在低端设备上可能掉帧——列表页大量 hover 单色化时，
  用 `@media (prefers-reduced-transparency)` 或断点降级（540 性能篇
  的分层策略）；
- `isolation: isolate` 与层叠上下文的创建机制相同——为一个混合
  范围建 isolate 时，也会改变该子树内 z-index 的比较范围，
  两者一起 review。

## 常见陷阱与调试

- **坑 1：混合「消失」。** 九成是某个祖先意外创建了隔离组
  （opacity/transform/filter），把混合圈在了更小的范围。排查：
  DevTools 里逐层看 computed 的 `isolation` 与会创建上下文的属性。
- **坑 2：`background-blend-mode` 没效果。** 它混合的是「同一元素
  的多个背景层」——只有一个 background-image 时无事可做。至少
  两层（渐变 + 图或图 + 图）才有意义。
- **坑 3：文字跟着图一起被混。** mix-blend-mode 作用于整个元素——
  图和文字在同一个元素里时文字也参与运算。拆层（图一层、文字
  一层）或给容器 isolation。
- **坑 4：difference 遇上中灰背景。** 反差坍缩不可读，设计阶段
  就用取色器确认背景明度分布，或改用 exclusion（更柔和的反色）。
- **坑 5：打印/PDF 导出色差。** 混合模式在打印路径的支持不完整，
  正式物料输出前用真实打印路径验证，别只看屏幕截图。

## 动手实践

**任务**：用素材页的「黑白灰 + 斜纹」配色基底，做一个含三种混合
效果的卡片组件，全部效果不许改图片文件。

1. 灰度人像图 hover 后变成品牌色单色（screen 方案）；
2. 标题压在「黑白分界」背景上用 difference 自动反色；
3. 底部缩略条用 background-blend-mode 做 duotone；
4. 给卡片加 `isolation: isolate`，故意删掉它观察第 1 个效果的
   失控方式；
5. 依次把 screen 换成 multiply、difference 换成 exclusion，
   截图对比并各写一句适用场景。

**提示**：黑白分界背景用
`linear-gradient(90deg, #111 0 50%, #ddd 50% 100%)`，让分界线
正好穿过标题；screen 层用 `inset: 0` 的伪元素而不是改 img 本身；
删 isolation 前先给 section 一个彩色渐变背景，失控现象才明显。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui; background: #111; padding: 2rem; }
    .stage {
      background: repeating-linear-gradient(45deg, #222 0 20px, #333 20px 40px);
      padding: 2rem;
    }
    .card {
      max-width: 420px;
      isolation: isolate;                /* 坑 4 验证点：注释掉看失控 */
      --brand: #3498db;
    }
    .photo-wrap { position: relative; }
    .photo-wrap img {
      display: block; width: 100%;
      filter: grayscale(1);
    }
    .photo-wrap::after {
      content: ""; position: absolute; inset: 0;
      background: var(--brand);
      mix-blend-mode: screen;            /* 换 multiply 对比 */
      opacity: 0; transition: opacity .3s;
    }
    .card:hover .photo-wrap::after { opacity: 1; }
    .split-title {
      background: linear-gradient(90deg, #111 0 50%, #ddd 50% 100%);
      padding: 1rem;
    }
    .split-title h3 {
      margin: 0; color: #fff;
      mix-blend-mode: difference;        /* 换 exclusion 对比 */
    }
    .thumbs {
      display: flex; gap: .5rem; margin-top: 1rem;
    }
    .thumbs div {
      flex: 1; aspect-ratio: 1;
      background-image:
        linear-gradient(160deg, #3498db, #9b59b6),
        url("https://picsum.photos/120");
      background-size: cover;
      background-blend-mode: luminosity;
    }
  </style>
</head>
<body>
  <div class="stage">
    <div class="card">
      <div class="photo-wrap">
        <img src="https://picsum.photos/420/280?grayscale" alt="作品图">
      </div>
      <div class="split-title"><h3>BLEND ME</h3></div>
      <div class="thumbs"><div></div><div></div><div></div></div>
    </div>
  </div>
</body>
</html>
```

**逐段讲解**：`.stage` 复刻素材页的斜纹背景，故意做成「卡片外
有强背景」，删掉 `isolation` 后 hover 染色会与斜纹相加——第 4 步
的失控就是把「isolation 是混合围栏」从概念变成目视证据；
`.split-title` 的分界线固定在 50%，标题在正中时左右两半反色方向
不同，difference 的逐像素运算一目了然；`.thumbs` 用远程占位图
演示双层背景的 luminosity——把渐变两个色值改成黑白灰（素材页
的配色）观察「duotone 变灰调」，验证色相全部来自渐变层这一机制。

</details>

## 参考与致谢

- MDN：mix-blend-mode 与 background-blend-mode
  （https://developer.mozilla.org/docs/Web/CSS/mix-blend-mode ，CC-BY-SA 2.5）
- CSS Compositing and Blending Level 1 规范
  （https://drafts.fxtf.org/compositing-1/ ，W3C 文档许可）
- 配色基底素材：本仓库扫描素材「CSS 属性实战页」（黑白灰 +
  linear-gradient 多层叠加综合练习）
