---
title: 异步Hogwild推理
description: '理解异步 Hogwild 推理策略，通过无锁并行提升 LLM 服务吞吐量'
module: llm
difficulty: advanced
tags:
  - Hogwild
  - 'async inference'
  - 并行推理
  - 吞吐量优化
related:
  - llm/推理优化
  - llm/微调与LoRA
  - 'llm/预训练Mini-GPT'
  - llm/原生稀疏注意力
prerequisites:
  - llm/安全护栏
---

# 异步Hogwild推理

> 标准 LLM 推理是同步的——每个请求必须等前一个 token 生成完才能开始下一个。Hogwild 推理打破这个限制：多个请求共享同一个模型权重，无锁并行执行，吞吐量提升 2-3x。

**类型：** 概念
**前置条件：** Phase 10 Lesson 12（推理优化）
**预计时间：** ~30 分钟

## 学习目标

- 理解同步推理的吞吐量瓶颈
- 掌握 Hogwild 无锁并行的核心思想
- 理解异步推理的权衡：吞吐量 vs 延迟

## 同步 vs 异步推理

**同步推理：** 每个请求顺序执行，等待前一步完成。

**异步 Hogwild 推理：** 多个请求并发执行，共享模型权重，无需锁。

```
同步: Request 1 → Request 2 → Request 3
异步: Request 1 --+
      Request 2 --+--> 并行执行
      Request 3 --+
```

## 核心思想

Hogwild 名称来自并行计算中的 Hogwild! 算法——多个线程无锁更新共享参数。在推理场景中：

1. 多个请求共享同一份模型权重
2. 每个请求独立前向传播，无需等待其他请求
3. 权重只读，无需加锁
4. 批处理由调度器动态组装

```python
import asyncio


class AsyncInferenceServer:
    """异步推理服务器"""

    def __init__(self, model, tokenizer, max_batch_size=32):
        self.model = model
        self.tokenizer = tokenizer
        self.max_batch_size = max_batch_size
        self.pending_requests = []

    async def generate(self, prompt, max_tokens=256):
        """异步生成"""
        request = {
            'prompt': prompt,
            'max_tokens': max_tokens,
            'result': asyncio.Future(),
        }
        self.pending_requests.append(request)
        return await request['result']

    async def batch_loop(self):
        """批处理循环：动态组装批次"""
        while True:
            if self.pending_requests:
                # 取一批请求
                batch = self.pending_requests[:self.max_batch_size]
                self.pending_requests = self.pending_requests[self.max_batch_size:]

                # 批量推理
                prompts = [r['prompt'] for r in batch]
                results = self._batch_generate(prompts)

                # 返回结果
                for request, result in zip(batch, results):
                    request['result'].set_result(result)

            await asyncio.sleep(0.001)  # 避免忙等

    def _batch_generate(self, prompts):
        """批量生成"""
        inputs = self.tokenizer(prompts, return_tensors='pt', padding=True)
        with torch.no_grad():
            outputs = self.model.generate(**inputs, max_new_tokens=256)
        return [self.tokenizer.decode(o) for o in outputs]
```

## 关键术语

| 术语       | 通俗说法       | 实际含义                                |
| ---------- | -------------- | --------------------------------------- |
| Hogwild    | "无锁并行"     | 多线程无锁访问共享资源的并行策略        |
| 异步推理   | "不等前一步"   | 请求无需等待前一个完成即可开始执行      |
| 动态批处理 | "凑够一批再算" | 调度器动态组装请求批次以提高 GPU 利用率 |

## 延伸阅读

- [Recht et al., 2011 -- "Hogwild!: A Lock-Free Approach to Parallelizing Stochastic Gradient Descent"](https://arxiv.org/abs/1106.5730) -- Hogwild 原始论文
