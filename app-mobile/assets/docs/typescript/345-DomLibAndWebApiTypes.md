---
order: 360
title: DOM 与 Web API 类型
module: 'typescript'
category: 前端技术
difficulty: beginner
description: lib.dom.d.ts 从哪来、lib 与 target 怎么组装、DOM 泛型方法与 addEventListener 的事件映射，以及浏览器和 Node 环境下 lib 差异导致的常见报错。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Web API 的类型声明——TypeScript 内置的 `lib.dom.d.ts` 与 lib 组装机制，属于「内置声明文件」域。
- **解决什么问题**：`document` 报「找不到名称」；`querySelector` 返回 `Element | null` 不知道怎么收窄；`addEventListener("click", ...)` 的回调参数为什么自动是 `MouseEvent`；同一份代码在浏览器工程与 Node 工程间搬运时大面积类型报错。
- **什么时候用到**：配置 tsconfig 的 `lib` 数组时；写 DOM 操作代码遇到 `Element`/`HTMLElement`/`HTMLInputElement` 选择困难时；为 `window` 上挂的全局变量补类型时（与[声明文件编写](/typescript/300-DeclarationFileWriting)第 5 节、[模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)衔接）。

## 前置知识

- [声明文件编写](/typescript/300-DeclarationFileWriting)：内置声明文件与手写声明的关系
- [模块解析进阶与 ESM/CJS 互操作](/typescript/315-PackageExportsEsmInterop)：附录 B 的 tsconfig 选项速查

## 1. lib.dom.d.ts 从哪来

`lib.dom.d.ts` 是 TypeScript 安装包内 `lib/` 目录的一份声明文件，由 TypeScript 团队从 WHATWG DOM、WebIDL 等标准**手工翻译**而来。三个关键认知：

1. **它只是类型**：没有任何运行时代码。TS 说 `document` 存在，不代表运行时真的有——在 Node 里引 `document` 照样 `ReferenceError`。
2. **它与 target 无关，与 lib 有关**（见第 2 节）。
3. **它覆盖面极大**：DOM、CSSOM、Canvas、Web Audio、Fetch、WebSocket、Web Worker……几乎全部浏览器全局。所以浏览器工程几乎不用手动加 Web API 类型——问题只出在「装错了 lib」。

## 2. lib 与 target 的组装关系

`target` 决定「编译出的 JS 语法级别」，`lib` 决定「类型检查时可用的全局 API 集合」。不写 `lib` 时，TS 按 target 给一套默认组合：

| target | 默认 lib |
| --- | --- |
| ES5 | `ES5` + `DOM` + `ScriptHost` + `WebWorker.ImportScripts` |
| ES2015 (ES6) | `ES2015` + `DOM` + ... + `DOM.Iterable` |
| ES2022+ | `ES2022` + `DOM` + `DOM.Iterable` + ... |
| ESNext | `ESNext` + `DOM` + `DOM.Iterable` |

两条组装规则（易错点）：

- **改 target 会连带换掉整套 lib**。把 `target` 从 `ES2015` 改到 `ES2020`，`Array.at`、`Promise.allSettled` 的类型就从「不可用」变「可用」——但你没改过 `lib`。
- **手写 `lib` 后 target 的默认组合被完全替换**。常见事故：只写 `"lib": ["ES2020"]`，DOM 全部消失，`document` 立即报红。正确姿势是「自选 lib 必须自己补齐 DOM」：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

### 2.1 DOM.Iterable 是什么

`DOM.Iterable` 给 NodeList、HTMLCollection、DOMTokenList 等 DOM 集合补上 `[Symbol.iterator]` 声明：

```typescript
// 不带 DOM.Iterable：编译错误
// for (const img of document.querySelectorAll("img")) {}

// 带 DOM.Iterable：img 推断为 HTMLImageElement
for (const img of document.querySelectorAll("img")) {
  console.log(img.src);
}
```

与迭代协议类型的完整讲解见[迭代器与生成器类型](/typescript/255-IterationProtocolTypes)。

## 3. DOM 泛型方法：从 Element 到具体元素类型

### 3.1 querySelector 的类型签名

```typescript
// lib.dom.d.ts 的签名（简化）
querySelector<E extends Element = Element>(selectors: string): E | null;
```

两个类型层信息：泛型 `E` 默认 `Element`；返回值带 `| null`（选择器没匹配到）。收窄有三种写法：

