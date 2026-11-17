---
order: 420
title: Java 文本块
module: 'java'
category: 后端技术
difficulty: beginner
description: 多行字符串的现行写法与缩进规则；顺带讲清字符串模板（JEP 430/459）为何在 JDK 23 前被撤回、今天用什么替代
author: fanquanpp
updated: '2026-11-16'
related:
  - 'java/980-JavaKubernetes'
  - 'java/450-JavaRecordClass'
  - 'java/470-JavaModuleSystem'
  - 'java/720-JavaDatabaseConnection'
prerequisites:
  - 'java/020-JavaOverviewDevEnv'
---

## 前置知识

- [Java 记录类](/java/450-JavaRecordClass)：建议先完成前一篇的学习

## 学习目标

- 掌握「0. 本节阅读指引（先读这一节）」的核心机制、典型用法与常见陷阱
- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱


## 0. 本节阅读指引（先读这一节）

本篇是「文本块」，语法内容为主。

零基础第一遍只读：概述、基础概念、快速上手、详细用法；文末字符串速查小节当字典用。

可跳过：常见场景、注意事项与常见错误、进阶用法第一遍浏览即可。

前置：012 Java 字符串详解。


## 概述

文本块（Text Blocks）是 Java 15 正式引入的特性，它让你可以在代码中书写多行字符串，而不需要手动拼接或转义。在文本块出现之前，写一段 JSON、SQL 或 HTML 需要大量转义引号和换行符，代码既难读又容易出错。文本块用三个双引号包裹，内部可以直接换行，不需要转义。

字符串插值（在字符串里嵌入变量）是另一个长期需求：Java 官方曾在 JDK 21 以预览特性引入字符串模板（String Templates，JEP 430），JDK 22 二次预览（JEP 459），随后在 JDK 23 发布前**整体撤回**——OpenJDK 团队认为原设计在「默认安全」（如 SQL 注入风险）与编辑器友好性上没有达成自己的目标，决定推倒重做而不是小修小补（Brian Goetz 2024 年在 inside.java 的说明）。截至 JDK 26，字符串插值仍未回归语言。所以今天写插值，用的是 `String.format` / `formatted` / `MessageFormat` 这类库方案；本篇保留一段对已撤回语法的识别指南，方便你在老博客、老代码里认出 `STR."..."` 时不再误以为是现行特性。

## 基础概念

### 文本块是什么

