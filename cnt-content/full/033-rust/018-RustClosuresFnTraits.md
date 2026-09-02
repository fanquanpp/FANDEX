---
order: 180
title: 闭包与 Fn 特征
module: 'rust'
category: 后端技术
difficulty: intermediate
description: Fn/FnMut/FnOnce、捕获方式与 move：闭包的类型系统真相。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'rust/010-RustGenericTrait'
  - 'rust/009-RustCollectionsIterators'
prerequisites:
  - 'rust/010-RustGenericTrait'
---

# 闭包与 Fn 特征

闭包（closure）是能捕获所在环境变量的匿名函数，是 Rust 表达"行为"的一等公民：迭代器适配器、线程任务、回调、策略模式都靠它。但闭包不是语法糖那么简单——编译器按"你如何使用捕获的变量"把它翻译成 `Fn`、`FnMut`、`FnOnce` 三个 trait 之一，决定了它能被调用几次、能否跨线程、能否存进集合。理解这三个特征，就是理解闭包的类型系统真相。本篇以虚拟歌手平台的票价策略、售票计数与曲目筛选为背景，把闭包从语法讲到特征边界。

## 前置知识

- [泛型与 Trait](/rust/010-RustGenericTrait)：trait 约束与 trait 对象是闭包参数的两种写法。
- [集合与迭代器](/rust/009-RustCollectionsIterators)：闭包与迭代器适配器天生一对。

## 学习目标

1. 掌握闭包语法与编译器对捕获方式的自动推断。
2. 分清 `Fn`/`FnMut`/`FnOnce` 三个特征的能力边界与选择依据。
3. 理解 `move` 关键字的语义：捕获方式从借用变为转移所有权。
4. 会把闭包作为参数（泛型约束 / `impl Trait` / trait 对象）与返回值使用。
5. 熟练配合迭代器适配器，用闭包组织数据处理流水线。

## 1. 闭包语法与捕获推断

闭包写法是 `|参数| 表达式`，参数与返回值类型通常省略、由首次调用推断。它和函数的关键差异只有一条：**闭包体可以使用外层作用域的变量**（捕获），函数不能：

```rust
fn main() {
    let base_fee = 180; // 演唱会基础票价

    // 闭包捕获 base_fee，参数类型由调用处推断
    let price = |vip: bool| if vip { base_fee * 2 } else { base_fee };
    println!("普通票 {} 元，VIP 票 {} 元", price(false), price(true));

    // 无参数闭包：只读捕获，可反复调用
    let announce = || println!("本场基础票价 {base_fee} 元");
    announce();
    announce();

    // 对照：普通函数无法使用 base_fee，只能写死或传参
    fn plain(vip: bool) -> i32 {
        if vip { 360 } else { 180 }
    }
    println!("函数版：{}", plain(true));
}
```

**解读**：捕获是自动的——闭包体里用了 `base_fee`，编译器就把它捕获进来，无需声明。捕获方式也自动推断，规则是"满足闭包体的前提下，取**能力最小**的捕获"：只读用不可变借用（`&T`），要修改用可变借用（`&mut T`），需要把值**移出**（如 `move` 进返回值、按值存进别的结构）才按值捕获。这条最小能力原则决定了闭包属于三个 `Fn` 特征中的哪一个。

还有两个语法层面的认知：其一，每个闭包都是编译器生成的**独一无二的匿名类型**——两段一模一样的闭包字面量也是两个不同类型，这就是为什么存储多个闭包需要 trait 对象或枚举；其二，闭包可以显式标注参数与返回类型（`|p: u32| -> u32 { ... }`），但标注一旦写上，后续调用就不能再推断成别的类型。与函数指针 `fn(u32) -> u32` 的区别也值得一记：函数指针只能指向"不捕获环境"的函数或无捕获闭包，类型是具名的、可 `memcpy` 的；闭包类型则携带环境数据，无法用函数指针对待。

## 2. Fn / FnMut / FnOnce：三个特征的能力边界

三个特征构成一条能力链：`Fn` 最弱（只读）、`FnMut` 中间（可改）、`FnOnce` 最强（可消耗），后者是前者的超集——`Fn` 闭包自动实现全部三个，`FnMut` 闭包实现后两个，`FnOnce` 闭包只有自己：

