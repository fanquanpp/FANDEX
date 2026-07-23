---
order: 87
tags:
  - cpp
  - chrono
  - datetime
  - calendar
  - timezone
difficulty: intermediate
title: 'C++ 日期时间'
module: cpp
category: 'C++ Standard Library'
description: C++ chrono 库全解：duration、time_point、clock、C++20 日历与时区、C++23 时区数据库、leap second、计时基准、跨平台精度，含类型安全设计、UB 场景与企业级实战。
author: fanquanpp
updated: '2026-07-21'
related:
  - cpp/智能指针
  - cpp/C++正则表达式
  - cpp/C++格式化输出
  - cpp/C++26与最新标准
  - cpp/STL算法详解
  - cpp/类型系统
  - cpp/C++20概念
prerequisites:
  - cpp/概述与现代标准
  - cpp/类型系统
---

# C++ 日期时间

> 本文档系统讲解 C++ 标准库的日期时间处理，覆盖 `<chrono>` 库的 duration、time_point、clock 三大核心抽象，C++20 引入的日历（calendar）与时区（time zone）支持，C++23 持续增强（`is_clock`、`utc_clock` leap second），以及 C++26 草案的新进展。所有代码示例可在支持 C++20/23 的主流编译器（GCC 14+、Clang 17+、MSVC 19.36+）上编译通过，并标注跨平台兼容性。对标 MIT 6.172、Stanford CS106L、CMU 15-410 课程教学水准，0 基础自学友好。

## 1. 学习目标

完成本章学习后，读者应能够达成以下 Bloom 认知层级目标：

| Bloom 层级 | 目标描述 |
| :--- | :--- |
| **Remember（记忆）** | 列举 `<chrono>` 的三大核心抽象（duration、time_point、clock），复述 `system_clock`、`steady_clock`、`high_resolution_clock` 的差异 |
| **Understand（理解）** | 解释 chrono 库的类型安全设计：为什么 `1s + 1ms` 编译通过而 `1s + 1` 编译失败；说明 epoch、tick、period 的关系 |
| **Apply（应用）** | 使用 `std::chrono::duration_cast`、`time_point_cast`、C++20 日历字面量 `2026y/July/21` 进行时间计算与格式化 |
| **Analyze（分析）** | 分析代码中的精度损失、溢出风险、时区转换错误，识别 `system_clock::now()` 跨进程不单调的陷阱 |
| **Evaluate（评价）** | 评估 `steady_clock` vs `high_resolution_clock` vs `system_clock` 在性能基准、日志时间戳、跨机器同步场景下的取舍 |
| **Create（创造）** | 设计类型安全的时间单位系统、实现自定义 Clock（如 TAI clock）、封装跨平台高精度计时器与定时任务调度 |

## 2. 历史动机与发展脉络

### 2.1 C++11 之前：时间处理的黑暗时代

C++98/03 没有标准的时间库，开发者只能依赖 C 标准库的 `<ctime>`：

```c
#include <ctime>
time_t now = time(nullptr);      // 秒级精度，1970 epoch
struct tm* lt = localtime(&now); // 非线程安全！
char buf[100];
strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", lt);
```

`<ctime>` 的痛点：

1. **类型不安全**：`time_t` 在不同平台是 `long` 或 `long long`，32 位系统上 2038 年溢出（Y2038 问题）
2. **精度不足**：最小粒度为秒，无法满足性能测量需求
3. **线程不安全**：`localtime` 返回静态缓冲区指针，多线程并发调用 UB
4. **跨平台不一致**：Windows 与 Unix 的 `clock()` 单位不同（毫秒 vs 微秒）
5. **无类型区分**：1 秒与 1 毫秒都是 `time_t`，编译器无法区分

C++03 时代的替代方案：

- Boost.Date_Time：Howard Hinnant 设计，提供类型安全的 duration 与 time_point
- ACE_Time_Value：双精度秒 + 微秒，强耦合 ACE 框架
- Qt 的 `QDateTime`：Qt 生态专用

### 2.2 C++11 chrono：Howard Hinnant 的突破

2008 年，Howard Hinnant（libc++ 作者、移动语义奠基人）提出 N2661 提案 *A Foundation to Sleep On*，将 Boost.Date_Time 的核心思想简化、泛化后纳入 C++11 标准。chrono 库的三大设计目标：

1. **类型安全**：不同单位的时间是不同的类型，编译期检查
2. **零开销**：编译期常量折叠，运行时无虚函数开销
3. **可扩展**：用户可定义新的 duration、time_point、clock

C++11 chrono 的核心组件：

```cpp
namespace std::chrono {
    // 时长：值 + 单位
    template <class Rep, class Period = ratio<1>>
    class duration;

    // 时间点：时钟 + 时长
    template <class Clock, class Duration = typename Clock::duration>
    class time_point;

    // 时钟：提供 now() 与 epoch
    class system_clock;       // 真实世界时间，可同步 C 时间
    class steady_clock;       // 单调递增，适合性能测量
    class high_resolution_clock; // 最高精度（通常 = steady_clock）
}
```

Hinnant 的设计哲学：用模板参数携带单位信息，编译器自动推导：

```cpp
using namespace std::chrono_literals;
auto t1 = 1s;       // duration<long long, ratio<1>>
auto t2 = 1ms;      // duration<long long, milli>
auto t3 = t1 + t2;  // duration<double, ratio<1>>：1.001 秒，自动提升
// auto bad = 1s + 1;  // 编译失败：1 是 int，不是 duration
```

### 2.3 C++14/17：用户自定义字面量与 floor/round/ceil

C++14 引入 `std::chrono_literals` 命名空间，提供 `h`、`min`、`s`、`ms`、`us`、`ns` 后缀：

```cpp
using namespace std::chrono_literals;
auto half_hour = 30min;
auto one_day = 24h;
auto nanosec = 1ns;
```

C++17 新增 `floor`、`round`、`ceil`、`abs` 四个时间点/时长算法：

```cpp
auto now = system_clock::now();
auto day_start = floor<days>(now);  // 截断到当天 00:00
auto rounded = round<hours>(now);    // 四舍五入到小时
```

### 2.4 C++20：日历与时区革命

C++20 是 chrono 库最大的一次扩展，由 Howard Hinnant 主导（基于其个人库 `date`）。新增内容：

1. **日历类型**：`year`、`month`、`day`、`weekday`、`year_month`、`year_month_day` 等
2. **日历字面量**：`2026y`、`July`、`21d`、`2026y/July/21`
3. **时区支持**：`time_zone`、`zoned_time`，基于 IANA 时区数据库
4. **leap second**：`utc_clock`、`tai_clock`、`gps_clock` 区别于 `system_clock`
5. **格式化**：`std::chrono::format` 与 `<format>` 集成
6. **新时钟**：`utc_clock`（含闰秒）、`tai_clock`（国际原子时）、`gps_clock`（GPS 时间）

```cpp
#include <chrono>
using namespace std::chrono;

// 日历字面量
auto today = 2026y/July/21;
auto meeting = July/21/2026 + 14h + 30min;

// 时区
auto ny_time = zoned_time{"America/New_York", system_clock::now()};
auto tokyo_time = zoned_time{"Asia/Tokyo", system_clock::now()};

// 格式化
std::cout << format("{:%Y-%m-%d %H:%M:%S %Z}\n", ny_time);
```

### 2.5 C++23 持续完善

C++23 对 chrono 的增强较为温和：

- `std::is_clock`、`std::is_clock_v`：trait 检测类型是否为 Clock
- `std::chrono::duration` 的流插入运算符（`operator<<`）
- 修复 `utc_clock` 在 leap second 边界的转换 bug
- `std::chrono::parse`：从字符串解析时间（C++23 完成）

```cpp
// C++23 流插入
auto t = 2026y/July/21 + 14h + 30min;
std::cout << t << "\n";  // 直接输出
```

