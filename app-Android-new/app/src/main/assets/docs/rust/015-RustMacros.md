---
order: 150
title: 宏编程
module: 'rust'
category: 后端技术
difficulty: advanced
description: 声明宏与过程宏：Rust 元编程的两条路径。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'rust/014-RustSmartPointers'
  - 'rust/010-RustGenericTrait'
prerequisites:
  - 'rust/014-RustSmartPointers'
---

# 宏编程

函数处理**值**，宏处理**代码**。`vec![]` 能接收任意个元素、`#[derive(Serialize)]` 能凭空生成整个 impl 块——这些都是函数做不到的，因为宏在**编译期**把一段 token（语法片段）展开成新代码，相当于"编译器里的编译器"。Rust 提供两条元编程路径：声明宏（`macro_rules!`，模式匹配式展开）与过程宏（用 Rust 代码操作语法树，功能最强）。本篇以虚拟歌手音乐平台的曲目单、应援色与数据模型为背景，走完从声明宏到 derive 宏实战的完整路径。

## 前置知识

- [智能指针](/rust/014-RustSmartPointers)：理解 `Box` 与 trait 对象，过程宏生成的代码会用到。
- [泛型与 Trait](/rust/010-RustGenericTrait)：trait 实现是过程宏最常生成的目标。

## 学习目标

1. 理解宏与函数的本质区别：编译期操作 token 与语法树。
2. 会用 `macro_rules!` 编写带片段说明符与重复模式的声明宏。
3. 了解过程宏的三种类型（derive、属性、函数式）及各自触发方式。
4. 能读懂并仿写一个 derive 宏的最小实现（syn 解析 + quote 生成）。
5. 掌握宏的卫生性概念与调试手段（cargo expand、compile_error!）。

## 1. 宏与函数：代码生成代码

宏与函数的分工可以这样理解：函数是"对数据的复用"，宏是"对代码的复用"。三类需求必须用宏：**可变参数**（`vec![a, b, c]` 的元素个数在编译期才知道）、**生成代码**（为几十个结构体批量实现 trait）、**在类型上挂标记**（`#[derive(...)]`）。代价是：宏在编译期展开，报错发生在展开后的代码上，位置信息不如函数友好；所以社区共识是**能写函数就写函数，宏留给真正重复的样板**。

宏在编译期展开也意味着"宏没有运行时开销"——`vec![1, 2, 3]` 展开后就是一段普通的 `Vec` 构造代码，与手写无异。理解宏的正确心智模型：**宏定义是一台模板机器，调用点是投喂 token，编译期产出代码**；产出什么完全由模式匹配决定。

## 2. macro_rules! 声明宏：模式匹配式的代码模板

声明宏的核心是"模式 => 展开"的匹配规则。模式里用**片段说明符**声明输入形态：`expr` 表达式、`ident` 标识符、`literal` 字面量、`ty` 类型、`tt` 单个语法树节点；用 `$(...),*` 表示"重复零次或多次、逗号分隔"。第一个例子：批量注册应援色常量。

```rust
// 声明宏：批量定义应援色常量，并生成统计函数
macro_rules! theme_colors {
    // 模式：若干组 "标识符 => 字面量"，逗号分隔，允许末尾多余逗号
    ($($name:ident => $hex:literal),* $(,)?) => {
        $(
            pub const $name: &str = $hex; // 每组展开成一个常量
        )*
        // 展开出一个统计函数：借用 stringify! 把标识符变回文本
        pub fn theme_color_count() -> usize {
            [$(stringify!($name)),*].len()
        }
    };
}

theme_colors! {
    SKY_BLUE  => "#87CEEB",  // 天蓝
    SAKURA    => "#FFB7C5",  // 樱粉
    MOONLIGHT => "#E6E6FA",  // 月白
}

fn main() {
    println!("天蓝 = {SKY_BLUE}");
    println!("共 {} 种应援色", theme_color_count());
}
```

**解读**：调用点写三组"名字 => 颜色"，宏展开后就是三个 `pub const` 加一个函数——新增应援色只需在调用处加一行，展开由编译器完成。`$(,)?` 允许调用处末尾多写一个逗号，是声明宏的常用礼貌。第二个例子演示 `expr` 片段与表达式重复：

