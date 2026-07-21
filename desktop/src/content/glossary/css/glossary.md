---
title: 'Glossary'
module: 'css'
---

## CSS 专有名词查阅表

## 名词列表

CSS 术语表已完整补全，分为三个独立文件：

### 核心概念术语（Core Concepts）

详见：[css-glossary-core.md](css-glossary-core.md)

包含 CSS 基础概念：选择器、盒模型、布局模型（Flexbox、Grid）、定位、层叠规则、响应式设计基础等。

### 视觉属性术语（Visual Properties）

详见：[css-glossary-visual.md](css-glossary-visual.md)

包含 CSS 视觉相关属性：颜色与背景、字体与文本、变换与动画、阴影与边框、渐变等视觉效果。

### 高级特性术语（Advanced Features）

详见：[css-glossary-advanced.md](css-glossary-advanced.md)

包含 CSS 高级特性：CSS 变量、函数（calc/var/clamp）、容器查询、CSS 层级、逻辑属性、Houdini、自定义属性等。

## 术语导航

### A-B

- alignment（对齐）
- animation（动画）
- backdrop-filter（背景滤镜）
- background（背景）
- box model（盒模型）
- border（边框）

### C-D

- cascade（层叠）
- class selector（类选择器）
- color（颜色）
- container query（容器查询）
- CSS Grid（网格布局）
- CSS variable（CSS 变量）

### D-F

- display（显示类型）
- flexbox（弹性盒）
- float（浮动）
- font（字体）
- function（函数）

### G-M

- gradient（渐变）
- grid（网格）
- ID selector（ID 选择器）
- layout（布局）
- margin（外边距）
- media query（媒体查询）

### O-P

- opacity（不透明度）
- overflow（溢出）
- padding（内边距）
- position（定位）
- pseudo-class（伪类）
- pseudo-element（伪元素）

### R-S

- responsive design（响应式设计）
- selector（选择器）
- specificity（特异性/优先级）
- syntax（语法）
- transform（变换）
- transition（过渡）

### V-Z

- visibility（可见性）
- z-index（堆叠顺序）
- 伪元素选择器（::before/::after）

## 快速链接

- [CSS 教程目录](../docs/css/)
- [CSS 核心概念术语表](css-glossary-core.md)
- [CSS 视觉属性术语表](css-glossary-visual.md)
- [CSS 高级特性术语表](css-glossary-advanced.md)

## CSS 高级名词注释 (Advanced Glossary)

## A

| 术语         | 英文         | 释义                                                                     |
| ------------ | ------------ | ------------------------------------------------------------------------ |
| @layer       | @layer       | CSS 层级（Cascade Layers），控制样式表的层叠优先级，先声明的层优先级更低 |
| aspect-ratio | aspect-ratio | 宽高比属性，如 `16 / 9`，自动计算缺失的宽度或高度                        |

## B

| 术语            | 英文            | 释义                                                                   |
| --------------- | --------------- | ---------------------------------------------------------------------- |
| backdrop-filter | backdrop-filter | 元素后方区域的滤镜效果，常用于毛玻璃效果 `backdrop-filter: blur(10px)` |
| block-size      | block-size      | 逻辑属性，块轴方向尺寸，水平书写模式等同 `height`                      |
| inline-size     | inline-size     | 逻辑属性，行内轴方向尺寸，水平书写模式等同 `width`                     |

## C

| 术语               | 英文                 | 释义                                                                 |
| ------------------ | -------------------- | -------------------------------------------------------------------- |
| CSS 变量           | Custom Property      | `--var-name` 定义，`var(--var-name)` 引用，运行时可动态修改          |
| calc()             | calc()               | 计算函数，支持加减乘除混合单位运算，如 `calc(100% - 20px)`           |
| clamp()            | clamp()              | 限制值范围函数，`clamp(min, preferred, max)`                         |
| 容器查询           | Container Query      | `@container` 根据容器尺寸而非视口应用样式，组件级响应式              |
| 容器查询单位       | Container Query Unit | `cqw`（容器宽度 1%）、`cqh`（容器高度 1%）等                         |
| content-visibility | content-visibility   | 渲染性能优化属性，`auto` 跳过屏幕外内容的渲染                        |
| counter()          | counter()            | CSS 计数器函数，配合 `counter-reset` 和 `counter-increment` 自动编号 |

