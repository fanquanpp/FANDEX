---
order: 20
title: 第一个 TypeScript 脚本
module: 'gode'
category: 游戏开发
difficulty: beginner
description: 创建挂载并运行第一个 TS 节点脚本，理解默认导出继承 Godot 基类与显式导入的规则
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'gode/010-GodeOverviewAndInstallation'
  - 'gode/030-GodotApiInterop'
prerequisites:
  - 'gode/010-GodeOverviewAndInstallation'

上一篇完成了 Gode 插件安装，语言列表里已经能看到 TypeScript。本篇带你走完"新建脚本、编写代码、挂载节点、运行场景"的完整闭环，并讲清楚两条最重要的语言规则：默认导出继承 Godot 基类、Godot 符号必须显式导入。学完本篇，你就能像使用 GDScript 一样自然地用 TypeScript 驱动节点。

## 学习目标

- 创建一个 TypeScript 脚本，保存为 `res://scripts/hello.ts` 并挂载到节点上运行。
- 逐行理解官方 Hello 示例，掌握默认导出与基类继承的固定写法。
- 记住"Godot 符号不注入全局作用域，必须显式导入"的设计与好处。
- 会写 `_ready()`、`_physics_process(delta)` 等标准生命周期方法。
- 分清 `GD.print()` 与 `console.log()` 的输出去向差异。
- 让 TS 脚本的实例方法被 GDScript 直接调用，并了解静态方法的脚本资源调用方式。
- 用 ESM 语法组织本地模块，并理解"项目脚本只允许 TypeScript"的约定。
- 用代码加载并实例化场景。

## 创建并运行第一个脚本

操作流程与创建 GDScript 完全一致：

1. 在场景中选中一个节点，右键选择"附加脚本"（或通过新建脚本入口）。
2. 语言选择 `TypeScript`。
3. 路径保存为 `res://scripts/hello.ts`（scripts 目录不存在时一并创建）。
4. 挂载到节点后，按 F5 或点击运行按钮运行场景。

官方 Hello 示例原文如下：

```typescript
import { GD, Node } from "godot";

export default class Hello extends Node {
  _ready(): void {
    GD.print("Hello from Gode");
  }
}
```

运行后，Godot 输出面板会打印 `Hello from Gode`。下面逐行拆解：

- `import { GD, Node } from "godot";`：从 `godot` 模块导入两样东西——`GD` 是工具命名空间（提供打印等全局函数），`Node` 是 Godot 的节点基类。
- `export default class Hello extends Node`：默认导出一个名为 Hello 的类，并继承 Node。这是 Gode 的硬性要求，见下一节的"两条铁律"。
- `_ready(): void`：Godot 标准生命周期方法，节点进入场景树并就绪时被调用一次。显式标注返回类型 `void` 是良好习惯。
- `GD.print("Hello from Gode")`：把文本输出到 Godot 输出面板，等价于 GDScript 的 `print()`。

## 两条铁律

第一，脚本必须默认导出（export default）一个继承 Godot 基类的类。Godot 的脚本系统需要在挂载脚本时实例化你的类，非默认导出的类、不继承 Godot 基类的类都无法作为节点脚本工作。基类按需选择：挂在普通节点上用 `Node`，挂在三维节点上用 `Node3D`，角色控制器用 `CharacterBody3D`，以此类推。

第二，Godot 符号不注入全局作用域，需要显式导入。你不会像某些框架那样凭空使用 `Node`、`Vector3`、`GD`——它们都必须先 `import` 自 `godot` 模块。这个设计有两个直接好处：一是类型安全，编辑器能基于声明文件给出准确的补全与检查；二是可摇树（tree-shaking），未使用的 API 绑定不会进入最终产物，有利于控制体积。

## 生命周期方法

Godot 的标准虚方法在 TypeScript 中以同名方法出现。最常用的两个：

```typescript
import { GD, Node } from "godot";

export default class LifecycleDemo extends Node {
  _ready(): void {
    GD.print("节点就绪，仅调用一次");
  }

  _physics_process(delta: number): void {
    // 每个物理帧调用一次，delta 为帧间隔时间
  }
}
```

`_ready()` 在节点进入场景树就绪时调用一次；`_physics_process(delta: number)` 每个物理帧调用一次，参数 `delta` 的类型是 `number`（Godot 的浮点数在 TypeScript 侧对应 number）。其余 Godot 标准虚方法同理，按 Godot 文档中的方法名原样书写即可，注意 Gode 保持 Godot 原生 snake_case 命名。

## GD.print 与 console.log 的区别

