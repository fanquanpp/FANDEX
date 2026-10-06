---
order: 150
title: 方法与数组综合项目：控制台系统的同框架迁移实训
module: 'java'
category: 后端技术
difficulty: beginner
description: 用银行 ATM、超市管理、奶茶店结算、玩具店四个任务共用的一套方法签名框架做迁移训练：Login/Menu/AddGoods/FindMaxAndMin/Settle 的方法拆分、数组作参、while(true)+switch 菜单循环；对比「返回值回传余额」与「void 加全局变量」两种参数传递设计，并用一个真实的死循环 bug 练找错。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'java/100-MethodDetailed'
  - 'java/110-ArrayDetailed'
  - 'java/090-ControlFlow'
  - 'java/095-ScannerConsoleInput'
prerequisites:
  - 'java/100-MethodDetailed'
  - 'java/110-ArrayDetailed'
---

## 知识点地图

- **知识类别**：阶段综合实训——「方法 + 数组 + 循环分支」三者的工程化组织，对应官方教程 *Classes and Objects / Control Flow Statements* 学完后的首个项目环节。
- **解决什么问题**：单章习题（求最值、打印三角形）学完仍写不出一个「能跑起来的小系统」；缺的不是语法，而是**拆分方法、组织数据流**的设计能力。
- **什么时候用到**：学完方法与数组之后的第一个里程碑；也是后续面向对象章节（把方法与数组升级为类与字段）之前必须打的地基——本文的四个业务，将来都会在 OOP 章节用类重写一遍。

## 前置知识

- [方法详解](/java/100-MethodDetailed)：定义、参数、返回值、重载；
- [数组详解](/java/110-ArrayDetailed)：声明、遍历、数组作方法参数；
- [控制流程](/java/090-ControlFlow) 与 [Scanner 控制台输入](/java/095-ScannerConsoleInput)：switch、while(true) 与键盘录入。

## 学习目标

读完本文你将能够：

1. 把一个「几百行 main」的烂摊子拆成职责单一的方法，并说清每个方法「吃什么、吐什么」；
2. 用同一套方法签名框架，把超市管理系统迁移成奶茶店、玩具店系统（换业务不换骨架）；
3. 对比「方法返回余额」与「void 方法改全局变量」两种设计，说清各自的数据流与风险；
4. 在一个真实笔记里的登录死循环 bug 中定位缺失的 `i++`。

预计 90 分钟，含 1 个找错环节与 3 道动手任务。本文配套源码框架来自真实实训指导书的四大任务，方法签名即当年验收标准。

## 1. 为什么先学「同框架迁移」

初学者面对「写一个超市管理系统」常犯的错，是把所有逻辑塞进 main 方法：菜单是 main、添加是 main、结算还是 main，300 行 if 嵌套一错全错。

实训指导书给出的训练法是：**先给一套方法签名框架，四个业务（银行 ATM、超市管理、奶茶店、玩具店）共用同一框架**。你写的不是四个程序，而是「一个骨架 + 四次换皮」。这模仿了真实工程里的模式复用：电商的下单、外卖的下单、堂食的下单，骨架（校验、扣减、落库、通知）相同，只有业务名词不同。

四大任务的原版方法签名（验收即按此检查）：

| 任务 | 必须实现的方法 |
| --- | --- |
| 任务一 银行 ATM | `Login()`、`Menu(int accountAmount)`、`SelectAmount(double)`、`BankDraw(int)`、`BankTransfer()`、`BankQuit()` |
| 任务二 超市管理 | `Menu(String[] names, float[] prices)`、`AddGoods`、`ShowGoods`、`FindMaxAndMinGoods`、`Back()` |
| 任务三 奶茶店 | 同任务二 + `SettleTeas(String[] names, float[] prices)` |
| 任务四 玩具店 | 同构：`AddToys`、`ShowToys`、`SettleToys` |

规则：数组在 main 里定义、作为参数传进方法（而不是写在方法里当全局量），余额变动通过返回值回传。

## 2. 骨架一：while(true) + switch 菜单循环

所有控制台系统的「心脏」是同一段代码：

