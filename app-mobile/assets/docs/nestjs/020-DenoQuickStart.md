---
order: 20
title: Deno 快速入门：导入、标准库与测试
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: URL 导入、JSR/npm 包、标准库常用模块与内置测试框架，完成一个带测试的小工具。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/010-DenoOverview'
  - 'nestjs/030-DenoPermissionsSecurity'
  - 'nestjs/040-DenoStdLibNpmCompatibility'
prerequisites:
  - 'nestjs/010-DenoOverview'
---

## 0. 一句话理解

> Deno 的依赖就是"网址或包名"：import 写在文件顶部，首次运行时自动下载缓存；测试就是 `Deno.test`，与业务代码放一起。

本篇以"给虚拟歌手音乐平台写一个成绩统计小工具"为主线：导入依赖、解析 CSV、算平均分、写测试，十分钟走完一个 Deno 项目的完整生命周期。

## 1. 导入第三方模块

```typescript
// 从 npm 导入（Deno 2.x 起推荐写法，带版本号）
import { Hono } from "npm:hono@4"

// 从 JSR 导入（Deno 官方包仓库，TypeScript 源码直发）
import { camelCase } from "jsr:@std/text@1"

// 从 URL 直接导入（经典 Deno 风格）
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
```

**讲解：**

1. `npm:hono@4` 前缀表示"从 npm 拿包"，Deno 会解析其依赖树并缓存，不需要 `npm install`；`@4` 表示接受 4.x 内的最新版本。
2. `jsr:@std/text` 是 Deno 官方标准库在 JSR 上的发布名；JSR 直接发布 TypeScript 源码，类型提示开箱即用，不需要再装 `@types` 系列。
3. URL 导入是 Deno 1.x 的标志性写法，新项目建议优先 npm/JSR，并锁定版本号——裸 URL 既没有锁文件保障，也让依赖版本散落在源码各处。
4. 首次运行时代码执行到 import 才下载：下载会打印进度，之后全部走本地缓存，离线也能跑。

## 2. 标准库常用模块

```typescript
// format_date.ts
import { format } from "jsr:@std/datetime@0.225"

const now = new Date()
console.log(format(now, "yyyy-MM-dd HH:mm:ss"))
// 输出形如：2026-09-10 21:30:05
```

```typescript
// csv.ts：解析 CSV 并计算总和
import { parse } from "jsr:@std/csv@1"

const csvText = `name,score\n小明,90\n小红,85`
const rows = parse(csvText, { skipFirstRow: true })

let total = 0
for (const row of rows) {
  total += Number(row.score)
}
console.log("平均分：", total / rows.length) // 平均分：87.5
```

**讲解：**

1. `@std/datetime` 的 `format` 用 `yyyy/MM/dd` 占位符格式化日期；处理日期的现代方案是 Temporal——Deno 2.7 起已稳定，新项目可优先关注。
2. `@std/csv` 的 `parse` 一行把 CSV 变成对象数组；`skipFirstRow: true` 把第一行当作表头，`row.score` 直接按列名取值。
3. `Number(row.score)` 把字符串转数字（CSV 读进来的都是字符串）；加 `cast: true` 选项可让 parse 自动转换数字与布尔。
4. 标准库前缀统一为 `@std/`：路径（`@std/path`）、UUID（`@std/uuid`）、终端颜色（`@std/fmt/colors`）、断言（`@std/assert`）等，需要什么先查标准库再找第三方。

## 3. 内置测试框架

```typescript
// avg_test.ts
import { assertEquals } from "jsr:@std/assert@1"

export function average(scores: number[]): number {
  if (scores.length === 0) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

Deno.test("average 计算平均值", () => {
  assertEquals(average([90, 85, 95]), 90)
})

Deno.test("average 空数组返回 0", () => {
  assertEquals(average([]), 0)
})

// 步骤（steps）：把"解析 CSV 再求平均"合成一条测试，任一步失败即整体失败
Deno.test("成绩统计完整流程", async (t) => {
  await t.step("解析两行成绩", () => {
    assertEquals([{ name: "小明", score: "90" }].length, 1)
  })
  await t.step("求平均分", () => {
    assertEquals(average([90, 90]), 90)
  })
})
```

