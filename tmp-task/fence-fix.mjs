/**
 * 围栏语义错误修复脚本（任务临时产物）
 *
 * 依据 tmp-task/fence-review.md 的人工逐条复核结论，对范围内 85 处
 * FENCE_PROSE 候选与 4 处 FENCE_NESTED 执行处置：
 *   unwrap-list   编号/列表步骤被包为代码块 -> 还原为 Markdown 列表
 *   unwrap-mixed  分组清单（组名 + 列表） -> 还原为 段落 + 列表
 *   checklist     [ ] 检查单 -> Markdown 任务列表
 *   annotate      内容合法但语言标注缺失/错误 -> 仅补语言标注
 *   custom        时间线转表格 / ASCII 图转 Mermaid -> 使用定制替换内容
 *   manual        嵌套断裂等复杂场景 -> 人工处理（脚本跳过并列出）
 *   keep          教学示例模板（```markdown 示例等）-> 不动
 *
 * 修复记录写入 tmp-task/fence-fixes.md（后续并入任务报告）。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');

/** 处置决策表：file -> [{ n: 正文行号(1-based, 与报告一致), action, lang?, custom? }] */
const DECISIONS = {
  '007-javascript/002-JavaScriptOverviewRuntimeEnv.md': [{ n: 2509, action: 'unwrap-list' }],
  '007-javascript/016-RecursionTailCallOptimization.md': [{ n: 2344, action: 'annotate', lang: 'text' }],
  '007-javascript/027-PromiseStaticMethod.md': [{ n: 291, action: 'unwrap-list' }],
  '007-javascript/032-CoroutinesInJavaScript.md': [{ n: 2121, action: 'unwrap-list' }],
  '007-javascript/061-RegexAssertions.md': [{ n: 205, action: 'annotate', lang: 'text' }],
  '007-javascript/062-JavaScriptTheory.md': [{ n: 1744, action: 'mermaid-flow' }],
  '008-typescript/055-TypeScriptCompilePerformanceOptimization.md': [{ n: 699, action: 'annotate', lang: 'text' }],
  '008-typescript/058-TypeGymnastics.md': [{ n: 21, action: 'table-timeline' }],
  '008-typescript/060-TsconfigStrictMode.md': [{ n: 34, action: 'table-timeline' }],
  '009-vue3/030-VueRouterNavigationGuard.md': [{ n: 454, action: 'unwrap-list' }],
  '009-vue3/035-Vue3TheoryKnowledge.md': [{ n: 20, action: 'manual' }],
  '010-react/012-FiberArchitecture.md': [{ n: 23, action: 'annotate', lang: 'text' }],
  '010-react/039-ReactCompilerAutoMemoization.md': [{ n: 219, action: 'mermaid-flow' }],
  '010-react/040-ServerClientComponents.md': [{ n: 168, action: 'mermaid-flow' }],
  '012-java/037-JavaAnnotationsTutorial.md': [
    { n: 1110, action: 'annotate', lang: 'properties' },
    { n: 1654, action: 'annotate', lang: 'properties' },
  ],
  '012-java/080-SpringBasicsIoCAOPBeanLifecycle.md': [{ n: 557, action: 'mermaid-flow' }],
  '012-java/088-JavaLogSystem.md': [{ n: 1690, action: 'unwrap-list' }],
  '012-java/093-JavaSecurity.md': [{ n: 102, action: 'mermaid-seq' }],
  '012-java/095-JavaDocker.md': [{ n: 1012, action: 'annotate', lang: 'text' }],
  '013-kotlin/014-NullSafetyDetailed.md': [
    { n: 138, action: 'table-timeline' },
    { n: 2239, action: 'keep' },
  ],
  '013-kotlin/050-InlineClass.md': [
    { n: 2159, action: 'unwrap-mixed' },
    { n: 2176, action: 'unwrap-list' },
  ],
  '014-csharp/012-CSharpTestEngineering.md': [
    { n: 1706, action: 'unwrap-mixed' },
    { n: 2188, action: 'annotate', lang: 'text' },
  ],
  '014-csharp/013-CSharpGameDevUnity.md': [
    { n: 43, action: 'custom', custom: 'unity-lifecycle' },
    { n: 320, action: 'manual' },
  ],
  '014-csharp/019-SpanMemory.md': [{ n: 3308, action: 'annotate', lang: 'bash' }],
  '014-csharp/022-CSharpBlazor.md': [
    { n: 2625, action: 'unwrap-mixed' },
    { n: 2691, action: 'checklist' },
    { n: 2750, action: 'checklist' },
    { n: 2784, action: 'checklist' },
    { n: 3019, action: 'annotate', lang: 'text' },
  ],
  '014-csharp/030-AsyncAwaitStateMachine.md': [{ n: 258, action: 'annotate', lang: 'text' }],
  '014-csharp/031-DelegateEventUnderlying.md': [
    { n: 519, action: 'annotate', lang: 'text' },
    { n: 544, action: 'annotate', lang: 'text' },
    { n: 842, action: 'annotate', lang: 'text' },
    { n: 2680, action: 'annotate', lang: 'text' },
  ],
  '014-csharp/032-ReflectionAndFeatureApplication.md': [
    { n: 318, action: 'annotate', lang: 'text' },
    { n: 334, action: 'annotate', lang: 'text' },
  ],
  '014-csharp/033-EFCoreMigrationOptimization.md': [
    { n: 307, action: 'unwrap-list' },
    { n: 472, action: 'annotate', lang: 'text' },
    { n: 2540, action: 'annotate', lang: 'text' },
  ],
  '014-csharp/038-RecordTypeImmutability.md': [{ n: 913, action: 'annotate', lang: 'text' }],
  '015-go/021-GoroutineSchedule.md': [{ n: 1155, action: 'annotate', lang: 'go' }, { n: 334, action: 'keep' }],
  '015-go/027-GoDocker.md': [{ n: 898, action: 'annotate', lang: 'text' }],
  '015-go/042-GoFileMonitor.md': [{ n: 187, action: 'mermaid-flow' }],
  '015-go/049-GoOAuth2.md': [{ n: 351, action: 'unwrap-list' }],
  '015-go/062-PackageManagementDetailed.md': [{ n: 569, action: 'annotate', lang: 'text' }],
  '022-c/005-VariableConstant.md': [{ n: 2218, action: 'annotate', lang: 'text' }, { n: 2402, action: 'annotate', lang: 'markdown' }],
  '022-c/010-MultiFileCompilation.md': [{ n: 826, action: 'annotate', lang: 'text' }],
  '022-c/043-MemoryAlignment.md': [{ n: 1488, action: 'annotate', lang: 'text' }],
  '022-c/046-PointerArrayDifference.md': [{ n: 1558, action: 'annotate', lang: 'text' }],
  '022-c/059-CValgrind.md': [{ n: 239, action: 'annotate', lang: 'text' }],
  '013-kotlin/049-SealedClassSealedInterface.md': [{ n: 188, action: 'table-timeline' }],
  '022-c/011-DynamicMemoryManagement.md': [
    { n: 617, action: 'mermaid-flow' },
    { n: 634, action: 'mermaid-flow' },
  ],
  '022-c/031-DynamicStaticLibrary.md': [{ n: 358, action: 'annotate', lang: 'text' }],
  '022-c/033-BuildSystem.md': [{ n: 888, action: 'custom', custom: 'cmake-keywords' }],
  '022-c/034-StaticAnalysisDebug.md': [{ n: 1149, action: 'annotate', lang: 'text' }],
  '023-cpp/025-NamespaceLinkage.md': [{ n: 2603, action: 'unwrap-mixed' }],
  '023-cpp/039-CppEmbedded.md': [{ n: 89, action: 'table-timeline' }],
  '023-cpp/041-CppCodeStyle.md': [{ n: 1305, action: 'keep' }],
  '023-cpp/061-Cpp20Concept.md': [{ n: 152, action: 'table-timeline' }],
  '023-cpp/067-CppProjectPractice.md': [{ n: 21, action: 'mermaid-class' }],
  '032-python/010-PythonVirtualEnv.md': [{ n: 1172, action: 'annotate', lang: 'text' }, { n: 1186, action: 'annotate', lang: 'text' }],
  '032-python/011-Metaclass.md': [{ n: 2236, action: 'annotate', lang: 'text' }],
  '032-python/020-PythonDocker.md': [{ n: 135, action: 'annotate', lang: 'text' }],
  '032-python/044-PythonPackagingEvolution.md': [
    { n: 34, action: 'annotate', lang: 'python' },
    { n: 1028, action: 'keep' },
    { n: 1633, action: 'annotate', lang: 'text' },
  ],
  '032-python/047-PythonCodeQuality.md': [{ n: 1633, action: 'checklist' }],
  '032-python/059-PackagePublish.md': [{ n: 844, action: 'annotate', lang: 'text' }],
  '035-astro/001-AstroOverview.md': [{ n: 161, action: 'annotate', lang: 'text' }],
  '035-astro/003-PagesRouting.md': [{ n: 65, action: 'keep' }],
  '035-astro/005-ContentCollections.md': [{ n: 105, action: 'keep' }],
  '036-vite/006-DevServerHMR.md': [{ n: 229, action: 'unwrap-list' }],
  '036-vite/007-BuildSplit.md': [{ n: 41, action: 'unwrap-list' }],
  '036-vite/009-Vite8Rolldown.md': [
    { n: 179, action: 'unwrap-list' },
    { n: 209, action: 'unwrap-list' },
    { n: 237, action: 'unwrap-mixed' },
  ],
};

