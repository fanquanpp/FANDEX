# Rust 结构体与枚举

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 定义结构体

**基本写法：struct 命名字段结构体**
`struct <名称> { <字段>: <类型>, ... }`

```rust
// struct 定义命名字段结构体，字段类型逐一标注
struct Vsinger {
    name: String,
    theme_color: String, // 应援色
    fans: u64,
}
```

---

## 实例化结构体

**基本写法：创建实例**
`let <实例> = <结构体名> { <字段>: <值>, ... };`

```rust
// 字段名: 值 初始化；实例声明为 mut 则整体可变
let mut miku = Vsinger {
    name: String::from("Miku"),
    theme_color: String::from("#39C5BB"),
    fans: 1_000_000,
};
miku.fans += 1;
```

---

## 结构体更新语法

**基本写法：..base 复用已有实例字段**
`let <新实例> = <结构体名> { <字段>: <值>, ..<旧实例> };`

```rust
// 显式给出新值字段，其余从 miku 复制（miku 为已有实例）
let luka = Vsinger {
    name: String::from("Luka"),
    theme_color: String::from("#FFAACF"),
    ..miku
};
```

---

## 元组结构体

**基本写法：struct 元组形式**
`struct <名称>(<类型1>, <类型2>);`

```rust
// 字段无名，按 .0 .1 位置访问
struct Ticket(u32, String); // 座位号, 看台区域

let seat = Ticket(7, String::from("A 区"));
println!("{} 区 {} 号", seat.1, seat.0);
```

---

## 实现方法

**基本写法：impl 块定义方法**
`impl <结构体名> { fn <方法名>(&self) ... }`

```rust
// &self 只读借用自身；方法用实例.方法() 调用
struct Concert { city: String, tickets: u32 }

impl Concert {
    fn sold_out(&self) -> bool {
        self.tickets == 0
    }
}
```

---

## 定义枚举

**基本写法：enum 声明状态枚举**
`enum <名称> { <变体1>, <变体2>, ... }`

```rust
// enum 列出某事物的全部可能状态
enum SongStatus {
    Draft,     // 未发布
    Published, // 已上线
    Archived,  // 已下架
}
```

---

## 携带数据的枚举

**基本写法：变体携带不同类型数据**
`enum <名称> { <变体>(<类型>), ... }`

```rust
// 各变体可携带数量与类型不同的数据
enum Reward {
    Coin(u64),      // 应援币
    Ticket(String), // 演唱会门票
    Nothing,        // 谢谢参与
}
```

---

## match 解构枚举

**基本写法：match 逐变体处理并解构**
`match <枚举值> { <变体>(<绑定>) => ..., ... }`

```rust
// match 按变体分支，并解构出携带的数据
let gift = Reward::Coin(520);
let msg = match gift {
    Reward::Coin(n) => format!("获得 {} 应援币", n),
    Reward::Ticket(area) => format!("{} 门票", area),
    Reward::Nothing => String::from("下次努力"),
};
```
