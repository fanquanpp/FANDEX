---
order: 360
title: 枚举救急锦囊：定义、构造函数与 switch
module: 'java'
category: 后端技术
difficulty: beginner
description: 零基础 20 行学会 enum：有身份证的常量，别再用 public static final int。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'java/037-JavaAnnotationsTutorial'
  - 'java/038-JavaEnumAdvanced'
  - 'java/009-ControlFlow'
prerequisites:
  - 'java/015-OOP'
---

# 枚举救急锦囊：定义、构造函数与 switch

平台里到处是"取值固定的字段"：演唱会状态只能是"筹备、售票中、已开演、已结束"，票档只能是"普通票、VIP 票、内场票"，应援色只能是几种固定搭配。新手常写成 `public static final int STATUS_ONSALE = 2;`，结果在日志里看到 `status=2` 时完全不知道是什么，还可能被塞进一个 99 这种非法值。本篇用 20 行左右的示例讲清枚举的定义、构造函数与 switch 用法，再补齐 `values`、`valueOf`、`ordinal` 这些必会 API。

一句话定调：**enum 是"有身份证的常量"**——每个枚举值不仅是一个名字，还可以携带字段、构造函数和行为。别再用 `public static final int` 拼状态码了。

## 前置知识

- [面向对象基础](/java/015-OOP)：类、字段、构造函数与方法的基本写法。
- [流程控制](/java/009-ControlFlow)：switch 语句的基础语法，本篇会升级为 switch 表达式。
- [注解入门](/java/037-JavaAnnotationsTutorial)：了解序列化示例中注解的角色即可。

## 学习目标

- 理解枚举相比 `public static final int` 常量在类型安全与可读性上的优势；
- 会定义携带字段与构造函数的枚举，并解释构造函数的调用时机；
- 熟练使用 `values()`、`valueOf()`、`ordinal()` 三个内置 API，并能对 `valueOf` 做容错；
- 掌握 switch 表达式配合枚举的穷举写法（Java 14 及以上）；
- 知道枚举的本质：继承 `java.lang.Enum` 的不可继承类，实例天然单例。

## 1. 为什么不用 public static final int

先看反例。用 int 常量表达演唱会状态，有两个无法根治的毛病：

```java
// 反面教材：int 状态码
public class ConcertStatusOld {
    public static final int PREPARING = 0;  // 筹备中
    public static final int ON_SALE = 1;    // 售票中
    public static final int ONGOING = 2;    // 已开演
    public static final int ENDED = 3;      // 已结束
}

public class BadDemo {
    public static void main(String[] args) {
        int status = ConcertStatusOld.ONGOING;
        status = 99;                       // 毛病一：编译器拦不住非法值
        System.out.println("状态：" + status); // 毛病二：日志只有数字，人看不懂
    }
}
```

换成枚举后，类型系统替你把关：变量只能是四个已定义状态之一，打印出来直接是名字，switch 还能享受编译器穷举检查。

```java
// 正面教材：演唱会状态枚举
public enum ConcertStatus {
    PREPARING,   // 筹备中
    ON_SALE,     // 售票中
    ONGOING,     // 已开演
    ENDED        // 已结束
}

public class GoodDemo {
    public static void main(String[] args) {
        ConcertStatus status = ConcertStatus.ONGOING;
        // status = 99;                          // 编译报错：类型不符，非法值进不来
        System.out.println("状态：" + status);   // 输出：状态：ONGOING
        System.out.println(status == ConcertStatus.ONGOING); // true：枚举可直接用 == 比较
    }
}
```

`==` 能直接比较枚举值，因为 JVM 保证每个枚举常量全局只有一个实例（天然单例），不存在"两个对象内容相同却地址不同"的问题，也就没有包装类缓存池那样的陷阱。

枚举还有一个容易被低估的收益：它把"有哪些状态"变成了可导航的代码。IDE 里点击 `ConcertStatus` 就能看到全部状态与各自的字段值，全文搜索常量名也比搜索魔法数字 2 靠谱得多——可读性从来不只是"名字好看"，还包括"能不能被工具与新人快速理解"。这也是团队规范普遍要求"禁用魔法值"的技术底座：枚举让常量名可搜索、可跳转、可统计，魔法数字做不到其中任何一项。

