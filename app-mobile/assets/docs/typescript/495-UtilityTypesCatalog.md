---
order: 530
title: 内置工具类型全景速查
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 对照官方 Utility Types 参考页的全量内置工具类型目录：每类给签名、等效手写与真实场景例子，含编辑表单草稿、列表页白名单与事件表三条主线。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：TypeScript 内置工具类型（Utility Types）——类型层面的"标准库函数"。
- **解决什么问题**：同一个业务形状在不同场景需要变体（编辑要可选、提交要必填、列表要裁剪字段、注册表要字典）。手写每个变体既重复又容易漂移；工具类型用一行代码从一个基础类型派生出全部变体。
- **什么时候用到**：定义任何"基于现有类型的变体"时。读别人的代码时，`Partial`、`Pick`、`ReturnType` 这类名字遍布签名，本篇是查阅它们的字典。
- **与 490 的分工**：[内置工具类型原理](/typescript/490-UtilityTypePrinciple)只手写五个代表讲透映射与分发原理；本篇是全景目录，按家族把官方参考页的全部工具类型过一遍。手写原理卡壳时回 490，查类型时用本篇。

## 0. 一句话理解

> 内置工具类型是 TypeScript 自带的"类型函数"：输入一个类型，输出加工后的新类型。它们全部由映射类型与条件类型两块积木搭成（原理见 490），本篇只关心每个工具"吃什么、吐什么、什么时候用"。

## 1. 全景目录（按家族分组）

下表整合自 520 杂糅篇的工具表并按官方参考页补全（本表原版有几格被示例中的竖线破坏，已修复）。"版本"列是工具类型进入语言或最近一次重大调整的版本。

| 家族 | 工具类型 | 作用 | 版本 |
| :--- | :--- | :--- | :--- |
| 属性修饰 | `Partial<T>` | 全部属性变可选 | 2.1 |
| 属性修饰 | `Required<T>` | 全部属性变必填 | 2.8 |
| 属性修饰 | `Readonly<T>` | 全部属性变只读 | 2.1 |
| 选择排除 | `Pick<T, K>` | 挑选指定键 | 2.1 |
| 选择排除 | `Omit<T, K>` | 排除指定键 | 3.5 |
| 字典构造 | `Record<K, T>` | 键集合到值类型的映射 | 2.1 |
| 联合过滤 | `Exclude<T, U>` | 从联合中排除可赋给 U 的成员 | 2.8 |
| 联合过滤 | `Extract<T, U>` | 从联合中提取可赋给 U 的成员 | 2.8 |
| 联合过滤 | `NonNullable<T>` | 排除 null 与 undefined | 2.8 |
| 函数萃取 | `Parameters<T>` | 提取函数参数为元组 | 3.1 |
| 函数萃取 | `ReturnType<T>` | 提取返回类型 | 2.8 |
| 函数萃取 | `ConstructorParameters<T>` | 提取构造函数参数 | 3.1 |
| 函数萃取 | `InstanceType<T>` | 提取构造函数的实例类型 | 2.8 |
| this 族 | `ThisParameterType<T>` | 提取 this 参数类型 | 3.3 |
| this 族 | `OmitThisParameter<T>` | 移除 this 参数 | 3.3 |
| this 族 | `ThisType<T>` | 上下文 this 标注（非类型变换） | 2.3 |
| 异步推断 | `Awaited<T>` | 递归解开 Promise 取最终值 | 4.5 |
| 异步推断 | `NoInfer<T>` | 阻止该位置参与泛型推断 | 5.4 |
| 字符串变换 | `Uppercase/Lowercase` | 字面量变大/小写 | 4.1 |
| 字符串变换 | `Capitalize/Uncapitalize` | 首字母大/小写 | 4.1 |

先记三件事，再看各家族：其一，工具类型只存在于编译期，不产生任何运行时代码；其二，前六个是"同态映射"，会保留原类型的修饰符细节（原理见 [490](/typescript/490-UtilityTypePrinciple) 第 3 节）；其三，泛型参数带默认值的写法（如 `Omit<T, K extends keyof any>`）决定"省略第二个参数会不会报错"。