| 特征 | 捕获方式 | 调用次数 | 典型场景 |
| :--- | :--- | :--- | :--- |
| `Fn` | `&T` 只读借用 | 不限 | 断言、格式化、比较器 |
| `FnMut` | `&mut T` 可变借用 | 不限 | 计数器、累加器、排序键 |
| `FnOnce` | `T` 按值消耗 | 消耗自身，通常一次 | 线程任务、一次性回调 |

```rust
fn main() {
    // Fn：只读捕获，可无限次调用
    let slogan = String::from("星海之约");
    let banner = || println!("横幅：{slogan}");
    banner();
    banner();

    // FnMut：修改捕获变量，闭包本身必须声明为 mut
    let mut sold = 0u32;
    let mut sell = || sold += 1;
    sell();
    sell();
    println!("已售票 {sold} 张"); // 2

    // FnOnce：把捕获的 String move 出去，闭包被消耗
    let gift = String::from("签名海报");
    let handout = move || println!("赠出：{gift}（{} 字节）", gift.len());
    handout(); // gift 的所有权在此离开闭包
    // handout(); // 错误[E0382]：闭包已被消耗（FnOnce）
}
```

**解读**：`FnOnce` 的"Once"不是"只能定义一次"，而是**调用它按值消费自身捕获的数据**，调用后闭包"用掉了"（准确说是编译器把 `call` 方法声明为消耗 `self`）。API 设计者按"需求的最小能力"选约束：只用一次的回调（如 `thread::spawn`）声明 `FnOnce`——它最宽松，能接纳最多的闭包；多次调用且要修改选 `FnMut`；多次只读选 `Fn`。反过来，调用方拿到的是越强能力的闭包，编译器对它的限制越少。

从方法的视角能看得更本质：三个特征各对应一个调用方法——`FnOnce::call_once(self)`、`FnMut::call_mut(&mut self)`、`Fn::call(&self)`，与普通方法的 `self`/`&mut self`/`&self` 接收者一一对应。闭包被存储或传递时，这三个方法就是它全部的调用入口；`Box<dyn FnOnce>` 的特殊之处在于调用需要消耗盒子本身，标准库为此专门实现了 `FnOnce for Box<F>`。判断一个闭包属于哪个特征有一个速查口诀：**看闭包体对捕获变量做了什么**——只出现在表达式里是 `Fn`，出现在赋值左侧或调用可变方法的是 `FnMut`，被 `move` 出闭包体（返回、存进别的所有者）的是 `FnOnce`。

## 3. move：把所有权搬进闭包

`move` 写在闭包参数列表前，把**所有捕获都改为按值转移**，不再借用外部变量。两个必须使用的场景：线程任务与返回闭包。原因相同——闭包可能活得比被借用的局部变量久：

```rust
use std::thread;

fn main() {
    let concert = String::from("虚拟歌手跨年夜");

    // move 把 concert 的所有权搬进线程闭包：
    // 没有它，闭包只借用 concert，而线程可能活得比 main 栈帧久
    let handle = thread::spawn(move || {
        println!("欢迎来到 {concert}");
    });
    handle.join().unwrap();
    // println!("{concert}"); // 错误：所有权已随 move 转移
}
```

**解读**：两个细节容易误解。其一，`move` 只改变**捕获方式**（借用变转移），不改变闭包属于哪个 `Fn` 特征——`move` 后只读使用仍是 `Fn`，例如第二节 `handout` 虽然是 `move` 闭包，但因为它把 `gift` 消耗出去才成为 `FnOnce`；若 `move` 闭包体内只 `println!`（借用即可），它仍是 `Fn`。其二，捕获发生在**定义闭包时**而非调用时——按值捕获的变量在定义那一刻就归属闭包，这解释了为什么 `FnOnce` 闭包定义后原变量立即不可用。工程习惯：线程闭包、返回闭包必写 `move`；其余场景依赖自动捕获，只在编译器要求时才加。

`move` 与 `Copy` 类型的交互也常造成困惑：对实现了 `Copy` 的捕获（整数、`&T` 等），`move` 执行的是按位复制，原变量依然可用——"转移"对它们毫无感觉。这就解释了一个现象：线程闭包里用 `i32` 计数器不用 `Arc` 也能编译，但每个线程拿到的是**各自的副本**，累加结果不会互通；想让所有线程改同一个数，仍需 `Arc<Mutex<i32>>`。所以 `move` 解决的是"数据从哪来"，不解决"数据是否共享"，两个问题要用两套工具回答。