```java
import java.util.Scanner;

public class SupermarketSystem {
    static Scanner sc = new Scanner(System.in);

    public static void main(String[] args) {
        String[] names = new String[100];   // 商品名池
        float[] prices = new float[100];    // 价格池，与 names 下标一一对应
        int count = 0;                      // 当前商品数

        while (true) {                      // 死循环 = 常驻服务
            int choice = Menu(names, prices, count);
            if (choice == 4) {              // 退出选项
                Back();
                break;                      // 唯一的出口
            }
            count = dispatch(choice, names, prices, count);
        }
    }

    static int Menu(String[] names, float[] prices, int count) {
        System.out.println("==== 超市管理系统 ====");
        System.out.println("1. 添加商品");
        System.out.println("2. 显示全部商品");
        System.out.println("3. 查询最贵与最便宜");
        System.out.println("4. 退出");
        System.out.print("请选择：");
        int choice = sc.nextInt();
        return choice;
    }

    static int dispatch(int choice, String[] names, float[] prices, int count) {
        switch (choice) {
            case 1:  return AddGoods(names, prices, count);
            case 2:  ShowGoods(names, prices, count);  return count;
            case 3:  FindMaxAndMinGoods(names, prices, count); return count;
            default:
                System.out.println("无此选项，请重新输入");
                return count;
        }
    }
}
```

**逐段讲解**：

1. `while (true)` 不是「写错了的死循环」，而是**服务循环**的心智模型：程序活着就一直转，唯一的出口是用户选退出时的 `break`。换成 `while (choice != 4)` 也能跑，但需要在循环前先读一次输入，结构反而绕。
2. `Menu` 只负责「打印菜单 + 收一个数字」——它**不做任何业务**，职责单一才好测。若在 Menu 里直接 switch 业务，菜单展示改动会牵连业务代码。
3. `count` 必须由业务方法**返回**、在 main 里接住再传给下一个方法：添加商品后商品数变了，若不回传，下个方法看到的还是旧数量。这是「数组内容可变、但 int 是值拷贝」的直接后果——数组传引用，改元素对调用方可见；`count++` 只改方法内的拷贝，必须用返回值带出来。**这是本篇最重要的参数传递心智模型。**
4. `dispatch` 把「数字 → 业务方法」的映射集中到一处；default 兜住非法输入。换别的写法（在 Menu 里直接 switch）也能跑，但菜单层和分发层耦合，奶茶店迁移时要改两处。

**易错点**：`sc.nextInt()` 后如果还用 `sc.nextLine()` 读字符串，会读到残留的换行符——这是 Scanner 的经典坑（详见 095 篇），本框架刻意统一只用 `nextInt`/`next` 规避。

## 3. 任务二落地：超市管理的四个业务方法

```java
static int AddGoods(String[] names, float[] prices, int count) {
    if (count >= names.length) {            // 先判满，再存
        System.out.println("仓库已满");
        return count;
    }
    System.out.print("商品名：");
    names[count] = sc.next();
    System.out.print("价格：");
    prices[count] = sc.nextFloat();
    System.out.println("已添加：" + names[count]);
    return count + 1;                        // 数量 +1 由返回值带出
}

static void ShowGoods(String[] names, float[] prices, int count) {
    if (count == 0) {
        System.out.println("暂无商品");
        return;                              // 空数据提前返回，防for白跑
    }
    for (int i = 0; i < count; i++) {        // 只遍历到 count，不遍历整个数组
        System.out.printf("%d. %s  %.2f 元%n", i + 1, names[i], prices[i]);
    }
}

static void FindMaxAndMinGoods(String[] names, float[] prices, int count) {
    if (count == 0) { System.out.println("暂无商品"); return; }

    int maxIdx = 0, minIdx = 0;              // 记下标而不是记价格值
    for (int i = 1; i < count; i++) {
        if (prices[i] > prices[maxIdx]) maxIdx = i;
        if (prices[i] < prices[minIdx]) minIdx = i;
    }
    System.out.printf("最贵：%s %.2f 元%n", names[maxIdx], prices[maxIdx]);
    System.out.printf("最便宜：%s %.2f 元%n", names[minIdx], prices[minIdx]);
}

static void Back() {
    System.out.println("感谢使用，再见");
}
```

**逐段讲解**：

1. `AddGoods` 先判容量再写入——数组是定长的，写之前必须问「还有空位吗」，越界直接抛 `ArrayIndexOutOfBoundsException`（可在 110 篇复习这个异常现场）。
2. `ShowGoods` 与 `FindMaxAndMinGoods` 都只遍历 `[0, count)`：数组长 100，但有效数据只有 count 个，遍历到 100 会打印一堆 null/0.0。**「数组容量」与「有效长度」是两个变量**——这个区分在学到集合（ArrayList）时会再次出现。
3. 求最值时**记下标而非记值**：因为名字与价格在两个平行数组里，只记价格就拿不到名字。若把两个数组合成一个结构体/类（OOP 篇的内容），这个别扭自然消失——这正是「面向对象为什么出现」的活例子。
4. 空集合提前 `return`，属于防御式写法；不写的话 `maxIdx=0` 配 count=0 会打出 `names[0] = null`，输出难看且误导。

