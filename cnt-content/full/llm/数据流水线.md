---
title: 数据流水线
description: '构建 LLM 训练数据流水线，包括数据采集、清洗、去重、质量过滤和格式化'
module: llm
difficulty: intermediate
tags:
  - 'data pipeline'
  - 数据清洗
  - 去重
  - 质量过滤
  - 训练数据
related:
  - llm/少样本与思维链
  - llm/生产应用
  - llm/梯度检查点
  - llm/提示工程
prerequisites:
  - llm/安全护栏
---

# 数据流水线

> 模型的上限由数据决定。GPT-4 的训练数据经过数十道清洗和过滤工序。数据流水线是 LLM 训练中最被低估、却最关键的环节。垃圾进，垃圾出——这不是陈词滥调，这是工程事实。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 01（分词器）
**预计时间：** ~90 分钟

## 学习目标

- 设计完整的 LLM 训练数据流水线，从原始数据到训练就绪格式
- 实现数据清洗：去除噪声、修复编码问题、标准化格式
- 实现去重策略：精确去重、MinHash 近似去重
- 实现质量过滤：语言检测、困惑度过滤、分类器过滤
- 理解数据配比和采样策略对模型性能的影响

## 数据流水线架构

```
原始数据
  ↓
数据采集（Web 爬取、书籍、代码、论文）
  ↓
预处理（提取文本、修复编码、标准化）
  ↓
去重（精确去重 + 近似去重）
  ↓
质量过滤（语言、困惑度、分类器）
  ↓
有害内容过滤（毒性、PII、偏见）
  ↓
数据配比与采样
  ↓
分词与打包
  ↓
训练就绪数据
```

## Step 1: 数据采集和提取

```python
import json
import re
from pathlib import Path
from dataclasses import dataclass


@dataclass
class RawDocument:
    text: str
    source: str
    metadata: dict


def extract_text_from_html(html_content):
    """从 HTML 中提取纯文本"""
    # 移除 script 和 style 标签
    text = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)

    # 移除所有 HTML 标签
    text = re.sub(r'<[^>]+>', ' ', text)

    # 清理多余空白
    text = re.sub(r'\s+', ' ', text).strip()

    return text


def extract_text_from_jsonl(file_path):
    """从 JSONL 文件中提取文档"""
    documents = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            documents.append(RawDocument(
                text=data.get('text', ''),
                source=data.get('source', 'unknown'),
                metadata=data.get('metadata', {})
            ))
    return documents
```

## Step 2: 数据清洗

```python
import unicodedata


class DataCleaner:
    """数据清洗器"""

    def __init__(self, min_length=50, max_length=1_000_000):
        self.min_length = min_length
        self.max_length = max_length

    def clean(self, text):
        """执行完整的清洗流程"""
        text = self.fix_encoding(text)
        text = self.normalize_unicode(text)
        text = self.remove_boilerplate(text)
        text = self.normalize_whitespace(text)
        return text

    def fix_encoding(self, text):
        """修复常见的编码问题"""
        # 修复 mojibake（UTF-8 被错误解码为 Latin-1）
        try:
            text = text.encode('latin-1').decode('utf-8')
        except (UnicodeDecodeError, UnicodeEncodeError):
            pass

        # 修复 Windows-1252 智能引号
        replacements = {
            '\u2018': "'", '\u2019': "'",
            '\u201c': '"', '\u201d': '"',
            '\u2013': '-', '\u2014': '--',
            '\u00a0': ' ',
        }
        for old, new in replacements.items():
            text = text.replace(old, new)

        return text

    def normalize_unicode(self, text):
        """Unicode 标准化"""
        # NFC: 组合字符合成
        text = unicodedata.normalize('NFC', text)
        return text

    def remove_boilerplate(self, text):
        """移除模板文本和噪声"""
        # 移除常见的网页模板文本
        boilerplate_patterns = [
            r'Cookie\s+Policy.*?(?=\n\n|\Z)',
            r'Terms\s+of\s+Service.*?(?=\n\n|\Z)',
            r'Click\s+here\s+to\s+subscribe',
            r'Subscribe\s+to\s+our\s+newsletter',
            r'Follow\s+us\s+on\s+(Twitter|Facebook|Instagram)',
            r'Share\s+this\s+article',
        ]
        for pattern in boilerplate_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)

        return text

    def normalize_whitespace(self, text):
        """标准化空白字符"""
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def filter_by_length(self, text):
        """按长度过滤"""
        return self.min_length <= len(text) <= self.max_length
```

