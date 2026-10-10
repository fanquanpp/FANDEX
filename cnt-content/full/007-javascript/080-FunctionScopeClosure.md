---
order: 90
title: 函数基础：不重复自己
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从「结算逻辑复制三遍，改一处漏两处」讲起：参数与返回值、函数声明与表达式、函数是值、rest 参数，附 xxx is not a function 与 Cannot access 调试实录。作用域链与闭包拆分至 085 篇专讲。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'javascript/085-ScopeChainAndClosure'
  - 'javascript/070-ObjectArray'
  - 'javascript/090-ArrayHigherOrderMethod'
  - 'javascript/150-HigherOrderFunction'
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
3. 用 rest 参数写出接收任意多个参数的求和函数，并读懂 `TypeError: xxx is not a function` 报错。

预计 45 到 60 分钟，含 3 组修改实验与 4 道练习。变量查找与闭包拆分到 [作用域链与闭包](/javascript/085-ScopeChainAndClosure) 专篇，本篇专注函数本身。

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

三者都能 `checkoutX(80)` 调用。差别先记一条：**声明有「提升」——定义写在调用后面也能用；表达式和普通变量一样，执行到那一行才存在。** 这是第 7 节真实报错的根源。

箭头函数是表达式里最短的写法：单参数可省括号，函数体只有一句时可省 `return`。本篇先把它当语法糖用；它和普通函数还有更深的一层差别（`this`），[this 篇](/javascript/100-ThisKeywordDeepDive) 讲透，今天只需要认识这张脸。

顶层工具函数（如结算、格式化）用**声明**，定义位置随意、提升友好；存进对象、要传来传去的函数用**表达式或箭头**——090 篇起你会天天传箭头函数，手感自然来。

函数能嵌套定义，内层能看见外层的变量——这条「作用域链」规则，以及「返回出去的函数还记得出生地变量」的闭包机制，是函数与变量规则交汇的地方，[作用域链与闭包](/javascript/085-ScopeChainAndClosure) 篇专门展开；本篇先继续把函数自身的零件补齐。

## 5. rest 参数：来多少个参数都接得住

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

## 6. 修改实验

实验一：给 `checkout` 加第二个参数 `shippingFee`，三处调用分别传 `5`、`0`、`8`，输出全部验证。

实验二：仿照 `sum` 写一个 `max(...nums)`，用 for-of 加 if 找出最大值并返回。验收：`max(3, 9, 4)` 返回 `9`，`max(-5, -2)` 返回 `-2`（初值别设 0，想想为什么）。

## 7. 常见错误与调试实录

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

## 8. 实际项目中的使用场景

- 工具函数库与游戏逻辑：格式化金额、校验表单字段、伤害计算、掉落判定，各封装成函数，全项目共用一份逻辑；
- 何时该拆函数：同一段逻辑出现第二遍时（本篇开场就是标准）；一个函数只做一件事，说不清它「做什么」就是做太多了；
- 不该做的：函数里偷偷修改外面的变量——数据走参数进、返回值出（Python 对 `global` 的差评同样成立）；「返回值没人接」式调用也属浪费；
- 「把函数当值传来传去」从 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 起成为日常，[高阶函数](/javascript/150-HigherOrderFunction) 讲透；现在只需记住：函数是值。

## 9. 课堂实战题集：八道函数题（承接自扫描素材）

以下八题来自真实课堂的例题集（同一批知识点反复出现的三份作业），按难度排列。先自己写，再展开参考实现；重点不是答案，而是每题训练的函数技能。

| 题 | 技能点 | 签名建议 |
| :--- | :--- | :--- |
| 1. 两数最大值 | 参数与 return | `getMax(a, b)` |
| 2. 矩形面积 | 多参数 | `rectArea(w, h)` |
| 3. 圆面积 | 参数与近似值 | `circleArea(r)` |
| 4. 1~n 求和 | 循环 + 累加 | `sum(n)` |
| 5. 成绩等级 | 多分支返回 | `grade(score)` |
| 6. 数字转"亿/万"文本 | 提前 return | `fmtCount(n)` |
| 7. 阶乘 | 递归 + 结束条件 | `fact(n)` |
| 8. 数组求和 | 数组也是值、也能当参数 | `arraySum(arr)` |

