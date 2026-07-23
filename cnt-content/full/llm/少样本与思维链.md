---
title: 少样本与思维链
description: '掌握 Few-Shot、Chain-of-Thought、Tree-of-Thought 等高级提示技术'
module: llm
difficulty: intermediate
tags:
  - 'few-shot'
  - CoT
  - ToT
  - ReAct
  - 思维链
  - 思维树
related:
  - llm/嵌入
  - llm/上下文工程
  - llm/生产应用
  - llm/数据流水线
prerequisites:
  - llm/安全护栏
---

# 少样本与思维链

> Zero-shot 让模型"裸考"，Few-shot 给它"参考答案"，CoT 让它"写出解题过程"，ToT 让它"探索多条路"。每种技术都解决不同的问题——知道何时用哪个，才是提示工程的核心能力。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 01（提示工程）
**预计时间：** ~60 分钟

## 学习目标

- 理解 Zero-shot、Few-shot、CoT、ToT 的区别和适用场景
- 实现 Self-Consistency 和 ReAct 模式
- 掌握结构化提示和提示链的设计
- 理解各种技术的性能权衡

## 提示技术对比

| 技术             | 示例数   | 推理          | 适用场景      | 成本 |
| ---------------- | -------- | ------------- | ------------- | ---- |
| Zero-shot        | 0        | 无            | 简单任务      | 低   |
| Few-shot         | 1-5      | 无            | 格式/风格控制 | 低   |
| CoT              | 0-5      | 线性          | 数学/逻辑推理 | 中   |
| Self-Consistency | 多次 CoT | 线性 + 投票   | 高可靠性推理  | 高   |
| ToT              | 0        | 树状          | 复杂规划      | 很高 |
| ReAct            | 0        | 交错推理+行动 | 需要外部工具  | 高   |

## Few-Shot 提示

```python
FEW_SHOT_PROMPT = """将电影评论分类为正面或负面：

评论: "这部电影太精彩了，演员演技出色"
情感: 正面

评论: "浪费时间和金钱，剧情无聊"
情感: 负面

评论: "特效不错但故事薄弱"
情感: 负面

评论: "{user_review}"
情感:"""
```

Few-shot 的关键：示例的顺序、数量和多样性都会影响结果。3-5 个示例通常是最佳范围。

## Chain-of-Thought（思维链）

CoT 让模型逐步推理，显著提升数学和逻辑任务的准确率。

```
标准提示:
Q: 餐厅有 23 个苹果。如果他们用 20 个做午餐，又买了 6 个，他们有多少个苹果？
A: 9

CoT 提示:
Q: 餐厅有 23 个苹果。如果他们用 20 个做午餐，又买了 6 个，他们有多少个苹果？
A: 餐厅原来有 23 个苹果。他们用了 20 个做午餐，所以剩下 23 - 20 = 3 个。
   然后他们又买了 6 个，所以现在有 3 + 6 = 9 个苹果。
   答案是 9。
```

**Zero-shot CoT：** 不需要示例，只需在提示末尾加上"让我们一步一步思考"。

## Self-Consistency

多次采样 CoT 推理，取多数投票结果：

```python
import asyncio


async def self_consistency(model, prompt, n_samples=5, temperature=0.7):
    """Self-Consistency 推理"""
    tasks = []
    for _ in range(n_samples):
        response = await model.generate(
            prompt + "\n让我们一步一步思考。",
            temperature=temperature,
        )
        tasks.append(response)

    results = await asyncio.gather(*tasks)

    # 提取最终答案
    answers = [extract_final_answer(r) for r in results]

    # 多数投票
    from collections import Counter
    answer_counts = Counter(answers)
    best_answer = answer_counts.most_common(1)[0][0]

    return best_answer, answer_counts
```

## Tree-of-Thought（思维树）

ToT 让模型探索多条推理路径，评估每条路径，选择最优解：

