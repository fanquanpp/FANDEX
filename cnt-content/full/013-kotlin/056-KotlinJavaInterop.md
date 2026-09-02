---
order: 560
title: Kotlin 与 Java 互操作
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 双向调用规则：空安全映射、静态成员与 @Jvm 系列注解。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'kotlin/003-KotlinBasicSyntax'
  - 'kotlin/014-NullSafetyDetailed'
  - 'kotlin/037-KotlinGradle'
prerequisites:
  - 'kotlin/003-KotlinBasicSyntax'
---

# Kotlin 与 Java 互操作

平台的服务端是典型的混编工程：早年用 Java 写的票务网关还在服役，新的歌单、应援团模块用 Kotlin 开发。Kotlin 在语言层面为双向调用做了大量"无缝"设计——Kotlin 可以直接调用任何 Java 类库，Java 也几乎能像调用普通 Java 类一样调用 Kotlin 代码。但"几乎"二字里藏着不少规则：平台类型如何映射空安全、顶层函数编译到哪个类、伴生对象怎么变静态、默认参数为什么需要 `@JvmOverloads`。本篇把双向调用的映射规则与 `@Jvm` 系列注解一次讲全。

## 前置知识

- [Kotlin 基础语法](/kotlin/003-KotlinBasicSyntax)：顶层函数、属性与伴生对象的声明方式。
- [空安全详解](/kotlin/014-NullSafetyDetailed)：可空类型、安全调用与 `!!` 的语义，是理解平台类型的基础。
- [Kotlin Gradle 配置](/kotlin/037-KotlinGradle)：混编工程的插件与源集配置。

## 学习目标

- 理解平台类型 `T!` 的来历，掌握 Kotlin 调 Java 时的空安全防御策略；
- 说清 Java getter/setter 与 Kotlin 属性语法的映射规则（含 `is` 前缀布尔属性）；
- 会用 `@file:JvmName`、`@JvmStatic`、`@JvmOverloads`、`@JvmField` 控制 Java 侧看到的 Kotlin 代码形态；
- 掌握 SAM 转换在 Kotlin 调 Java 与 Java 调 Kotlin（`fun interface`）两个方向上的用法；
- 了解混编工程的 Gradle 配置要点与常见编译陷阱。

## 1. Kotlin 调用 Java：平台类型与空安全

Kotlin 能直接 import 并调用任意 Java 类。但 Java 的类型系统没有可空标记，`String` 到底可不可以为 null，Kotlin 编译器无从知晓，于是引入了"平台类型"（记作 `T!`）：可空性未知、既可当 `String` 也可当 `String?` 处理。这带来最大的风险——把平台类型直接赋给非空变量，运行时可能撞上 NPE：

```java
// Java 侧：票务网关，票档可能尚未开售而返回 null
public class TicketGateway {
    public String findTier(String concertId) {
        if ("TOKYO-2026".equals(concertId)) {
            return "VIP票";
        }
        return null; // Java 世界完全合法
    }
}
```

```kotlin
// Kotlin 侧调用
fun main() {
    val gateway = TicketGateway()
    val tier: String = gateway.findTier("OSAKA-2026") // 编译通过：平台类型被当成非空
    println(tier.length) // 运行时 NPE：实际返回了 null
}
```

防御策略有三种：把返回值显式声明为可空 `String?` 并用安全调用处理；在确定不为 null 时用 `!!`（风险自担）；最推荐的是从源头治理——给 Java 代码加上 `@Nullable`/`@NotNull` 注解（如 JSR-305 或 JetBrains 注解），Kotlin 编译器会把注解当作可空性事实，错误用法直接在编译期报错。

```kotlin
fun main() {
    val gateway = TicketGateway()
    // 策略一：显式可空 + 安全调用
    val tier: String? = gateway.findTier("OSAKA-2026")
    println(tier?.length ?: "该场次未开票")
}
```

另外注意集合类型的可空性同样受平台类型影响：`List<String!>` 意味着"列表或元素都可能为 null"，Java 侧传入 null 元素后，Kotlin 侧按 `List<String>` 使用会在遍历时爆雷。

