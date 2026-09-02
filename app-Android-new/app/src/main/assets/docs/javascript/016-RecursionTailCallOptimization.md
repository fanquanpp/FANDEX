---
order: 160
title: 递归与尾调用优化
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 深入解析递归的形式化定义、调用栈模型、尾调用与 TCO 规范、trampoline 技术、CPS 续延传递、栈溢出防护等高级主题,涵盖 MIT 6.001 / Stanford CS107 / SICP 级别的工程教学
author: fanquanpp
updated: '2026-07-20'
related:
  - 'javascript/006-ControlFlow'
  - 'javascript/015-HigherOrderFunction'
  - 'javascript/017-CurryAndFunctionComposition'
  - 'javascript/032-CoroutinesInJavaScript'
  - 'javascript/026-PromiseConstructorDeepDive'
  - 'javascript/029-EventLoop'
prerequisites:
  - 'javascript/015-HigherOrderFunction'
  - 'javascript/032-CoroutinesInJavaScript'
---



# 递归与尾调用优化

## 前置知识

- [高阶函数](/javascript/015-HigherOrderFunction)：建议先完成前一篇的学习

## 学习目标

- 掌握「0. 学习导览」的核心机制、典型用法与常见陷阱
- 掌握「1. 历史动机与技术演进」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义」的核心机制、典型用法与常见陷阱
- 掌握「3. 递归基础」的核心机制、典型用法与常见陷阱
- 掌握「4. 常见递归模式」的核心机制、典型用法与常见陷阱


> 本文是 FANDEX JavaScript 模块的核心算法理论文档之一,定位为 MIT 6.001 / Stanford CS107 / SICP 级别的工程教学材料,涵盖递归的形式化定义、调用栈模型、尾调用与 TCO 规范、trampoline 技术、CPS 续延传递、栈溢出防护等高级主题。

## 0. 学习导览

### 0.1 学习路径

```
递归基础 → 调用栈模型 → 递归模式(线性/树形/互递归) → 尾调用定义
   → TCO 规范(ES6 PTC) → 尾递归改写 → trampoline → CPS → 栈溢出防护
   → 引擎支持对比 → 性能调优 → 常见陷阱 → 实战案例 → 习题
```

### 0.2 前置知识

- 熟悉 JavaScript 函数与作用域
- 理解执行上下文与调用栈
- 了解 ES6 strict mode
- 掌握基本的数据结构(栈、队列、树)

### 0.3 阅读建议

- 第一遍:递归基础、调用栈、尾调用定义
- 第二遍:TCO 规范与尾递归改写
- 第三遍:trampoline 与 CPS,理解栈安全递归
- 实战:按习题顺序实现深递归与互递归的栈安全版本

---

## 1. 历史动机与技术演进

### 1.1 递归的数学起源

递归作为数学与计算机科学的核心概念,其历史可追溯至:

- **1903 年**:Skolem 用递归函数定义自然数
- **1930 年代**:Gödel、Herbrand、Kleene 发展递归函数论
- **1936 年**:Turing 用递归概念定义可计算性
- **1958 年**:McCarthy 在 MIT 发明 Lisp,递归成为程序设计的一等公民
- **1960 年**:McCarthy 发表 *Recursive Functions of Symbolic Expressions and Their Computation by Machine, Part I*
- **1985 年**:Harold Abelson 与 Gerald Sussman 出版 SICP,递归成为计算机科学教学的核心

### 1.2 尾调用的早期研究

尾调用优化(Tail Call Optimization, TCO)的概念源于 Lisp 与 Scheme 社区:

- **1970 年代**:MIT Lisp Machine 硬件级支持 TCO
- **1977 年**:Guy Steele 在 *LAMBDA: The Ultimate GOTO* 中论证尾调用本质等价于 GOTO
- **1998 年**:Scheme R5RS 规范要求所有实现必须支持 TCO(proper tail recursion)
- **2015 年**:ECMAScript 6(ES2015)引入 Proper Tail Calls(PTC),要求 strict mode 下实现 TCO

### 1.3 ES6 PTC 的争议

ES6 规范第 14.6 节定义了 PTC,但实际引擎实现存在分歧:

| 引擎          | PTC 支持                | 原因                                |
| ------------- | ----------------------- | ----------------------------------- |
| Safari/JSC    | 完整支持(strict mode) | 苹果工程团队主导,严格遵循规范     |
| Chrome/V8     | 未实现                  | 性能担忧、调试栈丢失、用户混淆     |
| Firefox/SpiderMonkey | 未实现           | 类似 V8 的工程考虑                  |
| Node.js(V8)  | 未实现                  | 沿用 V8 实现                        |

V8 团队的反对理由包括:

1. **调试困难**:TCO 丢弃栈帧,错误栈信息缺失
2. **性能回归**:每次调用都需判断是否尾位置,增加开销
3. **用户混淆**:开发者期望栈溢出作为递归错误信号
4. **生态影响**:依赖栈深度的库(如 long-stack-traces)失效

ES6 规范保留 PTC 条款,但未强制引擎实现;后续 TC39 提出 Syntactic Tail Calls(STC)提案(用 `continue` 关键字显式标记),但至今未推进。

### 1.4 关键人物与里程碑

- **John McCarthy**:Lisp 之父,递归程序设计的奠基者
- **Guy L. Steele Jr.**:Scheme 共同设计者,*LAMBDA: The Ultimate GOTO* 作者
- **Gerald Sussman**:SICP 作者,MIT 计算机科学教学推动者
- **Dave Herman**:TC39 成员,推动 ES6 PTC 提案

| 年份    | 事件                                                                |
| ------- | ------------------------------------------------------------------- |
| 1958    | McCarthy 设计 Lisp,递归成为核心                                    |
| 1970    | MIT Lisp Machine 硬件支持 TCO                                       |
| 1977    | Steele 发表 *LAMBDA: The Ultimate GOTO*                            |
| 1998    | Scheme R5RS 强制要求 proper tail recursion                          |
| 2011    | TC39 提出 ES6 PTC 提案                                              |
| 2015    | ES6 发布,规范第 14.6 节定义 PTC(仅 strict mode)                  |
| 2016    | Safari 10 完整实现 PTC                                              |
| 2016    | V8 团队宣布不实现 PTC,提出 STC 提案                                |
| 2024    | STC 提案仍未推进,JS 社区普遍用 trampoline 与 generator 替代        |

### 1.5 递归与 TCO 解决的核心问题

1. **问题分解**:递归让复杂问题(树遍历、分治、回溯)表达更自然
2. **栈溢出**:深递归导致 Maximum call stack size exceeded
3. **栈空间**:每层递归占用栈帧,深递归耗尽栈
4. **性能**:函数调用开销(参数传递、栈分配、返回地址)
5. **可读性**:递归通常比迭代更简洁,但栈溢出限制其应用

---

## 2. 形式化定义

### 2.1 递归的数学定义

递归函数可形式化为不动点(Fixed Point)。给定函数 $F: (A \to B) \to (A \to B)$,递归函数 $f: A \to B$ 满足:

$$
F(f) = f
$$

即 $f$ 是 $F$ 的不动点。Y 组合子(Y Combinator)可计算不动点:

$$
Y = \lambda F. (\lambda x. F\ (x\ x))\ (\lambda x. F\ (x\ x))
$$

满足 $Y F = F\ (Y F)$,即 $Y F$ 是 $F$ 的不动点。

### 2.2 调用栈的代数模型

调用栈(Call Stack)可形式化为栈结构:

$$
\text{Stack} = \langle F, \text{push}, \text{pop}, \text{top}, \text{empty} \rangle
$$

- **帧集合** $F$:每个栈帧(Frame)包含返回地址、参数、局部变量
- **push**: $F \times \text{Stack} \to \text{Stack}$,压入新帧
- **pop**: $\text{Stack} \to F \times \text{Stack}$,弹出栈顶
- **top**: $\text{Stack} \to F$,查看栈顶
- **empty**: $\text{Stack} \to \text{Bool}$,判断是否为空

递归调用时执行 $\text{push}(\text{frame}_n)$,返回时执行 $\text{pop}()$。栈深度有限,典型 V8 栈大小约 1-15 万帧(取决于帧大小)。

### 2.3 尾调用的形式化定义

函数 $f$ 在尾位置(Tail Position)调用 $g$,当且仅当 $g$ 的返回值直接作为 $f$ 的返回值,且 $f$ 无后续操作:

$$
\text{TailCall}(f, g) \iff \exists x.\ f(x) = g(\text{args}(x)) \land \nexists \text{post-op}
$$

形式上,尾调用满足:

$$
\text{ReturnAddr}(f) = \text{ReturnAddr}(g)
$$

