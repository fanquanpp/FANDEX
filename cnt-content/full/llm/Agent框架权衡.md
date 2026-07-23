---
title: Agent框架权衡
description: '深入分析不同 Agent 框架的设计权衡，选择适合你场景的框架'
module: llm
difficulty: advanced
tags:
  - agent
  - framework
  - LangChain
  - CrewAI
  - AutoGen
  - 框架对比
related:
  - llm/原生稀疏注意力
  - llm/指令微调SFT
  - 'llm/Constitutional-AI与自我改进'
  - 'llm/DeepSeek-V3架构详解'
prerequisites:
  - llm/安全护栏
---

# Agent框架权衡

> Agent 框架让你快速构建多步骤、多工具的 LLM 应用。但每个框架都有自己的权衡——灵活性 vs 简单性，控制力 vs 便捷性。选择错误的框架比不用框架更糟糕。

**类型：** 概念
**前置条件：** Phase 11 Lesson 09（函数调用）
**预计时间：** ~45 分钟

## 学习目标

- 理解 Agent 框架的核心设计维度
- 对比主流框架：LangChain、CrewAI、AutoGen、LangGraph
- 分析何时使用框架、何时自己构建
- 理解 Agent 的可控性和可靠性权衡

## 框架对比

| 框架      | 核心理念      | 灵活性 | 学习曲线 | 适用场景      |
| --------- | ------------- | ------ | -------- | ------------- |
| LangChain | 链式组合      | 中     | 中       | 通用 LLM 应用 |
| LangGraph | 状态机        | 高     | 高       | 复杂工作流    |
| CrewAI    | 多 Agent 协作 | 中     | 低       | 团队协作场景  |
| AutoGen   | 多 Agent 对话 | 高     | 中       | 研究/探索     |
| 自建      | 自定义        | 最高   | N/A      | 生产级应用    |

## 设计维度

### 1. 控制流：硬编码 vs LLM 决策

```
硬编码（LangGraph）:
  Step 1 → Step 2 → Step 3（固定流程）

LLM 决策（ReAct Agent）:
  Step 1 → LLM 决定下一步 → ???（不可预测）
```

**权衡：** 硬编码可控但不够灵活；LLM 决策灵活但不可预测。生产应用应优先选择硬编码，仅在必要时让 LLM 做决策。

### 2. 状态管理：隐式 vs 显式

```python
# 隐式状态（LangChain Agent）
# 状态隐藏在 Agent 内部，难以检查和调试
agent = initialize_agent(tools, llm, agent="zero-shot-react")
result = agent.run("查询天气并预订餐厅")

# 显式状态（LangGraph）
# 状态明确定义，可检查、可恢复
class State(TypedDict):
    weather: str
    restaurant: str
    booking_confirmed: bool
```

### 3. 错误处理：静默 vs 显式

| 框架            | 工具调用失败时 | 风险           |
| --------------- | -------------- | -------------- |
| LangChain ReAct | LLM 尝试恢复   | 可能陷入循环   |
| LangGraph       | 节点抛出异常   | 需要显式处理   |
| CrewAI          | Agent 重试     | 可能浪费 token |

## 何时使用框架

**使用框架的场景：**

- 原型验证，快速迭代
- 标准化工作流（RAG、ReAct）
- 不需要深度定制

**自建的场景：**

- 生产级应用，需要完全控制
- 性能敏感，框架开销不可接受
- 需要自定义的错误处理和监控
- 框架的抽象与你的需求不匹配

## 自建最小 Agent

```python
class MinimalAgent:
    """最小化 Agent 实现"""

    def __init__(self, llm_fn, tools, max_iterations=10):
        self.llm_fn = llm_fn
        self.tools = {t['name']: t for t in tools}
        self.max_iterations = max_iterations

    def run(self, user_message):
        """运行 Agent"""
        messages = [
            {"role": "system", "content": self._build_system_prompt()},
            {"role": "user", "content": user_message},
        ]

        for _ in range(self.max_iterations):
            response = self.llm_fn(messages)

            # 检查是否有工具调用
            tool_calls = self._extract_tool_calls(response)

            if not tool_calls:
                return response  # 最终回答

            # 执行工具调用
            messages.append({"role": "assistant", "content": response})
            for call in tool_calls:
                result = self._execute_tool(call)
                messages.append({
                    "role": "tool",
                    "content": result,
                })

        return "达到最大迭代次数"

    def _build_system_prompt(self):
        tool_descriptions = "\n".join(
            f"- {t['name']}: {t['description']}"
            for t in self.tools.values()
        )
        return f"你是一个助手，可以使用以下工具：\n{tool_descriptions}"

    def _execute_tool(self, call):
        tool = self.tools.get(call['name'])
        if tool:
            return tool['execute'](**call['arguments'])
        return f"未知工具: {call['name']}"
```

## 关键术语

| 术语     | 通俗说法   | 实际含义                                  |
| -------- | ---------- | ----------------------------------------- |
| Agent    | "智能体"   | 能够自主决策、使用工具完成任务的 LLM 系统 |
| 控制流   | "流程控制" | 决定 Agent 执行步骤顺序的机制             |
| 状态管理 | "记忆管理" | 管理工作流中共享数据的方式                |
| 框架开销 | "额外成本" | 使用框架带来的性能和复杂度代价            |

## 延伸阅读

- [LangChain 文档](https://python.langchain.com/) -- LangChain 官方文档
- [CrewAI 文档](https://docs.crewai.com/) -- CrewAI 官方文档
- [AutoGen 文档](https://microsoft.github.io/autogen/) -- Microsoft AutoGen 文档
- [LangGraph 文档](https://langchain-ai.github.io/langgraph/) -- LangGraph 官方文档
