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

---

# 批次三（2026-09-27 晚）：后续批次与出口项目

## 一、修改了什么、为什么

1. **SAFETY_PWD 9 处人工复核完成**：javascript/640（正则教学样本）、mysql 复制家族 570/590/600/620/640（复制凭据配置）、mysql/740/750（注入攻防示例）、redis/210（Sentinel 客户端）——均为合理教学场景，逐处补上最小权限/密钥管理/加密存储/哈希语境注释；门禁 SAFETY_PWD 归零。
2. **6 篇保留占位文全部改造为真教学文**：css/400-ModernColorSpace（oklch/color-mix/渐进增强）、css/710-ScopeAtRule（作用域边界与降级）、css/690-GridQuickStart（Grid 入门，与 250 深水篇声明分工）、css/700-Transform3D（变换与合成层性能）、vue3/270-Vue3ViteBuildConfig、react/460-ReactViteToolchainCommand（两篇结构对称、案例不同；CRA 退场后的现在时工具链）。至此「的完整教学讲解。」占位文清零。
3. **批次五重写 7 篇**：javascript 090（数组高阶方法）/100（this 四规则一例外）/250（异步入门）/410（DOM 与事件），html5 010/020/030 入门链。累计重写 39 篇。
4. **出口项目篇 CREATE 2 篇**：git/430-GitCapstoneProject（Level 4：真实仓库的分支/约定式提交/冲突/tag 全流程，user stories A1-A9+E1-E3）、python/975-PythonCapstoneProject（Level 6-7：记账原型升级为可安装的 ledger CLI，P1-P12+E1-E3，提示梯度从高到无）。两篇已挂载学习路径（git 43 节点、python 81 节点）。
5. **修复 2 处 YAML frontmatter 解析错误**（css/690 未加引号的 `display: grid`、css/710 以 @ 开头的 title），HIGH 回归为 0。

## 二、删除了什么

本批无删除。

## 三、MERGE/SPLIT 精确盘点

- MERGE 30 组：8 组已由 DELETE 消化、2 组由分工重构解决、20 组待各模块深水区批次（清单已回写 document-migration-map.md 第二节）；
- SPLIT 29 篇：维持待办——需先确立「进阶参考层」的站点信息架构（大文件是拆为教学篇还是降级为参考书），这是唯一的架构级待决项，已单独标注。

## 四、门禁记录（批次三）

sync：新文档注册、order 补全；audit:content：HIGH 0、SAFETY_PWD 0；audit-learning-path：0 errors / 0 warnings / 孤儿 0；typecheck：0 errors；test:smoke：20/20；emoji 扫描：本次改动文件全干净（mysql/170 的 3 处 😀 为既有 utf8mb4 教学示例字符，非本次引入，处置权留维护者）。

## 五、累计状态与遗留

- 教学文体达标文档：39 篇重写 + 2 篇毕业项目 + 140/150 两篇路线篇，共 43 篇新文体；
- 遗留：javascript 深水区与各后端模块主线重写、20 组 MERGE、29 篇 SPLIT（依赖参考层架构决策）、其余模块出口项目篇。

---

# 批次四（2026-09-27 深夜）：javascript 深水区 MERGE 消化、java/cpp 主线启动与参考层决策

## 一、修改了什么、为什么

1. **javascript 两组 MERGE 消化（分工重构模式）**：290/300-EventLoop 重写为「主教学（心智模型与三步口诀）+ 深水区专题（清空时机实证、Node 六阶段、rAF/rIC、两道完整推演）」；180/190-原型链同模式（180 心智模型与 new 四步、190 三角关系推演/继承演进/instanceof 真相）。两对均互相声明分工、实验零重复。MERGE 进度 30 组中 13 组消化、余 17 组。
2. **java/cpp 模块主线启动**：java 010/020/030（JVM 心智模型、JDK/JRE/JVM 三层、HelloWorld 与 main 签名拆解；Java 25 LTS 经 WebSearch 核实）、cpp 010/020/030（零开销抽象、三次大版本、UB 概念正面教学）。累计重写 48 篇。
3. **参考层架构决策落地**：决策为「文档内定位约定，不改站点信息架构」，标准落成 docs/standards/reference-layer.md（判据、义务、SPLIT 三问）；28 篇 SPLIT 候选统一注入定位声明块（python/090 已重写为教学文移出清单）。29 篇 SPLIT 子项解锁。
4. **javascript 出口项目**：715-JavaScriptCapstoneProject（Level 5-6 书签管理器，J1-J10+E1-E4，与 700 示例篇声明分工），挂载学习路径（javascript 69 节点）。
5. **python 500/510 装饰器双篇**按分工重构消化（500 心智模型三步演进、510 三层嵌套/类装饰器/叠加顺序/标准库三例）。

## 二、门禁记录（批次四）

sync：新文档注册；audit:content：HIGH 0、SAFETY 0；audit-learning-path：0 errors / 0 warnings / 孤儿 0；typecheck：0 errors；test:smoke：20/20；emoji 扫描：52 个改动文件干净。