## D

| 术语      | 英文      | 释义                                           |
| --------- | --------- | ---------------------------------------------- |
| @document | @document | 根据文档 URL 应用样式的规则（仅 Firefox 支持） |

## E

| 术语  | 英文  | 释义                                                                |
| ----- | ----- | ------------------------------------------------------------------- |
| env() | env() | 环境变量函数，访问用户代理定义的变量，如 `env(safe-area-inset-top)` |

## F

| 术语       | 英文       | 释义                                                                |
| ---------- | ---------- | ------------------------------------------------------------------- |
| @font-face | @font-face | 自定义字体规则，加载外部字体文件                                    |
| :has()     | :has()     | 父选择器（关系型伪类），根据子元素状态选择父元素，如 `div:has(> p)` |
| min()      | min()      | 取多个值中的最小值，如 `min(100vw, 800px)`                          |
| max()      | max()      | 取多个值中的最大值，如 `max(50vw, 300px)`                           |

## G

| 术语              | 英文              | 释义                                                               |
| ----------------- | ----------------- | ------------------------------------------------------------------ |
| @supports         | @supports         | 特性查询，检测浏览器是否支持某 CSS 属性后应用样式                  |
| grid-auto-flow    | grid-auto-flow    | 自动放置算法：`row`（逐行）、`column`（逐列）、`dense`（紧凑填充） |
| grid-auto-rows    | grid-auto-rows    | 隐式行轨道大小                                                     |
| grid-auto-columns | grid-auto-columns | 隐式列轨道大小                                                     |
| subgrid           | subgrid           | 子网格，嵌套网格继承父网格的轨道定义                               |

## H

| 术语     | 英文     | 释义                                                      |
| -------- | -------- | --------------------------------------------------------- |
| :is()    | :is()    | 选择器匹配简化函数，`:is(h1, h2, h3)` 等价于 `h1, h2, h3` |
| :where() | :where() | 与 `:is()` 类似但特异性为 0，便于覆盖                     |

## I

| 术语        | 英文        | 释义                             |
| ----------- | ----------- | -------------------------------- |
| image-set() | image-set() | 根据设备像素比选择不同分辨率图片 |

## J

| 术语     | 英文             | 释义                                                            |
| -------- | ---------------- | --------------------------------------------------------------- |
| 逻辑属性 | Logical Property | 不依赖书写方向的属性，如 `margin-block-start` 替代 `margin-top` |
| 逻辑值   | Logical Value    | 不依赖书写方向的值，如 `start`/`end` 替代 `left`/`right`        |

## L

| 术语        | 英文        | 释义                                                                 |
| ----------- | ----------- | -------------------------------------------------------------------- |
| @layer 顺序 | Layer Order | 层级声明顺序决定优先级，后声明的层优先级更高；未分层的样式优先级最高 |

## M

| 术语           | 英文           | 释义                                                     |
| -------------- | -------------- | -------------------------------------------------------- |
| minmax()       | minmax()       | Grid 轨道尺寸函数，`minmax(200px, 1fr)` 定义最小和最大值 |
| margin-block   | margin-block   | 逻辑属性，块轴方向外边距                                 |
| margin-inline  | margin-inline  | 逻辑属性，行内轴方向外边距                               |
| padding-block  | padding-block  | 逻辑属性，块轴方向内边距                                 |
| padding-inline | padding-inline | 逻辑属性，行内轴方向内边距                               |

## N

| 术语   | 英文   | 释义                                             |
| ------ | ------ | ------------------------------------------------ |
| :not() | :not() | 否定伪类，排除匹配选择器的元素，可接受选择器列表 |

## O

| 术语            | 英文            | 释义                                                                   |
| --------------- | --------------- | ---------------------------------------------------------------------- |
| object-fit      | object-fit      | 替换元素内容适应方式：`fill`、`contain`、`cover`、`none`、`scale-down` |
| object-position | object-position | 替换元素内容在框内的对齐位置                                           |

## P

| 术语      | 英文      | 释义                                                     |
| --------- | --------- | -------------------------------------------------------- |
| @property | @property | CSS Houdini 自定义属性注册，定义变量类型、初始值和继承性 |
| paint()   | paint()   | CSS Houdini Paint API，使用 JavaScript 绘制自定义图形    |

