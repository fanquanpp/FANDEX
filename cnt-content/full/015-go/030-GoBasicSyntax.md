---
order: 30
title: 基本语法：Hello Go 与强制的大括号
module: 'go'
category: 后端技术
difficulty: beginner
description: 从最小 main.go 出发学会包与 import、变量三式与零值、for 三形态与无括号的 if；附 unused import 真实报错、go vet 提示实录与四道练习。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'go/020-GoOverviewEnvSetup'
  - 'go/040-GoFunctionMethod'
  - 'go/050-GoDataStructure'
  - 'go/060-GoInterfaceComposition'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 前置知识

- 已完成 [工具链与环境搭建](/go/020-GoOverviewEnvSetup)：go version 有输出，hello-go 模块里 go run main.go 能跑通。

没跟上也不影响：第一节用两句命令补建模块。

## 学习目标

读完本文你将能够：

1. 写出并跑通最小 main.go，逐行说出每个词的作用；
2. 用变量三式中的合适一种声明数据，并预测未初始化变量的零值；
3. 看到 imported and not used 与 declared and not used 报错，10 秒内说出修法；
4. 用 for 的三种形态分别实现同一个计数任务；
5. 用 go vet 抓出「编译器放行、运行时才暴露」的 Printf 格式错误。

预计 45 到 60 分钟，含 3 组实验与 4 道练习。

## 1. 问题引入：Hello Go 与强制的大括号

Python 的 if 用冒号加缩进，C 与 Java 的 if 条件带括号。Go 的规定很特别：**条件不写括号，大括号却必须写**。

正确的写法是 `if score > 90 {`；写成 `if score > 90` 单独成行，编译直接拒绝。

强制大括号不是审美洁癖：2014 年 Apple 的 goto fail 漏洞，根源正是一个 if 后没加大括号，受条件保护的校验代码在条件外继续执行，证书校验被跳过。Go 从语法层面没收了这个选项。

大括号为什么不能另起一行？Go 在行尾自动插入分号——以标识符、`)`、`}` 等结尾的行尾会补分号，于是 `if score > 90` 单独成行时行尾已被补分号，`{` 跟不上来。附带的好处：Go 代码永远不需要手写分号。

## 2. 最小 main.go 与 go run

进入上一篇建好的 hello-go 模块（没跟上就补建：mkdir hello-go，进入后执行 go mod init hello-go），把 main.go 覆盖成：

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go")
}
```

```bash
go run main.go
```

预期输出：

```text
Hello, Go
```

逐行拆：`package main` 加 main 函数是可执行入口的固定约定；`import "fmt"` 引入标准库的格式化输出包；`func main()` 是入口函数；`fmt.Println` 打印一行并换行，参数间自动加空格。

`func` 这个词今天先混个眼熟——完整语法（参数、返回值、多返回值）在 [函数与方法](/go/040-GoFunctionMethod) 讲透，本文只需要会改函数体里的内容。

## 3. 包与 import：unused import 直接编译失败

import 的规则：**导入多少包，就必须用多少包**。给 main.go 加一个 import 但不用它：

```go
package main

import "fmt"
import "os"

func main() {
    fmt.Println("Hello, Go")
}
```

```bash
go run main.go
```

预期输出：

```text
# command-line-arguments
./main.go:4:2: imported and not used: "os"
```

读报错三步：`./main.go:4:2` 指向文件、行、列；`imported and not used` 是原因；"os" 是涉事包。这就是上一篇说的纪律性格：Go 宁可编译失败，也不让死代码进仓库。（Go 1.24 前措辞是 `"os" imported and not used`，读法相同。）

现在把 `import "os"` 删掉，程序恢复可运行。多包导入用 import 加圆括号分组，go fmt 会按字母序排好。反方向错误也存在：用了没导入的包报 undefined: fmt，第 9 节实录。

## 4. 变量三式：:= 是主角

Go 声明变量有三式，用武之地各不相同：

```go
package main

import "fmt"

