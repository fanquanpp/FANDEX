---
order: 65
title: Temporal
module: javascript
category: JavaScript
difficulty: advanced
description: TC39 Temporal 现代日期时间 API——类型体系、时区算法、历法支持、Duration 运算与工程实践
author: fanquanpp
updated: '2026-07-20'
related:
  - javascript/Web存储API
  - javascript/索引数据库
  - javascript/迭代器帮助器
  - javascript/Promise构造器
  - javascript/Intl国际化API
prerequisites:
  - javascript/语法速查
tags:
  - Temporal
  - Date
  - ISO8601
  - TimeZone
  - IANA
  - Duration
  - TC39
  - Calendar
  - iCalendar
learningObjectives:
  - '列举 Temporal API 的核心类型体系（Instant、ZonedDateTime、PlainDateTime、PlainDate、PlainTime、Duration、Now），复述每个类型的语义边界'
  - '解释 Date 对象的设计缺陷（可变性、月份零基、时区缺失）以及 Temporal 如何通过类型分离解决这些问题'
  - '使用 Temporal.Instant、Temporal.ZonedDateTime、Temporal.PlainDate 进行日期时间创建、运算、格式化与时区转换'
  - '拆解 ISO 8601 字符串解析规则、IANA 时区数据库结构、夏令时（DST）转换的边界情况'
  - '评估不同时区存储策略（UTC 存储 + 本地展示 vs 本地存储）的适用场景与一致性风险'
  - '设计一个跨时区的会议调度系统，集成 Temporal.ZonedDateTime、DST 容错、用户偏好持久化与冲突检测'
exercises:
  - type: fill-blank
    bloom: remember
    question: 'Temporal API 中表示"绝对时刻"（与时区无关）的类型是 ______，而表示"带时区的日期时间"的类型是 ______。'
    answer: "Temporal.Instant；Temporal.ZonedDateTime"
  - type: choice
    bloom: analyze
    question: "下列 Temporal 代码的输出是？\n```javascript\nconst zdt = Temporal.ZonedDateTime.from('2026-03-15T10:00:00[America/New_York]');\nconst shifted = zdt.toPlainDateTime().toPlainDate().add({ days: 1 });\nconsole.log(shifted.toString());\n```"
    options:
      - "A. 2026-03-16"
      - "B. 2026-03-16T10:00:00"
      - "C. 2026-03-16T10:00:00[America/New_York]"
      - "D. 抛出 RangeError"
    answer: "A"
    explanation: "toPlainDateTime 丢弃时区信息得到无时区日期时间，toPlainDate 进一步丢弃时间得到纯日期，add({days:1}) 得到 2026-03-16。"
  - type: code-fix
    bloom: analyze
    question: |
      以下代码尝试计算两个时间点之间的小时差，但在跨夏令时切换时返回错误结果。请修复：
      ```javascript
      function hoursBetween(startISO, endISO) {
        const start = new Date(startISO);
        const end = new Date(endISO);
        return Math.round((end - start) / 3600000);
      }
      // 纽约 2026-03-08（DST 开始）前一天到后一天
      console.log(hoursBetween('2026-03-07T10:00:00', '2026-03-08T10:00:00'));
      ```
    answer: |
      ```javascript
      function hoursBetween(startISO, endISO, timeZone = 'UTC') {
        // 使用 Temporal.ZonedDateTime 正确处理 DST
        const start = Temporal.ZonedDateTime.from(startISO + '[' + timeZone + ']');
        const end = Temporal.ZonedDateTime.from(endISO + '[' + timeZone + ']');
        // until 默认返回基于时钟时间的 Duration，DST 转换会自动处理
        const duration = start.until(end);
        return duration.total({ unit: 'hour' });
      }
      console.log(hoursBetween('2026-03-07T10:00:00', '2026-03-08T10:00:00', 'America/New_York'));
      // DST 切换日时钟跳过 1 小时，actual = 23 小时
      ```
  - type: open-ended
    bloom: create
    question: "请设计一个跨时区会议调度系统，要求：(1) 参与者来自不同时区；(2) 自动避开每位参与者的非工作时间（22:00-07:00）；(3) 正确处理 DST 切换；(4) 支持历法偏好（公历/农历/希伯来历）；(5) 持久化到数据库。请描述数据模型、调度算法与时间存储策略。"
    answer: "应包括：所有时间以 Temporal.Instant（UTC）存储，展示层用 Temporal.ZonedDateTime 转换为各参与者本地时间；调度算法用 ZonedDateTime 的 until/since 计算 Duration，遍历候选时段过滤；DST 容错用 Temporal.PlainTime 比较小时数；历法支持通过 calendar 选项指定（'chinese'、'hebrew'）；数据库以 BIGINT 存储纳秒时间戳或 ISO 8601 字符串。"
references:
  - author: [TC39]
    title: "Proposal: Temporal - Modern Date Time API"
    journal: "TC39 Proposals"
    year: 2026
    url: "https://tc39.es/proposal-temporal/"
  - author: [ECMA International]
    title: "ECMAScript 2026 Language Specification - Temporal Objects"
    journal: "ECMA-262, 17th Edition"
    year: 2026
    url: "https://tc39.es/ecma262/#sec-temporal-objects"
  - author: [IANA]
    title: "IANA Time Zone Database (tzdata)"
    journal: "Internet Assigned Numbers Authority"
    year: 2026
    url: "https://www.iana.org/time-zones"
  - author: [International Organization for Standardization]
    title: "ISO 8601 - Date and time format"
    journal: "ISO 8601:2019"
    year: 2019
    url: "https://www.iso.org/iso-8601-date-and-time-format.html"
  - author: [Mozilla Developer Network]
    title: "Temporal JavaScript API"
    journal: "MDN Web Docs"
    year: 2026
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal"
etymology:
  term: "Temporal"
  origin: 'Temporal API 由 Maggie Johnson-Pint 与 Philipp Dunkel 等于 2017 年发起提案，目标是用类型化的现代 API 替代 1995 年由 Brendan Eich 实现的 Date 对象。词源 temporal 来自拉丁语 temporalis，意为"时间的"。提案在 2021 年进入 Stage 3，2024 年进入 Stage 4，是 TC39 历史上规模最大的提案之一（规范文本超过 38000 字）。'
lastReviewed: '2026-07-20'
reviewer: FANDEX Content Engineering Team
---

# Temporal 现代日期时间 API

## 0. 导言

时间（Time）是软件开发中最复杂的概念之一。看似简单的"现在几点"问题，在跨时区、跨历法、跨夏令时（DST）场景下会衍生出大量边界情况。JavaScript 自 1995 年起内置的 `Date` 对象，因其设计缺陷长期被诟病为"语言中最糟糕的 API 之一"。

`Temporal` 是 TC39 提案中的现代日期时间 API，目标是：

- **类型分离**：用 `Instant`、`ZonedDateTime`、`PlainDateTime`、`PlainDate`、`PlainTime`、`Duration` 等多个类型替代单一 `Date`。
- **不可变性**：所有 Temporal 对象都是不可变的，避免 `Date` 的 mutate-in-place 陷阱。
- **时区与历法一等公民**：原生支持 IANA 时区数据库与多种历法（公历、伊斯兰历、希伯来历、中国农历等）。
- **ISO 8601 严格解析**：所有字符串都遵循 ISO 8601 / RFC 3339 格式，时区用方括号语法 `[America/New_York]`。
- **Duration 类型**：提供独立的"时间段"类型，支持精确的算术运算与单位换算。

> **核心命题**：`Date` 把"绝对时刻"与"墙上时钟时间"混在一个对象里，导致跨时区与 DST 处理必然出错。`Temporal` 通过类型分离，让每个概念都有独立类型，让编译器（或运行时类型检查）帮助捕获语义错误。

---

## 1. 学习目标与认知地图

完成本章后，学习者应能够：

1. **复述**（remember）Temporal API 的核心类型体系与语义边界。
2. **解释**（understand）`Date` 对象的设计缺陷与 Temporal 的解决思路。
3. **应用**（apply）Temporal API 进行日期时间创建、运算、格式化与时区转换。
4. **分析**（analyze）ISO 8601 字符串解析规则、IANA 时区数据库、DST 转换的边界情况。
5. **评估**（evaluate）不同时区存储策略的适用场景与一致性风险。
6. **设计**（create）一个跨时区的会议调度系统，集成 DST 容错、历法偏好与冲突检测。

### 1.1 知识体系

```
Temporal API
├── 核心类型
│   ├── Instant（绝对时刻，UTC 纳秒）
│   ├── ZonedDateTime（带时区与历法的完整日期时间）
│   ├── PlainDateTime（无时区的墙上时钟时间）
│   ├── PlainDate（纯日期）
│   ├── PlainTime（纯时间）
│   ├── PlainYearMonth（年-月，无日）
│   ├── PlainMonthDay（月-日，无年）
│   └── Duration（时间段）
├── 入口
│   └── Temporal.Now（当前时刻工厂）
├── 时区
│   ├── IANA 时区数据库（tzdata）
│   ├── 夏令时（DST）处理
│   ├── 时区转换与歧义消除
│   └── UTC 偏移量
├── 历法
│   ├── iso8601（默认）
│   ├── chinese（农历）
│   ├── hebrew（希伯来历）
│   ├── islamic（伊斯兰历）
│   ├── japanese（日本年号历）
│   └── buddhist（佛历）
├── 字符串格式
│   ├── ISO 8601 基础语法
│   ├── RFC 3339（互联网格式）
│   └── Temporal 扩展（时区方括号、历法方括号）
├── 运算
│   ├── 加减 Duration
│   ├── until / since 计算差值
│   ├── compare 比较
│   └── round 取整
├── 格式化
│   ├── toString（ISO 8601 标准输出）
│   ├── toLocaleString（Intl 集成）
│   └── toJSON（JSON 序列化）
└── 工程实践
    ├── Polyfill（@js-temporal/polyfill）
    ├── 数据库存储策略
    ├── 序列化与反序列化
    └── 与 Date 互操作
```

