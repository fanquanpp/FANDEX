---
order: 69
title: Go与JSON
module: go
category: Go
difficulty: beginner
description: encoding/json详解
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与数据库
  - go/Go与HTTP服务器
  - go/Go与HTTP客户端
  - go/Go与Redis
prerequisites:
  - go/概述与环境配置
---

## 学习目标

完成本章学习后,读者应能够在以下 Bloom 认知层级达到对应能力:

- **记忆(Memory)**:复述 JSON 标准的六种数据类型(null/boolean/number/string/array/object),`encoding/json` 包的 Marshal/Unmarshal/Encoder/Decoder API 签名,常见结构体标签(`json:"name,omitempty,omitempty"`)的语义。
- **理解(Understanding)**:解释 Go 结构体与 JSON 之间的双向映射规则,反射在序列化过程中的角色,流式编码(Encoder/Decoder)与一次性编码(Marshal/Unmarshal)的区别与适用场景。
- **应用(Application)**:使用结构体标签、自定义 MarshalJSON/UnmarshalJSON、json.RawMessage、json.Decoder 等机制处理真实场景下的复杂 JSON 数据,如配置文件、API 请求/响应、流式日志。
- **分析(Analysis)**:对照 `go tool pprof` 与 benchmark 结果,识别 JSON 序列化的反射开销、内存分配热点、字节切片扩容代价,定位性能瓶颈。
- **评价(Evaluation)**:对比 `encoding/json`、`jsoniter`、`easyjson`、`sonic`、`go-json` 等多种 JSON 库的性能、易用性、兼容性,在标准库与第三方库之间做出合理选择。
- **创造(Creation)**:为高 QPS API 服务设计一套包含零拷贝解析、对象池化、流式处理的 JSON 序列化方案,并通过压测验证 P99 延迟低于 1ms。

## 历史动机与背景

### JSON 的诞生与流行

JSON(JavaScript Object Notation)由 Douglas Crockford 在 2001 年正式命名并推广,但其语法源自 JavaScript 的对象字面量,可追溯至 Netscape Navigator 2.0(1995 年)。JSON 设计目标:

- **轻量**:相比 XML,去除标签冗余,体积更小。
- **可读**:纯文本,人类可读,易于调试。
- **跨语言**:与语言无关,任意现代语言都有解析器。
- **简单**:仅 6 种数据类型,语法规范不超过一页。

随着 RESTful API 在 2005 年前后成为 Web 服务的事实标准,JSON 取代 XML 成为数据交换的首选格式。今天的微服务、移动应用、IoT 设备、配置文件,JSON 都占据主导地位。

### Go encoding/json 的设计哲学

Go 标准库的 `encoding/json` 包于 2009 年随 Go 1.0 发布,设计原则:

1. **标准优先**:严格遵循 RFC 7159(现 RFC 8259)规范。
2. **反射驱动**:零配置即可工作,通过结构体标签定制。
3. **流式支持**:Encoder/Decoder 支持流式读写,适合大数据。
4. **可扩展**:支持自定义 MarshalJSON/UnmarshalJSON。
5. **安全**:默认禁用 JavaScript 中的 `<>` 字符,防止 XSS。

代价:反射开销显著,比手写解析器慢 5-10 倍。Go 团队保守地优先正确性而非性能,因此社区涌现了多个高性能 JSON 库。

### JSON 标准的局限与扩展

JSON 标准存在以下局限:

- **无注释**:不支持 `//` 或 `/* */`,配置文件场景不便。
- **无多行字符串**:字符串不能跨行,长文本场景需 `\n` 转义。
- **数字精度**:JavaScript Number 是 64 位浮点,大整数丢失精度。
- **无日期类型**:需用字符串约定格式(ISO 8601)。

针对这些局限,出现了 JSON5、HJSON、YAML 等扩展。Go 标准库仅支持标准 JSON,第三方库提供扩展支持。

## 形式化定义

### JSON 文法的形式化

JSON 文法(BNF 范式简化版):

```
value   ::= null | true | false | number | string | array | object
null    ::= "null"
true    ::= "true"
false   ::= "false"
number  ::= int frac? exp?
int     ::= "-"? digit+ (digit | "." | "e" | "E" | "+" | "-")*
string  ::= '"' char* '"'
char    ::= unicode | escape
escape  ::= "\" ("\"" | "\" | "/" | "b" | "f" | "n" | "r" | "t" | "u" hex4)
array   ::= "[" (value ("," value)*)? "]"
object  ::= "{" (pair ("," pair)*)? "}"
pair    ::= string ":" value
```