// ---------- 定制替换内容 ----------
const CUSTOM = {
  // TypeScript 严格模式版本演进时间线 -> 表格
  'table-ts': `| 时间 | 版本 | 演进要点 |
| --- | --- | --- |
| 2014-10 | TS 1.0 | 最初发布，类型检查宽松 |
| 2015-07 | TS 1.5 | \`noImplicitAny\` 引入 |
| 2016-09 | TS 2.0 | \`strictNullChecks\` 引入（重大突破） |
| 2017-04 | TS 2.3 | \`strict\` 总开关引入，聚合 6 个子选项 |
| 2017-08 | TS 2.6 | \`strictFunctionTypes\` 引入（独立选项） |
| 2018-03 | TS 2.8 | \`strictBindCallApply\` 引入 |
| 2018-07 | TS 3.0 | \`unknown\` 类型引入，配合 \`strictNullChecks\` |
| 2019-08 | TS 3.5 | \`strictPropertyInitialization\` 引入 |
| 2020-08 | TS 4.0 | \`noImplicitAny\` 在 catch 子句的改进 |
| 2021-04 | TS 4.3 | \`useUnknownInCatchVariables\` 引入 |
| 2022-11 | TS 4.9 | \`satisfies\` 操作符，配合严格模式提升精度 |
| 2024-03 | TS 5.4 | \`NoInfer<T>\`，严格模式下的类型推断改进 |
| 2024-11 | TS 5.6 | 严格模式下迭代器与 Promise 的细化检查 |`,
  // Kotlin 空安全历史时间线 -> 表格
  'table-kotlin-null': `| 时间 | 里程碑 | 空安全演进 |
| --- | --- | --- |
| 1965 | ALGOL W | Tony Hoare 引入空引用（"十亿美元的错误"） |
| 1973 | ML | 引入 option 类型，函数式空安全开端 |
| 1990 | Haskell | Maybe monad，类型系统化空安全 |
| 2004 | Scala | \`Option[T]\`，函数式容器 |
| 2014 | Swift | \`Optional<T>\`，语法糖 \`T?\` |
| 2016 | Kotlin 1.0 | 空安全初版，\`T?\` /\`?.\` /\`?:\`/\`!!\`/\`as?\` |
| 2017 | Kotlin 1.1 | 实验性契约 API |
| 2018 | Kotlin 1.3 | 契约稳定，KMP 一致性 |
| 2020 | Kotlin 1.4 | \`@Nullable\` 注解标准化 |
| 2022 | Kotlin 1.7 | K2 预览，智能转换优化 |
| 2023 | Kotlin 1.9 | JSpecify 集成 |
| 2024 | Kotlin 2.0 | K2 GA，跨模块空安全检查 |`,
  // 嵌入式 C++ 时间线 -> 表格
  'table-cpp-embedded': `| 时间 | 里程碑 | 说明 |
| --- | --- | --- |
| 1972 | C 语言 | K&R C |
| 1985 | C++ 1.0 | Stroustrup |
| 1990s | 8 位 MCU + C 主导 | 8051, AVR, PIC |
| 1996 | EC++ Specification | 日本嵌入式协会 |
| 1998 | C++98 ISO/IEC 14882 | 标准化 |
| 2003 | MISRA C++:2008 | 汽车工业 |
| 2008 | AUTOSAR C++14 | 汽车软件联盟 |
| 2011 | C++11 | \`constexpr\` / \`atomic\` / \`noexcept\` |
| 2014 | C++14 | \`constexpr\` 增强 |
| 2017 | C++17 | \`constexpr if\` / \`std::byte\` |
| 2018 | Zephyr RTOS C++ 支持 | Linux Foundation |
| 2020 | C++20 | \`concept\` / \`consteval\` / \`coroutine\` |
| 2023 | MISRA C++:2023 | 基于 C++17/20 |
| 2023 | C++23 | \`std::expected\` / \`std::print\` |
| 2026 | C++26 草案 | \`constexpr\` 更多扩展 |`,
  // C++ 概念（Concepts）时间线 -> 表格
  'table-cpp-concept': `| 时间 | 里程碑 | 说明 |
| --- | --- | --- |
| 1988 | C++ 模板设计 | Stroustrup |
| 1994 | STL 由 HP 实现 | Stepanov & Lee |
| 1998 | C++98 标准化 | 模板正式纳入 |
| 2003 | SFINAE 原则形式化 | Vandevoorde |
| 2003 | Indiana 概念提案启动 | Gregor, Lumsdaine |
| 2008 | C++0x 草案 N2914 | 概念进入草案 |
| 2009 | Frankfurt 会议否决 | 概念地图过于复杂 |
| 2013 | Concepts Lite (N3580) | Stroustrup & Sutton |
| 2014 | GCC 6 实验性实现 | \`-fconcepts\` 选项 |
| 2017 | Jacksonville 进入 C++20 | ISO/IEC WG21 |
| 2018 | Rapperswil \`<concepts>\` 定稿 | Eric Niebler |
| 2019 | Ranges 完成标准化 | P0896 合入 |
| 2020 | C++20 发布 | ISO/IEC 14882:2020 |
| 2021 | 主流编译器完整支持 | GCC 10+, Clang 10+, MSVC 19.29+ |
| 2023 | C++23 小幅增强 | expected / flat_map |
| 2026 | C++26 草案 | 反射 + 概念协同 |`,
  // CMake 关键字传播规则 -> 段落 + cmake 代码块 + 列表
  'cmake-keywords': `假设 \`mylib\` 是一个库目标，\`myapp\` 链接 \`mylib\`：

\`\`\`cmake
target_link_libraries(mylib
    PUBLIC  core_lib      # core_lib 对 mylib 自身和 mylib 的使用者都可见
    PRIVATE utils_lib     # utils_lib 仅 mylib 内部使用，不传递给 myapp
    INTERFACE api_lib     # api_lib 仅传递给 myapp，mylib 自身不使用
)
\`\`\`

传播结果：

- \`mylib\` 编译时：使用 core_lib, utils_lib 的头文件
- \`mylib\` 链接时：链接 core_lib, utils_lib
- \`myapp\` 编译时：使用 core_lib, api_lib 的头文件（不含 utils_lib）
- \`myapp\` 链接时：链接 mylib, core_lib, api_lib（不含 utils_lib）`,
  // Unity 生命周期 -> 表格
  'unity-lifecycle': `| 阶段 | 回调 | 调用时机 |
| --- | --- | --- |
| 初始化 | \`Awake()\` | 脚本实例加载时调用（最早） |
| 初始化 | \`OnEnable()\` | 对象启用时调用 |
| 初始化 | \`Start()\` | 第一帧更新前调用（仅一次） |
| 物理 | \`FixedUpdate()\` | 固定时间间隔调用（物理计算） |
| 输入 | \`Update()\` | 每帧调用 |
| 后期处理 | \`LateUpdate()\` | 每帧在所有 \`Update\` 之后调用 |
| 场景渲染 | \`OnPreCull()\` / \`OnPreRender()\` / \`OnPostRender()\` | 依次在渲染前后调用 |
| 禁用与销毁 | \`OnDisable()\` / \`OnDestroy()\` | 对象禁用 / 销毁时调用 |`,
  // V8 多层执行流水线 -> Mermaid
  'mermaid-v8': `\`\`\`mermaid
flowchart TB
    SRC[JavaScript 源代码] --> Parser[Parser 解析器]
    Parser --> AST[AST 抽象语法树]
    AST --> Lazy[懒解析 Lazy Parsing]
    AST --> Ignition[Ignition 解释器<br/>字节码执行]
    Ignition -->|"热点代码"| Sparkplug[Sparkplug 基线编译器<br/>半优化机器码]
    Sparkplug -->|"进一步热点"| Maglev[Maglev 中层编译器<br/>较优化机器码]
    Maglev -->|"持续热点"| TurboFan[TurboFan 优化编译器<br/>高度优化机器码]
    TurboFan -->|"逆优化"| Ignition
\`\`\``,
  // React Compiler 编译流程 -> Mermaid
  'mermaid-react-compiler': `\`\`\`mermaid
flowchart TB
    A[1. 源代码<br/>TypeScript / JSX] --> B[2. Babel/SWC 解析为 AST]
    B --> C[3. 语义分析<br/>类型推导、作用域分析]
    C --> D[4. 纯函数检查<br/>Rules of React 验证]
    D --> E[5. 依赖图构建]
    E --> F[6. 记忆化策略决策]
    F --> G[7. 代码生成<br/>插入 useMemoCache]
    G --> H[8. Source Map 生成]
    H --> I[9. 输出优化后的代码]
\`\`\``,
  // RSC 渲染流程 -> Mermaid
  'mermaid-rsc': `\`\`\`mermaid
flowchart TB
    A[1. 请求到达服务端] --> B[2. 服务端渲染 Server Components<br/>可中断、可并行]
    B --> C[3. 序列化为 RSC Payload<br/>流式 JSON]
    C --> D[4. 流式传输到客户端<br/>HTTP streaming]
    D --> E[5. 客户端 React 解析 RSC Payload<br/>渲染 Client Components]
    E --> F[6. Hydration 完成<br/>页面可交互]
\`\`\``,
  // Spring MVC 请求处理流程 -> Mermaid
  'mermaid-spring-mvc': `\`\`\`mermaid
flowchart TB
    REQ[请求] --> DS[DispatcherServlet]
    DS --> HM[HandlerMapping.resolve<br/>找到 HandlerExecutionChain]
    HM --> Pre[HandlerInterceptor.preHandle<br/>前置拦截]
    Pre --> HA[HandlerAdapter.handle<br/>执行 Controller]
    HA --> CTRL[Controller 方法执行]
    CTRL --> RET[返回 ModelAndView<br/>或 @ResponseBody 对象]
    RET --> Post[HandlerInterceptor.postHandle<br/>后置拦截]
    Post --> VR[ViewResolver / MessageConverter<br/>渲染视图或序列化 JSON]
    VR --> AC[HandlerInterceptor.afterCompletion<br/>完成回调]
    AC --> RES[响应]
\`\`\``,
  // TLS 1.3 握手 -> Mermaid 时序图
  'mermaid-tls13': `\`\`\`mermaid
sequenceDiagram
    participant C as 客户端
    participant S as 服务端
    C->>S: ClientHello（key_share、supported_groups）
    S-->>C: ServerHello（key_share）
    S-->>C: EncryptedExtensions
    S-->>C: Certificate
    S-->>C: CertificateVerify
    S-->>C: Finished
    C->>S: Finished
    Note over C,S: 1-RTT 握手完成，进入应用数据阶段
    C->>S: Application Data
    S-->>C: Application Data
\`\`\``,
  // inotify_add_watch 系统调用流程 -> Mermaid
  'mermaid-inotify': `\`\`\`mermaid
flowchart TB
    U[用户态<br/>inotify_add_watch fd, path, mask] --> K[内核态<br/>sys_inotify_add_watch]
    K --> S1[1. 通过 fd 找到 inotify_group]
    S1 --> S2[2. 通过 path 解析 inode<br/>path_lookup]
    S2 --> S3[3. 创建 inotify_inode_mark<br/>若已存在则更新]
    S3 --> S4[4. 将 mark 添加到 inode 的 notification list]
    S4 --> S5[5. 返回 wd watch descriptor]
\`\`\``,
  // malloc 分配流程 -> Mermaid
  'mermaid-malloc': `\`\`\`mermaid
flowchart TB
    A["malloc(size)<br/>计算 chunk 大小（含 metadata、对齐）"] --> B{"size 在 fastbin 范围？"}
    B -->|是| C["查 fastbin，命中则返回"]
    B -->|否| D{"size 在 smallbin 范围？"}
    D -->|是| E["查 smallbin，命中则返回"]
    D -->|否| F[遍历 unsorted bin<br/>精确匹配则返回<br/>否则放入对应 small/large bin]
    F --> G[查 large bin<br/>best-fit]
    G --> H{"仍有空闲？"}
    H -->|是| R[返回 chunk]
    H -->|否| I[使用 top chunk]
    I --> J{"top chunk 不足？"}
    J -->|是| K[sysmalloc 向 OS 申请]
\`\`\``,
  // free 释放流程 -> Mermaid
  'mermaid-free': `\`\`\`mermaid
flowchart TB
    A["free(ptr)<br/>计算 chunk 大小"] --> B{"size 在 tcache 范围且未满？"}
    B -->|是| C[加入 tcache，返回]
    B -->|否| D{"size 在 fastbin 范围？"}
    D -->|是| E[加入 fastbin，返回]
    D -->|否| F[合并相邻空闲 chunk]
    F --> G[加入 unsorted bin]
    G --> H{"chunk 是顶 chunk？"}
    H -->|是| I["可能 trim 给 OS"]
    H -->|否| R[完成]
\`\`\``,
  // C++ 文件管理器类图 -> Mermaid
  'mermaid-filemanager': `\`\`\`mermaid
classDiagram
    class FileManager {
        -list_dir()
        -create_file()
        -delete_file()
        -move_file()
        -copy_file()
        -create_dir()
    }
    class CommandParser {
        -parse()
        -get_command()
    }
    class UI {
        -display()
        -get_input()
    }
    class ErrorHandler {
        -handle()
        -log_error()
    }
    CommandParser --> FileManager
    UI --> CommandParser
    UI --> ErrorHandler
\`\`\``,
};

