---
order: 60
title: 所有权与借用
module: 'rust'
category: 后端技术
difficulty: beginner
description: Rust 核心机制：所有权规则、移动与复制、借用与引用、切片、生命周期与内存安全
author: fanquanpp
updated: '2026-10-07'
related:
  - 'rust/040-RustBasicSyntax'
  - 'rust/060-RustBorrowCheckerErrorGuide'
  - 'rust/070-RustStructAndImpl'
  - 'rust/100-RustGenericTrait'
  - 'rust/180-RustLifetimesDeepDive'
prerequisites:
  - 'rust/040-RustBasicSyntax'
---

## 知识点地图

- **知识类别**：所有权系统——所有权三规则、移动与复制、借用与引用、切片、生命周期入门。
- **解决什么问题**：Rust 与其他语言的根本差异「没有 GC 也没有手动释放，内存怎么管」；`use of moved value`、`cannot borrow as mutable` 这些拦路报错的机理。
- **什么时候用到**：写第一行 Rust 之前建立心智模型；之后每个报错都要回到这里的规则上找答案——本篇是全模块最重要的一篇。

**分界声明**：本篇第 6 节是生命周期的**入门**（为什么需要、编译器怎么想）；标注语法 `'a` 的完整规则、结构体上的生命周期、多参数推断见《生命周期深入》（rust/180-RustLifetimesDeepDive）——看懂报错提示里的 `'a` 迷惑时直接去 180。

## 前置知识

- [Rust 基础语法](/rust/040-RustBasicSyntax)：变量、函数与控制流；知道 String 是堆上数据即可。

## 学习目标

读完本文你将能够：

1. 背下所有权三规则，解释 `let s2 = s1` 之后 s1 为什么失效；
2. 分清 Copy 与 Move 的判断标准，知道哪些类型赋值后原变量仍可用；
3. 会用 `&T` 与 `&mut T` 借用，理解「多读单写」约束如何在编译期消灭数据竞争；
4. 会用切片（`&str`/`&[T]`）编写通用函数参数，理解为什么参数优先写 `&str` 而非 `&String`；
5. 对照常见错误表，读懂 use of moved value、cannot borrow as mutable 等最高频报错并知道修复套路。

预计 90 分钟，本篇是全模块最重要的一篇，值得反复练习。

## 1. 从"图书馆借书"说起：为什么需要所有权

### 1.1 内存管理的三难问题

任何语言都要回答一个问题：**谁负责内存的分配与释放？** 三种流派各有取舍：

| 流派 | 代表语言 | 机制 | 问题 |
| :--- | :--- | :--- | :--- |
| 手动管理 | C/C++ | 程序员 malloc/free | 悬垂指针、double-free、内存泄漏 |
| 垃圾回收 | Java/Go/Python | 运行时 GC | 停顿、内存开销 |
| **所有权** | **Rust** | **编译期静态检查** | 学习曲线陡 |

**Rust 选择了第三条路：所有权（Ownership）**——在**编译期**确定每个值的生命周期，既无 GC 停顿、也无手动释放，安全且零开销。

### 1.2 图书馆的类比

想象图书馆的管理规则：

- **每本书只有一个"借书人"**（值有且只有一个所有者）
- 借书人**离开图书馆时**必须把书放回（所有者离开作用域，值自动释放）
- 借书人**可以把书转借给另一个人**，转借后原借书人失去资格（所有权转移）

Rust 的所有权系统就是这套"图书馆规则"：编译器像一个严格的图书管理员，在代码编译时逐行检查"谁在管理这本书"，任何违规（比如两个人都声称拥有这本书）直接拒绝编译。

**Rust 的承诺**：所有内存错误（空指针、悬垂引用、数据竞争、缓冲区溢出）在**编译期**就被拒绝——不是"尽量安全"，而是"编译不过"。

## 2. 所有权三规则

**规则一**：每个值有且只有一个所有者（owner）变量。

**规则二**：所有者离开作用域时，值被自动释放（drop）。

**规则三**：值可以被转移（move）给新的所有者，旧所有者随即失效。

```rust
fn main() {
    let s = String::from("hello"); // s 是 String 的所有者
    println!("{}", s.len());
} // 此处 s 离开作用域，String 的内存自动释放
```

**解读**：