### 2.6 C++26 草案

C++26 持续完善 chrono：

- `std::chrono::time_zone` 的扩展 API
- 更完善的 leap second 处理
- 与 `std::execution` Sender/Receiver 的集成（异步定时）
- `<chrono>` 与 `<format>` 的进一步整合

### 2.7 关键提案与文献

- **N2661 (Hinnant, 2008)**：*A Foundation to Sleep On*，chrono 奠基提案
- **N3344 (Hinnant, 2012)**：*Formatting for chrono*，早期格式化提案
- **P0355R7 (Hinnant, 2018)**：*Extending `<chrono>` to Calendars and Time Zones*，C++20 日历时区
- **P0217R3 (Hinnant, 2017)**：*Proposal to Introduce a `format` Function*，`<format>` 与 chrono 集成
- **P1650R0 (Hinnant, 2019)**：*A `std::chrono::utc_clock`*
- **P1466R3 (Hinnant, 2019)**：*Miscellaneous minor fixes for `<chrono>`*
- **P2372R0 (Hinnant, 2021)**：*Fixing locale handling in `chrono`'s formatter*
- **P2445R1 (Hinnant, 2022)**：*`std::is_clock`*

### 2.8 与其他语言的横向对比

| 特性 | C++ chrono | Rust chrono | Java java.time | Python datetime | Go time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 类型安全 | 编译期 | 编译期 | 运行时 | 运行时 | 运行时 |
| 时区支持 | C++20 IANA | 第三方 crate | 内置 IANA | 内置 | 内置 |
| 闰秒处理 | C++20 utc_clock | 部分 | 部分 | 否 | 否 |
| 日历字面量 | C++20 | 否 | 否 | 否 | 否 |
| 零开销 | 是 | 是 | 否 | 否 | 否 |
| 格式化 | C++20 `format` | `strftime` | `DateTimeFormatter` | `strftime` | `time.Format` |

## 3. 形式化定义

### 3.1 Duration 的形式化

`std::chrono::duration` 是 chrono 库的核心类型，表示一段时间间隔。

形式化定义（ISO/IEC 14882:2023 §27.5）：

$$
\text{duration}(R, P) := R \times \frac{P_{\text{num}}}{P_{\text{den}}} \text{ seconds}
$$

其中：
- $R$ 是表示类型（`Rep`），如 `int64_t`、`double`
- $P$ 是周期（`Period`），编译期有理数 `ratio<num, den>`
- 实际存储值为 $R$ 类型的 ticks，每个 tick 等于 $P_{\text{num}}/P_{\text{den}}$ 秒

标准预定义的 duration：

| 类型 | Rep | Period | 单位 |
| :--- | :--- | :--- | :--- |
| `nanoseconds` | `int64_t` | `ratio<1, 10^9>` | 纳秒 |
| `microseconds` | `int64_t` | `ratio<1, 10^6>` | 微秒 |
| `milliseconds` | `int64_t` | `ratio<1, 10^3>` | 毫秒 |
| `seconds` | `int64_t` | `ratio<1>` | 秒 |
| `minutes` | `int64_t` | `ratio<60>` | 分钟 |
| `hours` | `int64_t` | `ratio<3600>` | 小时 |
| `days`（C++20） | `int32_t` | `ratio<86400>` | 天 |
| `weeks`（C++20） | `int32_t` | `ratio<604800>` | 周 |
| `months`（C++20） | `int32_t` | `ratio<2629746>` | 月（平均 30.436875 天） |
| `years`（C++20） | `int32_t` | `ratio<31556952>` | 年（平均 365.2425 天） |

注意：`months` 与 `years` 使用平均时长（gregorian 平均），不能用于精确日历计算。日历计算应使用 `year_month` 等日历类型。

### 3.2 Time Point 的形式化

`std::chrono::time_point` 表示相对于某个时钟 epoch 的时间点。

形式化定义：

$$
\text{time\_point}(C, D) := C.\text{epoch} + D
$$

其中：
- $C$ 是时钟类型（`Clock`），提供 `now()` 与 epoch 定义
- $D$ 是时长类型（`Duration`），表示自 epoch 起的偏移

不同时钟的 epoch：

| 时钟 | Epoch | 典型精度 |
| :--- | :--- | :--- |
| `system_clock` | 1970-01-01 00:00:00 UTC（Unix epoch） | 平台相关（ns 或 100ns） |
| `steady_clock` | 实现定义（通常是系统启动） | 平台相关 |
| `high_resolution_clock` | 同 `steady_clock` 或 `system_clock` | 最高精度 |
| `utc_clock`（C++20） | 1970-01-01 00:00:00 UTC | 纳秒 |
| `tai_clock`（C++20） | 1958-01-01 00:00:00 TAI | 纳秒 |
| `gps_clock`（C++20） | 1980-01-06 00:00:00 GPS | 纳秒 |
| `file_clock`（C++20） | 实现定义（用于 `time_t` 兼容） | 平台相关 |

### 3.3 类型安全的代数规则

chrono 库通过模板特化实现了类型安全的代数运算规则。设 $d_1 = (r_1, p_1)$, $d_2 = (r_2, p_2)$ 为两个 duration，$t$ 为 time_point，则：

1. **duration + duration = duration**：

$$
d_1 + d_2 = (\text{common\_type}(r_1, r_2), \text{gcd\_ratio}(p_1, p_2))
$$

其中 `gcd_ratio` 求两个 ratio 的最大公约数 ratio。

2. **time_point + duration = time_point**：

$$
t + d = (t.\text{epoch}, t.\text{duration} + d)
$$

3. **time_point - time_point = duration**：

$$
t_1 - t_2 = t_1.\text{duration} - t_2.\text{duration}
$$

4. **duration * scalar = duration**：

$$
d \times s = (r \times s, p)
$$

5. **duration / duration = scalar**：

$$
d_1 / d_2 = \frac{r_1 \times p_1}{r_2 \times p_2}
$$

例：

```cpp
using namespace std::chrono;
auto t1 = 1s;        // (long long, ratio<1>)
auto t2 = 500ms;     // (long long, ratio<1, 1000>)
auto t3 = t1 + t2;   // (long long, ratio<1, 1000>) = 1500ms
auto t4 = t1 / t2;   // 2 (long long)
auto t5 = t1 * 2.5;  // (double, ratio<1>) = 2.5s
```

### 3.4 C++20 日历类型的形式化

C++20 引入日历类型，将日历字段建模为独立的强类型：

| 类型 | 含义 | 取值范围 |
| :--- | :--- | :--- |
| `year` | 年 | [-32767, 32767] |
| `month` | 月 | [1, 12] |
| `day` | 日 | [1, 31] |
| `weekday` | 星期 | [0=Sunday, 6=Saturday] |
| `year_month` | 年月 | 任意组合 |
| `year_month_day` | 年月日 | 任意有效日期 |
| `year_month_weekday` | 年月第几个星期 | 如 "2026 年 7 月第 3 个周一" |

日历字段类型之间通过运算符组合：

```cpp
auto ymd = 2026y/July/21;  // year_month_day
auto ym = 2026y/July;       // year_month
auto ymw = 2026y/July/Mon[3]; // 2026年7月第3个周一
```

`year_month_day` 与 `time_point<system_clock>` 之间可通过 `sys_days` 转换：

```cpp
auto today = 2026y/July/21;
sys_days tp = today;             // 转 time_point（天精度）
sys_seconds ts = today + 14h;    // 转 time_point（秒精度）
```

### 3.5 时区与 leap second

C++20 时区基于 IANA 时区数据库（如 `America/New_York`、`Asia/Tokyo`）。时区信息包括：

- UTC 偏移量（可能因 DST 变化）
- 夏令时规则
- 历史时区变更（如中国 1991 年前使用 DST）

`zoned_time` 将时间点与时区绑定：

