---
order: 5
title: 记忆与规划
module: agent
category: 'AI Agent'
difficulty: intermediate
description: 短期/长期记忆、对话管理、向量记忆、知识图谱记忆、任务规划与反思机制。
author: fanquanpp
updated: '2026-06-14'
related:
  - agent/Agent框架
  - 'agent/工具使用与Function Calling'
  - agent/多Agent系统
  - agent/Agent评估与安全
prerequisites: []
---

## 1. Agent 记忆系统

记忆是 Agent 的核心组件之一，使 Agent 能够**保留和利用历史信息**，实现连贯对话和经验积累。

### 1.1 记忆类型

| 类型         | 存储       | 持续时间   | 示例                 |
| :----------- | :--------- | :--------- | :------------------- |
| **短期记忆** | 上下文窗口 | 单次会话   | 当前对话历史         |
| **长期记忆** | 外部存储   | 跨会话     | 用户偏好、历史任务   |
| **工作记忆** | Agent 状态 | 任务执行中 | 当前子目标、中间结果 |

### 1.2 记忆架构

```
┌──────────────────────────────────────────┐
│              Agent 记忆系统               │
│                                          │
│  ┌────────────┐    ┌──────────────────┐  │
│  │  短期记忆   │    │    长期记忆       │  │
│  │ (上下文窗口)│    │  ┌────────────┐  │  │
│  │            │    │  │ 向量记忆    │  │  │
│  │ 当前对话   │    │  │ (语义检索)  │  │  │
│  │ 最近操作   │    │  ├────────────┤  │  │
│  │            │    │  │ 知识图谱    │  │  │
│  └────────────┘    │  │ (关系检索)  │  │  │
│                    │  ├────────────┤  │  │
│                    │  │ 结构化存储  │  │  │
│                    │  │ (KV/SQL)   │  │  │
│                    │  └────────────┘  │  │
│                    └──────────────────┘  │
└──────────────────────────────────────────┘
```

## 2. 短期记忆

### 2.1 对话历史管理

```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class ConversationMemory:
    """对话历史管理"""
    max_tokens: int = 4000
    messages: List[dict] = field(default_factory=list)

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})

    def get_messages(self) -> List[dict]:
        """获取截断后的消息列表"""
        total = 0
        result = []
        # 从最新消息开始，倒序计算 token
        for msg in reversed(self.messages):
            msg_tokens = self._estimate_tokens(msg["content"])
            if total + msg_tokens > self.max_tokens:
                break
            result.insert(0, msg)
            total += msg_tokens
        return result

    def _estimate_tokens(self, text: str) -> int:
        """估算 token 数量（中文约 1.5 字/token）"""
        return len(text) // 2

    def clear(self):
        self.messages = []
```

### 2.2 滑动窗口与摘要

```python
class SlidingWindowMemory:
    """滑动窗口 + 摘要记忆"""
    def __init__(self, window_size: int = 10, llm=None):
        self.window_size = window_size
        self.llm = llm
        self.recent_messages = []
        self.summary = ""

    def add_message(self, role: str, content: str):
        self.recent_messages.append({"role": role, "content": content})

        # 超出窗口大小时，压缩旧消息
        if len(self.recent_messages) > self.window_size:
            self._compress()

    def _compress(self):
        """将旧消息压缩为摘要"""
        old_messages = self.recent_messages[:-self.window_size]
        old_text = "\n".join(f"{m['role']}: {m['content']}" for m in old_messages)

        summary_prompt = f"""请将以下对话历史压缩为简洁的摘要，保留关键信息：

已有摘要: {self.summary}

新对话:
{old_text}

更新后的摘要:"""

        self.summary = self.llm.invoke(summary_prompt)
        self.recent_messages = self.recent_messages[-self.window_size:]

    def get_context(self) -> List[dict]:
        """获取完整上下文"""
        context = []
        if self.summary:
            context.append({
                "role": "system",
                "content": f"之前对话的摘要: {self.summary}"
            })
        context.extend(self.recent_messages)
        return context
```

## 3. 长期记忆

### 3.1 向量记忆

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from datetime import datetime

