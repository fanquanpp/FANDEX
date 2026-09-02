---
order: 320
title: Collectors.groupingBy 详解
module: 'java'
category: 后端技术
difficulty: intermediate
description: 分组聚合利器：downstream 组合出多维统计。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'java/030-StreamAPI'
  - 'java/031-JavaOptionalClass'
  - 'java/033-JavaFunctionalProgramming'
prerequisites:
  - 'java/030-StreamAPI'
---

# Collectors.groupingBy 详解

平台每周都要出一份"音乐榜单报表"：每位歌姬各有多少首歌、每场演唱会的各票档卖了多少张、哪些城市听众最多。用传统写法，这些统计要写一堆 `Map<String, List<T>>` 外加嵌套 for 循环；而 Stream API 把"遍历 - 分类 - 聚合"三步压缩成了 `Collectors.groupingBy` 一行调用。本篇围绕虚拟歌手音乐平台的报表需求，把 groupingBy 的三种重载、下游收集器组合、嵌套分组、二分区以及它与 `toMap` 的取舍一次讲透。

阅读路线建议：第 1-2 节是必学的基本功，第 3 节的多级统计对应报表刚需，第 4-5 节是选型辨析，第 6 节讲性能。每个示例都可以整体复制到一个文件里直接运行，建议边读边改数据观察输出，比单纯阅读印象深得多；执行前先把每段代码的输出预测一遍再运行，猜错的每一处都是知识盲区。

## 前置知识

- [Stream API](/java/030-StreamAPI)：流的创建、中间操作与终结操作的基本用法。
- [Optional 类](/java/031-JavaOptionalClass)：理解 downstream 中 `minBy`、`maxBy` 返回值的包装方式。
- [函数式编程](/java/033-JavaFunctionalProgramming)：函数组合思想是 downstream 嵌套的灵魂。

## 学习目标

- 掌握 `groupingBy` 的三个重载：仅分类、加 downstream、再加 map 工厂；
- 熟练使用 `counting`、`mapping`、`summingInt`、`averagingDouble`、`collectingAndThen` 等下游收集器；
- 能写出两级甚至三级嵌套分组的多维统计；
- 区分 `partitioningBy` 与 `groupingBy`，知道前者何时更快；
- 明确 `groupingBy` 与 `toMap` 的适用边界，以及 `toMap` 撞键的处理方式。

## 1. 从 for 循环到一行分组

先看数据模型。为了示例紧凑，这里用 Java 16 的 record 定义歌曲与演唱会门票：

```java
// 歌曲记录：标题、主唱歌姬、所属演唱会城市、票档、票价（元）
public record Song(String title, String singer, String city, String tier, int price) {}

// 演唱会门票：购票粉丝、场次、票档
public record Ticket(String fan, String concert, String tier) {}
```

需求一：把所有歌曲按歌姬归堆。传统写法与流写法对比：

```java
import java.util.*;
import java.util.stream.Collectors;

public class GroupingBasic {
    public static void main(String[] args) {
        List<Song> songs = List.of(
            new Song("千本樱", "初音未来", "东京", "普通票", 380),
            new Song("Melt", "初音未来", "上海", "VIP票", 880),
            new Song("深海少女", "巡音流歌", "东京", "普通票", 380),
            new Song("World is Mine", "初音未来", "东京", "内场票", 1280));

        // 传统写法：手动建 Map，再逐条塞 List
        Map<String, List<Song>> byLoop = new HashMap<>();
        for (Song s : songs) {
            byLoop.computeIfAbsent(s.singer(), k -> new ArrayList<>()).add(s);
        }

        // 流写法：一行完成"分类 + 收集"
        Map<String, List<Song>> byStream = songs.stream()
            .collect(Collectors.groupingBy(Song::singer));

        System.out.println(byStream.keySet()); // [初音未来, 巡音流歌]
    }
}
```

`groupingBy(Song::singer)` 中的分类函数（classifier）把每个元素映射成一个 key，相同 key 的元素被收进同一个 `List`，最终返回 `HashMap<String, List<Song>>`。它等价于那段 `computeIfAbsent` 循环，但语义更直白："按歌姬分组"。

