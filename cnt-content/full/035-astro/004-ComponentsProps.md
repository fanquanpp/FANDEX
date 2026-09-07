---
order: 40
title: Astro 组件与 Props 插槽
module: 'astro'
category: 前端技术
difficulty: beginner
description: '通过"没有组件 vs 有组件"的对比理解组件化：组件三段式结构、Props 传参、Slot 插槽、模板语法与作用域样式'
author: fanquanpp
updated: '2026-08-30'
related:
  - 'astro/003-PagesRouting'
  - 'astro/006-IslandsClientComponents'
prerequisites:
  - 'astro/002-QuickStartProject'
---


## 0. 乐高零件与说明书：先理解"为什么要组件"

玩过乐高的人都知道：一套乐高不会把"整个城堡"做成一个巨大的模具，而是拆成一盒**通用零件**（标准砖块、门窗、人仔），再配一本**说明书**。你可以按说明书拼出城堡，也可以换个拼法拼出飞船——同一盒零件，千变万化。

网页开发中的"组件"就是乐高零件：

- **零件** = 组件：一段可复用的"结构 + 逻辑 + 样式"；
- **说明书** = Props（参数）：告诉零件"这次要搭成什么样子"——搭红色的还是蓝色的、上面写什么字；
- **插槽** = 零件上的"凹槽接口"：允许你把别的小零件插进去，组合成更大的结构。

本模块 002 篇里，我们是在"搭一座房"（项目）；本篇则深入"房子里的每一块零件"（组件）以及零件之间如何拼装（Props 与 Slot）。

## 1. 对比驱动：没有组件 vs 有组件

### 1.1 先看"没有组件"的写法

假设要做一个博客首页，展示三篇文章卡片。不使用组件的写法是在页面里反复粘贴相同的 HTML 结构：

```astro
---
// src/pages/index.astro（无组件版）
const posts = [
  { title: 'Astro 入门', desc: '认识岛屿架构' },
  { title: '路由详解', desc: '文件路由与动态路由' },
  { title: '内容集合', desc: '类型安全的内容管理' },
]
---

<h1>博客首页</h1>

<!-- 第一篇卡片：完整写一遍 HTML -->
<article class="card">
  <h2>{posts[0].title}</h2>
  <p>{posts[0].desc}</p>
</article>

<!-- 第二篇卡片：再完整写一遍 -->
<article class="card">
  <h2>{posts[1].title}</h2>
  <p>{posts[1].desc}</p>
</article>

<!-- 第三篇卡片：第三遍…… -->
<article class="card">
  <h2>{posts[2].title}</h2>
  <p>{posts[2].desc}</p>
</article>
```

问题显而易见：

第一，**重复**：同样的 `<article class="card">` 结构写三遍，如果以后要在卡片里加"标签"或"阅读时间"，每处都要改；

第二，**易错**：手忙脚乱中容易把 `posts[1]` 写成 `posts[0]`，数据错位很难发现；

第三，**不可扩展**：文章从 3 篇变成 30 篇，代码量随之爆炸。

### 1.2 再看"有组件"的写法

把卡片抽成一个组件 `Card.astro`，页面代码立刻变得简洁：

```astro
---
// src/pages/index.astro（组件版）
import Card from '../components/Card.astro'

const posts = [
  { title: 'Astro 入门', desc: '认识岛屿架构' },
  { title: '路由详解', desc: '文件路由与动态路由' },
  { title: '内容集合', desc: '类型安全的内容管理' },
]
---

<h1>博客首页</h1>

<!-- 用组件 + 数组循环，一行输出全部卡片 -->
{posts.map((post) => (
  <Card title={post.title} desc={post.desc} />
))}
```

对比结论：

- 页面只表达"是什么"（有哪些卡片），不关心"卡片长什么样"；
- 组件只表达"长什么样"（结构 + 样式），不关心"数据从哪来"；
- 以后要改卡片样式，只改 `Card.astro` 一个文件，全站生效。

这就是组件化的意义：**把重复封装起来，把变化暴露成参数**。

## 2. 组件文件结构：一个 .astro 文件的三段式

