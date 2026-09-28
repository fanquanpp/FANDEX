---
order: 50
title: Astro 内容集合与 Schema
module: 'astro'
category: 前端技术
difficulty: intermediate
description: 以 FANDEX 文档站的真实 content.config.ts 为主线，动手配一套内容集合：glob loader 指向仓库外部目录、generateId 自定义条目 id、zod schema 校验 frontmatter、getCollection 查询排序、render 渲染，以及 Live Content Collections 与常见构建报错对策。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'astro/030-PagesRouting'
  - 'astro/060-IslandsClientComponents'
  - 'astro/110-AstroIntegrationsMdx'
prerequisites:
  - 'astro/020-QuickStartProject'
---

## 学习目标

- [ ] 能从零写出一个 `content.config.ts`：loader 选型、schema 定义、注册导出
- [ ] 能读懂 FANDEX 配置里的三个细节：`base` 指向仓库外部、`generateId` 自定义 id、`deferRender`
- [ ] 能用 `getCollection` / `getEntry` 查询并用 `render` 渲染一篇文档
- [ ] 能说出「schema 未声明字段被静默剥离」这类隐形问题的对策
- [ ] 能看懂集合相关的六类构建报错并对症处理

## 一句话理解

> 内容集合 = 内容世界的数据库：loader 决定「数据从哪来」，schema 决定「数据长什么样」（不合格直接构建失败），`getCollection` 是查询 API，`render` 把 Markdown 编译成组件。错误被拦在构建期，而不是在用户的浏览器里爆炸。

## 0. 一个知识管理者的困惑

小林是公司的知识管理员，负责内部文档库。文档从十几篇涨到五百篇后，问题爆发：

- 有的忘了写作者，有的日期一会儿是 `2026/08/01` 一会儿是 `2026年8月1日`；
- 想「找出所有 Astro 相关的教程」只能挨个文件翻；
- 新同事误改了旧文档的格式，目录索引全乱了；
- 更糟的是，错误要等读者点开页面才发现，没人提前把关。

这四条痛点对应内容集合的四个能力：**schema 校验**挡住格式混乱、**统一查询**代替翻文件、**构建期报错**代替线上暴雷、**loader 抽象**让内容可以来自任何地方。FANDEX 这个两千多页的文档站，整条内容链路就建立在这套机制上。

## 1. 配置集合：照着 FANDEX 抄一遍

### 1.1 最小可用配置

在项目根目录（或 `src/` 下）创建 `content.config.ts`：

```ts
// content.config.ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),                        // 必填：字符串
    description: z.string().optional(),       // 可选：字符串
    pubDate: z.coerce.date(),                 // 字符串自动转 Date
    tags: z.array(z.string()).default([]),    // 缺省给空数组
    draft: z.boolean().default(false),
    author: z.enum(['小林', '阿禾', 'FANDEX']), // 只能取列出的值
  }),
});

export const collections = { blog }; // 注册给 Astro
```

逐个拆解：

- **`z` 从 `astro/zod` 导入**。Astro 内置了 zod，早期版本从 `astro:content` 重导出，该写法已弃用；现在的统一写法就是 `astro/zod`。注意 Astro 搭载的 zod 已是 4.x 个别 API 有变化（如顶层 `z.email()` 取代 `z.string().email()`）；
- **`z.coerce.date()`** 把 `"2026-08-01"` 这类字符串转成 `Date`，小林的日期格式问题在这里一次解决（解析不了的格式构建期直接报错）；
- **`default()` 是存量文档的救命稻草**：新增必填字段而没有默认值，所有旧文档立刻全部构建失败；
- **`z.enum()`** 杜绝「阿和/阿禾」这类拼写漂移，编辑器补全也随之精确。

### 1.2 FANDEX 的真实配置：三个值得学的细节

```ts
// FANDEX/app-web/src/content.config.ts（真实代码，节选）
const docs = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: '../cnt-content/full',        // 细节一
    deferRender: true,                  // 细节二
    generateId: ({ entry }) => entry.replace(/[#\\]/g, '-'), // 细节三
  }),
  schema: z.object({
    title: z.string(),
    module: z.string(),
    category: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    order: z.number().default(0),
    updated: z.coerce.date(),
    author: z.string(),
    description: z.string().optional(),
    related: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
  }),
});
```

