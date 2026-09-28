---
order: 120
title: "测试与调试：让编译器之外的第二道防线生效"
module: 'rust'
category: 后端技术
difficulty: beginner
description: "以虚拟歌手音乐平台的评分与票务函数为例，亲手写出第一个 cargo test，掌握断言宏、should_panic、三类测试组织、clippy 质量检查与 dbg!/RUST_BACKTRACE 调试三板斧，附边界值漏测实录。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'rust/080-RustErrorHandling'
  - 'rust/140-RustEcosystemProject'
  - 'rust/190-RustCargoAdvanced'
prerequisites:
  - 'rust/080-RustErrorHandling'
---

编译器挡住了类型错误与借用错误，但挡不住「逻辑写错了」：评分函数把 89 分判成 A、票务函数越界不报错——这些只有测试能拦住。Rust 把测试工具内置在语言里：`#[test]` 一个属性、`cargo test` 一条命令，断言宏、文档测试、基准测试全部开箱即用，不需要引入第三方框架。本篇以虚拟歌手音乐平台的评分与票务函数为背景，把测试写法、质量检查（clippy/fmt）与调试三板斧一次走通。

## 前置知识

- [错误处理](/rust/080-RustErrorHandling)：`Result` 与 `?` 运算符，本文「返回 Result 的测试」一节会用到。
- [Cargo 进阶](/rust/190-RustCargoAdvanced)可以之后再读：本文只用最基本的 `cargo test`。

## 学习目标

1. 会写单元测试：`#[cfg(test)]` + `#[test]` + 三个断言宏。
2. 会测「应该 panic」和「返回 Result」的两类特殊路径。
3. 理解单元测试、集成测试、文档测试三种组织方式各适合什么。
4. 会用 `cargo clippy` 与 `cargo fmt` 维持代码质量底线。
5. 掌握调试三板斧：`dbg!`、断点调试、`RUST_BACKTRACE`。

## 1. 先动手：30 秒写出第一个测试

被测函数很普通——把投票得分换算成等级：

```rust
pub fn grade(score: u32) -> &'static str {
    match score {
        90..=100 => "A",
        80..=89  => "B",
        70..=79  => "C",
        60..=69  => "D",
        0..=59   => "F",
        _ => panic!("score 越界: {score}"),
    }
}
```

测试就写在同一文件的底部（惯例是文件末尾的 `mod tests`）：

```rust
#[cfg(test)]                 // 只在 cargo test 编译时存在，release 构建不包含
mod tests {
    use super::*;            // 引入上级模块的被测代码

    #[test]                  // 标记：这是一个测试函数
    fn test_grade() {
        assert_eq!(grade(95), "A");
    }
}
```

```bash
cargo test
```

预期输出（关键字段已标注）：

```text
running 1 test
test tests::test_grade ... ok          <- 测试名与结果

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured
```

三个要点：`#[cfg(test)]` 让测试代码不进生产二进制；`use super::*` 是 `mod tests` 能访问同级函数的原因；测试函数签名是 `fn()` 无参数，失败即 panic，不 panic 即通过——整个测试模型简单到没有任何新概念。

## 2. 三个断言宏与两类特殊测试

### 2.1 断言宏

| 宏 | 失败条件 | 失败时输出 |
| --- | --- | --- |
| `assert!(cond)` | 条件为假 | 可选自定义消息 |
| `assert_eq!(a, b)` | 两值不等 | 打印两侧的值（要求实现 `Debug` 与 `PartialEq`） |
| `assert_ne!(a, b)` | 两值相等 | 同上 |

```rust
#[test]
fn test_with_message() {
    let votes = vec![1, 2, 3];
    assert!(votes.len() == 3, "票数应为 3，实际 {}", votes.len());
    assert_eq!(votes.first(), Some(&1));  // first() 返回 Option<&i32>，注意比较对象
}
```

`assert_eq!` 失败时会把左右两侧的值都打印出来（`assertion left == right failed: left: 5, right: 3`），这是它比 `assert!` 好用的地方——优先用 `assert_eq!`。

### 2.2 验证 panic：should_panic

`grade(101)` 应该 panic，这个「防护路径」本身也要测：

```rust
#[test]
#[should_panic(expected = "越界")]      // 断言 panic 发生，且消息包含指定文本
fn test_grade_invalid() {
    grade(101);
}
```

不写 `expected` 的话任何 panic 都算通过，容易误报；写上后连「panic 消息不对」都能查出来。

### 2.3 返回 Result 的测试

测试里也难免调用会失败的函数，与其层层 `unwrap`，不如直接让测试函数返回 `Result`：

