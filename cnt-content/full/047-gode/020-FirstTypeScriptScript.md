---
order: 20
title: 第一个 TypeScript 脚本
module: 'gode'
category: 游戏开发
difficulty: beginner
description: 创建挂载并运行第一个 TS 节点脚本，理解默认导出继承 Godot 基类与显式导入的规则
author: fanquanpp
updated: '2026-09-28'
related:
  - 'gode/010-GodeOverviewAndInstallation'
  - 'gode/030-GodotApiInterop'
prerequisites:
  - 'gode/010-GodeOverviewAndInstallation'
---

先看一个真实仓库的目录。键盘编曲工具编趣 Quaver 用 Godot 4.7 开发，它的 scripts 目录里，synth_engine.gd、transport.gd、piano_roll.gd 等 GDScript 文件中间，躺着一个 theory.ts。一个 GDScript 项目为什么混进 TypeScript 文件？因为乐理计算这类纯函数（音名、音程、和弦表）与引擎无关，而 TypeScript 的类型系统正好管得住它们；GDScript 侧再经 theory_engine.gd 调用。这正是 Gode 存在的意义：同一项目里，让每种语言干它最擅长的事。本篇带你走完"新建脚本、编写代码、挂载节点、运行场景"的完整闭环，并讲清楚两条最重要的语言规则。

## 动手：写出并运行 Hello

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
- `export default class Hello extends Node`：默认导出一个名为 Hello 的类，并继承 Node。这是 Gode 的硬性要求，见下文"两条铁律"。
- `_ready(): void`：Godot 标准生命周期方法，节点进入场景树并就绪时被调用一次。显式标注返回类型 `void` 是良好习惯。
- `GD.print("Hello from Gode")`：把文本输出到 Godot 输出面板，等价于 GDScript 的 `print()`。

## 讲为什么：两条铁律

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

## 动手：让 GDScript 调用你的 TS 方法

公开实例方法会自动对 Godot 脚本系统可见，GDScript 可以像调用普通节点脚本方法一样直接调用。官方 Health 示例：

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

跨语言调用实例方法时，TS 节点在 Godot 眼中就是普通节点脚本，`$Health` 取到节点后直接点出方法调用即可。

静态方法则是另一套规则。从 2.4.0 起（这是一个破坏性变更），静态方法不再出现在实例上，而是暴露在脚本资源上，通过脚本资源 API 调用：

```gdscript
var script = preload("res://scripts/damage_table.ts")
if script.has_static_method("baseDamage"):
    var amount = script.call_static("baseDamage", 3)
```

流程是：`preload` 加载 `.ts` 脚本得到脚本资源，先用 `has_static_method` 判断静态方法是否存在，再用 `call_static` 调用并传参。配套 API 还有 `get_static_method_argument_count`，用于查询静态方法的参数个数。记住这条规则的方向：静态成员在"脚本"上，实例成员在"节点"上。Quaver 那种"纯计算模块"如果导出的是静态函数，GDScript 侧就是走 preload 加 call_static 这条路。

## 本地模块的组织

像 theory.ts 这样的文件不会只有一个——项目内的代码拆分使用标准 ESM 语法，导入本地模块时不写文件后缀：

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
- `marker.position = new Vector3(0, 1, 0)` 设置位置。显式 `new Vector3` 构造 Godot 类型是类型桥接的推荐写法，后续篇章会展开。
- `this.add_child(marker)` 把实例作为子节点加入场景树。

## 坑点与自检

