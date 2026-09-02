# HashMap 源码详解

平台的"歌曲缓存"是最典型的 HashMap 使用场景：以歌曲编号为 key、歌曲元数据为 value，把热门歌曲常驻内存，避免每次点播都查库。这个 Map 看似只是 `put` 与 `get`，底层却是"数组 + 链表 + 红黑树"三位一体的精巧结构，牵涉哈希扰动、树化、扩容拆分等一整套机制。本篇基于 JDK 8 及以后的实现，把 HashMap 从字段到算法逐层拆开。

阅读本篇前请确认你已掌握集合框架的整体分层，并且清楚 `equals()` 与 `hashCode()` 的契约——HashMap 的所有行为都建立在这两个方法之上。

## 前置知识

- [集合框架详解](/java/021-CollectionFrameworkDetailed)：List、Set、Map 体系与 HashMap 的对外行为。
- [equals 与 hashCode 契约](/java/020-EqualsHashCodeContract)：理解"哈希定位 + equals 判等"双闸门的前提。
- [迭代器与 Iterable](/java/023-JavaIteratorIterable)：阅读 entrySet 遍历实现时会用到。

## 学习目标

- 说清 HashMap 的核心字段、默认容量 16 与负载因子 0.75 的含义及关系；
- 手推 `hash` 扰动函数与 `(n - 1) & hash` 索引计算，理解容量为 2 的幂的原因；
- 完整复述 `putVal` 的七个步骤，包括链表尾插与树化条件；
- 理解 `resize` 扩容中的高低位链拆分算法与它的巧妙之处；
- 对比 JDK 1.7 与 1.8 的实现差异，能解释并发使用 HashMap 的两类事故。

## 1. 核心字段：容量、负载因子与树化阈值

HashMap 的骨架是一个 Node 数组（JDK 8 之前叫 Entry），每个槽位（bucket）挂一条链表或一棵红黑树。先认识几个决定行为的字段：

```java
// HashMap 关键常量与字段（JDK 8 源码节选，附中文说明）
static final int DEFAULT_INITIAL_CAPACITY = 1 << 4;  // 默认初始容量 16
static final int MAXIMUM_CAPACITY = 1 << 30;         // 最大容量，2 的 30 次方
static final float DEFAULT_LOAD_FACTOR = 0.75f;      // 默认负载因子：空间与时间的折中
static final int TREEIFY_THRESHOLD = 8;              // 链表长度达到 8 才可能树化
static final int UNTREEIFY_THRESHOLD = 6;            // 扩容拆分时缩到 6 退化为链表
static final int MIN_TREEIFY_CAPACITY = 64;          // 树化的容量门槛，不足则先扩容

transient Node<K,V>[] table;   // 哈希桶数组，懒加载：new 时并不分配
transient int size;            // 实际键值对数量
int threshold;                 // 扩容阈值 = capacity * loadFactor
transient int modCount;        // 结构修改次数，用于 fail-fast 迭代检查
```

三个关键关系：容量（capacity）是桶数组的长度，永远是 2 的幂；阈值（threshold）= 容量乘以负载因子，`size` 超过它就触发扩容；负载因子默认 0.75，是统计学权衡的结果——太低浪费内存，太高链表变长、查询退化。另外 `table` 采用懒加载，`new HashMap<>()` 并不分配数组，第一次 `put` 时才初始化，避免"建了不用的 Map 白占内存"。

字段清单之外，还要分清 HashMap 与近亲们的定位差异：HashMap 允许一个 null key 与多个 null value，追求单线程下的极致性能；Hashtable 方法级全表加锁，早已过时；ConcurrentHashMap 才是并发的正解。本篇源码以 JDK 8 为基准，8 与 11、17 之间该结构没有本质变化，只是个别方法与常量有微调，结论可以放心迁移。

## 2. hash 扰动与索引计算：为什么要异或高 16 位

索引并非直接用 `hashCode()`。HashMap 先做一次"扰动"，再把结果与桶数组边界做与运算：

```java
// 第一步：扰动函数——高 16 位与低 16 位异或
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

// 第二步：取模的位运算等价式，n 为容量（2 的幂）
int index = (n - 1) & hash;
```

扰动的动机来自索引计算方式：`(n - 1) & hash` 只会用到 hash 的低若干位。若容量是 16，参与运算的只有低 4 位，`hashCode` 的高位信息全部被丢弃，哈希设计不好的 key（比如连续编号的歌曲 ID）会大面积撞车。把 `h >>> 16`（高 16 位无符号右移）与原值异或，等于让高位"掺进"低位，把哈希的随机性充分摊开。异或运算还有一个好性质：0、1 组合均匀，不会偏向某一边。

