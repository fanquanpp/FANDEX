---
order: 620
title: Kotlin 惯用法与代码规范
module: 'kotlin'
category: 后端技术
difficulty: beginner
description: 命名与格式规范、性能惯用法（Sequence、原始数组、并发限流）与 Effective Kotlin 核心要点。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Kotlin 代码风格与惯用法（idioms），覆盖官方 Coding Conventions、性能相关惯用写法与《Effective Kotlin》高频条目。
- **解决什么问题**：同一逻辑有五种写法时，团队需要一个统一且经过性能验证的选择；否则代码评审反复争论「用不用 !!」「要不要 asSequence」，性能问题（装箱、中间集合、失控并发）在压测时才暴露。
- **什么时候用到**：写任何业务代码时随手对照；评审他人 PR 时引用条目编号；排查「为什么这个列表处理慢」「为什么内存涨了」类问题。

本文与测试无关——测试框架与协程测试分别见[Kotlin 测试与最佳实践](/kotlin/380-KotlinTestBestPractice)与[Kotlin 协程测试](/kotlin/395-KotlinCoroutineTesting)。

## 1. 命名规范

| 元素      | 规范                    | 示例                                     |
| --------- | ----------------------- | ---------------------------------------- |
| 包名      | 全小写，点分隔          | `com.example.project`                    |
| 类/接口   | PascalCase              | `UserService`, `Clickable`               |
| 函数/变量 | camelCase               | `calculateTotal`, `userCount`            |
| 常量      | SCREAMING_SNAKE_CASE    | `MAX_RETRY_COUNT`                        |
| 类型参数  | 大写单字母或 PascalCase | `T`, `R`, `Key`, `Value`                 |
| 测试方法  | 反引号描述              | `` `should return 404 when not found` `` |

三条最常被违反的细则：

- **常量的判定标准是「编译期常量或不可变引用」**：`val maxRetryCount = 3` 在函数内叫局部只读变量用 camelCase；提到伴生对象且为 `const val` 才用 SCREAMING_SNAKE_CASE。易错点：把 `val config = loadConfig()` 这类运行期初始化的只读引用也写成全大写——它不是常量，只是不可变引用。
- **反引号测试名的边界**：反引号标识符在 JVM 上合法（Kotlin 编译成合法名字），但在 Java 调用侧会变成 `should return 404 when not found` 这种带空格的怪名字。只用于测试代码；生产 API 不要用（跨平台目标 Kotlin/JS、Kotlin/Native 对部分字符也有兼容性问题）。
- **工厂函数不用 `createXxx` 前缀**：官方约定用与类型同名的大写函数，如 `fun List(value: Int)` / `fun Entry(key: K, value: V)`。这条容易被 Java 迁移团队忽略。

## 2. 格式规范

```kotlin
// 链式调用换行：点号领起新行
val result = items
    .filter { it.isActive }
    .map { it.name }
    .sorted()
    .toList()

// 长参数列表换行：右括号与函数同级收口
fun createRequest(
    method: HttpMethod,
    url: String,
    headers: Map<String, String> = emptyMap(),
    body: String? = null
): Request

// when 分支格式
when (value) {
    is Int -> processInt(value)
    is String -> processString(value)
    else -> handleUnknown(value)
}
```

易错点：链式调用换行后**忘了缩进**或把点号留在行尾（`.filter { }.`），后者虽然编译通过但 ktlint 会报错；团队接 ktlint/ktfmt 后这些全部自动修复，规范的意义是让 diff 稳定而不是审美统一。

## 3. 性能惯用法一：用集合操作替代手写循环

```kotlin
// Bad — 每次调用创建新集合对象，意图被循环细节淹没
fun process(items: List<String>): List<String> {
    val result = mutableListOf<String>()  // 每次创建
    items.forEach { result.add(it.uppercase()) }
    return result
}

// Good — 声明意图，JIT 下性能无实质差异
fun process(items: List<String>): List<String> = items.map { it.uppercase() }
```

为什么推荐后者：`map` 表达的是「一一变换」的意图，评审者一眼确认无副作用；手写循环里藏着 `result.add`，要逐行确认没有条件分支和共享状态。性能上两者都是一次遍历一次装箱列表，**不要**以「手写更快」为由选 Bad 版本。

三个不同场景的同一选择：

1. **CLI 工具解析参数**：`args.filter { it.startsWith("--") }.map { it.removePrefix("--") }`——可读性优先，数据量小。
2. **Android 列表页组装展示模型**：`orders.map { OrderItemUi(it.id, it.total.toDisplay()) }`——配合 `ListAdapter` 的 diff，转换函数保持纯函数。
3. **Ktor 服务端组装响应**：`rows.map { RowDto.from(it) }`——DTO 转换集中在边界层，循环里不做 IO。

