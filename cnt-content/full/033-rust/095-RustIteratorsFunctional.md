---
order: 120
title: 迭代器与函数式风格
module: 'rust'
category: 后端技术
difficulty: intermediate
description: Iterator trait 与惰性求值、map/filter/zip/chain 适配器、collect/sum/fold 消费器、零成本抽象与闭包捕获
author: fanquanpp
updated: '2026-10-07'
related:
  - 'rust/090-RustCollections'
  - 'rust/110-RustClosuresFnTraits'
prerequisites:
  - 'rust/090-RustCollections'
---

## 知识点地图

- **知识类别**：数据处理的核心抽象——迭代器（Iterator trait）与函数式风格（适配器链 + 消费器）。上一篇的集合是「数据放哪」，本篇是「数据怎么算」。
- **解决什么问题**：手写循环处理集合时，「过滤、转换、聚合」的意图淹没在下标与临时变量里；为每一步准备中间 Vec 造成无谓分配；想复用同一段处理逻辑却只能复制粘贴循环体。
- **什么时候用到**：一切集合到集合的转换（解析、清洗、统计）、聚合运算（求和、最值、判断存在性）、配合 [文件 IO](/rust/085-RustFileIoAndCommandLine) 的逐行处理、与闭包（见 [闭包与 Fn trait](/rust/110-RustClosuresFnTraits)）组合的回调逻辑。
- **本篇不讲**：闭包本身的定义语法与三种 Fn trait 的区别（见 110 篇）；集合的增删改查（见 [集合类型](/rust/090-RustCollections)）。

## 学习目标

读完本文你将能够：

1. 解释 Iterator trait 的 `next()` 契约与「惰性求值」的含义；
2. 用 `filter` / `map` / `zip` / `chain` 等适配器组合出声明式数据处理管道；
3. 用 `collect` / `sum` / `max` / `any` / `fold` 等消费器收尾，并说清 turbofish `::<` `>` 什么时候要写；
4. 理解「零成本抽象」：迭代器链为什么不比手写循环慢；
5. 掌握闭包捕获与 `move` 在迭代器场景的表现，能独立写出日志统计、金额汇总、CSV 解析三类小程序。

预计 55 分钟。

## 1. 你现在要解决什么问题

先看一个手写循环版的「统计日志里 ERROR 行数并提取消息」：

```rust
let mut errs: Vec<String> = Vec::new();
for line in log.lines() {
    if line.starts_with("ERROR") {
        errs.push(line.to_string());
    }
}
```

功能正确，但三个痛点随规模浮现：意图（过滤）被语法（for、push）包裹，读代码要逐行还原逻辑；每加一个处理步骤就多一个中间 Vec 或一层嵌套 if；这段逻辑无法直接换数据源（从切片换成文件行、换成 HTTP 响应流）。迭代器的答案是把「怎么遍历」交给 trait，把「做什么」写成一串具名步骤——同一个管道换个迭代器来源就能跑在任何序列上。

## 2. Iterator trait：惰性求值的契约

标准库里迭代器只有一条核心契约：

```rust
pub trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
    // 其余方法全部有默认实现
}
```

- `next()` 每次吐出一个元素，耗尽时返回 `None`——`Option` 又一次充当「可能没有值」的通用语言（见 [枚举与模式匹配](/rust/075-RustEnumAndPatternMatching)）；
- `for x in coll` 的本质就是循环调用 `next()` 直到 None，语法糖而已；
- **惰性求值**：适配器（filter/map）只记录「要做什么」，不产生任何计算；直到消费器（collect/sum）开始拉取，元素才逐个流过整条管道。

验证惰性：

```rust
let v = vec![1, 2, 3];
let iter = v.iter().map(|x| {
    println!("map 处理 {x}");
    x * 2
});
println!("管道已建好，还没输出任何 map 行");
let sum: i32 = iter.sum();   // 此刻才逐个打印 1 2 3
println!("sum = {sum}");
```

讲解：把这条代码跑一遍，三个「map 处理」在 sum 调用时才出现——对照立即求值的写法会发生什么：如果 map 立即返回新 Vec，万级数据的中间结果会先完整分配再被下一步使用；惰性让每个元素「一次流过全管道」，内存占用 O(1)。

## 3. 适配器：filter / map / zip / chain

适配器返回新的迭代器，只描述不执行：

```rust
fn main() {
    let nums = vec![1, 2, 3, 4, 5, 6];

    let result: Vec<i32> = nums
        .iter()          // 创建迭代器（借用）
        .filter(|x| *x % 2 == 0)  // 过滤出偶数
        .map(|x| x * 10)          // 每个数乘 10
        .collect();               // 收集为 Vec
    println!("{result:?}");       // [20, 40, 60]
}
```

