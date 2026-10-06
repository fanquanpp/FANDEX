---
order: 500
title: 日期时间与时间计算
module: 'csharp'
category: 后端技术
difficulty: beginner
description: DateTime 与 DateTimeOffset 的选择、TimeZoneInfo 跨时区、TimeOnly/DateOnly、TimeSpan 运算、Unix 时间戳与 Stopwatch 计时。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'csharp/450-FileAndStream'
  - 'csharp/460-JsonSerialization'
  - 'csharp/470-RegularExpression'
  - 'csharp/400-DotnetPerformanceBenchmarking'
prerequisites: []
---

## 知识点地图

- **知识类别**：常用类库 / 时间体系（BCL 时间类型族）。
- **解决什么问题**：时间是最容易写「在本机对、上线错」代码的领域：服务器时区不同、夏令时跳变、用户跨时区、「差一秒就是没超时」的订单边界。本文给出完整选型：什么时刻用 `DateTime` 什么时刻用 `DateTimeOffset`、跨时区怎么换算不踩夏令时、纯日期/纯时刻用 `DateOnly`/`TimeOnly`、耗时测量为什么必须 `Stopwatch`。
- **什么时候用到**：订单/会话超时判断、定时任务与日程提醒（跨时区）、存档与离线收益的时间戳结算、接口性能计时。

本文插入 [文件与流](/csharp/450-FileAndStream)、[JSON 序列化](/csharp/460-JsonSerialization) 与 [正则表达式](/csharp/470-RegularExpression) 之间的常用类库序列。真实工程主线之一是 flower-card 的离线收益结算（`Scripts/Core/OfflineReward.cs`：Unix 时间戳差值 + Math.Clamp 防改钟，另见 [异常处理与健壮性](/csharp/062-ExceptionHandling) §5.3）。

## 1. 心智模型：时刻、视图与日历三种概念

时间 API 出错，几乎都是把三种概念混为一谈：

| 概念 | 含义 | 对应类型 |
| --- | --- | --- |
| **时刻**（instant） | 时间线上唯一的点 | `DateTimeOffset`、`DateTime`（UTC Kind） |
| **日历视图** | 人类语言里的「2026 年 10 月 7 日 9 点」 | `DateTime`（Unspecified/Local）、`DateOnly`+`TimeOnly` |
| **时间段** | 两点的间隔长度 | `TimeSpan` |

判断题：「会议在下午 3 点开始」没有指定时区时**不是时刻**——北京下午 3 点与纽约下午 3 点相差 12 小时。「订单创建于 2026-10-07T01:00:00Z」是时刻。选型的第一问永远是：**这个值是时刻，还是日历描述？**

## 2. DateTime 与 DateTimeOffset 的选择

```csharp
// DateTime：时刻 + Kind 标记（Utc / Local / Unspecified）
var utcNow = DateTime.UtcNow;          // Kind = Utc —— 服务端记录时刻的合法用法
var local = DateTime.Now;              // Kind = Local —— 依赖机器时区，慎用
var parsed = DateTime.Parse("2026-10-07 09:00"); // Kind = Unspecified —— 语义悬空

// DateTimeOffset：时刻 + 显式偏移量，比较时折算到同一时间线
var meeting = new DateTimeOffset(2026, 10, 7, 15, 0, 0, TimeSpan.FromHours(8)); // 北京 15:00
var sameMoment = new DateTimeOffset(2026, 10, 7, 3, 0, 0, TimeSpan.Zero);       // UTC 03:00
Console.WriteLine(meeting == sameMoment); // True —— 同一时刻，偏移不同
```

选型规则：

