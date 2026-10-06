---
order: 50
title: Markdown 链接与图片
module: 'markdown'
category: 工具链
difficulty: intermediate
description: 行内链接、引用链接、自动链接、图片嵌入、替代文本必填与图片套链接的嵌套写法。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/150-Footnote'
  - 'markdown/220-Mermaid'
  - 'markdown/280-EditorFeature'
  - 'markdown/290-ConversionTool'
  - 'markdown/200-AutoTOC'
prerequisites:
  - 'markdown/010-SyntaxGuide'
---

## 知识点地图

- **知识类别**：链接与图片——Markdown 文档的引用与媒体嵌入语法（行内式、引用式、自动链接、图片与嵌套写法）。脚注是另一种引用形态，归 150-Footnote 专篇，本篇不再展开。
- **解决什么问题**：文档怎么可靠地指向外部资源与本仓库内文件；图片怎么在渲染器之间稳定显示（替代文本必填、相对路径）。
- **什么时候用到**：写 README 与文档站；给图片写无障碍描述；引用图片的图片（徽章、缩略图跳转）。

> **认知导入（Layer 0 生存层）**
> 前置知识：006 列表语法。
> 边界说明：链接与图片让文档从“文字”变成“网页内容”；图片路径写错时渲染为占位图，这是最常见的报错场景。
> 强制练习：写一个链接 `[文字](https://example.com)` 和一个本地图片 `![alt](images/a.png)`；故意把图片路径写错，观察占位效果。

## 1. 链接 (Links)

### 1.1 行内链接 (Inline Links)

**语法**：`[链接文本](URL "可选的标题")`
**示例**：

```markdown
[GitHub](https://github.com 'GitHub 官方网站')
[Markdown 指南](https://www.markdownguide.org)
```