### Go 与 JSON 类型映射

| Go 类型 | JSON 类型 | 备注 |
|---------|-----------|------|
| `bool` | `boolean` | 双向映射 |
| `int/int8/.../int64` | `number` | 大整数精度有限 |
| `uint/.../uint64` | `number` | 同上 |
| `float32/float64` | `number` | 默认 float64 |
| `string` | `string` | UTF-8 |
| `[]T` | `array` | 任意嵌套 |
| `[]byte` | `string` | Base64 编码 |
| `struct` | `object` | 字段名转 JSON |
| `map[string]T` | `object` | key 必须为 string |
| `nil (pointer/slice/...)` | `null` | |
| `interface{}` | 任意 | 动态类型 |

### 结构体标签的形式语法

```ebnf
Tag ::= "json:" "\"" FieldName ("," Option)* "\""
FieldName ::= identifier | "-"
Option ::= "omitempty" | "string" | "omitempty"
```

### 序列化的代数语义

设序列化函数 $M: \text{Go Value} \to \text{JSON Bytes}$,反序列化 $U: \text{JSON Bytes} \to \text{Go Value}$。理想情况下:

$$
U(M(v)) = v \quad \text{(左逆)}
$$

但实际上,由于类型丢失(如 `int` 与 `int64` 都映射到 `number`),严格左逆不成立。Go 通过类型断言、interface 类型保留类型信息。

## 理论推导

### 反射开销的下界

`encoding/json` 使用 `reflect` 包遍历结构体字段。每次访问字段的成本:

- `reflect.Value.Field(i)`:O(1),但涉及 interface 装箱。
- `reflect.Value.String()`:O(1),但 string header 复制。
- `reflect.Value.Int()`:O(1),但需要类型检查。

理论下界:每个字段至少 100ns 反射开销。100 字段结构体的序列化至少 10μs。

### 内存分配模型

Marshal 的内存分配主要来自:

1. **输出 buffer**:初始 64B,翻倍扩容。
2. **string 转义**:特殊字符 `<`、`>`、`&`、`"`、`\` 需转义,可能分配新 buffer。
3. **interface 装箱**:值类型字段被装入 interface{}。

设结构体有 $n$ 字段,平均字段值长度 $L$,理论分配量:

$$
M_{\text{alloc}} \approx 64 \cdot 2^{\lceil \log_2(n \cdot L) \rceil} + n \cdot 16
$$

### 流式 vs 一次性

Marshal 一次性生成完整 JSON,内存占用 $O(N)$,$N$ 为输出大小。Encoder 流式写入,内存占用 $O(B)$,$B$ 为 buffer 大小(默认 4KB)。

大数据场景下,Encoder 节省内存 $N/B$ 倍。但 Encoder 不便于随机访问,适合顺序处理。

### unicode 转义策略

JSON 字符串中,非 ASCII 字符(>127)默认被转义为 `\uXXXX`。这保证输出 ASCII 兼容,但增加体积。Go 1.7+ 提供 `SetEscapeHTML(false)` 关闭 HTML 转义,但不影响 unicode 转义。

性能上,unicode 转义涉及 UTF-8 解码与十六进制编码,每个非 ASCII 字符额外 5 字节。中文字符串序列化后体积可能扩大 3 倍。

## 代码示例

### 示例 1:基础序列化与反序列化

```go
// 文件: json_basic.go
// 演示 encoding/json 的基础用法
package main

import (
	"encoding/json"
	"fmt"
)

// User 用户结构体
// json 标签控制字段名与行为
type User struct {
	ID        int    `json:"id"`                   // 字段重命名
	Name      string `json:"name"`                 // 必须输出
	Email     string `json:"email,omitempty"`      // 空值省略
	Age       int    `json:"age,omitempty"`        // 零值省略
	Password  string `json:"-"`                    // 永不输出
	Avatar    string `json:"avatar,omitempty"`     // 空值省略
	CreatedAt int64  `json:"created_at"`           // snake_case
}

func main() {
	u := User{
		ID:        1,
		Name:      "Alice",
		Email:     "alice@example.com",
		Age:       0, // 零值,因 omitempty 不输出
		Password:  "secret",
		CreatedAt: 1700000000,
	}

	// 序列化
	data, err := json.Marshal(u)
	if err != nil {
		fmt.Println("Marshal error:", err)
		return
	}
	fmt.Println("JSON:", string(data))

	// 反序列化
	jsonStr := `{"id":2,"name":"Bob","email":"bob@example.com","age":25,"created_at":1700000001}`
	var u2 User
	if err := json.Unmarshal([]byte(jsonStr), &u2); err != nil {
		fmt.Println("Unmarshal error:", err)
		return
	}
	fmt.Printf("Decoded: %+v\n", u2)
}
```

### 示例 2:嵌套结构与动态字段

```go
// 文件: json_nested.go
// 演示嵌套结构、map[string]interface{}、json.RawMessage
package main

