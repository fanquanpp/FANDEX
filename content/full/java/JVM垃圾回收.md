---
order: 55
title: JVM垃圾回收
module: java
category: Java
difficulty: advanced
description: GC算法与垃圾回收器
author: fanquanpp
updated: '2026-06-14'
related:
  - java/JUC并发包
  - java/JVM类加载机制
  - java/Java反射
  - java/Java序列化
prerequisites:
  - java/概述与开发环境
---

## 学习目标

完成本章学习后，你应当能够：

- **Remember（记忆）**：复述 JVM 垃圾回收（Garbage Collection, GC）的核心术语，包括 root set、reachability、safepoint、write barrier 等概念。
- **Understand（理解）**：解释标记-清除、标记-整理、复制算法、分代收集四类基础 GC 算法的工作原理，以及它们各自的空间与时间复杂度权衡。
- **Apply（应用）**：在生产环境中使用 `jstat`、`jcmd`、`jmap`、JFR（Java Flight Recorder）等工具定位 GC 异常，并通过 JVM 参数调整堆大小、回收器与暂停目标。
- **Analyze（分析）**：解构 G1、ZGC、Shenandoah 三种现代回收器的回收流水线，识别并发标记、转移、引用处理、卸载各阶段的停顿来源。
- **Evaluate（评价）**：针对不同 SLA（延迟敏感、吞吐量优先、大堆内存）场景，评估并选择合适的 GC 算法与参数组合，并量化其对 P99 延迟的影响。
- **Create（创造）**：设计一套基于真实负载的 GC 调优实验方案，包含基线测量、假设验证、回归测试，输出可复现的调优报告。

## 历史动机与发展脉络

### 自动内存管理的诞生

手动内存管理是早期系统软件缺陷的主要来源。1960 年代，John McCarthy 在 Lisp 中首次引入垃圾回收概念，使程序员从显式 `free` 的负担中解放出来。Java 自 1995 年发布起就将 GC 作为语言运行时的核心特性，这一决策深刻影响了后续三十年托管语言（managed language）的设计哲学。

### Java GC 演进时间线

| 版本 | 年份 | 关键 GC 里程碑 | 工程意义 |
| --- | --- | --- | --- |
| JDK 1.0 | 1996 | 分代 Serial GC（`-XX:+UseSerialGC`） | 客户端应用首次拥有稳定 GC |
| JDK 1.2 | 1998 | 引入 Weak Reference、Soft Reference、Phantom Reference | 支持缓存与资源释放语义 |
| JDK 1.4 | 2002 | Parallel GC（`-XX:+UseParallelGC`） | 多核服务器吞吐量优先 |
| JDK 5 | 2004 | CMS（Concurrent Mark-Sweep）登场 | 首次将并发标记引入主流 JVM |
| JDK 6 | 2006 | CMS 生产可用，ParallelOld 成熟 | 服务端低延迟场景普及 |
| JDK 7 | 2011 | G1（Garbage-First）实验性引入 | 分区化（region-based）回收雏形 |
| JDK 8 | 2014 | G1 移除实验标记，永久代被元空间（Metaspace）取代 | LTS 版本奠定现代 GC 基础 |
| JDK 9 | 2017 | 统一日志框架 `-Xlog:gc*`；CMS 标记 deprecated | 日志与分析工具标准化 |
| JDK 10 | 2018 | Parallel GC 完全并行化 Full GC | 大堆 Full GC 停顿大幅下降 |
| JDK 11 | 2018 | ZGC 实验性、Epsilon GC（no-op）；G1 成为默认 | LTS 版本：低延迟探索起步 |
| JDK 12 | 2019 | G1 中断性混合回收（Abortable Mixed Collections） | 可中断回收提升可调度性 |
| JDK 14 | 2020 | CMS 移除；ZGC 支持 macOS/Windows | 减少 GC 选项复杂度 |
| JDK 15 | 2020 | ZGC、Shenandoah 生产可用（Production） | 亚毫秒级停顿成为现实 |
| JDK 17 | 2021 | ZGC 泄漏检测、G1 堆占用细化 | LTS 版本：低延迟 GC 工业级可用 |
| JDK 21 | 2023 | 分代 ZGC（`-XX:+ZGenerational`）正式 GA | 分代 + 低延迟双优 |
| JDK 23+ | 2024 | ZGC 分代默认、Generational Shenandoah 演进 | 持续优化大堆与延迟 |

### 设计动机的三个维度

GC 的演进始终围绕三条互相制约的轴线展开：

1. **吞吐量（Throughput）**：应用线程运行时间占比。Parallel GC 以此为目标，但牺牲延迟。
2. **延迟（Latency）**：单次 GC 停顿的 P99、P99.9 分位。CMS、G1、ZGC、Shenandoah 沿此方向迭代。
3. ** footprint（内存占用）**：堆利用率与元数据开销。复制算法牺牲一半空间换取无碎片。

经典的"GC 不可能三角"指出：在任意时刻，三者中最多同时优化两者。ZGC 通过读屏障（load barrier）与染色指针（colored pointer）实现了延迟与吞吐的较好平衡，但 footprint 略高于 G1。

## 形式化定义

### JVM 规范视角下的 GC

Java 虚拟机规范（JVMS §2.5）规定堆是所有线程共享的运行时数据区，用于分配绝大多数类实例与数组。规范**并不要求**实现 GC，但所有主流实现均提供。规范的开放性使得 HotSpot、OpenJ9、GraalVM、Azul Zing 可以采用截然不同的策略。

