---
order: 570
title: C 编译器命令语法速查手册
module: 'c'
category: 计算机科学
difficulty: beginner
description: C 编译器命令 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 基本编译命令

**基本写法：编译为可执行文件**
`gcc <源文件> -o <输出>`
```bash
# 编译 main.c 为 app 可执行文件
gcc main.c -o app
```

**基本写法：仅编译不链接**
`gcc -c <源文件>`
```bash
# 生成目标文件 main.o
gcc -c main.c
```

**基本写法：指定 C 标准**
`gcc -std=<标准> <源文件>`
```bash
# 常用标准：c99 c11 c17 c23
gcc -std=c11 main.c -o app
```

**基本写法：clang 替代 gcc**
`clang <源文件> -o <输出>`
```bash
# clang 命令行与 gcc 基本兼容
clang -std=c11 main.c -o app
```

**基本写法：指定输出名**
`gcc <源文件> -o <输出路径>`
```bash
# -o 指定输出文件路径
gcc main.c utils.c -o bin/app
```

---

## 警告与错误

**基本写法：开启全部警告**
`gcc -Wall <源文件>`
```bash
# 启用常见警告
gcc -Wall main.c -o app
```

**基本写法：额外警告**
`gcc -Wextra <源文件>`
```bash
# 在 -Wall 基础上启用更多警告
gcc -Wall -Wextra main.c -o app
```

**基本写法：警告转为错误**
`gcc -Werror <源文件>`
```bash
# 将所有警告视为编译错误
gcc -Wall -Werror main.c -o app
```

**基本写法：特定警告开关**
`gcc -W<警告名> / -Wno-<警告名>`
```bash
# -W<name> 开启 -Wno-<name> 关闭
gcc -Wunused -Wno-unused-parameter main.c
```

**基本写法：格式字符串检查**
`gcc -Wformat -Wformat-security`
```bash
# 检查 printf/scanf 格式串安全性
gcc -Wformat -Wformat-security main.c
```

---

## 优化选项

**基本写法：优化级别**
`gcc -O<级别> <源文件>`
```bash
# 0 不优化 1 2 3 逐步加强 s 减小体积 g 调试友好
gcc -O2 main.c -o app
```

**基本写法：调试信息**
`gcc -g <源文件>`
```bash
# 生成 DWARF 调试信息，供 gdb 使用
gcc -g -O0 main.c -o app
```

**基本写法：分级调试信息**
`gcc -g<级别> <源文件>`
```bash
# g1 最少 g2 默认 g3 包含宏定义
gcc -g3 main.c -o app
```

**基本写法：链接时优化**
`gcc -flto <源文件>`
```bash
# 跨编译单元链接时优化
gcc -O2 -flto main.c utils.c -o app
```

**基本写法：目标架构优化**
`gcc -march=<架构> <源文件>`
```bash
# 针对特定 CPU 架构优化
gcc -march=native main.c -o app
```

---

## 预处理选项

**基本写法：定义宏**
`gcc -D<名称>[=<值>] <源文件>`
```bash
# 编译期定义宏，不带值默认为 1
gcc -DDEBUG -DVERSION=2 main.c
```

**基本写法：取消宏定义**
`gcc -U<名称> <源文件>`
```bash
# 取消已定义的宏
gcc -UDEBUG main.c
```

**基本写法：添加包含目录**
`gcc -I<目录> <源文件>`
```bash
# 添加头文件搜索路径
gcc -I./include -I./src main.c
```

**基本写法：仅预处理**
`gcc -E <源文件>`
```bash
# 输出预处理后的源码到 stdout
gcc -E main.c
```

**基本写法：生成依赖关系**
`gcc -M <源文件> / gcc -MM <源文件>`
```bash
# 输出 Makefile 依赖，-MM 忽略系统头文件
gcc -MM main.c
```

**基本写法：输出到文件**
`gcc -E <源文件> -o <输出>`
```bash
# 预处理结果写入文件
gcc -E main.c -o main.i
```

---

## 链接选项

**基本写法：链接库**
`gcc <源文件> -l<库名>`
```bash
# 链接 lib<name>.so 或 lib<name>.a
gcc main.c -lm -lpthread
```

**基本写法：库搜索目录**
`gcc -L<目录> <源文件> -l<库>`
```bash
# 添加库文件搜索路径
gcc -L./lib main.c -lmylib
```

**基本写法：静态链接指定库**
`gcc -Wl,-Bstatic -l<库> -Wl,-Bdynamic`
```bash
# 强制静态链接某库后恢复动态链接
gcc main.c -Wl,-Bstatic -lmylib -Wl,-Bdynamic
```

**基本写法：完全静态链接**
`gcc -static <源文件>`
```bash
# 生成不依赖动态库的可执行文件
gcc -static main.c -o app
```

**基本写法：共享库名**
`gcc -Wl,-soname,<名称> -shared -o <库>`
```bash
# 生成带 SONAME 的动态库
gcc -shared -Wl,-soname,libmy.so.1 -o libmy.so.1.0 my.c
```

