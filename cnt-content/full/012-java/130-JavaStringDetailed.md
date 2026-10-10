---
order: 160
title: Java 字符串详解
module: 'java'
category: 后端技术
difficulty: beginner
description: String 不可变性、字符串常量池、== 与 equals、StringBuilder/StringBuffer、常用 API、字符集编码与乱码排查、StringJoiner 与 format，零基础保姆级讲解。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'java/050-DataTypeConversion'
  - 'java/100-MethodDetailed'
  - 'java/135-JavaRegexEssentials'
  - 'java/280-IOStreamFileOperation'
prerequisites:
  - 'java/050-DataTypeConversion'
---

## 知识点地图

- **知识类别**：字符串（java.lang.String 及其工具类）——Java 官方 API 中使用频率最高的类，本篇含不可变模型、常量池、拼接三件套、编码转换与格式化。
- **解决什么问题**：文本怎么存、怎么比、怎么拼、怎么在字节与字符之间转换（乱码的根源就在最后一件）。
- **什么时候用到**：一切业务代码；其中第 8 节编码知识在读文件、网络传输、数据库中文存取时必用。

## 0. 学习目标（可验证）

- [ ] 能说出 String 不可变性的含义，以及它带来的 3 个好处
- [ ] 能区分 `==` 与 `equals()`，并解释字符串常量池的作用
- [ ] 能用 `StringBuilder` 完成大量字符串拼接，并说明为什么比 `+` 快
- [ ] 能用正则表达式完成 `matches` / `replaceAll` 基础匹配
- [ ] 能用 `getBytes(Charset)` 与 `new String(bytes, charset)` 解释并排查一次中文乱码
- [ ] 能用 `StringJoiner` 与 `String.format` 完成结构化拼接与格式化输出

## 1. 一句话理解

> 字符串就是"字符组成的文本"。Java 中的 `String` 是**对象**而不是基本类型，它一旦创建就"冻住"（不可变），所以比较内容必须用 `equals()`，大量拼接要用 `StringBuilder`。

## 2. 创建字符串：字面量与 new

```java
String a = "hello";        // 方式一：字符串字面量
String b = "hello";        // 字面量相同，直接复用常量池对象
String c = new String("hello"); // 方式二：new 一定在堆中新建对象
```

**拆解讲解**：

1. 方式一写的是字符串**字面量**，JVM 会先检查字符串常量池（String Pool）：池中已有 `"hello"` 就直接复用，所以 `a == b` 为 `true`。
2. 方式二用 `new`，无论池里有没有，都会在堆上**新建**一个对象，所以 `a == c` 为 `false`。
3. 常量池是 JVM 为字符串做的"缓存"，省内存、省创建时间；这正是不可变性带来的设计红利（见下一节）。

## 3. 不可变性：String 为什么"冻住"

`String` 类被 `final` 修饰，内部保存字符的数组也是 `final`，并且不对外暴露修改方法——这就是**不可变**：任何看似"修改"的操作，实际都是创建一个新字符串。

```java
String s = "java";
s = s.toUpperCase();   // 原对象 "java" 还在池里，s 指向新对象 "JAVA"
```

不可变带来的 3 个好处：

| 好处 | 说明 |
| --- | --- |
| 线程安全 | 内容永远不会变，多个线程同时读不需要加锁 |
| 缓存安全 | 常量池、`hashCode()` 缓存都依赖"内容不变"这一前提 |
| 安全可靠 | 网络地址、文件路径、密码等敏感数据不会被意外篡改 |

> 代价：频繁修改字符串会产生大量临时对象，所以才有 `StringBuilder`（见第 6 节）。

## 4. == 与 equals() 的经典陷阱

```java
String x = "abc";
String y = new String("abc");
System.out.println(x == y);          // false：一个在常量池，一个在堆
System.out.println(x.equals(y));     // true：equals 比较的是内容
```

**拆解讲解**：

1. `==` 比较的是**引用地址**（两个变量指向的是不是同一个对象）。
2. `equals()` 比较的是**内容**（字符串里的字符是否完全一样）。
3. 规则只有一条：**字符串内容比较永远用 `equals()`**，`==` 只在极少数"确认引用同一对象"的场景使用。
4. 习惯上把常量写在前面：`"abc".equals(x)`，可以避免 `x` 为 `null` 时抛空指针。

