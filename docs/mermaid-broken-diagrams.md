# 渲染失败的 mermaid 图清单（自动诊断，修复后删除本文件）

修复记录（2026-09-28）：以上 72 张已全部清零，当前渲染失败数为 0（`render-mermaid` 输出 light 70/70、dark 70/70）。实际修复 69 张损坏图（其中 1 张同源损坏在 150-AdvancedQueryMultiTableOperation.md 还有 7 处重复，一并修复；另含 310/340/590 三篇 6 处「JSON 代码块围栏缺失被吞入 mermaid 块」的结构修复）；040-StackAndQueue.md 与 060-ContainerOrchestration.md 的 3 条记录在当前内容中已无对应 mermaid 块（内容重写），无需修复。

共 72 张。修复方式：节点文本含 ()、'、{}、[] 等特殊字符时用双引号包住文本，如 A["resolve(x)"]；注释必须独占一行以 %% 开头。

## ..\cnt-content\full\007-javascript\260-PromiseConstructorDeepDive.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    A[resolve(x)] --> B{x === this?}
    B -- Yes --> R1[reject(TypeError)]
    B -- No --> C{x 是 Promise?}
    C -- Yes --> R2[采用 x 的状态]
    C -- No --> D{x 是对象/函数?}
    D -- No --> R3[fulfill(x)]
    D -- Yes --> E[try { then = x.then }]
    E -- 抛错 --> R4[reject(err)]
    E --> F{then 是函数?}
    F -- No --> R5[fulfill(x)]
    F -- Yes --> G[调用 then.call(x, resolveY, rejectY)]
    G --> H[resolveY(y) → 递归 resolve(y)]
    G --> I[rejectY(r) → reject(r)]
    G --> J[抛错 → reject(err)（若未调用 resolve/reject）]
```

## ..\cnt-content\full\007-javascript\260-PromiseConstructorDeepDive.md
reason: Parse error on line 11:
```mermaid
flowchart LR
    subgraph All[Promise.all]
        A1[p1] --> A2[fulfilled]
        A2 --> A3[[v1, v2, v3]]
    end
    subgraph Race[Promise.race]
        R1[p1] --> R2[第一个 settled → resolve/reject]
    end
    subgraph Settled[Promise.allSettled]
        S1[p1] --> S2[fulfilled → v1]
        S2 --> S3[[{v1}, {r2}, {v3}]]
    end
    subgraph Any[Promise.any]
        Y1[p1] --> Y2[第一个 fulfilled → resolve]
        Y2 --> Y3[全部 rejected → AggregateError]
    end
```

## ..\cnt-content\full\007-javascript\380-JavaScriptModular.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    A[require('lodash')] --> B{核心模块?}
    B -- 是 --> C[返回内置模块]
    B -- 否 --> D{相对路径?}
    D -- 是 --> E[查找文件]
    E --> E1[./math]
    E --> E2[./math.js]
    E --> E3[./math.json]
    E --> E4[./math.node]
    E --> E5[./math/index.js]
    E --> E6[./math/package.json main]
    D -- 否 --> F[node_modules 查找]
    F --> F1[/当前/node_modules/lodash]
    F --> F2[/父/node_modules/lodash]
    F --> F3[/祖父/node_modules/lodash]
    F --> F4[/node_modules/lodash]
```

## ..\cnt-content\full\008-typescript\310-TypeScriptTypeDeclarationModuleResolution.md
reason: Lexical error on line 12. Unrecognized text.
```mermaid
flowchart TD
    T0["@types/lodash/"]
    T1["package.json"]
    T2["index.d.ts"]
    T3["other-utils.d.ts"]
    T4["tsconfig.json  (DefinitelyTyped 配置)"]
    T0 --> T1
    T0 --> T2
    T0 --> T3
    T0 --> T4
jsonc
// @types/lodash/package.json
{
  "name": "@types/lodash",
  "version": "4.14.0",
  "description": "TypeScript definitions for lodash",
  "main": "index.d.ts",
  "types": "index.d.ts"
}
```

## ..\cnt-content\full\008-typescript\310-TypeScriptTypeDeclarationModuleResolution.md
reason: Parse error on line 16:
```mermaid
flowchart TD
    T0["my-lib/"]
    T1["src/"]
    T2["index.ts"]
    T3["utils.ts"]
    T4["tsconfig.json"]
    T5["tsup.config.ts          # 使用 tsup 构建双格式"]
    T6["package.json"]
    T7["README.md"]
    T0 --> T1
    T3 --> T4
    T3 --> T5
    T3 --> T6
    T3 --> T7
typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/utils.ts'],
  format: ['cjs', 'esm'],
  dts: true,                  // 生成 .d.ts
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
jsonc
// package.json
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.cjs"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "engines": {
    "node": ">=14"
  }
}
```

## ..\cnt-content\full\008-typescript\310-TypeScriptTypeDeclarationModuleResolution.md
reason: Parse error on line 25:
```mermaid
flowchart TD
    T0["monorepo/"]
    T1["packages/"]
    T2["shared/"]
    T3["src/"]
    T4["index.ts"]
    T5["tsconfig.json"]
    T6["package.json"]
    T7["web/"]
    T8["src/"]
    T9["tsconfig.json"]
    T10["package.json"]
    T11["api/"]
    T12["src/"]
    T13["tsconfig.json"]
    T14["package.json"]
    T15["tsconfig.base.json"]
    T16["tsconfig.json"]
    T17["package.json"]
    T0 --> T1
    T14 --> T15
    T14 --> T16
    T14 --> T17
jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
jsonc
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
jsonc
// packages/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@myorg/shared": ["../shared/src"],
      "@myorg/shared/*": ["../shared/src/*"]
    }
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["src"]
}
```