```rust
// 类似 vec! 的声明宏：快速构造"演出曲目单"
macro_rules! setlist {
    ($($song:expr),* $(,)?) => {
        vec![$($song.to_string()),*] // 每个表达式统一转成 String
    };
}

fn main() {
    let songs = setlist!["星轨协奏曲", "午夜霓虹", "晚安曲"];
    assert_eq!(songs.len(), 3);
    println!("今晚曲目：{songs:?}");
}
```

**解读**：`expr` 让调用处能传任意表达式（字面量、函数调用都行），`$(...),*` 把它们逐一填进 `vec![]`。声明宏适合"结构固定的重复样板"；一旦需要理解结构体字段、生成 impl，就要升级到过程宏。常用的片段说明符可以整理成速查表：

| 说明符 | 匹配内容 | 典型用途 |
| :--- | :--- | :--- |
| `expr` | 表达式 | 传值、参与运算 |
| `ident` | 标识符/关键字 | 生成变量名、常量名 |
| `literal` | 字面量 | 路径、颜色码、数字 |
| `ty` | 类型 | 生成字段、泛型实参 |
| `pat` | 模式 | 生成 match 分支 |
| `block` | 语句块 | 原样嵌入代码块 |
| `tt` | 单个语法树节点 | 兜底匹配、透传 |

使用声明宏还有一条顺序规则：`macro_rules!` 定义必须出现在**调用点之前**（文本顺序），跨模块使用需要 `#[macro_use]` 或 `pub(crate) use my_macro;` 显式导出——这与类型和函数" anywhere 可见"的规则不同，是宏在代码组织上独有的约束。匹配规则自上而下、先到先得，把特化模式放前面、通配兜底放后面，就能实现类似"重载"的效果。

## 3. 过程宏三类总览

过程宏是"用 Rust 写的编译器插件"：输入 `TokenStream`（token 流），输出新的 `TokenStream`。三类触发方式对应三种用途：

| 类型 | 触发方式 | 典型例子 |
| :--- | :--- | :--- |
| derive 宏 | `#[derive(Serialize)]` | serde 为结构体派生序列化 |
| 属性宏 | `#[tokio::main]` | tokio 改写 main 为异步入口 |
| 函数式宏 | `sqlx::query!()` | sqlx 编译期校验 SQL |

三条硬性约束：过程宏必须放在**独立的 crate** 中（`Cargo.toml` 里写 `proc-macro = true`）；生态标配是 `syn`（把 token 流解析成语法树）与 `quote`（把语法树变回代码）；使用方与宏 crate 需要分开编译，宏 crate 改动会触发下游全量重编译。选型上，derive 宏解决"给类型批量加实现"，属性宏解决"改写被标注的代码"，函数式宏解决"任意语法的 DSL"。

三类过程宏的能力边界也值得在动手前想清楚：derive 宏**只能追加**（在原 item 旁边生成新 item），不能修改或删除被标注的结构体本身；属性宏**可以改写**目标 item，甚至替换成完全不同的东西，权力最大但也最容易让使用者困惑；函数式宏在表达式、语句、模式等位置都可调用，灵活性与声明宏重叠，胜在能访问完整的 `syn` 解析能力。一个实用的判断流程：需要"给类型生成 impl"选 derive；需要"给函数加行为"（路由注册、运行时注入）选属性宏；其余场景优先声明宏，不够用再上函数式过程宏。

## 4. derive 宏实战：为结构体派生 describe()

derive 宏在 `#[derive(Describe)]` 被标注时触发，拿到结构体的语法树（名字、字段），生成一个 impl 块。下面是宏 crate 的完整最小实现：

