---
order: 67
title: Python与NLP
module: python
category: Python
difficulty: intermediate
description: 自然语言处理核心理论、spaCy/Transformers/NLTK 工程实践与 Transformer 注意力机制形式化推导
author: fanquanpp
updated: '2026-07-20'
related:
- python/Python与机器学习
- python/Python与深度学习
- python/Python与计算机视觉
- python/Python与Web爬虫
prerequisites:
- python/语法速查
tags:
- python
- nlp
- spacy
- transformers
- llm
- tokenizer
- attention
learningObjectives:
- '{''remember'': ''复述自然语言处理的核心任务类型（分词、词性标注、命名实体识别、依存句法分析、语义角色标注）及其形式化定义''}'
- '{''understand'': ''解释 Transformer 注意力机制的数学形式化与softmax归一化的几何意义''}'
- '{''apply'': ''使用 spaCy 工业级流水线完成中文/英文文本的实体识别与依存分析''}'
- '{''apply'': ''使用 Hugging Face Transformers 调用预训练模型完成文本分类、问答、生成任务''}'
- '{''analyze'': ''对比 NLTK、spaCy、Transformers 三大NLP库的架构差异、性能特征与适用场景''}'
- '{''evaluate'': ''评估预训练模型在特定业务场景下的选择策略（BERT vs GPT vs T5）''}'
- '{''create'': ''设计端到端的中文情感分析系统，包含数据预处理、模型微调、推理服务化''}'
exercises:
- id: nlp-ex-01
  type: fill-blank
  cognitiveLevel: remember
  question: 在 Transformer 自注意力机制中，查询矩阵 Q、键矩阵 K、V 值矩阵 V 的注意力计算公式为 Attention(Q,K,V) = softmax(____) V，其中 d_k 是键向量的维度。
  blankCount: 1
  answers:
  - QK^T / sqrt(d_k)
  caseSensitive: false
  answer: QK^T / sqrt(d_k)
  explanation: 缩放点积注意力通过除以 sqrt(d_k) 抵消点积随维度增长而方差变大的效应，保持 softmax 梯度稳定。
  difficulty: 2
  estimatedTime: 3
- id: nlp-ex-02
  type: choice
  cognitiveLevel: understand
  question: 关于 spaCy 与 NLTK 的对比，下列说法正确的是？
  options:
  - spaCy 采用流水线（pipeline）设计，强调工业级性能与生产部署，但算法选择自由度较低
  - NLTK 主要面向教学与研究，提供丰富的语料库与算法实现，但性能不适合大规模生产环境
  - spaCy 默认使用基于规则的分词器，无法处理中文
  - NLTK 的命名实体识别准确率在生产环境普遍优于 spaCy
  correctIndex: 0
  multiple: false
  explanation: spaCy 的设计哲学是"实用优先"，采用 Cython 优化核心路径，流水线设计使组件可组合但替换成本较高；NLTK 教学属性更强，算法实现多样但性能未做工程级优化。
  difficulty: 3
  estimatedTime: 4
  answer: A. spaCy 的设计哲学是"实用优先"，采用 Cython 优化核心路径，流水线设计使组件可组合但替换成本较高；NLTK 教学属性更强，算法实现多样但性能未做工程级优化。
- id: nlp-ex-03
  type: code-fix
  cognitiveLevel: apply
  question: 以下使用 spaCy 处理中文文本的代码存在两处缺陷，请修正使其能正确完成分词与命名实体识别。
  buggyCode: "import spacy\nnlp = spacy.load(\"en_core_web_sm\")\ndoc = nlp(\"北京是中国的首都\")\nfor token in doc:\n    print(token.text, token.pos_)\nfor ent in doc.ents:\n    print(ent.text, ent.label_)\n"
  language: python
  fixedCode: "import spacy\n# 修正点1：中文需加载中文模型而非英文模型\nnlp = spacy.load(\"zh_core_web_sm\")\ndoc = nlp(\"北京是中国的首都\")\nfor token in doc:\n    print(token.text, token.pos_)\nfor ent in doc.ents:\n    print(ent.text, ent.label_)\n"
  errorDescription: 中文文本需加载对应中文预训练模型 zh_core_web_sm，否则分词与实体识别将退化为字符级处理，准确率极低。
  answer: 将 spacy.load("en_core_web_sm") 改为 spacy.load("zh_core_web_sm")
  difficulty: 3
  estimatedTime: 5
- id: nlp-ex-04
  type: open-ended
  cognitiveLevel: create
  question: 假设你需要为某电商平台构建一个中文商品评论情感分析系统，日均评论量 500 万条，对延迟敏感（P99 < 200ms）。请描述你的技术选型、模型架构、工程化方案与潜在风险。
  keyPoints:
  - 数据策略（标注成本、类别不均衡、噪声过滤）
  - 模型选型（轻量级 BERT/RoBERTa-wwm 与 LLM API 的权衡）
  - 工程化（ONNX Runtime、模型蒸馏、批处理推理）
  - 监控与漂移（数据漂移检测、A/B 测试、人工回评闭环）
  - 成本与合规（推理成本、隐私脱敏、模型可解释性）
  minWords: 300
  answer: 开放性问题，参考要点为：建议采用 RoBERTa-wwm-ext 微调 + ONNX 量化部署；标注阶段使用主动学习降本；推理服务使用 FastAPI + Triton Inference Server；设置漂移监控与人工回评闭环。
  difficulty: 5
  estimatedTime: 30
references:
- type: conference
  authors:
  - Vaswani, A.
  - Shazeer, N.
  - Parmar, N.
  - Uszkoreit, J.
  - Jones, L.
  - Gomez, A. N.
  - Kaiser, L.
  - Polosukhin, I.
  year: 2017
  title: Attention Is All You Need
  venue: Advances in Neural Information Processing Systems (NeurIPS)
  pages: 5998-6008
  doi: 10.48550/arXiv.1706.03762
  url: https://arxiv.org/abs/1706.03762
- type: conference
  authors:
  - Devlin, J.
  - Chang, M.-W.
  - Lee, K.
  - Toutanova, K.
  year: 2019
  title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding'
  venue: Proceedings of NAACL-HLT
  pages: 4171-4186
  doi: 10.18653/v1/N19-1423
  url: https://aclanthology.org/N19-1423
- type: conference
  authors:
  - Honnibal, M.
  - Montani, I.
  - Van Landeghem, S.
  - Boyd, A.
  year: 2020
  title: 'spaCy: Industrial-strength Natural Language Processing in Python'
  venue: Zenodo Software Release
  doi: 10.5281/zenodo.1212303
  url: https://spacy.io
- type: conference
  authors:
  - Bird, S.
  - Klein, E.
  - Loper, E.
  year: 2009
  title: 'Natural Language Processing with Python: Analyzing Text with the Natural Language Toolkit'
  venue: O'Reilly Media
  url: https://www.nltk.org/book/
- type: conference
  authors:
  - Wolf, T.
  - Debut, L.
  - Sanh, V.
  - Chaumond, J.
  - Delangue, C.
  - Moi, A.
  - Cistac, P.
  - Rault, T.
  - Louf, R.
  - Funtowicz, M.
  - Davison, J.
  - Shleifer, S.
  - von Platen, P.
  - Carr, C.
  - Rush, A. M.
  - et al.
  year: 2020
  title: 'Transformers: State-of-the-Art Natural Language Processing'
  venue: Proceedings of EMNLP 2020 (Demonstrations)
  pages: 38-45
  doi: 10.18653/v1/2020.emnlp-demos.6
  url: https://aclanthology.org/2020.emnlp-demos.6
- type: conference
  authors:
  - Brown, T. B.
  - Mann, B.
  - Ryder, N.
  - Subbiah, M.
  - Kaplan, J.
  - Dhariwal, P.
  - Neelakantan, A.
  - Shyam, P.
  - Sastry, G.
  - Askell, A.
  - et al.
  year: 2020
  title: Language Models are Few-Shot Learners
  venue: Advances in Neural Information Processing Systems (NeurIPS)
  pages: 1877-1901
  doi: 10.48550/arXiv.2005.14165
  url: https://arxiv.org/abs/2005.14165
- type: journal
  authors:
  - Raffel, C.
  - Shazeer, N.
  - Roberts, A.
  - Lee, K.
  - Narang, S.
  - Matena, M.
  - Zhou, Y.
  - Li, W.
  - Liu, P. J.
  year: 2020
  title: Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer
  venue: Journal of Machine Learning Research
  volume: 21
  pages: 1-67
  url: https://jmlr.org/papers/v21/20-074.html
etymology:
- term: 自然语言处理
  english: Natural Language Processing
  origin: 1950年代由机器翻译研究催生，术语 NLP 在 1980 年代随统计方法兴起而普及
