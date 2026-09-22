---
order: 150
title: Gode：用 JavaScript 与 TypeScript 写 Godot
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 安装 Gode 插件，用 TypeScript 与 npm 生态开发 Godot 节点脚本，掌握互操作元数据调试与导出
author: fanquanpp
updated: '2026-09-22'
related: ['godot/140-ScriptingEcosystemCSharpGDExtension', 'godot/130-ExportingProjects']
prerequisites: ['godot/140-ScriptingEcosystemCSharpGDExtension']
---

上一篇我们了解了 Godot 的官方脚本路线：GDScript、C# 与 C++ GDExtension。如果你来自前端世界，还有第四条路：**Gode**——一个为 Godot 提供 JavaScript 与 TypeScript 脚本支持的开源项目。它让你用现代 TypeScript 编写 Godot 节点脚本，从 `godot` 模块导入引擎类，并直接调用 npm 上庞大的包生态。

本篇是 Gode 的完整上手指南：从项目定位与实现原理讲起，依次覆盖安装、第一个脚本、场景实例化、与 GDScript 的互操作、元数据声明（导出属性、信号、RPC）、Godot API 调用细节、npm 工程化、断点调试与项目导出，最后汇总当前已知限制。

## 学习目标

- 理解 Gode 的定位：内嵌 Node.js 的 GDExtension 插件，为什么常规开发不需要安装 Node.js。
- 完成安装四步，并能在 TypeScript 未出现在语言列表时自行排查。
- 编写第一个 TypeScript 脚本，分清 `GD.print` 与 `console.log` 的用途。
- 在 TypeScript 中加载场景、实例化节点，并让 GDScript 直接调用你的方法。
- 使用 `static exports`/`static signals`/`static rpc_config` 与 `@GlobalClass` 声明元数据。
- 配置 gode.json 打开 V8 Inspector 断点调试，用 VS Code 附加调试器。
- 理解导出时对 Node.js/npm 的要求差异，以及 `.gode/` 目录的正确处理方式。

## Gode 是什么

Gode 由 GodotHub 组织开发，仓库描述为 "Godot with JavaScript / TypeScript & NodeJS"。官方文档站首页的标语概括了它的能力：用现代 TypeScript 写 Godot 节点脚本、从 `godot` 模块导入 Godot 类、使用强大的 npm 生态。

几个基本事实：

- 主语言是 C++，许可证为 MIT，属于完全开源的项目；
- 定位是"Godot 引擎的 JavaScript/TypeScript 脚本支持，运行在所有原生平台"；
- 官方中文文档站：https://godothub.com/oss/gode/zh/ ；
- 官方演示项目 gode-tps-demo 是 Godot 官方第三人称射击示例 tps-demo 的 TypeScript 移植，适合作为"别人怎么写"的参考；
- 撰写本文时插件最新版本为 2.4.4（2026-09-09 发布）。

## 实现原理：内嵌 Node.js 与 GDExtension

理解 Gode 的工作方式，能帮你预判它的能力边界：

- **内嵌的是 Node.js，不是裸 V8**。Gode 集成 libnode（Node.js 的库形态），V8 引擎随 Node.js 间接引入。这意味着 `console`、事件循环等 Node 能力都是可用的。
- **以 GDExtension 形式接入**。插件二进制清单中的关键配置是 `compatibility_minimum = "4.6.2"`，即最低要求 Godot 4.6.2；官方示例工程按 Godot 4.7 制作。

```ini
[configuration]

entry_symbol = "gode_runtime_library_init"
compatibility_minimum = "4.6.2"
```

- **编译模型**：`.ts` 源码在编辑、运行、导出时自动编译为 ESM（ECMAScript Module）JavaScript，输出到 `res://.gode/build/typescript/`。场景文件始终引用原始 `.ts` 文件——生成的 JavaScript 是内部细节，不要手动引用它。
- **内置 TypeScript 编译器**：插件自带编译器（位于 `addons/gode/tsc/`），因此**常规开发不需要安装 nodejs、npm 等任何工具**。只有当项目根目录存在 `package.json` 或 `node_modules`、你想使用 npm 包时，才需要 Node.js 工具链。