## ..\cnt-content\full\008-typescript\310-TypeScriptTypeDeclarationModuleResolution.md
reason: Parse error on line 16:
```mermaid
flowchart TD
    T0["project/"]
    T1["src/"]
    T2["types/"]
    T3["global.d.ts        # 全局声明"]
    T4["assets.d.ts        # 静态资源声明（*.css, *.png）"]
    T5["modules.d.ts       # 第三方模块声明"]
    T6["express.d.ts       # Express 扩展声明"]
    T7["tsconfig.json"]
    T8["package.json"]
    T0 --> T1
    T0 --> T2
    T6 --> T7
    T6 --> T8
jsonc
// tsconfig.json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./types"]
  },
  "include": ["src", "types"]
}
```

## ..\cnt-content\full\008-typescript\340-ModuleDeclarationGlobalAugmentation.md
reason: Parse error on line 22:
```mermaid
flowchart TD
    T0["src/"]
    T1["main/"]
    T2["types/"]
    T3["electron-main.d.ts    # 主进程全局声明"]
    T4["renderer/"]
    T5["types/"]
    T6["electron-renderer.d.ts"]
    T7["preload/"]
    T8["types/"]
    T9["electron-preload.d.ts"]
    T10["shared/"]
    T11["types/"]
    T12["ipc.d.ts              # 共享的 IPC 类型"]
    T0 --> T1
    T3 --> T4
    T6 --> T7
    T9 --> T10
    T10 --> T11
    T11 --> T12
json
// tsconfig.main.json
{
  "compilerOptions": {
    "types": ["node", "electron/main"],
    "lib": ["ES2022"]
  },
  "include": ["src/main/**/*", "src/shared/**/*"]
}

// tsconfig.renderer.json
{
  "compilerOptions": {
    "types": ["vite/client"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

## ..\cnt-content\full\008-typescript\590-TypeSafeEnvVar.md
reason: Parse error on line 16:
```mermaid
flowchart TD
    T0["packages/"]
    T1["shared-config/          # 共享配置包"]
    T2["src/"]
    T3["env.schema.ts   # 统一 Schema"]
    T4["index.ts"]
    T5["package.json"]
    T6["web-app/                # 前端应用"]
    T7["api-server/             # 后端服务"]
    T8["worker/                 # 后台任务"]
    T0 --> T1
    T5 --> T6
    T5 --> T7
    T5 --> T8
typescript
// packages/shared-config/src/env.schema.ts
import { z } from 'zod';

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const webEnvSchema = baseEnvSchema.extend({
  VITE_API_URL: z.string().url(),
});

export const apiEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;
```

## ..\cnt-content\full\008-typescript\590-TypeSafeEnvVar.md
reason: Parse error on line 10:
```mermaid
flowchart TD
    A[应用启动] --> B[读取环境变量]
    B --> C{Zod 校验}
    C -- 通过 --> D[继续启动]
    C -- 失败 --> E[输出详细错误]
    E --> E1[路径（变量名）]
    E --> E2[期望类型]
    E --> E3[实际值（脱敏）]
    E --> E4[修复建议]
    E --> E5[process.exit(1)]
    D --> F[加载配置对象]
    F --> G[注册全局单例]
```

## ..\cnt-content\full\012-java\520-CompletableFutureAsync.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    API[API 层（Controller）<br/>接收请求，返回 CompletableFuture&lt;Response&gt;] --> SVC[Service 层<br/>业务编排：thenCompose / thenCombine / allOf<br/>异常恢复：exceptionally / handle<br/>超时控制：orTimeout / completeOnTimeout]
    SVC --> CL[Client 层（HTTP / DB / Redis）<br/>异步调用：supplyAsync(阻塞调用, ioPool)<br/>重试机制：exceptionallyCompose]
    CL --> EX[Executor 层<br/>ioPool：IO 密集（200 线程）<br/>cpuPool：CPU 密集（N-1 线程）<br/>virtualThreadPool：JDK 21+ 虚拟线程]
```

## ..\cnt-content\full\012-java\610-JVMMemoryModel.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    MW[Mark Word（64 bits）]
    MW --> U[无锁：hash(25) / age(4) / 0 / 01]
    MW --> B[偏向锁：thread(54) / epoch(2) / 1 / 01]
    MW --> L[轻量锁：ptr_to_lock_record(62) / 00]
    MW --> H[重量锁：ptr_to_heavy_monitor(62) / 10]
    MW --> G[GC 标记：- / 11]
```

## ..\cnt-content\full\012-java\900-JavaLogSystem.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    Log[logger.info('msg')] --> Event[LoggingEvent 创建<br/>捕获时间戳、MDC 快照、调用者栈]
    Event --> Turbo[TurboFilter 链<br/>全局过滤器，性能敏感]
    Turbo --> Level[Level 判断<br/>与 Logger 有效级别比较]
    Level --> Loop[Appender 循环]
    Loop --> Console[ConsoleAppender]
    Console --> CEnc[Encoder<br/>PatternLayoutEncoder]
    CEnc --> COut[OutputStream<br/>System.out]
    Loop --> Rolling[RollingFileAppender]
    Rolling --> REnc[Encoder]
    REnc --> RBuf[BufferedOutputStream]
    RBuf --> RChan[FileChannel<br/>写磁盘]
    RChan --> RPol[RollingPolicy<br/>检查是否需要滚动]
    Loop --> Async[AsyncAppender]
    Async --> Queue[BlockingQueue&lt;Event&gt;]
    Queue --> Worker[Worker Thread]
    Worker --> Forward[转发给真实 Appender]
```

