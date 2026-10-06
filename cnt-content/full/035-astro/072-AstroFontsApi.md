---
order: 100
title: 字体与 Fonts API
module: 'astro'
category: 前端技术
difficulty: beginner
description: 手写 @font-face 的四个坑、fonts 配置与 fontProviders 全表、Font 组件与预加载、回退字体与 CLS，以及中文站点多字重子集策略
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Astro 字体工程——Fonts API（`astro:assets` 的 `Font` 组件 + `fonts` 配置），对应 Astro 官方文档 Fonts 指南。与 [样式体系](/astro/070-AstroStylesAndTheming)、[图片与图标资产](/astro/133-AstroImagesPipeline) 同属站点资源工程。
- **解决什么问题**：手写 `@font-face` 要自己操心文件托管、回退字体、预加载、隐私合规四件事，每件都能独立翻车；Fonts API 把这四件事全部自动化——构建期下载自托管、自动生成优化回退（防 CLS）、自动输出预加载、不依赖第三方域名。
- **什么时候用到**：给站点接入品牌字体或 Google 字体；排查「文字闪一下才变对」（FOUT）与「字体加载时布局跳动」（CLS）；中文站点的字重与体积治理。
- **本篇不讲**：字体在 CSS 里怎么用（`font-family` 栈、字重语义属 CSS 基础）；SVG 图标（见 [图片与图标资产](/astro/133-AstroImagesPipeline)）。

预计 25 到 40 分钟。

## 1. 手动方式的四个坑：为什么要有 Fonts API

```css
/* 手动方式：你需要自己托管文件、写 @font-face、手动加 preload */
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/MyFont.woff2') format('woff2');
  font-display: swap;
}
```

这段「教科书代码」在真实工程里有四个坑：

1. **回退字体不匹配 -> CLS**：自定义字体加载完成前后，文字占位宽度不同，页面布局跳动。修法是手工测量字体度量并写 `size-adjust`/`ascent-override`——极少有人真的做对；
2. **忘记预加载 -> FOUT 闪换**：字体 CSS 与字体文件的发现都要等渲染链走完，首屏文字先以回退字体渲染再闪换成品牌字体。修法是手动写 `<link rel="preload">` 并保证路径与 `crossorigin` 正确——写错一个属性 preload 白做；
3. **第三方字体域名的隐私与性能**：直接引用 Google Fonts 的 CSS 时，用户 IP 会泄露给第三方域名，且多一次跨域往返。合规与性能双输；
4. **多字重的文件管理**：一个家族 5 个字重 = 5 份 `@font-face` + 5 组文件，全靠人肉对齐。

Astro 6 起内置的 **Fonts API** 把这四件事全部自动化：构建期下载字体并自托管（无第三方请求）、自动生成优化回退字体（fallback metrics 消除 CLS）、自动输出 `font-display` 与预加载链接、字重以配置数组声明。

## 2. fonts 配置与 fontProviders 全表

```js
// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config'

export default defineConfig({
  fonts: [
    {
      // 从 Google Fonts 拉取并自托管（构建期下载到本地，不再依赖第三方域名）
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500, 700],
      subsets: ['latin'],
    },
    {
      // 使用本地字体文件：每个字重写一个 variant（src 指向 src/ 下的字体文件）
      provider: fontProviders.local(),
      name: 'DingTalk',
      cssVariable: '--font-ding',
      options: {
        variants: [
          { weight: 400, style: 'normal', src: ['./src/assets/fonts/DingTalk-Regular.woff2'] },
          { weight: 700, style: 'normal', src: ['./src/assets/fonts/DingTalk-Bold.woff2'] },
        ],
      },
    },
  ],
})
```

配置要点逐条：

1. **每个字体必须指定三项**：`name`（字体家族名）、`cssVariable`（注入的 CSS 变量名）、`provider`（字体来源）；
2. **内置 provider 全表**：Google、Fontsource、Adobe、Bunny、Fontshare、Google Icons、NPM 与 Local——覆盖「白嫖大厂字体库 / 订阅制商用字体 / 系统图标字体 / 自有版权文件」四类来源。选型口诀：**能本地就本地**（构建产物自包含，部署环境零外链），Google 适合快速验证与开源项目；
3. **构建期行为**：字体文件被下载进构建产物自托管；`cssVariable` 是 Fonts API 与你 CSS 的唯一交接点——组件里永远只引用变量，不知道也不用知道字体文件在哪；
4. **变量字体**：配置时省略 `weights` 即按变量字体处理，一个文件覆盖所有字重，体积进一步下降。

