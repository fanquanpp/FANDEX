---
order: 51
title: 'GitHub Flavored Markdown'
module: markdown
category: 'Markdown Basics'
difficulty: intermediate
description: GFM扩展规范详解：表格、任务列表、删除线、自动链接与代码围栏。
author: fanquanpp
updated: '2026-06-14'
related:
  - markdown/CommonMark规范
  - markdown/列表语法
  - markdown/转义字符
  - markdown/脚注
prerequisites:
  - markdown/语法指南
---

## 1. GFM 概述

### 1.1 什么是 GFM

GitHub Flavored Markdown（GFM）是 GitHub 在 CommonMark 基础上扩展的 Markdown 方言，是 GitHub 平台上所有文本内容（README、Issue、PR、评论等）的解析标准。

### 1.2 GFM 扩展列表

| 扩展         | 语法               | 说明                 |
| :----------- | :----------------- | :------------------- |
| **表格**     | `\| col \| col \|` | 结构化数据展示       |
| **任务列表** | `- [x] done`       | 待办事项追踪         |
| **删除线**   | `~~text~~`         | 标记删除内容         |
| **自动链接** | `https://...`      | 无需尖括号的 URL     |
| **代码围栏** | ` ```lang `        | 带语言标识的代码块   |
| **脚注**     | `[^1]`             | 尾注引用（部分支持） |
| **警告框**   | `> [!NOTE]`        | GitHub 特有的提示框  |

## 2. 表格

### 2.1 基本语法

```markdown
| 名称    | 类型     | 描述     |
| ------- | -------- | -------- |
| id      | integer  | 主键     |
| name    | string   | 用户名   |
| email   | string   | 邮箱地址 |
| created | datetime | 创建时间 |
```

渲染结果：

| 名称    | 类型     | 描述     |
| :------ | :------- | :------- |
| id      | integer  | 主键     |
| name    | string   | 用户名   |
| email   | string   | 邮箱地址 |
| created | datetime | 创建时间 |

### 2.2 对齐方式

通过分隔行的冒号位置控制对齐：

```markdown
| 左对齐     | 居中对齐 | 右对齐 |
| :--------- | :------: | -----: |
| Left       |  Center  |  Right |
| 长文本内容 |  短文本  | 123.45 |
```

| 对齐方式 | 语法    | 说明         |
| :------- | :------ | :----------- |
| 左对齐   | `:---`  | 默认对齐方式 |
| 居中对齐 | `:---:` | 冒号在两端   |
| 右对齐   | `---:`  | 冒号在右端   |

### 2.3 表格规则

- 表格前后需要空行
- 列数由表头决定，多出的列被忽略
- 单元格内可使用行内 Markdown（链接、强调、代码等）
- 单元格内不能包含块级元素（标题、列表等）
- 管道符 `|` 在行首和行尾可省略

```markdown
> 简化写法
>
> | 名称 | 类型    |
> | ---- | ------- |
> | id   | integer |
> | name | string  |
```

## 3. 任务列表

### 3.1 基本语法

```markdown
- [x] 完成需求分析
- [x] 编写技术方案
- [ ] 开发核心功能
- [ ] 编写单元测试
- [ ] 部署上线
```

### 3.2 任务列表嵌套

```markdown
- [x] 前端开发
  - [x] 页面布局
  - [x] 组件开发
  - [ ] 接口联调
- [ ] 后端开发
  - [x] 数据库设计
  - [ ] API 开发
  - [ ] 性能优化
```

### 3.3 Issue 中的任务列表

在 Issue 中使用任务列表可以**追踪进度**，GitHub 会自动显示完成比例：

```markdown
## Sprint 3 任务

- [x] #123 用户登录功能
- [ ] #124 权限管理模块
- [ ] #125 数据导出功能
- [ ] #126 性能优化
```

- 可以用 `#issue号` 引用其他 Issue
- 勾选任务会自动更新进度条
- PR 中也可以使用任务列表追踪变更

## 4. 删除线

### 4.1 基本语法

