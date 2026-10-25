---
order: 230
title: 文档注释与文档测试
module: 'rust'
category: 后端技术
difficulty: beginner
description: 三斜线文档注释与模块级文档、doctest 锁住示例、cargo doc 本地构建、docs.rs 构建差异排查
author: fanquanpp
updated: '2026-10-07'
related:
  - 'rust/140-RustEcosystemProject'
  - 'rust/120-RustTestingDebugging'
  - 'rust/190-RustCargoAdvanced'
prerequisites:
  - 'rust/120-RustTestingDebugging'
---

## 前置知识

- [测试与调试](/rust/120-RustTestingDebugging)：知道 `cargo test` 怎么跑单元与集成测试——doctest 是它管辖的第三种测试。

## 知识点地图

- **知识类别**：rustdoc 文档体系——`///` 文档注释、`//!` 模块级文档、文档测试（doctest）、`cargo doc` 本地构建与 docs.rs 在线文档的配套关系。
- **解决什么问题**：两件常见坏事。其一，示例代码写在 README 里、函数变了示例没人改，新人复制即报错；其二，API 没有文档，接手的同事只能读实现猜意图。rustdoc 的答案是：文档贴着代码写（改函数时编译器与 doctest 提醒你），示例本身就是测试（每次 `cargo test` 自动验证能编译、输出正确）。
- **什么时候用到**：给任何 `pub` 项写对外契约时；示例代码想防止过期时；发布到 crates.io 之前（docs.rs 自动构建文档，构建失败等于主页空白）；团队内部库定文档规范时。
- **本篇不讲**：crates.io 发布流程本身（见 [Cargo 工程化](/rust/190-RustCargoAdvanced)第 5 节，本文在其一笔带过的 docs.rs 处展开）；`cargo doc` 生成 HTML 的自定义主题等装饰性配置（rustdoc 官方手册级内容）。

## 学习目标

读完本文你将能够：

1. 用 `///` 与 `//!` 写出含 Examples/Panics/Errors 段落的规范文档；
2. 理解 doctest 的执行机制，用 `no_run`、`ignore`、`should_panic` 标注不同性质的示例；
3. 本地跑 `cargo doc --open` 预览，并在发布前复现 docs.rs 的构建环境排查失败；
4. 为团队库定一套「什么必须写文档、示例怎么写」的可执行规范。

预计 40 分钟。

## 1. 你现在要解决什么问题

看一段「文档过期」的翻车现场——[歌曲 API](/rust/140-RustEcosystemProject) 的一个查询函数，README 里的示例是三个月前写的：

```rust
// README.md 里的示例（已经错了，但没人发现）：
//   let song = lookup_song(42)?;
//   println!("{:?}", song.play_count);   // README 说返回值带 play_count 字段

// 实际代码（重构时字段改名了）：
pub fn lookup_song(id: u32) -> Option<Song> {
    SONGS.iter().find(|s| s.id == id).cloned()
}

struct Song {
    id: u32,
    title: String,
    // play_count 早已改名 listen_count，README 无人跟进
}
```

两个损失：新人复制 README 示例编译失败，来问你；更糟的情况是示例**能编译但语义错了**，他带着错误理解写代码。rustdoc 把「文档」和「测试」焊在一起——示例写在 `///` 注释里，`cargo test` 逐块验证，改了函数不改示例，CI 直接红。这就是本篇要建立的心智模型：**文档不是附带的散文，是会被执行的测试**。

## 2. 两级文档注释：/// 与 //!

