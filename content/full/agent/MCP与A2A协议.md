---
order: 91
title: 'MCP 与 A2A 协议'
module: agent
category: 'AI Agent'
difficulty: advanced
description: 'MCP 协议标准化 Agent 与工具交互、A2A 协议实现 Agent 间通信、上下文工程与工具调用格式。'
author: fanquanpp
updated: '2026-06-14'
related:
  - agent/实战项目
  - agent/Agent核心模块详解
  - agent/Agent安全与沙盒
  - agent/ReAct模式
prerequisites:
  - agent/概述与架构
---

## 1. 协议层概述

AI Agent 生态的成熟离不开标准化协议。两大核心协议解决了不同层面的互操作问题：

| 协议    | 全称                   | 解决的问题           | 通信方向            |
| :------ | :--------------------- | :------------------- | :------------------ |
| **MCP** | Model Context Protocol | Agent 如何与工具交互 | Agent ↔ 工具/数据源 |
| **A2A** | Agent-to-Agent         | Agent 之间如何通信   | Agent ↔ Agent       |

```
┌──────────────────────────────────────────────────────┐
│                   Agent 生态协议层                     │
│                                                      │
│  ┌─────────┐   A2A    ┌─────────┐   A2A   ┌───────┐ │
│  │ Agent A │←───────→│ Agent B │←──────→│Agent C│ │
│  └────┬────┘          └────┬────┘         └───┬───┘ │
│       │                    │                  │      │
│       │ MCP                │ MCP              │ MCP  │
│       ↓                    ↓                  ↓      │
│  ┌─────────┐          ┌─────────┐        ┌───────┐  │
│  │ 工具/DB │          │ 工具/DB │        │工具/DB│  │
│  └─────────┘          └─────────┘        └───────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## 2. MCP 协议（Model Context Protocol）

### 2.1 MCP 简介

MCP 是由 Anthropic 提出的开放协议，旨在标准化 AI 模型与外部工具、数据源之间的交互方式。类比 USB-C 统一了设备接口，MCP 统一了 Agent 与工具的接口。

**核心设计目标**：

| 目标         | 描述                     |
| :----------- | :----------------------- |
| **标准化**   | 统一的工具描述和调用格式 |
| **可发现**   | Agent 能自动发现可用工具 |
| **安全可控** | 工具权限和访问控制       |
| **双向通信** | 支持请求-响应和流式通信  |

### 2.2 MCP 架构

```
┌─────────────────────────────────────────────┐
│              MCP 架构                        │
│                                             │
│  ┌──────────────┐       ┌──────────────┐    │
│  │   MCP Host   │       │  MCP Server  │    │
│  │  (Agent/LLM) │←─────→│  (工具提供方) │    │
│  └──────────────┘       └──────────────┘    │
│         │                      │            │
│         │                      │            │
│  ┌──────────────┐       ┌──────────────┐    │
│  │  MCP Client  │       │  本地/远程   │    │
│  │  (协议客户端) │       │   资源       │    │
│  └──────────────┘       └──────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

| 组件           | 职责                             |
| :------------- | :------------------------------- |
| **MCP Host**   | 发起连接的 Agent 应用            |
| **MCP Client** | 协议客户端，管理与 Server 的连接 |
| **MCP Server** | 提供工具、资源和提示模板         |

### 2.3 MCP Server 实现

```python
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
from mcp.types import (
    Tool, TextContent, ImageContent,
    CallToolResult, ListToolsResult
)
import mcp.server.stdio

# 创建 MCP Server
server = Server("weather-tools")

@server.list_tools()
async def list_tools() -> ListToolsResult:
    """声明可用工具"""
    return ListToolsResult(
        tools=[
            Tool(
                name="get_weather",
                description="获取指定城市的当前天气信息",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": "城市名称，如'北京'"
                        },
                        "unit": {
                            "type": "string",
                            "enum": ["celsius", "fahrenheit"],
                            "description": "温度单位",
                            "default": "celsius"
                        }
                    },
                    "required": ["city"]
                }
            ),
            Tool(
                name="get_forecast",
                description="获取未来几天的天气预报",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": "城市名称"
                        },
                        "days": {
                            "type": "integer",
                            "description": "预报天数（1-7）",
                            "default": 3
                        }
                    },
                    "required": ["city"]
                }
            )
        ]
    )

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> CallToolResult:
    """处理工具调用"""
    if name == "get_weather":
        result = await fetch_weather(arguments["city"], arguments.get("unit", "celsius"))
        return CallToolResult(
            content=[TextContent(type="text", text=result)]
        )
    elif name == "get_forecast":
        result = await fetch_forecast(arguments["city"], arguments.get("days", 3))
        return CallToolResult(
            content=[TextContent(type="text", text=result)]
        )
    else:
        raise ValueError(f"未知工具: {name}")

async def fetch_weather(city: str, unit: str) -> str:
    """实际获取天气数据"""
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.weather.com/current",
            params={"city": city, "unit": unit}
        )
        return resp.text

async def main():
    """启动 MCP Server"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="weather-tools",
                server_version="1.0.0"
            )
        )
```

