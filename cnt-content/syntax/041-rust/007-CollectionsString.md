# Rust 常用集合与 String

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## Vec 创建

**基本写法：vec! 宏与 push 追加**
`let <集合>: Vec<<T>> = vec![<元素>...];`

```rust
// Vec 是可增长向量，push 在尾部追加
let mut playlist: Vec<&str> = vec!["Snow Halo", "Starlight"];
playlist.push("Aurora");
println!("{:?}", playlist);
```

---

## Vec 访问

**基本写法：索引与 get 安全访问**
`&<集合>[<下标>]` / `<集合>.get(<下标>)`

```rust
// 索引越界会 panic；get 返回 Option 更安全
let playlist = vec!["Snow Halo", "Aurora"];
let first = &playlist[0];     // 直接索引
let maybe = playlist.get(5);  // 越界得到 None
println!("{:?} {:?}", first, maybe);
```

---

## Vec 遍历修改

**基本写法：可变迭代遍历**
`for <变量> in &mut <集合> { ... }`

```rust
// &mut 遍历获得可变借用，解引用后修改
let mut scores = vec![88, 92, 79];
for s in &mut scores {
    *s += 1;
}
println!("{:?}", scores);
```

---

## Vec 移除

**基本写法：pop 弹出尾部元素**
`<集合>.pop()`

```rust
// pop 移除并返回尾部元素，类型为 Option
let mut queue = vec!["encore", "finale"];
let last = queue.pop(); // Some("finale")
println!("{:?} {:?}", queue, last);
```

---

## String 创建

**基本写法：String::from 与 push_str**
`String::from("<文本>")` / `<字符串>.push_str("<文本>")`

```rust
// String 是堆上可增长字符串，与 &str 不同
let mut title = String::from("Snow");
title.push_str(" Halo"); // 追加字符串片段
title.push('!');         // 追加单个字符
```

---

## String 拼接

**基本写法：+ 运算符与 format! 宏**
`<字符串A> + &<字符串B>` / `format!("{}{}", <A>, <B>)`

```rust
// + 会拿走左操作数的所有权；format! 更灵活
let p = String::from("Miku");
let tag = p + " feat. Luka";
let full = format!("{} (Live)", tag);
```

---

## HashMap 插入

**基本写法：HashMap::new 与 insert**
`<映射>.insert(<键>, <值>);`

```rust
// HashMap 存储键值对，使用前需引入标准库模块
use std::collections::HashMap;

let mut votes = HashMap::new();
votes.insert("Miku", 1024);
votes.insert("Luka", 860);
```

---

## HashMap 读取

**基本写法：get 返回 Option**
`<映射>.get(<键>)`

```rust
// get 返回 Option<&V>，键不存在时得到 None
use std::collections::HashMap;

let votes = HashMap::from([("Miku", 1024)]);
if let Some(v) = votes.get("Miku") {
    println!("Miku：{} 票", v);
}
```

---

## HashMap 计数

**基本写法：entry().or_insert(0) 累加**
`*<映射>.entry(<键>).or_insert(<默认值>) += 1;`

```rust
// entry 不存在时插入默认值，常用于计数统计
use std::collections::HashMap;

let mut counter = HashMap::new();
for song in ["Snow", "Snow", "Aurora"] {
    *counter.entry(song).or_insert(0) += 1;
}
```
