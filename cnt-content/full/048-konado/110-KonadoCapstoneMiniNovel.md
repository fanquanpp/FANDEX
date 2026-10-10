---
order: 110
title: 综合实战：两章迷你视觉小说
module: 'konado'
category: 游戏开发
difficulty: intermediate
description: 把全模块串成一件作品：资源表与项目骨架、开场演出、选项分支与好感度、signal/waitsignal 剧本代码协作、成就收集、存档回退验收，以及向本地化与定制扩展的接口位。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'konado/070-KonadoDialogueManagerApi'
  - 'konado/090-KonadoSceneAssetsAndCustomization'
  - 'konado/100-KonadoLocalizationAndExtensions'
prerequisites:
  - 'konado/030-KonadoScriptDialogue'
  - 'konado/040-KonadoStageAndCamera'
  - 'konado/050-KonadoVariablesAndBranching'
  - 'konado/060-KonadoAdvancedInstructions'
  - 'konado/080-KonadoSaveAndRollback'
---

## 知识点地图

- 知识类别：Konado 收官实战——把指令、舞台、变量、存档、成就、信号协议组装成一部完整的迷你视觉小说。
- 解决什么问题：零散知识到"能交付一部作品"之间的最后一步：资源规划、两章跨剧本结构、三结局分流与四项功能验收。
- 什么时候用到：学完 010-090 后的毕业项目；为真实作品立项时，本篇的规格清单与验收标准可直接复用。
- 读法建议：第 1-4 节按顺序动手搭，第 5 节验收清单逐项打勾，第 7 节动手实践是独立变体训练。

## 0. 一句话理解

> 前面九篇各讲一块积木，本篇把它们拼成一间房子：一个两章、三结局、带成就与存档的迷你视觉小说。写完它，你就走完了"用 Konado 做一部作品"的完整闭环。

## 前置知识

- [KonadoScript 基础](/konado/030-KonadoScriptDialogue)与[舞台与运镜](/konado/040-KonadoStageAndCamera)：对话行与演出指令是本篇的"字"和"词"。
- [变量、选项与分支](/konado/050-KonadoVariablesAndBranching)：第二幕的分支结构直接复用那篇的好感度模型。
- [进阶指令](/konado/060-KonadoAdvancedInstructions)与[存档与回退](/konado/080-KonadoSaveAndRollback)：screentext、signal、achievement 与回退语义决定本篇验收标准。

## 学习目标

1. 能从零规划一个迷你视觉小说的资源表（角色、背景、音乐、音效、语音五张清单）与文件结构。
2. 能写出跨剧本的两章结构：第一章结尾 `jump` 进第二章，回退可以跨越 `jump` 回到上一章。
3. 能用 signal/waitsignal 实现"剧本暂停、代码演出、剧本继续"的协作回合。
4. 能用 achievement 指令做三结局收集，并说清"回退跨越成就指令不重放"如何保证成就只增不减。
5. 能按验收清单完成存档、读档、回退、成就四项功能测试。

## 1. 作品规格与项目骨架

我们要做《雨夜便利店》：一场雨夜便利店的相遇，两个章节，三个结局（两个好结局按好感度分流、一个坏结局由关键选项直接进入）。规格刻意做小——所有教学点各出现一次即可，写作本身不抢戏。

先列资源表。五张清单都挂在对话管理器的导出属性上（070 篇的资源表分组），剧本里只写标识符：

| 清单 | 标识符（剧本用） | 内容 |
| --- | --- | --- |
| character_list | kona、yuki | Kona 用官方示例立绘，yuki 用色块角色（见 090 篇任务一的做法） |
| background_list | rain_street、store_inside、store_night | 三张静图（或纯色背景场景） |
| background_music_list | rainy_theme、calm_theme | 两段循环 BGM |
| sound_effect_list | thunder、door_bell、stomp | 三个音效 |
| voice_list | （可空） | 迷你作品可以先不配音，协议位留好 |

文件结构约定如下，剧本全部 UTF-8：

```text
res://
  stories/
    chapter1.ks        # 第一章：开场演出 -> 门口相遇
    chapter2.ks        # 第二章：店内对话 -> 选项分流 -> 三结局
  ui/
    my_dialogue_box/   # 可选：自定义对话框副本（090 篇）
  story_layer.tscn     # 挂 dialogue_runtime.tscn 模板与你的管理器绑定
```

