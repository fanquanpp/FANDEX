---
order: 130
title: 枚举进阶
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: 编译一个真实的 enum 看它生成了什么：数字枚举的反向映射、字符串枚举与序列化、const enum 与打包器的冲突、erasableSyntaxOnly 下的处境，以及 as const 对象替代方案的完整落地与决策表。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/170-ConstAssertion'
  - 'typescript/180-SatisfiesOperator'
  - 'typescript/670-TypeScript5xNewFeatures'
  - 'typescript/580-TypeSafeStateManagement'
  - 'typescript/150-TypeGuardCustomGuard'
prerequisites:
  - 'typescript/110-LiteralUnionTypes'
  - 'typescript/170-ConstAssertion'
---

## 学习目标

- [ ] 能说出 enum 编译成 JS 之后长什么样，反向映射是怎么来的
- [ ] 能解释 const enum 为什么在 Vite/esbuild/Babel 项目里是雷区
- [ ] 能说出 TS 5.8 `erasableSyntaxOnly` 对 enum 意味着什么，以及它和 Node 类型剥离的关系
- [ ] 能用「as const 对象 + 联合类型」写出枚举的替代品，并实现运行时校验
- [ ] 能对着决策表判断自己的场景该用 enum 还是用替代品

## 一句话理解

> enum 是 TypeScript 里少数「类型 + 运行时对象」二合一的构造：它既是类型，也会真实生成一段 JS 代码（数字枚举还带反向映射）。替代品「as const 对象」把两件事拆开：类型靠 `typeof` 提取，运行时就是一个普通对象。2026 年的主流方向是拆开——因为拆开的那份对打包器、对类型剥离（type stripping）都更友好。

## 0. 真实场景：FANDEX 的难度等级字段

FANDEX 的每篇文档 frontmatter 里都有一个难度字段，构建期用 zod 校验。真实代码（`app-web/src/content.config.ts` 节选）长这样：

```typescript
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const docs = defineCollection({
  // ...
  schema: z.object({
    title: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']), // 注意这里
    order: z.number().default(0),
    // ...
  }),
});
```

注意 `z.enum(['beginner', 'intermediate', 'advanced'])`：合法值用**字符串字面量数组**表达，没有出现 enum 关键字。这不是偶然——后面会讲，这条路线（字面量联合 + 普通对象 + 运行时校验）正是 2026 年社区的主流选择。但 enum 并没有死：理解它生成了什么、什么时候仍然合理，才能做出正确的选择。

## 1. 动手：编译一个 enum，亲眼看它生成了什么

新建一个文件，写两个枚举，然后用 tsc 编译看产物：

```bash
mkdir enum-lab && cd enum-lab
pnpm init && pnpm add -D typescript
npx tsc enums.ts --target es2020
```

```typescript
// enums.ts
enum Direction {
  Up,
  Down,
  Left,
  Right,
}

enum Status {
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
}

const d = Direction.Up;
const s = Status.Active;
```

打开产物 `enums.js`：

```javascript
// enums.js —— tsc 生成
var Direction;
(function (Direction) {
  Direction[(Direction["Up"] = 0)] = "Up";
  Direction[(Direction["Down"] = 1)] = "Down";
  Direction[(Direction["Left"] = 2)] = "Left";
  Direction[(Direction["Right"] = 3)] = "Right";
})(Direction || (Direction = {}));
var Status;
(function (Status) {
  Status["Active"] = "ACTIVE";
  Status["Suspended"] = "SUSPENDED";
})(Status || (Status = {}));

const d = Direction.Up; // 0
const s = Status.Active; // 'ACTIVE'
```

三件事一目了然：

1. **enum 不是纯类型，是真实的运行时对象**。上面的 IIFE 在每次加载模块时都会执行。
2. **数字枚举多了一段「反向映射」**：`Direction["Up"] = 0` 的返回值是 0，外层再用它执行 `Direction[0] = "Up"`——对象上同时存在正反两套键。所以 `Direction[0]` 的值是 `'Up'`。
3. **字符串枚举只有正向映射**：`'ACTIVE'` 是业务值，再拿它当键名没有意义。

跑一下反向映射，顺便看一个著名的坑：

```typescript
console.log(Direction[0]);         // 'Up'
console.log(Object.keys(Direction));
// ['0', '1', '2', '3', 'Up', 'Down', 'Left', 'Right'] —— 8 个键，正反都在
```

想遍历「成员名」，却遍历出一堆数字字符串——这就是数字枚举反向映射的代价，后面坑点一节还会遇到它。

## 2. 讲为什么：三种枚举，三种命运

### 2.1 普通枚举：有运行时对象，就有 tree-shaking 代价

打包器做 tree-shaking 时按「导出绑定」裁剪，而普通枚举的初始化是一个整体 IIFE：只要 `import` 了 `Direction`，整个对象（含反向映射）都会进产物，哪怕只用了 `Direction.Up` 一个成员。库作者尤其要小心。

