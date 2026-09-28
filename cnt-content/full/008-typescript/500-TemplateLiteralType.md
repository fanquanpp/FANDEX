---
order: 510
title: 模板字面量类型：把字符串写进类型
module: 'typescript'
category: '前端技术'
difficulty: advanced
description: 从「URL 拼错一级路径」切入，讲模板字面量类型：联合笛卡尔积、内置四个字符串工具类型、模式匹配提取路由参数，以及组合爆炸与模糊匹配两个坑。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/480-MappedTypeKeyRemap'
  - 'typescript/440-ConditionalTypeInfer'
  - 'typescript/530-TypeGymnasticsPracticalPatterns'
  - 'typescript/620-TypeSafeRoute'
prerequisites:
  - 'typescript/110-LiteralUnionTypes'
  - 'typescript/440-ConditionalTypeInfer'
---

## 0. 真实场景：URL 里多了一个字母

FANDEX 的文章页路由长这样：`/docs/<分类>/<slug>`，站内跳转靠手拼字符串：

```typescript
const url = `/docs/${category}/${slug}`;
window.location.assign(url);
```

有一次传进去的 `category` 是 `'typescript '`（多了个空格），上线后 404。字符串拼接的问题在于：**类型系统眼里的 url 是一个 `string`**，任何拼写错误、空格、漏斜杠它都无感。模板字面量类型（TS 4.1 引入）把「字符串的形状」也纳入类型检查——目标是让 `/docs/ts/xxx` 合法、`/doc/ts/xxx` 编译报错。

## 1. 一句话理解

> 模板字面量类型 = 类型层的模板字符串。值层 `` `${a}/${b}` `` 拼出运行时的字符串，类型层 `` `${A}/${B}` `` 拼出「字符串形状的类型」：占位处填字面量类型，结果的类型就是拼好的那串字面量；占位处填联合类型，则做笛卡尔积展开。

## 2. 动手：从约束一个 URL 开始

### 2.1 约束函数参数的字符串形状

```typescript
type DocPath = `/docs/${string}/${string}`;

function go(path: DocPath) {
  window.location.assign(path);
}

go('/docs/typescript/narrowing');   // 正常
// go('/doc/typescript/narrowing'); // 报错：不符合 `/docs/${string}/${string}`
// go('/docs/typescript');          // 报错：少一级
```

`${string}` 是「任意字符串」占位。模板类型里的占位符只能是 `string`、`number`、`bigint`、`boolean`、`null`、`undefined` 或它们的联合——放个 `object` 会直接报错（运行时拼出来也说不清）。

### 2.2 联合占位：自动笛卡尔积

占位处放联合类型，结果按组合展开：

```typescript
type Lang = 'zh' | 'en';
type Section = 'docs' | 'blog';

type Route = `/${Section}/${Lang}`;
// '/'+'docs'/'zh' 等四种组合：
// '/docs/zh' | '/docs/en' | '/blog/zh' | '/blog/en'

const r: Route = '/docs/zh';    // 合法
// const r2: Route = '/docs/fr'; // 报错
```

这就是「给每个 section × 每种语言生成合法路由」的零成本写法：路由表加一项，类型自动跟上。

### 2.3 四个内置字符串工具类型

| 工具类型 | 作用 | 示例 |
| --- | --- | --- |
| `Uppercase<S>` | 全大写 | `'abc'` 变 `'ABC'` |
| `Lowercase<S>` | 全小写 | `'ABC'` 变 `'abc'` |
| `Capitalize<S>` | 首字母大写 | `'width'` 变 `'Width'` |
| `Uncapitalize<S>` | 首字母小写 | `'Width'` 变 `'width'` |

配合映射类型的 as 子句批量生成新键名（[键重映射](/typescript/480-MappedTypeKeyRemap)里的 `on${Capitalize<K>}` 就是它）：

```typescript
type PropToEvent<K extends string> = `on${Capitalize<K>}`;
type E1 = PropToEvent<'click'>;   // 'onClick'
```

### 2.4 模式匹配：从字符串里「拆」出参数

模板类型放在 `extends` 左侧就成了模式，配 `infer` 提取任意片段（infer 的机制见[infer 专题](/typescript/440-ConditionalTypeInfer)）：

```typescript
// 从 '/docs/typescript/narrowing' 提取 category 与 slug
type ExtractDocPath<S> =
  S extends `/docs/${infer Category}/${infer Slug}` ? { category: Category; slug: Slug } : never;

type P1 = ExtractDocPath<'/docs/typescript/narrowing'>;
// { category: 'typescript'; slug: 'narrowing' }
type P2 = ExtractDocPath<'/blog/2026'>;
// never：模式不匹配
```

