---
order: 68
title: 测试与调试
module: harmonyos
category: HarmonyOS
difficulty: intermediate
description: 单元测试、UI 测试、断言理论、调试器原理与性能剖析的形式化方法与工程实践
author: fanquanpp
updated: '2026-07-21'
related:
  - harmonyos/性能优化
  - harmonyos/应用签名与发布
  - harmonyos/Stage模型与FA模型区别
  - harmonyos/国际化与无障碍
prerequisites:
  - harmonyos/概述与环境搭建
---

## 概述

测试与调试是软件工程的两面盾牌：前者在变更发生时守护既有行为的稳定性，后者在行为偏离预期时定位根本原因。HarmonyOS 提供了完整的测试金字塔（Test Pyramid）支持：底层是基于 Jest 的 `@ohos/hypium` 单元测试框架，中层是基于 `@ohos/uitest` 的 UI 自动化测试，顶层是 `DevEco Profiler` 与 `hilog` 日志体系构成的运行时观测能力。这套体系借鉴了 JUnit、Espresso、XCTest 等成熟框架的设计哲学，并在此基础上针对 ArkUI 的声明式渲染模型做了适配。

为什么需要测试？一个没有测试覆盖的代码库就像在薄冰上疾驰——任何一次重构都可能引发不可预知的回归。测试用例是代码的"安全网"，让开发者有信心进行大规模重构与功能迭代。研究表明，Google 内部代码库中测试覆盖率每提升 10%，线上缺陷率平均下降 6.4%（Empirical Software Engineering 2022 年研究）。

为什么需要调试？当应用行为与预期不符，开发者需要快速锁定根因。调试器（Debugger）提供了断点、变量观察、调用栈分析等能力，使程序执行可被暂停、检查、单步推进。HarmonyOS 的 DevEco Studio 集成了基于 DAP（Debug Adapter Protocol）的调试器，支持 ArkTS/JS/C++ 多语言混合调试。

## 学习目标

本章节基于 Bloom 分类法分层设计学习目标。

### 记忆层（Remember）

- 能够列举测试金字塔的三层结构（单元测试、集成测试、端到端测试）
- 能够复述 Jest/Hypium 的核心 API（`describe`、`it`、`expect`、`beforeEach`）
- 能够回忆 hilog 日志的五个级别（debug、info、warn、error、fatal）

### 理解层（Understand）

- 能够解释断言（Assertion）与异常（Exception）的本质差异
- 能够阐述测试用例独立性原则（FIRST 原则中的 I）
- 能够说明 DAP（Debug Adapter Protocol）调试器的工作原理

### 应用层（Apply）

- 能够为 ArkTS 函数编写参数化单元测试
- 能够使用 Mock 框架隔离被测代码的依赖
- 能够在 DevEco Studio 中设置条件断点、日志断点

### 分析层（Analyze）

- 能够分解测试用例的 AAA 结构（Arrange-Act-Assert）
- 能够分析覆盖率报告中"已覆盖但无断言"的伪测试用例
- 能够剖析 ArkUI 组件渲染管线，定位渲染热点

### 评价层（Evaluate）

- 能够评估单元测试套件的健壮性（brittleness）与可维护性
- 能够评判 Mock 滥用对测试可信度的损害
- 能够选择合适的性能剖析策略（采样 vs 插桩）

### 创造层（Create）

- 能够设计一个测试覆盖率门禁流水线（CI Gate）
- 能够构建领域特定的断言库（Domain-Specific Assertion Library）
- 能够组合 hilog、Profiler、Sentry 构建生产级可观测性体系

## 历史动机与背景

### 测试的演化脉络

软件测试的思想可追溯至 1951 年 Maurice Wilkes 的回忆："我必须痛苦地承认，编写程序的全部困难在于调试。"1957 年 Dijkstra 在《Numerische Mathematik》中提出"测试是为了发现错误而执行程序"的论断，确立了测试的破坏性目的观。

1970 年代，结构化测试兴起：1972 年 Hetzel 召开第一次软件测试方法学会议，定义了"测试用例"的概念；1975 年 Goodhart 与 Weyuker 各自独立提出等价类划分（Equivalence Partitioning）与边界值分析（Boundary Value Analysis）。

1990 年代，自动化测试框架成熟。Kent Beck 于 1994 年发明 SUnit（Smalltalk），1997 年与 Erich Gamma 共同将其移植为 JUnit，奠定了 xUnit 家族。2000 年 Beck 在《Test-Driven Development》中提出 TDD（测试驱动开发）。

2010 年代，移动端测试框架兴起：Android Espresso（2013）、iOS XCTest（2014）。HarmonyOS 的 `@ohos/hypium`（2021）借鉴了 Jest 的 API 风格与 xUnit 的生命周期模型。

### 调试的演化脉络

调试（Debugging）一词源于 1947 年 Grace Hopper 在 Mark II 计算机的继电器中发现了一只飞蛾，她在日志中写道"First actual case of bug being found"。1970 年代出现了第一个交互式调试器 `dbx`（Unix），它支持断点、单步执行、变量观察。

2000 年代，Microsoft 推出 DAP（Debug Adapter Protocol），将调试器与编辑器解耦，使 VS Code、Vim、Emacs 可以共用同一套调试后端。HarmonyOS 的 DevEco Studio 基于 IntelliJ 平台，使用 Kotlin 实现的调试后端通过 JDWP（Java Debug Wire Protocol）与 DAP 双协议接入 ArkTS 运行时。

### 设计哲学

HarmonyOS 测试体系遵循三项设计哲学：

1. **金字塔优先（Pyramid First）**：鼓励底层单元测试占比最高（约 70%），中层集成测试次之（20%），顶层 UI 测试最少（10%）。这与 Mike Cohn 在《Succeeding with Agile》中提出的经典比例一致。

2. **声明式断言（Declarative Assertion）**：测试代码使用 `expect(x).toBe(y)` 而非 `assertEqual(x, y)`，强调"期望"而非"命令"，提升可读性。

3. **观测优先（Observability First）**：调试不是"修复"的同义词，而是"理解"的过程。HarmonyOS 通过 `hilog`、`HiTrace`、`Profiler` 三件套，构建从日志到追踪到剖析的完整观测栈。

## 基础概念

### 测试金字塔

测试金字塔（Test Pyramid）描述了不同粒度测试的数量分布：

```
       /\
      /UI\           10%  UI 测试（@ohos/uitest）
     /------\
    /Integ    \      20%  集成测试
   /-----------\
  /    Unit      \    70%  单元测试（@ohos/hypium）
 /-----------------\
```

底层单元测试运行快（毫秒级）、覆盖广；顶层 UI 测试运行慢（秒级）、覆盖窄。倒金字塔（UI 测试占多数）是反模式，会导致 CI 反馈缓慢。

### 测试用例的 AAA 结构

每个测试用例应遵循 AAA 结构：

- **Arrange**：准备测试前置条件（构造输入、Mock 依赖）
- **Act**：执行被测行为（调用被测函数）
- **Assert**：验证结果是否符合预期

```typescript
it('应该正确计算两数之和', () => {
  // Arrange - 准备
  const a = 2;
  const b = 3;
  // Act - 执行
  const result = add(a, b);
  // Assert - 断言
  expect(result).toBe(5);
});
```

### FIRST 原则

优秀的测试应满足 FIRST 五原则：

- **Fast**：快速（毫秒级，不依赖 IO）
- **Isolated**：隔离（不依赖其他测试的执行顺序或状态）
- **Repeatable**：可重复（任意环境多次运行结果一致）
- **Self-Validating**：自验证（自动给出 pass/fail，不需人工判断）
- **Timely**：及时（在被测代码之前或同时编写，而非事后补）

### 断言与异常的本质差异

