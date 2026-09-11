---
order: 590
title: 逆向工程命令（radare2/ghidra CLI）
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: '逆向工程命令行：radare2 分析与调试、Ghidra headless 反编译、字符串与加壳识别、恶意样本静态分析速览'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/570-MalwareAnalysis'
  - 'cybersecurity/580-BinarySecurityAndIncidentResponse'
  - 'cybersecurity/600-SteganographyTools'
  - 'cybersecurity/370-SecurityToolsPractice'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## radare2 基础操作

**基本写法:打开二进制文件**
`r2 <文件>`
```bash
# 使用 radare2 打开可执行文件
r2 ./binary
```

**基本写法:以分析模式打开**
`r2 -A <文件>`
```bash
# 打开时自动分析所有函数
r2 -A ./binary
```

**基本写法:不进入交互模式执行命令**
`r2 -q -c "<命令>" <文件>`
```bash
# 执行命令后退出
r2 -q -c "iI" ./binary
```

**基本写法:查看文件信息**
`iI`
```bash
# 在 radare2 中查看文件基本信息
iI
```

**基本写法:查看入口点**
`ie`
```bash
# 查看程序入口点地址
ie
```

**基本写法:查看节区信息**
`iS`
```bash
# 查看二进制文件的节区
iS
```

---

## radare2 函数分析

**基本写法:列出所有函数**
`afl`
```bash
# 列出所有分析的函数
afl
```

**基本写法:反汇编指定函数**
`pdf @ <函数名>`
```bash
# 反汇编 main 函数
pdf @ main
```

**基本写法:反汇编指定地址**
`pd 20 @ <地址>`
```bash
# 反汇编指定地址 20 条指令
pd 20 @ 0x08048456
```

**基本写法:查看函数调用图**
`agf @ <函数名>`
```bash
# 查看 main 函数的控制流图
agf @ main
```

**基本写法:重命名函数**
`afn <新名称> <地址>`
```bash
# 重命名指定地址的函数
afn my_function 0x08048456
```

**基本写法:分析函数交叉引用**
`axt @ <地址>`
```bash
# 查找调用指定地址的代码位置
axt @ sym.imp.printf
```

---

## radare2 字符串与数据

**基本写法:查看所有字符串**
`iz`
```bash
# 列出数据节区中的字符串
iz
```

**基本写法:查看所有字符串(全文件)**
`izz`
```bash
# 列出整个文件中的字符串
izz
```

**基本写法:搜索字符串**
`/<字符串>`
```bash
# 在文件中搜索指定字符串
/password
```

**基本写法:搜索十六进制模式**
`/x <十六进制>`
```bash
# 搜索十六进制字节模式
/x 4889e5
```

**基本写法:查看指定地址数据**
`px 64 @ <地址>`
```bash
# 查看指定地址 64 字节的十六进制
px 64 @ 0x08048456
```

**基本写法:查看指定地址为字符串**
`ps @ <地址>`
```bash
# 以字符串形式查看指定地址数据
ps @ 0x08048456
```

---

## radare2 调试功能

**基本写法:启动调试模式**
`r2 -d <文件>`
```bash
# 以调试模式打开程序
r2 -d ./binary
```

**基本写法:设置断点**
`db <地址>`
```bash
# 在指定地址设置断点
db 0x08048456
```

**基本写法:运行程序**
`dc`
```bash
# 继续运行程序直到断点
dc
```

**基本写法:单步执行**
`ds`
```bash
# 单步执行一条指令
ds
```

**基本写法:查看寄存器**
`dr`
```bash
# 查看所有寄存器值
dr
```

**基本写法:查看栈内容**
`px 64 @ esp`
```bash
# 查看栈顶 64 字节内容
px 64 @ esp
```

---

## radare2 内存分析

**基本写法:查看内存映射**
`dm`
```bash
# 查看进程内存映射
dm
```

**基本写法:查看堆内容**
`px 128 @ <堆地址>`
```bash
# 查看堆内存内容
px 128 @ 0x0804a000
```

**基本写法:修改内存**
`wx <十六进制> @ <地址>`
```bash
# 修改指定地址的内存内容
wx 9090 @ 0x08048456
```