- term: 分词
  english: Tokenization
  origin: token 源自古英语 tacen（标志、信号），计算机科学中指最小语义单元
- term: 注意力机制
  english: Attention Mechanism
  origin: Bahdanau 等 2014 年在神经机器翻译中首次提出，2017 年 Vaswani 等以自注意力形式化
- term: 命名实体识别
  english: Named Entity Recognition
  origin: 1995 年第六届消息理解会议（MUC-6）首次定义命名实体任务
- term: 词向量
  english: Word Embedding
  origin: embed 源于古英语 embedde（嵌入），表示将离散符号映射到连续向量空间
lastReviewed: '2026-07-20'
reviewer: FANDEX Content Engineering Team
estimatedReadingTime: 95
---

## 1. 概述与学习路径

自然语言处理（Natural Language Processing，NLP）是计算机科学、人工智能与语言学的交叉学科，目标是让计算机能够理解、生成、翻译人类自然语言。Python 凭借其简洁语法、丰富的科学计算生态与开源社区的持续投入，已成为 NLP 研究与工业实践的事实标准语言。

本模块面向已掌握 Python 基础语法的开发者，系统讲解 NLP 的核心理论、形式化定义、主流库的工程实践与前沿大模型的工程化落地。学习完成后，读者应能独立完成从原始文本预处理到生产级推理服务部署的完整链路。

### 1.1 模块定位

本模块在 FANDEX Python 教程中的位置如下：

- 前置：语法速查、Python与机器学习、Python与深度学习
- 平行：Python与计算机视觉、Python与Web爬虫
- 后续：Python与大模型、Python与向量数据库

### 1.2 阅读约定

- 数学公式采用 KaTeX 语法
- 代码示例标注 `python` 语言标签
- 中文术语首次出现时附英文原词
- Python 版本参考 3.11/3.12/3.13 主流版本

## 2. 学习目标

本模块采用 Bloom 分类法刻画学习目标，覆盖从记忆到创造的完整认知层次：

1. **记忆（remember）**：复述 NLP 核心任务类型（分词、词性标注、命名实体识别、依存句法分析、语义角色标注）及其形式化定义。
2. **理解（understand）**：解释 Transformer 注意力机制的数学形式化与 softmax 归一化的几何意义。
3. **应用（apply）**：使用 spaCy 工业级流水线完成中文/英文文本的实体识别与依存分析。
4. **应用（apply）**：使用 Hugging Face Transformers 调用预训练模型完成文本分类、问答、生成任务。
5. **分析（analyze）**：对比 NLTK、spaCy、Transformers 三大 NLP 库的架构差异、性能特征与适用场景。
6. **评价（evaluate）**：评估预训练模型在特定业务场景下的选择策略（BERT vs GPT vs T5）。
7. **创造（create）**：设计端到端的中文情感分析系统，包含数据预处理、模型微调、推理服务化。

## 3. 历史动机与演进时间线

### 3.1 NLP 的发展脉络

自然语言处理的演进可分为四个主要阶段，每一阶段对应不同的方法论与工具范式。

#### 3.1.1 规则符号主义阶段（1950-1980）

1950 年，Alan Turing 在《Computing Machinery and Intelligence》中提出图灵测试，将自然语言对话作为机器智能的判定标准。这一时期的 NLP 以基于规则的符号系统为主，代表项目包括：

- 1954 年乔治城-IBM 实验：俄英机器翻译系统，基于词典与语法规则
- 1966 年 ELIZA：Joseph Weizenbaum 在 MIT 编写的规则式对话系统，模拟心理治疗师
- 1970 年代 SHRDLU：Terry Winograd 在 MIT 的积木世界自然语言理解系统

规则方法的瓶颈在于：自然语言现象的复杂度远超人工规则覆盖能力，且规则间冲突难以调和。

#### 3.1.2 统计学习阶段（1980-2010）

1980 年代起，IBM Watson 研究中心的 Frederick Jelinek 团队提出基于隐马尔可夫模型（HMM）的语音识别与机器翻译方法，开启统计 NLP 时代。这一阶段的代表性工作包括：

- 1988 年基于 HMM 的词性标注（Church, 1988）
- 1993 年 IBM 模型 1-5（Brown et al.）统计机器翻译
- 1995 年第六届消息理解会议（MUC-6）首次正式定义命名实体识别任务
- 2003 年 Bengio 等提出神经语言模型，首次将词表示为稠密向量

#### 3.1.3 深度学习阶段（2010-2017）

2013 年 Tomas Mikolov 等提出 Word2Vec，将词嵌入推向工业应用。2014 年 Bahdanau 等提出注意力机制解决神经机器翻译的对齐问题。2015 年 PENN Treebank 上的依存分析准确率被深度学习模型刷新。

#### 3.1.4 大模型时代（2017-至今）

2017 年 Vaswani 等发表《Attention Is All You Need》，提出 Transformer 架构，彻底改变 NLP 范式。此后：

- 2018 年 OpenAI GPT、Google BERT
- 2019 年 Google T5、Facebook RoBERTa
- 2020 年 GPT-3（1750 亿参数）
- 2022 年 ChatGPT 引爆通用对话应用
- 2023 年 Llama 2、Mistral 等开源大模型普及
- 2024-2025 年多模态大模型、Agent 框架成熟

### 3.2 Python 在 NLP 中的崛起

Python 之所以成为 NLP 主流语言，源于三个关键因素：

1. **科学计算生态**：NumPy、SciPy、Pandas 提供高效数值计算基础
2. **深度学习框架**：PyTorch、TensorFlow 在 Python 中拥有最完整的 API
3. **NLP 专用库**：NLTK、spaCy、Transformers 形成完整工具链

### 3.3 Guido van Rossum 与 Python 设计哲学

Python 由 Guido van Rossum 于 1989 年圣诞节假期开始设计，1991 年发布 0.9.0 版本。其设计哲学强调：

- 代码可读性优先
- 显式优于隐式
- 提供一种、且最好只有一种明显的解决方案

这些原则使 Python 在学术研究与工程实践中均具备良好可读性，特别适合作为 NLP 算法描述与实验载体。Guido 在 2018 年卸任 BDFL（终身仁慈独裁者）后，Python 转向由 5 人指导委员会治理。

### 3.4 PEP 流程与 NLP 相关 PEP

Python 增强提案（Python Enhancement Proposal，PEP）是 Python 演进的核心治理机制。与 NLP 相关的关键 PEP 包括：

- **PEP 3141**：数字抽象基类（数值类型层次，支撑张量计算类型）
- **PEP 484**：类型注解（为大规模 NLP 工程提供静态类型检查）
- **PEP 526**：变量注解语法
- **PEP 560**：泛型语法支持（torch.Tensor、np.ndarray 等泛型约束）
- **PEP 695**：类型参数语法（Python 3.12，简化泛型定义）

PEP 的生命周期包括草案、修订、最终决议等阶段，类似学术会议的同行评审，保证语言演进的严谨性。

## 4. 形式化定义与数学基础

### 4.1 自然语言处理的形式化

定义自然语言处理问题：给定自然语言文本 $x \in \Sigma^*$（$\Sigma$ 为字符表），目标是学习映射函数 $f: \Sigma^* \rightarrow Y$，其中 $Y$ 取决于具体任务：

- 文本分类：$Y = \{c_1, c_2, \ldots, c_K\}$
- 命名实体识别：$Y = (\Sigma^* \times \mathcal{E})^n$，$\mathcal{E}$ 为实体类型集合
- 机器翻译：$Y = \Sigma^*$
- 问答：$Y = \Sigma^*$

经验风险最小化目标为：

$$
\hat{f} = \arg\min_{f \in \mathcal{F}} \frac{1}{N} \sum_{i=1}^{N} \mathcal{L}(f(x_i), y_i) + \lambda \Omega(f)
$$

其中 $\mathcal{L}$ 为损失函数，$\Omega(f)$ 为正则项，$\lambda$ 为正则系数。

### 4.2 分词的形式化

分词（Tokenization）将文本切分为最小语义单元序列。形式化定义为：

$$
\text{Tokenize}: \Sigma^* \rightarrow \mathcal{T}^*
$$

其中 $\mathcal{T}$ 为词表（vocabulary）。中文分词需解决切分歧义问题：

- 交集歧义：`结婚的和尚未结婚的` → `结婚/的/和/尚未/结婚/的` 或 `结婚/的/和尚/未/结婚/的`
- 组合歧义：`门把手` → `门/把手` 或 `门把/手`

中文分词的常用模型为基于字的序列标注：

$$
P(t_1^n, c_1^n) = \prod_{i=1}^{n} P(t_i | t_{i-1}, c_{i-1}^{i+1})
$$

