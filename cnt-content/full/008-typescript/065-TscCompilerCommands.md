---
order: 650
title: TypeScript tsc 编译命令速查手册
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 按场景速查 tsc 的全部高频命令：编译与检查、watch 与增量、工程构建、诊断排查，并区分 tsc 与打包器的职责边界。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'typescript/003-TypeScriptOverviewEnvSetup'
  - 'typescript/051-TypeScriptEngineeringConfig'
  - 'typescript/060-TsconfigStrictMode'
  - 'typescript/068-TypeScript6And7CompilerEvolution'
prerequisites:
  - 'typescript/003-TypeScriptOverviewEnvSetup'
---

## 0. 学习目标（可验证）

- [ ] 能区分 tsc 的两种工作模式：命令行传文件模式与 tsconfig 项目模式
- [ ] 能用 `tsc --noEmit`、`tsc -w`、`tsc -b` 完成检查、监听与工程构建三类任务
- [ ] 能说出"哪些命令做类型检查、哪些命令产出文件"，避免与打包器职责混淆
- [ ] 会用 `--explainFiles`、`--showConfig`、`--listFiles` 排查配置问题

## 1. 一句话理解

> `tsc` 是 TypeScript 的编译器命令行工具：给它文件，它编译文件；给它 `tsconfig.json`，它按配置编译整个项目。日常开发里它的两大角色是"类型检查器"（CI 里跑 `--noEmit`）和"声明文件产出器"，真正的 JS 产物大多交给打包器生成。

## 2. 两种工作模式（先分清这个）

```bash
# 模式一：命令行直接传文件（不看 tsconfig）
tsc main.ts                    # 编译单个文件，产出 main.js
tsc src/a.ts src/b.ts          # 编译多个文件

# 模式二：项目模式（读取 tsconfig.json）
tsc                            # 编译当前目录的 tsconfig.json
tsc -p ./packages/core         # -p 指定配置文件或所在目录
```

**讲解：**

1. 命令行传文件时，tsc **不读取 tsconfig.json**，所有选项都要在命令行给，适合单文件试验；
2. 项目模式读 tsconfig（含 `extends` 继承链），是工程的标准用法；
3. TypeScript 6.0 起，tsconfig.json 存在时再在命令行传文件会直接**报错**（TS5112）；确要临时合并配置可用 `tsc --ignoreConfig main.ts`（详见 `typescript/068-TypeScript6And7CompilerEvolution`）。

## 3. 环境初始化与版本确认

```bash
npx tsc --init                 # 生成 tsconfig.json（5.9 起模板大幅精简）
npx tsc --init --strict --module nodenext   # 生成时附带初始选项
npx tsc -v                     # 查看版本，如 Version 7.0.2
npm install -D typescript      # 项目内安装（推荐，锁定版本）
```

**讲解：**

1. `--init` 生成的配置自带解释注释；5.9 重写后只保留推荐默认值，其余项指向官方文档；
2. 项目内安装的 `typescript` 保证团队成员与 CI 用同一编译器版本，全局安装仅推荐练手；
3. `tsc --init` 可多次执行前先备份——它会覆盖已有 tsconfig.json。

## 4. 类型检查：CI 与本地的第一命令

```bash
tsc --noEmit                   # 只检查类型，不产出任何文件
tsc -p . --noEmit              # 项目模式下等价写法
tsc --noEmitOnError            # 有类型错误时不写出 JS（默认会写）
tsc --declaration --emitDeclarationOnly   # 只产出 .d.ts，不产出 .js
```

**讲解：**

1. `--noEmit` 是 CI 类型检查门禁的标准命令：全量检查、零副作用，配合 `tsc -v` 可以在日志里确认编译器版本；
2. tsc 默认"即使有类型错误也产出 JS"（错误只是报告）；`--noEmitOnError` 让错误阻断产出，语义更接近传统编译器；
3. 库项目发布前用 `--emitDeclarationOnly` 单独产出声明文件，配合打包器产出的 JS。

## 5. 编译产出控制

```bash
tsc --outDir dist              # 产物输出到 dist 目录
tsc --sourceMap                # 生成 .map，便于调试映射回 TS 源码
tsc --removeComments           # 产物中剔除注释
tsc --declaration              # 同步产出 .d.ts
```

```jsonc
// 产物控制通常写进 tsconfig 而不是命令行
{
  "compilerOptions": {
    "outDir": "dist",
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true     // .d.ts 的 source map，monorepo 跳转友好
  }
}
```

