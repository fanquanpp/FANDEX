---
order: 90
title: 枚举与模式匹配
module: 'rust'
category: 后端技术
difficulty: beginner
description: 枚举定义与变体携带数据、match 穷尽匹配与解构守卫、if let/while let、Option 可空值与枚举状态机
author: fanquanpp
updated: '2026-10-07'
related:
  - 'rust/070-RustStructAndImpl'
  - 'rust/080-RustErrorHandling'
prerequisites:
  - 'rust/070-RustStructAndImpl'
---

## 知识点地图

- **知识类别**：数据建模中的「多态状态」表达——枚举（enum）、模式匹配（match / if let / while let）与可空值（Option）。与上一篇的结构体配对：结构体把多个字段合成一个整体，枚举把多种可能形态收进一个类型。
- **解决什么问题**：订单有「待支付、已支付、已发货、已完成」四种状态，每种状态携带不同的数据（流水号、物流单号）；除法可能失败但结果可能是任何数——用继承体系或 null 都会让非法状态在运行时才暴露。枚举 + match 让「漏处理一种形态」变成编译错误。
- **什么时候用到**：任何「一个东西有几种形态」的建模场景（状态机、消息类型、解析结果）；任何「可能没有值」的返回值（查找、解析、弹出）；Rust 里几乎每个函数签名都要做这个决定。
- **本篇不讲**：Result 与 `?` 错误传播（见 [错误处理](/rust/080-RustErrorHandling)）；泛型 enum 的自定义（`Option`/`Result` 已覆盖日常所需）。

## 学习目标

读完本文你将能够：

1. 定义携带不同数据的枚举变体，并用 match 统一解构处理；
2. 用区间、通配符、绑定、守卫写出精确的模式；解释「穷尽性检查」为什么是编译期保障；
3. 用 `if let` / `while let` 简化单分支与循环匹配；
4. 用 `Option<T>` 表达可空值，掌握 `unwrap_or`、`map` 等常用方法，理解 Rust 为什么没有 null；
5. 用「枚举 + match」实现一个非法状态无法表示的订单状态机。

预计 60 分钟。

## 1. 你现在要解决什么问题

先看一个用「魔法数字 + 字符串」建模订单状态的翻车现场（任何语言里都常见）：

```rust
// 反面教材：状态用 u8 表示，附加数据散落在旁
struct Order {
    status: u8,        // 0=待支付 1=已支付 2=已发货 3=完成
    pay_id: Option<u32>,   // 只有 status==1 时有意义
    tracking: Option<String>, // 只有 status==2 时有意义
}
```

问题立刻出现：`status = 1` 时 `tracking` 应该是什么？编译器不知道，注释也拦不住有人读它。**非法状态在类型系统里是合法的**，于是防御代码撒得到处都是。枚举的解法是把「状态」与「该状态下才存在的数据」绑成一个类型，让非法状态**无法被构造出来**——这正是本篇要建立的心智模型。

## 2. 枚举：一个类型承载多种形态

### 2.1 最简单的枚举

枚举把"多种可能的状态"表达为一种类型：

```rust
enum Direction {
    North,
    South,
    East,
    West,
}

fn describe(d: Direction) -> &'static str {
    match d {
        Direction::North => "北",
        Direction::South => "南",
        Direction::East => "东",
        Direction::West => "西",
    }
}
```

讲解：变体挂在枚举名下（`Direction::North`），四种取值互斥且**必须有且只有一种**。`describe` 的 match 少写任何一个变体，编译器直接拒绝编译——这就是 1 节反面教材梦寐以求的保障。

### 2.2 变体携带数据：代数数据类型的威力

枚举变体可以携带数据，这是 Rust 枚举（代数数据类型 ADT）的核心：

```rust
enum Shape {
    Circle(f64),                    // 元组变体：半径
    Rectangle { w: f64, h: f64 },   // 结构体变体：命名字段
    Empty,                          // 单元变体：无数据
}

fn area(s: Shape) -> f64 {
    match s {
        Shape::Circle(r) => 3.14159 * r * r,
        Shape::Rectangle { w, h } => w * h,
        Shape::Empty => 0.0,
    }
}
```