其中 $c_i$ 为字符，$t_i \in \{B, M, E, S\}$ 分别表示词首、词中、词尾、单字词。

### 4.3 词向量的数学定义

词向量（Word Embedding）将离散词映射为稠密实数向量：

$$
\phi: \mathcal{V} \rightarrow \mathbb{R}^d
$$

Word2Vec 的 Skip-gram 模型最大化：

$$
\frac{1}{T} \sum_{t=1}^{T} \sum_{-c \leq j \leq c, j \neq 0} \log p(w_{t+j} | w_t)
$$

其中 $c$ 为上下文窗口大小，条件概率用 softmax 定义：

$$
p(w_O | w_I) = \frac{\exp(\mathbf{v}_{w_O}^\top \mathbf{v}_{w_I})}{\sum_{w=1}^{W} \exp(\mathbf{v}_w^\top \mathbf{v}_{w_I})}
$$

由于分母计算量 $O(W)$ 过大，实际训练采用负采样或层次 softmax。

### 4.4 注意力机制的形式化

#### 4.4.1 缩放点积注意力

给定查询矩阵 $\mathbf{Q} \in \mathbb{R}^{n \times d_k}$、键矩阵 $\mathbf{K} \in \mathbb{R}^{m \times d_k}$、值矩阵 $\mathbf{V} \in \mathbb{R}^{m \times d_v}$，缩放点积注意力定义为：

$$
\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\left(\frac{\mathbf{Q}\mathbf{K}^\top}{\sqrt{d_k}}\right)\mathbf{V}
$$

除以 $\sqrt{d_k}$ 的理论依据：当 $d_k$ 较大时，点积 $\mathbf{q} \cdot \mathbf{k}$ 的方差为 $d_k$，导致 softmax 进入饱和区，梯度消失。缩放使方差稳定为 1。

#### 4.4.2 多头注意力

多头注意力（Multi-Head Attention）将注意力机制并行化：

$$
\text{MultiHead}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h)\mathbf{W}^O
$$

其中每个头：

$$
\text{head}_i = \text{Attention}(\mathbf{Q}\mathbf{W}_i^Q, \mathbf{K}\mathbf{W}_i^K, \mathbf{V}\mathbf{W}_i^V)
$$

参数矩阵 $\mathbf{W}_i^Q \in \mathbb{R}^{d_{\text{model}} \times d_k}$、$\mathbf{W}_i^K \in \mathbb{R}^{d_{\text{model}} \times d_k}$、$\mathbf{W}_i^V \in \mathbb{R}^{d_{\text{model}} \times d_v}$、$\mathbf{W}^O \in \mathbb{R}^{hd_v \times d_{\text{model}}}$。

### 4.5 Transformer 层的完整定义

Transformer 编码器层（Encoder Layer）由多头注意力 + 前馈网络 + 残差连接 + 层归一化组成：

$$
\begin{aligned}
\mathbf{Z} &= \text{LayerNorm}(\mathbf{X} + \text{MultiHead}(\mathbf{X}, \mathbf{X}, \mathbf{X})) \\
\mathbf{Y} &= \text{LayerNorm}(\mathbf{Z} + \text{FFN}(\mathbf{Z}))
\end{aligned}
$$

其中前馈网络：

$$
\text{FFN}(\mathbf{x}) = \max(0, \mathbf{x}\mathbf{W}_1 + \mathbf{b}_1)\mathbf{W}_2 + \mathbf{b}_2
$$

### 4.6 softmax 的数值稳定性

softmax 函数定义为：

$$
\text{softmax}(\mathbf{z})_i = \frac{e^{z_i}}{\sum_{j=1}^{K} e^{z_j}}
$$

当 $z_i$ 较大时，$e^{z_i}$ 溢出。工程实现采用最大值减法：

$$
\text{softmax}(\mathbf{z})_i = \frac{e^{z_i - \max(\mathbf{z})}}{\sum_{j=1}^{K} e^{z_j - \max(\mathbf{z})}}
$$

数学等价，但数值稳定。

## 5. 理论推导与算法原理

### 5.1 隐马尔可夫模型与词性标注

HMM 假设观测序列 $O_{1:T}$ 与隐状态序列 $S_{1:T}$ 满足两个独立假设：

1. **马尔可夫性**：$P(S_t | S_{1:t-1}) = P(S_t | S_{t-1})$
2. **观测独立性**：$P(O_t | S_{1:T}, O_{1:T}) = P(O_t | S_t)$

词性标注任务中，观测为词，隐状态为词性。Viterbi 算法求解最大后验序列：

$$
S_{1:T}^* = \arg\max_{S_{1:T}} P(S_{1:T}, O_{1:T})
$$

动态规划递推：

