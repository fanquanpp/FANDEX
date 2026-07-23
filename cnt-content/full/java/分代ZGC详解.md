---
order: 106
title: 分代ZGC详解
module: java
category: 'dev-lang'
difficulty: advanced
description: 'JDK 21分代ZGC详解：原理、配置与调优。'
author: fanquanpp
updated: '2026-06-14'
related:
  - java/反射与动态代理
  - java/注解处理器
  - java/面向对象编程
  - java/抽象类与接口
prerequisites:
  - java/概述与开发环境
---

## 学习目标

完成本章学习后，你应当能够：

- **Remember（记忆）**：复述分代 ZGC（Generational ZGC）的关键术语，包括 colored pointer、load barrier、relocation set、remembered set、forwarding table 等。
- **Understand（理解）**：解释 JDK 21 分代 ZGC 相比非分代 ZGC 的核心改进，以及分代假说在低延迟回收器中的具体体现。
- **Apply（应用）**：在生产环境中通过 `-XX:+UseZGC -XX:+ZGenerational` 启用分代 ZGC，并使用 `jcmd`、JFR、`zgc-stat` 等工具观察其行为。
- **Analyze（分析）**：解构分代 ZGC 的回收流水线，识别 young collection、major collection、relocation set selection 各阶段的工作内容与停顿来源。
- **Evaluate（评价）**：针对大堆（>16GB）、低延迟（P99 < 5ms）、高分配速率场景，评估分代 ZGC 与 G1、Shenandoah 的取舍。
- **Create（创造）**：设计一套分代 ZGC 调优实验，涵盖基线测量、参数扫描、回归验证，输出可复现的性能报告。

## 历史动机与发展脉络

### ZGC 的诞生背景

Java 9 时代，G1 已成为服务端主流 GC，但其在堆 > 16GB 时停顿随堆增长，无法满足低延迟 SLA。Azul 的 Pauseless GC（2005）证明并发转移可行，但工程实现复杂。Oracle 于 2017 年发起 ZGC 项目（JEP 377），目标是：无论堆大小、不论对象分配速率，单次 GC 停顿 < 10ms（实际 < 1ms）。

### ZGC 演进时间线

| 版本 | JEP | 关键里程碑 | 工程意义 |
| --- | --- | --- | --- |
| JDK 11 | JEP 333 | ZGC 实验性引入 | 早期原型，仅 Linux/x64 |
| JDK 13 | JEP 350 | 支持未提交内存释放 | 容器场景内存友好 |
| JDK 14 | JEP 364 | 支持 macOS | 跨平台 |
| JDK 15 | JEP 377 | 生产可用（Production） | 撤销实验标记 |
| JDK 16 | JEP 376 | 并发线程栈扫描 | 进一步降低停顿 |
| JDK 17 | JEP 377 LTS | 增量调优、JFR 事件 | LTS 工业级可用 |
| JDK 18 | JEP 416 | 改进的 finalize 处理 | 与 Cleaner 协同 |
| JDK 21 | JEP 439 | 分代 ZGC 正式 GA | 引入分代假说 |
| JDK 22 | — | 分代 ZGC 默认开启 | 全面替代非分代 |
| JDK 23+ | — | 持续优化 remembered set | 减少屏障开销 |

### 为什么需要分代 ZGC？

非分代 ZGC 的核心问题在于**吞吐损失**：所有对象无论存活时间都参与每次并发标记与转移，老年代对象反复扫描造成无谓开销。基准测试显示，非分代 ZGC 在分配密集型负载下吞吐损失可达 5–15%。

分代假说（generational hypothesis）——"绝大多数对象朝生夕灭"——在分代 ZGC 中重新被引入：

- **Young collection**：仅扫描新生代，频率高、停顿短。
- **Major collection**：扫描老年代，频率低、可承受较长并发周期。
- **Remembered set**：维护 old → young 跨代引用，避免全堆扫描。

JDK 21 的分代 ZGC（JEP 439）将吞吐损失降至 3–8%，同时保持 < 1ms 停顿。

## 形式化定义

### 分代 ZGC 的内存布局

设堆大小为 $H$，分代 ZGC 将堆逻辑分为：

$$
H = H_{\text{young}} + H_{\text{old}}
$$

其中 $H_{\text{young}}$ 动态调整（默认最小 $H/8$，最大 $H/2$），$H_{\text{old}}$ 占其余。物理上仍为 ZPage 集合，每个 ZPage 大小为 2MB（小对象）或 32MB（大对象）。

### 染色指针编码

ZGC 利用 64 位指针的高 4 位（bit 42–45）编码对象状态：

| 颜色位 | 含义 |
| --- | --- |
| `Marked0` | 当前标记周期内已标记（视图 0） |
| `Marked1` | 上一标记周期已标记（视图 1） |
| `Remapped` | 转移完成后地址已更新 |
| `Finalizable` | 通过 FinalizerReference 引用 |

形式化，设指针为 $p \in \{0,1\}^{64}$，则：

$$
\text{color}(p) = (p \gg 42)\ \&\ 0xF
$$

$$
\text{object\_addr}(p) = p\ \&\ 0x3FFFFFFFFFFF
$$

### Load Barrier 形式化

每次从堆中加载引用时，JIT 编译器插入 load barrier：

$$
\text{load}(p) = \begin{cases}
\text{forward}(p) & \text{if color}(p) \neq \text{Remapped} \\
p & \text{otherwise}
\end{cases}
$$

其中 $\text{forward}(p)$ 查询 forwarding table 获取对象最新地址。这使得应用线程在并发转移过程中访问对象时，自动重定向到新地址。

### 停顿时间分解