```cpp
auto now_utc = system_clock::now();
auto now_tokyo = zoned_time{"Asia/Tokyo", now_utc};
auto now_ny = zoned_time{"America/New_York", now_utc};
```

Leap second（闰秒）由 `utc_clock` 处理：

- `system_clock` 与 `utc_clock` 的 epoch 相同（1970-01-01 00:00:00 UTC）
- 但 `system_clock` 不感知闰秒，UTC 到 TAI 的转换需 `utc_clock`
- 自 1972 年至 2024 年，共插入 27 个正闰秒

```cpp
// C++20 utc_clock 处理 leap second
auto utc_now = utc_clock::now();
auto sys_now = clock_cast<system_clock>(utc_now);
// 二者差异 = 自 1972 年以来的闰秒数（约 27 秒）
```

## 4. 理论推导与原理解析

### 4.1 类型安全：编译期单位检查

chrono 的核心设计是"不同单位是不同类型"。这通过 `ratio` 模板实现：

```cpp
namespace std::chrono {
    using nanoseconds  = duration<long long, ratio<1, 1'000'000'000>>;
    using microseconds = duration<long long, ratio<1, 1'000'000>>;
    using milliseconds = duration<long long, ratio<1, 1'000>>;
    using seconds      = duration<long long, ratio<1>>;
    using minutes      = duration<long long, ratio<60>>;
    using hours        = duration<long long, ratio<3600>>;
}
```

`ratio<1, 1000>` 与 `ratio<1>` 是不同类型，因此 `1s + 1ms` 触发 `common_type` 推导：

$$
\text{common\_type}(\text{seconds}, \text{milliseconds}) = \text{duration}<\text{long long}, \text{ratio}<1, 1000>>
$$

结果类型为 `milliseconds`，自动窄化到毫秒精度。

### 4.2 duration_cast 的精度损失

当目标类型精度低于源类型时，`duration_cast` 执行截断（truncate）：

```cpp
auto t = 1500ms;
auto sec = duration_cast<seconds>(t);  // 1s（截断 500ms）
```

截断的数学定义：

$$
\text{duration\_cast}(d, T) = \lfloor d.\text{count}() \times \frac{p_{\text{src}}}{p_T} \rfloor
$$

注意：截断而非四舍五入。若需四舍五入，使用 C++17 的 `round`：

```cpp
auto rounded = round<seconds>(1500ms);  // 2s
auto floored = floor<seconds>(1500ms);  // 1s
auto ceiled  = ceil<seconds>(1500ms);   // 2s
```

### 4.3 时钟的单调性与线程安全

**system_clock**：

- 表示真实世界时间（wall clock）
- 可与 C `time_t` 互转（`from_time_t`、`to_time_t`）
- **不保证单调**：系统时间被 NTP 调整、用户手动修改、夏令时切换都可能导致回退
- **跨进程一致**：不同进程调用 `system_clock::now()` 得到的时间可比较
- 适合：日志时间戳、跨机器同步

**steady_clock**：

- 保证单调递增
- epoch 实现定义（通常是系统启动）
- **不可跨进程比较**：不同机器的 epoch 不同
- 适合：性能测量、超时控制

**high_resolution_clock**：

- C++11 引入，定义为"最高精度时钟"
- 多数实现将其设为 `steady_clock` 的别名
- C++20 起建议直接使用 `steady_clock`，避免混淆

陷阱：在性能测量中使用 `system_clock`：

```cpp
// 错误：system_clock 可能回退，测量结果不可靠
auto start = system_clock::now();
do_work();
auto end = system_clock::now();
auto elapsed = end - start;  // 可能是负值！

// 正确：使用 steady_clock
auto start = steady_clock::now();
do_work();
auto end = steady_clock::now();
auto elapsed = end - start;  // 保证非负
```

### 4.4 epoch 与 Y2038 问题

`time_t` 在 32 位系统上通常为 `int32_t`，1970-01-01 起 $2^{31}$ 秒后溢出：

$$
1970 + \frac{2^{31}}{365.25 \times 86400} \approx 2038.01
$$

具体溢出时间：2038-01-19 03:14:07 UTC。

`std::chrono::system_clock::duration` 在主流实现中为 64 位，溢出时间约为 2920 亿年后，远超宇宙寿命。

C++20 引入 `file_clock`，专门用于文件系统时间戳，避免 Y2038 问题。

### 4.5 C++20 日历算法

C++20 日历类型实现了完整的格里高利历算法。关键算法：

**日期转序数（自 epoch 天数）**：

```cpp
// 简化版：year_month_day 转 sys_days
sys_days to_sys_days(const year_month_day& ymd) {
    int y = int(ymd.year());
    unsigned m = unsigned(ymd.month());
    unsigned d = unsigned(ymd.day());
    y -= m <= 2;
    const int era = (y >= 0 ? y : y - 399) / 400;
    const unsigned yoe = static_cast<unsigned>(y - era * 400);
    const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return sys_days{days{era * 146097 + static_cast<int>(doe) - 719468}};
}
```

**闰年判定**：

$$
\text{is\_leap\_year}(y) := (y \bmod 4 = 0 \land y \bmod 100 \neq 0) \lor y \bmod 400 = 0
$$

**月份天数**：

| 月 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 天 | 31 | 28/29 | 31 | 30 | 31 | 30 | 31 | 31 | 30 | 31 | 30 | 31 |

### 4.6 时区与 UTC 偏移

时区转换涉及 UTC 偏移量（offset）。例如：

- `Asia/Tokyo`：UTC+9（无 DST）
- `America/New_York`：UTC-5（标准）/ UTC-4（夏令时，3 月第二个周日到 11 月第一个周日）
- `Asia/Shanghai`：UTC+8（无 DST，1991 年前有 DST）

`zoned_time` 自动处理 DST 切换：

```cpp
auto utc_now = system_clock::now();
auto ny = zoned_time{"America/New_York", utc_now};
// 夏令时期间，ny 的 UTC 偏移为 -4；标准时间为 -5
```

DST 切换时的歧义：

```cpp
// 假设 2026-11-01 01:30:00 America/New_York
// 此时刻是 EDT（-4）还是 EST（-5）？两次都出现
auto ambiguous = local_days{2026y/November/1} + 1h + 30min;
auto zt = zoned_time{"America/New_York", ambiguous};
// C++20 默认取较早的（EDT），但可通过 choose::latest 选择较晚的
auto zt2 = zoned_time{"America/New_York", ambiguous, choose::latest};
```

### 4.7 leap second 的处理

Leap second 由 IERS（国际地球自转与参考系统服务）根据地球自转速度决定插入，通常在 6 月 30 日或 12 月 31 日的 23:59:60 UTC。

C++20 `utc_clock` 处理 leap second：

- `utc_clock::now()` 返回的 `time_point` 包含闰秒
- 转换到 `system_clock` 时，闰秒被映射到前一秒的最后一刻

```cpp
// 2016-12-31 23:59:60 UTC 是闰秒
auto leap = sys_days{2016y/December/31} + 23h + 59min + 60s;
auto utc_leap = clock_cast<utc_clock>(leap);
// utc_leap 表示 2017-01-01 00:00:00 UTC（含闰秒偏移）
auto back_to_sys = clock_cast<system_clock>(utc_leap);
// back_to_sys 与 leap 相同
```

注意：`utc_clock` 的实现依赖 IANA leap second 数据库，C++20 标准未规定如何获取该数据库。

## 5. 代码示例（企业级 production-ready）

### 5.1 基础：计时与休眠

