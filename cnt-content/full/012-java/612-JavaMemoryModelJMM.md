---
order: 560
title: Java 内存模型（JMM）：可见性、有序性与 happens-before
module: 'java'
category: 后端技术
difficulty: beginner
description: JMM 的形式化模型与诞生背景、主内存与工作内存抽象、原子性/可见性/有序性三大特性、happens-before 八条规则、内存屏障、volatile 与 final 的语义、双重检查锁定的正确写法；附 JVM 与 C++11/Go/Rust 内存模型的横向对比。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'java/610-JVMRuntimeDataAreasAndObjectLayout'
  - 'java/510-ConcurrencyDetailed'
prerequisites:
  - 'java/480-MultithreadingBasics'
---

## 知识点地图

- **知识类别**：Java 内存模型（Java Memory Model，JMM）——JLS §17.4 与 JSR 133 定义的**规范层**内容，独立于 JVM 运行时数据区（那是 [610 篇](/java/610-JVMRuntimeDataAreasAndObjectLayout)的主题）。
- **解决什么问题**：多核 CPU 每个核心有自己的缓存，一个线程改了共享变量，另一个线程可能永远看不到；编译器和处理器还会把指令重排。JMM 回答「多线程读写共享内存时，什么结果是合法的」。
- **什么时候用到**：写 volatile 标志位、实现线程安全的单例（DCL）、理解 `synchronized`/`final`/原子类的可见性边界、读并发框架源码、排查「改了配置线程就是不生效」类问题。

与并发篇的分工：[510-ConcurrencyDetailed](/java/510-ConcurrencyDetailed) 讲并发工具与死锁现场抓捕，本篇讲规范模型本体——工具为什么有效的法律依据。

## 前置知识

- [多线程基础](/java/480-MultithreadingBasics)：Thread 的创建与启动、synchronized 的基本用法；
- 建议同读 [JVM 运行时数据区](/java/610-JVMRuntimeDataAreasAndObjectLayout)：堆与方法区是 JMM 「主内存」的物理载体。

## 学习目标

读完本文你将能够：

1. 说清主内存/工作内存抽象与三大特性各自解决什么问题；
2. 背出 happens-before 八条规则，并用它们推理「这个写法线程安全吗」；
3. 解释 volatile 在 x86 与 ARM 上分别插入哪些屏障、为什么 x86 更便宜；
4. 写出正确的 DCL 单例并说出漏掉 volatile 会发生什么；
5. 对比 JVM 与 C++11/Go/Rust 内存模型的设计取舍。

预计 60 分钟，含 1 个找错环节与 2 道动手任务。本篇由原 JVM 内存模型篇拆分而来，JMM 主题内容全部收拢于此。

## 1. JMM 的诞生背景

1990 年代 Java 多线程程序在多核 x86 与弱内存模型 Alpha 处理器上行为不一致，引发大量"双重检查锁定失效"等 bug。2004 年 JSR 133 由 Manson、Pugh、Adve 重新形式化 JMM，发表于 POPL 2005。JMM 是首个被严格形式化的工业语言内存模型，影响后续 C++11、Rust、Go 的内存模型设计。

JMM 屏蔽各种硬件内存访问差异，让 Java 程序在各平台下达到一致的内存访问效果。其核心是定义共享变量的可见性、有序性、原子性规则。

**心智模型**：JMM 是一份「合同」——你（Java 程序）按合同写代码，JVM 与硬件按合同兑现语义。合同没承诺的（无同步的并发读写），出现任何结果都算「合法」，出了 bug 不能怪 JVM。

## 2. 主内存与工作内存

JMM 抽象出主内存（Main Memory）与工作内存（Working Memory）：

- **主内存**：所有共享变量的"权威"存储，对应物理主内存
- **工作内存**：每个线程私有的变量副本，对应 CPU 缓存与寄存器

线程对变量的操作规则：

1. 不能直接读写主内存
2. 必须先将变量从主内存读到工作内存
3. 修改后写回主内存
4. 不同线程间无法访问彼此的工作内存

