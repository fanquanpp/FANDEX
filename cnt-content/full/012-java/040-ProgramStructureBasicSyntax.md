---
order: 40
title: 程序结构与基本语法：把语句攒成程序
module: 'java'
category: 后端技术
difficulty: beginner
description: 以订单小计程序为主线讲透源文件骨架：语句与块、作用域边界、三种注释、包与 import 的最小使用、驼峰命名约定，附 cannot find symbol 的两副面孔与缺括号报错的调试实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/030-QuickStart'
  - 'java/050-DataTypeConversion'
  - 'java/070-VariableConstant'
  - 'java/100-MethodDetailed'
prerequisites:
  - 'java/030-QuickStart'
---

## 前置知识

- 已完成 [快速上手](/java/030-QuickStart)：能独立写出 HelloWorld，见过一次 cannot find symbol。没吃透也没关系，用到处会回指；没读过请先回去跑通那个五行程序。

## 学习目标

读完本文你将能够：

1. 说出源文件的三段结构（包声明、import、类），并解释为什么 System 不用 import；
2. 判断一个变量在哪对花括号里可见，预测「出了块再用」的报错；
3. 用三种注释分别写「给自己看的注脚」和「给 javadoc 工具看的文档」；
4. 按驼峰约定命名类、变量与常量，说出它与 Python PEP 8 的对应关系；
5. 写出第一个多行程序（订单小计），并独立修复 cannot find symbol。

预计 40 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：HelloWorld 跑通了，然后呢

HelloWorld 只会说一句话。真实程序要做一连串事——比如算一笔订单小计，蛋糕 28 元买 2 份、曲奇 9 元买 3 份。今天不学新魔法，只回答两个问题：**语句怎么攒成程序，名字怎么起才不会三天后认不出自己写的代码**。

## 2. 语句与块：程序的最小骨架

- **语句**：一条完整指令，以分号结尾。`System.out.println("Hi");` 是，`int price = 9;` 也是；
- **块（block）**：一对花括号 `{ }` 包起来的一组语句。main 方法体是块，类体也是块，块里还能套块。

程序从 main 第一行起，一条语句接一条执行到最后——顺序结构（分支与循环在 [控制流](/java/090-ControlFlow) 加入）。花括号必须成对出现，先闭方法再闭类，缺括号的报错见第 9 节。

## 3. 作用域：名字活在哪对花括号里

Java 的规则是**先声明，后使用**：`int cakePrice = 28;` 声明一个 int 类型的名字（int 是下一篇的主角，照抄写法即可）。名字能被使用的范围叫**作用域**，规则只有一条：

**名字从声明行开始有效，到它所在的那对花括号闭合为止。** 花括号是名字的城墙，出了 `}` 就查无此人。

亲手验证，新建 CouponDemo.java：

```java
public class CouponDemo {
    public static void main(String[] args) {
        int subtotal = 83;                  // 整个 main 里都能用
        {
            int coupon = 5;                 // 只在这对内层花括号里存在
            System.out.println("会员立减 " + coupon + " 元");
        }
        System.out.println(coupon);         // 试图出块再用
    }
}
```

编译：

```text
CouponDemo.java:8: error: cannot find symbol
        System.out.println(coupon);
                           ^
  symbol:   variable coupon
  location: class CouponDemo
1 error
```

读报错三步（030 教过）：`symbol: variable coupon` =「编译器不知道这个名字」——它的块在第 7 行闭合，第 8 行已注销。修法：块外还要用，就搬声明。

## 4. 注释的三种写法

```java
// 单行注释：给"这一行"做注脚，解释为什么这么写

/*
 * 多行注释：解释一段代码的整体思路，
 * 或临时禁用几行代码。
 */

/**
 * 文档注释：写给 javadoc 工具看，能自动生成 API 文档网页。
 */
public class NoteDemo {
    public static void main(String[] args) {
        int cookiePrice = 9;    // 单位是元，不是分
        System.out.println(cookiePrice * 3);
    }
}
```

预期输出：

```text
27
```

纪律：注释解释**为什么**而不复述是什么；文档注释配合 javadoc 命令生成网页——标准库官方文档就是这么来的，`@param`、`@return` 标签在 [方法详解](/java/100-MethodDetailed) 补全。

## 5. 包与 import：Java 怎么找到类

把购物车商品存成列表，标准库有现成的 `List`，直接用试试：

```java
public class Cart {
    public static void main(String[] args) {
        List<String> items = List.of("草莓蛋糕", "可可曲奇");
        System.out.println("购物车 " + items.size() + " 件：" + items);
    }
}
```