## 4. 任务三/四迁移：加一个结算 Settle

奶茶店比超市多一步「连续购买、按编号累计、结束汇总」：

```java
static void SettleTeas(String[] names, float[] prices, int count) {
    float total = 0;                          // 本单合计
    while (true) {
        ShowGoods(names, prices, count);      // 每轮重显菜单，让顾客看着选
        System.out.print("请输入饮品编号（0 结束购买）：");
        int no = sc.nextInt();
        if (no == 0) break;                   // 0 号 = 结账离场
        if (no < 1 || no > count) {           // 编号合法性先校验
            System.out.println("编号错误，请重新输入");
            continue;                          // 跳回循环开头，不累计
        }
        float price = prices[no - 1];         // 编号转下标：差 1
        total += price;
        System.out.printf("已选 %s，当前合计 %.2f 元%n", names[no - 1], total);
    }
    System.out.printf("本单合计：%.2f 元%n", total);
}
```

**逐段讲解**：

1. 「输入 0 结束」是**哨兵值**循环模式：事先不知道顾客买几样，循环条件由每次输入决定。`continue` 用在「编号输错」上——错输入不能累计金额，但也不能让顾客重新排队（重新进主菜单），回到本轮开头重输即可。
2. `no - 1` 的编号转下标是最易错点：展示给顾客的是 1 号到 count 号，数组下标是 0 到 count-1。写错成 `prices[no]` 不会编译报错，但顾客买 3 号会扣 2 号的钱——结算类系统里这种「差一错误」是真实资损来源，靠测试用例（买第一个、买最后一个、买不存在的 0 号和 count+1 号）兜住。
3. 玩具店迁移只需要：把 `SettleTeas` 改名 `SettleToys`、菜单文案换掉、数组初值换玩具名——**方法签名一个字不变**。做这一步迁移时你会体会到：框架（循环、校验、下标转换）与业务（奶茶还是玩具）是两层皮，能分开就能复用。

## 5. 任务一对比：余额怎么传——返回值 vs 全局变量

ATM 任务的取款逻辑有两个真实版本（同一份实训源码的两个迭代），数据流设计完全不同：

**版本 A：返回值回传余额（推荐）**

```java
public class BankMange1 {
    static double balance = 5000;   // 初始余额随机产生亦可：(int)(Math.random()*10000)

    public static void main(String[] args) {
        if (Login()) {
            Menu();
        }
    }

    static boolean Login() { /* 三次机会，成功 true */ ... }

    static void Menu() {
        while (true) {
            System.out.println("1.查询 2.取款 3.转账 4.退卡");
            int choice = new Scanner(System.in).nextInt();
            switch (choice) {
                case 2:
                    balance = BankDraw(balance);   // 余额经返回值回传
                    break;
                case 4: return;                     // 退卡即结束
                default: System.out.println("无此功能");
            }
        }
    }

    static double BankDraw(double current) {
        System.out.print("取款金额：");
        double amount = new Scanner(System.in).nextDouble();
        if (amount > current) {
            System.out.println("余额不足");
            return current;                          // 失败也返回原值
        }
        return current - amount;                     // 成功返回新值
    }
}
```

**版本 B：void 方法直接改全局变量（不推荐，但真实存在）**

```java
static double balance;   // 全局变量

static void BankDraw() {
    balance = balance - amount;   // 方法内部直接改，无参数无返回值
}
```

**对比讲解**：

| 维度 | 版本 A：参数进、返回值出 | 版本 B：void 改全局 |
| --- | --- | --- |
| 数据流 | 显式：谁改了余额、从哪进从哪出，一眼看清 | 隐式：任何方法都能悄悄改 balance |
| 可测试性 | `BankDraw(100)` 可脱离界面单测 | 必须先设置全局态才能测 |
| 并发/复用 | 天然安全 | 多账户场景会互相覆盖 |
| 迁移成本 | 换业务时签名不变 | 全局变量名散落各处，改名要全文件搜 |

版本 B 能跑、也确实是很多学生笔记里的原版写法，但它把「余额属于账户」这个事实藏在了全局命名里。学到 OOP 时，`balance` 会成为 `Account` 类的私有字段、`BankDraw` 会成为它的实例方法——版本 A 的数据流正是那一步的雏形。

