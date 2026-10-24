---
order: 50
title: 模块系统与代码组织
module: 'rust'
category: 后端技术
difficulty: beginner
description: mod 与模块树、pub 可见性、use 引入习惯用法、src/main.rs 与 lib.rs 的二分、多文件项目组织
author: fanquanpp
updated: '2026-10-07'
related:
  - 'rust/030-RustEnvSetup'
  - 'rust/040-RustBasicSyntax'
  - 'rust/190-RustCargoAdvanced'
prerequisites:
  - 'rust/030-RustEnvSetup'
  - 'rust/040-RustBasicSyntax'
---

## 前置知识

- [环境搭建与工具链](/rust/030-RustEnvSetup)：知道 `cargo new` 生成的项目目录长什么样；
- [Rust 基础语法](/rust/040-RustBasicSyntax)：会写函数与结构体——本文教你把它们装进模块。

## 知识点地图

- **知识类别**：语言级代码组织——模块（mod）、可见性（pub）、路径（`crate::` / `super::`）、`use` 引入，以及 crate 内部的文件布局（main.rs 与 lib.rs 的二分）。Cargo 层面的多包管理（workspace）见 [Cargo 工程化](/rust/190-RustCargoAdvanced)，本文只管「一个包内部怎么长」。
- **解决什么问题**：代码一多全堆在 `main.rs` 里——几百行后函数找不到、同名类型冲突、想复用的逻辑和入口脚本搅在一起拆不出来。模块系统给出「按功能分文件、按树形管可见性」的官方答案。
- **什么时候用到**：第一个超过 100 行的程序；第一次想让两个函数同名（如两个模块各自的 `parse`）；第一次想把可复用逻辑抽成库给多个二进制用。
- **本篇不讲**：跨包的依赖与版本管理（workspace，见 190 篇）；模块与单元测试的配合写法（`#[cfg(test)]`，见 [测试与调试](/rust/120-RustTestingDebugging)）。

## 学习目标

读完本文你将能够：

1. 用 `mod` 划分模块树，说清「模块树」与「文件目录树」的对应关系；
2. 用 `pub` 精确开放可见性，解释为什么 Rust 默认一切私有；
3. 按 `crate::` / `super::` / `self::` 三种前缀写出正确路径，并用 `use` 按生态习惯引入；
4. 把单文件项目拆成 `src/lib.rs` + 多个模块文件，理清 main.rs 与 lib.rs 的分工；
5. 遇到 `module not found`、`private`、`unresolved import` 三类报错能独立定位。

预计 45 分钟。

## 1. 你现在要解决什么问题

先看一个真实项目长大后的 `main.rs`（日志分析 CLI）：

```rust
// src/main.rs —— 700 行之后的样子（节选）
fn parse_args() -> Args { /* ... */ }
fn read_log(path: &str) -> Vec<LogLine> { /* ... */ }
fn parse_line(line: &str) -> Option<LogLine> { /* ... */ }
fn count_by_level(lines: &[LogLine]) -> HashMap<String, usize> { /* ... */ }
fn render_report(counts: &HashMap<String, usize>) -> String { /* ... */ }
// 还有 TestRecord、parse_test_line、count_test_results……测试数据相关的函数也挤在这里

struct LogLine { level: String, message: String }
struct Args { path: String, verbose: bool }

fn main() {
    let args = parse_args();
    let lines = read_log(&args.path);
    let counts = count_by_level(&lines);
    println!("{}", render_report(&counts));
}
```

三个症状会先后出现：

- **找不动**：参数解析、文件读取、统计、渲染四类职责犬牙交错，改渲染要滚过 500 行统计代码；
- **撞名**：日志解析要一个 `parse_line`，后来加的测试数据分析也要 `parse_line`——参数不同还能凑合，一旦同名同签名就编译不过；
- **拆不开**：同事想复用你的统计逻辑，你只能把半个 `main.rs` 复制给他。