平台类型还有一个隐蔽的传播特性：它只在"跨越语言边界的那一刻"存在。Java 返回的 `String` 一旦赋给了 Kotlin 的非空 `String` 变量，后续代码就把它当非空类型用了，null 的危险被推迟到某次解引用才爆出来，异常堆栈离真正的出错边界可能很远。因此团队规范里值得固定一条：所有调用 Java 的封装处（repository、gateway、adapter）必须显式声明可空性，平台类型不允许穿透出这一层。

## 2. 属性访问与 getter/setter 映射

Java 的 `getXxx`/`setXxx` 方法对，在 Kotlin 侧可以像访问属性一样使用点号语法：

```java
// Java 实体：歌姬信息，标准 JavaBean 风格
public class Singer {
    private String name = "初音未来";
    private boolean active = true;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
```

```kotlin
fun main() {
    val singer = Singer()
    // Kotlin 语法：像读写属性一样调用 getter/setter
    println(singer.name)     // 初音未来：等价于 singer.getName()
    singer.name = "巡音流歌"  // 等价于 singer.setName("巡音流歌")

    // Boolean 属性：is 前缀的 getter 直接就是属性名，读写都用它
    println(singer.active)   // true：等价于 singer.isActive()
    singer.active = false    // 等价于 singer.setActive(false)
}
```

映射规则可归纳为：`getName`/`setName` 映射为属性 `name`；Boolean 的 `isActive`/`setActive` 映射为属性 `active`（getter 的 `is` 前缀即是属性名，不重复叠加）；只有 getter 没有 setter 的方法是只读属性。但纯工具风格的方法（如 `size()` 命名不符、或 `computeTotal()` 这类动词方法）不会映射为属性，仍按函数调用。

掌握映射规则后还能反向利用它：给 Java 库写"属性式封装"的薄外立面。Kotlin 标准库正是这样把 `System.getProperty` 等老 API 包装成属性语法的。混编团队可以沉淀一层 Kotlin facade，把高频 Java 调用统一成属性与顶层函数，Java 遗留 API 的风格成本就被隔离在 facade 里，新代码不再直接触碰原始方法名。

## 3. Java 调用 Kotlin：顶层函数与 @Jvm 系列注解

反方向有几个编译期"翻译"规则需要主动控制。默认情况下，Kotlin 顶层函数被编译进"文件类"——名为 `文件名 + Kt` 的类中的静态方法；伴生对象成员则挂在 `Companion` 上，Java 调起来很别扭。`@Jvm` 系列注解就是用来修正这些形态的：

```kotlin
// PriceUtils.kt：文件顶部声明 Java 侧看到的类名
@file:JvmName("PriceUtils")

package com.fandex.music

const val VIP_DISCOUNT = 0.85          // 编译期常量：自动成为静态字段

// 顶层函数：Java 侧调用 PriceUtils.calcPrice(...)
fun calcPrice(base: Int): Int = (base * VIP_DISCOUNT).toInt()

class ConcertTicket {
    companion object {
        const val MAX_PER_FAN = 4      // const val：已是静态字段
        @JvmStatic                     // 让 Java 直接调用 ConcertTicket.limit()
        fun limit(): Int = MAX_PER_FAN

        @JvmField                      // 暴露为公开实例字段，绕过 getter/setter
        val cacheEnabled = true
    }
}
```

```java
// Java 侧调用同一份代码
import com.fandex.music.PriceUtils;
import com.fandex.music.ConcertTicket;

public class JavaCaller {
    public static void main(String[] args) {
        int price = PriceUtils.calcPrice(880);        // 顶层函数：静态方法形态
        int limit = ConcertTicket.limit();            // @JvmStatic 后无需 Companion
        boolean ok = ConcertTicket.cacheEnabled;      // @JvmField 直接读字段
        double d = ConcertTicket.VIP_DISCOUNT;        // const val 编译为 public static final
        System.out.println(price + " " + limit + " " + ok + " " + d);
    }
}
```