断言（Assertion）是测试代码中的验证语句，失败时抛出 `AssertionError`；异常（Exception）是被测代码中的错误信号，表示"未预期的状态"。

测试用例应当：
- 主动使用断言验证"预期行为"
- 对被测代码应抛出的异常使用 `toThrow()` 断言
- 不应将异常被捕获视为"测试通过"——异常未被预期就是失败

### DAP 调试协议

DevEco Studio 调试器基于 DAP（Debug Adapter Protocol）：

```
DevEco Studio  <-->  DAP  <-->  ArkTS Debugger  <-->  ArkTS Runtime
   (UI)         JSON-RPC    (Kotlin)               (C++/JS Engine)
```

DAP 使用 JSON-RPC 2.0 在编辑器与调试后端之间传递事件（`stopped`、`output`、`breakpoint`）与请求（`stackTrace`、`variables`、`continue`）。

### hilog 日志体系

HarmonyOS 的统一日志接口 `@ohos.hilog`：

- **domain**：日志域（16 进制标识业务模块，如 `0x0001`）
- **tag**：标签（字符串，用于过滤）
- **level**：级别（debug < info < warn < error < fatal）
- **format**：格式字符串，`%{public}s` 公开输出，`%{private}s` 私有脱敏

```typescript
hilog.info(0x0001, 'MyApp', '用户 %{public}s 登录成功', username);
hilog.error(0x0001, 'MyApp', '请求失败，原因 %{private}s', errorMsg);
```

## 形式化定义

### 测试用例的形式化定义

一个测试用例是一个四元组 $T = \langle P, S, A, \phi \rangle$，其中：

- $P$ 是前置条件（Precondition）集合，描述被测对象的初始状态
- $S$ 是输入序列（Input Sequence），$S = [s_1, s_2, \ldots, s_k]$
- $A$ 是预期行为（Action），即被调用的函数或方法
- $\phi$ 是验证谓词（Verification Predicate），$\phi: \text{Output} \to \{0, 1\}$

测试通过当且仅当 $\phi(A(P, S)) = 1$。

### 测试覆盖率的形式化定义

设程序 $P$ 的可执行路径集合为 $\Pi(P)$，测试套件 $T$ 覆盖的路径集合为 $\Pi_T(P)$，则覆盖率定义为：

$$
\text{Coverage}(T, P) = \frac{|\Pi_T(P)|}{|\Pi(P)|}
$$

实际工程中常用以下三种近似度量：

- **行覆盖率（Line Coverage）**：$\text{LCov} = \frac{\text{已执行行数}}{\text{可执行行总数}}$
- **分支覆盖率（Branch Coverage）**：$\text{BCov} = \frac{\text{已执行分支数}}{\text{分支总数}}$
- **MC/DC 覆盖率**：$\text{MCDC} = \frac{\text{满足 MC/DC 条件的判定数}}{\text{总判定数}}$

MC/DC（Modified Condition/Decision Coverage）要求"每个条件的取值独立影响判定结果"，是航空软件 DO-178C 标准的强制要求。

### 断言强度的形式化

断言强度 $S(\phi)$ 度量一个断言的"严格性"：

$$
S(\phi) = -\log_2 \frac{|\{x : \phi(x) = 1\}|}{|\text{Output Domain}|}
```

例如：
- `expect(result).toBeDefined()` 的强度 $S \approx 0$（几乎所有值都通过）
- `expect(result).toBe(42)` 的强度 $S \approx \log_2(\text{Domain Size})$（仅一个值通过）

强度越高，断言越能发现回归。强度为 0 的断言（如 `expect(result).toBeTruthy()` 对非空对象）等价于无断言。

### Mock 替换的形式化

设被测单元 $U$ 依赖 $D = \{d_1, d_2, \ldots, d_n\}$，Mock 操作 $M: D \to D'$ 将每个真实依赖替换为模拟实现。测试执行的可信度定义为：

$$
\text{Confidence}(U, M) = \frac{\sum_{i=1}^{n} \text{Fidelity}(M(d_i), d_i) \cdot w_i}{\sum_{i=1}^{n} w_i}
$$

其中 $\text{Fidelity}(M(d_i), d_i) \in [0, 1]$ 表示 Mock 与真实实现的行为一致度，$w_i$ 是依赖的权重。当所有 Mock 的 Fidelity 都接近 1 时，测试可信度接近 1；当任一 Mock 与真实实现行为偏离时，可信度急剧下降。

### 调试断点的形式化

断点 $B = \langle l, c, \psi, a \rangle$，其中：

- $l$ 是源码位置（文件 + 行号）
- $c$ 是条件（可选的条件表达式）
- $\psi$ 是触发谓词（如"命中次数模 5 等于 0"）
- $a$ 是动作（暂停、记录日志、继续执行）

调试器在每个语句执行前求值 $\psi(l)$，若为真则触发 $a$。日志断点（Logpoint）的 $a$ 是"输出表达式值后继续执行"，不暂停。

## 理论推导

### 定理 1：测试不可证明程序无错

**定理**（Dijkstra, 1969）：测试只能证明程序中存在错误，不能证明程序无错误。

**证明**：设程序 $P$ 的输入空间为 $\mathcal{I}$，测试套件 $T \subseteq \mathcal{I}$。程序在输入 $i$ 上的行为记为 $P(i)$，期望行为记为 $\text{Spec}(i)$。

程序正确当且仅当 $\forall i \in \mathcal{I}: P(i) = \text{Spec}(i)$。

测试套件 $T$ 验证的是 $\forall i \in T: P(i) = \text{Spec}(i)$。

由于 $\mathcal{I}$ 通常是无穷集（如所有可能的字符串输入），而 $T$ 是有限集，$|T| < \infty$，因此 $T$ 的验证无法覆盖 $\mathcal{I} \setminus T$ 的元素。除非 $\mathcal{I}$ 有限且 $T = \mathcal{I}$，否则无法通过测试证明程序正确。

**推论**：形式化验证（Model Checking、Theorem Proving）是证明程序无错的唯一途径，但代价高昂，仅用于关键场景。

### 定理 2：等价类划分的完备性

**引理**：设被测函数 $f: \mathcal{I} \to \mathcal{O}$，若存在等价关系 $\sim$ 使得 $\forall i_1, i_2 \in \mathcal{I}: i_1 \sim i_2 \Rightarrow f(i_1) = f(i_2)$，则从每个等价类中取一个代表元构成的测试集 $T$ 即可覆盖 $f$ 的所有行为。

**证明**：

任取 $i \in \mathcal{I}$，存在等价类 $[i]$ 与代表元 $t_i \in T \cap [i]$。由等价关系定义，$i \sim t_i$，故 $f(i) = f(t_i)$。

测试用例 $\langle t_i, f(t_i) \rangle$ 验证了 $f$ 在 $t_i$ 上的行为，等价于验证了 $f$ 在整个等价类 $[i]$ 上的行为。

因此 $T$ 覆盖了所有等价类，即覆盖了 $\mathcal{I}$ 上 $f$ 的所有可能行为。$\square$

**实践意义**：等价类划分将无穷输入空间压缩为有限测试集，是测试用例设计的理论基础。

### 定理 3：Mock 可信度的传递性

**定理**：若 Mock $M(d)$ 与真实实现 $d$ 的行为一致度为 $\text{Fidelity}(M, d) = p$，则使用 $M$ 替代 $d$ 的单元测试 $U$ 通过的概率为 $P(U \text{ passes} | d) \cdot p + P(U \text{ fails} | d) \cdot (1 - p)$。

**证明**：

设 $U$ 在使用真实 $d$ 时通过的概率为 $q = P(U \text{ passes} | d)$。

当 $M$ 与 $d$ 行为一致（概率 $p$）时，$U$ 通过的概率为 $q$。

当 $M$ 与 $d$ 行为不一致（概率 $1 - p$）时，$U$ 可能误通过（false positive）或误失败（false negative）。设误通过概率为 $\alpha$，误失败概率为 $\beta$，则 $\alpha + \beta \leq 1$。

总通过概率：
$$
P(U \text{ passes} | M) = p \cdot q + (1-p) \cdot \alpha
$$

当 $p = 1$（Mock 完美一致）时，$P(U \text{ passes} | M) = q$，与真实测试等价。

当 $p = 0$（Mock 完全偏离）时，$P(U \text{ passes} | M) = \alpha$，仅依赖偶然性。

**实践意义**：Mock 必须以契约测试（Contract Test）保证其与真实实现的行为一致，否则单元测试的可信度将急剧下降。

## 代码示例

### 示例 1：基础单元测试

```typescript
// 文件：src/main/ets/utils/Calculator.ets
// 计算器工具类，演示单元测试覆盖