```rust
fn parse_votes(s: &str) -> Result<u32, std::num::ParseIntError> {
    s.parse()
}

#[test]
fn test_parse() -> Result<(), Box<dyn std::error::Error>> {
    assert_eq!(parse_votes("42")?, 42);   // ? 失败即测试失败，错误信息完整保留
    Ok(())
}
```

返回 `Result` 的测试**不能**再搭配 `#[should_panic]`，二选一。

## 3. 测试的组织：三种位置三种用途

```bash
cargo test                # 全部测试
cargo test grade          # 按名称过滤（含子串匹配）
cargo test -- --ignored   # 只跑被 #[ignore] 标记的测试
cargo test --release      # 优化模式下测试（性能相关行为要用这个测）
```

| 类型 | 位置 | 适合测什么 |
| --- | --- | --- |
| 单元测试 | 与被测代码同文件的 `mod tests` | 内部函数、私有逻辑，小而快 |
| 集成测试 | `tests/` 目录下每个 `.rs` 文件 | 从外部视角只用公开 API，测模块拼装 |
| 文档测试 | `///` 文档注释里的代码块 | 保证示例代码可运行、不撒谎 |

文档测试是 Rust 的独特武器：

```rust
/// 计算两首歌的合唱分
///
/// # 示例
///
/// ```
/// use mylib::duet_score;
/// assert_eq!(duet_score(80, 90), 85);
/// ```
pub fn duet_score(a: u32, b: u32) -> u32 {
    (a + b) / 2
}
```

`cargo test` 会编译并执行这段示例——文档示例永远不会悄悄过时。代价是文档块里的代码必须真的能编译，写「伪代码示意」要用 ` ```text ` 或 ` ```ignore ` 标注。

慢测试（需要数据库、网络）标记后默认跳过：

```rust
#[test]
#[ignore = "需要真实数据库，发布前手动跑"]
fn test_song_history() {
    // ...
}
```

## 4. 边界值漏测实录：一个真实的 bug

只测 `grade(95) == "A"` 的测试给了虚假的安全感——上线的第一个 bug 报告是「89 分显示为 A」。回头看实现：`80..=89` 覆盖到 89 没错，但有人后来把第一行改成了 `90..=100 => "A", 85..=100 => "S"`，区间重叠后 match 从上往下命中，89 分先撞上 S 段……这类错误恰恰躲在边界上。

修正后的测试套件（边界值优先）：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grade_boundaries() {
        // 每个等级取「最高分」和「最低分」两侧各测一次
        assert_eq!(grade(100), "A");
        assert_eq!(grade(90), "A");
        assert_eq!(grade(89), "B");
        assert_eq!(grade(80), "B");
        assert_eq!(grade(60), "D");
        assert_eq!(grade(59), "F");
        assert_eq!(grade(0), "F");
    }

    #[test]
    #[should_panic(expected = "越界")]
    fn test_grade_invalid() {
        grade(101);
    }
}
```

经验法则：**测试的核心价值在边界（90/89、60/59、0/101），不在正中央的典型值**。典型值大家随手就测了，边界才是 bug 的家。

## 5. cargo clippy 与 cargo fmt：质量底线自动化

clippy 是官方 lint 工具，专抓「能跑但不对劲」的写法：

```bash
cargo clippy                        # 常规检查
cargo clippy -- -W clippy::pedantic # 更严格（团队规范可酌情开启）
```

```rust
let s = format!("{}", 42);   // clippy 提示：用 42.to_string() 更直接
if x == true { }             // clippy 提示：直接写 if x
vec![1, 2, 3].len()          // clippy 提示：调用即得 3，检查是不是逻辑写错
```

格式化交给 `cargo fmt`，团队从此不用争论缩进与换行：

```bash
cargo fmt            # 直接改写整个项目
cargo fmt --check    # CI 中只检查不修改，不合规即失败
```

日常循环定型为：**写代码 -> `cargo check`（快验证）-> `cargo clippy`（查质量）-> `cargo test`（验逻辑）**，CI 里把这四条全部设为必过。工具链参数层面的展开见 [Cargo 进阶](/rust/190-RustCargoAdvanced)。

## 6. 调试三板斧

### 6.1 dbg!：会报行号的 println!

```rust
fn main() {
    let x = 5;
    let y = dbg!(x * 2);      // stderr 输出: [src/main.rs:3:13] x * 2 = 10
    let songs = vec!["a", "b"];
    dbg!(&songs);             // 借用传入，不拿走所有权
    println!("{y}");
}
```

`dbg!` 比 `println!` 多三样东西：文件与行号、表达式原文、输出走 stderr（不污染程序的标准输出）。注意 `dbg!` **取表达式的所有权**，对变量请传 `&songs` 这样的引用。排查完记得删除——CI 里可以加个 grep 检查防止 dbg! 混进提交。