写之前先复习两个口径：**形参**是定义时小括号里占位置的，**实参**是调用时真正传的数据；**return 有双重语义**——既把结果交出去，也当场终止函数，return 之后的代码是死代码。

<details>
<summary>参考实现（先完成八题再展开对照）</summary>

```javascript
// 1：两数最大值——三元版与 if 版等价
function getMax(a, b) { return a > b ? a : b; }

// 2：矩形面积
function rectArea(w, h) { return w * h; }
console.log(rectArea(100, 20)); // 2000

// 3：圆面积（教材口径用 3.14，工程里用 Math.PI）
function circleArea(r) { return r * r * 3.14; }
console.log(circleArea(2)); // 12.56

// 4：1~n 求和（sum(100) 得 5050）
function sum(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  return total;
}

// 5：成绩等级——分支从大到小写，"其余"兜底
function grade(score) {
  if (score >= 90) return "优秀";
  if (score >= 80) return "良好";
  if (score >= 60) return "及格";
  return "不及格";
}

// 6：数字转"亿/万"文本——内容站计数展示的标配（100000000 显示成 1亿）
function fmtCount(n) {
  if (n >= 100000000) return n / 100000000 + "亿";
  if (n >= 10000) return n / 10000 + "万";
  return String(n);
}
console.log(fmtCount(230000000)); // "2.3亿"
console.log(fmtCount(56000));     // "5.6万"

// 7：阶乘——递归必须有结束条件（没有它的 bar() 版本会栈溢出）
function fact(n) {
  if (n === 1) return 1;      // 结束条件：先减后乘的坑在 --n 写法
  return n * fact(n - 1);
}
console.log(fact(5)); // 120

// 8：数组求和——证明"数组也是值、也能当参数"
function arraySum(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) total += arr[i];
  return total;
}
console.log(arraySum([1, 2, 3, 4])); // 10
```

第 6 题值得多说一句：`n / 10000` 会得到小数（`5.6`），与字符串拼接后正好是"5.6万"——**除法保留小数 + 拼接转文本**是这条需求的两步链条，想保留整数用 `Math.floor`。

</details>

## 10. 小练习

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

## 11. 与之前和之后的知识的关系

- 往前：[对象与数组](/javascript/070-ObjectArray) 的玩家数组马上可以交给函数统一结算；[变量与数据类型](/javascript/040-VariableDataType) 的「名字绑定」在 [作用域链与闭包](/javascript/085-ScopeChainAndClosure) 里全面兑现；
- 往后：[作用域链与闭包](/javascript/085-ScopeChainAndClosure) 接手本篇按下不表的变量查找与闭包；[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 把函数当参数传给 map/filter；[this 篇](/javascript/100-ThisKeywordDeepDive) 补完箭头函数的另一半；[生成器](/javascript/320-GeneratorFunctions) 是「函数可以暂停」的进阶形态。

## 12. 官方文档

- MDN 函数指南：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Functions
- MDN rest 参数：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/rest_parameters
- MDN `return` 语句：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/return
- MDN 箭头函数：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/Arrow_functions

## 13. 自我检查

- 能不看资料写出「参数进、返回值出」的函数，并说出不写 return 时调用结果是什么；
- 能解释函数声明与函数表达式的提升差别，并预测两种写法在「先调用后定义」下的命运；
- 能用 rest 参数写出不定长参数的函数，说出它与旧写法 `arguments` 的关系；
- 拿到 `TypeError: xxx is not a function`，能说出三步排查，第一步就是 `typeof` 验真身。

## 本章总结

函数把一段逻辑打包：数据走参数进、结果走 return 出，同一逻辑只写一遍。函数是值——声明有提升，表达式执行到才存在；箭头函数是表达式家族的短写法，`this` 差别留给 100 篇。rest 参数用 `...` 把任意个实参收成数组。最常撞的报错是 `xxx is not a function`：名字就在报错里，`typeof` 一验便知真身。函数嵌套定义后「变量去哪找、函数记住了谁」，去 [作用域链与闭包](/javascript/085-ScopeChainAndClosure) 找答案。

## 下一步

进入 [作用域链与闭包](/javascript/085-ScopeChainAndClosure)：函数嵌函数时变量怎么找、返回出去的函数为什么还记得出生地的变量——五按钮经典题在那里揭晓。