/**
 * 加法运算
 * @param a 第一个操作数
 * @param b 第二个操作数
 * @returns 两数之和
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * 减法运算
 * @param a 被减数
 * @param b 减数
 * @returns 两数之差
 */
export function subtract(a: number, b: number): number {
  return a - b;
}

/**
 * 乘法运算
 * @param a 第一个操作数
 * @param b 第二个操作数
 * @returns 两数之积
 */
export function multiply(a: number, b: number): number {
  return a * b;
}

/**
 * 除法运算
 * @param a 被除数
 * @param b 除数
 * @returns 两数之商
 * @throws Error 当除数为零时抛出异常
 */
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('除数不能为零');
  }
  return a / b;
}
```

```typescript
// 文件：src/test/ets/utils/Calculator.test.ets
// 计算器单元测试，使用 @ohos/hypium 框架

import { describe, it, expect } from '@ohos/hypium';
import { add, subtract, multiply, divide } from '../../../main/ets/utils/Calculator';

export default function calculatorTest() {
  // describe 用于将相关测试用例分组
  describe('Calculator', () => {
    // 测试加法的正向用例
    it('add 应返回两数之和', 0, () => {
      expect(add(1, 2)).assertEqual(3);
      expect(add(-1, 1)).assertEqual(0);
      expect(add(0, 0)).assertEqual(0);
      expect(add(100, 200)).assertEqual(300);
    });

    // 测试加法的边界值
    it('add 应处理大数与小数', 0, () => {
      expect(add(Number.MAX_SAFE_INTEGER, 0)).assertEqual(Number.MAX_SAFE_INTEGER);
      expect(add(0.1, 0.2)).assertCloseTo(0.3, 1e-10);
    });

    // 测试减法
    it('subtract 应返回两数之差', 0, () => {
      expect(subtract(5, 3)).assertEqual(2);
      expect(subtract(3, 5)).assertEqual(-2);
    });

    // 测试乘法
    it('multiply 应返回两数之积', 0, () => {
      expect(multiply(2, 3)).assertEqual(6);
      expect(multiply(-2, 3)).assertEqual(-6);
      expect(multiply(0, 100)).assertEqual(0);
    });

    // 测试除法正向用例
    it('divide 应返回两数之商', 0, () => {
      expect(divide(6, 3)).assertEqual(2);
      expect(divide(7, 2)).assertCloseTo(3.5, 1e-10);
    });

    // 测试除数为零的异常用例
    it('divide 在除数为零时应抛出异常', 0, () => {
      expect(() => divide(1, 0)).assertThrow('除数不能为零');
    });
  });
}
```

### 示例 2：参数化测试（等价类划分）

```typescript
// 文件：src/test/ets/utils/CalculatorParamTest.test.ets
// 参数化测试：使用等价类划分与边界值分析设计测试用例

import { describe, it, expect } from '@ohos/hypium';
import { add, divide } from '../../../main/ets/utils/Calculator';

// 等价类划分：正数、负数、零
// 边界值：MAX_SAFE_INTEGER、MIN_SAFE_INTEGER、NaN
interface AddTestCase {
  a: number;
  b: number;
  expected: number;
  description: string;
}

const addTestCases: AddTestCase[] = [
  // 正数等价类
  { a: 1, b: 2, expected: 3, description: '两个正整数' },
  { a: 100, b: 200, expected: 300, description: '两个较大正整数' },
  // 负数等价类
  { a: -1, b: -2, expected: -3, description: '两个负整数' },
  { a: -100, b: -200, expected: -300, description: '两个较大负整数' },
  // 零等价类
  { a: 0, b: 0, expected: 0, description: '两个零' },
  { a: 0, b: 5, expected: 5, description: '零与正数' },
  { a: 0, b: -5, expected: -5, description: '零与负数' },
  // 混合等价类
  { a: 5, b: -5, expected: 0, description: '正数与负数相消' },
  // 边界值
  { a: Number.MAX_SAFE_INTEGER, b: 0, expected: Number.MAX_SAFE_INTEGER, description: '最大安全整数加零' },
  { a: Number.MIN_SAFE_INTEGER, b: 0, expected: Number.MIN_SAFE_INTEGER, description: '最小安全整数加零' },
];

export default function calculatorParamTest() {
  describe('Calculator 参数化测试', () => {
    // 使用 forEach 遍历测试数据，每个用例独立运行
    addTestCases.forEach(({ a, b, expected, description }) => {
      it(`add(${a}, ${b}) 应等于 ${expected} [${description}]`, 0, () => {
        expect(add(a, b)).assertEqual(expected);
      });
    });

    // 浮点数除法的边界值
    it('divide(0.3, 0.1) 应近似等于 3', 0, () => {
      // 浮点数无法精确表示 0.1，使用近似比较
      expect(divide(0.3, 0.1)).assertCloseTo(3, 1e-10);
    });
  });
}
```

### 示例 3：测试生命周期与共享夹具

```typescript
// 文件：src/test/ets/utils/UserRepository.test.ets
// 测试生命周期与共享夹具（Test Fixture）演示

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@ohos/hypium';
import { UserRepository } from '../../../main/ets/data/UserRepository';
import { DatabaseHelper } from '../../../main/ets/data/DatabaseHelper';

export default function userRepositoryTest() {
  describe('UserRepository 生命周期', () => {
    let repo: UserRepository;
    let dbHelper: DatabaseHelper;

    // beforeAll 在所有用例之前执行一次，用于初始化共享资源
    beforeAll(() => {
      dbHelper = new DatabaseHelper(':memory:');  // 使用内存数据库，避免污染磁盘
      dbHelper.open();
    });

    // afterAll 在所有用例之后执行一次，用于释放共享资源
    afterAll(async () => {
      await dbHelper.close();
    });

    // beforeEach 在每个用例之前执行，确保用例独立性
    beforeEach(async () => {
      repo = new UserRepository(dbHelper);
      await dbHelper.clearTable('users');
    });

    // afterEach 在每个用例之后执行，做清理
    afterEach(async () => {
      // 重置 Mock 调用记录
    });

    it('新建用户应能被查询到', 0, async () => {
      // Arrange
      const user = { id: 1, name: '张三', age: 25 };
      // Act
      await repo.insert(user);
      // Assert
      const found = await repo.findById(1);
      expect(found).assertNotNull();
      expect(found.name).assertEqual('张三');
    });

    it('删除用户后应查询不到', 0, async () => {
      // Arrange
      const user = { id: 1, name: '李四', age: 30 };
      await repo.insert(user);
      // Act
      await repo.delete(1);
      // Assert
      const found = await repo.findById(1);
      expect(found).assertNull();
    });

    // 由于 beforeEach 重置了数据库，本用例不会受前面用例影响
    it('初始数据库应为空', 0, async () => {
      const all = await repo.findAll();
      expect(all.length).assertEqual(0);
    });
  });
}
```

### 示例 4：Mock 函数与依赖隔离

```typescript
// 文件：src/main/ets/services/UserService.ets
// 用户服务类，依赖 ApiClient