```rust
// 过程宏 crate 的 lib.rs：Cargo.toml 需写 proc-macro = true
// 依赖：syn = { version = "2", features = ["full"] }、quote = "1"
use proc_macro::TokenStream;
use syn::{parse_macro_input, Data, DeriveInput, Fields};

// 用法：#[derive(Describe)]，为结构体生成 describe() 方法
#[proc_macro_derive(Describe)]
pub fn derive_describe(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput); // 解析语法树
    let name = &ast.ident;                              // 结构体名，如 Song

    // 为每个命名字段生成一行 "parts.push(format!(...))"
    let pushes: Vec<_> = match &ast.data {
        Data::Struct(data) => match &data.fields {
            Fields::Named(named) => named
                .named
                .iter()
                .map(|f| {
                    let key = f.ident.as_ref().unwrap();
                    quote::quote! {
                        parts.push(format!("{}: {:?}", stringify!(#key), self.#key));
                    }
                })
                .collect(),
            _ => Vec::new(),
        },
        _ => Vec::new(),
    };

    // quote! 用 #变量 插值，拼出整个 impl 块
    let expanded = quote::quote! {
        impl #name {
            pub fn describe(&self) -> String {
                let mut parts: Vec<String> = Vec::new();
                #(#pushes)*
                parts.join("，")
            }
        }
    };
    expanded.into()
}
```

**解读**：流程是"解析（syn）→ 遍历字段造片段 → 拼装（quote）→ 返回 token 流"。`quote::quote!` 本身就是一个声明宏，`#name` 是语法树插值，`#(#pushes)*` 是片段重复——两条路径在这里交汇。在业务 crate 中使用：

```rust
// 业务 crate：一行 derive 即可获得 describe() 方法
#[derive(Describe)]
struct Song {
    title: String,   // 歌曲名
    duration: u32,   // 时长（秒）
}

fn main() {
    let s = Song { title: String::from("银河回廊"), duration: 245 };
    println!("{}", s.describe()); // title: "银河回廊"，duration: 245
}
```

**解读**：编译器看到 `#[derive(Describe)]` 就调用我们的宏，把 `impl Song { fn describe ... }` 注入代码。生成代码里用了 `{:?}`，因此字段类型需实现 `Debug`（`String` 与 `u32` 都满足）；生产级宏还会用 `#[proc_macro_derive(Describe, attributes(describe))]` 支持字段级属性、生成 where 子句约束泛型。serde 的 `#[derive(Serialize)]` 正是同一机制的工业级版本。

## 5. 属性宏与函数式宏

属性宏挂在任意 item（函数、模块、结构体）上，**改写**它：`#[tokio::main]` 把 async main 包装成同步入口与运行时启动；web 框架的 `#[route(GET, "/concerts")]` 把普通函数注册成路由。函数式宏像函数调用，但输入是任意 token：`format!` 拼接字符串、`assert_eq!` 带位置信息的断言、`sqlx::query!` 在编译期连数据库校验 SQL。日常开发更多是"用好现成宏"，编写属性宏与函数式宏的投入产出比低于 derive，先用起来再深挖：

```rust
fn main() {
    // 三个每天都在用的标准库宏，都在编译期展开成代码：
    let setlist = vec!["开场曲", "主打歌", "安可"];     // vec! 可变参数构造
    let notice = format!("今晚 {} 首曲目", setlist.len()); // format! 字符串插值
    assert_eq!(setlist.len(), 3, "曲目单不应为空");       // assert_eq! 失败时打印两侧值

    println!("{notice}");
}
```

**解读**：这三个宏演示了过程宏的三个价值点——`vec!` 解决可变参数、`format!` 解决类型各异的拼接、`assert_eq!` 在失败消息里带上表达式的源码文本与行号（这是函数做不到的，函数拿不到调用点的位置信息）。当你在业务里发现"每个演唱会场次都要写一遍重复的校验样板"，就是考虑写宏的信号。

## 6. 卫生性与调试技巧

**卫生性**（hygiene）指宏展开时，宏内部引入的标识符不会意外污染或捕获调用处的同名变量——声明宏默认卫生，展开后的临时变量即使与调用处同名也互不干扰；但**通过模式传入的标识符**仍按调用处解析，这正是宏能引用调用处变量的原因。调试宏三板斧：

- **看展开**：`cargo expand`（需 `cargo install cargo-expand`）把宏展开后的代码打印出来，报错在展开代码里一目了然。
- **友好报错**：宏内用 `compile_error!` 在匹配失败时给出人话提示，而不是一屏 token 错误。
- **先写死再参数化**：把想生成的代码先手写一份确认能编译，再抽象成宏模式。

