---
order: 80
title: 变量与常量：分数要变，用户名不能变
module: 'java'
category: 后端技术
difficulty: beginner
description: 以排行榜分数与登录用户名讲透 Java 变量：声明与初始化、花括号作用域、final 常量与 UPPER_CASE、var 类型推断的使用边界、引用变量与 060 装箱的呼应，附 variable might not have been initialized 调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'java/060-WrapperCacheTrap'
  - 'java/080-OperatorExpression'
  - 'java/100-MethodDetailed'
  - 'java/150-OOP'
prerequisites:
  - 'java/060-WrapperCacheTrap'
---

## 前置知识

- 已完成 [包装类缓存陷阱](/java/060-WrapperCacheTrap)：认识 int 与 Integer 的分工、装箱与 equals 的正确姿势——本文第 6 节要在这个地基上盖楼；
- [程序结构与基本语法](/java/040-ProgramStructureBasicSyntax) 让你见过「名字活在花括号里」的雏形，没读过也不影响，本文会带。

同一幕你在 [python/090](/python/090-VariableConstant) 见过。Java 的不同：类型必须先声明，「不能变」能用关键字变成编译期保证。

## 学习目标

读完本文你将能够：

1. 区分局部变量、参数、字段的作用域，解释为什么局部变量没有默认值；
2. 用 final 声明常量，遵守 UPPER_CASE 约定，说出编译期常量合并这一现象；
3. 判断何时该用 var（Java 10+），复述它的三条限制；
4. 说出基本类型变量与引用变量各装的是什么，并与 060 的装箱对上号；
5. 拿到 variable might not have been initialized，能三步定位并修复。

预计 45 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：排行榜的分数要变，登录的用户名不能变

排行榜小游戏有两个数据：分数，每赢一局就涨；用户名，登录后就不该再动。第一版：

```java
public class LeaderboardDemo {
    public static void main(String[] args) {
        int score = 1000;                 // 分数：每局都要变
        final String username = "阿天";    // 用户名：登录后不该变

        score = score + 150;              // 合法：变量重新赋值
        System.out.println(username + " 当前分数 " + score);
    }
}
```

预期输出：

```text
阿天 当前分数 1150
```

如果哪天有人手滑，补一行 `username = "别人";`，你希望程序静默改掉用户名，还是当场拒绝？Java 选择后者——那行代码编译不过：

```text
LeaderboardDemo.java:8: error: cannot assign a value to final variable username
        username = "别人";
        ^
1 error
```

`final` 就是那把锁。变量与常量的分工，就是本文的全部内容。

## 2. 声明、初始化与赋值：局部变量没有默认值

Java 的变量先声明类型再上岗：`int score;` 是声明，`score = 1000;` 是赋值（第一次赋值叫初始化），`int score = 1000;` 一步到位最常用。看着平平无奇，直到你手快，声明完直接用：

```java
public class InitDemo {
    public static void main(String[] args) {
        int bonus;                    // 只声明，没赋值
        System.out.println(bonus);    // 试试直接用
    }
}
```

编译当场翻车：

```text
InitDemo.java:4: error: variable bonus might not have been initialized
        System.out.println(bonus);
                           ^
1 error
```

读报错三步：类型——variable might not have been initialized，变量可能没初始化；位置——第 4 行的 `bonus`；原因——局部变量没有默认值，Java 故意不给：没赋值就敢用八成是忘了，宁可报错也不让脏数据溜进程序。

（对照：方法外面的字段——[面向对象](/java/150-OOP) 的主角——有默认值，int 字段自动是 0；编译器只对局部变量下狠手。）

## 3. 作用域：变量活在哪对花括号里

040 说过「名字活在花括号里」，补上后半句：**局部变量的生死也跟着花括号走**。

```java
public class ScopeDemo {
    public static void main(String[] args) {
        int total = 300;               // main 的花括号里全程可用

        if (total >= 200) {
            int bonus = 50;            // 只活在 if 的花括号里
            total = total + bonus;
        }
        System.out.println(total);     // 350：total 还活着

        System.out.println(bonus);     // 出了花括号，名字已不存在
    }
}
```

预期输出是 `350` 加一行编译报错——第 10 行的 `bonus` 已经出了 if 的花括号：

```text
ScopeDemo.java:10: error: cannot find symbol
        System.out.println(bonus);
                           ^
  symbol:   variable bonus
  location: class ScopeDemo
1 error
```

cannot find symbol：声明它的花括号一合上，名字就消失。修法：把声明挪到需要它的那一层，或把计算留在括号里做完。下一篇 for 的 `i` 只活在 for 自己的括号里，[方法详解](/java/100-MethodDetailed) 的参数也是这条规则的下一站。

## 4. 常量：final 给「不能变」上锁

回到开头的用户名。`final` 表示「赋值之后不许再改」，违反者吃第 1 节那行报错：