```rust
//! 库级文档：写在 lib.rs 或 mod.rs 最顶部，描述整个 crate
//!
//! # 虚拟歌手音乐平台数据层
//!
//! 提供歌曲、歌单的内存数据模型与查询。
//! 从 [examples](#examples) 或各函数文档开始使用。

/// 按主键查找歌曲。
///
/// 返回 `None` 表示没有这首歌曲——调用方必须处理缺歌场景。
///
/// # Examples
///
/// ```
/// let song = musiclib::lookup_song(42);
/// assert_eq!(song.map(|s| s.title), Some("星屑".to_string()));
/// ```
pub fn lookup_song(id: u32) -> Option<Song> {
    SONGS.iter().find(|s| s.id == id).cloned()
}
```

逐段讲解：

- `///` 标注**它下面的那一个项**（函数、结构体、字段），支持 Markdown；`//!` 标注**它所在的整个模块**，只写在文件最顶部。写反位置（`//!` 放在函数上方）会编译报错；
- 习惯的段落标题（`# Examples`、`# Panics`、`# Errors`）是 rustdoc 的约定：`# Panics` 描述函数何时 panic（如内部 `unwrap`），`# Errors` 描述返回 `Err` 的情形——rustdoc 1.81 起的 missing_errors_doc / missing_panics_doc lint 会提醒公共 API 补这两段；
- 文档注释本质是 `#[doc = "..."]` 属性的语法糖，所以只有 `pub` 项的文档会出现在生成的文档页里——私有函数写 `///` 不报错也不展示，团队规范里通常约定私有项用普通 `//` 注释，避免误导「这有文档」。

易错点：`///` 与函数之间不能空行（空行后 rustdoc 会警告 `unused doc comment`），且要紧贴 item 的属性与可见性声明之前。

## 3. doctest：会执行的文档

### 3.1 执行机制

`cargo test` 会把每个 `///` 文档里的 Rust 代码块取出来，包进一个隐藏的 `fn main`，编译并运行：

```rust
/// 两首歌的播放量求和。
///
/// # Examples
///
/// ```
/// let plays = musiclib::total_plays(&[1200, 980]);
/// assert_eq!(plays, 2180);
/// ```
pub fn total_plays(list: &[u32]) -> u32 {
    list.iter().sum()
}
```

讲解：这个 doctest 既是文档也是测试——`cargo test` 的输出里它会以 `Doc-tests musiclib` 区块出现，失败时报告的行号指向文档注释内部。机制决定了它的特性：**示例永远与代码同步**，重构函数签名后 doctest 编译失败，逼你顺手更新文档。对比示例写 README 会发生什么：README 不参与编译，示例腐烂无人知晓。

### 3.2 三种常用标注：no_run、ignore、should_panic

不是所有示例都该「编译 + 运行」，rustdoc 提供分级标注：

````markdown
```rust
// 默认：编译 + 运行 + 断言结果（首选）
let n = musiclib::count_songs();

```no_run
// 编译 + 链接，但不执行——适合起服务器、读文件、发网络请求的示例
let listener = std::net::TcpListener::bind("0.0.0.0:8080")?;
```

```text
// 纯展示，不编译——适合展示命令行输出、目录结构
cargo run -- 查看歌单
```

```should_panic
// 断言示例会 panic——演示 API 的边界行为
let first = vec![].first().expect("列表非空");
```
````

逐条讲取舍：

- 默认模式最严格，能写就写；示例里用 `?` 返回 `Result` 是允许的（隐藏 main 返回 `Result`），所以 `File::open(..)?` 这类可以不做 `unwrap`；
- `no_run` 是网络/文件/阻塞示例的正确选择——它验证了代码**能编译**（这已经能抓住九成 API 漂移），又不真的占用端口或发请求；
- `ignore` 只保留语法高亮、完全不编译，最后手段——用了它示例就退回了 README 时代，规范里应要求注明 ignore 原因；
- 易错点：doctest 运行在独立进程，**可以**做并发行数限制之外的事（如监听端口），但会拖慢 `cargo test`——重 IO 示例一律 `no_run`，这是团队规范要写明的一条。

## 4. cargo doc：本地构建与预览

```bash
cargo doc --no-deps --open   # 只为本包生成文档并打开浏览器
cargo doc --document-private-items   # 排查时看私有项的文档
```

