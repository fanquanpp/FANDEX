---
order: 70
title: Server Islands（服务器岛）
module: 'astro'
category: 前端技术
difficulty: beginner
description: server:defer 指令、fallback 占位与请求期渲染——在整页静态输出的站点里嵌一块按请求渲染的个性化内容
author: fanquanpp
updated: '2026-10-07'
related:
  - 'astro/060-IslandsClientComponents'
  - 'astro/131-AstroSessionsApi'
  - 'astro/080-BuildDeploy'
prerequisites:
  - 'astro/060-IslandsClientComponents'
---

## 知识点地图

- **知识类别**：Server Islands（服务器岛）——`server:defer` 指令与请求期渲染，对应 Astro 官方文档 Server Islands 指南（Astro 5.7 引入的实验特性，本文按 2026 年现状撰写）。
- **解决什么问题**：内容站的页面想要「整页静态缓存」（CDN 直出、秒开、零服务器成本），但页面上偏偏有一小块必须按请求渲染的内容——登录后的头像昵称、实时余票、按用户的推荐位。历史上只有两个坏选择：整页转 SSR（放弃静态缓存）或客户端 JS 拉 API（每个访客都跑一段 JS、有闪烁）。Server Islands 给出第三条路：**页面是静态的，那一小块是动态的**。
- **什么时候用到**：静态页上的个性化元素（头像、用户名、会员标识）；低频变化的实时数据（余票、库存、倒计时结果）；需要按请求决策的 A/B 内容。
- **与客户端岛屿的分工边界**：**交互在客户端岛（`client:` 指令），个性化在服务器岛（`server:defer`）**——需要用户点击拖拽的交给浏览器跑 JS，只需要「按人不同」的交给服务器渲染 HTML。
- **本篇不讲**：客户端岛屿与框架集成（见 [060 篇](/astro/060-IslandsClientComponents)）；登录态的具体存取（见 [Sessions](/astro/131-AstroSessionsApi)，本篇把它当已就绪的依赖）。

预计 25 到 40 分钟。

## 学习目标

1. 用 `server:defer` + `fallback` 把一块个性化内容嵌进纯静态页面；
2. 解释「整页静态缓存 + 局部请求渲染」的共存机制（两段式响应）；
3. 说清 Server Islands 与客户端岛屿、整页 SSR 三者的选型边界；
4. 知道使用前提（适配器）与 props 序列化限制，避免上手即撞墙。

## 1. 最小可运行示例

以粉丝团站点的静态首页为例：整页内容对所有人相同、可长期缓存，唯独右上角要显示登录用户的头像与昵称。

```astro
---
// src/pages/index.astro —— 纯静态首页
import Avatar from '../components/Avatar.astro';
---
<html>
  <head>
    <!-- fallback：岛屿就位前用户看到的占位（必须传，除非组件自带） -->
    <Avatar server:defer fallback={<span class="avatar-placeholder">访客</span>} />
  </head>
  <body>
    <h1>本周演出资讯</h1>
    <!-- ...整页静态内容... -->
  </body>
</html>
```

```astro
---
// src/components/Avatar.astro —— 请求期才执行的服务器岛
import { getSession } from 'astro:session';

const session = getSession(Astro.cookies);
const user = await session.get('user');
---
{user ? (
  <img src={user.avatarUrl} alt={`${user.name} 的头像`} width="32" height="32" />
) : (
  <a href="/login">登录</a>
)}
```

逐段拆解：

- `server:defer` 挂在组件上：告诉 Astro「这个组件**不要**在构建期渲染」。构建时它被打包成一个服务器端点，页面里只留下占位；
- `fallback` 是一段**静态 HTML**（可以是任意模板片段）：构建期就嵌进页面。CDN 缓存的整页 HTML 里只有它——未登录访客看到「访客」占位，完全无请求成本；
- 岛屿组件内部是**请求期**的 Node 环境：可以读 cookie、查 Session、调数据库。上例用 Sessions API 取登录用户（会话原理见 [Sessions 篇](/astro/131-AstroSessionsApi)）；
- 换成不带 `server:defer` 的写法会发生什么：构建期渲染时 `getSession` 读不到请求上下文（没有请求！），要么构建报错要么渲染成永远的「未登录」——这是 Server Islands 要解决的本质矛盾：**静态页构建于无请求环境，而个性化需要请求上下文**。

