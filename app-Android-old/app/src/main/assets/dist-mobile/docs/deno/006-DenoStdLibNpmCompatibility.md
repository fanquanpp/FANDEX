# 标准库与 npm 兼容

Deno 的依赖管理只有一句话：依赖就是 URL 或包名，写在 import 顶部，首次运行自动下载并缓存。这句话背后是三种导入来源（jsr:、npm:、node:）、一份集中配置（deno.json 的 imports 映射）和一个保证一致性的锁文件（deno.lock）。本篇继续用"虚拟歌手音乐平台"做场景：为歌姬档案、应援色配置与歌曲工具函数选依赖、装依赖、迁依赖。读完你应该能回答三个问题——从哪里拿包、版本锁在哪里、Node 项目怎么搬过来。

## 前置知识

- [Deno 快速入门：导入、标准库与测试](/deno/002-DenoQuickStart)：已经用 `npm:` 导入装过依赖，理解"首次运行自动下载缓存"的模式。
- [权限模型与安全实践](/deno/003-DenoPermissionsSecurity)：知道 `--allow-read`、`--allow-net` 的含义，本篇示例的读写与网络操作都依赖它。
- [进阶学习路线图](/deno/005-AdvancedRoadmap)：了解本篇在"依赖管理"一站中的位置与目标。

## 学习目标

1. 能说出 jsr:、npm:、node: 三种导入来源的差异，并给出选型规则。
2. 会用 deno.json 的 imports 字段集中管理依赖版本，让源码只写裸说明符。
3. 掌握 @std/path、@std/uuid、@std/fmt 等常用标准库的实际用法。
4. 能把一个 Node.js 项目按最短路径迁移到 Deno 运行。
5. 理解 deno.lock 锁文件在团队协作与 CI 中的作用。

## 1. 三种导入来源：jsr:、npm:、node:

| 来源 | 内容 | 形态 | 典型场景 |
| --- | --- | --- | --- |
| `jsr:@std` | Deno 官方标准库与 JSR 生态 | TypeScript 源码直发 | 路径、UUID、CSV 等基础能力 |
| `npm:` | 整个 npm 仓库 | 编译后 JS + 类型包 | Hono、zod 等框架与业务包 |
| `node:` | Node 内置模块 | 运行时内置 | fs、path、crypto 等迁移场景 |

选型再加一条决策流程：先问"标准库有没有"（多数基础能力都有），再问"JSR 上有没有官方维护的包"，最后才落到 npm——顺着这条链找下去，依赖的类型质量与维护质量都更有保障。

```typescript
// imports.ts —— 三种导入来源各取所长
import { join, extname } from "jsr:@std/path@1"      // JSR：官方标准库，TS 源码即发布
import { Hono } from "npm:hono@4"                    // npm：直接复用 npm 生态
import { readFile } from "node:fs/promises"          // node:：Node 内置模块加前缀

// 读取演出曲目单，并打印封面图路径的扩展名
const setlist = await readFile("setlist.txt", "utf-8")
console.log("曲目单前 20 字：", setlist.slice(0, 20))
console.log("封面路径：", join("assets", "singers", "miku", "cover.png"),
  "扩展名：", extname("cover.png"))

// npm 包照常实例化：Hono 应用挂到内置服务器
const app = new Hono()
app.get("/", (c) => c.text("虚拟歌手音乐平台"))
console.log("路由已注册：GET /")
```

```bash
deno run --allow-read imports.ts
```

**讲解：**

1. `jsr:@std/path@1` 来自 JSR（Deno 官方包仓库），直接发布 TypeScript 源码，不需要额外的类型包，`@1` 表示接受 1.x 内的最新版本。
2. `npm:hono@4` 让 Deno 内置的 npm 解析器处理 Node 生态包，没有 package.json 也能直接运行。
3. `node:` 前缀是 Node 内置模块的显式写法，迁移旧代码时把 `import fs from "fs"` 补上前缀即可。
4. 选型规则一句话：基础能力优先 `jsr:@std`，框架与业务包用 `npm:`，Node 内置能力加 `node:` 前缀。
5. 类型体验是一致的：无论 jsr 还是 npm 来源，Deno 都能就地解析 TypeScript 源码与类型声明，类型提示开箱即用，不需要再装 @types 系列——类型与实现永不错位。

## 2. deno.json 的 imports 映射与锁文件

把版本号散落在每个 import 里是反模式：升级要改 N 处，团队成员看到的版本也可能不同。deno.json 的 imports 字段把"依赖名 -> 实际地址"集中成一张映射表，源码里只写裸说明符。

