---
title: 'vLLM生产栈与LMCache KV卸载'
description: 理解vLLM生产栈参考部署和LMCache跨引擎KV缓存复用
module: 'ai-engineering'
difficulty: intermediate
tags:
  - vLLM生产栈
  - LMCache
  - KV卸载
  - CPU卸载
  - Kubernetes部署
related:
  - 'ai-engineering/TensorRT-LLM与Blackwell'
  - 'ai-engineering/vLLM服务内部机制'
  - 'ai-engineering/Whisper架构与微调'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# vLLM生产栈与LMCache KV卸载

> vLLM的production-stack是参考Kubernetes部署——路由器、引擎和可观测性连接在一起。LMCache是KV卸载层，将KV缓存从GPU内存提取出来跨查询和引擎复用(CPU DRAM，然后磁盘/Ceph)。vLLM 0.11.0 KV卸载连接器(2026年1月)通过连接器API(v0.9.0+)使其异步和可插拔。卸载延迟不对用户可见。LMCache即使没有共享前缀也有价值——当GPU耗尽KV槽时，抢占的请求可以从CPU恢复而非重新计算预填充。在16x H100(80GB HBM)跨4个a3-highgpu-4g上的发布基准：当KV缓存超过HBM时，原生CPU卸载和LMCache都大幅改善吞吐；在低KV占用时，所有配置匹配基线带小开销。

**类型:** 学习
**语言:** Python (stdlib, toy KV溢出模拟器)
**前置知识:** Phase 17 · 04 (vLLM服务内部), Phase 17 · 06 (SGLang/RadixAttention)
**时间:** ~60分钟

## 学习目标

- 描述vLLM生产栈组件：路由器、引擎、可观测性。
- 解释LMCache KV卸载：GPU→CPU→磁盘层次和跨引擎复用。
- 说出LMCache即使没有共享前缀也有价值的场景(GPU KV槽耗尽时抢占恢复)。
- 比较原生CPU卸载和LMCache在不同KV占用下。

## 问题

vLLM的KV缓存在GPU HBM中。当HBM满时，新请求必须等旧请求完成释放KV槽。如果等待时间太长，请求超时。LMCache通过将冷KV缓存卸载到CPU DRAM(然后磁盘)解决，释放GPU槽给新请求。

## 概念

### vLLM生产栈

参考Kubernetes部署：

- 路由器：请求路由和负载均衡。
- 引擎：vLLM实例，每个GPU一个。
- 可观测性：指标、追踪、日志。

### LMCache

KV卸载层：

1. GPU HBM → CPU DRAM(异步，非阻塞)。
2. CPU DRAM → 磁盘/Ceph(长期存储)。
3. 跨引擎复用：引擎A卸载的KV缓存可被引擎B加载。

### 抢占恢复

没有LMCache：GPU KV槽满时，抢占的请求必须重新预填充(完整成本)。
有LMCache：抢占的请求KV缓存在CPU DRAM中，恢复时直接加载(低成本)。

### 性能

在16x H100上：

- 低KV占用(远低于HBM)：所有配置匹配基线带小开销。
- 高KV占用(超过HBM)：LMCache大幅改善吞吐因为避免重新预填充。

## 实践

`code/main.py`模拟KV溢出场景和LMCache恢复。

## 输出

本课程产生`outputs/skill-lmcache-auditor.md`。给定部署规模和工作负载，审计LMCache是否值得以及配置建议。

## 练习

1. 计算H100(80GB)上70B FP8模型的KV缓存容量。在128并发、2048 token时KV缓存超过HBM吗？
2. 为什么LMCache卸载延迟不对用户可见？
3. 比较原生CPU卸载和LMCache在功能上。
4. 阅读LMCache GitHub。描述连接器API。
5. 设计部署：8x H100，混合长短prompt工作负载。LMCache值得吗？

## 关键术语

| 术语      | 常见说法      | 实际含义                         |
| --------- | ------------- | -------------------------------- |
| 生产栈    | "参考K8s部署" | vLLM的Kubernetes参考部署         |
| LMCache   | "KV卸载层"    | GPU→CPU→磁盘KV缓存层次           |
| 抢占恢复  | "从CPU恢复"   | 从CPU DRAM恢复被抢占请求的KV缓存 |
| 连接器API | "v0.9.0+插件" | vLLM的可插拔KV卸载接口           |

## 延伸阅读

- [vLLM Production Stack GitHub](https://github.com/vllm-project/production-stack)
- [LMCache GitHub](https://github.com/LMCache/LMCache)
