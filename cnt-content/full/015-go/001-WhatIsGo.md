---
order: 10
title: Go 是什么：为大规模工程而生的简洁语言
module: 'go'
category: 后端技术
difficulty: beginner
description: 面向零基础读者介绍 Go 的定位、并发优势与工程哲学，完成第一个程序的运行。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'go/002-GoOverviewEnvSetup'
  - 'getting-started/002-WhatIsProgramming'
prerequisites:
  - 'getting-started/002-WhatIsProgramming'
---

## Go 在技术版图中的位置

Go（Golang）由 Google 于 2009 年发布，专为**大规模服务端工程**设计。今天的基础设施半壁江山由 Go 编写：Docker、Kubernetes、etcd、Prometheus——云原生时代的地基几乎都是 Go。

| 方向 | 代表产物 |
| --- | --- |
| 云原生与容器 | Docker、Kubernetes |
| 后端接口服务 | 各类高并发 API 服务 |
| 命令行工具 | 单文件分发、跨平台编译 |
| 中间件 | etcd、CockroachDB |

## 三个语言级卖点

**语法极小**：关键词只有 25 个（Java 是 50+），一门语言的官方规范一个下午能读完——这是刻意为之的设计哲学：**一门语言只提供一种写法，团队里一万个人写出的代码像一个模子。**

**并发开箱即用**：一行 `go 函数名()` 就能启动一个轻量并发任务（goroutine），底层由运行时调度到成千上万并发，这是"高并发后端"教学总用它举例的原因。

**编译产物单文件**：`go build` 产出一个可执行文件，丢到服务器就能跑，不需要安装运行时——部署体验碾压需要虚拟机的路线。

## 第一行代码

安装 Go 后（见 [Go 概述与环境配置](/go/002-GoOverviewEnvSetup)），新建 `hello.go`：

```go
package main

import "fmt"

func main() {
    fmt.Println("你好，Go")
}
```

终端执行：

```bash
go run hello.go    # 直接编译运行
go build hello.go  # 产出可执行文件 hello.exe / hello
```

逐行看：`package main` 声明主包；`import "fmt"` 引入格式化输出包；`func main` 是入口。没有任何多余样板——这就是 Go 的气质。

## 动手环节：感受并发

把 `main` 函数换成：

```go
func main() {
    for i := 1; i <= 3; i++ {
        go fmt.Println("并发任务", i)   // go 关键字：并发执行
    }
    fmt.Scanln()   // 等待回车，防止程序提前退出
}
```

`go` 一个关键字就把循环体变成并发执行——在其他语言里这需要线程池或复杂框架。先建立直观，本模块并发章节会深入 channel 与调度模型。

## 常见困惑

**"Go 没有类和继承？"**——它刻意不提供类继承，用"结构体 + 接口 + 组合"达到同等表达力，且避免深层继承带来的维护灾难。面向对象思想依然适用，只是形态不同。

**"与 Java 怎么选？"**——重业务逻辑、生态沉淀选 Java；重并发、云原生、部署简洁选 Go。本仓库两者都有完整模块，语法基础互通。

## 下一步

进入 [Go 概述与环境配置](/go/002-GoOverviewEnvSetup) 开始主线学习；并发与接口是本模块的灵魂，学到时建议回头重读本篇的两个动手环节。