- `String::from` 在堆上分配内存，`s` 持有它的所有权
- 无需手动 `free`——离开作用域即析构（Rust 自动调用 drop）
- 栈上的整数等类型同样适用此规则，只是释放成本趋近于零

**关键认知**：Rust 没有 GC，内存释放靠"所有者离开作用域"这个可预测的时机。这就是为什么 Rust 能做到"零开销抽象"。

## 3. 移动（Move）与复制（Copy）

### 3.1 移动语义

```rust
let s1 = String::from("hello");
let s2 = s1;              // 所有权转移（move）
// println!("{s1}");      // 错误：s1 已失效
println!("{s2}");         // 正常
```

**为什么不能再用 s1**：`let s2 = s1` 没有深拷贝堆数据，只是把"指针+长度+容量"这三块栈数据转移给 s2，并让 s1 失效。

**这避免了两个严重问题**：

1. **double-free**：如果 s1、s2 都有效，离开作用域时同一块内存会被释放两次（崩溃）
2. **悬垂指针**：如果 s1 先被释放，s2 就成了悬垂引用

**代价是零**：转移只是拷贝几个字节的栈数据，堆数据原封不动。而编译器会阻止继续使用 s1——**移动不是隐藏的深拷贝，而是所有权转移**。

### 3.2 Copy 类型

像整数、布尔、浮点这样的"纯栈上数据"，赋值是**按位复制**，不会移动：

```rust
let a = 5;
let b = a;   // a 仍然可用，因为 i32 实现了 Copy
println!("{a} {b}"); // 输出 5 5
```

**Copy 与 Move 的判断标准**：

- **实现了 `Copy` trait 的类型**（标量、元组内全 Copy、`&T` 引用）：赋值即复制，原变量仍可用
- **`String`、`Vec` 等堆类型**：实现的是 `Move`，赋值后原变量失效

> **规则**：实现 Copy 的类型赋值后原变量仍可用，否则原变量失效。`String` 不能实现 Copy，因为深拷贝代价高；移动则是零成本的"改名"。

### 3.3 函数传参与返回

```rust
fn take(s: String) { /* 消耗传入的所有权 */ }
fn give() -> String { String::from("new") }

fn main() {
    let s = String::from("x");
    take(s);            // s 的所有权被函数消耗
    // println!("{s}"); // 错误：s 已 move 进函数

    let t = give();     // 返回值转移所有权给 t
}
```

**模式**：把所有权交给函数（消耗）、让函数返回所有权（产出），是 Rust 管理资源的基本节奏。但每次都这样传来传去很繁琐——**借用**就是为此而生。

## 4. 借用与引用

### 4.1 不可变引用：只借不拿

不想转移所有权、只想"借来看看"，用引用 `&T`：

```rust
fn calc_len(s: &String) -> usize {
    s.len()          // 只读访问，不获取所有权
}

fn main() {
    let s = String::from("hello");
    let len = calc_len(&s);
    println!("{len}");       // s 仍可用
}
```

**解读**：`&s` 创建不可变引用（借用），借出期间原所有者不受影响，借完自动归还。可以同时存在**多个**不可变引用（多个读者同时看书没问题）。

### 4.2 可变引用：独占借用

```rust
fn push_hello(s: &mut String) {
    s.push_str(", world");
}

fn main() {
    let mut s = String::from("hello");
    push_hello(&mut s);
    println!("{s}");
}
```

**核心约束（Rust 内存安全的关键）**：

> **同一时刻，一个值要么有多个不可变借用，要么只有一个可变借用。二者不可同时存在。**

```rust
let mut s = String::from("hi");
let r1 = &s;          // 不可变借用，可以
let r2 = &s;          // 多个不可变借用，可以（读读不冲突）
let r3 = &mut s;      // 错误：已有不可变借用时不能再创建可变借用
```

**这条规则在编译期消灭了数据竞争**：

- 数据竞争 = 多个线程同时读写同一内存
- Rust 规则：写（可变借用）必须独占，读（不可变借用）可以并行
- 无论单线程还是多线程，这条规则都成立——**数据竞争在编译期就被拒绝**

### 4.3 借用作用域（NLL）

