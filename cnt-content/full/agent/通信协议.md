---
title: 通信协议
description: '不能说同一种语言的 Agent 不是团队。它们是向虚空呐喊的陌生人。'
module: agent
related:
  - agent/思维树与LATS
  - agent/提示注入防御
  - agent/投票辩论拓扑
  - agent/为何多Agent
prerequisites:
  - agent/概述与架构
---

# 通信协议

> 不能说同一种语言的 Agent 不是团队。它们是向虚空呐喊的陌生人。

**类型：** 构建
**语言：** TypeScript
**前置条件：** Phase 14 (Agent 工程), Lesson 16.01 (为何多Agent)
**时间：** ~120 分钟

## 学习目标

- 实现 MCP 工具发现和调用，使 Agent 能使用外部服务器暴露的工具
- 构建 A2A Agent Card 和任务端点，允许一个 Agent 通过 HTTP 将工作委派给另一个 Agent
- 比较 MCP (工具访问)、A2A (Agent 对 Agent)、ACP (企业审计) 和 ANP (去中心化信任)，解释哪个协议解决哪个问题
- 在单个系统中连接多个协议，Agent 通过 MCP 发现工具、通过 A2A 委派任务

## 问题

你将系统拆分为多个 Agent。一个研究员、一个编码者、一个审查员。它们各自的工作做得很好。但现在你需要它们真正地互相交流。

你的第一次尝试很显然：传递字符串。研究员返回一大段文本，编码者尽其所能解析。这能工作，直到编码者误解了研究摘要，或者两个 Agent 互相等待而死锁，或者你需要不同团队构建的 Agent 协作。突然间"只传字符串"就崩溃了。

这就是通信协议问题。没有 Agent 交换信息的共享契约，多 Agent 系统是脆弱的、不可审计的、无法扩展到少数几个你亲自编写的 Agent 之外的。

AI 生态系统用四个协议做出了回应，每个解决不同层面的问题：

- **MCP** 用于工具访问
- **A2A** 用于 Agent 间协作
- **ACP** 用于企业可审计性
- **ANP** 用于去中心化身份和信任

本课程深入探讨。你将阅读每个规范的真实线路格式，构建可工作的实现，并将所有四个连接成一个统一系统。

## 概念

### 协议全景

把这四个协议想象成层，每层解决不同的问题：

- **ANP** — Agent 如何信任陌生人？去中心化身份 (DID)、E2EE、元协议
- **A2A** — Agent 如何在目标上协作？Agent Card、任务生命周期、流式、协商
- **ACP** — Agent 如何在可审计系统中通信？运行、轨迹元数据、会话连续性
- **MCP** — Agent 如何使用工具？工具发现、执行、上下文共享

它们不是竞争者。它们在不同层面解决不同问题。

### MCP (回顾)

MCP 在 Phase 13 中有深入讲解。快速回顾：MCP 标准化了 LLM 如何连接到外部工具和数据源。它是一个**客户端-服务器**协议，Agent (客户端) 发现并调用服务器暴露的工具。

MCP 是 **Agent 到工具** 的通信。它不帮助 Agent 之间互相交流。

### A2A (Agent2Agent 协议)

**创建者：** Google (现属于 Linux 基金会，`lf.a2a.v1`)
**规范版本：** 1.0.0
**问题：** 自主 Agent 如何协作、协商和委派任务？

A2A 是**对等 Agent 协作**的协议。MCP 连接 Agent 到工具，A2A 连接 Agent 到其他 Agent。每个 Agent 在知名 URL 发布 **Agent Card**，其他 Agent 发现、协商和委派任务给它。

#### A2A 如何工作

1. 客户端 Agent 获取远程 Agent 的 Agent Card
2. 客户端发送消息创建任务
3. 客户端通过轮询或 SSE 流式接收状态更新和制品

#### 真实的 Agent Card

这是 A2A Agent Card 在实际中的样子。在 `GET /.well-known/agent-card.json` 提供：

```json
{
  "name": "Research Agent",
  "description": "Searches documentation and summarizes findings",
  "version": "1.0.0",
  "supportedInterfaces": [
    {
      "url": "https://research-agent.example.com/a2a/v1",
      "protocolBinding": "JSONRPC",
      "protocolVersion": "1.0"
    },
    {
      "url": "https://research-agent.example.com/a2a/rest",
      "protocolBinding": "HTTP+JSON",
      "protocolVersion": "1.0"
    }
  ],
  "provider": {
    "organization": "Your Company",
    "url": "https://example.com"
  },
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "id": "web-research",
      "name": "Web Research",
      "description": "Searches the web and synthesizes findings",
      "tags": ["research", "search", "summarization"],
      "examples": ["Research the latest changes in React 19"]
    },
    {
      "id": "doc-analysis",
      "name": "Documentation Analysis",
      "description": "Reads and analyzes technical documentation",
      "tags": ["docs", "analysis"],
      "inputModes": ["text/plain", "application/pdf"],
      "outputModes": ["application/json"]
    }
  ],
  "securitySchemes": {
    "bearer": {
      "httpAuthSecurityScheme": {
        "scheme": "Bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "security": [{ "bearer": [] }]
}
```

关键要点：

- **Skills** 是 Agent 能做的事。每个有 ID、标签和支持的输入/输出 MIME 类型。这是客户端 Agent 决定远程 Agent 是否能处理其请求的方式。
- **supportedInterfaces** 列出多个协议绑定。单个 Agent 可以同时支持 JSON-RPC、REST 和 gRPC。
- **Security** 内置在 Card 中。客户端在发出任何请求之前就知道需要什么认证。