## R

| 术语     | 英文     | 释义                                                                           |
| -------- | -------- | ------------------------------------------------------------------------------ |
| repeat() | repeat() | Grid 轨道重复函数，`repeat(3, 1fr)` 或 `repeat(auto-fill, minmax(200px, 1fr))` |
| :root    | :root    | 文档根元素选择器，通常在此定义 CSS 全局变量                                    |

## S

| 术语            | 英文            | 释义                                            |
| --------------- | --------------- | ----------------------------------------------- |
| scroll-snap     | scroll-snap     | 滚动捕捉，`scroll-snap-type` 定义捕捉轴和严格度 |
| scroll-behavior | scroll-behavior | 滚动行为：`auto`（立即）、`smooth`（平滑）      |
| scroll-margin   | scroll-margin   | 滚动捕捉偏移量，调整捕捉位置                    |
| scroll-padding  | scroll-padding  | 滚动容器视口内边距，影响捕捉区域                |
| scrollbar-width | scrollbar-width | 滚动条宽度：`auto`、`thin`、`none`              |
| scrollbar-color | scrollbar-color | 滚动条颜色：`thumb-color track-color`           |

## T

| 术语         | 英文         | 释义                                                               |
| ------------ | ------------ | ------------------------------------------------------------------ |
| touch-action | touch-action | 控制触摸手势行为：`auto`、`none`、`pan-x`、`pan-y`、`manipulation` |

## U

| 术语  | 英文  | 释义                                                             |
| ----- | ----- | ---------------------------------------------------------------- |
| 单位  | Unit  | CSS 单位：绝对（px、pt、cm）、相对（em、rem、vw、vh、%、cqw）    |
| unset | unset | CSS 全局关键字，继承属性等同 `inherit`，非继承属性等同 `initial` |

## V

| 术语     | 英文          | 释义                                                      |
| -------- | ------------- | --------------------------------------------------------- |
| var()    | var()         | 引用 CSS 自定义属性的函数，支持默认值 `var(--color, red)` |
| 视口单位 | Viewport Unit | `vw`（视口宽度 1%）、`vh`（视口高度 1%）、`vmin`、`vmax`  |

## W

| 术语         | 英文         | 释义                                                                |
| ------------ | ------------ | ------------------------------------------------------------------- |
| will-change  | will-change  | 性能提示属性，告知浏览器元素将发生的变化，如 `transform`、`opacity` |
| writing-mode | writing-mode | 书写模式：`horizontal-tb`、`vertical-rl`、`vertical-lr`             |

## X

| 术语           | 英文           | 释义                                                 |
| -------------- | -------------- | ---------------------------------------------------- |
| :nth-child()   | :nth-child()   | 结构伪类，匹配父元素中第 n 个子元素，支持公式 `An+B` |
| :nth-of-type() | :nth-of-type() | 结构伪类，匹配同类型第 n 个兄弟元素                  |

## CSS 核心概念名词注释 (Core Concepts Glossary)

## A

| 术语          | 英文                 | 释义                                                             |
| ------------- | -------------------- | ---------------------------------------------------------------- |
| absolute 定位 | Absolute Positioning | `position: absolute`，相对于最近的已定位祖先元素定位，脱离文档流 |
| align-content | align-content        | 多行弹性容器中各行在侧轴方向的对齐方式                           |
| align-items   | align-items          | 弹性容器中所有项目在侧轴方向的对齐方式                           |
| align-self    | align-self           | 单个弹性项目在侧轴方向的对齐方式，覆盖 `align-items`             |

## B

| 术语       | 英文                     | 释义                                                        |
| ---------- | ------------------------ | ----------------------------------------------------------- |
| 盒模型     | Box Model                | CSS 布局基础，由 Content、Padding、Border、Margin 四层组成  |
| 标准盒模型 | Standard Box Model       | `box-sizing: content-box`，width/height 只含内容区          |
| IE 盒模型  | Border Box Model         | `box-sizing: border-box`，width/height 包含内容+内边距+边框 |
| border     | border                   | 边框属性，简写 `border: width style color`                  |
| BFC        | Block Formatting Context | 块级格式化上下文，独立的渲染区域，内部布局不影响外部        |
| 块级元素   | Block-level Element      | 独占一行的元素，如 `div`、`p`、`h1`，可设置宽高             |

