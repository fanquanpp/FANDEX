---
order: 80
title: Rust 错误处理
module: 'rust'
category: 后端技术
difficulty: beginner
description: panic 与 Result、? 运算符、unwrap/expect、自定义错误与错误转换
author: fanquanpp
updated: '2026-08-30'
related:
  - 'rust/007-RustStructEnumMatch'
  - 'rust/010-RustGenericTrait'
prerequisites:
  - 'rust/007-RustStructEnumMatch'
---


## 1. 从"外卖送餐"说起：错误处理的两条路径

想象点外卖：**餐厅没营业**（不可恢复——这家店永远送不了）和 **今天路上堵车**（可恢复——换个时间或路线还能送到）是两种完全不同的情况，处理方式也该不同。

Rust 把错误分成两类，处理方式截然不同：

| 错误类型 | 场景 | 处理方式 |
| --- | --- | --- |
| 不可恢复错误 | 程序无法继续（如数组越界、断言失败） | panic：展开并退出（可配置为直接终止） |
| 可恢复错误 | 文件不存在、网络超时、解析失败 | `Result<T, E>`：返回错误值，由调用方决定 |

设计哲学：**用类型表达失败**——函数签名里的 `Result` 就是文档，调用方被迫处理错误，不存在"悄悄失败"。

## 2. panic：不可恢复错误

```rust
fn main() {
    let v = vec![1, 2, 3];
    println!("{}", v[99]); // 越界访问 -> panic
}
```

讲解：越界、整数溢出（debug 模式）、显式 `panic!("msg")` 都会触发。panic 会打印错误信息、源码位置与回溯栈，然后回滚当前线程栈并释放资源（unwind）。

```rust
fn main() {
    panic!("出错了");          // 显式触发
    assert!(1 > 2, "断言失败"); // 断言失败也会 panic
}
```

讲解：`assert!` 系列宏在测试与内部不变量检查中常用。`panic!` 应在"程序无法继续"时使用，普通业务失败不要用 panic。

## 3. Result：可恢复错误

标准库的 `Result` 枚举（带两个泛型参数）：

```rust
enum Result<T, E> {
    Ok(T),   // 成功，携带结果值
    Err(E),  // 失败，携带错误值
}
```

```rust
use std::fs::File;
use std::io::Read;

fn read_whole(path: &str) -> Result<String, std::io::Error> {
    let mut f = File::open(path)?;   // ? 失败则提前返回 Err
    let mut content = String::new();
    f.read_to_string(&mut content)?; // ? 自动转换错误类型（此处同为 io::Error）
    Ok(content)
}
```

讲解：`?` 是错误处理的语法糖：`Ok(v)` 则解出 v 继续，`Err(e)` 则立即把 e 返回给调用方。函数返回类型必须为 `Result`（或 `Option`）才能用 `?`。

### 3.1 处理 Result 的常见方式

```rust
use std::fs;

// 方式一：match 显式处理
match fs::read_to_string("a.txt") {
    Ok(text) => println!("内容：{text}"),
    Err(e) => eprintln!("读取失败：{e}"),
}

// 方式二：unwrap——成功取 Ok，失败 panic（仅原型/测试使用）
let text = fs::read_to_string("a.txt").unwrap();

// 方式三：expect——panic 时附带自定义信息
let text = fs::read_to_string("a.txt")
    .expect("a.txt 必须存在");

// 方式四：unwrap_or——失败用默认值兜底
let text = fs::read_to_string("a.txt").unwrap_or_default();
```

讲解：`unwrap`/`expect` 遇到 Err 会 panic，仅适合"这个错误不可能发生"或原型阶段；生产代码用 `?` 或 match 显式处理。`eprintln!` 输出到标准错误流。

### 3.2 Result 与 Option 互转

```rust
// ok_or：Option -> Result
let maybe: Option<i32> = Some(42);
let result = maybe.ok_or("值不存在")?;   // 得 Result<i32, &str>

// 常用组合：链式 + ok_or
let port: u16 = "8080"
    .parse::<u16>()
    .ok()
    .ok_or("端口格式错误")?;
```

讲解：`ok_or` 让 Option 也能用 `?` 传播错误；`ok()` 把 Result 降级为 Option。二者配合可统一"可空 + 可失败"的处理链。