即 $g$ 返回时直接跳到 $f$ 的调用者,而非 $f$ 本身。这使得 $f$ 的栈帧可在调用 $g$ 前被释放,TCO 即基于此原理。

### 2.4 尾递归的不动点形式

尾递归(Tail Recursion)是尾调用的特例,即 $f$ 在尾位置调用自身。尾递归可改写为迭代:

$$
f(x) = \begin{cases}
\text{base}(x) & \text{if } \text{pred}(x) \\
f(\text{step}(x)) & \text{otherwise}
\end{cases}
$$

等价的迭代形式:

$$
\text{while } \neg \text{pred}(x): x \leftarrow \text{step}(x); \text{return } \text{base}(x)
$$

这种等价性是 TCO 与 trampoline 的理论基础。

### 2.5 CPS 的形式化定义

直接风格(Direct Style):

$$
f: A \to B
$$

CPS(Continuation-Passing Style):

$$
f_{\text{cps}}: A \times (B \to R) \to R
$$

CPS 中,函数不直接返回值,而是将值传给续延(Continuation)$k: B \to R$。CPS 的核心性质:

1. **所有调用都是尾调用**:CPS 中无"调用后操作",每次调用后即转交控制
2. **控制流显式**:续延作为参数,可灵活组合(call/cc、异常、生成器)
3. **栈安全**:配合 TCO,CPS 程序无栈增长

---

## 3. 递归基础

### 3.1 递归定义

递归(Recursion)是函数直接或间接调用自身的编程技术。每个递归必须包含:

- **基线条件**(Base Case):停止递归的条件
- **递归条件**(Recursive Case):将问题分解为更小的子问题

```javascript
function factorial(n) {
  if (n <= 1) return 1;        // 基线条件
  return n * factorial(n - 1); // 递归条件
}

console.log(factorial(5)); // 120
```

### 3.2 递归调用栈

每次递归调用都压入新栈帧,基线条件触发后逐层弹出:

```
factorial(4) 的调用栈:
factorial(4) = 4 * factorial(3)
             = 4 * 3 * factorial(2)
             = 4 * 3 * 2 * factorial(1)
             = 4 * 3 * 2 * 1 = 24
```

栈帧结构:

```
[factorial(4)] ← 栈底(最早)
[factorial(3)]
[factorial(2)]
[factorial(1)] ← 栈顶(最新,触发基线)
```

每帧保存:n 的值、返回地址、局部变量。返回时弹栈,逐层计算结果。

### 3.3 栈大小限制

JavaScript 引擎的调用栈大小有限:

```javascript
function countDepth(n = 0) {
  try {
    return countDepth(n + 1);
  } catch (e) {
    return n;
  }
}

console.log(countDepth()); // V8(Chrome): ~10000-15000
                           // SpiderMonkey(Firefox): ~20000-30000
                           // JSC(Safari): ~50000-100000
```

栈大小因引擎、帧大小、操作系统而异。深递归需用 TCO、trampoline 或迭代改写。

### 3.4 基线条件缺失的后果

```javascript
// 反模式:无基线条件
function infinite(n) {
  return infinite(n + 1); // 永远递归
}
infinite(0); // RangeError: Maximum call stack size exceeded
```

引擎检测到栈溢出时抛出 RangeError,程序中止。生产环境中需捕获并降级处理。

---

## 4. 常见递归模式

### 4.1 线性递归

每层递归调用一次自身:

```javascript
// 数组求和
function sum(arr) {
  if (arr.length === 0) return 0;
  return arr[0] + sum(arr.slice(1));
}

console.log(sum([1, 2, 3, 4, 5])); // 15

// 反转字符串
function reverse(str) {
  if (str.length <= 1) return str;
  return reverse(str.slice(1)) + str[0];
}

console.log(reverse('hello')); // 'olleh'
```

### 4.2 树形递归

每层递归调用多次自身,形成树状调用:

```javascript
// 斐波那契(朴素递归,指数级)
function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
// 调用树:
//                fib(10)
//              /         \
//         fib(9)          fib(8)
//        /     \         /     \
//    fib(8)  fib(7)  fib(7)  fib(6)
//    ...   ...     ...     ...
// 总调用次数 ≈ 2 * fib(n+1) - 1,指数级
```

### 4.3 尾递归

递归调用在尾位置,可被 TCO 优化:

```javascript
// 阶乘的尾递归形式
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc);
}

// 斐波那契的尾递归形式
function fibonacci(n, a = 0, b = 1) {
  if (n === 0) return a;
  if (n === 1) return b;
  return fibonacci(n - 1, b, a + b);
}

console.log(factorial(5)); // 120
console.log(fibonacci(10)); // 55
```

### 4.4 互递归

两个或多个函数相互调用:

```javascript
function isEven(n) {
  if (n === 0) return true;
  return isOdd(n - 1);
}

function isOdd(n) {
  if (n === 0) return false;
  return isEven(n - 1);
}

console.log(isEven(10)); // true
console.log(isOdd(7)); // true
```

互递归也可改写为尾递归,需 TCO 或 trampoline 支持深调用。

### 4.5 分治递归

将问题分为独立子问题,合并结果:

```javascript
// 归并排序
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(a, b) {
  const result = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) result.push(a[i++]);
    else result.push(b[j++]);
  }
  return result.concat(a.slice(i), b.slice(j));
}

console.log(mergeSort([3, 1, 4, 1, 5, 9, 2, 6])); // [1,1,2,3,4,5,6,9]
```

### 4.6 回溯递归

尝试所有可能,失败时回退:

```javascript
// N 皇后
function solveNQueens(n) {
  const result = [];
  function backtrack(row, cols, diagonals, antiDiagonals, path) {
    if (row === n) {
      result.push(path.map(c => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1)));
      return;
    }
    for (let col = 0; col < n; col++) {
      const diag = row - col + n;
      const antiDiag = row + col;
      if (cols.has(col) || diagonals.has(diag) || antiDiagonals.has(antiDiag)) continue;
      cols.add(col); diagonals.add(diag); antiDiagonals.add(antiDiag);
      path.push(col);
      backtrack(row + 1, cols, diagonals, antiDiagonals, path);
      path.pop();
      cols.delete(col); diagonals.delete(diag); antiDiagonals.delete(antiDiag);
    }
  }
  backtrack(0, new Set(), new Set(), new Set(), []);
  return result;
}

console.log(solveNQueens(4)); // 2 个解
```

### 4.7 二分查找

```javascript
function binarySearch(arr, target, left = 0, right = arr.length - 1) {
  if (left > right) return -1;
  const mid = Math.floor((left + right) / 2);
  if (arr[mid] === target) return mid;
  if (arr[mid] > target) return binarySearch(arr, target, left, mid - 1);
  return binarySearch(arr, target, mid + 1, right);
}

console.log(binarySearch([1, 3, 5, 7, 9, 11], 7)); // 3
```

### 4.8 快速排序

```javascript
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = arr.slice(1).filter((x) => x < pivot);
  const right = arr.slice(1).filter((x) => x >= pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
}

console.log(quickSort([3, 1, 4, 1, 5, 9, 2, 6])); // [1,1,2,3,4,5,6,9]
```

---

## 5. 尾调用

### 5.1 尾调用定义

尾调用(Tail Call)是指函数的最后一步是调用另一个函数:

```javascript
// 尾调用
function tailCall(x) {
  return anotherFunction(x); // 直接返回,无后续操作
}

// 非尾调用
function notTailCall(x) {
  return anotherFunction(x) + 1; // 调用后还要加 1
}

// 非尾调用
function notTailCall2(x) {
  const result = anotherFunction(x);
  return result; // 调用后有赋值与返回,但仍是尾调用?
  // 注:V8 等引擎可能优化为尾调用,但严格说不是
}
```

### 5.2 尾调用的判定规则

ECMAScript 规范第 14.6.1 节定义了尾位置(Tail Position):

1. `return FunctionCall(args)` 是尾位置
2. `return FunctionCall(args) ?? default` 不是尾位置(有 `??` 操作)
3. `return FunctionCall(args) || default` 不是尾位置
4. `return FunctionCall(args) && default` 不是尾位置
5. `return cond ? f() : g()` 中 f() 和 g() 都是尾位置
6. `return (FunctionCall(args))` 是尾位置(括号不影响)
7. `if (cond) return f(); else return g();` 中 f() 和 g() 都是尾位置
8. `try { return f(); } finally { cleanup(); }` 中 f() 不是尾位置(finally 块需执行)

```javascript
// 严格的尾位置
function f1(x) { return g(x); }            // √ 尾调用
function f2(x) { return g(x) ?? h(x); }    // × 非尾调用
function f3(x) { return g(x) || h(x); }    // × 非尾调用
function f4(x) { return cond ? g(x) : h(x); } // √ 尾调用
function f5(x) {
  try { return g(x); }
  finally { cleanup(); }                   // × 非尾调用(finally 需执行)
}
function f6(x) {
  if (cond) return g(x);                   // √ 尾调用
  return h(x);                             // √ 尾调用
}
```

