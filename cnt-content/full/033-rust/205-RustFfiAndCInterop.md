---
order: 250
title: FFI 与 C 互操作
module: 'rust'
category: 后端技术
difficulty: beginner
description: extern "C" 与 unsafe 声明、#[repr(C)] 结构体布局、CString/CStr 边界字符串、Box::into_raw/from_raw 的内存责任、#[no_mangle] 导出、build.rs 链接 C 库，以及被 Python/Node 调用的形态。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'rust/200-RustUnsafeRust'
  - 'rust/150-RustSmartPointers'
  - 'rust/080-RustErrorHandling'
prerequisites:
  - 'rust/050-RustOwnershipBorrowing'
  - 'rust/200-RustUnsafeRust'
---

## 知识点地图

- **知识类别**：语言边界——FFI（Foreign Function Interface）与 C 互操作：声明、调用、导出、内存与字符串的跨界规则。
- **解决什么问题**：Rust 生态再大也覆盖不了所有场景——系统 C 库（OpenSSL、SQLite）、游戏引擎 C ABI 插件、把热点算法给脚本语言用，都要跨过语言边界。FFI 就是那座桥，桥上的规则（调用约定、内存责任、类型布局）本篇一次讲清。
- **什么时候用到**：封装系统 C 库、给游戏引擎写 C ABI 插件、把 Rust 编译成动态库给 Python/Node 加速热点。

前置：《unsafe 与安全边界》（rust/200-RustUnsafeRust）——FFI 是 unsafe 最刚性的应用场景，200 号第 5 节的预览由本篇兑现；《智能指针》（rust/150-RustSmartPointers）——Box 的跨界规则建立在它之上。

## 1. 心智模型：边界上编译器只信你写的声明

跨语言边界时，编译器对另一侧代码一无所知：它不知道 C 函数会不会把指针存下来、会不会释放内存、参数是不是有效的。所以 FFI 的所有调用天然处于 unsafe（rust/200 第 1 节的第五种能力之外的延伸——「调用外部代码」本身不可验证）。

FFI 的全部规则可以压成三个问题：

1. **怎么调**：调用约定与符号名（`extern "C"` + `#[no_mangle]`）；
2. **数据长什么样**：类型布局（`#[repr(C)]`）与字符串/指针的跨界形态；
3. **谁负责内存**：哪一侧分配、哪一侧释放，失败时怎么办。

第一问 200 篇已给出骨架（`extern "C"` 声明导入、`#[no_mangle]` 导出），本篇从第二、三问展开——**大多数 FFI 事故不是调不到函数，而是内存责任没说清**。

## 2. 类型与布局：#[repr(C)]

### 2.1 为什么需要 repr(C)

Rust 结构体默认布局（repr(Rust)）是编译器自由重排的——对齐优化、字段顺序不保证，C 侧完全无法预测。`#[repr(C)]` 强制按 C 的规则布局（声明序、C 对齐规则），两侧才能逐字节对上：

```rust
#[repr(C)]
pub struct Track {
    pub id: u64,
    pub duration_secs: f64,
    pub title: *const c_char,      // 字符串以指针跨界（第 3 节）
}

#[repr(C)]
pub struct PlayResult {
    pub ok: i32,                   // C 没有 bool 与 Result：状态码 + 出参
    pub error_code: i32,
}
```

逐项讲：

- `#[repr(C)]` 写了才有 C 布局——**漏写是 FFI 第一陷阱**：小项目测试可能碰巧对上（无重排空间），字段一多就随机错乱，且错误形态是「字段值莫名串位」而非编译错误；
- C 没有 `bool` 的稳定 ABI 保证（C99 前）、没有 `Option`/`Result`/枚举的等价物——跨界的「状态」用 `i32` 状态码表达，布尔用 `i32`（0/1），错误细节用出参或错误码约定；
- `#[repr(C)]` 枚举要给显式判别值：`#[repr(i32)] enum Status { Ok = 0, NotFound = 1 }`——C 侧的 `int` 才能安全映射。

### 2.2 类型映射速查

| C 类型 | Rust 类型 | 注意 |
| :--- | :--- | :--- |
| `int` / `long` | `c_int` / `c_long`（std::ffi） | C 的 long 位数随平台变，别直接映射 i64 |
| `char*` | `*const c_char` | 字符串指针，见第 3 节 |
| `size_t` | `usize` | 数组长度伴生指针出现 |
| 函数指针 | `extern "C" fn(...)` 或 `Option<extern "C" fn(...)>` | Option 化可表达「可空回调」且布局等同空指针 |
| 结构体 | `#[repr(C)]` struct | 字段序与对齐逐一对齐 |

