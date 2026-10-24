---
order: 60
title: BigDecimal 与 BigInteger：数值精度与大数运算
module: 'java'
category: 后端技术
difficulty: beginner
description: double 为什么算不了钱、BigDecimal 三种构造方式的陷阱、scale 与 RoundingMode、compareTo 与 equals 的差异、BigInteger 的适用边界；用书价表总价、电商订单金额与 DECIMAL 映射、复利计算三个场景落地。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'java/050-DataTypeConversion'
  - 'java/060-WrapperCacheTrap'
  - 'java/110-ArrayDetailed'
prerequisites:
  - 'java/050-DataTypeConversion'
---

## 知识点地图

- **知识类别**：数值精度与大数运算——`java.math` 包（BigDecimal、BigInteger、MathContext、RoundingMode），Java SE 官方 API 文档中独立于基本类型的一章。
- **解决什么问题**：`double` 用二进制存小数，十进制的 0.1 在二进制里是无限循环小数，因此 `0.1 + 0.2` 得 `0.30000000000000004`；凡是钱的计算都不能用它。而超过 `long` 上限（约 922 亿亿）的整数运算（阶乘、幂、加密运算）基本类型也装不下。
- **什么时候用到**：金额、利率、汇率的存储与计算（金融/电商必修）；报表与发票的分摊计算；需要「十进制语义」的判定（比如 `0.1` 与 `0.10` 视为相等）；大整数运算（密码学、组合数学、ID 生成）。

## 前置知识

- [数据类型与转换](/java/050-DataTypeConversion)：`double`/`float` 的取值范围与精度损失概念；
- [包装类缓存陷阱](/java/060-WrapperCacheTrap)：包装类不可变、`equals` 与 `==` 的差别——BigDecimal 的坑与之同构。

## 学习目标

读完本文你将能够：

1. 用书价表这个经典例子复现并解释浮点误差的来源；
2. 区分 `new BigDecimal(double)`、`new BigDecimal(String)`、`BigDecimal.valueOf(double)` 三种构造方式，并说出为什么「构造陷阱」是生产事故高发区；
3. 用 `scale` 与 `RoundingMode` 精确控制保留几位、怎么舍入；
4. 解释 `equals` 与 `compareTo` 为什么结果不一致，以及该在什么场合用哪一个；
5. 判断一个需求该用 BigDecimal、double 还是 long（以「分」为单位），以及什么时候才轮到 BigInteger。

预计 60 分钟，含 1 个金额找错练习与 2 道动手任务。

## 1. 从书价表说起：double 算不了钱

课堂经典题：书店有三本书——《Java 编程思想》55.0 元、《精通 CSS 和 HTML 设计》35.9 元、《MS SQL Server 2008 大全》46.9 元，求总价。

```java
double total = 55.0 + 35.9 + 46.9;
System.out.println(total);            // 137.8（碰巧显示正常）
System.out.println(35.9 + 46.9 == 82.8);  // true（也碰巧）
```

看起来没问题？换两个同样真实的操作就露馅了：

```java
System.out.println(35.9 * 3);              // 107.69999999999999（买三本《精通CSS》）
System.out.println((55 + 35.9 + 46.9) * 0.88);  // 121.26400000000001（全场 88 折）
System.out.println(0.58 * 100);            // 57.99999999999999（57.58 元换成「分」再转回元）
System.out.println(0.1 + 0.2);             // 0.30000000000000004
```

**为什么**：`double` 按 IEEE 754 标准用二进制科学计数法存储。十进制的 0.1 写成二进制是 `0.000110011001100...`（0011 无限循环），而 `double` 只有 64 位，只能存一个「最接近 0.1 的二进制数」。平时做加减乘，误差被 `Double.toString` 的最短表示规则掩盖了；一旦乘法、减法把误差放大到第 15~17 位有效数字之外，打印出来就是一串 9 或一串 0。

**心智模型**：`double` 是「测量仪」，适合物理量（身高 1.75 m、速度 3.2 m/s，差一点点无所谓）；BigDecimal 是「记账本」，适合金额（一分钱都不能差）。`double` 算得快，BigDecimal 慢一个数量级且不可变对象频繁创建——两者不可互相替代。

