# keyof、typeof 与索引访问类型

TypeScript 的类型大多靠手写声明，但有三个操作符能直接"从代码里提取类型"：`keyof` 取一个类型的全部键组成联合类型；`typeof` 取一个值的类型；索引访问 `T[K]` 从类型中取出某个键对应的类型。三者单独使用已经很有用，组合起来则构成 Pick、Omit 等工具类型与各类类型安全配置表的基石。本篇以虚拟歌手音乐平台的模型为背景，逐一讲透它们的语义、组合推导与常见误用。

## 前置知识

- [类型系统基础](/module/typescript/008-BasicTypeSystem)：联合类型与类型别名是本篇的操作对象。
- [接口与类型别名](/module/typescript/009-InterfaceTypeAlias)：keyof 与索引访问主要作用于接口与对象类型。
- [工具类型原理](/module/typescript/034-UtilityTypePrinciple)：本篇的三个操作符是工具类型的实现材料。

## 学习目标

- 能用 keyof 把对象类型的键提取为字面量联合类型。
- 能用 typeof 从运行时的变量、常量与函数中提取类型，并理解 as const 的配合作用。
- 能用索引访问类型 T[K] 取出嵌套属性类型，包括联合键产生联合类型的规则。
- 能组合三者实现 Pick 风格的类型安全函数与事件载荷映射表。
- 能读懂"值被当作类型使用"等典型报错并给出修正方案。

## 一、keyof：把类型的键变成联合类型

`keyof T` 的结果是一个**字面量联合类型**，成员是 T 的全部公开属性名。它把"键名"从手写字符串升级为编译期可校验的类型，拼错键名会直接报错。

```typescript
interface Vsinger {
  id: number;
  name: string;
  themeColor: string; // 应援色
  debutYear: number;
}

type VsingerKey = keyof Vsinger; // 'id' | 'name' | 'themeColor' | 'debutYear'

// keyof 保证传入的键名一定属于 Vsinger
function getField(singer: Vsinger, key: keyof Vsinger) {
  return singer[key]; // 返回 string | number（各键类型的并集）
}

const miku: Vsinger = { id: 1, name: '初音未来', themeColor: '#39C5BB', debutYear: 2007 };
getField(miku, 'themeColor'); // OK
// getField(miku, 'haircut'); // 报错：'"haircut"' 不能赋给 VsingerKey
```

两个细节值得记住：其一，`getField` 的返回类型是 `string | number` 而不是"key 对应的类型"，因为它对任意合法键都成立；想要精确返回需要泛型约束 `K extends keyof T`，本篇第四节会演示。其二，`keyof` 作用在接口、类型别名上，不能直接作用在值上——那是 typeof 的职责。

从工程视角看，`keyof` 最常见的落点是"从外部对象选键"的组件 props：歌单表格的排序字段、歌姬卡片的展示列，用 `keyof` 约束可选键后，消费方在编译期就能发现字段名写错，而不是等到运行时渲染出一列空白。这类"键名即 API"的接口设计，是 keyof 价值最直观的体现。

`keyof` 对不同形态的类型给出的结果也不同，使用前先确认操作对象的形态：

```typescript
type List = string[];
type ListKey = keyof List; // number | 'length' | 'push' | 'pop' | ...（下标加内置方法）

type Pair = { x: number; y: number };
type PairKey = keyof Pair; // 'x' | 'y'（普通对象类型即键名联合）
```

## 二、typeof：从值世界取类型

类型位置上的 `typeof` 与运行时的 `typeof` 运算符重名但完全不同：前者在编译期提取一个**值**的类型，后者在运行时返回字符串。它解决的问题是"类型与值必须保持一致，但不想写两遍"。

```typescript
// 运行时对象（值）-> 编译期类型
const concert2026 = {
  title: 'Magical Mirai 2026',
  city: '东京',
  ticketPrice: 660,
  isStreaming: true,
};

type Concert = typeof concert2026;
// 等价于 { title: string; city: string; ticketPrice: number; isStreaming: boolean }

// typeof 也能提取函数的类型
function buyTicket(count: number): boolean {
  return count > 0;
}
type BuyFn = typeof buyTicket; // (count: number) => boolean
```

