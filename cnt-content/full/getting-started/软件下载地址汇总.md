---
order: 100
title: 软件下载地址汇总
module: 'getting-started'
category: toolchain
difficulty: beginner
description: 常用开发软件的官网与下载地址汇总，涵盖编辑器、IDE、运行时、版本控制、容器、数据库客户端、API测试、终端、设计等全栈工具。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'getting-started/调试思想'
  - 'getting-started/Windows环境配置教程'
  - 'getting-started/macOS环境配置教程'
prerequisites:
  - 'getting-started/入门指南'
---

## 编辑器与 IDE

| 名称          | 官网                                        | 下载链接                                       | 简介                                                          | 支持平台                      |
| ------------- | ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- | ----------------------------- |
| VS Code       | <https://code.visualstudio.com>             | <https://code.visualstudio.com/#alt-downloads> | 微软开源轻量编辑器，插件生态丰富，前端/全栈首选               | Windows / macOS / Linux / Web |
| IntelliJ IDEA | <https://www.jetbrains.com/idea>            | <https://www.jetbrains.com/idea/download>      | JetBrains 出品 Java IDE，Ultimate 付费 / Community 免费       | Windows / macOS / Linux       |
| WebStorm      | <https://www.jetbrains.com/webstorm>        | <https://www.jetbrains.com/webstorm/download>  | JetBrains 出品前端 IDE，付费（个人版有优惠）                  | Windows / macOS / Linux       |
| PyCharm       | <https://www.jetbrains.com/pycharm>         | <https://www.jetbrains.com/pycharm/download>   | JetBrains 出品 Python IDE，Professional 付费 / Community 免费 | Windows / macOS / Linux       |
| GoLand        | <https://www.jetbrains.com/go>              | <https://www.jetbrains.com/go/download>        | JetBrains 出品 Go IDE，付费                                   | Windows / macOS / Linux       |
| Vim / Neovim  | <https://www.vim.org> / <https://neovim.io> | <https://github.com/neovim/neovim/releases>    | 终端编辑器，Neovim 是现代化分支，支持 LSP 和 Lua 配置         | Windows / macOS / Linux       |
| Sublime Text  | <https://www.sublimetext.com>               | <https://www.sublimetext.com/download>         | 高性能文本编辑器，启动极快，支持无限评估                      | Windows / macOS / Linux       |

## 编程语言运行时

| 名称               | 官网                                                 | 下载链接                                       | 简介                                                                | 支持平台                |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| Node.js            | <https://nodejs.org>                                 | <https://nodejs.org/en/download>               | JavaScript 运行时，推荐 LTS 版本；也可通过 nvm/fnm 管理多版本       | Windows / macOS / Linux |
| Python             | <https://www.python.org>                             | <https://www.python.org/downloads>             | 通用编程语言，安装时注意勾选 "Add to PATH"；推荐通过 pyenv 管理版本 | Windows / macOS / Linux |
| Java JDK (Oracle)  | <https://www.oracle.com/java/technologies/downloads> | 同官网                                         | Oracle 官方 JDK，商业使用需许可                                     | Windows / macOS / Linux |
| Java JDK (OpenJDK) | <https://adoptium.net>                               | <https://adoptium.net/temurin/releases>        | Eclipse Temurin 发行版，免费开源，社区活跃                          | Windows / macOS / Linux |
| Java JDK (GraalVM) | <https://www.graalvm.org>                            | <https://www.graalvm.org/downloads>            | Oracle 出品高性能 JDK，支持 AOT 编译与多语言运行                    | Windows / macOS / Linux |
| Go                 | <https://go.dev>                                     | <https://go.dev/dl>                            | Google 出品系统编程语言，编译快速，原生并发                         | Windows / macOS / Linux |
| .NET SDK           | <https://dotnet.microsoft.com>                       | <https://dotnet.microsoft.com/download>        | 微软跨平台开发框架，支持 C# / F# / VB.NET                           | Windows / macOS / Linux |
| Kotlin             | <https://kotlinlang.org>                             | <https://github.com/JetBrains/kotlin/releases> | JetBrains 出品 JVM 语言，Android 官方推荐，支持多平台               | Windows / macOS / Linux |

## 版本控制

| 名称           | 官网                            | 下载链接                        | 简介                                        | 支持平台                |
| -------------- | ------------------------------- | ------------------------------- | ------------------------------------------- | ----------------------- |
| Git            | <https://git-scm.com>           | <https://git-scm.com/downloads> | 分布式版本控制系统，开发必备                | Windows / macOS / Linux |
| GitHub Desktop | <https://desktop.github.com>    | <https://desktop.github.com>    | GitHub 官方 GUI 客户端，简化 Git 操作       | Windows / macOS         |
| Sourcetree     | <https://www.sourcetreeapp.com> | <https://www.sourcetreeapp.com> | Atlassian 出品免费 Git/Mercurial GUI 客户端 | Windows / macOS         |

## 容器与虚拟化

