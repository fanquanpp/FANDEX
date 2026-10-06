---
order: 140
title: 分支与循环实战题集：15 道循环题逐题通关
module: 'java'
category: 后端技术
difficulty: beginner
description: 以课堂题库与带步骤注释的成套参考代码为底，组织 15 道循环结构实战题，每题按任务-提示-可折叠参考实现三段式展开；找错环节剖析真实学生代码的位或误用与月份边界遗漏。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'java/090-ControlFlow'
  - 'java/095-ScannerConsoleInput'
  - 'java/100-MethodDetailed'
  - 'java/110-ArrayDetailed'
prerequisites:
  - 'java/090-ControlFlow'
---

## 知识点地图

- **知识类别**：控制流的**实战题集**——分支（if / switch）与循环（while / do-while / for）的刻意练习。语法本体由 [控制流](/java/090-ControlFlow) 承载（对照 Oracle 官方教程 Control Flow 类别：语言特性归教程、熟练度归题集），本篇不做语法复读，只做题。
- **解决什么问题**：看懂了 if 和 for 却写不出完整程序——「知道语法」与「条件循环组合出解法」之间隔着一层，只能靠逐题拆解跨过去。
- **什么时候用到**：学完 090 立即做一遍；每道题同时给出验证手段（如 5050 的数学验证），养成「写完先验算」的习惯。

题目来源为课堂题库 15 道循环结构题与配套的带步骤注释参考答案，找错题来自真实学生作业源码，全部按教学目的改写。

## 前置知识

- [控制流](/java/090-ControlFlow)：if / switch / while / for / break / continue 的语法；
- [Scanner 控制台输入](/java/095-ScannerConsoleInput)：题集一半的题目从键盘读数据；
- [运算符与表达式](/java/080-OperatorExpression)：`%` 取余在本篇反复出现。

## 学习目标

读完并做完本篇你将能够：

1. 用 while / do-while / for 三种写法实现同一累加题，并说出各自适合的场景；
2. 为计数、累加、枚举、图形打印四类套路各写出标准骨架；
3. 处理三处经典边界：0 的位数是 1、12 月漏判、循环变量忘了自增导致的死循环；
4. 从错误代码中区分「位运算符当逻辑运算符用」与「边界条件遗漏」两类 bug。

预计 90 分钟（15 题全做）或 45 分钟（做标注必做的 7 题）。

## 1. 题目总览与使用方式

| 编号 | 题目 | 核心套路 | 必做 |
| --- | --- | --- | --- |
| 1 | 登录三次重试 | 计数循环 + 状态标记 | 是 |
| 2 | 打印某数之后 5 个数 | 已知次数的 for | 否 |
| 3 | 1~100 求和三写法 | 三种循环互转 | 是 |
| 4 | 表白问答 | do-while 至少执行一次 | 是 |
| 5 | 整数位数统计 | 逐位削掉 + 0 特判 | 是 |
| 6 | 银行复利计算 | 循环模拟公式 | 是 |
| 7 | 1000 内不能被 7 整除之和 | 条件累加 | 否 |
| 8 | 累加和首次达到 2000 | break 提前退出 | 是 |
| 9 | 九九乘法表 | 双层嵌套 | 否 |
| 10 | 正三角与倒三角 | 嵌套 + 空格控制 | 否 |
| 11 | 输入校验 while(true) + break | 无限循环出口 | 是 |
| 12 | 猜数字游戏 | 综合运用 Random | 否 |
| 13 | 找错：位或当逻辑或 | 运算符语义 | 找错必做 |
| 14 | 找错：月份边界遗漏 | 边界分析 | 找错必做 |
| 15 | 选做扩展 | 两题迁移 | 否 |

每题按「任务 - 提示 - 参考实现（折叠）」三段式给出。**先自己写，再看参考**；参考实现里的步骤注释就是解题时应在纸上先列的思路。

## 2. 必做题详解

### 题 1 登录三次重试

**任务**：账号 admin、密码 123，连续错三次锁定；每次错误提示剩余机会；成功立即停止询问。

**提示**：循环条件要同时管两件事——次数没用完且尚未成功（`tryCount < 3 && !passed`）；字符串比较用 equals（095 篇场景二有完整版）。

<details>
<summary>参考实现</summary>

