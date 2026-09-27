---
order: 50
title: 数据类型转换：int 与 double 相加，结果是谁
module: 'java'
category: 后端技术
difficulty: beginner
description: 以订单金额混算为主线讲透类型转换：隐式提升链、强制转换的截断与回绕、char 参与运算、Integer.MAX_VALUE + 1 的溢出现场与 Math.addExact 防御、parseInt 与 NumberFormatException 实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/040-ProgramStructureBasicSyntax'
  - 'java/060-WrapperCacheTrap'
  - 'java/070-VariableConstant'
  - 'java/080-OperatorExpression'
prerequisites:
  - 'java/040-ProgramStructureBasicSyntax'
---

## 前置知识

- 已完成 [程序结构与基本语法](/java/040-ProgramStructureBasicSyntax)：会声明变量、知道语句与花括号块；
- [快速上手](/java/030-QuickStart) 里 NumberFormatException 惊鸿一瞥，本文让它登堂入室。

没学过 040 请先回去；本文只用最基础的声明与打印。

## 学习目标

读完本文你将能够：

1. 预测混合类型运算的结果类型（int + double、byte + byte、char + int）；
2. 说出隐式提升链，并解释为什么两个 byte 相加不能直接赋给 byte；
3. 预测强制转换的两种后果：截断（(int) 3.99 是 3）与回绕（(byte) 130 是 -126）；
4. 解释 Integer.MAX_VALUE + 1 为什么是 -2147483648，并用 Math.addExact 把静默错误变成响亮报错；
5. 用 parseInt / parseDouble 把命令行参数转成数字，读懂 NumberFormatException。

预计 45 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：int 和 double 相加，结果是谁

订单小计要升级：蛋糕单价 28.5 元（double），数量 2 份（int）。`2 + 28.5` 的结果是谁的类型？真正要紧的是**类型**——它决定这个值还能不能装回原来的变量、会不会悄悄变形。先跑现象，再给规则。

## 2. 实验：谁说了算

新建 MixedDemo.java：

```java
public class MixedDemo {
    public static void main(String[] args) {
        int pieces = 2;
        double price = 28.5;
        System.out.println(pieces + price);
        System.out.println(price * pieces);
    }
}
```

预期输出：

```text
30.5
57.0
```

结果都带小数：int 与 double 一起运算，结果是 double。规则：**参与运算的操作数，先统一提升到其中最大的类型，再计算**——这叫**隐式类型提升**。

## 3. 隐式提升：小类型自动升舱

数字六种基本类型排成一条升舱链：

```text
byte → short → int → long → float → double
```

char 也在这条链上（从 int 起步），第 5 节验证。升舱免费，赋值时右边类型不大于左边就直接放行：

```java
int i = 10;
double d = i;           // int → double，自动
long big = i;           // int → long，自动
double sum = i + 0.5;   // i 先提升为 double，再相加
```

反方向不免费。看两个 byte 相加：

```java
byte b1 = 10;
byte b2 = 20;
byte sum = b1 + b2;     // 编译失败
```

```text
MixedDemo.java:10: error: incompatible types: possible lossy conversion from int to byte
        byte sum = b1 + b2;
                    ^
1 error
```

byte、short、char 参与运算一律先提升为 int（字节码算术指令只有四档）——小杯倒大杯免费，倒回去要亲自动手。修法：`int sum = b1 + b2;`，或执意要 byte 就写 `(byte) (b1 + b2)`——括号不能省，见第 9 节错误三。

## 4. 强制转换：把大杯硬倒进小杯

语法：`(目标类型) 值`，两种后果都要亲眼见过一次。

后果一：**截断**（浮点转整数）：

```java
double price = 3.99;
int whole = (int) price;
System.out.println(whole);
```

预期输出：

```text
3
```

不是四舍五入，是直接砍掉小数。想四舍五入找 `Math.round`；想精确算钱见第 10 节。

后果二：**回绕**（大整数转小整数）：

```java
int over = 130;
byte small = (byte) over;
System.out.println(small);
```

预期输出：

```text
-126
```

130 超出 byte 范围 -128 到 127，写 (byte) 时编译器的态度是「行，后果自负」：130 回绕成 -126。不报错、不崩溃、数字悄悄变脸——真实项目管这叫数据静默损坏，比崩溃难查十倍。

## 5. char 参与运算：字符其实是数字

```java
public class CharMath {
    public static void main(String[] args) {
        char letter = 'A';
        System.out.println(letter + 1);
        System.out.println((char) (letter + 1));
        System.out.println('a' - 'A');
    }
}
```

预期输出：

```text
66
B
32
```