模块系统是 Rust 给出的结构性答案：**代码按功能装进模块，模块组成一棵树，树上的每个东西默认私有、你想公开谁就标谁**。这一篇把这套系统一次讲透。

## 2. 包、crate 与模块：三层容器

动手前先理清三层术语，The Book 第 7 章的开篇概念：

| 层 | 是什么 | 对应实物 |
| --- | --- | --- |
| 包（package） | 一个 `Cargo.toml` 描述的交付单元 | 你 `cargo new` 出来的整个文件夹 |
| crate | 一个编译单元：库（lib）或二进制（bin） | `src/lib.rs` 或 `src/main.rs` 为根的整棵代码树 |
| 模块（mod） | crate 内部的分区单元 | `mod` 关键字或一个 `.rs` 文件 |

```text
logtool/                  <- 包（package）
├── Cargo.toml
└── src/
    ├── main.rs           <- 二进制 crate 的根（crate root）
    ├── args.rs           <- 模块
    ├── parse.rs          <- 模块
    └── report.rs         <- 模块
```

讲解：一个包可以同时含一个库 crate 和多个二进制 crate（`src/bin/` 下的每个文件各成一个二进制），但**模块只存在于 crate 内部**——所以「跨包复用代码」是 Cargo 的依赖问题，不是 mod 的问题。初学阶段先记住：`cargo new` 一次就是一个包；包内怎么分文件，是本文的主题。

## 3. mod 与模块树：代码的目录

### 3.1 用 mod 声明模块

```rust
// src/main.rs
mod args;       // 告诉编译器：去读 src/args.rs，作为名为 args 的模块
mod parse;      // 读 src/parse.rs
mod report;     // 读 src/report.rs

fn main() {
    let a = args::parse();
    let lines = parse::read_file(&a.path);
    report::print(&lines);
}
```

```rust
// src/args.rs —— 模块文件内部无需再写 mod args
pub struct Args {
    pub path: String,
    pub verbose: bool,
}

pub fn parse() -> Args {
    Args {
        path: std::env::args().nth(1).unwrap_or_else(|| "app.log".into()),
        verbose: false,
    }
}
```

逐行讲解：

- `mod args;` 的分号不可省——带分号的 `mod x;` 是「引入外部文件」，不带分号的 `mod x { ... }` 是「内联模块」。写成 `mod args { }` 又留着 `src/args.rs`，那个文件不会被编译，这是新手最常踩的静默陷阱（编辑器不报错，但改了文件不生效）；
- 模块文件内部**不需要**再声明自己叫什么，文件路径 `src/args.rs` 就是模块 `args` 的全部身份；若模块还有子模块，则放在 `src/args/` 目录下（见 3.3 节）；
- `pub` 是「对模块外可见」。去掉 `args.rs` 里的 `pub`，`main.rs` 里的 `args::parse()` 直接编译错误 E0603：`function parse is private`——Rust 默认一切私有，想公开必须逐个声明，这是「最小暴露面」的编译期保障。

### 3.2 模块树与路径：crate::、super::、self::

`mod` 声明组成一棵以 crate 根为顶的树：

```text
crate（根：main.rs 或 lib.rs）
├── args
├── parse
│   └── tests        （parse.rs 里 mod tests { }）
└── report
```

访问树上的东西用路径，三种前缀：

```rust
// src/parse.rs
use crate::args::Args;        // crate:: 从 crate 根出发（绝对路径）

pub fn read_file(path: &str) -> Vec<String> {
    std::fs::read_to_string(path)
        .unwrap_or_default()
        .lines()
        .map(|l| l.to_string())
        .collect()
}

mod tests {
    use super::*;             // super:: 从父模块出发（相对路径）——tests 的父是 parse

    #[test]
    fn read_empty() {
        let v = super::read_file("nonexistent.log");
        assert!(v.is_empty());
    }
}
```

讲解：

