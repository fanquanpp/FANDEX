---
order: 690
title: Temporal 日期时间 API
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 开售时间在纽约用户眼里错了两小时：用 Temporal 的类型分离解决时区、夏令时与 Date 的老毛病。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'javascript/600-NewFeatureAdoptionStrategy'
  - 'javascript/650-IntlApi'
  - 'javascript/460-StorageForTheWeb'
prerequisites:
  - 'javascript/040-VariableDataType'
---

# Temporal 日期时间 API

## 场景：开售时间显示错了两小时

票务页配置"北京时间 2026-11-07 20:00 开售"，纽约同事打开页面却看到"上午 7:00 开售"。排查代码：

```javascript
// 配置里存的是字符串
const saleTime = new Date('2026-11-07T20:00:00');   // 没带时区！
// 按运行环境的时区解析——上海的服务器、纽约的浏览器，解释结果差 12 小时
```

`Date` 的老毛病在这里集中爆发：不带时区的字符串按**运行环境**解释；月份从 0 数；对象可变（`setHours` 改原值）；没有"纯日期"类型（"11 月 7 日"被迫带上 00:00:00 的时刻）。Temporal 的解法不是给 Date 打补丁，而是**把不同的时间概念拆成不同类型**，从类型上杜绝这类错误。

状态先说清楚：Temporal 已于 2026 年进入 Stage 4 定稿，预计随 ES2027 正式出版；各运行时支持正在铺开，生产代码用 `@js-temporal/polyfill` 兜底、按 MDN/caniuse 确认目标环境。现在学正当时——API 已冻结，值得直接写进新代码。

## 类型地图：先问"我在处理哪种时间"

Temporal 有八个类型，日常记牢六个就够。核心问题只有一个：**这个时间需不需要"锚定在地球某处"**。

| 类型 | 回答的问题 | 例子 |
| ---- | ---- | ---- |
| `Instant` | 宇宙时间线上的一个精确点 | "2026-11-07T12:00:00Z"（UTC 时刻） |
| `ZonedDateTime` | 某地墙上时钟 + 时区 | "北京时间 11 月 7 日 20:00" |
| `PlainDateTime` | 墙上时钟，不知道在哪 | 日历应用里"11 月 7 日 14:00"（无时区） |
| `PlainDate` / `PlainTime` | 纯日期 / 纯时间 | 生日"2000-01-01"；营业时间"09:00" |
| `Duration` | 时间段（多久），不是时间点 | "P1DT2H"（1 天 2 小时） |
| `PlainYearMonth` / `PlainMonthDay` | 年月 / 月日 | 账单月"2026-11"；每年提醒"06-14" |

回填场景：开售时刻的正确建模是 `ZonedDateTime`——它知道"20:00"是**北京**的 20:00，换算到任何时区都不会错：

```javascript
const sale = Temporal.ZonedDateTime.from(
  '2026-11-07T20:00:00[Asia/Shanghai]'
);

sale.toString();            // 完整保留时区
sale.withTimeZone('America/New_York').hour; // 7 —— 纽约用户看到的是 EST 早上 7 点
```

上面纽约显示 7 点是对的（11 月纽约已过夏令时，UTC-5）。用 `Date` 写这段逻辑，你得手工算偏移，还得记住 11 月初夏令时刚结束——Temporal 内置完整 IANA 时区库与历史夏令时规则，这些都不用你管。

## 动手：五个高频操作

```javascript
// 1. 创建：字符串解析（ISO 8601，严格）或字段对象
Temporal.PlainDate.from('2026-11-07');
Temporal.PlainDate.from({ year: 2026, month: 11, day: 7 });

// 2. 运算：不可变，返回新对象（对比 Date.setMonth 的原地修改）
const later = sale.add({ days: 3, hours: 2 });

// 3. 差值：until / since 返回 Duration
const wait = Temporal.Now.zonedDateTimeISO('Asia/Shanghai').until(sale);
wait.total('hours');   // 还要等多少小时

// 4. 比较：用方法而不是 >（不同类型的比较语义被显式区分）
sale.equals(later);                 // 完全相等
Temporal.PlainDate.compare(a, b);   // 排序用

// 5. 展示：本地化格式交给 Intl，自己只算不摆
sale.toLocaleString('zh-CN');       // 按 zh-CN 习惯输出
```

两个特别值得表扬的设计：

- **字段级调整 `with`**：`sale.with({ hour: 9 })` 返回"改了小时"的新对象，语义清楚，不像 `setHours` 那样静默改原值。
- **`PlainDate` 存生日**：`Temporal.PlainDate.from('2000-01-01')` 没有任何时刻与时区含义，再也不会出现"生日因时区提前一天"的事故。存库与序列化统一用 ISO 字符串（`toString()`），读回来用 `from()`。

