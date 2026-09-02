---
order: 60
title: 内置测试与基准
module: 'bun'
category: 后端技术
difficulty: beginner
description: 零配置测试：bun test、Jest 兼容面、mock 与覆盖率。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'bun/002-BunQuickStart'
  - 'bun/005-BunPackageManagerWorkspaces'
prerequisites:
  - 'bun/005-BunPackageManagerWorkspaces'
---

# 内置测试与基准

`bun test` 是运行时自带的测试器：Jest 兼容的 API、TypeScript 直接运行、毫秒级启动，不用安装 Jest 也不用配 ts-jest。基准测试同样内置——`bun:test` 导出的 `bench()` 与测试同一套运行机制，改完代码顺手就能对比两版实现的性能。本篇以平台的"热度分计算"与"票务服务"为被测对象，覆盖测试骨架与 matcher、从 Jest 迁移的差异点、mock 三件套、快照与覆盖率，最后接进 CI。SQLite、S3 等内置能力的测试放到 009 篇展开，这里聚焦测试与基准本身。

## 前置知识

- [包管理与工作区](/bun/005-BunPackageManagerWorkspaces)：理解 bun.lock 与冻结安装，CI 一节会用到。
- [Bun 快速入门：项目、依赖与测试](/bun/002-BunQuickStart)：已经跑过 `bun test` 的最小示例。
- [Bun 内置服务器、SQL 与数据库](/bun/003-BunBuiltinServerSQL)：了解 Bun.serve 的形态，服务测试一节会模拟它的依赖。

## 学习目标

1. 会组织 bun test 测试文件，熟练使用常用 matcher 与参数化用例。
2. 能说出 bun:test 与 Jest 的兼容面与三个关键差异点。
3. 掌握 mock()、mock.module()、spyOn() 三件套的使用场景。
4. 会用快照测试渲染结果，并用 bunfig.toml 设置覆盖率门槛。
5. 能把测试与基准接入 GitHub Actions。

## 1. bun test 骨架与常用 matcher

文件名匹配 `*.test.ts` 即被 `bun test` 自动发现，describe/test/expect 从 `bun:test` 导入。

```typescript
// heat.test.ts —— 热度分：票数与播放量按 7:3 加权，保留两位小数
import { describe, test, expect } from "bun:test"

function heatScore(votes: number, plays: number): number {
  return Math.round((votes * 0.7 + plays * 0.3) * 100) / 100
}

describe("heatScore", () => {
  test("按 7:3 加权", () => {
    expect(heatScore(100, 1000)).toBe(370)          // toBe：严格相等（===）
  })

  test.each([
    [0, 0, 0],       // 空数据
    [10, 0, 7],      // 只有票数
  ])("votes=%i plays=%i", (votes, plays, expected) => {
    expect(heatScore(votes, plays)).toBe(expected)  // 参数化覆盖边界
  })

  test("对象比较用 toEqual", () => {
    const order = { seat: "A12", price: 680 }
    expect(order).toEqual({ seat: "A12", price: 680 }) // 结构相等
    expect(order).not.toHaveProperty("status")
  })
})
```

```bash
bun test                 # 全部测试
bun test heat            # 按文件名过滤
bun test -t "按 7:3"     # 按用例名过滤
bun test --watch         # 文件变化时增量重跑
```

**讲解：**

1. `toBe` 比较原始值与引用，`toEqual` 比较对象结构，`not` 链取反；`toThrow` 断言异常、`toContain` 断言成员——与 Jest 同名同义。
2. 失败输出自带 diff：期望与实际值的差异会高亮打印，多数失败不必打开源码就能定位。
3. `test.each` 用参数表覆盖边界组合，比复制粘贴用例干净得多。
4. `--watch` 适合"改一个函数跑一遍"的节奏，启动开销小到可以一直挂着。
5. 测试器的启动开销在毫秒级，与运行时共享同一套基础设施，把测试挂进 watch 循环也不会拖慢编辑反馈；这也是"测试写在随手可跑的地方"能成立的前提。
6. matcher 速记：toBe 严格相等、toEqual 结构相等、toBeCloseTo 浮点近似、toThrow 异常、toContain 成员——记住五个能覆盖日常九成断言需求。

## 2. Jest 兼容面与迁移差异

bun:test 的 API 面向 Jest 设计，大多数测试文件把 `from "@jest/globals"`（或隐式全局）改成 `from "bun:test"` 就能跑。三个需要留意的差异点：

```typescript
// 差异一：显式导入。Bun 不注入全局 describe/test，一律 from "bun:test"
import { describe, test, expect, jest } from "bun:test"

// 差异二：jest.mock 的字符串路径提升语法不可用，模块替换用 mock.module()
// 差异三：快照的序列化细节略有差异，迁移后删除 __snapshots__ 重新生成一次
```