## 4. 性能惯用法二：Sequence 处理大数据集

```kotlin
// Bad — 每个操作符都物化一个中间集合
val result = (1..1_000_000)
    .map { it * 2 }      // 中间集合 1：100 万个元素
    .filter { it > 100 } // 中间集合 2
    .take(10)
    .toList()

// Good — 惰性求值：逐元素流过整条管线，take(10) 后停止
val result = (1..1_000_000).asSequence()
    .map { it * 2 }
    .filter { it > 100 }
    .take(10)
    .toList()
```

逐段讲透：

- `List` 版本的三段各分配一个约 100 万元素的中间集合，内存峰值与 GC 压力都由数据总量决定；`Sequence` 版本每个元素独立流过 map → filter → take，处理完第 10 个合格元素就短路返回，实际做了远小于 100 万次操作。
- 易错点一：**末端操作符缺失等于什么都没做**。`list.asSequence().map { ... }` 返回的是惰性描述，没有 `toList()` / `forEach` 触发，整个表达式不执行。
- 易错点二：**小数据集别用 Sequence**。每个元素经过一层迭代器间接调用，几百个元素的列表用 Sequence 反而更慢。经验阈值：上千元素或存在短路操作（`take`/`first`/`any`）时才上 Sequence。

**工程场景**：日志分析 CLI 读取 2GB 访问日志逐行过滤。`File.useLines { lines -> lines.filter { ... }.take(100).toList() }` 常数内存跑完全程；用 `readLines()` 先全量读入会直接 OOM。这正是 Sequence 短路的杀手级用法。

## 5. 性能惯用法三：并发限流

```kotlin
// 全量并发——1000 个请求同时打出
suspend fun fetchAll(urls: List<String>): List<String> = coroutineScope {
    urls.map { url ->
        async(Dispatchers.IO) { fetchUrl(url) }
    }.awaitAll()
}

// 用 Semaphore 限制并发
suspend fun fetchWithConcurrencyLimit(
    urls: List<String>,
    maxConcurrency: Int = 10
): List<String> = coroutineScope {
    val semaphore = Semaphore(maxConcurrency)
    urls.map { url ->
        async(Dispatchers.IO) {
            semaphore.withPermit { fetchUrl(url) }
        }
    }.awaitAll()
}
```

逐段解释：

- `Semaphore(maxConcurrency)` 来自 `kotlinx.coroutines.sync`，`withPermit { }` 保证离开代码块时许可必还（含异常路径）——等价于 Java 的 `tryLock/finally release` 但语法闭合。
- Bad 版本的真实后果不只是压垮下游：`Dispatchers.IO` 默认 64 线程，1000 个任务排队本身没问题，但 1000 个 TCP 连接、下游限流 429、重试风暴会连锁爆发。
- 易错点：`Semaphore` 实例必须**在所有使用者之外创建一次共享**；写在 `map` 的 lambda 里就变成了每个任务一把新信号量，限流完全失效。这类错误编译器和运行时都不报错，只有压测能暴露。

**工程场景**：爬虫服务抓 10 万商品详情。第一版无限并发把对方网关打到熔断；改为 `Semaphore(20)` + 失败退避后，吞吐稳定且对方限流告警消失。限流值不是拍脑袋——用下游的 QPS 配额除以单请求耗时得出。

## 6. 性能惯用法四：原始类型数组避免装箱

```kotlin
// Bad — 装箱开销：100 万个 Integer 对象
val numbers: List<Int> = (1..1000).toList()

// Good — 连续内存的原生 int 数组，无装箱
val numbers: IntArray = IntArray(1000) { it + 1 }
```

- `List<Int>` 的每个元素都是堆上的 `Integer` 对象（-128~127 之外不享受缓存），外加 List 头与引用数组；`IntArray` 是一块连续 `int[]`，缓存友好且省约一个数量级内存。
- 易错点：`IntArray(1000) { it + 1 }` 的 lambda 是**初始化器**（按下标生成值），不是逐个添加；写出 `val a = IntArray(0); (1..1000).forEach { a += it }` 这种写法每步都复制整个数组。
- 选择边界：业务代码的数据量下装箱开销通常可忽略，优先 `List<Int>` 保持 API 通用；图像处理、信号处理、大数值循环这类热点路径才换 `IntArray` / `DoubleArray`。

## 7. Effective Kotlin 要点

### 7.1 限制可变性

```kotlin
// 优先使用 val
val items = listOf(1, 2, 3)  // 不可变引用 + 不可变集合

// 使用不可变集合接口
fun process(items: List<String>) {  // 而非 MutableList
    // ...
}

// 数据类使用 val
data class User(val name: String, val age: Int)  // 而非 var
```

