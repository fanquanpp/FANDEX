# FANDEX 重构总方案（refactor-plan）

- 制定日期：2026-09-27
- 依据：docs/audit/ 八份勘察报告（repository-audit / content-quality-audit / curriculum-audit / dependency-analysis / duplicate-analysis / outdated-content / missing-content / learning-gap-analysis）
- 定位重申：FANDEX 是「开放的、现代的、实践驱动的、自学友好的、面向真实软件开发能力的编程学习课程系统」，不是互联网编程知识的 Markdown 化整理。最终目标不是让学生读完 FANDEX，而是让学生学会编程以后不再依赖 FANDEX。
- 本阶段约束：勘察已完成；Phase 2 之前不批量修改教学 Markdown。

## 1. 问题分级（P0-P7）与勘察结论映射

| 级别 | 定义 | 本仓库对应问题 | 数量级 |
| --- | --- | --- | --- |
| P0 错误/危险/误导 | 会被学生照做且有害 | mysql/760 明文密码比对示例；python/360 CERT_NONE 无警告；mysql/740 缺授权声明 | 3 处 |
| P1 严重断层 | 零基础主线不可学 | python/090 等入门主线学术文；511 篇机械前置；basics 阶段错位；start 与语言模块无直链 | 主线约 20 篇文档 + 511 篇前置声明 |
| P2 重要缺失 | 闭环缺环 | 练习层 1% 覆盖；路径孤儿 734 篇；23 模块零依赖声明；项目层无结构 | 全库性 |
| P3 明显过时 | 版本口径滞后 | Node 22 推荐、python/020「3.10+」、Vue 3.6 RC 表述、roadmap「36 模块」计数 | 4-6 处 |
| P4 教学设计问题 | 文体与结构 | 约 1663 篇批量文档模板无练习/运行/修改/调试环节 | 全库性 |
| P5 案例质量 | 无场景语法堆叠 | mysql/110 类 186 围栏连发；inSERT 生成痕迹 | 集中在批量批 |
| P6 表达与结构 | 重复与混拼 | 40+ 重复组、83 篇速查占位文、259 篇混拼文、Top30 大文件 | 约 300-400 篇 |
| P7 轻微格式 | 局部 | 速查卡 var 无弃用提示、related 重复声明等 | 少量 |

处置顺序严格按 P0 → P7，不先花时间修格式。

## 2. 分阶段执行计划

### Phase 2：建立目标课程体系（先于一切内容改写）

产出 `docs/curriculum/`（curriculum-map.md、learning-path.md、skill-tree.md、knowledge-graph.md、project-roadmap.md、assessment-system.md）：

1. 重排 learning-path/index.json：start 第 1，按「start → markdown → git → github → html5 → css → javascript → python → ...」的 folder_order 对齐依赖图（modulePrerequisites 补齐 23 个空缺模块后用脚本校验顺序一致性）；
2. 为 python/javascript/mysql/algorithm/software-testing/cs-fundamentals/git 七个重灾区模块重建 stages：以概念依赖（而非编号、而非难度标签机器填充）划分阶段，消灭「basics 放元类」类错位，新模块流程反向套用；
3. 补 5 个游戏模块到 web 端注册（shd-shared/utl-utils/learning-path.ts + app-web technologyMaps）；
4. roadmap 增补游戏开发路线与 AI 协作开发环节，修正「36 模块」计数；
5. 定义能力地图：对《计划》第 45 节的 27 项毕业能力逐项映射到模块与检验项目，找出无映射的能力缺口。

### Phase 3：文档迁移映射

产出 `docs/audit/document-migration-map.md`：旧文件 → 新位置 → 处置动作 → 原因。处置动作框架与预计规模：

| 动作 | 适用对象 | 预计规模 |
| --- | --- | --- |
| KEEP | A 类教学文、09-18 重写批、健康大文件（csharp/310、python/900 等） | 约 200-300 篇 |
| REWRITE | 零基础主线上的 C/D 类（python/090、javascript/020/060、css 入门段等） | 主线约 150-250 篇优先 |
| MERGE | 约 20 组高重叠重复组（两组选一为主文档） | 约 40-60 篇消失 |
| SPLIT | 学术模板小书（redis/090-Stream、postgresql/210 等）与多算法合集 | 约 30-50 篇 |
| DELETE | full/ 内 83 篇速查占位文（与 syntax/ 逐字重复） | 83 篇 |
| MOVE | 深水区参考书改定位为「参考资料」层、摘出入门前置链 | 约 100+ 篇 |
| CREATE | 练习层、项目路线元数据、nestjs 认证篇、argon2id 篇、游戏就业路线 | 按需 |
| REPLACE | 混拼文（259 篇）：去尾部速查段或改造 | 259 篇 |

### Phase 4：样板课程（3-10 篇完整重构，验证文体）

选篇建议覆盖四种难度：001-start 已是样板（对照系）；从批量批中各取一篇重写：python/090-VariableConstant（P1 主线）、javascript/020（P1）、mysql/110（P5 案例）、software-testing/010（P4）。重写必须按 content-quality-audit.md 第 4 节的闭环逐环补齐：问题 → 示例（含预期输出）→ 运行 → 修改实验 → 练习 → 调试实录 → 应用 → 官方文档衔接 → 与前后章关系 → 自检清单。趣味案例按《计划》第 9 节清单（游戏存档/排行榜/短链接/文件整理器等），禁止九九乘法表类长期占用主线。

### Phase 5：内容标准固化

产出 `docs/standards/`：teaching-writing-standard.md（A 类文体规范，以 09-18 批与 Phase 4 样板为基准）、code-example-standard.md（每个示例必须给预期输出）、exercise-standard.md（预测题/修改题/修 Bug 题配比与提示梯度）、project-standard.md（提示从高到无的分级）、technical-verification-standard.md（版本敏感文档清单与季度复核）、quality-gate.md（见第 3 节）。

