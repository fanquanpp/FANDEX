---
title: '结构化输出 — JSON Schema、Pydantic、Zod、约束解码'
description: '掌握约束解码保证JSON Schema合规的机制，处理拒绝、解析错误和模式违反三种失败模式'
module: agent
difficulty: intermediate
tags:
  - 结构化输出
  - 'JSON Schema'
  - Pydantic
  - Zod
  - 约束解码
related:
  - agent/交接与例程
  - agent/角色专业化
  - agent/浏览器Agent与间接注入
  - agent/评估驱动Agent开发
prerequisites:
  - agent/概述与架构
---

# 结构化输出 — JSON Schema、Pydantic、Zod、约束解码

> "请模型友好地返回JSON"在前沿模型上也有5%到15%的失败率。结构化输出通过约束解码弥合这一差距：模型在字面上被阻止发出违反模式的token。OpenAI的严格模式、Anthropic的模式类型化工具使用、Gemini的 `responseSchema`、Pydantic AI的 `output_type` 和Zod的 `.parse` 是同一理念的五种表面形式。本课构建模式验证器和严格模式契约，学习者将在每个生产提取管道中使用。

**类型：** 构建
**语言：** Python（标准库，JSON Schema 2020-12子集）
**前置条件：** Phase 13 · 02（函数调用深入）
**时间：** ~75分钟

## 学习目标

- 使用正确的约束（enum、min/max、required、pattern）为提取目标编写JSON Schema 2020-12。
- 解释为什么严格模式和约束解码给出与"生成后验证"不同的保证。
- 区分三种失败模式：解析错误、模式违反、模型拒绝。
- 发布带有类型化修复和类型化拒绝处理的提取管道。

## 问题所在

阅读采购订单邮件的Agent需要将自由文本转换为 `{customer, line_items, total_usd}`。三种方法。

**方法一：提示返回JSON。** "以JSON回复，包含字段customer、line_items、total_usd。"在前沿模型上85%到95%的时间有效。以六种方式失败：缺少大括号、尾随逗号、错误类型、幻觉字段、在token限制处截断、泄漏散文如"这是你的JSON："。

**方法二：生成后验证。** 自由生成，解析，根据模式验证，失败时重试。可靠但昂贵 — 你为每次重试付费，截断bug每次发生花费一个额外轮次。

**方法三：约束解码。** 提供商在解码时强制模式。无效token从采样分布中被屏蔽。输出保证解析和验证。失败坍缩为一种模式：拒绝（模型决定输入不适合模式）。

每个2026年前沿提供商都提供某种形式的方法三。

- **OpenAI。** `response_format: {type: "json_schema", strict: true}` 加上响应中的 `refusal`。
- **Anthropic。** `tool_use` 输入上的模式强制；`stop_reason: "refusal"` 不存在，但没有工具调用的 `end_turn` 是信号。
- **Gemini。** 请求级 `responseSchema`；2026年Gemini为选定类型提供token级语法约束。
- **Pydantic AI。** `output_type=InvoiceModel` 发出类型化为 `InvoiceModel` 的结构化 `RunResult`。
- **Zod（TypeScript）。** 运行时解析器，根据Zod模式验证提供商输出；与OpenAI的 `beta.chat.completions.parse` 配对。

共同线索：声明一次模式，端到端强制。

## 核心概念

### JSON Schema 2020-12 — 通用语言

每个提供商都接受JSON Schema 2020-12。你最常用的构造：

- `type`：`object`、`array`、`string`、`number`、`integer`、`boolean`、`null` 之一。
- `properties`：字段名到子模式的映射。
- `required`：必须出现的字段名列表。
- `enum`：允许值的封闭集合。
- `minimum` / `maximum`（数字），`minLength` / `maxLength` / `pattern`（字符串）。
- `items`：应用于每个数组元素的子模式。
- `additionalProperties`：`false` 禁止额外字段（默认值因模式而异）。

OpenAI严格模式添加三个要求：每个属性必须列在 `required` 中，到处 `additionalProperties: false`，无未解析的 `$ref`。如果你违反这些，API在请求时返回400。

### Pydantic，Python绑定

Pydantic v2通过 `model_json_schema()` 从数据类形状的模型生成JSON Schema。Pydantic AI包装了这一点，所以你写：

```python
class Invoice(BaseModel):
    customer: str
    line_items: list[LineItem]
    total_usd: Decimal
```

Agent框架将模式翻译为OpenAI严格模式、Anthropic `input_schema` 或Gemini `responseSchema`。模型输出作为类型化的 `Invoice` 实例返回。验证错误引发带有类型化错误路径的 `ValidationError`。

### Zod，TypeScript绑定

Zod（`z.object({customer: z.string(), ...})`）是TS等价物。OpenAI的Node SDK暴露 `zodResponseFormat(Invoice)`，翻译为API的JSON Schema负载。

### 拒绝

严格模式不能强制模型回答。如果输入不适合模式（"邮件是一首诗，不是发票"），模型发出包含原因的 `refusal` 字段。你的代码必须将其作为一等结果处理，而不是失败。拒绝也作为安全信号有用：被要求从受保护内容邮件中提取信用卡号的模型返回附带安全原因的拒绝。

### 开放中的约束解码

开放权重实现使用三种技术。