## 平台支持

| 平台 | 最低版本 |
|---|---|
| Windows 10+ | 额外依赖 `node.dll`（Node-API forwarder） |
| Android 9+ | 支持 |
| macOS 10.15+ | 支持 |
| iOS 16+ | 支持 |
| Linux（Ubuntu 22+） | 支持 |

Gode 覆盖 Godot 的全部原生平台，但不包含 Web 导出——这与 C# 的限制一致，内嵌运行时无法在浏览器里工作。Windows 导出包会额外携带 `node.dll`，移动平台则对依赖体积更敏感。

## 安装与项目结构

Gode 以 Godot addon（插件）形式分发，压缩包内同时包含运行时与 TypeScript 编译器。安装四步：

1. 从 GitHub 仓库的 releases 最新页下载插件包 `gode.zip`；
2. 把压缩包中的 `gode` 目录解压到项目的 `addons/` 目录（不存在则先创建）；
3. 打开 Godot，进入 `项目 > 项目设置 > 插件`，启用 `gode`；
4. 启用后，新建 Godot 脚本时语言列表里选择 `TypeScript`。

安装完成后，插件目录结构如下：

```text
my_project/
  addons/
    gode/
      binary/
      config/
      gode.gd
      gode.gd.uid
      plugin.cfg
      runtime/
      tsc/
      types/
```

各目录用途：

- `binary/`：运行时 GDExtension 清单与各平台原生库；
- `config/`：内置模板（tsconfig.json、gode.json 等）；
- `gode.gd`：插件入口脚本；
- `runtime/`：Godot 侧运行时辅助（插件还会注入一个名为 EventLoop 的 autoload）；
- `tsc/`：内置的 TypeScript 编译器；
- `types/`：生成的 Godot API TypeScript 声明文件，提供编辑器补全与类型检查。

### 故障排查：语言列表里没有 TypeScript

依次检查：

1. 插件路径是否严格为 `res://addons/gode`（目录名、层级都不能变）；
2. `addons/gode/plugin.cfg` 是否存在；
3. 启用插件后是否重启了编辑器；
4. `binary/` 下是否有你当前操作平台的二进制文件。

## 第一个 TypeScript 脚本

启用插件后，新建脚本选择 TypeScript 语言，然后像普通 Godot 脚本一样把它挂到节点上。官方的 Hello 示例只有五行：

```typescript
import { GD, Node } from "godot";

export default class Hello extends Node {
  _ready(): void {
    GD.print("Hello from Gode");
  }
}
```

逐行拆解：

- `import { GD, Node } from "godot"`：Godot 的类、单例与工具函数**不会注入全局作用域**，必须从 `godot` 模块显式导入。这是与 GDScript 最大的书写差异之一。
- `export default class Hello extends Node`：每个脚本必须**默认导出**一个类，且该类必须继承某个 Godot 基类（这里是 `Node`）。不满足这两点，脚本无法被 Godot 识别。
- `_ready(): void`：Godot 标准生命周期回调，节点进入场景树时调用；`_physics_process(delta: number)` 等其他回调命名与 GDScript 一致，只是换成了 TypeScript 签名。
- `GD.print("Hello from Gode")`：走 Godot 的输出 API，**保证出现在 Godot 编辑器的输出面板**。

### GD.print 与 console.log 的区别

Gode 环境里有两个"打印"：

- `GD.print(...)` / `GD.printerr(...)`：Godot 输出 API，日志一定进入编辑器输出面板，适合游戏运行日志；
- `console.log(...)`：Node 的 console API，属于终端诊断手段，Gode **不保证**它们会镜像到 Godot 输出面板。

调游戏逻辑看输出面板用前者；调 npm 包、异步任务等 Node 侧问题用后者。

## 加载场景与实例化

下面的 MarkerSpawner 示例展示了 TypeScript 版"加载 PackedScene 并实例化"的完整流程：