import (
	"encoding/json"
	"fmt"
)

// Payload API 响应包装
type Payload struct {
	Type string          `json:"type"`           // 类型标识
	Data json.RawMessage `json:"data"`           // 延迟解析
	Meta map[string]any  `json:"meta,omitempty"` // 动态元数据
}

// TextMessage 文本消息
type TextMessage struct {
	Text string `json:"text"`
}

// ImageMessage 图片消息
type ImageMessage struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// DecodePayload 根据类型分发解析
func DecodePayload(raw []byte) (any, error) {
	var p Payload
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, err
	}

	switch p.Type {
	case "text":
		var m TextMessage
		if err := json.Unmarshal(p.Data, &m); err != nil {
			return nil, err
		}
		return m, nil
	case "image":
		var m ImageMessage
		if err := json.Unmarshal(p.Data, &m); err != nil {
			return nil, err
		}
		return m, nil
	default:
		return nil, fmt.Errorf("unknown type: %s", p.Type)
	}
}

func main() {
	// 模拟接收到的 JSON
	raw := []byte(`{
		"type": "image",
		"data": {"url": "http://example.com/1.png", "width": 800, "height": 600},
		"meta": {"trace_id": "abc123", "ts": 1700000000}
	}`)

	result, err := DecodePayload(raw)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Printf("Decoded: %+v\n", result)
}
```

### 示例 3:自定义序列化

```go
// 文件: json_custom.go
// 演示 MarshalJSON/UnmarshalJSON 自定义
package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// FlexibleTime 自定义时间类型,支持多种格式
type FlexibleTime struct {
	time.Time
}

// MarshalJSON 输出 Unix 时间戳
func (ft FlexibleTime) MarshalJSON() ([]byte, error) {
	return []byte(strconv.FormatInt(ft.Unix(), 10)), nil
}

// UnmarshalJSON 解析多种格式:Unix 时间戳、ISO 8601
func (ft *FlexibleTime) UnmarshalJSON(data []byte) error {
	s := strings.Trim(string(data), `"`)
	if s == "null" || s == "" {
		return nil
	}

	// 尝试 Unix 时间戳
	if ts, err := strconv.ParseInt(s, 10, 64); err == nil {
		ft.Time = time.Unix(ts, 0)
		return nil
	}

	// 尝试 RFC3339
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		ft.Time = t
		return nil
	}

	return fmt.Errorf("cannot parse time: %s", s)
}

// Money 货币类型,以"分"存储,以"元"输出
type Money struct {
	Cents int64
}

func (m Money) MarshalJSON() ([]byte, error) {
	yuan := float64(m.Cents) / 100.0
	return []byte(strconv.FormatFloat(yuan, 'f', 2, 64)), nil
}

func (m *Money) UnmarshalJSON(data []byte) error {
	var f float64
	if err := json.Unmarshal(data, &f); err != nil {
		return err
	}
	m.Cents = int64(f * 100)
	return nil
}

// Order 订单结构
type Order struct {
	ID        string       `json:"id"`
	Amount    Money        `json:"amount"`
	CreatedAt FlexibleTime `json:"created_at"`
}

func main() {
	o := Order{
		ID:        "ORD001",
		Amount:    Money{Cents: 9999},
		CreatedAt: FlexibleTime{time.Unix(1700000000, 0)},
	}

	data, _ := json.Marshal(o)
	fmt.Println("Serialized:", string(data))

	var o2 Order
	json.Unmarshal(data, &o2)
	fmt.Printf("Deserialized: %+v\n", o2)
}
```

### 示例 4:流式编码与解码

```go
// 文件: json_stream.go
// 演示 json.Encoder 与 json.Decoder 处理大文件
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
)

// LogEntry 日志条目
type LogEntry struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	Time    int64  `json:"time"`
}

// WriteLogsNDJSON 写入 NDJSON(Newline Delimited JSON)
// 每行一个 JSON 对象,适合日志流
func WriteLogsNDJSON(w io.Writer, entries []LogEntry) error {
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false) // 关闭 HTML 转义,日志场景不需要
	for _, e := range entries {
		if err := encoder.Encode(e); err != nil {
			return err
		}
	}
	return nil
}