分类函数的签名是 `Function<T, K>`，K 的 `hashCode` 与 `equals` 决定分组的正确性——这与 HashMap 的 key 要求一脉相承，因为 `groupingBy` 底层就是往一个 Map 里合并元素。因此用自定义类型做分类 key 时，同样必须正确实现这两个方法；用 String、枚举、Long 这类现成类型则完全不用担心。

## 2. 三个重载与下游收集器

`groupingBy` 有三个重载，层层递进：

```java
// 重载一：只分类，默认用 toList() 收集，默认 HashMap 承载
groupingBy(classifier)
// 重载二：指定下游收集器，对每个分组再做一次聚合
groupingBy(classifier, downstream)
// 重载三：再指定 Map 工厂，可换成 TreeMap、LinkedHashMap 等
groupingBy(classifier, mapFactory, downstream)
```

第二个参数 downstream（下游收集器）是它的精髓：分组只是骨架，每个组内"装什么、怎么算"由下游决定。报表里最常见的组合如下：

```java
import java.util.*;
import java.util.stream.Collectors;

public class DownstreamDemo {
    public static void main(String[] args) {
        List<Song> songs = List.of(
            new Song("千本樱", "初音未来", "东京", "普通票", 380),
            new Song("Melt", "初音未来", "上海", "VIP票", 880),
            new Song("深海少女", "巡音流歌", "东京", "普通票", 380),
            new Song("World is Mine", "初音未来", "东京", "内场票", 1280));

        // 每位歌姬的歌曲数量：counting 返回 Long
        Map<String, Long> counts = songs.stream()
            .collect(Collectors.groupingBy(Song::singer, Collectors.counting()));
        System.out.println(counts); // {初音未来=3, 巡音流歌=1}

        // 每位歌姬的曲目名列表：mapping 先取字段再拼接
        Map<String, String> titles = songs.stream()
            .collect(Collectors.groupingBy(Song::singer,
                Collectors.mapping(Song::title, Collectors.joining("、"))));
        System.out.println(titles); // {初音未来=千本樱、Melt、World is Mine, 巡音流歌=深海少女}

        // 每位歌姬的平均票价：averagingDouble
        Map<String, Double> avgPrice = songs.stream()
            .collect(Collectors.groupingBy(Song::singer,
                Collectors.averagingDouble(Song::price)));
        System.out.println(avgPrice); // {初音未来=846.66..., 巡音流歌=380.0}
    }
}
```

`counting()` 统计条数、`mapping(mapper, downstream)` 先转换再交给下一层、`joining` 拼字符串、`summingInt`/`averagingDouble` 做数值聚合。它们像积木一样自由组合：`mapping` 的第二个参数又可以是一个收集器，这正是"多维统计"能层层嵌套的原因。

下游收集器的清单远不止这几个：`toMap`、`toCollection`、`minBy`/`maxBy`、`reducing` 都能放进下游。报表需求里"每组取票价最高的两条"这类 Top-N 统计，标准库没有现成的收集器，此时可以自己实现一个带小顶堆的 Collector 塞进下游，或者先 `groupingBy` 拿到组列表再二次处理。组合的灵活性正是这套设计的价值所在。

## 3. 嵌套分组与收尾加工

报表经常需要两级维度：先按城市、再按票档统计数量与总销售额。嵌套 `groupingBy` 即可表达：

```java
import java.util.*;
import java.util.stream.Collectors;

public class NestedGrouping {
    public static void main(String[] args) {
        List<Song> songs = List.of(
            new Song("千本樱", "初音未来", "东京", "普通票", 380),
            new Song("Melt", "初音未来", "上海", "VIP票", 880),
            new Song("深海少女", "巡音流歌", "东京", "VIP票", 880),
            new Song("Tell Your World", "初音未来", "东京", "普通票", 380));

        // 一级 key=城市，二级 key=票档，值=该组歌曲数量
        Map<String, Map<String, Long>> byCityAndTier = songs.stream()
            .collect(Collectors.groupingBy(Song::city,
                Collectors.groupingBy(Song::tier, Collectors.counting())));
        System.out.println(byCityAndTier);
        // {东京={普通票=2, VIP票=1}, 上海={VIP票=1}}

        // 每座城市的总销售额：summingInt 聚合票价
        Map<String, Integer> revenue = songs.stream()
            .collect(Collectors.groupingBy(Song::city,
                Collectors.summingInt(Song::price)));
        System.out.println(revenue); // {东京=1640, 上海=880}

        // collectingAndThen：聚合完再加工，例如对组内票价求最大值并包装成只读
        Map<String, Integer> maxPrice = songs.stream()
            .collect(Collectors.groupingBy(Song::city,
                Collectors.collectingAndThen(
                    Collectors.maxBy(java.util.Comparator.comparingInt(Song::price)),
                    opt -> opt.map(Song::price).orElse(0))));
        System.out.println(maxPrice); // {东京=880, 上海=880}
    }
}
```