### 2.4 MCP Client 实现

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

class MCPClient:
    """MCP 客户端 - Agent 端连接工具"""

    def __init__(self):
        self.sessions: dict[str, ClientSession] = {}

    async def connect(self, server_name: str,
                      command: str, args: list = None):
        """连接到 MCP Server"""
        server_params = StdioServerParameters(
            command=command,
            args=args or [],
            env=None
        )

        stdio_transport = await stdio_client(server_params)
        read_stream, write_stream = stdio_transport

        session = ClientSession(read_stream, write_stream)
        await session.initialize()

        self.sessions[server_name] = session
        return session

    async def list_tools(self, server_name: str) -> list:
        """获取 Server 提供的工具列表"""
        session = self.sessions[server_name]
        result = await session.list_tools()
        return result.tools

    async def call_tool(self, server_name: str,
                        tool_name: str, arguments: dict) -> str:
        """调用工具"""
        session = self.sessions[server_name]
        result = await session.call_tool(tool_name, arguments)
        return result

    async def get_all_tools(self) -> list:
        """获取所有已连接 Server 的工具"""
        all_tools = []
        for name, session in self.sessions.items():
            result = await session.list_tools()
            for tool in result.tools:
                all_tools.append({
                    "server": name,
                    "tool": tool
                })
        return all_tools
```

### 2.5 MCP 资源与提示模板

MCP 不仅支持工具调用，还支持**资源（Resources）**和**提示模板（Prompts）**：

```python
# MCP 资源 - 提供数据给 Agent
@server.list_resources()
async def list_resources() -> list:
    return [
        {
            "uri": "weather://alerts/beijing",
            "name": "北京天气预警",
            "description": "北京地区的天气预警信息",
            "mimeType": "text/plain"
        }
    ]

@server.read_resource()
async def read_resource(uri: str) -> str:
    if uri == "weather://alerts/beijing":
        return "当前无天气预警"
    raise ValueError(f"未知资源: {uri}")

# MCP 提示模板 - 预定义的提示词
@server.list_prompts()
async def list_prompts() -> list:
    return [
        {
            "name": "weather_report",
            "description": "生成天气报告",
            "arguments": [
                {"name": "city", "required": True},
                {"name": "style", "required": False}
            ]
        }
    ]

@server.get_prompt()
async def get_prompt(name: str, arguments: dict) -> str:
    if name == "weather_report":
        city = arguments["city"]
        style = arguments.get("style", "formal")
        return f"请为{city}生成一份{style}风格的天气报告"
    raise ValueError(f"未知提示: {name}")
```

## 3. A2A 协议（Agent-to-Agent）

### 3.1 A2A 简介

A2A 协议解决的是 Agent 之间的通信问题——不同框架、不同厂商构建的 Agent 如何互相发现、协商和协作。

**核心概念**：

| 概念                  | 描述                     |
| :-------------------- | :----------------------- |
| **Agent Card**        | Agent 的能力描述卡片     |
| **Task**              | Agent 间传递的工作单元   |
| **Message**           | Agent 间的通信消息       |
| **Artifact**          | 任务产生的可交付成果     |
| **Push Notification** | 长时间任务的异步通知机制 |

### 3.2 Agent Card

Agent Card 是 Agent 的"名片"，描述其能力和接口：

```python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class AgentCard:
    """Agent 能力描述卡片"""
    name: str
    description: str
    url: str                              # Agent 的服务端点
    version: str
    capabilities: dict                    # 能力声明
    skills: List[dict] = field(default_factory=list)
    authentication: Optional[dict] = None
    default_input_modes: List[str] = field(
        default_factory=lambda: ["text"]
    )
    default_output_modes: List[str] = field(
        default_factory=lambda: ["text"]
    )