没有 `@JvmStatic` 时，Java 必须写 `ConcertTicket.Companion.limit()`；没有 `@file:JvmName` 时，顶层函数藏在 `PriceUtilsKt` 里。同理，`@JvmOverloads` 为带默认参数的 Kotlin 函数生成一串重载，否则 Java 侧必须手动补全每个参数：

```kotlin
// 默认参数：Kotlin 内部一个函数搞定，Java 需要 @JvmOverloads 生成重载
class Concert(
    val city: String,
    val date: String = "2026-10-01",
    val hall: String = "主厅",
) {
    @JvmOverloads
    fun book(city: String = this.city, count: Int = 1, tier: String = "普通票"): String =
        "已为 $city 预订 $count 张 $tier"
}
// Java 侧因此可用 book()、book("上海")、book("上海", 2)、book("上海", 2, "VIP票") 四种重载
```

`@Jvm` 注解各自有作用域讲究：`@JvmStatic` 只能用在对象与伴生对象成员上，`@JvmOverloads` 只对带默认参数的函数生效，`@JvmField` 要求属性不能是 private、不能自定义访问器、不能重写 open 属性。注解加错位置时编译器会直接报错，报错信息本身就解释了适用条件。

命名上还有一处反向映射值得掌握：Kotlin 顶层属性与伴生对象常量，在 Java 侧的访问名由注解决定。`const val` 与 `@JvmField` 直接暴露为字段名；普通 `val` 则要经 getter 访问，且首字母被大写——`val maxTier` 在 Java 里是 `getMaxTier()`。写供 Java 使用的 Kotlin API 时，先在脑子里过一遍"Java 同事将看到什么签名"，能省掉大量沟通成本。

## 4. SAM 转换与默认方法

Kotlin 调 Java 时，任何"单一抽象方法"的 Java 接口参数都可以直接传 lambda，这就是 SAM 转换，也是 Kotlin 无缝使用老 Java 库的关键。反过来，Java 想用 lambda 调 Kotlin，接口必须显式声明为 `fun interface`：

```kotlin
// Kotlin 侧定义的函数式接口：Java 8 lambda 可直接实现它
fun interface TierFilter {
    fun accept(tier: String): Boolean
}

class TicketOffice {
    // 演示 Java 调用时可以传 lambda 的接口参数
    fun filter(tiers: List<String>, f: TierFilter): List<String> =
        tiers.filter { f.accept(it) }
}
```

```java
// Java 侧：Kotlin 的 fun interface 与普通 SAM 接口一样可以用 lambda
TicketOffice office = new TicketOffice();
List<String> vip = office.filter(
    List.of("普通票", "VIP票", "内场票"),
    tier -> tier.contains("VIP"));
System.out.println(vip); // [VIP票]
```

接口默认方法是另一个易混点：Kotlin 接口里的默认实现，老版本编译器会放进 `DefaultImpls` 合成类，Java 侧的接口实现者感知不到默认方法；需要让 Java 子类直接继承默认实现时，启用编译器选项 `-Xjvm-default=all`（新版写法为 `-jvm-default`），让 Kotlin 以真正的 Java default method 形式生成代码。

性能上 SAM 转换没有额外开销：lambda 编译为普通类或走 `invokedynamic`，与 Java lambda 机制同源。需要注意的反而是"重载歧义"——当 Java 方法有两个 SAM 参数重载时（比如同时接受 `Runnable` 与 `Callable`），Kotlin 需要显式 `Runnable { ... }` 构造器指定目标类型，纯 lambda 会报 overload resolution ambiguity，补上类型名即可。

混编时的接口设计还有一条经验法则：跨语言边界的接口尽量"窄而稳"。Java 老代码依赖的 Kotlin 接口，参数与返回值用 `String`、`Int`、`List` 这类映射关系简单的类型，避开 `Pair`、解构声明、内联类等 Java 看不懂的形态；需要复杂数据时，宁可拆成多个简单方法，也不要让 Java 侧被迫"翻译"Kotlin 习语。

## 5. 混编工程的配置与陷阱

