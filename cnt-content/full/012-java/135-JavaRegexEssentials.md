---
order: 170
title: Java 正则表达式入门：java.util.regex 与文本模式校验
module: 'java'
category: 后端技术
difficulty: beginner
description: Pattern/Matcher 两步式与 String.matches 全串匹配的差别，字符类、量词、分组与或运算；用邮箱校验、密码强度、18 位身份证三个真实规则落地，并对照 SQL 方言中的同构 regexp。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'java/130-JavaStringDetailed'
  - 'java/095-ScannerConsoleInput'
  - 'java/180-ExceptionHandlingMechanism'
prerequisites:
  - 'java/130-JavaStringDetailed'
---

## 知识点地图

- **知识类别**：正则表达式（regular expression）——`java.util.regex` 包，官方 API 文档中与 String 并列的独立主题（Pattern、Matcher 两个核心类）。
- **解决什么问题**：「这个字符串长得像不像一个合法的邮箱/手机号/身份证」这类**结构校验**，用 if 与 indexOf 手写会层层嵌套且漏边界；用「一套符号描述文本模式」一句话完成。
- **什么时候用到**：表单校验（前端之外的最后一道防线）、日志分析（从大段文本抽取片段）、批量替换（把文本里的日期统一改格式）、split 按复杂分隔符切分。

本篇原是 [字符串详解](/java/130-JavaStringDetailed) 的一个小节，因 `java.util.regex` 在官方体系里是独立主题且内容量足够，拆出扩充为独立一篇；130 保留字符串主线并在第 5 节留交叉引用。

## 前置知识

- [字符串详解](/java/130-JavaStringDetailed)：String 不可变、`split`/`replace` 的存在；
- [Scanner 控制台输入](/java/095-ScannerConsoleInput)：校验的对象常来自键盘输入。

## 学习目标

读完本文你将能够：

1. 写出 Pattern/Matcher 两步式并解释它与 `String.matches` 全串匹配的差别；
2. 背下正则符号速查表，并说出 Java 字符串里 `\\d` 双反斜杠的由来；
3. 用字符类、量词、分组、或运算组合出邮箱、密码、身份证三条真实校验规则；
4. 解释同一身份证校验在 Java 与 MySQL 里写法的方言差异。

预计 50 分钟，含 1 个找错练习与 2 道动手任务。

## 1. 两步式：Pattern 编译，Matcher 执行

Java 把正则引擎拆成两个角色：`Pattern` 是编译好的模式（可反复使用），`Matcher` 是模式作用于某段文本的执行器。来自 130 篇第 7 节的经典示例：

```java
import java.util.regex.Pattern;
import java.util.regex.Matcher;

Pattern p = Pattern.compile("\\d{3}-\\d{8}");  // 3位数字-8位数字
Matcher m = p.matcher("联系我 138-12345678");
System.out.println(m.find());   // true：找到匹配片段
System.out.println(m.group());  // "138-12345678"
```

**逐段讲解**：

1. `Pattern.compile` 把字符串编译成内部状态机，编译有开销——**同一个模式匹配成千上万次时，必须把 Pattern 提出来复用**，这是两步式存在的主要理由。
2. `matcher(...)` 只是把模式与文本「装订」在一起，还没有开始匹配；真正的匹配动作是后面的 `find()` / `matches()` / `lookingAt()`。
3. `find()` 在文本中**寻找**匹配片段（可以从任意位置开始，多次调用依次往下找）；`m.group()` 取回刚找到的那段内容——调用 group 前必须先 find 成功，否则抛 `IllegalStateException`。

### matches / find / lookingAt 三者的差别

| 方法 | 语义 | 典型用途 |
| --- | --- | --- |
| `m.find()` | 文本中**包含**匹配片段即可 | 从日志抽取电话号 |
| `m.matches()` | **整个字符串**完全匹配才算 | 表单校验 |
| `m.lookingAt()` | 从**开头**匹配即可，不要求到尾 | 解析固定前缀 |

换别的写法会发生什么：校验场景若误用 `find`，`"我的邮箱是 a@163.com 请回复"` 这种混着杂文的输入也会通过校验——**校验必须用 matches（或正则首尾加 ^ $）**，这是安全上真实出现过的绕过案例。

## 2. String 的三个正则便捷方法

不关心复用、只匹配一次时，String 自带三个方法省去两步式：

```java
"123".matches("\\d+");         // true：整体是否匹配（等价 Pattern.matches("\\d+", "123")）
"a1b2".replaceAll("\\d", "#"); // "a#b#"：替换所有匹配片段
"a1,b2".split(",");            // 按正则切分，返回 String[]
```

**拆解讲解**：

