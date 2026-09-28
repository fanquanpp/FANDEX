---
order: 220
title: 定位详解
module: 'css'
category: 前端技术
difficulty: intermediate
description: "从「头像右上角的红点角标」「滚到哪都吸住的表头」「贴着屏幕右下角的回到顶部按钮」三个真实需求出发，一次讲透 static/relative/absolute/fixed/sticky 五种参照系、inset 简写与居中套路，并给出 absolute 不听话、sticky 失效、fixed 被 transform 劫持这三类经典事故的排查路径。"
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/230-StackingContext'
  - 'css/240-CSS3FlexboxFlexLayout'
  - 'css/470-CSSAnchorPositioning'
  - 'css/700-Transform3D'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/050-CSS3BoxModelDetailed'
---

## 前置知识

- 已完成 [CSS3 盒模型详解](/css/050-CSS3BoxModelDetailed)：知道盒子有内容、内边距、边框即可；
- 悬浮菜单这类「该谁出场」的选择题，第 7 节有决策表，不要求先学 Flex。

## 学习目标

读完本文你将能够：

1. 用「参照系」一句话区分五种 position 值，拿到悬浮需求立刻选对值；
2. 做出角标、全屏遮罩、吸顶表头、回到顶部按钮四个高频组件；
3. 解释为什么「absolute 不听话」十有八九是父元素忘了 `relative`；
4. 说出 sticky 失效的两个原因（没给阈值、父容器 overflow）与 fixed 被 transform 祖先劫持的原理；
5. 用变量管理 z-index，知道 z-index 只在同一层叠上下文内比大小。

预计 40 到 60 分钟，含 1 组动手实验与 4 道练习。

## 1. 问题引入：三个悬浮需求，一套参照系

三个真实需求：消息图标右上角要一个未读数角标；长表格滚动时表头要一直吸在顶部；页面右下角要一个「回到顶部」按钮，滚多远都在。

用 margin 硬怼当然能凑合，但角标会跟着文档流挪、表头滚走就没了、按钮滚上去就看不见。这类「元素不该被文档流推着走」的需求，CSS 的答案是 **position**：五种取值，本质是五套「以谁为准」的参照系。选对了值，剩下只是填坐标。

## 2. 最小示例：头像角标

新建文件夹 `position-experiment`，`index.html` 的 body：

```html
<div class="avatar">
  <img src="avatar.png" alt="头像" />
  <span class="badge">3</span>
</div>
```

`styles.css`：

```css
.avatar {
  position: relative; /* 声明自己当参照物 */
  width: 64px;
  height: 64px;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}

.badge {
  position: absolute; /* 找最近的定位祖先入座 */
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}
```

预期效果：红色角标悬在头像右上角，略微出血。关键动作是两步配对——**父元素 `relative` 当锚，子元素 `absolute` 找锚**。把 `.avatar` 的 `position: relative` 删掉再刷新，角标会飞到整个页面的右上角：它找不到定位祖先，退而求其次认了初始包含块。这就是「absolute 不听话」的全部真相。

## 3. 核心概念

### 3.1 五种值，五张参照表

| 值 | 脱离文档流 | 参照物 | 典型用途 |
| --- | --- | --- | --- |
| `static` | 否 | 无（默认，top/left 无效） | 普通排版 |
| `relative` | 否（原位保留） | 自身原本的位置 | 微调 + 给 absolute 当锚 |
| `absolute` | 是 | 最近的**非 static** 祖先 | 角标、遮罩、装饰 |
| `fixed` | 是 | 视口（例外见 3.4） | 回到顶部、悬浮客服 |
| `sticky` | 否（阈值前） | 最近的滚动容器 | 吸顶表头、侧栏跟随 |

偏移属性 `top / right / bottom / left`（或简写 `inset`）只在非 static 时生效。`inset: 0` 等于四个方向全 0，配合 `margin: auto` 还能做有宽高的居中。

### 3.2 relative 与 absolute：锚与钉

relative 是唯一「不脱流」还能偏移的值：`top: 10px` 让元素从原位置往下挪 10px，**原来的坑还留着**，邻居不受影响。所以它最常见的用途不是偏移，而是「声明自己可以被子孙当锚」。

absolute 脱流后不再占据空间，邻居会补上来；宽高默认收缩为内容大小。四个方向同时约束时（如 `inset: 0`）元素被「拉伸」填满参照区，全屏遮罩就是这一招：

```css
.overlay {
  position: absolute;
  inset: 0;              /* 拉满整个参照祖先 */
  background: rgb(0 0 0 / 0.4);
}
```

