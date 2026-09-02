---
order: 420
title: Kotlin 与时间
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: kotlinx-datetime
author: fanquanpp
updated: '2026-08-01'
related:
  - 'kotlin/040-KotlinIO'
  - 'kotlin/041-KotlinRegex'
  - 'kotlin/043-KotlinConcurrencySafety'
  - 'kotlin/044-KotlinWebSocket'
prerequisites:
  - 'kotlin/002-KotlinOverviewEnvSetup'
---

## 前置知识

- [Kotlin 与正则表达式](/kotlin/041-KotlinRegex)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

kotlinx-datetime 是 Kotlin 官方的跨平台日期时间库。它基于 ISO 8601 标准，提供了统一的 API 来处理日期、时间、时区等概念。与 Java 的 `java.time` 不同，kotlinx-datetime 从一开始就为 Kotlin 多平台设计，可以在 JVM、JS、Native 等平台上使用。

如果你需要在项目中处理日期、时间计算、时区转换，kotlinx-datetime 是比 `java.util.Date` 或 `java.util.Calendar` 更现代、更安全的选择。

## 基础概念

- **Instant**：时间线上的一个瞬时点，类似于时间戳，不关联任何时区
- **LocalDate**：不包含时间和时区的日期，如 2024-01-15
- **LocalTime**：不包含日期和时区的时间，如 14:30:00
- **LocalDateTime**：日期和时间的组合，但没有时区信息
- **TimeZone**：时区，用于在 Instant 和本地时间之间转换
- **Clock**：时钟抽象，用于获取当前时间，方便测试

## 快速上手

添加依赖：

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.0")
}
```

最基本的使用：

```kotlin
import kotlinx.datetime.*

fun main() {
    // 获取当前时间
    val now = Clock.System.now()
    println("当前时间戳: $now")

    // 获取当前日期（需要指定时区）
    val today = now.toLocalDateTime(TimeZone.currentSystemDefault()).date
    println("今天的日期: $today")

    // 创建指定日期
    val birthday = LocalDate(2000, Month.JANUARY, 15)
    println("生日: $birthday")

    // 日期计算
    val age = today.year - birthday.year
    println("年龄: $age")

    // 时长
    val duration = 30.minutes
    val future = now + duration
    println("30分钟后: $future")
}
```

## 详细用法

### Instant 时间戳操作

```kotlin
import kotlinx.datetime.*

fun instantDemo() {
    // 获取当前时刻
    val now = Clock.System.now()
    println("当前时刻: $now")

    // 从时间戳创建
    val fromEpoch = Instant.fromEpochSeconds(1700000000)
    println("从时间戳创建: $fromEpoch")

    // 获取时间戳的秒数和毫秒数
    println("秒: ${now.epochSeconds}")
    println("毫秒: ${now.toEpochMilliseconds()}")

    // 时间加减
    val tomorrow = now + 1.days
    val nextHour = now + 1.hours
    val nextMinute = now + 30.minutes

    // 时间差
    val duration = tomorrow - now
    println("差值: $duration")  // 1d

    // 比较时间
    println("明天在现在之后: ${tomorrow > now}")
}
```

### LocalDate 日期操作

```kotlin
import kotlinx.datetime.*

fun localDateDemo() {
    // 创建日期
    val date = LocalDate(2024, Month.JUNE, 15)
    println("日期: $date")

    // 从字符串解析
    val parsed = LocalDate.parse("2024-06-15")
    println("解析: $parsed")

    // 获取日期的各个部分
    println("年: ${date.year}")
    println("月: ${date.month}")        // JUNE
    println("月份数字: ${date.monthNumber}")  // 6
    println("日: ${date.dayOfMonth}")
    println("星期: ${date.dayOfWeek}")  // SATURDAY

    // 日期加减
    val nextWeek = date + DatePeriod(days = 7)
    val nextMonth = date + DatePeriod(months = 1)
    val lastYear = date - DatePeriod(years = 1)

    // 日期差
    val start = LocalDate(2024, Month.JANUARY, 1)
    val end = LocalDate(2024, Month.DECEMBER, 31)
    val period = start.until(end)
    println("相差: ${period.years}年${period.months}月${period.days}日")
}
```

### LocalTime 时间操作

```kotlin
import kotlinx.datetime.*