**细节一：`base` 指向仓库外部。** 内容不在 app-web 项目里，而在 monorepo 根的 `cnt-content/full`——内容层与应用层彻底分离（文档站之外，桌面端复用同一批内容）。glob 的 `base` 接受相对路径，从项目根算起 `../` 就跳出去了。这是 monorepo 内容站的常见形态：内容仓库化，构建时才汇合。

**细节二：`deferRender`。** 告诉 Astro「构建时先只做加载和校验，正文渲染推迟到每个页面真正请求 `render()` 时」。对两千多篇的大集合，这能把构建初期的内存峰值摊到整个构建过程，也避免了「只为校验 frontmatter 却编译了全部正文」的浪费。小集合可以不开，大集合建议开。

**细节三：`generateId`。** 条目 id 默认从相对路径生成，FANDEX 把路径里的 `#` 与 `\` 统一替换成 `-`，保证 id 是干净的 URL 片段。**id 一旦发布就是外链的一部分，改生成规则等于批量改 URL**——动它之前先想清楚重定向。

### 1.3 loader 怎么选

| Loader | 适用场景 | 说明 |
| --- | --- | --- |
| `glob()` | 本地多个 Markdown/MDX/JSON 文件 | 按 pattern 匹配文件，最常用 |
| `file()` | 单个 JSON/YAML 文件 | 一个文件装整组数据（如「国家列表」） |
| 自定义 loader | CMS、数据库、REST API | 实现 loader 函数，从任意数据源拉取 |
| live loader | 请求期实时内容（见第 5 节） | 不重建站点、请求时拉取 |

## 2. frontmatter：标准借书卡

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

这里是正文，与 frontmatter 用空行分隔。
```

一条新手必踩的隐形坑：**schema 里没声明的字段不会报错，而是被 zod 静默剥离**——文件里写了，`entry.data.某字段` 却取不到，页面表现为「悄悄少了一块内容」。两个对策：把字段补进 schema；或用 `z.object({...}).strict()` 让未知字段在构建期直接报错。装上 Astro 官方编辑器扩展后，写 frontmatter 有字段补全，能在源头减少这类错。

## 3. 查询与渲染：从数据到页面

### 3.1 查询：getCollection 与 getEntry

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog'))
  .filter((post) => !post.data.draft)                       // 过滤草稿
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()); // 倒序

// 第二个参数是过滤函数，能直接收窄到你要的子集
const astroPosts = await getCollection('blog', ({ data }) =>
  data.tags.includes('Astro'),
);
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

每个条目上有三个常用字段：

- `id`：由 `generateId` 生成（默认是相对路径）；
- `data`：校验后的 frontmatter，**类型与 schema 完全一致**——`post.data.pubDate` 就是 `Date`，编辑器直接补全方法；
- `body`：正文原始字符串（渲染前）。

已知 id 取单条用 `getEntry`，返回 `null` 表示不存在：

```ts
import { getEntry } from 'astro:content';
const post = await getEntry('blog', 'guide/first-post');
if (!post) return Astro.redirect('/404');
```

### 3.2 渲染：render 与 <Content />

动态路由页里把条目渲染成 HTML：

```astro
---
// src/pages/blog/[slug].astro
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, headings } = await render(post);
---

<BaseLayout title={post.data.title}>
  <article>
    <h1>{post.data.title}</h1>
    <Content />
    <nav>
      {headings.map((h) => (
        <a href={`#${h.slug}`}>{h.text}</a>
      ))}
    </nav>
  </article>
