---
title: 并行与流式工具调用
description: 掌握并行工具调用的扇出执行和流式参数重组，理解id关联陷阱和依赖调度
module: agent
difficulty: intermediate
tags:
  - 并行工具调用
  - 流式传输
  - id关联
  - 性能优化
related:
  - agent/编排模式
  - agent/并行群体网络
  - agent/仓库记忆与状态
  - agent/层级架构
prerequisites:
  - agent/概述与架构
---

# 并行与流式工具调用

> 三个独立的天气查询串行执行是三个往返。并行运行它们，总时间缩减到最慢的单次调用。每个前沿提供商现在在一个轮次中发出多个工具调用。收益是真实的；管道是微妙的。本课讲解两半：并行扇出和流式参数重组，重点在于id关联陷阱。

**类型：** 构建
**语言：** Python（标准库，线程池 + 流式线束）
**前置条件：** Phase 13 · 02（函数调用深入）
**时间：** ~75分钟

## 学习目标

- 解释 `parallel_tool_calls: true` 存在的原因以及何时禁用它。
- 在并行扇出期间将流式参数块关联到正确的工具调用id。
- 将部分 `arguments` 字符串重组为完整JSON而不提前解析。
- 运行三城市天气基准测试，展示串行与并行延迟对比。

## 问题所在

没有并行调用，回答"班加罗尔、东京和苏黎世的天气如何"的Agent这样做：

```
user -> LLM
LLM -> call get_weather(Bengaluru)
host -> run executor, reply with result
LLM -> call get_weather(Tokyo)
host -> run executor, reply with result
LLM -> call get_weather(Zurich)
host -> run executor, reply with result
LLM -> final text answer
```

三次LLM往返，每次还要支付执行器延迟。大约是理想挂钟时间的4倍。

使用并行调用：

```
user -> LLM
LLM -> call get_weather(Bengaluru); call get_weather(Tokyo); call get_weather(Zurich)
host -> run all three executors concurrently, reply with three results
LLM -> final text answer
```

一次LLM往返。执行器时间是三者的最大值，不是总和。OpenAI、Anthropic和Gemini上的生产基准测试显示，扇出工作负载的挂钟时间减少60%到70%。

代价是关联复杂性。当三个调用乱序完成时，你的结果必须携带匹配的 `tool_call_id`，以便模型可以对齐。当结果流式传输时，你必须在执行之前将部分参数片段组装为完整JSON。Gemini 3添加唯一id部分是为了解决一个实际问题：两个对同一工具的并行调用无法区分。

## 核心概念

### 启用并行

- **OpenAI。** `parallel_tool_calls: true` 默认开启。设为 `false` 强制串行。
- **Anthropic。** 通过 `disable_parallel_tool_use: false` 并行（Claude 3.5及以上默认）。设为 `true` 串行。
- **Gemini。** 始终支持并行；`tool_config.function_calling_config.mode = "AUTO"` 让模型决定。

当工具有排序依赖（`create_file` 然后 `write_file`）、一个调用的输出影响另一个的输入，或速率限制器无法处理扇出时，禁用并行。

### Id关联

模型发出的每个调用都有一个 `id`。宿主返回的每个结果必须包含相同的id。没有这个，结果是模糊的。

- **OpenAI。** 每个工具角色消息上的 `tool_call_id`。
- **Anthropic。** 每个 `tool_result` 块上的 `tool_use_id`。
- **Gemini。** 每个 `functionResponse` 上的 `id`（Gemini 3及以上；Gemini 2按名称匹配，对同名并行调用会出问题）。

### 并发运行调用

宿主在自己的线程、协程或远程工作者上运行每个调用的执行器。最简单的线束使用线程池；生产使用asyncio的 `asyncio.gather` 或结构化并发。完成顺序不可预测 — id是标识符。

一个常见bug：按调用列表顺序而非完成顺序回复结果。这通常有效，因为模型只关心 `tool_call_id`，但如果结果被丢弃或重复，乱序提交使调试更难。倾向于按完成顺序回复，带显式id。

### 流式工具调用

当模型流式传输时，`arguments` 分段到达。三个并行调用的三个独立流在线路上交错。你需要每个id一个累加器。

按提供商的形状：

- **OpenAI。** 每个块是 `choices[0].delta.tool_calls[i].function.arguments`（部分字符串）。块携带 `index`（调用列表中的位置）。你按索引累积，在 `id` 首次出现时读取，并在 `finish_reason = "tool_calls"` 时解析JSON。
- **Anthropic。** 流事件是 `message_start`，然后每个块一个 `content_block_start`，类型为 `tool_use`（包含id、name、空input）。`content_block_delta` 事件携带 `input_json_delta` 块。`content_block_stop` 关闭每个块。
- **Gemini。** `streamFunctionCallArguments`（Gemini 3及以上）发出带有 `functionCallId` 的块，使调用干净地交错。Gemini 3之前，流式传输一次返回一个完整调用。

### 部分JSON和提前解析陷阱

你不能在 `arguments` 完成之前解析它。部分JSON如 `{"city": "Beng` 无效，会抛出异常。正确的门控是提供商的调用结束信号：OpenAI的 `finish_reason = "tool_calls"`、Anthropic的 `content_block_stop` 或Gemini的流结束事件。只有那时才尝试 `json.loads`。更健壮的方法使用增量JSON解析器，在结构完成时产生事件；OpenAI的流式指南推荐这用于显示实时"思考"指示器的UX。大括号计数作为完整性测试不可靠（引号字符串或转义内容中的大括号会导致误报），只应作为非正式调试启发式使用。

