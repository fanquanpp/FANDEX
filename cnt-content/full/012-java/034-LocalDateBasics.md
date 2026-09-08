---
order: 340
title: 日期时间救急锦囊： LocalDate / LocalDateTime / DateTimeFormatter
module: 'java'
category: 后端技术
difficulty: beginner
description: 20 行学会打印当前时间、解析字符串、格式化输出，告别老 Date API。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'java/035-JavaTimeFormatting'
  - 'java/018-ExceptionHandlingMechanism'
prerequisites:
  - 'java/005-DataTypeConversion'
---

## 一句话定调

**`Date` 已退休，干活用 `java.time` 包**：`LocalDate` 只管日期，`LocalDateTime` 管日期+时间，`DateTimeFormatter` 管格式化。

## 三个类怎么选：一张图分清

把 `java.time` 想成三块不同的表：`LocalDate` 是**台历**（只有年月日）、`LocalTime` 是**秒表**（只有时分秒）、`LocalDateTime` 是**手机状态栏**（日期时间都有）。它们都"不带时区"——表示的是"墙上时钟看到的值"；跨时区系统（用户分布在不同国家、需要精确时间戳）才轮到 `ZonedDateTime`（带时区的墙钟）和 `Instant`（秒表上的绝对时刻）。

| 类型 | 内容 | 典型场景 |
|------|------|----------|
| `LocalDate` | 年-月-日 | 生日、订单日期、报表日 |
| `LocalTime` | 时:分:秒 | 营业时间、闹钟 |
| `LocalDateTime` | 日期+时间 | 日志时间戳、预约单 |
| `ZonedDateTime` | 日期+时间+时区 | 跨时区会议、航班 |
| `Instant` | UTC 时间戳 | 数据库存档、接口传输 |

## 极简代码（看懂这 20 行就够了）

```java
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class TimeQuickstart {
    public static void main(String[] args) {
        // 1. 打印当前日期 / 日期时间
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        System.out.println(today); // 2026-08-03
        System.out.println(now);   // 2026-08-03T10:30:00.123

        // 2. 字符串 -> 时间对象（解析）
        LocalDate d = LocalDate.parse("2026-08-03"); // ISO 格式可直接解析
        LocalDateTime dt = LocalDateTime.parse("2026-08-03T10:30:00");

        // 3. 时间对象 -> 自定义格式（格式化）
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        System.out.println(now.format(fmt)); // 2026-08-03 10:30

        // 4. 常用运算
        System.out.println(today.plusDays(7));   // 一周后
        System.out.println(dt.minusHours(2));    // 两小时前
        System.out.println(java.time.temporal.ChronoUnit.DAYS.between(
                LocalDate.of(2026, 1, 1), today)); // 相差天数
    }
}
```

需要带时区的场景（跨时区系统）才用 `ZonedDateTime` 与 `Instant`，日常业务 `LocalDate` / `LocalDateTime` 足够。

## 最大的思维转换：不可变对象

`java.time` 的所有类都是**不可变的**——`plusDays` 不会改自己，而是返回一个新对象。类比字符串：`"abc".toUpperCase()` 不写 `s = ...` 接住结果，`s` 永远不变。日期同理：

```java
LocalDate today = LocalDate.of(2026, 8, 3);

// 错误写法：计算结果没接住，today 纹丝不动
today.plusDays(7);
System.out.println(today); // 2026-08-03（不是一周后！）

// 正确写法：重新赋值
today = today.plusDays(7);
System.out.println(today); // 2026-08-10
```

这是 `java.time` 新手第一坑，编译器不会报任何错。

## 完整示例：比较、周期与生日提醒

