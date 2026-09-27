# 课程体系与学习路径审计（curriculum-audit）

- 勘察日期：2026-09-27
- 对象：shd-shared/metadata/learning-path/（43 个路径 JSON + index.json，1069 节点）、shd-shared/metadata/modules.json、042-roadmap 模块、相关前端消费代码与审计脚本。
- 全程只读。

## 1. 学习路径总序错误：零基础入口被埋没

`learning-path/index.json` 的 order 数组实际顺序：javascript, typescript, git, html5, css, react, vue3, python, java, go, c, cpp, sql, mysql, redis, shell, algorithm, cs-fundamentals, devops, markdown, github, svg, astro, vite, tailwind, kotlin, csharp, rust, postgresql, networking, cybersecurity, cloud-computing, software-testing, nextjs, nestjs, **start（第 37 位）, roadmap（第 38 位）**, mongodb, godot, gdscript, renpy, gode, konado。

三个硬伤：

1. 零基础起步模块 start 排第 37，JavaScript 排第 1。web 端学习路径页按 `getLearningPathIndex()` 原样渲染（`app-web/src/lib/learning-path.ts` 第 83-85 行），零基础用户打开路径页看到的第一条是 JavaScript 而不是「零基础起步」。
2. index 顺序与 modules.json 的 folder_order（001-048 编号：start → markdown → git → github → html5 → ...）完全不一致，两套顺序并存且互相矛盾。
3. 顺序与依赖冲突：shell 排在 mysql/redis 之后，而 python（第 8 位）的文档大量使用命令行知识。

## 2. 路径覆盖率：40.7% 的文档是「路径孤儿」

全量对比学习路径引用的唯一文档数与模块实际文档数：

| 模块 | 路径内文档 | 实际文档 | 路径孤儿 |
| --- | --- | --- | --- |
| start | 8 | 8 | 0 |
| javascript | 67 | 71 | 4 |
| git | 30 | 42 | 12 |
| python | 28 | 104 | 76 |
| mysql | 27 | 92 | 65 |
| algorithm | 15 | 30 | 15 |
| cs-fundamentals | 25 | 63 | 38 |
| software-testing | 15 | 48 | 33 |
| roadmap / gode / konado | 13/8/10 | 13/8/10 | 0 |

全库合计：路径引用 1069 篇，实际 1803 篇，**734 篇（40.7%）不在任何学习路径内**。所有路径引用 0 悬空——孤儿是单向问题：路径可以缩小，内容放不进去。

关键规律：2026 年新建模块（start/svg/roadmap/mongodb/godot/gdscript/renpy/gode/konado）覆盖 100%，早期大模块覆盖 25%-40%。存在「先写路径再写文」的新流程，但老模块从未回填。

## 3. 阶段内容与阶段名错位（比孤儿更隐蔽）

- python（learning-path/python.json）：「basics 基础语法」阶段包含 580-描述符协议、590-元类、880-FastAPI、840-Redis、790-Docker、1010-NLP；真正的入门篇 010/050/060/070/100/130 全部不在路径内；OOP 被放在第三个「实战速查」阶段、位于元类之后。教学递进完全倒置。第 150 行阶段副标题自称「占位补全：待展开的专项主题」，证实该路径是机器占位产物。
- mysql（learning-path/mysql.json）：basics 阶段混入 180-MyISAMStorageEngine、490-Binlog、560-LogicalBackup、630-InnoDBCluster、710-SSLEncryption；index 阶段混入备份与 SSL；arch 阶段反而包含 210-IndexManagement。
- software-testing：basics 阶段含 140-PerformanceInterfaceTest（性能测试入门即学）；pytest、测试级别、等价类划分、白盒覆盖、TDD/BDD 及整个软件工程子线（310-440 共 11 篇）均为孤儿。
- algorithm：路径缺失排序、哈希表、堆、图、贪心、面试指南等 15 篇核心内容；「经典算法」阶段却放入 100-BalancedTreeAdvanced（数据结构内容）。
- cs-fundamentals：basics 阶段含 410-DistributedSystem、550-InformationSecurityBasics；system 阶段含 600-MultimediaTechnology、570-DesignPattern。
- 对照良好的样本：javascript（10 阶段、67/71、递进合理）、start（四阶段清晰）。

