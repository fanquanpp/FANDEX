---
title: 结构化输出
description: '理解如何让 LLM 生成可靠的结构化输出，包括 JSON Schema、函数调用和约束解码'
module: llm
difficulty: intermediate
tags:
  - 'structured output'
  - 'JSON Schema'
  - 约束解码
  - 输出控制
related:
  - llm/函数调用
  - llm/缓存与成本
  - llm/开源模型架构详解
  - llm/扩展与分布式训练
prerequisites:
  - llm/安全护栏
---

# 结构化输出

> LLM 默认输出自由文本。但你的应用需要 JSON、表格或特定格式。让 LLM 可靠地输出结构化数据是构建生产应用的关键。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 01（提示工程）
**预计时间：** ~45 分钟

## 学习目标

- 掌握三种结构化输出方法：提示工程、函数调用、约束解码
- 理解 JSON Schema 在结构化输出中的作用
- 实现 Pydantic 模型驱动的输出验证
- 理解各方法的可靠性对比

## 三种方法对比

| 方法     | 可靠性 | 速度 | 灵活性 | 适用场景     |
| -------- | ------ | ---- | ------ | ------------ |
| 提示工程 | 80-90% | 快   | 高     | 简单格式     |
| 函数调用 | 95%+   | 中   | 中     | API 集成     |
| 约束解码 | 100%   | 慢   | 低     | 严格格式要求 |

## 方法 1：提示工程

```python
STRUCTURED_PROMPT = """从以下文本中提取信息，严格按 JSON 格式输出。

输出格式：
{
  "entities": [
    {"name": "实体名", "type": "人名/组织/地点", "role": "角色描述"}
  ],
  "relations": [
    {"subject": "主体", "predicate": "关系", "object": "客体"}
  ],
  "summary": "一句话摘要"
}

规则：
- 只输出 JSON，不要输出任何其他内容
- 不要添加 markdown 代码块标记
- 字段缺失时使用 null

输入文本：{text}"""
```

## 方法 2：函数调用

```python
from openai import OpenAI

client = OpenAI()

tools = [
    {
        "type": "function",
        "function": {
            "name": "extract_info",
            "description": "从文本中提取结构化信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "entities": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "type": {"type": "string", "enum": ["人名", "组织", "地点"]},
                                "role": {"type": "string"},
                            },
                            "required": ["name", "type"],
                        },
                    },
                    "summary": {"type": "string"},
                },
                "required": ["entities", "summary"],
            },
        },
    }
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "苹果公司CEO蒂姆·库克在加州发布了新iPhone"}],
    tools=tools,
    tool_choice={"type": "function", "function": {"name": "extract_info"}},
)

import json
result = json.loads(response.choices[0].message.tool_calls[0].function.arguments)
```

## 方法 3：约束解码

使用 `instructor` 库实现 Pydantic 模型驱动的输出：

```python
import instructor
from pydantic import BaseModel
from typing import List, Optional


class Entity(BaseModel):
    name: str
    type: str
    role: Optional[str] = None


class ExtractionResult(BaseModel):
    entities: List[Entity]
    summary: str


# 使用 instructor 包装客户端
client = instructor.from_openai(OpenAI())

result = client.chat.completions.create(
    model="gpt-4o",
    response_model=ExtractionResult,
    messages=[{"role": "user", "content": "苹果公司CEO蒂姆·库克在加州发布了新iPhone"}],
)

print(result.entities)
# [Entity(name='蒂姆·库克', type='人名', role='苹果公司CEO'), Entity(name='苹果公司', type='组织', role=None)]
```

## 关键术语

| 术语        | 通俗说法     | 实际含义                                          |
| ----------- | ------------ | ------------------------------------------------- |
| 结构化输出  | "格式化输出" | LLM 按照预定义的格式（如 JSON Schema）输出数据    |
| 约束解码    | "强制格式"   | 在解码过程中限制 token 选择，确保输出符合语法规则 |
| JSON Schema | "JSON 模板"  | 定义 JSON 数据结构的规范，用于验证和约束输出      |

## 延伸阅读

- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) -- OpenAI 结构化输出文档
- [instructor 库](https://github.com/jxnl/instructor) -- Pydantic 驱动的 LLM 结构化输出库
- [Outlines](https://github.com/dottxt-ai/outlines) -- 约束解码库
