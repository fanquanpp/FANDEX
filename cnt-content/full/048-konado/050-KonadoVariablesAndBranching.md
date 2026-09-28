---
order: 50
title: 变量、选项与分支
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 用持久与临时变量驱动剧情状态，用 choice branch 与 if 写出多分支互动叙事
author: fanquanpp
updated: '2026-09-22'
related:
  - 'konado/040-KonadoStageAndCamera'
  - 'konado/070-KonadoDialogueManagerApi'
prerequisites:
  - 'konado/040-KonadoStageAndCamera'
---

Konado 不只服务纯视觉小说。动作游戏几何构成（speed-rouge）就是一个实例：它在 Godot 4.7 项目里启用了 konado 插件，用 story_layer 场景承载剧情演出，并配置了剧情本地化的自动加载节点——打斗与对话在同一个引擎里共存。这类"带剧情的动作游戏"对剧情系统的要求恰恰最高：玩家点了不同选项，剧情要有不同走向；读档之后，之前的选择要原样恢复。走向的背后是数值与条件。Konado 用两套互相配合的机制解决这件事：变量系统（持久变量与临时变量）负责记住状态，choice、branch 与 if 负责根据状态分流。本篇用一段"好感度送礼"剧本把它们全部串起来。

## 两类变量：持久与临时

- 持久变量以 % 开头：跨镜头保留，随存档一起保存，玩家读档后恢复的是存档时的值。可以在检查器中预设，也可以用代码初始化。
- 临时变量以 $ 开头：只在当前镜头（KonadoShot）内有效，不保存，需要在剧本内用 set 初始化。适合"这一场戏里的临时状态"，比如本场景的访客编号、当前拿出的道具。

选择原则很简单：读档之后希望它还在的，用 %；只关心当前镜头的，用 $。动作游戏嵌剧情时这个区分尤其重要——剧情内的好感度、章节标记用 %，某场戏的演出辅助状态用 $。

## 五种操作与两种语法形态

变量更新只有五种操作：set（赋值）、add（加）、sub（减）、mul（乘）、div（除）。每种操作支持两种语法形态，效果相同：

```text
<操作> <变量名> <值>
<操作> <变量名> = <值>
```

也就是说下面两行完全等价：

```konado
set %favor 0
set %favor = 0
```

div 要特别小心：除数为零时报错并跳过该操作，剧情不会中断，但变量的值也不会变。做比例、百分比计算时先确认分母不为零。

值支持四种类型：整数、浮点数、布尔（true/false，条件判断中等价于 1/0）、双引号字符串。

## 插值：把变量写进台词

对话文本与带引号署名中可以直接写 %var 或 $var，运行时替换为实际值：

```konado
set %favor 3
mio "现在的好感度是 %favor 点。"
```

玩家看到的就是"现在的好感度是 3 点。"。

## 动手：用 GDScript 初始化变量仓库

持久变量也可以在代码侧初始化。官方推荐的做法是在对话管理器的 variable_store 为空时创建并预置：

```gdscript
func _ready() -> void:
    if dialogue_manager.variable_store == null:
        var store = KonadoVariableStore.new()
        store.set_value("love", 0)
        store.set_value("player_name", "")
        store.set_value("unlocked", false)
        dialogue_manager.variable_store = store
```

逐行看：

- 先判断 variable_store 是否为空，避免覆盖检查器里已经预设好的仓库。
- KonadoVariableStore.new() 创建一个新的变量仓库。
- set_value 预置三个持久变量：整数 love、字符串 player_name、布尔 unlocked，三种值类型各演示一个。
- 赋回 dialogue_manager.variable_store，剧本与代码从此共享同一份变量。

KonadoVariableStore 还有两个顺手的成员：Operation 枚举（SET/ADD/SUB/MUL/DIV）配合 apply_operation()，让你在 GDScript 侧执行与剧本一致的五种运算；get_bool() 把变量值转成布尔值，方便代码侧做逻辑判断。动作游戏里"通关后解锁剧情回忆"这类跨系统状态，就是代码与剧本共享同一份仓库的典型场景。

## 动手：选项、分支与条件

### 选项：choice

选项的语法：

```text
choice "选项内容" -> 分支名称
```

多条相邻的 choice 行会合并为一个选项组，同时展示给玩家：

```konado
choice "送出亲手做的书签" -> gift_bookmark
choice "送出限量版徽章" -> gift_badge
choice "老实说忘带了" -> gift_nothing
```

三条硬规则：

- 分支名称区分大小写，不能包含空格和特殊符号。
- 选项内容必须用英文双引号包裹。
- -> 分隔符不可省略。

### 分支：branch

分支是带标签的缩进块：

```text
branch [标签ID]
    [脚本内容]
```

规则：

- 由标签和缩进包裹的内容就是标签内容；没有跳到该标签时，里面的内容完全不播放。所以你可以把所有分支平铺写在一起，只激活被选中的那条。
- 分支不可嵌套：branch 里面不能再放 branch。
- 缩进层级必须与对话行保持一致，否则解析失败。

### 条件分支：if/else/endif

```konado
if %favor >= 2:
    mio "今天真是最棒的生日！"
else:
    mio "下次可不许再让我失望了。"
endif
```