```rust
let mut s = String::from("hi");
let r = &s;              // r 的借用开始
println!("{r}");         // 最后一次使用 r
let m = &mut s;          // 此时 r 已不再使用，可以创建可变借用
m.push_str("!");
```

**借用结束于最后一次使用（NLL，非词法生命周期）**。上例中 r 打印后就不再被使用，可变借用随后合法。

**实用技巧**：借用冲突时，通常可以"缩小借用作用域"解决——把借用的使用范围控制在最小区域，让借用尽早结束。

## 5. 切片（Slice）：数据的"窗口视图"

切片是对连续数据的一段**借用**视图，无所有权。字符串切片 `&str` 是最常见的：

```rust
let s = String::from("hello world");
let hello = &s[0..5];     // "hello"
let world = &s[6..];      // "world"（6 到末尾）
println!("{hello} {world}");
```

**注意（字节 vs 字符）**：切片范围是**字节索引**。中文字符占 3 字节，按字节切可能 panic（多字节边界需谨慎）。处理中文建议用 `.chars()` 迭代。

字符串字面量本身就是 `&str`：

```rust
let greeting: &str = "你好";  // "你好" 是编译期内置的 &str
```

数组切片：

```rust
let arr = [1, 2, 3, 4, 5];
let mid = &arr[1..4];       // [2, 3, 4]，类型 &[i32]
for v in mid {
    println!("{v}");
}
```

### 5.1 参数用切片而非引用（重要最佳实践）

**函数接收参数时优先用切片而非 `&String`/`&Vec`**，因为 `&str`/`&[T]` 能同时接收字面量、String、数组，通用性更强：

```rust
fn first_word(s: &str) -> &str {
    match s.find(' ') {
        Some(i) => &s[..i],
        None => s,
    }
}

fn main() {
    let s = String::from("hello world");
    println!("{}", first_word(&s));      // 传 &String 可自动转为 &str
    println!("{}", first_word("hi ok")); // 直接传字面量
}
```

**为什么参数写 `&str` 最灵活**：

- `&String` 可自动强转为 `&str`（deref coercion）
- 字面量、`&String`、`&Vec` 都能传给 `&str` 参数
- 返回的切片生命周期与输入绑定，保证不会悬垂

## 6. 生命周期：编译器怎么知道"引用还活着"

### 6.1 为什么要生命周期标注

引用必须保证"被引用的值还活着"。多数时候编译器能自动推断（NLL），但某些情况下需要显式标注：

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

**解读**：

- `'a` 是一个**生命周期参数**，声明"x、y、返回值共享同一个生命周期"
- 含义：返回值的存活时间，不会超过 x 和 y 中较短的
- 编译器用这个约束检查调用点：**如果返回值在某个参数失效后还在用，编译失败**

### 6.2 三种常见模式

| 模式 | 写法 | 场景 |
| :--- | :--- | :--- |
| 省略（自动） | `fn f(x: &str) -> &str` | 单个输入引用，返回其引用 |
| 多个输入需标注 | `fn f<'a>(x: &'a str, y: &'a str) -> &'a str` | 多个引用，需关联 |
| 结构体含引用 | `struct S<'a> { s: &'a str }` | 结构体持有引用 |

**实用建议**：生命周期标注是"编译器需要帮助时的工具"。90% 的代码用**省略规则**自动推断；只有返回引用且涉及多个输入时，才需要显式标注。不必一开始就掌握全部细节，先理解"生命周期防止悬垂引用"这个核心思想即可。标注语法的完整规则（多参数推断、结构体与 impl 上的 `'a`、`'static`）见《生命周期深入》（rust/180-RustLifetimesDeepDive）。

### 6.3 三个工程场景里的借用形态

**场景一：配置读取（只读借用的典型）**。服务启动后配置对象被所有模块共用：

```rust
struct Config { db_url: String, port: u16 }

fn init_logger(cfg: &Config) { /* 读 cfg.port，只借不拿 */ }
fn connect_db(cfg: &Config) -> Db { /* 读 cfg.db_url */ }

fn main() {
    let cfg = load_config();
    init_logger(&cfg);          // 不可变借用：借用结束 cfg 归位
    let db = connect_db(&cfg);  // 多个不可变借用可并存
    // cfg 仍归 main 所有，退出时才释放——共享只读数据的标准形态
}
```