讲解：`filter` 接收闭包（注意 `*x` 解引用——`iter()` 吐出的是 `&i32`）、`map` 转换每个元素。链式调用没有中间 Vec 分配（零成本抽象），性能与手写循环相当。

两个高频组合器：

```rust
let names = vec!["订单A", "订单B"];
let amounts = vec![120, 88];

// zip：两条序列按位拉链成对
let pairs: Vec<(&str, i32)> = names.iter().zip(amounts.iter()).collect();
println!("{pairs:?}");   // [("订单A", 120), ("订单B", 88)]

// chain：两条序列首尾相接
let all: Vec<i32> = vec![1, 2].into_iter().chain(vec![3, 4]).collect();
println!("{all:?}");     // [1, 2, 3, 4]
```

讲解：`zip` 是「把两个数据源按位置配对」的标准解法（如给数据点配标签）；长度不齐时以短者为准。`chain` 用于合并同型数据流（如「历史记录 + 新增记录」一起处理）。两者都是适配器：不消耗元素，仍可继续链。

### 3.1 常用迭代器方法速查

| 方法 | 类别 | 作用 | 示例 |
| --- | --- | --- | --- |
| iter() | 入口 | 借用迭代 | `v.iter()` 得 `&i32` |
| into_iter() | 入口 | 消费迭代（取走元素） | `v.into_iter()` 得 `i32` |
| filter | 适配器 | 保留满足条件的 | `xs.filter(|x| *x > 0)` |
| map | 适配器 | 变换每个元素 | `xs.map(|x| x * 2)` |
| zip / chain | 适配器 | 配对 / 拼接 | `a.zip(b)` / `a.chain(b)` |
| take / skip | 适配器 | 取前 n 个 / 跳过 n 个 | `xs.take(3).skip(1)` |
| fold | 消费器 | 累加器归约 | `xs.fold(0, |acc, x| acc + x)` |
| collect | 消费器 | 收集为集合 | `xs.collect::<Vec<_>>()` |

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

讲解：闭包参数是 `&&i32` 时需双重解引用 `**x`（filter 的闭包参数是「迭代器元素的引用」的引用）；`take(5)` 在 filter 之后只取前 5 个。易错点：`.map(|x| x * x)` 这里能直接乘，是因为 map 的元素是 `&i32` 且自动解引用参与运算，而 filter 闭包拿到的是引用的引用——两类闭包签名不一致是新手最常见的编译错误来源，报错时先数引用层数。

## 4. 消费器：collect / sum / any / fold

消费器把迭代器「用完」，产出最终结果：

```rust
let nums = vec![1, 2, 3, 4, 5, 6];

// 聚合操作
let sum: i32 = nums.iter().sum();        // 21
let max = nums.iter().max().unwrap();    // 6
let any = nums.iter().any(|x| x > 5);    // true
println!("{sum} {max} {any}");

// fold：带初值的通用归约
let product = nums.iter().fold(1, |acc, x| acc * x);   // 720
```

讲解：

- `max()` 返回 `Option`（空迭代器无最值），所以 `.unwrap()` 或更好的 `unwrap_or(&0)`——消费器也遵守 Option 语义；
- `any`/`all` 是「存在性判断」：找到第一个满足的元素就短路停止，不会白白遍历完；
- `fold` 是最通用的归约：`sum`、计数、拼接本质上都是特化的 fold。读别人代码遇到 `fold`，先找初值再看累加闭包。

turbofish：`collect` 的目标类型由返回值推断，返回类型不明确时必须显式标注：

```rust
let v1: Vec<i32> = (0..5).collect();        // 类型写在变量上
let v2 = (0..5).collect::<Vec<i32>>();      // 或 turbofish 就地标注
let s = (0..5).collect::<String>();         // 数字字符串拼接
```

讲解：写成 `let v = (0..5).collect();` 会得到 cannot infer type 错误——编译器不知道你想要 Vec 还是 String 还是别的。两种写法等价，链很长时 turbofish 更贴近使用点。

## 5. 零成本抽象：为什么不比手写循环慢

迭代器链的「高层语法」不付运行时代价，依据有三：

- **单态化**：泛型的 Iterator 实现对每个具体类型生成专用机器码（见 [泛型](/rust/105-RustGenerics) 的单态化一节），没有虚函数分发；
- **内联**：filter/map 的闭包体小且被编译器内联进循环；
- **惰性流水**：无中间集合，元素一次流过全部阶段——手写循环能做到的，管道同样做到。

经验值：数值类管道（filter/map/sum）在 release 构建下与手写循环汇编级相当。对照其他语言会发生什么：动态语言里 map/filter 每层都是新数组 + 函数调用开销，所以「迭代器 = 慢」的直觉来自别处，在 Rust 不成立。例外要心里有数：`collect()` 到 Vec 再继续迭代会引入一次真实分配——管道中途不要随意 collect。

## 6. 闭包捕获与 move

