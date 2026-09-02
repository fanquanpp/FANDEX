---
order: 700
title: Project References 与 Monorepo
module: 'typescript'
category: 前端技术
difficulty: advanced
description: tsc --build、project references 与大仓里的 TypeScript 组织。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'typescript/026-ModuleResolutionModernToolchains'
  - 'typescript/051-TypeScriptEngineeringConfig'
  - 'typescript/065-TscCompilerCommands'
prerequisites:
  - 'typescript/026-ModuleResolutionModernToolchains'
---

# Project References 与 Monorepo

当平台从单一网站长成"官网、购票端、管理后台、共享组件库、接口服务"并存的大仓时，一个巨型 tsconfig 会带来三个问题：改一行共享代码要全量重编译；包与包之间可以随意 import 边界形同虚设；类型检查与产物构建相互纠缠。Project References（工程引用）配合 `tsc --build` 正是官方给出的解法：把代码切分为独立编译单元，声明依赖图，按需增量构建。本篇覆盖引用结构与 composite 配置、增量构建、与 pnpm workspace 的协作、路径别名与 declaration map，以及循环引用问题。

## 前置知识

- [模块解析与现代工具链](/module/typescript/026-ModuleResolutionModernToolchains)：理解 bundler 与 node 两种解析模式是划分工程的前提。
- [TypeScript 工程化配置](/module/typescript/051-TypeScriptEngineeringConfig)：本篇的 tsconfig 划分建立在工程配置体系之上。
- [tsc 编译器命令](/module/typescript/065-TscCompilerCommands)：`tsc --build` 是普通 `tsc` 的构建编排增强版。

## 学习目标

- 能搭建 references 与 composite 的最小工程结构，并说明各字段的作用。
- 能使用 tsc --build 完成增量构建、清理与监听，解释 .tsbuildinfo 的角色。
- 能区分 pnpm workspace 管理的"依赖图"与 project references 管理的"编译图"，并让两者对齐。
- 能用 paths 与 declarationMap 实现跨包跳转源码的开发体验。
- 能识别并修复工程间循环引用与"引用了却没声明"两类问题。

## 一、Monorepo 的类型难题：为什么需要 Project References

设想大仓结构：`packages/shared`（类型与工具）、`packages/api-server`（Node 服务）、`packages/web-app`（购票前端）。若共享一个 tsconfig，`tsc` 会把所有源码视作一个整体：任何文件的改动都会触发全量类型检查，规模越大越慢；同时 web-app 可以随手 import api-server 的内部模块，架构边界毫无约束。

```text
fandex-monorepo/
  packages/
    shared/        # 共享类型与工具（被多个包消费）
    api-server/    # Node 接口服务
    web-app/       # 购票前端
  pnpm-workspace.yaml
  tsconfig.json    # 根配置：只做引用编排
```

Project References 的思路是"分而治之 + 依赖声明"：每个包是独立工程，有自己的 tsconfig 与输出；根工程通过 `references` 声明依赖方向。编译器由此获得三件事：精确的增量范围（只重编译受影响的下游）、明确的边界（未声明引用的包不可被 import）、以及顺序保证（先构建被依赖者）。

在 references 出现之前，大仓通常有三种替代方案：单一巨型 tsconfig（慢、无边界）、各包独立全量构建（无增量联动）、借助第三方任务编排工具串联构建脚本（配置分散、顺序靠人维护）。Project References 把"构建顺序"交给编译器原生理解，是类型层面唯一由官方支撑的方案；它与打包器并不冲突——tsc 负责类型与声明产物，bundle 交给 Vite、Webpack 或 esbuild。

## 二、project references 结构与 composite

被引用的工程必须开启 `composite: true`，它隐含三条规则：必须生成 `declaration`（.d.ts，供下游读取类型而无需重检源码）；`include`/`files` 必须明确覆盖全部源文件（不允许编译器从 import 反推范围）；构建会产生增量信息文件 `.tsbuildinfo`。

```json
// packages/shared/tsconfig.json：被引用方必须开启 composite
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true
  },
  "include": ["src"]
}
```

```json
// 根 tsconfig.json：只做引用编排，不直接编译任何源码
{
  "files": [],
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/api-server" },
    { "path": "packages/web-app" }
  ]
}
```

消费方的写法是把依赖包加入自己的 `references`。要点有三：根配置用 `"files": []` 保证自己零源码、纯编排；`references` 描述的是"编译时依赖我需要谁先就绪"；`rootDir` 与 `outDir` 的划分让 `.d.ts` 落到 dist，下游只认声明文件，从而获得真正的检查隔离。

`composite: true` 的隐含行为值得展开：它强制 `declaration` 与 `incremental`，且禁止 `noCheck` 之类的"只查不产出"配置——被引用工程必须产出下游可用的声明文件，这是检查隔离能成立的物理前提。也正因如此，composite 工程的 `include` 必须覆盖全部将被下游引用的源文件，漏写一个目录，下游就会得到"声明中引用了不存在的类型"级别的诡异报错。