# 示例：代码审查 Agent 的 Card
code_review_agent_card = AgentCard(
    name="CodeReviewAgent",
    description="自动代码审查 Agent，支持多种编程语言的代码质量分析",
    url="https://agents.example.com/code-review",
    version="2.1.0",
    capabilities={
        "streaming": True,
        "push_notifications": True,
        "state_transition_history": True
    },
    skills=[
        {
            "id": "review_pr",
            "name": "PR 代码审查",
            "description": "审查 Pull Request 中的代码变更",
            "tags": ["code-review", "pr"],
            "examples": [
                "请审查 PR #123",
                "分析这个代码变更的质量"
            ],
            "input_modes": ["text", "file"],
            "output_modes": ["text"]
        },
        {
            "id": "security_scan",
            "name": "安全扫描",
            "description": "检测代码中的安全漏洞",
            "tags": ["security", "vulnerability"],
            "examples": ["扫描这段代码的安全问题"]
        }
    ],
    authentication={
        "schemes": ["Bearer"]
    }
)
```

### 3.3 A2A 通信实现

```python
import httpx
import uuid
from datetime import datetime

@dataclass
class A2AMessage:
    """A2A 消息"""
    role: str          # "user" | "agent"
    parts: list        # 消息内容（文本、文件等）
    message_id: str = None

    def __post_init__(self):
        self.message_id = self.message_id or str(uuid.uuid4())

@dataclass
class A2ATask:
    """A2A 任务"""
    id: str
    status: dict       # {"state": "working"|"completed"|"failed", ...}
    history: list      # Message 列表
    artifacts: list    # 任务产出

class A2AClient:
    """A2A 客户端 - 向其他 Agent 发送请求"""

    def __init__(self, agent_card: AgentCard, auth_token: str = None):
        self.agent_card = agent_card
        self.auth_token = auth_token
        self.base_url = agent_card.url

    async def send_task(self, message: str,
                        session_id: str = None) -> A2ATask:
        """向远程 Agent 发送任务"""
        task_id = str(uuid.uuid4())
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/send",
            "id": str(uuid.uuid4()),
            "params": {
                "id": task_id,
                "message": {
                    "role": "user",
                    "parts": [{"type": "text", "text": message}]
                },
                "sessionId": session_id or str(uuid.uuid4())
            }
        }

        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/a2a",
                json=payload,
                headers=headers,
                timeout=60.0
            )
            response.raise_for_status()
            result = response.json()

        return self._parse_task(result.get("result", {}))

    async def get_task(self, task_id: str) -> A2ATask:
        """查询任务状态"""
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/get",
            "id": str(uuid.uuid4()),
            "params": {"id": task_id}
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/a2a",
                json=payload,
                timeout=30.0
            )
            result = response.json()

        return self._parse_task(result.get("result", {}))

    async def cancel_task(self, task_id: str) -> A2ATask:
        """取消任务"""
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/cancel",
            "id": str(uuid.uuid4()),
            "params": {"id": task_id}
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/a2a",
                json=payload,
                timeout=30.0
            )
            result = response.json()

        return self._parse_task(result.get("result", {}))

    def _parse_task(self, data: dict) -> A2ATask:
        """解析任务响应"""
        return A2ATask(
            id=data.get("id", ""),
            status=data.get("status", {"state": "unknown"}),
            history=data.get("history", []),
            artifacts=data.get("artifacts", [])
        )