- **数据库与 API 的时刻字段用 `DateTimeOffset`**。它自带偏移，`==` 比较折算到时间线，两个「写法不同、时刻相同」的值相等；`DateTime` 的 `==` 只比较刻度值，`Kind` 不同的两个「相同读数」会误判相等。
- **仍用 `DateTime` 的合法场景**：约定全系统只存 UTC（Kind=Utc，如日志时间戳），或纯日历语义（`2026-10-07` 这一天，没有时区属性）。
- **`DateTime.Now` 是公共 API 与服务端代码的禁区**：值随部署机器时区漂移，容器里默认 UTC、开发机是东八区，同一份代码两套行为。需要本地时间展示时，由 UTC 时刻 + 目标时区换算（§3）。
- `DateTime` 的 `Unspecified` Kind 是陷阱高发区：`Parse("2026-10-07 09:00")` 得到的值没有时区语义，直接 `.ToUniversalTime()` 会按**服务器本地时区**解读它——先想清楚输入属于哪个时区，用 `DateTime.SpecifyKind` 或 `DateTimeOffset.Parse` 显式声明。

## 3. TimeZoneInfo：跨时区换算

日程提醒的典型需求：「北京时间每天 15:00 提醒」——这不是「每 24 小时一次」（夏令时会漂移），而是「目标时区的 15:00」：

```csharp
var zone = TimeZoneInfo.FindSystemTimeZoneById("China Standard Time");
var nowUtc = DateTimeOffset.UtcNow;

// 今天的北京 15:00 对应的时刻
var todayBeijing = TimeZoneInfo.ConvertTime(nowUtc, zone);          // 视图：北京时间现在几点
var next15 = todayBeijing.Date.AddHours(15);                        // 北京视角的今天 15:00
var next15Utc = TimeZoneInfo.ConvertTimeToUtc(
    DateTime.SpecifyKind(next15, DateTimeKind.Unspecified), zone);  // 折回时刻

var delay = next15Utc - nowUtc; // TimeSpan：距下次提醒的真实间隔（夏令时自动正确）
```

- **换算必须经过 `TimeZoneInfo`**，不能用「加 8 小时」硬编码：跨夏令时地区（如美东 `Eastern Standard Time`）的偏移一年变两次，硬编码会在三月与十一月各错一小时；
- Windows 与 Linux 的时区 ID 历史不同（`China Standard Time` vs `Asia/Shanghai`）。.NET 8 的 `TimeZoneInfo.FindSystemTimeZoneById` 已内置互认映射；跨平台老项目可用 `TZConvert`（TimeZoneConverter 库）统一；
- 计算结果再换回 `DateTimeOffset`/UTC 存储，「显示用视图、存储用时刻」的分工贯穿始终。

## 4. TimeOnly / DateOnly：纯日历值（.NET 6+）

```csharp
DateOnly openDay = new(2026, 10, 1);
TimeOnly openTime = new(9, 0);

// 营业时间的建模：不需要也不该携带时区
if (DateOnly.FromDateTime(DateTime.Today) == openDay) { /* 周年庆当天 */ }

// 与 DateTime 的互转
var combined = openDay.ToDateTime(openTime); // 2026-10-01 09:00:00（Unspecified）
DateOnly day = DateOnly.FromDateTime(DateTime.Today);
TimeOnly time = TimeOnly.FromDateTime(DateTime.Now);

// 一天内的循环
TimeOnly close = new(21, 0);
bool isOpen = openTime <= time && time < close;
```

- 生日、营业时段、课程表这类值用 `DateOnly`/`TimeOnly` 后，序列化为 `"2026-10-01"` 与 `"09:00:00"`（无日期歧义、无假时区），替代了「用 DateTime 却假装没有时间部分」的旧写法；
- JSON 序列化注意版本：`System.Text.Json` 在 .NET 7 起原生支持这两个类型，旧目标框架会抛 `NotSupportedException`（衔接 [JSON 序列化](/csharp/460-JsonSerialization) 的自定义转换器）。

## 5. TimeSpan 运算的边界

