---
order: 210
title: 开发者工具与调试
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: Shift+D 菜单、Shift+O 控制台、lint 静态检查、Shift+R 热重载与 Skip 跳过的工程化用法
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：开发者工具与调试——Ren'Py 自带的开发期工具链（与玩家可见的功能无关，发布前会被关掉）。
- **解决什么问题**：变量值对不对、哪句台词漏了配音、有没有写死的死循环——这些靠"玩一遍"效率太低。官方工具链提供静态检查（lint）、现场检查（控制台与监视器）、快速迭代（热重载）、快速跳过（Skip）与自动化回归测试（testcase，8.5 引入）五类手段。
- **什么时候用到**：写剧本的全程（热重载迭代）、发版前（lint 报告清零、测试套件通过）、排查"变量为什么是这个值"（控制台）。
- **关联**：样式不生效用 Shift+I 检查器，见 [样式系统与样式属性](/renpy/115-StyleSystemAndStyleProperties)；打包发布前 developer 模式的最终确认见 [打包发布与全平台分发](/renpy/130-BuildingDistributions)。

## 学习目标

- 会用 Shift+D 开发者菜单调度全部工具，理解 config.developer 的总开关地位；
- 会用 Shift+O 控制台查变量、跳 label、watch 表达式；
- 会跑 lint 并读懂报告类别，把"发版前 lint 清零"固化为流程；
- 会用 Shift+R 热重载与 autoreload 迭代样式与界面；
- 理解 Skip 跳过与 fast skipping 的机制，测试自己的游戏节奏；
- 知道 8.5 引入的 testcase 自动化测试能覆盖什么，会在 launcher 或命令行跑一套测试。

## config.developer：总开关

多数开发期工具要求 config.developer 为 True：Shift+D 开发者菜单、Shift+R 重载、Shift+I 样式检查、fast skipping（也可单独用 config.fast_skipping 开）、warp 跳转。新项目默认开启；打包发布时引擎会自动把它关掉。控制台由 config.console 单独控制（developer 模式下也可用）。

纪律：不要在发布版里留 developer True 的侥幸——打包虽默认关闭，但如果你在脚本里手动 define config.developer = True 且没加条件，玩家就能打开控制台跳转剧情。发布前检查这一行（lint 也会提醒）。

## Shift+D 开发者菜单

游戏中按 Shift+D 打开开发者屏幕，汇总入口：控制台（Shift+O）、变量查看器（Variable Viewer）、样式检查（Shift+I）、重载游戏（Shift+R）、编辑当前语句（Shift+E）、转场画廊与各类预览。日常最高频的是前四项；Shift+E 从"玩到哪改到哪"直达对应脚本行，是写长剧本时的省时键。同一族按键里还有 Shift+A 无障碍菜单——8.6 新增的屏幕阅读器模式（Shift+V 切换，检测到 NVDA、VoiceOver 等读屏软件时自动启用）让文本经由读屏与盲文设备呈现，无障碍自测从此成为发版前检查清单上的一行。

## Shift+O 控制台

按 Shift+O 打开控制台，能做四类事：

- 求值 Python 表达式/语句并显示结果（查变量、调函数）；
- 交互式运行 Ren'Py 脚本语句；
- 跳转到 label（jump 命令）；
- 追踪表达式随游戏进度的变化（watch）。

命令清单：clear 清历史、escape/unescape 切换 unicode 转义（unescape 默认）、exit 退出、help 或 help 表达式、jump label、load/save 槽位、long/short 切换对象显示粒度、reload 重载脚本、stack 打印返回栈、watch/unwatch/unwatchall 管理监视。

场景一：用控制台现场查变量与调用函数。测试分支时不想重玩两小时到达分歧点：

```text
> affection
50
> affection = 90
> jump confession_scene
```

三条命令直接把游戏状态推到目标分支——查值、改值、跳转，这就是控制台的三板斧。再配合 watch：

```text
> watch affection
```

表达式值显示在屏幕右上角，实测好感度增减的每一个节点，比在剧本里到处加 print 干净得多。

易错点：控制台里赋值改变的是运行期 store（Python 语句与 store 篇的语义），define 常量改了会在下次 init 时被重置；控制台改的值也不进存档结构检查——用它调试，别用它"制造"正式存档。

## lint：发版前的静态体检

lint 在 launcher 里叫 Check Script（Lint），也可命令行触发（renpy.py 的 lint 目标）。它静态分析整个项目，输出三类内容：

- 潜在错误：不可达的 label、菜单死循环、引用了不存在的图像与 label、say 到未定义角色等；
- 低效优化（misoptimizations）：影响运行效率的写法；
- 仅其他平台出现的问题（建议全部修复）；
- 游戏信息与统计：字数、台词数、菜单数、玩家通关所需点击数等。

场景二：发版前跑 lint 出报告清单。把"lint 报告零错误"写进发版清单，流程是：跑 lint，逐条修复错误类，浏览统计核对（比如"玩家通关需 2400 次点击"是否符合预期节奏），再进打包。lint 不能替代测试——它查得出写错的引用，查不出"这段演出很怪"，两者互补。