分代 ZGC 单次 young collection 停顿：

$$
T_{\text{young}} = T_{\text{mark-start}} + T_{\text{relocate-start}} + T_{\text{ref-proc-young}}
$$

理论上各阶段均为 $O(|\text{roots}|)$，与堆大小无关，故 $T_{\text{young}} < 1\text{ms}$。

Major collection 包含并发标记 + 并发转移，停顿同样为常数级：

$$
T_{\text{major-pause}} \approx T_{\text{young}} + O(1)
$$

### Remembered Set 抽象

设跨代引用集合 $RS \subseteq \{(o_{\text{old}}, f, o_{\text{young}})\}$，其中 $o_{\text{old}} \in \text{Old}$，$f$ 为字段，$o_{\text{young}} \in \text{Young}$。Young collection 时，roots 扩展为：

$$
R' = R \cup \{o_{\text{young}} \mid \exists (o_{\text{old}}, f, o_{\text{young}}) \in RS\}
$$

通过 write barrier 维护 RS：当老年代对象写入指向新生代的引用时，记录该卡（card）或记忆集条目。分代 ZGC 使用 card-and-table 混合结构，平衡精度与开销。

## 理论推导与原理解析

### 分代假说的统计基础

经验数据显示，对象存活时间分布近似服从 Weibull 分布：

$$
P(\text{lifetime} > t) = e^{-(t/\lambda)^k}
$$

其中 $k < 1$（早期死亡率高）。对绝大多数 Java 应用，约 90% 对象在第一次 Minor GC 中死亡。这一统计性质是分代回收的根本动机。

### 并发标记的正确性

分代 ZGC 采用 SATB（Snapshot At The Beginning）+ 染色指针的混合策略：

1. **标记开始**：记录当前快照，所有对象初始为白。
2. **并发标记**：从 roots 出发遍历，标记可达对象（设 Marked0）。
3. **SATB 屏障**：应用线程修改引用时，将被覆盖的旧引用入队（着灰），保证不漏标。
4. **重标记**：处理 SATB 队列与残留灰对象。
5. **转移**：将存活对象复制到新 ZPage，更新 forwarding table。

正确性证明（非形式化）：SATB 保证了"标记开始时刻可达的对象集合"被完整标记。即使应用线程在并发标记过程中删除引用，原快照中的对象仍被保留（可能浮动垃圾，下一周期回收）。

### 并发转移的挑战

转移（relocation）将存活对象从源 ZPage 复制到目标 ZPage。并发转移的核心挑战：

1. **应用线程访问转移中对象**：通过 load barrier 转发到新地址。
2. **引用更新**：转移完成后，需更新所有指向旧地址的引用。ZGC 采用"懒更新"——load barrier 在首次访问时更新，并发的 reference processing 阶段批量更新剩余。
3. **Forwarding table 一致性**：转发表必须线程安全，使用 CAS 更新。

设转移集合为 $S \subseteq \text{ZPages}$，对每个 $p \in S$：

$$
\forall o \in p,\ \text{forward}(o_{\text{old}}) = o_{\text{new}}
$$

应用线程加载 $o_{\text{old}}$ 时，barrier 检查颜色，若非 Remapped 则查表转发。

### Young vs Major Collection 流水线

**Young Collection**（频率高，停顿短）：

1. **Pause Mark Start**（STW, ~0.1ms）：标记 roots 直接引用的 young 对象，启动并发标记。
2. **Concurrent Mark**：从 young roots + RS 出发，标记 young 代活跃对象。
3. **Pause Mark End**（STW, ~0.1ms）：处理 SATB 队列，结束标记。
4. **Concurrent Relocate**：转移 young 代存活对象到新 ZPage。
5. **Concurrent Reference Processing**：处理 SoftReference、WeakReference、PhantomReference。

**Major Collection**（频率低，触发条件：old 代占用率高）：

1. **Pause Mark Start**（STW, ~0.1ms）：标记 roots（全堆）。
2. **Concurrent Mark**：全堆并发标记。
3. **Pause Mark End**（STW, ~0.1ms）：重标记。
4. **Concurrent Relocate**：转移 old 代存活对象。
5. **Concurrent Reference Processing & Unloading**：引用处理与类卸载。

### 双视图标记

ZGC 使用 Marked0 与 Marked1 两个标记位，交替使用：

- 周期 N：使用 Marked0 标记，结束时切换到 Marked1。
- 周期 N+1：使用 Marked1 标记，结束时切换回 Marked0。

这种设计避免了标记位的清理开销——上一周期标记的对象在新周期开始时自然"过期"。

## 代码示例

### 示例 1：启用分代 ZGC 的最小程序

`pom.xml`：

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.fandex.zgc</groupId>
    <artifactId>zgc-demo</artifactId>
    <version>1.0.0</version>
    <properties>
        <maven.compiler.release>21</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    <build>
        <plugins>
            <plugin>
                <artifactId>maven-jar-plugin</artifactId>
                <version>3.3.0</version>
                <configuration>
                    <archive>
                        <manifest><mainClass>com.fandex.zgc.ZgcDemo</mainClass></manifest>
                    </archive>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

`src/main/java/com/fandex/zgc/ZgcDemo.java`（Java 21，虚拟线程 + 高分配速率）：