第三种写法展示了 `collectingAndThen(downstream, finisher)` 的套路：先按普通方式聚合，再对结果做一步"收尾转换"。配合 `toUnmodifiableList()` 或 `Collections::unmodifiableMap`，可以在返回前统一加上不可变保护。若需要分组本身有序（比如城市按拼音排），用重载三换成 `TreeMap::new`；若追求分组后的稳定输出顺序，用 `LinkedHashMap::new`。

多级分组读起来容易、写起来容易错位，推荐自内向外思考：先确定最内层要什么（计数？求和？取最值？），往外包一层转换或下游，最后决定最外层的分类维度。打印时用结构化的缩进输出或 JSON 序列化核对中间结果，能省去大量调试时间。另外嵌套不宜超过三层，超过时先考虑把数据在流外预展开成"宽表"（每行带齐所有维度字段），再单层分组，SQL 思维往往比嵌套收集器更清晰。

嵌套写法的类型推导偶尔会"卡壳"，尤其是下游链很长时。遇到推导失败，显式声明中间类型或拆成两次 collect 往往更清晰：先 `groupingBy` 拿到分组结果，再对每组单独统计，多一两个中间变量换来的可读性完全值得。

## 4. partitioningBy：只分两堆的特化版

当分类条件只有"是/否"两种结果时，`partitioningBy`（分区）比 `groupingBy` 更合适：

```java
import java.util.*;
import java.util.stream.Collectors;

public class PartitionDemo {
    public static void main(String[] args) {
        List<Song> songs = List.of(
            new Song("千本樱", "初音未来", "东京", "普通票", 380),
            new Song("Melt", "初音未来", "上海", "VIP票", 880),
            new Song("深海少女", "巡音流歌", "东京", "普通票", 380));

        // 按票价是否超过 500 元分成两堆
        Map<Boolean, List<Song>> byPrice = songs.stream()
            .collect(Collectors.partitioningBy(s -> s.price() > 500));
        System.out.println(byPrice.get(true).size());  // 1：高价曲目
        System.out.println(byPrice.get(false).size()); // 2：平价曲目

        // 分区 + 下游统计：每种分区再数一次
        Map<Boolean, Long> cnt = songs.stream()
            .collect(Collectors.partitioningBy(s -> s.price() > 500,
                Collectors.counting()));
        System.out.println(cnt); // {false=2, true=1}
    }
}
```

它与 `groupingBy` 有两点本质差异：谓词只能产生 true/false 两个 key，因此结果 `Map` 固定包含两个条目，即使某一边是空列表也会存在；底层用位运算而非哈希定位，分组本身开销更小。凡是"达标/不达标""VIP/普通""上架/下架"这类二分判断，优先 `partitioningBy`。

一个容易忽略的用法是"分区 + 分组"串联：先用 `partitioningBy` 把流量切成"免费试听/付费会员"两半，再对每一半继续 `groupingBy` 细分歌姬维度。二分作为最外层的过滤语义清晰，内层再交给分组处理，读代码的人一眼就能看懂统计口径，比用一个三层布尔嵌套分组友好得多。

还有一个小坑与取值侧相关：`partitioningBy` 返回的 Map 里，true/false 两个 key 都保证存在，所以 `get(true)`、`get(false)` 永远不会返回 null，可以直接接着 `.size()`、`.stream()`；而 `groupingBy` 的场景里，某个 key 没有元素就真的不存在于 Map 中，取值前要做 `containsKey` 或 `getOrDefault` 判断。

## 5. groupingBy 还是 toMap