### 5.3 尾调用的运行时行为

非尾调用:调用 g 时,保留 f 的栈帧(等待 g 返回后继续执行 f):

```
[f's frame] ← g 返回后,f 继续执行
[g's frame] ← 当前执行
```

尾调用:调用 g 时,释放 f 的栈帧,g 直接返回到 f 的调用者:

```
(原 [f's frame] 已释放)
[g's frame] ← 当前执行,g 返回时直接跳到 f 的调用者
```

### 5.4 TCO 的工作原理

TCO 的核心步骤:

1. 识别尾位置(编译期)
2. 尾位置调用前,释放当前栈帧
3. 跳转到目标函数(而非调用)
4. 目标函数返回时,直接返回到原调用者

汇编层面,TCO 用 `jmp` 而非 `call`,不增加栈深度:

```asm
; 非 TCO
push args        ; 压参数
call g           ; 调用 g,压返回地址
; g 返回后继续执行
add result, 1    ; 后续操作
ret

; TCO
push args        ; 压参数
jmp g            ; 直接跳转,g 返回时直接 ret 到调用者
; 无后续操作
```

---

## 6. TCO 规范

### 6.1 ES6 PTC 的规定

ECMAScript 2015(ES6)第 14.6 节 "Tail Position Calls" 规定:

1. **仅 strict mode**:PTC 仅在 'use strict' 下生效
2. **语法判定**:编译期判定是否尾位置,非运行时
3. **强制优化**:符合规范的实现必须优化尾位置调用
4. **栈深度不变**:尾调用不应增加调用栈深度

```javascript
'use strict';

function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc); // PTC:严格模式 + 尾位置
}

// 在 Safari 中:factorial(1000000) 不栈溢出
// 在 V8 中:factorial(100000) 栈溢出(未实现 PTC)
```

### 6.2 PTC 的语法要求

PTC 仅在严格模式下生效:

```javascript
// 非严格模式:不优化
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc);
}
factorial(100000); // 栈溢出(即使引擎支持 PTC)

// 严格模式:优化
'use strict';
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc);
}
factorial(100000); // Safari 不溢出,V8 仍溢出
```

### 6.3 PTC 不生效的场景

以下场景即使语法上是尾位置,PTC 也不生效:

1. **非严格模式**:`function` 声明默认非严格
2. **arguments 与 this**:函数内访问 `arguments` 或 `this` 的尾调用不优化
3. **try/catch/finally**:`try` 块内的尾调用不优化(需保留 catch 上下文)
4. **eval**:涉及 `eval` 的尾调用不优化

```javascript
'use strict';

function f1() {
  return g(); // √ PTC
}

function f2() {
  arguments; // 访问 arguments
  return g(); // × 非 PTC
}

function f3() {
  try {
    return g(); // × 非 PTC(try 块)
  } catch (e) {
    return h();
  }
}

function f4() {
  this; // 访问 this
  return g(); // × 非 PTC
}
```

### 6.4 引擎实现差异

| 引擎          | PTC 实现                  | 严格模式必需 | 备注                          |
| ------------- | ------------------------- | ------------ | ----------------------------- |
| Safari/JSC    | 完整实现                  | 是           | iOS 10+/Safari 10+ 起         |
| Chrome/V8     | 未实现                    | N/A          | 2016 年决定不实现             |
| Firefox/SpiderMonkey | 未实现             | N/A          | 同 V8                         |
| Node.js       | 未实现                    | N/A          | 沿用 V8                       |
| Babel         | 语法转译为循环            | 是           | babel-plugin-transform-...    |

### 6.5 V8 不实现 PTC 的原因

V8 团队(由 Benedikt Meurer 代表)在 2016 年的声明中提出:

1. **调试体验**:TCO 丢失栈帧,错误堆栈不完整,开发者难以调试
2. **性能回归**:每次函数调用都需检查是否尾位置,增加开销
3. **生态影响**:依赖栈深度的工具(long-stack-traces、async 栈追踪)失效
4. **用户混淆**:开发者依赖栈溢出作为递归错误信号,PTC 让错误变为"卡死"
5. **替代方案**:trampoline、generator、async/await 已能解决深递归

V8 团队提出 STC(Syntactic Tail Calls)提案,用显式语法标记尾调用:

```javascript
// STC 提案(未通过)
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return continue factorial(n - 1, n * acc); // 显式标记
}
```

但 STC 至今未进入 ES 标准。

### 6.6 Babel 的转译

Babel 提供 `babel-plugin-transform-async-to-generator` 等插件,可将尾递归转为循环:

```javascript
// 源码
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc);
}

// 转译后(简化)
function factorial(n, acc = 1) {
  while (true) {
    if (n <= 1) return acc;
    acc = n * acc;
    n = n - 1;
  }
}
```

注意:Babel 只能转译直接自递归,无法处理互递归或通过高阶函数的递归。

---

## 7. 尾递归改写

### 7.1 改写步骤

将普通递归改写为尾递归:

1. 引入累加器(Accumulator)参数,保存中间结果
2. 将"递归后操作"转为"递归前计算"
3. 基线条件返回累加器

### 7.2 阶乘改写

```javascript
// 原始(非尾递归)
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1); // 递归后乘以 n
}

// 尾递归
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc); // 递归前累乘
}
```

### 7.3 斐波那契改写

```javascript
// 原始(树形递归,指数级)
function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 尾递归(线性)
function fibonacci(n, a = 0, b = 1) {
  if (n === 0) return a;
  if (n === 1) return b;
  return fibonacci(n - 1, b, a + b);
}
```

### 7.4 数组求和改写

```javascript
// 原始
function sum(arr) {
  if (arr.length === 0) return 0;
  return arr[0] + sum(arr.slice(1));
}

// 尾递归
function sum(arr, acc = 0) {
  if (arr.length === 0) return acc;
  return sum(arr.slice(1), acc + arr[0]);
}

// 更高效(避免 slice)
function sum(arr, i = 0, acc = 0) {
  if (i >= arr.length) return acc;
  return sum(arr, i + 1, acc + arr[i]);
}
```

### 7.5 反转字符串改写

```javascript
// 原始
function reverse(str) {
  if (str.length <= 1) return str;
  return reverse(str.slice(1)) + str[0];
}

// 尾递归
function reverse(str, acc = '') {
  if (str.length === 0) return acc;
  return reverse(str.slice(1), str[0] + acc);
}
```

### 7.6 树遍历改写

```javascript
// 原始(深度优先)
function traverse(node) {
  if (!node) return;
  console.log(node.value);
  traverse(node.left);
  traverse(node.right);
}

// 尾递归(用栈模拟)
function traverse(root) {
  function go(stack) {
    if (stack.length === 0) return;
    const node = stack.pop();
    if (!node) return go(stack);
    console.log(node.value);
    stack.push(node.right);
    stack.push(node.left);
    return go(stack);
  }
  return go([root]);
}
```

### 7.7 互递归改写

```javascript
// 原始互递归
function isEven(n) {
  if (n === 0) return true;
  return isOdd(n - 1);
}

function isOdd(n) {
  if (n === 0) return false;
  return isEven(n - 1);
}

// 尾递归(合并为单函数)
function isEven(n) {
  if (n === 0) return true;
  if (n === 1) return false;
  return isEven(n - 2);
}
```

### 7.8 改写的局限性

并非所有递归都能简单改写为尾递归:

1. **树形递归**:多个递归调用合并为尾递归需用栈模拟
2. **后序遍历**:需保存中间状态,改写复杂
3. **回溯**:需保存路径状态,改写为迭代更清晰

```javascript
// 斐波那契的树形递归难以直接改写为尾递归
// 需引入双累加器(a, b),实际上等价于迭代

// 树遍历需用显式栈
// 复杂度不变,但代码可读性下降
```

---

## 8. Trampoline 技术

### 8.1 Trampoline 原理

Trampoline(蹦床)是一种将递归转为迭代的通用技术:

1. 递归函数返回 thunk(零参函数)而非立即调用
2. Trampoline 主循环不断调用 thunk,直到得到非函数结果

### 8.2 Trampoline 实现

```javascript
function trampoline(fn) {
  return function (...args) {
    let result = fn(...args);
    while (typeof result === 'function') {
      result = result();
    }
    return result;
  };
}
```

### 8.3 阶乘的 Trampoline 版本

```javascript
function factorialThunk(n, acc = 1) {
  if (n <= 1) return acc;
  return () => factorialThunk(n - 1, n * acc);
}

const factorial = trampoline(factorialThunk);
console.log(factorial(100000)); // 不栈溢出(注:结果为 Infinity)
```

