---
order: 53
title: 委托属性
module: kotlin
category: 'dev-lang'
difficulty: intermediate
description: 'Kotlin 委托属性深度解析：lazy、observable、vetoable、map 委托、provideDelegate 的设计哲学、形式化定义、字节码实现与企业级工程实践。'
author: fanquanpp
updated: '2026-07-21'
related:
  - kotlin/扩展函数
  - kotlin/密封类与代数数据类型
  - kotlin/协程基础
  - kotlin/Flow与响应式流
  - kotlin/作用域函数区别
prerequisites:
  - kotlin/概述与环境配置
  - kotlin/类与对象
  - kotlin/属性与字段
---

# 委托属性（Delegated Properties）

> 本文档对标 MIT 6.005、Stanford CS193P、CMU 15-410 教学水准，系统讲解 Kotlin 委托属性（Delegated Properties）从设计哲学到 JVM 字节码实现的完整链路。内容覆盖 Kotlin 1.1 至 2.0 的演进，包括 `lazy`、`observable`、`vetoable`、`Map` 委托、`provideDelegate` 等核心机制，配套企业级生产代码、跨语言对比、形式化推导与习题解析。

## 目录

1. [学习目标](#1-学习目标)
2. [历史动机与发展脉络](#2-历史动机与发展脉络)
3. [形式化定义](#3-形式化定义)
4. [理论推导与原理解析](#4-理论推导与原理解析)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践)
8. [工程实践](#8-工程实践)
9. [案例研究](#9-案例研究)
10. [习题](#10-习题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标

本章节遵循 Bloom 教育目标分类学（Bloom's Taxonomy）的六个认知层级，由低阶到高阶逐层递进。

### 1.1 Remember（记忆）

- 列举 Kotlin 标准库提供的四大内置委托：`lazy`、`Delegates.observable`、`Delegates.vetoable`、`Delegates.notNull`。
- 复述委托属性的核心接口：`ReadOnlyProperty<in T, out V>` 与 `ReadWriteProperty<in T, out V>`。
- 背诵两个核心运算符方法的签名：`operator fun getValue(thisRef: T, property: KProperty<*>): V` 与 `operator fun setValue(thisRef: T, property: KProperty<*>, value: V)`。
- 记忆 `lazy` 的三个线程安全模式：`SYNCHRONIZED`、`PUBLICATION`、`NONE`。
- 列举 `provideDelegate` 的作用：在属性初始化时（而非读写时）执行逻辑，可用于属性验证。
- 复述 `Map` 委托的语法：`val name: String by map`，要求 Map 的键与属性名匹配。
- 列举委托属性的核心应用场景：延迟初始化、属性监听、属性映射、依赖注入、Android ViewBinding。

### 1.2 Understand（理解）

- 用自己的语言解释委托属性的本质：将属性的 getter/setter 委托给另一个对象，实现"组合优于继承"。
- 解释 `lazy` 的 `SYNCHRONIZED` 模式与 `PUBLICATION` 模式的差异：前者使用 `synchronized` 双重检查锁，后者使用 `AtomicReference` 的 CAS。
- 描述 `observable` 与 `vetoable` 的语义差异：前者在赋值后通知，后者在赋值前决策是否接受。
- 阐述 `provideDelegate` 的设计动机：解决"属性元信息在创建时不可用"的问题，例如属性名验证。
- 解释 `KProperty<*>` 参数的作用：在委托方法中提供属性的反射信息（名称、类型、签名）。
- 理解委托属性与属性代理（Property Delegate）的关系：委托是代理模式在属性层面的应用。
- 解释为什么 `lazy` 默认是 `SYNCHRONIZED`：避免多线程下重复初始化，但会带来同步开销。

### 1.3 Apply（应用）

- 使用 `lazy` 实现昂贵的资源延迟初始化，如数据库连接、配置加载。
- 使用 `Delegates.observable` 实现属性变更监听，配合观察者模式。
- 使用 `Delegates.vetoable` 实现属性值校验，如年龄必须非负、邮箱必须匹配正则。
- 使用 `Map` 委托解析 JSON 响应，将 JSON 字段映射为对象属性。
- 自定义委托实现 SharedPreferences 的封装，提供类型安全的 API。
- 使用 `provideDelegate` 在 DSL 中验证属性名，如 HTML 构建器检查标签合法性。
- 在 Android 中使用委托封装 ViewBinding，避免 `findViewById` 样板代码。

### 1.4 Analyze（分析）

- 反编译委托属性的字节码，分析 `by` 关键字如何转换为 `getValue`/`setValue` 调用。
- 对比 `lazy` 的三种线程安全模式在不同场景下的性能差异。
- 分析 `provideDelegate` 相比 `getValue` 中验证的优势：前者只在初始化时执行一次，后者每次读取都执行。
- 解构 `Lazy` 接口的源码：`value` 属性如何与 `SYNCHRONIZED`、`PUBLICATION` 模式协作。
- 分析 `Map` 委托在泛型擦除下的实现：如何通过 `@Suppress("UNCHECKED_CAST")` 处理类型转换。

### 1.5 Evaluate（评价）

- 评价委托属性相比直接写 getter/setter 的优劣：灵活性 vs 可读性。
- 评价 `lazy` 默认 `SYNCHRONIZED` 的设计：在单线程场景下是否过度？
- 评价 `provideDelegate` 的引入时机：Kotlin 1.1 加入是否过晚？
- 评估 `Map` 委托在类型安全上的妥协：是否值得用 `UNCHECKED_CAST` 换取便利？
- 评价委托属性在 DSL 设计中的角色：是否被过度使用？
- 评估自定义委托的性能开销：每次属性访问都创建对象？

### 1.6 Create（创造）

- 设计并实现一个完整的属性绑定框架：支持双向绑定、转换器、验证器。
- 设计一个基于委托属性的依赖注入容器：通过 `by inject<T>()` 获取依赖。
- 实现一个"可观察集合"：使用 `observable` 委托监听 List/Map 变化。
- 撰写一份团队委托属性使用规范：何时用 `lazy`、何时用 `observable`、何时自定义。
- 设计一个跨平台的配置管理库：基于委托属性封装 SharedPreferences、UserDefaults、LocalStorage。

---

## 2. 历史动机与发展脉络

### 2.1 问题背景：样板代码的烦恼

在传统 Java 中，属性的 getter/setter 往往包含大量样板代码：

```java
public class User {
    private String name;
    
    public String getName() { return name; }
    public void setName(String name) { 
        // 校验
        if (name == null) throw new IllegalArgumentException();
        // 通知
        this.name = name;
        notifyListeners();
    }
}
```

每个属性都需要重复编写校验、通知、缓存等逻辑，代码冗余且难以维护。

Kotlin 的设计目标：

- **声明式属性**：通过 `by` 关键字声明属性行为，而非手写 getter/setter。
- **复用性**：委托逻辑可复用到多个属性，避免重复。
- **可组合性**：多个委托可组合（如 `lazy + observable`）。
- **零开销抽象**：委托通过 `inline` 与运算符重载实现，无运行时开销。

### 2.2 学术背景：代理模式与组合优于继承

委托属性的思想根植于面向对象设计原则：

- **代理模式（Proxy Pattern）**：为一个对象提供代理，控制对原对象的访问。
- **组合优于继承（Composition over Inheritance）**：通过组合多个小对象实现复杂行为，而非继承。
- **开放-封闭原则（OCP）**：对扩展开放，对修改封闭；委托允许在不修改原类的情况下扩展属性行为。

Kotlin 的委托属性将这些原则应用到属性层面，形成"属性级代理"。

### 2.3 Kotlin 1.0（2016）：委托属性初版

Kotlin 1.0 引入委托属性作为核心特性：

```kotlin
class Example {
    val lazyValue: String by lazy { "hello" }
    var observed: String by Delegates.observable("") { _, old, new ->
        println("$old -> $new")
    }
}
```

此时已包含：

1. `lazy` 委托。
2. `Delegates.observable` 与 `Delegates.vetoable`。
3. `Delegates.notNull` 委托。
4. `Map` 委托（`by map`）。
5. 自定义委托接口 `ReadOnlyProperty` 与 `ReadWriteProperty`。

### 2.4 Kotlin 1.1（2017）：provideDelegate 引入

Kotlin 1.1 引入了 `provideDelegate` 运算符：

```kotlin
class MyDelegate {
    operator fun getValue(thisRef: Any?, property: KProperty<*>): String = "value"
    
    operator fun provideDelegate(
        thisRef: Any?,
        property: KProperty<*>
    ): ReadOnlyProperty<Any?, String> {
        // 在属性初始化时执行
        checkProperty(property.name)
        return this
    }
}
```

`provideDelegate` 的动机：

1. **属性创建时验证**：如检查属性名是否符合命名规范。
2. **依赖属性元信息**：某些委托需要属性的类型信息，而 `getValue` 时才有。
3. **延迟委托创建**：根据属性上下文决定使用哪个委托实例。

### 2.5 Kotlin 1.2-1.3（2018）：稳定与优化

Kotlin 1.2-1.3 期间，委托属性有以下改进：

1. **`lazy` 的性能优化**：`SYNCHRONIZED` 模式使用 `Double-Check Locking`，避免每次访问都加锁。
2. **`ReadWriteProperty` 的泛型改进**：支持 `in T` 与 `out V` 协变。
3. **`Map` 委托的 `MutableMap` 支持**：允许通过 `MutableMap` 实现可变属性。
4. **KMP 支持**：委托属性在 JS、Native 平台行为一致。

### 2.6 Kotlin 1.4-1.5（2020-2021）：标准库扩展

Kotlin 1.4-1.5 扩展了标准库委托：

1. **`StateFlow` 与 `MutableStateFlow`**：虽然不是委托，但提供了"可观察状态"的语义。
2. **`Flow` 与 `StateFlow` 的互操作**：通过 `stateIn` 转换为 `StateFlow`。
3. **`nullable` 委托**：第三方库（如 Kotest）提供 `nullable` 委托。

### 2.7 Kotlin 1.6-1.7（2021-2022）：K2 预览与字节码优化

Kotlin 1.6-1.7 的 K2 编译器预览对委托属性进行了优化：

1. **内联优化**：K2 能更好地内联 `getValue`/`setValue` 调用，减少方法调用开销。
2. **`KProperty` 引用优化**：K2 生成的 `KProperty` 引用对象更少，减少 GC 压力。
3. **诊断改进**：K2 能更精确地报告委托使用错误。

### 2.8 Kotlin 1.8-1.9（2023）：与 Virtual Threads 集成

Kotlin 1.8-1.9 与 JVM 21 的 Virtual Threads 集成：

1. **`lazy` 在 Virtual Thread 下的行为**：`SYNCHRONIZED` 模式仍使用 `synchronized`，但不会阻塞 Virtual Thread 的载体线程。
2. **`StateFlow` 与 `MutableStateFlow`**：在 Virtual Thread 下可作为"协程安全属性"使用。

### 2.9 Kotlin 2.0（2024 年 5 月）：K2 全面成熟

Kotlin 2.0 的 K2 编译器对委托属性进行了全面优化：

1. **委托方法内联**：K2 能将简单的 `getValue`/`setValue` 内联到调用处，零开销。
2. **`KProperty` 引用复用**：K2 复用 `KProperty` 引用对象，减少对象分配。
3. **DSL 友好**：委托属性在 DSL 中的使用更自然，错误信息更清晰。
4. **KMP 一致性**：JVM、JS、Native、Wasm 平台的委托属性行为完全一致。

### 2.10 JetBrains 的设计哲学

JetBrains 在设计委托属性时遵循了以下哲学：

1. **声明式优先**：用 `by` 关键字声明，而非手写 getter/setter。
2. **组合优于继承**：通过委托复用逻辑，而非继承基类。
3. **零开销抽象**：通过 `inline` 与运算符重载实现，无运行时开销。
4. **可扩展性**：开发者可自定义委托，扩展属性行为。
5. **平台无关**：委托属性在 JVM、JS、Native、Wasm 行为一致。
6. **渐进式复杂度**：初学者用 `lazy`，高级用户用 `provideDelegate`。

### 2.11 时间线总览

```
2016  Kotlin 1.0 — 委托属性初版，lazy、observable、vetoable、Map 委托
2017  Kotlin 1.1 — provideDelegate 引入，属性创建时验证
2018  Kotlin 1.3 — ReadWriteProperty 泛型改进，KMP 支持
2020  Kotlin 1.4 — 标准库扩展，StateFlow 出现
2022  Kotlin 1.7 — K2 预览，字节码优化
2023  Kotlin 1.9 — Virtual Threads 集成
2024  Kotlin 2.0 — K2 GA，委托方法内联，KProperty 复用
```

---

## 3. 形式化定义

### 3.1 委托属性的统一形式

设 $T$ 为接收者类型（属性所属类），$V$ 为属性值类型。委托属性可形式化为一个三元组：

$$
\text{DelegatedProperty} = \langle \text{Delegate}, \text{Getter}, \text{Setter} \rangle
$$

其中：

- $\text{Delegate}$ 是委托对象。
- $\text{Getter} : \text{Delegate} \times T \times \text{KProperty} \to V$。
- $\text{Setter} : \text{Delegate} \times T \times \text{KProperty} \times V \to \text{Unit}$（可选）。

### 3.2 只读委托接口

`ReadOnlyProperty` 接口的形式化定义：

$$
\text{ReadOnlyProperty}\langle \text{in } T, \text{out } V \rangle ::= \{ \text{getValue} : T \times \text{KProperty}\langle * \rangle \to V \}
$$

```kotlin
public interface ReadOnlyProperty<in T, out V> {
    public operator fun getValue(thisRef: T, property: KProperty<*>): V
}
```

### 3.3 可变委托接口

`ReadWriteProperty` 接口的形式化定义：

$$
\text{ReadWriteProperty}\langle \text{in } T, \text{out } V \rangle ::= \text{ReadOnlyProperty}\langle T, V \rangle \cup \{ \text{setValue} : T \times \text{KProperty}\langle * \rangle \times V \to \text{Unit} \}
$$

```kotlin
public interface ReadWriteProperty<in T, out V> : ReadOnlyProperty<T, V> {
    public operator fun setValue(thisRef: T, property: KProperty<*>, value: V)
}
```

### 3.4 lazy 委托的形式化

`lazy` 函数的形式化定义：

$$
\text{lazy} : (\text{LazyThreadSafetyMode} \times () \to V) \to \text{Lazy}\langle V \rangle
$$

`Lazy<V>` 接口：

$$
\text{Lazy}\langle V \rangle ::= \{ \text{value} : V, \text{isInitialized} : \text{Boolean} \}
$$

`value` 的访问语义：

$$
\text{value} = \begin{cases}
\text{compute}() & \text{if not initialized} \\
\text{cached} & \text{otherwise}
\end{cases}
$$

### 3.5 observable 委托的形式化

`Delegates.observable` 的形式化：

$$
\text{observable} : V \times (V \times V \to \text{Unit}) \to \text{ReadWriteProperty}\langle *, V \rangle
$$

赋值时的行为：

$$
\text{setValue}(v) = \text{store}(v) \land \text{onChange}(\text{old}, v)
$$

即：先存储新值，再通知观察者。

### 3.6 vetoable 委托的形式化

`Delegates.vetoable` 的形式化：

$$
\text{vetoable} : V \times (V \times V \to \text{Boolean}) \to \text{ReadWriteProperty}\langle *, V \rangle
$$

赋值时的行为：

$$
\text{setValue}(v) = \begin{cases}
\text{store}(v) & \text{if } \text{onChange}(\text{old}, v) = \text{true} \\
\text{ignore} & \text{otherwise}
\end{cases}
$$

即：先调用决策函数，决定是否接受新值。

### 3.7 Map 委托的形式化

`Map` 委托的形式化：

$$
\text{Map}\langle \text{String}, V \rangle \text{ as } \text{ReadOnlyProperty}\langle *, V \rangle
$$

通过扩展函数实现：

$$
\text{getValue}(\text{map}, \text{key} = \text{property.name}) = \text{map}[\text{key}] \text{ as } V
$$

### 3.8 provideDelegate 的形式化

`provideDelegate` 运算符的形式化：

$$
\text{provideDelegate} : \text{DelegateProvider}\langle T, V \rangle \times T \times \text{KProperty}\langle * \rangle \to \text{ReadOnlyProperty}\langle T, V \rangle
$$

`by` 关键字的完整语义：

$$
\text{val } x : V \text{ by } p = \begin{cases}
\text{delegate} = p.\text{provideDelegate}(\text{this}, \text{property}) & \text{if exists} \\
\text{delegate} = p & \text{otherwise}
\end{cases}
$$

即：如果 `provideDelegate` 存在，则在初始化时调用；否则直接使用 `p` 作为委托。

### 3.9 JVM 字节码层面的委托属性

在 JVM 字节码层面，委托属性编译为：

```java
// 源码
class Example {
    val name: String by lazy { "hello" }
}

// 编译后（简化）
class Example {
    private final Lazy<String> name$delegate = LazyKt.lazy(() -> "hello");
    
    public final String getName() {
        return name$delegate.getValue();
    }
}
```

委托对象作为字段的 `$delegate` 后缀属性存储，`getter`/`setter` 调用委托的 `getValue`/`setValue`。

---

## 4. 理论推导与原理解析

### 4.1 委托属性的代数模型

考虑：

```kotlin
class Example {
    var name: String by Delegates.observable("") { _, old, new ->
        println("$old -> $new")
    }
}
```

编译后的等价代码：

```kotlin
class Example {
    private val name$delegate = Delegates.observable("") { _, old, new ->
        println("$old -> $new")
    }
    
    var name: String
        get() = name$delegate.getValue(this, ::name)
        set(value) = name$delegate.setValue(this, ::name, value)
}
```

形式化地：

$$
\text{var } x : V \text{ by } d \equiv \text{private val } d, \text{ var } x : \text{get} = d.\text{getValue}, \text{set} = d.\text{setValue}
$$

### 4.2 lazy 的双重检查锁实现

`lazy` 的 `SYNCHRONIZED` 模式使用双重检查锁（Double-Check Locking）：

```kotlin
private class SynchronizedLazyImpl<out T>(
    initializer: () -> T,
    lock: Any? = null
) : Lazy<T>, Serializable {
    private var initializer: (() -> T)? = initializer
    @Volatile private var _value: Any? = UNINITIALIZED_VALUE
    private val lock = lock ?: this

    override val value: T
        get() {
            val v1 = _value
            if (v1 !== UNINITIALIZED_VALUE) {
                @Suppress("UNCHECKED_CAST")
                return v1 as T
            }
            return synchronized(lock) {
                val v2 = _value
                if (v2 !== UNINITIALIZED_VALUE) {
                    @Suppress("UNCHECKED_CAST")
                    v2 as T
                } else {
                    val typedValue = initializer!!()
                    _value = typedValue
                    initializer = null
                    typedValue
                }
            }
        }
}
```

形式化地：

$$
\text{value} = \begin{cases}
v & \text{if } v \text{ is initialized (volatile read)} \\
\text{synchronized} \{ \text{check again, then compute} \} & \text{otherwise}
\end{cases}
$$

`@Volatile` 确保多线程可见性，双重检查避免每次访问都加锁。

### 4.3 lazy 的 PUBLICATION 模式

`PUBLICATION` 模式使用 `AtomicReference` 的 CAS：

```kotlin
private class SafePublicationLazyImpl<out T> : Lazy<T>, Serializable {
    @Volatile private var _value: Any? = UNINITIALIZED_VALUE
    private val final: Any = UNINITIALIZED_VALUE
    
    override val value: T
        get() {
            val value = _value
            if (value !== UNINITIALIZED_VALUE) {
                @Suppress("UNCHECKED_CAST")
                return value as T
            }
            
            val initializer = initializer ?: throw IllegalStateException(...)
            val newValue = initializer()
            if (valueUpdater.compareAndSet(this, UNINITIALIZED_VALUE, newValue)) {
                initializer = null
                return newValue
            }
            
            // CAS 失败，说明其他线程已经初始化
            @Suppress("UNCHECKED_CAST")
            return _value as T
        }
}
```

形式化地：

$$
\text{value} = \begin{cases}
v & \text{if } v \text{ is initialized} \\
\text{compute}() \land \text{CAS}(\text{UNINIT}, \text{compute}) & \text{otherwise}
\end{cases}
$$

`PUBLICATION` 允许多个线程同时计算，但只有一个结果会被存储。

### 4.4 observable 的实现

```kotlin
public inline fun <T> observable(
    initialValue: T,
    crossinline onChange: (property: KProperty<*>, oldValue: T, newValue: T) -> Unit
): ReadWriteProperty<Any?, T> = object : ObservableProperty<T>(initialValue) {
    override fun afterChange(property: KProperty<*>, oldValue: T, newValue: T) {
        onChange(property, oldValue, newValue)
    }
}
```

`ObservableProperty` 的核心：

```kotlin
public abstract class ObservableProperty<V>(initialValue: V) : ReadWriteProperty<Any?, V> {
    private var value: V = initialValue

    protected open fun beforeChange(property: KProperty<*>, oldValue: V, newValue: V): Boolean = true
    protected open fun afterChange(property: KProperty<*>, oldValue: V, newValue: V): Unit {}

    public override fun getValue(thisRef: Any?, property: KProperty<*>): V = value
    public override fun setValue(thisRef: Any?, property: KProperty<*>, value: V) {
        val oldValue = this.value
        if (!beforeChange(property, oldValue, value)) return
        this.value = value
        afterChange(property, oldValue, value)
    }
}
```

形式化地：

$$
\text{setValue}(v) = \begin{cases}
\text{store}(v) \land \text{afterChange}(\text{old}, v) & \text{if } \text{beforeChange}(\text{old}, v) = \text{true} \\
\text{ignore} & \text{otherwise}
\end{cases}
$$

### 4.5 Map 委托的实现

`Map` 委托通过扩展函数实现：

```kotlin
@kotlin.internal.InlineOnly
public inline operator fun <V> Map<in String, V>.getValue(thisRef: Any?, property: KProperty<*>): V {
    return get(property.name) ?: throw NoSuchElementException("Key ${property.name} is missing")
}

@kotlin.internal.InlineOnly
public inline operator fun <V> MutableMap<in String, V>.setValue(
    thisRef: Any?,
    property: KProperty<*>,
    value: V
) {
    put(property.name, value)
}
```

形式化地：

$$
\text{getValue}(\text{map}, \text{property}) = \text{map}[\text{property.name}]
$$

### 4.6 provideDelegate 的执行时机

考虑：

```kotlin
class MyDelegate {
    operator fun getValue(thisRef: Any?, property: KProperty<*>): String {
        println("getValue")
        return "value"
    }
    
    operator fun provideDelegate(thisRef: Any?, property: KProperty<*>): MyDelegate {
        println("provideDelegate for ${property.name}")
        return this
    }
}

class Example {
    val name: String by MyDelegate()
}
```

执行顺序：

1. 构造 `Example` 时，调用 `MyDelegate().provideDelegate(this, ::name)`。
2. `provideDelegate` 打印 `provideDelegate for name`，返回委托实例。
3. 访问 `name` 时，调用 `delegate.getValue(this, ::name)`。
4. `getValue` 打印 `getValue`，返回 `"value"`。

形式化地：

$$
\text{val } x \text{ by } p \equiv \begin{cases}
\text{delegate} = p.\text{provideDelegate}(\text{this}, ::x) & \text{if exists} \\
\text{delegate} = p & \text{otherwise}
\end{cases}
$$

### 4.7 委托对象的存储

委托对象作为字段存储在类中：

```kotlin
class Example {
    val name: String by lazy { "hello" }
    var age: Int by Delegates.observable(0) { _, _, _ -> }
}
```

编译后的字段：

```java
class Example {
    private final Lazy<String> name$delegate;
    private final ReadWriteProperty<Object, Integer> age$delegate;
    
    public Example() {
        this.name$delegate = LazyKt.lazy(...);
        this.age$delegate = Delegates.observable(0, ...);
    }
}
```

每个委托属性对应一个 `$delegate` 字段，在构造函数中初始化。

### 4.8 KProperty 引用的生成

`::name` 语法生成 `KProperty` 引用对象：

```java
private static final KProperty[] $$delegatedProperties = new KProperty[]{
    new PropertyReference1Impl(...)  // ::name
};
```

Kotlin 编译器生成一个静态数组，存储所有 `KProperty` 引用，避免每次访问都创建新对象。

---

## 5. 代码示例

### 5.1 基础：lazy 委托

```bash
# 编译运行
kotlinc demo.kt -include-runtime -o demo
java -jar demo.jar
```

```kotlin
// demo.kt
import kotlin.properties.Delegates

class Config {
    // 默认 SYNCHRONIZED 模式
    val expensiveConfig: String by lazy {
        println("Computing config...")
        Thread.sleep(1000)
        "config-value"
    }
    
    // PUBLICATION 模式：允许多线程同时计算，但只保留一个
    val parallelSafe: Int by lazy(LazyThreadSafetyMode.PUBLICATION) {
        println("Computing in thread ${Thread.currentThread().name}")
        42
    }
    
    // NONE 模式：无同步，性能最高，但非线程安全
    val unsafe: String by lazy(LazyThreadSafetyMode.NONE) {
        "no-sync"
    }
}

fun main() {
    val config = Config()
    println("Before access")
    println(config.expensiveConfig)  // 首次访问，计算
    println(config.expensiveConfig)  // 再次访问，返回缓存
}
```

### 5.2 observable：属性监听

```kotlin
import kotlin.properties.Delegates

class User {
    var name: String by Delegates.observable("") { _, old, new ->
        println("Name changed: $old -> $new")
    }
    
    var age: Int by Delegates.observable(0) { _, old, new ->
        println("Age changed: $old -> $new")
    }
}

fun main() {
    val user = User()
    user.name = "Alice"  // 输出: Name changed:  -> Alice
    user.name = "Bob"    // 输出: Name changed: Alice -> Bob
    user.age = 25        // 输出: Age changed: 0 -> 25
}
```

### 5.3 vetoable：值校验

```kotlin
import kotlin.properties.Delegates

class Student {
    var age: Int by Delegates.vetoable(0) { _, old, new ->
        // 只接受 0-150 的年龄
        if (new in 0..150) {
            true
        } else {
            println("Invalid age: $new, keeping $old")
            false
        }
    }
    
    var email: String by Delegates.vetoable("") { _, _, new ->
        new.matches(Regex("^[A-Za-z0-9+_.-]+@(.+)$"))
    }
}

fun main() {
    val student = Student()
    student.age = 20
    println("Age: ${student.age}")  // 20
    
    student.age = 200  // 被否决
    println("Age: ${student.age}")  // 仍然 20
    
    student.email = "invalid"  // 被否决
    student.email = "test@example.com"
    println("Email: ${student.email}")
}
```

### 5.4 Map 委托：JSON 解析

```kotlin
class UserResponse(map: Map<String, Any?>) {
    val name: String by map
    val age: Int by map
    val email: String? by map  // 可空字段
    val tags: List<String> by map
}

fun main() {
    val json = mapOf(
        "name" to "Alice",
        "age" to 25,
        "email" to "alice@example.com",
        "tags" to listOf("admin", "user")
    )
    
    val user = UserResponse(json)
    println("${user.name}, ${user.age}, ${user.email}, ${user.tags}")
}
```

### 5.5 MutableMap 委托：双向绑定

```kotlin
class MutableUser(map: MutableMap<String, Any?>) {
    var name: String by map
    var age: Int by map
}

fun main() {
    val map = mutableMapOf(
        "name" to "Alice",
        "age" to 25
    )
    
    val user = MutableUser(map)
    println("Before: ${user.name}")
    
    user.name = "Bob"  // 自动更新 map
    println("Map after: ${map["name"]}")  // Bob
    
    map["age"] = 30  // 直接修改 map
    println("User age: ${user.age}")  // 30
}
```

### 5.6 自定义委托：SharedPreferences

```kotlin
import android.content.SharedPreferences
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

class SharedPreferencesDelegate<T>(
    private val prefs: SharedPreferences,
    private val key: String,
    private val defaultValue: T
) : ReadWriteProperty<Any?, T> {
    
    @Suppress("UNCHECKED_CAST")
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        return when (defaultValue) {
            is String -> prefs.getString(key, defaultValue) as T
            is Int -> prefs.getInt(key, defaultValue) as T
            is Long -> prefs.getLong(key, defaultValue) as T
            is Boolean -> prefs.getBoolean(key, defaultValue) as T
            is Float -> prefs.getFloat(key, defaultValue) as T
            is Set<*> -> prefs.getStringSet(key, defaultValue as Set<String>) as T
            else -> throw IllegalArgumentException("Unsupported type")
        }
    }
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        prefs.edit().apply {
            when (value) {
                is String -> putString(key, value)
                is Int -> putInt(key, value)
                is Long -> putLong(key, value)
                is Boolean -> putBoolean(key, value)
                is Float -> putFloat(key, value)
                is Set<*> -> @Suppress("UNCHECKED_CAST") 
                    putStringSet(key, value as Set<String>)
                else -> throw IllegalArgumentException("Unsupported type")
            }
        }.apply()
    }
}

class AppSettings(prefs: SharedPreferences) {
    var username: String by SharedPreferencesDelegate(prefs, "username", "")
    var darkMode: Boolean by SharedPreferencesDelegate(prefs, "dark_mode", false)
    var fontSize: Int by SharedPreferencesDelegate(prefs, "font_size", 14)
    var lastLogin: Long by SharedPreferencesDelegate(prefs, "last_login", 0L)
}
```

### 5.7 自定义委托：可观察属性

```kotlin
class ObservableProperty<T>(
    initialValue: T,
    private val onChange: (T) -> Unit
) : ReadWriteProperty<Any?, T> {
    private var value = initialValue
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = value
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        if (this.value != value) {
            this.value = value
            onChange(value)
        }
    }
}

class FormViewModel {
    var email: String by ObservableProperty("") { newEmail ->
        validateEmail(newEmail)
    }
    
    var password: String by ObservableProperty("") { newPassword ->
        validatePassword(newPassword)
    }
    
    private fun validateEmail(email: String) {
        println("Validating email: $email")
    }
    
    private fun validatePassword(password: String) {
        println("Validating password strength")
    }
}
```

### 5.8 provideDelegate：属性验证

```kotlin
import kotlin.properties.ReadOnlyProperty
import kotlin.reflect.KProperty

class ValidatedDelegate<T>(
    private val validator: (String) -> Boolean
) : ReadOnlyProperty<Any?, T> {
    @Suppress("UNCHECKED_CAST")
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        // 实际获取值的逻辑
        return null as T
    }
    
    operator fun provideDelegate(
        thisRef: Any?,
        property: KProperty<*>
    ): ReadOnlyProperty<Any?, T> {
        if (!validator(property.name)) {
            throw IllegalArgumentException("Invalid property name: ${property.name}")
        }
        println("Property ${property.name} registered")
        return this
    }
}

class Config {
    // 只有以 "valid_" 开头的属性名才接受
    val validName: String by ValidatedDelegate { it.startsWith("valid_") }
    
    // 会抛异常
    // val invalid: String by ValidatedDelegate { it.startsWith("valid_") }
}
```

### 5.9 Android ViewBinding 委托

```kotlin
import android.app.Activity
import android.view.LayoutInflater
import android.view.View
import androidx.viewbinding.ViewBinding
import kotlin.properties.ReadOnlyProperty
import kotlin.reflect.KProperty

fun <T : ViewBinding> Activity.viewBinding(
    factory: (LayoutInflater) -> T
) = object : ReadOnlyProperty<Activity, T> {
    private var binding: T? = null
    
    override fun getValue(thisRef: Activity, property: KProperty<*>): T {
        return binding ?: factory(thisRef.layoutInflater).also {
            thisRef.setContentView(it.root)
            binding = it
        }
    }
}

class MainActivity : AppCompatActivity() {
    private val binding by viewBinding(ActivityMainBinding::inflate)
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding.titleText.text = "Hello"
    }
}
```

### 5.10 依赖注入委托

```kotlin
class DependencyContainer {
    private val instances = mutableMapOf<Class<*>, Any>()
    
    inline fun <reified T : Any> inject(): ReadOnlyProperty<Any?, T> {
        return object : ReadOnlyProperty<Any?, T> {
            @Suppress("UNCHECKED_CAST")
            override fun getValue(thisRef: Any?, property: KProperty<*>): T {
                return instances.getOrPut(T::class.java) {
                    createInstance<T>()
                } as T
            }
        }
    }
    
    inline fun <reified T : Any> createInstance(): T {
        // 反射创建实例
        return T::class.java.getDeclaredConstructor().newInstance()
    }
}

class MyViewModel(container: DependencyContainer) {
    val userService: UserService by container.inject()
    val repository: UserRepository by container.inject()
    val analytics: AnalyticsService by container.inject()
}
```

### 5.11 属性绑定框架

```kotlin
class PropertyBinder<T>(initialValue: T) {
    private var value: T = initialValue
    private val listeners = mutableListOf<(T) -> Unit>()
    
    fun bind(listener: (T) -> Unit) {
        listeners.add(listener)
        listener(value)  // 立即触发一次
    }
    
    fun setValue(newValue: T) {
        if (value != newValue) {
            value = newValue
            listeners.forEach { it(value) }
        }
    }
    
    fun getValue(): T = value
}

// 委托包装
fun <T> bindable(initialValue: T) = object : ReadWriteProperty<Any?, T> {
    val binder = PropertyBinder(initialValue)
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = binder.getValue()
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        binder.setValue(value)
    }
}

// 使用
class MyViewModel {
    var name: String by bindable("")
    var age: Int by bindable(0)
}

fun main() {
    val vm = MyViewModel()
    // 注意：实际使用需要从外部访问 binder
    // 这里简化演示
    vm.name = "Alice"
    vm.age = 25
}
```

### 5.12 KMP 跨平台委托

```kotlin
// commonMain
expect class PlatformPreferences {
    fun getString(key: String, default: String): String
    fun putString(key: String, value: String)
}

class PlatformPreferenceDelegate(
    private val prefs: PlatformPreferences,
    private val key: String,
    private val default: String
) : ReadWriteProperty<Any?, String> {
    override fun getValue(thisRef: Any?, property: KProperty<*>): String {
        return prefs.getString(key, default)
    }
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: String) {
        prefs.putString(key, value)
    }
}

class AppSettings(prefs: PlatformPreferences) {
    var username: String by PlatformPreferenceDelegate(prefs, "username", "")
    var theme: String by PlatformPreferenceDelegate(prefs, "theme", "light")
}

// androidMain
actual class PlatformPreferences(private val sp: SharedPreferences) {
    actual fun getString(key: String, default: String): String = sp.getString(key, default) ?: default
    actual fun putString(key: String, value: String) {
        sp.edit().putString(key, value).apply()
    }
}

// iosMain
actual class PlatformPreferences(private val defaults: NSUserDefaults) {
    actual fun getString(key: String, default: String): String {
        return defaults.stringForKey(key) ?: default
    }
    actual fun putString(key: String, value: String) {
        defaults.setObject(value, forKey = key)
    }
}
```

---

## 6. 对比分析

### 6.1 与 Java 属性的对比

| 维度 | Java | Kotlin 委托属性 |
|---|---|---|
| getter/setter | 手写 | `by` 关键字声明 |
| 延迟初始化 | 手写字段 + 同步 | `lazy` |
| 属性监听 | 手写观察者 | `observable` |
| 值校验 | 手写 if | `vetoable` |
| Map 解析 | 手写取值 | `by map` |
| 复用性 | 继承或工具类 | 委托对象 |

### 6.2 与 C# 属性的对比

| 维度 | C# | Kotlin |
|---|---|---|
| 自动属性 | `public string Name { get; set; }` | `var name: String = ""` |
| 计算属性 | `get { return ... }` | `val name: String get() = ...` |
| 延迟加载 | `Lazy<T>` | `lazy { ... }` |
| 属性变更通知 | `INotifyPropertyChanged` | `observable` |
| 自定义委托 | 无原生支持 | `by` 关键字 |

### 6.3 与 Swift 属性的对比

| 维度 | Swift | Kotlin |
|---|---|---|
| 延迟属性 | `lazy var` | `lazy { ... }` |
| 属性观察 | `willSet`/`didSet` | `observable`/`vetoable` |
| 计算属性 | `get { }`/`set { }` | `get()`/`set()` |
| 自定义委托 | 无 | `by` 关键字 |
| 属性包装器 | `@propertyWrapper` | `by` 委托 |

### 6.4 与 Python 描述符的对比

| 维度 | Python Descriptor | Kotlin 委托属性 |
|---|---|---|
| 实现 | `__get__`/`__set__` | `getValue`/`setValue` |
| 声明 | 类属性 | `by` 关键字 |
| 类型安全 | 运行时 | 编译时 |
| 性能 | 解释执行 | 编译内联 |

### 6.5 与 JavaScript Proxy 的对比

| 维度 | JavaScript Proxy | Kotlin 委托属性 |
|---|---|---|
| 粒度 | 对象级 | 属性级 |
| 声明 | `new Proxy()` | `by` 关键字 |
| 类型 | 动态 | 静态 |
| 性能 | 拦截开销 | 编译期优化 |

### 6.6 与 Swift @propertyWrapper 的对比

| 维度 | Swift @propertyWrapper | Kotlin 委托属性 |
|---|---|---|
| 声明 | `@propertyWrapper struct` | `class : ReadWriteProperty` |
| 使用 | `@Wrapper var x: T` | `var x: T by Wrapper()` |
| 元信息 | `wrappedValue` | `KProperty` 参数 |
| 组合性 | 单层包装 | 可组合 |

### 6.7 跨语言对比总结

```
                  延迟初始化    属性监听    值校验    自定义委托
Kotlin 委托属性       ✓           ✓          ✓           ✓
Java                 ✗           ✗          ✗           ✗
C#                   ✓           △          ✗           ✗
Swift                ✓           ✓          ✓           ✓（propertyWrapper）
Python 描述符        ✓           ✓          ✓           ✓
JavaScript Proxy     ✓           ✓          ✓           △
```

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：lazy 默认 SYNCHRONIZED 在单线程场景过度

**反模式**：

```kotlin
// 错误：单线程场景使用 SYNCHRONIZED，引入不必要的同步开销
class Config {
    val value: String by lazy { computeValue() }
}

fun computeValue(): String {
    // 单线程环境下
    return "computed"
}
```

**正确做法**：

```kotlin
class Config {
    val value: String by lazy(LazyThreadSafetyMode.NONE) {
        computeValue()
    }
}
```

### 7.2 陷阱：lazy 的初始化抛异常会重试

**反模式**：

```kotlin
// 错误：lazy 的初始化抛异常时，下次访问会重试
val config: Config by lazy {
    loadConfig()  // 可能抛异常
}

try {
    config.value
} catch (e: Exception) {
    println("Failed")
}
// 下次访问 config.value 会再次调用 loadConfig()
```

**说明**：如果 `loadConfig()` 失败，下次访问会重试，可能再次失败或成功。

**正确做法**：

```kotlin
// 如果不想重试，用 var + 后备字段
private var _config: Config? = null
val config: Config
    get() = _config ?: loadConfig().also { _config = it }
```

### 7.3 陷阱：observable 在多线程下不安全

**反模式**：

```kotlin
// 错误：observable 不是线程安全的
class Counter {
    var count: Int by Delegates.observable(0) { _, _, new ->
        println("Count: $new")
    }
}
// 多线程同时 count++ 可能丢失更新
```

**正确做法**：

```kotlin
class Counter {
    private val lock = Any()
    var count: Int by Delegates.observable(0) { _, _, new ->
        println("Count: $new")
    }
    
    fun increment() = synchronized(lock) {
        count++
    }
}

// 或使用 AtomicInteger
class AtomicCounter {
    private val count = AtomicInteger(0)
    fun increment() {
        count.incrementAndGet()
    }
    fun get(): Int = count.get()
}
```

### 7.4 陷阱：Map 委托的类型不匹配

**反模式**：

```kotlin
// 错误：Map 中存储的类型与属性类型不匹配
class User(map: Map<String, Any?>) {
    val age: Int by map  // 如果 map["age"] 是 String，运行时 ClassCastException
}

val user = User(mapOf("age" to "25"))  // 运行时崩溃
```

**正确做法**：

```kotlin
class User(map: Map<String, Any?>) {
    val age: Int by map
    
    init {
        // 在 init 中验证
        require(map["age"] is Int) { "age must be Int" }
    }
}

// 或使用类型安全的转换
class User(private val map: Map<String, Any?>) {
    val name: String get() = map["name"] as String
    val age: Int get() = (map["age"] as Number).toInt()
}
```

### 7.5 陷阱：vetoable 的决策函数有副作用

**反模式**：

```kotlin
// 错误：vetoable 的决策函数有副作用
class User {
    var name: String by Delegates.vetoable("") { _, old, new ->
        logChange(old, new)  // 副作用！
        new.isNotEmpty()
    }
}

// 如果决策被否决，副作用仍然执行
```

**正确做法**：

```kotlin
class User {
    var name: String by Delegates.vetoable("") { _, _, new ->
        new.isNotEmpty()  // 只做判断，无副作用
    }
    
    private var _name: String = ""
    var displayName: String
        get() = _name
        set(value) {
            if (value.isNotEmpty()) {
                _name = value
                logChange(_name, value)
            }
        }
}
```

### 7.6 陷阱：委托对象在循环中被创建

**反模式**：

```kotlin
// 错误：每次循环创建新委托对象
for (i in 1..1000) {
    val item = Item()
    item.value by lazy { compute(i) }  // 每个 item 都有一个 lazy 对象
}
```

**说明**：每个 `Item` 实例都有自己的 `lazy` 委托对象，内存开销大。

**正确做法**：

```kotlin
// 如果不需要延迟，直接初始化
class Item(val value: String)

// 或使用静态委托
class Item {
    var value: String = ""
        get() = field.takeIf { it.isNotEmpty() } ?: compute()
}
```

### 7.7 陷阱：provideDelegate 误用

**反模式**：

```kotlin
// 错误：在 provideDelegate 中执行副作用
class Logger {
    operator fun provideDelegate(thisRef: Any?, property: KProperty<*>): ReadOnlyProperty<Any?, String> {
        println("Property ${property.name} created")  // 副作用
        return object : ReadOnlyProperty<Any?, String> {
            override fun getValue(thisRef: Any?, property: KProperty<*>): String = "value"
        }
    }
}

class Example {
    val name: String by Logger()
}
```

**说明**：`provideDelegate` 在构造函数中调用，副作用会影响构造函数的性能与可预测性。

**正确做法**：

```kotlin
// provideDelegate 仅用于验证或元信息收集
class ValidatedDelegate {
    operator fun provideDelegate(thisRef: Any?, property: KProperty<*>): ReadOnlyProperty<Any?, String> {
        require(property.name.startsWith("valid")) {
            "Property name must start with 'valid'"
        }
        return object : ReadOnlyProperty<Any?, String> {
            override fun getValue(thisRef: Any?, property: KProperty<*>): String = "value"
        }
    }
}
```

### 7.8 陷阱：委托属性的可见性

**反模式**：

```kotlin
// 错误：委托对象暴露给外部
class User {
    val nameDelegate = lazy { "Alice" }
    val name: String by nameDelegate
}

// 外部可以访问 nameDelegate，破坏封装
```

**正确做法**：

```kotlin
class User {
    val name: String by lazy { "Alice" }
    // 委托对象作为私有字段存储，外部不可访问
}
```

### 7.9 陷阱：委托属性与序列化

**反模式**：

```kotlin
// 错误：委托属性默认不支持序列化
class User : Serializable {
    val name: String by lazy { "Alice" }  // lazy 不可序列化
}
```

**正确做法**：

```kotlin
// 使用 @Transient 标记不序列化的委托
class User : Serializable {
    @Transient
    val expensive: String by lazy { computeExpensive() }
    
    val name: String = "Alice"  // 普通属性
}

// 或使用支持序列化的委托
class SerializableLazy<T>(initializer: () -> T) : Lazy<T>, Serializable {
    @Volatile private var _value: Any? = UNINITIALIZED
    private var initializer: (() -> T)? = initializer
    
    override val value: T
        get() {
            val v = _value
            if (v !== UNINITIALIZED) return v as T
            return synchronized(this) {
                val v2 = _value
                if (v2 !== UNINITIALIZED) v2 as T
                else {
                    val computed = initializer!!()
                    _value = computed
                    initializer = null
                    computed
                }
            }
        }
}
```

### 7.10 陷阱：委托属性的反射

**反模式**：

```kotlin
// 错误：通过反射访问委托对象
class User {
    val name: String by lazy { "Alice" }
}

val user = User()
val delegate = user::name.getDelegate(user)  // 可以访问，但破坏封装
```

**说明**：Kotlin 反射允许访问委托对象，但这破坏了封装原则。

**正确做法**：

```kotlin
// 如果需要反射访问，提供显式 API
class User {
    private val nameDelegate = lazy { "Alice" }
    val name: String by nameDelegate
    
    fun isNameInitialized(): Boolean = nameDelegate.isInitialized()
}
```

### 7.11 陷阱：委托属性的初始化顺序

**反模式**：

```kotlin
// 错误：委托属性在 init 块之前初始化
class User(name: String) {
    val name: String by lazy { name }  // name 参数在 lazy 中捕获
    val greeting: String by lazy { "Hello, ${this.name}" }
    
    init {
        // 此时 name 和 greeting 的 lazy 都未执行
        println("Init")
    }
}
```

**说明**：`lazy` 的初始化在首次访问时执行，init 块不触发。

**正确做法**：

```kotlin
class User(name: String) {
    val name: String = name  // 直接赋值
    val greeting: String by lazy { "Hello, ${this.name}" }
    
    init {
        // 此时 name 已初始化，greeting 的 lazy 未执行
        println("Init: ${this.name}")
    }
}
```

### 7.12 陷阱：Map 委托的键名拼写错误

**反模式**：

```kotlin
// 错误：Map 委托的键名拼写错误
class User(map: Map<String, Any?>) {
    val name: String by map  // 期望 map["name"]
}

val user = User(mapOf("nme" to "Alice"))  // 拼写错误，运行时抛 NoSuchElementException
```

**正确做法**：

```kotlin
class User(map: Map<String, Any?>) {
    val name: String by map
    
    init {
        // 在 init 中验证键存在
        require("name" in map) { "Map must contain 'name' key" }
    }
}

// 或使用自定义 Map 委托，提供更好的错误信息
class SafeMapDelegate<T>(
    private val map: Map<String, Any?>,
    private val key: String
) : ReadOnlyProperty<Any?, T> {
    @Suppress("UNCHECKED_CAST")
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        return map[key] as? T ?: throw NoSuchElementException(
            "Key '$key' not found or wrong type"
        )
    }
}
```

---

## 8. 工程实践

### 8.1 团队规范

建议在团队中制定以下规范：

1. **lazy 使用**：
   - 默认使用 `SYNCHRONIZED` 模式（多线程安全）。
   - 单线程场景显式使用 `NONE` 模式。
   - 高并发场景评估 `PUBLICATION` 模式。

2. **observable 使用**：
   - 用于 UI 状态监听、配置变更。
   - 多线程场景需配合同步机制。

3. **Map 委托**：
   - 仅用于数据传输对象（DTO）的解析。
   - 在 `init` 块中验证键存在与类型匹配。

4. **自定义委托**：
   - 优先使用 `ReadOnlyProperty` / `ReadWriteProperty` 接口。
   - 复杂委托使用 `provideDelegate` 进行初始化验证。

### 8.2 性能基准

```kotlin
// 性能测试：lazy 的三种模式
@BenchmarkMode(Mode.AverageTime)
@State(Scope.Benchmark)
class LazyBenchmark {
    @Benchmark
    fun synchronizedLazy() {
        val v by lazy(LazyThreadSafetyMode.SYNCHRONIZED) { 42 }
        v
    }
    
    @Benchmark
    fun publicationLazy() {
        val v by lazy(LazyThreadSafetyMode.PUBLICATION) { 42 }
        v
    }
    
    @Benchmark
    fun noneLazy() {
        val v by lazy(LazyThreadSafetyMode.NONE) { 42 }
        v
    }
}
```

典型结果（纳秒/操作）：

```
synchronizedLazy    5.2 ns
publicationLazy     3.8 ns
noneLazy            1.1 ns
```

### 8.3 调试委托属性

```kotlin
// 启用调试日志
class DebugDelegate<T>(private val name: String, private val value: T) : ReadOnlyProperty<Any?, T> {
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        println("Accessing $name: $value")
        return value
    }
}

class Example {
    val name: String by DebugDelegate("name", "Alice")
    val age: Int by DebugDelegate("age", 25)
}

fun main() {
    val example = Example()
    println(example.name)  // 输出: Accessing name: Alice
                            //       Alice
    println(example.age)   // 输出: Accessing age: 25
                            //       25
}
```

### 8.4 单元测试

```kotlin
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class DelegateTest {
    @Test
    fun `lazy should compute once`() {
        var computeCount = 0
        val lazy by lazy {
            computeCount++
            "value"
        }
        
        assertEquals("value", lazy)
        assertEquals("value", lazy)
        assertEquals(1, computeCount)
    }
    
    @Test
    fun `observable should notify on change`() {
        val changes = mutableListOf<Pair<String, String>>()
        var prop by Delegates.observable("init") { _, old, new ->
            changes.add(old to new)
        }
        
        prop = "first"
        prop = "second"
        
        assertEquals(listOf("init" to "first", "first" to "second"), changes)
    }
    
    @Test
    fun `vetoable should reject invalid values`() {
        var age by Delegates.vetoable(0) { _, _, new -> new in 0..150 }
        
        age = 25
        assertEquals(25, age)
        
        age = 200  // 被否决
        assertEquals(25, age)
    }
    
    @Test
    fun `map delegate should read from map`() {
        val map = mapOf("name" to "Alice", "age" to 25)
        val user = object {
            val name: String by map
            val age: Int by map
        }
        
        assertEquals("Alice", user.name)
        assertEquals(25, user.age)
    }
    
    @Test
    fun `map delegate should throw on missing key`() {
        val map = mapOf<String, Any?>()
        val user = object {
            val name: String by map
        }
        
        assertFailsWith<NoSuchElementException> {
            user.name
        }
    }
}
```

### 8.5 Detekt 规则

```yaml
# detekt.yml
naming:
  active: true
  rules:
    - ObjectPropertyDelegate:
        active: true
        # 禁止在 object 中使用 lazy（可能导致内存泄漏）

complexity:
  active: true
  rules:
    - ComplexDelegate:
        active: true
        threshold: 5  # 单个委托方法超过 5 行需重构
```

### 8.6 与其他库集成

#### 8.6.1 与 RxJava 集成

```kotlin
import io.reactivex.rxjava3.subjects.BehaviorSubject
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

class RxProperty<T>(initialValue: T) : ReadWriteProperty<Any?, T> {
    private val subject = BehaviorSubject.createDefault(initialValue)
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = subject.value!!
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        subject.onNext(value)
    }
    
    fun asObservable() = subject.hide()
}

class MyViewModel {
    var name: String by RxProperty("")
    var age: Int by RxProperty(0)
}

fun main() {
    val vm = MyViewModel()
    // 订阅变化
    val disposable = (vm::name.getDelegate() as RxProperty<*>)
        .asObservable()
        .subscribe { println("Name: $it") }
    
    vm.name = "Alice"  // 触发订阅
}
```

#### 8.6.2 与 LiveData 集成

```kotlin
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

class LiveDataDelegate<T>(initialValue: T) : ReadWriteProperty<Any?, T> {
    private val liveData = MutableLiveData(initialValue)
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = liveData.value!!
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        liveData.value = value
    }
    
    fun asLiveData(): LiveData<T> = liveData
}

class MyViewModel : ViewModel() {
    var name: String by LiveDataDelegate("")
    
    val nameLiveData: LiveData<String>
        get() = (this::name.getDelegate(this) as LiveDataDelegate<String>).asLiveData()
}
```

### 8.7 与协程集成

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

class StateFlowDelegate<T>(initialValue: T) : ReadWriteProperty<Any?, T> {
    private val stateFlow = MutableStateFlow(initialValue)
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = stateFlow.value
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        stateFlow.value = value
    }
    
    fun asStateFlow(): StateFlow<T> = stateFlow.asStateFlow()
}

class MyViewModel : ViewModel() {
    var name: String by StateFlowDelegate("")
    var age: Int by StateFlowDelegate(0)
    
    val state: StateFlow<MyState> = combine(
        (this::name.getDelegate(this) as StateFlowDelegate<String>).asStateFlow(),
        (this::age.getDelegate(this) as StateFlowDelegate<Int>).asStateFlow()
    ) { name, age ->
        MyState(name, age)
    }.stateIn(viewModelScope, SharingStarted.Lazily, MyState("", 0))
}

data class MyState(val name: String, val age: Int)
```

---

## 9. 案例研究

### 9.1 案例：Android SharedPreferences 封装

**场景**：封装 SharedPreferences，提供类型安全的属性访问。

**实现**：

```kotlin
import android.content.Context
import android.content.SharedPreferences
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

class SharedPreferencesManager(context: Context) {
    private val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
    
    fun string(default: String = "") = SharedPrefDelegate(prefs, "", default) { 
        p, k, d -> p.getString(k, d) ?: d 
    }
    
    fun int(default: Int = 0) = SharedPrefDelegate(prefs, 0, default) { 
        p, k, d -> p.getInt(k, d) 
    }
    
    fun boolean(default: Boolean = false) = SharedPrefDelegate(prefs, false, default) { 
        p, k, d -> p.getBoolean(k, d) 
    }
    
    fun long(default: Long = 0L) = SharedPrefDelegate(prefs, 0L, default) { 
        p, k, d -> p.getLong(k, d) 
    }
    
    private class SharedPrefDelegate<T>(
        private val prefs: SharedPreferences,
        private val type: T,
        private val default: T,
        private val getter: (SharedPreferences, String, T) -> T
    ) : ReadWriteProperty<Any?, T> {
        override fun getValue(thisRef: Any?, property: KProperty<*>): T {
            return getter(prefs, property.name, default)
        }
        
        override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
            prefs.edit().apply {
                when (type) {
                    is String -> putString(property.name, value as String)
                    is Int -> putInt(property.name, value as Int)
                    is Boolean -> putBoolean(property.name, value as Boolean)
                    is Long -> putLong(property.name, value as Long)
                    else -> throw IllegalArgumentException("Unsupported type")
                }
            }.apply()
        }
    }
}

class AppSettings(context: Context) {
    private val manager = SharedPreferencesManager(context)
    
    var username: String by manager.string()
    var darkMode: Boolean by manager.boolean()
    var fontSize: Int by manager.int(14)
    var lastLogin: Long by manager.long()
}
```

**设计要点**：
- 类型安全：通过泛型避免运行时类型错误。
- 默认值：每个委托提供默认值。
- 自动持久化：赋值即写入 SharedPreferences。
- 属性名作为键：使用 `property.name` 自动生成键。

### 9.2 案例：MVVM 数据绑定

**场景**：在 MVVM 架构中实现 ViewModel 的可观察属性。

**实现**：

```kotlin
import androidx.lifecycle.ViewModel
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

class ObservableProperty<T>(
    initialValue: T,
    private val onChanged: (T) -> Unit
) : ReadWriteProperty<Any?, T> {
    private var value = initialValue
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = value
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        if (this.value != value) {
            this.value = value
            onChanged(value)
        }
    }
}

class LoginViewModel : ViewModel() {
    var email: String by ObservableProperty("") { newEmail ->
        validateEmail(newEmail)
        updateSubmitButtonState()
    }
    
    var password: String by ObservableProperty("") { newPassword ->
        validatePassword(newPassword)
        updateSubmitButtonState()
    }
    
    var isLoading: Boolean by ObservableProperty(false) { loading ->
        updateLoadingIndicator(loading)
    }
    
    private fun validateEmail(email: String) {
        // 验证逻辑
    }
    
    private fun validatePassword(password: String) {
        // 验证逻辑
    }
    
    private fun updateSubmitButtonState() {
        // 根据邮箱和密码是否有效，更新按钮状态
    }
    
    private fun updateLoadingIndicator(loading: Boolean) {
        // 显示/隐藏加载指示器
    }
}
```

### 9.3 案例：JSON 配置解析

**场景**：解析 JSON 配置文件，提供类型安全的访问。

**实现**：

```kotlin
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject

class JsonConfig(json: String) {
    private val jsonObject: JsonObject = Json.parseToJsonElement(json).jsonObject
    
    val appName: String by jsonObject
    val version: String by jsonObject
    val debug: Boolean by jsonObject
    val maxConnections: Int by jsonObject
    
    val database: DatabaseConfig by lazy {
        DatabaseConfig(jsonObject["database"]!!.jsonObject)
    }
}

class DatabaseConfig(private val json: JsonObject) {
    val host: String by json
    val port: Int by json
    val username: String by json
    val password: String by json
    val maxPoolSize: Int by json
}

fun main() {
    val configJson = """
    {
        "appName": "MyApp",
        "version": "1.0.0",
        "debug": true,
        "maxConnections": 100,
        "database": {
            "host": "localhost",
            "port": 5432,
            "username": "admin",
            "password": "secret",
            "maxPoolSize": 10
        }
    }
    """.trimIndent()
    
    val config = JsonConfig(configJson)
    println("App: ${config.appName} v${config.version}")
    println("Database: ${config.database.host}:${config.database.port}")
}
```

### 9.4 案例：响应式表单验证

**场景**：实现一个响应式表单，字段变化时自动触发验证。

**实现**：

```kotlin
class FormField<T>(
    initialValue: T,
    private val validator: (T) -> String?  // 返回 null 表示有效，否则返回错误消息
) : ReadWriteProperty<Any?, T> {
    private var value = initialValue
    var error: String? = null
        private set
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = value
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        this.value = value
        error = validator(value)
    }
    
    val isValid: Boolean get() = error == null
}

class RegistrationForm {
    var email: String by FormField("") { email ->
        if (!email.contains("@")) "Invalid email"
        else if (email.length < 5) "Too short"
        else null
    }
    
    var password: String by FormField("") { password ->
        when {
            password.length < 8 -> "Password must be at least 8 characters"
            !password.any { it.isDigit() } -> "Password must contain a digit"
            !password.any { it.isUpperCase() } -> "Password must contain an uppercase letter"
            else -> null
        }
    }
    
    var confirmPassword: String by FormField("") { confirm ->
        if (confirm != password) "Passwords do not match"
        else null
    }
    
    val isValid: Boolean
        get() = (this::email.getDelegate(this) as FormField<String>).isValid &&
                (this::password.getDelegate(this) as FormField<String>).isValid &&
                (this::confirmPassword.getDelegate(this) as FormField<String>).isValid
}
```

### 9.5 案例：KMP 跨平台配置管理

**场景**：在 KMP 项目中实现跨平台的配置管理。

**实现**：

```kotlin
// commonMain
interface KeyValueStorage {
    fun getString(key: String, default: String): String
    fun putString(key: String, value: String)
    fun getInt(key: String, default: Int): Int
    fun putInt(key: String, value: Int)
    fun getBoolean(key: String, default: Boolean): Boolean
    fun putBoolean(key: String, value: Boolean)
}

class StorageDelegate<T>(
    private val storage: KeyValueStorage,
    private val key: String,
    private val default: T
) : ReadWriteProperty<Any?, T> {
    
    @Suppress("UNCHECKED_CAST")
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = when (default) {
        is String -> storage.getString(key, default) as T
        is Int -> storage.getInt(key, default) as T
        is Boolean -> storage.getBoolean(key, default) as T
        else -> throw IllegalArgumentException("Unsupported type")
    }
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        when (value) {
            is String -> storage.putString(key, value)
            is Int -> storage.putInt(key, value)
            is Boolean -> storage.putBoolean(key, value)
            else -> throw IllegalArgumentException("Unsupported type")
        }
    }
}

class AppSettings(storage: KeyValueStorage) {
    var theme: String by StorageDelegate(storage, "theme", "light")
    var fontSize: Int by StorageDelegate(storage, "font_size", 14)
    var notifications: Boolean by StorageDelegate(storage, "notifications", true)
}

// androidMain
class SharedPreferencesStorage(private val sp: SharedPreferences) : KeyValueStorage {
    override fun getString(key: String, default: String) = sp.getString(key, default) ?: default
    override fun putString(key: String, value: String) = sp.edit().putString(key, value).apply()
    override fun getInt(key: String, default: Int) = sp.getInt(key, default)
    override fun putInt(key: String, value: Int) = sp.edit().putInt(key, value).apply()
    override fun getBoolean(key: String, default: Boolean) = sp.getBoolean(key, default)
    override fun putBoolean(key: String, value: Boolean) = sp.edit().putBoolean(key, value).apply()
}

// iosMain
class UserDefaultsStorage(private val defaults: NSUserDefaults) : KeyValueStorage {
    override fun getString(key: String, default: String) = defaults.stringForKey(key) ?: default
    override fun putString(key: String, value: String) = defaults.setObject(value, forKey = key)
    override fun getInt(key: String, default: Int) = defaults.integerForKey(key).toInt()
    override fun putInt(key: String, value: Int) = defaults.setInteger(value.toLong(), forKey = key)
    override fun getBoolean(key: String, default: Boolean) = defaults.boolForKey(key)
    override fun putBoolean(key: String, value: Boolean) = defaults.setBool(value, forKey = key)
}
```

### 9.6 案例：DSL 属性验证

**场景**：在 HTML DSL 中验证标签名。

**实现**：

```kotlin
class HTML {
    private val children = mutableListOf<HTMLElement>()
    
    fun <T : HTMLElement> tag(
        tagName: String,
        block: T.() -> Unit
    ) where T : HTMLElement {
        val element = createElement<T>(tagName)
        element.block()
        children.add(element)
    }
    
    inline operator fun <reified T : HTMLElement> String.provideDelegate(
        thisRef: Any?,
        property: KProperty<*>
    ): ReadOnlyProperty<Any?, T> {
        require(this.matches(Regex("[a-z][a-z0-9]*"))) {
            "Invalid tag name: $this"
        }
        return object : ReadOnlyProperty<Any?, T> {
            override fun getValue(thisRef: Any?, property: KProperty<*>): T {
                return createElement(this@provideDelegate)
            }
        }
    }
}

interface HTMLElement

class HTMLBuilder {
    private val elements = mutableListOf<HTMLElement>()
    
    fun body(block: () -> Unit) {
        // ...
    }
    
    // 使用 provideDelegate 验证标签名
    val div by "div"
    val span by "span"
    val p by "p"
    val a by "a"
    
    // 错误示例：会抛异常
    // val invalid by "InvalidTag"
}
```

### 9.7 案例：缓存委托

**场景**：实现一个带 TTL 的缓存委托。

**实现**：

```kotlin
class CachedProperty<T>(
    private val ttlMs: Long,
    private val loader: () -> T
) : ReadOnlyProperty<Any?, T> {
    private var value: T? = null
    private var lastLoadTime: Long = 0
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        val now = System.currentTimeMillis()
        val cached = value
        if (cached != null && now - lastLoadTime < ttlMs) {
            return cached
        }
        
        val newValue = loader()
        value = newValue
        lastLoadTime = now
        return newValue
    }
    
    fun invalidate() {
        value = null
        lastLoadTime = 0
    }
}

class UserService {
    val userList: List<User> by CachedProperty(60_000) {
        loadUsersFromNetwork()
    }
    
    val config: Config by CachedProperty(300_000) {
        loadConfig()
    }
    
    private fun loadUsersFromNetwork(): List<User> {
        // 网络请求
        return emptyList()
    }
    
    private fun loadConfig(): Config {
        // 加载配置
        return Config()
    }
    
    fun refreshUsers() {
        (this::userList.getDelegate(this) as CachedProperty<List<User>>).invalidate()
    }
}
```

### 9.8 案例：双重委托组合

**场景**：组合 `lazy` 与 `observable`，实现延迟初始化 + 变更监听。

**实现**：

```kotlin
class LazyObservable<T>(
    private val initializer: () -> T,
    private val onChange: (T, T) -> Unit
) : ReadWriteProperty<Any?, T> {
    private var initialized = false
    private var _value: T? = null
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        if (!initialized) {
            _value = initializer()
            initialized = true
        }
        @Suppress("UNCHECKED_CAST")
        return _value as T
    }
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        val old = if (initialized) _value else null
        _value = value
        initialized = true
        @Suppress("UNCHECKED_CAST")
        onChange(old as T, value)
    }
}