注意上面 `Concert` 中 `title` 的类型是宽泛的 `string` 而非字面量 `'Magical Mirai 2026'`——默认的 `const` 推断对属性值仍然会放宽。加 `as const` 可以整体冻结为字面量类型，这在与 keyof 组合时尤其有用：

```typescript
// as const：数组收窄为只读元组，配合 typeof 得到精确的键名联合
const FEATURED_SINGERS = ['miku', 'teto', 'luka'] as const;

type SingerId = (typeof FEATURED_SINGERS)[number]; // 'miku' | 'teto' | 'luka'

function getTheme(id: SingerId) {
  return `${id} 的应援色配置`; // 传入 'rin' 会在编译期报错
}
```

`(typeof FEATURED_SINGERS)[number]` 是本篇的组合技：先取值类型，再用索引访问取出"所有数字下标"对应的元素类型，得到键名联合。这是从"运行时常量清单"生成类型的标准手法。

`typeof` 对函数与类同样有效：取函数得到其签名（参数与返回值类型），取类得到构造签名，配合 `InstanceType<typeof Class>` 还能反推出实例类型。工程中最常见的用法是"从第三方模块的导出值上取类型"——没有声明文件时，`typeof import('...')` 与 `ReturnType` 的组合可以快速还原类型信息。

`(typeof FEATURED_SINGERS)[number]` 是本篇的组合技：先取值类型，再用索引访问取出"所有数字下标"对应的元素类型，得到键名联合。这是从"运行时常量清单"生成类型的标准手法。

## 三、索引访问类型 T[K]

写法上像取对象属性，但作用在**类型**上：`T[K]` 取出类型 T 中键 K 对应的类型。K 可以是单个键、嵌套路径的连续访问，也可以是键的联合——联合键产生联合类型。

```typescript
interface Ticket {
  orderId: string;
  price: number;
  seat: { zone: 'S 区' | 'A 区' | 'B 区'; row: number };
}

type OrderId = Ticket['orderId'];          // string
type Seat = Ticket['seat'];                // { zone: ...; row: number }
type Zone = Ticket['seat']['zone'];        // 'S 区' | 'A 区' | 'B 区'（嵌套访问）
type PriceOrSeat = Ticket['price' | 'seat']; // number | {...}（联合键 -> 联合类型）
type AllValues = Ticket[keyof Ticket];     // 所有属性类型的并集
```

三条使用规则需要牢记。第一，`K` 必须真实存在于 `T` 上，不存在的键会直接报错，这正是它安全性的来源。第二，联合键产生联合类型，`T['a' | 'b']` 等价于 `T['a'] | T['b']`，这也是内建 `Pick` 能用联合键做参数的原理。第三，对数组类型可用数字索引：`string[][number]` 得到 `string`；对 `readonly` 元组可用 `number` 取出所有元素的联合。此外，`keyof T` 产生的键联合天然可以喂给 `T[...]`，两者是天生一对。

索引访问在类型工具中无处不在，"从既有类型里取材料"是它最典型的用法：

```typescript
const SEAT_ZONES = ['S 区', 'A 区', 'B 区'] as const;
type Zone = (typeof SEAT_ZONES)[number]; // 'S 区' | 'A 区' | 'B 区'

// 座位模型直接引用常量派生的联合，服务端枚举变更只需改一处
interface Seat {
  zone: Zone;
  row: number;
}
type SeatRow = Seat['row']; // number
```

## 四、三者组合：类型安全落地实例

组合的第一个经典场景是类型安全的 `pick`：用泛型约束 `K extends keyof T` 把"键名合法"与"返回值精确"同时锁定。它是内建 `Pick<T, K>` 的手写版，读懂它就读懂了工具类型的工作方式。

