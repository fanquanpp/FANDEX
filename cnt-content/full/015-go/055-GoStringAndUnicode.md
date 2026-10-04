---
order: 60
title: 字符串与 UTF-8：为什么 len("你好") 是 6
module: 'go'
category: 后端技术
difficulty: beginner
description: 以"昵称被截出乱码"为主线学 Go 字符串：string 是只读字节序列、rune 是码点、len 与 RuneCountInString 的分野、range 的字节下标语义、拼接的 O(n^2) 陷阱与 strings.Builder、strconv 转换全套，附坑点、自检与练习。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'go/050-GoDataStructure'
  - 'go/250-SlicePrinciple'
  - 'go/330-GoJSON'
  - 'go/110-GoStandardLibraryToolchain'
prerequisites:
  - 'go/040-GoFunctionMethod'
---

## 真实场景：截断昵称，截出了一串问号

产品要求把超长昵称截成 10 个字符再展示，你顺手写下 `name[:10]`。英文昵称一切正常；用户"摸鱼的猫本 concreto"注册后，界面出现了半截汉字和一个问号。数据库里存的还是合法的 UTF-8，问题出在 Go 这一层：你按**字节**下标切了一串按**字符**理解的内容，正好切在一个汉字编码的中间。

这一刀切出来的不是汉字也不是乱码文学，而是一段"不完整的 UTF-8 序列"。要预判这类事故，只需要建立一个心智模型：**Go 的 string 是只读的字节序列，不是字符数组**。本文把这句话的全部推论讲清楚。

## 动手第一步：亲手制造并观察这个 bug

```go
package main

import "fmt"

func main() {
    name := "摸鱼 hello"

    fmt.Println("len(name) =", len(name)) // 字节数
    fmt.Println("name[:10] =", name[:10]) // 按字节截断
    fmt.Printf("name[0] = %q\n", name[0]) // 下标取到的是 byte
}
```

一次典型的输出：

```text
len(name) = 12
name[:10] = 摸鱼 he
name[0] = '\xe6'
```

三个观察，三个推论：

1. `len(name)` 是 12 不是 7：每个汉字在 UTF-8 里占 3 个字节，"摸鱼"是 6 字节加空格与 hello 的 6 字节；
2. 这次截断恰好落在字节边界上所以侥幸没花，把 10 改成 8 再跑——你会看到问号或替换符，因为切进了"鱼"字的编码中间；
3. `name[0]` 拿到的是 `0xe6`——"摸"字 UTF-8 编码的第一个字节。string 的下标运算返回 `byte`（uint8），仅此而已。

## 核心心智模型：字节、码点、字符三层

把三个概念分开，Go 字符串的一切行为都能推出来：

| 概念 | Go 里的名字 | 含义 | 例子（"鱼"） |
| --- | --- | --- | --- |
| 字节 byte | `byte`（uint8） | 8 位存储单元，string 的组成单元 | 编码的 3 个字节 |
| 码点 code point | `rune`（int32） | Unicode 字符表中的编号 | U+9C7C |
| 字符 | 无独立类型 | 人眼看到的书写单位 | 鱼 |

string 的内存布局与切片同理，是一个"指针 + 长度"的头（细节见 [Slice 原理](/go/250-SlicePrinciple)，string 只比 slice 少一个 cap 字段）。头里没有任何编码信息——Go 不关心你的字符串是英文、中文还是二进制数据，它只承诺：**内容是按 UTF-8 编码的字节序列**（Go 源码本身按语言规范就是 UTF-8 文本）。

```text
s := "鱼"

内存字节: E9 B1 9C        <- UTF-8 编码（3 字节）
码点:     U+9C7C          <- unicode.ToUpper/IsLetter 操作的对象
下标:     s[0] = 0xE9     <- byte
range:    i=0, r='鱼'     <- 字节下标 + 码点
```

于是所有"看起来矛盾"的 API 分野都有了统一解释：

- `len(s)`、`s[i]`、切片 `s[a:b]` 工作在**字节层**——它们不解码，快且不受内容影响；
- `for range`、`strings.ToUpper`、`utf8.RuneCountInString` 工作在**码点层**——它们逐字节解码 UTF-8 再交出码点。

## 码点层操作：range 与 RuneCountInString

`for range` 遍历字符串时，每次解码出一个码点，交出"该码点起始字节的下标"与"码点本身"：

```go
s := "鱼Go"

for i, r := range s {
    fmt.Printf("字节下标 %d, 码点 %c, 编码 %U\n", i, r, r)
}
```

