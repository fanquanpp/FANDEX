---
order: 60
title: data class 详解
module: 'kotlin'
category: 后端技术
difficulty: beginner
description: 自动生成的 equals/copy/解构：数据载体的最佳实践。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'kotlin/005-KotlinClassObject'
  - 'kotlin/015-SealedClassAlgebraicDataType'
  - 'kotlin/021-KotlinCollectionOperation'
prerequisites:
  - 'kotlin/005-KotlinClassObject'
---

# data class 详解

平台里最不缺的就是"纯数据"：一首歌有标题、歌姬、时长、应援色；一张门票有粉丝、场次、票档；一个粉丝团有团名、应援等级。这些类型没有复杂行为，却需要正确的 `equals`、好读的 `toString`、顺手可用的复制与解构。如果每写一个实体就手写一遍这些方法，既冗长又容易出错。Kotlin 的 `data class` 用一个关键字替你生成全部样板，本篇把它的生成物、使用规则、约束条件与选型边界一次讲清。

## 前置知识

- [Kotlin 类与对象](/kotlin/005-KotlinClassObject)：主构造函数、属性与 val/var 的基本语法。
- [Kotlin 基础语法](/kotlin/003-KotlinBasicSyntax)：变量、函数与判等的语言基础。
- [集合操作](/kotlin/021-KotlinCollectionOperation)：数据类最常见的去处是集合，理解容器判等有助于本篇实践。

## 学习目标

- 说出 data class 自动生成的成员清单，以及"只有主构造函数中的属性参与生成"这条铁律；
- 熟练使用 `copy` 配合具名参数做不可变更新，并理解浅拷贝的边界；
- 会用解构声明与 `componentN` 拆开数据对象，包括在 lambda 参数中直接解构；
- 掌握 data class 的四条约束，能解释它们与生成成员之间的关系；
- 能在数据类、普通类、密封类（含 `data object`）之间做出正确选型。

## 1. 一个关键字生成了什么

先看对比：同样表示一首歌，普通类要手写一堆方法，数据类只需声明属性。

```kotlin
// 歌曲数据类：主构造函数中的三个属性是全部"数据"
data class Song(
    val title: String,      // 歌曲名
    val singer: String,     // 主唱歌姬
    val durationSec: Int,   // 时长（秒）
)

fun main() {
    val song = Song("千本樱", "初音未来", 273)
    println(song) // Song(title=千本樱, singer=初音未来, durationSec=273)

    // 两个内容相同的实例
    val a = Song("Melt", "初音未来", 257)
    val b = Song("Melt", "初音未来", 257)
    println(a == b)  // true：内容相等（调用生成的 equals）
    println(a === b) // false：引用不等，是两个对象
    println(a.hashCode() == b.hashCode()) // true：hashCode 与 equals 保持一致
}
```

编译器为 data class 自动生成四组成员：`equals()` 与 `hashCode()`（基于主构造属性）、`toString()`（形如 `Song(title=..., ...)`）、`copy()`（按组件逐个复制）、`component1()` 到 `componentN()`（按属性顺序编号，供解构使用）。需要强调铁律：**参与生成的只有主构造函数里声明的属性**，在类体中额外定义的属性一律不参与 `equals`、`hashCode`、`toString` 与 `copy`。顺带一提，`toString` 的输出格式是稳定契约，很多日志解析直接依赖它；若要自定义输出（比如隐藏敏感字段），可以覆盖 `toString`，但要保证与 `equals` 的语义仍然自洽。

## 2. copy 与具名参数：不可变更新

数据类属性建议全部声明 `val`，那么"修改"怎么做？答案是生成一个新对象。`copy` 的每个参数都默认取当前值，配合具名参数可以只覆盖想改的字段：

```kotlin
data class Song(
    val title: String,
    val singer: String,
    val durationSec: Int,
    val themeColor: String, // 应援色
)

fun main() {
    val original = Song("千本樱", "初音未来", 273, "#39C5BB")

    // 复制并只改标题：其余字段原样带过去
    val remastered = original.copy(title = "千本樱(2026重制版)")
    println(remastered) // Song(title=千本樱(2026重制版), singer=初音未来, durationSec=273, themeColor=#39C5BB)

    // 原对象不受影响：典型的不可变更新
    println(original.title) // 千本樱

    // 连续 copy 可以表达一串"状态演变"，每步都是新对象
    val renamed = original.copy(title = "千本樱·Live").copy(durationSec = 290)
    println(renamed.durationSec) // 290
}
```

