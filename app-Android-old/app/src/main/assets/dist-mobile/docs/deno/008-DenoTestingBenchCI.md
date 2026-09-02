# 测试、基准与 CI

Deno 把质量工程的三件事都内置了：`deno test` 跑测试（断言来自标准库 @std/assert）、`deno bench` 跑基准、`deno fmt/lint/check` 守住风格与类型。不需要安装 Jest、benchmark.js 或任何流水线插件，一个 deno.json 加一份 GitHub Actions 就构成完整门禁。本篇以平台的"热度分计算"与"购票接口"为被测对象，把单元测试、异步与权限受限测试、基准对比、CI 流水线一次串起来。042-deno 的模块学习总结（009 篇）会对全模块做收官回顾，本篇聚焦质量工具链本身。

## 前置知识

- [Deno 快速入门：导入、标准库与测试](/deno/002-DenoQuickStart)：已经写过 `Deno.test` 的最小用例，理解 *_test.ts 的自动发现。
- [Deno KV 与队列](/deno/007-DenoKVQueues)：知道 KV 的原子操作语义，本篇的集成测试会用到本地 KV。
- [标准库与 npm 兼容](/deno/006-DenoStdLibNpmCompatibility)：理解 deno.json tasks 与锁文件，CI 流水线基于它搭建。

## 学习目标

1. 会组织 deno test 测试文件，并用 @std/assert 完成常用断言。
2. 能写异步测试、步骤（steps）与权限受限测试，理解资源泄漏检查。
3. 会用 deno bench 做基准对比，读懂 group/baseline 的输出。
4. 能搭建 fmt/lint/check/test 的 GitHub Actions 门禁。
5. 建立"测试定正确性、基准定性能、CI 定纪律"的分工观念。

## 1. deno test 组织与 @std/assert 断言

测试文件以 `_test.ts` 结尾，`deno test` 自动发现，无需任何配置文件。

```typescript
// score.ts —— 被测业务：歌曲热度分（票数与播放量按 7:3 加权）
export interface Song { title: string; votes: number; plays: number }

export function heatScore(song: Song): number {
  // 非法输入直接抛错，让调用方而不是静默结果暴露问题
  if (song.votes < 0 || song.plays < 0) throw new Error("票数与播放量不能为负")
  const raw = song.votes * 0.7 + song.plays * 0.3
  return Math.round(raw * 100) / 100 // 保留两位小数
}
```

```typescript
// score_test.ts —— 断言来自标准库，失败时自动输出 diff
import { assertEquals, assertThrows, assertAlmostEquals } from "@std/assert"
import { heatScore } from "./score.ts"

Deno.test("热度分按 7:3 加权", () => {
  assertEquals(heatScore({ title: "星之歌", votes: 100, plays: 1000 }), 370)
})

Deno.test("结果保留两位小数", () => {
  // 浮点比较用 AlmostEquals 指定误差范围，避免 0.30000000004 式误报
  assertAlmostEquals(heatScore({ title: "回声", votes: 3, plays: 7 }), 4.2, 0.001)
})

Deno.test("负票数视为非法输入", () => {
  assertThrows(() => heatScore({ title: "刷票", votes: -1, plays: 10 }))
})
```

```bash
deno test                    # 运行全部 *_test.ts
deno test --filter "热度"    # 按用例名过滤
deno test --coverage=cov     # 收集覆盖率，deno coverage cov 查看
```

**讲解：**

1. 约定优于配置：文件名匹配 `*_test.ts`（或 `.test.ts`）即被发现；断言函数从 `@std/assert` 导入，失败信息自带左右值对比。
2. 浮点数一律用 `assertAlmostEquals` 并声明误差，`assertEquals` 对 `0.1 + 0.2` 这类值会产生脆断言。
3. `assertThrows` 验证"错误输入要大声失败"，这与函数里主动抛错的防御式写法成对出现。
4. 命名即文档：用例名用业务语言描述行为（"负票数视为非法输入"），失败时报告直接读出语义，test1/test2 这类名字等于把排查成本留给自己。
5. 开发节奏上配合 `deno test --watch` 边写边跑；`--shuffle` 乱序执行用例，暴露"用例之间有顺序依赖"的坏味道——好测试随便什么顺序都应该通过。
6. 两种注册形态可以混用：`Deno.test("名字", fn)` 覆盖日常，对象形态 `{ name, permissions, fn }` 承载权限受限的进阶用例——同一个文件里按需选择。两种写法放在同一文件也不会互相干扰。
7. 测试就近原则：`*_test.ts` 与被测文件同目录，import 相对路径直接可用，重命名或移动时测试跟着一起走，不会出现"测试找不到主"。
8. 测试也受 fmt 与 lint 约束：`deno fmt` 会连测试代码一起格式化，`deno lint` 的推荐规则同样作用于用例——质量标准在测试代码上不打折。
9. 权限声明可以逐用例不同：同一份测试文件里，纯函数用例不带 permissions，集成用例只开 localhost 网络——权限声明本身就是"测试依赖了什么"的文档。