// ReadLogsNDJSON 从 NDJSON 流读取
// 使用流式 Decoder,避免一次性加载整个文件
func ReadLogsNDJSON(r io.Reader, handler func(LogEntry) error) error {
	decoder := json.NewDecoder(r)
	for decoder.More() {
		var e LogEntry
		if err := decoder.Decode(&e); err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}
		if err := handler(e); err != nil {
			return err
		}
	}
	return nil
}

func main() {
	// 准备测试数据
	entries := []LogEntry{
		{Level: "INFO", Message: "service started", Time: 1700000000},
		{Level: "WARN", Message: "high latency", Time: 1700000001},
		{Level: "ERROR", Message: "db connection lost", Time: 1700000002},
	}

	// 写入内存 buffer(实际可换成 os.File)
	var buf bytes.Buffer
	if err := WriteLogsNDJSON(&buf, entries); err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
	fmt.Println("NDJSON output:")
	fmt.Println(buf.String())

	// 流式读取
	fmt.Println("Reading stream:")
	ReadLogsNDJSON(&buf, func(e LogEntry) error {
		fmt.Printf("  [%s] %s @%d\n", e.Level, e.Message, e.Time)
		return nil
	})
}
```

### 示例 5:Tag 选项详解

```go
// 文件: json_tags.go
// 演示结构体标签的各种选项
package main

import (
	"encoding/json"
	"fmt"
)

// TagDemo 标签演示
type TagDemo struct {
	// 字段重命名
	FieldName string `json:"field_name"`

	// omitempty:零值时不输出
	OptionalField string `json:"optional,omitempty"`

	// string:数字字段以字符串形式输出(避免大数精度丢失)
	NumberAsString int64 `json:"number,string"`

	// -:永不输出
	Hidden string `json:"-"`

	// -,omitempty:不输出,但特殊场景下与 omitempty 冲突
	// 实际效果:此字段永不输出
	HiddenOmit string `json:"-,omitempty"`

	// 空标签:使用 Go 字段名
	DefaultName string `json:""`

	// 嵌套匿名结构体
	Inner struct {
		SubField string `json:"sub_field"`
	} `json:"inner"`
}

// MyInt 自定义类型演示
type MyInt int

func main() {
	d := TagDemo{
		FieldName:      "value",
		OptionalField:  "", // 零值,因 omitempty 不输出
		NumberAsString: 123456789,
		Hidden:         "hidden",
		HiddenOmit:     "hidden_omit",
		DefaultName:    "default",
	}
	d.Inner.SubField = "sub"

	data, _ := json.MarshalIndent(d, "", "  ")
	fmt.Println(string(data))
}
```

### 示例 6:错误处理与类型断言

```go
// 文件: json_errors.go
// 演示 JSON 处理中的常见错误与类型断言
package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

// SafeUnmarshal 安全反序列化,返回详细错误
func SafeUnmarshal(data []byte, v any) error {
	decoder := json.NewDecoder(strings.NewReader(string(data)))
	decoder.DisallowUnknownFields() // 禁止未知字段
	if err := decoder.Decode(v); err != nil {
		// 区分语法错误与类型错误
		if syntaxErr, ok := err.(*json.SyntaxError); ok {
			return fmt.Errorf("JSON syntax error at offset %d: %v",
				syntaxErr.Offset, syntaxErr)
		}
		if unmarshalErr, ok := err.(*json.UnmarshalTypeError); ok {
			return fmt.Errorf("type error: field %s, expected %s, got %s",
				unmarshalErr.Field, unmarshalErr.Type, unmarshalErr.Value)
		}
		return err
	}
	return nil
}

// DecodeDynamic 动态解码,使用 map[string]interface{}
// 不推荐用于性能敏感场景
func DecodeDynamic(data []byte) (map[string]any, error) {
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	return m, nil
}

// TraverseValue 遍历动态 JSON 值
func TraverseValue(v any, prefix string) {
	switch val := v.(type) {
	case map[string]any:
		for k, v := range val {
			TraverseValue(v, prefix+"."+k)
		}
	case []any:
		for i, v := range val {
			TraverseValue(v, fmt.Sprintf("%s[%d]", prefix, i))
		}
	default:
		fmt.Printf("%s = %v (type: %T)\n", prefix, val, val)
	}
}

