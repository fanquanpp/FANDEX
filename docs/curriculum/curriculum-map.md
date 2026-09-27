# FANDEX v2 课程地图（curriculum-map）

- 版本：v2.0（2026-09-27，Phase 2 交付）
- 机器可读事实源：`shd-shared/metadata/modules.json`（模块与依赖）、`shd-shared/metadata/learning-path/`（各模块阶段路径）、`cnt-content/full/*/module.json`（模块元数据）。本文是决策说明，与数据冲突时以数据为准。

## 1. 学习总路线（index.json 顺序）

start → roadmap → javascript → typescript → git → html5 → css → react → vue3 → python → java → go → c → cpp → sql → mysql → redis → shell → algorithm → cs-fundamentals → devops → markdown → github → svg → astro → vite → tailwind → kotlin → csharp → rust → postgresql → networking → cybersecurity → cloud-computing → software-testing → nextjs → nestjs → mongodb → godot → gdscript → renpy → gode → konado

设计决策：零基础起步第 1、路线图第 2（先看地图再上路）；游戏模块 5 连在尾部但路径已对 web 端注册可见。

## 2. 模块依赖图（modulePrerequisites，Phase 2 补齐）

本次新增 20 条声明：python→start、java→cs-fundamentals、go/c/rust/shell→start、csharp→cs-fundamentals、sql→start、mysql/redis→sql、algorithm→javascript、cs-fundamentals→start、networking→cs-fundamentals、software-testing→python、astro→html5+css+javascript+typescript、vite→javascript、tailwind→html5+css、godot→start、renpy→python、roadmap→start。加上既有 20 条，43 个模块全部有显式依赖或明确的「无前置」语义。

## 3. 阶段路径重建（消灭 734 篇路径孤儿）

Phase 2 已将 6 个重灾模块的 stages 按概念依赖全量重建、javascript 合并 4 篇孤儿，全库路径孤儿从 734 归零（`audit-learning-path.mjs` 已加入反向覆盖率检查作为常驻门禁）：

| 模块 | 阶段数 | 覆盖 | 设计要点 |
| --- | --- | --- | --- |
| python | 9 | 104/104 | 环境→语法→函数→标准库→IO/网络→OOP→并发→工程化→生态实战 |
| git | 5 | 42/42 | 起步→本地基础→分支远程→历史规范→原理进阶 |
| algorithm | 9 | 30/30 | 分析→线性→哈希树→进阶结构→二分→图→策略→字符串→理论面试 |
| cs-fundamentals | 8 | 63/63 | 总览→数制→组成→OS→网络→分布式与编译→理论→工程拓展 |
| mysql | 10 | 92/92 | 入口→SQL 基础→引擎→索引→调优→InnoDB 事务→日志备份→高可用→安全→高级运维 |
| software-testing | 6 | 48/48 | 入门→用例设计→自动化→性能专项→工程实践→软件工程全景 |
| javascript | 10 | 71/71 | 既有健康结构保留，Node/npm 工具篇归入 web 工具阶段 |

后续新模块一律遵循「先写 stages 再写文」流程（新模块 100% 覆盖的既有实践）。

## 4. 项目路线（Level 0-7 锚点）

项目分层与 user stories 验收标准见 docs/standards/project-standard.md。各主线模块的出口项目规划：

- start：猜数字（L1-2）、记账程序（L3-4）——已存在于 060/070；
- python：排行榜函数库（L3，100 篇尾部）、爬虫与数据分析（L6，970）、Web 服务（L6-7，880 FastAPI）；
- git：建仓三连提交（L1，050）、PR 协作演练（L4，230）；
- mysql：排行榜数据库（L5，110/870）；
- javascript：Todo 应用（L6，700）；
- software-testing：给 FANDEX-web 写一组 pytest（L4-5，100/230）。

## 5. 真实项目素材库（作者自有仓库，已获授权）

| 仓库 | 用途 |
| --- | --- |
| FANDEX（本仓库） | git/TypeScript/React/Astro/Vite/DevOps 的工程化活教材 |
| quaver / geometric-construct | godot、gdscript、gode 模块项目示例 |
| ZATO-CN-Patch | renpy 模块示例 |
| FoloToy-calendar | c 模块嵌入式示例 |
| slide-forge | html5 素材示例 |
| ThomasWasAlone-CN-Patch / Aseprite-Hanhua-Kit | shell 模块脚本示例 |
| pixel-vault | 游戏模块美术素材 |

## 6. 方法论参照系（只借鉴结构，不搬运内容）

The Odin Project（六段课程模板、节尾项目、安装课按 OS 分叉）、freeCodeCamp（user stories 验收、workshop/lab 分层）、MDN Curriculum（双层出口评估、环境课一等公民）、Full Stack Open（正文与练习 1:1 紧邻、同一应用跨篇演化）。许可合规与改编白名单见 docs/standards/code-example-standard.md 第 2 节。

## 7. 评估体系

出口评估双层：单点技能自检（每篇「自我检查」节）+ 模块综合挑战（每模块出口项目）。验收问题 20 条与三类终测（假学生/企业模拟/脱离教程）见 docs/standards/quality-gate.md。