## 2. 属性修饰族：Partial / Required / Readonly

本节前两组速查卡整体承接自 [接口与类型别名](/typescript/100-InterfaceTypeAlias) 尾部（原文件已按单主题拆分归并到这里）。

**基本写法：使用 Partial 工具类型**
`type <别名> = Partial<<接口>>`

```typescript
// 使用 Partial 使所有属性可选
type PartialUser = Partial<User>
```

**讲解：**

1. `Partial<User>` 把每个属性都变成可选，适合"编辑表单只传改动的字段"。
2. 与 Required 互为逆操作。
3. 注意：Partial 后的类型丢失了"必填"信息，更新场景要小心空值。

**基本写法：使用 Required 工具类型**
`type <别名> = Required<<接口>>`

```typescript
// 使用 Required 使所有属性必填
type RequiredUser = Required<User>
```

**讲解：**

1. `Required<User>` 把可选属性全部变成必填。
2. 适合"从草稿到提交"的校验场景：草稿可缺字段，提交必须完整。
3. 与 Partial 配合使用能精确控制不同阶段的状态类型。

**基本写法：使用 readonly 修饰符**
`interface <接口名> { readonly <属性>: <类型> }`

```typescript
// 使用 readonly 修饰符
interface Point {
    readonly x: number
    readonly y: number
}
```

**讲解：**

1. `readonly x: number` 的字段初始化后不可改。
2. 适合坐标、配置等不可变数据。
3. 再次提醒：这仅是编译期约束。

**基本写法：使用 Readonly 工具类型**
`type <别名> = Readonly<<接口>>`

```typescript
// 使用 Readonly 工具类型
type ReadonlyUser = Readonly<User>
```

**讲解：**

1. `Readonly<User>` 把 User 的所有属性一次性变成只读，无需逐个写 readonly。
2. 工具类型是类型层面的函数：输入一个类型，输出一个新类型。
3. 常见工具还有 Partial、Required、Pick、Omit、Record，见后几节。

### 2.1 三个场景把这一族用活

**场景一（真实工程）：编辑表单只提交改动字段。** FANDEX 这类内容站点里，"编辑笔记元数据"的接口不该要求客户端把没改的字段也传一遍：

```typescript
interface NoteMeta {
  title: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string; // 服务端维护，客户端只读
}

// PATCH /api/notes/:id 的请求体：只传改动的字段
type NotePatch = Partial<NoteMeta>;

async function patchNote(id: string, patch: NotePatch): Promise<void> {
  await fetch(`/api/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

patchNote('n1', { pinned: true });        // OK：只置顶
// patchNote('n1', { titel: 'x' });       // 报错：拼错字段名立刻被抓
```

换成手写 `{ title?: string; tags?: string[]; ... }`，字段一多必然有人漏更新，两份定义漂移后编辑表单会悄悄丢字段。

**场景二：草稿到提交的两态。** 草稿允许半成品，提交必须完整，两个类型表达两种约束：

```typescript
type NoteDraft = Partial<NoteMeta>;                       // 半成品
type NoteSubmission = Required<Omit<NoteMeta, 'updatedAt'>>; // 提交时除服务端字段外全必填