### 8.4 斐波那契的 Trampoline 版本

```javascript
function fibonacciThunk(n, a = 0, b = 1) {
  if (n === 0) return a;
  if (n === 1) return b;
  return () => fibonacciThunk(n - 1, b, a + b);
}

const fibonacci = trampoline(fibonacciThunk);
console.log(fibonacci(10000)); // 不栈溢出
```

### 8.5 Trampoline 的内存权衡

Trampoline 将栈空间转为堆空间:

- **栈**:每帧 ~100-500 字节,栈大小 ~1-10 MB
- **堆**:每个 thunk 闭包 ~100-1000 字节,堆大小 ~1-4 GB

10000 层递归:栈约 1-5 MB(可能溢出),堆约 1-10 MB(轻松容纳)。

### 8.6 Trampoline 与互递归

Trampoline 也支持互递归:

```javascript
function isEvenThunk(n) {
  if (n === 0) return true;
  return () => isOddThunk(n - 1);
}

function isOddThunk(n) {
  if (n === 0) return false;
  return () => isEvenThunk(n - 1);
}

const isEven = trampoline(isEvenThunk);
const isOdd = trampoline(isOddThunk);

console.log(isEven(1000000)); // true,不栈溢出
```

### 8.7 Trampoline 的性能开销

每次递归需:

1. 创建 thunk 闭包(分配堆内存)
2. 返回 thunk
3. Trampoline 调用 thunk
4. 释放 thunk 闭包

相比直接尾递归(若支持 TCO),Trampoline 慢 2-5 倍。但相比栈溢出,这是可接受的代价。

### 8.8 Trampoline 与异步

异步递归(如递归 fetch)也可用 trampoline,但需异步 trampoline:

```javascript
async function asyncTrampoline(promiseFactory) {
  let result = promiseFactory();
  while (result instanceof Promise || typeof result === 'function') {
    if (typeof result === 'function') {
      result = result();
    } else {
      result = await result;
    }
  }
  return result;
}

// 异步递归 fetch
function fetchPages(url, allPages = []) {
  return fetch(url)
    .then((r) => r.json())
    .then((data) => {
      allPages.push(data);
      if (data.next) {
        return () => fetchPages(data.next, allPages);
      }
      return allPages;
    });
}

asyncTrampoline(() => fetchPages('/api/page/1')).then((pages) => {
  console.log('All pages:', pages);
});
```

### 8.9 Trampoline 库

社区库:

- `trampoline-js`:简单 trampoline 实现
- `ramda`:包含 R.trampoline
- `lodash/fp`:可用 _.thunkify 配合自实现

```javascript
import { trampoline } from 'ramda';

const factorial = trampoline(function fact(n, acc = 1) {
  if (n <= 1) return acc;
  return () => fact(n - 1, n * acc);
});

console.log(factorial(100000));
```

---

## 9. CPS(Continuation-Passing Style)

### 9.1 CPS 的核心思想

CPS 中,函数不直接返回值,而是将值传给续延(Continuation)回调:

```javascript
// 直接风格
function add(a, b) {
  return a + b;
}
const result = add(1, 2);
console.log(result); // 3

// CPS
function addCPS(a, b, k) {
  k(a + b);
}
addCPS(1, 2, (result) => {
  console.log(result); // 3
});
```

### 9.2 CPS 转换规则

将直接风格转为 CPS 的规则:

1. 函数增加续延参数 k
2. 返回值改为调用 k(value)
3. 函数调用改为传递续延

```javascript
// 直接风格
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// CPS
function factorialCPS(n, k) {
  if (n <= 1) return k(1);
  return factorialCPS(n - 1, (sub) => k(n * sub));
}

factorialCPS(5, (result) => console.log(result)); // 120
```

### 9.3 CPS 与尾调用

CPS 中所有调用都是尾调用:

```javascript
function factorialCPS(n, k) {
  if (n <= 1) return k(1);                  // k(1) 是尾调用
  return factorialCPS(n - 1, (sub) => {     // factorialCPS 是尾调用
    return k(n * sub);                      // k(n * sub) 是尾调用
  });
}
```

配合 TCO,CPS 程序不增加栈深度。在 V8 中,需用 trampoline 包装。

### 9.4 CPS 与 call/cc

Scheme 的 call-with-current-continuation(call/cc)是 CPS 的高级应用:

```javascript
// JS 模拟 call/cc
let savedContinuation = null;

function callCC(f) {
  return f((value) => {
    throw { isContinuation: true, value };
  });
}

function tryCallCC(f) {
  try {
    return callCC(f);
  } catch (e) {
    if (e.isContinuation) return e.value;
    throw e;
  }
}

// 用法:实现 generator 风格的 yield
function* range(from, to) {
  for (let i = from; i < to; i++) {
    yield i;
  }
}
```

### 9.5 CPS 的应用

CPS 在以下场景有应用:

1. **编译器**:CPS 是函数式语言编译的中间表示(IR)
2. **异步编程**:Promise/async-await 本质是 CPS 的语法糖
3. **异常处理**:用续延模拟 try/catch
4. **生成器**:yield 即调用续延

### 9.6 CPS 的栈安全版本

```javascript
// CPS 版本(栈不安全,V8 中会溢出)
function factorialCPS(n, k) {
  if (n <= 1) return k(1);
  return factorialCPS(n - 1, (sub) => k(n * sub));
}

// CPS + trampoline(栈安全)
function factorialCPSThunk(n, k) {
  if (n <= 1) return () => k(1);
  return () => factorialCPSThunk(n - 1, (sub) => () => k(n * sub));
}

const safeFactorial = trampoline(factorialCPSThunk);
safeFactorial(100000, (result) => console.log(result));
```

### 9.7 CPS 的可读性问题

CPS 代码可读性差("回调地狱"的根源):

```javascript
// CPS 风格的链式操作
function pipelineCPS(x, k) {
  step1CPS(x, (x1) => {
    step2CPS(x1, (x2) => {
      step3CPS(x2, (x3) => {
        k(x3);
      });
    });
  });
}

// 等价的 async/await
async function pipeline(x) {
  const x1 = await step1(x);
  const x2 = await step2(x1);
  const x3 = await step3(x2);
  return x3;
}
```

async/await 即是 CPS 的语法糖,在编译期转换为状态机。

---

## 10. 栈溢出防护

### 10.1 检测栈深度

```javascript
function getStackDepth(n = 0) {
  try {
    return getStackDepth(n + 1);
  } catch (e) {
    return n;
  }
}

const maxDepth = getStackDepth();
console.log('Max stack depth:', maxDepth);
```

### 10.2 限制递归深度

```javascript
function safeRecursion(n, maxDepth = 10000) {
  if (n <= 0) return 0;
  if (maxDepth <= 0) {
    throw new Error('Recursion depth exceeded');
  }
  return 1 + safeRecursion(n - 1, maxDepth - 1);
}
```

### 10.3 改用迭代

最简单的防护:用循环替代递归:

```javascript
// 递归(易溢出)
function sumRecursive(arr) {
  if (arr.length === 0) return 0;
  return arr[0] + sumRecursive(arr.slice(1));
}

// 迭代(不溢出)
function sumIterative(arr) {
  let total = 0;
  for (const x of arr) total += x;
  return total;
}
```

### 10.4 显式栈模拟

用数组模拟调用栈:

```javascript
function traverseIterative(root) {
  const stack = [root];
  const result = [];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    result.push(node.value);
    stack.push(node.right);
    stack.push(node.left);
  }
  return result;
}
```

### 10.5 用 Generator 实现惰性递归

```javascript
function* traverseGenerator(node) {
  if (!node) return;
  yield node.value;
  yield* traverseGenerator(node.left);
  yield* traverseGenerator(node.right);
}

// 消费时不增加栈深度(generator 本身用状态机实现)
for (const value of traverseGenerator(root)) {
  console.log(value);
}
```

注意:`yield*` 仍是递归,深树仍可能溢出。需用显式栈:

```javascript
function* traverseSafe(root) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    yield node.value;
    stack.push(node.right);
    stack.push(node.left);
  }
}
```

### 10.6 监控与降级

```javascript
function safeRecursive(fn, maxDepth = 10000) {
  let depth = 0;
  function wrapped(...args) {
    if (++depth > maxDepth) {
      depth = 0;
      throw new RangeError(`Recursion depth exceeded ${maxDepth}`);
    }
    try {
      return fn(...args);
    } finally {
      depth--;
    }
  }
  return wrapped;
}

const safeFactorial = safeRecursive(function f(n) {
  if (n <= 1) return 1;
  return n * f(n - 1);
});

try {
  console.log(safeFactorial(100000));
} catch (e) {
  console.error('Fallback to iterative:', e.message);
  // 降级到迭代版本
}
```