逐段讲解：

- `--no-deps` 跳过全部依赖的文档生成——首次不带它跑，rustdoc 会把几十个依赖全部构建一遍，等好几分钟；日常开发九成场景只要自己包的页面；
- rustdoc 对公共 API 做「破损链接」检查：`///` 里写了 `[foo](crate::bar::foo)` 而路径不存在，`cargo doc` 报 `broken_intra_doc_links`——文档里的链接和 doctest 一样被验证；
- 易错点：`cargo doc` 默认把最新构建的文档留在 `target/doc/`，docs.rs 上的页面由 CI 自动构建——**本地能看不代表 docs.rs 正常**，两边的构建环境有差异，见下一节。

## 5. docs.rs：自动构建与差异排查

[Cargo 发布流程](/rust/190-RustCargoAdvanced)里提过：发布到 crates.io 后，docs.rs 会自动把文档构建成 `https://docs.rs/<crate>/<version>`。构建失败时 crate 主页显示红条「docs.rs build failed」——用户第一眼看到的坏印象。

常见失败原因与复现方法：

| 原因 | 症状 | 本地复现 |
| :--- | :--- | :--- |
| feature 组合编译不过 | docs.rs 用 `--all-features` 构建 | `cargo doc --no-deps --all-features` |
| 默认 target 编译失败 | docs.rs 在 Linux x86_64 上构建 | 本机 Windows 上装了平台特定依赖时注意 `#[cfg]` 兜底 |
| doctest 依赖网络/文件 | 构建期 doctest 执行失败 | 找出无标注的 IO 示例，改 `no_run` |
| 构建脚本需要环境变量 | build.rs panic | 阅读构建日志的 environment 段，补默认值 |

复现一次真实失败（排查实录的标准动作）：

```bash
# 1. 先看 docs.rs 构建日志页（crate 主页 -> build failed 链接），定位到失败 step
# 2. 用对齐的参数在本地复现
cargo doc --no-deps --all-features
# 3. 若本地过了仍失败，检查 .cargo/config.toml 是否有只在你机器成立的配置，
#    以及 [package.metadata.docs.rs] 是否需要自定义构建参数
```

逐段讲解：`--all-features` 是头号差异源——docs.rs 为了给用户展示全部功能文档，默认开启所有 feature，某个 feature 背后的可选依赖在文档环境装不上，构建就挂。本地复现命令与官方建议一致（190 篇结尾一笔带过的正是这条，这里给出了完整排查链路）。当某 feature 确实无法在 docs.rs 构建时，在 `Cargo.toml` 里声明豁免：

```toml
[package.metadata.docs.rs]
all-features = true          # 默认仍建议对齐 all-features
rustdoc-args = ["--cfg", "docsrs"]   # 配合 #[cfg(docsrs)] 在文档构建时裁剪示例
```

## 6. 三个工程场景

### 场景一：给歌曲 API 的公共函数补文档（真实工程）

真实背景：[歌曲 API](/rust/140-RustEcosystemProject) 要交给第二位同事维护，先给数据层的两个公共函数补齐契约文档，doctest 锁住示例：

```rust
/// 按主键查找歌曲；返回 `None` 表示平台没有这首歌。
///
/// 复杂度 O(n)，n 为在库歌曲数；歌曲规模过千时改用 [`index_by_id`]。
///
/// # Examples
///
/// ```
/// let song = musiclib::lookup_song(1).expect("1 号歌必然在库");
/// assert_eq!(song.title, "星屑");
///
/// assert!(musiclib::lookup_song(9999).is_none());
/// ```
pub fn lookup_song(id: u32) -> Option<Song> { /* ... */ }

