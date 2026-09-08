---
order: 660
title: TypeScript 类型测试与断言
module: 'typescript'
category: 前端技术
difficulty: advanced
description: 给类型层 API 建回归防线：手写 Equal/Expect 断言、tsd 工具、@ts-expect-error 与 never 穷尽检查的完整用法。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'typescript/034-UtilityTypePrinciple'
  - 'typescript/052-SatisfiesOperator'
  - 'typescript/016-NeverTypeSemantics'
  - 'typescript/053-TypeScriptMigrationPractice'
prerequisites:
  - 'typescript/011-FunctionGeneric'
---

## 0. 学习目标（可验证）

- [ ] 能解释"类型测试"与"运行时测试"分别验证什么
- [ ] 能手写 `Expect`/`Equal` 断言工具，给工具类型建立编译期契约
- [ ] 会用 `@ts-expect-error` 断言"某行必须报错"，并说出它与 `@ts-ignore` 的关键差异
- [ ] 能用 `satisfies` 与 `never` 穷尽检查守住枚举/联合类型的完整性

## 1. 一句话理解

> 运行时测试验证"值的行为"，类型测试验证"编译器眼中的形状"。类型也是代码：工具类型改坏一个条件分支，普通单测毫无察觉——类型测试就是给"类型层 API"的回归防线。

## 2. 为什么需要类型测试

- 工具类型、泛型函数是"类型层面的 API"，重构时容易悄悄改变推断结果；
- 类型错误只在编译时报，`vitest`/`jest` 等**运行时**测试根本覆盖不到；
- 发布库给他人用时，类型行为就是文档的一部分，必须可验证、可回归；
- 升级 TypeScript 版本或大规模重构后，类型测试是"类型没有悄悄变坏"的唯一证据。

## 3. 方式一：零依赖手写断言（推荐起步）

不需要任何第三方库，三个类型别名就能建立编译期契约：

```typescript
// Expect<T>：要求 T 必须是 true，否则这一行编译报错
type Expect<T extends true> = T;

// Equal<X, Y>：判断两个类型是否"完全相同"（不只是互相可赋值）
// 经典的"两次泛型函数比较"技巧：利用内部类型身份做最严格的相等判定
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

// Prettify<T>：把交叉/映射类型"拍平"展示，避免 Equal 因展开形式不同误判
type Prettify<T> = { [K in keyof T]: T[K] };
```

用 `const` 断言给推断结果建立契约：

```typescript
declare function createPair<A, B>(first: A, second: B): { first: A; second: B };

// 示例 1：断言函数返回类型的推断结果
const _pairCase = Expect<
  Equal<ReturnType<typeof createPair<string, number>>, { first: string; second: number }>
>;

// 示例 2：断言 as const 后的字面量收窄契约
const config = { mode: 'production', level: 3 } as const;
type Config = typeof config;
const _configCases = [
  Expect<Equal<Config['mode'], 'production'>>,  // 是字面量 'production'，不是 string
  Expect<Equal<Config['level'], 3>>,            // 是字面量 3，不是 number
];
```

**讲解：**

1. `Equal` 不能用 `X extends Y ? Y extends X ? true : false : false` 代替：那种写法对 `any`、联合类型会误判；两次泛型函数身份比较是目前公认最严格的写法；
2. 断言失败时报错发生在**这一行 const** 上，配合文件命名（如 `_type-tests.ts`）即可快速定位；
3. 这些"测试"不产出任何运行时代码（`declare` + 纯类型），零成本挂在源码或测试目录里。

## 4. 方式二：tsd 断言库

先安装并配置：

```bash
pnpm add -D tsd
```

```json
// package.json 增加测试脚本
{
  "scripts": {
    "test:types": "tsd"
  },
  "types": "./dist/index.d.ts"
}
```

编写类型测试文件（默认放在 `index.test-d.ts`，与被测声明文件对应）：

```typescript
import { expectType, expectError } from 'tsd';
import { createPair } from './index';

// 断言返回值类型
expectType<{ first: string; second: number }>(createPair('a', 1));

// 断言推断失败：传错类型应该报错
expectError(createPair('a', 'b'));
```

被测代码：

```typescript
// index.ts
export function createPair<A, B>(first: A, second: B) {
  return { first, second };
}
```

运行 `pnpm test:types`，类型不匹配或"该报错没报错"都会让测试失败。三个核心 API：

| 辅助函数 | 作用 |
| --- | --- |
| `expectType<T>(value)` | 断言 value 的类型与 T 完全一致 |
| `expectAssignable<T>(value)` | 断言 value 可以赋值给 T（宽松版） |
| `expectError(value)` | 断言这行代码**必须**产生类型错误 |

## 5. @ts-expect-error：断言"必须报错"

```typescript
// 工具函数契约：只接受非空数组
declare function firstOf<T>(list: [T, ...T[]]): T;

// @ts-expect-error 的语义是"下一行必须报错"：
// - 如果下一行真的报错（约束生效）  => 注释生效，编译通过
// - 如果下一行不报错（约束被改坏） => 注释本身报错，测试失败
// @ts-expect-error
firstOf([]);
```

**讲解：**