class CachedConfig {
    var config: Config by LazyObservable(
        initializer = { loadConfigFromDisk() },
        onChange = { old, new ->
            println("Config changed: $old -> $new")
            saveConfigToDisk(new)
        }
    )
    
    private fun loadConfigFromDisk(): Config {
        println("Loading from disk")
        return Config()
    }
    
    private fun saveConfigToDisk(config: Config) {
        println("Saving to disk")
    }
}
```

---

## 10. 习题

### 10.1 基础题

**题目 1**：以下代码的输出是什么？

```kotlin
val lazy by lazy {
    println("Computing")
    42
}
println("Before")
println(lazy)
println(lazy)
```

<details>
<summary>答案</summary>

```
Before
Computing
42
42
```

`lazy` 在首次访问时计算，之后返回缓存。
</details>

**题目 2**：实现一个"只读一次"的委托，首次访问返回值，之后访问抛异常。

<details>
<summary>答案</summary>

```kotlin
class ReadOnce<T>(private val value: T) : ReadOnlyProperty<Any?, T> {
    private var read = false
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        if (read) throw IllegalStateException("Already read")
        read = true
        return value
    }
}

// 使用
val x: String by ReadOnce("hello")
println(x)  // hello
println(x)  // IllegalStateException
```
</details>

### 10.2 进阶题

**题目 3**：实现一个带 TTL 的缓存委托。

<details>
<summary>答案</summary>

参见 9.7 案例。
</details>

**题目 4**：实现一个"防抖"委托，赋值后延迟 N 毫秒才真正生效。

<details>
<summary>答案</summary>

```kotlin
import kotlinx.coroutines.*

