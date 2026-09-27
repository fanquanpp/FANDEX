# 知识依赖体系分析（dependency-analysis）

- 勘察日期：2026-09-27
- 对象：模块层 modulePrerequisites、文档层 frontmatter prerequisites/related、正文章节「前置知识」、学习路径节点顺序。
- 全程只读；frontmatter 与正文内链全量 1803 篇解析校验。

## 1. 三层依赖体系的现状数据

| 层 | 设计意图 | 实际状态 |
| --- | --- | --- |
| modules.json modulePrerequisites | 模块间学习先后 | 仅 20/43 模块声明；python/java/go/sql/mysql/redis/algorithm/cs-fundamentals/c/shell/networking/software-testing 等 23 个为零 |
| frontmatter prerequisites | 篇级前置 | 1803 篇全有字段，仅 286 篇（15.9%）非空 |
| frontmatter related | 相关阅读 | 1685 篇有内容，6098 条边；但 2021 条（33%）非成对声明；跨模块 related 仅 139 条（2.3%） |
| 正文章节「前置知识」 | 面向读者的前置说明 | 864 篇有该章节；其中 511 篇使用机械句式「建议先完成前一篇的学习」 |

健康部分：三类机器可校验引用（frontmatter、正文内链 1858 条、路径 doc 1069 个）全部 0 断链——`content-sync.mjs` 构建期清洗死引用并套用模块别名，这条防线有效。

## 2. 机械前置：「前一篇」不等于「前置知识」

511 篇文档的「建议先完成前一篇的学习」按文件编号相邻自动生成，与概念依赖无关。实测样本：

1. `032-python/180-GeneratorCoroutine.md`：前置指向 560-DataClassFieldDefault（数据类字段默认值）——与生成器/协程无关；真正需要的 170-ComprehensionGenerator 与迭代器协议未列。
2. `032-python/590-Metaclass.md`：前置指向 040-PythonVirtualEnv（虚拟环境）——元类实际需要 460/470-OOP 与 570/580-Descriptor 支撑，声明完全错位。
3. `032-python/640-ConcurrentProgramming.md`：前置指向 770-PythonCodeQuality——编号在后，「前一篇」实际是向后指。
4. `032-python/140-BuiltinDataStructure.md`（intermediate）：前置要求先读 690-PythonPerformance（96KB 性能篇）——初学者学列表字典前先啃性能优化，序位倒挂。
5. `023-cpp/390-TemplateMetaprogramming.md`（107KB）：前置仅列 060-LambdaExpression——真正必需的 350/360-TypeTraitsSFINAE 未声明。

## 3. 模块层依赖缺失的实际影响

python 的 modulePrerequisites 为空，但正文实际使用：

- shell/命令行：`032-python/020-PythonOverviewEnvSetup.md`、`030-PyenvUvManage.md`（uv venv 命令）、`040-PythonVirtualEnv.md`；
- git：`032-python/780-PythonCICD.md` 出现 git revert/config/commit/push/log/diff 十余处；
- SQL：`032-python/340-Sqlite3.md`、`830-PythonSQLAlchemy.md`、`800-PythonDatabaseMigration.md`。

同类未声明：gode 强依赖 TypeScript/Node 而仅声明 godot；nestjs 依赖 HTTP/JSON 基础；software-testing 依赖 python。

## 4. 篇级 prerequisites 的规范性问题

- `032-python/880-PythonFastAPI.md`：related 4 条本模块引用，prerequisites 为空；实际依赖 530-TypeAnnotationMypy、550-DataClassPydantic、330-HttpxRequests 等均未声明。
- `032-python/130-ExceptionHandling.md`、`460-OOP.md`：prerequisites 均为空数组。
- `012-java/010-*`：prerequisites 规范声明了 cs-fundamentals/020-ProgrammingBasics（正面样本）；但 `java/020-JavaOverviewDevEnv` 在 related 中重复声明两次——无脚本检测重复项。
- `042-roadmap/010-RoadmapOverview.md`：prerequisites 声明 start/080-LearningRouteOverview（正面样本）。
- `017-mysql/430-MVCCPrinciple.md`：完全没有「前置知识」章节，frontmatter prerequisites 为空；MVCC 依赖 420-TransactionIsolationImplementation、510-UndoLog 却未声明。

## 5. 堆砌链：断层在依赖图上的传播

学术模板篇互为前置构成「堆砌链」：typescript 430→440→450（条件类型三连）、python 160→590→680 相关链。每一环本身都是同骨架学术文，链上无一篇是可跟做的教学文——依赖图「正确」地把学习者导向下一份堆砌文本。

正面反例（值得推广的做法）：`032-python/010-WhatIsPython.md` 用到 def 与 f-string 时主动标注「先混个眼熟，本模块第二篇起逐一讲透」——前向引用不是不能有，而是要明示。

## 6. 结论与修复方向

1. 依赖体系的三层数据结构都已存在且管线健壮，缺的是「正确的数据」：需要按概念依赖（而非编号相邻）重建篇级前置。
2. 修复顺序建议：先修模块层 modulePrerequisites（一次性、23 个模块）、再修零基础主线的篇级前置（python/javascript/html5/css/git/mysql 的入门 20 篇）、最后铺开到全部模块。
3. 扩展审计脚本：related 成对性、重复项检测、prerequisites 与「前置知识」章节一致性、相邻文档难度跳变检测（断层信号）。
