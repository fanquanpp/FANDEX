# Rust 控制流

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## if 分支

**基本写法：if / else if / else**
`if <条件> { ... } else if <条件> { ... } else { ... }`

```rust
// 条件不加括号，块必须用花括号包裹
let requests = 128;
if requests > 100 {
    println!("开启应援通道");
} else {
    println!("请排队等待");
}
```

---

## if 表达式

**基本写法：if 作为表达式赋值**
`let <变量名> = if <条件> { <值A> } else { <值B> };`

```rust
// if 是表达式，两个分支必须返回同类型
let fans = 500;
let badge = if fans >= 1000 { "金徽章" } else { "银徽章" };
println!("{}", badge);
```

---

## loop 循环

**基本写法：loop 无限循环**
`loop { ... break <返回值>; }`

```rust
// loop 无限循环，break 可携带返回值
let mut count = 0;
let result = loop {
    count += 1;
    if count == 3 { break count * 10; }
};
println!("{}", result);
```

---

## while 循环

**基本写法：while 条件循环**
`while <条件> { ... }`

```rust
// while 先判断条件，再决定是否继续执行
let mut tickets = 3;
while tickets > 0 {
    tickets -= 1; // 逐张放票
}
println!("{}", tickets);
```

---

## for 区间遍历

**基本写法：for 遍历数值区间**
`for <变量> in <起>..<终> { ... }`

```rust
// a..b 左闭右开，a..=b 包含末端
for day in 1..=3 {
    println!("巡演第 {} 天", day);
}
```

---

## for 遍历集合

**基本写法：for 配合迭代器遍历**
`for <变量> in <集合>.iter() { ... }`

```rust
// iter_mut() 提供可变借用，可原地修改元素
let mut votes = [9, 8, 10];
for v in votes.iter_mut() {
    *v += 1; // 全员加一票
}
println!("{:?}", votes);
```

---

## match 匹配

**基本写法：match 模式匹配**
`match <值> { <模式> => <结果>, ... _ => <兜底> }`

```rust
// match 必须穷尽所有可能，_ 为通配分支
let code = 2;
let status = match code {
    1 => "预订中",
    2 => "售票中",
    _ => "已结束",
};
println!("{}", status);
```
