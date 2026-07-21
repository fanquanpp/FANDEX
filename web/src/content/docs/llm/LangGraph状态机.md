---
title: LangGraph状态机
description: '理解 LangGraph 的状态机设计，构建可控的多步骤 LLM 工作流'
module: llm
difficulty: advanced
tags:
  - LangGraph
  - 'state machine'
  - 工作流
  - Agent
  - 状态机
related:
  - llm/DualPipe并行
  - 'llm/Jamba混合SSM-Transformer'
  - llm/LLM工程评估
  - llm/LLM评估
prerequisites:
  - llm/安全护栏
---

# LangGraph状态机

> 简单的 LLM 调用是"一问一答"。但现实任务需要多步骤、有条件分支、可回溯的工作流。LangGraph 用状态机模型管理这些复杂流程——每一步都有明确的输入输出和转移条件。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 09（函数调用）
**预计时间：** ~60 分钟

## 学习目标

- 理解 LangGraph 的核心概念：状态、节点、边
- 实现带条件分支的状态机工作流
- 掌握人工审批和错误恢复模式
- 理解 LangGraph 与 LangChain 的关系

## 核心概念

```
State（状态）: 工作流中共享的数据结构
Node（节点）: 接收状态、执行操作、更新状态的函数
Edge（边）: 定义节点之间的转移，支持条件分支
```

## 基础工作流

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END


class WorkflowState(TypedDict):
    """工作流状态"""
    query: str
    documents: list
    answer: str
    needs_review: bool
    review_result: str


def retrieve(state: WorkflowState) -> dict:
    """检索节点"""
    # 检索相关文档
    documents = search_documents(state['query'])
    return {"documents": documents}


def generate(state: WorkflowState) -> dict:
    """生成节点"""
    # 基于检索到的文档生成回答
    context = "\n".join(state['documents'])
    answer = llm_generate(state['query'], context)

    # 判断是否需要人工审核
    needs_review = any(keyword in answer for keyword in ['敏感', '争议'])

    return {"answer": answer, "needs_review": needs_review}


def review(state: WorkflowState) -> dict:
    """审核节点"""
    # 人工审核逻辑
    result = human_review(state['answer'])
    return {"review_result": result}


def should_review(state: WorkflowState) -> str:
    """条件边：是否需要审核"""
    if state['needs_review']:
        return "review"
    return END


# 构建工作流图
graph = StateGraph(WorkflowState)

# 添加节点
graph.add_node("retrieve", retrieve)
graph.add_node("generate", generate)
graph.add_node("review", review)

# 添加边
graph.add_edge("retrieve", "generate")
graph.add_conditional_edges("generate", should_review)
graph.add_edge("review", END)

# 设置入口
graph.set_entry_point("retrieve")

# 编译
app = graph.compile()

# 运行
result = app.invoke({"query": "什么是量子计算？"})
```

## 带循环的工作流

```python
class ResearchState(TypedDict):
    query: str
    findings: list
    current_search: str
    iterations: int
    final_report: str


def search(state: ResearchState) -> dict:
    """搜索节点"""
    results = web_search(state['current_search'] or state['query'])
    return {"findings": state['findings'] + results}


def analyze(state: ResearchState) -> dict:
    """分析节点"""
    # 分析搜索结果，决定是否需要更多搜索
    analysis = llm_analyze(state['findings'], state['query'])
    return {
        "current_search": analysis.next_search_query,
        "iterations": state['iterations'] + 1,
    }


def should_continue(state: ResearchState) -> str:
    """条件边：是否继续搜索"""
    if state['iterations'] >= 5 or not state.get('current_search'):
        return "synthesize"
    return "search"


def synthesize(state: ResearchState) -> dict:
    """综合节点"""
    report = llm_synthesize(state['findings'], state['query'])
    return {"final_report": report}


# 构建带循环的图
graph = StateGraph(ResearchState)
graph.add_node("search", search)
graph.add_node("analyze", analyze)
graph.add_node("synthesize", synthesize)

graph.set_entry_point("search")
graph.add_edge("search", "analyze")
graph.add_conditional_edges("analyze", should_continue)
graph.add_edge("synthesize", END)

app = graph.compile()
```

## 关键术语

| 术语     | 通俗说法   | 实际含义                               |
| -------- | ---------- | -------------------------------------- |
| 状态机   | "流程图"   | 用状态和转移描述工作流的计算模型       |
| 节点     | "处理步骤" | 工作流中的一个处理步骤，接收和更新状态 |
| 条件边   | "分支判断" | 根据状态决定下一步走向哪个节点         |
| 人工审批 | "人把关"   | 工作流中需要人工确认的节点             |

## 延伸阅读

- [LangGraph 文档](https://langchain-ai.github.io/langgraph/) -- LangGraph 官方文档
- [LangGraph 教程](https://langchain-ai.github.io/langgraph/tutorials/) -- 官方教程
