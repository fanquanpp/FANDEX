---
order: 50
title: Astro 内容集合与 Schema
module: 'astro'
category: 前端技术
difficulty: intermediate
description: 以知识管理者的困惑为引，讲解内容集合：content.config.ts、glob loader、zod schema 校验、getCollection 查询、render 渲染与 Live Content Collections
author: fanquanpp
updated: '2026-09-12'
related:
  - 'astro/030-PagesRouting'
  - 'astro/060-IslandsClientComponents'
prerequisites:
  - 'astro/020-QuickStartProject'
---


## 0. 一个知识管理者的困惑

小林是一家公司的知识管理员，负责维护公司内部的文档库。文档库刚建立时只有十几篇 Word 文档，他手动整理还忙得过来。随着团队扩张，文档涨到了 500 篇，问题开始爆发：

- 有的文档标题写错了，有的忘了写作者，有的日期格式是"2026/08/01"，有的是"2026年8月1日"；
- 每次想"找出所有 Python 相关的教程"，他都要打开每个文件翻一遍；
- 新同事入职时误改了旧文档的格式，目录索引完全乱了；
- 更糟的是，很多错误要等读者点开文档才发现，没人提前把关。

小林的困惑，本质上是**内容管理失控**的典型症状。而 Astro 的内容集合（Content Collections）就是为这个问题而生的解决方案——它像一个**图书馆编目系统**：

- 每本书（Markdown 文档）必须有**标准借书卡**（frontmatter 元数据）；
- 图书馆制定**分类规则**（schema 校验），书名、作者、日期、标签的格式全部统一，不符合规则的书**根本不让上架**（构建失败）；
- 读者通过**检索目录**（getCollection 查询 API）按分类、标签、日期快速找到书；
- 馆员（开发者）还可以随时把外部数据库、CMS 的内容"并入馆藏"（loader）。

从这篇开始，你将掌握让 500 篇、甚至 2000+ 篇文档（FANDEX 文档站的规模）保持秩序的核心工具。

## 1. 内容集合是什么

### 1.1 先直观理解

内容集合（Content Collections）就是把一批结构相似的 Markdown / MDX / JSON 文件**组织起来，统一做类型校验与查询**的机制。它是文档站、博客的"馆藏数据库"。

### 1.2 再讲原理：它解决内容站的三大痛点

第一，**元数据失控**：frontmatter 字段缺失、类型写错，只有渲染时才暴露，甚至悄悄埋雷；

第二，**查询零散**：每个页面各自读文件、解析，代码重复且易错；

第三，**无类型安全**：编辑器和编译器不知道文档里有什么字段，改字段名全靠记忆。

内容集合的解法：用 schema（基于 Zod 的类型校验库）为文档定义"数据结构"，加载时校验，查询时返回带类型的对象。**错误在构建期就被拦住，而不是在用户浏览器里爆炸。**

### 1.3 什么情况下该用集合

适合用内容集合：博客文章、课程文档、产品说明、新闻稿——**同一模板、大量相似文档**。

不适合用内容集合：首页、关于页等**单独页面**（这些直接放 `src/pages/` 即可，见 003 篇）。

## 2. 配置内容集合：建立馆藏目录

### 2.1 创建配置文件

Astro 5 开始，在项目根目录（或 `src/` 下）创建 `content.config.ts`（或 `.mjs` / `.js`）：

```ts
// content.config.ts
import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'   // Astro 6 起 z 改从 astro/zod 导入（5.x 从 astro:content 导入的写法已弃用）
import { glob } from 'astro/loaders'

// 定义 blog 集合：用 glob loader 加载 src/content/blog/ 下的 Markdown 文件
const blog = defineCollection({
  // loader：声明"内容从哪里来、如何加载"
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  // schema：声明每篇文档的 frontmatter 必须长什么样
  schema: z.object({
    title: z.string(),                       // 必填：字符串
    description: z.string().optional(),      // 可选：字符串
    pubDate: z.coerce.date(),                // 必填：日期（字符串自动转 Date）
    tags: z.array(z.string()).default([]),   // 可选：字符串数组，默认空数组
    draft: z.boolean().default(false),       // 可选：布尔值，默认 false
    author: z.enum(['小林', '阿禾', 'FANDEX']), // 可选：枚举，只能取列出的值
  }),
})

// 导出 collections，把集合注册给 Astro
export const collections = { blog }
```