### 6.2 断点调试：VS Code + CodeLLDB

安装 CodeLLDB 扩展后配置 `.vscode/launch.json`（类型选 lldb，请求 launch 当前 crate），就能在行号旁打断点、单步执行、监视变量：

```rust
fn main() {
    let tickets = vec![3, 1, 4, 1, 5];
    let mut total = 0;
    for t in tickets {
        total += t;   // 在此行打断点：观察 t 与 total 的逐轮变化
    }
    println!("{total}");
}
```

适合「变量多、循环深、打印输出已经看不清」的场景；简单问题 `dbg!` 更快。

### 6.3 RUST_BACKTRACE：panic 时的现场还原

程序 panic 时默认只给一行信息，开启回溯栈能看到完整的调用路径：

```bash
# PowerShell
$env:RUST_BACKTRACE = "1"; cargo run
# bash
RUST_BACKTRACE=1 cargo run
```

```text
thread 'main' panicked at src/main.rs:6:23: score 越界: 101
stack backtrace:
   0: myapp::grade
   1: myapp::main
   ...
```

回溯栈从上往下就是「panic 发生点 -> 调用链」，配合行号能直接定位第一现场。速查表：

| 场景 | 手段 |
| --- | --- |
| 打印中间值 | `dbg!(expr)` |
| 查看结构体内容 | 类型派生 `Debug` 后 `println!("{:#?}", v)`（`{:#?}` 是美化缩进版） |
| 定位 panic 来源 | `RUST_BACKTRACE=1` |
| 借用检查报错 | 读编译器错误行号 + rust-analyzer 悬停提示（详见[借用检查器报错实战](/rust/060-RustBorrowCheckerErrorGuide)） |
| 性能热点定位 | `cargo build --release` 后用 `cargo flamegraph` 出火焰图 |

## 7. 小练习

1. 给[错误处理](/rust/080-RustErrorHandling)里的某个返回 `Result` 的函数写测试：成功路径用返回 `Result` 的测试，失败路径用 `#[should_panic]` 之外的 `assert!(result.is_err())` 各写一遍；
2. 为 `grade` 补充 `u32::MAX` 的测试用例，确认 panic 消息符合预期；
3. 给本文 `duet_score` 函数的文档注释再加一个边界示例（两首歌都是 0 分），运行 `cargo test` 确认文档测试被执行；
4. 故意在代码里写 `if x == true`，跑 `cargo clippy`，读提示并修复；
5. 用 `dbg!` 调试一个双层循环的函数，体验行号输出的定位效率，然后统一删除并跑 `cargo test` 确认无残留影响。

## 8. 常见问题速查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 测试通过但生产环境崩了 | 只测了典型值，漏了边界 | 补边界用例（见第 4 节） |
| `assert_eq!` 编译错误 | 类型没实现 `Debug` 或 `PartialEq` | 给类型加 `#[derive(Debug, PartialEq)]` |
| `#[should_panic]` 测试莫名通过 | panic 消息没匹配也算了通过 | 补 `expected = "..."` |
| 文档测试失败 | 示例代码不能编译或断言失败 | 修示例，或改用 ```text 标注为纯示意 |
| clippy 警告越修越多 | 老 lints 版本升级后新增规则 | `cargo clippy --fix` 自动修复大部分 |

## 9. 自我检查

1. `#[cfg(test)]` 与 `#[test]` 各自的作用是什么？没有前者会怎样？
2. 三种测试组织方式（单元/集成/文档）分别放在哪、适合测什么？
3. `assert_eq!(v.first(), Some(&1))` 里的 `&` 是为什么？
4. 返回 `Result` 的测试和 `#[should_panic]` 为什么不能同时用？
5. `dbg!` 比 `println!` 多输出什么？传变量时要注意什么？

## 本章总结

Rust 的质量防线分三层：编译器挡住类型与借用错误（前几篇），clippy 挡住可疑写法，测试挡住逻辑错误。测试本身只有一个心智模型——失败即 panic；工程上记住四件事：边界值优先、`should_panic` 带上 `expected`、文档测试让示例永不撒谎、CI 强制 check/clippy/fmt/test 四连。调试三板斧按场景选：`dbg!` 快速看值、断点调试追复杂流程、`RUST_BACKTRACE` 还原 panic 现场。

## 下一步

测试就位后，下一篇进入 [异步编程与 Tokio](/rust/130-RustAsyncTokio)：学会在高并发场景下写服务，并用本文的测试方法给异步代码保驾护航。