`toMap` 与 `groupingBy` 都能把流变成 `Map`，但语义完全不同：前者是"每个 key 对应一个值"的索引结构，后者是"每个 key 对应一组值"的分组结构。误用 `toMap` 做分组，撞上重复 key 会当场爆炸：

```java
import java.util.*;
import java.util.stream.Collectors;

public class ToMapVsGrouping {
    public static void main(String[] args) {
        List<Song> songs = List.of(
            new Song("千本樱", "初音未来", "东京", "普通票", 380),
            new Song("Melt", "初音未来", "上海", "VIP票", 880));

        // 需求：歌姬 -> 最新单曲。key 唯一时 toMap 很合适
        Map<String, String> latest = songs.stream()
            .collect(Collectors.toMap(Song::singer, Song::title));
        System.out.println(latest); // {初音未来=Melt, 巡音流歌=深海少女}（按元素顺序）

        // 错误用法：歌姬有多首歌，toMap 直接抛 IllegalStateException
        // songs.stream().collect(Collectors.toMap(Song::singer, s -> s.title()));

        // 正确修法一：提供合并函数，后到的覆盖先到的
        Map<String, String> keepLast = songs.stream()
            .collect(Collectors.toMap(Song::singer, Song::title, (a, b) -> b));

        // 正确修法二：值本身就该是一组，回到 groupingBy
        Map<String, List<String>> all = songs.stream()
            .collect(Collectors.groupingBy(Song::singer,
                Collectors.mapping(Song::title, Collectors.toList())));
    }
}
```

选型口诀：key 天然唯一（如用歌曲 ID 建索引）选 `toMap`；key 会重复、需要聚合（计数、求和、再分组）选 `groupingBy`。另外注意 `toMap` 默认实现基于 `Map.merge`，value 为 null 会抛 NPE，且必须显式提供合并函数才能容纳重复 key——这两点都是高频面试题。

两者的返回类型约定也有差别：`toMap` 可以在第四个参数传入自定义 `Map` 实现，`groupingBy` 的 map 工厂则是三参重载专属。如果团队规范要求所有报表 Map 不可变，可以在两者外面统一套 `collectingAndThen(..., Collections::unmodifiableMap)`，把不可变约束集中在出口处，调用方就再也改不了你的统计结果。

## 6. 分组的实现原理与性能直觉

一次 `groupingBy` 的 `collect` 到底做了什么？它会把结果装进一个 `HashMap`，对每个元素调用分类函数求 key，再对组内元素执行下游收集器的累加逻辑（`supplier`、`accumulator`、`combiner`、`finisher` 四件套）。理解这一点，可以推出三条性能直觉：

第一，分类函数会被每个元素调用一次，它自己是 O(1) 还是 O(n)，直接决定整个收集的复杂度，所以别在 classifier 里做网络请求、正则匹配这类重活。第二，默认 `HashMap` 无锁，并行流上普通 `groupingBy` 要靠 combiner 合并多个局部 Map，分组本身是热点时合并开销可能吃掉并行收益，此时换 `groupingByConcurrent`（基于 `ConcurrentHashMap`，各线程直接写共享 Map，没有合并步骤）。第三，组内 value 的默认 `toList()` 是 `ArrayList`，若组数极多而每组元素极少，海量小对象的对象头开销不可忽视，纯统计需求直接用 `counting()`。

```java
import java.util.*;
import java.util.stream.Collectors;

public class PerfDemo {
    // 播放记录：歌曲与主唱歌姬
    record Play(String song, String singer) {}

    public static void main(String[] args) {
        List<Play> plays = List.of(
            new Play("千本樱", "初音未来"),
            new Play("Melt", "初音未来"),
            new Play("深海少女", "巡音流歌"));

        // 串行分组：默认路径，数据量不大时的首选
        Map<String, Long> bySinger = plays.stream()
            .collect(Collectors.groupingBy(Play::singer, Collectors.counting()));

        // 并行分组：无合并步骤，大数据量且无序可接受时换它
        Map<String, Long> bySingerFast = plays.parallelStream()
            .collect(Collectors.groupingByConcurrent(Play::singer, Collectors.counting()));

        System.out.println(bySinger.equals(bySingerFast)); // true：结果一致，路径不同
    }
}
```

