---
order: 610
title: TypeScript 毕业项目：类型安全的 API 客户端库
description: TypeScript 模块出口项目：从需求清单出发做一个类型安全的 API 客户端库——fetch 封装与泛型请求函数、端点类型映射表、unknown 收窄衔接运行时校验、判别式联合错误模型、Equal/Expect 类型测试、vitest 单元测试与 tsc 声明文件构建发布。只给需求、验收断言与提示，不给答案代码。
module: 'typescript'
category: 前端技术
difficulty: advanced
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/070-TSBasicsGenerics'
  - 'typescript/430-ConditionalTypeDistribute'
  - 'typescript/450-InferTypeDeepDive'
  - 'typescript/540-TypeGymnastics'
  - 'typescript/550-TypeTestingAndAssertions'
  - 'typescript/660-RuntimeSchemaValidation'
  - 'javascript/715-JavaScriptCapstoneProject'
prerequisites:
  - 'typescript/690-TypeScriptProjectExampleTypeSafeAPIClient'
  - 'typescript/550-TypeTestingAndAssertions'
  - 'typescript/360-TsconfigStrictMode'
---

## 前置知识

- 已完成 [泛型基础](/typescript/070-TSBasicsGenerics) 与 [类型测试与断言](/typescript/550-TypeTestingAndAssertions)：会写带约束的泛型函数与类型断言；
- 已完成（至少通读）[项目示例：类型安全的 API 客户端](/typescript/690-TypeScriptProjectExampleTypeSafeAPIClient)。690 篇是「跟着做」的示例，本文是「毕业验收」：只给需求、断言与提示，不给答案代码；

与 JavaScript 毕业项目的分工：[715 篇](/javascript/715-JavaScriptCapstoneProject) 是 **DOM 项目毕业**，考事件、存储与渲染安全；本篇是 **类型层工程毕业**，考类型设计、运行时防线与「库」的构建发布。这是 typescript 模块的出口项目（Level 7）。

## 背景与目标

690 篇的示例是照着成品读的：端点表为什么这样设计、脏数据从哪进来、类型错了谁来抓，都没经过你的手。本项目要你从需求清单出发，**把 fetch 包成一个「端点即类型」的客户端库**：调用方写出端点名，参数与响应类型全由映射表推导；类型错误活不过编译期，脏数据进不了调用方，发布后别人 import 就有完整类型提示。它也是类型能力的闭环考场：泛型（070、220、230）编码端点与类型的对应，条件类型三连（430-450）支撑推导，类型体操与类型测试（530、540、550）证明推导没有骗人。

约束：零运行时依赖（选做 E2 的 zod 除外）；数据源用真实公开 API（推荐 JSONPlaceholder）；端点表内容、命名与错误分类粒度自己定——这是你的自由度。预计 2 天。

## User stories（必做 10 条）

每条都是可检查断言。「编译期拦截」的统一验收：错误用法写进专用示例文件，`npx tsc --noEmit` 必须失败，删掉后必须通过。

- **T1** fetch 封装：统一处理 baseUrl、JSON 序列化与状态检查；改成必然 404 的路径，得到你的类型化错误而不是被忽略的 Response。
- **T2** 泛型请求函数：手动标注响应类型后返回 `Promise<该类型>`；把响应当不相关的类型用，tsc --noEmit 失败——响应类型错误在编译期被拦截。
- **T3** 端点映射表：全部端点集中在一个 as const 映射表里（方法、路径、参数、响应的对应）；新增端点只改映射表一处，不改请求函数即可调用。
- **T4** 参数类型化：参数类型完全从映射表推导，签名里没有手写参数接口；漏传、多传未知字段、number 传成 string，三种写法都编译失败。
- **T5** 运行时防线：解析出口是 unknown 而非 any，用类型谓词或最小校验收窄；mock 缺字段响应，运行时收到带类别的校验错误，脏数据到不了调用方。
- **T6** 错误模型：失败至少分网络、HTTP、校验三类，判别式联合建模；调用方写全覆盖 switch、兜底落到 never；注释掉任一分支，tsc --noEmit 报错。
- **T7** 类型测试：Equal/Expect 锁住映射表推导出的参数与响应类型；改坏一个端点的响应类型，tsc --noEmit 在类型测试文件报错；@ts-expect-error 锁住至少一处非法调用。
- **T8** 单元测试：vitest mock 全局 fetch，覆盖快乐路径与三类错误路径；`npx vitest run` 全绿，断网重跑仍绿。
- **T9** 构建配置：tsc 严格模式构建，.d.ts 由 declaration 生成而非手写；产物无测试文件；全仓库 `npx tsc --noEmit` 零错误。
- **T10** 发布就绪：package.json 写清 types 与 exports，README 含「是什么、三行跑通、错误怎么处理」；独立空项目 file: 引入，import 后 IDE 悬停出完整类型，写一行类型错误 tsc --noEmit 失败。