/// 新歌上架，返回分配到的主键。
///
/// 标题重复不会被拒绝——去重属于业务层职责。
///
/// # Examples
///
/// ```
/// let id = musiclib::create_song("初雪");
/// assert!(musiclib::lookup_song(id).is_some());
/// ```
pub fn create_song(title: &str) -> u32 { /* ... */ }
```

讲解：两个函数的文档各有分工——`lookup_song` 写明返回 `None` 的语义与复杂度承诺（调用方据此决定要不要建索引），`create_song` 主动声明「重复不拒绝」这条容易被误读的边界。doctest 全部走默认模式：内存数据模型没有 IO，示例可以真正执行。`expect("1 号歌必然在库")` 的前提依赖库内置种子数据——若种子数据会变，示例改用「先 create 再 lookup」的自洽写法，这也是文档自检时容易漏掉的一条。

### 场景二：团队内部库的文档规范（清单化）

真实背景：五人小组共用一个内部工具库，历史上「谁写的函数谁知道」，交接成本高。落一套可执行规范：

```text
内部库文档规范 v1
1. 所有 pub 项必须有 /// 文档；首句一句话说清「做什么」，不超过一行。
2. 返回 Option/Result 的函数，文档必须说明 None/Err 各在什么情形出现。
3. 会 panic 的函数必须有 # Panics 段落（读实现找 unwrap/expect/索引）。
4. 每个 pub 模块至少一个 doctest 级（可运行）示例；重 IO 示例标 no_run 并注释原因。
5. 破坏性变更必须同步更新所有受影响 doctest；CI 跑 cargo test 即验证。
6. 禁止 ignore 标注新示例；存量 ignore 示例限期改造。
```

讲解：这份清单的关键是「可机械检查」——1/2/4/5/6 都能靠 `cargo test`、`cargo doc`、clippy lint（missing_docs、missing_errors_doc）兜底，不依赖 reviewer 记性。对比「大家自觉写文档」会发生什么：三个月后规范只剩第一条的一半还在执行。团队推文档习惯，先推机制再推觉悟。

### 场景三：文档构建失败复现（排查实录）

真实背景：内部库 `musiclib` 发布 0.3.0 后收到 docs.rs 构建失败通知，主页红条。排查过程：

```bash
# 第一步：打开构建日志，看到失败发生在 "Running RustDoc" 阶段，
# 报错行指向文档注释里的 doctest：
#    error[E0432]: unresolved import `musiclib::legacy_parser`
#    --> src/lib.rs:80:9

# 第二步：定位源码——0.3.0 删除了 legacy_parser 模块，
# 但 lib.rs 顶部模块文档里的示例还在 use 它：
```

```rust
// lib.rs 顶部 //! 文档（修复前）：
//! # 示例
//! ```
//! use musiclib::legacy_parser::parse;   // 0.3.0 已删除该模块！
//! let ast = parse("...");
//! ```
```

```bash
# 第三步：本地对齐 docs.rs 参数复现，确认同报错
cargo doc --no-deps --all-features
#    Doc-tests musiclib: FAILED
#    error[E0432]: unresolved import `musiclib::legacy_parser`

# 第四步：修正文档示例为现有 API，复跑通过后升 0.3.1 发布
```

讲解：这个案例的教训是「模块文档里的示例同样会被 doctest 执行」——`//!` 与 `///` 在 doctest 面前一视同仁，删模块时 grep 不到正文调用不代表安全，`cargo test` 全绿才是安全线。若这个示例只是「演示旧 API 长什么样」的历史说明，正确归宿是 `ignore` 加注释，或者干脆删掉——过期文档没有保留价值。

## 7. 常见错误与对策