## 4. 自定义错误类型

业务系统应定义自己的错误类型，而不是到处用字符串。推荐用 `thiserror` 派生宏简化样板：

```toml
[dependencies]
thiserror = "2"
```

```rust
use thiserror::Error;

#[derive(Debug, Error)]
enum AppError {
    #[error("配置缺失：{key}")]
    MissingConfig { key: String },

    #[error("网络错误：{0}")]
    Network(#[from] std::io::Error),

    #[error("解析失败：{0}")]
    Parse(String),
}

fn load_config() -> Result<String, AppError> {
    let raw = std::fs::read_to_string("config.toml")?; // io::Error 自动转 Network
    if raw.is_empty() {
        return Err(AppError::MissingConfig { key: "config.toml".into() });
    }
    Ok(raw)
}
```

讲解：`#[derive(Error)]` 自动实现 `Display`（按 `#[error(...)]` 模板）与 `std::error::Error`；`#[from]` 生成 `From` 转换，使 `?` 能自动把 `io::Error` 转成 `AppError::Network`。

纯标准库实现（不引依赖）的原理：

```rust
#[derive(Debug)]
struct MyError(String);

impl std::fmt::Display for MyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "自定义错误：{}", self.0)
    }
}
impl std::error::Error for MyError {}
```

讲解：`std::error::Error` trait 要求类型同时实现 `Debug` 与 `Display`；手写这段代码就是 thiserror 替你生成的内容。

## 5. 错误转换：让 ? 自动工作

`?` 依赖 `From` trait 把底层错误转换为函数声明的错误类型：

```rust
use std::fs;
use std::net::IpAddr;

fn load_and_parse() -> Result<IpAddr, Box<dyn std::error::Error>> {
    let raw = fs::read_to_string("ip.txt")?;  // io::Error -> Box<dyn Error>
    let ip: IpAddr = raw.trim().parse()?;     // ParseIntError -> Box<dyn Error>
    Ok(ip)
}
```

讲解：`Box<dyn Error>` 是"万能错误容器"，任何实现了 `Error` 的类型都能 `?` 进去——适合快速原型。大型项目建议用 thiserror 定义精确错误类型，便于调用方按类型分支处理。

## 6. main 函数返回 Result

main 返回 `Result` 时，Err 会以非零退出码结束程序并打印 Debug 信息：

```rust
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string("a.txt")?;   // 失败直接退出
    println!("{content}");
    Ok(())
}
```

讲解：这是小型 CLI 工具的标准写法：错误沿 `?` 一路向上，main 兜底退出。也常用 `Result<(), AppError>`。

## 7. 常见错误处理模式对比

| 场景 | 推荐写法 |
| --- | --- |
| 原型/教学代码 | unwrap / expect |
| 普通业务函数 | `?` + 自定义错误类型 |
| 命令行工具 | main 返回 Result |
| 配置缺失等"不可能"情况 | expect 带清晰信息 |
| 错误后继续处理其他任务 | match 分分支处理 |

## 8. 综合示例：小型文件统计工具

```rust
use std::fs;
use std::io;

fn count_lines(path: &str) -> Result<usize, io::Error> {
    let content = fs::read_to_string(path)?;
    Ok(content.lines().count())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    for path in ["a.txt", "b.txt"] {
        match count_lines(path) {
            Ok(n) => println!("{path}: {n} 行"),
            Err(e) => eprintln!("{path}: 读取失败 {e}"),
        }
    }
    Ok(())
}
```

讲解：核心业务函数返回 `Result<_, io::Error>` 保持精确；main 用 `Box<dyn Error>` 兜底；外层循环逐文件容错——错误"能精确时精确、能继续时继续"。

## 11. 小结

错误处理三板斧：`Result` 表达失败、`?` 简化传播、自定义错误类型提升可读性；`panic` 只留给不可恢复场景。牢记：**panic 是异常，Result 是常态**。下一步学习集合与迭代器，掌握 Rust 的日常数据处理武器库。

> **一句话记忆**：Rust 错误处理三句话——"能恢复的用 `Result`（`?` 一路传播）、不能恢复的用 `panic!`、生产代码别用 `unwrap`"；用 thiserror 定义自己的错误类型，让 `?` 自动做类型转换。
