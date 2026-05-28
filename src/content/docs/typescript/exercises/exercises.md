---
order: 120
tags:
  - 'typescript'
  - 'exercises'
  - 'oop'
difficulty: 'intermediate'
title: 'TypeScript 练习题'
module: 'typescript'
description: 'TypeScript 核心知识点配套练习，涵盖类型系统与泛型。'
---

<summary>查看答案</summary>
**答案**: D
**解析**: A 是条件类型，合法；B 是接口交叉类型写法（需用 `type` 语法 `type I = IA & IB`，但作为类型表达式合法）；C 交叉后 `name` 类型为 `string & number` 即 `never`，语法合法但实际不可赋值。三者语法层面均合法。
</details>
### 2. 关于泛型约束，以下写法正确的是？
A. `function f<T extends string | number>(arg: T): T`
B. `function f<T super string>(arg: T): T`
C. `function f<T: string>(arg: T): T`
D. `function f<T implements string>(arg: T): T`
<details>
<summary>查看答案</summary>
**答案**: A
**解析**: TypeScript 使用 `extends` 关键字进行泛型约束，不支持 `super`、`:`、`implements` 作为泛型约束语法。`T extends string | number` 表示 `T` 必须是 `string` 或 `number` 的子类型。
</details>
### 3. 以下代码中 `type Result` 的类型是？
```typescript
 type Result = Pick<{ name: string; age: number; email: string }, 'name' | 'email'>;
 ```

A. `{ name: string; email: string }`
B. `{ name: string; age: number; email: string }`
C. `{ age: number }`
D. 编译错误

<details>
<summary>查看答案</summary>
**答案**: A
**解析**: `Pick<T, K>` 从类型 `T` 中选取属性集合 `K` 组成新类型。选取 `'name'` 和 `'email'`，结果为 `{ name: string; email: string }`。
</details>
### 4. 以下代码能否通过类型检查？
```typescript
 let x: string | number = 42;
 let y: string = x;
 ```

A. 能，因为 42 是 string
B. 不能，因为 x 可能是 number
C. 能，因为 TypeScript 会自动收窄
D. 不能，因为 y 没有初始化

<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `x` 的类型是 `string | number`，不能直接赋值给 `string` 类型的变量 `y`，因为 `x` 可能是 `number`。需要类型收窄（如 `typeof x === 'string'`）或类型断言。
</details>
### 5. 关于 TypeScript 装饰器，以下说法正确的是？
A. 装饰器只能用于类声明
B. 装饰器是 ES 标准的一部分（截至 ES2024）
C. 类装饰器接收的参数是类的构造函数
D. 装饰器不能修改类的行为
<details>
<summary>查看答案</summary>
**答案**: C
**解析**: 类装饰器接收构造函数作为唯一参数，可以用来修改或替换类定义。装饰器可用于类、方法、属性和参数。TC39 装饰器提案仍在推进中。装饰器完全可以修改类的行为。
</details>
## 编程题
### 1. 类型安全的事件发射器
使用泛型和接口实现一个类型安全的事件系统 `EventEmitter<Events>`，其中 `Events` 是事件名到载荷类型的映射。
**输入**:
```typescript
 interface MyEvents {
  click: { x: number; y: number };
  message: string;
 True}
 const emitter = new EventEmitter<MyEvents>();
 ```

**输出**: `emitter.on('click', (e) => ...)` 中 `e` 自动推断为 `{ x: number; y: number }`

<details>
<summary>查看参考答案</summary>
```typescript
 type Handler<T> = (payload: T) => void;
 class EventEmitter<Events extends Record<string, any>> {
  private listeners = new Map<keyof Events, Set<Handler<any>>>();
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
  if (!this.listeners.has(event)) {
  this.listeners.set(event, new Set());
  }
  this.listeners.get(event)!.add(handler);
  return () => this.off(event, handler);
  }
  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
  this.listeners.get(event)?.delete(handler);
  }
  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
  this.listeners.get(event)?.forEach((handler) => handler(payload));
  }
 True}
 ```
</details>
### 2. 实现 DeepPartial
实现 `DeepPartial<T>` 工具类型，将对象类型 `T` 的所有属性（包括嵌套属性）变为可选。
**输入**: `{ a: { b: { c: number } }; d: string }`
**输出**: `{ a?: { b?: { c?: number } }; d?: string }`
<details>
<summary>查看参考答案</summary>
```typescript
 type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
  ? T[P] extends Function
  ? T[P]
  : DeepPartial<T[P]>
  : T[P];
 True};
 ```
</details>
### 3. 类型安全的状态机
使用可辨识联合（Discriminated Union）和泛型实现一个类型安全的状态机，确保状态转换只能在合法路径上进行。
**输入**: 状态 `idle` → `loading` → `success` | `error`
**输出**: `transition('idle', 'start')` 合法，`transition('idle', 'succeed')` 编译报错
<details>
<summary>查看参考答案</summary>
```typescript
 type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };
 type TransitionMap = {
  idle: 'start';
  loading: 'succeed' | 'fail';
  success: 'reset';
  error: 'retry' | 'reset';
 True};
 class StateMachine {
  private state: State = { status: 'idle' };
  transition<S extends State['status']>(
  from: S,
  event: TransitionMap[S]
  ): void {
  switch (event) {
  case 'start':
  this.state = { status: 'loading' };
  break;
  case 'succeed':
  this.state = { status: 'success', data: '' };
  break;
  case 'fail':
  this.state = { status: 'error', error: new Error() };
  break;
  case 'retry':
  this.state = { status: 'loading' };
  break;
  case 'reset':
  this.state = { status: 'idle' };
  break;
  }
  }
  getState(): State {
  return this.state;
  }
 True}
 ```
</details>