```typescript
import { DisplayServer, GD, Node3D, ResourceLoader, Vector3 } from "godot";

export default class MarkerSpawner extends Node3D {
  _ready(): void {
    GD.print(DisplayServer.get_name());
    const scene = ResourceLoader.load("res://scenes/marker.tscn");
    const marker = scene.instantiate();
    marker.position = new Vector3(0, 1, 0);
    this.add_child(marker);
  }
}
```

要点：

- `ResourceLoader.load(...)` 对应 GDScript 的 `load()`，返回场景资源；`scene.instantiate()` 实例化为节点。
- `marker.position = new Vector3(0, 1, 0)`：内置 Variant 类型用 `new` 构造；`Vector3.ZERO` 这类静态常量则直接挂在类上，不需要实例化。
- `this.add_child(marker)`：Godot API 保持**原生 snake_case** 命名（`add_child`、`position`），不会转成驼峰。
- 实例化的节点必须 `add_child` 挂进场景树才会参与运行，这与 GDScript 的规则完全相同。

## 公开方法与跨脚本调用

TypeScript 类上的**公开实例方法会自动对 Godot 脚本系统可见**，不需要任何注册动作：

```typescript
import { Node } from "godot";

export default class Health extends Node {
  value = 100;

  damage(amount: number): void {
    this.value = Math.max(0, this.value - amount);
  }
}
```

GDScript 侧可以像调用普通节点脚本一样直接调用：

```gdscript
$Health.damage(25)
```

本地模块的导入遵循 ESM 习惯，**不写文件后缀**：

```typescript
import { clampHealth } from "./combat/math";
```

注意：项目脚本只允许 TypeScript 一种语言；`.cjs` 仅作为 CommonJS 运行时的 sidecar 格式用于互操作场景。静态方法则不同——自 2.4.0 起（破坏性变更），静态方法不再暴露在实例上，只能通过脚本资源 API 调用：

```gdscript
var script = preload("res://scripts/damage_table.ts")
if script.has_static_method("baseDamage"):
    var amount = script.call_static("baseDamage", 3)
```

## 与 GDScript 互操作

混合语言项目里，两个方向的成本不对称：

- **GDScript 调 TypeScript**：公开实例方法直接调用，体验与调用 GDScript 无异；
- **TypeScript 调 GDScript**：使用 Godot 通用的 `call()`，传字符串方法名，属于动态调用——松耦合但**类型不安全**。

TypeScript 侧：

```typescript
import { Node } from "godot";

export default class PlayerLogic extends Node {
  say_hello(name: string): string {
    return `hi ${name}`;
  }

  call_gd_target(): unknown {
    const target = this.get_node("../GdTarget");
    return target.call("some_method", "from TypeScript");
  }
}
```

GDScript 侧：

```gdscript
extends Node

func _ready() -> void:
    var ts_result = $"../TsPlayer".say_hello("Godot")
    print(ts_result) # hi Godot

    var gd_result = $"../TsPlayer".call_gd_target()
    print(gd_result) # gd received from TypeScript

func some_method(message: String) -> String:
    return "gd received " + message
```

官方文档的建议是：对 UI、场景调度、多人事件和跨团队的 gameplay 系统，**优先用信号（Signal）作为跨语言边界**，代替跨语言直接调用，降低耦合。

### TypeScript 脚本直接作 Autoload

默认导出类继承 Godot 基类后，`.ts` 脚本可以像 GDScript 一样直接注册为 Autoload 单例。在 `project.godot` 中：

```ini
[autoload]

Settings="*res://menu/settings.ts"
```

其他脚本访问它与访问普通 Autoload 没有区别：

```typescript
const settings = this.get_node("/root/Settings");
settings.load_settings();
```

## 元数据：导出属性、信号、RPC、全局类与 Tool

GDScript 用注解（`@export`、`@signal`、`@rpc`）声明编辑器元数据；TypeScript 没有等价注解语法，Gode 的方案是**静态类成员**。

### 导出属性（static exports）

```typescript
import { Node3D, Vector3 } from "godot";

export default class Spawner extends Node3D {
  static exports = {
    spawn_count: { type: "int", default: 3 },
    spawn_offset: { type: "Vector3" },
    enabled: { type: "bool" },
  };

  spawn_count = 3;
  spawn_offset = new Vector3(0, 1, 0);
  enabled = true;
}
```