Gradle 上使用 `kotlin-android` 或 `org.jetbrains.kotlin.jvm` 插件即可混编：Java 与 Kotlin 源码可以放在同一模块互相调用，Kotlin 编译时会先解析 Java 源码获得类型信息。工程层面的注意点有四个：其一，Kotlin 与 Java 的目标版本要一致，`jvmTarget` 必须与 Java `sourceCompatibility`/`toolchain` 对齐，否则出现 `Inconsistent JVM-target compatibility` 错误；其二，依赖方向上"Kotlin 调 Java"永远畅通，而 Java 调 Kotlin 在同一模块内依赖增量编译的双阶段机制，个别结构（如 Java 类被 Kotlin 顶层扩展函数引用）可能触发额外重编译；其三，kapt 注解处理器体系同样服务于混编（如让 Java 注解处理器处理 Kotlin 代码），新工程可评估 KSP；其四，Kotlin 标准库（kotlin-stdlib）必须作为运行时依赖随包发布，否则 Java 环境运行时会找不到 `kotlin.jvm.internal` 下的类。

一个容易被忽略的映射细节是异常检查：Kotlin 没有 checked exception，Kotlin 代码抛出的异常在 Java 侧调用时不会强制捕获，必要时在 Kotlin 函数上标注 `@Throws(IOException::class)`，让 Java 编译器与调用方看到 `throws` 声明。

构建脚本之外，IDE 的"Java/Kotlin 转换"与字节码查看器（Kotlin 侧用 Tools 菜单里的 Show Kotlin Bytecode 再反编译）是排查映射问题的两把利器：看不懂 Java 为什么调用不到某个 Kotlin 成员时，直接看生成的字节码形态，该补哪个 `@Jvm` 注解一目了然。遇到更费解的行为，还可以用 `javap` 查看 Java 侧实际生成的类与方法签名，两边的"翻译结果"对照着看，问题基本都会现形。

## 6. 集合与泛型的跨语言映射

集合与泛型的映射比标量类型更容易踩坑。Java 的 `List<String>` 到了 Kotlin 眼里是 `MutableList<String!>!`：列表本身的可空性未知，元素的可空性也未知。若 Java 方法实际约束了"元素非空"，务必在 Kotlin 侧显式收窄为 `MutableList<String>` 再使用，否则编译器无法在边界处帮你拦截 null 元素。

泛型还有两个方向性注解：Java 调用 Kotlin 的协变参数时，Kotlin 默认生成通配符 `? extends T` 以贴近 Java 习惯；若 Java 侧因此出现"无法传入精确类型"的编译错误，用 `@JvmSuppressWildcards` 关闭通配符生成。反过来想让 Java 看到带通配符的签名时（序列化框架常需要），用 `@JvmWildcard` 主动补上。

```kotlin
// 曲库仓库：演示泛型通配符的控制
class PlaylistRepo {
    // Java 侧看到 List<? extends Song>：可传子类集合
    fun all(): List<@JvmWildcard Song> = emptyList()

    // Java 侧看到 List<Song>：要求精确类型时使用
    fun exact(): List<@JvmSuppressWildcards Song> = emptyList()
}

// 歌曲数据类
data class Song(val title: String)
```

跨语言泛型的总原则：**类型信息在边界处最容易丢失，能显式就不依赖推断**。把"边界类型"想清楚（是否可空、是否协变、是否通配），混编工程的大半疑难杂症都能提前化解。另外建议在混编模块里维护一份"边界 API 清单"，列出所有跨语言调用的签名与可空性约定，新人上手与排查问题都靠它。

## 易错点与最佳实践

**错误一：把平台类型当非空类型用。**

```kotlin
// 错误：Java 返回值可空，直接按非空使用，运行时 NPE
val tier: String = gateway.findTier(id)
println(tier.length)

// 修正：显式按可空处理，或给 Java 代码补 @Nullable 注解让编译器把关
val tier: String? = gateway.findTier(id)
println(tier?.length ?: "未开票")
```

**错误二：Java 调伴生对象忘了 `@JvmStatic`。**

```java
// 错误：链式穿越 Companion，冗长且暴露实现细节
int limit = ConcertTicket.Companion.limit();

// 修正：Kotlin 侧给方法加 @JvmStatic，Java 侧按普通静态方法调用
int limit2 = ConcertTicket.limit();
```

