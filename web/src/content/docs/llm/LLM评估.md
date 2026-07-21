---
title: LLM评估
description: '理解 LLM 评估的完整框架，包括基准测试、人工评估和自动化评估方法'
module: llm
difficulty: intermediate
tags:
  - evaluation
  - benchmark
  - 评估
  - 基准测试
  - MMLU
related:
  - llm/LangGraph状态机
  - llm/LLM工程评估
  - llm/RAG检索增强生成
  - llm/RLHF人类反馈强化学习
prerequisites:
  - llm/安全护栏
---

# LLM评估

> 无法衡量就无法改进。LLM 评估是连接研究和工程的桥梁——你需要知道模型到底好不好，好在哪，差在哪。

**类型：** 概念
**语言：** Python
**前置条件：** Phase 10 Lesson 06（指令微调 SFT）
**预计时间：** ~45 分钟

## 学习目标

- 理解 LLM 评估的三个层次：自动基准、人工评估、LLM-as-Judge
- 掌握主流基准测试：MMLU、HumanEval、GSM8K
- 理解评估的陷阱：数据污染、提示敏感性
- 构建自定义评估流水线

## 评估维度

| 维度     | 基准                  | 衡量什么           |
| -------- | --------------------- | ------------------ |
| 知识     | MMLU, TriviaQA        | 事实性知识广度     |
| 推理     | GSM8K, ARC            | 数学推理和逻辑推理 |
| 编码     | HumanEval, MBPP       | 代码生成能力       |
| 语言     | HellaSwag, WinoGrande | 语言理解和常识推理 |
| 安全     | TruthfulQA, ToxiGen   | 安全性和真实性     |
| 指令遵循 | AlpacaEval, MT-Bench  | 遵循指令的能力     |

## 自动基准测试

```python
def evaluate_mmlu(model, tokenizer, subjects, num_few_shot=5):
    """评估 MMLU（Massive Multitask Language Understanding）"""
    correct = 0
    total = 0

    for subject in subjects:
        for example in subject.examples:
            # 构建 few-shot 提示
            prompt = ""
            for shot in subject.few_shot_examples[:num_few_shot]:
                prompt += f"Question: {shot.question}\n"
                prompt += f"A. {shot.A}\nB. {shot.B}\nC. {shot.C}\nD. {shot.D}\n"
                prompt += f"Answer: {shot.answer}\n\n"

            prompt += f"Question: {example.question}\n"
            prompt += f"A. {example.A}\nB. {example.B}\nC. {example.C}\nD. {example.D}\n"
            prompt += "Answer:"

            # 生成答案
            input_ids = tokenizer.encode(prompt, return_tensors='pt')
            output = model.generate(input_ids, max_new_tokens=1)
            predicted = tokenizer.decode(output[0][-1]).strip()

            if predicted == example.answer:
                correct += 1
            total += 1

    return correct / total


def evaluate_humaneval(model, tokenizer, problems):
    """评估 HumanEval（代码生成）"""
    pass_rates = []

    for problem in problems:
        # 生成代码
        prompt = problem.prompt
        input_ids = tokenizer.encode(prompt, return_tensors='pt')
        output = model.generate(input_ids, max_new_tokens=512)
        code = tokenizer.decode(output[0][input_ids.shape[1]:])

        # 执行测试用例
        passed = 0
        for test_input, expected in problem.test_cases:
            try:
                exec_globals = {}
                exec(code, exec_globals)
                result = exec_globals[problem.entry_point](test_input)
                if result == expected:
                    passed += 1
            except Exception:
                pass

        pass_rates.append(passed / len(problem.test_cases))

    return sum(pass_rates) / len(pass_rates)  # pass@1
```

## LLM-as-Judge

用强大的 LLM（如 GPT-4）评估其他模型的输出：

```python
def llm_as_judge(judge_model, prompt, response_a, response_b, criteria):
    """使用 LLM 作为评判者"""
    judge_prompt = f"""请根据以下标准评估两个回复：

标准：{criteria}

提示：{prompt}

回复 A：{response_a}

回复 B：{response_b}

哪个回复更好？请选择 A、B 或平局，并解释原因。"""

    judgment = judge_model.generate(judge_prompt)
    return judgment
```

## 评估陷阱

**数据污染。** 如果测试数据出现在训练数据中，评估结果不可靠。检测方法：在测试集上计算 n-gram 重叠率。

**提示敏感性。** 同一任务不同提示格式可能导致显著不同的结果。最佳实践：使用标准化提示模板，报告多个提示的平均结果。

**采样随机性。** temperature > 0 时结果不稳定。最佳实践：报告多次运行的平均值和标准差。

## 关键术语

| 术语         | 通俗说法     | 实际含义                                                               |
| ------------ | ------------ | ---------------------------------------------------------------------- |
| MMLU         | "多任务考试" | Massive Multitask Language Understanding，涵盖 57 个学科的知识评估基准 |
| HumanEval    | "代码考试"   | 164 个 Python 编程问题的代码生成评估基准                               |
| Pass@k       | "k 次通过率" | 生成 k 个候选中至少一个通过测试的概率                                  |
| LLM-as-Judge | "AI 当裁判"  | 使用强大的 LLM 评估其他模型输出的方法                                  |
| 数据污染     | "考试泄题"   | 测试数据出现在训练数据中，导致评估结果虚高                             |

## 延伸阅读

- [Hendrycks et al., 2021 -- "Measuring Massive Multitask Language Understanding"](https://arxiv.org/abs/2009.03300) -- MMLU 基准论文
- [Chen et al., 2021 -- "Evaluating Large Language Models Trained on Code"](https://arxiv.org/abs/2107.03374) -- HumanEval 论文
- [Zheng et al., 2023 -- "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena"](https://arxiv.org/abs/2306.05685) -- LLM-as-Judge 方法论
- [Li et al., 2023 -- "A Primer on Large Language Models and Their Evaluation"](https://arxiv.org/abs/2309.01819) -- LLM 评估综述