### 可达性分析的形式化

设对象图为有向图 $G = (V, E)$，其中 $V$ 是堆中所有对象，$E \subseteq V \times V$ 表示对象间引用。定义 **GC Roots** 集合 $R \subseteq V$ 为：

$$
R = \{\text{local vars}\} \cup \{\text{active frames}\} \cup \{\text{static fields}\} \cup \{\text{JNI globals}\} \cup \{\text{sync monitors}\}
$$

对象 $o \in V$ 是 **可达的（reachable）** 当且仅当存在路径 $r \to v_1 \to v_2 \to \dots \to o$，其中 $r \in R$。GC 的核心任务即计算：

$$
\text{Live}(G, R) = \{o \in V \mid \exists r \in R,\, r \leadsto o\}
$$

回收集合为 $\text{Dead}(G, R) = V \setminus \text{Live}(G, R)$。

### 三色标记定理

Dijkstra 等人提出的三色不变式（tri-color invariant）是并发标记的理论基础。将对象着色为：

- **白（White）**：尚未被标记。
- **灰（Gray）**：已被标记但其引用尚未全部扫描。
- **黑（Black）**：已被标记且其引用全部扫描完毕。

不变式要求：**不存在从黑对象到白对象的引用**。形式化：

$$
\forall (u, v) \in E,\ \text{color}(u) = \text{Black} \implies \text{color}(v) \neq \text{White}
$$

并发标记过程中，应用线程修改引用可能破坏不变式，因此需要 **write barrier**：当黑对象新增指向白对象的引用时，将白对象着灰（增量更新，CMS/G1 采用），或将黑对象回退为灰（SATB——Snapshot At The Beginning，Shenandoah/G1 部分阶段采用）。

### 停顿时间模型

设单次 GC 停顿时间为 $T_{\text{pause}}$，可分解为：

$$
T_{\text{pause}} = T_{\text{init-mark}} + T_{\text{remark}} + T_{\text{evac}} + T_{\text{ref-proc}} + T_{\text{unloading}}
$$

其中 $T_{\text{evac}}$（对象转移）通常占主导。ZGC 通过将转移拆分为并发阶段（concurrent relocate）将 $T_{\text{evac}}$ 控制在常数级，从而实现 $T_{\text{pause}} < 1\text{ms}$ 的目标。

## 理论推导与原理解析

### 标记-清除（Mark-Sweep）

**算法**：

1. 从 roots 出发深度优先遍历，标记所有可达对象。
2. 线性扫描整个堆，回收未标记对象。

**复杂度**：标记阶段 $O(|\text{Live}|)$，清除阶段 $O(|V|)$，总复杂度 $O(|V|)$。

**碎片问题**：清除后产生大量不连续空闲块。设堆大小为 $H$，存活对象总大小为 $L$，最坏情况下最大可分配对象为 $O(\text{fragment}(H, L))$，可能远小于 $H - L$。

### 标记-整理（Mark-Compact）

**算法**：标记后，将存活对象滑动（slide compaction）至堆一端，更新所有引用。

**复杂度**：整理阶段需 $O(|V|)$ 遍历两次（一次计算新地址，一次移动对象），引用更新 $O(|E|)$。

**优点**：无碎片，分配仅需 bump pointer $O(1)$。

**缺点**：移动对象开销大，且需 STW（Stop-The-World）以保证引用一致性。

### 复制算法（Copying）

**算法**：将堆分为 From、To 两半，GC 时将 From 中存活对象复制到 To，然后交换两半。

**复杂度**：$O(|\text{Live}|)$，与死对象数量无关，适合存活率低的场景。

**空间利用率**：$\eta = \frac{L}{H/2} = \frac{2L}{H}$，最坏为 0%。

**分代假说**：经验统计表明，绝大多数对象"朝生夕灭"——存活率 $L/H \ll 50\%$。新生代采用复制算法，仅浪费 10%（Eden:S0:S1 = 8:1:1）。

### 分代收集（Generational）

将堆分为新生代（Young）与老年代（Old），分别采用不同算法：

$$
\text{GC}_{\text{young}}: \text{Copying};\quad \text{GC}_{\text{old}}: \text{Mark-Compact or Mark-Sweep}
$$

晋升阈值（`-XX:MaxTenuringThreshold`，默认 15）控制对象何时从新生代进入老年代。动态年龄计算：若 Survivor 中某年龄段累计大小超过 Survivor 一半，则该年龄及以上对象直接晋升。

### 卡表（Card Table）

为支持跨代引用（old → young）的快速扫描，HotSpot 维护字节数组卡表，每 512B 堆对应 1B 卡。写引用时通过 write barrier 标脏卡：

$$
\text{card}[addr \gg 9] = 1
$$

Minor GC 时仅需扫描脏卡，而非整个老年代，复杂度从 $O(|\text{Old}|)$ 降至 $O(|\text{dirty cards}|)$。

### G1 分区模型

G1 将堆划分为 $N$ 个等大 region（1/2/4/8/16/32 MB），每个 region 动态充当 Eden、Survivor、Old 或 Humongous。回收集合（Collection Set, CSet）按回收收益排序：

$$
\text{gain}(r) = \frac{\text{garbage}(r)}{\text{cost}(r)}
$$

