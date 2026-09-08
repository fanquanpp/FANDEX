---
order: 1050
title: Java Stream Gatherers
description: JDK 24 转正的 Stream Gatherers（JEP 485）：windowFixed、windowSliding、scan、fold、mapConcurrent 内置收集器与自定义 Gatherer 完整教程。
module: 'java'
category: 后端技术
difficulty: advanced
author: fanquanpp
updated: '2026-09-08'
related:
  - 'java/030-StreamAPI'
  - 'java/032-StreamCollectorsGroupingBy'
  - 'java/033-JavaFunctionalProgramming'
  - 'java/059-JavaVirtualThread'
prerequisites:
  - 'java/030-StreamAPI'
---

想象一条流水线：`filter`、`map`、`sorted` 这些中间操作都是"一个元素进去、零或一个元素出来"的加工站，它们看不见邻居。可现实需求常常要"回看历史"——把订单按每 3 笔一组打包、计算滑动平均、把连续重复的日志折叠成一条、给一批 URL 做受控并发请求。在 JDK 24 之前，这些只能先 `collect` 成 List 再写循环，Stream 的链式风格就此断裂。**Gatherer（gather 一词意为"收集、聚拢"）是 JDK 24 正式引入的"可自定义中间操作"**（JEP 485），它把"带状态的元素变换"做成了 Stream 的一等公民：`stream.gather(gatherer)` 与 `filter`/`map` 平起平坐，可插入链中任意位置。本文从内置 Gatherer 用到自定义实现，帮你补齐 Stream 工具箱的最后一块拼图。

## 前置知识

- [Stream API](/java/030-StreamAPI)：中间操作、终端操作与惰性求值的基本概念。
- [Lambda 与函数式接口](/java/029-LambdaFunctionalProgramming)：`Function`、`BiFunction`、`Supplier` 的写法。
- （可选）[虚拟线程](/java/059-JavaVirtualThread)：理解 `Gatherers.mapConcurrent` 的执行基础。

## 学习目标

- 说出 Gatherer 的三个组成部分：初始化器（state 工厂）、积累器（integrator）、可选的合并器（combiner）与收尾器（finisher）；
- 熟练使用 `Gatherers` 内置五件套：`windowFixed`、`windowSliding`、`scan`、`fold`、`mapConcurrent`；
- 会用 `Gatherer.ofSequential` / `Gatherer.of` 编写自定义 Gatherer（含并行安全版本）；
- 分清 `Gatherer`（中间操作）与 `Collector`（终端操作）的适用边界，知道各自的常见陷阱。

## 0. 本节阅读指引（先读这一节）

零基础第一遍只读：第 1 节"版本与核心概念"、第 2 节"内置 Gatherer 五件套"，跑通示例即可。第 3 节自定义 Gatherer 与第 4 节并行支持是进阶内容，第一遍可跳过。第 5 节陷阱与第 6 节小结在动手写代码前回读一遍收益最大。

## 1. 版本与核心概念

### 1.1 版本演进：从预览到转正

| 阶段 | JDK | JEP | 状态 |
|------|-----|-----|------|
| 首次预览 | 22（2024-03） | JEP 461 | 需 `--enable-preview` |
| 第二次预览 | 23（2024-09） | JEP 473 | 需 `--enable-preview` |
| 转正 | 24（2025-03） | JEP 485 | **正式特性，无需任何开关** |

因此：JDK 24、25（LTS）、26 上可直接使用；JDK 21 LTS 没有 Stream Gatherers，若必须停留在 21，窗口类需求只能手写循环或引第三方库。

### 1.2 Gatherer 的形状：四件套

`java.util.stream.Gatherer<T, A, R>` 有三个类型参数，用下面的类比理解最直观：

- **T（输入）**：流水线上游送来的元素类型，类比"原料"。
- **A（状态）**：这个加工站的"记忆"，由初始化器（`Supplier<A>`）生产，类比"工作台上的便签"。
- **R（输出）**：流向下游的元素类型，类比"成品"。

一个 Gatherer 由最多四个函数组成：

| 组成部分 | 类型 | 是否必须 | 作用 |
|----------|------|----------|------|
| 初始化器 initializer | `Supplier<A>` | 可省 | 每次遍历开始时创建状态 |
| 积累器 integrator | `Integrator<T, A, R>` | 必须 | 逐元素处理：读状态、决定是否向下游推送、更新状态 |
| 合并器 combiner | `BinaryOperator<A>` | 可省 | 并行流把两段状态合并成一个（返回 `null` 表示不支持并行） |
| 收尾器 finisher | `BiConsumer<A, Downstream<? super R>>` | 可省 | 元素全部处理完后做收尾（如把状态整体推送出去） |

