---
order: 440
title: 专项：2023-2025 新元素与新能力
description: 近年落地的新 HTML 能力速成：<search> 搜索语义元素、可定制 select（appearance: base-select 与 selectedcontent）、hidden="until-found" 与 beforematch、Speculation Rules 预渲染，附兼容性判断策略与降级写法。
module: 'html5'
category: 前端技术
difficulty: intermediate
author: fanquanpp
updated: '2026-09-08'
related:
  - 'html5/010-SemanticTag'
  - 'html5/041-HTML5DialogPopoverGuide'
  - 'html5/038-CriticalRenderingPathAndResourceLoading'
prerequisites:
  - 'html5/010-SemanticTag'
---

## 学习目标

- [ ] 能用 `<search>` 包裹搜索/过滤区域，并说出它与 `role="search"` 的关系
- [ ] 能启用可定制 select（`appearance: base-select`），在 `option` 里内嵌图片等富内容，并用 `<selectedcontent>` 自定义闭合态展示
- [ ] 能用 `hidden="until-found"` 让折叠内容"可被浏览器查找"，并解释 `beforematch` 事件的用途
- [ ] 能写一段 Speculation Rules，让站内链接被预取/预渲染，并说清它的兼容性边界
- [ ] 面对任何新 HTML 特性，能按本篇的"三步兼容性策略"决定用不用、怎么降级

## 一句话理解

> HTML 标准是"活"的（WHATWG Living Standard，即持续更新的活标准，不存在 HTML6 这种大版本）：近几年它悄悄补齐了几块拼图——给搜索框正名、把下拉框从"只能写纯文字"中解放出来、让 `display: none` 的内容也能被 Ctrl+F 找到、以及让浏览器提前准备下一个页面。

这些能力有一个共同点：**都是渐进增强**——旧浏览器要么忽略、要么按老行为处理，页面不会坏。所以可以放心学、按场景用。

## <search>：搜索区域的语义元素

### 痛点与引入

过去写一个站内搜索框，常见写法是：

```html
<!-- 旧写法：语义要靠 ARIA 补 -->
<div class="search" role="search">
  <form action="/search">
    <input type="search" name="q" placeholder="搜索文章">
    <button type="submit">搜索</button>
  </form>
</div>
```

`<input type="search">` 只表达了"这个输入框是搜索框"，而**整块搜索区域**（输入框 + 按钮 + 筛选项）没有对应的 HTML 语义，只能靠 `role="search"` 手动标注。2023 年起，HTML 标准加入了 `<search>` 元素（Baseline 2023，各现代浏览器均可安全使用），把这个坑补上了：

```html
<!-- 新写法：容器本身即搜索地标 -->
<search>
  <form action="/search">
    <input type="search" name="q" placeholder="搜索文章">
    <button type="submit">搜索</button>
  </form>
</search>
```

### 要点

- `<search>` 表示"一组与搜索或过滤相关的内容"，不仅限于全站搜索——文章列表顶部的筛选区、表格上方的过滤输入框都适用；
- 它在无障碍树中等价于 `role="search"` 地标（landmark，读屏软件可按键跳转的页面区域），读屏用户可以像跳转 `<nav>`、`<main>` 一样直接跳到搜索区；
- `<search>` 本身不提供任何样式与行为，仍要靠内部的 `<form>` 提交；它只是"语义容器"；
- 不要把搜索**结果列表**放进 `<search>`——它标注的是搜索工具本身，不是结果。

### 常见陷阱

```html
<!-- 错误写法：给 search 再叠一层 role，冗余 -->
<search role="search">...</search>
```

`<search>` 已经隐式携带 `search` 地标角色，再写 `role="search"` 属于重复标注。只有当你用 `<div>`/`<form>` 模拟时才需要显式 `role="search"`。

## 可定制的 select：appearance: base-select

### 痛点与引入

`<select>` 是最难定样的原生控件：`<option>` 里只能放纯文本，浏览器渲染的下拉面板几乎无法控制，于是大家用 `<div>` + 无障碍补丁手搓下拉菜单——代码量几百行还容易做出键盘不可用的残次品。

