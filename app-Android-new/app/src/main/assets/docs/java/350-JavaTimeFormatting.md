---
order: 350
title: Java 时间格式化 DateTimeFormatter/ZoneId 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 时间格式化 DateTimeFormatter/ZoneId 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/130-JavaStringDetailed'
  - 'java/780-JavaNewFeatures'
prerequisites:
  - 'java/050-DataTypeConversion'
---

## 0. 本节阅读指引（先读这一节）

本篇是「时间格式化」语法速查手册，按需查阅。

零基础第一遍只读：DateTimeFormatter 预定义、自定义格式、格式化与解析、ZoneId 时区；ZonedDateTime、Instant、Duration 与 Period 遇到再查。

前置：004 数据类型与类型转换。


## DateTimeFormatter 预定义

**基本写法：ISO 格式化**
`DateTimeFormatter.ISO_LOCAL_DATE;`
```java
// 使用预定义 ISO 格式
DateTimeFormatter f = DateTimeFormatter.ISO_LOCAL_DATE;
String s = f.format(LocalDate.now());
```

---

**基本写法：本地化格式**
`DateTimeFormatter.ofLocalizedDate(<FormatStyle>);`
```java
// 本地化日期格式
DateTimeFormatter f = DateTimeFormatter.ofLocalizedDate(FormatStyle.FULL);
String s = f.format(LocalDate.now());
```

---

## 自定义格式

**基本写法：自定义模式**
`DateTimeFormatter.ofPattern(<模式>);`
```java
// 自定义日期时间格式
DateTimeFormatter f = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
String s = LocalDateTime.now().format(f);
```

---

**基本写法：带 Locale**
`DateTimeFormatter.ofPattern(<模式>, <Locale>);`
```java
// 指定地区与语言
DateTimeFormatter f = DateTimeFormatter.ofPattern("MMMM dd, yyyy", Locale.US);
String s = LocalDate.now().format(f);
```

---

## 格式化与解析

**基本写法：格式化**
`< temporal >.format(<formatter>);`
```java
// 把日期时间转为字符串
String s = LocalDateTime.now().format(f);
```

---

**基本写法：解析**
`<类型>.parse(<字符串>, <formatter>);`
```java
// 从字符串解析日期
LocalDate d = LocalDate.parse("2025-07-31", DateTimeFormatter.ISO_LOCAL_DATE);
```

---

**基本写法：解析为 LocalDateTime**
`LocalDateTime.parse(<字符串>, <formatter>);`
```java
// 解析为日期时间
LocalDateTime dt = LocalDateTime.parse("2025-07-31 10:15:30",
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
```

---

## ZoneId 时区

**基本写法：获取时区**
`ZoneId.of(<时区ID>);`
```java
// 创建时区对象
ZoneId sh = ZoneId.of("Asia/Shanghai");
```

---

**基本写法：系统默认时区**
`ZoneId.systemDefault();`
```java
// 获取系统默认时区
ZoneId z = ZoneId.systemDefault();
```

---

**基本写法：可用时区**
`ZoneId.getAvailableZoneIds();`
```java
// 列出所有可用时区 ID
Set<String> ids = ZoneId.getAvailableZoneIds();
```

---

## ZonedDateTime 带时区时间

**基本写法：创建带时区时间**
`ZonedDateTime.now(<ZoneId>);`
```java
// 获取指定时区的当前时间
ZonedDateTime sh = ZonedDateTime.now(ZoneId.of("Asia/Shanghai"));
```

---

**基本写法：时区转换**
`<zdt>.withZoneSameInstant(<ZoneId>);`
```java
// 把上海时间转换为纽约时间
ZonedDateTime ny = sh.withZoneSameInstant(ZoneId.of("America/New_York"));
```

---

## Instant 时间戳

**基本写法：当前时间戳**
`Instant.now();`
```java
// 获取 UTC 时间戳
Instant now = Instant.now();
```

---

**基本写法：从 epoch 创建**
`Instant.ofEpochSecond(<秒>);`
```java
// 从 Unix 时间戳创建
Instant t = Instant.ofEpochSecond(1700000000);
```

---