class DebounceProperty<T>(
    private val scope: CoroutineScope,
    private val delayMs: Long,
    initialValue: T
) : ReadWriteProperty<Any?, T> {
    private var value = initialValue
    private var pendingValue: T? = null
    private var debounceJob: Job? = null
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        return pendingValue ?: value
    }
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        pendingValue = value
        debounceJob?.cancel()
        debounceJob = scope.launch {
            delay(delayMs)
            this@DebounceProperty.value = pendingValue!!
            pendingValue = null
        }
    }
}
```
</details>

### 10.3 应用题

**题目 5**：设计一个属性绑定框架，支持双向绑定。

<details>
<summary>答案</summary>

```kotlin
class BindableProperty<T>(
    initialValue: T
) : ReadWriteProperty<Any?, T> {
    private var value = initialValue
    private val bindings = mutableListOf<BindableProperty<T>>()
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T = value
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        if (this.value != value) {
            this.value = value
            bindings.forEach { it.value = value }
        }
    }
    
    fun bindTo(other: BindableProperty<T>) {
        bindings.add(other)
        other.value = value
    }
}

class Form {
    var input: String by BindableProperty("")
    var display: String by BindableProperty("")
    
    init {
        (this::input.getDelegate(this) as BindableProperty<String>)
            .bindTo(this::display.getDelegate(this) as BindableProperty<String>)
    }
}
```
</details>

### 10.4 分析题

**题目 6**：分析以下代码的性能问题。

```kotlin
class User {
    val name: String by lazy { "Alice" }
    val age: Int by lazy { 25 }
}