积累器返回 `boolean`：返回 `true` 表示"继续接受后续元素"，返回 `false` 表示"到此为止"（配合 `limit` 之类短路操作）。向下游推送用 `downstream.push(element)`，它同样返回 `boolean`——下游（比如 `limit(2)`）吃饱了会拒绝，此时应立即停止处理。

### 1.3 最小对照：map 能做的，gather 也能做

```java
import java.util.stream.Gatherer;
import java.util.stream.Stream;

public class GathererMinimal {
    public static void main(String[] args) {
        // 一个"给每个数字加 1"的 Gatherer：无状态（状态类型用 Void）
        Gatherer<Integer, Void, Integer> plusOne = Gatherer.of(
            (state, element, downstream) -> downstream.push(element + 1)
        );

        System.out.println(
            Stream.of(1, 2, 3).gather(plusOne).toList()
        ); // 预期输出：[2, 3, 4]
    }
}
```

`Gatherer.of(integrator)` 是无状态场景的快捷工厂；真实价值在于带状态与带结构的场景，下面逐个看。

## 2. 内置 Gatherer 五件套

`java.util.stream.Gatherers` 工具类提供了五个开箱即用的实现，覆盖最常见的"回看历史"需求。以下示例全部可在 JDK 24+ 直接编译运行。

### 2.1 windowFixed：固定窗口切分

```java
import java.util.List;
import java.util.stream.Gatherers;
import java.util.stream.Stream;

public class WindowFixedDemo {
    public static void main(String[] args) {
        // 把 5 个字母按每 2 个一组切分，最后不足一组保留
        List<List<String>> windows = Stream.of("a", "b", "c", "d", "e")
            .gather(Gatherers.windowFixed(2))
            .toList();

        System.out.println(windows);
        // 预期输出：[[a, b], [c, d], [e]]

        // 分页场景：订单列表每页 3 条
        List<Integer> orders = List.of(1001, 1002, 1003, 1004, 1005, 1006, 1007);
        List<List<Integer>> pages = orders.stream()
            .gather(Gatherers.windowFixed(3))
            .toList();
        System.out.println(pages);
        // 预期输出：[[1001, 1002, 1003], [1004, 1005, 1006], [1007]]
    }
}
```

注意：元素个数不足窗口大小时，最后一组是"残组"照常输出；窗口大小必须大于 0，传 0 或负数抛 `IllegalArgumentException`。

### 2.2 windowSliding：滑动窗口

```java
import java.util.List;
import java.util.stream.Gatherers;
import java.util.stream.Stream;

public class WindowSlidingDemo {
    public static void main(String[] args) {
        // 滑动窗口：每次只滑一步，窗口内容整体平移
        List<List<Integer>> slides = Stream.of(1, 2, 3, 4, 5)
            .gather(Gatherers.windowSliding(3))
            .toList();

        System.out.println(slides);
        // 预期输出：[[1, 2, 3], [2, 3, 4], [3, 4, 5]]

        // 经典应用：3 日滑动平均股价
        record Day(String date, int price) {}
        List<Day> prices = List.of(
            new Day("周一", 10), new Day("周二", 12),
            new Day("周三", 15), new Day("周四", 14), new Day("周五", 18)
        );
        prices.stream()
            .gather(Gatherers.windowSliding(3))
            .map(w -> w.stream().mapToInt(Day::price).average().orElseThrow())
            .forEach(avg -> System.out.printf("三日均价: %.2f%n", avg));
        // 预期输出：
        // 三日均价: 12.33
        // 三日均价: 13.67
        // 三日均价: 15.67
    }
}
```

对比记忆：`windowFixed` 是"切豆腐"，组与组不重叠；`windowSliding` 是"窗口平移"，输出数量 = 元素数 - 窗口数 + 1。若元素总数小于窗口大小，两者都会输出空列表（没有任何完整窗口）。

### 2.3 scan：前缀累计（输出每一步中间值）

```java
import java.util.List;
import java.util.stream.Gatherers;
import java.util.stream.Stream;

public class ScanDemo {
    public static void main(String[] args) {
        // 运行总和：每来一个元素就输出一次累计值
        List<Integer> runningSums = Stream.of(1, 2, 3, 4, 5)
            .gather(Gatherers.scan(() -> 0, Integer::sum))
            .toList();

        System.out.println(runningSums);
        // 预期输出：[1, 3, 6, 10, 15]

        // 场景：账户流水的逐笔余额
        record Tx(String desc, int delta) {}
        List<Tx> txs = List.of(
            new Tx("工资", 10000), new Tx("房租", -3500),
            new Tx("餐饮", -800), new Tx("理财赎回", 2000)
        );
        List<Integer> balances = txs.stream()
            .gather(Gatherers.scan(() -> 5000, (balance, tx) -> balance + tx.delta()))
            .toList();
        System.out.println(balances);
        // 预期输出：[15000, 11500, 10700, 12700]
    }
}
```