## Extra credit（选做 4 条）

- **E1** 拦截器：请求拦截器注入认证头；响应拦截器可转换数据，类型跟随转换结果。
- **E2** schema 单源：响应类型由 zod 的 z.infer 推导，映射表不再手写；某字段 number 改 string，只改 schema 一处，类型与校验同时生效（660 篇第 3 节）。
- **E3** 路径字面量推导：模板字面量类型从 `"/users/:id"` 提取参数名，参数对象的键自动推导；新增路径参数类型自动跟上（500 篇）。
- **E4** 发布与 CI：发布到 npm 或本地 Verdaccio；CI 推送时跑 tsc --noEmit 与 vitest；他人干净环境按 README 三行内跑通。

## 里程碑拆解（4 步）

### 里程碑 1：数据契约层——端点即类型（对应 T1 到 T4）

先读：[泛型基础](/typescript/070-TSBasicsGenerics) 第 2、5 节；[keyof、typeof 与索引访问类型](/typescript/210-KeyofTypeofIndexedAccessTypes)。

方向：别先写请求函数，先把端点映射表定下来——全库单一事实来源，也是第一处「自己决定」。再依次做封装、泛型化、映射表推导接线（T1 到 T4）。推导卡住回看 [430 分发](/typescript/430-ConditionalTypeDistribute) 与 [450 infer](/typescript/450-InferTypeDeepDive)。

完成后应看到：

```bash
npx tsc --noEmit
```

零错误；示例文件里传错参数、用错响应类型，同一命令立刻报错。

### 里程碑 2：运行时防线——unknown 进，具体类型出（对应 T5、T6）

先读：[150 类型守卫](/typescript/150-TypeGuardCustomGuard) 的 unknown 与 any 一节；[190 never 语义](/typescript/190-NeverTypeSemantics) 的穷尽检查部分；[660 Schema 校验](/typescript/660-RuntimeSchemaValidation) 第 1、2 节（第 3 节留到 E2）。

方向：泛型签名只说服了编译器，`res.json()` 给你的仍是 any。解析出口改成 unknown 再收窄；三类错误建成判别式联合，用 switch 验证穷尽。

完成后应看到：脏响应被运行时拦下，错误带类别字段；注释掉 switch 一个分支，tsc --noEmit 在兜底的 never 处报错。

### 里程碑 3：双测试防线——类型层与值层（对应 T7、T8）

先读：[550 类型测试](/typescript/550-TypeTestingAndAssertions)；[540 深水区](/typescript/540-TypeGymnastics) 第 8 节；推导不顺时回看 [530 实用模式](/typescript/530-TypeGymnasticsPracticalPatterns) 与 [460 条件与映射](/typescript/460-ConditionalMappedType)。

方向：先写类型测试锁契约，再写 vitest 单测锁行为，顺序别反——类型测试先红过一次，你才知道它真能抓错。单测 mock fetch，别碰真网。

完成后应看到：

```bash
npx vitest run
```

全绿且断网重跑仍绿；改坏映射表一个响应类型，tsc --noEmit 当场报错。

### 里程碑 4：构建与发布——让库能被别人装（对应 T9、T10 与 Extra credit）

先读：[350 工程化配置](/typescript/350-TypeScriptEngineeringConfig) 的 declaration、outDir 部分；[370 tsc 速查](/typescript/370-TscCompilerCommands)。

方向：tsconfig 区分「构建产物」与「全量检查」两套入口（两份配置或 exclude）；补 package.json 的 types 与 exports；README 收尾。选做按各自断言自验。

完成后应看到：dist 里 .js 与 .d.ts 成对出现且无测试文件；空项目 file: 引入后 IDE 悬停出完整类型，写一行类型错误 tsc --noEmit 失败。库的验收标准是别人用得顺手。

## 提示区

按功能点查关键词与出处：