```java
package com.fandex.zgc;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 分代 ZGC 压力测试：模拟高分配速率 + 长期存活对象。
 * 使用虚拟线程最大化分配压力。
 */
public final class ZgcDemo {

    private static final AtomicLong ALLOCATED = new AtomicLong();
    private static final List<byte[]> OLD_GEN = new ArrayList<>();

    public static void main(String[] args) throws InterruptedException {
        System.out.println("PID = " + ProcessHandle.current().pid());
        int vThreads = Integer.parseInt(args.length > 0 ? args[0] : "1000");
        ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();

        for (int i = 0; i < vThreads; i++) {
            pool.submit(() -> {
                for (int j = 0; j < 100_000; j++) {
                    byte[] data = new byte[1024];       // 短生命周期：进入 young
                    ALLOCATED.addAndGet(data.length);
                    if (j % 1000 == 0) {
                        synchronized (OLD_GEN) {
                            OLD_GEN.add(new byte[4 * 1024]);  // 长期存活：晋升 old
                        }
                    }
                    if (j % 10000 == 0) {
                        Thread.sleep(1);
                    }
                }
            });
        }

        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.HOURS);
        System.out.printf("Total allocated = %d MB%n", ALLOCATED.get() >> 20);
    }
}
```

运行：

```bash
java -XX:+UseZGC -XX:+ZGenerational \
     -Xms4g -Xmx4g \
     -XX:SoftMaxHeapSize=3g \
     -Xlog:gc*:file=gc.log:time,level,tags:filecount=10,filesize=20M \
     -jar target/zgc-demo-1.0.0.jar 1000
```

### 示例 2：JFR 监控分代 ZGC 事件

```java
package com.fandex.zgc;

import jdk.jfr.Configuration;
import jdk.jfr.Recording;
import java.nio.file.Path;

/**
 * 使用 JFR 持续记录 ZGC 事件。
 * 关键事件：jdk.ZAllocationStall, jdk.ZPageAllocation, jdk.ZRelocationSet, jdk.ZUncommit
 */
public final class ZgcJfrMonitor {

    public static void main(String[] args) throws Exception {
        Configuration config = Configuration.getConfiguration("profile");
        try (Recording recording = new Recording(config)) {
            recording.enable("jdk.ZAllocationStall");
            recording.enable("jdk.ZPageAllocation").withThreshold("1ms");
            recording.enable("jdk.ZRelocationSet");
            recording.enable("jdk.ZUncommit");
            recording.enable("jdk.GarbageCollection");
            recording.setMaxAge(java.time.Duration.ofHours(1));
            recording.setToDisk(true);
            recording.start();

            Thread.sleep(600_000); // 10 分钟采样
            recording.stop();
            recording.dump(Path.of("zgc-recording.jfr"));
            System.out.println("JFR 文件已生成：zgc-recording.jfr");
        }
    }
}
```

分析：

```bash
# 列出所有 ZGC 事件
jfr print --events jdk.ZAllocationStall,jdk.ZRelocationSet,jdk.ZPageAllocation zgc-recording.jfr

# 统计分配停顿
jfr view gc-pauses zgc-recording.jfr
```

### 示例 3：自定义 ZGC 监控指标（Spring Boot + Micrometer）

```java
package com.fandex.zgc;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * 自定义 ZGC 监控指标：暴露 young/old 占用率至 Prometheus。
 */
@Component
public class ZgcMetricsExporter {

    private final MeterRegistry registry;

    public ZgcMetricsExporter(MeterRegistry registry) {
        this.registry = registry;
    }

    @PostConstruct
    public void init() {
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();

        // 堆使用率
        Gauge.builder("zgc.heap.used", memoryBean, b -> b.getHeapMemoryUsage().getUsed())
                .baseUnit("bytes")
                .description("ZGC 堆已用字节")
                .register(registry);

        Gauge.builder("zgc.heap.committed", memoryBean, b -> b.getHeapMemoryUsage().getCommitted())
                .baseUnit("bytes")
                .description("ZGC 堆已提交字节")
                .register(registry);

        // 周期性记录分配停顿
        var scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(() -> {
            MemoryUsage usage = memoryBean.getHeapMemoryUsage();
            long used = usage.getUsed();
            long max = usage.getMax();
            double ratio = max > 0 ? (double) used / max : 0;
            // 可推送至 Prometheus / 自定义告警
        }, 0, 1, TimeUnit.SECONDS);
    }
}
```

### 示例 4：Maven JVM 参数集成

```xml
<plugin>
    <groupId>org.codehaus.mojo</groupId>
    <artifactId>exec-maven-plugin</artifactId>
    <version>3.1.0</version>
    <configuration>
        <executable>java</executable>
        <arguments>
            <argument>-XX:+UseZGC</argument>
            <argument>-XX:+ZGenerational</argument>
            <argument>-Xms8g</argument>
            <argument>-Xmx8g</argument>
            <argument>-XX:SoftMaxHeapSize=7g</argument>
            <argument>-XX:ZAllocationSpikeTolerance=2</argument>
            <argument>-XX:+HeapDumpOnOutOfMemoryError</argument>
            <argument>-XX:HeapDumpPath=${project.build.directory}/oom</argument>
            <argument>-Xlog:gc*:file=${project.build.directory}/gc.log:time,level,tags</argument>
            <argument>--enable-preview</argument>
            <argument>-classpath</argument>
            <classpath/>
            <argument>com.fandex.zgc.ZgcDemo</argument>
        </arguments>
    </configuration>
</plugin>
```

### 示例 5：Gradle 配置

`build.gradle.kts`：

```kotlin
plugins {
    application
}
application {
    mainClass.set("com.fandex.zgc.ZgcDemo")
    applicationDefaultJvmArgs = listOf(
        "-XX:+UseZGC",
        "-XX:+ZGenerational",
        "-Xms8g", "-Xmx8g",
        "-XX:SoftMaxHeapSize=7g",
        "-XX:ZAllocationSpikeTolerance=2",
        "-XX:+HeapDumpOnOutOfMemoryError",
        "-XX:HeapDumpPath=build/oom",
        "-Xlog:gc*:file=build/gc.log:time,level,tags"
    )
}
```