```java
// 步骤 1：准备计数器与成功标记
int tryCount = 0;
boolean passed = false;

// 步骤 2：循环询问——没试满三次且还没成功才继续
while (tryCount < 3 && !passed) {
    System.out.println("请输入账号：");
    String account = sc.next();
    System.out.println("请输入密码：");
    String pwd = sc.next();

    // 步骤 3：判断，分支更新状态
    if ("admin".equals(account) && "123".equals(pwd)) {
        passed = true;
    } else {
        tryCount++;                       // 失败才计数，成功不浪费次数
        System.out.println("错误，剩余 " + (3 - tryCount) + " 次机会");
    }
}

// 步骤 4：用状态变量统一收尾
System.out.println(passed ? "登录成功" : "账号已锁定");
```

自检：把 `!passed` 从循环条件里删掉会怎样？——密码已对的情况下循环仍会问满三次，因为 passed 只被赋值从未参与判断。这正是「变量控制了状态但没控制住循环」的实例。

</details>

### 题 2 打印某数之后 5 个数

**任务**：输入一个整数 n，打印 n+1 到 n+5。

**提示**：次数已知（5 次），首选 for；循环变量起点是 n+1 不是 n。

<details>
<summary>参考实现</summary>

```java
// 步骤 1：读入起点
int n = sc.nextInt();

// 步骤 2：从 n+1 开始数 5 个
for (int i = 1; i <= 5; i++) {
    System.out.println(n + i);
}
```

换一种写法：`for (int x = n + 1; x <= n + 5; x++)` 让循环变量直接持有要打印的值，两种都行；前者「计 5 次数」的思路在题 10 图形打印里更通用。

</details>

### 题 3 1~100 求和：三种循环互转

**任务**：分别用 while、do-while、for 求 1+2+...+100，三版结果必须都是 5050（数学公式 n(n+1)/2 = 5050，这是现成的验证锚点）。

**提示**：累加框架永远是「sum 初始 0 + 循环里 sum += i」；三种循环只差「判断时机」——while 先判后做、do-while 先做后判、for 把初始化与自增收进括号。

<details>
<summary>参考实现</summary>

```java
// 写法一：while——先判断后执行，条件不满足一次都不做
int sum = 0;
int i = 1;
while (i <= 100) {
    sum += i;
    i++;
}
// 1~100 的和固定为 5050，用它验证写法是否正确
System.out.println("while: " + sum);   // 5050

// 写法二：do-while——先执行一次再判断，循环体至少跑一遍
int sum2 = 0;
int j = 1;
do {
    sum2 += j;
    j++;
} while (j <= 100);
System.out.println("do-while: " + sum2);  // 5050

// 写法三：for——初始化、条件、自增集中在一行，计数循环首选
int sum3 = 0;
for (int k = 1; k <= 100; k++) {
    sum3 += k;
}
System.out.println("for: " + sum3);       // 5050
```

逐段讲解：三版的循环体一模一样，差别全在「何时判断」。若把题 2 的起点换成「先问用户要不要开始」，do-while 才有不可替代的价值——见题 4。for 版里变量 k 声明在括号内，循环外不可见，这是它比 while 版干净的原因之一。

</details>

### 题 4 do-while 表白问答

**任务**：反复问「喜欢我吗（y/n）」，直到输入 y 才退出。无论第一次输什么，程序至少要先问一次。

**提示**：至少执行一次是 do-while 的存在理由；判断输入用 `!answer.equals("y")`，别写成 `answer != "y"`。

<details>
<summary>参考实现</summary>

```java
String answer;

do {
    System.out.println("喜欢我吗？（y/n）");
    answer = sc.next();               // 先问、先读——循环体至少执行一次
} while (!answer.equals("y"));        // 不是 y 就再来一遍

System.out.println("太好了！");
```

换别的写法会发生什么：用 while 改写必须先给 answer 一个非 y 的占位值（如 `"n"`）才能进循环，占位值逻辑读起来绕；这正是「先执行后判断」场景该用 do-while 的论证。

</details>

### 题 5 整数位数统计（含 0 特判）

**任务**：输入一个小于 10 亿的正整数，输出它是几位数；输入 0 要输出 1 位。

**提示**：`num / 10` 每做一次削掉个位，能削几次就有几位；0 会被 while 条件直接跳过，需要特判。

<details>
<summary>参考实现</summary>

```java
// 步骤 1：读数，保留副本用于特判与展示
long num = sc.nextLong();

// 步骤 2：0 的位数是 1，先特判，否则 while(num != 0) 一圈都不跑
if (num == 0) {
    System.out.println("1 位");
} else {
    int count = 0;
    // 步骤 3：每除以 10 削掉一位，直到归零
    while (num != 0) {
        num = num / 10;
        count++;
    }
    System.out.println(count + " 位");
}
```

