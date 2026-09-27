---
order: 830
title: Java 毕业项目：控制台任务管理器的完整工程化
description: Java 模块出口项目（Level 6）：把入门链学到的语法能力组装成一个可测试、可打包、带 README 的控制台任务管理器，user stories 验收、提示从高到无。
module: 'java'
category: 后端技术
difficulty: intermediate
author: fanquanpp
updated: '2026-09-28'
related:
  - 'java/100-MethodDetailed'
  - 'java/150-OOP'
  - 'java/740-JavaBuildTool'
prerequisites:
  - 'java/100-MethodDetailed'
  - 'java/090-ControlFlow'
---

## 前置知识

- 已完成 java 模块入门链 010-100：会写类与方法、掌握集合基础与文件 IO 的最简用法（未到 210 的部分先用数组顶住，Extra credit 再升级）；
- 已完成 [Git 毕业项目](/git/430-GitCapstoneProject) 或等价的仓库管理能力：本项目全程在 Git 仓库里进行。

## 学习目标

完成本项目后你将能够：

1. 独立把一组语法知识组装成一个 300-500 行的可运行程序，而不是复述单个知识点；
2. 用类与集合为真实需求建模（任务、优先级、状态流转）；
3. 为核心逻辑写出 JUnit 测试并让它们全绿；
4. 用 Maven 或 Gradle 把程序打成可分发的 jar，并写一份能让陌生人跑起来的 README。

预计 2 到 3 天。与 [ javascript 毕业项目](/javascript/715-JavaScriptCapstoneProject) 同一纪律：**正文不提供项目代码，只提供需求与验收**。

## 项目：控制台任务管理器 todo-cli

做一个命令行任务管理器：`java -jar todo-cli.jar add "写周报" --priority high` 添加任务，`list` 分组展示，`done 3` 完成第三条，数据存本地文件、重启不丢。

### 必做 user stories

- J1：运行 `add <标题>` 后，任务以「未完成」状态入库，`list` 可见且带自增编号；
- J2：`add` 支持 `--priority high|normal|low`，缺省 normal；非法值给出友好提示且不入库；
- J3：`list` 按「未完成在前、优先级降序、创建时间升序」排列，输出对齐成表；
- J4：`done <编号>` 把对应任务标记完成；编号不存在时提示且退出码非 0；
- J5：`rm <编号>` 删除任务，支持 `rm --done` 批量清除已完成项；
- J6：数据持久化到 `~/.todo-cli/tasks.json`（或自定义路径），重启程序后列表原样恢复；
- J7：任务类 `Task` 封装字段与行为，`Main` 只负责解析命令与输出——两层职责分离，`Task` 不出现任何 `System.out`；
- J8：核心逻辑（排序规则、状态流转、JSON 读写）至少 6 条 JUnit 测试覆盖，`mvn test` 或 `gradle test` 全绿；
- J9：项目在 Git 仓库中，提交信息符合约定式格式，README 含「构建、运行、命令一览」三节，陌生人按 README 可在 5 分钟内跑起来；
- J10：`Invalid command: xxx` 一类错误一律走统一提示与退出码约定（0 成功 / 1 用法错 / 2 数据错），不抛裸异常栈给用户。

### Extra credit

- E1：`stats` 子命令输出完成率与各优先级数量；
- E2：持久化格式从手写拼接改为 Jackson/Gson，并为「文件被手动改坏」的场景写容错测试；
- E3：用 Maven 或 Gradle 打出含依赖的 fat jar，`java -jar` 一条命令运行。

### 里程碑（每步做完都该看到什么）

1. **骨架**：命令解析器能区分 add/list/done/rm 四个动词，未知命令给出 J10 的统一提示——此刻 `list` 还只有一个占位输出；
2. **模型与存储**：`Task` 类 + JSON 文件读写跑通 J1/J4/J6——关掉终端再开，数据还在；
3. **排序与展示**：J2/J3/J5 完成，`list` 的三列对齐表是这个里程碑的照片；
4. **测试与打包**：J8/J9 完成，测试全绿、jar 可分发、README 收尾。

### 提示区

- 命令解析卡住：回顾 [方法详解](/java/100-MethodDetailed) 的参数设计；JSON 卡住： Extra credit E2 的库文档优先，手写拼接只需注意转义；
- 排序比较器写不对：`Comparator.comparing(...).thenComparing(...)` 链式是你需要的全部；
- 常见坑：文件路径用绝对目录而非工作目录（换目录启动就「丢数据」其实是读错了文件）；`==` 比较 String 永远错（回收 060 的教训）。

### 验收清单

- [ ] J1-J10 逐条自测通过并勾选
- [ ] 测试全绿的截图（或 CI 链接）
- [ ] jar 在另一个目录跑通（证明打包完整）
- [ ] README 由完全没见过项目的朋友试跑通过

## 常见弯路

1. 一开始就追求子命令补全、颜色输出——先让 J1-J10 全绿再谈锦上添花；
2. 跳过测试：本项目最容易「能跑但不敢改」，测试就是改的底气；
3. 把业务逻辑写进 `Main`：里程碑 1 就把两层分开，返工成本最小；
4. 不建 Git 仓库写到结束：每完成一个里程碑提交一次，出问题随时回退。

## 完成后你能做什么

你会独立交付一个「带测试、可打包、有文档」的 Java 程序——这正是进入 [Spring](/java/820-SpringBasicsIoCAOPBeanLifecycle) 与团队协作前的全部地基。下一步：把项目放进 GitHub，走到 [技术栈路线图](/roadmap/010-RoadmapOverview) 的 Java 后端路线阶段 2。