选择 gain 最大的 region 优先回收，故名 "Garbage-First"。

### ZGC 染色指针

ZGC 利用 64 位指针的剩余位编码对象状态（Marked0、Marked1、Remapped、Finalizable）。读屏障检查指针颜色，按需转发到新地址：

$$
\text{load}(p):\ \text{if color}(p) \neq \text{Remapped} \Rightarrow p \leftarrow \text{forward}(p)
$$

这使得对象可在并发转移过程中被访问，停顿与堆大小解耦，达成 $O(1)$ 暂停。

## 代码示例

### 示例 1：观察 GC 行为的最小程序

`pom.xml`：

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.fandex.gc</groupId>
    <artifactId>gc-demo</artifactId>
    <version>1.0.0</version>
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    <build>
        <plugins>
            <plugin>
                <artifactId>maven-jar-plugin</artifactId>
                <version>3.3.0</version>
                <configuration>
                    <archive>
                        <manifest><mainClass>com.fandex.gc.GcDemo</mainClass></manifest>
                    </archive>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

`src/main/java/com/fandex/gc/GcDemo.java`（Java 17）：

```java
package com.fandex.gc;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * GC 行为观察示例。
 * 通过制造短生命周期对象，触发 Minor GC；通过持有长期引用制造晋升。
 */
public final class GcDemo {

    /** 长期持有，模拟老年代对象。 */
    private static final List<byte[]> LONG_LIVED = new ArrayList<>();

    public static void main(String[] args) throws InterruptedException {
        System.out.println("PID = " + ProcessHandle.current().pid());
        for (int i = 0; i < 1_000_000; i++) {
            // 短生命周期对象：分配后立即失效，触发 Minor GC
            byte[] ephemeral = new byte[16 * 1024];
            if (i % 100 == 0) {
                // 每 100 次保留一份，模拟晋升
                LONG_LIVED.add(new byte[64 * 1024]);
            }
            if (i % 10_000 == 0) {
                System.out.printf("iter=%d, heapUsed=%d MB%n",
                        i, Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory() >> 20);
            }
            TimeUnit.MILLISECONDS.sleep(1);
        }
    }
}
```

运行（Java 17，G1）：

```bash
java -Xms256m -Xmx256m \
     -XX:+UseG1GC \
     -Xlog:gc*=info:file=gc.log:time,uptime,level,tags:filecount=5,filesize=10M \
     -jar target/gc-demo-1.0.0.jar
```

### 示例 2：使用 JFR 监控 GC（Java 17+）

```java
package com.fandex.gc;

import jdk.jfr.Configuration;
import jdk.jfr.Recording;
import java.nio.file.Path;

/**
 * 通过 JFR（Java Flight Recorder）持续记录 GC 事件，
 * 用于生产环境低开销采样与离线分析。
 */
public final class JfrGcMonitor {

    public static void main(String[] args) throws Exception {
        Configuration config = Configuration.getConfiguration("profile");
        try (Recording recording = new Recording(config)) {
            recording.enable("jdk.GCPhasePause").withThreshold("10ms");
            recording.enable("jdk.GarbageCollection");
            recording.enable("jdk.G1HeapSummary");
            recording.setMaxAge(java.time.Duration.ofMinutes(10));
            recording.setToDisk(true);
            recording.start();

            Thread.sleep(60_000); // 采样 1 分钟
            recording.stop();
            recording.dump(Path.of("gc-recording.jfr"));
            System.out.println("JFR 文件已生成：gc-recording.jfr");
        }
    }
}
```

分析：

```bash
jfr print --events jdk.GarbageCollection,jdk.GCPhasePause gc-recording.jfr
```

### 示例 3：WeakReference 实现缓存

```java
package com.fandex.gc;

import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * 基于 WeakReference 的轻量缓存。
 * GC 在内存压力下自动回收键，避免 OOM。
 */
public final class WeakCache<K, V> {

    private final Map<WeakReference<K>, V> backing = new HashMap<>();
    private final Function<K, V> loader;

    public WeakCache(Function<K, V> loader) {
        this.loader = loader;
    }

    public V get(K key) {
        for (Map.Entry<WeakReference<K>, V> e : backing.entrySet()) {
            K existing = e.getKey().get();
            if (existing != null && existing.equals(key)) {
                return e.getValue();
            }
        }
        V value = loader.apply(key);
        backing.put(new WeakReference<>(key), value);
        purgeStale();
        return value;
    }

    /** 清理已被 GC 回收的弱引用。 */
    private void purgeStale() {
        backing.entrySet().removeIf(e -> e.getKey().get() == null);
    }
}
```

### 示例 4：Maven 项目集成 GC 友好配置

```xml
<!-- pom.xml 关键插件 -->
<plugin>
    <groupId>org.codehaus.mojo</groupId>
    <artifactId>exec-maven-plugin</artifactId>
    <version>3.1.0</version>
    <configuration>
        <executable>java</executable>
        <arguments>
            <argument>-Xms2g</argument>
            <argument>-Xmx2g</argument>
            <argument>-XX:+UseZGC</argument>
            <argument>-XX:+ZGenerational</argument>
            <argument>-XX:+HeapDumpOnOutOfMemoryError</argument>
            <argument>-XX:HeapDumpPath=${project.build.directory}/oom</argument>
            <argument>-Xlog:gc*:file=${project.build.directory}/gc.log:time,level,tags</argument>
            <argument>-classpath</argument>
            <classpath/>
            <argument>com.fandex.gc.GcDemo</argument>
        </arguments>
    </configuration>
</plugin>
```