```

### 3.4 A2A Server 端实现

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="A2A Agent Server")

class A2AAgentServer:
    """A2A 服务端 - 接收其他 Agent 的请求"""

    def __init__(self, agent_card: AgentCard):
        self.agent_card = agent_card
        self.tasks: dict[str, A2ATask] = {}

    async def handle_request(self, request: Request):
        """处理 A2A JSON-RPC 请求"""
        body = await request.json()
        method = body.get("method")
        params = body.get("params", {})
        req_id = body.get("id")

        handlers = {
            "tasks/send": self._handle_send,
            "tasks/get": self._handle_get,
            "tasks/cancel": self._handle_cancel,
        }

        handler = handlers.get(method)
        if not handler:
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"未知方法: {method}"}
            })

        try:
            result = await handler(params)
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": result
            })
        except Exception as e:
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32000, "message": str(e)}
            })

    async def _handle_send(self, params: dict) -> dict:
        """处理任务发送"""
        task_id = params["id"]
        message = params["message"]

        # 创建任务
        task = A2ATask(
            id=task_id,
            status={"state": "working"},
            history=[message],
            artifacts=[]
        )
        self.tasks[task_id] = task

        # 异步执行任务
        result_message = await self._process_task(message)

        task.status = {"state": "completed"}
        task.history.append(result_message)
        task.artifacts.append({
            "parts": result_message.get("parts", [])
        })

        return self._task_to_dict(task)

    async def _process_task(self, message: dict) -> dict:
        """实际处理任务逻辑"""
        user_text = ""
        for part in message.get("parts", []):
            if part.get("type") == "text":
                user_text += part.get("text", "")

        # 调用 Agent 的处理逻辑
        response = await self.agent_card._handler(user_text)

        return {
            "role": "agent",
            "parts": [{"type": "text", "text": response}]
        }

    def _task_to_dict(self, task: A2ATask) -> dict:
        return {
            "id": task.id,
            "status": task.status,
            "history": task.history,
            "artifacts": task.artifacts
        }
```

### 3.5 意图传递与结果共享

```python
class IntentBroker:
    """意图传递中间件"""

    async def negotiate(self, sender: AgentCard,
                        receiver: AgentCard,
                        intent: str) -> dict:
        """协商 Agent 间的意图传递"""
        # 1. 检查接收方是否有匹配的 Skill
        matching_skills = self._find_matching_skills(
            receiver, intent
        )

        if not matching_skills:
            return {
                "status": "rejected",
                "reason": "接收方无匹配能力"
            }

        # 2. 选择最佳 Skill
        best_skill = self._select_best_skill(matching_skills, intent)

        # 3. 构建任务请求
        task_request = {
            "target_skill": best_skill["id"],
            "intent": intent,
            "input_format": best_skill.get("input_modes", ["text"]),
            "output_format": best_skill.get("output_modes", ["text"])
        }

        return {
            "status": "accepted",
            "task_request": task_request
        }

    def _find_matching_skills(self, agent: AgentCard,
                              intent: str) -> list:
        """查找匹配的技能"""
        matches = []
        for skill in agent.skills:
            # 基于标签和示例匹配
            tags = skill.get("tags", [])
            examples = skill.get("examples", [])
            if any(tag in intent.lower() for tag in tags):
                matches.append(skill)
            elif any(ex.lower() in intent.lower() for ex in examples):
                matches.append(skill)
        return matches

    def _select_best_skill(self, skills: list, intent: str) -> dict:
        """选择最佳匹配的技能"""
        # 简单实现：返回第一个匹配
        # 生产环境可使用语义相似度排序
        return skills[0]


class ResultSharer:
    """结果共享机制"""

    async def share_result(self, task_id: str, result: dict,
                           recipients: list):
        """将任务结果共享给多个 Agent"""
        for recipient in recipients:
            client = A2AClient(recipient)
            summary = await self._summarize_result(result)
            await client.send_task(
                message=f"任务 {task_id} 的结果摘要：{summary}"
            )

    async def _summarize_result(self, result: dict) -> str:
        """摘要化结果以减少传输量"""
        # 提取关键信息，去除冗余
        artifacts = result.get("artifacts", [])
        if not artifacts:
            return "任务已完成，无产出物"

        summaries = []
        for artifact in artifacts:
            for part in artifact.get("parts", []):
                if part.get("type") == "text":
                    # 截取前 500 字符作为摘要
                    text = part.get("text", "")
                    summaries.append(text[:500])

        return "\n".join(summaries)
```

## 4. 上下文工程

上下文工程（Context Engineering）是构建高效 Agent 的关键实践——在有限的上下文窗口内，动态构建最有效的上下文。

### 4.1 动态上下文构建

