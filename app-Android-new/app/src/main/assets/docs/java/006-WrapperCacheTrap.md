---
order: 60
title: 包装类缓存陷阱救急锦囊
module: 'java'
category: 后端技术
difficulty: beginner
description: Integer 缓存池 -128~127：为什么 100==100 是 true，200==200 是 false。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'java/005-DataTypeConversion'
  - 'java/008-OperatorExpression'
  - 'java/020-EqualsHashCodeContract'
prerequisites:
  - 'java/005-DataTypeConversion'
---

# 包装类缓存陷阱救急锦囊

在虚拟歌手音乐平台的后台代码里，你到处都在跟"数字"打交道：歌曲的点播次数、演唱会的余票数、粉丝团的等级、票档的价格……其中很多字段在数据库里允许为空，于是它们在 Java 实体类里往往被声明成包装类型 `Integer`、`Long`，而不是基本类型 `int`、`long`。包装类用起来几乎和基本类型一样，但它本质上是"对象"，一旦用 `==` 去比较，就会撞上本篇要讲的"缓存池陷阱"：同样的写法，数值小的时候返回 true，数值大的时候却返回 false， bug 像幽灵一样偶发。

先把结论放在最前面：**包装类比较内容，只用 `equals()`**。`==` 比较的是引用，而 Java 对部分包装类做了"缓存池"，结果时真时假，绝不能用来判断数值是否相等。

本篇是"救急"定位：先用一段可运行代码把现象钉死，再从 `IntegerCache` 源码讲清机制，最后给出一套可直接搬进项目的防御写法。全文示例均围绕虚拟歌手音乐平台的票务与统计场景，可以在 IDE 里逐段运行验证。读完后请把"包装类只用 equals 比较"写进个人检查清单，它能替你挡掉一整类偶发 bug。

## 前置知识

- [数据类型转换](/java/005-DataTypeConversion)：基本类型与包装类型之间的自动装箱、自动拆箱语法。
- [运算符与表达式](/java/008-OperatorExpression)：`==` 对基本类型比数值、对引用类型比地址的双重含义。
- [equals 与 hashCode 契约](/java/020-EqualsHashCodeContract)：包装类 `equals()` 的比较依据与契约。

## 学习目标

- 说出八种包装类各自的缓存范围，并理解 `Integer.valueOf()` 源码中的缓存逻辑；
- 从源码角度解释"100 == 100 是 true、200 == 200 是 false"这一经典现象；
- 识别三类最常触发的拆箱 `NullPointerException` 场景，并写出防御性代码；
- 在集合判重、排序、判空等业务代码中统一采用正确的比较姿势；
- 知道如何通过 JVM 参数调整 `Integer` 缓存上界，以及为什么不建议依赖它。

## 1. 从 int 到 Integer：为什么需要包装类

Java 提供两种数字形态：基本类型 `int` 与包装类 `Integer`。基本类型性能高、不能为 null；包装类是对象、可以为 null，而泛型集合只认对象。平台里"票档余量"可能暂时没有录入数据，用 `Integer` 才能表达"空"这个状态。

```java
import java.util.HashMap;
import java.util.Map;

public class WrapperWhy {
    public static void main(String[] args) {
        // 泛型集合只能存对象，写 int 会直接编译报错
        Map<String, Integer> ticketStock = new HashMap<>();
        ticketStock.put("MIKU-普通票", 320);      // 320 被自动装箱成 Integer
        ticketStock.put("LUKA-VIP票", null);      // 允许"暂未开票"：这就是包装类的价值

        // 取出来的是 Integer，参与算术运算时自动拆箱
        Integer stock = ticketStock.get("MIKU-普通票");
        int need = 5;
        System.out.println("下单后余量：" + (stock - need));
    }
}
```

自动装箱（`int -> Integer`）在字节码层面调用的是 `Integer.valueOf(int)`，而不是 `new Integer(int)`；自动拆箱调用的是 `intValue()`。这两处"编译器替你补的代码"，正是后面两个陷阱的总根源。

## 2. 缓存池机制：valueOf 里藏着的小仓库

为了节省小数值频繁装箱带来的对象分配开销，JDK 在 `Integer` 内部维护了一个静态缓存数组 `IntegerCache`，预先创建并复用 -128 到 127 这 256 个对象。看一眼简化的源码，一切都会通：