这种"旧对象不变、改动生成新对象"的模式与 Kotlin 的不可变集合、`val` 优先的风格天然契合，也让并发与缓存场景（以数据对象为 key）更安全。但要注意 `copy` 是浅拷贝：若属性本身是可变对象（如 `MutableList`），新旧两个实例仍共享同一个底层集合，改一个等于改两个。

`copy` 还有一个高频配合场景是函数式风格的状态传递：把"当前状态"作为参数层层传递，每一步用 `copy` 产生新状态，替代到处 set 的可变对象。配合第 5 节的密封状态机，整条状态演变链既可追溯（每一步都是完整快照）又无共享可变状态，单元测试也只需要构造入参快照，不用先摆弄一堆 setter。

## 3. 解构声明与 componentN

每个主构造属性都会得到一个按位置编号的 `componentN()` 函数，解构声明把"取值 + 赋给变量"一次完成：

```kotlin
data class Ticket(
    val fan: String,      // 购票粉丝
    val concert: String,  // 演唱会场次
    val tier: String,     // 票档
)

fun main() {
    val ticket = Ticket("初音推", "东京场", "VIP票")

    // 解构声明：component1/2/3 依序取出，变量名随意
    val (fan, concert, tier) = ticket
    println("$fan 购买了 $concert 的 $tier") // 初音推 购买了 东京场 的 VIP票

    // 只需要部分字段时，用下划线跳过不关心的组件
    val (who, _, _) = ticket
    println(who) // 初音推

    // lambda 参数中也能直接解构，遍历 Map 的经典写法就靠它
    val stock = mapOf("普通票" to 120, "VIP票" to 30)
    for ((tierName, count) in stock) {
        println("$tierName 余量 $count")
    }
}
```

`for ((key, value) in map)` 之所以可行，正是因为 `Map.Entry` 是 Kotlin 标准库中实现了 `component1()`/`component2()` 的数据载体。解构让"拆数据"与"造数据"（具名构造）形成对称，代码读起来像在描述业务而不是操作对象。

解构与属性顺序是硬绑定的：`componentN` 按主构造参数的声明顺序编号，调整属性顺序会静默改变解构结果，这是"改字段顺序要全仓编译"的另一层原因。想降低这类隐患，可以只用部分组件并给变量起带语义的名字，或干脆用属性访问替代解构，让编译器按名字而不是按位置绑定。

最后是一条风格建议：解构适合"一次性消费"的场景（遍历、临时取值），不适合把大量组件解构后再长期使用——变量一多，来源就模糊了。代码评审可以把"解构组件不超过三个"当作软性约定，超出时改用具名属性访问，可读性立即回升。

## 4. 四条约束与背后的原因

data class 有四条编译期约束，每一条都与自动生成机制相关：

1. **主构造函数至少有一个参数**——没有数据就没有生成 `equals`/`copy` 的依据；
2. **主构造参数必须全部是 `val` 或 `var`**——`componentN` 与 `copy` 依赖属性而非普通参数；
3. **不能被 `abstract`、`open`、`sealed`、`inner` 修饰**——生成的 `equals` 精确比对运行时类型，继承会引入"父类字段不参与判等"的矛盾；`data object`（Kotlin 1.9+）则专用于密封体系中无参单例的形态；
4. **`componentN` 与 `copy` 无法在子类中"覆盖"**——它们按位置生成，子类同名函数只会遮蔽（shadow）父类的，造成语义混乱。

```kotlin
// 合法定义：全部参数是 val，至少一个参数
data class FanClub(
    val name: String,     // 粉丝团名称
    val level: Int,       // 应援等级
) {
    // 类体里可以有普通属性与方法，但它们不参与 equals/hashCode/toString/copy
    var joinedAt: Long = System.currentTimeMillis()
    fun cheer() = println("$name 全员应援！")
}

fun main() {
    val a = FanClub("青之应援团", 3)
    val b = FanClub("青之应援团", 3)
    println(a == b) // true：joinAt 不同也不影响，因为不在主构造里
}
```

第三条约束正是第 6 节要展开的经典坑：数据类之间判等只会看主构造属性，继承与数据类的组合需要格外小心。

## 5. 数据类、普通类与密封类怎么选

三者的分工可以用一张表概括：

