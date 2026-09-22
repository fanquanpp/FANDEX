---
order: 50
title: 元数据：导出属性信号与 RPC
module: 'gode'
category: 游戏开发
difficulty: beginner
description: 用 static exports 暴露检查器属性，用 static signals 声明信号，用 static rpc_config 配置多人调用
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'gode/040-GDScriptInteropAndAutoload'
  - 'gode/020-FirstTypeScriptScript'
prerequisites:
  - 'gode/020-FirstTypeScriptScript'

GDScript 有 `@export`、`signal`、`@rpc` 这类语言级注解，TypeScript 没有对等物。Gode 的解法是用类静态元数据（static metadata）声明 Godot 集成点：`static exports` 管导出属性，`static signals` 管信号，`static rpc_config` 管多人 RPC，另有 `@GlobalClass` 装饰器与 `static tool` 补齐编辑器集成。本篇逐个讲解这些机制，并给出自查清单。

## 学习目标

- 理解为什么 TS 需要 static 元数据，以及它的三条自查要点。
- 用 `static exports` 暴露 Inspector 属性，掌握 type 取值、hint、default 与集合类型支持。
- 用 `static signals` 声明信号，理解参数描述格式与编辑器信号发现。
- 用 `static rpc_config` 配置 RPC 的模式、传输方式与通道。
- 会用 @GlobalClass 注册全局类，并知道它只对 default export 生效。
- 会用 `static tool = true` 编写工具脚本，并知道注意事项。
- 回顾静态方法的脚本资源 API 调用方式。

## 为什么需要元数据

TS 没有装饰器化的 `@export`，于是 Gode 把"需要被 Godot 读取的声明信息"集中放在默认导出类的静态字段里。使用元数据时记住四条自查要点：元数据必须放在默认导出类上；元数据中写的名称必须与真实字段或方法名一致；`type` 使用 Godot Variant 类型名；每次修改元数据后，回到 Inspector 验证默认值是否按预期出现。逐条过一遍这四项检查，能避免绝大多数"属性不显示"的问题。

## static exports：导出属性

官方 Spawner 示例：

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

逐行看：`static exports` 对象的每个键对应一个导出属性，键名必须与类上的真实字段同名（`spawn_count`、`spawn_offset`、`enabled`）；每个键的值是描述对象，`type` 使用 Godot Variant 类型名（`"String"`、`"int"`、`"float"`、`"bool"`、`"Vector3"`、`"Object"` 等），还可以附加 `hint`、`hint_string` 与 `default` 来控制 Inspector 的展示与默认值。类字段上的初始值（如 `spawn_offset = new Vector3(0, 1, 0)`）与元数据保持一致是良好实践。

支持的集合类型包括：`Array<T>`、`T[]`、`GDArray<T>`、`Dictionary<K, V>`、`Map<K, V>`、`Record<K, V>`，以及 type alias（类型别名），其中字符串字面量联合别名也可用作属性类型。2.4.4 新增了 `interface[]`（接口数组）属性的 Inspector 编辑，支持嵌套字段与默认值——结构化配置从此可以直接在检查器里编辑。

## static signals：自定义信号

官方 Menu 示例：

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

格式要点：每个信号的值是一个参数描述数组，参数用 `{ name, type }` 描述（名字与 Variant 类型名）；空数组 `[]` 表示无参信号，如示例的 `quit`。发射用 `emit_signal("信号名", 参数...)`，与 GDScript 语义一致。

声明之后有什么用？信号真正注册到了 Godot 脚本系统：`has_signal`、`connect` 等运行时 API 正常工作，编辑器的信号发现（比如在编辑器里连接该节点的信号时）也能列出它们。2.4.4 还引入了 `Signal<T>` 类型检查与运行时绑定，并恢复全局 `Signal` 声明，让信号相关代码获得更好的类型保障。

## static rpc_config：多人 RPC 配置

官方 Robot 示例：

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

逐项解读：`rpc_config` 的每个键对应一个方法名；`rpc_mode` 三个取值为 `"authority"`（仅权威端）、`"any_peer"`（任意对等端）、`"disabled"`（禁用）；`transfer_mode` 三个取值为 `"reliable"`（可靠）、`"unreliable"`（不可靠）、`"unreliable_ordered"`（不可靠但有序）；`call_local` 决定调用是否同时在本地执行；`channel` 是传输通道。示例末尾的 `satisfies RpcConfig` 是 TypeScript 的类型检查语法：不改变值本身，只校验对象符合 RpcConfig 形状，拼错字段名会直接报编译错误，建议照抄。

安全提醒：RPC 元数据应视为多人安全边界的一部分。谁能调用哪个方法、是否 call_local，都直接决定远端能触发什么行为，配置时按最小权限原则取舍，不要为了省事全开 `any_peer`。

## @GlobalClass 全局类

2.4.3 新增的 `@GlobalClass` 装饰器把类注册为全局类（与 C# 全局类命名方式对齐）：

```typescript
import { Node3D } from "godot";

@GlobalClass
export default class EnemySpawner extends Node3D {
}
```

两条限制必须记住：装饰器仅对 default export 生效；同文件中辅助类上的装饰器会被忽略。2.4.3 同时修复了全局/tool 装饰器元数据被同文件辅助类影响的问题，但"一个文件一个全局类"仍是最稳妥的写法。

## static tool：工具脚本

在类上声明 `static tool = true` 即为工具脚本（tool script），让脚本在编辑器中运行：

```typescript
export default class PreviewRig extends Node3D {
  static tool = true;
}
```

注意工具脚本会在编辑器进程里执行，因此避免在其中启动长期运行的服务或修改项目文件，只做与编辑预览相关的轻量工作。

## 静态方法调用方式回顾

元数据之外，2.4.0 起静态方法统一通过脚本资源 API 调用：GDScript 侧 `preload` 得到脚本资源后，用 `has_static_method` 判断存在性、`get_static_method_argument_count` 查询参数个数、`call_static` 实际调用。这一规则与 static exports、static signals 一样，都体现了 Gode 的设计取向：把与 Godot 的集成点显式声明在"脚本资源"层面，而不是混在实例里。

## 小结

- TS 没有装饰器化 @export，Gode 用类静态元数据声明 Godot 集成点。
- `static exports`：type 用 Godot Variant 类型名，可加 hint、hint_string、default；键名必须与真实字段一致；支持 Array/T[]/GDArray/Dictionary/Map/Record 与 type alias；2.4.4 支持 interface[] 的 Inspector 编辑。
- `static signals`：参数用 `{ name, type }`，空数组为无参；`emit_signal` 发射；声明后 has_signal/connect 与编辑器信号发现正常工作；2.4.4 增加 Signal 类型检查。
- `static rpc_config`：rpc_mode 取 authority/any_peer/disabled，transfer_mode 取 reliable/unreliable/unreliable_ordered，另有 call_local 与 channel；配合 `satisfies RpcConfig` 获得类型检查；RPC 元数据是多人安全边界的一部分。
- `@GlobalClass`（2.4.3+）仅对 default export 生效，同文件辅助类上的装饰器被忽略。
- `static tool = true` 声明工具脚本，避免启动长期服务或修改项目文件。
- 静态方法通过脚本资源 API（has_static_method、get_static_method_argument_count、call_static）调用。

## 参考链接

- [元数据指南](https://godothub.com/oss/gode/zh/guides/metadata/)
- [互操作指南](https://godothub.com/oss/gode/zh/guides/interoperability/)
- [第一个脚本](https://godothub.com/oss/gode/zh/getting-started/first-script/)
- [Gode 中文文档首页](https://godothub.com/oss/gode/zh/)