#### 任务生命周期

任务是 A2A 中的核心工作单元。它们在定义的状态间移动：

| 状态                        | 终态？ | 含义               |
| --------------------------- | ------ | ------------------ |
| `TASK_STATE_SUBMITTED`      | 否     | 已确认，尚未处理   |
| `TASK_STATE_WORKING`        | 否     | 正在处理           |
| `TASK_STATE_INPUT_REQUIRED` | 否     | Agent 需要更多信息 |
| `TASK_STATE_AUTH_REQUIRED`  | 否     | 需要认证           |
| `TASK_STATE_COMPLETED`      | 是     | 成功完成           |
| `TASK_STATE_FAILED`         | 是     | 出错完成           |
| `TASK_STATE_CANCELED`       | 是     | 完成前取消         |
| `TASK_STATE_REJECTED`       | 是     | Agent 拒绝了任务   |

一旦任务到达终态，它就是不可变的。不再有后续消息。后续操作在同一 `contextId` 内创建新任务。

#### 线路格式

A2A 使用 JSON-RPC 2.0。以下是真实消息交换的样子：

**客户端发送任务：**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "SendMessage",
  "params": {
    "message": {
      "messageId": "msg-001",
      "role": "ROLE_USER",
      "parts": [{ "text": "Research React 19 compiler features" }]
    },
    "configuration": {
      "acceptedOutputModes": ["text/plain", "application/json"],
      "historyLength": 10
    }
  }
}
```

**Agent 响应任务：**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "task": {
      "id": "task-abc-123",
      "contextId": "ctx-xyz-789",
      "status": {
        "state": "TASK_STATE_COMPLETED",
        "timestamp": "2026-03-27T10:30:00Z"
      },
      "artifacts": [
        {
          "artifactId": "art-001",
          "name": "research-results",
          "parts": [
            {
              "data": {
                "findings": [
                  "React 19 compiler auto-memoizes components",
                  "No more manual useMemo/useCallback needed",
                  "Compiler runs at build time, not runtime"
                ]
              },
              "mediaType": "application/json"
            }
          ]
        }
      ]
    }
  }
}
```

**通过 SSE 流式传输：**

```text
POST /message:stream HTTP/1.1
Content-Type: application/json
A2A-Version: 1.0

data: {"task":{"id":"task-123","status":{"state":"TASK_STATE_WORKING"}}}

data: {"statusUpdate":{"taskId":"task-123","status":{"state":"TASK_STATE_WORKING","message":{"role":"ROLE_AGENT","parts":[{"text":"Searching documentation..."}]}}}}

data: {"artifactUpdate":{"taskId":"task-123","artifact":{"artifactId":"art-1","parts":[{"text":"partial findings..."}]},"append":true,"lastChunk":false}}

data: {"statusUpdate":{"taskId":"task-123","status":{"state":"TASK_STATE_COMPLETED"}}}
```

### ACP (Agent Communication Protocol)

**创建者：** IBM / BeeAI
**规范版本：** 0.2.0 (OpenAPI 3.1.1)
**状态：** 正在合并到 A2A (Linux 基金会)
**问题：** Agent 如何在完全可审计、会话连续和轨迹跟踪的情况下通信？

ACP 是**企业协议**。与许多摘要声称的不同，ACP **不**使用 JSON-LD。它是一个通过 OpenAPI 定义的简单 REST/JSON API。它的特殊之处在于 **TrajectoryMetadata**：每个 Agent 响应可以携带产生它的推理步骤和工具调用的详细日志。

#### ACP 中的 Agent 发现

ACP 定义了四种发现方法：

- **运行时** — `GET /agents`
- **开放** — `.well-known/agent.yml`
- **注册表** — 集中目录
- **嵌入式** — 容器标签

**AgentManifest** 比 A2A 的 Agent Card 更简单：

```json
{
  "name": "summarizer",
  "description": "Summarizes documents with source citations",
  "input_content_types": ["text/plain", "application/pdf"],
  "output_content_types": ["text/plain", "application/json"],
  "metadata": {
    "tags": ["summarization", "RAG"],
    "framework": "BeeAI",
    "capabilities": [
      {
        "name": "Document Summarization",
        "description": "Condenses long documents into key points"
      }
    ],
    "recommended_models": ["llama3.3:70b-instruct-fp16"],
    "license": "Apache-2.0",
    "programming_language": "Python"
  }
}
```

#### 运行生命周期

ACP 使用"运行"而不是"任务"。运行是具有三种模式的 Agent 执行：

| 模式     | 行为                                           |
| -------- | ---------------------------------------------- |
| `sync`   | 阻塞。响应包含完整结果。                       |
| `async`  | 立即返回 202。轮询 `GET /runs/{id}` 获取状态。 |
| `stream` | SSE 流。Agent 工作时触发事件。                 |

#### TrajectoryMetadata (审计追踪)

这是 ACP 的关键差异化特性。每个消息部分可以包含显示 Agent 确切做了什么的元数据：

```json
{
  "role": "agent/researcher",
  "parts": [
    {
      "content_type": "text/plain",
      "content": "The weather in San Francisco is 72F and sunny.",
      "metadata": {
        "kind": "trajectory",
        "message": "I need to check the weather for this location",
        "tool_name": "weather_api",
        "tool_input": { "location": "San Francisco, CA" },
        "tool_output": { "temperature": 72, "condition": "sunny" }
      }
    }
  ]
}
```

对于受监管行业来说这是无价之宝。每个答案都附带可证明的推理链：调用了哪些工具、使用了什么输入、收到了什么输出。没有黑箱。