```typescript
// 写法一：泛型参数显式指定（最常用）
const input = document.querySelector<HTMLInputElement>("#search");
input!.value;   // input: HTMLInputElement | null，断言非空

// 写法二：选择器字符串做字面量收窄（TS 4.9+ 支持常见 id/class 模式）
const input2 = document.querySelector("#search");
if (input2 instanceof HTMLInputElement) {
  input2.value;   // instanceof 收窄
}

// 写法三：getElementById 没有「选择器推断」，只能泛型外收窄
const el = document.getElementById("app");  // HTMLElement | null
if (el) {
  el.dataset.page = "docs";  // HTMLElement 有 dataset，Element 没有
}
```

易错点：

- **`querySelector` 的类型不一定对**：写 `querySelector<HTMLInputElement>("#x")` 时 TS 不会核对 `#x` 到底是不是 input——泛型参数是「信任调用方」的断言。选错元素类型，访问不存在的属性只会在运行时炸。
- **instanceof 收窄的可靠性更高**：它是运行时检查 + 类型收窄合一。泛型断言是纯编译期。
- `Element` vs `HTMLElement` vs `HTMLInputElement` 的层级：`Element` 是所有元素的基类（有 `classList`，没有 `value`）；`HTMLElement` 加了 HTML 通用属性（`dataset`、`style`）；`HTMLInputElement` 才有 `value`、`checked`。**访问 `value` 前必须收到 `HTMLInputElement`**，这是 DOM TS 代码第一大高频报错。

### 3.2 canvas 上下文收窄

```typescript
const canvas = document.querySelector<HTMLCanvasElement>("#board");
if (!canvas) throw new Error("canvas 不存在");

const ctx = canvas.getContext("2d");
// getContext 的返回类型是 CanvasRenderingContext2D | null
if (!ctx) throw new Error("2d context 不可用");

ctx.fillRect(0, 0, 100, 100);   // 收窄后才有方法补全

// 泛型版本：传 "2d" 之外还可能是 "webgl" 等
const gl = canvas.getContext("webgl");  // WebGLRenderingContext | null
```

`getContext("2d")` 返回 `CanvasRenderingContext2D | null` 而非 `CanvasRenderingContext2D`：canvas 被浏览器回收或上下文数量超限时返回 null。直接 `ctx!` 断言虽然编译过，但 canvas 上限场景（同页几十个 canvas）是真实会发生的 null——先判断再画，报错信息里带上 canvas id 方便排查。

## 4. addEventListener：事件名到事件类型的映射

`lib.dom.d.ts` 为 `addEventListener` 提供了**按事件名重载**的签名，回调参数自动收到具体事件类型：

```typescript
const btn = document.querySelector<HTMLButtonElement>("#submit");

// "click" → MouseEvent，自动推导，无需手写
btn?.addEventListener("click", (e) => {
  e.clientX;        // MouseEvent 的属性可用
});

// 自定义事件名 → 落到 (type: string, listener: EventListenerOrEventListenerObject)
document.addEventListener("app:ready", (e) => {
  // 这里 e 只是 Event，没有 detail——需要 CustomEvent 断言
  const detail = (e as CustomEvent<InitPayload>).detail;
});

// 更优：走 CustomEvent 的构造函数类型收窄
document.addEventListener("app:ready", (e) => {
  if (e instanceof CustomEvent) {
    e.detail;   // any（CustomEvent 默认泛型）；CustomEvent<InitPayload> 才有精确类型
  }
});
```

事件名与事件类型对照（常用子集）：

| 事件名 | 回调参数类型 |
| --- | --- |
| click / dblclick / mousemove | MouseEvent |
| keydown / keyup | KeyboardEvent |
| input / change | Event（input 元素需自行收窄） |
| submit | SubmitEvent（较新 lib 版本） |
| scroll / resize | Event |
| 自定义字符串 | Event |

事件回调类型被吞的易错点见[异步类型模式](/typescript/555-AsyncTypePatterns)第 6 节（async 回调返回的 Promise 没人接）。给事件系统做全量类型化（自带事件名到载荷映射）的完整方案见[类型安全事件系统](/typescript/560-TypeSafeEventSystem)。

## 5. 例子一：图片轮播与实时时钟页的类型落地（真实页面场景）

以下取自一套经典 JS 教学页——「图片轮播 + 定时器递归换图」与「window.onload + setInterval 实时时钟」（JS 基础练习 7 题合集的第 2、3 题，网页轮播自动换图/页面时钟是这类页面的标准形态）。把纯 JS 版本升级为 TS 版本，类型逐个落地：

