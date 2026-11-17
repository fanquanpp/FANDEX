---
order: 150
title: 国际化路由 i18n
module: 'astro'
category: 前端技术
difficulty: intermediate
description: 用 Astro 的 i18n 路由配置多语言站点：语言前缀策略、缺页回退、浏览器语言重定向与构建产物形态。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'astro/030-PagesRouting'
  - 'astro/050-ContentCollections'
prerequisites:
  - 'astro/030-PagesRouting'
---

## 知识点地图

- **知识类别**：国际化路由（i18n）——多语言站点的 URL 组织与语言协商，属"路由体系"类知识。此前模块仅在版本演进表中提及这个名字，无使用专篇。
- **解决什么问题**：多语言站点的三个路由问题——不同语言的页面 URL 怎么组织（前缀还是子域）；某语言缺某一页时访问它怎么办（回退还是 404）；用户第一次进站时怎么把他带到自己语言的版本（协商重定向）。
- **什么时候用到**：文档站做多语言、面向多个地区用户的官网、双语应援页。只要 URL 里开始出现 `/en/`、`/zh/` 这样的语言段，就该用 Astro 内建的 i18n 路由而不是手工建目录。

## 学习目标

- 配置 `i18n.locales` 与 `defaultLocale`，理解两种前缀策略的 URL 形态差异
- 用顶层 `fallback` 配置缺页兜底，并用 `routing.fallbackType` 选定回退形态（跳转或改写）
- 用 `Astro.preferredLocale` 等只读属性做首访语言协商（早期的 `detectBrowserLanguage` 自动协商配置已移除，现行做法是框架提供读取、自己写跳转）
- 用 `astro:i18n` 工具函数生成带语言前缀的链接，做一个语言切换器

## 1. 最小配置与两种 URL 形态

```javascript
// astro.config.mjs：双语站的最小配置
import { defineConfig } from 'astro/config'

export default defineConfig({
  i18n: {
    defaultLocale: 'zh',          // 缺省语言
    locales: ['zh', 'en'],        // 支持的语言列表
    routing: {
      prefixDefaultLocale: false, // 缺省语言不带前缀
    },
  },
})
```

`prefixDefaultLocale` 决定整套 URL 形态，这是 i18n 路由的第一决策：

| 策略 | 中文页（默认） | 英文页 | 根路径 / | 适用 |
| --- | --- | --- | --- | --- |
| `prefixDefaultLocale: false` | `/about` | `/en/about` | 默认语言首页 | 默认语言是绝对主场的站点 |
| `prefixDefaultLocale: true` | `/zh/about` | `/en/about` | 空缺（可配重定向） | 各语言平权、或要做语言协商 |

选 `false` 的逻辑：中文用户是大多数，让他们看干净短链接；英文是陪跑。选 `true` 的逻辑：语言是 URL 的第一等公民，根路径留给"按浏览器语言分流"（下一节），且 SEO 上每个语言版本都有平行权重。两种形态下页面目录都一样——`src/pages/about.astro` 与 `src/pages/en/about.astro` 各写各的，i18n 配置不改文件结构，只改 URL 映射与协商行为。

换成别的写法会怎样：不用 i18n 配置、手工建 `src/pages/en/` 目录——URL 能跑，但失去三样东西：`Astro.currentLocale` 不再自动判断当前语言、缺页回退不存在、浏览器语言协商不存在。i18n 配置买的不是 URL 前缀，是后面三件事。

## 2. 缺页兜底：把 404 变成回退内容

多语言站最常见的尴尬：英文版翻译到一半，用户点进一篇还没翻的文档，404。i18n 的 `fallback` 配置（注意：它在 i18n 顶层，不在 routing 里）让缺页语言回退到指定语言的版本：

```javascript
export default defineConfig({
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'ja'],
    // 顶层映射：en 下的缺页用 ja 版兜底（为 ja 存在的每个页面，在 en 下也生成路由）
    fallback: { en: 'ja' },
    routing: {
      prefixDefaultLocale: true,
      // 回退形态：'redirect'（默认，302 跳到回退语言 URL）或 'rewrite'（URL 不变，直接渲染回退内容）
      fallbackType: 'redirect',
    },
  },
})
```

行为语义要读准两层。第一层是 `fallback` 的映射方向：`fallback: { en: 'ja' }` 表示"en 下的页面若不存在，用 ja 下对应的页面兜底"——Astro 会为 ja 存在的每个页面在 en 下也生成对应路由。第二层是 `routing.fallbackType` 决定用户以哪种方式拿到内容：默认 `'redirect'`，访问 `/en/new-doc`（英文版没有）会被 302 跳到 `/ja/new-doc`，地址栏换成回退语言的 URL；写成 `'rewrite'` 则 URL 保持 `/en/new-doc` 不变，服务端直接渲染 ja 版内容——rewrite 对 SEO 更友好（不暴露跳转、每个语言 URL 都可收录），redirect 更直白（用户明确知道自己在看另一个语言版本），按站点性质选。

