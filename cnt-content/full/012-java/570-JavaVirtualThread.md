---
order: 450
title: Java 与虚拟线程
module: 'java'
category: 后端技术
difficulty: intermediate
description: 从"线程池打满、QPS 上不去"的真实事故入手学会虚拟线程：三种创建方式、每任务一线程执行器、Pinning 与 ThreadLocal 两大坑、Spring Boot 一键启用，附与响应式编程的选型判断。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'java/550-JavaVirtualThreadInternals'
  - 'java/780-JavaNewFeatures'
  - 'java/580-JavaReactiveProgramming'
  - 'java/530-ThreadLocalMemoryLeak'
  - 'java/1000-JavaGraalVM'
prerequisites:
  - 'java/480-MultithreadingBasics'
  - 'java/490-ConcurrencyBasics'
  - 'java/020-JavaOverviewDevEnv'
---

## 前置知识

- [多线程基础](/java/480-MultithreadingBasics)：知道 Thread 怎么创建、join 和 sleep 是什么；
- [并发基础](/java/490-ConcurrencyBasics)：用过线程池（ExecutorService），知道"任务提交给池子"这个模型。

## 学习目标

读完本文你将能够：

1. 说清平台线程"贵"在哪，虚拟线程为什么能开百万个；
2. 用三种方式创建虚拟线程，并在真实 HTTP 并发场景跑出对比数据；
3. 识别 Pinning、ThreadLocal、池化三大反模式，知道各自的修法；
4. 一行配置让 Spring Boot 3.2+ 的请求处理跑在虚拟线程上；
5. 判断手头的服务该用虚拟线程还是响应式（Reactor）。

预计 90 分钟，含 3 组动手实验与 4 道练习。想深挖载体线程调度与 Continuation 机制的读者，读完后转 [虚拟线程内幕](/java/550-JavaVirtualThreadInternals)。

## 1. 问题引入：线程池打满的那天下午

想象你维护一个聚合查询服务：每个请求要串行调用订单、用户、支付三个下游，每个下游平均响应 100ms。服务用经典的 200 线程池：

```java
ExecutorService pool = Executors.newFixedThreadPool(200);
```

算一笔账：单个请求耗时约 300ms（三次串行调用），一个线程 1 秒能处理约 3 个请求，200 个线程满打满算 **600 QPS**。大促流量一来，线程池瞬间打满，请求在队列里排队，上游超时重试，雪崩。

想扩容？平台线程每个默认 1MB 栈（`-Xss1m`），开到 1 万个线程就是 10GB 内存还没算内核调度开销；典型 Linux 服务器线程数上限也就几千。你环顾四周，同事说"上 WebFlux 吧"，然后你看着满屏的 `flatMap` 陷入了沉默。

虚拟线程（Java 21 正式，JEP 444，Project Loom 出品）给出的答案是：**继续写同步阻塞代码，但线程便宜到可以一个请求开一个**。300ms 里 299ms 是在等 I/O，等待中的线程根本不该占着 1MB 栈和内核资源——虚拟线程在等待时会把栈"卸"下来，让底层线程去跑别的任务。

## 2. 动手做：三种创建方式与第一次对比

### 2.1 创建并启动

```java
// 方式一：直接启动（最顺手，适合一次性任务）
Thread vt = Thread.startVirtualThread(() -> {
    System.out.println("运行于: " + Thread.currentThread());
    System.out.println("是虚拟线程吗: " + Thread.currentThread().isVirtual()); // true
});

// 方式二：Builder，可命名（排查问题必备）
Thread named = Thread.ofVirtual().name("agg-worker-", 0).start(() -> doWork());

// 方式三：ThreadFactory，接老 API 用
ThreadFactory factory = Thread.ofVirtual().name("vt-", 0).factory();
```

注意打印出来的线程名形如 `VirtualThread[#52]/runnable@ForkJoinPool-1-worker-3`：`#52` 是虚拟线程自己的编号，`worker-3` 是它当前"骑"在哪个载体线程（底层平台线程）上。同一个虚拟线程不同时刻打印，worker 编号可能不同——这就是 M:N 调度的直接证据。

