---
order: 77
title: Go与模板
module: go
category: Go
difficulty: intermediate
description: text/template与html/template
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与配置管理
  - go/Go与日志
  - go/Go与加密
  - go/Go与信号处理
prerequisites:
  - go/概述与环境配置
---

## 概述

模板引擎是一种将数据与模板文本结合生成最终输出的工具。简单来说，你写一个包含占位符的模板文件，程序运行时用实际数据替换占位符，生成最终文本。这在生成 HTML 页面、配置文件、邮件内容、代码文件等场景中非常常见。

Go 标准库提供了两个模板包：`text/template` 用于通用文本生成，`html/template` 在此基础上增加了 HTML 转义功能，防止 XSS 攻击。两者语法完全一致，区别仅在于安全处理。

## 基础概念

在开始写代码之前，理解模板的几个核心概念：

- **模板（Template）**：包含占位符和指令的文本文件或字符串，定义了输出的结构。
- **数据（Data）**：传入模板的实际数据，可以是结构体、map 或任意 Go 值。
- **动作（Action）**：模板中的 `{{...}}` 语法，用于插入数据、控制流程等。
- **管道（Pipeline）**：类似 Unix 管道，将一个操作的输出作为下一个操作的输入，用 `|` 连接。
- **函数（Function）**：可以在模板中调用的函数，包括内置函数和自定义函数。

## 快速上手

最简单的模板示例，将数据填充到模板中：

```go
package main

import (
    "os"
    "text/template"
)

func main() {
    // 定义模板字符串，{{.Name}} 是占位符
    tmplStr := "你好，{{.Name}}！欢迎来到 {{.City}}。"

    // 解析模板
    tmpl, err := template.New("greeting").Parse(tmplStr)
    if err != nil {
        panic(err)
    }

    // 准备数据
    data := struct {
        Name string
        City string
    }{
        Name: "小明",
        City: "北京",
    }

    // 执行模板，将结果输出到标准输出
    err = tmpl.Execute(os.Stdout, data)
    if err != nil {
        panic(err)
    }
    // 输出：你好，小明！欢迎来到 北京。
}
```

## 详细用法

### 1. 访问数据

模板通过 `.` 来引用当前数据对象，用 `.FieldName` 访问字段：

```go
type User struct {
    Name  string
    Email string
    Age   int
}

// 访问结构体字段
tmplStr := "姓名: {{.Name}}, 邮箱: {{.Email}}, 年龄: {{.Age}}"

// 访问 map 的键
data := map[string]interface{}{
    "Name":  "小红",
    "Score": 95,
}
tmplStr := "姓名: {{.Name}}, 分数: {{.Score}}"
```

### 2. 条件判断

使用 `if`、`else`、`end` 根据条件显示不同内容：

```go
tmplStr := `{{if .IsVIP}}欢迎尊贵的VIP用户{{else}}欢迎普通用户{{end}}`

// 更复杂的条件
tmplStr := `
{{if gt .Age 18}}成年人{{else}}未成年人{{end}}
{{if and .IsActive .IsVIP}}活跃VIP用户{{end}}
`
```

Go 模板中的条件判断不支持 `==`、`>` 等运算符，需要使用内置函数：

- `eq` 等于
- `ne` 不等于
- `lt` 小于
- `le` 小于等于
- `gt` 大于
- `ge` 大于等于
- `and` 逻辑与
- `or` 逻辑或
- `not` 逻辑非

### 3. 循环遍历

使用 `range` 遍历切片或 map：

```go
type Item struct {
    Name  string
    Price float64
}

tmplStr := `
商品列表：
{{range .Items}}
- {{.Name}}：￥{{.Price}}
{{else}}
暂无商品
{{end}}
`

data := struct {
    Items []Item
}{
    Items: []Item{
        {Name: "苹果", Price: 5.5},
        {Name: "香蕉", Price: 3.2},
        {Name: "橙子", Price: 4.8},
    },
}
```

注意 `range` 块内的 `.` 会变成当前遍历的元素。如果需要访问外层数据，使用 `$`：

```go
tmplStr := `
{{range .Items}}
店铺：{{$.ShopName}} - 商品：{{.Name}}
{{end}}
`
```