**基本写法：运行时库路径**
`gcc -Wl,-rpath,<目录> <源文件>`
```bash
# 写入可执行文件运行时搜索路径
gcc -Wl,-rpath,./lib main.c -lmylib
```

---

## 输出与文件类型

**基本写法：生成汇编**
`gcc -S <源文件>`
```bash
# 生成 .s 汇编文件不汇编
gcc -S main.c
```

**基本写法：生成动态库**
`gcc -shared -fPIC <源文件> -o <库>`
```bash
# -fPIC 生成位置无关代码，-shared 生成动态库
gcc -fPIC -shared mylib.c -o libmy.so
```

**基本写法：位置无关代码**
`gcc -fPIC -c <源文件>`
```bash
# 编译为位置无关目标文件，用于动态库
gcc -fPIC -c mylib.c
```

**基本写法：指定输出文件类型**
`gcc -x <语言> <文件>`
```bash
# 强制按指定语言处理输入文件
gcc -x c header.h
```

---

## 平台与目标

**基本写法：指定目标平台**
`gcc --target=<三元组> <源文件>`
```bash
# 交叉编译目标三元组
gcc --target=arm-linux-gnueabihf main.c
```

**基本写法：指定 sysroot**
`gcc --sysroot=<目录> <源文件>`
```bash
# 交叉编译时指定系统根目录
gcc --sysroot=/opt/arm-rootfs main.c
```

**基本写法：32/64 位**
`gcc -m32 / -m64 <源文件>`
```bash
# 生成 32 位或 64 位代码
gcc -m32 main.c -o app32
```

---

## 诊断与信息

**基本写法：查看预定义宏**
`gcc -dM -E - < /dev/null`
```bash
# 输出所有预定义宏
gcc -dM -E - < /dev/null
```

**基本写法：查看包含路径**
`gcc -print-search-dirs`
```bash
# 显示编译器搜索路径
gcc -print-search-dirs
```

**基本写法：查看默认标准**
`gcc -dM -E - < /dev/null | grep __STDC`
```bash
# 查看默认 C 标准版本
gcc -dM -E - < /dev/null | grep __STDC_VERSION
```

**基本写法：查看版本**
`gcc --version`
```bash
# 显示编译器版本信息
gcc --version
```

**基本写法：详细编译过程**
`gcc -v <源文件>`
```bash
# 显示完整编译各阶段命令
gcc -v main.c -o app
```

**基本写法：保存所有中间文件**
`gcc -save-temps <源文件>`
```bash
# 保留预处理、汇编、目标文件
gcc -save-temps main.c -o app
```

---

## 安全与硬化选项

**基本写法：栈保护**
`gcc -fstack-protector-strong <源文件>`
```bash
# 插入栈溢出检测 canary
gcc -fstack-protector-strong main.c
```

**基本写法：地址随机化**
`gcc -fPIE -pie <源文件>`
```bash
# 生成位置无关可执行文件
gcc -fPIE -pie main.c -o app
```

**基本写法：Fortify 源码**
`gcc -D_FORTIFY_SOURCE=<级别> -O<级别>`
```bash
# 缓冲区函数加强检查，需配合优化
gcc -D_FORTIFY_SOURCE=2 -O2 main.c
```

**基本写法：RelRO**
`gcc -Wl,-z,relro,-z,now <源文件>`
```bash
# 启用完全只读重定位
gcc -Wl,-z,relro,-z,now main.c
```

---

## Clang 专属特性

**基本写法：Clang 静态分析**
`clang --analyze <源文件>`
```bash
# 运行静态分析器查找缺陷
clang --analyze main.c
```

**基本写法：彩色诊断输出**
`clang -fcolor-diagnostics <源文件>`
```bash
# 彩色高亮警告与错误信息
clang -fcolor-diagnostics main.c
```

**基本写法：AddressSanitizer**
`gcc -fsanitize=address <源文件>`
```bash
# 启用内存越界检测（gcc 与 clang 通用）
gcc -fsanitize=address -g main.c -o app
```

**基本写法：UBSan**
`gcc -fsanitize=undefined <源文件>`
```bash
# 启用未定义行为检测
gcc -fsanitize=undefined -g main.c -o app
```

**基本写法：多 sanitizer 组合**
`gcc -fsanitize=address,undefined <源文件>`
```bash
# 同时启用多个 sanitizer
gcc -fsanitize=address,undefined -g main.c
```

---

## 多文件构建

**基本写法：分别编译后链接**
`gcc -c <源>... && gcc <目标>... -o <输出>`
```bash
# 分步编译加快增量构建
gcc -c main.c
gcc -c utils.c
gcc main.o utils.o -o app
```

**基本写法：一步多文件编译**
`gcc <源1> <源2> ... -o <输出>`
```bash
# 一次性编译链接多个源文件
gcc main.c utils.c -o app
```