```java
import java.time.LocalDate;
import java.time.Period;
import java.time.MonthDay;
import java.time.temporal.ChronoUnit;

public class TimeComplete {
    public static void main(String[] args) {
        LocalDate launch = LocalDate.of(2025, 12, 31);
        LocalDate now = LocalDate.of(2026, 8, 3);

        // 比较：isBefore / isAfter / isEqual
        System.out.println(now.isAfter(launch)); // true

        // Period：按"年月日"人话表示两个日期的差
        Period age = Period.between(launch, now);
        System.out.println(age.getYears() + "年" + age.getMonths() + "个月");
        // 预期输出：0年7个月

        // ChronoUnit：按单一单位换算
        System.out.println(ChronoUnit.DAYS.between(launch, now));  // 215
        System.out.println(ChronoUnit.MONTHS.between(launch, now)); // 7

        // MonthDay：只关心月日，做生日/周年提醒
        MonthDay birthday = MonthDay.of(9, 1);
        LocalDate nextBirthday = birthday.atYear(now.getYear());
        if (nextBirthday.isBefore(now)) {
            nextBirthday = birthday.atYear(now.getYear() + 1);
        }
        System.out.println("距离下次生日还有 "
                + ChronoUnit.DAYS.between(now, nextBirthday) + " 天");
        // 预期输出：距离下次生日还有 29 天
    }
}
```

间隔计算二选一：**差值要"几年几月几天"用 `Period`，要"总天数"用 `ChronoUnit.DAYS.between`**；时间差的对应物是 `Duration`（精确到纳秒的时长，不掺日历概念）。

## 如果报这个错，看这里

**报错：`DateTimeParseException: Text '2026/08/03' could not be parsed`**

原因：`LocalDate.parse()` 默认只认 ISO 格式 `yyyy-MM-dd`，斜杠格式解析失败。

对策：先 `DateTimeFormatter.ofPattern("yyyy/MM/dd")` 再 `LocalDate.parse(str, fmt)`。

**报错：`UnsupportedTemporalTypeException: Unsupported field: HourOfDay`**

原因：对只有日期的 `LocalDate` 使用带 `HH:mm` 的格式器。

对策：`LocalDate` 用 `yyyy-MM-dd`，要带时分就用 `LocalDateTime` 或 `LocalDateTime.now()`。

**报错：`DateTimeParseException` 但格式看起来一模一样**

常见原因：字符串里有不可见字符（全角空格、零宽空格）或月份用了中文（"八月"）。对策：`str.trim()` 后再解析；中文月份需要 `DateTimeFormatter.ofPattern("yyyy年MM月dd日")` 配合本地化写法，或直接换成数字格式。

**现象：多线程下格式化结果错乱或偶发异常**

老 `SimpleDateFormat` 是线程不安全的（这是老 API 退休的原因之一）；`DateTimeFormatter` 不可变、线程安全，可以作为 `static final` 常量全局复用，无需每次 `new`。

## 常用格式模式速查（ofPattern 字母含义）

| 模式字母 | 含义 | 示例输出 |
|----------|------|----------|
| `yyyy` / `yy` | 4 位 / 2 位年份 | 2026 / 26 |
| `MM` / `M` | 两位 / 一位月份 | 08 / 8 |
| `dd` / `d` | 两位 / 一位日期 | 03 / 3 |
| `HH` / `hh` | 24 小时 / 12 小时制小时 | 14 / 02 |
| `mm` / `ss` | 分 / 秒 | 30 / 05 |
| `SSS` | 毫秒 | 123 |
| `E` / `EEEE` | 星期缩写 / 全称 | 周一 / 星期一 |

记忆口诀：**同字母越长越"补零"，连写越长越"全称"**。`yyyy-MM-dd` 与 `YYYY-MM-dd` 一字之差、谬以千里——大写 `Y` 是"周年（week-based year）"，跨年周会得出 2026 年 12 月 28 日这样的诡异结果，月份日期一律小写。

## 记住

初学者记住三点：

> 1. 日期解析失败先怀疑格式；`LocalDate` 没有时分字段；跨时区才上 `ZonedDateTime`。
> 2. `plusDays`/`minusHours` 返回新对象，必须用变量接住结果。
> 3. `DateTimeFormatter` 线程安全，写成常量复用；`SimpleDateFormat` 别再用。

进阶者还需注意：

- "几年几个月"用 `Period`，"总时长"用 `Duration`/`ChronoUnit`，两者混用会算错。
- `LocalDateTime` 不含时区语义，跨时区存档用 `Instant`（UTC 时刻）+ 目标时区展示。
- 日期运算跨月/闰年由 API 兜底（如 1 月 31 日 `plusMonths(1)` 得 2 月 28 日），手写日历数学才是坑源。
