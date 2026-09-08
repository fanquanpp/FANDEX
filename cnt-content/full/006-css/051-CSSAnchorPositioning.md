---
order: 510
title: CSS 锚点定位
module: 'css'
category: 前端技术
difficulty: advanced
description: 用 position-anchor / position-area / anchor() 把弹层声明式地钉在锚点元素旁，替代“JS 测量 + 绝对定位”。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/015-PositionDetailed'
  - 'css/023-CSS3GridGridLayout'
  - 'css/065-CSSNewFeatures'
prerequisites:
  - 'css/015-PositionDetailed'
  - 'css/002-CSS3OverviewBasicSyntax'
---

## 1. 直觉：让弹层“钉”在触发元素旁边

做 tooltip、下拉菜单、气泡卡片时，传统做法是一条 JS 流水线：测量按钮的 `getBoundingClientRect()`，计算弹层坐标，写入 `style.top/left`，再监听滚动、缩放、窗口变化反复重算。一旦页面布局变化或弹层溢出视口，还要自己写翻转逻辑。这条流水线几乎每个组件库都重复实现了一遍。

CSS 锚点定位（Anchor Positioning）把这件事改成声明式：触发元素给自己起个锚点名，弹层声明“我挂在哪个锚点、放在哪个方位”，浏览器负责对齐、跟随与溢出翻转。可以把它类比成“图钉”：锚点元素是墙面上的点位，弹层是一张钉在点位旁边的便签——墙动了，便签跟着动，不需要你拿尺子重新量。

## 2. 支持现状（2025-2026）

- 锚点定位已于 2025 年进入 Baseline Newly Available：Chrome / Edge 125 起（2024-05）率先支持，Safari 与 Firefox 在 2025 年内跟进。
- 具体到每个子特性（`anchor-size()`、`position-visibility` 等）的引擎支持差异，以 MDN / caniuse 为准。
- 生产环境建议：用 `@supports` 检测，不支持时回退到固定定位或 JS 方案（见第 11 节）。

```css
/* 特性检测：支持锚点定位才启用锚点方案 */
@supports (anchor-name: --a) {
  .tooltip {
    position-anchor: --trigger;
    position-area: top;
  }
}
```

历史注意：该特性早期草案中的属性名是 `inset-area`，规范后来改名为 `position-area`，随 Chrome 125 正式发布的是 `position-area`。网络上不少旧教程仍写 `inset-area`，在稳定版浏览器中是无效属性，别再使用。

## 3. 四个核心成员

| 成员 | 作用 | 写在哪 |
| --- | --- | --- |
| `anchor-name` | 给元素起锚点名（必须以 `--` 开头，如 `--trigger`） | 锚点元素 |
| `position-anchor` | 声明“我默认引用哪个锚点” | 定位元素 |
| `position-area` | 在锚点周围的 3x3 网格里选一个（可跨格的）区域 | 定位元素 |
| `anchor()` / `anchor-size()` | 读取锚点的边缘位置 / 尺寸，作为坐标或长度 | 定位元素的 inset / 尺寸属性 |

## 4. 最小可用示例：tooltip

```html
<button class="btn">保存</button>
<div class="tooltip">已保存到草稿箱</div>
```

```css
.btn {
  anchor-name: --btn; /* 第一步：给触发元素命名 */
}

.tooltip {
  position: absolute;      /* 必须是绝对/固定定位，否则锚点属性全部无效 */
  position-anchor: --btn;  /* 第二步：声明引用哪个锚点 */
  position-area: top;      /* 第三步：放在锚点上方，水平自动居中 */
  margin-bottom: 8px;      /* 与锚点拉开 8px 间距 */
}
```

预期效果：tooltip 出现在按钮正上方居中处；页面滚动时 tooltip 跟随按钮移动，全程无 JS。

几个硬性条件：

- 弹层必须是 `position: absolute` 或 `fixed`（锚点定位的本质是给绝对定位提供参照物）。
- 锚点元素必须先于弹层完成布局：一般要求锚点是弹层的祖先，或 DOM 中位于弹层之前（前兄弟最常见）。锚点写在弹层“后面”会导致引用失效。
- 锚点被 `display: none` 隐藏后，引用关系随之失效。

## 5. position-area：锚点周围的 3x3 网格

`position-area` 把锚点周围划分成 3x3 网格，由两个关键词组合定位，格式近似“块方向 + 行内方向”：

| 类别 | 关键词 | 示例 |
| --- | --- | --- |
| 物理方向 | `top` / `bottom` / `left` / `right` / `center` | `position-area: top;` |
| 逻辑方向 | `block-start` / `inline-end` ...（随书写模式翻转） | `position-area: block-start;` |
| 跨格 | `span-*`（占满该方向两格） | `position-area: bottom span-right;` |
| 自对齐 | `start` / `end` / `self-start` / `center` | `position-area: center;` |

