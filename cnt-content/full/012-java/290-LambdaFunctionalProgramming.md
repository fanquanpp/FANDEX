---
order: 230
title: Lambda 与函数式编程
module: 'java'
category: 后端技术
difficulty: intermediate
description: 从一次"给歌单排序"的样板代码之痛入手学会 Lambda：语法演变、四大函数式接口、四种方法引用、effectively final 捕获规则、受检异常与 this 两大坑，附比较器溢出陷阱。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'java/300-StreamAPI'
  - 'java/330-JavaFunctionalProgramming'
  - 'java/450-JavaRecordClass'
  - 'java/520-CompletableFutureAsync'
prerequisites:
  - 'java/150-OOP'
  - 'java/100-MethodDetailed'
---

## 前置知识

- [面向对象编程](/java/150-OOP)：熟悉接口与匿名内部类，Lambda 的前身就是匿名内部类；
- [方法详解](/java/100-MethodDetailed)：知道方法签名怎么读，方法引用一节要用。

## 学习目标

读完本文你将能够：

1. 把一段匿名内部类代码改写成 Lambda 和方法引用，说出三种写法的可读性差异；
2. 认出 `Function`、`Consumer`、`Supplier`、`Predicate` 四大标准函数式接口，并能自己定义一个；
3. 说出 Lambda 捕获局部变量为什么要求 effectively final；
4. 处理 Lambda 里的受检异常，解释 Lambda 与匿名内部类中 `this` 的不同指向；
5. 用 `andThen`/`compose` 组合函数，避开 `(a, b) -> a - b` 比较器溢出坑。

预计 60 到 80 分钟，含 3 组动手实验与 4 道练习。本文只讲 Lambda 本身；流水线操作在 [Stream API](/java/300-StreamAPI)。

## 1. 问题引入：排序一首歌要写几行

你在给 quaver 风格的音乐工具写歌单功能：把歌曲按播放量排序。用 JDK 7 时代的写法：

```java
List<Song> songs = new ArrayList<>(List.of(
        new Song("千本樱", 52_000_000),
        new Song("Melt", 31_000_000),
        new Song("Rolling Girl", 28_000_000)));

songs.sort(new Comparator<Song>() {
    @Override
    public int compare(Song a, Song b) {
        return Long.compare(a.plays(), b.plays());
    }
});
```

五行的匿名内部类，其中有信息量的只有一行：`Long.compare(a.plays(), b.plays())`。剩下四行是编译器早就能推断的仪式。这种"接口只有一个抽象方法、我们只为传一段行为"的场合在 Java 里遍地都是：排序、线程、回调、过滤。Lambda（Java 8 引入）就是为这些场合准备的——**把"一段行为"当成值来传**。

改写上面的排序，一行到位：

```java
songs.sort((a, b) -> Long.compare(a.plays(), b.plays()));
```

实验一：把 `Long.compare` 换成 `a.plays() - b.plays()` 会编译通过甚至测试通过，但它是本篇埋的最后一个坑（第 8 节揭晓），先记下别改。

## 2. 语法速成：从匿名类到方法引用

同一个排序，五种写法排成一条演化链：

```java
// 1. 匿名内部类（JDK 7 及以前）
songs.sort(new Comparator<Song>() {
    public int compare(Song a, Song b) { return Long.compare(a.plays(), b.plays()); }
});
// 2. Lambda
songs.sort((a, b) -> Long.compare(a.plays(), b.plays()));
// 3. 方法引用：参数只是被"转发"给一个已有方法时，可以整体省略
songs.sort(Comparator.comparingLong(Song::plays));
```

Lambda 的完整形状是 `(参数) -> 主体`，每个部位都可以按规则省略：

```java
Runnable r         = () -> System.out.println("播放");      // 无参数：括号不能省
Consumer<String> p = s -> System.out.println(s);            // 单参数：括号可省
BinaryOperator<Long> add = (a, b) -> a + b;                 // 多参数：括号必须有
Function<String, String> clean = s -> {
    String trimmed = s.strip();                              // 多语句：花括号 + return
    return trimmed.toUpperCase();
};
```

参数类型通常不写（编译器从目标类型 `Comparator<Song>` 推断），写了也不算错，但团队惯例是能省则省。

**方法引用**是 Lambda 的进一步缩写，四种形态各记一个例子：

