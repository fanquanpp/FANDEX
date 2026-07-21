---
title: 生产应用
description: '构建生产级 LLM 应用的完整指南，包括流式输出、错误处理、可观测性和部署'
module: llm
difficulty: advanced
tags:
  - production
  - streaming
  - SSE
  - 可观测性
  - 部署
related:
  - llm/上下文工程
  - llm/少样本与思维链
  - llm/数据流水线
  - llm/梯度检查点
prerequisites:
  - llm/安全护栏
---

# 生产应用

> Demo 和生产应用的区别：Demo 不需要处理超时、不需要流式输出、不需要监控、不需要回滚。生产应用需要所有这些——以及更多。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 01-12
**预计时间：** ~90 分钟

## 学习目标

- 实现流式输出（SSE）
- 构建健壮的错误处理和重试机制
- 实现可观测性：日志、指标和追踪
- 掌握 A/B 测试和灰度发布

## 流式输出

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from openai import OpenAI

app = FastAPI()
client = OpenAI()


@app.post("/chat/stream")
async def chat_stream(message: str):
    """流式聊天接口"""
    async def generate():
        stream = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": message}],
            stream=True,
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield f"data: {chunk.choices[0].delta.content}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
    )
```

## 错误处理和重试

```python
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential


class LLMService:
    """带错误处理的 LLM 服务"""

    def __init__(self, client, fallback_model="gpt-4o-mini"):
        self.client = client
        self.fallback_model = fallback_model

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
    )
    async def generate(self, messages, model="gpt-4o", **kwargs):
        """带重试的生成"""
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=model,
                messages=messages,
                **kwargs,
            )
            return response.choices[0].message.content

        except Exception as e:
            # 降级到更便宜的模型
            if "rate_limit" in str(e).lower():
                return await self._fallback(messages, **kwargs)
            raise

    async def _fallback(self, messages, **kwargs):
        """降级处理"""
        response = await asyncio.to_thread(
            self.client.chat.completions.create,
            model=self.fallback_model,
            messages=messages,
            **kwargs,
        )
        return response.choices[0].message.content
```

## 可观测性

```python
import time
import logging
from dataclasses import dataclass, field


logger = logging.getLogger("llm_service")


@dataclass
class Span:
    """追踪片段"""
    name: str
    start_time: float = field(default_factory=time.time)
    end_time: float = None
    attributes: dict = field(default_factory=dict)

    @property
    def duration(self):
        return self.end_time - self.start_time if self.end_time else None

    def finish(self):
        self.end_time = time.time()


class ObservabilityMiddleware:
    """可观测性中间件"""

    def __init__(self):
        self.metrics = {
            'total_requests': 0,
            'total_tokens': 0,
            'total_errors': 0,
            'total_latency': 0,
        }

    def record_request(self, model, input_tokens, output_tokens, latency, error=None):
        """记录请求指标"""
        self.metrics['total_requests'] += 1
        self.metrics['total_tokens'] += input_tokens + output_tokens
        self.metrics['total_latency'] += latency

        if error:
            self.metrics['total_errors'] += 1

        logger.info(
            f"model={model} tokens={input_tokens+output_tokens} "
            f"latency={latency:.2f}s error={error}"
        )

    def summary(self):
        """汇总指标"""
        n = self.metrics['total_requests']
        return {
            'total_requests': n,
            'avg_latency': self.metrics['total_latency'] / max(n, 1),
            'avg_tokens': self.metrics['total_tokens'] / max(n, 1),
            'error_rate': self.metrics['total_errors'] / max(n, 1),
        }
```

## 部署检查清单

- [ ] 流式输出已实现
- [ ] 错误处理和重试机制已配置
- [ ] 速率限制已设置
- [ ] 缓存层已部署
- [ ] 输入输出护栏已启用
- [ ] 日志和指标已配置
- [ ] 成本追踪已启用
- [ ] A/B 测试框架已就绪
- [ ] 回滚方案已准备
- [ ] 负载测试已通过

## 关键术语

| 术语     | 通俗说法     | 实际含义                                       |
| -------- | ------------ | ---------------------------------------------- |
| SSE      | "流式推送"   | Server-Sent Events，服务器向客户端推送流式数据 |
| 可观测性 | "看得见"     | 通过日志、指标和追踪了解系统运行状态           |
| 降级     | "退而求其次" | 主服务不可用时切换到备用方案                   |
| 灰度发布 | "慢慢放量"   | 逐步将新版本推送给部分用户                     |

## 延伸阅读

- [LangSmith](https://smith.langchain.com/) -- LLM 可观测性平台
- [Helicone](https://www.helicone.ai/) -- LLM 日志和监控
- [FastAPI 文档](https://fastapi.tiangolo.com/) -- Python Web 框架
