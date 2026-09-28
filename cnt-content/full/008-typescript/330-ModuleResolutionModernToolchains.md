---
order: 340
title: 模块解析策略：import 路径是怎么找到文件的
module: 'typescript'
category: '前端技术'
difficulty: intermediate
description: 从三个「Cannot find module」真实报错入手，讲 TS 模块解析：bundler/node16/nodenext 的选择、package.json 的 types 与 exports、paths 别名，以及「编译器找到了、打包器没找到」的错位排查。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/290-NamespaceModule'
  - 'typescript/320-ImportTypeVerbatimModuleSyntax'
  - 'typescript/300-DeclarationFileWriting'
  - 'typescript/350-TypeScriptEngineeringConfig'
prerequisites:
  - 'typescript/290-NamespaceModule'
  - 'typescript/320-ImportTypeVerbatimModuleSyntax'
---

## 0. 真实场景：三连报错

接手 FANDEX 仓库的第一周，你可能连吃三个报错：

```text
1. Cannot find module '../utils/format'          // 文件明明就在那
2. Could not find a declaration file for 'left-pad'
3. Module '"@company/ui"' has no exported member 'Button'   // 运行时有，类型里没有
```

三个报错都不出在「类型怎么写」，而出在**解析**：import 语句里的字符串怎么映射到磁盘文件与类型声明。这条路径的规则由 tsconfig 的 `moduleResolution` 决定——选错策略，报错千奇百怪。

## 1. 一句话理解

> 模块解析 = 编译器把 `import x from 'spec'` 里的 spec 变成「某个文件里的某个声明」的过程。`bundler` 模式模仿 Vite/esbuild（能省略扩展名、认 exports 字段），`node16`/`nodenext` 模仿 Node 原生 ESM（相对路径必须带扩展名）。**解析策略必须和你真实的运行/构建环境一致**，不一致就是全部怪异报错的根源。

## 2. 动手：按报错逐个排查

### 2.1 报错一：相对路径找不到文件

```text
Cannot find module '../utils/format'
```

排查顺序（十有八九命中前两条）：

1. **路径本身**：大小写（Windows 不敏感、Linux 敏感，CI 上炸本地不炸的经典）、层级、扩展名；
2. **moduleResolution 与导入风格不匹配**：`nodenext` 下相对导入必须写 `.js` 扩展名（见[命名空间与模块](/typescript/290-NamespaceModule) 5.2 节）；Web 项目想省扩展名就得用 `bundler`；
3. **文件在 include 之外**：tsconfig 的 include 没覆盖到那个目录。

FANDEX 根 tsconfig 面向 Astro（底层 Vite），解析走的 `bundler`：允许省扩展名、认 package.json 的 `exports`——与构建器的真实行为对齐，这是「选策略」的示范：**谁执行你的代码，就模仿谁**。

| 值 | 模仿谁 | 典型场景 |
| --- | --- | --- |
| `bundler` | Vite/esbuild/webpack | 前端应用（FANDEX、React/Vite 项目） |
| `node16` / `nodenext` | Node 原生 ESM/CJS | Node 直跑的服务、CLI |
| `node10`（旧名 `node`） | 老版 Node CJS | 老项目维护；新项目别用 |

### 2.2 报错二：包没有声明文件

```text
Could not find a declaration file for module 'left-pad'
```

编译器按固定顺序找类型：

```text
import 'left-pad'
  1. node_modules/left-pad/package.json 的 "types" / "typings" 字段
  2. node_modules/left-pad 自带的 index.d.ts
  3. node_modules/@types/left-pad（DefinitelyTyped 社区声明）
  4. 都没有 → 报错（noImplicitAny 下）
```

处置：先 `pnpm add -D @types/left-pad`；@types 没有，就自己写 `declare module 'left-pad'`（写法见[声明文件编写](/typescript/300-DeclarationFileWriting)）；纯 `any` 顶一阵的话，加一句 `// @ts-expect-error 该包无类型` 比全局关检查诚实。

### 2.3 报错三：包的「门面」与「内堂」不一致

```text
Module '"@company/ui"' has no exported member 'Button'
```

现代包用 `package.json` 的 `exports` 字段控制「从外面能看到什么」：

```jsonc
// @company/ui 的 package.json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",   // 类型入口
      "default": "./dist/index.js"    // 运行时入口
    },
    "./icons": {                      // 子路径 @company/ui/icons
      "types": "./dist/icons.d.ts",
      "default": "./dist/icons.js"
    }
  }
}
```

