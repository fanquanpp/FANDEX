---
order: 240
title: 递归算法模式：互递归、记忆化、分治与回溯
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 承接递归基础的进阶模式集：互递归、记忆化驯服树形递归、二分查找与快速排序的分治骨架、回溯的"选择-递归-撤销"三拍子、显式栈与队列把超深树迭代化，附 CPS 续延与蹦床的完整实现，每类模式配可运行代码与验收标准。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'javascript/160-RecursionTailCallOptimization'
  - 'javascript/150-HigherOrderFunction'
  - 'javascript/320-GeneratorFunctions'
  - 'javascript/060-ControlFlow'
prerequisites:
  - 'javascript/160-RecursionTailCallOptimization'
---

## 前置知识

- 已完成 [递归与尾调用](/javascript/160-RecursionTailCallOptimization)：会写递归三要素，理解调用栈与爆栈原因；
- 会用 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod)：map、filter、reduce。

本文是一篇"模式集"：160 篇解决了"递归怎么写对、为什么会爆"，这里收录五类反复出现的进阶模式。每个模式独立成节，可以按需跳读；读一篇就能在业务代码里用上一段时间。

## 学习目标

读完本文你将能够：

1. 用互递归表达"两类节点交替处理"的逻辑（如表达式求值、奇偶判定）；
2. 用记忆化把树形递归从指数级降到线性级，并解释代价与适用条件；
3. 认出分治骨架（二分查找、快速排序）并在"有序数据找东西"的场景直接套用；
4. 用"选择-递归-撤销"三拍子写出回溯（全排列、组合）；
5. 用显式栈/队列把超深结构改成不爆栈的迭代遍历，并说出 DFS 与 BFS 的选型差异；
6. 认出 CPS 与蹦床的代码形状，读懂使用它们的库代码。

预计 60 到 80 分钟，含 4 道练习。

## 1. 你现在要解决什么问题

160 篇的结尾留了一句话："数据是树就用递归"。真到业务里，树不止一种形态，递归的写法也随之分岔：

- 文档站的公式渲染器要解析 `2 * (3 + 4)`——括号里是表达式，表达式里还有括号，**"表达式"和"数字"两类节点交替出现**，单函数递归写不顺；
- 推荐系统的相似文档计算里有斐波那契形状的树形递归，朴素写法慢到无法上线；
- 侧边栏目录是树，但**深度可能上百层**（自动生成的目录会把整个标题层级摊平），递归遍历直接爆栈。

这四种困境各有名字：互递归、记忆化、分治、显式栈迭代。本文逐个给出可直接套用的骨架。

## 2. 互递归：两个函数互相调用

最小例子先建立感觉——用互递归判奇偶：

```javascript
function isEven(n) {
  if (n === 0) return true;
  return isOdd(n - 1);
}

function isOdd(n) {
  if (n === 0) return false;
  return isEven(n - 1);
}

console.log(isEven(10));   // true
console.log(isOdd(7));     // true
```

单看每个函数都依赖对方，合起来才是完整定义。业务里它真正的用武之地是**语法结构**。"表达式"与"括号项"是两类节点：表达式由项用加号连成，项要么是数字、要么是括号包着的表达式——两个函数交替处理最自然：

```javascript
// 极简求值器：支持数字、加号与括号，如 '2+(3+(4))'
function evalExpr(tokens) {
  let value = evalItem(tokens);          // 第一项：数字或括号组
  while (tokens[0] === '+') {
    tokens.shift();                      // 吃掉 '+'
    value += evalItem(tokens);           // 加号后面又是一项
  }
  return value;
}

function evalItem(tokens) {
  const first = tokens.shift();
  if (first === '(') {
    const inner = evalExpr(tokens);      // 括号里是完整表达式：互递归点
    tokens.shift();                      // 吃掉 ')'
    return inner;
  }
  return Number(first);
}

console.log(evalExpr(['2', '+', '(', '3', '+', '(', '4', ')', ')']));
// 9
```

判断标志：当你发现"A 的处理过程里要处理 B，B 的处理过程里又要处理 A"，且两个函数各自有干净的基线条件——就拆成互递归，不要硬塞进一个函数里用布尔开关来回切。

## 3. 记忆化：给树形递归装缓存

经典的斐波那契是"树形递归"：每个调用分岔出两个子问题，子问题里又有大量重复：

```javascript
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

console.time('朴素版');
console.log(fib(35));          // 9227465
console.timeEnd('朴素版');     // 量级：数十到上百毫秒，且随 n 指数增长
```

`fib(35)` 内部实际算了约 2900 万次函数调用，因为 `fib(30)`、`fib(29)`……每个都被重复计算了天文数字遍。记忆化的修法朴素得可爱：**算过的存起来，再问直接查**：

```javascript
function fibMemo(n, cache = new Map()) {
  if (n <= 1) return n;
  if (cache.has(n)) return cache.get(n);

  const result = fibMemo(n - 1, cache) + fibMemo(n - 2, cache);
  cache.set(n, result);
  return result;
}

console.time('记忆化');
console.log(fibMemo(35));      // 9227465
console.timeEnd('记忆化');     // 量级：零点几毫秒，快三个数量级
```

