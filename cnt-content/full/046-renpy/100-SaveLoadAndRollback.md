---
order: 100
title: 存档、读档与回滚
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 理解 Ren'Py 自动保存什么不保存什么，用 File 动作搭建存档界面并掌握 persistent 跨会话数据
author: fanquanpp
updated: '2026-09-22'
related:
  - 'renpy/050-VariablesPythonAndStores'
  - 'renpy/080-ScreensAndScreenLanguage'
prerequisites:
  - 'renpy/050-VariablesPythonAndStores'
---

存档（save）、读档（load）与回滚（rollback）是视觉小说玩家最习以为常的功能：随时退出、随时回来、随时反悔。Ren'Py 把这三件事做成了引擎内建能力，你几乎不用写任何代码就能获得完整支持。但"几乎不用写"不等于"完全不用懂"：如果不清楚引擎到底保存了什么、没保存什么，一旦用到对象、循环或跨会话数据，就很容易出现"读档后变量回到旧值""回滚后数据错乱"这类难以排查的问题。

本篇系统讲解 Ren'Py 的状态保存机制：自动保存与不保存的内容、保存发生的时机、基于 pickle 的类型限制、存档文件的内部结构，然后用 screen 的 File 系列 action 搭一个存档界面，最后介绍回滚与 persistent（持久化）两个进阶主题。

## 学习目标

- 准确说出引擎自动保存的内部状态与 Python 状态，理解经典示例中为什么只保存 b 和 c；
- 掌握四类不会被保存的内容及其背后的设计原因；
- 知道保存发生在什么时机，为什么官方建议用 while 语句而不是 Python 块内循环；
- 能区分可保存与不可保存的 Python 类型，避开文件句柄等常见陷阱；
- 了解存档文件结构与 JSON 元数据字段；
- 会用 FilePage、FileAction 等动作在 screen 中搭建存档与读档界面；
- 理解回滚如何工作，哪些数据天然不可回滚；
- 会用 persistent 保存画廊解锁等跨会话数据。

## 引擎自动保存了什么

Ren'Py 的存档并不是"把几个变量写进文件"，它保存的是整个游戏状态，分为两大块。

第一块是内部状态（internal state），包括：

- 当前语句，以及所有可以返回的语句（也就是完整的调用栈）；
- 当前显示中的图像与 displayable；
- 正在显示的 screen 及其局部变量；
- 正在播放的音乐；
- NVL 模式下的文本块列表。

第二块是 Python 状态：游戏开始之后发生变化的 store 变量，以及这些变量可达（引用得到）的对象。这里有一条非常重要的规则：只有变量本身被重新赋值才算"变化"，修改对象内部的字段并不会让引擎记录这个变化——字段变化不触发保存。

官方文档的经典示例：

```renpy
define a = 1
define o = object()
default c = 17

label start:
    $ b = 1
    $ o.value = 42
```

这个例子存档时只保存 b 和 c：

- a 由 define 定义、视为常量，而且开局之后没有变化，因此不保存；
- b 在游戏开始后被赋值，属于"有变化的变量"，保存；
- c 由 default 定义，default 变量总是参与保存，保存；
- o 这个变量本身从头到尾没有被重新赋值——变的只是它指向对象的字段。字段变化不会触发保存，所以 o 不保存，o.value 读档后也不会恢复。

这条规则解释了"我明明改了数据、读档后却回到旧值"的绝大多数疑难杂症：如果你往一个开局后从未重新赋值的对象里写数据，那些数据不在存档的保护范围内。

## 哪些内容不会被保存

与上一节相对，有四类内容明确不在存档范围内。

第一，游戏开始后没有变化的 Python 变量。没变就不存，这是存档体积小的原因之一。

第二，控制流路径（control flow path）。存档只记录"当前执行到哪条语句、返回点在哪"，而不记录你走过的完整路线。读档后，之前已经执行过的赋值语句不会重新执行；反过来，如果你在新版本脚本里新加了赋值语句，旧存档读档后也不会把它"补执行"一遍。

第三，图像名到 displayable 的映射。image 语句的登记结果不进存档。读档后，图像名按当前脚本的定义重新解析——这意味着你更新游戏、替换了图片文件之后，旧存档读出来会显示新图片，而不是当初的老图片。

第四，config 变量、样式（style）以及样式属性。它们只在 init 阶段设置，开局之后不要修改：改了不会保存，行为也难以预期。

## 保存发生在什么时机