### 乱序完成

```
call_A: 快速API，首先返回
call_B: 慢速API，第二返回
call_C: 中等API，第三返回
```

宿主回复仍必须引用id：

```
[{role: "tool", tool_call_id: "call_A", content: ...},
 {role: "tool", tool_call_id: "call_B", content: ...},
 {role: "tool", tool_call_id: "call_C", content: ...}]
```

回复中的顺序对OpenAI或Anthropic的正确性不重要。Gemini接受任何顺序，只要id匹配。

### 基准测试：串行 vs 并行

`code/main.py` 中的线束模拟三个执行器，延迟分别为400、600和800毫秒。串行运行总时间1800毫秒。并行运行时间为max(400, 600, 800) = 800毫秒。差异是恒定的，不是成比例的，因此节省随工具数量增长。

现实世界注意事项：并行调用给下游API施压。10路扇出到速率受限的服务会失败。Phase 13 · 17涵盖网关级背压；重试语义计划在未来阶段中。

### 流式扇出挂钟时间

如果模型本身流式传输，你可以在一个调用的参数完成后立即开始执行，而不是等待所有调用完成。这是OpenAI文档记录的优化，但并非所有SDK都暴露。本课的线束这样做：一旦模拟流产生完整的参数对象，宿主就启动该调用。

## 实践

`code/main.py` 有两半。第一半使用 `concurrent.futures.ThreadPoolExecutor` 串行和并行运行三个模拟天气调用，并打印挂钟时间。第二半重放一个假流式响应 — 三个并行调用的 `arguments` 块在一个流上交错 — 并用 `StreamAccumulator` 按id重组。无LLM、无网络，只有重组逻辑。

关注点：

- 串行计时器达到1.8秒。并行计时器在相同假延迟下达到0.8秒。
- 累加器通过按id缓冲并仅在每个调用的JSON完成时解析来处理乱序到达的块。
- 执行器在一个id的参数完成后立即启动，而不是在所有流结束后。

## 交付

本课产生 `outputs/skill-parallel-call-safety-check.md`。给定一个工具注册表，该技能审计哪些工具可以安全并行化、哪些有排序依赖、哪些会压垮下游速率限制 — 返回带有每个工具 `parallel_safe` 标志的修订注册表。

## 练习

1. 运行 `code/main.py` 并改变模拟延迟。确认并行与串行比率约为 `max/sum`（实际运行因线程调度、序列化和线束开销而略微偏离理想值）。在什么延迟分布下并行不再重要？

2. 扩展累加器以处理"调用在流中间被取消"的情况，方法是丢弃其缓冲区并发出 `cancelled` 事件。哪个提供商明确记录了这种情况？查看Anthropic的 `content_block_stop` 语义和OpenAI的 `finish_reason: "length"` 行为。

3. 用 `asyncio.gather` 替换线程池。对两者进行基准测试。如果执行器做真正的I/O，你应该在async上看到小幅优势，因为上下文切换成本更低。

4. 选择两个不应并行化的工具（例如 `create_file` 然后 `write_file`）。在注册表中添加 `ordering_dependency` 图，并在该图上门控并行扇出。这是依赖感知调度的最小机制，未来的Agent工程阶段将正式化。

5. 阅读OpenAI的并行函数调用部分和Anthropic的 `disable_parallel_tool_use` 文档。识别Anthropic建议禁用并行性的一个现实世界工具类型。（提示：对同一资源的后果性修改。）

## 关键术语

| 术语                          | 人们怎么说         | 实际含义                                  |
| ----------------------------- | ------------------ | ----------------------------------------- |
| Parallel tool calls           | "一轮扇出"         | 模型在一个assistant消息中发出多个工具调用 |
| `parallel_tool_calls`         | "OpenAI的标志"     | 启用或禁用多次调用发出                    |
| `disable_parallel_tool_use`   | "Anthropic的反向"  | 选择退出标志；默认启用并行                |
| Tool call id                  | "关联句柄"         | 结果消息必须回显的每调用标识符            |
| Accumulator                   | "流缓冲区"         | 用于部分 `arguments` 块的按id字符串缓冲区 |
| Out-of-order completion       | "最快的先完成"     | 并行调用以不可预测的顺序完成；id是粘合剂  |
| Dependency graph              | "排序约束"         | 输出馈入其他工具输入的工具；不能并行化    |
| Parse-early trap              | "JSON.parse爆炸了" | 尝试解析不完整的 `arguments` 字符串       |
| `streamFunctionCallArguments` | "Gemini 3功能"     | 带有每个调用唯一id的流式参数块            |
| Completion-order reply        | "不要等所有"       | 按结果到达顺序回复，以id为键              |

## 延伸阅读

- [OpenAI — Parallel function calling](https://platform.openai.com/docs/guides/function-calling#parallel-function-calling) — 默认行为和选择退出标志
- [Anthropic — Tool use: implementing tool use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implementing-tool-use) — `disable_parallel_tool_use` 和结果批处理
- [Google — Gemini function calling parallel section](https://ai.google.dev/gemini-api/docs/function-calling) — Gemini 3的id关联并行调用
- [OpenAI — Streaming responses with tools](https://platform.openai.com/docs/api-reference/responses-streaming) — OpenAI流的分块参数重组
- [Anthropic — Streaming messages](https://docs.anthropic.com/en/api/messages-streaming) — 带有 `input_json_delta` 的 `content_block_delta`