## 对比分析

### 分代 ZGC vs 其他现代 GC

| GC | 单次停顿 | 吞吐损失 | footprint | 分代 | 适用堆 | JDK 版本 |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | 10–200ms | 5–10% | 1.0× | 是 | <32GB | JDK 9+ |
| Shenandoah | 1–10ms | 5–15% | 1.0× | 否（Old 模式可选） | <64GB | JDK 12+ |
| 非分代 ZGC | <1ms | 5–15% | 1.1–1.3× | 否 | <16TB | JDK 15+ |
| 分代 ZGC | <1ms | 3–8% | 1.1–1.2× | 是 | <16TB | JDK 21+ |
| Parallel GC | 100ms–数秒 | 1–5% | 1.0× | 是 | <32GB | JDK 8+ |
| Serial GC | 100ms–数秒 | 1–3% | 1.0× | 是 | <2GB | JDK 1.0+ |

### 与 Shenandoah 设计对比

| 维度 | 分代 ZGC | Shenandoah |
| --- | --- | --- |
| 并发转移机制 | 染色指针 + load barrier | Brooks pointer（每个对象额外指针） |
| 屏障开销 | 读屏障（汇编级插入） | 读写屏障 |
| 分代支持 | 是（JDK 21+） | Old 模式（JDK 21+ 实验性） |
| 平台 | Linux/x64/ARM/PPC；macOS/Windows | Linux/x64/ARM |
| 堆上限 | 16TB | 64GB（早期），现已提升 |
| JDK 维护方 | Oracle | Red Hat |

### 与 G1 详细对比

| 场景 | G1 | 分代 ZGC | 推荐选择 |
| --- | --- | --- | --- |
| 4GB 堆，QPS 1000 | P99 50ms | P99 1ms | ZGC（延迟敏感） |
| 4GB 堆，批处理 ETL | 吞吐 95% | 吞吐 92% | G1（吞吐优先） |
| 32GB 堆，在线服务 | P99 200ms | P99 1ms | ZGC |
| 32GB 堆，离线分析 | 吞吐 90% | 吞吐 92% | ZGC |
| 64GB 堆，金融交易 | P99 500ms | P99 1ms | ZGC |
| 2GB 堆，嵌入式 | footprint 1.0× | footprint 1.2× | G1 |

### 与 C# Server GC / Go GC 对比

| 平台 | 单次停顿 | 分代 | 并发转移 | 备注 |
| --- | --- | --- | --- | --- |
| 分代 ZGC | <1ms | 是 | 是 | 大堆 + 低延迟工业级 |
| .NET 8 Server BG | 3–10ms | 是 | 部分 | BGC 与分代结合 |
| Go 1.22 | 1–5ms | 否 | 否 | 简单高效，逃逸分析减少堆分配 |
| V8 Orinoco | 1–10ms | 是 | 部分 | 增量 + 并发 |

## 常见陷阱与最佳实践

### 陷阱 1：未启用分代模式

JDK 21 中分代 ZGC 需显式启用 `-XX:+ZGenerational`，JDK 22 起为默认。误用非分代 ZGC 会损失吞吐。

**正确做法**：JDK 21 必须显式启用；JDK 22+ 可省略。

### 陷阱 2：堆大小过小

ZGC 的元数据（forwarding table、remembered set）有固定开销，约堆大小的 1–3%。堆 < 1GB 时，footprint 占比过高，反而不如 G1。

**最佳实践**：ZGC 适合堆 ≥ 4GB；小堆场景选 G1。

### 陷阱 3：忽略分配停顿

ZGC 单次 GC 停顿 < 1ms，但**分配停顿**（allocation stall）可能显著：当应用分配速率超过 ZGC 回收速率，应用线程在分配时阻塞等待。

**诊断**：JFR 事件 `jdk.ZAllocationStall`，记录每次分配停顿时长。

**修复**：

- 增大 `SoftMaxHeapSize`，给 ZGC 更多缓冲。
- 降低分配速率：对象池、缓存复用、避免装箱。
- 增加并发 GC 线程：`-XX:ConcGCThreads`（默认 CPU 核数的 1/4）。

### 陷阱 4：DirectByteBuffer 内存未释放

ZGC 不直接管理 native 内存。大量 DirectByteBuffer 可能导致 OOM: Direct buffer memory。

**最佳实践**：复用 Buffer；显式调用 `sun.misc.Unsafe.invokeCleaner(buffer)`（JDK 9+）；监控 `BufferPoolMXBean`。

### 陷阱 5：误调 ZAllocationSpikeTolerance

`-XX:ZAllocationSpikeTolerance`（默认 2.0）控制 ZGC 对分配峰值的容忍度。过低会导致频繁回收，过高会导致堆增长。

**最佳实践**：默认 2.0 适用于大多数场景；负载波动大时上调至 3.0；稳定负载下调至 1.5。

### 陷阱 6：忘记关闭 finalize

`finalize` 方法会触发额外引用处理，可能增加停顿。Java 18+ 标记 forRemoval。

**最佳实践**：使用 `Cleaner` API；`--finalization=disabled`（JDK 18+）禁用 finalize。

### 陷阱 7：容器内存感知

容器化部署时，JVM 需正确感知 cgroup 内存上限。JDK 11+ 默认支持 cgroup v2，但需确保容器运行时与内核版本一致。

**最佳实践**：

```bash
java -XX:+UseZGC -XX:+ZGenerational \
     -XX:MaxRAMPercentage=75 \
     -XX:InitialRAMPercentage=50 \
     -jar app.jar
```