## ..\cnt-content\full\013-kotlin\300-FlowColdSharedState.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    UI[UI Layer Compose / View<br/>collectAsStateWithLifecycle()]
    VM[ViewModel / Presenter<br/>StateFlow&lt;UiState&gt;<br/>SharedFlow&lt;UiEvent&gt;]
    Dom[Domain / UseCase<br/>suspend fun / Flow&lt;T&gt;]
    Data[Data / Repository<br/>Flow&lt;T&gt; from DB / Network]
    UI --> VM --> Dom --> Data
```

## ..\cnt-content\full\015-go\050-GoDataStructure.md
reason: Parse error on line 8:
```mermaid
flowchart TD
    subgraph Header[SliceHeader]
        P[ptr 指针]
        L[len 长度]
        C[cap 容量]
    end
    subgraph Arr[底层数组]
        A0[10] A1[20] A2[30] A3[40] A4[50]
    end
    P --> A1
```

## ..\cnt-content\full\015-go\050-GoDataStructure.md
reason: Parse error on line 10:
```mermaid
flowchart TD
    H[hmap 结构]
    H --> F1[count int：元素数量]
    H --> F2[B uint8：桶数量 = 2^B]
    H --> F3[hash0 uint32：哈希种子]
    H --> F4[buckets unsafe.Pointer：桶数组]
    H --> F5[oldbuckets unsafe.Pointer：扩容时旧桶]
    H --> F6[...]
    B[bmap 桶，存储 8 个键值对]
    B --> T[tophash[0-7] 哈希高 8 位]
    B --> K[key0-key7]
    B --> V[val0-val7]
    B --> O[overflow pointer 溢出桶指针]
```

## ..\cnt-content\full\015-go\120-GoConcurrentProgramming.md
reason: Parse error on line 6:
```mermaid
flowchart TD
    G[G goroutine 协程，用户级轻量线程]
    M[M machine 操作系统线程]
    PP[P processor 逻辑处理器，持有本地运行队列]
    S[Scheduler]
    S --> P0[P0 [G G]]
    S --> P1[P1 [G G]]
    S --> P2[P2 [G G]]
    S --> P3[P3 [G G]]
    S --> GQ[全局队列 [G G G]]
    P0 --> M0[M0]
    P1 --> M1[M1]
    P2 --> M2[M2]
    P3 --> M3[M3]
```

## ..\cnt-content\full\015-go\150-ChannelPrinciple.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    A[chansend1(ch, v)] --> B[ch.lock.acquire()]
    B --> C{ch.closed == 1?}
    C -- Yes --> P1[panic: send on closed channel]
    C -- No --> D[sg := ch.recvq.dequeue]
    D --> E{sg != nil（有等待 recv）?}
    E -- Yes --> F[sendDirect(sg, v)]
    F --> G[goready(sg.g)]
    G --> H[ch.lock.release()]
    H --> I[return]
    E -- No --> J{ch.qcount < ch.dataqsiz?}
    J -- Yes（有缓冲空间） --> K[buf[sendx] = v]
    K --> L[sendx = (sendx+1) mod dataqsiz]
    L --> M[qcount++]
    M --> N[ch.lock.release()]
    N --> O[return]
    J -- No（buf 已满） --> Q[gopark(chanpark)]
    Q --> R[将 sudog 入 sendq]
    R --> S[ch.lock.release()]
```

## ..\cnt-content\full\015-go\150-ChannelPrinciple.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    A[chanrecv1(ch, &v)] --> B[ch.lock.acquire()]
    B --> D[sg := ch.sendq.dequeue]
    D --> E{sg != nil（有等待 send）?}
    E -- Yes --> F[recvDirect(sg, v)]
    F --> G[goready(sg.g)]
    G --> H[ch.lock.release()]
    H --> I[return true]
    E -- No --> J{ch.qcount > 0?}
    J -- Yes（buf 有数据） --> K[v = buf[recvx]]
    K --> L[recvx = (recvx+1) mod dataqsiz]
    L --> M[qcount--]
    M --> N[ch.lock.release()]
    N --> O[return true]
    J -- No（buf 空） --> Q{ch.closed?}
    Q -- Yes --> R[return zero, false]
    Q -- No --> S[gopark(chanpark)]
    S --> T[sudog 入 recvq]
    T --> U[ch.lock.release()]
```

## ..\cnt-content\full\015-go\260-MapPrinciple.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    B[bmap 内存布局]
    B --> T[tophash[8] 8 字节]
    B --> K[key[0] - key[7]]
    B --> V[value[0] - value[7]]
    B --> PD[padding 可选，确保 overflow 指针 8 字节对齐]
    B --> O[overflow *bmap 8 字节]
```

## ..\cnt-content\full\015-go\260-MapPrinciple.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    G0[group[0]]
    G0 --> C0[ctrl 8 字节]
    G0 --> S0[slot[0].key / slot[0].value]
    G0 --> S1[slot[1].key / slot[1].value]
    G0 --> S7[slot[7].key / slot[7].value]
    G1[group[1]]
    G0 --> G1