- `crate::` 是绝对路径，工程代码的默认选择——文件被移动后路径依然成立；`super::` 是相对路径，最典型的用途就是测试模块里引用父模块的私有项（私有性对子模块不生效，子模块看得见父模块的一切）；
- `self::` 指当前模块，用得少；还有第三种相对写法直接写 `args::parse()`——从当前模块找名为 args 的子模块或 use 进来的名字，歧义时编译器会提示你补前缀；
- 易错点：**模块树不是目录树**。`mod` 声明在哪里，模块就挂在树的哪里——`lib.rs` 里声明 `mod args`，那 `args` 的父就是 crate 根，与物理目录无关。路径永远按模块树走，不按文件夹走。

### 3.3 模块再分文件：目录式组织

模块大了以后，`parse.rs` 里再声明 `mod tests;`，对应文件放哪？2018 edition 起的推荐布局：

```text
src/
├── parse.rs            <- mod parse 本体：声明、公共 API
└── parse/
    └── tests.rs        <- 子模块文件
```

老项目里还有 `src/parse/mod.rs` 风格（把 `parse.rs` 换成 `parse/mod.rs`），两种并存会报 `file for module found at both` 错误。新代码统一用 `parse.rs + parse/` 目录：文件顶层一眼看到模块公共接口，细节收进同名目录——这个习惯对 reviewer 极友好。

## 4. pub 与可见性：默认全私有的设计

### 4.1 可见性的粒度

`pub` 可以精确标注到每个字段、每个方法：

```rust
// src/parse.rs
pub struct LogLine {
    pub level: String,      // 外部可读写字段
    message: String,        // 私有字段：外部只能经方法访问
}

impl LogLine {
    pub fn new(level: &str, message: &str) -> Self {
        LogLine { level: level.into(), message: message.into() }
    }
    pub fn message(&self) -> &str {
        &self.message
    }
}
```

讲解：注意反直觉的一点——**`pub struct` 不等于字段公开**。字段默认仍是私有的，外部想构造 `LogLine` 只能走 `new`。这正好是封装的工具：把 `level` 直接公开（改起来随便），把 `message` 藏起来（读取走方法，将来加截断、脱敏不动调用方）。换成「struct 和字段全 pub」会发生什么：调用方开始到处直接拼 `LogLine { level: ..., message: ... }`，你从此不能给这个结构体加字段、改字段类型——每个直接构造点都是破坏性变更。

### 4.2 限定可见性：pub(crate) 与 pub(super)

```rust
pub(crate) fn internal_normalize(s: &str) -> String { s.trim().to_lowercase() }
pub(super) fn helper_for_parent() {}
```

讲解：`pub` 一旦标上，就对整个 crate 外的世界开放（如果这个 crate 是库）。想在 crate 内共享但不对下游暴露，用 `pub(crate)`（全 crate 可见）；只想让父模块用，`pub(super)`。工程习惯：先写 `pub(crate)`，等下游真的需要再升 `pub`——收紧容易放开难，API 一旦公开就是承诺。完整可见性规则（`pub(in path)` 等更细粒度）见标准库参考，日常 `pub` / `pub(crate)` / `pub(super)` 三档覆盖九成场景。

## 5. use：把路径变短

### 5.1 基本引入与习惯用法

```rust
use crate::parse::LogLine;              // 引入类型本体
use std::collections::HashMap;          // 引入标准库类型
use std::io::Write as IoWrite;          // 改名避免冲突
```

`use` 的写法有一套官方风格指南（rustfmt 会强制执行），照做能与全生态代码保持一致：

```rust
// 函数：引入到父模块，调用时带模块名——来源一目了然
use crate::parse;                       // 然后写 parse::read_file(..)

// 结构体/枚举：直接引入本体——构造时写全名太啰嗦
use crate::parse::LogLine;              // 然后写 LogLine::new(..)

// trait：必须引入本体（否则方法不可见）
use std::io::Write;                     // 然后才能 file.write_all(..)
```