为什么全部用 `&Config` 而不是传值：`Config` 移动进函数后 main 就用不了了（move 规则），clone 又白拷一份大字符串——「多处只读」正是不可变借用的主场。

**场景二：日志切片（切片借用的典型）**。从大日志行里截取时间戳做统计，不拷贝原行：

```rust
fn extract_ts(line: &str) -> &str {
    &line[..19]                 // "2026-10-07 12:01:33" 的前 19 字符
}

fn main() {
    let log_line = read_line(); // 可能几 KB
    let ts = extract_ts(&log_line);
    stats.record(ts);           // 切片借的还是 log_line 的内存，零拷贝
}                               // log_line 在此释放，ts 已先用完——借用检查保证这个顺序
```

如果 `extract_ts` 返回 `String`（拷贝出来），百万行日志的统计就多一百万次分配——切片的存在意义就是「窗口视图」这份零拷贝。

**场景三：缓存句柄（可变借用独占性的典型）**。热点缓存的单线程刷新：

```rust
struct Cache { data: Vec<String> }

impl Cache {
    fn refresh(&mut self) { /* 重算 data */ }
    fn get(&self, k: &str) -> Option<&String> { self.data.iter().find(|s| s == k) }
}

fn main() {
    let mut cache = Cache { data: load() };
    let hit = cache.get("song:42");   // 不可变借用开始
    // cache.refresh();               // 编译错误：可变借用与未结束的不可变借用冲突
    println!("{hit:?}");
    cache.refresh();                  // hit 已用完，借用结束，刷新合法
}
```

「拿着读引用时不能写」编译器在拦什么：refresh 可能重分配 data，hit 会指向被释放的旧内存——第 8 节报错表第二条的机理就藏在每个缓存刷新里。多线程版本的同一问题（多读单写跨线程）交给并发篇的 Mutex/RwLock。

## 7. 综合示例：统计单词数

```rust
fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

fn main() {
    let text = String::from("Rust ownership is safe");
    println!("{}", count_words(&text)); // 输出 4
    println!("{}", count_words("你好 Rust")); // 输出 2
}
```

**解读**：全程只借用不拷贝；`split_whitespace` 返回迭代器直接数个数，零分配。所有权系统的收益在此体现：简洁、安全、无 GC、无手动释放。

## 8. 常见错误与对策

| 编译错误 | 原因 | 对策 |
| :--- | :--- | :--- |
| use of moved value | 使用了已转移所有权的变量 | 改用引用传参，或 clone 一份 |
| cannot borrow as mutable | 同时存在不可变与可变借用 | 缩小借用作用域，或调整借用顺序 |
| cannot move out of borrowed content | 尝试从借用中拿走所有权 | 用 clone 或返回引用 |
| temporary value dropped | 引用指向了临时值 | 用变量持有临时值再借用 |
| lifetime may not live long enough | 返回值可能悬垂 | 检查返回值是否关联输入的生命周期 |

**通用调试手段**：

1. 遇到借用错误时，按编译器提示信息（E0502/E0505 等）逐条阅读
2. rust-analyzer 会标注问题行
3. 必要时用 `clone()` 快速通过，再回头优化为引用
4. **先编译通过，再优化借用**——编译器是最好的老师，它的提示几乎总是指向正确方向

## 9. 动手实践：所有权直觉的三级训练

所有权不是「读懂」的，是「判对」的——真正掌握的标志是看到代码就能预测编译器的裁决。以下三个任务按梯度设计，合计约 60 分钟，每个都要求**先写预测、再验证**：先在纸上标出你认为编译不过的行，再让编译器裁决，对比预测与结果的差距。预测准确率的变化，就是所有权直觉生长的速度。

**任务一：当一次编译器（约 15 分钟）**

逐段判断下面代码中每个标注点能否通过编译，写出你的理由（用了哪条规则），然后放进 `fn main()` 里实际验证：

```rust
let s1 = String::from("concert");
let s2 = s1;                       // (a) 这行之后 s1 还能用吗？
let n1 = 7;
let n2 = n1;                       // (b) 这行之后 n1 还能用吗？
let r1 = &s2;                      // (c) 合法吗？
let r2 = &s2;
println!("{r1} {r2}");             // (d) 两个不可变借用共存，行吗？
let m1 = &mut s2;                  // (e) 此时合法吗？
m1.push_str(" hall");
println!("{r1}");                  // (f) r1 还能再用吗？
```