---

## 2. 历史动机与技术演进

### 2.1 Date 对象的诞生（1995）

`Date` 由 Brendan Eich 在 1995 年实现，灵感来自 Java 1.0 的 `java.util.Date`。继承自 Java 的设计缺陷加上 JavaScript 自身的简化，导致一系列问题：

| 缺陷 | 表现 | 影响 |
| --- | --- | --- |
| 月份从 0 开始 | `new Date(2026, 0, 1)` 是 1 月 1 日 | 几乎所有初学者都踩过坑 |
| 可变性 | `setMonth()` 修改原对象 | 难以追踪状态，易出 bug |
| 时区支持差 | 仅支持 UTC 与浏览器本地时区 | 跨时区应用需手动计算 |
| 不区分日期与时刻 | `Date` 同时表示"2026-06-14"与"2026-06-14T10:30:00Z" | 语义混乱 |
| 解析依赖实现 | `new Date('2026-06-14')` 在不同浏览器结果不同 | 跨浏览器行为不一致 |
| 无 Duration 类型 | 时间段需用毫秒数表示 | 单位换算易错 |
| 无历法支持 | 仅公历（格里高利历） | 国际化困难 |
| 2038 年问题 | 32 位系统 `getTime()` 在 2038 年溢出 | 部分嵌入式系统受影响 |

### 2.2 失败的修复尝试

历史上多次尝试修复 Date，均未成功：

| 时间 | 尝试 | 结果 |
| --- | --- | --- |
| 2011 | Moment.js | 流行但未标准化，仍可变，体积大 |
| 2014 | dojo.date | 仅 dojo 生态使用 |
| 2015 | ES6 修改 Date 解析 | 部分修复，未解决根本问题 |
| 2016 | date-fns | 函数式库，但仍基于 Date |
| 2017 | Luxon（Moment.js 作者） | 改进版，基于 Intl API，但仍非原生 |
| 2018 | Day.js | 轻量替代，API 与 Moment 一致 |

### 2.3 Temporal 提案时间线

| 时间 | 事件 | 影响 |
| --- | --- | --- |
| 2017-05 | Maggie Johnson-Pint 发起提案 | 旨在彻底替代 Date |
| 2018-11 | Stage 1，初步规范 | 确定类型分离思路 |
| 2020-03 | Stage 2，API 设计完成 | 命名为 Temporal（区别于 Date） |
| 2021-09 | Stage 3，等待实现反馈 | polyfill 发布 |
| 2023-11 | V8 开始实现 | Chrome 119+ 部分支持 |
| 2024-06 | Stage 4，进入 ES2025 | 正式标准化 |
| 2026-01 | 主流浏览器全面支持 | Chrome/Edge/Firefox/Safari 全覆盖 |

### 2.4 关键人物与论文

- **Maggie Johnson-Pint**：Moment.js 核心贡献者，Temporal 提案 champion。
- **Philipp Dunkel**： polyfill 主要实现者，规范文本撰写人。
- **Jase W.**：IANA tzdata 维护者之一。
- **Ujjwal Sharma**：TC39 编辑，Intl 与 Temporal 规范协调人。

> **学术溯源**：时间表示的复杂性在计算机科学中有悠久研究历史。相关经典论文与文档：
>
> - Date, C. J. (2003). *An Introduction to Database Systems*. Addison-Wesley.——第 22 章讨论时间数据库设计。
> - Kuhn, M. (2001). *A Summary of the International Standard Date and Time Notation*.——ISO 8601 标准的权威解读。
> - Clive Feather (1999). *Time and the VMS Operating System*.——时区与 DST 的工程化讨论。

---

## 3. 形式化定义

### 3.1 绝对时刻的数学模型

绝对时刻（Instant）是时间轴上的一个点，与历法、时区无关。形式化定义为 UNIX 时间戳（纳秒精度）：

$$
\text{Instant} = \mathbb{Z}_{\text{nanoseconds since epoch}}
$$

其中 epoch 为 1970-01-01T00:00:00Z（UTC）。Instant 的范围：

$$
-8.64 \times 10^{19} \leq \text{Instant} \leq 8.64 \times 10^{19}
$$

约对应 ±275,760 年。

### 3.2 时区与墙上时钟时间的关系

墙上时钟时间（Wall Time）由 Instant + 时区规则决定：

$$
\text{WallTime}(i, tz) = \text{convert}(i, tz)
$$

其中 $tz$ 是 IANA 时区标识符（如 `America/New_York`），转换函数依赖 tzdata 中的历史规则。

$$
\text{ZonedDateTime} = (\text{Instant}, \text{TimeZone}, \text{Calendar})
$$

### 3.3 Plain 类型的语义

`PlainDateTime` 等类型表示"墙上看到的日期时间"，无时区关联：

$$
\text{PlainDateTime} = (\text{Year}, \text{Month}, \text{Day}, \text{Hour}, \text{Minute}, \text{Second}, \text{Subsecond}, \text{Calendar})
$$

这类类型用于：

- 生日（"6 月 14 日"，与所在地无关）
- 日历事件（"每天 09:00 开会"）
- 历史日期（"1066 年 10 月 14 日"，无精确时刻）

### 3.4 Duration 的形式化定义

Duration 是带单位的"时间段"：

$$
\text{Duration} = (y, m, w, d, h, \min, s, \text{ms}, \mu s, n s)
$$

注意 Duration 不可简单换算为纳秒——"1 个月"的天数取决于具体月份（28-31 天）：

$$
\text{daysInMonth}(y, m) = \begin{cases}
31 & \text{if } m \in \{1,3,5,7,8,10,12\} \\
30 & \text{if } m \in \{4,6,9,11\} \\
29 & \text{if } m = 2 \land \text{isLeapYear}(y) \\
28 & \text{otherwise}
\end{cases}
$$

其中闰年判断：

$$
\text{isLeapYear}(y) = (y \bmod 4 = 0 \land y \bmod 100 \neq 0) \lor y \bmod 400 = 0
$$

### 3.5 DST 转换的形式化

夏令时（Daylight Saving Time）转换时，墙上时钟时间出现歧义或缺失：

$$
\text{WallTime}^{-1}(p, tz) = \begin{cases}
\{i\} & \text{正常情况} \\
\{i_1, i_2\} & \text{秋季回拨（同一时刻出现两次）} \\
\emptyset & \text{春季前拨（时刻不存在）}
\end{cases}
$$

例如，美国东部时间 2026-03-08 02:30 不存在（春季前拨跳过），而 2026-11-01 01:30 出现两次（秋季回拨）。

### 3.6 时区偏移与标识符

每个时区有两个标识：

- **IANA 名称**：`America/New_York`、`Asia/Shanghai`、`Europe/London`，含完整历史规则。
- **UTC 偏移量**：`-05:00`、`+08:00`、`+00:00`，仅当前偏移。

$$
\text{offset}(tz, i) = \text{WallTime}(i, tz) - \text{WallTime}(i, \text{UTC})
$$

偏移量随时间变化（DST 切换、政治调整），故不能作为唯一标识。

---

## 4. Temporal 类型详解

### 4.1 Temporal.Now：当前时刻工厂

```javascript
// 获取当前时刻（不同精度的入口）
const now = Temporal.Now.instant();           // Instant（UTC 纳秒）
const zdtNow = Temporal.Now.zonedDateTimeISO(); // ZonedDateTime（本地时区 + ISO 历）
const pdtNow = Temporal.Now.plainDateTimeISO(); // PlainDateTime（无时区）
const pdNow = Temporal.Now.plainDateISO();     // PlainDate
const ptNow = Temporal.Now.plainTimeISO();     // PlainTime

// 指定时区与历法
const nyNow = Temporal.Now.zonedDateTime('America/New_York', 'chinese');
const epochNanos = Temporal.Now.instant().epochNanoseconds;  // BigInt
```

`Temporal.Now` 是工厂对象，所有方法都返回当前时刻，不能 `new` 实例化。

### 4.2 Temporal.Instant：绝对时刻

```javascript
// 创建方式
const instant1 = Temporal.Instant.from('2026-07-20T10:30:00Z');  // 从 ISO 字符串
const instant2 = Temporal.Instant.fromEpochSeconds(1778129400);   // 从秒
const instant3 = Temporal.Instant.fromEpochMilliseconds(1778129400000);  // 从毫秒
const instant4 = Temporal.Instant.fromEpochNanoseconds(1778129400000000000n);  // 从纳秒 BigInt

// 属性
console.log(instant1.epochSeconds);           // 1778129400
console.log(instant1.epochMilliseconds);      // 1778129400000
console.log(instant1.epochNanoseconds);       // 1778129400000000000n

// 转换为其他类型
const zdt = instant1.toZonedDateTimeISO('Asia/Shanghai');
console.log(zdt.toString());
// '2026-07-20T18:30:00+08:00[Asia/Shanghai]'

// 比较
const a = Temporal.Instant.from('2026-01-01T00:00:00Z');
const b = Temporal.Instant.from('2027-01-01T00:00:00Z');
console.log(Temporal.Instant.compare(a, b));  // -1（a 早于 b）
console.log(a.equals(b));  // false
```

