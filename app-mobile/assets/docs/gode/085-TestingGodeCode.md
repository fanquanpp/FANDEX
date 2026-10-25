---
order: 90
title: 测试 Gode 项目
module: 'gode'
category: 游戏开发
difficulty: beginner
description: 纯 TS 逻辑的 Vitest 单测与引擎行为的冒烟测试分层——工程增补实践（非官方内容）
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：Gode 项目的测试分层——纯 TypeScript 逻辑的 Vitest 单测与依赖引擎行为的冒烟测试。
- 解决什么问题：游戏代码"跑起来才知道对不对"的验证成本太高；把不依赖引擎的逻辑剥出来在 Node 里秒级验证，引擎行为留给冒烟与手测，各层各管一段。
- 什么时候用到：写状态机/数值计算/协议封装时配测试；每次提交前跑单测；导出发布前跑引擎冒烟。
- **诚实边界声明**：Gode 官方文档目录（2026-10 实查）没有测试主题，本篇属工程实践增补而非官方内容——分层思路借自通用前端工程与 Godot 社区的无头测试实践，参考链接不冒充官方来源。

## 前置知识

- 《Godot API 互操作》（030 篇）：本篇最重要的测试对象——`call()` 字符串协议与对象生命周期——都来自那篇；
- 《TypeScript 配置与编译》（060 篇）：tsconfig 与编译产物位置；
- Vitest 的基本用法（describe/it/expect），官方文档见文末。

## 学习目标

- 会按"纯逻辑 / 引擎行为"两层切分 Gode 代码，并为纯逻辑层配 Vitest 表驱动测试；
- 会在 Node 里测"依赖 godot 模块"的代码：注入替身（test double）而不是真启动引擎；
- 会写引擎内最小冒烟脚本，并把它纳入发布前三平台检查。

## 1. 心智模型：两层切分，各管一段

```text
第一层：纯 TS 逻辑（不 import 引擎行为也能跑）
   状态机转移、伤害公式、回合结算、字符串协议封装
   -> Vitest 在 Node 里跑，毫秒级反馈，进 CI 每次提交
第二层：引擎行为（必须真引擎才成立）
   节点树装配、物理、信号时序、渲染
   -> 引擎内冒烟脚本（打印标记 + 退出码）+ 手测清单
```

切分的判断标准一句话：**这段代码把 `godot` 模块当数据用（类型、常量），还是当能力用（节点、物理、信号）**？前者可测于 Node，后者留引擎。测试成本在第一层几乎为零，所以工程纪律是：**能让逻辑变纯，就别让测试变贵**——把引擎依赖推到边界上（030 篇"对象归谁管"的准则在这里就是可测性准则）。

## 2. 第一层：纯逻辑的 Vitest 表驱动测试

以回合制游戏的结算函数为例——它只做数值计算，不碰任何节点：

```typescript
// scripts/core/battle_score.ts —— 纯逻辑：无 godot 依赖
export interface BattleInput {
  atk: number
  def: number
  crit: boolean
  element: "fire" | "water" | "neutral"
}

const ELEMENT_BONUS: Record<BattleInput["element"], number> = {
  fire: 1.2, water: 0.8, neutral: 1.0,
}

export function settleDamage(input: BattleInput): number {
  const base = Math.max(1, input.atk - input.def)
  const crit = input.crit ? 2 : 1
  return Math.floor(base * crit * ELEMENT_BONUS[input.element])
}
```

```typescript
// tests/battle_score.test.ts —— Vitest 表驱动
import { describe, expect, it } from "vitest"
import { settleDamage } from "../scripts/core/battle_score"

describe("settleDamage", () => {
  it.each([
    { name: "基础压制", input: { atk: 50, def: 30, crit: false, element: "neutral" }, want: 20 },
    { name: "暴击翻倍", input: { atk: 50, def: 30, crit: true, element: "neutral" }, want: 40 },
    { name: "属性加成", input: { atk: 50, def: 30, crit: false, element: "fire" }, want: 24 },
    { name: "攻击不破防保底 1", input: { atk: 5, def: 99, crit: false, element: "neutral" }, want: 1 },
    { name: "向下取整", input: { atk: 21, def: 20, crit: false, element: "water" }, want: 0 },
  ])("$name", ({ input, want }) => {
    expect(settleDamage(input as never)).toBe(want)
  })
})
```

**讲解：**

1. `it.each` 的表驱动形态：每个用例一行数据（名字 + 输入 + 期望），加用例就是加一行——数值策划调平衡时，你只需要往表里补"新边界值"，测试代码结构不动。
2. 用例选择覆盖了公式里每个分支：基础差值、暴击、属性加成、保底 max(1)、取整方向——**一个分支一个用例**，特别是"攻击不破防"这种边界，手测几乎永远不会踩到它。
3. 运行 `npx vitest run` 秒级出结果；把它写进 package.json 的 test 脚本并挂进 CI，每次提交全量回归。Vitest 与 Gode 内置的 tsc 互不干扰——测试直接吃 `.ts` 源码（Vitest 自带转译），不经过 `.gode/build` 产物。
4. 工程位置约定：`tests/` 目录与 `scripts/` 源码同级；测试文件不进场景、不进导出包（导出只收场景引用的资源，见 080 篇）。