```typescript
// 图片轮播：全局计数器 + setTimeout 递归换图
const img = document.querySelector<HTMLImageElement>("#img1");
if (!img) throw new Error("#img1 不存在");

let num = 1;
function next(): void {
  num = num >= 4 ? 1 : num + 1;   // 到 4 归 1
  img.src = `img/${num}.gif`;
  window.setTimeout(next, 500);   // 半秒后递归下一张
}
```

逐段拆解：

- `querySelector<HTMLImageElement>`：`img.src` 只在 `HTMLImageElement` 上存在；不指定泛型时 `Element` 没有 `src`，报 TS2339。
- `img.src = \`img/${num}.gif\``：`src` 的类型是 `string`（旧版 lib 曾是 `string | undefined`，赋值报错是 lib 版本差异，升级 TS 即可）。
- `window.setTimeout(next, 500)`：浏览器里 `setTimeout` 返回 `number`（`@types/node` 里是 `NodeJS.Timeout`）。**同一文件混用 DOM 与 Node 类型时返回值类型会打架**——见第 7 节。

```typescript
// 实时时钟：setInterval 回调拼时/分/秒
function tick(): void {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const clock = document.querySelector<HTMLInputElement>("#clock");
  if (clock) clock.value = `${h}:${m}:${s}`;
}

window.onload = () => {
  const timer = window.setInterval(tick, 1000);
  // 页面卸载时清理（教学页常省略，工程里必须有）
  window.addEventListener("beforeunload", () => window.clearInterval(timer));
};
```

- `window.onload = () => {...}`：`onload` 在 `WindowEventHandlers` 里声明为 `((this: Window, ev: Event) => any) | null`，箭头函数直接赋值即可；传参的 `ev` 自动是 `Event`。
- `clock.value`：教学页用 `<input>` 显示时钟所以是 `HTMLInputElement`；换 `div` 显示就是 `HTMLDivElement` + `textContent`——DOM 类型跟随真实元素走。

## 6. 例子二：浏览器与 Node 的 lib 差异三连报错

把一段浏览器代码搬进 Node 工程后常见三种报错，根因都在 lib：

```text
报错一：Cannot find name 'document'.
  → lib 没有 DOM。Node 服务工程默认不装 DOM lib。

报错二：Property 'toSorted' does not exist on type 'number[]'.
  → lib 的 ES 版本低于方法引入版本（toSorted 是 ES2023）。

报错三：'setTimeout' 返回类型不兼容。
  → @types/node 的 NodeJS.Timeout 与 DOM 的 number 撞车。
```

对策矩阵：

| 场景 | lib 配置 |
| --- | --- |
| 纯浏览器（Vite/Astro/React） | `["ES2022", "DOM", "DOM.Iterable"]` |
| 纯 Node 服务 | `["ES2022"]`（**不要**加 DOM）+ devDependencies 装 `@types/node` |
| 同构（SSR/Islands，前端代码会被 Node 渲染） | `["ES2022", "DOM", "DOM.Iterable"]` + `@types/node`，运行时守卫 `typeof document !== "undefined"` |

同构工程的正确写法：类型上允许 `document` 存在，运行时用 `typeof` 守卫拦住 Node 执行路径：

```typescript
function isBrowser(): boolean {
  return typeof document !== "undefined";
}

if (isBrowser()) {
  document.querySelector("#app");  // 只在客户端执行
}
```

## 7. 例子三：扩展 window（与全局增强的衔接）

往 `window` 挂业务全局变量（统计脚本、AB 实验开关）时的标准三步：

```typescript
// types/globals.d.ts —— 声明文件怎么写详见声明文件编写篇
export {};

declare global {
  interface Window {
    __APP_CONFIG__: {
      apiBase: string;
      version: string;
    };
  }
}
```

```typescript
// 使用处：window.__APP_CONFIG__ 有完整类型
const base = window.__APP_CONFIG__.apiBase;
```

为什么写在 `interface Window` 上就能合并：`window` 变量的类型是 `Window & typeof globalThis`，而接口合并让我们的成员并进 `Window`——合并机制的完整规则（非函数成员唯一、函数重载顺序）见[模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)。**反向陷阱**：写在 `interface globalThis` 或直接 `declare var window` 都不会正确合并，认准 `Window` 接口名。