function saveDraft(draft: NoteDraft) { /* 存 localStorage，见 javascript/460-StorageForTheWeb */ }
function submitNote(sub: NoteSubmission) { /* 每个字段都能直接用 */ }
```

注意写的是 `Required<Omit<...>>` 而不是 `Required<NoteMeta>`：`updatedAt` 由服务端生成，`Required` 会把它也变成必填，逼客户端伪造时间戳——工具类型的组合顺序就是业务约束的表达。

**场景三：冻结渲染数据防误改。** 列表组件拿到的数据不允许被组件内部改动，用 `Readonly` 在类型层立规矩：

```typescript
function renderNoteList(notes: ReadonlyArray<Readonly<NoteMeta>>): void {
  // notes[0].pinned = true; // 报错：只读属性
  for (const n of notes) console.log(n.title);
}
```

易错点：`Readonly<T>` 只冻结第一层。嵌套对象（如 `note.author.name`）不受保护，需要深只读见 [递归类型深入](/typescript/510-RecursiveTypeDeepOperation) 的 `DeepReadonly`。

## 3. 选择与排除族：Pick / Omit

两组速查卡同样承接自 100 篇尾部。

**基本写法：使用 Pick 工具类型**
`type <别名> = Pick<<接口>, "<属性1>" | "<属性2>">`

```typescript
// 使用 Pick 选取部分属性
type UserBasic = Pick<User, "name" | "age">
```

**讲解：**

1. `Pick<User, "name" | "age">` 从 User 中挑选指定字段组成新类型。
2. 第二个参数是键的联合，可以理解为"白名单"。
3. 适合列表页只展示部分字段的场景。

**基本写法：使用 Omit 工具类型**
`type <别名> = Omit<<接口>, "<属性>">`

```typescript
// 使用 Omit 排除部分属性
type UserWithoutAge = Omit<User, "age">
```

**讲解：**

1. `Omit<User, "age">` 从 User 中剔除指定字段，其余保留。
2. 与 Pick 相反：Pick 留谁，Omit 删谁。
3. 适合"创建时不传 id"这类场景：用 Omit 去掉服务端生成的字段。

### 3.1 三个场景把这一族用活

**场景一（真实工程）：列表页字段白名单。** 内容站的列表接口通常比详情页瘦得多，列表项类型从详情类型裁出来而不是另写一份：

```typescript
interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;      // 全文，可能几十 KB
  likes: number;
  publishedAt: string;
}

// 列表接口返回：不要全文
type ArticleListItem = Omit<Article, 'content'>;
// 卡片组件只吃三样，组件签名越窄，可复用性越强
function ArticleCard(props: Pick<ArticleListItem, 'title' | 'summary' | 'likes'>) { /* ... */ }
```

组件参数用 `Pick` 而不是整个 `ArticleListItem`，意味着该组件也能吃评论列表项等别的形状——**收窄参数类型是复用的前提**。

**场景二：创建时不传服务端生成的字段。**

```typescript
interface Article {
  id: string;            // 服务端生成
  publishedAt: string;   // 服务端生成
  title: string;
  content: string;
}

type NewArticle = Omit<Article, 'id' | 'publishedAt'>;

async function createArticle(input: NewArticle): Promise<Article> {
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}
```

选 `Omit` 还是 `Pick` 的经验法则：**留下来的少用 Pick，删掉的少用 Omit**。字段 20 个删 2 个用 Omit；字段 5 个留 2 个用 Pick。写错方向不会报错，但接口字段增删时维护成本完全不同。

**场景三：Omit 加交叉表达"覆盖"。** 主题令牌系统里经常要"继承一套默认值、覆盖几个键"：

```typescript
interface ThemeTokens {
  primary: string;
  background: string;
  radius: string;
}

type OverrideTheme = Omit<ThemeTokens, 'radius'> & { radius: '4px' };
// { primary: string; background: string; radius: '4px' }
```

直接 `ThemeTokens & { radius: '4px'}` 会让 `radius` 的类型变成 `string & '4px'`（收缩成 `'4px'`，勉强能用但语义绕）；先 Omit 再交叉才是"覆盖"的规范写法。完整展开见 [交叉类型深入](/typescript/120-IntersectionTypeMerge)。

## 4. 字典构造族：Record

速查卡承接自 100 篇尾部。

**基本写法：使用 Record 工具类型**
`type <别名> = Record<<键类型>, <值类型>>`

```typescript
// 使用 Record 创建键值对类型
type UserMap = Record<string, User>
```

**讲解：**

1. `Record<string, User>` 表示"字符串键映射到 User 值"的字典。
2. 等价于手写索引签名，但可读性更好、还能限制键的联合。
3. `Record<'a' | 'b', number>` 可以精确限定键集合。

### 4.1 三个场景把这一族用活

**场景一（真实工程）：事件表。** 可辨识联合的事件系统（FANDEX 的主题切换、收藏、滚动埋点）常配一张"事件名到载荷"的映射表：

```typescript
type AppEvents = {
  'theme:change': { from: string; to: string };
  'note:pin': { noteId: string };
  'page:view': { path: string };
};

