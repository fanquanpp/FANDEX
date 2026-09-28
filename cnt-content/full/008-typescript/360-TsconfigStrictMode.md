---
order: 360
title: tsconfig 严格模式
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: 以 FANDEX 仓库两份真实 tsconfig 为例，讲透 strict 总开关与各子选项的实际效果：null 检查、隐式 any、函数参数逆变、属性初始化、catch 未知类型，以及 noUncheckedIndexedAccess 与 exactOptionalPropertyTypes 两个「编外」选项的取舍。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'typescript/680-TypeScript6And7CompilerEvolution'
  - 'typescript/350-TypeScriptEngineeringConfig'
  - 'typescript/260-CovarianceContravariance'
  - 'typescript/190-NeverTypeSemantics'
prerequisites:
  - 'typescript/350-TypeScriptEngineeringConfig'
  - 'typescript/110-LiteralUnionTypes'
---

## 学习目标

- [ ] 能说出 `strict: true` 聚合了哪些子选项，以及每个子选项挡住的是哪类运行时事故
- [ ] 能读懂 FANDEX 仓库「根 tsconfig + extends astro/tsconfigs/strict 再加强」的两层配置结构
- [ ] 能解释为什么 `noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes` 不在 strict 里，以及你的项目该不该开
- [ ] 能用类型守卫处理 `unknown` 的 catch 变量，而不是一上来就 `as Error`
- [ ] 能说出 TS 6.0 起 `strict` 默认值翻结对老项目意味着什么

## 一句话理解

> `strict` 不是「更严的语法」，而是一组「拒绝猜测」的开关：类型猜不出来（隐式 any）就报错、可能为空（null/undefined）就要求你处理、函数参数方向（逆变）不再放宽、属性没初始化就报错。每一项都对应一类真实线上事故。

## 0. 真实场景：从 FANDEX 的两份配置说起

FANDEX 是一个 pnpm monorepo，仓库里同时存在两份思路不同的 tsconfig，正好是「严格模式」的两个层次。

第一份是根目录的 `tsconfig.json`，服务桌面端与共享包，手写所有选项：

```jsonc
// FANDEX/tsconfig.json（节选）
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": false,
    "declaration": true,
    "declarationMap": true
  }
}
```

第二份是文档站 `app-web/tsconfig.json`，先继承 Astro 官方的严格预设，再额外加码两个选项：

```jsonc
// FANDEX/app-web/tsconfig.json（节选）
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,      // strict 不含它，手动开
    "exactOptionalPropertyTypes": true,    // strict 不含它，手动开
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "paths": { "@/*": ["src/*"] }
  }
}
```

为什么第二份要「再加码」？因为 `strict` 的覆盖面是 2017 年设计的，之后新出现的更强的检查（索引访问、可选属性精确性）为了不破坏兼容性，一直没被纳入总开关。读完本文你会明白这两行各挡住了什么事故。

## 1. 动手：亲手感受每个开关挡住的事故

建一个最小项目，逐个打开选项看报错。整个过程 5 分钟：

```bash
mkdir strict-demo && cd strict-demo
pnpm init && pnpm add -D typescript
npx tsc --init --strict false   # 从全关开始
```

### 实验一：strictNullChecks —— 空值是「可能的值」，不是「随便的值」

```typescript
// strictNullChecks: false 时代：null 是所有类型的成员，下面代码畅通无阻
function greet(name: string) {
  return name.toUpperCase();
}
const user = null as string | null;
greet(user); // 不关它的事？关：关掉检查时 null 可赋给 string，编译通过，运行时爆炸
// TypeError: Cannot read properties of null (reading 'toUpperCase')
```

打开 `strictNullChecks: true` 后：

```typescript
function greet(name: string) {
  return name.toUpperCase();
}
const user: string | null = getName(); // 可能拿不到

greet(user); // 错误：null 不能赋给 string —— 事故在编译期被拦下

// 修复路径就是控制流收窄：处理空的情况，剩下的就是安全的
if (user === null) return 'Hello, Guest';
greet(user); // 此分支里 user 已收窄为 string
```

日常写法里，可选链 `user?.address?.city` 与空值合并 `?? 'Unknown'` 是它的两个顺手工具。**要点不是「不许为空」，而是「为空必须被显式处理」。**

### 实验二：noImplicitAny —— 猜不出来的类型，不许默认 any

```typescript
// noImplicitAny: false：参数没写类型？那就是 any，随便用
function parse(input) {
  return input.trim(); // input 是什么？天知道
}

// noImplicitAny: true：
function parse(input) {
  //        ^^^^^ 错误：参数 input 隐式具有 any 类型
  return input.trim();
}
```

注意边界：它禁的是**隐式** any。显式 `any` 依旧合法（逃生门保留），更好的逃生门是 `unknown`——用前必须收窄，见实验五。数组上下文里推断能work的就不报错：`[1, 2, 3].map(item => item * 2)` 里的 `item` 由 `Array<number>` 推断为 `number`，不算隐式 any。