`exports` 存在时，**没列出来的路径全部禁入**——`@company/ui/src/internal` 会被拒之门外，无论文件是否存在。上面这个报错多半是：运行时入口有 Button（新版本），types 指向的旧 `.d.ts` 没同步；或 `types`/`default` 指向了两个不同构建产物。检查包的 `exports` 两个字段是否指向同版本的产物，是维护内部包的必修课。

## 3. paths：仓库内部的短路径

monorepo 里 `import { Doc } from '../../../packages/shared/types'` 没法忍，`paths` 提供别名：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["packages/shared/src/*"]
    }
  }
}
```

**关键认知：`paths` 只是类型层的解析规则，不产生任何运行时效果**。tsc 认得 `@shared/utils`，但打包器/Node 不认。让它落地有三个流派：

1. 打包器配同款 alias（Vite 的 `resolve.alias`）——前端项目标配；
2. monorepo 里每个包在自己的 `package.json` 声明 `exports`，消费方直接 import 包名——最规范，FANDEX 这类 pnpm workspace 项目的正解；
3. 构建时用 tsconfig-paths 之类的工具改写产物——后端补丁方案。

用 paths 却没配运行时对应物，就是「编译器找到了、打包器没找到」这一错位的来源。

## 4. 为什么：策略错位的症状对照表

把本篇知识收成一张排查表：

| 症状 | 根因 | 修法 |
| --- | --- | --- |
| 相对导入报找不到，文件确实存在 | nodenext 缺扩展名 / 大小写 / include 漏目录 | 补 `.js`、查大小写、修 include |
| 包没有类型声明 | 包没写 types、@types 不存在 | 装 @types 或手写 declare module |
| 包的导出与类型不符 | exports 的 types 与 default 不同步 | 对齐包的构建产物 |
| paths 别名运行时炸 | 类型层解析没落地到运行时 | 配 Vite alias 或改用包 exports |
| 本地好好的 CI 报错 | 大小写、平台差异 | 大小写敏感检查 |

## 5. 坑点与自检

### 坑 1：无脑抄 `moduleResolution: "node"`

老模板的默认值对应 node10 解析，认不了 `exports` 字段，会在新包上解析到错误的入口。2026 年前端项目一律 `bundler`，Node 项目 `nodenext`。

### 坑 2：paths 写了不落地

见第 3 节。paths 与运行时脱节时类型全绿、构建全红，迷惑性极强。

### 坑 3：用 `@types` 包当运行时依赖

`@types/*` 只该出现在 devDependencies。放进 dependencies 会在生产安装无用代码，且版本漂移时和主包对不上。

### 坑 4：绕过 exports 的「深链接」导入

`import x from 'pkg/dist/deep/file'` 在包加 exports 后会静默失效（运行时被禁入）。库用户遇到「升级后突然找不到了」，先看包的 exports 是否收紧了。

### 自检清单

- [ ] 能说出 bundler 与 nodenext 分别模仿谁、各自的扩展名纪律
- [ ] 能按顺序说出包类型的四步查找路径
- [ ] 能读懂 package.json 的 exports 条件映射（types/default）
- [ ] 能解释 paths 为什么需要运行时配合，并给出两种落地方案
- [ ] 拿到一个 Cannot find module 能按表排查

## 6. 练习

1. 在 FANDEX 仓库打开根 `tsconfig.json`，找到 `moduleResolution`，说出它为什么是这个值（提示：Astro 底层是什么构建器）。
2. 挑一个 `node_modules` 里带 `exports` 字段的包，故意 import 一个未列出的深路径，观察报错文本里是否提到 exports。
3. 给练习小项目配 `paths` 别名跑通 `tsc --noEmit`，再用 `npx tsx` 直跑——观察报错，然后按流派 1 或 2 修复它。

## 7. 下一步

- [声明文件编写](/typescript/300-DeclarationFileWriting)：查不到类型时的补救写法
- [import type 与 verbatimModuleSyntax](/typescript/320-ImportTypeVerbatimModuleSyntax)：导入的编译期/运行时边界
- [TypeScript 工程化配置](/typescript/350-TypeScriptEngineeringConfig)：tsconfig 全景
- [Project References 与 Monorepo](/typescript/420-ProjectReferencesMonorepo)：仓库级编译组织