编译报错：

```text
Cart.java:3: error: cannot find symbol
        List<String> items = List.of("草莓蛋糕", "可可曲奇");
        ^
  symbol:   class List
  location: class Cart
1 error
```

又是 cannot find symbol，但注意 symbol 行：上次是 `variable coupon`，这次是 `class List`。**variable 是名字问题，class 是「这个类编译器不认识」**。List 住在标准库的 java.util 包里，在文件顶部加一行 `import java.util.List;` 再编译运行：

```text
购物车 2 件：[草莓蛋糕, 可可曲奇]
```

说透四件事：

- **包就是目录**（030 预告过），`java.util.List` 读作「java.util 包里的 List 类」；**import 不是复制代码**，只是声明「下文直接写 List，指的是 java.util.List」；
- **java.lang 包自动可用**（System、String、Integer 都在其中）——这就是 HelloWorld 不用 import 的原因；
- `package com.example.shop;` 反向声明「我的类住在这个包里」，必须是文件第一行且目录层级一致，学习期可不写；
- `List<String>` 的尖括号先混个眼熟，[集合框架详解](/java/210-CollectionFrameworkDetailed) 讲透。

## 6. 命名规范：让三个月后的你认得代码

Java 社区有一套人人遵守的命名约定（写过 Python 的话：PEP 8 之于 Python，就是这套约定之于 Java）：

| 内容 | 约定 | 例子 |
| --- | --- | --- |
| 类名 | 大驼峰，每个单词首字母大写 | OrderSubtotal、ScoreBoard |
| 方法名、变量名 | 小驼峰，首单词小写 | orderCount、printSubtotal |
| 常量 | 全大写，下划线分隔 | MAX_RETRY、DEFAULT_PRICE |
| 包名 | 全小写 | com.example.shop |

硬规则（违反直接编译失败）：字母、数字、下划线、美元符组成，不能以数字开头，不能用关键字（class、int 等 50 多个），**大小写敏感**——order 和 Order 是两个名字。对比一眼：`int a;` 谁都看不懂，`int order_count;` 是 Python 写法，`int orderCount;` 才是 Java。

## 7. 第一个多行小程序：订单小计

把今天的东西全部拼起来，新建 OrderSubtotal.java：

```java
public class OrderSubtotal {
    public static void main(String[] args) {
        // 单价单位是元，数量单位是份
        int cakePrice = 28;
        int cakeCount = 2;
        int cookiePrice = 9;
        int cookieCount = 3;

        // 小计 = 各商品 单价 × 数量 之和
        int cakeSubtotal = cakePrice * cakeCount;
        int cookieSubtotal = cookiePrice * cookieCount;
        int subtotal = cakeSubtotal + cookieSubtotal;

        System.out.println("==== 订单小计 ====");
        System.out.println("草莓蛋糕 ×2：" + cakeSubtotal + " 元");
        System.out.println("可可曲奇 ×3：" + cookieSubtotal + " 元");
        System.out.println("合计：" + subtotal + " 元");
    }
}
```

编译运行，预期输出：

```text
==== 订单小计 ====
草莓蛋糕 ×2：56 元
可可曲奇 ×3：27 元
合计：83 元
```

留一个伏笔：价格全是整数。如果蛋糕是 28.5 元呢？`int` 装不下小数，混进 `double` 后运算规则会变——这正是下一篇 [数据类型转换](/java/050-DataTypeConversion) 的开场问题。

## 8. 修改实验

实验一（5 分钟）：加第三样商品「热可可」，单价 12 元买 1 份，先写预期输出（合计 95 元）再核对。

实验二（10 分钟）：删掉全部注释，隔五分钟重读，回答丢了哪些信息；再给 subtotal 行补一条「解释为什么」的注释。

实验三（10 分钟）：把 `int subtotal = ...` 挪进一层新的内层花括号、最后一行 println 留在块外，先预测再验证——你将亲手复现第 3 节的报错。

## 9. 常见错误与调试实录

错误一：变量名打错（想打 orderCount 打成 orderCont）：

```text
Order.java:4: error: cannot find symbol
        System.out.println("订单数：" + orderCont);
                                       ^
  symbol:   variable orderCont
  location: class Order
1 error
```

三步定位：行号 → symbol 行 → 逐字母对照声明。九成是拼写，IDE 会画红线并给出「did you mean」建议。

