# 文档迁移映射总表（document-migration-map）

- 生成日期：2026-09-27（脚本扫描全库 frontmatter + 勘察结论合成）
- 用途：Phase 6 批量重构的逐篇处置依据；处置动作为 KEEP / REWRITE / MERGE / SPLIT / DELETE / CREATE。执行任何一批改动后请回写本表状态列。
- 原则：文档数量不是教学质量；重复合并、超长拆分、占位删除、主线重写、优秀保留。

## 一、DELETE 候选：速查占位文（82 篇，2026-09-27 已执行 73 篇）

判据：description 为机器占位串「……的完整教学讲解。」。正文为速查体，与 cnt-content/syntax/ 速查源重复维护。处置：语法内容回归 syntax/ 单一来源，本篇从 full/ 删除或改造为真教学文。

**执行状态（2026-09-27）**：73 篇已删除（预检确认与 syntax 内容重合 ≥60% 且零正文引用，路径节点与 53 处死引用同步清理）；下列 6 篇因 syntax/ 无对应内容保留待改造：css/400-ModernColorSpace、css/690-GridQuickStart、css/700-Transform3D、css/710-ScopeAtRule、vue3/270-Vue3ViteBuildConfig、react/460-ReactViteToolchainCommand；其余 3 篇已在批次重写中改造为真教学文。