**基本写法：转 ZonedDateTime**
`<instant>.atZone(<ZoneId>);`
```java
// 时间戳转指定时区时间
ZonedDateTime sh = Instant.now().atZone(ZoneId.of("Asia/Shanghai"));
```

---

## Duration 与 Period

**基本写法：时间差**
`Duration.between(<起>, <止>);`
```java
// 计算两个时间点之间的时长
Duration d = Duration.between(t1, t2);
long seconds = d.getSeconds();
```

---

**基本写法：日期差**
`Period.between(<起>, <止>);`
```java
// 计算两个日期之间的差
Period p = Period.between(d1, d2);
int years = p.getYears();
```

---

**基本写法：创建 Duration**
`Duration.ofMinutes(<分钟>);`
```java
// 创建时长对象
Duration five = Duration.ofMinutes(5);
```

---

**基本写法：创建 Period**
`Period.ofDays(<天数>);`
```java
// 创建日期段对象
Period week = Period.ofDays(7);
```

---

## TemporalAdjusters 调整器

**基本写法：下周一**
`<date>.with(TemporalAdjusters.next(<DayOfWeek>));`
```java
// 获取下个周一
LocalDate next = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
```

---

**基本写法：当月最后一天**
`<date>.with(TemporalAdjusters.lastDayOfMonth());`
```java
// 获取当月最后一天
LocalDate last = LocalDate.now().with(TemporalAdjusters.lastDayOfMonth());
```

## 附录：日期时间常用操作补充

以下小节迁移自原数据库连接文档，作为常用日期时间操作的补充速查；与正文重叠的部分按需查阅。

### LocalDate 本地日期

**基本写法：创建本地日期**
`LocalDate.of(<年>, <月>, <日>);`
```java
// 创建指定日期
LocalDate d = LocalDate.of(2025, 7, 31);
```

---

**基本写法：当前日期**
`LocalDate.now();`
```java
// 获取当前日期
LocalDate today = LocalDate.now();
```

---

**基本写法：解析日期**
`LocalDate.parse("<字符串>");`
```java
// 按默认格式解析
LocalDate d = LocalDate.parse("2025-07-31");
```

---

**基本写法：日期加减**
`<date>.plusDays(<天数>);`
```java
// 加 1 天
LocalDate tmw = today.plusDays(1);
```

---

**基本写法：日期减**
`<date>.minusMonths(<月数>);`
```java
// 减 1 个月
LocalDate last = today.minusMonths(1);
```

---

### LocalTime 本地时间

**基本写法：创建本地时间**
`LocalTime.of(<时>, <分>, <秒>);`
```java
// 创建指定时间
LocalTime t = LocalTime.of(10, 30, 0);
```

---

**基本写法：当前时间**
`LocalTime.now();`
```java
// 获取当前时间
LocalTime now = LocalTime.now();
```

---

### LocalDateTime 日期时间

**基本写法：创建日期时间**
`LocalDateTime.of(<日期>, <时间>);`
```java
// 组合日期和时间
LocalDateTime dt = LocalDateTime.of(LocalDate.now(), LocalTime.now());
```

---

**基本写法：当前日期时间**
`LocalDateTime.now();`
```java
// 获取当前日期时间
LocalDateTime now = LocalDateTime.now();
```

---

**基本写法：解析日期时间**
`LocalDateTime.parse("<字符串>");`
```java
// 解析 ISO 格式
LocalDateTime dt = LocalDateTime.parse("2025-07-31T10:30:00");
```

---

### ZonedDateTime 时区日期时间

**基本写法：指定时区**
`ZonedDateTime.now(ZoneId.of("<时区>"));`
```java
// 获取指定时区的当前时间
ZonedDateTime z = ZonedDateTime.now(ZoneId.of("Asia/Shanghai"));
```

---

**基本写法：转换为另一时区**
`<zonedDateTime>.withZoneSameInstant(ZoneId.of("<时区>"));`
```java
// 同一时刻转换时区
ZonedDateTime utc = z.withZoneSameInstant(ZoneId.of("UTC"));
```

---

### Instant 时间戳

**基本写法：当前 Instant**
`Instant.now();`
```java
// 获取 UTC 时间戳
Instant now = Instant.now();
```

