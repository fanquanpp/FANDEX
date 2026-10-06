---
order: 790
title: 常见编译错误诊断速查
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 按错误码组织的 TypeScript 高频编译错误速查：TS2304/TS2307/TS2339/TS2345/TS2531/TS2551/TS2769/TS18048/TS2589 的触发场景、报错原文、三层排查法与修法。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：编译错误诊断——把 tsc 的错误码从"天书"变成"索引"。
- **解决什么问题**：报错信息给出的是证据（谁不匹配谁），不是诊断（为什么、怎么改）。本篇按错误码整理九个高频错误的触发场景、原文样貌与排查路径。
- **什么时候用到**：编辑器飘红、CI 编译失败、升级依赖后错误暴增的当下。读完 [720 FAQ 第 11 问](/typescript/720-TypeScriptFAQ)「报错信息看不懂怎么办」后来这里是自然动线。
- **通用排查法**（下面每条都套用，不再重复）：第一层**读证据**——报错把实际类型和期望类型都打印了，先找到这两个类型；第二层**定位源头**——从报错行向上追，错误常在**调用点**暴露、在**定义点**造成；第三层**查环境**——tsconfig、依赖版本、@types 是否安装（链接到各专篇）。

## 0. 一句话理解

> TS 错误码是症状编号：TS2304 找不到名字、TS2339 属性不存在、TS2345 参数不匹配——看到码先到本篇对号，再按"证据、源头、环境"三层走一遍，八成错误十分钟内能定位。

## 1. TS2304：找不到名称 "xxx"

**触发场景**：名字没定义、拼错、忘了 import、用了库的全局但没装 @types。

**报错原文**：

```text
error TS2304: Cannot find name 'fetchList'.
```

**三层排查**：

1. 证据：报错只说名字不存在，先确认是**值**还是**类型**（`fetchList` 是函数，`Config` 是类型，两者 import 语法不同）；
2. 源头：同文件搜索定义 → 检查 import 语句 → 检查是否写了 `import type` 但把类型当值用（见 [import type 专篇](/typescript/320-ImportTypeVerbatimModuleSyntax)）；
3. 环境：名字来自第三方库却报错，十有八九是没装类型包——`process` 报 TS2304 就是没装 `@types/node`（环境类型全景见 [DOM lib 与 Web API 类型](/typescript/345-DomLibAndWebApiTypes)）。

**修法示例**：

```typescript
// 报错：Cannot find name 'process'
// 修法：pnpm add -D @types/node（Node 全局类型来自 DefinitelyTyped）
```

## 2. TS2307：找不到模块 "xxx" 或其相应的类型声明

**触发场景**：路径错（大小写、扩展名）、包没有类型声明、monorepo 里子包没被项目引用。

**报错原文**：

```text
error TS2307: Cannot find module './utils' or its corresponding type declarations.
```

**三层排查**：

1. 证据：注意报错里的路径是**解析前**的写法，先确认文件真实存在且大小写一致（Windows 大小写不敏感、Linux 敏感，跨平台项目大小写错误只在 CI 爆）；
2. 源头：相对路径检查 `./` 与 `../`；包名检查该包的 `package.json` 是否带 `types`/`exports` 字段（子路径导出语义见 [package.json exports 与 ESM 互操作](/typescript/315-PackageExportsEsmInterop)）；
3. 环境：纯 JS 包无类型时，社区没有 @types 版就自己写一个最小声明文件（写法见 [声明文件编写](/typescript/300-DeclarationFileWriting)）。

## 3. TS2339：属性 "x" 在类型 "y" 上不存在

**触发场景**：访问了形状里没有的字段；联合类型上访问非公共属性； narrowing 没生效。

**报错原文**：

```text
error TS2339: Property 'radius' does not exist on type '{ kind: "square"; size: number }'.
```

**三层排查**：

1. 证据：报错把"属性"和"当时的类型"都给了——本例中形状是 square 分支，radius 只在 circle 分支上；
2. 源头：联合类型上**只能访问公共属性**，先按判别字段收窄（机制见 110 篇第 4 节）；
3. 环境：属性明明存在却报错，检查类型是不是被更宽的注解"污染"成了 any/索引签名。

```typescript
// 修法：按判别字段收窄后再访问分支特有属性
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2; // 收窄后 radius 合法
    case 'square': return s.size ** 2;
  }
}
```

## 4. TS2345：实参不能赋给形参

**触发场景**：参数类型不匹配、少传/多传、对象字面量触发多余属性检查、数组变元组。

**报错原文**：