## 3. 第一层进阶：给"依赖 godot 模块"的代码做注入替身

wrapper 层封装了 `call()` 字符串协议（030 篇的互通形态），它 import 了 godot 模块——在 Node 里跑会崩。解法不是启动引擎，而是**把引擎调用点收敛成一个可替换的接口**：

```typescript
// scripts/wrapper/bridge.ts —— 引擎调用点收敛
export interface EngineBridge {
  call(nodePath: string, method: string, ...args: unknown[]): unknown
}

// 生产实现：真引擎（.ts 脚本里 import { Node } from "godot" 后拿真实对象）
// 测试实现：内存假桥，记录调用并回放预设返回值
export class FakeBridge implements EngineBridge {
  calls: Array<{ nodePath: string; method: string; args: unknown[] }> = []
  private replies = new Map<string, unknown>()

  on(nodePath: string, method: string, reply: unknown): void {
    this.replies.set(nodePath + "#" + method, reply)
  }

  call(nodePath: string, method: string, ...args: unknown[]): unknown {
    this.calls.push({ nodePath, method, args })
    return this.replies.get(nodePath + "#" + method)
  }
}
```

```typescript
// tests/protocol.test.ts —— 协议快照测试
import { describe, expect, it } from "vitest"
import { FakeBridge } from "../scripts/wrapper/bridge"
import { InventoryApi } from "../scripts/wrapper/inventory"

describe("InventoryApi 协议", () => {
  it("addItem 发送 (add_item, id, count) 并回读结果", () => {
    const bridge = new FakeBridge()
    bridge.on("/root/inv", "add_item", { ok: true, total: 3 })

    const api = new InventoryApi(bridge)
    const result = api.addItem("sword_01", 2)

    expect(result).toEqual({ ok: true, total: 3 })
    expect(bridge.calls).toEqual([
      { nodePath: "/root/inv", method: "add_item", args: ["sword_01", 2] },
    ])
  })
})
```

**讲解：**

1. FakeBridge 的 `calls` 数组是**协议快照**：断言的不是引擎行为，而是"我们的 TS 侧发出的 call 协议长什么样"——字符串方法名、参数顺序、类型。协议是最容易在重构中悄悄改坏的东西（030 篇讲过 call() 无编译期检查），快照测试就是给这条软肋上的锁。
2. wrapper 收敛后的收益正是这里兑现：调用点散落时无法替身，收敛到一个 EngineBridge 接口后测试只需要一个假实现。**可测试性是 wrapper 模式的第二红利**（第一红利是类型安全）。
3. 替身不模拟引擎语义——它只回答"TS 侧发了什么、拿到回包后做了什么"。引擎侧语义（节点不存在时 call 抛错）属于第二层冒烟的职责。

## 4. 第二层：引擎内冒烟

引擎行为的最小验证是"能不能起来、核心场景能不能走通"。形态借自 Godot 社区的无头测试实践（028-software-testing 模块有完整案例）：一个 GDScript 或 TS 入口脚本，装配最小场景、断言关键节点存在、打印标记、按成败给退出码：

```typescript
// scripts/dev/smoke.ts —— 引擎内冒烟（编辑器或导出包内运行）
import { GD, Node } from "godot"

export class Smoke extends Node {
  _ready(): void {
    const checks: Array<[string, boolean]> = [
      ["player exists", this.getNodeOrNull("../Player") != null],
      ["hud exists", this.getNodeOrNull("../HUD") != null],
      ["battle core loads", true],   // 逐项补：核心单例可达、关键资源可加载
    ]
    const failed = checks.filter(([, ok]) => !ok)
    for (const [name, ok] of checks) {
      GD.print((ok ? "SMOKE PASS " : "SMOKE FAIL ") + name)  // 给引擎看的日志走 GD.print
    }
    this.get_tree().quit(failed.length === 0 ? 0 : 1)        // 退出码交给调用方判定
  }
}
```

**讲解：**

1. 冒烟的三要素：**标记行**（SMOKE PASS/FAIL，人扫日志）、**退出码**（0/1，机器判定）、**最小装配**（只起验证目标所需的最小场景，不追求完整游戏）。
2. 发布检查的节奏：提交前 Vitest 全绿 -> 每日/每次合入跑引擎冒烟（编辑器无头模式或 CI 的 Godot runner）-> **导出前三平台各跑一次冒烟**——Windows 的 node.dll、iOS 的部署目标（16+）这些平台差异（010 篇版本演进表里的坑），只有真机/真平台冒烟能兜住。
3. 手测清单兜住"自动化不经济"的部分：手感、音效、粒子观感。清单固定成文档，发版逐项打勾——冒烟管"坏没坏"，手测清单管"好不好"。

## 5. 三个真实场景

