---
order: 101
title: ArkTS与TypeScript差异
module: harmonyos
category: 'dev-lang'
difficulty: advanced
description: 'HarmonyOS ArkTS与TypeScript差异详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/国际化与无障碍
  - harmonyos/Stage模型与FA模型区别
  - harmonyos/ArkUI声明式语法
  - harmonyos/组件生命周期详解
prerequisites:
  - harmonyos/概述与环境搭建
---

# ArkTS 与 TypeScript 差异详解

## 1. 概述与背景

### 1.1 语言演进的历史脉络

要理解 ArkTS 与 TypeScript 的差异,必须先回到 JavaScript 生态演进的历史长河中。

JavaScript 自 1995 年 Brendan Eich 用 10 天时间设计完成以来,经历了从浏览器脚本到通用应用开发语言的跃迁。其动态类型特性在早期 Web 页面交互场景下足够灵活,但随着代码规模增长,类型相关的运行时错误频繁出现,重构成本高昂。2012 年微软推出 TypeScript,在 JavaScript 之上引入静态类型系统,通过渐进式类型标注(`gradual typing`)在编译期捕获潜在错误,迅速成为大型前端项目的首选语言。

HarmonyOS 的 ArkTS 并非凭空诞生,而是站在 TypeScript 的肩膀上进一步演进。华为在设计 ArkTS 时面临的核心矛盾是:**如何在保留 TypeScript 类型安全优势的同时,去除那些阻碍 AOT(Ahead-Of-Time)编译、影响运行时性能、或与声明式 UI 范式不兼容的语言特性**。这一权衡的产物就是 ArkTS——一个比 TypeScript 更严格、更静态、更易于编译优化的方言。

用一句话概括两者关系:**TypeScript 是 JavaScript 的超集,而 ArkTS 是 TypeScript 的子集加上少量扩展**。这种"子集 + 扩展"的关系意味着 TypeScript 开发者转向 ArkTS 时,主要任务是"减法"而非"加法"——需要放弃一些熟悉的动态特性,同时学习 ArkUI 相关的新装饰器与状态管理原语。

### 1.2 设计哲学的对比

理解两种语言差异的深层原因,要从设计哲学入手。

TypeScript 的设计哲学可以概括为**渐进式类型 + 完全兼容 JavaScript**。这意味着:

- 任何合法的 JavaScript 代码都是合法的 TypeScript 代码
- 类型标注是可选的,可以逐步添加
- 类型系统允许 `any` 类型作为"逃生舱",在类型不确定时仍可编译通过
- 支持大量结构性类型特性(structural typing),以兼容 JavaScript 的鸭子类型传统

ArkTS 的设计哲学则是**静态类型 + 声明式 UI 友好 + 编译期可优化**:

- 严格禁止 `any` 类型,所有变量必须有明确类型
- 类型推断更保守,倾向于要求显式标注
- 限制结构性类型,鼓励使用 `interface` 与 `class` 而非对象字面量
- 限制动态特性如 `Object.keys`、`delete`、运行时属性添加
- 引入装饰器系统支持 ArkUI 的声明式 UI

这两种哲学没有绝对优劣,而是服务于不同场景。TypeScript 服务于"渐进迁移已有 JavaScript 代码库",ArkTS 服务于"从零构建高性能原生应用"。

### 1.3 在 HarmonyOS 生态中的定位

ArkTS 是 HarmonyOS 应用开发的一等公民语言。从 API 9 开始,Stage 模型应用完全基于 ArkTS 编写;从 API 10 起,FA 模型被标记为废弃;到 API 11+,ArkTS 已成为唯一推荐的应用层语言。

在编译工具链上,ArkTS 通过 `ArkTS Compiler` 编译为 ArkVM 字节码或直接 AOT 编译为机器码,这与 TypeScript 编译为 JavaScript 再由 V8 等引擎 JIT 执行有本质区别。AOT 编译要求类型信息在编译期完全确定,这正是 ArkTS 严格类型约束的底层动机。

下表展示 ArkTS 在 HarmonyOS 技术栈中的位置:

| 层次 | 语言 | 职责 |
| --- | --- | --- |
| 应用层 | ArkTS | 业务逻辑、UI 描述 |
| 框架层 | C/C++ | ArkUI 引擎、ArkVM 运行时 |
| 系统服务层 | C/C++ | 内核、驱动、系统服务 |
| 内核层 | C/Rust | HarmonyOS 微内核 |

## 2. 学习目标

完成本章学习后,读者应能够:

1. **概念层面**——准确解释 ArkTS 与 TypeScript 在类型系统、动态特性、装饰器三个维度的核心差异,并说明每种差异背后的设计动机
2. **代码层面**——能够将一段 TypeScript 代码重构为符合 ArkTS 规范的等价代码,处理 `any`、`unknown`、结构性类型、动态属性访问等典型场景
3. **工程层面**——理解 ArkTS 的编译工具链与类型检查机制,能够在 DevEco Studio 中识别并修复 ArkTS 编译错误
4. **性能层面**——理解 ArkTS 严格类型约束对 AOT 编译优化的贡献,能够写出更利于编译器优化的代码
5. **架构层面**——理解 ArkTS 如何与 ArkUI 装饰器系统协作,为后续学习声明式 UI 与状态管理奠定语言基础

## 3. 前置知识

阅读本章前,建议读者具备以下基础:

- **TypeScript 基础**:熟悉 `interface`、`type`、`enum`、泛型、联合类型、交叉类型等基本概念,能够编写 100 行以上的 TypeScript 程序
- **面向对象基础**:理解类、继承、接口、多态等 OOP 概念
- **JavaScript 运行时**:了解原型链、闭包、`this` 绑定等机制
- **HarmonyOS 概览**:已阅读本系列"概述与环境搭建"章节,理解 Stage 模型、Ability 等基础概念

若读者对 TypeScript 完全陌生,建议先通过 TypeScript 官方 Handbook 完成基础学习,再回到本章。

## 4. 核心概念

### 4.1 类型系统差异总览

ArkTS 的类型系统在 TypeScript 基础上做了"收紧"处理。下表列出主要差异:

| 维度 | TypeScript | ArkTS | 说明 |
| --- | --- | --- | --- |
| `any` 类型 | 允许 | 禁止 | ArkTS 强制要求显式类型 |
| `unknown` 类型 | 允许 | 允许(受限) | 仍可作为类型安全逃生舱 |
| 类型推断 | 宽松,推断 `any` | 严格,必须显式标注 | 函数参数必须显式类型 |
| 结构性类型 | 完整支持 | 受限,鼓励名义类型 | 推荐使用 `class` 而非对象字面量 |
| 联合类型 | 支持 | 支持 | 字面量联合类型完整支持 |
| 交叉类型 | 支持 | 支持 | 但与 `interface` 合并行为略有差异 |
| 条件类型 | 支持 | 不支持 | ArkTS 不支持运行时类型运算 |
| 映射类型 | 支持 | 不支持 | 同上 |
| `typeof` 类型查询 | 支持 | 受限 | 仅用于基本类型与变量声明 |
| 泛型 | 完整支持 | 完整支持 | 但对泛型约束有更严格限制 |