ACP 还支持用于来源归因的 **CitationMetadata**：

```json
{
  "kind": "citation",
  "start_index": 0,
  "end_index": 47,
  "url": "https://weather.gov/sf",
  "title": "NWS San Francisco Forecast"
}
```

### ANP (Agent Network Protocol)

**创建者：** 开源社区 (由 GaoWei Chang 创立)
**仓库：** [github.com/agent-network-protocol/AgentNetworkProtocol](https://github.com/agent-network-protocol/AgentNetworkProtocol)
**问题：** 来自不同组织的 Agent 如何在没有中央权威的情况下互相信任？

ANP 是**去中心化身份协议**。它使用 W3C 去中心化标识符 (DID) 和端到端加密建立信任。与 A2A 通过已知端点发现 Agent 不同，ANP 让 Agent 密码学地证明其身份。

ANP 有三层：

**第 3 层：应用协议** — Agent 描述文档、发现端点
**第 2 层：元协议** — AI 驱动的协议协商、动态代码生成
**第 1 层：身份与安全通信** — `did:wba` (W3C DID)、HPKE E2EE (RFC 9180)、签名验证

#### DID 文档 (真实结构)

ANP 使用自定义 DID 方法 `did:wba` (基于 Web 的 Agent)。DID `did:wba:example.com:user:alice` 解析到 `https://example.com/user/alice/did.json`：

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/jws-2020/v1",
    "https://w3id.org/security/suites/secp256k1-2019/v1"
  ],
  "id": "did:wba:example.com:user:alice",
  "verificationMethod": [
    {
      "id": "did:wba:example.com:user:alice#key-1",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:wba:example.com:user:alice",
      "publicKeyJwk": {
        "crv": "secp256k1",
        "x": "NtngWpJUr-rlNNbs0u-Aa8e16OwSJu6UiFf0Rdo1oJ4",
        "y": "qN1jKupJlFsPFc1UkWinqljv4YE0mq_Ickwnjgasvmo",
        "kty": "EC"
      }
    },
    {
      "id": "did:wba:example.com:user:alice#key-x25519-1",
      "type": "X25519KeyAgreementKey2019",
      "controller": "did:wba:example.com:user:alice",
      "publicKeyMultibase": "z9hFgmPVfmBZwRvFEyniQDBkz9LmV7gDEqytWyGZLmDXE"
    }
  ],
  "authentication": ["did:wba:example.com:user:alice#key-1"],
  "keyAgreement": ["did:wba:example.com:user:alice#key-x25519-1"],
  "humanAuthorization": ["did:wba:example.com:user:alice#key-1"],
  "service": [
    {
      "id": "did:wba:example.com:user:alice#agent-description",
      "type": "AgentDescription",
      "serviceEndpoint": "https://example.com/agents/alice/ad.json"
    }
  ]
}
```

关键要点：

- **密钥分离** 是强制性的。签名密钥 (secp256k1) 与加密密钥 (X25519) 分开。
- **`humanAuthorization`** 是 ANP 独有的。这些密钥在使用前需要明确的人工批准（生物识别、密码、HSM）。资金转账等高风险操作通过此路径。
- **`keyAgreement`** 密钥用于 HPKE 端到端加密 (RFC 9180)。
- **service** 部分链接到 Agent 描述文档。

#### ANP 中的信任如何工作

ANP **不**使用信任网或背书图。信任是双边的，每次交互验证：

1. Agent A 向 Agent B 发送 HTTP 请求 + DID + 签名
2. Agent B 从 Agent A 的域获取 DID 文档 (HTTPS)
3. Agent B 用公钥验证签名
4. Agent B 颁发访问令牌
5. Agent A 后续请求使用令牌

信任来自三个来源：

1. **域级 TLS** 验证 DID 文档主机
2. **DID 密码学签名** 验证 Agent 身份
3. **最小信任原则** 仅授予最低权限

没有基于流言的信任传播或 PageRank 评分。你通过 DID 直接验证每个 Agent。

#### 元协议协商

这是 ANP 最新颖的功能。当来自不同生态系统的两个 Agent 相遇时，它们不需要预先约定的数据格式。它们用自然语言协商：

```json
{
  "action": "protocolNegotiation",
  "sequenceId": 0,
  "candidateProtocols": "I can communicate using:\n1. JSON-RPC with hotel booking schema\n2. REST with OpenAPI 3.1 spec\n3. Natural language over HTTP",
  "modificationSummary": "Initial proposal",
  "status": "negotiating"
}
```

Agent 来回协商（最多 10 轮），直到就格式达成一致，然后动态生成代码来处理它。状态值：`negotiating`、`rejected`、`accepted`、`timeout`。

这意味着两个从未见过彼此的 Agent 可以弄清楚如何通信，而不需要任何人预定义共享 schema。

### 比较 (修正版)

|              | MCP          | A2A                            | ACP                                     | ANP                                             |
| ------------ | ------------ | ------------------------------ | --------------------------------------- | ----------------------------------------------- |
| **创建者**   | Anthropic    | Google / Linux 基金会          | IBM / BeeAI                             | 社区                                            |
| **规范格式** | JSON-RPC     | JSON-RPC / REST / gRPC         | OpenAPI 3.1 (REST)                      | JSON-RPC                                        |
| **主要用途** | Agent 到工具 | Agent 到 Agent                 | Agent 到 Agent                          | Agent 到 Agent                                  |
| **发现**     | 工具列表     | `/.well-known/agent-card.json` | `GET /agents`, `/.well-known/agent.yml` | `/.well-known/agent-descriptions`, DID 服务端点 |
| **身份**     | 隐式 (本地)  | 安全方案 (OAuth, mTLS)         | 服务器级                                | W3C DID (`did:wba`) + E2EE                      |
| **审计追踪** | N/A          | 基本 (任务历史)                | TrajectoryMetadata (工具调用、推理)     | 未正式指定                                      |
| **状态机**   | N/A          | 9 个任务状态                   | 7 个运行状态                            | N/A                                             |
| **流式**     | N/A          | SSE                            | SSE                                     | 传输无关                                        |
| **独特功能** | 工具 Schema  | Agent Card + Skills            | 轨迹审计追踪                            | 元协议协商                                      |
| **最适合**   | 工具和数据   | 动态协作                       | 受监管行业                              | 跨组织信任                                      |
| **状态**     | 稳定         | 稳定 (v1.0)                    | 合并到 A2A                              | 活跃开发                                        |

### 它们如何协同工作

这些协议不是互斥的。一个现实的企业系统使用多个：

- **MCP** 连接每个 Agent 到其工具
- **A2A** 处理 Agent 之间的协作（内部和外部）
- **ACP** 用轨迹元数据包装响应以实现可审计性
- **ANP** 为你不可控的 Agent 提供身份验证

## 构建它

### 步骤 1：核心消息类型

每个多 Agent 系统都从消息格式开始。我们定义映射到真实协议使用的类型：

```typescript
import crypto from 'node:crypto';

