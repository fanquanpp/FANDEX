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

## 知识点地图

- **知识类别**：Astro 内容集合（Content Collections）与 Schema——内容的数据层，对应 Astro 官方文档 Content Collections 指南。
- **解决什么问题**：散落的 Markdown/JSON 文件没有类型、没有校验，frontmatter 写错要到浏览器页面白屏才发现。内容集合把内容变成「构建期带校验的数据库」：loader 管数据从哪来，schema 管数据长什么样，`getCollection`/`render` 是查询与渲染 API。
- **什么时候用到**：博客、文档站、作品集等一切「内容驱动」的 Astro 站点；需要把外部数据源（CMS、REST）纳入与本地内容同等类型安全待遇时。
- **本篇主线**：以本仓库 FANDEX 的真实 `content.config.ts` 为第一素材（1.2 节），三个场景例（最小配置、FANDEX 实配、REST 自定义 loader、多语言 schema 复用）覆盖 loader 选型的主流形态。
- **本篇不讲**：MDX 的插件链路（见 110 篇）；内容页的路由生成（见 [030 篇](/astro/030-PagesRouting) 第 8 节的黄金组合）。

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

表里"自定义 loader"只有一行名字，实现契约其实很短，直接把它落成可运行的代码。场景：站点头部有一条公告栏，公告存在团队自己的 REST API 里，希望"构建时拉一次、进内容层、享受 schema 校验"：

```ts
// src/content.config.ts（节选）：从 REST API 拉取站点公告
import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'

const announcements = defineCollection({
  loader: () => ({
    // name 用于日志与缓存标识，起一个能认出数据源的名字
    name: 'announcements-api',
    // load 在每次构建（或开发服务器启动）时执行一次
    async load({ store, logger }) {
      logger.info('拉取站点公告')
      const res = await fetch('https://api.fanclub.example/announcements')
      const list = await res.json()
      for (const item of list) {
        // store 是内容层的写入口：set 的 id 就是条目的唯一标识
        store.set({
          id: String(item.id),                    // 重复 set 同一 id 即覆盖，天然支持增量
          data: {
            title: item.title,
            publishedAt: new Date(item.published_at),
          },
        })
      }
    },
  }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.date(),
  }),
})
```

三个契约点逐个说：**name** 是这条 loader 在日志与内部缓存里的标识；**load** 拿到 `store`（内容层的写入口）与 `logger`，每次构建调用一次，fetch 回来的每条数据经 `store.set({ id, data })` 落进集合——id 由你指定（也可以用约定路径让它自动生成，即 1.2 节 `generateId` 那条规则的来源），同一 id 重复 set 就是覆盖，所以"第二次构建数据变了"不需要任何清理逻辑，全量重写一遍 store 即可。之后这个集合与本地 Markdown 集合毫无区别：同样过 schema 校验、同样用 `getCollection('announcements')` 查询、同样类型安全。拉取失败要 fail-fast（fetch 不做 try-catch 吞错），坏数据宁可挡在构建期也不让它变成空公告栏上线。

live loader 与它的边界见第 5 节——一句话预告：这份自定义 loader 是**构建期**数据源，live loader 是**请求期**数据源，契约不同（loadCollection/loadEntry 而非 load/store）。

### 1.4 场景例：多语言内容的 schema 复用

第三个场景：站点要出中英双语内容（如 `posts/zh/hello.md` 与 `posts/en/hello.mdx`）。多语言的坑不在路由而在 schema——两个语言版本的 frontmatter 必须保持同一契约，否则「英文版漏写 tags」这类漂移到上线才被发现。做法是把语言无关的字段抽成基础 schema，再按语言扩展：

```ts
// src/content.config.ts（节选）：基础 schema 复用
import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

// 语言无关的字段契约：标题、摘要、标签、日期——两种语言完全一致
const baseSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  updated: z.coerce.date(),
})

// 语言特有字段各自扩展：中文要术语表链接，英文要原文链接
const posts = defineCollection({
  loader: glob({ pattern: '{zh,en}/*.md', base: './src/content/posts' }),
  schema: baseSchema.extend({
    // 条件字段：按 id 前缀（zh/ 或 en/）区分语言的特有字段
    glossary: z.string().optional(),   // zh 专属：术语表锚点
    sourceUrl: z.string().url().optional(), // en 专属：原文出处
  }),
})
```

讲解：

