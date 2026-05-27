# 传统布局技术 (Traditional Layouts)
 False
 False> @Version: v4.0.0
 False> @Module: CSS06-布局与定位
 False
 False> @Author: Anonymous
 False> @Category: CSS Basics
 False> @Description: 浮动布局、定位、清除浮动及 Legacy 浏览器兼容方案。 | Float, positioning, clear-fix, and legacy solutions.
 False
 False---
 False
 False## 目录
 False
 False1. [浮动布局](#浮动布局)
 False2. [定位系统](#定位系统)
 False3. [BFC（块格式化上下文）](#bfc块格式化上下文)
 False4. [传统经典布局](#传统经典布局)
 False5. [居中方案汇总](#居中方案汇总)
 False6. [总结](#总结)
 False
 False---
 False
 False## 1. 浮动布局 (Float)
 False
 False### 1.1 浮动基础
 False
 False浮动最初是为图文环绕设计的，后来被广泛用于布局。元素设置 `float` 后会脱离文档流，向指定方向靠拢，直到碰到容器边缘或另一个浮动元素。
 False
```css
 True.float-left { float: left; }
 True.float-right { float: right; }
 True```

```html
 True<div class="container">
 True <div class="float-left" style="width:100px;height:100px;background:#e74c3c;">A</div>
 True <div class="float-left" style="width:100px;height:100px;background:#3498db;">B</div>
 True <p>这段文字会环绕在浮动元素旁边……</p>
 True</div>
 True```

 False> **效果图描述**：两个色块 A（红）、B（蓝）并排靠左，文字在右侧环绕排列。
 False
 False### 1.2 浮动的副作用——高度塌陷
 False
 False当子元素全部浮动时，父容器无法感知子元素高度，导致"高度塌陷"：
 False
```css
 True.parent {
 True border: 2px solid #333;
 True /* 没有设置 height，子元素浮动后父元素高度为 0 */
 True}
 True.child {
 True float: left;
 True width: 100px;
 True height: 100px;
 True}
 True```

```html
 True<div class="parent">
 True <div class="child" style="background:#e74c3c;">A</div>
 True <div class="child" style="background:#3498db;">B</div>
 True</div>
 True<p>这段文字会紧贴在父容器下方，而非在子元素下方</p>
 True```

 False> **效果图描述**：父容器边框塌缩为一条线（高度为0），两个色块溢出，后续文字紧贴边框线。
 False
 False### 1.3 清除浮动（Clearfix）方案汇总
 False
 False#### 方案一：额外标签法（不推荐）
 False
 False在浮动元素后添加一个空标签并设置 `clear: both`：
 False
```html
 True<div class="parent">
 True <div class="child">A</div>
 True <div class="child">B</div>
 True <div style="clear:both;"></div>
 True</div>
 True```

 False缺点：增加无语义标签，违反结构与表现分离原则。
 False
 False#### 方案二：父元素设置 `overflow: hidden`（BFC 法）
 False
```css
 True.parent {
 True overflow: hidden;
 True}
 True```

 False原理：触发 BFC，BFC 会包含浮动元素。但 `overflow: hidden` 会裁剪溢出内容，不适合需要溢出显示的场景。
 False
 False#### 方案三：伪元素清除法（推荐 [完成]）
 False
```css
 True.clearfix::after {
 True content: "";
 True display: block;
 True clear: both;
 True}
 True
 True.clearfix {
 True *zoom: 1;
 True}
 True```

 False`*zoom: 1` 是 IE6/7 的 hack，触发 hasLayout 以兼容老浏览器。
 False
 False#### 方案四：现代 BFC 方案
 False
```css
 True.parent {
 True display: flow-root;
 True}
 True```

 False`display: flow-root` 专门为创建 BFC 设计，无副作用。浏览器支持：Chrome 58+、Firefox 53+、Safari 13+。
 False
 False### 1.4 `clear` 属性详解
 False
```css
 True.clear-left { clear: left; }
 True.clear-right { clear: right; }
 True.clear-both { clear: both; }
 True```

 False- `clear: left`：元素顶部不允许有左浮动元素
 False- `clear: right`：元素顶部不允许有右浮动元素
 False- `clear: both`：两侧都不允许
 False
 False---
 False
 False## 2. 定位系统 (Positioning)
 False
 FalseCSS `position` 属性控制元素的定位方式，配合 `top`/`right`/`bottom`/`left`/`z-index` 使用。
 False
 False### 2.1 `static`——默认定位
 False
 False所有元素默认 `position: static`，遵循正常文档流。`top`/`left` 等偏移属性无效。
 False
```css
 True.box-static {
 True position: static;
 True top: 50px;
 True left: 100px;
 True}
 True```

 False> **效果图描述**：元素位置无任何变化，`top`/`left` 不生效。
 False
 False### 2.2 `relative`——相对定位
 False
 False相对于**自身原位置**偏移，**不脱离文档流**，原位置仍保留空间。
 False
```css
 True.box-relative {
 True position: relative;
 True top: 20px;
 True left: 30px;
 True}
 True```

```html
 True<div style="background:#ecf0f1;padding:20px;">
 True <span>前</span>
 True <span class="box-relative" style="background:#e74c3c;color:#fff;padding:5px;">相对定位</span>
 True <span>后</span>
 True</div>
 True```

 False> **效果图描述**："相对定位"文字向右下偏移 30px/20px，但原位置仍留有空间，"前""后"文字位置不变。
 False
 False**常见用途**：
 False- 微调元素位置
 False- 作为 `absolute` 子元素的定位参考
 False
 False### 2.3 `absolute`——绝对定位
 False
 False相对于**最近的非 static 祖先**偏移，**脱离文档流**，原位置不保留空间。
 False
```css
 True.parent-abs {
 True position: relative;
 True width: 300px;
 True height: 200px;
 True background: #ecf0f1;
 True}
 True
 True.child-abs {
 True position: absolute;
 True top: 20px;
 True right: 20px;
 True width: 80px;
 True height: 80px;
 True background: #e74c3c;
 True}
 True```

```html
 True<div class="parent-abs">
 True <div class="child-abs"></div>
 True</div>
 True```

 False> **效果图描述**：灰色容器内，红色方块紧贴右上角（距顶20px、距右20px）。
 False
 False**关键要点**：
 False- 若无已定位祖先，则相对于初始包含块（通常是 `<html>`）
 False- 绝对定位元素的 `width: auto` 会收缩到内容宽度（类似浮动）
 False- 常用于弹窗、下拉菜单、角标等
 False
 False### 2.4 `fixed`——固定定位
 False
 False相对于**浏览器视口**定位，**脱离文档流**，滚动页面时位置不变。
 False
```css
 True.nav-fixed {
 True position: fixed;
 True top: 0;
 True left: 0;
 True width: 100%;
 True height: 50px;
 True background: #2c3e50;
 True color: #fff;
 True z-index: 1000;
 True}
 True
 True.back-to-top {
 True position: fixed;
 True bottom: 30px;
 True right: 30px;
 True width: 50px;
 True height: 50px;
 True background: #3498db;
 True border-radius: 50%;
 True cursor: pointer;
 True}
 True```

 False> **效果图描述**：深色导航栏始终固定在页面顶部；蓝色圆形"回到顶部"按钮固定在右下角。
 False
 False**注意**：`fixed` 元素的包含块是视口，但如果祖先设置了 `transform`/`perspective`/`filter`，包含块会变为该祖先（这是一个常见"坑"）。
 False
 False### 2.5 `sticky`——粘性定位
 False
 False在特定滚动阈值内表现为 `relative`，超出阈值后表现为 `fixed`。
 False
```css
 True.section-title {
 True position: sticky;
 True top: 0;
 True background: #fff;
 True padding: 10px;
 True border-bottom: 2px solid #3498db;
 True z-index: 10;
 True}
 True```

```html
 True<div style="height:2000px;">
 True <h2 class="section-title">第一章</h2>
 True <p>内容区域……（很长）</p>
 True <h2 class="section-title">第二章</h2>
 True <p>内容区域……（很长）</p>
 True</div>
 True```

 False> **效果图描述**：滚动时，章节标题到达页面顶部后"粘住"，直到被下一个标题推出。
 False
 False**关键要点**：
 False- `sticky` 元素不会脱离文档流
 False- 必须指定 `top`/`bottom`/`left`/`right` 中的至少一个
 False- 父容器的高度是 sticky 的"活动范围"，超出父容器后 sticky 失效
 False- 父容器不能设置 `overflow: hidden`/`auto`/`scroll`，否则 sticky 失效
 False
 False### 2.6 `z-index` 与层叠上下文
 False
 False`z-index` 仅对 `position` 非 `static` 的元素有效（`sticky` 除外，它天然创建层叠上下文）。
 False
```css
 True.layer-1 { position: absolute; z-index: 1; background: rgba(231,76,60,0.7); }
 True.layer-2 { position: absolute; z-index: 10; background: rgba(52,152,219,0.7); }
 True.layer-3 { position: absolute; z-index: 5; background: rgba(46,204,113,0.7); }
 True```

 False**层叠上下文的创建条件**（部分）：
 False- `position` 非 `static` + `z-index` 非 `auto`
 False- `opacity` < 1
 False- `transform` 非 `none`
 False- `filter` 非 `none`
 False- `will-change: transform`
 False- `display: flex/grid` 子元素的 `z-index` 非 `auto`
 False
 False> [警告] **常见坑**：子元素的 `z-index` 再高，也无法超越父级层叠上下文的限制。
 False
 False---
 False
 False## 3. BFC（块格式化上下文）
 False
 False### 3.1 什么是 BFC
 False
 FalseBFC（Block Formatting Context）是 CSS 中一个独立的渲染区域，内部元素的布局不会影响外部元素。可以把它想象成一个**隔离的布局容器**。
 False
 False### 3.2 BFC 的布局规则
 False
 False1. 内部块级盒子垂直方向一个接一个排列
 False2. 同一个 BFC 中，相邻块级盒子的垂直外边距会发生折叠（margin collapse）
 False3. BFC 区域不会与浮动元素重叠
 False4. BFC 可以包含浮动元素（解决高度塌陷）
 False5. 计算 BFC 高度时，浮动元素也参与计算
 False
 False### 3.3 触发 BFC 的条件
 False
 False| 属性 | 值 |
 False|:--|:--|
 False| `float` | `left` / `right`（非 `none`） |
 False| `position` | `absolute` / `fixed` |
 False| `display` | `inline-block` / `table-cell` / `table-caption` / `flex` / `inline-flex` / `grid` / `inline-grid` / `flow-root` |
 False| `overflow` | `hidden` / `auto` / `scroll`（非 `visible`） |
 False| `contain` | `layout` / `content` / `paint` |
 False
 False### 3.4 BFC 的典型应用
 False
 False#### 应用一：清除浮动（解决高度塌陷）
 False
```css
 True.container {
 True display: flow-root;
 True}
 True```

 False#### 应用二：防止 margin 折叠
 False
```html
 True<div style="margin-bottom:20px;background:#e74c3c;">A</div>
 True<div style="margin-top:30px;background:#3498db;">B</div>
 True```

 False> **效果图描述**：A 和 B 之间间距为 30px（取较大值），而非 50px。
 False
 False解决方案：将其中一个元素包裹在 BFC 容器中：
 False
```html
 True<div style="margin-bottom:20px;background:#e74c3c;">A</div>
 True<div style="overflow:hidden;">
 True <div style="margin-top:30px;background:#3498db;">B</div>
 True</div>
 True```

 False> **效果图描述**：A 和 B 之间间距变为 50px（20+30），margin 不再折叠。
 False
 False#### 应用三：实现自适应两栏布局
 False
 False浮动元素不会与 BFC 区域重叠，利用这一点实现右侧自适应：
 False
```css
 True.left {
 True float: left;
 True width: 200px;
 True height: 300px;
 True background: #e74c3c;
 True}
 True.right {
 True overflow: hidden;
 True height: 300px;
 True background: #3498db;
 True}
 True```

```html
 True<div class="left">固定宽度侧栏</div>
 True<div class="right">自适应内容区</div>
 True```

 False> **效果图描述**：左侧红色固定 200px，右侧蓝色自动填满剩余宽度，不会跑到红色下方。
 False
 False---
 False
 False## 4. 传统经典布局
 False
 False### 4.1 圣杯布局（Holy Grail Layout）
 False
 False三栏布局：中间自适应，两侧固定宽度。DOM 顺序中间栏优先渲染。
 False
```css
 True.holy-grail {
 True padding: 0 200px 0 150px;
 True}
 True.holy-grail .center {
 True float: left;
 True width: 100%;
 True background: #ecf0f1;
 True min-height: 300px;
 True}
 True.holy-grail .left {
 True float: left;
 True width: 150px;
 True margin-left: -100%;
 True position: relative;
 True left: -150px;
 True background: #e74c3c;
 True min-height: 300px;
 True}
 True.holy-grail .right {
 True float: left;
 True width: 200px;
 True margin-left: -200px;
 True position: relative;
 True right: -200px;
 True background: #3498db;
 True min-height: 300px;
 True}
 True```

```html
 True<div class="holy-grail clearfix">
 True <div class="center">Center（主内容区，优先渲染）</div>
 True <div class="left">Left（150px）</div>
 True <div class="right">Right（200px）</div>
 True</div>
 True```

 False> **效果图描述**：三栏并排——左侧红色 150px，中间灰色自适应，右侧蓝色 200px。中间栏在 DOM 中排在最前。
 False
 False**核心原理**：
 False1. 三栏均左浮动，中间栏 `width: 100%` 占满
 False2. 左栏 `margin-left: -100%` 移到中间栏左侧
 False3. 右栏 `margin-left: -200px` 移到中间栏右侧
 False4. 父容器 `padding` 留出两侧空间，左右栏 `position: relative` 偏移到位
 False
 False### 4.2 双飞翼布局
 False
 False与圣杯布局目标相同，但实现方式不同：中间栏内部再包一层，用 `margin` 留空间而非父容器 `padding`。
 False
```css
 True.double-wing .center-wrap {
 True float: left;
 True width: 100%;
 True}
 True.double-wing .center {
 True margin: 0 200px 0 150px;
 True background: #ecf0f1;
 True min-height: 300px;
 True}
 True.double-wing .left {
 True float: left;
 True width: 150px;
 True margin-left: -100%;
 True background: #e74c3c;
 True min-height: 300px;
 True}
 True.double-wing .right {
 True float: left;
 True width: 200px;
 True margin-left: -200px;
 True background: #3498db;
 True min-height: 300px;
 True}
 True```

```html
 True<div class="double-wing clearfix">
 True <div class="center-wrap">
 True <div class="center">Center（主内容区）</div>
 True </div>
 True <div class="left">Left（150px）</div>
 True <div class="right">Right（200px）</div>
 True</div>
 True```

 False> **效果图描述**：视觉效果与圣杯布局一致，但中间栏通过内部 margin 而非父容器 padding 留空间。
 False
 False**圣杯 vs 双飞翼对比**：
 False
 False| 对比项 | 圣杯布局 | 双飞翼布局 |
 False|:--|:--|:--|
 False| 留空间方式 | 父容器 `padding` + 子元素 `relative` | 中间栏内部 `margin` |
 False| DOM 层级 | 三栏同级 | 中间栏多包一层 |
 False| `position` | 左右栏需要 `relative` | 不需要 `relative` |
 False| 中间栏最小宽度 | 受 `padding` 约束 | 受 `margin` 约束 |
 False
 False### 4.3 等高布局
 False
 False传统方式实现多列等高：
 False
```css
 True.equal-height {
 True overflow: hidden;
 True}
 True.equal-height .col {
 True float: left;
 True width: 33.33%;
 True padding-bottom: 9999px;
 True margin-bottom: -9999px;
 True background: #ecf0f1;
 True}
 True.equal-height .col:nth-child(2) { background: #bdc3c7; }
 True.equal-height .col:nth-child(3) { background: #95a5a6; }
 True```

 False> **效果图描述**：三列高度一致，以内容最多的列为准。利用超大 `padding-bottom` + 负 `margin-bottom` 实现。
 False
 False---
 False
 False## 5. 居中方案汇总
 False
 False### 5.1 水平居中
 False
 False#### 行内元素 / 行内块元素
 False
```css
 True.parent {
 True text-align: center;
 True}
 True```

```html
 True<div class="parent">
 True <span>行内元素居中</span>
 True</div>
 True```

 False#### 定宽块级元素
 False
```css
 True.child {
 True width: 200px;
 True margin: 0 auto;
 True}
 True```

 False#### 不定宽块级元素
 False
```css
 True.parent {
 True text-align: center;
 True}
 True.child {
 True display: inline-block;
 True}
 True```

 False### 5.2 垂直居中
 False
 False#### 单行文本
 False
```css
 True.single-line {
 True height: 50px;
 True line-height: 50px;
 True}
 True```

 False#### 多行文本（table-cell）
 False
```css
 True.parent {
 True display: table-cell;
 True vertical-align: middle;
 True height: 200px;
 True}
 True```

 False#### 绝对定位 + transform
 False
```css
 True.parent { position: relative; height: 200px; }
 True.child {
 True position: absolute;
 True top: 50%;
 True transform: translateY(-50%);
 True}
 True```

 False### 5.3 水平垂直居中
 False
 False#### 方案一：绝对定位 + transform（最经典）
 False
```css
 True.parent {
 True position: relative;
 True width: 400px;
 True height: 300px;
 True background: #ecf0f1;
 True}
 True.child {
 True position: absolute;
 True top: 50%;
 True left: 50%;
 True transform: translate(-50%, -50%);
 True background: #e74c3c;
 True padding: 20px;
 True color: #fff;
 True}
 True```

 False> **效果图描述**：红色方块精确居中在灰色容器正中央。
 False
 False**优点**：无需知道子元素尺寸。**缺点**：`transform` 可能影响子元素的 `fixed` 定位。
 False
 False#### 方案二：绝对定位 + 负 margin（需已知尺寸）
 False
```css
 True.child {
 True position: absolute;
 True top: 50%;
 True left: 50%;
 True width: 200px;
 True height: 100px;
 True margin-top: -50px;
 True margin-left: -100px;
 True}
 True```

 False**优点**：兼容性极好。**缺点**：需要知道子元素宽高。
 False
 False#### 方案三：绝对定位 + margin: auto（需已知尺寸）
 False
```css
 True.child {
 True position: absolute;
 True top: 0;
 True right: 0;
 True bottom: 0;
 True left: 0;
 True margin: auto;
 True width: 200px;
 True height: 100px;
 True}
 True```

 False**原理**：绝对定位元素四边为 0 时，浏览器自动计算 `margin` 使其居中。
 False
 False#### 方案四：table-cell
 False
```css
 True.parent {
 True display: table-cell;
 True vertical-align: middle;
 True text-align: center;
 True width: 400px;
 True height: 300px;
 True}
 True.child {
 True display: inline-block;
 True}
 True```

 False**优点**：兼容 IE8+。**缺点**：`display: table-cell` 对布局有限制。
 False
 False#### 方案五：Flexbox（现代推荐 [完成]）
 False
```css
 True.parent {
 True display: flex;
 True justify-content: center;
 True align-items: center;
 True height: 300px;
 True}
 True```

 False**优点**：最简洁，无需知道子元素尺寸。**缺点**：IE9 及以下不支持。
 False
 False#### 方案六：Grid（最现代）
 False
```css
 True.parent {
 True display: grid;
 True place-items: center;
 True height: 300px;
 True}
 True```

 False**优点**：代码最少。**缺点**：IE 不支持。
 False
 False### 5.4 居中方案对比总结
 False
 False| 方案 | 需知尺寸 | 兼容性 | 代码量 | 适用场景 |
 False|:--|:--|:--|:--|:--|
 False| absolute + transform | [错误] | IE10+ | 少 | 通用 |
 False| absolute + 负 margin | [完成] | IE6+ | 中 | 已知尺寸 |
 False| absolute + margin:auto | [完成] | IE8+ | 少 | 已知尺寸 |
 False| table-cell | [错误] | IE8+ | 多 | 兼容旧浏览器 |
 False| Flexbox | [错误] | IE10+ | 少 | 现代项目首选 |
 False| Grid | [错误] | 现代浏览器 | 最少 | 最新项目 |
 False
 False---
 False
 False## 6. 总结
 False
 False虽然现代开发推荐使用 Flex/Grid，但理解 Float 和 Position 对维护旧项目和处理特定定位需求（如固定导航栏、弹窗）依然至关重要。
 False
 False**关键要点回顾**：
 False
 False- **浮动**：图文环绕 → 布局 → 高度塌陷 → clearfix / flow-root
 False- **定位**：static（默认）→ relative（微调/参照）→ absolute（脱离流/弹窗）→ fixed（视口固定）→ sticky（滚动粘性）
 False- **BFC**：隔离布局容器，解决塌陷/margin 折叠/自适应两栏
 False- **经典布局**：圣杯/双飞翼是浮动布局的巅峰应用
 False- **居中**：从传统 hack 到 Flex/Grid，方案越来越简洁
 False
 False---
 False
 False### 更新日志 (Changelog)
 False
 False- 2026-05-27: v4.0.0 大幅扩充——新增 BFC 详解、圣杯/双飞翼布局、居中方案汇总、z-index 层叠上下文、sticky 注意事项
 False- 2026-04-05: 整合传统布局与现代定位技巧

## 延伸阅读

- [[html5/tags-and-attributes|HTML 标签]]
 False