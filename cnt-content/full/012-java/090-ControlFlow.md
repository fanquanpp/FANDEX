---
order: 100
title: 控制流：写一个猜数字游戏
module: 'java'
category: 后端技术
difficulty: intermediate
description: 以猜数字游戏（python/060 与 javascript/060 的 Java 版）讲透判断与重复：if/else、Java 14 箭头 switch、while/for/for-each、break 与 continue、死循环与 Ctrl+C 急救、060 Integer 比较陷阱的循环版回收，附 unreachable statement 调试实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'java/060-WrapperCacheTrap'
  - 'java/080-OperatorExpression'
  - 'java/100-MethodDetailed'
  - 'java/110-ArrayDetailed'
prerequisites:
  - 'java/080-OperatorExpression'
---

## 前置知识

- 已完成 [运算符与表达式](/java/080-OperatorExpression)：会比较与组合条件、理解 && 与 || 的短路——本文所有「判断」的条件就是它们；
- [包装类缓存陷阱](/java/060-WrapperCacheTrap) 的 equals 纪律会在第 6 节的循环里回收。

这个游戏你写过两遍了：[Python 控制流](/python/060-ControlFlow) 与 [JavaScript 控制流](/javascript/060-ControlFlow) 用的就是同一个案例。语法不同，思路同构：`elif` 与 `else if`、`while True` 与 `while (true)`、`range(3)` 与 `for (int i = 0; i < 3; i++)`，读键盘输入 Python 用 `input()`，Java 用 `Scanner`（先照抄，第 3 节细说）。

## 学习目标

读完本文你将能够：

1. 用 if / else if / else 与 Java 14 箭头 switch 写多路判断，说出各自适合的场景；
2. 用 while 写「猜中为止」的主循环，用 for 与 for-each 遍历数组与列表，死循环时知道 Ctrl+C 急救；
3. 分清 break（跳出整个循环）与 continue（跳过这一圈）；
4. 解释 060 的 Integer == 陷阱为何在循环里换数据范围就翻车，并用 equals 修复；
5. 拿到 unreachable statement，能指出「到不了」的那一行并修复。

预计 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：猜数字游戏

规则：程序心里想一个 1 到 100 的数，你反复猜，它提示「大了」「小了」，猜中为止。整个游戏只有两种结构：**判断**（大了还是小了）与**重复**（猜一次不够就再猜）。先跑「判断一次」——程序想 42，你猜 50：

```java
public class GuessOnce {
    public static void main(String[] args) {
        int secret = 42;    // 程序心里的数，先写死方便调试
        int guess = 50;

        if (guess > secret) {
            System.out.println("大了");
        } else if (guess < secret) {
            System.out.println("小了");
        } else {
            System.out.println("猜中了");
        }
    }
}
```

预期输出：

```text
大了
```

条件是上一章的比较表达式，花括号是 070 的作用域边界——判断没有新知识，新的只是「条件成立才执行」。Python 用缩进分块，Java 用大括号，仅此而已。

## 2. switch：一排选项的判断

游戏开局总有个难度菜单。一长串 else if 能写，但 Java 14 起有更顺手的箭头语法（Modern switch）：

```java
public class DifficultyMenu {
    public static void main(String[] args) {
        int choice = 2;

        String name = switch (choice) {
            case 1 -> "简单：答案在 1 到 10 之间";
            case 2 -> "普通：答案在 1 到 100 之间";
            default -> "没有这个难度";
        };
        System.out.println(name);
    }
}
```

预期输出：

```text
普通：答案在 1 到 100 之间
```

三个要点：`case 值 ->` 直接给出结果，没有「穿透」（老式冒号加 break 忘一个就漏到下一个 case，箭头语法从机制上消灭了这坑）；多值共用结果写成 `case 1, 2 ->`；switch 整体是表达式，结果直接赋给变量。适合场景一句话：**按离散取值分派用 switch，按范围比较用 if/else**。

## 3. while：猜中为止的主循环