$$
\delta_t(s) = \max_{s'} \delta_{t-1}(s') \cdot P(s|s') \cdot P(O_t|s)
$$

时间复杂度 $O(T \cdot |\mathcal{S}|^2)$，空间复杂度 $O(T \cdot |\mathcal{S}|)$。

### 5.2 条件随机场与序列标注

CRF 直接建模后验概率：

$$
P(S_{1:T} | O_{1:T}) \propto \exp\left(\sum_t \phi(S_{t-1}, S_t, O) + \sum_t \psi(S_t, O)\right)
$$

CRF 克服了 HMM 的标签偏置问题，但推理仍需使用前向-后向算法。

### 5.3 BERT 的预训练目标

BERT 采用掩码语言模型（MLM）：

$$
\mathcal{L}_{\text{MLM}} = -\sum_{i \in \mathcal{M}} \log P(x_i | x_{\setminus \mathcal{M}})
$$

其中 $\mathcal{M}$ 为被掩码的位置集合，$x_{\setminus \mathcal{M}}$ 为未被掩码的上下文。同时使用下一句预测（NSP）目标。

### 5.4 GPT 的自回归语言模型

GPT 采用自回归建模：

$$
P(x_{1:T}) = \prod_{t=1}^{T} P(x_t | x_{<t})
$$

训练目标为负对数似然：

$$
\mathcal{L}_{\text{LM}} = -\frac{1}{T} \sum_{t=1}^{T} \log P(x_t | x_{<t}; \theta)
$$

### 5.5 BPE 分词算法

Byte-Pair Encoding（BPE）通过迭代合并最频繁字符对构建词表：

1. 初始化词表为所有单字符
2. 统计所有相邻字符对频率
3. 合并频率最高的字符对，加入词表
4. 重复 2-3 直至达到目标词表大小

BPE 解决未登录词（OOV）问题，被 GPT、BERT、Llama 等模型广泛采用。

## 6. 核心库与生产级代码示例

### 6.1 NLTK：教学与研究的基石

NLTK（Natural Language Toolkit）由 Steven Bird 与 Edward Loper 于 2001 年发起，是 Python 最早的 NLP 库，主要面向教学与研究。

```python
import nltk
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag
from nltk.chunk import ne_chunk
from nltk.corpus import stopwords

# 首次使用需下载资源（仅执行一次）
# nltk.download('punkt')
# nltk.download('averaged_perceptron_tagger')
# nltk.download('maxent_ne_chunker')
# nltk.download('words')
# nltk.download('stopwords')

text = "Apple Inc. was founded by Steve Jobs in Cupertino in 1976."

# 分词：将句子拆分为词单元
tokens = word_tokenize(text)
print("分词结果：", tokens)

# 词性标注：为每个词分配词性标签
tagged = pos_tag(tokens)
print("词性标注：", tagged)

# 命名实体识别：识别文本中的人名、地名、机构名
entities = ne_chunk(tagged)
print("命名实体：", entities)

# 停用词过滤：去除高频但低信息量的词（如 the、a、is）
stop_words = set(stopwords.words('english'))
filtered = [w for w in tokens if w.lower() not in stop_words]
print("去停用词后：", filtered)
```

NLTK 的特点：

- 提供丰富的语料库（Gutenberg、Brown、Reuters）
- 算法实现多样（HMM、CRF、最大熵等）
- API 设计教学友好，但性能未做工程优化
- 适合学习经典算法与原型验证

### 6.2 spaCy：工业级 NLP 流水线

spaCy 由 Matthew Honnibal 于 2014 年创建，定位于工业级 NLP 库。其核心设计理念：

- **流水线架构**：将分词、词性、解析、实体识别组合为可配置流水线
- **Cython 优化**：关键路径使用 Cython 编译，性能数倍于纯 Python 实现
- **预训练模型**：提供多语言预训练模型，开箱即用
- **生产部署**：支持模型序列化、批处理、HTTP 服务

```python
import spacy
from spacy import displacy
from spacy.tokens import Doc, Span
from spacy.language import Language

# 加载中文预训练模型（首次需安装：python -m spacy download zh_core_web_sm）
nlp = spacy.load("zh_core_web_sm")

# 处理文本：分词、词性标注、依存分析、实体识别一步完成
text = "北京是中华人民共和国的首都，拥有故宫、长城等世界文化遗产。"
doc = nlp(text)

# 分词与词性标注
print("分词与词性：")
for token in doc:
    print(f"  {token.text:10s} | 词性: {token.pos_:6s} | 词法: {token.morph} | 依存: {token.dep_}")

# 命名实体识别
print("\n命名实体：")
for ent in doc.ents:
    print(f"  {ent.text:15s} | 类型: {ent.label_:10s} | 起止: {ent.start_char}-{ent.end_char}")

# 名词短语提取
print("\n名词短语：")
for chunk in doc.noun_chunks:
    print(f"  {chunk.text}")

# 句子切分
print("\n句子：")
for sent in doc.sents:
    print(f"  {sent.text}")

# 词向量相似度（需加载中等以上模型如 zh_core_web_md）
# nlp_md = spacy.load("zh_core_web_md")
# doc1, doc2 = nlp_md("猫"), nlp_md("狗")
# print(f"猫与狗的相似度: {doc1.similarity(doc2):.4f}")
```

#### 6.2.1 自定义流水线组件

```python
import spacy
from spacy.language import Language

# 注册自定义组件
@Language.component("custom_text_classifier")
def custom_text_classifier(doc):
    """基于关键词的简单文本分类组件示例"""
    keywords = {
        "金融": ["股票", "基金", "债券", "利率"],
        "医疗": ["医院", "医生", "药品", "诊断"],
        "教育": ["学校", "教师", "课程", "学生"],
    }
    doc._.category = None
    doc._.score = 0.0
    text = doc.text
    best_cat, best_score = None, 0
    for cat, words in keywords.items():
        score = sum(text.count(w) for w in words)
        if score > best_score:
            best_cat, best_score = cat, score
    if best_cat:
        doc._.category = best_cat
        doc._.score = best_score
    return doc

# 扩展 Doc 属性
from spacy.tokens import Doc
Doc.set_extension("category", default=None, force=True)
Doc.set_extension("score", default=0.0, force=True)

# 构建包含自定义组件的流水线
nlp = spacy.load("zh_core_web_sm")
nlp.add_pipe("custom_text_classifier", last=True)

doc = nlp("股票市场今日大涨，利率维持低位。")
print(f"分类: {doc._.category}, 置信度: {doc._.score}")
```

#### 6.2.2 模型序列化与部署

```python
import spacy

# 训练或加载模型后，将整个流水线保存为单目录
nlp = spacy.load("zh_core_web_sm")
nlp.to_disk("./models/zh_pipeline")

# 部署时从目录加载，零依赖运行
nlp_loaded = spacy.load("./models/zh_pipeline")

# 批处理推理提升吞吐量
texts = ["这是第一段文本。", "这是第二段文本。", "这是第三段文本。"]
docs = list(nlp_loaded.pipe(texts, batch_size=32, n_process=2))
for doc in docs:
    print([ent.text for ent in doc.ents])
```

### 6.3 Hugging Face Transformers：大模型生态

Transformers 库由 Hugging Face 公司维护，是大模型时代的核心工具。它提供：

- 统一的 API 接口访问 100+ 预训练模型
- 模型微调、量化、推理优化工具链
- 与 PyTorch、TensorFlow、JAX 深度集成
- Hub 社区生态，支持模型与数据集分享

```python
from transformers import (
    pipeline,
    AutoTokenizer,
    AutoModelForSequenceClassification,
    AutoModelForCausalLM,
    AutoModelForQuestionAnswering,
)
import torch

# === 1. 使用 pipeline 快速完成常见任务 ===

# 文本分类（情感分析）
classifier = pipeline(
    "sentiment-analysis",
    model="uer/roberta-base-finetuned-jd-binary-chinese",
)
result = classifier("这个产品真的非常好用，强烈推荐！")
print("情感分析:", result)

# 命名实体识别
ner = pipeline("ner", grouped_entities=True)
ners = ner("张三在清华大学攻读计算机科学。")
print("命名实体:", ners)

# 问答
qa = pipeline("question-answering", model="uer/roberta-base-chinese-extractive-qa")
answer = qa(
    question="北京是中国的首都吗？",
    context="北京是中华人民共和国的首都，位于华北平原北部。",
)
print("问答:", answer)

# 文本生成
generator = pipeline("text-generation", model="gpt2")
text = generator("人工智能的未来", max_length=50, num_return_sequences=1)
print("生成:", text[0]["generated_text"])
```

#### 6.3.1 模型加载与推理细节

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# 模型名（中英文均支持，详见 https://huggingface.co/models）
model_name = "bert-base-chinese"

# 加载分词器与模型
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=2,
    id2label={0: "负面", 1: "正面"},
    label2id={"负面": 0, "正面": 1},
)

# 文本预处理：分词、转 ID、构造注意力掩码
text = "这个产品真的非常好用！"
inputs = tokenizer(
    text,
    padding=True,
    truncation=True,
    max_length=128,
    return_tensors="pt",  # 返回 PyTorch 张量
)
print(f"输入 IDs: {inputs['input_ids']}")
print(f"注意力掩码: {inputs['attention_mask']}")

# 推理
model.eval()
with torch.no_grad():
    outputs = model(**inputs)
    logits = outputs.logits
    probs = torch.softmax(logits, dim=-1)
    pred = torch.argmax(probs, dim=-1).item()

print(f"预测标签: {model.config.id2label[pred]}")
print(f"概率分布: {probs.tolist()}")
```

#### 6.3.2 微调（Fine-tuning）

```python
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
)
from datasets import Dataset
import numpy as np
from sklearn.metrics import accuracy_score, f1_score

# 示例数据集（实际应用应从 CSV/JSON 加载）
data = {
    "text": [
        "产品很好用",
        "服务态度很差",
        "物美价廉",
        "质量太差了",
        "推荐购买",
        "再也不来了",
    ],
    "label": [1, 0, 1, 0, 1, 0],
}
dataset = Dataset.from_dict(data)

# 加载分词器与模型
model_name = "bert-base-chinese"
tokenizer = AutoTokenizer.from_pretrained(model_name)

def preprocess(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=32,
    )

tokenized = dataset.map(preprocess, batched=True)

model = AutoModelForSequenceClassification.from_pretrained(
    model_name, num_labels=2
)

# 评估指标
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels, preds),
        "f1": f1_score(labels, preds, average="binary"),
    }

# 训练配置
training_args = TrainingArguments(
    output_dir="./outputs/sentiment-bert",
    num_train_epochs=3,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=16,
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    weight_decay=0.01,
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    report_to="none",  # 关闭 WandB
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized,
    eval_dataset=tokenized,
    compute_metrics=compute_metrics,
)

trainer.train()
trainer.save_model("./outputs/sentiment-bert-final")
```

### 6.4 jieba：中文分词利器

```python
import jieba
import jieba.posseg as pseg

text = "小明毕业于北京大学计算机科学与技术系"

# 精确模式（默认）：最准确的分词，适合文本分析
seg_list = jieba.cut(text, cut_all=False)
print("精确模式: " + "/".join(seg_list))

# 全模式：把所有可能的词都扫出来，速度最快但有歧义
seg_all = jieba.cut(text, cut_all=True)
print("全模式: " + "/".join(seg_all))

# 搜索引擎模式：在精确模式基础上再切分长词，提高召回率
seg_search = jieba.cut_for_search(text)
print("搜索引擎模式: " + "/".join(seg_search))

# 词性标注
words = pseg.cut(text)
for word, flag in words:
    print(f"{word} ({flag})", end=" | ")
print()

# 自定义词典：加载领域术语
# 词典文件格式：词语 词频 词性
# 北京大学 100000 ns
jieba.load_userdict("./data/user_dict.txt")