---

## 11. 浏览器与引擎的 TCO 支持

### 11.1 浏览器兼容性表

| 浏览器              | 引擎          | TCO 支持             | 严格模式 | 备注                          |
| ------------------- | ------------- | -------------------- | -------- | ----------------------------- |
| Safari 10+          | JSC           | 完整支持             | 必需     | 2016 年起                     |
| Safari iOS 10+      | JSC           | 完整支持             | 必需     |                               |
| Chrome              | V8            | 不支持               | N/A      | 2016 年决定不实现             |
| Firefox             | SpiderMonkey  | 不支持               | N/A      |                               |
| Edge(Chromium)    | V8            | 不支持               | N/A      | 沿用 V8                       |
| Node.js             | V8            | 不支持               | N/A      | 沿用 V8                       |
| Deno                | V8            | 不支持               | N/A      |                               |
| Bun                 | JSC           | 完整支持             | 必需     | 沿用 Safari JSC               |

### 11.2 检测 TCO 支持

```javascript
function supportsTCO() {
  'use strict';
  function f(n) {
    if (n === 0) return 0;
    return f(n - 1);
  }
  try {
    f(100000);
    return true;
  } catch (e) {
    return false;
  }
}

console.log('TCO supported:', supportsTCO());
// Safari: true
// Chrome/Firefox: false
```

### 11.3 跨引擎兼容策略

```javascript
// 检测并选择实现
const factorial = (function () {
  if (supportsTCO()) {
    // 严格模式 + 尾递归(Safari 用)
    'use strict';
    return function f(n, acc = 1) {
      if (n <= 1) return acc;
      return f(n - 1, n * acc);
    };
  }
  // 其他引擎用 trampoline
  function fThunk(n, acc = 1) {
    if (n <= 1) return acc;
    return () => fThunk(n - 1, n * acc);
  }
  return trampoline(fThunk);
})();

console.log(factorial(100000));
```

### 11.4 Node.js 的特殊情况

Node.js 使用 V8,不支持 PTC。但 Node.js 提供 `--stack-size` 选项调整栈大小:

```bash
node --stack-size=2000 script.js # 2000 KB 栈(默认 ~1 MB)
```

这只是缓解,不能根治深递归问题。

---

## 12. 性能优化

### 12.1 递归 vs 迭代性能

```javascript
// 基准测试
function fibRecursive(n) {
  if (n < 2) return n;
  return fibRecursive(n - 1) + fibRecursive(n - 2);
}

function fibIterative(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
}

function fibTailRecursive(n, a = 0, b = 1) {
  if (n === 0) return a;
  if (n === 1) return b;
  return fibTailRecursive(n - 1, b, a + b);
}

const n = 30;
console.time('recursive');
fibRecursive(n);
console.timeEnd('recursive'); // ~15ms(指数级)

console.time('iterative');
fibIterative(n);
console.timeEnd('iterative'); // ~0.1ms

console.time('tail-recursive');
fibTailRecursive(n);
console.timeEnd('tail-recursive'); // ~0.5ms(V8 中无 TCO,有调用开销)
```

### 12.2 记忆化(Memoization)

树形递归(如朴素斐波那契)可记忆化:

```javascript
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

const fibMemo = memoize(function fib(n) {
  if (n < 2) return n;
  return fibMemo(n - 1) + fibMemo(n - 2);
});

console.time('memoized');
fibMemo(40);
console.timeEnd('memoized'); // ~1ms(vs 朴素 ~1.5s)
```

### 12.3 减少调用开销

```javascript
// 反模式:多次 slice 创建新数组
function sum(arr) {
  if (arr.length === 0) return 0;
  return arr[0] + sum(arr.slice(1)); // 每次创建新数组
}

// 优化:用索引
function sum(arr, i = 0) {
  if (i >= arr.length) return 0;
  return arr[i] + sum(arr, i + 1);
}
```

### 12.4 内联(Inline)

```javascript
// 反模式:小函数递归
function add(a, b) { return a + b; }
function sum(n) {
  if (n === 0) return 0;
  return add(n, sum(n - 1)); // 每次调用 add 有开销
}

// 优化:内联
function sum(n) {
  if (n === 0) return 0;
  return n + sum(n - 1); // 直接相加
}
```

### 12.5 用 BigInt 处理大数

阶乘结果超过 Number.MAX_SAFE_INTEGER 后会丢失精度:

```javascript
function factorialBigInt(n, acc = 1n) {
  if (n <= 1) return acc;
  return factorialBigInt(n - 1, BigInt(n) * acc);
}

console.log(factorialBigInt(100).toString());
// 93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000
```

### 12.6 Trampoline 性能优化

```javascript
// 反模式:每次都创建箭头函数
function fThunk(n, acc = 1) {
  if (n <= 1) return acc;
  return () => fThunk(n - 1, n * acc); // 每次创建新箭头函数
}

// 优化:复用 named function
function thunk(n, acc) {
  return () => fThunk(n, acc);
}
function fThunk(n, acc = 1) {
  if (n <= 1) return acc;
  return thunk(n - 1, n * acc);
}
```

---

## 13. 常见陷阱

### 13.1 基线条件缺失或错误

```javascript
// 反模式:无基线条件
function infinite(n) {
  return infinite(n + 1);
}
infinite(0); // 栈溢出

// 反模式:基线条件永远不满足
function wrongFactorial(n) {
  if (n = 0) return 1; // 错误:= 是赋值,永远为 0(假)
  return n * wrongFactorial(n - 1);
}
wrongFactorial(5); // 栈溢出
```

### 13.2 递归深度未限制

```javascript
// 反模式:深度递归未限制
function deepProcess(data) {
  if (data.next) {
    return process(data) + deepProcess(data.next);
  }
  return process(data);
}
deepProcess(hugeLinkedList); // 可能栈溢出

// 修复:限制深度或改迭代
function deepProcess(data, depth = 0, maxDepth = 10000) {
  if (depth > maxDepth) throw new Error('Too deep');
  if (data.next) {
    return process(data) + deepProcess(data.next, depth + 1, maxDepth);
  }
  return process(data);
}
```

### 13.3 误用递归处理大数据

```javascript
// 反模式:递归处理 100 万元素数组
function sum(arr) {
  if (arr.length === 0) return 0;
  return arr[0] + sum(arr.slice(1));
}
sum(hugeArray); // 栈溢出

// 修复:用 reduce 或 for
const total = hugeArray.reduce((acc, x) => acc + x, 0);
```

### 13.4 非尾递归误以为尾递归

```javascript
// 反模式:误以为这是尾递归
function f(n) {
  if (n <= 0) return 0;
  return 1 + f(n - 1); // 非尾递归:1 + ... 是后续操作
}

// 正确:尾递归
function f(n, acc = 0) {
  if (n <= 0) return acc;
  return f(n - 1, acc + 1);
}
```

### 13.5 严格模式遗漏

```javascript
// 反模式:期望 TCO 但未声明 strict
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc);
}
factorial(100000); // Safari 中仍栈溢出(未声明 strict)

// 修复:声明 strict
'use strict';
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc);
}
factorial(100000); // Safari 中不溢出
```

### 13.6 Trampoline 未正确返回 thunk

```javascript
// 反模式:直接调用而非返回 thunk
function fThunk(n, acc = 1) {
  if (n <= 1) return acc;
  return fThunk(n - 1, n * acc); // 直接调用,trampoline 失效
}
const f = trampoline(fThunk);
f(100000); // 栈溢出

// 修复:返回 thunk
function fThunk(n, acc = 1) {
  if (n <= 1) return acc;
  return () => fThunk(n - 1, n * acc); // 返回 thunk
}
const f = trampoline(fThunk);
f(100000); // 不溢出
```

### 13.7 CPS 嵌套过深

```javascript
// 反模式:CPS 嵌套过深,可读性差
function f(x, k) {
  g(x, (y) => {
    h(y, (z) => {
      i(z, (w) => {
        k(w);
      });
    });
  });
}

// 修复:用 async/await
async function f(x) {
  const y = await g(x);
  const z = await h(y);
  const w = await i(z);
  return w;
}
```

### 13.8 generator yield* 的递归陷阱

```javascript
// 反模式:yield* 仍是递归
function* deepTraverse(node) {
  if (!node) return;
  yield node.value;
  yield* deepTraverse(node.left);  // 递归
  yield* deepTraverse(node.right); // 递归
}
// 深树仍可能栈溢出

// 修复:用显式栈
function* deepTraverseSafe(root) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    yield node.value;
    stack.push(node.right);
    stack.push(node.left);
  }
}
```

---

## 14. 最佳实践

### 14.1 优先用迭代处理大数据