Customizable Select（可定制 select）改变了这一点：通过 `appearance: base-select` 打开"基础外观"模式后，`<option>` 里可以内嵌图片、加粗文字等富内容，下拉面板可以用 `::picker(select)` 伪元素自由定制，而键盘导航、焦点管理、表单提交等原生行为**全部保留**。该特性于 2025 年进入 Baseline Newly Available：Chrome/Edge 135 起支持，Safari 18.4 起支持，Firefox 也在 2025 年内跟进（写作教学或生产使用前，建议再到 MDN/caniuse 复核最新支持面）。

### 第一步：打开 base-select 模式

```css
/* 必须同时作用于 select 本体与下拉面板（::picker(select)）
   缺一处时整组退回传统外观，这是有意的"全有或全无"设计 */
select,
::picker(select) {
  appearance: base-select;
}
```

`::picker(select)` 是下拉面板（弹出部分）的伪元素，可以像普通盒子一样设背景、边框、圆角、阴影。

### 第二步：option 内嵌富内容

```html
<label for="lang">选择语言</label>
<select id="lang" name="lang">
  <!-- option 里现在可以放图片与多行结构（不能放按钮、链接等可交互内容） -->
  <option value="html">
    <img class="flag" src="/img/html.svg" alt="">HTML
    <span class="desc">结构层</span>
  </option>
  <option value="css">
    <img class="flag" src="/img/css.svg" alt="">CSS
    <span class="desc">表现层</span>
  </option>
  <option value="js">
    <img class="flag" src="/img/js.svg" alt="">JavaScript
    <span class="desc">行为层</span>
  </option>
</select>
```

```css
/* 选中态高亮：checkmark 伪元素会在选中项前显示对勾 */
select option:checked {
  background: #e8f0fe;
}
```

### 第三步：用 <selectedcontent> 定制闭合态

默认情况下，选中后 `<select>` 按钮上显示的是选中项的纯文本。`<selectedcontent>` 元素可以把**选中项的完整内容**（含图片）克隆到闭合态展示——它是 2025 年新增的专用元素，通常嵌在 select 内部的 `button` 里使用：

```html
<select id="lang2">
  <!-- select 内部的 button：自定义"未展开时"的样子 -->
  <button>
    <selectedcontent></selectedcontent>
  </button>
  <option value="html">
    <img class="flag" src="/img/html.svg" alt="">HTML
  </option>
  <option value="css">
    <img class="flag" src="/img/css.svg" alt="">CSS
  </option>
</select>
```

展开选中的是什么，闭合态就原样显示什么（图片、排版一并镜像）。没有 `<selectedcontent>` 时，闭合态退化为显示选中项的文本内容。

### 兼容性与降级

- 不支持 `appearance: base-select` 的浏览器会忽略该值，`<select>` 保持传统外观：`option` 里的富内容退化为纯文本，`<selectedcontent>` 与 `::picker(select)` 被忽略——**表单功能完全不受影响**，这正是"渐进增强"的样板；
- 特性检测可用 CSS `@supports (appearance: base-select)` 包裹定制样式；
- `option` 内可以放图片、标题、多段文字等展示性内容，但不能放按钮、链接、其他表单控件等可交互内容。

## hidden="until-found"：让隐藏内容可被浏览器找到

### 痛点与引入

手风琴（accordion）、折叠面板的正文通常写成 `display: none`（或 `hidden` 属性）。代价是：用户按 Ctrl+F 在页内搜索时，**藏在折叠区里的关键词永远搜不到**——文字明明在 HTML 里，浏览器却不告诉用户。`hidden` 属性的 `until-found` 状态专治这个问题：

```html
<button type="button" aria-expanded="false" aria-controls="refund">退款政策</button>

<!-- until-found：视觉上隐藏，但 Ctrl+F 命中其中文字时浏览器会自动展开 -->
<section id="refund" hidden="until-found">
  <p>签收后 7 日内可申请无理由退款，定制类商品除外……</p>
</section>

<script>
  // beforematch：浏览器因为"页面内查找命中"而即将显示元素时触发
  const panel = document.getElementById('refund');
  const btn = panel.previousElementSibling;
  panel.addEventListener('beforematch', () => {
    // 同步展开手风琴的 UI 状态，避免"内容显示了、箭头还朝右"的错位
    btn.setAttribute('aria-expanded', 'true');
    btn.textContent = '退款政策（已展开）';
  });
</script>
```

### 行为细节