### 示例 5：Gradle Kotlin DSL 配置

`build.gradle.kts`：

```kotlin
plugins {
    application
}
application {
    mainClass.set("com.fandex.gc.GcDemo")
    applicationDefaultJvmArgs = listOf(
        "-Xms2g", "-Xmx2g",
        "-XX:+UseZGC", "-XX:+ZGenerational",
        "-XX:+HeapDumpOnOutOfMemoryError",
        "-XX:HeapDumpPath=build/oom",
        "-Xlog:gc*:file=build/gc.log:time,level,tags"
    )
}
```

## 对比分析

### 与 Kotlin/Scala/C#/Go 的内存管理对比

| 语言/平台 | 默认回收器 | 典型停顿 | 分代 | 并发标记 | 并发转移 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| Java (JDK 21, HotSpot) | G1 / 分代 ZGC | G1: 10–200ms；ZGC: <1ms | 是 | 是 | ZGC 是 | 工业级最成熟生态 |
| Kotlin/JVM | 同 Java | 同上 | 同上 | 同上 | 同上 | 复用 JVM GC |
| Scala/JVM | 同 Java | 同上 | 同上 | 同上 | 同上 | 复用 JVM GC |
| Scala/Native | Boehm GC | 数十 ms | 否 | 否 | 否 | 简单保守式 GC |
| C# (.NET 8) | Server GC / Desktop GC | <5ms（Server BG） | 是 | 是 | 部分 | 分代 + 并发 BGC |
| Go | 并发三色标记 + 非分代 | 0.5–10ms | 否 | 是 | 否 | 低延迟但不分代，依赖逃逸分析减少堆分配 |
| Rust | 无 GC（所有权） | 0 | — | — | — | 编译期管理；运行时零成本 |
| Swift | ARC（引用计数） | 0（但偶发回收） | 否 | 否 | 否 | 自动但非 GC；循环引用需 weak |
| Python | 引用计数 + 分代标记清除 | 数十 ms（GIL 内） | 是（3 代） | 否 | 否 | GIL 限制并发 |
| V8 (Node.js) | Orinoco 分代 + 并发 | 1–10ms | 是 | 是 | 部分 | 增量与并发结合 |

### 设计哲学差异

- **Java**：以分代假说为核心，将工程经验形式化为分代 + 并发的复合策略，追求"在任意堆大小下保持可预测停顿"。
- **Go**：放弃分代，依赖编译器逃逸分析与栈分配，使大部分对象从不进入堆；GC 设计目标明确为"低延迟而非吞吐"。
- **Rust**：完全拒绝 GC，以所有权（ownership）与借用检查（borrow checker）在编译期消除内存管理运行时成本。
- **C#**：与 Java 高度相似，但 .NET 8 引入 Dynamic PGO 与分层编译，使 GC 决策可与 JIT 反馈协同。

### 性能维度量化对比

设堆大小 8GB，存活集 2GB，分配速率 1GB/s，目标 P99 延迟 < 10ms：

| 方案 | P99 停顿 | 吞吐损失 | footprint | 调参复杂度 |
| --- | --- | --- | --- | --- |
| JDK 17 G1 | 50–200ms | 5–10% | 1.0× | 中 |
| JDK 21 分代 ZGC | <1ms | 3–8% | 1.1–1.3× | 低 |
| .NET 8 Server BG | 3–10ms | 5–10% | 1.0× | 中 |
| Go 1.22 | 1–5ms | 5–15% | 1.2× | 低 |
| Rust（无 GC） | 0 | 0 | 1.0× | 高（开发期） |

## 常见陷阱与最佳实践

### 陷阱 1：误用 `System.gc()`

显式调用 `System.gc()` 在某些 JDK 下会触发 Full GC，导致不可预期的停顿。

**正确做法**：

- 禁用显式 GC：`-XX:+DisableExplicitGC`。
- 若必须触发（如性能测试基线），使用 `ManagementFactory.getGarbageCollectorMXBeans()` 主动控制。

### 陷阱 2：finalize 方法复活对象

`Object.finalize()` 默认在 GC 前调用，若在 finalize 中重新建立对自身的强引用，会"复活"对象，导致回收失败。Java 9 起 finalize 标记 deprecated，Java 18+ 标记 forRemoval。

**替代方案**：实现 `AutoCloseable`，配合 try-with-resources；或使用 `Cleaner` API（`java.lang.ref.Cleaner`）。

### 陷阱 3：内存泄漏的隐蔽形式

```java
// 错误：静态 Map 持续增长，永不回收
public class Cache {
    private static final Map<String, byte[]> DATA = new HashMap<>();
    public static void put(String k, byte[] v) { DATA.put(k, v); }
}
```

**最佳实践**：使用 `WeakHashMap`、Caffeine、Guava Cache 设置 TTL/容量上限。

### 陷阱 4：大对象直接进入老年代

`-XX:PretenureSizeThreshold`（仅对 Serial/ParNew 有效）控制大对象直接进入老年代。误配置会导致老年代快速膨胀、频繁 Full GC。

**最佳实践**：G1/ZGC 下，大对象由 Humongous/ZGC 自动处理，无需手动调参；优先重构代码减少大数组分配。