逐段讲解：`num = num / 10` 是「逐位削掉」套路的核心——12345 变 1234 变 123，削几次位数就是几。用 long 而不是 int 是为防 10 亿边界溢出（int 上限约 21.4 亿，接近边界时的输入可能翻车，long 一劳永逸）。把特判从 if 改成 do-while 也可以：`do { num/=10; count++; } while (num != 0);` 先跑一圈再判断，0 恰好跑一圈得 1 位——但可读性不如显式特判，建议保留 if 版。

</details>

### 题 6 银行复利计算

**任务**：本金 10000，年利率千分之三，求 5 年后本息合计，保留两位小数。

**提示**：每年更新一次 `principal = principal + principal * rate`，即 `principal *= (1 + rate)`；格式化用 `printf("%.2f")`。

<details>
<summary>参考实现</summary>

```java
// 步骤 1：本金与利率
double principal = 10000;
double rate = 0.003;                    // 千分之三写成小数

// 步骤 2：逐年滚存，5 年就是循环 5 次
for (int year = 1; year <= 5; year++) {
    principal = principal + principal * rate;   // 利息计入本金
    // 等价简写：principal *= (1 + rate);
    System.out.printf("第 %d 年末：%,.2f 元%n", year, principal);
}
```

逐段讲解：循环变量 year 在这里只为计数，不参与金额计算——复利是「每年对上一年结果再乘 (1+rate)」，写成一次性公式 `10000 * Math.pow(1.003, 5)` 结果相同，循环版的价值是每年都能打印中间值，便于对账。`%,.2f` 的逗号表示千位分隔，验证：第 5 年末应为 10150.90 元（10000 × 1.003^5 ≈ 10150.90）。

</details>

### 题 7 1000 以内不能被 7 整除的数之和

**任务**：求 1 到 1000 中所有不能被 7 整除的数之和。

**提示**：条件累加 = 普通累加 + if 过滤；`i % 7 != 0` 是「不被 7 整除」。

<details>
<summary>参考实现</summary>

```java
int sum = 0;
for (int i = 1; i <= 1000; i++) {
    if (i % 7 != 0) {          // 先过滤再累加
        sum += i;
    }
}
System.out.println(sum);       // 验证见下方自检，应为 429429
```

自检：1~1000 总和 500500；7 的倍数共 142 个，其和 7×(1+2+...+142)=7×10153=71071；500500-71071=429429。如果你的程序输出别的数，先检查循环边界是不是写成了 `< 1000`。

</details>

### 题 8 累加和首次达到 2000 就停

**任务**：从 1 开始累加 1~100 内不能被 3 整除的数，和首次大于等于 2000 时停，输出当时的加数。

**提示**：达标即退出用 break；三步逻辑——判断、累加、再判断退出。

<details>
<summary>参考实现</summary>

```java
int sum = 0;
int num = 0;

for (num = 1; num <= 100; num++) {
    if (num % 3 == 0) {
        continue;                 // 被 3 整除的数跳过
    }
    sum += num;
    if (sum >= 2000) {
        break;                    // 达标立即退出，num 停在本次加数上
    }
}
System.out.println("加到 " + num + " 时和为 " + sum);
```

逐段讲解：break 后 num 保持当前值，所以「输出当时的加数」不用额外变量。若把判断放在累加之前，输出会差一个加数——先累加再判断才能让 num 与 sum 保持「本次加数与当前和」的对应关系。这题的三步逻辑（过滤、累加、判退）是从题 7 到题 12 的通用骨架。

</details>

## 3. 图形与综合题

### 题 9 九九乘法表

**任务**：打印九九乘法表，每行到自身列数为止。

**提示**：外层控行数 i（1~9），内层控列数 j（1~i）；用 `\t` 对齐。

<details>
<summary>参考实现</summary>

```java
// 外层循环：控制第几行
for (int i = 1; i <= 9; i++) {
    // 内层循环：第 i 行打印 i 个算式，j 永远不超过 i
    for (int j = 1; j <= i; j++) {
        System.out.print(j + "*" + i + "=" + (j * i) + "\t");
    }
    System.out.println();         // 每行结束换行
}
```