骨架先行的好处：标识符与文件名定下来后，编剧（可能就是几周后的你）只面对 `.ks` 文本，不碰任何场景。

## 2. 第一章：开场演出与跨剧本跳转

第一章只负责"氛围 + 相遇"，用齐 screentext、背景切换、运镜与异步震屏：

```konado
screentext {
    "第一章 雨夜"
    "晚上十一点，城市被雨泡着。"
}

background rain_street fade
play bgm rainy_theme

kona "便利店就在前面。信号灯坏掉的第三天，我总在这条路上遇到点什么。"

signal 播放音效 thunder
waitsignal thunder_done

background store_inside fade
play sfx door_bell
kona "门上的铃铛响了一声。"

actor show yuki normal at 2
actor show kona normal at 4

yuki "欢迎光临……啊，是昨晚那位。"

cam move closeup ease_in_out 1.5
kona "你记得我？"
cam reset linear

yuki "店长让我留意常客。热咖啡要吗？外面冷。"

jump res://stories/chapter2.ks
```

逐段看教学点：

1. `screentext` 块给出章节标题与时间地点交代，比对话框更有"翻页感"（060 篇）。
2. `signal 播放音效 thunder` 发事件给代码，紧接 `waitsignal thunder_done` 暂停剧本——代码侧播完雷声后调 `emit_wait_signal("thunder_done")`，剧本才继续（完整代码见第 4 节）。这就是"剧本讲什么、程序做什么"的分工。
3. `cam move closeup ease_in_out 1.5` 推近镜头突出台词，`cam reset linear` 收回；运镜是同步的，`asyncam shake` 才是异步的（040 篇）。
4. 结尾 `jump` 进第二章。回退可以跨越 `jump`：玩家在第二章点"上一句"能一路退回第一章（080 篇的回退边界只有 `end`）。

## 3. 第二章：选项、好感度与三结局

第二章是全作的结构核心：一个选项组定好感度走向，一个关键选项直接进坏结局，最后按数值分流两个好结局。

```konado
set %favor 0
set $topic ""

background store_night fade
play bgm calm_theme

yuki "说起来，你每晚这个时候出门，是在做什么？"

choice "老实说在散步" -> walk_talk
choice "编个理由" -> make_excuse
choice "反问她为什么好奇" -> ask_back

branch walk_talk
    set $topic "散步"
    add %favor 2
    kona "就是走路。雨天的城市和白天不是同一座。"
    yuki "这句我记下了。"
    jump_branch after_talk

branch make_excuse
    set $topic "秘密任务"
    add %favor 0
    kona "在执行秘密任务。"
    yuki "哦——那我替保密局给你结账。"
    jump_branch after_talk

branch ask_back
    set $topic "好奇的店员"
    sub %favor 1
    kona "先回答的是你。"
    yuki "小气。"
    jump_branch after_talk

branch after_talk
    yuki "时间不早了。明天……还会来吗？"

    choice "买下她手边的伞" -> buy_umbrella
    choice "直接回家" -> go_home

branch buy_umbrella
    add %favor 1
    if %favor >= 3:
        actor motion yuki jump 0.5
        yuki "太好了！那我提前下班陪你走一段。"
    else:
        yuki "路上小心。伞明天记得还我。"
    endif
    kona "伞我买下了。明天见。"
    achievement unlock "good_ending_umbrella"
    end

branch go_home
    if %favor >= 2:
        kona "明天见。带上你的好心情。"
        achievement unlock "good_ending_words"
    else:
        screentext {
            "坏结局 渐行渐远"
            "那晚之后，你再也没有走进那家便利店。"
        }
        achievement unlock "bad_ending_alone"
    endif
    end
```

结构拆解：

1. `%favor` 持久变量随存档保存——玩家在第二章任意位置存档读档，好感度都恢复到存档时刻（050 篇的任务验过这件事）。
2. 三个选项分支各自 `jump_branch after_talk` 汇合，避免收尾台词写三遍；`$topic` 临时变量记录话题，仅供本镜头插值使用。
3. 第二个选项组是"关键抉择"：`buy_umbrella` 必达好结局，`go_home` 则由好感度决定第二个好结局或坏结局——两条结局通道演示了"选项分流"与"数值分流"的搭配。
4. 每个结局分支以 `achievement unlock` 收尾、以 `end` 终止。`end` 是回退边界：结局不可回退；而成就指令是回退屏障——可跨越、不重放，玩家反复回退刷结局也不会重复解锁（060 篇）。