两处易错：fallback 目标语言的对应页面也必须存在，否则照样 404——回退链只有一层；fallback 不影响 defaultLocale（缺省语言缺页就是真 404，这是设计而非缺陷，默认语言应当是全量的）。

## 3. 首访协商：按浏览器语言重定向

用户第一次进站（无任何语言偏好痕迹）时，希望"请求头说日语的用户落到 `/ja/`"。Astro 早期版本提供过 `detectBrowserLanguage` 自动协商配置，该配置项已从框架中移除——现行做法是把协商当成你的业务逻辑来写：**框架提供读取（三个只读属性），跳转由你自己实现**（通常放在中间件里）。

Astro 提供三个只读属性，把浏览器的 `Accept-Language` 与 locales 配置做匹配：

| 属性 | 值 | 无匹配时 | 可用位置 |
| --- | --- | --- | --- |
| `Astro.preferredLocale` | 匹配出的最佳语言 | `undefined` | 仅按需渲染的页面与中间件 |
| `Astro.preferredLocaleList` | 匹配语言的优先级列表 | `[]` | 仅按需渲染的页面与中间件 |
| `Astro.currentLocale` | 当前 URL 对应的语言；URL 无前缀时回退 defaultLocale | — | 所有页面 |

首访协商落进中间件，十几行：

```typescript
// src/middleware.ts：只对根路径生效的首访协商
import { defineMiddleware, sequence } from 'astro:middleware'

const localeNegotiation = defineMiddleware((context, next) => {
  // 仅协商根路径：其他路径都有自己的语言版本，不干预
  if (context.url.pathname !== '/') return next()
  const preferred = context.preferredLocale   // 按 Accept-Language 与 locales 匹配
  if (preferred && preferred !== 'zh') {
    return context.redirect(`/${preferred}/`, 302)
  }
  return next()
})

export const onRequest = sequence(localeNegotiation)
```

逐行解释：协商只对根路径 `/` 生效——在 `prefixDefaultLocale: true` 的形态下，根路径没有默认语言页面，正好空出来当协商入口（这就是本节示例要求全前缀形态的原因，与旧版 detectBrowserLanguage 的前提一脉相承）。`preferredLocale` 结合请求头与 locales 配置算出匹配项；俄语用户、无语言头这类匹配不到的情况得到 `undefined`，此时不跳转、落到默认语言首页。注意协商页面必须按请求渲染（配适配器）——预渲染页面在构建期执行，拿不到请求头，`preferredLocale` 在其上不可用。

一个必须知道的设计边界：**协商只该发生在没有任何偏好痕迹的首次访问上**。用户点过一次语言切换器后，站点不应再"自作聪明"把他拽回去——旧版内置协商遵循这一点，自己实现时要同样克制：Cookie 记住的选择优先于浏览器语言协商，且你的协商逻辑要先查这个 Cookie 再决定跳不跳。

## 4. 语言切换器与构建产物

`astro:i18n` 模块提供生成语言前缀链接的工具，切换器组件十行写完：

```astro
---
// src/components/LangSwitcher.astro：语言切换器
import { getRelativeLocaleUrl } from 'astro:i18n'

const { currentLocale, url } = Astro
// 把当前路径换算成目标语言的同路径：/en/about -> /ja/about
const targetPath = url.pathname.replace(new RegExp(`^/${currentLocale}`), '')
const locales = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
]
---

{
  locales.map((l) => (
    <a
      href={l.code === 'zh' ? targetPath : getRelativeLocaleUrl(l.code, targetPath)}
      aria-current={l.code === currentLocale ? 'page' : undefined}
    >
      {l.label}
    </a>
  ))
}
```

`getRelativeLocaleUrl(locale, path)` 按当前 prefixDefaultLocale 策略生成正确形态的 URL——它知道默认语言该不该带前缀，手写 `/${l.code}${targetPath}` 在 `prefixDefaultLocale: false` 的站点会生成错误链接（默认语言也会带前缀）。`aria-current` 标出当前语言，屏幕阅读器能报"当前页"。

静态构建下每种语言的页面都是独立 HTML：`/zh/about/index.html`、`/en/about/index.html` 一起产出，i18n 不引入任何运行时开销；但首访协商（第 3 节的中间件重定向）依赖按请求渲染的运行环境——`preferredLocale` 只在按需渲染的路由里可用，纯静态部署没有服务器执行协商逻辑，要么给根路径单独开按需渲染，要么把协商下放给托管平台的重定向规则（如 `_redirects`/`vercel.json` 按请求头分流），部署后实测一次协商行为。

## 5. 动手实践

练习一（把双语切换站跑起来）。任务：新建项目配 i18n（zh 默认 + en，prefixDefaultLocale: false），做 `/about` 与 `/en/about` 两页，放一个语言切换器；然后把策略切到 `prefixDefaultLocale: true`，并按第 3 节给根路径加协商中间件，观察两种形态下所有链接的变化。提示：切换器必须用 `getRelativeLocaleUrl` 生成链接，改策略后不用改组件——这就是用工具函数而不是手拼 URL 的回报。

