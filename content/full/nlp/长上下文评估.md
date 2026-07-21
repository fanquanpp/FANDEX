---
title: 长上下文评估
description: 评估LLM长上下文能力的基准与方法：NIAH、RULER、LongBench、MRCR，以及如何构建自定义针测试
module: nlp
difficulty: advanced
tags:
  - NLP
  - 长上下文
  - 评估
  - NIAH
  - RULER
  - LongBench
related:
  - nlp/信息检索与搜索
  - nlp/序列到序列模型
  - nlp/主题建模
  - nlp/注意力机制
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 长上下文评估 — NIAH、RULER、LongBench、MRCR

> Gemini 3 Pro 宣称拥有 10M token 的上下文。在 1M token 时，8-needle MRCR 降至 26.3%。宣称的数值 ≠ 可用容量。长上下文评估告诉你实际部署的模型的真实能力。

## 问题所在

你有一份 200 页的合同。模型声称支持 1M token 上下文。你把合同粘贴进去并问："终止条款是什么？"模型回答了——但回答的是封面页的内容，因为终止条款位于 120k token 深处，超出了模型实际注意到的范围。

这就是 2026 年的上下文容量差距。规格表写着 1M 或 10M。现实是其中只有 60-70% 是可用的，而"可用"取决于任务类型。

- **检索（草堆中的单针）：** 在前沿模型上，接近宣称的最大长度时几乎完美。
- **多跳/聚合：** 在大多数模型上，超过约 128k 后急剧下降。
- **对分散事实的推理：** 最先失败的任务。

长上下文评估测量这些维度。本课程介绍基准名称、每个基准实际测量的内容，以及如何为你的领域构建自定义针测试。

## 核心概念

**Needle-in-a-Haystack（NIAH，2023）。** 在长上下文的可控深度位置放置一个事实（"魔法词是 pineapple"）。要求模型检索它。扫描深度 × 长度。这是最早的长上下文基准。前沿模型现在已经饱和了这个基准；它是必要但不充分的基线。

**RULER（Nvidia，2024）。** 4 个类别下的 13 种任务类型：检索（单键/多键/多值）、多跳追踪（变量跟踪）、聚合（常见词频率）、QA。可配置上下文长度（4k 到 128k+）。揭示在 NIAH 上饱和但在多跳上失败的模型。在 2024 年的发布中，声称支持 32k+ 上下文的 17 个模型中，只有一半在 32k 时维持了质量。

**LongBench v2（2024）。** 503 道选择题，8k-2M 词的上下文，六个任务类别：单文档 QA、多文档 QA、长上下文学习、长对话、代码仓库、长结构化数据。评估真实世界长上下文行为的生产级基准。

**MRCR（Multi-Round Coreference Resolution）。** 大规模多轮共指消解。8-needle、24-needle、100-needle 变体。暴露模型在注意力退化前能处理多少事实。

**NoLiMa。** "非词汇针"。针和查询没有字面重叠；检索需要一步语义推理。比 NIAH 更难。

**HELMET。** 拼接多个文档，从任意一个提问。测试选择性注意力。

**BABILong。** 在无关草堆中嵌入 bAbI 推理链。测试草堆中的推理，而不仅仅是检索。

### 应该报告什么

- **宣称的上下文窗口。** 规格表上的数字。
- **有效检索长度。** NIAH 在某个阈值（如 90%）下通过的长度。
- **有效推理长度。** 多跳或聚合在该阈值下通过的长度。
- **退化曲线。** 准确率 vs 上下文长度，按任务类型绘制。

规格表上的两个数字：检索有效长度和推理有效长度。通常推理有效长度是宣称窗口的 25-50%。

## 动手构建

### 步骤 1：为你的领域构建自定义 NIAH

参见 `code/main.py`。基本框架：

```python
def build_haystack(filler_text, needle, depth_ratio, total_tokens):
    if not (0.0 <= depth_ratio <= 1.0):
        raise ValueError(f"depth_ratio must be in [0, 1], got {depth_ratio}")
    if total_tokens <= 0:
        raise ValueError(f"total_tokens must be positive, got {total_tokens}")

    filler_tokens = tokenize(filler_text)
    needle_tokens = tokenize(needle)
    if not filler_tokens:
        raise ValueError("filler_text produced no tokens")

    # 重复填充文本直到足够长以填满草堆主体
    body_len = max(total_tokens - len(needle_tokens), 0)
    while len(filler_tokens) < body_len:
        filler_tokens = filler_tokens + filler_tokens
    filler_tokens = filler_tokens[:body_len]

    insert_at = min(int(body_len * depth_ratio), body_len)
    haystack = filler_tokens[:insert_at] + needle_tokens + filler_tokens[insert_at:]
    return " ".join(haystack)


def score_niah(model, haystack, question, expected):
    answer = model.complete(f"Context: {haystack}\nQ: {question}\nA:", max_tokens=50)
    return 1 if expected.lower() in answer.lower() else 0
```

扫描 `depth_ratio` ∈ {0, 0.25, 0.5, 0.75, 1.0} × `total_tokens` ∈ {1k, 4k, 16k, 64k}。绘制热力图。这就是目标模型的 NIAH 卡片。