```

## ..\cnt-content\full\015-go\410-GoRegex.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    S[新 s] -->|ε| N1[N(r1)]
    N1 -->|ε| N2[N(r2)]
    N2 -->|ε| T[新 t]
```

## ..\cnt-content\full\015-go\410-GoRegex.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    S[新 s] -->|ε| N1[N(r1)]
    N1 -->|ε| T[新 t]
    S -->|ε| N2[N(r2)]
    N2 -->|ε| T
```

## ..\cnt-content\full\015-go\410-GoRegex.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    S[新 s] -->|ε| N[N(r)]
    N -->|ε| T[t]
    N -->|ε| S
    T -->|ε| N
```

## ..\cnt-content\full\015-go\410-GoRegex.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    S6[状态 6] -->|ε| N[b|c NFA]
    N -->|ε| S7[状态 7]
    N -->|ε| S6
    S7 -->|ε| N
```

## ..\cnt-content\full\015-go\490-GoOAuth2.md
reason: Lexical error on line 3. Unrecognized text.
```mermaid
flowchart TD
    C[Client] --> GW[Auth Gateway<br/>统一入口]
    GW --> GH[/auth/github → GitHub OAuth2]
    GW --> GO[/auth/google → Google OIDC]
    GW --> GA[/auth/apple → Apple Sign In]
    GW --> GS[/auth/saml → SAML IdP]
    GH --> JWT[Local JWT<br/>统一签发本地 JWT]
    GO --> JWT
    GA --> JWT
    GS --> JWT
```

## ..\cnt-content\full\017-mysql\130-SQLFunctionAndAdvancedQuery.md
reason: Parse error on line 3:
```mermaid
flowchart LR
    subgraph A[表A]
        A1[1] A2[2] A3[3] A4[4]
    end
    subgraph B[表B]
        B1[A] B2[B] B3[C]
    end
    A1 --- B1
    A2 --- B2
    A3 --- B3
```

## ..\cnt-content\full\017-mysql\140-MultiTableJoinDetailed.md
reason: Parse error on line 3:
```mermaid
flowchart LR
    subgraph A[表A]
        A1[1] A2[2]
    end
    subgraph B[表B]
        B1[A] B2[B] B3[C] B4[D]
    end
    A1 --- B1
    A2 --- B2
```

## ..\cnt-content\full\017-mysql\140-MultiTableJoinDetailed.md
reason: Parse error on line 3:
```mermaid
flowchart LR
    subgraph A[表A]
        A1[1] A2[2] A3[3]
    end
    subgraph B[表B]
        B1[A] B2[B] B3[C] B4[D]
    end
    A1 --- B1
    A2 --- B2
```

## ..\cnt-content\full\017-mysql\640-ReplicationHA.md
reason: Parse error on line 4:
```mermaid
flowchart TD
    subgraph CS[InnoDB ClusterSet]
        subgraph DC1[Primary Cluster DC1]
            P[P] S1[S]
        end
        subgraph DC2[Replica Cluster DC2]
            S2[S] S3[S]
        end
        DC1 -->|异步复制| DC2
    end
```

## ..\cnt-content\full\018-postgresql\260-ParallelQuery.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    B[Backend Leader<br/>用户连接进程]
    B -->|Gather / Gather Merge| W1[Worker 1]<br/>W2[Worker 2]<br/>W3[Worker 3 后台工作进程]
```

## ..\cnt-content\full\019-redis\200-ReplicationBuffer.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    B[repl_backlog 定长环形缓冲区<br/>[cmd1][cmd2][cmd3]...[cmdN]]
    B --> H[repl_backlog_histlen 有效数据起始]
    B --> I[repl_backlog_idx 写入位置]
```

## ..\cnt-content\full\019-redis\260-StringSDSStructure.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    L[len 1字节<br/>5] --> A[alloc 1字节<br/>10] --> F[flags 1字节<br/>s8] --> B[buf[] 11字节 alloc+1<br/>'Hello'] --> Z[\0 1字节<br/>0]
```

## ..\cnt-content\full\020-algorithm\030-SortAlgorithm.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    S[排序]
    S --> I[内部排序<br/>比较排序 Ω(n log n)<br/>插入类：插入/希尔<br/>交换类：冒泡/快排<br/>堆排选择类/归并归并类]
    S --> E[外部排序<br/>多路归并]
    S --> D[分布排序<br/>计数排序 O(n+k)/基数排序 O(d(n+k))/桶排序 O(n+k) 平均]
    S --> M[混合排序<br/>内省排序 Musser 1997/Timsort Peters 2002]
```

## ..\cnt-content\full\020-algorithm\030-SortAlgorithm.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    S[排序]
    S --> C[比较排序 Ω(n log n)<br/>插入类：插入/希尔<br/>交换类：冒泡/快排/堆排/归并]
    S --> N[非比较排序 O(n)<br/>计数/基数 LSD MSD/桶]
    S --> E[外部排序 O(n log n / M)<br/>多路归并/替换选择/Fibonacci/多步归并]
    S --> M[混合排序 工业级<br/>introsort Musser 1997 堆排+快排+插入排序<br/>Timsort Peters 2002 自然 run+二分插入+归并栈]
```

## ..\cnt-content\full\020-algorithm\040-StackAndQueue.md
reason: Parse error on line 3:
```mermaid
flowchart LR
    subgraph Stack[栈 LIFO push/pop]
        S1[5 top] S2[3] S3[1] S4[7 bottom]
    end
    subgraph Queue[队列 FIFO enqueue/dequeue]
        Q[7 | 1 | 3 | 5<br/>rear → front]
    end
```

