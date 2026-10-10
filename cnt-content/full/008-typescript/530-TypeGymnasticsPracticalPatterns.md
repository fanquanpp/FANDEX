---
order: 560
title: "类型体操实用模式：类型层也要别重复自己"
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: "以「分页结构到处手写泛型」引入，讲五个消灭重复劳动的类型体操模式：索引访问提取元素、keyof + in 生成映射、模板字面量拼事件名、条件类型过滤联合、手写复刻 Pick/Omit，附 TS2344 与 TS2536 实测调试。"
author: fanquanpp
updated: '2026-10-07'
related:
  - 'typescript/540-TypeGymnasticsBoundaries'
  - 'typescript/430-ConditionalTypeDistribute'
  - 'typescript/210-KeyofTypeofIndexedAccessTypes'
  - 'typescript/480-MappedTypeKeyRemap'
  - 'typescript/490-UtilityTypePrinciple'
prerequisites:
  - 'typescript/210-KeyofTypeofIndexedAccessTypes'
  - 'typescript/110-LiteralUnionTypes'
---

## 前置知识

- 已完成 [keyof、typeof 与索引访问类型](/typescript/210-KeyofTypeofIndexedAccessTypes)：会用 `keyof T` 取键联合、`T[K]` 取属性类型；
- 已完成 [字面量与联合类型](/typescript/110-LiteralUnionTypes)：认识 `"click" | "hover"` 这种联合类型。

没学过也没关系，用到时本文会给一句话解释并附链接。

类型体操在这个模块拆成两篇接力：**本篇讲「用」——五个解决重复劳动的实用模式，每个不超过五行；[540 深水区](/typescript/540-TypeGymnasticsBoundaries) 讲「底」——递归终止条件、深度限制实测、infer 边界与什么时候该停手。** 两篇示例不重复，本篇避开递归与 infer 深水，先消掉手头的重复劳动。

## 学习目标

读完本文你将能够：

1. 用一句索引访问提取接口返回里的元素类型，替代手写实体类型；
2. 用 `keyof` + `in` 把对象类型映射成新形态，并让新形态跟随原类型自动增减字段；
3. 用模板字面量类型从字段名批量生成事件名联合；
4. 徒手写出 Pick 和 Omit，说清键约束为什么必须写 `extends keyof T`；
5. 拿到 TS2344 或 TS2536 报错时，三步内定位到键约束的问题。

预计 40 到 55 分钟，含 3 组修改实验与 3 道练习。

## 1. 你现在要解决什么问题

你在给游戏商店写前端。后端的商品接口长这样：

```typescript
type GameItem = { id: number; name: string; price: number };
declare function fetchPage(): Promise<{ items: GameItem[]; total: number; page: number }>;
```

接下来购物车参数、详情页 props、评价列表元素，全都要引用「单个商品」的类型——你已经写了一堆 `item: GameItem`。

```typescript
function addToCart(item: GameItem) { /* ... */ }
function renderDetail(item: GameItem) { /* ... */ }
type CartEntry = { item: GameItem; count: number };
```

三天后后端给商品实体加了 `tags: string[]` 字段，`GameItem` 只定义一次，所有引用自动更新——没问题。但接手的同事没找到 `GameItem` 在哪，照着响应示例又手写了一份。两份「同一种东西」的类型从此各自演化，编辑器不再替你把关。

这就是类型体操的第一课：**别重复自己。** 类型也能从类型里「提取」「派生」。下面五个模式，每个消灭一类真实的重复劳动。

## 2. 模式一：索引访问提取元素

元素的类型不该手写第二次。`PagedResponse["items"]` 拿到数组类型，再接 `[number]` 问「按数字索引取出来是什么」，就得到元素类型：

```typescript
type PagedResponse = {
  items: { id: number; name: string }[];
  total: number;
  page: number;
};

type Item = PagedResponse["items"][number]; // { id: number; name: string }
```

用赋值探针照出结果（TypeScript 6.0 实测，本文报错同此版本）：

```typescript
const probe: number = null as unknown as Item;
```

```text
error TS2322: Type '{ id: number; name: string; }' is not assignable to type 'number'.
```

元组同样适用：对 `type Row = [string, number, boolean]`，`Row[0]` 得 `string`，`Row[number]` 得所有元素的联合 `string | number | boolean`。

## 3. 模式二：keyof + in：从键联合生成映射

表单库的经典需求：给每个字段配一个「是否被碰过」的标记。字段一多必忘。用 `in` 遍历 `keyof T`，让编译器代写：

```typescript
type LoginForm = { username: string; password: string; remember: boolean };

type TouchedMap<T> = { [K in keyof T]: boolean };

type Touched = TouchedMap<LoginForm>;
// { username: boolean; password: boolean; remember: boolean }
```

`[K in keyof T]` 对 T 的每个键生成同名属性，值类型由你指定。LoginForm 加字段，Touched 自动跟着长。

