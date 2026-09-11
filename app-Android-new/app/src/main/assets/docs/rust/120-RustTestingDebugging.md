---
order: 120
title: 测试与调试
module: 'rust'
category: 后端技术
difficulty: beginner
description: 'cargo test 与 #[test]、断言宏、cargo clippy、dbg! 与调试技巧'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'rust/040-RustBasicSyntax'
  - 'rust/140-RustEcosystemProject'
prerequisites:
  - 'rust/080-RustErrorHandling'
---


## 1. 测试为什么重要

Rust 把测试工具内置在工具链中：`cargo test` 一条命令即可运行全部测试。测试函数、断言宏、覆盖率（可选）无需额外框架，这保证了"测试是日常开发的一部分"而不是事后补课。

## 2. 第一个测试

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }
}
```

讲解：`#[cfg(test)]` 表示该模块只在测试编译时存在；`#[test]` 标记测试函数；`use super::*` 引入被测代码。运行：

```bash
cargo test
```

输出 `test result: ok. 1 passed` 即通过。

### 2.1 断言宏

| 宏 | 作用 | 失败信息 |
| --- | --- | --- |
| assert!(cond) | 条件为真 | 可选自定义消息 |
| assert_eq!(a, b) | 两值相等 | 打印两边值（要求 Debug） |
| assert_ne!(a, b) | 两值不相等 | 同上 |
| panic!("msg") | 直接失败 | 自定义消息 |

```rust
#[test]
fn test_with_message() {
    let v = vec![1, 2, 3];
    assert!(v.len() == 3, "长度应为 3，实际 {}", v.len());
    assert_eq!(v.first(), Some(&1));
}
```

讲解：`assert_eq!` 比较的是值（会显示左右两侧）；注意 `v.first()` 返回 `Option<&i32>`，要与 `Some(&1)` 比较。自定义消息用 `format!` 风格占位符。

### 2.2 验证 panic：should_panic

```rust
#[test]
#[should_panic(expected = "越界")]
fn test_panic() {
    let v = vec![1];
    let _ = v[5]; // 触发越界 panic
}
```

讲解：`#[should_panic]` 断言测试内发生 panic 且消息包含 "越界"——适合测试非法输入路径。

### 2.3 返回 Result 的测试

```rust
fn parse_num(s: &str) -> Result<i32, std::num::ParseIntError> {
    s.parse()
}

#[test]
fn test_parse() -> Result<(), Box<dyn std::error::Error>> {
    assert_eq!(parse_num("42")?, 42);
    Ok(())
}
```

讲解：测试函数返回 `Result` 时，`?` 失败即测试失败——避免在测试里嵌套 unwrap。

## 3. 测试组织与运行控制

```bash
cargo test              # 运行全部测试
cargo test test_add     # 按名称过滤
cargo test -- --ignored # 只跑被 #[ignore] 标记的慢测试
cargo test --release    # 优化模式下测试
```

```rust
#[test]
#[ignore = "需要外部数据库，手动运行"]
fn test_slow_db() {
    // 长耗时测试
}
```

测试分三类：

| 类型 | 位置 | 说明 |
| --- | --- | --- |
| 单元测试 | 与代码同文件的 `mod tests` | 测内部函数与私有项 |
| 集成测试 | `tests/` 目录下的独立文件 | 从外部 API 视角测试 |
| 文档测试 | 代码注释中的示例 | `cargo test` 会编译执行文档示例 |