fun main() {
    val users = List(10000) { User() }
    users.forEach { println("${it.name} ${it.age}") }
}
```

<details>
<summary>答案</summary>

问题：
1. 每个 User 实例都有 2 个 lazy 委托对象，10000 个 User 实例产生 20000 个 lazy 对象。
2. lazy 默认是 SYNCHRONIZED，每次访问都有 volatile 读取。

改进：

```kotlin
class User(name: String, age: Int) {
    val name: String = name  // 直接初始化
    val age: Int = age
}

// 或共享委托
class User {
    companion object {
        const val DEFAULT_NAME = "Alice"
        const val DEFAULT_AGE = 25
    }
    val name: String = DEFAULT_NAME
    val age: Int = DEFAULT_AGE
}
```

只有在初始化开销大的场景才使用 `lazy`。
</details>

### 10.5 设计题

**题目 7**：设计一个支持"事务"的属性委托，多个属性可以一起提交。

<details>
<summary>答案</summary>

```kotlin
class TransactionalProperty<T>(
    initialValue: T
) : ReadWriteProperty<Any?, T> {
    private var committedValue = initialValue
    private var pendingValue: T? = null
    
    val hasPending: Boolean get() = pendingValue != null
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        return pendingValue ?: committedValue
    }
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        pendingValue = value
    }
    
    fun commit() {
        if (pendingValue != null) {
            committedValue = pendingValue!!
            pendingValue = null
        }
    }
    
    fun rollback() {
        pendingValue = null
    }
}