文本块是用三个双引号（"""）开始和结束的字符串字面量。它的核心作用是让多行字符串在代码中的样子和实际输出的样子一致，所见即所得。

文本块与普通字符串有几个关键区别：

- 文本块可以跨行，不需要 \n 转义
- 文本块中的双引号不需要转义（除非连续出现三个双引号）
- 文本块会自动处理缩进，去掉公共前导空格
- 文本块仍然是 String 类型，和普通字符串没有本质区别

### 字符串插值是什么，模板处理器为什么被撤回

字符串插值指在字符串中嵌入变量或表达式，例如其他语言的 `"Hello ${name}"`。Java 官方方案的语法是 模板处理器."模板内容"，如 `STR."姓名: \{name}"`，其中 `STR` 是一个模板处理器，负责把嵌入的表达式安全地转成文本。

它的设计动机值得记住：插值的最大风险是不经检查的字符串拼接（SQL 注入、命令注入都源于此），所以 Java 的方案要求每个模板都经过一个**处理器**，处理器可以按用途做校验（比如 SQL 模板强制走 PreparedStatement）。但正式评审时，团队认为这套设计并未真正达成「默认安全」——不写专用处理器时依然可能不安全，且内嵌语法对编辑器的自动补全、语法高亮不友好——于是在 JDK 23 发布前撤回了整个特性（JEP 430/459 预览，JDK 26 仍未回归）。这个撤回本身就是重要教学素材：**预览特性不是承诺，`--enable-preview` 下的 API 随时可能消失**。

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

### 字符串插值的当前写法（以及已撤回语法的样子）

截至 JDK 26，插值靠标准库完成，不需要任何开关：

```java
String name = "Alice";
int age = 25;

// printf 风格：String.format / formatted（Java 15+ 的实例方法版）
String msg = "姓名: %s, 年龄: %d".formatted(name, age);
System.out.println(msg); // 输出: 姓名: Alice, 年龄: 25

// 嵌入表达式：先把表达式算出来再交给 formatted
int a = 10, b = 20;
String calc = "%d + %d = %d".formatted(a, b, a + b);
System.out.println(calc); // 输出: 10 + 20 = 30
```

对照记忆已撤回的预览语法（只用于识别旧代码，JDK 23+ 编译不过）：

```java
// JDK 21/22 预览语法（已撤回，仅供识别老资料）
String msg = STR."姓名: \{name}, 年龄: \{age}"; // STR."..." 是被撤回的模板处理器语法
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

### 6. 字符串插值的实战替代方案

模板撤回后，多行场景把文本块与格式化方法组合使用，就是 JDK 26 的日常写法：

```java
// 嵌入方法调用：先算值，再格式化
String name = "Alice";
String greeting = "你好, %s!".formatted(name.toUpperCase());

// 嵌入复杂表达式：同理，把表达式收敛成变量或内联计算
List<String> items = List.of("苹果", "香蕉", "橙子");
String info = "共有 %d 种水果: %s"
    .formatted(items.size(), String.join(", ", items));

// 多行模板：文本块 + formatted 是标准组合
String message = """
    尊敬的 %s:
    您的订单 %s 已发货。
    预计到达时间: %s
    """.formatted(name, orderId, deliveryDate);
```

需要按键名插值（`${name}` 风格）时，用 `MessageFormat` 或 `java.text.MessageFormat` 占位符，这是 JDK 内置且长期支持的方案：

```java
import java.text.MessageFormat;

String text = MessageFormat.format("用户 {0} 下单 {1} 件", "Alice", 3);
// 输出: 用户 Alice 下单 3 件
```

### 7. 从自定义模板处理器到撤回：教训是什么

被撤回的设计里最有想象力的一环是**自定义模板处理器**：你写的处理器拿到模板的固定片段（`fragments()`）与嵌入值（`values()`），可以做校验、转义或拼装。官方示例曾演示把变量自动引号化生成 JSON。它展示了「插值必须经过检查关卡」的正确方向，但评审结论是这个关卡没能做到默认安全——开发者仍可以随手用 STR 处理器拼出注入风险，安全责任落在使用者而非语法上。

撤回后的替代思路：与其依赖语法级处理器，不如直接用强类型 API——SQL 用 PreparedStatement，JSON 用 Jackson 的 `ObjectNode`，日志用占位符参数。这些 API 在类型系统层面杜绝了拼接错误，比字符串级校验更可靠：

```java
// 用 ObjectNode 构建 JSON，替代字符串级插值
ObjectNode node = JsonNodeFactory.instance.objectNode();
node.put("name", "Alice");
node.put("age", 25);
String json = node.toString(); // {"name":"Alice","age":25}
```

这也解释了撤回的深层原因：字符串模板解决的是「写起来顺手」，而注入问题的根治靠「类型化 API 让错误写法编译不过」。后者优先级更高。

## 常见场景

### 场景一：构建动态 SQL

```java
public String buildQuery(String table, String condition, String orderBy) {
    return """
        SELECT * FROM %s
        WHERE %s
        ORDER BY %s
        """.formatted(table, condition, orderBy);
}

// 调用
String sql = buildQuery("users", "status = 'active'", "created_at DESC");
```

注意：文本块（连同 formatted）只是让 SQL **写起来**整洁，注入风险一个没少——table、condition 仍来自调用方。生产环境应使用 PreparedStatement 占位符传参，文本块只适合拼接表名、排序字段这类无用户输入的片段。

### 场景二：生成邮件内容

```java
public String generateEmail(String userName, String orderId, String amount) {
    return """
        尊敬的 %s:

        感谢您的购买！您的订单详情如下：

        订单编号: %s
        订单金额: %s 元

        如有任何问题，请联系客服。
        """.formatted(userName, orderId, amount);
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

### 字符串模板：从预览到撤回的完整时间线

JDK 21 预览（JEP 430）时需要显式启用：

```bash
javac --enable-preview --release 21 Main.java
java --enable-preview Main
```

JDK 22 二次预览（JEP 459），随后 JDK 23 发布前整体撤回。**今天的正确姿势**：不要在任何 JDK 版本上启用 `--enable-preview` 使用 `STR."..."`——JDK 23 起该 API 已不存在，未来回归时也会是重新设计的语法。遇到仍宣传字符串模板的教程或资料，先看发布日期。

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

### 文本块与 printf 风格格式化

FMT 模板处理器（支持格式化说明符）属于已撤回的预览 API。同样的需求用文本块加 `formatted` 就能完成：

```java
double price = 99.9;
int quantity = 3;

String receipt = """
    价格: %.2f, 数量: %d, 总计: %.2f
    """.formatted(price, quantity, price * quantity);
// 输出: 价格: 99.90, 数量: 3, 总计: 299.70
```
## 文本块基础

**基本写法：创建文本块**
`"""<换行><内容><换行>"""`
```java
// Java 15+ 多行字符串文本块
String json = """
    {
      "name": "Alice"
    }
    """;
```

---

**基本写法：文本块结尾控制**
`<内容>\n    """`
```java
// 末尾缩进决定去除前导空格
String s = """
    hello
    """;
