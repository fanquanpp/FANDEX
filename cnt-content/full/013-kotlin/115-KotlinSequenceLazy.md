---
order: 120
title: Sequence 惰性求值：一条管线，逐元素流动
description: Sequence 与集合链式调用的成本模型：逐操作急切求值 vs 逐元素惰性求值、短路操作、有状态操作对惰性的破坏、无限序列与单次消费约束，附中间集合计数实验与选型口诀。
module: 'kotlin'
category: 后端技术
difficulty: intermediate
author: fanquanpp
updated: '2026-10-05'
related:
  - 'kotlin/110-KotlinCollectionOperation'
  - 'kotlin/120-KotlinCollectionCoroutine'
  - 'kotlin/290-FlowReactiveStream'
  - 'kotlin/400-KotlinBenchmark'
prerequisites:
  - 'kotlin/110-KotlinCollectionOperation'
---

## 前置知识

- 会用 `map`/`filter`/`take` 等集合操作（[集合操作](/kotlin/110-KotlinCollectionOperation)）；
- 语法速查版的 Sequence 入门（[集合与协程](/kotlin/120-KotlinCollectionCoroutine) 的
  「序列」一节）。**分工声明：110/120 讲「怎么写」，本篇只回答一个问题——这条链
  到底执行了多少次、建了几个中间集合、什么时候该切到 Sequence。**

## 学习目标

读完本文你将能够：

1. 用「逐操作急切 vs 逐元素惰性」模型解释集合链与 Sequence 链的行为差异；
2. 说出短路操作与有状态操作分别如何「放大」或「破坏」惰性；
3. 判断一段链式代码该用集合还是 Sequence，并给出成本理由；
4. 安全使用无限序列：`generateSequence`、`sequence { }` 构建器与单次消费约束。

预计 45 到 75 分钟。

## 概念引入：一条链两种命运

同样的链，集合与 Sequence 的执行方式完全不同：

```kotlin
val numbers = (1..1_000_000).toList()

// 集合版：三步，每步新建一个一百万元素的中间 List
val a = numbers
    .map { it * 2 }            // 中间集合 1：一百万元素
    .filter { it % 3 == 0 }    // 中间集合 2：又一百万元素
    .first()                   // 只要第 1 个，但前两步已经全部做完

// Sequence 版：元素一个个流过管线，找到第 1 个匹配立即停止
val b = numbers.asSequence()
    .map { it * 2 }
    .filter { it % 3 == 0 }
    .first()                   // 实际只处理了 1 个元素
```

集合版做了约 200 万次映射与过滤、建了 2 个巨型临时列表，只为取出第一个数；Sequence
版让**一个元素**流完 `map` 到 `filter` 再被 `first` 短路拿走，其余 99 万个元素从未
进入管线。差距不是「快一点」，是「做不做」。

心智模型一句话：**集合链是流水线车间（上一道工序做完，整批半成品搬到下一道）；
Sequence 是传送带（每个产品从入口直接流到出口）**。

## 快速上手：两种求值的三个判别点

```kotlin
fun main() {
    val seq = listOf(1, 2, 3, 4).asSequence()
        .map { println("map $it"); it * 10 }      // 中间操作：只搭管线
        .filter { println("filter $it"); it > 20 }

    println("管线已构建，什么都没执行")            // 此刻无任何输出

    val result = seq.toList()                      // 末端操作触发执行
    println(result)
}
// 输出（逐元素交替，而不是先 map 完再 filter）：
// 管线已构建，什么都没执行
// map 1
// filter 1
// map 2
// filter 2
// map 3
// filter 3
// map 4
// filter 4
// [30, 40]
```

三个判别点，全部可以从模型推出：

1. **中间操作零执行**：`map`/`filter`/`onEach` 只返回包装了上游的 Sequence 对象，
   不碰任何元素；直到末端操作（`toList`/`first`/`sum`/`forEach`...）调用才开始
   拉取数据；
2. **逐元素流动**：输出顺序证明元素是一个个流完整条管线的——没有中间集合可供
   「整批」处理；
3. **末端是拉取的起点**：Sequence 本质是「被末端操作逐个拉取的迭代器链条」，没有
   末端就没有执行。

## 详细用法

### 短路操作：惰性的最大受益者