## 4. 剧本与代码的握手：signal 协议

第一章的雷声是"剧本点菜、代码做菜"的样板。新建一个挂在 story_layer 下的监听脚本：

```gdscript
# story_bridge.gd
extends Node

@onready var dialogue_manager: KonadoDialogueManager = %DialogueManager

func _ready() -> void:
    dialogue_manager.custom_signal.connect(_on_custom_signal)

func _on_custom_signal(content: String) -> void:
    var parts := content.split(" ", false, 2)
    if parts.size() < 2:
        return
    match parts[0]:
        "播放音效":
            _play_thunder(parts[1])

func _play_thunder(sfx_id: String) -> void:
    # 这里走 audio_controller 或你自己的 AudioStreamPlayer 播放自定义雷声
    await get_tree().create_timer(1.2).timeout   # 假装雷声播放了 1.2 秒
    dialogue_manager.emit_wait_signal("thunder_done")
```

三个要点：

1. `custom_signal(content)` 传的是剧本原文，约定"动作名 + 空格 + 参数"的协议（060 篇官方示例同款模式），编剧就能在剧本里自由触发程序行为。
2. `emit_wait_signal("thunder_done")` 的参数必须与 `waitsignal` 的名字完全一致，漏发一次剧本就永久卡住——联调时把"等待超时警告"当第一嫌疑。
3. 回退跨越 signal 会重新发射：如果这个协协议里做了"真实付费、写成就库"之类不可重放的事，要按 080 篇练习二的模式做幂等（按指令 ID 去重）。

## 5. 验收清单：四项功能测试

作品写完不算完，按这份清单过一遍（对应 080 篇的机制）：

1. **存档**：在第二章选项前快速存档（槽位 0），选一个分支推进两句，读档——好感度与画面应精确回到存档时刻。
2. **回退**：从结局回退，确认能跨越 `jump` 退回第一章、退不过 `end`；成就不会因回退而消失或重复弹出。
3. **Backlog**：打开对话历史点击一条已提交条目，确认真正回退到那一句。
4. **坏结局路径**：故意两次选择降低好感度的选项，确认进入坏结局 screentext 并解锁 `bad_ending_alone`。

测试时打开控制台：`enable_overlay_log` 与 `runtime_failed` 信号（070 篇）会把剧本运行时错误直接报出来，`waitsignal` 卡住、标识符写错这类问题当场现形。

## 6. 扩展接口位：本地化与定制从哪里接入

迷你作品完成后，两个自然的升级方向各有一个明确的接入位，不需要重构：

- **本地化**：把 chapter1.ks、chapter2.ks 注册进剧情本地化结构，一套结构多种说法（100 篇）。剧本里的标识符（kona、rain_street）不动，只有台词进翻译表——这也是当初坚持"剧本只写标识符"的回报。
- **界面定制**：把默认对话框复制到 `res://ui/my_dialogue_box/` 改造后赋回 `dialogue_box`（090 篇）。注意 CanvasLayer 不要占用 120 及以上图层。
- **表现升级**：把 yuki 的色块场景换成 Live2D 或 Spine 场景，剧本一行不用改——状态协议 `_apply_status` 接住一切。

## 7. 动手实践

**任务一：加一个隐藏结局。** 给第二章增加第四个选项"什么都不说"，分支里不加好感度，但如果玩家两个选项组都选了"沉默系"路线（自己定义判定，比如引入 %silent 计数变量），进入一个 `achievement unlock "hidden_ending_silence"` 的隐藏结局。提示：复用 `if %favor >= N:` 的判定语法；隐藏结局用 screentext 呈现最有氛围。

**任务二：给开场加"跳过已读"的检查点。** 在第一章 `jump` 进第二章之前用 `create_checkpoint("before_chapter2")` 建检查点（代码侧调用，见 080 篇的编程接口），做一个"回到第二章开头"按钮调用 `restore_checkpoint`。提示：检查点 ID 是返回的字符串，存到成员变量里再用。

**任务三：把 signal 协议扩一条指令。** 在协议里加"设置好感 favor N"，让剧本可以直接 `signal 设置好感 favor 1` 修改变量，代码侧通过 `dialogue_manager.variable_store` 落库。提示：variable_store 的取用方式见 050 篇的 GDScript 初始化示例；想清楚这条指令与剧本自带 `add %favor 1` 的分工——协议适合"需要程序复核的修改"。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现（隐藏结局分支）</summary>