### 4.3 Temporal.ZonedDateTime：带时区与历法的完整日期时间

```javascript
// 创建方式
const zdt1 = Temporal.ZonedDateTime.from('2026-07-20T10:30:00[America/New_York]');
const zdt2 = Temporal.ZonedDateTime.from({
  year: 2026, month: 7, day: 20,
  hour: 10, minute: 30,
  timeZone: 'Asia/Shanghai',
  calendar: 'iso8601',
});

// 从 Instant 转换
const instant = Temporal.Instant.from('2026-07-20T02:30:00Z');
const zdt3 = instant.toZonedDateTimeISO('Asia/Shanghai');
console.log(zdt3.toString());
// '2026-07-20T10:30:00+08:00[Asia/Shanghai]'

// 属性
console.log(zdt3.year);        // 2026
console.log(zdt3.month);       // 7
console.log(zdt3.day);         // 20
console.log(zdt3.hour);        // 10
console.log(zdt3.minute);      // 30
console.log(zdt3.timeZoneId);  // 'Asia/Shanghai'
console.log(zdt3.calendarId);  // 'iso8601'
console.log(zdt3.offset);      // '+08:00'

// 时区转换
const nyZdt = zdt3.withTimeZone('America/New_York');
console.log(nyZdt.toString());
// '2026-07-19T22:30:00-04:00[America/New_York]'（美东夏令时 UTC-4）

// 历法转换
const chineseZdt = zdt3.withCalendar('chinese');
console.log(chineseZdt.eraYear);  // 农历年份
console.log(chineseZdt.month);    // 农历月份
```

#### DST 歧义处理

```javascript
// 美东 2026-03-08 02:30 不存在（春季前拨）
try {
  const nonexistent = Temporal.ZonedDateTime.from(
    '2026-03-08T02:30:00[America/New_York]',
    { disambiguation: 'reject' }
  );
} catch (e) {
  console.log(e.message);  // 不存在的时刻
}

// 三种歧义处理策略
const compatible = Temporal.ZonedDateTime.from(
  '2026-03-08T02:30:00[America/New_York]',
  { disambiguation: 'compatible' }  // 默认，向前调整
);
console.log(compatible.toString());  // 2026-03-08T03:30:00-04:00

const earlier = Temporal.ZonedDateTime.from(
  '2026-03-08T02:30:00[America/New_York]',
  { disambiguation: 'earlier' }  // 取更早的解释
);
console.log(earlier.toString());  // 2026-03-08T01:30:00-05:00

const later = Temporal.ZonedDateTime.from(
  '2026-03-08T02:30:00[America/New_York]',
  { disambiguation: 'later' }  // 取更晚的解释
);
console.log(later.toString());  // 2026-03-08T03:30:00-04:00
```

### 4.4 Temporal.PlainDateTime：无时区的墙上时间

```javascript
// 创建
const pdt = Temporal.PlainDateTime.from('2026-07-20T10:30:00');
const pdt2 = Temporal.PlainDateTime.from({
  year: 2026, month: 7, day: 20,
  hour: 10, minute: 30, second: 0,
});

// 属性
console.log(pdt.year);     // 2026
console.log(pdt.month);    // 7
console.log(pdt.day);      // 20
console.log(pdt.hour);     // 10
console.log(pdt.minute);   // 30

// 与 ZonedDateTime 互转
const zdt = pdt.toZonedDateTime('America/New_York');
const pdtBack = zdt.toPlainDateTime();

// 应用场景：生日、日历事件
const birthday = Temporal.PlainDate.from('1990-06-14');
console.log(birthday instanceof Temporal.PlainDate);  // true
```

### 4.5 Temporal.PlainDate 与 PlainTime

```javascript
// PlainDate：纯日期
const date = Temporal.PlainDate.from('2026-07-20');
console.log(date.year);        // 2026
console.log(date.month);       // 7
console.log(date.day);         // 20
console.log(date.dayOfWeek);   // 1（周一，1-7）
console.log(date.dayOfYear);   // 201
console.log(date.daysInMonth); // 31
console.log(date.daysInYear);  // 365
console.log(date.inLeapYear);  // false

// PlainTime：纯时间
const time = Temporal.PlainTime.from('10:30:45.123');
console.log(time.hour);          // 10
console.log(time.minute);        // 30
console.log(time.second);        // 45
console.log(time.millisecond);   // 123

// 从 PlainDateTime 提取
const pdt = Temporal.PlainDateTime.from('2026-07-20T10:30:45');
const datePart = pdt.toPlainDate();
const timePart = pdt.toPlainTime();
```

### 4.6 Temporal.Duration：时间段

```javascript
// 创建
const duration1 = Temporal.Duration.from({ hours: 2, minutes: 30 });
const duration2 = Temporal.Duration.from('PT2H30M');  // ISO 8601 duration 格式
const duration3 = Temporal.Duration.from({
  years: 1, months: 2, weeks: 3, days: 4,
  hours: 5, minutes: 6, seconds: 7,
});

// 属性
console.log(duration1.hours);    // 2
console.log(duration1.minutes);  // 30

// 运算
const added = duration1.add(Temporal.Duration.from({ hours: 1 }));
console.log(added.hours);  // 3

// 单位换算
const totalHours = duration1.total({ unit: 'hour' });
console.log(totalHours);  // 2.5

// 与日期运算
const date = Temporal.PlainDate.from('2026-07-20');
const weekLater = date.add({ weeks: 1 });
console.log(weekLater.toString());  // '2026-07-27'

// 月份运算（考虑天数差异）
const jan31 = Temporal.PlainDate.from('2026-01-31');
const feb28 = jan31.add({ months: 1 });
console.log(feb28.toString());  // '2026-02-28'（2 月无 31 日，取月末）

// 差值计算
const d1 = Temporal.PlainDate.from('2026-01-01');
const d2 = Temporal.PlainDate.from('2026-12-31');
const diff = d1.until(d2);
console.log(diff.toString());  // 'P364D'
console.log(diff.total({ unit: 'day' }));  // 364
```

### 4.7 Temporal.PlainYearMonth 与 PlainMonthDay

```javascript
// PlainYearMonth：年-月（用于月份规划）
const ym = Temporal.PlainYearMonth.from('2026-07');
console.log(ym.year);          // 2026
console.log(ym.month);         // 7
console.log(ym.daysInMonth);   // 31
console.log(ym.daysInYear);    // 365

// PlainMonthDay：月-日（用于生日、纪念日）
const birthday = Temporal.PlainMonthDay.from('06-14');
const thisYearBirthday = birthday.toPlainDate({ year: 2026 });
console.log(thisYearBirthday.toString());  // '2026-06-14'

// 应用：判断生日是周几
const weekday = thisYearBirthday.dayOfWeek;
console.log(`2026 年生日是周${weekday}`);  // 周日（7）
```

---

## 5. 字符串格式与解析

### 5.1 ISO 8601 基础语法

```
2026-07-20T10:30:45.123456789+08:00[America/Shanghai][u-ca=chinese]
└──date──┘└────────time────────┘└offset┘└──timezone──┘└─calendar──┘
```

各部分可选性：

| 部分 | 必需 | 示例 |
| --- | --- | --- |
| 日期 | 是（除非仅有时间） | `2026-07-20` |
| 时间 | 否 | `T10:30:45` |
| 小数秒 | 否（纳秒精度） | `.123456789` |
| 偏移量 | Instant/ZonedDateTime 必需 | `+08:00` 或 `Z` |
| 时区方括号 | ZonedDateTime 必需 | `[America/New_York]` |
| 历法方括号 | 否（默认 iso8601） | `[u-ca=chinese]` |

### 5.2 解析与生成

```javascript
// 解析（自动检测类型）
const instant = Temporal.Instant.from('2026-07-20T02:30:00Z');
const zdt = Temporal.ZonedDateTime.from('2026-07-20T10:30:00+08:00[Asia/Shanghai]');
const pd = Temporal.PlainDate.from('2026-07-20');
const pt = Temporal.PlainTime.from('10:30:00');
const dur = Temporal.Duration.from('PT2H30M');

// 生成字符串
console.log(instant.toString());  // '2026-07-20T02:30:00Z'
console.log(zdt.toString());      // '2026-07-20T10:30:00+08:00[Asia/Shanghai]'
console.log(pd.toString());       // '2026-07-20'
console.log(pt.toString());       // '10:30:00'
console.log(dur.toString());      // 'PT2H30M'

// 自定义输出
console.log(zdt.toString({
  timeZoneName: 'never',  // 不显示时区方括号
  offset: 'never',        // 不显示偏移量
}));  // '2026-07-20T10:30:00'

console.log(zdt.toString({
  fractionalSecondDigits: 3,  // 显示 3 位小数秒
}));  // '2026-07-20T10:30:00.000+08:00[Asia/Shanghai]'
```

### 5.3 解析选项

```javascript
// 严格模式（默认）
const strict = Temporal.PlainDate.from('2026-02-31', { overflow: 'reject' });
// 抛出 RangeError（2 月无 31 日）

// 溢出处理
const constrain = Temporal.PlainDate.from('2026-02-31', { overflow: 'constrain' });
console.log(constrain.toString());  // '2026-02-28'（截断到有效日期）

// 与 Date 互操作
const legacyDate = new Date('2026-07-20T10:30:00Z');
const instant = legacyDate.toTemporalInstant();
console.log(instant.toString());  // '2026-07-20T10:30:00Z'

// 反向转换
const zdt = Temporal.ZonedDateTime.from('2026-07-20T10:30:00[Asia/Shanghai]');
const legacy = new Date(zdt.epochMilliseconds);
```