```javascript
// 反模式:递归处理大数组
function sum(arr) {
  if (arr.length === 0) return 0;
  return arr[0] + sum(arr.slice(1));
}

// 推荐:迭代
function sum(arr) {
  let total = 0;
  for (const x of arr) total += x;
  return total;
}
```

### 14.2 用尾递归表达线性递归

```javascript
// 推荐:尾递归 + 累加器
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc);
}
```

### 14.3 用 trampoline 保证栈安全

```javascript
// 推荐:trampoline 包装深递归
function fThunk(n, acc = 1) {
  if (n <= 1) return acc;
  return () => fThunk(n - 1, n * acc);
}
const f = trampoline(fThunk);
```

### 14.4 用显式栈处理树遍历

```javascript
// 推荐:显式栈
function traverse(root) {
  const stack = [root];
  const result = [];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    result.push(node.value);
    stack.push(node.right, node.left);
  }
  return result;
}
```

### 14.5 记忆化加速重复计算

```javascript
// 推荐:记忆化
const fib = memoize(function (n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
});
```

### 14.6 用 BigInt 处理大数

```javascript
function factorial(n, acc = 1n) {
  if (n <= 1) return acc;
  return factorial(n - 1, BigInt(n) * acc);
}
```

### 14.7 限制递归深度并降级

```javascript
function safeRecursion(fn, maxDepth = 10000) {
  let depth = 0;
  return function wrapped(...args) {
    if (++depth > maxDepth) {
      depth = 0;
      throw new RangeError('Depth exceeded');
    }
    try {
      return fn(...args);
    } finally {
      depth--;
    }
  };
}
```

### 14.8 跨引擎兼容

```javascript
const factorial = supportsTCO()
  ? /* 严格模式 + 尾递归 */
    (function () {
      'use strict';
      return function f(n, acc = 1) {
        if (n <= 1) return acc;
        return f(n - 1, n * acc);
      };
    })()
  : /* trampoline */
    trampoline(function f(n, acc = 1) {
      if (n <= 1) return acc;
      return () => f(n - 1, n * acc);
    });
```

---

## 15. 案例研究:深递归 JSON 处理器

### 15.1 需求

设计一个栈安全的 JSON 处理器,要求:

1. 解析深度嵌套的 JSON(>10000 层)
2. 支持遍历、修改、序列化
3. 不依赖引擎 TCO
4. 支持大文件流式处理

### 15.2 栈安全解析

```javascript
function safeJsonParse(str) {
  // 标准 JSON.parse 在深嵌套时会栈溢出
  // 这里实现简化版,仅作演示
  let i = 0;

  function parseValue() {
    skipWhitespace();
    const c = str[i];
    if (c === '{') return parseObject();
    if (c === '[') return parseArray();
    if (c === '"') return parseString();
    if (c === 't' || c === 'f') return parseBoolean();
    if (c === 'n') return parseNull();
    return parseNumber();
  }

  // 用显式栈替代递归
  function parseObject() {
    const obj = {};
    i++; // skip {
    skipWhitespace();
    if (str[i] === '}') { i++; return obj; }

    while (true) {
      skipWhitespace();
      const key = parseString();
      skipWhitespace();
      i++; // skip :
      const value = parseValue();
      obj[key] = value;
      skipWhitespace();
      if (str[i] === ',') { i++; continue; }
      if (str[i] === '}') { i++; break; }
    }
    return obj;
  }

  function parseArray() {
    const arr = [];
    i++; // skip [
    skipWhitespace();
    if (str[i] === ']') { i++; return arr; }

    while (true) {
      arr.push(parseValue());
      skipWhitespace();
      if (str[i] === ',') { i++; continue; }
      if (str[i] === ']') { i++; break; }
    }
    return arr;
  }

  function parseString() {
    let result = '';
    i++; // skip "
    while (str[i] !== '"') {
      if (str[i] === '\\') {
        i++;
        const c = str[i];
        if (c === 'n') result += '\n';
        else if (c === 't') result += '\t';
        else result += c;
      } else {
        result += str[i];
      }
      i++;
    }
    i++; // skip "
    return result;
  }

  function parseNumber() {
    let num = '';
    while (i < str.length && /[0-9eE+\-.]/.test(str[i])) {
      num += str[i++];
    }
    return Number(num);
  }

  function parseBoolean() {
    if (str.substr(i, 4) === 'true') { i += 4; return true; }
    i += 5; return false;
  }

  function parseNull() {
    i += 4; return null;
  }

  function skipWhitespace() {
    while (i < str.length && /\s/.test(str[i])) i++;
  }

  return parseValue();
}

// 深嵌套 JSON
const deep = '['.repeat(10000) + ']' .repeat(10000);
const parsed = safeJsonParse(deep); // 不栈溢出
console.log('Parsed depth:', getDepth(parsed));

function getDepth(arr) {
  let depth = 0;
  let current = arr;
  while (Array.isArray(current)) {
    depth++;
    current = current[0];
  }
  return depth;
}
```

### 15.3 栈安全遍历

```javascript
function safeTraverse(obj, visitor) {
  const stack = [{ value: obj, path: [] }];

  while (stack.length > 0) {
    const { value, path } = stack.pop();
    visitor(value, path);

    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        stack.push({ value: value[key], path: [...path, key] });
      }
    }
  }
}

// 使用
const data = { a: { b: { c: 1 } }, d: [2, 3] };
safeTraverse(data, (value, path) => {
  console.log(path.join('.'), ':', value);
});
```

### 15.4 栈安全序列化

```javascript
function safeStringify(obj) {
  const stack = [{ value: obj, indent: 0 }];
  let result = '';

  while (stack.length > 0) {
    const { value, indent } = stack.pop();

    if (value === null) {
      result += 'null';
    } else if (typeof value === 'string') {
      result += `"${value}"`;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result += String(value);
    } else if (Array.isArray(value)) {
      result += '[';
      for (let i = value.length - 1; i >= 0; i--) {
        stack.push({ value: value[i], indent: indent + 1 });
        if (i > 0) stack.push({ value: ',', indent });
      }
      result += ']';
    } else if (typeof value === 'object') {
      result += '{';
      const keys = Object.keys(value);
      for (let i = keys.length - 1; i >= 0; i--) {
        stack.push({ value: value[keys[i]], indent: indent + 1 });
        stack.push({ value: ',', indent });
        stack.push({ value: `"${keys[i]}":`, indent });
      }
      result += '}';
    }
  }

  return result;
}
```

### 15.5 设计权衡

1. **解析**:用显式栈替代递归,代价是代码复杂度增加
2. **遍历**:广度优先用队列,深度优先用栈
3. **序列化**:简化版未处理缩进、循环引用、特殊字符
4. **性能**:比原生 JSON.parse 慢 10-100 倍,仅用于深嵌套场景
5. **生产**:优先用原生 JSON.parse,仅深嵌套时降级

---

## 16. 与迭代的对比

### 16.1 递归 vs 迭代

| 方面       | 递归                | 迭代                |
| ---------- | ------------------- | ------------------- |
| 可读性     | 高(贴近问题定义)   | 中(需手动管理状态)|
| 栈使用     | 高(每层一帧)       | 低(常数)          |
| 性能       | 慢(调用开销)       | 快(直接跳转)      |
| 适用场景   | 树形、分治、回溯    | 线性、简单循环      |
| 调试       | 栈帧清晰            | 状态变量难追踪      |
| 错误风险   | 栈溢出              | 死循环              |

### 16.2 尾递归 vs 迭代

尾递归在数学上等价于迭代:

```javascript
// 尾递归
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc);
}

// 等价迭代
function factorial(n) {
  let acc = 1;
  while (n > 1) {
    acc *= n;
    n--;
  }
  return acc;
}
```

支持 TCO 的引擎将尾递归编译为迭代,性能等同。

### 16.3 trampoline vs 直接迭代

```javascript
// trampoline
function fThunk(n, acc = 1) {
  if (n <= 1) return acc;
  return () => fThunk(n - 1, n * acc);
}
const f = trampoline(fThunk);

// 直接迭代
function f(n) {
  let acc = 1;
  while (n > 1) {
    acc *= n;
    n--;
  }
  return acc;
}
```

直接迭代性能最优,但 trampoline 保留递归结构,适合复杂场景(如互递归)。

### 16.4 CPS vs async/await

```javascript
// CPS
function fCPS(x, k) {
  g(x, (y) => h(y, (z) => k(z)));
}

// async/await
async function f(x) {
  const y = await g(x);
  const z = await h(y);
  return z;
}
```

async/await 是 CPS 的语法糖,可读性远高于裸 CPS。

### 16.5 选择指南

| 场景                     | 推荐            |
| ------------------------ | --------------- |
| 简单线性计算             | 迭代            |
| 树形/分治/回溯           | 递归(限制深度) |
| 深线性递归               | 尾递归+TCO 或 trampoline |
| 互递归                   | trampoline      |
| 异步递归                 | async/await     |
| 大数据处理               | 迭代 + 流式     |

