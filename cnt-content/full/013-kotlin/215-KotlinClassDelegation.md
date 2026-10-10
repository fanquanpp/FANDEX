---
order: 240
title: 类委托：把装饰器模式交给编译器
description: Kotlin 类委托（by）的教学：编译器生成的转发机制、与属性委托同词不同理、覆盖优先于委托的规则、装饰器与组合优于继承的工程实践，附生成代码分析实验与面试题思路。
module: 'kotlin'
category: 后端技术
difficulty: intermediate
author: fanquanpp
updated: '2026-10-11'
related:
  - 'kotlin/210-DelegateProperty'
  - 'kotlin/050-KotlinClassObject'
  - 'kotlin/090-ExtensionFunction'
  - 'kotlin/530-KotlinKoin'
prerequisites:
  - 'kotlin/050-KotlinClassObject'
  - 'kotlin/210-DelegateProperty'
---

## 前置知识

- 会写接口与实现类、理解「组合优于继承」这句话（[类与对象](/kotlin/050-KotlinClassObject)
  的继承一节）；
- 见过 `by lazy`（[委托属性](/kotlin/210-DelegateProperty)）。**同词不同理**：
  属性委托的 `by` 委托的是「属性的读写」，本篇的 `by` 委托的是「整个接口的实现」，
  两套机制只在关键字上撞了车。

## 学习目标

读完本文你将能够：

1. 用「编译器替你生成转发方法」模型解释类委托的全部行为；
2. 手写一个装饰器并翻译成 `by` 版本，说清省掉了什么；
3. 说出「覆盖优先于委托」规则及其带来的三种典型组合；
4. 判断一个场景该用继承、组合手写还是类委托。

预计 30 到 50 分钟。

## 概念引入：装饰器的样板税

给一个已有实现叠加横切能力（日志、缓存、指标、鉴权），Java 的标准答案是装饰器
模式——但它收「样板税」：

```kotlin
interface UserRepository {
    fun find(id: Long): String?
    fun save(user: String)
    fun delete(id: Long)
    fun count(): Int
}

// 手写装饰器：4 个方法转发，只有 1 行是真业务
class LoggingUserRepo(
    private val inner: UserRepository,
) : UserRepository {
    override fun find(id: Long): String? {
        println("find($id)")
        return inner.find(id)
    }
    override fun save(user: String) {
        println("save($user)")
        inner.save(user)
    }
    override fun delete(id: Long) {
        println("delete($id)")
        inner.delete(id)
    }
    override fun count(): Int {
        println("count()")
        return inner.count()
    }
}
```

接口一改，每个装饰器都要跟着改——转发代码是纯机械劳动。Kotlin 把它交给编译器：

```kotlin
class LoggingUserRepo(
    private val inner: UserRepository,
) : UserRepository by inner {
    // 只覆盖真正关心的方法；其余 find/delete/count 由编译器自动转发给 inner
    override fun save(user: String) {
        println("save($user)")
        inner.save(user)
    }
}
```

`: 接口 by 表达式` 读作「这个接口的实现，除我覆盖的方法外，全部转发给表达式求值
出的那个对象」。接口加方法，无需动这个类——样板税清零。

## 心智模型：编译器替你写了一遍手写版

类委托没有魔法，它生成的代码与手写装饰器**一字不差**：对接口中每个未被覆盖的
成员，生成一个 `override fun xxx(...) = inner.xxx(...)`。由此可以推出全部规则：

| 现象 | 从模型推出 |
| --- | --- |
| 覆盖过的方法不再转发 | 你已经手写了它，编译器不重复生成 |
| 委托目标在构造时确定且不可换 | 生成的转发代码引用的是构造参数那个实例 |
| 被转发的成员里 `this` 是委托目标 | 转发就是把调用原样递给 inner，不经过外层 |
| 只能委托接口 | Kotlin 没有类到类的委托——「继承谁」仍在，只是实现被外包 |
| 可以同时委托多个接口 | 每个接口独立生成一组转发：`: X by a, Y by b` |

**「覆盖优先于委托」**是唯一要背的规则，其余全是它的推论。三种典型组合：

