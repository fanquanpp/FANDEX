---
order: 50
title: 数据类型与运算符：让数据算起来
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 用「排行榜算平均分、购物车算总价」讲透算术运算符与 % 的三用途、比较与逻辑、短路求值、优先级、拼接对比模板字符串，附 NaN 自检与真实报错调试实录。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'javascript/040-VariableDataType'
  - 'javascript/060-ControlFlow'
  - 'javascript/070-ObjectArray'
prerequisites:
  - 'javascript/040-VariableDataType'
---

## 前置知识

- 已完成 [变量与数据类型](/javascript/040-VariableDataType)：会用 let/const 起名字、知道七种原始类型、会用模板字符串、知道 `==` 的坑。不知道 0.1 + 0.2 为什么不等于 0.3？正好，这是本文要揭的谜底之一。

## 学习目标

读完本文你将能够：

1. 用 `+ - * / % **` 写出平均分、总价类计算，并准确预测结果；
2. 说出 `%` 的三个实战用途（分页、奇偶、轮询）并各写出一行代码；
3. 用比较运算符与 `&& || !` 组合业务判断，解释短路求值「返回操作数本身」的规则；
4. 预测混合运算的优先级结果，拿不准时用括号自保；
5. 识别 NaN 的来源并用 `Number.isNaN` 自检，独立修复 `Cannot read properties of null`。

预计 45 到 60 分钟，包含 3 个修改实验与 4 道练习。

## 1. 你现在要解决什么问题

上一篇给数据起了名字，但名字只是「存起来」，真实程序要「算出来」：

- 游戏排行榜：三名玩家得分 92、87、95，要显示总分与平均分，还要判断是否破 90 拿奖励；
- 购物车：三件商品各有单价和数量，要算合计，满 50 打九折，渲染一张小票。

没有运算符，这些数字全靠人脑算、手抄进代码——数据一变全盘作废。运算符让程序自己算：数据变了，结果跟着变。

## 2. 先不要看解释，先试试看

在控制台逐行输入，每行先预测再回车：`5 + 3`、`'5' + 3`、`'5' - 3`。

第三个最反直觉：`+` 遇到字符串变成拼接（`'53'`），`-` 却逼着字符串转数字（`2`）。同一个加号为什么有两副面孔？第 8 节揭底。

## 3. 最小可运行示例

排行榜平均分：

```javascript
const scores = [92, 87, 95];        // 数组的写法先混个眼熟，070 讲透
const total = scores[0] + scores[1] + scores[2];
const average = total / scores.length;

console.log(`总分：${total}`);
console.log(`平均分：${average}`);
console.log(`平均分（一位小数）：${average.toFixed(1)}`);
```

预期输出：

```text
总分：274
平均分：91.33333333333333
平均分（一位小数）：91.3
```

三个观察点：除法直接得小数，JS 没有「整除」；原始平均分拖着长尾巴，`toFixed(1)` 保留一位小数（它返回字符串）；`scores.length` 是数组自带的数量。接下来逐类拆解用到的运算符。

## 4. 算术运算符与 % 的三个实战用途

```javascript
console.log(10 / 3);     // 3.3333333333333335 —— 除法直接得小数，没有「整除」
console.log(10 % 3);     // 1 —— 只取余数
console.log(2 ** 10);    // 1024 —— 幂运算
```

`%`（取余）在业务代码里出镜率极高，固定有三个用途：

```javascript
// 用途一：分页 —— 每页 10 人，35 个玩家共几页？
const playerCount = 35;
const pageCount = Math.ceil(playerCount / 10);   // Math.ceil 向上取整
console.log(pageCount);                          // 4

// 用途二：奇偶 —— 偶数行换底色的经典写法
console.log(8 % 2);      // 0：偶数
console.log(7 % 2);      // 1：奇数

// 用途三：轮询 —— 超出长度就从头再来（轮播图、循环播放）
const songCount = 3;
const next = (2 + 1) % songCount;    // 第 3 首（下标 2）之后轮回第 0 首
console.log(next);                   // 0
```

分页的核心是「整页数向上取整」，轮询的核心是「下标对长度取余，永远落在合法范围内」。另外记住自增写法 `i++`（等价 `i = i + 1`），下一篇的循环里天天出现。

## 5. 比较与逻辑：给程序装上判断力

比较运算符产出 boolean 值，可以存进变量、参与后续判断：

```javascript
const average = 91.3;
const isOnPodium = average > 90;      // 比较的结果是 boolean，可以存进变量
console.log(isOnPodium);              // true
console.log(3 >= 3 && average > 80);  // true —— &&：两个条件都成立才算成立
console.log(!true);                   // false —— !：取反
```

比较一律用 `===`、`!==`，不用 `==`——坑上一篇刚讲过。逻辑运算符三个：`&&`（并且）、`||`（或者）、`!`（取反）。还有一个三元写法 `条件 ? 值A : 值B`（条件成立取 A 否则取 B），本文先用一次，[控制流](/javascript/060-ControlFlow) 讲透它与 if 的分工。