func main() {
	// 演示错误处理
	badJSON := []byte(`{"name": "Alice", "age": "twenty"}`)
	type Person struct {
		Name string `json:"name"`
		Age  int    `json:"age"`
	}
	var p Person
	if err := SafeUnmarshal(badJSON, &p); err != nil {
		fmt.Println("Error:", err)
	}

	// 演示动态解码
	goodJSON := []byte(`{
		"user": {"name": "Bob", "tags": ["a", "b"]},
		"count": 42
	}`)
	m, err := DecodeDynamic(goodJSON)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	TraverseValue(m, "")
}
```

## 对比分析

### Go JSON 库性能对比

| 库 | 速度(相对) | 兼容性 | 流式 | 自定义 | 依赖 | 适用场景 |
|----|--------------|--------|------|--------|------|----------|
| encoding/json | 1.0x | 100% | 是 | 是 | 标准库 | 通用,标准兼容 |
| jsoniter (json-iterator/go) | 3-5x | 99% | 是 | 是 | 无 | 高性能,API 兼容 |
| easyjson | 5-10x | 95% | 是 | 是 | 代码生成 | 极致性能,预生成 |
| sonic (bytedance) | 5-10x | 95% | 是 | 是 | SIMD | amd64,极致性能 |
| go-json (goccy) | 3-5x | 95% | 是 | 是 | 无 | 高性能,纯 Go |
| simdjson-go | 10-20x | 90% | 是 | 否 | SIMD | 只读,极致性能 |

### 关键差异分析

**encoding/json 为何慢?** 反射开销占 60%,字节切片扩容占 20%,interface 装箱占 10%。每次 Marshal 都重新做反射,无法缓存。

**easyjson 为何快?** 编译期通过代码生成,为每个结构体生成专用的 Marshal/Unmarshal 函数,无反射开销。

**sonic 为何更快?** 利用 SIMD 指令并行解析 JSON 字符串,在 amd64 平台接近 SIMD-JSON 的极限性能。但仅支持 amd64,arm64 性能与标准库相当。

**何时选哪个?**
- 通用服务:encoding/json。
- QPS > 10万:jsoniter(零侵入)。
- 已知 schema:easyjson(代码生成)。
- amd64 极致:sonic。

### 标准库与第三方库的功能对比

| 功能 | encoding/json | jsoniter | easyjson | sonic |
|------|---------------|----------|----------|-------|
| MarshalIndent | 是 | 是 | 否 | 是 |
| HTML 转义 | 默认开 | 可关 | 可关 | 可关 |
| 流式 Encoder/Decoder | 是 | 是 | 否 | 是 |
| DisallowUnknownFields | 是 | 是 | 否 | 是 |
| 自定义 MarshalJSON | 是 | 是 | 是 | 是 |
| 任意类型 map | 是 | 是 | 是 | 是 |
| Number 精度控制 | 是 | 是 | 是 | 是 |

## 常见陷阱

### 陷阱 1:数字精度丢失

```go
// 误用:大整数在 JavaScript 中精度丢失
type Bad struct {
	ID int64 `json:"id"` // 超过 2^53 时,JS 端丢失精度
}
// JSON: {"id": 9007199254740993}  // 2^53+1
// JS 解析后: 9007199254740992
```

修复:使用 `string` 标签或字符串类型。

```go
type Good struct {
	ID int64 `json:"id,string"` // JSON 输出为字符串
}
```

### 陷阱 2:time.Time 的默认序列化

```go
// time.Time 默认序列化为 RFC3339 字符串
type Event struct {
	T time.Time `json:"t"` // "2023-11-15T08:00:00Z"
}
// 但 Unmarshal 严格匹配 RFC3339,其他格式失败
```

修复:自定义 MarshalJSON 支持多格式。

### 陷阱 3:omitempty 的零值陷阱

```go
type Config struct {
	Enabled bool `json:"enabled,omitempty"`
	// 当 Enabled=false 时,无法区分"未设置"与"显式设为 false"
}
```

修复:使用 `*bool` 指针。

```go
type Config struct {
	Enabled *bool `json:"enabled,omitempty"`
}
```

### 陷阱 4:map[string]interface{} 的性能陷阱

```go
// 误用:动态解析慢且类型不安全
var m map[string]interface{}
json.Unmarshal(data, &m)
// 每次访问需类型断言,且数字默认为 float64,精度丢失
```

修复:优先定义结构体,使用 `json.RawMessage` 处理动态部分。

### 陷阱 5:HTML 转义破坏 URL

```go
// 误用:URL 中的 & 被转义为 \u0026
type Link struct {
	URL string `json:"url"`
}
l := Link{URL: "http://example.com?a=1&b=2"}
data, _ := json.Marshal(l)
// 输出: {"url":"http://example.com?a=1\u0026b=2"}
```

修复:使用 Encoder 并关闭 HTML 转义。

```go
var buf bytes.Buffer
enc := json.NewEncoder(&buf)
enc.SetEscapeHTML(false)
enc.Encode(l)
```

### 陷阱 6:循环引用导致栈溢出

```go
// 误用:循环引用导致 Marshal 无限递归
type Node struct {
	Next *Node `json:"next"`
}
n1 := &Node{}
n2 := &Node{Next: n1}
n1.Next = n2 // 循环引用
json.Marshal(n1) // 栈溢出
```

修复:避免循环引用,或使用 ID 引用而非直接嵌套。

### 陷阱 7:nil 切片与空切片的差异

```go
type Response struct {
	Items []Item `json:"items"`
}
var r1 Response
r1.Items = nil  // JSON 输出: {"items":null}

