---
order: 60
title: 高级指令：全屏文本信号与成就
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 掌握 screentext 全屏叙事 signal waitsignal 与 Godot 侧联动以及成就指令与 end 的回退语义
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'konado/050-KonadoVariablesAndBranching'
  - 'konado/080-KonadoSaveAndRollback'
prerequisites:
  - 'konado/050-KonadoVariablesAndBranching'

在上一篇里，你已经能用变量、条件分支与选项让剧情"动"起来了。但一款成熟的视觉小说还需要更多舞台手段：章节标题的全屏字幕、把剧情事件抛给 GDScript 处理的信号、等待外部动画播完的阻塞指令，以及把玩家行为记录成成就（Achievement）的系统。本篇就把这些"进阶指令"一次讲透，并补上一块容易被忽视的内容：剧本导出时的加密保护。

这一组指令有一个共同的背景主题：回退（Rollback）。Konado 允许玩家退回上一句对话重新阅读（详见存档与回退一篇），那么当玩家回退跨越了 signal、achievement 这类"副作用指令"时会发生什么？本篇会逐一给出答案。理解这些语义，能帮你避免"成就被反复触发""音效重复播放"这类隐蔽 bug。

## 学习目标

- 会用 screentext 制作全屏居中的章节标题与叙事文本；
- 理解 signal 指令与 custom_signal 信号的联动方式，以及它"可重放"的回退语义；
- 会用 waitsignal 暂停对话，等待外部 GDScript 通过 emit_wait_signal 恢复播放；
- 理解 end 指令的终止语义，以及它作为回退边界的含义；
- 会使用 achievement unlock、increment、set_flag 三条成就指令，并理解"成就只增不减"的回退屏障设计；
- 了解剧本导出加密的机制、密钥存放位置与补丁热更新的约束。

## screentext：全屏叙事文本

当你需要展示章节标题、时间地点交代、大段旁白独白时，普通对话框显得太小、太吵。screentext 指令提供一种块形式的语法，把多行文本以 NVL（Novel-style，覆盖式全屏文本）的方式呈现在屏幕中央：

```konado
screentext {
    "第三章 雨夜独行"
    "她离开后的第七天，城市下起了入秋以来最大的一场雨。"
}
```

它的交互流程是：

- 覆盖层以全屏形式居中展示文本；
- 文本逐行淡入，每行末尾带一个闪烁的三角指示器，提示玩家"还有下一行"；
- 玩家点击后展示下一行；
- 最后一行被确认后，覆盖层整体淡出，对话流程继续向下执行。

使用建议：章节标题、序章字幕、回忆片段的引言都很适合 screentext。它比一句句普通对话更有"翻页"的仪式感，也比频繁切换背景更省事。

顺带回顾一句与它互补的指令：对话框的显示与隐藏由 showtextbox 与 hidetextbox 负责（带可选的 duration 淡入淡出时长，hidetextbox 完成后还会清除角色名与文本），这部分语法细节在对话框指令一篇已经讲过，本篇不再重复。

## signal：把剧情事件交给 GDScript

剧本语言擅长讲故事，但不擅长"做事"——播放一段自定义音效、给玩家加金币、触发一个过场动画，这些都属于程序逻辑。signal 指令就是剧本与程序之间的桥：

```konado
signal 好感度上升
signal 播放音效 thunder
signal 设置金币 100
```

signal 后面可以跟任意文本内容。剧本执行到这一行时，KonadoDialogueManager 会发射它的 custom_signal(content) 信号，content 就是你在剧本里写的原文。外部 GDScript 连接这个信号即可处理：

```gdscript
extends Control

@export var dialogue_manager: KonadoDialogueManager

func _ready() -> void:
    if dialogue_manager:
        dialogue_manager.custom_signal.connect(_on_konado_dialogue_manager_play_sfx)

func _on_konado_dialogue_manager_play_sfx(content: String) -> void:
    if content == "播放音效 thunder":
        # 在这里接入你自己的音效播放逻辑
        print("收到剧本信号：", content)
```

约定一个简单的内容协议（比如"动作名 + 空格 + 参数"）就能让编剧在剧本里自由触发程序行为，而不必学习任何 GDScript。这也是官方示例 demo.gd 采用的模式：剧本 signal，代码侧连接 custom_signal 播放音效。

### signal 的回退语义：可重放的一次性副作用

signal 是一种"可重放"的一次性副作用（Side Effect）。具体规则是：

- 玩家回退时可以跨越 signal 指令所在的位置；
- 重放到该位置时，signal 会重新发射一次，custom_signal 会被再次调用。

由此推出一条重要的实践准则：如果你的处理函数只修改"快照内"的状态（比如 KonadoVariableStore 里的变量、界面显示等会随存档与回退一起被记录的状态），那么回退加重放之后，结果与不曾回退完全一致；但如果处理函数修改的是"快照外"的状态（写文件、请求网络、调用第三方平台的接口），重复发射就会造成重复写入，你必须自己保证处理逻辑幂等（Idempotent，即重复执行结果不变），例如先检查再写入。

## waitsignal：暂停等待外部事件

signal 是"剧本通知程序"，waitsignal 则反过来，是"剧本等待程序"。它的语法是：

```konado
waitsignal lightning_done
```

执行到这一行，对话流程暂停，直到外部代码调用 KonadoDialogueManager 的 emit_wait_signal 方法并传入同名信号名才继续：

```gdscript
func _play_storm_animation() -> void:
    # 播放一段过场动画，播完后恢复对话
    animation_player.play("storm")
    await animation_player.animation_finished
    dialogue_manager.emit_wait_signal("storm_done")
```

signal_name 既可以是字符串字面量（如上），也可以是标识符。典型用途包括：

