---
order: 990
title: JShell 与 JPackage 交互环境
module: 'java'
category: 后端技术
difficulty: beginner
description: 用 jshell 即时验证语法与 API，用 jpackage 打出平台原生安装包。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'java/100-JavaCommandLineTools'
  - 'java/076-JavaBuildTool'
  - 'java/002-JavaOverviewDevEnv'
prerequisites:
  - 'java/002-JavaOverviewDevEnv'
---

## 0. 本节阅读指引（先读这一节）

本篇是「JShell 与 JPackage」交互环境与打包指南。

零基础第一遍只读：概念引入、jshell 完整会话示例、jpackage 完整流程；会用 jshell 验证语法、会打最简单的安装包。

可跳过：jpackage 平台选项、应用配置与 jshell 设置遇到再查。

前置：001 Java 概述与开发环境。

## 概念引入：两个工具各管一头

- **jshell（JDK 9+）是 REPL**（Read-Eval-Print Loop，读取-求值-打印循环）：输入一行 Java 代码，立刻看到结果，不用建工程、不用写 `main`、不用编译。类比：Python 的交互式解释器，或"带即时反馈的草稿纸"。学新 API、验证正则、算个日期，都比"建测试类跑一遍"快得多。
- **jpackage（JDK 14+）是打包器**：把"JRE + 你的 jar + 启动器"打成一个平台原生安装包（Windows 的 msi/exe、macOS 的 dmg、Linux 的 deb/rpm），让没装 Java 的用户也能双击安装。类比：把"程序 + 精简行李箱（自带运行时）"打包成一件托运行李。

两者的共同主题是"降低门槛"：jshell 降低学习与验证的门槛，jpackage 降低交付与安装的门槛。顺带一提，JDK 25 转正的"紧凑源文件与实例 main"（JEP 512）让单文件脚本进一步简化，与 jshell 形成"草稿纸 + 纸上程序"的互补。

## jshell 完整会话（照着敲一遍）

```text
$ jshell
|  Welcome to JShell -- Version 25
|  For an introduction type: /help intro

jshell> 1 + 1
$1 ==> 2                                  // 表达式结果自动存进变量 $1

jshell> String name = "Java"
name ==> "Java"

jshell> name.length()
$3 ==> 4                                  // 方法返回值也有编号

jshell> import java.time.LocalDate        // import 即输即生效

jshell> LocalDate.now().plusDays(7)
$5 ==> 2026-09-15                         // 自带 toString，日期直接看结果

jshell> int square(int x) { return x * x; }   // 方法定义无需类包装
|  Created method square(int)

jshell> square(9)
$7 ==> 81

jshell> /vars                             // 查看所有变量
|    String name = "Java"

jshell> /exit
|  Goodbye
```

典型工作流：开了两个终端——左边 jshell 试 API 写法，右边把验证过的代码抄进工程；遇到"这个正则到底匹配啥"的问题，十秒钟出答案。

## jpackage 完整流程（从 jar 到安装包）

```bash
# 0) 前提：已经用 Maven/Gradle 打出 app.jar（见 076 构建工具）

# 1) （可选）用 jlink 定制一个只含所需模块的精简 JRE，
#    让安装包不带完整运行时，体积从 ~300MB 缩到几十 MB
jlink --add-modules java.base,java.logging,java.sql \
      --output myjre --strip-debug --no-header-files --no-man-pages

# 2) 打 Windows 安装包（需已安装 WiX Toolset 3.x）
jpackage --name MyApp \
         --input target \
         --main-jar app.jar \
         --main-class com.example.Main \
         --app-version 1.0.0 \
         --vendor "Acme Inc" \
         --runtime-image myjre \
         --win-shortcut --win-menu

# 3) 产物：target/dist 下的 MyApp-1.0.0.msi，双击安装即用
```

macOS 与 Linux 换 `--type dmg` / `--type deb`（或 rpm），其余参数一致；`--main-jar` 与 `--module` 二选一（模块化应用用后者）。

## 常见陷阱

**jshell 陷阱一：把会话状态当一次性。** 变量、方法会跨片段累积，改了类定义后旧变量仍是旧类型；怀疑状态污染就 `/reset` 重来。

**jshell 陷阱二：不带分号在多行表达式中报错。** 单行表达式可省分号，跨行写复杂语句时补全分号最稳妥。

**jshell 陷阱三：想用第三方 jar 却没挂 classpath。** 启动时 `jshell --class-path "lib/*"`，之后 import 即可；启动后才发现，得退出重启。

**jpackage 陷阱四：Windows 上报 "WiX tools (msi/exe) not found"。** 打 msi/exe 必须先装 WiX Toolset 3.x 并加入 PATH；不想装就用 `--type app-image` 产出一个绿色文件夹。

**jpackage 陷阱五：以为它会自动编 jar。** 它只做"打包"，`--input` 目录里必须已经有构建产物；先把 Maven/Gradle 流程跑通。

**jpackage 陷阱六：图标与签名。** `--icon` 各平台要求各自的图标格式（ico/icns/png）；正式分发还要处理代码签名，这一步在 CI 里做而不是本地。

## jshell 启动

**基本写法：进入交互**
`jshell`
```bash
# 启动 REPL 交互环境
jshell
```

---

**基本写法：指定版本进入**
`jshell --execution <模式>`
```bash
# 本地执行模式
jshell --execution local
```

---

**基本写法：执行片段**
`jshell -e "<代码>"`
```bash
# 直接执行单段代码
jshell -e "System.out.println(\"hi\");"
```

---

## jshell 会话控制

**基本写法：加载文件**
`/open <文件路径>`
```java
// 在 jshell 内加载脚本文件
/open snippet.java
```

---

**基本写法：保存片段**
`/save <文件路径>`
```java
// 保存当前会话片段到文件
/save session.java
```