var r2 Response
r2.Items = []Item{} // JSON 输出: {"items":[]}
```

前端通常期望空数组 `[]`,而非 `null`。修复:始终初始化切片。

## 工程实践

### 实践 1:高性能 API 序列化

```go
// 高性能 HTTP 处理器,使用 Encoder 流式响应
import (
	"encoding/json"
	"net/http"
)

type APIResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data"`
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false) // API 场景关闭 HTML 转义
	enc.Encode(v)
}

func HandleGetUser(w http.ResponseWriter, r *http.Request) {
	user := loadUser()
	writeJSON(w, http.StatusOK, APIResponse{
		Code: 0,
		Msg:  "ok",
		Data: user,
	})
}
```

### 实践 2:配置文件加载

```go
// 支持环境变量替换与默认值
type Config struct {
	Host         string `json:"host"`
	Port         int    `json:"port"`
	DatabaseURL  string `json:"database_url"`
	RedisURL     string `json:"redis_url"`
	LogLevel     string `json:"log_level"`
	MaxWorkers   int    `json:"max_workers"`
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	// 替换环境变量 ${VAR}
	expanded := os.Expand(string(data), os.Getenv)

	var cfg Config
	if err := json.Unmarshal([]byte(expanded), &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	// 应用默认值
	applyDefaults(&cfg)
	return &cfg, nil
}

func applyDefaults(cfg *Config) {
	if cfg.Host == "" {
		cfg.Host = "0.0.0.0"
	}
	if cfg.Port == 0 {
		cfg.Port = 8080
	}
	if cfg.LogLevel == "" {
		cfg.LogLevel = "info"
	}
	if cfg.MaxWorkers == 0 {
		cfg.MaxWorkers = runtime.NumCPU() * 2
	}
}
```

### 实践 3:大型 JSON 文件的流式处理

```go
// 处理 GB 级 JSON 文件,内存占用 O(1)
func ProcessLargeJSON(path string, handler func(json.RawMessage) error) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	decoder := json.NewDecoder(f)

	// 读取开头的 {
	token, err := decoder.Token()
	if err != nil {
		return err
	}
	if delim, ok := token.(json.Delim); !ok || delim != '{' {
		return fmt.Errorf("expected object, got %v", token)
	}

	// 逐字段读取
	for decoder.More() {
		// 读取字段名
		key, err := decoder.Token()
		if err != nil {
			return err
		}

		// 读取值
		var raw json.RawMessage
		if err := decoder.Decode(&raw); err != nil {
			return err
		}

		fmt.Printf("Processing key: %v\n", key)
		if err := handler(raw); err != nil {
			return err
		}
	}

	return nil
}
```

### 实践 4:对象池化降低 GC 压力

```go
// JSON encoder 对象池
var encoderPool = sync.Pool{
	New: func() interface{} {
		var buf bytes.Buffer
		enc := json.NewEncoder(&buf)
		enc.SetEscapeHTML(false)
		return &struct {
			enc *json.Encoder
			buf *bytes.Buffer
		}{enc, &buf}
	},
}

func marshalPooled(v interface{}) ([]byte, error) {
	p := encoderPool.Get().(*struct {
		enc *json.Encoder
		buf *bytes.Buffer
	})
	defer encoderPool.Put(p)

	p.buf.Reset()
	if err := p.enc.Encode(v); err != nil {
		return nil, err
	}
	// Encode 会追加 \n,需去除
	out := p.buf.Bytes()
	return out[:len(out)-1], nil
}
```

### 实践 5:Schema 验证

```go
// 使用 jsonschema 库进行 schema 验证
import "github.com/xeipuuv/gojsonschema"