**场景一：回合结算函数的表驱动用例。** 策划调整属性克制系数，数值表三天一改。表驱动测试让"改公式 -> 跑测试 -> 全部边界用例红绿立现"变成十秒的事；一次改取整方向（floor 改 round）让"向下取整"用例变红，当场发现策划案与实现不一致——测试用例在这里兼任**数值策划案的机器可读版本**。

**场景二：wrapper 收敛后的 call 协议快照测试。** 重构 InventoryApi（改内部实现与参数命名），协议快照测试红了一条：`args: ["sword_01", 2]` 变成了 `args: [2, "sword_01"]`——参数顺序变了，而引擎侧 GDScript 的 `add_item(id, count)` 并没有同步。若没有快照，这个 bug 要等到运行时点击"拾取"才炸；有了快照，它在提交前被拦下。030 篇"call() 无编译期检查"的缺口，由这一层测试补上。

**场景三：发布前引擎内最小运行冒烟。** 三平台导出前的最后一步：每个平台的包启动后跑冒烟场景，日志里出现全 PASS 才签发。一次 Android 包冒烟 FAIL 在"battle core loads"——排查发现 npm 依赖的某库引用了 Android 不存在的 Node API（010 篇讲过 libnode 是完整 Node，但原生模块仍可能缺平台二进制）。冒烟的价值就是**把"能不能启动并走到核心逻辑"从"玩家发现"提前到"打包机发现"**。

## 6. 动手实践

**任务一：给一个纯函数配表驱动测试。** 挑出你项目里一个纯计算函数（没有 godot import 的），按第 2 节形态写 Vitest 表驱动用例，覆盖每个分支与至少一个边界。提示：找函数时先 grep `import.*from "godot"`——没出现在计算路径上的就是候选；若所有函数都 import 了 godot，先做"把引擎依赖推出计算路径"的小重构。

**任务二：给 wrapper 做 FakeBridge。** 按第 3 节实现 EngineBridge 接口与 FakeBridge，为你的一个 wrapper 类写协议快照断言；故意改错一个参数顺序，验证测试变红。提示：接口只收 `call(nodePath, method, ...args)` 一种形态就够；断言对象用 `toEqual` 整体比较，不要逐字段拼——快照的整体性就是它的价值。

**任务三：最小冒烟跑通。** 在场景里放一个挂 Smoke 脚本的节点，两个检查项（一个真一个假），运行后观察控制台标记与退出码；再把冒烟接进你的提交流程（手动跑或脚本跑）。提示：退出码在编辑器里看输出面板，命令行/CI 里看 `$?`；故意 FAIL 一次的目的是亲眼看失败形态，以后看到才认得出。

先自己操作，再对照参考实现：

<details>
<summary>任务一参考实现（保底伤害函数）</summary>

```typescript
// scripts/core/attack.ts —— 重构前：引擎依赖混进计算路径
import { Node } from "godot"

export function attackDamage(attacker: Node, defense: number): number {
  const atk = attacker.get("atk") as number      // 引擎读数混在公式里 -> 不可 Node 测试
  return Math.max(1, atk - defense)
}
```

```typescript
// 重构：数据进、结果出，引擎读取留在调用方
export function attackDamagePure(atk: number, defense: number): number {
  return Math.max(1, atk - defense)
}

// tests/attack.test.ts
import { describe, expect, it } from "vitest"
import { attackDamagePure } from "../scripts/core/attack"

describe("attackDamagePure", () => {
  it.each([
    { name: "正常压制", atk: 30, def: 10, want: 20 },
    { name: "刚好破防", atk: 10, def: 10, want: 1 },
    { name: "不破防保底", atk: 3, def: 10, want: 1 },
  ])("$name", ({ atk, def, want }) => {
    expect(attackDamagePure(atk, def)).toBe(want)
  })
})
```

```typescript
// 调用方：引擎读数一行，纯函数调用一行
const dmg = attackDamagePure(attacker.get("atk") as number, defenderDef)
```

要点：a) 重构动作只有一步——把"从节点读数"从公式里拎出去，公式变成"数进数出"；b) 三个用例覆盖 max(1) 的两个触发路径（相等/不破防）；c) 这就是本篇第 1 节纪律的落地：让逻辑变纯，测试就便宜了。
</details>

## 7. 小结

- 两层切分：纯 TS 逻辑 Vitest 秒级回归（进 CI），引擎行为冒烟 + 手测清单兜底（进发布流程）。
- 表驱动用例一个分支一条，数值表兼任策划案的机器可读版本；FakeBridge 替身测的是"我们发出的协议"，不是引擎语义。
- 冒烟三要素：标记行、退出码、最小装配；发布前三平台各跑一次，平台差异（node.dll、部署目标）只有真平台冒烟能兜。
- 诚实边界：本篇是工程增补实践，Gode 官方文档无测试主题；分层思想借自通用前端与 Godot 社区实践。

## 参考与致谢

- Vitest 官方文档：https://vitest.dev/guide/ （MIT 许可证）。describe/it/expect 与 it.each 用法依据官方文档整理。
- 分层与冒烟形态参考 Godot 社区无头测试实践与本项目 028-software-testing 模块的既有案例（打印标记 + 退出码门禁）；Gode 官方文档无测试主题，特此声明。
