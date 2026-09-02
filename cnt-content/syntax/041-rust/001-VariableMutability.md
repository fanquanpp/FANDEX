# Rust 变量与可变性

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 不可变绑定

**基本写法：let 声明不可变变量**
`let <变量名> = <值>;`

```rust
// let 默认不可变，歌名绑定后不可重新赋值
let song_title = "Snow Halo";
println!("{}", song_title);
```

---

## 可变绑定

**基本写法：let mut 声明可变变量**
`let mut <变量名> = <值>;`

```rust
// mut 允许后续重新赋值，如累计播放次数
let mut play_count = 0;
play_count += 1;
println!("{}", play_count);
```

---

## 类型标注

**基本写法：显式标注变量类型**
`let <变量名>: <类型> = <值>;`

```rust
// 冒号后写类型，数字字面量可用下划线分组
let volume: f32 = 0.85;
let fans: u64 = 1_000_000;
println!("{} {}", volume, fans);
```

---

## 变量遮蔽

**基本写法：let 重新声明同名变量**
`let <变量名> = <新值>;`

```rust
// 新绑定遮蔽旧绑定，且允许改变类型
let title = "Snow Halo";
let title = title.len(); // 现在是 usize
println!("{}", title);
```

---

## 常量

**基本写法：const 声明编译期常量**
`const <常量名>: <类型> = <值>;`

```rust
// 常量必须标注类型，命名全大写下划线分隔
const MAX_PLAYLIST: usize = 100;
println!("{}", MAX_PLAYLIST);
```

---

## 解构赋值

**基本写法：元组解构多值绑定**
`let (<变量1>, <变量2>) = <元组>;`

```rust
// 一次绑定多个值：P主与其合作歌姬
let (producer, singer) = ("MikuP", "Miku");
println!("{} feat. {}", producer, singer);
```

---

## 未使用变量

**基本写法：下划线开头抑制警告**
`let _<变量名> = <值>;`

```rust
// 下划线开头表示有意不使用，不触发警告
let _draft_lyric = "未完成的歌词";
println!("草稿已保存");
```