讲解：

- `defineCollection` 接收两个关键配置：`loader`（内容来源）与 `schema`（数据结构）；
- `z` 是内置的 Zod 库：Astro 5 从 `astro:content` 重新导出，**Astro 6 起改从 `astro/zod` 导入**（同时升级到 Zod 4，个别 API 有差异，如顶层 `z.email()` 取代 `z.string().email()`）；
- `z.coerce.date()` 会把 `"2026-08-01"` 这样的字符串自动转换为 `Date` 对象；
- `default()` 为缺失字段提供默认值——**新增字段时一定要给默认值**，否则存量文档会全部校验失败；
- `z.enum([...])` 限定取值范围，比如 author 只能填列出的几个名字，杜绝"阿和""阿禾"混用。

### 2.2 loader 的类型对比

| Loader | 适用场景 | 说明 |
| --- | --- | --- |
| `glob()` | 本地多个 Markdown/MDX/JSON 文件 | 按 glob 模式匹配文件，最常用 |
| `file()` | 单个 JSON/YAML 文件 | 从一个文件加载整组数据（如"国家列表"） |
| 自定义 loader | CMS、数据库、REST API | 实现 loader 函数，从任意数据源拉取并转换 |
| live loader | 需要实时更新的远程内容（Astro 6+） | 请求时实时拉取，无需重新构建（见第 8 节） |

`glob()` 的两个关键参数：

```ts
glob({
  pattern: '**/*.md',        // 匹配的文件模式（** 表示任意子目录）
  base: './src/content/blog', // 起始目录（相对于项目根）
})
```

FANDEX 文档站即用 `glob()` 加载 `cnt-content/full` 目录下的 2000+ 篇 Markdown 文档。

## 3. 文档的 frontmatter 规范：标准借书卡

集合内每篇文档的 frontmatter 必须通过 schema 校验：

```md
---
title: 内容集合使用指南
description: 学习如何定义 schema 并查询内容
pubDate: 2026-08-01
tags:
  - Astro
  - 内容
draft: false
author: FANDEX
---

这里是文档正文。frontmatter 与正文之间用空行分隔。

- frontmatter 以 `---` 包裹，字段必须符合 schema 声明；
- 缺少必填字段、类型错误，都会导致**构建失败**并给出精确报错（哪个文件、哪个字段、期望什么类型）；
- schema 未声明的字段不会报错，而是被 Zod **静默剥离**（不会出现在 `data` 里）——想让"多写未知字段"也报错，可用 `z.object({...}).strict()`；
- 编辑器装上 Astro 扩展后，写文档时就有字段补全提示。
```

一个常见的新手困惑：**"schema 里没声明的字段写了会怎样？"** 默认会被静默剥离——数据不丢文件，但 `post.data.某字段` 取不到值，往往表现为"页面悄悄少了一块内容"。要么把字段补进 schema，要么用 `.strict()` 让它在构建期暴露，别让它隐身。

## 4. 查询内容：getCollection 与 getEntry

### 4.1 查询全部并排序

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content'

// 查询 blog 集合的全部条目
const posts = (await getCollection('blog'))
  // 过滤草稿：只显示已发布的文章
  .filter((post) => !post.data.draft)
  // 按发布日期倒序（最新在前）
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
---

<ul>
  {posts.map((post) => (
    <li>
      <a href={`/blog/${post.id}/`}>{post.data.title}</a>
      <time datetime={post.data.pubDate.toISOString()}>
        {post.data.pubDate.toLocaleDateString('zh-CN')}
      </time>
    </li>
  ))}
</ul>
```

讲解：`getCollection('blog')` 返回条目数组，每条包含：

- `id`：由文件路径生成（如 `guide/first-post`）；
- `data`：校验后的 frontmatter，类型与 schema 完全一致；
- `body`：文档正文原始内容（字符串）。

### 4.2 带过滤条件的查询

```ts
import { getCollection } from 'astro:content'