### 4.2 `any` 类型的禁止

`any` 是 TypeScript 类型系统的"逃生舱",允许跳过类型检查。在 ArkTS 中,`any` 被彻底禁止,这是最显著的差异之一。

**TypeScript 写法(允许 `any`)**:

```typescript
function processData(data: any) {
  return data.items.map((item: any) => item.name);
}

const result = processData({ items: [{ name: 'Alice' }] });
```

**ArkTS 等价写法(必须定义类型)**:

```typescript
interface DataItem {
  name: string;
}

interface ProcessDataInput {
  items: DataItem[];
}

function processData(data: ProcessDataInput): string[] {
  return data.items.map((item: DataItem) => item.name);
}

const result: string[] = processData({ items: [{ name: 'Alice' }] });
```

可以看到,ArkTS 要求为每个参数、返回值、变量显式声明类型。这种"显式优于隐式"的哲学虽然增加了代码量,但带来了三个核心收益:

1. **编译期错误捕获**——类型不匹配在编译期而非运行时暴露
2. **IDE 智能提示完整**——所有变量类型明确,代码补全准确
3. **AOT 编译优化**——编译器能够基于完整类型信息生成更优化的机器码

### 4.3 `unknown` 类型的使用

ArkTS 允许使用 `unknown` 类型作为类型安全的"逃生舱",但使用时必须通过类型守卫(type guard)收窄类型。

```typescript
// ArkTS 允许 unknown,但使用前必须收窄
function safeParse(json: string): unknown {
  return JSON.parse(json);
}

const data: unknown = safeParse('{"name":"Alice","age":30}');

// 错误:不能直接访问 unknown 类型的属性
// console.log(data.name);

// 正确:通过类型守卫收窄
if (typeof data === 'object' && data !== null && 'name' in data) {
  const obj = data as { name: string; age: number };
  console.log(obj.name);
}
```

`unknown` 与 `any` 的核心区别在于安全性:`any` 允许任意操作而不报错,`unknown` 强制要求在使用前进行类型检查。在 ArkTS 中,当确实无法预先确定类型时(如解析外部 JSON),`unknown` 是推荐的替代方案。

### 4.4 函数类型的严格化

TypeScript 允许函数参数类型省略,会推断为 `any`。ArkTS 强制要求所有函数参数和返回值显式标注类型。

**TypeScript(允许省略)**:

```typescript
function add(a, b) {
  return a + b;
}
```

**ArkTS(必须标注)**:

```typescript
function add(a: number, b: number): number {
  return a + b;
}
```

箭头函数同样要求显式类型:

```typescript
// TypeScript
const greet = (name) => `Hello, ${name}`;

// ArkTS
const greet = (name: string): string => `Hello, ${name}`;
```

### 4.5 结构性类型的限制

TypeScript 采用**结构性类型系统**(structural typing,又称鸭子类型):只要对象结构匹配,即使没有显式声明 `implements` 关系,也被视为兼容。ArkTS 在保留结构性类型的同时,鼓励使用名义类型(nominal typing)以提高可读性与可维护性。

**TypeScript(典型结构性类型)**:

```typescript
interface Point { x: number; y: number; }

function distance(p: Point): number {
  return Math.sqrt(p.x ** 2 + p.y ** 2);
}

// 任何包含 x, y 属性的对象都兼容
const p = { x: 3, y: 4, z: 5 };  // 多余的 z 不影响
distance(p);  // 合法
```

**ArkTS 推荐写法(使用 class 实现名义类型)**:

```typescript
class Point {
  x: number = 0;
  y: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

function distance(p: Point): number {
  return Math.sqrt(p.x ** 2 + p.y ** 2);
}

const p = new Point(3, 4);
distance(p);  // 合法
```

ArkTS 仍然支持 `interface`,但对于需要实例化的对象,推荐使用 `class`。`class` 提供构造函数、方法、继承等完整能力,与 AOT 编译配合更佳。

### 4.6 对象字面量的限制

TypeScript 允许动态添加、删除对象属性。ArkTS 严格限制这些操作,以支持编译期优化。

**TypeScript(允许动态操作)**:

```typescript
const obj: any = { a: 1 };
obj.b = 2;           // 动态添加属性
delete obj.a;         // 动态删除属性
const keys = Object.keys(obj);  // 动态获取所有键
```

**ArkTS(必须预先声明所有属性)**:

```typescript
interface MyObject {
  a: number;
  b?: number;  // 可选属性
}

const obj: MyObject = { a: 1 };
obj.b = 2;  // 合法,b 已在接口中声明
// obj.c = 3;  // 编译错误:c 不在接口中
// delete obj.a;  // 编译错误:不允许 delete
```

这种限制使得编译器能够在编译期确定对象的所有可能属性,从而优化内存布局与字段访问。

### 4.7 装饰器系统

ArkTS 引入了一套完整的装饰器系统以支持 ArkUI 声明式 UI。这是 TypeScript 中没有(或仅在实验性特性中支持)的能力。

```typescript
@Component
struct MyComponent {
  @State count: number = 0;

  build() {
    Column() {
      Text(`Count: ${this.count}`)
      Button('Increment')
        .onClick(() => {
          this.count++;
        })
    }
  }
}
```

这里的 `@Component`、`@State` 是 ArkTS 内置装饰器,用于声明组件与状态。TypeScript 中的装饰器是实验性特性,语法不同,且不与任何 UI 框架深度绑定。

ArkTS 内置装饰器大致分类:

| 类别 | 装饰器 | 用途 |
| --- | --- | --- |
| 组件 | `@Component`、`@Entry` | 声明自定义组件、页面入口 |
| 状态 | `@State`、`@Prop`、`@Link`、`@Provide`、`@Consume` | 组件内状态、父子传值、跨层级共享 |
| 参数 | `@BuilderParam`、`@Builder` | UI 构建函数参数 |
| 样式 | `@Extend`、`@Styles` | 样式扩展与复用 |
| 监听 | `@Watch` | 状态变化监听 |
| 对象 | `@Observed`、`@ObjectLink` | 嵌套对象响应式 |

### 4.8 `struct` 关键字

ArkTS 引入 `struct` 关键字用于声明自定义组件,这是 TypeScript 中没有的概念。`struct` 类似于 `class`,但有以下区别:

- `struct` 不能被实例化(不能 `new`),只能作为组件被框架实例化
- `struct` 必须有 `build()` 方法描述 UI
- `struct` 通过装饰器(`@Component`、`@Entry`)标记为组件

```typescript
// struct:用于组件
@Component
struct MyComponent {
  @State count: number = 0;
  build() { /* UI 描述 */ }
}

// class:用于普通数据与逻辑
class User {
  name: string = '';
  age: number = 0;
}
```

### 4.9 模块系统的差异

ArkTS 使用 ES Module 标准(`import`/`export`),与 TypeScript 一致。但有以下细节差异:

- 不支持 CommonJS(`require`/`module.exports`)
- 不支持动态 `import()`(`import()` 返回 Promise)
- 导入 HarmonyOS 系统模块使用 `@ohos.` 前缀