**错误三：默认参数函数没有 `@JvmOverloads`，Java 侧被迫全参数调用。**

```java
// 错误：Kotlin 的 book() 有默认参数，Java 只能看到完整签名
office.book("上海", 1, "普通票");

// 修正：Kotlin 函数加 @JvmOverloads，Java 侧获得全部重载
office.book("上海");
```

**错误四：Kotlin 扩展函数在 Java 里找不到。**

```kotlin
// Kotlin 侧：SongExt.kt 中的扩展函数
package com.fandex.music

fun Song.titleWithSinger(): String = "$title - $singer"
```

```java
// 错误：song.titleWithSinger() 编译不过——扩展函数本质是静态方法
// 修正：通过文件类调用，把接收者作为第一个参数
import static com.fandex.music.SongExtKt.titleWithSinger;

String s = titleWithSinger(song);
```

**错误五：`is` 前缀属性在 Java 侧的命名歧义。**

```kotlin
// Kotlin 侧：属性名以 is 开头
class ConcertInfo {
    var isActive: Boolean = true   // Java 侧看到的是 isActive()/setActive()
}
```

```java
// Java 侧：属性名是 isActive，但 setter 会把 is 换成 set
ConcertInfo info = new ConcertInfo();
info.setActive(false);       // 正确：setter 名为 setActive
// info.setIsActive(false);  // 错误：不存在 set.isActive 方法
```

规则是：Kotlin 属性以 `is` 开头时，getter 保持原名 `isActive()`，setter 把 `is` 替换成 `set` 得到 `setActive()`；再叠加 Java 传统的 `isXxx` getter 约定，双向映射最绕的一处就是它，跨语言 API 设计应尽量避免 `is` 前缀命名。

## 本篇小结

- Kotlin 调 Java 的核心风险是平台类型 `T!`：可空性未知，赋给非空变量可能运行时 NPE；防御靠显式可空声明、安全调用，以及给 Java 源补 `@Nullable`/`@NotNull` 注解。
- Java 的 `getXxx`/`setXxx` 映射为 Kotlin 属性语法，Boolean 的 `isActive`/`setActive` 对应属性 `active`，动词方法不参与映射。
- Java 调 Kotlin 要主动控制编译形态：`@file:JvmName` 改顶层函数宿主类名，`@JvmStatic` 消除 `Companion` 中转，`@JvmField` 暴露字段，`const val` 天然是静态常量，`@JvmOverloads` 生成默认参数重载。
- Kotlin 调 Java 接口天然支持 SAM lambda；Java 调 Kotlin 需要显式 `fun interface`；Kotlin 接口默认方法要真正暴露给 Java 需 `-Xjvm-default=all`。
- 混编工程要保证 `jvmTarget` 与 Java 版本一致、带上 kotlin-stdlib 依赖；Kotlin 无 checked exception，跨语言抛异常用 `@Throws` 声明。

## 动手实践

1. **网关加固**：给第 1 节的 Java `TicketGateway` 逐一加上 `@Nullable`/`@NotNull` 注解，重新编译 Kotlin 调用方，观察哪些原本"能编译"的用法变成了编译错误。思路：重点看返回值与参数两侧注解对平台类型推断的影响。
2. **工具类重塑**：把一段 Kotlin 顶层工具函数（含一个默认参数函数）从 `XxxKt` 类名改为 `MusicUtils`，并让 Java 侧可以以最少参数调用。思路：组合使用 `@file:JvmName` 与 `@JvmOverloads`，写一个 Java main 验证全部重载。
3. **SAM 双向验证**：定义一个 Kotlin `fun interface` 与一个 Java `Comparator` 使用场景，分别在 Kotlin 与 Java 侧用 lambda 调用对方语言定义的接口，记录哪一侧需要 `fun interface`、哪一侧开箱即用。思路：Java 侧所有 SAM 接口对 Kotlin lambda 开放；Kotlin 接口必须显式 `fun interface` 才能被 Java lambda 实现。
