---
order: 80
title: 预取 Prefetch：链接级预加载
module: 'astro'
category: 前端技术
difficulty: beginner
description: 用 prefetch 配置与 data-astro-prefetch 让下一页在用户点击前就开始加载，理解四种策略的取舍。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'astro/030-PagesRouting'
  - 'astro/120-AstroViewTransitions'
prerequisites:
  - 'astro/030-PagesRouting'
---

## 知识点地图

- **知识类别**：预取（Prefetch）——导航性能优化，链接级的预加载策略，Astro 官方文档的独立指南，此前模块零覆盖。
- **解决什么问题**：多页应用每次跳转都要等"请求 HTML -> 解析渲染"的完整往返。预取在用户**还没有点击**时（悬停、触摸、进入视口）就把下一页的 HTML 悄悄拉下来，点击瞬间直接渲染——跳转近乎瞬时。
- **什么时候用到**：文档站侧边栏、列表页到详情页、分页导航——任何"用户即将点击、但还没点击"的场景。与 [视图过渡](/astro/120-AstroViewTransitions) 组成完整的导航体验线：预取管"什么时候开始拿数据"，视图过渡管"换页时动画怎么走"。

## 学习目标

- 会开启全站预取并理解四种策略（hover / tap / viewport / load）的流量与时机取舍
- 会用 `data-astro-prefetch` 对单个链接覆盖策略或禁用预取
- 能解释预取与 `ClientRouter`（视图过渡路由器）默认行为的差异，并知道如何控制它
- 能按页面形态选策略：什么页面该 hover，什么页面敢 viewport

## 1. 最小开启：一行配置

预取默认关闭。`astro.config.mjs` 里一行打开：

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config'

export default defineConfig({
  prefetch: true,   // 开启预取；默认策略 hover
})
```

开启后，**带 `data-astro-prefetch` 属性的链接**会被预取——注意 `prefetch: true` 不等于"预取所有链接"，它的语义是"启用预取系统"，具体预取谁由链接属性决定。想让全站链接都预取，要显式声明：

```javascript
export default defineConfig({
  prefetch: {
    prefetchAll: true,       // 所有站内链接都预取
    defaultStrategy: 'hover', // 默认策略：鼠标悬停时开始
  },
})
```

逐字段解释：`prefetchAll: true` 把"逐链接声明"翻转成"逐链接豁免"——所有站内链接默认进预取系统，个别链接用 `data-astro-prefetch="false"` 退出；`defaultStrategy` 是"什么时候开始拉"，默认 hover。换成别的写法会怎样：只写 `prefetch: true` 而不加属性，站点上没有任何链接真的被预取——这是最常见的"开了等于没开"误区；而 `prefetchAll: true` 不配策略则默认 hover，对列表页够用但未必最优。

## 2. 四种策略：时机与流量的取舍

策略回答一个问题："提前到什么时候开始下载？"

| 策略 | 触发时机 | 流量代价 | 适用 |
| --- | --- | --- | --- |
| hover | 鼠标悬停/聚焦/触摸开始 | 极低（用户有明确意图） | 绝大多数链接的默认选择 |
| tap | 按下还没松开（pointerdown） | 极低，比 hover 更保守 | 悬停没有意义的触屏为主页面 |
| viewport | 链接进入视口 | 高（可能批量预取用户根本不点的页） | 少量高概率跳转（如列表页的"下一页"） |
| load | 页面加载完成后预取 | 最高 | 极少用；仅限确定必去的链接 |

策略在链接上声明：

```html
<!-- 进入视口就预取：搜索结果页的详情链接，用户大概率点 -->
<a href="/posters/miku-2026" data-astro-prefetch="viewport">魔法未来 2026</a>

<!-- 覆盖为 tap：触屏页面用不到悬停 -->
<a href="/vote" data-astro-prefetch="tap">投票入口</a>

