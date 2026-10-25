---
order: 80
title: 存档、回退与对话历史
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 使用槽位存档 API 保存恢复完整运行状态，理解上一句回滚的事务机制与 Backlog 点击回退
author: fanquanpp
updated: '2026-10-05'
related:
  - 'konado/060-KonadoAdvancedInstructions'
  - 'konado/070-KonadoDialogueManagerApi'
prerequisites:
  - 'konado/070-KonadoDialogueManagerApi'
---

几何构成（speed-rouge）做剧情测试时暴露了一个真实需求：玩家在 Boss 战前的剧情点选了分支 A，打输重来后剧情必须回到"选 A 之前"，而且玩家看漏了选项前的铺垫想退回去重看。视觉小说玩家对这类功能有近乎执念的期待：随时存档读档，看漏一句话能退回去重看。Konado 把这两件事都做成了默认能力：槽位化的存档系统（Save System）、按句回退的上一句功能，以及可以点击任意历史条目直接跳回去的 Backlog（对话历史）面板。这一篇讲清它们的 API、内部机制与边界规则。

这三块能力共享同一套底层：Konado 的运行时是一个基于可逆事务的虚拟机，快照（Snapshot）与原子执行边界是所有恢复行为的基石。理解了"快照记录了什么、回退能跨越什么"，你就能预判任何边界情况下系统的行为，而不是靠猜。

## 存档系统概览

默认模板的功能栏里已经内置了快速保存、快速读取与存档面板入口，开箱即用。槽位规则很简单：

- 默认提供 20 个存档槽位，编号 0 到 19；
- 槽位 0 是快速存档（Quick Save），功能栏的快速保存与快速读取按钮操作的就是它；
- 其余槽位供常规存档与存档面板（KonadoSavePanel）使用。

如果你要自建存档界面，不必依赖模板面板，直接调用下面这组 API 即可。

## 存档 API 逐个讲

全部存档操作都是 KonadoDialogueManager 上的方法，签名如下：

```gdscript
save_game(id: int) -> bool
load_game(id: int) -> bool
delete_save(id: int) -> bool
get_save_info(id: int) -> Dictionary
get_all_save_info() -> Array[Dictionary]
```

- save_game(id)：把当前运行状态保存到 id 号槽位，成功返回 true；
- load_game(id)：从槽位读取并恢复状态，成功返回 true；
- delete_save(id)：删除指定槽位的存档；
- get_save_info(id)：查询单个槽位的详细信息，返回字典，其中包含 save_time（存档时间）等字段；
- get_all_save_info()：一次列出所有槽位信息，返回字典数组，每项带 exists 字段标记该槽位是否有存档，填充存档面板就靠它。

返回值不是装饰，失败必须处理：

```gdscript
# 保存到 1 号槽位
if dialogue_manager.save_game(1):
    print("存档成功")
else:
    print("存档失败")

# 读取失败时要给玩家明确反馈，而不是假装成功
if not dialogue_manager.load_game(1):
    print("读取失败：该槽位可能没有存档，或存档无法恢复")

# 查询槽位，适合渲染存档列表
var all_info: Array[Dictionary] = dialogue_manager.get_all_save_info()
var single_info: Dictionary = dialogue_manager.get_save_info(1)
```

## 存档内容：一个原子边界内的完整世界

Konado 的存档不是"挑几样东西序列化"，而是在一个原子执行边界中，把当前指令位置、临时变量与持久变量、对话框状态、角色、背景、相机和音频等运行状态一并保存。恢复时同样整体恢复。

这个设计带来两个结论：

- 整体保存、整体恢复，不能选择性关闭某一部分（你无法只存变量不存音频状态）；
- 对使用者反而是福音：不存在"忘了存某个节点状态"这类坑，读档后的世界与存档瞬间完全一致。

读取时的校验同样严格：Konado 会校验存档格式、编译器 ABI（Application Binary Interface，编译产物的二进制接口版本）、剧本指纹和指令标识。只要剧本结构发生了变化、无法准确恢复，加载就会明确失败，绝不会静默地把玩家跳到错误的剧情位置。这对版本更新的意义很大：你的游戏发新版改了剧本，老玩家的旧存档要么正常恢复，要么得到一个明确的失败提示，而不会出现"读档后角色站在错误的分支里"这种最难排查的事故。

## 存档文件：.kns 格式与完整性校验

存档落盘位置为 user://konado_saves/[槽位ID].kns（例如 user://konado_saves/0.kns）。文件是一种二进制封装，头部带有格式版本、数据长度与 SHA-256 完整性校验。

注意两个容易混淆的点：

- 完整性校验可以发现文件损坏（比如拷贝中断、磁盘故障导致的坏档），读取到损坏档会失败而不是恢复出错误状态；
- 但它不是加密、也不是防篡改机制。玩家理论上可以修改存档内容，如果你的游戏有排行榜或防作弊需求，需要另行设计。

## 回退（上一句）：可逆事务回滚