- 等一段过场动画播完再继续剧情；
- 等一个小游戏（比如 QTE、拼图）结束后再回到对话；
- 等一个异步加载或网络请求完成。

设计剧本时，把 waitsignal 与 signal 配对使用，就能实现"剧本暂停、交给程序演出、演出完毕、剧本继续"的完整回合制协作。

## end：终止指令与回退边界

end 是对话的终止指令，有两条铁律：

- 它会立即终结当前对话流程，位于它之后的所有内容都不会执行；
- 推荐把它写在对话结尾与 branch 分支的收尾处，让每个分支都有明确的"终点"。

```konado
branch bad_ending
    kona "也许我们不会再见了。"
    achievement unlock "bad_ending_reached"
    end
```

除了收尾，end 还有一个容易忽略的身份：回退边界（Rollback Boundary）。Konado 的回退机制不能跨越一条已经执行过的 end——已结束的剧本对回退来说是"过去的一章"，玩家无法通过"上一句"按钮退回上一个剧本文件里去。这保证了一个剧本播放完毕、进入下一个剧本后，回退行为不会把剧情搅乱。更系统的回退语义（快照、边界、副作用重放）会在存档与回退一篇完整展开。

## 成就指令：跨过它，但不会重放它

Konado 内置了三条成就指令，直接在剧本里解锁或推进成就进度：

```konado
achievement unlock "first_blood"
achievement increment "explorer" 1
achievement set_flag "secret_ending_found" true
```

- achievement unlock：解锁一个成就；
- achievement increment：把某个计数型成就的进度加一个数值；
- achievement set_flag：设置某个标志位的值（标志型成就条件）。

这三条指令在回退体系里被特殊对待：它们是回退屏障（Rollback Barrier）。回退可以跨越成就指令，但跨越之后重新播放时，成就指令不会再次执行。换句话说，成就只增不减、只解锁不撤销——玩家解锁过"初次见面"，回退到见面之前再重新走一遍，也不会重复解锁或消失。这个设计符合玩家对成就系统的直觉：成就是对"曾经达成"的记录，而不是随剧情摇摆的状态变量。

成就指令的接收端是 KonadoAchievements 扩展组件（含 JSON 配置、条件类型、弹窗与面板层级），它的配置方法与 API 在本地化与扩展组件一篇专门讲解。

## 剧本导出保护：加密你的剧情数据

视觉小说的核心资产就是剧本。Konado 在导出环节提供了剧情数据加密：

- 在 Godot 的导出预设（Export Preset）中找到 Konado 分类，设置 Script Encryption Key；
- 导出时，编译后的剧情数据会被自动加密，防止通用工具直接从 PCK 包里读到明文剧本；
- 如果密钥为空或格式错误，Konado 会随机生成一个 256 位密钥，并把实际使用的密钥保存在 .godot/konado_export_credentials.cfg 中；
- 后续发布补丁或热更新时，必须使用与主包相同的导出预设与相同密钥，否则客户端无法解密新剧情。

两点务实提醒：其一，这套机制防的是"通用工具直读 PCK 明文"这种低成本窥探，不能替代专业的 DRM（数字版权管理）方案，商业项目若有强保护需求仍需另行评估；其二，务必把密钥文件与导出配置纳入你的发布流程管理，密钥一旦丢失，旧补丁与新包之间的兼容就断了。

## 综合示例：一段完整的雨夜过场

把本篇所有指令串起来，看一段"章节标题、触发音效、等待演出、解锁成就"的完整剧本：

```konado
screentext {
    "第二章 雨夜"
    "她推开了那扇门。"
}

actor show kona normal at 2
background night_street fade
signal 播放音效 thunder
play bgm rainy_theme

kona "这么晚了你还在这里。"
waitsignal storm_done
kona "刚才那道闪电，照亮了你的表情。"

branch ask_name
    kona "我还不知道你的名字。"
    choice "告诉她名字" -> tell_name
    choice "保持沉默" -> keep_silent
end

branch tell_name
    achievement unlock "first_meeting"
    kona "我叫可娜多，请多指教。"
end

branch keep_silent
    signal 好感度变化 1
    kona "（她没有勉强你。）"
end
```

配套的 GDScript 侧只需要两件事：连接 custom_signal 处理"播放音效"与"好感度变化"，并在雷暴动画结束时调用 emit_wait_signal("storm_done")。一个十几行的剧本，就完成了叙事、演出协作与成就记录的闭环。

## 小结

- screentext 以块语法制作 NVL 式全屏文本：逐行淡入、点击翻行、末行确认后淡出继续，适合章节标题与大段旁白；
- signal 把任意文本内容发射给 GDScript 的 custom_signal，是可重放的副作用，回退跨越后重放会再次发射，快照外状态需自行保证幂等；
- waitsignal 暂停对话等待外部触发，由 emit_wait_signal(信号名) 恢复，适合等待动画与小游戏；
- end 立即终结当前对话流程，是回退边界，回退不能跨越已结束的剧本；
- achievement unlock / increment / set_flag 三条成就指令是回退屏障：可跨越、不重放、只增不减；
- 导出时通过预设的 Script Encryption Key 自动加密剧情数据，密钥落在 .godot/konado_export_credentials.cfg，补丁热更新必须同预设同密钥，它不替代专业 DRM。

## 参考链接

- [Konado 官方文档（中文）](https://godothub.com/oss/konado/zh/latest/)
- [KonadoScript 剧本教程](https://godothub.com/oss/konado/zh/latest/tutorial/script/)
- [Konado 核心概念教程](https://godothub.com/oss/konado/zh/latest/tutorial/core/)
- [Konado GitHub 仓库](https://github.com/godothub/konado)
