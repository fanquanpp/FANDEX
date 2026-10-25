---
order: 120
title: 调试与断言
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: print 谱系的去向差异、assert 的调试期语义与 release 裁剪、@warning_ignore 精准压警与断点调试
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：GDScript 的调试设施——print 谱系（print/printerr/push_warning/push_error）、assert 断言、@warning_ignore 压警、断点调试。
- 解决什么问题："程序为什么不对"时，输出怎么打才进对的通道、哪些检查该留给断言而不是 if、编辑器告警怎么按行精准压制而不是全局关掉。
- 什么时候用到：排查逻辑错误、给关键函数入口加不变量检查、想让编辑器停止对某一行误报、游戏行为只在真机上复现时。
- **与 044-godot《调试与性能分析》（DebuggingAndProfiling，w11 计划新增）的分工声明**：GDScript **语言层语义**——print 各函数的输出通道、assert 的编译期裁剪规则、@warning_ignore 的语法、SceneTree 脚本怎么写——归本模块（105/118 两篇）；**引擎工具链工作流**——Debugger 面板用法、Profiler、远程调试细节、CI 门禁编排——归 044-127。执行顺序协调约定：本批 045 侧先落地，044-127 后落地时按本篇实际内容调整边界，两篇不各写一遍 --headless 参数表（参数表已存在于 044-130《导出项目》3.1 节，118 篇只引用不重复）。

## 前置知识

- 《函数与 Callable》函数声明与作用域；
- 《风格与静态类型》（100 篇）的警告系统一节——@warning_ignore 压的是它报的警。

## 学习目标

- 分清 print/printerr/push_warning/push_error 四个输出函数的去向与适用场景；
- 理解 assert 只在调试构建生效、release 下连表达式都不求值，会用它做入口不变量检查；
- 会用 @warning_ignore("warning_name") 按行压警；
- 会下断点、看调用栈与变量，知道远程调试去 044-127 找工作流细节。

## 1. print 谱系：四个函数四种去向

```gdscript
print("加载完成：", level_name)        # 标准 Output 通道
printerr("存档路径不存在：", path)      # 标准错误通道（stderr）
push_warning("存档版本较旧，将执行迁移") # 警告通道
push_error("SAVE_VERSION 缺失，拒绝读档") # 错误通道
```

**讲解：**

1. **print 与 printerr** 都只是文本输出，区别在通道：print 走 stdout，printerr 走 stderr。命令行重定向（`godot ... > out.log 2> err.log`）时分流；编辑器 Output 面板两者都显示。工具脚本里"正常输出"与"错误信息"分开走，CI 消费方才能按通道过滤——这是 118 篇 CLI 约定的基础。
2. **push_warning / push_error 不只是打印**：它们进编辑器 Debugger 的 Errors 面板（带堆栈定位），并计入"错误数"——编辑器标题栏、CI 日志扫描都以它为准。运行期"预期但值得记录"的异常走 push_warning，"不该发生"走 push_error。
3. print 的多参数是自动空格拼接，不用手写 `+ " " +`；要格式化用 `"%d" % [n]` 或 `String.format`。
4. 易错点：物理帧循环（_physics_process）里 print 每帧输出会把 Output 面板刷爆并拖慢编辑器——高频路径用条件打印（状态变化时才打）或断点，不用裸 print。

## 2. assert：调试期的哨兵

```gdscript
const SAVE_VERSION := 11

func _migrate(data: Dictionary, from_version: int) -> Dictionary:
    assert(from_version <= SAVE_VERSION, "存档版本高于当前程序版本，拒绝迁移")
    assert(data.has("stats"), "存档缺少 stats 段，数据不完整")
    # ...梯式迁移主体
```

**讲解：**