---

### 17.1 基础题

**题 1**(填空):尾调用是指函数的 ______ 是调用另一个函数,且 ______。TCO 是指引擎在尾调用时 ______ 当前栈帧,直接跳转到目标函数。

**题 2**(选择):以下哪个函数是尾递归?

```javascript
A. function f(n) { return n * f(n - 1); }
B. function f(n, acc = 1) { if (n <= 1) return acc; return f(n - 1, n * acc); }
C. function f(n) { return 1 + f(n - 1); }
D. function f(n) { const r = f(n - 1); return r * n; }
```

**题 3**(选择):ES6 的 PTC(P roper Tail Calls)在哪些引擎中实现?

```
A. V8(Chrome/Node.js)
B. SpiderMonkey(Firefox)
C. JSC(Safari)
D. 所有引擎
```

### 17.2 中级题

**题 4**(代码改写):将以下树形递归斐波那契改写为尾递归形式。

```javascript
function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
```

**题 5**(代码编写):用 trampoline 实现一个栈安全的互递归 isEven/isOdd,要求 isEven(1000000) 不栈溢出。

**题 6**(分析):分析以下代码在 V8 中调用 deepRecursion(100000) 的行为。

```javascript
function deepRecursion(n) {
  if (n === 0) return 0;
  return 1 + deepRecursion(n - 1);
}
deepRecursion(100000);
```

### 17.3 高级题

**题 7**(开放设计):设计一个通用的"递归转迭代"工具函数,要求:

1. 接收任意递归函数
2. 自动用显式栈模拟调用栈
3. 支持 return 值与中间状态
4. 不依赖 TCO 或 generator

请写出完整实现并讨论与 trampoline、CPS 的对比。

**题 8**(开放设计):设计一个"递归 DSL",让用户用声明式语法描述递归,编译为栈安全的迭代代码。要求:

1. 支持基线条件、递归条件
2. 支持多个递归调用(树形)
3. 支持累加器
4. 支持异步递归

请写出 DSL 设计与示例代码,讨论与手写 trampoline 的优劣。

### 19.1 规范与标准

- **ECMAScript Tail Position Calls**: <https://tc39.es/ecma262/#sec-tail-position-calls>
- **Scheme R5RS Proper Tail Recursion**: <https://schemers.org/Documents/Standards/R5RS/HTML/>
- **STC Proposal**: <https://github.com/tc39/proposal-ptc-syntactic-opt-in>

### 19.2 经典论文与书籍

- *SICP* (Abelson & Sussman, 1996)
- *LAMBDA: The Ultimate GOTO* (Steele, 1977)
- *Compiling with Continuations* (Appel, 1992)
- *Essentials of Programming Languages* (Friedman & Wand, 1984)
- *The Little Schemer* (Friedman & Felleisen)

### 19.3 教程与博客

- *Exploring ES6: Tail Call Optimization* (Rauschmayer): <https://exploringjs.com/es6/ch_tail-calls.html>
- *Proper Tail Calls in ECMAScript 6* (Mozilla Hacks): <https://hacks.mozilla.org/>
- *V8 tail call optimization* (V8 Blog): <https://v8.dev/blog/es6#tail-calls>

### 19.4 开源实现

- **Babel tail-call plugin**: <https://babeljs.io/docs/babel-plugin-transform-...">
- **Ramda trampoline**: <https://ramdajs.com/docs/#trampoline>
- **redux-saga**: <https://redux-saga.js.org/> (generator-based recursion)

### 19.5 相关主题

- Lambda Calculus(λ 演算)
- Y Combinator(Y 组合子)
- Continuation(续延)
- call/cc(call-with-current-continuation)
- Generator 与 async/await
- 状态机转换

### 19.6 进阶主题

- 函数式编程中的递归
- 惰性求值与流
- 不动点组合子
- 类型系统中的递归(μ 类型)
- Coq/Agda 中的结构递归
- Total functional programming(全函数式编程)

---

## 附录 A:递归模式速查

### A.1 线性递归

```javascript
function f(n) {
  if (base) return value;
  return op(n, f(n - 1));
}
```

### A.2 尾递归

```javascript
function f(n, acc = initial) {
  if (base) return acc;
  return f(n - 1, op(n, acc));
}
```

### A.3 树形递归

```javascript
function f(n) {
  if (base) return value;
  return op(f(n - 1), f(n - 2));
}
```

### A.4 互递归

```javascript
function f(n) {
  if (base) return value;
  return g(n - 1);
}
function g(n) {
  if (base) return value;
  return f(n - 1);
}
```

### A.5 分治递归

```javascript
function f(problem) {
  if (small(problem)) return solve(problem);
  const [p1, p2] = split(problem);
  return combine(f(p1), f(p2));
}
```

### A.6 回溯递归

```javascript
function f(state) {
  if (accept(state)) return [state];
  if (reject(state)) return [];
  return candidates(state).flatMap(c => f(extend(state, c)));
}
```

---

## 附录 B:TCO 判定流程

```mermaid
flowchart TD
    A[return g(otherArgs)] --> B{是 return 语句吗?}
    B -- No --> N1[非尾调用]
    B -- Yes --> C{return 后只有函数调用吗?<br/>（无 +1、*n、||、&&、??、await、yield）}
    C -- No --> N2[非尾调用]
    C -- Yes --> D{是否在 try/catch/finally 中?}
    D -- Yes --> N3[非尾调用]
    D -- No --> E{是否访问 arguments 或 this?}
    E -- Yes --> N4[非尾调用]
    E -- No --> F{是否处于 strict mode?}
    F -- No --> N5[非尾调用]
    F -- Yes --> G[是尾调用，引擎应优化（TCO）]
```

---

## 附录 C:trampoline 实现对比

### C.1 基础版

```javascript
function trampoline(fn) {
  return function (...args) {
    let result = fn(...args);
    while (typeof result === 'function') {
      result = result();
    }
    return result;
  };
}
```

### C.2 异步版

```javascript
async function asyncTrampoline(fn) {
  return async function (...args) {
    let result = fn(...args);
    while (result instanceof Promise || typeof result === 'function') {
      if (typeof result === 'function') {
        result = result();
      } else {
        result = await result;
      }
    }
    return result;
  };
}
```

### C.3 Ramda 风格

```javascript
const trampoline = (fn) => (...args) => {
  let result = fn(...args);
  while (typeof result === 'function') {
    result = result();
  }
  return result;
};
```

### C.4 带深度限制版

```javascript
function safeTrampoline(fn, maxBounces = 1000000) {
  return function (...args) {
    let result = fn(...args);
    let bounces = 0;
    while (typeof result === 'function') {
      if (++bounces > maxBounces) {
        throw new RangeError(`Trampoline exceeded ${maxBounces} bounces`);
      }
      result = result();
    }
    return result;
  };
}
```

---

## 附录 D:CPS 转换规则

### D.1 基本规则

| 直接风格                | CPS                                |
| ----------------------- | ---------------------------------- |
| `return v`              | `return k(v)`                      |
| `return f(a)`           | `return f_cps(a, k)`               |
| `return e1 + e2`        | `return e1_cps((v1) => e2_cps((v2) => k(v1 + v2)))` |
| `if (c) e1 else e2`     | `if (c) e1_cps(k) else e2_cps(k)`  |
| `let x = e1 in e2`      | `e1_cps((v1) => { let x = v1; return e2_cps(k); })` |

### D.2 示例

```javascript
// 直接风格
function fact(n) {
  if (n <= 1) return 1;
  return n * fact(n - 1);
}

// CPS 转换
function factCPS(n, k) {
  if (n <= 1) return k(1);
  return factCPS(n - 1, (v) => k(n * v));
}

// 调用
factCPS(5, (r) => console.log(r)); // 120
```

### D.3 高阶函数的 CPS

```javascript
// 直接风格
function map(arr, f) {
  if (arr.length === 0) return [];
  return [f(arr[0]), ...map(arr.slice(1), f)];
}

// CPS
function mapCPS(arr, f, k) {
  if (arr.length === 0) return k([]);
  return f(arr[0], (v1) =>
    mapCPS(arr.slice(1), f, (rest) => k([v1, ...rest]))
  );
}

mapCPS([1, 2, 3], (x, k) => k(x * 2), (r) => console.log(r)); // [2, 4, 6]
```

---

## 附录 E:递归与栈帧对比

### E.1 非尾递归的栈

```text
fact(4) 调用时:
[fact(4): n=4, ret=乘 4]
  [fact(3): n=3, ret=乘 3]
    [fact(2): n=2, ret=乘 2]
      [fact(1): n=1, ret=返回 1]  ← 触发基线

返回时(逐层弹出):
[fact(1)] → 返回 1
[fact(2)] → 2 * 1 = 2,返回 2
[fact(3)] → 3 * 2 = 6,返回 6
[fact(4)] → 4 * 6 = 24,返回 24
```