---

## 6. 时区与夏令时

### 6.1 IANA 时区数据库

```javascript
// 获取所有支持时区
const timeZones = Temporal.TimeZone.getAvailable timeZoneId();
// ['UTC', 'Africa/Abidjan', 'Africa/Accra', ..., 'America/New_York', ..., 'Asia/Shanghai', ...]

// 时区对象操作
const tz = Temporal.TimeZone.from('America/New_York');
const instant = Temporal.Instant.from('2026-07-20T10:30:00Z');
console.log(tz.getOffsetNanosecondsFor(instant));  // -14400000000000（-4 小时，夏令时）
console.log(tz.getOffsetStringFor(instant));        // '-04:00'

// 夏令时检测
const summer = Temporal.ZonedDateTime.from('2026-07-01T12:00:00[America/New_York]');
const winter = Temporal.ZonedDateTime.from('2026-01-01T12:00:00[America/New_York]');
console.log(summer.offset);   // '-04:00'（EDT，夏令时）
console.log(winter.offset);   // '-05:00'（EST，标准时）
```

### 6.2 DST 转换的边界情况

```javascript
// 春季前拨：2026-03-08 02:00-03:00 不存在
const springForward = Temporal.ZonedDateTime.from(
  '2026-03-08T02:30:00[America/New_York]',
  { disambiguation: 'later' }  // 取 03:30
);
console.log(springForward.toString());  // '2026-03-08T03:30:00-04:00'

// 秋季回拨：2026-11-01 01:00-02:00 出现两次
const fallBack1 = Temporal.ZonedDateTime.from(
  '2026-11-01T01:30:00[America/New_York]',
  { disambiguation: 'earlier' }
);
const fallBack2 = Temporal.ZonedDateTime.from(
  '2026-11-01T01:30:00[America/New_York]',
  { disambiguation: 'later' }
);
console.log(fallBack1.offset);  // '-04:00'（EDT）
console.log(fallBack2.offset);  // '-05:00'（EST）
console.log(fallBack1.toInstant().epochSeconds);
console.log(fallBack2.toInstant().epochSeconds);
// 两者相差 3600 秒（1 小时）

// 持续时间在 DST 切换日的差异
const start = Temporal.ZonedDateTime.from('2026-03-07T12:00:00[America/New_York]');
const end = Temporal.ZonedDateTime.from('2026-03-08T12:00:00[America/New_York]');
const diff = start.until(end);
console.log(diff.total({ unit: 'hour' }));  // 23（因前拨少了 1 小时）
```

### 6.3 时区转换实战

```javascript
// 全球团队会议时间显示
function formatMeetingTime(instantISO, timezones) {
  const instant = Temporal.Instant.from(instantISO);
  return timezones.map(tz => {
    const zdt = instant.toZonedDateTimeISO(tz);
    return {
      timezone: tz,
      localTime: zdt.toPlainDateTime().toString(),
      offset: zdt.offset,
    };
  });
}

const meeting = '2026-07-20T14:00:00Z';  // UTC 14:00
const zones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Asia/Shanghai', 'Europe/London'];
console.table(formatMeetingTime(meeting, zones));
// | UTC                  | 2026-07-20T14:00:00 | +00:00 |
// | America/New_York     | 2026-07-20T10:00:00 | -04:00 |
// | America/Los_Angeles  | 2026-07-20T07:00:00 | -07:00 |
// | Asia/Shanghai        | 2026-07-20T22:00:00 | +08:00 |
// | Europe/London        | 2026-07-20T15:00:00 | +01:00 |
```

---

## 7. 历法支持

### 7.1 内置历法

```javascript
// 公历（默认）
const iso = Temporal.PlainDate.from('2026-07-20');
console.log(iso.calendarId);  // 'iso8601'

// 中国农历
const chinese = Temporal.PlainDate.from('2026-07-20').withCalendar('chinese');
console.log(chinese.era);          // 'chinese'
console.log(chinese.eraYear);      // 农历年份
console.log(chinese.month);        // 农历月份
console.log(chinese.day);          // 农历日

// 伊斯兰历
const islamic = Temporal.PlainDate.from('2026-07-20').withCalendar('islamic');
console.log(islamic.year);         // 伊斯兰历年份

// 希伯来历
const hebrew = Temporal.PlainDate.from('2026-07-20').withCalendar('hebrew');
console.log(hebrew.year);          // 希伯来历年份

// 日本年号历
const japanese = Temporal.PlainDate.from('2026-07-20').withCalendar('japanese');
console.log(japanese.era);         // 'reiwa'
console.log(japanese.eraYear);     // 8（令和 8 年）
```

### 7.2 历法转换的语义

```javascript
// 同一时刻在不同历法下的表示
const zdt = Temporal.ZonedDateTime.from('2026-07-20T10:30:00[Asia/Shanghai]');
const inChinese = zdt.withCalendar('chinese');
const inHebrew = zdt.withCalendar('hebrew');
const inIslamic = zdt.withCalendar('islamic');

// 注意：withCalendar 不改变 Instant，只改变历法表示
console.log(zdt.toInstant().epochSeconds === inChinese.toInstant().epochSeconds);  // true

// 历法影响运算（农历月份天数不同）
const chineseDate = Temporal.PlainDate.from({
  calendar: 'chinese',
  year: 2026, month: 6, day: 15,
});
console.log(chineseDate.daysInMonth);  // 农历 6 月天数（29 或 30）

// 公历与农历转换
function gregorianToChineseLunar(year, month, day) {
  const gregorian = Temporal.PlainDate.from(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
  const chinese = gregorian.withCalendar('chinese');
  return {
    era: chinese.era,
    year: chinese.eraYear,
    month: chinese.month,
    day: chinese.day,
    isLeapMonth: chinese.monthCode.endsWith('L'),  // 闰月标识
  };
}
console.log(gregorianToChineseLunar(2026, 7, 20));
```

---

## 8. 运算与比较

### 8.1 加减运算

```javascript
// PlainDate 加减
const date = Temporal.PlainDate.from('2026-07-20');
const weekLater = date.add({ weeks: 1 });        // 2026-07-27
const monthLater = date.add({ months: 1 });      // 2026-08-20
const yearLater = date.add({ years: 1 });        // 2027-07-20

// 边界处理：1 月 31 日加 1 个月
const jan31 = Temporal.PlainDate.from('2026-01-31');
const feb = jan31.add({ months: 1 });
console.log(feb.toString());  // '2026-02-28'（默认 constrain）

// 拒绝溢出
const strict = jan31.add({ months: 1 }, { overflow: 'reject' });  // 抛 RangeError

// 减法
const earlier = date.subtract({ days: 10 });
console.log(earlier.toString());  // '2026-07-10'

// Duration 加法
const pdt = Temporal.PlainDateTime.from('2026-07-20T10:30:00');
const dur = Temporal.Duration.from({ hours: 2, minutes: 45 });
const result = pdt.add(dur);
console.log(result.toString());  // '2026-07-20T13:15:00'
```

### 8.2 until 与 since

```javascript
// 计算两个日期的差值
const d1 = Temporal.PlainDate.from('2026-01-01');
const d2 = Temporal.PlainDate.from('2026-12-31');
const diff = d1.until(d2);
console.log(diff.toString());  // 'P364D'
console.log(diff.days);        // 364

// 自定义输出单位
const inMonths = d1.until(d2, { largestUnit: 'month' });
console.log(inMonths.toString());  // 'P11M30D'

const inWeeks = d1.until(d2, { largestUnit: 'week' });
console.log(inWeeks.toString());  // 'P52W0D'

// since 是 until 的反向
const since = d2.since(d1);
console.log(since.toString());  // 'P364D'

// ZonedDateTime 的 until（考虑 DST）
const ny1 = Temporal.ZonedDateTime.from('2026-03-07T12:00:00[America/New_York]');
const ny2 = Temporal.ZonedDateTime.from('2026-03-08T12:00:00[America/New_York]');
const nyDiff = ny1.until(ny2);
console.log(nyDiff.total({ unit: 'hour' }));  // 23（DST 切换日）
```

### 8.3 比较与排序

```javascript
// Instant 比较
const a = Temporal.Instant.from('2026-01-01T00:00:00Z');
const b = Temporal.Instant.from('2027-01-01T00:00:00Z');
console.log(Temporal.Instant.compare(a, b));  // -1
console.log(Temporal.Instant.compare(b, a));  // 1
console.log(Temporal.Instant.compare(a, a));  // 0
console.log(a.equals(b));  // false

// 排序
const instants = [
  Temporal.Instant.from('2026-03-01T00:00:00Z'),
  Temporal.Instant.from('2026-01-01T00:00:00Z'),
  Temporal.Instant.from('2026-02-01T00:00:00Z'),
];
instants.sort(Temporal.Instant.compare);
console.log(instants.map(i => i.toString()));

// PlainDate 比较
const dates = [
  Temporal.PlainDate.from('2026-12-31'),
  Temporal.PlainDate.from('2026-01-01'),
  Temporal.PlainDate.from('2026-06-15'),
];
dates.sort(Temporal.PlainDate.compare);
console.log(dates.map(d => d.toString()));
```

### 8.4 取整（round）