```json
// deno.json —— 依赖版本集中在 imports，权限固化在 tasks
{
  "imports": {
    "@std/path": "jsr:@std/path@^1.0.0",
    "@std/csv": "jsr:@std/csv@^1.0.0",
    "hono": "npm:hono@^4.6.0"
  },
  "tasks": {
    "dev": "deno run --allow-net --allow-read server.ts"
  }
}
```

```typescript
// server.ts —— 源码只写裸说明符，版本由 deno.json 决定
import { Hono } from "hono"
import { parse } from "@std/csv"

const app = new Hono()

// /singers 接口：解析歌姬应援色 CSV（miku,#39c5bb）并返回 JSON
app.get("/singers", async (c) => {
  const raw = await Deno.readTextFile("singers.csv")
  const rows = parse(raw, { skipFirstRow: true }) // 跳过表头行
  return c.json(rows)
})

Deno.serve(app.fetch)
```

```bash
deno add jsr:@std/uuid   # 增加依赖：自动写入 deno.json 的 imports
deno task dev            # 用任务启动，权限参数不再散落在命令行
deno info                # 查看完整依赖树与缓存位置
deno install --frozen    # 严格按锁文件安装，用于 CI
```

**讲解：**

1. imports 是一张别名表：源码写 `hono`，运行时解析成 `npm:hono@^4.6.0`，升级只改 deno.json 一处。
2. `deno add` 是推荐的加依赖方式，避免手写映射出错；删除时手工移除即可，删除后记得跑一次 `deno test` 确认没有隐藏引用。
3. 首次运行会生成 `deno.lock`，记录每个依赖的精确版本与完整性哈希。它必须提交进仓库，保证团队与 CI 解析到同一份依赖；`--frozen` 模式下锁文件与 imports 不一致会直接报错而不是静默更新。
4. `deno task` 还支持任务串联（如 `deno task check && deno task test`），tasks 事实上成为仓库的"命令文档"——新同事打开 deno.json 就知道这个项目怎么跑，不必翻 README 对命令。
5. `deno info` 输出的每一层依赖都带完整性校验，被篡改的包会在安装期直接报错——供应链安全在这里是默认行为而不是附加配置。

## 3. 常用标准库实操

标准库覆盖了后台开发的常用底座，这里挑三个出镜率最高的演示。

```typescript
// std_demo.ts —— 标准库三件套：路径、UUID、终端着色
import { join, extname } from "@std/path"
import { v4, validate } from "@std/uuid"
import { red, cyan, bold } from "@std/fmt/colors"

// 1) 拼接歌姬封面路径：跨平台安全，Windows 上也能得到正确分隔符
const cover = join("assets", "singers", "miku", "cover.png")
console.log("封面：", cover, "扩展名：", extname(cover))

// 2) 为购票订单生成 UUID，并在查询接口校验合法性
const orderId = v4.generate()
console.log("订单号：", orderId, "格式合法：", validate(orderId))

// 3) 终端里按应援色高亮输出歌姬名：teto 粉、miku 青绿
console.log(`打榜第一名：${bold(cyan("miku"))}，第二名：${red("teto")}`)
```

```bash
deno run --allow-read std_demo.ts
```

**讲解：**

1. `@std/path` 的 join/normalize/extname 处理路径差异，比手工拼字符串可靠；前缀 `@std/` 是标准库的命名约定。
2. `@std/uuid` 提供 v1 到 v7 各版本生成器，`v4.generate()` 常用于订单号，`validate()` 在接收外部 id 时先验一遍。
3. `@std/fmt/colors` 让 CLI 工具输出可读的彩色日志，原理是 ANSI 转义码，在非终端环境自动降级。
4. CSV 这类"榜单导入"场景交给 `@std/csv`：一个 parse 调用把文本变成二维数组，配合 cast 选项自动转换数字类型。

```typescript
// csv_demo.ts —— @std/csv：把打榜 CSV 导入成结构化数据
import { parse } from "@std/csv"

const raw = await Deno.readTextFile("ranking.csv") // 名次,歌曲,票数
const rows = parse(raw, { skipFirstRow: true, cast: true })

// cast: true 让 "98210" 变成数字 98210，排序不再按字符串比较
const top = [...rows].sort((a, b) => b[2] - a[2])[0]
console.log(`榜首：${top[1]}，${top[2]} 票`)
```