// ---------- 定位与转换 ----------
function loadBody(file) {
  const raw = readFileSync('cnt-content/full/' + file, 'utf-8');
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return { raw, head: m ? m[0] : '', body: m ? raw.slice(m[0].length) : raw };
}
function blocks(body) {
  const lines = body.split(/\r?\n/);
  const out = [];
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const fm = lines[i].match(/^\s{0,3}(`{3,}|~{3,})\s*([^`\s].*)?$/);
    if (!open) {
      if (fm) open = { lang: (fm[2] || '').trim() || '', start: i, fence: fm[1][0], len: fm[1].length, lines: [] };
    } else {
      const isClose = fm && fm[1][0] === open.fence && fm[1].length >= open.len && !(fm[2] || '').trim();
      if (isClose) { out.push({ ...open, end: i }); open = null; }
      else open.lines.push(lines[i]);
    }
  }
  return { lines, out };
}

/** 列表还原转换 */
function toList(lines) {
  const out = [];
  let inList = false;
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { if (inList) { out.push(''); inList = false; } else out.push(''); continue; }
    const om = t.match(/^(\d+)[.、)]\s+(.*)$/);
    const bm = t.match(/^[-*]\s+(.*)$/);
    // 缩进延续行 -> 子列表
    if (!om && !bm && /^\s{2,}\S/.test(raw)) {
      out.push((inList ? '' : '') + '  - ' + t);
      continue;
    }
    if (om) { out.push(`${om[1]}. ${om[2]}`); inList = true; continue; }
    if (bm) { out.push(`- ${bm[1]}`); inList = true; continue; }
    // 编号延续（上一行是列表项且本行像说明）
    if (inList && !/^(?:\d+[.、)]|[-*])\s/.test(t)) { out.push(`  ${t}`); continue; }
    out.push(t); inList = false;
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** 分组清单还原：组名行转粗体段落，列表还原 */
function toMixed(lines) {
  const out = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { out.push(''); continue; }
    const group = t.match(/^(.{2,30}?)(?:[:：])$/);
    if (group && !/^[-*\d]/.test(t)) { out.push(''); out.push(`**${group[1]}**：`); continue; }
    out.push(raw.replace(/^(?:\s{2,})?[-*]\s+/, '- ').replace(/^(?:\s{2,})?(\d+)[.、)]\s+/, '$1. '));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** [ ] 检查单 -> 任务列表；组名转粗体 */
