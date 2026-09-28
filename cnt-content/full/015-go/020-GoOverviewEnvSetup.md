---
order: 20
title: 工具链与环境搭建：一个 go 命令走天下
module: 'go'
category: 后端技术
difficulty: beginner
description: 装好 Go 并用 go version 验证；用 go mod init 建立现代模块并与 GOPATH 时代一句对照；跑通 go run、go build、go fmt、go test 四命令并核对预期输出；配好 VS Code 与 gopls，读懂两类新手必踩报错。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'go/010-WhatIsGo'
  - 'go/030-GoBasicSyntax'
  - 'go/310-PackageManagementDetailed'
  - 'go/110-GoStandardLibraryToolchain'
prerequisites:
  - 'go/010-WhatIsGo'
---

## 前置知识

- 已完成 [Go 是什么](/go/010-WhatIsGo)：知道 Go 的心智模型（编译型、垃圾回收、goroutine 内建），见过 hello.go 的样子，了解「编译器当纪律委员」的性格。

还没读完上一篇也没关系：本文从敲第一行命令开始，跟着做即可。

## 学习目标

读完本文你将能够：

1. 用三条命令之一装好 Go，并用 go version 验证安装成功；
2. 用 go mod init 建立现代模块，说出它取代了什么旧制度；
3. 跑通 go run、go build、go fmt、go test 四个命令，并核对各自的预期输出；
4. 配好 VS Code 与 gopls，说出保存文件时后台发生了什么；
5. 读懂「命令找不到」与「go.mod 找不到」两类新手报错并自行修复。

预计 40 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：装一门语言要装几个命令

回忆其他语言的开工仪式。Java：javac 编译、java 运行、jar 打包、javadoc 文档，四件套四个命令；Python：pip 装依赖、venv 建环境、black 格式化、pytest 跑测试，四个工具各装各的、各有各的参数。

Go 的答案是把瑞士军刀收进一个刀柄：**一个 go 命令，所有能力都是它的子命令**。装好 Go，等于同时装好了编译器、格式化器、测试器、依赖管理器、文档生成器。今天的任务就是把刀柄握在手里，试出最常用的四把刀。

| 子命令 | 干什么 | 对应其他语言的什么 |
| --- | --- | --- |
| go run | 编译到临时目录并立即运行 | python xxx.py 的即写即跑 |
| go build | 编译出可执行文件 | javac 与 jar 的合体 |
| go fmt | 统一格式化 | black / prettier |
| go test | 运行测试 | pytest / jest |
| go mod | 模块与依赖管理 | pip 与 npm 的依赖部分 |
| go get | 下载第三方依赖 | pip install / npm install |

## 2. 安装与验证