# 增量调整：动态添加词
jieba.add_word("北京大学计算机科学与技术系")
text2 = "小明毕业于北京大学计算机科学与技术系"
print("调整后: " + "/".join(jieba.cut(text2)))
```

### 6.5 fastNLP 与 PaddleNLP（中文生态补充）

中文 NLP 生态除上述库外，还有：

- **fastNLP**（复旦）：面向研究的模块化框架
- **PaddleNLP**（百度）：飞桨生态，提供ERNIE、UIE等中文模型
- **HanLP**（携程）：基于深度学习的中文处理工具包

```python
# PaddleNLP 示例
# from paddlenlp import Taskflow
# schema = ['时间', '选手', '赛事名称']
# ie = Taskflow('information_extraction', schema=schema)
# result = ie("2022年卡塔尔世界杯决赛于12月18日举行，阿根廷夺冠")
# print(result)
```

## 7. 对比分析

### 7.1 Python NLP 库横向对比

| 维度 | NLTK | spaCy | Transformers | jieba |
|------|------|-------|--------------|-------|
| 设计目标 | 教学研究 | 工业生产 | 大模型生态 | 中文分词 |
| 首次发布 | 2001 | 2014 | 2018 | 2012 |
| 实现语言 | Python | Cython+Python | Python | Python+C |
| 性能（中/英文） | 慢 | 快 | 中等 | 快 |
| 多语言支持 | 部分 | 60+ 语言 | 100+ 语言 | 中文专用 |
| 预训练模型 | 无 | 内置多档 | 海量 | 无 |
| 深度学习 | 无 | 内置 | 核心功能 | 无 |
| 部署友好 | 弱 | 强 | 强 | 强 |
| 学习曲线 | 平缓 | 中等 | 陡峭 | 平缓 |
| 社区活跃度 | 中 | 高 | 极高 | 中 |
| 适用场景 | 教学、原型 | 生产管线 | 微调、大模型 | 中文预处理 |

### 7.2 Python 与其他语言 NLP 生态对比

#### 7.2.1 Python vs Ruby

Ruby 的 NLP 生态以 treat、engtagger 为代表，但远不及 Python。Ruby 的优势在 DSL 友好，缺点是数值计算库薄弱、缺乏主流深度学习框架绑定。

#### 7.2.2 Python vs JavaScript/TypeScript

JavaScript 在浏览器端 NLP 有天然优势（如 compromise、natural 库），适合轻量级前端处理。但：

- 缺乏主流深度学习框架（TensorFlow.js 性能与生态远不及 PyTorch）
- 训练阶段仍依赖 Python
- Node.js 在大规模张量计算上性能劣于 Python+NumPy

#### 7.2.3 Python vs Go

Go 在并发与部署上有优势，适合构建 NLP 服务的网关层。但：

- 几乎无原生 NLP 库
- 深度学习生态薄弱
- 训练与推理仍依赖 Python 调用 ONNX Runtime / libtorch

#### 7.2.4 Python vs Julia

Julia 设计目标为科学计算，理论性能优于 Python（JIT 编译）。但：

- 生态规模小（Flux.jl vs PyTorch）
- 主流模型预训练权重稀缺
- 工业部署工具链不成熟

#### 7.2.5 Python vs Java

Java 生态有 Stanford CoreNLP、OpenNLP、DKPro，企业级稳定。但：

- 代码冗长
- 与 PyTorch/TensorFlow 集成差
- 现代大模型几乎都首选 Python

### 7.3 预训练模型选择策略

| 模型类型 | 代表 | 适用场景 | 优势 | 局限 |
|---------|------|---------|------|------|
| 编码器型 | BERT、RoBERTa | 文本分类、NER、问答 | 双向上下文，特征强 | 不擅长生成 |
| 解码器型 | GPT 系列 | 文本生成、对话 | 自回归生成流畅 | 单向上下文 |
| 编码-解码型 | T5、BART | 翻译、摘要 | 通用框架 | 推理慢 |
| 通用大模型 | GPT-4、Claude | 复杂推理、Agent | 涌现能力、零样本 | API 成本高 |
| 开源大模型 | Llama 3、Qwen | 私有部署、定制 | 可控、可微调 | 需算力投入 |

## 8. 常见陷阱与修复

### 8.1 陷阱1：未设置随机种子导致结果不可复现

```python
# 错误：训练结果不可复现
from transformers import set_seed
import torch
import numpy as np
import random

# 正确：显式设置所有随机源
def set_all_seeds(seed: int = 42):
    """统一设置 Python、NumPy、PyTorch 随机种子，保证实验可复现"""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    set_seed(seed)
    # 牺牲性能换取确定性
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

set_all_seeds(42)
```

### 8.2 陷阱2：tokenizer 与模型不匹配

```python
# 错误：使用 BERT 的 tokenizer 但加载 RoBERTa 模型
from transformers import AutoTokenizer, AutoModel

# tokenizer = AutoTokenizer.from_pretrained("bert-base-chinese")
# model = AutoModel.from_pretrained("hfl/roberta-wwm-ext-chinese")
# 上述组合会导致词表错配，输出错误

# 正确：tokenizer 与模型必须使用同一 checkpoint
checkpoint = "hfl/roberta-wwm-ext-ext-chinese"
tokenizer = AutoTokenizer.from_pretrained(checkpoint)
model = AutoModel.from_pretrained(checkpoint)
```

### 8.3 陷阱3：中文文本未正确预处理

```python
# 错误：直接将带 HTML 标签的文本送入模型
import re

def clean_text(text: str) -> str:
    """中文文本清洗：去除 HTML、规范化空白、统一全半角"""
    # 去除 HTML 标签
    text = re.sub(r"<[^>]+>", "", text)
    # 统一全角空格为半角
    text = text.replace("\u3000", " ")
    # 去除多余空白
    text = re.sub(r"\s+", " ", text).strip()
    # 全角标点转半角（如需要）
    full_half = str.maketrans(
        "，。！？；：""''（）【】",
        ",.!?;:\"\"''()[]",
    )
    text = text.translate(full_half)
    return text

raw = "<p>这 是一段   测试文本。</p>"
print(clean_text(raw))  # 这 是一段 测试文本.
```

### 8.4 陷阱4：忽略最大序列长度

```python
# 错误：超过模型最大长度的文本被静默截断
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("bert-base-chinese")
# BERT 最大长度 512，超长文本会被截断丢失信息

long_text = "测试" * 1000  # 2000 字
inputs = tokenizer(long_text, truncation=True, max_length=512)
print(f"截断后长度: {len(inputs['input_ids'])}")  # 512

# 修复策略1：滑窗分块处理长文本
def chunk_text(text: str, tokenizer, max_length: int = 512, stride: int = 128):
    """长文本滑窗分块：保留 stride 字符的上下文重叠"""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_length, len(text))
        chunk = text[start:end]
        chunks.append(chunk)
        if end == len(text):
            break
        start = end - stride
    return chunks

chunks = chunk_text(long_text, tokenizer, max_length=400, stride=50)
print(f"分块数量: {len(chunks)}")
```

### 8.5 陷阱5：未使用 no_grad 与 eval 模式

```python
# 错误：推理时未关闭梯度计算，显存浪费且速度慢
import torch
from transformers import AutoModelForSequenceClassification

model = AutoModelForSequenceClassification.from_pretrained(
    "bert-base-chinese", num_labels=2
)

# 正确：推理前调用 eval 并使用 no_grad
model.eval()
with torch.no_grad():
    outputs = model(input_ids=inputs["input_ids"], attention_mask=inputs["attention_mask"])

# 批处理推理时进一步优化
model.eval()
with torch.no_grad(), torch.amp.autocast("cuda"):  # 混合精度
    outputs = model(**batch_inputs)
```

### 8.6 陷阱6：忽略标签不平衡

```python
# 错误：直接用准确率评估不平衡数据集
from sklearn.metrics import classification_report
# 假设 99% 为负样本，预测全部为负可达 99% 准确率但毫无意义

# 正确：使用 F1、PR-AUC、混淆矩阵
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)

# 应报告每个类别的 precision、recall、f1
# y_true, y_pred 为真实与预测标签
# print(classification_report(y_true, y_pred))

# 训练时使用加权损失或重采样
import torch.nn as nn
# 假设类别 0 有 1000 样本，类别 1 有 100 样本
weights = torch.tensor([1.0, 10.0])  # 反比例加权
loss_fn = nn.CrossEntropyLoss(weight=weights)
```

### 8.7 陷阱7：spaCy 模型未安装即调用

```python
import spacy

# 错误：模型未安装导致 OSError
# nlp = spacy.load("zh_core_web_sm")  # 未安装时报错

# 正确：使用 blank 流水线或显式安装
try:
    nlp = spacy.load("zh_core_web_sm")
except OSError:
    print("模型未安装，正在使用空流水线")
    nlp = spacy.blank("zh")
    # 此时只有分词功能，无词性、实体识别

# 工程化方案：在 requirements.txt 中固定模型版本
# spacy==3.7.2
# zh-core-web-sm @ https://github.com/explosion/spacy-models/releases/download/zh_core_web_sm-3.7.0/zh_core_web_sm-3.7.0-py3-none-any.whl
```

### 8.8 陷阱8：未关闭 tokenizer 警告

```python
# 错误：每次推理都重新加载 tokenizer，触发警告且性能差
# from transformers import AutoTokenizer
# def predict(text):
#     tokenizer = AutoTokenizer.from_pretrained("bert-base-chinese")  # 重复加载
#     ...

# 正确：模块级加载一次，全局复用
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

