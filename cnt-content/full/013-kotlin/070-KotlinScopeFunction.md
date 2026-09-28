---
order: 70
title: Kotlin 作用域函数
module: 'kotlin'
category: 后端技术
difficulty: beginner
description: 用一张"两轴选型表"学会 let/run/with/apply/also：先动手配置一个真实的数据库连接池，再讲内联零开销的原理与 this 遮蔽、嵌套地狱等坑点。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'kotlin/080-ScopeFunctionDifference'
  - 'kotlin/130-NullSafetyDetailed'
  - 'kotlin/110-KotlinCollectionOperation'
  - 'kotlin/560-KotlinDSL'
  - 'kotlin/050-KotlinClassObject'
prerequisites:
  - 'kotlin/020-KotlinOverviewEnvSetup'
  - 'kotlin/030-KotlinBasicSyntax'
  - 'kotlin/040-KotlinFunctionAndLambda'
---

## 前置知识

- [Kotlin 基本语法](/kotlin/030-KotlinBasicSyntax)：会写 val、函数调用与字符串模板；
- [函数与 Lambda](/kotlin/040-KotlinFunctionAndLambda)：知道什么是 Lambda、`it` 是什么。

## 学习目标

读完本文你将能够：

1. 说出五个作用域函数在"引用方式"与"返回值"两根轴上的位置，见到新代码能立刻认出用的哪个；
2. 用 `apply` 替代 Builder 与"变量名重复八遍"的配置代码；
3. 用 `?.let` 优雅处理可空值，用 `also` 在链式调用里插日志不打断链条；
4. 解释作用域函数为什么零开销（inline 内联），以及 this 遮蔽什么时候会咬人；
5. 按团队惯例在 apply（改状态）与 also（只做副作用）之间正确取舍。

预计 60 分钟，含 3 组动手实验与 4 道练习。五个函数的深层差异与记忆技巧在姊妹篇 [作用域函数差异详解](/kotlin/080-ScopeFunctionDifference)。

## 1. 问题引入：变量名写了八遍

假设你在写 quaver 这样的桌面工具，启动时要配置一个数据库连接池（HikariCP）。Java 风格写法：

```kotlin
val ds = HikariDataSource()
ds.jdbcUrl = "jdbc:postgresql://localhost:5432/quaver"
ds.username = "quaver"
ds.password = System.getenv("DB_PASS")
ds.maximumPoolSize = 10
ds.connectionTimeout = 30_000
```

`ds` 出现了五次，每次都只是"往同一个对象上堆配置"。这种"对同一个对象做一串操作"的代码形态在 Kotlin 里遍地都是：配置对象、初始化 View、拼 StringBuilder。作用域函数（scope functions）就是标准库给这五种场景的统一解法——**开一个临时作用域，让对象在里面少出场甚至不出场**：

```kotlin
val ds = HikariDataSource().apply {
    jdbcUrl = "jdbc:postgresql://localhost:5432/quaver"   // 隐式接收者，省略 this.
    username = "quaver"
    password = System.getenv("DB_PASS")
    maximumPoolSize = 10
    connectionTimeout = 30_000
}
```

功能完全一样，`ds` 只出现一次，配置项像一张清单一样竖着排。这就是作用域函数的全部动机：不是新能力，是同一件事的更好读法。

## 2. 一张表记住五个函数

五个函数只差两个开关。横轴是**块内怎么引用对象**（`it` 显式参数 / `this` 隐式接收者），纵轴是**整个表达式返回什么**（对象本身 / 块的最后一行）：

| 函数 | 块内引用 | 返回值 | 一句话定位 |
| ---- | -------- | ------ | ---------- |
| `apply` | `this`（可省略） | 对象本身 | 配置对象，配完还给你 |
| `also` | `it` | 对象本身 | 顺手做点副作用，不打断链条 |
| `let` | `it` | 块结果 | 空安全处理、链式转换 |
| `run` | `this`（可省略） | 块结果 | 对象上做一段计算并拿结果 |
| `with` | `this`（可省略） | 块结果 | 同 run，但对象写在前面（非扩展函数） |

先记两个"返回对象本身"的（apply、also，结尾字母 a——as-is，原样奉还），剩下三个都返回块结果。再记引用方式：apply/run/with 用 this（配置属性时能省略前缀，最适合"堆配置"），let/also 用 it（显式、无歧义，适合"把对象当参数"）。

签名贴出来供对照（都标记了 inline，见第 4 节）：

```kotlin
inline fun <T, R> T.let(block: (T) -> R): R          // it, 返回块结果
inline fun <T, R> T.run(block: T.() -> R): R         // this, 返回块结果
inline fun <T, R> with(receiver: T, block: T.() -> R): R  // 同 run，普通函数
inline fun <T> T.apply(block: T.() -> Unit): T       // this, 返回对象本身
inline fun <T> T.also(block: (T) -> Unit): T         // it, 返回对象本身
```

