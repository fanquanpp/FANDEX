# CSS 理论知识点

## 渲染流水线（Rendering Pipeline）

### 从 HTML 到像素

浏览器将 HTML/CSS/JS 转化为屏幕像素的过程称为渲染流水线，包含以下阶段：

```
HTML --> DOM Tree
CSS  --> CSSOM Tree
         |
         v
    Attachment (DOM + CSSOM --> Render Tree)
         |
         v
    Layout (计算位置和大小)
         |
         v
    Paint (绘制像素)
         |
         v
    Composite (合成图层)
         |
         v
    屏幕显示
```

### 各阶段详解

#### 1. 构建 DOM 树

解析 HTML 文档，构建文档对象模型（DOM）。DOM 树描述了文档的结构和内容。

```
<html>
  <body>
    <div class="container">
      <p>Hello</p>
    </div>
  </body>
</html>

DOM 树:
Document
  └── html
       └── body
            └── div.container
                 └── p
                      └── "Hello"
```

#### 2. 构建 CSSOM 树

解析 CSS 样式表，构建 CSS 对象模型（CSSOM）。CSSOM 树描述了样式规则和层叠计算结果。

CSSOM 的构建是渲染阻塞的：浏览器必须等 CSSOM 构建完成才能进入渲染阶段。这就是为什么 CSS 应放在 `<head>` 中尽早加载。

#### 3. 生成渲染树（Render Tree）

DOM 和 CSSOM 合并为渲染树。渲染树只包含需要显示的节点（`display: none` 的元素不在渲染树中，但 `visibility: hidden` 的元素在）。

#### 4. 布局（Layout / Reflow）

计算渲染树中每个节点的位置和大小。布局是从根节点开始的递归过程：

1. 根节点的宽度为视口宽度
2. 块级元素的宽度默认为父元素宽度
3. 行内元素的宽度由内容决定
4. 高度由内容和子元素决定（除非显式设置）

布局的触发条件：
- 添加/删除 DOM 元素
- 修改元素尺寸（width/height/padding/margin/border）
- 修改文字内容
- 修改字体
- 窗口 resize
- 读取某些属性（offsetWidth/scrollTop 等，强制同步布局）

#### 5. 绘制（Paint）

将渲染树中的节点绘制为像素。绘制分为多个层，按特定顺序进行：

1. 背景色
2. 背景图
3. 边框
4. 子元素
5. 轮廓（outline）

#### 6. 合成（Composite）

将多个图层按正确顺序合成最终画面。合成由 GPU 完成，是最高效的渲染阶段。

### 性能优化策略

| 触发阶段 | 属性示例 | 性能影响 |
|---------|---------|---------|
| Layout | width, height, margin, padding, font-size | 最差（全量重排） |
| Paint | color, background, box-shadow, border-radius | 中等（重绘） |
| Composite | transform, opacity | 最佳（仅合成） |

优化原则：尽量只触发 Composite 阶段。使用 `transform` 替代 `top/left`，使用 `opacity` 替代 `visibility: hidden`。

```css
.animated-element {
    will-change: transform;
    transform: translateX(0);
    transition: transform 0.3s ease;
}
.animated-element.moved {
    transform: translateX(100px);
}
```

---

## 层叠上下文（Stacking Context）

### 什么是层叠上下文

层叠上下文是 HTML 元素的三维概念，决定了元素在 Z 轴上的绘制顺序。每个层叠上下文内部的元素按规则排序，层叠上下文之间按 Z 轴顺序排列。

### 创建层叠上下文的条件

以下情况会创建新的层叠上下文：

1. **根元素** -- `<html>` 本身是一个层叠上下文
2. **z-index + 定位** -- `position: relative/absolute/fixed` + `z-index` 不为 auto
3. **flex/grid 子项** -- `z-index` 不为 auto 的 flex/grid 子项
4. **opacity** -- 值小于 1
5. **transform** -- 值不为 none
6. **filter** -- 值不为 none
7. **perspective** -- 值不为 none
8. **clip-path** -- 值不为 none
9. **mask** -- 值不为 none
10. **will-change** -- 值为 transform/opacity/filter 等
11. **contain** -- 值为 layout/paint/strict/content
12. **isolation** -- 值为 isolate

### 层叠顺序（从底到顶）

```
1. 层叠上下文的背景和边框
2. z-index 为负值的子层叠上下文
3. 常规流中的块级盒子（非定位、非浮动）
4. 浮动盒子
5. 常规流中的行内盒子（包括 inline-block 和 inline-table）
6. z-index: 0 / auto 的定位元素
7. z-index 为正值的子层叠上下文
```

记忆口诀：背景 -> 负z-index -> block -> float -> inline -> z-index:0 -> 正z-index

### 层叠上下文的隔离性

层叠上下文内部的元素无法超越其父级层叠上下文的 Z 轴范围。即使子元素设置 `z-index: 9999`，如果父级层叠上下文的 `z-index: 1`，它仍然会被另一个 `z-index: 2` 的层叠上下文覆盖。

```html
<div style="position: relative; z-index: 1;">
    <div style="position: relative; z-index: 9999;">
        Child with z-index 9999
    </div>
</div>
<div style="position: relative; z-index: 2;">
    This will be on top of the child above
</div>
```

---

## 包含块（Containing Block）

### 什么是包含块

包含块是元素定位和尺寸计算的参考矩形。不同定位方式的包含块不同。

### 包含块的确定规则