顺手解决第二类重复：派生时去掉某几个键。键联合先用 Exclude 过滤再遍历：

```typescript
type WithoutId<T> = { [K in Exclude<keyof T, "id">]: T[K] };

type PublicForm = WithoutId<LoginForm>;
// { username: string; password: string; remember: boolean }
```

这次值类型写 `T[K]`——原样保留属性类型，只动键的集合。要把键「改名」而非过滤，需要映射类型的 `as` 子句，那是 [480 映射类型与键重映射](/typescript/480-MappedTypeKeyRemap) 的主场。

## 4. 模式三：模板字面量类型拼事件名

再一类重复劳动：字段叫 `volume`、`muted`，监听事件却要手写成 `"volumeChanged" | "mutedChanged"`——两份名单靠人肉同步。模板字面量类型可以在类型层做字符串拼接，且占位符放联合时会自动展开成新联合：

```typescript
type PlayerProps = { volume: number; muted: boolean; track: string };

type EventNames<T> = `${keyof T & string}Changed`;

type Names = EventNames<PlayerProps>;
// "volumeChanged" | "mutedChanged" | "trackChanged"
```

两个细节：`keyof T & string` 是先过滤——T 若带非字符串键，拼接会直接失败，先收窄成字符串；展开是「笛卡尔积」，每个键各拼一次。实际项目里更常见的是连函数签名一起生成：`onVolumeChange: (next: number) => void` 这种监听器表，用映射类型加 `Capitalize` 即可，完整推导见 [模板字面量类型](/typescript/500-TemplateLiteralType)。本篇只需记住：**字符串名单不该手写两遍，从字段名派生。**

## 5. 模式四：条件类型过滤联合

键要过滤，值的联合同样要过滤。430 篇已拆透机制：裸类型参数遇到联合会分发，把不要的成员映射成 never 即可滤掉。一句回收：`type OnlyNumbers<T> = T extends number ? T : never;` 施加在错误码联合 `"404" | 500 | "timeout" | 502` 上，得到 `500 | 502`。

标准库里它叫 Extract（保留匹配）和 Exclude（保留不匹配），定义一字不差就是这两行。never 为何能「删掉」成员、`[T]` 包裹为何能阻止分发，见 [条件类型与分发](/typescript/430-ConditionalTypeDistribute)，本篇不重复。

## 6. 模式五：Pick/Omit 手写复刻

模式二加模式四合体，就是内置 Pick 和 Omit 的全部秘密。先写 Pick——「从 T 里挑出 K 指定的几个键」：

```typescript
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };

type SaveRecord = { id: number; name: string; checksum: string };

type Meta = MyPick<SaveRecord, "id" | "name">;
// { id: number; name: string }
```

`K extends keyof T` 这半句不是装饰。去掉它，K 就不再受「必须是 T 的键」约束，`T[P]` 直接编译失败；写错键名时，它会给出本模块最友好的报错之一：

```typescript
type Bad = MyPick<SaveRecord, "id" | "price2">;
```

```text
error TS2344: Type '"id" | "price2"' does not satisfy the constraint 'keyof SaveRecord'.
  Type '"price2"' is not assignable to type 'keyof SaveRecord'. Did you mean '"price"'?
```

编译器甚至猜到了你想写 `"price"`。Omit 则是反过来「排除 K」——先 Exclude 出剩下的键，再交给 Pick：

```typescript
type MyOmit<T, K extends keyof T> = MyPick<T, Exclude<keyof T, K>>;

type Public = MyOmit<SaveRecord, "checksum">;
// { id: number; name: string }
```

内置 Pick、Omit、Record 的官方定义与手写版几乎一致（出处：lib.es5.d.ts），全套拆解见 [工具类型实现原理](/typescript/490-UtilityTypePrinciple)。复刻的价值不在造轮子，而在下次看到 `Omit<User, "id">` 时，脑中能直接展开这两行实现。

## 7. 修改实验

先预测，再悬停或编译验证。

实验一：给 `PagedResponse` 增加 `cursor: string` 字段，悬停 `Item`。参考结果：不变——`["items"][number]` 只关心 items，这正是「提取」比「手写」稳的原因。

实验二：把 `TouchedMap` 的值类型改成 `(msg: string) => void`，悬停 `Touched`。参考结果：每个字段变成校验函数形态——表单库错误回调表的雏形。

实验三：把 `EventNames` 的后缀去掉：`type Keys<T> = keyof T & string;`，悬停 `Keys<PlayerProps>`。参考结果：`"volume" | "muted" | "track"`——模板字面量只是包装，拆掉就是普通键联合。

## 8. 常见错误与调试实录

错误一：键约束写漏了 `keyof`，运行时才发现拿错了数据。看这段：

