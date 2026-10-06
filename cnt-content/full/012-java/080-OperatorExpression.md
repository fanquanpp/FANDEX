---
order: 90
title: 运算符与表达式：整数除法吃掉了 0.7
module: 'java'
category: 后端技术
difficulty: intermediate
description: 以排行榜平均分回收 040 埋下的 74 悬念：算术与整数除法、比较与逻辑短路、三元运算符、位运算的一句话定位、优先级与括号，附 possible lossy conversion 真实报错与浮点精度陷阱。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'java/040-ProgramStructureBasicSyntax'
  - 'java/050-DataTypeConversion'
  - 'java/070-VariableConstant'
  - 'java/090-ControlFlow'
prerequisites:
  - 'java/070-VariableConstant'
---

## 前置知识

- 已完成 [变量与常量](/java/070-VariableConstant)：会声明初始化变量，知道基本类型与引用变量的分工；
- [数据类型转换](/java/050-DataTypeConversion) 的提升与截断是本文的近亲，再见时你会认出来。

跨语言提个醒：Python 的 `7 / 2` 得 3.5（`//` 才整除），JS 的 `7 / 2` 也得 3.5。Java 分得更细：**两个 int 相除，结果还是 int**。本文从这个差异讲起。

## 学习目标

读完本文你将能够：

1. 预测两个 int 相除的结果，说清整数除法的取整规则，写出拿到小数的改法；
2. 组合比较与逻辑运算符，解释 && 与 || 的短路，并用短路写出除零守卫；
3. 用三元运算符把「二选一赋值」压成一行；
4. 说出位运算符在什么场合才登场；
5. 拿到 possible lossy conversion，能指认哪次赋值在丢精度并修复。

预计 45 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：排行榜要算平均分

排行榜要显示「场均得分」。三局合计 224 分、共 3 局，直觉说平均 74.7：

```java
public class AvgDemo {
    public static void main(String[] args) {
        int total = 224;    // 三局分数合计
        int count = 3;      // 局数
        int avg = total / count;

        System.out.println("场均 " + avg);
    }
}
```

预期输出：

```text
场均 74
```

眼熟的 74——040 的订单小计埋的悬念（9 折算出 74 而不是 74.7），050 讲过截断，今天给完整答案：**问题不在打折，在整数除法**。`total / count` 两个操作数都是 int，Java 规定结果也必须是 int——小数部分直接扔掉（是向零取整，不是四舍五入），74.666... 变成 74。

## 2. 想要 74.7：先把一个操作数变 double

最直接的尝试是把结果交给 int 装——编译器连运行的机会都不给：

```java
int avg = (double) total / count;    // 想让 total 先升舱再除
```

```text
AvgDemo.java:6: error: incompatible types: possible lossy conversion from double to int
        int avg = (double) total / count;
                                 ^
1 error
```

读报错三步：类型——从 double 转 int 可能丢东西（0.666 会被扔掉）；位置——第 6 行的赋值；原因——左边变量是 int，右边表达式算出来是 double，Java 拒绝静默丢精度。修法不是压报错，而是承认结果本该是小数：

```java
double avg = (double) total / count;
System.out.println("场均 " + avg);
```

预期输出：

```text
场均 74.66666666666667
```

规则一句话：**除号两边只要有一个是 double，整个除法就按小数来**。业务上恰好想要整数（「满 74 分才上榜」）时，int 除法反而是对的——取整不是 bug，是语义。想四舍五入用 `Math.round(avg)`，输出 75。

## 3. 算术运算符全家福

把 % 和自增一并看全，还是排行榜的数据：

```java
int wins = 17;
int total = 20;
System.out.println(wins / total);      // 0：整数除法又来了
System.out.println(wins % total);      // 17：除不尽的余数
System.out.println(125 % 60);          // 5：125 秒是 2 分 5 秒
System.out.println((double) wins / total);   // 0.85：胜率
```

预期输出：

```text
0
17
5
0.85
```

加减乘（`+` `-` `*`）如常工作；`%` 取余数，判偶数（`x % 2 == 0`）、循环轮换（`i % 3`）、时间换算全靠它；`+` 还有第二份工——字符串拼接，040 的 println 里你一直在用。自增自减各看一眼：

```java
int combo = 5;
System.out.println(combo++);    // 5：先把旧值交出去，再加
System.out.println(combo);      // 6
System.out.println(++combo);    // 7：先加，再把新值交出去
```

预期输出：

```text
5
6
7
```

单独一行写 `combo++` 时前后置没区别；塞进表达式后差异就成了坑——团队代码更推荐 `combo += 1;`，把意图写明白。

## 4. 比较与逻辑：条件的原材料