复杂度从 O(2 的 n 次方) 降到 O(n)，代价是一个 Map 的内存。170 篇的 `memoizeBy` 与这里的 cache 是同一个思想——**"参数相同则结果相同"的纯函数才能安全缓存**；函数依赖外部可变状态（时间、随机数、网络）时，记忆化会缓存出错误结果。

适用判断两条：子问题大量重叠（像 fib 这样反复重算同一参数）、函数是纯函数。不满足时硬加缓存只会白费内存。

## 4. 分治：二分查找与快速排序的公共骨架

分治三拍子：**拆一半、递归解、合结果**。

有序数组里找目标，线性找要 n 步，二分只要 log 级：

```javascript
function binarySearch(sorted, target) {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;        // 取中点，位运算等价于 Math.floor((lo+hi)/2)
    if (sorted[mid] === target) return mid;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

console.log(binarySearch([1, 3, 5, 7, 9, 11], 7));   // 3
```

注意这个实现用 while 而不是递归——尾递归形状的逻辑改循环是零成本的（160 篇的规则），且避免了边界参数的层层传递。快速排序则是"教科书式递归"，递归版更贴近思维：

```javascript
function quickSort(arr) {
  if (arr.length <= 1) return arr;                       // 基线
  const [pivot, ...rest] = arr;                          // 拆
  const left = rest.filter((x) => x < pivot);            // 小的一半
  const right = rest.filter((x) => x >= pivot);          // 大的一半
  return [...quickSort(left), pivot, ...quickSort(right)];  // 递归 + 合
}

console.log(quickSort([5, 2, 9, 1, 7]));   // [1, 2, 5, 7, 9]
```

生产排序请用内置 `Array.prototype.sort`（引擎里的实现针对真实数据做了大量优化），`quickSort` 的价值是**读懂分治骨架**：基线、拆、递归、合。凡能把问题"拆成同构的一半"的场景（在有序日志里定位时间点、在版本区间里找引入 bug 的提交、归并两份有序列表）都能套它。

## 5. 回溯：选择、递归、撤销

回溯解决"枚举所有可能，走不通就退回来"的问题。骨架永远是三拍子：**做选择，递归，撤销选择**。全排列：

```javascript
function permute(items) {
  const result = [];

  function backtrack(path, remaining) {
    if (remaining.length === 0) {
      result.push([...path]);            // 收集一份完整排列的副本
      return;
    }
    for (let i = 0; i < remaining.length; i += 1) {
      path.push(remaining[i]);                        // 1. 选择
      backtrack(path, [...remaining.slice(0, i), ...remaining.slice(i + 1)]);  // 2. 递归
      path.pop();                                     // 3. 撤销
    }
  }

  backtrack([], items);
  return result;
}

console.log(permute(['a', 'b', 'c']));
// [['a','b','c'], ['a','c','b'], ['b','a','c'], ['b','c','a'], ['c','a','b'], ['c','b','a']]
```

最容易写错的是第 1 步与第 3 步必须严格配对——push 了什么就 pop 什么，漏一个 pop，下一轮的 path 就带着脏数据。收集结果时 `[...path]` 的浅拷贝也不能省，否则最后 result 里装的是同一个数组的六次引用。业务里它管"表单校验规则的组合尝试""路由匹配的候选回退""日程冲突的换位搜索"这类"试错并回头"的需求；状态空间大时要先加剪枝（明显无解的分支提前 return），否则组合爆炸。

## 6. 显式栈与队列：把超深结构迭代化

160 篇说过：递归遍历上万层的平铺链会爆栈。解法不是尾递归（V8 不优化），而是**把"调用栈"换成自己管理的数组**——递归的本质就是栈，那就不劳驾调用栈：

```javascript
// 深度优先（DFS）：用栈，后进先出
function walkDepth(root, visit) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    visit(node);
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      stack.push(node.children[i]);    // 逆序压入，保证左孩子先处理
    }
  }
}

// 广度优先（BFS）：用队列，先进先出——"一层一层扫"
function walkBreadth(root, visit) {
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    visit(node);
    for (const child of node.children) {
      queue.push(child);
    }
  }
}
```

两万层深的链式结构，两个版本都不会爆栈——数组再长也只是一个普通对象。选型口诀：**要"离根近的先处理"（目录树一层层展开渲染、按层级发通知）用 BFS；要"一条线走到底"（找最深路径、依赖链追根、文件系统递归删除）用 DFS。**

## 7. CPS 与蹦床：认识它们的形状即可

**CPS（续延传递风格）**：函数不返回结果，而是把"结果交给谁"当参数传进来。Node 早期的错误优先回调就是它的工程化变体：

```javascript
// 直接风格：结果用 return 给
function add(a, b) { return a + b; }

// CPS：结果通过回调交出去
function addCps(a, b, k) { k(a + b); }

addCps(1, 2, (sum) => console.log(sum));   // 3
```

