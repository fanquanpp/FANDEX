---
order: 190
title: Cargo 进阶
module: 'rust'
category: 后端技术
difficulty: intermediate
description: workspace、feature 门控与发布：工程化使用 Cargo。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'rust/003-RustEnvSetup'
  - 'rust/013-RustEcosystemProject'
prerequisites:
  - 'rust/003-RustEnvSetup'
---

# Cargo 进阶

入门阶段的 Cargo 只用到 `cargo new`、`cargo build`、`cargo run` 三个命令；真实项目里，它要同时管理十几个 crate、几十个依赖、可选功能开关与发布流程。本篇按工程化主线展开：`Cargo.toml` 的深度配置、workspace 多包管理、feature 门控与条件编译、profile 构建优化，以及 crates.io 发布流程。示例统一来自"虚拟歌手音乐平台"的多 crate 架构（core 数据模型、server 服务、cli 工具）。

## 前置知识

- [Rust 环境搭建与工具链](/rust/003-RustEnvSetup)：Cargo 的基本命令与项目结构。
- [常用生态与实战](/rust/013-RustEcosystemProject)：serde、tokio 等依赖的使用背景。

## 学习目标

1. 掌握 `Cargo.toml` 的分段结构与依赖声明的完整写法（features、path、版本语义）。
2. 会用 workspace 组织多 crate 项目并集中管理依赖版本。
3. 会用 feature 门控实现可选功能与 `#[cfg]` 条件编译。
4. 会配置 profile 优化构建速度与二进制体积。
5. 熟悉 crates.io 发布流程与语义化版本管理。

## 1. Cargo.toml 深度配置：清单文件的完整形态

`Cargo.toml` 是包的"身份证 + 购物清单"。常用分段有六个：`[package]` 元数据、`[dependencies]` 正式依赖、`[dev-dependencies]` 仅测试与示例使用、`[build-dependencies]` 构建脚本使用、`[features]` 可选功能、`[profile]` 构建配置。依赖声明的完整形态远不止 `name = "version"`：

```toml
# 虚拟歌手音乐平台核心 crate 的配置（节选）
[package]
name = "fandex-core"
version = "0.3.0"
edition = "2021"
description = "虚拟歌手音乐平台的核心数据模型" # 发布到 crates.io 必填
license = "MIT"                                # 发布必填，SPDX 标识符

[dependencies]
serde = { version = "1", features = ["derive"] }  # 依赖可再开自己的 feature
chrono = { version = "0.4", default-features = false, features = ["clock"] }
# 关闭默认 feature 只留所需，是缩小体积的常用手段

[dev-dependencies]
criterion = "0.5" # 仅 cargo test/bench 时编译，不进入发布产物
```

**解读**：版本号默认是**插入符语义**（caret requirement）：`"1"` 表示 `>=1.0.0, <2.0.0`，`"1.2"` 表示 `>=1.2.0, <2.0.0`——即只允许不破坏 API 的次版本与补丁升级。更严格的写法有 `"=1.2.3"`（精确锁定）、`"0.3"`（0.x 时代次版本也可能破坏 API，故 `<0.4.0`）。依赖来源三选一：crates.io（默认）、`path = "../fandex-core"`（本地路径，workspace 内常用）、`git = "..."`（仓库地址）。`Cargo.lock` 锁定依赖的精确版本树，应用项目应提交进版本库，库项目可忽略。

`Cargo.toml` 与 `Cargo.lock` 的分工需要分清：前者表达"我需要的范围"（约束），后者记录"实际解析到的版本"（事实）。日常排查依赖问题有两个利器：`cargo tree` 打印依赖树，配合 `-d` 参数（`cargo tree -d`）列出重复编译的同一依赖的多个版本——版本冲突往往就藏在这里；`cargo update` 按 `Cargo.toml` 的约束把 lock 文件刷新到最新兼容版本，必要时 `cargo update -p serde --precise 1.0.200` 把单个依赖钉回指定版本。还有一个容易忽略的字段是依赖重命名：当两个同名 crate 的不同大版本必须共存时，`serde1 = { package = "serde", version = "1" }` 让它们以不同名字并存于同一项目。

