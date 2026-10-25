---
order: 60
title: TypeScript 配置与编译流程
module: 'gode'
category: 游戏开发
difficulty: beginner
description: 理解 tsconfig 自动生成与编译时机，按需开启更严格检查或接入 Node 类型
author: fanquanpp
updated: '2026-10-11'
related:
  - 'gode/010-GodeOverviewAndInstallation'
  - 'gode/070-NpmWorkflow'
prerequisites:
  - 'gode/010-GodeOverviewAndInstallation'
---

## 知识点地图

- 知识类别：Gode 的 TypeScript 编译体系——三时机自动编译、tsconfig 的来源与调整、编译诊断归属、内置编译器与工具链边界。
- 解决什么问题："我没跑过编译命令，JS 是哪来的"；什么时候需要动 tsconfig；类型错误由谁报、报在哪。
- 什么时候用到：想收紧或放宽类型检查、接 Node 生态类型、排查"改了 tsconfig 不生效"、决定 .gode/build 是否入库。
- 前置：010 篇的实现原理一节（内置 tsc 的位置）；与 080 篇的分工——本篇管编译与配置，那篇管调试运行时。

前几篇的代码都"开箱即用"——你在 Quaver 式项目里保存 theory.ts，按 F5 就能跑，从没执行过任何编译命令。那 TypeScript 是什么时候变成 JavaScript 的？产物在哪、会不会污染仓库、tsconfig.json 从哪来？本篇揭开这套机制：理解编译模型后，你既能放心地忽略生成的 JavaScript，也能按需收紧类型检查或接入 Node 类型。

## 编译模型

Gode 的编译模型一句话概括：`.ts` 源码在编辑、运行、导出时自动编译为 ESM JavaScript，输出到 `res://.gode/build/typescript/`。三个时机意味着你不需要任何手动构建步骤：保存脚本即编辑期编译，点运行即运行期编译，点导出即导出期编译。

由此推出两条纪律。第一，场景必须继续引用 `.ts` 原文件，官方明确说明"生成的 JavaScript 是内部细节"。把生成的 JS 挂到场景上会绕过编译管线，是错误用法。第二，不要提交生成输出，`res://.gode/build/typescript/` 属于构建产物，应加入版本控制忽略名单。

## tsconfig.json：自动生成与默认模板

Gode 自动读取项目根目录的 `res://tsconfig.json`；文件不存在时，会从内置模板自动创建（模板存于插件 `config/` 目录）。默认模板全文如下：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "useDefineForClassFields": true,
    "experimentalDecorators": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["**/*.ts", "**/*.tsx", "**/*.d.ts"],
  "exclude": ["node_modules", ".godot", ".gode", "addons/gode/tsc"]
}
```

逐项解释：

- `target: "ES2022"`：编译目标为 ECMAScript 2022，语法特性较新且运行环境（内嵌 Node.js）完全支持。
- `module: "ESNext"`：生成最新的 ESM 模块语法，与 Gode 的 ESM 运行模型一致。
- `moduleResolution: "Bundler"`：采用打包器风格的模块解析，这也是"本地导入不写文件后缀"能够通过类型检查的原因。
- `strict: true`：开启 TypeScript 全部严格检查，推荐保持。
- `isolatedModules: true`：要求每个文件都能作为独立模块转译，与单文件转译的编译方式匹配。
- `forceConsistentCasingInFileNames: true`：强制文件名大小写与引用一致，避免 Windows 与其他平台行为不一致。
- `useDefineForClassFields: true`：类字段采用 define 语义，与运行时的字段行为对齐。
- `experimentalDecorators: true`：启用装饰器语法，`@GlobalClass` 依赖它。
- `esModuleInterop` 与 `allowSyntheticDefaultImports`：改善 CommonJS 互操作下的默认导入体验。
- `skipLibCheck: true`：跳过第三方声明文件的完整检查，加快类型检查速度。
- `types: []`：不自动包含任何全局类型包，需要哪些显式声明（见下文 Node 类型示例）。
- `include` 与 `exclude`：编译范围覆盖项目内全部 `.ts` 文件，排除 node_modules、`.godot`、`.gode` 与内置编译器目录 `addons/gode/tsc`。

## 常见调整场景

场景一：需要 Node 全局类型（例如用到了 Node 侧 API 的类型声明）。安装 @types/node，并把 `"node"` 加入 compilerOptions 的 types：

```json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

