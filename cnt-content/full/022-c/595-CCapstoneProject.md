---
order: 600
title: C 毕业项目：零依赖动态数组与哈希表库
description: C 模块出口项目（Level 7）：纯 C99 手写自动扩容 vector 与开放寻址字符串键哈希表，接口头 + 实现 + 自写断言测试 + Makefile + ASan/Valgrind 双零报告 + README，user stories 验收、提示从高到无。
module: 'c'
category: 计算机科学
difficulty: advanced
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/200-DynamicMemoryManagement'
  - 'c/210-MemoryManagement'
  - 'c/130-StructAndUnion'
  - 'c/220-MemoryAlignmentDeepDive'
  - 'c/310-MultiFileCompilation'
  - 'c/510-CValgrind'
prerequisites:
  - 'c/200-DynamicMemoryManagement'
  - 'c/210-MemoryManagement'
---

## 前置知识

- 已完成 [动态内存](/c/200-DynamicMemoryManagement) 与 [内存深水区](/c/210-MemoryManagement)：malloc/calloc/realloc/free 四件套信手拈来，「分配即判 NULL、free 后置 NULL、临时指针接 realloc」三条纪律已经长在手上；
- 已完成 [结构体与联合体](/c/130-StructAndUnion) 与 [指针深度解析](/c/140-PointerDeep)：会用结构体打包「长度 + 数据」，会传递和改写二级指针；
- 会用 [多文件编译](/c/310-MultiFileCompilation) 的三文件工程组织代码，命令行里能直接跑 gcc。

## 学习目标

完成本项目后你将能够：

1. 独立实现自动扩容的动态数组（vector）与开放寻址哈希表（字符串键），并用测试证明它们「扩得对、删得净、不泄漏」；
2. 用「接口头文件 + 实现 + 自写断言测试」的形态交付一个零依赖纯 C99 静态库；
3. 用计数钩子把「扩容策略」「rehash 次数」从口头承诺变成可断言的事实；
4. 让 ASan 与 Valgrind 在百万级压力循环下交出双零报告，建立长跑进程的内存卫生直觉。

预计 4 到 5 天。**正文不提供项目代码，只提供需求与验收**——毕业项目不给答案。

## 项目背景与目标

你要给纯 C 世界补上两个最常用的数据结构，做成一个零依赖、纯 C99 的静态库：

- **vec**：动态数组。装什么类型在初始化时用「元素大小」声明，容量不够自动扩容，支持尾部追加与任意下标的插入删除；
- **map**：字符串键哈希表。开放寻址解决冲突，负载因子超标自动 rehash，提供 put/get/remove/size 四件套。

给谁用：下一个的你。「数组不够长」「按名字查一条配置」几乎每个 C 工程都要重造一遍。学完本项目，你新增的能力是：把 200 到 230 四篇练出的指针、动态内存、结构体、对齐功夫，组装成「接口 + 实现 + 测试 + 文档」的完整交付物。这也是真实 C 工程的交付形态——作者的 FoloToy-calendar（github.com/fanquanpp/FoloToy-calendar）就是同类纯 C 固件项目：模块化目录、脚本一键构建、README 说话。

库的名字与函数前缀自己定（vec/map、arr/ht 均可）；初始容量、增长系数、负载因子阈值也自己定——但每个决定都要写进 README 并给出理由。

## 必做 user stories

以下 C1-C10 全部必做。每条都是可检查的断言，不是「感觉做完了」。

- C1：工程骨架立起来：头文件、实现、测试至少三个源文件，`make` 一键编译零警告，`make test` 一键跑全部断言并打印通过数（断言用 `<assert.h>` 或自写宏均可，但必须自己写测试）；
- C2：vec 创建与回收：初始化后长度为 0；尾部追加 1000 个 int 后逐个读回全对；销毁后用 ASan 跑测试零报告；
- C3：扩容策略可证明：给 vec 挂一个计数钩子，每次因扩容搬家记一次；先在纸上算出「1.5 倍增长下 10000 次 push 的搬家次数上界」，再写成断言——实际搬家次数不超过这个上界，且每次新容量不小于旧容量的 1.5 倍；
- C4：vec 中间操作：按下标插入与删除后，后续元素整体移动正确；头插、尾删、空表删除、越界下标四个边界各有一条测试；
- C5：vec 泛型存储：同一个 vec 实现，初始化时传入元素大小，能分别装下 int、含三个成员的 struct、以及 strdup 出来的字符串；字符串键值谁分配谁 free，在头文件注释里写明；
- C6：map 基本四件套：put/get/remove/size 行为正确；get 不存在的键返回 NULL；对同一键 put 两次是覆盖——size 不变、取到新值、旧值不泄漏（ASan 下证明）；
- C7：冲突与 rehash：程序生成 10000 个键，全部 put 后全部 get 回正确值；负载因子达到你定的阈值时触发 rehash（计数钩子记录次数），rehash 后所有旧键仍能取回；
- C8：删除墓碑：开放寻址里删除若干键之后，同一条探测链上再插入新键，新键和没删的旧键都要能取回；这样的「删-插-查」组合测试至少五组；
- C9：长跑零泄漏：一百万次「put-remove」循环加十万次「追加-弹出」循环后正常退出，Valgrind 报 0 leaks，报告原文贴进 README；

```bash
valgrind --leak-check=full ./build/test_stress
```

```text
All heap blocks were freed -- no leaks are possible
```

- C10：交付形态完整：Makefile 含 all/test/asan/clean 四个目标；README 含 API 一览表、各操作复杂度表、扩容与 rehash 策略说明、构建与测试命令；Git 提交历史能看出「先 vec 后 map 再压测」的开发顺序。