```cpp
#include <chrono>
#include <iostream>
#include <thread>

using namespace std::chrono;
using namespace std::chrono_literals;

// 精确休眠（注意：操作系统调度精度有限）
void precise_sleep(nanoseconds ns) {
    auto start = steady_clock::now();
    while (steady_clock::now() - start < ns) {
        // 忙等：高精度但 CPU 占用高
    }
}

// 混合休眠：先 sleep_for，最后忙等
void hybrid_sleep(nanoseconds ns) {
    auto start = steady_clock::now();
    auto remaining = ns;
    // 留 1ms 给忙等
    if (remaining > 1ms) {
        std::this_thread::sleep_for(remaining - 1ms);
    }
    // 忙等剩余
    while (steady_clock::now() - start < ns) {}
}

int main() {
    auto t1 = steady_clock::now();
    std::this_thread::sleep_for(100ms);
    auto t2 = steady_clock::now();
    auto elapsed = duration_cast<microseconds>(t2 - t1);
    std::cout << "Slept for " << elapsed.count() << " us\n";
    return 0;
}
```

### 5.2 性能基准：高精度计时

```cpp
#include <chrono>
#include <vector>
#include <algorithm>
#include <iostream>
#include <numeric>

class Benchmark {
public:
    using Clock = std::chrono::steady_clock;

    template <typename Func>
    static auto run(Func&& func, int iterations = 100) {
        // 预热
        for (int i = 0; i < 10; ++i) func();

        std::vector<Clock::duration> timings;
        timings.reserve(iterations);
        for (int i = 0; i < iterations; ++i) {
            auto start = Clock::now();
            func();
            auto end = Clock::now();
            timings.push_back(end - start);
        }
        return analyze(timings);
    }

private:
    struct Stats {
        double mean_us;
        double median_us;
        double p99_us;
        double stddev_us;
    };

    static Stats analyze(std::vector<Clock::duration>& timings) {
        using namespace std::chrono;
        std::sort(timings.begin(), timings.end());

        auto to_us = [](auto d) { return duration_cast<microseconds>(d).count(); };

        double sum = 0;
        for (auto t : timings) sum += to_us(t);
        double mean = sum / timings.size();

        double median = to_us(timings[timings.size() / 2]);
        double p99 = to_us(timings[static_cast<size_t>(timings.size() * 0.99)]);

        double sq_sum = 0;
        for (auto t : timings) {
            double diff = to_us(t) - mean;
            sq_sum += diff * diff;
        }
        double stddev = std::sqrt(sq_sum / timings.size());

        return {mean, median, p99, stddev};
    }
};

int main() {
    auto stats = Benchmark::run([] {
        std::vector<int> v(1000);
        std::iota(v.begin(), v.end(), 0);
        std::sort(v.begin(), v.end());
    });
    std::cout << "Mean: " << stats.mean_us << " us\n"
              << "Median: " << stats.median_us << " us\n"
              << "P99: " << stats.p99_us << " us\n"
              << "StdDev: " << stats.stddev_us << " us\n";
    return 0;
}
```

### 5.3 日历计算

```cpp
#include <chrono>
#include <iostream>

using namespace std::chrono;

// 计算两个日期之间的天数
days days_between(year_month_day start, year_month_day end) {
    return sys_days{end} - sys_days{start};
}

// 计算下个月的今天
year_month_day next_month_today(year_month_day today) {
    auto ym = today.year() / today.month();
    ym += months{1};
    // 处理月底：如 1月31日 + 1 月 = 2月28/29日
    auto last_day = year_month_day_last{ym.year(), month_day_last{ym.month()}}.day();
    auto day = min(today.day(), last_day);
    return ym.year() / ym.month() / day;
}

// 计算下一个工作日（周一至周五）
year_month_day next_workday(year_month_day today) {
    auto sys = sys_days{today};
    do {
        sys += days{1};
    } while (weekday{sys}.iso_encoding() > 5);  // C++20: Mon=1, Sun=7
    return year_month_day{sys};
}

int main() {
    auto today = 2026y/July/21;
    std::cout << "Today: " << today << "\n";

    auto christmas = 2026y/December/25;
    std::cout << "Days to Christmas: " << days_between(today, christmas).count() << "\n";

    auto next_month = next_month_today(today);
    std::cout << "Next month today: " << next_month << "\n";

    auto workday = next_workday(today);
    std::cout << "Next workday: " << workday << "\n";
    return 0;
}
```

### 5.4 时区转换

```cpp
#include <chrono>
#include <iostream>
#include <vector>

using namespace std::chrono;

// 全球团队会议时间显示
void show_meeting_times(system_clock::time_point meeting_utc) {
    struct Team { const char* name; const char* tz; };
    std::vector<Team> teams = {
        {"San Francisco", "America/Los_Angeles"},
        {"New York",      "America/New_York"},
        {"London",        "Europe/London"},
        {"Berlin",        "Europe/Berlin"},
        {"Shanghai",      "Asia/Shanghai"},
        {"Tokyo",         "Asia/Tokyo"},
        {"Sydney",        "Australia/Sydney"},
    };

    auto utc_zt = zoned_time{"UTC", meeting_utc};
    std::cout << "UTC: " << format("{:%Y-%m-%d %H:%M %Z}\n", utc_zt);

    for (const auto& team : teams) {
        auto local = zoned_time{team.tz, meeting_utc};
        std::cout << team.name << ": "
                  << format("{:%Y-%m-%d %H:%M %Z}\n", local);
    }
}

int main() {
    // 2026-07-21 14:00 UTC
    auto meeting = sys_days{2026y/July/21} + 14h + 0min;
    show_meeting_times(meeting);
    return 0;
}
```

### 5.5 格式化与解析

```cpp
#include <chrono>
#include <iostream>
#include <format>
#include <sstream>

using namespace std::chrono;

// C++20 chrono 格式化
void formatting_demo() {
    auto now = system_clock::now();
    auto today = floor<days>(now);
    auto time = now - today;

    // 标准格式
    std::cout << std::format("Default:   {:%c}\n", now);
    std::cout << std::format("ISO 8601:  {:%Y-%m-%dT%H:%M:%S%z}\n", now);
    std::cout << std::format("Date only: {:%Y/%m/%d}\n", now);
    std::cout << std::format("Time only: {:%H:%M:%S}\n", now);
    std::cout << std::format("Weekday:   {:%A}\n", now);
    std::cout << std::format("Day of year: {:%j}\n", now);

    // 时区感知
    auto ny = zoned_time{"America/New_York", now};
    std::cout << std::format("NY time: {:%Y-%m-%d %H:%M:%S %Z}\n", ny);

    // duration 格式化
    auto elapsed = 1h + 23min + 45s + 678ms;
    std::cout << std::format("Elapsed: {:%H:%M:%S}\n", elapsed);
}

// C++23 chrono::parse
void parsing_demo() {
    std::string input = "2026-07-21 14:30:00";
    sys_seconds t;
    std::istringstream iss{input};
    iss >> parse("%Y-%m-%d %H:%M:%S", t);
    if (iss) {
        std::cout << "Parsed: " << t << "\n";
    }
}

int main() {
    formatting_demo();
    parsing_demo();
    return 0;
}
```

### 5.6 自定义 Clock

```cpp
#include <chrono>

using namespace std::chrono;

// 自定义 Clock：模拟时钟，用于测试
class MockClock {
public:
    using duration = nanoseconds;
    using rep = duration::rep;
    using period = duration::period;
    using time_point = std::chrono::time_point<MockClock, duration>;
    static constexpr bool is_steady = true;

    static time_point now() noexcept {
        return time_point{duration{current_}};
    }

    static void advance(duration d) noexcept {
        current_ += d.count();
    }

    static void reset() noexcept {
        current_ = 0;
    }

private:
    static inline rep current_ = 0;
};

// 用法
void test_with_mock_clock() {
    MockClock::reset();
    auto t1 = MockClock::now();
    MockClock::advance(100ms);
    auto t2 = MockClock::now();
    auto elapsed = t2 - t1;  // 100ms
}
```

### 5.7 定时任务调度器