type EventPayload<K extends keyof AppEvents> = AppEvents[K];

function track<K extends keyof AppEvents>(name: K, payload: EventPayload<K>): void {
  navigator.sendBeacon('/track', JSON.stringify({ name, payload }));
}

track('note:pin', { noteId: 'n1' });        // OK
track('theme:change', { from: 'light', to: 'dark' }); // OK
// track('note:pin', { path: '/' });        // 报错：载荷形状不对
// track('notre:pin', {});                  // 报错：事件名拼错
```

`Record<'theme:change' | 'note:pin' | 'page:view', Payload>` 与上面的对象字面量等价，后者在事件多时更好读。键集合一旦写死，`keyof AppEvents` 就是**事件的穷尽清单**，新增事件类型时所有 `switch` 都会被编译器点名补分支。

**场景二：配置表。** 路由与菜单这类"键即语义"的配置用字面量键的 Record，拼错路径直接报错：

```typescript
type RouteName = 'home' | 'docs' | 'search';

const ROUTES: Record<RouteName, { path: string; title: string }> = {
  home: { path: '/', title: '首页' },
  docs: { path: '/docs', title: '文档' },
  search: { path: '/search', title: '搜索' },
  // 少写一个键、多写一个键、拼错键，都会在这里报错
};
```

对比索引签名 `{ [k: string]: ... }`：索引签名对键"不设防"，任何字符串都能塞进去；`Record<RouteName, ...>` 是闭合字典。开放键模型见 [索引签名与动态属性](/typescript/140-IndexSignatureDynamicProperty)。

**场景三：分组索引。** 把数组按条件转成字典是列表页高频操作，值的容器形状由 Record 描述：

```typescript
type NotesByTag = Record<string, Article[]>;

function groupByTag(articles: Article[]): NotesByTag {
  const out: NotesByTag = {};
  for (const a of articles) {
    for (const tag of tagsOf(a)) {
      (out[tag] ??= []).push(a);
    }
  }
  return out;
}

declare function tagsOf(a: Article): string[];
```

易错点：`Record<string, Article[]>` 声明的是"每个 string 键都有值"，但运行时 `out[tag]` 可能还是 `undefined`——开着 `noUncheckedIndexedAccess` 时索引访问会自动带上 `| undefined`，见 [工程化配置](/typescript/350-TypeScriptEngineeringConfig) 对该开关的讨论。

## 5. 联合过滤族：Exclude / Extract / NonNullable

```typescript
type Status = 'idle' | 'loading' | 'success' | 'error';

// Exclude：从联合里"减去"可赋给 U 的成员
type LoadingStates = Exclude<Status, 'success' | 'error'>; // 'idle' | 'loading'

// Extract：只"留下"可赋给 U 的成员
type DoneStates = Extract<Status, 'success' | 'error'>;    // 'success' | 'error'

// NonNullable：减去 null 与 undefined（常用于收窄查询结果）
type MaybeTitle = string | null | undefined;
type Title = NonNullable<MaybeTitle>; // string
```

等效手写与原理：`Exclude<T, U> = T extends U ? never : T`、`Extract<T, U> = T extends U ? T : never`，靠的就是分发的"每个成员各判一次"（[430](/typescript/430-ConditionalTypeDistribute) 第 4 节）与 never 的空联合语义（[190](/typescript/190-NeverTypeSemantics)）。

三个场景：

```typescript
// 场景一：状态机里挑"可取消"的状态做守卫
type Cancelable = Extract<Status, 'loading'>;
function cancel(when: Cancelable) { /* 只在加载中可取消 */ }

