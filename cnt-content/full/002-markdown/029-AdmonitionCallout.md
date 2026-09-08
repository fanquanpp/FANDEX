---
order: 290
title: Markdown 提示框（admonition/callout）
module: 'markdown'
category: 工具链
difficulty: beginner
description: Markdown 提示框（admonition/callout） 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## Obsidian Callout 语法

**基本写法：基础 callout**
`> [!<类型>] <标题>`
`> <内容>`
```markdown
# 折叠式提示框
> [!note] 提示
> 这是一个提示框内容
```

---

**基本写法：可折叠 callout**
`> [!<类型>]+ <标题>`
`> <内容>`
```markdown
# 默认展开的可折叠框
> [!info]+ 详情
> 默认展开可手动折叠
```

---

**基本写法：默认折叠**
`> [!<类型>]- <标题>`
`> <内容>`
```markdown
# 默认折叠的可折叠框
> [!warning]- 警告
> 默认折叠需点击展开
```

---

**基本写法：无标题 callout**
`> [!<类型>]`
`> <内容>`
```markdown
# 省略标题只显示内容
> [!tip]
> 这是一个无标题提示
```

---

## Obsidian Callout 类型

**基本写法：note 笔记**
`> [!note] <标题>`
```markdown
# 普通笔记类型
> [!note] 备注
> 普通信息记录
```

---

**基本写法：info 信息**
`> [!info] <标题>`
```markdown
# 信息类型
> [!info] 信息
> 一般性说明信息
```

---

**基本写法：tip 提示**
`> [!tip] <标题>`
```markdown
# 技巧提示
> [!tip] 技巧
> 提升效率的小窍门
```

---

**基本写法：warning 警告**
`> [!warning] <标题>`
```markdown
# 警告信息
> [!warning] 警告
> 注意潜在风险
```

---

**基本写法：danger 危险**
`> [!danger] <标题>`
```markdown
# 危险操作提示
> [!danger] 危险
> 此操作不可逆
```

---

**基本写法：success 成功**
`> [!success] <标题>`
```markdown
# 成功状态提示
> [!success] 成功
> 操作已完成
```

---

**基本写法：failure 失败**
`> [!failure] <标题>`
```markdown
# 失败状态提示
> [!failure] 失败
> 操作未成功
```

---

**基本写法：question 问题**
`> [!question] <标题>`
```markdown
# 常见问题提示
> [!question] 问题
> 这是常见疑问
```

---

**基本写法：example 示例**
`> [!example] <标题>`
```markdown
# 示例展示
> [!example] 示例
> 这是代码示例
```

---

**基本写法：quote 引用**
`> [!quote] <标题>`
```markdown
# 引用名言
> [!quote] 引言
> 知识就是力量
```

---

**基本写法：abstract 摘要**
`> [!abstract] <标题>`
```markdown
# 摘要总结
> [!abstract] 摘要
> 本文核心要点
```

---

**基本写法：bug 缺陷**
`> [!bug] <标题>`
```markdown
# 缺陷提示
> [!bug] 已知缺陷
> 此处行为不符合预期
```

---

## 多行内容

**基本写法：多行 callout**
`> [!<类型>] <标题>`
`> <行1>`
`> <行2>`
```markdown
# 多行内容用引用符续行
> [!note] 多行示例
> 第一行内容
> 第二行内容
> 第三行内容
```

---

**基本写法：段落分隔**
`> [!<类型>] <标题>`
`>`
`> <新段落>`
```markdown
# 用空引用行分隔段落
> [!info] 多段说明
> 第一段说明文字
>
> 第二段说明文字
```

---

**基本写法：嵌套列表**
`> [!<类型>] <标题>`
`> - <项1>`
`> - <项2>`
```markdown
# callout 内嵌套列表
> [!todo] 待办事项
> - [x] 任务一
> - [ ] 任务二
> - [ ] 任务三
```

---