## 2. 机制：两段式响应怎么拼起来

理解加载时序才能解释「为什么占位先出现、头像后出现」：

```text
1. 构建期：index.html 生成，Avatar 的位置只有 fallback 静态 HTML
2. CDN：整页 HTML 被边缘缓存，访客秒开（与纯静态站无异）
3. 浏览器：Astro 的运行时脚本发现页面里有 server island 占位
4. 浏览器 -> 服务器：发起一个对岛屿端点的请求（带 cookie 等请求上下文）
5. 服务器：只渲染 Avatar 组件，返回一小段 HTML
6. 浏览器：把占位替换成这段个性化 HTML
```

要点与代价：

- **每页每个岛屿多一次请求**。五个岛屿 = 五次额外往返，所以岛屿粒度要「能合则合」：头像、昵称、会员徽标同属一个头部组件，做成**一个**岛屿而不是三个；
- 岛屿端点的响应默认**不可缓存**（含 cookie 的个性化内容不该被 CDN 缓存）——这也是它只适合「小块内容」的原因：大块动态内容请老老实实整页 SSR；
- 使用前提：项目需要**SSR 适配器**（如 `@astrojs/node`、`@astrojs/vercel`）提供请求期运行时。纯静态托管（仅 GitHub Pages）跑不了服务器岛——这与「static 输出 + 个别 SSR 页面」的适配器要求同源（见 [构建与部署](/astro/080-BuildDeploy) 的适配器节）；
- props 序列化限制：传给岛屿的 props 必须可序列化（字符串、数字、普通对象），传组件、函数会构建报错——服务器边界不认识 JS 闭包。

## 3. 三个工程场景

### 场景一：登录头像（本篇最小示例的完整落地）

静态首页 + 服务器岛头像 + Sessions 存登录态，是 Server Islands 的标准用法。选型核对：头像内容「按人不同」但「无交互」——不需要客户端岛屿；页面主体静态可缓存——不值得整页 SSR。三条边界各归其位。

### 场景二：实时余票

真实背景：演出详情页是静态内容（演出介绍、场馆图、历史评价——构建期生成、长期缓存），唯有余票数字随时间变化。两档做法：

```astro
---
// 静态详情页里嵌一块余票岛
import TicketCount from '../../components/TicketCount.astro';
import { getShow } from '../../lib/shows';
const show = await getShow(Astro.params.slug);
---
<TicketCount showId={show.id} server:defer
  fallback={<span>余票查询中……</span>} />
```

- 余票查询频率低（每秒级）时：服务器岛直连票务库，每个到达的访客拿当次真实值——准确性最高，代价是每个 PV 一次后端查询；
- 余票高频被刷时：把岛屿响应换成短 TTL 缓存（适配器层或边缘缓存 5-30 秒），准确性与后端负载之间取平衡。**岛屿的缓存策略是性能旋钮**，默认不缓存是安全起点而不是终点。

### 场景三：与客户端岛屿同页协作

真实形态：粉丝团的演出日历页——日历本体是 React 客户端岛（点月份切换、拖选日期，交互密集），页面头部是服务器岛（会员身份与积分）。两者共存于同一静态页：

```astro
<Membership server:defer fallback={<span>……</span>} />
<Calendar client:visible />
```

分工口诀落地的样子：**Membership 需要「按人不同」但没有交互——server:defer；Calendar 需要「点了才动」但内容对所有人一样——client:visible**。如果错配（头像用 client 岛 + 拉 API 实现）：多一份 JS 下载、多一次 API 往返、还有头像区闪空；反过来日历用 server 岛：每次切月都要整岛重渲染请求，交互体验崩坏。错配不是不能用，是两头都吃亏。