// 场景二：从 DOM 查询的宽类型里去掉空值
const el = document.querySelector('#app');        // Element | null
type SureEl = NonNullable<typeof el>;             // Element

// 场景三：事件名白名单。埋点只接受业务事件，排除系统保留事件
type AllEvents = 'sys:boot' | 'sys:error' | 'note:pin' | 'page:view';
type Trackable = Exclude<AllEvents, `sys:${string}`>; // 'note:pin' | 'page:view'
```

易错点：`Exclude` 对**非联合类型**没有意义——`Exclude<string, number>` 还是 `string`，因为分发只发生在联合上。想判断"是不是某个类型"请用条件类型而不是 Exclude。

## 6. 函数萃取族：Parameters / ReturnType / ConstructorParameters / InstanceType

```typescript
function createNote(title: string, tags: string[] = []): { id: string; title: string } {
  return { id: crypto.randomUUID(), title };
}

type CreateNoteArgs = Parameters<typeof createNote>;
// [title: string, tags?: string[]]   —— 参数元组，带可选标记
type CreateNoteReturn = ReturnType<typeof createNote>;
// { id: string; title: string }
```

逐段看：`typeof createNote` 取**函数值的类型**（注意是值查询，不是类型查询）；`Parameters` 的定义 `T extends (...args: infer P) => any ? P : never` 用 infer 抓住参数列表；抓出来的是**元组**，所以第 0 个参数是 `Parameters<typeof createNote>[0]`。

四个场景：

```typescript
// 场景一：包装函数不想重新声明一遍参数（转发参数签名）
function withTiming<F extends (...args: any[]) => any>(fn: F): F {
  return ((...args: Parameters<F>) => {
    console.time(fn.name);
    const out = fn(...args);
    console.timeEnd(fn.name);
    return out;
  }) as F;
}

// 场景二：类的构造参数与实例类型
interface NoteCtor { new (title: string, tags?: string[]): Note }
type CtorArgs = ConstructorParameters<NoteCtor>; // [title: string, tags?: string[]]
type NoteInstance = InstanceType<NoteCtor>;      // Note

// 场景三：从第三方库函数反推数据形状，不用翻文档
declare function parseFrontmatter(raw: string): { title: string; tags: string[] };
type Frontmatter = ReturnType<typeof parseFrontmatter>;

// 场景四：适配层只挑自己关心的参数
type ListArgs = Parameters<typeof fetchList>;
// fetchList(page: number, size: number, signal?: AbortSignal)
type PagedArgs = Pick<ListArgs, '0' | '1'>; // 元组也是对象，键是下标
```

易错点：`Parameters` 里的 `T extends (...args: any[]) => any` 约束不可省成 `function`——类型别名没有 `function` 关键字，函数类型只能这么写；重载函数的 `Parameters` 只取**最后一个**重载的参数，这是官方参考页明确登记的行为。

## 7. this 族：ThisParameterType / OmitThisParameter / ThisType

```typescript
function assertThis(this: { ready: boolean }, msg: string): void {
  if (!this.ready) throw new Error(msg);
}

type ThisOf = ThisParameterType<typeof assertThis>; // { ready: boolean }

// 去掉 this 参数后，函数可以被"裸调"（比如存进事件总线）
type PlainFn = OmitThisParameter<typeof assertThis>; // (msg: string) => void
```

`ThisType<T>` 最特别：它**不是**变换输入类型的工具，而是给对象字面量里的 `this` 统一标注类型，典型用户是 Vuex/Pinia 这类"选项式 API"库的 `defineStore({ state, actions })`——`actions` 里的 `this` 指向整个 store，靠的就是外层泛型参数上的 `& ThisType<Store>`。自定义 `this` 参数的完整语义见 [this 类型与多态](/typescript/240-ThisTypePolymorphism)。

## 8. 异步与推断控制族：Awaited / NoInfer

```typescript
// Awaited：递归解开 Promise，拿到 await 到底之后的类型
async function loadNote(): Promise<NoteMeta> { return fetch('/api/notes/1').then(r => r.json()); }
type Loaded = Awaited<ReturnType<typeof loadNote>>; // NoteMeta