int 常量还有第三个毛病：无法承载附加信息。票价、中文说明、下一状态这些与常量天然关联的数据，要么散落在各种 if-else 里，要么再配一张 Map 维护对应关系，代码与数据割裂在两处，改一处漏一处。枚举把"名字 + 数据 + 行为"封装成同一个类型，这正是下一节的主题。

## 2. 定义带字段的枚举：构造函数与对外方法

枚举值后面跟一对括号，就是在调用枚举的构造函数。借助这一机制，每个票档都能携带自己的票价与说明：

```java
// 票档枚举：每个值携带价格与中文说明
public enum TicketType {
    NORMAL(380, "普通票"),     // 等价于调用 TicketType(380, "普通票")
    VIP(880, "VIP票"),
    INNER(1280, "内场票");

    private final int price;    // 私有字段：票价
    private final String label; // 私有字段：展示名

    // 枚举构造函数默认且必须是 private，只能由上面的常量定义调用
    TicketType(int price, String label) {
        this.price = price;
        this.label = label;
    }

    // 对外暴露字段的普通方法
    public int price() {
        return price;
    }

    public String label() {
        return label;
    }
}

public class TicketDemo {
    public static void main(String[] args) {
        TicketType t = TicketType.VIP;
        System.out.println(t.label() + "：" + t.price() + " 元"); // VIP票：880 元
    }
}
```

三点规则需要记牢：构造函数默认且只能是 `private`，不允许在别处 `new` 出新的票档；枚举值必须在第一行列出，且以分号结尾；字段一般声明为 `final`，让每个枚举值的状态不可变。枚举里同样可以定义普通方法、静态方法，甚至让每个枚举值重写抽象方法（进阶用法见本模块的枚举进阶篇）。

枚举还能实现接口：`public enum TicketType implements Describable` 完全合法，这让枚举能融入面向接口的体系（比如统一的"可展示"抽象）。但注意枚举不能继承类——唯一的继承名额已被 `java.lang.Enum` 占用，所以"公共代码放接口默认方法、差异化数据放枚举字段"是标准的组织方式。

## 3. values、valueOf 与 ordinal：三个必会 API

```java
public class EnumApiDemo {
    public static void main(String[] args) {
        // values()：返回全部枚举值数组，常用于遍历生成下拉框
        for (TicketType t : TicketType.values()) {
            System.out.println(t.name() + " -> " + t.label() + " " + t.price() + " 元");
        }

        // valueOf()：按字符串名字查找，名字必须与常量完全一致
        TicketType t = TicketType.valueOf("VIP");
        System.out.println(t.price()); // 880

        // ordinal()：返回常量在定义表中的序号（从 0 开始）
        System.out.println(TicketType.INNER.ordinal()); // 2

        // 名字写错会抛 IllegalArgumentException
        try {
            TicketType bad = TicketType.valueOf("vip"); // 小写不匹配
        } catch (IllegalArgumentException e) {
            System.out.println("没有这个票档，请检查大小写");
        }
    }
}
```

实际工程里，用户输入、数据库存储、接口传参都可能出现大小写或空格差异，建议给枚举配一个静态容错方法，如下所示。

```java
// 在 TicketType 中追加的静态工厂：解析失败时回退到默认票档
public static TicketType fromCode(String code) {
    if (code == null) {
        return NORMAL;
    }
    for (TicketType t : values()) {
        if (t.name().equalsIgnoreCase(code.trim())) { // 忽略大小写与首尾空格
            return t;
        }
    }
    return NORMAL; // 兜底策略按业务定，也可改为抛出业务异常
}
```

顺带两个细节：`values()` 每次调用都会克隆并返回一个新数组，这是为了防止外部修改内部缓存，超热点路径上可以把结果缓存到 `private static final TicketType[] ALL = values();` 复用；`valueOf` 则是 O(1) 的名字查找，比遍历 `values()` 逐个比对名字的写法性能与可读性都更好。三个 API 的成本画像值得记住：`values()` 是 O(n) 且每次克隆，`valueOf` 是 O(1) 哈希查找，`ordinal()` 只是读一个 int 字段。在网关每秒解析上万次票档参数这类高频转换场景，可以自建一个 `Map<String, TicketType>` 静态索引，映射不存在时直接返回统一的业务错误。最后一个建议：把"解析外部字符串"的职责收敛到枚举自己的静态工厂里，而不是散落在各个调用点——解析规则一变（比如支持别名），只改一处即可。