```csharp
var start = DateTimeOffset.Now;
// ... 执行工作 ...
TimeSpan elapsed = DateTimeOffset.Now - start;

Console.WriteLine(elapsed.TotalMinutes);  // 2.5（double：小数分钟）—— 常用
Console.WriteLine(elapsed.Minutes);       // 2（int 分量：整段里的分钟位）—— 高频误用！

// 构造与比较
var timeout = TimeSpan.FromSeconds(30);
if (elapsed > timeout) { /* 超时 */ }

// 加减单位用静态方法，别手算毫秒
var later = start.Add(TimeSpan.FromHours(48));
```

- `Total*` 与分量属性的区别是本主题第一坑：`1小时35分` 的 `Minutes` 是 35、`TotalMinutes` 是 95。「等了 95 分钟」写成 `ts.Minutes > 5` 的判断在跨小时场景全部失灵；
- `TimeSpan` 表示**时长**不是「一天中的时刻」：`TimeSpan.FromHours(25)` 完全合法，别拿它当 25 点钟；
- 时间跨度格式化给用户看时用 `ts.ToString(@"hh\:mm\:ss")` 或手动组合——默认 `ToString()` 的 `1.05:30:00`（天.时：分：秒）不适合直接展示。

## 6. Unix 时间戳与 Stopwatch 计时

### 6.1 Unix 时间戳：跨系统存档与结算的通用语言

```csharp
// 现在的时刻 -> 秒级 Unix 时间戳
long nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

// 时间戳 -> 时刻
var moment = DateTimeOffset.FromUnixTimeSeconds(nowUnix);

// flower-card 离线结算的核心防御（OfflineReward.cs）：
// 玩家可改系统时间或存档，差值必须钳制在 [0, 8小时]
int offlineSeconds = (int)Math.Clamp(
    DateTimeOffset.UtcNow.ToUnixTimeSeconds() - save.LastSaveUnix,
    0,
    MaxOfflineSeconds);
```

- 存档/跨端协议里的时间用**秒或毫秒整数**而不是格式化字符串：无文化歧义、无解析成本、可比大小；
- 「结算时长」永远对原始差值做 `Math.Clamp`：负值（时钟回拨/存档来自未来）与超上限都要压回合法区间，这是对不可信输入的基本防御；
- 秒级 vs 毫秒级要写进字段名（`lastSaveUnixSec`/`createdAtMs`），混用是联机协议的经典 bug。

### 6.2 Stopwatch：测量耗时的唯一正确工具

```csharp
var sw = System.Diagnostics.Stopwatch.StartNew();
DoWork();
sw.Stop();

Console.WriteLine($"耗时 {sw.ElapsedMilliseconds} ms");       // 毫秒整读数
Console.WriteLine($"耗时 {sw.Elapsed.TotalMilliseconds:F2} ms"); // 高精度读数
```

- `DateTime.Now` 的精度只有约 15ms（系统时钟更新频率），且会随 NTP 校时**倒退**——用它测耗时可能测出负数；
- `Stopwatch` 走高精度性能计数器（`Stopwatch.IsHighResolution` 通常为 true），单调递增、不受校时影响，是基准测试与性能日志的标配（衔接 [性能与基准测试](/csharp/400-DotnetPerformanceBenchmarking) 的测量方法学）；
- 更简单的现代写法：`ValueStopwatch`/`Stopwatch.GetTimestamp()` 手算，或 .NET 7+ 的 `TimeProvider` 抽象（可注入、可测试）。

## 7. 三个真实工程例子

### 7.1 订单超时判断

「下单 15 分钟未支付自动取消」是时刻差判断的标准形态：

```csharp
// 存储层：CreatedAt 是 DateTimeOffset（数据库 timestamptz 类型）
var deadline = order.CreatedAt.AddMinutes(15);
if (DateTimeOffset.UtcNow >= deadline)
{
    await CancelAsync(order.Id, reason: "超时未支付");
}

// 边界语义要写测试：第 900 秒整算不算超时？——用 >= 或 > 明确写死并注释
```