### 实验三：strictFunctionTypes —— 函数参数按逆变检查

```typescript
class Animal { name = ''; }
class Dog extends Animal { breed = ''; }

type DogHandler = (dog: Dog) => void;
type AnimalHandler = (animal: Animal) => void;

const walkDog: DogHandler = (dog) => console.log(dog.breed);

// 关闭检查：允许（参数双向兼容）——但运行时可能传入一只猫
const walkAnimal: AnimalHandler = walkDog; // walkDog 只认识 Dog，却被要求处理任意 Animal

// strictFunctionTypes: true：报错，参数类型不兼容
// 反方向是安全的：会处理任意 Animal 的函数，当然能处理 Dog
const safe: DogHandler = (dog) => console.log(dog.name); // 接 Animal 的实现，OK
```

一个必须知道的例外：**用方法简写声明的成员（`handle(animal: Animal): void`）仍然走双向兼容**，只有函数类型属性（`handle: (animal: Animal) => void`）走逆变。这是为 DOM 事件处理器等历史模式保留的口子。变型的完整推导见 [260：协变与逆变](/typescript/260-CovarianceContravariance)。

### 实验四：strictPropertyInitialization —— 属性必须被真正初始化

```typescript
class UserService {
  private users: User[];
  //        ^^^^^ 错误：属性 users 没有初始化表达式，
  //              且未在构造函数中明确赋值
}
```

四条合法出路，按推荐顺序：

```typescript
class A { private users: User[] = []; }                    // 1. 内联初始化（最常见）
class B { constructor() { this.users = []; } }             // 2. 构造函数赋值
class C { private users?: User[]; }                        // 3. 声明为可选，用时判空
class D { private users!: User[]; }                        // 4. 确定赋值断言：我保证用前会赋值
```

第 4 种是给「构造后由框架赋值」场景的（老式 DI、生命周期钩子），它把检查责任完全转交给人，能用前三种就不要用它。

### 实验五：useUnknownInCatchVariables —— catch 里的东西是什么类型

```typescript
try {
  JSON.parse(raw);
} catch (error) {
  // strict 下 error: unknown，不再是 any
  console.log(error.message); // 错误：Object is of type 'unknown'
}
```

正确姿势是把「提取错误信息」封装成一个总函数，全项目复用：

```typescript
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;      // instanceof 收窄
  if (typeof error === 'string') return error;           // 有些库 throw 字符串
  return 'Unknown error';
}

try {
  JSON.parse(raw);
} catch (error) {
  report(errorMessage(error)); // 全部收窄逻辑集中在一处
}
```

## 2. 讲为什么：strict 到底聚合了什么

`strict: true` 是聚合开关，逐项列出它打开的检查与各自拦截的事故：

| 子选项 | 拦截的事故 | 典型报错关键词 |
| --- | --- | --- |
| `strictNullChecks` | 把 null/undefined 当成「不可能出现」 | Object is possibly 'null' |
| `noImplicitAny` | 类型猜不出来时静默放行 | implicitly has an 'any' type |
| `strictFunctionTypes` | 函数参数双向兼容导致的类型谎报 | Types of parameters ... are incompatible |
| `strictBindCallApply` | bind/call/apply 参数不检查 | Argument of type ... |
| `strictPropertyInitialization` | 类属性未初始化就使用 | has no initializer |
| `noImplicitThis` | 独立函数/回调里 this 变 any | 'this' implicitly has type 'any' |
| `useUnknownInCatchVariables` | catch 变量默认 any | Object is of type 'unknown' |
| `alwaysStrict` | 产物缺 'use strict' 指令 | （非类型检查） |

设计逻辑一句话：**凡是编译器「猜」出来的宽容（any、可空、双向），strict 全部改成「要么证明、要么报错」。** 这也是它常常一次性爆出几百个错误的原因——那些错误大多是本来就存在的隐患，不是开关制造的。

版本坐标：这些选项在 TS 2.3 到 4.4 间陆续加入；TS 6.0（2026-03，编译器换代前的桥梁版本）把 `strict` 的默认值从 `false` 翻成 `true`——没显式写 tsconfig 的项目升级后会「突然变红」，对策是显式声明选项（锁档），详见 [680：TypeScript 6.0 与 7.0](/typescript/680-TypeScript6And7CompilerEvolution)。FANDEX 这类 `strict: true` 显式写出的项目升级时零感知。

## 3. 编外双雄：noUncheckedIndexedAccess 与 exactOptionalPropertyTypes

这两个选项不在 strict 里，但 FANDEX 文档站都开了。理解它们「为什么编外」，比记住语法更重要。

### noUncheckedIndexedAccess：索引访问的结果可能不存在

```typescript
const map: Record<string, number> = { a: 1 };

// 默认（含 strict）：map['a'] 的类型是 number —— 编译器假装键一定存在
// 开启后：map['a'] 的类型是 number | undefined

const v = map['typo']; // v: number | undefined —— 用前必须处理
if (v !== undefined) console.log(v + 1);

// 对数组同样生效
const arr = [10, 20];
arr[5]; // number | undefined（默认是 number，纯属谎言）
```

