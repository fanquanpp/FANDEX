---
order: 600
title: BEM 命名方法论
module: 'css'
category: 前端技术
difficulty: intermediate
description: BEM 命名方法论完整教学：Block/Element/Modifier 三层解剖、命名规则与反例、与嵌套/@layer 的配合，以及团队落地清单。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/560-CSSArchitectureMethodology'
  - 'css/480-CSSNativeNesting'
  - 'css/720-CSSNestingInPractice'
  - 'css/620-CSSModules'
  - 'css/610-CSSAtomic'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/170-PriorityCalculation'
---

## 1. 学习目标与痛点引入

读完本篇你应该能：

- 用 Block/Element/Modifier 三层模型给任意组件命名；
- 识别“元素套元素”“为结构写样式”等典型 BEM 反模式；
- 把 BEM 与原生嵌套、`@layer` 组合成完整的样式隔离方案。

先看没有命名约定时的经典事故。两个同事各写了一个列表：

```css
/* A 的样式 */
.list .item {
  color: #333;
}

/* B 后来加的样式，想让自己模块的列表项是蓝色 */
.content .list .item {
  color: blue; /* 依赖层级堆叠抢权重 */
}
```

半年后这个页面上出现第三个列表，上述两条规则都在命中它——没人敢删，只好再堆一层 `.content .new-list .list .item`。这就是**选择器权重军备竞赛**：样式的作用范围由 DOM 结构隐式决定，谁都能通过加深层级覆盖别人。

BEM 的解法很直接：**每个类名自带完整身份，样式只认类名、不认 DOM 层级**。类名即文档、权重恒定、作用域由约定保证。

## 2. 三层模型解剖

```text
.block__element--modifier
  |      |          |
  块     元素       修饰符
```

| 角色 | 含义 | 判断标准 | 示例 |
| --- | --- | --- | --- |
| Block（块） | 独立可复用的组件 | 挪到页面任何位置都有意义 | `.card`、`.tabbar`、`.avatar` |
| Element（元素） | 块的组成部分，离开块无意义 | 单独拿出去没有语义 | `.card__title`、`.card__body` |
| Modifier（修饰符） | 块或元素的某种状态/变体 | 回答“哪个样子/哪种状态” | `.card--featured`、`.card__title--large` |

两个分隔符的读法：`__` 读作“的组成部分”，`--` 读作“的变体”。于是 `.card__title--large` 自解释为“card 的 title 的大字号变体”。

一个自测：给“登录弹窗里的提交按钮”命名——块是 `.auth-modal`，元素是 `.auth-modal__submit`。如果发现类名里出现两级 `__`（如 `.card__body__title`），那是反模式，下一节讲怎么改。

## 3. 命名规则与正反例

### 3.1 基础命名

```css
/* Block：名词，独立语义 */
.card { }
.nav { }

/* Element：block__element，不用描述层级 */
.card__title { }
.card__body { }
.card__footer { }

/* Modifier：block--modifier 或 block__element--modifier */
.card--featured { }          /* 块的变体 */
.card__title--large { }      /* 元素的变体 */
.card--dark { }              /* 状态型修饰符 */
```

### 3.2 反模式一：元素不嵌套元素

```css
/* 错误写法：层级被写死在类名里 */
.card__body__title { }

/* 正确写法：元素只属于块，无论 DOM 嵌多深 */
.card__title { }
```

BEM 的 element 表达的是“**属于哪个块**”，不是“DOM 路径”。DOM 结构变了类名不用动——这正是它优于“层级选择器”的地方。

### 3.3 反模式二：为结构写样式

```css
/* 错误写法：这其实是把 flex 布局信息编进了“块”名 */
.card__left { }
.card__right { }

/* 正确写法：按“是什么”命名，布局交给块自身的样式或工具类 */
.card__media { }
.card__content { }
```

`left/right` 会随方向、布局调整失去意义；`media/content` 永远成立。

### 3.4 状态修饰符与“混用”（mix）

真实组件常有“同一个节点既是一个块，又是另一个块的元素”——BEM 允许两类名共存（混用）：

```html
<!-- menu 是独立块，同时作为 page-header 的元素 -->
<nav class="menu page-header__menu">...</nav>
```

```css
.menu { display: flex; gap: 8px; }          /* 块自己的通用样式 */
.page-header__menu { margin-left: auto; }    /* 在 page-header 里的位置样式 */
```

这样“菜单的通用长相”与“页头对它的摆放”解耦，`.menu` 在别处复用不受影响。

## 4. 完整示例：卡片组件

```html
<div class="card card--featured">
  <div class="card__header">
    <h2 class="card__title card__title--large">标题</h2>
    <span class="card__badge">推荐</span>
  </div>
  <div class="card__body">
    <p class="card__text">内容摘要……</p>
  </div>
  <div class="card__footer">
    <button class="card__button card__button--primary" type="button">操作</button>
  </div>
</div>
```

```css
/* 块：默认外观 */
.card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}

/* 块的变体：只叠加差异，不重写默认值 */
.card--featured {
  border-color: gold;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
}

/* 元素：全部扁平，权重都是 (0,1,0) */
.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card__title {
  font-size: 1.2rem;
  margin: 0;
}
.card__title--large {
  font-size: 1.5rem;
}
.card__badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: #fef3c7;
}
.card__text {
  color: #555;
  margin: 8px 0 0;
}
.card__button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.card__button--primary {
  background: #2563eb;
  color: white;
}

/* 状态：JS 切换修饰符类即可，不碰样式本体 */
.card--selected {
  outline: 2px solid #2563eb;
}
```

