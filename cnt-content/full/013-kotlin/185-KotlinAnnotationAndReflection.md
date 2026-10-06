---
order: 200
title: Kotlin 注解与反射
module: 'kotlin'
category: 后端技术
difficulty: beginner
description: 注解声明（Target/Retention/Repeatable）、kotlin-reflect 与 KClass/KProperty 的用法、成本与编译期替代方案。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Kotlin 元编程基础——注解声明与运行时反射，属于类型系统之后的「让程序检查程序」分支。
- **解决什么问题**：框架需要在运行时读取代码上声明的元数据（权限、路由、序列化规则）并按元数据改变行为；或者需要按名字查找类/属性做通用处理（依赖注入、对象映射、路由表生成）。
- **什么时候用到**：给接口方法标注权限并在拦截器里校验；按类名/函数名动态构建路由或插件表；排查「为什么序列化框架没读到我这个字段」这类框架行为问题。

前置：[Kotlin 泛型与类型系统](/kotlin/170-KotlinGenericTypeSystem)（`reified` 与本文强相关）；编译期方案见[Kotlin 编译器插件](/kotlin/420-KotlinCompilerPlugin)。

## 1. 声明一个注解：annotation class

```kotlin
@Target(AnnotationTarget.FUNCTION, AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class RequiresPermission(val value: String)
```

三个元注解逐个讲透：

- `@Target`：注解能贴在哪些位置。缺省时注解可以贴**几乎所有**声明——这几乎总是错的（把权限注解贴到参数上没有任何效果），所以生产注解必写 Target。可选值有 `CLASS`、`FUNCTION`、`PROPERTY`、`VALUE_PARAMETER`、`EXPRESSION`、`FILE` 等。易错点：`PROPERTY` 与 `PROPERTY_GETTER` 是两个目标——注在 `val name: String` 属性上的运行时注解默认存进属性 getter 的字节码，反射读取走 `findAnnotation<>()` 才能找到。
- `@Retention`：注解活多久。`SOURCE`（编译后丢弃，如 `@SuppressLint`）、`BINARY`（进 class 文件但反射不可见，Kotlin 默认）、`RUNTIME`（反射可读）。**易错点第一名**：Kotlin 注解默认 `BINARY`，而 Java 注解默认 `RUNTIME`——从 Java 习惯迁移过来的开发者写的注解在反射里「消失」，原因就是漏了 `@Retention(AnnotationRetention.RUNTIME)`。
- `@Repeatable`：允许同一位置重复贴注解。Kotlin 1.6+ 中可重复注解默认自动带 `@JvmRepeatable` 生成容器；反射侧用 `getAnnotationsByType()` 读取（`findAnnotation` 只能拿到单个）。

三个不同场景的注解选型：

1. **接口权限拦截（本文主线）**：`RUNTIME` 保留 + 函数目标，拦截器反射读取。
2. **编译期校验规则**：`SOURCE` 保留，配编译器插件或 ksp 在编译时读源码模型，产物零运行时开销。
3. **序列化字段改名**：`RUNTIME` 或交给 kotlinx.serialization 的编译期插件（见第 5 节的边界讨论）。

## 2. kotlin-reflect：完整的 Kotlin 反射 API

标准库里只有最小反射（`::class`、`javaClass`、`memberProperties` 需要 kotlin-reflect）。完整 API 要单独引依赖：

```kotlin
// build.gradle.kts
dependencies {
    implementation(kotlin("reflect"))   // 约 3MB，混淆后更小但仍是显著增量
}
```

为什么是独立依赖：`kotlin-reflect` 实现了 Kotlin 独有的类型信息（可空性、默认参数、属性委托）在 JVM 字节码之外的还原，体积接近 3MB。**Android 工程对它最敏感**——App 体积每 MB 都要交代。引入前先确认没有编译期替代（第 5 节）。

`KClass` 三个最常用入口：

```kotlin
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.memberProperties

@RequiresPermission("order:read")
class OrderService

// 1. 读注解
val permission = OrderService::class.findAnnotation<RequiresPermission>()?.value
//    order:read

// 2. 列出属性（KProperty：Kotlin 属性的一等公民表示）
data class User(val id: Long, val name: String)
User::class.memberProperties.map { it.name }   // [id, name]

// 3. 按名字实例化（插件/反射工厂场景）
val clazz = Class.forName("com.example.OrderService").kotlin
val instance = clazz.objectInstance ?: clazz.java.getDeclaredConstructor().newInstance()
```

逐段解释与易错点：

