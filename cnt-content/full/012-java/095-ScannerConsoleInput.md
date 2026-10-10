---
order: 110
title: Scanner 控制台输入：让程序第一次听到用户说话
module: 'java'
category: 后端技术
difficulty: beginner
description: java.util.Scanner 三步法与五种取值方式对照，重点剖析 next 与 nextLine 的换行符残留陷阱、InputMismatchException 类型不匹配异常，用超市优惠卡、登录重试、ATM 密码三个真实场景落地。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'java/090-ControlFlow'
  - 'java/050-DataTypeConversion'
  - 'java/115-LoopsAndBranchingDrills'
  - 'java/180-ExceptionHandlingMechanism'
prerequisites:
  - 'java/080-OperatorExpression'
---

## 知识点地图

- **知识类别**：控制台输入（console I/O）——`java.util.Scanner` 读取标准输入流 `System.in`，属于 Oracle 官方教程 Essential Java Classes 中的独立主题。
- **解决什么问题**：前几篇的程序数据都是写死在代码里的（`int secret = 42`）。要让同一个程序对不同的用户产生不同的结果，就得在运行时从键盘读取数据。
- **什么时候用到**：一切命令行交互程序——登录验证、菜单分发、录入表单、猜数字游戏、ATM 取款机模拟。进入图形界面与 Web 之后它退居教学与调试场景，但「按什么类型读、读到哪为止、读坏了怎么办」这三个问题在所有输入场景（文件、网络、表单）中同构。

本篇是 012-java 模块控制台输入的独立主题篇。在它出现之前，模块内只有 [控制流](/java/090-ControlFlow) 与 [图书馆项目](/java/1040-JavaProjectExampleLibrarySystem) 顺带用过 `Scanner`，从未系统讲过它的陷阱——`next` 与 `nextLine` 的换行符残留是初学者第一大坑，值得单独一篇。

## 前置知识

- [运算符与表达式](/java/080-OperatorExpression)：能写出比较条件；
- [控制流](/java/090-ControlFlow)：会用 if 与 while——本篇场景全是「输入 + 判断」的组合；
- [类型转换](/java/050-DataTypeConversion)：理解 `int` 与 `double` 的边界。

## 学习目标

读完本文你将能够：

1. 默写 Scanner 三步法（导包、创建、取值），并说出导包语句的位置约束；
2. 对照五种取值方式（`nextInt` / `nextDouble` / `next` / `next().charAt(0)` / `nextBoolean`）为场景选对方法；
3. 解释并修复 next 与 nextLine 混用时的换行符残留问题；
4. 用 `hasNextInt` 或 try-catch 防御类型不匹配导致的 `InputMismatchException`；
5. 从三处拼写错误中定位 Scanner 相关代码的编译问题。

预计 45 分钟，含 1 个找错练习与 2 道动手任务。

## 1. 问题引入：超市优惠卡要录入顾客信息

超市办优惠卡，柜员要在程序里录入顾客的姓名、年龄、会员等级。数据来源不是程序员写死的常量，而是柜员敲进键盘的每一次按键。先看完整程序，后面逐段拆：

```java
import java.util.Scanner;                       // 步骤 1：导包，必须在 class 上面

public class MemberRegister {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);    // 步骤 2：创建扫描器，绑定标准输入

        System.out.println("请输入姓名：");
        String name = sc.next();                // 步骤 3：按类型取值

        System.out.println("请输入年龄：");
        int age = sc.nextInt();

        System.out.println("是否开通积分（true/false）：");
        boolean withPoints = sc.nextBoolean();

        System.out.println("录入成功：" + name + "，" + age + " 岁，积分 "
                + (withPoints ? "已开通" : "暂不开通"));
        sc.close();                             // 用完关闭，释放输入流资源
    }
}
```

**逐段讲解**：

1. `import java.util.Scanner;` 的位置有硬性约束：必须写在 `package` 声明之后、`class` 声明之前。写在类里面是语法错误。不导包直接写 `Scanner sc = ...` 会得到 `cannot find symbol`——编译器不知道 Scanner 在哪个包里。换成全限定名 `java.util.Scanner sc = new java.util.Scanner(System.in);` 也能编译，但每个使用点都要写全，没人这么做。
2. `System.in` 是字节输入流（用户键盘），`Scanner` 把它包装成「能按类型解析」的扫描器。不包 Scanner 而用裸 `System.in.read()` 读到的是字节的 ASCII 码值——输入 `5` 得到 `53`，这是 C 语言式 IO 的坑，Scanner 的价值就在帮你跨过它。
3. `sc.close()` 关闭的是 `System.in` 整条输入流。在只读控制台的单次程序里放心关；但在 main 方法里关过一次后，同进程后续任何代码再读 `System.in` 都会抛异常——教学程序里建议在程序末尾关闭或干脆不关，不要在循环里反复 new/关闭。