## 2. 异步测试、步骤与权限受限测试

```typescript
// queue_test.ts —— 异步、步骤与权限受限三类写法
import { assertEquals } from "@std/assert"

// 1) 异步测试：async 函数直接 await，无需 done 回调
Deno.test("出票任务在 50ms 内完成", async () => {
  const issueTicket = () => new Promise((r) => setTimeout(() => r("A12"), 20))
  assertEquals(await issueTicket(), "A12")
})

// 2) 步骤（steps）：一个用例内的多个子步骤，报告分层展示
Deno.test("购票流程", async (t) => {
  await t.step("锁定座位", () => { /* 校验库存与版本 */ })
  await t.step("创建订单", () => { /* 写入订单 key */ })
  await t.step("发送确认", () => { /* enqueue 通知 */ })
})

// 3) 权限受限测试：即使命令行给了 -A，用例内也只按声明授权
Deno.test({
  name: "健康检查接口连通（仅允许 localhost）",
  permissions: { net: ["localhost:8000"] },
  fn: async () => {
    const res = await fetch("http://localhost:8000/health")
    await res.body?.cancel() // 只验状态不读体，及时释放
    assertEquals(res.ok, true)
  },
})
```

**讲解：**

1. 异步用例传 `async` 函数即可，Deno 自动等待 Promise；忘记 await 的断言不会逃过检查——见下文易错点。
2. `t.step` 把有关联的子步骤聚合在一个用例里，报告按层级展示，失败定位到具体步骤。
3. `permissions` 选项在用例级别收紧权限：测试沙箱比生产命令更严格，防止测试代码顺手读写真实文件；读用例的 permissions 声明就能知道该功能需要哪些权限，它同时也是一份"权限文档"。
4. Deno 默认开启资源与操作清理（sanitize）：用例结束时若仍持有未关闭的资源句柄，会直接判失败，这是很多人第一次遇到"测试莫名失败"的原因，也是它最大的价值。
5. steps 的失败定位是逐层的：报告直接指出哪个子步骤失败。把它当作"轻量级场景测试"，用来聚合只有先后关系的流程，替代一堆仅一行差异的独立用例。

```typescript
// leak_demo.ts —— 资源清理检查：定时器未清理会被判失败（学习用）
import { assertEquals } from "@std/assert"

Deno.test("示例：会因资源泄漏而失败", () => {
  const timer = setInterval(() => {}, 1000) // 用例结束时仍存活
  assertEquals(true, true)
  // 运行后 Deno 报“用例泄漏了资源”，指向未清理的 interval。
  // 写上 clearInterval(timer) 即可通过——检查器替你抓真实泄漏。
})
```

## 3. deno bench 基准

基准回答"两份实现谁更快"。被测对象换成同一逻辑的两种写法：对象解构版与直接运算版。

```typescript
// heat_bench.ts —— 基准文件以 _bench.ts 结尾，deno bench 运行
import { heatScore, type Song } from "./score.ts"

// 生成十万首歌的榜单数据
const list: Song[] = Array.from({ length: 100_000 }, (_, i) => ({
  title: `song-${i}`, votes: i % 100, plays: i * 7,
}))

let sink = 0 // 接住结果，防止计算被优化掉

Deno.bench("函数版（含校验与取整）", { group: "aggregate", baseline: true }, () => {
  for (const s of list) sink = heatScore(s)
})

Deno.bench("内联版（跳过校验）", { group: "aggregate" }, () => {
  for (const s of list) sink = s.votes * 0.7 + s.plays * 0.3
})
```

