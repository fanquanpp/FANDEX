---
order: 750
title: C++ 链接与符号
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ 链接与符号 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 链接基础

**基本写法：链接目标文件**
`g++ <对象文件>... -o <输出>`
```bash
# 链接多个目标文件
g++ main.o utils.o io.o -o app
# 链接时指定库
g++ main.o -L./lib -lutils -o app
```

---

**基本写法：静态链接**
`g++ <源文件> -static -o <输出>`
```bash
# 完全静态链接
g++ main.cpp -static -o app
# 静态库参与链接
g++ main.cpp libutils.a -o app
```

---

**基本写法：动态链接**
`g++ <源文件> -l<库> -o <输出>`
```bash
# 链接动态库
g++ main.cpp -lutils -o app
# 运行时需要找到 .so
LD_LIBRARY_PATH=/path/to/lib ./app
```

---

## 符号查看

**基本写法：nm 列出符号**
`nm <目标文件>`
```bash
# 列出目标文件符号
nm main.o
nm -C main.o          # C++ 符号 demangle
nm -D libutils.so     # 动态符号
# 符号类型：
# T  代码段（已定义函数）
# U  未定义（外部引用）
# D  已初始化数据
# B  未初始化数据
# W  弱符号
```

---

**基本写法：demangle C++ 符号**
`c++filt <符号>`
```bash
# 还原 C++ 修饰名
echo _ZN3foo3barEv | c++filt
# 输出 foo::bar()
nm main.o | c++filt
```

---

**基本写法：objdump 反汇编**
`objdump -d <文件>`
```bash
# 反汇编目标文件
objdump -d main.o
objdump -d -M intel main.o    # Intel 语法
objdump -t libutils.so        # 符号表
objdump -T libutils.so        # 动态符号
objdump -h main.o             # 段信息
```

---

**基本写法：readelf 查看 ELF**
`readelf -a <文件>`
```bash
# 查看 ELF 文件信息
readelf -h app           # ELF 头
readelf -S app           # 段表
readelf -s app           # 符号表
readelf -d app           # 动态段
readelf -l app           # 程序头
```

---

## 动态库依赖

**基本写法：ldd 查看依赖**
`ldd <可执行文件>`
```bash
# 查看动态库依赖
ldd ./app
# 输出示例：
# libutils.so => ./libutils.so
# libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
```

---

**基本写法：ldconfig 配置**
`ldconfig [<目录>]`
```bash
# 更新动态链接器缓存
sudo ldconfig
sudo ldconfig /opt/mylib
# 查看缓存
ldconfig -p | grep utils
```

---

**基本写法：RPATH/RUNPATH**
`g++ -Wl,-rpath,<路径> <源文件>`
```bash
# 嵌入运行时库搜索路径
g++ main.cpp -L./lib -lutils -Wl,-rpath,./lib -o app
# -Wl,-rpath,$ORIGIN  相对可执行文件位置
g++ main.cpp -L./lib -lutils -Wl,-rpath,\$ORIGIN -o app
```

---

## 链接错误排查

**基本写法：未定义引用**
`undefined reference to \`<符号>\``
```bash
# 常见链接错误
# 1. 检查库是否链接
g++ main.cpp -lutils  # 添加 -l
# 2. 检查库顺序（被依赖的放后面）
g++ main.cpp -lA -lB  # 若 A 依赖 B
# 3. 检查库路径
g++ main.cpp -L./lib -lutils
```

---

**基本写法：重复定义**
`multiple definition of \`<符号>\``
```bash
# 符号重复定义
# 1. 检查是否在头文件中定义了全局变量/函数
# 2. 使用 inline 或 static 限制作用域
# 3. 头文件中只声明，源文件中定义
```

---

## 弱符号与可见性

**基本写法：弱符号**
`__attribute__((weak)) <声明>`
```cpp
// 弱符号：可被强符号覆盖
__attribute__((weak)) void hook() {
    // 默认实现
}
// 其他目标文件定义同名强符号会覆盖此实现
```

---

**基本写法：符号可见性**
`__attribute__((visibility("<可见性>"))`
```cpp
// 控制符号在动态库中的可见性
__attribute__((visibility("default"))) void api_func();
__attribute__((visibility("hidden"))) void internal_func();
// 默认隐藏，显式导出
// 编译选项：-fvisibility=hidden
```

---

## 链接脚本与控制

**基本写法：链接脚本**
`ld -T <脚本文件> <对象文件>`
```bash
# 使用自定义链接脚本
ld -T linker.ld main.o -o app
```

---

**基本写法：Map 文件**
`g++ -Wl,-Map,<文件> <源文件>`
```bash
# 生成链接 map 文件（查看符号地址）
g++ main.cpp -Wl,-Map,app.map -o app
```
