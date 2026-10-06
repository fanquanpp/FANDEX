---
order: 560
title: 字体加载
module: 'css'
category: 前端技术
difficulty: intermediate
description: "@font-face、font-display 与字体加载策略，兼顾品牌字体与首屏性能。"
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/490-TypeScaleAndSpacingTokens'
  - 'css/540-CSSPerformanceOptimizationDetailed'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 知识点地图

- **知识类别**：字体加载（@font-face 机制、font-display 策略、
  预加载与子集化）。
- **解决什么问题**：品牌字体（动辄数 MB）与首屏性能的冲突——
  什么时候闪、闪多久、闪成什么样。
- **什么时候用到**：任何自定义字体的站点；FANDEX 文档站的中文字体
  子集化（仓库 CHANGELOG 记录的 17.77MB -> 0.63MB 案例）是真实参照。

## 0. 直觉：网页字体是“下载来的”

系统字体（Arial、微软雅黑）随操作系统自带；品牌字体（如思源黑体、自定义字库）需要从服务器下载。`@font-face` 就是“字体说明书”：告诉浏览器字体文件在哪、叫什么名字、属于哪种字重。

字体加载有个经典问题：字体没下载完时，文字可能“隐形”（FOIT）。`font-display: swap` 就是解决方案——先用系统字体显示，字体就绪后再切换。

## 1. 核心用法

### 1.1 @font-face 基本语法

```css
@font-face {
  font-family: "MyFont";
  src: url("myfont.woff2") format("woff2"),
       url("myfont.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: "MyFont", system-ui, sans-serif;
}
```

**讲解：**

- `font-family` 是给字体起的名字，供后续 `font-family` 引用；
- `src` 列出字体文件，现代浏览器优先 `woff2`（体积最小）；
- `font-weight`/`font-style` 声明这份文件对应的字重与样式；
- 多个字重需要多个 `@font-face` 块（400/700 各一份）。

### 1.2 font-display 四种策略

```css
@font-face {
  font-family: "MyFont";
  src: url("myfont.woff2") format("woff2");
  font-display: swap;      /* 先用系统字体，加载完再换（推荐） */
  /* font-display: block;  */  /* 等待期文字隐藏（FOIT） */
  /* font-display: fallback; */ /* 短等待 + 3 秒内不换 */
  /* font-display: optional; */ /* 极短等待，慢网络直接不换 */
}
```

**讲解：** `swap` 是平衡“品牌一致性”与“可读性”的默认选择；`optional` 对弱网最友好（加载太慢就放弃字体）；`block` 会延迟文字显示，不推荐用于正文。

### 1.3 预加载与性能

```html
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />
```

**讲解：** `preload` 让字体在 CSS 解析前就开始下载，减少文字切换延迟；`crossorigin` 必须带上，否则字体请求可能被 CORS 拦截。字体子集化（只打包用到的字符）能进一步减小体积。

## 2. 动手试试

1. 下载一个开源字体（如思源黑体子集），用 `@font-face` 注册并应用到标题；
2. 对比 `font-display: swap` 与 `block` 在慢速网络下的文字表现（Network 面板限速）；
3. 给字体加 `preload`，观察首屏文字出现时间；
4. 进阶挑战：用 `unicode-range` 做字体子集拆分。

## 3. 核心知识点

> 一句话记住字体加载：`@font-face` 注册字体文件，`font-display: swap` 防隐形文字，`preload` 提前下载，`woff2` 体积最小。

- `@font-face`：`font-family` + `src` + 字重/样式声明；
- 多字重需要多个 `@font-face` 块；
- `font-display`：`swap` 推荐、`block` 会隐形、`optional` 弱网友好；
- `preload` + `crossorigin` 提前下载字体；
- `woff2` 是体积最小的现代格式；
- `unicode-range` 可按字符集拆分，减小加载量；
- 提供系统字体回退：`font-family: "MyFont", system-ui, sans-serif`。

## 4. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记 `font-display` | 文字隐形（FOIT） | 使用 `font-display: swap` |
| 只加载一种字重 | 加粗时浏览器伪造 | 注册 400/700 两份字体 |
| 字体文件过大 | 首屏变慢 | 子集化 + `woff2` + `unicode-range` |
| preload 缺 `crossorigin` | 字体被 CORS 拦截 | 补上 `crossorigin` 属性 |
| 无系统字体回退 | 字体加载失败页面难看 | 回退链：自定义字体 → system-ui → sans-serif |

## 5. 扩展学习

- 排版体系：`css/490-TypeScaleAndSpacingTokens`；
- 性能：`css/540-CSSPerformanceOptimizationDetailed`、`html5/380-CriticalRenderingPathAndResourceLoading`；
- 字体格式：woff2/woff/ttf 的兼容矩阵；
- 字体转换工具：Font Squirrel Webfont Generator（生成多格式并子集化）、Google Fonts CSS2 API 的子集参数；
- 资源预加载：`html5/020-HTML5OverviewCoreFeature` 的 preload 章节。

## 动手实践

**任务**：给一个标题页配三档字体加载策略，用 DevTools 的 Network
面板与节流对比三者首屏表现。

1. 基线：`font-display: block`（阻塞 3 秒，闪白屏）；
2. 主流：`font-display: swap` + `<link rel="preload" as="font">`
   （先见系统字、字体到了再换）；
3. 进阶：`size-adjust` 与 `ascent-override` 对齐系统字与品牌字的
   度量（消除换字时的布局跳动）。

**提示**：`size-adjust` 是百分比（品牌字相对系统字的字号缩放），
`ascent-override` 用 `normal` 的百分数微调；对比时开 DevTools
Performance 的 Layout Shift 轨道，CLS 值是量化判据。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```css
@font-face {
  font-family: "Brand";
  src: url("brand-subset.woff2") format("woff2");
  font-display: swap;                 /* 策略 2：先见字再换字 */
  size-adjust: 105%;                  /* 品牌字偏小则放大对齐 */
  ascent-override: 90%;               /* 微调上伸部对齐基线 */
}
h1 {
  font-family: Brand, system-ui, sans-serif;
}
```

```html
<link rel="preload" href="/fonts/brand-subset.woff2"
      as="font" type="font/woff2" crossorigin>
```

**逐行讲解**：`swap` 的语义是「后备字先渲染、品牌字就绪后交换」，
FOIT（闪白）变成 FOUT（闪换字）；`crossorigin` 必须写——即使同源，
字体预加载的 fetch 模式是 anonymous，漏写会导致双重下载；
`size-adjust: 105%` 的调法：先不写它看 swap 瞬间的跳变方向，字变小
就调大百分比重试，配合 Layout Shift 轨道归零为准。子集化工具链
（unicode-range 分包或 pyftsubset）见扩展学习。

</details>
