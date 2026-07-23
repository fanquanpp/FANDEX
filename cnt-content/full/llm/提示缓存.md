---
title: 提示缓存
description: '理解各 LLM 提供商的提示缓存机制，优化长上下文场景的成本和延迟'
module: llm
difficulty: intermediate
tags:
  - 'prompt caching'
  - 'context caching'
  - Anthropic
  - OpenAI
  - 成本优化
related:
  - llm/梯度检查点
  - llm/提示工程
  - llm/推测解码
  - llm/推测解码EAGLE3
prerequisites:
  - llm/安全护栏
---

# 提示缓存

> 每次调用 GPT-4o 处理 10K token 的系统提示，都要重新计算。提示缓存让这些重复的前缀只计算一次——成本降低 90%，延迟降低 80%。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 11（缓存与成本）
**预计时间：** ~30 分钟

## 学习目标

- 理解各提供商的提示缓存机制
- 掌握缓存友好的提示布局
- 计算缓存的盈亏平衡点
- 理解缓存的陷阱和限制

## 各提供商缓存机制

### Anthropic（cache_control）

```python
from anthropic import Anthropic

client = Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "很长的系统提示..." * 100,
            "cache_control": {"type": "ephemeral"}  # 标记为可缓存
        }
    ],
    messages=[
        {"role": "user", "content": "你好"}
    ],
)
```

缓存命中时：输入成本降低 90%（$3.00 → $0.30 per M token）。

### OpenAI（自动缓存）

OpenAI 对长提示自动缓存，无需额外配置：

- 提示长度 >= 1024 token
- 提示前缀与近期请求匹配
- 缓存命中时输入成本降低 50%

### Gemini（CachedContent）

```python
from google.cloud import aiplatform

# 创建缓存
cached_content = aiplatform.CachedContent.create(
    model_name="gemini-1.5-pro",
    contents=[...],
    ttl=3600,  # 缓存 1 小时
)
```

## 缓存友好的提示布局

```
[可缓存部分 - 固定不变]     ← 放在最前面
  系统提示
  工具定义
  Few-shot 示例
  RAG 检索的文档

[不可缓存部分 - 每次不同]   ← 放在最后
  对话历史
  当前用户消息
```

**关键原则：** 将不变的上下文放在提示的前缀部分，变化的放在后缀部分。

## 盈亏平衡计算

缓存写入有额外成本（Anthropic 多收 25%）。盈亏平衡点：

$$n = \frac{\text{写入额外成本}}{\text{每次节省成本}} = \frac{0.25}{0.90} \approx 0.28$$

即：只要同一提示使用超过 2 次，缓存就划算。

## 陷阱

1. **缓存未命中不报错**——只是按正常价格计费
2. **缓存有 TTL**——过期后需要重新写入
3. **前缀必须完全匹配**——一个字符的差异导致缓存失效
4. **最小长度要求**——短提示无法触发缓存

## 关键术语

| 术语          | 通俗说法   | 实际含义                                 |
| ------------- | ---------- | ---------------------------------------- |
| 提示缓存      | "前缀缓存" | 缓存提示的前缀部分，避免重复计算         |
| cache_control | "缓存标记" | Anthropic 的缓存控制标记                 |
| TTL           | "过期时间" | 缓存的存活时间                           |
| 盈亏平衡      | "回本点"   | 缓存写入额外成本被节省成本抵消的使用次数 |

## 延伸阅读

- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) -- Anthropic 缓存文档
- [OpenAI Caching](https://platform.openai.com/docs/guides/prompt-caching) -- OpenAI 缓存文档
- [Gemini Context Caching](https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache) -- Gemini 缓存文档
