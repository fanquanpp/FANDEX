---
order: 130
title: 自动链接
module: 'markdown'
category: 工具链
difficulty: beginner
description: 自动链接：尖括号语法（CommonMark）与裸 URL 识别（GFM 扩展）的规则、边界与差异。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/050-LinkImage'
  - 'markdown/110-GitHubFlavoredMarkdown'
  - 'markdown/080-EscapeCharacter'
prerequisites:
  - 'markdown/050-LinkImage'
---

> **认知导入（Layer 1 进阶层）**
> 前置知识：017 链接与图片（自动链接是链接语法的最简形态）。
> 边界说明：自动链接分两档——尖括号 `<URL>` 是 CommonMark 标准；裸 URL 直接被识别是 GFM 扩展。两者规则不同，边界行为（哪里算链接结束）也不同。
> 强制练习：在 GitHub 上分别写 `https://github.com.` 和 `<https://github.com>.`，观察句号是否被算进链接。

## 1. 什么是自动链接

自动链接（autolink）指解析器自动把文本中的 URL 或邮箱地址转换为可点击的 `<a>` 链接，无需手写 `[文本](地址)` 语法。

| 类型 | 写法 | 归属 |
| :--- | :--- | :--- |
| 尖括号自动链接 | `<https://example.com>` | CommonMark 标准 |
| 裸 URL 自动链接 | 直接写 `https://example.com` | GFM 扩展 |

两者的取舍：尖括号写法**边界明确**（以 `</` 结尾，不会误吞标点），但源码有符号噪音；裸 URL 写法自然，但"链接到哪里为止"由识别规则决定，尾随标点需要解析器猜测。

## 2. 尖括号自动链接（CommonMark）

### 2.1 基本用法

```markdown
<https://github.com>
<http://example.com/path?q=1>
<mailto:user@example.com>
```

尖括号内是绝对 URI 时，渲染为链接文本与地址相同的超链接。

### 2.2 邮箱自动链接

尖括号内是合法邮箱时，渲染为 `mailto:` 链接：

```markdown
<user@example.com>
```

CommonMark 规范要求实现把邮箱地址做**随机化的实体编码**再写入 href，以增加爬虫直接抓取地址的难度——同一输入在两次渲染中输出的编码可能不同，这是刻意设计而非 bug。

### 2.3 语法边界

```markdown
<!-- 有效 -->
<https://example.com>
<user@example.com>

<!-- 无效：缺协议，按普通文本处理 -->
<example.com>

<!-- 无效：尖括号内不能有空格 -->
< https://example.com >
```

要点：尖括号内必须是合法的绝对 URI 或邮箱；URI 中的 `>` 要写成 `%3E` 或实体；自动链接内不允许空白。

## 3. 裸 URL 自动链接（GFM 扩展）

### 3.1 识别的三类目标

GFM 的 autolink 扩展会自动识别正文中三类文本：

```markdown
访问 https://github.com 了解更多        <!-- 带 http/https/ftp 等协议前缀的 URL -->
浏览 www.example.com 查看               <!-- www. 开头的域名（自动补 http://） -->
联系 user@example.com 获取更多信息      <!-- 裸邮箱（自动生成 mailto:） -->
```

### 3.2 边界判定规则

裸 URL 没有明确的"结束符"，GFM 用启发式规则截断：

- **空白结束**：空格、换行即链接终止；
- **尾随标点剔除**：结尾的 `.` `,` `:` `;` `!` `?` `*` `_` `~` 等不算链接的一部分，所以"见 https://github.com。"里的句号安全；
- **括号配平**：URL 内的括号按配对处理，`https://en.wikipedia.org/wiki/Go_(programming)` 的右括号若未配对则不会被吞进链接；
- **实体分号防误伤**：以 `;` 结尾且形似 HTML 实体的部分会被剔除；
- **非 ASCII 终止**：中文等非 ASCII 字符出现即终止 URL。

这些规则解释了为什么绝大多数"URL 后紧跟标点"的场景在 GitHub 上表现正常，但也提示我们：边界复杂的 URL（尾随括号、分号）用尖括号写法更保险。

## 4. 与标准链接语法的关系

### 4.1 自动链接不能自定义文本

自动链接的显示文本恒等于地址本身。要自定义文字必须用标准链接语法：

```markdown
<https://github.com>            <!-- 链接文字就是 URL -->
[GitHub](https://github.com)    <!-- 链接文字是 GitHub -->
```

### 4.2 打开方式与 rel 属性

自动链接生成的 `<a>` 不带 `target="_blank"` 与 `rel` 属性。需要控制时直接写 HTML（在允许内嵌 HTML 的环境）：

```html
<a href="https://example.com" target="_blank" rel="noopener">新窗口打开</a>
```

## 5. 安全相关行为

- **协议过滤**：CommonMark 语法层面允许任意 scheme 的尖括号自动链接，但主流站点会做白名单过滤——GitHub 对 `javascript:` 等危险协议会剥除 href，使其不可点击。自建站点应确认所用渲染器的消毒（sanitize）策略。
- **特殊字符编码**：autolink 中的 `<`、`>`、`&` 等会被转义编码后再输出，无法借自动链接注入 HTML。
- **邮箱混淆**：如 2.2 节所述，邮箱自动链接的 href 会做随机化实体编码，属于"轻度防抓取"，不是强隐私保护。

## 6. 跨平台支持对照

| 特性 | CommonMark 渲染器 | GitHub / GFM | Obsidian | Typora |
| :--- | :--- | :--- | :--- | :--- |
| 尖括号 URL `<https://...>` | 支持 | 支持 | 支持 | 支持 |
| 尖括号邮箱 `<user@example.com>` | 支持 | 支持 | 支持 | 支持 |
| 裸 URL `https://...` | 不支持（规范无） | 支持 | 支持（私有实现） | 支持 |
| 裸邮箱 | 不支持 | 支持 | 支持 | 支持 |
| `www.` 前缀 | 不支持 | 支持 | 视实现 | 支持 |
| Wiki 链接 `[[页面]]` | 不支持 | 不支持 | 支持（私有扩展） | 不支持 |

关键差异：**纯 CommonMark 渲染器只认尖括号写法**。同样一行 `https://example.com`，在 GitHub 上是链接，在严格的 CommonMark 渲染器上只是普通文本。面向不特定渲染器的文档（如开源库 README 可能被任意工具消费）建议统一加尖括号。

## 7. 常见陷阱

1. **`<example.com>` 不是链接**：尖括号内缺协议就不构成自动链接；域名加 `https://` 前缀或用标准链接语法。
2. **裸 URL 尾随括号/分号被截断**：复杂 URL 用 `<URL>` 包裹，边界一目了然。
3. **以为裸 URL 全平台生效**：CommonMark 规范没有裸 URL 自动链接，纯规范实现不会识别。
4. **在自动链接上叠加格式**：`**<https://example.com>**` 可以加粗链接，但期望改链接文字则必须用标准链接语法。
5. **尖括号内混入空格**：`< https://example.com >` 整体失效。

## 小结

- 初学者要点：把 URL 用尖括号包起来 `<https://example.com>` 就是最稳的自动链接；GitHub 上直接粘贴裸 URL 也行；想改链接文字就用 `[文本](地址)`。
- 进阶注意：尖括号是 CommonMark 标准、裸 URL 是 GFM 扩展，兼容性要求高时用前者；裸 URL 的边界靠启发式规则（剔除尾随标点、括号配平），复杂地址用尖括号规避；邮箱自动链接带随机化实体编码；危险协议依赖站点消毒策略，`target`/`rel` 等属性需求退回 HTML。