```rust
/// 计算两数之和
///
/// ```
/// use mylib::add;
/// assert_eq!(add(1, 2), 3);
/// ```
pub fn add(a: i32, b: i32) -> i32 { a + b }
```

讲解：文档注释中的代码块默认会作为测试运行——**示例代码永不撒谎**，这是 Rust 文档体系的独特优点。

## 4. cargo clippy 与代码质量

Clippy 是官方 lint 工具，发现常见错误模式与不优雅写法：

```bash
cargo clippy          # 静态检查
cargo clippy -- -W clippy::pedantic  # 更严格的检查
```

```rust
// 常见 clippy 提示示例
let s = format!("{}", 42);      // clippy: 直接 42.to_string() 更高效
if x == true { }                // clippy: 直接 if x
vec![].len()                    // clippy: 恒为 0
```

讲解：把 clippy 纳入日常循环（写代码 → cargo check → cargo clippy → cargo test），CI 中通常强制 clippy 无警告。

代码格式化使用 `cargo fmt`，配合编辑器保存时自动格式化：

```bash
cargo fmt              # 格式化整个项目
cargo fmt --check      # CI 中只检查是否已格式化
```

## 5. 调试技巧

### 5.1 dbg! 宏

```rust
fn main() {
    let x = 5;
    let y = dbg!(x * 2);       // 打印 "[src/main.rs:3] x * 2 = 10"
    let v = vec![1, 2, 3];
    dbg!(&v);                  // 打印变量内容与位置
    println!("{y}");
}
```

讲解：`dbg!` 输出到标准错误流（stderr），自动附文件与行号、表达式原文与值——比 `println!` 更省事，排查后记得删除。注意 `dbg!` 会**取走表达式所有权**，传 `&v` 借用更安全。

### 5.2 断点调试

VS Code + CodeLLDB 扩展支持断点、单步、变量监视：

```rust
fn main() {
    let nums = vec![3, 1, 4, 1, 5];
    let mut sum = 0;
    for n in nums {
        sum += n;   // 在此行打断点，观察 n 与 sum
    }
    println!("{sum}");
}
```

配置 `.vscode/launch.json`（CodeLLDB 类型），F5 启动调试。

### 5.3 常见调试手段速查

| 场景 | 手段 |
| --- | --- |
| 打印中间值 | `dbg!(expr)` |
| 观察数据结构 | 类型实现 `Debug` 后 `println!("{:#?}", v)` |
| 定位 panic 位置 | `RUST_BACKTRACE=1` 环境变量打印回溯栈 |
| 追踪借用错误 | 阅读编译器错误行号，rust-analyzer 悬停提示 |
| 性能热点 | `cargo build --release` + `cargo flamegraph` |

```bash
# PowerShell 中开启回溯栈
$env:RUST_BACKTRACE = "1"
cargo run
```

讲解：`RUST_BACKTRACE=1` 让 panic 输出完整调用栈，能快速定位是哪一行触发的；配合 `#[track_caller]`（标准库内部已用）能显示 panic 源头。

## 6. 综合示例：带测试的分数计算

```rust
pub fn grade(score: u32) -> &'static str {
    match score {
        90..=100 => "A",
        80..=89 => "B",
        70..=79 => "C",
        60..=69 => "D",
        0..=59 => "F",
        _ => panic!("score 越界: {score}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grade_boundaries() {
        assert_eq!(grade(100), "A");
        assert_eq!(grade(90), "A");
        assert_eq!(grade(89), "B");
        assert_eq!(grade(60), "D");
        assert_eq!(grade(0), "F");
    }

    #[test]
    #[should_panic(expected = "越界")]
    fn test_grade_invalid() {
        grade(101);
    }
}
```

讲解：边界值测试（90/89/60 等临界点）是测试的核心价值；`#[should_panic]` 验证非法输入的防护路径。

## 7. 小结

测试三件套（`#[test]` + 断言宏 + cargo test）、质量双保险（clippy + fmt）、调试三板斧（dbg!、断点、RUST_BACKTRACE）。把"写代码 → check → clippy → test"变成肌肉记忆，代码质量就有了基本保障。下一步进入异步编程，学习高并发服务的基础。

> **一句话记忆**：Rust 质量保障四步曲——"`cargo check` 快验证、`cargo clippy` 查质量、`cargo fmt` 整格式、`cargo test` 验功能"；测试用 `#[test]` + `assert_eq!`，边界值优先测，调试用 `dbg!` + `RUST_BACKTRACE=1`。
