---
order: 90
title: 集合与迭代器
module: 'rust'
category: 后端技术
difficulty: intermediate
description: Vec、HashMap、HashSet、String 与迭代器链式操作
author: fanquanpp
updated: '2026-08-30'
related:
  - 'rust/005-RustOwnershipBorrowing'
  - 'rust/010-RustGenericTrait'
prerequisites:
  - 'rust/005-RustOwnershipBorrowing'
---


## 1. 从"工具箱"说起：集合总览

想象一个工具箱（标准库集合）：**抽屉（Vec）放有序的物品**、**带标签的格架（HashMap）按名字找物品**、**去重盒（HashSet）保证东西不重复**。Rust 的集合就是为这些需求准备的"专业容器"。

标准库集合都存放在堆上，可动态增长。最常用的三个：

| 集合 | 说明 | 典型场景 |
| --- | --- | --- |
| Vec\<T\> | 动态数组，O(1) 索引 | 有序数据列表 |
| HashMap\<K, V\> | 哈希表，O(1) 按键查找 | 键值映射 |
| HashSet\<T\> | 哈希集合，元素唯一 | 去重、成员判断 |

## 2. Vec：动态数组

```rust
fn main() {
    let mut v: Vec<i32> = Vec::new();
    v.push(1);
    v.push(2);
    v.push(3);
    println!("{:?}", v);            // [1, 2, 3]

    let v2 = vec![10, 20, 30];      // 宏创建更常用
    println!("{} {}", v2[0], v2.len());  // 10 3

    for x in &v2 {                  // 遍历借用
        println!("{x}");
    }
}
```

讲解：`vec!` 宏是创建 Vec 的惯用法；索引越界会 panic，可用 `get()` 返回 Option 安全访问。

```rust
let v = vec![1, 2, 3];
match v.get(5) {
    Some(x) => println!("{x}"),
    None => println!("索引越界"),
}
// 常用方法
let mut v = vec![3, 1, 2];
v.sort();              // 排序
v.push(9);             // 尾部追加
v.pop();               // 尾部弹出
println!("{}", v.first().unwrap_or(&0)); // 首元素
```

### 2.1 更新与所有权

```rust
let mut v = vec![1, 2, 3];
v[0] = 10;                       // 索引更新（需要 mut）
let x = &mut v[0];               // 可变借用后更新
*x += 1;
println!("{v:?}");               // [11, 2, 3]
```

讲解：修改元素需 `mut`；`&mut v[0]` 借用单个元素时，同一时刻不能同时借用其他元素（借用规则）。

## 3. HashMap：键值映射

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert(String::from("Rust"), 95);
    scores.insert(String::from("Go"), 90);

    // 读取：get 返回 Option
    let s = scores.get("Rust");
    println!("{:?}", s);          // Some(95)

    // 遍历
    for (k, v) in &scores {
        println!("{k}: {v}");
    }

    // entry：有则更新，无则插入
    scores.entry(String::from("Rust")).or_insert(100);  // 已有 95，不覆盖
    scores.entry(String::from("C")).or_insert(88);      // 插入 88
    println!("{scores:?}");
}
```

讲解：`get` 返回 `Option<&V>` 避免空值；`entry().or_insert()` 是"统计词频"类问题的标准写法。

### 3.1 统计单词频次

```rust
use std::collections::HashMap;

fn freq(text: &str) -> HashMap<&str, u32> {
    let mut map = HashMap::new();
    for word in text.split_whitespace() {
        *map.entry(word).or_insert(0) += 1;
    }
    map
}

fn main() {
    let f = freq("the cat and the dog");
    println!("{:?}", f);  // {"the": 2, "cat": 1, ...}
}
```

讲解：`entry(word).or_insert(0)` 返回 `&mut u32`，解引用后自增；若键不存在则先插入 0。这是 HashMap 最常用的模式。

## 4. HashSet：集合运算

```rust
use std::collections::HashSet;