**为什么要有这层抽象**：它是 CPU 多级缓存的模型化。线程 A 把 `flag=1` 写进了自己核心的缓存，还没刷到主存，线程 B 从主存读到的是 0——「明明改了却不生效」的物理原因。JMM 的 volatile、锁、final 等机制，本质都是在合同里规定「何时必须刷回、何时必须失效重读」。

```mermaid
flowchart LR
    subgraph ThreadA[线程 A 工作内存]
        CA[flag 副本 = 1]
    end
    subgraph ThreadB[线程 B 工作内存]
        CB[flag 副本 = 0]
    end
    MM[(主内存 flag = ?)]
    CA -.何时写回?.-. MM
    MM -.何时重读?.-. CB
```

## 3. 三大特性

### 3.1 原子性（Atomicity）

JMM 保证以下操作原子：

- 基本数据类型（除 long/double 外）的 read、load、store、write
- lock、unlock 操作

更大范围的原子性需通过 `synchronized` 或 `java.util.concurrent.atomic` 保证：

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.LongAdder;

public class AtomicityDemo {
    private int count = 0;                    // 非原子，多线程下不安全
    private final AtomicInteger atomicCount = new AtomicInteger(0);
    private final LongAdder adder = new LongAdder();  // 高并发下性能更好

    public void increment() {
        count++;                              // 非原子：读+1+写三步
        atomicCount.incrementAndGet();        // 基于 CAS，原子
        adder.increment();                    // 分段累加，最后求和
    }
}
```

**逐段讲解**：

1. `count++` 是三步：读工作内存、加一、写回——两个线程交错执行就会丢更新。32 位 JVM 上 long/double 连「读」「写」本身都不保证原子（64 位拆两条指令），这是规范明确留的口子，声明为 volatile 可补上原子性。
2. `AtomicInteger` 用 CAS（比较并交换）在硬件层保证「读-改-写」一气呵成；`LongAdder` 把一个计数拆成多段分别累加，热点竞争下吞吐更高，代价是求和瞬间可能有微小延迟。

### 3.2 可见性（Visibility）

当一个线程修改共享变量，其他线程能立即得知。

- `volatile`：强制刷新主内存，使其他线程的工作内存缓存失效
- `synchronized`：unlock 前将变量刷回主内存
- `final`：构造函数结束后，final 字段对所有线程可见

```java
public class VisibilityDemo {
    // 不加 volatile：可能死循环（JIT 优化为读寄存器）
    private boolean stop = false;

    // 加 volatile：保证可见性
    // private volatile boolean stop = false;

    public void stop() {
        stop = true;
    }

    public void run() {
        while (!stop) {
            // 不做任何事，可能被 JIT 优化为 while(true)
        }
        System.out.println("Stopped");
    }

    public static void main(String[] args) throws InterruptedException {
        VisibilityDemo demo = new VisibilityDemo();
        new Thread(demo::run).start();
        Thread.sleep(100);
        demo.stop();
        Thread.sleep(1000);
    }
}
```

**逐段讲解**：

1. 这就是「volatile 停止线程标志位」的标准模型：不加 volatile 时，JIT 发现循环体不修 `stop`，把它提升成寄存器读取——主存里已经变成 true 了，工作线程读的还是寄存器里的 false，**程序不会停**。
2. 把 `stop` 声明为 volatile，写操作立刻刷主存、读操作每次穿透到主存，循环在下一次判断就能看到 true。
3. 换别的写法：循环体里加一行 `System.out.println` 或 `Thread.sleep(1)` 也会「意外修好」——这些调用带有同步语义，顺带让 JIT 放弃了寄存器提升。所以这类 bug 在开发环境（日志多）消失、生产环境（安静循环）复现，极难定位。

### 3.3 有序性（Ordering）

程序执行顺序的保证。JMM 允许编译器、处理器进行指令重排序，但通过 happens-before 规则保证结果一致性。

```java
public class OrderingDemo {
    private int x = 0, y = 0;
    private volatile boolean ready = false;