## Step 3: 去重

### 精确去重

```python
import hashlib


def exact_dedup(documents):
    """基于哈希的精确去重"""
    seen_hashes = set()
    unique_docs = []

    for doc in documents:
        # 使用 SHA-256 哈希
        doc_hash = hashlib.sha256(doc.text.encode('utf-8')).hexdigest()

        if doc_hash not in seen_hashes:
            seen_hashes.add(doc_hash)
            unique_docs.append(doc)

    return unique_docs
```

### MinHash 近似去重

MinHash 是大规模数据去重的标准方法。它通过将文档映射为固定长度的签名来快速估计文档间的相似度。

```python
import struct
from typing import List, Set


class MinHashDeduplicator:
    """MinHash 近似去重器"""

    def __init__(self, num_perm=128, threshold=0.8, n_grams=5):
        self.num_perm = num_perm
        self.threshold = threshold
        self.n_grams = n_grams

        # 生成随机哈希函数的参数
        # h(x) = (a * x + b) % prime
        self.prime = (1 << 61) - 1  # Mersenne prime
        import random
        random.seed(42)
        self.a = [random.randint(1, self.prime - 1) for _ in range(num_perm)]
        self.b = [random.randint(0, self.prime - 1) for _ in range(num_perm)]

    def _get_ngrams(self, text: str) -> Set[str]:
        """获取文本的 n-gram 集合"""
        tokens = text.lower().split()
        return {tuple(tokens[i:i + self.n_grams])
                for i in range(len(tokens) - self.n_grams + 1)}

    def _hash_ngram(self, ngram):
        """哈希 n-gram 为整数"""
        return hash(str(ngram)) & 0xFFFFFFFF

    def compute_signature(self, text: str) -> List[int]:
        """计算文档的 MinHash 签名"""
        ngrams = self._get_ngrams(text)

        if not ngrams:
            return [self.prime] * self.num_perm

        signature = [self.prime] * self.num_perm

        for ngram in ngrams:
            h = self._hash_ngram(ngram)
            for i in range(self.num_perm):
                # 哈希函数: h_i(x) = (a_i * x + b_i) % prime
                perm_hash = (self.a[i] * h + self.b[i]) % self.prime
                if perm_hash < signature[i]:
                    signature[i] = perm_hash

        return signature

    def estimate_similarity(self, sig1: List[int], sig2: List[int]) -> float:
        """估计两个文档的 Jaccard 相似度"""
        matches = sum(1 for a, b in zip(sig1, sig2) if a == b)
        return matches / self.num_perm

    def deduplicate(self, documents):
        """去重文档集合"""
        signatures = []
        unique_docs = []

        for doc in documents:
            sig = self.compute_signature(doc.text)

            is_duplicate = False
            for existing_sig in signatures:
                sim = self.estimate_similarity(sig, existing_sig)
                if sim >= self.threshold:
                    is_duplicate = True
                    break

            if not is_duplicate:
                signatures.append(sig)
                unique_docs.append(doc)

        return unique_docs
```

## Step 4: 质量过滤