class Predictor:
    """模型推理器：单例模式，避免重复加载"""
    _instance = None
    _model = None
    _tokenizer = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "bert-base-chinese"):
        if self._model is None:
            self._tokenizer = AutoTokenizer.from_pretrained(model_name)
            self._model = AutoModelForSequenceClassification.from_pretrained(
                model_name, num_labels=2
            )
            self._model.eval()

    def predict(self, text: str) -> int:
        inputs = self._tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512
        )
        with torch.no_grad():
            logits = self._model(**inputs).logits
        return torch.argmax(logits, dim=-1).item()
```

## 9. 工程实践

### 9.1 虚拟环境与依赖管理

```bash
# 推荐使用 uv（Astral，2024 起流行，比 pip 快 10-100 倍）
pip install uv
uv venv .venv --python 3.11
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/macOS
uv pip install spacy transformers torch

# 或使用 conda（适合深度学习，便于 CUDA 版本管理）
conda create -n nlp python=3.11
conda activate nlp
conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia
pip install spacy transformers
```

### 9.2 pyproject.toml 配置示例

```toml
[project]
name = "nlp-service"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "spacy>=3.7,<3.8",
    "transformers>=4.40,<5.0",
    "torch>=2.2,<3.0",
    "fastapi>=0.110",
    "uvicorn[standard]>=0.29",
    "pydantic>=2.6",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "ruff>=0.4", "mypy>=1.9"]
gpu = ["torch[cuda]"]
```

### 9.3 模型推理服务化

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
from typing import List
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import uvicorn

# 请求与响应模型
class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    threshold: float = Field(0.5, ge=0, le=1)

class PredictResponse(BaseModel):
    label: str
    confidence: float

class BatchRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=64)

class BatchResponse(BaseModel):
    results: List[PredictResponse]

# 全局模型句柄
model_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时加载模型，关闭时释放"""
    model_name = "bert-base-chinese"
    model_state["tokenizer"] = AutoTokenizer.from_pretrained(model_name)
    model_state["model"] = AutoModelForSequenceClassification.from_pretrained(
        "./outputs/sentiment-bert-final"
    )
    model_state["model"].eval()
    if torch.cuda.is_available():
        model_state["model"] = model_state["model"].cuda()
    yield
    model_state.clear()

app = FastAPI(title="NLP Service", lifespan=lifespan)

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    """单条文本情感分析"""
    tokenizer = model_state["tokenizer"]
    model = model_state["model"]
    inputs = tokenizer(
        req.text, return_tensors="pt", truncation=True, max_length=512
    )
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)
    pred = torch.argmax(probs, dim=-1).item()
    conf = probs[0][pred].item()
    return PredictResponse(
        label=model.config.id2label[pred],
        confidence=conf,
    )

@app.post("/batch", response_model=BatchResponse)
async def batch_predict(req: BatchRequest):
    """批处理推理：吞吐量比单条高 5-10 倍"""
    tokenizer = model_state["tokenizer"]
    model = model_state["model"]
    inputs = tokenizer(
        req.texts,
        padding=True,
        truncation=True,
        max_length=512,
        return_tensors="pt",
    )
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)
    preds = torch.argmax(probs, dim=-1).tolist()
    confs = probs.max(dim=-1).values.tolist()
    return BatchResponse(
        results=[
            PredictResponse(label=model.config.id2label[p], confidence=c)
            for p, c in zip(preds, confs)
        ]
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 9.4 性能调优

```python
# 1. 混合精度推理（FP16）
from transformers import AutoModelForSequenceClassification
import torch

model = AutoModelForSequenceClassification.from_pretrained(
    "bert-base-chinese",
    torch_dtype=torch.float16,  # 半精度加载
    num_labels=2,
)
model.eval().cuda()
# 推理时使用 autocast
with torch.no_grad(), torch.amp.autocast("cuda"):
    outputs = model(**inputs)

# 2. ONNX Runtime 加速（生产部署推荐）
# from optimum.onnxruntime import ORTModelForSequenceClassification
# ort_model = ORTModelForSequenceClassification.from_pretrained(
#     "bert-base-chinese",
#     export=True,
#     provider="CUDAExecutionProvider",
# )

# 3. 模型量化（INT8）
from torch.quantization import quantize_dynamic
quantized = quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)
# 显存减少 4 倍，CPU 推理速度提升 2-3 倍

# 4. KV Cache 优化（生成任务）
# GPT 类模型推理时启用 use_cache=True
# outputs = model.generate(input_ids, max_length=50, use_cache=True)
```

### 9.5 数据预处理流水线

```python
from datasets import Dataset
from transformers import AutoTokenizer
import re

class TextPreprocessor:
    """文本预处理流水线：清洗、规范化、分词"""

    def __init__(self, tokenizer_name: str = "bert-base-chinese", max_length: int = 512):
        self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
        self.max_length = max_length

    def clean(self, text: str) -> str:
        """清洗：去 HTML、去 URL、规范化空白"""
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"https?://\S+", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def tokenize(self, text: str) -> dict:
        """分词：返回 input_ids、attention_mask"""
        return self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
            return_tensors="pt",
        )

    def process(self, examples: dict) -> dict:
        """批处理入口（datasets.map 兼容）"""
        cleaned = [self.clean(t) for t in examples["text"]]
        tokenized = self.tokenizer(
            cleaned,
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
        )
        return tokenized


# 使用示例
preprocessor = TextPreprocessor("bert-base-chinese", max_length=128)
sample = {"text": ["<p>测试文本1</p>", "<a href='x'>测试2</a>"]}
result = preprocessor.process(sample)
print(f"处理后样本数: {len(result['input_ids'])}")
```

### 9.6 模型评估与监控

```python
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    precision_recall_curve,
)
import numpy as np

def evaluate_model(y_true, y_pred, y_proba):
    """完整评估：分类报告、ROC-AUC、PR 曲线"""
    print("=== 分类报告 ===")
    print(classification_report(y_true, y_pred, digits=4))

    print("\n=== 混淆矩阵 ===")
    print(confusion_matrix(y_true, y_pred))

    print("\n=== ROC-AUC ===")
    auc = roc_auc_score(y_true, y_proba)
    print(f"ROC-AUC: {auc:.4f}")

    # PR 曲线在数据不平衡时更有参考价值
    precision, recall, thresholds = precision_recall_curve(y_true, y_proba)
    f1_scores = 2 * precision * recall / (precision + recall + 1e-10)
    best_idx = np.argmax(f1_scores)
    print(f"\n最佳 F1 阈值: {thresholds[best_idx]:.4f}")
    print(f"对应 Precision: {precision[best_idx]:.4f}")
    print(f"对应 Recall: {recall[best_idx]:.4f}")