### 陷阱 5：错误的停顿目标

`-XX:MaxGCPauseMillis` 是**软目标**，并非保证。设置过低会导致 CSet 过小、GC 频繁、吞吐崩溃。

**最佳实践**：基于实际负载使用 JMH/JFR 测量，从 200ms 起步逐步下调，观察吞吐量曲线拐点。

### 陷阱 6：忽略元空间泄漏

动态类生成（CGLIB、ASM、反射代理）会持续加载类，导致 Metaspace OOM。

**最佳实践**：

```bash
-XX:MetaspaceSize=256m
-XX:MaxMetaspaceSize=512m
-XX:+TraceClassLoading   # JDK 8
-Xlog:class+load=info    # JDK 9+
```

### 陷阱 7：ThreadLocal 内存泄漏

线程池中 ThreadLocal 未 `remove()`，Entry 的 key 为弱引用但 value 为强引用，导致 value 长期存活。

**最佳实践**：始终在 finally 中调用 `ThreadLocal.remove()`；线程池中尤其注意。

### 陷阱 8：直接内存未释放

NIO `DirectByteBuffer` 不受堆 GC 直接管理，依赖 `Cleaner` 在 GC 时释放。频繁分配大块直接内存可能导致 OOM: Direct buffer memory。

**最佳实践**：复用 Buffer；显式调用 `sun.misc.Unsafe.invokeCleaner(buffer)`（JDK 9+）。

### 最佳实践清单

1. **Xms = Xmx**：避免运行时堆扩容的开销与不可预测性。
2. **生产开启 HeapDump**：`-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/oom`。
3. **统一 GC 日志**：`-Xlog:gc*:file=gc.log:time,uptime,level,tags:filecount=10,filesize=50M`。
4. **监控 GC 指标**：通过 Micrometer 暴露 `jvm.gc.pause`、`jvm.gc.memory.allocated`、`jvm.gc.live.data.size` 至 Prometheus。
5. **JDK 21+ 优先 ZGC**：大堆与低延迟场景显著优于 G1。
6. **避免手动 System.gc**：禁用或仅用于基准测试。
7. **定期回归测试**：每次 JVM 升级后使用 JMH 跑性能基线。

## 工程实践

### 构建与打包

Maven 多模块项目的 GC 友好打包：

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <jvmArguments>
            -XX:+UseZGC -XX:+ZGenerational
            -Xms2g -Xmx2g
            -XX:+HeapDumpOnOutOfMemoryError
        </jvmArguments>
    </configuration>
</plugin>
```

### Docker 容器化 GC 注意事项

- **使用 `XX:MaxRAMPercentage`** 替代 `-Xmx`，让 JVM 自动感知容器内存上限：

```bash
java -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -jar app.jar
```

- **避免使用 cgroup v1 的内存限制**：JDK 11+ 默认支持 cgroup v2，但需确保内核与容器运行时一致。
- **镜像分层**：将 JVM 参数置于 entrypoint，便于覆盖：

```dockerfile
FROM eclipse-temurin:21-jre-jammy
COPY target/app.jar /app/app.jar
ENV JAVA_OPTS="-XX:+UseZGC -XX:+ZGenerational -XX:MaxRAMPercentage=70.0"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
```

### JVM 调优方法论

1. **测量先于调优**：使用 JFR、async-profiler、GC 日志建立基线。
2. **单变量实验**：每次仅修改一个参数，记录 P50/P99/P99.9 停顿、吞吐量、CPU。
3. **回归验证**：使用 JMH 跑微基准；使用 Gatling/JMeter 跑端到端负载。
4. **生产灰度**：先在金丝雀节点部署，观察 24 小时 GC 行为再全量。

### 调试工具链

| 工具 | 用途 | 开销 | 适用阶段 |
| --- | --- | --- | --- |
| `jstat -gcutil <pid> 1s` | 实时查看各代使用率与 GC 次数 | 极低 | 生产 |
| `jcmd <pid> GC.heap_info` | 查看 G1/ZGC 分区分布 | 低 | 排查 |
| `jmap -histo:live <pid>` | 触发 GC 并查看对象直方图 | 中（含一次 GC） | 排查 |
| `jmap -dump:format=b,file=h.hprof <pid>` | 生成堆转储 | 高（STW + 磁盘） | 离线分析 |
| JFR / JDK Mission Control | 持续低开销采样 | <1% | 生产常态化 |
| async-profiler | CPU/堆/锁采样，无 JVMTI 开销 | 低 | 生产 |
| GCEasy / GCViewer | 离线分析 GC 日志 | 0 | 复盘 |
| Eclipse MAT | 堆转储深度分析（Dominator Tree、Leak Suspects） | 离线 | 排查泄漏 |

### Spring Boot GC 监控集成

```java
package com.fandex.gc;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.jvm.JvmGcMetrics;
import org.springframework.boot.actuate.autoconfigure.metrics.MetricsProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 将 JVM GC 指标注册到 Micrometer，
 * 自动暴露至 Prometheus / Actuator /metrics 端点。
 */
@Configuration
public class GcMetricsConfig {

