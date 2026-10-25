---
order: 90
title: NVL 模式呈现
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 多行同屏的小说式呈现：nvl clear 翻页、NVL 菜单、nvl_narrator 与窗口管理
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Ren'Py 的第二种对话呈现范式——NVL（Novel）模式。
- **解决什么问题**：ADV 模式一行台词一个窗口，讲不了一段完整的信件与序章独白；NVL 模式把多行文字像小说一样堆在同屏，用"页"而不是"行"组织叙事节奏。
- **什么时候用到**：小说式开篇序章、长信件整屏呈现、序章尾声用 NVL 制造段落感、章节回混排（序章 NVL、正文 ADV）。
- **前置知识**：文本插值与标签（见 [文本：插值、标签与 Monologue](/renpy/060-TextInterpolationAndTags)）；本篇与它互补——那篇管一行怎么说，这篇管多行怎么摆。

## 学习目标

- 会用 kind=nvl 把角色切换到 NVL 呈现，会用 nvl clear 翻页；
- 会配置 nvl_narrator 让旁白也走 NVL；
- 会启用 NVL 菜单（全局 define menu = nvl_menu 与单菜单 menu (nvl=True) 两种写法）；
- 会用 nvl show / nvl hide 管理窗口显隐，理解 NVL 与存档回滚、Monologue 的配合。

## NVL 与 ADV：两种呈现范式

到目前为止的对白都是 ADV 模式（ADV mode）：一次显示一行，窗口贴在屏幕底部。NVL 模式（NVL mode，Novel 模式）则是多行同屏、占满全屏的窗口，文字像小说一样一段段堆叠，直到你主动清屏。

两种范式没有优劣，只有适用场景：ADV 的逐行节奏适合对话推拉与演出配合；NVL 的整屏篇幅适合大段独白、书信、开场字幕，以及"读一本书"的氛围。

## 启用 NVL：kind=nvl 与 nvl clear

启用只需两步：给角色加 kind=nvl；在每页末尾用 nvl clear 清屏。官方示例完整照录：

```renpy
define s = Character('Sylvie', kind=nvl, color="#c8ffc8")
define m = Character('Me', kind=nvl, color="#c8c8ff")
define narrator = nvl_narrator

label start:
    "I'll ask her..."
    m "Um... will you..."
    m "Will you be my artist for a visual novel?"
    nvl clear
    "Silence."
    "She is shocked, and then..."
    s "Sure, but what is a \"visual novel?\""
    nvl clear
```

逐行解释这段示例里每个部件为什么这样写：

- define s = Character(..., kind=nvl)：kind=nvl 是 Character 的"模板切换"——它让这个角色的台词全部通过 NVL 窗口呈现，等价于在每次 say 后不立即消失、而是追加进当前页。换成 kind=adv 则回到默认行为；
- define narrator = nvl_narrator：narrator 是旁白（无名字的 say）使用的默认角色。nvl_narrator 是引擎预定义的 NVL 版旁白，这一行让"I'll ask her..."这类无说话者的叙述也进入 NVL 页，否则旁白会走 ADV 窗口、页面被劈成两半；
- nvl clear：结束当前页。没有它，台词会无限堆叠直到溢出屏幕。它的语义是"这一页讲完了，下一行从新页开始"，写在剧本里就是一次翻页。

场景一：小说式开篇序章。整段没有立绘与交互的序章独白用 NVL 呈现，配合 060 篇的 Monologue 模式，一个三引号字符串就是一整页，代码量最小、演出最接近小说：

```renpy
define nvln = nvl_narrator

label prologue:
    nvln """
    那年夏天，蝉声比记忆里更响。

    我们约好在废弃的车站见面——她说，会带一把红色的伞。
    """
    nvl clear
```

## NVL 菜单

选项菜单也可以走 NVL。两种写法：

全局生效——把默认 menu 替换为 NVL 菜单版：

```renpy
define menu = nvl_menu
```

单菜单生效——只让某一个菜单走 NVL：

```renpy
menu (nvl=True):
    "要继续吗？"
    "继续":
        pass
    "结束":
        return
```

全局写法适合"整本书都是 NVL"的项目；单菜单写法适合混排项目——正文 ADV，只有章节结尾的选择走 NVL 页，让选项出现在叙述文字的正下方，阅读动线不被打断。

场景二：长信件整屏呈现。信件正文用 NVL 旁白逐段堆叠，最后跟一个 NVL 菜单给"回信方式"的选择，选项紧贴信件末尾，整页浑然一体：

```renpy
label letter:
    nvln "亲爱的哥哥：展信安。"
    nvln "家里的猫又胖了一圈，母亲说再喂下去要买两只碗了。"
    nvln "……所以，今年冬天你到底回不回来？"
    menu (nvl=True):
        "怎么回信？"
        "『我尽力赶回来。'":
            $ answer = "home"
        "『大概回不去。'":
            $ answer = "stay"
    nvl clear
```

## 窗口管理：nvl show 与 nvl hide

window show 与 window hide 控制 ADV 窗口的显示隐藏（见 060 篇 Character 进阶一节），NVL 有自己的专用对：nvl show 与 nvl hide。典型用法是在序章开始前先摆出空窗口、结束后收掉，让玩家看到"一页从空白被填满"的过程：