## C

| 术语     | 英文             | 释义                                                    |
| -------- | ---------------- | ------------------------------------------------------- |
| 层叠     | Cascade          | 多个样式规则应用于同一元素时的优先级计算机制            |
| 层叠顺序 | Cascade Order    | 样式优先级：内联 > ID > 类/属性/伪类 > 标签/伪元素      |
| clear    | clear            | 清除浮动，`left`/`right`/`both` 指定元素哪侧不允许浮动  |
| 类选择器 | Class Selector   | 以 `.` 开头的选择器，匹配具有指定 class 的元素          |
| 包含块   | Containing Block | 定位元素的参考矩形，由最近已定位祖先的 padding 边界构成 |

## D

| 术语    | 英文        | 释义                                                             |
| ------- | ----------- | ---------------------------------------------------------------- |
| display | display     | 定义元素的显示类型：`block`、`inline`、`flex`、`grid`、`none` 等 |
| 文档流  | Normal Flow | 元素默认的布局方式，块级元素垂直排列，行内元素水平排列           |

## E

| 术语       | 英文           | 释义                       |
| ---------- | -------------- | -------------------------- |
| 子代选择器 | Child Selector | `>` 组合器，选择直接子元素 |

## F

| 术语           | 英文              | 释义                                                                   |
| -------------- | ----------------- | ---------------------------------------------------------------------- |
| Flexbox        | Flexbox           | 一维弹性布局模型，`display: flex` 创建弹性容器                         |
| flex-direction | flex-direction    | 定义主轴方向：`row`（默认）、`row-reverse`、`column`、`column-reverse` |
| flex-wrap      | flex-wrap         | 控制项目是否换行：`nowrap`（默认）、`wrap`、`wrap-reverse`             |
| flex-flow      | flex-flow         | `flex-direction` 和 `flex-wrap` 的简写                                 |
| flex-grow      | flex-grow         | 项目放大比例，默认 0（不放大），分配剩余空间                           |
| flex-shrink    | flex-shrink       | 项目缩小比例，默认 1（等比缩小），0 不缩小                             |
| flex-basis     | flex-basis        | 项目在主轴上的初始大小，优先于 width/height                            |
| float          | float             | 浮动定位，`left`/`right` 使元素脱离文档流，向指定方向浮动              |
| fixed 定位     | Fixed Positioning | `position: fixed`，相对于视口定位，不随滚动移动                        |

## G

| 术语                  | 英文                  | 释义                                           |
| --------------------- | --------------------- | ---------------------------------------------- |
| Grid                  | Grid                  | 二维网格布局模型，`display: grid` 创建网格容器 |
| grid-template-columns | grid-template-columns | 定义网格的列轨道大小                           |
| grid-template-rows    | grid-template-rows    | 定义网格的行轨道大小                           |
| grid-template-areas   | grid-template-areas   | 使用命名区域定义网格布局                       |
| grid-gap              | grid-gap              | 网格间距的简写属性（已弃用，推荐 `gap`）       |
| gap                   | gap                   | 行间距和列间距的简写，适用于 Flex 和 Grid      |

## H

| 术语       | 英文                | 释义                                     |
| ---------- | ------------------- | ---------------------------------------- |
| 后代选择器 | Descendant Selector | 空格组合器，选择所有后代元素（不限层级） |

## I

| 术语       | 英文                 | 释义                                                    |
| ---------- | -------------------- | ------------------------------------------------------- |
| ID 选择器  | ID Selector          | 以 `#` 开头的选择器，匹配具有指定 id 的元素，优先级最高 |
| 行内元素   | Inline Element       | 不独占一行的元素，如 `span`、`a`、`em`，不可设置宽高    |
| 行内块元素 | Inline-block Element | `display: inline-block`，行内排列但可设置宽高           |

## J

| 术语            | 英文            | 释义                                    |
| --------------- | --------------- | --------------------------------------- |
| justify-content | justify-content | 弹性/网格容器中项目在主轴方向的对齐方式 |

## M

| 术语        | 英文            | 释义                                                |
| ----------- | --------------- | --------------------------------------------------- |
| margin      | margin          | 外边距，元素与其他元素之间的间距                    |
| margin 塌陷 | Margin Collapse | 垂直方向相邻外边距合并为较大值的特性                |
| 媒体查询    | Media Query     | `@media` 根据设备特征（宽度、分辨率等）应用不同样式 |

