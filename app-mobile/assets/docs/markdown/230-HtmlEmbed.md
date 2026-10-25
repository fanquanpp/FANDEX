---
order: 230
title: Markdown HTML 内嵌
module: 'markdown'
category: 工具链
difficulty: intermediate
description: '内嵌 HTML 的机制与边界：块级行内规则、GitHub 消毒白名单、details 折叠与实用标签，及安全注意事项。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/160-SubscriptSuperscript'
  - 'markdown/050-LinkImage'
  - 'markdown/100-Table'
  - 'markdown/180-AdmonitionCallout'
prerequisites:
  - 'markdown/040-BasicTextFormat'
---

> **认知导入（Layer 1 进阶层）**
> 前置知识：004 行内格式（HTML 是它的"逃生舱"延伸）。
> 边界说明：Markdown 从设计之初就允许内嵌 HTML，但**每个平台都会对 HTML 做安全过滤**——标签白名单、属性剥离各不相同。本篇的核心是分清"Markdown 层写什么"与"平台层允许多少"，最大的坑是 GitHub 会剥离 `style` 属性，网上大量颜色/字号示例在 GitHub 上根本不生效。
> 强制练习：在 GitHub 的 md 文件里写 `<span style="color:red">红</span>` 和 `<mark>高亮</mark>`，预览对比——前者原样剥掉属性、后者正常生效。

## 1. 机制：Markdown 为什么能嵌 HTML

CommonMark 把 HTML 区分为两类处理：

- **行内级 HTML**（`<span>`、`<kbd>`、`<sub>` 等）：出现在段落文本中，与 Markdown 行内语法并存；
- **块级 HTML**（`<div>`、`<table>`、`<details>` 等）：以标签开头的一整块区域，内部**默认不解析 Markdown**。

```markdown
这是一个段落，中间嵌了 <strong>行内标签</strong>。

<div>
块级 HTML 区域，这里的 Markdown 语法（**加粗**）默认不解析。
</div>
```

块级标签前后各留一个空行是良好习惯：既保证块边界稳定，也让源码可读。

## 2. GitHub 的消毒行为（先读这节再写 HTML）

GitHub（以及多数托管平台）对内嵌 HTML 执行白名单消毒（sanitize）：

| 处理 | 行为 | 典型后果 |
| :--- | :--- | :--- |
| 白名单外标签 | 剥离或转义 | `<script>`、`<iframe>`、`<style>` 等不执行 |
| `style` 属性 | **一律剥离** | 所有颜色、字号、字体样式在 GitHub 上无效 |
| `class` / `id` 属性 | 剥离 | 无法挂自定义样式或站内锚点定位样式 |
| 少数布局属性 | 保留 | `align`、`img` 的 `width`/`height`/`align` 可用 |
| tagfilter 扩展 | `<title>`、`<textarea>`、`<style>`、`<iframe>`、`<script>` 等原样转义显示 | 源码可见但不执行 |

结论：**在 GitHub 上做视觉定制只有三个可靠出口**——`align` 属性（居中/右对齐）、`img` 的宽高属性、以及 `<details>` 折叠。想要颜色与字号，只能依赖平台已有的语义标签（如 `<mark>` 高亮），或放弃这类样式。

## 3. 稳定可用的实用标签

以下标签在 GitHub、GitLab、Obsidian 及多数站点生成器上行为一致，是"放心用"清单。

### 3.1 语义文本标签

```markdown
<u>下划线</u>　<mark>高亮</mark>　<kbd>Ctrl</kbd> + <kbd>C</kbd>
x<sup>2</sup>　H<sub>2</sub>O
<s>已失效</s>　<del>已删除</del>
```

- `<mark>` 高亮：GitHub 可用——想要"高亮"效果用这个，而不是 `==文本==`（GitHub 不支持）；
- `<kbd>` 键盘按键：快捷键说明的标准写法；
- `<sup>`/`<sub>`：上下标，详见 `markdown/160-SubscriptSuperscript`。

### 3.2 折叠区块 details/summary

```markdown
<details>
<summary>点击展开排查步骤</summary>

1. 检查环境变量
2. 重启服务

</details>
```

两个要点：

- `<summary>` 结束标签与内容之间**必须留空行**，空行之后的 Markdown（列表、代码块）才会被解析；
- 加 `open` 属性（`<details open>`）默认展开；`<details>` 可嵌套。

这是 GitHub README 收纳长目录、长日志、环境信息的首选手段（结合目录的用法见 `markdown/200-AutoTOC`）。

### 3.3 图片尺寸与对齐

Markdown 图片语法控制不了尺寸，用 `<img>`：

```markdown
<img src="https://example.com/logo.png" alt="Logo" width="200" />

<p align="center">
  <img src="https://example.com/logo.png" alt="Logo" width="200" />
</p>
```