## 5. 常用方法速览

```java
String s = "Hello, Java";
s.length();              // 11（长度，含逗号和空格）
s.charAt(0);             // 'H'
s.indexOf("Java");       // 7（子串首次出现的下标，找不到返回 -1）
s.substring(7);          // "Java"（从下标 7 截到末尾）
s.substring(0, 5);       // "Hello"（含头不含尾）
s.replace('l', 'L');     // "HeLLo, Java"（替换全部字符）
s.toUpperCase();         // "HELLO, JAVA"
s.toLowerCase();         // "hello, java"
s.trim();                // 去掉首尾空白
s.contains("Java");      // true
s.startsWith("Hello");   // true
s.endsWith("va");        // true
s.isEmpty();             // false（长度为 0）
s.isBlank();             // false（全空白才算 true，Java 11+）
"a,b,c".split(",");      // ["a","b","c"]
String.join("-", "a", "b"); // "a-b"
```

**拆解讲解**：

1. `substring(开始, 结束)` 是"含头不含尾"，`substring(0, 5)` 取下标 0-4，这是最常见的越界错误来源。
2. `indexOf` 找不到子串时返回 `-1`，不要和下标 `0` 混淆。
3. `split` 的参数是**正则表达式**，普通字符没问题，遇到 `.`、`|` 等特殊字符要转义（见第 7 节）。
4. 以上方法全部返回**新字符串**，原字符串不变——这就是不可变性的直接体现。

## 6. StringBuilder 与 StringBuffer

用 `+` 拼接 1 万次，会创建约 1 万个临时字符串对象，时间复杂度接近 O(n²)；`StringBuilder` 内部是可变的字符数组，拼接只在数组上追加，接近 O(n)。

```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++) {
    sb.append("第").append(i).append("行\n");
}
String result = sb.toString();   // 最后一次性转成 String
```

| 类型 | 可变 | 线程安全 | 性能 | 适用场景 |
| --- | --- | --- | --- | --- |
| String | 否 | 安全 | 拼接慢 | 固定文本、少量拼接 |
| StringBuilder | 是 | 不安全 | 快 | 单线程大量拼接（首选） |
| StringBuffer | 是 | 安全（方法加锁） | 较慢 | 多线程共享拼接（很少用） |

**拆解讲解**：

1. `append` 可以链式调用，因为它返回 `this`。
2. 常用方法还有 `insert(位置, 内容)`、`delete(开始, 结束)`、`reverse()`。
3. 现代 JDK 编译器对 `"a" + "b" + "c"` 这类**字面量拼接**会直接优化，但循环内的动态拼接不会，仍应显式使用 `StringBuilder`。
4. 面试常见问题"StringBuffer 和 StringBuilder 的区别"答案就在表格里：一个线程安全一个性能好。

## 7. 正则表达式基础

正则表达式（Regex）是用一套符号描述"文本模式"的语言。Java 中它先要被编译成 `Pattern`，再匹配 `Matcher`：

```java
import java.util.regex.Pattern;
import java.util.regex.Matcher;

Pattern p = Pattern.compile("\\d{3}-\\d{8}");  // 3位数字-8位数字
Matcher m = p.matcher("联系我 138-12345678");
System.out.println(m.find());   // true：找到匹配片段
System.out.println(m.group());  // "138-12345678"
```

**常用符号速查**：

| 符号 | 含义 | Java 字符串中写法 |
| --- | --- | --- |
| `\d` | 一个数字 | `"\\d"` |
| `\w` | 字母/数字/下划线 | `"\\w"` |
| `\s` | 空白字符 | `"\\s"` |
| `.` | 任意字符（除换行） | `"."` |
| `*` | 前一项出现 0 次或多次 | `"a*"` |
| `+` | 前一项出现 1 次或多次 | `"\\d+"` |
| `?` | 前一项出现 0 次或 1 次 | `"colou?r"` |
| `{n,m}` | 出现 n 到 m 次 | `"\\d{3}"` |
| `[abc]` | 字符集合之一 | `"[a-z]"` |
| `^` `$` | 开头 / 结尾 | `"^\\d+$"` |

`String` 也提供了 3 个正则便捷方法：