逐段讲解：内层条件 `j <= i` 是「三角形」的来源——第 1 行 1 个、第 9 行 9 个。两个易错点：一是 `System.out.print` 与 `println` 混用位置（算式用 print 不换行，行尾才换行）；二是算式必须给 `(j * i)` 加括号，否则 `+` 从左到右结合，字符串拼接会把 j 与 i 先拼进字符串再做乘法计算（实际是编译不过或语义错乱，取决于写法，总之不是算式）。打印方向倒过来（i 从 9 到 1）就是倒三角乘法表，试一试。

</details>

### 题 10 正三角与倒三角

**任务**：输入行数 n，打印 n 行星号正三角，再打印倒三角。

**提示**：正三角每行 = 左空格(n-i 个) + 星号(2i-1 个)；倒三角把空格方向反过来。

<details>
<summary>参考实现</summary>

```java
int n = sc.nextInt();

// 正三角：第 i 行打印 n-i 个空格、2i-1 个星号
for (int i = 1; i <= n; i++) {
    for (int s = 1; s <= n - i; s++) {
        System.out.print(" ");
    }
    for (int a = 1; a <= 2 * i - 1; a++) {
        System.out.print("*");
    }
    System.out.println();
}

// 倒三角：i 从 n 倒数到 1，行内逻辑不变
for (int i = n; i >= 1; i--) {
    for (int s = 1; s <= n - i; s++) {
        System.out.print(" ");
    }
    for (int a = 1; a <= 2 * i - 1; a++) {
        System.out.print("*");
    }
    System.out.println();
}
```

自检：n=3 时正三角首行应为「  *」（2 空格 + 1 星）。倒三角只是把外层循环改为倒计数，行内公式复用——「同构代码只改循环方向」是图形打印的通用技巧。

</details>

### 题 11 输入校验：while(true) 加 break

**任务**：反复要求输入 1 到 5 的菜单编号，直到合法为止。

**提示**：不知道要循环几次时用 `while (true)` 无限循环，合法分支里 break 出口。

<details>
<summary>参考实现</summary>

```java
int choice;

while (true) {
    System.out.println("请输入菜单编号 1~5：");
    choice = sc.nextInt();
    if (choice >= 1 && choice <= 5) {
        break;                    // 唯一出口：合法才走
    }
    System.out.println("编号非法，请重输");
}
System.out.println("你选择了 " + choice);
```

换别的写法会发生什么：改成 `while (choice < 1 || choice > 5)` 也行，但 choice 必须在循环前初始化出一个合法区间外的占位值（如 0），初始化值与条件的耦合容易埋雷；while(true)+break 把「循环到合法为止」的意图表达得更直接。注意若输入不是数字，nextInt 会抛异常——严格版要套 095 篇第 4 节的 hasNextInt 探测。

</details>

### 题 12 猜数字游戏（综合）

**任务**：程序随机生成 1~100 的数，用户反复猜，提示大了/小了；猜中后按次数给评语——1 次「天才」、2~6 次「不错」、6 次以上「再接再厉」。

**提示**：`new Random().nextInt(100) + 1` 生成 1~100；主循环 while(true) + 猜中 break；评语是 if-else if 分档。

<details>
<summary>参考实现</summary>

```java
import java.util.Random;
import java.util.Scanner;

// 步骤 1：生成目标数——nextInt(100) 产生 0~99，加 1 变 1~100
int secret = new Random().nextInt(100) + 1;
int times = 0;

// 步骤 2：主循环——无限循环，猜中即 break
while (true) {
    System.out.println("请猜一个 1~100 的数：");
    int guess = sc.nextInt();
    times++;                          // 每猜一次计一次

    if (guess > secret) {
        System.out.println("大了");
    } else if (guess < secret) {
        System.out.println("小了");
    } else {
        break;                        // 猜中，跳出循环
    }
}

// 步骤 3：按次数分档评语
if (times == 1) {
    System.out.println("一次猜中，天才！");
} else if (times <= 6) {
    System.out.println("用了 " + times + " 次，不错");
} else {
    System.out.println("用了 " + times + " 次，再接再厉");
}
```

逐段讲解：`nextInt(100) + 1` 的加 1 是边界偏移的经典操作，漏掉会永远猜不到 100。times 在判断前自增，保证「猜中那一次」也被计入。评语分档用 `times == 1` 与 `times <= 6` 而非 `times >= 2 && times <= 6`——前面分支已经排除了 1 次，后面的条件不必重复写左边界，但写全也无错，团队代码风格统一即可。

</details>

