---
title: 提示工程
description: '掌握 LLM 提示工程的核心技术，包括系统提示、角色设定、约束条件和输出格式控制'
module: llm
difficulty: beginner
tags:
  - 'prompt engineering'
  - 提示工程
  - 'system prompt'
  - 输出控制
related:
  - llm/数据流水线
  - llm/梯度检查点
  - llm/提示缓存
  - llm/推测解码
prerequisites:
  - llm/安全护栏
---

# 提示工程

> 提示工程是与 LLM 交互的艺术和科学。同一个模型，不同的提示可以产生天差地别的输出。掌握提示工程是构建 LLM 应用的基础。

**类型：** 构建
**语言：** Python
**前置条件：** 无
**预计时间：** ~45 分钟

## 学习目标

- 理解系统提示、用户提示和助手回复的结构
- 掌握提示设计的核心原则：清晰、具体、有约束
- 实现结构化输出控制
- 理解提示工程的局限性

## 提示结构

```
System Prompt:  定义角色、行为规则和输出格式
User Prompt:    用户的实际请求
Assistant:      模型的回复
```

## 核心原则

**1. 具体优于模糊**

```
差: "写一篇文章"
好: "写一篇 500 字的技术博客，主题是 Python 异步编程，
    目标读者是有 1-2 年经验的开发者，风格简洁专业"
```

**2. 提供示例（Few-shot）**

```
将以下文本分类为正面/负面/中性：

示例1: "这个产品太棒了！" → 正面
示例2: "服务态度很差" → 负面
示例3: "今天天气一般" → 中性

输入: "价格还可以，但质量一般"
输出:
```

**3. 约束输出格式**

```python
SYSTEM_PROMPT = """你是一个数据提取助手。从用户输入中提取信息，严格按以下 JSON 格式输出：

{
  "name": "人名",
  "date": "日期（YYYY-MM-DD格式）",
  "amount": "金额（数字）",
  "currency": "货币类型"
}

规则：
- 如果某个字段缺失，设为 null
- 日期必须转换为 YYYY-MM-DD 格式
- 金额只保留数字，不含货币符号
- 不要输出任何 JSON 以外的内容"""
```

**4. 分步推理**

````
请按以下步骤分析这段代码：

1. 首先识别代码的主要功能
2. 然后找出潜在的 bug
3. 接着评估代码风格
4. 最后给出改进建议

代码：
```python
def process(data):
    result = []
    for i in range(len(data)):
        if data[i] != None:
            result.append(data[i].strip())
    return result
````

````

## 高级技巧

**角色设定。** 给模型一个明确的角色可以显著改善输出质量：

```python
SYSTEM_PROMPT = """你是一位有 20 年经验的高级 Python 开发者。
你遵循 PEP 8 规范，偏好类型注解，使用 f-string 而非 format()。
回答时先给出简洁的解决方案，再解释原理。"""
````

**思维链（CoT）。** 让模型先思考再回答：

```
请仔细思考以下问题，先展示推理过程，再给出最终答案。

问题：一个水池有两个进水管和一个出水管。A管单独注满需要6小时，
B管单独注满需要8小时，出水管单独放完需要12小时。
如果三管同时打开，多久能注满水池？
```

**自我检查。** 让模型验证自己的输出：

```
完成翻译后，请检查：
1. 是否有遗漏的句子
2. 术语翻译是否一致
3. 语气是否与原文匹配
如有问题，请修正后重新输出。
```

## 关键术语

| 术语          | 通俗说法     | 实际含义                                   |
| ------------- | ------------ | ------------------------------------------ |
| System Prompt | "系统指令"   | 定义模型角色和行为规则的高优先级提示       |
| Few-shot      | "给几个例子" | 在提示中提供示例以引导模型输出格式和风格   |
| CoT           | "先想后答"   | Chain-of-Thought，让模型展示推理过程       |
| 约束          | "限制条件"   | 对模型输出的格式、长度、内容范围的明确限制 |

## 延伸阅读

- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering) -- OpenAI 官方提示工程指南
- [Anthropic Prompt Engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) -- Anthropic 提示工程文档
- [White et al., 2023 -- "A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT"](https://arxiv.org/abs/2302.11382) -- 提示模式目录