- `type` 使用 **Godot Variant 类型名**（"String"、"int"、"float"、"bool"、"Vector3"、"Object" 等），可附加 `hint`、`hint_string` 与 `default`；
- 声明后属性会出现在 Inspector 中并可序列化；
- 支持集合类型：`Array<T>`、`T[]`、`GDArray<T>`、`Dictionary<K, V>`、`Map<K, V>`、`Record<K, V>` 与 type alias。

### 自定义信号（static signals）

```typescript
import { Node } from "godot";

export default class Menu extends Node {
  static signals = {
    replace_main_scene: [{ name: "resource", type: "Object" }],
    quit: [],
  };

  _on_start_pressed(): void {
    this.emit_signal("replace_main_scene", this.next_scene);
  }
}
```

连接 Godot 已有信号则用 `connect`：

```typescript
button.connect("pressed", () => {
  console.log("button pressed");
});
```

### RPC 配置（static rpc_config）

```typescript
import { CharacterBody3D } from "godot";

export default class Robot extends CharacterBody3D {
  static rpc_config = {
    hit: { rpc_mode: "authority", call_local: true },
    play_effect: {
      rpc_mode: "any_peer",
      call_local: true,
      transfer_mode: "reliable",
      channel: 0,
    },
  } satisfies RpcConfig;

  hit(): void { this.health -= 1; }
  play_effect(): void { this.effect.restart(); }
}
```

`rpc_mode` 取值："authority"、"any_peer"、"disabled"；`transfer_mode` 取值："reliable"、"unreliable"、"unreliable_ordered"。

### 全局类与 Tool 脚本

```typescript
import { Node3D } from "godot";

@GlobalClass
export default class EnemySpawner extends Node3D {
}
```

`@GlobalClass` 装饰器（2.4.3 新增）把类注册为全局类，**仅对 default export 生效**。编辑器内运行的 Tool 脚本则用静态字段声明：

```typescript
export default class PreviewRig extends Node3D {
  static tool = true;
}
```

## Godot API 调用细节

`godot` 模块是 TypeScript 与 Godot 之间唯一的边界，包含 Godot 类、运行时单例、内置 Variant 类型、集合类型与工具函数的生成绑定。综合示例：

```typescript
import { Engine, GD, Node3D, PackedVector3Array, Vector3 } from "godot";

export default class PathProbe extends Node3D {
    _ready(): void {
        const points = new PackedVector3Array([
            Vector3.ZERO,
            new Vector3(0, 2, 0),
            new Vector3(2, 2, 0),
        ]);
        console.log(Engine.get_version_info());
        console.log(GD.var_to_str(points));
    }
}
```

三条必须内化的规则：

1. **API 保持 snake_case**：方法与属性（`add_child`、`position`）与文档中的 GDScript 名称一致，只有 TypeScript 语法不同。
2. **静态常量挂在类上**：如 `Vector3.ZERO`。
3. **对象生命周期由 Godot 拥有**："Godot owns Godot objects. TypeScript wrappers provide access to those objects, but they do not make Godot nodes immortal."——TypeScript 包装对象不会让节点免于释放。跨帧持有引用前，用 `GD.is_instance_valid()` 检查有效性：

```typescript
import { GD, Node } from "godot";

export default class TargetTracker extends Node {
    target?: Node;

    processTarget(): void {
        if (this.target && GD.is_instance_valid(this.target)) {
            this.target.call("refresh");
        }
    }
}
```

性能方面：高频 gameplay 代码要避免在紧密循环（tight loop）中频繁做 Variant 转换，必要时参考上一篇 C# 的做法——把跨边界读写挪出循环。

## npm 工程化

Gode 让 npm 生态触手可及，但有明确的启用条件：**只有项目根目录存在 `package.json` 或 `node_modules` 时，才启用 npm 解析**，也才要求系统安装 Node.js/npm 工具链。初始化命令：

```bash
npm init -y && npm install lodash
```