```typescript
// 导入系统模块
import router from '@ohos.router';
import http from '@ohos.net.http';
import preferences from '@ohos.data.preferences';

// 导入自定义模块
import { MyComponent } from './MyComponent';

// 导出
export class MyClass { /* ... */ }
export function myFunction(): void { /* ... */ }
export const MY_CONST: number = 42;
```

## 5. 代码示例

本节通过完整代码示例展示从 TypeScript 到 ArkTS 的迁移过程。

### 5.1 示例一:用户数据管理

**TypeScript 版本(典型写法)**:

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

class UserService {
  private users: any[] = [];

  add(user: any): void {
    this.users.push(user);
  }

  find(id: number): any {
    return this.users.find(u => u.id === id);
  }

  update(id: number, patch: Partial<User>): void {
    const user = this.find(id);
    if (user) {
      Object.assign(user, patch);
    }
  }

  remove(id: number): void {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx >= 0) {
      this.users.splice(idx, 1);
    }
  }
}
```

**ArkTS 版本(严格类型)**:

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

class UserService {
  private users: User[] = [];

  add(user: User): void {
    this.users.push(user);
  }

  find(id: number): User | undefined {
    return this.users.find((u: User) => u.id === id);
  }

  update(id: number, patch: Partial<User>): void {
    const user = this.find(id);
    if (user) {
      // ArkTS 不允许 Object.assign,需手动赋值
      if (patch.name !== undefined) {
        user.name = patch.name;
      }
      if (patch.email !== undefined) {
        user.email = patch.email;
      }
    }
  }

  remove(id: number): void {
    const idx = this.users.findIndex((u: User) => u.id === id);
    if (idx >= 0) {
      this.users.splice(idx, 1);
    }
  }
}
```

主要变化点:

1. `any[]` 改为 `User[]`
2. 函数参数从 `any` 改为 `User`
3. 箭头函数添加参数类型 `(u: User)`
4. `Object.assign` 替换为手动属性赋值
5. `Partial<User>` 在 ArkTS 中仍然支持,但需注意其展开行为

### 5.2 示例二:JSON 解析与验证

TypeScript 中常见的 JSON 解析模式在 ArkTS 中需要改写:

**TypeScript 版本**:

```typescript
function parseUser(json: string): User {
  const data = JSON.parse(json);
  return {
    id: data.id,
    name: data.name,
    email: data.email
  };
}

const user = parseUser('{"id":1,"name":"Alice","email":"alice@example.com"}');
```

**ArkTS 版本(类型安全解析)**:

```typescript
function parseUser(json: string): User {
  const data: unknown = JSON.parse(json);

  // 类型守卫验证
  if (!isObjectWithData(data)) {
    throw new Error('Invalid user JSON');
  }

  const user: User = {
    id: Number(data.id),
    name: String(data.name),
    email: data.email !== undefined ? String(data.email) : undefined
  };

  return user;
}

function isObjectWithData(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && 'id' in data && 'name' in data;
}
```

这里的关键技巧是使用类型守卫函数 `isObjectWithData`,通过 `data is Record<string, unknown>` 的返回类型谓词,在 if 块内将 `unknown` 收窄为可访问的对象类型。

### 5.3 示例三:泛型与工具类型

ArkTS 支持泛型与多数工具类型,但限制比 TypeScript 严格:

```typescript
// 泛型函数:支持
function identity<T>(value: T): T {
  return value;
}

// 泛型约束:支持
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(value: T): void {
  console.log(`Length: ${value.length}`);
}

// 工具类型 Partial、Pick、Omit:支持
interface User {
  id: number;
  name: string;
  email: string;
}

type UserPreview = Pick<User, 'id' | 'name'>;
type UserUpdate = Partial<Omit<User, 'id'>>;
type UserWithoutEmail = Omit<User, 'email'>;

// 条件类型:不支持
// type IsString<T> = T extends string ? true : false;  // ArkTS 编译错误

// 映射类型:不支持
// type Readonly<T> = { readonly [P in keyof T]: T[P] };  // ArkTS 编译错误
```

### 5.4 示例四:枚举与字面量联合

ArkTS 支持 `enum` 与字面量联合类型,二者可以互换使用:

```typescript
// enum:支持
enum Color {
  Red = 'RED',
  Green = 'GREEN',
  Blue = 'BLUE'
}

const c: Color = Color.Red;

// 字面量联合:支持
type ColorUnion = 'RED' | 'GREEN' | 'BLUE';

const c2: ColorUnion = 'RED';

// 推荐使用字面量联合,因为:
// 1. 无需 enum 命名空间,代码更简洁
// 2. 与 JSON 序列化兼容(enum 默认是 number,字符串 enum 是特殊语法)
// 3. AOT 编译时可消除,无运行时开销
```

### 5.5 示例五:类与继承

ArkTS 的 `class` 与 TypeScript 基本一致,支持继承、抽象类、接口实现:

```typescript
abstract class Animal {
  constructor(public name: string) {}

  abstract makeSound(): string;

  describe(): string {
    return `${this.name} says ${this.makeSound()}`;
  }
}

interface Swimmable {
  swim(): void;
}

class Dog extends Animal implements Swimmable {
  constructor(name: string, private breed: string) {
    super(name);
  }

  makeSound(): string {
    return 'Woof';
  }

  swim(): void {
    console.log(`${this.name} is swimming`);
  }

  getBreed(): string {
    return this.breed;
  }
}

const dog = new Dog('Buddy', 'Golden Retriever');
console.log(dog.describe());
dog.swim();
```

需要注意,ArkTS 中 `public`、`private`、`protected` 修饰符行为与 TypeScript 一致,但更严格——`private` 字段在 ArkTS 中通过 `#` 私有字段语法也支持:

```typescript
class Counter {
  #count: number = 0;  // 私有字段

  increment(): void {
    this.#count++;
  }

  getCount(): number {
    return this.#count;
  }
}
```

## 6. 实战案例

### 6.1 案例:从 React+TS 项目迁移到 ArkTS

假设我们要将一个简单的 React + TypeScript 待办列表组件迁移到 ArkTS。这个案例涵盖了类型定义、组件结构、状态管理等关键差异点。

**原始 React + TypeScript 代码**:

```typescript
// types.ts
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

// TodoList.tsx
import React, { useState } from 'react';
import { Todo } from './types';

export const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState<string>('');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos([...todos, {
      id: Date.now(),
      text: input.trim(),
      completed: false
    }]);
    setInput('');
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  return (
    <div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
      />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} onClick={() => toggleTodo(todo.id)}>
            {todo.text} {todo.completed ? '(done)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

**迁移到 ArkTS 的版本**:

```typescript
// types.ts
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}
```

```typescript
// TodoList.ets
import { Todo } from './types';

@Entry
@Component
struct TodoList {
  // 状态:使用 @State 装饰器
  @State todos: Todo[] = [];
  @State input: string = '';

  // 添加待办
  private addTodo(): void {
    const trimmed: string = this.input.trim();
    if (trimmed.length === 0) return;

    const newTodo: Todo = {
      id: Date.now(),
      text: trimmed,
      completed: false
    };

    // ArkTS 中应使用不可变更新触发 UI 刷新
    this.todos = [...this.todos, newTodo];
    this.input = '';
  }

