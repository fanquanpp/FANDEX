---
order: 470
title: C# 正则表达式
module: 'csharp'
category: 后端技术
difficulty: beginner
description: Regex 匹配替换、分组捕获、选项标志、超时防护与 GeneratedRegex 源生成的速查手册，附完整示例与易错点解析。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'csharp/030-CSharpBasicSyntax'
  - 'csharp/240-SourceGenerator'
prerequisites:
  - 'csharp/020-CSharpOverviewEnvSetup'
---

## 基本匹配

**基本写法：静态匹配**
`Regex.IsMatch(<输入>, "<模式>" [, <选项>]);`
```csharp
// 判断是否匹配
bool ok = Regex.IsMatch("abc123", @"\d+");
```

---

**基本写法：提取匹配**
`Regex.Match(<输入>, "<模式>");`
```csharp
// 获取第一个匹配
Match m = Regex.Match("phone: 13800001234", @"\d+");
if (m.Success) Console.WriteLine(m.Value);
```

---

**基本写法：提取所有匹配**
`Regex.Matches(<输入>, "<模式>");`
```csharp
// 获取所有匹配
foreach (Match m in Regex.Matches("a1 b2 c3", @"\d"))
{
    Console.WriteLine(m.Value);
}
```

---

**基本写法：编译正则**
`Regex.<变量> = new Regex("<模式>", RegexOptions.Compiled);`
```csharp
// 编译为 IL，多次使用更快
var re = new Regex(@"\d+", RegexOptions.Compiled);
```

---

## 替换与分割

**基本写法：替换匹配**
`Regex.Replace(<输入>, "<模式>", "<替换>");`
```csharp
// 替换所有匹配
string result = Regex.Replace("hello 123", @"\d", "*");
```

---

**基本写法：替换回调**
`Regex.Replace(<输入>, "<模式>", <MatchEvaluator>);`
```csharp
// 用函数动态生成替换值
string result = Regex.Replace("a1 b2", @"\d", m => (int.Parse(m.Value) + 1).ToString());
```

---

**基本写法：分割字符串**
`Regex.Split(<输入>, "<模式>");`
```csharp
// 按模式分割
string[] parts = Regex.Split("a,b;c", @"[,;]");
```

---

## 分组捕获

**基本写法：捕获组**
`Regex.Match(<输入>, "(<分组>)");`
```csharp
// 用括号定义捕获组
Match m = Regex.Match("2024-01-01", @"(\d+)-(\d+)-(\d+)");
string year = m.Groups[1].Value;
```

---

**基本写法：命名分组**
`(?<<名称>><模式>)`
```csharp
// 命名捕获组
Match m = Regex.Match("Alice:30", @"(?<name>\w+):(?<age>\d+)");
string name = m.Groups["name"].Value;
```

---

**基本写法：替换引用分组**
`Regex.Replace(<输入>, "<模式>", "<$组名>");`
```csharp
// 在替换中引用命名组
string result = Regex.Replace("2024-01", @"(\d+)-(\d+)", "$2/$1");
```

---

**基本写法：非捕获组**
`(?:<模式>)`
```csharp
// 仅分组不捕获
Match m = Regex.Match("abc", @"(?:ab)+c");
```

---

## 选项标志

**基本写法：忽略大小写**
`RegexOptions.IgnoreCase`
```csharp
// 忽略大小写匹配
bool ok = Regex.IsMatch("Hello", "hello", RegexOptions.IgnoreCase);
```

---

**基本写法：多行模式**
`RegexOptions.Multiline`
```csharp
// ^ $ 匹配每行开头结尾
var re = new Regex(@"^\w+", RegexOptions.Multiline);
```

---

**基本写法：单行模式**
`RegexOptions.Singleline`
```csharp
// . 匹配换行符
var re = new Regex(@"<div>.*?</div>", RegexOptions.Singleline);
```

---

**基本写法：忽略空白**
`RegexOptions.IgnorePatternWhitespace`
```csharp
// 模式中的空白被忽略，可写注释
var re = new Regex(@"
    \d+      # 数字部分
    -        # 分隔符
    \d+      # 数字部分
", RegexOptions.IgnorePatternWhitespace);
```

---

## 常用模式

**基本写法：匹配邮箱**
`@"[\w.+-]+@[\w-]+\.[\w.]+"`
```csharp
// 简易邮箱匹配
bool ok = Regex.IsMatch("a@b.com", @"[\w.+-]+@[\w-]+\.[\w.]+");
```

---

**基本写法：匹配 URL**
`@"https?://[\w./?-]+"`
```csharp
// 简易 URL 匹配
Match m = Regex.Match(text, @"https?://[\w./?-]+");
```

---

**基本写法：匹配 IPv4**
`@"\d{1,3}(\.\d{1,3}){3}"`
```csharp
// 简易 IPv4 匹配
bool ok = Regex.IsMatch("192.168.1.1", @"\d{1,3}(\.\d{1,3}){3}");
```

---

**基本写法：匹配中文**
`@"[\u4e00-\u9fa5]+"`
```csharp
// 匹配连续中文字符
Match m = Regex.Match("hello 世界", @"[\u4e00-\u9fa5]+");
```

---

## 超时与安全

**基本写法：设置超时**
`new Regex("<模式>", <选项>, <超时>);`
```csharp
// 防止 ReDoS 拒绝服务
var re = new Regex(@"^(a+)+$", RegexOptions.None, TimeSpan.FromSeconds(1));
```

---