# 实际调用
# y_true = [真实标签列表]
# y_pred = [预测标签列表]
# y_proba = [预测为正类的概率列表]
# evaluate_model(y_true, y_pred, y_proba)
```

## 10. 案例研究

### 10.1 案例1：Dropbox 的文档理解

Dropbox 利用 NLP 实现文件内容搜索、智能推荐与文档分类。技术栈：

- spaCy 用于文档预处理与实体识别
- 自训练 BERT 完成文档分类
- FAISS 向量检索实现语义搜索
- 服务于 7 亿用户，QPS 数万

工程教训：

- 预训练模型微调比从零训练效果好且成本低
- 多语言支持需考虑分词器差异（中文用 jieba 预处理）
- 在线推理延迟通过模型蒸馏从 200ms 降至 50ms

### 10.2 案例2：Instagram 的内容审核

Instagram（Meta）使用 NLP 自动审核违规内容。技术栈：

- 多语言 BERT（XLM-R）支持 100+ 语言
- 多任务学习同时预测仇恨、骚扰、自我伤害
- 在线推理使用 ONNX Runtime，CPU 部署
- 月处理数十亿条文本

工程教训：

- 多任务共享编码器大幅降低推理成本
- 标签噪声通过众包 + 主动学习缓解
- 模型版本灰度发布，配合人工审核反馈

### 10.3 案例3：YouTube 字幕生成

YouTube 使用 NLP 自动生成视频字幕。技术栈：

- 语音识别（ASR）输出原始文本
- BERT 后处理修正识别错误
- 标点恢复与句子切分
- 多语言翻译基于 Transformer

工程教训：

- 流式处理比批处理更符合实时性需求
- 多模型协作优于单一端到端模型
- 用户反馈数据是模型迭代的关键

### 10.4 案例4：阿里巴巴电商搜索

阿里巴巴电商搜索系统使用 NLP 处理用户查询：

- BERT 改写用户查询提高召回率
- 实体识别抽取商品属性
- 意图分类区分搜索/导航/交易
- 排序阶段使用 Transformer 编码 query-doc 特征

工程教训：

- 离线评估指标（如 MRR）需与在线 A/B 测试结合
- 模型蒸馏将 BERT-base 压缩为 6 层，延迟从 80ms 降至 15ms
- 数据飞轮：模型上线后产生的点击数据反哺训练

### 10.5 案例5：GitHub Copilot 代码补全

GitHub Copilot 基于 OpenAI Codex 实现 Python 代码补全：

- 使用 GPT 架构，训练于 GitHub 公开代码
- 上下文窗口 4K-16K tokens
- 推理延迟通过流式生成掩盖
- 编辑器侧缓存显著降低 API 调用

工程教训：

- 代码补全需考虑语法正确性，不能仅依赖概率
- 上下文裁剪策略（保留最近文件 + 同目录文件）对效果影响大
- 隐私与版权问题需通过数据过滤与许可证检测缓解

## 11. 习题

### 11.1 填空题

**习题 11.1**（记忆层）：在 BERT 的掩码语言模型中，被选中掩码的位置会被替换为特殊标记 ____，其原始词用于计算交叉熵损失。

<details>
<summary>查看答案</summary>
[MASK]
</details>

**习题 11.2**（理解层）：spaCy 处理文本时，`doc.ents` 返回的实体类型由 ____ 字段决定，该字段在加载模型时通过配置文件指定。

<details>
<summary>查看答案</summary>
label（或 label_）
</details>

**习题 11.3**（应用层）：使用 Transformers 库调用 `pipeline("ner")` 时，需通过参数 ____ 控制是否合并同实体的多个子词 token。

<details>
<summary>查看答案</summary>
grouped_entities=True（新版为 aggregation_strategy="simple"）
</details>

### 11.2 选择题

**习题 11.4**（理解层）：关于 BPE（Byte-Pair Encoding）分词算法，下列说法错误的是？

- A. BPE 通过迭代合并最频繁字符对构建词表
- B. BPE 能处理未登录词，避免 OOV 问题
- C. BPE 词表越大，模型推理速度越快
- D. GPT-2、Llama 等模型均采用 BPE 或其变体

<details>
<summary>查看答案与解析</summary>
答案：C。BPE 词表大小影响编码长度（更大的词表通常产生更短的序列），但推理速度主要由模型参数量与序列长度决定，而非词表大小。更大的词表会增加 embedding 层参数量。
</details>

**习题 11.5**（分析层）：以下 Python 代码在 Hugging Face Transformers 中调用 `AutoModel.from_pretrained` 时，最可能触发警告或错误的是？

- A. `AutoModel.from_pretrained("bert-base-chinese")`
- B. `AutoModel.from_pretrained("hfl/roberta-wwm-ext-chinese")`
- C. `AutoModel.from_pretrained("gpt2")` 加载后用于序列分类
- D. `AutoModel.from_pretrained("./local-model")` 但目录中无 config.json

<details>
<summary>查看答案与解析</summary>
答案：D。`AutoModel` 是通用基类，调用分类任务需用 `AutoModelForSequenceClassification`；C 会有警告但能加载；D 缺少 config.json 会直接报错，无法加载。
</details>

### 11.3 代码修正题

**习题 11.6**（应用层）：以下代码试图使用 spaCy 比较两段中文文本的语义相似度，但运行结果不合理。请找出问题并修正。

```python
import spacy

nlp = spacy.load("zh_core_web_sm")
doc1 = nlp("猫")
doc2 = nlp("狗")
similarity = doc1.similarity(doc2)
print(f"相似度: {similarity}")
```

<details>
<summary>查看答案与解析</summary>

问题：`zh_core_web_sm` 是小型模型，不含词向量，`similarity` 方法退化为基于上下文张量的相似度计算，结果不可靠。

修正：加载含词向量的中等或大型模型：

```python
import spacy
nlp = spacy.load("zh_core_web_md")  # 或 lg
doc1 = nlp("猫")
doc2 = nlp("狗")
print(f"相似度: {doc1.similarity(doc2)}")  # 应在 0.5-0.7 之间
```
</details>

**习题 11.7**（分析层）：以下代码使用 PyTorch 训练 BERT 分类模型，存在三个性能或正确性问题，请定位并修正。

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

tokenizer = AutoTokenizer.from_pretrained("bert-base-chinese")
model = AutoModelForSequenceClassification.from_pretrained("bert-base-chinese", num_labels=2)

texts = ["文本1", "文本2", "文本3"]
labels = [1, 0, 1]

inputs = tokenizer(texts, padding=True, return_tensors="pt")
outputs = model(**inputs, labels=torch.tensor(labels))
loss = outputs.loss
loss.backward()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
optimizer.step()
optimizer.zero_grad()
```

<details>
<summary>查看答案与解析</summary>

问题1：`optimizer` 应在 `backward()` 之前创建（虽然在循环中创建也能用，但效率低）。
问题2：`optimizer.step()` 应在 `loss.backward()` 之后调用（顺序正确但 optimizer 应提前定义）。
问题3：学习率 1e-3 对 BERT 微调过大，应使用 1e-5 ~ 5e-5。
问题4：未设置 `model.train()` 模式。
问题5：未使用梯度裁剪，可能导致梯度爆炸。

修正：

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

tokenizer = AutoTokenizer.from_pretrained("bert-base-chinese")
model = AutoModelForSequenceClassification.from_pretrained("bert-base-chinese", num_labels=2)
model.train()

# optimizer 提前创建，学习率设为微调常用值
optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)
scheduler = torch.optim.lr_scheduler.LinearLR(optimizer, total_iters=3)

texts = ["文本1", "文本2", "文本3"]
labels = [1, 0, 1]

inputs = tokenizer(texts, padding=True, truncation=True, return_tensors="pt")
outputs = model(**inputs, labels=torch.tensor(labels))
loss = outputs.loss