- `hidden="until-found"` 的元素**视觉隐藏且不参与 Tab 焦点序**（这一点和普通 `hidden` 一致），但其内容可被浏览器页内查找（Ctrl+F）、滚动锚定等"查找类"功能命中；
- 一旦命中，浏览器先在元素上派发 `beforematch` 事件，然后移除隐藏状态显示内容——`beforematch` 给了你一个同步更新折叠 UI（按钮箭头、`aria-expanded`）的机会；
- `hidden="until-found"` 会匹配 CSS 属性选择器 `[hidden="until-found"]`，可据此定制它的占位样式（如显示"内容已隐藏，搜索可展开"的提示行）；
- 在不支持的浏览器里，这个取值会被当作普通 `hidden` 处理：内容同样不可见，只是少了"可被找到"的增强——页面不会坏；
- 兼容性：这是现行标准特性，Chromium 系浏览器落地最早，其余引擎的支持进度以 MDN/caniuse 为准，使用前务必复核。

### 常见陷阱

| 问题 | 原因 | 建议 |
| --- | --- | --- |
| 内容"显示"了但折叠箭头没变 | 没监听 `beforematch` | 在事件里同步展开状态 |
| 想做 Tab 切换的面板用 until-found | 它仍不可聚焦，键盘用户进不去 | 标签页面板改用 `hidden` + JS 切换 |
| 依赖它做敏感信息隐藏 | until-found 不是安全机制，命中即显示 | 敏感内容放服务端，别放进 DOM |

## Speculation Rules：让浏览器提前准备下一个页面

### 是什么

Speculation Rules API 是一种声明式规则：写在 `<script type="speculationrules">` 里，告诉浏览器"哪些链接大概率会被点击，请提前预取（prefetch，只下载文档）或预渲染（prerender，连渲染都先做好）"。用户真点下去时，页面几乎瞬间出现——这是 Chromium 系浏览器提供的现行能力（同源场景），Firefox/Safari 目前不支持，但不支持者会把这段 script 当作未知类型直接忽略，零副作用。

生活化类比：预取是"提前把菜买回家"，预渲染是"提前把菜做好摆上桌"——客人（用户点击）一到，立刻开饭。