```java
// 1. 静态方法：类名::静态方法
Function<String, Integer> parser = Integer::parseInt;       // s -> Integer.parseInt(s)

// 2. 特定对象的实例方法：对象::方法
Song melt = new Song("Melt", 1);
Supplier<String> name = melt::title;                        // () -> melt.title()

// 3. 类的实例方法：第一个参数当调用者
Function<Song, String> toTitle = Song::title;               // song -> song.title()
BiPredicate<String, String> same = String::equals;          // (a, b) -> a.equals(b)

// 4. 构造器：类名::new
Supplier<List<Song>> listMaker = ArrayList::new;            // () -> new ArrayList<>()
```

判断"能不能写成方法引用"的口诀：**Lambda 的参数是不是原封不动地喂给了某一个方法**？是，就用 `::`；只要做了任何加工（拼接、取反、拆箱），就保留 Lambda。

实验二：把下面三个 Lambda 里能改成方法引用的改掉，不能改的说出原因。

```java
Function<String, Integer> len    = s -> s.length();
Function<String, String> shout   = s -> s.toUpperCase() + "!";
Predicate<String> notBlank      = s -> !s.isBlank();
```

（答案：第一个可改 `String::length`；第二个有拼接不能改；第三个有取反不能改。）

## 3. 函数式接口：Lambda 的"落点"

Lambda 不能凭空存在，它必须赋给一个类型。这个类型是**只含一个抽象方法的接口**，叫函数式接口——Lambda 的形状（几个参数、有无返回值）必须和那个抽象方法对上。

### 3.1 四大金刚

`java.util.function` 包里有四十多个现成接口，日常 90% 的场合被这四个覆盖：

| 接口 | 抽象方法 | 读法 | 典型用途 |
| ---- | -------- | ---- | -------- |
| `Function<T, R>` | `R apply(T)` | 进 T 出 R | 转换：`Song::title` |
| `Consumer<T>` | `void accept(T)` | 吃掉不出 | 打印、入库：`System.out::println` |
| `Supplier<T>` | `T get()` | 不进只出 | 工厂、惰性求值：`ArrayList::new` |
| `Predicate<T>` | `boolean test(T)` | 进 T 出真假 | 过滤：`s -> s.length() > 3` |

派生关系也好记：两个参数加 `Bi`（`BiFunction<T,U,R>`）；出入同型用 `Operator`（`UnaryOperator`/`BinaryOperator`）；对基本类型有专用版（`IntPredicate`、`ToLongFunction`）避免装箱。

### 3.2 自定义函数式接口

只有四个不够用时自己定义，加 `@FunctionalInterface` 让编译器帮你守住"只能有一个抽象方法"：

```java
@FunctionalInterface
public interface SongFilter {
    boolean accept(Song song);              // 唯一抽象方法

    default SongFilter and(SongFilter other) {   // default 方法不算抽象方法
        return song -> accept(song) && other.accept(song);
    }
}

// 使用
SongFilter popular    = song -> song.plays() > 10_000_000;
SongFilter notBanned  = song -> !song.banned();
SongFilter playable   = popular.and(notBanned);
```

实践中多数场景标准接口已经够用——自定义的合理理由通常是要抛受检异常、要多个参数，或者名字本身有业务含义。

## 4. 为什么这么设计：捕获变量的规则

Lambda 可以使用外部的局部变量，这叫捕获。规则只有一条，但值得讲透：

```java
long threshold = 10_000_000;
Predicate<Song> popular = song -> song.plays() > threshold;
// threshold = 20_000_000;   // 取消注释则上面一行编译报错
```

**局部变量必须 effectively final（只赋值一次，从不重新赋值）**。原因在实现：Lambda 捕获的是变量的值副本（编译器把它装进 Lambda 对象的字段），不是变量的引用。如果允许改，就会出现"Lambda 里看到的和外头的值对不上"的错觉——Java 的选择是直接禁止，而不是制造这种坑。

对比着记三行：

- 局部变量：捕获值副本，必须 effectively final；
- 实例字段 / 静态字段：捕获的是"this 的引用"或类引用，随便改，改的是对象本身；
- `this`：Lambda 里没有自己的 this，直接指外层实例（匿名内部类的 this 指匿名类自己）。这是两者的行为差异之一：

```java
public class Player {
    private String name = "player";

    Runnable lambda    = () -> System.out.println(this.name);   // this = Player 实例
    Runnable anonymous = new Runnable() {
        @Override public void run() {
            System.out.println(this.hashCode() != Player.this.hashCode()); // this 是匿名对象
        }
    };
}
```

