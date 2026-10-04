---
order: 70
title: npm 依赖与工程化
module: 'gode'
category: 游戏开发
difficulty: beginner
description: 在 Godot 项目里使用 npm 包，掌握 pnpm hoisted 布局与原生模块的运行时物化机制
author: fanquanpp
updated: '2026-09-29'
related:
  - 'gode/060-TypeScriptConfigAndCompilation'
  - 'gode/080-DebuggingAndExporting'
prerequisites:
  - 'gode/060-TypeScriptConfigAndCompilation'
---

假设 Quaver 的乐理模块需要一个现成的和弦识别库，npm 上有，自己手写要几百行——这时候才轮到本篇。Gode 的口号里有一句"使用强大的 npm 生态"，本篇讲清这条能力线的边界与规则：npm 解析何时启用、如何初始化依赖、ESM 与 CommonJS 包如何加载、pnpm 需要哪些额外配置、原生 `.node` 模块如何工作，以及官方的使用限制。原则先行：npm 是可选能力，不是必需品——它解决"确实需要现成库"的问题，而不是项目现代化的必经步骤。

## 启用条件与零工具链承诺

官方文档的表述是："仅在根目录存在 package.json 或 node_modules 时才启用 npm 解析。"反过来说，没有依赖的项目保持零工具链——不需要 Node.js，也不需要 npm，这与安装篇讲过的边界完全一致。这个设计让"要不要上 npm"成为纯粹的按需决策：不建 package.json，Gode 就当 npm 不存在。判断当前项目是否处于 npm 模式也很直接：看项目根目录有没有 package.json 或 node_modules，两者任一存在，npm 解析就处于启用状态，此时才需要保证系统里装好了 Node.js/npm 工具链。

## 初始化与安装

需要依赖时，在项目根目录初始化并安装，npm 与 pnpm 两套示例：

```bash
npm init -y && npm install lodash
```

```bash
pnpm init && pnpm add lodash
```

要特别注意的是：Gode 不替你初始化包管理器，也不自动安装依赖，这些都要你自己执行。团队协作时建议沿用项目已标准化的包管理器，避免一半人用 npm、一半人用 pnpm 造成 lockfile 冲突。

## 在 TS 中使用 npm 包

官方示例演示使用 lodash：

```typescript
import { Node } from "godot";
import lodash from "lodash";

export default class PackageDemo extends Node {
  _ready(): void {
    console.log(lodash.camelCase("hello gode"));
  }
}
```

加载规则有两条：ESM 包按 ESM 加载；CommonJS 包被桥接为 default 和 named import 两种导入形式——所以无论依赖是哪种模块格式，import 写法基本一致。示例里 `import lodash from "lodash"` 是默认导入，`lodash.camelCase("hello gode")` 把字符串转成驼峰命名，运行后在 Node 终端输出 `helloGode`；这里用 `console.log` 属于诊断性输出，正式日志仍请走 `GD.print`（原因见调试篇）。另外重申项目脚本约定：项目脚本只允许 TypeScript，`.cjs` 仅作为 CommonJS 运行时的 sidecar（附属）格式用于互操作，业务代码不要写 `.js` 或 `.cjs`。

## 包管理文件的角色

引入 npm 后，根目录会多出几个与包管理相关的文件，各自的角色是：`package.json` 声明依赖清单（对无依赖项目它是可选文件）；lockfile（锁文件）锁定依赖的确切版本，建议提交到版本控制，保证团队与 CI 装出同一套依赖；`node_modules/` 是实际安装的依赖目录，导出前必须存在，但通常不入库——团队成员与构建机各自执行安装命令生成即可。这三者的分工与前端工程完全一致，前端背景的开发者可以直接沿用既有习惯。

## pnpm 专项配置

pnpm 用户需要一项额外配置。在项目根目录的 `.npmrc` 中：

```ini
node-linker=hoisted
```

原因：pnpm 默认用符号链接（symlink）组织 node_modules，而"Godot 的 res:// 文件系统和原生 side asset 加载无法完全等价模拟 Node 的 symlink resolver"。hoisted（提升）布局把依赖平铺为传统结构，规避了 symlink 问题，因此使用 pnpm 时必须设置此项。直观理解：npm 的 node_modules 天然是平铺目录，Gode 的快照与物化机制都是围绕"真实目录树"设计的，hoisted 让 pnpm 的产物与 npm 的产物形态一致，后面的导出与运行时环节才能照常工作。

另一个 pnpm 10+ 的变化：构建脚本默认不执行。需要在 pnpm-workspace.yaml 的 `onlyBuiltDependencies` 中列出需要执行构建脚本的包，或运行 `pnpm approve-builds` 交互式批准。这条与 Gode 无关，是 pnpm 自身的安全策略——许多原生依赖要靠安装期构建脚本编译出 `.node` 文件，不批准构建脚本，安装虽然成功、功能却可能残缺。个别依赖安装后功能异常时，先检查是不是构建脚本没被批准。

## 原生 .node 模块与运行时物化

有些 npm 包包含原生 `.node` 二进制模块（通常是 C/C++ 编译的 Node 扩展）。这类模块在运行时按需物化到 `user://.gode/npm/node_modules`——也就是从导出包内的快照复制到用户数据目录，获得真实文件系统路径后再加载。

物化解决三个问题：`child_process.fork()` 需要真实脚本路径；基于 `import.meta.url` 的路径推导需要真实文件位置；原生模块加载本身要求真实的磁盘文件。res:// 是 Godot 的虚拟文件系统，路径由引擎在内存中映射，无法直接满足这些 Node 侧的真实路径需求，所以 Gode 选择了"快照 + 按需物化"的方案：平时依赖以快照形式躺在导出包里，只有真正需要真实路径的包才在运行时复制到 user:// 下。理解这一点很重要——它解释了为什么原生依赖包"体积照常打包、路径却不在 res:// 里"，也解释了为什么官方要求在目标机器上实测原生包的首次加载：物化正是发生在那一刻。