```python
class TreeOfThought:
    """简化的思维树"""

    def __init__(self, model, n_branches=3, max_depth=3):
        self.model = model
        self.n_branches = n_branches
        self.max_depth = max_depth

    async def solve(self, problem):
        """求解问题"""
        return await self._search(problem, "", 0)

    async def _search(self, problem, current_thought, depth):
        if depth >= self.max_depth:
            score = await self._evaluate(problem, current_thought)
            return current_thought, score

        # 生成多个候选思路
        thoughts = await self._generate_thoughts(
            problem, current_thought, self.n_branches)

        # 评估每个思路
        scored_thoughts = []
        for thought in thoughts:
            full_thought = f"{current_thought}\n{thought}" if current_thought else thought
            result, score = await self._search(problem, full_thought, depth + 1)
            scored_thoughts.append((result, score))

        # 选择最高分的路径
        return max(scored_thoughts, key=lambda x: x[1])

    async def _generate_thoughts(self, problem, current, n):
        prompt = f"问题：{problem}\n当前思路：{current}\n生成 {n} 个不同的下一步思路："
        response = await self.model.generate(prompt)
        return response.strip().split('\n')[:n]

    async def _evaluate(self, problem, thought):
        prompt = f"问题：{problem}\n完整思路：{thought}\n这个思路的质量评分（0-10）："
        response = await self.model.generate(prompt, temperature=0)
        try:
            return float(response.strip())
        except ValueError:
            return 0.0
```

## ReAct（推理+行动）

ReAct 交错推理和工具调用：

```
问题: 2024年奥斯卡最佳影片的导演是谁？

思考: 我需要查找2024年奥斯卡最佳影片的信息。
行动: search("2024 Oscar Best Picture winner")
观察: 《奥本海默》获得2024年奥斯卡最佳影片

思考: 现在我需要查找《奥本海默》的导演。
行动: search("Oppenheimer movie director")
观察: 克里斯托弗·诺兰

思考: 我已经找到了答案。
回答: 2024年奥斯卡最佳影片《奥本海默》的导演是克里斯托弗·诺兰。
```

## 提示链

将复杂任务分解为多个子任务的串行提示：

```python
async def prompt_chain(model, user_input):
    """提示链示例：文章写作流程"""

    # Step 1: 生成大纲
    outline = await model.generate(
        f"为以下主题生成文章大纲：{user_input}"
    )

    # Step 2: 扩展每个章节
    sections = []
    for section_title in parse_outline(outline):
        section = await model.generate(
            f"根据大纲，详细撰写以下章节：\n{section_title}\n大纲：{outline}"
        )
        sections.append(section)

    # Step 3: 润色全文
    full_text = "\n\n".join(sections)
    polished = await model.generate(
        f"润色以下文章，确保风格一致、过渡自然：\n{full_text}"
    )

    return polished
```

## 关键术语

| 术语             | 通俗说法     | 实际含义                                    |
| ---------------- | ------------ | ------------------------------------------- |
| Few-shot         | "给几个例子" | 在提示中提供少量示例引导模型输出            |
| CoT              | "写解题过程" | Chain-of-Thought，让模型展示逐步推理过程    |
| Self-Consistency | "多次投票"   | 多次采样 CoT 推理，取多数投票结果           |
| ToT              | "探索多条路" | Tree-of-Thought，探索多条推理路径并选择最优 |
| ReAct            | "边想边做"   | 交错推理和工具调用的模式                    |
| 提示链           | "分步提示"   | 将复杂任务分解为多个串行子任务              |

## 延伸阅读

- [Wei et al., 2022 -- "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"](https://arxiv.org/abs/2201.11903) -- CoT 原始论文
- [Yao et al., 2023 -- "Tree of Thoughts: Deliberate Problem Solving with Large Language Models"](https://arxiv.org/abs/2305.10601) -- ToT 论文
- [Yao et al., 2023 -- "ReAct: Synergizing Reasoning and Acting in Language Models"](https://arxiv.org/abs/2210.03629) -- ReAct 论文
- [Wang et al., 2022 -- "Self-Consistency Improves Chain of Thought Reasoning in Language Models"](https://arxiv.org/abs/2203.11171) -- Self-Consistency 论文