import { ApiClient, ApiResponse } from '../api/ApiClient';

/**
 * 用户服务，封装用户相关的业务逻辑
 */
export class UserService {
  private api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  /**
   * 根据 ID 获取用户信息
   * @param id 用户 ID
   * @returns 用户信息
   * @throws Error 当用户不存在或网络错误时
   */
  async getUser(id: number): Promise<User> {
    if (id <= 0) {
      throw new Error('用户 ID 必须为正整数');
    }
    const response: ApiResponse<User> = await this.api.get(`/users/${id}`);
    if (response.code !== 200) {
      throw new Error(`获取用户失败: ${response.message}`);
    }
    return response.data;
  }

  /**
   * 创建新用户
   * @param user 用户信息
   * @returns 新创建的用户（含分配的 ID）
   */
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const response: ApiResponse<User> = await this.api.post('/users', user);
    if (response.code !== 201) {
      throw new Error(`创建用户失败: ${response.message}`);
    }
    return response.data;
  }
}

interface User {
  id: number;
  name: string;
  email: string;
}
```

```typescript
// 文件：src/test/ets/services/UserService.test.ets
// UserService 单元测试，使用 Mock 隔离 ApiClient 依赖

import { describe, it, expect } from '@ohos/hypium';
import { UserService } from '../../../main/ets/services/UserService';

export default function userServiceTest() {
  describe('UserService', () => {
    it('getUser 应正确解析成功响应', 0, async () => {
      // Arrange - 构造 Mock ApiClient
      const mockApi = {
        get: (path: string) => Promise.resolve({
          code: 200,
          message: 'OK',
          data: { id: 1, name: '张三', email: 'zhang@example.com' },
        }),
        post: () => Promise.resolve({ code: 201, message: 'Created', data: {} as any }),
      };
      const service = new UserService(mockApi as any);

      // Act
      const user = await service.getUser(1);

      // Assert - 验证返回值
      expect(user.id).assertEqual(1);
      expect(user.name).assertEqual('张三');
    });

    it('getUser 在 ID 非正整数时应抛出异常', 0, async () => {
      const mockApi = { get: () => Promise.resolve({}), post: () => Promise.resolve({}) };
      const service = new UserService(mockApi as any);

      // 验证异常抛出
      expect(() => service.getUser(0)).assertThrow('用户 ID 必须为正整数');
      expect(() => service.getUser(-1)).assertThrow('用户 ID 必须为正整数');
    });

    it('getUser 在 API 返回错误码时应抛出异常', 0, async () => {
      const mockApi = {
        get: () => Promise.resolve({ code: 404, message: '用户不存在', data: null }),
        post: () => Promise.resolve({}),
      };
      const service = new UserService(mockApi as any);

      await service.getUser(999).then(
        () => { throw new Error('应抛出异常但未抛出'); },
        (err: Error) => {
          expect(err.message).assertEqual('获取用户失败: 用户不存在');
        }
      );
    });

    it('createUser 应正确构造请求体', 0, async () => {
      // 记录 Mock 被调用的参数
      let capturedPath: string;
      let capturedBody: any;
      const mockApi = {
        get: () => Promise.resolve({}),
        post: (path: string, body: any) => {
          capturedPath = path;
          capturedBody = body;
          return Promise.resolve({
            code: 201,
            message: 'Created',
            data: { id: 42, name: body.name, email: body.email },
          });
        },
      };
      const service = new UserService(mockApi as any);

      // Act
      const created = await service.createUser({ name: '王五', email: 'wang@example.com' });

      // Assert - 验证 Mock 被正确调用
      expect(capturedPath).assertEqual('/users');
      expect(capturedBody.name).assertEqual('王五');
      expect(capturedBody.email).assertEqual('wang@example.com');
      expect(created.id).assertEqual(42);
    });
  });
}
```

### 示例 5：UI 自动化测试

```typescript
// 文件：src/ohosTest/ets/LoginPage.test.ets
// 登录页面的 UI 自动化测试

import { describe, it, expect } from '@ohos/hypium';
import { UiDriver, UiComponent, BY } from '@ohos.uitest';

export default function loginPageUiTest() {
  describe('LoginPage UI 测试', () => {
    it('输入正确账号密码后应跳转到主页', 0, async () => {
      const driver = new UiDriver();

      // 等待登录页出现
      await driver.delayMs(500);

      // 定位用户名输入框并输入
      const usernameInput = await driver.findComponent(BY.id('username_input'));
      await usernameInput.setText('admin');

      // 定位密码输入框并输入
      const passwordInput = await driver.findComponent(BY.id('password_input'));
      await passwordInput.setText('123456');

      // 点击登录按钮
      const loginButton = await driver.findComponent(BY.id('login_button'));
      await loginButton.click();

      // 等待页面跳转
      await driver.delayMs(1000);

      // 验证主页标题出现
      const homeTitle = await driver.findComponent(BY.id('home_title'));
      expect(homeTitle).assertNotNull();

      // 验证标题文本
      const text = await homeTitle.getText();
      expect(text).assertEqual('欢迎使用');
    });

    it('输入错误密码应显示错误提示', 0, async () => {
      const driver = new UiDriver();

      const usernameInput = await driver.findComponent(BY.id('username_input'));
      await usernameInput.setText('admin');

      const passwordInput = await driver.findComponent(BY.id('password_input'));
      await passwordInput.setText('wrong_password');

      const loginButton = await driver.findComponent(BY.id('login_button'));
      await loginButton.click();

      await driver.delayMs(500);

      // 验证错误提示出现
      const errorMsg = await driver.findComponent(BY.id('error_message'));
      expect(errorMsg).assertNotNull();
      const text = await errorMsg.getText();
      expect(text).assertContain('密码错误');
    });
  });
}
```

### 示例 6：hilog 日志调试

```typescript
// 文件：src/main/ets/utils/Logger.ets
// 统一日志封装，规范日志输出

import hilog from '@ohos.hilog';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'D',
  INFO = 'I',
  WARN = 'W',
  ERROR = 'E',
  FATAL = 'F',
}

/**
 * 统一日志封装
 * - 生产环境关闭 DEBUG 级别
 * - 敏感字段自动脱敏
 */
export class Logger {
  private static readonly DOMAIN = 0x0001;
  private static readonly TAG = 'FandexApp';
  private static isProduction: boolean = false;

  /**
   * 设置运行环境
   * @param isProd 是否为生产环境
   */
  static setEnvironment(isProd: boolean): void {
    Logger.isProduction = isProd;
  }

  /**
   * 输出 DEBUG 级别日志
   * @param tag 子标签
   * @param format 格式字符串
   * @param args 参数
   */
  static debug(tag: string, format: string, ...args: Object[]): void {
    if (Logger.isProduction) {
      return;  // 生产环境不输出 DEBUG 日志
    }
    hilog.debug(Logger.DOMAIN, `${Logger.TAG}.${tag}`, format, ...args);
  }

  /**
   * 输出 INFO 级别日志
   */
  static info(tag: string, format: string, ...args: Object[]): void {
    hilog.info(Logger.DOMAIN, `${Logger.TAG}.${tag}`, format, ...args);
  }

  /**
   * 输出 WARN 级别日志
   */
  static warn(tag: string, format: string, ...args: Object[]): void {
    hilog.warn(Logger.DOMAIN, `${Logger.TAG}.${tag}`, format, ...args);
  }

  /**
   * 输出 ERROR 级别日志
   */
  static error(tag: string, format: string, ...args: Object[]): void {
    hilog.error(Logger.DOMAIN, `${Logger.TAG}.${tag}`, format, ...args);
  }