### 4. 管道操作

管道将一个操作的输出传递给下一个操作：

```go
tmplStr := `{{.Name | printf "你好，%s" |ToUpper}}`
```

这等价于：先获取 `.Name`，然后传给 `printf` 格式化，再传给 `ToUpper` 转大写。

### 5. 自定义函数

可以注册自定义函数供模板使用：

```go
package main

import (
    "os"
    "strings"
    "text/template"
)

func main() {
    // 创建模板并注册自定义函数
    tmpl := template.New("custom").Funcs(template.FuncMap{
        "upper":  strings.ToUpper,          // 转大写
        "lower":  strings.ToLower,          // 转小写
        "repeat": strings.Repeat,           // 重复字符串
        "title":  strings.Title,            // 首字母大写
    })

    // 解析模板（必须在 Funcs 之后）
    tmpl, err := tmpl.Parse(`姓名: {{.Name | upper}}
重复: {{.Name | repeat 3}}
`)
    if err != nil {
        panic(err)
    }

    data := map[string]string{"Name": "golang"}
    tmpl.Execute(os.Stdout, data)
    // 输出：
    // 姓名: GOLANG
    // 重复: golanggolanggolang
}
```

### 6. 模板嵌套

使用 `template` 动作引用子模板，实现模板复用：

```go
// 定义主模板和子模板
const tmplStr = `
{{define "header"}}<header>网站标题</header>{{end}}
{{define "footer"}}<footer>版权信息</footer>{{end}}
{{define "content"}}<main>页面内容</main>{{end}}

{{template "header"}}
{{template "content"}}
{{template "footer"}}
`

tmpl, _ := template.New("layout").Parse(tmplStr)
tmpl.Execute(os.Stdout, nil)
```

也可以从多个文件加载模板：

```go
// 从多个文件解析模板
tmpl, err := template.ParseGlob("templates/*.html")
if err != nil {
    panic(err)
}

// 执行指定名称的模板
tmpl.ExecuteTemplate(os.Stdout, "index", data)
```

### 7. 变量赋值

在模板中可以使用 `:=` 赋值变量：

```go
tmplStr := `
{{with .User}}
{{$name := .Name}}
用户名：{{$name}}
{{end}}
`
```

### 8. with 语句

`with` 语句改变当前上下文对象 `.`：

```go
tmplStr := `
{{with .Address}}
城市：{{.City}}
街道：{{.Street}}
{{end}}
`
```

### 9. html/template

`html/template` 的用法与 `text/template` 完全一致，但会自动转义 HTML 特殊字符，防止 XSS 攻击：

```go
package main

import (
    "html/template"
    "os"
)

func main() {
    // 使用 html/template 替代 text/template
    tmpl, _ := template.New("safe").Parse(`<div>{{.Content}}</div>`)

    data := map[string]string{
        "Content": "<script>alert('xss')</script>",
    }

    tmpl.Execute(os.Stdout, data)
    // 输出：<div>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;</div>
    // 特殊字符被转义，不会执行脚本
}
```

如果某些内容确实需要原样输出（比如信任的 HTML 片段），可以使用 `template.HTML` 类型：

```go
data := map[string]interface{}{
    "Content": template.HTML("<b>加粗文本</b>"), // 不会被转义
}
```

## 常见场景

### 场景一：生成 HTML 页面

```go
// page.html 模板文件
const pageTmpl = `
<!DOCTYPE html>
<html>
<head><title>{{.Title}}</title></head>
<body>
  <h1>{{.Title}}</h1>
  <ul>
  {{range .Items}}
    <li>{{.Name}} - ￥{{printf "%.2f" .Price}}</li>
  {{end}}
  </ul>
  {{if .HasDiscount}}
  <p>当前有优惠活动！</p>
  {{end}}
</body>
</html>
`

type PageItem struct {
    Name  string
    Price float64
}

type PageData struct {
    Title       string
    Items       []PageItem
    HasDiscount bool
}
```

### 场景二：生成配置文件