避免使用 `-Xmx` 硬编码，便于容器扩缩容。

### 陷阱 8：忽略 JFR 事件

许多 ZGC 性能问题（分配停顿、relocate 失败、引用处理延迟）仅通过 JFR 事件可见，普通 GC 日志无法捕获。

**最佳实践**：生产环境常态化开启 JFR 连续采样（< 1% 开销）：

```bash
java -XX:StartFlightRecording=filename=continuous.jfr,maxsize=500m,settings=profile \
     -XX:+UseZGC -XX:+ZGenerational -jar app.jar
```

### 最佳实践清单

1. **JDK 21+ 优先分代 ZGC**：低延迟 + 高吞吐双优。
2. **堆 ≥ 4GB**：小堆场景选 G1。
3. **SoftMaxHeapSize 设置**：建议为 Xmx 的 85–90%。
4. **常态化 JFR**：低开销持续采样。
5. **监控分配停顿**：`jdk.ZAllocationStall` 事件。
6. **避免 finalize**：使用 Cleaner。
7. **容器内存感知**：使用 `MaxRAMPercentage`。
8. **回归测试**：每次 JDK 升级后跑 JMH 基线。

## 工程实践

### 构建与打包

Maven 多模块项目的 ZGC 友好配置：

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <jvmArguments>
            -XX:+UseZGC -XX:+ZGenerational
            -Xms8g -Xmx8g
            -XX:SoftMaxHeapSize=7g
            -XX:+HeapDumpOnOutOfMemoryError
        </jvmArguments>
    </configuration>
</plugin>
```

### Docker 容器化部署

```dockerfile
FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends \
    jq curl && rm -rf /var/lib/apt/lists/*
COPY target/app.jar /app/app.jar
ENV JAVA_OPTS="-XX:+UseZGC -XX:+ZGenerational -XX:MaxRAMPercentage=75 -XX:SoftMaxHeapSize=70%"
ENV JAVA_TOOL_OPTIONS="-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/oom"
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fandex-zgc-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: fandex/app:21
        resources:
          requests:
            memory: "8Gi"
            cpu: "4"
          limits:
            memory: "8Gi"
            cpu: "8"
        env:
        - name: JAVA_OPTS
          value: "-XX:+UseZGC -XX:+ZGenerational -XX:MaxRAMPercentage=75 -XX:SoftMaxHeapSize=70%"
        volumeMounts:
        - name: heap-dumps
          mountPath: /var/log/oom
      volumes:
      - name: heap-dumps
        emptyDir: {}
```

### JVM 调优方法论

1. **基线测量**：使用 JFR 跑 1 小时生产负载，记录：
   - P50/P99/P99.9 GC 停顿
   - 分配停顿（`jdk.ZAllocationStall`）
   - 吞吐量（应用线程时间占比）
   - footprint（堆利用率、forwarding table 大小）

2. **参数扫描**：单变量实验，每次仅修改一个参数：
   - `SoftMaxHeapSize`：70% → 80% → 90%
   - `ZAllocationSpikeTolerance`：1.5 → 2.0 → 3.0
   - `ConcGCThreads`：默认 → +50% → +100%

3. **回归验证**：JMH 微基准 + 端到端负载。

4. **生产灰度**：金丝雀节点 24 小时观察，再全量。

### 调试工具链

| 工具 | 用途 | 命令示例 |
| --- | --- | --- |
| `jcmd <pid> ZGC.stats` | 查看 ZGC 实时统计 | `jcmd 12345 ZGC.stats` |
| `jcmd <pid> GC.heap_info` | 查看 ZPage 分布 | `jcmd 12345 GC.heap_info` |
| `jcmd <pid> Thread.print` | 线程栈（含 barrier 状态） | `jcmd 12345 Thread.print` |
| JFR / JDK Mission Control | 持续低开销采样 | `jfr print --events jdk.Z* zgc.jfr` |
| async-profiler | CPU/堆/锁采样 | `./profiler.sh -d 60 -f flame.html <pid>` |
| ZGC 日志分析 | 离线分析 | 上传至 GCEasy 或使用 jfr view |
| Eclipse MAT | 堆转储分析 | `jmap -dump:format=b,file=h.hprof <pid>` |
| zgc-stat（社区工具） | 实时 ZGC 指标 | https://github.com/chriswhocodes/zgc-stat |

### 关键 JFR 事件

| 事件 | 含义 | 关键字段 |
| --- | --- | --- |
| `jdk.ZAllocationStall` | 分配停顿 | duration, type |
| `jdk.ZPageAllocation` | ZPage 分配 | size, used, committed |
| `jdk.ZRelocationSet` | 转移集合选择 | total, empty, relocate |
| `jdk.ZUncommit` | 内存释放 | uncommitted |
| `jdk.GarbageCollection` | GC 概要 | name, cause, sumOfPauses, longestPause |
| `jdk.ZPhaseRelocate` | 转移阶段 | duration |

### Spring Boot 集成监控

```java
package com.fandex.zgc;

import io.micrometer.core.instrument.binder.jvm.JvmGcMetrics;
import io.micrometer.core.instrument.binder.jvm.JvmMemoryMetrics;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 注册 ZGC 相关指标至 Micrometer。
 */
@Configuration
public class ZgcMetricsConfig {

    @Bean
    public JvmGcMetrics jvmGcMetrics() {
        return new JvmGcMetrics();
    }

