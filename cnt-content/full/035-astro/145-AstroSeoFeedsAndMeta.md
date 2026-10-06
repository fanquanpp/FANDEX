---
order: 220
title: 内容站 SEO：meta、sitemap 与 RSS
module: 'astro'
category: 前端技术
difficulty: beginner
description: Layout 里的 title/description/canonical 与 Open Graph、@astrojs/sitemap 与 site 配置、@astrojs/rss 生成订阅源的完整实战
author: fanquanpp
updated: '2026-10-07'
related:
  - 'astro/030-PagesRouting'
  - 'astro/050-ContentCollections'
  - 'astro/080-BuildDeploy'
prerequisites:
  - 'astro/030-PagesRouting'
---

## 知识点地图

- **知识类别**：内容站 SEO 三件套——页面元数据（title/description/canonical/OG）、sitemap（`@astrojs/sitemap`）、RSS 订阅源（`@astrojs/rss`），对应 Astro 官方文档「Meta tags」「Sitemap」「RSS」指南。
- **解决什么问题**：内容站写完不等于被发现：搜索引擎不知道有哪些页面（缺 sitemap）、搜索结果里摘要乱抓（缺 description）、分享到社交平台没有卡片（缺 OG 标签）、读者无法订阅更新（缺 RSS）。三件套各自解决「被发现」链路上的一环。
- **什么时候用到**：任何以内容为核心的 Astro 站点（博客、文档站、作品集）上线前；文档站公开部署时的收尾工程。
- **工程背景**：FANDEX 仓库本身就是 Astro 站点（Content Collections 加载 `cnt-content/full`），本文以「给 FANDEX 文档站补齐 RSS 与 sitemap」为贯穿实战；[020 上手篇](/astro/020-QuickStartProject) 已埋下 `site` 配置的伏笔，本篇是这条线的正篇。

预计 30 到 45 分钟。

## 学习目标

1. 在 Layout 里落地一套可复用的元数据骨架（title/description/canonical/OG）；
2. 配置 `site` 并接入 `@astrojs/sitemap`，说明为什么没有 `site` 时 sitemap 无法工作；
3. 用 `@astrojs/rss` 生成订阅源，实现全文输出与 frontmatter 字段约定；
4. 给「分享无卡片」「sitemap 404」「RSS 中文乱码」三类现场准备排查路径。

## 1. 元数据骨架：Layout 里的一次性投资

每个内容页都需要一组 head 元数据。做法不是每页手写，而是在 Layout 里参数化一次：

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
  description: string;
  slug?: string;          // 用于拼 canonical 与 og:url
  image?: string;         // 分享卡图（OG 要求绝对地址）
}
const { title, description, slug, image } = Astro.props;
const site = Astro.site ?? new URL('https://example.com');
const canonical = slug ? new URL(slug, site).href : site.href;
const ogImage = image ? new URL(image, site).href : undefined;
---
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />

    <!-- Open Graph：社交平台分享卡 -->
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonical} />
    {ogImage && <meta property="og:image" content={ogImage} />}
    <slot />
  </head>
  <body><slot /></body>
</html>
```

逐段讲解：

- **canonical（规范地址）**：告诉搜索引擎「这页内容的唯一权威 URL」。内容站最常见的重复内容来源是同一页可经多个路径到达（带尾斜杠/不带、带查询参数/不带）——canonical 把权重收敛到一个地址。**不配会发生什么**：搜索引擎自行挑选规范页，可能选中你不期望的形态，多路径分摊排名权重；
- `Astro.site` 来自 [020 篇](/astro/020-QuickStartProject) 埋下的 `site` 配置——元数据里的所有相对地址都要靠它拼成绝对地址，这也是后面 sitemap 与 RSS 都依赖它的原因；
- `og:image` 必须绝对地址（社交平台的抓取器不做相对解析）；`new URL(image, site)` 同时容错「传了相对路径」与「传了绝对路径」两种输入；
- `description` 的内容策略一句话：**写给人看的摘要，不是关键词堆砌**——它常被搜索引擎直接用作搜索结果里的摘要行。

## 2. sitemap：让搜索引擎拿到全站清单

```bash
npx astro add sitemap
```

一条命令完成集成注册，但有一个前置条件必须先满足——`astro.config.mjs` 里的 `site`：

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fandex.example.com',   // 没有它 sitemap 无法生成
  integrations: [sitemap()],
});
```

机制与易错点：

- sitemap 的每个条目是 `<loc>https://...</loc>` 的**绝对 URL**，由 `site` + 每页路径拼出。`site` 缺失时构建直接跳过 sitemap（或报警告）——这是「sitemap 文件 404」的头号原因；
- 产物在 `dist/sitemap-index.xml`（索引文件 + 分片）；把它提交到搜索引擎的站长平台，或在 `robots.txt` 里加一行 `Sitemap: https://fandex.example.com/sitemap-index.xml`；
- 默认收录全部预渲染页面；不想被收录的页面（如登录页）在该页 frontmatter 设 `export const prerender = false`（SSR 页不进 sitemap）或用集成的 `filter` 选项排除；
- 构建后验收：`curl https://你的站点/sitemap-index.xml` 应返回 XML 且条目数与页面数一致——「集成了但没验」是 sitemap 类问题长期潜伏的根源。

## 3. RSS：用 @astrojs/rss 生成订阅源

```bash
pnpm add @astrojs/rss
```

RSS 是一个**端点文件**（放在 pages 下即成为一个路由）：

```ts
// src/pages/rss.xml.js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const modules = await getCollection('modules');
  return rss({
    // context.site 由 site 配置注入——又一次依赖 site
    title: 'FANDEX 学习笔记',
    description: '前端与游戏开发的学习内容更新',
    site: context.site,
    items: modules.map((m) => ({
      title: m.data.title,
      description: m.data.description,
      link: `/modules/${m.id}/`,
      pubDate: m.data.updated,
    })),
    customData: '<language>zh-cn</language>',
  });
}
```