比较运算符产出 boolean（`score > 70`、`score == 74`、`score != 74`、`score >= 60`），是下一篇所有判断的燃料。注意 == 的安全区：基本类型之间放心用（比数值）——包装类那条纪律是 060 的事。

逻辑运算符把条件串起来，重点在 && 与 || 的**短路**：左边已能定结论，右边根本不执行：

```java
public class ShortCircuitDemo {
    public static void main(String[] args) {
        int logins = 3;
        boolean hot = logins > 2 && logins < 10;      // 两个条件都算
        System.out.println(hot);

        int clicks = 0;
        boolean first = clicks > 10 && clicks++ > 0;  // 左边已 false
        System.out.println(first + " / " + clicks);   // 右边的自增没跑
    }
}
```

预期输出：

```text
true
false / 0
```

`clicks` 还是 0——`&&` 左边为 false 时右边被短路跳过。这不是冷知识，是安全带：

```java
int games = 0;
int total = 100;
if (games != 0 && total / games > 10) {   // 短路保住除法
    System.out.println("胜率爆表");
}
System.out.println("程序活着");
```

预期输出：

```text
程序活着
```

（没有守卫的话，整数除零当场抛 ArithmeticException: / by zero。）把危险操作放 `&&` 右边、安全检查放左边——守卫除零、守卫空引用（060 的 NPE 同款思路）都靠它。

## 5. 三元运算符：二选一赋值的一行写法

「满足条件取 A，否则取 B」出现频率极高，三元把它压成一行：

```java
int score = 1280;
String rank = score >= 1000 ? "王者" : "青铜";
System.out.println(rank);

int a = 88;
int b = 95;
int max = a > b ? a : b;
System.out.println("最高分 " + max);
```

预期输出：

```text
王者
最高分 95
```

读法：条件 ? 成立时取的值 : 不成立时取的值。嵌套三元能写但极难读——超过一层就老实写 if/else，那是下一篇的主角。

## 6. 位运算一句话定位

还有一组直接操作二进制位的运算符：`&`、`|`、`^`、`~`、`<<`、`>>`、`>>>`。一句话定位：**面试与底层用得多（权限位打包、哈希算法、JVM 内部），业务代码一年写不了几次**——`<< 1` 等于乘 2 这类技巧知道即可，业务里该用 `* 2` 就用 `* 2`，可读性优先。

## 7. 优先级与括号

表达式一长谁先算？值得背的只有三条：乘除余高于加减；比较高于 `&&`、`&&` 高于 `||`；赋值几乎永远最后算。

```java
int score = 10;
boolean hot = score > 5 && score < 20;   // 比较先于 &&，不加括号也对
int adjusted = score + 2 * 3;            // 16：乘法先于加法
int forced = (score + 2) * 3;            // 36：括号改写优先级
System.out.println(hot + " " + adjusted + " " + forced);
```

预期输出：

```text
true 16 36
```

完整优先级表不用背——**拿不准就加括号**，括号不要钱，还替三个月后的你省一次阅读考古。

## 8. 修改实验

实验一（5 分钟）：把 AvgDemo 的 total 改成 225，先算预期值再运行——注意 avg 是 double，想清楚输出是 75.0 还是 75，再验证。

实验二（5 分钟）：把 ShortCircuitDemo 的 `&&` 换成单个 `&`（对 boolean 同样当逻辑与用，但不短路），预测 clicks 变成几，运行验证，一句话写下两者区别。

实验三（10 分钟）：用 `%` 写「每隔 3 局刷新一次榜单」：`int games = 7;`，当 `games % 3 == 0` 时输出「榜单刷新」。改 games 为 9 和 10，分别预测再验证。

## 9. 常见错误与调试实录

错误一：把 `==` 手滑写成 `=`。C 语言里这是静默 bug，Java 直接拒收：

```java
int score = 74;
if (score = 60) {           // 赋值混进条件里
    System.out.println("pass");
}
```

```text
TypoDemo.java:5: error: incompatible types: int cannot be converted to boolean
        if (score = 60) {
                  ^
1 error
```

if 的条件必须是 boolean，而 `score = 60` 的结果是 int——强类型在这里救了你。修法：比数值写 `==`，赋值才用 `=`。

错误二：浮点数的精确比较：

```java
System.out.println(0.1 + 0.2);         // 你以为是 0.3
System.out.println(0.1 + 0.2 == 0.3);  // 你以为是 true
```

预期输出：

```text
0.30000000000000004
false
```

二进制存不下 0.1，误差藏在第 17 位小数。浮点比较用容差：`Math.abs(0.1 + 0.2 - 0.3) < 1e-9`；金额计算直接上 BigDecimal（`new BigDecimal("0.1")`，用字符串构造）。

