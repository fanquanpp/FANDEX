---
order: 80
title: 函数、作用域与闭包：不重复自己
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从「结算逻辑复制三遍，改一处漏两处」讲起：参数与返回值、函数声明与表达式、作用域链、闭包「函数记住了出生地」与最小计数器、箭头函数预告、rest 参数，附 xxx is not a function 与 Cannot access 调试实录。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'javascript/070-ObjectArray'
  - 'javascript/090-ArrayHigherOrderMethod'
  - 'javascript/100-ThisKeywordDeepDive'
  - 'javascript/150-HigherOrderFunction'
  - 'javascript/350-MemoryManagementAndGarbageCollection'
  - 'python/100-FunctionDetailed'
prerequisites:
  - 'javascript/070-ObjectArray'
  - 'javascript/040-VariableDataType'
---

## 前置知识

- 已完成 [对象与数组](/javascript/070-ObjectArray)：会对象字面量、数组下标、`push`/`pop` 与 for-of 遍历玩家数组；
- 已完成 [变量与数据类型](/javascript/040-VariableDataType)：会 `let`/`const` 声明，知道七种原始类型。

没学过 070 也能跟：示例只用最简单的对象和数组，用到就解释。这是模块承上启下的一篇——前面的零件在这里组装成「能复用的程序」。

## 学习目标

读完本文你将能够：

1. 把复制三遍的结算逻辑封装成一个函数，说清「参数进、返回值出」的数据流；
2. 区分函数声明与函数表达式，预测哪种能在定义之前调用、哪种会报错；
3. 预测嵌套代码里变量的查找路径，解释内层与外层同名时谁赢；
4. 用「函数记住了出生地」解释计数器为什么能一直计数，并写出最小闭包示例；
5. 用 rest 参数写出接收任意多个参数的求和函数，并读懂 `TypeError: xxx is not a function` 报错。

预计 60 到 75 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

游戏商店有三处要做结算：购买道具、批量补货、会员礼包。每处的规则一模一样——打九折、加 5 元邮费、算总价。你当时的选择是复制粘贴：

```javascript
// 购买道具
const itemTotal = 80 * 0.9 + 5;
console.log('道具结算：' + itemTotal);

// 批量补货
const bulkTotal = 300 * 0.9 + 5;
console.log('补货结算：' + bulkTotal);

// 会员礼包
const giftTotal = 150 * 0.9 + 5;
console.log('礼包结算：' + giftTotal);
```

预期输出：

```text
道具结算：77
补货结算：275
礼包结算：140
```

能跑。直到策划说「改成八五折」。你改了第一处的 `0.9`，想着待会儿改剩下的——然后忘了。上线后同一批商品两个价。**复制粘贴不是省事，是埋雷：三份一样的逻辑，改一处漏两处。**

（Python 模块的 [函数详解](/python/100-FunctionDetailed) 开场是同一个案例，解法也一样：封装成函数。本篇按 JS 的写法走一遍，顺手补上 JS 特有的作用域链、闭包与箭头函数。）

## 2. 最小可运行示例：一个函数管所有结算

保存为 `checkout.js`：

```javascript
function checkout(price) {          // 定义一次
  const total = price * 0.9 + 5;
  return total;
}

console.log('道具结算：' + checkout(80));
console.log('补货结算：' + checkout(300));
console.log('礼包结算：' + checkout(150));
```

预期输出：

```text
道具结算：77
补货结算：275
礼包结算：140
```

折扣改八五折？只动 `0.9` 那一行，三处同时生效。这就是函数的全部意义：**逻辑写一遍，数据走参数进来，结果走返回值出去。**

## 3. 发生了什么：参数进，返回值出

拆开 `checkout` 的三段结构：

- `function checkout(price)`：`price` 是**参数**——占位符，调用时才填上真值；
- 函数体：干活的代码，`price` 像普通变量一样用；
- `return total`：把结果**交出去**，函数到此结束，调用处 `checkout(80)` 就变成返回值 `77`。