## Extra credit

- E1：迭代失效负向测试：把 `vec_data()` 返回的指针存为别名，push 触发扩容后再用旧别名，在 ASan 下跑出 heap-use-after-free 报告——把「扩容后旧指针全部失效」从注释变成实证，报告原文贴进 README；
- E2：值析构钩子：map 支持注册值析构回调，put 覆盖、remove、销毁时自动调用；测试里用计数器断言「每个放入的值恰好析构一次」；
- E3：缩容策略：vec 删除后元素数低于容量四分之一时收缩（带滞后区间防抖动），map 同理；收缩前后的内存占用对比写进 README；
- E4：哈希函数对比：在 FNV-1a 之外再实现一种（djb2 或简化版 Murmur），用真实词表统计 10000 个键在两种函数下的最长探测链，结论写进 README。

## 里程碑（每步做完都该看到什么）

1. **vec 能跑**（C1-C5）：`./build/test_vec` 打印全部断言通过，此刻项目里还没有哈希表的影子。该读：[动态内存](/c/200-DynamicMemoryManagement)、[内存深水区](/c/210-MemoryManagement)、[结构体与联合体](/c/130-StructAndUnion)、[多文件编译](/c/310-MultiFileCompilation)；
2. **map 能跑**（C6-C8）：`./build/test_map` 全绿，含冲突压力与墓碑组合测试。该读：[内存对齐](/c/220-MemoryAlignmentDeepDive) 与 [布局深水区](/c/230-AlignmentMemoryLayout)——桶数组和条目结构怎么排才不浪费内存，这两篇有现成答案；
3. **卫生达标**（C9）：`make asan` 与 Valgrind 双零报告。第一次跑大概率报出一串泄漏，正是 200/210 篇练过的破案流程。该读：[C Valgrind 内存检测](/c/510-CValgrind)、[静态分析与调试](/c/490-StaticAnalysisDebug)；
4. **交付**（C10）：别人 clone 你的仓库，看 README 就能用上你的库。该读：[构建系统](/c/470-BuildSystem)、[动态库与静态库](/c/320-DynamicStaticLibrary)。

## 提示区

### 文档矩阵

| 卡住的地方 | 回去读 |
| --- | --- |
| realloc 怎么扩容、返回值怎么接 | [动态内存](/c/200-DynamicMemoryManagement) |
| 扩容后旧指针为什么不能用、事故报告怎么读 | [内存深水区](/c/210-MemoryManagement) |
| struct 怎么表达「长度 + 数据」 | [结构体与联合体](/c/130-StructAndUnion) |
| 结构体成员怎么排更省内存 | [内存对齐](/c/220-MemoryAlignmentDeepDive)、[布局深水区](/c/230-AlignmentMemoryLayout) |
| 头文件守卫与 extern 声明 | [多文件编译](/c/310-MultiFileCompilation) |
| 泄漏报告读不懂 | [C Valgrind 内存检测](/c/510-CValgrind) |

### 常见坑

- **realloc 丢指针**：`p = realloc(p, new)` 一旦失败返回 NULL，原地址从此无人知晓——用临时指针接返回值，成功才覆盖；
- **迭代失效**：扩容可能整体搬家，搬家后一切旧指针（包括调用方手里的数据指针）全部悬空。接口注释必须写明这条纪律，E1 用负向测试证明它；
- **墓碑不是 bug**：开放寻址里把删除的槽直接清空，会截断后面的探测链——后来插入的键永远找不到。正确做法是留「已删除」标记：查找遇到墓碑继续走，插入遇到墓碑可以复用；墓碑还要计入负载因子，否则 rehash 永远不来；
- **字符串键所有权**：键是 strdup 进来的还是借用调用方的？put 覆盖时旧键谁 free？没想清楚之前不要写 map 的第一行代码；
- **assert 陷阱**：测试编译别加 `-DNDEBUG`，否则所有断言静默消失——测试「全绿」，但什么都没测。断言要覆盖行为本身：

```c
assert(map_size(&m) == 2);
assert(map_get(&m, "gone") == NULL);
```

## 验收清单

- [ ] C1-C10 逐条自测通过并勾选
- [ ] ASan 与 Valgrind 双零报告的运行输出（贴进 README）
- [ ] 扩容搬家次数的钩子统计数据（写进 README 或测试输出）
- [ ] 另写一个 main.c，只 include 你的两个头文件、链接你的库，就能用上 vec 和 map——证明交付形态完整
- [ ] E1-E4 完成的项在 README 里标注

## 常见弯路

1. 上来就写「万能泛型宏」——先把 int 版本写对跑通，再引入元素大小与 memcpy；一步到位的泛型通常死在第一次扩容；
2. 测试只测「放进去能取出来」——事故都藏在状态变化里：删了再放、满了再扩、覆盖后再删，C4/C6/C8 的边界才是主战场；
3. 哈希函数随手 `key[0] % 桶数`——所有键挤进同一两个桶；先打印分布，再谈冲突；
4. 把墓碑当 bug 修掉——留标记是对的第一步，错的是不把墓碑算进负载因子；
5. README 只写构建命令——复杂度表与扩容策略，才是别人敢把你的库编进固件的理由。

## 完成后你能做什么

你拥有一个「扩容可量化、删除可证明、百万级压力零泄漏」的纯 C 数据结构库——指针、动态内存、结构体、对齐四项能力在此闭环。往下走：把库接到文件上做持久化（[文件 I/O 操作](/c/430-StdioFileIO)），带进并发场景（[线程与并发](/c/360-ThreadConcurrency)），或者读 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)，把同一套纪律带进只有几十 KB 堆的固件世界——FoloToy-calendar 就是那个方向的活例子。