逐条讲为什么：

- 函数走 `use crate::parse;` 再写 `parse::read_file()` 而不是 `use crate::parse::read_file;`——调用点带着模块名，读代码的人不用跳定义就知道函数来自哪；类型（`LogLine`、`HashMap`）使用频率高且构造语法本身自带类型名，直接引入不损失信息；
- **trait 是例外**：Rust 的方法解析只认「作用域里的 trait」，`use std::io::Write;` 不写的话，`file.write_all(..)` 根本编译不过——这是新手最常见的「方法明明存在却报 not found」；
- 两个同名类型冲突时 `as` 改名，或保留全路径不 use。

### 5.2 嵌套引入与 glob

```rust
// 嵌套写法合并同前缀引入（rustfmt 会自动整理成这种形态）
use std::collections::{HashMap, HashSet};
use std::io::{self, Write};            // io 本体 + io::Write 一起拿

// glob：引一个模块的全部公开项
use crate::parse::tests::*;
```

讲解：`use std::io::{self, Write}` 里的 `self` 指 `io` 模块自己——一句同时拿到 `io::stdin()` 与 `Write` trait。glob（`*`）只在两处合理：测试模块里 `use super::*`，以及 `use tracing::*` 这类「模块本身就是命名空间」的日志宏场景。业务代码里滥用 glob 会让 `grep` 失效——看到一个函数名却搜不到 `use` 行，排查成本陡增。

## 6. main.rs 与 lib.rs：一个包的两种 crate

这是工程 Rust 最重要的一刀。当包里同时放 `src/lib.rs` 与 `src/main.rs`：

```text
logtool/
├── Cargo.toml
└── src/
    ├── lib.rs           <- 库 crate：全部可复用逻辑的根
    ├── main.rs          <- 二进制 crate：只有入口几行
    ├── args.rs          <- 模块，属于 lib crate
    ├── parse.rs
    └── report.rs
```

```rust
// src/lib.rs —— 库的根：像 main.rs 一样用 mod 收拢模块
pub mod args;
pub mod parse;
pub mod report;
```

```rust
// src/main.rs —— 二进制的根：把库当依赖用
use logtool::args;      // 注意：库名（Cargo.toml 的 package.name，这里 logtool）
                        // 就是它的 crate 名，同包内的二进制自动依赖这个库

fn main() {
    let a = args::parse();
    let lines = logtool::parse::read_file(&a.path);
    logtool::report::print(&lines);
}
```

逐段讲解：

- **职责二分**：库放「逻辑」（解析、统计、数据模型），二进制只放「接线」（读参数、调库、退出码）。集成测试（`tests/` 目录）只能测库 crate——逻辑全堆在 main.rs 里就没法做集成测试，这是这个二分最硬的理由；
- `main.rs` 里 `use logtool::...` 引的是**库 crate 的根**，所以 `lib.rs` 里必须 `pub mod` 才能从外面看见；库内部的模块互相引用时依然写 `crate::parse`——`crate::` 在 lib.rs 语境下指库自己；
- 易错点：`main.rs` 与 `lib.rs` **不能重复声明同一个模块**（两边都写 `mod parse;` 会把 parse.rs 编译两遍，类型被判为两个不同类型，跨 crate 传参报类型不匹配）。规则一句话：模块声明只活在 lib.rs，main.rs 只 use；
- 换成「只有 main.rs」会发生什么：单元测试还能写（模块内 `#[cfg(test)]`），但集成测试、benchmark、被别的包依赖全都免谈——所以真实项目几乎一律走 lib+bin 二分。

## 7. 三个工程场景

### 场景一：日志分析 CLI 的完整模块化（真实工程）

真实背景：运维同事有个 200MB 的应用日志要按级别统计、抽样错误行，写个 CLI 跑批。按「参数、解析、报告」三个功能切分，逻辑进库、入口极薄：

```text
logtool/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── main.rs
    ├── args.rs
    ├── parse.rs
    └── report.rs
```