    @Bean
    public JvmGcMetrics jvmGcMetrics(MeterRegistry registry) {
        JvmGcMetrics metrics = new JvmGcMetrics();
        metrics.bindTo(registry);
        return metrics;
    }
}
```

`application.yml`：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    tags:
      application: fandex-gc-demo
    distribution:
      percentiles-histogram:
        jvm.gc.pause: true
      percentiles:
        jvm.gc.pause: 0.5,0.95,0.99,0.999
```

Prometheus 查询示例：

```promql
# GC 停顿 P99（5 分钟窗口）
histogram_quantile(0.99, rate(jvm_gc_pause_seconds_bucket[5m]))

# 每秒分配字节数
rate(jvm_gc_memory_allocated_bytes_total[1m])

# 老年代使用率
jvm_gc_live_data_size_bytes / jvm_gc_max_data_size_bytes
```

## 案例研究

### 案例 1：Spring Boot 服务 Full GC 频繁

**症状**：订单服务 QPS 2000，P99 突增至 2s，监控显示每 5 分钟一次 Full GC，停顿 800ms。

**诊断步骤**：

1. `jcmd <pid> GC.heap_info` 发现老年代使用率 95%。
2. `jmap -histo:live <pid> | head -20` 发现 `byte[]` 与 `char[]` 占据 60% 堆。
3. 触发堆转储，MAT 分析 Dominator Tree 发现 `ConcurrentHashMap$Node` 持有 1.5GB `byte[]`，疑似本地缓存未设上限。
4. 代码审查：`OrderCacheService` 使用 `ConcurrentHashMap` 缓存订单 PDF 渲染结果，无 TTL。

**修复**：

- 替换为 Caffeine，设置 `maximumSize(10_000)` 与 `expireAfterWrite(30m)`。
- 升级至 JDK 21 分代 ZGC，避免 Full GC。

**效果**：P99 降至 80ms，Full GC 消失，老年代使用率稳定在 60%。

### 案例 2：Kafka 消费者 Metaspace OOM

**症状**：Kafka 消费者运行 3 天后 OOM: Metaspace。

**诊断**：

1. `-Xlog:class+load=info` 发现每秒加载数十个 `com.fandex.kafka.handler.Handler$$Lambda$*` 类。
2. 代码审查：每次消息处理动态生成 Lambda 并通过反射调用。

**修复**：

- 预编译 Handler 为静态字段，避免反射。
- 设置 `-XX:MaxMetaspaceSize=512m` 并加监控告警。

### 案例 3：Android 应用 GC 卡顿

**症状**：Android 列表滚动掉帧，Systrace 显示 `GC: 12ms` 频繁出现。

**诊断**：`onBindViewHolder` 中频繁分配 `Bitmap` 与 `String`，触发 Minor GC。

**修复**：

- 使用 `BitmapPool` 复用。
- 预计算字符串，避免 `String.format` 在主线程。
- 使用 `ArrayMap` 替代 `HashMap` 减少装箱。

### 案例 4：Hibernate 二级缓存导致内存泄漏

**症状**：使用 `@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)` 后，堆持续增长直至 OOM。

**诊断**：二级缓存未设置 `eviction` 策略，Hibernate 默认 `Ehcache` 无上限。

**修复**：`ehcache.xml` 配置 `maxEntriesLocalHeap="10000"` 与 `timeToLiveSeconds="600"`。

### 案例 5：ZGC 大堆（64GB）延迟验证

**场景**：金融风控服务，堆 64GB，要求 P99 < 10ms。

**配置**：

```bash
java -XX:+UseZGC -XX:+ZGenerational \
     -Xms64g -Xmx64g \
     -XX:SoftMaxHeapSize=56g \
     -XX:ZAllocationSpikeTolerance=2 \
     -Xlog:gc*:file=gc.log:time,level,tags \
     -jar risk-engine.jar
```

**结果**：分代 ZGC 在 64GB 堆下，单次停顿 P99 = 0.8ms，吞吐损失 6%。

## 习题

### 选择题

**1. 下列哪种 GC 算法在存活对象比例高时效率最差？**

A. 标记-清除
B. 标记-整理
C. 复制算法
D. 分代收集

**答案**：C
**解析**：复制算法将存活对象复制到另一半空间，存活率越高，复制开销越大；当存活率接近 100% 时，几乎全部对象都需复制，效率最差。这是分代收集中老年代不用复制算法的根本原因。

**2. G1 回收器中 "Garbage-First" 的含义是？**

A. 总是先回收 Eden 区
B. 按 garbage 收益从高到低选择 region 回收
C. 优先回收老年代
D. 优先触发 Full GC

**答案**：B
**解析**：G1 维护每个 region 的回收收益（垃圾比例 / 回收成本），在 CSet 选择时优先回收收益最高的 region，从而在小停顿内最大化空间回收。

**3. 三色标记中，哪种情况会破坏"强三色不变式"？**

A. 黑对象指向灰对象
B. 黑对象新增指向白对象的引用
C. 灰对象指向白对象
D. 白对象指向黑对象

**答案**：B
**解析**：强三色不变式要求黑对象不能指向白对象。并发标记中，应用线程修改引用使黑对象新增指向白对象的引用时，白对象会被漏标，需要 write barrier 修正（增量更新或 SATB）。

**4. 下列哪种引用类型不会阻止 GC 回收对象？**

A. StrongReference
B. SoftReference
C. WeakReference
D. PhantomReference