    public void writer() {
        x = 1;          // 普通写
        y = 2;          // 普通写
        ready = true;   // volatile 写，前面的写不能重排到其后
    }

    public void reader() {
        if (ready) {    // volatile 读，后面的读不能重排到其前
            // 此处保证看到 x=1, y=2
            System.out.println("x=" + x + ", y=" + y);
        }
    }
}
```

**逐段讲解**：

1. volatile 写是一道「闸门」：普通写 x、y 不许越过它下沉；volatile 读同样不许让后面的读越过它上浮。于是读线程一旦看到 `ready==true`，x、y 必然已是 1、2——**volatile 顺带把之前普通变量的写也「发布」了出去**。
2. 这也是「配置热更新」场景的原理（真实工程）：配置刷新线程改完 `Map` 后置 volatile 的 `version` 标志，工作线程发现 version 变了再读 Map，看到的必然是完整的新配置——前提是 Map 的引用替换（而不是原地改）。

## 4. happens-before：八条规则

### 4.1 形式化模型

设 $V$ 为所有共享变量集合，$T$ 为线程集合，$A$ 为程序执行的所有内存操作序列。每个操作 $a \in A$ 形式化为五元组：

$$
a = (\text{thread}(a), \text{var}(a), \text{kind}(a) \in \{\text{read}, \text{write}, \text{lock}, \text{unlock}\}, \text{value}(a), \text{order}(a))
$$

JMM 通过 **happens-before** 偏序关系 $\xrightarrow{hb}$ 定义合法执行：

$$
\text{Legal}(A) \iff \forall \text{read } r \in A: \text{value}(r) = \text{value}(w_r) \text{ where } w_r \xrightarrow{hb} r \wedge \nexists w': w_r \xrightarrow{hb} w' \xrightarrow{hb} r
$$

翻译成人话：一个读操作看到的值，必须是 happens-before 链上「最近的那次写」——链没连上，读到任何值（包括过期值）都合法。

### 4.2 八条规则（JLS §17.4.5）

1. **程序次序规则**：同一线程中，按代码顺序 $a$ 先于 $b$，则 $a \xrightarrow{hb} b$
2. **监视器锁规则**：unlock 操作 $\xrightarrow{hb}$ 同一锁的后续 lock
3. **volatile 规则**：volatile 写 $\xrightarrow{hb}$ 同一变量的后续读
4. **线程启动规则**：`Thread.start()` $\xrightarrow{hb}$ 线程内任意操作
5. **线程终止规则**：线程内任意操作 $\xrightarrow{hb}$ `Thread.join()` 返回
6. **中断规则**：`Thread.interrupt()` $\xrightarrow{hb}$ 被中断线程检测到中断
7. **对象终结规则**：构造函数结束 $\xrightarrow{hb}$ finalizer 开始
8. **传递性**：$a \xrightarrow{hb} b \wedge b \xrightarrow{hb} c \Rightarrow a \xrightarrow{hb} c$

**用规则推理三个日常写法**：

- 主线程先设置 `data` 再 `thread.start()`，子线程里读 `data`：规则 4 + 8 保证看到新值——**start 前的构造数据天然安全发布**。
- 主线程等 `thread.join()` 后读线程算好的结果：规则 5 保证看到全部写入——join 是天然的同步点。
- 线程 A `synchronized(lock){ map = newMap; }`，线程 B `synchronized(lock){ use(map); }`：规则 2 + 8 保证 B 看到完整新 map——锁不仅互斥，还管可见性。

**反例**：两个线程各自往 `ArrayList` 加元素且无锁——没有任何 happens-before 链连接它们，读到 null、丢元素、`ArrayIndexOutOfBoundsException` 全都「合法」。

## 5. 内存屏障：volatile 的硬件实现

JMM 定义四种内存屏障：

| 屏障类型 | 形式化语义 | 作用 |
| -------- | ---------- | ---- |
| LoadLoad | $L_1; \text{LoadLoad}; L_2$ ⟹ $L_1$ 先于 $L_2$ | 阻止读重排 |
| StoreStore | $S_1; \text{StoreStore}; S_2$ ⟹ $S_1$ 先于 $S_2$ 且刷新 | 阻止写重排 |
| LoadStore | $L_1; \text{LoadStore}; S_2$ ⟹ $L_1$ 先于 $S_2$ | 阻止读后写重排 |
| StoreLoad | $S_1; \text{StoreLoad}; L_2$ ⟹ 全局排序 | 最强屏障，开销最大 |

HotSpot 对 volatile 写插入 `StoreStore + StoreLoad`，对 volatile 读插入 `LoadLoad + LoadStore`。在 x86 强内存模型下，仅 volatile 写需要 `lock addl` 作为 StoreLoad 屏障；ARM 弱内存模型需要全部四种屏障。

```java
public class VolatileFlag {
    private int data;                  // 普通变量
    private volatile boolean ready;    // volatile 标志

