---
order: 590
title: C Valgrind 内存检测
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 用 Valgrind 检测 C 程序内存问题：memcheck 实战走查、泄漏分类解读、各工具选型（cachegrind/callgrind/massif/helgrind）与 ASan 对比。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'c/042-MemoryManagement'
  - 'c/011-DynamicMemoryManagement'
  - 'c/058-CDebugGdb'
prerequisites:
  - 'c/042-MemoryManagement'
---

## 学习目标

- 理解 Valgrind 的工作方式（二进制插桩、无需重新编译）与适用边界
- 会跑一次完整 memcheck 检测，并逐行读懂错误报告与泄漏摘要
- 能区分 definitely lost / indirectly lost / possibly lost / still reachable 四类泄漏
- 按问题类型选对工具：内存错误用 memcheck、热点用 callgrind、堆增长用 massif、竞争用 helgrind/drd
- 知道 Valgrind 与 ASan 的取舍：不重编译但慢，与"重编译但快"互补

## Valgrind 是什么，怎么用

**Valgrind 是什么**：一个运行在 Linux 上的动态二进制插桩框架——它把你的程序放进一个"虚拟 CPU"里逐条指令执行，因此在执行过程中能观测到每一次内存读写、每一次 malloc/free。最大的实用优点是**不需要重新编译程序**（保留 `-g` 调试信息可让报告显示源码行号）；代价是程序会慢 10-30 倍。

典型工作流：

```bash
# 1. 编译时保留调试信息（不强制 -O0，但 -O0 报告最干净）
gcc -g -O0 main.c -o app

# 2. 用默认工具 memcheck 运行（leak-check 打开泄漏检测）
valgrind --leak-check=full --show-leak-kinds=all --track-origins=yes ./app
```

三个最常用选项的记忆法：`--leak-check=full`（泄漏逐条报告）、`--track-origins=yes`（未初始化值追根溯源）、`--error-exitcode=1`（发现错误即非零退出，接入 CI）。

## 实战走查：一段带病的程序

先看一段集中了三类典型错误的代码：

```c
/* bugs.c —— 三处问题：越界写、未初始化读、内存泄漏 */
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *arr = malloc(4 * sizeof(int));   // 只分配 4 个元素
    if (arr == NULL) return 1;

    for (int i = 0; i <= 4; i++) {        // 错误 1：i == 4 越界写
        arr[i] = i * 10;
    }

    int sum;
    for (int i = 0; i < 4; i++) {
        sum += arr[i];                    // 错误 2：sum 未初始化就累加
    }
    printf("sum = %d\n", sum);

    /* 错误 3：没有 free(arr)，函数结束内存泄漏 */
    return 0;
}
```

运行检测：

```bash
gcc -g -O0 bugs.c -o bugs
valgrind --leak-check=full --track-origins=yes ./bugs
```

memcheck 的报告（节选，地址与 PID 每次不同）：

```text
==12345== Invalid write of size 4
==12345==    at 0x10917A: main (bugs.c:10)          <- 定位到越界循环
==12345==  Address 0x4a8c050 is 0 bytes after a 16-byte block
==12345==  alloc'd at ...: malloc ... (bugs.c:6)     <- 指明这块内存来自第 6 行

==12345== Conditional jump or move depends on uninitialised value(s)
==12345==    at 0x10918E: main (bugs.c:14)          <- 未初始化的 sum

==12345== HEAP SUMMARY:
==12345==     in use at exit: 16 bytes in 1 blocks
==12345==   total heap usage: 1 allocs, 0 frees, 16 bytes allocated

==12345== 16 bytes in 1 blocks are definitely lost in loss record 1 of 1
==12345==    at ...: malloc ... (bugs.c:6)           <- 泄漏源头
```

三段报告分别对应三处错误，读法是固定套路：**先看错误类型（Invalid write / uninitialised / lost），再看 at 行号定位现场，再看 alloc'd 行号找到这块内存是谁分配的**。

修复后重跑，理想结果是报告末尾这两行：

```text
==12346== All heap blocks were freed -- no leaks are possible
==12346== ERROR SUMMARY: 0 errors from 0 contexts
```

## 泄漏分类怎么读

`--leak-check=full` 结束时按"指针是否还找得到"把泄漏分四类：

| 分类              | 含义                                   | 处理建议                       |
| :---------------- | :------------------------------------- | :----------------------------- |
| definitely lost   | 没有任何指针指向它，确凿泄漏           | 必须修                         |
| indirectly lost   | 本身有指针，但指针所在结构已泄漏       | 修掉根上的 definitely lost     |
| possibly lost     | 只剩指向块中间的指针（常见于移动指针遍历） | 人工确认是否误报           |
| still reachable   | 程序退出时仍有指针可达（如全局缓存）   | 通常无害，按需忽略或释放       |