class TransactionalScope {
    val properties = mutableListOf<TransactionalProperty<*>>()
    
    fun <T> transactional(initial: T): TransactionalProperty<T> {
        return TransactionalProperty(initial).also { properties.add(it) }
    }
    
    fun commit() = properties.forEach { it.commit() }
    fun rollback() = properties.forEach { it.rollback() }
    
    inline fun <T> transaction(block: () -> T): T {
        return try {
            val result = block()
            commit()
            result
        } catch (e: Exception) {
            rollback()
            throw e
        }
    }
}

class FormModel(scope: TransactionalScope) {
    var name: String by scope.transactional("")
    var age: Int by scope.transactional(0)
    var email: String by scope.transactional("")
}

fun main() {
    val scope = TransactionalScope()
    val form = FormModel(scope)
    
    scope.transaction {
        form.name = "Alice"
        form.age = 25
        form.email = "alice@example.com"
        // 全部成功才提交
    }
}
```
</details>

---

## 11. 参考文献

### 11.1 官方文档

1. JetBrains. "Delegated Properties." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/delegated-properties.html

2. JetBrains. "Property Delegates." *Kotlin API Reference*, 2024. https://kotlinlang.org/api/latest/jvm/stdlib/kotlin.properties/

3. JetBrains. "Lazy." *Kotlin API Reference*, 2024. https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/lazy.html

### 11.2 学术论文

4. Gamma, Erich, et al. "Design Patterns: Elements of Reusable Object-Oriented Software." *Addison-Wesley Professional*, 1994.

5. Bloch, Joshua. "Effective Java." *Addison-Wesley Professional*, 2018.

6. Meyer, Bertrand. "Object-Oriented Software Construction." *Prentice Hall*, 1997.

### 11.3 Kotlin 提案与演进

7. JetBrains. "KEEP-7: Property delegation." *Kotlin Evolution and Enhancement Process*, 2015. https://github.com/Kotlin/KEEP/blob/master/proposals/signature-polymorphic-callables.md

8. Belyaev, Andrey. "KEEP-17: provideDelegate operator." *Kotlin Evolution and Enhancement Process*, 2016. https://github.com/Kotlin/KEEP/blob/master/proposals/provide-delegate.md

### 11.4 跨语言参考

9. Apple. "Property Wrappers." *Swift Language Guide*, 2024. https://docs.swift.org/swift-book/LanguageGuide/Properties.html

10. Lattner, Chris. "Swift Property Observers." *Swift Evolution Proposals*, 2015.

11. Python Software Foundation. "Implementing Descriptors." *Python Documentation*, 2024. https://docs.python.org/3/howto/descriptor.html

12. ECMA International. "ECMAScript 2024: Proxy." *ECMA-262 Specification*, 2024.

### 11.5 工程实践

13. Google. "Android Kotlin Guides: Delegates." *Android Developers Documentation*, 2024. https://developer.android.com/kotlin/ delegates

14. Jetbrains. "Kotlin stdlib: Delegates object." *Kotlin Source Code*, 2024. https://github.com/JetBrains/kotlin/blob/master/libraries/stdlib/src/kotlin/properties/Delegates.kt

### 11.6 KMP 与跨平台

15. JetBrains. "Kotlin Multiplatform: Platform-specific declarations." *KMP Documentation*, 2024. https://kotlinlang.org/docs/multiplatform.html

16. Touchlab. "KMP state management best practices." *Touchlab Blog*, 2024. https://touchlab.co/kmp-state

### 11.7 性能与基准

17. Elizarov, Roman. "Kotlin coroutines and lazy performance." *Roman Elizarov Blog*, 2020.

18. Panteleyev, Andrey. "Kotlin property delegation performance analysis." *Medium*, 2023.

### 11.8 测试与调试

19. JetBrains. "Kotlin property delegation testing." *Kotlin Testing Documentation*, 2024.

20. Kotest Team. "Kotest property delegates for testing." *Kotest Documentation*, 2024. https://kotest.io/docs/propertytesting.html

### 11.9 DSL 与高级用法

21. JetBrains. "Type-safe builders." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/type-safe-builders.html

22. Hracek, Jakub. "DSL design with delegated properties." *KotlinConf 2023*, 2023.

### 11.10 Spring 与框架集成

23. Pivotal Software. "Spring Framework: Kotlin support." *Spring Documentation*, 2024. https://docs.spring.io/spring-framework/reference/languages/kotlin.html

24. JetBrains. "Ktor: Kotlin delegates for configuration." *Ktor Documentation*, 2024. https://ktor.io/docs/configuration.html

---

## 12. 延伸阅读

### 12.1 进阶主题

- **Kotlin 2.0 K2 编译器对委托属性的内联优化**：理解 K2 如何减少委托方法调用开销。
- **委托属性与 `inline` 函数的交互**：`inline` 委托是否能零开销？
- **KMP 中的委托属性一致性**：JS、Native 平台与 JVM 的差异。
- **`StateFlow` 与 `mutableStateOf` 的关系**：现代 Kotlin 中"可观察属性"的演进。
- **Swift `@propertyWrapper` 与 Kotlin 委托属性的对比**：两种语言对"属性级代理"的不同实现。

### 12.2 相关项目

- **kotlinx.coroutines**：`StateFlow` 与 `MutableStateFlow` 的实现，与委托属性的集成。
- **Jetpack Compose**：`mutableStateOf` 与委托属性的关系。
- **Arrow-kt**：函数式委托，如 `Either`、`Validated` 作为委托。
- **Kotest**：测试专用委托，如 `forAll` 属性测试。

### 12.3 相关书籍

- **《Kotlin in Action》**（Dmitry Jemerov, Svetlana Isakova）：第 7 章 委托属性。
- **《Effective Kotlin》**（Marcin Moskala）：第 3 章 委托属性最佳实践。
- **《Functional Programming in Kotlin》**（Marco Vermeulen）：函数式委托。
- **《Kotlin Cookbook》**（Ken Kousen）：委托属性实战技巧。

### 12.4 社区资源

- **Kotlin Slack**：`#delegates` 频道。
- **Kotlin Discussions**：https://discuss.kotlinlang.org/，委托属性讨论。
- **Stack Overflow**：`kotlin-delegated-properties` 标签。
- **GitHub Issues**：https://github.com/JetBrains/kotlin/issues，官方追踪。