容量必须是 2 的幂也有明确理由：`n - 1` 的二进制是全 1（如 16 - 1 = 1111），与运算的结果等价于 `hash % n`，但位运算快得多，且每个桶位都能被均匀命中。若 n 不是 2 的幂，`n - 1` 出现 0 位，部分桶永远放不进元素。

## 3. putVal 全流程：从定位到覆盖再到树化

`put` 最终落到 `putVal`，其主干逻辑可以浓缩为下面的等价描述（对照源码阅读效果最佳）：

```java
// putVal 主干流程（简化伪代码，保留全部关键分支）
final V putVal(int hash, K key, V value, boolean onlyIfAbsent, boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;
    if ((tab = table) == null || (n = tab.length) == 0) {
        n = (tab = resize()).length;            // 步骤 1：懒初始化，顺便定容量
    }
    if ((p = tab[i = (n - 1) & hash]) == null) {
        tab[i] = newNode(hash, key, value, null); // 步骤 2：桶为空，直接放入
    } else {
        // 步骤 3：桶非空，沿链表（或树）寻找相同 key 或表尾
        for (int binCount = 0; ; ++binCount) {
            if (p.hash == hash && (p.key == key || key.equals(p.key))) {
                // 步骤 4：key 已存在，新值覆盖旧值
                break;
            }
            if (p.next == null) {
                p.next = newNode(hash, key, value, null); // 步骤 5：尾插新节点（JDK 8 改为尾插）
                if (binCount >= TREEIFY_THRESHOLD - 1) {
                    treeifyBin(tab, hash);        // 步骤 6：链表长度达 8，尝试树化
                }
                break;
            }
            p = p.next;
        }
    }
    ++modCount;                                   // 步骤 7：结构变更计数（fail-fast 依据）
    if (++size > threshold) {
        resize();                                 // 步骤 8：超过阈值，扩容
    }
    return null;
}
```

"相同 key"的判定是双重闸门：先比 `hash`（快），再比 `==` 或 `equals`（准）。这也解释了为什么 key 类必须同时正确实现 `hashCode` 与 `equals`：只实现其一，要么永远定位不到同一个桶，要么定位到了却判不出相等，造成"重复 key"与"取不回来"。

## 4. 链表与红黑树：树化的条件与代价

链表查询是 O(k)（k 为链长），极端哈希碰撞下会退化成 O(n)。JDK 8 引入红黑树把最坏情况压到 O(log k)，但树节点体积是普通节点的两倍，维护成本更高，所以树化设了两道门槛：

1. 链表长度达到 `TREEIFY_THRESHOLD = 8`（且遍历计数从 0 开始，实际是第 9 个节点触发）；
2. 桶数组容量达到 `MIN_TREEIFY_CAPACITY = 64`，否则优先 `resize()` 扩容——用更大的数组摊薄碰撞，往往比树化更划算。

为什么阈值偏偏是 8？源码注释给出的是泊松分布依据：在理想随机哈希下，单个桶内链表长度恰好为 8 的概率约为千万分之六，几乎不会发生；树化只是针对"哈希质量差或被恶意构造碰撞"的兜底保险。反过来，扩容拆分时若树上节点数缩到 `UNTREEIFY_THRESHOLD = 6` 以下，树会退化回链表，8 与 6 之间留出的缓冲带避免了"在阈值附近反复树化、退化"的抖动。

## 5. resize 扩容与高低位拆分

扩容做两件事：容量翻倍（`newCap = oldCap << 1`）、把所有节点搬到新数组。JDK 8 的搬移没有逐个重新取模，而是用一条位运算判据直接分堆：

```java
// resize 迁移的核心判据（简化）：oldCap 为旧容量
for (Node<K,V> e : oldTab) {
    if (e.hash & oldCap) == 0 {
        // 低位链：扩容后索引不变，仍在原下标 j
    } else {
        // 高位链：索引 = 原下标 j + oldCap
    }
}
```

原理是：容量翻倍后新索引只比旧索引多看一位二进制，看的正是"oldCap 对应的那一位"。该位为 0 则新索引与旧索引相同，为 1 则等于旧索引加 oldCap。这样一次遍历就能把每个桶拆成"低位链、高位链"两条，且 JDK 8 采用尾插法迁移，节点在各自链表里的相对顺序保持不变。JDK 1.7 用头插法，扩容后同一链表会被反转，并发场景下更会酿成大祸，这正是下一节的主题。