```markdown
~~已废弃的API~~
~~旧版本功能~~已被新功能替代
```

渲染结果：~~已废弃的API~~

### 4.2 使用场景

- 标记已完成的待办事项
- 显示价格变动（~~¥99~~ ¥59）
- 标记废弃的 API 或功能
- 编辑记录中显示删除内容

### 4.3 注意事项

- 两个 `~` 必须紧贴文本，中间不能有空格
- `~~` 不能出现在单词内部
- 可以与强调组合使用：`~~***重要且已废弃***~~`

## 5. 自动链接

### 5.1 URL 自动链接

GFM 扩展了 CommonMark 的自动链接，无需尖括号即可识别 URL：

```markdown
访问 https://github.com 了解更多

我的邮箱是 user@example.com
```

### 5.2 自动链接规则

| 类型               | 示例                      | 是否自动链接 |
| :----------------- | :------------------------ | :----------- |
| **http/https URL** | `https://example.com`     |              |
| **www 域名**       | `www.example.com`         |              |
| **邮箱地址**       | `user@example.com`        |              |
| **其他协议**       | `ftp://files.example.com` |              |
| **纯域名**         | `example.com`             |              |

### 5.3 链接截断

GFM 会自动截断过长的 URL 显示：

```markdown
https://github.com/very/long/path/to/a/resource/that/goes/on/and/on
```

在渲染时，超长 URL 会被截断显示，但链接仍然完整。

## 6. 代码围栏增强

### 6.1 语言标识

GFM 支持在代码围栏后指定语言，实现语法高亮：

````markdown
```python
def fibonacci(n: int) -> list[int]:
    """生成斐波那契数列"""
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib[:n]
```
````

### 6.2 支持的语言标识

| 类别      | 语言标识                                                       |
| :-------- | :------------------------------------------------------------- |
| **Web**   | `javascript`, `typescript`, `html`, `css`, `vue`, `jsx`, `tsx` |
| **后端**  | `python`, `java`, `go`, `rust`, `ruby`, `php`                  |
| **系统**  | `c`, `cpp`, `csharp`, `swift`, `kotlin`                        |
| **数据**  | `sql`, `json`, `yaml`, `toml`, `xml`                           |
| **Shell** | `bash`, `powershell`, `shell`, `zsh`                           |
| **配置**  | `dockerfile`, `nginx`, `apache`                                |
| **文档**  | `markdown`, `latex`, `math`                                    |

### 6.3 围栏内的转义

代码围栏内的内容**不进行 Markdown 解析**，原样显示。如果需要在代码块中显示三个反引号，可以使用更多反引号作为围栏：

`````markdown
````markdown
```javascript
console.log('Hello');
```
````
`````

````

## 7. 警告框（Alerts）

### 7.1 语法

GitHub 2023 年引入的扩展语法，用于创建提示框：

```markdown
> [!NOTE]
> 这是一条提示信息

> [!TIP]
> 这是一条建议

> [!IMPORTANT]
> 这是一条重要信息

> [!WARNING]
> 这是一条警告

> [!CAUTION]
> 这是一条危险警告
```

### 7.2 警告框类型

| 类型 | 颜色 | 用途 |
| :--- | :--- | :--- |
| **NOTE** | 蓝色 | 补充说明 |
| **TIP** | 绿色 | 有用的建议 |
| **IMPORTANT** | 紫色 | 关键信息 |
| **WARNING** | 橙色 | 注意事项 |
| **CAUTION** | 红色 | 危险操作警告 |

## 8. GFM 与 CommonMark 的兼容性

### 8.1 兼容策略

GFM 是 CommonMark 的**严格超集**：

- 所有合法的 CommonMark 文档在 GFM 中渲染结果相同
- GFM 额外添加的语法不会与 CommonMark 冲突
- GFM 扩展在 CommonMark 解析器中被忽略

### 8.2 迁移建议

- 编写 Markdown 时优先使用 CommonMark 语法，确保最大兼容性
- 仅在 GitHub 平台使用 GFM 扩展
- 避免依赖特定渲染器的行为
````
