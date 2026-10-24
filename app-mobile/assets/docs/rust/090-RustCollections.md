---
order: 110
title: 集合类型
module: 'rust'
category: 后端技术
difficulty: intermediate
description: Vec、HashMap、HashSet 的增删改查与集合运算、entry 模式、String 与 &str 的所有权分野
author: fanquanpp
updated: '2026-10-07'
related:
  - 'rust/050-RustOwnershipBorrowing'
  - 'rust/095-RustIteratorsFunctional'
  - 'rust/100-RustGenericTrait'
prerequisites:
  - 'rust/050-RustOwnershipBorrowing'
---

## 前置知识

- [所有权与借用](/rust/050-RustOwnershipBorrowing)：move 与借用规则——集合的方法签名大量依赖它们。

## 知识点地图

- **知识类别**：标准库集合——Vec、HashMap、HashSet 与字符串类型（String / &str）。数据「放在哪、怎么取」的答案都在这里；「怎么算」见 [迭代器与函数式风格](/rust/095-RustIteratorsFunctional)。
- **解决什么问题**：一组数据要按顺序存取（购物车条目）、按键定位（用户配置）、去重判存（权限列表）；以及「这段文本是谁的」的所有权分野——函数参数该收 String 还是 &str。
- **什么时候用到**：几乎每个非玩具程序的第一批数据结构选型；统计类需求（词频、计数）的 entry 模式；任何涉及中文文本长度的场景。
- **本篇不讲**：迭代器链式运算（见 095 篇）；BTreeMap/BTreeSet 等有序集合与 VecDeque（文档级的扩展阅读）。

## 学习目标

读完本文你将能够：

1. 会用 Vec / HashMap / HashSet 完成增删改查、`entry().or_insert()` 统计与集合运算；
2. 分清 String 与 `&str`，记住 `len()` 返回字节数这个中文环境必踩的坑；
3. 能按「有序列表、键值映射、去重集合」三问为业务数据选对容器；
4. 能独立写出「按行分析日志」这类小型数据处理程序（迭代器细节见 095 篇）。

预计 45 分钟。

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

## 6. 综合示例：词频统计与购物车

```rust
use std::collections::HashMap;

fn main() {
    // 例一：词频统计（entry 模式的完整形态）
    let text = "rust is fast rust is safe";
    let mut freq: HashMap<&str, u32> = HashMap::new();
    for word in text.split_whitespace() {
        *freq.entry(word).or_insert(0) += 1;
    }
    let top: Vec<(&str, u32)> = {
        let mut pairs: Vec<_> = freq.into_iter().collect();
        pairs.sort_by_key(|(_, c)| std::cmp::Reverse(*c));
        pairs.into_iter().take(2).collect()
    };
    println!("词频前二：{top:?}");   // [("rust", 2), ("is", 2)]

    // 例二：购物车（Vec 存条目，HashMap 做索引）
    let cart = vec!["键盘", "鼠标", "键盘"];
    let mut stock: HashMap<&str, u32> = HashMap::new();
    for item in &cart {
        *stock.entry(*item).or_insert(0) += 1;
    }
    println!("{stock:?}");           // {"键盘": 2, "鼠标": 1}
}
```

讲解：

- 例一在 3.1 节词频函数之上补了「取前二」的收尾：`into_iter().collect()` 把 map 变 Vec 以便排序，`sort_by_key + Reverse` 按次数降序——集合之间的转换（HashMap -> Vec）是常态，各有分工；
- 例二演示 Vec 与 HashMap 的配合：Vec 保购物顺序与重复项，HashMap 聚合库存视图。「要不要保留重复」正是两者选型的分水岭；
- `freq.into_iter()` 消费了 map（拿走键值对）；若之后还要用 map，改用 `iter()` 借用遍历——所有权的进出在集合之间同样生效。

## 7. 动手实践

**任务一：通讯录（约 15 分钟）**

用 `HashMap<String, Vec<String>>` 建通讯录：`add(map, name, phone)` 给某人追加一个号码（一人多号）；`lookup(map, name)` 返回某人的全部号码（可能没有这个人）。写 main 演示增查。

提示：`entry(name.to_string()).or_default()` 拿到 `&mut Vec<String>` 后 push；lookup 用 `get` 返回 `Option<&Vec<String>>`，配合 075 篇的 Option 方法优雅处理「查无此人」。

**任务二：差集报表（约 10 分钟）**

给定「昨日在线用户」与「今日在线用户」两个 `HashSet<&str>`，输出「连续两日在线」与「今日流失（昨日在今日不在）」两个集合。

提示：`intersection` 与 `difference` 返回迭代器，`copied().collect()` 收回 HashSet；注意 difference 的方向语义（a.difference(&b) 是「在 a 不在 b」）。

**任务三：中文长度陷阱（约 10 分钟）**

写函数 `width_of(s: &str) -> usize` 返回「字符数」，用 `"rust语言"` 与 `"你好"` 验证它输出 6 与 2，并解释为什么 `len()` 对这两个值分别返回 8 与 6。

提示：`chars().count()`；「语」等 CJK 字符在 UTF-8 里占 3 字节，`len()` 数的是字节。

参考实现（先自己写完再展开对照）：

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

任务一：

```rust
fn add(map: &mut HashMap<String, Vec<String>>, name: &str, phone: String) {
    map.entry(name.to_string()).or_default().push(phone);
}

fn lookup(map: &HashMap<String, Vec<String>>, name: &str) -> Vec<String> {
    map.get(name).cloned().unwrap_or_default()
}
```

要点：`or_default()` 是 `or_insert_with(Default::default)` 的简写，Vec 的默认值就是空 Vec；`lookup` 返回 owned Vec（克隆一份）而不是引用——引用版函数要写生命周期标注，且调用方借用了 map 就不能再改它，返回 owned 值是工程上更顺手的取舍；`unwrap_or_default()` 把「查无此人」折叠成空列表，调用方免判 None。

任务二：

```rust
let both: HashSet<_> = yday.intersection(&today).copied().collect();
let lost: HashSet<_> = yday.difference(&today).copied().collect();
```

要点：两个方向别搞反；若想把结果继续用集合运算，collect 回 `HashSet<_>`；这里 `.copied()` 是因为 HashSet<&str> 的迭代元素是 `&&str`。

任务三：

```rust
fn width_of(s: &str) -> usize {
    s.chars().count()
}
```

要点：`"rust语言"` 是 4 个 ASCII 字符（各 1 字节）+ 2 个汉字（各 3 字节）= 10 字节、6 个字符——所以 len() = 10（若你算出 8，是把汉字按 2 字节记了，那是 GBK 时代的直觉，UTF-8 里汉字 3 字节）。字符数与显示宽度仍不相等（全角字符占两列），排版场景要进一步用 unicode-width 类 crate。

</details>

## 8. 小结

Vec/HashMap/HashSet 分别回答「顺序存取、按键定位、去重判存」三类组织需求；`entry().or_insert()` 是统计类问题的标准答案；String 拥有数据、&str 借用视图，`len()` 数字节不数字符。集合之间的转换（into_iter/collect）沿用所有权思维。数据「怎么算」的声明式答案见 [迭代器与函数式风格](/rust/095-RustIteratorsFunctional)。

> **一句话记忆**：Rust 集合三件套——"Vec 存顺序、HashMap 存映射、HashSet 做去重"；函数收参数优先收 `&str`/`&[T]` 借用视图，把 String/Vec 留给拥有数据的场合。