type MessageRole = 'user' | 'agent';

type MessagePart =
  | { kind: 'text'; text: string }
  | { kind: 'data'; data: unknown; mediaType: string }
  | { kind: 'file'; name: string; url: string; mediaType: string };

type TrajectoryEntry = {
  reasoning: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  timestamp: number;
};

type AgentMessage = {
  id: string;
  role: MessageRole;
  parts: MessagePart[];
  trajectory?: TrajectoryEntry[];
  replyTo?: string;
  timestamp: number;
};

function createMessage(role: MessageRole, parts: MessagePart[], replyTo?: string): AgentMessage {
  return {
    id: crypto.randomUUID(),
    role,
    parts,
    replyTo,
    timestamp: Date.now(),
  };
}

function textMessage(role: MessageRole, text: string): AgentMessage {
  return createMessage(role, [{ kind: 'text', text }]);
}
```

注意：`MessagePart` 是多模态的（文本、结构化数据、文件），就像真实的 A2A 和 ACP 规范。`TrajectoryEntry` 捕获推理链，匹配 ACP 的 TrajectoryMetadata。

### 步骤 2：A2A Agent Card 和注册表

构建匹配真实 A2A 规范的 Agent 发现：

```typescript
type Skill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  inputModes: string[];
  outputModes: string[];
};

type AgentCard = {
  name: string;
  description: string;
  version: string;
  url: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: Skill[];
};

class AgentRegistry {
  private cards: Map<string, AgentCard> = new Map();

  register(card: AgentCard) {
    this.cards.set(card.name, card);
  }

  discoverBySkillTag(tag: string): AgentCard[] {
    return [...this.cards.values()].filter((card) =>
      card.skills.some((skill) => skill.tags.includes(tag))
    );
  }

  discoverByInputMode(mimeType: string): AgentCard[] {
    return [...this.cards.values()].filter(
      (card) =>
        card.defaultInputModes.includes(mimeType) ||
        card.skills.some((skill) => skill.inputModes.includes(mimeType))
    );
  }

  resolve(name: string): AgentCard | undefined {
    return this.cards.get(name);
  }

  listAll(): AgentCard[] {
    return [...this.cards.values()];
  }
}
```

这比简单的名称-能力映射丰富得多。你可以按技能标签、输入 MIME 类型或名称发现 Agent，就像真实 A2A 规范支持的那样。

### 步骤 3：A2A 任务生命周期

构建完整的任务状态机：

```typescript
type TaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'auth-required'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'rejected';

const TERMINAL_STATES: TaskState[] = ['completed', 'failed', 'canceled', 'rejected'];

type TaskStatus = {
  state: TaskState;
  message?: AgentMessage;
  timestamp: number;
};

type Artifact = {
  id: string;
  name: string;
  parts: MessagePart[];
};

type Task = {
  id: string;
  contextId: string;
  status: TaskStatus;
  artifacts: Artifact[];
  history: AgentMessage[];
};

type TaskEvent =
  | { kind: 'statusUpdate'; taskId: string; status: TaskStatus }
  | {
      kind: 'artifactUpdate';
      taskId: string;
      artifact: Artifact;
      append: boolean;
      lastChunk: boolean;
    };

type TaskHandler = (task: Task, message: AgentMessage) => AsyncGenerator<TaskEvent>;