5. 完整清单见 `jsr.io/@std`：还有 @std/yaml（配置）、@std/streams（流处理）、@std/encoding（Base64 等）——需要什么先查标准库再找第三方。
6. 版本范围的两层分工：imports 里写 `^1.0.0` 这类范围管"兼容性"，锁文件落精确版本管"可复现"——范围允许升级，锁文件冻结结果，二者配合而非二选一。
7. deno task 的命令天然跨平台：同一份 tasks 配置在 Windows、macOS、Linux 上行为一致，团队不必为不同系统维护多套脚本。

## 4. 从 Node 项目迁移的最短路径

迁移的总原则是"先跑通，再收敛"：先用最宽的权限让项目动起来，再逐项收紧权限、整理依赖。

```text
迁移三步：
1. 内置模块补 node: 前缀；npm 依赖原样保留，Deno 直接支持 package.json
2. deno task 替代 npm scripts，权限写入 tasks
3. 渐进把依赖迁到 deno.json imports；测试换成 deno test
```

```json
// deno.json —— 由 package.json 平移而来的最小配置
{
  "nodeModulesDir": "auto",
  "imports": { "hono": "npm:hono@4" },
  "tasks": {
    "dev": "deno run --allow-net --allow-read --allow-env server.ts",
    "test": "deno test --allow-net=localhost"
  }
}
```

```typescript
// server.ts —— 迁移后的入口：差异只有 node: 前缀
import { readFile } from "node:fs/promises"
import { Hono } from "hono" // 映射到 npm:hono，写法不变

const app = new Hono()

app.get("/setlist", async (c) => {
  const raw = await readFile("setlist.txt", "utf-8")
  return c.text(raw)
})

Deno.serve(app.fetch)
```

```typescript
// migrate_diff.ts —— 常见迁移差异速查
// 1) __dirname：Node 有全局变量，Deno 从 import.meta.url 推导
const here = new URL(".", import.meta.url).pathname

// 2) 命令行参数：Deno 推荐用 Deno.args（process 对象在兼容层也可用）
const singer = Deno.args[0] ?? "miku"

// 3) 环境变量：读取前确认任务里给了 --allow-env
const env = Deno.env.get("VKEY_ENV") ?? "dev"

console.log("脚本目录：", here, "歌姬：", singer, "环境：", env)
```

```bash
deno run -A server.ts   # 第一步用 -A 跑通，定位问题时不被权限干扰
deno lint               # 检查 node: 前缀等迁移类问题
deno test               # 测试零安装即可运行，替换 jest 时逐文件迁移
```

| Node 侧 | Deno 侧 | 迁移说明 |
| --- | --- | --- |
| package.json scripts | deno.json tasks | 命令与权限集中登记 |
| package.json dependencies | deno.json imports | 版本映射统一管理 |
| node --version / nvm | 不需要 | 单一运行时，无多版本切换 |
| jest / ts-node | deno test | 测试器与 TS 运行内置 |

**讲解：**

1. Deno 2 兼容 package.json 与 node_modules：`nodeModulesDir: "auto"` 让依赖照常落到 node_modules，React、Vite 这类工具链项目不必一刀切重写。
2. 内置模块的绝大多数 API 行为与 Node 一致，迁移时优先看报错而不是猜；`deno lint` 会提示可自动修复的写法。
3. `-A` 只用于排查，跑通后按 [权限模型与安全实践](/deno/003-DenoPermissionsSecurity) 的方法把权限收敛到最小集合，写进 tasks 固化。
4. 迁移完成的验收是"三件套全绿"：`deno fmt --check`、`deno lint`、`deno test` 全部通过后，再清理 Node 工具链残留（jest.config、babel 配置等），避免两套体系并存。
5. 迁移收尾把权限清单与依赖清单写进 README：后来者应当能从文档知道"为什么是这些权限"，而不是靠口头约定。

## 5. 依赖缓存的运行机制

"首次运行自动下载"之后，依赖去了哪里、何时会重新下载，决定了团队排障的效率。Deno 的依赖不进项目目录，而是统一落入全局缓存。

```bash
deno cache server.ts              # 只下载并编译依赖，不执行业务代码
deno run --cached-only server.ts  # 禁止联网取包：缓存缺失立即报错
```

**讲解：**