## 4. 模块依赖声明：只覆盖一半

`modules.json` 顶层 modulePrerequisites：仅 20/43 个模块声明依赖（github→git、css→html5、javascript→html5+css、typescript→javascript、vue3/react→javascript+html5+css、kotlin→java、cpp→c、postgresql/mongodb→sql、devops→git、cybersecurity→networking、cloud-computing→devops、nextjs→react+typescript、nestjs→typescript、gdscript/gode/konado→godot 等）。

**23 个模块零依赖声明**，包括 python、java、go、sql、mysql、redis、algorithm、cs-fundamentals、c、shell、networking、software-testing、rust、astro、vite、tailwind、godot、renpy、git、start、markdown、csharp、roadmap。而正文实际大量跨模块用知识（python 用 shell/git/SQL，见 dependency-analysis.md 第 3 节）。

## 5. 管线登记漂移：5 个游戏模块的路径对网页端不可见

godot/gdscript/renpy/gode/konado 的路径 JSON 存在且已进入 index.json，但：

- 未导出到 `shd-shared/utl-utils/learning-path.ts`（导出止于 mongodbMap）；
- 未注册进 `app-web/src/lib/learning-path.ts` 的 technologyMaps（第 89-127 行）。

即 web 端学习路径页实际看不到这 5 个模块的路径。同类漂移：roadmap 文档自称「36 个模块」（010-RoadmapOverview.md 第 19 行），实际 43 个。

## 6. 042-roadmap 模块评估（能力地图层）

职责承担情况：13 篇（010 总览 + 11 条就业路线 + 130 十二个月计划模板），每条路线统一给岗位画像/技能树/三阶段计划/检验项目/常见弯路/求职准备，路线内链接可点击。是全库导航质量最高的模块之一。

覆盖度缺陷：

1. 自称 36 个模块，实际 43，未随新增模块更新；
2. 11 条就业路线中没有任何游戏开发路线，而仓库有 5 个游戏开发模块；
3. 总览声称「超过一半的技术岗位要求 AI 协作开发能力」，但没有独立的 AI 辅助开发环节（AI 内容散落在 python 模块 990/1010/1020）；
4. 路线引用各模块「前 N 个学习阶段」，因此 python/mysql 路径阶段的错乱会直接传导进就业路线的执行顺序；
5. 纯叙述层（Markdown 内链），没有机器可读的「路线→模块→阶段」元数据，UI 无法按路线渲染。

## 7. 047-gode 与 048-konado 评估

- gode（8 篇）：Godot 的 GDExtension 插件，为引擎提供 JS/TS 脚本支持。课程定位清晰，路径 8/8 全覆盖，声明前置 godot。缺口：实际强依赖 TypeScript/Node 知识但未声明。
- konado（10 篇）：基于 Godot 的视觉小说对话框架插件。路径 10/10 全覆盖，与 Ren'Py 的定位差异讲清。同属第三方活跃插件教程，存在上游变更维护成本，module.json 没有覆盖此风险的标记机制。

## 8. 课程体系结构问题 Top 5（按严重度）

1. **路径与内容脱节**：734 篇（40.7%）路径孤儿 + 老模块阶段错位（python basics 放元类、mysql basics 放 Binlog）；审计脚本只查单向（节点缺文档），问题不可见。
2. **学习序列入口错误**：index 把 javascript 排第 1、start 排第 37，且与 folder_order 双序并存矛盾。
3. **依赖图只覆盖一半**：23/43 模块无前置声明，正文却大量跨模块用知识；文档层仅 286/1803 篇有非空 prerequisites。
4. **登记漂移**：5 个游戏模块路径存在但对 web 端不可见；roadmap 模块计数过时。
5. **就业闭环有地图无末端**：缺游戏路线、缺 AI 协作开发环节、缺作品集/项目实战结构化层，且路线引用的模块阶段本身错乱（问题 1 传导）。

## 9. 可复用的修复范式

新模块流程（先写 stages 再填文档、sync 自动注册）已在 9 个新模块上验证可行。Phase 2 的核心工作就是把这套流程反向套用到 34 个老模块：重排 index（start 第 1）、按概念依赖重建各模块 stages、消灭孤儿、修复阶段错位、补 modulePrerequisites。
