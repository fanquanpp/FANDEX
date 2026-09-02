# Rust 闭包与迭代器

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 闭包定义

**基本写法：双竖线声明闭包**
`let <闭包名> = |<参数>| <表达式>;`

```rust
// 参数类型通常可自动推断，调用与函数相同
let add_fans = |base: u64, delta: u64| base + delta;
let double = |n| n * 2;
println!("{} {}", add_fans(1000, 5), double(8));
```

---

## 捕获环境

**基本写法：闭包借用外部变量**
`let <闭包名> = || <使用外部变量的表达式>;`

```rust
// 闭包定义处捕获外部变量，默认为不可变借用
let theme = String::from("#39C5BB");
let show = || println!("应援色：{}", theme);
show();
```

---

## move 闭包

**基本写法：move 取得捕获变量所有权**
`let <闭包名> = move || <表达式>;`

```rust
// move 强制转移所有权，常用于线程或延长生命周期
let owner = String::from("MikuP");
let stamp = move || println!("出品：{}", owner);
stamp();
```

---

## 迭代器遍历

**基本写法：iter() 产生只读迭代器**
`for <变量> in <集合>.iter() { ... }`

```rust
// iter() 逐个产出元素的只读引用
let songs = vec!["Snow Halo", "Aurora"];
for name in songs.iter() {
    println!("{}", name);
}
```

---

## map 变换

**基本写法：map 逐项变换后 collect**
`<集合>.iter().map(|<项>| <表达式>).collect()`

```rust
// map 是惰性适配器，collect 触发执行并收集
let lengths: Vec<usize> = vec!["Snow", "Aurora"]
    .iter()
    .map(|s| s.len())
    .collect();
println!("{:?}", lengths);
```

---

## filter 过滤

**基本写法：filter 保留满足条件的元素**
`<集合>.into_iter().filter(|<项>| <条件>).collect()`

```rust
// filter 只保留闭包返回 true 的元素
let votes = vec![920, 1024, 860];
let hot: Vec<i32> = votes.into_iter().filter(|v| *v > 900).collect();
println!("{:?}", hot);
```

---

## 链式组合

**基本写法：适配器链式调用**
`<集合>.into_iter().filter(...).map(...).sum()`

```rust
// 适配器惰性组合，sum 等消费方法触发计算
let total: u32 = vec![88, 92, 79]
    .into_iter()
    .filter(|v| *v >= 85)
    .map(|v| v + 1)
    .sum();
```

---

## enumerate 下标

**基本写法：enumerate 附带序号**
`for (<下标>, <项>) in <集合>.iter().enumerate() { ... }`

```rust
// enumerate 产出 (下标, 元素) 二元组
let names = vec!["Miku", "Luka"];
for (i, name) in names.iter().enumerate() {
    println!("{} 号：{}", i + 1, name);
}
```