`scan` 与 `fold` 的区别一句话说清：**scan 每个元素都输出一次累计值，fold 只在最后输出一个终值**。

### 2.4 fold：聚合为单一终值

```java
import java.util.List;
import java.util.stream.Gatherers;
import java.util.stream.Stream;

public class FoldDemo {
    public static void main(String[] args) {
        // 把所有元素折叠成一个字符串
        List<String> folded = Stream.of("a", "b", "c", "d")
            .gather(Gatherers.fold(() -> "", (acc, s) -> acc + s))
            .toList();

        System.out.println(folded);
        // 预期输出：[abcd]

        // 场景：把订单流折叠成一个汇总对象（等价于单元素 reduce，但发生在"中间"）
        record Order(int amount) {}
        record Summary(int count, int totalAmount) {}
        List<Summary> summary = Stream.of(new Order(100), new Order(80), new Order(120))
            .gather(Gatherers.fold(
                () -> new Summary(0, 0),
                (acc, o) -> new Summary(acc.count() + 1, acc.totalAmount() + o.amount())
            ))
            .toList();
        System.out.println(summary);
        // 预期输出：[Summary[count=3, totalAmount=300]]
    }
}
```

注意 `fold` 与 `reduce` 高度相似：`reduce` 是终端操作（流就此终结），`gather(fold(...))` 之后还能继续接 `map`、`filter`。需要"聚合后再处理"时它更顺手；纯聚合取值用 `reduce`/`collect` 更直接。

### 2.5 mapConcurrent：受控并发的映射

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.stream.Gatherers;