## 2. 五种取值方式对照

Scanner 按「下一次输入的数据是什么类型」提供对应方法，这是它的核心设计：

| 方法 | 读什么 | 输入 `25` 与 `张三` 时各得到什么 |
| --- | --- | --- |
| `nextInt()` | 一个整数 | `25`（int）；`张三` 抛 InputMismatchException |
| `nextDouble()` | 一个小数 | `25.0`（自动升 double）；`张三` 抛异常 |
| `next()` | 一个词（空白符分隔） | `"25"`（字符串）；`"张三"` |
| `next().charAt(0)` | 一个词的第一个字符 | `'2'`；`'张'` |
| `nextBoolean()` | true/false 字面量 | 异常；异常（只认这两个词） |
| `nextLine()` | 整行文本（含空格） | `"25"`；`"张三"` |

**拆解讲解**：

1. `nextInt` 遇到 `张三` 这类无法解析成整数的输入会抛 `InputMismatchException`（第 5 节专门处理）。
2. `next()` 与 `nextLine()` 是两套停止规则：`next()` 以**空白符**（空格、Tab、回车）为界，只取一个词；`nextLine()` 以**回车**为界，取走整行并消费回车本身。这个差别就是第 4 节陷阱的根源。
3. `charAt(0)` 是链式用法：先用 `next()` 取一个词，再取这个词的第一个字符。典型场景是「请输入 y/n 确认」，只需要判一个字母。
4. 没有 `nextChar()` 方法——初学者常凭直觉写它，编译器报 `cannot find symbol`。记住组合写法 `sc.next().charAt(0)`。

### 什么时候用哪种：三个真实场景

**场景 A：只按回车确认的大段文本（用 nextLine）**。日志排查工具让运维粘贴一行备注：

```java
System.out.println("请输入故障备注（一行）：");
String note = sc.nextLine();     // "磁盘阵列 3 号柜报警" 含空格也能整行拿到
```

**场景 B：菜单数字选择（用 nextInt）**。ATM 主界面让用户按编号选功能：

```java
System.out.println("1 查询  2 取款  3 转账  4 退卡");
int choice = sc.nextInt();       // 菜单场景输入永远是单个数字，nextInt 最直接
```

**场景 C：确认单个字母（用 next().charAt(0)）**。安装器问「是否继续」：

```java
System.out.println("是否继续安装（y/n）：");
char answer = sc.next().charAt(0);   // 输入 "y" 只需要第一个字符
```

## 3. next 与 nextLine 的换行符残留陷阱

这是 Scanner 第一大坑。看一段会出 bug 的登录程序：

```java
Scanner sc = new Scanner(System.in);

System.out.println("请输入账号 ID：");
int id = sc.nextInt();            // 输入 1001 后按回车

System.out.println("请输入账户备注：");
String note = sc.nextLine();      // 程序根本不等你输入，note 是空串！

System.out.println("备注为：" + note + "，长度 " + note.length());  // 长度 0
```

**为什么会这样**：`nextInt` 只取走数字 `1001`，你按下的**回车符还留在输入缓冲区里**。紧接着的 `nextLine` 一看缓冲区里已经有一个「到行尾」的信号，直接把回车前的空内容取走——返回空串，程序看起来「跳过了输入」。

图解缓冲区流转：

```text
键盘输入: 1001\n  备注是测试\n
nextInt  取走: 1001        缓冲区剩余: \n  备注是测试\n
nextLine 取走: ""（\n 之前什么都没有）  缓冲区剩余: 备注是测试\n
```

**修复方式二选一**：

```java
// 方式一：nextInt 之后补一个 nextLine，专门吃掉残留的回车
int id = sc.nextInt();
sc.nextLine();                    // 只为消费换行符，返回值不接

String note = sc.nextLine();      // 现在能正常等到用户输入了

// 方式二：全部改用 nextLine 读，再用 Integer.parseInt 转数字
int id = Integer.parseInt(sc.nextLine());
String note = sc.nextLine();      // 全程只有整行读取，没有残留问题
```