```java
public class GameConfig {
    static final int MAX_RETRY = 3;             // 类级常量：全大写 + 下划线
    static final String GAME_TITLE = "排行榜小游戏";

    public static void main(String[] args) {
        final int TODAY_BONUS = 100;            // 方法内的局部常量
        System.out.println(GAME_TITLE + " 重试上限 " + MAX_RETRY + "，今日加成 " + TODAY_BONUS);
    }
}
```

预期输出：

```text
排行榜小游戏 重试上限 3，今日加成 100
```

三条约定：全大写加下划线命名（`MAX_RETRY` 而不是 `maxRetry`）；全程序共用的放类顶部 `static final`，方法里用的就地 `final`；同一个数字出现第三次时提名成常量，改需求只改一处。顺带一句现象：编译期就能算出值的常量（如 `MAX_RETRY = 3`），编译器会把它直接抄进每一处使用点——这叫编译期常量合并，知道即可。Python 靠约定加工具提醒，Java 是语言级强制，锁死就是锁死。

## 5. var：让编译器替你写类型（Java 10+）

右边一眼能看出类型时，类型名纯属复读。Java 10 起用 `var` 让编译器推断：

```java
public class VarDemo {
    public static void main(String[] args) {
        var score = 100;            // 推断为 int，不是「什么都能装」
        var title = "排行榜";       // 推断为 String

        score = score + 50;         // 仍然只能装 int
        System.out.println(title + "：" + score);
    }
}
```

预期输出：

```text
排行榜：150
```

先把误解摁住：**var 不是动态类型**，类型在编译那一刻焊死。什么时候用：右边类型一目了然时（如 `var list = new ArrayList<String>();`）；什么时候别用：方法返回值看不出来时，逼读者跳去查签名，省两个字母赔可读性。三条限制：只限局部变量；必须当场初始化；推断后类型不可换。不给初始值，编译器无从推断：

```text
VarNoInit.java:3: error: cannot infer type for local variable s
        var s;
            ^
  (cannot use 'var' on variable without initializer)
1 error
```

## 6. 引用变量的本质：变量里装的是什么

060 的装箱题现在有了地基。看一段对照：

```java
public class RefDemo {
    public static void main(String[] args) {
        int a = 128;
        int b = a;                  // 基本类型：把值复制一份
        b = b + 1;
        System.out.println(a);      // 128：a 不受影响

        Integer x = 128;            // 060 的老朋友：装箱
        Integer y = x;              // 引用复制：两个名字，同一个对象
        System.out.println(x.equals(y));
    }
}
```

预期输出：

```text
128
true
```

两类变量装的东西不一样：

| 变量类型 | 变量里装的是 | 复制变量时 |
| --- | --- | --- |
| int、double、boolean 等 | 值本身 | 值被复制，各过各的 |
| Integer、String、数组、集合等 | 对象的引用（类似地址） | 引用被复制，仍指向同一个对象 |

遥控器比喻：**赋值递的是遥控器，不是再买一台电视**。x 与 y 拿着同一台电视的两把遥控器；060 的「128 == 128 为 false」正源于此——`==` 问「是不是同一台」，不是「看起来一样吗」。现阶段它只影响写 equals 的手（060 已立规矩）；真咬人要等数组与集合登场（[110](/java/110-ArrayDetailed)、[210](/java/210-CollectionFrameworkDetailed)）。

## 7. 修改实验

实验一（10 分钟）：把 InitDemo 的 `bonus` 改成在 if 和 else 两条分支里都赋值，预测编译结果再验证（通过——编译器确认每条路都有值）；删掉 else 再编译（报错回来）。

实验二（5 分钟）：给 GameConfig 加 `static final int MAX_SCORE = 9999;`，再在 main 里写 `MAX_SCORE = 0;`。先写预测的报错原文再编译对照。

实验三（5 分钟）：在 VarDemo 里加一行 `title = 42;`，预测报错再验证——title 已被推断为 String，装不进 int。

## 8. 常见错误与调试实录

错误一：重复声明同名变量。复制上一行改数值是最常见来源：

```java
int score = 100;
int score = 200;    // 同一个作用域里，名字只能注册一次
```

```text
RedeclareDemo.java:4: error: variable score is already defined in method main(String[])
        int score = 200;
            ^
1 error
```

修法：删掉重复声明只留赋值，或换个有区分度的名字。

错误二：条件分支只给一条路赋值。比第 2 节的裸用更隐蔽：

```java
int score = 74;
int grade;
if (score >= 60) {
    grade = 1;                 // 及格了才赋值
}
System.out.println(grade);     // 不及格时 grade 是什么？
```

```text
error: variable grade might not have been initialized
        System.out.println(grade);
                           ^
```