  /**
   * 输出网络请求日志（自动脱敏 Authorization 头）
   */
  static networkRequest(method: string, url: string, headers: Record<string, string>): void {
    // 脱敏 Authorization 头
    const safeHeaders: Record<string, string> = {};
    Object.keys(headers).forEach(key => {
      if (key.toLowerCase() === 'authorization') {
        safeHeaders[key] = '***REDACTED***';
      } else {
        safeHeaders[key] = headers[key];
      }
    });
    Logger.info('Network', `请求 %{public}s %{public}s, headers: %{public}s`,
      method, url, JSON.stringify(safeHeaders));
  }
}
```

### 示例 7：HiTrace 分布式追踪

```typescript
// 文件：src/main/ets/services/OrderService.ets
// 订单服务，使用 HiTrace 进行分布式追踪

import { HiTrace } from '@ohos.hicollie';

export class OrderService {
  /**
   * 下单流程：创建订单 -> 扣减库存 -> 支付 -> 通知
   */
  static async placeOrder(userId: number, productId: number, quantity: number): Promise<OrderId> {
    // 开启追踪，所有子调用都会被关联
    const trace = HiTrace.begin('placeOrder', `userId=${userId}, productId=${productId}`);

    try {
      HiTrace.info(trace, '开始创建订单');
      const orderId = await OrderService.createOrder(userId, productId, quantity);

      HiTrace.info(trace, '开始扣减库存');
      await InventoryService.deduct(productId, quantity);

      HiTrace.info(trace, '开始支付');
      await PaymentService.charge(orderId);

      HiTrace.info(trace, '订单完成');
      return orderId;
    } catch (error) {
      HiTrace.error(trace, `下单失败: ${error}`);
      throw error;
    } finally {
      HiTrace.end(trace);
    }
  }

  private static async createOrder(userId: number, productId: number, quantity: number): Promise<OrderId> {
    // 创建订单的具体逻辑
    return Math.floor(Math.random() * 1000000);
  }
}

type OrderId = number;
```

### 示例 8：断点调试与条件断点

```typescript
// 文件：src/main/ets/utils/DataProcessor.ets
// 数据处理工具，演示调试场景

export class DataProcessor {
  /**
   * 过滤并转换数据列表
   * @param data 原始数据
   * @param filterFn 过滤函数
   * @param transformFn 转换函数
   */
  static filterAndTransform<T, R>(
    data: T[],
    filterFn: (item: T) => boolean,
    transformFn: (item: T) => R,
  ): R[] {
    const result: R[] = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      // 在此处设置条件断点：i === 42 || filterFn(item) === false
      // 可定位"为什么第 42 项被过滤掉"的问题
      if (filterFn(item)) {
        const transformed = transformFn(item);
        result.push(transformed);
      }
    }
    return result;
  }

  /**
   * 递归计算斐波那契数
   * 调试时可在 return 语句设置断点，查看调用栈深度
   */
  static fibonacci(n: number): number {
    if (n <= 1) {
      return n;
    }
    return DataProcessor.fibonacci(n - 1) + DataProcessor.fibonacci(n - 2);
  }
}
```

## 对比分析

### 测试框架对比

| 特性 | @ohos/hypium | Jest | Mocha | JUnit 5 | XCTest |
|------|-------------|------|-------|---------|--------|
| 语言 | TypeScript | JavaScript | JavaScript | Java/Kotlin | Swift |
| 断言风格 | `expect(x).assertEqual(y)` | `expect(x).toBe(y)` | `assert.equal(x, y)` | `assertEquals(x, y)` | `XCTAssertEqual(x, y)` |
| Mock 内置 | 否（需手动） | 是（jest.fn()） | 否（需 sinon） | 是（Mockito） | 否（需手动） |
| 参数化 | 手动 forEach | `it.each` | 无 | `@ParameterizedTest` | 无 |
| 异步支持 | Promise | Promise/async | callback/Promise | CompletableFuture | async/await |
| 覆盖率 | hvigor --coverage | istanbul | nyc | JaCoCo | Slather |
| 快照测试 | 否 | 是 | 否 | 否 | 否 |
| 平台 | HarmonyOS | Node.js | Node.js | JVM | iOS/macOS |

### 调试器对比

| 特性 | DevEco Studio Debugger | VS Code Debugger | Xcode LLDB | Android Studio Debugger |
|------|----------------------|-----------------|-----------|------------------------|
| 协议 | DAP | DAP | LLDB MI | JDWP |
| 条件断点 | 支持 | 支持 | 支持 | 支持 |
| 日志断点 | 支持 | 支持 | 支持 | 支持 |
| 表达式求值 | 支持 | 支持 | 支持 | 支持 |
| 内存检查 | Profiler 集成 | 无 | Instruments | Memory Profiler |
| 多线程查看 | 支持 | 支持 | 支持 | 支持 |
| 远程调试 | 支持（无线） | 支持 | 支持 | 支持（adb） |

### 日志框架对比

| 特性 | hilog | NSLog | Log | console.log |
|------|-------|-------|-----|-------------|
| 级别 | 5 级 | 7 级 | 6 级 | 5 级 |
| 域过滤 | 支持（domain） | 不支持 | 支持（tag） | 不支持 |
| 脱敏 | `%{private}s` | 不支持 | 不支持 | 不支持 |
| 异步写入 | 是 | 否 | 是 | 否 |
| 持久化 | 是（hilogd 守护） | 是 | 是 | 否 |

## 常见陷阱

### 陷阱 1：测试用例相互依赖

**反模式**：

```typescript
// 错误：用例 B 依赖用例 A 创建的状态
describe('UserRepository', () => {
  let userId: number;

  it('A 创建用户', async () => {
    userId = await repo.create({ name: '张三' });
  });

  it('B 查询用户', async () => {
    // 如果用例 A 失败或未执行，用例 B 也会失败
    const user = await repo.findById(userId);
    expect(user).assertNotNull();
  });
});
```

**正确做法**：每个用例自行准备数据，或使用 `beforeEach` 重置状态。

### 陷阱 2：断言强度过低

**反模式**：

```typescript
it('getUser 应返回用户', async () => {
  const user = await service.getUser(1);
  // 仅断言"非空"，未验证字段值
  expect(user).assertNotNull();
});
```

**正确做法**：断言所有关键字段。

```typescript
it('getUser 应返回完整用户信息', async () => {
  const user = await service.getUser(1);
  expect(user).assertNotNull();
  expect(user.id).assertEqual(1);
  expect(user.name).assertEqual('张三');
  expect(user.email).assertContain('@');
});
```

### 陷阱 3：Mock 滥用导致契约偏离

**反模式**：

```typescript
// 错误：Mock 的行为与真实 API 不一致
const mockApi = {
  get: () => Promise.resolve({ code: 200, data: { id: 1 } }),
};
// 真实 API 返回 { code: 200, message: 'OK', data: { id: 1, name: '张三' } }
// Mock 缺少 message 字段，被测代码若依赖 message 会误报通过
```

**正确做法**：使用契约测试（Contract Test）验证 Mock 与真实 API 的一致性。

### 陷阱 4：在测试中使用真实 IO

**反模式**：

```typescript
it('读取配置文件', () => {
  // 真实读取文件，导致测试依赖文件系统
  const config = fs.readFileSync('/etc/app/config.json');
  expect(config.timeout).assertEqual(3000);
});
```

**正确做法**：使用依赖注入，传入 Mock 数据。

### 陷阱 5：日志泄露敏感信息

**反模式**：

```typescript
hilog.info(0x0001, 'MyApp', '用户登录: token=%s', token);
// token 被明文写入日志，可能被攻击者获取
```

**正确做法**：使用 `%{private}s` 标记敏感字段。

```typescript
hilog.info(0x0001, 'MyApp', '用户登录: token=%{private}s', token);
```

### 陷阱 6：覆盖率指标误用

**反模式**：

```typescript
it('调用了函数', () => {
  // 仅调用未断言，覆盖率提升但无实际验证
  service.processData(data);
});
```

**正确做法**：覆盖率高 ≠ 测试质量高，需结合变异测试（Mutation Testing）评估测试强度。

### 陷阱 7：异步测试未等待 Promise

**反模式**：

```typescript
it('异步获取数据', () => {
  // 未 await，测试在 Promise resolve 之前就结束了
  service.getData().then(data => {
    expect(data).assertNotNull();
  });
});
```

**正确做法**：

```typescript
it('异步获取数据', async () => {
  const data = await service.getData();
  expect(data).assertNotNull();
});
```

### 陷阱 8：调试模式下评估性能

**反模式**：

```typescript
// Debug 模式下断点会大幅拖慢执行，性能数据无效
const start = Date.now();
service.heavyComputation();
const elapsed = Date.now() - start;
console.log(`耗时: ${elapsed}ms`);  // 数值偏大
```

**正确做法**：使用 Release 模式构建，配合 Profiler 进行性能剖析。

## 工程实践

### 实践 1：测试目录组织

```
src/
├── main/ets/                       # 生产代码
│   ├── utils/
│   │   └── Calculator.ets
│   ├── services/
│   │   └── UserService.ets
│   └── data/
│       └── UserRepository.ets
├── test/ets/                       # 单元测试
│   ├── utils/
│   │   └── Calculator.test.ets
│   ├── services/
│   │   └── UserService.test.ets
│   └── data/
│       └── UserRepository.test.ets
└── ohosTest/ets/                   # UI 与集成测试
    └── pages/
        └── LoginPage.test.ets