```kotlin
val big = generateSequence(1) { it + 1 }        // 无限序列：1, 2, 3, ...

// first 在拿到第一个匹配后取消上游，无限序列也能安全消费
val firstSquare = big.map { it * it }.first { it > 100 }   // 121

// take(n)：取够 n 个就不再拉取
val first10 = big.take(10).toList()             // [1..10]

// any / all / none 同样短路
val hasEven = big.any { it > 1_000_000 }        // 到 1000002 就停
```

集合版的 `big.take(10)` 根本无法存在——无限数据集无法先「整批」加工。**能表达
无限** 是 Sequence 与集合的本质分界：Sequence 是「数据源有多长就流多长」的拉模型，
集合必须先把数据全部握在手里。

### 有状态操作：惰性的三个例外

不是所有中间操作都「逐元素零状态」。三类操作需要看到（部分或全部）其他元素，
惰性在这些点打折：

```kotlin
// 1. sorted*：必须收完全部元素才能产出第 1 个（内部先建完整缓冲）
listOf(3, 1, 2).asSequence()
    .sorted()                    // 到这里会缓冲全部元素——惰性在此中断
    .map { it * 10 }

// 2. distinct：内部维护已见元素集合（内存随唯一元素数增长）
listOf(1, 2, 1, 3).asSequence().distinct()

// 3. reversed / shuffle 等聚合类转换：同样需要全量数据
```

工程含义：`sorted()` 之后的「逐元素惰性」优势只剩一半（省了中间集合，但全量缓冲
不可避免）。**把 sorted 尽量放在管线末端**，或先用 `take` 减少参与排序的数据量。

### 无限序列的两种来源

```kotlin
// 来源 1：generateSequence(seed) { next }
// 返回 null 表示序列结束（「null 即终止」约定）
val fib = generateSequence(0 to 1) { (a, b) -> b to (a + b) }
    .map { it.first }
    .takeWhile { it < 100 }
    .toList()                                   // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

// 来源 2：sequence { } 构建器，yield 挂起式产出
val logs = sequence {
    while (true) {
        val line = readLine() ?: break
        yield(line)
    }
}
```

**单次消费约束**：`sequence { }` 构建器产出的序列默认**只能迭代一次**，第二次迭代
抛 `IllegalStateException`（This sequence can be consumed only once）；由集合
`asSequence()` 来的序列可多次迭代。来源决定可重入性——传参给未知调用方时，
把「只能消费一次」写进文档，或每次调用重新生成。

## 成本模型：什么时候切 Sequence

| 数据规模 | 链长度 | 建议 | 理由 |
| --- | --- | --- | --- |
| 几十个元素 | 任意 | 集合 | Sequence 的对象包装开销超过节省 |
| 千级以上 | 2 步以上 | Sequence | 避免多个中间集合的分配与拷贝 |
| 千级以上 | 有短路末端（first/any） | Sequence | 可能只处理极少元素 |
| 任意 | 需要 sorted 全量排序 | 集合也行 | 缓冲不可避免，差距缩小 |
| 无限/流式数据源 | 任意 | 必须 Sequence | 集合装不下 |

口诀：**「大、长、断（短路）、无限」四个条件沾一个，先想 Sequence；全不沾，
老实写集合。** 拿不准就测——[Kotlin 基准测试](/kotlin/400-KotlinBenchmark) 的
JMH 框架一跑便知，别靠感觉。

## 面试题思路

1. 「Sequence 和 List 链式调用的区别？」——用「车间 vs 传送带」模型答三要点：
   执行时机（末端触发）、执行粒度（逐元素 vs 逐操作）、中间集合（无 vs 每步一个）。
   能主动补「sorted 会打破逐元素惰性」是加分线。
2. 「Sequence 和 Flow 有什么区别？」——Sequence 是**同步**拉模型（调用线程逐个
   拉元素，`next()` 不能挂起）；Flow 是**异步**冷流（元素间可挂起、可切调度器、
   带取消与背压语义）。一句话选型：纯 CPU 数据加工用 Sequence，涉及 IO/异步边界
   用 Flow（[Flow 响应式流](/kotlin/290-FlowReactiveStream)）。
3. 「sequence { } 构建器二次迭代会怎样？为什么？」——抛
   IllegalStateException；因为构建器内部的挂起状态机不可重放（数据源通常是外部
   过程，重放语义不明），而集合来源的序列数据是静态的，可以重新拉取。能否答出
   「来源决定可重入性」是这道题的分水岭。

## 动手实验