<!-- 禁用单个链接（prefetchAll 开启时的豁免） -->
<a href="/logout" data-astro-prefetch="false">退出登录</a>
```

选策略的判断标准就一条：**预取流量与跳转收益的期望值**。文档站的侧边栏有几十个链接，全部 viewport 预取等于把整站 HTML 拉一遍——弱网下反而抢占了用户当前浏览的带宽；hover 则只在指针真正移上去的瞬间预取，意图明确、浪费趋近于零。反过来，分页列表的"下一页"按钮点击率极高，viewport 完全值得。

## 3. 真实工程例：FANDEX 文档站的 hover 决策

本仓库的 app-web 就是一个真实的 Astro 文档站，它的预取配置完整经历了上面的取舍（摘自 `app-web/astro.config.ts` 的 prefetch 段，注释为项目原文）：

```javascript
// app-web/astro.config.ts（节选）
prefetch: {
  // prefetchAll=false 时只有显式 data-astro-prefetch 的链接才被预取（全站为零处），
  // 等于完全没有预取。文档站侧边栏/目录链接动辄数十个，viewport 策略会在弱网下
  // 批量拉取整页 HTML（大页超 1MB），故用 hover 策略：悬停/聚焦/触摸才预取，
  // 单次跳转近乎瞬时，且几乎不产生多余流量（与 Starlight 默认一致）
  prefetchAll: true,
  defaultStrategy: 'hover',
},
```

这段注释浓缩了三个决策：为什么必须 prefetchAll（否则没有任何链接被预取）；为什么不用 viewport（数十个目录链接弱网下批量拉大页 HTML）；为什么敢用 hover（悬停意图明确、流量近乎零增量）。读者在自己的项目里做同样决策时，可以直接对照这三问。

另外两个不同场景的用法：粉丝团列表页给每张应援卡片链接标 `data-astro-prefetch="viewport"`——首屏卡片数量固定、详情页点击率高，提前拉详情的收益盖过流量；而投票、登出这类"低频且会产生副作用"的链接，永远不要预取（登出页预取无意义，投票预取还可能被搜索引擎预渲染器误触发）。

## 4. 与 ClientRouter 的关系

[视图过渡篇](/astro/120-AstroViewTransitions)的 `ClientRouter`（Astro 5 对原 ViewTransitions 组件的更名）与预取有官方整合：**启用 `<ClientRouter />` 后，即使没有 prefetch 配置，路由器也会对页面内链接按默认策略（hover）预取**——因为客户端路由的换页体验本就依赖"数据先到"。这意味着三种情形：

- 只想要预取、不要过渡动画：只配 `prefetch`，不装 ClientRouter。
- 两者都要：装 ClientRouter 即可，预取自动生效；再用 prefetch 配置细化策略。
- 想关闭 ClientRouter 自带的预取：在 prefetch 配置里显式关闭（如 `prefetch: false` 配合自身需求），具体开关项以所用版本的官方 Prefetch 指南为准——这块行为在 5.x 系列内有小幅演进，本文不锁死字段名。

预取请求都带一个可识别头，服务端（SSR 页面）可据此决定要不要做完整渲染开销——例如预取请求走轻量版本、真实访问才做重计算，这是进阶用法，先知道有这扇门。

## 5. 动手实践

练习一（给文档站配预取）。任务：任意 Astro 项目（或本仓库 app-web 的克隆）加上 prefetchAll + hover，运行 `astro dev`，悬停侧边栏链接时打开网络面板观察：悬停瞬间是否出现一条 HTML 请求？点击后是否没有新的 HTML 请求？提示：预取请求在 DevTools Network 里点开能看见 Initiator 是 prefetch 逻辑；把策略改成 viewport 再刷新，观察加载完成后立即出现的一批预取请求。

练习二（策略落位表）。任务：给一个粉丝团站点的六类链接各定一个策略并写出理由：侧边栏导航、列表卡片、分页"下一页"、退出登录、外部友链、404 回首页。提示：外链永远不会被预取（预取只对站内同源链接生效），把它写进理由表里检验你是否真的理解作用域。

<details>
<summary>参考答案（先自己定，再展开对照）</summary>

```text
侧边栏导航：hover        数量多、单次意图明确，viewport 会批量拉整站
列表卡片：hover 或 viewport  首屏卡片少（<=10）可 viewport，否则 hover
分页下一页：viewport      点击率极高，进入视口即预告意图
退出登录：false          有副作用且低频，预取无收益
外部友链：无需设置        预取只作用于站内同源链接
404 回首页：hover        低频页面，默认策略即可
```

对照要点：决策依据始终是"点击概率 x 预取流量"，同源与副作用是两条硬边界。

</details>

练习三（预取与服务端配合）。任务：若项目有 SSR 页面，给端点或页面判断预取请求头并打日志，统计一分钟内"被预取但最终没被访问"的比例。提示：预取请求带有专门的请求头（具体头名以所用版本文档为准），SSR 侧读 `request.headers.get(...)` 记录，观察真实用户行为里"预取了但没点"的浪费量——这是把策略调得更激进或保守的数据依据。

## 本篇小结

预取把"点击后的等待"提前到"点击前的空闲"。`prefetch: true` 只开系统、`prefetchAll: true` 才默认全站；hover 是流量与收益的最佳默认值，viewport 留给高点击率的少量链接，tap 适配触屏，load 几乎不用。链接级用 `data-astro-prefetch` 覆盖或豁免。ClientRouter 自带 hover 预取，两者共享一套配置。决策公式：点击概率 x 预取收益 对 流量代价，外链与副作用链接永远在圈外。

## 参考与致谢

- 本篇预取策略、配置项与 ClientRouter 关系参照 Astro 官方文档 Prefetch 指南整理改写；Astro 官方文档以 MIT 许可发布：https://docs.astro.build/en/guides/prefetch/
- 本仓库 app-web 的 prefetch 决策注释（真实工程例出处）：app-web/astro.config.ts
