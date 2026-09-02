# Rust 错误处理

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## panic 宏

**基本写法：panic! 终止程序**
`panic!("<消息>")`

```rust
// 不可恢复错误用 panic!，立即终止当前线程
fn check_seat(seat: i32) {
    if seat < 0 {
        panic!("座位号不能为负：{}", seat);
    }
}
```

---

## Result 类型

**基本写法：返回 Result 表示可恢复错误**
`fn <函数名>(...) -> Result<<T>, <E>> { Ok(...) | Err(...) }`

```rust
// Ok(T) 表示成功，Err(E) 表示失败，交由调用方处理
fn check_sold_out(left: u32) -> Result<(), String> {
    if left == 0 { Err(String::from("门票已售罄")) } else { Ok(()) }
}
```

---

## match 处理 Result

**基本写法：match 显式处理两种分支**
`match <结果> { Ok(v) => ..., Err(e) => ... }`

```rust
// match 强制处理成功与失败，不留遗漏
match check_sold_out(0) {
    Ok(()) => println!("购票成功"),
    Err(msg) => println!("失败：{}", msg),
}
```

---

## unwrap 与 expect

**基本写法：快速取出 Ok 值**
`<结果>.unwrap()` / `<结果>.expect("<消息>")`

```rust
// unwrap 失败即 panic；expect 可自定义报错信息
let input = "520";
let count = input.parse::<u32>().expect("票数必须是数字");
println!("售出 {} 张", count);
```

---

## 传播错误

**基本写法：? 运算符向上传播**
`<返回 Result 的表达式>?;`

```rust
// ? 遇 Err 立即把错误返回给调用方，成功则取出值
fn buy_ticket(left: u32) -> Result<u32, String> {
    check_sold_out(left)?;
    Ok(left - 1)
}
```

---

## main 返回 Result

**基本写法：main 函数返回 Result**
`fn main() -> Result<(), Box<dyn std::error::Error>>`

```rust
// main 可返回 Result，错误最终打印给用户
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let n: u32 = "128".parse()?; // 解析失败自动返回
    println!("售出 {} 张", n);
    Ok(())
}
```

---

## 自定义错误枚举

**基本写法：enum 定义业务错误类型**
`#[derive(Debug)] enum <错误名> { <变体>... }`

```rust
// 用枚举表达业务错误，配合 match 精确处理
#[derive(Debug)]
enum TicketError {
    SoldOut,          // 已售罄
    InvalidSeat(i32), // 非法座位号
}
```