| 场景 | 用什么 | 理由 |
| --- | --- | --- |
| 订单金额、退款、佣金 | BigDecimal（存库用 DECIMAL） | 十进制精确、可控舍入 |
| 科学计算、图形坐标 | double/float | 误差可容忍、性能高 |
| 计数、库存数量 | int/long | 天然整数，无需精度 |
| 金额的中转/展示（非计算） | long 存「分」 | 一些老系统与高性能场景的约定 |

## 2. 三种构造方式与构造陷阱

### 2.1 陷阱现场：new BigDecimal(0.1)

```java
BigDecimal a = new BigDecimal(0.1);
System.out.println(a);
// 0.1000000000000000055511151231257827021181583404541015625

BigDecimal b = new BigDecimal("0.1");
System.out.println(b);                    // 0.1

BigDecimal c = BigDecimal.valueOf(0.1);
System.out.println(c);                    // 0.1
```

**逐行解释**：

1. `new BigDecimal(0.1)` 的参数是 `double`。构造器**不经过任何字符串**，直接把 0.1 在内存里那个「比 0.1 略大一点点的二进制数」原样翻译成十进制——于是得到 55 位小数。它没有错，它忠实地表达了 double；错的是你想要 0.1。
2. `new BigDecimal("0.1")` 走字符串解析，得到的就是字面上的 0.1。**这是唯一保证所见即所得的构造方式。**
3. `BigDecimal.valueOf(0.1)` 的官方实现等价于 `new BigDecimal(Double.toString(0.1))`——先把 double 转成最短字符串再解析，效果与传字符串相同。双精度值来自变量（比如数据库读出来的）时用它最顺手。

**换成别的写法会发生什么**：把 `new BigDecimal("0.1")` 写成 `new BigDecimal(0.1)`，程序照常编译运行，只是金额悄悄变成了 55 位小数的怪物；拿它去 `multiply`、去和数据库的 `DECIMAL(10,2)` 比较，误差就进入账目。这一类 bug 编译器不报、单测常过（用例常写 0.1+0.2 这类能整除的数）、上线对账时才炸——是 BigDecimal 最著名的事故来源。

**易错点**：常量场景养成 `new BigDecimal("字符串")` 的肌肉记忆；double 变量场景用 `BigDecimal.valueOf(...)`；**永远不要 `new BigDecimal(double)`**。IDEA 的 inspection 会直接对它标黄。

### 2.2 三个场景

- **场景一（课堂书价表）**：把书价表重写为 BigDecimal——`new BigDecimal("55.0").add(new BigDecimal("35.9")).add(new BigDecimal("46.9"))` 得到精确的 137.8；乘折扣用 `multiply(new BigDecimal("0.88"))`。
- **场景二（电商订单，真实工程）**：订单行的单价与数量来自前端与数据库。金额字段在 Java 里声明为 `BigDecimal price`，MyBatis/JPA 映射到 MySQL 的 `DECIMAL(10,2)` 列。数据库 DECIMAL 是十进制存储，与 BigDecimal 语义一一对应；如果映射成 double，`SELECT` 出来就已经带误差了。优惠券分摊（把 10 元优惠按行金额比例拆到 3 行）最后一行必须用「总额减去前面各行」兜底，否则四舍五入的零头会丢——这是分摊计算的通用套路。
- **场景三（复利计算）**：本金 10000 元、年利率千分之三、存 5 年：`p = p.multiply( BigDecimal.valueOf(1.003) )` 循环 5 次得 10150.90。用 double 循环在这个例子里恰好也对，但利率改成 0.0007 这类「二进制下除不尽」的数就会出现第 16 位的漂移，最后一位 `printf("%.2f")` 的四舍五入方向跟着摇摆。

## 3. scale 与 RoundingMode：保留几位、怎么舍

### 3.1 scale 是什么