每个 `.astro` 组件由三部分组成，对应乐高零件的"模具、拼装、涂装"：

```astro
---
// 第一部分：组件脚本（frontmatter）
// 构建期在服务端执行：可导入模块、读取数据、定义变量
// 这段代码永远不会发送到浏览器
const greeting = '你好，Astro'
const now = new Date().toLocaleDateString('zh-CN')
---

<!-- 第二部分：组件模板（输出 HTML） -->
<div class="hello">
  <p>{greeting}</p>
  <p>今天：{now}</p>
</div>

<style>
  /* 第三部分：组件样式（默认自动作用域隔离） */
  .hello { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; }
  .hello p { margin: 0.25rem 0; }
</style>
```

讲解：

- **组件脚本**：`---` 围栏内的 JavaScript，在构建期运行。可以 `import` 其他组件、`fetch` 数据、读取文件，但不会打包进浏览器脚本；
- **组件模板**：HTML 加 `{表达式}`。模板只支持"表达式"（计算出一个值），不支持 `if`/`for` 等完整语句；
- **组件样式**：`<style>` 中的规则会被自动加上作用域标记（如 `.hello` 编译成 `.hello:where(.astro-abc123)`），只影响本组件内的元素，多个组件写同名类也不会互相污染。

## 3. 组件引用组件：零件的嵌套

### 3.1 导入与使用

```astro
---
// src/pages/index.astro
import Card from '../components/Card.astro'
import Header from '../components/Header.astro'
---

<Header siteName="我的博客" />

<Card title="文章一" desc="第一篇" />
<Card title="文章二" desc="第二篇" />
```

讲解：

- 在 frontmatter 中用 `import` 导入组件，模板中即可像使用 HTML 标签一样使用；
- 组件名约定使用 **PascalCase**（首字母大写），与原生 HTML 标签区分；
- 页面本身也是一种组件——`src/pages/` 下的页面文件与 `src/components/` 下的组件文件语法完全一致，区别只是"页面会生成 URL，普通组件不会"。

### 3.2 内置组件

Astro 提供三个无需导入的内置组件：

| 组件 | 用途 |
| --- | --- |
| `<Code />` | 代码高亮（Shiki，构建期完成，零脚本） |
| `<Image />`、`<Picture />` | 图片优化（压缩、响应式、防 CLS） |
| `<Debug />` | 开发调试（在页面上打印对象） |

## 4. Props：向组件传参（说明书）

### 4.1 定义 Props 并接收

```astro
---
// src/components/Card.astro
// 1. 用 interface Props 声明组件接受哪些参数及其类型
interface Props {
  title: string          // 必填参数
  desc?: string          // 可选参数（? 表示可省略）
  tags?: string[]        // 数组类型
  featured?: boolean     // 布尔类型
}

// 2. 从 Astro.props 解构取出参数，可同时设置默认值
const { title, desc = '暂无描述', tags = [], featured = false } = Astro.props
---

<article class={featured ? 'card featured' : 'card'}>
  <h2>{title}</h2>
  <p>{desc}</p>

  {tags.length > 0 && (
    <ul>
      {tags.map((tag) => <li>{tag}</li>)}
    </ul>
  )}
</article>

<style>
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; }
  .featured { border-color: #2563eb; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15); }
</style>
```

讲解：

- `interface Props` 与 TypeScript 语法一致，编辑器会提供完整补全与类型检查——传错类型、漏传必填参数，构建期/编辑时立刻报错；
- `Astro.props` 是组件接收到的全部参数的集合对象；
- 解构赋值时可以直接给默认值（`desc = '暂无描述'`），调用方没传时自动使用默认值。

### 4.2 使用组件并传参

```astro
---
// src/pages/index.astro
import Card from '../components/Card.astro'
---

<!-- 静态值：直接写 -->
<Card title="Astro 入门" desc="从零开始学习 Astro" />

<!-- 动态值：用 {} 包裹表达式 -->
<Card title={postTitle} tags={['框架', '教程']} />

<!-- 布尔参数：出现即 true -->
<Card title="置顶文章" featured />

<!-- 可选参数缺省：desc 使用默认值 -->
<Card title="无描述的卡片" />
```