## O

| 术语     | 英文     | 释义                                                        |
| -------- | -------- | ----------------------------------------------------------- |
| order    | order    | Flex/Grid 项目排序，数值越小越靠前，默认 0                  |
| overflow | overflow | 内容溢出处理：`visible`（默认）、`hidden`、`scroll`、`auto` |
| opacity  | opacity  | 不透明度，0（完全透明）到 1（完全不透明）                   |

## P

| 术语     | 英文           | 释义                                                                 |
| -------- | -------------- | -------------------------------------------------------------------- |
| padding  | padding        | 内边距，内容与边框之间的间距                                         |
| position | position       | 定位方式：`static`、`relative`、`absolute`、`fixed`、`sticky`        |
| 伪类     | Pseudo-class   | 以 `:` 前缀的选择器，匹配元素的特殊状态，如 `:hover`、`:first-child` |
| 伪元素   | Pseudo-element | 以 `::` 前缀的选择器，匹配元素的虚拟子元素，如 `::before`、`::after` |
| 优先级   | Specificity    | CSS 选择器权重计算：内联(1000) > ID(100) > 类(10) > 标签(1)          |

## R

| 术语          | 英文                 | 释义                                                       |
| ------------- | -------------------- | ---------------------------------------------------------- |
| relative 定位 | Relative Positioning | `position: relative`，相对于自身原始位置偏移，不脱离文档流 |
| 响应式设计    | Responsive Design    | 通过媒体查询、弹性布局等技术使页面适配不同屏幕尺寸         |

## S

| 术语        | 英文               | 释义                                                        |
| ----------- | ------------------ | ----------------------------------------------------------- |
| 选择器      | Selector           | CSS 规则中匹配目标元素的模式                                |
| 属性选择器  | Attribute Selector | `[attr]`、`[attr=val]` 等，根据属性匹配元素                 |
| sticky 定位 | Sticky Positioning | `position: sticky`，滚动到阈值前为 relative，超过后为 fixed |
| 通用选择器  | Universal Selector | `*` 匹配所有元素                                            |

## T

| 术语           | 英文                      | 释义                                 |
| -------------- | ------------------------- | ------------------------------------ |
| 通用兄弟选择器 | General Sibling Selector  | `~` 组合器，选择后续所有同级元素     |
| 相邻兄弟选择器 | Adjacent Sibling Selector | `+` 组合器，选择紧邻的下一个同级元素 |
| 特异性         | Specificity               | 同优先级，衡量选择器匹配精确度的数值 |

## V

| 术语       | 英文       | 释义                                                        |
| ---------- | ---------- | ----------------------------------------------------------- |
| visibility | visibility | 元素可见性：`visible`、`hidden`（占位但不可见）、`collapse` |
| viewport   | viewport   | 浏览器可视区域，`vw`/`vh` 单位基于视口尺寸                  |

## Z

| 术语    | 英文    | 释义                                                   |
| ------- | ------- | ------------------------------------------------------ |
| z-index | z-index | 定位元素的堆叠顺序，数值越大越靠前，仅对已定位元素有效 |

## CSS 视觉名词注释 (Visual Glossary)

## A

| 术语                      | 英文                      | 释义                                                                                               |
| ------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| animation                 | animation                 | 动画简写属性：`name duration timing-function delay iteration-count direction fill-mode play-state` |
| animation-delay           | animation-delay           | 动画延迟开始时间，支持负值（从动画中间开始）                                                       |
| animation-direction       | animation-direction       | 动画方向：`normal`、`reverse`、`alternate`、`alternate-reverse`                                    |
| animation-duration        | animation-duration        | 动画一个周期的持续时间                                                                             |
| animation-fill-mode       | animation-fill-mode       | 动画执行前后样式状态：`none`、`forwards`、`backwards`、`both`                                      |
| animation-iteration-count | animation-iteration-count | 动画播放次数，`infinite` 无限循环                                                                  |
| animation-name            | animation-name            | 绑定的 `@keyframes` 动画名称                                                                       |
| animation-play-state      | animation-play-state      | 动画播放状态：`running`、`paused`                                                                  |
| animation-timing-function | animation-timing-function | 动画速度曲线：`ease`、`linear`、`ease-in`、`ease-out`、`ease-in-out`、`cubic-bezier()`             |

