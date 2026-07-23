---
title: 上下文工程
description: 理解上下文工程的核心原则，包括上下文窗口管理、信息排序和检索策略
module: llm
difficulty: intermediate
tags:
  - 'context engineering'
  - 上下文窗口
  - 信息排序
  - 检索策略
related:
  - llm/模型上下文协议
  - llm/嵌入
  - llm/少样本与思维链
  - llm/生产应用
prerequisites:
  - llm/安全护栏
---

# 上下文工程

> 提示工程关注"怎么问"，上下文工程关注"给什么信息"。在有限的上下文窗口中放入最相关的信息，按最优顺序排列——这就是上下文工程。

**类型：** 概念
**前置条件：** Phase 11 Lesson 01（提示工程）
**预计时间：** ~45 分钟

## 学习目标

- 理解上下文窗口的物理限制和利用策略
- 掌握信息排序原则：最重要的放前面
- 理解上下文压缩和摘要技术
- 掌握检索策略：何时检索、检索多少

## 上下文窗口

| 模型           | 上下文窗口  | 约等于            |
| -------------- | ----------- | ----------------- |
| GPT-4o         | 128K tokens | ~96K 字 / ~300 页 |
| Claude Sonnet  | 200K tokens | ~150K 字          |
| Gemini 1.5 Pro | 1M tokens   | ~750K 字          |

但更大的窗口不等于更好的效果。研究表明，模型对上下文中间的信息"注意力下降"——Lost in the Middle 效应。

## 信息排序原则

```
[系统提示]        ← 最高优先级，始终在开头
[工具定义]        ← 高优先级，结构化信息
[少样本示例]      ← 高优先级，行为引导
[检索到的文档]    ← 中优先级，按相关性排序
[对话历史]        ← 低优先级，可截断
[当前用户消息]    ← 必须在最后
```

**关键原则：** 最重要的信息放在上下文的开头和结尾，中间位置的信息最容易被忽略。

## 上下文压缩

```python
def compress_context(documents, query, max_tokens=4000):
    """压缩上下文：保留最相关的部分"""
    compressed = []
    total_tokens = 0

    # 按相关性排序
    scored_docs = [(doc, relevance_score(doc, query)) for doc in documents]
    scored_docs.sort(key=lambda x: x[1], reverse=True)

    for doc, score in scored_docs:
        doc_tokens = estimate_tokens(doc)
        if total_tokens + doc_tokens > max_tokens:
            # 截断文档
            remaining = max_tokens - total_tokens
            if remaining > 100:
                truncated = doc[:remaining * 4]  # 粗略估计
                compressed.append(truncated)
            break
        compressed.append(doc)
        total_tokens += doc_tokens

    return compressed
```

## 对话历史管理

```python
class ConversationManager:
    """对话历史管理器"""

    def __init__(self, max_history_tokens=8000):
        self.max_tokens = max_history_tokens
        self.messages = []

    def add(self, role, content):
        """添加消息"""
        self.messages.append({"role": role, "content": content})
        self._trim_if_needed()

    def _trim_if_needed(self):
        """如果超出限制，截断早期对话"""
        while self._estimate_total_tokens() > self.max_tokens and len(self.messages) > 2:
            # 保留系统消息和最近的对话
            self.messages.pop(1)  # 移除最早的用户消息
            if len(self.messages) > 1:
                self.messages.pop(1)  # 移除对应的助手消息

    def get_messages(self):
        """获取当前消息列表"""
        return self.messages.copy()

    def _estimate_total_tokens(self):
        return sum(len(m['content']) * 0.75 for m in self.messages)
```

## 关键术语

| 术语               | 通俗说法           | 实际含义                                 |
| ------------------ | ------------------ | ---------------------------------------- |
| 上下文工程         | "选什么信息给模型" | 管理和优化输入给 LLM 的信息内容和顺序    |
| Lost in the Middle | "中间遗忘"         | 模型对上下文中间位置信息注意力下降的现象 |
| 上下文压缩         | "精简信息"         | 在有限的 token 预算内保留最相关的信息    |

## 延伸阅读

- [Liu et al., 2023 -- "Lost in the Middle: How Language Models Use Long Contexts"](https://arxiv.org/abs/2307.03172) -- Lost in the Middle 论文
- [Anthropic -- Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) -- 上下文缓存