```go
// 用模板生成 Nginx 配置
const nginxTmpl = `
server {
    listen {{.Port}};
    server_name {{.Domain}};

    location / {
        proxy_pass http://{{.Upstream}};
        proxy_set_header Host $host;
    }
}
`

type NginxConfig struct {
    Port     int
    Domain   string
    Upstream string
}
```

### 场景三：生成邮件内容

```go
const emailTmpl = `
亲爱的 {{.UserName}}：

感谢您注册 {{.AppName}}！

您的验证码是：{{.Code}}，请在 {{.ExpireMinutes}} 分钟内使用。

{{if .HasBonus}}
恭喜您获得新用户专属礼包！
{{end}}

此致
{{.AppName}} 团队
`
```

### 场景四：生成代码文件

```go
// 用模板生成 Go 结构体代码
const codeTmpl = `
// Code generated by templgen; DO NOT EDIT.
package {{.Package}}

type {{.StructName}} struct {
{{range .Fields}}    {{.Name}} {{.Type}} ` + "`" + `json:"{{.JSONName}}"` + "`" + `
{{end}}}
`
```

## 注意事项与常见错误

1. **Must 函数**：如果模板语法有误，`Parse` 会返回错误。使用 `template.Must` 可以在解析失败时直接 panic，适合初始化阶段使用：

```go
tmpl := template.Must(template.New("test").Parse(tmplStr))
```

2. **range 内的上下文变化**：在 `range` 块内，`.` 变成了当前元素。如果需要访问外层数据，使用 `$`（绑定到 range 外的 `.`）。

3. **模板中的空格**：`{{-` 和 `-}}` 可以去除动作前后的空白字符：

```go
// 默认会有多余空行
{{range .Items}}
  {{.Name}}
{{end}}

// 使用 - 去除空白
{{- range .Items -}}
  {{.Name}}
{{- end -}}
```

4. **html/template 的自动转义**：使用 `html/template` 时，所有变量默认会被 HTML 转义。如果需要输出原始 HTML，必须使用 `template.HTML`、`template.CSS`、`template.JS` 等类型包装。但这样做要确保内容是安全的。

5. **模板解析顺序**：`Funcs` 必须在 `Parse` 之前调用，否则模板中使用的自定义函数会报错。

6. **map 的键必须是简单类型**：模板中访问 map 的键时，键必须是字符串、整数等简单类型，不能是结构体。

## 进阶用法

### 模板继承

Go 标准库的模板不支持传统意义上的"继承"，但可以通过 `define` 和 `template` 组合实现类似效果：

```go
// base.html - 基础布局
const baseTmpl = `
{{define "base"}}
<!DOCTYPE html>
<html>
<head><title>{{.Title}}</title></head>
<body>
  {{block "content" .}}默认内容{{end}}
  {{block "sidebar" .}}默认侧边栏{{end}}
</body>
</html>
{{end}}
`

// page.html - 具体页面
const pageTmpl = `
{{template "base" .}}

{{define "content"}}
<main>这是页面内容</main>
{{end}}

{{define "sidebar"}}
<aside>这是侧边栏</aside>
{{end}}
`

// 先解析 base，再解析 page
tmpl := template.Must(template.New("base").Parse(baseTmpl))
tmpl = template.Must(tmpl.Parse(pageTmpl))
tmpl.ExecuteTemplate(os.Stdout, "base", data)
```

### 使用 block 定义默认内容

`block` 是 Go 1.6 引入的语法，等价于 `define` + `template`：

```go
// 定义带默认内容的块
{{block "title" .}}默认标题{{end}}

// 子模板可以覆盖
{{define "title"}}自定义标题{{end}}
```

### 模板中使用方法

如果数据对象有方法，模板可以直接调用：

```go
type User struct {
    FirstName string
    LastName  string
}

// 定义方法
func (u User) FullName() string {
    return u.FirstName + " " + u.LastName
}

// 模板中直接调用方法
tmplStr := "全名：{{.FullName}}"
```

### 并发安全

`template.Template` 对象在解析完成后是只读的，可以安全地在多个 goroutine 中并发执行：

```go
var tmpl *template.Template // 初始化一次

// 多个 goroutine 可以安全地并发调用
go func() { tmpl.Execute(w1, data1) }()
go func() { tmpl.Execute(w2, data2) }()
```