1. `matches` 要求**整个字符串**匹配，`find` 只要**包含**匹配片段即可——与第 1 节的表一致，String.matches 内部就是 `Pattern.matches(this, regex)`。
2. `replaceAll` 的第一参数是正则，`replace` 的第一参数是普通文本，两者不要混用：`"a.b".replace(".", "-")` 只换那一个点号，`"a.b".replaceAll(".", "-")` 会把**每个字符**都换成减号（`.` 在正则里匹配任意字符）。
3. `split` 的参数本来就是正则，普通字符没问题，遇到 `.`、`|` 等特殊字符要转义（见第 3 节与第 6 节找错）。

## 3. 符号速查与 Java 双反斜杠

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
| `(...)` | 分组 | `"(\\d{3})-(\\d{4})"` |
| `|` | 或 | `"(163|126)"` |

**为什么代码里是 `\\d`**：正则引擎要求收到两个字符 `\` 和 `d`；而 Java 字符串字面量里 `\` 是转义前缀，写一个 `\d` 会被编译器当成非法转义直接报错（`illegal escape character`）。于是先写成 `"\\d"` 让字符串**值**为 `\d`，再交给正则引擎。这是初学者最常卡住的地方——记住「字符串里的正则符号一律双写反斜杠」。

**转义特殊符号同理**：正则里 `.` 有特殊含义，要匹配字面点号写 `\\.`；字面反斜杠写 `\\\\`（一层转义给 Java，一层给正则）。

## 4. 三条真实校验规则

### 规则一：邮箱校验（限定主机名版）

来自真实登录模块的需求：登录名固定 5 个字母，主机只允许 163 与 126，域名 com 或 com.cn：

```java
String emailRegex = "^[A-Za-z]{5}@(163|126)\\.(com|com\\.cn)$";

public static boolean checkEmail(String email) {
    return email != null && email.matches(emailRegex);
}
```

**逐段讲解**：

1. `^[A-Za-z]{5}`：行首起，恰好 5 个字母。`^` 与 `$` 一对锚点包住整个模式后，`matches` 与 `find` 的差别被抹平，双保险。
2. `(163|126)`：分组 + 或运算，两个主机号之一。
3. `\\.`：字面点号必须转义，写成 `\\.(com|com\\.cn)`；漏掉转义的话 `163xcom` 也能通过——`.` 匹配任意字符。
4. `email != null` 的判断不能省：`null.matches(...)` 直接空指针，正则再正确也救不了。

这是一条**故意收窄**的校验规则（真实通用邮箱规则远比它复杂，RFC 5322 的完整正则近乎天书）。教学价值在于理解每个片段的职责：字母类、量词、锚点、分组或、转义。生产环境的邮箱校验通常只验证 `@` 前后各有一段合法字符，真正的验证靠发送确认邮件。

### 规则二：密码校验（6 位以上纯数字）

```java
String pwdRegex = "[0-9]{6,}";
boolean ok = "123456".matches(pwdRegex);      // true
boolean bad = "12345".matches(pwdRegex);      // false：只有 5 位
```

**逐段讲解**：`[0-9]{6,}` 是「至少 6 位」的量词闭区间写法，`{6,}` 没有上界；`[0-9]` 与 `\\d` 等价，写全区间的好处是正则可以原样搬进不认 `\d` 简写的环境（见规则三的 SQL 方言）。注意这条规则只验格式不验安全——纯数字密码本身就该被安全策略拒绝，格式校验与安全校验是两层。

### 规则三：18 位身份证校验（Java 与 SQL 方言对照）

真实商品管理系统在数据库层就拦截非法身份证：

```sql
-- MySQL 建表语句中的校验约束
Identity_id CHAR(18) NOT NULL regexp '^[0-9]{17}[0-9X]$'
```

同一个规则搬到 Java：

```java
String idRegex = "[0-9]{17}[0-9X]";
boolean ok = "11010519491231002X".matches(idRegex);   // true，末位校验码 X
```

**方言差异逐点讲**：

1. MySQL 的 regexp 模式默认**不需要**首尾锚点也按「找到即可」执行，但配合约束校验时应显式写 `^` 与 `$`，行为才与 Java 的 `matches` 对齐。
2. MySQL 8.0 前的字符类不认 `\d` 简写（且 SQL 字符串的转义规则又不同），所以数据库版普遍写 `[0-9]`——这也是规则二推荐写全区间的原因：**写 `[0-9]` 而不是 `\\d`，正则跨语言迁移成本最低**。
3. 职责分层：数据库约束是最后一道防线，Java 层校验给用户即时反馈，两层都写是常态而不是重复劳动；末位校验码的加权算法（GB 11643）两边的正则都管不了，需要独立代码实现。

## 5. 分组与捕获：从文本里抽取内容

校验只回答「像不像」，抽取向答「内容是什么」。分组 `(...)` 会把匹配片段存起来：

```java
Pattern p = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})");
Matcher m = p.matcher("下单时间 2026-10-05，发货 2026-10-07");