```

---

**基本写法：保留末尾换行**
`"""<换行><内容>\n"""`
```java
// 行尾反斜杠表示不换行
String s = """
    hello \
    world
    """;
```

---

## 字符串插值（现行方案）

**基本写法：formatted 实例方法**
`"<模板>".formatted(<参数>...)`
```java
// JDK 15+，printf 占位符风格
String s = "Hello %s".formatted("Alice");
```

---

**基本写法：String.format 静态方法**
`String.format("<模板>", <参数>...)`
```java
// 与 formatted 等价，兼容老代码习惯
int x = 1, y = 2;
String s = String.format("%d + %d = %d", x, y, x + y);
```

注意：`STR."..."` 与 `FMT."..."` 是 JDK 21/22 已撤回的预览语法（JEP 430/459），JDK 23 起编译报错，不要在新代码中使用。

---

## 字符串常用操作

**基本写法：字符串格式化**
`String.format("<模板>", <参数>...)`
```java
// printf 风格格式化
String s = String.format("name=%s, age=%d", "Alice", 20);
```

---

**基本写法：formatted 方法**
`"<模板>".formatted(<参数>...)`
```java
// Java 15+ 实例方法格式化
String s = "name=%s".formatted("Alice");
```

---

**基本写法：拼接**
`String.join("<分隔符>", <元素>...)`
```java
// 用分隔符拼接字符串
String r = String.join(",", "a", "b", "c");
```

---

## 文本块与格式化结合

**基本写法：文本块格式化**
`"""<内容>""".formatted(<参数>...)`
```java
// 文本块配合 formatted 占位
String json = """
    {"name":"%s","age":%d}
    """.formatted("Alice", 20);