判断一次只值一个回合，游戏要循环。完整版来了（Scanner 是标准库读键盘输入的工具，先照抄，输入输出在 [现代 IO 速成](/java/270-ModernIOQuickstart) 细讲）：

```java
import java.util.Scanner;

public class GuessNumber {
    public static void main(String[] args) {
        int secret = 42;
        int tries = 0;
        Scanner input = new Scanner(System.in);

        while (true) {
            System.out.print("猜一个 1 到 100 的整数：");
            int guess = input.nextInt();
            tries++;

            if (guess < 1 || guess > 100) {
                System.out.println("超出范围，重新猜");
                continue;
            }
            if (guess > secret) {
                System.out.println("大了");
            } else if (guess < secret) {
                System.out.println("小了");
            } else {
                System.out.println("猜中了，用了 " + tries + " 次");
                break;
            }
        }
    }
}
```

一次真实对局（冒号后是你敲的数字）：

```text
猜一个 1 到 100 的整数：80
大了
猜一个 1 到 100 的整数：150
超出范围，重新猜
猜一个 1 到 100 的整数：42
猜中了，用了 3 次
```

逐个拆解新面孔：`while (true)` 条件永远成立，配 `break` 用——猜中瞬间跳出**整个循环**，游戏结束；`continue` 跳过**这一圈**剩下的代码，回到开头重新等输入——超范围的数字不配参与比较；`int guess` 声明在循环体内，070 的作用域规则，每圈重生一次。

**死循环与急救**：忘了 `break`，程序就永远问下去——这就是死循环。急救键是 **Ctrl+C**（按住 Ctrl 再按 C），终端立刻终止程序，放心按，不会弄坏任何东西。`while (true)` 加 break 本身是「跑起来、满足条件才停」的标准姿势；坏的是忘了退路。顺带一句话认识的 do-while：条件检查放在一圈**之后**（`do { ... } while (条件);`），适合「菜单至少显示一次」，用到再学。

## 4. for 与 for-each：重复的另一种姿势

while 适合「不知道多少次」，**知道次数**时 for 更顺手。080 的平均分当时硬编码三局，现在升级成任意局数（数组是「一串同类型值」，[数组详解](/java/110-ArrayDetailed) 细讲，先当一串数用）：

```java
public class SeasonStats {
    public static void main(String[] args) {
        int[] scores = {98, 85, 73};

        int total = 0;
        for (int i = 0; i < scores.length; i++) {
            total = total + scores[i];     // scores[i]：第 i 个元素
        }
        System.out.println("总分 " + total);
        System.out.println("场均 " + (double) total / scores.length);
    }
}
```

预期输出：

```text
总分 256
场均 85.33333333333333
```

for 括号里三段用分号隔开：`int i = 0` 起手；`i < scores.length` 每圈开跑前检查，不成立就结束；`i++` 每圈末尾走一步。变量 i 只活在 for 的括号与花括号里——070 的作用域规则再次兑现。

只关心「每个元素」不关心第几个时，for-each 更省心（List 是「会自动变长的数组」，[集合框架详解](/java/210-CollectionFrameworkDetailed) 细讲，先照抄）：

```java
import java.util.List;

public class RankListDemo {
    public static void main(String[] args) {
        List<String> players = List.of("阿天", "小鹿", "老周");

        for (String name : players) {
            System.out.println("上榜：" + name);
        }
    }
}
```

预期输出：

```text
上榜：阿天
上榜：小鹿
上榜：老周
```

读作「对 players 里的每个 name」。需要序号（打印「第 1 名」）就回到经典 for——两者是工具不是流派。

## 5. break 与 continue 小结

主循环里两个关键字已各就各位，一句话钉死分工：**break 是「这个循环到此为止」，continue 是「这一圈到此为止」**。它们只作用于自己所在的那一层循环；想从内层直接跳出外层，日常先用「把内层循环抽成方法 + return」解决，「带标签的 break」等真遇到那天再查。

## 6. 060 的坑在循环里复活：Integer == 的翻车现场