- 判断基准统一用 `UtcNow`，别混入本地时间；`CreatedAt` 若来自客户端上报，先与服务器时间做钳制（防客户端改钟延长支付窗口）；
- 批量扫描超时订单时，把「现在」取一次存变量循环内复用——循环执行期间时间在走，逐条取 `UtcNow` 会让边界行同事例行为不一致。

### 7.2 跨时区日程提醒

见 §3 的换算代码，工程化封装：

```csharp
public sealed record Reminder(DateTimeOffset NextAtUtc, TimeZoneInfo Zone, TimeOnly LocalTime)
{
    public Reminder Next()
    {
        // 在目标时区视图上推进到「明天的同一本地时刻」，再折回 UTC
        var localNext = TimeZoneInfo.ConvertTime(NextAtUtc, Zone).Date.AddDays(1);
        var nextLocal = localNext.AddTicks(LocalTime.Ticks);
        var nextUtc = TimeZoneInfo.ConvertTimeToUtc(nextLocal, Zone);
        return this with { NextAtUtc = new DateTimeOffset(nextUtc) };
    }
}
```

- 「每天 15:00」的正确实现永远是：在目标时区的**日历视图**上推进日期，再换算回时刻存储——夏令时切换日自动变成正确时刻（例如美东 15:00 在十一月从 UTC-4 变 UTC-5，视图法自动跟随）；
- 反面教材是 `NextAtUtc.AddDays(1)`：对时刻直接加天，夏令时日会把提醒从 15:00 漂移到 14:00 或 16:00。

### 7.3 离线收益按时间戳差值结算（flower-card 案例）

完整结算链路串起本篇三个知识点：

```csharp
// 1) 存档保存：UTC 时间戳落盘（跨设备同步无歧义）
save.LastSaveUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

// 2) 读档结算：差值 + 钳制 + 速率快照（纯函数，坏输入产出小数字而非崩溃）
int offlineSeconds = (int)Math.Clamp(
    DateTimeOffset.UtcNow.ToUnixTimeSeconds() - save.LastSaveUnix, 0, MaxOfflineSeconds);
var rewards = OfflineReward.Calculate(save.RatesSnapshot, offlineSeconds);

// 3) 展示层：把秒数变人类可读（用户可看的时长用本地习惯格式）
string text = offlineSeconds >= 3600
    ? $"离线收益（共 {offlineSeconds / 3600} 小时 {offlineSeconds % 3600 / 60} 分）"
    : $"离线收益（共 {offlineSeconds / 60} 分钟）";
```

- 存储用时间戳（机器语义）、展示用格式化（人类语义）分离，与 §4 的 DateOnly/TimeOnly 哲学一致；
- `Calculate` 是纯函数：给定「离线瞬间速率快照 + 秒数」结果唯一，方便单元测试任意大小时长（包括 0 秒、负数、超上限——见 [异常处理与健壮性](/csharp/062-ExceptionHandling) §5.3 的防御式设计全解）。

## 8. 动手实践

练习任务：实现一个 `CooldownTracker`（技能冷却），要求：

1. `Start(string skill, TimeSpan cooldown)` 记录开始时刻（内部用 `Stopwatch` 或 `DateTimeOffset`，说明你的选择理由）；
2. `RemainingSeconds(skill)` 返回剩余冷却（double，可为 0，不可为负）；
3. 思考题一：玩家挂机 8 小时后回来，`RemainingSeconds` 应该是多少？你的实现为什么天然正确？
4. 思考题二：若系统在冷却期间被 NTP 校时回拨 30 秒，基于 `DateTime.Now` 的实现会出什么问题？