## 6. 短路求值：&& 和 || 返回的不是布尔

`&&` 和 `||` 有个被大量利用的特性：返回的是**操作数本身**，不一定是布尔值。`a || b`：a 是真值就返回 a，否则返回 b；`a && b`：a 是假值就返回 a（b 根本不执行），否则返回 b。真值/假值指被当成布尔用时算 true 还是 false：`0`、`''`、`null`、`undefined`、`NaN` 是假值，其余都是真值。这让 `||` 成了「给默认值」的工具：

```javascript
const nickname = '';                          // 玩家没起名
console.log(nickname || '无名玩家');           // 无名玩家：左边是假值，返回右边
```

`&&` 还能当条件开关：`hasTicket && enter()`，左边为真才执行右边（本文先用一次，060 正式讲）。但 `||` 有个经典事故：把合法的 0 也当「没设置」换掉了。音量调到 0，界面却显示 50：

```javascript
const volume = 0;
console.log(volume || 50);    // 50 —— 事故：0 被当成「没设置」
console.log(volume ?? 50);    // 0  —— ?? 只把 null 和 undefined 当「没设置」
```

`??`（空值合并）与 `||` 的分工由此清晰：0、'' 是合法业务值时用 `??`，其余给默认值的场合两者皆可、`??` 更精准。

## 7. 运算符优先级：拿不准就加括号

优先级决定谁先算：`**` 高于 `* / %`，`* / %` 高于 `+ -`，比较高于 `&&`，`&&` 高于 `||`，赋值几乎永远最后。完整表格在文末官方文档，日常记住两条：`2 + 3 * 4` 是 14（乘法先算，加括号 `(2 + 3) * 4` 才是 20）；`true || false && false` 是 true（`&&` 先于 `||`，加括号后语义完全改变）。

工程结论：**对自己不确定的任何表达式，加括号**——括号不要钱，bug 要钱，优先级表是给引擎的，括号是给人的。

## 8. 字符串拼接 vs 模板字符串

回到第 2 节的谜题：`+` 有两副面孔，因为它是唯一「数字和字符串都认」的算术运算符——任何一边是字符串，`+` 就退化为拼接；其余运算符只认数字，遇到字符串会先逼它转型：

```javascript
console.log('5' + 3);          // '53' —— 拼接
console.log('5' - 3);          // 2    —— 转成数字再减
console.log('总分：' + 90 + 5);      // 总分：905 —— 从左到右，先拼 '总分：90' 再拼 5
console.log(`总分：${90 + 5}`);      // 总分：95 —— ${} 里先算完再嵌进去
```

`'总分：' + 90 + 5` 输出 905 而不是 95：字符串一旦出现在链上，后面所有 `+` 都变拼接。这就是上一篇「拼接一律用模板字符串」的真正原因——`${}` 里的算术在拼接前完成，行为可预测。

## 9. NaN：算坏了的信号与自检

`NaN`（Not a Number）是 number 类型里的特殊值，含义是「这次运算没有产生有效的数」。它来自转不动的字符串转换（如 `Number('九十二')` 得到 NaN）、`0 / 0` 这类无意义运算、`undefined + 1` 这类无效算术。

NaN 有个坑人的怪癖：**它不等于任何值，包括它自己**，`score === NaN` 永远是 false。发现它必须用专门的 `Number.isNaN`：

```javascript
if (Number.isNaN(score)) {            // if 的完整规则 060 讲，先混个眼熟
  console.log('输入不是有效数字');
} else {
  console.log(`折算分：${score * 0.8}`);
}
```

习惯是：**凡是由外部数据转换来的数字，先 `Number.isNaN` 检查再参与计算**——NaN 和任何数运算结果都是 NaN，别让它顺着算式往下传染。

## 10. 修改实验

实验一：给第 3 节的 scores 加第 4 名 88（求和加一项 `scores[3]`），先预测新的总分与平均分，运行验证。

实验二：把第 6 节音量例子里的 `??` 换成 `||` 再跑，观察输出从 0 变 50——亲手复现一次「0 被吃掉」的事故。

实验三：把第 4 节轮询例子的 songCount 改成 4、next 改成 `(3 + 1) % songCount`，先写预测再运行；再把 `(3 + 1)` 改成 `(7 + 1)`，验证「取余永远落在 0 到 songCount - 1 之间」。

## 11. 常见错误与调试实录

错误一：在 null 上调方法。运行：

```javascript
const input = null;                   // 本该是 '92'，接口没返回数据
const score = Number(input.trim());   // 想先去掉空格再转数字
console.log(`折算分：${score}`);
```

报错（真实文本，浏览器控制台多一个 Uncaught 前缀）：

```text
TypeError: Cannot read properties of null (reading 'trim')
```

读报错三步：一看类型，`TypeError` 常见于「对不合适的值做了不合适的操作」；二读文案，「reading 'trim'」说明是在 null 身上调 trim；三定位，溯源 input 为什么是 null——数据没到就往下算了。修复：`const raw = input ?? '0'; const score = Number(raw.trim());`，输出 `折算分：0`。