讲解：

- 属性名使用 camelCase（驼峰式）；
- 静态字符串直接书写，动态值用 `{表达式}`；
- 布尔属性像 HTML 那样"写了就是 true"；
- 类型不符时构建期即报错，这是 Astro 组件的安全网。

## 5. Slot 插槽：零件上的凹槽

### 5.1 先直观理解 Props 与 Slot 的分工

- **Props 适合传"数据"**：标题、描述、数组、布尔值——适合告诉组件"内容是什么"；
- **Slot 适合传"一整块 HTML"**：当你希望组件"把我的内容放在指定的位置"时用插槽。比如布局组件需要把页面正文整体放进 `<main>` 中。

### 5.2 默认插槽

```astro
---
// src/components/Alert.astro
// 一个提示框组件：只负责"框"的样式，内容由调用方决定
---

<div class="alert">
  <slot />  <!-- 调用方写在组件标签之间的内容，渲染到这里 -->
</div>

<style>
  .alert {
    padding: 0.75rem 1rem;
    border-left: 4px solid #f59e0b;
    background: #fffbeb;
    border-radius: 4px;
  }
</style>
```

```astro
---
// src/pages/index.astro（使用方）
import Alert from '../components/Alert.astro'
---

<Alert>
  <strong>提示：</strong>这是一条自定义的提示内容。
</Alert>
```

渲染结果：

```html
<div class="alert">
  <strong>提示：</strong>这是一条自定义的提示内容。
</div>
```

讲解：`<slot />` 是插槽出口，组件标签之间的子内容会"流"到出口位置。这是布局组件（003 篇的 BaseLayout）实现"内容注入"的底层机制。

### 5.3 具名插槽：多个凹槽

一个组件需要多个占位区域时，用 `name` 属性区分：

```astro
---
// src/components/ArticleLayout.astro
interface Props { title: string }
const { title } = Astro.props
---

<article>
  <header>
    <slot name="header" />  <!-- 具名插槽：头部 -->
  </header>

  <h1>{title}</h1>

  <main>
    <slot />  <!-- 默认插槽：正文 -->
  </main>

  <footer>
    <slot name="footer" />  <!-- 具名插槽：页脚 -->
  </footer>
</article>
```

```astro
---
// src/pages/post.astro（使用方）
import ArticleLayout from '../components/ArticleLayout.astro'
---

<ArticleLayout title="插槽示例">
  <!-- 用 slot="名称" 属性定向到对应具名插槽 -->
  <span slot="header">发布于 2026-08-01</span>

  <!-- 未标注 slot 的内容自动进入默认插槽 -->
  <p>这里是正文内容。</p>
  <p>正文可以有多段。</p>

  <p slot="footer">版权信息</p>
</ArticleLayout>
```

讲解：通过 `slot="名称"` 把内容定向到对应具名插槽；未标注 `slot` 的内容全部进入默认插槽。页面骨架、文章布局类组件常用此模式组合头部、正文、侧栏等区域。

### 5.4 插槽回退内容：默认零件

```astro
---
// src/components/Alert.astro
---
<div class="alert">
  <!-- 调用方没传内容时，显示插槽内的回退内容 -->
  <slot>
    <strong>提示：</strong>这是一条默认提示。
  </slot>
</div>
```

讲解：插槽内可以写回退内容——调用方提供了内容就显示提供的，否则显示回退内容。适合为可选区域提供合理的默认值。

### 5.5 进阶：Astro.slots.render()

如果需要在组件脚本中把插槽内容当作字符串处理（例如传给第三方库），可以这样：

```astro
---
// src/components/Wrapper.astro
// 在组件脚本中异步渲染插槽内容
const headerHtml = await Astro.slots.render('header')
const hasFooter = Astro.slots.has('footer')
---
<div>
  <div set:html={headerHtml} />
  {hasFooter && <footer>有页脚内容</footer>}
</div>
```

讲解：`Astro.slots.render('名称')` 返回插槽渲染后的 HTML 字符串；`Astro.slots.has('名称')` 判断调用方是否提供了该插槽。这是高级用法，日常开发先用默认/具名插槽即可。