```typescript
type MyPick<T, K extends string> = { [P in K]: T[P] };

type Item = { id: number; name: string };
type Picked = MyPick<Item, "id">;
```

```text
error TS2536: Type 'P' cannot be used to index type 'T'.
```

三步定位：报错指向 `T[P]`，说 P 不能索引 T；P 来自 `in K`，而 K 的约束只有 `extends string`——编译器无法保证 K 是 T 的键；补全为 `K extends keyof T`。这个约束就是 Pick 的安全带：错误在拼写处报，而不是漏到下游变成 `undefined`。

错误二：键约束写对了，但键名拼错。就是第 6 节的 TS2344，注意读第二行——`Did you mean '"price"'?` 是 TypeScript 在替你找相近拼写。看到 TS2344 先别改约束，九成是实参拼错。

规律总结：定位路径统一是「报错位置 → 该处的泛型参数 → 参数的 extends 约束」，模式一到四的报错同样适用。

## 9. 实际项目中的使用场景

- API 层：索引访问提取实体，`MyOmit<Entity, "id">` 派生创建请求体——后端改字段，前端类型全程自动跟随；
- 表单库：`TouchedMap` 式勾选表加 `WithoutId` 式键过滤，覆盖几乎所有「按字段生成」的需求；
- 事件系统：从 props 或 action 名派生事件名联合，`Extract`/`Exclude` 管理事件分组；
- 什么时候不用：类型要根据**运行时数据**才能决定时，别硬上类型体操，那是校验库的地盘（见 [运行时校验](/typescript/660-RuntimeSchemaValidation)）；一个模式超过五行还解释不清，去 540 看看边界再决定。

## 10. 小练习

预测题（5 分钟，先写答案，再悬停验证）：

```typescript
type Goods = { id: number; tags: string[]; meta: { weight: number } };

type G1 = Goods["tags"][number]; // 预测：？
type G2 = keyof Goods;           // 预测：？
type G3 = MyPick<Goods, "meta">; // 预测：？
```

修改题（15 分钟）：把 `EventNames` 改成同时生成 `beforeVolumeChanged`、`afterVolumeChanged` 这类「一对」名字（提示：模板里放两个联合占位会展开成笛卡尔积，或写两个模板再联合）。悬停验证成员数是键数的两倍。

修 Bug 题（15 分钟）：同事想把 LoginForm 变成勾选表，编译报错附后。按读报错三步定位并修复：

```typescript
type LoginForm = { username: string; password: string; remember: boolean };
type TouchedMap<T> = { [K in T]: boolean };
type Touched = TouchedMap<LoginForm>;
```

```text
error TS2322: Type 'T' is not assignable to type 'string | number | symbol'.
```

参考答案（先做完再看）：预测题 G1 是 `string`，G2 是 `"id" | "tags" | "meta"`，G3 是 `{ meta: { weight: number } }`。修 Bug 题：`in` 后面遍历的是 T 本身，映射类型只会遍历键联合，补上 `keyof`：`{ [K in keyof T]: boolean }`。

## 11. 与之前和之后的知识的关系

- 往前：210 篇的三把钥匙（keyof、typeof、索引访问）是模式一、二、五的地基；110 篇的联合类型是模式三、四的原料；430 篇的分发机制解释了模式四为什么成立；
- 往后：480 篇用 `as` 子句把模式二升级成「连键一起改名」；490 篇拆解全部内置工具；540 深水区回答「这五招解决不了的问题，值得动用递归吗」。

## 12. 官方文档

- 索引访问类型（Indexed Access Types）：https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html
- 映射类型（Mapped Types）：https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
- 内置工具类型（Pick/Omit/Exclude 官方定义）：https://www.typescriptlang.org/docs/handbook/utility-types.html

## 13. 自我检查

- 能用索引访问提取嵌套结构里的元素类型，说出元组与数组在 `T[number]` 上的差别；
- 能默写 TouchedMap 与 WithoutId，说出两者各自动了键还是值；
- 能徒手写 MyPick，并解释 `K extends keyof T` 删掉后 TS2536 的成因；
- 能对着 Omit 的调用说出它等价的 Pick + Exclude 展开。

## 本章总结

五个模式一个主题：让类型从类型派生，别手写第二遍。索引访问提取元素；keyof + in 批量生成映射；模板字面量派生字符串名单；条件类型过滤联合（430 的分发）；Pick/Omit 把这些零件组装成日常工具。报错定位路径统一为「报错位置 → 泛型参数 → extends 约束」。这五招够你消灭项目里八成的重复类型，剩下两成需要递归——但先去 540 看看递归的代价。

## 下一步

进入 [540 类型体操深水区](/typescript/540-TypeGymnasticsBoundaries)。分工再念一遍：本篇负责「用」，五个模式各自五行以内；540 负责「底」——递归终止条件、TS2589 实测、infer 双占位与什么时候该停手。