```javascript
// 时间取整
const pdt = Temporal.PlainDateTime.from('2026-07-20T10:37:42');
const rounded = pdt.round({ smallestUnit: 'minute', roundingMode: 'halfExpand' });
console.log(rounded.toString());  // '2026-07-20T10:38:00'

// Duration 取整
const dur = Temporal.Duration.from({ hours: 2, minutes: 35, seconds: 30 });
const roundedDur = dur.round({ smallestUnit: 'minute', roundingMode: 'halfExpand' });
console.log(roundedDur.toString());  // 'PT2H36M'

// 取整到 15 分钟
const time = Temporal.PlainTime.from('10:37:42');
const quarterHour = time.round({
  smallestUnit: 'minute',
  roundingIncrement: 15,
  roundingMode: 'halfExpand',
});
console.log(quarterHour.toString());  // '10:45:00'
```

---

## 9. 格式化与国际化

### 9.1 toString 与自定义输出

```javascript
const zdt = Temporal.ZonedDateTime.from('2026-07-20T10:30:45.123456789[Asia/Shanghai]');

// 默认输出（完整 ISO 8601）
console.log(zdt.toString());
// '2026-07-20T10:30:45.123456789+08:00[Asia/Shanghai]'

// 控制各部分显示
console.log(zdt.toString({
  timeZoneName: 'never',         // 不显示时区方括号
  offset: 'never',               // 不显示偏移量
  fractionalSecondDigits: 3,     // 3 位小数秒
}));  // '2026-07-20T10:30:45.123'

// 仅日期
console.log(zdt.toPlainDate().toString());  // '2026-07-20'

// 仅时间
console.log(zdt.toPlainTime().toString());  // '10:30:45.123456789'
```

### 9.2 toLocaleString 与 Intl 集成

```javascript
const zdt = Temporal.ZonedDateTime.from('2026-07-20T10:30:00[Asia/Shanghai]');

// 中文长格式
console.log(zdt.toLocaleString('zh-CN', {
  dateStyle: 'full',
  timeStyle: 'long',
  timeZone: 'Asia/Shanghai',
}));
// '2026年7月20日星期一 中国标准时间 上午10:30:00'

// 英文短格式
console.log(zdt.toLocaleString('en-US', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/New_York',
}));
// '7/19/26, 10:30 PM'（美东时间）

// 自定义格式
console.log(zdt.toLocaleString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
  timeZone: 'Europe/London',
}));
// 'Sunday, July 20, 2026, 03:30 AM BST'
```

### 9.3 Intl.DateTimeFormat 与 Temporal

```javascript
// 创建 DateTimeFormat 实例
const fmt = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'long',
  timeStyle: 'medium',
  timeZone: 'Asia/Tokyo',
  calendar: 'japanese',
});

const zdt = Temporal.ZonedDateTime.from('2026-07-20T10:30:00[UTC]');
console.log(fmt.format(zdt));  // '令和8年7月20日 19:30:00'

// formatToParts 获取结构化部件
const parts = fmt.formatToParts(zdt);
for (const part of parts) {
  console.log(`${part.type}: ${part.value}`);
}
// era: 令和
// year: 8
// month: 7
// day: 20
// hour: 19
// minute: 30
// second: 00
```

### 9.4 JSON 序列化

```javascript
// toJSON 返回 ISO 8601 字符串
const zdt = Temporal.ZonedDateTime.from('2026-07-20T10:30:00[Asia/Shanghai]');
console.log(JSON.stringify({ event: 'meeting', time: zdt }));
// '{"event":"meeting","time":"2026-07-20T10:30:00+08:00[Asia/Shanghai]"}'

// 注意：Instant 的 toJSON 输出 Z 后缀
const instant = Temporal.Instant.from('2026-07-20T02:30:00Z');
console.log(instant.toJSON());  // '2026-07-20T02:30:00Z'

// PlainDate 的 toJSON 仅日期
const date = Temporal.PlainDate.from('2026-07-20');
console.log(date.toJSON());  // '2026-07-20'
```

---

## 10. 工程实践

### 10.1 Polyfill 使用

```javascript
// 截至 2026 年，部分旧环境仍需 polyfill
// 安装：npm install @js-temporal/polyfill
import { Temporal } from '@js-temporal/polyfill';

// 全局注入
import '@js-temporal/polyfill/auto';

// 现在可全局使用 Temporal
const now = Temporal.Now.instant();
```

### 10.2 数据库存储策略

```javascript
/**
 * 数据库时间存储最佳实践
 * 策略：始终以 Temporal.Instant（UTC）存储，展示层转换为本地时区
 */
class TimeStorage {
  // 序列化为 ISO 8601 字符串
  static serialize(instant) {
    return instant.toString();  // '2026-07-20T10:30:00Z'
  }

  // 反序列化
  static deserialize(isoString) {
    return Temporal.Instant.from(isoString);
  }

  // 存储到数据库（BIGINT 纳秒时间戳）
  static toBigInt(instant) {
    return instant.epochNanoseconds;  // BigInt
  }

  static fromBigInt(nanos) {
    return Temporal.Instant.fromEpochNanoseconds(nanos);
  }
}

// 应用示例
const eventTime = Temporal.Instant.from('2026-07-20T10:30:00Z');
const stored = TimeStorage.serialize(eventTime);
// 数据库存储 stored 字符串或 BigInt

// 查询时反序列化并转换为用户时区展示
const userTimezone = 'America/New_York';
const loaded = TimeStorage.deserialize(stored);
const display = loaded.toZonedDateTimeISO(userTimezone);
console.log(display.toLocaleString('en-US'));
```

### 10.3 定时任务调度

```javascript
/**
 * 跨时区定时任务调度器
 * 正确处理 DST 切换与用户偏好
 */
class TimezoneAwareScheduler {
  constructor() {
    this.jobs = [];
  }

  /**
   * 添加每日任务
   * @param {string} localTime - 本地时间 'HH:MM'
   * @param {string} timezone - IANA 时区
   * @param {Function} callback - 回调
   */
  scheduleDaily(localTime, timezone, callback) {
    const [hour, minute] = localTime.split(':').map(Number);
    const job = {
      hour, minute, timezone, callback,
      nextRun: this._calculateNextRun(hour, minute, timezone),
    };
    this.jobs.push(job);
  }

  _calculateNextRun(hour, minute, timezone) {
    const now = Temporal.Now.zonedDateTimeISO(timezone);
    let candidate = now.with({
      hour, minute, second: 0, millisecond: 0,
    });

    // 如果今天时间已过，安排到明天
    if (Temporal.ZonedDateTime.compare(candidate, now) <= 0) {
      candidate = candidate.add({ days: 1 });
    }

    return candidate;
  }

  async run() {
    const now = Temporal.Now.instant();
    for (const job of this.jobs) {
      if (Temporal.Instant.compare(job.nextRun.toInstant(), now) <= 0) {
        try {
          await job.callback();
        } catch (e) {
          console.error(`任务失败: ${e.message}`);
        }
        // 重新计算下次运行时间
        job.nextRun = this._calculateNextRun(job.hour, job.minute, job.timezone);
      }
    }
  }
}

// 应用：每日报告
const scheduler = new TimezoneAwareScheduler();
scheduler.scheduleDaily('09:00', 'Asia/Shanghai', async () => {
  console.log('生成上海早间报告');
});
scheduler.scheduleDaily('09:00', 'America/New_York', async () => {
  console.log('生成纽约早间报告');
});
```

### 10.4 倒计时与计时器

```javascript
/**
 * 精确倒计时
 * 使用 Temporal.Instant 避免系统时钟漂移
 */
class Countdown {
  constructor(targetInstant) {
    this.target = Temporal.Instant.from(targetInstant);
    this.timerId = null;
  }

  start(onTick) {
    const tick = () => {
      const now = Temporal.Now.instant();
      const remaining = now.until(this.target, { smallestUnit: 'second' });

      if (remaining.sign <= 0) {
        onTick(Temporal.Duration.from({ seconds: 0 }));
        this.stop();
        return;
      }

      onTick(remaining);
      this.timerId = setTimeout(tick, 1000);
    };
    tick();
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

// 应用：新年倒计时
const newYear = '2027-01-01T00:00:00+08:00[Asia/Shanghai]';
const countdown = new Countdown(newYear);
countdown.start((remaining) => {
  console.log(`距离新年还有: ${remaining.toLocaleString()}`);
});
```

### 10.5 工作日计算

```javascript
/**
 * 工作日计算工具
 * 跳过周末与自定义节假日
 */
class BusinessDayCalculator {
  constructor(holidays = []) {
    this.holidays = new Set(holidays.map(d => d.toString()));
  }

  /**
   * 添加工作日
   * @param {Temporal.PlainDate} start - 起始日期
   * @param {number} days - 工作日数
   * @returns {Temporal.PlainDate}
   */
  addBusinessDays(start, days) {
    let current = start;
    let added = 0;

    while (added < days) {
      current = current.add({ days: 1 });
      if (this._isBusinessDay(current)) {
        added++;
      }
    }
    return current;
  }

  _isBusinessDay(date) {
    // 周六（6）周日（7）非工作日
    if (date.dayOfWeek === 6 || date.dayOfWeek === 7) return false;
    // 节假日
    if (this.holidays.has(date.toString())) return false;
    return true;
  }

  /**
   * 计算两个日期间的工作日数
   */
  businessDaysBetween(start, end) {
    let count = 0;
    let current = start;

    while (current < end) {
      current = current.add({ days: 1 });
      if (this._isBusinessDay(current)) count++;
    }
    return count;
  }
}

// 应用
const holidays = [
  Temporal.PlainDate.from('2026-01-01'),  // 元旦
  Temporal.PlainDate.from('2026-02-17'),  // 春节
  Temporal.PlainDate.from('2026-05-01'),  // 劳动节
];
const calc = new BusinessDayCalculator(holidays);
const start = Temporal.PlainDate.from('2026-07-20');
const tenBusinessDaysLater = calc.addBusinessDays(start, 10);
console.log(tenBusinessDaysLater.toString());
```