1. **中间集合计数**：写一个包装 `List` 的类，在 `map`/`filter` 里对静态计数器
   自增并打印创建次数，分别跑集合链与 Sequence 链，数一数中间集合数量（预期：
   集合链 = 链长 - 1，Sequence 链 = 0）。
2. **短路收益测量**：一百万条数据里找第一个匹配（匹配位置故意放在第 3 条），
   集合链 vs Sequence 链计时对比；再把匹配位置挪到最后一条，观察差距收窄——
   体会「短路的收益取决于匹配位置」。
3. **sorted 中断点实验**：构造 `大集合.asSequence().filter { ... }.sorted()
   .map { ... }.first()`，在每步加 `println`，观察 `first` 触发后 sorted 处
   「一口气」吐出全部结果的形态；把 `.sorted()` 删掉再跑，对比执行粒度。
4. **单次消费复现**：`val s = sequence { yield(1); yield(2) }`，`toList()` 两次，
   捕获第二次的异常；换成 `listOf(1, 2).asSequence()` 再试——亲手确认约束的边界。

## 小练习（先自己做，再展开参考实现）

**练习 1：日志扫描器**。给定一个函数 `fun readLines(): Sequence<String>`（逐行
读取大文件，可能无限），找出第一个包含 "ERROR" 且长度超过 80 的行。要求：
不允许把文件读进内存，写完说明你的管线在「第 5000 行才匹配」时各处理了多少行。

提示：`first { }` 短路 + 一个 filter 条件即可，不需要 sorted。

参考实现：

```kotlin
val hit = readLines()
    .filter { "ERROR" in it && it.length > 80 }
    .first()                       // 拿到即停，之后的行不再读取

// 若第 5000 行才匹配：恰好处理 5000 行，每行流经一次 filter，
// 没有任何中间集合——集合版等价代码必须先读完整个文件。
```

自检问题：如果把两个条件拆成两个 `filter`（先查 "ERROR" 再查长度）会改变处理
行数吗？（答：不会——Sequence 的每个元素都会流完整条管线，拆分只影响每行的
判断方式，不影响「读到第几行停」；这是逐元素模型的直接推论。）

**练习 2：迁移选型**。判断以下三段代码该保留集合还是改 Sequence，各写一句理由：

```kotlin
// (a) UI 列表的展示数据：约 50 条
val display = orders.map { it.toView() }.filter { it.visible }.sortedBy { it.date }

// (b) ETL：千万行日志，过滤 + 提取字段 + 聚合计数，末端 reduce
val counts = lines.asSequence().filter { it.isValid }.map { it.key }
    .groupingBy { it }.eachCount()

// (c) 找通讯录里第一个 138 开头的手机号
val target = contacts.first { it.phone.startsWith("138") }
```

参考答案：(a) 保留集合——50 条数据，Sequence 的包装开销不划算，且 `sortedBy`
本来就要全量；(b) 已经是 Sequence，正确——千万行 + 长链，中间集合代价巨大；
(c) 若 `contacts` 本身是内存中的小 List，集合即可（数据量小）；若是数据库游标
转来的大集合，改 `asSequence()` 让 `first` 短路提前停。**数据来源的规模决定
选型，而不是操作符的名称。**

**挑战题（不给参考实现）**：实现 `fun <T> Sequence<T>.interleave(other:
Sequence<T>): Sequence<T>`——两个序列交替取值（a1, b1, a2, b2...），任一序列
结束后把另一个的剩余元素接上。提示：`sequence { }` 构建器 + 两个迭代器。写完
自查：你的实现对无限序列安全吗？两个都是无限序列时，`take(10)` 能正常终止吗？

## 小结

- 集合链是「逐操作、建中间集合」的急切求值；Sequence 是「末端驱动、逐元素流过
  管线」的惰性求值——车间与传送带。
- 短路末端（first/any/take）与无限序列是 Sequence 的独门能力；`sequence { }`
  构建器只能消费一次，来源决定可重入性。
- sorted/distinct 这类有状态操作会缓冲数据，惰性优势打折；sorted 尽量靠后。
- 选型口诀「大、长、断、无限」沾一个先想 Sequence；数据来源规模是判断的第一依据。
- 集合操作语法全集见 [集合操作](/kotlin/110-KotlinCollectionOperation) 与
  [集合与协程](/kotlin/120-KotlinCollectionCoroutine)；异步边界请移步
  [Flow 响应式流](/kotlin/290-FlowReactiveStream)。