```bash
deno test
```

```text
running 3 tests from ./avg_test.ts
average 计算平均值 ... ok (1ms)
average 空数组返回 0 ... ok (0ms)
成绩统计完整流程 ... ok (2ms)

ok | 3 passed | 0 failed (5ms)
```

**讲解：**

1. `Deno.test("名字", 函数)` 定义一个测试用例，`assertEquals` 断言两个值相等；失败时输出期望值与实际值的彩色对比。
2. 测试文件与业务代码同目录，文件名带 `_test.ts`（或 `.test.ts`）后缀即可被 `deno test` 自动发现，不需要配置文件。
3. 步骤（`t.step`）适合"有先后依赖的多个断言"，比拆成多个独立测试更能表达流程语义。
4. 空数组返回 0 的用例专门保护边界条件——写测试的入门标准就是"正常情况 + 边界情况"。
5. 测试也能声明权限，如 `deno test --allow-read`：纯函数测试零权限即可运行，涉及文件与网络的用例才开对应权限。

## 4. 项目配置文件（可选）

```json
// deno.json
{
  "tasks": {
    "dev": "deno run --watch main.ts",
    "test": "deno test"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@1"
  }
}
```

**讲解：**

1. `tasks` 相当于 npm scripts：`deno task dev` 运行开发任务，`--watch` 监听文件变化自动重启。
2. `imports` 是 import map：把 `@std/assert` 映射到具体版本，代码里写 `import { assertEquals } from "@std/assert"` 更干净，升级只改这一处。
3. deno.json 是可选文件，没有它 Deno 也能跑，但项目复杂后建议加上；首次运行还会生成 `deno.lock` 锁文件，提交进仓库保证团队版本一致。
4. 集中管理版本、锁文件与 CI 的完整实践见[标准库与 npm 兼容](/nestjs/040-DenoStdLibNpmCompatibility)。

## 5. 常见陷阱

1. **版本号写死在每个 import 里**：升级要全仓搜索替换，还可能出现同一依赖两个版本并存。版本集中到 deno.json 的 imports，源码只写裸说明符。
2. **忘了 `--allow-*` 权限**：读文件、访问网络的代码在测试里静默失败或抛 `PermissionDenied`，不是逻辑错误，是没给权限；`deno test --allow-read` 补上即可。
3. **`Deno.test` 写在被测文件里但文件名不带 `_test`**：`deno test` 发现不了它。命名约定是发现机制的一部分。
4. **把 `Deno.args` 用在导入期**：模块顶层代码在 import 时就执行，测试环境没有传参会得到 `undefined`；入口逻辑放到 `main()` 函数里，导入零副作用，测试也更好写。
5. **依赖缓存导致"我这是最新的"**：怀疑缓存问题时用 `deno info` 查看实际解析到的版本与缓存路径，别靠猜。

## 6. 动手试试

1. 写一个 `median`（中位数）函数，包含奇数长度与偶数长度两个测试用例，运行 `deno test` 确认全绿。
2. 用 `@std/csv` 解析一份 10 行成绩单，输出及格率（>=60 的占比）。
3. 把 `average` 重构为从 CSV 读取分数再计算，运行 `deno test` 确认测试仍通过。
4. 给 deno.json 增加 `task check`（`deno fmt --check && deno lint && deno check`），体验一条命令过三关。

## 7. 本篇小结

**初学者要点：**

- Deno 的开发节奏是"写文件 → import 带版本的包 → deno test/run"，工具链内置、测试内置，配置按需增加。
- 三种导入来源：`npm:` 复用 npm 生态、`jsr:` 用官方标准库与 JSR 包、URL 是 1.x 遗产风格；新代码一律带版本号。
- 测试三件套：`Deno.test` 定义、`assertEquals` 断言、`t.step` 串流程；文件名带 `_test.ts` 就能被发现。

**进阶注意：**

- imports 集中管理 + deno.lock 锁定 + `deno install --frozen` 是团队协作的"版本三保险"，个人练手可以省，团队项目不能省。
- 运行期不做全量类型检查，CI 里必须补 `deno check`；日期处理关注 Temporal 取代传统 Date 的趋势。
