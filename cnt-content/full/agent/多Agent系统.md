---
order: 6
title: '多 Agent 系统'
module: agent
category: 'AI Agent'
difficulty: advanced
description: 'Multi-Agent 协作模式、角色分配、通信机制、层级式/扁平式架构与实战。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'agent/工具使用与Function Calling'
  - agent/记忆与规划
  - agent/Agent评估与安全
  - agent/实战项目
prerequisites: []
---

## 1. 多 Agent 系统概述

多 Agent 系统（Multi-Agent System, MAS）由多个协作的 Agent 组成，每个 Agent 扮演不同角色，通过协作完成单个 Agent 难以处理的复杂任务。

### 1.1 为什么需要多 Agent

| 挑战         | 单 Agent         | 多 Agent                |
| :----------- | :--------------- | :---------------------- |
| **复杂任务** | 容易迷失方向     | 分工明确、专注子任务    |
| **专业能力** | 难以兼顾多个领域 | 每个 Agent 专精一个领域 |
| **错误传播** | 错误累积         | Agent 间互相检查        |
| **可扩展性** | Prompt 越来越长  | 新增 Agent 即可扩展     |
| **并行性**   | 串行执行         | 可并行处理              |

### 1.2 核心概念

| 概念                      | 描述                    |
| :------------------------ | :---------------------- |
| **角色（Role）**          | Agent 的身份和职责定义  |
| **任务（Task）**          | 需要完成的具体工作      |
| **通信（Communication）** | Agent 间的信息交换方式  |
| **协调（Coordination）**  | 控制 Agent 间的协作流程 |
| **共识（Consensus）**     | 多 Agent 达成一致意见   |

## 2. 协作模式

### 2.1 协作模式分类

```
┌─────────────────────────────────────────────┐
│            多 Agent 协作模式                  │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ 顺序协作  │ │ 并行协作  │ │  辩论/投票   │ │
│  │ Pipeline │ │ Parallel │ │ Debate/Vote  │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ 层级协作  │ │ 群聊协作  │ │  混合模式    │ │
│  │Hierarchy │ │ GroupChat│ │   Hybrid     │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└─────────────────────────────────────────────┘
```

### 2.2 顺序协作（Pipeline）

```python
# 顺序协作：研究 → 分析 → 写作
from crewai import Agent, Task, Crew, Process

researcher = Agent(
    role='研究员',
    goal='收集和分析数据',
    backstory='你是一位数据研究专家',
    allow_delegation=False
)

analyst = Agent(
    role='分析师',
    goal='深入分析数据并提取洞察',
    backstory='你是一位资深数据分析师',
    allow_delegation=False
)

writer = Agent(
    role='作家',
    goal='将分析结果写成报告',
    backstory='你是一位技术写作专家',
    allow_delegation=False
)

research_task = Task(description='研究AI市场趋势', agent=researcher)
analysis_task = Task(description='分析研究数据', agent=analyst)
writing_task = Task(description='撰写分析报告', agent=writer)

crew = Crew(
    agents=[researcher, analyst, writer],
    tasks=[research_task, analysis_task, writing_task],
    process=Process.sequential
)

result = crew.kickoff()
```

### 2.3 辩论与投票

```python
# 辩论模式：多个 Agent 提出方案，投票选择最优
class DebateSystem:
    def __init__(self, llm, num_debaters=3, max_rounds=3):
        self.llm = llm
        self.num_debaters = num_debaters
        self.max_rounds = max_rounds

    def debate(self, topic: str) -> str:
        proposals = []

        # 阶段1：每个 Agent 提出方案
        for i in range(self.num_debaters):
            prompt = f"""你是专家 {i+1}，请针对以下问题提出你的方案。
要求提出与别人不同的独特视角。

问题: {topic}

你的方案:"""
            proposal = self.llm.invoke(prompt)
            proposals.append(proposal)

        # 阶段2：辩论轮次
        for round_num in range(self.max_rounds):
            critiques = []
            for i, proposal in enumerate(proposals):
                other_proposals = [p for j, p in enumerate(proposals) if j != i]
                critique_prompt = f"""你的方案: {proposal}

其他专家的方案:
{chr(10).join(other_proposals)}

请反驳其他方案的问题，并改进自己的方案。"""
                critique = self.llm.invoke(critique_prompt)
                critiques.append(critique)
            proposals = critiques

        # 阶段3：投票
        vote_prompt = f"""以下是 {self.num_debaters} 个方案经过 {self.max_rounds} 轮辩论后的结果：

{chr(10).join(f'方案{i+1}: {p}' for i, p in enumerate(proposals))}

请作为裁判，评估每个方案并选择最优方案，说明理由。"""
        return self.llm.invoke(vote_prompt)
```