```

### 实践 2：CI 门禁配置

```yaml
# 文件：.ci/harmonyos-test.yml
# CI 测试门禁配置
stages:
  - name: lint
    script: hvigorw lint
  - name: type-check
    script: hvigorw typeCheck
  - name: unit-test
    script: hvigorw test --coverage
    coverage:
      minimum: 70         # 行覆盖率门禁 70%
      branches: 60         # 分支覆盖率门禁 60%
  - name: ui-test
    script: hvigorw uitest
    needs: [unit-test]
  - name: build
    script: hvigorw assembleHap
    needs: [unit-test, ui-test]
```

### 实践 3：测试代码评审清单

```markdown
## 测试代码评审清单
- [ ] 测试用例命名清晰描述意图（"应该...当..."）
- [ ] 每个用例仅验证一个行为
- [ ] Arrange-Act-Assert 结构清晰
- [ ] 断言强度足够（避免仅 assertNotNull）
- [ ] 无用例间依赖（满足 FIRST 的 I）
- [ ] Mock 仅隔离外部依赖，不隔离被测代码内部
- [ ] 异步用例正确 await
- [ ] 测试数据使用工厂函数构造，避免重复
- [ ] 测试运行时间 < 1 秒（单元测试）
- [ ] 覆盖率报告无"已调用但无断言"的伪覆盖
```

### 实践 4：日志分级策略

```typescript
// 文件：src/main/ets/config/LoggingConfig.ets
// 日志分级策略配置

export class LoggingConfig {
  /**
   * 根据环境返回日志级别
   * - 开发：DEBUG 及以上
   * - 测试：INFO 及以上
   * - 生产：WARN 及以上
   */
  static getMinLevel(env: 'dev' | 'test' | 'prod'): LogLevel {
    const levelMap: Record<string, LogLevel> = {
      'dev': LogLevel.DEBUG,
      'test': LogLevel.INFO,
      'prod': LogLevel.WARN,
    };
    return levelMap[env] ?? LogLevel.INFO;
  }

  /**
   * 敏感字段黑名单
   */
  static readonly SENSITIVE_KEYS: string[] = [
    'password',
    'token',
    'secret',
    'apiKey',
    'creditCard',
    'idCard',
  ];

  /**
   * 自动脱敏对象中的敏感字段
   */
  static sanitize(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
      if (LoggingConfig.SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
        result[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        result[key] = LoggingConfig.sanitize(obj[key]);
      } else {
        result[key] = obj[key];
      }
    });
    return result;
  }
}
```

### 实践 5：DevEco Profiler 使用流程

```
1. 启动剖析
   View -> Tool Windows -> Profiler -> 点击录制

2. 选择分析类型
   - CPU：函数调用树（Call Tree）、火焰图（Flame Graph）
   - Memory：堆快照（Heap Snapshot）、分配追踪（Allocation Tracking）
   - Network：请求时间线、响应大小

3. 复现场景
   在应用中操作，复现性能问题

4. 停止录制
   分析热点函数

5. 定位瓶颈
   - 火焰图：宽度最宽的函数是热点
   - 调用树：cumulative time 最高的分支
   - 内存：持续增长的对象是泄漏候选

6. 优化验证
   修复后重新剖析，对比前后数据
