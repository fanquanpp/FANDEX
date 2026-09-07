---
order: 20
title: Deno 快速入门：导入、标准库与测试
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: URL 导入、JSR/npm 包、标准库常用模块与内置测试框架，完成一个带测试的小工具。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nestjs/001-DenoOverview'
  - 'nestjs/003-DenoPermissionsSecurity'
prerequisites:
  - 'nestjs/001-DenoOverview'
---

## 0. 一句话理解

> Deno 的依赖就是"网址或包名"：import 写在文件顶部，首次运行时自动下载缓存；测试就是 `Deno.test`，与业务代码放一起。

## 1. 导入第三方模块

```typescript
// 从 npm 导入（Deno 2.x 起推荐写法，带版本号）
import { Hono } from "npm:hono@4"

// 从 JSR 导入（Deno 官方包仓库）
import { camelCase } from "jsr:@std/text@1"

// 从 URL 直接导入（经典 Deno 风格）
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
```

**讲解：**

1. `npm:hono@4` 前缀表示"从 npm 拿包"，Deno 会解析其依赖树并缓存，不需要 `npm install`。
2. `jsr:@std/text` 是 Deno 官方标准库在 JSR 上的发布名，`@1` 表示主版本。
3. URL 导入是 Deno 1.x 的标志性写法，新项目建议优先 npm/JSR，并锁定版本号。

## 2. 标准库常用模块

```typescript
// format_date.ts
import { format } from "jsr:@std/datetime@0.225"

const now = new Date()
console.log(format(now, "yyyy-MM-dd HH:mm:ss"))
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
console.log("平均分：", total / rows.length)
```

**讲解：**

1. `@std/datetime` 的 `format` 用 `yyyy/MM/dd` 占位符格式化日期，`@std/csv` 的 `parse` 一行把 CSV 变成对象数组。
2. `skipFirstRow: true` 把第一行当作表头，`row.score` 直接按列名取值。
3. `Number(row.score)` 把字符串转数字；标准库覆盖了文件、路径、颜色、日志、测试等常用能力。

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
```

```bash
deno test
```

**讲解：**

1. `Deno.test("名字", 函数)` 定义一个测试用例，`assertEquals` 断言两个值相等。
2. 测试文件与业务代码同目录，文件名带 `_test.ts` 后缀即可被自动发现。
3. 空数组返回 0 的用例专门保护边界条件——写测试的入门标准就是"正常情况 + 边界情况"。

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

1. `tasks` 相当于 npm scripts：`deno task dev` 运行开发任务，`--watch` 自动重启。
2. `imports` 是 import map：把 `@std/assert` 映射到具体版本，代码里写 `import { assertEquals } from "@std/assert"` 更干净。
3. deno.json 是可选文件，没有它 Deno 也能跑，但项目复杂后建议加上。

## 5. 动手试试

1. 写一个 `median`（中位数）函数，包含奇数长度与偶数长度两个测试用例。
2. 用 `@std/csv` 解析一份 10 行成绩单，输出及格率（>=60 的占比）。
3. 把 `average` 重构为从 CSV 读取分数再计算，运行 `deno test` 确认测试仍通过。

## 6. 一句话记住

> Deno 的开发节奏是"写文件 → import 带版本的包 → deno test/run"，工具链内置、测试内置，配置按需增加。
