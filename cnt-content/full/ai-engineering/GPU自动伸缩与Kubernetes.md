---
title: 'Kubernetes上的GPU自动伸缩 — Karpenter、KAI调度器、Gang调度'
description: 理解三层GPU自动伸缩架构：节点供给、Gang调度和应用层信号
module: 'ai-engineering'
difficulty: intermediate
tags:
  - Kubernetes
  - Karpenter
  - KAI调度器
  - Gang调度
  - GPU自动伸缩
  - HPA
related:
  - 'ai-engineering/GitHub-Issue到PR自主代理'
  - 'ai-engineering/GPU与云计算'
  - 'ai-engineering/JAX入门'
  - 'ai-engineering/Jupyter笔记本'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# Kubernetes上的GPU自动伸缩 — Karpenter、KAI调度器、Gang调度

> 三层，不是一层。Karpenter动态供给节点(一分钟内，比Cluster Autoscaler快40%)。KAI调度器处理gang调度、拓扑感知和层次化队列——它防止7-of-8部分分配陷阱，七个节点等待并烧钱只缺一个GPU。应用层自动伸缩器(NVIDIA Dynamo Planner, llm-d Workload Variant Autoscaler)基于推理特定信号伸缩——队列深度、KV缓存利用率——而非CPU/DCGM占空比。经典HPA陷阱是`DCGM_FI_DEV_GPU_UTIL`是占空比测量：100%可能是10个请求或100个。vLLM预分配KV缓存内存，所以内存从不触发缩容。本课程教你组合三层并避免默认Karpenter `WhenEmptyOrUnderutilized`策略在推理中途终止运行中GPU作业。

**类型:** 学习
**语言:** Python (stdlib, toy队列深度自动伸缩模拟器)
**前置知识:** Phase 17 · 02 (推理平台经济学), Phase 17 · 04 (vLLM服务内部)
**时间:** ~75分钟

## 学习目标

- 画出三层自动伸缩(节点供给、gang调度、应用层)并命名每层使用的工具。
- 解释为什么`DCGM_FI_DEV_GPU_UTIL`是vLLM错误的HPA信号并说出两个替代(队列深度、KV缓存利用率)。
- 描述gang调度和KAI调度器防止的部分分配失败模式(8个GPU中7个空闲)。
- 说出终止运行中GPU作业的Karpenter整合策略(`WhenEmptyOrUnderutilized`)并陈述2026年安全替代。

## 问题

你的团队在Kubernetes上部署LLM服务。你用`DCGM_FI_DEV_GPU_UTIL`作为信号设置HPA。服务在营业时间固定在100%利用率。HPA从不扩容——它已经认为你满了。你手动添加副本；TTFT下降。HPA仍然不扩。信号在骗你。

另外，你用Cluster Autoscaler做节点。1M token prompt凌晨2点到达；集群花3分钟供给节点，请求超时。

再来，你部署需要8个GPU跨2个节点的70B模型。集群有7个GPU空闲和1个分散在3个节点。Cluster Autoscaler为缺少的1个GPU供给节点。七个节点等4分钟烧钱同时Kubernetes启动最后一个GPU。

三层，三种不同失败模式。2026年GPU感知自动伸缩不是"打开HPA"。而是组合节点供给、gang调度和应用信号自动伸缩。

## 概念

### 第1层 — 节点供给(Karpenter)

Karpenter监控待处理pod并在约45-60秒内供给节点(Cluster Autoscaler对GPU节点通常需要90-120秒)。它按`NodePool`约束动态选择实例类型——如果你的pod需要8个H100且集群没有匹配节点，Karpenter直接供给一个而非扩展现有组。

**整合陷阱**：Karpenter默认`consolidationPolicy: WhenEmptyOrUnderutilized`对GPU池危险。它会终止运行中GPU节点以将pod迁移到更便宜的合适大小实例。对推理工作负载意味着驱逐运行中请求并在新节点上重新加载70B模型。损失是数分钟的容量加请求失败。

GPU池安全设置：

```yaml
disruption:
  consolidationPolicy: WhenEmpty
  consolidateAfter: 1h
```

让Karpenter一小时后整合真正空节点但从不驱逐运行中作业。

### 第2层 — Gang调度(KAI调度器)

KAI调度器(项目"Karp"后更名)处理默认kube-scheduler不做的：

**Gang调度** — 全有或全无调度。需要8个GPU的分布式推理pod要么全部8个一起启动要么都不启动。没有这个，你得到部分分配陷阱：8个pod中7个启动，无限等待，烧钱。

**拓扑感知** — 知道哪些GPU共享NVLink，哪些在同一机架上，哪些之间有InfiniBand。相应放置pod。DeepSeek-V3 67B张量并行工作负载必须停留在一个NVLink域；KAI调度器尊重这一点。

**层次化队列** — 多团队以优先级和配额竞争同一GPU池。团队A的生产紧迫只在优先级规则允许时被团队B的训练作业抢占。

KAI作为辅助调度器与kube-scheduler一起部署；你标注工作负载使用它。Ray和vLLM生产栈都集成。

### 第3层 — 应用层信号