    public void producer() {
        data = 42;        // StoreStore 屏障保证它先于 ready 写入生效
        ready = true;     // volatile 写：StoreStore + StoreLoad
    }

    public void consumer() {
        if (ready) {      // volatile 读：LoadLoad + LoadStore
            assert data == 42;   // 必然成立
        }
    }
}
```

**为什么 volatile 写更贵**：StoreLoad 是唯一需要「全局排序」的屏障，x86 上用带 lock 前缀的指令实现，会把存储缓冲区整体刷出。读比写便宜——所以高频读、低频写的配置标志用 volatile 最划算。

## 6. final 字段与安全发布

JMM 对 final 字段有特殊保证：构造函数结束前，final 字段的写入对所有线程可见（即使没有 volatile/synchronized）。

```java
public final class ImmutablePoint {
    private final int x;
    private final int y;

    public ImmutablePoint(int x, int y) {
        this.x = x;
        this.y = y;
        // 构造函数结束后，其他线程看到的 x、y 一定已初始化
    }

    public int getX() { return x; }
    public int getY() { return y; }
}
```

```java
// 安全发布：通过 volatile 或 final 保证可见性
public class SafePublication {
    private ImmutablePoint point;  // 不安全：可能看到部分构造的对象

    // 方式 1：volatile
    private volatile ImmutablePoint safePoint1;

    // 方式 2：final（构造时安全）
    public SafePublication(ImmutablePoint p) {
        this.point = p;  // 不安全
    }
}
```

**逐段讲解**：

1. `ImmutablePoint` 自身的 x、y 是 final：**这个对象一旦构造完成，字段就是安全可见的**——前提是「构造完成后才把引用给别人」。
2. `SafePublication.point` 不是 final 也不是 volatile：另一线程可能看到半初始化的 point 引用。注释里「方式 2」只是示例对照——给 SafePublication 的字段加 final 才安全，构造参数本身不能解决发布问题。
3. 三个场景：**不可变值对象**（坐标、金额、日期区间）全字段 final，天然线程安全，随便跨线程传——这是最省心的并发设计；**配置对象**用 volatile 引用整体替换（copy-on-write），读线程无锁；**对象池/缓存**里的可变对象不行，别把 final 的安全性错误外推到「容器里的对象」。

## 7. 双重检查锁定（DCL）：从失效到正确

```java
public class Singleton {
    // 必须用 volatile，否则可能看到部分构造的 instance
    // （分配内存 + 赋值引用 在 初始化字段 之前完成）
    private static volatile Singleton instance;

    private final String config;

    private Singleton() {
        this.config = loadConfig();
    }

