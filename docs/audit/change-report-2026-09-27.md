# 变更报告：2026-09-27（Phase 2/3/5/6 批次）

对应 refactor-plan.md 的阶段推进记录与《计划》第五十三节的报告要求。

## 一、修改了什么、为什么

### Phase 2 课程体系数据层

1. **20 个模块补齐 modulePrerequisites**（module.json，sync 重建 modules.json）：python→start、java/csharp→cs-fundamentals、sql→start、mysql/redis→sql、algorithm→javascript、networking→cs-fundamentals、software-testing→python、astro→html5+css+javascript+typescript 等。原因：43 个模块中 23 个零依赖声明，正文却大量跨模块用知识（勘察报告 dependency-analysis.md 第 3 节）。
2. **6 个模块学习路径 stages 全量重建**（python 9 阶段 104 节点、git 5/42、algorithm 9/30、cs-fundamentals 8/63、mysql 10/92、software-testing 6/48），javascript 合并 4 篇孤儿并把 Node/npm 工具篇归位 web 工具阶段。原因：这些模块的阶段错位（basics 放元类/Binlog）与 40.7% 路径孤儿是课程体系最大的结构性问题。
3. **index.json 重排**：start 第 1、roadmap 第 2。原因：零基础入口被埋在第 37 位。
4. **audit-learning-path.mjs 新增反向覆盖率检查**（[ORPHAN] 告警 + 路径孤儿合计）：原脚本只查「节点缺文档」不查「文档缺节点」，734 篇孤儿因此不可见。

结果：**路径孤儿 734 → 0**，全库 1803 篇全部进入学习路径；审计结果 0 errors 0 warnings。

### Phase 6 批量重写（13 篇）

| 文档 | 原状态 | 处置 |
| --- | --- | --- |
| python/090-VariableConstant | 97KB 学术文（形式化定义/理论证明） | REWRITE：问题驱动 + id() 实验教学名字绑定 |
| javascript/020-JavaScriptOverviewRuntimeEnv | 79KB 学术文 | REWRITE：引擎+宿主 API 心智模型 |
| mysql/110-SQLDataOperationQuery | 186 个无场景语法围栏 | REWRITE：排行榜工作流 + 事务防误操作实录 |
| software-testing/010-TestBasicsMethod | 纯定义堆砌 | REWRITE：第一组断言抓 bug 的完整体验 |
| python/020/050/060/070/080/100 | 概念堆砌/伪表格/讲义式 | REWRITE：统一六段模板，问题引入、预期输出、真实报错、四类练习 |
| git/010/020/050 | 22 章命令罗列 | REWRITE：版本控制叙事 + FANDEX 本仓作活教材 |

### Quick Wins（同日早批，见 git 历史）

mysql/760 密码哈希与警告、python/360 MITM 警告、mysql/740 授权声明、python/020 与 Node 22→24 版本口径（x3）、var 弃用提示（x2）、start 与语言模块三向直链、roadmap 模块计数修正、5 个游戏模块 web 端路径注册。

## 二、删除了什么

本批未删除文档（DELETE 82 篇速查占位文的处置已在 document-migration-map.md 立项，待单独批次执行并同步回收引用）。python/090 等 9 篇重写删除的「形式化定义/理论推导/历史演化」章节内容约 100KB（git 历史可查），删除原因：文体错配，对目标读者不可学。

## 三、新增了什么

1. docs/curriculum/curriculum-map.md：v2 课程地图（依赖图、路径设计、项目路线、真实素材库、方法论参照系）；
2. docs/standards/ 六份内容标准 v1.0（写作/代码示例/练习/项目/技术验证/质量门禁）；
3. docs/audit/document-migration-map.md：全库逐篇处置映射（DELETE 82 / MERGE 30 组 / SPLIT 29 / REWRITE 主线清单 / CREATE 清单）；
4. audit-learning-path.mjs 反向覆盖率门禁。

## 四、解决了哪些教学问题

零基础主线断层（P1）、入门先考后教（P1）、模块依赖缺失（P2）、路径孤儿（P2）、三处安全缺口（P0）、两处版本口径滞后（P3）、入口顺序错误（P1）。勘察报告 learning-gap-analysis.md 第 6 节的 1-5 项全部落地，第 6 项（环境搭建四处分工）部分落地（python/020 重写后只做入口、细节分流 030/040）。

## 五、引用的官方资料与联网验证