**渲染效果**：
[GitHub](https://github.com 'GitHub 官方网站')
[Markdown 指南](https://www.markdownguide.org)

### 1.2 引用链接 (Reference Links)

**语法**：

```markdown
[链接文本][引用标识符]
[引用标识符]: URL "可选的标题"
```

**示例**：

```markdown
[GitHub][github]
[Markdown 指南][md-guide]
[github]: https://github.com "GitHub 官方网站"
[md-guide]: https://www.markdownguide.org "Markdown 官方指南"
```

**渲染效果**：
[GitHub][github]
[Markdown 指南][md-guide]
[github]: https://github.com "GitHub 官方网站"
[md-guide]: https://www.markdownguide.org "Markdown 官方指南"

### 1.3 自动链接 (Auto Links)

**语法**：`<URL>` 或 `<电子邮件地址>`
**示例**：

```markdown
<https://github.com>
<example@example.com>
```

**渲染效果**：
<https://github.com>
<example@example.com>

### 1.4 相对链接 (Relative Links)

**语法**：使用相对路径指向本地文件或目录
**示例**：

```markdown
[README 文件](./README.md)
[图片目录](../assets/)
```

仓库内相对链接在 GitHub/GitLab 上会跳转到对应文件页面，是项目文档互链的标准方式（锚点组合用法见 `markdown/190-AnchorLinks`）。

### 1.5 URL 中的空格、括号与特殊字符

目的地含空格时，用 `%20` 编码，或用尖括号包裹目的地（CommonMark 支持）：

```markdown
[文档](<./my notes/overview.md>)
[文档](./my%20notes/overview.md)
```

URL 中的括号（常见于维基百科链接）会让解析器误判链接边界，用 `%28`/`%29` 编码或尖括号包裹：

```markdown
[Go 语言](<https://en.wikipedia.org/wiki/Go_(programming_language)>) <!-- 稳妥 -->
```

链接文本内的方括号需要先用反斜杠转义。

## 2. 图片 (Images)

### 2.1 基本语法

**语法**：`![替代文本](图片URL "可选的标题")`
**示例**：

```markdown
![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png 'GitHub Logo')
```

**渲染效果**：
![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png 'GitHub Logo')

### 2.2 引用图片

**语法**：

```markdown
![替代文本][图片引用标识符]
[图片引用标识符]: 图片URL "可选的标题"
```

**示例**：

```markdown
![GitHub Logo][github-logo]
[github-logo]: https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png "GitHub Logo"
```

**渲染效果**：
![GitHub Logo][github-logo]
[github-logo]: https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png "GitHub Logo"

### 2.3 本地图片

**语法**：使用相对路径指向本地图片文件
**示例**：

```markdown
![本地图片](../images/example.png)
```

### 2.4 图片链接

**语法**：将图片嵌套在链接中
**示例**：

```markdown
[![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)](https://github.com)
```

**渲染效果**：
[![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)](https://github.com)

## 3. 最佳实践

### 3.1 链接最佳实践

1. **使用描述性的链接文本**：链接文本应该清晰地描述链接的目标，避免使用"点击这里"等模糊描述
2. **添加标题属性**：对于重要的链接，添加标题属性可以提供更多上下文信息
3. **使用引用链接**：对于重复使用的链接，使用引用链接可以使代码更整洁
4. **检查链接有效性**：定期检查链接是否仍然有效

### 3.2 图片最佳实践

1. **添加替代文本**：为图片添加有意义的替代文本，提高可访问性
2. **优化图片大小**：确保图片大小适中，避免影响页面加载速度
3. **使用相对路径**：对于本地图片，使用相对路径可以确保在不同环境中都能正确显示
4. **添加图片标题**：对于复杂图片，添加标题可以提供更多信息

### 3.3 组织图片资源

1. **创建专门的图片目录**：如 `assets/` 或 `images/` 目录
2. **使用一致的命名规范**：如 `feature-image.png` 或 `step-1-screenshot.png`
3. **分类存储**：根据用途或主题对图片进行分类存储

## 4. 常见问题与解决方案

### 4.1 图片不显示

**问题**：图片无法正常显示
**解决方案**：

- 检查图片路径是否正确
- 确保图片文件存在
- 检查网络连接是否正常
- 对于本地图片，确保使用正确的相对路径

### 4.2 链接失效

**问题**：链接点击后无法访问目标页面
**解决方案**：

- 检查 URL 是否正确
- 确保目标网站仍然存在
- 对于本地文件，确保文件路径正确
- 检查是否需要添加 `http://` 或 `https://` 前缀

### 4.3 图片大小控制

**问题**：图片显示过大或过小
**解决方案**：

- 在 Markdown 中，基本语法不支持直接控制图片大小
- 可以使用 HTML 标签来控制图片大小：

```html
<img src="image.png" alt="描述" width="300" height="200" />
```

- 或者在 CSS 中设置图片样式

## 5. 扩展语法

> 任务列表是列表语法的扩展，正文见 `markdown/170-TaskList` 与 `markdown/060-ListSyntax`，本篇不再重复。

### 5.2 图片套链接：嵌套写法

图片本身作为链接的点击目标——把图片语法整体放进链接的文字位：

```markdown
[![产品截图](images/screenshot-small.png)](https://example.com/demo)

徽章是同样写法的最常见形态：
[![build status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/org/repo/actions)
```

外层方括号是链接、内层 `![alt](src)` 是图片——两层语法嵌套，渲染为「点图片跳链接」。README 顶部的 CI 徽章全部是这一形态。

### 5.3 表格中的链接和图片

**示例**：

```markdown
| 名称   | 链接                         | 图标                                                                                 |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------ |
| GitHub | [GitHub](https://github.com) | ![GitHub](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png) |
| Google | [Google](https://google.com) | ![Google](https://www.google.com/favicon.ico)                                        |
```

**渲染效果**：

| 名称   | 链接                         | 图标                                                                                 |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------ |
| GitHub | [GitHub](https://github.com) | ![GitHub](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png) |
| Google | [Google](https://google.com) | ![Google](https://www.google.com/favicon.ico)                                        |

## 6. 总结

Markdown 提供了简洁而强大的语法来添加链接和图片，使文档更加丰富和有吸引力。通过掌握这些语法，你可以创建包含外部链接、内部链接、图片和图片链接的文档。
在使用链接和图片时，遵循最佳实践可以确保文档的可访问性、可靠性和美观度。同时，了解常见问题的解决方案可以帮助你快速解决在使用过程中遇到的问题。

## 动手实践

**练习 1（链接三式）**：把同一个目标地址分别用行内式、引用式（集中定义）、自动链接三种写法各写一遍，然后删掉引用定义中的一条，观察失效链接在渲染端的形态。

**提示**：引用式的定义 `[id]: https://example.com "title"` 集中在文末；自动链接 `<https://example.com>` 不带自定义文字。

**练习 2（替代文本必填性）**：写一个带完整 alt 的图片与一个空 alt 的图片，用无障碍检查视角（或阅读器纯文本模式）对比两者的差异；再故意写错相对路径观察占位表现。

**提示**：alt 是图片挂了之后唯一的信息残留——它同时服务无障碍与失效兜底。

**练习 3（图片套链接）**：为任一仓库写 README 顶部徽章行：3 个「图片套链接」徽章（构建状态、许可证、版本），全部用引用式定义 URL，验证点击跳转正确。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```markdown
<!-- 练习 1 -->
行内式：[Markdown Guide](https://www.markdownguide.org)
引用式：[Markdown Guide][mdg]（文末定义）
自动链接：<https://www.markdownguide.org>

<!-- 文末 -->
[mdg]: https://www.markdownguide.org "Markdown 指南"

<!-- 练习 2 -->
![仓库结构示意图](docs/images/structure.png)   <!-- 完整 alt -->
![](docs/images/structure.png)                  <!-- 空 alt：挂了就什么都不剩 -->

<!-- 练习 3 -->
[![build](https://img.shields.io/badge/build-passing-brightgreen)][ci]
[![license](https://img.shields.io/badge/license-MIT-blue)][lic]
[![release](https://img.shields.io/badge/release-v1.0.0-orange)][rel]

[ci]: https://github.com/org/repo/actions
[lic]: https://github.com/org/repo/blob/main/LICENSE
[rel]: https://github.com/org/repo/releases
```

</details>