```toml
# bunfig.toml —— 测试配置从 jest.config.js 平移
[test]
coverage = true                     # 默认收集覆盖率
preload = ["./tests/setup.ts"]      # 全局环境准备（如 mock 时区）

[test.coverageThreshold]
line = 0.8                          # 行覆盖率低于 80% 直接失败
function = 0.8
```

**讲解：**

1. 兼容面：describe/test/expect 全套 matcher、test.each、beforeEach/afterEach、快照、覆盖率开关都可用，团队 Jest 经验直接复用。
2. 差异一最常见于"跑起来报 describe is not defined"——补上导入即可；差异二见下一节 mock.module 的正确姿势；差异三的快照差异表现为哈希不同，重新生成即可，不要手工比对。
3. 配置放在 bunfig.toml 而不是 jest.config.js：preload、覆盖率门槛、报告格式都在 `[test]` 段。
4. 迁移不必一步到位：旧 suite 可以分批改写，过渡期两套测试器并存但依赖要各自清理；目标是让 `bun test` 成为唯一入口，而不是长期双轨。

```typescript
// 迁移清单：Jest 到 bun test 的六步（建议按顺序过一遍）
// 1. import 来源统一改为 "bun:test"
// 2. jest.mock(...) 改写为 mock.module(...)，并在动态 import 之前调用
// 3. jest.fn() 改为 mock()，jest.spyOn 改为 spyOn
// 4. 删除 __snapshots__ 后重新生成一次快照
// 5. jest.config.js 的测试相关配置平移进 bunfig.toml 的 [test] 段
// 6. ts-jest / babel 配置整体删除：bun 原生运行 TypeScript，无需转译层
```

## 3. mock 三件套：mock 函数、模块与侦听

```typescript
// api.ts —— 真实依赖：请求平台 HTTP 接口
export async function fetchSinger(id: string) {
  const res = await fetch(`https://api.vfinder.example/singers/${id}`)
  if (!res.ok) throw new Error("接口异常")
  return res.json() as Promise<{ id: string; name: string; theme: string }>
}
```

```typescript
// singer.test.ts —— 三件套各就其位
import { test, expect, mock, spyOn, beforeEach } from "bun:test"
import { singerTheme } from "./singer.ts"

// 1) mock()：函数替身，记录调用次数与参数，适合注入依赖
const sendSms = mock((phone: string) => true)
test("出票后发一次短信", () => {
  sendSms("13800000000")
  expect(sendSms).toHaveBeenCalledTimes(1)
  expect(sendSms).toHaveBeenCalledWith("13800000000")
})

// 2) mock.module()：替换整个模块，隔离网络依赖
//    Bun 不提升 mock 声明：先 mock，再动态 import 被测模块
mock.module("./api.ts", () => ({
  fetchSinger: async (id: string) => ({ id, name: "初音未来", theme: "#39c5bb" }),
}))
const { singerTheme: mockedTheme } = await import("./singer.ts")

test("返回歌姬应援色", async () => {
  expect(await mockedTheme("miku")).toBe("#39c5bb")
})

// 3) spyOn()：侦听对象方法，保留原实现或替换返回值
const logSpy = spyOn(console, "log")
beforeEach(() => mock.restore())   // 每个用例前还原所有替身，防止互相污染
```

**讲解：**

1. `mock(fn)` 创建函数替身：`.mock.calls` 记录每次调用的参数，配合 expect 的 `toHaveBeenCalledTimes`/`toHaveBeenCalledWith` 断言交互行为。
2. `mock.module("路径", 工厂)` 替换模块导出，用于隔离 fetch、数据库等外部依赖。关键差异：Bun 不做 Jest 式的 mock 提升，所以先用 mock.module、再 `await import()` 被测模块，静态 import 会抢在替换之前执行。
3. `spyOn(对象, "方法")` 侦听已有方法（如 console.log、Date.now），不改动业务逻辑；`mock.restore()` 统一还原所有 mock 与 spy，放进 beforeEach 是最稳的习惯。
4. 替身粒度按依赖边界选：函数依赖用 mock() 注入、模块依赖用 mock.module() 替换、对象方法用 spyOn() 侦听——三种耦合方式对应三种替身，混用会让失败难以定位。
5. 替身命名也有讲究：mock 函数用业务动词命名（sendSms 而不是 fn1），失败信息里的可读性完全不同。

## 4. 快照与覆盖率

```typescript
// setlist.ts —— 渲染演唱会曲单
export interface Song { title: string; producer: string }