```kotlin
interface Repo { fun find(id: Long): String?; fun count(): Int }

// 组合 1：全转发——透明装饰（纯旁路，如空实现、转发桩）
class PassthroughRepo(inner: Repo) : Repo by inner

// 组合 2：覆盖少数——横切装饰（日志/缓存/指标，最常见）
class CachedRepo(private val inner: Repo) : Repo by inner {
    private val cache = mutableMapOf<Long, String?>()
    override fun find(id: Long): String? =
        cache.getOrPut(id) { inner.find(id) }
}

// 组合 3：覆盖多数——委托只兜底（用一个默认实现兜住未覆盖的方法）
class TestRepo(private val real: Repo) : Repo by real {
    override fun find(id: Long): String? = "test-user"   // 其余仍走 real
}
```

## 与属性委托的关系：同一个关键字，两套机制

| 维度 | 属性委托（210 篇） | 类委托（本篇） |
| --- | --- | --- |
| 委托对象 | 一个属性的读/写 | 一组接口方法的实现 |
| 协议 | `getValue`/`setValue` 操作符 | 接口转发（编译器直接生成） |
| 典型写法 | `val db by lazy { connect() }` | `class A : Api by impl` |
| 目标 | 惰性、可观察、可映射的**属性** | 装饰、组合、兜底的**行为** |

两者唯一的交集是 `by` 这个关键字。看到 `by` 先问一句「委托的是属性还是接口」，
就能归对门类。

## 常见场景

### 测试替身：包住真实现，只覆盖关心的方法

```kotlin
class FakeClock(private val system: Clock) : Clock by system {
    var frozen: Instant? = null
    override fun now(): Instant = frozen ?: system.now()   // 冻结时间可注入
}
```

### 功能开关：同一份实现按配置切换

```kotlin
interface PaymentGateway { fun charge(cents: Int): Boolean /* ... */ }

class PaymentRouter(
    private val real: PaymentGateway,
    private val sandbox: PaymentGateway,
    useSandbox: Boolean,
) : PaymentGateway by (if (useSandbox) sandbox else real)
// 委托表达式可以是任意表达式：在构造时求值一次，选出真正的受托者
```

### 组合多个能力（模拟多继承）

```kotlin
class SmartSpeaker(
    audio: AudioDevice,
    voice: VoiceEngine,
) : AudioDevice by audio, VoiceEngine by voice
// SmartSpeaker 同时「是」音响与语音引擎，而无需继承两个具体类（Kotlin 不允许）
```

## 常见陷阱

1. **覆盖时忘了通过受托者访问**：被覆盖方法里直接写自己的字段而绕过 `inner`，
   装饰层与内层状态各说各话。装饰器的纪律：**覆盖方法里只做横切逻辑，业务调用
   一律转给 inner**。
2. **把类委托当继承用**：转发成员里 `this` 是受托者，访问不到外层的 protected
   状态与 open 方法；需要「改行为还要共享状态」的场景，继承或显式组合更合适。
3. **对同一接口既委托又部分覆盖时的心智负担**：读者必须逐个方法确认「这个调用
   走装饰层还是受托者」。装饰链长时（A 包 B 包 C），排查问题要按洋葱层一层剥。
4. **委托目标的生命周期**：受托者是构造时求值的普通引用。若它是可变的（如
   `var` 属性），类委托**不会**跟着换——转发代码在编译期就绑定到了构造参数。
   要运行期换实现，请显式组合（自己持有 `var inner` 并转发）。
5. **与 DI 框架的配合**：Koin/Spring 注入的是实现类型，装饰器本身也要注册成
   可注入组件，否则会出现「绕过装饰器直接拿到内层」的半生效状态。

## 面试题思路

1. 「Kotlin 的类委托是怎么实现的？」——答编译器生成转发：对接口中每个未被覆盖
   的成员生成一个调用受托者的 override 方法，字节码层面与手写装饰器等价、零
   运行时开销（没有反射、没有动态代理）。能顺手写出等价的手写 Java 装饰器是
   加分项。
2. 「类委托和继承怎么选？」——继承表达 **is-a 且要共享/扩展基类实现**；类委托
   表达「实现外包给一个可替换的对象」，不引入对具体类的耦合（只依赖接口）、
   受托者可按构造参数切换。反问「需要访问 protected 状态吗」即可定案。
3. 「属性委托和类委托的区别？」——按上文对照表作答，落脚在「属性 vs 行为、
   getValue 协议 vs 生成转发」两条主线；混淆两者的候选人通常没有真正写过
   `provideDelegate` 或装饰器，这一问实际在考「是否用过」。