讲解：

- 元组变体适合「单一数据」，结构体变体适合「多个命名字段」，单元变体是纯标记——三种形态覆盖建模所需；
- match 时直接解构：`Circle(r)` 把半径绑定为 `r`，`Rectangle { w, h }` 把命名字段绑定为 `w`、`h`——「取数据」与「分支」一步完成；
- 对比继承体系的写法会发生什么：OOP 里要一个抽象基类 + 三个子类 + 虚方法，编译器不知道「还有没有第四种子类」，调用方永远要防未知类型；枚举是封闭集合，穷尽检查成为可能。

易错点：变体携带的是**数据本身的所有权**。`Shape::Circle` 拿着 `f64` 无所谓（Copy），但若变体里放 `String`，match 按值移动会把它搬走——需要继续使用时匹配引用 `&s` 或在分支里只读借用（借用规则回顾见 [所有权与借用](/rust/050-RustOwnershipBorrowing)）。

## 3. match：穷尽性与模式

### 3.1 穷尽匹配与通配

`match` 是 Rust 的控制流之王：按模式逐个尝试分支，**必须穷尽所有可能**。

```rust
fn classify(n: i32) -> &'static str {
    match n {
        0 => "零",
        1..=9 => "个位数",
        10..=99 => "两位数",
        _ => "大数",      // _ 通配符兜底
    }
}
```

讲解：数值字面量、区间 `..=`、通配符 `_` 都可作为模式。`_` 兜底让 match 不必列出全部情况；若不加兜底则必须穷尽。注意语义差别：`_` 表示「其余任何值」，对枚举匹配时优先写全变体再考虑 `_`——枚举日后新增变体时，写全的 match 会编译报错提醒你处理新情况，写 `_` 的 match 则静默吞掉。

### 3.2 解构组合数据

match 可以解构组合数据并绑定变量：

```rust
let pair = (10, "ok");
match pair {
    (0, msg) => println!("第一个是零，消息：{msg}"),
    (n, "ok") => println!("消息是 ok，数值 {n}"),
    (n, msg) => println!("其他：{n} {msg}"),
}
```

讲解：解构的同时绑定字段；`_` 可以出现在子位置忽略某字段：`(_, msg)`。分支按书写顺序尝试，`(0, msg)` 在 `(n, "ok")` 之前——若值为 `(0, "ok")` 命中的是第一个分支，排错时要记得顺序敏感。

### 3.3 守卫与 @ 绑定：模式的精修

模式后面可以加 `if` 守卫做进一步过滤；`@` 在绑定变量的同时继续测试它的值：

```rust
let age = 20;
match age {
    n @ 0..=17 => println!("未成年，{n} 岁"),
    n @ 18..=59 => println!("劳动年龄，{n} 岁"),
    n => println!("退休区间，{n} 岁"),
}

let code = 451;
match code {
    c if c >= 500 => println!("服务端错误 {c}"),
    c if c >= 400 => println!("客户端错误 {c}"),
    c if c >= 300 => println!("重定向 {c}"),
    _ => println!("其他 {code}"),
}
```

讲解：守卫 `if` 在模式命中后追加条件，不满足则继续尝试下一分支；`n @ 0..=17` 同时完成「测试在区间内」与「绑定值到 n」两件事，没有 `@` 就得在分支体内再判一次。易错点：守卫里不能用模式本身（`n @ 0..=17 if n % 2 == 0` 合法，但守卫条件里不能再写模式），且带守卫的分支不参与穷尽性判定——枚举匹配里 `V if cond` 之后仍要兜底。

## 4. if let 与 while let：只关心一种形态时

### 4.1 if let 简化

只关心一个分支时用 `if let` 更简洁：