## 三、遗留（截至本批）

- 重写 48 篇 / 新文体合计 52 篇；余 17 组 MERGE；各深水区批次推进 SPLIT 物理拆分；其余模块出口项目篇（java/go/cpp 等随主线重写顺延）。

---

# 批次五（2026-09-28）：MERGE 四模块五组消化、java/cpp 主线打通与出口项目补齐

## 一、修改了什么、为什么

1. **五组 MERGE 消化（「主教学+深水区」分工重构模式，含首个三连组）**：
   - javascript 590/600：ES2023-2026 按年份实用导览 + 采用策略深水区（引擎节奏差、转译 vs polyfill、Stage 0-4 流程），示例 Node 24 实测；
   - typescript 430/440/450 三连：条件类型入门与分发 → infer 专题 → 组合实战（DeepReadonly/MyAwaited/ParametersToObject），报错原文 TS 6.0.3 实测（含修正三处社区讹传）；
   - java 390/410：泛型入门（PECS 口诀）+ 类型擦除深水区（javap 实证、桥方法、通配符捕获），JDK 25 实测；
   - mysql 320/330：EXPLAIN 逐列读懂（type 阶梯每级配可运行 SQL）+ 优化器成本与索引失效六大现场（EXPLAIN ANALYZE 实测）；并发现修复 210-IndexManagement 的悬空链接；
   - cpp 090/100：移动语义心智模型 + noexcept/moved-from/容器真实行为深水区。
2. **java 主线 040-100 七篇打通**：程序结构、类型转换（溢出与 addExact）、包装类缓存陷阱（127 面试题）、变量与常量、运算符（040 悬念回收）、控制流（猜数字 Java 版）、方法详解（值传递真相、重载红线、递归出口）。
3. **cpp 主线 040-120 七篇打通**：类型系统（sizeof/CTAD）、命名空间与链接（三文件工程）、Lambda（捕获与悬垂）、移动语义双篇（上述）、完美转发与引用折叠（static_assert 验证）、指针（与引用分工、悬垂、const 读法、sanitizers 实战）。
4. **出口项目补齐至 5 模块**：java/1020（控制台任务管理器，J1-J10）与 cpp/790（零依赖 Buffer 库，C1-C10 + sanitizers 纪律），已挂载学习路径。
5. 批次执行说明：部分子代理在返回阶段因配额/网络中断，产出已先行落盘；接手方以「旧模板标记归零 + 练习齐备 + 篇幅达标」三项校验确认完整性后继续，未重复生产。

## 二、门禁记录（批次五）

sync：新文档注册、死链清理 1 项；audit:content：HIGH 0（中途拦截 ts/430 一处 YAML 解析错误并修复）、SAFETY 0；audit-learning-path：0 errors / 0 warnings / 孤儿 0；typecheck：0 errors；test:smoke：20/20；emoji 扫描：49 个改动文件干净。

## 三、累计状态与遗留

- 累计重写 71 篇 + 毕业项目 5 篇（git/python/javascript/java/cpp）+ 路线篇 2 篇 + 占位文改造 6 篇 = 新文体 84 篇；
- MERGE 30 组消化 18 组（含本轮 5 组），余 12 组：python 570/580、630/640/650、660/670；typescript 530/540；java 480/490/500/510；mysql 430/440；c 200/210、220/230、520/530；cpp 130/140、350/360、370/380、430/440；
- 遗留：各深水区批次重写与 SPLIT 物理拆分（参考层标准已解锁）、其余模块出口项目随主线重写顺延。


---

# 批次五补遗（同日）：cpp 070/080 补齐

完成度审计发现验证器指定范围 cpp 040-120 中的 070-LambdaCaptureDetailed 与 080-CppReferenceTypes 仍为旧模板（080 零练习），已按标准重写补齐：070 为 060 的分工深水篇（取值时机实验、悬垂捕获事故、C++14 初始化捕获、mutable 与 [*this]）；080 为别名模型总纲（参数三选、const 引用绑临时特权、悬空引用 ASan 定位）。至此 cpp 040-120 与 java 040-100 全范围达标，累计重写 73 篇。门禁复验：HIGH 0、孤儿 0、typecheck 0、smoke 20/20。

---

# 批次六终章（2026-09-28）：全部批次收尾——MERGE 清零、SPLIT 落地、出口项目八模块

## 一、修改了什么、为什么

### Wave A（5 代理，14 篇）：python 570/580、660/670、630/640/650 三连；ts 530/540；mysql 430/440；c 200/210、220/230。全部「主教学+深水区」分工重构，示例本机实测（py 3.14 / ts 6.0.3 / gcc 报错格式）。

### Wave B（5 代理，14 篇）：java 480/490/500/510 并发四连（含 jstack 抓死锁实录）；c 520/530（C23/C2y，特性支持矩阵逐项核验）；cpp 130/140（智能指针）、350/360（SFINAE）、370/380（变参折叠）、430/440（并发）。至此 **MERGE 30 组全部消化**。