| 定位方式 | 包含块 |
|---------|--------|
| static / relative | 最近的块级容器祖先的内容区域 |
| absolute | 最近的 positioned 祖先（position 不为 static）的 padding box |
| fixed | 视口（viewport），除非祖先有 transform/filter/perspective |
| sticky | 最近的滚动祖先的 content box |

### 包含块对尺寸计算的影响

百分比尺寸基于包含块计算：

- `width` / `padding` / `margin` 的百分比基于包含块的**宽度**
- `height` 的百分比基于包含块的**高度**（但包含块高度依赖内容时，百分比高度无效）
- `top` / `bottom` 百分比基于包含块的高度
- `left` / `right` 百分比基于包含块的宽度

```css
.parent {
    position: relative;
    width: 400px;
    height: 300px;
    padding: 20px;
}

.child {
    position: absolute;
    width: 50%;    /* 50% of parent's padding box width = 220px */
    height: 50%;   /* 50% of parent's padding box height = 170px */
    top: 10%;      /* 10% of parent's padding box height = 34px */
    left: 10%;     /* 10% of parent's padding box width = 44px */
}
```

### transform 对 fixed 定位的影响

如果 fixed 定位元素的祖先有 `transform`、`filter` 或 `perspective` 属性，包含块不再是视口，而是该祖先的 padding box：

```css
.transform-container {
    transform: translateZ(0);  /* 创建新的包含块 */
}

.fixed-child {
    position: fixed;
    top: 0;
    left: 0;
    /* 相对于 .transform-container 定位，而非视口 */
}
```

---

## BFC / IFC

### BFC（Block Formatting Context，块格式化上下文）

BFC 是一个独立的渲染区域，内部元素的布局不影响外部元素。

#### 创建 BFC 的条件

1. 根元素（`<html>`）
2. 浮动元素（`float` 不为 none）
3. 绝对定位元素（`position: absolute/fixed`）
4. 行内块元素（`display: inline-block`）
5. 表格单元格（`display: table-cell`）
6. 表格标题（`display: table-caption`）
7. 弹性元素（`display: flex/inline-flex` 的子项）
8. 网格元素（`display: grid/inline-grid` 的子项）
9. `overflow` 不为 visible/clip 的块元素
10. `contain` 为 layout/content/paint/strict 的元素
11. `display: flow-root`（最明确的创建方式）

#### BFC 的特性

1. **内部块级盒子垂直排列** -- 每个块级盒子的左外边缘触及包含块的左边缘
2. **同一个 BFC 中相邻块级盒子的外边距折叠** -- 垂直 margin 合并
3. **BFC 区域不会与浮动元素重叠** -- 可用于清除浮动
4. **BFC 可以包含浮动元素** -- 解决高度塌陷
5. **BFC 是独立容器** -- 内部布局不影响外部

#### BFC 的应用

**清除浮动（高度塌陷）**

```css
.container {
    overflow: hidden;  /* 或 display: flow-root; */
}
.float-child {
    float: left;
}
```

**防止 margin 折叠**

```css
.sibling-1 { margin-bottom: 20px; }
.sibling-2 { margin-top: 30px; }
/* 实际间距为 30px（取较大值），而非 50px */

/* 解决方案：将其中一个包裹在 BFC 中 */
.wrapper { overflow: hidden; }
```

**自适应两栏布局**

```css
.sidebar { float: left; width: 200px; }
.main-content { overflow: hidden; /* 创建 BFC，不与浮动重叠 */ }
```

### IFC（Inline Formatting Context，行内格式化上下文）

IFC 是行级元素的格式化上下文，行级盒子在水平方向依次排列。

#### IFC 的特性

1. 行级盒子水平排列，从包含块的顶部开始
2. 行级盒子在垂直方向上可以有不同的对齐方式（baseline/top/middle/bottom）
3. 一行放不下时换行，形成多行（line box）
4. 行框（line box）的高度由其内部最高的行级盒子决定
5. 行框的宽度为包含块的宽度
6. `text-align` 控制行级盒子在行框内的水平对齐
7. `vertical-align` 控制行级盒子在行框内的垂直对齐

#### IFC 的应用

**行内元素垂直居中**

```css
.container {
    height: 200px;
    line-height: 200px;  /* 行框高度等于容器高度 */
}
.inline-element {
    vertical-align: middle;  /* 在行框内垂直居中 */
}
```

**图片底部间隙**

图片默认按 baseline 对齐，底部会留出文字 descender 的空间：

```css
img {
    display: block;     /* 方案1：脱离 IFC */
    vertical-align: bottom;  /* 方案2：改为底部对齐 */
    font-size: 0;       /* 方案3：父元素字体大小为 0 */
}
```

---

## 理论速查表

| 概念 | 核心要点 | 关键细节 |
|------|---------|---------|
| 渲染流水线 | DOM+CSSOM -> Render Tree -> Layout -> Paint -> Composite | transform/opacity 仅触发 Composite |
| 层叠上下文 | Z 轴绘制顺序 | transform/opacity/filter 等创建新上下文 |
| 包含块 | 定位和尺寸的参考矩形 | absolute 基于 padding box，fixed 基于视口 |
| BFC | 独立渲染区域 | overflow:hidden / display:flow-root 创建 |
| IFC | 行级元素格式化 | baseline 对齐，line-height 控制行框高度 |
| margin 折叠 | 同一 BFC 中相邻块级盒子垂直 margin 合并 | BFC 隔离可防止 |
| will-change | 提示浏览器元素将变化 | 提前创建图层，但不要滥用 |
| 回流/重绘 | Layout > Paint > Composite | 避免频繁触发 Layout |