```rust
// src/parse.rs
use std::collections::HashMap;

pub struct LogLine {
    pub level: String,
    pub message: String,
}

pub fn parse_line(line: &str) -> Option<LogLine> {
    let (level, message) = line.split_once(' ')?;
    let level = level.trim_matches(['[', ']']).to_uppercase();
    Some(LogLine { level, message: message.into() })
}

pub fn count_by_level(lines: &[LogLine]) -> HashMap<&str, usize> {
    let mut counts = HashMap::new();
    for l in lines {
        *counts.entry(l.level.as_str()).or_insert(0) += 1;
    }
    counts
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skips_malformed() {
        assert!(parse_line("没有空格的行").is_none());
    }
}
```

```rust
// src/main.rs
use logtool::{args, parse, report};

fn main() {
    let a = args::parse();
    let lines: Vec<_> = std::fs::read_to_string(&a.path)
        .unwrap_or_else(|e| {
            eprintln!("读文件失败: {e}");
            std::process::exit(1);
        })
        .lines()
        .filter_map(parse::parse_line)
        .collect();
    report::print(&parse::count_by_level(&lines));
}
```

讲解：对照第 1 节的翻车现场——四类职责各归各文件，`filter_map(parse::parse_line)` 一行完成「解析 + 过滤坏行」；`exit(1)` 前打 stderr 是 CLI 惯例（stdout 留给管道消费的正常输出）。统计函数 `count_by_level` 的写法用了 090 篇的 `entry` 模式，模块化让这些「算法片段」第一次有了独立安放的位置。

### 场景二：游戏数据模型的模块树（嵌套模块）

真实背景：一个小型 Roguelike 要管理角色、物品、地图三类数据，物品还有武器/消耗品两族。嵌套模块让「族」落在类型系统里：

```text
src/
├── lib.rs
└── game/
    ├── mod.rs            <- game 模块本体（目录式布局的另一形态：小模块直接用 mod.rs）
    ├── character.rs
    ├── map.rs
    └── item/
        ├── mod.rs
        ├── weapon.rs
        └── consumable.rs
```

```rust
// src/game/item/mod.rs
pub mod weapon;
pub mod consumable;

#[derive(Debug)]
pub struct ItemBase {
    pub id: u32,
    pub name: String,
}

impl ItemBase {
    pub fn label(&self) -> String {
        format!("[{}] {}", self.id, self.name)
    }
}
```

```rust
// src/game/item/weapon.rs
use super::ItemBase;              // super = game::item

#[derive(Debug)]
pub struct Weapon {
    pub base: ItemBase,
    pub damage: u32,
}

impl Weapon {
    pub fn attack_text(&self) -> String {
        format!("{} 造成 {} 点伤害", self.base.label(), self.damage)
    }
}
```

```rust
// src/lib.rs
pub mod game;

// 深层类型从 crate 根引用
use crate::game::item::weapon::Weapon;
```

讲解：`super::ItemBase` 展示了子模块引用父模块私有/公开项的写法——`weapon.rs` 与 `ItemBase` 同属 `game::item` 模块，不需要 `crate::game::item::ItemBase` 全路径。注意 `game/mod.rs` 与 `game.rs` 两种布局的适用面：模块还有子目录时用 `mod.rs` 最直观（`game/` 目录整体就是模块），只有一个文件时用 `game.rs`。同一项目内**统一选一种**，混用是 code review 的常见噪音源。

### 场景三：lib+bin 二分的小型 web 后端

真实背景：内部工具「库存看板」是一个 axum 小服务，同时还要出一个「初始化数据库」的命令行工具——两个二进制共用一套数据模型与仓储逻辑，正对 lib+bin 的刀口：

```text
invboard/
├── Cargo.toml
└── src/
    ├── lib.rs           <- 模型与仓储：两个二进制共用
    ├── model.rs
    ├── store.rs
    ├── main.rs          <- 二进制 1：web 服务
    └── bin/
        └── init_db.rs   <- 二进制 2：cargo run --bin init_db
```