### 2.2 批量任务：每任务一线程执行器

这才是日常的主力写法：

```java
// try-with-resources：close() 会等所有任务跑完，还能传播异常
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 10_000).forEach(i ->
        executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1));   // 模拟 I/O 等待
            return "done-" + i;
        }));
}
// 1 万个"并发 sleep 1 秒"的任务，总耗时约 1 秒出点零头
// 换成 200 线程的平台池要跑 50 秒
```

实验一：把上面两版都跑一遍（JDK 21+，无需任何预览开关），记录各自耗时。你会看到虚拟线程版约 1 秒、平台线程池版约 50 秒，差距来自"等待时谁占着线程"。

### 2.3 真实场景：并发抓取 100 个 URL

```java
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.List;

public class FetchDemo {
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build();

    public static void main(String[] args) throws Exception {
        List<String> urls = java.util.stream.IntStream.range(0, 100)
                .mapToObj(i -> "https://httpbin.org/delay/" + (i % 3 + 1))
                .toList();

        long start = System.currentTimeMillis();
        try (var executor = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var futures = urls.stream()
                    .map(url -> executor.submit(() -> fetch(url)))
                    .toList();
            for (var f : futures) f.get();
        }
        System.out.println("100 个并发请求耗时: " + (System.currentTimeMillis() - start) + "ms");
    }

    static String fetch(String url) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10)).GET().build();
        // send() 是阻塞 API，但在虚拟线程里阻塞时会自动卸载，不占载体线程
        HttpResponse<String> resp = CLIENT.send(req, HttpResponse.BodyHandlers.ofString());
        return url + " -> " + resp.statusCode();
    }
}
```

关键点：`fetch` 里没有回调、没有 `flatMap`，就是最普通的同步代码——因为阻塞点被 JVM 接管了。网络 I/O（Socket、`HttpClient.send`、NIO 阻塞模式）、`Thread.sleep`、`BlockingQueue` 的 put/take、锁等待（`LockSupport.park`、`ReentrantLock.lock`）等绝大多数阻塞操作都会触发"卸载"。完整清单与内部机制见 [虚拟线程内幕](/java/550-JavaVirtualThreadInternals)。

## 3. 为什么它能行：一个请求一条线程，但线程是假的

对照着理解，一句话就够：

- **平台线程**：1 个 Java 线程 = 1 个操作系统线程。创建要系统调用，栈固定约 1MB，阻塞时整个内核线程挂起但资源照占。数量天花板几千。
- **虚拟线程**：M 个虚拟线程 : N 个载体线程（N 约等于 CPU 核数）。虚拟线程只是堆上的一个对象，栈按需从约 1KB 起步；阻塞时 JVM 把它的栈帧保存到堆、释放载体线程去跑别人，I/O 就绪后再挂回来恢复执行。

所以"百万并发连接"在虚拟线程下的真实含义是：堆上有百万个小对象，同一时刻真正在跑 CPU 的还是那十几个载体线程。内存账：百万平台线程约需 1TB 栈空间（物理上不可能），百万虚拟线程约 1GB 出头。

**适用边界随之而来**：虚拟线程赚的是"等待"的钱。任务全是 CPU 计算（不阻塞），虚拟线程没有任何优势，调度开销反而是负资产——CPU 密集任务请留在平台线程池（`ForkJoinPool` / `newWorkStealingPool`）。

## 4. 坑点一：Pinning——卸不了载的虚拟线程

虚拟线程的魔法依赖"阻塞时能卸载"。有两种情况卸不了，只能"钉"（Pinned）在载体线程上：

1. **native / JNI 方法内阻塞**：native 栈 JVM 管不了，卸不动。所有版本都存在。
2. **synchronized 块内阻塞（仅 JDK 21-23）**：monitor 实现当时未适配虚拟线程。JDK 24 的 JEP 491 重写后，`synchronized` 与 `Object.wait()` 内阻塞不再 Pinning。