## ..\cnt-content\full\020-algorithm\040-StackAndQueue.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    D[双端队列<br/>左端 addFirst/removeFirst/getFirst<br/>5 | 3 | 1 | 7 | 9<br/>右端 addLast/removeLast/getLast]
```

## ..\cnt-content\full\020-algorithm\050-SearchAlgorithm.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    S[搜索]
    S --> ST[静态查找 数组/链表<br/>线性 O(n)/二分 O(log n)/哈希 O(1)]
    S --> U[无信息搜索 状态空间图<br/>BFS O(V+E)/DFS O(V+E)/UCS O(E log V)/IDDFS O(b^d)]
    S --> I[有信息搜索 状态空间图+启发式<br/>A* O(b^d)/IDA* O(b^d)/贪婪 GBFS/WIDA*]
    S --> G[对抗搜索 博弈树<br/>Minimax O(b^d)/MCTS/Alpha-Beta O(b^(d/2))]
```

## ..\cnt-content\full\020-algorithm\050-SearchAlgorithm.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    S[搜索算法]
    S --> ST[静态查找 数组/链表<br/>线性 O(n)/二分 O(log n)/哈希 O(1)]
    S --> U[无信息搜索 状态空间图<br/>BFS O(V+E)/DFS O(V+E)/双向BFS O(b^(d/2))/IDDFS O(b^d) O(d)]
    S --> I[有信息搜索 状态空间图+启发式<br/>A* O(b^d)/IDA* O(b^d)/贪婪 GBFS/WIDA*]
    S --> G[对抗搜索 博弈树<br/>Minimax O(b^d)/MCTS/Alpha-Beta O(b^(d/2))]
```

## ..\cnt-content\full\020-algorithm\100-BalancedTreeAdvanced.md
reason: Parse error on line 11:
```mermaid
flowchart TD
    A[需要平衡搜索树?] --> B{数据规模与位置?}
    B -- 内存中小规模 --> C{修改频率?}
    C -- 查找远多于修改 --> D[AVL 树]
    C -- 修改频繁 --> E[红黑树]
    C -- 简单实现优先 --> F[Treap / AA 树]
    B -- 磁盘大规模 --> G{需要范围查询?}
    G -- 是 --> H[B+ 树]
    G -- 否 --> I[B 树]
    B -- 高并发 --> J{需要高并发?}
    J -- 是 --> K[B-link 树 (Lehman-Yao)]
    A -- 访问局部性强 --> L[Splay 树]
    A -- 教学用途 --> M{侧重?}
    M -- 工程实践 --> N[红黑树]
    M -- 概念清晰 --> O[2-3 树 / LLRB]
```

## ..\cnt-content\full\020-algorithm\120-DivideAndConquer.md
reason: Parse error on line 4:
```mermaid
flowchart TD
    D[分治算法]
    D --> S[排序分治<br/>归并排序 von Neumann 1945/快排 Hoare 1961]
    D --> A[代数分治<br/>Karatsuba 1963 O(n^1.585)/Strassen 1969 O(n^2.807)]
    D --> G[几何分治<br/>最近点对 1976/最大子数组 1976 O(n log n)]
    D --> F[信号分治<br/>FFT 1965 O(n log n)/数论变换 NTT]
```

## ..\cnt-content\full\020-algorithm\120-DivideAndConquer.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    P[分治三步范式 Divide-Conquer-Combine]
    P --> M[主定理分析 Bentley 1980<br/>情况1/2/3 T=Θ(n^logba)<br/>递归树归约]
    P --> A[代数恒等式优化<br/>Karatsuba O(n^1.585)/Strassen O(n^2.807)]
    P --> G[几何分治 Bentley-Shamos<br/>最近点对/最大子数组 O(n log n) 势能摊还]
    P --> F[信号分治 Cooley-Tukey<br/>FFT/IFFT O(n log n) 蝶形运算]
```

## ..\cnt-content\full\020-algorithm\130-GreedyAlgorithm.md
reason: Parse error on line 5:
```mermaid
flowchart TD
    G[贪心算法]
    G --> GT[图论贪心<br/>Kruskal 1956/Prim 1957]
    G --> C[编码压缩<br/>Huffman 1952/Shannon 1948]
    G --> S[调度问题<br/>活动选择/区间调度 O(n log n)]
    G --> K[背包问题<br/>分数背包/任务调度 O(n log n)]
```

## ..\cnt-content\full\020-algorithm\130-GreedyAlgorithm.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    G[贪心算法]
    G --> GT[图论贪心<br/>Kruskal 1956/Prim 1957 → MST<br/>Dijkstra 1959 O((V+E)logV) → Google Maps]
    G --> C[编码压缩<br/>Huffman 1952/Shannon 1948 → DEFLATE/JPEG]
    G --> S[调度问题<br/>活动选择 O(n log n)/区间调度 Dilworth]
    G --> K[背包问题<br/>分数背包/任务调度 SJF]
```

## ..\cnt-content\full\020-algorithm\170-BinarySearchAlgorithms.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    F[查找]
    F --> SEQ[顺序查找 O(n)<br/>哨兵优化 O(n)]
    F --> CMP[比较查找 O(log n)<br/>二分 O(log n)/插值 O(log log n)/斐波那契 O(log n)<br/>树形：BST O(log n) 平均、AVL O(log n) 最坏、红黑树 O(log n) 最坏、B树 O(log_d n)、跳表 O(log n) 期望]
    F --> NUM[数字查找 O(L)<br/>Trie 树/Radix Tree]
    F --> HASH[哈希查找 O(1) 平均<br/>链地址法/开放寻址 线性探针/二次探针/双重哈希]
```

