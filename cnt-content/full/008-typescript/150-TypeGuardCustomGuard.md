---
order: 150
title: 类型守卫与自定义守卫
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: 从 localStorage 里的脏数据出发，讲透 TypeScript 的类型收窄：内置守卫、判别式联合、自定义类型谓词与断言函数，以及七个经典坑点。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/110-LiteralUnionTypes'
  - 'typescript/190-NeverTypeSemantics'
  - 'typescript/660-RuntimeSchemaValidation'
  - 'typescript/120-IntersectionTypeMerge'
prerequisites:
  - 'typescript/110-LiteralUnionTypes'
---

## 0. 真实场景：localStorage 里躺着的草稿

FANDEX 的编辑器要做一个草稿自动保存：每 30 秒把文档元数据写进 localStorage，下次打开页面时恢复。写的时候是这么存的：

```typescript
// 保存时
localStorage.setItem('draft', JSON.stringify({
  title: '类型收窄笔记',
  wordCount: 1200,
  tags: ['typescript'],
}));
```

恢复的时候麻烦来了：`JSON.parse` 的返回类型是 `any`，而且 localStorage 里什么都可能躺着的——上一个版本的格式、用户手动改过的串、甚至是残缺的半个 JSON。如果直接当 `DocMeta` 用：

```typescript
interface DocMeta {
  title: string;
  wordCount: number;
  tags: string[];
}

const raw = JSON.parse(localStorage.getItem('draft') ?? 'null');
const draft = raw as DocMeta;          // 编译器闭嘴了
console.log(draft.title.toUpperCase()); // 运行时炸了：raw 是 null
```

`as` 断言只是说服编译器闭嘴，不产生任何运行时检查。类型收窄（narrowing）解决的就是这个问题：**用真正的运行时判断，让编译器在判断通过的分支里把类型换成更精确的那个**。类型守卫就是做这种判断的代码。

## 1. 一句话理解

> 类型守卫 = 安检员。`typeof x === 'string'` 就是「请出示证件」：检查通过的分支里，TS 才允许你把 x 当字符串用；没通过的分支里，x 保持原来的宽类型。自定义类型谓词 `x is T` 则是给你自己写的检查函数配一张「安检资质证」。

## 2. 动手：五个内置收窄，一个例子跑完

先看 TS 自带的收窄能力。下面每一段都能直接贴进 ts playground 或用 FANDEX 仓库的 tsx 跑（`npx tsx 文件名.ts`）。

### 2.1 typeof：按基本类型分流

```typescript
function format(value: string | number): string {
  if (typeof value === 'string') {
    return value.trim();        // 这个分支里 value 一定是 string
  }
  return value.toFixed(2);      // 排除 string 后，剩下的只有 number
}
```

为什么生效：TS 的控制流分析（CFA）跟着 `if`/`else`/`return`/`switch` 走。`typeof value === 'string'` 为真的分支里，`value` 的类型从 `string | number` 被「收窄」成 `string`；走完这个分支没返回，后面就只剩 `number`。收窄不是转换，是排除法。

### 2.2 真值收窄与相等收窄：对付 null 和 undefined

```typescript
function greet(name: string | null) {
  if (name) {
    return name.toUpperCase();  // null 被排除（注意空字符串也会被排除，见坑点）
  }
  return '无名氏';
}

function compare(a: string | number, b: string | number) {
  if (a === b) {
    // a === b 成立时，TS 推出两者类型相同：string | number
    return a + b;
  }
  return 0;
}
```

`=== null`、`!== undefined`、`x != null`（同时排除两种空值）都会触发收窄。配合 `strictNullChecks`，这是消灭「Cannot read properties of null」的第一道防线。

### 2.3 in：按属性存在性分流

```typescript
interface EpubDoc { format: 'epub'; chapters: number }
interface PdfDoc  { format: 'pdf';  pages: number }

function pageCount(doc: EpubDoc | PdfDoc): number {
  if ('chapters' in doc) {
    return doc.chapters;        // 有 chapters 属性的只可能是 EpubDoc
  }
  return doc.pages;
}
```

`in` 检查的是属性存在性，靠它把联合类型分成两半。

### 2.4 instanceof：按类分流

```typescript
class PreviewError extends Error {
  constructor(public assetId: string) {
    super('预览构建失败');
  }
}

function log(err: Error) {
  if (err instanceof PreviewError) {
    console.log(`资产 ${err.assetId} 构建失败`);  // 访问子类属性
    return;
  }
  console.log(err.message);
}
```

### 2.5 数组与字面量的小收窄

```typescript
const kinds = ['doc', 'post', 'note'] as const;
const k = kinds[Math.floor(Math.random() * 3)];   // 'doc' | 'post' | 'note'

if (k === 'doc') {
  // k 收窄为 'doc'
}

function first<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[0] : undefined;     // length 判断 + 严格索引收窄
}
```

