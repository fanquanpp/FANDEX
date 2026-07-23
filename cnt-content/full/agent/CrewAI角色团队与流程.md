---
title: CrewAI角色团队与流程
description: 'CrewAI是2026年基于角色的多Agent框架。四个原语：Agent、Task、Crew、Process。两种顶层形状：Crew（自主、基于角色的协作）和Flow（事件驱动、确定性）。文档直言："对于任何生产就绪应用，从Flow开始。"'
module: agent
related:
  - 'agent/Claude-Agent-SDK'
  - 'agent/Claude-Code权限模式'
  - 'agent/Darwin-Godel自修改Agent'
  - 'agent/FIPA-ACL遗产'
prerequisites:
  - agent/概述与架构
---

# CrewAI：角色团队与流程

> CrewAI是2026年基于角色的多Agent框架。四个原语：Agent、Task、Crew、Process。两种顶层形状：Crew（自主、基于角色的协作）和Flow（事件驱动、确定性）。文档直言："对于任何生产就绪应用，从Flow开始。"

**类型：** 学习 + 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 12 (工作流模式), Phase 14 · 14 (Actor模型)
**时间：** ~75分钟

## 学习目标

- 说出CrewAI的四个原语（Agent、Task、Crew、Process）以及各自拥有的内容。
- 区分Sequential、Hierarchical和计划中的Consensus流程；按工作负载选择。
- 区分Crew（自主基于角色）和Flow（事件驱动确定性），并解释文档的生产建议。
- 用`@tool`装饰器和`BaseTool`子类连接工具；推理结构化输出 vs 自由文本。
- 说出四种CrewAI记忆类型以及各自何时值得。
- 实现一个stdlib三Agent团队（研究员、作者、编辑）产出简报。
- 发现三个CrewAI失败模式：提示膨胀、管理者LLM税、脆弱交接。

## 问题所在

采用多Agent框架的团队撞上同一面墙。"自主协作"在演示中听起来很棒。然后客户提交了一个Bug，你需要确定性重放。或者财务问LLM路由团队每次运行多少钱。或者值班需要知道哪个Agent在凌晨3点停滞了。

自由形式LLM路由团队都不能干净地回答这些问题。纯DAG都能回答但失去了头脑风暴Agent需要的探索形状。

CrewAI的拆分对权衡很诚实。Crew用于协作、基于角色、探索性工作。Flow用于事件驱动、代码拥有、可审计的生产。同一框架，两种形状，按场景选择。

## 核心概念

### 四个原语

CrewAI的面很小。记住这些，其余就是配置。

- **Agent。** `role + goal + backstory + tools + (optional) llm`。backstory是承重的。它塑造语气、判断、Agent何时停止。工具是Agent可以调用的函数。
- **Task。** `description + expected_output + agent + (optional) context + (optional) output_pydantic`。可复用的工作单元。`expected_output`是契约。`context`列出上游任务，其输出被传入。`output_pydantic`强制结构化形状。
- **Crew。** 容器。拥有`agents`列表、`tasks`列表、`process`和可选的`memory` + `verbose` + `manager_llm`设置。
- **Process。** 执行策略。Sequential、Hierarchical、Consensus（计划中）。选择运行的形状。

Agent不直接看到彼此。Task引用Agent。Crew排序Task。Process决定谁选择下一个Task。这就是整个心智模型。

### Sequential vs Hierarchical vs Consensus

- **Sequential。** Task按声明顺序运行。Task N的输出作为`context`对Task N+1可用。最低成本。最可预测。当顺序固定时使用。
- **Hierarchical。** 一个管理者Agent（单独的LLM调用）在专家之间路由。CrewAI从你的`manager_llm`配置或默认值生成管理者。管理者每轮选择下一个Task，可以拒绝或重新路由。当你有四个或更多专家且顺序真正取决于先前输出时使用。
- **Consensus。** 计划中，目前未在公共API中实现。文档为未来基于投票的流程保留名称。今天不要依赖它。

Hierarchical在每个专家调用之上添加每轮LLM调用（管理者）。在五步运行中token成本可能翻三倍。只在需要路由时才为此付费。

### Crew vs Flow

这是2026年文档的框架。

- **Crew。** LLM驱动的自主性。框架在运行时选择形状。适用于：研究、头脑风暴、初稿、路径是答案一部分的任何地方。难以重放。难以测试。原型制作便宜。
- **Flow。** 你拥有的事件驱动图。`@start`标记入口。`@listen(topic)`标记当另一个步骤发出该主题时触发的步骤。每个步骤是普通Python（可以在内部调用Crew）。适用于：生产。可观测。可测试。确定性。

文档的2026年生产建议：从Flow开始。当自主性证明其成本时，将Crew作为`Crew.kickoff()`调用从Flow步骤内嵌入。Flow给你审计轨迹，Crew给你探索。组合，不要选择。

### 工具集成

三种方式给Agent一个工具。选择最简单的适合的。