```cpp
#include <chrono>
#include <functional>
#include <queue>
#include <vector>
#include <thread>
#include <mutex>
#include <condition_variable>

using namespace std::chrono;

class TimerScheduler {
public:
    using Clock = steady_clock;
    using Task = std::function<void()>;

    void schedule(Task task, Clock::duration delay) {
        std::lock_guard<std::mutex> lock(mutex_);
        tasks_.push({Clock::now() + delay, std::move(task), counter_++});
        cv_.notify_one();
    }

    void schedule_periodic(Task task, Clock::duration period) {
        // 简化：实际应记录周期性任务的 period
        schedule([this, task = std::move(task), period] {
            task();
            schedule_periodic(task, period);  // 注意：递归闭包需谨慎
        }, period);
    }

    void run() {
        while (running_) {
            std::unique_lock<std::mutex> lock(mutex_);
            if (tasks_.empty()) {
                cv_.wait(lock);
                continue;
            }
            auto next = tasks_.top().time;
            if (cv_.wait_until(lock, next, [&] { return !running_ || !tasks_.empty() && tasks_.top().time <= Clock::now(); })) {
                if (!running_) break;
                auto task = tasks_.top();
                tasks_.pop();
                lock.unlock();
                task.func();
            }
        }
    }

    void stop() {
        std::lock_guard<std::mutex> lock(mutex_);
        running_ = false;
        cv_.notify_all();
    }

private:
    struct ScheduledTask {
        Clock::time_point time;
        Task func;
        size_t counter;
        bool operator>(const ScheduledTask& other) const {
            if (time != other.time) return time > other.time;
            return counter > other.counter;
        }
    };

    std::priority_queue<ScheduledTask, std::vector<ScheduledTask>, std::greater<>> tasks_;
    std::mutex mutex_;
    std::condition_variable cv_;
    bool running_ = true;
    size_t counter_ = 0;
};
```

### 5.8 日志时间戳

```cpp
#include <chrono>
#include <iostream>
#include <iomanip>
#include <sstream>

using namespace std::chrono;

// 高性能日志时间戳：缓存当天的时间前缀
class LogTimestamp {
public:
    LogTimestamp() : cached_day_{}, cached_date_str_{} {}

    std::string format(system_clock::time_point tp) {
        auto days_part = floor<days>(tp);
        if (days_part != cached_day_) {
            cached_day_ = days_part;
            cached_date_str_ = std::format("{:%Y-%m-%d}", days_part);
        }
        auto time_part = tp - days_part;
        return std::format("{} {:%H:%M:%S}.{:06}", cached_date_str_, time_part,
                          duration_cast<microseconds>(time_part).count() % 1'000'000);
    }

private:
    sys_days cached_day_;
    std::string cached_date_str_;
};

void log_demo() {
    LogTimestamp ts;
    std::cout << ts.format(system_clock::now()) << " [INFO] Service started\n";
    std::cout << ts.format(system_clock::now()) << " [WARN] High load\n";
}
```

### 5.9 跨平台高精度计时

```cpp
#include <chrono>
#include <iostream>

#if defined(_WIN32)
    #include <windows.h>
#elif defined(__linux__)
    #include <time.h>
#elif defined(__APPLE__)
    #include <mach/mach_time.h>
#endif

// 跨平台纳秒级计时
class HighResTimer {
public:
    using Clock = std::chrono::steady_clock;
    using TimePoint = Clock::time_point;
    using Duration = Clock::duration;

    static TimePoint now() { return Clock::now(); }

    // 获取时钟精度
    static Duration resolution() {
#if defined(_WIN32)
        LARGE_INTEGER freq;
        QueryPerformanceFrequency(&freq);
        return Duration{1'000'000'000ULL / freq.QuadPart};  // ns per tick
#elif defined(__linux__)
        timespec ts;
        clock_getres(CLOCK_MONOTONIC, &ts);
        return std::chrono::seconds{ts.tv_sec} + std::chrono::nanoseconds{ts.tv_nsec};
#elif defined(__APPLE__)
        mach_timebase_info_data_t info;
        mach_timebase_info(&info);
        return std::chrono::nanoseconds{info.numer / info.denom};
#else
        return std::chrono::nanoseconds{1};
#endif
    }
};

int main() {
    auto res = HighResTimer::resolution();
    std::cout << "Timer resolution: "
              << std::chrono::duration_cast<std::chrono::nanoseconds>(res).count()
              << " ns\n";
    return 0;
}
```

### 5.10 时间窗口限流

```cpp
#include <chrono>
#include <deque>
#include <mutex>

using namespace std::chrono;

// 滑动窗口限流器
class RateLimiter {
public:
    RateLimiter(int max_requests, seconds window)
        : max_requests_(max_requests), window_(window) {}

    bool allow() {
        std::lock_guard<std::mutex> lock(mutex_);
        auto now = steady_clock::now();
        // 清理过期请求
        while (!timestamps_.empty() && now - timestamps_.front() > window_) {
            timestamps_.pop_front();
        }
        if (static_cast<int>(timestamps_.size()) >= max_requests_) {
            return false;
        }
        timestamps_.push_back(now);
        return true;
    }

private:
    int max_requests_;
    seconds window_;
    std::deque<steady_clock::time_point> timestamps_;
    std::mutex mutex_;
};
```

## 6. 对比分析（横向对比）

### 6.1 C++ chrono vs Rust chrono

```rust
// Rust 风格
use chrono::{DateTime, Utc, TimeZone, NaiveDate};
let now: DateTime<Utc> = Utc::now();
let date = NaiveDate::from_ymd_opt(2026, 7, 21).unwrap();
let elapsed = now.signed_duration_since(now);
```

```cpp
// C++ 风格
auto now = std::chrono::system_clock::now();
auto date = 2026y/July/21;
// elapsed 通过减法自动推导
```

| 维度 | C++ chrono | Rust chrono |
| :--- | :--- | :--- | 
| 类型安全 | 编译期 | 编译期 |
| 零开销 | 是 | 是 |
| 日历字面量 | C++20 | 否 |
| 时区 | C++20 内置 | 第三方 crate |
| 闰秒 | C++20 utc_clock | 部分 |
| API 易用性 | 中等（模板冗长） | 较好 |

### 6.2 C++ chrono vs Java java.time

```java
// Java 风格
import java.time.*;
Instant now = Instant.now();
ZonedDateTime tokyo = now.atZone(ZoneId.of("Asia/Tokyo"));
LocalDate date = LocalDate.of(2026, 7, 21);
```

| 维度 | C++ chrono | Java java.time |
| :--- | :--- | :--- |
| 性能 | 编译期优化，零开销 | JIT 优化，有装箱开销 |
| 类型安全 | 编译期 | 运行时（部分编译期） |
| 时区 | C++20 IANA | 内置 IANA |
| 不可变性 | time_point 值类型 | 不可变对象 |
| API 易用性 | 中等 | 高 |

### 6.3 C++ chrono vs Python datetime

```python
# Python 风格
from datetime import datetime, timezone, timedelta
import pytz
now = datetime.now(timezone.utc)
tokyo = now.astimezone(pytz.timezone('Asia/Tokyo'))
elapsed = timedelta(seconds=1.5)
```

| 维度 | C++ chrono | Python datetime |
| :--- | :--- | :--- |
| 性能 | 编译期优化 | 解释执行 |
| 类型安全 | 编译期 | 运行时 |
| 时区 | C++20 内置 | 第三方 pytz |
| 闰秒 | C++20 | 否 |
| API 易用性 | 中等 | 高 |

### 6.4 steady_clock vs system_clock vs high_resolution_clock

| 维度 | `steady_clock` | `system_clock` | `high_resolution_clock` |
| :--- | :--- | :--- | :--- |
| 单调性 | 单调递增 | 可能回退 | 通常单调 |
| Epoch | 系统启动 | Unix epoch | 实现定义 |
| 精度 | 平台相关 | 平台相关 | 最高 |
| 跨进程一致 | 否 | 是 | 否 |
| 与 time_t 互转 | 否 | 是 | 否 |
| 适用：性能测量 | 推荐 | 不推荐 | 可用 |
| 适用：日志时间戳 | 不推荐 | 推荐 | 不推荐 |
| 适用：定时任务 | 推荐 | 可用 | 可用 |

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：性能测量用 system_clock