```rust
let threshold = 50;
let big: Vec<_> = nums.iter()
    .filter(|x| **x > threshold)   // 闭包捕获外部变量 threshold（借用）
    .collect();
```

讲解：闭包可以捕获外层变量（默认按借用捕获）；需要拥有数据时加 `move` 关键字——这也是后续异步编程（Send 约束）的重要基础（完整机制见 [闭包与 Fn trait](/rust/110-RustClosuresFnTraits)）。迭代器场景的典型翻车：闭包借用了一个局部变量，而管道要被返回或发到别的线程——借用的数据活不到那么久，编译器报 lifetime/借用错误；解法就是把数据 `move` 进闭包或让管道在局部用完。

## 7. 三个工程场景

### 场景一：nginx 日志的 ERROR 行统计（扩写自本模块经典例）

真实背景：运维脚本要从 nginx access.log 里按状态码分类统计并找出最慢的 5 个请求。日志格式：`IP - - [时间] "请求" 状态码 字节 "来源" "UA" 耗时秒`：

```rust
use std::collections::HashMap;

#[derive(Debug)]
struct SlowReq<'a> {
    url: &'a str,
    cost_secs: f64,
}

fn analyze(log: &str) -> (HashMap<&str, usize>, Vec<SlowReq>) {
    let mut codes: HashMap<&str, usize> = HashMap::new();

    let mut slow: Vec<SlowReq> = log
        .lines()                                          // 迭代器入口：按行
        .filter(|l| l.contains("\" 5"))                   // 先粗筛 5xx 行
        .map(parse_line)                                  // 适配器：行 -> 结构体
        .filter(|r| r.cost_secs > 1.0)                    // 再筛慢请求
        .collect();                                       // 消费器：先收集
    slow.sort_by(|a, b| b.cost_secs.total_cmp(&a.cost_secs));
    slow.truncate(5);                                     // 取前 5

    for line in log.lines() {
        if let Some(code) = line.split_whitespace().nth(8) {
            *codes.entry(code).or_insert(0) += 1;
        }
    }
    (codes, slow)
}

fn parse_line(l: &str) -> SlowReq {
    // 真实解析见文件 IO 一篇的完整版；此处示意取 URL 与耗时
    let url = l.split('"').nth(1).unwrap_or("unknown");
    let cost = l.rsplit(' ').next().and_then(|c| c.trim_end_matches('"').parse().ok()).unwrap_or(0.0);
    SlowReq { url, cost_secs: cost }
}
```

讲解：同一份日志被**三种迭代器视角**消费——`filter+map+collect` 抽慢请求、`count()` 数行数、`for + entry` 计状态码；每个视角各自独立、意图清晰。对照手写三层循环嵌套会发生什么：状态码统计、行数、慢请求互相缠绕在同一个循环体里，改任何一个分支都要通读全函数。

### 场景二：购物车金额汇总

真实背景：电商结算页要汇总购物车：有效商品小计、优惠后总额、是否存在超库存商品——三个消费器各管一件事：

```rust
struct CartItem {
    name: String,
    price: f64,
    qty: u32,
    valid: bool,
}

fn checkout(items: &[CartItem]) -> (f64, bool) {
    let subtotal: f64 = items.iter()
        .filter(|it| it.valid)                  // 只算有效商品
        .map(|it| it.price * it.qty as f64)     // 小计
        .sum();                                 // 金额汇总

    let over_stock = items.iter()
        .any(|it| it.qty > 99);                 // 存在性判断，短路

    (subtotal, over_stock)
}

fn main() {
    let cart = vec![
        CartItem { name: "键盘".into(), price: 299.0, qty: 1, valid: true },
        CartItem { name: "鼠标".into(), price: 99.0, qty: 2, valid: true },
        CartItem { name: "下架商品".into(), price: 50.0, qty: 1, valid: false },
    ];
    let (total, over) = checkout(&cart);
    println!("应付 {total}，超库存：{over}");   // 应付 497，超库存：false
}
```

讲解：`filter -> map -> sum` 是金额类汇总的标准形状；`qty as f64` 是 u32 乘 f64 的必经转换（Rust 不做隐式数值转换）。易错点：金额用 f64 有精度风险，真实结算系统用整数分单位或定点库——此处示范结构，生产代码要换掉 f64。

### 场景三：CSV 行解析管道

真实背景：后台导入一份用户导出 CSV（`姓名,部门,工资`），要跳过表头、过滤空行、解析出工资并求部门平均——解析失败行单独落日志而不是中断：