## ..\cnt-content\full\020-algorithm\230-KmpStringMatching.md
reason: Parse error on line 18:
```mermaid
graph TD
    A[KMP 字符串匹配] --> B[历史动机]
    A --> C[形式化定义]
    A --> D[理论推导]
    A --> E[代码实现]
    A --> F[对比分析]
    A --> G[工程实践]
    B --> B1[Cook 1971 D2PDA]
    B --> B2[Morris 1970 独立发现]
    B --> B3[Pratt 1970 独立发现]
    B --> B4[Knuth 1970 复杂度证明]
    B --> B5[KMP 1977 SIAM J. Comp.]
    C --> C1[字符串匹配问题]
    C --> C2[PMT 部分匹配表]
    C --> C3[next 数组]
    C --> C4[KMP 自动机]
    D --> D1[next 递推关系]
    D --> D2[时间复杂度 O(n+m)]
    D --> D3[正确性证明 不变式]
    D --> D4[比较下界 2n-m]
    D --> D5[nextval 优化]
    E --> E1[Python 实现]
    E --> E2[C++ 生产级]
    E --> E3[Java Sedgewick 风格]
    E --> E4[KMP 自动机]
    E --> E5[最小循环节]
    F --> F1[KMP vs Boyer-Moore]
    F --> F2[KMP vs Rabin-Karp]
    F --> F3[KMP vs Aho-Corasick]
    F --> F4[KMP vs Suffix Array]
    G --> G1[Linux 内核 strstr]
    G --> G2[GNU grep 多模式]
    G --> G3[ESLint 规则匹配]
    G --> G4[BWA 基因组比对]
    G --> G5[Snort IDS 引擎]
```

## ..\cnt-content\full\020-algorithm\240-BitmaskDynamicProgramming.md
reason: Parse error on line 9:
```mermaid
graph TD
    A[bitmask DP 实现策略] --> B[记忆化递归]
    A --> C[自底向上迭代]
    A --> D[滚动数组]
    A --> E[子集枚举]
    A --> F[超集枚举]
    
    B --> B1[优势: 按需访问<br/>跳过不可达状态]
    B --> B2[劣势: 栈深度 O(n)<br/>Python 较慢]
    
    C --> C1[优势: 常数小<br/>易优化]
    C --> C2[劣势: 全量遍历<br/>不可达状态浪费]
    
    D --> D1[优势: 空间优化至 O(2^n)]
    D --> D2[劣势: 仅适用相邻层依赖]
    
    E --> E1[O(3^n) 总迭代]
    E --> E2[适用: 划分型问题]
    
    F --> F1[O(3^n) 总迭代]
    F --> F2[适用: SOS DP, 超集统计]
```

## ..\cnt-content\full\020-algorithm\260-KruskalAlgorithm.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    M[最小生成树 MST]
    M --> K[Kruskal 1956<br/>边排序贪心 O(E log E)<br/>稀疏图优/并查集]
    M --> P[Prim 1957<br/>点扩展贪心 O(V²)/O(E log V)<br/>稠密图优/优先队列]
    M --> B[Borůvka 1926<br/>分治合并 O(E log V)<br/>并行友好/分量合并]
    P --> J[Jarník 1930<br/>Prim 前身]
    P --> KKT[Karger-Klein-Tarjan 1995<br/>随机化线性 O(E) 期望]
```

## ..\cnt-content\full\020-algorithm\290-NetworkFlow.md
reason: Parse error on line 9:
```mermaid
flowchart TD
    Start([最大流问题]) --> Q1{是否需最小费用?}
    Q1 -->|是| MCMF[MCMF: SPFA 或 ZKW]
    Q1 -->|否| Q2{图规模?}
    Q2 -->|< 100 节点| Q3{需强多项式?}
    Q2 -->|≥ 100 节点| Q4{是否单位容量?}
    Q3 -->|否| FF[Ford-Fulkerson]
    Q3 -->|是| EK[Edmonds-Karp]
    Q4 -->|是| DinicUnit[Dinic O(E√V)]
    Q4 -->|否| Q5{需最优常数?}
    Q5 -->|是| HLPP[Push-Relabel HLPP]
    Q5 -->|否| DinicStd[Dinic 标准实现]
```

## ..\cnt-content\full\021-cs-fundamentals\020-ProgrammingBasics.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    A([开始]) --> B[输入 N]
    B --> C[sum = 0]<br/>D[i = 1]
    C --> E{i <= N?}
    E -- 否 --> F[输出 sum] --> G([结束])
    E -- 是 --> H[sum = sum + i]<br/>I[i = i + 1]
    H --> E
```

## ..\cnt-content\full\021-cs-fundamentals\030-FunctionModular.md
reason: Parse error on line 3:
```mermaid
flowchart LR
    subgraph Before[调用前]
        BA[a → [10]]
    end
    subgraph Call[调用时 值传递]
        CA[a → [10]]
        X[x → [10] 复制了一份]
    end
    subgraph After[修改后]
        AA[a → [10] 不变]
        AX[x → [100] 变了]
    end
```