| 问题 | 原因 | 对策 |
| :--- | :--- | :--- |
| 示例代码块没被执行 | 围栏语言标成了 `rust,ignore` 或没标语言 | 检查围栏标注；`cargo test` 输出里数 doctest 条数 |
| doctest 找不到 crate 名 | 示例 use 的包名与 Cargo.toml 不一致（连字符转下划线） | 以 lib name 为准，`cargo metadata` 可查 |
| unused doc comment 警告 | `///` 与 item 之间空行，或标在了非 item 位置 | 文档注释紧贴 item，删掉中间空行 |
| docs.rs 构建失败但本地正常 | `--all-features` 差异、平台差异、doctest 依赖环境 | 按 `cargo doc --no-deps --all-features` 复现链路排查 |
| 文档里 intra-doc 链接报 broken | 路径写错或目标非 pub | `cargo doc` 会逐条报告；路径从 crate 根数 |

## 8. 动手实践

**任务一：给 045 篇拆出的 stats 模块补文档（约 20 分钟）**

给 [模块系统](/rust/045-RustModulesAndCrates)动手实践里 `stats` 模块的 `total_plays` 与 `top_song` 补 `///` 文档：首句一句话契约；`top_song` 说明空列表返回 `None`；各配一个可运行的 doctest（构造两首假歌，断言结果）。写完跑 `cargo test`，确认输出里出现 `Doc-tests` 区块且全绿。

提示：doctest 的代码在隐藏 main 里运行，需要 use 到 `Song` 与两个函数；`top_song` 返回 `Option<&Song>`，断言时先 `unwrap` 再比字段。

**任务二：制造并修复一次 doctest 失效（约 15 分钟）**

先写一个 doctest 断言 `total_plays(&[]) == 1`（故意错误），跑 `cargo test` 记录失败输出格式；再把函数的 `&[u32]` 参数改成 `&[u16]` 并同步修 doctest，体会「改签名必改示例」的强制联动。最后把 doctest 里的示例标注改成 `no_run`，观察断言错误是否还会被报告——验证 no_run「编译但不执行」的语义。

提示：no_run 下 `assert_eq!` 依然参与编译但不运行，所以错误的断言值不会再报错——这正是 no_run 的弱化点，示例里含断言时别用 no_run。

**任务三：模拟 docs.rs 构建差异（约 15 分钟）**

给库里加一个 feature `net`（`Cargo.toml` 里 `[features] net = []` 即可），写一个只在 `net` 下编译的函数，其文档示例 `use crate::net_helper;`。先跑 `cargo doc --no-deps`（不报错），再跑 `cargo doc --no-deps --all-features` 观察差异，解释 docs.rs 为什么可能在你没开 feature 的本地构建之外失败。

提示：`--all-features` 会启用 net，进而编译 net_helper 与其 doctest——反过来，若函数默认编译而 docs.rs 环境缺可选依赖，才是文档构建失败的典型剧本；本任务让你从两个方向都见到差异。

参考实现（先自己写完再展开对照）：

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

任务一：

```rust
/// 返回歌单的总播放量；空歌单返回 0。
///
/// # Examples
///
/// ```
/// use songs::model::Song;
/// use songs::stats::total_plays;
///
/// let songs = vec![
///     Song { title: "星屑".into(), plays: 1200 },
///     Song { title: "初雪".into(), plays: 980 },
/// ];
/// assert_eq!(total_plays(&songs), 2180);
/// assert_eq!(total_plays(&[]), 0);
/// ```
pub fn total_plays(songs: &[Song]) -> u32 {
    songs.iter().map(|s| s.plays).sum()
}

/// 返回播放量最高的歌；空歌单返回 `None`。
///
/// 并列时取后入库的一首（`max_by_key` 的并列语义）。
///
/// # Examples
///
/// ```
/// use songs::model::Song;
/// use songs::stats::top_song;
///
/// let songs = vec![
///     Song { title: "星屑".into(), plays: 1200 },
///     Song { title: "初雪".into(), plays: 980 },
/// ];
/// assert_eq!(top_song(&songs).map(|s| s.title.as_str()), Some("星屑"));
/// assert!(top_song(&[]).is_none());
/// ```
pub fn top_song(songs: &[Song]) -> Option<&Song> {
    songs.iter().max_by_key(|s| s.plays)
}
```

要点：包名以你的项目为准（`cargo new songs` 则 use songs）；「并列取先入库」是 `max_by_key` 的真实语义（返回最后一个最大值——注意 Rust 的 `max_by_key` 对并列取后者，所以这句文档要写成「并列时取后入库的一首」，这恰好演示了 doctest 锁行为的价值：写文档时拿不准，就补一个并列用例让测试告诉你答案）；空列表边界两个函数都覆盖。

任务二：

```rust
// 制造失败：cargo test 输出形如
//   ---- src/lib.rs - total_plays (line 12) stdout ----
//   thread '...' panicked at ... assertion failed: `(left == right)`
//   left: `0`, right: `1`
//   test result: FAILED. 1 passed; 1 failed