默认模板功能栏提供"上一句"按钮。它的实现不是"倒退播放头"这么粗糙，而是复用虚拟机的可逆事务回滚：每句对话执行前系统保留完整快照，回退时按目标行做精确恢复。

几个关键数字与行为：

- 快照保留最近 128 句，总预算约 4 MiB；
- 执行历史默认保留 512 条指令；
- 回退后的重放在同一帧内完成，玩家不会看到旧画面闪现；
- 如果还原失败，系统进入安全停止（Safe Stop），而不是带着损坏状态继续跑。

对玩家的体验来说就是：点一下"上一句"，画面干净利落地回到那句话之前，仿佛时间精确倒流了一格。

## 回退边界与副作用重放

回退不是无界的，规则在高级指令一篇埋过伏笔，这里给出完整图景：

- 只有 end 指令构成回退边界。回退不能跨越一条已执行过的 end，也就是不能退回已经结束的剧本；
- jump（跨剧本跳转）可以被跨越：玩家从 A 剧本跳到了 B 剧本，回退仍可以跨回去，回退会连同该行所属剧本一起还原；
- signal 与 asyncam 属于可重放副作用：回退跨越它们之后，重新播放时会再次执行（signal 重新发射、异步运镜重新走一遍）；
- 成就指令是回退屏障：可跨越、不重放，成就只增不减。

写剧本时的实践建议：把"一次性通知类"逻辑交给 signal 并保证处理幂等；把"绝对不该撤销"的记录交给成就指令；每个剧本文件结尾用 end 收束，给回退机制一个干净的边界。

## 编程接口：检查点与执行历史

除了功能栏按钮，回退能力也开放为编程接口：

```gdscript
can_rollback(steps := 1) -> bool          # 能否回退指定步数
rollback(steps := 1) -> bool              # 执行回退
create_checkpoint(label := "") -> String  # 手动创建检查点，返回检查点 ID
restore_checkpoint(checkpoint_id: String) -> bool  # 恢复到指定检查点
get_execution_history(limit := 0) -> Array[Dictionary]  # 查询执行历史
clear_execution_history()                 # 清空执行历史
```

create_checkpoint 与 restore_checkpoint 的组合很适合"重大剧情节点"场景：在章节开始处建一个带标签的检查点，玩家在章节里随便折腾，你可以提供一个"回到本章开头"按钮直接恢复检查点，比按句回退更宏观。

另有一组 timeline 便捷接口，封装了最常见的单步回退查询：dialogue_manager.timeline.can_step_back() 判断能否后退、step_back() 后退一步、previous_dialogue_steps() 查询可回退步数。做自定义"上一句"按钮时用它们最顺手。

## Backlog：对话历史与点击回退

Backlog（对话历史，默认面板实例位于 res://addons/konado/templates/default/backlog_panel.tscn）记录着本会话玩家读过的所有内容。它的特性：

- 会话级、存在于内存中、不写入存档——读档不会带回上一个会话的历史；
- 以原子事务为单位记录，一条历史对应一次完整的对话展示；
- 条目上限由 max_dialogue_history_entries 控制，默认 256 条，超出后按策略淘汰（见下文 rollback_policy）。

每条历史条目包含这些字段：kind（条目类型，dialogue 对话、choice 选项、screen_text 全屏文本）、speaker（说话者）、text（文本）、options（choice 时的选项列表）、instruction_id（稳定指令 ID）、shot_path（所属剧本路径）、line（源码行号）、serial（序号）与 pending（是否未提交）。这些字段意味着历史不只是给人看的：你可以基于它做"跳转到任意一句话"的自定义界面。

最实用的交互是：历史面板的每一行都是一个回退入口。玩家点击一条已提交（committed）的历史条目，对话直接回退到那一句——不是"看着像回退"，而是真正走上面讲的快照恢复流程。玩家看漏了选项前的某段铺垫？打开历史，点那一句，剧情从头再给你一遍。

程序侧的对话历史 API：

```gdscript
dialogue_manager.dialogue_history.entries(offset, include_pending)  # 读取条目
dialogue_manager.dialogue_history.size()    # 当前条目数
dialogue_manager.dialogue_history.clear()   # 清空历史
dialogue_manager.entry_committed            # 新条目提交时发射的信号
```

历史满载后的处理策略由 rollback_policy 控制：RollbackPolicy.TRIM（默认，淘汰最旧条目腾出空间）与 RollbackPolicy.KEEP（保留全部，不再裁剪）。如果你的游戏有"回顾整个长章节"的需求，KEEP 配合自定义分页展示是一种做法；默认的 TRIM 则兼顾了内存占用。

最后与老牌引擎对照一句话：Ren'Py 玩家熟悉的"回滚看历史"体验，Konado 默认就提供点击历史行直接回退的等价能力；两者的机制差异，可延伸阅读本站 renpy 模块的相关篇目。

## 坑点与自检