```rust
// src/model.rs
#[derive(Debug, Clone)]
pub struct Sku {
    pub code: String,
    pub qty: i64,
}
```

```rust
// src/store.rs
use crate::model::Sku;

pub struct Store {
    rows: Vec<Sku>,
}

impl Store {
    pub fn in_memory() -> Self {
        Store { rows: Vec::new() }
    }
    pub fn upsert(&mut self, sku: Sku) {
        match self.rows.iter_mut().find(|s| s.code == sku.code) {
            Some(existing) => existing.qty = sku.qty,
            None => self.rows.push(sku),
        }
    }
    pub fn all(&self) -> &[Sku] {
        &self.rows
    }
}
```

```rust
// src/lib.rs
pub mod model;
pub mod store;
```

```rust
// src/main.rs —— web 服务入口
use invboard::store::Store;

fn main() {
    let mut store = Store::in_memory();
    // 真实项目这里接 axum 路由（见 140 篇歌曲 API）
    store.upsert(invboard::model::Sku { code: "A-1".into(), qty: 10 });
    for s in store.all() {
        println!("{s:?}");
    }
}
```

```rust
// src/bin/init_db.rs —— 自动成为第二个二进制
use invboard::store::Store;

fn main() {
    let mut store = Store::in_memory();
    store.upsert(invboard::model::Sku { code: "A-1".into(), qty: 0 });
    println!("初始数据就绪");
}
```

讲解：`src/bin/` 下每个文件自动各成一个二进制，`cargo run` 跑 web、`cargo run --bin init_db` 跑初始化——共享逻辑的改动一次生效两处。对比「复制一份 store.rs 进 init_db」会发生什么：修 bug 只修了服务端，初始化工具还带着旧逻辑，这类「双份代码漂移」是内部工具烂掉的常见起点。

## 8. 常见错误与对策

| 编译错误 | 原因 | 对策 |
| :--- | :--- | :--- |
| `file not found for module` | `mod x;` 但 `src/x.rs` 不存在（或目录写错） | 核对文件名与 mod 名一致（下划线规则同变量） |
| `file for module found at both x.rs and x/mod.rs` | 两种布局并存 | 二选一删除另一个 |
| E0603 `... is private` | 目标项没标 `pub`，或标注在了错误的层级 | 检查「模块本身」与「模块内的项」是否都 pub |
| `unresolved import` | use 路径写错（常混淆 crate:: 与 self::） | 从 crate 根数一遍模块树；IDE 补全优先 |
| `can't find crate`（main.rs 引模块失败） | 模块声明写在 main.rs 而逻辑想走 lib | 模块声明收拢进 lib.rs，main.rs 只 use 库名 |
| 改了文件却没生效 | 写了内联 `mod x { }` 盖住了同名文件 | 删掉内联块或删掉多余文件 |

## 9. 动手实践

**任务：把 040 篇的单文件项目拆成三个模块（约 30 分钟）**

起点是 [Rust 基础语法](/rust/040-RustBasicSyntax)篇的综合示例（`sum_odd` 与 `main` 挤在一个 main.rs 里）。先把它扩展成下面这个「歌单统计」单文件（沿用全系列的虚拟歌手音乐平台设定）：

```rust
// 起点单文件：src/main.rs
struct Song {
    title: String,
    plays: u32,
}

fn total_plays(songs: &[Song]) -> u32 {
    songs.iter().map(|s| s.plays).sum()
}

fn top_song(songs: &[Song]) -> Option<&Song> {
    songs.iter().max_by_key(|s| s.plays)
}

fn main() {
    let songs = vec![
        Song { title: "星屑".into(), plays: 1200 },
        Song { title: "初雪".into(), plays: 980 },
    ];
    println!("总播放 {}", total_plays(&songs));
    if let Some(s) = top_song(&songs) {
        println!("最热 {}", s.title);
    }
}
```