错误二：不报错但结果离谱。购物车总价算出了 1002：

```javascript
const unitPrice = '100';              // 从表单拿来的是字符串！
const count = 2;
const total = unitPrice + count;      // '1002'，不是 200
console.log(`合计：${total} 元`);
```

静默错误比报错更危险：程序继续跑，错账进了数据库。排查路径：先发现「总价不对劲」的异常输出，再沿数据来源查类型，在入口处显式转换 `Number(unitPrice)`。

错误三：浮点精度。上一篇欠的谜底：`console.log(0.1 + 0.2)` 输出 `0.30000000000000004`，`0.1 + 0.2 === 0.3` 是 false。JS 的 number 用 IEEE 754 二进制浮点存储，0.1 和 0.2 在二进制里都是无限循环小数，相加后差了亿点点。日常规则：**展示用 toFixed 控制位数；金额计算改用整数「分」**——如 `const totalCents = 199 * 3;` 算完再 `/ 100` 展示。

## 12. 实际项目中的使用场景

- 排行榜与统计面板：求和、平均、与阈值比较，第 3 节的骨架直接可用；购物车结算同理：单价乘数量、满减判断、小票渲染，金额用「分」做整数运算；
- 列表分页：`Math.ceil(total / pageSize)` 算页数，`%` 判断「当前条是不是本页最后一条」；轮播用 `index % length` 让下标永远合法；表单与接口的数字一律先 `Number.isNaN` 检查再计算。

## 13. 小练习

预测题（5 分钟）：不运行，写出四行的输出：

```javascript
console.log(2 + 3 * 4);
console.log('总分：' + 10 + 5);
console.log(0 || '无名玩家');
console.log(0 ?? '无名玩家');
```

（先写答案再往下看。答案：`14`、`总分：105`、`无名玩家`、`0`。第三四行的对比是短路求值与空值合并的浓缩考点。）

修改题（10 分钟）：把第 3 节程序改成：scores 加第 4 名 88；平均分保留两位小数；新增一行 `破 90：${average > 90}`。先手写预期输出，再运行对比。

修 Bug 题（10 分钟）：下面的程序想显示折扣价，运行报错。按「读报错三步」定位并修复：

```javascript
const raw = null;                    // 优惠券接口没返回数据
const price = Number(raw.trim());
console.log(`折后价：${price.toFixed(2)}`);
```

报错（真实文本）：`Uncaught TypeError: Cannot read properties of null (reading 'trim')`

（提示：第 11 节错误一同款。答案：用 `raw ?? '0'` 兜底或先判空再计算，修完输出 `折后价：0.00`。）

挑战题（半小时）：写一个「购物车结算器」：三件商品单价 12.5、8、30，数量 2、3、1，全部用 const 变量（不用数组）。计算商品合计；满 50 打九折（三元写法 `条件 ? 折后 : 原价`，先混个眼熟，060 讲透）；输出三行小票：商品合计、是否折扣、实付金额，金额统一 `toFixed(2)`。验收清单：关键表达式有括号；把任一单价改成 5 后不触发折扣；修改任一单价或数量只改一处声明。

## 14. 与之前和之后的知识的关系

- 往前：[变量与数据类型](/javascript/040-VariableDataType) 说「typeof 也是运算符」，本文兑现：0.1 + 0.2 的谜底、`'5' + 3` 的两副面孔都在本文落定；
- 往后：[控制流](/javascript/060-ControlFlow) 的 if 与 for 吃的就是本文比较与逻辑运算的 boolean 结果，`%` 与 `i++` 在循环里成对出现；[对象与数组](/javascript/070-ObjectArray) 把 `scores.length` 和逐项求和正式化；[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 的 reduce 本质就是「加号连加」的循环化。

## 15. 官方文档

- 表达式与运算符总览：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators
- Number（Number.isNaN、toFixed 与精度说明）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Number
- 运算符优先级完整表：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Operator_precedence

## 16. 自我检查

- 能说出 `%` 的三个实战用途并各写一行代码；
- 能解释短路求值为什么返回操作数本身，以及 `||` 与 `??` 在「音量为 0」场景的差异；
- 拿到混合表达式能指出计算顺序，能说清 `+` 何时拼接何时相加；
- 能写出 `Number.isNaN` 自检，拿到 `Cannot read properties of null` 报错能三步定位到数据源头。

## 本章总结

算术运算符里 `%` 是分页、奇偶、轮询的万金油；比较与逻辑产出 boolean 并可短路返回操作数本身，给默认值时 `??` 比 `||` 更尊重合法的 0；优先级记不住就加括号；`+` 遇字符串退化为拼接，嵌入变量的拼接一律用模板字符串；NaN 自检用 `Number.isNaN`，外部数据先检查再计算。数据能算之后，下一步是让程序决定「算哪条路」。

## 下一步

进入 [控制流](/javascript/060-ControlFlow)：if、for 与循环，让比较和逻辑的判断结果真正驱动程序。
