---
order: 130
title: Java 字符串详解
module: 'java'
category: 后端技术
difficulty: beginner
description: String 不可变性、字符串常量池、== 与 equals、StringBuilder/StringBuffer、常用 API 与正则表达式基础，零基础保姆级讲解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/050-DataTypeConversion'
  - 'java/100-MethodDetailed'
  - 'java/140-JavaStringFormat'
prerequisites:
  - 'java/050-DataTypeConversion'
---

## 0. 学习目标（可验证）

- [ ] 能说出 String 不可变性的含义，以及它带来的 3 个好处
- [ ] 能区分 `==` 与 `equals()`，并解释字符串常量池的作用
- [ ] 能用 `StringBuilder` 完成大量字符串拼接，并说明为什么比 `+` 快
- [ ] 能用正则表达式完成 `matches` / `replaceAll` 基础匹配

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

## 8. 字符串与基本类型互转

```java
int n = Integer.parseInt("42");      // 字符串 -> int
double d = Double.parseDouble("3.14");
String s = String.valueOf(42);       // int -> 字符串（推荐）
String s2 = 42 + "";                 // 也可以，但可读性较差
```

**拆解讲解**：`parseInt` 遇到非数字内容会抛 `NumberFormatException`，解析用户输入前应先用正则或 `try-catch` 校验（异常处理见 `017-ExceptionHandlingMechanism`）。

## 9. 常见陷阱

| 陷阱 | 错误写法 | 正确做法 |
| --- | --- | --- |
| 用 == 比较内容 | `if (a == "abc")` | `if ("abc".equals(a))` |
| 循环内大量拼接 | `s = s + i` | `StringBuilder.append` |
| split 遇到点号 | `"a.b".split(".")` 得到空数组 | `split("\\.")` |
| replace 与 replaceAll 混用 | 把正则当普通文本 | 按需求二选一 |
| substring 越界 | `substring(3, 1)` | 记住"含头不含尾"，先算边界 |
| 忘记 null 判断 | 直接调用 `s.length()` | 先判 `s != null` 或用 `Objects.toString` |

## 10. 动手试试

**入门版（必做）**：

1. 写一个方法，接收字符串并返回反转后的结果（可用 `StringBuilder.reverse()`）。
2. 统计一个字符串里字母 `a` 出现的次数，用 `charAt` 循环实现。

**进阶版（选做）**：

1. 用正则校验手机号：`1[3-9]\\d{9}`。
2. 把一个 CSV 文本 `"a,b,c"` 拆成数组，再拼接回 `"a-b-c"`。

## 11. 一句话记住

> String 不可变、比较用 `equals`、拼接用 `StringBuilder`、正则先记 `\\d` 与 `matches`。