```java
// JDK 中 Integer.valueOf 的核心逻辑（简化示意）
public static Integer valueOf(int i) {
    // IntegerCache.low 固定为 -128，high 默认为 127
    if (i >= IntegerCache.low && i <= IntegerCache.high) {
        // 命中缓存区间：返回池中早就建好的同一个对象
        return IntegerCache.cache[i + 128];
    }
    // 超出区间：每次都 new 一个新对象，地址各不相同
    return new Integer(i);
}
```

自动装箱走的就是 `valueOf`，所以"池内同地址、池外新对象"。各包装类的缓存范围如下：

| 类型 | 缓存范围 |
| --- | --- |
| `Boolean` | `true` / `false` 两个值 |
| `Byte` | 全部（-128~127） |
| `Short` / `Integer` / `Long` | -128~127 |
| `Character` | 0~127 |
| `Float` / `Double` | 无缓存 |

两个细节值得记住：其一，`Integer` 的缓存上界可以通过启动参数 `-XX:AutoBoxCacheMax=<n>` 调大，下界固定 -128 不可调；其二，`Float`、`Double` 因为取值无限稠密、缓存没有意义，所以干脆不做缓存。

还有一个常被追问的问题：缓存池里的对象是什么时候创建的？答案是类初始化阶段。`IntegerCache` 是 `Integer` 的静态内部类，JVM 加载并初始化 `Integer` 类时就把这 256 个对象一次性建好，放进 `static final Integer[] cache` 数组，之后所有装箱请求都只是查表返回引用——这也是为什么它叫"池"而不叫"缓存策略"：没有任何淘汰与重建逻辑，生命周期与 JVM 相同。`Long`、`Short`、`Character` 的内部缓存实现与它几乎一模一样，学会一个等于学会四个。

## 3. == 与 equals：为什么 100==100 是 true，200==200 是 false

把机制套到真实场景上：粉丝团的"应援排名"常常是小数字，演唱会"余票"动辄上百上千。下面的类可以直接编译运行：

```java
public class CacheTrapDemo {
    public static void main(String[] args) {
        // 场景一：两个粉丝团的应援排名都是 100（池内）
        Integer rankA = 100;                  // 自动装箱，走 valueOf(100)
        Integer rankB = 100;
        System.out.println(rankA == rankB);   // true：两者指向缓存池同一个对象

        // 场景二：两场演唱会的余票都是 200（池外）
        Integer stockA = 200;
        Integer stockB = 200;
        System.out.println(stockA == stockB); // false：超出缓存区间，各自 new 的新对象
        System.out.println(stockA.equals(stockB)); // true：equals 比较内容，永远正确

        // 场景三：包装类与基本类型比较，触发拆箱，按数值比
        int rank = 100;
        System.out.println(rankA == rank);    // true：rankA 拆箱成 int 再比较

        // 场景四：new 出来的对象永远不在池里
        System.out.println(rankA == new Integer(100)); // false：地址不同
    }
}
```

规则可以浓缩成一张"决策表"：两个包装类之间，只能用 `equals()`；包装类与基本类型之间，`==` 会拆箱按数值比，但要先保证包装类不为 null；基本类型之间随便用 `==`。凡是"时真时假"的比较 bug，几乎都出现在第一行规则被违反的时候。

把这套机制讲给面试官时，标准的表达分三层：第一层说现象（小值 true、大值 false）；第二层说机制（自动装箱走 `valueOf`，-128~127 命中 `IntegerCache` 静态数组，池外 new 新对象）；第三层说规范（包装类判等用 `equals`，`==` 只用于基本类型或刻意比较同一性）。三层递进比直接背结论更能证明你真的懂了。

## 4. 拆箱 NPE：null 引爆的隐形炸弹

缓存池陷阱的孪生兄弟是拆箱空指针：自动拆箱等价于调用 `intValue()`，对 null 调用方法必然抛 `NullPointerException`。平台代码里最容易踩中的三个场景：

```java
import java.util.HashMap;
import java.util.Map;

public class UnboxNpeDemo {
    public static void main(String[] args) {
        Map<String, Integer> stock = new HashMap<>();
        stock.put("RIN-普通票", 80);

        // 场景一：Map.get 未命中返回 null，赋给 int 触发拆箱
        // int a = stock.get("LEN-普通票");            // NPE：key 不存在

        // 场景二：三目运算符两个分支类型不一致，整个表达式被提升为 int，
        // 即使走的是 Integer 分支，也会在拼接时对 null 拆箱
        Integer vipLeft = null;
        boolean isVip = true;
        Integer bonus = isVip ? vipLeft : 0;          // NPE：vipLeft 被强制拆箱

        // 场景三：包装类为 null 时参与算术或作为 synchronized 参数等
        // int total = vipLeft + 10;                   // NPE：null.intValue()
    }
}
```

