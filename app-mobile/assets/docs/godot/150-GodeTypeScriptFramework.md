---
order: 220
title: Gode：用 JavaScript 与 TypeScript 写 Godot
module: 'godot'
category: 游戏开发
difficulty: beginner
description: Gode 上手篇：安装插件、用 TypeScript 写出第一个 Godot 脚本、加载场景与跨脚本调用
author: fanquanpp
updated: '2026-10-07'
related: ['godot/140-ScriptingEcosystemCSharpGDExtension', 'godot/152-GodeInteropAndTooling', 'gode/020-FirstTypeScriptScript']
prerequisites: ['godot/140-ScriptingEcosystemCSharpGDExtension']
---

上一篇我们了解了 Godot 的官方脚本路线：GDScript、C# 与 C++ GDExtension。如果你来自前端世界，还有第四条路：**Gode**——一个为 Godot 提供 JavaScript 与 TypeScript 脚本支持的开源项目。它让你用现代 TypeScript 编写 Godot 节点脚本，从 `godot` 模块导入引擎类，并直接调用 npm 上庞大的包生态。

## 知识点地图

- **知识类别**：Gode 上手——项目定位、实现原理、安装与第一个 TypeScript 脚本，对应 Gode 官方文档 Getting Started 章节。
- **解决什么问题**：前端开发者想进 Godot 又不想先学一门新语言；团队里有现成的 TypeScript 工程能力（类型、npm 生态、测试工具）想复用到游戏项目。Gode 把 Godot 的脚本层接到了 Node.js 运行时上。
- **什么时候用到**：评估第四条脚本路线是否适合团队；在 Godot 项目里跑通第一个 TS 脚本；搭建混合语言工程的第一步。
- **本篇主线**：定位与原理决定能力边界（Web 不支持、生命周期归 Godot）——先懂边界再动手；安装、第一个脚本、场景实例化三步跑通后，进阶内容（互操作纪律、元数据、npm 工程化、调试导出）见 [Gode 进阶](/godot/152-GodeInteropAndTooling)。
- **分工声明**：姊妹模块 047-gode 是 Gode 专项深读系列（真实项目贯穿、逐篇实现）。本模块的两篇承担 Godot 学习主线上的入口与导航，深读按 [152 进阶篇](/godot/152-GodeInteropAndTooling) 的地图跳转，避免内容重复维护。

预计 25 到 40 分钟。

## 学习目标

- 理解 Gode 的定位：内嵌 Node.js 的 GDExtension 插件，为什么常规开发不需要安装 Node.js。
- 完成安装四步，并能在 TypeScript 未出现在语言列表时自行排查。
- 编写第一个 TypeScript 脚本，分清 `GD.print` 与 `console.log` 的用途。
- 在 TypeScript 中加载场景、实例化节点，并让 GDScript 直接调用你的方法。

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

## 动手实践

任务：跑通「安装到跨脚本调用」的最小闭环，把入门篇的每个边界亲身体验一遍。

1. 按安装四步在空白项目装好 Gode，故意把目录解压成 `addons/Gode`（大写 G），观察语言列表并按故障排查修复；
2. 写 Hello 脚本挂到节点运行，然后把 `GD.print` 换成 `console.log`，对照输出面板的差异，记录哪条日志消失了；
3. 复刻 MarkerSpawner：新建一个含子节点的 marker.tscn，用 TypeScript 加载实例化；再把 `marker.position` 改成驼峰 `marker.setPosition`，观察报错，理解「API 保持 snake_case」的边界；
4. 写 Health 类并让一个 GDScript 节点调用 `damage(25)`——混编调用的第一课。

<details>
<summary>参考要点（先自己试，再展开对照）</summary>

第 1 题：目录名大写导致插件无法启用（路径必须严格为 `res://addons/gode`），语言列表不出现 TypeScript。修复即改回全小写并重启编辑器——这条排查项来自安装四步的第一步。

第 2 题：`console.log` 的输出不出现在 Godot 输出面板（它走 Node 侧通道）；`GD.print` 一定出现。生产项目把游戏日志统一走 `GD.print`/`GD.printerr`，`console.log` 留给 Node 侧依赖调试——混着用会让日志「时有时无」。

第 3 题：`setPosition` 不存在——Godot API 保持文档里的 snake_case（`position` 是属性、`add_child` 是方法），TypeScript 侧不会生成驼峰别名。报错是运行期的「方法不存在」，类型层也查不出（属性访问与不存在方法的差异取决于声明文件），记住「照抄 Godot 文档命名」即可。

第 4 题：GDScript 侧 `$Health.damage(25)` 与调用 GDScript 节点完全一样——公开实例方法自动可见。这一步跑通后，跨语言的进阶纪律（什么时候该用信号、怎么声明元数据）见 [Gode 进阶](/godot/152-GodeInteropAndTooling)。

</details>

## 小结

- Gode 是 GodotHub 出品的开源项目（MIT、C++），通过内嵌 Node.js（libnode）为 Godot 提供 JavaScript/TypeScript 脚本支持，以 GDExtension 接入，最低要求 Godot 4.6.2，覆盖全部原生平台、不含 Web 导出。
- 插件内置 TypeScript 编译器，`.ts` 在编辑、运行、导出时自动编译为 ESM JavaScript 输出到 `res://.gode/build/typescript/`；场景始终引用 `.ts` 原文件；常规开发不需要安装 Node.js/npm。
- 脚本必须默认导出继承 Godot 基类的类；Godot 符号需从 `godot` 模块显式导入；`GD.print` 保证进输出面板，`console.log` 是 Node 侧诊断。
- Godot API 保持 snake_case 原生命名；公开实例方法自动对 Godot 可见，GDScript 可直接调用。

## 下一步

- [Gode 进阶：互操作、元数据与工程化导航](/godot/152-GodeInteropAndTooling)：跨语言边界纪律、元数据对照表、npm 工程化检查单与选型限制表；
- 想按真实项目逐步深读，跳转姊妹模块 047-gode 的专项系列（从[第一个 TypeScript 脚本](/gode/020-FirstTypeScriptScript)开始）。

## 参考链接

- [Gode GitHub 仓库](https://github.com/godothub/gode)
- [Gode 中文文档](https://godothub.com/oss/gode/zh/)
- [安装指南](https://godothub.com/oss/gode/zh/getting-started/installation/)
- [第一个脚本](https://godothub.com/oss/gode/zh/getting-started/first-script/)