为什么要认识它？第一，读老 Node 代码和回调地狱文献时它是背景知识；第二，现代异步的 `await` 本质上由编译器自动做了 CPS 变换（await 之后的代码被改写进"续延"），理解 CPS 就理解了 async/await 在引擎里长什么样。手写 CPS 只在解析器、编译器类代码中出现。

**蹦床**的完整形状在 160 篇给过（返回"下一步函数"、while 驱动）。它和本文第 6 节的显式栈是同一思想的两个变体：**把"栈的管理权"从引擎手里接过来**。区别只在：显式栈适合"遍历现成的树"，蹦床适合"计算本身就是递归定义"的场景（超大的累加、状态机）。

## 8. 小练习

预测题（5 分钟）：`fibMemo(100)` 与朴素 `fib(100)` 分别会发生什么？先写出预测再运行（朴素版如果超过 10 秒，直接中断）。

答案：记忆化版毫秒级返回 354224848179261915075；朴素版在指数爆炸中几乎算不完——这就是"子问题重叠"是否存在的量级差。

修改题（10 分钟）：给第 4 节的 `quickSort` 加"三路划分"：与 pivot 相等的元素不再参与左右递归。验收：对 `[2, 1, 2, 2, 3]` 排序时，递归层数明显减少（大数组全相同元素时从 O(n 方) 降到 O(n)）。

修 Bug 题（15 分钟）：下面的回溯想枚举所有子集，真实症状是：结果里出现重复元素、且部分结果长度不对。按"选择与撤销是否配对、收集是否拷贝"两步排查修复：

```javascript
function subsets(items) {
  const result = [];
  function backtrack(path, start) {
    result.push(path);
    for (let i = start; i < items.length; i += 1) {
      path.push(items[i]);
      backtrack(path, i + 1);
    }
  }
  backtrack([], 0);
  return result;
}

console.log(subsets([1, 2, 3]));
// 期望 8 个子集，实际是 8 个指向同一个数组的引用，内容全部一样
```

提示：两处错——`result.push(path)` 要改成 `[...path]`；循环里 push 之后缺 `path.pop()`。

挑战题（40 分钟，脱离示例）：结合本文两个模式，实现"嵌套评论树的最大回复深度"函数 `maxDepth(comment)`：递归版一行核心逻辑；再实现迭代版 `maxDepthIterative(comment)` 用显式队列（BFS 层计数法）。验收：在 160 篇的 `commentTree` 上两者都返回 3；用循环构造 50000 层的链式对象，递归版爆栈、迭代版正常返回 50000。

提示（思路方向）：BFS 计深度 = 每处理完"当前层的全部节点"深度加一。展开（关键 API）：while + 临时数组分层，或队列元素携带 depth。

## 9. 与之前和之后的知识的关系

- 往前：160 篇的三要素与调用栈模型是本文每个模式的地基；170 篇的 `memoizeBy` 与第 3 节的手写记忆化互为印证；
- 往后：[生成器函数](/javascript/320-GeneratorFunctions) 提供"暂停-继续"的遍历抽象，深树遍历可以写成 `function*` 惰性逐个产出；[异步并发控制](/javascript/280-AsyncConcurrencyControl) 的任务队列与本文 BFS 的队列同构；[Iterator Helper](/javascript/310-IteratorHelper) 展示"惰性管道"如何避免中间数组——与分治一节的 `filter` 两次拷贝形成对照。

## 10. 官方文档

- MDN Map（记忆化的容器）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map
- MDN Array.prototype.sort（生产排序）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
- MDN 递归（术语页）：https://developer.mozilla.org/zh-CN/docs/Glossary/Recursion

## 自我检查

- 能识别"两类节点交替"并改写成互递归，说出拆函数的判断标志；
- 能解释记忆化为什么必须配合纯函数，并用 cache 参数解释 fibMemo 的调用链；
- 能背出回溯三拍子，并指出 push/pop 不配对、收集不拷贝这两类经典错误；
- 面对"两万层结构"，能直接写出显式栈版遍历，并说出 DFS 与 BFS 各自的适用场景。

## 本章总结

互递归用两个函数表达交替结构；记忆化用 Map 缓存驯服子问题重叠的树形递归（前提是纯函数）；分治的"拆半-递归-合并"骨架覆盖二分查找与快速排序；回溯的三拍子"选择-递归-撤销"专门枚举所有可能，push 与 pop 必须配对；超深结构把调用栈换成显式栈/队列，DFS 用栈、BFS 用队列，按"一条线走到底还是一层层扫"选型；CPS 与蹦床认识形状即可，前者是 async/await 的底层原型，后者是把栈管理权接到手里的极端手段。

## 下一步

进入 [生成器函数](/javascript/320-GeneratorFunctions)：本文的迭代遍历是"一口气跑完"，生成器能把遍历过程做成"按需逐个产出"——深树遍历、无限序列、异步流程控制（async/await 的前身）都靠它。