防御思路只有一条：**拆箱之前先判空**。要么用 `Map.getOrDefault(key, 0)` 给默认值，要么用 `Objects.equals()` 做判等（它内部处理了 null），要么在业务上坚持"可空字段不直接参与运算"。

从字节码层面看，拆箱就是一次 `invokevirtual intValue()`，装箱就是一次 `invokestatic Integer.valueOf(int)`，两者都是编译器悄悄插入的调用，源码层面完全看不出痕迹。这正是这类 bug 难排查的根本原因：出事的代码"什么都没做"，危险全部藏在编译器的自动行为里。所以代码评审时看到包装类参与运算、比较、传参，都要多问一句"这里会不会拆箱"。

## 5. 集合与业务代码中的正确姿势

好消息是：集合框架内部已经正确使用了 `equals()` 和 `hashCode()`，你不需要为 `List<Integer>.contains()`、`HashSet` 去重、`HashMap` 按 `Integer` 取值额外担心——只要 key 是包装类，`map.get(100)` 与 `map.get(new Integer(100))` 效果一致，因为取 key 时走的是哈希加 `equals`。

需要你亲自把关的是自己写的比较逻辑。下面是平台里一段合规的示例：按余票判断售罄、按热度排序、安全判等。

```java
import java.util.*;

public class RightWayDemo {
    public static void main(String[] args) {
        Map<String, Integer> heat = new HashMap<>();
        heat.put("千本樱", 12000);
        heat.put("Melt", 9900);

        // 判等：Objects.equals 对 null 友好
        Integer target = heat.get("深海少女");
        System.out.println(Objects.equals(target, 0));   // false，而不是抛 NPE

        // 取默认值：避免拆箱 NPE
        int safe = heat.getOrDefault("深海少女", 0);

        // 排序：用 compareTo 而不是减法（减法在数值大时会溢出）
        List<Integer> counts = new ArrayList<>(heat.values());
        counts.sort(Integer::compareTo);
        System.out.println(counts);
    }
}
```

排序时的一个附加提醒：有人喜欢写 `(a, b) -> a - b` 的比较器，这在包装类上同样危险——`Integer.MIN_VALUE` 附近的差值会溢出变号，正确做法始终是 `Integer.compare(a, b)` 或 `compareTo`。

判空的姿势也要统一：`if (stock != null && stock > 0)` 与 `Objects.requireNonNullElse(stock, 0) > 0` 都可以，但一个工程里最好固定一种写法，混用会让"到底哪里判过空"变成玄学。建议在公共层（DAO、RPC 返回值的装配处）统一把 null 归一化为默认值，业务层只面对非空的包装类，判空代码就收敛到了唯一一处。如果团队已在用 `Optional`，`map` 加 `orElse` 的链式写法同样能把 null 折叠掉，但要警惕把 `Optional` 当字段与集合元素的老问题。

## 6. 选型指南：字段到底用 int 还是 Integer

缓存陷阱讲完，回到更根本的问题：什么时候必须用包装类，什么时候坚持基本类型。一条来自工程实践的通用规约是：**实体类（POJO）的属性一律用包装类型，局部变量与计算过程一律用基本类型**。

实体字段用包装类有三层理由：数据库字段可以为空，`null` 才能与 SQL 的 NULL 对应；RPC 与 JSON 序列化时，"字段缺失"与"取值为 0"是两种不同的业务语义，基本类型会被默认值 0 悄悄吞掉这种区别；判空、条件赋值等逻辑也需要可空类型参与。反过来，高频计算场景（循环里的计数器、订单金额累加、排序比较）坚持用基本类型，可以避免每次运算都装箱拆箱——拆箱不仅要调用 `intValue()`，缓存区间外还会产生真实的对象分配与 GC 压力。

```java
public class ChoiceDemo {
    public static void main(String[] args) {
        // 局部变量：用基本类型，快且不可能为 null
        int total = 0;
        for (int i = 1; i <= 1000000; i++) {
            total += i;
        }

        // 实体字段：用包装类，能表达"尚未设置"
        TicketStock stock = new TicketStock();
        stock.setTier("普通票");                 // price 保持 null，表示"尚未定价"
        System.out.println(stock.getPrice() == null); // true
    }

    // 票档库存实体：price 允许为 null，对应"未开票"状态
    static class TicketStock {
        private String tier;
        private Integer price;

        public void setTier(String tier) { this.tier = tier; }
        public Integer getPrice() { return price; }
    }
}
```