```rust
let config = Some("debug");
if let Some(v) = config {
    println!("配置值：{v}");
} else {
    println!("无配置");
}
```

讲解：等价于只有一个分支的 match；`else` 可选。取舍标准：**两个以上分支用 match，只关心一个形态用 if let**——强行用 if let 链模拟多分支（`else if let ... else if let ...`）会失去穷尽性检查，新增枚举变体时编译器不再提醒。

### 4.2 while let 循环匹配

`while let` 用于「只要还是这个形态就一直做」的循环：

```rust
let mut stack = vec![1, 2, 3];
while let Some(top) = stack.pop() {
    println!("弹出 {top}");
}
// stack 弹空后 pop() 返回 None，循环自然结束
```

讲解：`stack.pop()` 返回 `Option<T>`（空栈为 None），`while let Some(top)` 把「判空 + 取值 + 循环」合并成一行。换成 match 写法会发生什么：要手写 `loop { match ... None => break }` 三件套，意图反而模糊。

## 5. Option：可空值的正确姿势

Rust 没有 null。可空值用 `Option<T>` 枚举表达：

```rust
enum Option<T> {
    Some(T),   // 有值
    None,      // 无值
}

fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 { None } else { Some(a / b) }
}

fn main() {
    match divide(10.0, 2.0) {
        Some(v) => println!("结果：{v}"),
        None => println!("除数为零"),
    }
}
```

讲解：`Option<T>` 是标准库枚举，`Some`/`None` 可直接使用（prelude 自动导入）。编译器强制你处理 None 分支——**不存在空指针解引用**，因为空值必须显式处理。这就是文章开头反面教材里 `pay_id: Option<u32>` 的正确读法：它的类型本身宣告了「这里可能没有值，你必须表态」。

Option 的常用方法：

| 方法 | 作用 | 示例 |
| --- | --- | --- |
| unwrap() | 取出值，None 则 panic | `x.unwrap()` |
| unwrap_or(default) | None 时用默认值 | `x.unwrap_or(0)` |
| unwrap_or_else(f) | None 时调用闭包取默认 | `x.unwrap_or_else(compute_default)` |
| map(f) | 对 Some 内值做转换 | `x.map(|v| v * 2)` |
| is_some() / is_none() | 判断 | `x.is_some()` |

```rust
let a = Some(10);
let b: Option<i32> = None;
println!("{}", a.unwrap_or(0));      // 10
println!("{}", b.unwrap_or(0));      // 0
println!("{}", b.map(|v| v * 2).is_none()); // true
```

讲解：生产代码慎用 `unwrap()`（会 panic），先用 `unwrap_or` 或 match 显式处理；默认值构造有成本时用 `unwrap_or_else`（None 时才执行闭包）；`?` 运算符在错误处理一篇中讲解。

## 6. 综合示例：订单状态机

```rust
#[derive(Debug)]
enum OrderState {
    Pending,
    Paid(u32),          // 已支付，记录支付流水号
    Shipped(String),    // 已发货，记录物流单号
    Done,
}

fn next_state(s: OrderState) -> OrderState {
    match s {
        OrderState::Pending => OrderState::Paid(1001),
        OrderState::Paid(id) => OrderState::Shipped(format!("SF{id}")),
        OrderState::Shipped(_) => OrderState::Done,
        OrderState::Done => OrderState::Done, // 终态
    }
}

fn main() {
    let mut state = OrderState::Pending;
    for _ in 0..3 {
        state = next_state(state);
        println!("{state:?}");
    }
}
```

逐段讲解：

- 每个「状态 + 该状态才有的数据」构成一个变体：`Paid(u32)` 只在已支付时有流水号——第 1 节反面教材里「status 与 pay_id 各自漂移」的问题被类型消灭；
- `next_state` 的签名是 `OrderState -> OrderState`：**输入已消费、输出新状态**，状态的转移天然单向；想保留旧状态做日志，传引用 `&OrderState` 并让分支返回新值即可；
- 非法迁移（如从 Done 跳回 Paid）在类型上仍然可表达，穷尽 match 保证的是「每个现有状态都有处理」，迁移合法性需要函数自身逻辑或类型状态（typestate）模式进一步约束——枚举状态机的边界要心里有数。