export function formatSetlist(songs: Song[]): string {
  return songs
    .map((s, i) => `${String(i + 1).padStart(2, "0")}. ${s.title}（P主：${s.producer}）`)
    .join("\n")
}
```

```typescript
// setlist.test.ts —— 快照锁定渲染格式
import { test, expect } from "bun:test"
import { formatSetlist } from "./setlist.ts"

test("曲单渲染快照", () => {
  const setlist = formatSetlist([
    { title: "星之歌", producer: "DECO*27" },
    { title: "回声", producer: "古川本铺" },
  ])
  // 首次运行写入 __snapshots__，之后逐字比较
  expect(setlist).toMatchSnapshot()
})
```

```bash
bun test                                    # 首次生成快照，之后校验
bun test -u                                 # 快照确认变更后更新（谨慎使用）
bun test --coverage --coverage-reporter=lcov # 覆盖率并输出 lcov 供 CI 展示
```

**讲解：**

1. 快照适合"格式稳定、人工难以逐字断言"的输出：模板渲染、CLI 打印、报文结构。审核变更用 `bun test -u` 更新，并把 diff 交给评审。
2. 快照数据要"稳定"：时间戳、随机 id、接口原始响应这类易变内容先做归一化（剔除或固定），否则快照天天红。
3. 覆盖率在 bunfig.toml 里设 `coverage = true` 与阈值，测试通过但覆盖率不达标同样判失败——门槛是纪律，不是装饰。
4. 快照数量宜少而稳：锁"渲染格式"与"报文结构"这类低频变化物；业务规则频繁变动的数据不适合快照，改用显式断言让失败信息可读。
5. 覆盖率数字要解读而不是迷信：行覆盖 100% 不代表分支覆盖——`stock > 0` 的两个方向都要有用例走到，报告里的分支列才是重点。
6. 迁移期给团队定一条规则：新测试一律直接写 bun:test——迁移的完成态由"新增代码不再依赖旧框架"保证，而不是一次性大爆炸改写。
7. 快照与显式断言各守边界：渲染格式这类"错了肉眼才能发现"的输出交给快照；业务规则（票价计算、库存判断）用显式断言，让失败信息直接说出语义。

## 5. CI 接入

```yaml
# .github/workflows/test.yml —— PR 与主干的测试门禁
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile   # 锁文件保证依赖一致
      - run: bun test --coverage             # 覆盖率阈值由 bunfig.toml 控制
      - run: bun test heat.bench.ts          # 基准只记录趋势，不作为门禁
```

```typescript
// heat.bench.ts —— 基准与测试同一运行器：bench() 输出 ops/sec
import { bench, describe } from "bun:test"
import { heatScore } from "./heat.ts"

describe("热度分基准", () => {
  bench("当前实现", () => { heatScore(100, 1000) }, { baseline: true })
  bench("权重预乘实验版", () => { (100 * 7 + 1000 * 3) / 10 })
})
```

**讲解：**

1. CI 三步：冻结安装、带覆盖率的测试、基准记录。基准不设通过与否，把结果存成工件做版本间趋势对比。
2. `bench()` 与测试共用文件发现机制，`baseline: true` 标记参照实现，其余实现输出相对百分比；基准文件命名同样走 `*.test.ts` 的匹配规则也能被发现。
3. 基准结论只看同文件内 group 的相对差异，绝对数值受机器与负载影响大，不要跨 CI 批次直接比较。
4. PR 评审时留意 `.bench.ts` 的变更：基准实现的改动会让趋势曲线跳变，改动方应在描述里注明原因，避免被误读成性能回归。

## 6. 测试策略：从纯函数到协议级

前面五节是"怎么写"，本节回答"写什么、写到哪一层"。平台代码按依赖深度分三层测试，越往上越少而重。

```typescript
// handler.ts —— 供测试与生产共用的 HTTP 处理函数（第一层与第三层的接口）
export async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname === "/health") return Response.json({ ok: true })
  if (url.pathname === "/api/concerts/c001") {
    return Response.json([{ id: "c001", title: "2026 魔法未来" }])
  }
  return new Response("Not Found", { status: 404 })
}
```

```typescript
// handler.test.ts —— 第三层：协议级测试，起真实服务再发请求
import { afterAll, expect, test } from "bun:test"
import { handler } from "./handler.ts"

const server = Bun.serve({ port: 0, fetch: handler }) // port 0 = 随机空闲端口

afterAll(() => server.stop(true))

test("健康检查返回 200", async () => {
  const res = await fetch(`http://localhost:${server.port}/health`)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})