```css
/* 上方居中 */
position-area: top center;

/* 下方，并向右拉伸到锚点右边缘 */
position-area: bottom span-right;

/* 锚点正右侧 */
position-area: right;

/* 完全居中覆盖在锚点上 */
position-area: center;
```

理解要点：`position-area` 选中区域后，浏览器会自动把弹层的 inset 与对齐方式调整为“填入该区域”，所以它一个属性就替代了“JS 算坐标 + 算居中”两步。它的选区思路与 Grid 的模板区域一致（`css/023-CSS3GridGridLayout`）。

## 6. anchor()：精细对齐到锚点的某条边

需要“弹层左边缘对齐锚点右边缘”这类精确控制时，用 `anchor()` 函数读取锚点的边线坐标，写在 inset 属性（`top` / `right` / `bottom` / `left` 及逻辑对应物）里：

```css
.popover {
  position: absolute;
  position-anchor: --btn;
  left: anchor(right);        /* 左边缘对齐锚点右边缘 */
  top: anchor(bottom);        /* 上边缘对齐锚点下边缘 */
  margin: 8px;                /* 与锚点保持间距 */
}
```

```css
/* 语法：anchor(<side>, <回退值>?) */
left: anchor(--other left, 50px); /* 显式指定别的锚点；查不到时回退 50px */
top: anchor(center);              /* 锚点垂直中线 */
```

使用限制（常见报错来源）：

- `anchor()` 只能用在 inset 属性中，不能写在 `width`、`margin` 里（尺寸场景用 `anchor-size()`）。
- 方向要匹配轴：`top` / `bottom` 属性里只能用垂直侧（`top`/`bottom`/`center` 等），水平轴同理；跨轴写法整条声明无效。
- 未设置 `position-anchor` 时，`anchor()` 必须显式写锚点名。

## 7. anchor-size() 与 anchor-center

`anchor-size()` 把锚点的宽/高当作长度值使用，适合“弹层和触发按钮一样宽”这类需求：

```css
.menu {
  position: absolute;
  position-anchor: --btn;
  position-area: bottom span-right;
  width: anchor-size(width); /* 宽度 = 锚点宽度 */
}
```

参数可用 `width` / `height`（物理）或 `block` / `inline`（逻辑），同样支持回退值：`anchor-size(width, 200px)`。

另一个好用的小特性是 `anchor-center` 对齐值，让元素相对锚点精确居中：

```css
.popover {
  position: absolute;
  position-anchor: --btn;
  left: anchor(right);
  align-self: anchor-center; /* 相对锚点垂直居中 */
}
```

## 8. 防溢出：position-try 系列

弹层在视口边缘放不下时，`position-try-fallbacks` 让浏览器自动尝试备选方案：

```css
.popover {
  position: absolute;
  position-anchor: --btn;
  position-area: bottom;
  position-try-fallbacks: flip-block; /* 下方放不下时翻转到上方 */
}
```

- 内置翻转策略（try-tactic）：`flip-block`（块方向翻转）、`flip-inline`（行内方向翻转），可组合写 `flip-block flip-inline`。
- 旧教程里的 `position-try-options` 是该属性规范早期的名字，现行标准为 `position-try-fallbacks`，别再使用旧名。
- 自定义回退用 `@position-try` 规则。规则内允许写的“描述符”有六类：`position-anchor`、`position-area`、inset 属性（`top`/`left`/`inset` 等，可用 `anchor()` 取值）、margin 属性、尺寸属性（`width`/`height` 及 `min-`/`max-` 前缀，可用 `anchor-size()` 取值）、自对齐属性（`align-self`/`justify-self`，可用 `anchor-center`）：

```css
@position-try --bottom-full-width {
  position-area: bottom span-all; /* 尝试横向占满 */
  width: anchor-size(width);      /* 尺寸描述符也可以改：宽度取锚点同宽 */
  margin: 8px;
}

.popover {
  position-try-fallbacks: flip-block, --bottom-full-width;
}
```

两条使用要点：自定义回退方案生效时，`@position-try` 内的描述符优先于元素本身的同名属性（相当于“临时改写”）；未被描述符覆盖的属性沿用元素原值，所以上面例子常配合 `position-area: none` 这类写法显式取消之前的定位。

- `position-try-order: most-height | most-width | most-block-size | most-inline-size` 控制多个回退方案的挑选依据（比如“哪个方案空间大用哪个”）。`position-try` 简写可同时声明顺序与回退列表：`position-try: most-width flip-block, --bottom-full-width;`
- `position-visibility: anchors-visible` 可让锚点滚出视口时隐藏弹层，避免“锚点没了弹层还挂在半空”。

## 9. 与 Popover API 搭配