**基本写法：嵌套代码块**
`> [!<类型>] <标题>`
`> \`\`\``
`> <代码>`
`> \`\`\``
````markdown
# callout 内嵌套代码块
> [!example] 示例
> ```python
> print("hello")
> ```
````

---

## 自定义 Callout

**基本写法：自定义类型**
`> [!my-custom] <标题>`
```markdown
# 通过 CSS 自定义新类型
> [!my-custom] 自定义
> 需配合 CSS 样式定义
```

---

**基本写法：自定义颜色（CSS）**
`.callout[data-callout="<类型>"]`
```css
/* 在 snippet 中定义样式 */
.callout[data-callout="my-custom"] {
    --callout-color: 255, 100, 100;
}
```

---

## MkDocs Admonition 语法

**基本写法：基础 admonition**
`!!! <类型>`
`    <内容>`
```markdown
# MkDocs 用三感叹号标识
!!! note
    这是一个提示框内容
```

---

**基本写法：带标题**
`!!! <类型> "<标题>"`
`    <内容>`
```markdown
# 类型后用引号包裹标题
!!! warning "重要警告"
    请注意此风险提示
```

---

**基本写法：可折叠默认展开**
`???+ <类型>`
`    <内容>`
```markdown
# 三个问号加号表示默认展开
???+ note
    默认展开可折叠
```

---

**基本写法：可折叠默认收起**
`??? <类型>`
`    <内容>`
```markdown
# 三个问号表示默认收起
??? tip "提示"
    默认折叠需点击展开
```

---

**基本写法：MkDocs 嵌套内容**
`!!! <类型>`
`    <段落1>`
`        <嵌套>`
```markdown
# 用 4 空格缩进表示嵌套
!!! note
    第一段内容

    - 列表项 1
    - 列表项 2
```

---

## Docusaurus Admonition

**基本写法：Docusaurus 语法**
`:::<类型>`
`<内容>`
`:::`
```markdown
# Docusaurus 用三冒号包裹
:::note
这是一个提示
:::
```

---

**基本写法：带标题**
`:::<类型> <标题>`
`<内容>`
`:::`
```markdown
# 类型后空格加标题
:::warning 重要警告
请注意此风险
:::
```

---

**基本写法：嵌套 admonition**
`:::<类型1>`
`:::<类型2>`
`<内容>`
`:::`
`:::`
````markdown
# 嵌套提示框
:::note
外层说明
:::tip
内层提示
:::
:::
````

---

## GitHub 不支持情况

**基本写法：GitHub 用引用模拟**
`> **<类型>**: <内容>`
```markdown
# GitHub 用粗体加引用模拟
> **Warning**: 此操作不可逆
> **Note**: 请参考文档
```

---

**基本写法：用 emoji 区分类型**
`> **<emoji> <类型>**: <内容>`
```markdown
# 文字替代 emoji 的纯文本方案
> **Note 提示**: 这里是说明文字
> **Warning 警告**: 注意潜在风险
```

---

## 实战场景

**基本写法：文档头部警告**
`> [!warning] <标题>`
`> <内容>`
```markdown
# 文档开头放置重要提示
> [!warning] 弃用提示
> 此 API 已废弃，请使用 v2 版本
```

---

**基本写法：示例代码块说明**
`> [!example] <标题>`
`> <内容>`
```markdown
# 在示例前添加说明
> [!example] 使用示例
> 演示函数调用方式
```

---

**基本写法：版本兼容提示**
`> [!info] <标题>`
`> <内容>`
```markdown
# 标注版本要求
> [!info] 版本要求
> 本功能需要 v2.0 及以上版本
```

---

## 跨平台兼容写法

**基本写法：通用引用替代**
`> <类型>: <内容>`
```markdown
# 兼容所有平台的简单写法
> Note: 这是说明内容
> Warning: 这是警告内容
```

---

**基本写法：HTML 实现提示框**
`<div class="<类>"><strong><类型></strong>: <内容></div>`
```markdown
# 用 HTML 实现带样式提示框
<div class="alert alert-warning">
<strong>警告</strong>: 此操作不可恢复
</div>
```