先确认你的 JDK 版本，再决定这条坑对你的杀伤力——但写法上无脑遵守下面这条最省心：

```java
// 反模式（JDK 21-23 上钉死载体线程，退化回平台线程性能）
public synchronized User getUser(Long id) {
    return userClient.fetch(id);        // 阻塞 I/O 在 synchronized 里
}

// 修复：需要"锁住临界区 + 里面有阻塞"时，一律 ReentrantLock
private final ReentrantLock lock = new ReentrantLock();

public User getUser(Long id) {
    lock.lock();                        // 等锁时虚拟线程可正常卸载
    try {
        return userClient.fetch(id);
    } finally {
        lock.unlock();
    }
}
```

注意区分：`synchronized` 保护**纯内存**短临界区（计数器自增这类）在虚拟线程下完全没问题，不必全部替换；要警惕的是"锁内做 I/O"。

**怎么发现**：

```bash
# JDK 21-23：打印 Pinning 堆栈（JDK 24 起该属性已移除，monitor 类 Pinning 也不存在了）
java -Djdk.tracePinnedThreads=short -jar app.jar

# 所有版本通用：JFR 事件（生产推荐）
java -XX:StartFlightRecording=filename=vt.jfr -jar app.jar
jfr print --events jdk.VirtualThreadPinned vt.jfr

# 抓含虚拟线程的线程转储（JSON，便于程序分析）
jcmd <pid> Thread.dump_to_file -format=json dump.json
```

## 5. 坑点二：ThreadLocal 在百万线程下会压垮你

平台线程就几百个，每个线程一份 ThreadLocal 副本无所谓。虚拟线程百万级，每人一份就是灾难：

```java
// 反模式：每请求缓存 1MB 上下文
private static final ThreadLocal<byte[]> CTX = ThreadLocal.withInitial(() -> new byte[1024 * 1024]);

// 百万虚拟线程 × 1MB = 1TB，必然 OOM；且"每任务一线程"模式下线程不复用，
// 经典的"线程池复用所以最后 remove"纪律也失去了着力点
```

修法按优先级：

1. **ScopedValue**（JDK 25 正式，JEP 506）：不可变、作用域绑定、随作用域自动失效，专为虚拟线程设计：

```java
private static final ScopedValue<String> USER_ID = ScopedValue.newInstance();

ScopedValue.where(USER_ID, "u-1001").run(() -> {
    handleRequest();                    // 作用域内随处可读 USER_ID.get()
    // 结构化并发 fork 出的子任务自动继承绑定
});
```

2. 显式参数传递——啰嗦但零魔法，小项目往往这是最对的答案；
3. 确实要 ThreadLocal：任务结束前 `finally` 里 `remove()`。深入分析见 [ThreadLocal 内存泄漏](/java/530-ThreadLocalMemoryLeak)。

## 6. 坑点三：给虚拟线程建池子

```java
// 反模式：池化虚拟线程——既没必要也没好处
new ThreadPoolExecutor(100, 100, 0, TimeUnit.MILLISECONDS,
        new LinkedBlockingQueue<>(), Thread.ofVirtual().factory());
```

虚拟线程创建成本约 1 微秒（堆上分配对象），池化省的那点创建开销远小于队列管理开销，还引入"任务排队占着池位"的老问题。记住新口头禅：**任务来了就开线程，用完即弃**。要限制并发量（比如保护下游数据库），别限线程数，限"同时在飞的任务数"：

```java
// 用信号量限流，而不是线程池
Semaphore dbPermits = new Semaphore(50);   // 最多 50 个并发查询打到 DB
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> {
        dbPermits.acquire();
        try { return queryDb(); }
        finally { dbPermits.release(); }
    });
}
```

这个模式值得形成肌肉记忆：虚拟线程世界里，**限流用 Semaphore，不用线程池**。

## 7. 进阶一步：结构化并发聚合三个下游