```cpp
// 错误：system_clock 可能回退
auto start = system_clock::now();
do_work();
auto end = system_clock::now();
auto elapsed = end - start;  // 可能负值！

// 正确：使用 steady_clock
auto start = steady_clock::now();
do_work();
auto end = steady_clock::now();
auto elapsed = duration_cast<milliseconds>(end - start);
```

### 7.2 陷阱：精度损失

```cpp
// 错误：duration_cast 截断
auto t = 1500ms;
auto sec = duration_cast<seconds>(t);  // 1s（丢失 500ms）

// 正确：使用 round 或保留高精度
auto rounded = round<seconds>(t);  // 2s
auto precise = duration<double>(t);  // 1.5s
```

### 7.3 陷阱：整数溢出

```cpp
// 错误：小类型累加大时长
int32_t total_ms = 0;
for (int i = 0; i < 1000000; ++i) {
    total_ms += 5000;  // 溢出：5000 * 1000000 > INT32_MAX
}

// 正确：使用 duration 与合适类型
auto total = 0ms;
for (int i = 0; i < 1000000; ++i) {
    total += 5000ms;  // 自动使用 int64_t
}
```

### 7.4 陷阱：时区 DST 歧义

```cpp
// 错误：未处理 DST 切换的歧义
auto local = 2026y/November/1 + 1h + 30min;  // 美东：EDT 还是 EST？
auto zt = zoned_time{"America/New_York", local};  // 默认取较早的

// 正确：显式选择
auto zt_earlier = zoned_time{"America/New_York", local, choose::earliest};
auto zt_later = zoned_time{"America/New_York", local, choose::latest};
```

### 7.5 陷阱：months 与 years 的平均时长

```cpp
// 错误：用 months 做精确日历计算
auto today = sys_days{2026y/January/31};
auto next_month = today + months{1};
// 结果：2026-03-03（因为 30.436875 天的平均月长度）

// 正确：使用 year_month_day
auto ymd = year_month_day{today};
auto ym = ymd.year() / ymd.month() + months{1};
auto last_day = year_month_day_last{ym.year(), month_day_last{ym.month()}}.day();
auto result = ym / min(ymd.day(), last_day);  // 2026-02-28
```

### 7.6 陷阱：utc_clock 与 system_clock 的差异

```cpp
// utc_clock 包含闰秒，system_clock 不包含
auto utc_now = utc_clock::now();
auto sys_now = system_clock::now();
// 二者数值不同（差闰秒数），但都表示"现在"
auto diff = utc_now - clock_cast<utc_clock>(sys_now);  // 约 27s
```

### 7.7 陷阱：steady_clock 跨进程不一致

```cpp
// 错误：用 steady_clock 同步多机器
// 进程 A
auto t1 = steady_clock::now();
send_over_network(t1);
// 进程 B
auto t2 = steady_clock::now();
auto elapsed = t2 - t1;  // 无意义！不同机器的 epoch 不同

// 正确：使用 system_clock + NTP 同步
auto t1 = system_clock::now();
// ...
auto elapsed = system_clock::now() - t1;  // 跨机器比较
```

### 7.8 陷阱：sleep_for 的精度

```cpp
// 错误：期望 sleep_for(1ms) 准确睡眠 1ms
std::this_thread::sleep_for(1ms);
// 实际可能睡 5-15ms（取决于操作系统调度器）

// 正确：混合休眠
void precise_sleep(nanoseconds ns) {
    auto start = steady_clock::now();
    if (ns > 2ms) {
        std::this_thread::sleep_for(ns - 1ms);
    }
    while (steady_clock::now() - start < ns) {}  // 忙等
}
```

### 7.9 陷阱：localtime 非线程安全

```cpp
// 错误：C 风格 localtime
auto now = time(nullptr);
auto* tm = localtime(&now);  // 非线程安全！
char buf[100];
strftime(buf, sizeof(buf), "%Y-%m-%d", tm);

// 正确：使用 C++20 chrono
auto now = system_clock::now();
auto date = year_month_day{floor<days>(now)};
// 或 C11 的 localtime_s（Windows）与 localtime_r（POSIX）
```

### 7.10 陷阱：zoned_time 的构造

```cpp
// 错误：直接构造 zoned_time 字符串
zoned_time zt{"2026-07-21 14:00 Asia/Tokyo"};  // 编译失败

// 正确：分步构造
auto t = sys_days{2026y/July/21} + 14h;
zoned_time zt{"Asia/Tokyo", t};
```

### 7.11 最佳实践：使用字面量

```cpp
// 不推荐
auto delay = std::chrono::milliseconds(100);

// 推荐
using namespace std::chrono_literals;
auto delay = 100ms;
```

### 7.12 最佳实践：使用 C++20 日历类型

```cpp
// 旧风格：手动处理闰年
bool is_leap(int y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }
int days_in_month(int y, int m) {
    static const int d[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (m == 2 && is_leap(y)) return 29;
    return d[m - 1];
}

// C++20：标准库自动处理
auto last = year_month_day_last{2026y, month_day_last{February}}.day();
// 2026 年非闰年，last = 28d
```

## 8. 工程实践

### 8.1 时钟选择决策

```
是否需要跨进程/机器同步？
├── 是 → system_clock
│   ├── 需要闰秒？ → utc_clock (C++20)
│   └── 否则 → system_clock
└── 否
    ├── 性能测量？ → steady_clock
    ├── 定时任务？ → steady_clock
    └── 文件时间戳？ → file_clock (C++20)
```

### 8.2 日志时间戳格式

推荐 ISO 8601 + 时区：

```cpp
auto now = system_clock::now();
auto zt = zoned_time{current_zone(), now};
std::cout << std::format("{:%Y-%m-%dT%H:%M:%S%z}\n", zt);
// 输出：2026-07-21T14:30:00+0800
```

### 8.3 性能基准最佳实践

```cpp
// 1. 使用 steady_clock
// 2. 预热避免冷启动偏差
// 3. 多次测量取中位数
// 4. 使用 clock_gettime(CLOCK_MONOTONIC) 在 Linux 上

class Benchmark {
public:
    template <typename Func>
    static microseconds measure(Func&& func, int iterations = 100) {
        using Clock = steady_clock;
        // 预热
        for (int i = 0; i < 5; ++i) func();

        std::vector<Clock::duration> timings;
        timings.reserve(iterations);
        for (int i = 0; i < iterations; ++i) {
            auto start = Clock::now();
            func();
            auto end = Clock::now();
            timings.push_back(end - start);
        }
        std::sort(timings.begin(), timings.end());
        return duration_cast<microseconds>(timings[timings.size() / 2]);
    }
};
```

### 8.4 时区数据库管理

C++20 时区数据库（`tz.db`）通常位于：

- Linux: `/usr/share/zoneinfo/`
- macOS: 同 Linux
- Windows: 注册表 + Visual C++ 运行时

```cpp
// 检查时区数据库是否可用
auto& db = get_tzdb();
std::cout << "TZ database version: " << db.version << "\n";

// 手动重载（C++20）
try {
    reload_tzdb();
} catch (const std::runtime_error& e) {
    std::cerr << "Failed to reload tzdb: " << e.what() << "\n";
}
```

### 8.5 跨平台精度处理

```cpp
// Windows: QueryPerformanceCounter 精度通常 100ns
// Linux: clock_gettime(CLOCK_MONOTONIC) 精度 1ns
// macOS: mach_absolute_time 精度 1ns

// C++ chrono 自动适配平台，但精度有差异
auto res = steady_clock::duration{1};  // 最小单位
std::cout << "Resolution: "
          << duration_cast<nanoseconds>(res).count() << " ns\n";
```