## 2. workspace 与依赖共享：多 crate 的统一指挥

平台长大以后，`core`（数据模型）、`server`（服务端）、`cli`（命令行工具）理应拆成独立 crate：编译可并行、职责清晰、`cli` 不必链接整个服务端。workspace 是组织它们的机制：**根 `Cargo.toml` 只做协调，本身不是包**，成员 crate 共享一个 `Cargo.lock` 与 `target` 目录，`cargo build --workspace` 一键构建全部成员：

```toml
# 根 Cargo.toml：workspace 协调者，没有 [package] 段
[workspace]
members = ["fandex-core", "fandex-server", "fandex-cli"]
resolver = "2" # feature 解析算法 v2，更符合直觉（2021 edition 默认）

# 集中声明依赖版本：全仓库唯一的"版本真源"
[workspace.dependencies]
serde = "1"
tokio = { version = "1", features = ["full"] }
```

```toml
# fandex-server/Cargo.toml：成员用 workspace = true 继承版本
[package]
name = "fandex-server"
version = "0.3.0"
edition = "2021"

[dependencies]
fandex-core = { path = "../fandex-core" } # 成员之间用 path 依赖
serde.workspace = true                    # 版本只在根定义一次
tokio.workspace = true
```

**解读**：`workspace.dependencies` 解决的是"三个 crate 各写一个 serde 版本，特性合并后行为诡异"的经典问题——版本集中一处，升级只改一行。成员之间用 `path` 依赖互相引用，发布时可换成 `workspace = true` 加版本号。此外 workspace 让 `cargo test`、`cargo clippy` 等命令自动作用于当前成员，加 `--workspace` 则作用于全部；共享 `target` 目录也显著减少重复编译的磁盘占用。

workspace 还支持更细粒度的继承：根清单的 `[workspace.package]` 段可以集中声明 `edition`、`license`、`repository` 等公共元数据，成员用 `edition.workspace = true` 的写法继承，保证全仓库编译版本与许可信息一致。`members` 列表也支持通配符（如 `members = ["crates/*"]`），crate 数量增长后无需逐个登记。判断自己是否需要 workspace 有一条简单标准：当你开始把公共代码复制到第二个项目里，或者发现构建一半的代码从不参与最终产物，就该拆分了。

## 3. feature 门控与条件编译：按需裁剪的功能开关

feature 是**可选功能**的编译期开关：默认关闭，按需开启，只把需要的代码与依赖编译进产物。平台需要同时支持 SQLite 与 PostgreSQL 两种存储，但不希望每个用户都编译两套驱动：

```toml
# fandex-core/Cargo.toml 的 [features] 段
[features]
default = ["sqlite"]        # 默认只启用 SQLite
postgres = ["dep:sqlx"]     # 开启时才引入 sqlx 这个重依赖
sqlite = ["dep:rusqlite"]
```

```rust
// 数据访问层：按 feature 条件编译，同一模块名暴露统一接口
#[cfg(feature = "postgres")]
pub mod store {
    // 仅当 cargo build --features postgres 时参与编译
    pub fn save(song: &str) {
        println!("歌曲 {song} 已写入 PostgreSQL");
    }
}

#[cfg(feature = "sqlite")]
pub mod store {
    pub fn save(song: &str) {
        println!("歌曲 {song} 已写入 SQLite");
    }
}

fn main() {
    // 调用方代码完全一致：默认构建走 SQLite 分支
    store::save("银河回廊");
}
```

**解读**：`#[cfg(feature = "...")]` 是条件编译属性，不满足条件的代码**根本不参与编译**——这是 feature 比运行时 if 判断强大的地方：没有选中的依赖连符号都不存在。命令行用法：`cargo build --no-default-features --features postgres`。设计 feature 有条铁律——**可加性**（additive）：开启更多 feature 只会增加功能，不能让代码变少或语义改变；因此"二选一"的互斥 feature 是坏设计（本例两个 store 模块同名就是反例示范，正确做法是给不同后缀或用运行时 trait 选择）。`dep:` 前缀（2021 起）表示"开启此 feature 时引入该可选依赖"，且依赖本身不出现在 API 中。