两个新手高频踩坑点：

```javascript
function demo(x) {
  console.log('收到：' + x);
  return x * 2;
}

const result = demo(21);   // result 是 42：返回值被接住
demo(21);                  // 打印了，但返回值没人接，扔掉了
```

最后一条：**不写 return 的函数，返回值是 `undefined`**：

```javascript
function greet() { console.log('hi'); }
const r = greet();         // 调用时打印 hi
console.log(r);            // undefined：greet 的返回值
```

数据流一句话：**调用时把值拷给参数，结束时用 return 交出结果。** 函数里改参数不影响外面；要传出去的东西必须 return。这条纪律能挡掉一大批「为什么外面没变」的困惑。

## 4. 函数声明与函数表达式：函数也是值

JS 里函数是一等公民：函数本身就是**值**，可以像数字、字符串一样存进变量。三种主流写法：

```javascript
function checkoutA(price) {                     // 写法一：函数声明
  return price * 0.9 + 5;
}

const checkoutB = function (price) {            // 写法二：函数表达式
  return price * 0.9 + 5;
};

const checkoutC = (price) => price * 0.9 + 5;   // 写法三：箭头函数（表达式家族）
```

三者都能 `checkoutX(80)` 调用。差别先记一条：**声明有「提升」——定义写在调用后面也能用；表达式和普通变量一样，执行到那一行才存在。** 这是第 9 节真实报错的根源。

箭头函数是表达式里最短的写法：单参数可省括号，函数体只有一句时可省 `return`。本篇先把它当语法糖用；它和普通函数还有更深的一层差别（`this`），[this 篇](/javascript/100-ThisKeywordDeepDive) 讲透，今天只需要认识这张脸。

顶层工具函数（如结算、格式化）用**声明**，定义位置随意、提升友好；存进对象、要传来传去的函数用**表达式或箭头**——090 篇起你会天天传箭头函数，手感自然来。

## 5. 作用域链：变量从出生地向外找

函数嵌函数时，内层能看见哪些变量？看一个真实结构：

```javascript
const shopName = '老王商店';          // 全局：谁都能看见

function checkout(price) {
  const discount = 0.9;               // checkout 作用域

  function addShipping(total) {
    return total + 5;                 // 只用参数，最干净
  }

  const total = addShipping(price * discount);
  console.log(shopName + ' 结算：' + total);   // 本层没有 → 外层找 → 全局找到
  return total;
}

checkout(80);
```

预期输出：

```text
老王商店 结算：77
```

规则一句话：**查变量时从当前层出发，一层层往外找，找到就用，到全局还没找到才报 `ReferenceError`。** 这条链是「出生时」就定下来的，写在代码里的嵌套结构就是查找路线。

同名遮蔽：内层声明的名字会**遮住**外层同名变量——外层的还在，只是这一层看不见它。

## 6. 闭包：函数记住了出生地

现场感受一下：`addShipping` 出生在 `checkout` 里，把它**返回出去**，在外面调用——它还记得出生地的变量吗？

最小示例，计数器：

```javascript
function createCounter() {
  let count = 0;                    // count 出生在 createCounter 里

  return function () {
    count = count + 1;              // 用的正是出生地的 count
    return count;
  };
}

const nextRound = createCounter();  // 拿到这个内层函数
console.log(nextRound());           // 1
console.log(nextRound());           // 2
console.log(nextRound());           // 3

const otherMatch = createCounter(); // 另开一局，互不干扰
console.log(otherMatch());          // 1
console.log(nextRound());           // 4（第一局接着数）
```

直觉说 `createCounter` 早就执行完了，`count` 应该被回收。实际它活着：**返回的内层函数带着对出生地的记挂活下去，`count` 也跟着活下去。** 这就是**闭包**——函数连同它出生时的那片作用域，打包成一体。