## 4. switch 表达式与穷举检查

Java 14 起 switch 升级为表达式，配合枚举时只要覆盖全部常量，就不需要 `default` 分支——这带来一个极有价值的编译期保证：将来给枚举新增一个票档，所有没处理它的 switch 会直接编译报错，逼你逐一补齐业务逻辑。

```java
public class SwitchEnumDemo {
    public static void main(String[] args) {
        TicketType t = TicketType.INNER;

        // switch 表达式：箭头语法，无穿透，直接返回值
        String tip = switch (t) {
            case NORMAL -> "观演区普通座，先到先得";
            case VIP    -> "前排专属区，附赠应援棒";
            case INNER  -> "互动内场，可参与击掌会";
        }; // 覆盖了全部三个票档，无需 default；新增票档时此处会编译报错

        System.out.println(tip);

        // 若使用传统冒号语法或语句式 switch，则建议补 default
        int limit = switch (t) {
            case NORMAL, VIP -> 4;   // 多个常量共用一个分支
            case INNER       -> 2;
            default          -> 0;   // 编译器要求兜底时的写法
        };
        System.out.println("单人限购：" + limit + " 张");
    }
}
```

注意取舍：箭头语法的穷举检查是枚举 + switch 的最大红利，能用 `->` 就尽量不用 `:`，也尽量不写多余的 `default`，把"新增枚举值"变成编译错误而不是线上事故。穷举检查还有一个隐藏收益：它把"新增枚举值"从一次记忆负担变成一次编译事件。团队约定里可以明确"新增枚举常量必须全仓编译修复所有 switch"，配合 CI 就能把状态处理遗漏拦截在合并之前，这比任何评审清单都可靠。

从实现角度看，枚举 switch 在字节码层用 `tableswitch` 或 `lookupswitch` 跳转，配合编译器生成的 `$SwitchMap` 数组把枚举映射成连续序号，分派成本 O(1)，比 if-else 链逐个 equals 更快——这也是"枚举分派优先用 switch"的性能理由之一。而穷举检查则来自 javac 的流分析：switch 表达式必须有确定的返回值，覆盖全部常量正是"不需要 default"的证明条件。

## 5. 枚举的本质：一个不能被继承的特殊类

编译器会把 `enum` 翻译成"继承 `java.lang.Enum` 的 final 类"，枚举值是它的 `public static final` 实例，在类加载时由 JVM 保证只创建一次。理解这一点，几个看似奇怪的行为就都顺理成章：不能 `new`、不能再继承别的类（Java 单继承，位置已被 `Enum` 占用）、`values()` 与 `valueOf(String)` 是编译器合成的静态方法（在 `Enum` 父类里找不到它们的声明）。

```java
import java.lang.reflect.Modifier;
import java.util.EnumSet;

public class EnumNatureDemo {
    public static void main(String[] args) {
        // 反射视角：枚举类的父类是 java.lang.Enum，且带 final 修饰
        Class<TicketType> c = TicketType.class;
        System.out.println(c.getSuperclass());            // class java.lang.Enum
        System.out.println(Modifier.isFinal(c.getModifiers())); // true

        // EnumSet/EnumMap：基于位向量与数组实现，快于普通 HashSet/HashMap
        EnumSet<TicketType> onSale = EnumSet.of(TicketType.NORMAL, TicketType.VIP);
        System.out.println(onSale.contains(TicketType.VIP));  // true
        System.out.println(onSale.contains(TicketType.INNER)); // false
    }
}
```

`EnumSet` 用一个 long（64 个枚举值以内）的位向量存储成员，`EnumMap` 用"下标即 ordinal"的数组存值，两者是 JDK 中"枚举专用、快过通用集合"的隐藏福利。当业务里出现"一个演唱会开放哪些票档""一个粉丝团解锁了哪些权益"这类小规模集合时，优先考虑它们。

还剩最后一个边界要划清：枚举的实例集合在编译期固定，若你的"常量"需要在运行期动态增减（比如运营可配置的勋章体系），枚举不再合适，应退回"数据库表 + 缓存"方案。枚举管的是"编译期已知、长期稳定"的那部分世界。

