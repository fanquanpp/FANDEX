---
order: 250
title: Jest Mock 模拟
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Jest Mock 实战：jest.fn 与 jest.mock 的区别、模块模拟与部分模拟、jest.spyOn、假定时器与清理策略，附测试替身分类视角。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/190-TestDouble'
  - 'software-testing/240-JestBasics'
  - 'software-testing/260-JestAsync'
prerequisites:
  - 'software-testing/240-JestBasics'
---

## 1. 两类 Mock，别混为一谈

Jest 里「mock」有两个完全不同的入口，新手混乱的根源：

- **`jest.fn()`**：制造一个全新的函数替身，记录自己的调用——用于手工
  注入依赖（构造函数传参、参数注入）；
- **`jest.mock('./api')`**：把**整个模块**替换成替身，影响所有 `import`
  了该模块的代码——用于拦截模块边界。

判断用哪个：依赖能通过参数传进来，用 `jest.fn()`；依赖是模块内部
`import` 进来的，用 `jest.mock()`。概念层的 Stub/Spy/Mock 区分见
「测试替身」一文，本文专注 Jest 的机械用法。

前置知识：「Jest 入门」的匹配器与钩子、ES Module 的 import 语义。

## 2. jest.fn：手工注入的函数替身

```javascript
test('jest.fn 的三种用法', () => {
  // 1) 空替身：默认返回 undefined，只记录调用
  const audit = jest.fn();

  // 2) 预设返回值（Stub 用法）
  const getConfig = jest.fn().mockReturnValue({ theme: 'dark' });
  // 一次性版本：只对下一次调用生效
  const nextId = jest.fn().mockReturnValueOnce(1).mockReturnValueOnce(2);

  // 3) 自定义实现
  const double = jest.fn((x) => x * 2);

  audit('checkout');
  double(21);

  // 行为验证：调用记录
  expect(audit).toHaveBeenCalledTimes(1);
  expect(audit).toHaveBeenCalledWith('checkout');
  expect(double.mock.results[0].value).toBe(42);  // 检查返回值记录
  expect(nextId()).toBe(1);                        // Once 队列依次消费
});
```

## 3. jest.mock：拦截模块边界

```javascript
// api.js（被替身的模块）
//   export async function fetchUser(id) { ... 真实 HTTP 请求 ... }

// user.test.js
import { fetchUser } from './api';
import { getUserName } from './user';

jest.mock('./api');   // 整个模块被自动 mock：每个导出变成 undefined 返回的 jest.fn

import { mocked } from 'ts-jest/utils';
```

自动 mock 的替身返回 `undefined`，通常要配合**工厂函数**给出关键实现：

```javascript
jest.mock('./api', () => ({
  // 工厂函数：完全接管模块的导出形状
  fetchUser: jest.fn(),
}));

import { fetchUser } from './api';
import { getUserName } from './user';

test('getUserName 返回用户名', async () => {
  fetchUser.mockResolvedValue({ id: 1, name: 'Alice' });   // 打桩

  const name = await getUserName(1);

  expect(name).toBe('Alice');
  expect(fetchUser).toHaveBeenCalledWith(1);
});
```

### 3.1 部分模拟：只替身一个导出

```javascript
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),   // 保留全部真实实现
  fetchConfig: jest.fn().mockReturnValue({ retries: 0 }),  // 只替身这一个
}));
```

`jest.requireActual` 是「其余保持真实」的关键——模块里有十个导出而你只
关心一个时，比全量伪造安全得多。

### 3.2 TypeScript 的类型安全访问

```typescript
import { fetchUser } from './api';
import { mocked } from 'jest-mock';    // Jest 27+ 内置包

jest.mock('./api');
// mocked() 让 TS 知道 fetchUser 现在是 jest.fn，可调用 mock 属性而不报错
mocked(fetchUser).mockResolvedValue({ id: 1, name: 'Alice' });
```

## 4. jest.spyOn：监视既有对象的方法

