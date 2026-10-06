---
order: 90
title: 字符串处理与格式化
module: 'csharp'
category: 后端技术
difficulty: beginner
description: string 不可变性与驻留、StringBuilder 何时才划算、StringComparison 与文化陷阱、格式化与插值转义、u8/UTF-8 字符串字面量。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'csharp/050-ValueTypeReferenceType'
  - 'csharp/230-SpanMemory'
  - 'csharp/400-DotnetPerformanceBenchmarking'
  - 'csharp/470-RegularExpression'
prerequisites: []
---

## 知识点地图

- **知识类别**：字符串处理与格式化（BCL 字符串体系）。
- **解决什么问题**：字符串是 C# 程序里占比最大的对象类型，也是性能事故与国际化 bug 的双料高发区：日志里循环 `+=` 拖垮接口、`ToUpper()` 在土耳其语机器上把 `i` 变成 `İ` 导致比较失败、JSON 协议解析每个字段都复制一遍内存。本文给出系统答案：不可变模型的推论、StringBuilder 的收益边界、文化敏感的正确开关、格式化的全部形态。
- **什么时候用到**：拼日志/SQL/报文时；解析协议与文本时；任何要跨语言环境部署的字符串比较与排序；构造用户可见文案时。

模块内此前无字符串专篇（StringBuilder 等在 15 个文件零散使用）。例子主线：日志拼接性能对比（衔接 [性能与基准测试](/csharp/400-DotnetPerformanceBenchmarking)）、游戏协议报文解析（与 [Span 与 Memory](/csharp/230-SpanMemory) 的零拷贝互相引用）、多语言排序。

## 1. 心智模型：string 是不可变的引用类型

```csharp
string a = "hello";
string b = a.ToUpper();   // a 原封不动；b 是全新字符串
a.Replace('l', 'L');      // 返回值被丢弃——这行什么也没改变
```

三条由不可变性推出的纪律：

1. **所有「修改」方法都返回新串**：`Replace`/`ToUpper`/`Substring`/`Trim` 全是纯函数。新手最高频 bug 是 `s.Replace(...)` 忘了接返回值——它不报错，只是悄悄什么都不做。
2. **拼接 N 次产生 N 个中间串**：`s += x` 每次都分配新串并复制旧内容，循环拼接是 O(n^2) 的内存搬运。这正是 StringBuilder 存在的理由（§2）。
3. **字面量被驻留（interning）**：编译期相同的字符串字面量在进程里只有一份，`"abc" is object o && o == "abc"` 为真；但运行期拼出来的串不驻留（`string.Intern` 可手动入池）。驻留解释了为什么引用比较 `ReferenceEquals` 对字面量成立、对拼接结果不成立——**比较内容永远用 `==`（被重载为值比较）或 `Equals`，永远不要用 `ReferenceEquals`**。

## 2. StringBuilder：什么时候才划算

```csharp
// 反模式：循环拼接 string —— n 次循环分配 n 个中间串
string log = "";
foreach (var entry in entries)
    log += $"{entry.Timestamp:O} [{entry.Level}] {entry.Message}\n"; // 每轮全量复制

// 正解：StringBuilder 复用内部缓冲区
var sb = new StringBuilder(entries.Count * 64); // 可预估时给初始容量，避免反复扩容
foreach (var entry in entries)
    sb.Append(entry.Timestamp.ToString("O"))
      .Append(" [").Append(entry.Level).Append("] ")
      .AppendLine(entry.Message);
string log2 = sb.ToString();
```

- 收益边界经验值：**循环里拼 3 次以上、或总量上万字符，用 StringBuilder**；拼两三个片段直接插值（`$"a{b}c"`）反而更快——StringBuilder 自身的对象分配与扩容管理在小事上得不偿失；
- `Append` 链式调用优于连续 `Append($"...")`：插值版本内部还要走格式化解析；对确定没有格式占位符的内容用 `Append((ReadOnlySpan<char>)value)` 或原始 `Append(string)`；
- 追加循环写日志时注意 **每次 Append 的对象分配**：`entry.Timestamp.ToString("O")` 每轮新建一个字符串不可避免，但可以用 `sb.AppendFormattable(timestamp, "O")`（.NET 8+）让格式化直接写进缓冲区，零中间串；
- 验证手段不是背结论而是量：用 BenchmarkDotNet 对比两种写法的分配字节数（见 [性能与基准测试](/csharp/400-DotnetPerformanceBenchmarking) 的基准方法学），n=10 与 n=100000 的结论完全不同。