回到第 1 节的聚合服务。串行调用 3 个下游要 300ms，并发调用只要最慢的那个（约 100ms）。Go 和 Kotlin 用 goroutine/协程解决这个问题，Java 的对应物是结构化并发（`StructuredTaskScope`）：

```java
// 截至 JDK 26 仍是预览特性（第 6 次预览，JEP 525），运行需 --enable-preview
// JDK 25 起 API 为 open() + Joiner；JDK 21-24 的 ShutdownOnFailure 写法已废弃
public OrderDetail fetchOrderDetail(long orderId) throws InterruptedException {
    try (var scope = StructuredTaskScope.open()) {
        // 默认策略：任一子任务失败，其余自动取消，join() 抛 FailedException
        var order   = scope.fork(() -> fetchOrder(orderId));
        var user    = scope.fork(() -> fetchUser(orderId));
        var payment = scope.fork(() -> fetchPayment(orderId));
        scope.join();
        return new OrderDetail(order.get(), user.get(), payment.get());
    }
}
```

它的价值不止"并发"：子任务生命周期被绑定在 try 块内，父任务取消（比如上游超时）会级联取消所有子任务，不会留下"孤儿任务"泄漏。竞速取最快（多副本读同一数据）用 `StructuredTaskScope.open(Joiner.anySuccessfulOrThrow())`。各完成策略的完整对照与旧 API 迁移表在 [虚拟线程内幕](/java/550-JavaVirtualThreadInternals)。

生产采用建议：特性还在预览期，API 已重设计过一次（JDK 25），新项目可以小范围试用，核心链路等转正再上。

## 8. 实战集成：Spring Boot 一行配置

Spring Boot 3.2+ 内置支持，`application.yml` 一行生效：

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

效果：Tomcat/Jetty/Undertow 改为每个请求一个虚拟线程处理，`@Async`、`@Scheduled` 同步切换。你的 Controller 就能放心写同步阻塞代码：

```java
@RestController
public class AggregateController {
    private final RestClient restClient = RestClient.create();

    @GetMapping("/api/aggregate")
    public String aggregate() {
        // 三个串行阻塞调用——在虚拟线程下不占载体线程，吞吐随并发数扩展
        String user    = restClient.get().uri("/users/1").retrieve().bodyToMono(String.class).block();
        String order   = restClient.get().uri("/orders/1").retrieve().bodyToMono(String.class).block();
        String payment = restClient.get().uri("/payments/1").retrieve().bodyToMono(String.class).block();
        return user + "|" + order + "|" + payment;
    }
}
```

上线前检查清单：

- 扫一遍 `synchronized` 包裹阻塞 I/O 的方法，换 `ReentrantLock`（跨版本安全）；
- 扫一遍 ThreadLocal 大对象，迁 ScopedValue 或确保 remove；
- JDBC 驱动升级到兼容版本（MySQL Connector/J 8.0.33+、PostgreSQL 42.6+ 均无问题）；
- 数据库连接池（HikariCP 默认 10 连接）才是新瓶颈——连接数不随线程数扩展，用 Semaphore 把并发压到池容量附近；
- 配好 JFR 监控 `jdk.VirtualThreadPinned` 事件再上线。

## 9. 选型判断：虚拟线程还是响应式

| 场景 | 推荐 | 理由 |
| ---- | ---- | ---- |
| 普通 Web 服务、CRUD、网关聚合 | 虚拟线程 | 同步代码可读性高，生态全兼容 |
| 已有 WebFlux/Reactor 存量系统 | 不急着迁 | 两者可共存；迁移收益主要在可读性 |
| 流式处理（背压、窗口、聚合操作符） | Reactor | 虚拟线程没有内建背压 |
| CPU 密集型计算 | 平台线程池 | 虚拟线程帮不上忙 |
| Kafka/消息消费者（处理 + I/O） | 虚拟线程 | 阻塞处理逻辑写起来舒服 |
| 极低延迟交易系统 | 平台线程 | 对调度延迟敏感 |

