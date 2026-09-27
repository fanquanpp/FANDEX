# 重复内容与文档结构分析（duplicate-analysis）

- 勘察日期：2026-09-27
- 方法：重点模块全量标题/description 比对 + 关键文件逐字节 diff + Top30 大文件结构分析。
- 路径相对 `cnt-content/`。

## 1. 全库三种文体并存（结构问题的根源）

| 文体 | 数量 | 特征 |
| --- | --- | --- |
| 学术模板骨架文 | 157 篇 | 「历史动机与发展脉络/形式化定义/理论推导与原理解析/对比分析/案例研究/附录速查表」八股 |
| 速查占位文 | 83 篇 | description 为自动占位串「的完整教学讲解。」、related 为空、正文为速查体（python 26、java 20、postgresql 9、mysql 6、cpp 5 等） |
| 教学/速查混拼文 | 259 篇 | 同时含「建议先完成前一篇的学习」与「基本写法：」两类结构，教学正文后拼接速查堆砌 |
| 人工教学文 | 约 140 篇 | 09-18 重写批 + 少量 A 类批次 |

每个模块深讲篇与速查篇并行（双轨生产），读者按编号顺序会连续学两三遍同一主题。

## 2. 模块内重复组清单（重点模块，重叠度高的加粗）

### python（104 篇，约 13 组）

| 重复组 | 重叠度 |
| --- | --- |
| **070-BasicDataType / 120-StringFormattingMethods / 200-StringText**（字符串三重覆盖） | 高 |
| **460-OOP / 470-OOPFundamentals**（470 的全部 H2 被 460 覆盖） | 高 |
| **500-Decorator / 510-DecoratorAdvanced** | 高 |
| **570-Descriptor / 580-PythonDescriptorProtocol** | 高 |
| 590-Metaclass / 600-MetaclassSingleton | 中 |
| **630-MultiprocessingMultithreading / 640-ConcurrentProgramming / 650-GILAndFreeThreading**（三重覆盖并发） | 高 |
| **660-CoroutineAsyncio / 670-AsyncProgrammingDetailed** | 高 |
| **420-Logging / 430-PythonLog** | 高 |
| **680-ProfilingOptimization / 690-PythonPerformance** | 高 |
| **750-PythonTest / 760-UnittestPytest** | 高 |
| 160/170/180 推导式-生成器三连 | 中-高 |
| 810-PythonCLI / 820-ArgparseCli | 中 |
| 530-TypeAnnotationMypy / 540-TypingAdvanced | 中 |

### javascript（71 篇）

- **290-EventLoop / 300-EventLoopDetailed**：H2 几乎同构。
- **180-JavaScriptPrototypeInheritance / 190-PrototypeChainClassEssence**：高。
- 590/600/610/620 ES 新特性四篇：Temporal 与显式资源管理最多三处维护。中-高。
- 040/050 变量与数据类型交叠；250-270 异步三篇未声明分工。中。

### typescript（73 篇）

- **430-ConditionalTypeDistribute / 440-ConditionalTypeInfer / 450-InferTypeDeepDive**（条件类型三连）。
- **530-TypeGymnasticsPracticalPatterns / 540-TypeGymnastics**。
- 270/280 装饰器、290/340 模块声明。中。

### java（105 篇）

- **480-MultithreadingBasics / 490-ConcurrencyBasics / 500-JUCConcurrency / 510-ConcurrencyDetailed**（并发四连，480 与 490 描述几乎相同）。
- **390-GenericDetailed / 410-JavaGenericsTutorial**。
- **720-JavaDatabaseConnection / 730-JDBCDatabaseConnection**。
- 360/380 枚举、590/640 JVM 类加载、280/670 IO。中。

### mysql（92 篇）

- **100-DML / 110-SQLDataOperationQuery**；**120-DQL / 130-SQLFunctionAndAdvancedQuery**；**140-MultiTableJoinDetailed / 150-AdvancedQueryMultiTableOperation**。
- 320/330 EXPLAIN；430/440 MVCC；**690-AccountPermissionManagement / 700-UserPermission**。

### c（60 篇）

