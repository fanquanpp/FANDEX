# 链接与图片

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 行内链接

**单行写法：基本行内链接**
`[<链接文本>](<URL>)`
```markdown
[Markdown 指南](https://www.markdownguide.org)
```

**单行写法：带标题的行内链接**
`[<链接文本>](<URL> "<标题>")`
```markdown
[GitHub](https://github.com "GitHub 官方网站")
```

---

## 引用链接

**换行写法：定义引用链接**
`[<链接文本>][<引用标识符>]\n[<引用标识符>]: <URL> ["<标题>"]`
```markdown
[GitHub][github]

[github]: https://github.com "GitHub 官方网站"
```

---

## 自动链接

**单行写法：URL 自动链接**
`<<URL>>`
```markdown
<https://github.com>
```

**单行写法：邮箱自动链接**
`<<邮箱>>`
```markdown
<user@example.com>
```

---

## 相对链接

**单行写法：指向本地文件**
`[<链接文本>](<相对路径>)`
```markdown
[README 文件](./README.md)
```

**单行写法：指向上级目录**
`[<链接文本>](<相对路径>)`
```markdown
[图片目录](../assets/)
```

---

## 基本图片

**单行写法：插入图片**
`![<替代文本>](<图片URL>)`
```markdown
![示例图片](https://example.com/image.png)
```

**单行写法：带标题的图片**
`![<替代文本>](<图片URL> "<标题>")`
```markdown
![GitHub Logo](https://github.githubassets.com/logo.png "GitHub Logo")
```

---

## 引用图片

**换行写法：定义引用图片**
`![<替代文本>][<图片引用标识符>]\n[<图片引用标识符>]: <图片URL> ["<标题>"]`
```markdown
![GitHub Logo][github-logo]

[github-logo]: https://github.githubassets.com/logo.png "GitHub Logo"
```

---

## 本地图片

**单行写法：使用相对路径插入本地图片**
`![<替代文本>](<相对路径>)`
```markdown
![示例图片](./images/example.png)
```

---

## 图片链接

**单行写法：将图片嵌套在链接中**
`[![<替代文本>](<图片URL>)](<链接URL>)`
```markdown
[![GitHub Logo](https://github.githubassets.com/logo.png)](https://github.com)
```

---

## 图片大小控制

**单行写法：使用 HTML img 标签控制大小**
`<img src="<URL>" alt="<替代文本>" width="<宽>" height="<高>" />`
```markdown
<img src="image.png" alt="描述" width="300" height="200" />
```

**单行写法：仅控制宽度**
`<img src="<URL>" alt="<替代文本>" width="<宽>" />`
```markdown
<img src="image.png" alt="描述" width="300" />
```