class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private handlers: Map<string, TaskHandler> = new Map();
  private listeners: Map<string, ((event: TaskEvent) => void)[]> = new Map();

  registerHandler(agentName: string, handler: TaskHandler) {
    this.handlers.set(agentName, handler);
  }

  subscribe(taskId: string, listener: (event: TaskEvent) => void) {
    const existing = this.listeners.get(taskId) ?? [];
    existing.push(listener);
    this.listeners.set(taskId, existing);
  }

  async sendMessage(agentName: string, message: AgentMessage, contextId?: string): Promise<Task> {
    const handler = this.handlers.get(agentName);
    if (!handler) {
      const task = this.createTask(contextId);
      task.status = {
        state: 'rejected',
        timestamp: Date.now(),
        message: textMessage('agent', `No handler for ${agentName}`),
      };
      return task;
    }

    const task = this.createTask(contextId);
    task.history.push(message);
    task.status = { state: 'submitted', timestamp: Date.now() };

    this.processTask(task, handler, message).catch((err) => {
      task.status = {
        state: 'failed',
        timestamp: Date.now(),
        message: textMessage('agent', String(err)),
      };
    });
    return task;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || TERMINAL_STATES.includes(task.status.state)) return false;
    task.status = { state: 'canceled', timestamp: Date.now() };
    this.emit(taskId, {
      kind: 'statusUpdate',
      taskId,
      status: task.status,
    });
    return true;
  }

  private createTask(contextId?: string): Task {
    const task: Task = {
      id: crypto.randomUUID(),
      contextId: contextId ?? crypto.randomUUID(),
      status: { state: 'submitted', timestamp: Date.now() },
      artifacts: [],
      history: [],
    };
    this.tasks.set(task.id, task);
    return task;
  }

  private async processTask(task: Task, handler: TaskHandler, message: AgentMessage) {
    task.status = { state: 'working', timestamp: Date.now() };
    this.emit(task.id, {
      kind: 'statusUpdate',
      taskId: task.id,
      status: task.status,
    });

    try {
      for await (const event of handler(task, message)) {
        if (TERMINAL_STATES.includes(task.status.state)) break;

        if (event.kind === 'statusUpdate') {
          task.status = event.status;
        }
        if (event.kind === 'artifactUpdate') {
          const existing = task.artifacts.find((a) => a.id === event.artifact.id);
          if (existing && event.append) {
            existing.parts.push(...event.artifact.parts);
          } else {
            task.artifacts.push(event.artifact);
          }
        }
        this.emit(task.id, event);
      }
    } catch (err) {
      task.status = {
        state: 'failed',
        timestamp: Date.now(),
        message: textMessage('agent', String(err)),
      };
      this.emit(task.id, {
        kind: 'statusUpdate',
        taskId: task.id,
        status: task.status,
      });
    }
  }

  private emit(taskId: string, event: TaskEvent) {
    for (const listener of this.listeners.get(taskId) ?? []) {
      listener(event);
    }
  }
}
```

这实现了真实的 A2A 任务生命周期：submitted、working、input-required、终态。处理器是异步生成器，产生事件（状态更新和制品块），匹配 SSE 流式模型。

### 步骤 4：ACP 风格审计追踪

用轨迹跟踪包装通信：

```typescript
type AuditEntry = {
  runId: string;
  agentName: string;
  input: AgentMessage[];
  output: AgentMessage[];
  trajectory: TrajectoryEntry[];
  status: 'created' | 'in-progress' | 'completed' | 'failed' | 'awaiting';
  startedAt: number;
  completedAt?: number;
  sessionId?: string;
};

class AuditableRunner {
  private log: AuditEntry[] = [];
  private handlers: Map<
    string,
    (input: AgentMessage[]) => Promise<{
      output: AgentMessage[];
      trajectory: TrajectoryEntry[];
    }>
  > = new Map();

  registerAgent(
    name: string,
    handler: (input: AgentMessage[]) => Promise<{
      output: AgentMessage[];
      trajectory: TrajectoryEntry[];
    }>
  ) {
    this.handlers.set(name, handler);
  }

  async run(agentName: string, input: AgentMessage[], sessionId?: string): Promise<AuditEntry> {
    const entry: AuditEntry = {
      runId: crypto.randomUUID(),
      agentName,
      input: structuredClone(input),
      output: [],
      trajectory: [],
      status: 'created',
      startedAt: Date.now(),
      sessionId,
    };
    this.log.push(entry);

    const handler = this.handlers.get(agentName);
    if (!handler) {
      entry.status = 'failed';
      return entry;
    }

    entry.status = 'in-progress';
    try {
      const result = await handler(input);
      entry.output = structuredClone(result.output);
      entry.trajectory = structuredClone(result.trajectory);
      entry.status = 'completed';
      entry.completedAt = Date.now();
    } catch (err) {
      entry.status = 'failed';
      entry.trajectory.push({
        reasoning: `Error: ${String(err)}`,
        timestamp: Date.now(),
      });
      entry.completedAt = Date.now();
    }
    return entry;
  }

  getFullAuditLog(): AuditEntry[] {
    return structuredClone(this.log);
  }

  getAuditLogForAgent(agentName: string): AuditEntry[] {
    return structuredClone(this.log.filter((e) => e.agentName === agentName));
  }

  getAuditLogForSession(sessionId: string): AuditEntry[] {
    return structuredClone(this.log.filter((e) => e.sessionId === sessionId));
  }

  getTrajectoryForRun(runId: string): TrajectoryEntry[] {
    const entry = this.log.find((e) => e.runId === runId);
    return entry ? structuredClone(entry.trajectory) : [];
  }
}
```

每个 Agent 执行产生一个完整的审计条目：什么输入、什么输出，以及中间工具调用和推理步骤的完整轨迹。你可以按 Agent、按会话或按单个运行查询。

### 步骤 5：ANP 风格身份验证

构建基于 DID 的身份和验证：

```typescript
type VerificationMethod = {
  id: string;
  type: string;
  controller: string;
  publicKeyDer: string;
};

type DIDDocument = {
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  keyAgreement: string[];
  humanAuthorization: string[];
  service: { id: string; type: string; serviceEndpoint: string }[];
};

type AgentIdentity = {
  did: string;
  document: DIDDocument;
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
};

class IdentityRegistry {
  private documents: Map<string, DIDDocument> = new Map();

  publish(doc: DIDDocument) {
    this.documents.set(doc.id, doc);
  }

  resolve(did: string): DIDDocument | undefined {
    return this.documents.get(did);
  }