或使用 pnpm：

```bash
pnpm init && pnpm add lodash
```

在脚本中使用 npm 包：

```typescript
import { Node } from "godot";
import lodash from "lodash";

export default class PackageDemo extends Node {
  _ready(): void {
    console.log(lodash.camelCase("hello gode"));
  }
}
```

加载规则：

- ESM 包按 ESM 方式加载；
- CommonJS 包会被桥接，同时支持 default import 与 named import；
- pnpm 用户必须在 `.npmrc` 中配置 `node-linker=hoisted`（pnpm 默认的符号链接结构不被运行时识别）；pnpm 10 及以上还需在 pnpm-workspace.yaml 中用 `onlyBuiltDependencies` 批准构建脚本；
- 原生 `.node` 模块会在运行时按需物化（materialize）到 `user://.gode/npm/node_modules`；Gode 不审计包的内部内容，引入前请自行评估。

官方的克制建议同样值得记住：**不要为一个很小的 gameplay 辅助函数引入大包**；每个目标平台都要实测，并审查依赖体积——移动平台对此尤其敏感。更多细节见官方 npm 指南：https://godothub.com/oss/gode/zh/guides/npm-packages/ 。

## TypeScript 配置与编译

Gode 自动读取项目根目录的 `res://tsconfig.json`；不存在时会从内置模板自动创建。默认模板如下：

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

编译时机：编辑、运行、导出时都会自动编译为 ESM JavaScript，输出到 `res://.gode/build/typescript/`。编译失败时，TypeScript 诊断信息会出现在 Godot 输出面板——报错后优先去那里看第一条错误。

## 调试

日志之外，Gode 支持真正的断点调试：通过 Node/V8 Inspector 协议，VS Code 或 Chrome DevTools 可以附加到运行中的游戏。该功能**默认关闭**，需要在项目根目录的 `res://gode.json` 中开启：

```json
{
  "debug": {
    "inspector": {
      "enabled": false,
      "host": "127.0.0.1",
      "port": 9229,
      "waitForDebugger": false,
      "breakOnStart": false,
      "sourceMaps": true,
      "logUrl": true,
      "autoIncrementPort": true,
      "maxPortRetries": 20,
      "allowInRelease": false
    }
  }
}
```

关键字段的语义：

- `enabled`：总开关，调试时改为 `true`；
- `port`：Inspector 监听端口，默认 9229；端口被占用时按 `autoIncrementPort` 与 `maxPortRetries` 自动顺延；
- `sourceMaps`：启用后使用**内联 source map**，断点能映射回 `.ts` 源码行；
- `breakOnStart` / `waitForDebugger`：分别在启动即中断、等待调试器附加，用于捕捉初始化阶段的问题；
- `allowInRelease`：默认 `false`，release 导出中 Inspector 保持禁用。

VS Code 侧在 `.vscode/launch.json` 中添加 attach 配置：

```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Gode",
  "address": "127.0.0.1",
  "port": 9229,
  "protocol": "inspector",
  "sourceMaps": true,
  "sourceMapPathOverrides": {
    "res://*": "${workspaceFolder}/*"
  },
  "skipFiles": [
    "<node_internals>/**",
    "**/addons/gode/**",
    "**/.gode/build/**"
  ]
}
```

注意：release 导出会移除内联 source map；异步错误建议在关键入口用 try/catch 记录后再重抛，避免丢失上下文。

## 导出项目

Gode 项目走 Godot 标准导出流程（见前置篇），插件会自动插入两步：

1. 先编译 TypeScript：生成的 ESM JavaScript 注入 `res://.gode/build/typescript/`，Debug 导出附带 source map，Release 只含运行时 JavaScript；
2. 按平台保留运行时原生文件（例如 Windows 的 `node.dll`）；有 npm 依赖的项目会同时打包 node_modules 快照。

对工具链的要求因项目而异：

- **无 npm 依赖的项目**：导出不需要系统安装 Node.js 或 npm，插件自带的编译器即可完成全部工作；
- **有 npm 依赖的项目**：要求 `node` 与 `npm` 在 PATH 中可用。