榜单分数存在 List<Integer> 里——泛型只认包装类（060 说过）。循环里查找某个分数，== 看着挺好使：

```java
import java.util.List;

public class RankCheckBug {
    public static void main(String[] args) {
        List<Integer> scores = List.of(88, 200, 127);
        Integer target = 200;              // 想找 200 分的记录

        for (Integer s : scores) {
            if (s == target) {             // 060 的坑：包装类对包装类用 ==
                System.out.println("找到了 " + target);
            }
        }
        System.out.println("查找结束");
    }
}
```

预期输出：

```text
查找结束
```

没有任何「找到了」——明明 200 就在名单里。060 的机制原文照搬：200 在 -128 到 127 缓存之外，s 和 target 是**两个不同对象**，== 比的是「是不是同一个东西」。更阴险的是它的「有时能用」：target 换成 88 就能找到（池内命中同一对象）——测试用 88 全绿，上线一查 200 静默失效。修复只需一个词：

```java
if (s.equals(target)) {    // 包装类判等，永远 equals
```

改完再跑：

```text
找到了 200
查找结束
```

## 7. 修改实验

实验一（15 分钟）：给 GuessNumber 加规则「最多猜 7 次」：超过后输出「游戏结束，答案是 42」并退出。（提示：tries 与 7 的比较放在读入之后；也想想 `while (tries < 7)` 哪个更顺。）

实验二（10 分钟）：给 RankListDemo 的 List.of 增加第四个名字，预测输出行数再验证；再改用经典 for，输出带序号的「第 1 名：阿天」。

实验三（10 分钟）：把 RankCheckBug 的 target 换成 88，预测 == 版本输出再验证（能找到——缓存命中）；换 129 验证翻车；最后用 equals 版本把三个数字各跑一遍，确认全部正确。

## 8. 常见错误与调试实录

错误一：break 后面还想干点活。编译期就拦下：

```java
public class UnreachableDemo {
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) {
            if (i == 1) {
                break;
                System.out.println("收尾工作");    // break 之后还想执行？
            }
        }
    }
}
```

```text
UnreachableDemo.java:6: error: unreachable statement
                System.out.println("收尾工作");
                ^
1 error
```

读报错三步：类型 unreachable statement——无法到达的语句；位置第 6 行；原因——编译器证明 break 已离开循环，后面那行任何情况下执行不到。修法：离开循环前做的事写在 break **之前**，循环结束后做的写在循环外面。

错误二：while 括号后多写一个分号。编译通过、运行无声卡死，本文最阴的坑：

```java
int tries = 0;
while (tries < 3);          // 这个分号让循环体变成了「空」
{
    System.out.println("尝试 " + tries);
    tries++;
}
```

Java 里单独一个分号是合法的空语句，于是 while 每圈只执行「空」，tries 永远是 0，程序一动不动——终端里按 Ctrl+C 急救，然后删掉那个分号。排查口诀：**循环卡死先看括号后有没有多分号，再看条件里的变量有没有被推进**。

错误三：for 忘写第三段。`for (int i = 0; i < 3; )` 缺了 `i++`，编译照过，i 永远是 0，与错误二殊途同归。让循环终会结束的那个量，必须在循环体或第三段里被更新。

## 9. 实际项目中的使用场景

- 输入校验循环：读输入，超范围 continue 重问，合法才往下走——猜数字的骨架原样搬进命令行工具；
- 重试上限：调接口失败最多重试 3 次（for 加 break），次数上限写成 070 的 `static final int MAX_RETRY`；
- 批量统计与菜单主循环：for-each 求和求平均找最大（SeasonStats 就是雏形）；`while (true)` 显示菜单、switch 分派、选退出才 break——命令行程序的标准骨架。

## 10. 小练习

预测题（5 分钟）：先写答案再运行：

```java
int sum = 0;
for (int i = 1; i <= 4; i++) {
    if (i == 2) {
        continue;
    }
    sum += i;
}
System.out.println(sum);
```

