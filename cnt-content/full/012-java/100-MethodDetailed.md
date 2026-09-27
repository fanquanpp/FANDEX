---
order: 100
title: 方法详解：把结算逻辑写成一个可复用的积木
module: 'java'
category: 后端技术
difficulty: intermediate
description: 以「三处复制的结算逻辑，85 手滑成 58」引入，讲透方法定义与调用、值传递的真相、重载解析、递归与可变参数，附 cannot find symbol 与栈溢出调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'java/110-ArrayDetailed'
  - 'java/150-OOP'
  - 'java/170-JavaInnerClass'
  - 'java/390-GenericDetailed'
prerequisites:
  - 'java/090-ControlFlow'
---

## 前置知识

- 已完成 [控制流](/java/090-ControlFlow)：会 if/for/while 与数组遍历。

## 学习目标

读完本文你将能够：

1. 独立设计方法的签名：参数收什么、返回什么、名字是否表意；
2. 解释 Java 只有值传递这句话的准确含义，并预测传递基本类型与对象引用的差异；
3. 用重载为同一动作提供多种入参形态，并预测编译器选中了哪一个；
4. 写出有出口的递归，识别 StackOverflowError。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

订单结算逻辑写了三处：购物车结账一处、优惠券核销一处、对账报表一处。某天单价字段改名，改了两处漏了一处，85 折被手滑写成 58 折——**同一逻辑出现多次，就是多次出错机会**。方法（method）是 Java 给你的第一剂解药：把逻辑命名、收口、复用。

## 2. 最小可运行示例

```java
public class Settle {
    static double settle(double price, int quantity) {
        return price * quantity * 0.85;   // 统一 85 折逻辑，只写一遍
    }

    public static void main(String[] args) {
        System.out.println(settle(10.0, 3));   // 25.5
        System.out.println(settle(200.0, 1));  // 170.0
    }
}
```

预期输出：

```text
25.5
170.0
```

`static` 暂时照抄（它属于类而不属于对象，[OOP](/java/150-OOP) 讲透）；`double` 是返回值类型；括号里是**形参**；调用时传入的是**实参**。

## 3. 发生了什么：签名即契约

`settle(double price, int quantity)` 这一行是方法与调用者之间的契约：你给我两个数，我还你一个折扣价。设计方法时先回答三个问题——**收什么、算什么、还什么**，签名自然就定了。命名同理：`settle`、`calc1`、`doIt` 三选一，未来读代码的人（包括你）只认 `settle`。

## 4. 核心概念一：Java 只有值传递

这是 Java 最常被误解的知识点，用实验说话：

```java
static void tryChange(int x)      { x = 999; }
static void tryChange(int[] arr)  { arr[0] = 999; }

public static void main(String[] args) {
    int n = 1;
    int[] a = {1};
    tryChange(n);
    tryChange(a);
    System.out.println(n);   // 1   —— 没变
    System.out.println(a[0]); // 999 —— 变了
}
```

预期输出：`1` 和 `999`。解释：Java 把「实参的值」复制给形参。基本类型的值就是数字本身，副本怎么改都影响不到原件；数组的值是**引用（地址）**，副本与原件指向同一个对象——通过副本改对象内容，原件看得见；但让副本指向别的对象，原件不动。记住一句：**传的是值的副本；这个值可能是地址**。

## 5. 核心概念二：重载（Overload）

同名不同参，是同一个动作的多种形态：

```java
static int    settle(int price)                  { return settle(price, 1); }
static double settle(double price, int quantity) { return price * quantity * 0.85; }
```

调用 `settle(10)` 时编译器按「实参与形参的类型最匹配」选中第一个。两条红线：**只有返回值不同不算重载**（编译报 duplicate method）；自动提升可能让调用命中你不想要的版本（传 `int` 给 `settle(double)` 合法但可能非本意）。

## 6. 核心概念三：递归要有出口

```java
static long factorial(int n) {
    if (n <= 1) return 1;          // 出口：没有它就是无限套娃
    return n * factorial(n - 1);
}
```

出口在前、规模递减，是递归的两大安全带。把出口注释掉再跑，你会收到 `StackOverflowError`——每层调用占一帧栈，栈深有限。Java 没有尾调用优化，深递归请改循环。

## 7. 可变参数