注意：Valgrind 报的是"退出时堆上还剩什么"，长时间运行的服务（守护进程）不能等到退出才查，要把泄漏检测揉进例行测试。

## Memcheck 内存检测

**基本写法：完整内存检测**
`valgrind --leak-check=full <程序>`
```bash
# 详细检查内存泄漏并分类报告
valgrind --leak-check=full ./app
```

**基本写法：显示可达内存**
`valgrind --show-reachable=yes <程序>`
```bash
# 显示仍可达但未释放的内存
valgrind --leak-check=full --show-reachable=yes ./app
```

**基本写法：泄漏检测级别**
`valgrind --leak-check=<级别> <程序>`
```bash
# no 不检查 summary 概要 full 详细
valgrind --leak-check=summary ./app
```

**基本写法：未初始化值追踪**
`valgrind --track-origins=yes <程序>`
```bash
# 追踪未初始化值的来源
valgrind --track-origins=yes ./app
```

**基本写法：错误汇总**
`valgrind --error-exitcode=<码> <程序>`
```bash
# 发现错误时以指定退出码退出，便于 CI 检测
valgrind --error-exitcode=1 ./app
```

**基本写法：限制错误数**
`valgrind --errors-for-leak-kinds=<类型> <程序>`
```bash
# 指定计入错误的泄漏类型
# definite possible reachable
valgrind --errors-for-leak-kinds=definite ./app
```

## 调试符号与源码

**基本写法：带调试信息运行**
`gcc -g -O0 <源> && valgrind <程序>`
```bash
# 编译时加 -g 才能在报告中显示源码位置
gcc -g -O0 main.c -o app
valgrind --leak-check=full ./app
```

**基本写法：显示源码行**
`valgrind --num-callers=<深度> <程序>`
```bash
# 设置调用栈回溯深度
valgrind --num-callers=30 ./app
```

**基本写法：符号还原**
`valgrind --demangle=yes <程序>`
```bash
# 还原 C++ 符号名，C 程序默认即可
valgrind --demangle=yes ./app
```

## 工具选型速查

不同工具解决不同问题，按"怀疑什么"来选：

| 你怀疑的问题         | 选用工具   | 一句话说明                           |
| :------------------- | :--------- | :----------------------------------- |
| 越界/泄漏/未初始化   | memcheck   | 默认工具，覆盖 90% 的内存问题        |
| 程序慢，找热点函数   | callgrind  | 精确到函数/调用链的开销统计          |
| CPU 缓存命中率       | cachegrind | 模拟 I/D 缓存，配合 cg_annotate      |
| 堆内存越用越多       | massif     | 堆增长曲线快照，配合 ms_print        |
| 多线程数据竞争/死锁  | helgrind / drd | 两种竞争检测器，helgrind 更严格  |

## 缓存分析 Cachegrind

**基本写法：缓存命中分析**
`valgrind --tool=cachegrind <程序>`
```bash
# 分析 CPU 缓存命中率与缺失次数
valgrind --tool=cachegrind ./app
```

**基本写法：输出分析文件**
`valgrind --tool=cachegrind --cachegrind-out-file=<文件> <程序>`
```bash
# 生成 cgout 文件供 cg_annotate 分析
valgrind --tool=cachegrind --cachegrind-out-file=cg.out ./app
```

**基本写法：查看缓存报告**
`cg_annotate <文件>`
```bash
# 解析 cachegrind 输出文件
cg_annotate cg.out
```

## 调用分析 Callgrind

**基本写法：函数调用分析**
`valgrind --tool=callgrind <程序>`
```bash
# 收集函数调用次数与开销
valgrind --tool=callgrind ./app
```

**基本写法：收集缓存事件**
`valgrind --tool=callgrind --cache-sim=yes <程序>`
```bash
# 同时收集 I/D 缓存模拟数据
valgrind --tool=callgrind --cache-sim=yes ./app
```

**基本写法：查看调用报告**
`callgrind_annotate <文件>`
```bash
# 解析 callgrind 输出
callgrind_annotate callgrind.out.1234
```

**基本写法：图形化查看**
`kcachegrind <文件>`
```bash
# 用 GUI 工具浏览调用图
kcachegrind callgrind.out.1234
```

## 堆分析 Massif

**基本写法：堆内存快照**
`valgrind --tool=massif <程序>`
```bash
# 记录堆内存随时间变化
valgrind --tool=massif ./app
```

**基本写法：包含栈内存**
`valgrind --tool=massif --stacks=yes <程序>`
```bash
# 同时统计栈内存使用
valgrind --tool=massif --stacks=yes ./app
```

**基本写法：查看堆报告**
`ms_print <文件>`
```bash
# 解析 massif 输出为文本图表
ms_print massif.out.1234
```

## 线程检测 Helgrind/DRD

**基本写法：竞态检测**
`valgrind --tool=helgrind <程序>`
```bash
# 检测多线程数据竞争
valgrind --tool=helgrind ./app
```