// 第二个参数是过滤函数：只返回 tags 包含 'Astro' 的条目
const astroPosts = await getCollection('blog', ({ data }) =>
  data.tags.includes('Astro')
)

// 组合过滤：Astro 标签且未发布为草稿
const publishedAstroPosts = await getCollection('blog', ({ data }) =>
  data.tags.includes('Astro') && !data.draft
)
```

讲解：过滤函数的返回值会收窄类型——`astroPosts` 的 `data.tags` 一定是 `string[]`，编辑器会给出精确补全，无需手动断言。

### 4.3 查询单条：getEntry

```ts
import { getEntry } from 'astro:content'

// 按集合名 + id 查询单条
const post = await getEntry('blog', 'guide/first-post')
// 返回 null 表示不存在
if (!post) {
  // 处理不存在的情况
}
```

讲解：`getEntry` 适合"已知 id 取单条"的场景，例如动态路由页面 `blog/[slug].astro` 内部（见 003 篇第 8 节）。

## 5. 渲染内容：render 与 <Content />

### 5.1 渲染单篇文章

```astro
---
// src/pages/blog/[slug].astro
// 动态路由 + 内容集合：一篇文档一个页面
import { getCollection, render } from 'astro:content'
import BaseLayout from '../../layouts/BaseLayout.astro'

// 构建期：为每篇文档生成一个页面
export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }))
}

const { post } = Astro.props
// render：把 Markdown 正文编译为可渲染的组件
const { Content, headings } = await render(post)
---

<BaseLayout title={post.data.title} description={post.data.description}>
  <article>
    <h1>{post.data.title}</h1>

    <p>
      发布于 {post.data.pubDate.toLocaleDateString('zh-CN')}
      · 标签：{post.data.tags.join(' / ')}
    </p>

    <!-- 正文输出点 -->
    <Content />

    <!-- headings：标题目录树，适合做文章目录导航 -->
    <nav>
      {headings.map((h) => (
        <a href={`#${h.slug}`}>{h.text}</a>
      ))}
    </nav>
  </article>
</BaseLayout>
```

讲解：

- `render(post)` 把 Markdown 正文编译为渲染组件 `<Content />`；
- `render` 还返回 `headings`（标题目录树，供目录组件使用）与 `remarkPluginFrontmatter`（插件附加数据）；
- 与 003 篇的动态路由配合，实现"一篇文档一个页面"的完整闭环。

### 5.2 render 的其他用途

```ts
const { Content, headings, remarkPluginFrontmatter } = await render(post)
```

- `headings`：`{ depth, slug, text }` 数组，是"文章目录"组件的数据源；
- `remarkPluginFrontmatter`：remark 插件产生的附加数据，可传递阅读时间、字数统计等。

## 6. 类型安全：schema 即契约

`schema` 的类型会自动推断到查询结果：定义集合时写一次 Zod schema，全项目所有 `getCollection` / `getEntry` 的返回值都带上精确类型。修改 schema 后，运行 `npx astro check` 能立刻找出所有字段用法不一致的代码位置。

```ts
// schema 变更后的类型即时生效
post.data.pubDate        // 类型为 Date，可调用 toISOString() / toLocaleDateString()
post.data.tags           // 类型为 string[]
post.data.author         // 类型为 '小林' | '阿禾' | 'FANDEX'
post.data.draft          // 类型为 boolean
```

## 7. 实践建议：让内容秩序长期有效

第一，**schema 是契约，字段只增不删**：新增字段必须带 `default`，否则存量文档全部构建失败；删除字段会导致查询代码报错，先排查引用点再删；

第二，**索引字段齐全**：`order`、`title`、`description` 等导航所需字段必须在 schema 中声明——FANDEX 的目录与面包屑完全由这些字段驱动；

第三，**正文与元数据分离**：正文负责内容，frontmatter 负责结构化信息，职责清晰，不要互相混杂；

第四，**善用枚举与默认值**：能用 `z.enum` 限制的不用 `z.string`，能给默认值的都给出，把"写错"变成"不可能"；

第五，**大站点考虑 build 缓存**：Astro 对内容集合有内置缓存与增量构建，内容越多收益越大。

## 8. 进阶：Live Content Collections（实时内容集合）

### 8.1 为什么需要"活"的集合

传统内容集合在**构建时**获取数据：内容更新了，必须重新构建部署才能生效。但对于电商库存、实时榜单、突发新闻这类**频繁变化**的内容，重建整个站点不现实。Astro 6 把 **Live Content Collections（实时内容集合）** 转正，让内容在**请求时**实时拉取，全程无需重新构建。

实时集合的配置写在独立的 `src/live.config.ts` 中（与 `content.config.ts` 并存）。关键区别在于 loader：它必须是实现了 `loadCollection`（拉取整集）与 `loadEntry`（拉取单条）两个方法的 **live loader**，而不能用 `glob()` 这类构建期 loader：

```ts
// src/live.config.ts（Astro 6+，与 content.config.ts 并存）
import { defineLiveCollection } from 'astro:content'
import { z } from 'astro/zod'
import { liveGithubReleasesLoader } from 'astro-loader-github-releases' // 社区 live loader 示例

