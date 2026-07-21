---
title: 公平性标准群体个体与反事实
description: '公平性文献三大家族：群体公平(人口统计均等、机会均等、条件使用准确率均等)、个体公平(Dwork 2012 Lipschitz条件)、反事实公平(Kusner 2017因果图依赖)。不可能性定理：不等基率下三者不可同时满足。回溯反事实避免对受保护属性的干预。ICLR 2024哲学调和：群体与反事实公平是同一因果结构的不同面。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - 公平性
  - 群体公平
  - 个体公平
  - 反事实公平
  - 不可能性定理
  - 回溯反事实
related:
  - 'ai-ethics/对齐研究生态MATS与Redwood与Apollo'
  - 'ai-ethics/多样本越狱'
  - 'ai-ethics/红队测试PAIR与自动化攻击'
  - 'ai-ethics/红队工具Garak与LlamaGuard'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

第20课关于测量偏见。第21课关于定义测量应服务的公平性标准。三大家族给出结构不同的标准——模型可以群体公平但个体不公平，反事实公平但群体不公平。选择标准是政策决策；没有标准是普遍最优的。

## 核心概念

### 群体公平

- **人口统计均等(Demographic parity)。** 对所有群体P(Y=1 | A=a) = P(Y=1 | A=a')。均等接受率。
- **机会均等(Equalized odds)。** P(Y=1 | Y*=y, A=a) = P(Y=1 | Y*=y, A=a')。跨群体均等TPR和FPR。
- **条件使用准确率均等(Conditional use accuracy equality)。** P(Y*=y | Y=y, A=a) = P(Y*=y | Y=y, A=a')。跨群体均等预测值。

不可能性(Chouldechova, Kleinberg-Mullainathan-Raghavan 2017)：在不等基率下这三者不可同时满足。

### 个体公平

Dwork等人2012。决策映射f相对于任务特定相似度度量d是个体公平的，如果|f(x) - f(x')| <= L \* d(x, x')对某Lipschitz常数L成立。相似个体获得相似决策。

需要定义d。政策问题，不是统计问题。

### 反事实公平

Kusner等人2017。在种群的因果模型下，如果个体i的敏感属性被反事实改变时决策不变，则决策对个体i是反事实公平的。

需要因果DAG。DAG是建模选择。反事实公平的合理性仅与DAG一样。

### CF-vs-准确率权衡

NeurIPS 2024理论：反事实公平和预测准确率之间存在固有权衡。模型不可知方法可以将最优但不公平的预测器转换为CF公平的，以有界准确率成本为代价。准确率成本取决于最优不公平预测器中敏感属性系数的大小。

### 回溯反事实

arXiv:2401.13935 (2024年1月)。传统反事实需要对敏感属性的干预——"如果这个人是不同性别，决策会改变吗"。在法律上，这是有问题的：受保护属性在分类法中不能被干预。

回溯反事实翻转方向：不是干预属性，而是问个体实际特征的什么组合会产生反事实结果。这规避了法律异议。

### 哲学调和

ICLR Blogposts 2024。有了因果图，满足某些群体公平度量意味着满足反事实公平。三大家族不是正交的；它们是同一底层因果结构的不同面。

这不解决不可能性定理（不等基率仍然阻止同时群体公平）。但它表明"群体"和"个体/反事实"之间的表面对立部分是不明确因果模型的伪影。

## 关键术语

| 术语                        | 常见说法         | 实际含义                                        |
| --------------------------- | ---------------- | ----------------------------------------------- |
| Demographic parity          | "均等率"         | P(Y=1 \| A=a)跨群体相等                         |
| Equalized odds              | "均等TPR/FPR"    | 跨群体均等真正率和假正率                        |
| Conditional use accuracy    | "均等PPV/NPV"    | 跨群体均等预测值                                |
| Individual fairness         | "Lipschitz条件"  | 相似个体获得相似决策                            |
| Counterfactual fairness     | "因果改变不变性" | 反事实属性改变下决策不变                        |
| Backtracking counterfactual | "通过实际解释"   | 从结果向后推理的反事实，而非从属性向前          |
| Impossibility theorem       | "三者冲突"       | Chouldechova / KMR 2017：不等基率下群体标准互斥 |

## 延伸阅读

- Dwork et al. — Fairness through Awareness (arXiv:1104.3913) — 个体公平
- Kusner, Loftus, Russell, Silva — Counterfactual Fairness (arXiv:1703.06856) — 反事实公平
- Chouldechova — Fair prediction with disparate impact (arXiv:1703.00056) — 不可能性
- Backtracking Counterfactuals (arXiv:2401.13935) — 受保护属性干预的新范式