- `baseSchema.extend()` 是 zod 的标准扩展语法——公共契约写一次，语言差异以「可选扩展字段」追加。**不这么做**的常见形态是把整个 schema 复制两份，三个月后两份漂移到互不相认；
- 条件校验要更严格时用 `superRefine`：例如「zh 条目 glossary 必填」可以在 schema 层按 id 前缀断言，而不是散在各页面里 if；
- 与 [030 篇](/astro/030-PagesRouting) 的动态路由配合：`getStaticPaths` 按 `{ zh, en }` 两套 params 展开即可出双语站点，schema 层保证的是「每条内容在两种语言下数据形状一致」——数据一致是路由展开的前提；
- 多语言内容更完整的 i18n 路由方案（URL 前缀、语言回退）见 [i18n 篇](/astro/115-AstroI18nRouting)，本节只负责「数据层不漂移」。

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

用一个对照实验把边界压实：把上一节"REST API 站点公告"同一个数据源分别接成自定义 loader（构建期）与 live loader（请求期），观察三条差异——**新鲜度**：构建期版公告要等下一次 `astro build` 才更新，live 版下一次刷新页面就是新的；**速度**：构建期版页面是纯静态 HTML（公告已烘进产物），live 版每个访客请求都触发一次 API 拉取（首字节时间被数据源拖住，除非自己加缓存）；**查询 API**：构建期版用 `getCollection`，live 版用 `getLiveCollection` 且只许在按需渲染的页面里调——同一个页面代码两边不能混用。实验的结论就是选型口诀的展开：公告一小时变一次、全站要快，构建期版赢；公告秒级变（突发停服通知）、接受一次 API 延迟，live 版赢。多数站点两类并用：正文走构建期，公告、库存这类边角数据走 live 或干脆走岛屿+客户端 fetch。

## 6. 练习

1. 给 1.1 节的 blog 集合新增一个可选字段 `cover: z.string().optional()`，然后验证：不写该字段的旧文档是否照常通过？再把它改成必填（无 default），观察报错形态。
2. 写一个「相关文章」组件：输入当前文章的 tags，用 `getCollection` 找出标签重合数最多的 3 篇（排除自身）。
3. 在 FANDEX 仓库里读 `app-web/src/content.config.ts`，回答：为什么 `order` 要 `default(0)` 而 `updated` 用 `z.coerce.date()` 不给默认值？（提示：排序语义 vs 必填语义）
4. 把第 4 节对策表抄进项目 README 的排错章节，并给「隐形字段丢失」补一个你能想到的检测办法（提示：`.strict()` 或自定义 zod superRefine）。
5. fail-fast 动手任务：给 1.3 节的自定义 loader 做「坏数据实验」——在 fetch 返回后故意往列表里塞一条缺 `title` 的数据，先在 `store.set` 外层包一层 try-catch 把异常吞掉只打日志，构建并观察站点表现；再去掉 try-catch 让异常直接抛出，对比两次构建结果。提示：思考「公告栏少一条」与「构建红灯」在团队协作里的后果差异——前者上线了才被发现，后者提交时就有人来修。参考做法见下。

<details>
<summary>第 5 题参考（先自己跑，再展开对照）</summary>

吞错版：构建绿灯通过，站点公告栏少一条数据，没人知道数据源坏了——直到有读者发现内容缺失、有人回头查日志才定位，链路长达数天。fail-fast 版：构建立刻红灯，报错信息指向 loader 的 store.set 行，提交该数据的人当场修复。

原则落点（1.3 节结论的实验证明）：**构建期的数据错误要挡在构建期**——「宁可红灯也不带病上线」。允许的例外只有一种：数据源明确可降级（如可选的社交数据），此时降级行为要显式声明（logger.warn + 页面渲染空态），而不是静默吞掉。

</details>

## 7. 下一步

- [030：页面与路由](/astro/030-PagesRouting)：`[slug].astro` 动态路由与 `getStaticPaths` 的完整机制；
- [060：岛屿与客户端组件](/astro/060-IslandsClientComponents)：渲染出的页面如何按需注入交互；
- [110：集成与 MDX](/astro/110-AstroIntegrationsMdx)：集合里的 `.mdx` 条目与 remark/rehype 插件链路；
- 本仓库 `app-web/scripts/` 下的 `content-sync.mjs` 与 `content-audit.mjs`：FANDEX 在集合之上做的同步与审计脚本，是「schema 即契约」的工程化延伸。
