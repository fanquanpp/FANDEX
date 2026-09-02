# Rust 基础数据类型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 整数类型

**基本写法：声明整数并选择位宽**
`let <变量名>: i32 | u64 | i8 ... = <值>;`

```rust
// 有符号 i8/i16/i32/i64/i128/isize，无符号 u 系列
let like_count: u64 = 86_120; // 累计点赞
let rank: i32 = -3;           // 榜单升降
println!("{} {}", like_count, rank);
```

---

## 浮点类型

**基本写法：声明浮点数**
`let <变量名>: f64 | f32 = <值>;`

```rust
// f32 单精度、f64 双精度，默认推断为 f64
let rating: f64 = 4.9;  // 歌曲评分
let volume: f32 = 0.85; // 音量增益
println!("{} {}", rating, volume);
```

---

## 布尔类型

**基本写法：声明布尔值**
`let <变量名>: bool = true | false;`

```rust
// bool 只有 true 与 false 两种取值
let is_live = true;        // 是否正在直播
let is_vip: bool = false;  // 是否为会员
println!("{} {}", is_live, is_vip);
```

---

## 字符类型

**基本写法：单引号声明 char**
`let <变量名>: char = '<单个字符>';`

```rust
// char 为 4 字节 Unicode 标量值，单引号包裹
let grade = 'S';  // 歌曲评级
let word = '中';  // 任意 Unicode 字符均合法
println!("{} {}", grade, word);
```

---

## 元组

**基本写法：声明与访问元组**
`let <元组名> = (<值1>, <值2>); <元组名>.<下标>`

```rust
// 元组可混合类型，用 .0 .1 按位置访问
let song = ("Snow Halo", 246, 4.9); // 名/秒数/评分
println!("{} {}s {}分", song.0, song.1, song.2);
```

---

## 数组

**基本写法：声明固定长度数组**
`let <数组名>: [<T>; <长度N>] = [<元素>...];`

```rust
// 数组长度编译期固定，类型为 [T; N]
let rgb: [u8; 3] = [255, 102, 204]; // 应援色
println!("R={} 长度={}", rgb[0], rgb.len());
```

---

## 字符串切片

**基本写法：声明 &str 字符串切片**
`let <变量名>: &str = "<文本>";`

```rust
// &str 指向一段只读 UTF-8 文本，字面量默认是 &str
let lyric: &str = "星屑与雨声";
let title = "Snow Halo";
println!("{} / {}", title, lyric);
```

---

## Option 类型

**基本写法：用 Option 表示可能缺失的值**
`Option<<T>> = Some(<值>) | None`

```rust
// Option<T> 只有 Some(v) 与 None 两种可能
let chart_rank: Option<u32> = Some(7); // 在榜第 7
let removed: Option<u32> = None;       // 已下榜
println!("{:?} {:?}", chart_rank, removed);
```

---

## 类型转换

**基本写法：as 显式数值转换**
`<表达式> as <目标类型>`

```rust
// as 完成基础数值类型转换
let total_seconds: u32 = 246;
let minutes = total_seconds / 60;             // 整数除法
let precise = total_seconds as f64 / 60.0;    // 转浮点再除
println!("{} {}", minutes, precise);
```
