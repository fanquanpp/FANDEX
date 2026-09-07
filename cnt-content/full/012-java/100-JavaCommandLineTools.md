---
order: 1000
title: Java 命令行工具 javac/java/jar/jshell/jpackage 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 命令行工具 javac/java/jar/jshell/jpackage 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/099-JavaJshellJpackage'
  - 'java/076-JavaBuildTool'
prerequisites:
  - 'java/002-JavaOverviewDevEnv'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Java 命令行工具」语法速查手册，按需查阅。

零基础第一遍只读：javac 编译与 java 运行；jar 打包、jshell、jpackage 遇到再查。

前置：001 Java 概述与开发环境、002 快速入门。


## javac 编译

**基本写法：编译源文件**
`javac <源文件>.java`
```bash
# 编译单个源文件
javac Main.java
```

---

**基本写法：指定输出目录**
`javac -d <输出目录> <源文件>`
```bash
# 编译并输出到 bin 目录
javac -d bin src/Main.java
```

---

**基本写法：指定 classpath**
`javac -cp <路径> <源文件>`
```bash
# 编译时引用外部依赖
javac -cp "lib/*" -d bin src/Main.java
```

---

**基本写法：指定源版本与目标版本**
`javac --source <版本> --target <版本> <源文件>`
```bash
# 用 Java 21 语法编译为 21 字节码
javac --release 21 -d bin src/Main.java
```

---

**基本写法：启用预览特性**
`javac --enable-preview --release <版本> <源文件>`
```bash
# 启用 Java 23 预览特性
javac --enable-preview --release 23 src/Main.java
```

---

## java 运行

**基本写法：运行主类**
`java -cp <路径> <主类>`
```bash
# 运行编译后的类
java -cp bin com.example.Main
```

---

**基本写法：运行 jar**
`java -jar <文件>.jar`
```bash
# 运行可执行 jar
java -jar app.jar
```

---

**基本写法：传递程序参数**
`java -cp <路径> <主类> <参数>...`
```bash
# 传递命令行参数
java -cp bin Main arg1 arg2
```

---

**基本写法：设置 JVM 属性**
`java -D<名>=<值> -cp <路径> <主类>`
```bash
# 设置系统属性
java -Dconfig=prod -cp bin Main
```

---

**基本写法：设置堆内存**
`java -Xmx<大小> -Xms<大小> -cp <路径> <主类>`
```bash
# 设置最大堆 2G 初始堆 512M
java -Xmx2g -Xms512m -cp bin Main
```

---

## jar 打包

**基本写法：创建 jar**
`jar cf <文件>.jar -C <目录> .`
```bash
# 把 bin 目录打包成 app.jar
jar cf app.jar -C bin .
```

---

**基本写法：创建可执行 jar**
`jar cfe <文件>.jar <主类> -C <目录> .`
```bash
# 指定主类打成可执行 jar
jar cfe app.jar com.example.Main -C bin .
```

---

**基本写法：查看 jar 内容**
`jar tf <文件>.jar`
```bash
# 列出 jar 中的条目
jar tf app.jar
```

---

**基本写法：解压 jar**
`jar xf <文件>.jar`
```bash
# 解压到当前目录
jar xf app.jar
```

---

## jshell 交互式 REPL

**基本写法：启动 jshell**
`jshell`
```bash
# 启动 Java 交互式环境
jshell
```

---

**基本写法：执行片段**
`jshell -e "<表达式>"`
```bash
# 直接执行表达式
jshell -e "System.out.println(1+2)"
```

---

**基本写法：加载文件**
`/open <文件>`
```bash
# 在 jshell 中加载源文件
/open Main.java
```

---

## jpackage 打包

**基本写法：打包应用**
`jpackage --input <目录> --name <名称> --main-jar <文件> --main-class <类>`
```bash
# 打包成原生安装包
jpackage --input bin --name MyApp --main-jar app.jar --main-class com.example.Main
```

---

**基本写法：指定类型**
`jpackage --type <类型> --input <目录> --name <名称>`
```bash
# 指定输出类型 msi/exe/dmg/rpm/deb
jpackage --type msi --input bin --name MyApp --main-jar app.jar
```