const releases = defineLiveCollection({
  loader: liveGithubReleasesLoader({ repo: 'withastro/astro' }),
  // schema 可选：不写时由 loader 的泛型提供类型；写了则请求期同样校验
  schema: z.object({
    tag: z.string(),
    publishedAt: z.coerce.date(),
  }),
})

export const collections = { releases }
```

如果数据源没有现成 loader，可以按 `astro/loaders` 的 `LiveLoader` 接口自己实现一个对象：`loadCollection({ filter })` 返回 `{ entries: [{ id, data }] }`，`loadEntry({ filter })` 返回 `{ id, data }`，失败时返回 `{ error }`——每次请求都会真实调用它们。

### 8.2 查询实时数据

```astro
---
import { getLiveCollection, getLiveEntry } from 'astro:content'

// 请求时实时获取，无需重新构建（注意是 getLive 系列函数，不是 getCollection）
const releases = await getLiveCollection('releases')
const latest = await getLiveEntry('releases', 'v7.0.0')
---

<ul>
  {releases.map((r) => (
    <li>{r.data.tag} —— 发布于 {r.data.publishedAt.toLocaleDateString('zh-CN')}</li>
  ))}
</ul>
```

讲解：Live Collections 只能在**按需渲染**的页面里使用（请求期才有意义，纯静态站点没有"请求"这个时机）；查询函数是 `getLiveCollection` / `getLiveEntry`。适合"内容变化频繁、无法等重建"的场景；稳定的文章、文档仍应使用构建期集合（更快、更省）。**两者按需混用**是大型站点的常见形态。

## 9. 常见错误与对策表

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 忘记创建配置文件 | 报 `Collection "blog" does not exist` | 未创建 `content.config.ts` 或未导出 `collections` | 创建配置文件，导出 `export const collections = { blog }` |
| frontmatter 缺必填字段 | 构建报 `Invalid value for "title"` 等 | schema 声明了必填字段但文档没写 | 补全必填字段，或把字段改为 `.optional()` / 加 `default()` |
| 日期格式混乱 | 构建报日期解析错误 | `z.coerce.date()` 无法解析某些格式 | 统一使用 `YYYY-MM-DD` 格式；或用 `z.string()` 存原始字符串 |
| schema 新增字段导致存量文档失败 | 构建全量报错 | 新增必填字段没有默认值 | 新字段加 `.default(...)` 或 `.optional()` |
| 查询了不存在的集合名 | 运行时报集合不存在 | `getCollection('xxx')` 名称拼写错误 | 检查集合名与 `collections` 对象键名一致 |
| 误把 pages 目录当集合数据源 | 查询结果与预期不符 | 内容文件同时放在 `src/pages/`（会生成页面）和集合目录 | 内容集合的数据文件放集合目录（如 `src/content/blog/`），不要放 `pages/` |

## 10. 一句话记忆

**内容集合是图书馆编目系统：loader 决定书从哪来，schema 决定借书卡的格式（不合格不上架），getCollection 是检索目录，render 把书的内容翻开给读者看。**