## 4. 闭包作为参数与返回值

把闭包作为参数有三种写法，适用场景不同：**泛型约束**（编译期单态化、零开销、但泛型膨胀）、**`impl Trait`**（语法糖版的泛型约束，签名更清爽）、**trait 对象 `Box<dyn Fn>`**（运行期动态分发、可存进集合、代价是一次虚调用）：

```rust
// 泛型约束写法：编译期单态化，零运行时开销
fn apply_rule<F: Fn(u32) -> u32>(price: u32, rule: F) -> u32 {
    rule(price)
}

// 返回闭包：必须 move —— 捕获的 rate 若只被借用，闭包返回后即悬垂
fn make_discount(rate: u32) -> impl Fn(u32) -> u32 {
    move |price| price * rate / 100
}

fn main() {
    // impl Trait 参数写法（与泛型约束等价，签名更短）
    let early_bird = apply_rule(200, |p| p.saturating_sub(30));

    // trait 对象写法：不同闭包类型统一装进集合
    let rules: Vec<Box<dyn Fn(u32) -> u32>> = vec![
        Box::new(|p| p / 2),           // 学生半价
        Box::new(|p| p.saturating_sub(50)), // 团购立减
    ];
    let group = rules[0](200);

    let vip = make_discount(80)(200);
    println!("早鸟 {early_bird}，学生 {group}，VIP {vip}"); // 170 100 160
}
```

**解读**：返回闭包必须 `move` 的原因值得记牢——闭包若按默认方式**借用** `rate`（一个即将销毁的局部变量），返回后借用悬垂，编译器直接拒绝；`move` 让 `rate` 成为闭包的私有数据，闭包走到哪数据跟到哪。`impl Trait` 返回值意味着"某个实现了 Fn 的具体类型"（编译期已知但不具名），若需要运行期切换策略（如从配置读折扣规则），就退到 `Box<dyn Fn>`。三者的选择顺序：默认泛型约束，签名嫌长换 `impl Trait`，需要异构集合或运行期多态才用 trait 对象。

三种写法的性能特征也值得量化理解：泛型约束与 `impl Trait` 在编译期**单态化**——每个闭包类型生成一份专属代码，调用被内联成直接跳转，与手写代码同样快，代价是编译产物膨胀；trait 对象则通过虚表（vtable）**动态分发**——调用多一次指针跳转且编译器难以内联，换来的是体积与灵活性。绝大多数业务代码里这点差距可以忽略，但在热循环（如逐帧音频处理）中，把 `dyn` 换回泛型是常见的优化动作。

## 5. 与迭代器适配器的配合

迭代器适配器几乎每个方法都接收闭包，两者组合是 Rust 数据处理的惯用法：`filter` 挑选、`map` 变换、`sort_by_key` 排序、`fold` 聚合。闭包在这里的角色是"策略注入"——框架控制遍历流程，你只提供判定与变换逻辑：

```rust
#[derive(Debug)]
struct Song {
    title: String, // 歌曲名
    plays: u32,    // 累计播放量
}

fn main() {
    let songs = vec![
        Song { title: String::from("银河回廊"), plays: 9800 },
        Song { title: String::from("午夜霓虹"), plays: 15200 },
        Song { title: String::from("晚安曲"), plays: 6400 },
    ];

    // 闭包驱动的处理流水线：过滤 -> 排序 -> 提取
    let mut hot: Vec<&Song> =
        songs.iter().filter(|s| s.plays > 7000).collect();
    hot.sort_by_key(|s| std::cmp::Reverse(s.plays)); // 播放量降序

    let names: Vec<String> = hot.iter().map(|s| s.title.clone()).collect();
    println!("热门曲目：{names:?}");

    // 聚合：sum 内部用 FnMut 累加，链式写完零中间变量
    let total: u32 = songs.iter().map(|s| s.plays).sum();
    println!("总播放量 {total}"); // 31400
}
```

