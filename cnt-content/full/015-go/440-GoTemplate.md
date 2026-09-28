---
order: 440
title: Go 与模板：把用户输入安全地渲染成页面
module: 'go'
category: 后端技术
difficulty: intermediate
description: 以"歌单页面被 XSS 注入"为主线学 text/template 与 html/template：动作语法与管道、自定义函数、range 上下文与 $、布局复用、HTTP 服务端渲染与上下文感知转义，附坑点、自检与练习。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'go/470-GoHTTP'
  - 'go/480-GoMiddleware'
  - 'go/570-GoCodeGeneration'
  - 'go/390-GoConfigManagement'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 真实场景：歌单页面挂了 alert 弹窗

你用 Go 写了个小站，歌单页直接拼字符串渲染：`fmt.Sprintf("<li>%s</li>", song.Title)`。某天用户把歌名起名叫 `<script>alert('xss')</script>`，每个打开页面的人都被执行了这段脚本——教科书级的 XSS。

拼字符串生成 HTML 的本质问题：你分不清"结构"和"数据"，数据里的任何字符都被当成结构执行。Go 标准库的模板引擎正是解决这件事的：模板文件里写结构（带占位符），数据只从占位符进入，并且 `html/template` 会按输出位置自动转义。两个包语法完全一致：`text/template` 生成任意文本（邮件、配置、代码），`html/template` 额外做安全转义。

## 动手第一步：五分钟渲染第一份邮件文本

从最简单的 text/template 开始——运营要一封验证码邮件：

```go
package main

import (
    "os"
    "text/template"
)

func main() {
    const emailTmpl = `亲爱的 {{.UserName}}：

您的验证码是 {{.Code}}，{{.ExpireMinutes}} 分钟内有效。
{{if .HasBonus}}
恭喜您获得新用户专属礼包！
{{end}}`

    // 解析模板（编译占位符），失败立即暴露
    tmpl := template.Must(template.New("email").Parse(emailTmpl))

    data := struct {
        UserName      string
        Code          string
        ExpireMinutes int
        HasBonus      bool
    }{"小明", "882134", 10, true}

    if err := tmpl.Execute(os.Stdout, data); err != nil {
        panic(err)
    }
}
```

```bash
go run main.go
```

预期输出：

```text
亲爱的 小明：

您的验证码是 882134，10 分钟内有效。

恭喜您获得新用户专属礼包！
```

三个动作已经出现：`{{.Field}}` 引用数据字段、`{{if}}...{{end}}` 控制结构、`template.Must` 让语法错误在启动时 panic 而不是运行时报错。模板里的 `.` 代表"当前数据对象"。

## 动手第二步：循环、条件与上下文切换

列表渲染是最高频的场景。注意 `range` 块内 `.` 会变成当前元素，需要外层数据时用 `$`（顶层上下文）：

```go
type Item struct {
    Name  string
    Price float64
}

const pageTmpl = `店铺：{{$shop}} 的商品：
{{range .Items}}
- {{.Name}}：￥{{printf "%.2f" .Price}}
{{else}}
暂无商品
{{end}}
`

tmpl := template.Must(template.New("page").Parse(pageTmpl))
tmpl.Execute(os.Stdout, struct {
    Shop  string
    Items []Item
}{"山海小铺", []Item{{"苹果", 5.5}, {"香蕉", 3.2}}})
```

条件判断不能用运算符，要用内置函数（参数前置）：

```go
{{if gt .Age 18}}成年人{{else}}未成年人{{end}}
{{if and .IsActive .IsVIP}}活跃 VIP{{end}}
{{if eq .Status "paid"}}已支付{{end}}
```

可用函数：`eq ne lt le gt ge and or not`。想写 `strings` 包里的任何函数（ToUpper、Join……），必须自己注册，见下一步。

## 动手第三步：注册自定义函数 + 布局复用

```go
package main

import (
    "html/template"
    "net/http"
    "strings"
    "time"
)

func main() {
    // Funcs 必须在 Parse 之前调用，否则模板解析时找不到函数名
    tmpl := template.New("layout").Funcs(template.FuncMap{
        "upper": strings.ToUpper,
        "join":  strings.Join,
        "now":   time.Now,
    })

    // define 定义子模板，template 引用，block 引用并可给默认内容
    const layout = `
{{define "header"}}<header>{{$.SiteName}}</header>{{end}}
{{define "content"}}默认内容{{end}}
<!DOCTYPE html>
<html><body>
{{template "header"}}
{{block "content" .}}(无内容){{end}}
<hr>渲染时间：{{now.Format "2006-01-02 15:04"}}
</body></html>
`
    t := template.Must(tmpl.Parse(layout))
    t.ExecuteTemplate(os.Stdout, "layout", map[string]string{"SiteName": "山海小铺"})
    _ = http.StatusOK // 占位，下一步展开 HTTP 用法
}
```

`block "content" .` 等价于 `define` + `template` 的组合，但允许子模板覆盖默认内容——这是 Go 模板实现"布局继承"的标准姿势：先 Parse 布局，再链式 Parse 页面文件，最后 `ExecuteTemplate(w, "layout", data)`。从文件加载整目录用 `template.ParseGlob("templates/*.html")`。

管道语法 `{{.Name | upper}}` 把左侧结果作为右侧函数的最后一个参数，可以串多节，等价于 `{{upper .Name}}`。

## 动手第四步：html/template 上线——XSS 在这里被拦截

现在把第一步的场景换到 Web 服务端，这次用 `html/template`，并故意塞进恶意数据：