</BaseLayout>
```

`render(post)` 把 Markdown 正文编译为 `<Content />` 组件，同时返回：

- `headings`：`{ depth, slug, text }[]`，文章目录组件的数据源；
- `remarkPluginFrontmatter`：remark 插件回填的数据（阅读时长、字数统计等常走这里）。

FANDEX 的文档页就是这套结构，再叠加目录高亮、代码块主题与双主题样式。

### 3.3 类型安全：schema 即契约

schema 写一次，全项目所有 `getCollection` / `getEntry` 的返回值自动带上精确类型。改 schema 后跑 `npx astro check`（FANDEX 的 `pnpm typecheck` 就是它），所有字段用法不一致的位置立刻浮出：

```ts
post.data.pubDate;  // Date —— 可调用 toISOString()
post.data.tags;     // string[]
post.data.author;   // '小林' | '阿禾' | 'FANDEX'
post.data.order;    // number（有 default，类型不是 number | undefined）
```

## 4. 坑点与自检

| 常见错误 | 报错/现象 | 原因 | 对策 |
| --- | --- | --- | --- |
| 忘记导出 collections | `Collection "blog" does not exist` | 没建配置文件或没导出 | 创建 `content.config.ts` 并 `export const collections` |
| 缺必填字段 | `Invalid value for "title"` 类报错 | schema 必填字段文档没写 | 补字段，或改 `.optional()` / 加 `.default()` |
| 日期格式解析失败 | 构建报日期错误 | `z.coerce.date()` 不认识该格式 | 统一 `YYYY-MM-DD`；或先存 `z.string()` |
| 新增字段后全量报错 | 存量文档集体失败 | 新必填字段无默认值 | 新字段一律带 `.default()` 或 `.optional()` |
| 集合名拼写错误 | 查询返回空或报不存在 | `getCollection('xxx')` 与注册键名不一致 | 对照 `collections` 对象的键名 |
| 内容文件误放 pages | 内容页与列表页冲突/重复生成 | 同一文件既在集合目录又在 `src/pages/` | 集合数据不要放 `pages/`，由 `[slug].astro` 统一出页面 |
| 隐形字段丢失 | 页面少了一块内容且无报错 | 字段未声明被 zod 静默剥离 | 补 schema 或开 `.strict()` |

自检清单：

- [ ] 新增 schema 字段时给了 `default` 吗？
- [ ] 改过 `generateId` 吗？旧 id 的 URL 有重定向吗？
- [ ] 大集合开了 `deferRender` 吗？
- [ ] 外部数据（CMS/接口）进集合时，有没有对应的运行时校验，而不是只靠 schema？

## 5. 进阶：Live Content Collections（实时内容集合）

构建期集合的内容更新后要重新构建才生效。对库存、榜单、突发公告这类高频变化的内容，Astro 5 实验引入、后续版本转正的 **Live Content Collections** 让内容在**请求时**实时拉取。

配置写在独立的 `src/live.config.ts`，与 `content.config.ts` 并存；关键差异是必须用实现 `loadCollection` / `loadEntry` 的 **live loader**：

```ts
// src/live.config.ts
import { defineLiveCollection } from 'astro:content';
import { z } from 'astro/zod';
import { liveGithubReleasesLoader } from 'astro-loader-github-releases'; // 社区 live loader 示例

const releases = defineLiveCollection({
  loader: liveGithubReleasesLoader({ repo: 'withastro/astro' }),
  schema: z.object({
    tag: z.string(),
    publishedAt: z.coerce.date(),
  }),
});

export const collections = { releases };
```

查询走 `getLiveCollection` / `getLiveEntry`（注意不是 getCollection），只能在按需渲染的页面里用。选型口诀：**变化慢、要 SEO、要快——构建期集合；变化快、等不起重建——live 集合**。FANDEX 的全部内容都是构建期集合：文档站要的就是快与稳。

## 6. 练习

1. 给 1.1 节的 blog 集合新增一个可选字段 `cover: z.string().optional()`，然后验证：不写该字段的旧文档是否照常通过？再把它改成必填（无 default），观察报错形态。
2. 写一个「相关文章」组件：输入当前文章的 tags，用 `getCollection` 找出标签重合数最多的 3 篇（排除自身）。
3. 在 FANDEX 仓库里读 `app-web/src/content.config.ts`，回答：为什么 `order` 要 `default(0)` 而 `updated` 用 `z.coerce.date()` 不给默认值？（提示：排序语义 vs 必填语义）
4. 把第 4 节对策表抄进项目 README 的排错章节，并给「隐形字段丢失」补一个你能想到的检测办法（提示：`.strict()` 或自定义 zod superRefine）。

## 7. 下一步

- [030：页面与路由](/astro/030-PagesRouting)：`[slug].astro` 动态路由与 `getStaticPaths` 的完整机制；
- [060：岛屿与客户端组件](/astro/060-IslandsClientComponents)：渲染出的页面如何按需注入交互；
- [110：集成与 MDX](/astro/110-AstroIntegrationsMdx)：集合里的 `.mdx` 条目与 remark/rehype 插件链路；
- 本仓库 `app-web/scripts/` 下的 `content-sync.mjs` 与 `content-audit.mjs`：FANDEX 在集合之上做的同步与审计脚本，是「schema 即契约」的工程化延伸。