保存发生在"最外层交互 context 中的语句开始时"。换句话说，每当一条会产生交互的语句（say、menu、pause 等）即将开始，引擎就有机会写入存档。

要特别小心 python: 块的边界。如果一个 python 块内部包含多轮交互，玩家恰好在交互中途存档，那么读档后会回到整个 python 块的起点重新执行，块内已经发生的副作用会再来一遍。官方的建议很直接：需要循环时使用 Ren'Py 自己的 while 语句，而不是在 python 块里写循环：

```renpy
$ count = 10
while count > 0:
    "T-minus [count]."
    $ count -= 1
"Liftoff!"
```

while 的每一轮循环体都是独立的脚本语句，交互点落在语句之间，存档与读档都能精确回到正确的轮次。顺带一提，Ren'Py 脚本语言本身没有 for、continue 与 break，while 是官方推荐的循环写法。

## 可保存与不可保存的类型

Ren'Py 的存档建立在 Python 的 pickle 序列化机制之上，类型支持直接受 pickle 约束。

可以保存的：

- 基本类型（数字、字符串、布尔值等）；
- list、tuple、set、dict；
- 创作者自定义的对象、类与函数；
- Character、Displayable、Transform、Transition 等 Ren'Py 对象。

不能保存的：

- Render 对象；
- 迭代器（iterator）与生成器（generator）；
- 协程 task/future（async/await 相关对象）；
- 文件对象；
- 网络 socket；
- 内部函数与 lambda。

最常见的坑是文件操作。打开中的文件对象不可保存，所以涉及读写文件的代码应该放进 python hide: 块（块内临时变量不参与保存），或者用 with open(...) as f: 保证文件用完即关：

```renpy
python hide:
    with open("log.txt", "a") as f:
        f.write("happened\n")
```

## 存档文件的内部结构

一个存档文件（例如第 1 页第 1 格的 1-1.save）本质上是一个压缩档案，里面装着两样东西：序列化后的游戏状态，以及一份 JSON 元数据。元数据包含这些字段：

- _save_name：存档名；
- _renpy_version：保存时的 Ren'Py 版本；
- _version：游戏自身配置的版本号；
- _game_runtime：游戏内经过的时间；
- _screenshot：存档截图。

脚本里的 save_name 变量会随存档一起保存，可以把它当作"章节名"使用：进入新章节时给 save_name 赋值，存档界面就能显示玩家当前读到哪一章。

调试时还有一类特殊存档：从 8.4.0 起，游戏发生未处理异常时，Ren'Py 会自动把当前状态存入 _tracesave-1 到 _tracesave-10 槽位（Traceback Saves，异常存档），方便你或玩家把"出 bug 那一刻"的状态保存下来用于复现。

## 用 File 动作搭建存档界面

在 screen 里搭建存档与读档界面，主要靠一组高层动作（action）：

- FilePage(i)：切换到第 i 页；传 "auto" 则是自动存档页；
- FilePageNext() / FilePagePrevious()：向后、向前翻页；
- FileAction(i)：作用于第 i 格——在 save 屏中执行保存，在 load 屏中执行读取；
- FileScreenshot(i)：显示第 i 格的截图，empty 参数指定空格占位图；
- FileTime(i, empty=...)：显示第 i 格的保存时间；
- FileSaveName(i)：显示第 i 格保存的 save_name；
- FileTakeScreenshot()：立即截取一张截图，例如在打开存档屏之前刷新预览。

把这些拼起来，就是一个最小可用的存档格网格：

```renpy
screen file_slots():

    grid 2 5:
        for i in range(10):
            button:
                action FileAction(i)
                vbox:
                    add FileScreenshot(i)
                    text FileTime(i, empty=_("Empty Slot."))
                    text FileSaveName(i)
```

再配上一排翻页按钮（FilePagePrevious、FilePageNext 与 FilePage("auto")），就是完整的存档页了。项目里 screens.rpy 的默认 save/load 屏正是用这套动作搭出来的，读一遍它的源码是最好的参考。

## 低层存档函数速查

不想通过 action、而是想直接在代码里操作存档时，renpy 模块提供了这些函数：