## 3. 在页面中启用：Font 组件与 preload

```astro
---
// src/layouts/Layout.astro
import { Font } from 'astro:assets'  // 注意：Font 组件从 astro:assets 导入
---
<!doctype html>
<html lang="zh-CN">
  <head>
    <!-- <Font /> 会在 head 中输出字体 CSS 与预加载链接 -->
    <Font cssVariable="--font-inter" preload />
    <Font cssVariable="--font-ding" preload />
  </head>
  <body>
    <slot />
  </body>
</html>
```

启用后，配置中声明的 `cssVariable` 变成可用的 CSS 变量，在任何组件里直接引用：

```css
body {
  font-family: var(--font-inter), system-ui, sans-serif;
}
h1 {
  font-family: var(--font-ding), sans-serif;
}
```

preload 的使用纪律：**只给首屏关键字体加 `preload`**。每个 preload 都是「无论用户会不会看到都要提前下载」的强承诺——正文五种字重全部 preload 的站点，等于把字体优化优化成了字体灾难。判断标准一句话：首屏用户第一眼看到的文字用什么字体，就 preload 哪个。

## 4. 三个工程场景

### 场景一：品牌站点的主字体接入

真实背景：营销站用一款商用字体（本地 woff2）做标题、Inter 做正文。按第 2、3 节配置后，验收清单：

- Network 面板确认字体请求**同源**（自托管生效，无第三方域名）；
- 对比接入前后的 CLS 指标（Lighthouse）：回退字体度量对齐后布局跳动应消失；
- 断网测试 `font-display` 行为：字体加载失败时页面以回退字体正常可读。

### 场景二：内容站的正文阅读字体

真实背景：FANDEX 这类文档站，正文以系统字体栈为主、代码块用等宽字体——Fonts API 的价值在「按需增量接入」：只给代码块接一款等宽字体（如 JetBrains Mono 的 google provider），正文保持系统栈零成本。这利用了 Fonts API 的**变量作用域**特性：`cssVariable` 只在引用它的元素生效，不接入就零开销。

### 场景三：中文站点的多字重与子集策略

真实背景：中文站点接品牌字体时最容易踩体积坑——一款中文字体全量文件动辄 5-10MB，五档字重直接不可用。Fonts API 的 `subsets` 机制对拉丁字体有效（`subsets: ['latin']`），但**中文通常不在 provider 的 subset 清单里**，需要自己治理：

1. **字重收敛**：中文品牌字体实际使用收敛到 2-3 档（常规 + 粗），标题字重用 CSS `font-weight` 的合成粗体或英文品牌字体的多档——中文全字重的收益远小于体积代价；
2. **子集化自托管**：用 fontmin 等工具按站点实际字符集（导航、标题、常用文案）打出子集字体，再走 `fontProviders.local()` 接入 Fonts API——子集负责体积，Fonts API 负责回退对齐与预加载，两层各司其职；
3. **动态内容回退栈**：用户生成内容（评论、投稿标题）的字符集不可预知，这类文字**不进品牌字体**，CSS 变量栈写成 `var(--font-brand), var(--font-inter), system-ui`——品牌字体只覆盖封闭字符集（站点自己的 UI 文案），动态文字自然落到系统字体；
4. **验证闭环**：Lighthouse 的「未使用字形」审计 + Network 面板字体体积，是子集策略是否生效的客观判据。

一句话总结：**拉丁字体交给 Fonts API 的 subsets，中文字体自管子集再交给 Fonts API 托管**——API 不解决中文子集问题，但解决子集之后的一切。

## 5. 修改实验