---

**基本写法：列出片段**
`/list`
```java
// 列出已输入的代码片段（带编号）
/list
// 仅列出有效片段
/list -all
```

---

**基本写法：查看变量**
`/vars`
```java
// 列出已定义的变量及值
/vars
```

---

**基本写法：查看方法**
`/methods`
```java
// 列出已定义的方法
/methods
```

---

**基本写法：查看类型**
`/types`
```java
// 列出已定义的类与接口
/types
```

---

**基本写法：查看导入**
`/imports`
```java
// 列出已导入的包
/imports
```

---

**基本写法：编辑片段**
`/edit <片段编号>`
```java
// 用外部编辑器编辑片段
/edit 1
```

---

**基本写法：重置会话**
`/reset`
```java
// 清空所有片段，重新开始
/reset
```

---

**基本写法：退出**
`/exit`
```java
// 退出 jshell
/exit
```

---

## jshell 设置

**基本写法：设置反馈模式**
`/set feedback <模式>`
```java
// concise / normal / silent / verbose
/set feedback verbose
```

---

**基本写法：添加导入**
`import <包名>;`
```java
// 直接输入 import 语句即可
import java.util.stream.*;
```

---

**基本写法：设置类路径**
`jshell --class-path <路径>`
```bash
# 启动时指定类路径
jshell --class-path "lib/*;bin"
```

---

## jpackage 基础

**基本写法：构建 Windows 安装包**
`jpackage --name <名称> --input <输入> --main-jar <主jar>`
```bash
# 打包成 Windows 安装程序（msi/exe）
jpackage --name MyApp --input target --main-jar app.jar
```

---

**基本写法：指定主类**
`jpackage --name <名称> --module <模块>/<主类>`
```bash
# 模块化应用打包
jpackage --name MyApp --module com.example.app/com.example.app.Main
```

---

**基本写法：指定运行时镜像**
`jpackage --runtime-image <镜像目录>`
```bash
# 使用自定义 JRE
jpackage --name MyApp --input target --main-jar app.jar --runtime-image myjre
```

---

**基本写法：应用镜像（免装工具链的通用产物）**
`jpackage --type app-image`
```bash
# 产出包含启动器的绿色目录，无需 WiX/系统打包器
jpackage --type app-image --name MyApp --input target --main-jar app.jar
```

---

## jpackage 平台选项

**基本写法：Windows 安装器类型**
`jpackage --win-msi`
```bash
# 生成 MSI 安装包
jpackage --name MyApp --input target --main-jar app.jar --win-msi
```

---

**基本写法：Windows 快捷方式**
`jpackage --win-shortcut --win-menu`
```bash
# 创建桌面快捷方式与开始菜单项
jpackage --name MyApp --input target --main-jar app.jar --win-shortcut --win-menu
```

---

**基本写法：macOS dmg**
`jpackage --type dmg --name <名称>`
```bash
# 生成 macOS dmg 镜像
jpackage --type dmg --name MyApp --module com.example.app/com.example.app.Main
```

---

**基本写法：macOS 应用图标**
`jpackage --icon <icns 文件>`
```bash
# 指定应用图标
jpackage --name MyApp --input target --main-jar app.jar --icon icon.icns
```

---

**基本写法：Linux deb/rpm**
`jpackage --type <deb|rpm>`
```bash
# 生成 Linux 安装包
jpackage --type deb --name myapp --input target --main-jar app.jar
```

---

## jpackage 应用配置

**基本写法：设置版本与供应商**
`jpackage --app-version <版本> --vendor <供应商>`
```bash
# 应用版本与供应商
jpackage --name MyApp --input target --main-jar app.jar \
    --app-version 1.0.0 --vendor "Acme Inc"
```

---

**基本写法：传入 JVM 参数**
`jpackage --java-options "<参数>"`
```bash
# 启动时传入 JVM 参数
jpackage --name MyApp --input target --main-jar app.jar \
    --java-options "-Xmx512m -Dfile.encoding=UTF-8"
```

---

**基本写法：应用参数**
`jpackage --arguments "<参数>"`
```bash
# 启动应用时传入的命令行参数
jpackage --name MyApp --input target --main-jar app.jar \
    --arguments "--mode=prod"
```

---

**基本写法：关联文件类型**
`jpackage --file-associations <属性文件>`
```bash
# 关联文件扩展名
jpackage --name MyApp --input target --main-jar app.jar \
    --file-associations app.properties
```

---

**基本写法：添加资源**
`jpackage --resource-dir <目录>`
```bash
# 指定图标与许可文件目录
jpackage --name MyApp --input target --main-jar app.jar \
    --resource-dir res
```

---

**基本写法：临时目录与详细输出**
`jpackage --temp <目录> --verbose`
```bash
# 指定临时目录并输出详细信息
jpackage --name MyApp --input target --main-jar app.jar \
    --temp build/tmp --verbose
```

## 小结

初学者记住三点：

> 1. jshell 是 Java 草稿纸：表达式即输即得，`/vars`、`/reset`、`/exit` 三个命令最常用。
> 2. jpackage 打"自带 JRE 的安装包"；打 msi 前先装 WiX，怕麻烦先用 `--type app-image`。
> 3. 两者都不参与构建：jar 交给 Maven/Gradle，jpackage 只管封装交付。

进阶者还需注意：

- jlink + jpackage 组合能把交付体积压到几十 MB，模块清单用 `jdeps --print-module-deps` 从代码反推。
- jshell 默认在每个语句间自动持久状态，教学演示建议 `/set feedback concise` 减少噪音。
- JDK 25+ 的紧凑源文件与实例 main 让"单文件脚本"不用类包装即可运行（`java script.java`），轻量脚本可不再依赖 jshell。