场景三：多人项目的回归检查。剧本合并后先跑 lint 再进游戏，很多"合并把 label 名改没了"的冲突在 lint 一分钟内现形，比各写各的然后联调时炸掉便宜得多。lint 还会列出未使用的图像资源，是资源清理的起点。

## Shift+R 热重载与 autoreload

按 Shift+R：保存进度、重载脚本并重新加载游戏。变量值与 scene 列表被保留，所以改样式、改 screen、改未执行到的台词后热重载，立即看到效果；但修改"已经执行过的语句"需要回滚或重跳才能看到效果。首次重载后进入 autoreload 模式，此后每次保存脚本文件自动重载——写界面时开着它，改一行看一眼。

相关 API：renpy.get_autoreload()、renpy.set_autoreload()、renpy.reload_script()。注意：在 replay（回想模式）中不可用。

场景三：热重载迭代样式。调一个按钮的配色与间距：屏幕上开着设置页，编辑器里改 style 数值保存，autoreload 生效后样式重建、界面刷新， Shift+I 检查器同时确认属性落到哪层（样式重建的成本见 115 篇）。这个循环把"改样式"的反馈周期从"重启游戏三十秒"压到"保存即所见"。

## Skip 跳过与 fast skipping

Skip 模式（默认按住 Ctrl 激活，ToggleSkip 可做成开关按钮）快速推进已读文本与已看过的演出，是玩家二周目的刚需，也是开发者自测全程节奏的工具。开发者菜单另有 fast skipping：条件为 config.developer 或 config.fast_skipping，按 > 键立即跳到下一个"重要交互"——不是由 say、transition 或 pause 产生的交互，通常就是下一个菜单。开发时用 > 直接跳到目标选择点，比 Skip 更精准。

用 Skip 自测游戏节奏是官方建议的姿势：全程 Skip 一遍，看"必须看的演出有没有被跳过漏掉"（没被跳过的部分对老玩家是折磨）、菜单与选项的间隔是否合理。skip_indicator 屏幕负责跳过状态的视觉提示，自定义皮肤时记得做。

## warp：命令行直达

启动参数 --warp script.rpy:458 让游戏启动后直接跳到指定文件行号。warp 只分析单一路径、不执行目标语句之前的 Python——变量未初始化，所以 warp 后常出现 undefined 名字，官方提供 after_warp label 作为补救点（在它里面补齐必要状态）。API 侧对应 renpy.warp_to_line()。8.6 起 warp 会沿路重放对话，history、NVL 文本与语音气泡都会被重建，跳转后回看上文不再空白。适用场景：剧本写到第 3000 行，每天打开项目直奔工作点，不必从 start 点三十次。

## 自动化测试：testcase 与 testsuite

lint 管"引用是否正确"，控制台管"此刻状态对不对"，但"玩家从头通关一遍、菜单点得开、存档读得回"这类端到端回归，靠真人每次发版点一遍既慢又漏——这正是 8.5 引入的自动化测试框架的领地。你用 test 语句把"怎么点"写成脚本，引擎模拟真实的 GUI 输入（需要可用的窗口与 OpenGL），像玩家一样操作游戏并断言结果：

```renpy
testsuite smoke:

    testcase open_menu:
        pause 0.5
        advance until screen "game_menu"
        click "Save"
        advance until screen "save"
```

用 launcher 的 "Run Testcases" 按钮（存在 testcase 时才会出现），或从 SDK 目录用命令行跑：

```text
./renpy.sh <项目目录> test smoke
```

常用 test 语句：advance 推进一句对话、click/ type/ keysym/ drag 模拟输入、run Jump("label") 执行动作、`until` 系列把动作挂到条件上（如 `advance until screen "choice"`）、assert 断言、screenshot 截图留证；testsuite 支持 before/after 钩子。8.6 起测试可以用通配符批量选择，并用 parameter 属性参数化（一次定义、多组数据各跑一遍）。

心智模型：它测的是"功能闭环"——游戏能否按预期走完、界面能否交互，而不是像素级视觉对比；样式细节仍归 Shift+I，数值逻辑仍归控制台与单元式的 eval 断言。发版前让 smoke 套件先跑通，再上真人测试。

## 动手实践

**任务一：lint 体检报告（约 20 分钟）**

故意在你的项目里埋四个问题：一个引用不存在图像的 show、一个不可达 label、一个指向不存在 label 的 jump、一个拼错的变量名，然后跑 lint，把四条都从报告里找到并修复，最后再跑一遍确认清零。

提示：launcher 的项目列表里有 Check Script（Lint）按钮；报告是文本文件，会自动打开。参考自检：第二遍 lint 的错误区为空，统计区数字与你的剧本规模相符。把"发版前 lint 清零"加进你自己的检查清单——这道任务的真正产物是流程。