func main() {
    player := "星尘"      // 式一：短声明，函数内首选
    level := 12

    var maxLevel int = 60 // 式二：完整式，显式强调类型
    var combo float64     // 式三：零值式，先占位后赋值
    combo = 3.5

    const maxRetry = 3    // 常量：编译期确定

    fmt.Println(player, level, maxLevel, combo, maxRetry)
}
```

预期输出：

```text
星尘 12 60 3.5 3
```

三个要点：

1. **:= 只能用在函数内**，且左边必须是新变量；包级变量（函数外）必须用 var——函数外写 := 会报 syntax error: non-declaration statement outside function body；
2. **未初始化的变量自动获得零值**：int 是 0，float64 是 0，string 是空串 ""，bool 是 false（`var hp int` 的 hp 出生即 0）；
3. **声明了不用的变量是编译错误**（上一篇实录过）：`declared and not used: combo`。别提前声明，用到时再声明。

## 5. for：唯一的循环，三种形态

Go 没有 while——**循环关键字只有 for 一个**，三种形态覆盖其他语言所有循环的场景：

```go
package main

import "fmt"

func main() {
    // 形态一：三段式（初始化；条件；后置），最常用
    for i := 3; i >= 1; i-- {
        fmt.Println("倒计时", i)
    }

    // 形态二：只有条件，等价于其他语言的 while
    hp := 100
    for hp > 0 {
        hp -= 30
        fmt.Println("受到 30 点伤害，剩余血量", hp)
    }

    // 形态三：无限循环，配 break 退出
    score := 0
    for {
        score += 40
        if score >= 100 { // if 下一节讲，先混个眼熟
            fmt.Println("积分达到", score, "点，结算完成")
            break
        }
    }
}
```

预期输出：

```text
倒计时 3
倒计时 2
倒计时 1
受到 30 点伤害，剩余血量 70
受到 30 点伤害，剩余血量 40
受到 30 点伤害，剩余血量 10
受到 30 点伤害，剩余血量 -20
积分达到 120 点，结算完成
```

三个观察点：

1. 形态一里声明的 i 只活在循环内；
2. 形态二像 while：hp 变成 -20 后条件不成立，循环结束；
3. 形态三没有条件，永不停止——除非 break；循环变量忘了变化就是死循环，Ctrl+C 中断。

遍历集合的第四种形态 for range 在 [数据结构](/go/050-GoDataStructure) 展开；Go 1.22 起还能 `for i := range 5` 直接数到 5。

## 6. if：无括号，还有免费的作用域

if 的结构与大多数语言一致，只是不写括号。放进 main 里（score := 85）：

```go
if score >= 90 {
    fmt.Println("段位：传奇")
} else if score >= 80 {
    fmt.Println("段位：大师")
} else {
    fmt.Println("段位：钻石")
}
```

预期输出：

```text
段位：大师
```

Go 的 if 还有一个免费赠品：**条件前可以塞一句初始化**，声明的变量只在 if 块内可见：

```go
if bonus := 10; score+bonus >= 90 {
    fmt.Println("加成后达到大师线:", bonus) // bonus 只在这个块里存在
}
```

（预期输出：`加成后达到大师线: 10`；块外再用 bonus 报 undefined。）这个形态在处理错误时会爆发——`if err := doSomething(); err != nil` 是 Go 代码里最常见的开头，[错误处理](/go/070-GoErrorHandling) 让你天天写它。

## 7. 第一编译错误与 go vet 提示实录

### 编译错误：大括号没闭合

故意删掉 main 的右大括号，go run main.go 直接报：

```text
# command-line-arguments
./main.go:7:1: syntax error: unexpected EOF, expected }
```

（要点是 unexpected EOF——读到文件末尾还没等到 `}`。）编译器把不完整的程序拦在运行之前：语法问题零容忍。

### go vet：编译器不管的，它来管

编译器只查语法与类型。这段完全合法：

```go
package main

import "fmt"