为什么这条排在 Effective Kotlin 第一章：可变状态是并发 bug 与「谁改了我的数据」类疑难的全部来源。参数声明为 `List` 而不是 `MutableList`，调用方就**不能**期望你原地修改它的集合，契约立刻清晰。易错点：`val` 只锁引用不锁对象——`val list = mutableListOf(1)` 依然能 `list.add(2)`；要不可变集合用 `listOf` / `buildList`。

### 7.2 消除 !! 操作符

```kotlin
// Bad
val name: String = user.name!!

// Good — 使用 ?:
val name: String = user.name ?: "Unknown"

// Good — 使用 let
user.name?.let { processName(it) }

// Good — 使用 require/check：失败即抛，且触发智能转换
fun process(user: User) {
    requireNotNull(user.name) { "Name is required" }
    // 此后 user.name 智能转换为非空
}
```

`!!` 的本质是「我赌它非空，赌错就 NPE」——把编译期检查推迟成运行期崩溃。`requireNotNull` 优于 `!!` 的两点：异常消息可读（`Name is required` 而不是裸 NPE），并且编译器认可「此后非空」的智能转换。工程场景：解析服务端 JSON 时，协议规定的必填字段在入口处集中 `requireNotNull` 校验一次，下游全部享受非空类型；散落的 `!!` 则意味着校验缺失。

### 7.3 使用表达式体

```kotlin
// Bad
fun max(a: Int, b: Int): Int {
    return if (a > b) a else b
}

// Good
fun max(a: Int, b: Int): Int = if (a > b) a else b
```

表达式体的价值超出省两行：返回类型由表达式推断，重构表达式时不会出现「签名说 `String`、实际想返回 `User`」的漂移。易错点：表达式体超过 3-4 个链式步骤后可读性反转，该换回块体时别硬撑。

### 7.4 避免在构造函数中做重操作

```kotlin
// Bad — 构造函数中做 IO：构造即阻塞，测试也要付 IO 成本
class Service(config: Config) {
    private val data = loadData(config.path)  // 阻塞操作
}

// Good — 延迟加载：首次访问才执行
class Service(config: Config) {
    private val data by lazy { loadData(config.path) }
}
```

`lazy` 默认 `LazyThreadSafetyMode.SYNCHRONIZED`，多线程首次并发访问只执行一次。易错点一：被测类构造时做 IO 会让单元测试隐式依赖文件系统——延迟到方法内或改为构造注入后测试即可打桩。易错点二：`lazy` 属性不要声明成 `var` 类型引用（可以换引用会让缓存失效语义混乱），保持 `val`。

### 7.5 用密封类 + when 获得穷举检查

```kotlin
// 密封类 + when 实现穷举检查
sealed class UiState {
    object Loading : UiState()
    data class Success(val data: String) : UiState()
    data class Error(val message: String) : UiState()
}

fun render(state: UiState) = when (state) {
    is UiState.Loading -> showLoading()
    is UiState.Success -> showData(state.data)
    is UiState.Error -> showError(state.message)
    // 编译器确保覆盖所有分支
}
```

价值在**演进安全性**：三个月后新增 `data class Cached(val staleData: String) : UiState()`，所有漏处理的 `when(state)` 编译期直接报错。枚举 + when 也能穷举，但枚举常量不能携带各自不同的字段——`Success` 带 data、`Error` 带 message 这种异构载荷必须密封类。深入阅读：[密封类与代数数据类型](/kotlin/150-SealedClassAlgebraicDataType)。

### 7.6 用扩展函数替代工具类

```kotlin
// Bad — 工具类 + 静态调用
class StringUtils {
    companion object {
        fun isEmail(str: String): Boolean = str.contains("@")
    }
}
StringUtils.isEmail("test@example.com")

// Good — 扩展函数
fun String.isEmail(): Boolean = this.contains("@") && this.contains(".")
"test@example.com".isEmail()
```

扩展函数让调用点读起来像接收者的固有能力，IDE 自动补全按接收者类型聚合。易错点：扩展函数是**静态解析**的——子类「重写」父类扩展不会多态分发，变量声明类型决定调用哪个版本；需要多态请用成员函数。深入阅读：[扩展函数与编译原理](/kotlin/100-ExtensionFunctionCompilePrinciple)。

### 7.7 合理使用作用域函数

```kotlin
// apply — 配置对象：块内 this 是接收者，返回接收者
val request = Request().apply {
    method = HttpMethod.POST
    url = "/api/users"
    headers["Content-Type"] = "application/json"
}

// let — 空安全链式调用：块内 it 是接收者，返回 lambda 结果
val domain = email?.substringAfter("@")?.let { it.lowercase() }

// also — 附加操作：块内 it 是接收者，返回接收者本身，不影响链
val user = createUser()
    .also { logger.info("Created user: ${it.id}") }
    .also { eventBus.publish(UserCreatedEvent(it.id)) }
```