它拦的是「越界/拼错键」这一类真实事故，代价是所有 `obj[key]` 都要判一次空。**编外原因**：对存量代码是海啸级改动。新项目（尤其大量用 Record 做映射表的）建议开局就开——FANDEX 就是这么做的。

### exactOptionalPropertyTypes：undefined 和「没有这个属性」是两回事

```typescript
type ButtonProps = { label?: string };

const b1: ButtonProps = {};            // 没有 label —— 两种写法都合法
const b2: ButtonProps = { label: undefined };

// 默认：b1 与 b2 等价（label?: string 等价于 string | undefined）
// 开启后：b2 报错 —— label 可以「不写」，但写了就必须是 string

// 受影响最大的场景：透传 props
function transfer(props: ButtonProps) {
  return <Button {...props} />; // 开启后，undefined 不再被静默塞进对象
}
```

它拦的是「本想删掉属性，结果传了个 undefined」的组件行为漂移。**编外原因**：很多库的类型定义没区分这两种情况，开了之后报错可能来自 node_modules（`skipLibCheck` 只跳过声明文件内部检查，挡不住使用处报错）。FANDEX 文档站开了它并且没有遇到阻碍；UI 组件库密集、依赖生态老旧的项目要先评估。

### FANDEX 两层结构的启示

根配置定「全仓基线」（严格但保守），子项目在 extends 之上按需加码（`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`）。这条「基线 + 加码」策略让 monorepo 里不同性质的包（文档站 vs 桌面端 vs 共享库）可以用同一个底座、各自演进，而不必互相迁就。

## 4. 坑点与自检

### 坑一：靠 `!` 和 `as` 关掉报警器

strict 报错后最快的「修复」是 `user!` 与 `as User`——它们不是修复，是把检查责任转给你自己。纪律：`!` 只用于「构造后由框架赋值」且有注释说明；`as` 只用于从 `unknown` 收窄且最好配类型守卫。每加一个，都要能在 code review 里说出「为什么这里安全」。

### 坑二：以为 skipLibCheck 能挡住第三方类型的报错

`skipLibCheck: true`（FANDEX 根配置里就有）只跳过**声明文件内部的**检查，你在业务代码里使用第三方类型时依然会被检查。它解决的是「依赖包之间声明文件互相冲突」的编译噪音，不是类型安全的免死金牌。

### 坑三：只在 IDE 里验证严格性

编辑器用的 TS 版本和 CI 里 `tsc` 的版本可能不同，结论可能不一致。以 CI 的 `tsc --noEmit`（FANDEX 的 `pnpm typecheck`，文档站走 `astro check`）为准，并把 typescript 版本锁进 pnpm catalog——全仓库一个版本。

### 自检清单

- [ ] 项目 tsconfig 里 `strict` 是显式写出的 `true`，还是依赖默认值？
- [ ] `noUncheckedIndexedAccess` 开了吗？所有 `record[key]` 的消费处都能处理 undefined 吗？
- [ ] `catch` 的错误信息提取是不是统一走一个 `errorMessage(error: unknown)`？
- [ ] 代码里的 `!` 与 `as` 每一处都能说出安全理由吗？

## 5. 练习

1. 在 FANDEX 仓库 `app-web/src` 里搜一处 `!`（非空断言）或 `as`，判断它属于「合理逃生门」还是「应该改成类型守卫」，给出改法。
2. 给下面的代码开全 strict 后逐行修错（不许用 `!` 和 `as`）：

   ```typescript
   function findUser(id) {
     const users = loadUsers();          // 返回 User[] | null
     return users.find(u => u.id === id);
   }
   const user = findUser('u1');
   console.log(user.name.toUpperCase());
   ```

3. 解释：为什么 `strict: true` 下，`interface C { handle(a: Animal): void }` 的实现可以赋给参数更窄的接口，而 `type C = { handle: (a: Animal) => void }` 不行？
4. 给一个 `Record<string, string[]>` 计数器（统计单词出现次数）补全实现，要求在 `noUncheckedIndexedAccess: true` 下编译通过：

   ```typescript
   function count(words: string[]): Record<string, number> {
     const result: Record<string, number> = {};
     for (const w of words) {
       // 补全：累加计数
     }
     return result;
   }
   ```

## 6. 下一步

- [680：TypeScript 6.0 与 7.0](/typescript/680-TypeScript6And7CompilerEvolution)：strict 默认值翻转的完整清单与迁移策略；
- [260：协变与逆变](/typescript/260-CovarianceContravariance)：strictFunctionTypes 背后的类型论；
- [150：类型守卫与自定义守卫](/typescript/150-TypeGuardCustomGuard)：处理 unknown 的系统方法；
- [350：TypeScript 工程化配置](/typescript/350-TypeScriptEngineeringConfig)：tsconfig 其余工程选项的全景。
