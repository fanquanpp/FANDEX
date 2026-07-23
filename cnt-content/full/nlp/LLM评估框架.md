---
title: LLM评估框架
description: '理解RAGAS、DeepEval、G-Eval等LLM评估框架的核心方法与校准'
module: nlp
difficulty: intermediate
tags:
  - LLM评估
  - RAGAS
  - DeepEval
  - 'G-Eval'
  - 'LLM-as-judge'
related:
  - nlp/自然语言推理
  - nlp/GloVe与子词嵌入
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# LLM评估 — RAGAS、DeepEval、G-Eval

> 精确匹配和F1遗漏语义等价。人工审查不可扩展。LLM-as-judge是生产答案 — 加上足够的校准来信任这个数字。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 13（问答系统），Phase 5 · 14（信息检索）
**时间:** ~75 分钟

## 问题

你的RAG系统回答："June 29th, 2007." 金标准参考是："June 29, 2007." 精确匹配得分0。F1得分约75%。人类会打100分。

现在乘以10,000个测试用例。再乘以检索器、分块、提示或模型的每次变更。你需要一个理解含义、大规模廉价运行、不对回归撒谎、并暴露正确失败模式的评估器。

2026年有三个框架拥有这个问题。

- **RAGAS。** 检索增强生成评估。四个RAG指标（忠实度、答案相关性、上下文精确度、上下文召回）配合NLI + LLM-judge后端。研究支持，轻量级。
- **DeepEval。** LLM的pytest。G-Eval、任务完成、幻觉、偏见指标。CI/CD原生。
- **G-Eval。** 一种方法（也是DeepEval指标）：LLM-as-judge配合思维链、自定义标准、0-1评分。

三者都依赖LLM-as-judge。本课程为该方法及其信任层建立直觉。

## 概念

**LLM-as-judge。** 用LLM按评分标准对输出评分替代静态指标。给定 `(query, context, answer)`，提示评判LLM："在忠实度上评分0-1。" 返回分数。

为什么有效：LLM以极低成本近似人类判断。GPT-4o-mini约$0.003/评分案例，使1000样本回归评估运行成本低于$5。

为什么静默失败：

1. **评判偏差。** 评判者偏好更长的答案、来自自己模型家族的答案、匹配提示风格的答案。
2. **JSON解析失败。** 坏JSON → NaN分数 → 静默排除在聚合之外。RAGAS用户知道这种痛苦。用try/except + 显式失败模式门控。
3. **模型版本漂移。** 升级评判者改变每个指标。冻结评判模型 + 版本。

**RAG四指标。**

| 指标         | 问题                                 | 后端                               |
| ------------ | ------------------------------------ | ---------------------------------- |
| 忠实度       | 答案中的每个主张是否来自检索上下文？ | 基于NLI的蕴含                      |
| 答案相关性   | 答案是否回应了问题？                 | 从答案生成假设问题；与真实问题比较 |
| 上下文精确度 | 检索的块中，有多少比例是相关的？     | LLM-judge                          |
| 上下文召回   | 检索是否返回了所有需要的信息？       | 对照金标准答案的LLM-judge          |

**G-Eval。** 定义自定义标准："答案是否引用了正确的来源？" 框架自动扩展为思维链评估步骤，然后评分0-1。适合RAGAS不覆盖的领域特定质量维度。

**校准。** 永远不要信任原始评判分数，直到你有了与人工标签的相关性。运行100个手工标注示例。绘制评判vs人工。计算Spearman rho。如果rho < 0.7，你的评判评分标准需要改进。

## 构建它

### 步骤 1：用NLI的忠实度（RAGAS风格）

```python
from transformers import pipeline

nli = pipeline("text-classification",
               model="MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli",
               top_k=None)

def atomic_claims(answer, llm):
    prompt = f"""Break this answer into simple factual claims (one per line):
{answer}
"""
    return llm(prompt).splitlines()

def faithfulness(answer, context, llm):
    claims = atomic_claims(answer, llm)
    if not claims:
        return 0.0
    supported = 0
    for claim in claims:
        result = nli({"text": context, "text_pair": claim})[0]
        entail = next((s for s in result if s["label"] == "entailment"), None)
        if entail and entail["score"] > 0.5:
            supported += 1
    return supported / len(claims)
```

将答案分解为原子主张。对每个主张对照检索上下文做NLI检查。忠实度 = 被支持的比例。

### 步骤 2：答案相关性