```text
字节下标 0, 码点 鱼, 编码 U+9C7C
字节下标 3, 码点 G, 编码 U+0047
字节下标 4, 码点 o, 编码 U+006F
```

下标是 0、3、4 而不是 0、1、2——range 的下标永远是**字节下标**，这正是它可以直接用于切片 `s[i:]` 的原因。要"第几个字符"，用 `utf8.RuneCountInString` 计数，或一次性转 `[]rune`（每次转换都会分配新切片，热路径上优先用计数函数）：

```go
import (
    "unicode/utf8"
)

fmt.Println(utf8.RuneCountInString("鱼Go")) // 3
fmt.Println(len([]rune("鱼Go")))            // 3，但多付一次切片分配
```

## 动手第二步：非法 UTF-8 与容错解码

string 的承诺是"按 UTF-8 编码"，但没有机制**强制**它——你完全可能从文件、网络里读进一段坏数据。标准库对非法字节的处理是统一的：解码失败时交出 `utf8.RuneError`（U+FFFD，替换符），宽度记 1 字节：

```go
bad := string([]byte{0xE6, 0x96, 0x87, 0xFF, 'x'}) // 0xFF 是非法字节

for i, r := range bad {
    fmt.Printf("i=%d r=%q\n", i, r)
}
fmt.Println("字节数:", len(bad), "码点数:", utf8.RuneCountInString(bad))
fmt.Println("是否合法 UTF-8:", utf8.ValidString(bad))
```

```text
i=0 r='文'
i=3 r='\ufffd'
i=4 r='x'
字节数: 5 码点数: 3
是否合法 UTF-8: false
```

工程含义：处理外部输入前先用 `utf8.ValidString` 校验；需要"清洗"时逐码点过滤 `r == utf8.RuneError`。这也回头解释了开头的截断事故——`name[:8]` 切出的碎片在展示端同样表现为 U+FFFD。**按码点截断**的正确写法：

```go
func TruncateByRunes(s string, n int) string {
    if utf8.RuneCountInString(s) <= n {
        return s
    }
    for i := range s { // i 依次取每个码点的起始字节下标
        if n == 0 {
            return s[:i] // 字节下标必然落在边界上，切出来仍是合法 UTF-8
        }
        n--
    }
    return s
}
```

## 拼接与转换的性能心智模型

string 不可变：任何"修改"都产生新串。循环里用 `+` 拼接是典型的 O(n^2)——每次都为"旧内容 + 新内容"分配并复制一份。标准库给的答案是 `strings.Builder`（Go 1.10 起），内部按需扩容缓冲，最后一次性取出结果：

```go
// 反例：O(n^2)，一万个片段就是一万次整串复制
var s string
for _, p := range parts {
    s += p
}

// 正解：O(n) 摊销，Builder 不可复制（编译器会拦住误用）
var b strings.Builder
b.Grow(estimate) // 已知大小时预分配，再省一轮扩容
for _, p := range parts {
    b.WriteString(p)
}
result := b.String()
```

字节与字符串互转是复制不是视图：`[]byte(s)` 复制出一份数据，`string(b)` 再复制回来。代价在热路径上不可忽略（这也是 [GC 与调优](/go/290-GCAndTuning) 关注的分配来源之一），但换来的是安全性——两边互不影响。某些标准库函数对 `[]byte(s)` 做了避免复制的特例（如 map 查找的 key），日常不必依赖，遇到再用。

转换三兄弟 `strconv` 与打印家族的分工：程序内部用 `int`/`float64`，边界处才转字符串：

```go
n, err := strconv.Atoi("42")          // string -> int，带错误返回（输入可能不是数字）
s1 := strconv.Itoa(42)                // int -> string
f, err := strconv.ParseFloat("3.14", 64)
s2 := strconv.FormatFloat(3.14, 'f', 2, 64) // 固定两位小数
s3 := fmt.Sprintf("%d 元", 42)        // 多变量格式化，比 strconv 灵活但更慢
```

一个历史悠久的坑：`string(65)` 不产出 "65"，而是码点 65 对应的字符 "A"——因为 `int` 到 `string` 的转换按码点解码。Go 1.15 起 `go vet` 会对这种写法报错提示，但规则要记在心里：**要数字的十进制文本用 `strconv`，要码点对应的字符才用 `string(rune)`**。

```go
string(65)          // "A"（按码点解释）
string(rune(65))    // "A"，显式写法，意图清晰
strconv.Itoa(65)    // "65"（想要的一般是这个）
```

## strings 包速览与 unicode 判断

日常九成的字符串处理，`strings` 包就够（完整清单见 [标准库与工具链](/go/110-GoStandardLibraryToolchain)）：