    public static Singleton getInstance() {
        if (instance == null) {                  // 第一次检查，避免锁开销
            synchronized (Singleton.class) {
                if (instance == null) {          // 第二次检查，避免重复创建
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }

    private String loadConfig() { return "default"; }
}
```

**逐段讲解**：

1. 第一次检查无锁快速路径：实例已存在时零同步开销——DCL 存在的全部意义。
2. **为什么必须 volatile**：`new Singleton()` 不是原子操作，至少分三步——分配内存 → 调构造器初始化 → 把引用赋给 instance。步骤 2 与 3 允许重排：另一线程在第一次检查时看到「非 null 但还没初始化完」的引用，拿去用 config 就是 null。volatile 禁止这个重排。
3. 换别的写法：
   - 静态内部类 Holder（利用类加载的初始化锁，天然线程安全且懒加载）；
   - 枚举单例（防反射、防序列化破坏）；
   - Spring 容器里的 Bean 本身就是单例注册表——框架场景大多不用手写。

**易错点**：漏 volatile 的 DCL 在单核或 x86 上常「测不出来」（重排概率低），压测或换 ARM 设备后偶发——这正是 JMM 意义所在：**不能靠「碰巧没事」，要靠合同条文**。

## 8. 对比分析：JVM 与其他语言的内存模型

### 8.1 JVM 内存模型 vs C++ 内存模型

| 维度 | Java（JMM） | C++11 |
| ---- | ----------- | ----- |
| 形式化时间 | 2004（JSR 133） | 2011 |
| 内存序 | volatile（强）、final、happens-before | memory_order_relaxed/acquire/release/seq_cst |
| 默认顺序 | 程序次序 + 数据依赖 | memory_order_seq_cst |
| GC | 强制 | 无（需手动或 RAII） |
| 安全性 | 高（运行时检查） | 中（编译期检查） |

C++ 的 `memory_order` 是细粒度旋钮：relaxed 只保原子不保顺序，acquire/release 对应 Java volatile 的一半语义，seq_cst 才是全序默认。Java 把这套复杂性收进了语言，代价是调不了低档位；C++ 给了档位，代价是选错就翻车（模块 023-cpp 的 450 篇专讲）。

### 8.2 JVM 内存模型 vs Go 内存模型

| 维度 | Java | Go |
| ---- | ---- | --- |
| 模型 | happens-before | happens-before |
| 同步原语 | synchronized、volatile、final | sync.Mutex、channel、atomic |
| Channel 语义 | 无（BlockingQueue 模拟） | 内建，send happens-before receive |
| GC | 分代（G1/ZGC） | 并发三色标记（无分代） |
| 停顿 | G1 100ms、ZGC < 1ms | 通常 < 1ms |

Go 没有 volatile 关键字——官方立场是「用 channel 或锁交流，别用共享内存」，channel 的收发自带 happens-before。Java 的 `BlockingQueue`（happens-before 契约写进了 javadoc）是同款思路的库级实现。

### 8.3 JVM 内存模型 vs Rust 内存模型

| 维度 | Java | Rust |
| ---- | ---- | ---- |
| 内存安全 | 运行时（GC） | 编译期（所有权 + 借用） |
| 并发安全 | synchronized/atomic | Send/Sync trait |
| 数据竞争 | 可能（运行时检测难） | 编译期拒绝 |
| 内存回收 | GC | 所有权 + Drop |
| 性能 | 中等 | 接近 C |

三者的共同源头都是 JMM 式的 happens-before 思想；差异在于把「防数据竞争」的责任放哪——Java 放运行时纪律，C++ 放程序员，Rust 放编译器。

## 9. 语法速查：可见性与内存模型

**基本写法：volatile 保证可见性**
`volatile <类型> <字段>`
```java
// 写入立即对其他线程可见，禁止指令重排
private volatile boolean running = true;
```

---

**基本写法：happens-before 规则**
`<线程A> happens-before <线程B>`
```java
// 锁释放 happens-before 后续锁获取
// volatile 写 happens-before 后续 volatile 读
// 线程启动 happens-before 其 run 方法
```

---

**基本写法：原子性**
`synchronized` / `AtomicInteger`
```java
// 通过锁或原子类保证操作原子性
AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet();
```

---

**基本写法：可见性**
`volatile` / `synchronized`
```java
// 通过 volatile 保证变量修改对所有线程可见
private volatile boolean flag = false;
```

---

**基本写法：有序性**
`volatile` / `happens-before`
```java
// volatile 写之前的操作不会被重排到写之后
private int x = 0;
private volatile boolean ready = false;
public void writer() { x = 42; ready = true; }
```

## 10. 动手实践

### 任务一：复现可见性问题（热身）

把第 3.2 节的 `VisibilityDemo` 跑起来（不加 volatile），观察主线程 stop 后工作线程是否停止；然后逐个尝试三种「修法」：加 volatile、循环体加 `Thread.sleep(1)`、循环体加一行打印——记录每种修法的结果，并用第 3.2 节的原理解释为什么后两种也能「治好」。

提示：如果加 volatile 前程序就停了，把循环里加个局部计算再试，或多开几次；JIT 的优化强度与环境有关，这本身就是「不能靠运气」的实证。

### 任务二：找错——这版 DCL 安全吗（实战）

```java
public class ConfigHolder {
    private static ConfigHolder instance;          // 行 A
    private final Map<String, String> config;

    private ConfigHolder() {
        config = loadFromDisk();
    }

    public static ConfigHolder getInstance() {
        if (instance == null) {
            synchronized (ConfigHolder.class) {
                instance = new ConfigHolder();     // 行 B：少了第二次检查
            }
        }
        return instance;
    }
}
```

提示一：两个线程同时通过第一次检查后会发生什么？提示二：行 A 缺了什么修饰符，后果是什么？

**参考实现（先自己写完再展开对照）**：

```java
public class ConfigHolder {
    private static volatile ConfigHolder instance;   // 修正一：volatile 禁止「初始化」与「赋引用」重排

    private final Map<String, String> config;

    private ConfigHolder() {
        config = loadFromDisk();
    }

    public static ConfigHolder getInstance() {
        if (instance == null) {                      // 第一次检查：快速路径
            synchronized (ConfigHolder.class) {
                if (instance == null) {              // 修正二：第二次检查防重复创建
                    instance = new ConfigHolder();
                }
            }
        }
        return instance;
    }
}
```

缺第二次检查时，两个线程先后进锁各自 new 一个实例，先创建的实例被后者覆盖——若有别的代码已经持有第一个实例，系统里就同时存在两份配置。缺 volatile 时则可能读到「非 null 但 config 还没填充」的半成品。两个修正各管一个失效模式。

### 任务三：happens-before 推理练习

不写代码，用八条规则推理下面三种写法中「子线程能否看到主线程的修改」，每条写出用到的规则编号：a) 主线程先 `map.put("k","v")` 再 `thread.start()`；b) 主线程先 `thread.start()` 后 `map.put("k","v")`；c) 子线程计算完后主线程 `join()` 再读结果。

提示：b) 中 start 之前的规则链断了——put 与子线程的读之间没有任何同步动作，结果是「看不到」；把数据构造移到 start 前即可。

## 参考与致谢

- *The Java Language Specification, Java SE 21 Edition* §17.4 Memory Model（https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.4 ）：happens-before 规则与正确性形式化的官方定义；
- JSR 133: Java Memory Model and Thread Specification Revision（Manson/Pugh/Adve，POPL 2005）——JMM 形式化的原始提案；
- Brian Goetz 等, *Java Concurrency in Practice*（并发圣经，第 16 章为 JMM 与安全发布的系统讲解）；
- 原模块 JVM 内存模型篇拆分：本文承接其 JMM 全部主题内容（诞生背景、形式化模型、happens-before、内存屏障、三大特性、volatile/final 语义、DCL、跨语言对比与相关速查）；
- [JVM 运行时数据区与对象布局](/java/610-JVMRuntimeDataAreasAndObjectLayout)：运行时数据区、堆分代与 GC 的物理层视角。