| 模块 | 文档 | 说明 |
| --- | --- | --- |
| css | 400-ModernColorSpace | CSS 现代色彩空间语法速查手册 的完整教学讲解。 |
| css | 690-GridQuickStart | CSS Grid 布局速查 的完整教学讲解。 |
| css | 700-Transform3D | CSS transform 与 3D 变换语法速查手册 的完整教学讲解。 |
| css | 710-ScopeAtRule | CSS @scope 规则语法速查手册 的完整教学讲解。 |
| javascript | 230-MapSetWeakMapWeakSet | JavaScript Map/Set/WeakMap/WeakSet 语法速查 的完整教学讲解。 |
| javascript | 240-ArrayBufferTypedArray | JavaScript ArrayBuffer 与 TypedArray 语法速查 的完整教学讲解。 |
| javascript | 550-PackageManagerCommands | JavaScript 包管理命令速查（npm/pnpm/yarn） 的完整教学讲解。 |
| vue3 | 270-Vue3ViteBuildConfig | Vue 3 Vite 构建配置与命令 的完整教学讲解。 |
| react | 460-ReactViteToolchainCommand | React Vite 与工具链命令 的完整教学讲解。 |
| java | 1020-JavaCommandLineTools | Java 命令行工具 javac/java/jar/jshell/jpackage 语法速查手册 的完整教学讲解。 |
| java | 120-JavaArraysUtility | Java Arrays 工具类语法速查手册 的完整教学讲解。 |
| java | 140-JavaStringFormat | Java String.format/printf/MessageFormat 语法速查手册 的完整教学讲解。 |
| java | 190-JavaTryWithResources | Java try-with-resources 与异常链语法速查手册 的完整教学讲解。 |
| java | 230-JavaIteratorIterable | Java Iterator/Iterable/Spliterator 语法速查手册 的完整教学讲解。 |
| java | 240-JavaComparatorComparable | Java Comparator/Comparable 语法速查手册 的完整教学讲解。 |
| java | 250-JavaObjectsUtility | Java Objects 工具类语法速查手册 的完整教学讲解。 |
| java | 310-JavaOptionalClass | Java Optional 类 的完整教学讲解。 |
| java | 350-JavaTimeFormatting | Java 时间格式化 DateTimeFormatter/ZoneId 语法速查手册 的完整教学讲解。 |
| java | 380-JavaEnumAdvanced | Java 枚举进阶 EnumSet/EnumMap/枚举单例语法速查手册 的完整教学讲解。 |
| java | 400-JavaTypeErasure | Java 类型擦除与桥接方法语法速查手册 的完整教学讲解。 |
| java | 540-ExecutorForkJoinPool | Java Executor 与 ForkJoin 的完整教学讲解。 |
| java | 550-JavaCountDownLatchCyclicBarrier | Java 同步器 CountDownLatch/CyclicBarrier/Phaser 语法速查手册 的完整教学讲解。 |
| java | 560-JavaBlockingQueue | Java 阻塞队列 BlockingQueue 语法速查手册 的完整教学讲解。 |
| java | 660-JavaNIOChannelBuffer | Java NIO 通道与缓冲区 的完整教学讲解。 |
| java | 670-JavaPathFiles | Java Path 与 Files 语法速查手册 的完整教学讲解。 |
| java | 710-JavaHttpClientWebSocket | Java HttpClient 与 WebSocket 语法速查手册 的完整教学讲解。 |
| java | 730-JDBCDatabaseConnection | Java JDBC 数据库连接 的完整教学讲解。 |
| java | 750-MavenPomConfiguration | Maven pom.xml 配置语法速查手册 的完整教学讲解。 |
| java | 760-GradleBuildConfiguration | Gradle build.gradle 配置语法速查手册 的完整教学讲解。 |
| csharp | 420-OOP | C# 面向对象编程 的完整教学讲解。 |
| csharp | 490-NetworkingHttp | C# HttpClient 网络请求 的完整教学讲解。 |
| mysql | 080-DDL | MySQL DDL 数据定义 的完整教学讲解。 |
| mysql | 100-DML | MySQL DML 数据操作 的完整教学讲解。 |
| mysql | 120-DQL | MySQL DQL 查询速查 的完整教学讲解。 |
| mysql | 210-IndexManagement | MySQL 索引管理 的完整教学讲解。 |
| mysql | 700-UserPermission | MySQL 用户与权限管理 的完整教学讲解。 |
| mysql | 910-CLI | MySQL CLI 命令 的完整教学讲解。 |
| postgresql | 020-PsqlCLI | PostgreSQL psql CLI 命令 的完整教学讲解。 |
| postgresql | 030-DDL | PostgreSQL DDL 数据定义 的完整教学讲解。 |
| postgresql | 040-DML | PostgreSQL DML 数据操作 的完整教学讲解。 |
| postgresql | 050-SchemaManagement | 模式（Schema）管理 语法速查手册 的完整教学讲解。 |
| postgresql | 060-WindowFunction | PostgreSQL 窗口函数 的完整教学讲解。 |
| postgresql | 070-CTE | PostgreSQL CTE 递归查询 的完整教学讲解。 |
| postgresql | 100-ArrayType | 数组类型操作 语法速查手册 的完整教学讲解。 |
| postgresql | 130-ViewMaterializedView | 视图与物化视图 语法速查手册 的完整教学讲解。 |
| postgresql | 460-PgDumpRestore | pg_dump 与 pg_restore 语法速查手册 的完整教学讲解。 |
| redis | 040-ListSetZSetCommand | Redis List/Set/ZSet 命令 的完整教学讲解。 |
| redis | 080-PubSubCommand | Redis 发布订阅命令 的完整教学讲解。 |
| redis | 290-ACL | Redis 安全与 ACL 命令速查手册 的完整教学讲解。 |
| redis | 300-NewFeatures7 | Redis 7.0+ 新特性命令速查手册 的完整教学讲解。 |
| c | 480-CCompilerOptions | C 编译器命令 语法速查手册 的完整教学讲解。 |
| c | 500-CDebugGdb | C gdb 调试 语法速查手册 的完整教学讲解。 |
| cpp | 250-CppSTLIterator | C++ STL 迭代器 的完整教学讲解。 |
| cpp | 260-STLContainerUsage | C++ STL 容器使用速查 的完整教学讲解。 |
| cpp | 650-CMakeBuild | C++ CMake 构建命令 的完整教学讲解。 |
| cpp | 670-DebugCommand | C++ 调试命令 的完整教学讲解。 |
| cpp | 720-Cpp20Overview | C++20 新特性汇总 的完整教学讲解。 |
| python | 070-BasicDataType | 基础数据类型 的完整教学讲解。 |
| python | 120-StringFormattingMethods | Python 字符串格式化与方法 的完整教学讲解。 |
| python | 190-Pathlib | Python pathlib 路径操作 的完整教学讲解。 |
| python | 200-StringText | Python 字符串与文本处理 的完整教学讲解。 |
| python | 220-DatetimeTime | Python datetime 与 time 的完整教学讲解。 |
| python | 240-MathRandomStatistics | Python math/random/statistics 的完整教学讲解。 |
| python | 250-ArrayBisect | Python array 与 bisect 的完整教学讲解。 |
| python | 260-Itertools | Python itertools 迭代工具 的完整教学讲解。 |
| python | 270-Functools | Python functools 函数工具 的完整教学讲解。 |
| python | 290-SerializationJsonCsvPickle | Python 序列化 JSON/CSV/Pickle 的完整教学讲解。 |
| python | 310-NetworkSocketHttp | Python 网络编程 socket/http 的完整教学讲解。 |
| python | 330-HttpxRequests | Python httpx 与 requests 的完整教学讲解。 |
| python | 340-Sqlite3 | Python sqlite3 数据库 的完整教学讲解。 |
| python | 350-HashlibHmac | Python hashlib 与 hmac 的完整教学讲解。 |
| python | 390-SysOsPlatform | Python sys/os 平台接口 的完整教学讲解。 |
| python | 400-ZipfileTarfile | Python zipfile 与 tarfile 的完整教学讲解。 |
| python | 410-ShutilTempfile | Python shutil 与 tempfile 的完整教学讲解。 |
| python | 420-Logging | Python logging 日志配置 的完整教学讲解。 |
| python | 440-GcInspect | Python gc inspect dis 的完整教学讲解。 |
| python | 450-TracebackWarnings | Python traceback 与 warnings 的完整教学讲解。 |
| python | 470-OOPFundamentals | Python 面向对象基础 的完整教学讲解。 |
| python | 540-TypingAdvanced | Python typing 进阶 的完整教学讲解。 |
| python | 680-ProfilingOptimization | Python 性能分析与优化 的完整教学讲解。 |
| python | 760-UnittestPytest | Python 测试 unittest/pytest 的完整教学讲解。 |
| python | 820-ArgparseCli | Python argparse 命令行参数解析 的完整教学讲解。 |