提示：判断顺序是先问类型（Copy 还是 Move），再问借用（读读共存、读写互斥），最后问时机（NLL——最后一次使用之后借用即结束）。参考答案：b 处 n1 可用（i32 是 Copy）；报错发生在 e——注意根因却不在 e：e 处创建 `&mut` 时 r1、r2 的「最近一次使用」已经过去，单看 e 似乎合法，但 f 处 r1 还要再用，r1 的借用被拉长到覆盖 e，与独占借用在时间轴上重叠，于是编译器在 e 处拒绝、并在 f 处标注「不可变借用之后还在被使用」。把 f 那行删掉再编译，e 就合法了——这个「报错在 e、根因在 f」的错位正是 NLL 的精髓，亲手删一次加深理解。

**任务二：修复一段真实的借用冲突（约 20 分钟）**

下面这段统计与修改歌单的代码编译不过。先跑一次记录完整报错，然后**不使用 clone**，用「缩小借用作用域」思路修复：

```rust
fn main() {
    let mut playlist = vec![String::from("Meltdown"), String::from("Melt")];
    let first = &playlist[0];
    playlist.push(String::from("Tell Your World")); // E0502 在这里
    println!("first: {first}");
}
```

提示：报错根因是 push 可能触发 Vec 扩容重分配，让 first 这个引用悬垂——编译器拦的是真实危险。修复方向有两个：把 `println!` 挪到 push 之前（让借用先结束）；或者先取出一份需要的数据（`let first_len = playlist[0].len();`——usize 是 Copy，不带借用），再修改集合。两种都写出来，比较各自适用的场景。参考检查点：能向别人解释「为什么 push 会威胁已有的引用」，而不是只记住「换下顺序就好了」。

**任务三：把函数签名改成切片风格（约 25 分钟）**

写三个函数并统一改造签名：`count_chars(s: String) -> usize`（返回字符数）、`shout(s: &String) -> String`（返回追加感叹号的副本）、`longer(a: String, b: String) -> String`（返回较长的那个）。要求：调用方在调用后仍能继续使用自己的 String（提示：全部改为借用或切片参数，`&str` 为宜），longer 返回的引用要能通过生命周期检查（提示：两个输入返回其一，需要 `'a` 标注，对照第 6 节）。

写完后在 main 里用三种实参各调用一次：String 变量、字符串字面量、`&s[0..4]` 切片。参考检查点：三个签名都应为 `&str` 参数；能说出为什么 `&str` 参数三种实参都能接（deref 强转 + 字面量本身就是 &str）；longer 的返回值生命周期与较短的那个输入绑定，main 里在两个 String 都存活期间使用返回值即可编译。

三个任务做完，把每个任务中「预测错误」的那几条规则抄在笔记首页——那是你直觉里最薄的地方，下一篇《借用检查器报错实战》会对着它们逐个补强。

## 10. 小结

所有权三规则（每值一主、主离即释、可转不移）+ 借用两条约束（不可变可并行、可变要独占）+ 切片视图（零拷贝的窗口）+ 生命周期（防止悬垂），构成了 Rust 内存安全的地基。

理解"移动 vs 复制""借用 vs 拥有"两组对立概念，就能读懂编译器的大部分报错——**Rust 编译器不是敌人，而是全天候的导师**。下一步学习结构体与枚举模式匹配（见《结构体与方法》与《枚举与模式匹配》），把这些机制组合成真实的数据结构。

> **一句话记忆**：Rust 用"所有权"替代"手动管理/GC"——每个值一个主人、主人离开作用域自动释放、转移所有权后旧主人失效；借用让"只借不拿"（`&T` 可多个，`&mut T` 要独占）成为可能，编译期就消灭了悬垂引用与数据竞争。

## 参考与致谢

- The Rust Book（官方教程）第 4 章 Understanding Ownership：<https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html>（CC-BY-SA 4.0），所有权三规则、借用约束与切片的权威出处；
- 本篇正文为教学重写；第 6.3 节三个工程场景（配置读取、日志切片、缓存句柄）为本模块自写案例，生命周期深入与 180 号的分界见知识点地图。
