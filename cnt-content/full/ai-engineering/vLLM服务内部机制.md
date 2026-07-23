---
title: vLLM服务内部：PagedAttention、连续批处理、分块预填充
description: 深入理解vLLM三大核心优化机制及其调度器工作原理
module: 'ai-engineering'
difficulty: intermediate
tags:
  - vLLM
  - PagedAttention
  - 连续批处理
  - 分块预填充
  - KV缓存
  - 调度器
related:
  - 'ai-engineering/SGLang与RadixAttention'
  - 'ai-engineering/TensorRT-LLM与Blackwell'
  - 'ai-engineering/vLLM生产栈与LMCache'
  - 'ai-engineering/Whisper架构与微调'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# vLLM服务内部：PagedAttention、连续批处理、分块预填充

> vLLM在2026年的主导地位基于三个复合默认值，不是单一技巧。PagedAttention始终开启。连续批处理在解码迭代之间注入新请求到活跃批次。分块预填充切片长prompt使解码token永不饥饿。三个全开后Llama 3.3 70B FP8在单个H100 SXM5上128并发推送2,200-2,400 tok/s——比vLLM自身默认高约25%，比朴素PyTorch循环高3-4倍。本课程以你可以画图的水平阅读调度器和注意力核，以`code/main.py`中按vLLM方式调度预填充和解码的toy连续批处理器结束。

**类型:** 学习
**语言:** Python (stdlib, toy连续批处理调度器)
**前置知识:** Phase 17 · 01 (模型服务), Phase 11 (LLM工程)
**时间:** ~75分钟

## 学习目标

- 解释PagedAttention作为KV缓存分配器：块、块表以及为什么生产负载下碎片率保持4%以下。
- 画出迭代级别的连续批处理：完成的序列如何离开批次和新序列如何加入而无需排空。
- 用一句话描述分块预填充并命名它保护哪个延迟指标(提示：是TTFT尾部，非平均吞吐)。
- 说出2026年vLLM v0.18.0中同时启用所有优化会咬人的坑。

## 问题

朴素PyTorch服务循环一次运行一个请求：分词、预填充、解码到EOS、返回。一个用户时可行。一百个时，是耐心人群的队列。明显修复——静态批处理——将每个请求pad到窗口中最长prompt，将每个解码pad到最长预期输出，并在最慢序列上停滞整个批次。你为从未使用的padding付费，快请求等慢请求。

vLLM一次解决三个问题。PagedAttention阻止KV缓存碎片像经典连续分配那样吃掉60-80%的GPU内存。连续批处理让请求在每个解码迭代之间加入和离开批次，所以批次总是充满真正的工作。分块预填充将32k token prompt分成约512 token的切片与解码交错，所以长prompt不冻结GPU上每个解码token。

2026年生产默认是三个全开。你需要理解每个做什么因为失败模式都在调度器上，不在模型上。

## 概念

### PagedAttention作为虚拟内存系统

KV缓存每序列是`num_layers x 2 x num_heads x head_dim x seq_len x bytes_per_element`。对Llama 3.3 70B在8192 token，BF16中约1.25 GB每序列。如果你为每个请求预预留8192槽但平均请求只用1500 token，你浪费了预留HBM的约82%。经典批处理付这个浪费。

PagedAttention从OS虚拟内存借鉴想法。KV缓存不是每序列连续的。它以固定大小块(默认16 token)分配。每个序列有一个块表将其逻辑token位置映射到物理块ID。当序列增长超过已分配块时，添加一个更多块。完成时，其块返回池。

碎片率从60-80%(经典)降到4%以下(PagedAttention)。你不用标志启用PagedAttention——它是vLLM唯一附带的分配器。旋钮是`--gpu-memory-utilization`(默认0.9)，告诉vLLM加载权重和激活后为KV块预留多少HBM。

### 迭代级别的连续批处理

旧"动态批处理"等窗口(比如10ms)填满批次，然后运行预填充+解码+解码+解码直到每个序列完成。快序列提前离开并空闲等GPU完成慢序列。

连续批处理在每个解码步骤之间操作。称运行中序列集合为`RUNNING`列表。每次迭代：

1. `RUNNING`中刚命中EOS或max_tokens的任何序列被移除。
2. 调度器查看等待队列。如果有空闲KV块，它接纳新序列(预填充或恢复)。
3. 前向传播在`RUNNING`中当前任何内容上运行，每个序列发出一个新token。

批次大小从不pad到固定数字。不同输出位置的序列共享一次融合前向。2026年vLLM中这叫`V1调度器`。关键不变量：调度器每个解码迭代运行一次，不是每个请求一次。

### 分块预填充保护TTFT尾部

预填充是计算密集的。32k token prompt在Llama 3.3 70B上在单个H100上纯预填充约800ms。预填充运行时，批次中每个其他序列的解码token等待。在服务循环中，一个长prompt的首token延迟(TTFT)成为数十个其他用户的token间延迟(ITL)毛刺。

分块预填充将预填充分成固定大小块(默认512 token)并将每个块作为一个单元调度。块之间调度器可以推进解码序列一个token。你用小的绝对预填充延迟损失(每块几ms)换取低得多的解码时间抖动。混合负载下P99 ITL从约50ms降到约15ms。