## 3. 架构模式

### 3.1 层级式架构

```
        ┌──────────┐
        │  Manager │  ← 决策、分配、审核
        └────┬─────┘
       ┌─────┼─────┐
       ↓     ↓     ↓
   ┌──────┐┌──────┐┌──────┐
   │Agent1││Agent2││Agent3│  ← 执行具体任务
   └──────┘└──────┘└──────┘
```

```python
# 层级式架构（CrewAI）
from crewai import Agent, Task, Crew, Process

manager = Agent(
    role='项目经理',
    goal='协调团队完成项目',
    backstory='你是一位经验丰富的项目经理',
    allow_delegation=True,
    verbose=True
)

developer = Agent(
    role='开发者',
    goal='编写高质量代码',
    backstory='你是一位全栈开发者',
    allow_delegation=False
)

tester = Agent(
    role='测试工程师',
    goal='确保代码质量',
    backstory='你是一位测试专家',
    allow_delegation=False
)

crew = Crew(
    agents=[manager, developer, tester],
    tasks=[...],
    process=Process.hierarchical,
    manager_llm="gpt-4o"  # Manager 使用的模型
)
```

### 3.2 扁平式架构

```
┌──────┐    ┌──────┐    ┌──────┐
│Agent1│ ←→ │Agent2│ ←→ │Agent3│
└──────┘    └──────┘    └──────┘
     ↑           ↑           ↑
     └───────────┴───────────┘
           共享消息板
```

```python
# 扁平式架构（AutoGen 群聊）
import autogen

config_list = [{"model": "gpt-4o", "api_key": "your-key"}]
llm_config = {"config_list": config_list}

agent_a = autogen.AssistantAgent(
    name="产品经理",
    system_message="你负责需求分析和产品规划",
    llm_config=llm_config
)

agent_b = autogen.AssistantAgent(
    name="架构师",
    system_message="你负责技术架构设计",
    llm_config=llm_config
)

agent_c = autogen.AssistantAgent(
    name="开发者",
    system_message="你负责代码实现",
    llm_config=llm_config
)

user_proxy = autogen.UserProxyAgent(
    name="User",
    human_input_mode="NEVER",
    code_execution_config={"use_docker": False}
)

groupchat = autogen.GroupChat(
    agents=[user_proxy, agent_a, agent_b, agent_c],
    messages=[],
    max_round=15,
    speaker_selection_method="round_robin"  # 轮流发言
)

manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)

user_proxy.initiate_chat(manager, message="设计一个在线协作白板应用")
```

## 4. 通信机制

### 4.1 通信方式对比

| 方式         | 描述               | 优点       | 缺点         |
| :----------- | :----------------- | :--------- | :----------- |
| **直接消息** | Agent 间点对点通信 | 高效、私密 | 需要知道对方 |
| **消息板**   | 共享的消息空间     | 解耦、灵活 | 信息过载     |
| **事件驱动** | 发布/订阅模式      | 松耦合     | 调试困难     |
| **共享状态** | 读写共享变量       | 简单直接   | 并发问题     |

### 4.2 消息协议设计

```python
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

class MessageType(Enum):
    TASK_ASSIGN = "task_assign"
    TASK_RESULT = "task_result"
    QUESTION = "question"
    ANSWER = "answer"
    FEEDBACK = "feedback"
    BROADCAST = "broadcast"

@dataclass
class AgentMessage:
    sender: str
    receiver: str  # "all" 表示广播
    msg_type: MessageType
    content: str
    metadata: dict = None
    timestamp: str = None

    def __post_init__(self):
        self.timestamp = self.timestamp or datetime.now().isoformat()

class MessageBus:
    """消息总线"""
    def __init__(self):
        self.queues = {}  # agent_name → message queue
        self.history = []

    def register(self, agent_name: str):
        self.queues[agent_name] = []

    def send(self, message: AgentMessage):
        self.history.append(message)
        if message.receiver == "all":
            for name, queue in self.queues.items():
                if name != message.sender:
                    queue.append(message)
        elif message.receiver in self.queues:
            self.queues[message.receiver].append(message)

    def receive(self, agent_name: str) -> list:
        messages = self.queues.get(agent_name, [])
        self.queues[agent_name] = []
        return messages
```

## 5. AutoGen 多 Agent 实战

### 5.1 软件开发团队