**注意——`--outFile` 已成历史**：TS 5.x 的 `--outFile`（把多个模块合并进单个 JS）在 **6.0 已被移除**，合并/打包请交给 esbuild、Rollup 等打包器。老脚本里见到 `tsc a.ts b.ts --outFile bundle.js` 要直接改用打包器。

## 6. 监听与增量

```bash
tsc -w                         # watch 模式：文件变更即重编译（等价 --watch）
tsc -w --preserveWatchOutput   # watch 时不清屏，日志可滚动回看（CI 日志友好）
tsc --incremental              # 增量编译：缓存到 .tsbuildinfo，二次构建更快
tsc --incremental --tsBuildInfoFile .cache/ts.tsbuildinfo
```

**讲解：**

1. watch 模式默认每次输出前清屏，排错时加 `--preserveWatchOutput` 保留历史输出；
2. `.tsbuildinfo` 是纯缓存文件，应加入 `.gitignore`；删除它即可强制回到全量构建；
3. watch 只服务开发体验；CI 里仍然用一次性的 `tsc --noEmit`，避免缓存状态差异。

## 7. 工程构建：tsc -b 与项目引用

```jsonc
// 根 tsconfig.json：声明对子项目的引用
{
  "references": [{ "path": "./packages/shared" }, { "path": "./packages/app" }]
}
```

```bash
tsc -b                         # 按依赖拓扑构建所有引用的项目（等价 --build）
tsc -b --dry                   # 演练：显示将构建什么，但不写盘
tsc -b --clean                 # 清理各项目的构建产物
tsc -b --force                 # 无视缓存强制全量构建
tsc -b --watch                 # 项目引用下的监听构建
```

**讲解：**

1. `tsc -b` 是 monorepo 的原生构建方案，只重建"过期"的子项目（详见 `typescript/071-ProjectReferencesMonorepo`）；
2. 被引用的项目必须开启 `composite: true`，这是 `-b` 能判断增量的前提；
3. TS 7.0 为 `-b` 重写了并行的 builders 实现（`--builders N` 可调并行度），大仓构建进一步提速。

## 8. 高频选项速查（按用途分组）

```bash
# 模块系统与目标：决定"产出什么形态的 JS"
tsc --module esnext            # 保留 ES 模块语法（打包器项目常用）
tsc --module nodenext          # 跟随最新 Node 的模块互操作规则
tsc --module node18            # 冻结为 Node 18 的互操作行为（5.8+）
tsc --target es2022            # 语法降级目标（6.0 起最低 ES2015）
tsc --moduleResolution bundler # 解析策略：bundler / node10(弃用) / node16 / nodenext / classic(已移除)
tsc --lib es2022,dom           # 可用的内置类型库

# 严格检查：决定"多严"
tsc --strict                   # 一组严格选项的总开关
tsc --noImplicitAny --strictNullChecks --noUncheckedIndexedAccess   # 常用单项
tsc --exactOptionalPropertyTypes --noImplicitOverride               # 进阶单项

# JSX 与特殊语法
tsc --jsx react-jsx            # react / react-jsx / preserve / react-native
tsc --erasableSyntaxOnly       # 只允许可擦除语法（Node 原生类型剥离友好，5.8+）
tsc --verbatimModuleSyntax     # import/export 原样保留，强制用 import type 标注纯类型导入
```

```jsonc
// 路径别名（写在 tsconfig 里）
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["packages/core/src/*"]
    }
  }
}
```

**讲解：**

1. `module`/`moduleResolution`/`target` 三件套决定产出的"形态"，`strict` 家族决定检查的"力度"，排错时先确认自己改的是哪一类；
2. `verbatimModuleSyntax` 与"保留 import 断言"无关——它管的是**导入语句的形态原样保留**（类型导入必须写 `import type`）；
3. 完整的选项语义与推荐组合见 `typescript/051-TypeScriptEngineeringConfig` 与 `typescript/060-TsconfigStrictMode`。

## 9. 诊断与排查命令

```bash
tsc --showConfig               # 展开 extends 继承后的"最终生效配置"
tsc --explainFiles             # 解释每个文件"为什么被包含"（体积来源、@types 泄漏）
tsc --listFiles                # 列出全部参与编译的文件
tsc --diagnostics              # 输出编译耗时、内存、文件数等统计
tsc --noCheck                  # 跳过类型检查但仍完整产出（5.6+，拆分构建与检查）
```

**讲解：**