public class MapConcurrentDemo {
    public static void main(String[] args) {
        List<URI> urls = List.of(
            URI.create("https://example.com/a"),
            URI.create("https://example.com/b"),
            URI.create("https://example.com/c")
        );

        try (HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build()) {

            // 最多 3 个并发请求；输出顺序仍与输入一致
            List<String> bodies = urls.stream()
                .gather(Gatherers.mapConcurrent(3, uri ->
                    client.send(HttpRequest.newBuilder(uri).build(),
                                HttpResponse.BodyHandlers.ofString()).body()))
                .toList();

            bodies.forEach(b -> System.out.println("收到 " + b.length() + " 字节"));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
```

`mapConcurrent(maxConcurrency, mapper)` 底层用**虚拟线程**（见 [虚拟线程](/java/059-JavaVirtualThread) 一篇）执行映射函数：同时至多 `maxConcurrency` 个任务在跑，先完成的结果会"等在原位"，最终按输入顺序输出。这是"并发发起 N 个 I/O 调用、又想保持流顺序"的最短写法——在它出现之前，需要手动拆分 `CompletableFuture` 列表再 join。

## 3. 自定义 Gatherer：两个完整示例

内置五件套不够用时，用 `Gatherer.ofSequential`（顺序版）或 `Gatherer.of`（可并行版）自己造。

### 3.1 入门版：折叠连续重复元素（顺序 Gatherer）

日志系统常把"连续相同事件"折叠成一条。这里的"连续"依赖前一个元素，是典型的带状态变换：

```java
import java.util.List;
import java.util.function.Supplier;
import java.util.stream.Gatherer;
import java.util.stream.Stream;

public class CollapseConsecutiveDemo {

    /**
     * 折叠"连续重复"的元素：连续相同的值只保留第一个。
     * 状态 A 是长度为 1 的数组，用来承载可空的上一个元素。
     */
    static <T> Gatherer<T, Object[], T> collapseConsecutive() {
        return Gatherer.ofSequential(
            // 初始化器：每次遍历开始时调用，创建全新状态（保证可复用、线程隔离）
            () -> new Object[]{null},
            // 积累器：state 是状态，element 是当前元素，downstream 是下游出口
            (state, element, downstream) -> {
                if (!element.equals(state[0])) {   // 与上一个"已发射"元素不同
                    state[0] = element;            // 更新状态（记忆）
                    return downstream.push(element); // 推送给下游；下游拒绝时返回 false
                }
                return true;                       // 重复元素直接吞掉，继续处理
            }
        );
    }

    public static void main(String[] args) {
        List<String> collapsed = Stream.of(
                "LOGIN", "LOGIN", "LOGIN", "SEARCH", "SEARCH", "LOGIN", "PAY"
            )
            .gather(collapseConsecutive())
            .toList();

        System.out.println(collapsed);
        // 预期输出：[LOGIN, SEARCH, LOGIN, PAY]
    }
}
```

三个细节值得体会：状态在**每次遍历时由初始化器新建**，因此同一个 Gatherer 实例可以安全地用于多条流；`ofSequential` 表示该 Gatherer 不支持并行拆分（本例语义上也不可能并行）；`push` 的返回值被原样上抛，使 `limit` 等短路终端操作能真正提前终止。

### 3.2 进阶版：topN（支持并行的完整四件套）

"从大量数值里取最大的 N 个"是流式 Top-K 问题。用一个大小受限的优先队列做状态，四件套全部用上：

```java
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;
import java.util.stream.Gatherer;
import java.util.stream.Stream;

public class TopNDemo {

    /**
     * 取最大的 n 个元素，按从大到小输出。
     * T 必须可比较；状态 A 是优先队列（堆顶是最小元素，方便淘汰）。
     */
    static <T extends Comparable<T>> Gatherer<T, PriorityQueue<T>, T> topN(int n) {
        return Gatherer.of(
            // 1) 初始化器：创建堆
            () -> new PriorityQueue<>(n),
            // 2) 积累器：堆未满直接放；堆满则与最小值比较，更大才换入
            (heap, element, downstream) -> {
                if (heap.size() < n) {
                    heap.add(element);
                } else if (element.compareTo(heap.peek()) > 0) {
                    heap.poll();
                    heap.add(element);
                }
                return !downstream.isRejecting();
            },
            // 3) 合并器：并行流把两段的结果堆合并（把右堆逐个并入左堆）
            (left, right) -> {
                for (T e : right) {
                    if (left.size() < n) {
                        left.add(e);
                    } else if (e.compareTo(left.peek()) > 0) {
                        left.poll();
                        left.add(e);
                    }
                }
                return left;
            },
            // 4) 收尾器：元素流结束时，把堆中元素按从大到小推送出去
            (heap, downstream) -> {
                List<T> remaining = new ArrayList<>(heap);
                remaining.sort(Comparator.reverseOrder());
                for (T e : remaining) {
                    if (!downstream.push(e)) {
                        return; // 下游短路（如 limit）时立即停止
                    }
                }
            }
        );
    }

    public static void main(String[] args) {
        List<Integer> scores = List.of(7, 2, 9, 4, 1, 8, 3, 5);

        List<Integer> top3 = scores.stream()
            .gather(topN(3))
            .toList();
        System.out.println(top3);
        // 预期输出：[9, 8, 7]

        // 提供了合并器，因此并行流同样正确（结果仍按从大到小）
        List<Integer> top3Parallel = scores.stream()
            .parallel()
            .gather(topN(3))
            .toList();
        System.out.println(top3Parallel);
        // 预期输出：[9, 8, 7]
    }
}
```

对比 3.1：`ofSequential` 只写积累器一行，`of` 则要写齐四件套——**是否提供合并器，就是"这个 Gatherer 能否吃并行红利"的分界线**。

### 3.3 组合：把小 Gatherer 串成流水线

连续多次 `gather` 即可把加工站串联（`Gatherer.andThen` 语义相同，其价值在于把流水线本身存进变量复用）。沿用 3.1 的 `collapseConsecutive()`：

```java
import java.util.List;
import java.util.stream.Gatherers;
import java.util.stream.Stream;

public class ComposeDemo {
    public static void main(String[] args) {
        // 先折叠连续重复，再按每 2 个一组打包
        List<String> result = Stream.of("A", "A", "B", "B", "B", "C")
            .gather(CollapseConsecutiveDemo.collapseConsecutive()) // [A, B, C]
            .gather(Gatherers.windowFixed(2))                      // [[A, B], [C]]
            .toList();

        System.out.println(result);
        // 预期输出：[[A, B], [C]]
    }
}
```

连续两次 `gather` 与 `Gatherer.andThen` 语义相同，前者更直观；`andThen` 的价值在于把"加工步骤"本身存进变量、做成可复用的流水线对象。

## 4. Gatherer 与 Collector：一张表分清

| 维度 | Gatherer（gather） | Collector（collect） |
|------|--------------------|----------------------|
| 流水线位置 | 中间操作，之后还能继续接操作 | 终端操作，流就此终结 |
| 元素可见性 | 逐元素经过，可"看见"历史（窗口、累计） | 一次性看到全部（分组、分区、统计） |
| 输出 | 零到多个元素的流（可变形、可短路） | 一个聚合结果容器 |
| 典型场景 | 分窗、滑动、折叠、受控并发映射 | groupingBy、toMap、joining |
| 记忆口诀 | 加工站（改变流本身） | 终点仓库（收集结果） |

经验法则：**结果是"另一条数据流"用 Gatherer，结果是"一个容器/单值"用 Collector**；两者常常配合——先 `gather` 变形，再 `collect` 收口。

## 5. 常见陷阱

**陷阱一：在 JDK 21 上照抄示例。** Gatherers 是 JDK 24 才转正的 API，21 LTS 上不存在（22/23 需开预览）。报错 `找不到符号: 类 Gatherers` 时先查 `java -version`。

**陷阱二：以为 windowSliding 会输出不完整窗口。** 元素数少于窗口大小时输出空列表，不会输出"残窗"。边界判断要在业务代码里自己做。

**陷阱三：状态对象在积累器外被共享。** 自定义 Gatherer 的状态必须只通过初始化器创建、只在积累器/收尾器内修改。把状态写成 Gatherer 的字段（lambda 捕获外部可变对象）会让并行流或多条流互相污染——这是把"无状态函数"写成"隐式单例"的经典错误。

```java
// 错误：状态被所有遍历共享（且并行不安全）
int[] counter = new int[1];                       // 捕获了外部可变状态
Gatherer.of((state, e, down) -> {
    counter[0]++;                                  // 多线程下数据竞争
    return down.push(counter[0] + ":" + e);
});

// 正确：状态由初始化器分配，每次遍历独立
Gatherer.ofSequential(
    () -> new int[1],
    (state, e, down) -> { state[0]++; return down.push(state[0] + ":" + e); }
);
```

**陷阱四：无合并器的 Gatherer 上用并行流指望加速。** `ofSequential` 或未提供 combiner 的 Gatherer 在并行流中无法拆分合并，该阶段不产生并行收益（结果仍正确）。CPU 密集、数据量大的并行管道要给 Gatherer 补上合并器（参考 3.2）。

**陷阱五：把 fold/scan 的累计函数写成有副作用操作。** 与 `reduce` 的结合函数一样，累计函数应当是纯函数；在其中改集合、发请求，并行或短路时行为不可预期。

**陷阱六：mapConcurrent 的异常与超时。** 映射函数抛出的异常会在消费到对应元素时传播；它本身不提供超时参数，需要超时要在外层（HttpClient 请求超时、或改用结构化并发）兜底。

## 6. 实战场景速查

| 需求 | 写法 |
|------|------|
| 分批 / 分页处理 | `.gather(Gatherers.windowFixed(batchSize))` |
| 滑动平均 / 相邻差分 | `.gather(Gatherers.windowSliding(n))` |
| 逐笔余额 / 运行总和 | `.gather(Gatherers.scan(() -> init, op))` |
| 聚合为单值后继续流式处理 | `.gather(Gatherers.fold(() -> seed, op))` |
| 限流并发调外部服务且保序 | `.gather(Gatherers.mapConcurrent(k, fn))` |
| 连续去重 / 分组突变检测 | 自定义 `ofSequential`（参考 3.1） |
| 流式 Top-K | 自定义 `of` 四件套（参考 3.2） |

## 7. 小结

初学者记住三点：

1. `stream.gather(...)` 是 JDK 24 转正的**可自定义中间操作**，Gatherer = 状态 + 逐元素积累（可选合并、收尾）。
2. 内置五件套先于自定义：`windowFixed` 切块、`windowSliding` 滑窗、`scan` 步步累计、`fold` 聚成单值、`mapConcurrent` 受控并发。
3. "加工站"用 Gatherer（中间），"仓库"用 Collector（终端），两者搭配而非互斥。

进阶者还需注意：

- `ofSequential` 与"未提供 combiner 的 `of`"不支持并行拆分；要吃并行红利必须写对合并器，并保证状态只由初始化器创建。
- 积累器/收尾器的 `boolean` 返回与 `downstream.push` 的 `false` 是短路协议，配合 `limit` 能真正减少计算。
- `mapConcurrent` 建立在虚拟线程之上，适合 I/O 密集映射；CPU 密集转换用它反而增加调度开销。
- 版本红线：JDK 21 LTS 无此 API；22/23 需 `--enable-preview`；从 24（含 25 LTS）起才可放心在生产使用。