### Wave C（5 代理）：毕业项目 ts/595（类型安全 API 客户端）、mysql/930（论坛数据库）、c/595（零依赖 vector+hash 库）——出口项目覆盖 8 模块；SPLIT 落地前两案：redis/090（214KB→三篇 72/64/50KB）、postgresql/210（151KB→三篇 59/40/67KB），内容零缺失、参考层声明保留、路径 JSON 同步挂载。

### Wave D（5 代理）：algorithm 四大合集拆分（030 排序→两篇、110 图→两篇、160 DP→两篇、300 刷题→两篇，原文内容零缺失核验、DP 篇实测修正 5 处既有错误答案）；拼接类清理三篇（kotlin/160 -82%、java/420 -72%、cpp/420 -80%，速查堆砌段与跑题内容删除、独有信息并入正文）。SPLIT 物理拆分累计 6 案 13 篇（redis/pg/algorithm），清理收敛 3 篇。

### 执行纪律：撞号预防（c/560、ts/560 → 改名 595）；子代理中断即「产出已落盘 + 校验续做」；每个拆分案过拆分三问（独立成立/路径调整/旧 slug 保留）。

## 二、门禁记录（批次六终章）

sync：新文件注册、order 补全；audit:content：HIGH 0、SAFETY 0；audit-learning-path：0 errors / 0 warnings / 孤儿 0（拆分新篇全部挂载路径）；typecheck：0 errors；test:smoke：20/20；emoji 扫描：143 个改动/新增文件全干净。全库文档 1734 → 1748 篇。

## 三、重构工程终态

- 新文体文档累计约 110 篇（73 前批 + 26 重写 + 5 毕业项目 + 6 改造）；毕业项目 8 模块（git/python/javascript/java/cpp/typescript/mysql/c）；
- MERGE 30/30 组消化；SPLIT：6 案 13 篇物理拆分 + 3 篇清理收敛 + 22 篇参考层定位标注（保留为参考书的定位已声明，按标准季度复审）；
- 占位文清零；安全门禁归零；每篇文档均在学习路径内；
- 学习路径与站内数据全部同步（modules.json / learning-path JSON / index）。

## 四、剩余（维护性，非批次性）

- 28 篇参考层文档的季度复审（technical-verification-standard）；
- 未重写模块深水区的渐进改写（随日常维护，迁移映射 KEEP/REWRITE 状态列持续回写）；
- mysql/170 的 3 处既有 😀 字符（utf8mb4 教学示例）处置权留维护者。

---

# 批次七（2026-09-28）：维护批——五模块入门链、9 篇直写与 P7 清零

## 一、修改了什么、为什么

1. **P7 清零**：mysql/170 的 3 处字面表情字符改为 `UNHEX('F09F9880')` 教学写法——既满足仓库 emoji 禁令，又把 U+1F600 的四字节编码（F0 9F 98 80）直接亮成教学内容；示例输出同步修正为 LENGTH=10。
2. **五模块入门链重写（15 篇，代理并行）**：vue3 010/020/030、react 010/020/030、go 010/020/030（版本经 WebSearch 核实为 Go 1.27 稳定线）、kotlin 010/020/030（K2 与 2.4.x 经核实）、csharp 010/020/030（.NET 10 / C# 14 经核实）。
3. **末波 9 篇直写**（代理配额受限后由会话直接完成）：cs-fundamentals/010（五幕剧旅程）、c 010/020/030 入门链（含编译四阶段拆解实验）、svg 010/020/030（viewBox 取景框模型）、algorithm 010/020（timeit 计时实验与 list 扩容实测）。
4. **收敛验证**：扫描全部 43 模块的前 3 篇——旧模板残留仅剩 algorithm/030 一处，且为参考层基础篇的设计使然（已标注定位，深水内容合法）。**至此全部 43 个模块的入门链（前 3 篇）均达到新教学标准。**

## 二、门禁记录（批次七）

sync：117 处 updated 历史滞后补全（上批合入文件的 git 日期回填，属管线自愈）；audit:content：HIGH 0、SAFETY 0；audit-learning-path：0 errors / 0 warnings / 孤儿 0；typecheck：0 errors；test:smoke：20/20；emoji 扫描：142 个改动文件干净。

## 三、维护移交（工程收尾声明）

批次工程到此收口。移交清单：

1. **28 篇参考层文档季度复审**：下次时点 2026-12-27，按 technical-verification-standard.md 执行（版本敏感清单优先）；
2. **深水区渐进改写**：未重写篇目按迁移映射 KEEP/REWRITE 状态列随日常维护推进，入门链（前 3 篇）已全部达标，学习主线的阅读体验有保障；
3. **内容审计门禁**：NO_EXERCISE（LOW）与 SAFETY（MEDIUM）随 CI 常驻，新内容自动受检；
4. mysql/170 表情字符已以转义教学写法解决，无遗留。