```go
package main

import (
    "html/template"
    "log"
    "net/http"
)

type Song struct {
    Title  string
    Artist string
}

const listHTML = `<!DOCTYPE html>
<html><body>
<h1>歌单</h1>
<ul>
{{- range .Songs}}
  <li>{{.Title}} - {{.Artist}}</li>
{{- end}}
</ul>
<p>共 {{len .Songs}} 首</p>
</body></html>
`

func main() {
    // 启动时解析一次；模板对象只读，之后并发执行安全
    tmpl := template.Must(template.New("list").Parse(listHTML))

    http.HandleFunc("/songs", func(w http.ResponseWriter, r *http.Request) {
        data := struct{ Songs []Song }{
            Songs: []Song{
                {Title: `<script>alert('xss')</script>`, Artist: "匿名用户"},
                {Title: "光年之外", Artist: "AI-02"},
            },
        }
        if err := tmpl.Execute(w, data); err != nil {
            http.Error(w, "render error", http.StatusInternalServerError)
        }
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

```bash
go run main.go
curl http://localhost:8080/songs
```

预期输出（节选）：

```html
<ul>
  <li>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; - 匿名用户</li>
  <li>光年之外 - AI-02</li>
</ul>
```

`<script>` 变成了 `&lt;script&gt;`——用户数据被当成文字展示，浏览器不会执行它。对比开头的 `fmt.Sprintf` 版本：同样的一行数据，一边是漏洞，一边是安全。

## 讲为什么：转义为什么必须"上下文感知"

把 `<` 换成 `&lt;` 谁都会做，难点在于同一个值在不同位置需要不同的转义规则：

- 出现在标签正文：转义 HTML 实体（`&lt;`）；
- 出现在属性里：还要防引号逃逸（`&#39;`）；
- 出现在 `<script>` 标签内：按 JS 字符串转义；
- 出现在 URL/href：按 URL 编码转义。

`html/template` 在解析时就记住了每个占位符所处的语法位置，执行时按位置选择转义器——这就是"上下文感知转义"，也是 `text/template` 与 `html/template` 唯一但关键的差别。结论是纪律性的：**渲染 HTML 一律用 html/template，text/template 只用于邮件正文、Nginx 配置、代码生成这类非 HTML 输出**（后两者正是模板的经典副业：生成 Nginx server 块、生成带 build tag 的 Go 代码文件）。

需要输出可信 HTML 片段（比如富文本编辑器产出的内容）时，用 `template.HTML("<b>加粗</b>")` 类型显式跳过转义——这是"我担保内容安全"的声明，对任何经过用户输入的内容都不要用。

## 坑点与自检

**坑 1：Funcs 注册在 Parse 之后。** 报错 "function xxx not defined"。顺序固定：New、Funcs、Parse、Execute。

**坑 2：range 里拿不到外层数据。** `.` 已变成当前元素。用 `$` 引用顶层；或在外层先用 `{{$site := .Shop}}` 存变量。

**坑 3：模板里的空白失控。** `{{range}}` 独占一行会产生多余换行，用 `{{-` 与 `-}}` 吃掉动作两侧的空白（注意减号与花括号之间不能有空格）。

**坑 4：以为 Go 模板内置了字符串函数。** 内置清单只有 `printf len index slice eq ne lt le gt ge and or not urlquery` 等。`strings.Title` 曾被教程广泛演示，但它对 Unicode 词边界处理不正确，Go 1.18 起已废弃；需要标题式大写用 `golang.org/x/text/cases`。

**坑 5：每次请求重新 Parse。** Parse 是编译动作，代价不小；模板对象解析后只读、并发执行安全，正确姿势是启动时 Parse 一次、包级变量持有、每个请求只 Execute。反过来，解析后的模板对象绝不能再 Parse/修改，否则并发读写。

**坑 6：字段未导出渲染为空。** 模板只能访问导出字段（大写开头），包内小写字段在模板里拿到的是零值 `<no value>` 或空串，且不报错——排查"页面上数据没了"时先查大小写。

自检——能不看文档回答这些吗：

1. text/template 与 html/template 的语法与行为差异分别是什么？
2. `{{.Name | printf "你好 %s"}}` 的求值顺序？管道右侧函数的参数怎么接？
3. range 块内如何引用外层数据？`$` 绑定的是谁？
4. block 与 define + template 的关系？布局继承的 Parse 顺序？
5. template.HTML 什么时候能用？为什么对用户输入绝对不能用？
6. 为什么模板要启动时解析一次而不是每请求解析？

## 练习

1. 把第四步的程序扩展成"歌单 + 添加歌曲"小站：GET 显示列表，POST 接收表单写入内存切片（处理 `r.ParseForm`），故意提交 `<img src=x onerror=alert(1)>` 作为歌名，验证页面源码中的转义结果。
2. 写一个 text/template 生成 Nginx 配置的命令行小工具：输入端口、域名、上游地址，输出完整 server 块；把模板放进独立文件，用 ParseGlob 加载。
3. 给第四步的站点做布局抽取：把 `<html><body>` 公共部分抽成 `layout.html` 的 block，列表页与"关于"页各自只写 content 块，确认两个页面共享头部与页脚。

## 下一步

- 模板渲染所在的服务端全貌：[Go 与 HTTP 服务](/go/470-GoHTTP)与[Go 中间件](/go/480-GoMiddleware)；
- 代码生成场景的模板进阶：[Go 代码生成](/go/570-GoCodeGeneration)；
- 邮件、配置等文本生成的数据来源：[Go 与配置管理](/go/390-GoConfigManagement)；
- 防 XSS 只是安全一角：[Go 与加密](/go/450-GoEncryption)。