```java
"123".matches("\\d+");        // true：整体是否匹配
"a1b2".replaceAll("\\d", "#"); // "a#b#"：替换所有匹配片段
"a1,b2".split(",");            // 按逗号切分（split 参数就是正则）
```

**拆解讲解**：

1. Java 字符串里反斜杠要写成 `\\`，所以正则 `\d` 在代码里是 `"\\d"`——这是初学者最常卡住的地方。
2. `matches` 要求**整个字符串**匹配，`find` 只要**包含**匹配片段即可。
3. `replaceAll` 的第一参数是正则，`replace` 的第一参数是普通文本，两者不要混用。

> 深入的正则主题（Pattern/Matcher 两步式、分组捕获、邮箱/身份证完整校验规则）已独立成篇：[Java 正则表达式入门](/java/135-JavaRegexEssentials)。

## 8. 字符集编码与乱码排查

### 8.1 心智模型：字符表与字节序列是两层东西

`char`/`String` 是「字符」（逻辑概念），磁盘与网络里只有「字节」（物理概念）。**字符集（Charset）就是字符与字节之间的翻译规则**：UTF-8 里一个汉字通常 3 个字节，GBK 里 2 个字节，英文始终 1 个字节。写乱码 bug 的唯一原因是：**用 A 规则编码的字节，被用 B 规则解码**。

```java
import java.nio.charset.StandardCharsets;

String s = "中文";
byte[] utf8 = s.getBytes(StandardCharsets.UTF_8);  // E4 B8 AD E6 96 87（6 字节）
byte[] gbk  = s.getBytes("GBK");                   // D6 D0 CE C4（4 字节）

String ok   = new String(utf8, StandardCharsets.UTF_8);  // "中文"：对称还原
String bad  = new String(utf8, "GBK");                   // "涓枃"：UTF-8 字节按 GBK 解读
```

**逐行讲解**：

1. `getBytes()` 不带参数用**平台默认字符集**——Java 18 起（JEP 400）默认统一为 UTF-8；之前的版本在中文 Windows 上默认是 GBK。同一段代码跨机器结果不同，就是它的锅，所以本节所有示例都显式传 Charset。
2. `new String(bytes, charset)` 是「按规则把字节翻译回字符」。编码与解码规则一致时无损；不一致时得到乱码字符串——且**乱码一旦生成就无法无损修复**（信息已经丢了），只能回到原始字节重新解码。
3. `getBytes("GBK")` 里的字符串形式会抛受检异常 `UnsupportedEncodingException`，工程里更推荐 `StandardCharsets.UTF_8` 常量形式（不抛异常、拼错编译期就报）。

### 8.2 三个真实场景

- **场景一（文件读写，真实工程）**：Windows 记事本（旧版默认 ANSI/GBK）保存的 CSV，用 Java 程序按 UTF-8 读入，中文全变乱码。修复：读文件时显式 `new InputStreamReader(in, StandardCharsets.UTF_8)` 换成 `Charset.forName("GBK")`，或统一把文件转存为 UTF-8（I/O 流详见 280 篇第 4 节转换流）。
- **场景二（HTTP 接口）**：前端发的 UTF-8 请求体，后端按容器默认编码解码出现 `ä¸­æ–‡` 形态乱码——典型的「UTF-8 字节按 Latin-1 解读」。修复：请求头声明 `Content-Type: application/json; charset=utf-8` 并在服务端显式指定。
- **场景三（数据库中文变问号）**：写入后库里的中文变成 `???`——这是 JDBC 连接串缺 `characterEncoding=utf8` 或表字符集为 latin1，转换发生在驱动层，已经不可逆。

### 8.3 乱码排查口诀

1. 先找**乱码形态**：`涓枃` 类「汉字型乱码」多为 UTF-8 字节被按 GBK 读；`???` 或 `�` 多为编码时字符就映射不出去（GBK 装不下的字符、或 latin1 库表）。
2. 再画**字节流经路径**：源（文件/网络/输入框）→ 解码 → 内存 String → 编码 → 目标（文件/网络/库表），逐跳确认两端的 charset 是否一致。
3. 最后**全链路统一 UTF-8**（JVM 参数 `-Dfile.encoding=UTF-8`、连接串、文件读写显式传 Charset），一劳永逸。

## 9. StringJoiner 与 String.format

### 9.1 StringJoiner：带分隔符的结构化拼接