**基本写法：try-catch 超时**
`try { } catch (RegexMatchTimeoutException) { }`
```csharp
// 捕获正则匹配超时
try { var m = re.Match(input); }
catch (RegexMatchTimeoutException) { }
```

---

## 生成器源生成

**基本写法：GeneratedRegex 源生成**
`[GeneratedRegex("<模式>", <选项>)]`
```csharp
// .NET 7+ 编译时生成正则实现
public partial class MyRegex
{
    [GeneratedRegex(@"\d+")]
    public static partial Regex Numbers();
}
// 使用：MyRegex.Numbers().Match(input)
```

---

## 字符类速查

**基本写法：常用字符类**
`<字符类>`
```csharp
// \d 数字 \D 非数字
// \w 字母数字下划线 \W 非
// \s 空白 \S 非空白
// . 任意字符（除换行）
// [a-z] 字符区间 [^a-z] 取反
```

---

**基本写法：量词**
`<量词>`
```csharp
// * 0 次或多次
// + 1 次或多次
// ? 0 次或 1 次
// {n} 恰好 n 次
// {n,} 至少 n 次
// {n,m} n 到 m 次
// *? +? ?? 惰性匹配
```

---

**基本写法：锚点**
`<锚点>`
```csharp
// ^ 字符串/行首
// $ 字符串/行尾
// \b 单词边界
// \B 非单词边界
// \A 输入开头 \z 输入结尾
```

---

**基本写法：零宽断言**
`(?=<模式>) | (?<=<模式>)`
```csharp
// 先行断言：(?=...)  后行断言：(?<=...)
// 负向先行：(?!...)  负向后行：(?<!...)
Match m = Regex.Match("a1", @"\d(?=[a-z])"); // 数字后跟字母
```

---

## 完整示例：解析日志行

以下程序可直接运行，演示提取、命名分组与替换回调的组合：

```csharp
using System.Text.RegularExpressions;

string log = "2026-09-08 12:30:05 WARN 订单服务 - 耗时 2350ms";

// 命名分组提取结构化字段
var m = Regex.Match(
    log,
    @"^(?<date>\d{4}-\d{2}-\d{2})\s(?<time>\d{2}:\d{2}:\d{2})\s(?<level>WARN|ERROR)\s(?<msg>.+?)\s-\s耗时\s(?<ms>\d+)ms");

if (m.Success)
{
    Console.WriteLine(m.Groups["level"].Value);   // WARN
    Console.WriteLine(m.Groups["ms"].Value);      // 2350
}

// 替换回调：把日志中所有毫秒数换算成秒
string seconds = Regex.Replace(log, @"(\d+)ms",
    m => $"{double.Parse(m.Groups[1].Value) / 1000:0.###}s");
Console.WriteLine(seconds);

// 输出：
// WARN
// 2350
// 2026-09-08 12:30:05 WARN 订单服务 - 耗时 2.35s
```

## 常见陷阱

**静态方法有模式缓存但容量有限**。`Regex.IsMatch(input, pattern)` 这类静态调用内部会缓存"模式 -> 解析树"（默认上限 15 个），超出的模式会被挤出缓存、反复重新解析。循环里使用**固定少量**模式没问题；模式动态拼接或数量超限时，应显式创建 `Regex` 实例复用，或改用 `[GeneratedRegex]`。

**替换字符串中 `$` 与反斜杠有特殊含义**。`$1` 引用第 1 组、`${name}` 引用命名组；想输出字面 `$` 要写成 `$$`。把"用户输入"当作替换文本时应用 `Regex.Replace(input, pattern, m => MatchEvaluator)` 回调形式，天然避免 `$` 被误解释。

**贪婪与懒惰**。`.*` 是贪婪匹配，会"吃"到最后一个可能的位置；`<div>.*?</div>` 中加 `?` 才是最小匹配。HTML 这类嵌套文本本就不适合正则精确定位，能解析就用解析器，正则只做粗提取。

**回溯灾难（ReDoS）**。`^(a+)+$` 这类嵌套量词模式在恶意输入下会指数级回溯，直接打满 CPU。所有处理外部输入的正则都应设置超时：`new Regex(pattern, options, TimeSpan.FromSeconds(1))`，并捕获 `RegexMatchTimeoutException` 降级处理。`[GeneratedRegex]` 生成的引擎回溯行为相同，超时保护同样必要。

**`Matches` 判空要检查集合而不是 `Match.Success`**。`Regex.Matches` 返回 `MatchCollection`，空结果时是空集合（`Count == 0`），不抛异常；而 `Regex.Match` 永远返回一个 `Match` 对象，必须先看 `Success` 属性再取 `Groups`/`Value`，否则拿到的是空串而不是报错，容易让逻辑静默走偏。

**默认选项大小写敏感且 `.` 不匹配换行**。跨行文本要用 `RegexOptions.Singleline`（让 `.` 吃进 `\n`）或 `Multiline`（让 `^`/`$` 逐行生效），两者解决的是不同问题，按需组合（`RegexOptions.Singleline | RegexOptions.Multiline`）。

## 分层小结

- **记住**：`IsMatch` 判断、`Match`/`Matches` 提取、`Replace` 替换；命名分组 `(?<name>...)`；`@` 原样字符串写模式。
- **理解**：静态方法缓存上限、贪婪与懒惰、回溯与超时防护、`Success` 先行检查。
- **应用**：日志解析、格式校验、文本清洗选对入口方法；高频调用的固定模式一律 `[GeneratedRegex]` 源生成（.NET 7+），编译期即完成优化。