---

## 11. 案例研究

### 11.1 案例 1：日历应用的事件存储

```javascript
/**
 * 日历事件模型
 * 支持"绝对事件"（会议）与"日历事件"（生日）
 */
class CalendarEvent {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.type = data.type;  // 'instant' 或 'plain'

    if (data.type === 'instant') {
      // 绝对时刻事件：跨时区参与者共享
      this.startTime = Temporal.Instant.from(data.startTime);
      this.endTime = Temporal.Instant.from(data.endTime);
    } else {
      // 日历事件：与所在地无关（生日、纪念日）
      this.startDate = Temporal.PlainDate.from(data.startDate);
      this.endDate = Temporal.PlainDate.from(data.endDate);
    }
  }

  // 检查事件在指定时区的当前是否进行中
  isOngoing(timezone) {
    if (this.type !== 'instant') {
      const today = Temporal.Now.plainDateISO(timezone);
      return Temporal.PlainDate.compare(this.startDate, today) <= 0 &&
             Temporal.PlainDate.compare(today, this.endDate) <= 0;
    }

    const now = Temporal.Now.instant();
    return Temporal.Instant.compare(this.startTime, now) <= 0 &&
           Temporal.Instant.compare(now, this.endTime) < 0;
  }

  // 在指定时区格式化
  format(timezone) {
    if (this.type === 'instant') {
      const zdt = this.startTime.toZonedDateTimeISO(timezone);
      return `${this.title}: ${zdt.toLocaleString('zh-CN')}`;
    }
    return `${this.title}: ${this.startDate.toLocaleString('zh-CN', { dateStyle: 'long' })}`;
  }
}

// 应用
const meeting = new CalendarEvent({
  id: 1,
  title: '全球团队会议',
  type: 'instant',
  startTime: '2026-07-20T14:00:00Z',
  endTime: '2026-07-20T15:00:00Z',
});

console.log(meeting.format('Asia/Shanghai'));
console.log(meeting.format('America/New_York'));

const birthday = new CalendarEvent({
  id: 2,
  title: 'Alice 生日',
  type: 'plain',
  startDate: '2026-06-14',
  endDate: '2026-06-14',
});
console.log(birthday.format('UTC'));
```

### 11.2 案例 2：跨时区航班调度

```javascript
/**
 * 航班时刻表
 * 处理跨时区起降、飞行时长计算
 */
class Flight {
  constructor(data) {
    this.flightNumber = data.flightNumber;
    this.departure = Temporal.ZonedDateTime.from(data.departure);
    this.arrival = Temporal.ZonedDateTime.from(data.arrival);
  }

  // 飞行时长（考虑 DST 与时区差异）
  flightDuration() {
    return this.departure.until(this.arrival);
  }

  // 跨越的时区数
  timezoneDifference() {
    const depOffset = this.departure.offsetNanoseconds;
    const arrOffset = this.arrival.offsetNanoseconds;
    return (arrOffset - depOffset) / 3.6e12;  // 转为小时
  }

  // 友好显示
  summary() {
    const duration = this.flightDuration();
    const tzDiff = this.timezoneDifference();
    return {
      flight: this.flightNumber,
      departure: this.departure.toLocaleString('en-US', {
        timeZone: this.departure.timeZoneId,
      }),
      arrival: this.arrival.toLocaleString('en-US', {
        timeZone: this.arrival.timeZoneId,
      }),
      duration: duration.toLocaleString('en-US'),
      timezoneShift: `${tzDiff > 0 ? '+' : ''}${tzDiff}h`,
    };
  }
}

// 应用：北京飞纽约
const flight = new Flight({
  flightNumber: 'CA981',
  departure: '2026-07-20T13:00:00[Asia/Shanghai]',
  arrival: '2026-07-20T14:30:00[America/New_York]',
});

console.log(flight.summary());
// 飞行时长约 13.5 小时（考虑 12 小时时差 + DST）
```

### 11.3 案例 3：订阅计费周期

```javascript
/**
 * SaaS 订阅计费引擎
 * 正确处理月度/年度续费、试用期、宽限期
 */
class SubscriptionBilling {
  constructor(config) {
    this.trialDays = config.trialDays || 14;
    this.graceDays = config.graceDays || 7;
    this.cycle = config.cycle || 'monthly';  // 'monthly' | 'yearly'
  }

  // 计算试用期结束日
  trialEnd(startDate) {
    const start = Temporal.PlainDate.from(startDate);
    return start.add({ days: this.trialDays });
  }

  // 计算下次续费日
  nextBillingDate(lastBilling, cycle = this.cycle) {
    const last = Temporal.PlainDate.from(lastBilling);
    if (cycle === 'monthly') {
      return last.add({ months: 1 });
    } else if (cycle === 'yearly') {
      return last.add({ years: 1 });
    }
  }

  // 检查订阅状态
  checkStatus(subscription) {
    const today = Temporal.Now.plainDateISO('UTC');
    const lastBilling = Temporal.PlainDate.from(subscription.lastBillingDate);
    const nextBilling = this.nextBillingDate(lastBilling);
    const graceEnd = nextBilling.add({ days: this.graceDays });

    if (Temporal.PlainDate.compare(today, nextBilling) < 0) {
      return { status: 'active', nextBilling };
    } else if (Temporal.PlainDate.compare(today, graceEnd) < 0) {
      return { status: 'grace', nextBilling, graceEnd };
    } else {
      return { status: 'expired', lastBilling };
    }
  }
}

// 应用
const billing = new SubscriptionBilling({
  trialDays: 14,
  graceDays: 7,
  cycle: 'monthly',
});

const subscription = {
  userId: 'user-123',
  lastBillingDate: '2026-06-20',
};

console.log(billing.checkStatus(subscription));
// 2026-07-20 时返回 active，nextBilling 为 2026-07-20
```

### 11.4 案例 4：日志时间戳聚合

```javascript
/**
 * 日志聚合工具
 * 按时间窗口分组日志事件
 */
class LogAggregator {
  constructor(windowSize = 'hour') {
    this.windowSize = windowSize;
  }

  aggregate(logs, timezone = 'UTC') {
    const groups = new Map();

    for (const log of logs) {
      const instant = Temporal.Instant.from(log.timestamp);
      const zdt = instant.toZonedDateTimeISO(timezone);

      // 按窗口大小分组
      let windowKey;
      if (this.windowSize === 'hour') {
        windowKey = zdt.toPlainDateTime().round({ smallestUnit: 'hour' }).toString();
      } else if (this.windowSize === 'day') {
        windowKey = zdt.toPlainDate().toString();
      }

      if (!groups.has(windowKey)) {
        groups.set(windowKey, []);
      }
      groups.get(windowKey).push(log);
    }

    return groups;
  }

  // 统计每窗口日志数
  stats(logs, timezone = 'UTC') {
    const groups = this.aggregate(logs, timezone);
    const result = [];
    for (const [window, entries] of groups) {
      result.push({
        window,
        count: entries.length,
        errorCount: entries.filter(l => l.level === 'error').length,
      });
    }
    return result.sort((a, b) => a.window.localeCompare(b.window));
  }
}

// 应用
const logs = [
  { timestamp: '2026-07-20T10:15:00Z', level: 'info', message: 'User login' },
  { timestamp: '2026-07-20T10:32:00Z', level: 'error', message: 'DB error' },
  { timestamp: '2026-07-20T11:05:00Z', level: 'info', message: 'User logout' },
  { timestamp: '2026-07-20T11:45:00Z', level: 'warn', message: 'Slow query' },
  { timestamp: '2026-07-20T12:10:00Z', level: 'error', message: 'API timeout' },
];

const aggregator = new LogAggregator('hour');
console.table(aggregator.stats(logs, 'Asia/Shanghai'));
```

### 11.5 案例 5：农历节日提醒