1. **assert 只在调试构建（debug）生效**；release 构建里整个 assert 语句被裁掉——**连括号里的表达式都不求值**。这不是"报错但不中断"，是"这句话在正式版里不存在"。因此 assert 里绝不能放有副作用的代码（`assert(list.erase(x))` 这类写法在 release 下行为直接改变），也不能指望它替你挡生产环境的坏数据。
2. 正确的分工：**assert 挡"程序员的错"**（不变量、入口契约——版本号非法、数据结构缺段，出现即代码有 bug），**if + push_error 挡"玩家/外界的错"**（存档文件被手工改坏——这是要优雅处理的输入，不是断言失败）。speed-rouge 存档迁移函数入口校验 SAVE_VERSION 用 assert，正因为版本号只由自家代码写入，它错就是代码错。
3. assert 失败的行为：调试器中断（编辑器内）或程序退出，消息带上你给的第二参数。它让错误在离根因最近的一行停下，而不是让坏数据流到十层之外再炸。
4. 易错点：把 assert 当运行时校验写给玩家流程用——正式版里它消失了，检查形同虚设。玩家输入、文件内容、网络数据，一律走显式错误处理。

## 3. @warning_ignore：按行压警

编辑器对可疑代码出黄色警告（UNSAFE_METHOD_ACCESS、INTEGER_DIVISION、UNUSED_VARIABLE 等，完整清单见 100 篇警告系统）。全局关警告等于蒙眼开车，正确姿势是按行精准压制：

```gdscript
@warning_ignore("integer_division")
func half(v: int) -> int:
    return v / 2        # 这一行就是要整数除法，警告不适用

@warning_ignore("unsafe_method_access")
func legacy(node) -> void:   # 参数无类型标注的存量接口，动态访问是刻意的
    node.do_legacy_thing()
```

**讲解：**

1. 注解写在语句所在行的上方，作用于紧随的那一条语句/函数；编辑器警告面板里每条警告都会给出名字，点"忽略此警告"会自动生成注解——优先用编辑器生成的，名字打错不会报错只会不生效。
2. 判断准则：每一条 @warning_ignore 都值得一句话注释说明"为什么这里安全/为什么这里必须如此"——压警是声明"我看过、我负责"，不是 hides the problem。没有解释的批量压警是技术债的温床。
3. 与 push_warning 的关系：@warning_ignore 压的是**编辑器静态分析**的警告；push_warning 是**运行期**主动发警告，两者互补互不相干。

## 4. 断点与调试会话

编辑器内调试的主循环：在行号左侧点击下断点 -> 以调试模式（F5 或调试按钮）运行 -> 命中断点后用 Debugger 面板看**调用栈、当前作用域变量、监视表达式**，单步（F10 步过 / F11 步入）推进。

适用判断：

- **逻辑错误且状态复杂**（速度突变、状态机乱跳）：断点看变量快于读日志——在物理帧回调里下断点，命中时直接检查 velocity、输入轴、碰撞法线，一步定位。
- **偶发、时序相关**：断点会改变时序（暂停整帧），可能"一断就复现不了"——这类用条件打印或录像回放定位。
- **跨进程/真机**：远程调试（编辑器连真机上的调试端口）属于引擎工具链工作流，面板用法与 044-127 的 Debugger/Profiler 篇是同一套，本篇不展开。

## 5. 三个真实场景

**场景一：存档迁移函数的入口哨兵（真实工程 save_manager.gd 形态）。** 存档系统经历 11 个版本，`_migrate(data, from_version)` 用梯式 if 逐级迁移。入口两行 assert：版本号不超前、必需段存在。开发期一次重构误把 SAVE_VERSION 常量改小，运行旧档立刻在入口断言处中断——错误停在"版本号判断"这一行而不是迁移中段的数据错乱。正式版里这两行不存在，但正式版也不会遇到"自家代码写错版本号"的情况（写入路径同样被常量约束），分工清晰。

**场景二：物理帧循环里的速度突变定位。** 横版竞速角色偶发被弹到天上。print 每帧输出 velocity 会刷爆面板且错过突变瞬间——在 _physics_process 里 velocity 赋值行下断点，配合条件观察（Debugger 面板的监视表达式盯 `velocity.y > 1000`），两次复现就看到突变帧：接触斜坡的法线方向算反，反弹方向冲天。断点的价值在"突变瞬间的完整变量快照"，这是任何日志都给不了的。