- 联网核实（2026-09-27）：Python 3.14.x 稳定线、Node 24 Active LTS（22 已 Maintenance）、React 19.3、Tailwind v4、Vite 8、Vue 3.6/Vapor 状态；
- 方法论研究：The Odin Project（六段模板、安装课边界声明）、freeCodeCamp（user stories 验收）、MDN Curriculum（双层出口评估）、Full Stack Open（练习 1:1 紧邻）；
- 许可核实：改编白名单（BSD/MIT/CC-BY：freeCodeCamp、ossu、free-programming-books、project-based-learning、TheAlgorithms、every-programmer-should-know、charlax）；NC 红名单（TOP curriculum、missing-semester、javascript.info 只借鉴思想不搬文字）；
- 重写文档中的报错原文全部为本机实跑捕获（Python 3.14.6 / git 2.x），非凭记忆编造。

## 六、还有哪些问题

1. Phase 6 剩余批次：html5/css 入门段、javascript 030-080 链、mysql 050-120、java/go/cpp 等模块的 REWRITE（迁移映射已排好优先级）；
2. 82 篇速查占位文的 DELETE 批次（需先统一 full/syntax 两树模块编号）；
3. 30 组 MERGE 与 29 篇 SPLIT；
4. 每模块出口项目篇（CREATE）与 roadmap 游戏路线、AI 环节；
5. content-audit.mjs 的练习密度/预期输出/安全关键词自动检查尚未实现（人工门禁 20 问暂时顶上）；
6. 假学生全路径走查待主线重写完成后执行。

## 七、门禁记录

content-sync：0 处补全、无死链；audit:content：HIGH 0（MEDIUM 274 为存量）；audit-learning-path：0 errors 0 warnings、孤儿 0；typecheck：0 errors；test:smoke：20/20；emoji 扫描：46 个改动文件全干净。

---

# 批次二（2026-09-27 下午）：主线补全、规模治理与 Phase 7 首轮验收

## 一、修改了什么、为什么

1. **Phase 6 批次二重写 13 篇**：javascript 030-080 六篇、css 010/020、mysql 100/120、git 030/040（走查发现的硬断层）。至此零基础主线（start → roadmap → python → git → javascript 语法段 → css 入门段 → mysql 语法段）的教学文体全部达标，累计重写 26 篇。
2. **Phase 7 假学生走查（首轮）**：22 篇主线的五项检查（链接/前置/未教先用/预期输出/练习），发现 10 项问题并当轮全部修复——含 2 个可复现运行事故（start/060 猜数字死循环、start/040 cat 已删文件）、1 个主线硬断层（git/030）、2 处前置错序（git/040、python/100）。报告：fake-student-walkthrough-2026-09-27.md。
3. **规模治理（DELETE 批次）**：预检脚本逐篇核对 syntax 覆盖后，安全删除 73 篇速查占位文（与 cnt-content/syntax/ 内容重合 ≥60%，零正文引用；java 20、python 24、mysql 4、javascript 3、postgresql 3、redis 4、c 2、csharp 1、其余 9）；6 篇无速查对应（css 4、vue3 1、react 1）保留待改造为真教学文。路径 JSON 同步修剪节点，sync 自动清理 53 处死引用。
4. **CREATE**：roadmap/140-GameDevRoute（第 12 条就业路线，检验项目绑定作者真实开源仓库 quaver/geometric-construct/ZATO-CN-Patch/pixel-vault）、roadmap/150-AICollabWorkflow（三段式提示词、审查六问、AI 代码测试兜底与学习红线）；总览更新为 12 条路线/35 模块并挂接两篇。
5. **质量门禁扩展**：content-audit.mjs 新增 NO_EXERCISE（教学长文缺练习，LOW）与 SAFETY_PWD/SAFETY_TLS（明文密码比对/关闭证书校验而无警告语境，MEDIUM）。
6. **README 统计更新**：1732 篇文档 / 1732 个学习路径知识点。

## 二、删除了什么

73 篇速查占位文（清单见 git 提交），删除理由：与 syntax/ 速查源重复维护、无任何正文引用、路径节点已同步回收；6 篇保留项已登记于 document-migration-map.md。

## 三、门禁记录（批次二）

sync：死链清理 53 项、order 重排 407 篇、新文档注册；audit:content：HIGH 0（SAFETY_PWD 9 处为复制通道密码配置等启发式场景，登记待人工复核）；audit-learning-path：0 errors 0 warnings、孤儿 0；typecheck：0 errors；test:smoke：20/20；emoji 全量扫描干净。

## 四、遗留

- javascript 090-470 深水区、html5 全模块、各后端模块主线的持续重写（按迁移映射批次推进）；
- 6 篇保留占位文的改造；30 组 MERGE 中未由删除覆盖的部分；29 篇 SPLIT；
- 各模块出口项目篇与 roadmap 其余路线的检验项目绑定；
- SAFETY_PWD 9 处人工复核。