| 类型 | 适用场景 | 平台例子 |
| --- | --- | --- |
| `data class` | 纯数据载体，值语义，需判等/复制/解构 | `Song`、`Ticket`、API 响应体 |
| 普通类 | 有内部状态与行为约束，或需要继承体系 | 播放器、连接池、动画控制器 |
| `sealed class` / 接口 | 取值集合有限且编译期可枚举 | `PurchaseResult`、订单状态 |
| `data object` | 密封体系中的无参单例状态 | `SoldOut`、`Loading` |

`data object` 值得一提：它是"数据类"与"object 单例"的结合体，自动生成带对象名的 `toString`，专门用于密封类中不需要携带数据的分支，让日志输出 `Loading` 而不是 `com.example.Loading@1b6d3586`：

```kotlin
// 密封接口表达播放器状态，分支为 data object 或 data class
sealed interface PlayerState {
    data object Idle : PlayerState            // 空闲：无数据，用 data object
    data object Buffering : PlayerState       // 缓冲中
    data class Playing(val song: String, val positionSec: Int) : PlayerState // 播放中：携带数据
}

fun describe(state: PlayerState): String = when (state) {
    PlayerState.Idle       -> "待机中"
    PlayerState.Buffering  -> "正在缓冲"
    is PlayerState.Playing -> "正在播放 ${state.song}（${state.positionSec}s）"
}

fun main() {
    println(describe(PlayerState.Buffering))           // 正在缓冲
    println(PlayerState.Playing("Melt", 42))           // Playing(song=Melt, positionSec=42)
}
```

选型口诀：**这东西的"值"相同就算"相等"吗？** 是，用 `data class`；它有身份、有生命周期，用普通类；它的取值能数得过来，用密封体系搭配 `data class` / `data object`。

还有一条工程层面的提醒：数据类是值语义的载体，放进 `Set`、`HashSet` 或用作 `Map` key 之前，先确认它的属性在生命周期内不再变化；把内容可变的数据类当 key，修改后同样会"找不到自己"。真有可变字段需求时，要么拆出不可变的快照类做 key，要么改用普通类并手工定义身份判等。

## 6. equals 的边界：两个经典陷阱

第一个陷阱：不同类之间即使属性完全相同，`equals` 也恒为 false，因为生成实现会先做运行时类型精确比较；第二个陷阱：继承自带属性的父类时，父类字段不参与判等。

```kotlin
// 陷阱演示
open class Base(val id: Int)
data class Song2(val title: String, val id: Int) : Base(id) // 错误示范：继承携带数据的父类

fun main() {
    // 陷阱一：不同类型，内容相同也不相等
    val t1 = Ticket("初音推", "东京场", "VIP票")
    val other = Any()
    println(t1.equals(other)) // false：类型检查先行

    // 陷阱二：Base 的 id 不参与 Song2 的 equals
    val s1 = Song2("千本樱", 101)
    val s2 = Song2("千本樱", 102)
    println(s1 == s2) // true：只比了 title，id 被无视——业务上很可能就是 bug
}
```

修正方式是"组合优于继承"：把公共字段下沉为数据类自己的属性，或用密封接口（不携带字段）约束类型集合，让数据类只对自己的主构造字段负责。

## 7. 反编译视角：生成的代码长什么样

把数据类编译后反编译成 Java，能看清生成物的真实结构：主构造函数按序赋值；每个属性有 getter（`val` 无 setter）；`componentN` 就是简单返回对应字段；`copy` 调用主构造函数并传入"默认取当前值"的参数；`equals` 先比较引用、再比较运行时类型、最后逐字段比较；`toString` 按固定格式拼接。

```kotlin
// 反编译等价示意（节选）：以 data class Ticket(fan, tier) 为例
class Ticket(private val fan: String, private val tier: String) {
    // componentN：按位置返回字段，解构声明的真实依据
    val component1: String get() = fan
    val component2: String get() = tier

    // copy：每个参数默认取当前值，构造新实例
    fun copy(fan: String = this.fan, tier: String = this.tier) = Ticket(fan, tier)

    // equals：引用比较 -> 类型精确匹配 -> 逐字段比较
    override fun equals(other: Any?): Boolean =
        this === other || (other is Ticket && other.fan == fan && other.tier == tier)

    override fun hashCode(): Int = fan.hashCode() * 31 + tier.hashCode()
    override fun toString(): String = "Ticket(fan=$fan, tier=$tier)"
}
```