char 底层是 0 到 65535 的整数（Unicode 码位），'A' 就是 65；参与运算时提升为 int，所以 `letter + 1` 是 66 而非 "A1"，想要字符就强转回 char。`'a' - 'A'` 得 32，正是大小写的码表距离。注意 `'A'` 是 char、`"A"` 是字符串，`"A" + 1` 才得 "A1"，规则在 [运算符与表达式](/java/080-OperatorExpression) 展开。

## 6. 溢出实验：Integer.MAX_VALUE + 1

int 是 32 位整数，天花板 `Integer.MAX_VALUE` = 2147483647（约 21 亿），地板 `Integer.MIN_VALUE` = -2147483648——这个量级在累计播放量一类场景真实存在。

```java
public class OverflowDemo {
    public static void main(String[] args) {
        int max = Integer.MAX_VALUE;
        System.out.println(max);

        int overflow = max + 1;
        System.out.println(overflow);

        int safe = Math.addExact(max, 1);
        System.out.println(safe);
    }
}
```

运行，预期输出：

```text
2147483647
-2147483648
Exception in thread "main" java.lang.ArithmeticException: integer overflow
        at java.base/java.lang.Math.addExact(Math.java:872)
        at OverflowDemo.main(OverflowDemo.java:9)
```

（at 行号随 JDK 版本不同，读法照 030。）

三件事：

1. `max + 1` **没有报错、没有异常**，直接从天花板翻到地板（int 用二进制补码存数，顶到头再进一位、符号位翻转）——纯粹的静默错误；
2. `Math.addExact(max, 1)` 是防御：同样溢出，但它**响亮地炸**（ArithmeticException），把静默错误变成当场暴露。配套还有 subtractExact、multiplyExact；
3. 更大的数换 long（上限约 9.2 × 10^18），再不够换 BigInteger；金额、库存这类「数字绝不能悄悄错」的场景，addExact 是便宜的保险。

## 7. 字符串转数字：命令行参数的正确打开方式

030 里 args 拿到的全是字符串，"3" 不能直接当数字算。转换入口是包装类的 parse 系列：

```java
public class ParseDemo {
    public static void main(String[] args) {
        int count = Integer.parseInt(args[0]);
        double price = Double.parseDouble(args[1]);
        System.out.println("数量 " + count + "，单价 " + price);
        System.out.println("合计 " + count * price);
    }
}
```

运行 `java ParseDemo 3 28.5`，预期输出：

```text
数量 3，单价 28.5
合计 85.5
```

喂坏输入 `java ParseDemo 三 28.5`：

```text
Exception in thread "main" java.lang.NumberFormatException: For input string: "三"
        at java.base/java.lang.Integer.parseInt(Integer.java:671)
        at ParseDemo.main(ParseDemo.java:3)
```

030 见过它一次（"九十九"）。at 链最后一行指向你文件里 parse 那行——案发现场永远在调用处。两个额外陷阱：带空格或单位（"28.5元"）抛异常；把 "28.5" 喂给 parseInt（只认整数）也抛。防御（try/catch）在 [异常处理机制](/java/180-ExceptionHandlingMechanism) 展开；反方向 `"" + 42` 或 `String.valueOf(42)`，细节归 [运算符与表达式](/java/080-OperatorExpression)。

## 8. 修改实验

实验一（5 分钟）：把 OverflowDemo 的 `int max` 改成 `long max = Integer.MAX_VALUE;`，预测 max + 1 现在输出多少再运行（2147483648——升舱到 long，不溢出；addExact 那行同步删掉）。

实验二（10 分钟）：三连预测。设 `int subtotal = 83;`，依次预测并运行 `subtotal / 2`、`(double) subtotal / 2`、`(double) (subtotal / 2)`（41 / 41.5 / 41.0：整除砍小数、先升舱再除、除完才升舱）。

实验三（10 分钟）：字母后移加密：`char c = 'F';`，输出后移 1 位与后移 3 位的字符（先写预期：G 与 I，再核对）。把 'F' 换成 'y'，越过 'z' 之后发生了什么？

## 9. 常见错误与调试实录

错误一：long 忘加 L 后缀：

```java
long views = 10000000000;
```

```text
Stats.java:3: error: integer number too large
        long views = 10000000000;
                     ^
1 error
```

整数字面量默认 int，100 亿超上限。加 L：`10000000000L`；小写 l 与数字 1 难分，约定用大写。

错误二：float 忘加 F 后缀。浮点字面量默认是 double，装进 float 会报 `error: incompatible types: possible lossy conversion from double to float`，加 F 后缀（0.9f）解决；日常一律用 double，float 只在省内存的特定场景出现。

