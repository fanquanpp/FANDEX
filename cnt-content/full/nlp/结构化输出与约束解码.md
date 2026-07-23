---
title: 结构化输出与约束解码
description: 理解约束解码、Outlines、XGrammar和Instructor的结构化输出技术栈
module: nlp
difficulty: intermediate
tags:
  - 结构化输出
  - 约束解码
  - Outlines
  - 'JSON Schema'
  - Instructor
related:
  - nlp/关系抽取与知识图谱
  - nlp/机器翻译
  - nlp/聊天机器人
  - nlp/命名实体识别
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 结构化输出与约束解码

> 让LLM返回JSON。大多数时候能得到JSON。在生产中，"大多数"就是问题。约束解码将"大多数"变成"总是"，通过在采样前编辑logits。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 17（聊天机器人），Phase 5 · 19（子词分词）
**时间:** ~60 分钟

## 问题

分类器提示LLM："返回 {positive, negative, neutral} 之一。"模型返回"The sentiment is positive — this review is overwhelmingly favorable because the customer explicitly states that they ..."。你的解析器崩溃。分类器的F1为0.0。

自由形式生成不是契约。它是建议。生产系统需要契约。

2026年存在三层：

1. **提示。** 礼貌地要求。"只返回JSON对象。"在前沿模型上约80%有效，较小模型更差。
2. **原生结构化输出API。** OpenAI `response_format`、Anthropic工具使用、Gemini JSON模式。在支持的schema上可靠。供应商锁定。
3. **约束解码。** 在每个生成步骤修改logits，使模型*不能*发出无效token。构造上100%有效。适用于任何本地模型。

本课程为三者建立直觉并命名何时选择哪个。

## 概念

**约束解码如何工作。** 在每个生成步骤，LLM在完整词表（约100k token）上产生logit向量。*logit处理器*位于模型和采样器之间。它计算给定目标语法（JSON Schema、正则、上下文无关文法）中当前位置哪些token有效，并将所有无效token的logits设为负无穷。剩余logits上的softmax只将概率质量放在有效延续上。

2026年实现：

- **Outlines。** 将JSON Schema或正则编译为有限状态机。每个token获得O(1)的有效下一token查找。基于FSM，所以递归schema需要展平。
- **XGrammar / llguidance。** 上下文无关文法引擎。处理递归JSON Schema。接近零解码开销。OpenAI在2025年结构化输出实现中致谢了llguidance。
- **vLLM引导解码。** 通过Outlines、XGrammar或lm-format-enforcer后端内置 `guided_json`、`guided_regex`、`guided_choice`、`guided_grammar`。
- **Instructor。** 基于Pydantic的LLM包装器。验证失败时重试。跨供应商，但不修改logits — 依赖重试 + 结构化输出感知提示。

### 反直觉结果

约束解码通常比无约束生成*更快*。两个原因。首先，它缩小了下一token搜索空间。其次，聪明的实现对强制token完全跳过token生成（如 `{"name": "` 这样的脚手架 — 每个字节都是确定的）。

### 代价昂贵的陷阱

字段顺序很重要。把 `answer` 放在 `reasoning` 之前，模型在思考之前就承诺了答案。JSON有效。答案错误。没有验证能捕获这个。

```json
// 差
{"answer": "yes", "reasoning": "because ..."}

// 好
{"reasoning": "... therefore ...", "answer": "yes"}
```

Schema字段顺序是逻辑，不是格式。

## 构建它

### 步骤 1：从零构建正则约束生成

```python
def mask_logits(logits, valid_token_ids):
    mask = [float("-inf")] * len(logits)
    for tid in valid_token_ids:
        mask[tid] = logits[tid]
    return mask


def generate_constrained(model, tokenizer, prompt, fsm):
    ids = tokenizer.encode(prompt)
    state = fsm.initial_state
    while not fsm.is_accept(state):
        logits = model.next_token_logits(ids)
        valid = fsm.valid_tokens(state, tokenizer)
        logits = mask_logits(logits, valid)
        tok = sample(logits)
        ids.append(tok)
        state = fsm.transition(state, tok)
    return tokenizer.decode(ids)
```

FSM跟踪到目前为止我们满足了语法的哪些部分。`valid_tokens(state, tokenizer)` 计算哪些词表token可以推进FSM而不离开接受路径。

### 步骤 2：Outlines用于JSON Schema

```python
from pydantic import BaseModel
from typing import Literal
import outlines


class Review(BaseModel):
    sentiment: Literal["positive", "negative", "neutral"]
    confidence: float
    evidence_span: str


model = outlines.models.transformers("meta-llama/Llama-3.2-3B-Instruct")
generator = outlines.generate.json(model, Review)

result = generator("Classify: 'The wait staff was attentive and the food arrived hot.'")
print(result)
```