## 7. 三个工程场景

### 场景一：HTTP 状态分类（真实工程）

真实背景：网关服务要对上游响应码分类埋点（2xx 成功、4xx 客户端错、5xx 服务端错、其他），分类结果还要供重试策略使用——这是枚举 + match + 守卫的标准组合：

```rust
#[derive(Debug, PartialEq)]
enum RespClass {
    Success(u16),
    ClientError(u16),
    ServerError(u16),
    Other(u16),
}

fn classify_status(code: u16) -> RespClass {
    match code {
        200..=299 => RespClass::Success(code),
        400..=499 => RespClass::ClientError(code),
        500..=599 => RespClass::ServerError(code),
        c => RespClass::Other(c),
    }
}

fn retryable(c: &RespClass) -> bool {
    match c {
        RespClass::ServerError(503) => true,   // 服务过载，值得重试
        RespClass::ServerError(500) => true,
        RespClass::ServerError(_) => false,    // 其他 5xx 不盲目重试
        RespClass::ClientError(_) => false,    // 客户端错误重试无意义
        RespClass::Success(_) | RespClass::Other(_) => false,
    }
}
```

讲解：分类函数用区间模式一次成型，`retryable` 演示「同枚举的第二个视角」——同一个类型在不同函数里按业务拆解；`ServerError(503)` 展示「枚举变体 + 具体值」的组合模式。若用字符串标记（"success"/"server_error"）建模，拼写错误与穷尽性双双失守——这是真实网关代码里最常见的重构起点。

### 场景二：播放器模式切换

真实背景：音乐播放器有「顺序播放、单曲循环、随机播放」三种模式，UI 与播放逻辑都要穷尽处理：

```rust
enum PlayMode {
    Sequence,
    LoopOne(u32),          // 单曲循环，记录曲目 id
    Shuffle(u64),          // 随机播放，记录随机种子
}

impl PlayMode {
    fn next_track(&self, current: u32, total: u32) -> u32 {
        match self {
            PlayMode::Sequence => {
                if current + 1 >= total { 0 } else { current + 1 }
            }
            PlayMode::LoopOne(id) => *id,
            PlayMode::Shuffle(seed) => {
                // 伪随机跳转：真实项目用 rand 库
                ((current as u64 * 2654435761 + seed) % total as u64) as u32
            }
        }
    }
}
```

讲解：行为挂在 `impl` 上，`match self` 按形态分派——每种模式的「附加数据」（循环的曲目、随机的种子）就在手边，不需要额外的查询函数。易错点：`LoopOne(id) => *id` 里 `*id` 是因为 `match self`（`&self`）时 id 是引用，要解引用；写成 `id => id` 会编译报错类型不匹配，初见时容易懵。

### 场景三：Option 处理列表首元素

真实背景：分页列表接口要取「第一条记录」做摘要展示，列表可能为空——典型的 Option 消费链：

```rust
fn first_title(rows: &[String]) -> String {
    rows.first()
        .map(|row| format!("最新：{row}"))
        .unwrap_or_else(|| "暂无数据".to_string())
}

fn main() {
    let empty: Vec<String> = vec![];
    let data = vec![String::from("订单已发货"), String::from("余额不足提醒")];
    println!("{}", first_title(&data));  // 最新：订单已发货
    println!("{}", first_title(&empty)); // 暂无数据
}
```

讲解：`first()` 返回 `Option<&String>`（空列表为 None）；`map` 只在 Some 时做转换，`unwrap_or_else` 在 None 时兜底——整条链没有一处 if 判断，空值处理被压缩进类型语义。对照手写版会发生什么：`if rows.is_empty() { ... } else { format!(...) }` 也能用，但每个调用点都要重写一遍判空，而 Option 链把「可能为空」编码进了函数签名，调用方想漏都漏不掉。