while (m.find()) {
    System.out.println("整段: " + m.group(0));    // 2026-10-05
    System.out.println("年: " + m.group(1));      // 2026
    System.out.println("月: " + m.group(2));      // 10
    System.out.println("日: " + m.group(3));      // 05
}
```

**逐段讲解**：`group(0)` 是整个匹配，`group(1)` 起对应第 n 个左括号；`find()` 返回 false 时循环结束，这是「遍历所有匹配」的标准写法。换 `replaceAll("(\\d{4})-(\\d{2})-(\\d{2})", "$3/$2/$1")` 可以用 `$n` 引用分组实现格式重排——把日期改成「日/月/年」只需一行。

易错点：分组只记**左**括号顺序；嵌套分组 `(a(b))` 里 group(1) 是 ab、group(2) 是 b。

## 6. 找错练习：split 点号切分

一段真实代码想把 `"192.168.1.1"` 按点切分成四段：

```java
String ip = "192.168.1.1";
String[] parts = ip.split(".");
System.out.println(parts.length);      // 期望 4，实际输出 0
```

**解析**：`.` 在正则里匹配任意字符，于是 split 找到的分隔符是「每一个字符」，原字符串被切成空串序列，而 Java 的 split 会**丢弃尾部的空串**，结果数组长度为 0。正确写法 `ip.split("\\.")`。这类 bug 编译期毫无征兆，运行时表现为「数组突然空了」，排查方向应第一时间想到「这个参数是正则」——`split`、`replaceAll`、`matches`、`Pattern.compile` 四个入口全部如此。

## 7. 动手实践

**任务一（必做）：手机号校验器**。写方法 `static boolean checkPhone(String s)`，规则：以 1 开头、第二位 3 到 9、总共 11 位纯数字。对 `"13812345678"`、`"12812345678"`、`"1381234567"` 三个输入验证输出 true / false / false。

提示：用 `[3-9]` 字符区间表示第二位；长度交给量词 `{9}` 配合首两位；别忘 null 保护。

<details>
<summary>参考实现（先自己写完再展开）</summary>

```java
static boolean checkPhone(String s) {
    return s != null && s.matches("1[3-9]\\d{9}");
}
```

自检标准：总位数 = 1（首位）+ 1（第二位）+ 9（余下），`\\d{9}` 而不是 `{10}`；`[3-9]` 区间写法；null 短路放在 matches 之前（&& 从左到右短路，null 时不会走到 matches）。

</details>

**任务二（选做）：日志时间抽取器**。给定文本 `"2026-10-05 09:30 完成；2026-10-06 14:05 部署"`，用分组把每个「日期 时间」抽取出来并按「05/10 09:30」格式重新打印。

提示：第 5 节的 while(find) 循环 + group + String.format；正则 `(\\d{4})-(\\d{2})-(\\d{2}) (\\d{2}):(\\d{2})`。

<details>
<summary>参考实现</summary>

```java
Pattern p = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2}) (\\d{2}):(\\d{2})");
Matcher m = p.matcher("2026-10-05 09:30 完成；2026-10-06 14:05 部署");

while (m.find()) {
    System.out.printf("%s/%s %s:%s%n",
            m.group(3), m.group(2), m.group(4), m.group(5));
}
// 输出两行：05/10 09:30 与 06/10 14:05
```

自检标准：五个分组的编号与左括号顺序一致；循环条件是 `m.find()` 本身；格式串里的 `%n` 换行。

</details>

## 8. 一句话记住

> Pattern 编译一次反复用，校验用 matches、抽取用 find + group；Java 字符串里反斜杠双写；`split`/`replaceAll` 的参数是正则，点号必须转义；跨语言迁移把 `\\d` 写成 `[0-9]`。

## 9. 下一步

- [字符串详解](/java/130-JavaStringDetailed)：String 主线与 split/replaceAll 的宿主方法；
- [Scanner 控制台输入](/java/095-ScannerConsoleInput)：正则校验的输入来源与类型不匹配防御；
- [异常处理机制](/java/180-ExceptionHandlingMechanism)：`PatternSyntaxException`（正则本身写错）的处理；
- [MySQL 数据类型与约束](/mysql/010-MySQLBasics)：规则三 SQL 侧的归属篇（regexp 约束与 check 约束的取舍）。

## 10. 参考与致谢

- `java.util.regex.Pattern` 官方 API 文档（方法语义、符号总表以此为准）：https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/regex/Pattern.html ；
- Oracle Java Tutorials, Custom Networking — Regular Expressions（两步式心智模型参照）：https://docs.oracle.com/javase/tutorial/essential/regex/ （仅目录对照与链接引用，未复制正文）；
- 校验规则样例（限定主机邮箱、6 位纯数字密码、18 位身份证 regexp 约束）取材于仓库扫描材料中的真实项目配置，已按教学目的改写；身份证末位校验码算法见 GB 11643-1999（本文仅指出其存在，未展开）。