这套拆分算法还有一层衍生价值：它把"容量必须是 2 的幂"从约定变成了硬依赖。扰动、位取模、高低位拆分，整套算法都围绕 2 的幂设计；ConcurrentHashMap 延用同样的容量策略，也是为了完整继承这套低成本迁移方案。理解了这一层，你就理解了为什么几乎所有主流哈希表都把容量做成 2 的幂。

## 6. JDK 1.7 与 1.8 的实现差异与线程问题

两代实现的主要差异可以归纳为一张表：

| 维度 | JDK 1.7 | JDK 1.8 |
| --- | --- | --- |
| 底层结构 | 数组 + 链表 | 数组 + 链表 + 红黑树 |
| 插入方式 | 头插法 | 尾插法 |
| 哈希扰动 | 4 次移位 + 5 次异或 | 1 次移位 + 1 次异或 |
| 扩容迁移 | 逐个重新计算索引，链表反转 | 高低位拆分，顺序保持 |
| 并发扩容风险 | 环形链表导致 CPU 100% | 数据覆盖丢失 |

JDK 1.7 的经典事故是"环形链表死循环"：两个线程同时 `resize`，头插法在转移链表时会让节点互相指错，形成 A 指向 B、B 又指向 A 的环，之后任何一次 `get` 落入该桶都会无限循环。JDK 1.8 改用尾插法消除了成环，但 HashMap 依旧不是线程安全的：并发 `put` 仍会互相覆盖、`size` 计数错乱、fail-fast 迭代抛 `ConcurrentModificationException`。多线程环境请使用 `ConcurrentHashMap`，它用 CAS 加 synchronized 锁单桶的方式保证了并发安全，且同样采用"数组 + 链表 + 红黑树"结构。

负载因子 0.75 本身也值得展开：它是"空间成本"与"时间成本"的折中实验值。负载因子越大，同样的数据占用内存越小，但碰撞概率上升、链表变长；越小则查询更快，内存却更浪费。0.75 大致对应泊松分布下"桶内元素个数超过均值后概率快速衰减"的平衡点，配合容量取 2 的幂，性能与内存都不至于失衡。`loadFactor` 允许自定义，但除非做过针对性压测，保持默认值是更稳妥的选择。

## 7. 实战：预估容量与可变 key 两个工程要点

源码知识最终要落到工程实践。第一是容量预估：已知要放 1000 首歌时，按"阈值 = 容量乘以 0.75"反推，初始容量至少应为 `1000 / 0.75 + 1`，约 1334，取整到 2048，即可全程免扩容。

```java
import java.util.HashMap;
import java.util.Map;

public class SongCacheDemo {
    // 简化的歌曲模型：id 参与 hashCode 与 equals
    record Song(long id, String title) {
        @Override public int hashCode() { return Long.hashCode(id); }
        @Override public boolean equals(Object o) {
            return o instanceof Song other && other.id == id;
        }
    }

    public static void main(String[] args) {
        int expectedSize = 1000;
        // 预估容量：除以负载因子并加 1，避免触发任何一次 resize
        Map<Long, Song> cache = new HashMap<>((int) (expectedSize / 0.75f) + 1);
        for (long id = 1; id <= expectedSize; id++) {
            cache.put(id, new Song(id, "歌曲-" + id));
        }
        System.out.println("缓存歌曲数：" + cache.size());
    }
}
```

第二是 key 的不可变性。若 key 对象在放入后被修改，且修改影响了 `hashCode`，它会被算进新桶、却仍躺在旧桶里——既 `get` 不到，也无法被遍历删除，成为内存泄漏。平台里最常见的翻车是把可变的实体类当 key，随后又更新了它的字段。

## 8. get 与 fail-fast：读路径同样有学问

`get` 的实现 `getNode` 远比 `putVal` 简短：先做同样的扰动哈希、按 `(n - 1) & hash` 定位桶，桶是树就走红黑树查找，是链表就逐节点比对（依旧先比 hash 再比 equals）。正因为读路径不做任何加锁与拷贝，并发写导致的"读到一半链表被改"才会暴露——这也是读多写少场景仍不能放松线程安全要求的原因。

与读相关的另一套机制是 fail-fast：`modCount` 记录结构性变更次数，`entrySet().iterator()` 创建时会快照该值，迭代期间发现实际值与快照不一致就立即抛 `ConcurrentModificationException`，宁可失败也不带病运行。

