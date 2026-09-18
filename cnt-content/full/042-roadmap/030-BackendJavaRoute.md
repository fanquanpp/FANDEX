---
order: 30
title: Java 后端路线：从零基础到 Spring Boot 工程师
description: Java 方向 12 个月路线：语言地基、集合与并发、Spring Boot 生态、MySQL 与 Redis、三阶段计划与四个检验项目，覆盖面试高频考点索引。
module: 'roadmap'
category: 计算机科学
difficulty: beginner
prerequisites:
  - 'roadmap/010-RoadmapOverview'
author: fanquanpp
updated: '2026-09-18'
related:
  - 'java/010-WhatIsJava'
  - 'mysql/020-Roadmap'
  - 'redis/010-OverviewCoreDataStructure'
---

## 岗位画像

Java 后端工程师构建服务端系统：处理业务逻辑、设计数据库、对外提供接口、保证并发与稳定。国内市场里，银行、保险、政务、电商、大数据基建的存量系统绝大多数是 Java 写的，岗位绝对数量长期居后端首位。

2026 年现状：初级岗位竞争激烈，企业筛选更看重"基础 + 项目"双硬——JVM/并发/MySQL 是面试三座大山，框架只是入场券。这条路线的产物是**一个完整上线的 Spring Boot 项目加扎实的八股底座**。

## 技能树

```mermaid
flowchart TD
    A[Java 语法与面向对象] --> B[集合/泛型/IO/异常]
    B --> C[并发编程/JVM]
    C --> D[MySQL 事务与索引]
    A --> E[SQL 基础]
    D --> F[Spring Boot 生态]
    E --> F
    F --> G[Redis 缓存]
    G --> H[分布式入门/消息队列]
    H --> I[作品集项目与求职]
    F --> J[加分项: 微服务/云原生]
```

必学主线：Java → SQL/MySQL → Spring Boot → Redis。加分项：消息队列、微服务、Docker 部署。

## 阶段 1（第 1 到 3 个月）：语言地基

**第 1 到 2 个月：Java 核心**

- [Java 模块](/java/010-WhatIsJava) 前半（对应学习路径阶段一、二）：语法、面向对象三特性、常用 API、集合框架、异常、泛型、IO；
- 两个动手项目：控制台学生管理系统（练面向对象拆分）→ 文件版（练 IO 与集合综合）；
- 并行：git + SQL 模块第一、二阶段（后端面试 SQL 是必考且必拿分的部分）。

**第 3 个月：进阶语言特性**

- Java 模块中段：多线程基础（Thread/synchronized）、JVM 内存区域与垃圾回收初步、Lambda 与 Stream；
- [算法模块](/algorithm/010-AlgorithmAnalysisBasics) 保持每周 3 题（Java 实现）；
- 阶段验收：能手写生产者消费者模型，能画出 JVM 运行时数据区，能解释 ArrayList 与 LinkedList 的取舍。

## 阶段 2（第 4 到 6 个月）：数据库与框架

**第 4 个月：MySQL 体系化**

- [MySQL 模块](/mysql/020-Roadmap) 按学习路径全读：设计范式、存储引擎、索引原理（B+ 树）、事务与锁、执行计划调优；
- 检验项目一：**设计一个电商订单库**（表结构 + 索引设计文档 + 10 个典型查询的 EXPLAIN 分析）。这是面试里"讲讲你的索引设计"的弹药库。

**第 5 到 6 个月：Spring Boot 上手与首个 Web 项目**

- Java 模块的 Web/Spring 相关章节（学习路径阶段五起）：Spring IoC/AOP 心智模型、Spring MVC、MyBatis 或 Spring Data JPA、参数校验与全局异常；
- 检验项目二：**博客系统后端**（注册登录 JWT、文章 CRUD、分页、参数校验、统一响应结构、Swagger 接口文档）。要求用 Postman 全量自测，接口文档可交付。

## 阶段 3（第 7 到 12 个月）：并发、缓存、分布式与求职

**第 7 到 8 个月：并发与 JVM 深入**

- 并发：线程池、锁、CAS、并发容器、volatile 与内存可见性（Java 模块并发章节 + cs-fundamentals 的并发模型篇对照阅读）；
- JVM：类加载、GC 算法与收集器、内存排查工具（jmap/jstat/arthis 认知）；
- 每天 1 算法题，开始覆盖高频数据结构（链表/二叉树/哈希）。

**第 9 个月：Redis 与接口进阶**

- [Redis 模块](/redis/010-OverviewCoreDataStructure) 核心章节：五大数据结构与场景、持久化、缓存三兄弟（穿透/击穿/雪崩）与一致性方案；
- 给项目二的博客接入 Redis：热点文章缓存、登录态、接口限流；
- 检验项目三：**缓存改造报告**（改造前后的压测数据对比 + 缓存策略说明文档）。

**第 10 个月：检验项目四（作品集主项目）**

自选完整业务（秒杀/外卖/招聘板），要求：Spring Boot 3 + MySQL + Redis + 消息队列（RabbitMQ 或 RocketMQ 入门级使用）+ Docker Compose 一键启动 + 完整 README（架构图、表设计、压测数据、踩坑记录）。部署到一台云服务器上（devops 模块的 Linux 与 Docker 章节支持）。

**第 11 到 12 个月：求职冲刺**

- 八股复习地图：Java 基础 → 集合 → 并发 → JVM → MySQL → Redis → Spring → 计算机网络（TCP/HTTP）→ 操作系统常识，全部指向本库对应文档；
- 算法累计 150 题量级（简单 100 + 中等 50）；
- 项目深挖演练：让 AI 对项目四连环追问（"为什么用 B+ 树""缓存不一致怎么办""消息丢了怎么办"），直到每个设计都能自圆其说。

## 常见弯路

1. **只背八股不写代码**：八股是复习工具不是学习工具。顺序必须是"项目先行、八股复盘"，反过来就是背了忘忘了背；
2. **跳过 SQL 与 MySQL 原理**：很多自学者 MyBatis 用得飞起但解释不了索引下推。后端面试的分水岭恰恰在数据库底层；
3. **并发与 JVM 一开始就啃书**：没有多线程代码体感前读《深入理解 JVM》必弃。正确顺序是先用出问题、再带着问题学原理；
4. **项目太"课设"**：图书管理、学生系统之外，必须有至少一个带并发/缓存元素的项目，否则简历无差异化；
5. **不用 git、不写文档**：后端工程师的协作素养从第一天就该体现在 commit 历史与 README 里。

## 求职准备清单

- 一个 Docker 化部署、可公网访问的主项目；
- 数据库设计文档与压测报告各一份（项目一、三的产物）；
- 八股错题本（按上面九大块组织，全部链接到本库文档）；
- 算法 150 题量级 + 手写单例/生产者消费者/快排不出错；
- 简历每条项目描述都有量化数据（QPS、响应时间、缓存命中率）。

## 下一步

从 [Java 是什么](/java/010-WhatIsJava) 开始进入语言地基。若想要更简洁的语言与云原生生态，看 [Go 后端路线](/roadmap/040-BackendGoRoute)；偏好数据与 AI 方向看 [Python 与 AI 路线](/roadmap/050-BackendPythonAIRoute)。