class VectorMemory:
    """基于向量数据库的长期记忆"""
    def __init__(self, persist_dir: str = "./agent_memory"):
        self.embeddings = OpenAIEmbeddings()
        self.vectorstore = Chroma(
            embedding_function=self.embeddings,
            persist_directory=persist_dir
        )

    def save(self, content: str, metadata: dict = None):
        """保存记忆"""
        meta = metadata or {}
        meta["timestamp"] = datetime.now().isoformat()
        meta["type"] = meta.get("type", "general")

        self.vectorstore.add_texts(
            texts=[content],
            metadatas=[meta]
        )

    def recall(self, query: str, k: int = 5) -> list:
        """检索相关记忆"""
        results = self.vectorstore.similarity_search(query, k=k)
        return [(doc.page_content, doc.metadata) for doc in results]

    def recall_by_time(self, query: str, days: int = 7, k: int = 5):
        """按时间范围检索"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        results = self.vectorstore.similarity_search(
            query, k=k,
            filter={"timestamp": {"$gte": cutoff}}
        )
        return results

# 使用
memory = VectorMemory()

# 保存记忆
memory.save("用户偏好使用 Python 进行开发", {"type": "preference"})
memory.save("上次讨论了 LangGraph 的状态管理", {"type": "conversation"})

# 检索记忆
results = memory.recall("用户喜欢什么编程语言？")
```

### 3.2 知识图谱记忆

```python
class KnowledgeGraphMemory:
    """基于知识图谱的记忆"""
    def __init__(self):
        self.entities = {}   # 实体 → 属性
        self.relations = []  # (主体, 关系, 客体)

    def add_entity(self, name: str, attributes: dict):
        if name not in self.entities:
            self.entities[name] = {}
        self.entities[name].update(attributes)

    def add_relation(self, subject: str, relation: str, obj: str):
        self.relations.append((subject, relation, obj))

    def query_entity(self, name: str) -> dict:
        """查询实体及其关系"""
        result = {"attributes": self.entities.get(name, {}), "relations": []}
        for s, r, o in self.relations:
            if s == name:
                result["relations"].append(f"{r} → {o}")
            elif o == name:
                result["relations"].append(f"{s} → {r}")
        return result

    def to_context(self, entity: str) -> str:
        """将知识图谱转为 LLM 可读的上下文"""
        info = self.query_entity(entity)
        context = f"实体: {entity}\n"
        context += f"属性: {info['attributes']}\n"
        context += f"关系: {', '.join(info['relations'])}"
        return context

# 使用
kg = KnowledgeGraphMemory()
kg.add_entity("用户", {"name": "张三", "role": "开发者"})
kg.add_entity("Python", {"type": "编程语言", "version": "3.12"})
kg.add_relation("用户", "擅长", "Python")
kg.add_relation("用户", "使用", "LangChain")

print(kg.to_context("用户"))
```

### 3.3 结构化记忆

```python
import json
from pathlib import Path

class StructuredMemory:
    """结构化键值记忆"""
    def __init__(self, store_path: str = "./memory.json"):
        self.store_path = Path(store_path)
        self.data = self._load()

    def _load(self) -> dict:
        if self.store_path.exists():
            return json.loads(self.store_path.read_text())
        return {"preferences": {}, "facts": {}, "tasks": {}}

    def _save(self):
        self.store_path.write_text(json.dumps(self.data, ensure_ascii=False, indent=2))

    def set_preference(self, key: str, value: str):
        self.data["preferences"][key] = value
        self._save()

    def get_preference(self, key: str, default=None):
        return self.data["preferences"].get(key, default)

    def add_fact(self, fact: str):
        self.data["facts"][fact] = True
        self._save()

    def get_all_preferences(self) -> str:
        return "\n".join(f"- {k}: {v}" for k, v in self.data["preferences"].items())
```

## 4. 任务规划

### 4.1 规划类型

| 类型           | 描述         | 适用场景   |
| :------------- | :----------- | :--------- |
| **单步规划**   | 直接生成行动 | 简单任务   |
| **多步规划**   | 分解为子任务 | 复杂任务   |
| **层次规划**   | 逐层细化     | 大型项目   |
| **自适应规划** | 动态调整     | 不确定环境 |

### 4.2 任务分解

```python
from pydantic import BaseModel
from typing import List, Optional

class SubTask(BaseModel):
    id: str
    description: str
    dependencies: List[str] = []
    status: str = "pending"  # pending | running | completed | failed
    result: Optional[str] = None

class TaskPlanner:
    """任务规划器"""
    def __init__(self, llm):
        self.llm = llm

    def plan(self, objective: str) -> List[SubTask]:
        """将目标分解为子任务"""
        prompt = f"""请将以下目标分解为具体的子任务。

目标: {objective}

要求:
1. 每个子任务应该具体、可执行
2. 标注子任务之间的依赖关系
3. 按执行顺序排列

输出 JSON 格式:
[
  {{"id": "1", "description": "步骤描述", "dependencies": []}},
  {{"id": "2", "description": "步骤描述", "dependencies": ["1"]}}
]"""

        response = self.llm.invoke(prompt)
        tasks = json.loads(response)
        return [SubTask(**t) for t in tasks]

    def get_ready_tasks(self, tasks: List[SubTask]) -> List[SubTask]:
        """获取可执行的子任务（依赖已完成）"""
        completed_ids = {t.id for t in tasks if t.status == "completed"}
        ready = []
        for task in tasks:
            if task.status == "pending":
                if all(dep in completed_ids for dep in task.dependencies):
                    ready.append(task)
        return ready
```

### 4.3 自适应规划

```python
class AdaptivePlanner:
    """自适应规划器 - 根据执行结果动态调整计划"""
    def __init__(self, llm):
        self.llm = llm

    def replan(self, original_plan: list, completed: list, failed: dict, remaining: list) -> list:
        """根据执行情况重新规划"""
        prompt = f"""原始计划:
{json.dumps(original_plan, ensure_ascii=False)}