  // 切换完成状态
  private toggleTodo(id: number): void {
    this.todos = this.todos.map((todo: Todo): Todo => {
      if (todo.id === id) {
        return {
          id: todo.id,
          text: todo.text,
          completed: !todo.completed
        };
      }
      return todo;
    });
  }

  // 构建单个待办项
  @Builder
  TodoItem(todo: Todo) {
    Row() {
      Text(todo.text)
        .fontSize(16)
        .decoration({ type: todo.completed ?
          TextDecorationType.LineThrough : TextDecorationType.None })

      Text(todo.completed ? ' (done)' : '')
        .fontColor('#888')
    }
    .width('100%')
    .height(48)
    .onClick(() => {
      this.toggleTodo(todo.id);
    })
  }

  build() {
    Column() {
      // 输入区域
      Row() {
        TextInput({ text: this.input })
          .width('70%')
          .onChange((value: string) => {
            this.input = value;
          })

        Button('Add')
          .width('30%')
          .onClick(() => {
            this.addTodo();
          })
      }
      .width('100%')

      // 待办列表
      List() {
        ForEach(this.todos, (todo: Todo) => {
          ListItem() {
            this.TodoItem(todo)
          }
        }, (todo: Todo) => todo.id.toString())
      }
      .width('100%')
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .padding(16)
  }
}
```

迁移过程中的关键决策点:

1. **状态管理**——React 的 `useState` 替换为 ArkTS 的 `@State` 装饰器
2. **不可变更新**——两者都要求不可变更新触发刷新,但 ArkTS 中 `@State` 对数组采用整体刷新策略,需重新赋值整个数组
3. **事件处理**——React 的 `onChange={e => setInput(e.target.value)}` 替换为 ArkTS 的 `onChange((value: string) => { this.input = value; })`,注意箭头函数参数需显式类型
4. **JSX → 声明式 UI**——JSX 的 `<div>`、`<ul>`、`<li>` 替换为 ArkUI 的 `Column`、`List`、`ListItem` 等内置组件,通过链式调用配置样式
5. **`@Builder` 复用**——抽出 `TodoItem` 作为可复用 UI 片段,类似 React 中的子组件
6. **`ForEach` 渲染列表**——替代 JSX 的 `map`,需要提供 `keyGenerator` 函数

### 6.2 案例:类型安全的事件处理

考虑一个登录表单,需要处理用户输入、表单提交、异步请求。这个案例展示 ArkTS 在异步代码中的类型约束。

```typescript
interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

interface LoginFormData {
  username: string;
  password: string;
}

@Entry
@Component
struct LoginPage {
  @State formData: LoginFormData = { username: '', password: '' };
  @State loading: boolean = false;
  @State errorMessage: string = '';

  private async handleLogin(): Promise<void> {
    // 基础校验
    if (this.formData.username.length === 0) {
      this.errorMessage = '用户名不能为空';
      return;
    }
    if (this.formData.password.length < 6) {
      this.errorMessage = '密码长度至少 6 位';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const response: LoginResponse = await this.callLoginApi(this.formData);

      if (response.success && response.token) {
        // 登录成功,跳转主页
        // router.replaceUrl({ url: 'pages/Home' });
        console.info('Login success, token: ' + response.token);
      } else {
        this.errorMessage = response.error ?? '登录失败';
      }
    } catch (e) {
      // ArkTS 中 catch 子句的变量默认是 unknown 类型
      const error: unknown = e;
      if (error instanceof Error) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = '未知错误';
      }
    } finally {
      this.loading = false;
    }
  }

  private async callLoginApi(data: LoginFormData): Promise<LoginResponse> {
    // 模拟异步请求
    return new Promise<LoginResponse>((resolve: (value: LoginResponse) => void): void => {
      setTimeout((): void => {
        if (data.username === 'admin' && data.password === '123456') {
          resolve({ success: true, token: 'fake-token-12345' });
        } else {
          resolve({ success: false, error: '用户名或密码错误' });
        }
      }, 1000);
    });
  }

  build() {
    Column() {
      TextInput({ text: this.formData.username, placeholder: '用户名' })
        .onChange((value: string) => {
          // 不可变更新整个对象
          this.formData = {
            username: value,
            password: this.formData.password
          };
        })

      TextInput({ text: this.formData.password, placeholder: '密码' })
        .type(InputType.Password)
        .onChange((value: string) => {
          this.formData = {
            username: this.formData.username,
            password: value
          };
        })

      if (this.errorMessage.length > 0) {
        Text(this.errorMessage)
          .fontColor('#ff0000')
          .fontSize(14)
      }

      Button(this.loading ? '登录中...' : '登录')
        .enabled(!this.loading)
        .onClick(() => {
          this.handleLogin();
        })
    }
    .padding(20)
  }
}
```

需要注意的 ArkTS 细节:

1. **`catch` 子句变量类型**——ArkTS 中 `catch (e)` 的 `e` 默认是 `unknown` 类型,使用前必须类型收窄
2. **Promise 泛型显式标注**——`new Promise<LoginResponse>((resolve: ...) => {...})` 中所有回调参数需显式类型
3. **`setTimeout` 回调**——回调函数需显式标注返回类型 `((): void => {...})`
4. **对象不可变更新**——修改 `@State` 对象的属性时,需要重新赋值整个对象以触发 UI 刷新
5. **空值合并运算符 `??`**——ArkTS 支持 `??`、`?.` 等 ES2020 语法

## 7. 进阶技巧

### 7.1 类型守卫的编写

ArkTS 中类型守卫(type guard)是处理 `unknown` 与联合类型的核心工具。常见的类型守卫模式:

**基本类型守卫**:

```typescript
function processValue(value: unknown): string {
  if (typeof value === 'string') {
    // 此处 value 类型收窄为 string
    return value.toUpperCase();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return 'unknown';
}
```

**自定义类型谓词**:

```typescript
interface User {
  id: number;
  name: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof (value as Record<string, unknown>).id === 'number' &&
    typeof (value as Record<string, unknown>).name === 'string'
  );
}

function handleData(data: unknown): string {
  if (isUser(data)) {
    // 此处 data 类型收窄为 User
    return `User: ${data.name}`;
  }
  return 'Not a user';
}
```

**联合类型收窄**:

```typescript
type Result =
  | { status: 'success'; data: string }
  | { status: 'error'; message: string };

function processResult(result: Result): string {
  switch (result.status) {
    case 'success':
      // 此处 result 类型收窄为 { status: 'success'; data: string }
      return `Data: ${result.data}`;
    case 'error':
      // 此处 result 类型收窄为 { status: 'error'; message: string }
      return `Error: ${result.message}`;
  }
}
```

### 7.2 不可变更新模式

ArkTS 中 `@State` 装饰的数组和对象必须采用不可变更新模式才能触发 UI 刷新。常见模式:

**数组更新**:

```typescript
@State items: string[] = ['a', 'b', 'c'];

// 添加
this.items = [...this.items, 'd'];

// 删除(按索引)
const idx = 2;
this.items = [...this.items.slice(0, idx), ...this.items.slice(idx + 1)];