  verify(did: string, signature: string, payload: string): boolean {
    const doc = this.documents.get(did);
    if (!doc) return false;

    const authKeyIds = doc.authentication;
    const authKeys = doc.verificationMethod.filter((vm) => authKeyIds.includes(vm.id));

    for (const key of authKeys) {
      const publicKey = crypto.createPublicKey({
        key: Buffer.from(key.publicKeyDer, 'base64'),
        format: 'der',
        type: 'spki',
      });
      const isValid = crypto.verify(
        null,
        Buffer.from(payload),
        publicKey,
        Buffer.from(signature, 'hex')
      );
      if (isValid) return true;
    }
    return false;
  }

  requiresHumanAuth(did: string, operationKeyId: string): boolean {
    const doc = this.documents.get(did);
    if (!doc) return false;
    return doc.humanAuthorization.includes(operationKeyId);
  }
}

function createIdentity(domain: string, agentName: string): AgentIdentity {
  const did = `did:wba:${domain}:agent:${agentName}`;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');

  const keyId = `${did}#key-1`;
  const encKeyId = `${did}#key-x25519-1`;

  const document: DIDDocument = {
    id: did,
    verificationMethod: [
      {
        id: keyId,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyDer,
      },
      {
        id: encKeyId,
        type: 'X25519KeyAgreementKey2019',
        controller: did,
        publicKeyDer,
      },
    ],
    authentication: [keyId],
    keyAgreement: [encKeyId],
    humanAuthorization: [],
    service: [
      {
        id: `${did}#agent-description`,
        type: 'AgentDescription',
        serviceEndpoint: `https://${domain}/agents/${agentName}/ad.json`,
      },
    ],
  };

  return { did, document, privateKey, publicKey };
}

function signPayload(identity: AgentIdentity, payload: string): string {
  return crypto.sign(null, Buffer.from(payload), identity.privateKey).toString('hex');
}
```

这镜像了真实的 ANP 身份模型：Agent 拥有带有独立认证、密钥协议和人工授权密钥的 DID 文档。`IdentityRegistry` 模拟 DID 解析（在生产中这将是向 Agent 域的 HTTP 获取）。

### 步骤 6：协议网关

将所有四个协议连接到一个统一系统：

```typescript
class ProtocolGateway {
  private registry: AgentRegistry;
  private taskManager: TaskManager;
  private auditRunner: AuditableRunner;
  private identityRegistry: IdentityRegistry;

  constructor(
    registry: AgentRegistry,
    taskManager: TaskManager,
    auditRunner: AuditableRunner,
    identityRegistry: IdentityRegistry
  ) {
    this.registry = registry;
    this.taskManager = taskManager;
    this.auditRunner = auditRunner;
    this.identityRegistry = identityRegistry;
  }

  async delegateTask(
    fromDid: string,
    signature: string,
    targetAgent: string,
    message: AgentMessage,
    sessionId?: string
  ): Promise<{ task: Task; audit: AuditEntry } | { error: string }> {
    if (!this.identityRegistry.verify(fromDid, signature, message.id)) {
      return { error: 'Identity verification failed' };
    }

    const card = this.registry.resolve(targetAgent);
    if (!card) {
      return { error: `Agent ${targetAgent} not found in registry` };
    }

    const audit = await this.auditRunner.run(targetAgent, [message], sessionId);
    const task = await this.taskManager.sendMessage(targetAgent, message);

    return { task, audit };
  }

