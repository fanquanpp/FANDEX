---
title: 'MCP应用 — 通过ui://的交互式UI资源'
description: '掌握MCP Apps扩展，使用ui://资源方案和iframe沙箱postMessage协议实现交互式HTML界面'
module: agent
difficulty: advanced
tags:
  - 'MCP Apps'
  - UI资源方案
  - 交互式UI
  - iframe沙箱
  - CSP
related:
  - agent/MCP网关与注册表
  - agent/MCP异步任务
  - agent/MCP资源与提示
  - agent/METR时间范围与外部评估
prerequisites:
  - agent/概述与架构
---

# MCP应用 — 通过ui://的交互式UI资源

> 纯文本工具输出限制了Agent能展示的内容。MCP Apps（SEP-1724，2026年1月26日正式发布）让工具返回沙箱化交互式HTML，在Claude Desktop、ChatGPT、Cursor、Goose和VS Code中内联渲染。仪表板、表单、地图、3D场景，全部通过一个扩展。本课讲解 `ui://` 资源方案、`text/html;profile=mcp-app` MIME、iframe沙箱postMessage协议，以及让服务器渲染HTML带来的安全面。

**类型：** 构建
**语言：** Python（标准库，UI资源发射器），HTML（示例应用）
**前置条件：** Phase 13 · 07（MCP服务器），Phase 13 · 10（资源）
**时间：** ~75分钟

## 学习目标

- 从工具调用返回 `ui://` 资源并设置正确的MIME和元数据。
- 用 `_meta.ui.resourceUri`、`_meta.ui.csp` 和 `_meta.ui.permissions` 声明工具关联的UI。
- 实现iframe沙箱postMessage JSON-RPC用于UI到宿主通信。
- 应用CSP和permissions-policy默认值以防御UI发起的攻击。

## 问题所在

2025年时代的 `visualize_timeline` 工具可以返回"这里有14个按时间排列的笔记：..."。那是一段文字。用户实际想要的是交互式时间线。MCP Apps之前，选项是：客户端特定的小部件API（Claude artifacts、OpenAI Custom GPT HTML），或根本没有UI。

MCP Apps（SEP-1724，2026年1月26日发布）标准化了契约。工具结果包含URI为 `ui://...` 且MIME为 `text/html;profile=mcp-app` 的 `resource`。宿主在沙箱化iframe中渲染它，带有有限的CSP和无网络访问（除非明确授予）。iframe内的UI通过微小的postMessage JSON-RPC方言向宿主发送消息。

每个兼容客户端（Claude Desktop、ChatGPT、Goose、VS Code）以相同方式渲染相同的 `ui://` 资源。一个服务器，一个HTML包，通用UI。

## 核心概念

### `ui://` 资源方案

工具返回：

```json
{
  "content": [
    { "type": "text", "text": "Here is your notes timeline:" },
    { "type": "ui_resource", "uri": "ui://notes/timeline" }
  ],
  "_meta": {
    "ui": {
      "resourceUri": "ui://notes/timeline",
      "csp": {
        "defaultSrc": "'self'",
        "scriptSrc": "'self' 'unsafe-inline'",
        "connectSrc": "'self'"
      },
      "permissions": []
    }
  }
}
```

宿主然后对 `ui://notes/timeline` URI调用 `resources/read` 并获得：

```json
{
  "contents": [
    {
      "uri": "ui://notes/timeline",
      "mimeType": "text/html;profile=mcp-app",
      "text": "<!doctype html>..."
    }
  ]
}
```

### iframe沙箱

宿主在沙箱化 `<iframe>` 中渲染HTML，带有：

- `sandbox="allow-scripts allow-same-origin"`（或按服务器声明更严格）
- 通过响应头应用的服务器声明CSP。
- 无cookie，无宿主源的localStorage。
- 网络访问限制为CSP中的 `connectSrc`。

### postMessage协议

iframe通过 `window.postMessage` 与宿主通信。微小的JSON-RPC 2.0方言：

始终将 `targetOrigin` 固定到对等方的确切源，并在接收端在处理任何负载之前根据允许列表验证 `event.origin`。永远不要对此通道的任一侧使用 `"*"` — 主体携带工具调用和资源读取。

```js
// iframe to host  (固定到宿主源)
window.parent.postMessage({
  jsonrpc: "2.0",
  id: 1,
  method: "host.callTool",
  params: { name: "notes_update", arguments: { id: "note-14", title: "..." } }
}, "https://host.example.com");

// host to iframe  (固定到iframe源)
iframe.contentWindow.postMessage({
  jsonrpc: "2.0",
  id: 1,
  result: { content: [...] }
}, "https://iframe.example.com");

// 双方接收器
window.addEventListener("message", (event) => {
  if (event.origin !== "https://expected-peer.example.com") return;
  // 安全处理 event.data
});
```

UI可以调用的可用宿主侧方法：

- `host.callTool(name, arguments)` — 调用服务器工具。
- `host.readResource(uri)` — 读取MCP资源。
- `host.getPrompt(name, arguments)` — 获取提示模板。
- `host.close()` — 关闭UI。

每个调用仍通过MCP协议并继承服务器的权限。

### 权限

`_meta.ui.permissions` 列表请求额外能力：

- `camera` — 访问用户摄像头（用于扫描文档UI）。
- `microphone` — 语音输入。
- `geolocation` — 位置。
- `network:*` — 比 `connectSrc` 单独允许的更宽网络访问。