```javascript
/**
 * 中国农历节日计算
 * 基于 Temporal 的 chinese 历法
 */
class ChineseCalendar {
  // 公历日期转农历
  toLunar(gregorianDate) {
    const greg = Temporal.PlainDate.from(gregorianDate);
    const lunar = greg.withCalendar('chinese');
    return {
      year: lunar.eraYear,
      month: lunar.month,
      day: lunar.day,
      monthCode: lunar.monthCode,
      isLeapMonth: lunar.monthCode.endsWith('L'),
    };
  }

  // 农历转公历
  toGregorian(lunarYear, lunarMonth, lunarDay, isLeapMonth = false) {
    const monthCode = isLeapMonth
      ? `M${String(lunarMonth).padStart(2, '0')}L`
      : `M${String(lunarMonth).padStart(2, '0')}`;
    const lunar = Temporal.PlainDate.from({
      calendar: 'chinese',
      year: lunarYear,
      monthCode,
      day: lunarDay,
    });
    return lunar.withCalendar('iso8601');
  }

  // 判断是否春节（农历正月初一）
  isSpringFestival(gregorianDate) {
    const lunar = this.toLunar(gregorianDate);
    return lunar.month === 1 && lunar.day === 1 && !lunar.isLeapMonth;
  }

  // 判断是否中秋节（农历八月十五）
  isMidAutumnFestival(gregorianDate) {
    const lunar = this.toLunar(gregorianDate);
    return lunar.month === 8 && lunar.day === 15 && !lunar.isLeapMonth;
  }
}

// 应用：查找未来 10 年的春节公历日期
const cal = new ChineseCalendar();
const springFestivals = [];
for (let year = 2026; year <= 2035; year++) {
  // 农历正月初一通常在公历 1 月 21 日至 2 月 20 日之间
  for (let m = 1; m <= 2; m++) {
    for (let d = 20; d <= 28; d++) {
      const dateStr = `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      try {
        if (cal.isSpringFestival(dateStr)) {
          springFestivals.push({ year, date: dateStr });
        }
      } catch (e) { /* 日期无效跳过 */ }
    }
  }
}
console.table(springFestivals);
```

---

## 12. 对比分析

### 12.1 Temporal vs Date

| 特性 | Date | Temporal |
| --- | --- | --- |
| 类型数量 | 1（Date） | 8+（Instant、ZonedDateTime、PlainDateTime 等） |
| 可变性 | 可变（mutate-in-place） | 不可变 |
| 月份基数 | 0-11 | 1-12 |
| 时区支持 | 仅 UTC 与本地 | 完整 IANA 数据库 |
| 历法支持 | 仅公历 | 多种（chinese、hebrew 等） |
| 字符串解析 | 实现相关 | 严格 ISO 8601 |
| Duration | 无 | 有（Temporal.Duration） |
| 精度 | 毫秒 | 纳秒 |
| 2038 问题 | 32 位有 | 无（BigInt 纳秒） |
| 浏览器支持 | 全部 | ES2025+（旧环境需 polyfill） |

### 12.2 Temporal vs moment.js vs date-fns vs Luxon

| 特性 | Temporal | moment.js | date-fns | Luxon |
| --- | --- | --- | --- | --- |
| 原生支持 | 是（ES2025+） | 否（库） | 否（库） | 否（库） |
| 体积 | 0（内置） | 67KB | 5KB（按需） | 65KB |
| 不可变性 | 是 | 否 | 是 | 是 |
| 时区数据库 | IANA 内置 | 需 moment-timezone | 依赖 Intl | 内置 |
| 历法 | 多种 | 仅公历 | 仅公历 | 仅公历 |
| Duration | 是 | 是（moment.duration） | 否 | 是 |
| API 风格 | 链式 + 方法 | 链式 | 函数式 | 链式 |
| 学习曲线 | 陡（类型多） | 平缓 | 平缓 | 中等 |
| 推荐度（2026） | 高（未来标准） | 低（已废弃） | 中 | 中 |

### 12.3 Instant vs ZonedDateTime vs PlainDateTime

| 类型 | 含义 | 时区 | 典型场景 |
| --- | --- | --- | --- |
| Instant | 绝对时刻 | 无（UTC） | 时间戳、日志、数据库存储 |
| ZonedDateTime | 完整日期时间 | 有 | 用户提醒、会议、航班 |
| PlainDateTime | 墙上时间 | 无 | 日历事件（无时区） |
| PlainDate | 纯日期 | 无 | 生日、节假日 |
| PlainTime | 纯时间 | 无 | 每日闹钟、营业时间 |

---

## 13. 常见陷阱与修复

### 13.1 陷阱：用 Date 处理跨时区

```javascript
// 问题：用 Date 计算跨时区时间
const meeting = new Date('2026-07-20T10:00:00');  // 本地时间
const nyTime = meeting.toLocaleString('en-US', { timeZone: 'America/New_York' });
console.log(nyTime);  // 依赖运行环境时区，不可预测

// 修复：用 Temporal.ZonedDateTime
const zdt = Temporal.ZonedDateTime.from('2026-07-20T10:00:00[Asia/Shanghai]');
const nyZdt = zdt.withTimeZone('America/New_York');
console.log(nyZdt.toString());  // '2026-07-19T22:00:00-04:00[America/New_York]'
```

### 13.2 陷阱：忽略 DST 切换

```javascript
// 问题：用毫秒数计算"明天"
const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
console.log(tomorrow);  // DST 切换日错误（差 1 小时）

// 修复：用 Temporal 加日期
const today = Temporal.Now.plainDateISO('America/New_York');
const tomorrow = today.add({ days: 1 });
console.log(tomorrow.toString());
```

### 13.3 陷阱：用 JSON.stringify 序列化 Date

```javascript
// 问题：JSON 序列化 Date 转为 ISO 字符串，反序列化变字符串
const event = { time: new Date('2026-07-20T10:00:00Z') };
const json = JSON.stringify(event);
const parsed = JSON.parse(json);
console.log(parsed.time instanceof Date);  // false（字符串）
console.log(typeof parsed.time);  // 'string'

// 修复：用 Temporal.Instant
const event2 = { time: Temporal.Instant.from('2026-07-20T10:00:00Z') };
const json2 = JSON.stringify(event2);
const parsed2 = JSON.parse(json2);
const restoredTime = Temporal.Instant.from(parsed2.time);
console.log(restoredTime.equals(event2.time));  // true
```

### 13.4 陷阱：本地时间转 UTC 时丢失信息

```javascript
// 问题：本地时间字符串不带时区，转 UTC 时假设运行环境时区
const local = '2026-07-20T10:30:00';
const date = new Date(local);  // 假设本地时区
const utc = date.toISOString();
console.log(utc);  // 在北京运行得到 '2026-07-20T02:30:00.000Z'，在纽约得到 '2026-07-20T14:30:00.000Z'

// 修复：明确指定时区
const zdt = Temporal.ZonedDateTime.from('2026-07-20T10:30:00[Asia/Shanghai]');
const utcInstant = zdt.toInstant();
console.log(utcInstant.toString());  // '2026-07-20T02:30:00Z'（无论在哪运行）
```

### 13.5 陷阱：误用月份天数

```javascript
// 问题：假设所有月份都是 30 天
function addMonth(date) {
  return new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);  // 错误
}

// 修复：用 Temporal 的月份运算
const date = Temporal.PlainDate.from('2026-01-31');
const nextMonth = date.add({ months: 1 });
console.log(nextMonth.toString());  // '2026-02-28'（自动处理月末）
```

### 13.6 陷阱：时区缩写歧义

```javascript
// 问题：CST 有多种含义
// CST = Central Standard Time (UTC-6)
// CST = China Standard Time (UTC+8)
// CST = Cuba Standard Time (UTC-5)
const ambiguous = '2026-07-20T10:00:00 CST';

// 修复：用 IANA 时区标识
const nyTime = Temporal.ZonedDateTime.from('2026-07-20T10:00:00[America/Chicago]');
const beijingTime = Temporal.ZonedDateTime.from('2026-07-20T10:00:00[Asia/Shanghai]');
```

### 13.7 陷阱：Duration 换算为秒

```javascript
// 问题：Duration 不能简单换算为秒
const dur = Temporal.Duration.from({ months: 1 });
const seconds = dur.total({ unit: 'second' });  // 抛错（需参考点）