fun localTimeDemo() {
    // 创建时间
    val time = LocalTime(14, 30, 0)
    println("时间: $time")

    // 带纳秒
    val precise = LocalTime(14, 30, 0, 500000000)
    println("精确时间: $precise")

    // 获取时间的各个部分
    println("时: ${time.hour}")
    println("分: ${time.minute}")
    println("秒: ${time.second}")

    // 从字符串解析
    val parsed = LocalTime.parse("14:30:00")
    println("解析: $parsed")

    // 时间加减
    val later = time + 30.minutes
    val earlier = time - 1.hours
    println("30分钟后: $later")
    println("1小时前: $earlier")
}
```

### 时区转换

```kotlin
import kotlinx.datetime.*

fun timeZoneDemo() {
    val now = Clock.System.now()

    // 获取系统默认时区
    val systemTz = TimeZone.currentSystemDefault()
    println("系统时区: $systemTz")

    // 指定时区
    val beijing = TimeZone.of("Asia/Shanghai")
    val tokyo = TimeZone.of("Asia/Tokyo")
    val newYork = TimeZone.of("America/New_York")
    val london = TimeZone.of("Europe/London")

    // 同一时刻在不同时区的本地时间
    val beijingTime = now.toLocalDateTime(beijing)
    val tokyoTime = now.toLocalDateTime(tokyo)
    val newYorkTime = now.toLocalDateTime(newYork)
    val londonTime = now.toLocalDateTime(london)

    println("北京时间: $beijingTime")
    println("东京时间: $tokyoTime")
    println("纽约时间: $newYorkTime")
    println("伦敦时间: $londonTime")

    // 从本地时间转换回 Instant
    val localDateTime = LocalDateTime(2024, 6, 15, 14, 30)
    val instant = localDateTime.toInstant(beijing)
    println("北京时间对应的时刻: $instant")
}
```

### Duration 时长操作

```kotlin
import kotlinx.datetime.*

fun durationDemo() {
    // 创建时长
    val d1 = 30.minutes
    val d2 = 2.hours
    val d3 = 1.days
    val d4 = Duration.seconds(90)
    val d5 = Duration.milliseconds(1500)

    // 时长运算
    val total = d1 + d2
    println("总时长: $total")

    // 时长比较
    println("30分钟 < 2小时: ${d1 < d2}")

    // 时长转换
    println("${d1.inWholeSeconds} 秒")
    println("${d2.inWholeMinutes} 分钟")
    println("${d3.inWholeHours} 小时")

    // 时长乘以倍数
    val triple = d1 * 3
    println("30分钟的3倍: $triple")
}
```

## 常见场景

### 计算年龄

```kotlin
import kotlinx.datetime.*

fun calculateAge(birthday: LocalDate, today: LocalDate = Clock.System.now()
    .toLocalDateTime(TimeZone.currentSystemDefault()).date): Int {
    var age = today.year - birthday.year
    // 如果今年生日还没到，年龄减1
    if (today.monthNumber < birthday.monthNumber ||
        (today.monthNumber == birthday.monthNumber && today.dayOfMonth < birthday.dayOfMonth)) {
        age--
    }
    return age
}

fun main() {
    val birthday = LocalDate(1990, Month.MARCH, 15)
    println("年龄: ${calculateAge(birthday)}")
}
```

### 定时任务的时间计算

```kotlin
import kotlinx.datetime.*

fun nextExecutionTime(intervalMinutes: Int): Instant {
    val now = Clock.System.now()
    return now + intervalMinutes.minutes
}

// 计算距离下一个整点的时间
fun timeToNextHour(): Duration {
    val now = Clock.System.now()
    val localNow = now.toLocalDateTime(TimeZone.currentSystemDefault())
    val nextHour = LocalDateTime(
        localNow.date,
        LocalTime(localNow.hour + 1, 0, 0)
    )
    return nextHour.toInstant(TimeZone.currentSystemDefault()) - now
}
```

### 日期范围遍历

```kotlin
import kotlinx.datetime.*

// 遍历两个日期之间的所有日期
fun dateRange(start: LocalDate, end: LocalDate): List<LocalDate> {
    val dates = mutableListOf<LocalDate>()
    var current = start
    while (current <= end) {
        dates.add(current)
        current = current + DatePeriod(days = 1)
    }
    return dates
}