`StringBuilder` 拼列表时要手工处理「最后一项后面多出的逗号」；`StringJoiner` 把这件事内置了：

```java
import java.util.StringJoiner;

StringJoiner sj = new StringJoiner(", ", "[", "]");
sj.add("Java").add("SQL").add("Git");
System.out.println(sj);   // [Java, SQL, Git]

// 快捷方式：String.join 与 Stream + Collectors.joining
String.join("-", "a", "b", "c");                    // "a-b-c"
list.stream().map(String::toUpperCase)
    .collect(java.util.stream.Collectors.joining(" | "));
```

**拆解讲解**：

1. 构造参数是「分隔符、前缀、后缀」；空 Joiner 会输出 `[]`（前后缀仍在），`setEmptyValue` 可改。
2. 三个场景：拼 SQL 的 IN 条件（`'a', 'b', 'c'`）；导出 CSV 行；日志里拼参数列表。凡「N 项 N-1 个分隔符」的拼接都优先它，而不是 if 判断首项的土办法。

### 9.2 String.format：格式化输出

```java
String line = String.format("[%s] %s 花费 %.2f 元", "2026-10-07", "奶茶", 12.5);
// [2026-10-07] 奶茶 花费 12.50 元
System.out.printf("%d 行, %5d 对齐, %-6s|左对齐%n", 3, 42, "abc");
```

**常用占位符**：`%s` 字符串、`%d` 整数、`%f` 浮点、`%.2f` 保留两位、`%n` 换行、`%5d`/`%-6s` 宽度与左右对齐。`%f` 默认 6 位小数，金额输出必须显式 `%.2f`——它与 BigDecimal 的 `setScale(2)` 是「显示层」与「存储层」的两件事，别混为一谈（金额计算见 055 篇）。

## 8. 字符串与基本类型互转

```java
int n = Integer.parseInt("42");      // 字符串 -> int
double d = Double.parseDouble("3.14");
String s = String.valueOf(42);       // int -> 字符串（推荐）
String s2 = 42 + "";                 // 也可以，但可读性较差
```

**拆解讲解**：`parseInt` 遇到非数字内容会抛 `NumberFormatException`，解析用户输入前应先用正则或 `try-catch` 校验（异常处理见 `017-ExceptionHandlingMechanism`）。

## 10. 常见陷阱

| 陷阱 | 错误写法 | 正确做法 |
| --- | --- | --- |
| 用 == 比较内容 | `if (a == "abc")` | `if ("abc".equals(a))` |
| 循环内大量拼接 | `s = s + i` | `StringBuilder.append` |
| split 遇到点号 | `"a.b".split(".")` 得到空数组 | `split("\\.")` |
| replace 与 replaceAll 混用 | 把正则当普通文本 | 按需求二选一 |
| substring 越界 | `substring(3, 1)` | 记住"含头不含尾"，先算边界 |
| 忘记 null 判断 | 直接调用 `s.length()` | 先判 `s != null` 或用 `Objects.toString` |
| getBytes 不传字符集 | `s.getBytes()` 跨平台结果不同 | `s.getBytes(StandardCharsets.UTF_8)` |
| 试图"修复"已乱码字符串 | 对乱码 String 再转码 | 乱码不可逆，回到原始字节用正确字符集重新解码 |

## 11. 动手试试

**入门版（必做）**：

1. 写一个方法，接收字符串并返回反转后的结果（可用 `StringBuilder.reverse()`）。
2. 统计一个字符串里字母 `a` 出现的次数，用 `charAt` 循环实现。

**进阶版（选做）**：

1. 用正则校验手机号：`1[3-9]\\d{9}`。
2. 把一个 CSV 文本 `"a,b,c"` 拆成数组，再拼接回 `"a-b-c"`。
3. 乱码复现实验：把 `"中文"` 分别用 UTF-8 与 GBK 各取 `getBytes`，打印字节数组长度与十六进制；再把 UTF-8 的字节用 GBK 解码，观察得到的乱码形态，对照第 8.3 节口诀判断乱码类型。

## 12. 一句话记住

> String 不可变、比较用 `equals`、拼接用 `StringBuilder`（结构化用 StringJoiner）、正则先记 `\\d` 与 `matches`、编码解码必须成对指定同一字符集。
