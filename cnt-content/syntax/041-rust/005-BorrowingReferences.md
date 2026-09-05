# Rust 借用与引用

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 不可变引用

**基本写法：& 创建只读借用**
`&<变量>` / `fn <函数名>(<参数>: &<类型>)`

```rust
// & 借用值而不取得所有权，函数调用后原值仍可用
fn count_words(lyric: &str) -> usize {
    lyric.split_whitespace().count()
}

let lyric = String::from("星屑 雨声 舞台");
println!("{}", count_words(&lyric));
```

---

## 可变引用

**基本写法：&mut 创建可写借用**
`fn <函数名>(<参数>: &mut <类型>) { *<参数> ... }`

```rust
// &mut 可修改数据，原变量必须声明为 mut
fn add_like(count: &mut u32) {
    *count += 1; // 解引用后自增
}

let mut likes = 10;
add_like(&mut likes);
```

---

## 多个不可变引用

**基本写法：多个只读借用共存**
`let <引用1> = &<变量>; let <引用2> = &<变量>;`

```rust
// 同时存在多个不可变引用是允许的
let song = String::from("Snow Halo");
let r1 = &song;
let r2 = &song;
println!("{} / {}", r1, r2);
```

---

## 借用冲突

**错误示例：可变与不可变借用同时存在**
`// cannot borrow as immutable 编译错误`

```rust
// 已有可变借用时，不能再创建任何其他借用
let mut song = String::from("Snow Halo");
let editing = &mut song;
let reading = &song; // 编译错误：同时可变与不可变借用
println!("{} {}", editing, reading);
```

---

## 解引用修改

**基本写法：\* 读写引用指向的值**
`*<可变引用> = <新值>;`

```rust
// 通过解引用直接修改原数据
let mut votes = 9;
let r = &mut votes;
*r += 1; // votes 变为 10
println!("{}", votes);
```

---

## 字符串切片

**基本写法：&str 借用字符串片段**
`&<字符串>[<起>..<终>]`

```rust
// 切片借用字符串的一段连续内容
let lyric = String::from("Snow Halo");
let first_word = &lyric[0..4]; // "Snow"
println!("{}", first_word);
```

---

## 数组切片

**基本写法：&[T] 借用序列片段**
`&<集合>[<起>..<终>]`

```rust
// 切片同样适用于数组与 Vec，..3 表示从头到下标 2
let tops = [1, 2, 3, 4, 5];
let top3 = &tops[..3]; // 前三名
println!("{:?}", top3);
```