### 步骤 2：多针变体

```python
def build_multi_needle(filler, needles, total_tokens):
    depths = [0.1, 0.4, 0.7]
    chunks = [filler[:int(total_tokens * 0.1)]]
    for depth, needle in zip(depths, needles):
        chunks.append(needle)
        next_chunk = filler[int(total_tokens * depth): int(total_tokens * (depth + 0.3))]
        chunks.append(next_chunk)
    return " ".join(chunks)
```

像"三个魔法词是什么？"这样的问题需要检索所有三个。单针成功不能预测多针成功。

### 步骤 3：多跳变量追踪（RULER 风格）

```python
haystack = """X1 = 42. ... (填充) ... X2 = X1 + 10. ... (填充) ... X3 = X2 * 2."""
question = "X3 是多少？"
```

答案需要链接三个赋值。前沿模型在 128k 时这里的准确率通常降至 50-70%。

### 步骤 4：在你的技术栈上运行 LongBench v2

```python
from datasets import load_dataset
longbench = load_dataset("THUDM/LongBench-v2")

def eval_model_on_longbench(model, subset="single-doc-qa"):
    tasks = [x for x in longbench["test"] if x["task"] == subset]
    correct = 0
    for x in tasks:
        answer = model.complete(x["context"] + "\n\nQ: " + x["question"], max_tokens=20)
        if normalize(answer) == normalize(x["answer"]):
            correct += 1
    return correct / len(tasks)
```

按类别报告准确率。汇总分数会掩盖大的任务级差异。

## 常见陷阱

- **仅使用 NIAH 评估。** 在 1M token 上通过 NIAH 对多跳没有任何说明。始终运行 RULER 或自定义多跳测试。
- **均匀深度采样。** 许多实现只测试 depth=0.5。测试 depth=0, 0.25, 0.5, 0.75, 1.0——"中间丢失"效应是真实存在的。
- **与填充文本的词汇重叠。** 如果针与填充文本共享关键词，检索变得微不足道。使用 NoLiMa 风格的非重叠针。
- **忽略延迟。** 1M token 的 prompt 需要 30-120 秒来预填充。在测量准确率的同时测量首 token 时间。
- **厂商自报数字。** OpenAI、Google、Anthropic 都发布自己的分数。始终在你的用例上独立重跑。

## 实际应用

2026 年技术栈：

| 场景             | 基准                                             |
| ---------------- | ------------------------------------------------ |
| 快速健全性检查   | 自定义 NIAH，3 个深度 × 3 个长度                 |
| 生产模型选择     | RULER（13 种任务）在你的目标长度上               |
| 真实世界 QA 质量 | LongBench v2 单文档 QA 子集                      |
| 多跳推理         | BABILong 或自定义变量追踪                        |
| 对话/对话式      | MRCR 8-needle 在你的目标长度上                   |
| 模型升级回归     | 固定的内部 NIAH + RULER 测试套件，每个新模型都跑 |

生产经验法则：在你预期的长度上有 NIAH + 1 个推理任务之前，永远不要信任上下文窗口。

## 练习

1. **简单。** 构建 NIAH，3 个深度（0.25, 0.5, 0.75）× 3 个长度（1k, 4k, 16k）。在任何模型上运行。将通过率绘制为 3×3 热力图。
2. **中等。** 添加 3-needle 变体。测量每个长度上 3 个针的检索率。与相同长度上的单针通过率比较。
3. **困难。** 构建变量追踪任务（X1 → X2 → X3，3 跳），嵌入 64k 填充文本中。在 3 个前沿模型上测量准确率。报告每个模型的有效推理长度。

## 关键术语

| 术语       | 人们常说的   | 实际含义                                 |
| ---------- | ------------ | ---------------------------------------- |
| NIAH       | 草堆找针     | 在填充文本中植入事实，要求模型检索       |
| RULER      | 增强版 NIAH  | 跨检索/多跳/聚合/QA 的 13 种任务类型     |
| 有效上下文 | 真实容量     | 准确率仍高于阈值的长度                   |
| 中间丢失   | 深度偏差     | 模型对长输入中间内容的注意力不足         |
| 多针       | 同时多个事实 | 多个植入点；测试注意力调度，不仅是检索   |
| MRCR       | 多轮共指     | 8、24 或 100-needle 共指；暴露注意力饱和 |
| NoLiMa     | 非词汇针     | 针和查询无字面 token 重叠；需要推理      |

## 延伸阅读

- [Kamradt (2023). Needle in a Haystack analysis](https://github.com/gkamradt/LLMTest_NeedleInAHaystack) — 原始 NIAH 仓库
- [Hsieh et al. (2024). RULER: What's the Real Context Size of Your Long-Context LMs?](https://arxiv.org/abs/2404.06654) — 多任务基准
- [Bai et al. (2024). LongBench v2](https://arxiv.org/abs/2412.15204) — 真实世界长上下文评估
- [Modarressi et al. (2024). NoLiMa: Non-lexical needles](https://arxiv.org/abs/2404.06666) — 更难的针测试
- [Kuratov et al. (2024). BABILong](https://arxiv.org/abs/2406.10149) — 草堆中的推理
- [Liu et al. (2024). Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) — 深度偏差论文