```json
// packages/web-app/tsconfig.json：消费方声明对 shared 的依赖
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

## 三、tsc --build 增量构建

普通 `tsc` 不理解 references，必须使用 `tsc --build`（可简写 `tsc -b`）。它会拓扑排序整个引用图，检查每个工程的 `.tsbuildinfo`，只重编译"自己或上游变了"的工程；包管理器的递归构建脚本（如 `pnpm -r build`）从此可以退役，构建顺序完全交给编译器编排。

```bash
# 大仓内的日常构建命令
tsc --build            # 按 shared -> api-server -> web-app 的顺序构建
tsc --build --verbose  # 打印每个工程的构建顺序与耗时，排查构建图用
tsc --build --force    # 忽略增量状态全量重建（怀疑缓存损坏时使用）
tsc --build --clean    # 删除所有工程的输出与 .tsbuildinfo
tsc --build --watch    # 增量监听：上游文件变化时仅重建受影响工程
```

增量效果的量化感受：千文件级大仓中，改动 `shared` 里一个类型可能触发全量重建（上游变了，下游全部受影响），而只改 `web-app` 的组件则几秒内完成——这正是引用图的价值：把"改动影响面"变成显式的图计算。`.tsbuildinfo` 记录了文件哈希与依赖指纹，应加入 `.gitignore`，绝不提交进仓库，否则同事会拿到与你代码不匹配的过期增量状态。判断某个包为何被重建时，`--verbose` 输出中"Project 'x' is out of date"后的原因行（上游输出更新、自身文件哈希变化）就是答案。

`tsc --build` 也常被误解为"全量构建工具"。实际上它是两级增量的合成：包级看各工程的 `.tsbuildinfo`，文件级看内容哈希，两者共同决定最小重编译范围。配合 `--watch` 使用时，上游文件变化只会唤醒受影响的下游工程，开发态的等待时间可以被压到最低。

## 四、与 pnpm workspace 协作

pnpm workspace 与 project references 管理着两张不同的图：**依赖图**（谁安装谁的包，决定 node_modules 链接与运行时可用性）与**编译图**（tsc 按什么顺序生成 .d.ts）。两者必须指向同一方向，否则会出现"类型检查能过、运行时找不到模块"或反之的错位。

```yaml
# pnpm-workspace.yaml：声明大仓内的包（依赖图）
packages:
  - 'packages/*'
```

```json
// packages/web-app/package.json：以 workspace 协议消费内部包
{
  "name": "@fandex/web-app",
  "dependencies": {
    "@fandex/shared": "workspace:*"
  }
}
```

```json
// packages/shared/package.json：把类型入口指到声明文件
{
  "name": "@fandex/shared",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc --build"
  }
}
```

工程惯例是让两张图同时成立：`package.json` 中声明 `workspace:*` 依赖，对应 tsconfig 中声明 `references`。CI 上先 `pnpm install` 再 `tsc --build`，两条图各自校验。需要提防的是"只声明了其一"：只装依赖没写 references 时，tsc 会把 shared 当作普通 node_modules 包处理，源码级联动失效；只写 references 没装依赖时，构建通过但运行时解析失败。

moduleResolution 的选择还会影响 workspace 包的类型解析：使用 `bundler` 或 `node16` 模式时，TypeScript 会读取包的 `exports` 字段。内部包如果只写了 `main`/`types` 而没有 `exports`，在某些解析模式下可能出现"运行时正常、类型找不到"的问题；让入口声明与解析模式保持一致，是省去大量排查时间的细节。

## 五、路径别名与 declaration map

跨包开发体验有两个抓手。其一是 `paths` 别名：让 web-app 在**源码形态**下直接解析 `@fandex/shared`，无需先构建 shared 才能获得类型提示（配合打包器同样需要别名支持）。

```json
// packages/web-app/tsconfig.json：用 paths 指向 shared 的源码
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@fandex/shared": ["../shared/src/index.ts"]
    }
  },
  "references": [{ "path": "../shared" }]
}
```

其二是 `declarationMap`：生成 `.d.ts.map`，让"跳转定义"从声明文件直接跳到 shared 包的 `.ts` 源码，而不是停留在编译产物上。读源码、改公共类型时的体验差异巨大，几乎所有 TS 大仓都会开启它。

```json
// packages/shared/tsconfig.json（片段）：声明映射，让 IDE 直达源码
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

一个容易忽略的细节：`paths` 只影响 TypeScript 与配置了相应解析插件的打包器，Node 运行时并不认识它。因此 api-server 这类直接跑在 Node 上的包，发布或运行时仍需真实产物路径（`main`/`types` 指向 dist），或者引入 `tsx` 等支持别名的运行器。

