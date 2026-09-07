---
order: 40
title: Rust 基础语法
module: 'rust'
category: 后端技术
difficulty: beginner
description: Rust 基础语法：变量与不可变性、标量类型、复合类型、函数与控制流
author: fanquanpp
updated: '2026-08-30'
related:
  - 'rust/003-RustEnvSetup'
  - 'rust/005-RustOwnershipBorrowing'
prerequisites:
  - 'rust/003-RustEnvSetup'
---


## 1. 从"写便签"说起：变量与不可变性

想象你在一张便签上写字。Rust 的默认规则是：**便签写完就不能改**（不可变），除非你特意用记号笔标了"可改"（`mut`）。

Rust 变量默认不可变（immutable），这是安全设计的第一课：

```rust
fn main() {
    let x = 5;
    // x = 6;  // 错误：不可变变量不能赋值
    println!("x = {x}");

    let mut y = 5; // mut 声明可变
    y = 6;         // 合法
    println!("y = {y}");
}
```

讲解：`let` 声明变量，默认只读；需要修改时显式加 `mut`。这迫使程序员"默认不改、显式才改"，从源头减少状态变更带来的 bug。

`const` 与 `static` 是另外两种常量形式：

```rust
const MAX_SIZE: u32 = 100;          // 编译期常量，必须标注类型
static APP_NAME: &str = "FANDEX";   // 全局静态变量
```

讲解：`const` 可内联进使用处，无运行时开销；`static` 有固定内存地址，适合全局配置。

### 1.1 变量遮蔽（Shadowing）

```rust
let x = 5;
let x = x + 1;        // 新 x 遮蔽旧 x，类型可变
let x = x.to_string(); // 甚至可以改变类型
```

讲解：遮蔽允许重用变量名而无需 `mut`，常用于数值逐步变换的场景；它与"可变"的区别是：遮蔽是创建新变量。

## 2. 标量类型

Rust 的四大标量类型：

| 类型 | 说明 | 示例 |
| --- | --- | --- |
| 整数 | i8~i128、u8~u128、isize/usize | `let a: i32 = -5;` |
| 浮点 | f32、f64（默认 f64） | `let b: f64 = 3.14;` |
| 布尔 | bool | `let c = true;` |
| 字符 | char（4 字节，支持 Unicode） | `let d = '中';` |

```rust
fn main() {
    let a: i32 = 42;          // 整数，默认 i32
    let b = 3.14;             // 浮点，默认 f64
    let c: bool = true;
    let d: char = 'R';        // 单引号表示字符
    println!("{a} {b} {c} {d}");
}
```

讲解：整数带符号用 i 前缀（可正可负），无符号用 u；`usize` 与指针大小一致，常用于索引。数字字面量支持下划线分隔：`let big = 1_000_000;`。

运算与溢出：`+ - * / %` 与多数语言一致。debug 模式下溢出会 panic，release 模式按回绕（wrapping）处理：

```rust
let sum = 200u8 + 100u8;  // debug 下 panic，release 下回绕为 44
let safe = 200u8.wrapping_add(100); // 显式回绕，结果 44
```

讲解：需要处理溢出边界时，优先用 `wrapping_add`、`checked_add`（返回 Option）等显式方法，而不是依赖 debug/release 差异。

## 3. 元组与数组

复合类型用于把多个值组合在一起。

### 3.1 元组（Tuple）

```rust
let tup: (i32, f64, char) = (42, 3.14, 'R');
let (x, y, z) = tup;          // 解构（destructure）
println!("{x} {y} {z}");
println!("{}", tup.0);        // 索引访问，tup.0 即 42
```

讲解：元组可容纳不同类型、长度固定；解构一次性取出多个值，索引访问按位置取单个值。

### 3.2 数组（Array）

```rust
let arr: [i32; 3] = [1, 2, 3]; // 类型 + 长度
let zeros = [0; 5];            // 5 个 0，等价于 [0,0,0,0,0]
println!("{}", arr[0]);        // 越界会 panic
```

讲解：数组长度编译期确定、存于栈上；越界访问在运行时 panic（安全性：不会读到脏内存）。需要动态长度时用 Vec（见 007 篇）。

## 4. 函数

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b          // 最后一个表达式即返回值，无分号
}

fn main() {
    let r = add(1, 2);
    println!("{r}");
}
```

讲解：函数参数必须标注类型；返回值用 `-> 类型` 声明。Rust 是表达式语言：函数体最后一行不加分号就作为返回值；加了分号则变成语句，返回 `()`。

```rust
fn greet() {                  // 无返回值，隐式返回 ()
    println!("hello");
}
```

讲解：`main` 返回 `()` 或 `Result`；早期函数提前返回用 `return` 关键字，与 C 系语言一致。

## 5. 控制流

### 5.1 if 表达式

```rust
let score = 85;
let grade = if score >= 90 { "A" } else if score >= 80 { "B" } else { "C" };
println!("grade = {grade}");
```

讲解：`if` 是表达式，可以赋值给变量；各分支必须返回同类型。注意没有三元运算符，`if/else` 就是替代品。

### 5.2 loop 循环

```rust
let mut count = 0;
let result = loop {
    count += 1;
    if count == 10 {
        break count * 2;   // break 可带出值
    }
};
println!("result = {result}");
```

讲解：`loop` 是无限循环，配合 `break` 退出；`break` 可以携带表达式作为 loop 的返回值。嵌套循环可用标签精确跳出：

```rust
'outer: loop {
    loop {
        break 'outer;  // 直接跳出外层循环
    }
}
```

### 5.3 while 与 for

```rust
let mut n = 3;
while n > 0 {
    println!("{n}");
    n -= 1;
}

// for 遍历区间（Range）
for i in 1..=5 {           // 1..5 不含 5；1..=5 含 5
    println!("{i}");
}

// for 遍历数组（推荐用法）
let arr = [10, 20, 30];
for v in arr {
    println!("{v}");
}
```

讲解：`for` 是遍历的首选——没有索引越界风险，配合迭代器可读性最佳；`while` 适合条件驱动场景。

## 6. 综合示例

用循环与函数求 1 到 100 的奇数和：

```rust
fn sum_odd(limit: u32) -> u32 {
    let mut total = 0;
    for i in 1..=limit {
        if i % 2 == 1 {
            total += i;
        }
    }
    total
}

fn main() {
    println!("{}", sum_odd(100)); // 输出 2500
}
```

讲解：把逻辑封装为函数、用 `for` 区间遍历、`if` 过滤、累加后返回——这是 Rust 最小可读的"算法骨架"。

## 7. 常见错误与对策

| 编译错误 | 原因 | 对策 |
| :--- | :--- | :--- |
| cannot assign to immutable variable | 给不可变变量赋值 | 声明时加 `mut`，或改用遮蔽 |
| mismatched types | 类型不匹配 | 检查字面量后缀或显式标注类型 |
| expected `()` | 函数多写了分号 | 去掉最后表达式的分号 |
| index out of bounds | 数组越界 | 用迭代器遍历，避免手动索引 |

## 10. 小结

本课覆盖变量、标量/复合类型、函数与控制流。核心记忆点：变量默认不可变（mut 显式可变）、表达式有值（if/loop 可返回）、for 优先于 while 做遍历。下一步学习 Rust 的灵魂——所有权与借用。

> **一句话记忆**：Rust 基础语法三件套——"变量默认只读（要改就 mut）、表达式都有值（if/loop 能返回）、遍历用 for（无越界风险）"；把这三条内化，写任何 Rust 代码都不会迷路。
