---
title: 对话状态跟踪
description: 任务导向对话系统中的DST：槽值对维护、JGA评估、规则与LLM混合方案
module: nlp
difficulty: advanced
tags:
  - NLP
  - 对话系统
  - 状态跟踪
  - MultiWOZ
  - 结构化输出
related:
  - nlp/词嵌入Word2Vec
  - nlp/词性标注与句法解析
  - nlp/多语言NLP
  - nlp/分块策略与RAG
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 对话状态跟踪

> "我想要北边便宜的餐厅……改成中等价位吧……再加个意大利菜。"三轮对话，三次状态更新。DST 保持槽值字典同步，确保预订正确执行。

## 问题所在

在任务导向对话系统中，用户的目标被编码为一组槽值对：`{cuisine: italian, area: north, price: moderate}`。每一轮用户发言都可能添加、更改或删除一个槽。系统必须读取整个对话并正确输出当前状态。

只要弄错一个槽，系统就会预订错误的餐厅、安排错误的航班或扣错信用卡。DST 是用户所说的内容与后端执行内容之间的枢纽。

为什么在 2026 年 LLM 时代仍然重要：

- 合规敏感领域（银行、医疗、航空预订）需要确定性的槽值，而非自由格式生成。
- 工具使用代理在调用 API 前仍需要槽解析。
- 多轮修正比看起来更难："不，改成周四吧。"

现代流水线：经典 DST 概念 + LLM 提取器 + 结构化输出护栏。

## 核心概念

**任务结构。** 模式定义领域（restaurant、hotel、taxi）及其槽（cuisine、area、price、people）。每个槽可以为空、填充来自封闭集合的值（price: {cheap, moderate, expensive}），或自由格式值（name: "The Copper Kettle"）。

**两种 DST 公式化方式。**

- **分类。** 对每个（槽, 候选值）对，预测是/否。适用于封闭词汇槽。2020 年前的标准方法。
- **生成。** 给定对话，以自由文本生成槽值。适用于开放词汇槽。现代默认方法。

**评估指标。** Joint Goal Accuracy（JGA）——每一轮中所有槽都正确的比例。全对或全错。MultiWOZ 2.4 排行榜在 2026 年最高约 83%。

**架构演进。**

1. **基于规则（槽正则 + 关键词）。** 窄领域的强基线。可调试。
2. **TripPy / BERT-DST。** 基于 BERT 编码的复制生成。LLM 前的标准方案。
3. **LDST（LLaMA + LoRA）。** 指令微调 LLM 配合领域槽提示。在 MultiWOZ 2.4 上达到 ChatGPT 级别质量。
4. **无本体（2024-26）。** 跳过模式；直接生成槽名和值。处理开放领域。
5. **Prompt + 结构化输出（2024-26）。** LLM 配合 Pydantic 模式 + 约束解码。5 行代码，生产就绪。

### 经典失败模式

- **跨轮共指。** "就选第一个吧。"需要解析是哪个选项。
- **覆盖 vs 追加。** 用户说"加个意大利菜"。是替换 cuisine 还是追加？
- **隐式确认。** "好的"——这是否接受了提供的预订？
- **修正。** "改成晚上 7 点吧。"必须更新时间而不清除其他槽。
- **对系统话语的共指。** "对，就那个。"哪个"那个"？

## 动手构建

### 步骤 1：基于规则的槽提取器

参见 `code/main.py`。正则 + 同义词词典覆盖窄领域中 70% 的规范话语：

```python
CUISINE_SYNONYMS = {
    "italian": ["italian", "pasta", "pizza", "italy"],
    "chinese": ["chinese", "chow mein", "noodles"],
}


def extract_cuisine(utterance):
    for canonical, synonyms in CUISINE_SYNONYMS.items():
        if any(syn in utterance.lower() for syn in synonyms):
            return canonical
    return None
```

在规范词汇之外很脆弱。适用于确定性槽确认。

### 步骤 2：状态更新循环

```python
def update_state(state, utterance):
    new_state = dict(state)
    for slot, extractor in SLOT_EXTRACTORS.items():
        value = extractor(utterance)
        if value is not None:
            new_state[slot] = value
    for slot in NEGATION_CLEARS:
        if is_negated(utterance, slot):
            new_state[slot] = None
    return new_state
```

三个不变量：

- 永远不要重置用户未触及的槽。
- 显式否定（"不用管菜系了"）必须清除。
- 用户修正（"改成……"）必须覆盖，而非追加。

### 步骤 3：LLM 驱动的 DST 配合结构化输出

