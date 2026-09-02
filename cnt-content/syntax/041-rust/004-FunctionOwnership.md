# Rust 函数与所有权移动

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 函数定义

**基本写法：fn 定义函数**
`fn <函数名>(<参数>: <类型>) { ... }`

```rust
// fn 定义函数，参数必须显式标注类型
fn sign_song(producer: &str, singer: &str) {
    println!("{} 为 {} 写歌", producer, singer);
}

fn main() {
    sign_song("MikuP", "Miku");
}
```

---

## 返回值

**基本写法：表达式作为返回值**
`fn <函数名>(...) -> <返回类型> { <表达式> }`

```rust
// 最后一个表达式不带分号，即为返回值
fn rating_bonus(rating: f64) -> f64 {
    if rating > 4.5 { 10.0 } else { 0.0 }
}

fn main() {
    println!("{}", rating_bonus(4.9));
}
```

---

## 所有权移动

**基本写法：赋值或传参移动所有权**
`let <新变量> = <原变量>;`

```rust
// String 等堆类型赋值时移动所有权，而非复制
fn archive(title: String) {
    println!("已归档：{}", title);
}

let song = String::from("Snow Halo");
archive(song); // 所有权移入函数
```

---

## 移动后再使用

**错误示例：使用已移动的变量**
`// moved value 编译错误`

```rust
// 所有权移动后，原变量即失效不可再用
let song = String::from("Snow Halo");
let picked = song; // 所有权移动到 picked
println!("{}", song); // 编译错误：borrow of moved value
println!("{}", picked);
```

---

## clone 克隆

**基本写法：clone 深拷贝堆数据**
`<变量>.clone()`

```rust
// clone 复制堆上数据，原变量保持可用
let song = String::from("Snow Halo");
let backup = song.clone();
println!("{} / {}", song, backup);
```

---

## Copy 类型

**基本写法：标量类型的复制语义**
`let <新变量> = <标量变量>;`

```rust
// 整数、浮点、bool、char 等实现 Copy，赋值即复制
let plays = 1024;
let stat = plays; // 复制而非移动
println!("{} {}", plays, stat);
```

---

## 返回所有权

**基本写法：函数返回值转移所有权**
`fn <函数名>() -> String { ... }`

```rust
// 返回值把所有权从函数内部移出到调用方
fn make_title() -> String {
    String::from("Snow Halo")
}

let title = make_title(); // title 获得所有权
println!("{}", title);
```
