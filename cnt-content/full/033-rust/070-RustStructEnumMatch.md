---
order: 70
title: 结构体、枚举与模式匹配
module: 'rust'
category: 后端技术
difficulty: beginner
description: 结构体与 impl、枚举与 Option、match 模式匹配与 if let
author: fanquanpp
updated: '2026-09-12'
related:
  - 'rust/050-RustOwnershipBorrowing'
  - 'rust/080-RustErrorHandling'
prerequisites:
  - 'rust/050-RustOwnershipBorrowing'
---


## 1. 从"登记表"说起：结构体（Struct）

想象一张学员登记表：姓名、年龄、是否活跃——几个字段合在一起，就是一个"学员"的整体信息。**结构体就是把多个字段组合成一个自定义类型**，是组织数据的基本单位。

```rust
struct User {
    name: String,
    age: u8,
    active: bool,
}

fn main() {
    let user = User {
        name: String::from("张三"),
        age: 18,
        active: true,
    };
    println!("{} {}", user.name, user.age);
}
```

讲解：字段默认不可变；整个结构体需要修改时声明 `let mut user`。结构体没有构造函数的强制语法，直接用字面量初始化。

### 1.1 字段初始化简写与更新语法

```rust
fn build_user(name: String, age: u8) -> User {
    User {
        name,        // 字段名与变量名相同可简写
        age,
        active: true,
    }
}

let u1 = build_user(String::from("李四"), 20);
let u2 = User { age: 21, ..u1 }; // 其余字段从 u1 复制
```

讲解：`..u1` 展开其余字段，等价于逐字段拷贝；注意它会把 `name`（String）从 u1 中移动走，此后 u1 不能再整体使用。

### 1.2 元组结构体与单元结构体

```rust
struct Color(u8, u8, u8);   // 元组结构体：字段无名字
let red = Color(255, 0, 0);
println!("{}", red.0);      // 按索引访问

struct Marker;              // 单元结构体：无字段，常用于类型标记
```

讲解：元组结构体适合"只有一个主要属性"的轻量封装；单元结构体常配合 trait 做类型级标记。

## 2. 方法（impl）

用 `impl` 块为结构体定义方法：

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // 方法：&self 借用结构体，只读
    fn area(&self) -> u32 {
        self.width * self.height
    }
    // 可变方法：&mut self
    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }
    // 关联函数：没有 self，等价于静态方法，用 :: 调用
    fn square(side: u32) -> Rectangle {
        Rectangle { width: side, height: side }
    }
}

fn main() {
    let mut r = Rectangle { width: 3, height: 4 };
    println!("area = {}", r.area());   // 12
    r.scale(2);
    println!("area = {}", r.area());   // 48

    let s = Rectangle::square(5);      // 关联函数用 :: 调用
    println!("area = {}", s.area());
}
```

讲解：`self` 三种形态：`&self`（借用只读）、`&mut self`（可变借用）、`self`（获取所有权）；关联函数无 self，用 `Type::fn()` 调用。Rust 没有继承，复用靠 trait（见泛型与 Trait 一篇）。

### 2.1 结构体打印调试

结构体默认不能打印，需要派生（derive）`Debug`：

```rust
#[derive(Debug)]
struct Rectangle { width: u32, height: u32 }

fn main() {
    let r = Rectangle { width: 3, height: 4 };
    println!("{r:?}");       // 单行调试输出
    println!("{r:#?}");      // 多行美化输出
}
```

讲解：`#[derive(Debug)]` 让编译器自动生成调试打印实现；`{:#?}` 美化格式在排查数据结构时非常常用。

## 3. 枚举（Enum）

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

枚举变体可以携带数据，这是 Rust 枚举（代数数据类型 ADT）的威力：

```rust
enum Shape {
    Circle(f64),                    // 元组变体：半径
    Rectangle { w: f64, h: f64 },   // 结构体变体
    Empty,                          // 单元变体
}

fn area(s: Shape) -> f64 {
    match s {
        Shape::Circle(r) => 3.14159 * r * r,
        Shape::Rectangle { w, h } => w * h,
        Shape::Empty => 0.0,
    }
}
```

讲解：每个变体可带不同类型的数据，match 时统一解构——"一个类型承载多种形态"比继承体系更简洁、更易穷尽检查。

## 4. match 模式匹配

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

讲解：数值字面量、区间 `..=`、通配符 `_` 都可作为模式。`_` 兜底让 match 不必列出全部情况；若不加兜底则必须穷尽。

match 可以解构组合数据并绑定变量：

```rust
let pair = (10, "ok");
match pair {
    (0, msg) => println!("第一个是零，消息：{msg}"),
    (n, "ok") => println!("消息是 ok，数值 {n}"),
    (n, msg) => println!("其他：{n} {msg}"),
}
```

讲解：解构的同时绑定字段；`_` 可以出现在子位置忽略某字段：`(_, msg)`。

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

讲解：等价于只有一个分支的 match；`while let` 同理，用于循环中重复匹配（如迭代 Option 序列）。

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

讲解：`Option<T>` 是标准库枚举，`Some`/`None` 可直接使用（prelude 自动导入）。编译器强制你处理 None 分支——**不存在空指针解引用**，因为空值必须显式处理。

Option 的常用方法：

| 方法 | 作用 | 示例 |
| --- | --- | --- |
| unwrap() | 取出值，None 则 panic | `x.unwrap()` |
| unwrap_or(default) | None 时用默认值 | `x.unwrap_or(0)` |
| map(f) | 对 Some 内值做转换 | `x.map(|v| v * 2)` |
| is_some() / is_none() | 判断 | `x.is_some()` |

```rust
let a = Some(10);
let b: Option<i32> = None;
println!("{}", a.unwrap_or(0));      // 10
println!("{}", b.unwrap_or(0));      // 0
println!("{}", b.map(|v| v * 2).is_none()); // true
```

讲解：生产代码慎用 `unwrap()`（会 panic），先用 `unwrap_or` 或 match 显式处理；`?` 运算符在错误处理一篇中讲解。

## 6. 综合示例：用枚举实现简单状态机

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

讲解：枚举 + match 天然适合状态机：非法迁移在编译期难以表达，运行时靠 match 穷尽保证每一步都有处理。

## 7. 常见错误与对策

| 编译错误 | 原因 | 对策 |
| :--- | :--- | :--- |
| non-exhaustive patterns | match 未覆盖所有分支 | 补上剩余分支，或加 `_` 兜底 |
| no method named `area` | 结构体未定义该方法 | 用 `impl` 块添加方法 |
| `Rectangle` cannot be formatted | 结构体未实现 Debug | 加 `#[derive(Debug)]` |
| type `Option<T>` cannot be used with `?` | Option 与 Result 混用 | 用 `ok_or` 转换类型 |

## 8. 小结

结构体组织数据、impl 定义行为、枚举表达状态、match 穷尽处理分支、Option 消灭空指针。这五件套是 Rust 建模日常业务的基本功。下一步学习错误处理：让程序在失败时给出优雅的反馈而非崩溃。

> **一句话记忆**：Rust 建模五件套——"struct 装数据、impl 给行为、enum 表状态、match 穷尽分支、Option 替代 null"；把 `Option` 当"必须处理的空值"，把 `match` 当"编译器替你检查有没有漏掉分支"。