## 3. 判别式联合：收窄的王牌

五种内置守卫都是「通用招式」。真正让业务代码变干净的是判别式联合（discriminated union）：给联合的每个成员放一个**字面量类型的公共字段**，switch 它就能精确分流。

```typescript
// FANDEX 文档的三种加载状态，用字面量做「标签」
type DocState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; doc: DocMeta };

function render(state: DocState): string {
  switch (state.status) {
    case 'loading':
      return '加载中...';
    case 'error':
      return `出错了：${state.message}`;   // 只有这个分支能碰 message
    case 'ready':
      return state.doc.title;             // 只有这个分支能碰 doc
  }
}
```

为什么它是王牌：`state.status === 'error'` 这一个判断同时干掉了另外两个成员，分支内的类型精确到具体成员。**漏分支还能被抓住**——把 `state` 赋给 `never`（见 [never 类型完整语义](/typescript/190-NeverTypeSemantics)）：

```typescript
function assertNever(x: never): never {
  throw new Error('漏了分支：' + JSON.stringify(x));
}

function render(state: DocState): string {
  switch (state.status) {
    case 'loading': return '加载中...';
    case 'error':   return `出错了：${state.message}`;
    case 'ready':   return state.doc.title;
    default:
      return assertNever(state);  // 漏写任何一个 case，这里编译报错
  }
}
```

明天产品加一个 `status: 'archived'`，`DocState` 一改，所有没处理它的 switch 当场报红——这就是「让非法状态无法表示」的落地形态。

## 4. 动手：给草稿写一个自定义类型守卫

回到开头的 localStorage 场景。内置守卫拼出来的检查会很长，把它包成一个函数，配类型谓词签名：

```typescript
function isDocMeta(value: unknown): value is DocMeta {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value && typeof (value as Record<string, unknown>).title === 'string' &&
    'wordCount' in value && typeof (value as Record<string, unknown>).wordCount === 'number' &&
    'tags' in value && Array.isArray((value as Record<string, unknown>).tags)
  );
}

// 用法：这一行同时完成「运行时检查」和「编译期收窄」
const raw: unknown = JSON.parse(localStorage.getItem('draft') ?? 'null');
if (isDocMeta(raw)) {
  console.log(raw.title.toUpperCase());   // raw 在这里被认作 DocMeta
} else {
  console.log('草稿已损坏，忽略');
}
```

拆解两个关键点：

1. **参数类型写 `unknown` 不写 `any`**。`unknown` 是「未经验证的数据」的正确容器：不收窄前什么都干不了，逼你走守卫；`any` 则两头畅通，守卫形同虚设。
2. **返回类型 `value is DocMeta` 是类型谓词**。它告诉编译器：「这个函数返回 true 时，调用处的 value 可以当作 DocMeta」。函数体里必须真的做了相应检查——编译器**不验证**谓词和函数体是否一致（见坑点 3）。

### 4.1 断言函数：抛错版守卫

如果「不是 DocMeta 就该当场崩」，用断言函数。它不返回布尔值，而是「要么通过，要么抛异常」：

```typescript
function assertDocMeta(value: unknown): asserts value is DocMeta {
  if (!isDocMeta(value)) {
    throw new TypeError(`草稿格式损坏: ${JSON.stringify(value)}`);
  }
}

const raw: unknown = JSON.parse(localStorage.getItem('draft') ?? 'null');
assertDocMeta(raw);            // 通过之后
console.log(raw.title);        // raw 被永久收窄为 DocMeta（不需要 if 包裹）
```

谓词 `is` 适合「两条路都想好」的分支逻辑；`asserts` 适合「不过就别往下走」的契约检查，常见于函数入口参数验证。

### 4.2 TS 5.5 起的福利：推断类型谓词

2026 年写 TS 5.x，很多简单过滤器已经不用手写谓词了——TS 5.5 引入推断类型谓词，编译器能从函数体自动推出 `is`：

```typescript
function isString(x: unknown): boolean {
  return typeof x === 'string';
}

const mixed: (string | number)[] = ['a', 1, 'b'];
const strs = mixed.filter(isString);   // TS 5.5 前: (string | number)[]
                                       // TS 5.5 起: string[]，编译器自己推出谓词
```

规则：当函数体是「直接对参数做收窄判断并返回结果」这种简单形态时，`boolean` 返回值会被自动升级为谓词。带副作用、包了一层间接调用的函数推不出来，该手写还是手写。

## 5. 为什么：收窄的本质是排除法

把类型想成集合：`string | number` 是「所有字符串并上所有数字」的并集。守卫做的事是问一个运行时问题，然后按答案把并集**减掉**不可能的子集：