### 三个默认值交互

三个功能相互假设。PagedAttention给调度器细粒度KV资源来权衡。连续批处理需要该细粒度资源使接纳新序列不强制全局重排。分块预填充是调度器在相同`RUNNING`列表上做的决策——它是一个更多调度策略，不是独立系统。

你不需要知道每个标志。你需要知道调度器优化什么：KV块预算下的goodput，受分块预填充切片约束。

### 2026年v0.18.0的坑

vLLM v0.18.0中你不能将`--enable-chunked-prefill`与draft-model投机解码(`--speculative-model`)组合。文档化的例外是V1调度器中的N-gram GPU投机解码。不读发布说明就翻转每个标志的团队在启动时得到运行时错误，不是软退化。如果你的投机收益值得启用分块预填充，重新审视选择——2026年的正确答案通常是EAGLE-3不带分块预填充，而非draft模型加分块预填充但不编译。

### 你应该记住的数字

- Llama 3.3 70B FP8，H100 SXM5，128并发，三个全开：2,200-2,400 tok/s。
- 同模型，默认vLLM(无分块预填充)：约1,800 tok/s。
- 同模型，朴素PyTorch前向循环：约600 tok/s。
- 生产负载下PagedAttention的KV碎片浪费：<4%。
- 混合负载下P99 ITL：分块预填充约15ms，无约50ms。

### 调度器长什么样

```
while True:
    finished = [s for s in RUNNING if s.is_done()]
    for s in finished: release_blocks(s); RUNNING.remove(s)

    while WAITING and have_free_blocks_for(WAITING[0]):
        s = WAITING.pop(0)
        allocate_initial_blocks(s)
        RUNNING.append(s)

    # 在一个批次中调度预填充块 + 解码
    batch = []
    for s in RUNNING:
        if s.in_prefill:
            batch.append(next_prefill_chunk(s))   # 例如512 token
        else:
            batch.append(decode_one_token(s))     # 1 token

    run_forward(batch)                            # 一次融合GPU调用
```

`code/main.py`正是这个循环的stdlib Python版本，带假token计数和假前向延迟。运行它展示分块预填充如何在长预填充期间保持解码序列活跃。

## 实践

`code/main.py`模拟带可切换功能的vLLM风格调度器。运行它看：

- `NAIVE`模式：一次一个请求，无批处理。
- `STATIC`模式：pad和等待，经典批处理。
- `CONTINUOUS`模式：迭代级接纳和释放。
- `CONTINUOUS + CHUNKED`模式：预填充切片与解码交错。

输出显示总吞吐(每虚拟秒token)、TTFT均值和P99 ITL。`CONTINUOUS + CHUNKED`行应在混合流量上占优。

## 输出

本课程产生`outputs/skill-vllm-scheduler-reader.md`。给定服务配置(批次大小、KV内存利用率、分块预填充大小、投机配置)，它产生命名三个默认值中哪个是瓶颈以及调什么的调度器诊断。

## 练习

1. 运行`code/main.py`。在混合短长请求的工作负载上比较`STATIC`与`CONTINUOUS`。吞吐差距从哪来——预填充效率、解码效率还是尾部延迟？
2. 修改toy调度器添加`--max-num-batched-tokens`。H100上运行Llama 3.3 70B FP8的正确值是什么？(提示：是KV块大小和空闲块数的函数，非原始HBM。)
3. 重读vLLM v0.18.0发布说明。哪些标志组合互斥？列出它们。
4. 计算平均1500输出token、标准差600 token的1000请求轨迹在(a)8192最大连续每请求分配、(b)16 token块PagedAttention下的KV缓存碎片浪费。
5. 用一段话解释为什么分块预填充帮助P99 ITL但不帮助孤立吞吐。实践中的吞吐赢从哪来？

## 关键术语

| 术语                       | 常见说法               | 实际含义                                            |
| -------------------------- | ---------------------- | --------------------------------------------------- |
| PagedAttention             | "KV技巧"               | KV缓存的固定大小块分配器；碎片<4%                   |
| 块表                       | "页表"                 | 每序列从逻辑token位置到物理KV块的映射               |
| 连续批处理                 | "动态批处理，但正确的" | 每个解码迭代做接纳/释放决策                         |
| 分块预填充                 | "预填充拆分"           | 将长预填充分成与解码交错的512 token切片             |
| TTFT                       | "首token时间"          | 预填充+队列+网络；长prompt时由预填充主导            |
| ITL                        | "token间延迟"          | 连续解码token间的时间；由批次大小主导               |
| Goodput                    | "满足SLO的吞吐"        | 每个请求仍命中TTFT和ITL目标的token/秒               |
| V1调度器                   | "新调度器"             | vLLM 2026调度器；N-gram投机解码是分块预填充兼容路径 |
| `--gpu-memory-utilization` | "内存旋钮"             | 加载权重和激活后为KV块预留的HBM比例                 |

## 延伸阅读

- [vLLM documentation — Speculative Decoding](https://docs.vllm.ai/en/latest/features/spec_decode/)
- [vLLM Blog — PagedAttention](https://blog.vllm.ai/2023/06/20/vllm.html)
- [PagedAttention paper (arXiv:2309.06180)](https://arxiv.org/abs/2309.06180)