**基本写法：锁顺序分析**
`valgrind --tool=helgrind --track-lockorders=yes <程序>`
```bash
# 检测潜在死锁
valgrind --tool=helgrind ./app
```

**基本写法：DRD 替代工具**
`valgrind --tool=drd <程序>`
```bash
# 另一个线程错误检测器，开销较低
valgrind --tool=drd ./app
```

**基本写法：检测栈变量竞争**
`valgrind --tool=drd --check-stack-var=yes <程序>`
```bash
# 检查栈变量上的线程错误
valgrind --tool=drd --check-stack-var=yes ./app
```

## 抑制误报

**基本写法：使用抑制文件**
`valgrind --suppressions=<文件> <程序>`
```bash
# 加载抑制规则屏蔽已知误报
valgrind --suppressions=lib.supp ./app
```

**基本写法：自动生成抑制规则**
`valgrind --gen-suppressions=all <程序>`
```bash
# 输出每个错误的抑制规则模板
valgrind --gen-suppressions=all ./app
```

**基本写法：抑制文件格式**
`{ <名称>, <工具>, <模式> ... }`
```text
# 抑制规则示例
{
   libfoo_false_positive
   Memcheck:Cond
   fun:foo_internal
}
```

原则：先修自己的代码，再考虑抑制；抑制规则要写明适用场景并定期复审，否则会把真问题也压掉。

## 性能与控制

**基本写法：统计子进程**
`valgrind --trace-children=yes <程序>`
```bash
# 跟踪 fork/exec 产生的子进程
valgrind --trace-children=yes ./app
```

**基本写法：输出时间戳**
`valgrind --time-stamp=yes <程序>`
```bash
# 在每条信息前加时间戳
valgrind --time-stamp=yes ./app
```

**基本写法：静默模式**
`valgrind -q <程序>`
```bash
# 静默模式，仅打印错误摘要
valgrind -q ./app
```

**基本写法：详细级别**
`valgrind --verbose <程序>`
```bash
# 输出更详细的执行信息
valgrind -v ./app
```

## 报告解读

**基本写法：错误类型**
`Invalid read/write / Use of uninitialised value`
```bash
# Invalid read   越界读
# Invalid write  越界写
# Uninit value   使用未初始化值
# Invalid free   重复释放或释放非法指针
# definitely lost 确定泄漏
```

**基本写法：泄漏分类**
`definitely / indirectly / possibly / still reachable`
```bash
# definitely lost   确定泄漏，无指针指向
# indirectly lost   间接泄漏，仅被泄漏内存引用
# possibly lost     可能泄漏，指针指向中间
# still reachable   程序退出时仍可达，通常无害
```

## 与 gcc sanitizer 对比

**基本写法：编译期地址检测**
`gcc -fsanitize=address -g <源>`
```bash
# AddressSanitizer 速度更快，作为 valgrind 替代
gcc -fsanitize=address -g main.c -o app
./app
```

**基本写法：运行时检测泄漏**
`ASAN_OPTIONS=detect_leaks=1 ./<程序>`
```bash
# ASan 配合 LeakSanitizer 检测泄漏
ASAN_OPTIONS=detect_leaks=1 ./app
```

**基本写法：选型建议**
`valgrind 用于完整检测，ASan 用于高频测试`
```bash
# valgrind 无需重编译，覆盖全面但慢 10-30 倍
# ASan 需重新编译，速度快但仅检测地址越界
# 建议开发用 ASan，发布前用 valgrind 复核
```

补充两个工程实践：Valgrind 不支持 Windows（WSL/macOS 也不完整，macOS 支持长期滞后于新系统），跨平台项目需准备 ASan/UBSan 作为替代路径；ASan 与 Valgrind 二选一运行即可，不要叠加。

## 小结

**初学者记住这三点：**

1. 标准姿势：`gcc -g` 编译，`valgrind --leak-check=full ./app` 运行，只看 `ERROR SUMMARY` 与泄漏摘要两处。
2. 报告读法：错误类型 -> at 行号（现场）-> alloc'd 行号（内存来源）。
3. definitely lost 必须修；still reachable 通常是可解释的全局缓存。

**进阶者还需注意：**

- `--track-origins=yes` 是排查"未初始化值"类报告的利器，代价是更慢，日常回归可不开。
- memcheck 只能看到"运行到的路径"：配合高覆盖率测试运行，报告才有说服力；CI 里加 `--error-exitcode=1` 做门禁。
- 长驻服务的内存问题用 massif 看增长趋势比看单次退出摘要更有效；多线程问题优先 helgrind，嫌慢再试 drd。
- 工具链组合拳：日常开发 ASan（快），提交前 Valgrind（全），两者互补而非互替；原理层面的内存错误分类见 [内存管理](/c/042-MemoryManagement)。