错误二：缺右花括号。javac 报 `error: reached end of file while parsing`，且行号指向文件末尾——八成是前面某层 `{` 少了配对；IDE 自动格式化能让断层立刻现形。

错误三：忘了 import（第 5 节 Cart 的现场）。口诀：看 symbol 行——`variable` 查拼写与作用域，`class` 查 import。030 说的「一成是缺少引入」你今天见过了。

## 10. 实际项目中的使用场景

- 真实项目的源文件永远遵循「package、import、类」三段式；日志里抛错的类名就是全限定名（如 com.example.shop.Order）。代码评审里「命名」是最高频的意见来源——名字起对，一半注释都可省掉。

## 11. 小练习

预测题（5 分钟）：把下面片段放进 main 方法体，两行 println 各输出什么？先写答案再运行验证：

```java
int hp = 100;
{
    int damage = 30;
    hp = hp - damage;
}
System.out.println(hp);
System.out.println(damage);
```

（验证：第一行 70；第二行编译失败，cannot find symbol，symbol: variable damage——城墙规则。）

修改题（10 分钟）：给 OrderSubtotal 加会员 9 折：新增 `int discounted = subtotal * 9 / 10;` 并输出折后价。先算预期值再运行（结果是 74 而不是 74.7——整数运算把 0.7 丢哪了？把疑问带给下一篇）。

修 Bug 题（15 分钟）：下面代码想输出最终分数，编译报错如下。按读报错三步定位并修复，说清 symbol 是 variable 还是 class、为什么：

```java
public class Score {
    public static void main(String[] args) {
        int score = 95;
        {
            int bonus = 5;
            score = score + bonus;
        }
        System.out.println("最终分数 " + socre);
    }
}
```

```text
Score.java:8: error: cannot find symbol
        System.out.println("最终分数 " + socre);
                                          ^
  symbol:   variable socre
  location: class Score
1 error
```

挑战题（半小时）：写一个 Receipt 类输出收据：三样商品，每行一个小计，最后一行总计。要求：类名大驼峰、变量小驼峰、各留一条文档注释与单行注释、单价用变量。验收：javac 零报错；总计 = 各行小计之和；运行前已写出完整预期输出且逐行一致。提示（思路）：抄第 7 节骨架，两样改三样；展开（关键写法）：每样商品一对「单价 + 数量」变量，先算后打。

## 12. 与之前和之后的知识的关系

- 往前：[快速上手](/java/030-QuickStart) 的五行骨架，今天长成了完整的源文件三段式；
- 往后：[数据类型转换](/java/050-DataTypeConversion) 解决小数价格与 int 的混算，也解释修改题丢掉的 0.7；[包装类缓存陷阱](/java/060-WrapperCacheTrap) 揭开 Integer 的另一面；[变量与常量](/java/070-VariableConstant) 展开变量与命名；[方法详解](/java/100-MethodDetailed) 教你把语句抽成方法；[控制流](/java/090-ControlFlow) 加上分支与循环；
- 主线：040（本文）→ 050 → 060 → 070 是 Java 入门四部曲，按编号顺序学即可。

## 13. 官方文档

- Oracle Java Tutorials「Variables」（变量与作用域）：https://docs.oracle.com/javase/tutorial/java/nutsandbolts/variables.html
- Oracle Java Tutorials「Packages」（包与 import 的完整规则）：https://docs.oracle.com/javase/tutorial/java/package/packages.html
- Java 语言规范 JLS 第 6 章「Names」（标识符规则的权威定义）：https://docs.oracle.com/javase/specs/jls/se21/html/jls-6.html

## 14. 自我检查

- 能合上文档说出源文件三段式结构，并解释 System 为什么不用 import；
- 给一个变量，能立刻说出它在哪对花括号里可见；
- 看到 cannot find symbol，能按三步定位，并区分 symbol 是 variable 还是 class；
- 能一次编译通过写出订单小计程序，输出与预期完全一致。

## 本章总结

源文件从上到下是包声明、import、类；语句以分号结尾，花括号把语句攒成块；名字活在自己所在的块里，出了 `}` 即失效。注释三种各司其职，解释为什么而不是什么。要用的类不在 java.lang 就 import。命名跟着社区约定走：类大驼峰、变量小驼峰、常量全大写。cannot find symbol 有两副面孔——variable 查拼写与作用域，class 查 import。

## 下一步

进入 [数据类型转换](/java/050-DataTypeConversion)：int 和 double 相加，结果是谁？带着订单里那个 28.5 元的问题过去。