```python
def answer_relevance(question, answer, encoder, llm, n=3):
    prompt = f"Write {n} questions this answer could be the answer to:\n{answer}"
    generated = [line for line in llm(prompt).splitlines() if line.strip()][:n]
    if not generated:
        return 0.0
    q_emb = encoder.encode([question], normalize_embeddings=True)[0]
    g_embs = encoder.encode(generated, normalize_embeddings=True)
    sims = [float(q_emb @ g_emb) for g_emb in g_embs]
    return sum(sims) / len(sims)
```

如果答案暗示的问题与被问的不同，相关性下降。

### 步骤 3：G-Eval自定义指标

```python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams, LLMTestCase

metric = GEval(
    name="Correctness",
    criteria="The answer should be factually accurate and match the expected output.",
    evaluation_steps=[
        "Read the expected output.",
        "Read the actual output.",
        "List factual claims in the actual output.",
        "For each claim, mark supported or unsupported by the expected output.",
        "Return score = fraction supported.",
    ],
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
)

test = LLMTestCase(input="When was the first iPhone released?",
                   actual_output="June 29th, 2007.",
                   expected_output="June 29, 2007.")
metric.measure(test)
print(metric.score, metric.reason)
```

评估步骤就是评分标准。显式步骤比隐式"评分0-1"提示更稳定。

### 步骤 4：CI门控

```python
def test_rag_system():
    cases = load_regression_cases()
    for case in cases:
        faith_score = faithfulness(case.answer, case.context, llm)
        assert faith_score >= 0.85, f"faithfulness regression on {case.id}"
```

作为pytest文件发布。在每个PR上运行。在回归时阻止合并。

## 陷阱

- **无校准。** 与人工标签0.3相关的评判是噪声。发布前要求校准运行。
- **自评估。** 使用相同LLM生成和评判使分数膨胀10-20%。使用不同模型家族做评判。
- **成对评判中的位置偏差。** 评判者偏好首先呈现的选项。始终随机化顺序并双向运行。
- **原始聚合隐藏失败。** 平均分0.85通常隐藏5%的灾难性失败。始终检查底部分位数。
- **金标准数据集腐烂。** 未版本化的评估集随时间漂移，破坏纵向比较。每次变更都标记数据集。
- **LLM成本。** 大规模时，评判调用主导成本。使用满足校准阈值的最便宜模型。

## 使用它

| 用例             | 框架                 |
| ---------------- | -------------------- |
| RAG质量监控      | RAGAS（4指标）       |
| CI/CD回归门控    | DeepEval + pytest    |
| 自定义领域标准   | DeepEval中的G-Eval   |
| 在线实时流量监控 | RAGAS无参考模式      |
| 人工参与抽查     | LangSmith或Phoenix   |
| 红队/安全评估    | Promptfoo + DeepEval |

典型技术栈：RAGAS用于监控，DeepEval用于CI，G-Eval用于新维度。运行全部三个；它们的分歧是有用的。

## 交付它

将结果保存为 `outputs/skill-eval-architect.md`。

## 练习

1. **简单。** 在10个带已知幻觉的RAG示例上使用RAGAS。验证忠实度指标捕获每一个。
2. **中等。** 手工标注50个QA答案0-1正确性。用G-Eval评分。测量评判与人工之间的Spearman rho。
3. **困难。** 用DeepEval构建pytest CI门控。故意退化检索器。验证门控失败。通过阈值检查添加底部分位数告警。

## 关键术语

| 术语         | 通俗说法           | 实际含义                               |
| ------------ | ------------------ | -------------------------------------- |
| LLM-as-judge | 用LLM评分          | 提示评判模型按评分标准对输出评分0-1。  |
| RAGAS        | RAG指标库          | 4个无参考RAG指标的开源评估框架。       |
| 忠实度       | 答案有依据吗？     | 答案主张被检索上下文蕴含的比例。       |
| 上下文精确度 | 检索的块相关吗？   | top-K块中实际重要的比例。              |
| 上下文召回   | 检索找到了一切吗？ | 金标准答案主张被检索块支持的比例。     |
| G-Eval       | 自定义LLM评判      | 评分标准 + 思维链评估步骤 + 0-1评分。  |
| 校准         | 信任但验证         | 评判分数与人工分数之间的Spearman相关。 |

## 延伸阅读

- [Es et al. (2023). RAGAS](https://arxiv.org/abs/2309.15217) — RAGAS论文。
- [Liu et al. (2023). G-Eval](https://arxiv.org/abs/2303.16634) — G-Eval论文。
- [DeepEval文档](https://deepeval.com/docs/metrics-introduction) — 开源生产技术栈。
- [Zheng et al. (2023). Judging LLM-as-a-Judge](https://arxiv.org/abs/2306.05685) — 偏差、校准、限制。