1. **`@tool`装饰器。** 纯函数变成工具。签名是Schema；docstring是LLM看到的描述。最适合一次性辅助。

   ```python
   from crewai.tools import tool

   @tool("Search the web")
   def search(query: str) -> str:
       """Return top results for the query."""
       return run_search(query)
   ```

2. **`BaseTool`子类。** 带显式参数Schema、异步支持、重试的基于类的工具。当工具有状态（客户端、缓存）或需要结构化参数时使用。

   ```python
   from crewai.tools import BaseTool
   from pydantic import BaseModel

   class SearchArgs(BaseModel):
       query: str
       limit: int = 10

   class SearchTool(BaseTool):
       name = "web_search"
       description = "Search the web and return top results."
       args_schema = SearchArgs

       def _run(self, query: str, limit: int = 10) -> str:
           return self.client.search(query, limit=limit)
   ```

3. **内置工具包。** CrewAI提供第一方适配器：`SerperDevTool`、`FileReadTool`、`DirectoryReadTool`、`CodeInterpreterTool`、`RagTool`、`WebsiteSearchTool`。一次导入即可连接。

结构化输出使用Pydantic。在Task上传递`output_pydantic=MyModel`。CrewAI根据模型验证LLM响应，然后强制转换或重试。将此与紧凑的`expected_output`字符串配对。自由文本输出适合草稿；结构化输出是下游Flow可以消费的。

### 记忆钩子

CrewAI开箱提供四种记忆类型。它们可以组合：一个Crew可以同时启用所有四种。

- **短期。** 单次运行内的对话缓冲区。结束时清除。
- **长期。** 跨运行持久化。存储在向量DB中（默认Chroma，可替换）。按与当前任务的相似性检索。
- **实体。** 每实体事实。"客户X在企业计划上。"按键而非相似性索引。跨运行存活。
- **上下文。** 组装时检索。在Agent需要时拉取相关记忆，而非预加载。

在Crew上用`memory=True`或每类型配置启用。由你配置的嵌入提供商支持（默认OpenAI，可替换为本地）。记忆是CrewAI相对于更薄框架证明其价值的地方之一；纯LangGraph需要你自己连接这些。

### CrewAI何时适合

- 三到六个有命名角色和协作工作流的Agent。起草、审查、规划、头脑风暴。
- LLM对下一步的判断是价值一部分的路由（Hierarchical）。
- 团队更愿意读`role + goal + backstory`而非图定义的地方。

### CrewAI何时不适合

- 有严格排序的确定性DAG。使用LangGraph（第13课）。图形状是正确的抽象；CrewAI的角色框架是摩擦。
- 亚秒级延迟预算。Hierarchical添加往返。即使Sequential也序列化包含backstory和先前输出的提示。
- 单Agent循环。跳过框架；Agent循环（第1课）加工具注册表更短。

### 这个模式哪里会出错

- **backstory导致的提示膨胀。** 每个Agent 2000字的backstory和五个Agent的团队在第一次工具调用前就烧光了上下文预算。保持backstory在200字以内。跨Agent复用短语；不要重复五次内务风格。
- **管理者LLM token税。** Hierarchical流程在每个专家调用前添加一个管理者LLM调用。在五任务团队中那是六次LLM调用而非五次，而且管理者调用携带完整任务列表加先前输出。除非路由取决于输出，否则切换到Sequential。
- **脆弱交接。** Task N的`expected_output`是"一个大纲"。Task N+1将其作为`context`读取并尝试解析三个部分。LLM产生了四个。下游Agent即兴发挥。用Task N上的`output_pydantic`修复，使Task N+1读取类型化对象而非自由文本。
- **Crew即生产。** 自由形式Crew在没有Flow包装器的情况下发布到生产。输出变异性高；重放不可能；值班无法对比坏运行和好运行。用Flow包装。

## 构建它

`code/main.py`实现两种形状的stdlib版本加三Agent团队。

形状：

- `Agent`、`Task`数据类匹配CrewAI的面。
- `SequentialCrew.kickoff(inputs)`按声明顺序运行任务，将输出作为`context`传递。
- `HierarchicalCrew.kickoff(topic)`添加一个管理者Agent每轮选择下一个专家，在"done"时停止。
- `Flow`带`@start`和`@listen(topic)`装饰器，一个小事件循环和一个跟踪。
- `tool(name)`装饰器镜像CrewAI的`@tool`形状。
- `Memory`带`short_term`、`long_term`、`entity`存储；模拟相似性使用numpy。
- 模拟LLM响应是按键于角色加输入前缀的硬编码字符串。无网络。确定性。

具体演示：研究员、作者、编辑团队产出关于"agent engineering 2026"的简报。研究员拉取（模拟）来源。作者起草。编辑精炼。同一团队通过Flow运行以展示确定性形状。

运行：

```bash
python3 code/main.py
```