function toChecklist(lines) {
  const out = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { out.push(''); continue; }
    const item = t.match(/^\[([ xX])\]\s*(.*)$/);
    if (item) { out.push(`- [${item[1].toLowerCase() === 'x' ? 'x' : ' '}] ${item[2]}`); continue; }
    const bm = t.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (bm) { out.push(`- [${bm[1].toLowerCase() === 'x' ? 'x' : ' '}] ${bm[2]}`); continue; }
    const group = t.match(/^(.{2,30}?)(?:[:：])$/);
    if (group) { out.push(''); out.push(`**${group[1]}**：`); continue; }
    out.push(t);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** 时间线 -> 表格（行格式：`年份  主题  说明`） */
function timelineToTable(lines) {
  const rows = lines.map((l) => l.trim()).filter(Boolean).map((l) => l.split(/\s{2,}/).map((c) => c.trim()));
  const head = '| 时间 | 里程碑 | 说明 |\n| --- | --- | --- |';
  return head + '\n' + rows.map((r) => `| ${(r[0] || '').replace(/^ /, '')} | ${r[1] || ''} | ${r.slice(2).join(' ') || ''} |`).join('\n');
}

const fixes = [];
const unhandled = [];
for (const [file, entries] of Object.entries(DECISIONS)) {
  // 关键：按正文行号降序处理，避免前一处 splice 使后续行号失效
  const sorted = [...entries].sort((a, b) => b.n - a.n);
  for (const e of sorted) {
    const { raw, head, body } = loadBody(file);
    const { lines, out } = blocks(body);
    // 定位容差 ±2 行，规避扫描/重扫时的行号漂移；同一批处理内不消费已处理块
    const blk = out.find((b) => Math.abs(b.start - (e.n - 1)) <= 2);
    if (!blk) { unhandled.push({ file, n: e.n, reason: '未定位' }); continue; }
    if (e.action === 'manual' || e.action === 'keep') { unhandled.push({ file, n: e.n, reason: e.action }); continue; }
    let replacement;
    try {
      if (e.action === 'unwrap-list') replacement = toList(blk.lines);
      else if (e.action === 'unwrap-mixed') replacement = toMixed(blk.lines);
      else if (e.action === 'checklist') replacement = toChecklist(blk.lines);
      else if (e.action === 'table-timeline') replacement = timelineToTable(blk.lines);
      else if (e.action === 'annotate') {
        // 仅改围栏开头语言标注
        lines[blk.start] = lines[blk.start].replace(/^(\s{0,3}`{3,})\s*.*$/, `$1${e.lang}`);
        if (APPLY) writeFileSync('cnt-content/full/' + file, head + lines.join('\n'));
        fixes.push({ file, n: e.n, action: e.action, lang: e.lang });
        continue;
      } else if (e.action === 'custom') {
        const key = e.custom;
        if (key.startsWith('table-')) replacement = CUSTOM[key];
        else if (key.startsWith('mermaid-')) replacement = CUSTOM[key];
        else replacement = CUSTOM[key];
      } else if (e.action === 'mermaid-flow' || e.action === 'mermaid-seq' || e.action === 'mermaid-class') {
        // 按文件+行选择定制图
        const map = {
          '007-javascript/062-JavaScriptTheory.md': 'mermaid-v8',
          '010-react/039-ReactCompilerAutoMemoization.md': 'mermaid-react-compiler',
          '010-react/040-ServerClientComponents.md': 'mermaid-rsc',
          '012-java/080-SpringBasicsIoCAOPBeanLifecycle.md': 'mermaid-spring-mvc',
          '012-java/093-JavaSecurity.md': 'mermaid-tls13',
          '015-go/042-GoFileMonitor.md': 'mermaid-inotify',
          '022-c/011-DynamicMemoryManagement.md': e.n === 617 ? 'mermaid-malloc' : 'mermaid-free',
          '023-cpp/067-CppProjectPractice.md': 'mermaid-filemanager',
        };
        replacement = CUSTOM[map[file]];
      }
    } catch (err) { unhandled.push({ file, n: e.n, reason: '转换失败:' + err.message }); continue; }
    if (!replacement) { unhandled.push({ file, n: e.n, reason: '无替换内容' }); continue; }
    lines.splice(blk.start, blk.end - blk.start + 1, replacement);
    if (APPLY) writeFileSync('cnt-content/full/' + file, head + lines.join('\n'));
    fixes.push({ file, n: e.n, action: e.action, lines: blk.end - blk.start + 1 });
  }
}

// 未覆盖的候选（决策表未提到的）
const r = JSON.parse(readFileSync('./tmp-task/report.json', 'utf-8'));
const SCOPE = new RegExp('^\\d{3}-(java|kotlin|csharp|go|python|rust|c|cpp|javascript|typescript|vue3|react|nextjs|astro|nestjs|vite|deno|bun|svelte|angular|tailwind)/');
for (const issue of r.issues) {
  if (!SCOPE.test(issue.file)) continue;
  if (issue.type !== 'FENCE_PROSE' && issue.type !== 'FENCE_NESTED') continue;
  const n = issue.type === 'FENCE_PROSE' ? parseInt(issue.detail.match(/行(\d+)/)[1], 10) : 0;
  const covered = (DECISIONS[issue.file] || []).some((e) => e.n === n);
  if (!covered) unhandled.push({ file: issue.file, n, reason: issue.type + ' 无决策' });
}

writeFileSync('./tmp-task/fence-fixes.json', JSON.stringify({ fixes, unhandled }, null, 1));
if (APPLY) {
  const md = fixes.map((f) => `| ${f.file} | ${f.n} | ${f.action}${f.lang ? ' (' + f.lang + ')' : ''} |`).join('\n');
  writeFileSync('./tmp-task/fence-fixes.md', `# 围栏语义错误修复记录\n\n| 文件 | 正文行 | 处置 |\n| --- | --- | --- |\n${md}\n`);
}
console.log(`fixes=${fixes.length} unhandled=${unhandled.length}`);
for (const u of unhandled) console.log(`  [${u.reason}] ${u.file}:${u.n}`);