用 040 篇「变量是名字绑定对象」的视角想：`createCounter` 每调用一次，就造出一个新的 `count` 和一个新的内层函数；`nextRound` 与 `otherMatch` 各自记着各自的 `count`，所以互不干扰。闭包也是「私有变量」的来路：`count` 藏在函数背后，外面摸不到，只能通过返回的函数操作——比全局变量安全得多。

两个后话先记现象：闭包为什么可能拖累内存、怎么排查——[内存管理与垃圾回收](/javascript/350-MemoryManagementAndGarbageCollection) 与 [闭包内存泄漏](/javascript/360-ClosureMemoryLeakOptimization) 讲透；本篇只要求**能预测计数器行为**。

## 7. rest 参数：来多少个参数都接得住

结算常要算好几项商品，参数个数不固定。rest 参数把它们全收进一个数组：

```javascript
function sum(...prices) {           // prices 是一个真数组
  let total = 0;
  for (const p of prices) {         // 070 篇的 for-of 派上用场
    total = total + p;
  }
  return total;
}

console.log(sum(10, 20, 30));       // 60
console.log(sum(1, 2, 3, 4, 5));    // 15
console.log(sum());                 // 0（空数组加了个寂寞，但不出错）
```

`...prices` 读作「把剩下的参数全收进数组 `prices`」。它只能放在参数列表**最后**，前面可以有普通参数，如 `function order(user, ...items)`。旧代码里的同类写法叫 `arguments`，读老项目时认得即可，新代码一律用 rest。

## 8. 修改实验

实验一：给 `checkout` 加第二个参数 `shippingFee`，三处调用分别传 `5`、`0`、`8`，输出全部验证。

实验二：`createCounter` 改成接收起始值，`createCounter(100)` 后第一脚踩出 `101`，并验证两局依旧互不干扰。

实验三：仿照 `sum` 写一个 `max(...nums)`，用 for-of 加 if 找出最大值并返回。验收：`max(3, 9, 4)` 返回 `9`，`max(-5, -2)` 返回 `-2`（初值别设 0，想想为什么）。

## 9. 常见错误与调试实录

**错误一：`xxx is not a function`。** 来自一次真实手滑：

```javascript
const numbers = [10, 20, 30];
console.log(numbers.jojn('-'));     // join 手滑打成 jojn
```

真实报错（Node 原文）：

```text
TypeError: numbers.jojn is not a function
```

三步定位：

1. **读报错**：类型 `TypeError`，结尾 `is not a function`——意思是「你当函数调用的这个东西，不是函数」。名字就在报错里：`numbers.jojn`；
2. **验真身**：报错行前加 `console.log(typeof numbers.jojn)`，输出 `undefined`——这个键不存在（多半拼写错误）。打出 `'number'`、`'string'` 之类，说明变量被别的东西占了，顺着赋值链查；
3. **对照修正**：MDN 搜正确的方法名，改成 `numbers.join('-')`。

**错误二：表达式先调用后定义。** 第 4 节埋的雷，现在引爆：

```javascript
checkout(80);                        // 第 1 行就想用

const checkout = function (price) {  // 第 4 行才赋值
  return price * 0.9 + 5;
};
```

真实报错（Node 原文）：

```text
ReferenceError: Cannot access 'checkout' before initialization
```

把 `const checkout = function ...` 换成 `function checkout(...)` 声明，程序立刻能跑——这就是「声明有提升」。看到 `before initialization`，就往报错行**上方**找表达式定义：挪上去，或改成函数声明。

## 10. 实际项目中的使用场景

- 工具函数库与游戏逻辑：格式化金额、校验表单字段、伤害计算、掉落判定，各封装成函数，全项目共用一份逻辑；
- 何时该拆函数：同一段逻辑出现第二遍时（本篇开场就是标准）；一个函数只做一件事，说不清它「做什么」就是做太多了；
- 不该做的：函数里偷偷修改外面的变量——数据走参数进、返回值出（Python 对 `global` 的差评同样成立）；「返回值没人接」式调用也属浪费；
- 「把函数当值传来传去」从 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 起成为日常，[高阶函数](/javascript/150-HigherOrderFunction) 讲透；现在只需记住：函数是值。

