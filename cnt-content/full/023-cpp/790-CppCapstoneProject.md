---
order: 760
title: C++ 毕业项目：零依赖内存安全的数据缓冲库
description: C++ 模块出口项目（Level 6）：手写一个 Buffer 类族，把移动语义、RAII、智能指针与模板基础组装成带测试的静态库，user stories 验收、提示从高到无。
module: 'cpp'
category: 计算机科学
difficulty: advanced
author: fanquanpp
updated: '2026-10-05'
related:
  - 'cpp/090-RvalueReferenceMoveSemantics'
  - 'cpp/100-MoveSemanticsDetailed'
  - 'cpp/130-SmartPointerDeepDive'
  - 'cpp/160-RAIIResourceManagement'
prerequisites:
  - 'cpp/100-MoveSemanticsDetailed'
  - 'cpp/160-RAIIResourceManagement'
---

## 前置知识

- 已完成 cpp 模块主线到 [RAII](/cpp/160-RAIIResourceManagement)：理解所有权、引用、移动、智能指针；
- 会用 CMake 或「g++ 多文件 + 头文件」组织工程（[命名空间与链接](/cpp/050-NamespaceLinkage) 的三文件工程即可起步）；
- 已完成 [Git 毕业项目](/git/430-GitCapstoneProject) 或等价的仓库管理能力。

## 学习目标

完成本项目后你将能够：

1. 独立实现一个符合三/五法则的资源管理类，并通过测试证明它「拷贝对、移动快、不泄漏」；
2. 用移动语义与完美转发写出对调用方友好的库接口；
3. 搭建一个最小测试工程（自写断言或引入 Catch2/doctest 均可），并用 sanitizers 验证内存安全；
4. 把上述内容打包为静态库 + 头文件 + README 的可交付形态。

预计 3 到 4 天。**正文不提供项目代码，只提供需求与验收**——毕业项目不给答案。

## 项目：零依赖 Buffer 库 bufx

实现一个动态字节缓冲区类 `Buffer`：自动管理内存、支持拷贝与移动、支持下标与迭代访问，配套一组测试证明其正确性与性能特征。

### 必做 user stories

- C1：`Buffer b(1024)` 分配 1024 字节并清零；`size()` 返回 1024；
- C2：支持 `b[i]` 与 `at(i)`：越界时 `at` 抛 `std::out_of_range`，`operator[]` 不检查（两者分工在头文件注释里写明）；
- C3：拷贝构造与拷贝赋值为深拷贝：`Buffer a = b;` 之后改 `a[0]` 不影响 `b[0]`；
- C4：移动构造与移动赋值只转移指针：写一个计数分配器（统计分配次数），断言「从临时对象构造」的分配次数为 0；
- C5：移动后的源对象可安全析构与重新赋值（moved-from 纪律，测试覆盖）；
- C6：支持 `data()`、`begin()`/`end()`，能直接跑 `std::sort(b.begin(), b.end())`；
- C7：三/五法则完整：类声明处注释说明你实现了哪几个特殊成员、为什么；
- C8：测试工程至少 10 条断言覆盖 C1-C6，一键运行（脚本或 CTest）；
- C9：以 `-fsanitize=address,undefined` 跑全量测试零报告；
- C10：Git 仓库 + README：构建命令、API 一览表、移动语义行为的验证方法。

### Extra credit

- E1：模板化 `BufferView<T>` 只读视图类型，并补视图的测试；
- E2：完美转发版 `makeBuffer<T>(args...)` 工厂函数，测试证明「传右值走移动、传左值走拷贝」；
- E3：基准脚本对比 `Buffer` 拷贝与移动的耗时（1MB 级别），结论写进 README。

### 里程碑（每步做完都该看到什么）

1. **能用的正确版**：C1-C3 通过，全部测试绿——此刻还没有任何移动代码；
2. **移动改造**：C4-C5 通过，计数分配器证明移动真的「零分配」——这是本项目的核心时刻；
3. **容器化与卫生**：C6-C9 通过，sanitizers 全绿——代码敢给别人用了；
4. **交付**：C10 完成，README 里 API 表与移动验证方法齐全。

### 提示区

- 移动构造写法卡住：回到 [移动语义](/cpp/090-RvalueReferenceMoveSemantics) 的对照实验，先把拷贝版抄对再改移动版；
- 计数分配器：给 Buffer 加一个 `static std::atomic<int> allocCount` 也可（比自定义 allocator 简单，够用）；
- 常见坑：移动构造忘写 `noexcept`（E 场景 vector 扩容退回拷贝，回收 100 篇的实验）；`operator=` 自赋值不检查；测试里用 `assert` 而非断言框架导致 release 全跳过。

### 验收清单

- [ ] C1-C10 逐条自测通过并勾选
- [ ] ASan/UBSan 全绿的运行输出（贴进 README）
- [ ] 拷贝 vs 移动的计数对比数据（写进 README 或 E3 基准）
- [ ] 另一个 .cpp「只 include 头文件 + 链接静态库」能跑通（证明交付形态完整）

## 常见弯路

1. 一开始就用 `std::vector<uint8_t>` 包一层——那不是 Buffer，是套壳；先手写一遍才理解 vector 替你做了什么；
2. 测试只测「对」不测「快」：C4 的分配计数才是本项目的灵魂；
3. 忘记 moved-from 测试：090/100 两篇的事故全部会在真实调用方身上重演；
4. README 只有构建命令：API 表与行为验证方法才是别人会用到的部分。

## 完成后你能做什么

你拥有一个「内存安全可证明、移动语义可量化、交付形态完整」的 C++ 库——这正是进入智能指针体系、模板深水区与真实开源项目阅读前的全部地基。下一步：走到 [技术栈路线图](/roadmap/010-RoadmapOverview) 的系统编程路线阶段 2，或给 bufx 加上 E1-E3。