**答案**：D
**解析**：PhantomReference 在对象被回收后才入队，get() 永远返回 null，不持有对象引用，用于资源清理通知。WeakReference 不阻止回收但可在 GC 前访问；SoftReference 在内存不足时才回收；StrongReference 永不回收（除非显式置 null）。

**5. JDK 21 分代 ZGC 相比非分代 ZGC 的主要改进是？**

A. 降低单次停顿
B. 提升老年代回收频率与吞吐
C. 减少 read barrier 开销
D. 支持更小堆

**答案**：B
**解析**：非分代 ZGC 对所有对象一视同仁，老年代对象反复参与标记转移，吞吐损失较高。分代 ZGC 引入分代假说，新生代独立频繁回收，老年代低频回收，显著提升吞吐并保持低延迟。

### 填空题

**1.** HotSpot 卡表中，每 ___ 字节堆对应 1 字节卡表项。

**答案**：512

**2.** `-XX:MaxTenuringThreshold` 默认值为 ___。

**答案**：15

**3.** ZGC 使用 ___ 技术在 64 位指针中编码对象状态。

**答案**：染色指针（colored pointer）

**4.** G1 中 Humongous 对象是指大小超过 region 大小 ___ 的对象。

**答案**：50%

**5.** SATB 的全称是 ___。

**答案**：Snapshot At The Beginning

### 编程题

**1.** 编写一个程序，演示 ThreadLocal 在线程池中的内存泄漏，并给出修复版本。

**参考答案**：

```java
package com.fandex.gc;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public final class ThreadLocalLeak {

    private static final ThreadLocal<byte[]> HOLDER = ThreadLocal.withInitial(() -> new byte[1024 * 1024]);

    /** 错误：未 remove，线程池复用线程导致 value 长期存活。 */
    static void buggy() {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 10000; i++) {
            pool.submit(() -> {
                HOLDER.set(new byte[1024 * 1024]);
                // 业务逻辑...
            });
        }
        pool.shutdown();
    }

    /** 正确：finally 中 remove。 */
    static void fixed() {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 10000; i++) {
            pool.submit(() -> {
                try {
                    HOLDER.set(new byte[1024 * 1024]);
                    // 业务逻辑...
                } finally {
                    HOLDER.remove();
                }
            });
        }
        pool.shutdown();
    }

    public static void main(String[] args) throws InterruptedException {
        buggy();
        TimeUnit.SECONDS.sleep(1);
        System.gc();
        System.out.println("buggy done");
    }
}
```

**2.** 实现一个基于 PhantomReference 的资源清理器，管理 native 内存。

**参考答案**：

```java
package com.fandex.gc;

import java.lang.ref.Cleaner;
import java.lang.ref.PhantomReference;
import java.lang.ref.ReferenceQueue;
import java.util.HashSet;
import java.util.Set;

/**
 * 使用 Cleaner（JDK 9+）管理 native 资源。
 * Cleaner 内部基于 PhantomReference 实现，对象被回收时触发清理动作。
 */
public final class NativeResource implements AutoCloseable {

    private static final Cleaner CLEANER = Cleaner.create();

    /** 真正持有 native 指针的状态，与 NativeResource 分离以避免强引用。 */
    private static final class State implements Runnable {
        private final long nativePtr;

        State(long ptr) { this.nativePtr = ptr; }

        @Override
        public void run() {
            // 模拟释放 native 内存
            System.out.println("Releasing native ptr = " + nativePtr);
            // 实际场景：Unsafe.freeMemory(nativePtr) 或 JNA 调用
        }
    }

    private final State state;
    private final Cleaner.Cleanable cleanable;
    private volatile boolean closed = false;

    public NativeResource(long ptr) {
        this.state = new State(ptr);
        this.cleanable = CLEANER.register(this, state);
    }

    @Override
    public void close() {
        if (!closed) {
            closed = true;
            cleanable.clean(); // 显式触发清理
        }
    }
}
```

### 思考题

**1.** 为什么 Go 放弃分代 GC？这种设计在什么场景下劣势明显？

**参考答案**：Go 团队认为：分代假说在 Go 程序中并不显著成立（Go 编译器逃逸分析将大量短生命周期对象栈分配，堆上对象存活率较高）；分代回收需要 write barrier 维护跨代引用，增加运行时复杂度。Go 选择不分代 + 并发标记，简化实现并保持低延迟。劣势场景：大量长生命周期对象混合短生命周期对象，且无法被逃逸分析消除（如反射、接口装箱），此时 Go 的堆增长更快、GC 频率更高。

**2.** 假设你需要为一个 32GB 堆、P99 延迟 < 5ms 的服务选择 GC，会选 G1 还是 ZGC？为什么？

**参考答案**：选 ZGC（JDK 21 分代）。理由：(1) G1 在 32GB 堆下，单次 Mixed GC 停顿通常 50–200ms，难以满足 P99 < 5ms；(2) ZGC 通过染色指针 + 并发转移，停顿与堆大小解耦，32GB 下仍可保持 < 1ms；(3) JDK 21 分代 ZGC 已 GA，吞吐损失降至 3–8%，可接受。需注意：ZGC footprint 略高（约 10–15%），需预留堆空间。

**3.** 解释"GC 不可能三角"，并给出一个工程上"取两舍一"的真实案例。