### 8.6 时间序列数据处理

```cpp
#include <chrono>
#include <vector>
#include <algorithm>

using namespace std::chrono;

// 按时间窗口聚合数据
template <typename T>
std::vector<std::pair<sys_seconds, std::vector<T>>>
aggregate_by_window(const std::vector<std::pair<sys_seconds, T>>& data, seconds window) {
    if (data.empty()) return {};
    std::vector<std::pair<sys_seconds, std::vector<T>>> result;
    auto window_start = floor<seconds>(data.front().first) - (floor<seconds>(data.front().first).time_since_epoch() % window);
    auto current = std::make_pair(window_start, std::vector<T>{});

    for (const auto& [t, v] : data) {
        if (t >= current.first + window) {
            result.push_back(std::move(current));
            window_start = floor<seconds>(t) - (floor<seconds>(t).time_since_epoch() % window);
            current = std::make_pair(window_start, std::vector<T>{});
        }
        current.second.push_back(v);
    }
    if (!current.second.empty()) result.push_back(std::move(current));
    return result;
}
```

## 9. 案例研究

### 9.1 案例一：分布式系统时钟同步

**场景**：微服务架构中，请求经过多个服务，需要追踪每个服务的处理时间。

**挑战**：

- 不同机器的 `steady_clock` epoch 不同
- 网络延迟波动
- NTP 同步误差（毫秒级）

**方案**：

```cpp
#include <chrono>
#include <string>
#include <vector>

using namespace std::chrono;

struct TraceSpan {
    std::string service;
    system_clock::time_point start;
    system_clock::time_point end;
    std::vector<TraceSpan> children;
};

class Tracer {
public:
    static Tracer& instance() {
        static Tracer t;
        return t;
    }

    void start_span(const std::string& service) {
        spans_.push_back({service, system_clock::now(), {}, {}});
    }

    void end_span() {
        if (!spans_.empty()) {
            spans_.back().end = system_clock::now();
        }
    }

    // 计算总耗时
    milliseconds total_duration() const {
        if (spans_.empty()) return milliseconds{0};
        return duration_cast<milliseconds>(spans_.back().end - spans_.front().start);
    }

private:
    std::vector<TraceSpan> spans_;
};

// 使用
void handle_request() {
    Tracer::instance().start_span("api-gateway");
    // ... 调用下游
    Tracer::instance().start_span("user-service");
    // ... 处理
    Tracer::instance().end_span();
    Tracer::instance().end_span();
    std::cout << "Total: "
              << Tracer::instance().total_duration().count() << " ms\n";
}
```

### 9.2 案例二：交易日历

**场景**：金融系统需要根据交易日历（如 NYSE）判断是否为交易日。

**实现**：

```cpp
#include <chrono>
#include <unordered_set>
#include <fstream>

using namespace std::chrono;

class TradingCalendar {
public:
    TradingCalendar(const std::string& holidays_file) {
        // 加载假日列表（如 2026-01-01、2026-07-04 等）
        std::ifstream f(holidays_file);
        std::string line;
        while (std::getline(f, line)) {
            // 假设格式 YYYY-MM-DD
            int y = std::stoi(line.substr(0, 4));
            unsigned m = std::stoi(line.substr(5, 2));
            unsigned d = std::stoi(line.substr(8, 2));
            holidays_.insert(year_month_day{year{y}, month{m}, day{d}});
        }
    }

    bool is_trading_day(year_month_day ymd) const {
        auto wd = weekday{sys_days{ymd}};
        if (wd == Saturday || wd == Sunday) return false;
        if (holidays_.count(ymd)) return false;
        return true;
    }

    year_month_day next_trading_day(year_month_day from) const {
        auto cur = sys_days{from} + days{1};
        while (!is_trading_day(year_month_day{cur})) {
            cur += days{1};
        }
        return year_month_day{cur};
    }

private:
    std::unordered_set<year_month_day> holidays_;
};
```

### 9.3 案例三：定时任务系统

**场景**：实现类似 cron 的定时任务调度，支持 "每天 14:30 执行"。

**实现**：

```cpp
#include <chrono>
#include <functional>
#include <thread>
#include <vector>

using namespace std::chrono;

class CronScheduler {
public:
    void add_daily(int hour, int minute, std::function<void()> task) {
        tasks_.push_back({hour, minute, std::move(task)});
    }

    void run() {
        while (running_) {
            auto now = system_clock::now();
            auto next = next_run_time(now);
            std::this_thread::sleep_until(next);
            if (!running_) break;
            execute_due_tasks();
        }
    }

    void stop() { running_ = false; }

private:
    struct Task {
        int hour;
        int minute;
        std::function<void()> func;
    };

    system_clock::time_point next_run_time(system_clock::time_point now) const {
        auto days_part = floor<days>(now);
        auto time_part = now - days_part;
        for (const auto& t : tasks_) {
            auto task_time = hours{t.hour} + minutes{t.minute};
            if (task_time > time_part) {
                return days_part + task_time;
            }
        }
        // 明天第一个任务
        auto next_day = days_part + days{1};
        auto first = tasks_.front();
        return next_day + hours{first.hour} + minutes{first.minute};
    }

    void execute_due_tasks() {
        auto now = system_clock::now();
        auto days_part = floor<days>(now);
        auto time_part = now - days_part;
        for (const auto& t : tasks_) {
            auto task_time = hours{t.hour} + minutes{t.minute};
            auto diff = time_part - task_time;
            if (diff >= 0s && diff < 1min) {  // 1 分钟内触发
                t.func();
            }
        }
    }

    std::vector<Task> tasks_;
    bool running_ = true;
};
```

## 10. 习题

### 10.1 基础题（Remember/Understand）

**题目 1**：列举 `<chrono>` 库的三大核心抽象，各举一个例子。

**题目 2**：解释 `steady_clock` 与 `system_clock` 的区别，给出各自的适用场景。

**题目 3**：以下代码的输出是什么？为什么？

```cpp
auto t1 = 1s;
auto t2 = 500ms;
auto t3 = t1 + t2;
std::cout << t3.count() << "\n";  // 输出？
```

### 10.2 中级题（Apply/Analyze）

**题目 4**：实现函数 `format_duration`，将时长格式化为 "1h 23m 45s" 形式。

**参考答案**：

```cpp
#include <chrono>
#include <string>
using namespace std::chrono;

std::string format_duration(seconds d) {
    auto h = duration_cast<hours>(d);
    d -= h;
    auto m = duration_cast<minutes>(d);
    d -= m;
    auto s = d;
    return std::to_string(h.count()) + "h " +
           std::to_string(m.count()) + "m " +
           std::to_string(s.count()) + "s";
}
```

**题目 5**：分析以下代码的问题并修正。

```cpp
auto start = system_clock::now();
do_work();
auto end = system_clock::now();
auto elapsed = end - start;
std::cout << "Elapsed: " << elapsed.count() << " ns\n";
```

**分析**：

1. 使用 `system_clock` 测量时间，可能因 NTP 调整而回退
2. `elapsed.count()` 输出的是原始 tick 数，不是纳秒

**修正**：

```cpp
auto start = steady_clock::now();
do_work();
auto end = steady_clock::now();
auto elapsed = duration_cast<milliseconds>(end - start);
std::cout << "Elapsed: " << elapsed.count() << " ms\n";
```

**题目 6**：使用 C++20 日历类型实现：计算某人生日距今还有多少天。

**参考答案**：

```cpp
days days_to_birthday(year_month_day birthday) {
    auto today = year_month_day{floor<days>(system_clock::now())};
    auto this_year_birthday = today.year() / birthday.month() / birthday.day();
    if (sys_days{this_year_birthday} < sys_days{today}) {
        // 今年已过，算明年
        this_year_birthday = (today.year() + years{1}) / birthday.month() / birthday.day();
    }
    return sys_days{this_year_birthday} - sys_days{today};
}
```