## 二、MERGE 组：重复主题合并（每组保留首篇为主文档）

**执行状态（2026-09-27）**：30 组中 8 组已由 DELETE 批次消化（速查方为占位文直接删除），2 组（mysql 100/110/120）已用「语法主讲 vs 工作流串联」的显式分工重构解决；余 20 组待各模块深水区批次处理，明细如下（组内后篇并入或改写为与前篇互补的专题）。

**状态（批次六复核）**：30 组中 21 组已消化（8 组删除、8 组分工重构含批次五 5 组、批次六 mysql 430/440 与 python 570/580、660/670 主教学+深水区——python 两组的互补分工在各自「前置知识」互相声明，报错与输出均实测捕获、批次四 3 组、批次三前 2 组）；余 9 组待深水区批次：python 630/640/650；typescript 530/540；java 480/490/500/510；c 200/210、220/230、520/530；cpp 130/140、350/360、370/380、430/440。

### python

- 主文档：`070-BasicDataType`，并入后删除或改写为专题：`120-StringFormattingMethods`、`200-StringText`
- 主文档：`460-OOP`，并入后删除或改写为专题：`470-OOPFundamentals`
- 主文档：`500-Decorator`，并入后删除或改写为专题：`510-DecoratorAdvanced`
- 主文档：`570-Descriptor`，并入后删除或改写为专题：`580-PythonDescriptorProtocol`
- 主文档：`630-MultiprocessingMultithreading`，并入后删除或改写为专题：`640-ConcurrentProgramming`、`650-GILAndFreeThreading`
- 主文档：`660-CoroutineAsyncio`，并入后删除或改写为专题：`670-AsyncProgrammingDetailed`
- 主文档：`420-Logging`，并入后删除或改写为专题：`430-PythonLog`
- 主文档：`680-ProfilingOptimization`，并入后删除或改写为专题：`690-PythonPerformance`
- 主文档：`750-PythonTest`，并入后删除或改写为专题：`760-UnittestPytest`
- 主文档：`530-TypeAnnotationMypy`，并入后删除或改写为专题：`540-TypingAdvanced`