    @Bean
    public JvmMemoryMetrics jvmMemoryMetrics() {
        return new JvmMemoryMetrics();
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
    distribution:
      percentiles-histogram:
        jvm.gc.pause: true
      percentiles:
        jvm.gc.pause: 0.5,0.95,0.99,0.999
```

Prometheus 告警规则示例：

```yaml
groups:
- name: zgc
  rules:
  - alert: ZgcAllocationStallHigh
    expr: rate(jvm_gc_pause_seconds_max{cause="Allocation Stall"}[1m]) > 0.1
    for: 5m
    annotations:
      summary: "ZGC 分配停顿过高"
  - alert: ZgcHeapUsageHigh
    expr: jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"} > 0.9
    for: 5m
    annotations:
      summary: "ZGC 堆使用率 > 90%"
```

## 案例研究

### 案例 1：电商订单服务从 G1 迁移到分代 ZGC

**场景**：订单服务 QPS 5000，堆 16GB，原 G1 配置：

```bash
-XX:+UseG1GC -Xms16g -Xmx16g -XX:MaxGCPauseMillis=100
```

**问题**：P99 延迟 250ms，大促期间偶发 800ms 尖刺，影响 SLA。

**迁移过程**：

1. JDK 17 升级至 JDK 21。
2. 切换至分代 ZGC：

```bash
-XX:+UseZGC -XX:+ZGenerational -Xms16g -Xmx16g -XX:SoftMaxHeapSize=14g
```

3. 灰度发布：5% → 25% → 100%，每阶段观察 24 小时。

**效果**：
- P99 延迟：250ms → 1.2ms
- P99.9 延迟：800ms → 3ms
- 吞吐量：保持不变（QPS 5000）
- footprint：增加约 8%（forwarding table）

### 案例 2：金融风控服务大堆（64GB）

**场景**：风控服务堆 64GB，要求 P99 < 10ms。

**配置**：

```bash
java -XX:+UseZGC -XX:+ZGenerational \
     -Xms64g -Xmx64g \
     -XX:SoftMaxHeapSize=56g \
     -XX:ZAllocationSpikeTolerance=2 \
     -XX:ConcGCThreads=8 \
     -Xlog:gc*:file=gc.log:time,level,tags \
     -jar risk-engine.jar
```

**结果**：
- P99 停顿：0.8ms
- P99.9 停顿：1.5ms
- 吞吐损失：6%
- 老年代 Major GC 频率：每 2 小时一次（并发，无感知）

### 案例 3：Kafka 流处理分配停顿优化

**场景**：Kafka Streams 应用，堆 8GB，分代 ZGC，P99 延迟 5ms，但偶发 50ms 尖刺。

**诊断**：JFR 事件 `jdk.ZAllocationStall` 显示峰值 50ms，发生在 Major Collection 期间。

**修复**：

1. `ZAllocationSpikeTolerance` 从 2.0 上调至 3.0。
2. `SoftMaxHeapSize` 从 7g 上调至 7.5g。
3. Kafka Streams 参数优化：`commit.interval.ms=5000`，减少 state store flush 频率。

**效果**：分配停顿 P99 从 50ms 降至 2ms。

### 案例 4：Android 应用考虑 ZGC

**场景**：Android 14（ART）应用，列表滚动卡顿。

**说明**：Android ART 使用自己的 GC（Concurrent Copying, CC），非 ZGC。但概念类似——并发复制 + 读屏障。

**借鉴**：分代假说在 ART 中同样适用。Android 14 已支持分代 CC。

### 案例 5：Hibernate + 分代 ZGC

**场景**：Spring Boot + Hibernate 二级缓存，堆 12GB，分代 ZGC。

**问题**：Major GC 频率高（每 30 分钟一次），吞吐损失 12%。

**诊断**：Hibernate 二级缓存对象长期存活，但频繁变动，导致 old 代碎片化。

**修复**：

1. 切换二级缓存至 Caffeine（off-heap）。
2. `SoftMaxHeapSize` 上调至 11g。
3. `ZAllocationSpikeTolerance` 上调至 2.5。

**效果**：Major GC 频率降至每 4 小时一次，吞吐损失 5%。

## 习题

### 选择题

**1. JDK 21 分代 ZGC 通过哪个参数启用？**

A. `-XX:+UseZGC`
B. `-XX:+ZGenerational`
C. `-XX:+UseZGC -XX:+ZGenerational`
D. `-XX:+UseG1GC -XX:+ZGenerational`

**答案**：C
**解析**：JDK 21 中分代 ZGC 需同时启用 ZGC 与分代模式。JDK 22 起 `ZGenerational` 为默认。

**2. ZGC 染色指针使用 64 位指针的哪些位编码对象状态？**

A. bit 0–3
B. bit 16–19
C. bit 42–45
D. bit 60–63

**答案**：C
**解析**：ZGC 使用 bit 42–45（4 位）编码 Marked0、Marked1、Remapped、Finalizable 四种状态。

**3. 分代 ZGC 中 remembered set 的作用是？**

A. 记录所有堆对象
B. 记录跨代引用，避免全堆扫描
C. 记录 finalize 队列
D. 记录 ZPage 分配历史

**答案**：B
**解析**：remembered set 记录 old → young 跨代引用，使 Young Collection 仅需扫描 young 代 + RS，无需全堆扫描，保证停顿与堆大小解耦。

**4. 下列哪种情况会导致 ZGC 分配停顿（allocation stall）？**

A. GC 停顿过长
B. 应用分配速率超过 GC 回收速率
C. finalize 方法过慢
D. 类加载过慢

**答案**：B
**解析**：分配停顿发生在 ZGC 无法及时回收内存以应对应用分配需求时，应用线程在分配时阻塞等待。可通过降低分配速率或上调 SoftMaxHeapSize 缓解。

**5. 分代 ZGC 相比非分代 ZGC 的核心改进是？**

A. 降低单次停顿
B. 提升吞吐量
C. 减少 footprint
D. 支持更小堆

**答案**：B
**解析**：非分代 ZGC 对所有对象一视同仁，老年代对象反复参与标记转移，吞吐损失较高。分代 ZGC 引入分代假说，新生代独立频繁回收，老年代低频回收，显著提升吞吐（5–15% → 3–8%）。

### 填空题

**1.** ZGC 利用 ___ 技术在并发转移过程中自动转发对象引用。

**答案**：染色指针 + load barrier

**2.** 分代 ZGC 中，`SoftMaxHeapSize` 的建议值为 Xmx 的 ___。

**答案**：85–90%

**3.** ZGC 双视图标记使用 ___ 与 ___ 两个标记位。

**答案**：Marked0；Marked1

**4.** ZGC 单 ZPage 大小为 ___（小对象）或 ___（大对象）。

**答案**：2MB；32MB

**5.** 分代 ZGC 中 Young Collection 的停顿与 ___ 无关，仅与 roots 数量相关。

**答案**：堆大小

### 编程题

**1.** 编写一个程序，使用 JFR API 监听 `jdk.ZAllocationStall` 事件并打印告警。

**参考答案**：

```java
package com.fandex.zgc;

import jdk.jfr.consumer.EventStream;
import jdk.jfr.consumer.RecordedEvent;

import java.nio.file.Path;
import java.time.Duration;

/**
 * 实时监听 JFR 事件，对 ZGC 分配停顿 > 10ms 的事件打印告警。
 * 可在生产环境作为旁路监控运行。
 */
public final class ZgcAllocationStallMonitor {

    public static void main(String[] args) throws Exception {
        // 监听当前 JVM 的 JFR 流
        try (EventStream stream = EventStream.openRepository()) {
            stream.enable("jdk.ZAllocationStall").withThreshold(Duration.ofMillis(10));
            stream.onEvent("jdk.ZAllocationStall", ZgcAllocationStallMonitor::handle);
            stream.startAsync();
            System.out.println("Monitoring ZGC allocation stalls...");
            Thread.sleep(Long.MAX_VALUE);
        }
    }

    private static void handle(RecordedEvent event) {
        long durationMs = event.getDuration("duration").toMillis();
        System.out.printf("[ALERT] ZGC allocation stall: %d ms%n", durationMs);
        // 实际场景：推送至 Prometheus AlertManager 或 Slack
    }
}
```

**2.** 实现一个工具，使用 `jcmd` 定期采集 ZGC 统计信息并计算分配速率。

**参考答案**：

```java
package com.fandex.zgc;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 定期调用 jcmd ZGC.stats 采集指标，计算分配速率。
 */
public final class ZgcStatsCollector {

    private static final Pattern USED_PATTERN = Pattern.compile("Used:\\s+(\\d+)\\s+MB");
    private static final Pattern CAPACITY_PATTERN = Pattern.compile("Capacity:\\s+(\\d+)\\s+MB");

    public static void main(String[] args) throws Exception {
        long pid = ProcessHandle.current().pid();
        long prevUsed = 0;
        long prevTime = System.currentTimeMillis();

        while (true) {
            Process p = new ProcessBuilder("jcmd", String.valueOf(pid), "ZGC.stats").start();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                long used = 0;
                while ((line = r.readLine()) != null) {
                    Matcher m = USED_PATTERN.matcher(line);
                    if (m.find()) used = Long.parseLong(m.group(1));
                }
                long now = System.currentTimeMillis();
                if (prevUsed > 0) {
                    long deltaMB = used - prevUsed;
                    long deltaSec = (now - prevTime) / 1000;
                    double rateMBps = deltaSec > 0 ? (double) deltaMB / deltaSec : 0;
                    System.out.printf("Heap used = %d MB, alloc rate = %.2f MB/s%n", used, rateMBps);
                }
                prevUsed = used;
                prevTime = now;
            }
            Thread.sleep(5000);
        }
    }
}
```

### 思考题

**1.** 为什么 ZGC 选择 load barrier 而非 write barrier？这种设计有何优劣？

**参考答案**：ZGC 的核心挑战是并发转移——对象在应用线程访问时可能正在被转移。Load barrier 在每次加载引用时检查颜色并按需转发，保证应用线程始终访问最新地址。优势：转移可与应用并发进行，停顿与堆大小解耦。劣势：load barrier 开销较高（约 5–10% 吞吐损失），因为读操作远多于写。Shenandoah 选择 Brooks pointer（每对象额外指针），开销更均匀但 footprint 更高。ZGC 的设计在低延迟场景下更优，因为读屏障可由 JIT 优化（如比较颜色后快速路径）。

**2.** 分代 ZGC 引入 remembered set 后，是否会重新引入类似 G1 的写屏障开销？

**参考答案**：是，但开销更低。分代 ZGC 的 remembered set 仅在 old → young 跨代写时触发，且采用 card-and-table 混合结构，写屏障仅为简单的位标记。相比 G1 的 SATB + 卡表双屏障，分代 ZGC 的写屏障更轻量。实测显示，分代 ZGC 的总屏障开销（读 + 写）仍低于非分代 ZGC 的纯读屏障，因为新生代回收频率高但范围小，总扫描成本下降。

**3.** 假设你管理一个 32GB 堆、P99 < 5ms 的服务，目前使用 G1，P99 实测 80ms。如何评估是否迁移到分代 ZGC？

**参考答案**：(1) 确认 JDK 版本 ≥ 21；(2) 在预发环境部署分代 ZGC，使用相同负载跑 1 小时；(3) 通过 JFR 采集 P50/P99/P99.9 停顿、分配停顿、吞吐量、footprint；(4) 若 P99 < 5ms 且吞吐损失 < 10%，则迁移；(5) 灰度发布：5% → 25% → 100%，每阶段观察 24 小时；(6) 关注分配停顿 `jdk.ZAllocationStall`，若 P99 > 10ms 需调参（SoftMaxHeapSize、ZAllocationSpikeTolerance）；(7) 准备回滚方案（G1 配置保留）。

## 参考文献

[1] Yang, X., et al. 2018. The Z Garbage Collector. OpenJDK JEP 377. Available at: https://openjdk.org/jeps/377

[2] Yang, X., et al. 2023. Generational ZGC. OpenJDK JEP 439. Available at: https://openjdk.org/jeps/439

[3] Click, C. 2005. Azul pauseless GC. In *Companion to the 20th Annual ACM SIGPLAN Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA '05)*. ACM, New York, NY, USA, 282–283. DOI: https://doi.org/10.1145/1094855.1094917

[4] Detlefs, D., Flood, C., Heller, S., and Printezis, T. 2004. Garbage-first garbage collection. In *Proceedings of the 4th international symposium on Memory management (ISMM '04)*. ACM, New York, NY, USA, 37–48. DOI: https://doi.org/10.1145/1029873.1029879

[5] Flood, C., et al. 2023. Shenandoah: The garbage collector that could. In *Companion to the 28th ACM SIGPLAN Annual Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA '23 Companion)*. ACM, New York, NY, USA, 1–2. DOI: https://doi.org/10.1145/3622780.3622781

[6] Dijkstra, E. W., Lamport, L., Martin, A. J., Scholten, C. S., and Steffens, E. F. M. 1978. On-the-fly garbage collection: An exercise in cooperation. *Communications of the ACM* 21, 11 (Nov. 1978), 966–975. DOI: https://doi.org/10.1145/359642.359655

[7] Lieberman, H. and Hewitt, C. 1983. A real-time garbage collector based on the lifetimes of objects. *Communications of the ACM* 26, 6 (June 1983), 419–429. DOI: https://doi.org/10.1145/358141.358147

[8] Appel, A. W. 1989. Simple generational garbage collection and fast allocation. *Software: Practice and Experience* 19, 2, 171–183. DOI: https://doi.org/10.1002/spe.4380190206

[9] Jones, R., Hosking, A., and Moss, E. 2011. *The Garbage Collection Handbook: The Art of Automatic Memory Management* (2nd ed.). Chapman & Hall/CRC, Boca Raton, FL, USA.

[10] Oracle Corporation. 2023. *The Java Virtual Machine Specification, Java SE 21 Edition*. Oracle, Redwood City, CA, USA.

[11] Yang, X., Blackburn, S. M., McKinley, K. S., and Frampton, D. 2017. Barriers: friend or foe? In *Proceedings of the 2017 ACM SIGPLAN International Symposium on Memory Management (ISMM 2017)*. ACM, New York, NY, USA, 24–36. DOI: https://doi.org/10.1145/3080207.3080217

[12] Bacon, D. F., Cheng, P., and Rajan, V. T. 2004. A unified theory of garbage collection. In *Proceedings of the 19th Annual ACM SIGPLAN Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA '04)*. ACM, New York, NY, USA, 50–68. DOI: https://doi.org/10.1145/1028976.1028982

## 延伸阅读

### 书籍

- **Jones, R., Hosking, A., and Moss, E.** *The Garbage Collection Handbook* (2nd ed.). CRC Press, 2011. — GC 算法百科全书，涵盖 ZGC 理论基础。
- **Lin, C.** *Java Performance: The Definitive Guide*. O'Reilly, 2020. — Scott Oaks 著，含 ZGC 章节。
- **Kabutz, Dr. H.** *The Java Specialists' Newsletter*. https://www.javaspecialists.eu — ZGC 深度文章连载。

### 论文

- **Baker, H. G.** *List Processing in Real Time on a Serial Computer*. CACM, 1978. — 增量复制 GC 奠基论文。
- **Wilson, P. R.** *Uniprocessor Garbage Collection Techniques*. IWMM, 1992. — 经典综述。
- **Printezis, T. and Detlefs, D.** *A Generational Mostly-concurrent Garbage Collector*. ISMM, 2000. — CMS 设计论文，分代 ZGC 的灵感来源。

### 在线资源

- **JEP 439: Generational ZGC**：https://openjdk.org/jeps/439
- **JEP 377: ZGC: A Scalable Low-Latency Garbage Collector**：https://openjdk.org/jeps/377
- **ZGC Documentation (Oracle)**：https://docs.oracle.com/en/java/javase/21/gctuning/z-garbage-collector.html
- **ZGC 源码（OpenJDK）**：https://github.com/openjdk/jdk/tree/master/src/hotspot/share/gc/z
- **JDK Mission Control**：https://github.com/openjdk/jmc
- **zgc-stat 在线工具**：https://chriswhocodes.com/zgc-stat/
- **GCEasy**：https://gceasy.io
- **Hacker News: ZGC Discussion**：https://news.ycombinator.com/item?id=37575555

### 相关课程

- **MIT 6.102 Software Construction**：自动内存管理章节。
- **Stanford CS140 Operating Systems**：内存管理与并发回收。
- **CMU 15-410 Operating Systems**：GC 屏障与并发数据结构。
- **Berkeley CS162 Operating Systems**：现代 GC 设计讲座。
- **Oracle University: Java Performance Tuning**：ZGC 实战培训。