// 修复：Duration 必须有参考日期才能换算
const date = Temporal.PlainDate.from('2026-01-01');
const end = date.add(dur);
const exactSeconds = date.until(end).total({ unit: 'second' });
console.log(exactSeconds);  // 2678400（31 天）
```

---

## 14. 习题

### 14.1 填空题（fill-blank）

1. **（remember）** Temporal API 中表示"绝对时刻"的类型是 ______，表示"带时区的完整日期时间"的类型是 ______。

   答案：Temporal.Instant；Temporal.ZonedDateTime

2. **（remember）** ISO 8601 字符串 `2026-07-20T10:30:00+08:00[Asia/Shanghai]` 中，`+08:00` 表示 ______，`[Asia/Shanghai]` 表示 ______。

   答案：UTC 偏移量；IANA 时区标识

3. **（understand）** Temporal.Duration 不能直接换算为单一数值（如秒），因为 ______ 与 ______ 单位的长度不固定。

   答案：月；年（月有 28-31 天，年有 365 或 366 天）

### 14.2 选择题（choice）

1. **（analyze）** 下列代码输出是？

   ```javascript
   const zdt = Temporal.ZonedDateTime.from('2026-03-08T02:30:00[America/New_York]');
   ```

   选项：
   - A. 创建成功，时间为 2026-03-08T02:30:00-05:00
   - B. 创建成功，时间自动调整为 2026-03-08T03:30:00-04:00
   - C. 抛出 RangeError（不存在该时刻）
   - D. 创建成功，时间为 2026-03-08T01:30:00-05:00

   答案：B

   解释：默认 disambiguation 为 'compatible'，春季前拨的不存在时刻会自动调整到更晚的有效时刻。

2. **（evaluate）** 下列哪种类型最适合存储用户生日？

   选项：
   - A. Temporal.Instant
   - B. Temporal.ZonedDateTime
   - C. Temporal.PlainDate
   - D. Temporal.PlainTime

   答案：C

   解释：生日与所在地时区无关，且无需精确时刻，PlainDate 最合适。

3. **（analyze）** 下列代码输出是？

   ```javascript
   const d1 = Temporal.PlainDate.from('2026-01-31');
   const d2 = d1.add({ months: 1 });
   console.log(d2.toString());
   ```

   选项：
   - A. 2026-02-31
   - B. 2026-02-28
   - C. 2026-03-03
   - D. 抛出 RangeError

   答案：B

   解释：默认 overflow 为 'constrain'，2 月无 31 日，自动截断到月末。

### 14.3 代码修复题（code-fix）

1. **（apply）** 以下代码尝试计算会议结束时间，但忽略了时区：

   ```javascript
   function endMeeting(startISO, durationHours) {
     const start = new Date(startISO);
     return new Date(start.getTime() + durationHours * 3600000);
   }
   ```

   答案：

   ```javascript
   function endMeeting(startISO, durationHours) {
     const start = Temporal.ZonedDateTime.from(startISO);
     return start.add({ hours: durationHours });
   }
   // 使用：endMeeting('2026-07-20T10:00:00[Asia/Shanghai]', 2)
   ```

2. **（analyze）** 以下代码尝试计算两日期间天数，但返回错误结果：

   ```javascript
   function daysBetween(start, end) {
     const msPerDay = 24 * 60 * 60 * 1000;
     return Math.round((new Date(end) - new Date(start)) / msPerDay);
   }
   // 跨 DST 切换时返回 22 或 23 而非预期整数
   ```

   答案：

   ```javascript
   function daysBetween(start, end) {
     const startDate = Temporal.PlainDate.from(start);
     const endDate = Temporal.PlainDate.from(end);
     return startDate.until(endDate).total({ unit: 'day' });
   }
   ```

### 14.4 开放题（open-ended）

1. **（evaluate）** 比较"UTC 存储 + 本地展示"与"本地存储 + 本地展示"两种时间存储策略，从数据一致性、查询性能、迁移成本、可读性四个维度评估。

   参考答案：
   - UTC 存储 + 本地展示：数据一致（同一时刻所有地区存储相同值）、查询性能好（无时区转换）、迁移成本低（全球化应用必备）、可读性差（调试时需手动转换）
   - 本地存储 + 本地展示：数据不一致（同一时刻不同地区存储不同值）、查询性能差（跨时区查询需转换）、迁移成本高（用户迁移时需调整）、可读性好（直接看到本地时间）

2. **（create）** 设计一个支持多历法的日历应用，要求：(1) 用户可选公历/农历/伊斯兰历；(2) 节日提醒按用户历法；(3) 跨历法日期转换；(4) 历法切换不丢失事件。请描述数据模型与转换策略。

   参考答案：应包括：
   - 存储：所有时间以 Temporal.Instant（绝对时刻）或 Temporal.PlainDate（公历）统一存储
   - 展示：用 withCalendar() 转换到用户偏好历法显示
   - 事件提醒：每个事件记录用户的历法偏好，计算下次触发时转换为 Instant
   - 历法切换：仅改变展示层，存储层不变
   - 跨历法转换：用 PlainDate.withCalendar() 实现公历↔农历↔伊斯兰历

---

## 15. 延伸阅读

### 15.1 书籍

- **David Flanagan**：《JavaScript: The Definitive Guide, 7th Edition》（O'Reilly, 2020）——第 15 章日期与时间。
- **J. R. Stockton**：《Date and Time in JavaScript》——在线资源，深入讨论 Date 的边界情况。
- **Edsger W. Dijkstra**：《On the cruelty of really teaching computing science》——讨论时间表示的哲学问题。

### 15.2 论文与规范

- **ISO 8601:2019**：日期时间表示的国际标准。
- **RFC 3339**：互联网上的日期时间格式（ISO 8601 的 profile）。
- **IANA tzdata**：时区数据库的源代码与文档。
- **TC39 Temporal Proposal** (https://tc39.es/proposal-temporal/)：完整规范文本。

### 15.3 开源项目

- **@js-temporal/polyfill** (https://github.com/js-temporal/temporal-polyfill)：官方 polyfill。
- **Luxon** (https://github.com/moment/luxon)：Moment.js 作者的改进版，基于 Intl API。
- **date-fns** (https://github.com/date-fns/date-fns)：函数式日期库。
- **Day.js** (https://github.com/iamkun/dayjs)：轻量 Date 替代。
- **chrono-node** (https://github.com/wanasit/chrono)：自然语言日期解析。

### 15.4 在线资源

- **MDN: Temporal** (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)：完整 API 参考。
- **Temporal Docs** (https://tc39.es/proposal-temporal/docs/)：TC39 官方教程。
- **IANA Time Zone Database** (https://www.iana.org/time-zones)：时区数据库官方。
- **Time Zone Converter** (https://www.timeanddate.com/)：在线时区转换工具。

---

## 16. 附录

### 16.1 Temporal 类型速查表

| 类型 | 含义 | 是否含时区 | 是否含历法 | 典型场景 |
| --- | --- | --- | --- | --- |
| Instant | 绝对时刻 | 否（UTC 隐式） | 否 | 时间戳、日志 |
| ZonedDateTime | 完整日期时间 | 是 | 是 | 会议、提醒 |
| PlainDateTime | 墙上日期时间 | 否 | 是 | 日历事件 |
| PlainDate | 纯日期 | 否 | 是 | 生日、节假日 |
| PlainTime | 纯时间 | 否 | 否 | 营业时间、闹钟 |
| PlainYearMonth | 年-月 | 否 | 是 | 月度报表 |
| PlainMonthDay | 月-日 | 否 | 是 | 生日（无年） |
| Duration | 时间段 | 否 | 否 | 时长、间隔 |
| Now | 工厂对象 | — | — | 获取当前时刻 |
| TimeZone | 时区对象 | 是 | 否 | 时区操作 |
| Calendar | 历法对象 | 否 | 是 | 历法操作 |

### 16.2 ISO 8601 字符串格式速查

| 格式 | 含义 | 示例 |
| --- | --- | --- |
| `YYYY-MM-DD` | 日期 | `2026-07-20` |
| `HH:MM:SS` | 时间 | `10:30:00` |
| `YYYY-MM-DDTHH:MM:SS` | 日期时间 | `2026-07-20T10:30:00` |
| `Z` | UTC 后缀 | `2026-07-20T10:30:00Z` |
| `+HH:MM` | 偏移量 | `+08:00` |
| `[Area/Location]` | 时区方括号 | `[Asia/Shanghai]` |
| `[u-ca=calendar]` | 历法方括号 | `[u-ca=chinese]` |
| `PnYnMnD` | Duration | `P1Y2M3D`（1 年 2 月 3 日） |
| `PTnHnMnS` | 时间段 Duration | `PT2H30M`（2 时 30 分） |

### 16.3 IANA 时区命名规则

```
Area/Location
├── Africa/Cairo
├── America/
│   ├── New_York
│   ├── Los_Angeles
│   └── Argentina/Buenos_Aires
├── Antarctica/Casey
├── Asia/
│   ├── Shanghai
│   ├── Tokyo
│   └── Singapore
├── Atlantic/Reykjavik
├── Australia/Sydney
├── Europe/
│   ├── London
│   └── Paris
├── Indian/Maldives
├── Pacific/Auckland
└── UTC
```

### 16.4 常用时区偏移量

| 时区 | IANA 名称 | 标准时偏移 | 夏令时偏移 |
| --- | --- | --- | --- |
| UTC | UTC | +00:00 | — |
| 北京 | Asia/Shanghai | +08:00 | —（已废止） |
| 东京 | Asia/Tokyo | +09:00 | — |
| 新加坡 | Asia/Singapore | +08:00 | — |
| 伦敦 | Europe/London | +00:00 | +01:00 (BST) |
| 巴黎 | Europe/Paris | +01:00 | +02:00 (CEST) |
| 纽约 | America/New_York | -05:00 (EST) | -04:00 (EDT) |
| 洛杉矶 | America/Los_Angeles | -08:00 (PST) | -07:00 (PDT) |
| 悉尼 | Australia/Sydney | +10:00 (AEST) | +11:00 (AEDT) |
| 迪拜 | Asia/Dubai | +04:00 | — |

### 16.5 浏览器支持矩阵（截至 2026-07）

| 浏览器 | 版本 | 支持情况 |
| --- | --- | --- |
| Chrome | 119+ | 完整支持 |
| Edge | 119+ | 完整支持 |
| Firefox | 130+ | 完整支持 |
| Safari | 17.4+ | 完整支持 |
| Node.js | 22+ | 完整支持 |
| Deno | 1.40+ | 完整支持 |
| Bun | 1.1+ | 完整支持 |
| iOS Safari | 17.4+ | 完整支持 |
| Android Chrome | 119+ | 完整支持 |
| 旧环境 | — | 需 @js-temporal/polyfill |

---

## 17. 修订日志

| 日期 | 版本 | 修订内容 | 修订人 |
| --- | --- | --- | --- |
| 2026-06-14 | v1.0 | 初版，覆盖 Temporal API 基础类型与用法 | fanquanpp |
| 2026-07-20 | v2.0 | 金标准升级：补充 12 项质量基准、形式化定义、DST 处理、5 个案例研究、农历节日计算、浏览器支持矩阵 | FANDEX Content Engineering Team |

---

> **结语**：`Temporal` API 是 JavaScript 标准库历史上最大规模的补充之一，标志着 JavaScript 终于在 30 年后拥有了与现代语言（Java 8 的 `java.time`、Python 的 `datetime`、.NET 的 `NodaTime`）相当的日期时间处理能力。掌握 `Instant`、`ZonedDateTime`、`PlainDate` 的语义边界、ISO 8601 字符串格式、IANA 时区数据库、DST 歧义处理策略，是构建国际化应用的基础。建议在生产环境以"UTC 存储 + 本地展示"为黄金准则，所有时间字段在数据库中以 `Temporal.Instant`（或等效的 UTC 时间戳）存储，在展示层用 `withTimeZone()` 转换为用户本地时区。后续学习推荐结合 `Intl`（国际化 API）章节，深入 `Intl.DateTimeFormat` 与 `Intl.NumberFormat` 的格式化能力。