Gode 环境里有两个"打印"：`GD.print()` 走 Godot 的输出 API，保证出现在 Godot 编辑器的输出面板；`console.log` 是 Node 的 console API，属于终端诊断用途，Gode 不保证它们一定会镜像到 Godot 输出面板。习惯前端开发的人容易默认 `console.log` 无处不在，在 Gode 里请把"给引擎看"的日志交给 `GD.print()`（报错用 `GD.printerr()`），把 `console.log` 留给终端排查。调试篇章还会讲到：建议从终端启动 Godot 查看 Node/V8 warning。

## 公开实例方法自动对 Godot 可见

TypeScript 类上的公开实例方法会自动对 Godot 脚本系统可见，GDScript 可以像调用普通节点脚本方法一样直接调用。官方 Health 示例：

```typescript
import { Node } from "godot";

export default class Health extends Node {
  value = 100;

  damage(amount: number): void {
    this.value = Math.max(0, this.value - amount);
  }
}
```

GDScript 侧一行即可调用：

```gdscript
$Health.damage(25)
```

这个例子说明：跨语言调用实例方法时，TS 节点在 Godot 眼中就是普通节点脚本，`$Health` 取到节点后直接点出方法调用即可。

## 静态方法：通过脚本资源调用

从 2.4.0 起（这是一个破坏性变更），静态方法不再出现在实例上，而是暴露在脚本资源上，通过脚本资源 API 调用。官方示例：

```gdscript
var script = preload("res://scripts/damage_table.ts")
if script.has_static_method("baseDamage"):
    var amount = script.call_static("baseDamage", 3)
```

流程是：`preload` 加载 `.ts` 脚本得到脚本资源，先用 `has_static_method` 判断静态方法是否存在，再用 `call_static` 调用并传参。配套 API 还有 `get_static_method_argument_count`，用于查询静态方法的参数个数。记住这条规则的方向：静态成员在"脚本"上，实例成员在"节点"上。

## 本地模块的组织

项目内的代码拆分使用标准 ESM 语法，导入本地模块时不写文件后缀：

```typescript
import { clampHealth } from "./combat/math";
```

需要特别记住的约定是：项目脚本只允许 TypeScript；`.cjs` 仅作为 CommonJS 运行时的 sidecar（附属）格式用于互操作场景。换句话说，不要试图在项目里手写 `.js` 业务脚本，一律写 `.ts`，由内置编译器负责转译。

## 场景加载与实例化

最后一个实战片段：在代码中加载场景、实例化并加入场景树。官方 MarkerSpawner 示例逐行讲解：

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

- 顶部导入了五个符号：`DisplayServer`（显示服务器单例）、`GD`、`Node3D`（三维节点基类）、`ResourceLoader`（资源加载单例）、`Vector3`（三维向量内置类型）——再次印证"所有 Godot 符号都要显式导入"。
- `GD.print(DisplayServer.get_name())` 打印当前显示服务器名称，确认运行环境。
- `ResourceLoader.load("res://scenes/marker.tscn")` 加载场景资源。
- `scene.instantiate()` 实例化出节点对象。
- `marker.position = new Vector3(0, 1, 0)` 设置位置。注意这里显式 `new Vector3` 构造了 Godot 类型，这是类型桥接的推荐写法，后续篇章会展开。
- `this.add_child(marker)` 把实例作为子节点加入场景树。

## 小结

- 新建脚本语言选 TypeScript，保存为 `.ts` 后像普通脚本一样挂载到节点。
- 两条铁律：必须默认导出继承 Godot 基类的类；Godot 符号不注入全局作用域，必须从 `godot` 模块显式导入。
- `_ready()`、`_physics_process(delta: number)` 等生命周期方法按 Godot 原名书写，命名保持 snake_case。
- `GD.print()` 与 `GD.printerr()` 保证进入 Godot 输出面板；`console.log` 是 Node 终端诊断，不保证镜像。
- 公开实例方法自动对 Godot 可见，GDScript 可直接调用；静态方法自 2.4.0 起改用脚本资源 API（`has_static_method`、`call_static`）。
- 本地模块用 ESM 导入且不写后缀；项目脚本只允许 TypeScript，`.cjs` 仅作互操作 sidecar。
- 加载场景的标准链路是 `ResourceLoader.load` 加 `instantiate`，再 `add_child`。

## 参考链接

- [第一个脚本](https://godothub.com/oss/gode/zh/getting-started/first-script/)
- [Godot API 指南](https://godothub.com/oss/gode/zh/guides/godot-api/)
- [互操作指南](https://godothub.com/oss/gode/zh/guides/interoperability/)
- [Gode 中文文档首页](https://godothub.com/oss/gode/zh/)