## 4. 修改实验

1. 把最小示例的 `fallback` 删掉，构建并观察告警与占位表现，解释为什么 fallback 几乎总要给；
2. 给场景二加第二块岛屿（同一页面放两个 server:defer 组件），Network 面板数请求数，再把两块合并成一个头部岛屿组件，对比请求数；
3. 给 Avatar 岛屿传一个不可序列化的 prop（如一个函数），观察构建报错信息，理解「序列化边界」。

<details>
<summary>参考现象（先自己试，再展开对照）</summary>

第 1 题：无 fallback 时 Astro 构建给出提示且页面岛屿位置空白直至请求返回——弱网下用户盯着空位。fallback 的本质是「静态页对该内容的最佳猜测」，给占位是体验底线。

第 2 题：两个岛屿两次端点请求（各自独立、并行）；合并成一个组件后一次请求返回合并 HTML。粒度原则：**服务器岛的拆分单位是「渲染上下文」而不是「视觉元素」**——同一批数据能出的内容放一个岛。

第 3 题：构建期报错并指出该 prop 不可序列化。岛屿的 props 要跨越「构建产物 -> 请求期服务器」的边界传递，函数/类实例过不去；需要行为逻辑就放进岛屿组件内部实现，而不是从外面传进去。

</details>

## 5. 常见错误与对策

| 现象 | 常见原因 | 解决办法 |
| --- | --- | --- |
| 构建报「需要 adapter」 | 纯静态项目用了 server:defer | 安装并配置 SSR 适配器（见 080 篇） |
| 岛屿内容永远不更新 | 整页被 CDN 长缓存且无运行时 | 确认适配器部署形态；运行时脚本未加载时岛屿不替换 |
| 构建报 props 不可序列化 | 传了函数/组件实例 | props 收敛为可序列化数据；逻辑内置到岛屿组件 |
| 每页请求数暴增 | 岛屿拆得太碎 | 按「渲染上下文」合并岛屿（场景三） |
| 个性化内容被缓存成别人的 | 岛屿响应被中间层误缓存 | 岛屿端点保持默认不可缓存；确认 CDN 规则不含该路径 |

## 6. 动手实践

任务：给一个静态 Astro 站点补上「个性化头部」，走通从静态到服务器岛的全链路。

1. 用静态输出建一个两页站点（首页 + 关于页），确认构建产物为纯 HTML；
2. 配置任一 SSR 适配器（Node 适配器最简），保持整站 `output: 'static'` 的预渲染语义，仅岛屿按请求渲染；
3. 实现本篇最小示例：Sessions 里手动写入一个假用户（开发期），首页头部显示头像；分别用「已登录」「未登录」两种 Cookie 状态访问，验证同一份静态页渲染出两种头部；
4. 打开 Network 面板观察岛屿端点请求的时序与响应体积，回答：为什么这个请求不能被 CDN 缓存？

<details>
<summary>参考要点（先自己试，再展开对照）</summary>

第 3 题：岛屿端点请求带着各自的 Cookie，服务器按 Session 状态渲染不同 HTML——「同一份 CDN 缓存页 + 各自的岛屿响应」正是这套机制的核心价值：**个性化的粒度从「整页」缩小到「一小块 HTML」**。

第 4 题：岛屿响应含 Cookie 派生的个性化内容，缓存它意味着第二个访客可能拿到第一个访客的头像（缓存投毒式的串号事故）。CDN 缓存的键是 URL 不含 Cookie，所以这类内容必须保持不缓存——这也是「岛屿只放小块内容」的根本原因。

</details>

## 参考与致谢

本文 `server:defer` 指令、fallback 行为与两段式渲染机制参考 Astro 官方文档 Server Islands 指南（MIT 许可）整理改写。来源：https://docs.astro.build/en/guides/server-islands/
