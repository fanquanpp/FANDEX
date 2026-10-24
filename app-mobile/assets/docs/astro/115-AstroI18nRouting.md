---
order: 150
title: 国际化路由 i18n
module: 'astro'
category: 前端技术
difficulty: intermediate
description: 用 Astro 的 i18n 路由配置多语言站点：语言前缀策略、缺页回退、浏览器语言重定向与构建产物形态。
author: fanquanpp
updated: '2026-10-07'
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
- 用 `routing.fallback` 处理缺页：把 404 变成"回退渲染另一语言的版本"
- 用 `detectBrowserLanguage` 做首访语言重定向，知道它的适用前提
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

## 2. 缺页回退：把 404 变成降级渲染

多语言站最常见的尴尬：英文版翻译到一半，用户点进一篇还没翻的文档，404。`routing.fallback` 让缺页回退到指定语言的版本渲染：

```javascript
export default defineConfig({
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'ja'],
    routing: {
      prefixDefaultLocale: true,
      // 英文版缺的页面：用日文版渲染兜底
      fallback: 'ja',
      // 精细控制状态码：默认 200（静默回退），可对个别语言改 302（跳转）
      // fallback: { locale: 'ja', statusCodes: { en: 302, fr: 302 } },
    },
  },
})
```

行为语义要读准：`fallback: 'ja'` 的意思是"当某个 locale 下的页面不存在时，去渲染 ja 下对应的页面"。访问 `/en/new-doc`（英文版没有）而 `/ja/new-doc` 存在时，用户看到日文版内容，默认状态码 200。写成 `statusCodes: { en: 302 }` 则改为把用户 302 跳到日文版 URL——内容兜底（200）对 SEO 更友好，跳转（302）对用户更直白，按站点性质选。

两处易错：fallback 目标语言的对应页面也必须存在，否则照样 404——回退链只有一层；fallback 不影响 defaultLocale（缺省语言缺页就是真 404，这是设计而非缺陷，默认语言应当是全量的）。

## 3. 首访协商：按浏览器语言重定向

用户第一次进站（无任何语言偏好痕迹）时，`detectBrowserLanguage` 按 `Accept-Language` 请求头分流：

```javascript
export default defineConfig({
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'ja'],
    routing: {
      prefixDefaultLocale: true,          // 重定向模式的前提：所有语言带前缀
      redirectToDefaultLocale: false,     // 根路径 / 不自动跳默认语言，交给协商
    },
    detectBrowserLanguage: {
      type: 'redirect',                   // 访问根路径时按浏览器语言 302
      fallbackLocale: 'en',               // 浏览器语言不在列表内：跳到英文
    },
  },
})
```

逐行解释：`detectBrowserLanguage.type: 'redirect'` 让"访问 `/`"变成一次语言协商——请求头说日语的用户被 302 到 `/ja/`；`fallbackLocale` 接住列表外的语言（俄语用户、无语言头的情况统一落到英文）。这解释了为什么它要求 `prefixDefaultLocale: true`：根路径 `/` 必须空出来当协商入口，如果默认语言霸占根路径，协商没有落脚点（`type: 'fallback'` 是另一个选项——不重定向，直接按协商结果在根路径渲染对应语言内容，URL 不变，适合不想让 URL 跳动的场景）。

一个必须知道的边界：**协商只对第一次访问根路径生效**。用户点过一次语言切换器后，站点不应再"自作聪明"把他拽回去——Astro 的实现同样遵循这一点（协商不覆盖用户的显式选择），但你自己实现"记住上次语言"时要同样克制：Cookie 记住的选择优先于浏览器语言。

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

静态构建下每种语言的页面都是独立 HTML：`/zh/about/index.html`、`/en/about/index.html` 一起产出，i18n 不引入任何运行时开销；语言协商（根路径重定向）由托管平台或 SSR 适配器按请求头处理——纯静态部署时 `type: 'redirect'` 依赖平台对 302 的支持（Astro 会生成对应的重定向配置），部署前用 `astro build && astro preview` 验证一次协商行为，确认托管平台吃下了这层配置。

## 5. 动手实践

练习一（把双语切换站跑起来）。任务：新建项目配 i18n（zh 默认 + en，prefixDefaultLocale: false），做 `/about` 与 `/en/about` 两页，放一个语言切换器；然后把策略切到 `prefixDefaultLocale: true` + detectBrowserLanguage，观察两种形态下所有链接的变化。提示：切换器必须用 `getRelativeLocaleUrl` 生成链接，改策略后不用改组件——这就是用工具函数而不是手拼 URL 的回报。

练习二（缺页回退实验）。任务：在练习一基础上加 ja 语言目录但只翻一页，配 `fallback: 'ja'`；访问 en 版缺失的页面，确认回退渲染与状态码；再改 `statusCodes` 观察 302 跳转。自检标准：en 缺页不再 404，且默认语言缺页仍然 404。

<details>
<summary>参考实现要点（先自己配，再展开对照）</summary>

```javascript
export default defineConfig({
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'ja'],
    routing: {
      prefixDefaultLocale: true,
      fallback: 'ja',
    },
  },
})
```

对照要点：实验分三步验证——en 缺页回退 200 渲染 ja 内容；ja 自己缺页时 404（回退目标必须全量）；zh 缺页 404（默认语言不受 fallback 保护）。把 `fallback: 'ja'` 换成对象形式 `fallback: { locale: 'ja', statusCodes: { en: 302 } }` 再验一次跳转形态。

</details>

练习三（粉丝团中/日双语应援页）。任务：给粉丝团站点加日语版首页与演出列表页，浏览器日语用户访问根路径直达日文版，中文用户不受影响；语言切换器放在页头右侧。提示：这套需求的配置组合就是第 3 节示例——`prefixDefaultLocale: true` 加 `detectBrowserLanguage`；验证方式是把浏览器首选语言改成日语再访问根路径。

## 本篇小结

i18n 路由管三件事：URL 形态（prefixDefaultLocale 决定默认语言带不带前缀）、缺页兜底（fallback 渲染回退语言的版本，状态码可 200 可 302）、首访协商（detectBrowserLanguage 按 Accept-Language 重定向，需要全前缀形态）。页面目录照常写，i18n 配置不改结构只改映射；生成链接一律走 getRelativeLocaleUrl，别手拼前缀。静态构建下多语言就是多份 HTML，协商依赖托管平台对重定向的支持，部署后要实测一次。

## 参考与致谢

- 本篇 i18n 路由配置、fallback 与 detectBrowserLanguage 行为参照 Astro 官方文档 Internationalization 指南整理改写；Astro 官方文档以 MIT 许可发布：https://docs.astro.build/en/guides/internationalization/