```rust
#[derive(Debug)]
struct Row<'a> {
    name: &'a str,
    dept: &'a str,
    salary: u32,
}

fn parse_row(l: &str) -> Option<Row> {
    let mut it = l.split(',');
    let name = it.next()?;
    let dept = it.next()?;
    let salary = it.next()?.trim().parse().ok()?;
    Some(Row { name, dept, salary })
}

fn main() {
    let csv = "姓名,部门,工资\n张三,研发,20000\n李四,研发,24000\n王五,销售,15000\n\n赵六,销售,not-a-number";
    let rows: Vec<Row> = csv.lines()
        .skip(1)                    // 跳过表头
        .filter(|l| !l.trim().is_empty())
        .filter_map(parse_row)      // 解析失败的行被静默过滤
        .collect();

    let mut depts = std::collections::HashMap::new();
    for r in &rows {
        let e = depts.entry(r.dept).or_insert((0u64, 0u32));
        e.0 += r.salary as u64; e.1 += 1;
    }
    for (d, (sum, n)) in &depts {
        println!("{d}: 平均 {}", sum / *n as u64);
    }
}
```

讲解：`filter_map` = 「转换并允许失败」的合体：闭包返回 `Option<T>`，None 被丢弃——坏行自动出局，好行直接进入下游；`parse_row` 用 `?` 在 Option 上传播「缺字段/解析失败」（Option 上的 `?` 见枚举与模式匹配篇）。易错点：`filter_map` 会**吞掉失败原因**，需要日志时改用 `map(...).partition(...)` 把成败分桶，或在外层先记录再过滤。

## 8. 动手实践

**任务一：把日志统计改成纯迭代器（约 15 分钟）**

把场景一里「状态码统计」的 for + entry 循环改写成不含 for 的迭代器管道（提示：`fold` 以 HashMap 为累加器初值）。

**任务二：两列数据配对（约 10 分钟）**

给定学生名单与成绩两个 Vec（长度可能不齐），产出「姓名-成绩」字符串 Vec，格式 `张三: 95`，多出的名字忽略。

**任务三：分页与去重（约 15 分钟）**

给定一列带重复的访问记录（只含用户 id），写函数返回「第 2 页（每页 3 条）去重后的用户 id 列表」。只允许迭代器方法，不允许手写循环与中间去重 Set。

参考实现（先自己写完再展开对照）：

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

任务一：

```rust
let codes = log.lines().filter_map(|l| l.split_whitespace().nth(8))
    .fold(HashMap::new(), |mut acc, code| {
        *acc.entry(code).or_insert(0) += 1;
        acc
    });
```

要点：fold 的初值是空 HashMap，闭包里改完 `acc` 要**返回它**（漏写 acc 是 fold 最常见错误）；对照 entry 版 for 循环，两者性能等价，可读性看团队习惯——本任务的意义是体会 fold 的通用归约能力。

任务二：

```rust
let pairs: Vec<String> = names.iter().zip(scores.iter())
    .map(|(n, s)| format!("{n}: {s}"))
    .collect();
```

要点：zip 以短者为准正好满足「多出的名字忽略」；解构模式 `|(n, s)|` 在 map 闭包里直接拆元组。写成先 `zip` 再 `collect::<Vec<_>>()` 再 for 拼接会用掉一次中间分配。

任务三：

```rust
fn page2_dedup(ids: &[u32]) -> Vec<u32> {
    let mut seen = std::collections::HashSet::new();
    ids.iter()
        .filter(|id| seen.insert(**id))   // insert 返回 false 表示已存在
        .skip(3)                          // 跳过第 1 页
        .take(3)                          // 取第 2 页
        .copied()
        .collect()
}
```

要点：`HashSet::insert` 返回 `bool`（是否新插入），借它实现流式去重——不需要先把 ids 收进 Set；`skip(3).take(3)` 的顺序就是「第 2 页」的语义；`copied()` 把 `&u32` 变 `u32` 供 collect 出 owned Vec。注意这里 seen 在迭代器闭包外定义、被闭包可变借用——同一个迭代器只被消费一次所以合法，若想复用管道就编译不过（借用规则在起作用）。

</details>

## 与之前和之后的知识的关系

- 往前：集合提供迭代器入口（`Vec::iter`、`HashMap::iter`），Option 语义贯穿 `next()` 与 `max()`；
- 往后：闭包的三种 Fn trait（110 篇）决定适配器闭包能不能被多次调用；文件 IO 篇的 `lines()` 让本篇管道直接跑在真实数据源上；泛型篇解释适配器为什么全是泛型结构体。

## 小结

迭代器把「怎么遍历」封进 `next()` 契约，把「做什么」留给适配器链；惰性求值让元素一次流过全管道、内存 O(1)；消费器收尾产出结果，`collect` 的类型推断卡壳时上 turbofish；零成本抽象由单态化、内联与流水线三件事保证。一句话记忆：**适配器画图纸（filter/map/zip/chain），消费器盖楼（collect/sum/fold/any），中间不 collect**。

> **一句话记忆**：数据处理用迭代器链（`filter` → `map` → `collect`），声明式、零分配、性能与手写循环相当。