### 2.2 const enum：内联很美好，跨文件是雷区

`const enum` 在 tsc 编译时直接把引用点替换成字面量，不生成任何运行时对象：

```typescript
// 源码
const enum LogLevel { Debug, Info, Warn, Error }
const current = LogLevel.Info;
```

```javascript
// tsc 产物 —— 对象消失了，只剩字面量
const current = 1 /* LogLevel.Info */;
```

代价是：内联要求编译器「看得见」枚举定义。tsc 全量编译做得到，但 Vite 开发期用 esbuild/Rolldown 按需转译单文件、Babel/swc 逐文件转译，都做不到跨文件内联——`isolatedModules: true` 下跨文件使用 `const enum` 直接报错。FANDEX 根 tsconfig 里就开着 `isolatedModules`，工具链全是按需转译型，`const enum` 在这个仓库里没有生存空间。

> 规则一句话：**应用内部、且确定只用 tsc 编译，const enum 才可以考虑；发布到 npm 的库一律禁止。** 事实上它的收益（省一个对象）通常远小于心智成本，多数团队直接禁用。

### 2.3 erasableSyntaxOnly：TS 5.8 给 enum 划的新红线

TypeScript 5.8 引入编译选项 `erasableSyntaxOnly`，只允许「可擦除」的 TypeScript 语法——类型注解、接口这类编译时删掉就完事的结构。enum 是**不可擦除语法**（要生成运行时代码），所以开着这个选项时写 enum 直接报错：

```typescript
enum Color { Red } // 错误：此语法无法在开启 erasableSyntaxOnly 时使用。
//        TypeScript 中仅允许使用可擦除的语法结构。
```

为什么会出现这个选项？因为 Node 22.18+/23.6+ 的「类型剥离」（type stripping）可以直接运行 `.ts` 文件——把类型注解删掉就是合法 JS，零编译。类型剥离无法处理 enum、namespace、参数属性这些「要生成代码」的语法，于是 TS 官方提供了 `erasableSyntaxOnly` 让项目提前约束自己。TS 6.x / 7.x（编译器换代）时代，「可擦除语法」是明确鼓励的方向——这也是 enum 声望下滑的技术根源，而不只是风格偏好。

## 3. 替代方案：as const 对象 + 联合类型

### 3.1 标准写法

```typescript
// 值：一个只读的普通对象
const Difficulty = {
  Beginner: 'beginner',
  Intermediate: 'intermediate',
  Advanced: 'advanced',
} as const;

// 类型：从对象里提取「值的联合」
type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];
// 'beginner' | 'intermediate' | 'advanced'

function badge(d: Difficulty) { /* ... */ }
badge(Difficulty.Advanced); // 通过
badge('expert');            // 错误：'"expert"' 不能赋给 Difficulty —— 正是想要的
```

`(typeof X)[keyof typeof X]` 这个固定搭配读法：`typeof X` 拿到对象的精确类型（`as const` 保证了值是字面量），`keyof` 拿所有键，索引访问取出全部值的联合。容易记混的是 `keyof typeof X` 单独用——那是**键**的联合（`'Beginner' | ...`），别和值搞混。

### 3.2 运行时校验：enum 有「属性」帮你挡，普通对象要自己写

enum 的类型是名义化的，`'beginner' as Difficulty` 之外没法把随便一个 string 当成成员；而字面量联合是结构化的，`string` 一旦被错误地断言进来编译器不管。所以 API 边界、localStorage、URL 参数这些「外部数据」入口，要配一个守卫函数：

```typescript
function isDifficulty(value: unknown): value is Difficulty {
  return (
    typeof value === 'string' &&
    Object.values(Difficulty).includes(value as Difficulty)
  );
}

// 也可以直接复用 zod —— 和 FANDEX 构建期校验 frontmatter 是同一套思路
import { z } from 'zod';
const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);
type DifficultyZod = z.infer<typeof DifficultySchema>; // 与上面手写的联合完全等价
```

这就是 0 节 FANDEX 代码的完整逻辑：**类型层用字面量联合，运行时用 z.enum 把关**，两层用的是同一份值列表。

### 3.3 对照表：enum 写法如何映射到替代写法

| 需求 | enum 写法 | as const 对象写法 |
| --- | --- | --- |
| 定义 | `enum Color { Red = 'RED' }` | `const Color = { Red: 'RED' } as const` |
| 成员类型 | `type T = Color.Red` | `type T = 'RED'` |
| 值联合 | `type T = Color` | `(typeof Color)[keyof typeof Color]` |
| 键联合 | `keyof typeof Color` | `keyof typeof Color`（一致） |
| 遍历值 | `Object.values(Color)` | `Object.values(Color)`（且无反向键混入） |
| 由值反查键 | 需手写映射 | `Object.entries` 里 find |
| switch 穷尽检查 | never 兜底（见下） | 同左，写法一致 |