```javascript
// JS 交互只切换修饰符，样式与行为解耦
document.querySelector('.card').addEventListener('click', (e) => {
  e.currentTarget.classList.toggle('card--selected');
});
```

注意所有选择器权重都是单类 `(0,1,0)`——**在 BEM 体系里基本告别了优先级计算**，谁后加载谁生效的问题被压缩到“文件引入顺序”这一个维度，再配合 `@layer` 即可彻底确定（见第 6 节）。

## 5. 判断标准：什么时候新建一个 Block

初学者最常见的纠结是“这段样式算元素还是新块”。三条判据：

1. **可移植性**：把它单独拷到另一个页面，语义是否仍成立？成立则是块（`.avatar`）；只是“卡片里的头像”则是元素（`.card__avatar`）；
2. **复用次数**：相同结构出现两处以上，考虑抽块；
3. **状态归属**：如果某个“状态”其实是一种独立形态（如 `.modal` 与 `.drawer`），不要用修饰符硬凑，拆成两个块。

修饰符只表达“**同类的东西的变体**”，不表达“另一种东西”。

## 6. 与现代 CSS 能力的配合

### 6.1 BEM + 原生嵌套

嵌套负责“组织”，BEM 负责“隔离”。关键约定：**类名写全，不用 `&` 拼接**（原生 CSS 的 `&__title` 是无效语法，见 `css/480-CSSNativeNesting` 第 7 节）：

```css
.card {
  & .card__title {
    margin: 0;
  }
  &.card--featured .card__title {
    color: #b45309;
  }
}
```

更系统的组合规范见 `css/720-CSSNestingInPractice` 第 4 节。

### 6.2 BEM + @layer

把全站 BEM 样式放进 `components` 层，工具类放 `utilities` 层，覆盖关系不再依赖选择器写法：

```css
@layer reset, base, components, utilities;

@layer components {
  .card__title { font-size: 1.2rem; }
}

/* utilities 层永远赢：.mt-0 不需要 !important */
@layer utilities {
  .mt-0 { margin-top: 0; }
}
```

### 6.3 与 CSS Modules 的关系

CSS Modules 用构建期哈希实现机械隔离（`css/620-CSSModules`），BEM 用约定实现人文隔离。两者不冲突：很多团队在组件内用 CSS Modules、跨组件复用与全局形态用 BEM。选型对比：

| 方案 | 隔离手段 | 依赖 | 适用 |
| --- | --- | --- | --- |
| BEM | 命名约定 | 无 | 全栈通用、SSR/无构建场景友好 |
| CSS Modules | 哈希类名 | 构建链 | 组件化前端项目 |

## 7. 常见陷阱

| 陷阱 | 症状 | 原因与解法 |
| --- | --- | --- |
| `__` 多级嵌套命名 | 类名冗长且绑死结构 | 元素只属于块，一层 `__` |
| 用 left/right/top 命名 | 布局调整后语义失效 | 按“是什么”命名元素 |
| 修饰符堆叠代替新块 | `.btn--big--danger--round` | 变体是另一种东西时拆块 |
| 标签选择器混用 | 权重意外、复用受限 | 只用类选择器 |
| 修饰符不叠加默认类 | `.card--featured` 忘写 `.card` | 约定块与修饰符类同时挂 |
| 全站命名风格不一 | 同一页面两套分隔符 | 定 stylelint 规则统一 |

## 动手试试

1. 把一个“侧边栏 + 内容区”页面按 BEM 重新命名所有类；
2. 找出项目里权重超过 `(0,1,0)` 的选择器，用 BEM 扁平化改写；
3. 用“混用”手法实现“`.menu` 在页头里右对齐、在侧栏里纵向排列”；
4. 把 BEM 卡片样式放进 `@layer components`，验证工具类无 `!important` 覆盖；
5. 进阶挑战：对比同一个组件的 BEM 版与 CSS Modules 版，写出两者的适用边界。

## 核心知识点

> 一句话记住 BEM：Block 独立块、Element 双下划线只挂一层、Modifier 双横线表变体；样式只认类名不认层级，全站权重恒为单类。

- 命名模板：`.block__element--modifier`；`__` 表归属、`--` 表变体；
- 元素不嵌套元素、不为布局方位命名、变体≠另一种东西；
- “混用”解耦通用样式与摆放位置；
- JS 只切换修饰符类，样式与行为解耦；
- 与原生嵌套组合写全类名，与 `@layer` 组合消灭 `!important`；
- 需要“机械强制隔离”时升级到 CSS Modules。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 类名变长 | 书写成本上升 | 接受它换来的零冲突；编辑器补全缓解 |
| 只规范不校验 | 约定逐渐失守 | stylelint `BEM` 类插件固化 |
| 遗留代码混用 | 两套风格并存 | 新代码强制 BEM，触及处渐进迁移 |

## 扩展学习

- 架构方法论全景（SMACSS/ITCSS）：`css/560-CSSArchitectureMethodology`；
- 原生嵌套与 BEM 组合：`css/480-CSSNativeNesting`、`css/720-CSSNestingInPractice`；
- CSS Modules（构建期隔离）：`css/620-CSSModules`；
- 原子化 CSS（另一种组织范式）：`css/610-CSSAtomic`；
- 层叠层：`css/450-CascadeLayer`。