**解读**：留意各适配器接收的闭包特征：`filter` 需要 `FnMut`（内部反复调用判定）、`sort_by_key` 需要 `FnMut`（排序过程中多次取键）、`map` 需要 `FnMut`。而这些都是**外部可变状态**不可见时的"隐式 FnMut"——我们的闭包只读捕获，自动实现更高层的 `Fn`。另一个实用点是惰性求值：`filter`/`map` 都不立即执行，直到 `collect`/`sum` 这类消费适配器收口，整条流水线一趟遍历完成，没有中间数组。

配合迭代器还有两个高频小技巧。一是 `collect` 的目标类型需要**提示**：`let v: Vec<_> = ...collect()` 或 `...collect::<Vec<_>>()`，编译器无法凭空知道你想要什么容器；`collect` 还能直接收集进 `HashMap`、`String` 等任何实现了 `FromIterator` 的类型。二是 `fold` 是最通用的聚合器——`sum`、`count`、`max` 本质上都是特定场景的 `fold`，当内置方法不够用时，`fold(init, |acc, x| ...)` 配合闭包几乎能表达任何归约逻辑，闭包在这里扮演"聚合策略"的角色，与第一节"闭包注入行为"的定位完全一致。

## 易错点与最佳实践

1. **在闭包内修改捕获变量却没写 `mut`**。错误：`let sell = || sold += 1;` 报 E0596（无法可变借用捕获变量）。修正：闭包本身声明 `let mut sell = ...`，因为修改捕获要求闭包自身可变。
2. **返回闭包缺 `move`**。错误：`fn make(x: u32) -> impl Fn() -> u32 { || x + 1 }` 报 E0373——闭包按默认方式借用局部变量 `x`，返回后必然悬垂。修正：`move || x + 1`；所有返回闭包默认带 `move`。
3. **`FnOnce` 闭包调用两次**。错误：捕获 `String` 并将其 `move` 出去的闭包第二次调用报 E0382。修正：改为 `FnMut`（只借用修改），或每次调用前 `clone` 闭包（要求捕获类型可复制）。
4. **异构闭包装进 `Vec<impl Fn>`**。错误：两个不同的闭包是不同的具体类型，`vec![|| a, || b]` 类型不一致。修正：`Vec<Box<dyn Fn...>>` 统一为 trait 对象。
5. **参数约束贪多**。最佳实践：API 声明闭包约束时取"够用的最弱特征"——只用一次选 `FnOnce`、多次可变选 `FnMut`、只读选 `Fn`；约束越弱，能接纳的闭包越多，调用方越省心。

## 本篇小结

1. 闭包 = 捕获环境的匿名函数；编译器按"最小能力"自动选择捕获方式：只读 `Fn`、可改 `FnMut`、消耗 `FnOnce`。
2. 三个特征是能力链（`Fn` ⊂ `FnMut` ⊂ `FnOnce`），API 按需选最弱约束，接纳面最大。
3. `move` 把捕获从借用改为所有权转移，线程任务与返回闭包必须使用；它只改捕获方式，不改特征归属。
4. 闭包参数三写法：泛型约束（零开销）、`impl Trait`（简写）、`Box<dyn Fn>`（运行期多态）；返回闭包必 `move`。
5. 迭代器适配器是闭包的主战场：`filter`/`map`/`sort_by_key`/`fold` 组成惰性流水线，策略与流程彻底分离。

> **一句话记忆**：闭包的类型由"你怎么用捕获的变量"决定——只读是 `Fn`、要改是 `FnMut`、搬走是 `FnOnce`；`move` 是把环境打包带走的行李标签，跨线程与返回闭包必贴。

## 动手实践

1. 实现 `fn run_after<F: FnOnce()>(name: &str, f: F)`：打印"任务 name 开始"，调用 `f`，再打印"任务 name 完成"。思路：`FnOnce` 只能调用一次，体会"一次性任务"约束；再改造成接收 `FnMut` 的重试版本。
2. 用 `Box<dyn Fn(u32) -> u32>` 构建一个"票价策略链"：按顺序应用早鸟减免、会员九折、满减三个闭包，支持从命令行参数选择启用哪几个。思路：策略存 `Vec<Box<dyn Fn(u32) -> u32>>`，逐个 fold 应用。
3. 把手动 `for` 循环统计"每个 P主 的歌曲数"重构为迭代器流水线（`HashMap` 计数）。思路：`iter().fold(HashMap::new(), |mut acc, s| { *acc.entry(...).or_insert(0) += 1; acc })`，体会闭包作为 `fold` 聚合策略的写法。