```

## 案例研究

### 案例：电商应用下单流程的测试与调试

**场景**：某电商应用的"下单"流程偶发性失败，部分用户点击下单后无响应。需要通过系统化的测试与调试定位根因。

#### 步骤 1：复现问题

使用 UI 测试复现：

```typescript
it('下单流程应在 3 秒内完成', 0, async () => {
  const driver = new UiDriver();

  // 进入商品详情
  await driver.findComponent(BY.id('product_1')).click();
  await driver.delayMs(300);

  // 点击立即购买
  await driver.findComponent(BY.id('buy_now')).click();

  // 验证订单创建页出现
  const orderPage = await driver.findComponent(BY.id('order_create_page'));
  expect(orderPage).assertNotNull();

  // 点击提交订单
  await driver.findComponent(BY.id('submit_order')).click();

  // 等待结果（设置 5 秒超时）
  await driver.delayMs(5000);

  // 验证成功提示出现
  const success = await driver.findComponent(BY.id('order_success'));
  expect(success).assertNotNull();
});
```

#### 步骤 2：日志分析

添加 HiTrace 追踪：

```typescript
export class OrderFlow {
  static async placeOrder(userId: number, productId: number): Promise<void> {
    const trace = HiTrace.begin('placeOrder', `user=${userId}, product=${productId}`);

    try {
      HiTrace.info(trace, '1. 检查库存');
      const stock = await InventoryApi.check(productId);
      if (stock <= 0) {
        throw new Error('库存不足');
      }

      HiTrace.info(trace, '2. 创建订单');
      const orderId = await OrderApi.create(userId, productId);

      HiTrace.info(trace, '3. 调起支付');
      await PaymentApi.charge(orderId);

      HiTrace.info(trace, '4. 通知成功');
    } catch (error) {
      HiTrace.error(trace, `下单失败: ${error}`);
      throw error;
    } finally {
      HiTrace.end(trace);
    }
  }
}
```

#### 步骤 3：定位根因

通过日志发现：偶发失败发生在"步骤 3 调起支付"，错误信息为"支付服务超时"。

进一步调试支付服务的网络请求：

```typescript
async function chargePayment(orderId: number): Promise<void> {
  const httpRequest = http.createHttp();
  try {
    hilog.info(0x0001, 'Payment', '支付请求开始, orderId=%{public}d', orderId);
    const start = Date.now();

    const response = await httpRequest.request('https://api.payment.com/charge', {
      method: http.RequestMethod.POST,
      header: { 'Content-Type': 'application/json' },
      extraData: { orderId },
      connectTimeout: 5000,
      readTimeout: 10000,
    });

    const elapsed = Date.now() - start;
    hilog.info(0x0001, 'Payment', '支付响应: code=%{public}d, 耗时=%{public}dms',
      response.responseCode, elapsed);

    if (response.responseCode !== 200) {
      throw new Error(`支付失败: ${response.responseCode}`);
    }
  } catch (error) {
    hilog.error(0x0001, 'Payment', '支付异常: %{public}s', error.message);
    throw error;
  } finally {
    httpRequest.destroy();
  }
}
```

#### 步骤 4：使用调试器深入分析

在 `httpRequest.request` 处设置条件断点：`orderId === 12345`（失败订单），运行应用复现问题。在断点处检查：
- 请求头是否完整
- 网络连接是否建立
- 服务器响应时间

发现：响应时间在弱网下超过 10 秒，触发 `readTimeout`。

#### 步骤 5：修复与回归测试

```typescript
// 修复：增加重试与超时配置
async function chargePaymentWithRetry(orderId: number, maxRetries = 3): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await chargePayment(orderId);
      return;
    } catch (error) {
      lastError = error as Error;
      hilog.warn(0x0001, 'Payment', '第 %{public}d 次重试, orderId=%{public}d',
        attempt, orderId);
      // 指数退避
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastError;
}
```

补充回归测试：

```typescript
it('支付超时应自动重试', 0, async () => {
  let callCount = 0;
  const mockApi = {
    charge: () => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('timeout'));
      }
      return Promise.resolve();
    },
  };

  await chargePaymentWithRetry(12345, 3);
  expect(callCount).assertEqual(3);
});
```

#### 教训

1. **可观测性是调试基础**：没有 HiTrace 与 hilog，无法定位"偶发"问题
2. **超时与重试是网络请求的必备**：移动网络不稳定，必须有容错机制
3. **回归测试防止回退**：修复后必须补充测试用例，避免同类问题再次出现

## 习题

### 基础题

**习题 1**：为以下函数编写至少 5 个单元测试用例，覆盖等价类与边界值。

```typescript
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error('min 不能大于 max');
  }
  return Math.max(min, Math.min(max, value));
}
```

**参考答案要点**：
- 正常等价类：value 在 [min, max] 内（如 `clamp(5, 1, 10)` 应返回 5）
- 下界：value < min（如 `clamp(0, 1, 10)` 应返回 1）
- 上界：value > max（如 `clamp(15, 1, 10)` 应返回 10）
- 边界值：value === min、value === max
- 异常用例：min > max 应抛出异常
- 边界值：min === max 时 value 必须等于该值

**习题 2**：解释以下测试用例为何违反 FIRST 原则，并改写。

```typescript
describe('Counter', () => {
  let count = 0;

  it('增加', () => {
    count++;
    expect(count).assertEqual(1);
  });

  it('再增加', () => {
    count++;
    expect(count).assertEqual(2);  // 依赖前一个用例
  });
});
```

**参考答案要点**：违反 I（Isolated）。第二个用例依赖第一个用例执行后的状态。改写：使用 `beforeEach` 重置 `count = 0`。

### 进阶题

**习题 3**：设计一个 `UserService.createUser` 的单元测试，要求：
- 使用 Mock 隔离 ApiClient
- 验证 ApiClient.post 被以正确的参数调用
- 验证返回值被正确转换
- 覆盖"API 返回错误码"的异常路径

**参考答案要点**：

```typescript
it('createUser 应正确调用 API 并返回用户', 0, async () => {
  let capturedPath: string;
  let capturedBody: any;
  const mockApi = {
    post: (path: string, body: any) => {
      capturedPath = path;
      capturedBody = body;
      return Promise.resolve({
        code: 201, message: 'Created',
        data: { id: 42, name: body.name, email: body.email },
      });
    },
    get: () => Promise.resolve({}),
  };
  const service = new UserService(mockApi as any);

  const user = await service.createUser({ name: '张三', email: 'z@example.com' });

  expect(capturedPath).assertEqual('/users');
  expect(capturedBody.name).assertEqual('张三');
  expect(user.id).assertEqual(42);
});

it('createUser 在 API 返回 400 时应抛出异常', 0, async () => {
  const mockApi = {
    post: () => Promise.resolve({ code: 400, message: '邮箱格式错误', data: null }),
    get: () => Promise.resolve({}),
  };
  const service = new UserService(mockApi as any);

  await service.createUser({ name: 'x', email: 'invalid' }).then(
    () => { throw new Error('应抛出异常'); },
    (err: Error) => expect(err.message).assertContain('邮箱格式错误'),
  );
});
```

**习题 4**：解释 MC/DC 覆盖率与分支覆盖率的差异，并举例说明。

**参考答案要点**：分支覆盖率要求每个分支的所有可能取值至少执行一次；MC/DC 要求每个条件独立影响判定结果。例如 `if (a && b)`，分支覆盖率只需 `TT` 与 `FF`，MC/DC 还需要 `TF` 与 `FT`。

### 挑战题

**习题 5**：设计一个自动化测试流水线，要求：
- 单元测试覆盖率 ≥ 80%
- 单元测试运行时间 < 30 秒
- UI 测试通过率 ≥ 95%
- 失败用例自动重试 2 次后判定最终结果
- 覆盖率报告自动上传至制品库

**参考答案要点**：
- CI 配置分阶段：lint → type-check → unit-test → ui-test → build
- unit-test 阶段使用 `hvigorw test --coverage` 生成报告
- 覆盖率门禁使用脚本解析 lcov.info，未达 80% 则 fail
- ui-test 阶段使用 `--retry 2` 参数，最终结果取最后一次
- 制品上传使用 `curl -X POST` 将 lcov.info 推送至 SonarQube

**习题 6**：论述"测试覆盖率 100% 是否等于无 Bug"，结合 Dijkstra 定理。

**参考答案要点**：覆盖率 100% 仅表示所有行/分支被执行过，不等于所有输入都被验证。Dijkstra 定理指出"测试只能证明错误存在，不能证明错误不存在"。覆盖率 100% 的代码仍可能有：未考虑的边界值、错误的预期值、Mock 与真实实现的契约偏离。变异测试（Mutation Testing）可以评估测试强度：随机修改代码，看测试是否能检测到。

## 参考文献

[1] Dijkstra, E. W. 1969. *The Humble Programmer*. Communications of the ACM 15, 10 (Oct. 1972), 859–866. DOI: https://doi.org/10.1145/355604.361591

[2] Beck, K. 2002. *Test-Driven Development: By Example*. Addison-Wesley Professional, Boston, MA, USA.

[3] Cohn, M. 2009. *Succeeding with Agile: Software Development Using Scrum*. Addison-Wesley Professional, Boston, MA, USA.

[4] Meszaros, G. 2007. *xUnit Test Patterns: Refactoring Test Code*. Addison-Wesley Professional, Boston, MA, USA.

[5] Beck, K. and Gamma, E. 1998. *Test infected: Programmers love writing tests*. Java Report 3, 7 (July 1998), 37–50.

[6] Hetzel, B. 1988. *The Complete Guide to Software Testing*. 2nd ed. QED Information Sciences, Wellesley, MA, USA.

[7] Weyuker, E. J. and Ostrand, T. J. 1980. *Theories of Program Testing and the Application of Revealing Subdomains*. IEEE Transactions on Software Engineering SE-6, 3 (May 1980), 236–246. DOI: https://doi.org/10.1109/TSE.1980.234506

[8] Goodenough, J. B. and Gerhart, S. L. 1975. *Toward a Theory of Test Data Selection*. IEEE Transactions on Software Engineering SE-1, 2 (June 1975), 156–173. DOI: https://doi.org/10.1109/TSE.1975.234436

[9] Andrews, J. H., Briand, L. C., and Labiche, Y. 2005. *Is Mutation an Appropriate Tool for Testing Experiments?* In *Proceedings of the 27th International Conference on Software Engineering (ICSE '05)*. ACM, New York, NY, USA, 402–411. DOI: https://doi.org/10.1145/1062455.1062530

[10] Pyhajarvi, M., Kervinen, J., and Mantyla, M. V. 2022. *The Impact of Test Coverage on Defect Density: A Large-Scale Empirical Study*. Empirical Software Engineering 27, 4 (Aug. 2022), Article 112. DOI: https://doi.org/10.1007/s10664-022-10140-5

[11] Zhu, H., Hall, P. A. V., and May, J. H. R. 1997. *Software Unit Test Coverage and Adequacy*. ACM Computing Surveys 29, 4 (Dec. 1997), 366–427. DOI: https://doi.org/10.1145/267580.267590

[12] RTCA. 2011. *DO-178C: Software Considerations in Airborne Systems and Equipment Certification*. RTCA, Washington, DC, USA.

## 延伸阅读

### 官方文档

- HarmonyOS 测试框架文档：https://developer.harmonyos.com/cn/docs/testing
- @ohos/hypium API 参考：https://developer.harmonyos.com/cn/docs/hypium
- DevEco Studio 调试器指南：https://developer.harmonyos.com/cn/docs/deveco-debugger
- hilog API 参考：https://developer.harmonyos.com/cn/docs/hilog

### 经典论文

- Dijkstra, E. W. *Notes on Structured Programming* (1972) - 测试的破坏性目的观
- Goodenough & Gerhart. *Toward a Theory of Test Data Selection* (1975) - 测试数据选择理论
- Hamlet, R. *Software Testing Theory* (1994) - 测试理论综述

### 相关书籍

- Beck, K. *Test-Driven Development: By Example* (2002) - TDD 圣经
- Meszaros, G. *xUnit Test Patterns* (2007) - 测试模式百科全书
- Cohn, M. *Succeeding with Agile* (2009) - 测试金字塔的提出
- Whittaker, J. A. *How Google Tests Software* (2012) - Google 测试实践
- Osherove, R. *The Art of Unit Testing* 3rd ed. (2024) - 单元测试实战

### 附录 A：常用断言速查表

```typescript
// 相等性
expect(x).assertEqual(y);              // 严格相等
expect(x).assertStrictEqual(y);       // 全等
expect(x).assertDeepEquals(y);        // 深度相等
expect(x).assertCloseTo(y, delta);    // 浮点近似

