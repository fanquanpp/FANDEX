---
order: 160
title: 对话历史与回看界面
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 用 _history_list 构建对话回看：HistoryEntry 字段（who/what/when）、自定义 history screen 滚动界面、挂入游戏菜单，附回看漏读、分支回顾与译文核对三例
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：对话历史（Dialogue History）——Ren'Py 自动记录的已读对话列表，以及围绕它搭建的回看（backlog）界面。
- **解决什么问题**：玩家手滑点了快进、漏看了一段关键对话；想回看"当时选了什么"；本地化团队要在游戏内核对译文。这些都不需要你手动记录每一句话——引擎已经替你存好了，缺的只是一个像样的界面。
- **什么时候用到**：几乎每个正式项目都需要：默认模板自带基础 history 屏，但空历史的占位、长文本换行、入口按钮三件事经常没做好，玩家点进去就是一片空白。
- **边界声明**：回滚（滚轮退回重选）与回看（只读浏览）是两回事，前者见 [存档、读档与回滚](/renpy/100-SaveLoadAndRollback)；本篇的历史列表只读不可交互回跳。

## 学习目标

- 知道 `_history_list` 里存的是什么：HistoryEntry 条目的 who/what/when 字段；
- 会用 vpgrid 搭一个可滚动、带空历史占位、长文本正确换行的 history screen；
- 会把历史入口挂进游戏菜单（ShowMenu），并理解它是特殊屏幕名；
- 知道历史不入存档、有长度上限这两条机制边界，以及它们对玩法设计的含义。

## _history_list：引擎替你记的账本

Ren'Py 在每条 say 语句显示时，自动把条目追加进 `_history_list` 变量。它是一个列表，每个元素是一个 HistoryEntry 对象，常用字段三个：

| 字段 | 含义 | 注意点 |
| --- | --- | --- |
| `who` | 说话人的**显示名**（如"绫音"），旁白为 None | 是显示名不是变量名；旁白判断要用 `entry.who is not None` |
| `what` | 本句话的文本（插值已展开） | 已经是最终字符串，界面里直接显示，不需要再做插值 |
| `when` | 本句显示时的时间戳 | 想做"几点几分读到的"就用它格式化；多数项目用不上 |

```renpy
label inspect_history:
    python:
        renpy.notify("已记录 {} 条对话".format(len(_history_list)))
        for entry in _history_list[-3:]:
            if entry.who is not None:
                renpy.log("{}: {}".format(entry.who, entry.what))
```

两条机制边界必须先讲清：

1. **历史不入存档**。`_history_list` 不在存档保护范围内——读档之后，历史列表从读档时刻重新积累，之前的对话不会"补录"。这是刻意的设计（存档体积与隐私），但对玩法有影响：依赖"回看全部历史"的解谜玩法，要自己把关键信息写进会保存的变量；
2. **有长度上限**。`config.history_length` 控制保留条数（默认 250）。超出后最早的条目被丢弃，所以"开局第一章的对话"在游戏后期大概率已经不在列表里。上限调大会多吃内存，按项目篇幅给一个够用值即可。

```renpy
define config.history_length = 500
```

config 类变量只能在 init 阶段设置（config 体系的完整纪律见 [config 配置变量与玩家偏好](/renpy/117-ConfigVariablesAndPreferences)）。

## 自定义 history screen：滚动回看界面

用 vpgrid（或 vbox 包 viewport）搭一个最基础的回看屏：

```renpy
screen history():
    tag menu                       # 进入本屏时关掉同层的其他菜单屏
    predict False                  # 历史内容无需预加载，省一点性能

    use game_menu(_("历史")):

        if not _history_list:
            # 空历史占位：读档刚开局、上限内还没有对话时必现
            text _("还没有可以回看的对话。") align (0.5, 0.5)

        else:
            vpgrid:
                cols 1
                yfill True
                scrollbar "vertical"
                mousewheel True
                draggable True
                arrowkeys True

                for entry in _history_list:
                    hbox:
                        spacing 12
                        if entry.who is not None:
                            text entry.who:
                                min_width 120
                                text_align 1.0
                                color "#9a6fb0"
                        text entry.what:
                            xsize 780          # 限宽，长句自动换行
```

逐段拆解：