```text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

**三层排查**：

1. 证据：读两边的类型，特别注意报错里嵌套到第几层——`Type 'string' is not assignable to type 'Record<string, string | number[]>'` 这类长消息要从**第一个差异**读起；
2. 源头：参数错配的根因常在更上游（上游函数返回宽了、推断窄了）；
3. 环境：第三方调用报错，对比你装的包版本与类型定义版本（API 变了类型会先变）。

**易错点**：对象字面量直接传参时会触发**多余属性检查**，先赋给变量再传就不报——这不是不稳定，而是字面量"当场可查、变量可能是别的"的规则（原理见 720 FAQ 第 6 问）。想放宽请改类型（加可选字段或索引签名），不要用 `as` 糊过去。

## 5. TS2531：对象可能为 "null"（同族 TS18048 "可能为 undefined"）

**触发场景**：strictNullChecks 下的空值风险——DOM 查询、Map.get、数组.pop、可选链断链。

**报错原文**：

```text
error TS2531: Object is possibly 'null'.
error TS18048: 'file' is possibly 'undefined'.
```

**三层排查**：

1. 证据：问自己"这个值什么时候会是 null"——运行时真的可能，还是逻辑上已排除但编译器不知道；
2. 源头：真的可能 → 用守卫/可选链处理；逻辑上不可能 → 用类型建模表达（重定义函数返回 `T` 而不是 `T | null`）；
3. 环境：升级 TS 版本后新报的 TS18048，多半是标准库类型收紧了（如 `Array.prototype.at` 返回 `T | undefined`），按新契约处理而不是断言回去。

```typescript
const el = document.querySelector('#app');
// el: Element | null —— 真的可能为 null，正确修法是分支或提前返回
if (!el) throw new Error('missing #app');
el.addEventListener('click', onClick); // 收窄后合法
```

修法光谱从安全到危险：守卫 > 可选链 `?.` > 空值合并 `??` > 非空断言 `!`（断言的风险账本见 080 篇 6.5 节）。

## 6. TS2551：属性不存在，但你是不是想说 "yyy"（拼写建议）

**触发场景**：拼错属性/方法名，且编译器在作用域里找到了近似的名字。

**报错原文**：

```text
error TS2551: Property 'toUppercase' does not exist... Did you mean to access the
instance method 'toUpperCase'?
```

**三层排查**：这条报错自带答案——**照着 "Did you mean" 改即可**。它和 TS2339 的区别只在编译器有没有找到近似候选；没有建议时回第 3 节的三层排查。真正值得记住的是它的教训：静态检查抓住拼写错误的成本接近零，而这恰是动态语言里最常见的运行时事故类型之一。

## 7. TS2769：没有与此调用匹配的重载

**触发场景**：调用重载函数（DOM API、库函数）时实参形状哪个重载都不满足；泛型调用约束不满足。

**报错原文**：

```text
error TS2769: No overload matches this call.
  Overload 1 of 2, '(type: "click", listener: EventListenerOrEventListenerObject): void', gave the following error.
    Argument of type '"clikc"' is not assignable to parameter of type '"click"'.
```

**三层排查**：

1. 证据：报错会**逐个重载**列出失败原因，从 Overload 1 开始读，找第一个"我的实参与它的形参"差异；
2. 源头：重载函数的可用形状要看声明（编辑器悬浮可见），实参往声明的形状上靠，而不是反过来；
3. 环境：库升级后突然 TS2769，是重载集合变了——去 changelog 找对应 API 的新签名。

**修法示例**：`addEventListener('clikc', ...)` 拼错事件名被字面量联合当场抓住——这是字面量类型作为"受限字符串"的价值（与第 4 节的多余属性检查同源）。

## 8. TS18048：'xxx' 可能为 'undefined'（异步与可选上下文）

与 TS2531 归同族，但有两个**高频独立场景**值得单列：

```typescript
// 场景一：数组索引访问
const first = list[0];        // list: NoteMeta[]
first.title;                  // TS18048（noUncheckedIndexedAccess 开启时）
// 修法：判断或使用 at()/解构默认值
const first2 = list.at(0);    // NoteMeta | undefined（标准库显式建模）