```python
class ContextEngine:
    """上下文引擎 - 动态构建有效上下文"""

    def __init__(self, llm_client, max_tokens: int = 8000):
        self.llm = llm_client
        self.max_tokens = max_tokens
        self.token_counter = TokenCounter()

    async def build_context(self, query: str,
                            memory: dict,
                            tools: list,
                            system_prompt: str) -> str:
        """动态构建上下文"""
        budget = self.max_tokens
        context_parts = []

        # 1. 系统提示（固定优先级最高）
        system_tokens = self.token_counter.count(system_prompt)
        budget -= system_tokens
        context_parts.append(("system", system_prompt))

        # 2. 相关记忆（按相关性排序，截断到预算内）
        relevant_memories = await self._retrieve_relevant(
            query, memory
        )
        memory_text = self._format_memories(relevant_memories)
        memory_tokens = self.token_counter.count(memory_text)

        if memory_tokens > budget * 0.4:
            # 记忆占用过多，压缩
            memory_text = await self._compress_memories(
                memory_text, int(budget * 0.4)
            )

        budget -= self.token_counter.count(memory_text)
        context_parts.append(("memory", memory_text))

        # 3. 工具描述（按相关性筛选）
        relevant_tools = self._filter_relevant_tools(query, tools)
        tool_text = self._format_tools(relevant_tools)
        tool_tokens = self.token_counter.count(tool_text)

        if tool_tokens > budget * 0.3:
            tool_text = self._compress_tool_descriptions(
                tool_text, int(budget * 0.3)
            )

        budget -= self.token_counter.count(tool_text)
        context_parts.append(("tools", tool_text))

        # 4. 用户查询
        context_parts.append(("query", query))

        return self._assemble(context_parts)

    async def _retrieve_relevant(self, query: str,
                                 memory: dict) -> list:
        """检索与查询相关的记忆"""
        # 使用向量检索
        results = await memory.get("vector_store").search(
            query=query, top_k=10
        )
        return results

    async def _compress_memories(self, text: str,
                                 target_tokens: int) -> str:
        """压缩记忆文本到目标 token 数"""
        compress_prompt = f"""请将以下信息压缩为更简洁的形式，
保留所有关键事实，去除冗余表述。目标长度约 {target_tokens} tokens。

原始内容：
{text}"""

        compressed = await self.llm.chat(compress_prompt)
        return compressed
```

### 4.2 记忆压缩与摘要缓存

```python
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class CacheEntry:
    """摘要缓存条目"""
    key: str
    summary: str
    original_tokens: int
    summary_tokens: int
    created_at: datetime
    access_count: int = 0

class MemoryCompressor:
    """记忆压缩器"""

    def __init__(self, llm_client):
        self.llm = llm_client
        self.summary_cache: dict[str, CacheEntry] = {}

    async def compress_conversation(self, messages: list,
                                    strategy: str = "rolling") -> list:
        """压缩对话历史"""
        if strategy == "rolling":
            return await self._rolling_compress(messages)
        elif strategy == "hierarchical":
            return await self._hierarchical_compress(messages)
        else:
            return await self._sliding_window(messages)

    async def _rolling_compress(self, messages: list) -> list:
        """滚动压缩：保留最近消息，压缩早期消息"""
        if len(messages) <= 6:
            return messages

        # 保留最近 4 条消息
        recent = messages[-4:]
        # 压缩早期消息
        early = messages[:-4]

        cache_key = self._compute_cache_key(early)
        if cache_key in self.summary_cache:
            summary = self.summary_cache[cache_key].summary
        else:
            summary = await self._summarize_messages(early)
            self.summary_cache[cache_key] = CacheEntry(
                key=cache_key,
                summary=summary,
                original_tokens=self._count_tokens(early),
                summary_tokens=self._count_tokens_str(summary),
                created_at=datetime.now()
            )

        # 组合：摘要 + 最近消息
        return [
            {"role": "system", "content": f"[对话摘要] {summary}"}
        ] + recent

    async def _hierarchical_compress(self, messages: list) -> list:
        """层级压缩：多层摘要"""
        # 第一层：每 10 条消息压缩为 1 条摘要
        chunks = [messages[i:i+10] for i in range(0, len(messages), 10)]
        summaries = []

        for chunk in chunks:
            if len(chunk) <= 3:
                summaries.extend(chunk)
            else:
                summary = await self._summarize_messages(chunk)
                summaries.append({
                    "role": "system",
                    "content": f"[摘要] {summary}"
                })

        # 第二层：如果摘要仍然过多，再次压缩
        if len(summaries) > 10:
            return await self._hierarchical_compress(summaries)

        return summaries

    async def _summarize_messages(self, messages: list) -> str:
        """摘要一组消息"""
        text = "\n".join(
            [f"{m['role']}: {m['content']}" for m in messages]
        )
        prompt = f"""请简洁地总结以下对话内容，保留关键信息和决策：

{text}"""

        return await self.llm.chat(prompt)

    def _compute_cache_key(self, messages: list) -> str:
        """计算缓存键"""
        import hashlib
        content = "|".join(
            [f"{m['role']}:{m['content'][:100]}" for m in messages]
        )
        return hashlib.md5(content.encode()).hexdigest()
```