func main() {
    fmt.Printf("最终积分: %d 分\n", "一百二十")
}
```

go run 直接放行，输出却是这样：

```text
最终积分: %!d(string=一百二十) 分
```

`%d` 是整数占位符，塞进去的却是字符串——fmt 没崩溃，把尴尬写在输出里。go vet 专门抓这类「编译能过但大概率是 bug」的模式：

```bash
go vet
```

预期输出：

```text
# hello-go
./main.go:6:2: Printf format %d has arg #1 of wrong type string
```

vet 与编译器的分工：**编译器抓语法与类型错，vet 抓模式错**（go test 默认自动跑一部分 vet 检查）。修法：换成数字 120。

## 8. 修改实验

实验一：把 player 改成你的名字，函数体末尾加 `level = level + 1` 并再打印一次。预测两次 level 是否不同再运行——`:=` 声明新变量，`=` 给已有变量赋值。

实验二：把倒计时（形态一）改用形态二实现，输出完全一致；只许改 for 那一行。

实验三：把 if 示例的 score 依次改成 90 与 80。先写预期段位再运行——边界值 90 落进 >= 90 的分支。

## 9. 常见错误与调试实录

错误一：用了没导入的包。删掉 import "fmt" 但保留 fmt.Println：

```text
# command-line-arguments
./main.go:6:2: undefined: fmt
```

undefined 意思是「名字不存在」。三步定位：查拼写、查是否导入、查导入路径——九成是拼写或漏导入。

错误二：`{` 另起一行（C/Java 肌肉记忆）：

```go
func main()
{
```

```text
./main.go:5:12: syntax error: unexpected newline, expected { after function signature
```

原因仍是第 1 节的分号自动插入。修法：`{` 与语句同行。（措辞随版本略异，关键词 unexpected newline。）

## 10. 实际项目中的使用场景

- 命令行工具与后台程序：形态三无限循环加 break 是交互式 CLI 与监听程序的骨架（配信号处理退出，见 [Go 信号处理](/go/430-GoSignalHandling)）；
- 状态推进与分档：形态二适合血量、积分、重试次数；if 链处理段位分档，真实代码里的 err 检查就是条件前初始化；
- go vet 进流水线：CI 里 `go vet ./...` 是比编译更严的一道关。

## 11. 小练习

预测题（5 分钟）：写出下面程序的输出再运行验证：

```go
n := 5
for n > 0 {
    n -= 2
}
fmt.Println(n)
```

（验证：n 依次为 5、3、1、-1，-1 不满足条件时循环结束。）

修改题（15 分钟）：把倒计时改成只输出 1 到 10 的偶数，保持形态一。验收：五行输出 2 4 6 8 10；i-- 变 i++。

修 Bug 题（15 分钟）：下面的程序编译失败，报错原文如下。按读报错三步说出原因，给两个修法——一个删代码，一个用上它（提示：strings.Contains 判断包含）：

```go
package main

import "fmt"
import "strings"

func main() {
    fmt.Println("背包整理完成")
}
```

```text
# command-line-arguments
./main.go:4:2: imported and not used: "strings"
```

挑战题（半小时）：写「受伤模拟器」：血量 100，每次受伤 7 点，形态二循环到血量不大于 0，输出每次的剩余血量与总次数；结束后 if 分档：小于 10 次「轻伤」，小于 15 次「重伤」，否则「阵亡」。验收：输出行数与总次数一致（共 15 次）；go vet 零告警。提示（思路）：计数器循环外初始化；展开（关键写法）：hits++ 累加，分档放循环后。

## 12. 与之前和之后的知识的关系

- 往前：[Go 是什么](/go/010-WhatIsGo) 的纪律性格今天以真实报错落地；[工具链与环境搭建](/go/020-GoOverviewEnvSetup) 的 go run、go fmt、go vet 每天都在用；
- 往后：[函数与方法](/go/040-GoFunctionMethod) 拆分 main 里的逻辑，多返回值是错误处理的前奏；[数据结构](/go/050-GoDataStructure) 引入切片与 map，for 的 range 形态才算集齐；[接口与组合](/go/060-GoInterfaceComposition) 之后你的类型能接入标准库的一切；
- 主线回顾：010 认识 Go → 020 装环境 → 030 语法骨架 → 040 函数与方法，入门四部曲只剩最后一步。

## 13. 官方文档

- A Tour of Go 的 Basics 一章：https://go.dev/tour/basics
- 语言规范（25 个关键字的权威清单）：https://go.dev/ref/spec
- fmt 包文档（Println 与 Printf 的占位符）：https://pkg.go.dev/fmt

## 14. 自我检查

- 能合上文档写出最小 main.go 并解释每行作用；给出未初始化的 int、string、bool 声明，能立刻说出零值；
- 能说出 := 与 var 的使用边界（函数内新变量，包级与显式类型用 var）；
- 能用三种 for 形态各写一个从 5 数到 1 的循环；
- 能解释编译器与 go vet 的分工，并复述 %d 塞字符串时的真实输出。

## 本章总结

Hello Go 只有五行：package main 加 import 加 main 函数是入口骨架。包的纪律是导入即使用，unused import 与 unused variable 都是编译错误；变量三式以 := 为主角、零值兜底；for 是唯一的循环关键字，三段式、条件式、无限式覆盖全部场景；if 无括号、大括号强制，条件前还能塞一句初始化。编译器拦语法错，go vet 拦模式错。

## 下一步

进入 [函数与方法](/go/040-GoFunctionMethod)：把 main 里的逻辑拆成自己的函数，多返回值与 error 的世界从那里开始。