## 4. 找错题：来自真实学生作业的两处 bug

下面两段改编自同一份真实学生源码（原文件 Test1.java 的第 11 行与第 13 行）。代码意图：判断某月份是不是大月（31 天），再判断年份是否闰年。

```java
// 片段一（原第 11 行）
int month = sc.nextInt();
int big = 1 | 3 | 5 | 7 | 8 | 10 | 12;          // 想表达"是大月的集合"
if (month == big) {
    System.out.println("大月");
}

// 片段二（原第 13 行）
int year = sc.nextInt();
if (month < 12 && month > 1) {                   // 想判断"是有效月份"
    System.out.println("月份有效");
}
```

**错误一：`|` 是位或不是逻辑或**。`1 | 3 | 5 | ...` 是按位或运算，1|3|5|7|8|10|12 的结果是一个整数 15，不是「集合」。变量 big 的值恒为 15，`month == big` 只有输入 15 才成立。学生把「或」的数学直觉直接翻译成了 `|` 运算符——逻辑或应写成 `month == 1 || month == 3 || ...`，或者用 switch 的 case 穿透列举。`|` 与 `||` 编译都能通过，这是位运算误用最危险的地方：不报错，只在运行时给出错误结果。另外原代码第 15 行还混用了 `&&` 与 `&`，同样的语义错位——单个 `&` 是位与/非短路逻辑与，会让右操作数即使没必要也被求值。

**错误二：边界条件漏了 12 月**。`month < 12 && month > 1` 排除了 12 月（应允许）与 1 月之外没多排除 1 月？逐个代入：1 月 → `month > 1` 为 false，1 月被误判无效——实际排除了 1 月和 12 月。正确写法 `month >= 1 && month <= 12`。教训：写边界条件后必须把最小值、最大值、紧邻边界的值各代入一遍，「< 12」写成了「排除 12」正是边界思维最常翻车的形态。

## 5. 动手实践

**任务：把题 5 与题 6 方法化**。将「统计位数」与「复利计算」分别改写成方法（参考 100 篇），签名建议 `static int digits(long num)` 与 `static double compound(double principal, double rate, int years)`，在 main 里各调用两次验证。

提示：方法版要把 Scanner 留在 main 里（输入职责不进计算方法）；compound 内部用循环并返回最终金额。

<details>
<summary>参考实现</summary>

```java
// 位数统计：输入不改动，返回计算结果——参数传值，无副作用
static int digits(long num) {
    if (num == 0) {
        return 1;
    }
    int count = 0;
    while (num != 0) {
        num = num / 10;          // 改的是形参副本，调用方的实参不受影响
        count++;
    }
    return count;
}

// 复利：纯计算方法，年数循环可换成 Math.pow
static double compound(double principal, double rate, int years) {
    for (int y = 1; y <= years; y++) {
        principal *= (1 + rate);
    }
    return principal;
}

public static void main(String[] args) {
    System.out.println(digits(0) + "、" + digits(1234567));   // 1、7
    System.out.printf("%.2f%n", compound(10000, 0.003, 5));   // 10150.90
}
```

自检标准：两个方法都有 return 且分支完备；digits 形参改动不影响实参（值传递语义，100 篇重点）；printf 保留两位小数。

</details>

## 6. 一句话记住

> 循环四套路：计数（for）、至少一次（do-while）、无限循环找出口（while(true)+break）、逐位削（/10）；写完边界必代入端点值验证；`|` 是位运算，别拿它当逻辑或。

## 7. 下一步

- [Scanner 控制台输入](/java/095-ScannerConsoleInput)：题集输入的陷阱手册；
- [控制台综合项目：ATM](/java/145-AtmConsoleProject)：把题 1、11、12 的零件组装成完整项目；
- [方法详解](/java/100-MethodDetailed)：本篇第 5 节方法化练习的理论基础；
- [数组详解](/java/110-ArrayDetailed)：题 9、10 的图形与矩阵进阶版。

## 8. 参考与致谢

- Oracle Java Tutorials, Control Flow Statements（语法类别的官方目录对照）：https://docs.oracle.com/javase/tutorial/java/nutsandbolts/flow.html ；
- 题目与参考代码取材于仓库扫描材料中的课堂题库、带步骤注释的测试题答案与真实学生作业错误（位或误用、月份边界遗漏），均已按教学目的改写；JLS §15.22（位运算符）与 §15.23-24（条件运算符）为运算符语义依据：https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html 。