loss.backward()
# 梯度裁剪防止爆炸
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
optimizer.step()
scheduler.step()
optimizer.zero_grad()
```
</details>

### 11.4 开放性问题

**习题 11.8**（评价层）：某团队需要为电商平台构建商品评论情感分析系统，候选方案有：

- 方案A：调用 OpenAI GPT-4 API
- 方案B：微调 RoBERTa-wwm-ext-base
- 方案C：使用 spaCy + 关键词规则

请从延迟、成本、可定制性、数据隐私四个维度对比三种方案，并给出推荐。

<details>
<summary>查看参考要点</summary>

| 维度 | 方案A (GPT-4 API) | 方案B (RoBERTa微调) | 方案C (spaCy+规则) |
|------|------------------|--------------------|-------------------|
| 延迟 | 500-2000ms | 20-80ms (CPU) | 5-20ms |
| 成本 | 每条 $0.001-0.01 | 一次性训练成本 + 推理算力 | 几乎零成本 |
| 可定制性 | 提示工程 | 微调数据集 | 规则字典 |
| 数据隐私 | 数据需上传 OpenAI | 完全私有 | 完全私有 |
| 准确率 | 90-95% | 92-97% | 70-85% |

推荐：若数据敏感且量大，方案B；若需要快速原型，方案A；若任务边界清晰且预算极低，方案C。
</details>

**习题 11.9**（创造层）：假设你需要为医院构建一个智能问诊系统，输入是患者自然语言描述，输出是初步科室推荐。请描述：

1. 系统架构（数据流、模型选型、服务拆分）
2. 数据策略（标注、合规、隐私保护）
3. 风险控制（误诊责任、模型漂移、可解释性）
4. 上线节奏（MVP、迭代、监控）

<details>
<summary>查看参考要点</summary>

1. 架构：患者描述 → 文本清洗 → 实体识别（症状、部位）→ 意图分类（科室）→ 风险评估 → 输出。模型选型建议：实体识别用 BERT-NER，科室分类用 RoBERTa 微调，风险评分用规则+模型。
2. 数据：与三甲医院合作获取脱敏病历；遵循 HIPAA 与《个人信息保护法》；标注由执业医师完成。
3. 风险：明确"非诊断、仅辅助建议"声明；设置高风险症状（如胸痛、急性意识障碍）强制人工介入；模型每周评估漂移。
4. 节奏：MVP（3 个月，单一科室）→ 横向扩展（6 个月，5 科室）→ 全院上线（12 个月，含监控闭环）。
</details>

**习题 11.10**（分析层）：解释为什么 Transformer 在长序列上注意力复杂度为 $O(n^2)$，并描述 Longformer、BigBird、Linear Attention 等改进方案的核心思路与权衡。

<details>
<summary>查看参考要点</summary>

标准 Transformer 注意力需计算所有 $n \times n$ 个 query-key 对，复杂度 $O(n^2 d_k)$，内存 $O(n^2)$。

- Longformer：滑窗注意力 + 全局 token，复杂度 $O(n \cdot w)$，$w$ 为窗口大小
- BigBird：随机 + 滑窗 + 全局，理论证明为图灵完备，复杂度 $O(n)$
- Linear Attention：用核函数近似 softmax，复杂度 $O(n \cdot d^2)$，但表达力下降

权衡：稀疏注意力保留局部性但损失全局信息；线性注意力速度快但近似精度有限。
</details>

## 12. 参考文献

参考文献遵循 ACM Reference Format，按发表年份升序排列：

[1] Bird, S., Klein, E., and Loper, E. 2009. _Natural Language Processing with Python: Analyzing Text with the Natural Language Toolkit_. O'Reilly Media, Sebastopol, CA. https://www.nltk.org/book/

[2] Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., and Polosukhin, I. 2017. Attention is all you need. In _Advances in Neural Information Processing Systems 30 (NeurIPS 2017)_, 5998–6008. DOI: 10.48550/arXiv.1706.03762. https://arxiv.org/abs/1706.03762

[3] Devlin, J., Chang, M.-W., Lee, K., and Toutanova, K. 2019. BERT: Pre-training of deep bidirectional transformers for language understanding. In _Proceedings of the 2019 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies (NAACL-HLT 2019)_, 4171–4186. DOI: 10.18653/v1/N19-1423. https://aclanthology.org/N19-1423

[4] Honnibal, M., Montani, I., Van Landeghem, S., and Boyd, A. 2020. spaCy: Industrial-strength natural language processing in Python. Zenodo. DOI: 10.5281/zenodo.1212303. https://spacy.io

[5] Brown, T. B., Mann, B., Ryder, N., Subbiah, M., Kaplan, J., Dhariwal, P., Neelakantan, A., Shyam, P., Sastry, G., Askell, A., et al. 2020. Language models are few-shot learners. In _Advances in Neural Information Processing Systems 33 (NeurIPS 2020)_, 1877–1901. DOI: 10.48550/arXiv.2005.14165. https://arxiv.org/abs/2005.14165

[6] Raffel, C., Shazeer, N., Roberts, A., Lee, K., Narang, S., Matena, M., Zhou, Y., Li, W., and Liu, P. J. 2020. Exploring the limits of transfer learning with a unified text-to-text transformer. _Journal of Machine Learning Research_ 21, 140, 1–67. https://jmlr.org/papers/v21/20-074.html

[7] Wolf, T., Debut, L., Sanh, V., Chaumond, J., Delangue, C., Moi, A., Cistac, P., Rault, T., Louf, R., Funtowicz, M., Davison, J., Shleifer, S., von Platen, P., Carr, C., Rush, A. M., et al. 2020. Transformers: State-of-the-art natural language processing. In _Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing: System Demonstrations (EMNLP 2020 Demos)_, 38–45. DOI: 10.18653/v1/2020.emnlp-demos.6. https://aclanthology.org/2020.emnlp-demos.6

## 13. 延伸阅读

### 13.1 书籍

- Jurafsky, D. and Martin, J. H. _Speech and Language Processing_ (3rd ed. draft). Stanford University. https://web.stanford.edu/~jurafsky/slp3/ — NLP 教科书标准参考，覆盖统计与深度学习方法。
- Goldberg, Y. _Neural Network Methods in Natural Language Processing_. Morgan & Claypool, 2017. — 神经网络 NLP 入门经典。
- Eisenstein, J. _Introduction to Natural Language Processing_. MIT Press, 2019. — 强调语言学与统计建模基础。

### 13.2 经典论文

- Bahdanau, D., Cho, K., and Bengio, Y. 2015. Neural machine translation by jointly learning to align and translate. In _ICLR 2015_. — 注意力机制的开山之作。
- Mikolov, T. et al. 2013. Distributed representations of words and phrases and their compositionality. In _NeurIPS 2013_. — Word2Vec 经典。
- Pennington, J., Socher, R., and Manning, C. D. 2014. GloVe: Global vectors for word representation. In _EMNLP 2014_. — 词向量另一经典方法。

### 13.3 开源项目

- spaCy: https://github.com/explosion/spaCy — 工业级 NLP 库
- Hugging Face Transformers: https://github.com/huggingface/transformers — 大模型生态
- NLTK: https://github.com/nltk/nltk — 教学 NLP 库
- jieba: https://github.com/fxsjy/jieba — 中文分词
- LlamaIndex: https://github.com/run-llama/llama_index — LLM 应用框架
- LangChain: https://github.com/langchain-ai/langchain — LLM 编排框架

### 13.4 在线课程

- Stanford CS224N: Natural Language Processing with Deep Learning. https://web.stanford.edu/class/cs224n/
- Hugging Face NLP Course. https://huggingface.co/learn/nlp-course
- fast.ai NLP. https://www.fast.ai/2019/07/23/fastnlp-1/

### 13.5 标准与规范

- PEP 8: Python 代码风格指南
- PEP 484: 类型注解
- PEP 526: 变量注解语法
- PEP 560: 核心类型对泛型的支持
- PEP 695: 类型参数语法（Python 3.12+）

## 14. 术语表

| 术语 | 英文 | 简要说明 |
|------|------|---------|
| 自然语言处理 | Natural Language Processing (NLP) | 让计算机理解、生成、翻译人类自然语言的技术 |
| 分词 | Tokenization | 将文本切分为最小语义单元的过程 |
| 词性标注 | Part-of-Speech (POS) Tagging | 为每个词标注词性（名词、动词、形容词等） |
| 命名实体识别 | Named Entity Recognition (NER) | 识别文本中的人名、地名、机构名等实体 |
| 依存句法分析 | Dependency Parsing | 分析句子中词与词之间的依存关系 |
| 词向量 | Word Embedding | 将离散词映射为稠密实数向量 |
| 注意力机制 | Attention Mechanism | 让模型动态关注输入序列的不同部分 |
| 自注意力 | Self-Attention | 注意力机制的特殊形式，Q=K=V 来自同一序列 |
| 多头注意力 | Multi-Head Attention | 并行计算多个注意力头，捕获不同子空间信息 |
| 预训练 | Pre-training | 在大规模无标注数据上训练模型通用表示 |
| 微调 | Fine-tuning | 在下游任务的有标注数据上调整预训练模型 |
| 掩码语言模型 | Masked Language Model (MLM) | BERT 的预训练目标，随机掩码部分词并预测 |
| 自回归语言模型 | Autoregressive Language Model | GPT 的预训练目标，从前文预测下一个词 |
| 序列到序列 | Sequence-to-Sequence (Seq2Seq) | 编码器-解码器架构，用于翻译、摘要 |
| 子词分词 | Subword Tokenization | BPE、WordPiece 等算法，平衡词表与序列长度 |

## 15. 版本演进与兼容性说明

本节列出 Python 与主流 NLP 库的版本兼容矩阵，供工程实践参考。

### 15.1 Python 版本支持现状

| Python 版本 | 发布年份 | 状态 | 主流 NLP 库支持 |
|------------|---------|------|----------------|
| 3.9 | 2020 | 安全维护 | 全部支持 |
| 3.10 | 2021 | 安全维护 | 全部支持 |
| 3.11 | 2022 | 安全维护 | 全部支持 |
| 3.12 | 2023 | 主流维护 | 全部支持 |
| 3.13 | 2024 | 主流维护 | 主流支持 |
| 3.14 | 2025 | 新版本 | 部分库尚在适配 |

### 15.2 主要 NLP 库版本

- spaCy 3.7+（2023-）：新增 spancat 等组件，支持 Transformer 后端
- Transformers 4.40+（2024-）：支持 Llama 3、Mistral、Qwen 等新模型
- PyTorch 2.2+（2024-）：torch.compile 加速训练
- NLTK 3.8+：稳定更新
- jieba 0.42+：长期稳定

## 16. 总结

本模块系统讲解了 Python 在自然语言处理领域的应用，涵盖以下要点：

1. **理论基础**：从符号主义到统计学习再到深度学习与大模型，理解 NLP 的演进脉络。
2. **形式化定义**：分词、词向量、注意力机制均给出了精确的数学定义与推导。
3. **工具链**：NLTK、spaCy、Transformers、jieba 各有定位，需根据场景选择。
4. **工程实践**：从虚拟环境到推理服务化，给出了生产级代码示例。
5. **真实案例**：Dropbox、Instagram、YouTube 等公司的实践揭示了工业落地难点。
6. **前沿趋势**：Transformer、大模型、Agent 框架代表了 NLP 的未来方向。

NLP 是一门快速演进的学科，本模块内容会持续更新以反映最新进展。建议读者结合实际项目练习，从经典文本分类任务入手，逐步过渡到复杂的大模型应用开发。

---

最后审阅：2026-07-20 | 审阅人：FANDEX Content Engineering Team
