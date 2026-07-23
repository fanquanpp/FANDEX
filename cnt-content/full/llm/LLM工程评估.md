---
title: LLM工程评估
description: '理解 LLM 应用的评估框架，包括 LLM-as-Judge、评估流水线和回归测试'
module: llm
difficulty: intermediate
tags:
  - evaluation
  - 'LLM-as-Judge'
  - 评估流水线
  - 回归测试
  - promptfoo
related:
  - 'llm/Jamba混合SSM-Transformer'
  - llm/LangGraph状态机
  - llm/LLM评估
  - llm/RAG检索增强生成
prerequisites:
  - llm/安全护栏
---

# LLM工程评估

> 模型评估测模型能力，应用评估测系统质量。你的 RAG 管道检索准确吗？函数调用可靠吗？回答一致性如何？没有评估，你无法知道系统是否真正可用。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 06（RAG）
**预计时间：** ~60 分钟

## 学习目标

- 理解 LLM 应用评估的分类体系
- 实现 LLM-as-Judge 评估器
- 构建自动化评估流水线
- 掌握回归测试和 CI/CD 集成

## 评估分类

| 维度     | 评估什么             | 方法                |
| -------- | -------------------- | ------------------- |
| 检索质量 | 检索到的文档是否相关 | 人工标注 + 自动指标 |
| 生成质量 | 回答是否准确、完整   | LLM-as-Judge        |
| 端到端   | 整体系统是否满足需求 | 端到端测试用例      |
| 延迟     | 响应时间是否可接受   | 性能基准            |
| 成本     | 每次调用的费用       | 成本追踪            |
| 安全     | 是否产生有害输出     | 红队测试            |

## LLM-as-Judge

```python
JUDGE_PROMPT = """你是一个评估助手。请根据以下标准评估回复的质量。

评估标准：
1. 准确性（1-5）：回复中的事实是否正确
2. 完整性（1-5）：是否完整回答了问题
3. 相关性（1-5）：回复是否与问题相关
4. 清晰度（1-5）：回复是否清晰易懂

问题：{question}
回复：{response}
参考答案：{reference}

请按以下 JSON 格式输出评估结果：
{{
  "accuracy": <1-5>,
  "completeness": <1-5>,
  "relevance": <1-5>,
  "clarity": <1-5>,
  "overall": <1-5>,
  "reasoning": "<评估理由>"
}}"""


async def llm_judge(question, response, reference, judge_model):
    """LLM 评估器"""
    prompt = JUDGE_PROMPT.format(
        question=question,
        response=response,
        reference=reference,
    )

    result = await judge_model.generate(prompt, temperature=0)
    import json
    return json.loads(result)
```

## 评估流水线

```python
class EvalPipeline:
    """评估流水线"""

    def __init__(self, rag_system, judge_model):
        self.rag = rag_system
        self.judge = judge_model

    async def run(self, test_cases):
        """运行评估"""
        results = []

        for case in test_cases:
            # 生成回答
            response, retrieved = self.rag.generate(case['question'])

            # 评估检索质量
            retrieval_score = self._eval_retrieval(
                case['question'], retrieved, case.get('relevant_docs', []))

            # 评估生成质量
            generation_score = await llm_judge(
                case['question'], response,
                case.get('reference_answer', ''), self.judge)

            results.append({
                'question': case['question'],
                'response': response,
                'retrieval_score': retrieval_score,
                'generation_score': generation_score,
            })

        # 汇总
        summary = self._summarize(results)
        return results, summary

    def _eval_retrieval(self, query, retrieved, relevant):
        """评估检索质量"""
        if not relevant:
            return None

        retrieved_set = set(doc.metadata.get('source') for doc, _ in retrieved)
        relevant_set = set(doc['source'] for doc in relevant)

        precision = len(retrieved_set & relevant_set) / max(len(retrieved_set), 1)
        recall = len(retrieved_set & relevant_set) / max(len(relevant_set), 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-10)

        return {"precision": precision, "recall": recall, "f1": f1}

    def _summarize(self, results):
        """汇总评估结果"""
        n = len(results)
        avg_retrieval_f1 = sum(
            r['retrieval_score']['f1'] for r in results if r['retrieval_score']
        ) / max(sum(1 for r in results if r['retrieval_score']), 1)

        avg_overall = sum(
            r['generation_score']['overall'] for r in results
        ) / n

        return {
            "num_cases": n,
            "avg_retrieval_f1": avg_retrieval_f1,
            "avg_generation_score": avg_overall,
        }
```

## 回归测试

```python
def regression_test(system, baseline_results, threshold=0.1):
    """回归测试：确保系统改进不会降低已有功能"""
    failures = []

    for case_id, baseline in baseline_results.items():
        current = system.evaluate(case_id)

        for metric, value in baseline.items():
            if current[metric] < value - threshold:
                failures.append({
                    'case_id': case_id,
                    'metric': metric,
                    'baseline': value,
                    'current': current[metric],
                    'delta': current[metric] - value,
                })

    return failures
```

## 工具推荐

| 工具      | 用途     | 特点                       |
| --------- | -------- | -------------------------- |
| promptfoo | 提示评估 | CLI 驱动，支持多模型对比   |
| DeepEval  | 全面评估 | RAG 专用指标，LLM-as-Judge |
| Ragas     | RAG 评估 | 自动化 RAG 质量评估        |
| LangSmith | 可观测性 | 追踪、评估、调试一体化     |

## 关键术语

| 术语         | 通俗说法       | 实际含义                             |
| ------------ | -------------- | ------------------------------------ |
| LLM-as-Judge | "AI 当裁判"    | 用强大的 LLM 评估其他模型输出的质量  |
| 评估流水线   | "自动打分系统" | 自动化运行测试用例和评估指标的流水线 |
| 回归测试     | "别改坏了"     | 确保系统改进不会降低已有功能的测试   |
| 评估鲁棒性   | "结果可靠吗"   | 评估结果本身的一致性和可靠性         |

## 延伸阅读

- [Zheng et al., 2023 -- "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena"](https://arxiv.org/abs/2306.05685) -- LLM-as-Judge 方法论
- [Es et al., 2023 -- "Ragas: Automated Evaluation of Retrieval Augmented Generation"](https://arxiv.org/abs/2309.15217) -- Ragas 论文
- [promptfoo](https://github.com/promptfoo/promptfoo) -- 提示评估工具