已完成的步骤:
{json.dumps(completed, ensure_ascii=False)}

失败的步骤和原因:
{json.dumps(failed, ensure_ascii=False)}

剩余步骤:
{json.dumps(remaining, ensure_ascii=False)}

请根据执行情况调整剩余计划：
1. 如果有步骤失败，提供替代方案
2. 根据已完成的结果，可能需要添加新步骤
3. 移除不再需要的步骤

输出调整后的计划 JSON:"""

        response = self.llm.invoke(prompt)
        return json.loads(response)
```

## 5. 反思机制

### 5.1 自我评估

```python
class ReflexionModule:
    """反思模块"""
    def __init__(self, llm):
        self.llm = llm
        self.reflections = []

    def reflect(self, task: str, action: str, result: str, success: bool) -> str:
        """对执行结果进行反思"""
        prompt = f"""请对以下执行结果进行反思：

任务: {task}
执行的行动: {action}
结果: {result}
是否成功: {'是' if success else '否'}

请分析:
1. 行动是否恰当？
2. 结果是否符合预期？
3. 如果失败，原因是什么？
4. 下次应该如何改进？

反思:"""

        reflection = self.llm.invoke(prompt)
        self.reflections.append({
            "task": task,
            "action": action,
            "success": success,
            "reflection": reflection
        })
        return reflection

    def get_lessons(self) -> str:
        """获取经验教训"""
        if not self.reflections:
            return "暂无经验教训"
        lessons = []
        for r in self.reflections:
            if not r["success"]:
                lessons.append(f"- 任务 '{r['task']}' 失败教训: {r['reflection']}")
        return "\n".join(lessons)
```

### 5.2 自我改进循环

```python
class SelfImprovingAgent:
    """自我改进的 Agent"""
    def __init__(self, llm, tools, max_attempts=3):
        self.llm = llm
        self.tools = tools
        self.max_attempts = max_attempts
        self.reflection_module = ReflexionModule(llm)
        self.memory = VectorMemory()

    def execute(self, task: str) -> str:
        for attempt in range(self.max_attempts):
            # 获取相关记忆
            past_lessons = self.memory.recall(task, k=3)

            # 生成行动（包含反思经验）
            action = self._generate_action(task, past_lessons)

            # 执行
            result = self._execute_action(action)
            success = self._evaluate(result, task)

            if success:
                # 保存成功经验
                self.memory.save(
                    f"任务: {task} | 行动: {action} | 结果: 成功",
                    {"type": "success"}
                )
                return result

            # 反思失败
            reflection = self.reflection_module.reflect(task, action, result, False)
            self.memory.save(
                f"任务: {task} | 失败原因: {reflection}",
                {"type": "failure"}
            )

        return "达到最大尝试次数，任务失败"
```

## 6. 记忆与规划集成

### 6.1 完整 Agent 记忆架构

```python
class AgentMemorySystem:
    """Agent 完整记忆系统"""
    def __init__(self, llm):
        self.short_term = SlidingWindowMemory(window_size=10, llm=llm)
        self.long_term = VectorMemory()
        self.knowledge = KnowledgeGraphMemory()
        self.structured = StructuredMemory()

    def build_context(self, query: str) -> str:
        """构建完整上下文"""
        parts = []

        # 用户偏好
        prefs = self.structured.get_all_preferences()
        if prefs:
            parts.append(f"用户偏好:\n{prefs}")

        # 相关长期记忆
        memories = self.long_term.recall(query, k=3)
        if memories:
            mem_text = "\n".join(content for content, _ in memories)
            parts.append(f"相关记忆:\n{mem_text}")

        # 知识图谱
        # 提取查询中的实体并查询
        parts.append(f"当前对话:\n{self.short_term.get_context()}")

        return "\n\n".join(parts)
```

## 7. 小结

记忆和规划是 Agent 实现智能行为的关键：

1. **短期记忆**管理对话上下文，需注意 token 限制和截断策略
2. **长期记忆**通过向量数据库实现语义检索，是经验积累的基础
3. **知识图谱记忆**适合存储实体关系，提供结构化关联推理
4. **任务规划**将复杂目标分解为可执行子任务，支持依赖管理
5. **反思机制**使 Agent 能从失败中学习，逐步改进行为
6. 实际应用中需**组合使用**多种记忆类型，根据场景选择合适策略