// 删除(按值)
const value = 'b';
this.items = this.items.filter((item: string): boolean => item !== value);

// 修改(按索引)
this.items = this.items.map((item: string, i: number): string =>
  i === 1 ? 'updated' : item
);
```

**对象更新**:

```typescript
interface User {
  id: number;
  name: string;
  age: number;
}

@State user: User = { id: 1, name: 'Alice', age: 30 };

// 修改单个属性
this.user = {
  ...this.user,
  age: 31
};

// 修改多个属性
this.user = {
  ...this.user,
  name: 'Bob',
  age: 31
};
```

注意:展开运算符 `...` 在 ArkTS 中只能用于数组与对象字面量内部,不能用于函数参数(不支持剩余参数语法 except in limited form)。

### 7.3 工具类型的合理使用

ArkTS 支持的工具类型:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Partial<T>:所有属性变为可选
type UserUpdate = Partial<User>;
// 等价于 { id?: number; name?: string; email?: string; age?: number }

// Pick<T, K>:挑选指定属性
type UserBasic = Pick<User, 'id' | 'name'>;
// 等价于 { id: number; name: string }

// Omit<T, K>:排除指定属性
type UserWithoutId = Omit<User, 'id'>;
// 等价于 { name: string; email: string; age: number }

// Readonly<T>:所有属性变为只读
type ReadonlyUser = Readonly<User>;
```

不支持的工具类型(需手动定义):

```typescript
// Record<K, T>:不支持,需用对象接口替代
// type UserMap = Record<number, User>;  // ArkTS 不支持

// 替代方案:使用 Map
const userMap: Map<number, User> = new Map();

// 或使用对象接口(键必须是 string | number)
interface UserMap {
  [key: number]: User;
}
const userMapObj: UserMap = {};
```

### 7.4 命名空间与模块组织

ArkTS 支持命名空间 `namespace` 用于组织代码,但更推荐使用 ES Module:

```typescript
// 推荐方式:ES Module
// utils/logger.ets
export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Error = 'ERROR'
}

export class Logger {
  static log(level: LogLevel, message: string): void {
    console.log(`[${level}] ${message}`);
  }
}

// 使用
// other-file.ets
import { Logger, LogLevel } from './utils/logger';
Logger.log(LogLevel.Info, 'Hello');
```

```typescript
// 不推荐:命名空间(仍支持但少用)
namespace Utils {
  export const PI: number = 3.14159;

  export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

// 使用
Utils.clamp(5, 0, 10);
```

## 8. 性能优化

### 8.1 类型信息与 AOT 编译

ArkTS 严格类型约束的核心收益是支持 AOT 编译优化。理解这一点需要从 JIT 与 AOT 的对比说起。

JavaScript/TypeScript 通常通过 JIT(Just-In-Time)编译执行:V8 引擎在运行时收集类型信息,对热点代码进行优化。这种模式灵活但启动慢、内存占用高。

ArkTS 通过 AOT 编译:在打包阶段将 ArkTS 编译为 ArkVM 字节码或直接编译为机器码。这种模式要求**类型信息在编译期完全确定**,无法依赖运行时收集。ArkTS 禁止 `any`、动态属性、`delete` 等特性的根本原因正是如此。

下表对比两种模式:

| 维度 | JIT(TypeScript) | AOT(ArkTS) |
| --- | --- | --- |
| 编译时机 | 运行时 | 打包时 |
| 类型信息 | 运行时收集 | 编译期确定 |
| 启动速度 | 慢(需预热) | 快(已优化) |
| 内存占用 | 高(JIT 缓存) | 低 |
| 包体积 | 小(源码) | 大(已编译) |
| 运行时优化 | 持续优化 | 静态优化 |

### 8.2 类型标注对性能的影响

虽然 ArkTS 强制要求类型标注,但不同的类型选择会影响生成代码质量:

```typescript
// 不推荐:使用联合类型,编译器需生成类型检查代码
function process(value: string | number): string {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  return value.toString();
}

// 推荐:使用泛型或函数重载,编译器可分别优化
function processString(value: string): string {
  return value.toUpperCase();
}

function processNumber(value: number): string {
  return value.toString();
}
```

```typescript
// 不推荐:嵌套层级过深的对象
interface DeepNested {
  level1: {
    level2: {
      level3: {
        value: string;
      };
    };
  };
}

// 推荐:扁平化结构
interface FlatStruct {
  value: string;
}
```

### 8.3 装饰器与性能

ArkTS 装饰器在编译期会被转换为等价的命令式代码,不会引入运行时反射开销。但 `@State` 等状态装饰器会注册依赖追踪,需要注意:

```typescript
@Component
struct MyComponent {
  // 推荐:状态数量适中
  @State count: number = 0;
  @State name: string = '';

  // 不推荐:过多状态,每个 @State 都会注册追踪
  // 应考虑使用 @Observed + @ObjectLink 或全局状态管理
  build() {
    // ...
  }
}
```

### 8.4 内存布局优化

ArkTS 编译器能够基于类型信息优化对象内存布局。明确、稳定的类型有助于优化:

```typescript
// 推荐:所有字段类型固定
class Point3D {
  x: number = 0;
  y: number = 0;
  z: number = 0;
}

// 不推荐:字段类型可变(联合)
class BadPoint {
  x: number | string = 0;  // 编译器需为两种类型都预留空间
  y: number | null = 0;
}
```

## 9. 调试与排错

### 9.1 常见编译错误及解决

**错误:`any` 类型不允许**:

```
Error: 'any' type is not allowed.
```

```typescript
// 错误代码
function process(data: any) { /* ... */ }

// 修复:定义具体类型
interface ProcessData {
  // ...
}
function process(data: ProcessData) { /* ... */ }
```

**错误:对象属性不存在**:

```
Error: Property 'xxx' does not exist on type 'YYY'.
```

```typescript
// 错误代码
interface User { name: string; }
const user: User = { name: 'Alice' };
user.age = 30;  // age 不在接口中

// 修复:扩展接口
interface User {
  name: string;
  age: number;
}
const user: User = { name: 'Alice', age: 30 };
```

**错误:不能使用 delete**:

```
Error: 'delete' operator is not allowed.
```

```typescript
// 错误代码
const obj: Record<string, number> = { a: 1, b: 2 };
delete obj.a;

// 修复:使用解构或 filter
const { a, ...rest } = obj;
// 或重新构造对象
const newObj: Record<string, number> = { b: obj.b };
```

**错误:不能使用 Object.keys / Object.values**:

```typescript
// 错误代码
const obj = { a: 1, b: 2 };
const keys = Object.keys(obj);

// 修复:使用 Map 或显式键数组
const map: Map<string, number> = new Map();
map.set('a', 1);
map.set('b', 2);
const keys: string[] = Array.from(map.keys());
```

### 9.2 DevEco Studio 调试技巧

DevEco Studio 提供完整的 ArkTS 调试支持:

1. **断点调试**——在 `.ets` 文件中设置断点,通过 Run → Debug 启动调试
2. **类型错误提示**——编辑器实时显示类型错误,鼠标悬停查看详情
3. **快速修复**——`Alt + Enter`(Windows)/ `Option + Enter`(Mac)调用快速修复
4. **类型推断查看**——`Ctrl + Shift + P` 查看变量类型
5. **ArkTS 严格模式开关**——`build-profile.json5` 中配置 `arkTSStrictMode`

### 9.3 编译器日志阅读

ArkTS 编译器日志格式与 TypeScript 不同,典型日志:

```
[ArkTS Compiler]
ERROR: src/main/ets/pages/Index.ets:15:7
ERROR: Type 'string' is not assignable to type 'number'.
   15 |   const count: number = 'hello';
          ~~~~~

[ArkTS Compiler]
WARNING: src/main/ets/pages/Index.ets:25:3
WARNING: Property 'unused' is declared but never used.
   25 |   unused: string = '';
        ~~~~~~
```

格式为:`文件路径:行:列`,后跟错误描述与代码片段。下划线 `~~~~` 标记出错位置。

## 10. 最佳实践

### 10.1 类型设计原则

**原则一:尽可能具体,而非抽象**:

```typescript
// 不推荐:过于宽泛
function process(data: Record<string, unknown>): void { /* ... */ }

// 推荐:具体接口
interface UserData {
  id: number;
  name: string;
  email: string;
}
function process(data: UserData): void { /* ... */ }
```

**原则二:可选属性需谨慎使用**:

```typescript
interface User {
  id: number;
  name: string;
  email?: string;     // 可选:可能未提供
  age?: number;       // 可选:可能未提供
}

// 处理可选属性时必须检查 undefined
function getDisplayName(user: User): string {
  if (user.email !== undefined) {
    return `${user.name} <${user.email}>`;
  }
  return user.name;
}
```

**原则三:联合类型优于枚举(在多数场景)**:

```typescript
// 推荐:字面量联合
type Status = 'idle' | 'loading' | 'success' | 'error';

function handle(status: Status): void {
  switch (status) {
    case 'idle': /* ... */ break;
    case 'loading': /* ... */ break;
    case 'success': /* ... */ break;
    case 'error': /* ... */ break;
  }
}

// 也可使用 enum(适合需要命名空间的场景)
enum StatusCode {
  Idle = 'IDLE',
  Loading = 'LOADING'
}
```

### 10.2 文件组织规范

推荐的项目结构:

```
src/main/ets/
├── entryability/         # Ability 入口
│   └── EntryAbility.ets
├── pages/                # 页面组件
│   ├── Index.ets
│   ├── Login.ets
│   └── Home.ets
├── components/           # 自定义组件
│   ├── TodoItem.ets
│   └── UserCard.ets
├── model/                # 数据模型
│   ├── User.ets
│   └── Todo.ets
├── service/              # 业务服务
│   ├── UserService.ets
│   └── ApiService.ets
├── utils/                # 工具函数
│   ├── Logger.ets
│   └── Validator.ets
└── common/               # 公共常量与类型
    ├── Constants.ets
    └── Types.ets
```

### 10.3 命名约定

```typescript
// 类名:PascalCase
class UserService { }

// 接口名:PascalCase(不加 I 前缀)
interface User { }
// 注意:HarmonyOS 官方风格不推荐 I 前缀

// 函数与变量:camelCase
function getUserInfo() { }
const userName = 'Alice';

// 常量:UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 装饰器标记的字段:保持 camelCase
@State userName: string = '';
```

### 10.4 错误处理规范

```typescript
// 推荐的错误处理模式
class Result<T> {
  constructor(
    public success: boolean,
    public data?: T,
    public error?: string
  ) {}
}

async function fetchUser(id: number): Promise<Result<User>> {
  try {
    const response: User = await api.getUser(id);
    return new Result<User>(true, response);
  } catch (e) {
    const error: unknown = e;
    if (error instanceof Error) {
      return new Result<User>(false, undefined, error.message);
    }
    return new Result<User>(false, undefined, '未知错误');
  }
}

// 使用
const result = await fetchUser(1);
if (result.success && result.data) {
  console.log(result.data.name);
} else {
  console.error(result.error);
}
```

## 11. 总结与回顾

### 11.1 核心差异速查表

| 特性 | TypeScript | ArkTS |
| --- | --- | --- |
| `any` 类型 | 允许 | **禁止** |
| `unknown` 类型 | 允许 | 允许(需类型守卫) |
| 函数参数省略类型 | 允许(推断 any) | **禁止** |
| 函数返回值省略 | 允许(推断) | **禁止** |
| `Object.keys/values/entries` | 允许 | **不允许**(改用 Map) |
| `delete` 运算符 | 允许 | **禁止** |
| 运行时添加属性 | 允许 | **禁止** |
| `Object.assign` | 允许 | 受限(需手动赋值) |
| 结构性类型 | 完整支持 | 受限(推荐 class) |
| 条件类型 / 映射类型 | 支持 | **不支持** |
| `typeof` 类型查询 | 完整支持 | 受限 |
| 装饰器 | 实验性 | 核心特性(ArkUI) |
| `struct` 关键字 | 不支持 | 支持(组件) |
| 模块系统 | ES Module + CommonJS | 仅 ES Module |
| 动态 `import()` | 支持 | 不支持 |
| 编译目标 | JavaScript | ArkVM 字节码 / 机器码 |
| 编译方式 | JIT | AOT |

### 11.2 迁移决策树

将 TypeScript 代码迁移到 ArkTS 时,可遵循以下决策树:

1. 是否使用 `any`?
   - 是 → 替换为具体类型,或 `unknown` + 类型守卫
   - 否 → 继续

2. 是否使用动态属性操作(`Object.keys`、`delete`、`Object.assign`)?
   - 是 → 改用 Map 或显式接口
   - 否 → 继续

3. 是否使用条件类型 / 映射类型?
   - 是 → 改用具体类型定义
   - 否 → 继续

4. 是否使用 CommonJS?
   - 是 → 改用 ES Module
   - 否 → 继续

5. 是否使用动态 `import()`?
   - 是 → 改用静态 import
   - 否 → 继续

6. 是否有 React/Vue/Angular 等框架代码?
   - 是 → 改写为 ArkUI 声明式语法
   - 否 → 大部分逻辑代码可直接复用

### 11.3 学习路径建议

对于不同背景的开发者,建议的学习路径:

**TypeScript 老手**:

1. 通读本章节,理解差异点
2. 阅读后续"ArkUI 声明式语法"章节
3. 完成一个简单的待办列表应用
4. 学习"组件生命周期详解"与"路由跳转与路由栈"
5. 进阶学习"状态管理"与"性能优化"

**JavaScript 老手(无 TS 经验)**:

1. 先学习 TypeScript 基础(interface、type、泛型)
2. 再回到本章节学习 ArkTS 差异
3. 后续路径同上

**后端转前端开发者**:

1. 通读"概述与环境搭建"
2. 学习"ArkTS 语言特性"(若已存在)
3. 本章节深入类型差异
4. 重点学习 ArkUI 声明式 UI(与命令式思维差异较大)

## 12. 参考资料

### 12.1 官方文档

