# 学习断层分析（learning-gap-analysis）

- 勘察日期：2026-09-27
- 定义：断层 = 学习者在按既定顺序推进时，遇到「默认你已会但没人教过你」的概念，或遇到「不可学」的文本形态。机器断链为 0（三类引用全健康），本报告全部是**语义断层**。

## 1. 零基础真实性测试：从 001-start 走进语言模块即断裂

001-start 8 篇本身过关：概念首次出现即解释、前置链条完整（020 文件/路径 → 030 装环境 → 040 终端 → 060 JS → 070 Python）、连「Node 已在环境搭建篇装好」都明确交代。但一进入语言模块就断裂：

1. `032-python/020-PythonOverviewEnvSetup.md`（模块第 2 篇）：正文第一屏就是「入门核心能力清单」，要求读者掌握 str/list/tuple/dict/set/pathlib 的方法与陷阱（「遍历时直接删除元素容易跳项」），而全模块第一个语法教学篇是 050——先考后教。
2. `007-javascript/020-JavaScriptOverviewRuntimeEnv.md`（模块第 2 篇，79KB）：读者刚学完 F12 打控制台，下一篇就是运行时模型的「形式化定义」与「理论推导」，学习目标由章节标题机械复读生成。
3. `032-python/090-VariableConstant.md`（模块第 9 篇，即「变量与常量」课）：用 LaTeX 集合论记号定义名字绑定与 LEGB、讲引用计数。零基础者学 `x = 1` 的第一周遇到的是数学语义学。
4. `007-javascript/060-ControlFlow.md`（模块第 6 篇）：示例用 `function sum(arr)` 与 `let`，而函数篇在 080；更严重的是文中出现「async/await 的语义可形式化为状态机变换（CPS 变换的退化形式）」——异步要到 400 号段才教。
5. `006-css/010-WhatIsCSS.md`（模块第 1 篇）：动手环节要求「回到 HTML 第一课创建的 index.html」，依赖 html5/010-WhatIsWebpage；从 css 模块直接入门的读者拿到的是不存在的文件（frontmatter prerequisites 虽声明了依赖，但模块自身不带你先建出来）。

对照正面做法：`032-python/010-WhatIsPython.md` 用到 def 与 f-string 时主动标注「先混个眼熟，本模块第二篇起逐一讲透」——前向引用可以存在，但必须明示；批量文档普遍不做任何标记。

## 2. 链式断层：一处文体错配污染整条主线

典型链条：`032-python/090-VariableConstant.md` 声称前置仅 050-ProgramStructureBasicSyntax，正文却是学术文体加 LEGB/引用语义/企业级配置管理（97KB、3228 行）。零基础学习者在主线第 9 课撞上不可学的文本，而**后续所有模块默认读者已掌握「变量与常量」**——断层的代价向下游无限传播。

同类堆砌链：typescript 430→440→450 条件类型三连、python 160→590→680 相关链，每一环都是同骨架学术文。

## 3. 前置声明的系统性错位（数据见 dependency-analysis.md）

511 篇「建议先完成前一篇的学习」按编号相邻机械生成：元类的前置是虚拟环境、协程的前置是数据类字段、甚至向后指。初学者被指错了路，正确的路（迭代器协议、OOP、描述符）反而未声明。

## 4. 导航断层：22.6% 的文档零入边

407/1803 篇（22.6%）无任何正文内链指向、且不在学习路径内。重灾区：cybersecurity 39、cloud-computing 37、github 36、cs-fundamentals 34、software-testing 33、python 26、devops 25、mysql 22、markdown 17、postgresql 17、networking 17。这些文档只能靠模块内顺序导航被发现——对「按需查阅」的读者等于不存在。

## 5. 体验断层：重复与倒挂叠加

1. 环境搭建四次重复（start/030 → python/020 → python/030 → python/040），零基础读者连续四次装环境且四处口径不完全一致（020 篇「3.10+」与 010 篇「3.12+」冲突）。
2. mysql/140-BuiltinDataStructure 一类 intermediate 文档的前置指向 96KB 性能篇——序位倒挂。
3. 路径孤儿与阶段错位叠加（python basics 阶段放元类、入门篇缺席），即使读者严格跟学习路径走，也会在第一步就跳过基础直达进阶。

## 6. 断层修复的优先顺序

1. P1：主线入门段的文体错配（python 090/020、javascript 020/060、css 010）——零基础第一周决定去留；
2. P1：511 篇机械前置的清理（改为空 + 按概念依赖补真前置，宁缺勿错）；
3. P2：start 与 语言模块双向直链；
4. P2：python/javascript/mysql 三模块的学习路径 stages 按概念依赖重建（消除断层的导航放大器）；
5. P3：407 篇零入边文档纳入路径或建立模块内导航；
6. P3：环境搭建四处分工（start 负责通用，python 模块只讲语言专属）。
