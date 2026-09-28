---
order: 80
title: 全库学习路线总览：12 个月地图
description: FANDEX 全库的分类体系、模块依赖关系与阶段化学习地图，连接零基础起步与技术栈路线图，回答先学什么后学什么与学到什么程度。
module: 'start'
category: 工具链
difficulty: beginner
prerequisites:
  - 'start/070-FirstProgramPython'
author: fanquanpp
updated: '2026-09-18'
related:
  - 'roadmap/010-RoadmapOverview'
  - 'roadmap/130-TwelveMonthPlanTemplate'
  - 'start/050-LearnHowToLearnProgramming'
---

## 学习目标

这是 001-start 模块的收官篇。读完你将获得：

1. 本库 43 个模块的全景认知：它们分几类、各自回答什么问题；
2. 一张按时间展开的 12 个月学习地图；
3. "每个模块怎么学"的标准动作，以及何时算学到位。

## 前置知识

已完成本模块前七篇，确定了主线语言（JS 或 Python，或已有基础直接沿用）。

## 本库全景：七大类模块各司其职

本仓库 43 个模块按内容性质分七大类（Web 端首页按此分组，颜色一致）：

| 分类 | 模块 | 回答的问题 |
| --- | --- | --- |
| 工具链 | start、markdown、git、github、shell | 如何高效起步、写作、管版本、用命令行 |
| 前端 | html5、css、javascript、typescript、vue3、react、svg、astro、vite、tailwind、nextjs | 网页与界面如何构建 |
| 后端与语言 | java、kotlin、csharp、go、python、rust、nestjs | 服务端与系统如何编写 |
| 数据库 | sql、mysql、postgresql、redis、mongodb | 数据如何存取与调优 |
| 计算机科学 | cs-fundamentals、algorithm、c、cpp、roadmap | 底层原理与长期能力 |
| 云与工程 | devops、networking、cybersecurity、cloud-computing、software-testing | 系统如何上线、稳定、安全 |
| 游戏开发 | godot、gdscript、renpy、gode、konado | 可玩的互动世界如何构建 |

三点重要说明：

1. **javascript 和 typescript 是前后端通吃的枢纽**：它们是浏览器唯一原生语言（前端必修），Node 生态（nestjs 模块）又让同一门语言写服务端（全栈主力），这是 JS/TS 市场需求最大的结构性原因；
2. **cs-fundamentals 是唯一贯穿始终的模块**：它覆盖组成原理、操作系统、网络、编译、分布式、离散数学等大学核心课程，零基础阶段只需要读它前几篇（计算机概述、编程基础），其余部分按路线图在各阶段滚动插入；
3. **游戏板块是独立的第五大方向**：Godot 4 引擎加 GDScript 为主干，Ren'Py（视觉小说）与 Gode（在 Godot 里写 TypeScript）为分支，零基础也可以直接选它当主线（见 [游戏开发路线](/roadmap/140-GameDevRoute)）。

## 阶段 1（第 1 到 3 个月）：主线语言与它的地基

目标：**一门语言能独立写 200 行以内的程序**。所有路线在这一阶段高度重合：

```text
第 1 个月
  主线语言模块的前半部分（基础语法、流程控制、函数、常用容器）
  git 模块前 2 个学习阶段（日常版本控制够用即可）
  cs-fundamentals 的 ProgrammingBasics 与 OperatingSystem 两篇做背景阅读

第 2 个月
  主线语言模块的后半部分（进阶特性 + 第一次工程化实践）
  markdown 模块（开始用 Markdown 写学习笔记）

第 3 个月
  主线语言的综合项目周（路线图里有项目建议）
  算法模块的复杂度分析与基础数据结构（每天 1 到 2 题）
```

验收标准：不看教程，能在 1 小时内从空文件写出"读取一个文件、处理内容、输出结果文件"的小工具。

## 阶段 2（第 4 到 6 个月）：按方向分流

从这一步开始，跟着 [技术栈路线图](/roadmap/010-RoadmapOverview) 里你的专属路线走。五个大方向的阶段 2 概貌：

- **前端/全栈**：html5 → css → 主线框架（react 或 vue3）→ typescript → vite/tailwind；
- **后端（Java/Go/Python/Node）**：对应后端语言进阶 → sql（必须）→ nestjs/spring 类框架 → mysql；
- **数据/AI**：python 进阶 → sql → numpy/pandas 生态 → cs-fundamentals 数学篇；
- **移动端**：kotlin（Android 为主）→ compose → 对应后端基础；
- **游戏**：godot → gdscript → 2D 玩法与 UI → 第一个可玩的小游戏。

无论哪个方向，**sql 都是必修**——它是数据世界的通用语，也是面试必考。算法保持每天 1 题的手感（游戏方向权重略低，可减半）。

## 阶段 3（第 7 到 12 个月）：工程化与深度

目标：从"会写代码"升级为"能交付系统"。全方向共同的深水区：

- **数据库深入**：mysql 或 postgresql 的索引、事务、调优部分（对应你的主栈选一个深入）；
- **网络与安全**：networking 模块全读，cybersecurity 读基础与 Web 安全部分；
- **部署与运维**：devops 模块（Linux、容器、CI/CD），把自己的项目部署上线（游戏方向对应 itch.io 等平台发布，见 [游戏开发路线](/roadmap/140-GameDevRoute) 阶段 2）；
- **缓存与性能**：redis 模块核心章节；
- **项目冲刺**：完成路线图中标注的 2 到 3 个作品集项目，写成简历可用的形态。

## 每个模块的标准学习动作

对库内任意模块，套用同一个五步循环：

```text
1. 读模块第一篇（What is X），确认学习动机与前置依赖
2. 按文件编号顺序推进，每篇完成"动手环节"，过"检验清单"
3. 每完成一个学习阶段，做该阶段的小项目
4. 用 git 把所有练习代码提交到自己的 GitHub 仓库（顺便练版本控制）
5. 学完模块用费曼法写一篇"我给外行讲明白 X"的总结
```

"学到什么程度"的通用判断：**能独立解决一个没见过的小问题**，而不是"看过所有文档"。看完全部文档但没写过代码的模块，等于没学。

## 关于并线与断点续学

- **主线唯一，支线并行不超过一条**：比如主线 JS 学到阶段 2 时，可以并行一条"算法每天一题"支线，再多必乱；
- **中断了怎么办**：这是最常见的情况。回到进度记录，找到最后一个"检验清单全过"的文档，从下一篇继续，不要从头再来；
- **文档看不懂的处置**：先补"前置知识"字段指向的内容 → 还不懂就换该模块更靠前的文档 → 还不懂说明跳级了，回退一个阶段。

## 时间不够的现实方案

每天只有 30 分钟到 1 小时的人（大多数在职者）的裁剪策略：

- 阶段 1 砍掉支线，只保留主线语言 + git，预算拉长到 4 个月；
- 算法改为每周 2 题；
- 阶段 2 聚焦"方向最小技能集"（路线图里每条路线标注了最小闭环）；
- 放弃"学完再做项目"的执念，**第 2 个月就开始做小项目，边做边补**。

## 检验清单

- 能说出七大分类各自的定位与至少三个模块名；
- 能画出自己未来 12 个月的三阶段地图（写在笔记里）；
- 知道每个模块的五步标准动作与"学到位"的判断标准；
- 已确定自己的主线语言与方向，准备进入路线图模块。

## 下一步

进入 [技术栈路线图总览](/roadmap/010-RoadmapOverview)，选择你的专属路线，开始阶段 1 的正式训练。
