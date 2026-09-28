---
order: 50
title: 元数据：导出属性信号与 RPC
module: 'gode'
category: 游戏开发
difficulty: beginner
description: "以「让设计同学在 Inspector 里调下落音符参数」引入：用 static exports 暴露属性、static signals 声明信号、static rpc_config 配置多人调用，理解 Gode 用类静态元数据替代 GDScript 注解的设计，以及四条自查要点。"
author: fanquanpp
updated: '2026-09-22'
related:
  - 'gode/040-GDScriptInteropAndAutoload'
  - 'gode/020-FirstTypeScriptScript'
prerequisites:
  - 'gode/020-FirstTypeScriptScript'
---

编趣 Quaver 的下落音符演示写好了，策划跑来说两件事：一是"音符数量和下落速度我想自己在编辑器里调，别每次都改代码"；二是"判定成功后要通知结算系统"。GDScript 里这两件事各有语言级注解：`@export` 把字段送上 Inspector，`signal` 声明事件。TypeScript 没有对等物——TS 的装饰器机制帮不上这个忙。Gode 的解法是把"需要被 Godot 读取的声明信息"集中写在默认导出类的静态字段上：`static exports` 管导出属性，`static signals` 管信号，`static rpc_config` 管多人 RPC，另有 `@GlobalClass` 装饰器与 `static tool` 补齐编辑器集成。本篇用"可调参数 + 判定事件"这个真实需求把它们全部落地。

## 动手：把参数送上 Inspector

```typescript
import { Node3D, Vector3 } from "godot";

export default class NoteSpawner extends Node3D {
  static exports = {
    spawn_count: { type: "int", default: 3 },
    note_speed: { type: "float", hint: "range", hint_string: "1,20" },
    lane_offset: { type: "Vector3" },
  };

  spawn_count = 3;
  note_speed = 8;
  lane_offset = new Vector3(0, 1, 0);
}
```

挂到节点后选中它，Inspector 里出现三个属性：数值框 spawn_count、带范围滑条的 note_speed、三维向量 lane_offset。这就是策划要的"不改代码调参"。

逐行看结构：`static exports` 的每个键对应一个导出属性，键名必须与类上的真实字段同名（`spawn_count`、`note_speed`、`lane_offset`）；键的值是描述对象，`type` 使用 Godot Variant 类型名（`"String"`、`"int"`、`"float"`、`"bool"`、`"Vector3"`、`"Object"` 等），可附加 `hint`、`hint_string` 与 `default` 控制 Inspector 展示与默认值。类字段的初始值与元数据保持一致是良好实践——两处不一致时排查成本很高。

支持的属性类型比看起来宽：`Array<T>`、`T[]`、`GDArray<T>`、`Dictionary<K, V>`、`Map<K, V>`、`Record<K, V>`、type alias（含字符串字面量联合）都可以。2.4.4 起 `interface[]`（接口数组）属性也能在 Inspector 里编辑，支持嵌套字段与默认值——音符配置表这种结构化数据可以直接在编辑器里改了。

## 讲为什么：为什么是 static

TS 侧没有 `@export`，Gode 选择把集成点声明提升到类静态字段——Godot 脚本系统在实例化之前就能从类上读到这些声明，进而完成属性注册、信号注册与 RPC 配置。代价是声明与实现分离在两处，所以官方给了四条自查要点，每次"属性不显示"先过这四条：

1. 元数据必须放在默认导出类上（写在辅助类上无效）；
2. 元数据里写的名称必须与真实字段或方法名一致；
3. `type` 使用 Godot Variant 类型名，不是 TS 类型名；
4. 每次修改元数据后，回 Inspector 验证默认值按预期出现。

## static signals：让结算系统听见判定

```typescript
import { Node } from "godot";

export default class NoteJudge extends Node {
  static signals = {
    note_hit: [{ name: "accuracy", type: "float" }],
    song_finished: [],
  };

  _on_note_pressed(accuracy: number): void {
    this.emit_signal("note_hit", accuracy);
  }
}
```

格式要点：每个信号的值是参数描述数组，参数用 `{ name, type }` 描述；空数组 `[]` 表示无参信号（如 `song_finished`）；发射用 `emit_signal("信号名", 参数...)`，与 GDScript 语义一致。

声明之后信号真正注册进了 Godot 脚本系统：`has_signal`、`connect` 等运行时 API 正常工作，编辑器的信号发现（在编辑器里连接该节点信号时）也能列出它们。所以 GDScript 侧可以直接 `note_judge.note_hit.connect(_on_note_hit)`，TS 与 GDScript 两套脚本靠信号解耦。2.4.4 还引入了 `Signal<T>` 类型检查与运行时绑定，信号相关代码获得更好的类型保障。