错误三：强转只作用于紧挨着的那一个值。`(double) (subtotal / 2)` 与 `(double) subtotal / 2` 结果不同（实验二的 41.0 与 41.5）。口诀：想让谁变 double，括号就把谁整个圈住，或把一个操作数直接写成 double（如 `totalScore / 2.0`）。

## 10. 实际项目中的使用场景

- 命令行工具与配置解析：parse 系列是「字符串进、数字算」的第一站；
- 金额计算：`0.1 + 0.2` 得 0.30000000000000004。精确算钱用 java.math.BigDecimal 或以「分」为单位用 long，入门期记住：**double 不碰钱**；
- 游戏数值：血量、计数器用 int，坐标、系数用 double；累加统计用 Math.addExact 或升 long 防溢出。

## 11. 小练习

预测题（5 分钟）：把下面片段放进 main 方法体，程序输出什么？先写答案再运行：

```java
byte b = 127;
b = (byte) (b + 1);
System.out.println(b);
System.out.println('B' + 1);
```

（验证：第一行 -128，127 回绕到地板；第二行 67，char 提升为 int。）

修改题（10 分钟）：给 ParseDemo 加折扣参数，运行 `java ParseDemo 3 28.5 0.5` 输出「折后合计 42.75」。要求：新增 parseDouble 读取 args[2]，先算好预期值（3 × 28.5 × 0.5）再验证一致。

修 Bug 题（15 分钟）：程序想输出两名玩家的平均分 87.5，实际输出 87.0。定位原因并修复，要求修复后输出 87.5：

```java
public class AverageBug {
    public static void main(String[] args) {
        int totalScore = 175;
        int players = 2;
        double average = (double) (totalScore / players);
        System.out.println("平均分 " + average);
    }
}
```

（原因在括号的位置：先整除得 87，再升舱已经晚了。）

挑战题（半小时）：写一个 Stats 类，接收两个命令行整数分数，输出总分与平均分。验收：`java Stats 90 86` 输出「总分 176」「平均 88.0」；再运行 `java Stats 九十 86`，用 030 的 at 链读法指出案发行号。提示（思路）：args[0]、args[1] 分别 parseInt，平均分先升舱再除；展开（关键写法）：`(a + b) / 2.0`。

## 12. 与之前和之后的知识的关系

- 往前：[程序结构与基本语法](/java/040-ProgramStructureBasicSyntax) 的订单小计今天升级出小数价格；[快速上手](/java/030-QuickStart) 的 NumberFormatException 与 args 正式归位；
- 往后：[包装类缓存陷阱](/java/060-WrapperCacheTrap) 揭开 Integer 的另一面——装箱就是编译器帮你调 valueOf，下一篇证明；[变量与常量](/java/070-VariableConstant) 讲声明的更多姿势与 final 常量；[运算符与表达式](/java/080-OperatorExpression) 把 + 的拼接与除法规则讲全；[异常处理机制](/java/180-ExceptionHandlingMechanism) 教你接住 NumberFormatException；
- 主线不变：040 → 050（本文）→ 060 → 070。

## 13. 官方文档

- Oracle Java Tutorials「Primitive Data Types」：https://docs.oracle.com/javase/tutorial/java/nutsandbolts/datatypes.html
- Integer 类 Javadoc（MAX_VALUE、parseInt、addExact 的官方说明）：https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html
- Java 语言规范 JLS 第 5 章「Conversions and Contexts」（转换与提升的权威定义）：https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html

## 14. 自我检查

- 能不查资料画出升舱链，并解释两个 byte 相加为什么编译不过；
- 能说出 (int) 3.99 与 (byte) 130 的结果，以及为什么编译器放行强转却拦下隐式缩小；
- 能现场解释 2147483647 + 1 为什么是 -2147483648，并写出 Math.addExact 防御版；
- 拿到带 NumberFormatException 的报错，能用 at 链指认案发行号；合上文档能写出 ParseDemo 并正确处理命令行参数。

## 本章总结

混合运算时操作数统一提升到最大类型，升舱链 byte → short → int → long → float → double，char 从 int 起步；反向要强转，代价是截断（(int) 3.99 得 3）或回绕（(byte) 130 得 -126）。int 顶到天花板再进一就回绕成负数，Math.addExact 把静默溢出变成 ArithmeticException。字符串转数字走 parseInt / parseDouble，坏输入抛 NumberFormatException，at 链指认现场。double 不碰钱，整除会砍小数，强转只管紧挨的一个值。

## 下一步

进入 [包装类缓存陷阱](/java/060-WrapperCacheTrap)：Integer 不只是 int 的工具箱，两个 127 相等、两个 128 却不等——Java 的一道著名面试题正在等你。
