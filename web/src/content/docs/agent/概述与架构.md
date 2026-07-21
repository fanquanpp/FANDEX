---
order: 1
title: 'AI Agent 概述与架构'
module: agent
category: 'AI Agent'
difficulty: beginner
description: 'AI Agent 概念、发展历程、与 LLM 的关系、Agent 架构模式及应用场景。'
author: fanquanpp
updated: '2026-06-14'
related:
  - agent/LLM基础
  - agent/Agent框架
  - python/语法速查
  - llm/安全护栏
prerequisites: []
---

## 1. AI Agent 概念

AI Agent（人工智能代理）是一种能够**自主感知环境、做出决策并执行动作**以实现特定目标的智能系统。与传统的 LLM 聊天机器人不同，Agent 具备自主性、反应性、主动性和社交性等核心特征。

### 1.1 Agent 的核心特征

| 特征       | 描述                     | 示例                      |
| :--------- | :----------------------- | :------------------------ |
| **自主性** | 无需人类持续干预即可运行 | 自动完成代码审查并提交 PR |
| **反应性** | 感知环境变化并及时响应   | 检测到错误后自动修复      |
| **主动性** | 主动采取行动以实现目标   | 主动搜索文档解决技术问题  |
| **社交性** | 与其他 Agent 或人类协作  | 多 Agent 协作完成复杂项目 |

### 1.2 Agent 与 LLM 的关系

LLM（大语言模型）是 Agent 的**大脑**，但 Agent 远不止 LLM：

```
┌─────────────────────────────────────┐
│            AI Agent                 │
│  ┌───────────────────────────────┐  │
│  │         LLM (大脑)            │  │
│  │   推理 / 规划 / 决策          │  │
│  └───────────────────────────────┘  │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ 记忆系统 │  │   工具集         │ │
│  │ 短期/长期│  │ 搜索/代码/API    │ │
│  └──────────┘  └──────────────────┘ │
│  ┌───────────────────────────────┐  │
│  │        规划模块               │  │
│  │   任务分解 / 反思 / 改进     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

- **LLM**：提供语言理解和推理能力
- **Agent**：在 LLM 基础上增加感知、行动、记忆和规划能力
- **关系**：LLM ⊂ Agent，Agent = LLM + 工具 + 记忆 + 规划

### 1.3 发展历程

| 阶段               | 时间        | 代表工作                 | 特点                   |
| :----------------- | :---------- | :----------------------- | :--------------------- |
| **符号 Agent**     | 1950s-1980s | 专家系统、SHRDLU         | 基于规则，知识工程     |
| **反应式 Agent**   | 1990s       | Subsumption Architecture | 无内部模型，直接映射   |
| **混合 Agent**     | 2000s       | BDI 架构                 | 结合符号与反应式       |
| **深度学习 Agent** | 2015s       | DQN、AlphaGo             | 端到端学习策略         |
| **LLM Agent**      | 2023-       | AutoGPT、BabyAGI         | 基于大模型的通用 Agent |

## 2. Agent 架构模式

### 2.1 ReAct（推理+行动）

ReAct 是最经典的 Agent 架构，将**推理（Reasoning）**和**行动（Acting）**交织进行：

```python
# ReAct 模式示例
from langchain.agents import create_react_agent

prompt_template = """
你是一个智能助手，请按照以下格式回答问题：

Question: 输入的问题
Thought: 你思考该做什么
Action: 要使用的工具名称
Action Input: 工具的输入参数
Observation: 工具执行的结果
... (Thought/Action/Action Input/Observation 可以重复)
Thought: 我现在知道最终答案了
Final Answer: 最终答案
"""

agent = create_react_agent(llm, tools, prompt_template)
result = agent.invoke({"input": "北京今天的天气如何？"})
```

**ReAct 工作流程**：

```
用户输入 → Thought → Action → Observation → Thought → ... → Final Answer
```

**优点**：可解释性强、推理过程透明
**缺点**：可能陷入循环、token 消耗较多

### 2.2 Plan-and-Execute（规划与执行）

将任务先**整体规划**，再逐步**执行**：

```python
# Plan-and-Execute 模式示例
from langgraph.prebuilt import create_react_agent
from langchain_core.prompts import ChatPromptTemplate

planner_prompt = ChatPromptTemplate.from_messages([
    ("system", """你是一个任务规划专家。给定一个目标，请制定详细的执行计划。
    每个步骤应该是具体、可执行的。输出格式：
    1. 步骤一
    2. 步骤二
    ..."""),
    ("human", "{objective}")
])

# 规划阶段
plan = planner.invoke({"objective": "开发一个REST API服务"})

# 执行阶段
for step in plan.steps:
    result = executor.invoke({"task": step})
    # 根据执行结果可能重新规划
    if result.needs_replan:
        plan = replanner.invoke({"original_plan": plan, "feedback": result})
```

**优点**：全局视角、适合复杂任务
**缺点**：规划可能不准确、需要重新规划机制

### 2.3 Reflexion（反思）

在执行后进行**自我反思**，从失败中学习：

```python
# Reflexion 模式示例
class ReflexionAgent:
    def __init__(self, llm, max_attempts=3):
        self.llm = llm
        self.max_attempts = max_attempts
        self.memory = []  # 存储反思结果

    def execute(self, task):
        for attempt in range(self.max_attempts):
            # 生成行动
            action = self.generate_action(task, self.memory)
            # 执行并获取结果
            result = self.execute_action(action)
            # 评估结果
            if self.is_successful(result):
                return result
            # 反思失败原因
            reflection = self.reflect(task, action, result)
            self.memory.append(reflection)

    def reflect(self, task, action, result):
        prompt = f"""
        任务: {task}
        执行的行动: {action}
        结果: {result}
        请反思为什么失败了，以及下次应该如何改进。
        """
        return self.llm.invoke(prompt)