`spyOn` 不新建替身，而是**包住对象上已有的方法**：默认保持原实现、只记录
调用（Spy 角色），也可以接管实现（Mock 角色）。

```javascript
test('spyOn 的两种形态', () => {
  const cart = {
    items: [],
    add(item) { this.items.push(item); return this.items.length; },
  };

  // 形态一：只监视，原实现照常执行
  const addSpy = jest.spyOn(cart, 'add');
  cart.add({ id: 1 });
  expect(addSpy).toHaveBeenCalledTimes(1);
  expect(cart.items).toHaveLength(1);      // 原实现生效了

  // 形态二：接管实现（常用于静音 console、拦截 Date）
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  console.log('测试中不再刷屏');
  expect(logSpy).toHaveBeenCalled();
  logSpy.mockRestore();                    // 用完还原，避免影响其他用例
});
```

## 5. 假定时器：把「等」变成「跳」

涉及 `setTimeout`、防抖、节流的逻辑，真实等待会把测试拖慢几十倍。
`useFakeTimers` 把时间变成可控的变量：

```javascript
test('防抖：停止输入 300ms 后才触发', () => {
  jest.useFakeTimers();                    // 冻结真实时间
  const onChange = jest.fn();
  const debounced = debounce(onChange, 300);

  debounced(); debounced(); debounced();   // 连续触发
  jest.advanceTimersByTime(200);           // 快进 200ms
  expect(onChange).not.toHaveBeenCalled(); // 还没到点

  jest.advanceTimersByTime(100);           // 再快进 100ms，凑满 300
  expect(onChange).toHaveBeenCalledTimes(1); // 三次合并成一次
  jest.useRealTimers();                    // 还原
});
```

测试 `new Date()` 相关逻辑用 `jest.setSystemTime(new Date('2026-01-01'))`
固定「现在」，消除时间不确定性。

## 6. 清理策略：mockReset / mockClear / mockRestore

| 方法          | 清调用记录 | 清实现/返回值 | 恢复原实现 |
| ------------- | :--------: | :-----------: | :--------: |
| `mockClear()` | 是 | 否 | 否 |
| `mockReset()` | 是 | 是 | 否 |
| `mockRestore()` | 是 | 是 | 是（仅 spyOn） |

Jest 27+ 默认 `clearMocks: false`，跨用例的调用记录会累积——这正是
「上次用例的调用算到这次头上」的来源。全局兜底配置：

```javascript
// jest.config.js：每条用例后自动清记录（不清实现）
module.exports = { clearMocks: true };
```

## 7. 常见陷阱

- **`jest.mock` 提升（hoisting）**：Jest 把 `jest.mock('./api')` 提升到
  文件顶部执行，因此它必须**接收字面量路径**，不能写成
  `jest.mock(path)` 变量形式；`import` 语句写在文件哪里都行，但工厂函数
  里不能引用外部未提升的变量。
- **只 Mock 第三方深内部**：`jest.mock('axios')` 可以，但一路 mock 到
  `axios.defaults.headers` 这类深结构非常脆。在自己代码的模块边界
  （service 层接口）打桩，第三方只留一个薄封装。
- **忘清定时器/ spies**：`useFakeTimers` 与 `spyOn` 用完不还原，污染后续
  用例，出现「单跑通过、全跑失败」。放 `afterEach` 或配置 `restoreMocks: true`。
- **断言 Mock 的内部实现过细**：验证 `fetchUser` 被调用一次是行为验证，
  再验证它内部先调了 `buildUrl` 就是把测试焊死在实现上，重构必红。

## 小结

- 初学者要点：依赖能传参就用 `jest.fn()`，是模块导入就 `jest.mock()`；
  部分模拟用 `jest.requireActual`；监视既有方法用 `spyOn`；配
  `clearMocks: true` 做全局兜底。
- 进阶注意：`jest.mock` 的提升机制决定了它只能用字面量路径；假定时器是
  防抖/节流测试的标准答案；Mock 边界留在自己拥有的接口上，测行为不测
  实现细节——替身类型的理论框架见「测试替身」。
