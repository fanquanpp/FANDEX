---
title: 缓存与成本
description: '理解 LLM 应用的成本优化策略，包括语义缓存、精确缓存、速率限制和模型路由'
module: llm
difficulty: intermediate
tags:
  - caching
  - 'cost optimization'
  - 语义缓存
  - 速率限制
  - 模型路由
related:
  - llm/构建完整LLM流水线
  - llm/函数调用
  - llm/结构化输出
  - llm/开源模型架构详解
prerequisites:
  - llm/安全护栏
---

# 缓存与成本

> GPT-4o 每百万 token 收费 $2.50/$10.00。一个日活 10 万用户的应用，每月 API 成本可能超过 $50,000。缓存和成本优化不是可选项——它决定了你的应用能否存活。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 01（提示工程）
**预计时间：** ~45 分钟

## 学习目标

- 理解 LLM API 的成本结构
- 实现精确缓存和语义缓存
- 掌握速率限制和模型路由策略
- 构建成本追踪系统

## 成本结构

| 模型          | 输入价格 | 输出价格 | 适用场景 |
| ------------- | -------- | -------- | -------- |
| GPT-4o        | $2.50/M  | $10.00/M | 复杂推理 |
| GPT-4o mini   | $0.15/M  | $0.60/M  | 日常任务 |
| Claude Sonnet | $3.00/M  | $15.00/M | 长文档   |
| Claude Haiku  | $0.25/M  | $1.25/M  | 快速响应 |

## 精确缓存

```python
import hashlib
import json


class ExactCache:
    """精确匹配缓存"""

    def __init__(self, max_size=10000):
        self.cache = {}
        self.max_size = max_size
        self.hits = 0
        self.misses = 0

    def _hash(self, messages, model, **kwargs):
        """计算缓存键"""
        key = json.dumps({
            "messages": messages,
            "model": model,
            **{k: v for k, v in kwargs.items() if k in ['temperature', 'max_tokens']},
        }, sort_keys=True)
        return hashlib.sha256(key.encode()).hexdigest()

    def get(self, messages, model, **kwargs):
        """获取缓存"""
        key = self._hash(messages, model, **kwargs)
        if key in self.cache:
            self.hits += 1
            return self.cache[key]
        self.misses += 1
        return None

    def set(self, messages, model, response, **kwargs):
        """设置缓存"""
        if len(self.cache) >= self.max_size:
            # LRU 淘汰
            oldest = next(iter(self.cache))
            del self.cache[oldest]

        key = self._hash(messages, model, **kwargs)
        self.cache[key] = response

    @property
    def hit_rate(self):
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0
```

## 语义缓存

语义缓存基于嵌入相似度匹配，而非精确匹配：

```python
class SemanticCache:
    """语义缓存"""

    def __init__(self, similarity_threshold=0.95, embedding_fn=None):
        self.threshold = similarity_threshold
        self.embedding_fn = embedding_fn
        self.entries = []  # [(embedding, response)]

    def get(self, query):
        """获取语义相似的缓存"""
        if not self.entries:
            return None

        query_emb = self.embedding_fn(query)

        best_score = 0
        best_response = None

        for emb, response in self.entries:
            score = cosine_similarity(query_emb, emb)
            if score > best_score:
                best_score = score
                best_response = response

        if best_score >= self.threshold:
            return best_response
        return None

    def set(self, query, response):
        """添加到缓存"""
        emb = self.embedding_fn(query)
        self.entries.append((emb, response))
```

## 模型路由

根据任务复杂度路由到不同成本的模型：

```python
class ModelRouter:
    """模型路由器"""

    def __init__(self):
        self.models = {
            'simple': 'gpt-4o-mini',     # $0.15/$0.60 per M
            'medium': 'gpt-4o',           # $2.50/$10.00 per M
            'complex': 'gpt-4o',          # $2.50/$10.00 per M
        }

    def route(self, messages):
        """路由到合适的模型"""
        complexity = self._assess_complexity(messages)

        if complexity <= 0.3:
            return self.models['simple']
        elif complexity <= 0.7:
            return self.models['medium']
        else:
            return self.models['complex']

    def _assess_complexity(self, messages):
        """评估任务复杂度（0-1）"""
        text = " ".join(m['content'] for m in messages)

        score = 0
        # 长度指标
        if len(text) > 2000:
            score += 0.3
        elif len(text) > 500:
            score += 0.15

        # 关键词指标
        complex_keywords = ['分析', '推理', '比较', '评估', '设计', '优化']
        simple_keywords = ['翻译', '总结', '格式化', '提取']

        for kw in complex_keywords:
            if kw in text:
                score += 0.2
        for kw in simple_keywords:
            if kw in text:
                score -= 0.1

        return max(0, min(1, score))
```

## 成本追踪

```python
class CostTracker:
    """成本追踪器"""

    def __init__(self):
        self.costs = []
        self.pricing = {
            'gpt-4o': {'input': 2.50 / 1e6, 'output': 10.00 / 1e6},
            'gpt-4o-mini': {'input': 0.15 / 1e6, 'output': 0.60 / 1e6},
        }

    def record(self, model, input_tokens, output_tokens):
        """记录一次调用的成本"""
        price = self.pricing[model]
        cost = (input_tokens * price['input'] +
                output_tokens * price['output'])
        self.costs.append({
            'model': model,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'cost': cost,
        })
        return cost

    def summary(self):
        """汇总成本"""
        total = sum(c['cost'] for c in self.costs)
        by_model = {}
        for c in self.costs:
            by_model.setdefault(c['model'], 0)
            by_model[c['model']] += c['cost']

        return {
            'total_cost': total,
            'total_calls': len(self.costs),
            'by_model': by_model,
            'avg_cost_per_call': total / max(len(self.costs), 1),
        }
```

## 关键术语

| 术语     | 通俗说法       | 实际含义                         |
| -------- | -------------- | -------------------------------- |
| 精确缓存 | "完全匹配缓存" | 相同输入直接返回缓存结果         |
| 语义缓存 | "意思相近缓存" | 基于嵌入相似度匹配的缓存         |
| 模型路由 | "按需选模型"   | 根据任务复杂度选择不同成本的模型 |
| 速率限制 | "限流"         | 控制单位时间内的 API 调用次数    |

## 延伸阅读

- [OpenAI Pricing](https://openai.com/api/pricing/) -- OpenAI API 定价
- [GPTCache](https://github.com/zilliztech/GPTCache) -- 开源 LLM 缓存库
- [Portkey](https://portkey.ai/) -- LLM 网关和成本管理平台