## static rpc_config：多人调用的配置

需要联机时（Quaver 若做双人合奏），RPC 用类静态字段声明：

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

逐项解读：`rpc_config` 每个键对应一个方法名。`rpc_mode` 三个取值——`"authority"` 仅权威端可调、`"any_peer"` 任意对等端可调、`"disabled"` 禁用；`transfer_mode` 三个取值——`"reliable"` 可靠、`"unreliable"` 不可靠、`"unreliable_ordered"` 不可靠但有序；`call_local` 决定调用是否同时在本地执行；`channel` 是传输通道。

示例末尾的 `satisfies RpcConfig` 值得照抄：它是 TS 的类型检查语法，不改变值本身，只校验对象符合 RpcConfig 形状——字段名拼错直接编译报错，而不是上线后 RPC 静默失效。

安全提醒：RPC 元数据是多人安全边界的一部分。谁能调用哪个方法、是否 call_local，直接决定远端能触发什么行为。按最小权限取舍，别为省事全开 `any_peer`——`hit` 这种扣血方法若让任意对等端都能调，等于把作弊接口写进协议。

## @GlobalClass 与 static tool

`@GlobalClass`（2.4.3 起）把类注册为全局类，创建节点对话框里能直接搜到它：

```typescript
import { Node3D } from "godot";

@GlobalClass
export default class EnemySpawner extends Node3D {
}
```

两条硬限制：装饰器仅对 default export 生效；同文件辅助类上的装饰器会被忽略。"一个文件一个全局类"是最稳妥的写法。

`static tool = true` 声明工具脚本，让脚本在编辑器进程里运行——适合做编辑器内预览（比如在编辑器视口里实时摆放下落音符轨道）。也因此有红线：工具脚本在编辑器里执行，别在里面启动长期运行的服务或修改项目文件，只做与预览相关的轻量工作。

还有一条与本篇同源的规则顺便回顾：静态方法 2.4.0 起统一走脚本资源 API——GDScript 侧 `preload` 得到脚本资源后，`has_static_method` 判存在、`get_static_method_argument_count` 查参数个数、`call_static` 调用。它和 static exports、static signals 是同一个设计取向：Godot 集成点显式声明在"脚本资源"层面，而不是混在实例里。

## 坑点与自检

- Inspector 里看不到属性——按四条自查要点顺序排查：是否默认导出类、键名与字段名是否一致、type 是否 Variant 名、改完是否等编辑器刷新；
- 信号在编辑器连接面板里找不到——`static signals` 没声明或不在默认导出类上；声明后才有 `has_signal` 与编辑器发现；
- `satisfies RpcConfig` 漏写，rpc_mode 拼成 `"authoirtY"` 无报错——字符串字面量没有类型校验就不报编译错，上线才炸；
- 同文件里给辅助类也加了 `@GlobalClass`，没生效——仅 default export 生效；
- 工具脚本里起了 Timer 或写文件，编辑器越来越卡甚至崩溃——tool 脚本在编辑器进程运行，只做轻量预览；
- 自检问题一：TS 为什么用 static 元数据而不是装饰器？（TS 装饰器没有 @export 的对等能力；静态字段可在实例化前被脚本系统读取）
- 自检问题二：`emit_signal` 发出的信号，GDScript 怎么接？（信号已注册进脚本系统，正常 `connect`，编辑器也能发现）

## 练习

1. 给 NoteSpawner 加一个 `note_style: { type: "String", hint: "enum", hint_string: "circle,square,diamond" }` 导出属性，验证 Inspector 出现下拉框，并在 `_ready` 里用 `GD.print` 打印取到的值；
2. 给判定系统补一个 `note_missed` 无参信号，GDScript 侧写一个监听节点连接它并打印"Miss"，验证跨语言信号；
3. 把 `rpc_config` 里 `hit` 的 `rpc_mode` 改成 `"any_peer"`，思考一句话：这给联机对局引入了什么风险？（提示：任意客户端都能扣别人血。）

## 下一步

- GDScript 侧怎么加载 TS 脚本、autoload 怎么写：040 篇；
- 属性与信号的类型桥接细节回看：030 篇；
- Quaver 仓库中"参数可调 + 事件驱动"的混编样本：https://github.com/fanquanpp/quaver

## 参考链接

- [元数据指南](https://godothub.com/oss/gode/zh/guides/metadata/)
- [互操作指南](https://godothub.com/oss/gode/zh/guides/interoperability/)
- [Gode 中文文档首页](https://godothub.com/oss/gode/zh/)