练习二（缺页兜底实验）。任务：在练习一基础上加 ja 语言目录但只翻一页，配顶层 `fallback: { en: 'ja' }`；访问 en 版缺失的页面，确认默认行为是 302 跳到 ja 版；再把 `routing.fallbackType` 改成 `'rewrite'`，验证 URL 不变、内容变成 ja 版。自检标准：en 缺页不再 404，且默认语言缺页仍然 404。

<details>
<summary>参考实现要点（先自己配，再展开对照）</summary>

```javascript
export default defineConfig({
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'ja'],
    fallback: { en: 'ja' },   // 顶层：en 缺页用 ja 兜底
    routing: {
      prefixDefaultLocale: true,
      fallbackType: 'redirect',   // 默认就是 redirect；显式写出便于对照实验
    },
  },
})
```

对照要点：实验分三步验证——en 缺页默认 302 跳到 ja 版 URL；把 `fallbackType` 改成 `'rewrite'` 后再访问，URL 保持 `/en/...`、内容变为 ja 版（看 Network 面板确认没有跳转请求）；ja 自己缺页时 404（回退目标必须全量）；zh 缺页 404（默认语言不受 fallback 保护）。

</details>

练习三（粉丝团中/日双语应援页）。任务：给粉丝团站点加日语版首页与演出列表页，浏览器日语用户访问根路径直达日文版，中文用户不受影响；语言切换器放在页头右侧。提示：这套需求的实现组合就是第 3 节示例——`prefixDefaultLocale: true` 加协商中间件（`context.preferredLocale` + 手动 302），注意根路径路由需按需渲染；验证方式是把浏览器首选语言改成日语再访问根路径。

## 本篇小结

i18n 路由管三件事：URL 形态（prefixDefaultLocale 决定默认语言带不带前缀）、缺页兜底（顶层 fallback 映射回退语言，routing.fallbackType 决定 302 跳转还是 URL 不变的改写）、首访协商（Astro.preferredLocale 读请求头 + 中间件手动重定向，需要全前缀形态让根路径空出来；该路由须按需渲染）。页面目录照常写，i18n 配置不改结构只改映射；生成链接一律走 getRelativeLocaleUrl，别手拼前缀。静态构建下多语言就是多份 HTML，协商是唯一的运行时环节，部署后要实测一次。

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 默写双语站最小 i18n 配置：默认语言中文、支持英文，默认语言不带 URL 前缀。

   参考答案（先自己写，再对照）：

   ```js
   export default defineConfig({
     i18n: {
       defaultLocale: 'zh',
       locales: ['zh', 'en'],
       routing: {
         prefixDefaultLocale: false,
       },
     },
   })
   ```

   验收点：`prefixDefaultLocale: false` 时中文页在根路径（`/about`）、英文页带前缀（`/en/about`）；想各语言平权或做语言协商就改 `true`。

2. 顶层 `fallback: { en: 'ja' }` 的行为语义是什么？`routing.fallbackType` 的两个取值各是什么形态、哪个是默认？

   参考答案（先自己写，再对照）：

   语义是"en 下的页面若不存在，用 ja 下对应的页面兜底"——Astro 会为 ja 存在的每个页面在 en 下也生成路由。`routing.fallbackType` 默认 `'redirect'`：访问 `/en/new-doc` 被 302 跳到 `/ja/new-doc`；`'rewrite'` 则 URL 保持 `/en/new-doc` 不变、服务端直接渲染 ja 内容（对 SEO 更友好）。两个易错：回退目标语言也要有对应页面（回退链只有一层）；默认语言缺页仍是真 404。

3. 早期的 `detectBrowserLanguage` 已被移除，现行首访协商怎么做？为什么协商仍要求 `prefixDefaultLocale: true`？

   参考答案（先自己写，再对照）：

   现行做法是"框架提供读取、自己写跳转"：在按需渲染的中间件里读 `Astro.preferredLocale`（或 `preferredLocaleList`，均为把 `Accept-Language` 与 locales 匹配后的只读属性，匹配不到为 `undefined`），对根路径手动 `context.redirect('/' + preferred + '/', 302)`。要求全前缀形态的原因：默认语言霸占根路径时，`/` 没有协商的落脚点——根路径空出来才可充当协商入口。匹配不到时不跳转、落到默认语言；协商只该发生在首次访问，用户显式选择的语言（Cookie 记住）优先于请求头。

## 参考与致谢

- 本篇 i18n 路由配置、fallback 与 fallbackType 行为、preferredLocale 协商方式参照 Astro 官方文档 Internationalization 指南整理改写；Astro 官方文档以 MIT 许可发布：https://docs.astro.build/en/guides/internationalization/