最后回到本篇的"救急"定位：面试中被问到枚举，能把"常量集合、携带数据、单例语义、switch 穷举、EnumSet 位向量"这五个关键词按顺序讲清楚，就已经超过大多数只会 `values()` 的候选人；再把第 6 节里的 ordinal 与 valueOf 陷阱补上，这一问基本就稳了。如果时间有限，优先把第 2 节的带字段枚举与第 4 节的 switch 穷举写熟，这两块覆盖了日常开发的九成场景。

## 易错点与最佳实践

**错误一：用 `valueOf` 解析外部字符串却不捕获异常。**

```java
// 错误：传入 "vip" 或 " VIP" 直接抛 IllegalArgumentException，接口 500
TicketType t = TicketType.valueOf(rawInput);

// 修正：统一走容错工厂方法
TicketType t2 = TicketType.fromCode(rawInput);
```

**错误二：用 `ordinal()` 当持久化编号。**

```java
// 错误：把序号存进数据库。日后在中间插入一个新票档，所有历史数据的序号全部错位
int code = ticketType.ordinal();

// 修正：存 name() 或自定义的稳定编码字段
String code2 = ticketType.name();
```

**错误三：反序列化枚举失败（Gson 报 `Expected BEGIN_OBJECT but was STRING`）。**

JSON 里存的是字符串 `"VIP"`，而 Gson 默认按对象结构反序列化枚举，或字段名与 JSON 值不一致。对策：让 JSON 直接使用枚举名，或用 Jackson 的 `@JsonValue` 指定序列化字段；零基础阶段最稳妥的做法是接收字符串，在业务层用 `fromCode` 转换并处理失败分支。

**错误四：把枚举当可变对象用。**

枚举字段应声明 `final`，构造函数一次性赋值。若允许运行中修改枚举的内部状态，多个线程共享的同一实例会出现数据竞争，也破坏了"常量"的语义。需要可变状态时，请用普通类承载。

**错误五：拿字符串比较枚举，或用 `ordinal()` 表达业务顺序。**

```java
// 错误：比较字符串绕开了类型系统，还容易拼错且编译器无法检查
if (ticketType.name().equals("VIP")) { applyVipRule(); }

// 修正：直接比较枚举常量，拼写错误与类型不符都会在编译期暴露
if (ticketType == TicketType.VIP) { applyVipRule(); }
```

同理，业务顺序（如"普通票 < VIP 票 < 内场票"的权益比较）应显式定义比较规则或使用自定义的稳定编码字段，而不是依赖 `ordinal()`——常量定义顺序一旦被调整，排序语义就悄悄变了。

## 本篇小结

- 枚举 = 固定集合的常量 + 可携带的数据 + 可附加的行为，天然单例，`==` 可直接比较，彻底取代 `public static final int` 状态码。
- 枚举值定义行调用构造函数，构造函数只能是 private；字段用 `final` 保证不可变。
- `values()` 遍历全部值、`valueOf()` 按名字解析（失败抛 `IllegalArgumentException`）、`ordinal()` 返回定义序号但绝不能持久化。
- switch 表达式配合枚举可做编译期穷举检查：覆盖全部常量则无需 default，新增枚举值会让漏改的 switch 编译报错。
- 外部输入解析务必走容错静态方法（trim、忽略大小写、给兜底值），序列化场景让 JSON 与枚举名对齐或用注解显式指定。

## 动手实践

1. **应援色枚举**：定义 `ThemeColor` 枚举，每个值携带色值（如 `#39C5BB`）与主唱歌姬名，写一个 `describe()` 方法输出"初音未来的应援色是青色（#39C5BB）"。思路：参照第 2 节的票档枚举，两个字段加一个普通方法。
2. **状态机**：给 `ConcertStatus` 添加 `next()` 方法，返回流程中的下一个状态（`ENDED` 的下一个仍是自己），并用 switch 表达式实现。思路：枚举里定义方法完全合法，switch 的穷举检查会让你少写一个 default。
3. **容错解析测试**：分别用 `" vip "`、`"VIP"`、`null`、`"VVIP"` 调用第 3 节的 `fromCode`，预测每个结果再运行验证。思路：重点观察 trim 与 `equalsIgnoreCase` 的作用顺序，以及 null 的短路分支。