多段路径的完整推导（递归拆段）在[类型安全的路由](/typescript/620-TypeSafeRoute)里展开，本篇掌握「一段模式 + 两个 infer」即可覆盖大多数场景。

### 2.5 实用小工具：kebab 转 camel

把 CSS 变量名转成组件属性名，是模板类型的招牌应用：

```typescript
type KebabToCamel<S extends string> =
  S extends `${infer Head}-${infer Rest}`
    ? `${Head}${Capitalize<KebabToCamel<Rest>>}`
    : S;

type T1 = KebabToCamel<'color-surface'>;  // 'colorSurface'
type T2 = KebabToCamel<'font-size-base'>; // 'fontSizeBase'
```

读法：按第一个 `-` 切成两半，后半段递归转换并大写首字母；切不动了（没有 `-`）原样返回。递归出口就是最后那个 `: S`。

## 3. 为什么：类型层也需要「字符串算法」

此前 TS 对字符串的唯一表达是 `string`，粒度太粗：路由、事件名、CSS 属性、i18n 键、环境变量名……这些「有格式的字符串」全都被吞进一个大类型。模板字面量类型补上这一层后：

- **形状即契约**：函数要什么格式的字符串，签名里写出来，调用方拼错当场报错；
- **派生即同步**：新加一个 `'gallery'` section，`Route`、事件名、CSS 键全部自动长出来，不需要人肉同步三处；
- **解析即类型**：`ExtractDocPath` 说明字符串不仅能拼，还能反向拆——这是运行时正则的类型层对应物（没有捕获组那么强，但常见场景够用）。

与运行时模板字符串的关系一句话说清：长得一样、层次不同。运行时那对反引号产出值，类型层这对反引号产出「值的形状」。两者可以在同一处代码各司其职：

```typescript
function makePath(category: string, slug: string): DocPath {
  return `/docs/${category}/${slug}`;   // 返回值被约束成合法形状
}
```

## 4. 坑点与自检

### 坑 1：组合爆炸拖垮编译器

每个联合占位都是乘法：`'a'|'b'|...`（20 个）× 4 段就是百万级展开。UI 会卡死、TS2589 会出现。联合成员多时用 `${string}` 糊住不关心的段，别追求「每个可能值都精确枚举」。

### 坑 2：`${string}` 太贪，吃掉后面的模式

```typescript
type Bad<S> = S extends `/docs/${string}${infer Rest}` ? Rest : never;
// Rest 几乎总能匹配到，因为 ${string} 可以吞掉任意内容
```

模式匹配从左到右进行，`${string}` 是「能吃多少吃多少」的模糊段。需要在同一段里既模糊又提取时，把模式收紧（`/docs/${string}/${infer Slug}`），或用两个工具类型接力。

### 坑 3：占位处放了不合法的类型

```typescript
// type Bad = `${Date}`;  // 报错：占位只能是 string/number/bigint/boolean/null/undefined
type Ok = `${number}px`;  // 合法：'1px' | '12px' | ...
```

### 坑 4：类型对但运行时错

模板类型只管形状，不管语义：`/docs/${string}/${string}` 照样接受 `/docs/ /`。真正的合法性（slug 存在、无空格）仍要运行时校验，见[运行时 Schema 校验](/typescript/660-RuntimeSchemaValidation)。

### 自检清单

- [ ] 能写一个带 `${string}` 占位的参数类型约束 URL / 事件名
- [ ] 能预测联合占位展开成几个成员
- [ ] 背出四个内置字符串工具类型及其用途
- [ ] 能读懂并手写一个单层 `infer` 模式匹配
- [ ] 知道组合爆炸与 `${string}` 贪婪这两个坑的表现

## 5. 练习

1. 写 `Px<S extends number>` 类型工具：把数字转成像素字面量类型（`Px<12>` 得到 `'12px'`），并用它约束 `margin` 参数。
2. 用模板类型 + 映射 as，把 `{ home: string; about: string }` 映射成 `{'/#home': string; '/#about': string}`（锚点链接表）。
3. 写 `StripPrefix<S, P>`：去掉字符串开头的指定前缀，不匹配则原样返回（提示：`` S extends `${P}${infer Rest}` ``）。

## 6. 下一步

- [映射类型与键重映射](/typescript/480-MappedTypeKeyRemap)：as 子句与模板类型的最常见组合
- [infer 专题](/typescript/440-ConditionalTypeInfer)：模式匹配里 infer 的完整规则
- [类型安全的路由](/typescript/620-TypeSafeRoute)：多段路径参数的完整推导
- [类型体操深水区](/typescript/540-TypeGymnastics)：递归类型的深度边界