- **HarmonyOS 应用开发文档**——https://developer.harmonyos.com/
- **ArkTS 语言规范**——https://developer.harmonyos.com/cn/docs/arkts/
- **TypeScript Handbook**——https://www.typescriptlang.org/docs/handbook/
- **ArkUI 组件参考**——https://developer.harmonyos.com/cn/docs/arkui/

### 12.2 推荐阅读

- TypeScript Deep Dive——深入理解 TypeScript 类型系统
- Programming TypeScript——O'Reilly 出版的 TS 权威指南
- Effective TypeScript——Dan Vanderkam 著,55 条 TS 最佳实践
- 设计模式(GoF)——理解 ArkTS 中类与接口的应用

### 12.3 相关标准

- ECMAScript 2023 规范——ArkTS 支持的 ES 特性子集
- W3C TypeScript 语言规范——TS 类型系统基础
- HarmonyOS Application Package Standard——HAP/HSP/HAR 包格式

### 12.4 进阶主题

完成本章学习后,可继续探索:

- **ArkUI 声明式语法**——下一章节,深入装饰器与组件结构
- **组件生命周期详解**——理解 `aboutToAppear`、`aboutToDisappear` 等回调
- **状态管理**——`@State`、`@Prop`、`@Link`、`@Provide`、`@Consume` 的深入对比
- **Stage 模型与 FA 模型区别**——理解应用架构层面的差异
- **国际化与无障碍**——构建面向全球用户的可访问应用

---

## 附录 A:类型对照速查

### A.1 类型映射表

| JavaScript | TypeScript | ArkTS |
| --- | --- | --- |
| `var x = 1` | `let x: number = 1` | `let x: number = 1` |
| `var x = 'a'` | `let x: string = 'a'` | `let x: string = 'a'` |
| `var x = {}` | `let x: object = {}` | `let x: SomeInterface = { ... }` |
| `var x = []` | `let x: any[] = []` | `let x: string[] = []` |
| `var x = null` | `let x: string \| null = null` | `let x: string \| null = null` |
| `function f(x) {}` | `function f(x: any) {}` | `function f(x: Type) {}` |

### A.2 操作映射表

| 操作 | TypeScript | ArkTS |
| --- | --- | --- |
| 添加属性 | `obj.newProp = 1` | 需在接口声明 |
| 删除属性 | `delete obj.prop` | 不可,重新构造对象 |
| 获取所有键 | `Object.keys(obj)` | `Array.from(map.keys())` |
| 合并对象 | `Object.assign({}, a, b)` | `{ ...a, ...b }`(展开运算符) |
| 类型断言 | `x as string` | `x as string` |
| 类型守卫 | `typeof x === 'string'` | `typeof x === 'string'` |
| 非空断言 | `x!.foo` | `x!.foo` |
| 可选链 | `x?.foo` | `x?.foo` |
| 空值合并 | `x ?? 'default'` | `x ?? 'default'` |

## 附录 B:常见陷阱与陷阱

### B.1 陷阱一:误用 `as` 类型断言

```typescript
// 错误:用 as 跳过类型检查,等同于 any
const data: unknown = JSON.parse('{}');
const user = data as User;  // 编译通过但运行时可能出错

// 正确:用类型守卫验证
if (isUser(data)) {
  const user: User = data;  // 类型已收窄,安全
}
```

### B.2 陷阱二:展开运算符的局限

```typescript
// 错误:ArkTS 中展开运算符不能用于函数参数
function add(...nums: number[]): number {
  return nums.reduce((a: number, b: number): number => a + b, 0);
}
// 不支持 const args = [1, 2, 3]; add(...args);
```

注:实际上 ArkTS 中 `...` 用于函数参数(rest 参数)是支持的,但调用时不能展开数组传入。需用 `apply` 或显式传参。

### B.3 陷阱三:`@State` 对象的不可变更新

```typescript
// 错误:直接修改属性不会触发 UI 刷新
@State user: User = { name: 'Alice', age: 30 };

this.user.age = 31;  // UI 不会更新!

// 正确:重新赋值整个对象
this.user = {
  name: this.user.name,
  age: 31
};

// 或使用 ObjectLink + Observed 处理嵌套对象
```

### B.4 陷阱四:`enum` 的字符串化

```typescript
// 数字 enum 默认从 0 开始
enum Direction { Up, Down, Left, Right }
// Direction.Up === 0,Direction.Down === 1, ...

// 字符串 enum
enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}
// Status.Active === 'ACTIVE'

// JSON 序列化时注意:数字 enum 会变成数字
const obj = { status: Status.Active };
JSON.stringify(obj);  // '{"status":"ACTIVE"}'(字符串 enum)
// 数字 enum: '{"status":0}'
```

## 附录 C:类型推导能力对比

ArkTS 的类型推导比 TypeScript 更保守。下表展示典型场景:

```typescript
// TypeScript:自动推断为 number
const count = 10;

// ArkTS:同样推断为 number(基础类型推断保留)
const count = 10;

// ----

// TypeScript:推断为 any[]
const arr = [];

// ArkTS:必须显式标注
const arr: number[] = [];

// ----

// TypeScript:函数返回值自动推断
function add(a: number, b: number) {
  return a + b;
}  // 推断返回 number

// ArkTS:必须显式标注返回值
function add(a: number, b: number): number {
  return a + b;
}

// ----

// TypeScript:对象字面量自动推断结构
const user = { name: 'Alice', age: 30 };

// ArkTS:同样可推断,但推荐显式接口
interface User { name: string; age: number; }
const user: User = { name: 'Alice', age: 30 };
```

## 附录 D:与 Flutter(Dart)、Swift UI 对比

为了帮助有其他平台经验的开发者理解 ArkTS,这里做一个横向对比。

### D.1 类型系统

| 维度 | ArkTS | Dart(Flutter) | Swift(SwiftUI) |
| --- | --- | --- | --- |
| 类型系统 | 静态 + 严格 | 静态 + sound | 静态 + sound |
| `null` 处理 | 联合类型 `T \| null` | nullable `T?` | optional `T?` |
| 类型推断 | 保守 | 较强 | 强 |
| 泛型 | 支持 | 支持 | 支持 |
| 装饰器 | 核心特性 | 不支持(annotation 不同) | property wrappers |

### D.2 UI 描述范式

```typescript
// ArkTS
@Component
struct MyComponent {
  @State count: number = 0;
  build() {
    Column() {
      Text(`${this.count}`)
      Button('Add').onClick(() => this.count++)
    }
  }
}
```

```dart
// Flutter (Dart)
class MyWidget extends StatefulWidget {
  @override
  _MyWidgetState createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  int count = 0;
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$count'),
        ElevatedButton(
          onPressed: () => setState(() => count++),
          child: Text('Add'),
        ),
      ],
    );
  }
}
```

```swift
// SwiftUI (Swift)
struct MyView: View {
  @State var count = 0
  var body: some View {
    VStack {
      Text("\(count)")
      Button("Add") { count += 1 }
    }
  }
}
```

可以看到三者都采用声明式 UI,但语法各有不同。ArkTS 与 SwiftUI 在状态管理(`@State` 装饰器)上最为接近,Flutter 则采用 `setState` 命令式刷新。

## 附录 E:扩展阅读——ArkTS 的设计动机