| 功能 | 关键词 | 对应文档 |
| --- | --- | --- |
| 请求函数与端点表 | 泛型、extends、as const、typeof、keyof | [泛型基础](/typescript/070-TSBasicsGenerics)、[约束与默认值](/typescript/230-GenericConstraintDefault)、[as const](/typescript/170-ConstAssertion)、[keyof 与 typeof](/typescript/210-KeyofTypeofIndexedAccessTypes) |
| 映射与推导 | 映射类型、分发、infer、模板字面量 | [条件与映射](/typescript/460-ConditionalMappedType)、[430 分发](/typescript/430-ConditionalTypeDistribute)、[440 infer](/typescript/440-ConditionalTypeInfer)、[450 深入](/typescript/450-InferTypeDeepDive)、[500 模板字面量](/typescript/500-TemplateLiteralType) |
| unknown 收窄 | 类型谓词、unknown 与 any | [类型守卫](/typescript/150-TypeGuardCustomGuard) |
| 错误建模 | 判别式联合、never 穷尽检查 | [字面量与联合](/typescript/110-LiteralUnionTypes)、[never 语义](/typescript/190-NeverTypeSemantics) |
| 类型测试 | Equal/Expect、@ts-expect-error、可维护性三问 | [类型测试](/typescript/550-TypeTestingAndAssertions)、[深水区](/typescript/540-TypeGymnastics) 第 3、7、8 节 |
| 运行时校验 | zod、z.infer 单源（E2） | [Schema 校验](/typescript/660-RuntimeSchemaValidation) |
| 构建与声明 | declaration、exports、tsc --noEmit | [工程化配置](/typescript/350-TypeScriptEngineeringConfig)、[tsc 速查](/typescript/370-TscCompilerCommands)、[声明文件](/typescript/300-DeclarationFileWriting) |

常见坑：

- **as 是防线上的门**：`res.json()` 返回 any，一句 `as T` 就让类型系统对整个响应闭嘴。每个 as 都要能说清「为什么安全」，只许出现在「已验证之后」的出口处；
- **unknown 与 any 的纪律**：边界进来的一律 unknown——any 顺着调用链传染并关掉一切检查，库的公共出口不允许 any；
- **类型测试缺失等于裸奔**：推导错不会有报错，错类型传到调用方才炸。540 篇里函数属性退化成空对象是范本，Equal 断言钉死推导必须等于什么；

## 验收清单

- [ ] T1 统一封装与状态检查，非 2xx 得到类型化错误
- [ ] T2 泛型请求函数，错误响应类型编译期被拦截
- [ ] T3 端点全集中映射表，新增端点不改请求函数
- [ ] T4 参数全由映射表推导，漏传、多传、错型编译失败
- [ ] T5 出口是 unknown，收窄在岗，脏数据被运行时拦下
- [ ] T6 三类错误判别式联合，switch 穷尽检查在岗
- [ ] T7 Equal/Expect 与 @ts-expect-error 锁住推导契约
- [ ] T8 vitest 全绿且不发真实请求
- [ ] T9 严格模式零错误，.d.ts 自动生成，产物无测试文件
- [ ] T10 消费项目引入后类型提示完整，错误用法编译失败
- [ ] E1 拦截器类型跟随转换结果（选做）
- [ ] E2 schema 单源，改一处两头生效（选做）
- [ ] E3 路径参数键自动推导（选做）
- [ ] E4 已发布且 CI 在岗（选做）

## 常见弯路

- **先写请求函数再想契约**：写完才发现参数类型没处安放，改签名牵动所有调用点。映射表是地基，先行；
- **any 从 json() 一路漏到调用方**：编译全绿只是类型系统全程下线。自测：消费项目里拼错一个响应字段，红线没出现就是漏了；
- **类型体操上头**：为「一个泛型搞定一切」写出 TS2589 和三屏悬停。嵌套超两层拆成有名字的中间类型，推导不出就用手写参数接口的便宜方案；
- **测试只测快乐路径**：库的信用在错误路径——mock 500、缺字段、断网，各有归属才算测完；
- **把库写成应用**：硬编码 baseUrl、混进界面代码、依赖全局状态。验收方式是「换个人、换个项目，三行内跑通」。

## 完成后你能做什么

- 「端点即类型 + 运行时防线」这套骨架搬走名字就是任何项目的 API 层模板；做完 E4，它是简历上第一个你发布并维护的库；
- TanStack Query、zod 做的正是你手写过的推导与边界校验；想再往深处走，[TypeScript 理论](/typescript/710-TypeScriptTheory) 在等你——但先把验收清单勾完。