BigDecimal 内部由两部分组成：`unscaledValue`（一个 BigInteger，不含小数点）和 `scale`（小数位数），数值 = unscaledValue × 10^-scale。所以 `1.50` 与 `1.5` 的 unscaledValue 相同但 scale 不同（2 与 1）——记住这一点，第 4 节的 equals 之谜就自然解开。

```java
BigDecimal x = new BigDecimal("1.50");
System.out.println(x.scale());   // 2
System.out.println(x.unscaledValue()); // 150
```

### 3.2 setScale 与舍入模式

```java
BigDecimal price = new BigDecimal("2.675");

System.out.println(price.setScale(2, RoundingMode.HALF_UP));   // 2.68
System.out.println(price.setScale(2));  // 抛 ArithmeticException！
```

**逐段讲解**：

1. `setScale(2, RoundingMode.HALF_UP)` 表示「保留 2 位小数，四舍五入」。`HALF_UP` 就是中国小学教的四舍五入；银行系统常用 `HALF_EVEN`（银行家舍入：舍入位正好是 5 时向偶数靠拢，让长期统计误差相互抵消）。
2. 不带舍入模式的 `setScale(2)` 只在「缩小 scale 不会丢信息」时合法——2.675 缩到 2 位必然要舍入，于是抛 `ArithmeticException`。**凡可能丢精度，必须显式给 RoundingMode。**
3. 一个著名陷阱：`new BigDecimal(2.675).setScale(2, RoundingMode.HALF_UP)` 得到 2.67 而不是 2.68——因为 `double` 里的 2.675 实际是 2.67499999...，第 3 位小数根本不是 5。这就是「先构造错、再谈舍入」的连锁事故。

**常用舍入模式速查**：

| RoundingMode | 含义 | 典型用途 |
| --- | --- | --- |
| HALF_UP | 四舍五入（5 进位） | 日常金额 |
| HALF_EVEN | 5 向偶数舍入 | 银行/统计 |
| HALF_DOWN | 5 舍去 | 特殊业务规则 |
| UP / DOWN | 远离零 / 靠近零进位 | 手续费向上收、分成向下切 |
| CEILING / FLOOR | 向正无穷 / 负无穷 | 非负金额场景等价于 UP/DOWN |
| UNNECESSARY | 断言无需舍入 | 校验性断言，需舍入则抛异常 |

### 3.3 三个场景

- **场景一（超市小票）**：总价保留 2 位——`total.setScale(2, RoundingMode.HALF_UP)`，打印收银小票前统一走这一个出口方法，保证全店舍入口径一致。
- **场景二（工资系统，真实工程）**：个税按 `HALF_UP` 算到分；而月底「费用分摊到部门」按 `DOWN`（向下切），保证各部门分摊之和不超过总额，缺口挂「尾差」科目——两种舍入模式在同一系统并存且各有业务含义。
- **场景三（汇率换算）**：外币金额 × 汇率后 `divide` 的结果可能是无限小数，必须 `divide(divisor, 2, RoundingMode.HALF_UP)`；不带 scale 的 `divide` 遇到 1/3 这类除不尽直接抛 `ArithmeticException: Non-terminating decimal expansion`。

## 4. equals 与 compareTo：值相等 vs 造型相等

```java
BigDecimal a = new BigDecimal("1.0");
BigDecimal b = new BigDecimal("1.00");

System.out.println(a.compareTo(b) == 0);  // true：数值相等
System.out.println(a.equals(b));          // false：scale 不同（1 vs 2）
```

**为什么**：`equals` 的官方契约是 unscaledValue **和** scale 都相等才算相等；`compareTo` 只比较数值。`1.0` 与 `1.00` 数值相等但「造型」不同。

**会在哪里炸**：

```java
Set<BigDecimal> set = new HashSet<>();
set.add(new BigDecimal("1.0"));
System.out.println(set.contains(new BigDecimal("1.00"))); // false！

Map<BigDecimal, String> map = new HashMap<>();
map.put(new BigDecimal("1.0"), "a");
System.out.println(map.get(new BigDecimal("1.00")));      // null
```