## 夏令时：让 11 月 2 日重复的那一小时现形

夏令时是 Date 时代的重灾区。美国 2026 年 11 月 1 日凌晨 2 点时钟回拨到 1 点，"01:30"这天出现两次。Temporal 的处理方式是把歧义显式化：

```javascript
const ambiguous = Temporal.PlainDateTime.from('2026-11-01T01:30:00');
// 把它落到纽约时区时，Temporal 不猜，要求你表态：
ambiguous.toZonedDateTime('America/New_York');
// RangeError：inst 是歧义时间，请指明偏好
ambiguous.toZonedDateTime('America/New_York', { disambiguation: 'earlier' });
// 选第一次出现的 01:30（EDT）
```

`disambiguation` 有四个选项：`earlier`、`later`、`compatible`（默认，取较合理的一个）、`reject`（直接报错）。凡是"用户输入本地时间再转时区"的功能（日程、预约），这个参数该被产品层面明确，而不是靠引擎默认值蒙混。

## Duration 与一个反直觉点

Duration 支持从纳秒到年的单位，运算时注意**"天"没有固定长度**：跨夏令时的一天是 23 或 25 小时。所以 `ZonedDateTime` 上的 `add({ days: 1 })` 按"日历日"推进（同一时刻的明天），而 `Duration` 的 `total('days')` 按精确时长折算——两种"一天"在 DST 边界可以差一小时。规则：对"墙上日历"做加减用在 ZonedDateTime 上传 days/weeks；对"精确流逝时间"计时用 `Instant`/`Duration`，单位只到小时以下更安全。

```javascript
const d = Temporal.Duration.from({ hours: 90 });
d.round({ largestUnit: 'days' });  // P3DT18H：纯时长折算，无时区问题
```

## 迁移策略：与 Date 共存

```javascript
// 存在性检测 + 按需 polyfill
if (typeof Temporal === 'undefined') {
  await import('@js-temporal/polyfill/auto'); // 现代打包器会按需拆包
}
// 与 Date 的边界：Instant <-> Date
const d = new Date(instant.epochMilliseconds);
const instantAgain = Temporal.Instant.fromEpochMilliseconds(d.getTime());
```

存量代码不必一次性迁移：新模块用 Temporal，接口边界处做一次 `Instant`/`epochMilliseconds` 转换。date-fns/Luxon 可以继续服务旧代码，两者并不冲突。唯一别做的是在 Temporal 对象上套用 Date 的思维（比如找 `getMonth()`——它没有，请用 `.month`，这次月份终于从 1 数起）。

## 坑点与自检

**坑 1：`from()` 对非法输入直接抛错**，不像 `new Date('乱写')` 返回 Invalid Date 悄悄混过去。这是特性：包一层 try/catch，把坏数据挡在入口。

**坑 2：混淆 `Instant` 与 `ZonedDateTime` 的字符串**。`Instant.from('2026-11-07T20:00:00+08:00')` 合法（带偏移可确定时刻），`PlainDateTime.from(...)` 则保留墙上时间。存哪个类型，取决于"换时区时它该不该跟着变"。

**坑 3：用 Duration 直接做绝对时间加减**。"加一个月"在 1 月 31 日会得到 2 月 28 日（日历语义）——这是对的但常被误报为 bug；计时类需求请用秒级单位。

**坑 4：忽略运行时支持矩阵**。polyfill 体积不小，按目标环境检测后再加载，别无脑全量引入。

自检清单：生日该用哪个类型？开售时刻呢？"北京时间 20:00"存成不带时区的字符串错在哪？DTS 歧义时间转换时引擎为什么不猜？

## 练习

1. 把本篇开售例子写完整：输入 ISO 字符串与时区，输出给任意 IANA 时区用户的本地化显示（用 `toLocaleString` 加 `Intl.DateTimeFormat` 选项）。
2. 写 `isSameBirthday(date1, date2)`：比较两个 `PlainDate` 的月日是否相同，忽略年份；验证 2 月 29 日生人在平年的处理（`with({ year })` 加 try/catch）。
3. 实现"会议时间协调器"：输入各参会者的 ZonedDateTime，输出每人本地的会议时间表，DST 歧义用 `disambiguation: 'reject'` 显式暴露。
4. 把项目里一个存字符串时间戳的接口改为 `Instant` 的 epoch 纳秒，写出双向转换与回归用例。

## 下一步

- [Intl API](/javascript/650-IntlApi)：Temporal 的本地化格式化底层就是它，两者配合食用。
- [Web 存储](/javascript/460-StorageForTheWeb)：Temporal 对象以 ISO 字符串形态入库。
- [JavaScript 最新特性](/javascript/600-NewFeatureAdoptionStrategy)：同期其他值得跟进的标准进展。