1. 把场景一配置里的 `preload` 全部去掉，用 DevTools Performance 录制首屏，观察文字的闪换时序；再加回 preload 对比；
2. 给本地字体的 variants 只留 400 一档，然后在 CSS 里用 `font-weight: 700` 引用，观察浏览器的合成加粗与真实粗字重的差异；
3. 故意把 `cssVariable` 配置成与 `name` 无关的名字（如 `--font-x`），在 CSS 里引用旧变量名，观察失效现象并解释「变量是唯一交接点」。

<details>
<summary>参考现象（先自己改，再展开对照）</summary>

第 1 题：无 preload 时首屏文字先以回退字体渲染，字体文件加载完成后闪换（FOUT），Performance 面板可见字体请求晚于首次绘制；加 preload 后字体请求提前到与 HTML 并行，闪换窗口大幅缩短甚至消失。

第 2 题：没有 700 档时浏览器对 400 档做描边式合成加粗——笔画间距失真、发虚；补上真实 700 variant 后笔画正常。这解释了「为什么品牌字体建议配齐实际用到的字重」而不是全靠合成。

第 3 题：CSS 引用的变量在页面里未定义，`font-family` 整条失效回退到后续栈——字体「静默消失」且无报错。Fonts API 的契约是「配置声明变量、CSS 消费变量」，两边名字必须严格一致，重命名变量时全局搜索所有引用。

</details>

## 6. 动手实践

任务：给自己的 Astro 站点完成一次「字体体检与接入」。

1. 盘点现状：搜索项目里所有 `@font-face` 与第三方字体 `<link>`，按第 1 节四坑逐条对照，记录命中了几个坑；
2. 接入 Fonts API：选一款 Google 字体（或本地字体）走完整配置——`fonts` 配置、Layout 里 `<Font preload />`、CSS 引用变量；验收走场景一的三条清单；
3. 中文站点加做第 3 场景的步骤 1 与 4：统计实际字重使用、跑一次 Lighthouse 记录字体相关指标作为基线。

<details>
<summary>参考要点（先自己试，再展开对照）</summary>

第 1 题常见命中：`<link href="fonts.googleapis.com">`（坑 3）与无 preload 的本地 `@font-face`（坑 2）几乎必中其一；手工 `size-adjust`（坑 1）基本无人做对——这三条正是迁移 Fonts API 的直接理由。

第 2 题验收判断：Network 里字体请求 URL 与站点同域（自托管生效）、Lighthouse CLS 为 0 或接近 0、断网页面可读。三条全过才算接入完成，缺一条回到第 1 节对应坑位排查。

第 3 题基线记录要存档（写进项目 README 或性能预算文件）：下次有人想加第五档字重时，用基线数据讨论代价，而不是「感觉没问题」。

</details>

## 7. 常见错误与对策

| 常见错误 | 典型现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 手动 `@font-face` 字体 404 | 控制台字体加载失败 | 路径写错或未正确处理 `font-display` | 改用 Fonts API：`fontProviders.local()` + `<Font />` |
| 文字闪换明显（FOUT） | 首屏文字先回退后变样 | 关键字体未 preload | 首屏关键字体的 `<Font />` 加 `preload` |
| 字体加载时页面跳动（CLS） | 布局元素位移 | 回退字体度量不匹配 | Fonts API 的 fallback metrics 自动处理；手动方案需 `size-adjust` |
| 预加载了整族字体 | 首屏网络被字体占满 | preload 无差别施加 | 只 preload 首屏关键字体（第 3 节纪律） |
| 改了 `cssVariable` 名字字体失效 | 样式静默回退 | CSS 与配置的变量名不一致 | 变量是唯一交接点，重命名必须全局同步 |
| 中文字体体积爆炸 | 字体文件数 MB | 全量字体未子集化 | 第 4 节场景三：字重收敛 + 自管子集 + local provider |

## 8. 一句话记忆

字体是门面，交给 Fonts API 这个专业团队：你只声明「用哪个（provider）、叫什么（name）、变量名是什么（cssVariable）」——托管、回退对齐、预加载全是它的活；中文先自管子集，再入伙。

## 参考与致谢

本文 Fonts API 配置结构、provider 机制与 Font 组件行为参考 Astro 官方文档 Fonts 指南（MIT 许可）整理改写。来源：https://docs.astro.build/en/guides/fonts/