// 修复联动：参数改 &[u16] 后，doctest 构造的字面量也要改类型语境
/// # Examples
/// ```
/// use songs::stats::total_plays;
/// let plays: u16 = total_plays(&[1200, 980]);
/// assert_eq!(plays, 2180);
/// ```
pub fn total_plays(list: &[u16]) -> u16 {
    list.iter().sum()
}
```

要点：失败输出会指明「src/lib.rs - 函数名 (行号)」，定位直达文档注释内部；no_run 后断言不执行，把断言值改错也不会红——所以含断言的示例不用 no_run，这就是任务二要你亲手看到的差别。

任务三：

```toml
[features]
net = []
```

```rust
// src/lib.rs
#[cfg(feature = "net")]
pub mod net_helper {
    /// 拉取远端歌单（示例环境无网络，标 no_run）。
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let list = mylib::net_helper::fetch("https://example.com/list");
    /// println!("{list:?}");
    /// ```
    pub fn fetch(url: &str) -> String {
        format!("fetched {url}")
    }
}
```

要点：不开 feature 时该模块与示例都从编译图里消失，`cargo doc --no-deps` 通过；`--all-features` 把它拉进来并执行 doctest 编译。docs.rs 恒以 `--all-features` 构建——所以「本地默认 feature 全绿」从来不是文档构建安全的证据，与本篇第 5 节的排查表首行互为印证。

</details>

## 9. 与之前和之后的知识的关系

- 往前：doctest 是 [测试与调试](/rust/120-RustTestingDebugging)三种测试形态（单元、集成、文档）的最后一块拼图；示例代码大量复用集合与迭代器篇的写法；
- 往后：[Cargo 工程化](/rust/190-RustCargoAdvanced)的发布流程里，docs.rs 是发布产物的一部分，本文给了它完整的排查方法论；生态篇（140）的 API 从此可以带上规范文档交付。

## 参考与致谢

- The Rust Programming Language 第 14 章 More about Cargo and Doc Tests：https://doc.rust-lang.org/book/ch14-02-publishing-to-crates-io.html（开放许可：MIT OR Apache-2.0）
- The Rustdoc Book：https://doc.rust-lang.org/rustdoc/（官方 rustdoc 手册，no_run/ignore/should_panic 语义与 docs.rs 配置以此为准）
- docs.rs 官方说明（关于构建环境与 metadata 配置）：https://docs.rs/crate/docsrs/0.0.0

## 小结

`///` 写到项、`//!` 写到模块，文档即 Markdown、贴着代码走；doctest 让每个示例变成 `cargo test` 的正式成员——默认模式编译并运行，`no_run` 只编译（重 IO 示例的归宿），`should_panic` 演示边界。`cargo doc --no-deps --open` 本地预览，docs.rs 用 `--all-features` 自动构建，两边环境有差异，排查从「本地复现构建参数」开始。一句话记忆：**文档贴代码、示例即测试、发布看 docs.rs**——改 API 时编译器会替你盯着文档。

> **动手提示**：翻出你写过的一段「同事问过才补的解释」，把它改写成该函数的 `///` 文档加一个 doctest——解释被写进契约的那一刻，它就不需要被回答第二遍。