### 3.3 居中的两代写法

```css
/* 传统：50% 平移，宽度未知也能居中 */
.center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 现代：四边拉伸 + auto margin，需要显式宽高 */
.center-inset {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 200px;
  height: 120px;
}
```

定位居中解决「悬浮元素居中」；如果是常规排版内的居中，Flex 一行 `align-items: center` 更省心（见 [Flexbox](/css/240-CSS3FlexboxFlexLayout)），两者是互补不是替代。

### 3.4 fixed：视口的宠儿与例外

fixed 参照视口，滚动时不动，适合回到顶部按钮：

```css
.to-top {
  position: fixed;
  right: 24px;
  bottom: 24px;
}
```

但有一个大例外：**任何祖先带了 `transform`、`filter`、`will-change: transform` 等属性，fixed 就改认这个祖先为包含块**，「贴视口」变成「贴那个祖先」，滚动时按钮跟着祖先一起跑。这不是 bug 而是规范行为——这些属性会创建包含块。中招后的修复是调整 DOM 层级，把 fixed 元素挪出带 transform 的祖先。

### 3.5 sticky：阈值前是文档流，触发后贴住

```css
thead th {
  position: sticky;
  top: 0;            /* 必须给阈值，不写等于没设 */
  background: #fff;  /* 不给底色会透出滚过的行 */
  z-index: 1;
}
```

sticky 平时完全按文档流排版，滚动到达 `top` 阈值后「吸附」住，超出父容器边界就跟着父容器走。两个失效高发点：忘了写阈值；任一祖先 `overflow: hidden/auto/scroll` 让它吸在错误的滚动容器上（父容器只是想裁剪时，用 `overflow: clip` 替代，它不创建滚动容器、不影响 sticky）。

### 3.6 z-index：只在同一张牌桌上比大小

```css
:root {
  --z-dropdown: 100;
  --z-modal: 300;
  --z-toast: 400;   /* 体系化的层级，拒绝 99999 魔法数字 */
}
```

三条铁律：z-index 只对定位元素（或 flex/grid 子项）生效；比较只在**同一个层叠上下文**内进行，子元素赢不了外面的世界；`opacity` 小于 1、`transform`、`filter`、`isolation: isolate` 都会创建新的层叠上下文——「写了 z-index 却被压住」，先查它是不是被某个新上下文关在了里面。完整规则见 [层叠上下文](/css/230-StackingContext)。

## 4. 修改实验

对第 2 节的角标动手，每步先预测再刷新：

1. 删掉 `.avatar` 的 `position: relative`：角标飞到页面右上角——验证参照系回退；
2. 角标改用 `bottom: -4px; left: -4px`：挪到左下角——absolute 的四角任你挑；
3. 新建一个空 `div` 用 `inset: 0` 铺满 `.avatar` 并给半透明背景：得到「头像点亮遮罩」；
4. 给 `.avatar` 加 `transform: translateZ(0)`，再把角标改成 `position: fixed; top: 0; right: 0`：角标不再贴视口而是贴头像——亲手复现 transform 劫持 fixed。

## 5. 常见错误与调试实录

错误一：absolute 元素飘到页面角落。参照祖先缺位，退回初始包含块。排查：F12 选中该元素，逐层向上找有没有 `position` 非 static 的祖先；修复永远是给最近的合理父元素补 `relative`。

错误二：sticky 死活不吸。先查有没有写 `top`/`bottom` 阈值，再查祖先链上的 `overflow`（含 `overflow-x: hidden` 这种容易漏看的），最后确认滚动发生在哪个容器——sticky 认的是「最近的滚动祖先」，整页滚动和局部滚动行为不同。

错误三：fixed 元素跟着滚。八成是祖先里有 `transform`/`filter`/`will-change`（动画库或性能优化代码最爱顺手加）。DevTools 的 Computed 面板逐层检查祖先的 transform，找到后调整层级或改方案。

错误四：脱流元素不撑开父容器。absolute 子元素不计入父高度，父容器塌成 0，角标之外的「悬浮层」布局容易整块消失。修复：父容器显式给尺寸，或改用 grid/flex 参与布置。

错误五：z-index 军备竞赛。 modal 999、toast 9999，最后谁也压不住谁。根因多半是新层叠上下文被随手创建，根源治理用变量分层（3.6 的写法），疑难杂症翻 [层叠上下文](/css/230-StackingContext)。

## 6. 实际场景