## 11. 小练习

预测题（5 分钟，先写答案再运行）：

```javascript
const name = '全局';
function outer() {
  const name = '外层';
  function inner() {
    console.log(name);
  }
  return inner;
}
const speak = outer();
speak();
```

这题同时考作用域链与闭包：`inner` 的 `name` 找到的是哪一个？为什么 `outer` 执行完了还找得到？

修改题（10 分钟）：给 `checkout` 加参数 `discount`，调用时分别传 `0.9` 与 `0.85`，验证同一份代码出两套价格。再想一步：折扣该作参数传进来还是写死？说出取舍理由。

修 Bug 题（15 分钟）：下面的代码想把结算金额保留两位小数再拼接，运行真实报错。按三步定位并修复（提示：问题出在对谁调用了 `toFixed`）：

```javascript
function checkout(price) {
  return price * 0.9 + 5;
}

const checkoutMsg = checkout(80) + ' 元';
console.log(checkoutMsg.toFixed(2));
```

真实报错：

```text
TypeError: checkoutMsg.toFixed is not a function
```

挑战题（半小时，不给代码）：写 `average(...scores)` 返回平均分。验收断言（`console.assert(条件, '失败提示')`，条件不成立才输出）：

```javascript
console.assert(average(80, 90, 100) === 90, '平均分应为 90');
console.assert(average() === 0, '无参数应返回 0');
console.assert(typeof average(1, 2) === 'number', '返回值必须是数字');
```

提示分两级：「提示」空参数时 `sum()` 返回 0，除以 0 会得到什么？需要一个判断；「展开」本题断言只用能整除的数据。

## 12. 与之前和之后的知识的关系

- 往前：[对象与数组](/javascript/070-ObjectArray) 的玩家数组马上可以交给函数统一结算；[变量与数据类型](/javascript/040-VariableDataType) 的「名字绑定」在作用域链与闭包里全面兑现；
- 往后：[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 把函数当参数传给 map/filter；[this 篇](/javascript/100-ThisKeywordDeepDive) 补完箭头函数的另一半；[闭包内存泄漏](/javascript/360-ClosureMemoryLeakOptimization) 接手本篇按下不表的内存话题；[生成器](/javascript/320-GeneratorFunctions) 是「函数可以暂停」的进阶形态。

## 13. 官方文档

- MDN 函数指南：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Functions
- MDN 闭包：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Closures
- rest 参数：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/rest_parameters
- `return` 语句：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/return

## 14. 自我检查

- 能不看资料写出「参数进、返回值出」的函数，并说出不写 return 时调用结果是什么；
- 能解释函数声明与函数表达式的提升差别，并预测两种写法在「先调用后定义」下的命运；
- 拿到一段嵌套代码，能逐层说出变量查找路径，并解释同名遮蔽；
- 能现场写出 `createCounter` 并预测它与第二次调用实例的计数行为；
- 拿到 `TypeError: xxx is not a function`，能说出三步排查，第一步就是 `typeof` 验真身。

## 本章总结

函数把一段逻辑打包：数据走参数进、结果走 return 出，同一逻辑只写一遍。函数是值——声明有提升，表达式执行到才存在；箭头函数是表达式家族的短写法，`this` 差别留给 100 篇。变量查找从出生地一层层向外，内层同名会遮蔽外层。返回出去的内层函数记得出生地的变量，这就是闭包——计数器因此能一直数，私有变量因此藏得住。rest 参数用 `...` 把任意个实参收成数组。最常撞的报错是 `xxx is not a function`：名字就在报错里，`typeof` 一验便知真身。

## 下一步

进入 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod)：把函数当参数传出去，map 和 filter 会把你写过的「循环 + 判断」变成一行——函数作为值的正式登场。