```python
from pydantic import BaseModel
from typing import Literal, Optional
import instructor

class RestaurantState(BaseModel):
    cuisine: Optional[Literal["italian", "chinese", "indian", "thai", "any"]] = None
    area: Optional[Literal["north", "south", "east", "west", "center"]] = None
    price: Optional[Literal["cheap", "moderate", "expensive"]] = None
    people: Optional[int] = None
    day: Optional[str] = None


def llm_dst(history, llm):
    prompt = f"""你跟踪餐厅预订中各轮对话的槽值。
到目前为止的对话：
{render(history)}

根据最新的用户发言更新状态。只输出 JSON 状态。"""
    return llm(prompt, response_model=RestaurantState)
```

Instructor + Pydantic 保证有效的状态对象。无需正则，无模式不匹配，无幻觉槽。

### 步骤 4：JGA 评估

```python
def joint_goal_accuracy(predicted_states, gold_states):
    correct = sum(1 for p, g in zip(predicted_states, gold_states) if p == g)
    return correct / len(predicted_states)
```

校准：系统在多少比例的轮次中所有槽都正确？对于 MultiWOZ 2.4，2026 年顶级系统：80-83%。你的领域内系统应该在窄词汇上超过这个水平，否则 LLM 基线就比你强。

### 步骤 5：处理修正

```python
CORRECTION_CUES = {"actually", "no wait", "on second thought", "change that to"}


def is_correction(utterance):
    return any(cue in utterance.lower() for cue in CORRECTION_CUES)
```

检测到修正时，覆盖最近更新的槽而非追加。没有 LLM 帮助很难做好。现代模式：始终让 LLM 从历史中重新生成整个状态而非增量更新——这自然处理了修正。

## 常见陷阱

- **全历史重新生成成本。** 让 LLM 每轮重新生成状态总共消耗 O(n²) token。限制历史长度或总结较早的轮次。
- **模式漂移。** 事后添加新槽会破坏旧训练数据。为你的模式版本化。
- **大小写敏感。** "Italian" vs "italian" vs "ITALIAN"——到处都要标准化。
- **隐式继承。** 如果用户之前指定了"4 人"，新的时间请求不应清除人数。始终传递完整历史。
- **自由格式 vs 封闭集合。** 名称、时间和地址需要自由格式槽；菜系和区域是封闭的。在模式中混合两者。

## 实际应用

2026 年技术栈：

| 场景                     | 方案                                        |
| ------------------------ | ------------------------------------------- |
| 窄领域（一两个意图）     | 基于规则 + 正则                             |
| 宽领域，有标注数据       | LDST（LLaMA + LoRA 在 MultiWOZ 风格数据上） |
| 宽领域，无标签，生产就绪 | LLM + Instructor + Pydantic 模式            |
| 语音/语音交互            | ASR + 标准化器 + LLM-DST                    |
| 多领域预订流程           | 模式引导 LLM 配合每领域 Pydantic 模型       |
| 合规敏感                 | 基于规则为主，LLM 回退配合确认流程          |

## 练习

1. **简单。** 在 `code/main.py` 中为 3 个槽（cuisine, area, price）构建基于规则的状态跟踪器。在 10 个手工对话上测试。测量 JGA。
2. **中等。** 使用 Instructor + Pydantic + 小型 LLM 在相同数据集上测试。比较 JGA。检查最难的轮次。
3. **困难。** 实现两种方案并路由：基于规则为主，当规则提取出 <2 个高置信度槽时回退到 LLM。测量组合 JGA 和每轮推理成本。

## 关键术语

| 术语       | 人们常说的          | 实际含义                            |
| ---------- | ------------------- | ----------------------------------- |
| DST        | 对话状态跟踪        | 跨对话轮次维护槽值字典              |
| 槽         | 用户意图的单元      | 后端需要的命名参数（cuisine, date） |
| 领域       | 任务区域            | Restaurant, hotel, taxi——槽的集合   |
| JGA        | Joint Goal Accuracy | 每个槽都正确的轮次比例。全对或全错  |
| MultiWOZ   | 标准基准            | 多领域 WOZ 数据集；标准 DST 评估    |
| 无本体 DST | 无模式              | 直接生成槽名和值，无固定列表        |
| 修正       | "改成……"            | 覆盖先前填充槽的轮次                |

## 延伸阅读

- [Budzianowski et al. (2018). MultiWOZ — A Large-Scale Multi-Domain Wizard-of-Oz](https://arxiv.org/abs/1810.00278) — 经典基准
- [Feng et al. (2023). Towards LLM-driven Dialogue State Tracking (LDST)](https://arxiv.org/abs/2310.14970) — LLaMA + LoRA 指令微调用于 DST
- [Heck et al. (2020). TripPy — A Triple Copy Strategy for Value Independent Neural Dialog State Tracking](https://arxiv.org/abs/2005.02877) — 基于复制的 DST 主力方案
- [King, Flanigan (2024). Unsupervised End-to-End Task-Oriented Dialogue with LLMs](https://arxiv.org/abs/2404.10753) — 基于 EM 的无监督 TOD
- [MultiWOZ leaderboard](https://github.com/budzianowski/multiwoz) — 标准 DST 结果