每个权限是UI渲染前用户看到的提示。

### 安全风险

iframe中的HTML仍然是HTML。新攻击面：

- **通过UI的提示注入。** 恶意服务器UI可以显示看起来像系统消息的文本并欺骗用户。宿主渲染应明显区分服务器UI和宿主UI。
- **通过 `connectSrc` 外泄。** 如果CSP允许 `connect-src: *`，UI可以向任何地方发送数据。默认应严格。
- **点击劫持。** UI覆盖宿主chrome。宿主必须防止z-index操纵并强制不透明度规则。
- **窃取焦点。** UI获取键盘焦点并捕获下一条消息。宿主必须拦截。

Phase 13 · 15作为MCP安全的一部分深入涵盖这些；本课介绍它们。

### `ui/initialize` 握手

iframe加载后，通过postMessage发送 `ui/initialize`：

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "ui/initialize",
  "params": { "theme": "dark", "locale": "en-US", "sessionId": "..." }
}
```

宿主用能力和会话token响应。UI在每个后续宿主调用上使用会话token。

### AppRenderer / AppFrame SDK原语

ext-apps SDK暴露两个便利原语：

- `AppRenderer`（服务器侧）— 包装React / Vue / Solid组件并发出带有正确MIME和元数据的 `ui://` 资源。
- `AppFrame`（客户端侧）— 接收资源，挂载iframe，并中介postMessage。

你可以使用这些或手工编写HTML和JSON-RPC。

### 生态系统状态

MCP Apps于2026年1月26日发布。截至2026年4月的客户端支持：

- **Claude Desktop。** 自2026年1月起完全支持。
- **ChatGPT。** 通过Apps SDK完全支持（相同底层MCP Apps协议）。
- **Cursor。** Beta；通过设置启用。
- **VS Code。** 仅Insider构建。
- **Goose。** 完全支持。
- **Zed, Windsurf。** 路线图中。

生产中的服务器：仪表板、地图可视化、数据表、图表构建器、沙箱IDE预览。

## 实践

`code/main.py` 用 `visualize_timeline` 工具扩展笔记服务器，该工具返回 `ui://notes/timeline` 资源，加上对该URI的 `resources/read` 处理程序，返回一个小但完整的HTML包，带有SVG时间线。HTML使用标准库模板 — 无构建系统。postMessage在JS注释中草拟，因为标准库无法驱动浏览器。

关注点：

- 工具响应上的 `_meta.ui` 携带resourceUri、CSP、permissions。
- HTML在无网络访问下渲染；所有数据内联。
- JS通过 `window.parent.postMessage` 调用 `host.callTool`（已记录但在此标准库演示中无效）。

## 交付

本课产生 `outputs/skill-mcp-apps-spec.md`。给定一个受益于交互式UI的工具，该技能生成完整的MCP Apps契约：`ui://` URI、CSP、权限、postMessage入口点和安全检查清单。

## 练习

1. 运行 `code/main.py` 并检查发出的HTML。直接在浏览器中打开HTML；验证SVG渲染。然后草拟UI将用来调用 `host.callTool("notes_update", ...)` 的postMessage契约。

2. 收紧CSP：移除 `'unsafe-inline'` 并使用基于nonce的脚本策略。HTML生成代码中有什么变化？

3. 添加第二个UI资源 `ui://notes/editor`，带有用于就地编辑笔记的表单。用户提交时，iframe调用 `host.callTool("notes_update", ...)`。

4. 审计UI的攻击面。恶意服务器可以在哪里注入内容？iframe沙箱防御什么和不防御什么？

5. 阅读SEP-1724规范，识别MCP Apps SDK中此玩具实现未使用的一个能力。（提示：组件级状态同步。）

## 关键术语

| 术语                        | 人们怎么说                | 实际含义                                        |
| --------------------------- | ------------------------- | ----------------------------------------------- |
| MCP Apps                    | "交互式UI资源"            | SEP-1724扩展，2026-01-26发布                    |
| `ui://`                     | "应用URI方案"             | UI包的资源方案                                  |
| `text/html;profile=mcp-app` | "MIME"                    | MCP App HTML的内容类型                          |
| Iframe sandbox              | "渲染容器"                | 带CSP和权限的UI浏览器沙箱                       |
| postMessage JSON-RPC        | "UI到宿主线路"            | 用于宿主调用的微小JSON-RPC-over-postMessage方言 |
| `_meta.ui`                  | "工具-UI绑定"             | 链接工具结果到UI资源的元数据                    |
| CSP                         | "Content-Security-Policy" | 声明脚本、网络、样式的允许来源                  |
| AppRenderer                 | "服务器SDK原语"           | 将框架组件转换为 `ui://` 资源                   |
| AppFrame                    | "客户端SDK原语"           | 中介postMessage的iframe挂载助手                 |
| `ui/initialize`             | "握手"                    | UI到宿主的第一个postMessage                     |

## 延伸阅读

- [MCP ext-apps — GitHub](https://github.com/modelcontextprotocol/ext-apps) — 参考实现和SDK
- [MCP Apps specification 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) — 正式规范文档
- [MCP — Apps extension overview](https://modelcontextprotocol.io/extensions/apps/overview) — 高级文档
- [MCP blog — MCP Apps launch](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) — 2026年1月发布文章
- [MCP Apps API reference](https://apps.extensions.modelcontextprotocol.io/api/) — JSDoc风格SDK参考