```python
import math
from collections import Counter


class QualityFilter:
    """数据质量过滤器"""

    def __init__(self, target_language='en'):
        self.target_language = target_language

    def filter_language(self, text, min_ratio=0.8):
        """简单的语言检测：基于常见词比例"""
        # 英语常见词列表
        common_words = {
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that',
            'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he',
            'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by',
            'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an',
            'will', 'my', 'one', 'all', 'would', 'there', 'their',
        }

        words = text.lower().split()
        if not words:
            return False

        common_count = sum(1 for w in words if w in common_words)
        ratio = common_count / len(words)

        return ratio >= min_ratio

    def filter_perplexity(self, text, max_perplexity=500):
        """基于简单 n-gram 模型的困惑度过滤"""
        # 使用字符级 unigram 模型近似
        char_counts = Counter(text)
        total_chars = len(text)

        if total_chars == 0:
            return False

        # 计算困惑度
        log_prob = 0
        for char in text:
            prob = char_counts[char] / total_chars
            if prob > 0:
                log_prob += math.log2(prob)

        avg_log_prob = log_prob / total_chars if total_chars > 0 else 0
        perplexity = 2 ** (-avg_log_prob)

        return perplexity <= max_perplexity

    def filter_repetition(self, text, max_duplicate_ratio=0.3):
        """过滤重复内容过多的文档"""
        lines = text.split('\n')
        if not lines:
            return False

        unique_lines = set(lines)
        duplicate_ratio = 1 - len(unique_lines) / len(lines)

        return duplicate_ratio <= max_duplicate_ratio

    def filter_quality_heuristics(self, text):
        """基于启发式规则的质量过滤"""
        # 检查是否包含足够的标点
        punctuation = sum(1 for c in text if c in '.!?,;:')
        if punctuation / max(len(text), 1) < 0.01:
            return False

        # 检查平均词长是否合理
        words = text.split()
        if words:
            avg_word_len = sum(len(w) for w in words) / len(words)
            if avg_word_len < 2 or avg_word_len > 15:
                return False

        # 检查数字比例
        digit_ratio = sum(1 for c in text if c.isdigit()) / max(len(text), 1)
        if digit_ratio > 0.5:
            return False

        return True

    def apply_all(self, text):
        """应用所有质量过滤器"""
        filters = [
            self.filter_language,
            self.filter_perplexity,
            self.filter_repetition,
            self.filter_quality_heuristics,
        ]

        for f in filters:
            if not f(text):
                return False

        return True
```

## Step 5: 数据配比

训练数据的配比直接影响模型的能力分布。

```python
class DataMixer:
    """数据配比和采样器"""

    def __init__(self):
        self.datasets = {}

    def add_dataset(self, name, documents, weight=1.0):
        """添加数据集及其采样权重"""
        self.datasets[name] = {
            'documents': documents,
            'weight': weight,
            'index': 0,
        }

    def sample_batch(self, batch_size):
        """按权重采样一个批次"""
        import random

        total_weight = sum(d['weight'] for d in self.datasets.values())
        weights = [d['weight'] / total_weight for d in self.datasets.values()]

        batch = []
        names = list(self.datasets.keys())

        for _ in range(batch_size):
            # 按权重选择数据集
            dataset_name = random.choices(names, weights=weights, k=1)[0]
            dataset = self.datasets[dataset_name]

            # 循环取文档
            doc = dataset['documents'][dataset['index'] % len(dataset['documents'])]
            dataset['index'] += 1
            batch.append(doc)

        random.shuffle(batch)
        return batch
```

典型的 LLM 训练数据配比：

| 数据类型  | 比例   | 来源                      |
| --------- | ------ | ------------------------- |
| 网页文本  | 50-60% | Common Crawl              |
| 书籍      | 10-15% | Books3, Project Gutenberg |
| 学术论文  | 5-10%  | arXiv, S2ORC              |
| 代码      | 10-15% | GitHub                    |
| 百科/知识 | 5-10%  | Wikipedia                 |
| 对话/论坛 | 5-10%  | Reddit, StackExchange     |

## 关键术语

| 术语       | 通俗说法       | 实际含义                                                 |
| ---------- | -------------- | -------------------------------------------------------- |
| 数据流水线 | "数据处理流程" | 从原始数据到训练就绪数据的完整处理链                     |
| 精确去重   | "完全相同去重" | 基于哈希的完全相同文档去重                               |
| MinHash    | "近似去重"     | 通过哈希签名快速估计文档相似度的算法，用于大规模近似去重 |
| 困惑度过滤 | "语言模型打分" | 用语言模型评估文本质量，过滤不自然或低质量文本           |
| 数据配比   | "数据混合比例" | 不同来源数据在训练集中的采样权重                         |

## 延伸阅读

- [Rae et al., 2021 -- "Scaling Language Models: Methods, Analysis & Insights from Training Gopher"](https://arxiv.org/abs/2112.11446) -- DeepMind 关于数据质量对模型性能影响的详细分析
- [Penedo et al., 2023 -- "The RefinedWeb Dataset for Falcon LLM"](https://arxiv.org/abs/2306.01116) -- 大规模 Web 数据清洗和去重的工程实践
- [Lee et al., 2022 -- "Deduplicating Training Data Makes Language Models Better"](https://arxiv.org/abs/2107.06499) -- 去重对模型性能影响的实证研究
- [Wenzek et al., 2020 -- "CCNet: Extracting High Quality Monolingual Datasets from Web Crawl Data"](https://arxiv.org/abs/1911.00359) -- 使用困惑度过滤提升数据质量的方法