要求：拆成 `model`（Song）、`stats`（total_plays、top_song）、`main.rs` 三个部分，逻辑放进 `src/lib.rs` 管辖的库 crate，`main.rs` 只留入口；字段与函数按需标 pub（不给没用的 pub）；`main.rs` 里调用时用 `use` 引入，写法遵守第 5 节习惯（类型引本体、模块引父）。

提示：先建 `src/lib.rs` 写两个 `pub mod`；Song 的字段要 pub，否则 main.rs 构造不了；`total_plays`/`top_song` 只在库内用还是给 main 用，决定标不标 pub。

参考实现（先自己写完再展开对照）：

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```text
src/
├── lib.rs
├── model.rs
├── stats.rs
└── main.rs
```

```rust
// src/lib.rs
pub mod model;
pub mod stats;
```

```rust
// src/model.rs
pub struct Song {
    pub title: String,
    pub plays: u32,
}
```

```rust
// src/stats.rs
use crate::model::Song;

pub fn total_plays(songs: &[Song]) -> u32 {
    songs.iter().map(|s| s.plays).sum()
}

pub fn top_song(songs: &[Song]) -> Option<&Song> {
    songs.iter().max_by_key(|s| s.plays)
}
```

```rust
// src/main.rs
use songs::model::Song;
use songs::stats;

fn main() {
    let songs = vec![
        Song { title: "星屑".into(), plays: 1200 },
        Song { title: "初雪".into(), plays: 980 },
    ];
    println!("总播放 {}", stats::total_plays(&songs));
    if let Some(s) = stats::top_song(&songs) {
        println!("最热 {}", s.title);
    }
}
```

要点：`stats.rs` 用 `crate::model::Song`（库内绝对路径），`main.rs` 用包名 `songs::...`（库 crate 名以你的 `Cargo.toml` 为准，连字符项目名会转成下划线）；`Song` 字段标 pub 是因为 main.rs 要构造字面量——若将来给 model 加 `Song::new`，字段就能收回私有，封装随需要收紧。顺手验证：把 `stats` 模块在 lib.rs 里的 `pub` 去掉，main.rs 立刻报 private——可见性两层（模块、项）各自把关。

</details>

## 10. 与之前和之后的知识的关系

- 往前：[环境搭建与工具链](/rust/030-RustEnvSetup)给出的项目骨架正是本文布局的起点；040 篇的单文件程序是本次拆分练习的原料；
- 往后：[测试与调试](/rust/120-RustTestingDebugging)的 `#[cfg(test)]` 模块与本文的 `super::` 配合是天作之合；[Cargo 工程化](/rust/190-RustCargoAdvanced)把「一个包」升级为「workspace 多包」，复用的粒度从模块上升到 crate。

## 参考与致谢

- The Rust Programming Language（The Book）第 7 章 Managing Growing Projects with Packages, Crates, and Modules：https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html（开放许可：MIT OR Apache-2.0，本文模块树、可见性与 use 习惯用法的框架对照该章组织）
- Rust API Guidelines（命名与 use 风格）：https://rust-lang.github.io/api-guidelines/

## 小结

模块系统三层容器：包管交付、crate 管编译、模块管分区。`mod` 声明模块树，`pub` 逐层开闸（默认全私有），`crate::` 绝对路径、`super::` 指父模块；`use` 按习惯引入——函数带模块名、类型引本体、trait 必须 use。lib.rs 与 main.rs 的二分让「逻辑」与「入口」分离，集成测试与多二进制都靠它。一句话记忆：**mod 分文件、pub 开闸门、use 缩路径、lib 装逻辑**——代码一多，先拆模块。

> **动手提示**：打开你手头最大的那个 `main.rs`，按「职责」列出 3-5 个候选模块名，跑一遍本文动手实践的拆分流程——拆完跑 `cargo test`，绿了就说明搬移无损。