```python
import autogen

config_list = [{"model": "gpt-4o", "api_key": "your-key"}]
llm_config = {"config_list": config_list, "temperature": 0}

# 产品经理
pm = autogen.AssistantAgent(
    name="Product_Manager",
    system_message="""作为产品经理，你需要：
1. 分析用户需求
2. 编写用户故事和验收标准
3. 确保产品方向正确
当需求明确后，请将任务交给架构师。""",
    llm_config=llm_config
)

# 架构师
architect = autogen.AssistantAgent(
    name="Architect",
    system_message="""作为技术架构师，你需要：
1. 设计系统架构
2. 选择技术栈
3. 定义模块接口
架构设计完成后，请将任务交给开发者。""",
    llm_config=llm_config
)

# 开发者
developer = autogen.AssistantAgent(
    name="Developer",
    system_message="""作为开发者，你需要：
1. 根据架构设计编写代码
2. 确保代码质量和可测试性
3. 编写单元测试
代码完成后，请交给测试工程师。""",
    llm_config=llm_config
)

# 测试工程师
tester = autogen.AssistantAgent(
    name="QA_Engineer",
    system_message="""作为测试工程师，你需要：
1. 审查代码质量
2. 编写测试用例
3. 报告发现的 Bug
如果发现严重问题，请退回给开发者修复。""",
    llm_config=llm_config
)

# 群聊
groupchat = autogen.GroupChat(
    agents=[pm, architect, developer, tester],
    messages=[],
    max_round=20
)

manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)

user = autogen.UserProxyAgent(
    name="User",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=0
)

user.initiate_chat(manager, message="开发一个命令行待办事项应用，支持增删改查和文件持久化")
```

## 6. CrewAI 多 Agent 实战

### 6.1 内容创作团队

```python
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, ScrapeWebsiteTool

search = SerperDevTool()
scrape = ScrapeWebsiteTool()

# 研究员
researcher = Agent(
    role='内容研究员',
    goal='收集关于 {topic} 的全面、准确的信息',
    backstory='你是一位资深的内容研究员，擅长从互联网收集和整理信息。',
    tools=[search, scrape],
    verbose=True
)

# 编辑
editor = Agent(
    role='内容编辑',
    goal='审核内容质量，确保准确性和可读性',
    backstory='你是一位严格的编辑，注重事实准确和逻辑清晰。',
    verbose=True
)

# 作家
writer = Agent(
    role='技术作家',
    goal='将研究结果写成高质量的技术文章',
    backstory='你是一位获奖的技术作家，擅长将复杂概念写得通俗易懂。',
    verbose=True
)

# 定义任务
research_task = Task(
    description='研究 {topic} 的最新进展，收集至少5个权威来源',
    expected_output='包含关键发现和来源的研究报告',
    agent=researcher
)

writing_task = Task(
    description='基于研究报告撰写一篇2000字的技术文章',
    expected_output='Markdown 格式的技术文章',
    agent=writer
)

review_task = Task(
    description='审核文章的准确性、逻辑性和可读性',
    expected_output='审核意见和修改建议',
    agent=editor
)

# 组建团队
crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, writing_task, review_task],
    process=Process.sequential
)

result = crew.kickoff(inputs={"topic": "AI Agent 在企业中的应用"})
```

## 7. 多 Agent 系统设计原则

### 7.1 设计检查清单

| 原则         | 描述                            |
| :----------- | :------------------------------ |
| **角色清晰** | 每个 Agent 有明确的职责边界     |
| **接口规范** | Agent 间的消息格式统一          |
| **避免冗余** | 不设置功能重叠的 Agent          |
| **适度粒度** | Agent 数量不宜过多（3-7个为宜） |
| **容错机制** | 处理 Agent 失败或超时           |
| **可观测性** | 记录 Agent 间的通信和决策       |
| **终止条件** | 明确系统何时停止运行            |

### 7.2 常见问题与解决

| 问题         | 原因                 | 解决方案                     |
| :----------- | :------------------- | :--------------------------- |
| **无限循环** | Agent 互相推诿       | 设置最大轮次、添加终止条件   |
| **信息丢失** | 上下文过长被截断     | 使用摘要、共享记忆           |
| **角色混乱** | Agent 职责不清       | 明确 system prompt、限制能力 |
| **成本过高** | Agent 数量多、轮次多 | 减少冗余 Agent、优化 Prompt  |
| **质量下降** | 错误在 Agent 间传播  | 添加审核 Agent、交叉验证     |

## 8. 小结

多 Agent 系统是解决复杂任务的有效方式：

1. **顺序协作**适合流水线式任务，**辩论模式**适合需要多角度思考的决策
2. **层级式架构**适合有明确管理需求的场景，**扁平式架构**适合平等协作
3. 通信机制是系统的关键，需根据场景选择直接消息、消息板或事件驱动
4. Agent 数量不宜过多，3-7 个角色明确的 Agent 通常效果最好
5. 必须设置终止条件和容错机制，避免无限循环和错误传播