```typescript
// 组合推导：实现类型安全的 pick，返回值精确到所选键
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const k of keys) {
    result[k] = obj[k]; // k 已被约束为 T 的键，result[k] 的类型随 K 精确对应
  }
  return result;
}

const brief = pick(concert2026, ['title', 'ticketPrice']);
// brief 的类型是 { title: string; ticketPrice: number }，可继续被编辑器补全
// pick(concert2026, ['title', 'venue']); // 报错：'venue' 不在 keyof 之内
```

第二个场景是事件载荷映射表：接口定义"事件名到载荷类型"的映射，`keyof` 取事件名联合，索引访问取对应载荷，发布函数的参数类型随事件名自动收窄。这个模式的价值在于把"事件系统"从字符串约定升级为类型契约：新增事件只需在映射表加一行，所有监听与派发点的类型随之更新，漏改之处在编译期即被点名。

```typescript
// 事件与载荷的映射表：键是事件名，值是对应载荷类型
interface EventPayloadMap {
  'ticket:buy': { orderId: string; count: number };
  'concert:live': { concertId: string };
}

type EventName = keyof EventPayloadMap;              // 'ticket:buy' | 'concert:live'
type PayloadOf<E extends EventName> = EventPayloadMap[E]; // 索引访问取对应载荷

function emit<E extends EventName>(name: E, payload: PayloadOf<E>) {
  console.log(`派发事件：${name}`);
}

emit('ticket:buy', { orderId: 'A001', count: 2 }); // OK，载荷与事件名严格匹配
// emit('concert:live', { orderId: 'A001' });      // 报错：缺少 concertId
```

监听侧同样受益：把 `on` 的回调参数声明为 `EventPayloadMap[E]`，回调的参数类型就随事件名精确收窄，业务代码里不再需要任何类型断言。

```typescript
// 监听器类型随事件名收窄：on 的回调参数自动对应正确的载荷
function on<E extends EventName>(name: E, cb: (p: EventPayloadMap[E]) => void) {
  // 注册逻辑省略，重点在类型层面
}

on('concert:live', (p) => console.log(p.concertId)); // p 是 { concertId: string }
// on('ticket:buy', (p) => console.log(p.concertId)); // 报错：该载荷上没有 concertId
```

第三个场景是"配置表即类型"：用 `as const` 对象加 `keyof typeof` 定义难度档位，配置项只能是表中已有的键，注释与文档完全不需要另外维护。

三个场景合计构成一条主线：常量是源，类型是投影，函数与组件消费投影——键名、枚举、配置从此只有一份真相，拼错键名在编译期就被点名。

```typescript
// 配置表即类型：新增档位只需改对象，类型自动同步
const DIFFICULTY = { easy: 1, normal: 2, hard: 3, master: 4 } as const;

type Level = keyof typeof DIFFICULTY;            // 'easy' | 'normal' | 'hard' | 'master'
type LevelValue = (typeof DIFFICULTY)[Level];    // 1 | 2 | 3 | 4

function unlockAchievement(level: Level) {
  console.log(`达成 ${DIFFICULTY[level]} 星难度成就`); // level 索引对象必然安全
}
```

与 satisfies 操作符的分工也值得一说：`as const` 加 `keyof typeof` 适合"常量本身就是类型源"的场景；而当常量需要按既有接口校验形状、又不想丢失字面量推断时，`satisfies` 更贴切——它让常量接受接口检查的同时保留字面量类型，两者甚至可以叠加使用，构成"既校验、又派生"的完整闭环。

## 五、常见误用与报错解读

**误用一：对值直接用 keyof**。报错信息为"'concert2026' refers to a value, but is being used as a type. Did you mean 'typeof concert2026'?"。错误与修正：

```typescript
// type K = keyof concert2026;      // 反例：concert2026 是值，不是类型
type K = keyof typeof concert2026; // 修正：先 typeof 取类型，再 keyof 取键
```

**误用二：以为普通函数返回键对应的精确类型**。`getField(singer, key: keyof Vsinger)` 的返回值只能是所有属性类型的并集；要精确对应必须引入泛型 `K extends keyof T` 并让返回值为 `T[K]`。