- renpy.save(filename, extra_info='')：把当前游戏状态保存到指定存档；
- renpy.load(filename)：读取存档并恢复执行（该调用不会正常返回）；
- renpy.can_load(filename)：判断某个存档是否存在且可读；
- renpy.list_slots()：列出当前页面已使用的存档槽位；
- renpy.newest_slot()：返回最新的存档槽位名，没有存档时返回 None；
- renpy.unlink_save(filename)：删除指定存档；
- renpy.copy_save(src, dst)：把一个存档复制到另一个槽位；
- renpy.slot_json(filename)：返回指定存档的 JSON 元数据字典；
- renpy.take_screenshot()：截取当前画面，作为下一次保存时的截图。

这些函数与上面的 action 大多一一对应，理解了 action 的语义，函数的用途也就一目了然。

## 回滚：玩家可以反悔的历史

回滚（rollback）是 Ren'Py 最有辨识度的特性之一：玩家滚动鼠标滚轮就能回看历史、退回到之前的语句重新选择。这一切是内建行为，不需要你写任何代码。

回滚影响的是 init 阶段之后被改变的变量。也就是说，define 进来的常量、init python 里设置的值都处于回滚保护之外——这是合理的，它们本来就不该在游戏过程中变化。

为了实现回滚，Ren'Py 悄悄把脚本中用到的 list、dict、set 以及普通对象替换成了"可回滚等价类型"：对外表现与原类型一致，但内部记录了变化历史，回滚时能逐一撤销。

代价是并非所有数据都能享受这种待遇。三类来源的数据不可回滚：

- 内建类型方法的返回值，例如 str.split 返回的是普通 list，不带回滚历史；
- 在 import 的模块里创建的对象，例如 collections.defaultdict；
- Ren'Py API 返回的对象。

如果这些数据需要参与回滚，可以显式转换成可回滚等价类型：

```renpy
$ attrs = list(renpy.get_attributes("eileen"))
```

## persistent：跨游戏会话的数据

存档解决的是"单次游戏进程内"的状态保存，而 persistent（持久化数据）解决"跨游戏会话"的问题：引擎退出时把数据写入磁盘，下次启动时读回来。画廊解锁、结局收集、音乐室听过哪些曲子，都适合放在这里。

persistent 是一个全局对象，直接在字段上读写即可。访问未定义的字段会返回 None，所以推荐用 default 语句给字段设初值：

```renpy
default persistent.main_background = "princess_not_saved"
```

典型用途是解锁画廊：

```renpy
$ persistent.gallery_unlocked = True
```

玩家达成某个结局时执行这一句，主菜单的画廊入口就能据此判断是否开放。

多台设备或多个存档位之间可能存在同一份 persistent 数据的不同版本，合并（merge）时的默认策略是逐字段取较新的值。如果字段是集合之类需要"并集"语义的数据，可以用 renpy.register_persistent('endings', merge_endings) 注册自定义合并函数。

最后一条纪律：persistent 里只应存放 Python 或 Ren'Py 的原生类型（数字、字符串、list、dict、set 以及 Ren'Py 对象等）。塞进不可序列化的对象，轻则丢数据，重则启动报错。

## 小结

- 引擎自动保存内部状态（语句位置、显示中的图像与 screen、音乐、NVL 文本）与开局后有变化的 store 变量；
- 只保存"变量本身被重新赋值"的变化，对象字段变化不触发保存；
- 控制流路径、图像映射、config 与样式都不保存；
- 保存在最外层交互的语句开始时进行；多轮交互请用 while 语句而非 Python 块内循环；
- 存档基于 pickle：文件对象、迭代器、生成器、协程等不可保存；
- 存档文件是压缩档案，附 JSON 元数据；save_name 随存档保存，异常时自动产生 _tracesave 槽位；
- 存档界面用 FilePage/FileAction/FileScreenshot/FileTime/FileSaveName 搭建；
- 回滚内建，依赖可回滚等价类型；内建方法返回值、import 模块对象与 Ren'Py API 返回值需显式转换；
- persistent 跨会话保存，用 default 设初值，默认逐字段取较新值，可注册自定义合并函数。

## 参考链接

- [存档、读档与回滚（官方文档）](https://www.renpy.org/doc/html/save_load_rollback.html)
- [持久化数据 Persistent（官方文档）](https://www.renpy.org/doc/html/persistent.html)
- [Python 语句与 Ren'Py 集成（官方文档）](https://www.renpy.org/doc/html/python.html)
- [屏幕与屏幕语言（官方文档）](https://www.renpy.org/doc/html/screens.html)
- [游戏菜单专用屏幕（官方文档）](https://www.renpy.org/doc/html/screen_special.html)