**换别的写法会发生什么**：方式一保留了 `nextInt` 的简洁但每处混用点都要记得补行，漏补就是空串 bug；方式二统一了读取规则（永远整行读），代价是数字输入要先过 `Integer.parseInt`，格式不对会抛 `NumberFormatException`。真实工程里推荐方式二——规则统一比局部补丁可靠，这一点在文件与网络输入中同样成立。

易错点标注：`next()` 也会跳过前导空白包括回车，所以 `nextInt` 之后再调 `next()` **不会**触发本陷阱——陷阱只发生在「数字类方法/next 之后紧跟 nextLine」这一种组合上。

## 4. 类型不匹配异常与防御

```java
Scanner sc = new Scanner(System.in);
System.out.println("请输入年龄：");
int age = sc.nextInt();     // 用户输入 "十八"，程序当场崩溃
```

崩溃信息：`java.util.InputMismatchException`。Scanner 遇到无法解析成 int 的词直接抛异常，不会把输入留给你再处理。

**防御方式一：先探测再读取（推荐给初学者）**。

```java
System.out.println("请输入年龄：");
while (!sc.hasNextInt()) {          // 缓冲区里下一个词不是整数时为 true
    System.out.println("年龄必须是整数，请重输：");
    sc.next();                      // 把那个非法词取走丢掉，否则死循环
}
int age = sc.nextInt();             // 走到这里一定是合法整数
```

**逐行讲解**：`hasNextInt` 不移动读取位置，只「偷看」缓冲区下一个词能不能当整数；非法词必须用 `sc.next()` 主动取走丢弃，否则 while 每一轮看到的还是同一个词，程序卡死在循环里。这个「先偷看、不行就丢弃重试」的循环在 090 篇的输入校验中已经出现过雏形。

**防御方式二：catch 异常（适合已学异常处理之后）**。

```java
try {
    int age = sc.nextInt();
} catch (java.util.InputMismatchException e) {
    System.out.println("输入的不是整数");
    sc.nextLine();                  // 顺手清掉这行非法输入，防止二次读取踩坑
}
```

两种方式的取舍与第 3 节同理：探测式不会打断程序结构，异常式与 180 篇的异常体系衔接更自然，二选一并保持一致即可。

## 5. 三个完整场景：从录入到登录

**场景一（真实项目）：超市优惠卡顾客信息录入**。上面第 1 节的 MemberRegister 就是它的完整版：姓名用 `next`、年龄用 `nextInt`、开关项用 `nextBoolean`，三种方法在一个程序里各司其职。把它跑起来，注意录入姓名时不要带空格——`next` 只取一个词，「王小 明」会被截断成「王小」，剩余的「明」留在缓冲区污染下一次读取。

**场景二：登录三次重试**。账号密码判断与 while 循环的组合，也是 115 题集第 1 题的原型：

```java
Scanner sc = new Scanner(System.in);
int tryCount = 0;
boolean passed = false;

while (tryCount < 3 && !passed) {
    System.out.println("请输入账号：");
    String account = sc.next();          // 账号密码按词读，没有空格需求
    System.out.println("请输入密码：");
    String pwd = sc.next();

    if ("admin".equals(account) && "123".equals(pwd)) {
        passed = true;                   // 常量写前面，账号为 null 也不空指针
    } else {
        tryCount++;
        System.out.println("账号或密码错误，剩余机会 " + (3 - tryCount));
    }
}
System.out.println(passed ? "登录成功" : "已锁定");
```

**逐段讲解**：这里用 `next` 而不是 `nextLine`，因为账号密码约定不含空格，且两次 `next` 之间没有混用问题；字符串比较必须 `equals` 而非 `==`（130 篇的核心结论），常量写在 equals 前面防 null。若把 `while` 条件里的 `!passed` 删掉，密码对错只影响 `passed` 变量，循环还会继续问满三次——这是一个典型的「变量控制了状态但没控制住循环」的逻辑错。

**场景三：ATM 的账号密码输入**。145 篇的 ATM 项目用 Scanner 读虚拟账号 `1234` 与密码 `5678`，账号按整数读（`nextInt`）、密码也按整数读再转字符串比较，或统一按 `next` 读字符串——两种都可行，但全程序必须统一，混用就会踩第 3 节的残留陷阱。

## 6. 找错练习：三处编译期错误

下面这段「Scanner 用法小结」来自一份真实学生笔记，其中有**三处**与 Scanner 有关的错误。先自己找，再看解析。