## 3. StringComparison 与文化陷阱

字符串比较有两个独立维度：**是否区分大小写** 与 **是否文化敏感**。默认行为在不同 API 上不一致，是国际化 bug 的根源：

```csharp
// 危险：文化敏感比较（ToString/IndexOf/Compare 默认行为）
"userADMIN".ToUpper() == "USERADMIN"          // 土耳其语机器上为 false！
//   土耳其语中 'i' 的大写是 'İ'（U+0130），不是 'I'

// 正解一：协议/标识符/枚举名 —— 序数比较（按码位逐字符比）
string.Equals(userInput, "userAdmin", StringComparison.Ordinal);
userInput.StartsWith("btn_", StringComparison.Ordinal);
name.ToUpperInvariant() == "ADMIN";            // 需要 Unicode 规范化时用 Invariant 版

// 正解二：用户可见文本排序 —— 文化敏感比较
names.Sort(StringComparer.CurrentCulture);     // 按用户区域设置排序
```

四象限选型表（背下来）：

| 场景 | 选择 | 理由 |
| --- | --- | --- |
| 协议字段、文件扩展名、枚举/配置键 | `Ordinal` 或 `OrdinalIgnoreCase` | 码位即语义，与语言环境无关 |
| 用户输入匹配内部标识（登录名） | `OrdinalIgnoreCase` 或规范化后 `Ordinal` | 安全且快 |
| 向用户展示的排序列表 | `CurrentCulture` | 尊重用户语言排序习惯（如拼音/五十音） |
| 跨机器持久化的排序结果 | `InvariantCulture` | 换机器结果一致 |

- 性能注脚：`Ordinal` 最快（ memcmp 级），文化比较慢一个数量级以上——把 Ordinal 用在所有「非人类阅读」的比较上同时是正确性与性能的双赢；
- .NET 5+ 新项目建议在 csproj 开 `<InvariantGlobalization>true</InvariantGlobalization>`（服务器场景，无多语言排序需求时），从根上消灭文化差异——代价是 `CurrentCulture` 退化为 Invariant，做面向消费者的多语言产品不要开。

## 4. 格式化与插值

### 4.1 三种形态与取舍

```csharp
var price = 1234.5m;
var now = DateTime.Now;

// 1. 复合格式化：参数有序，适合资源文件中的模板
string s1 = string.Format(CultureInfo.CurrentCulture, "总价：{0:C}", price);

// 2. 字符串插值：默认形态，编译器按上下文展开为 string.Format 或 AppendFormat
string s2 = $"总价：{price:C}";

// 3. 插值 + CultureInfo 显式指定：序列化/协议场景必须锁文化
string s3 = string.Create(CultureInfo.InvariantCulture, $"{{\"price\":{price}}}");
```

- 插值串里**输出花括号要双写**：`$"{{ {x} }}"` 产出 `{ 值 }`——忘了双写是格式化报错的高频来源；
- `{price:C}` 的 `C`（货币）、`F2`（定点）、`O`（ISO 8601 时间）等格式符是文化敏感的：同一行代码在中文机器输出 `¥1,234.50`、美式机器输出 `$1,234.50`。**给机器看的数据（写文件、进协议、进日志供解析）一律 `InvariantCulture`；给人看的才用 CurrentCulture**；
- 对齐与宽度：`{name,10}` 右对齐宽 10、`{name,-10}` 左对齐——控制台表格输出用。

### 4.2 原始字符串字面量与 UTF-8 字面量（C# 11+）

```csharp
// 原始字符串：JSON/正则/路径不再被转义地狱折磨
var json = """
    {
      "name": "flower-card",
      "tags": ["garden", "rogue"]
    }
    """;

var pattern = """^\d{4}-\d{2}-\d{2}$"""; // \d 不需要写成 \\d

// u8：UTF-8 字节序列字面量（ReadOnlySpan<byte>），零编码转换
ReadOnlySpan<byte> magic = "SRNET1"u8; // 直接就是字节，为 Span/协议解析而生
```