为什么「C 的 long 不等于 Rust 的 i64」值得单独一行：Windows 64 位的 long 是 32 位、Linux 64 位是 64 位——用 `c_long` 让标准库替你处理平台差异，手写 `i64` 的映射在 Windows 上直接截断。

## 3. 字符串跨界：CString/CStr

### 3.1 两个方向的转换

Rust 的 `String` 是「UTF-8 + 带长度 + 不保证 NUL 结尾」；C 的字符串是「NUL 结尾的字节串」。两套表示互不兼容，边界转换用标准库的一对类型：

```rust
use std::ffi::{CString, CStr};
use std::os::raw::c_char;

// Rust -> C：String 转 NUL 结尾指针
fn pass_to_c(rust_string: &str) {
    let c_string = CString::new(rust_string)     // Result：内含 NUL 字节时报错
        .expect("字符串含内部 NUL，无法转 C 字符串");
    unsafe {
        c_side_set_title(c_string.as_ptr());     // as_ptr 给出 *const c_char
    }
    // c_string 在此 drop：C 侧若保存了指针就是悬垂（见第 4 节责任规则）
}

// C -> Rust：NUL 结尾指针转 &str
fn take_from_c(ptr: *const c_char) -> String {
    let c_str = unsafe { CStr::from_ptr(ptr) };  // 前提：C 侧保证 NUL 结尾且指针有效
    c_str.to_string_lossy().into_owned()         // 非 UTF-8 字节做有损替换
}
```

三个决策点：

- `CString::new` 返回 `Result` 是因为 Rust 字符串允许内含 `\0` 而 C 字符串不允许——「转换失败」在边界显式化，比默默截断安全；
- `to_string_lossy` 有损：C 侧传来的字节不保证是 UTF-8（GBK 中文极常见），`to_str` 会拒绝整个字符串，`lossy` 用 U+FFFD 替换非法字节——**接受有损还是报错**是业务决策，日志类内容可 lossy、持久化数据建议报错；
- `CStr::from_ptr` 的安全性完全依赖调用方担保（指针有效、NUL 结尾、生命周期覆盖使用期）——这正是 unsafe 的信任声明语义。

### 3.2 换成别的写法会发生什么

直接 `as_ptr()` 裸传 `String` 的字节（`rust_string.as_ptr()`）会发生什么：String 不保证 NUL 结尾，C 侧 `strlen` 会越过合法内存继续读——越界读，轻则乱码重则段错误。**Rust 字符串与 C 字符串之间永远隔一层 CString/CStr**，这条没有例外。

## 4. 内存责任：谁分配谁释放

### 4.1 责任规则与 into_raw

FFI 的内存事故几乎全是「释放责任不清」。规则只有一条：**谁分配，谁释放——跨边界的内存必须回到分配它的语言去释放**。Rust 侧把 Box 交给 C 的标准形态：

```rust
use std::ffi::CString;

/// 创建播放器句柄：所有权移交 C 侧
#[no_mangle]
pub extern "C" fn player_new(name: *const c_char) -> *mut Player {
    let name = unsafe { CStr::from_ptr(name) }.to_string_lossy().into_owned();
    Box::into_raw(Box::new(Player::new(name)))   // Box 变裸指针：所有权交出，Rust 不再管释放
}

/// 销毁句柄：必须由 C 侧显式调用，内存回到 Rust 释放
#[no_mangle]
pub extern "C" fn player_free(player: *mut Player) {
    if !player.is_null() {
        unsafe { drop(Box::from_raw(player)) }   // from_raw 收回所有权，drop 正常释放
    }
}
```

为什么必须配对 `into_raw`/`from_raw`：

- `Box::into_raw` 把 Box 转成裸指针且**不释放内存**——Rust 运行时从此不再管它，符合「移交 C」的语义；直接 `&mut *Box` 的地址传出去，函数返回时 Box 被 drop，C 侧拿到悬垂指针；
- `Box::from_raw` 是唯一合法的收回方式：它要求指针必须来自 `into_raw`（同一分配器、同一布局）——C 侧用 `malloc` 分配的内存绝不能让 Rust 的 `from_raw` 收，反之亦然，**混用两套分配器是第二 FFI 陷阱**；
- C 侧的配套纪律：每个 `player_new` 必须有且只有一次 `player_free`——把这条写进 API 文档与 C 侧的 RAII 包装（或 finally），泄漏与双重释放都源于配对失败。

### 4.2 生命周期与「C 存了我的引用」

更隐蔽的责任问题：C 侧把 Rust 借给它的引用**存了下来**（比如注册一个回调上下文）。Rust 的借用检查器看不见跨边界的持有——`&LocalStruct` 传给 C 后，Rust 侧函数返回，栈帧回收，C 侧的引用悬垂。防御模式：

