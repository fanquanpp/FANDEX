# FANDEX 仓库勘察总报告（repository-audit）

- 勘察日期：2026-09-27
- 勘察范围：全仓库只读勘察，未修改任何教学文档
- 勘察方法：全量脚本统计（文件数、体量、frontmatter、章节、引用、学习路径覆盖率）+ 四路并行抽样审计（教学质量、重复与断层、课程体系、技术时效性）+ 联网核实关键技术事实
- 配套报告：content-quality-audit.md / curriculum-audit.md / dependency-analysis.md / duplicate-analysis.md / outdated-content.md / missing-content.md / learning-gap-analysis.md / refactor-plan.md

## 1. 仓库结构

```
FANDEX/                          # monorepo，三端共享同一内容层
├── cnt-content/full/            # 教学内容唯一来源：43 模块 1803 篇
├── cnt-content/syntax/          # 语法速查源：14 模块 496 篇（4300+ 卡片）
├── shd-shared/metadata/         # modules.json + learning-path/*.json（1069 节点）
├── app-web/                     # Astro 7 + React 19 网站（含内容审计脚本）
├── app-desktop / app-desktop-portable / app-Android-new / app-Android-old
└── scripts/                     # 发版自动化
```

内容管线：作者只写 Markdown，`content-sync.mjs` 自动补全托管 frontmatter 并注册模块；`content-audit.mjs` 做 CI 质量门禁（HIGH 级阻断）。

## 2. 规模统计

| 指标 | 数值 |
| --- | --- |
| full 教学文档 | 1803 篇 / 43 模块 |
| syntax 速查文档 | 496 篇 / 14 模块 |
| 学习路径节点 | 1069 个（43 个路径 JSON 全部存在，0 悬空引用） |
| difficulty 分布 | beginner 521 / intermediate 806 / advanced 477 |
| 体量分布 | 超过 60KB 的 209 篇；低于 8KB 的 224 篇 |
| 章节覆盖 | 含「前置知识」章节 864 篇；含「学习目标」765 篇 |
| 练习与动手 | 正文含「练习」仅 120 篇；含「动手」355 篇；带独立练习标题的仅约 18 篇（约 1%） |
| 机器可校验引用 | frontmatter related/prerequisites、正文内链、路径 doc 引用三类全部 0 断链 |

## 3. 生成批次分析（本次勘察最重要的背景发现）

全库 `updated` 字段呈现清晰的两批次结构，质量断层与批次几乎完全重合：

| 批次 | 数量 | 特征 |
| --- | --- | --- |
| 批量生成批（2026-09-12/13 前后） | 约 1663 篇 | 共用一套学术八股模板：历史动机与演化 → 形式化定义 → 理论推导与证明 → 代码示例 → 对比分析 → 常见陷阱 → 案例研究 → 附录速查。0 练习 0 动手是模板默认状态 |
| 人工重写批（2026-09-18 至 09-23） | 约 140 篇 | 集中在 001-start 全部 8 篇、mysql 010/030/040、javascript 520-540、roadmap/godot/gdscript/renpy/konado/mongodb/gode/postgresql 等。问题引入、分步操作、验证命令、FAQ、官方链接齐备，是全库改造的现成样板 |

由此形成三种文体并存的局面（详见 duplicate-analysis.md）：157 篇同一学术模板骨架文、83 篇速查占位文（description 为「的完整教学讲解。」）、259 篇教学正文与速查堆砌的混拼文，以及少量优秀教学文。

## 4. 现有质量门禁的覆盖与盲区

`app-web/scripts/content-audit.mjs` 已覆盖：frontmatter 合法性、标题、非标准字段、正文过薄（<30 字符）、3 条硬编码过时关键词、超万字文档缺「前置知识/学习目标」、wikilink 检测。

`app-web/scripts/audit-learning-path.mjs` 已覆盖：路径 JSON schema、ID 重复、doc 引用存在性、节点缺口清单。

两者均不检查（本次勘察确认的教学盲区）：

1. 反向覆盖率——只查「路径节点缺文档」，从不查「文档不在路径内」，导致 734 篇路径孤儿完全不可见；
2. 阶段排序合理性（basics 阶段出现元类、Binlog 这类错位）；
3. index 顺序与模块依赖图的一致性；
4. 实践密度（代码示例、练习、产出物配比）；
5. 断层检测（前置声明与真实概念依赖的一致性）；
6. 安全关键词（明文密码比对、CERT_NONE 等）；
7. 案例质量与技术时效性（现仅 3 条硬编码关键词）。

## 5. 核心结论摘要

1. 库主抱怨成立且可量化：抽样中约 70% 文档（概念堆砌 + 学术膨胀 + 过薄三类）不含任何「读者要做点什么」的环节；全库带独立练习栏位的文档约 1%。
2. 课程体系与内容脱节：40.7%（734 篇）文档不在任何学习路径内；部分路径阶段内容与阶段名错位（python 的 basics 阶段含元类与 FastAPI，真正的语法入门篇全部缺席）。
3. 入口错误：学习路径 index 把 javascript 排第 1、零基础起步模块 start 排第 37，与 folder_order 双序并存互相矛盾。
4. 依赖体系三层全部稀疏：43 个模块仅 20 个声明前置；文档层仅 15.9% 有非空 prerequisites；511 篇使用按编号相邻机械生成的「建议先完成前一篇的学习」，与概念依赖无关。
5. 重复失控：七个重点模块确认 40+ 重复组；full/ 内 83 篇速查体文档与 syntax/ 逐字重复维护；跨树模块编号错位。
6. 技术水位整体很新（React 19 / Next 16 / Tailwind 4 / Vite 8 / Astro 7 / Python 3.14），无系统性过时教材问题；风险集中在两处版本口径滞后与三个安全教学缺口。
7. `updated` 字段全库统一刷写为 2026-09，不能作为时效性信号，随时间推移会系统性失真。

## 6. 正向资产（重构时应保留的底座）

- 001-start 模块（8 篇）是全库质量最整齐的零基础门户，概念首次出现即解释、检验清单与下一步齐备；
- 2026-09-18 后的人工重写批（约 140 篇）已验证了正确的教学文体，可直接作为 Phase 4 样板课程的参照系；
- 2026 年新建的 9 个模块（start/svg/roadmap/mongodb/godot/gdscript/renpy/gode/konado）路径覆盖 100% 且阶段设计合理，说明「先写路径再写文」的新流程可以反向套用到老模块；
- javascript 学习路径（10 阶段、67/71 覆盖）是老模块中唯一结构健康的路径；
- content-sync 的死链清洗与模块注册机制运转良好，机器可校验引用 0 断链；
- 版本敏感模块（react/nextjs/tailwind/vite/astro）的时效性维护明显优于行业平均水平；
- mysql/170-CharsetCollation.md 的 utf8mb4 铁律、python/010 的版本策略等篇目体现了「官方准确」的写作水准。

## 7. 后续勘察建议

本报告为第一阶段（调查、分析、建立重构方案）的交付物。按 refactor-plan.md 的阶段划分，下一步是 Phase 2（建立目标课程体系）与 Phase 3（文档迁移映射），在此之前不允许批量修改教学 Markdown。