1. 缓存目录由 `DENO_DIR` 环境变量控制（Windows 默认 `%LOCALAPPDATA%\deno`），内部按来源分仓：npm 注册表缓存、JSR 模块缓存与远程 URL 模块缓存各管各的。
2. `deno cache` 是 CI 的预热步骤：先在缓存步骤跑一次，后续 test/check 全部命中缓存，不再发网络请求。
3. `--cached-only` 把"缓存缺失"从隐性等待变成显性失败：CI 上用它验证锁文件与缓存是否完备，离线环境用它防止脚本悄悄拉包；配合 CI 的缓存预热，整条链路可以完全离线复现。
4. deno.json 配置 `"nodeModulesDir": "auto"` 时，npm 依赖会按 Node 习惯落到项目的 node_modules（内部仍是缓存硬链接），兼容依赖 node_modules 布局的工具链。
5. 缓存与安全模型联动：即便某个依赖被投毒，它依然受权限系统约束——读不到未授权的文件、连不了未授权的网络。这也是"先想权限、再写代码"的又一重意义。
6. 排查"本地能跑 CI 不行"的固定三步：`deno info` 看依赖来源、`deno cache` 重置缓存、对照 deno.lock 核对版本——绝大多数环境差异都能在这三步内定位。

## 易错点与最佳实践

1. **版本号散落在源码里**：每个 import 都写 `npm:hono@4.6.3`，升级要全仓搜索替换，团队成员版本还可能不一致。版本集中在 deno.json：

```typescript
// 错误：版本写死在源码，出现多份不同版本
// import { Hono } from "npm:hono@4.6.3"
// 正确：源码写裸说明符，版本由 imports 映射决定
import { Hono } from "hono"
```

2. **忘记提交 deno.lock**：锁文件没进仓库，CI 与同事各自解析出新版本，出现"我这台是好的"。锁文件必须入库，CI 用冻结模式安装：

```bash
# 错误：.gitignore 里排除了 deno.lock，版本随时间漂移
# echo deno.lock >> .gitignore
# 正确：锁文件入库，CI 严格按锁安装
deno install --frozen
```

3. **继续用 deno.land/x 的 URL 导入**：这是 Deno 1.x 的遗产，无锁文件保障、无版本范围控制。新代码一律换成 `jsr:` 或 `npm:`，并在 deno.json 里映射。

4. **生产环境用 `-A` 全权限**：图省事全开权限会让安全模型形同虚设。生产命令按最小权限枚举，例如 `deno task` 里只给 `--allow-net=:8000` 与 `--allow-read=./assets`，权限清单本身就是一份安全文档。

5. **锁文件冲突粗暴重新生成**：合并冲突后直接删掉 deno.lock 重新生成，会让既有依赖的版本锁定信息全部丢失，等价于一次全量升级。正确做法是解决冲突后保留已有条目，只让新增依赖重新解析，并用 `deno install --frozen` 验证结果。

## 本篇小结

1. 三种导入来源各司其职：`jsr:@std` 是官方标准库（TypeScript 源码直发），`npm:` 兼容整个 npm 生态，`node:` 显式引用 Node 内置模块。
2. deno.json 的 imports 是唯一的版本登记处，源码只写裸说明符；`deno add` 负责登记，`deno info` 查看依赖树。
3. deno.lock 记录精确版本与哈希，必须提交进仓库；CI 用 `deno install --frozen` 保证"锁了就不许变"。
4. Node 项目迁移走"先跑通再收敛"：`node:` 前缀补全、tasks 替代 scripts、`nodeModulesDir` 兼容现有工具链，最后逐步收敛权限。
5. 遇到"这个能力有没有现成包"的问题，先查标准库 `@std`，再查 JSR 与 npm，最后才考虑自己造轮子——造之前在 issue 里写清楚为什么现有包都不合适。

## 动手实践

1. **依赖整理**：给一个散落着 URL 导入的小脚本做迁移——把 `https://deno.land/x/xxx` 换成 `jsr:` 并登记到 deno.json imports。提示：迁移后运行 `deno info` 确认依赖树只有映射表里的来源。
2. 动手实验**：删除 deno.lock 后分别用 `deno install` 与 `deno install --frozen` 安装，观察行为差异；再把 deno.lock 加入 .gitignore 思考 CI 上会发生什么。提示：--frozen 在无锁文件时也会直接失败。顺手把两次的失败信息抄进笔记，加深印象。
3. **Node 项目移植**：找一个只有两三个依赖的 Node CLI 脚本（比如批量重命名封面图的工具），按"先 -A 跑通、再收敛权限"的步骤迁到 Deno，并把 npm scripts 改写成 deno tasks。提示：`import ... from "node:fs"` 加前缀是第一个要过手的差异。迁移完成后写下三条最大的惊喜与三条最大的阻力，沉淀成自己的迁移清单。