## 动手实验

1. **生成代码对照**：手写一遍 4 方法的 `LoggingUserRepo`（本文开头的样板版），
   再写 `by` 版，反编译两者（IDE 的 Kotlin Bytecode 窗口或 `javap -p`），对比
   生成的转发方法——验证「编译器替你写了样板」的说法。
2. **this 归属实验**：受托者实现里打印 `this::class.java.simpleName`，外层再
   覆盖一个方法打印外层类名；调用两个方法，确认转发成员里 `this` 是受托者、
   覆盖成员里是外层。
3. **构造期求值实验**：把委托表达式写成 `if (flag) a else b`，运行期改变 flag
   再调用——确认受托者在构造后不再改变。
4. **装饰链实验**：写 Logging 包 Cached 包 Real 三层，故意在 Cached 的 find 里
   直接返回而不调 inner，制造「缓存永远不落库」的 bug，用断点体会「洋葱剥层」
   的排查路径。

## 小练习（先自己做，再展开参考实现）

**练习 1：缓存装饰器**。给 `interface WeatherApi { fun temp(city: String): Double }`
写一个 `CachedWeatherApi`：相同 city 在 60 秒内直接返回缓存（提示：缓存值要带
时间戳，`Map<String, Pair<Long, Double>>`），其余行为完全转发。

参考实现：

```kotlin
import java.time.Clock

class CachedWeatherApi(
    private val inner: WeatherApi,
    private val clock: Clock = Clock.systemUTC(),
) : WeatherApi by inner {                       // 未覆盖的成员（若有）自动转发

    private val cache = mutableMapOf<String, Pair<Long, Double>>()
    private val ttlMs = 60_000L

    override fun temp(city: String): Double {
        val now = clock.millis()
        cache[city]?.let { (ts, v) ->
            if (now - ts < ttlMs) return v      // 命中且未过期
        }
        return inner.temp(city).also { cache[city] = now to it }
    }
}
```

自检问题：`by inner` 在这里转发了什么？（答：WeatherApi 的其他成员——本例只有
temp 一个方法，所以转发集合为空；接口一旦扩展新方法，这个类**不改一行代码**
就自动获得转发，这正是类委托相对手写装饰器的核心价值。）

**练习 2：把继承改造成类委托**。给定继承版：

```kotlin
open class BaseRepo { open fun find(id: Long): String? = db[id]; /* ... */ }
class AuditedRepo : BaseRepo() {
    override fun find(id: Long) = super.find(id).also { log(it) }
}
```

问题：AuditedRepo 与 BaseRepo 的具体实现绑死，无法包住另一个实现。改写成基于
`interface Repo` + 类委托的版本，保持审计行为。

参考实现：

```kotlin
interface Repo { fun find(id: Long): String? }

class DbRepo : Repo {
    override fun find(id: Long): String? = db[id]
}

class AuditedRepo(private val inner: Repo) : Repo by inner {
    override fun find(id: Long): String? = inner.find(id).also { log(it) }
}

// 调用方只依赖 Repo 接口，DbRepo 可换成任意实现：
val repo: Repo = AuditedRepo(DbRepo())
```

**挑战题（不给参考实现）**：用类委托实现一个「指标装饰器链」：
`MetricsRepo`（统计每个方法调用次数）包住 `CachedRepo` 包住 `DbRepo`，要求
指标能区分「命中缓存」与「打到数据库」。写完自查：指标装饰器怎么知道内层
是缓存？（提示：这个需求暴露了纯透明装饰的边界——横切关注点需要领域信号时，
要么让接口自己暴露信号，要么放弃透明性显式组合。）

## 小结

- 类委托是编译器替你写的装饰器：`: 接口 by 对象`，覆盖优先，其余转发。
- 委托目标构造时确定、转发成员里 `this` 是受托者、只能委托接口——三条规则
  全部从「生成转发方法」模型推出。
- 属性委托管属性（getValue 协议），类委托管行为（接口转发），`by` 只是共用关键字。
- 透明装饰、测试替身、功能开关、模拟多继承是四大主场；需要运行期换实现或共享
  状态时，退回显式组合。
- 委托属性全集见 [委托属性](/kotlin/210-DelegateProperty)；依赖注入里装饰器的
  注册实践见 [Koin](/kotlin/530-KotlinKoin)。