使用 feature 还要理解**特性统一**（feature unification）：同一依赖被多个 crate 引用时，Cargo 会把各方声明的 feature 取并集后只编译一份。这带来两个后果：其一，体积与编译时间不可预测——某个测试依赖悄悄开启了 `serde` 的重量级 feature，正式构建也会跟着变重；其二，`resolver = "2"` 的意义正在于此，它为构建依赖与正常依赖分开解析特性，缓解了误开启的问题。排查时用 `cargo tree -f "{p} {f}"` 可以看到每个依赖实际生效的 feature 列表，是诊断"为什么这个功能被编进来了"的标准手段。

## 4. profile 与构建优化：速度与体积的旋钮

profile 是按构建场景预设的编译参数：`dev`（默认 `cargo build`）优先编译速度，`release`（`cargo build --release`）优先运行性能。优化手段集中在四个参数：

```toml
# 根 Cargo.toml 或成员包的 Cargo.toml
[profile.dev]
opt-level = 1 # 开发构建轻微优化：依赖库跑得动集成测试，增量编译仍快

[profile.release]
opt-level = 3     # 最高运行时优化
lto = "thin"      # 链接期优化：跨 crate 内联，缩减体积并提速
codegen-units = 1 # 单编译单元：优化更充分，代价是编译更慢
strip = "symbols" # 去除符号表：二进制体积显著缩小
```

**解读**：这组参数的取舍逻辑值得内化——`lto` 与 `codegen-units = 1` 都是用**编译时间换运行性能/体积**，适合发布构建；开发时保持默认让增量编译快。经验数据：一个小型 CLI 开启 `strip` 加 `lto` 后体积可从十几 MB 降到几 MB。除全局 profile 外还能按包定制（`[profile.dev.package."*"]` 只优化依赖不优化自己的代码，编译快且测试不慢）。发布前用 `cargo build --release` 并对比体积与基准测试结果，是验证配置是否值得的标准流程。

四个参数的可选值与效果可以汇总成速查表：

| 参数 | 常用取值 | 效果与代价 |
| :--- | :--- | :--- |
| `opt-level` | `0`/`1`/`2`/`3`/`"z"` | 数字越大运行越快；`"z"` 最激进地压缩体积但牺牲速度 |
| `lto` | `false`/`"thin"`/`true`/`"fat"` | 链接期优化强度递增，跨 crate 内联越充分、编译越慢 |
| `codegen-units` | `16`（默认）/`1` | 数值越小优化越充分，并行编译度越低 |
| `strip` | `"none"`/`"debuginfo"`/`"symbols"` | 从产物中剥离调试信息或全部符号表，直接缩小体积 |

再补充两个调试期的认知：其一，`dev` 与 `release` 的行为差异大到足以掩盖 bug（未初始化读取、整数溢出等在两个 profile 下表现不同），CI 里必须同时跑 release 测试；其二，profile 只对**最终产物所在的工作区**生效，作为库发布时 `[profile]` 段会被忽略——它不是包的属性，而是构建的属性。

## 5. crates.io 发布流程：从本地包到公共依赖

发布是把 `fandex-core` 推上 crates.io 供他人 `cargo add`。流程五步，每步都可有可无但顺序固定：

```bash
# 发布前的标准动作（命令行）
cargo login            # 登录：粘贴 crates.io 账户页生成的 API 令牌
cargo package --list   # 预览将要打包的文件（防止把临时文件发上去）
cargo publish --dry-run # 预演发布：校验元数据、license、依赖可解析性
cargo publish          # 正式发布，几分钟后 crates.io 可见
```