一句话概括：**可空语义选包装类，纯计算选基本类型**。只要坚持"包装类之间用 equals"这一条铁律，两种类型混用的坑就伤不到你。

顺带回应一个高频疑问：`Integer` 能不能当 `Map` 的 key？可以，而且放心用——包装类的 `hashCode` 与 `equals` 都由 JDK 保证正确。这也解释了第 5 节"集合内部已正确处理"的原因：集合本身不生产判等逻辑，它信任 key 类型的契约，而包装类的契约是 JDK 写死的，不需要你操心。

## 易错点与最佳实践

**错误一：用 `==` 比较两个包装类。**

```java
// 错误：ID 是小数字时测试通过，上生产变成大数字后突然失效
if (userLevel == vipLevel) { grantBadge(); }

// 修正：包装类一律用 equals 比较
if (Objects.equals(userLevel, vipLevel)) { grantBadge(); }
```

这类 bug 最阴险的地方在于"测试环境全绿、生产偶发"，因为测试数据往往恰好落在 -128~127 的缓存区间内。

**错误二：拿到可能为 null 的包装类直接拆箱。**

```java
// 错误：get 可能返回 null，赋给 int 的瞬间抛 NPE
int left = ticketStockMap.get(concertId);

// 修正：给默认值或显式判空
int left = ticketStockMap.getOrDefault(concertId, 0);
```

**错误三：三目运算符悄悄拆箱。**

```java
// 错误：Integer 与 int 混在两个分支，条件表达式类型被提升为 int
Integer bonus = isVip ? vipLeft : 0;   // vipLeft 为 null 时抛 NPE

// 修正：让两个分支类型一致，或先归一化为非空
Integer bonus = isVip ? Objects.requireNonNullElse(vipLeft, 0) : 0;
```

**错误四：用 `new Integer(...)` 或依赖缓存上界。**

`new Integer(int)` 从 Java 9 起已标记废弃，请直接使用 `Integer.valueOf()` 或自动装箱；同时不要把业务正确性押在"-128~127 一定相等"上，`-XX:AutoBoxCacheMax` 属于调优参数，不是语义保证，`equals()` 才是。

**错误五：在热点循环里反复装箱。**

```java
// 错误：Long 累加器每次 += 都先拆箱再加、再装箱，产生海量临时对象
Long sum = 0L;
for (long i = 0; i < 1000000; i++) { sum += i; }

// 修正：计算过程用基本类型，只在存入集合等必要时刻装箱
long sum2 = 0L;
for (long i = 0; i < 1000000; i++) { sum2 += i; }
```

这就是经典的"Long 装箱风暴"：同样的循环，包装版本慢一个数量级，还会给 GC 制造一百万个短命对象。统计点赞数、播放量这类高频累加时尤其要警惕。

## 本篇小结

- 包装类是对象，`==` 比地址；自动装箱走 `valueOf()`，-128~127（`Character` 为 0~127）命中缓存池，池外每次新建对象，这就是"100 相等、200 不等"的全部真相。
- 包装类之间的内容比较只有一个正解：`equals()`（或 null 安全的 `Objects.equals()`）；排序用 `compareTo()` / `Integer.compare()`。
- 拆箱等价于调用 `intValue()`，对 null 拆箱必抛 NPE；`Map.get` 未命中、三目类型提升、算术运算是最常见的三个引爆点，判空或给默认值后再运算。
- `Float`、`Double` 没有缓存；`Integer` 缓存上界可用 JVM 参数调整，但不应依赖。
- 集合内部（`contains`、去重、按 key 取值）已正确使用 `equals`/`hashCode`，风险集中在你手写的比较与拆箱代码里。

## 动手实践

1. **验证缓存边界**：编写程序，循环比较 `new Integer(i) == Integer.valueOf(i)`（i 取 126、127、128、129），打印结果并解释每一行的原因。思路：对照第 2 节的缓存表，逐行标注"池内/池外"。
2. **修复 NPE**：给平台写一个 `int safeStock(Map<String, Integer> stock, String tier)` 方法，要求对"key 不存在""value 为 null"两种情况都返回 0，且不出现裸拆箱。思路：`getOrDefault` 只能挡住 key 不存在，value 为 null 需要再补一层 `Objects.requireNonNullElse` 或判空。
3. **找出真凶**：一段投票统计代码在测试环境正常、线上偶发抛 NPE，涉及 `Integer total = isFinalRound ? votes.get(songId) : 0;`。定位问题并给出两种等价修法。思路：用第 4 节"场景二"解释类型提升，再用 `getOrDefault` 或统一分支类型修复。