穷尽检查是两种写法共用的技巧，值得单独记：

```typescript
function label(c: keyof typeof Color): string {
  switch (c) {
    case 'Red': return '红';
    case 'Green': return '绿';
    case 'Blue': return '蓝';
    default: {
      const exhaust: never = c; // 未来新增成员时这里编译报错，提醒你补分支
      return exhaust;
    }
  }
}
```

## 4. 坑点与自检

### 坑一：数字枚举的反向映射污染遍历

第 1 节已经见过：`Object.keys(Direction)` 吐出 8 个键。任何「遍历成员」「统计成员数」「序列化枚举对象」的代码都可能被反向映射偷袭。字符串枚举和 as const 对象没有这个问题。

### 坑二：const enum 撞上按需转译工具链

症状通常是运行时 `Cannot read property 'xxx' of undefined`，或 `isolatedModules` 下直接报错。排查顺序：搜代码里的 `const enum` → 全部改成普通 enum 或 as const 对象。Vite、esbuild、Babel、swc 项目默认中招。

### 坑三：enum 与字面量联合互不相认

```typescript
enum Status { Active = 'ACTIVE' }
type StatusUnion = 'ACTIVE';

const a: Status = 'ACTIVE';       // 错误：enum 不是 string 的子集别名
const b: StatusUnion = Status.Active; // 错误：反过来也不行
```

enum 有名义化倾向（每个 enum 是独立类型），与字面量联合结构不兼容。混用两种风格的项目会在边界处堆满 `as` 断言——**API 边界统一用一种风格**，是省掉一半断言的纪律。

### 坑四：数字枚举允许计算成员与重复值静默覆盖

```typescript
enum E {
  A = 1,
  B = 1,      // 不报错！反向映射 E[1] 变成 'B'，'A' 被覆盖
  C = 'A'.length, // 计算成员合法，但要求它之后的成员必须显式赋值
}
```

### 坑五：`erasableSyntaxOnly` 迁移项目的库存 enum

给老项目开 `erasableSyntaxOnly`（比如为了配合 Node 类型剥离直跑），存量 enum 会全部报错。迁移路径就是第 3 节的机械替换：enum 对象改 `as const`，类型引用改 `(typeof X)[keyof typeof X]`。codemod 十几行就能写完，比想象中简单。

### 自检清单

- [ ] 项目里还有 `const enum` 吗？打包器是哪一家？
- [ ] 数字枚举的遍历代码有没有被反向映射污染？
- [ ] 外部数据入口（API/localStorage/URL）对枚举值做了运行时校验吗？
- [ ] 新写的枚举，是否优先考虑了 as const 对象 + z.enum 的组合？

## 5. 练习

1. 在 FANDEX 仓库 `app-web/src` 里找一个使用字面量联合或 z.enum 的位置，说明为什么这里不用 enum（提示：检查它是否需要被 `Object.values` 遍历、是否要过运行时校验）。
2. 把下面的 enum 改写成 as const 对象方案，保持调用方代码不变：

   ```typescript
   enum Theme {
     Light = 'light',
     Dark = 'dark',
     System = 'system',
   }
   function applyTheme(t: Theme) { /* ... */ }
   applyTheme(Theme.Dark);
   ```

3. 写出 `enum Weekday { Mon = 1, Tue, Wed }` 的完整 JS 产物（手写，然后 `npx tsc` 验证）。
4. 给第 3.1 节的 `Difficulty` 加一个「由值反查键」的函数 `keyOf(value: Difficulty): string | null`，要求不写死的映射表。
5. （挑错）下面的注释里有一个类型错误，指出来：

   ```typescript
   const Color = { Red: 'RED', Green: 'GREEN' } as const;
   type ColorKey = keyof typeof Color;      // 注释：'RED' | 'GREEN'
   type ColorValue = (typeof Color)[keyof typeof Color]; // 注释：'Red' | 'Green'
   ```

## 6. 下一步

- [170：const 断言 as const](/typescript/170-ConstAssertion)：替代方案的类型机制详解；
- [180：satisfies 操作符](/typescript/180-SatisfiesOperator)：给 as const 对象再加一层「字段校验」的黄金组合；
- [670：TypeScript 5.x 新特性演进](/typescript/670-TypeScript5xNewFeatures)：erasableSyntaxOnly 与 5.x 后期语法收敛的全景；
- [580：类型安全的状态管理](/typescript/580-TypeSafeStateManagement)：用联合类型写编译期状态机，比 enum 更进一步；
- [150：类型守卫与自定义守卫](/typescript/150-TypeGuardCustomGuard)：把第 3.2 节的守卫函数写成通用工具。