## 8. 常见错误与对策

| 编译错误 | 原因 | 对策 |
| :--- | :--- | :--- |
| non-exhaustive patterns | match 未覆盖所有分支 | 补上剩余分支，或加 `_` 兜底 |
| type `Option<T>` cannot be used with `?` | Option 与 Result 混用 | 用 `ok_or` 转换类型（见错误处理篇） |
| cannot move out of `s` which is behind a reference | 对引用 match 后把变体数据按值取走 | 分支改绑定引用，或匹配 `&s` |
| expected `u32`, found `&u32` | `match &self` 时绑定是引用 | 分支里 `*id` 解引用 |
| guard on non-exhaustive match | 只写了带守卫的分支 | 补 `_` 兜底分支 |

## 9. 动手实践

**任务一：给订单状态机补一个「取消」分支（约 15 分钟）**

在 6 节的 `OrderState` 上增加 `Cancelled(String)` 变体（记录取消原因），要求：只有 `Pending` 状态可以取消；`next_state` 保持穷尽；写一个测试断言 Done 状态无法被取消。

提示：新增变体后编译器会指出所有需要补的 match 分支——先把编译错误当待办清单；取消逻辑单独放一个 `cancel(s: &OrderState) -> Option<OrderState>`，不可取消时返回 None，用 Option 表达「操作可能不可行」。

**任务二：解析配置值（约 15 分钟）**

给定 `let raw = "42"`，写函数 `parse_port(raw: &str) -> u16`：能解析出 1-65535 的端口就返回它；解析失败或越界返回 8080。只允许用 `str::parse` 与 Option 链，不允许手写 if 判空。

提示：`parse::<u16>()` 返回 `Result`，用 `.ok()` 转成 Option；再用 `filter` 校验区间；最后 `unwrap_or(8080)`。

参考实现（先自己写完再展开对照）：

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

任务一：

```rust
#[derive(Debug)]
enum OrderState {
    Pending,
    Paid(u32),
    Shipped(String),
    Done,
    Cancelled(String),
}

fn cancel(s: &OrderState) -> Option<OrderState> {
    match s {
        OrderState::Pending => Some(OrderState::Cancelled("用户主动取消".into())),
        _ => None, // 其余状态不可取消；穷尽性由 _ 兜底
    }
}
```

要点：`cancel` 传引用避免消费原状态；返回 `Option` 把「取消失败」编码进签名；编译器在新增 Cancelled 后会要求 `next_state` 补分支，这正是穷尽检查在工作。

任务二：

```rust
fn parse_port(raw: &str) -> u16 {
    raw.parse::<u16>().ok()
        .filter(|p| (1..=65535).contains(p))
        .unwrap_or(8080)
}
```

要点：`parse::<u16>()` 同时解决「是不是数字」与「会不会溢出 u16」（如 "70000" 返回 Err）；`.ok()` 把 Result 降为 Option；`filter` 在 Some 上追加区间校验，None 直接穿透；整条链上没有任何空值分支散落。

</details>

## 10. 与之前和之后的知识的关系

- 往前：变体携带数据离不开结构体一篇的字段语义；match 按值移动数据时用到所有权的规则；
- 往后：`Option` 与 `Result` 是同一思想的两姊妹，`?` 传播链在 [错误处理](/rust/080-RustErrorHandling) 展开；迭代器的 `filter`/`map`（见迭代器与函数式风格一篇）把本篇的 Option 链升级为集合级操作。

## 小结

枚举把「多种形态」收进一个封闭类型，变体可以各带各的数据；match 用穷尽性检查把「漏处理一种形态」变成编译错误，区间、绑定、守卫让模式足够精确；if let / while let 服务「只关心一种形态」的场景；Option 用类型消灭 null。一句话记忆：**struct 装数据、enum 表状态、match 穷尽分支、Option 替代 null**——非法状态无法表示，是这套组合给出的最高回报。
