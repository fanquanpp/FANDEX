---
title: 聊天机器人：从规则到神经
description: 理解基于规则、检索式和生成式聊天机器人的演进与适用场景
module: nlp
difficulty: beginner
tags:
  - 聊天机器人
  - 对话系统
  - 意图识别
  - RAG
  - 生成式
related:
  - nlp/机器翻译
  - nlp/结构化输出与约束解码
  - nlp/命名实体识别
  - nlp/嵌入模型深入
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 聊天机器人：从规则到神经

> 规则聊天机器人从不意外。检索聊天机器人从不幻觉。生成式聊天机器人从不无聊。生产系统三者都用。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 05（情感分析），Phase 5 · 13（问答系统）
**时间:** ~75 分钟

## 问题

用户输入"I need to change my flight"并期望一个有用的回应。三种架构可以产生那个回应。

- **基于规则。** 正则匹配"change flight" → 预写模板。"I can help you change your flight. What's your booking reference?" 确定性、可审计、零意外。每个意图需要一条规则。新意图需要新规则。
- **检索式。** 编码用户消息，在标注的意图-回应库中找最相似的，返回对应回应。比规则更灵活。仍然只返回预写回应。
- **生成式。** 大型语言模型产生回应。灵活、流畅、能处理未预见的输入。可能幻觉、越界、或做你不想做的事。

生产聊天机器人是三者的混合。意图分类器路由到规则或检索。回退到生成式。本课程构建每种并命名路由逻辑。

## 概念

**意图分类。** 将用户消息分类到固定意图集。航班变更、退款、状态查询等。课程05的文本分类器做这个。意图分类器是路由器：它决定哪个后端处理请求。

**实体提取。** 从用户消息中提取参数。日期、航班号、金额。课程06的NER做这个。

**对话状态跟踪。** 跨轮次记住对话的当前状态。用户说了什么，还缺什么，下一步是什么。有限状态机或神经模型。

**回应生成。** 规则 → 模板填充。检索 → 最相似回应。生成式 → LLM输出。

## 构建它

### 步骤 1：基于规则的聊天机器人

```python
import re

INTENT_PATTERNS = {
    "greet": [r"\b(hi|hello|hey)\b"],
    "change_flight": [r"\bchange\s+flight\b", r"\bmodify\s+booking\b"],
    "refund": [r"\brefund\b", r"\bmoney\s+back\b"],
    "status": [r"\bflight\s+status\b", r"\bwhere\s+is\s+my\s+flight\b"],
}

RESPONSES = {
    "greet": "Hello! How can I help you today?",
    "change_flight": "I can help you change your flight. What's your booking reference?",
    "refund": "I'll process your refund request. Can you provide your booking reference?",
    "status": "Let me check your flight status. What's your flight number?",
    "fallback": "I'm not sure I understand. Could you rephrase that?",
}


def rule_based_chat(message):
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return RESPONSES[intent]
    return RESPONSES["fallback"]
```

### 步骤 2：意图分类器

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


class IntentClassifier:
    def __init__(self):
        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
            ("clf", LogisticRegression(C=1.0, max_iter=1000)),
        ])
        self.intents = []

    def train(self, texts, labels):
        self.intents = sorted(set(labels))
        self.pipeline.fit(texts, labels)

    def predict(self, text):
        intent = self.pipeline.predict([text])[0]
        prob = self.pipeline.predict_proba([text]).max()
        return intent, prob
```

### 步骤 3：混合路由

```python
class HybridChatbot:
    def __init__(self, intent_classifier, responses, confidence_threshold=0.6):
        self.classifier = intent_classifier
        self.responses = responses
        self.threshold = confidence_threshold

    def respond(self, message):
        intent, confidence = self.classifier.predict(message)
        if confidence >= self.threshold:
            return self.responses.get(intent, self.responses["fallback"])
        return self.responses["fallback"]
```

### 步骤 4：生成式回退

```python
def generate_response(message, context="", llm=None):
    if llm is None:
        return "I'll connect you with a human agent."
    prompt = f"""You are a helpful airline assistant.
Context: {context}
User: {message}
Assistant:"""
    return llm(prompt)
```

## 使用它

| 场景                 | 选择                                    |
| -------------------- | --------------------------------------- |
| 有限意图，高合规要求 | 基于规则                                |
| 中等意图，预写回应   | 意图分类 + 检索                         |
| 开放域对话           | 生成式 (LLM)                            |
| 企业客服             | 混合：意图路由 + 规则/检索 + 生成式回退 |

## 交付它

将结果保存为 `outputs/skill-chatbot-architect.md`。

## 练习

1. **简单。** 构建一个覆盖5个意图的基于规则聊天机器人。测试20条消息。测量准确率和回退率。
2. **中等。** 在标注数据上训练意图分类器。与基于规则比较。测量意图分类的精确率/召回率。
3. **困难。** 构建带对话状态跟踪的完整混合聊天机器人。跟踪多轮对话（如航班变更需要预订参考 + 新日期）。测量任务完成率。

## 关键术语

| 术语     | 通俗说法       | 实际含义                             |
| -------- | -------------- | ------------------------------------ |
| 意图分类 | 用户想要什么   | 将用户消息分类到固定意图集。         |
| 实体提取 | 获取参数       | 从用户消息中提取结构化数据。         |
| 对话状态 | 对话进行到哪了 | 跨轮次跟踪对话的当前状态。           |
| 回退     | 安全退出       | 当没有规则/检索匹配时返回默认回应。  |
| 混合路由 | 智能分发       | 基于意图分类路由到规则/检索/生成式。 |

## 延伸阅读

- [Jurafsky and Martin — Dialog Systems](https://web.stanford.edu/~jurafsky/slp3/24.pdf) — 经典教科书处理。
- [Bocklisch et al. (2017). Rasa: Open Source Language Understanding and Dialogue Management](https://arxiv.org/abs/1712.05181) — 开源对话框架。