- `"""` 原始字符串里引号与反斜杠都按字面处理，行首缩进按结束定界符的位置剥离——写嵌入 JSON 的测试用例再也不用 `\"` 连环；
- `"..."u8` 产出 UTF-8 字节（编译期常量），配合 `Span<byte>` 做协议解析时省掉一次 UTF-16 -> UTF-8 转换，是 C# 11 给高性能 IO 的礼物（详见 [Span 与 Memory](/csharp/230-SpanMemory)）。

## 5. 三个真实工程例子

### 5.1 日志拼接：从 O(n^2) 到结构化日志

```csharp
// 反模式：先拼大字符串再交日志库 —— 拼接成本白花，且等级过滤形同虚设
logger.Information(BuildLongDebugString(state)); // Debug 关了也照样拼

// 正解：结构化日志模板 —— 占位符延迟求值，级别开关在拼接之前
logger.LogInformation("订单 {OrderId} 状态从 {From} 变为 {To}", order.Id, oldStatus, newStatus);
```

- 结构化日志库（Serilog/NLog）保留字段为属性而不是字符串片段，检索时能按 `OrderId` 过滤——拼接版日志只能 LIKE 全文扫；
- 热路径日志再加护栏：`if (logger.IsEnabled(LogEventLevel.Debug))` 跳过昂贵的状态转储；
- 性能验收标准见 [性能与基准测试](/csharp/400-DotnetPerformanceBenchmarking)：日志这类「看似无害」的字符串操作是内存分配剖析（Allocation 列）里的常客。

### 5.2 协议报文解析：零拷贝 substring 替代品

联机游戏的报文格式 `类型|长度|载荷`，朴素写法每个字段都 `Split` 出新字符串：

```csharp
// 朴素版：Split 分配数组 + 每个字段一个新串（每帧解析上百条时分配可观）
string[] parts = raw.Split('|');
string type = parts[0];

// 进度版：ReadOnlySpan 切片 —— 视图而非拷贝
ReadOnlySpan<char> span = raw;
int sep = span.IndexOf('|');
ReadOnlySpan<char> type = span[..sep];

// 高频路径终极版：服务端定长头 + UTF-8 字节直查
ReadOnlySpan<byte> payload = utf8Bytes[HeaderSize..];
if (payload.StartsWith("MOVE"u8)) { /* ... */ }
```

- `Split` 的问题不在「慢」而在「分配」：GC 压力在每帧数百条报文的实时场景累积成卡顿尖峰；
- Span 切片是原字符串上的窗口，零分配；代价是切片不能存字段（栈上数据），要留存就 `new string(span)` 明确拷贝一次——这个约束反而逼你写清数据流向；
- 完整的 Span 生命周期与 `fixed`/`stackalloc` 细节见 [Span 与 Memory](/csharp/230-SpanMemory)；本例只想说明：**字符串处理的高阶形态是「尽量不产生新字符串」**。

### 5.3 多语言排序：花名册的正确顺序

游戏好友列表同时含中文、日文与英文名，`Ordinal` 排序会把「中文名按码位排」——用户视角完全乱序：

```csharp
// 码位序：山(U+5C71) 排在 A 之后 B 之前——用户认为错乱
roster.Sort((a, b) => string.CompareOrdinal(a.Name, b.Name));

// 文化序：按当前用户语言习惯排序（中文系统下大致按拼音）
roster.Sort((a, b) => string.Compare(a.Name, b.Name, StringComparison.CurrentCulture));

// 搜索匹配同时要两种：显示用文化序，过滤前缀用 OrdinalIgnoreCase
var hits = roster
    .Where(r => r.Name.StartsWith(query, StringComparison.OrdinalIgnoreCase))
    .OrderBy(r => r.Name, StringComparer.CurrentCulture)
    .ToList();
```

- 「过滤用 Ordinal、展示用 Culture」是国际化列表的标准组合：匹配要快且稳定，排序要合用户预期；
- 排序结果要持久化（服务端统一榜单）时用 `InvariantCulture` 并在文档里写明，否则不同区域机器产出的顺序不同，客户端比对 diff 会怀疑人生。

## 6. 动手实践