## 3. 动手做：五个函数各干一件事

### 3.1 apply：配置对象

除了 3.0 节的连接池，Java 标准库对象是重灾区：

```kotlin
val props = Properties().apply {
    setProperty("url", "jdbc:postgresql://localhost/quaver")
    setProperty("user", "quaver")
    setProperty("password", "secret")
}
```

它也常被用来替代 Builder：Google 官方 Android 文档里的 `Intent().apply { action = ...; data = ... }` 就是教科书案例。自己写的类里，Builder 的每个 `return this` 方法都可以省掉，直接暴露 var + apply。

### 3.2 also：链中插桩

`also` 返回对象本身，所以能塞进任何链式调用的中间而不断链——这是它与 apply 在用法上的核心分工：

```kotlin
val request = HttpRequest.newBuilder(URI.create(url))
    .also { log.debug("请求 {}", it.uri()) }     // it 显式，一眼看出在操作谁
    .header("Authorization", token)
    .also { require(it.header().isNotEmpty()) }  // 顺手校验
    .build()
```

### 3.3 let：空安全的标配搭档

`?.let` 是 Kotlin 空处理最常见的组合拳：只有非空才执行块，块内 `it` 是非空类型：

```kotlin
val user: User? = findUser(id)

// Java 式写法不是不行，但 ?.let 把"非空才做"压缩成一行
user?.let { sendWelcomeEmail(it.email) }

// 与 Elvis 组合：非空转换，空则给默认
val displayName: String = user?.let { "${it.lastName} ${it.firstName}" } ?: "访客"
```

### 3.4 run 与 with：算个结果

两者等价，区别只是对象写在哪边。适合"在对象上做多步计算，最后要个结果"：

```kotlin
val summary = with(scores) {
    val avg = average()
    "共 ${size} 题，均分 ${"%.1f".format(avg)}"
}

// run 的扩展形式还能直接接在对象后面
val lineCount = File("answers.txt").run {
    if (exists()) readLines().size else 0
}

// 不接收对象的 run 也是合法的：一个临时作用域，中间变量不外泄
val report = run {
    val temp = loadRawStats()     // temp 在块外不可见，不污染外部作用域
    temp.filter { it > 0 }.sum()
}
```

实验一：把第 1 节的 Hikari 配置分别用 `also`（全部 `it.` 前缀）和 `with` 改写一遍，编译运行确认结果一致，然后体会三种写法里哪种"清单感"最好——选型是口味问题，先知道它们等价。

实验二：把下面的命令式代码改写成"apply + 集合操作"，运行对比输出：

```kotlin
val playlist = mutableListOf<String>()
playlist.add("Melt")
playlist.add("Rolling Girl")
playlist.shuffle()
println(playlist)
```

## 4. 为什么敢到处用：inline 零开销

五个函数全部是 `inline`：编译器把函数体和 Lambda 体直接展开到调用处，不创建 Lambda 对象、没有函数调用开销。所以：

```kotlin
val sb = StringBuilder().apply {
    append("a")
    append("b")
}
```

字节码与手写的 `val sb = StringBuilder(); sb.append("a"); sb.append("b")` 等价。性能敏感的热路径也照用不误。唯一的例外：Lambda 捕获了外部 `var` 变量时，编译器要把它包装成 Ref 对象（闭包的老规矩），循环百万次才需要在意——那种场合用 `fold` 或普通 for 循环即可。

正因为零开销，Kotlin 生态的 DSL（Gradle Kotlin DSL、Ktor 路由、kotlinx.html）大量以"带接收者的 Lambda"（`T.() -> Unit`，apply/run/with 的块类型）为地基。你在 `build.gradle.kts` 里写的每一层大括号，本质上都是本篇的语法。

## 5. 坑点一：this 遮蔽

用 this 的三个函数（apply/run/with）把隐式接收者换了人。块内写 `name` 时，它到底是谁的 name？

```kotlin
class QuizApp {
    val title = "Quaver"

    fun buildWindow() {
        Window().apply {
            setTitle(title)        // 险：这个 title 是 Window 的（若有），不是 QuizApp 的
            setTitle(this@QuizApp.title)  // 想用外层的必须显式限定
        }

        // 若 Window 没有同名字段，title 才会"漏"到外层——行为对但读者懵
    }
}
```

规则：**块内要同时用"外面的成员"和"对象自己的成员"时，改用 let/also**，让 `it` 与 `this` 各司其职：

```kotlin
Window().also { w ->
    w.setTitle(title)   // title 无歧义地指 QuizApp 的
}
```

嵌套 DSL 里的解法是标签限定 `this@Outer`，但那是 DSL 作者的义务；日常业务代码选 it 版本省心得多。