选择口诀：**改对象用 apply，转值用 let，留副作用用 also**。易错点：嵌套 `apply` 时内层 `this` 遮蔽外层 `this`，写错对象静默编译通过——嵌套超过一层就换成 `also` + 显式 `it` 命名或提取变量。深入阅读：[作用域函数](/kotlin/070-KotlinScopeFunction)与[作用域函数辨析](/kotlin/080-ScopeFunctionDifference)。

### 7.8 避免在伴生对象中存储可变状态

```kotlin
// Bad — 全局可变状态
class Config {
    companion object {
        var debugMode = false  // 全局可变，难以追踪
    }
}

// Good — 依赖注入
class Service(private val config: Config) {
    fun process() {
        if (config.debugMode) { /* ... */ }
    }
}
```

伴生对象可变状态的两个罪状：测试之间互相污染（A 测试改了 `debugMode`，B 测试跟着错），以及多线程不可见性（无同步的 boolean 写入其他线程可能看不到）。依赖注入版本让每个测试实例持有自己的 Config，并发语义也交给持有者决定。工程场景：把「全局 debug 开关」重构为注入后，灰度环境可以按请求粒度开调试日志——全局变量做不到。

## 动手实践

**任务 1**：把下面的命令式代码改写为惯用写法，要求消除中间集合、短路提前停止，并说明在 100 万元素下的内存差异：

```kotlin
fun firstTenBig(numbers: List<Int>): List<Int> {
    val doubled = mutableListOf<Int>()
    for (n in numbers) { doubled.add(n * 2) }
    val big = mutableListOf<Int>()
    for (n in doubled) { if (n > 1_000_000) big.add(n) }
    return big.take(10)
}
```

提示：`asSequence()` + `take` 的短路语义；写完后用 `(1..500_000).shuffled()` 验证结果一致。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```kotlin
fun firstTenBig(numbers: List<Int>): List<Int> =
    numbers.asSequence()
        .map { it * 2 }
        .filter { it > 1_000_000 }
        .take(10)
        .toList()
```

List 版本会物化两个 50 万元素的中间集合；Sequence 版本在凑满 10 个合格元素后停止遍历，实际处理的元素个数远小于总量，全程只分配最终那 10 个元素的装箱列表。

</details>

**任务 2**：评审下面的代码，指出 4 处惯用法违规并改写：

```kotlin
object Http {
    var baseUrl = "https://api.example.com"   // 全局可变
    fun fetch(path: String): String {
        val url = baseUrl + path
        var result: String? = null            // 可空变量当返回值
        result = doGet(url)!!                 // 强解包
        return result
    }
}
```

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

四处违规：伴生对象级可变状态（`object` 的 var）、`var` + 可空当返回值、`!!` 强解包、缺少超时与错误处理语义。改写：

```kotlin
class Http(private val baseUrl: String) {
    fun fetch(path: String): String =
        doGet(baseUrl + path) ?: error("Empty response from $path")
}
```

`baseUrl` 改构造注入（测试可打桩）；`!!` 换 `?: error(...)` 带上下文消息；可空中间变量整个消失。

</details>

## 常见陷阱

1. **「性能优化」错方向**：小集合上用 Sequence、业务代码全线 IntArray 属于负优化；先测量（Kotlin Benchmark 见 [Kotlin 基准测试](/kotlin/400-KotlinBenchmark)）再优化热点。
2. **Semaphore 建在 lambda 里**：限流失效且无报错，只有压测能暴露。
3. **val 误当不可变**：`val` 锁引用不锁对象，集合不可变要选 `listOf` 一族。
4. **反引号名进生产 API**：跨语言调用与跨平台目标下出问题。

## 相关阅读

- 空安全体系与契约：[Kotlin 空安全详解](/kotlin/130-NullSafetyDetailed)
- 委托属性（含 lazy 的实现细节）：[Kotlin 委托属性](/kotlin/210-DelegateProperty)
- 并发限流的调度器侧配套：[协程调度器与上下文](/kotlin/250-CoroutineDispatcherContext)

## 参考与致谢

- Kotlin Coding Conventions（kotlinlang.org，Apache-2.0）：https://kotlinlang.org/docs/coding-conventions.html
- Kotlin Idioms 列表（kotlinlang.org，Apache-2.0）：https://kotlinlang.org/docs/idioms.html
- 《Effective Kotlin》条目仅作知识点索引，本文示例均为原创重写。
