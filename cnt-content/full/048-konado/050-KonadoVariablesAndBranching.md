---
order: 50
title: 变量、选项与分支
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 用持久与临时变量驱动剧情状态，用 choice branch 与 if 写出多分支互动叙事
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'konado/040-KonadoStageAndCamera'
  - 'konado/070-KonadoDialogueManagerApi'
prerequisites:
  - 'konado/040-KonadoStageAndCamera'

互动叙事的门槛在"选择"：玩家点了不同选项，剧情要有不同走向，而走向的背后是数值与条件。Konado 用两套互相配合的机制解决这件事：变量系统（持久变量与临时变量）负责记住状态，choice、branch 与 if 负责根据状态分流。本篇讲完变量与三种分流写法，最后用一段完整的"好感度送礼"剧本收尾。

## 学习目标

- 区分持久变量（%）与临时变量（$）的生命周期与保存行为。
- 会用 set、add、sub、mul、div 五种操作更新变量，了解两种语法形态与除零行为。
- 理解变量值的四种类型与对话文本中的插值。
- 会用 GDScript 初始化变量仓库。
- 会写 choice 选项组与 branch 分支块，记住命名规范与缩进规则。
- 会写 if/else/endif 条件分支，记住六个运算符与三条限制。
- 会用 jump_branch 与 jump 完成跨分支、跨剧本跳转。

## 两类变量：持久与临时

- 持久变量以 % 开头：跨镜头保留，随存档一起保存，玩家读档后恢复的是存档时的值。可以在检查器中预设，也可以用代码初始化。
- 临时变量以 $ 开头：只在当前镜头（KonadoShot）内有效，不保存，需要在剧本内用 set 初始化。适合"这一场戏里的临时状态"，比如本场景的访客编号、当前拿出的道具。

选择原则很简单：读档之后希望它还在的，用 %；只关心当前镜头的，用 $。

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

玩家看到的就是"现在的好感度是 3 点。"。上一篇署名示例中的"访客 $guest_index"用的正是同一机制。

## 用 GDScript 初始化变量仓库

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

KonadoVariableStore 还有两个顺手的成员：Operation 枚举（SET/ADD/SUB/MUL/DIV）配合 apply_operation()，让你在 GDScript 侧执行与剧本一致的五种运算；get_bool() 把变量值转成布尔值，方便代码侧做逻辑判断。

## 选项：choice

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

## 分支：branch

分支是带标签的缩进块：

```konado
branch [标签ID]
    [脚本内容]
```

规则：

- 由标签和缩进包裹的内容就是标签内容；没有跳到该标签时，里面的内容完全不播放。所以你可以把所有分支平铺写在一起，只激活被选中的那条。
- 分支不可嵌套：branch 里面不能再放 branch。
- 缩进层级必须与对话行保持一致，否则解析失败。

## 条件分支：if/else/endif

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

## 跳转：jump_branch 与 jump

- jump_branch 分支名：跳到当前剧本中的另一个分支，例如 jump_branch after_choice，常用于多条支线汇合到同一段收尾。
- jump res://路径：跳到另一个剧本文件，例如 jump res://sample/demo/demo_02.ks，实现跨剧本的章节切换。在指令注册表中，它们分别对应 jump.branch 与 jump.script 两个操作码。

## 综合示例：好感度送礼场景

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

## 变量与存档的关系

最后提前打个招呼：% 持久变量会随存档一起保存，$ 临时变量不会——这意味着你用 % 设计的分支状态天然是可读档恢复的。存档文件的位置、20 个槽位、格式与完整性校验、加载失败时的明确报错，会在本模块后续的存档篇（080）中详细展开。

## 小结

Konado 的变量分两类：% 持久变量跨镜头保留并随存档保存，$ 临时变量只在当前镜头内有效且不保存。set/add/sub/mul/div 五种操作各有"直接写值"与"等号写法"两种等价形式，除数为零时报错并跳过；值支持整数、浮点、布尔（条件中等价 1/0）与双引号字符串，并可在对话文本与署名中插值。分流三件套：相邻 choice 行组成选项组（分支名区分大小写、不含空格特殊符号，选项内容必须英文双引号，-> 不可省略）；branch 标签加缩进块（未跳到不播放、不可嵌套、缩进层级必须与对话一致）；if/else/endif 条件（六个运算符、不支持嵌套、未初始化变量视为条件不成立、可写在 branch 内）。jump_branch 汇合分支，jump 跨剧本。互动叙事的固定套路由此成型：选项改变变量，分支消耗变量，条件决定台词。

## 参考链接

- [Konado 官方文档站主页](https://godothub.com/oss/konado/zh/latest/)
- [Konado GitHub 仓库（sample/demo 内含变量与选项分支示例剧本）](https://github.com/godothub/konado)
- [错误码参考](https://godothub.com/oss/konado/zh/latest/tutorial/core/error-codes.html)