- 新建脚本对话框里没有 TypeScript 选项——回到安装篇的排查清单：插件路径是否严格为 `res://addons/gode`、插件是否启用、是否重启过编辑器；
- 类写了 `export class` 而不是 `export default class`，或没继承 Godot 基类——挂载脚本后运行无反应，脚本系统无法实例化它；
- 从 "godot" 模块 import 拼错大小写或忘了导入某个符号，报的是 TypeScript 编译错误而不是运行时错误——编译信息会出现在输出面板，别按 GDScript 的习惯去"猜"符号从哪来；
- 打印的东西在输出面板找不到——用了 console.log。给引擎看的日志用 GD.print()/GD.printerr()；
- GDScript 调静态方法写成 `$Health.baseDamage(3)`——静态方法不在实例上，用 preload 得到脚本资源后 call_static；
- 自检问题：`.ts` 源文件在什么时机被编译、编译产物在哪、场景文件引用的是谁？编辑、运行、导出三个时机自动编译为 ESM JavaScript，输出到 `res://.gode/build/typescript/`；场景始终引用原始 `.ts` 文件，产物不需要也不应该手工管理。

## 练习

1. 仿照 Quaver 的分工，建一个 `theory.ts`：默认导出继承 Node 的类 TheoryHelper，提供实例方法 `noteName(midi: number): string`（把 MIDI 编号转成音名，如 60 转 C4），挂到节点上后在 GDScript 里调用并打印结果。
2. 给 theory.ts 加一个静态方法 `interval(a: number, b: number): number`（返回半音数差的绝对值），用 preload + has_static_method + call_static 的完整流程从 GDScript 调用它。
3. 把 Hello 改成每帧打印帧率：在 `_process(delta)` 中用 `GD.print(Engine.get_frames_per_second())`（记得从 "godot" 导入 Engine），运行观察输出，再思考为什么生产代码不该这么做。

先自己完成再看参考实现。判断自己写对了没有的三条标准：GDScript 侧调用没有报错；`noteName(60)` 输出 `C4`；第 3 题能看到输出面板被每帧日志刷屏。

### 参考实现

第 1 题与第 2 题共用一个 theory.ts：

```typescript
import { Node } from "godot";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default class TheoryHelper extends Node {
  noteName(midi: number): string {
    // MIDI 60 是中央 C（C4）：以 12 为模取音级，除以 12 减 1 得八度
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  static interval(a: number, b: number): number {
    return Math.abs(a - b);
  }
}
```

挂到名为 `Theory` 的节点后，GDScript 侧两个方向各调一次：

```gdscript
extends Node

func _ready() -> void:
    # 实例方法：直接点出
    var name: String = $Theory.noteName(60)
    print(name) # C4

    # 静态方法：走脚本资源 API
    var script = preload("res://scripts/theory.ts")
    if script.has_static_method("interval"):
        print(script.call_static("interval", 60, 64)) # 4
```

第 3 题的改法（只演示结构，生产代码别这么写）：

```typescript
import { Engine, GD, Node } from "godot";

export default class FpsProbe extends Node {
  _process(_delta: number): void {
    GD.print(Engine.get_frames_per_second());
  }
}
```

运行后输出面板每帧一行帧率。为什么生产代码不该这么做：一秒几十次日志本身就有开销，还会把真正重要的报错淹没在刷屏里；要展示帧率应写进 UI 控件（每 0.5 秒刷新一次足够），日志只留给异常路径。

## 下一步

- Godot 类在 TS 侧的完整类型桥接规则：Godot API 互操作（030 篇）；
- 静态方法规则背后的 2.4.0 破坏性变更全貌：版本演进表见安装篇（010 篇）；
- Quaver 仓库是"Gode 与 GDScript 混编"的完整样本：https://github.com/fanquanpp/quaver

## 参考链接

- [第一个脚本](https://godothub.com/oss/gode/zh/getting-started/first-script/)
- [Godot API 指南](https://godothub.com/oss/gode/zh/guides/godot-api/)
- [互操作指南](https://godothub.com/oss/gode/zh/guides/interoperability/)
- [Gode 中文文档首页](https://godothub.com/oss/gode/zh/)
- 编趣 Quaver（GDScript 与 TypeScript 混编实战）：https://github.com/fanquanpp/quaver
