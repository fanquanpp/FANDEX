---
order: 340
title: 日期时间救急锦囊： LocalDate / LocalDateTime / DateTimeFormatter
module: 'java'
category: 后端技术
difficulty: beginner
description: 20 行学会打印当前时间、解析字符串、格式化输出，告别老 Date API。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/035-JavaTimeFormatting'
prerequisites:
  - 'java/005-DataTypeConversion'
---

## 一句话定调

**`Date` 已退休，干活用 `java.time` 包**：`LocalDate` 只管日期，`LocalDateTime` 管日期+时间，`DateTimeFormatter` 管格式化。

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

## 如果报这个错，看这里

**报错：`DateTimeParseException: Text '2026/08/03' could not be parsed`**

原因：`LocalDate.parse()` 默认只认 ISO 格式 `yyyy-MM-dd`，斜杠格式解析失败。

对策：先 `DateTimeFormatter.ofPattern("yyyy/MM/dd")` 再 `LocalDate.parse(str, fmt)`。

**报错：`UnsupportedTemporalTypeException: Unsupported field: HourOfDay`**

原因：对只有日期的 `LocalDate` 使用带 `HH:mm` 的格式器。

对策：`LocalDate` 用 `yyyy-MM-dd`，要带时分就用 `LocalDateTime` 或 `LocalDateTime.now()`。

## 记住

> 日期解析失败先怀疑格式；`LocalDate` 没有时分字段；跨时区才上 `ZonedDateTime`。