// 对 Promise<Promise<T>> 也会一路解开
type Nested = Awaited<Promise<Promise<string>>>; // string
```

为什么需要它：`Promise<Promise<T>>` 与 `Promise<T>` 在运行时等价（then 会自动展平），但在类型层面是两个类型。`Awaited` 按 `await` 的真实语义递归展平，是写"接受 `T | Promise<T>` 的通用工具函数"的标准答案。

```typescript
// NoInfer：该位置只校验、不参与推断（TS 5.4）
function firstOf<V>(pool: V[], sample: NoInfer<V>): V {
  return pool[0];
}
const a = firstOf([1, 2, 3], 2);   // OK：V 由数组推断为 number
// const b = firstOf(['x'], 2);    // 报错：2 不是 string
```

没有 `NoInfer` 时第二个参数也参与推断，`firstOf(['x'], 2)` 会把 V 推成 `string | number`，错误被放过。"第一个参数定类型、其余必须匹配"的 API（事件表、默认值函数）都需要它，速查卡见 [TypeScript 5.x 新特性演进](/typescript/670-TypeScript5xNewFeatures) 第 4 节。

## 9. 字符串字面量变换族：Uppercase / Lowercase / Capitalize / Uncapitalize

```typescript
type Event = 'click' | 'focus';

// 事件名 -> 处理器名：onClick / onFocus
type HandlerName = `on${Capitalize<Event>}`; // 'onClick' | 'onFocus'

// 常量到枚举展示名
type Label = Uppercase<'ready'>; // 'READY'
```

这一族建立在 4.1 的内在字符串操作上，配合模板字面量类型（[500](/typescript/500-TemplateLiteralType)）可以从一个基础联合派生出整套命名约定——框架里 `useXxx`、`onXxxChange` 系列类型基本都是这么生成的。注意它们只对**字面量类型**生效：`Uppercase<string>` 原样返回 `string`，不会把运行时字符串变大写。

## 10. 组合实战：三条主线拼成一个类型层

把第 2~4 节的三条主线（表单草稿、字段白名单、事件表）拼进同一个模块类型，这也是日常项目里工具类型的真实密度：

```typescript
// ---- 基础形状 ----
interface NoteMeta {
  title: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string;
}

// ---- 变体派生（全部一行，零重复） ----
type NoteDraft     = Partial<Omit<NoteMeta, 'updatedAt'>>;   // 草稿：可缺字段
type NoteSubmission = Required<Omit<NoteMeta, 'updatedAt'>>; // 提交：全必填
type NoteListItem  = Pick<NoteMeta, 'title' | 'pinned'>;     // 列表：白名单
type NotePatch     = Partial<NoteMeta>;                       // 编辑：只传改动
type NoteStore     = Record<string, NoteMeta>;                // 仓库：id 到笔记

// ---- 事件表挂上去 ----
type NoteEvents = {
  'note:save': NoteSubmission;
  'note:patch': { id: string; patch: NotePatch };
};