错误三：整数溢出。050 讲过的 MAX_VALUE + 1 变负数，在连乘连加的统计里同样咬人。防御复习：预估量级换 long，或用 `Math.addExact(a, b)` 让溢出变成响亮的 ArithmeticException 而不是静默的错误结果。

## 10. 实际项目中的使用场景

- 统计口径：胜率 `(double) wins / total`、场均分——先想清楚要整数截断还是小数，再决定操作数类型；
- 短路守卫：`list != null && list.size() > 0`、`games != 0 && total / games > 10`，安全检查永远在危险操作左边；
- 三元做默认值与标签：`String label = score >= 60 ? "及格" : "重修";`，省掉只为赋一个值的 if 块；
- 常量参与运算：070 的 `static final double DISCOUNT = 0.9;` 配乘法，参数改一处生效全程序。

## 11. 小练习

预测题（5 分钟）：先写答案再运行：

```java
int a = 7;
int b = 2;
System.out.println(a / b);
System.out.println(a % b);
System.out.println((double) a / b);
System.out.println(a / (double) b);
```

（验证：3 / 1 / 3.5 / 3.5。后两行说明：升舱谁都行，除法看这一趟有没有 double 上车。）

修改题（10 分钟）：把 AvgDemo 改成四局（total 320、count 4），预测输出再验证（80.0）；只把 count 改回 3 再预测（106.66666666666667）并验证，说出两次输出格式为何不同。

修 Bug 题（15 分钟）：下面的程序想算胜率，运行当场崩溃。按三步定位，修复后要求输出 `胜率 0.0` 而不是崩溃（提示：第 4 节的守卫加第 5 节的三元）：

```java
public class RateBug {
    public static void main(String[] args) {
        int wins = 17;
        int total = 0;
        double rate = wins / total;      // 这一行崩溃
        System.out.println("胜率 " + rate);
    }
}
```

```text
Exception in thread "main" java.lang.ArithmeticException: / by zero
	at RateBug.main(RateBug.java:5)
```

挑战题（15 分钟）：只用 `/`、`%` 和字符串拼接，把 3671 秒拆成「X 小时 Y 分 Z 秒」。验收：输出与下面完全一致，不得手写任何数字：

```text
1 小时 1 分 11 秒
```

（提示：先算小时，余数再除 60；展开：`%` 与 `/` 组合，两层就够。）

## 12. 与之前和之后的知识的关系

- 往前：[程序结构与基本语法](/java/040-ProgramStructureBasicSyntax) 埋的 74 悬念在第 1 节正面回收；[数据类型转换](/java/050-DataTypeConversion) 的提升链与截断是整数除法的一家人；[变量与常量](/java/070-VariableConstant) 存好的值，本文负责加工；
- 往后：[控制流](/java/090-ControlFlow) 的 if 与 while，条件就是本文的比较与逻辑表达式；[数组详解](/java/110-ArrayDetailed) 的「遍历求平均」把 AvgDemo 推广到任意局数；[equals 与 hashCode 契约](/java/200-EqualsHashCodeContract) 把 == 与 equals 挖到对象判等的根部。

## 13. 官方文档

- Oracle Java Tutorials「Operators」：https://docs.oracle.com/javase/tutorial/java/nutsandbolts/operators.html
- 运算符优先级速查表（官方小结）：https://docs.oracle.com/javase/tutorial/java/nutsandbolts/opsummary.html
- Java 官方教程 Language Basics（dev.java）：https://dev.java/learn/language-basics/

## 14. 自我检查

- 能不看资料说清「为什么 224 / 3 是 74」，并写出拿到 74.67 的两种等价改法；
- 能现场解释短路的定义，并用 && 写出一个除零守卫；
- 能写出三元语法，说出「嵌套超一层换 if/else」的边界；
- 被问到位运算时，能一句话说清它该在哪类代码里出现；
- 看到 possible lossy conversion 与 int cannot be converted to boolean，能分别说出成因与修法。

## 本章总结

两个 int 相除结果还是 int，向零取整丢小数——040 的 74 悬念完整答案；想要小数，给任一操作数升舱 double，而 int 变量装 double 会被 possible lossy conversion 拒收。% 取余，判偶轮换换算全靠它。比较产 boolean，&& 与 || 短路护住右边的危险操作，守卫除零与空引用。三元压缩二选一赋值，嵌套超一层换 if/else。位运算留给面试与底层。优先级背三条，拿不准就加括号；`=` 与 `==` 混用 Java 直接报错；浮点比较用容差，金额用 BigDecimal。

## 下一步

进入 [控制流](/java/090-ControlFlow)：本文算出的 true 和 false 终于要「指挥」程序了——判断走哪条路、重复做多少次，顺手把 python/060 与 javascript/060 写过的猜数字游戏翻成 Java 版。