- `findAnnotation<T>()` 是 `kotlin.reflect.full` 的扩展——不 import 这个包会找不到函数，报错却是「unresolved reference」，新人常误以为 kotlin-reflect 没生效。
- `memberProperties` 返回 `Collection<KProperty1<T, *>>`；`KProperty1.get(instance)` 直接读值。易错点：data class 的 `component1()` 解构与反射无关，按 `memberProperties` 遍历的顺序**不保证**与构造参数顺序一致，需要按声明顺序时用 `primaryConstructor.parameters`。
- `Class.forName(...).kotlin`：Java 反射与 Kotlin 反射的桥。拿到 `KClass` 后可以继续用 Kotlin API（注解、可空性、KType）。
- 易错点：`KClass.objectInstance` 只对 `object` 声明非空；普通类返回 null 是正常路径，不是 bug——上面三元写法是插件加载 `object`/普通类兼容的标准姿势。

## 3. 工程场景一：@RequiresPermission 运行时权限拦截

给服务端接口声明权限，路由层统一拦截——这是运行时注解 + 反射最典型的落地：

```kotlin
@Target(AnnotationTarget.FUNCTION, AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class RequiresPermission(val value: String)

interface OrderApi {
    @RequiresPermission("order:read")
    suspend fun listOrders(userId: String): List<Order>

    @RequiresPermission("order:write")
    suspend fun cancelOrder(orderId: String)
}

// 拦截器：启动时构建「方法 -> 权限」表，请求时 O(1) 查表
class PermissionInterceptor(private val apiClass: Class<*>) {
    private val table: Map<Method, String> = apiClass.methods
        .filter { it.isAnnotationPresent(RequiresPermission::class.java) }
        .associateWith { it.getAnnotation(RequiresPermission::class.java).value }

    fun check(method: Method, user: User): Boolean {
        val required = table[method] ?: return true   // 无注解默认放行（按团队约定也可默认拒绝）
        return required in user.permissions
    }
}
```

逐段解释与易错点：

- 注解表在**启动时构建一次**而不是每个请求都反射——反射的元数据查找有成本，缓存成 `Map` 后请求路径只剩哈希查询。
- 用 Java 反射（`apiClass.methods`）而不是 `KClass.functions` 读函数注解：Kotlin 接口的默认实现会在字节码里生成额外的合成方法（`DefaultImpls`），Java 反射语义更稳定、也避免 kotlin-reflect 依赖渗入服务端热路径。
- 易错点：`@Target(FUNCTION)` 的注解贴在接口**实现类**上时，`interfaceName.methods` 反射不到实现类的注解——拦截器必须反射「实际实现的 Class」或让团队约定注解只贴接口。这类「注解丢了」的排查先用 `javap -v` 看字节码里注解在不在。
- 默认放行还是默认拒绝是安全决策：权限系统默认拒绝（fail-closed）更安全，但要求每个方法都补注解；本文示例选放行仅为演示简单，真实支付链路应反转。

同模式的另外两个场景：

1. **Android 路由表**：启动时扫描 `@Route("order/detail")` 注解的 Activity，把路径映射到 `Class<out Activity>`，跳转时按表查找——解决多模块间直接依赖 Activity 的问题。
2. **测试环境权限放行**：拦截器构造时传 `permissive: Boolean`，测试桩里全放行，生产构造不传——同一套拦截代码两种行为，不往业务代码里塞 `if (isTest)`。

## 4. 工程场景二：KClass 反射生成轻量路由表

不依赖任何路由框架，用反射给多模块 App 生成模块内路由：

```kotlin
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Route(val path: String)

@Route("user/detail")
class UserDetailActivity

object RouteTable {
    private val routes = mutableMapOf<String, KClass<*>>()

    fun register(vararg classes: KClass<*>) {
        for (clazz in classes) {
            val route = clazz.findAnnotation<Route>() ?: continue
            val old = routes.put(route.path, clazz)
            check(old == null) { "Duplicate route path: ${route.path}" }   // 重复注册直接失败，宁可崩在启动
        }
    }

    fun resolve(path: String): KClass<*>? = routes[path]
}

// 应用启动时集中注册（也可由编译期生成的代码调用，见第 5 节）
RouteTable.register(UserDetailActivity::class, OrderListActivity::class)
```

- `check(old == null)` 把「两个模块注册了同一路径」从运行期随机错乱提前为启动崩溃 + 明确报错——反射场景里的错误要尽量左移。
- 这版实现要求启动时**显式列举**所有类，无法自动发现；自动发现要么扫描 APK 的 dex（运行时扫描成本高、R8 混淆后类名变化），要么上编译期方案。这正是规模一大就必须迁移到编译期的原因。

## 5. 保留期与编译期方案的边界

为什么 kotlinx.serialization 的 `@Serializable` 不走运行时反射：`@Serializable` 的 Retention 是 `BINARY`，序列化器在**编译期**由插件生成。对照表：

| 方案 | 保留期 | 运行时成本 | 体积代价 | 代表 |
| --- | --- | --- | --- | --- |
| 运行时反射 | RUNTIME | 每次查找有开销（可缓存） | kotlin-reflect 约 3MB | 权限拦截、手写路由 |
| 编译器插件 / KSP | BINARY/SOURCE | 零（生成普通代码） | 生成代码体积 | kotlinx.serialization、Room |
| 源码级注解 | SOURCE | 零 | 零 | lint 规则、IDE 检查 |