test("未知路径返回 404", async () => {
  const res = await fetch(`http://localhost:${server.port}/nope`)
  expect(res.status).toBe(404)
})
```

**讲解：**

1. 三层金字塔：底层是 heatScore 这类纯函数单测（快、数量多）；中层是 mock.module 隔离依赖的服务单测（第 3 节）；顶层是起真实端口的协议测试（数量少、覆盖端到端行为）。
2. 协议测试的关键技巧是 `port: 0`：让操作系统分配随机空闲端口，用例之间互不冲突，CI 上也能并行跑。
3. handler 与生产代码共用同一个函数：测试通过即代表真实路由行为正确，不存在"测试环境和线上两套逻辑"。
4. 分层配比参考：新增一个业务函数通常配 3-5 条纯函数用例；一个接口端点配 1-2 条协议用例验证路由与状态码即可，不必在协议层重复所有分支。
5. 运行节奏随之分层：本地 --watch 跑纯函数层，提交前跑全量，CI 跑全量加协议层——越贵的层跑得越少，反馈速度与覆盖广度才能兼顾。
6. 给协议层配一份最小协议文档（注释或 README）：字段名、动词、错误码写清楚，测试与客户端实现都以它为准，避免"测试和实现一起错"。

## 易错点与最佳实践

1. **mock.module 与静态 import 的时序**：静态 import 会被提升到文件顶部，抢在 mock.module 之前执行，替换不生效。先 mock、再动态导入：

```typescript
// 错误：静态 import 先执行，拿到的还是真实模块
// import { singerTheme } from "./singer.ts"
// mock.module("./api.ts", () => ({ ... }))
// 正确：先替换依赖模块，再动态导入被测代码
mock.module("./api.ts", () => ({ fetchSinger: async () => ({ theme: "#39c5bb" }) }))
const { singerTheme } = await import("./singer.ts")
```

2. **快照里混入易变数据**：时间戳、自增 id 让快照每次运行都失败。归一化后再快照：

```typescript
// 错误：直接快照接口响应，id 每次都不同
// expect(await createOrder()).toMatchSnapshot()
// 正确：剔除易变字段，只锁定关心的结构
const order = await createOrder("c001")
expect({ seat: order.seat, price: order.price }).toMatchSnapshot()
```

3. **mock 忘记还原**：上一条用例的替身泄漏到下一条，单独跑通过、全量跑失败。beforeEach 里 `mock.restore()` 成对出现。

4. **覆盖率开了但没设阈值**：`coverage = true` 只出报告不拦截，覆盖率永远"绿"。在 bunfig.toml 的 `[test.coverageThreshold]` 里给 line/function 定门槛。

5. **CI 里测试与基准混跑**：基准对环境噪声极敏感，与测试同一 job 会导致结果抖动甚至误判回归。基准单独 job（或仅记录不拦截），并固定 runner 规格。

6. **协议测试打真实外网**：用例里直接 fetch 生产接口，CI 上慢且偶发超时。HTTP 依赖一律走 mock.module 或本地 handler（见第 6 节），真实外网的冒烟验证单独开低频任务。

## 本篇小结

1. `bun test` 零配置运行：`*.test.ts` 自动发现，describe/test/expect 与 Jest 同名同义，`test.each` 参数化覆盖边界。
2. 迁移三差异：显式从 `bun:test` 导入；模块替换用 `mock.module()`（先 mock 后动态 import）；快照序列化有差异，重新生成一次。
3. mock 三件套分工：`mock()` 做函数替身记录调用，`mock.module()` 隔离模块依赖，`spyOn()` 侦听对象方法；`mock.restore()` 统一还原。
4. 快照锁定格式类输出（先归一化易变字段），覆盖率配合 bunfig.toml 的阈值才构成门禁。
5. CI 三步走：冻结安装、带阈值测试、基准只记录趋势；`bench()` 与测试同一运行器，同组对比看相对差异。

## 动手实践

1. **mock.module 实战**：给 [Bun 内置服务器、SQL 与数据库](/bun/003-BunBuiltinServerSQL) 中的接口处理函数写测试，用 mock.module 替换数据库查询函数，覆盖"正常返回"与"上游 500"两条路径。提示：注意先 mock 后 `await import()` 的时序。
2. **快照守门**：为演唱会曲单渲染写快照测试，故意修改格式触发快照失败，走一遍"评审 diff -> bun test -u 更新 -> 再次通过"的流程。提示：在快照里加入歌姬名，体会易变内容带来的维护成本。
3. **基准对比**：写两个版本的座位检索函数（线性扫描版与 Map 索引版），用 bench() 分组对比并标注 baseline，把结论写进 PR 描述。提示：数据量从 100 与 10000 两档分别测，观察曲线拐点。若两版差距在噪声范围内，说明数据结构尚未成瓶颈，把这个结论也写进 PR。