需要"可变的计数器"时，正统解法不是绕过 final，而是把状态放进 `AtomicInteger` 或改用 Stream 的 `collect`/`reduce`——在并发语境下（虚拟线程、并行流）这一点直接决定线程安全。

## 5. 动手做：一个过滤 + 转换的小管道

不引入 Stream，先只用 Lambda 完成一轮"筛选热门歌并取出歌名"，体会函数从数据旁边流过的感觉：

```java
public static List<String> hotTitles(List<Song> songs, Predicate<Song> criteria) {
    List<String> result = new ArrayList<>();
    for (Song song : songs) {
        if (criteria.test(song)) {
            result.add(song.title());
        }
    }
    return result;
}

// 调用侧：条件是参数，逻辑由调用方注入
List<String> hot = hotTitles(songs, song -> song.plays() > 10_000_000);
List<String> newSongs = hotTitles(songs, song -> song.releasedThisYear());
```

`hotTitles` 是一个**高阶函数**：接收函数作为参数。它的价值在于"骨架写一次，策略随便换"——同一套循环，传不同的 `Predicate` 就是不同的业务。这条思路的工业化版本就是 Stream API（`songs.stream().filter(...).map(...).toList()`），那里连循环骨架都不用你写。

再进一步，把"取出歌名"也做成参数，就得到函数组合的雏形：

```java
public static <T, R> List<R> extract(List<T> items, Predicate<T> keep, Function<T, R> to) {
    List<R> result = new ArrayList<>();
    for (T item : items) if (keep.test(item)) result.add(to.apply(item));
    return result;
}

List<String> titles = extract(songs, s -> s.plays() > 10_000_000, Song::title);
```

`Function` 自带两个组合方法，方向别背反：

```java
Function<String, String> trim = String::strip;
Function<String, String> upper = String::toUpperCase;

trim.andThen(upper).apply("  Melt ");  // 先 trim 后 upper -> "MELT"
trim.compose(upper).apply("  Melt ");  // 先 upper 后 trim -> " MELT "（空格没去掉！）
```

`a.andThen(b)` 读作"a 然后 b"；`a.compose(b)` 读作"a 之前先 b"。测试用例里两个都跑一遍，方向错了立刻现形。

## 6. 坑点一：Lambda 里的受检异常

函数式接口的抽象方法没有声明受检异常，所以 Lambda 里不能直接抛 `IOException`：

```java
files.forEach(f -> {
    // Files.readAllLines(f) 抛 IOException，直接写编译不过
});
```

三种处理，按推荐顺序：

```java
// 1. 在 Lambda 内 try-catch，包成非受检异常（最快，但异常类型变味）
files.forEach(f -> {
    try { lines.addAll(Files.readAllLines(f)); }
    catch (IOException e) { throw new UncheckedIOException(e); }
});

// 2. 把"会抛异常的逻辑"提取成普通方法，让 try-catch 离开 Lambda 体（最推荐）
files.forEach(this::loadSafely);
private void loadSafely(Path f) {
    try { lines.addAll(Files.readAllLines(f)); }
    catch (IOException e) { log.warn("跳过坏文件: {}", f, e); }
}

// 3. 自定义"允许抛异常"的函数式接口 + 适配器（工具库常见写法）
@FunctionalInterface
interface ThrowingConsumer<T> {
    void accept(T t) throws Exception;
    static <T> Consumer<T> unchecked(ThrowingConsumer<T> c) {
        return t -> {
            try { c.accept(t); }
            catch (Exception e) { throw new RuntimeException(e); }
        };
    }
}
files.forEach(ThrowingConsumer.unchecked(f -> lines.addAll(Files.readAllLines(f))));
```

原则：Lambda 体超过三五行就该提取成具名方法——异常处理往往就顺势离开了 Lambda，可读性一并解决。

## 7. 坑点二：Optional 别当参数与字段用

Lambda 生态里 `Optional` 常和空值打交道，规则记三条：

```java
Optional<String> found = findSong(query);   // 返回值：Optional 的正统用途

found.map(String::toUpperCase)              // 链式处理，空值自动跳过
     .filter(t -> t.length() > 3)
     .orElse("未找到");

found.orElseGet(() -> expensiveFallback()); // orElse 的参数永远会执行；惰性版用 orElseGet
found.flatMap(this::lookupArtist);          // 返回值本身是 Optional 时用 flatMap 防套娃
```

