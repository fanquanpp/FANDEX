# Rust 泛型、trait 与生命周期

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 泛型函数

**基本写法：尖括号声明类型参数**
`fn <函数名><<T>>(<参数>: <T>) -> <T> { ... }`

```rust
// T 是类型参数，PartialOrd 约束其支持比较
fn loudest<T: PartialOrd>(a: T, b: T) -> T {
    if a > b { a } else { b }
}

fn main() {
    println!("{}", loudest(88, 92));
}
```

---

## 泛型结构体

**基本写法：结构体携带类型参数**
`struct <名称><<T>> { <字段>: <T>, ... }`

```rust
// 同一结构体可服务多种元素类型
struct Playlist<T> {
    owner: String, // 播放单创建者
    items: Vec<T>, // 条目集合
}
```

---

## 定义 trait

**基本写法：trait 声明共享行为**
`trait <名称> { fn <方法名>(&self) -> <类型>; }`

```rust
// 只有签名的的方法必须实现；带默认体可省略
trait Perform {
    fn stage_name(&self) -> String;
    fn greet(&self) -> String { // 默认实现
        format!("大家好，我是 {}", self.stage_name())
    }
}
```

---

## 实现 trait

**基本写法：impl Trait for 类型**
`impl <trait名> for <类型名> { ... }`

```rust
// 为具体类型补齐 trait 要求的全部必需方法
struct Vsinger { name: String }

impl Perform for Vsinger {
    fn stage_name(&self) -> String {
        self.name.clone()
    }
}
```

---

## trait 约束

**基本写法：泛型参数加 trait 约束**
`fn <函数名><<T>: <trait名>>(<参数>: &<T>) { ... }`

```rust
// T: Perform 限定参数必须实现该行为
fn open_show<T: Perform>(artist: &T) {
    println!("{}", artist.greet());
}
```

---

## impl Trait 简写

**基本写法：&impl Trait 参数简写**
`fn <函数名>(<参数>: &impl <trait名>) { ... }`

```rust
// 与泛型约束等价的简写形式，适合单参数场景
fn encore(artist: &impl Perform) -> String {
    artist.greet()
}
```

---

## 生命周期标注

**基本写法：'a 标注引用存活范围**
`fn <函数名><'a>(<x>: &'a <T>, <y>: &'a <T>) -> &'a <T>`

```rust
// 'a 声明多个引用的存活约束，保证返回值引用有效
fn longer<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() > b.len() { a } else { b }
}

let title = longer("Snow Halo", "Aurora");
```

---

## 结构体生命周期

**基本写法：结构体持有引用时标注 'a**
`struct <名称><'a> { <字段>: &'a <T> }`

```rust
// 结构体借用外部数据时，必须声明生命周期
struct Highlight<'a> {
    text: &'a str, // 借用的歌词片段
}

let lyric = String::from("stardust rain");
let h = Highlight { text: &lyric[0..8] }; // "stardust"
```