**判据**：方法需要的数来自参数、产生的数走返回值；只有「确实属于整个程序的状态」才配做全局（static）变量，且越少越好。

## 6. 登录三次机会与真实的死循环 bug

ATM 登录要求：账号 1234、密码 5678，最多错三次，第三次错提示冻结。标准实现：

```java
static boolean Login() {
    Scanner sc = new Scanner(System.in);
    int i = 1;                                  // 已尝试次数
    while (i <= 3) {
        System.out.print("账号：");
        String id = sc.next();
        System.out.print("密码：");
        String pwd = sc.next();
        if (id.equals("1234") && pwd.equals("5678")) {
            System.out.println("登录成功");
            return true;
        } else {
            System.out.println("账号或密码错误，剩余 " + (3 - i) + " 次机会");
            i++;                                 // 关键：失败也要计数
        }
    }
    System.out.println("三次错误，账号已冻结");
    return false;
}
```

**逐段讲解**：

1. `i` 从 1 开始、条件 `i <= 3`：循环体最多执行 3 次。剩余机会的提示 `(3 - i)` 在第一次输错时显示「剩余 2 次」，与直觉一致。
2. 密码比较用 `equals` 而不是 `==`：`==` 比的是引用，Scanner 读出的字符串与字面量不是同一个对象（详见 130 篇）——用 `==` 在某些 JVM 版本上「碰巧能过」，是经典假阳性。
3. **真实事故（找错环节）**：仓库扫描的一份学习笔记（BATM_笔记）里，这个 else 分支**漏写了 `i++`**。后果：输错密码后 `i` 永远是 1，`while (i <= 3)` 永远成立，程序无限要求重输——「三次冻结」名存实亡。这种 bug 不报错、不崩溃，只在功能测试（连输三次错密码）时暴露。检查一切「限次循环」时，先问：**让循环走向结束的那个变量，在每条分支里都被推动了吗？**

## 7. 动手实践

### 任务一：跑通超市框架（30 分钟）

把第 2、3 节代码拼成完整可运行程序，依次测试：空仓库查询、添加 3 件商品、查最值、输错菜单选项、正常退出。

提示：重点观察 `count` 在「添加后」与「重启查询后」是否一致；不一致说明返回值没接住。

### 任务二：迁移成奶茶店（30 分钟）

把框架迁移为奶茶店：改名系统类、预置 5 种饮品初值（数组初始化器一行写完）、实现 `SettleTeas`。迁移完对照检查：方法签名是否与超市版完全相同？

提示：预置初值用 `{"珍珠奶茶", "柠檬绿茶", ...}` 与 `{8.0f, 6.5f, ...}`，别用循环逐个赋值。

### 任务三：修复死循环并加码（30 分钟）

先只看现象：把第 6 节 `Login()` 的 `i++` 注释掉运行，连输三次错密码，记录现象。然后修复它，并加两条真实系统的规则：连续输错间隔提示（第 2 次失败后额外打印「请检查大小写锁定」）；第 3 次失败前打印「最后一次机会」。

提示：判断「第几次失败」用进入 else 时 `i` 的当前值，别用自增后的值。

**参考实现要点（遮住先想）**：

```java
} else {
    if (i == 2) {
        System.out.println("请检查大小写锁定");
    } else if (i == 3 - 1 + 1) {   // 即 i == 3：最后一次机会前
        System.out.println("这是最后一次机会");
    }
    System.out.println("账号或密码错误，剩余 " + (3 - i) + " 次机会");
    i++;
}
```

`i == 2` 时本次是第 2 次失败，下一轮就是最后一次，两个提示都在这里触发；把「最后一次机会」写在 `i++` 之前，用的是失败计数本身，语义直白。更好的重构是把魔法数字 3 提为常量 `MAX_TRY`，规则变更只改一处。

## 参考与致谢

- Oracle, *The Java Tutorials*：Control Flow Statements（while/switch/break/continue 语义）与 Classes and Objects（方法签名设计）章节（https://docs.oracle.com/javase/tutorial/java/ ），本文框架的方法组织原则与之对照；
- 四大任务的方法签名、ATM 双版本对比与登录死循环 bug 均取自仓库扫描素材（实训指导书与 ATM 笔记，见 `.workflow-tmp/scan/e-core-java-mysql-web.md` 1.4/1.5 节），正文代码为本文按教学需要重写与扩展。