```

---

## 缩进控制

**基本写法：去除缩进**
`<字符串>.stripIndent();`
```java
// 去除最小公共缩进
String s = raw.stripIndent();
```

---

**基本写法：转义换行**
`<字符串>.translateEscapes();`
```java
// 将转义字符翻译为实际字符
String s = "a\\nb".translateEscapes();
```

---

## 字符串拼接

**基本写法：StringBuilder 拼接**
`StringBuilder sb = new StringBuilder(); sb.append(<值>);`
```java
// 可变字符串拼接
StringBuilder sb = new StringBuilder();
sb.append("a").append(1);
String r = sb.toString();
```

---

**基本写法：StringJoiner 拼接**
`new StringJoiner("<分隔符>", "[", "]").add(<值>);`
```java
// 带前后缀的拼接器
String r = new StringJoiner(",", "[", "]").add("a").add("b").toString();
```

---

## 字符串查找与判断

**基本写法：判断前后缀**
`<字符串>.startsWith("<前缀>");`
```java
// 判断是否以指定前缀开头
boolean b = "hello".startsWith("he");
```

---

**基本写法：包含子串**
`<字符串>.contains("<子串>");`
```java
// 判断是否包含子串
boolean b = "hello".contains("ell");
```

---

**基本写法：查找位置**
`<字符串>.indexOf("<子串>);`
```java
// 查找子串首次出现位置
int i = "hello".indexOf("l");
```

---

## 字符串转换

**基本写法：分割**
`<字符串>.split("<正则>);`
```java
// 按正则分割字符串
String[] parts = "a,b,c".split(",");
```

---

**基本写法：替换**
`<字符串>.replace("<旧>", "<新>");`
```java
// 替换所有匹配字面量
String s = "hello".replace("l", "L");
```

---

**基本写法：replaceAll 正则替换**
`<字符串>.replaceAll("<正则>", "<替换>");`
```java
// 使用正则替换
String s = "a1b2".replaceAll("\\d", "_");
```

---

**基本写法：去除空白**
`<字符串>.strip();`
```java
// 去除首尾 Unicode 空白
String s = "  hi  ".strip();
```

---

## 字符串与字节转换

**基本写法：编码为字节**
`<字符串>.getBytes(<字符集>);`
```java
// 使用 UTF-8 编码为字节
byte[] b = "hi".getBytes(StandardCharsets.UTF_8);
```

---

**基本写法：字节解码**
`new String(<字节数组>, <字符集>);`
```java
// 用指定字符集构造字符串
String s = new String(bytes, StandardCharsets.UTF_8);
```

---

## 重复与缩进

**基本写法：重复字符串**
`"<字符串>".repeat(<次数>);`
```java
// Java 11+ 字符串重复
String s = "ab".repeat(3);
```

---

**基本写法：添加缩进**
`<字符串>.indent(<空格数>);`
```java
// Java 12+ 给每行增加缩进
String s = "a\nb".indent(4);
```

---

## 字符串判空

**基本写法：判断空白**
`<字符串>.isBlank();`
```java
// Java 11+ 判断是否空白
boolean b = "   ".isBlank();
```

---

**基本写法：判断空**
`<字符串>.isEmpty();`
```java
// 判断长度是否为 0
boolean b = "".isEmpty();
```

---

## 教学自检（先遮住示例代码自己写，再对照）

1. 写一个文本块存 JSON，要求缩进去除后每行顶格开始。关键规则是什么？——结束定界符 `"""` 的缩进决定整体去除量，所有非空行的最小公共缩进被去掉。
2. 想让文本块最后一行也换行，怎么写？想让它不换行呢？——结束 `"""` 换行书写则内容含末尾换行；`"""` 直接跟在内容后（或内容行尾写 `\`）则不带末尾换行。
3. 用文本块 + `formatted` 生成 `Hi, Alice (age 25)`，占位符写什么？——`"Hi, %s (age %d)".formatted("Alice", 25)`，`%s` 字符串、`%d` 整数。
4. 判断：`STR."Hello \{name}"` 在 JDK 25 上能否编译？——不能。字符串模板是 JEP 430/459 的预览特性，JDK 23 发布前已撤回，现行 JDK 无此语法。
5. 文本块里的 `"` 需要转义吗？`\` 呢？——单个双引号不需要（避免成三个连排即可）；要表示一个字面反斜杠字符必须写成 `\\`（源码两个字符，写单个 `\` 是非法转义，编译错误）；唯一的例外是放在行尾——文本块中行尾的 `\` 是"不插入换行符"的合法转义（JEP 378），普通字符串没有这个转义。