一句话判断：**你们的痛是"线程不够用"还是"回调写不动"**？前者虚拟线程是正解；后者如果同时存在流式需求，Reactor 仍有位置。响应式深入内容见 [Java 响应式编程](/java/580-JavaReactiveProgramming)。

## 易错点与最佳实践

**错误一：在 `synchronized` 里做阻塞 I/O（JDK 21-23）。**
第 4 节的修法；JDK 24+ 虽已修复 monitor 类 Pinning，跨版本团队统一 `ReentrantLock` 最省心。

**错误二：百万级 ThreadLocal。**
第 5 节；默认改 ScopedValue。

**错误三：池化虚拟线程。**
第 6 节；限流用 Semaphore。

**错误四：拿虚拟线程跑 CPU 密集任务。**
它只在"等待"上赚钱，纯计算请回平台线程池。

**错误五：以为虚拟线程能突破数据库连接池。**
线程百万个，HikariCP 还是 10 个连接。瓶颈会转移，不会消失。

**错误六：把 `spring.threads.virtual.enabled=true` 当银弹直接上生产。**
先本地压测对比，先接 Pinning 监控，先确认驱动与依赖库兼容。

## 本篇小结

- 平台线程 1:1 映射内核线程，贵在栈与阻塞占用；虚拟线程 M:N 映射载体线程，阻塞时卸载让位；
- 日常主力是 `Executors.newVirtualThreadPerTaskExecutor()`，一任务一线程，用完即弃，限流靠 Semaphore；
- 三大反模式：synchronized 内阻塞（JDK 24 前）、ThreadLocal 滥用、池化；
- Spring Boot 3.2+ 一行配置启用；JDBC 驱动与连接池是要跟着检查的两件套；
- 结构化并发（预览至 JDK 26）负责"并发聚合 + 生命周期绑定"，ScopedValue（JDK 25 正式）接替 ThreadLocal；
- 虚拟线程赚等待的钱：I/O 密集大杀器，CPU 密集与流式背压不适用。

## 动手实践

1. **复现第 1 节的事故并修复**：写一个串行调用三次 `Thread.sleep(100)` 的"聚合服务"，分别用 200 平台线程池与虚拟线程执行器压 600 个并发请求，对比总耗时。思路：虚拟线程版应快约 3 倍（串行 300ms vs 并行 100ms 的叠加效应）。
2. **亲手触发一次 Pinning**（JDK 21-23 环境）：写 `public synchronized void task() { Thread.sleep(1000); }`，开 20 个虚拟线程并发调用，加 `-Djdk.tracePinnedThreads=short` 观察输出；再换 ReentrantLock 版本对比。思路：若你是 JDK 24+，此实验不会出现 Pinning——把版本结论写进你的笔记。
3. **Semaphore 限流器**：给实践 1 的虚拟线程版加一个 `Semaphore(50)`，验证"百万任务也不至于打爆下游"——把 sleep 改成打印时间戳，观察同一时刻最多约 50 个任务在"执行"。
4. **Spring Boot 试跑**：本地起一个 Boot 3.2+ 项目，开 `spring.threads.virtual.enabled`，写一个 sleep 200ms 的接口，用 `ab` 或 `wrk` 压测开与不开的 QPS 差异。思路：不开时受限于 Tomcat 默认 200 线程，开了后瓶颈应转移到 CPU 或连接池。

## 下一步

- [虚拟线程内幕](/java/550-JavaVirtualThreadInternals)：载体线程调度、Continuation 挂载/卸载机制、完整卸载点清单、结构化并发各完成策略与 JEP 演进时间线；
- [ThreadLocal 内存泄漏](/java/530-ThreadLocalMemoryLeak)：ThreadLocal 弱引用设计与虚拟线程时代的完整防御方案；
- [Java 响应式编程](/java/580-JavaReactiveProgramming)：如果团队仍有流式与背压需求，这里是 Reactor 的系统入口。
