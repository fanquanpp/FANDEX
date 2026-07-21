---
title: 函数调用
description: '理解 LLM 函数调用机制，让模型与外部工具和 API 交互'
module: llm
difficulty: intermediate
tags:
  - 'function calling'
  - 'tool use'
  - 'JSON Schema'
  - MCP
  - 工具调用
related:
  - llm/构建分词器
  - llm/构建完整LLM流水线
  - llm/缓存与成本
  - llm/结构化输出
prerequisites:
  - llm/安全护栏
---

# 函数调用

> LLM 只能生成文本。但你的应用需要调用 API、查询数据库、执行计算。函数调用让模型输出结构化的工具调用请求，你的代码执行后把结果返回给模型——模型因此可以"使用工具"。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 01（提示工程）
**预计时间：** ~60 分钟

## 学习目标

- 理解函数调用的完整循环：定义工具 → 模型选择 → 执行 → 返回结果
- 掌握 JSON Schema 工具定义
- 实现并行函数调用和错误处理
- 理解 MCP（Model Context Protocol）协议

## 函数调用循环

```
1. 用户提问
2. 模型决定需要调用工具 → 输出工具调用请求
3. 应用执行工具 → 获取结果
4. 将结果返回给模型
5. 模型基于结果生成最终回答
```

## 工具定义

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的当前天气",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称",
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "温度单位",
                    },
                },
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "搜索互联网获取信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索查询",
                    },
                },
                "required": ["query"],
            },
        },
    },
]
```

## 完整函数调用实现

```python
import json
from openai import OpenAI

client = OpenAI()


def execute_tool(tool_name, arguments):
    """执行工具调用"""
    if tool_name == "get_weather":
        return get_weather(arguments["city"], arguments.get("unit", "celsius"))
    elif tool_name == "search_web":
        return search_web(arguments["query"])
    else:
        return f"未知工具: {tool_name}"


def get_weather(city, unit="celsius"):
    """获取天气（模拟）"""
    weather_data = {
        "北京": {"temp": 22, "condition": "晴"},
        "上海": {"temp": 25, "condition": "多云"},
        "深圳": {"temp": 30, "condition": "阵雨"},
    }
    data = weather_data.get(city, {"temp": 20, "condition": "未知"})
    if unit == "fahrenheit":
        data["temp"] = data["temp"] * 9/5 + 32
    return json.dumps(data)


def chat_with_tools(user_message, max_rounds=5):
    """带工具调用的对话"""
    messages = [{"role": "user", "content": user_message}]

    for _ in range(max_rounds):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
        )

        choice = response.choices[0]

        # 如果没有工具调用，返回最终回答
        if choice.finish_reason != "tool_calls":
            return choice.message.content

        # 处理工具调用
        messages.append(choice.message)

        for tool_call in choice.message.tool_calls:
            tool_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            # 执行工具
            result = execute_tool(tool_name, arguments)

            # 将结果返回给模型
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

    return "达到最大轮数限制"


# 使用
result = chat_with_tools("北京和上海今天天气怎么样？")
```

## 并行函数调用

模型可以在一次响应中调用多个工具：

```python
# GPT-4o 支持并行函数调用
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "北京和上海哪个更热？"}],
    tools=tools,
)

# response.choices[0].message.tool_calls 可能包含多个调用
for tool_call in response.choices[0].message.tool_calls:
    print(f"调用: {tool_call.function.name}({tool_call.function.arguments})")
```

## 安全规则

1. **永远不要让模型直接执行代码**——模型输出的是请求，你的代码决定是否执行
2. **验证所有参数**——检查类型、范围和权限
3. **限制工具权限**——只暴露必要的工具
4. **记录所有调用**——用于审计和调试
5. **设置超时**——工具调用不应无限等待

## MCP（Model Context Protocol）

MCP 是 Anthropic 提出的标准化工具协议：

```python
# MCP 定义工具的标准格式
mcp_tool = {
    "name": "database_query",
    "description": "执行 SQL 查询",
    "inputSchema": {
        "type": "object",
        "properties": {
            "sql": {"type": "string", "description": "SQL 查询语句"},
        },
        "required": ["sql"],
    },
}
```

MCP 的优势：统一的工具定义格式，跨模型和跨平台兼容。

## 关键术语

| 术语        | 通俗说法       | 实际含义                                           |
| ----------- | -------------- | -------------------------------------------------- |
| 函数调用    | "让模型用工具" | 模型输出结构化的工具调用请求，由应用执行后返回结果 |
| JSON Schema | "参数模板"     | 定义工具参数的类型和约束的规范                     |
| 并行调用    | "同时调多个"   | 模型在一次响应中请求调用多个工具                   |
| MCP         | "工具协议"     | Model Context Protocol，标准化的工具定义和通信协议 |

## 延伸阅读

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) -- OpenAI 函数调用文档
- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) -- Anthropic 工具使用文档
- [MCP 规范](https://modelcontextprotocol.io/) -- Model Context Protocol 官方文档