```go
strings.Contains(s, "go")        // 是否包含
strings.HasPrefix(s, "http")     // 前缀判断（常与 HasSuffix 一起用于路由/文件名）
strings.Index(s, "go")           // 子串首次出现的字节下标，没有返回 -1
strings.Fields(s)                // 按任意空白切分（比 Split(" ") 更能处理多空格）
strings.Split(s, ",")            // 按分隔符切分
strings.Join(parts, ",")         // 拼回
strings.TrimSpace(s)             // 去两端空白
strings.ReplaceAll(s, "a", "b")  // 全量替换；Replace 可限次数
strings.Cut(s, "=")              // 1.18 起：按首个分隔符切成前后两段，自带是否找到
```

`ToUpper`/`ToLower` 按码点工作，"ñAlB" 这类带重音的文本也能正确处理。逐码点的字符分类在 `unicode` 包：`unicode.IsLetter`、`unicode.IsDigit`、`unicode.IsUpper`。一个要预算的真实约束：**"字符"没有统一宽度**——同一个字母的"大写"在 Unicode 里可能占两个码点（如 "ß" 的大写是 "SS"），东亚全角字符宽度是 ASCII 的两倍。做"最多显示 N 个字符"的对齐时，显示宽度与码点数、字节数是三件不同的事。

## 坑点与自检

**坑 1：`len` 当字符数用。** 所有用户可见的"长度"（昵称、标题、验证码位数）一律 `utf8.RuneCountInString`；`len` 只用于字节层预算（缓冲区大小、协议长度字段）。

**坑 2：按字节切片截断。** 任何 `s[:n]` 之前问一句：n 是字节下标还是第 n 个字符？字符串与字节序列互转（如哈希、签名）不受影响，展示类逻辑全部走码点。

**坑 3：字节层反转毁掉多字节字符。** 反转 `"你好"` 的字节序列会得到非法 UTF-8。正确做法是先 `[]rune` 再反转：

```go
rs := []rune("你好")
for i, j := 0, len(rs)-1; i < j; i, j = i+1, j-1 {
    rs[i], rs[j] = rs[j], rs[i]
}
fmt.Println(string(rs)) // 好你
```

**坑 4：比较语义当"看起来相等"。** `==` 是逐字节比较。同一个"é"可以由一个码点（U+00E9）或"e + 组合重音符"（U+0065 U+0301）两种编码构成，字节不同、显示相同。需要规范化时用 `golang.org/x/text/unicode/norm`，不要自己写映射表。

**坑 5：range 中修改"当前字符"。** string 不可变，`for i, r := range s` 里给 r 赋值只改局部变量。要改内容就构造新串（Builder 或 `[]byte` 中转），没有原地修改这回事。

自检——能不看文档回答这些吗：

1. `len("Go语言")` 是多少？`utf8.RuneCountInString` 呢？（动手验证）
2. `for i, r := range s` 的 i 和 r 各是什么？为什么 i 可以直接用于 `s[i:]`？
3. `string(65)` 与 `strconv.Itoa(65)` 的区别是什么？vet 在哪种情况下报警？
4. `[]byte(s)` 之后修改字节，s 会变吗？为什么？
5. 循环拼接十万段文本，用什么结构？为什么 `+` 是 O(n^2)？
6. 用户输入的字符串可能是非法 UTF-8，你会在哪个环节、用什么函数拦住它？

## 练习

以下练习先只读任务与提示，自己写完再对参考实现。

1. **字符统计器**：读入一行文本，分别输出字节数、码点数、字母数、数字数。提示：`bufio.Scanner` 读行；四个数字分别属于字节层与码点层；字母数字判断用 `unicode.IsLetter`/`unicode.IsDigit`。

参考实现：

```go
package main

import (
    "bufio"
    "fmt"
    "os"
    "unicode"
    "unicode/utf8"
)

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    scanner.Scan()
    s := scanner.Text()

    letters, digits := 0, 0
    for _, r := range s { // 码点层遍历
        switch {
        case unicode.IsLetter(r):
            letters++
        case unicode.IsDigit(r):
            digits++
        }
    }
    fmt.Println("字节:", len(s))
    fmt.Println("码点:", utf8.RuneCountInString(s))
    fmt.Println("字母:", letters)
    fmt.Println("数字:", digits)
}
```

2. **安全截断函数**：实现 `TruncateByRunes`（上文已给一版）的表驱动测试版本：至少覆盖英文、中文、emoji（emoji 由多个码点组成，属于"显示宽度"的高级问题，测试里注明这一局限）、空串、n 大于总码点数五种情况。提示：用 `go test` 的表格驱动写法；断言输出 `utf8.ValidString` 必须为真。