## 8. 动手实践

### 任务

1. 打开你项目的 `tsconfig.json`，找到 `lib`（没有就先加一个），说出当前 target 对应的默认 lib 组合，然后故意删掉 `DOM`，观察第一个报错出现在哪个文件哪一行，再恢复。
2. 写一个函数 `getInputValue(id: string): string`：从 DOM 取输入框的值，未找到元素返回空串。要求处理 `HTMLInputElement`、`HTMLTextAreaElement` 两种可能。（提示：两个类型都有 `value`，但它们没有比 `HTMLElement` 更近的共同父类型声明 value——想想联合类型的收窄。）
3. 给页面上的 `<form id="login">` 写 submit 监听，回调里阻止默认行为并读取用户名输入框的值；把回调函数签名写出来（不要用 any）。

### 参考实现（先自己做，再对照）

<details>
<summary>参考实现（点开前请先独立完成）</summary>

```typescript
// 2. 联合类型 + in 收窄
function getInputValue(id: string): string {
  const el = document.querySelector(`#${CSS.escape(id)}`);
  if (!el) return "";
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  return "";
}

// 3. SubmitEvent（若 lib 较旧则退化为 Event，直接写 Event 也可）
const form = document.querySelector<HTMLFormElement>("#login");
form?.addEventListener("submit", (e: SubmitEvent) => {
  e.preventDefault();
  const user = form.querySelector<HTMLInputElement>('[name="username"]');
  console.log(user?.value ?? "");
});
```

</details>

自检标准：任务 2 的 `in`/instanceof 收窄是否漏掉 else 分支返回值；任务 3 是否用 `e.preventDefault()` 而不是 `return false`；两处 `querySelector` 是否都给了泛型。

## 9. 坑点小结

1. **`querySelector` 泛型是断言不是推断**：类型错了编译器不报，运行时炸。
2. **`| null` 不是装饰**：DOM 查询 API 全部返回 `| null`，`!` 断言省下的两秒钟会变成线上报错排查的两小时；查询语句的 id/class 来自模板字符串时尤其如此。
3. **lib 组装是整体替换**：自选 lib 数组时逐项核对「ES 标准 + DOM + DOM.Iterable」三件套。
4. **同构代码先 `typeof` 后 DOM**：SSR 环境里模块顶层执行 DOM 代码是最常见的水合崩溃。

## 10. 练习

1. 找到你项目里所有 `querySelector` 调用，检查每一个是否写了泛型参数或 instanceof 收窄，列出没写的原因（是真不需要，还是漏了）。
2. 解释：为什么 `document.getElementById("app")!.innerHTML = x` 在「元素不存在」时是静默失败（赋值给 null 抛 TypeError），而 `.append(...)` 是显式报错？如何在 code review 层面禁止前者？
3. 给 `window` 增加 `__TRACK_QUEUE__: unknown[]` 声明并在业务代码里安全消费（判空 + 收窄），再解释为什么不用 `declare const` 而用 `interface Window`。

## 11. 下一步

- [声明文件编写](/typescript/300-DeclarationFileWriting)：`.d.ts` 的写法与 lib 选项
- [模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)：`declare global` 合并的机制
- [迭代器与生成器类型](/typescript/255-IterationProtocolTypes)：`DOM.Iterable` 的类型协议背景
- [类型安全事件系统](/typescript/560-TypeSafeEventSystem)：把事件名-载荷映射类型化

## 12. 参考与致谢

- **TypeScript 官方手册：DOM Manipulation**（https://www.typescriptlang.org/docs/handbook/dom-manipulation.html，文档许可 CC-BY 4.0）：泛型查询方法与 instanceof 收窄的基准来源。
- **TypeScript 官方 tsconfig 参考：lib**（https://www.typescriptlang.org/tsconfig/#lib，文档许可 Apache-2.0）：lib 组装规则的基准来源。
- MDN「Window」与「HTMLCanvasElement」（https://developer.mozilla.org/zh-CN/docs/Web/API/Window，许可 CC-BY-SA 2.5）。
- 本文的图片轮播与实时时钟例子改编自扫描素材 `e-core-java-mysql-web.md` 3.1 节 JS 基础练习 7 题合集（第 2 题图片轮播、第 3 题实时时钟）与 3.4 节 JS 综合考试卷的真实页面需求，并升级为 TS 类型化版本；canvas 收窄、lib 差异对策为原创工程场景。