**解读**：发布前检查清单——`[package]` 里 `description` 与 `license`（或 `license-file`）必填，`repository`、`documentation`、`keywords`、`categories` 越全越好；`cargo package` 默认会先跑一遍完整构建与测试。两条不可逆规则要牢记：**版本号不可覆盖**——同一个版本号发布一次后永远不能重发，改代码必须升版本；**yank 不是删除**——`cargo yank` 只是阻止新项目依赖该版本，已锁定的项目照常使用。版本管理遵循 SemVer：修 bug 升补丁号（0.3.1）、加功能升次版本（0.4.0）、破坏 API 升主版本（1.0.0）；1.0 之前的 0.x 版本，次版本变更即可视为破坏性。

发布之后的配套动作同样属于流程的一部分：crates.io 会自动把文档构建到 docs.rs，`Cargo.toml` 里的 `[badges]` 与 README 徽章让项目状态一目了然；如果文档构建失败，多半是某些 feature 组合在 docs.rs 的环境下编译不过，可以用 `cargo doc --no-deps --all-features` 在本地复现。成熟项目的最后一步是把"发布"本身自动化：用 `cargo-release` 或 CI 工作流在打标签时执行 `cargo publish`，把"改版本号、打标签、发布"三件事锁进同一条流水线，杜绝"本地发了 ci 里版本对不上"的漂移。

## 易错点与最佳实践

1. **成员 crate 各自声明依赖版本**。错误：三个成员写了三个 serde 版本，feature 合并后编译行为难解释。修正：统一 `workspace.dependencies`，成员一律 `serde.workspace = true`。
2. **把 feature 设计成互斥开关**。错误：`backend-a` 与 `backend-b` 不能同时开，与某些依赖组合时编译失败。修正：feature 必须可加性；互斥选择交给运行时配置或 trait 对象。
3. **发布产物夹带杂物**。错误：测试数据、本地配置被打进 `.crate` 包。修正：`cargo package --list` 逐项检查，用 `include`/`exclude` 字段裁剪。
4. **release 构建又慢又大却不调参**。错误：默认发布十几 MB 的二进制。修正：`strip = "symbols"` 加 `lto = "thin"`，必要时 `codegen-units = 1`；体积敏感场景再评估 `opt-level = "z"`。
5. **把 `Cargo.lock` 提交混乱**。最佳实践：应用（含 workspace 全部成员）提交 lock 文件保证可重现构建；纯库可不提交，但发布前务必在最新 lock 下全量测试。

## 本篇小结

1. `Cargo.toml` 六大分段中，依赖声明的完整形态（features、default-features、path/git、插入符版本语义）是配置的核心。
2. workspace 用根清单统一协调多 crate：共享 lock 与 target、集中版本声明、`--workspace` 一键操作，是多模块项目的标准形态。
3. feature 是编译期功能开关，配合 `#[cfg]` 实现按需裁剪；设计必须遵守可加性，`dep:` 控制可选依赖。
4. profile 旋钮的取舍：dev 求快、release 求好；`lto`、`codegen-units`、`strip` 用编译时间换运行性能与体积。
5. 发布五步：login、package --list、publish --dry-run、publish、必要时 yank；版本号不可覆盖，SemVer 决定升哪一位。

> **一句话记忆**：Cargo 进阶三板斧——"多 crate 用 workspace、可选功能用 feature、发布前 dry-run"；版本真源只在 workspace.dependencies 一处，feature 只做加法不做选择题。

## 动手实践

1. 把单 crate 的音乐平台拆成 workspace 三件套（core/server/cli），把所有第三方依赖迁到 `[workspace.dependencies]`，验证 `cargo build --workspace` 与各成员单独构建都能通过。思路：根清单去掉 `[package]` 段，成员间用 `path` 依赖。
2. 给 core 添加 `metrics` feature（默认关闭）：开启时暴露 `record_play(title: &str)` 函数上报播放量，关闭时该函数不存在；用 `cargo build --no-default-features` 验证调用方代码是否被正确裁剪。思路：`#[cfg(feature = "metrics")]` 包住模块与可选依赖。
3. 为 cli 配置 release profile（`lto = "thin"`、`strip = "symbols"`、`codegen-units = 1`），对比优化前后 `cargo build --release` 的二进制体积与运行速度，记录数据形成自己的优化清单。