**场景三：工具脚本的退出码约定（真实工程 progen_level.gd 范式）。** 关卡生成器无头运行，生成结果先过四条准入自检，失败打 `PROGEN FAIL ...` 并 `quit(1)`，成功打 `PROGEN PASS` 且 `quit(0)`。批处理与 CI 据退出码放行。这里的错误通道纪律（print 输出结果、失败信息也走 stdout 但带 FAIL 前缀、退出码承载成败）就是 print 谱系在 CLI 场景的落地，完整范式见第 118 篇《无头脚本与命令行工具》。

## 6. 动手实践

**任务一：四个输出函数的去向实验。** 写一个脚本依次调用 print/printerr/push_warning/push_error，分别在两处观察：a) 编辑器 Output 与 Debugger Errors 面板；b) 命令行运行并重定向（`godot --headless --script res://test_out.gd > out.txt 2> err.txt`），打开两个文件对比内容归属。提示：push_error 会让命令行进程以非零码退出（编辑器错误计数变化），观察这个副作用。

**任务二：assert 的 release 裁剪证明。** 写 `assert(_record_side_effect(), "不应发生")`，其中 _record_side_effect 往文件里写一行标记。分别以调试与导出 release 版本运行，检查标记文件是否生成。提示：release 版标记文件不存在，即证明"表达式未求值"；反过来再证明一次"assert 里放副作用是错的"。

**任务三：给存量代码做一次压警巡检。** 打开编辑器警告面板，挑一条 UNSAFE_METHOD_ACCESS 警告，先判断它是"该修的类型缺失"还是"刻意动态访问"，分别处理：补类型标注消除警告，或 @warning_ignore + 注释压下。提示：判断标准是"能不能写出更准确的类型"——能则修，不能（动态插件接口等）才压。

先自己操作，再对照参考实现：

<details>
<summary>任务二参考实现</summary>

```gdscript
# res://tools/assert_probe.gd
extends SceneTree

const PROBE_PATH := "user://assert_probe.txt"

func _initialize() -> void:
    var result := _risky_operation()
    print("result=", result)
    quit(0)

func _risky_operation() -> int:
    assert(_leave_trace(), "side effect must run in debug builds")
    return 42

func _leave_trace() -> bool:
    var f := FileAccess.open(PROBE_PATH, FileAccess.WRITE)
    if f == null:
        return false
    f.store_line("assert expression evaluated at %s" % Time.get_datetime_string_from_system())
    f.close()
    return true
```

```bash
# 调试构建（编辑器内直接运行即可，或命令行）
godot --path . --script res://tools/assert_probe.gd
# user://assert_probe.txt 里有内容 -> 表达式在调试构建下被求值
```

release 侧的验证边界要诚实：assert 被裁剪是**编译期行为**，导出 release 产物后 `--script` 直跑受限，日常工程里通常不为此专门导出一次。实验的正确读法是——a) 调试构建证明了"表达式会求值"；b) release 裁剪以官方文档语义为准（GDScript 基础文档明确 assert 在 release 模式下被移除）；c) 由 a + b 得出纪律：**assert 只放无副作用的条件表达式**，副作用记录（留痕、上报）永远走显式代码——这条纪律不依赖你有没有亲自导出验证。
</details>

## 7. 小结

- print 走 stdout、printerr 走 stderr，重定向时分流；push_warning/push_error 进 Debugger Errors 面板并计入错误数，运行期异常一律用 push 谱系。
- assert 只在调试构建存在，release 下连表达式都不求值——assert 挡程序员错误（不变量/入口契约），if + push_error 挡玩家与外界输入。
- @warning_ignore 按行压警，优先让编辑器生成注解；每条压警配一句"为什么"注释。
- 断点适合状态复杂的确定性 bug；时序敏感的偶发问题改用条件打印；远程调试与 Profiler 的工作流见 044-godot 的调试篇。

## 参考链接

- [GDScript 基础：assert 与调试（官方文档，CC BY 3.0）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [GDScript 警告系统（官方文档，CC BY 3.0）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_warnings.html)
- speed-rouge 项目素材：scripts/core/save_manager.gd（迁移入口断言）、tools/progen_level.gd（退出码约定）
