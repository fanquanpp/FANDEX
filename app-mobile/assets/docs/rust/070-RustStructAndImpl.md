---
order: 80
title: 结构体与方法
module: 'rust'
category: 后端技术
difficulty: beginner
description: 结构体定义与初始化简写、元组与单元结构体、impl 方法与关联函数、derive(Debug) 打印调试
author: fanquanpp
updated: '2026-10-07'
related:
  - 'rust/050-RustOwnershipBorrowing'
  - 'rust/075-RustEnumAndPatternMatching'
  - 'rust/080-RustErrorHandling'
prerequisites:
  - 'rust/050-RustOwnershipBorrowing'
---

## 前置知识

- [所有权与借用](/rust/050-RustOwnershipBorrowing)：理解 move 与借用规则，本文的字段与方法签名会大量用到。

## 知识点地图

- **知识类别**：数据建模中的「单一实体」表达——结构体（struct）与方法（impl）。上一篇语义的另一半：结构体把多个字段组合成一个整体，枚举把多种形态收进一个类型（见 [枚举与模式匹配](/rust/075-RustEnumAndPatternMatching)）。
- **解决什么问题**：用户有姓名、年龄、活跃度等多个属性，函数传参写成零散的 `String`、`u8`、`bool` 既难读又易错位；行为（面积计算、缩放）散落成顶层函数后与数据的关联无从表达。
- **什么时候用到**：第一次为业务实体建模时；给类型绑定方法与构造器时；打印调试任何自定义类型时。
- **本篇不讲**：多种形态的建模（枚举与 match，见 075 篇）；数据的所有与借用细节（见 [所有权与借用](/rust/050-RustOwnershipBorrowing)）。

## 学习目标

读完本文你将能够：

1. 会定义结构体与 impl 方法，分清 `&self`、`&mut self`、`self` 三种形态与关联函数；
2. 会用字段初始化简写与 `..` 更新语法减少样板；
3. 会按场景选普通结构体、元组结构体或单元结构体；
4. 会派生（derive）`Debug` 完成自定义类型的打印调试。

预计 40 分钟。

## 1. 从"登记表"说起：结构体（Struct）

想象一张学员登记表：姓名、年龄、是否活跃——几个字段合在一起，就是一个"学员"的整体信息。**结构体就是把多个字段组合成一个自定义类型**，是组织数据的基本单位。

```rust
struct User {
    name: String,
    age: u8,
    active: bool,
}

fn main() {
    let user = User {
        name: String::from("张三"),
        age: 18,
        active: true,
    };
    println!("{} {}", user.name, user.age);
}
```

讲解：字段默认不可变；整个结构体需要修改时声明 `let mut user`。结构体没有构造函数的强制语法，直接用字面量初始化。

### 1.1 字段初始化简写与更新语法

```rust
fn build_user(name: String, age: u8) -> User {
    User {
        name,        // 字段名与变量名相同可简写
        age,
        active: true,
    }
}

let u1 = build_user(String::from("李四"), 20);
let u2 = User { age: 21, ..u1 }; // 其余字段从 u1 复制
```

讲解：`..u1` 展开其余字段，等价于逐字段拷贝；注意它会把 `name`（String）从 u1 中移动走，此后 u1 不能再整体使用。

### 1.2 元组结构体与单元结构体

```rust
struct Color(u8, u8, u8);   // 元组结构体：字段无名字
let red = Color(255, 0, 0);
println!("{}", red.0);      // 按索引访问

struct Marker;              // 单元结构体：无字段，常用于类型标记
```

讲解：元组结构体适合"只有一个主要属性"的轻量封装；单元结构体常配合 trait 做类型级标记。

## 2. 方法（impl）

用 `impl` 块为结构体定义方法：

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // 方法：&self 借用结构体，只读
    fn area(&self) -> u32 {
        self.width * self.height
    }
    // 可变方法：&mut self
    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }
    // 关联函数：没有 self，等价于静态方法，用 :: 调用
    fn square(side: u32) -> Rectangle {
        Rectangle { width: side, height: side }
    }
}