参考实现（测试骨架）：

```go
func TestTruncateByRunes(t *testing.T) {
    cases := []struct {
        in   string
        n    int
        want string
    }{
        {"hello", 3, "hel"},
        {"摸鱼", 1, "摸"},
        {"摸鱼", 5, "摸鱼"},   // n 超出总数
        {"", 2, ""},
        {"a鱼b", 2, "a鱼"}, // 边界落在多字节码点之后
    }
    for _, c := range cases {
        got := TruncateByRunes(c.in, c.n)
        if got != c.want {
            t.Errorf("Truncate(%q,%d) = %q, want %q", c.in, c.n, got, c.want)
        }
        if !utf8.ValidString(got) {
            t.Errorf("结果不是合法 UTF-8: %q", got)
        }
    }
}
```

3. **性能对比**：写一个基准测试，分别用 `+` 与 `strings.Builder` 拼接 1 万段短文本，跑 `go test -bench` 记录耗时与分配次数（`-benchmem`），把结论写成三行注释。提示：见 [单元测试与基准测试](/go/360-UnitTestBenchmark) 的基准写法。

参考实现：

```go
func BenchmarkPlusConcat(b *testing.B) {
    parts := make([]string, 10000)
    for i := range parts {
        parts[i] = "片段"
    }
    b.ReportAllocs()
    for b.Loop() {
        var s string
        for _, p := range parts {
            s += p
        }
        _ = s
    }
}

func BenchmarkBuilderConcat(b *testing.B) {
    parts := make([]string, 10000)
    for i := range parts {
        parts[i] = "片段"
    }
    b.ReportAllocs()
    for b.Loop() {
        var bd strings.Builder
        bd.Grow(len(parts) * len("片段")) // 字节层预算正是 len 的正确用法
        for _, p := range parts {
            bd.WriteString(p)
        }
        _ = bd.String()
    }
}
```

预期结论：Builder 版耗时低一个数量级以上，分配次数从 O(n) 降到个位数；差距随片段数扩大。

4. **挑战题**：实现 `FirstUniqueRune(s string) rune`，返回第一个只出现一次的码点（没有则返回 0）。要求两次遍历内完成。提示：第一次 `for range` 用 `map[rune]int` 计数，第二次找计数为 1 的码点；注意返回 0 表示"不存在"时，调用方拿到的 `rune(0)` 与真实 NUL 码点会混淆——想想怎么向调用方表达"没有"（布尔第二返回值是 Go 的惯用解法）。

## 与之前和之后的知识的关系

- 往前：[函数与方法](/go/040-GoFunctionMethod) 让你有了组织代码的能力，本文处理的是最常见的数据输入；string 的"指针 + 长度"头与 [Slice 原理](/go/250-SlicePrinciple) 的切片头同构，读完那篇再回头看本篇的字节层操作会更透；
- 往后：JSON 编解码（[Go JSON](/go/330-GoJSON)）与正则（[Go 正则](/go/410-GoRegex)）都建立在"UTF-8 字节序列"这个模型上——它们按字节匹配、按码点解释的边界行为，正是本篇的推论。

## 官方文档

- Strings, bytes, runes and characters in Go（官方博客，本文的权威参照）：https://go.dev/blog/strings
- strings 包文档：https://pkg.go.dev/strings
- strconv 包文档：https://pkg.go.dev/strconv
- unicode/utf8 包文档：https://pkg.go.dev/unicode/utf8

## 自我检查

- 能不看资料说出 len / RuneCountInString / 显示宽度三者的区别与各自用途；
- 能解释 range 的字节下标为什么可以安全用于切片；
- 能写出安全截断与码点层反转，并说出它们为什么不会产生非法 UTF-8；
- 能说出 `+` 与 `strings.Builder` 的复杂度差异并跑出数据。

## 本章总结

Go 字符串是只读的 UTF-8 字节序列：字节层（len、下标、切片）快而不解码，码点层（range、strings/unicode、utf8 包）解码而慢一步。截断乱码、反转毁字、`string(65)` 陷阱、拼接 O(n^2)，全部是"字节与码点两层没分清"这一个根源的不同投影。分清两层，字符串 API 就从咒语变成了推论。

## 下一步

- string 头与切片头的同构：[Slice 原理](/go/250-SlicePrinciple)；
- 结构体标签如何驱动 JSON 编解码：[Go JSON](/go/330-GoJSON)；
- 把文本处理组合成完整工具：[标准库与工具链](/go/110-GoStandardLibraryToolchain)。