### 4.3 上下文窗口管理策略

| 策略           | 描述                       | 优点             | 缺点             |
| :------------- | :------------------------- | :--------------- | :--------------- |
| **滑动窗口**   | 保留最近 N 条消息          | 简单高效         | 丢失早期上下文   |
| **滚动压缩**   | 压缩早期消息，保留近期     | 平衡完整性和效率 | 压缩可能丢失细节 |
| **层级摘要**   | 多层递归压缩               | 保留全局视图     | 实现复杂         |
| **相关性检索** | 只检索与当前查询相关的内容 | 精准高效         | 依赖检索质量     |
| **混合策略**   | 结合以上多种方法           | 最灵活           | 需要调参         |

## 5. 工具调用格式

### 5.1 Function Calling Schema

Function Calling 是 LLM 调用工具的标准接口，各厂商实现略有差异但核心一致：

```python
# OpenAI Function Calling 格式
openai_tools = [
    {
        "type": "function",
        "function": {
            "name": "search_database",
            "description": "在数据库中搜索符合条件的记录",
            "parameters": {
                "type": "object",
                "properties": {
                    "table": {
                        "type": "string",
                        "description": "表名",
                        "enum": ["users", "orders", "products"]
                    },
                    "conditions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "field": {"type": "string"},
                                "operator": {
                                    "type": "string",
                                    "enum": ["=", ">", "<", "LIKE", "IN"]
                                },
                                "value": {}
                            },
                            "required": ["field", "operator", "value"]
                        },
                        "description": "查询条件列表"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回记录数上限",
                        "default": 10
                    }
                },
                "required": ["table", "conditions"]
            },
            "strict": True  # 启用严格模式
        }
    }
]

# 调用示例
from openai import OpenAI
client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "查找最近7天金额大于1000的订单"}
    ],
    tools=openai_tools,
    tool_choice="auto"  # auto | required | none | {"type": "function", "function": {"name": "..."}}
)

# 处理工具调用
if response.choices[0].message.tool_calls:
    for tool_call in response.choices[0].message.tool_calls:
        function_name = tool_call.function.name
        function_args = json.loads(tool_call.function.arguments)
        print(f"调用: {function_name}({function_args})")
```

### 5.2 工具描述最佳实践

```python
class ToolSchemaBuilder:
    """工具 Schema 构建器"""

    @staticmethod
    def build(name: str, description: str,
              parameters: dict, examples: list = None) -> dict:
        """构建标准化的工具描述 Schema"""
        schema = {
            "type": "function",
            "function": {
                "name": name,
                "description": description,
                "parameters": {
                    "type": "object",
                    "properties": parameters,
                    "required": [
                        k for k, v in parameters.items()
                        if v.get("required", False)
                    ],
                    "additionalProperties": False
                }
            }
        }

        if examples:
            schema["function"]["description"] += (
                f"\n\n示例：\n" +
                "\n".join([f"- {ex}" for ex in examples])
            )

        return schema

# 使用示例
search_tool = ToolSchemaBuilder.build(
    name="web_search",
    description="搜索互联网获取信息。当需要查找最新数据、事实或新闻时使用。",
    parameters={
        "query": {
            "type": "string",
            "description": "搜索关键词，应简洁明确",
            "required": True
        },
        "num_results": {
            "type": "integer",
            "description": "返回结果数量，默认5",
            "default": 5,
            "required": False
        },
        "date_range": {
            "type": "string",
            "description": "时间范围过滤：day/week/month/year",
            "enum": ["day", "week", "month", "year"],
            "required": False
        }
    },
    examples=[
        "搜索最新的Python 3.13新特性",
        "查找2026年世界杯赛程"
    ]
)
```