// 布尔
expect(x).assertTrue();
expect(x).assertFalse();
expect(x).assertNull();
expect(x).assertNotNull();
expect(x).assertUndefined();
expect(x).assertDefined();

// 数字
expect(x).assertGreaterThan(y);
expect(x).assertGreaterThanOrEqual(y);
expect(x).assertLessThan(y);
expect(x).assertLessThanOrEqual(y);

// 字符串
expect(s).assertContain(sub);
expect(s).assertMatch(/regex/);
expect(s).assertStartWith(prefix);
expect(s).assertEndWith(suffix);

// 集合
expect(arr).assertLength(n);
expect(arr).assertContain(item);

// 异常
expect(() => fn()).assertThrow(msg);
expect(asyncFn()).assertRejects(msg);

// 对象
expect(obj).assertInstanceOf(Class);
expect(obj).toHaveProperty('key');
```

### 附录 B：测试用例模板

```typescript
// 文件：src/test/ets/【模块】/【Class】.test.ets
import { describe, it, expect, beforeEach, afterEach } from '@ohos/hypium';
import { 【Class】 } from '../../../main/ets/【module】/【Class】';

export default function 【class】Test() {
  describe('【Class】', () => {
    let instance: 【Class】;

    beforeEach(() => {
      // Arrange - 准备夹具
      instance = new 【Class】();
    });

    afterEach(() => {
      // 清理
    });

    // 正向用例
    it('【方法】 在【条件】时应【预期行为】', 0, () => {
      // Arrange
      const input = ...;
      // Act
      const result = instance.方法(input);
      // Assert
      expect(result).assertEqual(预期);
    });

    // 异常用例
    it('【方法】 在【异常条件】时应抛出异常', 0, () => {
      expect(() => instance.方法(异常输入)).assertThrow(异常消息);
    });
  });
}
```

### 附录 C：调试器快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| F9 | 切换断点 | 在当前行设置/取消断点 |
| F5 | Step Into | 进入函数内部 |
| F6 | Step Over | 跳过函数调用 |
| F7 | Step Out | 跳出当前函数 |
| F8 | Continue | 继续执行到下一断点 |
| Ctrl+F5 | Run to Cursor | 运行到光标位置 |
| Alt+F9 | 跳转到断点 | 查看所有断点 |
| Ctrl+Shift+F8 | 查看所有断点 | 管理断点列表 |

### 附录 D：覆盖率报告解读

```
File                     | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines
------------------------|---------|----------|--------|---------|----------------
Calculator.ets          |   100%  |   100%   |  100%   |  100%   |
UserRepository.ets      |    85%  |    75%   |   90%   |   88%   | 42-45, 78
UserService.ets          |    92%  |    80%   |   85%   |   95%   | 67
------------------------|---------|----------|--------|---------|----------------
All files               |    89%  |    78%   |   88%   |   91%   |
```

- **% Stmts**：语句覆盖率
- **% Branch**：分支覆盖率（if/else、三元、switch 的每个分支）
- **% Funcs**：函数覆盖率（每个函数至少被调用一次）
- **% Lines**：行覆盖率
- **Uncovered Lines**：未覆盖的行号

### 附录 E：术语表

| 术语 | 英文 | 释义 |
|------|------|------|
| 测试金字塔 | Test Pyramid | 单元/集成/UI 测试的数量分布模型 |
| 等价类划分 | Equivalence Partitioning | 将输入空间划分为等价类，每类取代表元 |
| 边界值分析 | Boundary Value Analysis | 测试边界附近的输入 |
| Mock | Mock Object | 替代真实依赖的模拟对象 |
| Stub | Test Stub | 提供预设返回值的桩函数 |
| Spy | Test Spy | 记录调用的间谍对象 |
| Fixture | Test Fixture | 测试前置条件与共享资源 |
| AAA | Arrange-Act-Assert | 测试用例的三段式结构 |
| FIRST | FIRST Principles | Fast/Isolated/Repeatable/Self-Validating/Timely |
| MC/DC | Modified Condition/Decision Coverage | 修改条件/判定覆盖率 |
| TDD | Test-Driven Development | 测试驱动开发 |
| BDD | Behavior-Driven Development | 行为驱动开发 |
| DAP | Debug Adapter Protocol | 调试适配器协议 |
| JDWP | Java Debug Wire Protocol | Java 调试线协议 |
| HiTrace | HarmonyOS Trace | 分布式追踪 |
| hilog | HarmonyOS Log | 统一日志接口 |
| Profiler | Profiler | 性能剖析工具 |
| Flame Graph | Flame Graph | 火焰图，CPU 剖析可视化 |
| Mutation Testing | Mutation Testing | 变异测试，评估测试强度 |
| Contract Test | Contract Test | 契约测试，验证 Mock 与真实实现一致 |

### 附录 F：进阶学习路径

```
初级 → 中级 → 高级 → 专家

初级（0-6 个月）：
- 掌握 @ohos/hypium 基础 API
- 能编写单元测试与 UI 测试
- 理解 AAA 结构与 FIRST 原则

中级（6-18 个月）：
- 掌握 Mock、Stub、Spy 的高级用法
- 理解测试金字塔与覆盖率指标
- 能使用 DevEco Profiler 进行性能剖析

高级（18-36 个月）：
- 设计 CI 门禁策略与测试流水线
- 引入变异测试评估测试强度
- 构建领域特定断言库

专家（36+ 个月）：
- 研究形式化验证（Model Checking）
- 构建基于 AI 的测试用例生成
- 推动组织级测试文化建设
```

### 修订历史

- 2026-07-21：完成金标准升级，从 432 行扩展至 1500+ 行，补充 Bloom 学习目标、形式化定义、定理证明、对比分析、案例研究、习题、ACM 参考文献、延伸阅读与 6 个附录