- `tag menu` 让历史屏在游戏菜单层与其他菜单互斥——不写它，从"存档"切到"历史"时两个屏会叠在一起；
- 空历史分支不是可有可无：玩家新开游戏直接点历史、或读了一个刚开局的档，`_history_list` 就是空列表，没有占位文本的界面只剩一个滚动框，像坏了；
- `vpgrid` 一列 + 纵向滚动条 + `mousewheel`/`draggable`/`arrowkeys` 三个输入开关，滚轮、拖拽、方向键三种浏览方式一步到位（vpgrid 与滚动的细节见 [屏幕语言与界面](/renpy/080-ScreensAndScreenLanguage)）；
- 说话人名 `min_width` + `text_align 1.0` 让名字列右对齐成一条整齐的"作者栏"，对话文本再限 `xsize` 换行——**长文本换行是历史界面的头号排版问题**：不加 xsize，一句话长就会把整个 viewport 撑出横向滚动。

顺带处理一个细节：`what` 的文本可能包含文本标签残留（如果某句话用了未闭合标签，界面上会显示异常）。生成侧保证标签正确（060 篇的文本标签规范）比在回看侧补救更可靠。

## 挂入游戏菜单

`history` 是 Ren'Py 的特殊屏幕名之一（与 main_menu、save、load 等并列），默认模板 screens.rpy 已经提供了上文风格的实现。要做的只有两件事：确认入口按钮存在、必要时替换实现。

```renpy
screen navigation():
    vbox:
        # ...其他按钮...
        textbutton _("历史") action ShowMenu("history")
```

`ShowMenu("history")` 打开游戏菜单并定位到历史屏（ShowMenu 的协议见 [屏幕动作与交互](/renpy/085-ScreenActionsAndInteraction)）。默认模板的 navigation 屏通常已带这个按钮——如果你的项目删过它，补回来就是一行。

键盘玩家还有一条隐藏通道：**滚动回看**。游戏进行中按 Ctrl 滚轮/向上翻页可以快速回看最近对话（config 配置的 keysym），它与 history 屏互补：翻页键看"刚刚那三句"，菜单进屏看"全部能看的"。

## 三个工程场景

### 场景一：玩家回看漏掉的对话

最朴素的用法：快进（skip）狂奔之后想核对一句台词。历史屏已经解决。给体验加分的一步是**从历史定位到相关章节**——把 save_name（章节名）写进历史附近，或直接在 history 屏顶部显示"当前读到：第二章 星见祭"：

```renpy
screen history():
    use game_menu(_("历史")):
        text "当前读到：[save_name]" xalign 1.0 textsize 18 color "#888888"
        # ...滚动区...
```

save_name 随存档保存（见 100 篇），让它同时出现在回看界面，玩家就知道"这段历史属于哪个进度"。

### 场景二：分支选项回顾

`_history_list` 只记 say 语句，**menu 的选择不在其中**。想做"我当初选了哪条线"的回顾，要在选择发生时自己记账：

```renpy
default chosen_log = []

label festival_choice:
    menu:
        "和绫音去祭典":
            $ chosen_log.append(("星见祭", "绫音线"))
            jump ayane_festival
        "一个人去看烟花":
            $ chosen_log.append(("星见祭", "独路线"))
            jump solo_fireworks
```

```renpy
screen branch_review():
    use game_menu(_("选择回顾")):
        vbox:
            spacing 8
            for chapter, branch in chosen_log:
                hbox:
                    text "[chapter]" min_width 200 color "#9a6fb0"
                    text branch
```

`chosen_log` 用 default 声明，进存档、可回滚——与不入档的历史列表形成互补：**日常对话交给引擎，关键选择自己存档**。这也是设计层面最常见的一个误判来源：把"回看"需求寄托在 `_history_list` 上，读档后才发现它是空的。

### 场景三：翻译项目的译文核对

本地化阶段，译者需要在"游戏实际显示效果"里核对译文断行与变量插值。历史屏天然是译文陈列馆：一遍流程跑完，全部译文按出场顺序躺在滚动区里。两个实用微调：

```renpy
# 核对模式下显示说话人变量名而不是显示名，方便对照翻译稿
screen history_qa():
    use game_menu(_("译文核对")):
        vpgrid:
            cols 1
            scrollbar "vertical"
            mousewheel True
            for entry in _history_list:
                hbox:
                    spacing 12
                    text (entry.who if entry.who else "旁白"):
                        min_width 160
                        color "#cc4444"
                    text entry.what xsize 760
```