**HPA陷阱**：`DCGM_FI_DEV_GPU_UTIL`是占空比指标——它测量GPU在每个采样间隔是否在工作。100%利用率可能意味着10个并发请求或100个；GPU都忙。按占空比伸缩是盲目伸缩。

更糟，vLLM和类似引擎预分配KV缓存内存(高达`--gpu-memory-utilization`)。内存使用即使在一个请求时也保持近90%。基于内存的HPA从不缩容。

**2026年替代信号**：

- 队列深度(等待预填充的请求数)。
- KV缓存利用率(分配给活跃序列的块比例)。
- 每副本P99 TTFT(你的SLA信号)。
- Goodput(每秒满足所有SLO的请求)。

NVIDIA Dynamo Planner和llm-d Workload Variant Autoscaler消费这些信号并扩缩副本。它们完全替代LLM服务的HPA。

### 何时用什么

| 伸缩决策      | 工具                                                |
| ------------- | --------------------------------------------------- |
| 添加/移除节点 | Karpenter                                           |
| 调度多GPU作业 | KAI调度器                                           |
| 添加/移除副本 | Dynamo Planner / llm-d WVA(或队列深度上的自定义HPA) |
| 选择GPU类型   | Karpenter NodePool                                  |
| 抢占低优先级  | KAI调度器队列                                       |

### 分离预填充/解码使一切复杂化

如果你运行分离预填充/解码(Phase 17 · 17)，你有两个具有不同伸缩触发器的pod类：预填充pod按队列深度伸缩，解码pod按KV缓存压力伸缩。llm-d将这些暴露为带每角色HPA的独立`Services`。不要尝试在两者前面放单一HPA。

### 冷启动在这里也很重要

冷启动缓解(Phase 17 · 10)是节点供给时间对用户可见的地方。Karpenter 45-60秒预热加20GB模型加载加引擎初始化意味着从零请求需要2-5分钟。为SLO关键路径保持温池(`min_workers=1`)，或在应用层使用Modal风格检查点。

### 你应该记住的数字

- Karpenter节点供给：约45-60秒 vs Cluster Autoscaler约90-120秒(GPU节点)。
- KAI调度器防止部分分配浪费——7-of-8陷阱。
- `DCGM_FI_DEV_GPU_UTIL`作为HPA信号：有问题；用队列深度或KV利用率。
- Karpenter `WhenEmptyOrUnderutilized`：终止运行中GPU作业。推理用`WhenEmpty + consolidateAfter: 1h`。

## 实践

`code/main.py`在突发GPU工作负载上模拟三层自动伸缩器。比较朴素HPA(占空比)、队列深度HPA和KAI gang调度伸缩。报告未满足请求、空闲GPU分钟和综合分数。

## 输出

本课程产生`outputs/skill-gpu-autoscaler-plan.md`。给定集群拓扑、工作负载形状和SLO，它设计三层自动伸缩计划。

## 练习

1. 运行`code/main.py`。在突发工作负载下，朴素占空比HPA丢弃多少请求队列深度HPA能捕获？差异从哪来？
2. 为在H100 SXM5上服务Llama 3.3 70B FP8的集群设计Karpenter NodePool。指定`capacity-type`、`disruption.consolidationPolicy`、`consolidateAfter`和保持非GPU工作负载离开这些节点的污点。
3. 你的团队报告部署卡在Pending因为"GPU可用但pod不调度"。诊断——是Karpenter、kube-scheduler还是KAI调度器？哪些指标确认？
4. 选择自动伸缩分离预填充pod的信号和不同的解码pod信号。论证两者。
5. 计算24x7生产服务上`WhenEmptyOrUnderutilized`整合陷阱的成本，平均每天60次P99 TTFT > 10s的请求丢弃事件。

## 关键术语

| 术语                   | 常见说法        | 实际含义                                   |
| ---------------------- | --------------- | ------------------------------------------ |
| Karpenter              | "节点供给器"    | Kubernetes节点自动伸缩器；亚分钟供给       |
| Cluster Autoscaler     | "旧伸缩器"      | Kubernetes节点自动伸缩器前身；更慢，基于组 |
| KAI调度器              | "GPU调度器"     | 用于gang + 拓扑 + 队列的辅助调度器         |
| Gang调度               | "全有或全无"    | 原子调度N个pod或推迟全部                   |
| 拓扑感知               | "机架感知"      | 基于NVLink/IB/机架放置pod                  |
| `DCGM_FI_DEV_GPU_UTIL` | "GPU利用率"     | 占空比指标；不是LLM的伸缩信号              |
| 队列深度               | "等待请求"      | 预填充约束伸缩的正确HPA信号                |
| KV缓存利用率           | "内存压力"      | 解码约束伸缩的正确HPA信号                  |
| 整合                   | "Karpenter整合" | 终止节点到更便宜实例类型                   |
| `WhenEmpty + 1h`       | "安全整合"      | 不驱逐运行中GPU作业的策略                  |

## 延伸阅读

- [KAI Scheduler GitHub](https://github.com/kai-scheduler/KAI-Scheduler)
- [Karpenter Disruption Controls](https://karpenter.sh/docs/concepts/disruption/)
- [NVIDIA — Disaggregated LLM Inference on Kubernetes](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/)
- [llm-d GitHub](https://github.com/llm-d/llm-d)