```rust
macro_rules! pick_song {
    (track = $n:literal) => {
        format!("第 {n} 首曲目", n = $n) // 只接受 "track = 数字" 一种写法
    };
    // 兜底分支：其他任何输入都给出明确的用法提示
    ($_other:tt) => {
        compile_error!("用法：pick_song!(track = 序号)")
    };
}

fn main() {
    println!("{}", pick_song!(track = 3)); // 第 3 首曲目
    // pick_song!(song = 3); // 编译错误：用法：pick_song!(track = 序号)
}
```

**解读**：`tt`（token tree）是最通用的片段说明符，适合做兜底匹配；`compile_error!` 把"看不懂的编译失败"变成"一眼看懂的用法提示"，是声明宏易用性的关键一环。`stringify!`（把表达式变回源码文本）与 `line!`/`file!`（位置信息）也是宏调试的常客。

最后划清声明宏的能力边界，避免白费力气：`macro_rules!` **不能**凭空发明新标识符（把两个标识符拼接成新名字做不到，过程宏的 `format_ident!` 可以）；**不能**根据类型做出不同展开（片段说明符只看 token 形态，不看类型语义）；**不能**访问程序运行期的任何信息。遇到这三类需求，正确路径都是过程宏——`syn` 拿到的是完整语法树，字段拼接、类型判断、遍历修改都是普通 Rust 代码。换句话说，声明宏是"文本模板"的强化版，过程宏才是"编译器插件"；从前者升级到后者的时机，就是文本匹配开始力不从心的时刻。

## 易错点与最佳实践

1. **报错位置难懂就硬读**。错误：宏内代码出错，编译器指向展开后位置。修正：`cargo expand` 查看展开结果，再回溯到宏定义修模式。
2. **把复杂逻辑塞进宏**。错误：宏里嵌套十层匹配实现业务规则，维护成本爆炸。最佳实践：宏只负责"消灭重复样板"，逻辑放进普通函数，宏展开成函数调用。
3. **derive 宏与业务代码混在一个 crate**。错误：`#[proc_macro_derive]` 写在普通 crate 里编译不过。修正：过程宏必须独占 `proc-macro = true` 的 crate。
4. **重复分隔符写错**。`$(...),*` 是逗号分隔、`$(...);*` 是分号分隔、`$(...)*` 无分隔符；展开 `Vec` 字面量与语句块时用错会生成不合法代码。
5. **宏的公开接口没有自解释报错**。最佳实践：为不匹配的输入提供 `compile_error!` 兜底分支；`derive` 宏生成的代码补齐文档注释，让 IDE 悬停可见。

## 本篇小结

1. 宏在编译期把 token 展开成代码：可变参数、批量生成 impl、类型标注是它的三大不可替代场景；能写函数就别写宏。
2. 声明宏靠"模式 => 展开"驱动，片段说明符（`expr`/`ident`/`tt`）与重复 `$(...),*` 是核心语法，适合结构固定的样板。
3. 过程宏三条路：derive 派生实现、属性宏改写 item、函数式宏造 DSL；必须独立 crate，标配 syn 解析 + quote 生成。
4. derive 实战流程：解析语法树、遍历字段、quote 拼装 impl——serde 等生态库全是这套机制的放大。
5. 卫生性让宏内外变量互不干扰；`cargo expand`、`compile_error!`、`stringify!` 是调试三件套。

> **一句话记忆**：宏 = 编译期的代码模板机器——声明宏做"模式匹配填空"，过程宏做"语法树手术"；先手写一份能编译的代码，再把它抽象成宏，报错难读就 cargo expand。

## 动手实践

1. 扩展 `setlist!` 宏：支持 `setlist!{ "A"; "B"; "C" }` 分号分隔的写法，并生成一个 ` encore()` 函数返回最后一首。思路：模式里用 `$(...);*`，兜底分支记得给 `compile_error!`。
2. 为 `Concert { title: String, city: String }` 派生 `Describe`，并在生成的 `describe()` 中追加输出字段个数。思路：在 quote 展开里加 `parts.len()` 统计。
3. 写一个 `ticket!(A区, 3)` 声明宏，展开成 `["A区-1", "A区-2", "A区-3"]` 票号数组。思路：需要 `$name:ident` 与 `$n:literal` 两个片段，重复展开时拼字符串生成票号，体会片段说明符的组合使用。