### 全文输出与 frontmatter 字段约定

订阅读者常在阅读器里读完全文，摘要式 RSS 体验差。全文输出就是把正文字段塞进 `content`：

```ts
items: modules.map((m) => ({
  title: m.data.title,
  link: `/modules/${m.id}/`,
  pubDate: m.data.updated,
  // content 字段输出全文（HTML 字符串）；Markdown 集合的 rendered 可直接用
  content: m.rendered?.html ?? m.body,
})),
```

配套的 frontmatter 字段约定（内容集合的 schema 里明确）：

| 字段 | 用途 | RSS 映射 |
| --- | --- | --- |
| `title` | 条目标题 | `<title>` |
| `description` | 一句话摘要 | `<description>` |
| `updated` | 最后更新时间 | `<pubDate>`（排序依据） |
| `slug` / 集合 id | 拼 `link` | `<link>` |

`updated` 用「最后更新」而非「创建时间」，配合 RSS 阅读器按时间排序，读者才能看到「最近改了什么」——对文档站这比「发布时间」更有订阅价值。

## 4. 三个工程场景

### 场景一：给 FANDEX 文档站补齐三件套（贯穿实战）

真实背景：FANDEX 的 app-web 是 Astro 站点，`site` 配置已在 [020 篇](/astro/020-QuickStartProject)出现，[010 概览篇](/astro/010-AstroOverview) 点名过 sitemap 集成但未展开。落地顺序即本篇结构：Layout 元数据骨架（全站复用）-> sitemap 集成（构建产物验收）-> rss.xml 端点（阅读器订阅验收）。三条验收线：分享卡在社交平台调试器里出图、sitemap 条目数与构建页数一致、RSS 在阅读器里按更新时间正确排序且全文可读。

### 场景二：OG 分享卡的图片管线联动

社交卡片图要与 [133 篇](/astro/133-AstroImagesPipeline) 的图片管线联动：封面图经 `<Image />` 优化后的 URL 可直接给 `og:image`，但注意**社交平台抓取器不支持 srcset 协商**——`og:image` 要给单一确定尺寸（常用 1200x630），用 `getImage()` 编程式取固定尺寸产物而不是直接复用页面的响应式 srcset。错配现象：本地分享调试正常、线上卡片无图，多半是给了相对路径或 srcset 形态的地址。

### 场景三：多内容源合并 RSS

文档站常有多个更新维度（新模块、博客、版本日志）。`@astrojs/rss` 的 items 是普通数组——把多个 `getCollection` 的结果各映射成 item 后 `concat`，按 `pubDate` 排序输出即得聚合流。要点是每类内容用 `categories` 字段打标（RSS 的 `<category>`），读者在支持分类过滤的阅读器里可自选板块。反例是给每类内容各建一个 feed 再靠阅读器订阅多个——维护多份模板，且站点首页无法提供「全站更新」这一视图。

## 5. 动手实践

任务：给自己的 Astro 内容站补齐三件套并验收。

1. 建 Layout 元数据骨架（第 1 节代码可直接起步），给两个页面传不同的 title/description，用浏览器 DevTools 检查 head 输出；
2. 配 `site` + sitemap 集成，构建后 `curl`（或浏览器直接打开）`/sitemap-index.xml`，核对条目数；
3. 加 `rss.xml` 端点输出全文，用任意 RSS 阅读器（或在线校验工具）订阅本地/部署地址，验证中文内容无乱码、排序正确；
4. 制造事故：把 `site` 配置临时删掉再构建，记录 sitemap 与 RSS 各自的失败形态，修复后归位。

<details>
<summary>参考现象（先自己试，再展开对照）</summary>

第 2 题：条目数与 `dist/` 里实际页面数一致（注意 SSR 页与被 filter 排除的页不在内）——数量对不上时先查这两类。

第 3 题：乱码或解析失败的常见根因是 `customData` 漏了 `<language>` 或日期字段不是合法 Date（frontmatter 里 `updated: 2026-10-07` 字符串在 schema 里应声明为 `z.coerce.date()`）——RSS 的 XML 规范对日期格式严格，schema 层 coerce 是最省心的解法。

第 4 题：无 `site` 时 sitemap 跳过生成（警告在构建输出里，容易漏看）；rss.xml 端点在 `context.site` 为 undefined 时直接抛错。两者的失败形态不同——一个静默缺失、一个构建失败——验收不能只看「构建成功」。

</details>

## 6. 常见错误与对策

| 现象 | 常见原因 | 解决办法 |
| --- | --- | --- |
| sitemap 文件 404 | `site` 配置缺失 | 先配 `site` 再集成（第 2 节机制） |
| 分享无卡片/无图 | OG 缺失或图片是相对地址 | Layout 参数化 OG；图片给绝对地址单一尺寸 |
| 搜索结果出现重复页面 | 缺 canonical | Layout 里按 `site` + 路径输出 canonical |
| RSS 构建报 site undefined | 端点未用 `context.site` | `GET(context)` 里取注入的 `context.site` |
| RSS 日期解析失败 | frontmatter 日期是字符串 | schema 用 `z.coerce.date()` 收敛类型 |
| 全站页面都被收录（含不想公开的） | sitemap 默认全收 | 集成 `filter` 或对 SSR 页自动排除 |

## 参考与致谢

本文 meta tags、`@astrojs/sitemap` 与 `@astrojs/rss` 的配置结构参考 Astro 官方文档（MIT 许可）整理改写。来源：https://docs.astro.build/en/guides/rss/ 、https://docs.astro.build/en/guides/integrations-guide/sitemap/