ArkTS 的设计深受以下因素驱动:

### E.1 AOT 编译的需求

HarmonyOS 面向全场景设备,包括手机、平板、手表、车机、IoT 等。这些设备计算能力参差不齐,有些低功耗设备无法承担 JIT 编译的开销。ArkTS 的严格类型约束使得 AOT 编译成为可能,在打包阶段就生成优化的机器码,运行时无需预热,启动速度与运行效率都更优。

### E.2 多设备协同

HarmonyOS 的分布式特性要求代码可在不同设备间迁移执行。严格类型约束使得序列化/反序列化更可靠,跨设备调用时的类型匹配更可控。

### E.3 安全性考量

HarmonyOS 作为面向万物互联的操作系统,对应用安全性有更高要求。禁止 `any`、动态属性等特性,减少了运行时类型相关的安全漏洞。

### E.4 开发效率与可维护性

虽然严格类型增加了初期编码成本,但带来的长期收益包括:

- 重构更安全(IDE 可准确分析影响范围)
- 代码可读性更高(类型即文档)
- 团队协作更顺畅(类型契约明确)
- 调试更高效(类型错误在编译期暴露)

这些收益与 TypeScript 最初的设计动机一致,ArkTS 只是将这一方向推进得更彻底。

---

## 附录 F:练习题

### F.1 基础题

**题目 1**:以下 TypeScript 代码改为 ArkTS:

```typescript
function processData(data: any) {
  if (data && data.items) {
    return data.items.map(item => item.name);
  }
  return [];
}
```

参考答案:

```typescript
interface DataItem {
  name: string;
}

interface ProcessDataInput {
  items: DataItem[];
}

function processData(data: ProcessDataInput): string[] {
  if (data && data.items) {
    return data.items.map((item: DataItem): string => item.name);
  }
  return [];
}
```

**题目 2**:以下代码在 ArkTS 中有何错误?如何修复?

```typescript
const obj = { a: 1, b: 2 };
obj.c = 3;
const keys = Object.keys(obj);
delete obj.a;
```

参考答案:

错误:
1. `obj.c = 3`——动态添加属性,ArkTS 不允许
2. `Object.keys(obj)`——ArkTS 不允许
3. `delete obj.a`——ArkTS 不允许 delete

修复:

```typescript
interface MyObject {
  a?: number;
  b?: number;
  c?: number;
}

let obj: MyObject = { a: 1, b: 2 };
obj.c = 3;  // 合法:c 在接口中声明

// 获取所有键:使用 Map
const map: Map<string, number> = new Map();
map.set('a', 1);
map.set('b', 2);
map.set('c', 3);
const keys: string[] = Array.from(map.keys());

// 删除属性:重新构造对象
const { a, ...rest } = obj;
obj = rest;
```

### F.2 进阶题

**题目 3**:实现一个类型安全的 `groupBy` 函数,接受数组和分组函数,返回分组结果。

参考答案:

```typescript
interface GroupedResult<T> {
  [key: string]: T[];
}

function groupBy<T>(arr: T[], fn: (item: T) => string): GroupedResult<T> {
  const result: GroupedResult<T> = {};
  for (let i = 0; i < arr.length; i++) {
    const item: T = arr[i];
    const key: string = fn(item);
    if (result[key] === undefined) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

// 使用
interface User {
  name: string;
  age: number;
}

const users: User[] = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Charlie', age: 30 }
];

const grouped: GroupedResult<User> = groupBy(users, (u: User): string => u.age.toString());
// {
//   '25': [{ name: 'Bob', age: 25 }],
//   '30': [{ name: 'Alice', age: 30 }, { name: 'Charlie', age: 30 }]
// }
```

**题目 4**:实现一个类型安全的 event emitter。

参考答案:

```typescript
type EventHandler = (data: unknown) => void;

class EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): void {
    let list: EventHandler[] | undefined = this.handlers.get(event);
    if (list === undefined) {
      list = [];
      this.handlers.set(event, list);
    }
    list.push(handler);
  }

  off(event: string, handler: EventHandler): void {
    const list: EventHandler[] | undefined = this.handlers.get(event);
    if (list === undefined) {
      return;
    }
    const idx: number = list.indexOf(handler);
    if (idx >= 0) {
      list.splice(idx, 1);
    }
  }

  emit(event: string, data: unknown): void {
    const list: EventHandler[] | undefined = this.handlers.get(event);
    if (list === undefined) {
      return;
    }
    for (let i = 0; i < list.length; i++) {
      list[i](data);
    }
  }
}
```

### F.3 综合题

**题目 5**:设计一个类型安全的状态管理类,支持订阅状态变化。

参考答案:

```typescript
interface Listener<T> {
  (state: T): void;
}

class Store<T> {
  private state: T;
  private listeners: Listener<T>[] = [];

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return this.state;
  }

  setState(updater: (prevState: T) => T): void {
    const newState: T = updater(this.state);
    this.state = newState;
    this.notifyListeners();
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.push(listener);
    // 返回取消订阅函数
    return (): void => {
      const idx: number = this.listeners.indexOf(listener);
      if (idx >= 0) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  private notifyListeners(): void {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](this.state);
    }
  }
}

// 使用
interface CounterState {
  count: number;
}

const store: Store<CounterState> = new Store<CounterState>({ count: 0 });

const unsubscribe: () => void = store.subscribe((state: CounterState): void => {
  console.log(`Count: ${state.count}`);
});

store.setState((prev: CounterState): CounterState => ({
  count: prev.count + 1
}));

unsubscribe();
```

---

## 附录 G:术语表

| 术语 | 英文 | 说明 |
| --- | --- | --- |
| 渐进式类型 | gradual typing | 类型标注可选,可逐步添加 |
| 结构性类型 | structural typing | 基于结构匹配而非显式声明 |
| 名义类型 | nominal typing | 基于显式声明的关系 |
| 类型守卫 | type guard | 用于收窄联合类型的函数 |
| 类型谓词 | type predicate | `x is T` 形式的返回类型 |
| AOT 编译 | ahead-of-time compilation | 编译期生成机器码 |
| JIT 编译 | just-in-time compilation | 运行时编译热点代码 |
| 装饰器 | decorator | `@` 开头的元编程语法 |
| 联合类型 | union type | `A \| B` 形式的类型 |
| 交叉类型 | intersection type | `A & B` 形式的类型 |
| 工具类型 | utility type | `Partial<T>`、`Pick<T,K>` 等 |
| 不可变更新 | immutable update | 通过新建对象而非修改原对象更新 |

---

**本章总结**:ArkTS 是 TypeScript 的"严格子集 + ArkUI 扩展"。理解差异的核心在于把握"严格类型 + AOT 编译 + 声明式 UI"三大设计目标。从 TypeScript 迁移到 ArkTS 的主要工作是"减法"——去除 `any`、动态特性、结构性类型的滥用,转而采用显式类型、不可变数据、名义类型。这种转变虽然初期增加编码成本,但带来更好的运行时性能、编译期错误捕获与代码可维护性。后续章节将深入 ArkUI 声明式语法与状态管理,届时本章节的类型基础将发挥关键作用。
