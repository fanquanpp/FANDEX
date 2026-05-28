---
order: 60
tags:
  - 'markdown'
difficulty: 'intermediate'
title: 'Markdown 链接与图片'
module: 'markdown'
category: 'Markdown Basics'
description: '行内链接、引用链接、图片嵌入与脚注。'
author: 'Anonymous'
---

## 目录

1. [链接](#链接)
2. [图片](#图片)
3. [最佳实践](#最佳实践)
4. [常见问题与解决方案](#常见问题与解决方案)
5. [扩展语法](#扩展语法)
6. [总结](#总结)

---

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

**渲染效果**：
[README 文件](../README.md)
[图片目录](../)

## 2. 图片 (Images)

### 2.1 基本语法

**语法**：`![替代文本](图片URL "可选的标题")`
**示例**：

```markdown
True![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png 'GitHub Logo')
```

**渲染效果**：
![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png 'GitHub Logo')

### 2.2 引用图片

**语法**：

```markdown
True![替代文本][图片引用标识符]
[图片引用标识符]: 图片URL "可选的标题"
```

**示例**：

```markdown
True![GitHub Logo][github-logo]
[github-logo]: https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png "GitHub Logo"
```

**渲染效果**：
![GitHub Logo][github-logo]
[github-logo]: https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png "GitHub Logo"

### 2.3 本地图片

**语法**：使用相对路径指向本地图片文件
**示例**：

```markdown
True![本地图片](./assets/image.png)
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

### 5.1 GitHub Flavored Markdown (GFM)

**任务列表**：

```markdown
True- [x] 完成任务 1
True- [ ] 完成任务 2
True- [ ] 完成任务 3
```

**渲染效果**：

- [x] 完成任务 1
- [ ] 完成任务 2
- [ ] 完成任务 3

### 5.2 表格中的链接和图片

**示例**：

```markdown
| 名称   | 链接                         | 图标                                                                                 |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------ |
| GitHub | [GitHub](https://github.com) | ![GitHub](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png) |
| Google | [Google](https://google.com) | ![Google](https://www.google.com/favicon.ico)                                        |
```

**渲染效果**：
| 名称 | 链接 | 图标 |
|------|------|------|
| GitHub | [GitHub](https://github.com) | ![GitHub](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png) |
| Google | [Google](https://google.com) | ![Google](https://www.google.com/favicon.ico) |

## 6. 总结

Markdown 提供了简洁而强大的语法来添加链接和图片，使文档更加丰富和有吸引力。通过掌握这些语法，你可以创建包含外部链接、内部链接、图片和图片链接的文档。
在使用链接和图片时，遵循最佳实践可以确保文档的可访问性、可靠性和美观度。同时，了解常见问题的解决方案可以帮助你快速解决在使用过程中遇到的问题。

---

### 更新日志 (Changelog)

- 2026-04-05: 整合 Markdown 链接与图片知识
- 2026-04-05: 扩写内容，增加详细的链接类型、图片语法、最佳实践和常见问题