要点：

- 六个比较运算符：==、!=、>、<、>=、<=。
- else: 可以省略，只写 if 与 endif 也是合法的。
- 条件判断不支持嵌套。
- 参与比较的变量未初始化时，视为条件不成立。
- if 可以写在 branch 块内部，两者配合使用。

### 跳转：jump_branch 与 jump

- jump_branch 分支名：跳到当前剧本中的另一个分支，例如 jump_branch after_choice，常用于多条支线汇合到同一段收尾。
- jump res://路径：跳到另一个剧本文件，例如 jump res://sample/demo/demo_02.ks，实现跨剧本的章节切换。在指令注册表中，它们分别对应 jump.branch 与 jump.script 两个操作码。

## 综合实战：好感度送礼场景

把全部知识点串起来：三选一的选项、三条支线各自改变好感度、if 判断走不同对话、最后汇合收尾。

```konado
set %favor = 0
set $gift ""

background park fade
play bgm gentle_theme

actor show mio normal at 2

mio "今天是我的生日哦，你准备了什么礼物？"

choice "送出亲手做的书签" -> gift_bookmark
choice "送出限量版徽章" -> gift_badge
choice "老实说忘带了" -> gift_nothing

branch gift_bookmark
    set $gift "书签"
    add %favor 2
    "旁白" "她小心地接过书签，眼睛亮了起来。"
    mio "这是你亲手做的？我很喜欢。"
    jump_branch after_choice

branch gift_badge
    set $gift "徽章"
    add %favor 1
    "旁白" "她捧着徽章看了很久。"
    mio "居然是限定款……你会舍得吗？"
    jump_branch after_choice

branch gift_nothing
    sub %favor 1
    "旁白" "她的表情明显垮了下来。"
    mio "哼，那你欠我一个礼物。"
    jump_branch after_choice

branch after_choice
    if %favor >= 2:
        mio "今天真是最棒的生日！"
        actor motion mio jump 0.6
    else:
        mio "下次可不许再让我失望了。"
    endif
    "旁白" "礼物是 $gift，好感度现在是 %favor。"
end
```

结构拆解：

- 开场用两种语法形态初始化持久变量 %favor 与临时变量 $gift（空字符串也是合法值）。
- 三条相邻 choice 组成一个选项组，分别指向三个分支标签。
- 每条支线用 set/add/sub 修改变量后，jump_branch 汇合到 after_choice，避免三条支线各写一遍结尾。
- after_choice 内用 if/else 依据好感度走不同台词，else 的缩进与 if 对齐；好感大于等于 2 时还追加了一个 actor motion 庆祝动作。
- 最后一句同时插值临时变量 $gift 与持久变量 %favor，end 终止剧本。

把这段保存为 UTF-8 的 .ks 文件放进项目播放：选"书签"与选"忘带了"各跑一遍，再在选项前存档、选完后读档，验证 %favor 恢复到了存档时的值——这一步就是在验证"% 持久变量随存档保存"。

## 坑点与自检

- 用 $ 临时变量记录"玩家选了什么礼物"，跨镜头后消失——该用 %。判断口诀：读档后要还在，用 %；
- choice 分支名写了空格或中文标点，选项点了没反应——分支名区分大小写且不能含空格与特殊符号；
- branch 块缩进与对话行不一致，解析报错——块内所有行的缩进层级必须统一；
- if 里比较了一个从未初始化的变量，条件永远不成立——初始化要么写进剧本开头，要么走上面的 GDScript 预置；
- div 的分母可能是零（比如按人数平均），剧情表面正常但数值没变——除法前先确认分母；
- 自检问题：想让"第二周目继承第一周目的好感度"，用 % 还是 $？用 %——它随存档保存且跨镜头保留；做继承还要在开局剧本里判断并迁移，属于变量系统的进阶用法。

## 练习

1. 给送礼场景加第四个选项"把钱花在刀刃上"，分支里 mul %favor 0 后汇合；运行验证好感度归零台词正确。
2. 用 GDScript 预置一个 %opened_chapters 布尔变量，剧本里用 if 判断它在首次进入时显示"新章节"提示——需要思考布尔在条件中的等价值。
3. 把三条支线各自重复的"汇合提示"抽成单独分支 after_choice，并故意在一条支线里忘写 jump_branch，观察分支"平铺但不激活就不播放"的特性如何让错误暴露（或被掩盖）。

## 下一步

- 剧本里没写完的演出（立绘、运镜、音频指令）：舞台与运镜（040 篇）与进阶指令（060 篇）；
- 对话管理器 API 与代码侧联动：DialogueManager API（070 篇）；
- % 变量随存档保存的底层机制：存档与回退（080 篇）；
- 动作与剧情共存的完整实例：https://github.com/fanquanpp/geometric-construct

## 参考链接

- [Konado 官方文档站主页](https://godothub.com/oss/konado/zh/latest/)
- [Konado GitHub 仓库（sample/demo 内含变量与选项分支示例剧本）](https://github.com/godothub/konado)
- [错误码参考](https://godothub.com/oss/konado/zh/latest/tutorial/core/error-codes.html)