零验证错误。永远。FSM使无效输出不可达。

### 步骤 3：Instructor用于供应商无关的Pydantic

```python
import instructor
from anthropic import Anthropic
from pydantic import BaseModel, Field


class Invoice(BaseModel):
    vendor: str
    total_usd: float = Field(ge=0)
    line_items: list[str]


client = instructor.from_anthropic(Anthropic())
invoice = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=1024,
    response_model=Invoice,
    messages=[{"role": "user", "content": "Extract from: 'Acme Corp $420. Widget, Gizmo.'"}],
)
```

不同机制。Instructor不触碰logits。它将schema格式化到提示中，解析输出，验证失败时重试（默认3次）。适用于任何供应商。重试增加延迟和成本。跨供应商可移植性是卖点。

### 步骤 4：原生供应商API

```python
from openai import OpenAI

client = OpenAI()
response = client.responses.create(
    model="gpt-5",
    input=[{"role": "user", "content": "Classify: 'The food was cold.'"}],
    text={"format": {"type": "json_schema", "name": "sentiment",
          "schema": {"type": "object", "required": ["sentiment"],
                     "properties": {"sentiment": {"type": "string",
                                                  "enum": ["positive", "negative", "neutral"]}}}}},
)
print(response.output_parsed)
```

服务器端约束解码。与Outlines在支持的schema上可靠性相当。无需本地模型管理。锁定供应商。

## 陷阱

- **递归schema。** Outlines将递归展平到固定深度。树结构输出（嵌套评论、AST）需要XGrammar或llguidance（基于CFG）。
- **巨大枚举。** 10,000选项枚举编译缓慢或超时。切换到检索器：先预测top-k候选，约束到那些。
- **语法太严格。** 强制 `date: "YYYY-MM-DD"` 正则，模型无法为缺失日期输出"unknown"。模型通过发明日期补偿。允许 `null` 或哨兵值。
- **过早承诺。** 参见上面的字段顺序陷阱。始终把推理放前面。
- **无schema的供应商JSON模式。** 纯JSON模式只保证有效JSON，不保证对*你的用例*有效。始终提供完整schema。

## 使用它

2026年技术栈：

| 情况                                    | 选择                    |
| --------------------------------------- | ----------------------- |
| OpenAI/Anthropic/Google模型，简单schema | 原生供应商结构化输出    |
| 任何供应商，Pydantic工作流，可容忍重试  | Instructor              |
| 本地模型，需要100%有效性，扁平schema    | Outlines (FSM)          |
| 本地模型，递归schema                    | XGrammar或llguidance    |
| 自托管推理服务器                        | vLLM引导解码            |
| 批处理可接受重试                        | Instructor + 最便宜模型 |

## 交付它

将结果保存为 `outputs/skill-structured-output-picker.md`。

## 练习

1. **简单。** 在无约束解码下提示小型开放权重模型（如Llama-3.2-3B）生成 `Review(sentiment, confidence, evidence_span)`。测量100条评论中有效JSON的比例。
2. **中等。** 相同语料使用Outlines JSON模式。比较合规率、延迟和语义准确率。
3. **困难。** 从零实现电话号码（`\d{3}-\d{3}-\d{4}`）的正则约束解码器。验证1000个样本中0个无效输出。

## 关键术语

| 术语           | 通俗说法         | 实际含义                                    |
| -------------- | ---------------- | ------------------------------------------- |
| 约束解码       | 强制有效输出     | 在每个生成步骤遮蔽无效token的logits。       |
| Logit处理器    | 约束的那个东西   | 函数：`(logits, state) -> masked_logits`。  |
| FSM            | 有限状态机       | 编译的语法表示；O(1)有效下一token查找。     |
| CFG            | 上下文无关文法   | 处理递归的文法；比FSM慢但更表达。           |
| Schema字段顺序 | 有关系吗？       | 是 — 第一个字段先承诺；始终把推理放答案前。 |
| 引导解码       | vLLM的叫法       | 相同概念，集成到推理服务器。                |
| JSON模式       | OpenAI的早期版本 | 保证JSON语法；不保证schema匹配。            |

## 延伸阅读

- [Willard, Louf (2023). Efficient Guided Generation for LLMs](https://arxiv.org/abs/2307.09702) — Outlines论文。
- [XGrammar论文 (2024)](https://arxiv.org/abs/2411.15100) — 快速基于CFG的约束解码。
- [vLLM — 结构化输出](https://docs.vllm.ai/en/latest/features/structured_outputs.html) — 推理服务器集成。
- [OpenAI — 结构化输出指南](https://platform.openai.com/docs/guides/structured-outputs) — API参考 + 陷阱。
- [Instructor库](https://python.useinstructor.com/) — 跨供应商的Pydantic + 重试。