fun main() {
    val start = LocalDate(2024, Month.JANUARY, 1)
    val end = LocalDate(2024, Month.JANUARY, 7)
    dateRange(start, end).forEach { println(it) }
}
```

## 注意事项

- **kotlinx-datetime 不是 java.time 的替代品**：在 JVM 项目中，两者可以共存。kotlinx-datetime 更适合多平台项目
- **Instant 不可变**：所有日期时间对象都是不可变的，修改操作会返回新对象
- **时区很重要**：在 Instant 和本地时间之间转换时，必须指定时区，否则结果不确定
- **月份从 1 开始**：与 Java 的 Calendar（月份从 0 开始）不同，kotlinx-datetime 的月份从 1 开始
- **Duration 精度**：Duration 的精度为纳秒，转换为整数值时使用 `inWholeSeconds`、`inWholeMinutes` 等方法

## 进阶用法

### 自定义 Clock 用于测试

```kotlin
import kotlinx.datetime.*

class FixedClock(private val fixedInstant: Instant) : Clock {
    override fun now(): Instant = fixedInstant
}

fun main() {
    // 固定时间，用于测试
    val testTime = Instant.parse("2024-06-15T12:00:00Z")
    val testClock = FixedClock(testTime)

    // 使用测试时钟
    val now = testClock.now()
    println("测试时间: $now")  // 始终返回固定时间

    // 在生产代码中注入 Clock，测试时替换为 FixedClock
}
```

### 序列化与反序列化

```kotlin
import kotlinx.datetime.*
import kotlinx.serialization.*
import kotlinx.serialization.json.*

@Serializable
data class Event(
    val name: String,
    // kotlinx-datetime 自带序列化支持
    val startTime: Instant,
    val date: LocalDate,
    val duration: Duration
)

fun main() {
    val event = Event(
        name = "会议",
        startTime = Clock.System.now(),
        date = LocalDate(2024, Month.JUNE, 15),
        duration = 2.hours
    )

    // 序列化为 JSON
    val json = Json { prettyPrint = true }
    val jsonString = json.encodeToString(event)
    println(jsonString)

    // 从 JSON 反序列化
    val decoded = json.decodeFromString<Event>(jsonString)
    println(decoded)
}
```

### 与 Java Time 互操作

```kotlin
import kotlinx.datetime.*
import java.time as jt