```bash
deno bench                          # 全部基准，输出均值/中位数/波动
deno bench --filter "内联" --json   # 过滤并输出 JSON，供 CI 记录趋势
```

**讲解：**

1. `Deno.bench` 自动多轮采样，输出每次迭代的均值与中位数；`group` 让多份实现同台对比，`baseline: true` 标记参照基线，其余实现给出相对百分比。
2. 基准代码要把结果赋给外部变量（sink），否则引擎可能把"结果没人用的计算"优化掉，测出一个虚假的飞快。
3. 基准文件也要进版本控制：与业务代码同仓演进，接口改动时在开发机上顺手跑一遍，性能回归不必等到上线才被发现。
4. 结论只看同 group 内的相对差异，不看绝对数值——不同机器、不同负载下绝对值没有可比性。
5. 对比的双方必须语义等价：内联版跳过校验看似更快，但生产环境需要校验——语义不同的实现放在同一组里对比，结论没有意义。

## 4. fmt、lint、check 与 GitHub Actions

三个静态检查命令与测试一起固化成任务，CI 只跑任务，本地与流水线行为一致。

```json
// deno.json —— 质量门禁固化成任务
{
  "tasks": {
    "check": "deno fmt --check && deno lint && deno check",
    "test": "deno test --allow-net=localhost",
    "bench": "deno bench --json > bench.json"
  },
  "fmt": { "lineWidth": 100 },
  "lint": { "rules": { "tags": ["recommended"] } }
}
```

```yaml
# .github/workflows/ci.yml —— 推送与 PR 的完整质量门禁
name: ci
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x          # 锁定大版本，避免流水线漂移
      - name: 静态检查（格式 + lint + 类型）
        run: deno task check
      - name: 测试
        run: deno task test
      - name: 基准记录（可选）
        run: deno task bench
```

**讲解：**

1. `deno fmt` 是全仓格式化（含 Markdown、JSON、YAML），`--check` 在 CI 只校验不落盘；`deno lint` 默认启用推荐规则集；`deno check` 做全量类型检查。
2. `denoland/setup-deno` 官方 action 自带工具链缓存，流水线秒级就绪；务必固定 `deno-version`，否则不同批次可能跑在不同 Deno 版本上。
3. 基准在 CI 里"只记录不拦截"：把 JSON 产物存成工件对比趋势，回归超过阈值再人工介入，避免噪声报警。
4. 仓库组织上约定俗成：`*_test.ts` 就近放在被测文件同目录，跨模块共享的测试工具收敛到 tests/ 目录；纯函数测试不需要权限，涉及网络或文件读写的用例单独声明 permissions，避免为整个测试任务开大权限。
5. 组织策略小结：纯函数用例追求全分支、构造器消灭重复数据、集成用例收窄权限、基准随代码演进——四条纪律的共同目标是"测试改得起"，改一个函数时测试的调整量应接近于零。
6. CI 里的依赖安装沿用 `deno install --frozen`（见 [标准库与 npm 兼容](/deno/006-DenoStdLibNpmCompatibility)），锁文件保证三方一致。
7. 门禁再往前一步是 GitHub 分支保护：把 test 与 check 两个 job 设为合并前置条件，本地则用 pre-commit 跑 `deno fmt`，形成"提交前自动修、合并前机器验"的双保险。

## 5. 覆盖率与测试组织策略

工具就绪后，测试能不能长期维护取决于组织方式。两条经验：被测对象优先写成纯函数；测试数据用构造器而不是复制粘贴。

```typescript
// test_helpers.ts —— 测试数据构造器：默认值 + 局部覆盖
import type { Song } from "./score.ts"

export function makeSong(overrides: Partial<Song> = {}): Song {
  // 所有字段给合理默认值，调用方只写关心的差异
  return { title: "测试曲", votes: 100, plays: 1000, ...overrides }
}
```

```typescript
// score_test.ts（片段）—— 用构造器后，用例里只剩"差异"
import { assertEquals } from "@std/assert"
import { heatScore } from "./score.ts"
import { makeSong } from "./test_helpers.ts"

Deno.test("票数为 0 时只按播放量计分", () => {
  assertEquals(heatScore(makeSong({ votes: 0 })), 300)
})

Deno.test("恰好两名歌姬合唱的曲子正常计分", () => {
  assertEquals(heatScore(makeSong({ title: "合唱曲", votes: 50 })), 335)
})
```