## ..\cnt-content\full\021-cs-fundamentals\030-FunctionModular.md
reason: Parse error on line 3:
```mermaid
flowchart LR
    subgraph Before[调用前]
        BA[a → [3]]
        BB[b → [5]]
    end
    subgraph After[修改后 指针传递]
        AA[pa → a → [5]]
        AB[pb → b → [3]]
    end
```

## ..\cnt-content\full\021-cs-fundamentals\080-ComputerArchitectureBasics.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    subgraph Mem[存储器]<br/>指令1 指令2 指令3 数据1 数据2
    end
    Mem -->|取指令| C[控制器<br/>指令寄存器/程序计数器]
    Mem -->|读/写数据| A[运算器<br/>累加器/ALU]
```

## ..\cnt-content\full\021-cs-fundamentals\600-MultimediaTechnology.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    I[I] B1[B] B2[B] P1[P] B3[B] B4[B] P2[P] B5[B] B6[B] I2[I]
    I --- B1 --- B2 --- P1 --- B3 --- B4 --- P2 --- B5 --- B6 --- I2
```

## ..\cnt-content\full\022-c\160-DoublePointerPointerArray.md
reason: Parse error on line 3:
```mermaid
flowchart LR
    A[0x1000 a=1 0x1004 b=2 0x1008 c=3 0x100c d=4 0x1010 e=5]
    ARR[arr[0] 0x2000→a<br/>arr[1] 0x2008→b<br/>arr[2] 0x2010→c<br/>arr[3] 0x2018→d<br/>arr[4] 0x2020→e]
    A --- ARR
```

## ..\cnt-content\full\022-c\160-DoublePointerPointerArray.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    A[0x1000 arr[0]=1 0x1004 arr[1]=2 0x1008 arr[2]=3 0x100c arr[3]=4 0x1010 arr[4]=5]
    P[ptr 0x2000 → 指向整个 arr 数组]
    P --- A
```

## ..\cnt-content\full\022-c\160-DoublePointerPointerArray.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    AV[argv] --> A0[[0] → ./program]<br/>A1[[1] → hello]<br/>A2[[2] → world]<br/>A3[[3] → NULL]
```

## ..\cnt-content\full\022-c\160-DoublePointerPointerArray.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    A[0x1000 arr[0]=1 0x1004 arr[1]=2 0x1008 arr[2]=3 0x100c arr[3]=4 0x1010 arr[4]=5]
    P[ptr 0x2000 → 0x1000 指向整个 arr 数组]
    P --- A
```

## ..\cnt-content\full\023-cpp\170-CppCoreGuidelinesResourceManagement.md
reason: Parse error on line 8:
```mermaid
flowchart TB
    accTitle: Stack Unwinding Mechanism Flow
    accDescr: Flowchart showing how C++ stack unwinding walks through call frames calling destructors when an exception is thrown until a matching catch is found.

    start([异常抛出点]) --> check1{当前栈帧 F_k<br/>是否有匹配 catch?}
    check1 -->|否| destruct1[按声明逆序<br/>调用 F_k 已构造对象的析构]
    destruct1 --> pop1[弹出 F_k 栈帧]
    pop1 --> move1[回溯至调用者 F_{k-1}]
    move1 --> check2{F_{k-1} 是否有匹配 catch?}
    check2 -->|否| destruct2[按声明逆序<br/>调用 F_{k-1} 已构造对象的析构]
    destruct2 --> pop2[弹出 F_{k-1} 栈帧]
    pop2 --> move2[回溯至调用者 F_{k-2}]
    move2 --> checkN{F_0 是否有匹配 catch?}
    checkN -->|是| handler[进入 catch 块<br/>执行异常处理]
    checkN -->|否| terminate[调用 std::terminate<br/>程序终止]
    handler --> continue([继续执行 catch 后续代码])

    style start fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    style terminate fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    style handler fill:#dcfce7,stroke:#16a34a,color:#14532d
    style continue fill:#dcfce7,stroke:#16a34a,color:#14532d
    style destruct1 fill:#fef9c3,stroke:#ca8a04,color:#713f12
    style destruct2 fill:#fef9c3,stroke:#ca8a04,color:#713f12
    style pop1 fill:#e0e7ff,stroke:#4f46e5,color:#312e81
    style pop2 fill:#e0e7ff,stroke:#4f46e5,color:#312e81
```

## ..\cnt-content\full\024-devops\080-Kubernetes.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    subgraph CP[Control Plane]
        API[API Server] SCH[Scheduler] CM[Controller Manager]
        ETCD[etcd 集群状态存储]
    end
    N1[Node 1<br/>kubelet Proxy Pods]
    N2[Node 2<br/>kubelet Proxy Pods]
    N3[Node 3<br/>kubelet Proxy Pods]
    NN[Node N<br/>kubelet Proxy Pods]
    CP --> N1
    CP --> N2
    CP --> N3
    CP --> NN
```

## ..\cnt-content\full\025-networking\170-WirelessNetwork.md
reason: Parse error on line 2:
```mermaid
flowchart LR
    AP["瘦 AP"] <..>|"CAPWAP 控制隧道 UDP 5246（配置/管理）"| AC["AC 无线控制器"]
    AP <-.->|"CAPWAP 数据隧道 UDP 5247"| AC
    AC --- CORE["核心交换机"]
    STA["无线终端"] --- AP
```