type EventMap = Record<keyof NoteEvents, unknown>;
```

读法：从左往右是"类型管道"——先 Omit 删服务端字段，再 Partial/Required 定阶段，最后 Record 进仓库。**每一步都有名字**，出问题时报错会指到具体一步，这就是工具类型优于"每处手写形状"的工程理由。

## 11. 动手实践

任务（先自己写，写完再展开参考实现）：

1. 定义 `Compact<T>`：把 `T` 中所有属性变成必填且只读（提示：两个映射修饰符可以连用，顺序参照第 2 节速查卡）。
2. 定义 `ListRow<T>`：从 `T` 中去掉以 `_` 开头的内部字段（提示：`Omit` 的第二个参数需要先用 `keyof T` 与模板字面量模式筛出内部键；筛键语法见 470 第 4 节）。
3. 定义 `PayloadOf<E, K>`：从事件表 `E` 里取事件 `K` 的载荷，`K` 不在表里时报错而不是返回 `never`（提示：先 `Extract<keyof E, K>`，再用条件类型判空）。

用 550 篇的 `Equal/Expect` 自检（先自己推答案，再看断言）：

```typescript
// 练习 1 的自检目标（ Compact<{ a: string; b?: number }> 应是什么？）
// 练习 3 的自检目标（ PayloadOf<NoteEvents, 'note:save'> 应是 NoteSubmission ）
```

<details>
<summary>参考实现（先完成上面的任务再展开对照）</summary>

```typescript
// 练习 1：-? 移除可选，readonly 加只读
type Compact<T> = { readonly [K in keyof T]-?: T[K] };

// 练习 2：as 子句把内部键映射成 never，即删除
type ListRow<T> = {
  [K in keyof T as K extends `_${string}` ? never : K]: T[K];
};

// 练习 3：Extract 保证 K 是表内键，不在表里时返回 never 并由
// 条件分支显式报错（error 类型触发编译错误提示）
type PayloadOf<E, K extends string> =
  Extract<keyof E, K> extends never
    ? { __error: 'unknown event' }
    : E[Extract<keyof E, K>];

// ---- 类型自检（写法来自 typescript/550-TypeTestingAndAssertions） ----
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true : false;

type _c1 = Expect<Equal<Compact<{ a: string; b?: number }>, { readonly a: string; readonly b: number }>>;
type _c2 = Expect<Equal<ListRow<{ id: string; _secret: string }>, { id: string }>>;
type _c3 = Expect<Equal<PayloadOf<NoteEvents, 'note:save'>, NoteSubmission>>;

interface NoteMeta { title: string; tags: string[]; pinned: boolean; updatedAt: string }
type NoteSubmission = Required<Omit<NoteMeta, 'updatedAt'>>;
type NoteEvents = {
  'note:save': NoteSubmission;
  'note:patch': { id: string; patch: Partial<NoteMeta> };
};
```

</details>

自检要点：`Equal` 必须是 550 篇的严格版，双向 extends 的弱版会把 `{ b?: number }` 与 `{ b: number }` 误判为相等。

## 12. 去重与去向说明

本篇归并了三处旧内容并做了如下去重（原文保留在批次记录里）：

- 100 篇尾部的 readonly/Readonly、Partial/Required、Pick/Omit、Record 四组速查卡：**整段搬入**第 2~4 节；
- 520 杂糅篇的工具表：修复表格中被竖线破坏的单元格后收进第 1 节；
- 520 杂糅篇的 DeepReadonly/DeepPartial/DeepRequired 手写三件套：与 [递归类型深入](/typescript/510-RecursiveTypeDeepOperation) 完全重复，去重并入该篇；
- 520 的 `IsUnion`：与 [条件类型分发](/typescript/430-ConditionalTypeDistribute) 的练习与讲解重复，去重；
- 520 的 `Keys/Values`（`keyof T` / `T[keyof T]`）：与 [keyof/typeof 与索引访问](/typescript/210-KeyofTypeofIndexedAccessTypes) 重复，去重。

## 参考与致谢

- TypeScript 官方 Handbook「Utility Types」参考页（microsoft/TypeScript-Website，文档内容 CC BY 4.0），https://www.typescriptlang.org/docs/handbook/utility-types/ ——本篇目录结构、签名与版本信息以该页为准，正文例子为原创重写。
- typescript-eslint 官方文档（相关规则在 [TypeScript 代码质量工具链](/typescript/365-TypeScriptLintToolchain) 中引用），https://typescript-eslint.io