提示：冷却剩余 = 总时长 - 已流逝；「流逝」用单调时钟（Stopwatch）而不是墙上时钟；剩余不可为负用 `Math.Max(0, ...)`。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```csharp
using System.Diagnostics;

public sealed class CooldownTracker
{
    private readonly Dictionary<string, (long StartTs, TimeSpan Cooldown)> _running = new();
    private readonly Stopwatch _clock = Stopwatch.StartNew(); // 单调时钟：不受系统校时影响

    public void Start(string skill, TimeSpan cooldown) =>
        _running[skill] = (_clock.ElapsedTimestamp, cooldown);

    public double RemainingSeconds(string skill)
    {
        if (!_running.TryGetValue(skill, out var entry)) return 0;

        var elapsed = _clock.ElapsedTimestamp - entry.StartTs;
        var remaining = entry.Cooldown.TotalSeconds - elapsed / (double)Stopwatch.Frequency;
        return Math.Max(0, remaining); // 剩余不可为负
    }
}

/* 思考题答案：
 * 一）挂机 8 小时后，Stopwatch 的 elapsed 已远超冷却，Max(0, ...) 返回 0——
 *     冷却早已结束，实现天然正确，无需「处理挂机」的特殊逻辑；
 * 二）DateTime.Now 被 NTP 回拨 30 秒会让「流逝时间」变小 30 秒（甚至为负），
 *     冷却凭空延长或变成负数异常——这正是 §6.2 强调 Stopwatch 单调性的原因。
 *     若业务必须用墙上时钟（跨进程恢复冷却），用 Unix 时间戳 + Clamp 兜底。
 */
```

自检：`RemainingSeconds` 永远在 [0, cooldown] 区间；冷却结束的条目可以顺手从字典移除（`if (remaining == 0) _running.Remove(skill)`）防长期运行内存膨胀。

</details>

## 9. 常见陷阱速查

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 用 `DateTime.Now` 记录服务端时刻 | 随部署机器时区漂移 | `DateTime.UtcNow` / `DateTimeOffset.UtcNow` |
| `==` 比较 `DateTime` 忽略 Kind | Utc 与 Local 的同读数值误判 | 时刻字段用 `DateTimeOffset` 或先 `ToUniversalTime` |
| 硬编码「东八区加 8 小时」 | 夏令时地区错一小时 | `TimeZoneInfo` 换算 |
| `ts.Minutes` 当总分钟用 | 分量不是总量 | `ts.TotalMinutes` |
| 用 `DateTime.Now` 测耗时 | 15ms 精度 + NTP 回拨出负数 | `Stopwatch` |
| 时间戳秒/毫秒混用 | 联机协议对不上 | 字段名写明单位 |
| 未钳制的时长差值 | 改钟刷收益/负数崩溃 | `Math.Clamp(diff, 0, cap)` |
| 对时刻 `AddDays(1)` 表达「明天同一时刻」 | 夏令时日漂移 | 目标时区视图上推进再换回 |

## 10. 小结

初学者要点：区分时刻/日历视图/时长三种概念；时刻用 `DateTimeOffset` 或 UTC `DateTime`，日历值用 `DateOnly`/`TimeOnly`；跨时区必经 `TimeZoneInfo`；测耗时用 `Stopwatch`。进阶注意：「每天 X 点」在时区视图上推进；时间戳差值先 Clamp 再结算；`Total*` 与分量属性的分界；存储机器语义、展示人类语义。

## 参考与致谢

- Microsoft Learn：*DateTime, DateTimeOffset, TimeSpan, and TimeOnly/DateOnly*（.NET 类型文档，CC-BY 4.0 / Microsoft 文档许可），https://learn.microsoft.com/dotnet/standard/datetime/
- Microsoft Learn：*Converting times between time zones* 与 *TimeZoneInfo class*，https://learn.microsoft.com/dotnet/standard/datetime/converting-between-time-zones
- Microsoft Learn：*Stopwatch class* 与 *choosing between DateTime and DateTimeOffset*，https://learn.microsoft.com/dotnet/standard/datetime/choosing-between-datetime
