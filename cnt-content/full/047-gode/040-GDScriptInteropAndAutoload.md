---
order: 40
title: 与 GDScript 互操作及 Autoload
module: 'gode'
category: 游戏开发
difficulty: beginner
description: 在 TS 与 GDScript 之间双向调用，理解动态 call 的松耦合本质并用信号做跨语言边界
author: fanquanpp
updated: '2026-09-29'
related:
  - 'gode/020-FirstTypeScriptScript'
  - 'godot/040-SignalsObserving'
  - 'gode/050-MetadataExportsSignalsRpc'
prerequisites:
  - 'gode/020-FirstTypeScriptScript'
---

编趣 Quaver 就是混编项目：GDScript 管场景演出，theory.ts 管乐理计算，两套语言互为调用方。真实项目很少只有一种语言：可能有队友坚持 GDScript，也可能引用了现成的 GDScript 插件。于是第一个要回答的问题是"谁调谁、怎么调"。本篇讲清 TS 与 GDScript 如何双向调用、动态 `call()` 为什么松耦合也为什么类型不安全、官方为什么建议用信号做跨语言边界，以及如何让 TS 脚本直接充当 autoload（自动加载单例）。读完你能亲手跑通双向调用，并说出官方为什么不建议到处用 `call()`。

## 双向调用总览

两个方向的成本并不对称。GDScript 调用 TS 实例方法：TS 节点在 Godot 眼中就是普通节点脚本，直接像调用其他 GDScript 一样点出方法即可，完全静态。TS 调用 GDScript 方法：走 Godot 通用的 `call()`，传入字符串方法名与参数，动态、松耦合、类型不安全——编辑器无法在编译期发现方法名拼错或参数不匹配。

## 动手：跑通官方完整互操作示例

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

## 坑点与自检

- GDScript 里写 `$TsPlayer.someTsMethod()` 报"方法不存在"，实际方法在——TS 公开方法名保持你写的驼峰，GDScript 调用时按原名调用，不要"翻译"成 snake_case；
- TS 侧 `call("somemethod")` 静默失败或运行期报错——字符串方法名与 GDScript 函数名必须逐字符一致，编译期查不出来，改名后先全局搜字符串；
- 节点改名后互调失效——相对路径字符串是硬编码，改用导出引用或信号边界；
- autoload 访问 404——检查 project.godot 键名与 `/root/Settings` 大小写是否一致，autoload 节点挂在根下；
- 自检问题一：两个方向为什么不对称？（TS 公开方法自动对脚本系统可见所以 GDScript 能静态调；TS 侧没有 GDScript 的静态信息，只有通用 `call()`）
- 自检问题二：官方为什么建议跨团队系统用信号而不是直接调用？（解耦 + 避免字符串方法名漂移，信号连接在编辑器里可见可管理）

## 练习

1. 把官方示例搭出来跑一遍：Main 下挂 TsPlayer 与 GdTarget，验证两行输出分别是谁返回的；
2. 在 TS 侧给 GdTarget 写一个 wrapper 模块，把 `"some_method"` 字符串收敛到唯一一处，然后故意把 GDScript 函数改名，观察 wrapper 版本只需改一处即可修复；
3. 把 settings.ts 配置为 autoload，从 GDScript 里 `get_node("/root/Settings")` 调用它的一个方法，验证全局单例对两种语言同时可见。

## 下一步

- TS 侧声明自己的信号与导出属性：元数据篇（050 篇）；
- Godot 信号机制的完整原理：站内 godot 模块的信号篇章；
- Quaver 的 GDScript 与 TS 分工样本：https://github.com/fanquanpp/quaver

## 参考链接

- [互操作指南](https://godothub.com/oss/gode/zh/guides/interoperability/)
- [元数据指南](https://godothub.com/oss/gode/zh/guides/metadata/)
- [Godot API 指南](https://godothub.com/oss/gode/zh/guides/godot-api/)
- [Gode 中文文档首页](https://godothub.com/oss/gode/zh/)