**任务二：控制台推剧情（约 15 分钟）**

写一段带三个分支的小剧本（用 affection 阈值分流），不用重玩，仅靠控制台：查 affection、改值、jump 到分支 label，把三个分支各走一遍；再对 affection 下 watch，观察每个 $ 语句后的变化。

提示：watch 的值显示在屏幕右上角，short/long 可切显示粒度。参考操作序列：

```text
> watch affection
> affection = 10
> jump branch_low
> unwatchall
```

**任务三：热重载迭代（约 20 分钟）**

开 autoreload，为设置屏做一个新按钮样式：从灰底开始，依次改 hover 色、圆角、字号、内边距，每改一步观察界面变化；中途故意把颜色值写成非法字符串，观察报错方式，修复后继续。

提示：非法值会在重载时报错并停在旧状态，读报错里的文件与行号定位——这也是练习"从报错反查代码"的机会。参考骨架：

```renpy
style hot_button:
    idle_background "#404048"
    hover_background "#5a5a86"
    size 24
    xpadding 20
    ypadding 10
```

预期收获：体会"保存即所见"的迭代节奏，以及热重载保留变量状态这一特性对界面调试的价值。

## 遮码自检

遮码自检：先遮住答案栏，自己说出答案或写出命令，再展开对照。

1. config.developer 与 config.console 的控制范围各是什么？为什么发布版里不能留 developer True？
2. 控制台的"三板斧"是哪三条命令？watch 与它们组合解决什么问题？
3. lint 能查出什么、查不出什么？它与 testcase 自动化测试的分工是什么？
4. Shift+R 热重载保留什么、不保留什么？为什么改"已执行过的语句"看不到效果？
5. warp 到目标行后变量为什么常是未定义的？官方给的补救点叫什么？
6. 写一条 testcase：等 0.5 秒、推进到出现 choice 屏、点击第一个选项。用到哪些 test 语句？

<details>
<summary>参考答案（先自己写再看）</summary>

```text
1) config.developer 是多数工具的总开关（Shift+D/O/R/I、fast skipping、warp），
   打包时默认关闭；config.console 单独控制控制台。若脚本里手动 define
   config.developer = True 且无条件保护，玩家就能开控制台改变量、跳剧情。

2) 查值（直接输入表达式）、改值（赋值语句）、跳转（jump label）；
   watch 表达式把变化实时显示在屏幕右上角，免去到处插 print。

3) lint 静态查：不可达 label、菜单死循环、不存在的图像与 label 引用等，
   并给出字数/点击数统计；查不出"演出很怪"这类主观问题，也覆盖不到
   运行期交互闭环。testcase 用模拟输入跑端到端回归（通关、菜单、存读档），
   两者互补：lint 管静态引用，testcase 管动态闭环。

4) 保留变量值与 scene 列表，进入 autoreload 后每次保存自动重载；但它
   不会重放已执行的语句，所以改已执行过的台词需回滚或重跳才能看到。

5) warp 只找单一路径、不执行目标语句之前的 Python，变量自然未初始化；
   补救点是定义 after_warp label——它在 warp 之后、目标语句执行前被调用。

6) testcase 骨架（放在 testsuite 里）：
   pause 0.5
   advance until screen "choice"
   click "选项文本"
   （click 也可用 id/expression 选择器定位按钮）
```

</details>

## 小结

- config.developer 是多数开发工具的总开关（Shift+D/O/R/I、fast skipping、warp），控制台另由 config.console 控制；发布版必须确认关闭。
- Shift+D 开发者菜单汇总入口；Shift+O 控制台四件事：求值表达式、跑脚本语句、jump label、watch 监视（clear/help/load/save/stack 是常用命令）。
- lint 静态体检：错误、低效、跨平台问题与统计信息四类输出；"发版前 lint 清零"应固化为流程，但它不替代测试。
- Shift+R 热重载保留变量与 scene 状态，首次后进入 autoreload；改样式改 screen 最见效，改已执行语句需回滚。
- Skip 跳过服务玩家二周目与作者自测，fast skipping 的 > 键直达下一个重要交互；--warp 命令行直达行号，但目标行前的 Python 不会执行，用 after_warp 补状态（8.6 起 warp 沿路重放对话、重建 history）。
- 8.5 引入 testcase/testsuite 自动化测试（advance/click/type/run/until/assert 等语句，launcher 或命令行运行），8.6 支持通配符与 parameter 参数化；Shift+A/Shift+V 提供无障碍菜单与屏幕阅读器模式。

## 参考与致谢

- [Developer Tools（Ren'Py 官方文档）](https://www.renpy.org/doc/html/developer_tools.html)——CC 许可，工具清单、控制台命令、重载与 warp 行为以此为底本整理改写；
- 本仓库 [样式系统与样式属性](/renpy/115-StyleSystemAndStyleProperties)（Shift+I 详述）、[打包发布与全平台分发](/renpy/130-BuildingDistributions)（发布前检查）交叉引用。
