---
order: 280
title: Markdown 定义列表
module: 'markdown'
category: 工具链
difficulty: beginner
description: Markdown 定义列表 的完整教学讲解。
author: fanquanpp
updated: '2026-08-02'
related: []
prerequisites: []
---

## PHP Markdown Extra 语法

**基本写法：术语与定义**
`<术语>`
`: <定义>`
```markdown
# 术语下一行用冒号开头写定义
Git
: 分布式版本控制系统

Markdown
: 轻量级标记语言
```

---

**基本写法：多术语共享定义**
`<术语1>`
`<术语2>`
`: <定义>`
```markdown
# 多个术语共享同一释义
HTML
超文本标记语言
: 用于构建网页结构的标记语言
```

---

**基本写法：术语多定义**
`<术语>`
`: <定义1>`
`: <定义2>`
```markdown
# 同一术语可有多个定义项
API
: 应用程序编程接口
: 一种软件接口规范
```

---

## 缩进格式

**基本写法：冒号后缩进定义**
`<术语>`
`:    <定义>`
```markdown
# 冒号后多个空格保持对齐
HTTP
:    超文本传输协议

HTTPS
:    安全超文本传输协议
```

---

**基本写法：多行定义**
`<术语>`
`: <第一行>`
`  <第二行>`
```markdown
# 定义跨行用空格缩进续行
Markdown
: 一种轻量级标记语言
  通过简单符号生成结构化文档
```

---

## kramdown 语法

**基本写法：kramdown 定义列表**
`<术语>`
`: <定义>`
```markdown
# kramdown 兼容 PHP Markdown Extra 语法
Term
: Definition text
```

---

**基本写法：kramdown 多定义项**
`<术语>`
`: <定义1>`
`: <定义2>`
```markdown
# 多个冒号开头定义同一术语
Open Source
: 开源软件源代码公开
: 鼓励社区协作改进
```

---

## CommonMark 不支持情况

**基本写法：用 HTML 实现定义列表**
`<dl>`、`<dt>`、`<dd>`
```markdown
# CommonMark 不支持原生定义列表，用 HTML 标签实现
<dl>
  <dt>Git</dt>
  <dd>分布式版本控制系统</dd>
  <dt>Markdown</dt>
  <dd>轻量级标记语言</dd>
</dl>
```

---

**基本写法：HTML 加样式**
`<dl><dt><术语></dt><dd><定义></dd></dl>`
```markdown
# 用 HTML 标签嵌套实现丰富样式
<dl>
  <dt><strong>HTTP</strong></dt>
  <dd>超文本传输协议，Web 通信基础</dd>
</dl>
```

---

## 替代方案：粗体加冒号

**基本写法：用粗体模拟术语**
`**<术语>**: <定义>`
```markdown
# CommonMark 通用兼容写法
**Git**: 分布式版本控制系统
**Markdown**: 轻量级标记语言
```

---

**基本写法：列表模拟定义**
`- **<术语>**: <定义>`
```markdown
# 用列表加粗体实现定义效果
- **Git**: 分布式版本控制系统
- **Markdown**: 轻量级标记语言
- **API**: 应用程序编程接口
```

---

**基本写法：术语与定义分行**
`**<术语>**`
`<定义>`
```markdown
# 术语独占一行，定义另起一行
**Git**

分布式版本控制系统，支持离线操作与分支管理。
```

---

## 表格替代

**基本写法：用表格表示术语定义**
`| 术语 | 定义 |`
```markdown
# 用表格组织术语与定义
| 术语 | 定义 |
| --- | --- |
| Git | 分布式版本控制系统 |
| Markdown | 轻量级标记语言 |
```

---

## 渲染器支持差异

**基本写法：GitHub 不支持原生定义列表**
`- **<术语>**: <定义>`
```markdown
# GitHub 用粗体加冒号替代
- **HTTP**: 超文本传输协议
- **HTTPS**: 加密的超文本传输协议
```

---

**基本写法：Obsidian 支持 HTML**
`<dl><dt><术语></dt><dd><定义></dd></dl>`
```markdown
# Obsidian 通过 HTML 标签实现
<dl>
  <dt>术语</dt>
  <dd>这里写定义</dd>
</dl>
```

---

**基本写法：MkDocs 与 Python Markdown**
`<术语>`
`: <定义>`
```markdown
# MkDocs 启用 def_list 扩展后支持
Term
: Definition here
```

---

## 实战场景

**基本写法：术语表**
`## 术语表`
`<术语>`
`: <定义>`
```markdown
# 文档末尾附术语表
## 术语表

VCS
: 版本控制系统

Repository
: 代码仓库，存储项目所有文件与历史
```

---

**基本写法：API 字段说明**
`<字段名>`
`: <说明>`
```markdown
# API 文档中描述字段含义
userId
: 用户唯一标识，类型为 string

token
: 访问令牌，有效期 2 小时
```

---

**基本写法：缩写解释**
`<缩写>`
`: <全称>`
```markdown
# 解释缩写词含义
REST
: 表述性状态转移（Representational State Transfer）

GraphQL
: 图查询语言
```

---

## 与其他元素组合

**基本写法：定义中带链接**
`<术语>`
`: <说明> [<链接>](<URL>)`
```markdown
# 定义中嵌入参考链接
RFC
: 请求意见稿，互联网技术标准文档
  参见 [IETF RFC 页面](https://www.ietf.org/standards/rfcs/)
```

---

**基本写法：定义中带代码**
`<术语>`
`: 包含 \`<代码>\` 的说明`
```markdown
# 定义中嵌入行内代码
Promise
: JavaScript 异步编程对象，通过 `then` 注册回调
```

---

**基本写法：定义中带列表**
`<术语>`
`: 概述：`
`  - <项1>`
`  - <项2>`
```markdown
# 定义中嵌套列表说明
HTTP 方法
: 常用方法包括：
  - GET 获取资源
  - POST 创建资源
  - PUT 更新资源
  - DELETE 删除资源
```

---

## 注意事项

**基本写法：术语与定义间空行**
`<术语>`
`<空行>`
`: <定义>`
```markdown
# 部分解析器要求术语与定义间有空行
HTTP

: 超文本传输协议
```

---

**基本写法：术语不能为空**
`<非空术语>`
`: <定义>`
```markdown
# 术语行必须有内容
协议名称
: 协议的具体说明
```

---

**基本写法：定义冒号必须紧跟**
`<术语>`
`: <定义>`
```markdown
# 冒号必须位于新行开头（可有一个空格）
术语
: 这是正确的定义写法
```