给 QA 流程做一个"核对专用屏"（显示名换成醒目颜色、加宽说话人列），配合 `config.developer = True` 的开发构建使用，比让译者滚动普通历史屏效率高得多。

## 易错点清单

1. **以为历史随存档保存**：读档后历史从零积累。要跨存档保留的信息（关键选择、解锁记录）写进 default 变量；
2. **界面不处理空历史**：新档点开历史是空白滚动框。`if not _history_list` 给占位文本；
3. **长文本不换行**：`what` 不限 xsize，长句撑出横向滚动。限宽是历史屏排版第一课；
4. **把 menu 选择当历史条目找**：历史只记 say。选择回顾自己用 default 列表记；
5. **忘记 tag menu**：历史屏与存档屏叠层互不关闭；
6. **调大 config.history_length 不设上限**：长文本项目把上限开到几万条，内存与滚动性能双双劣化。按"最长章节的对话数 x 2"估一个值。

## 动手实践

**任务一：带时间戳的历史屏。** 在 history 屏的每个条目角落用 `when` 字段显示"游戏内第 N 分钟读到的"。提示：`when` 是 Unix 时间戳，游戏内相对时间要先减去第一条的 `when` 再换算分钟；记得处理 `_history_list` 为空时不做减法。

**任务二：选择回顾并入菜单。** 实现场景二的 `chosen_log` 与 branch_review 屏，并在 navigation 里加"选择回顾"按钮，与历史按钮并排。提示：两个屏都要 `tag menu`；default 列表在 label 里 append 前先确认变量已初始化。

**任务三：快进感知的 QA 屏。** 做一个 history_qa 变体：每条目额外显示该句是否曾以快进方式播放（提示：`config.skip_indicator` 帮不上忙，正确做法是在 `_history_list` 条目之外，用 `preferences.skip` 当下状态自建记录——把任务范围收窄为"给 QA 屏加一个'当前快进状态'的顶部指示"，体会哪类信息历史列表根本不提供）。

先自己写，再对照参考实现（任务一）：

<details>
<summary>任务一参考实现（带相对时间的历史屏）</summary>

```renpy
init python:
    def format_game_minute(entry, base_when):
        # 游戏内相对分钟：以本次会话第一条历史为原点
        if base_when is None:
            return ""
        minutes = int((entry.when - base_when) / 60)
        return "第 {} 分钟".format(minutes)

screen history_timed():
    tag menu
    use game_menu(_("历史")):
        if not _history_list:
            text _("还没有可以回看的对话。") align (0.5, 0.5)
        else:
            $ base_when = _history_list[0].when
            vpgrid:
                cols 1
                yfill True
                scrollbar "vertical"
                mousewheel True
                for entry in _history_list:
                    hbox:
                        spacing 12
                        if entry.who is not None:
                            text entry.who min_width 120 color "#9a6fb0"
                        text entry.what xsize 700
                        text format_game_minute(entry, base_when):
                            xsize 120
                            color "#888888"
                            textsize 16
```

对照要点：时间原点取 `_history_list[0].when` 而不是"游戏启动时刻"——历史是滑动窗口，最早的条目会滚出列表，用列表首条做原点能让显示始终自洽（虽然分钟数是"相对窗口"的）；`format_game_minute` 放 init python 里定义成函数，screen 里只调用——屏内塞大段 python 是 080 篇讲过的反模式；空历史分支照例保留，`base_when` 的取值也放在非空分支内，避免空列表取下标报错。
</details>

## 小结

- `_history_list` 自动记录 say 对话，条目字段 who（旁白为 None）/what/when；
- 历史不入存档、受 `config.history_length` 限制——关键信息要自己 default 记；
- history screen 要处理三件事：空历史占位、长文本限宽换行、`tag menu` 菜单互斥；
- 入口用 `ShowMenu("history")` 挂进 navigation；进行中的快速回看走翻页键；
- menu 选择不在历史里，选择回顾用 default 列表自己记。

## 参考与致谢

- 本篇的 API 口径对照 Ren'Py 官方文档 Reading Dialogue History 章节重写：https://www.renpy.org/doc/html/history.html （Ren'Py 文档为 CC BY-NC-ND 4.0 许可，本篇内容全部重新表述，代码示例为本仓库自己的实现）