### Phase 6：批量重构（按模块分批，每批过质量门禁）

批次顺序：零基础主线（start 衔接 → python → javascript → html5 → css → git）→ mysql/sql → 后端（java/go/nestjs）→ 前端框架（react/vue3/nextjs）→ 深水区拆分（redis/postgresql/algorithm）→ 其余。每批完成后输出变更报告（改了什么/为什么/删了什么/引用了哪些官方资料/哪些经联网验证/遗留问题）。

### Phase 7：验收

1. 假学生测试：沿 start → python 主线逐篇走查，验证不出现未教先用的概念（或已明示前向引用）、每篇可运行、每篇有练习；
2. 企业模拟测试：给一个陌生 GitHub 项目，验证课程覆盖 clone → 装依赖 → 运行 → 找入口 → 改功能 → 跑测试 → 提交全链路；
3. 脱离教程测试：每模块末尾验证存在无提示开放题。

## 3. 质量门禁增强（扩展 app-web/scripts/content-audit.mjs）

在现有检查（frontmatter、THIN_BODY、3 条过时关键词、前置章节缺失）之上新增，均机器可判：

1. 反向路径覆盖率：文档不在任何 stages → 告警（消灭 734 孤儿的守护机制；audit-learning-path.mjs 补此校验）；
2. 练习密度：正文无「练习/动手/挑战」任一标记且无产出任务 → beginner/intermediate 文档告警；
3. 预期输出：代码块后无输出注释或说明 → 告警（可先 WARN 级）；
4. 依赖一致性：「前置知识」章节与 frontmatter prerequisites 矛盾、related 重复声明、非成对声明 → 告警；
5. 断层信号：相邻文档 difficulty 跳变（beginner 篇的前置是 advanced 篇）→ 告警；
6. 安全关键词：明文密码比对示例（password = %s 且无哈希上下文）、CERT_NONE/CERT_OPTIONAL 无警告框、verify=False → HIGH；
7. 模块计数时效：roadmap 等跨模块文档中的模块总数与 modules.json 不符 → 告警；
8. index 顺序与 modulePrerequisites 拓扑序一致性校验。

## 4. 快速修复清单（Quick Wins，可在 Phase 2 前以小 PR 独立落地）

1. P0 三处：mysql/760 补密码哈希环节与警告；python/360 补 MITM 警告框；mysql/740 补授权声明；
2. P3：python/020「3.10+」改为 3.12+ 口径；Node 安装篇与 nestjs 健康检查篇改 Node 24 LTS；速查卡 var 条目补弃用一行；
3. start 与 python/010 与 javascript/010 三向直链（各改一处 related 与「下一步」）；
4. learning-path/index.json 把 start 调到第 1（一处 JSON 改动，web 端立即生效）；
5. roadmap「36 个模块」改 43；
6. 5 个游戏模块补 web 端路径注册。

## 5. 资料来源纪律（贯穿所有 Phase）

技术事实按优先级：官方文档/标准（python.org、MDN、react.dev、nodejs.org、各数据库官方文档）→ 权威开放课程（The Odin Project、freeCodeCamp、MDN Curriculum、Full Stack Open，只学其课程结构与项目设计，不复制内容）→ 优秀开源工程实践 → 社区资料（仅用于发现真实问题与常见坑，不当作官方事实）。所有版本号、API、废弃状态写入文档前必须联网验证并记录验证日期。

## 6. 明确不做的事

- 不为凑字数扩写、不为文件数拆文件、不为体现工作量修改已合格内容（KEEP 并说明理由）；
- 不机械照搬外部课程结构；
- 不把评分写进教学文档（评分只用于本审计体系）；
- 不用「学生成绩/员工工资/九九乘法表」类陈旧案例占据主线；
- 不在零基础文档中保留 LaTeX 形式化推导（移入参考层或删除）。

## 7. 执行状态（2026-09-27 更新）

- Phase 0/1（勘察与审计）：完成，产出即 docs/audit/ 全部报告；
- Quick Wins：完成（P0 安全 x3、版本口径 x3、var 提示、三向直链、index 重排、roadmap 计数、游戏模块注册）；
- 样板课程：完成 4 篇（python/090、javascript/020、mysql/110、software-testing/010）+ Phase 6 首批 9 篇（python 020-100 主线、git 010-050），共 13 篇；
- Phase 2（目标课程体系）：完成——20 个模块 modulePrerequisites 补齐、6 模块 stages 重建 + javascript 补孤儿（路径孤儿 734 → 0）、index 重排（start 1、roadmap 2）、反向覆盖率门禁接入；决策说明见 docs/curriculum/curriculum-map.md；
- Phase 3（文档迁移映射）：完成——docs/audit/document-migration-map.md（DELETE 82 / MERGE 30 组 / SPLIT 29 / REWRITE 主线清单 / CREATE 清单）；
- Phase 5（内容标准）：完成——docs/standards/ 六份 v1.0；
- Phase 6（批量重构）：完成——MERGE 30/30 消化、SPLIT 落地（6 案 13 篇拆分 + 3 篇清理 + 22 篇参考层标注）、毕业项目 8 模块、新文体约 110 篇；剩余为日常维护性渐进改写；
- Phase 7（验收）：假学生走查完成并全修复；全门禁长期绿（HIGH 0/孤儿 0/typecheck 0/smoke 20/20）；企业模拟与脱离教程测试由 8 个模块毕业项目承接；
- 变更报告：docs/audit/change-report-2026-09-27.md（含批次二）。