---

**基本写法：从纪元创建**
`Instant.ofEpochSecond(<秒>);`
```java
// 从 Unix 时间戳创建
Instant i = Instant.ofEpochSecond(1700000000);
```

---

**基本写法：获取秒数**
`<instant>.getEpochSecond();`
```java
// 获取 Unix 秒数
long sec = now.getEpochSecond();
```

---

**基本写法：获取毫秒**
`<instant>.toEpochMilli();`
```java
// 获取 Unix 毫秒
long ms = now.toEpochMilli();
```

---

### Duration 时长

**基本写法：创建时长**
`Duration.ofMinutes(<分钟>);`
```java
// 创建 30 分钟时长
Duration d = Duration.ofMinutes(30);
```

---

**基本写法：计算两个时间差**
`Duration.between(<开始>, <结束>);`
```java
// 计算时长
Duration d = Duration.between(t1, t2);
```

---

**基本写法：获取秒数**
`<duration>.toSeconds();`
```java
// 转换为秒
long s = d.toSeconds();
```

---

### Period 日期段

**基本写法：创建日期段**
`Period.of(<年>, <月>, <日>);`
```java
// 创建 1 年 2 月 3 天
Period p = Period.of(1, 2, 3);
```

---

**基本写法：计算日期差**
`Period.between(<开始>, <结束>);`
```java
// 计算两个日期间隔
Period p = Period.between(d1, d2);
```

---

### DateTimeFormatter 格式化

**基本写法：自定义格式**
`DateTimeFormatter.ofPattern("<模式>");`
```java
// 定义格式化模式
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
```

---

**基本写法：格式化输出**
`<datetime>.format(<formatter>);`
```java
// 格式化为字符串
String s = now.format(fmt);
```

---

**基本写法：解析字符串**
`LocalDateTime.parse("<字符串>", <formatter>);`
```java
// 按指定格式解析
LocalDateTime dt = LocalDateTime.parse("2025-07-31 10:30:00", fmt);
```

---

**基本写法：内置格式**
`DateTimeFormatter.ISO_LOCAL_DATE;`
```java
// 使用内置 ISO 格式
String s = today.format(DateTimeFormatter.ISO_LOCAL_DATE);
```

---

### 时区与转换

**基本写法：LocalDateTime 转 Instant**
`<datetime>.atZone(ZoneId.of("<时区>")).toInstant();`
```java
// 本地时间转时间戳
Instant i = dt.atZone(ZoneId.of("Asia/Shanghai")).toInstant();
```

---

**基本写法：Instant 转 LocalDateTime**
`<instant>.atZone(ZoneId.of("<时区>")).toLocalDateTime();`
```java
// 时间戳转本地时间
LocalDateTime dt = i.atZone(ZoneId.of("Asia/Shanghai")).toLocalDateTime();
```

---

### Date 旧 API 转换

**基本写法：Date 转 Instant**
`<date>.toInstant();`
```java
// 旧 Date 转新 API
Instant i = new Date().toInstant();
```

---

**基本写法：Instant 转 Date**
`Date.from(<instant>);`
```java
// 新 API 转旧 Date
Date d = Date.from(Instant.now());
```

---

### ChronoUnit 计算差值

**基本写法：计算天数差**
`ChronoUnit.DAYS.between(<开始>, <结束>);`
```java
// 计算两个日期相差天数
long days = ChronoUnit.DAYS.between(d1, d2);
```

---

**基本写法：计算小时差**
`ChronoUnit.HOURS.between(<开始>, <结束>);`
```java
// 计算两个时间相差小时
long hours = ChronoUnit.HOURS.between(t1, t2);
```

---

### TemporalAdjusters 调整器

**基本写法：获取下周一**
`<date>.with(TemporalAdjusters.next(DayOfWeek.MONDAY));`
```java
// 调整到下一个周一
LocalDate next = today.with(TemporalAdjusters.next(DayOfWeek.MONDAY));
```

---

**基本写法：当月最后一天**
`<date>.with(TemporalAdjusters.lastDayOfMonth());`
```java
// 获取本月最后一天
LocalDate last = today.with(TemporalAdjusters.lastDayOfMonth());
```