- **200-DynamicMemoryManagement / 210-MemoryManagement**；**220-MemoryAlignmentDeepDive / 230-AlignmentMemoryLayout**；**520-C23C2y / 530-C23NewFeatures**。

### cpp（78 篇，五组高重叠）

- **090-RvalueReferenceMoveSemantics（101KB）/ 100-MoveSemanticsDetailed**；**130/140 智能指针**；**350/360 SFINAE（中文译名都相同）**；**370/380 变参模板**；**430/440 并发**。

## 3. 跨模块重复

1. **full/ 与 syntax/ 双轨维护（最实质）**：CONTENT-GUIDE 定位 syntax/ 为速查专用源，但 full/ 内 83 篇速查占位文与其逐字相同（仅头部不同）。已 diff 证实：`full/017-mysql/080-DDL.md` 等于 `syntax/020-mysql/011-DDL.md`；100-DML、120-DQL、700-UserPermission 同理；`full/032-python/070-BasicDataType.md` 等于 `syntax/040-python/004-BasicDataType.md`；260-Itertools 同理。
2. **两树模块编号错位**：同一 slug 在两树编号不同（syntax/008-javascript 对 full/007-javascript、013-java 对 012-java、019-sql 对 016-sql、020-mysql 对 017-mysql、025-c 对 022-c、026-cpp 对 023-cpp、040-python 对 032-python、041-rust 对 033-rust），交叉维护必出错。
3. **sql / mysql / postgresql 三方重复**：DDL/DML/MVCC/索引同主题三处维护，方言差异没有分工声明。
4. **javascript / typescript 入门**：typescript/040-TSBasicsVariablesAndTypes 自称「零基础第一课」重教 let/const/var。
5. **godot / gdscript**：信号系统两处讲（godot/040 与 gdscript/090）。
6. **环境搭建四处重复**：001-start/030、python/020、python/030、python/040——零基础读者会连续四次装环境。

## 4. Top30 大文件与拆分判断（节选）

| KB | 文件 | 判断 |
| --- | --- | --- |
| 210 | full/019-redis/090-Stream.md | 应拆：13 章小书（数据结构/命令/消费者组/集群/监控至少 3 篇的量） |
| 147 | full/018-postgresql/210-VACUUMMechanism.md | 应拆：原理/autovacuum/调优/监控 |
| 137 | full/013-kotlin/160-SealedClassSealedInterface.md | 应清理：学术模板 + 13 个速查 H2 拼接，一题两体 |
| 137 | full/016-sql/420-Index.md | 应拆，且与 mysql 索引系列互覆 |
| 126 | full/018-postgresql/170-TransactionConcurrencyControl.md | 应拆：MVCC/隔离级别/锁/WAL 多主题合一 |
| 126 | full/023-cpp/420-Cpp20Coroutine.md | 应清理：模板 + 速查拼接 |
| 103 | full/032-python/590-Metaclass.md | 先与 600 去重再拆附录 |
| 97 | full/032-python/090-VariableConstant.md | 问题不是拆分而是文体错配（beginner 序位配学术文） |
| 98-108 | 020-algorithm 的 030-SortAlgorithm/110-GraphAlgorithms/160-DynamicProgramming/300-LeetCodeInterviewGuide | 多算法合集与面试杂烩，应按主题拆篇 |

约一半 Top30 是「学术模板小书」，约三分之一是「教学正文 + 尾部速查」混拼文。

## 5. 处置框架建议

- 速查占位文（83 篇）：从 full/ 删除或改造为真教学文，速查内容回归 syntax/ 单一来源（需先统一两树模块编号）。
- 高重叠重复组（约 20 组）：按「KEEP 一篇为主文档 + MERGE 精华 + DELETE 其余」处理，优先处理零基础主线上的重复（python 字符串三重、javascript EventLoop 双讲）。
- 学术模板小书：先判文体再判拆分——若定位改为「进阶参考」，移入参考层并从入门主线的前置链上摘除；若保留教学定位，按单一主题拆分并重写。
- 混拼文（259 篇）：尾部速查段删除（syntax/ 已有对应内容）或改造为「本章速查」栏目。