```typescript
function getExact<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]; // 修正：T[K] 让"传什么键，返回什么类型"
}
const color = getExact(miku, 'themeColor'); // 类型精确为 string
```

3. **忘记 as const 导致字面量放宽**。`const LIST = ['a', 'b']` 的类型是 `string[]`，`keyof typeof LIST` 得到的是 `number` 而不是键名联合；加 `as const` 后才得到 `"a" | "b"`。修正思路不是到处加断言，而是养成习惯：凡是准备当"类型源"用的常量清单，声明时即加 `as const`。

**误用四：索引签名与 keyof 的组合出乎意料**。带索引签名 `interface Dict { [k: string]: number }` 的 `keyof` 结果是 `string | number`，不再是有限字面量联合——键集合开放时，keyof 自然也是开放的。

**误用五：把 Object.keys 的返回值当成键联合**。运行时的 `Object.keys(obj)` 类型是 `string[]`，它丢失了键的精确信息；需要键联合时应使用 `keyof typeof obj`，而不是把 `Object.keys` 的结果强行断言回联合类型——那等于放弃了编译期校验。

## 易错点与最佳实践

1. **值与类型两个世界互相渗透时忘记转换函数**。错误代码与修正：

```typescript
const config = { host: 'api.fandex.dev', port: 443 };
// function connect(c: config) {}        // 反例：config 是值，不能当类型
function connect(c: typeof config) {}    // 修正：typeof 提取值的类型
```

2. **同一形状写两份（类型一份、常量一份）必然漂移**。修正：以常量为单源，类型全部用 `typeof` 派生；或者以接口为单源，常量用 `satisfies` 校验（见 satisfies 操作符一篇）。判断谁是"源"的标准很简单：哪一个更接近运行时、更容易被测试和审查，哪一个就应该是源。

3. **在需要精确返回类型的地方返回并集**。`T[keyof T]` 与 `T[K]`（泛型约束下）语义不同，公共 API 应使用后者，让编辑器补全与调用方校验都精确。

4. **滥用索引签名绕过 keyof 报错**。遇到"键不存在"的报错就加 `[k: string]: any` 会摧毁整个类型安全。修正：要么修正键名，要么用联合键、部分可选属性等准确建模。

5. **对可能是 null/undefined 的值使用 typeof 提取**。`typeof` 作用于类型位置时提取的是声明类型，配合严格空检查时记得用非空断言或调整声明，避免提取出包含 `undefined` 的类型。

## 本篇小结

- `keyof T` 把类型的键变成字面量联合，是键名校验的第一道防线。
- 类型位置的 `typeof` 从值提取类型，让常量成为类型的单源；`as const` 负责把推断收紧为字面量。
- 索引访问 `T[K]` 支持嵌套访问与联合键，联合键产生联合类型；`T[number]` 可取数组元素类型。
- 三者组合构成 pick、事件载荷映射、配置表等模式，是工具类型与类型安全 API 的实现基础。
- 典型报错"'x' refers to a value, but is being used as a type"几乎总是提醒你补一个 `typeof`；而 `Object.keys` 的返回值永远替代不了 `keyof` 的键联合。

## 动手实践

1. **实现 DeepKeyof**：为嵌套对象生成"点路径"键联合，例如演唱会对象应得到 `'title' | 'venue.city'`。思路：用映射类型递归遍历键，值为对象类型时拼接 `${K}.${子键}`（可参考模板字面量类型一篇）。

2. **类型安全的事件总线**：基于 `EventPayloadMap` 实现 `on` 与 `off`，要求监听器参数类型随事件名精确收窄。思路：`on<E extends EventName>(name: E, cb: (payload: EventPayloadMap[E]) => void)`，注意泛型在参数与回调位置的双向约束。

3. **配置表改造**：把项目中一个手写联合类型（如难度档位、地区列表）重构为 `as const` 配置表加 `keyof typeof` 派生。思路：对比重构前后新增一个档位需要改动的文件数，体会"单源"的意义。