### javascript

- 主文档：`290-EventLoop`，并入后删除或改写为专题：`300-EventLoopDetailed`
- 主文档：`180-JavaScriptPrototypeInheritance`，并入后删除或改写为专题：`190-PrototypeChainClassEssence`
- 主文档：`590-ES2023To2026NewFeatures`，并入后删除或改写为专题：`600-JavaScriptLatestFeature`

### typescript

- 主文档：`430-ConditionalTypeDistribute`，并入后删除或改写为专题：`440-ConditionalTypeInfer`、`450-InferTypeDeepDive`
- 主文档：`530-TypeGymnasticsPracticalPatterns`，并入后删除或改写为专题：`540-TypeGymnastics`

### java

- 主文档：`480-MultithreadingBasics`，并入后删除或改写为专题：`490-ConcurrencyBasics`、`500-JUCConcurrency`、`510-ConcurrencyDetailed`
- 主文档：`390-GenericDetailed`，并入后删除或改写为专题：`410-JavaGenericsTutorial`
- 主文档：`720-JavaDatabaseConnection`，并入后删除或改写为专题：`730-JDBCDatabaseConnection`

### mysql

- 主文档：`100-DML`，并入后删除或改写为专题：`110-SQLDataOperationQuery`
- 主文档：`320-EXPLAINDetailed`，并入后删除或改写为专题：`330-MySQLIndexExecutionPlan`
- 主文档：`430-MVCCPrinciple`，并入后删除或改写为专题：`440-MVCCSnapshotCurrentRead`
- 主文档：`690-AccountPermissionManagement`，并入后删除或改写为专题：`700-UserPermission`

### c

- 主文档：`200-DynamicMemoryManagement`，并入后删除或改写为专题：`210-MemoryManagement`
- 主文档：`220-MemoryAlignmentDeepDive`，并入后删除或改写为专题：`230-AlignmentMemoryLayout`
- 主文档：`520-C23C2y`，并入后删除或改写为专题：`530-C23NewFeatures`

### cpp

- 主文档：`090-RvalueReferenceMoveSemantics`，并入后删除或改写为专题：`100-MoveSemanticsDetailed`
- 主文档：`130-SmartPointerDeepDive`，并入后删除或改写为专题：`140-CppSmartPointer`
- 主文档：`350-TypeTraitsSFINAE`，并入后删除或改写为专题：`360-TypeExtractionSFINAE`
- 主文档：`370-VariadicTemplate`，并入后删除或改写为专题：`380-VariadicTemplateFoldExpression`
- 主文档：`430-MultithreadingConcurrency`，并入后删除或改写为专题：`440-ConcurrentProgramming`

## 三、SPLIT 候选：超大文档拆分（Top30）