```renpy
nvl show
nvln "第一段……"
nvln "第二段……"
nvl clear
nvl hide
```

nvl show 可以带转场参数（如 nvl show dissolve）让窗口以指定转场出现。注意 nvl clear 只翻页不清窗口——想让窗口整个消失要用 nvl hide，两者经常成对出现在章节边界。

小技巧：把 {clear} 标签单独写成一行，等价于 nvl clear，适合在 Monologue 三引号块的段落之间直接插一个翻页点。

## NVL 与回滚、存档

NVL 页面由多条 say 组成，每条都是回滚（rollback）的一个节点——玩家连续回滚时会看到文字一行行从页面上消失，翻过 nvl clear 时整页一起退回，行为符合直觉，无需额外处理。

存档方面有一个值得知道的细节：NVL 的"当前页状态"（本页已显示的行）作为对话历史的一部分被保存与恢复，读档后页面完整还原。但要注意：如果你在运行期用 init python 之外的动态内容拼接 NVL 台词（例如 [playername] 插值），恢复的是插值后的最终文本——玩家改名不会改写历史页里的旧台词，这与 ADV 历史的行为一致。

场景三：NVL 章节回与 ADV 章节回混排。一个章节用 NVL 做开场字幕与结尾总结、中间正文走 ADV，是这个引擎里最经典的节奏控制手法：

```renpy
label chapter_two:
    nvl show dissolve
    nvln "第二章：伞"
    nvln "雨下了整整一周。"
    nvl clear
    window auto
    e "（ADV 正文，正常对话演出）"
    "……"
    nvl show
    nvln "本章完。下一章，伞会在雨停之前出现。"
    menu (nvl=True):
        "是否存档？"
        "存档":
            call screen save
    nvl clear
    nvl hide dissolve
```

结构上 NVL 负责"叙述容器"，ADV 负责"现场演出"，章节的边界感由 nvl show/hide 加转场制造。

## 动手实践

**任务一：把 ADV 序章改写成 NVL（约 15 分钟）**

拿任何一个有 6 行以上连续旁白的剧本（没有就现写），把旁白改成 NVL 呈现：旁白走 nvl_narrator，每 3 行翻一次页，结尾收窗口加转场。

提示：只改两处——define narrator = nvl_narrator 一行，以及在合适位置插入 nvl clear。参考骨架：

```renpy
define narrator = nvl_narrator
define adv_narrator = Character(kind=adv)

label prologue:
    nvl show dissolve
    narrator "第一段。"
    narrator "第二段。"
    narrator "第三段。"
    nvl clear
    narrator "第四段。"
    nvl hide dissolve
```

**任务二：信件与 NVL 菜单（约 20 分钟）**

写一封 5 段以上的信，信末用一个 NVL 菜单给三个回信选项，选项文字各对应一个 flag。验收点：选项必须出现在信件文字的同一页上（用的是 menu (nvl=True)），翻页后才进入正文。

提示：菜单的 caption 之外，每个选项的显示文字写在菜单分支里。参考片段：

```renpy
menu (nvl=True):
    "如何落笔？"
    "写一封长信":
        $ reply = "long"
    "只回一个字":
        $ reply = "short"
    "把信纸折起来":
        $ reply = "fold"
```

**任务三：章节混排骨架（约 20 分钟）**

搭一个可复用的章节骨架：章节头 NVL（标题加两行引言）、正文 ADV、章节尾 NVL（总结加一个 NVL 菜单），把它复制三遍接成一个三章的迷你结构。

提示：把章节头封装成 label，用 call chapter_header("第二章", "……") 传参复用，尾部的 nvl hide 转场保持一致，三章的手感才统一。参考骨架：

```renpy
label chapter_header(title, quote):
    nvl show dissolve
    nvln "[title]"
    nvln "[quote]"
    nvl clear
    return

label chapter_tail(text):
    nvl show
    nvln "[text]"
    menu (nvl=True):
        "继续下一章？"
        "继续":
            pass
    nvl clear
    nvl hide dissolve
    return
```

## 小结

- NVL 模式多行同屏、按"页"组织叙事；Character 加 kind=nvl 启用，页末 nvl clear 翻页，{clear} 标签单独一行等价于它。
- define narrator = nvl_narrator 让旁白进入 NVL 页；define menu = nvl_menu 全局启用 NVL 菜单，menu (nvl=True): 只对单个菜单生效。
- nvl show / nvl hide 管窗口显隐（可带转场），nvl clear 只翻页不清窗口，章节边界两者成对使用。
- NVL 的每行 say 都是回滚节点，当前页状态随存档恢复；Monologue 与 NVL 完全兼容，长段独白加多行同屏正是绝配。
- 混排是标准节奏手法：章节头尾用 NVL 制造叙述容器感，正文 ADV 负责现场演出。

## 参考链接

- [NVL 模式（NVL Mode）](https://www.renpy.org/doc/html/nvl_mode.html)
- [文本（Text）](https://www.renpy.org/doc/html/text.html)
- [对白与角色（Dialogue and Characters）](https://www.renpy.org/doc/html/dialogue.html)
- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