func ValidateJSON(data []byte, schemaJSON string) (bool, []string, error) {
	schemaLoader := gojsonschema.NewStringLoader(schemaJSON)
	documentLoader := gojsonschema.NewBytesLoader(data)

	result, err := gojsonschema.Validate(schemaLoader, documentLoader)
	if err != nil {
		return false, nil, err
	}

	if result.Valid() {
		return true, nil, nil
	}

	var errs []string
	for _, desc := range result.Errors() {
		errs = append(errs, desc.String())
	}
	return false, errs, nil
}
```

## 案例研究

### 案例 1:某社交平台的 JSON 优化

**背景**:某社交平台 API,日均 50 亿请求,JSON 序列化占 CPU 30%。

**问题**:
- `encoding/json` 性能瓶颈。
- 大量 `interface{}` 解析,反射开销巨大。
- HTML 转义导致 URL 体积膨胀。

**优化路径**:
1. 评估 jsoniter、easyjson、sonic,选择 jsoniter(API 兼容,零侵入)。
2. 热点接口改用 easyjson 代码生成。
3. 关闭 HTML 转义,使用 Encoder 流式响应。
4. 对象池化 bytes.Buffer。

**结果**:CPU 占用从 30% 降至 12%,API P99 延迟从 50ms 降至 20ms。

### 案例 2:日志收集系统的 NDJSON 处理

**背景**:某日志收集服务,每秒处理 100 万条 NDJSON 日志。

**问题**:
- 一次性 Unmarshal 内存占用高。
- GC 压力大,每秒 100 万次分配。

**优化**:
1. 改用 `json.Decoder` 流式解析。
2. 日志对象 `sync.Pool` 化。
3. 跳过非必需字段:使用 `json.RawMessage` 延迟解析。

**结果**:内存占用降低 80%,GC 频率降低 90%。

### 案例 3:IoT 设备的 JSON 兼容性

**背景**:某 IoT 平台,设备使用嵌入式 JSON 库,与 Go 服务器交互。

**问题**:
- 设备端 JSON 库不严格,允许注释、单引号、尾随逗号。
- `encoding/json` 严格拒绝。

**修复**:使用 `json.Decoder` 的宽松模式或第三方库 `tidwall/gjson` 处理非标准 JSON。

### 案例 4:大整数 ID 的精度问题

**背景**:某金融系统,交易 ID 为 64 位整数,前端 JS 精度丢失。

**修复**:
- ID 字段使用 `json:"id,string"` 标签,输出为字符串。
- 或定义自定义类型 `Int64String`,实现 MarshalJSON。

**结果**:前端精度问题消失,API 兼容性提升。

## 习题

### 基础题

**题 1.1**:`json:"name,omitempty"` 中 omitempty 的作用是什么?对零值与 nil 的处理有何不同?

**参考答案要点**:
- omitempty:字段为零值时不输出。
- 对值类型(int、string):零值(0、空字符串)省略。
- 对指针类型:nil 省略,指向零值不省略。
- 对切片: nil 与空切片 `[]T{}` 都省略。

**题 1.2**:为何 `[]byte` 在 JSON 中表示为 Base64 字符串?

**参考答案要点**:
- JSON 字符串必须是 UTF-8。
- 二进制数据可能包含非 UTF-8 字节。
- Base64 编码为 ASCII,JSON 安全。

**题 1.3**:Decoder 与 Unmarshal 的核心区别是什么?

**参考答案要点**:
- Unmarshal 一次性解析整个 JSON,内存 O(N)。
- Decoder 流式解析,可处理多个 JSON 对象,内存 O(B)。
- Decoder 支持 `DisallowUnknownFields`、`UseNumber` 等运行时配置。

### 进阶题

**题 2.1**:以下代码在 JS 端解析时,`id` 字段会丢失精度,如何修复?

```go
type Response struct {
	ID int64 `json:"id"`
}
```

**参考答案要点**:
- JS Number 是 64 位浮点,安全整数范围 2^53。
- 修复 1:使用 `json:"id,string"`。
- 修复 2:定义 `type Int64String int64`,实现 MarshalJSON。
- 修复 3:JSON 输出时手动转字符串。

**题 2.2**:解释 `json.RawMessage` 的作用,并给出一个典型应用场景。

**参考答案要点**:
- json.RawMessage 是 `[]byte` 别名,实现 MarshalJSON/UnmarshalJSON 为透传。
- 用于"延迟解析"场景:先解析外层结构,根据类型字段决定如何解析内层。
- 典型场景:多态消息、API 网关转发、插件系统。

**题 2.3**:某服务的 JSON 序列化占 CPU 40%,如何系统性优化?

**参考答案要点**:
1. **测量**:使用 pprof 定位热点函数。
2. **替代库**:评估 jsoniter、easyjson、sonic。
3. **结构优化**:减少嵌套,使用 omitempty 减少输出。
4. **流式处理**:大数据用 Encoder/Decoder。
5. **对象池**:bytes.Buffer、Encoder 对象池化。
6. **代码生成**:easyjson 预生成,零反射。
7. **关闭转义**:SetEscapeHTML(false)。

### 挑战题

**题 3.1**:设计一个支持多版本 API 的 JSON 序列化方案,要求:
- 同一结构体在不同 API 版本输出不同字段。
- 新版本添加字段,旧版本不输出。
- 性能接近原生 encoding/json。

**参考答案要点**:
```go
type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email,omitempty"`
	Bio   string `json:"bio,omitempty"` // v2 新增
}