```

**优点**：自我改进、从错误中学习
**缺点**：需要多次尝试、成本较高

### 2.4 Multi-Agent（多智能体）

多个 Agent 协作完成复杂任务，详见[多Agent系统](./多Agent系统.md)。

## 3. Agent 核心组件

### 3.1 通用 Agent 架构

```
┌─────────────────────────────────────────────┐
│                  Agent                       │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌────────────┐  │
│  │ 感知模块 │  │ 决策模块 │  │  行动模块   │  │
│  │Perception│→│Decision │→│   Action    │  │
│  └─────────┘  └─────────┘  └────────────┘  │
│       ↑            ↑              │         │
│       │       ┌────┴────┐        │         │
│       │       │  记忆    │        │         │
│       │       │ Memory  │←───────┘         │
│       │       └─────────┘                   │
│       │            ↑                        │
│       │       ┌────┴────┐                   │
│       │       │  规划    │                   │
│       │       │Planning │                   │
│       │       └─────────┘                   │
└─────────────────────────────────────────────┘
```

### 3.2 组件说明

| 组件     | 职责                   | 实现方式               |
| :------- | :--------------------- | :--------------------- |
| **感知** | 接收用户输入、环境状态 | LLM 输入处理、API 调用 |
| **决策** | 选择下一步行动         | LLM 推理、规则引擎     |
| **行动** | 执行具体操作           | 工具调用、代码执行     |
| **记忆** | 存储历史信息           | 向量数据库、对话历史   |
| **规划** | 制定执行策略           | 任务分解、子目标生成   |

## 4. 应用场景

### 4.1 个人效率

- **编程助手**：代码生成、调试、代码审查
- **写作助手**：内容创作、翻译、摘要
- **研究助手**：文献检索、数据分析、报告生成

### 4.2 企业应用

- **客服 Agent**：智能问答、工单处理、用户引导
- **数据分析 Agent**：自动生成报表、异常检测、趋势分析
- **运维 Agent**：监控告警、故障排查、自动修复

### 4.3 自动化工作流

- **文档处理**：合同审查、信息提取、格式转换
- **项目管理**：任务分配、进度跟踪、风险预警
- **测试自动化**：测试用例生成、执行、结果分析

### 4.4 典型 Agent 产品

| 产品       | 类型             | 特点                     |
| :--------- | :--------------- | :----------------------- |
| **Cursor** | 编程 Agent       | IDE 集成、代码生成与编辑 |
| **Devin**  | 软件工程师 Agent | 全栈开发、自主调试       |
| **Manus**  | 通用 Agent       | 多任务处理、工具集成     |
| **Coze**   | Agent 平台       | 低代码构建、插件生态     |
| **Dify**   | Agent 开发平台   | 可视化编排、RAG 集成     |

## 5. Agent 开发入门

### 5.1 最简 Agent 实现

```python
import json
from openai import OpenAI

client = OpenAI()

# 定义工具
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名称"}
                },
                "required": ["city"]
            }
        }
    }
]

def agent_loop(user_message):
    messages = [{"role": "user", "content": user_message}]

    while True:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools
        )
        msg = response.choices[0].message
        messages.append(msg)

        # 如果没有工具调用，返回最终回答
        if not msg.tool_calls:
            return msg.content

        # 执行工具调用
        for tool_call in msg.tool_calls:
            func_name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)

            # 执行对应函数
            if func_name == "get_weather":
                result = get_weather(args["city"])

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": str(result)
            })

# 运行 Agent
answer = agent_loop("北京今天适合出门吗？")
print(answer)
```

### 5.2 Agent 设计原则

1. **明确目标**：清晰定义 Agent 的职责边界
2. **工具精简**：只提供必要的工具，避免选择困难
3. **错误处理**：设计重试和回退机制
4. **可观测性**：记录 Agent 的推理和行动过程
5. **安全边界**：限制 Agent 的权限和操作范围

## 6. 学习路线

```
入门 → LLM 基础 → Prompt Engineering → Function Calling
  → Agent 框架 → 工具集成 → 记忆与规划 → 多 Agent 系统
  → 评估与安全 → 实战项目
```

### 推荐学习顺序

1. 理解 LLM 基础和 Prompt Engineering
2. 掌握 Function Calling 和工具使用
3. 学习 Agent 框架（LangChain / CrewAI）
4. 实现记忆和规划模块
5. 构建多 Agent 协作系统
6. 关注评估和安全问题
7. 完成实战项目

## 7. 小结

AI Agent 是 LLM 能力的延伸和增强，通过添加工具、记忆和规划能力，使 LLM 从被动应答转变为主动执行。理解 Agent 的核心架构模式（ReAct / Plan-and-Execute / Reflexion / Multi-Agent）是构建有效 Agent 系统的基础。在实际开发中，需要根据任务复杂度选择合适的架构模式，并关注可观测性、安全性和成本控制。