```java
import java.util.HashMap;
import java.util.Map;

public class FailFastDemo {
    public static void main(String[] args) {
        Map<String, Integer> votes = new HashMap<>();
        votes.put("千本樱", 1);
        votes.put("Melt", 2);

        // 迭代中直接 remove 会改变结构，触发 fail-fast
        for (Map.Entry<String, Integer> e : votes.entrySet()) {
            if (e.getKey().equals("Melt")) {
                votes.remove(e.getKey());   // ConcurrentModificationException
            }
        }
    }
}
```

正确做法是使用 `Iterator` 自己的 `remove()` 方法，或直接用 `removeIf` 一行过滤；fail-fast 只是"尽力而为"的检测机制，不能当作并发安全的保证，它的价值在于把并发误用尽早暴露出来。顺带一提，`get`、`containsKey` 等只读操作不会修改 `modCount`，迭代中只读不写不会触发 fail-fast，这套机制针对的是"结构修改"而非"值修改"。

## 易错点与最佳实践

**错误一：把可变对象当 key 且随后修改它。**

```java
// 错误：Song 作为 key 放入后，又改了参与 hash 的字段
Map<Song, Integer> playCount = new HashMap<>();
Song song = new Song(101, "旧标题");
playCount.put(song, 5);
song = new Song(101, "新标题");            // hash 变了
playCount.get(new Song(101, "新标题"));    // 取不到：节点躺在旧桶里

// 修正：key 用不可变类型（String、Long、record），或保证放入后不再修改
Map<Long, Integer> playCount2 = new HashMap<>();  // 以歌曲 id 为 key
```

**错误二：只重写 `equals` 不重写 `hashCode`（或反之）。**

```java
// 错误：equals 相同的两个 key，hashCode 不同，会进不同的桶
// 修正：两者必须成对重写，且 equals 相等则 hashCode 必须相等
@Override public int hashCode() { return Long.hashCode(id); }
```

**错误三：拿 HashMap 撑并发。**

```java
// 错误：多线程同时 put，出现数据覆盖、size 错乱
Map<String, Integer> votes = new HashMap<>();

// 修正：并发场景换成 ConcurrentHashMap
Map<String, Integer> votes = new java.util.concurrent.ConcurrentHashMap<>();
```

**错误四：对容量没有预估，反复触发扩容。**

大数据量场景下，默认从 16 起步要经历多次 resize，每次都全量迁移节点。按 `expectedSize / 0.75 + 1` 指定初始容量（或直接用 Guava 的 `Maps.newHashMapWithExpectedSize`），能把扩容次数降为零。

## 本篇小结

- HashMap = 桶数组 + 链表 + 红黑树；默认容量 16、负载因子 0.75、阈值 = 容量乘负载因子，`table` 懒加载。
- 索引计算是两步走：`hash = hashCode ^ (hashCode >>> 16)` 扰动，再 `(n - 1) & hash` 取位；容量恒为 2 的幂是位运算取模与均匀分布的前提。
- `putVal` 的关键分支：空桶直插、同 key 覆盖（先比 hash 再比 equals）、链表尾插、长度达 8 且容量不低于 64 才树化。
- 扩容翻倍并用 `(hash & oldCap)` 判据把每个桶拆成高低位两条链，一次遍历完成迁移且保持相对顺序。
- JDK 1.7 与 1.8 的分水岭在树化、尾插与高低位拆分；HashMap 从来不是线程安全的，并发一律 `ConcurrentHashMap`。

## 动手实践

1. **复现扰动效果**：写一个 key 为自增 long 的实验，分别统计容量 16 下"直接取低 4 位"与"先扰动再取低 4 位"的桶分布，比较最大链长差异。思路：用 `Long.hashCode` 造哈希，两个版本各放 1 万条记录，打印每个桶的计数。
2. **观察树化与退化**：构造一个 `hashCode` 恒返回固定值的 key 类，向 HashMap 放入 100 条数据并断点观察 `treeifyBin` 是否被调用；再用容量 64 与 32 对比。思路：让所有元素挤进同一个桶，验证 `MIN_TREEIFY_CAPACITY` 的拦截作用。
3. **解释一次"丢数据"**：两个线程各自向同一个 HashMap 放入 1 万个不同的 key，结束后 `size` 小于 2 万且部分 key 缺失。请用 `putVal` 的步骤说明哪些分支可能被并发穿插，并改写为 `ConcurrentHashMap` 版本对比结果。思路：重点看"读旧 size、判断阈值、自增"非原子，以及同桶并发插入的覆盖路径。
