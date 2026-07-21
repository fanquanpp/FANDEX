# 自动链接

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 尖括号自动链接

**单行写法：URL 自动链接**
`<<URL>>`
```markdown
<https://github.com>
```

**单行写法：带路径的 URL 自动链接**
`<<URL>>`
```markdown
<http://example.com/path?q=1>
```

**单行写法：邮箱自动链接**
`<<邮箱>>`
```markdown
<user@example.com>
```

---

## GFM 裸 URL 自动链接

**单行写法：裸 URL 自动识别**
`<URL>`
```markdown
访问 https://github.com 了解更多
```

**单行写法：裸 www 地址自动识别**
`www.<域名>`
```markdown
浏览 www.example.com 查看
```

**单行写法：裸邮箱自动识别**
`<邮箱>`
```markdown
联系 user@example.com 获取更多信息
```

---

## 自动链接规则

**基本写法：URL 必须包含协议**
`<http://> | <https://>`
```markdown
<https://example.com>
```

**错误写法：缺少协议无效**
`<域名>`
```markdown
<example.com>（无效，缺少协议）
```

**基本写法：尖括号内不能有空格**
`<<URL>>`
```markdown
<https://example.com>
```

**错误写法：有空格无效**
`< <URL> >`
```markdown
< https://example.com >（无效，有空格）
```

---

## 自定义链接文本

**单行写法：使用标准链接语法自定义文本**
`[<文本>](<URL>)`
```markdown
[GitHub](https://github.com)
```

**换行写法：自动链接与标准链接对比**
`<<URL>> | [<文本>](<URL>)`
```markdown
<https://github.com>

[GitHub](https://github.com)
```

---

## 新窗口打开

**单行写法：使用 HTML a 标签在新窗口打开**
`<a href="<URL>" target="_blank"><文本></a>`
```markdown
<a href="https://example.com" target="_blank">在新窗口打开</a>
```

**单行写法：添加 nofollow 属性**
`<a href="<URL>" rel="nofollow"><文本></a>`
```markdown
<a href="https://example.com" rel="nofollow">不追踪的链接</a>
```

**单行写法：同时设置新窗口和 nofollow**
`<a href="<URL>" target="_blank" rel="nofollow"><文本></a>`
```markdown
<a href="https://example.com" target="_blank" rel="nofollow">新窗口且不追踪</a>
```
