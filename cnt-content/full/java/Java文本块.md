---
order: 85
title: Java文本块
module: java
category: Java
difficulty: beginner
description: 文本块与字符串模板
author: fanquanpp
updated: '2026-06-14'
related:
  - java/Java与Kubernetes
  - java/Java记录类
  - java/Java模块系统
  - java/Java与数据库连接
prerequisites:
  - java/概述与开发环境
---

## 概述

文本块（Text Blocks）是 Java 15 正式引入的特性，它让你可以在代码中书写多行字符串，而不需要手动拼接或转义。在文本块出现之前，写一段 JSON、SQL 或 HTML 需要大量转义引号和换行符，代码既难读又容易出错。文本块用三个双引号包裹，内部可以直接换行，不需要转义。

字符串模板（String Templates）是 Java 21 引入的预览特性，它提供了字符串插值能力，可以在字符串中嵌入表达式。虽然目前还是预览状态，但了解它的设计思路对理解 Java 字符串处理的发展方向很有帮助。

## 基础概念

### 文本块是什么

文本块是用三个双引号（"""）开始和结束的字符串字面量。它的核心作用是让多行字符串在代码中的样子和实际输出的样子一致，所见即所得。

文本块与普通字符串有几个关键区别：

- 文本块可以跨行，不需要 \n 转义
- 文本块中的双引号不需要转义（除非连续出现三个双引号）
- 文本块会自动处理缩进，去掉公共前导空格
- 文本块仍然是 String 类型，和普通字符串没有本质区别

### 字符串模板是什么

字符串模板允许在字符串中用 \{expression} 嵌入变量或表达式，类似于其他语言中的字符串插值。它的语法是 STR."模板内容"，其中 STR 是一个模板处理器。

## 快速上手

### 最简单的文本块

```java
// 传统写法：手动拼接和转义
String json = "{\n" +
    "  \"name\": \"Alice\",\n" +
    "  \"age\": 25\n" +
    "}";

// 文本块写法：所见即所得
String json = """
    {
      "name": "Alice",
      "age": 25
    }
    """;

System.out.println(json);
// 输出:
// {
//   "name": "Alice",
//   "age": 25
// }
```

### 字符串模板基本用法

```java
// 需要启用预览特性：javac --enable-preview --release 21
String name = "Alice";
int age = 25;

// 使用 STR 模板处理器
String msg = STR."姓名: \{name}, 年龄: \{age}";
System.out.println(msg); // 输出: 姓名: Alice, 年龄: 25

// 嵌入表达式
int a = 10, b = 20;
String calc = STR."\{a} + \{b} = \{a + b}";
System.out.println(calc); // 输出: 10 + 20 = 30
```

## 详细用法

### 1. 文本块的缩进处理

文本块会自动去掉所有行的公共前导空格。规则是：找到所有非空行的最小缩进，然后从每行中去掉这个缩进：

```java
// 代码中的缩进会被自动去掉
String text = """
        第一行
          第二行（多了两个空格的缩进）
        第三行
        """;

// 实际内容：
// 第一行
//   第二行（多了两个空格的缩进）
// 第三行

// 结尾的 """ 位置也影响缩进
String text2 = """
        Hello
        World
""";  // """ 在最左边，所以不会去掉任何前导空格

// 实际内容：
//         Hello
//         World
```

### 2. 尾部空格处理

文本块会自动去掉每行末尾的空格。如果需要保留尾部空格，可以使用 \s 转义序列：

```java
// \s 表示一个空格，不会被自动去除
String table = """
    姓名\s\s\s年龄
    Alice\s\s25
    Bob\s\s\s\s30
    """;
```

### 3. 行尾换行控制

默认情况下，文本块每行末尾都有换行符。如果不想在最后一行添加换行，把结束的 """ 紧跟在最后一行内容后面：

```java
// 最后一行有换行
String withNewline = """
    Hello
    """;

// 最后一行没有换行
String withoutNewline = """
    Hello""";
```

### 4. 在文本块中使用转义字符

文本块中仍然可以使用转义字符，但大部分情况下不需要：

```java
// 不需要转义双引号
String json = """
    {"name": "Alice"}
    """;

// 如果确实需要三个连续双引号，用 \ 转义
String text = """
    三个引号: \"""
    """;

// 使用 \ 换行续行（行尾反斜杠表示不插入换行符）
String singleLine = """
    这是一段很长的文字，\
    但实际输出只有一行。\
    换行符被反斜杠吃掉了。""";

// 输出: 这是一段很长的文字，但实际输出只有一行。换行符被反斜杠吃掉了。
```

### 5. 文本块的实际应用场景

**SQL 查询**：

```java
// 传统写法
String sql = "SELECT u.id, u.name, p.title " +
    "FROM users u " +
    "JOIN posts p ON u.id = p.author_id " +
    "WHERE u.status = 'active' " +
    "ORDER BY p.created_at DESC";

// 文本块写法
String sql = """
    SELECT u.id, u.name, p.title
    FROM users u
    JOIN posts p ON u.id = p.author_id
    WHERE u.status = 'active'
    ORDER BY p.created_at DESC
    """;
```

**JSON 消息**：

```java
String json = """
    {
      "event": "order_created",
      "data": {
        "orderId": "1001",
        "amount": 99.9
      }
    }
    """;
```

**HTML 模板**：

```java
String html = """
    <html>
      <head>
        <title>欢迎</title>
      </head>
      <body>
        <h1>Hello, World!</h1>
      </body>
    </html>
    """;
