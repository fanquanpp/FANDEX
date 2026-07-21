---
title: 'MCP根目录与诱导 — 作用域与飞行中用户输入'
description: 掌握roots作用域限制和elicitation中途用户输入机制，解决路径假设和参数歧义问题
module: agent
difficulty: intermediate
tags:
  - MCP根目录
  - elicitation
  - 作用域
  - 用户输入
related:
  - agent/MCP采样
  - agent/MCP传输
  - agent/MCP基础
  - agent/MCP生产认证
prerequisites:
  - agent/概述与架构
---

# MCP根目录与诱导 — 作用域与飞行中用户输入

> 硬编码路径在用户打开不同项目时立即失效。预填充工具参数在用户规格不足时失效。Roots将服务器范围限定在用户控制的URI集合；elicitation在工具调用中途暂停以通过表单或URL向用户请求结构化输入。两个客户端原语，两个常见MCP失败模式的修复。SEP-1036（URL模式elicitation，2025-11-25）在2026年上半年之前是实验性的 — 在依赖它之前检查SDK版本。

**类型：** 构建
**语言：** Python（标准库，roots + elicitation演示）
**前置条件：** Phase 13 · 07（MCP服务器）
**时间：** ~45分钟

## 学习目标

- 声明 `roots` 并响应 `notifications/roots/list_changed`。
- 将服务器文件操作限制在声明的根集内的URI。
- 使用 `elicitation/create` 在工具调用中途向用户请求确认或结构化输入。
- 在表单模式和URL模式elicitation之间选择（后者是实验性的；漂移风险已注明）。

## 问题所在

笔记MCP服务器在生产中遇到的两个具体失败。

**路径假设断裂。** 服务器针对 `~/notes` 编写。另一台机器上笔记在 `~/Documents/Notes` 的用户得到静默失败的调用（找不到文件）或更糟，写入了错误位置。

**缺少用户会知道的参数。** 用户说"删除旧的TPS报告笔记"。模型调用 `notes_delete(title: "TPS report")` 但有三个匹配的笔记来自2023、2024和2025。工具无法猜测。用"模糊"失败很烦人；对三个都运行是灾难性的。

Roots修复第一个：客户端在 `initialize` 声明服务器可以触碰的URI集合。Elicitation修复第二个：服务器暂停工具调用并发送 `elicitation/create` 让用户选择哪一个。

## 核心概念

### Roots

客户端在 `initialize` 声明根列表：

```json
{
  "capabilities": { "roots": { "listChanged": true } }
}
```

服务器然后可以调用 `roots/list`：

```json
{ "roots": [{ "uri": "file:///Users/alice/Documents/Notes", "name": "Notes" }] }
```

服务器必须将roots视为边界：根集之外的任何文件读写都被拒绝。这不是由客户端强制执行的（服务器仍然是用户信任的代码），但符合规范的服务器遵守它。

当用户添加或移除root时，客户端发送 `notifications/roots/list_changed`。服务器重新调用 `roots/list` 并更新其边界。

### 为什么roots是客户端原语

Roots由客户端声明，因为它们代表用户的同意模型。用户告诉Claude Desktop"给这个笔记服务器访问这两个目录"。服务器不能扩大该范围。

### Elicitation：表单模式默认

`elicitation/create` 接受表单模式和自然语言提示：

```json
{
  "method": "elicitation/create",
  "params": {
    "message": "Delete 'TPS report'? Multiple notes match; pick one.",
    "requestedSchema": {
      "type": "object",
      "properties": {
        "note_id": {
          "type": "string",
          "enum": ["note-3", "note-7", "note-14"]
        },
        "confirm": { "type": "boolean" }
      },
      "required": ["note_id", "confirm"]
    }
  }
}
```

客户端渲染表单，收集用户答案，返回：

```json
{
  "action": "accept",
  "content": { "note_id": "note-14", "confirm": true }
}
```

三种可能的动作：`accept`（用户填写了）、`decline`（用户关闭了）、`cancel`（用户中止了整个工具调用）。

表单模式是扁平的 — v1不支持嵌套对象。SDK通常拒绝比单层更复杂的任何东西。

### Elicitation：URL模式（SEP-1036，实验性）

2025-11-25新增。服务器不发送模式，而是发送URL：

```json
{
  "method": "elicitation/create",
  "params": {
    "message": "Sign in to GitHub",
    "url": "https://github.com/login/oauth/authorize?client_id=..."
  }
}
```

客户端在浏览器中打开URL，等待完成，用户回来时返回。适用于OAuth流程、支付授权和文档签署，表单不足以胜任的场景。