```java
import java.util.*;

public class NoteCheck {
    public static void main(String[] args) {
        Scanner sc = new Scanner(String.in);      // 错误 1
        System.out.println("输入一个整数：");
        int n = sc.nextNit();                     // 错误 2
        System.out.println("输入一个小数：");
        double d = sc.nextDouble();
        System.out.println(n + d);
        sc.close();
    }
}                                                 // 错误 3：整个程序还差什么？
```

**答案与解析**：

1. `String.in` 不存在——Scanner 的构造参数是字节流 `System.in`，`System` 是 java.lang 的类，`String` 是字符串类，两者没有 `.in` 成员。报错 `cannot find symbol: variable in`。
2. `nextNit` 是 `nextInt` 的拼写错误（N 和 I 相邻，手滑很常见）。报错同样是 `cannot find symbol: method nextNit()`——Scanner 的方法名拼错与变量名拼错报错形态相同，靠 IDE 的方法补全可以预防。
3. 程序缺少 `import java.util.Scanner;`？不——`import java.util.*;` 通配导包已经覆盖了它。真正的错误 3 在笔记原版里是「导包语句写到了 class 下面」，Scanner 在类体内先使用后导入，同样编译失败。本篇第 1 节说过位置约束：import 必须在 class 声明之前。

## 7. 动手实践

**任务一（必做）：体温登记器**。写一个程序依次录入姓名（词）、体温（小数）、是否到过中高风险地区（true/false），全部合法时输出一句话摘要；体温超出 34.0 到 42.0 范围时提示重输。

提示：

- 三种取值方法各用一次，对照第 2 节表格检查选择；
- 体温重输用 `hasNextDouble` 加 while 的探测循环（第 4 节方式一）；
- 摘要拼接可以用 `String.format("%.1f", temp)` 保留一位小数。

<details>
<summary>参考实现（先自己写完再展开）</summary>

```java
import java.util.Scanner;

public class TempRegister {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.println("请输入姓名：");
        String name = sc.next();

        System.out.println("请输入体温：");
        while (!sc.hasNextDouble()) {
            System.out.println("体温必须是数字，请重输：");
            sc.next();
        }
        double temp = sc.nextDouble();
        while (temp < 34.0 || temp > 42.0) {
            System.out.println("体温超出合理范围，请重输：");
            temp = sc.nextDouble();
        }

        System.out.println("是否到过中高风险地区（true/false）：");
        boolean risky = sc.nextBoolean();

        System.out.printf("姓名 %s，体温 %.1f，中高风险地区接触：%s%n",
                name, temp, risky ? "有" : "无");
        sc.close();
    }
}
```

自检标准：范围重输的 while 条件是否用了 `||`（两个方向都算超范围）；`%.1f` 与 printf 的搭配是否正确；risky 的三元表达式是否给定了两个分支的文案。

</details>

**任务二（选做）：换行符陷阱复现器**。故意写出第 3 节的 bug 程序（nextInt 后紧跟 nextLine），运行并观察空串现象；然后用两种修复方式各改一版，确认两版都能等到第二行输入。目的不是记住修复代码，而是亲眼看到缓冲区残留的实际表现——以后遇到「输入被跳过」能第一时间想到这个方向。

## 8. 一句话记住

> Scanner 三步法：导包在 class 上、`new Scanner(System.in)`、按类型调 `nextInt` 等方法；数字或 next 之后紧跟 nextLine 要先补一行消化回车；读坏了先用 `hasNextXxx` 偷看再取。

## 9. 下一步

- [控制流](/java/090-ControlFlow)：本文所有「输入 + 判断」组合的语法来源；
- [分支与循环实战题集](/java/115-LoopsAndBranchingDrills)：15 道循环题全部以 Scanner 起手；
- [控制台综合项目：ATM](/java/117-MethodArrayConsoleProject)：把本文的输入方法用进完整的方法拆分项目；
- [异常处理机制](/java/180-ExceptionHandlingMechanism)：`InputMismatchException` 的体系位置与 try-catch 写法。

## 10. 参考与致谢

- Oracle Java Tutorials, Essential Java Classes — Scanning（本文主题划分与「扫描器按类型解析」的心智模型参照其目录）：https://docs.oracle.com/javase/tutorial/essential/scanner/ （Oracle 官方教程，仅作目录对照与链接引用，未复制其正文）；
- `java.util.Scanner` 官方 API 文档（方法行为、异常类型以此为准）：https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Scanner.html ；
- 仓库内学生笔记与课堂练习材料（场景题源：超市优惠卡、登录重试、ATM 录入；找错素材：笔记拼写错误）由本仓库扫描笔记提供，已按教学目的改写。