锚点定位只管“贴在哪”，显示/隐藏与顶层层级交给 Popover API（`css/065-CSSNewFeatures` 中有该 API 的介绍）：

```html
<button popovertarget="menu">操作</button>
<div id="menu" popover class="menu">
  <button>重命名</button>
  <button>删除</button>
</div>
```

```css
.menu {
  width: anchor-size(width);
  position-area: bottom span-right;
  margin-top: 8px;
}
```

一个省属性的知识点：由 `popovertarget` 触发的弹层，触发按钮会自动成为它的“隐式锚点”，连 `anchor-name` / `position-anchor` 都可以不写。上面例子能直接工作，就是靠隐式锚点机制。

预期效果：点击按钮，面板出现在按钮下方同宽处，置于顶层，按 Esc 关闭；零 JS。

## 10. 常见陷阱

| 陷阱 | 症状 | 原因与解法 |
| --- | --- | --- |
| 忘写 `position: absolute/fixed` | 所有锚点属性看似“无效” | 锚点定位只作用于绝对/固定定位元素 |
| 弹层写了旧属性 `inset-area` | 完全不生效 | 规范已改名 `position-area`，旧名未进稳定版 |
| 锚点写在弹层之后 | 引用失效，弹层回退到普通静态位置 | 保证锚点先布局：做祖先或前兄弟 |
| 锚点 `display: none` | 引用失效 | 隐藏锚点时同步隐藏弹层 |
| `anchor()` 写进 width/margin | 声明无效 | inset 属性用 `anchor()`，尺寸用 `anchor-size()` |
| `anchor(top)` 写在 `left` 属性里 | 整条声明无效 | 轴要匹配：水平轴配水平侧 |
| 嵌套弹层共享锚点名 | 互相覆盖、指向错乱 | 命名带组件前缀，如 `--user-card-trigger` |

## 11. 不支持时的回退策略

```css
.tooltip {
  position: absolute;
  bottom: calc(100% + 8px); /* 回退方案：相对父容器定位，非精确跟随 */
  left: 50%;
  transform: translateX(-50%);
}

@supports (anchor-name: --a) {
  .tooltip {
    bottom: auto;
    left: auto;
    transform: none;
    position-anchor: --trigger;
    position-area: top;
    margin-bottom: 8px;
  }
}
```

原则：先写一个“够用的静态回退”，再在 `@supports` 内启用锚点方案做渐进增强。组件库通常保留原 JS 定位逻辑，在支持锚点定位的环境切换为纯 CSS。

## 动手试试

1. 给按钮和 tooltip 建立锚点关系，轮换 `position-area` 的八个方位观察效果；
2. 用 `anchor()` 实现“弹层左边缘贴齐按钮右边缘 + 垂直居中”（`anchor()` + `align-self: anchor-center`）；
3. 把窗口不断压窄，验证 `position-try-fallbacks: flip-block` 的自动翻转；
4. 用 `anchor-size(width)` 做一个与按钮同宽的下拉菜单；
5. 进阶挑战：`popover` + 隐式锚点 + `@position-try` 实现无 JS、防溢出的下拉菜单。

## 核心知识点

> 一句话记住锚点定位：anchor-name 命名锚点，position-anchor 引用，position-area 定方位，anchor()/anchor-size() 精细取值，position-try 防溢出。

- `anchor-name: --x` 命名（`--` 开头），`position-anchor: --x` 引用，弹层必须 absolute/fixed；
- `position-area` 是锚点周围的 3x3 网格选区，支持 `span-*` 跨格；
- `anchor()` 读边线（只用于 inset 属性、轴要匹配），`anchor-size()` 读尺寸；
- `position-try-fallbacks` + `@position-try` + `position-try-order` 构成溢出回退体系；
- `position-visibility: anchors-visible` 处理锚点滚出视口的情况；
- 与 Popover API 搭配（隐式锚点）可实现零 JS 弹层；
- 2025 年进入 Baseline Newly Available（Chrome/Edge 125 起，Safari/Firefox 2025 年内跟进），用 `@supports` 做渐进增强。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 老浏览器不支持 | 弹层位置失效 | 静态回退 + `@supports` 渐进增强 |
| 引用旧名 inset-area | 稳定版无效 | 统一使用 `position-area` |
| 锚点 display:none | 引用关系失效 | 确保锚点可见，或同步隐藏弹层 |
| 忘记设置 position | position-anchor 无效 | 弹层必须 absolute/fixed |
| 大量弹层共用锚点 | 命名冲突 | 命名遵循组件前缀约定 |

## 扩展学习

- 定位体系：`css/015-PositionDetailed`；
- 新特性总览：`css/065-CSSNewFeatures`；
- 层叠上下文与弹层层级：`css/017-StackingContext`；
- 特性检测：`css/041-FeatureQuery`；
- 可访问性样式：`css/046-AccessibleStyling`。