**基本写法:写入字符串**
`w <字符串> @ <地址>`
```bash
# 在指定地址写入字符串
w "hello" @ 0x0804a000
```

**基本写法:搜索内存**
`/<模式> @ <地址> <长度>`
```bash
# 在内存中搜索模式
/e flag @ 0x0804a000 0x1000
```

---

## Ghidra 命令行操作

**基本写法:启动 Ghidra GUI**
`ghidraRun`
```bash
# 启动 Ghidra 图形界面
ghidraRun
```

**基本写法:启动分析器**
`analyzeHeadless <项目目录> <项目名> -import <文件>`
```bash
# 使用 Ghidra 无界面分析二进制文件
analyzeHeadless /tmp/ghidra_project MyProject -import ./binary
```

**基本写法:运行 Ghidra 脚本**
`analyzeHeadless <项目目录> <项目名> -process <文件> -postScript <脚本>`
```bash
# 分析后运行指定脚本
analyzeHeadless /tmp/ghidra_project MyProject -process binary -postScript DecompileAllFunctions.java
```

**基本写法:导出分析结果**
`analyzeHeadless <项目目录> <项目名> -process <文件> -postScript <导出脚本>`
```bash
# 导出反编译结果到文件
analyzeHeadless /tmp/ghidra_project MyProject -process binary -postScript ExportDecompilation.java "output_dir"
```

**基本写法:运行 Python 脚本**
`analyzeHeadless <项目目录> <项目名> -process <文件> -postScript <Python脚本>`
```bash
# 使用 Python 脚本进行批量分析
analyzeHeadless /tmp/ghidra_project MyProject -process binary -postScript AnalyzeFunctions.py
```

---

## Ghidra 脚本编写

**基本写法:Python 反编译脚本**
`python3 -c "from ghidra import DecompInterface; ..."`
```bash
# Ghidra Python 脚本批量反编译
# from ghidra import DecompInterface
# decomp = DecompInterface()
# decomp.openProgram(currentProgram)
# for func in currentProgram.getFunctionManager().getFunctions(True):
#     result = decomp.decompileFunction(func, 30, None)
#     print(result.getDecompiledFunction().getC())
```

**基本写法:列出所有函数**
`python3 -c "from ghidra import *; ..."`
```bash
# Ghidra 脚本列出所有函数
# fm = currentProgram.getFunctionManager()
# for func in fm.getFunctions(True):
#     print(func.getName(), func.getEntryPoint())
```

**基本写法:导出字符串**
`python3 -c "from ghidra import *; ..."`
```bash
# 导出二进制中所有字符串
# from ghidra.program.util import DefinedDataIterator
# for data in DefinedDataIterator.definedStrings(currentProgram):
#     print(data.getValue())
```

**基本写法:分析交叉引用**
`python3 -c "from ghidra import *; ..."`
```bash
# 分析函数的交叉引用
# from ghidra.program.model.symbol import RefType
# rm = currentProgram.getReferenceManager()
# for ref in rm.getReferencesTo(addr):
#     print(ref.getFromAddress())
```

---

## objdump 反汇编工具

**基本写法:反汇编全部代码**
`objdump -d <文件>`
```bash
# 反汇编所有代码段
objdump -d ./binary
```

**基本写法:反汇编指定段**
`objdump -d -j <段名> <文件>`
```bash
# 仅反汇编 .text 段
objdump -d -j .text ./binary
```

**基本写法:查看符号表**
`objdump -t <文件>`
```bash
# 查看所有符号表
objdump -t ./binary
```

**基本写法:查看节区头**
`objdump -h <文件>`
```bash
# 查看所有节区头信息
objdump -h ./binary
```

**基本写法:显示源代码混合**
`objdump -S <文件>`
```bash
# 混合显示源代码与反汇编(需调试信息)
objdump -S ./binary
```

**基本写法:显示重定位信息**
`objdump -R <文件>`
```bash
# 查看动态重定位表
objdump -R ./binary
```

---

## 其他逆向工具

**基本写法:使用 strings 提取字符串**
`strings <文件>`
```bash
# 提取可执行文件中的字符串
strings ./binary
```

**基本写法:指定最小长度**
`strings -n <长度> <文件>`
```bash
# 提取长度至少为 8 的字符串
strings -n 8 ./binary
```

