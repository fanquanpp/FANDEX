# FANDEX 内容质量基线审计报告

> Phase 0.2 现状基线 · 生成时间 2026-07-18  
> 审计脚本：`scripts/content-audit.mjs`  
> 扫描范围：`src/content/docs/**/*.md(x)`

## 一、总体概览

| 指标           | 数值                |
| -------------- | ------------------- |
| 文档总数       | 2013                |
| 模块总数       | 52                  |
| 全文字符总量   | 13,373,319          |
| 平均每篇字符数 | 6,643.48            |
| 问题总数       | 1566                |
| HIGH 严重度    | 0                   |
| MEDIUM 严重度  | 643                 |
| LOW 严重度     | 923                 |
| 审计脚本退出码 | 0（无 HIGH 级阻断） |

## 二、Frontmatter 完整性

| 字段       | 缺失数 | 通过率  |
| ---------- | ------ | ------- |
| title      | 0      | 100.00% |
| module     | 0      | 100.00% |
| order      | 466    | 76.84%  |
| difficulty | 67     | 96.67%  |

**结论**：title 与 module 字段全部齐全；order 字段缺失最严重（466 篇，约 23%），difficulty 字段次之（67 篇，约 3.3%）。

## 三、问题分类统计

| 问题类型           | 严重度 | 数量 | 占比   | 说明                                                   |
| ------------------ | ------ | ---- | ------ | ------------------------------------------------------ |
| MISSING_ORDER      | MEDIUM | 466  | 29.76% | frontmatter 缺少 order 字段                            |
| MISSING_DIFFICULTY | MEDIUM | 67   | 4.28%  | frontmatter 缺少 difficulty 字段                       |
| WIKILINK           | MEDIUM | 110  | 7.02%  | Obsidian 风格 `[[...]]` 链接（部分为数学矩阵语法误判） |
| MISSING_PREAMBLE   | LOW    | 320  | 20.43% | 长文档（>10000 字符）缺少前置知识/学习目标             |
| INTERNAL_LINK      | LOW    | 603  | 38.51% | 内部链接格式不规范（含代码片段误判）                   |

## 四、模块覆盖（52 个）

```
agent, ai-engineering, ai-ethics, algorithm, big-data, c, calculus,
cloud-computing, computer-vision, cpp, cs-fundamentals, csharp, css,
cybersecurity, data-analysis, deep-learning, devops, discrete-math,
engineering-practices, english, generative-ai, getting-started, git,
github, go, harmonyos, html5, iot, java, javascript, kotlin,
linear-algebra, llm, lua, machine-learning, markdown, multimodal,
mysql, networking, nlp, postgresql, probability-statistics, python,
react, redis, software-architecture, software-engineering,
software-testing, sql, svg, typescript, vue3
```

## 五、关键发现

1. **无 HIGH 级阻断问题**：当前内容库未出现 frontmatter 完全缺失、标题为空、过时高危关键词等阻断性问题，CI 流水线可正常放行。
2. **order 字段是最大短板**：466 篇文档（约 23%）缺少 order 字段，将直接影响模块内文档排序的稳定性，建议优先补全。
3. **WIKILINK 检测存在误判**：110 条 WIKILINK 中有相当比例为数学矩阵符号 `[[x, y]]`、`[[1, 0, 1, ...]]` 被误判，需审计脚本优化正则或对数学公式块进行豁免。
4. **INTERNAL_LINK 同样存在误判**：603 条内部链接警告中，部分为代码片段中的函数签名 `int start, int remaining` 被误判为链接，需审计脚本增强代码块识别。
5. **长文档前置章节缺失普遍**：320 篇长文档缺少『前置知识』或『学习目标』章节，影响学习路径引导，建议在内容工程规范中纳入强制要求。
6. **difficulty 字段缺失较少**：仅 67 篇缺失，可在批量补全中一并处理。

## 六、改进建议

| 优先级 | 改进项                                                                      | 预期收益                       |
| ------ | --------------------------------------------------------------------------- | ------------------------------ |
| P0     | 批量补全 466 篇文档的 order 字段                                            | 模块排序稳定，导航可预测       |
| P0     | 优化 content-audit.mjs 的 WIKILINK/INTERNAL_LINK 正则，豁免代码块与数学公式 | 减少误报，提升审计信号噪比     |
| P1     | 批量补全 67 篇文档的 difficulty 字段                                        | 难度标识完整，支持学习路径推荐 |
| P1     | 为 320 篇长文档补加『前置知识/学习目标』章节                                | 提升学习路径引导能力           |
| P2     | 在内容工程规范中将 order/difficulty 设为强制字段，CI 拦截                   | 杜绝新增文档再次缺失           |

## 七、附注

- Lighthouse 基线测量待 Phase 3.7 集成（性能、可访问性、SEO、最佳实践四维度）。
- 本报告作为 Phase 4 改进效果对比的基线，后续变更须对照本报告中的指标衡量改进幅度。
- 原始审计输出见同目录 `content-audit.txt`，结构化数据见 `content-audit.json`。