| 名称           | 官网                                             | 下载链接                                         | 简介                                                   | 支持平台                |
| -------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------ | ----------------------- |
| Docker Desktop | <https://www.docker.com/products/docker-desktop> | <https://www.docker.com/products/docker-desktop> | 容器化平台桌面版，集成 Docker Engine 与 Docker Compose | Windows / macOS         |
| Podman         | <https://podman.io>                              | <https://podman.io/getting-started/installation> | Docker 替代品，无守护进程，rootless 模式更安全         | Windows / macOS / Linux |
| VirtualBox     | <https://www.virtualbox.org>                     | <https://www.virtualbox.org/wiki/Downloads>      | Oracle 开源虚拟机，跨平台，适合运行完整操作系统        | Windows / macOS / Linux |

## 数据库客户端

| 名称            | 官网                                             | 下载链接                                       | 简介                                                                | 支持平台                |
| --------------- | ------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| MySQL Workbench | <https://www.mysql.com/products/workbench>       | <https://dev.mysql.com/downloads/workbench>    | MySQL 官方可视化管理工具，支持数据建模与迁移                        | Windows / macOS / Linux |
| DBeaver         | <https://dbeaver.io>                             | <https://dbeaver.io/download>                  | 通用数据库客户端，支持 MySQL / PostgreSQL / SQLite 等几乎所有数据库 | Windows / macOS / Linux |
| pgAdmin         | <https://www.pgadmin.org>                        | <https://www.pgadmin.org/download>             | PostgreSQL 官方管理工具，Web 与桌面版可选                           | Windows / macOS / Linux |
| RedisInsight    | <https://redis.io/insight>                       | <https://redis.io/insight>                     | Redis 官方可视化工具，支持 CLI、内存分析、流查看                    | Windows / macOS / Linux |
| MongoDB Compass | <https://www.mongodb.com/products/tools/compass> | <https://www.mongodb.com/try/download/compass> | MongoDB 官方 GUI 工具，支持聚合管道构建与查询分析                   | Windows / macOS / Linux |

## API 测试

| 名称     | 官网                      | 下载链接                            | 简介                                                       | 支持平台                |
| -------- | ------------------------- | ----------------------------------- | ---------------------------------------------------------- | ----------------------- |
| Postman  | <https://www.postman.com> | <https://www.postman.com/downloads> | API 调试与测试平台，支持 Mock Server、自动化测试、团队协作 | Windows / macOS / Linux |
| Insomnia | <https://insomnia.rest>   | <https://insomnia.rest/download>    | 轻量级 REST/GraphQL 客户端，开源版免费，界面简洁           | Windows / macOS / Linux |

## 终端工具

| 名称             | 官网                                    | 下载链接                             | 简介                                                   | 支持平台      |
| ---------------- | --------------------------------------- | ------------------------------------ | ------------------------------------------------------ | ------------- |
| Windows Terminal | <https://github.com/microsoft/terminal> | Microsoft Store 搜索安装             | Windows 现代终端，支持多标签、GPU 加速渲染、自定义主题 | Windows       |
| iTerm2           | <https://iterm2.com>                    | <https://iterm2.com/downloads.html>  | macOS 终端增强工具，支持分屏、搜索、自动补全           | macOS         |
| Oh My Zsh        | <https://ohmyz.sh>                      | <https://github.com/ohmyzsh/ohmyzsh> | Zsh 配置框架，丰富主题与插件生态（git、z、sudo 等）    | macOS / Linux |

## 设计工具

| 名称   | 官网                     | 下载链接                           | 简介                                               | 支持平台                      |
| ------ | ------------------------ | ---------------------------------- | -------------------------------------------------- | ----------------------------- |
| Figma  | <https://www.figma.com>  | <https://www.figma.com/downloads>  | 在线协作设计工具，前端切图常用，支持实时多人编辑   | Windows / macOS / Linux / Web |
| Sketch | <https://www.sketch.com> | <https://www.sketch.com/downloads> | macOS 原生 UI 设计工具，符号系统强大，插件生态丰富 | macOS                         |

## 其他工具

| 名称            | 官网                                         | 下载链接                                  | 简介                                                             | 支持平台                |
| --------------- | -------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- | ----------------------- |
| Chrome DevTools | <https://developer.chrome.com/docs/devtools> | 内置于 Chrome 浏览器                      | 前端调试利器，支持 DOM 检查、网络分析、性能剖析、Lighthouse 审计 | Windows / macOS / Linux |
| Wireshark       | <https://www.wireshark.org>                  | <https://www.wireshark.org/download.html> | 网络协议分析器，支持深度抓包与过滤，网络排障必备                 | Windows / macOS / Linux |

## 下载建议

1. 优先通过各软件官网下载，确保获取最新安全版本
2. 部分软件可通过包管理器安装（Windows: Chocolatey/Scoop, macOS: Homebrew, Linux: apt/yum/pacman），详见各平台环境配置教程
3. JetBrains 全家桶学生可申请免费教育授权：<https://www.jetbrains.com/shop/eform/students>
4. GitHub 学生包包含大量免费工具与云服务：<https://education.github.com/pack>