决策口诀：**元数据在运行时才确定（按配置/插件变化）用 RUNTIME；元数据编译期就固定（字段名、路由表）用编译期生成**。移动端与 KMP 目标上，能编译期的都不要运行时——Kotlin/Native 对运行时反射的支持也更受限。深入生成代码的机制见[Kotlin 编译器插件](/kotlin/420-KotlinCompilerPlugin)；`@Serializable` 的用法见[Kotlin 序列化](/kotlin/340-KotlinSerialization)。

## 动手实践

**任务**：实现一个最小版「字段脱敏导出器」。给 data class 的字符串属性贴 `@Masked(val keep: Int)` 注解，写一个 `fun <T : Any> mask(obj: T): Map<String, String>`，导出所有属性名与脱敏后的值（保留前 keep 位，其余替换为 `*`；未注解的属性原样输出）。

提示：

1. 注解 Target 选 `AnnotationTarget.PROPERTY`，Retention 必须 `RUNTIME`；
2. `obj::class.memberProperties.filterIsInstance<KProperty1<T, *>>()` 后逐个 `get(obj)`；
3. 只处理返回类型为 `String` 的属性：`prop.returnType.classifier == String::class`。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```kotlin
import kotlin.reflect.KClass
import kotlin.reflect.KProperty1
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.memberProperties

@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)
annotation class Masked(val keep: Int)

data class Customer(
    val name: String,
    @Masked(keep = 3) val phone: String,
    @Masked(keep = 0) val idCard: String,
)

fun <T : Any> mask(obj: T): Map<String, String> =
    obj::class.memberProperties
        .filterIsInstance<KProperty1<T, *>>()
        .filter { it.returnType.classifier == String::class }
        .associate { prop ->
            val value = prop.get(obj) as String
            prop.name to value.mapIndexed { i, c -> if (i < (prop.findAnnotation<Masked>()?.keep ?: Int.MAX_VALUE)) c else '*' }.joinToString("")
        }

// mask(Customer("Alice", "13812345678", "110101199001011234"))
// => {name=Alice, phone=138******78, idCard=****************}
```

易错点：`memberProperties` 返回的是 `KProperty1<out T, *>`，直接 `get` 编译不过，需要 `filterIsInstance<KProperty1<T, *>>()` 收窄；`findAnnotation<Masked>()` 每属性查找一次，热路径上应缓存到 `Map<KProperty1<T,*>, Int>`——与第 3 节拦截器同一条优化铁律。

</details>

**任务 2**：把第 4 节的路由表注册改为编译期思路：手写一个 `GeneratedRoutes.kt`（内容是集中注册的普通代码），说明它与运行时反射版本在 R8 混淆后行为差异——生成版不引用的 Activity 类仍可能被裁掉，需要 keep 规则或注册代码本身持有强引用（`::class` 字面量即强引用）。

## 常见陷阱

1. **注解反射读不到**：九成是 `@Retention` 忘了 `RUNTIME`（Kotlin 默认 BINARY），剩下一成是注解贴在了与反射目标不同的声明（属性 vs getter vs 字段，`@field:` / `@get:` / `@param:` use-site target 可显式指定）。
2. **kotlin-reflect 未引却用了 full API**：`kotlin.reflect.full.*` 运行时抛 `KotlinReflectionNotSupportedError`——标准库只含 API 不含实现。
3. **R8 混淆后反射失效**：按名查找的类被改名/裁剪，必须写 keep 规则（见[Kotlin Android](/kotlin/440-KotlinAndroid)的混淆小节）。
4. **反射不做缓存**：每个请求都 `getAnnotation`，压测时元编程开销占比惊人；一次构建查找表。
5. **跨平台目标依赖运行时反射**：Kotlin/JS、Kotlin/Native 的反射能力是子集，共享模块元编程优先编译期方案。

## 相关阅读

- reified 内联类型参数（编译期拿到 KClass）：[Kotlin 泛型与类型系统](/kotlin/170-KotlinGenericTypeSystem)
- 编译期生成代码：[Kotlin 编译器插件](/kotlin/420-KotlinCompilerPlugin)
- 序列化的编译期实现：[Kotlin 序列化](/kotlin/340-KotlinSerialization)
- R8 keep 规则与 Android 集成：[Kotlin Android](/kotlin/440-KotlinAndroid)

## 参考与致谢

- Kotlin Annotations 官方文档（kotlinlang.org，Apache-2.0）：https://kotlinlang.org/docs/annotations.html
- Kotlin Reflection 官方文档（kotlinlang.org，Apache-2.0）：https://kotlinlang.org/docs/reflection.html
- kotlin.reflect.full API 参考（kotlinlang.org，Apache-2.0）：https://kotlinlang.org/api/kotlinx.coroutines/（注：反射 API 见 https://kotlinlang.org/api/kotlin.reflect.full/）