练习任务：实现一个 `ChatLog` 类，要求：

1. `Append(player, message)` 追加一行，格式 `HH:mm:ss [玩家名] 消息`（时间用 InvariantCulture 格式化，供回放解析）；
2. `Export()` 返回全文：聊天超过 500 行时不得使用 `+=` 拼接；
3. `FindAll(keyword)` 大小写不敏感搜索（协议语义，用 OrdinalIgnoreCase）；
4. 基准题：用 BenchmarkDotNet 对比「string += 循环 1000 行」与「StringBuilder」的分配字节，把结果写进注释。

提示：行数已知时 `StringBuilder(int capacity)` 给足初始容量；时间格式化用 `DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture)`。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```csharp
using System.Globalization;
using System.Text;

public sealed class ChatLog
{
    private readonly List<(DateTime Time, string Player, string Message)> _lines = new();

    public void Append(string player, string message) =>
        _lines.Add((DateTime.Now, player, message));

    public string Export()
    {
        // 预估每行 ~64 字符，一次到位避免扩容
        var sb = new StringBuilder(_lines.Count * 64);
        foreach (var (time, player, message) in _lines)
        {
            sb.Append(time.ToString("HH:mm:ss", CultureInfo.InvariantCulture))
              .Append(" [").Append(player).Append("] ")
              .AppendLine(message);
        }
        return sb.ToString();
    }

    public IReadOnlyList<string> FindAll(string keyword) =>
        _lines.Where(l => l.Message.Contains(keyword, StringComparison.OrdinalIgnoreCase))
              .Select(l => $"{l.Time:HH:mm:ss} [{l.Player}] {l.Message}")
              .ToList();
}

/* 基准注释示例（BenchmarkDotNet 实测格式）：
 * | Method          |     Mean |   Allocated |
 * | string_concat   | 41.2 us  |   1,204,832 B |  += 循环 1000 行：20+ 次翻倍扩容
 * | string_builder  |  8.7 us  |      65,376 B |  一次缓冲 + 一次 ToString
 */
```

自检：`Export` 只分配一次缓冲与一个结果串；`FindAll` 的匹配语义是 OrdinalIgnoreCase（不随机器区域变化），而展示交给上层排序。

</details>

## 7. 常见陷阱速查

- **`s.Replace(...)` 不接返回值**：不可变 API 全是纯函数，必须 `s = s.Replace(...)`。
- **文化敏感的默认比较**：`ToUpper`/`Compare` 无参版本随机器区域变化；机器语义用 `Ordinal`/`ToUpperInvariant`。
- **循环 `+=` 拼接**：O(n^2) 分配；循环体拼 3 次以上换 StringBuilder 并给初始容量。
- **给机器的数据用 CurrentCulture 格式化**：换台机器小数点变逗号，JSON 直接解析失败；协议与持久化一律 Invariant。
- **插值里忘双写花括号**：`$"{"a"}"` 语法错或输出错，字面花括号写 `{{`。
- **用 `ReferenceEquals` 比字符串**：字面量驻留让它「碰巧对」，拼接结果立刻「错」；内容比较用 `==`。
- **把 Split 后的数组存进热路径集合**：每帧分配放大 GC 压力；解析场景考虑 Span 切片。

## 8. 小结

初学者要点：string 不可变，所有修改返回新串；循环拼接用 StringBuilder；比较先分清 Ordinal 与 Culture 两个维度；给人看的格式化随文化、给机器看的一律 Invariant。进阶注意：结构化日志占位符替代手工拼接；协议解析向 Span/UTF-8 字面量演进；原始字符串字面量治转义地狱；一切性能结论用 BenchmarkDotNet 实测。

## 参考与致谢

- Microsoft Learn：*C# strings - String chars, strings, and Unicode* 与 *Best practices for comparing strings*（CC-BY 4.0 / Microsoft 文档许可），https://learn.microsoft.com/dotnet/standard/base-types/best-practices-strings
- Microsoft Learn：*StringBuilder class* 与 *String interpolation*，https://learn.microsoft.com/dotnet/csharp/language-reference/tokens/interpolated
- Microsoft Learn：*Raw string literals* 与 *UTF-8 string literals*（C# 11），https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/reference-types