## 6. 坑点二：let 嵌套地狱

`?.let` 好用，但一层套一层就是灾难：

```kotlin
// 反模式：四层 let，读的人要在脑子里维护一个栈
val city = user?.let { u ->
    u.address?.let { addr ->
        addr.city?.let { c ->
            c.name?.let { it.uppercase() }
        }
    }
}

// 正解：安全调用链一行解决
val city = user?.address?.city?.name?.uppercase()
```

判断标准：块里**只有一行对 it 的安全调用**时，let 是多余的，`?.` 链就够了。let 真正的用武之地是"非空才执行的**语句**"（发邮件、写库、弹窗）和"需要拿块结果"的转换。多层结构里用 `?.let` 只在最外层做一次，内层交给安全调用链。

## 7. 坑点三：apply 与 also 的分工默契

编译器不拦着你用 `also` 改对象状态，但团队约定值得遵守，因为读者靠函数名预测意图：

```kotlin
// 约定俗成：apply 改状态，also 只做副作用
list.apply { add(4); add(5) }              // "我在配置这个对象"
list.also { log.info("size=${it.size}") }  // "我只是路过打个日志"
```

在 `also` 里偷偷改对象，等于让读者以"只读副作用"预期读到了变更逻辑，评审时通常会被打回。同理，`apply` 里塞十行业务计算也不合适——那是 `run` 的地盘。

自查口诀：**改对象用 apply，打日志用 also，空检查用 let，要结果用 run/with**。选错不报错，但代码会"读起来怪"。

## 易错点与最佳实践

**错误一：能一行安全调用链解决却写嵌套 let。** 见第 6 节。
**错误二：在 apply/with/run 的 this 块里引用外层同名字段而不自知。** 见第 5 节；同时访问双方时换 let/also。
**错误三：在 also 里改对象、在 apply 里做计算。** 违反命名意图，换回各自地盘。
**错误四：`?.let { it.xxx }` 里再写 `it?.xxx`。** `?.let` 已保证 it 非空，多余的 `?.` 是噪音。
**错误五：循环里 `list.add(Config().apply {...})` 三行套一层。** 用 `map` 表达"一批对象从一批输入生成"更直白。
**最佳实践**：嵌套不超过两层；Lambda 块超过十行就提取成具名函数（扩展函数形式还能保留接收者语法）；不确定用哪个时先写显式 val 中间变量——清晰永远优先于炫技，作用域函数是可读性工具，不是必需品。

## 本篇小结

- 两轴定位：apply/also 返回对象本身（链式友好），let/run/with 返回块结果；apply/run/with 用 this（省前缀），let/also 用 it（无歧义）；
- `?.let` 处理"非空才执行"，但单行安全调用时 `?.` 链更短；
- inline 保证零开销，热路径随便用；DSL 的地基正是"带接收者的 Lambda"；
- this 遮蔽是 this 系函数的最大风险，块内外成员都用时改用 it 系；
- 团队默契：apply 改状态、also 打日志，选错不报错但伤可读性。

## 动手实践

1. **连接池重构**：把第 1 节的 Hikari 配置补齐 `maxLifetime` 与 `poolName` 两个字段，并在链尾用 `also` 打一条"数据源已创建: $poolName"日志。思路：一个表达式完成，中间不出现两次变量名。
2. **捉 this**：定义 `class A { val name = "A"; fun test() { B().apply { println(name) } } } class B { val name = "B" }`，先猜输出再运行验证；然后把 apply 换成 also 让两句都打印。
3. **选型练习**：给出五个场景各选一个函数并说明理由——(a) 给新建的对话框设标题与按钮；(b) 在 map 链中间打印调试；(c) 可空 token 非空时才发请求；(d) 统计文件行数并返回；(e) 对已有窗口做一串操作后返回窗口标题。
4. **排错练习**：找出下面的 bug（编译通过，但结果不对）：

```kotlin
class Game {
    var score = 0
    fun register(playerName: String) {
        Player(playerName).apply {
            score += 10        // 本想给 Game 加分
        }
    }
}
class Player(val name: String) { var score = 0 }
```

思路：apply 块内 `score` 解析到 Player 的字段（隐式接收者优先），Game 的分数纹丝不动。修法：块外 `score += 10`，或块内 `this@Game.score += 10`，或改用 also 让 this 保持指向 Game。

## 下一步

- [作用域函数差异详解](/kotlin/080-ScopeFunctionDifference)：五函数在返回值、接收者、上下文对象命名上的逐项对比与更多反例；
- [空安全详解](/kotlin/130-NullSafetyDetailed)：`?.let` 背后的类型系统设计；
- [Kotlin DSL](/kotlin/560-KotlinDSL)：作用域函数如何长成 Gradle 脚本与 Ktor 路由的样子。