（验证：8。i 为 2 那一圈被 continue 跳过，1 加 3 加 4。）

修改题（10 分钟）：给 DifficultyMenu 增加第 4 难度「地狱：答案在 1 到 10000 之间」；再把 GuessOnce 的 guess 改成 42，预测输出（猜中了）再验证。

修 Bug 题（15 分钟）：下面的程序想统计三轮得分并逐轮打印，编译都过不去。按三步定位后修复，要求输出四行：三轮得分与总分 6。

```java
public class LoopBug {
    public static void main(String[] args) {
        int score = 0;
        for (int i = 1; i <= 3; i++) {
            score += i;
            break;
            System.out.println("本轮得分 " + i);
        }
        System.out.println("总分 " + score);
    }
}
```

```text
LoopBug.java:6: error: unreachable statement
            System.out.println("本轮得分 " + i);
            ^
1 error
```

（作者把 break 当成了「这一圈结束」——那叫 continue；这里循环本来就会自己走完，break 是多余的，删掉即修复。）

挑战题（半小时）：给定 `int[] scores = {88, 95, 73, 60, 99};`，**只遍历一次**，同时求出最高分与平均分。验收：输出必须与下面完全一致（平均分是 080 的类型转换知识）：

```text
最高 99，平均 83.0
```

（提示：max 先取第一个元素再逐个比较；展开：一个 for 循环，体内一个 if 加一次累加，循环外算平均。）

## 11. 与之前和之后的知识的关系

- 往前：[运算符与表达式](/java/080-OperatorExpression) 的比较与逻辑表达式从「算出 boolean」升级为「指挥程序走哪条路」；[包装类缓存陷阱](/java/060-WrapperCacheTrap) 的 == 陷阱在第 6 节翻车又修复；[变量与常量](/java/070-VariableConstant) 的作用域规则在循环变量上兑现；
- 往后：[方法详解](/java/100-MethodDetailed) 把游戏逻辑拆成方法，return 与 break 的分工届时讲清；[数组详解](/java/110-ArrayDetailed) 揭开 scores[i] 的真面目；[Java 字符串详解](/java/130-JavaStringDetailed) 补上 switch 的 String 选择器与字符串比较细节。

## 12. 官方文档

- Oracle Java Tutorials「Control Flow Statements」：https://docs.oracle.com/javase/tutorial/java/nutsandbolts/flow.html
- JEP 361「Switch Expressions」（箭头 switch 的设计文档，Java 14）：https://openjdk.org/jeps/361
- Java 官方教程 Language Basics（dev.java）：https://dev.java/learn/language-basics/

## 13. 自我检查

- 能不查资料写出「猜中为止」的 while 主循环，说出 break 与 continue 各自跳到哪；
- 能把 else if 长链改写成箭头 switch，说出两者各自适合的场景；
- 死循环时知道按 Ctrl+C，能说出两个排查点（多余分号、条件变量未推进）；
- 能现场解释「测试用 88 能查到、上线查 200 查不到」的因果链，条件反射写出 equals；
- 能说出 for 三段含义，以及什么时候改用 for-each。

## 本章总结

判断与重复撑起一切程序：if/else 按范围分路，Java 14 箭头 switch 按离散取值分派且没有穿透。while (true) 加 break 写「猜中为止」，continue 只跳过这一圈，死循环靠 Ctrl+C 急救、靠「条件变量必须被推进」预防。for 三段管计数，for-each 管逐个元素，要序号回经典 for。060 的 Integer == 陷阱在循环里换到 200 就翻车——包装类判等永远 equals，与循环无关，与数据范围有关。unreachable statement 是编译器替你证明「这行到不了」；while 后多一个分号是最阴的静默死循环。

## 下一步

进入 [方法详解](/java/100-MethodDetailed)：猜数字整个程序挤在 main 里已经开始臃肿——「出一道题」「判断一次」「统计次数」各归各的方法，参数与返回值就是变量与作用域规则的下一站。