// 场景二：闭包里的收窄失效
function render(state: { file?: File }) {
  if (!state.file) return;
  const onSave = () => upload(state.file); // TS18048：回调里收窄被重置
}
// 修法：先把值存进 const，闭包捕获的是已收窄的量
const file = state.file;
const onSave2 = () => upload(file);       // OK
```

场景二正是 TS 5.4「闭包保留收窄」要改善的问题（行为细节见 [5.x 新特性演进](/typescript/670-TypeScript5xNewFeatures) 第 4 节），但**复制到 const** 在任何版本都成立，是兼容性最好的写法。

## 9. TS2589：类型实例化过深，可能是无限的

**触发场景**：递归类型没有出口、深层嵌套数据（超过约 50 层实例化深度）、巨型联合进入递归映射。

**报错原文**：

```text
error TS2589: Type instantiation is excessively deep and possibly infinite.
```

**三层排查**：

1. 证据：找到报错指向的**那个递归工具类型**（DeepReadonly、DeepPartial、JSON 化类型是常客）；
2. 源头：给递归加出口——联合类型先分派再递归（`T extends Function ? T : ...`、数组与对象分支分开处理），写法范本见 [递归类型深入](/typescript/510-RecursiveTypeDeepOperation) 的尾递归与深度控制节；
3. 环境：数据本身超深（比如深层嵌套 JSON）时，把类型"截断"——超过 N 层直接落 `unknown`/`Json` 兜底，别追求无限深。

**修法示例**：

```typescript
// 递归没有出口：DeepReadonly 遇到函数/Date 会无限展开
// 修法：非普通对象一律原样返回（出口），只对 plain object 递归
type DeepReadonly<T> = T extends Function | Date | RegExp
  ? T
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
```

## 10. 诊断之外：两条工具

- **编辑器悬浮**：把光标放在报错的标识符上，悬浮卡片展示的就是"实际类型"的完整展开——比报错文本更直观，是第一层"读证据"的主力工具；
- **`tsc --noEmit` + CI**：编辑器看不见的配置差异（旧版 TS、不同 lib）会在 CI 暴露，本地复现 CI 报错用同一命令而非依赖 IDE 状态。

## 11. 动手实践

任务（每个都在自己的空项目或 playground 里触发一次，看到原文才算完成）：

1. 制造一条 TS2304：用 `process.env` 但不装 `@types/node`；修复后复跑确认消失。
2. 制造一条 TS2339：写一个圆/方判别联合，在未收窄的分支上访问 `radius`；用收窄修掉。
3. 制造一条 TS2589：写一个"永远展开自己"的递归类型；加出口修掉。
4. 制造一条 TS18048 闭包失效案例，用"先存 const"修掉。

提示：制造错误比修复错误更锻炼诊断——你亲手构造的触发条件就是这条错误码的"病例"。

<details>
<summary>参考实现（先自己触发再对照）</summary>

```typescript
// 任务 2
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number };

function area(s: Shape): number {
  // return s.radius;        // <-- 取消注释：error TS2339
  return s.kind === 'circle' ? Math.PI * s.radius ** 2 : s.size ** 2;
}

// 任务 3
type Bad<T> = Bad<T>[];                  // 循环引用自身
// type X = Bad<string>;                 // <-- 取消注释：error TS2589

type Good<T> = T extends object ? { [K in keyof T]: Good<T[K]> } : T; // 有出口
type Y = Good<{ a: string; b: { c: number } }>;

// 任务 4
function upload(file: File): void { /* ... */ }
interface EditorState { file?: File }
function bindSave(state: EditorState): () => void {
  if (!state.file) return () => {};
  // const onSave = () => upload(state.file); // <-- 取消注释：error TS18048
  const file = state.file;                    // 先存 const
  return () => upload(file);                  // 闭包捕获已收窄的量
}
```

</details>

## 12. 错误码速查总表

| 错误码 | 一句话症状 | 详见 |
| :--- | :--- | :--- |
| TS2304 | 找不到名称（import/@types） | 本篇第 1 节 |
| TS2307 | 找不到模块或其类型声明 | 本篇第 2 节 / 315 篇 |
| TS2339 | 属性在该类型上不存在（联合先收窄） | 本篇第 3 节 / 110 篇 |
| TS2345 | 实参与形参不匹配 | 本篇第 4 节 |
| TS2531 / TS18048 | 可能为 null / undefined | 本篇第 5、8 节 |
| TS2551 | 拼写建议（Did you mean） | 本篇第 6 节 |
| TS2769 | 重载无一匹配 | 本篇第 7 节 |
| TS2589 | 类型实例化过深 | 本篇第 9 节 / 510 篇 |

## 参考与致谢

- TypeScript 官方文档「Understanding Errors」与 TSConfig 参考相关章节（microsoft/TypeScript-Website，文档内容 CC BY 4.0），https://www.typescriptlang.org/docs/handbook/2/narrowing.html ——错误语义以官方文档与编译器实际输出为准；报错原文样例取自 tsc 真实输出格式。
- 各错误码的专篇链接指向本仓库 008-typescript 模块既有内容，为原创教学文档。