依赖项目的导出行为可在根目录 `gode.json` 中配置：

```json
{
  "export": {
    "npm": {
      "exportDependencies": true,
      "requireTools": true,
      "includeManifests": true,
      "includeNodeModules": true,
      "excludePaths": ["node_modules/.cache", "node_modules/.bin"],
      "extraIncludePaths": []
    }
  }
}
```

各字段语义：`exportDependencies` 控制是否导出依赖；`requireTools` 控制是否强制要求本机工具链；`includeManifests`/`includeNodeModules` 分别决定是否打包清单文件与 node_modules；`excludePaths` 排除指定路径；`extraIncludePaths` 追加额外包含路径。

最后是版本控制约定：提交 TypeScript 源码、`addons/gode` 发布文件、`tsconfig.json`、需要的 `gode.json`、`package.json` 与 lockfile（建议提交）；忽略 `.godot/` 与 `.gode/`。**永远不要把生成的 JavaScript 挂到场景上，也不要把 `res://.gode/build/typescript/` 提交进仓库**——场景引用的一直是 `.ts` 原文件。

## 已知限制汇总

使用 Gode 前请把这些约束纳入技术选型：

- TypeScript 调 GDScript 只能走字符串方法名的动态 `call()`，松耦合但类型不安全；
- 高频 gameplay 代码要避免在紧密循环中频繁做 Variant 转换；
- Windows 导出额外包含 `node.dll`；移动平台对依赖体积与运行时资源敏感；
- 断点调试默认关闭；release 导出没有 source map；`console.log` 不保证进入 Godot 输出面板；
- 项目脚本只能是 TypeScript；Godot API 符号需要显式 import；Godot 对象的生命周期由 Godot 拥有，跨帧引用需有效性检查；
- 不支持 Web 导出（Gode 运行在原生平台）。

## 小结

- Gode 是 GodotHub 出品的开源项目（MIT、C++），通过内嵌 Node.js（libnode）为 Godot 提供 JavaScript/TypeScript 脚本支持，以 GDExtension 接入，最低要求 Godot 4.6.2，覆盖全部原生平台。
- 插件内置 TypeScript 编译器，`.ts` 在编辑、运行、导出时自动编译为 ESM JavaScript 输出到 `res://.gode/build/typescript/`；场景始终引用 `.ts` 原文件；常规开发不需要安装 Node.js/npm。
- 脚本必须默认导出继承 Godot 基类的类；Godot 符号需从 `godot` 模块显式导入；`GD.print` 保证进输出面板，`console.log` 是 Node 侧诊断。
- 公开实例方法自动对 Godot 可见；跨语言调用建议以信号为边界；TS 脚本可直接作 Autoload。
- 元数据通过静态成员声明：`static exports`（Variant 类型名 + default/hint_string）、`static signals`、`static rpc_config`、`static tool = true`，以及仅对 default export 生效的 `@GlobalClass`。
- npm 解析仅在根目录存在 `package.json`/`node_modules` 时启用；pnpm 必须配 `node-linker=hoisted`；不要为小功能引入大包。
- 调试用 gode.json 开启 V8 Inspector（默认端口 9229），VS Code 以 attach 方式连接；release 导出无 source map。
- 导出：无依赖项目不需要 Node.js/npm，有依赖项目要求工具链在 PATH；`.gode/` 生成输出不入库、不挂场景。

## 参考链接

- [Gode GitHub 仓库](https://github.com/godothub/gode)
- [Gode 中文文档](https://godothub.com/oss/gode/zh/)
- [安装指南](https://godothub.com/oss/gode/zh/getting-started/installation/)
- [第一个脚本](https://godothub.com/oss/gode/zh/getting-started/first-script/)
- [互操作指南](https://godothub.com/oss/gode/zh/guides/interoperability/)
- [元数据指南](https://godothub.com/oss/gode/zh/guides/metadata/)
- [调试指南](https://godothub.com/oss/gode/zh/guides/debugging/)
- [导出指南](https://godothub.com/oss/gode/zh/guides/exporting/)