  discoverAndDelegate(
    fromDid: string,
    signature: string,
    skillTag: string,
    message: AgentMessage
  ): Promise<{ task: Task; audit: AuditEntry } | { error: string }> {
    const candidates = this.registry.discoverBySkillTag(skillTag);
    if (candidates.length === 0) {
      return Promise.resolve({
        error: `No agents found with skill tag: ${skillTag}`,
      });
    }
    return this.delegateTask(fromDid, signature, candidates[0].name, message);
  }
}
```

网关在一次调用中做四件事：

1. **ANP**：通过 DID 签名验证调用者身份
2. **A2A**：发现目标 Agent 并检查能力
3. **ACP**：用轨迹审计追踪包装执行
4. **A2A**：创建具有完整生命周期跟踪的任务

### 步骤 7：连接一切

```typescript
async function protocolDemo() {
  const registry = new AgentRegistry();
  registry.register({
    name: 'researcher',
    description: 'Searches and summarizes findings',
    version: '1.0.0',
    url: 'https://researcher.local/a2a/v1',
    capabilities: { streaming: true, pushNotifications: false },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain', 'application/json'],
    skills: [
      {
        id: 'web-research',
        name: 'Web Research',
        description: 'Searches the web',
        tags: ['research', 'search', 'summarization'],
        inputModes: ['text/plain'],
        outputModes: ['application/json'],
      },
    ],
  });
  registry.register({
    name: 'coder',
    description: 'Writes code from specs',
    version: '1.0.0',
    url: 'https://coder.local/a2a/v1',
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain'],
    skills: [
      {
        id: 'code-gen',
        name: 'Code Generation',
        description: 'Generates code',
        tags: ['coding', 'generation'],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['text/plain'],
      },
    ],
  });

  const taskManager = new TaskManager();
  const auditRunner = new AuditableRunner();

  const researchTrajectory: TrajectoryEntry[] = [];

  taskManager.registerHandler('researcher', async function* (task, message) {
    yield {
      kind: 'statusUpdate' as const,
      taskId: task.id,
      status: { state: 'working' as const, timestamp: Date.now() },
    };

    researchTrajectory.push({
      reasoning: 'Searching for React 19 documentation',
      toolName: 'web_search',
      toolInput: { query: 'React 19 compiler features' },
      toolOutput: {
        results: ['react.dev/blog/react-19', 'github.com/react/react'],
      },
      timestamp: Date.now(),
    });

    researchTrajectory.push({
      reasoning: 'Extracting key findings from search results',
      toolName: 'doc_analysis',
      toolInput: { url: 'react.dev/blog/react-19' },
      toolOutput: {
        summary: 'React 19 compiler auto-memoizes, no manual useMemo needed',
      },
      timestamp: Date.now(),
    });

    yield {
      kind: 'artifactUpdate' as const,
      taskId: task.id,
      artifact: {
        id: crypto.randomUUID(),
        name: 'research-results',
        parts: [
          {
            kind: 'data' as const,
            data: {
              findings: [
                'React 19 compiler auto-memoizes components',
                'No more manual useMemo/useCallback needed',
                'Compiler runs at build time, not runtime',
              ],
              sources: ['react.dev/blog/react-19'],
            },
            mediaType: 'application/json',
          },
        ],
      },
      append: false,
      lastChunk: true,
    };

    yield {
      kind: 'statusUpdate' as const,
      taskId: task.id,
      status: { state: 'completed' as const, timestamp: Date.now() },
    };
  });

  auditRunner.registerAgent('researcher', async () => ({
    output: [textMessage('agent', 'React 19 compiler auto-memoizes components')],
    trajectory: researchTrajectory,
  }));

  const identityRegistry = new IdentityRegistry();

  const coderIdentity = createIdentity('coder.local', 'coder');
  const researcherIdentity = createIdentity('researcher.local', 'researcher');

  identityRegistry.publish(coderIdentity.document);
  identityRegistry.publish(researcherIdentity.document);

  const gateway = new ProtocolGateway(registry, taskManager, auditRunner, identityRegistry);

  console.log('=== Protocol Demo ===\n');

  console.log('1. Agent Discovery (A2A)');
  const researchAgents = registry.discoverBySkillTag('research');
  console.log(
    `   Found ${researchAgents.length} agent(s):`,
    researchAgents.map((a) => a.name)
  );

  console.log('\n2. Identity Verification (ANP)');
  const message = textMessage('user', 'Research React 19 compiler features');
  const signature = signPayload(coderIdentity, message.id);
  const verified = identityRegistry.verify(coderIdentity.did, signature, message.id);
  console.log(`   Coder DID: ${coderIdentity.did}`);
  console.log(`   Signature verified: ${verified}`);

  console.log('\n3. Task Delegation (A2A + ACP + ANP)');
  const result = await gateway.delegateTask(
    coderIdentity.did,
    signature,
    'researcher',
    message,
    'session-001'
  );

  if ('error' in result) {
    console.log(`   Error: ${result.error}`);
    return;
  }

  console.log(`   Task ID: ${result.task.id}`);
  console.log(`   Task state: ${result.task.status.state}`);
  console.log(`   Artifacts: ${result.task.artifacts.length}`);

  console.log('\n4. Audit Trail (ACP)');
  console.log(`   Run ID: ${result.audit.runId}`);
  console.log(`   Status: ${result.audit.status}`);
  console.log(`   Trajectory steps: ${result.audit.trajectory.length}`);
  for (const step of result.audit.trajectory) {
    console.log(`     - ${step.reasoning}`);
    if (step.toolName) {
      console.log(`       Tool: ${step.toolName}`);
    }
  }

  console.log('\n5. Full Audit Log');
  const fullLog = auditRunner.getFullAuditLog();
  console.log(`   Total runs: ${fullLog.length}`);
  for (const entry of fullLog) {
    const duration = entry.completedAt ? `${entry.completedAt - entry.startedAt}ms` : 'in-progress';
    console.log(`   ${entry.agentName}: ${entry.status} (${duration})`);
  }
}