// 方案 1:多个结构体,版本路由
type UserV1 struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}
type UserV2 struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email,omitempty"`
	Bio   string `json:"bio,omitempty"`
}

// 方案 2:实现 MarshalJSON,根据 context 选择字段
// 方案 3:使用 map[string]interface{} 动态构建
```

**题 3.2**:实现一个 JSON Patch (RFC 6902) 处理器,支持 add/remove/replace/move/copy/test 操作。

**参考答案要点**:
- 解析 Patch 数组,每个操作有 op/path/value 字段。
- path 使用 JSON Pointer (RFC 6901) 语法,如 `/user/name`。
- 实现操作分发:add、remove、replace、move、copy、test。
- 使用 `map[string]interface{}` 作为内部表示,操作完成后重新序列化。

## 参考文献

[1] Crockford, D. 2017. *The JSON Data Interchange Syntax* (RFC 8259). Internet Engineering Task Force (IETF). DOI: https://doi.org/10.17487/RFC8259

[2] Bray, T. (Ed.). 2017. *The JavaScript Object Notation (JSON) Data Interchange Format* (STD 90). Internet Engineering Task Force (IETF). DOI: https://doi.org/10.17487/RFC8259

[3] Google Inc. 2023. *encoding/json package documentation*. The Go Programming Language. Available at: https://pkg.go.dev/encoding/json

[4] Donovan, A. A. A., and Kernighan, B. W. 2015. *The Go Programming Language*. Addison-Wesley Professional, Boston, MA, USA. ISBN: 978-0134190440.

[5] Bytedance. 2021. *Sonic: A JSON Parser by JIT*. Bytedance Tech Blog. Available at: https://github.com/bytedance/sonic

[6] Mailgun. 2017. *easyjson: Fast JSON Encoder/Decoder for Go*. Available at: https://github.com/mailru/easyjson

[7] Lang, T. 2017. *jsoniter: A High-Performance JSON Library for Go*. Available at: https://github.com/json-iterator/go

[8] Pezoa, F., Reutter, J. L., Suarez, F., Ugarte, M., and Vrgoč, D. 2016. Foundations of JSON Schema. In *Proceedings of the 25th International Conference on World Wide Web* (WWW '16). International World Wide Web Conferences Steering Committee, Geneva, CHE, 263-273. DOI: https://doi.org/10.1145/2872427.2883029

[9] Bryan, P., and Hoffman, P. 2013. *JavaScript Object Notation (JSON) Pointer* (RFC 6901). Internet Engineering Task Force (IETF). DOI: https://doi.org/10.17487/RFC6901

[10] Internet Engineering Task Force. 2013. *JavaScript Object Notation (JSON) Patch* (RFC 6902). DOI: https://doi.org/10.17487/RFC6902

## 延伸阅读

- **RFC 8259**:JSON 标准规范,权威定义。
- **《The Go Programming Language》** 第 4 章:JSON 序列化深入讲解。
- **《Designing Data-Intensive Applications》**(Kleppmann, 2017):第 4 章对比 JSON、XML、Protobuf、Thrift。
- **easyjson 文档**:https://github.com/mailru/easyjson
- **sonic 文档**:https://github.com/bytedance/sonic
- **jsoniter 文档**:https://github.com/json-iterator/go
- **《API Design Patterns》**(Mihaylov, 2021):API 响应格式的最佳实践。
- **JSON Schema 规范**:https://json-schema.org/
- **Go 源码 `encoding/json/encode.go`**:Marshal 实现细节。
- **simdjson 论文**:https://arxiv.org/abs/1902.08318
- **《Streaming JSON Processing》**(Tidwall, 2020):流式 JSON 处理模式。