1. `@ts-ignore` 是"忽略下一行的一切错误"，错误消失后它会**静默失效**——掩盖回归；`@ts-expect-error` 相反，错误消失时**它自己报错**，是双向的断言；
2. 因此类型测试中一律用 `@ts-expect-error`：它既断言"现在是错的"，又在"将来被改对了"时主动提醒你更新测试；
3. 每个 `@ts-expect-error` 只覆盖紧随的一行，且必须真的压住至少一个错误，否则报"Unused '@ts-expect-error' directive"。

## 6. satisfies：既校验又保留推断

```typescript
type Routes = { [k: string]: { path: string; auth?: boolean } };

const routes = {
  home: { path: '/' },
  admin: { path: '/admin', auth: true },
} satisfies Routes;

// satisfies 之后字面量类型仍在：routes.admin.auth 被收窄为 true 而非 boolean | undefined
routes.admin.auth === true;

// 校验失败：拼错的字段在这一行直接报错
// const bad = { hom: { path: '/' } } satisfies Routes;
```

**讲解：**

1. 传统写法 `const routes: Routes = {...}` 会把类型"扩宽"成 `Routes`，丢失每个键的具体推断；`satisfies` 做到"按契约校验、按字面量推断"两全；
2. 在类型测试中，`satisfies` 适合验证"对象字面量是否符合接口契约"，手写 `Expect/Equal` 适合验证"泛型推断结果"，二者互补；
3. `satisfies` 由 TS 4.9 引入，详见 `typescript/052-SatisfiesOperator`。

## 7. never 穷尽检查：联合类型加成员时强制补逻辑

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.radius ** 2;
    case 'square':
      return s.size ** 2;
    default: {
      // 如果未来给 Shape 加了 'triangle' 而忘记写分支，
      // s 在这里就不会是 never，赋值报错 => 编译期测试失败
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
```

**讲解：**

1. `never` 是所有类型的子类型：只有当 switch 覆盖了**全部**成员时，`default` 分支里的 `s` 才会被收窄成 `never`；
2. 这是一种"自动过期的测试"：新增联合成员的那一刻，忘记补的分支立刻在编译期红掉；
3. 相关的 never 语义全解见 `typescript/016-NeverTypeSemantics`。

## 8. 常见误区

| 误区 | 真相 |
| --- | --- |
| 用 `as` 断言测类型 | 双重断言（`as unknown as T`）会绕过检查，测了个寂寞；测推断结果用 `Equal` |
| 用 `X extends Y` 当相等判断 | 联合、`any`、可选属性场景会误判；严格相等用泛型函数身份比较的 `Equal` |
| `expectError`/`@ts-expect-error` 越多越好 | 每一处都必须是**有意**的错误；误用会掩盖真正的回归 |
| 类型测试混进运行时测试文件 | 关注点不同：类型测试只在编译期生效，独立成 `_type-tests.ts` / `.test-d.ts` 便于定位 |
| 只测库不测应用 | 应用内的复杂泛型（API 响应映射、状态机）同样值得写契约 |

## 9. 集成到 CI

```jsonc
// package.json：类型测试挂进统一的校验链
{
  "scripts": {
    "test:types": "tsd",
    "typecheck": "tsc --noEmit && pnpm test:types"
  }
}
```

**讲解：** `tsc --noEmit` 会把 `_type-tests.ts` 一并纳入检查，所以"手写断言"路线甚至不需要额外脚本；tsd 路线则需要单独的 `tsd` 步骤。两条路线在 CI 中都应设为必需门禁。

## 10. 动手试试

### 入门版（必做）

1. 手写 `Expect`/`Equal`，给 `Pick<{ a: 1; b: 2 }, 'a'>` 写两条断言，再故意把期望值写成 `{ a: 2 }` 观察报错；
2. 用 `@ts-expect-error` 断言 `firstOf([])` 报错，然后把工具函数约束放宽成 `T[]`，确认 `@ts-expect-error` 自身转为报错；
3. 给第 7 节的 `Shape` 加一个 `'triangle'` 成员（不写分支），验证 `never` 穷尽检查立即红掉。

### 进阶版（选做）

1. 给项目里最复杂的一个工具类型补齐 `.test-d.ts` 契约（成功路径 + 至少一条 `expectError`）；
2. 对比 `const r: Routes = {...}` 与 `satisfies Routes` 两种写法下 `routes.admin.auth` 的悬停类型差异，写一条断言固定住 `satisfies` 版的收窄行为。

## 11. 小结

**初学者记住这三点**：

1. 类型测试验证"编译器眼中的形状"，与运行时测试互补，两者缺一不可；
2. 零依赖起步：`Expect<true>` + `Equal`（泛型函数身份比较）+ `@ts-expect-error` 三个工具就够用；
3. 联合类型 + `switch` 时永远写一个 `never` 兜底分支，让"新增成员忘补逻辑"变成编译错误。

**进阶者还需注意**：

- `Equal` 必须用泛型函数身份比较实现，`extends` 双向检查会误判 `any` 与联合类型；
- `@ts-expect-error` 是双向断言（错误消失时它自己报错），永远用 `@ts-ignore` 的场合仅限"明知有错且不想管"的第三方代码缝隙；
- `satisfies` 负责对象契约校验并保留字面量推断，与 `Equal` 断言、`never` 穷尽检查组成完整的类型测试工具箱。