注意这一步通常伴随真实的 npm 依赖（安装 @types/node 需要 package.json），相关工具链要求见下一篇。

场景二：想要更严格的规范，可在 compilerOptions 中启用 `noImplicitOverride`（重写父类方法必须显式写 override）与 `noUncheckedIndexedAccess`（索引访问的结果视为可能不存在）。两者都会让检查更挑剔，新项目建议直接开启。

场景三：Monorepo（多包仓库）。默认 include 覆盖整个项目目录，Monorepo 中可能包含多个子项目或非游戏代码，此时应调整 include/exclude，把编译范围收窄到游戏代码所在的子目录，避免无关文件参与编译。

调整 tsconfig 后的验证方式很简单：改一个文件触发编辑期编译，观察 Godot 输出面板有没有新的 TypeScript 诊断。类型配置的变更（比如开启 noUncheckedIndexedAccess）往往会立刻让原本通过的代码报出一批诊断，逐条修复即可确认新规则生效。另外，tsconfig.json 属于应提交的文件，团队所有人应共享同一份，避免各改各的导致"我这里能编译、你那里报错"的分歧。

## 编译诊断与承担者

编译失败时，Gode 会在 Godot 输出面板报告 TypeScript 诊断（错误文件、行号与原因），不用切换到外部终端即可定位问题。承担者方面：2.4.0 起 TS 编译由编辑器扩展承担，对应的原生扩展名为 GodeTypeScriptCompiler——这正是版本篇讲过的 gode_runtime 与 gode_editor 拆分的一部分，编辑器里的编译能力不会进入导出包。

## 内置编译器与工具链

再次强调工具链边界：TypeScript 编译器内置在插件的 `addons/gode/tsc/`（其中应存在 `lib/typescript.js`），常规开发不需要安装 nodejs、npm 等任何工具。只有当项目根目录出现 package.json 或 node_modules（即引入 npm 依赖）时，才需要 Node.js/npm 工具链，详见下一篇。

## 输出与版本控制

整理本篇相关的版本控制约定：

- 忽略 `.gode/` 目录（编译输出等生成文件所在）。
- 忽略 `.godot/` 目录（Godot 自身的缓存目录）。
- 提交 `tsconfig.json`，让团队共享同一套编译配置。
- 开发期的编辑器扩展由 `gode_editor.gdextension.template` 模板生成到 `res://.godot/gode/`，属于本机生成物，随 `.godot/` 一起忽略即可。
- 生成的 JavaScript（`res://.gode/build/typescript/`）既不提交，也不挂场景。

## 坑点与自检

- 场景里挂了生成的 `.js` 而不是 `.ts`——绕过编译管线，改动不再生效；场景永远引用 `.ts` 原文件；
- `git status` 里冒出一堆 `.gode/`、`.godot/` 变更——都是生成物，加入忽略名单；tsconfig.json 则必须提交；
- 想用 Node 的 `process`/`Buffer` 类型报"找不到名称"——默认模板 `types: []` 不含任何全局类型包，安装 @types/node 并把 `"node"` 加入 types；
- 开了 `noUncheckedIndexedAccess` 后一堆红色报错——这是新规则在起作用，逐条修复即可确认生效，不是配置坏了；
- 自检问题一：`.ts` 在哪三个时机被编译、产物输出到哪？（编辑、运行、导出；`res://.gode/build/typescript/`）
- 自检问题二：为什么本地导入不写后缀能通过类型检查？（`moduleResolution: "Bundler"` 的打包器风格解析）
- 自检问题三：常规开发需要装 Node.js 吗？（不需要，tsc 内置在 `addons/gode/tsc/`；只有引入 npm 依赖才需要工具链）

## 练习

1. 故意把一个 `.ts` 文件写成有类型错误的版本，保存后在 Godot 输出面板找到诊断（文件、行号、原因），再修好；
2. 给项目开启 `noImplicitOverride`，观察哪些重写方法被点名补上 override；
3. 检查你的版本控制配置：确认 `.gode/` 与 `.godot/` 被忽略、tsconfig.json 已提交。

## 参考链接

- [TypeScript 配置](https://godothub.com/oss/gode/zh/getting-started/typescript-config/)
- [安装指南](https://godothub.com/oss/gode/zh/getting-started/installation/)
- [项目结构参考](https://godothub.com/oss/gode/zh/reference/project-structure/)
- [Gode 中文文档首页](https://godothub.com/oss/gode/zh/)