```konado
# 开头追加：set %silent 0

choice "老实说在散步" -> walk_talk
choice "编个理由" -> make_excuse
choice "反问她为什么好奇" -> ask_back
choice "什么都不说" -> keep_quiet

branch keep_quiet
    add %silent 1
    kona "……"
    yuki "你的沉默比雨声还响。"
    jump_branch after_talk

# go_home 改为"判定 + 汇流"，if 不嵌套：顺序判断、jump_branch 进各自的结局分支
branch go_home
    if %silent >= 1:
        jump_branch ending_hidden
    endif
    if %favor >= 2:
        jump_branch ending_words
    endif
    jump_branch ending_bad

branch ending_hidden
    screentext {
        "隐藏结局 无言的默契"
        "你们谁都没有说话，但伞往你这边偏了一整夜。"
    }
    achievement unlock "hidden_ending_silence"
    end

branch ending_words
    kona "明天见。带上你的好心情。"
    achievement unlock "good_ending_words"
    end

branch ending_bad
    screentext {
        "坏结局 渐行渐远"
        "那晚之后，你再也没有走进那家便利店。"
    }
    achievement unlock "bad_ending_alone"
    end
```

要点有三：其一，KonadoScript 的条件只有 if/else 且不支持嵌套，多结局判定用"顺序 if + jump_branch 进结局分支"表达 elif 语义；其二，每个结局分支独立、以 `end` 收束，回退边界干净；其三，`%silent` 与 `%favor` 一样是持久变量，存档回退都安全——"沉默但高好感"与"沉默且低好感"现在各得其所，结局判定的顺序本身就是设计。
</details>

<details>
<summary>任务二参考实现（检查点按钮）</summary>

```gdscript
# chapter_checkpoints.gd —— 挂在 story_layer 下
extends Node

@onready var dialogue_manager: KonadoDialogueManager = %DialogueManager
var checkpoint_id := ""

func make_checkpoint() -> void:
    checkpoint_id = dialogue_manager.create_checkpoint("before_chapter2")
    print("检查点已建：", checkpoint_id)

func _on_back_to_chapter2_pressed() -> void:
    if checkpoint_id.is_empty():
        print("还没有检查点")
        return
    if not dialogue_manager.restore_checkpoint(checkpoint_id):
        print("恢复失败：检查点可能已失效")
```

验证：推进到第二章任意位置后点按钮，剧情应精确回到建检查点的那一行（第一章结尾、`jump` 之前）。与按句回退的区别在于粒度——检查点是"宏观锚点"，适合章节回溯；按钮在检查点未建时应给出提示而不是静默无效。
</details>

## 8. 坑点与自检

- 两个剧本文件结尾都忘写 `end`——回退边界缺失，结局后的行为不可预测；每个 .ks 都以 `end` 收束；
- `waitsignal thunder_done` 写了但代码侧漏调 `emit_wait_signal`——剧本永久暂停，联调时先查这一对是否成对出现；
- 选项分支名写了空格或中文标点——点击无反应，分支名区分大小写且不能含空格与特殊符号；
- 在结局分支里用 `$topic` 之类的临时变量做"周目继承"——临时变量不随存档保存，跨章节数据一律用 `%` 持久变量；
- 隐藏结局判定放在坏结局之后——被坏结局截胡，结局判定按"越特殊越靠前"排序；
- 自检问题一：玩家从第二章结局按住"上一句"能退回第一章吗？（能，jump 可跨越；但退不过已执行的 end）
- 自检问题二：三结局的成就会因为反复回退刷而重复解锁吗？（不会，成就指令是回退屏障：可跨越、不重放）
- 自检问题三：想让第二章支持英文，从哪里接入？（剧情本地化结构，剧本标识符不动，台词进翻译表，见 100 篇）

## 9. 下一步

- 给作品接入设置系统、成就面板与 C# 适配：本地化与扩展（100 篇）；
- 把 yuki 换成 Live2D 场景角色：场景化资源与界面定制（090 篇）；
- 剧本加密与导出保护：进阶指令（060 篇）；
- 动作与剧情共存的完整工程实例：https://github.com/fanquanpp/geometric-construct

## 参考链接

- [Konado 官方文档站主页](https://godothub.com/oss/konado/zh/latest/)
- [Konado GitHub 仓库（sample/demo 内含可参照的完整示例）](https://github.com/godothub/konado)
- [错误码参考](https://godothub.com/oss/konado/zh/latest/tutorial/core/error-codes.html)