1. 用作**返回值**：正确，逼着调用方面对"可能没有"；
2. 用作**字段或方法参数**：反模式，Optional 本身也可能为 null，套了两层空；
3. `orElse` vs `orElseGet`：`orElse(fallback())` 里 `fallback()` 无条件执行，有副作用或计算贵时必须 `orElseGet(() -> ...)`。

## 8. 坑点三：`(a, b) -> a - b` 比较器

第 1 节埋的坑揭晓。整型相减当比较器，在数值跨度过大时溢出：

```java
Comparator<Long> bad = (a, b) -> (int) (a - b);   // a=Long.MIN_VALUE, b=1 时溢出，符号翻转
Comparator<Long> good = Long::compare;             // 或 (a, b) -> Long.compare(a, b)
```

大播放量、时间戳、文件大小这类字段正是"大数常客"。纪律：**写比较器永远用 `Integer.compare` / `Long.compare` / `Double.compare`，或者 `Comparator.comparingLong(Song::plays)`**——后者连 Lambda 都不用写，还能链式加次级排序：

```java
songs.sort(Comparator.comparingLong(Song::plays)
                     .thenComparing(Song::title, Comparator.reverseOrder()));
```

## 易错点与最佳实践

**错误一：在 Lambda 里改捕获的局部变量。** 编译报错；要可变状态用 `AtomicInteger` 或改写为 collect。
**错误二：比较器用减法。** 第 8 节；一律 `compare` 家族。
**错误三：Lambda 体塞十行业务逻辑。** 提取具名方法，顺便解决受检异常问题（第 6 节方案 2）。
**错误四：`orElse` 里放昂贵调用。** 换 `orElseGet`。
**错误五：给能写方法引用的地方保留手写转发 Lambda。** `s -> s.toUpperCase()` 改 `String::toUpperCase`，评审时少一眼噪音。
**最佳实践**：保持 Lambda 只做"一段短行为"；策略当参数传（高阶函数）；组合优于分支（`Predicate.and`/`or` 拼条件）。

## 本篇小结

- Lambda 是函数式接口实例的简写，目标类型决定它的形状；方法引用是"参数原样转发"时的进一步缩写；
- 四大标准接口：Function（转换）、Consumer（消费）、Supplier（生产）、Predicate（判断），不够再自定义并加 `@FunctionalInterface`；
- 捕获局部变量要求 effectively final，因为捕获的是值副本；字段与 this 是引用捕获；
- 受检异常出不了 Lambda：try-catch 后提取具名方法是最优解；
- 比较器禁用减法，用 `compare` 家族或 `Comparator.comparingXxx`。

## 动手实践

1. **改造历史代码**：找一个项目里 `new Thread(new Runnable() {...})` 或匿名 `Comparator` 的代码（没有就照第 1 节默写一段），逐级改写为 Lambda、再改为方法引用，每步跑一次确认行为不变。
2. **条件生成器**：给第 5 节的 `hotTitles` 增加一个重载，接收 `int minPlays` 与 `boolean includeBanned`，内部用 `Predicate.and` 拼出过滤条件再委托主方法。思路：条件拼接本身也可以写成返回 `Predicate<Song>` 的方法。
3. **方向测试**：写三个断言验证 `andThen` 与 `compose` 的执行顺序（用带打印的 Function），把结论写进注释。
4. **排错练习**：下面代码想统计"播放量超过阈值的歌数"，找出两处问题。

```java
long threshold = 10_000_000;
long count = 0;
for (Song s : songs) {
    new Thread(() -> { if (s.plays() > threshold) count++; }).start();
}
```

思路：`count++` 修改了 effectively final 的局部变量（编译不过）；就算换成 `AtomicInteger`，主线程不等子线程就退出照样读不到结果——用 `ExecutorService` + `submit` 汇总，或干脆一条 Stream 数完。

## 下一步

- [Stream API](/java/300-StreamAPI)：把第 5 节的手写管道升级为声明式流水线；
- [Stream Collectors 与 groupingBy](/java/320-StreamCollectorsGroupingBy)：分组、统计、拼接的收集器全家桶；
- [CompletableFuture 异步编排](/java/520-CompletableFutureAsync)：Supplier/Function 当异步任务传的全场景；
- [Java 记录类](/java/450-JavaRecordClass)：Lambda 的最佳搭档——不可变数据载体。
