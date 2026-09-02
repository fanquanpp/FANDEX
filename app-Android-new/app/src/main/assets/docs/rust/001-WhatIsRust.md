---
order: 10
title: Rust 是什么：安全与性能兼得的系统语言
module: 'rust'
category: 后端技术
difficulty: beginner
description: 面向零基础读者介绍 Rust 的定位、所有权思想与适用场景，完成第一次编译运行。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'rust/002-RustOverview'
  - 'rust/003-RustEnvSetup'
prerequisites:
  - 'getting-started/002-WhatIsProgramming'
---

## Rust 在技术版图中的位置

Rust 连续多年被评为"最受喜爱的编程语言"（Stack Overflow 调查）。它的生态位非常清晰：**达到 C/C++ 的运行性能，同时从语言层面消灭内存类崩溃与漏洞**。微软、Google、亚马逊都在用 Rust 重写关键基础设施；Linux 内核已正式接纳 Rust 代码。

| 方向 | 说明 |
| --- | --- |
| 系统工具 | ripgrep、fd 等新一代命令行工具 |
| Web 后端 | Actix、Axum 高性能框架 |
| 嵌入式与 WASM | 无 GC、体积小，天然适合 |
| 区块链 | 主流链的多数核心实现 |

## 所有权：Rust 灵魂的直觉版

传统两条路线各有代价：C/C++ 手动管内存，快但容易崩溃与泄漏；Java/Python 由垃圾回收器自动管，安全但运行时有开销。Rust 的答案是第三条路——**所有权（ownership）**：编译器在编译期用一套规则精确管理每块内存的"归属"，既无手动管理也无运行时开销。

```rust
fn main() {
    let s1 = String::from("你好");
    let s2 = s1;              // 所有权移交给 s2
    // println!("{}", s1);    // 编译错误：s1 已失效
    println!("{}", s2);       // 正常
}
```

报错信息会精确告诉你"值在这里被移动了，不能再使用"。**把编译器当作最严格的导师，是学 Rust 的正确心态**——前期编译不过的挫败，换来的是上线后极低的崩溃率。

## 第一次编译运行

安装 Rust 工具链后（见 [Rust 环境搭建](/rust/003-RustEnvSetup)），标准流程是通过包管理器 Cargo：

```bash
cargo new hello   # 创建项目骨架
cd hello
cargo run         # 编译并运行
```

把 `src/main.rs` 改成：

```rust
fn main() {
    let names = ["学习者", "工程师", "架构师"];
    for name in names {
        println!("你好，{name}");
    }
}
```

Cargo 统一管理依赖、构建、测试、文档——这种"官方一体化工具体验"是 Rust 工程师幸福感的重要来源。

## 常见困惑

**"零基础直接学 Rust 可以吗？"**——可以，但所有权概念需要耐心。本仓库建议主线先学一门带垃圾回收的语言（JavaScript 或 Python）建立编程思维，再进入 Rust，曲线会平缓很多。

**"编译器一直报错怎么办？"**——这正是 Rust 的教学过程：它的报错信息是所有语言里最友好的，按提示逐条修复即可。编译通过的 Rust 程序，一大类内存错误已经不可能存在。

## 下一步

进入 [Rust 概述](/rust/002-RustOverview) 系统开始主线；学到所有权与借用章节时，务必配合练习题动手，仅靠阅读无法建立直觉。
