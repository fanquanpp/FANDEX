---
order: 500
title: C# 正则表达式
module: 'csharp'
category: 后端技术
difficulty: beginner
description: Regex 匹配替换、分组捕获、选项标志、超时防护与 GeneratedRegex 源生成的速查手册，附完整示例与易错点解析。
author: fanquanpp
updated: '2026-11-16'
related:
  - 'csharp/030-CSharpBasicSyntax'
  - 'csharp/240-SourceGenerator'
prerequisites:
  - 'csharp/020-CSharpOverviewEnvSetup'
---

## 查表前的四条军规

正则是"一行搞定"与"一行灾难"距离最短的 API。查下面的表之前，先记住四条：

1. **先想格式，再想正则**：能靠 `DateTime.TryParse`、`IPAddress.TryParse` 之类的领域解析器解决的事，不要用正则硬匹配（可读性与正确性都赢）；
2. **用户输入定长防回溯**：模式里嵌套量词（`(a+)+` 类）遇上恶意输入会灾难性回溯，外部输入的正则必须设 `Regex.IsMatch(input, pattern, options, TimeSpan.FromSeconds(1))` 形式的超时；
3. **重复使用的正则走静态方法或源生成**：`Regex` 静态方法自带缓存，`[GeneratedRegex]` 则把模式编译进代码，热路径首选；
4. **分组要命名**：`(?<name>...)` 让捕获按名字取，`$1/$2` 这类魔法数字是可维护性杀手。

四条立住后，速查表里每个写法才用得放心。

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

## 自我检查（遮码自检）

遮码自检：先遮住每题的「参考答案」，自己写模式与代码，再对照。本篇自检核心是"读得懂、写得对、防得住"。

**题 1（命名分组提取）**：从日志行 `2026-11-10 12:30:05 [WARN] 磁盘占用 87%` 提取日期、级别、消息三段，用命名分组写出代码。

参考答案：

```csharp
[GeneratedRegex(@"^(?<date>\d{4}-\d{2}-\d{2}) (?<time>\d{2}:\d{2}:\d{2}) \[(?<level>[A-Z]+)\] (?<msg>.*)$")]
private static partial Regex LogLine();

var m = LogLine().Match(line);
if (m.Success)
    Console.WriteLine($"{m.Groups["date"].Value} {m.Groups["level"].Value}: {m.Groups["msg"].Value}");
```

要点：`(?<name>...)` 命名捕获按名取值；`Success` 必须先检查；模式由源生成编译，热路径零解析成本。

**题 2（贪婪与懒惰）**：对 `<a>1</a><a>2</a>` 用 `<a>(.*)</a>` 与 `<a>(.*?)</a>` 分别得到什么组？为什么？

参考答案：前者贪婪——`.*` 吃到能吃的最长，捕获组是 `1</a><a>2`（一直吃到最后的 `</a>`）；后者懒惰——`.*?` 尽量少吃，第一组匹配 `1`，配合 `Matches` 能拿到两条完整匹配。写 HTML/标记类解析时选错贪婪性是最经典的"怎么多吃了"事故。

**题 3（替换）**：把文本中所有 `手机号 138-1234-5678` 形态统一成 `138****5678`，写出 MatchEvaluator 替换。

参考答案：

```csharp
var masked = Regex.Replace(text, @"(\d{3})-(\d{4})-(\d{4})",
    m => $"{m.Groups[1].Value}****{m.Groups[3].Value}");
```

要点：需要"按匹配内容计算替换值"时用 `MatchEvaluator` 重载（而不是静态替换串 `$1****$3`），逻辑更可测；静态替换串适合纯搬移捕获组的场景。

**题 4（防回溯）**：为什么 `^(\w+)+$` 配 30 个字符的 `aaaaaaaaaaaaaaaaaaaaaaaaaaaaab` 会卡死？两道防线是什么？

参考答案：`\w+` 嵌在 `(...)+` 里，双重量词在失败时产生指数级的回溯分支组合（灾难性回溯），CPU 打满直到字符串耗尽。防线一：超时——`new Regex(pattern, options, TimeSpan.FromSeconds(1))`，超时抛 `RegexMatchTimeoutException` 而不是挂死；防线二：改写模式消除嵌套量词（本例等价于 `^\w+$`），并优先用领域解析器替代正则。

**题 5（源生成取舍）**：`[GeneratedRegex(@"\d{4}-\d{2}-\d{2}")] private static partial Regex Date();` 相比 `new Regex(...)` 静态字段好在哪？什么时候只能用运行时构造？

参考答案：源生成在编译期把模式编译成优化代码：启动零解析、无运行时缓存查找、AOT 友好、模式错误编译期就报。运行时构造仍不可替代的场景：模式来自用户输入或配置（编译期不存在）；这类动态模式必须带超时参数，作为不可信输入处理。原则：静态模式一律源生成，动态模式一律超时防护。