1. "编译为什么这么慢/产物为什么这么大"先跑 `--explainFiles`：测试文件、重复的 @types 包、被 `main` 字段带进来的依赖一览无余；
2. `--showConfig` 是排查 `extends` 覆盖问题的第一工具——你看到的注释里的配置不一定生效，展开后的才是事实；
3. `--noCheck` 允许"先快速出产物、后台再补检查"的流水线，但 CI 门禁仍必须是完整检查。

## 10. tsc 与打包器的分工

| 职责 | 负责方 | 原因 |
| --- | --- | --- |
| 类型检查 | tsc（`--noEmit`） | 只有完整类型系统才能做检查 |
| 代码转换/压缩/按需加载 | Vite、esbuild、SWC | 快，且支持 HMR 等开发特性 |
| `.d.ts` 产出 | tsc（`declaration`）或打包器插件 | tsc 直接产出最可靠；隔离声明可用 `isolatedDeclarations` |
| 多模块合并 bundle | 打包器 | `--outFile` 已移除，tsc 不做打包 |

**讲解：** Vite 等工具开发态用 esbuild 转译 TS（不做类型检查），所以"浏览器不报错"不等于"类型正确"——CI 的 `tsc --noEmit` 才是类型层面的最终裁决。

## 11. 6.0/7.0 视角：命令怎么变

1. **命令形态不变**：7.0（Go 原生实现）仍是 `tsc` 命令，`--noEmit`、`-w`、`-b` 全部照旧，典型全量检查提速 8-12 倍；
2. **默认值变了**：6.0 起 `strict` 默认开启、`target` 默认当年年度 ES 版本、命令行文件与 tsconfig 不可混用——依赖旧默认的脚本要显式补参数；
3. **双轨工具**：迁移期可用 `@typescript/typescript6` 提供的 `tsc6` 与 7.x 的 `tsc` 并行比对（详见 `typescript/068-TypeScript6And7CompilerEvolution`）。

## 12. 常见陷阱

**陷阱 1：以为 tsc 会打包。** `tsc` 按入口逐文件转译，不处理打包、压缩与依赖树摇动；需要 bundle 时用打包器，tsc 只负责检查与声明产出。

**陷阱 2：CI 忘记 `--noEmit`。** `tsc` 在 CI 上会写出 dist 目录，既慢又可能覆盖产物；检查门禁固定写 `tsc --noEmit`。

**陷阱 3：watch 不加 `--preserveWatchOutput`。** 默认清屏导致 CI/远程终端日志丢失，报错"一闪而过"。

**陷阱 4：命令行选项与 tsconfig "打架"。** 命令行显式给出的选项会覆盖 tsconfig（如 `tsc -p . --module commonjs`），但仅限少数白名单选项；拿不准就用 `--showConfig` 看最终值。

## 13. 动手试试

### 入门版（必做）

1. 新建空目录，`npm i -D typescript` 后依次执行 `npx tsc --init`、`npx tsc -v`、`npx tsc --noEmit`，观察三个命令的输出；
2. 在 TS 文件里写一行 `const x: number = "oops";`，跑 `npx tsc --noEmit`，确认报错位置与错误码（TS2322）；
3. 把 `--showConfig` 加到 `tsc --init` 生成的项目上，对照展开后的配置。

### 进阶版（选做）

1. 给项目加 `tsc -w --preserveWatchOutput`，故意改错类型再改回来，观察增量输出；
2. 在有两个 `references` 的最小 monorepo 上跑 `tsc -b --dry`、`tsc -b --force`，对比缓存命中时的构建清单；
3. 用 `--explainFiles` 找出项目里"不该参与编译"的文件，并在 tsconfig 中排除它们。

## 14. 小结

**初学者记住这三点**：

1. `tsc --init` 建配置，`tsc --noEmit` 做检查，`tsc -w` 边写边查——起步只要这三条；
2. tsc 管"检查"和"声明产出"，不管打包；产物交给打包器；
3. 报配置问题时先跑 `tsc --showConfig` 和 `tsc --explainFiles`，让编译器告诉你"它眼里的事实"。

**进阶者还需注意**：

- `--outFile` 已随 6.0 移除、命令行文件与 tsconfig 不可混用（`--ignoreConfig` 除外）、`moduleResolution: node10/classic` 已弃用或移除——老脚本迁移时逐一核对；
- CI 门禁用一次性 `--noEmit` 全量检查，本地开发用 watch/增量，`--noCheck` 只用于"产物先行"的流水线；
- 升级到 TS 7 后命令不变、默认并行（`--checkers`/`--builders` 可调），老 CI 脚本无需改动即可享受提速。