## B

| 术语                  | 英文                  | 释义                                                             |
| --------------------- | --------------------- | ---------------------------------------------------------------- |
| background            | background            | 背景简写属性，包含 color、image、repeat、position、size 等       |
| background-attachment | background-attachment | 背景滚动方式：`scroll`（默认）、`fixed`、`local`                 |
| background-clip       | background-clip       | 背景绘制区域：`border-box`、`padding-box`、`content-box`、`text` |
| background-color      | background-color      | 背景颜色                                                         |
| background-image      | background-image      | 背景图片，支持多背景叠加和渐变                                   |
| background-origin     | background-origin     | 背景定位区域：`border-box`、`padding-box`、`content-box`         |
| background-position   | background-position   | 背景图片位置，支持关键字、百分比、长度值                         |
| background-repeat     | background-repeat     | 背景重复方式：`repeat`、`no-repeat`、`repeat-x`、`repeat-y`      |
| background-size       | background-size       | 背景图片大小：`cover`（覆盖）、`contain`（包含）、具体尺寸       |
| border-radius         | border-radius         | 圆角边框，四个值分别对应左上、右上、右下、左下                   |
| box-shadow            | box-shadow            | 盒子阴影：`h-offset v-offset blur spread color inset`            |

## C

| 术语         | 英文            | 释义                                                     |
| ------------ | --------------- | -------------------------------------------------------- |
| color        | color           | 前景（文本）颜色，支持关键字、HEX、RGB、HSL 等格式       |
| currentColor | currentColor    | CSS 关键字，引用当前元素的 `color` 属性值                |
| 线性渐变     | Linear Gradient | `linear-gradient()` 沿直线方向的颜色渐变                 |
| 径向渐变     | Radial Gradient | `radial-gradient()` 从中心向外辐射的颜色渐变             |
| 锥形渐变     | Conic Gradient  | `conic-gradient()` 围绕中心点旋转的颜色渐变              |
| cubic-bezier | cubic-bezier()  | 贝塞尔曲线函数，自定义动画速度曲线，参数为两个控制点坐标 |

## D

| 术语 | 英文     | 释义                                                           |
| ---- | -------- | -------------------------------------------------------------- |
| 渐变 | Gradient | CSS 渐变是 `<image>` 类型，不是颜色，可用于 `background-image` |

## E

| 术语   | 英文   | 释义                                                                                |
| ------ | ------ | ----------------------------------------------------------------------------------- |
| filter | filter | 图形滤镜：`blur()`、`brightness()`、`contrast()`、`grayscale()`、`drop-shadow()` 等 |

## F

| 术语         | 英文         | 释义                                                         |
| ------------ | ------------ | ------------------------------------------------------------ |
| font         | font         | 字体简写属性：`style variant weight size/line-height family` |
| font-family  | font-family  | 字体族，可指定多个备选字体，以逗号分隔                       |
| font-size    | font-size    | 字体大小，推荐使用 `rem`、`em`、`px` 单位                    |
| font-style   | font-style   | 字体样式：`normal`、`italic`、`oblique`                      |
| font-weight  | font-weight  | 字体粗细：`normal`(400)、`bold`(700) 或 100-900 数值         |
| font-variant | font-variant | 字体变体：`normal`、`small-caps`（小型大写字母）             |

## G

| 术语 | 英文   | 释义                                                           |
| ---- | ------ | -------------------------------------------------------------- |
| 光标 | cursor | 鼠标指针样式：`default`、`pointer`、`text`、`move`、自定义 URL |

## H

| 术语      | 英文       | 释义                                                                      |
| --------- | ---------- | ------------------------------------------------------------------------- |
| HEX 颜色  | Hex Color  | 十六进制颜色值，如 `#ff0000` 或简写 `#f00`，支持 8 位含透明度 `#ff000080` |
| HSL 颜色  | HSL Color  | 色相-饱和度-亮度颜色模型，`hsl(0, 100%, 50%)`，直观调整颜色               |
| HSLA 颜色 | HSLA Color | HSL 加透明度通道，`hsla(0, 100%, 50%, 0.5)`                               |

## K