## ..\cnt-content\full\025-networking\180-NetworkDesignPlanning.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    S1[Spine1] S2[Spine2] S3[Spine3]
    L1[Leaf1] L2[Leaf2] L3[Leaf3] L4[Leaf4]
    SRV[服务器 服务器 服务器 服务器]
    S1 --- L1
    S1 --- L2
    S1 --- L3
    S1 --- L4
    S2 --- L1
    S2 --- L2
    S2 --- L3
    S2 --- L4
    S3 --- L1
    S3 --- L2
    S3 --- L3
    S3 --- L4
    L1 --> SRV
    L2 --> SRV
    L3 --> SRV
    L4 --> SRV
```

## ..\cnt-content\full\026-cybersecurity\580-BinarySecurityAndIncidentResponse.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    C[Chunk 结构<br/>prev_size 前一个 chunk 大小<br/>size | A|M|P 本 chunk 大小+标志位<br/>fd 前向指针 空闲时有效<br/>bk 后向指针 空闲时有效<br/>数据区]
```

## ..\cnt-content\full\027-cloud-computing\050-VirtualizationTech.md
reason: Lexical error on line 5. Unrecognized text.
```mermaid
flowchart TD
    subgraph User[User Space]
        Q1[QEMU vCPU0]
        Q2[QEMU vCPU1]
        KIO[/dev/kvm ioctl]
    end
    subgraph Kernel[Kernel Space]
        KM[KVM Kernel Module<br/>vCPU Thread / MMU EPT]
    end
    HW[Physical Hardware<br/>Intel VT-x / AMD-V + EPT/RVI]
    Q1 --> KIO
    Q2 --> KIO
    KIO --> KM
    KM --> HW
```

## ..\cnt-content\full\027-cloud-computing\060-ContainerOrchestration.md
reason: Parse error on line 5:
```mermaid
flowchart TD
    subgraph Cluster[Kubernetes Cluster]
        CP[Control Plane<br/>API Server / etcd / Scheduler / Controller Mgr]
        subgraph N1[Node 1]
            P1[Pod A] P2[Pod B]
            K1[kubelet kube-proxy]
        end
        subgraph N2[Node 2]
            P3[Pod C] P4[Pod D]
            K2[kubelet kube-proxy]
        end
        subgraph N3[Node 3]
            P5[Pod E] P6[Pod F]
            K3[kubelet kube-proxy]
        end
        CP --- N1
        CP --- N2
        CP --- N3
    end
```

## ..\cnt-content\full\027-cloud-computing\100-MicroserviceArchitecture.md
reason: Parse error on line 3:
```mermaid
flowchart TD
    subgraph O[订单上下文]
        OS[OrderService] OD[OrderDB]
    end
    subgraph I[库存上下文]
        IS[InventorySvc] ID[InventoryDB]
    end
    subgraph P[支付上下文]
        PS[PaymentService] PD[PaymentDB]
    end
```

## ..\cnt-content\full\027-cloud-computing\190-CloudArchitectureDesign.md
reason: Parse error on line 5:
```mermaid
flowchart TD
    GLB[全球负载均衡 DNS/CDN]
    subgraph RA[区域 A]
        ALB1[ALB 多 AZ]
        AZ1[AZ1] AZ2[AZ2] AZ3[AZ3]
        DB1[数据库主]
    end
    subgraph RB[区域 B]
        ALB2[ALB 多 AZ]
        BZ1[AZ1] BZ2[AZ2] BZ3[AZ3]
        DB2[数据库从]
    end
    GLB --> ALB1
    GLB --> ALB2
```

## ..\cnt-content\full\027-cloud-computing\200-CloudDatabaseService.md
reason: Parse error on line 9:
```mermaid
flowchart TD
    subgraph Aurora[Aurora 架构]
        subgraph Compute[计算层]
            W[Writer Instance]
            R1[Reader 1 Instance]
            R2[Reader 2 Instance]
        end
        subgraph Storage[Aurora Storage 6 副本/3 AZ]
            P1[P1 AZ-A] P2[P2 AZ-A] P3[P3 AZ-B] P4[P4 AZ-B] P5[P5 AZ-C] P6[P6 AZ-C]
        end
        W --> Storage
        R1 --> Storage
        R2 --> Storage
    end
```

## ..\cnt-content\full\027-cloud-computing\220-CloudNetworkService.md
reason: Parse error on line 5:
```mermaid
flowchart TD
    R1[IF Host = api.example.com AND Path = /users/* → Forward to user-service]
    R2[IF Host = api.example.com AND Path = /orders/* → Forward to order-service]
    R3[IF Path = /static/* → Redirect to CDN]
    R4[IF Header[X-Canary] = true → Forward to canary-service 10%]
```

## ..\cnt-content\full\027-cloud-computing\240-CloudCostOptimization.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    OD[按需实例 N 个<br/>核心容量，保证基线] + SP[Spot 实例 M 个<br/>弹性容量，可被中断]
    OD --> T[总容量 = N + M<br/>保证容量 ≥ N]
    SP --> T
```

## ..\cnt-content\full\028-software-testing\350-DesignPatternDetailed.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    S[Subject<br/>attach(observer)<br/>detach(observer)<br/>notify()]
    S -->|Observer.update()| O1[ConcreteObserver1]
    S -->|Observer.update()| O2[ConcreteObserver2]
```

## ..\cnt-content\full\028-software-testing\410-EventDrivenArchitecture.md
reason: Parse error on line 2:
```mermaid
flowchart TD
    E[事件流]<br/>1 AccountCreated {id: A1}<br/>2 MoneyDeposited {amt: 500}<br/>3 MoneyDeposited {amt: 300}<br/>4 MoneyWithdrawn {amt: 100}
```