**参考答案**：GC 不可能三角指吞吐量、延迟、footprint 三者不可同时最优。案例：高频交易系统选择 ZGC（延迟 + 吞吐）牺牲 footprint（堆利用率约 85%）；嵌入式设备选择 Serial GC（footprint + 简单）牺牲延迟与吞吐；批处理 ETL 选择 Parallel GC（吞吐 + footprint）牺牲延迟。

## 参考文献

[1] McCarthy, J. 1960. Recursive functions of symbolic expressions and their computation by machine, Part I. *Communications of the ACM* 3, 4 (April 1960), 184–195. DOI: https://doi.org/10.1145/367177.367199

[2] Dijkstra, E. W., Lamport, L., Martin, A. J., Scholten, C. S., and Steffens, E. F. M. 1978. On-the-fly garbage collection: An exercise in cooperation. *Communications of the ACM* 21, 11 (Nov. 1978), 966–975. DOI: https://doi.org/10.1145/359642.359655

[3] Lieberman, H. and Hewitt, C. 1983. A real-time garbage collector based on the lifetimes of objects. *Communications of the ACM* 26, 6 (June 1983), 419–429. DOI: https://doi.org/10.1145/358141.358147

[4] Appel, A. W. 1989. Simple generational garbage collection and fast allocation. *Software: Practice and Experience* 19, 2, 171–183. DOI: https://doi.org/10.1002/spe.4380190206

[5] Detlefs, D., Flood, C., Heller, S., and Printezis, T. 2004. Garbage-first garbage collection. In *Proceedings of the 4th international symposium on Memory management (ISMM '04)*. ACM, New York, NY, USA, 37–48. DOI: https://doi.org/10.1145/1029873.1029879

[6] Yang, X., Blackburn, S. M., McKinley, K. S., and Frampton, D. 2017. Barriers: friend or foe? In *Proceedings of the 2017 ACM SIGPLAN International Symposium on Memory Management (ISMM 2017)*. ACM, New York, NY, USA, 24–36. DOI: https://doi.org/10.1145/3080207.3080217

[7] Oracle Corporation. 2023. *The Java Virtual Machine Specification, Java SE 21 Edition*. Oracle, Redwood City, CA, USA.

[8] Oracle Corporation. 2023. *JEP 439: Generational ZGC*. OpenJDK. Available at: https://openjdk.org/jeps/439

[9] Flood, C., et al. 2023. Shenandoah: The garbage collector that could. In *Companion to the 28th ACM SIGPLAN Annual Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA '23 Companion)*. ACM, New York, NY, USA, 1–2. DOI: https://doi.org/10.1145/3622780.3622781

[10] Click, C. 2005. Azul pauseless GC. In *Companion to the 20th Annual ACM SIGPLAN Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA '05)*. ACM, New York, NY, USA, 282–283. DOI: https://doi.org/10.1145/1094855.1094917

[11] Jones, R., Hosking, A., and Moss, E. 2011. *The Garbage Collection Handbook: The Art of Automatic Memory Management* (2nd ed.). Chapman & Hall/CRC, Boca Raton, FL, USA.

[12] Yang, X., et al. 2016. The Z Garbage Collector. OpenJDK Project. Available at: https://openjdk.org/jeps/377

## 延伸阅读

### 书籍

- **Jones, R., Hosking, A., and Moss, E.** *The Garbage Collection Handbook* (2nd ed.). CRC Press, 2011. — GC 算法与实现百科全书。
- **Lin, C.** *The Java Garbage Collection Mini-Book*. Amazon KDP, 2016. — 实战导向的 Java GC 入门。
- **Kabutz, Dr. H.** *The Java Specialists' Newsletter*. https://www.javaspecialists.eu — Heinz Kabutz 长期连载的 Java 性能与并发深度文章。
- **Bacon, D. F., Cheng, P., and Rajan, V. T.** *A Unified Theory of Garbage Collection*. ACM Queue, 2007. — 统一精确式与保守式 GC 的理论框架。

### 论文

- **Baker, H. G.** *List Processing in Real Time on a Serial Computer*. CACM, 1978. — 增量复制 GC 的奠基论文。
- **Wilson, P. R.** *Uniprocessor Garbage Collection Techniques*. In Proc. IWMM, 1992. — 经典综述，涵盖所有主要 GC 算法。
- **Printezis, T. and Detlefs, D.** *A Generational Mostly-concurrent Garbage Collector*. ISMM, 2000. — CMS 设计论文。

### 在线资源

- **OpenJDK ZGC 文档**：https://openjdk.org/groups/hotspot/docs/ZGC_Presentation.pdf
- **G1 GC Tuning Guide (Oracle)**：https://docs.oracle.com/en/java/javase/21/gctuning/
- **GCEasy 在线 GC 日志分析**：https://gceasy.io
- **JDK Mission Control**：https://github.com/openjdk/jmc
- **async-profiler**：https://github.com/async-profiler/async-profiler
- **Eclipse MAT**：https://eclipse.dev/mat/
- **JEP 439: Generational ZGC**：https://openjdk.org/jeps/439
- **JEP 377: ZGC: A Scalable Low-Latency Garbage Collector**：https://openjdk.org/jeps/377

### 相关课程

- **MIT 6.102 Software Construction**：自动内存管理与不变式章节。
- **Stanford CS140 Operating Systems**：内存分配与回收章节。
- **CMU 15-440 Distributed Systems**：分布式系统中的内存与状态管理。
- **Berkeley CS162 Operating Systems**：GC 与运行时系统讲座。