- 存档接口返回值不看，读档失败界面却显示"继续游戏"——save/load 返回 bool，失败必须给玩家明确反馈；
- 升级游戏版本改了剧本，老存档一读就失败——这是设计行为：读取会校验编译器 ABI 与剧本指纹，无法准确恢复就明确失败，绝不静默跳错剧情；
- 以为 .kns 有 SHA-256 校验就是加密——校验只发现损坏，不防篡改；有排行榜或防作弊需求要另行设计；
- 玩家读档后 Backlog 还留着上个会话的历史——Backlog 是会级内存历史，不随存档走，这是约定不是 bug；
- 剧本里没写 end，回退行为变得难以预测——每个剧本文件结尾用 end 收束，它是唯一的回退边界；
- 一次性通知的 signal 在回退重放后又触发了一遍——把处理逻辑写成幂等，或把"绝不该撤销"的记录改用成就指令；
- 自检问题一：存档能只存变量不存音频状态吗？（不能，原子边界内整体保存整体恢复，也因此不存在"忘了存某个节点"的坑）
- 自检问题二：回退能跨过已执行过的 end 吗？（不能，end 是唯一回退边界；jump 可以跨越）
- 自检问题三："回到本章开头"怎么实现最顺手？（章节开始处 create_checkpoint 带标签，按钮里 restore_checkpoint）

## 练习

**任务一：迷你存档列表。** 用存档 API 五件套自建一个迷你存档列表：`get_all_save_info` 渲染 20 个槽位状态，点格子执行 `save_game`/`load_game`，故意读空槽位验证失败分支。提示：每个槽位格子显示"槽号 + 存档时间或空"，`get_save_info` 拿到的字典里 `save_time` 与 `exists` 字段就够用；按钮回调里先判断返回值再刷新 UI。

**任务二：signal 重放实验。** 剧本里发射 signal 让代码弹一条提示，推进两句后按"上一句"回退，观察重放；再把处理改成幂等并验证不再重复。提示：幂等的最简单做法是记录"已处理过的指令 ID"，历史条目的 `instruction_id` 字段就是稳定标识。

**任务三：章节检查点。** 在章节开头建带标签检查点，随意推进几步后恢复它，对比 `create_checkpoint`/`restore_checkpoint` 与按句 `rollback` 的粒度差别。提示：检查点 ID 是字符串返回值，先存到成员变量再恢复。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现（迷你存档列表核心逻辑）</summary>

```gdscript
# MiniSaveList.gd —— 挂在 Control 下；场景里放一个 VBoxContainer
@onready var list_box: VBoxContainer = $VBoxContainer
@onready var dialogue_manager = %DialogueManager  # 按你的实际节点路径取

func _ready() -> void:
    _refresh()

func _refresh() -> void:
    for child in list_box.get_children():
        child.queue_free()
    for slot in 20:
        var info := dialogue_manager.get_save_info(slot)
        var btn := Button.new()
        if info.get("exists", false):
            btn.text = "槽位 %d：%s" % [slot, info.get("save_time", "未知时间")]
        else:
            btn.text = "槽位 %d：空" % slot
        # 左键存档，右键读档； slot 用 bind 捕获
        btn.pressed.connect(_on_save.bind(slot))
        list_box.add_child(btn)

func _on_save(slot: int) -> void:
    if dialogue_manager.save_game(slot):
        print("已保存到槽位 %d" % slot)
    else:
        print("保存失败")   # 演示环境几乎不失败，但分支必须写
    _refresh()

# 读空槽位：手动调用一次看返回值
func _try_load_empty(slot: int) -> void:
    if not dialogue_manager.load_game(slot):
        print("读取失败：槽位 %d 没有存档" % slot)
```

两个实现要点：其一，每次存读后 `_refresh()` 重画列表，让 `exists` 状态与磁盘真实一致；其二，`save_game`/`load_game` 的 bool 返回值在这段代码里都不是装饰——正式项目里它们对应"保存成功"提示与"读档失败"弹窗两种玩家可见反馈。
</details>

<details>
<summary>任务二参考实现（幂等 signal 处理）</summary>

```gdscript
var handled_instruction_ids := {}

func _on_story_signal(payload) -> void:
    var iid: String = payload.get("instruction_id", "")
    if handled_instruction_ids.has(iid):
        return          # 回退重放导致的重复触发，直接忽略
    handled_instruction_ids[iid] = true
    _show_toast("剧情通知：收到 %s" % str(payload))
```

验证路径：不加幂等时，"推进两句 -> 回退 -> 再推进"会弹两次同样的提示；加上按 `instruction_id` 去重后只剩一次。这个模式与 060 篇"signal 是可重放副作用"的结论互为印证——副作用交给外部系统前，先问一句"它被重放会怎样"。
</details>


## 参考链接

- [Konado 官方文档（中文）](https://godothub.com/oss/konado/zh/latest/)
- [Konado 核心概念教程](https://godothub.com/oss/konado/zh/latest/tutorial/core/)
- [Konado 错误码参考](https://godothub.com/oss/konado/zh/latest/tutorial/core/error-codes.html)
- [Konado GitHub 仓库](https://github.com/godothub/konado)