编译器看穿了：score 可能小于 60，那条路上 grade 没被赋值。修法二选一：补 else 覆盖另一条路，或声明时给默认值 `int grade = 0;`——它替你拦下了一次「不及格时打印随机值」的事故。

错误三：把 var 当万能容器。var 只在声明那一刻推断类型：

```java
var score = 100;     // 推断为 int
score = "一百";       // 以为 var 什么都能装？
```

```text
error: incompatible types: String cannot be converted to int
        score = "一百";
                ^
```

读法技巧：格式固定是「右边类型 cannot be converted to 左边变量的类型」，看到它先查等号两边各是什么。

## 9. 实际项目中的使用场景

- 配置常量集中放：`static final int MAX_UPLOAD_MB = 50;` 攒在类顶部，改配置只碰一处；
- 最小作用域：变量在需要它的那一层声明，能进 if 块的别提到方法开头；
- var 的团队惯例：右侧类型一目了然才用；字段、参数、返回值一律写全类型；
- 与 060 口诀合流：可空选包装类、纯计算选基本类型——选型最终都落在「怎么声明变量」。

## 10. 小练习

预测题（5 分钟）：先写答案再运行：

```java
int x = 10;
int y = x;
y = y + 5;
System.out.println(x);
System.out.println(y);
```

（验证：10 与 15。int 复制的是值，改 y 动不了 x。）

修改题（10 分钟）：给 GameConfig 加 `static final int WIN_STREAK_BONUS = 30;`，声明 `int bonus = 0;` 后用三次 `bonus = bonus + WIN_STREAK_BONUS;` 模拟连赢三局并输出，预期 `bonus = 90`。（加法运算符 [运算符与表达式](/java/080-OperatorExpression) 下一篇细讲，照抄即可。）

修 Bug 题（15 分钟）：下面的程序想输出 20（未满百免运费），编译都过不去。按三步定位后修复：

```java
int price = 20;
int shipping = 15;
if (price > 100) {
    int total = price + shipping;
} else {
    int total = price;
}
System.out.println(total);
```

```text
error: cannot find symbol
        System.out.println(total);
                           ^
  symbol:   variable total
```

（两个 total 各活在各自的花括号里。修法：把 total 的声明提到 if 外面，分支里只赋值——参考错误二的结构。）

挑战题（半小时）：写一个 ProfileCard 类：声明 `static final String GAME_TITLE` 与局部可变变量 `level`，输出「游戏名 | 等级 N」后模拟升一级再输出一行；最后在注释里默写：给 GAME_TITLE 赋新值会触发什么报错原文。验收：输出两行且等级递增。

## 11. 与之前和之后的知识的关系

- 往前：[包装类缓存陷阱](/java/060-WrapperCacheTrap) 的装箱机制在第 6 节归位——Integer 变量装的是引用，这正是 == 与 equals 分工的底层原因；040 的花括号规则升级成完整作用域。至此 040（语句与结构）→ 050（类型转换）→ 060（包装类）→ 070（本文）这条入门主线收尾；
- 往后：[运算符与表达式](/java/080-OperatorExpression) 把 `score + bonus` 里的运算符讲全；[方法详解](/java/100-MethodDetailed) 的参数是作用域下一站；[面向对象](/java/150-OOP) 的字段（有默认值的那类变量）正式登场。

## 12. 官方文档

- Oracle Java Tutorials「Variables」：https://docs.oracle.com/javase/tutorial/java/nutsandbolts/variables.html
- Java 官方教程 Language Basics（dev.java）：https://dev.java/learn/language-basics/
- JEP 286「Local-Variable Type Inference」（var 的设计文档，Java 10）：https://openjdk.org/jeps/286

## 13. 自我检查

- 能解释「为什么局部变量没有默认值、字段有」，并举出编译器拦下的事故；
- 拿到 variable might not have been initialized 与 cannot find symbol，能分别说出成因与两种修法；
- 能不查资料写出 `static final` 常量，说出 UPPER_CASE、编译期合并、final 锁三个要点；
- 能说出 var 的三条限制并各举一个该用与不该用的例子；
- 能用遥控器比喻解释两类变量的复制差异，接上 060 的 == 之谜。

## 本章总结

变量先声明类型再上岗；局部变量没有默认值，编译器用 variable might not have been initialized 强制「先赋值再用」。作用域跟着花括号走，出括号即报 cannot find symbol。final 给「不能变」上语言级的锁，常量全大写下划线命名，编译期可算出值的常量直接合并进使用点。var 只是让编译器替你写类型，声明即焊死，只限局部变量且必须当场初始化。基本类型变量装值、复制即分家；引用变量装引用、复制的是遥控器——060 的 == 之谜在此闭环。

## 下一步

进入 [运算符与表达式](/java/080-OperatorExpression)：`score = score + bonus` 里的加号藏着一个 040 留下的悬念——为什么 9 折算出来是 74 而不是 74.7？下一篇正面回收。