配套地，2.4.1 起 Gode 捆绑了 gode_node helper（独立的 node 运行时辅助程序），让桌面包对这类能力的探测不依赖用户机器上是否安装了 Node。官方 CI 冒烟测试也覆盖了这个场景：用 node-llama-cpp（一个典型的重型原生依赖）的最小工程，在 Windows、Linux、macOS 三平台做导出冒烟测试。

## 使用建议与限制

官方给出的建议很务实，逐条列出：

- 不建议为很小的 gameplay helper 引入 npm 包——引包有体积、兼容与维护成本，小功能手写更划算。判断标准可以很简单：如果这个功能十行内能写完，就不值得为一个依赖增加安装、锁文件与导出链路的复杂度。
- 审查依赖体积，移动平台对依赖体积与运行时资源尤其敏感。一个传递依赖树庞大的包，可能让导出包体积与首次加载时间同时失控。
- 每个目标平台都要实测。npm 包在 Node 社区里通常只测过桌面端，移动端行为必须自己验证，五大平台的差异没有人替你兜底。
- 使用原生包时，在目标机器上实测首次加载（物化发生的时间点），确认可接受。
- 安全边界要清楚：Gode 不审计包内部内容，npm 包会在你的进程里运行任意代码，平台适配与依赖安全由项目自负。选包时的谨慎程度应当与它获得的权限相称。

## 坑点与自检

- 没建 package.json 就想 `import` npm 包，模块找不到——npm 解析只在根目录存在 package.json 或 node_modules 时启用；
- pnpm 装完依赖运行时报模块解析错误——缺 `node-linker=hoisted`：res:// 文件系统模拟不了 pnpm 默认的 symlink 布局；
- pnpm 10+ 安装成功但原生依赖功能残缺——构建脚本默认不执行，用 `pnpm approve-builds` 或在 pnpm-workspace.yaml 的 onlyBuiltDependencies 里列出；
- 导出包在目标机器上首次加载原生模块很慢——那是物化（复制快照到 user://）正在发生，属于设计行为，提前在目标平台实测确认可接受；
- 为一个十行能写完的功能引入了大依赖——先过一遍官方判断标准：小功能手写更划算；
- 自检问题一：Gode 会替你执行 npm install 吗？（不会，初始化与安装都是你的事；Gode 只负责在运行时解析与加载）
- 自检问题二：为什么项目脚本只允许 TypeScript？（`.cjs` 仅作 CommonJS sidecar 用于互操作，业务代码一律 `.ts` 由内置编译器转译）
- 自检问题三：原生 `.node` 模块为什么不能直接从 res:// 加载？（物化机制要在 user:// 拿到真实文件系统路径，满足 fork、import.meta.url 与原生加载的需求）

## 练习

1. 在测试项目里 `npm init -y && npm install lodash`，用官方示例验证 `lodash.camelCase("hello gode")` 输出 `helloGode`；
2. 把包管理器换成 pnpm，先不配 `.npmrc` 复现解析问题，再配 `node-linker=hoisted` 修复，体会这条配置为什么必须；
3. 写一份你自己项目的"是否引入依赖"判断清单（体积、平台、维护、安全四项），下一个想引包的念头出现时过一遍。

先自己做，再对照参考实现。第 1 题的验收点是输出面板出现 `helloGode`；第 2 题的验收点是同一份代码在配置前后一次报模块解析错误、一次正常运行。

### 参考实现

第 1 题——`package.json` 由 `npm init -y` 生成，代码就是官方示例：

```typescript
import { GD, Node } from "godot";
import lodash from "lodash";

export default class PackageDemo extends Node {
  _ready(): void {
    GD.print(lodash.camelCase("hello gode")); // helloGode
  }
}
```

第 2 题——完整复现步骤：

```text
1. 删除 node_modules 与 lockfile，改用 pnpm：pnpm install lodash（不要先建 .npmrc）
2. 运行项目：import 解析报错——pnpm 默认的 symlink 布局无法被 res:// 文件系统等价模拟
3. 项目根目录建 .npmrc，写入 node-linker=hoisted
4. 删除 node_modules 与 lockfile 后重新 pnpm install，再次运行——正常输出 helloGode
```

做完这个实验你就有了第一手判断依据：Gode 的快照与物化机制围绕"真实目录树"设计，hoisted 让 pnpm 的产物与 npm 的产物形态一致。第 2 题还有一个延伸观察：装完后看一眼 `node_modules/lodash`，npm 与 hoisted 下的 pnpm 都是真实目录，而未配置前的 pnpm 是一个指向 `.pnpm` 虚拟存储的符号链接。

第 3 题——一份可直接抄走的四项清单：

```text
体积：包本体加传递依赖多大？给导出包增加多少？移动平台可接受吗？
平台：作者测过哪些平台？我们要发布的五大平台上有人验证过吗（含原生包物化）？
维护：最近一次发布多久？issue 响应如何？能否接受随时自己 fork？
安全：包会在我们的进程里运行任意代码，Gode 不审计包内容——这个权限配得上它解决的问题吗？
```

任何一项答不上来或答案不可接受，就回到官方建议的默认解：十行内能写完的功能手写。

## 参考链接

- [npm 包使用指南](https://godothub.com/oss/gode/zh/guides/npm-packages/)
- [项目结构参考](https://godothub.com/oss/gode/zh/reference/project-structure/)
- [导出指南](https://godothub.com/oss/gode/zh/guides/exporting/)
- [Gode 中文文档首页](https://godothub.com/oss/gode/zh/)