```rust
// C 侧要长期持有：改为移交所有权（Box::into_raw），由 C 显式 free
#[no_mangle]
pub extern "C" fn register_context(ctx: *mut Context) { ... }

// 或者约定「仅在回调期间有效」（文档明确写出借用窗口）
```

「借出」还是「移交」在跨界前就要决定，**默认移交**——借用语义离开 Rust 后无法被任何机制保护。

## 5. 构建集成：build.rs 与链接

### 5.1 声明与链接

```rust
// 导入 C 函数：extern 块声明「外面的世界有这个函数」
unsafe extern "C" {
    fn c_side_set_title(title: *const c_char) -> i32;
}

fn call_it(title: &str) {
    let c = CString::new(title).unwrap();
    let rc = unsafe { c_side_set_title(c.as_ptr()) };
    // rc 非 0 时的错误处理：映射到 Result（衔接 rust/080 的错误体系）
}
```

（`unsafe extern` 是 2024 edition 的新写法：显式标注「这个块里的声明带 unsafe 语义」；2021 edition 用 `extern "C"` 不带 unsafe。以你项目的 edition 为准。）

`Cargo.toml` 的链接声明：

```toml
[dependencies]
# 优先用 *-sys 箱：社区已封装好的绑定与链接配置（如 libsqlite3-sys）

[build-dependencies]
cc = "1.0"          # 需要编译本地 C 源码时
```

```rust
// build.rs：把同目录的 C 源码编成静态库并链接
fn main() {
    cc::Build::new()
        .file("native/shim.c")
        .compile("shim");        // 自动告知 cargo 链接参数与重编触发条件
}
```

工程决策的优先级：**能找到现成 `*-sys` 箱就不自己写 build.rs**（绑定质量、版本管理、平台差异都有人维护）；`build.rs + cc` 适合「带着 C 源码一起发布」的项目；纯 `println!("cargo:rustc-link-lib=...")` 手写链接指令是最后的兜底——手写的链接配置不感知平台差异，Windows 的 MSVC 与 Linux 的 GCC 参数不同，`cc` 箱的价值就是抹平这些。

### 5.2 被 Python/Node 调用的形态

Rust 编译成 `cdylib`（C ABI 动态库）后可以被任何有 FFI 能力的语言加载：

```toml
[lib]
crate-type = ["cdylib"]     # 产出 .so/.dll/.dylib
```

```bash
# Python 侧：ctypes 加载动态库
python -c "
import ctypes
lib = ctypes.CDLL('./libmylib.so')
lib.player_new.argtypes = [ctypes.c_char_p]
h = lib.player_new(b'singer')
lib.player_free(h)
"
```

三层的工程取舍：ctypes 裸调最快接通但手写类型映射；PyO3（Python）与 napi-rs（Node）是成熟绑定框架——自动处理 GIL、类型转换、对象生命周期，**认真维护的绑定一律用框架不裸写 ctypes**；WASM 是第三条路（热点算法编译到 wasm 给 JS 调），免去动态库分发但内存模型受限。选型口诀：一次性脚本 ctypes，长期维护 PyO3/napi-rs，纯计算无系统调用考虑 WASM。

## 6. 工程场景

### 6.1 场景一：给游戏引擎提供 C ABI 插件

引擎（如自研或 Godot 的 GDExtension 生态）以 C ABI 加载插件，Rust 侧导出生命周期三件套：

```rust
#[no_mangle] pub extern "C" fn plugin_create() -> *mut AudioAnalyzer
#[no_mangle] pub extern "C" fn plugin_analyze(h: *mut AudioAnalyzer, samples: *const f32, len: usize) -> i32
#[no_mangle] pub extern "C" fn plugin_destroy(h: *mut AudioAnalyzer)
```

要点：`handle` 模式（不透明指针）是插件 ABI 的标准形态——C 侧永远只拿指针不知道结构体内部（Rust 结构体可以随便改），**ABI 稳定性靠「不透明 + 函数集」而不是靠「暴露结构体布局」**；`len` 与指针成对出现（C 没有切片，数组跨界必须带长度）；引擎侧的 `destroy` 必须与 `create` 配对（第 4.1 节规则在插件形态的应用）。

### 6.2 场景二：封装系统 C 库

给 OpenSSL 或平台特有 API 做 Rust 封装的分层：

```text
openssl-sys        # 裸绑定：unsafe 函数原样暴露，命名保持 C 风格
openssl            # 安全封装：把 sys 的 unsafe 包成安全 API，错误映射 Result
你的业务代码       # 只依赖安全层
```