fn main() {
    let mut set = HashSet::new();
    set.insert("apple");
    set.insert("banana");
    set.insert("apple");          // 重复插入被忽略

    println!("{}", set.len());    // 2
    println!("{}", set.contains("apple")); // true

    // 集合运算
    let a: HashSet<_> = [1, 2, 3].into_iter().collect();
    let b: HashSet<_> = [3, 4, 5].into_iter().collect();
    let union: HashSet<_> = a.union(&b).copied().collect();       // {1,2,3,4,5}
    let diff: HashSet<_> = a.difference(&b).copied().collect();   // {1,2}
    println!("{union:?} {diff:?}");
}
```

讲解：`union`/`difference`/`intersection` 返回迭代器，`collect()` 收集成新集合。`&[i32]` 与 `into_iter` 是数组转集合的惯用桥接。

## 5. String 与 &str

Rust 有两种字符串，务必区分：

| 类型 | 说明 | 所有权 |
| --- | --- | --- |
| String | 可变、堆分配、UTF-8 | 拥有数据 |
| &str | 不可变、借用视图 | 借用数据 |

```rust
fn main() {
    let mut s = String::from("hello");
    s.push_str(", world");        // 追加
    s.push('!');                  // 追加单字符
    println!("{s}");

    let slice: &str = &s[..5];    // "hello"，&str 是 String 的视图
    let lit: &str = "直接字面量";   // 字面量天然是 &str

    // 常用操作
    let t = format!("{}-{}", s, 42); // format! 格式化拼接（不移动所有权）
    println!("{t} {}", t.len());     // len 是字节数
    println!("{} {}", t.contains("hello"), t.replace("hello", "hi"));
}
```

讲解：字符串拼接常用 `format!`；`len()` 返回字节数而非字符数（中文一个字符 3 字节），需要字符数用 `.chars().count()`。

## 6. 迭代器与链式操作

迭代器（Iterator）是 Rust 数据处理的核心抽象：惰性、零成本抽象、组合性强。

```rust
fn main() {
    let nums = vec![1, 2, 3, 4, 5, 6];

    let result: Vec<i32> = nums
        .iter()          // 创建迭代器（借用）
        .filter(|x| *x % 2 == 0)  // 过滤出偶数
        .map(|x| x * 10)          // 每个数乘 10
        .collect();               // 收集为 Vec
    println!("{result:?}");       // [20, 40, 60]

    // 聚合操作
    let sum: i32 = nums.iter().sum();        // 21
    let max = nums.iter().max().unwrap();    // 6
    let any = nums.iter().any(|x| x > 5);    // true
    println!("{sum} {max} {any}");
}
```

讲解：`filter` 接收闭包（注意 `*x` 解引用）、`map` 转换值、`collect` 终止迭代。链式调用没有中间 Vec 分配（零成本抽象），性能与手写循环相当。

### 6.1 常用迭代器方法

| 方法 | 作用 | 示例 |
| --- | --- | --- |
| iter() | 借用迭代 | `v.iter()` 得 `&i32` |
| into_iter() | 消费迭代（取走元素） | `v.into_iter()` 得 `i32` |
| filter | 保留满足条件的 | `xs.filter(|x| *x > 0)` |
| map | 变换每个元素 | `xs.map(|x| x * 2)` |
| take / skip | 取前 n 个 / 跳过 n 个 | `xs.take(3).skip(1)` |
| fold | 累加器归约 | `xs.fold(0, |acc, x| acc + x)` |
| collect | 收集为集合 | `xs.collect::<Vec<_>>()` |

```rust
// 链式示例：求前 5 个正数的平方和
let nums = vec![-3, -1, 0, 2, 4, 6, 8];
let sum: i32 = nums.iter()
    .filter(|x| **x > 0)
    .take(5)
    .map(|x| x * x)
    .sum();
println!("{sum}");   // 2^2+4^2+6^2+8^2 = 120
```

讲解：闭包参数是 `&&i32` 时需双重解引用 `**x`；`take(5)` 只取前 5 个，然后 map 后求和，一气呵成。

### 6.2 闭包捕获

```rust
let threshold = 50;
let big: Vec<_> = nums.iter()
    .filter(|x| **x > threshold)   // 闭包捕获外部变量 threshold（借用）
    .collect();
```

讲解：闭包可以捕获外层变量（默认按借用捕获）；需要拥有数据时加 `move` 关键字——这也是后续异步编程（Send 约束）的重要基础。

## 7. 综合示例：日志分析小工具

```rust
use std::collections::HashMap;

fn analyze(log: &str) -> (usize, HashMap<&str, usize>) {
    let total = log.lines().count();
    let mut level_count: HashMap<&str, usize> = HashMap::new();
    for line in log.lines() {
        let level = line.split_whitespace().nth(0).unwrap_or("unknown");
        *level_count.entry(level).or_insert(0) += 1;
    }
    (total, level_count)
}

fn main() {
    let log = "ERROR disk full\nINFO started\nERROR timeout\nINFO ok";
    let (total, counts) = analyze(log);
    println!("总行数: {total}");
    for (k, v) in &counts {
        println!("{k}: {v}");
    }
}
```

讲解：`lines()` 按行迭代、`split_whitespace` 分词、`entry().or_insert()` 计数——组合了本节全部知识点。

## 10. 小结

Vec/HashMap/HashSet 覆盖了绝大多数数据组织需求；String 与 &str 的区分沿用所有权思维；迭代器链式操作让数据处理"声明式、零分配、可组合"。下一步学习泛型与 Trait，让代码对不同类型复用。

> **一句话记忆**：Rust 集合三件套——"Vec 存顺序、HashMap 存映射、HashSet 做去重"；数据处理用迭代器链（`filter` → `map` → `collect`），声明式、零分配、性能与手写循环相当。