漂移风险提示：SEP-1036响应形状仍在稳定中；一些SDK返回回调URL，其他返回完成token。在生产中使用URL模式之前阅读SDK的发布说明。

### 何时elicitation是正确的工具

- 破坏性动作前的用户确认（destructive hint + elicitation）。
- 消歧（从N个匹配中选择一个）。
- 首次运行设置（API密钥、目录、偏好）。
- OAuth风格流程（URL模式）。

### 何时elicitation是错误的

- 填充模型本可以用散文询问的工具必需参数。使用正常重新提示，不是elicitation对话框。
- 高频调用。Elicitation中断对话；不要在循环内触发它。
- 服务器可以事后验证的任何东西。验证，返回错误，让模型用文本询问用户。

### 人在回路桥

Elicitation加上sampling一起启用MCP的"人在回路"模型。服务器的Agent循环可以暂停以获取用户输入（elicitation）或模型推理（sampling）。Phase 13 · 11涵盖了sampling；本课涵盖elicitation。将它们组合以获得完整的循环中控制。

## 实践

`code/main.py` 用以下内容扩展笔记服务器：

- `roots/list` 响应，服务器在root-list-changed通知后重新查询。
- 一个 `notes_delete` 工具，当多个笔记匹配时使用 `elicitation/create` 消歧。
- 一个 `notes_setup` 工具，使用URL模式elicitation打开首次运行配置页面（模拟）。
- 一个边界检查，拒绝在声明的roots之外的URI上的操作。

演示运行三个场景：正常路径（一个匹配）、消歧（三个匹配，elicitation触发）、根外写入（被拒绝）。

## 交付

本课产生 `outputs/skill-elicitation-form-designer.md`。给定一个可能需要用户确认或消歧的工具，该技能设计elicitation表单模式和消息模板。

## 练习

1. 运行 `code/main.py`。触发消歧路径；确认模拟用户答案被路由回工具。

2. 添加一个每次都需要elicitation确认的新工具 `notes_archive`（destructive hint）。检查UX：这与模型用文本重新询问相比如何？

3. 为首次运行OAuth流程实现URL模式elicitation。注意漂移风险并添加SDK版本守卫。

4. 扩展 `roots/list` 处理：当通知到达时，服务器应原子性地重新读取并重新扫描可能现在超出范围的打开文件句柄。

5. 阅读GitHub上的SEP-1036问题讨论线程。识别一个影响服务器应如何处理URL模式回调的开放问题。

## 关键术语

| 术语                               | 人们怎么说         | 实际含义                                |
| ---------------------------------- | ------------------ | --------------------------------------- |
| Root                               | "同意边界"         | 客户端允许服务器触碰的URI               |
| `roots/list`                       | "服务器请求范围"   | 客户端返回当前根集                      |
| `notifications/roots/list_changed` | "用户更改了范围"   | 客户端信号根集已变化                    |
| Elicitation                        | "在调用中询问用户" | 服务器发起的结构化用户输入请求          |
| `elicitation/create`               | "方法"             | elicitation请求的JSON-RPC方法           |
| Form mode                          | "模式驱动表单"     | 在客户端UI中渲染为表单的扁平JSON Schema |
| URL mode                           | "浏览器重定向"     | SEP-1036实验性；打开URL并等待           |
| `accept` / `decline` / `cancel`    | "用户响应结果"     | 服务器处理的三个分支                    |
| Disambiguation                     | "选一个"           | 工具有N个候选项时的常见elicitation用例  |
| Flat form                          | "仅顶层属性"       | Elicitation模式不能嵌套                 |

## 延伸阅读

- [MCP — Client roots spec](https://modelcontextprotocol.io/specification/draft/client/roots) — 权威roots参考
- [MCP — Client elicitation spec](https://modelcontextprotocol.io/specification/draft/client/elicitation) — 权威elicitation参考
- [Cisco — What's new in MCP elicitation, structured content, OAuth enhancements](https://blogs.cisco.com/developer/whats-new-in-mcp-elicitation-structured-content-and-oauth-enhancements) — 2025-11-25新增内容演练
- [MCP — GitHub SEP-1036](https://github.com/modelcontextprotocol/modelcontextprotocol) — URL模式elicitation提案（实验性，漂移风险）
- [The New Stack — How elicitation brings human-in-the-loop to AI tools](https://thenewstack.io/how-elicitation-in-mcp-brings-human-in-the-loop-to-ai-tools/) — UX演练