fun interoperability() {
    // kotlinx-datetime -> java.time
    val kInstant = Clock.System.now()
    val jInstant = kInstant.toJavaInstant()

    // java.time -> kotlinx-datetime
    val backToKotlin = jInstant.toKotlinInstant()

    // LocalDate 互转
    val kDate = LocalDate(2024, Month.JUNE, 15)
    val jDate = kDate.toJavaLocalDate()
    val backToDate = jDate.toKotlinLocalDate()
}
```
## Duration 时长

**基本写法：创建时长**
`<数字>.<单位>()`
```kotlin
// 不同单位创建 Duration
val d1 = 5.seconds
val d2 = 100.milliseconds
val d3 = 2.hours
```

---

**基本写法：字面量时长**
`<数字>.<单位>`
```kotlin
// Duration 字面量扩展属性
val d = 30.minutes
```

---

**基本写法：时长运算**
`<时长> + <时长> | <时长> * <倍数>`
```kotlin
// 时长加减乘除
val sum = 1.hours + 30.minutes
val half = 1.hours / 2
```

---

**基本写法：转换为单位**
`<duration>.inWholeSeconds | inWholeMilliseconds`
```kotlin
// 转换为整型单位
val s = (1.5.hours).inWholeSeconds
val ms = (1.minutes).inWholeMilliseconds
```

---

**基本写法：比较时长**
`<d1> > <d2> | <d>.compareTo(<d2>)`
```kotlin
// 比较时长大小
if (d1 > d2) { }
```

---

## TimeMark 与测量

**基本写法：获取时间标记**
`TimeSource.Monotonic.markNow()`
```kotlin
// 获取单调时钟标记
val mark = TimeSource.Monotonic.markNow()
```

---

**基本写法：测量经过时长**
`<mark>.elapsedNow()`
```kotlin
// 测量自标记以来的时长
val dur = mark.elapsedNow()
```

---

**基本写法：measureTime 测量代码**
`measureTime { <代码> }`
```kotlin
// 测量代码块耗时
val t = measureTime { doWork() }
println(t)
```

---

**基本写法：测量并返回结果**
`measureTimedValue { <代码> }`
```kotlin
// 同时返回结果与耗时
val (result, time) = measureTimedValue { compute() }
```

---

## kotlinx-datetime 跨平台

**基本写法：获取当前时刻**
`Clock.System.now()`
```kotlin
// 获取当前 Instant
val now = Clock.System.now()
```

---

**基本写法：当前本地日期**
`Clock.System.todayIn(<时区>)`
```kotlin
// 获取指定时区当前日期
val today = Clock.System.todayIn(TimeZone.currentSystemDefault())
```

---

**基本写法：创建 LocalDate**
`LocalDate(<年>, <月>, <日>)`
```kotlin
// 创建指定日期
val d = LocalDate(2025, 7, 31)
```

---

**基本写法：创建 LocalDateTime**
`LocalDateTime(<日期>, <时间>)`
```kotlin
// 创建本地日期时间
val dt = LocalDateTime(LocalDate(2025,7,31), LocalTime(10,30))
```

---

**基本写法：解析日期**
`LocalDate.parse("<字符串>")`
```kotlin
// 解析 ISO 日期字符串
val d = LocalDate.parse("2025-07-31")
```

---

## Instant 操作

**基本写法：加时长**
`<instant>.plus(<duration>)`
```kotlin
// Instant 加时长
val later = now.plus(1.hours)
```

---

**基本写法：计算差值**
`<i1>.minus(<i2>)`
```kotlin
// 两个 Instant 的时长差
val dur = i1.minus(i2)
```

---

**基本写法：转换为时区**
`<instant>.toLocalDateTime(<时区>)`
```kotlin
// 转为指定时区本地时间
val ldt = now.toLocalDateTime(TimeZone.of("Asia/Shanghai"))
```

---

## Instant 与 epoch

**基本写法：从 epoch 秒创建**
`Instant.fromEpochSeconds(<秒>)`
```kotlin
// Unix 秒转 Instant
val i = Instant.fromEpochSeconds(1700000000)
```

---

**基本写法：获取 epoch 秒**
`<instant>.epochSeconds`
```kotlin
// 获取 Unix 秒数
val s = now.epochSeconds
```

---

## DateTimePeriod 日期段

**基本写法：创建日期段**
`DateTimePeriod(years = <年>, months = <月>)`
```kotlin
// 创建年月日时段
val p = DateTimePeriod(years = 1, months = 2)
```

---

**基本写法：加日期段**
`<localDate>.plus(<period>, <时区>)`
```kotlin
// 日期加日期段
val next = d.plus(p, TimeZone.UTC)
```

---

## TimeZone 时区

**基本写法：系统默认时区**
`TimeZone.currentSystemDefault()`
```kotlin
// 获取系统默认时区
val tz = TimeZone.currentSystemDefault()
```

---

**基本写法：指定时区**
`TimeZone.of("<时区ID>")`
```kotlin
// 按名称获取时区
val tz = TimeZone.of("Asia/Shanghai")
```

---

**基本写法：UTC 时区**
`TimeZone.UTC`
```kotlin
// 直接引用 UTC 时区
val utc = TimeZone.UTC
```

---

## 格式化与解析

**基本写法：自定义格式化**
`LocalDate.Format { <配置> }`
```kotlin
// 自定义日期格式
val fmt = LocalDate.Format {
    year(); chars("-"); monthNumber(); chars("-"); dayOfMonth()
}
```

---

**基本写法：按格式解析**
`LocalDate.parse("<字符串>", <format>)`
```kotlin
// 按自定义格式解析
val d = LocalDate.parse("2025/07/31", fmt)
```

---

## DayOfWeek 与 Month

**基本写法：获取星期**
`<localDate>.dayOfWeek`
```kotlin
// 获取星期枚举值
val dow = d.dayOfWeek
```

---

**基本写法：获取月份**
`<localDate>.month`
```kotlin
// 获取月份枚举值
val m = d.month
```

---

## 协程中的延迟

**基本写法：Duration 延迟**
`delay(<duration>)`
```kotlin
// 协程中使用 Duration 延迟
delay(500.milliseconds)
```

---

## 日期比较

**基本写法：判断前/后**
`<d1> < <d2> | <d1>.until(<d2>)`
```kotlin
// 日期前后判断
if (d1 < d2) { }
val until = d1.until(d2)
```
