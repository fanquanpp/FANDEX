---
title: 安全护栏
description: '理解 LLM 应用的安全防护体系，包括输入输出过滤、攻击防御和内容审核'
module: llm
difficulty: intermediate
tags:
  - guardrails
  - safety
  - 'content filtering'
  - 'prompt injection'
  - 安全
related:
  - llm/差分注意力V2
  - llm/多Token预测
  - python/语法速查
  - algorithm/算法分析基础与学习路线
prerequisites: []
---

# 安全护栏

> 没有护栏的 LLM 应用就像没有刹车的汽车。提示注入可以绕过系统指令，越狱攻击可以让模型输出有害内容，数据泄露可能暴露用户隐私。安全护栏是生产部署的必要条件。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 11 Lesson 01（提示工程）
**预计时间：** ~45 分钟

## 学习目标

- 理解 LLM 应用的主要攻击类型
- 实现输入和输出护栏
- 掌握内容过滤和审核工具
- 理解纵深防御策略

## 攻击类型

| 攻击类型 | 描述                                 | 危害等级 |
| -------- | ------------------------------------ | -------- |
| 提示注入 | 通过用户输入覆盖系统指令             | 高       |
| 越狱     | 绕过安全限制让模型输出有害内容       | 高       |
| 数据泄露 | 通过对话提取系统提示或训练数据       | 中       |
| 间接注入 | 通过外部数据源（如网页）注入恶意指令 | 高       |
| 拒绝服务 | 通过复杂请求耗尽 API 配额            | 低       |

## 输入护栏

```python
class InputGuardrail:
    """输入护栏"""

    def __init__(self):
        self.injection_patterns = [
            r"ignore\s+(all\s+)?previous\s+instructions",
            r"forget\s+(all\s+)?previous\s+(instructions|rules)",
            r"you\s+are\s+now\s+",
            r"system\s*:\s*",
            r"<\|im_start\|>",
            r"###\s*instruction",
            r"jailbreak",
            r"DAN\s+mode",
        ]

    def check(self, user_input):
        """检查输入是否安全"""
        issues = []

        # 1. 检测提示注入模式
        import re
        for pattern in self.injection_patterns:
            if re.search(pattern, user_input, re.IGNORECASE):
                issues.append(f"检测到可疑模式: {pattern}")

        # 2. 检测异常长度
        if len(user_input) > 10000:
            issues.append("输入异常长")

        # 3. 检测编码混淆
        if self._has_suspicious_encoding(user_input):
            issues.append("检测到可疑编码")

        return {
            "safe": len(issues) == 0,
            "issues": issues,
        }

    def _has_suspicious_encoding(self, text):
        """检测可疑编码"""
        suspicious = ['\\x', '\\u', '%00', '\\0']
        return any(s in text for s in suspicious)
```

## 输出护栏

```python
class OutputGuardrail:
    """输出护栏"""

    def __init__(self):
        self.pii_patterns = [
            (r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '电话号码'),
            (r'\b[\w.+-]+@[\w-]+\.[\w.-]+\b', '邮箱地址'),
            (r'\b\d{17}[\dXx]\b', '身份证号'),
            (r'\b\d{16,19}\b', '银行卡号'),
        ]

    def check(self, output):
        """检查输出是否安全"""
        issues = []

        # 1. PII 检测
        import re
        for pattern, label in self.pii_patterns:
            if re.search(pattern, output):
                issues.append(f"检测到{label}")

        # 2. 有害内容检测（简化版）
        harmful_keywords = ['制造炸弹', '自杀方法', '黑客攻击教程']
        for keyword in harmful_keywords:
            if keyword in output:
                issues.append(f"检测到有害内容")

        return {
            "safe": len(issues) == 0,
            "issues": issues,
        }

    def redact(self, output):
        """脱敏处理"""
        import re
        for pattern, label in self.pii_patterns:
            output = re.sub(pattern, f'[{label}已脱敏]', output)
        return output
```

## 纵深防御

```
用户输入
  ↓
[输入护栏] → 拦截可疑输入
  ↓
[系统提示] → 明确行为边界
  ↓
[LLM 生成] → 模型自身安全训练
  ↓
[输出护栏] → 过滤有害/敏感内容
  ↓
[内容审核] → 最终审核
  ↓
安全输出
```

## 工具推荐

| 工具              | 用途     | 特点                   |
| ----------------- | -------- | ---------------------- |
| OpenAI Moderation | 内容审核 | 免费 API，检测有害内容 |
| LlamaGuard        | 安全分类 | Meta 开源，可本地部署  |
| NeMo Guardrails   | 对话护栏 | NVIDIA 开源，规则引擎  |
| Guardrails AI     | 输出验证 | 结构化输出验证         |
| Presidio          | PII 脱敏 | 微软开源，隐私保护     |

## 关键术语

| 术语     | 通俗说法       | 实际含义                                              |
| -------- | -------------- | ----------------------------------------------------- |
| 提示注入 | "骗过系统指令" | 通过用户输入覆盖或绕过系统指令的攻击                  |
| 越狱     | "突破限制"     | 绕过安全限制让模型输出有害内容                        |
| 护栏     | "安全检查"     | 在 LLM 输入输出前后进行安全检查的机制                 |
| PII      | "个人隐私信息" | Personally Identifiable Information，可识别个人的信息 |
| 纵深防御 | "多层保护"     | 多层安全措施叠加的防御策略                            |

## 延伸阅读

- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) -- LLM 应用安全风险 Top 10
- [NeMo Guardrails](https://github.com/NVIDIA/NeMo-Guardrails) -- NVIDIA 开源护栏框架
- [LlamaGuard](https://huggingface.co/meta-llama/LlamaGuard-7b) -- Meta 安全分类模型