- 组件级：角标（2 节）、输入框内嵌图标、卡片悬浮按钮——relative 加 absolute 的锚钉组合是组件里的日常；
- 页面级：全屏遮罩 `inset: 0`、回到顶部 `fixed`、移动端底部安全区悬浮条；
- 数据表格：sticky 表头加 sticky 首列（首列再加 `left: 0`），长表格的标配；
- 下一代的悬浮定位：弹出菜单「锚定到按钮」这类需求正在被 Anchor Positioning 接管，自动找空位、免手算坐标，见 [CSS 锚点定位](/css/470-CSSAnchorPositioning)——fixed 加手写坐标的方案会逐步让位。

## 7. 小练习

预测题（3 分钟）：`.parent { position: relative; }` 内有 `.child { position: absolute; bottom: 0; }`。child 贴的是谁的底？若把 parent 改回 static、页面 body 高 2000px，child 又贴谁的底？（前者贴 parent 的底；后者沿祖先链找不到定位元素，贴初始包含块即页面底。）

修改题（8 分钟）：把角标改成「数字大于 99 显示 99+」需要一点逻辑，纯 CSS 先跳过；改做「无未读时不渲染角标」——在 HTML 层面处理即可，思考为什么不该用 `display: none` 写死在 CSS 里。

修 Bug 题（10 分钟）：下面代码想做「表格滚动时表头吸顶」，症状是表头完全不吸。找出两处问题并修复：

```css
.table-wrap {
  overflow-x: hidden;
  max-height: 400px;
}
thead th {
  position: sticky;
  background: #fff;
}
```

（答案方向：th 没写 `top: 0` 阈值；`.table-wrap` 的 `overflow-x: hidden` 创建了滚动上下文且会连带 y 轴裁剪行为，sticky 判定的滚动容器错乱——裁剪需求改用 `overflow-x: clip`，或显式 `overflow-y: auto` 让 wrap 成为明确的滚动容器。）

挑战题（半小时，不看正文独立完成）：做一个「悬浮操作面板」：右下角 fixed 圆形按钮，点击后向上展开三个操作项（可用 `:checked` 或 `:has()` 配合，纯 CSS），面板带半透明遮罩。验收：滚动全程按钮钉在右下角、遮罩 `inset: 0` 铺满、按钮在遮罩之上（z-index 分层合理）、CSS 里至少一条注释解释层级设计。

## 8. 与之前和之后的知识的关系

- 之前：[盒模型详解](/css/050-CSS3BoxModelDetailed) 决定盒子的尺寸，absolute 元素的宽高收缩与拉伸也都按盒模型算；
- 并行：[层叠上下文](/css/230-StackingContext) 是 z-index 的完整规则书；[transform 与 3D 变换](/css/700-Transform3D) 解释 transform 为什么会改包含块；传统布局时代的图文环绕见 [浮动与清除](/css/200-FloatClear)；
- 之后：[CSS 锚点定位](/css/470-CSSAnchorPositioning) 把「悬浮层锚定触发元素」做成声明式能力；文字裁剪的兄弟话题 `clip-path` 属于视觉裁剪，见 [CSS Mask](/css/300-CSSMask)。

## 9. 官方文档

- MDN position 属性参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/position
- MDN「理解 CSS z-index」：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_positioned_layout/Understanding_z_index
- web.dev「Positioning」课程：https://web.dev/learn/css/position

## 10. 自我检查

- 能用一句「参照系」话术分别说清五种 position 值，并给角标、遮罩、回到顶部、吸顶表头各指定一个；
- 「absolute 不听话」的排查第一步是找定位祖先，「sticky 不吸」的排查前两步是阈值与祖先 overflow；
- 能复现并解释 transform 祖先劫持 fixed 的现象与修复；
- 知道 z-index 只在同层叠上下文内比较，能列出至少四个会创建新上下文的属性。

## 本章总结

position 的五种值就是五张参照表：static 无参照，relative 认自己的原位（兼职当锚），absolute 找最近定位祖先（父元素记得 relative），fixed 认视口（被 transform/filter 祖先劫持是唯一大例外），sticky 认滚动容器且必须给阈值。坐标用 top/right/bottom/left 或 `inset` 简写；居中两法（50% 平移、inset 加 auto margin）；z-index 用变量分层、只在同一上下文内比大小。悬浮定位的下一代方案是 Anchor Positioning，先知道有它，手写坐标前想想能不能交给浏览器。

## 下一步

进入 [层叠上下文](/css/230-StackingContext)：本文反复提到「同一张牌桌」，下一篇把这张牌桌的完整规则讲透——层叠顺序七层塔、上下文的创建条件与合成层的关系。