fn main() {
    let mut r = Rectangle { width: 3, height: 4 };
    println!("area = {}", r.area());   // 12
    r.scale(2);
    println!("area = {}", r.area());   // 48

    let s = Rectangle::square(5);      // 关联函数用 :: 调用
    println!("area = {}", s.area());
}
```

讲解：`self` 三种形态：`&self`（借用只读）、`&mut self`（可变借用）、`self`（获取所有权）；关联函数无 self，用 `Type::fn()` 调用。Rust 没有继承，复用靠 trait（见泛型与 Trait 一篇）。

### 2.1 结构体打印调试

结构体默认不能打印，需要派生（derive）`Debug`：

```rust
#[derive(Debug)]
struct Rectangle { width: u32, height: u32 }

fn main() {
    let r = Rectangle { width: 3, height: 4 };
    println!("{r:?}");       // 单行调试输出
    println!("{r:#?}");      // 多行美化输出
}
```

讲解：`#[derive(Debug)]` 让编译器自动生成调试打印实现；`{:#?}` 美化格式在排查数据结构时非常常用。

## 3. 综合示例：用结构体建模配置项

```rust
#[derive(Debug)]
struct ServerConfig {
    host: String,
    port: u16,
    timeout_secs: u32,
}

impl ServerConfig {
    // 关联函数当构造器：集中默认值
    fn new(host: impl Into<String>, port: u16) -> Self {
        ServerConfig { host: host.into(), port, timeout_secs: 30 }
    }
    // 建造者风味：消费 self 返回 Self，链式设置
    fn with_timeout(mut self, secs: u32) -> Self {
        self.timeout_secs = secs;
        self
    }
}

fn main() {
    let cfg = ServerConfig::new("127.0.0.1", 8080).with_timeout(60);
    println!("{cfg:#?}");
}
```

逐段讲解：

- `new` 用关联函数充当构造器：Rust 没有构造函数语法，`Type::new(...)` 是全生态的约定；`impl Into<String>` 让调用方既能传 `String` 也能传 `&str`（trait 细节见泛型与 Trait 一篇，此处先记住写法）；
- `with_timeout(mut self, ...) -> Self` 是消费式建造者：每次调用拿走 self、改完再还回去，调用链 `ServerConfig::new(..).with_timeout(..)` 因此成立。对比 `&mut self` 版本会发生什么：可变引用版要先 let mut 绑定再逐步改，链式书写消失；
- 结构体字面量初始化必须**写出全部字段**——想「只设置部分字段、其余默认」，要么像这里在 new 里集中默认值，要么用 `..Default::default()`（Default trait 的派生用法）。

## 4. 常见错误与对策

| 编译错误 | 原因 | 对策 |
| :--- | :--- | :--- |
| no method named `area` | 结构体未定义该方法 | 用 `impl` 块添加方法 |
| `Rectangle` cannot be formatted | 结构体未实现 Debug | 加 `#[derive(Debug)]` |
| missing field `active` in initializer | 字面量初始化漏写字段 | 补齐字段，或经 `..expr` 展开其余字段 |
| cannot borrow `r` as mutable | 变量未声明 `mut` 就调用 `&mut self` 方法 | 声明 `let mut r` |

## 5. 与之前和之后的知识的关系

- 往前：结构体字段的所有权与移动遵循 [所有权与借用](/rust/050-RustOwnershipBorrowing) 的规则，`..u1` 更新语法是 move 语义的直接应用；
- 往后：同一类型的多种形态用 [枚举与模式匹配](/rust/075-RustEnumAndPatternMatching) 表达；跨类型复用方法签名靠 trait（见泛型与 Trait 一篇）；错误信息结构体配 `#[derive(Debug)]` 是错误处理篇的日常操作。

## 6. 小结

结构体把零散字段收拢成一个业务实体，`..` 更新语法与字段简写消灭样板；impl 把行为绑定到类型上，`&self`/`&mut self`/`self` 三种形态对应「只读、要改、要拿走」三种意图，关联函数承担构造器职责。一句话记忆：**struct 装数据、impl 给行为**；多种形态的建模请转向枚举与模式匹配一篇。

> **动手提示**：拿你手头项目里的一个「参数散装传递」函数，把参数收拢成结构体 + 建造者，体会一次字面量初始化「必须写全字段」带来的编译期保障。