跟踪覆盖：顺序团队通过`context`传递输出，层次团队带管理者选择（研究员、作者、编辑，然后"done"），Flow以显式主题运行相同三步（`researched`、`drafted`、`edited`），通过`@tool`路由的工具调用，以及跨两次kickoff存活的长期记忆。

Crew跟踪是流动的；管理者原则上可以重新排序。Flow跟踪是固定的。那个选择就是课程。

## 使用它

- **CrewAI Flow**用于生产。即使Flow只有一个步骤调用`Crew.kickoff()`。Flow给出审计边界。
- **CrewAI Crew（Sequential）**用于清晰排序的协作工作，特别是初稿和审查循环。
- **CrewAI Crew（Hierarchical）**当路由取决于输出且有四个或更多专家时。
- **LangGraph**（第13课）用于显式状态机、持久恢复、严格排序。
- **AutoGen v0.4**（第14课）用于Actor模型并发和故障隔离。
- **OpenAI Agents SDK**（第16课）用于OpenAI优先产品，带交接和护栏。
- **Claude Agent SDK**（第17课）用于Claude优先产品，带子Agent和会话存储。

## 发布它

`outputs/skill-crew-or-flow.md`为任务选择Crew vs Flow并脚手架最小实现。硬拒绝Crew-without-backstory、Flow-without-explicit-topics、少于三个专家的Hierarchical。

## 陷阱

- **Backstory作为风味。** 它塑造输出。每个Agent测试三个变体；方差是真实的。选一个，冻结它。
- **跳过`expected_output`。** 没有每任务的契约，下游任务拾取LLM产生的任何东西。Crew运行；审计失败。
- **记忆始终开启。** 每次运行都写长期。向量DB增长。检索变嘈杂。将写入范围限定到事实是持久的任务。
- **管理者提示漂移。** Hierarchical的管理者提示是隐式的。如果路由变奇怪，在verbose模式中转储并阅读。
- **Crew中的工具副作用。** Crew可能比预期更多次调用工具。POST、DELETE、支付属于Flow步骤，从不是Crew工具。

## 练习

1. 将Sequential团队转换为Flow。计算可变性下降的接触点。注意可读性在哪里下降。
2. 给团队添加实体记忆：关于客户的事实跨kickoff持久化。验证检索拉取正确的实体。
3. 实现Hierarchical流程，管理者拒绝路由到编辑，直到作者的输出至少有三个段落。跟踪重试。
4. 为（模拟的）Web搜索连接`BaseTool`子类。比较跟踪形状与`@tool`装饰器版本。
5. 给编辑任务添加`output_pydantic=Brief`，其中`Brief`有`title`、`summary`、`sections`。让作者任务输出一次格式错误的JSON；验证跟踪中CrewAI的重试行为。
6. 阅读CrewAI文档介绍。将玩具移植到真实的`crewai` API。stdlib版本跳过了哪些保证？
7. 将AgentOps或Langfuse（第24课）连接到真实运行。你在stdlib版本中遗漏了哪些跟踪？

## 关键术语

| 术语              | 人们常说的     | 实际含义                                        |
| ----------------- | -------------- | ----------------------------------------------- |
| Agent             | "角色"         | Role + goal + backstory + tools                 |
| Task              | "工作单元"     | 描述 + 预期输出 + 分配者 + 可选结构化输出       |
| Crew              | "Agent团队"    | Agent + Task + Process的容器                    |
| Process           | "执行策略"     | Sequential / Hierarchical / Consensus（计划中） |
| Flow              | "确定性工作流" | 事件驱动、代码拥有、可测试                      |
| Backstory         | "角色提示"     | Agent的语气和判断塑造器                         |
| `@tool`           | "函数工具"     | 将函数变成Agent可调用工具的装饰器               |
| `BaseTool`        | "类工具"       | 带参数Schema、重试、异步支持的基于类的工具      |
| 实体记忆          | "每实体事实"   | 范围限定到客户/账户/问题的记忆                  |
| 长期记忆          | "跨运行记忆"   | 在kickoff之间存活的向量支持记忆                 |
| 上下文记忆        | "即时检索"     | 在Agent需要时拉取的记忆                         |
| 管理者LLM         | "路由Agent"    | Hierarchical流程中选择下一个任务的额外LLM       |
| `expected_output` | "任务契约"     | 告诉Agent（和审计）返回什么形状的字符串         |

## 延伸阅读

- [CrewAI文档介绍](https://docs.crewai.com/en/introduction)：概念和推荐的生产路径
- [CrewAI Flows指南](https://docs.crewai.com/en/concepts/flows)：事件驱动形状，`@start`，`@listen`
- [CrewAI工具参考](https://docs.crewai.com/en/concepts/tools)：`@tool`、`BaseTool`、内置工具包
- [CrewAI记忆](https://docs.crewai.com/en/concepts/memory)：短期、长期、实体、上下文
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)：多Agent何时有帮助何时没有
- [LangGraph概述](https://docs.langchain.com/oss/python/langgraph/overview)：状态机替代