「sys 箱 + 安全封装」两层是 Rust 社区的标准分层（rust/200 第 4 节的封装纪律在 FFI 场景的应用）：unsafe 全部收在 sys 层，安全层负责论证不变量（指针有效性、生命周期、错误码转 Result）。业务代码若直接 import sys 箱，等于绕过安全层重新暴露 unsafe——code review 里出现 `extern crate openssl_sys` 就是警报。

### 6.3 场景三：热点算法导出给脚本语言

内容平台要给 Python 侧提供歌曲音频指纹算法（纯计算，CPU 密集）。Python 版每首歌 800ms，Rust 版 20ms。形态：Rust 编 cdylib，PyO3 做绑定（自动转换 numpy 数组与 Vec），Python 侧 API 与旧版完全一致——调用方零改动获得 40 倍。**易错点**：GIL 释放（PyO3 的 `Python::allow_threads`）不加的话，Rust 算得再快也把 Python 事件循环卡住，并发反而变差；批处理接口（一次传一批）比单次调用省 N 次跨界开销——FFI 调用本身有成本，**跨界次数比单次开销更值得优化**。

## 7. 动手实践

**任务一**：完成一次最小的「导出 -> C 调用」。Rust 侧导出 `add(a: i32, b: i32) -> i32`（cdylib），用 Python ctypes 或 C 小程序加载并调用；然后故意去掉 `#[no_mangle]` 重编，观察链接失败并解释原因。

<details>
<summary>任务一参考观察</summary>

去 no_mangle 后符号名被修饰成 `_ZN7mylib3add17h...E` 这类带路径与哈希的形态，C 侧按 `add` 查找失败（undefined symbol）。这验证了 200 篇预告的机制：no_mangle 的作用就是关闭名称修饰、让符号名可被 C 链接器按字面找到。自查：`crate-type = ["cdylib"]` 漏配时会产出 rlib（Rust 专用），ctypes 加载报「不是动态库」。
</details>

**任务二**：复现悬垂指针。写一个「返回局部字符串指针」的错误导出（`fn bad() -> *const c_char` 返回函数内局部 CString 的指针），Python 侧调用读它的内容——观察乱码或崩溃；再用 `into_raw` + 配对 free 的正确版修复。

<details>
<summary>任务二参考观察</summary>

错误版：局部 CString 在函数返回时 drop，指针指向已释放内存——读到的内容是不确定的（可能碰巧完好、可能乱码、可能段错误），这正是 UB 的「不一定当场爆炸」特性，也是最危险的形态。修复版把所有权交给调用方并约定 free 函数。教训：FFI 边界的每个指针都要回答「它活着多久、谁来释放」，回答不了就不该跨出去。
</details>

**任务三**：给本模块「虚拟歌手音乐平台」设计一个 FFI 边界。任务：音频指纹算法要给 Python 后端调用，写出导出函数签名（含错误处理形态）、内存责任说明与调用约定文档（各 3-5 行）。

<details>
<summary>任务三参考设计</summary>

```rust
#[no_mangle] pub extern "C" fn fingerprint_create() -> *mut Fingerprinter;
#[no_mangle] pub extern "C" fn fingerprint_compute(
    f: *mut Fingerprinter, samples: *const f32, len: usize, out: *mut [u8; 32]) -> i32;  // 0 成功，负数错误码
#[no_mangle] pub extern "C" fn fingerprint_destroy(f: *mut Fingerprinter);
```

责任说明：Fingerprinter 由 create 分配、必须 destroy 一次；samples 由调用方持有、仅在 compute 期间有效（借用窗口）；out 是调用方提供的出参缓冲、compute 负责填充不负责分配——三句话把「谁分配谁释放、借用窗口」全部钉死。要点自查：错误用返回码而不是 out 参数里的错误字符串（跨语言的字符串错误处理要再分配一次，返回码让上层映射）。
</details>

## 8. 下一步与延伸阅读

- 《unsafe 与安全边界》（rust/200-RustUnsafeRust）：本篇 unsafe 用法的判定纪律与封装清单；
- 《智能指针》（rust/150-RustSmartPointers）：Box 语义是第 4 节内存责任的基础；
- 《错误处理》（rust/080-RustErrorHandling）：边界错误码与应用层 Result 的映射；
- 《Cargo 进阶》（rust/190-RustCargoAdvanced）：build.rs 的完整生命周期与链接变体。

## 参考与致谢

- The Rustonomics（Rust 官方 FFI 主题文档）：<https://doc.rust-lang.org/nomicon/ffi.html>（Apache 2.0 / CC-BY-SA 双许可）；
- std::ffi 模块文档（CString/CStr）与 The Rust Book 第 19 章 Advanced Features（CC-BY-SA）；
- 本篇承接 200 号第 5 节「FFI 留待专题」的承诺写成，场景示例沿用模块内「虚拟歌手音乐平台」案例线。