### 10.3 高级题（Evaluate/Create）

**题目 7**：评估在 C++20 中使用 `utc_clock` vs `system_clock` 的取舍。

**分析与答案**：

- `system_clock`：不感知闰秒，多数应用足够；与 `time_t` 兼容
- `utc_clock`：感知闰秒，适合高精度科学计算；与 GPS、TAI 互转方便
- 取舍：普通应用用 `system_clock`，需要精确 UTC 时间（如天文、卫星）用 `utc_clock`

**题目 8**：实现一个类型安全的"速度"类型，结合 `meters` 与 `seconds`。

**参考答案**：

```cpp
#include <chrono>
using namespace std::chrono;

struct meters { double value; };
meters operator+(meters a, meters b) { return {a.value + b.value}; }
meters operator-(meters a, meters b) { return {a.value - b.value}; }

// 速度 = 距离 / 时间
double operator/(meters m, seconds s) {
    return m.value / s.count();  // m/s
}

void test() {
    auto distance = meters{100.0};
    auto time = 9.58s;  // 博尔特 100m 世界纪录
    auto speed = distance / time;  // 约 10.44 m/s
}
```

**题目 9**：设计一个跨时区的会议调度器，找出所有参与者都能接受的时间窗口。

**参考答案**：

```cpp
#include <chrono>
#include <vector>
#include <string>
using namespace std::chrono;

struct Participant {
    std::string name;
    std::string tz;
    hours work_start = 9h;
    hours work_end = 17h;
};

std::vector<zoned_time>
find_meeting_times(const std::vector<Participant>& participants,
                   year_month_day date, minutes duration) {
    std::vector<zoned_time> slots;
    auto day_start = sys_days{date};
    // 每 30 分钟检查一次
    for (auto t = day_start; t < day_start + 24h; t += 30min) {
        bool all_ok = true;
        for (const auto& p : participants) {
            auto local = zoned_time{p.tz, t};
            auto local_seconds = local.get_local_time().time_since_epoch();
            auto local_time_of_day = local_seconds - floor<days>(local_seconds);
            if (local_time_of_day < p.work_start ||
                local_time_of_day + duration > p.work_end) {
                all_ok = false;
                break;
            }
        }
        if (all_ok) {
            slots.push_back(zoned_time{"UTC", t});
        }
    }
    return slots;
}
```

**题目 10**：实现一个高精度定时器，支持亚毫秒级精度。

**参考答案**：

```cpp
#include <chrono>
#include <thread>
#include <atomic>
using namespace std::chrono;

class HighPrecisionTimer {
public:
    template <typename Func>
    static void schedule(nanoseconds delay, Func func) {
        auto target = steady_clock::now() + delay;
        // 混合策略：先 sleep，后忙等
        auto sleep_until = target - busy_threshold_;
        if (steady_clock::now() < sleep_until) {
            std::this_thread::sleep_until(sleep_until);
        }
        while (steady_clock::now() < target) {
            // 忙等
        }
        func();
    }

private:
    static constexpr nanoseconds busy_threshold_ = 500us;
};
```

### 10.4 开放题（Create）

**题目 11**：设计一个分布式系统的逻辑时钟（Lamport Clock）实现，使用 chrono 库。

**提示**：

- Lamport Clock：单调递增的整数，跨进程同步
- 使用 `steady_clock` 测量本地事件间隔
- 网络消息携带时间戳

**题目 12**：实现一个"时间银行"系统，记录员工工作时间，按时区转换并计算薪资。

**提示**：

- 员工可能在不同时区
- 工作时间可能跨日（如夜班）
- 加班计算基于本地时间

## 11. 参考文献

### 11.1 标准文档

- ISO/IEC 14882:2023 *Information technology — Programming languages — C++*，§27 Time library
- ISO/IEC 9899:2018 *C17*，§7.27 Time handling（C 兼容部分）

### 11.2 核心提案

- N2661 *A Foundation to Sleep On*（Hinnant, 2008）
- P0355R7 *Extending `<chrono>` to Calendars and Time Zones*（Hinnant, 2018）
- P0217R3 *Proposal to Introduce a `format` Function*
- P1650R0 *A `std::chrono::utc_clock`*
- P1466R3 *Miscellaneous minor fixes for `<chrono>`*
- P2372R0 *Fixing locale handling in `chrono`'s formatter*
- P2445R1 *`std::is_clock`*

### 11.3 学术论文

- Lamport, Leslie. *Time, Clocks, and the Ordering of Events in a Distributed System*. CACM, 1978.
- Hinnant, Howard. *`<chrono>` Demystified*. CppCon 2016.

### 11.4 经典教材

- Stroustrup, Bjarne. *The C++ Programming Language*. 4th ed., Addison-Wesley, 2013.（Chapter 35: Time）
- Josuttis, Nicolai. *C++20 - The Complete Guide*. 2022.（Chapter 11: Chrono Extensions）
- Williams, Anthony. *C++ Concurrency in Action*. 2nd ed., Manning, 2019.

### 11.5 在线资源

- cppreference.com *Chrono library*: https://en.cppreference.com/w/cpp/chrono
- Hinnant *Date library*: https://github.com/HowardHinnant/date
- IANA Time Zone Database: https://www.iana.org/time-zones
- IERS Leap Second: https://www.iers.org/

## 12. 延伸阅读

### 12.1 进阶书籍

- Hinnant, Howard. *C++23 - The Complete Guide*. 2023.（chrono 章节）
- Román, Iván. *C++20 - The Complete Guide*. 2022.
- Tanenbaum, Andrew. *Distributed Systems*. 3rd ed., 2017.（时钟同步章节）

### 12.2 视频课程

- CppCon talks:
  - Howard Hinnant *`<chrono>` Demystified* (2016)
  - Howard Hinnant *A `<chrono>` Tutorial* (2018)
  - Howard Hinnant *Calendars and Time Zones in C++20* (2020)
- MIT 6.824 *Distributed Systems*（Lamport Clock 章节）
- Stanford CS110 *Principles of Computer Systems*（时钟同步）

### 12.3 开源实现

- libstdc++ *Chrono*: https://github.com/gcc-mirror/gcc/tree/master/libstdc++-v3/include/std/chrono
- libc++ *Chrono*: https://github.com/llvm/llvm-project/tree/main/libcxx/include/chrono
- MSVC STL *Chrono*: https://github.com/microsoft/STL
- Howard Hinnant *Date library*: https://github.com/HowardHinnant/date

### 12.4 相关主题

- C++20 Ranges（详见 *cpp/C++20范围*）
- C++20 概念（详见 *cpp/C++20概念*）
- C++23 新特性（详见 *cpp/C++23新特性*）
- C++26 与最新标准（详见 *cpp/C++26与最新标准*）
- 并发编程（详见 *cpp/并发编程*）

### 12.5 实践建议

1. **理解类型安全**：先掌握 `duration`、`time_point`、`clock` 三大抽象
2. **优先 steady_clock**：性能测量、定时任务用 `steady_clock`
3. **使用字面量**：`1s`、`100ms`、`24h` 提升可读性
4. **C++20 日历优先**：避免手写闰年、月份天数逻辑
5. **时区显式**：跨地域应用显式使用 `zoned_time`
6. **benchmark 验证**：定时任务、休眠精度需实际测量
7. **关注 C++26**：异步定时与 `std::execution` 的整合

---

> 本文档基于 ISO/IEC 14882:2023（C++23）标准编写，覆盖 C++11 至 C++26 草案的 chrono 库演进。如需了解最新提案进展，请访问 [ISO C++ 委员会官网](https://isocpp.org/) 与 [cppreference.com](https://en.cppreference.com/w/cpp/chrono)。