```bash
deno test --coverage=cov           # 运行并收集覆盖率数据
deno coverage cov                  # 终端汇总：行/分支覆盖率
deno coverage cov --html=cov_html  # 生成 HTML 报告，逐行查看覆盖情况
deno coverage cov --lcov > cov.lcov # 输出 lcov，接入 CI 覆盖率展示
```

**讲解：**

1. `makeSong({...})` 把"构造合法输入"的细节收进一处：字段增减时只改构造器，几十个用例无需跟着改；用例正文从"数据堆砌"变成"行为描述"。
2. 覆盖率报告的作用是"找漏"而不是"凑数"：`deno coverage` 的 HTML 视图直接标出未覆盖行，配合 `--exclude` 排除类型定义等无需测试的文件。
3. 用例命名用中文描述行为（"票数为 0 时只按播放量计分"），失败时报告即可读出业务语义，不需要点开源码。
4. 纯函数 + 构造器的组合让测试可以无限逼近全分支；只有跨模块的集成行为（KV、网络）才引入第 2 节的受限权限测试。

## 易错点与最佳实践

1. **异步断言忘记 await**：断言函数返回 Promise，不 await 就永远不会把失败传给框架，测试"假绿"。断言一律 return 或 await：

```typescript
// 错误：Promise 被丢弃，失败被吞掉
// assertEquals(await issue(), "A12") 写成了 assert(issue().then(...))
// 正确：await 让失败传导给测试框架
assertEquals(await issueTicket(), "A12")
```

2. **用例之间共享可变状态**：模块级数组被上一个用例污染，单独跑通过、全量跑失败。每个用例自建数据，或用步骤组织在同一个用例内。

```typescript
// 错误：模块级共享，用例间互相污染
// const cart: string[] = []
// 正确：用例内新建
Deno.test("加入购物车", () => {
  const cart: string[] = []
  cart.push("ticket-A12")
  assertEquals(cart.length, 1)
})
```

3. **基准被死代码消除**：计算结果无人使用时可能被引擎优化掉，测出虚假性能。把结果写入外部变量，并在组内用 baseline 对比消除机器噪声。

4. **CI 不锁 Deno 版本**：`setup-deno` 不传 `deno-version` 时随时间漂移，格式化与 lint 规则变化会让门禁"莫名其妙"变红。始终固定版本。

5. **本地不跑 fmt --check**：格式问题全部由 CI 打回，往返成本高。把 `deno fmt` 挂进编辑器保存钩子或 pre-commit，让问题在提交前消失。

## 本篇小结

1. `deno test` 约定优于配置：`*_test.ts` 自动发现，断言来自 `@std/assert`，浮点用 `assertAlmostEquals`，异常用 `assertThrows`。
2. 异步用例直接 await；`t.step` 聚合子步骤；`permissions` 选项给用例级最小授权；资源清理检查默认开启，泄漏即失败。
3. `deno bench` 用 group/baseline 做同台对比，结论看相对差异；基准代码必须"消费"结果，防止死代码消除。
4. 质量门禁 = `fmt --check` + `lint` + `check` + `test`，全部固化成 deno.json 任务；GitHub Actions 里固定 Deno 版本与锁文件。
5. 分工一句话：测试保证"对不对"，基准保证"快不快"，CI 保证"每次提交都按同一套规矩来"。

## 动手实践

1. **覆盖率补全**：给 heatScore 加上"plays 为 0 且 votes 为 0 返回 0"的分支测试，用 `deno test --coverage` 与 `deno coverage` 查看行覆盖率，把分支补到 100%。提示：先跑一次覆盖率找到未覆盖行号，再针对性写用例。
2. **购票流程集成测试**：用 `permissions: { read: true }` 的受限用例测试 KV 版购票函数（见 [Deno KV 与队列](/deno/007-DenoKVQueues)），断言并发抢票的成功数等于库存。提示：本地 KV 可用 `:memory:` 打开，测试间互不影响。
3. **基准回归报告**：为热度分的三种实现（函数版、内联版、查表版）各写一条 Deno.bench 并分组对比，把 `--json` 结果提交成 CI 工件，对比两次运行的相对差异。提示：三组实现放在同一 group 内，baseline 指向当前线上版本。同时在 README 里记录本次基准的硬件与版本环境，保证两次运行的趋势可比。