1. **基于语法的解码**（`outlines`、`guidance`、`lm-format-enforcer`）：从模式构建确定性有限自动机；在每一步，屏蔽会违反FSM的token的logits。
2. **带JSON解析器的Logit屏蔽**：与模型同步运行流式JSON解析器；在每一步，计算有效下一token集合。
3. **带验证器的推测解码**：廉价草稿模型提出token，验证器强制模式。

商业提供商在幕后选择其中之一。2026年的最新技术对于短结构化输出比普通生成更快，对于长的大致相同速度。

### 三种失败模式

1. **解析错误。** 输出不是有效JSON。在严格模式下不可能发生。在非严格提供商上仍可能发生。
2. **模式违反。** 输出解析但违反模式。在严格模式下不可能发生。在之外很常见。
3. **拒绝。** 模型拒绝。必须作为类型化结果处理。

### 重试策略

当你在严格模式之外（Anthropic工具使用、非严格OpenAI、旧版Gemini）时，恢复模式是：

```
generate -> parse -> validate -> if fail, inject error and retry, max 3x
```

一次重试通常足够。三次重试捕获弱模型的不稳定。超过三次是模式有问题的信号：模型无法为某些输入满足它，提示或模式需要修复。

### 小模型支持

约束解码在小模型上有效。一个带语法强制的3B参数开放模型在结构化任务上优于带原始提示的70B参数模型。这是结构化输出对生产重要的主要原因：它将可靠性与模型大小解耦。

## 实践

`code/main.py` 提供标准库中最小的JSON Schema 2020-12验证器（类型、必需、枚举、最小/最大、模式、项目、additionalProperties）。它包装一个 `Invoice` 模式并通过验证器运行假LLM输出，演示解析错误、模式违反和拒绝路径。在生产中将假输出替换为任何提供商的真实响应。

关注点：

- 验证器返回带有路径和消息的类型化 `[ValidationError]` 列表。这是你想要呈现给重试提示的形状。
- 拒绝分支不重试。它记录并返回类型化拒绝。Phase 14 · 09使用拒绝作为安全信号。
- `additionalProperties: false` 检查在对抗性测试输入上触发，展示为什么严格模式关闭了幻觉字段的大门。

## 交付

本课产生 `outputs/skill-structured-output-designer.md`。给定一个自由文本提取目标（发票、支持工单、简历等），该技能生成兼容严格模式的JSON Schema 2020-12和镜像它的Pydantic模型，并带有类型化拒绝和重试处理存根。

## 练习

1. 运行 `code/main.py`。添加第四个测试用例，其 `total_usd` 为负数。确认验证器用 `minimum` 约束路径拒绝它。

2. 扩展验证器以支持带判别器的 `oneOf`。常见情况：`line_item` 是产品或服务，由 `kind` 标记。严格模式在这里有微妙的规则；查看OpenAI的结构化输出指南。

3. 将相同的Invoice模式写成Pydantic BaseModel，并将 `model_json_schema()` 输出与你手写的模式比较。识别Pydantic默认设置而手写版本省略的一个字段。

4. 测量拒绝率。构造十个不应可提取的输入（歌词、数学证明、空白邮件），并通过带严格模式的真实提供商运行它们。计算拒绝与幻觉输出的数量。这是你拒绝感知重试的基准真相。

5. 从头到尾阅读OpenAI的结构化输出指南。识别它在严格模式中明确禁止而普通JSON Schema允许的一个构造。然后设计一个非必要地使用该禁止构造的模式，并将其重构为严格兼容。

## 关键术语

| 术语                          | 人们怎么说           | 实际含义                                |
| ----------------------------- | -------------------- | --------------------------------------- |
| JSON Schema 2020-12           | "模式规范"           | 每个现代提供商使用的IETF草案模式方言    |
| Strict mode                   | "保证模式"           | OpenAI标志，通过约束解码强制模式        |
| Constrained decoding          | "Logit屏蔽"          | 解码时强制，屏蔽无效的下一token         |
| Refusal                       | "模型拒绝"           | 输入不适合模式时的类型化结果            |
| Parse error                   | "无效JSON"           | 输出未解析为JSON；严格模式下不可能      |
| Schema violation              | "错误形状"           | 解析但违反类型/必需/枚举/范围           |
| `additionalProperties: false` | "不允许额外"         | 禁止未知字段；OpenAI严格模式要求        |
| Pydantic BaseModel            | "类型化输出"         | 发出和验证JSON Schema的Python类         |
| Zod schema                    | "TypeScript输出类型" | 用于提供商输出验证的TS运行时模式        |
| Grammar enforcement           | "开放权重约束解码"   | 基于FSM的logit屏蔽，如outlines/guidance |

## 延伸阅读

- [OpenAI — Structured outputs](https://platform.openai.com/docs/guides/structured-outputs) — 严格模式、拒绝和模式要求
- [OpenAI — Introducing structured outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) — 2024年8月发布文章解释解码保证
- [Pydantic AI — Output](https://ai.pydantic.dev/output/) — 序列化为每个提供商的类型化output_type绑定
- [JSON Schema — 2020-12 release notes](https://json-schema.org/draft/2020-12/release-notes) — 权威规范
- [Microsoft — Structured outputs in Azure OpenAI](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs) — 企业部署注意事项和严格模式注意事项