- `typeof x === 'string'` 为真，剩下的集合只有 string；
- `x !== null` 为真，减掉 null 那个单元素集合；
- `state.status === 'error'` 为真，剩下 error 那个成员。

自定义谓词则是给「一个更复杂的减法」起名字。理解成减法而不是「转换」，很多行为就不神秘了：收窄只在这段控制流里有效，函数调用、闭包捕获、后续赋值都可能让收窄失效（见坑点 6）。

## 6. 坑点与自检

### 坑 1：typeof null === 'object'

JavaScript 的历史遗留：`typeof null` 返回 `'object'`。用 `typeof x === 'object'` 判断对象必须补一个非空检查：

```typescript
if (typeof value === 'object' && value !== null) { ... }
```

判断数组用 `Array.isArray`，别用 `typeof`（数组 typeof 也是 `'object'`）。

### 坑 2：in 检查对可选属性太宽松

```typescript
interface User { email?: string }
const u: User = {};
if ('email' in u) {
  u.email?.toUpperCase();   // 'email' in u 为真，值仍可能是 undefined！
}
```

`in` 只回答「属性存在吗」，不回答「值有内容吗」。对可选属性，直接 `u.email !== undefined` 更可靠。

### 坑 3：谓词说谎，编译器不拦

```typescript
function isString(x: unknown): x is string {
  return typeof x === 'number';   // 编译通过，运行时全错
}
```

类型谓词的函数体编译器**不验证**，写错了就是你亲手给脏数据发通行证。守住两条：谓词函数体保持「一眼能对上签名」的简单检查；对复杂结构，改用 Schema 校验库（zod 的 `safeParse` 一次校验 + 推导类型），见[运行时 Schema 校验](/typescript/660-RuntimeSchemaValidation)。

### 坑 4：instanceof 跨 iframe（或跨 JS 领域）失效

`instanceof` 沿原型链找构造函数，而每个 iframe / vm 沙箱都有自己的 `Array` 构造函数。跨领域判断数组一律用 `Array.isArray`，它不依赖原型链。

### 坑 5：filter 回调返回 boolean 不收窄

```typescript
const strs = mixed.filter((x) => typeof x === 'string');  // 结果仍是 (string | number)[]
```

回调带返回类型注解会阻止自动推断，匿名简写函数 TS 5.5 也推不出来。要么写具名函数 `function isString(x: unknown): x is string`，要么用类型谓词版回调 `.filter((x): x is string => typeof x === 'string')`。

### 坑 6：收窄会被后续代码打破

收窄只在编译器的「当前视线」里有效。赋值、函数调用、把变量存进可变容器都可能让旧收窄过期，编译器会主动收回——看到「收窄后又变宽」的报错，不是编译器坏了，是它比你谨慎。别为了绕过它加 `as`，重新检查一次更安全。

### 坑 7：switch 漏分支没人报错

不用 `assertNever`（或 return 类型上没有覆盖所有分支的约束），新增联合成员后漏处理的分支会静默通过。判别式联合 + never 穷尽检查是标配组合，见第 3 节。

### 自检清单

- [ ] 能说出 `typeof` / `in` / `instanceof` / 相等判断各自收窄什么
- [ ] 能解释判别式联合为什么比连写 `if ('message' in x)` 干净
- [ ] 会写 `x is T` 谓词函数，并知道参数类型该用 `unknown`
- [ ] 能区分 `x is T` 与 `asserts x is T` 的使用场景
- [ ] 知道 TS 5.5 的推断类型谓词省了什么事，以及它推不出来的情况
- [ ] 能一眼识别 `typeof x === 'object'` 少了 `!== null`

## 7. 练习

1. 写一个 `isTagList(value: unknown): value is string[]`，要求每个元素都是非空字符串，并说明你为什么不用 `instanceof Array`。
2. 给 `DocState` 新增 `{ status: 'archived'; at: string }` 成员，验证第 3 节的 `render` 在不写新 case 时编译报错，再补上 case 修复它。
3. 把坑 3 的说谎谓词修成诚实的版本，然后用 FANDEX 同款方式在仓库根目录建 `scratch/guard.ts`，写一段「喂它错误数据」的代码，用 `npx tsc --noEmit` 和 `npx tsx scratch/guard.ts` 分别观察编译期与运行时的差异。

## 8. 下一步

- [never 类型完整语义](/typescript/190-NeverTypeSemantics)：穷尽检查背后 never 的完整语义
- [运行时 Schema 校验](/typescript/660-RuntimeSchemaValidation)：复杂结构交给 zod，schema 即类型
- [索引签名与动态属性](/typescript/140-IndexSignatureDynamicProperty)：谓词函数里 `Record<string, unknown>` 那一招的展开
- [类型安全的 API 客户端](/typescript/570-TypeSafeAPIClient)：守卫在请求边界的系统化用法