**基本写法:使用 file 检测类型**
`file <文件>`
```bash
# 检测文件类型与架构
file ./binary
```

**基本写法:使用 nm 查看符号**
`nm <文件>`
```bash
# 查看二进制符号表
nm ./binary
```

**基本写法:使用 ldd 查看依赖**
`ldd <文件>`
```bash
# 查看动态链接库依赖
ldd ./binary
```

**基本写法:使用 strace 跟踪系统调用**
`strace <程序>`
```bash
# 跟踪程序的系统调用
strace ./binary
```

**基本写法:使用 ltrace 跟踪库调用**
`ltrace <程序>`
```bash
# 跟踪程序的库函数调用
ltrace ./binary
```

---

## ELF 文件分析

**基本写法:查看 ELF 头**
`readelf -h <文件>`
```bash
# 查看 ELF 文件头信息
readelf -h ./binary
```

**基本写法:查看程序头**
`readelf -l <文件>`
```bash
# 查看 ELF 程序头表
readelf -l ./binary
```

**基本写法:查看节区头**
`readelf -S <文件>`
```bash
# 查看 ELF 节区头表
readelf -S ./binary
```

**基本写法:查看动态段**
`readelf -d <文件>`
```bash
# 查看 ELF 动态段信息
readelf -d ./binary
```

**基本写法:查看符号表**
`readelf -s <文件>`
```bash
# 查看 ELF 符号表
readelf -s ./binary
```

---

## PE 文件分析

**基本写法:使用 pefile 分析 PE**
`python3 -c "import pefile; pe=pefile.PE('<文件>'); print(pe)"`
```bash
# Python 分析 PE 文件
python3 -c "import pefile; pe=pefile.PE('program.exe'); print(pe.dump_info())"
```

**基本写法:查看 PE 节区**
`python3 -c "import pefile; pe=pefile.PE('<文件>'); [print(s.Name, s.VirtualAddress) for s in pe.sections]"`
```bash
# 查看 PE 文件的节区信息
python3 -c "import pefile; pe=pefile.PE('program.exe'); [print(s.Name.decode(), hex(s.VirtualAddress)) for s in pe.sections]"
```

**基本写法:查看 PE 导入表**
`python3 -c "import pefile; pe=pefile.PE('<文件>'); print(pe.DIRECTORY_ENTRY_IMPORT)"`
```bash
# 查看 PE 文件的导入表
python3 -c "import pefile; pe=pefile.PE('program.exe'); [print(entry.dll, [imp.name for imp in entry.imports]) for entry in pe.DIRECTORY_ENTRY_IMPORT]"
```

**基本写法:查看 PE 导出表**
`python3 -c "import pefile; pe=pefile.PE('<文件>'); print(pe.DIRECTORY_ENTRY_EXPORT)"`
```bash
# 查看 PE 文件的导出表
python3 -c "import pefile; pe=pefile.PE('program.dll'); [print(exp.name) for exp in pe.DIRECTORY_ENTRY_EXPORT.symbols]"
```

---

## 自动化逆向脚本

**基本写法:批量提取字符串**
`for f in <目录>/*; do strings -n 8 "$f"; done`
```bash
# 批量提取目录中所有文件的字符串
for f in /malware/*; do echo "=== $f ==="; strings -n 8 "$f"; done
```

**基本写法:批量获取文件信息**
`for f in <目录>/*; do file "$f"; done`
```bash
# 批量检测文件类型
for f in /malware/*; do echo "$f: $(file -b "$f")"; done
```

**基本写法:radare2 批量分析**
`for f in <目录>/*; do r2 -q -c "iI" "$f"; done`
```bash
# 批量获取文件基本信息
for f in /samples/*; do echo "=== $f ==="; r2 -q -c "iI" "$f"; done
```

**基本写法:生成分析报告**
`r2 -q -c "iI; ie; afl; iz" <文件> > <报告>`
```bash
# 生成文件分析报告
r2 -q -c "iI; ie; afl; iz" ./binary > analysis_report.txt
```

**基本写法:YARA 规则扫描**
`yara -r <规则文件> <目标文件>`
```bash
# 使用 YARA 规则匹配二进制特征
yara -r malware_rules.yar ./binary
```