### 按规则列表预渲染指定页面

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "source": "list",
      "urls": ["/checkout", "/next-article"]
    }
  ]
}
</script>
```

### 按文档规则批量覆盖站内链接

更常用的写法是 `source: "document"`：不逐个列 URL，而是用选择器圈定范围，用 `eagerness` 控制"多积极"：

```html
<script type="speculationrules">
{
  "prefetch": [
    {
      "source": "document",
      "where": { "href_matches": "/articles/*" },
      "eagerness": "moderate"
    }
  ],
  "prerender": [
    {
      "source": "document",
      "where": { "href_matches": "/articles/*" },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

`eagerness` 从保守到激进大致为：

| 取值 | 触发时机（近似） | 适用 |
| --- | --- | --- |
| `conservative` | 指针按下（pointerdown）时 | 通用默认，几乎不浪费 |
| `moderate` | 悬停片刻（约 200ms）或按下 | 文章列表等"可预判点击"场景 |
| `eager` | 更早，悬停即可能触发 | 高置信度的少数链接 |

具体触发信号以 Chrome 官方文档为准；拿不准就从 `conservative` 起步，观察预取命中率再调。

### 边界与注意事项

- 兼容性局限：Chromium 系浏览器支持，且以**同源链接**为主；跨域预取/预渲染有额外限制，不要依赖；
- 只对"整页导航"有意义——SPA（无刷新换页）用不上它，路由级预加载应走框架方案；
- 预渲染会真实执行目标页的 JS，**有副作用的脚本**（埋点上报、自动播放）可能被提前触发；带用户特定行为的页面可用规则排除（`where` 支持 `and`/`or`/`not` 组合与 `selector_matches`）；
- 服务端可用 `Supports-Loading-Mode` 响应头控制是否允许被预渲染（如拒绝敏感页）；
- 调试：Chrome DevTools 的 Application 面板有 Back/forward cache 与 Speculations 相关面板，可看到每条规则命中了哪些链接。

## 新能力速查与兼容性三步策略

| 能力 | 状态定位 | 旧浏览器行为 |
| --- | --- | --- |
| `<search>` | Baseline 2023，可放心用 | 当作未知元素（类似 div），建议补 `role="search"` 于旧场景 |
| popover / command、commandfor | popover 为 Baseline 2024；command/commandfor 自 Chrome/Edge 135 起支持 | 属性被忽略，按钮无动作，需 JS 兜底（详见 041 专项） |
| Customizable Select | 2025 进入 Baseline Newly Available | 传统 select 外观，功能不受影响 |
| `hidden="until-found"` | 现行特性，各引擎落地进度不一 | 当作普通 hidden |
| Speculation Rules | Chromium 侧现行能力（同源为主） | script 被忽略，零影响 |

面对任何新特性，建议固定走这三步：

1. **定性**：查 MDN/caniuse 确认它处于 Baseline 哪一档、目标用户浏览器的覆盖面；
2. **定损**：问"旧浏览器忽略它会发生什么"——功能不坏（如本篇四个特性）才可直接上；功能坏（如依赖 command/commandfor 完成唯一交互）就必须写 JS 兜底；
3. **定观测**：上线后用特性检测（`'command' in HTMLButtonElement.prototype` 之类）分流统计，而不是凭感觉升级。

## 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| `<search>` 写了但样式全丢 | 以为它是表单控件 | 它只是语义容器，表单行为靠内部 `<form>` |
| base-select 不生效 | 只给 select 设了 appearance，漏了 `::picker(select)` | 两处同时设 `appearance: base-select` |
| option 里放了按钮没反应 | 内嵌内容不允许可交互元素 | 富内容限于展示性元素 |
| until-found 内容被找到时 UI 错乱 | 缺 `beforematch` 同步 | 事件里同步展开按钮与 aria 状态 |
| 预渲染导致埋点数据虚高 | 目标页脚本被提前执行 | 规则中排除带副作用页面，或改造脚本感知预渲染 |
| 保守起见干脆不用新特性 | 怕兼容问题 | 本篇特性均属渐进增强，按"三步策略"评估即可 |

## 动手试试

### 入门版

1. 给自己的站点头部加 `<search>` 包裹的搜索表单，用 DevTools 的无障碍树确认出现 `search` 地标；
2. 做一个"语言选择器"：启用 base-select，在 `option` 里放图标与描述文字，再尝试 `<selectedcontent>` 镜像闭合态；
3. 写一个折叠面板，正文用 `hidden="until-found"`，按 Ctrl+F 搜正文中某个词，观察自动展开与 `beforematch` 触发。

### 进阶版

1. 给博客列表页加 Speculation Rules：`prefetch` 用 `moderate`、`prerender` 用 `conservative`，在 DevTools 里验证预取命中记录；
2. 用 `where` 的 `not` 组合排除"退出登录"等敏感链接；
3. 写一个通用特性检测脚本：按本篇四个能力逐项输出支持与否，形成团队自己的"新特性雷达"。

## 小结

初学者记住这三点：

1. `<search>` 给搜索/过滤区正名，等价 `role="search"`，里面仍要放 `<form>`；
2. 可定制 select 用 `appearance: base-select` 打开，`option` 能放图片等富内容，`<selectedcontent>` 让闭合态也显示富内容；旧浏览器自动退回传统 select，功能不坏；
3. `hidden="until-found"` 让折叠内容能被 Ctrl+F 找到，配合 `beforematch` 同步 UI；Speculation Rules 用一段 JSON 让 Chromium 提前预取/预渲染站内链接，其他浏览器忽略之。

进阶者还需注意：

- 这组能力的共同范式是**渐进增强**：先确认"旧浏览器忽略后功能不坏"，再决定是否需要 JS 兜底；
- `command`/`commandfor`、`popover="hint"` 等交互向新能力见 041 专项；本篇聚焦结构与性能向能力，两者合起来覆盖 2023-2025 的主要 HTML 新面；
- 版本支持面变化快，任何"某浏览器某版本起支持"的表述，写作与决策时都应回到 MDN/caniuse 复核，不要凭记忆断言。

## 下一步

结构向新能力学完，可以回到主线补齐渲染与性能的底层视角：`html5/038-CriticalRenderingPathAndResourceLoading` 讲清浏览器如何把 HTML 变成像素，Speculation Rules 的收益正建立在它之上；交互向新能力（dialog/popover/Invoker Commands）见 `html5/041-HTML5DialogPopoverGuide`。