| 术语       | 英文       | 释义                                                   |
| ---------- | ---------- | ------------------------------------------------------ |
| @keyframes | @keyframes | 定义动画关键帧序列，`from`/`to` 或百分比指定各阶段样式 |

## L

| 术语           | 英文           | 释义                                                 |
| -------------- | -------------- | ---------------------------------------------------- |
| letter-spacing | letter-spacing | 字符间距，正值增大、负值缩小                         |
| line-height    | line-height    | 行高，影响文本垂直对齐，推荐使用无单位数值（如 1.5） |

## M

| 术语           | 英文           | 释义                                                             |
| -------------- | -------------- | ---------------------------------------------------------------- |
| mix-blend-mode | mix-blend-mode | 元素内容与下层内容的混合模式：`multiply`、`screen`、`overlay` 等 |

## O

| 术语    | 英文    | 释义                                                            |
| ------- | ------- | --------------------------------------------------------------- |
| outline | outline | 轮廓线，不占布局空间，常用于焦点指示，`outline-offset` 控制偏移 |

## P

| 术语               | 英文               | 释义                                   |
| ------------------ | ------------------ | -------------------------------------- |
| perspective        | perspective        | 3D 变换的透视距离，值越小透视效果越强  |
| perspective-origin | perspective-origin | 透视消失点位置，默认 `50% 50%`（中心） |

## R

| 术语      | 英文       | 释义                                     |
| --------- | ---------- | ---------------------------------------- |
| RGB 颜色  | RGB Color  | 红-绿-蓝颜色模型，`rgb(255, 0, 0)`       |
| RGBA 颜色 | RGBA Color | RGB 加透明度通道，`rgba(255, 0, 0, 0.5)` |

## S

| 术语                       | 英文                       | 释义                                                                  |
| -------------------------- | -------------------------- | --------------------------------------------------------------------- |
| text-align                 | text-align                 | 文本水平对齐：`left`、`right`、`center`、`justify`                    |
| text-decoration            | text-decoration            | 文本装饰线：`underline`、`overline`、`line-through`、`none`           |
| text-shadow                | text-shadow                | 文本阴影：`h-offset v-offset blur color`                              |
| text-transform             | text-transform             | 文本大小写转换：`uppercase`、`lowercase`、`capitalize`                |
| text-overflow              | text-overflow              | 文本溢出处理：`clip`、`ellipsis`（省略号），需配合 `overflow: hidden` |
| transform                  | transform                  | 变换属性：`translate()`、`rotate()`、`scale()`、`skew()`、`matrix()`  |
| transform-origin           | transform-origin           | 变换原点，默认 `50% 50%`（元素中心）                                  |
| transform-style            | transform-style            | 3D 空间表现：`flat`（2D）、`preserve-3d`（3D）                        |
| transition                 | transition                 | 过渡简写：`property duration timing-function delay`                   |
| transition-property        | transition-property        | 参与过渡的 CSS 属性名                                                 |
| transition-duration        | transition-duration        | 过渡持续时间                                                          |
| transition-timing-function | transition-timing-function | 过渡速度曲线                                                          |
| transition-delay           | transition-delay           | 过渡延迟时间                                                          |

## W

| 术语         | 英文         | 释义                                                            |
| ------------ | ------------ | --------------------------------------------------------------- |
| white-space  | white-space  | 空白处理方式：`normal`、`nowrap`、`pre`、`pre-wrap`、`pre-line` |
| word-break   | word-break   | 单词断行规则：`normal`、`break-all`、`keep-all`                 |
| word-spacing | word-spacing | 单词间距                                                        |

## X

| 术语         | 英文           | 释义                                                          |
| ------------ | -------------- | ------------------------------------------------------------- |
| 线性渐变角度 | Gradient Angle | `linear-gradient(45deg, ...)` 指定渐变方向角度，0deg 从下到上 |

## Y

| 术语 | 英文   | 释义                                                 |
| ---- | ------ | ---------------------------------------------------- |
| 阴影 | Shadow | `box-shadow`（盒子阴影）和 `text-shadow`（文本阴影） |

## Z

| 术语     | 英文          | 释义                                                         |
| -------- | ------------- | ------------------------------------------------------------ |
| 字体回退 | Font Fallback | `font-family` 中指定多个字体，浏览器依次尝试直到找到可用字体 |