### E.2 尾递归的栈(支持 TCO)

```
fact(4, 1) 调用:
[fact(4, 1)]  ← 初始

TCO 优化后(复用栈帧):
[fact(3, 4)]  ← 复用,不压新帧
[fact(2, 12)] ← 复用
[fact(1, 24)] ← 复用,触发基线

返回:24
```

栈深度始终为 1,而非 4。

### E.3 trampoline 的"堆栈"

```
factThunk(4, 1) 调用:
返回 () => factThunk(3, 4)
trampoline 调用该 thunk:
返回 () => factThunk(2, 12)
trampoline 调用该 thunk:
返回 () => factThunk(1, 24)
trampoline 调用该 thunk:
返回 24(非函数,trampoline 停止)

栈深度始终为 1(主循环),thunk 在堆上创建。
```

---

## 附录 F:常见错误对照表

| 错误                          | 原因                          | 解决                          |
| ----------------------------- | ----------------------------- | ----------------------------- |
| RangeError: Maximum call stack | 递归过深                     | 改迭代或 trampoline           |
| 无限递归(卡死)              | 基线条件缺失或错误            | 检查基线条件                  |
| 性能慢(指数级)              | 树形递归重复计算              | 记忆化或改尾递归              |
| 精度丢失(大数)              | Number 超过 MAX_SAFE_INTEGER | 用 BigInt                     |
| TCO 不生效                    | 非严格模式或非尾位置          | 加 'use strict' 与检查尾位置  |
| trampoline 不工作             | 未返回 thunk                  | 检查是否返回 () => fn(...)    |
| CPS 嵌套过深                  | 续延嵌套                      | 改用 async/await              |
| generator yield* 递归溢出     | yield* 仍递归                 | 用显式栈替代                  |

---

## 附录 G:引擎栈大小对比

| 引擎              | 默认栈大小       | 最大递归深度(简单函数) |
| ----------------- | ---------------- | ----------------------- |
| V8(Chrome/Node)  | ~1 MB            | ~10000-15000            |
| SpiderMonkey(Firefox) | ~2-3 MB      | ~20000-30000            |
| JSC(Safari)      | ~2-4 MB          | ~30000-50000            |
| Bun(JSC)         | ~2-4 MB          | ~30000-50000            |
| Deno(V8)         | ~1 MB            | ~10000-15000            |

注:实际深度受帧大小、参数数量、闭包大小影响。

---

## 附录 H:递归与数学

### H.1 数学归纳法

递归与数学归纳法对应:

- **基线条件**:归纳基础(Base Case)
- **递归条件**:归纳步骤(Inductive Step)

证明递归正确性:

1. 证明基线正确
2. 假设 f(k) 正确,证明 f(k+1) 正确(或 f(n-1) 正确,证明 f(n) 正确)

### H.2 递归关系

递归函数的时间复杂度通常用递归关系(Recurrence Relation)表示:

- $T(n) = T(n-1) + O(1)$:线性递归,$T(n) = O(n)$
- $T(n) = 2T(n-1) + O(1)$:指数递归,$T(n) = O(2^n)$
- $T(n) = 2T(n/2) + O(n)$:分治,$T(n) = O(n \log n)$
- $T(n) = T(n/2) + O(1)$:二分,$T(n) = O(\log n)$

### H.3 主定理(Master Theorem)

对于 $T(n) = aT(n/b) + f(n)$:

- 若 $f(n) = O(n^{\log_b a - \epsilon})$,则 $T(n) = \Theta(n^{\log_b a})$
- 若 $f(n) = \Theta(n^{\log_b a})$,则 $T(n) = \Theta(n^{\log_b a} \log n)$
- 若 $f(n) = \Omega(n^{\log_b a + \epsilon})$,则 $T(n) = \Theta(f(n))$

应用:

- 归并排序:$T(n) = 2T(n/2) + O(n) = O(n \log n)$
- 二分查找:$T(n) = T(n/2) + O(1) = O(\log n)$
- 朴素矩阵乘法(Strassen 前):$T(n) = 8T(n/2) + O(n^2) = O(n^3)$

---

## 附录 I:递归在实际项目中的应用

### I.1 DOM 树遍历

```javascript
function traverseDOM(node, visitor) {
  visitor(node);
  node.childNodes.forEach((child) => traverseDOM(child, visitor));
}

// 栈安全版
function traverseDOMSafe(root, visitor) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    visitor(node);
    // 逆序压入,保证顺序
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      stack.push(node.childNodes[i]);
    }
  }
}
```

### I.2 JSON Schema 验证

```javascript
function validateSchema(data, schema, path = '') {
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null) {
      throw new Error(`${path}: expected object`);
    }
    for (const key in schema.properties) {
      validateSchema(data[key], schema.properties[key], `${path}.${key}`);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      throw new Error(`${path}: expected array`);
    }
    data.forEach((item, i) => {
      validateSchema(item, schema.items, `${path}[${i}]`);
    });
  }
  // ...
}
```

### I.3 AST 遍历

```javascript
function traverseAST(node, visitors) {
  const visitor = visitors[node.type];
  if (visitor) visitor(node);
  for (const key in node) {
    if (Array.isArray(node[key])) {
      node[key].forEach((child) => traverseAST(child, visitors));
    } else if (node[key] && typeof node[key] === 'object') {
      traverseAST(node[key], visitors);
    }
  }
}

// 用法(简化 Babel 风格)
traverseAST(ast, {
  FunctionDeclaration(node) {
    console.log('Found function:', node.id.name);
  },
});
```

### I.4 文件系统遍历

```javascript
const fs = require('fs');
const path = require('path');

function traverseDir(dir, visitor) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    visitor(fullPath, entry);
    if (entry.isDirectory()) {
      traverseDir(fullPath, visitor);
    }
  }
}

// 栈安全版(异步)
async function traverseDirSafe(root, visitor) {
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      await visitor(fullPath, entry);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      }
    }
  }
}
```

---

## 附录 J:术语表

| 术语                | 英文                       | 含义                                                |
| ------------------- | -------------------------- | --------------------------------------------------- |
| 递归                | Recursion                  | 函数调用自身                                       |
| 基线条件            | Base Case                  | 递归停止的条件                                     |
| 递归条件            | Recursive Case             | 将问题分解为更小的子问题                          |
| 调用栈              | Call Stack                 | 存储函数调用帧的栈结构                             |
| 栈帧                | Stack Frame                | 调用栈中的一帧,保存返回地址、参数、局部变量       |
| 尾调用              | Tail Call                  | 函数最后一步调用另一函数,无后续操作               |
| 尾递归              | Tail Recursion             | 函数在尾位置调用自身                              |
| TCO                 | Tail Call Optimization     | 尾调用优化,引擎释放栈帧的优化                     |
| PTC                 | Proper Tail Calls          | ES6 规范的尾调用术语,要求 strict mode             |
| STC                 | Syntactic Tail Calls       | 显式语法标记尾调用的提案(未通过)                 |
| trampoline          | Trampoline                 | 将递归转为迭代的通用技术,通过 thunk 反复调用      |
| thunk               | Thunk                      | 零参函数,延迟计算                                 |
| CPS                 | Continuation-Passing Style | 续延传递风格,函数不直接返回而传给续延             |
| 续延                | Continuation               | 程序剩余的计算                                    |
| call/cc             | call-with-current-continuation | Scheme 的续延捕获原语                        |
| 不动点              | Fixed Point                | 满足 F(f) = f 的 f                                |
| Y 组合子            | Y Combinator               | 计算不动点的高阶函数                              |
| 记忆化              | Memoization                | 缓存函数结果,避免重复计算                         |
| 互递归              | Mutual Recursion           | 两个或多个函数相互调用                             |
| 分治                | Divide and Conquer         | 将问题分为独立子问题,合并结果                     |
| 回溯                | Backtracking               | 尝试所有可能,失败时回退                           |
| 数学归纳法          | Mathematical Induction     | 证明递归正确性的数学方法                           |
| 递归关系            | Recurrence Relation        | 用递归形式表示的时间复杂度                         |
| 主定理              | Master Theorem             | 求解分治递归时间复杂度的定理                       |

---

> 本文档基于 ECMAScript 2025 规范、SICP、Scheme R5RS 与 V8 工程实践编写,涵盖递归的形式化定义、尾调用与 TCO 规范、trampoline 与 CPS、栈溢出防护、性能优化、实战案例等内容,旨在作为 MIT/Stanford/CMU 级别的工程教学材料。如需进一步深入,请参阅参考文献与延伸阅读章节。
