---
order: 320
title: Markdown Frontmatter YAML 语法速查手册
module: 'markdown'
category: 工具链
difficulty: beginner
description: Markdown Frontmatter YAML 语法速查 的完整教学讲解。
author: fanquanpp
updated: '2026-08-29'
related: []
prerequisites: []
---

> **Layer 2 专业层标注**：Frontmatter 用于文档工程化（本仓库就在用），写普通笔记可跳过。

## 基础语法

**基本写法：frontmatter 块**
`---` 换行 `<YAML>` 换行 `---`
```markdown
---
title: 文档标题
date: 2025-07-31
---
正文内容
```

---

## 标量字段

**基本写法：字符串与数字**
`<键>: <值>`
```yaml
title: 用户指南
version: 2.1
draft: false
rating: 4.5
```

---

**基本写法：带引号字符串**
`<键>: "<值>"`
```yaml
title: "包含: 冒号的标题"
desc: '单引号也可'
path: "a/b/c"
```

---

## 数组字段

**基本写法：行内数组**
`<键>: [<项1>, <项2>]`
```yaml
tags: [js, ts, web]
authors: [Alice, Bob]
```

---

**基本写法：块状数组**
`<键>:`
`  - <项>`
```yaml
tags:
  - javascript
  - typescript
  - vue
```

---

## 对象字段

**基本写法：嵌套对象**
`<键>:`
`  <子键>: <值>`
```yaml
author:
  name: Alice
  email: alice@example.com
  social:
    twitter: "@alice"
```

---

**基本写法：对象数组**
`<键>:`
`  - <子键>: <值>`
```yaml
posts:
  - title: 第一篇
    date: 2025-01-01
  - title: 第二篇
    date: 2025-02-01
```

---

## 布尔与空值

**基本写法：布尔与 null**
`<键>: true` | `<键>: null`
```yaml
published: true
draft: false
featured: null
empty: ~        # ~ 等价 null
```

---

## 多行文本

**基本写法：保留换行**
`<键>: |`
```yaml
description: |
  第一行
  第二行
  保留所有换行与缩进
```

---

**基本写法：折叠换行**
`<键>: >`
```yaml
summary: >
  这是一段
  长文本，换行
  会被折叠成空格
```

---

**基本写法：保留末尾换行控制**
`<键>: |-` | `<键>: |+`
```yaml
# |- 去除末尾换行，|+ 保留全部末尾换行
desc: |- 精确无末尾换行
desc2: |+ 保留所有换行
```

---

## 日期类型

**基本写法：日期字段**
`date: <YYYY-MM-DD>`
```yaml
date: 2025-07-31
datetime: 2025-07-31T10:30:00Z
datetime2: 2025-07-31 18:30:00 +08:00
```

---

## 常用约定字段

**基本写法：博客类 frontmatter**
`<键>: <值>`
```yaml
---
title: 文章标题
date: 2025-07-31
tags: [前端, JS]
categories: 教程
author: Alice
cover: /img/a.png
draft: false
summary: 简短摘要
---
```

---

**基本写法：文档类 frontmatter**
`<键>: <值>`
```yaml
---
title: API 文档
description: 接口说明文档
sidebar_position: 3
sidebar_label: 接口
slug: /api
---
```

---

## 锚点与引用

**基本写法：锚点定义与引用**
`<键>: &<锚点名> <值>` | `*<锚点名>`
```yaml
defaults: &def
  lang: zh
  draft: false
post1:
  <<: *def
  title: 第一篇
```

---

## 转义与特殊字符

**基本写法：特殊字符处理**
`<键>: "<值>"`
```yaml
# 含冒号、井号等需引号
note: "key: value 含冒号"
url: "https://a.com/?x=1&y=2"
hash: "#标题"
```

---

## 多文档分隔

**基本写法：多 frontmatter 文档**
`---`
```yaml
---
title: 第一篇
---
正文一
---
title: 第二篇
---
正文二
```

---

## 注意事项

**基本写法：frontmatter 位置**
`---` 必须位于文件最顶部
```markdown
---
title: 标题
---
<!-- frontmatter 必须是文件第一行，前面不能有空行或内容 -->
正文
```