`width`/`height` 与 `align` 属性在 GitHub 上保留，是 README 排版的主力工具。徽章组合也是同一思路：

```markdown
<p align="center">
  <img src="https://img.shields.io/badge/build-passing-green" alt="build" />
  <img src="https://img.shields.io/badge/version-1.0-blue" alt="version" />
</p>
```

### 3.4 复杂表格（合并单元格）

GFM 表格不支持合并单元格，需要时退回 HTML 表格（详见 `markdown/100-Table`）：

```markdown
<table>
  <tr>
    <th>模块</th>
    <th colspan="2">配置项</th>
  </tr>
  <tr>
    <td rowspan="2">数据库</td>
    <td>host</td>
    <td>localhost</td>
  </tr>
  <tr>
    <td>port</td>
    <td>5432</td>
  </tr>
</table>
```

### 3.5 注释

```markdown
<!-- 这段注释不会渲染到页面 -->
正式内容。
```

用于给源码读者留协作说明，或临时屏蔽一段内容。

## 4. 受限或不可靠的用法

| 需求 | 常见错误写法 | 实际情况与替代 |
| :--- | :--- | :--- |
| 彩色文字 | `<span style="color:red">` | GitHub 剥离 `style`；无可靠替代，改为加粗/高亮/徽章图 |
| 自定义字号 | `<font size="5">` | `<font>` 已废弃且多数平台剥离；放弃 |
| 嵌入网页 | `<iframe src="...">` | tagfilter 转义，不执行；放链接 |
| 嵌入视频 | `<video src="...">` | GitHub 上推荐拖拽上传（自动生成附件播放器）或贴外站链接 |
| CSS 类样式 | `<div class="alert">` | `class` 被剥离；GitHub 上用警报块（`markdown/180-AdmonitionCallout`） |
| 居中标题 | `<div align="center"><h1>...` | `align` 可用，此写法在 GitHub 成立，但注意块级 HTML 内的 Markdown 不解析 |

## 5. 块级 HTML 与 Markdown 混用的边界

块级 HTML 内部默认不解析 Markdown，因此"在 div 里写 Markdown 列表"是常见翻车点：

```markdown
<div>
**这里的加粗不会生效**
</div>
```

规律：

1. **HTML 块内不解析 Markdown**（CommonMark 规则；部分渲染器提供 `markdown="1"` 等私有扩展，不可依赖）；
2. HTML 块**结束后**恢复 Markdown 解析，务必用空行结束 HTML 块；
3. `<details>` 里的空行规则见 3.2 节——这是唯一的"HTML 块内解析 Markdown"例外路径（通过空行切出独立的 Markdown 区域）。

务实原则：一个区域要么全用 Markdown，要么全用 HTML，混写只留给 `<details>` 折叠这类受支持的模式。

## 6. 跨平台支持对照

| 环境 | 内嵌 HTML | style 属性 | 说明 |
| :--- | :--- | :--- | :--- |
| GitHub | 白名单内可用 | 剥离 | 最严格，本文以它为基准 |
| GitLab | 较宽松 | 部分允许 | 消毒策略与 GitHub 不同，跨平台别依赖 |
| Obsidian | 支持 | 支持 | 阅读视图渲染 HTML，但导出与主题可能影响效果 |
| Hugo / Jekyll | 默认允许 | 允许 | 站点自己负责安全，可加消毒管线 |
| MkDocs | 默认允许 | 允许 | `md_in_html` 扩展可让 HTML 块内解析 Markdown |

跨平台文档的稳妥策略：只用"语义标签 + 白名单属性"（第 3 节清单），不做视觉定制；确需定制的部分下沉到站点模板或 CSS 层，而不是写死在 Markdown 里。

## 7. 安全注意事项

- 内嵌 HTML 会**原样输出**到页面，给不可信内容（用户提交、抓取数据）套 Markdown 管线时，必须确认渲染器开启了消毒，否则等于开放 XSS 注入；
- 不要为了效果寻找"绕过平台过滤"的写法（事件属性、内联脚本）——过滤器正是为此存在；
- `target="_blank"` 的外链应配合 `rel="noopener noreferrer"`：

```markdown
<a href="https://example.com" target="_blank" rel="noopener noreferrer">新窗口打开</a>
```

## 小结

- 初学者要点：Markdown 里能直接写 HTML；GitHub 上可靠的只有语义标签（`<mark>`、`<kbd>`、`<sup>`/`<sub>`）、`<details>` 折叠、`<img>` 宽高与 `align` 对齐；块级 HTML 内不解析 Markdown。
- 进阶注意：GitHub 剥离 `style`/`class`/`id`，一切颜色字号示例先在目标平台验证；tagfilter 会转义 `<iframe>`/`<style>` 等；`<details>` 的 summary 后留空行才能解析内部 Markdown；HTML 与 Markdown 混写遵循"整块二选一"；处理不可信内容必须开消毒。