```

**正则表达式**：

```java
// 传统写法：大量转义，难以阅读
String regex = "\\d{4}-\\d{2}-\\d{2}";

// 文本块写法：不需要双重转义
String regex = """
    \\d{4}-\\d{2}-\\d{2}
    """;
```

### 6. 字符串模板详解

字符串模板的语法是 模板处理器."模板内容"：

```java
import java.lang.StringTemplate.STR;

// 基本插值
String name = "Alice";
String greeting = STR."你好, \{name}!";

// 嵌入方法调用
String upper = STR."大写: \{name.toUpperCase()}";

// 嵌入复杂表达式
List<String> items = List.of("苹果", "香蕉", "橙子");
String info = STR."共有 \{items.size()} 种水果: \{String.join(", ", items)}";

// 多行模板
String message = STR."""
    尊敬的 \{name}:
    您的订单 \{orderId} 已发货。
    预计到达时间: \{deliveryDate}
    """;
```

### 7. 自定义模板处理器

字符串模板的强大之处在于可以自定义模板处理器，控制插值的行为：

```java
import java.lang.StringTemplate;
import java.util.StringJoiner;

// 自定义 JSON 模板处理器
// 将变量自动用引号包裹
var JSON = StringTemplate.Processor.of((StringTemplate st) -> {
    StringJoiner joiner = new StringJoiner(", ", "{", "}");
    // st.fragments() 是模板的固定部分
    // st.values() 是嵌入的变量值
    var fragments = st.fragments();
    var values = st.values();
    for (int i = 0; i < values.size(); i++) {
        Object value = values.get(i);
        // 字符串类型加引号，数字类型不加
        if (value instanceof String) {
            joiner.add("\"" + fragments.get(i).strip() + "\":\"" + value + "\"");
        } else {
            joiner.add("\"" + fragments.get(i).strip() + "\":" + value);
        }
    }
    return joiner.toString();
});

String name = "Alice";
int age = 25;
String json = JSON."name: \{name}, age: \{age}";
// 输出: {"name":"Alice","age":25}
```

## 常见场景

### 场景一：构建动态 SQL

```java
public String buildQuery(String table, String condition, String orderBy) {
    return STR."""
        SELECT * FROM \{table}
        WHERE \{condition}
        ORDER BY \{orderBy}
        """;
}

// 调用
String sql = buildQuery("users", "status = 'active'", "created_at DESC");
```

注意：直接拼接 SQL 存在注入风险，生产环境应使用 PreparedStatement。

### 场景二：生成邮件内容

```java
public String generateEmail(String userName, String orderId, String amount) {
    return STR."""
        尊敬的 \{userName}:

        感谢您的购买！您的订单详情如下：

        订单编号: \{orderId}
        订单金额: \{amount} 元

        如有任何问题，请联系客服。
        """;
}
```

## 注意事项与常见错误

### 文本块不能出现在单行

```java
// 错误：文本块必须跨行
String text = """Hello""";  // 编译错误

// 正确：至少包含一个换行
String text = """
    Hello""";
```

### 缩进可能不如预期

文本块的缩进处理基于所有非空行的最小缩进。如果某行的缩进比其他行少，它会影响所有行的缩进去除：

```java
// 注意第二行没有缩进，这会导致所有行的缩进都不被去除
String text = """
    第一行
第二行（没有缩进）
    第三行
    """;
// 实际输出和代码中一模一样，因为最小缩进是 0
```

### 字符串模板是预览特性

截至 Java 21，字符串模板仍是预览特性，需要在编译和运行时显式启用：

```bash
javac --enable-preview --release 21 Main.java
java --enable-preview Main
```

在生产代码中不建议使用预览特性，但可以提前了解和学习。

### 文本块中的制表符

文本块中的缩进处理不区分空格和制表符。如果混用空格和制表符，可能导致缩进计算不符合预期。建议在文本块中统一使用空格缩进。

## 进阶用法

### 文本块与 String 方法配合

文本块生成的仍然是普通 String 对象，可以使用 String 的所有方法：

```java
String template = """
    Hello, ${name}!
    Your order ${orderId} is ready.
    """;

// 使用 replace 替换占位符
String result = template
    .replace("${name}", "Alice")
    .replace("${orderId}", "1001");

// 或者使用 formatted 方法（Java 15+）
String template2 = """
    Hello, %s!
    Your order %s is ready.
    """;

String result2 = template2.formatted("Alice", "1001");
```

### 文本块与正则表达式

文本块让复杂正则表达式的书写更清晰：

```java
// 使用文本块书写多行正则（需要去掉换行）
String datePattern = """
    \\d{4}    # 年
    -         # 分隔符
    \\d{2}    # 月
    -         # 分隔符
    \\d{2}    # 日
    """.replaceAll("\\s+#.*\\n", "")  // 去掉注释
      .replaceAll("\\s+", "");         // 去掉空白
```

### FMT 模板处理器

Java 21 还提供了 FMT 模板处理器，支持格式化说明符：

```java
import java.lang.StringTemplate.FMT;

double price = 99.9;
int quantity = 3;

// 使用 FMT 处理器进行格式化
String receipt = FMT."价格: %.2f\{price}, 数量: %d\{quantity}, 总计: %.2f\{price * quantity}";
// 输出: 价格: 99.90, 数量: 3, 总计: 299.70
```