三条路任选其一（版本号以 [go.dev/dl](https://go.dev/dl/) 当前显示为准，写作时点最新稳定线为 Go 1.27）：

```bash
# Windows（PowerShell）
winget install GoLang.Go

# macOS（Homebrew）
brew install go

# Linux：下载官方压缩包解压到 /usr/local
wget https://go.dev/dl/go1.27.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.27.0.linux-amd64.tar.gz
```

Linux 还需把 go 加入 PATH（Windows 与 macOS 的安装器会自动配好）：

```bash
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

验证——注意：**安装完成后必须重开一个终端**，否则 PATH 不生效：

```bash
go version
```

预期输出（数字随你安装的版本）：

```text
go version go1.27.0 windows/amd64
```

末尾的 windows/amd64 换成你的平台（linux/amd64、darwin/arm64 等）。

## 3. 第一个模块：go mod init

现在的 Go 项目都以**模块（module）**为单位：一个目录加一个 go.mod 文件，声明「这个项目叫什么、依赖哪些包的哪些版本」。建一个：

```bash
mkdir hello-go
cd hello-go
go mod init hello-go
```

预期输出：

```text
go: creating new go.mod: module hello-go
```

打开生成的 go.mod 看一眼：

```text
module hello-go

go 1.27.0
```

第一行是模块名，最后一行记录创建它的工具链版本。此后所有 go 命令都在这个目录体系下工作。

一句话对照旧时代：Go 1.11 之前（2018 年前），所有代码必须塞进固定目录 `$GOPATH/src`，import 路径与磁盘目录绑定；Modules 机制之后，**项目想放哪放哪，依赖与版本写进 go.mod**。旧资料里再看到 GOPATH，知道是历史包袱即可（机制细节见 [包管理与依赖](/go/310-PackageManagementDetailed)）。

在模块里写下 main.go，后面四把刀都用它试：

```go
package main

import "fmt"

func greeting(name string) string {
    return "你好, " + name // func 的完整语法在函数与方法篇讲透，先混个眼熟
}

func main() {
    fmt.Println(greeting("Go"))
}
```

```bash
go run main.go
```

预期输出：

```text
你好, Go
```

## 4. 四把刀逐把试

### 4.1 go run：即写即跑

上面已经用过：编译到临时目录、运行、清理，一气呵成。学习期与写小脚本的主力。

### 4.2 go build：产出可执行文件

在模块根目录执行：

```bash
go build
```

预期：**没有任何输出**，但目录里多出一个文件——Windows 下是 hello-go.exe，Linux 与 macOS 下是 hello-go（名字取自模块名）。直接运行它：

```bash
./hello-go.exe    # Linux/macOS 是 ./hello-go
```

预期输出：

```text
你好, Go
```

这个文件就是上一篇说的「单文件二进制」：目标机器不用装任何运行时，拷到同类系统的服务器就能跑。交叉编译一行命令：`GOOS=linux GOARCH=amd64 go build`。

### 4.3 go fmt：格式是命令不是喜好

先把 main.go 的缩进故意打乱（删掉函数体前面的空格），然后：

```bash
go fmt ./...
```

预期输出（列出被改写的文件）：

```text
main.go
```

再打开 main.go：缩进已恢复成标准格式。对已格式化的项目执行同一命令没有任何输出——安静就是好消息。

### 4.4 go test：测试开箱即用

先在没有测试文件时试一下：

```bash
go test
```

预期输出：

```text
?   	hello-go	[no test files]
```

（字段间的空白是制表符，对齐即可。）新建 main_test.go：

```go
package main

import "testing"

func TestGreeting(t *testing.T) {
    got := greeting("FANDEX")
    want := "你好, FANDEX"
    if got != want {
        t.Errorf("got %q, want %q", got, want)
    }
}
```

再跑：

```bash
go test
```

预期输出：

```text
ok  	hello-go	0.003s
```

ok 表示全部通过，末尾是耗时。测试文件必须以 _test.go 结尾、测试函数以 Test 开头并接收 *testing.T——这套命名约定让 go test 自动发现测试，完整体系见 [Go 测试](/go/350-GoTest)。

## 5. 编辑器：VS Code + gopls

安装 VS Code 的官方 Go 扩展（发布者 Go Team at Google）。首次打开 .go 文件，右下角会提示安装 gopls 与 dlv，全部同意。三件事值得知道：

- **gopls 是语言服务器**：补全、跳转、重命名、实时报错都由它提供——编译器还没跑，红线已经画好；
- **保存即格式化**：默认保存时自动执行格式化，你永远不会提交乱格式代码；
- **报错双保险**：编辑器红线与终端 go build 的报错内容一致，学会读后者，前者自然懂。

商业 IDE GoLand 功能更全，学习期 VS Code 足够。

## 6. 修改实验

实验一：把 greeting 的返回值改成两句拼接（名字与等级），go run 验证；再 go build，运行产物核对输出一致——run 与 build 的产物内容应该完全相同。

实验二：把测试里的 want 改成故意错误的字符串，先写预期输出再 go test：

```text
--- FAIL: TestGreeting (0.00s)
    main_test.go:9: got "你好, Go", want "你好, FANDEX"
FAIL
FAIL	hello-go	0.105s
```

读法：FAIL 行给出失败的测试名，缩进行是 t.Errorf 的内容与行号，最后一行是模块级失败汇总。改回正确值让 ok 回来。

实验三：把 go.mod 里的模块名手工改成 scoreboard，执行 go build，观察产物名变成 scoreboard.exe——模块名决定产物名。验完改回。

## 7. 常见错误与调试实录

错误一：go 命令找不到。Windows cmd 下：

```text
'go' 不是内部或外部命令，也不是可运行的程序或批处理文件。
```

bash 下是 `command not found: go`。定位三步：装了吗（重开终端再看）、Linux 的 PATH 里有没有 `/usr/local/go/bin`、安装器是否真的写了环境变量（Windows 可重跑安装器修复）。九成是没重开终端。

错误二：在模块外跑 go test 或 go build：

```text
go: go.mod file not found in current directory or any parent directory; see 'go help modules'
```

原因：这两个命令以模块为单位工作，当前目录向上找不到 go.mod。修法：cd 到模块根目录。注意 go run main.go 可以在任意目录跑单文件——这是 run 与其他命令的分界线。

错误三（预告）：第一次下载第三方依赖（go get）时，国内网络常见超时：

```text
go: module github.com/google/uuid: Get "https://proxy.golang.org/github.com/google/uuid/@v/list": dial tcp 142.250.66.145:443: i/o timeout
```

（IP 与具体路径随网络而异。）修法是配置官方中国区代理，一次写入永久生效：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

依赖管理的完整机制见 [包管理与依赖](/go/310-PackageManagementDetailed)。

## 8. 实际项目中的使用场景

- CI 流水线：Go 项目流水线的标配两行就是 `go build ./...` 与 `go test ./...`，四把刀天天上工；
- Docker 镜像：官方 golang 镜像多阶段构建，最终只拷贝二进制，镜像可小到十几 MB；
- 代码评审：go fmt 统一格式后，评审意见只剩逻辑问题，格式噪音为零；
- 安装工具：go install 一行安装 hugo 等社区 CLI 工具，安装即编译，天然适配本机平台（见 [标准库与工具链](/go/110-GoStandardLibraryToolchain)）。

## 9. 小练习

预测题（5 分钟）：在一个空目录里执行 go mod init demo，然后创建内容只有一行 `package main` 的 main.go，执行 go test。预测输出再运行核对。

（提示：回想 4.4 节的两种输出，以及「没有测试函数」属于哪一种。验证：输出形如 `?   	demo	[no test files]`。）

修改题（15 分钟）：新建模块 scoreboard，main.go 输出一行「排行榜加载完成」，go build 产出可执行文件并直接运行验证。验收：产物名与模块名一致。

修 Bug 题（15 分钟）：同学在桌面（任意非模块目录）写了一份合法的 main.go，执行 go test 报错如下。按读报错三步定位原因，给出两种修法——一种动目录，一种动文件（动文件的修法只用得上 run 的能力）：

```text
go: go.mod file not found in current directory or any parent directory; see 'go help modules'
```

挑战题（半小时）：把 hello-go 升级为「签到程序」：main 输出「签到成功」；新增 checkin_test.go，断言某函数的返回值包含「签到」二字。验收：go test 输出 ok；把返回值改坏一次让 go test 变红，贴出报错后改回绿色。提示（思路）：先定义返回字符串的函数再测它；展开（关键写法）：strings.Contains 判断包含，记得 import "strings"。

## 10. 与之前和之后的知识的关系

- 往前：[Go 是什么](/go/010-WhatIsGo) 承诺的「复杂度内置在工具链与运行时里」，本文的四把刀就是实物证据；
- 往后：[基本语法](/go/030-GoBasicSyntax) 开始，每个示例都在 hello-go 模块里演化；greeting 函数的完整语法在 [函数与方法](/go/040-GoFunctionMethod) 补齐；
- 更远：go test 今天只用了一成功能，[Go 测试](/go/350-GoTest) 与 [单元测试与基准](/go/360-UnitTestBenchmark) 会展开表驱动测试与基准测试。

## 11. 官方文档

- 下载页（各平台安装器与当前版本）：https://go.dev/dl/
- 命令总览（go 的全部子命令）：https://go.dev/doc/cmd
- 编辑器与 gopls 指南：https://go.dev/doc/editors

## 12. 自我检查

- 能不看文档说出 go run、go build、go fmt、go test 各自的产出（内存中运行、磁盘上的二进制、改写后的文件、ok 或 FAIL 行）；
- 能说出 go.mod 两行的含义，以及它取代的旧制度名字；
- 给出「go 不是内部或外部命令」或 go.mod file not found，能在三步内定位；
- 能解释保存 .go 文件时 VS Code 背后发生的两件事（gopls 检查、自动格式化）。

## 本章总结

一个 go 命令收拢了编译、运行、格式化、测试与依赖管理：run 即写即跑，build 产出单文件二进制，fmt 让格式成为命令而非喜好，test 用命名约定自动发现测试。go mod init 建立的模块取代了 GOPATH 时代的固定目录制，go.mod 声明模块名与工具链版本。gopls 把同一套报错提前到编辑器里。下一篇开始，这把瑞士军刀正式用来磨代码。

## 下一步

进入 [基本语法](/go/030-GoBasicSyntax)：Hello Go、变量三式与唯一的 for——hello-go 模块从今天起逐步长大。