同一类型、个数不定的入参用 `类型... 名`：

```java
static double settleAll(double... prices) {
    double total = 0;
    for (double p : prices) total += p * 0.85;
    return total;
}
// settleAll(10, 20, 30) 与 settleAll(10) 都合法
```

它本质是数组形参的语法糖；一个方法最多一个可变参数且必须最后。

## 8. 常见错误与调试实录

错误一：方法里用错名字，javac 给出：

```text
error: cannot find symbol
  symbol:   variable prcie
```

读法：`symbol` 行直接告诉你拼错的名字（`prcie`），对照签名改正即可——030 篇见过它，这次注意 symbol 可能是变量也可能是方法。

错误二：调用写成了 `double d = settle(10, 3);` 但方法没有返回值（声明为 `void`）：

```text
error: incompatible types: void cannot be converted to double
```

要么补返回值，要么去掉赋值。

错误三：递归无出口或规模不减，运行时：

```text
Exception in thread "main" java.lang.StackOverflowError
```

排查动作：检查出口条件是否可达、每层规模是否向出口逼近。

## 9. 修改实验

1. 给 `settle` 增加 VIP 折扣参数 `double extraDiscount`，只有旧调用全部保持可编译（提示：用重载接住旧签名）；
2. 把 `tryChange(String s) { s = "changed"; }` 补全并预测 main 里的结果，运行验证「字符串引用也是值传递」；
3. 把 `factorial(20)` 改成 `long` 返回并观察溢出（对照 050 篇的回绕实验）。

## 10. 小练习

预测题（先写答案再运行）：交换方法的经典陷阱——

```java
static void swap(int a, int b) { int t = a; a = b; b = t; }
// main: int x=1, y=2; swap(x, y); 输出什么？
```

修改题：写 `boolean isTriangle(int a, int b, int c)`，任意两边之和大于第三边返回 true；用 3 组数据自测，其中一组是恰好相等的边界。

修 Bug 题：下面的重载为什么编译失败？给出两种修复方案：

```java
static double convert(double c) { return c * 1.8 + 32; }
static double convert(double f) { return (f - 32) / 1.8; }
```

挑战题（不看提示）：写递归 `int sumDigits(int n)` 求各位数字之和（`sumDigits(2026)` 为 10）。要求：先写出口，再写递推；用 0（边界）、9（一位数）、2026（多位）三组数据验证。

## 11. 什么时候应该 / 不应该抽方法

应该：同一段逻辑出现第二次时；一个 main 超过约 40 行时（按动作切段）；逻辑需要测试时（方法可单测，main 不可）。

不应该：为了「每个方法 5 行」而把强相关步骤撕碎（读代码要跳 5 跳反而更难）；用一个布尔参数让方法干两件不同的事（那是两个方法）。

## 12. 与之前和之后的知识的关系

- 往前：090 的循环体是本文抽取逻辑的原材料；060 的包装类在「传 Integer 进方法再赋值」时再次踩中值传递；
- 往后：[数组](/java/110-ArrayDetailed) 的常见操作会全部方法化；[OOP](/java/150-OOP) 里方法将挂到类与对象身上，`static` 之谜届时揭晓；
- 更远：[方法重载与泛型](/java/390-GenericDetailed) 是本文重载的进阶形态。

## 13. 官方文档

- 定义方法（Oracle 官方教程）：https://docs.oracle.com/javase/tutorial/java/javaOO/methods.html
- 传递语义的权威表述（JLS 关于参数按值）：https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.4.1

## 14. 自我检查

- 能不看示例默写「契约三问」并给方法定签名；
- 能向别人解释「Java 只有值传递」，并用 int 与 int[] 两个实验演示；
- 能说出重载的两条红线；
- 拿到 StackOverflowError 知道检查哪两处。

## 本章总结

方法是把逻辑命名收口的契约：签名写清收什么还什么；Java 传值的副本（值可能是地址）；重载按类型最匹配解析、返回值不参与；递归必备可达出口。这三件事把「复用」从复制粘贴升级为语言机制——下一篇把它们挂到对象的身上。

## 下一步

进入 [数组详解](/java/110-ArrayDetailed)，把方法用在一批批数据上；随后 [面向对象](/java/150-OOP) 登场，`static` 的谜底在那里揭晓。
