---
order: 40
title: 与 GDScript 互操作及 Autoload
module: 'gode'
category: 游戏开发
difficulty: beginner
description: 在 TS 与 GDScript 之间双向调用，理解动态 call 的松耦合本质并用信号做跨语言边界
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'gode/020-FirstTypeScriptScript'
  - 'godot/040-SignalsObserving'
  - 'gode/050-MetadataExportsSignalsRpc'
prerequisites:
  - 'gode/020-FirstTypeScriptScript'

真实项目很少只有一种语言：可能有队友坚持 GDScript，也可能引用了现成的 GDScript 插件。本篇讲清 TS 与 GDScript 如何双向调用、动态 `call()` 为什么松耦合也为什么类型不安全、官方为什么建议用信号做跨语言边界，以及如何让 TS 脚本直接充当 autoload（自动加载单例）。

## 学习目标

- 说清双向调用的不对称性：GDScript 调 TS 像调普通脚本，TS 调 GDScript 走通用 `call()`。
- 逐行理解官方完整互操作示例（Main/TsPlayer/GdTarget 节点结构）。
- 掌握定位目标节点的四种方式：节点路径、导出引用、分组、autoload。
- 理解官方建议：UI、场景调度、多人事件与跨团队系统用信号边界代替跨语言直接调用。
- 会连接 Godot 已有信号（如按钮的 pressed）。
- 会把 TS 脚本配置为 autoload，并跨脚本访问它。
- 学会用 wrapper 封装收敛 `call()` 字符串。

## 双向调用总览

两个方向的成本并不对称。GDScript 调用 TS 实例方法：TS 节点在 Godot 眼中就是普通节点脚本，直接像调用其他 GDScript 一样点出方法即可，完全静态。TS 调用 GDScript 方法：走 Godot 通用的 `call()`，传入字符串方法名与参数，动态、松耦合、类型不安全——编辑器无法在编译期发现方法名拼错或参数不匹配。

## 官方完整互操作示例

示例场景结构：根节点 Main 下并列两个子节点——`TsPlayer`（挂 TypeScript 脚本）与 `GdTarget`（挂 GDScript 脚本）。TS 侧：

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

逐行拆解：

- TS 的 `say_hello(name: string): string` 是普通公开实例方法，所以 GDScript 里 `$"../TsPlayer".say_hello("Godot")` 可以直接调用，返回 `hi Godot`。
- TS 的 `call_gd_target()` 先 `this.get_node("../GdTarget")` 用相对路径拿到兄弟节点，再 `target.call("some_method", "from TypeScript")` 动态调用 GDScript 方法，拿到返回值 `gd received from TypeScript`。
- GDScript 的 `_ready()` 演示了两个方向各调用一次，注释里就是实际输出。
- `some_method(message: String) -> String` 是被动态调用的 GDScript 方法，注意 TS 侧的字符串 `"some_method"` 必须与这个名字逐字符一致。

## 定位目标节点的方式

示例用了相对节点路径 `get_node("../GdTarget")`，实际工程还有三种常用方式：导出引用（把目标节点拖进 Inspector 属性，避免硬编码路径）、分组（按组名批量查找节点）、autoload（适合全局性目标，见下文）。路径字符串在节点改名后容易静默失效，规模变大后建议优先导出引用或信号边界。

## 用信号做跨语言边界

官方文档明确建议：对 UI、场景调度、多人事件和跨团队 gameplay 系统，用信号边界代替跨语言直接调用。原因有两点。一是解耦：发出信号的一方不需要知道谁在听，TS 与 GDScript 可以各自演进甚至整体替换。二是规避字符串方法名漂移：`call("some_method")` 的方法名改了，编译期毫无察觉，只会在运行期炸掉；而信号连接在编辑器里可见、可管理。站内 Godot 模块的信号篇章（见 related）系统讲过信号机制，这里强调它在 Gode 项目里的特殊价值——它是跨语言协作的首选接口。

## 连接 Godot 已有信号

在 TS 里连接引擎或节点自带的信号，用 `connect` 传入信号名与回调：

```typescript
button.connect("pressed", () => {
  console.log("button pressed");
});
```

这段官方示例把按钮的 `pressed` 信号连到一个箭头函数上。信号名同样是字符串，因此也享受不到编译期检查；结合上一篇的元数据机制用 `static signals` 声明自定义信号，可以让编辑器正确发现你的信号（下一篇详述）。

## TS 脚本直接作 Autoload

TS 脚本可以直接配置为 autoload，前提与普通脚本一致：默认导出类必须继承 Godot 基类。在 `project.godot` 中：

```ini
[autoload]

Settings="*res://menu/settings.ts"
```

对应的 TS 类是一个普通默认导出类：

```typescript
import { Node } from "godot";

export default class Settings extends Node {
  load_settings(): void {
    // 读取并应用配置
  }
}
```

配置里的节点名是 `Settings`，任何脚本都能通过 `/root/Settings` 访问这个全局节点：

```typescript
const settings = this.get_node("/root/Settings");
settings.load_settings();
```

注意路径是 `/root/Settings`（autoload 节点挂在根下），名字与 project.godot 里的键一致；配置值里的星号前缀（`"*res://..."`）是 Godot autoload 配置的常规写法，表示该单例启用。相比在每个场景里重复挂一个设置节点，autoload 让配置逻辑天然全局唯一，是跨语言项目里共享状态的简单起点；它的方法同样遵循本篇开头的规则——对 GDScript 静态可见，对 TS 需要时也可以走 `call()`。

## 用 wrapper 收敛 call() 字符串

既然 `call()` 类型不安全，实践上建议：对高频的跨语言契约，在 TS 侧封装 wrapper 方法，把字符串方法名收敛到一处。例如某个 GDScript 敌人控制器暴露 `take_hit` 与 `get_speed`，就在 TS 里写 `enemyTakeHit(node, amount)` 这样的函数，内部统一走 `node.call("take_hit", amount)`。字符串只出现一次，改名时只需改一处，调用方拿到的仍是带类型的函数签名。配合信号边界与导出引用，跨语言代码的脆弱面就能控制到最小。

## 小结

- GDScript 调 TS 实例方法像调用普通节点脚本；TS 调 GDScript 用 `call()`，字符串方法名、动态、松耦合、类型不安全。
- 官方示例展示了双向调用全流程：`say_hello` 被静态调用，`call_gd_target` 内部动态调用 `some_method`。
- 定位目标有四种方式：节点路径、导出引用、分组、autoload。
- 官方建议 UI、场景调度、多人事件与跨团队系统用信号边界，理由是解耦与避免字符串方法名漂移。
- `button.connect("pressed", () => {...})` 即可连接已有 Godot 信号。
- TS 脚本可直接作 autoload：project.godot 写 `Settings="*res://menu/settings.ts"`，访问走 `get_node("/root/Settings")`。
- 高频跨语言契约用 TS wrapper 收敛 `call()` 字符串。

## 参考链接

- [互操作指南](https://godothub.com/oss/gode/zh/guides/interoperability/)
- [元数据指南](https://godothub.com/oss/gode/zh/guides/metadata/)
- [Godot API 指南](https://godothub.com/oss/gode/zh/guides/godot-api/)
- [Gode 中文文档首页](https://godothub.com/oss/gode/zh/)