把握一个度：日常报表的数据量（万级以下）用默认 `groupingBy` 完全够用，先保证正确与可读，再谈并行优化；不要为了"看起来高级"把简单分组改成并行流。可以记一条粗略的分界线：千级以下数据随便写，万级到十万级注意分类函数与下游的轻量性，十万级以上才值得认真评估并行与并发收集器。优化的顺序永远是：正确、可读、再性能。

## 易错点与最佳实践

**错误一：分类函数返回 null。**

```java
// 错误：singer 可能为 null，groupingBy 直接抛 NPE（element cannot be mapped to a null key）
Map<String, List<Song>> g = songs.stream()
    .collect(Collectors.groupingBy(Song::singer));

// 修正：先过滤或给默认 key
Map<String, List<Song>> g2 = songs.stream()
    .filter(s -> s.singer() != null)
    .collect(Collectors.groupingBy(Song::singer));
```

**错误二：想当然地认为分组结果有序。**

```java
// 错误：groupingBy 返回 HashMap，遍历顺序随容量与哈希变化
// 修正：需要顺序时显式指定 Map 工厂
Map<String, List<Song>> ordered = songs.stream()
    .collect(Collectors.groupingBy(Song::singer, LinkedHashMap::new, Collectors.toList()));
```

**错误三：只数数量却用 `mapping(..., toList())` 再取 size。**

```java
// 错误：先装了一整箱 List 只为数个数，浪费内存
Collectors.mapping(Song::title, Collectors.toList());

// 修正：直接用 counting，中间不落任何对象
Collectors.counting();
```

**错误四：并发流忘记换并发收集器。**

```java
// 错误：parallelStream 上用普通 groupingBy，合并开销可能吃掉并行收益
// 修正：大数据量 + 无序可接受时使用 groupingByConcurrent
Map<String, Long> c = songs.parallelStream()
    .collect(Collectors.groupingByConcurrent(Song::singer, Collectors.counting()));
```

**错误五：在分类函数里做重活。**

```java
// 错误：每个元素都要跑一遍正则与字符串切割，分组退化成 O(n * m)
songs.stream().collect(Collectors.groupingBy(
    s -> s.title().replaceAll("\\(.*\\)", "").split("-")[0].trim()));

// 修正：先把复杂归类算成字段，再交给分组
Map<String, Long> g = songs.stream()
    .collect(Collectors.groupingBy(s -> normalize(s.title()), Collectors.counting()));
```

分组看似一行，成本全在分类函数里；先清洗、再分组，是流式统计的固定节奏。

## 本篇小结

- `groupingBy` 三个重载对应三级能力：纯分组、加下游聚合、再指定 Map 工厂；`LinkedHashMap::new` 保序、`TreeMap::new` 排序。
- 下游收集器是组合的核心：`counting` 计数、`mapping` 转换后再聚合、`summingInt`/`averagingDouble` 数值统计、`collectingAndThen` 收尾加工，层层嵌套即可表达多维报表。
- 嵌套 `groupingBy` 天然支持"城市、票档"这类二级维度；`partitioningBy` 是二分特化版，true/false 两个 key 恒存在且分组更快。
- `toMap` 面向"key 唯一的索引"场景，重复 key 必须给合并函数，value 不允许 null；需要一组值时回归 `groupingBy`。
- 分类函数返回 null 会抛 NPE；并行流可用 `groupingByConcurrent`；默认 HashMap 无序，报表输出需要顺序时务必显式指定。

## 动手实践

1. **周榜报表**：给定一份含 20 首歌的列表，输出"每位歌姬的总销售额、最贵曲目、曲目名按票价降序拼接"三项统计。思路：三组 `groupingBy + summingInt / maxBy / mapping+joining` 分别收集，最后合并结果。
2. **三级分组**：把门票按"城市 -> 票档 -> 是否首次购买"三级分组并计数。思路：连续两层 `groupingBy` 后接 `partitioningBy(..., counting())`，注意打印结构时用两层缩进美化输出。
3. **踩坑实验**：故意让分类函数对某首歌返回 null，观察异常信息；再分别用过滤、`Optional.ofNullable(...).orElse("未知歌姬")` 两种方式修复，比较哪种更符合业务语义。思路：默认 key 会把脏数据藏进报表，过滤则让问题提前暴露，依数据可信度选择。