`HashSet`/`HashMap` 用 `equals`/`hashCode` 判重；换成 `TreeSet`/`TreeMap`（用 `compareTo`）就能查到。**规则：金额做数值比较一律 `compareTo(...) == 0`；做键或判重要么统一 `setScale` 归一化，要么明确改用有序集合。**

### 三个场景

- **场景一（登录校验类业务）**：判断「余额是否恰好为 0」要 `balance.compareTo(BigDecimal.ZERO) == 0`，写成 `balance.equals(BigDecimal.ZERO)` 时，若余额是数据库读出的 `0.00`（scale=2）就恒为 false。
- **场景二（范围校验，真实工程）**：风控规则「单笔超过 5 万拦截」——`amount.compareTo(new BigDecimal("50000")) > 0`。所有金额比较（>、>=、<、<=）都没有运算符可用，只能 compareTo 配 0 来比。
- **场景三（缓存键）**：把费率作为 Map 键缓存计算结果，写库的费率有 `0.15` 也有 `0.150`，先用 `stripTrailingZeros().setScale(2)` 归一化再入键，否则缓存命中失败。

## 5. 四则运算与不可变心智模型

```java
BigDecimal a = new BigDecimal("100");
a.add(new BigDecimal("50"));                 // 没用！返回值被丢弃
System.out.println(a);                        // 100

BigDecimal b = a.add(new BigDecimal("50"));  // 正确：接收返回值
System.out.println(b);                        // 150
```

BigDecimal 是**不可变对象**（与 String 同款设计）：`add`/`subtract`/`multiply`/`divide` 全部返回新对象，原对象永远不变。`a.add(...)` 不接返回值是最常见的静默 bug——编译器不报错，逻辑却什么都没发生。

**除法的两种形态**：

```java
new BigDecimal("10").divide(new BigDecimal("4"));              // 2.5，能整除，OK
new BigDecimal("10").divide(new BigDecimal("3"));              // ArithmeticException：除不尽
new BigDecimal("10").divide(new BigDecimal("3"), 4, RoundingMode.HALF_UP); // 3.3333
```

约定：业务代码里的除法**一律写带 scale 与 RoundingMode 的重载**，哪怕是「看起来能整除」的除法——上游数据一改就炸。

**性能提示**：高频循环里频繁创建 BigDecimal 有开销。金额累加的两种工业写法：

1. 累加用 `long` 存「分」（或更小的最小货币单位），展示时再转 BigDecimal；
2. 或用 `BigDecimal` 累加但接受开销（多数业务量级完全够用）。

不要为了性能退回 double——那是在省几毫秒、亏几万块。

## 6. BigInteger：什么时候才需要它

### 6.1 long 的边界

`long` 上限是 9223372036854775807（约 9.2 × 10^18）。21 的阶乘就越界了：

```java
long f = 1L;
for (int i = 1; i <= 20; i++) f *= i;
System.out.println(f);            // 2432902008176640000，正确
for (int i = 21; i <= 21; i++) f *= i;
System.out.println(f);            // -4249290049419214848，静默溢出为负数！
```

**易错点**：整数溢出**不抛异常**，只是悄悄绕回——这是比浮点误差更隐蔽的坑。BigInteger 一切运算都精确、不会溢出（只受内存限制）。

```java
BigInteger f = BigInteger.ONE;
for (int i = 1; i <= 50; i++) {
    f = f.multiply(BigInteger.valueOf(i));  // 必须接返回值，同 BigDecimal
}
System.out.println(f);  // 50! = 30414093201713378043612608166064768844377641568960512000000000000
```

### 6.2 适用边界（不该用它的时候）

- 普通业务计数、ID、库存——`int`/`long` 足够，BigInteger 的每次运算都分配对象，慢且有 GC 压力；
- 需要「十进制小数」语义——那是 BigDecimal 的活，BigInteger 没有小数概念；
- 科研级任意精度浮点——`BigDecimal` 配 `MathContext`（控制有效数字位数与舍入）即可覆盖绝大多数场景。

### 6.3 三个场景