## 6. 模板中的常用表达式语法

| 语法 | 作用 | 示例 |
| --- | --- | --- |
| `{变量}` | 输出表达式结果 | `{title}` |
| `{条件 && <p>…</p>}` | 条件渲染（为真才渲染） | `{isLoggedIn && <p>已登录</p>}` |
| `{条件 ? A : B}` | 条件分支 | `{a > 0 ? '正数' : '非正数'}` |
| `{数组.map(x => …)}` | 列表渲染 | `{items.map(i => <li>{i}</li>)}` |
| `class={动态值}` | 动态属性 | `<div class={active ? 'on' : 'off'}>` |

注意：模板不支持 `if` / `for` 语句，只支持**表达式**（会计算出一个值的东西）。这是与 JSX 一致的规则，熟悉 React 的读者可以无缝迁移。

## 7. 作用域样式：零件的"涂装不串色"

### 7.1 自动 scoped

```astro
<style>
  /* 默认作用域：编译后自动变成 .card:where(.astro-xxxx) */
  .card { border: 1px solid #ddd; }
  h2 { margin: 0; }
</style>
```

讲解：组件内 `<style>` 的所有规则都会被自动加作用域，并且**不会向下穿透到子组件**。即使多个组件都写了 `.card`，也不会互相污染。这正是"零件涂装不串色"——每个组件的样式只属于自己。

### 7.2 全局样式的显式出口

```astro
<style>
  /* :global() 包裹的部分不做作用域处理，作用于全站 */
  :global(.markdown-body) h2 { font-size: 1.4rem; }

  /* 或者给整个 style 加 is:global 指令 */
  /* <style is:global> ... </style> */
</style>
```

讲解：`is:global` 与 `:global()` 是打破"组件隔离"的显式出口，常用于覆盖子组件样式或作用于 Markdown 渲染的全局内容。应谨慎使用——全局样式一旦失控，排查成本很高。

## 8. 组件实践建议

第一，**单一职责**：一个组件只做一件事。`Card` 只负责卡片展示，`Header` 只负责页头，不要混入不相关的逻辑；

第二，**数据向下传递**：页面持有数据，通过 Props 下发给展示型组件；不要在组件内部私自 fetch 与自身职责无关的数据；

第三，**Props 要收敛**：Props 数量过多（超过 5-6 个）时考虑拆分组件或传入对象；

第四，**样式随组件走**：默认 scoped 样式优先，全局样式只放主题级内容（颜色变量、字体、reset）；

第五，**命名清晰**：组件文件名用 PascalCase，如 `Pagination.astro`、`SearchBox.astro`，与页面文件区分。

## 9. 常见错误与对策表

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| Props 未声明类型直接使用 | 编辑器无提示，运行时不报错但易出错 | 忘记写 `interface Props` | 声明 `interface Props` 并解构 `Astro.props`，获得类型检查 |
| 忘记从 Astro.props 取参 | 模板中 `{title}` 空白 | 定义了 Props 但没解构赋值 | `const { title } = Astro.props` |
| 在模板里写 `if` 语句 | 编译报语法错误 | 模板只支持表达式，不支持语句 | 改用 `{条件 && …}` 或三元表达式 |
| 把函数/对象传给 HTML 元素属性 | 页面渲染异常或无效果 | HTML 属性只能接受字符串；`onClick` 等事件绑定不会生效 | 交互逻辑用 `<script>` 标签或 `client:*` 组件实现 |
| 组件 `<style>` 影响不到子组件 | 子组件样式没生效 | scoped 样式默认不穿透子组件 | 在父组件用 `:global()`，或在子组件内自行定义样式 |
| Slot 内容不显示 | 写了 `<Component>内容</Component>` 但页面没有内容 | 组件模板里忘了放 `<slot />` | 在组件模板的期望位置加上 `<slot />` |

## 11. 一句话记忆

**组件是乐高零件：Props 是说明书（传数据），Slot 是凹槽（插内容），`<style>` 是涂装（只属于自己）——把重复封装成零件，把变化暴露成参数。**