### 5.3 工具描述设计原则

| 原则           | 描述                       | 反例                              |
| :------------- | :------------------------- | :-------------------------------- |
| **描述具体**   | 说明工具何时用、做什么     | "搜索" → "搜索互联网获取最新信息" |
| **参数明确**   | 类型、范围、默认值都写清楚 | 缺少 enum 和 default              |
| **包含示例**   | 提供典型使用场景           | 无示例，LLM 可能误用              |
| **避免歧义**   | 名称和描述不应有歧义       | "get" → "get_user_profile"        |
| **声明副作用** | 标注是否修改数据           | 未标注写入操作                    |

## 6. MCP 与 A2A 协同

### 6.1 协议组合架构

```
┌──────────────────────────────────────────────────────┐
│              MCP + A2A 协同架构                       │
│                                                      │
│  ┌──────────────┐   A2A    ┌──────────────┐         │
│  │  协调 Agent   │←───────→│  研究 Agent   │         │
│  │  (Orchestrator)│        │  (Researcher) │         │
│  └──────┬───────┘          └──────┬───────┘         │
│         │ MCP                      │ MCP             │
│    ┌────┴────┐               ┌─────┴─────┐          │
│    │ 文件系统 │               │ 搜索引擎  │          │
│    │ 数据库   │               │ 论文库    │          │
│    └─────────┘               └───────────┘          │
│                                                      │
│  协调 Agent 通过 A2A 委派任务给研究 Agent              │
│  各 Agent 通过 MCP 访问各自的工具和数据源              │
└──────────────────────────────────────────────────────┘
```

### 6.2 协同实现

```python
class MCPA2AOrchestrator:
    """MCP + A2A 协同编排器"""

    def __init__(self, mcp_client: MCPClient):
        self.mcp = mcp_client
        self.a2a_clients: dict[str, A2AClient] = {}

    async def register_agent(self, agent_card: AgentCard,
                             auth_token: str = None):
        """注册远程 Agent"""
        client = A2AClient(agent_card, auth_token)
        self.a2a_clients[agent_card.name] = client

    async def execute_complex_task(self, task: str) -> dict:
        """执行需要多 Agent + 多工具的复杂任务"""
        # 1. 通过 MCP 获取可用工具
        mcp_tools = await self.mcp.get_all_tools()

        # 2. 分析任务，决定分配策略
        plan = await self._plan_task(task, mcp_tools)

        results = {}
        for step in plan:
            if step["type"] == "mcp_tool":
                # 使用 MCP 工具
                result = await self.mcp.call_tool(
                    server_name=step["server"],
                    tool_name=step["tool"],
                    arguments=step["args"]
                )
            elif step["type"] == "a2a_delegate":
                # 委派给其他 Agent
                client = self.a2a_clients[step["agent"]]
                task_result = await client.send_task(step["message"])
                result = task_result

            results[step["id"]] = result

        return results

    async def _plan_task(self, task: str, tools: list) -> list:
        """规划任务分配"""
        agent_descriptions = "\n".join([
            f"- {name}: {client.agent_card.description}"
            for name, client in self.a2a_clients.items()
        ])
        tool_descriptions = "\n".join([
            f"- [{t['server']}] {t['tool'].name}: {t['tool'].description}"
            for t in tools
        ])

        prompt = f"""请将以下任务分解为步骤，每步指定使用 MCP 工具还是委派给 Agent。

任务：{task}

可用 Agent：
{agent_descriptions}

可用 MCP 工具：
{tool_descriptions}

返回 JSON 格式的步骤列表。"""

        response = await self.llm.chat(prompt)
        return self._parse_plan(response)
```

## 7. 小结

| 协议/技术       | 核心价值                   | 适用场景                |
| :-------------- | :------------------------- | :---------------------- |
| **MCP**         | 标准化 Agent 与工具的交互  | 工具集成、数据访问      |
| **A2A**         | 标准化 Agent 间的通信      | 多 Agent 协作、任务委派 |
| **上下文工程**  | 最大化利用有限的上下文窗口 | 长对话、复杂任务        |
| **工具 Schema** | 规范化工具描述和调用       | Function Calling、MCP   |