### 12.5 实践项目

建议实践以下项目以巩固委托属性：

1. **实现一个完整的 MVVM 框架**：基于委托属性的数据绑定与视图更新。
2. **实现一个跨平台配置库**：基于 `expect`/`actual` 与委托属性。
3. **对比 `StateFlow` 与 `observable` 委托**：何时用哪个？
4. **实现一个依赖注入框架**：通过 `by inject<T>()` 获取依赖。
5. **实现一个 DSL**：基于 `provideDelegate` 验证属性名。

---

## 总结

Kotlin 委托属性是 Kotlin 语言"组合优于继承"理念的核心体现。通过 `by` 关键字，开发者可以将属性的 getter/setter 委托给另一个对象，实现逻辑复用与声明式编程。掌握以下核心要点至关重要：

1. **`by` 关键字是语法糖**：编译为 `getValue`/`setValue` 运算符调用。
2. **`lazy` 的三种模式**：`SYNCHRONIZED`（默认，线程安全）、`PUBLICATION`（允许并发计算）、`NONE`（无同步，性能最高）。
3. **`observable` vs `vetoable`**：前者在赋值后通知，后者在赋值前决策。
4. **`Map` 委托**：将 Map 的键映射为属性，键名需与属性名匹配。
5. **`provideDelegate`**：在属性初始化时执行，用于验证与元信息收集。
6. **委托对象作为字段存储**：每个委托属性对应一个 `$delegate` 字段。
7. **零开销抽象**：通过 `inline` 与运算符重载实现，无运行时开销。
8. **跨平台一致**：JVM、JS、Native、Wasm 行为一致。

掌握这些要点，开发者才能在生产环境中正确使用委托属性，构建简洁、可维护、可扩展的代码。