还要区分"内部消费"与"对外发布"两种形态：内部包靠 paths 直连 src，追求源码级联动与最即时的类型反馈；对外发布的包则必须附带 dist 与声明文件，paths 仅作为开发态便利，绝不能进入发布产物的解析路径。两种形态在同一大仓中并存时，在包的 README 或构建脚本中写清各自的解析约定，是避免新成员踩坑的低成本手段。

## 六、常见循环引用问题

引用图是 DAG（有向无环图），循环会让"先构建谁"失去定义。典型事故是 web-app 引用 shared 之后，有人又把 web-app 的类型抽进了 shared——shared 反过来引用 web-app。

```json
// 反例：packages/shared/tsconfig.json 中出现了反向引用
{
  "compilerOptions": { "composite": true },
  "references": [{ "path": "../web-app" }]
}
```

```bash
tsc --build
# 报错：TS6202: Project references may not form a circular graph.
# Cycle detected: packages/shared -> packages/web-app -> packages/shared
```

修复思路是**下沉公共依赖**：把两边都需要的类型抽到更底层的包（例如 `packages/types`），让依赖链恢复单向：web-app -> shared -> types。第二类伪循环发生在文件级：shared 里 import 了 web-app 的常量仅为了取一个枚举值，此时应改为把该常量下沉或复制为类型字面量，而不是引入包依赖。

```text
修复后的依赖方向（单向无环）：
  web-app  ->  shared  ->  types
  api-server  ->  shared  ->  types
```

排查手段：`tsc --build --verbose` 打印拓扑顺序，遇循环会明确指出环路径；`madge` 之类的工具可以按文件级画出 import 环，配合 `--circular` 参数提前在代码评审中拦截。架构上预防比事后拆解更重要：约定"包的分层与引用方向"写入根目录文档，新包接入时按层归位，循环引用就失去了滋生的土壤。

## 易错点与最佳实践

1. **被引用工程忘记开 composite**。错误信息为"Referenced project ... must have setting composite: true"。修正：为所有被 references 指向的工程补齐 composite、declaration 与明确的 include。

2. **根配置漏写 `"files": []`**。根 tsconfig 若 include 了源码，会与子工程重复编译，产生两份产物与幽灵报错。修正：根配置只保留 references 与编译选项，`files` 置空。

```json
// 反例与修正：根 tsconfig.json
// { "include": ["packages/*/src"] }        // 反例：根工程吞下全部源码
{ "files": [], "references": [{ "path": "packages/shared" }] } // 修正：纯编排
```

3. **references 与 package.json 依赖不对齐**。只在一边声明会造成"能编译不能跑"或"能跑不能查"。修正：把"新增一个内部包依赖"固定为三处同步改动的清单——pnpm 依赖、tsconfig references、paths（如使用），并在模板仓库中提供脚手架命令一键完成。

4. **把 .tsbuildinfo 提交进仓库**。增量状态与本地路径、代码哈希绑定，跨机器提交必然产生诡异的重编译失效。修正：加入 .gitignore，CI 使用 --force 或干净检出。

5. **用 paths 直接指向 src 却关闭 declarationMap**。声明映射缺失时，跳转定义会落到 `dist/index.d.ts`，阅读体验断裂。修正：内部包统一开启 declarationMap，并确保 sourceMap 与构建产物同发布（或仅在开发态生成）。

## 本篇小结

- Project References 把大仓拆为带依赖声明的独立编译单元，换来增量构建、边界约束与顺序保证。
- composite 是被引用工程的门槛：强制 declaration、显式文件范围与 .tsbuildinfo 增量状态。
- `tsc --build` 按拓扑序构建引用图，--watch/--clean/--force 是日常三件套；tsbuildinfo 不入版本库。
- pnpm workspace 管依赖图，project references 管编译图，两张图必须同向对齐。
- paths 加 declarationMap 撑起跨包开发体验；循环引用靠公共类型下沉恢复单向依赖，分层约定是最有效的预防手段。

## 动手实践

1. **三包最小大仓**：从零搭建 types、shared、web-app 三包结构，配置 composite 与 references，验证只改 web-app 时 tsc --build 跳过上游。思路：用 --verbose 观察跳过日志；故意删除一个 .tsbuildinfo 对比重建范围。

2. **循环依赖手术**：构造 web-app 与 shared 互引的场景，触发 TS6202 后按"下沉 types 包"修复。思路：先画出现有依赖的箭头图，把互引文件中真正共享的声明抽离，最后用 madge 复查文件级环。

3. **CI 增量流水线**：编写脚本，检测本次 git 变更落在哪些包，仅对受影响子集执行构建。思路：以包目录前缀过滤变更文件，再沿 references 图求传递闭包；对比全量构建与增量构建的耗时数据。