两个细节值得注意：`equals` 的最后一步 `other is Ticket` 是"运行时类型精确匹配"的来源，子类实例与父类实例永不相等；`hashCode` 采用 31 进制逐字段累加，与 Java 惯例一致，因此数据类与 Java 集合可以无缝配合。看懂生成物之后，第 4 节的四条约束与第 6 节的判等边界都不再是"背规则"，而是"看得出必然"。

## 易错点与最佳实践

**错误一：把业务字段写在类体里，判等悄悄失真。**

```kotlin
// 错误：version 不在主构造里，两个"不同版本"被判成相等
data class Ticket2(val fan: String) {
    var version: Int = 1
}

// 修正：参与语义判等的字段必须进主构造
data class Ticket3(val fan: String, val version: Int)
```

**错误二：用 copy 更新引用类型属性后直接改它。**

```kotlin
// 错误：MutableList 是共享的，copy 后仍指向同一个列表
data class Setlist(val songs: MutableList<String>)
val a = Setlist(mutableListOf("Melt"))
val b = a.copy()
b.songs.add("千本樱")
println(a.songs.size) // 2：a 也被改了

// 修正：属性用不可变类型，更新时通过 copy 重建整个列表
data class Setlist2(val songs: List<String>)
val a2 = Setlist2(listOf("Melt"))
val b2 = a2.copy(songs = a2.songs + "千本樱")
```

**错误三：数据类继承携带属性的父类。**

```kotlin
// 错误：父类字段不参与 equals，判等结果违反直觉
data class Song2(val title: String, val id: Int) : Base(id)

// 修正：用密封接口（无字段）做类型约束，字段全部收进数据类自身
sealed interface Track
data class Song3(val title: String, val id: Int) : Track
```

**错误四：给有身份语义的实体套 data class。**

```kotlin
// 错误：两个内容相同的"用户会话"不应相等，用 data class 会让缓存与去重错乱
data class Session(val userId: String)

// 修正：有身份的对象用普通类，按需手写判等
class Session2(val token: String, val userId: String)
```

**错误五：并发场景把 copy 当原子操作。**

```kotlin
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.*

// 播放计数：数据类承载状态
data class PlayCounter(val played: Int = 0)

fun main() = runBlocking {
    var state = PlayCounter()

    // 错误：copy 是"读旧值-构造新值"的普通函数，两个协程并发 copy 会互相覆盖
    List(2) { launch { state = state.copy(played = state.played + 1) } }
        .forEach { it.join() }
    println(state.played) // 可能是 1 而不是 2：两次都读到旧值

    // 修正：用原子引用的 CAS 更新，读改写具备原子性
    val ref = AtomicReference(PlayCounter())
    ref.updateAndGet { it.copy(played = it.played + 1) }
    println(ref.get().played) // 1，多次并发自增也不会丢
}
```

数据类的不可变是"对象级"的，不是"操作级"的；跨线程的状态演进仍要靠并发原语兜底，`copy` 只负责生成新值，不负责读改写的原子性。

## 本篇小结

- `data class` 自动生成 `equals`/`hashCode`、`toString`、`copy`、`componentN`，且只基于主构造函数中的属性，类体属性一律不参与。
- 不可变更新靠 `copy + 具名参数`；`copy` 是浅拷贝，引用类型属性要用不可变类型承载。
- 解构声明把对象按位置拆成变量，`Map.Entry` 遍历就是它的现成应用；用下划线可跳过不需要的组件。
- 四条约束（至少一个主构造参数、参数必须 val/var、不可 abstract/open/sealed/inner、componentN 不可覆盖）都服务于生成机制的正确性。
- 选型看语义：值语义选 data class，身份语义选普通类，有限取值选密封体系；Kotlin 1.9+ 的 `data object` 是密封分支的无参单例利器。

## 动手实践

1. **应援色面板**：定义 `data class ThemeColor(val name: String, val hex: String)`，创建三个歌姬的应援色实例，用解构与 `copy` 实现"换名不换色""换色不换名"两种更新并打印。思路：`copy` 只覆盖要改的具名参数，注意打印时验证未改字段不变。
2. **去重实验**：把 5 个含重复歌名与歌姬的 `Song` 放入 `Set` 与 `List`，分别观察去重结果；再在类体中添加一个不参与判等的属性重复实验。思路：对照第 1 节的生成成员清单解释两次结果差异。
3. **播放器状态机**：按第 5 节的 `PlayerState` 增加 `Paused` 分支，要求无数据时用 `data object`、有进度时用 `data class`，并补全 `when` 分派。思路：`when` 对密封接口做穷举，漏写分支编译器会直接报错。