- **场景一（组合数学）**：计算 `C(100, 50)`——100! 已经远超 long，只能 BigInteger：`factorial(100).divide(factorial(50).multiply(factorial(50)))`。
- **场景二（密码学，真实工程）**：RSA 的模幂运算 `base.modPow(exp, mod)`、生成大素数 `BigInteger.probablePrime(2048, random)`——`java.security` 体系直接以 BigInteger 为基础类型。
- **场景三（雪花 ID 扩展位运算）**：分布式 ID 常用 `long` 位运算拼接；当业务要把 ID 扩到 64 位以上（时间戳 + 机房 + 机器 + 序列全加宽）时改用 BigInteger 的 `shiftLeft`/`or` 组合，或序列化协议里用无符号大整数。

## 7. 动手实践

### 任务一：书价表结算（热身）

把第 1 节的书价表用 BigDecimal 重写：三本书各买 2 本、全场 88 折，总价保留 2 位小数（四舍五入）。要求：价格一律从字符串构造，折扣用 `0.88`。

提示：multiply 之后链式 add；最后一步才是 setScale。

### 任务二：金额找错（实战，源自真实事故模式）

下面的结算代码有两处 bug，一处影响正确性，一处影响比较语义。先不要运行，自己找：

```java
public class Settlement {
    public static void main(String[] args) {
        double unitPrice = 0.58;                       // 单价 0.58 元
        int quantity = 100;

        BigDecimal total = new BigDecimal(unitPrice * quantity);
        total.setScale(2, RoundingMode.HALF_UP);       // 保留 2 位

        if (total.equals(new BigDecimal("58"))) {
            System.out.println("金额一致，允许结算");
        }
    }
}
```

提示一：unitPrice * quantity 在 BigDecimal 接手前发生了什么？提示二：setScale 的返回值去哪了？提示三：`"58"` 与结算金额的 scale 一样吗？

**参考实现（先自己写完再展开对照）**：

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

public class Settlement {
    public static void main(String[] args) {
        // 修正一：单价以字符串构造 BigDecimal，全程不经过 double
        BigDecimal unitPrice = new BigDecimal("0.58");
        BigDecimal quantity = BigDecimal.valueOf(100);

        // 修正二：setScale 返回新对象，必须接住
        BigDecimal total = unitPrice.multiply(quantity)
                                    .setScale(2, RoundingMode.HALF_UP);

        // 修正三：数值比较用 compareTo，而不是 equals（scale 敏感）
        if (total.compareTo(new BigDecimal("58")) == 0) {
            System.out.println("金额一致，允许结算");
        }
    }
}
```

三处对应原代码的三个错：`new BigDecimal(unitPrice * quantity)` 先把 0.58 变成 double 乘积（0.58 × 100 = 57.99999999999999），再带着误差进 BigDecimal；`total.setScale(...)` 的返回值被丢弃，total 仍是长小数；`equals` 因 scale 不同恒为 false，if 永远不走。

### 任务三：复利对照器

写一个小程序：本金 10000、年利率 0.003、存 5 年。分别用 double 循环和 BigDecimal 循环（`p = p.add(p.multiply(rate))`）计算，各打印 8 位小数，观察两条路径在第几位开始分叉；再把利率换成 0.0007 重跑一次，记录现象。

提示：double 版打印用 `printf("%.8f%n", v)`；BigDecimal 版 `p.setScale(8, RoundingMode.HALF_UP)`。想一想：为什么利率越小、年限越长，两条路径分叉得越早？

## 参考与致谢

- Oracle, *Java SE API Specification*：`java.math.BigDecimal`、`java.math.BigInteger`、`java.math.RoundingMode`、`java.math.MathContext` 类文档（https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/math/BigDecimal.html ），文中 API 语义（构造器契约、scale 定义、RoundingMode 各模式、divide 异常）以官方文档为准；
- The Java Tutorials: Numbers and Strings 一节对浮点误差的官方表述；
- 书价表题目与复利练习改编自仓库扫描素材（课堂练习题库，见 `.workflow-tmp/scan/e-core-java-mysql-web.md` 1.1 节），代码为本文自行编写。