| 位置 | 处置 |
| --- | --- |
| 019-redis/090-Stream | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 018-postgresql/210-VACUUMMechanism | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 013-kotlin/160-SealedClassSealedInterface | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 016-sql/420-Index | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 020-algorithm/290-NetworkFlow | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 018-postgresql/170-TransactionConcurrencyControl | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 023-cpp/420-Cpp20Coroutine | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 020-algorithm/190-SegmentTree | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 020-algorithm/150-StringAlgorithms | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 014-csharp/230-SpanMemory | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 023-cpp/170-CppCoreGuidelinesResourceManagement | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 020-algorithm/110-GraphAlgorithms | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 020-algorithm/300-LeetCodeInterviewGuide | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 023-cpp/390-TemplateMetaprogramming | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 014-csharp/310-AspNetCoreMiddlewarePipeline | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 020-algorithm/160-DynamicProgramming | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 032-python/590-Metaclass | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 013-kotlin/130-NullSafetyDetailed | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 032-python/900-ConfigManagement | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 020-algorithm/270-TopologicalSorting | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 023-cpp/090-RvalueReferenceMoveSemantics | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 012-java/420-JavaReflection | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 012-java/780-JavaNewFeatures | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 020-algorithm/030-SortAlgorithm | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 020-algorithm/220-BloomFilter | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 032-python/090-VariableConstant | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 007-javascript/340-ProxyReflectPractice | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 012-java/570-JavaVirtualThread | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |
| 013-kotlin/330-ChannelBroadcastChannel | 按主题拆为 2-4 篇；附录速查段移交 syntax/ 或改造为本章速查栏目 |

## 四、REWRITE 优先清单：零基础主线（批次顺序）

| 模块 | 文档 | 优先级 |
| --- | --- | --- |
| python | 020-PythonOverviewEnvSetup | P1 主线 |
| python | 050-ProgramStructureBasicSyntax | P1 主线 |
| python | 060-ControlFlow | P1 主线 |
| python | 070-BasicDataType | P1 主线 |
| python | 080-OperatorExpression | P1 主线 |
| python | 100-FunctionDetailed | P1 主线 |
| python | 130-ExceptionHandling | P1 主线 |
| python | 140-BuiltinDataStructure | P1 主线 |
| javascript | 030-ProgramStructureBasicSyntax | P1 主线 |
| javascript | 040-VariableDataType | P1 主线 |
| javascript | 050-DataTypeOperator | P1 主线 |
| javascript | 060-ControlFlow | P1 主线 |
| javascript | 070-ObjectArray | P1 主线 |
| javascript | 080-FunctionScopeClosure | P1 主线 |
| css | 010-WhatIsCSS | P1 主线 |
| git | 010-Git | P1 主线 |
| git | 020-GitInstallConfig | P1 主线 |
| git | 050-GitBasicOperation | P1 主线 |
| mysql | 050-MySQLOverviewDatabaseDesign | P1 主线 |
| mysql | 060-MySQLEnvSetup | P1 主线 |
| mysql | 100-DML | P1 主线 |
| mysql | 120-DQL | P1 主线 |
| cs-fundamentals | 010-ComputerOverview | P1 主线 |
| cs-fundamentals | 020-ProgrammingBasics | P1 主线 |
| software-testing | 020-TestConceptPrinciple | P1 主线 |
| software-testing | 030-TestLevels | P1 主线 |
| software-testing | 040-TestType | P1 主线 |

注：python/090-VariableConstant、javascript/020-JavaScriptOverviewRuntimeEnv、mysql/110-SQLDataOperationQuery、software-testing/010-TestBasicsMethod 四篇样板已于 2026-09-27 完成 REWRITE。

## 五、KEEP 默认

未列入以上四类的全部文档默认 KEEP，分两类：

1. 2026-09-18 之后人工重写批（约 140 篇，含 001-start 全部、mysql 入口四篇、javascript 520-540、各游戏模块等）：教学文体合格，保留；
2. 其余文档：暂按 KEEP 处理，随 Phase 6 各批次推进逐步复审；复审时按 content-quality-audit.md 的五类标准重新判定，不默认保留。

## 六、CREATE 清单（结构性新增）

- roadmap 模块：游戏开发就业路线（godot/gdscript/renpy/gode/konado 五模块串联）与 AI 协作开发环节；
- 每模块出口项目篇：需求写成编号 user stories + 可运行验收测试（Phase 6 各批次尾部追加）；
- nestjs：认证与 JWT 专篇；
- python：argon2 密码存储篇（补 350/370 的安全缺口）；
- start：与 html5/css 模块首篇的衔接确认（git/markdown 已有直接链接）。