protocolDemo().catch((err) => {
  console.error('Protocol demo failed:', err);
  process.exitCode = 1;
});
```

## 什么会出问题

协议解决了正常路径。以下是生产中会出问题的地方：

**Schema 漂移。** Agent A 发布 Agent Card 宣传 `application/json` 输出。但 JSON schema 在版本间变化了。Agent B 解析旧格式得到垃圾数据。修复：版本化你的技能和输出 schema。A2A 规范在 Agent Card 上支持 `version` 正是因为这个原因。

**状态机违规。** Agent 处理器产生 `completed` 事件，然后试图产生更多制品。任务是不可变的。你的代码静默丢弃更新或抛出异常。修复：在产生之前检查终态。上面的 `TaskManager` 通过终态后的 `break` 强制执行这一点。

**信任解析失败。** Agent A 尝试验证 Agent B 的 DID，但 Agent B 的域宕机了。DID 文档无法获取。你是失败开放（接受未验证的 Agent）还是失败关闭（拒绝一切）？ANP 推荐使用最小信任原则失败关闭。

**轨迹膨胀。** ACP 轨迹日志功能强大但昂贵。一个每次运行进行 200 次工具调用的复杂 Agent 会产生巨大的审计条目。修复：以可配置的详细程度级别记录轨迹。合规记录工具名称和 IO，非监管工作负载跳过推理步骤。

**发现惊群。** 50 个 Agent 在启动时同时查询 `GET /agents`。修复：用 TTL 缓存 Agent Card，错开发现间隔，或使用基于推送的注册替代轮询。

## 使用它

### 真实实现

**A2A** 最成熟。Google 的[官方规范](https://github.com/google/A2A)在 Linux 基金会下开源。Python 和 TypeScript SDK。如果你的 Agent 需要动态发现和协作，从这里开始。

**ACP** 正在合并到 A2A。IBM 的 [BeeAI 项目](https://github.com/i-am-bee/acp)创建了 ACP 作为 REST 优先的替代，但轨迹元数据概念正在被吸收到 A2A 生态中。即使你使用 A2A 作为传输，也可以使用 ACP 模式（轨迹日志、运行生命周期）。

**ANP** 最实验性。[社区仓库](https://github.com/agent-network-protocol/AgentNetworkProtocol)有 Python SDK (AgentConnect)。元协议协商概念真正新颖。值得关注跨组织 Agent 部署。

**MCP** 已在 Phase 13 中涵盖。如果你想让 Agent 使用工具，MCP 是标准。

### 选择正确的协议

- Agent 需要使用工具吗？→ 使用 MCP
- Agent 需要互相交流吗？→ 继续
- 需要合规审计追踪吗？→ A2A + ACP 轨迹模式
- 所有 Agent 都在你的组织内吗？→ A2A (Agent Card + Tasks)
- 有共享基础设施吗？→ A2A + 消息代理
- 跨组织无共享基础设施？→ ANP + A2A (DID 验证)

## 发布它

本课程产生：

- `code/main.ts` — 所有四种协议模式的完整实现
- `outputs/prompt-protocol-selector.md` — 帮助你为系统选择协议的提示

## 练习

1. **多跳任务委派。** 扩展 `TaskManager`，使 Agent 处理器可以将子任务委派给其他 Agent。研究员接收任务，将"搜索"和"摘要"子任务委派给两个专家 Agent，等待两者完成，然后将结果合并到自己的制品中。

2. **流式审计追踪。** 修改 `AuditableRunner` 以支持流式模式。不等待完整结果，而是在添加轨迹条目时实时产生 `AuditEntry` 更新。使用产生审计快照的异步生成器。

3. **DID 轮换。** 向 `IdentityRegistry` 添加密钥轮换。Agent 应该能够发布带有更新密钥的新 DID 文档，同时维护 `previousDid` 引用。验证者应在宽限期内接受当前和先前密钥的签名。

4. **协议协商。** 实现 ANP 的元协议概念。两个 Agent 交换带有候选格式的 `protocolNegotiation` 消息（例如，"我可以说 JSON-RPC" vs "我偏好 REST"）。最多 3 轮后，它们就格式达成一致或超时。约定的格式决定它们使用哪个 `TaskManager` 或 `AuditableRunner`。

5. **限速发现。** 添加 `RateLimitedRegistry` 包装器，用可配置的 TTL 缓存 Agent Card 查找，并限制每个 Agent 每秒的发现查询。模拟 100 个 Agent 在启动时互相发现的惊群，并测量差异。

## 关键术语

| 术语               | 人们怎么说             | 实际含义                                                                                                                    |
| ------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| MCP                | "AI 工具的协议"        | Agent 发现和使用工具的客户端-服务器协议。Agent 到工具，不是 Agent 到 Agent。                                                |
| A2A                | "Google 的 Agent 协议" | Linux 基金会下的对等 Agent 协作协议。通过 Agent Card 发现、9 状态任务生命周期、SSE 流式。支持 JSON-RPC、REST 和 gRPC 绑定。 |
| ACP                | "企业 Agent 消息传递"  | IBM/BeeAI 的 Agent 运行 REST API，带 TrajectoryMetadata：每个响应携带完整的推理链和工具调用。正在合并到 A2A。               |
| ANP                | "去中心化 Agent 身份"  | 社区协议，使用 `did:wba` (DID) 进行密码学身份验证，HPKE 用于 E2EE，AI 驱动的元协议协商用于从未见过彼此的 Agent。            |
| Agent Card         | "Agent 的名片"         | 位于 `/.well-known/agent-card.json` 的 JSON 文档，描述技能、支持的 MIME 类型、安全方案和协议绑定。                          |
| DID                | "去中心化 ID"          | W3C 标准，用于在 Agent 自己的域上托管的密码学可验证身份。ANP 使用 `did:wba` 方法。                                          |
| TrajectoryMetadata | "审计收据"             | ACP 的机制，将推理步骤、工具调用及其输入/输出附加到每个 Agent 响应。                                                        |
| 元协议             | "Agent 协商如何交流"   | ANP 的方法，Agent 使用自然语言动态同意数据格式，然后生成代码来处理它们。                                                    |
| Task               | "工作单元"             | A2A 的有状态对象，跟踪从提交到完成的工作。终态后不可变。                                                                    |

## 延伸阅读

- [Google A2A specification](https://github.com/google/A2A) — 官方规范和 SDK (v1.0.0, Linux 基金会)
- [IBM/BeeAI ACP specification](https://github.com/i-am-bee/acp) — Agent 运行和轨迹元数据的 OpenAPI 3.1 规范
- [Agent Network Protocol](https://github.com/agent-network-protocol/AgentNetworkProtocol) — 基于 DID 的身份、E2EE、元协议协商
- [Model Context Protocol docs](https://modelcontextprotocol.io/) — Anthropic 的 MCP 规范 (Phase 13 中涵盖)
- [W3C Decentralized Identifiers](https://www.w3.org/TR/did-core/) — ANP 底层的身份标准
- [RFC 9180 (HPKE)](https://www.rfc-editor.org/rfc/rfc9180) — ANP 用于 E2EE 的加密方案
- [FIPA Agent Communication Language](http://www.fipa.org/specs/fipa00061/SC00061G.html) — 现代 Agent 协议的学术前身
