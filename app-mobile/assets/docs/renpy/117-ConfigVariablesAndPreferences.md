---
order: 190
title: config 配置变量与玩家偏好 preferences
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 集中梳理 Ren'Py config.* 分类速查（窗口标题/存档目录/开发者开关/性能参数）与 preferences 运行时读写（text_cps/afm/音量），标注 config 只能在 init 阶段改、preferences 可运行时改的分界
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Ren'Py 的两套"设置"体系——`config.*` 配置变量（项目身份与引擎行为，init 阶段一次性设定）与 `preferences` 玩家偏好对象（运行时随玩家意愿变化并自动持久化）。
- **解决什么问题**：散落在图层、按键、配音、平台变体、音频、翻译、调试各篇里的 config 提及需要一个集中速查表；做一个玩家设置面板时，"改 config 还是改 preferences"的分界不清会导致"设置项存不住"或"运行时改 config 不生效"。
- **什么时候用到**：项目初始化（起名、版本号、存档目录）、调性能参数、以及任何涉及玩家设置界面（文本速度、自动播放、音量、全屏）的时刻。
- **边界声明**：config.developer/console 等开发开关的完整工具链见 [开发者工具与调试](/renpy/125-DeveloperToolsAndDebugging)；Preference 动作在屏幕上的用法见 [屏幕动作与交互](/renpy/085-ScreenActionsAndInteraction)；本篇是 config 体系全景与两套体系的分界。

## 学习目标

- 会按"窗口与身份、存档、开发者开关、性能"四类速查常用 config 变量，知道各散落篇配置的是哪一个；
- 会读写 preferences 的文本速度、自动播放、全屏、音量四组高频偏好；
- 能说清两套体系的分界：config 在 init 阶段设定后不可运行时更改，preferences 运行时可读写且自动持久化；
- 能把偏好读写接进自定义设置屏，理解与 Preference 动作的分工。

## config.*：init 阶段一次性设定

config 是一个巨大的配置对象，引擎在 init 阶段读取它来决定自己的行为。三条铁律：

1. **只能在 init 阶段赋值**：用 `define config.xxx = ...` 或在 `init python:` 块里设置。游戏开始后的赋值不报错但**不生效**（引擎已经按 init 时的值运转）——这是"改了没反应"类问题的第一排查项；
2. **通常写在专用文件**：options.rpy 管身份配置，gui.rpy 管界面配置，这是 [GUI 定制](/renpy/110-GuiCustomization)篇讲过的分工；
3. **改引擎默认值要连带检查**：如 config.layers 改动会影响所有 onlayer 引用（见 [显示件与图层](/renpy/035-DisplayablesAndLayers)）。

### 分类速查表

**窗口与身份**（发布前必配，见 110 篇）：

| 变量 | 作用 |
| --- | --- |
| `config.name` | 游戏名；window_title 未设时兼作窗口标题 |
| `config.version` | 版本号字符串，随存档元数据保存 |
| `config.window_title` | 自定义窗口标题模板（静态部分），要带版本号时设它 |
| `config.save_directory` | 生成存档目录名（如 `xx-1624838360`），**发布后绝不可改**，否则玩家找不到旧存档 |
| `config.savedir` | 存档完整路径（只读，python early 阶段确定） |

**存档行为**：

| 变量 | 作用 |
| --- | --- |
| `config.has_autosave` | 是否启用自动存档 |
| `config.autosave_slots` | 自动存档占用几个槽位 |
| `config.autosave_frequency` | 大约多少次交互后触发一次自动存档 |
| `config.history_length` | 对话历史保留条数（见 [对话历史与回看界面](/renpy/105-DialogueHistory)） |

**开发者开关**（完整工具链见 125 篇）：

| 变量 | 作用 |
| --- | --- |
| `config.developer` | 开发者模式总开关：Shift+D 菜单、Shift+R 重载、fast skipping 等；可设 True/False/"auto" |
| `config.console` | 控制台开关（developer 未开时单独控制它） |
| `config.debug` | 打开更详细的调试行为（报错细节、文本溢出日志等） |

**性能与引擎行为**：

| 变量 | 作用 |
| --- | --- |
| `config.image_cache_size` | 图像缓存大小，以屏幕像素的倍数计（默认 8） |
| `config.image_cache_size_mb` | 以 MB 计的图像缓存上限（默认 300，设了它就不看前者） |
| `config.layers` | 图层列表与顺序（见 035 篇） |
| `config.keymap` | 按键映射表（见 [变量、define 与 default](/renpy/050-VariablesDefineAndDefault)） |
| `config.variants` | 屏幕变体选择列表（见 [屏幕语言与界面](/renpy/080-ScreensAndScreenLanguage)） |
| `config.default_language` / `config.language` | 默认语言与当前语言（见 [翻译与本地化](/renpy/120-TranslationLocalization)） |
| `config.fadeout_audio` | 音频淡出默认时长（见 [音视频](/renpy/090-AudioAndVideo)） |
| `config.auto_voice` | 自动配音文件查找函数（见 [Python 块与 store](/renpy/055-PythonBlocksAndStores)） |

速查表之外的变量成百上千——遇到具体需求先查官方 config 参考页，确认变量存在再写，**拼错或写不存在的 config 变量名是静默无效的**（引擎不校验拼写）。

## preferences：运行时可读写并自动持久化

preferences 是玩家的设置状态：改它立即生效，引擎自动把它持久化到磁盘，下次启动原样恢复。**不需要也不应该把它抄进自己的变量再手动存**——持久化引擎已经做好了。

### 高频偏好属性

| 属性 | 含义 | 取值 |
| --- | --- | --- |
| `preferences.text_cps` | 文本速度（每秒字符数） | 0 表示瞬间显示完，越大越慢 |
| `preferences.afm_enable` | 自动播放（Auto-Forward Mode）开关 | True/False |
| `preferences.afm_time` | 自动播放时每句停留秒数 | 0 到 30 之间的小数 |
| `preferences.skip_unseen` | 跳过模式是否也跳未读文本 | True/False（默认 False，防剧透） |
| `preferences.fullscreen` | 是否全屏 | True/False |
| `preferences.wait_voice` | 有配音时是否等配音播完再继续 | True/False |

### 音量方法

音量不是属性而是四个方法，按**混音器**（mixer：music、sfx、voice）为单位操作：

```renpy
preferences.set_mixer("music", 0.8)   # 音乐混音器音量 80%
vol = preferences.get_mixer("sfx")    # 读取音效混音器音量（静音时返回 0.0）
preferences.set_mute("voice", True)   # 静音语音
muted = preferences.get_mute("voice") # 查询静音状态
```

注意 `get_mixer` 在静音时返回 0.0 而不是真实设定值——"静音"与"音量为零"在引擎里是两个状态。设置界面若要显示滑杆，读 `get_mixer` 前先查 `get_mute`。

## 两套体系的分界：一张对照表

| 维度 | config.* | preferences |
| --- | --- | --- |
| 谁的意愿 | 创作者的（项目身份与引擎行为） | 玩家的（体验偏好） |
| 何时设定 | init 阶段，一次性 | 运行时随时 |
| 持久化 | 随游戏文件分发 | 自动持久化到玩家机器 |
| 改错时机 | 运行时改不生效 | 任何时刻改都生效 |
| 界面载体 | options.rpy（创作者编辑） | 设置屏（玩家操作） |

判断口诀：**问自己"这是玩家会想调的吗"**——窗口标题、存档目录、缓存大小是玩家的吗？不是，归 config。文本快慢、要不要自动播、声音大小是玩家的吗？是，归 preferences。把这个判断做错的方向是"把 preferences 抄进 config"：比如在 init python 里 `config.default_text_cps` 之类根本不存在的变量名去"预设玩家速度"——config 页面上没有这个变量，文本速度的初值属于 preferences 体系；想要"老玩家保持上次速度、新玩家给个适中初值"，preferences 的持久化机制本身就是答案。

## 工程场景

### 场景一：自定义设置屏保存文本速度与自动播放

```renpy
screen my_preferences():
    tag menu
    use game_menu(_("设置")):
        vbox:
            spacing 16
            # 文本速度：滑杆从"瞬间"(0)到"很慢"(...)，反向映射成直觉刻度
            hbox:
                text _("文本速度") min_width 160
                bar:
                    value FieldValue(preferences, "text_cps", range=200, style="slider")
                    xsize 400
            # 自动播放开关：动作与状态显示一体
            textbutton _("自动播放"):
                action ToggleField(preferences, "afm_enable")
            hbox:
                text _("自动播放停留") min_width 160
                bar:
                    value FieldValue(preferences, "afm_time", range=15.0, style="slider")
                    xsize 400
```

逐段拆解：`FieldValue(preferences, "text_cps", range=200)` 让滑杆直接绑定偏好字段——拖动即写入、重启不丢（FieldValue 的协议见 [屏幕语言与界面](/renpy/080-ScreensAndScreenLanguage)）；`ToggleField(preferences, "afm_enable")` 一颗按钮完成切换 + 选中态绘制，不需要自己写取反逻辑。若只是想用现成控件，`Preference` 动作（085 篇）等价于这些绑定：`Preference("text speed", 1.0)` 与 `Preference("auto-forward", "toggle")`。两者的分工：**FieldValue/ToggleField 直接操作 preferences 对象，适合自定义布局；Preference 动作封装了"改哪个值"的知识，适合标准设置项**。

### 场景二：窗口标题带版本号

```renpy
define config.name = _("星见计划")
define config.version = "1.2.0"
define config.window_title = _("星见计划") + " v" + config.version
```

`config.window_title` 是静态部分——写一个固定模板把名字与版本拼在一起。发布新版本时只改 `config.version` 一处，窗口标题与存档元数据（_version 字段，见 [存档、读档与回滚](/renpy/100-SaveLoadAndRollback)）一起更新。想运行时动态换标题（如"第三章 星见祭 - 星见计划"），config 帮不了你：窗口标题在 init 后由引擎持有，游戏内换标题要走平台 API，一般不值得——把章节放进度界面里就好。

### 场景三：音量默认值与首启引导

```renpy
init python:
    # 玩家没动过音量时的项目默认值：音乐 70%、音效 90%
    DEFAULT_VOLUMES = { "music": 0.7, "sfx": 0.9, "voice": 1.0 }

default persistent.volume_initialized = False

label after_load_preferences:
    if not persistent.volume_initialized:
        python:
            for mixer, vol in DEFAULT_VOLUMES.items():
                preferences.set_mixer(mixer, vol)
            persistent.volume_initialized = True
```

这里有一个分界的活例：**"默认音量是多少"是创作者的 config 式意愿，但 preferences 没有"设默认值"的 config 变量**——通行做法就是用 persistent 标志位（持久化标志的完整机制见 100 篇）做一次性初始化。注意用 `get_mixer` 判断"玩家是否自己动过"并不可靠（静音时它返回 0.0），所以用独立的 persistent 标志而不是"音量为零"来推断首启。

## 易错点清单

1. **运行时改 config**：`$ config.xxx = ...` 不报错但不生效。config 只认 init 阶段；
2. **偏好自己手动持久化**：把 preferences 值抄进变量再写存档——preferences 本来就自动持久化，抄写反而制造两份不同步的状态；
3. **发布后改 config.save_directory**：玩家存档目录一换，旧存档"消失"。此变量一次定终身；
4. **拼错 config 变量名**：引擎不校验拼写，`config.develper = True` 静默无效。对照官方参考页写；
5. **静音误判为零音量**：`get_mixer` 静音时返回 0.0，判断玩家设置要连 `get_mute` 一起查；
6. **在 define 里调用玩家偏好**：`define x = preferences.text_cps` 把"当时的值"固化成常量——define 是 init 期求值，玩家偏好是运行期状态，读取偏好的代码必须写在运行期（screen、label、函数内）。

## 动手实践

**任务一：最小可用设置屏。** 用 FieldValue 与 ToggleField 做一屏：文本速度滑杆、自动播放开关、全屏切换三项，确认重启后设置保留。提示：全屏用 `ToggleField(preferences, "fullscreen")` 或 Preference 动作均可；验证持久化时改完直接关游戏重开。

**任务二：首启音量引导。** 实现场景三的 DEFAULT_VOLUMES 初始化，并在首启时弹一行 Notify 告诉玩家"已应用推荐音量"。提示：初始化时机放在 main_menu 前的 label（`label splashscreen`）比 after_load 合适——它是"游戏第一次启动"而不是"每次读档"；想想 persistent 标志为什么不能代替 config。

**任务三：静音一键切换。** 做一颗按钮：点击后三个混音器全部静音/恢复，按钮文字随状态变化（"静音全部"/"取消静音"），并在旁边用小字显示当前音乐音量。提示：恢复需要记住静音前的音量（存一个 default 字典）；读取显示时处理 get_mixer 静音返回 0.0 的语义。

先自己写，再对照参考实现（任务三）：

<details>
<summary>任务三参考实现（全混音器静音切换）</summary>

```renpy
default muted_backup = None   # 静音前的音量备份；None 表示当前不是"我们做的静音"

init python:
    ALL_MIXERS = ["music", "sfx", "voice"]

screen mute_toggle():
    vbox:
        textbutton (_("取消静音") if persistent.all_muted else _("静音全部")):
            action Function(toggle_all_mute)
        if persistent.all_muted:
            text _("（音乐音量 {}%）").format(int(backup_or_current("music") * 100)) size 16 color "#888888"
        else:
            text _("（音乐音量 {}%）").format(int(preferences.get_mixer("music") * 100)) size 16 color "#888888"

init python:
    def toggle_all_mute():
        global muted_backup
        if persistent.all_muted:
            # 恢复：写回备份并解除引擎静音
            for mixer in ALL_MIXERS:
                preferences.set_mixer(mixer, (muted_backup or {}).get(mixer, 1.0))
                preferences.set_mute(mixer, False)
            muted_backup = None
            persistent.all_muted = False
        else:
            # 静音：先备份当前音量
            muted_backup = { m: preferences.get_mixer(m) for m in ALL_MIXERS }
            for mixer in ALL_MIXERS:
                preferences.set_mixer(mixer, 0.0)
                preferences.set_mute(mixer, True)
            persistent.all_muted = True

    def backup_or_current(mixer):
        return (muted_backup or {}).get(mixer, preferences.get_mixer(mixer))
```

对照要点：静音走 `set_mixer(mixer, 0.0)` + `set_mute(mixer, True)` 双保险——只设音量为零，玩家手动拖滑杆到 50% 时会"莫名其妙变有声"；只调 set_mute 则混音器值还在、恢复时直接解除即可，但部分界面对 get_mixer 的 0.0 显示会误导。备份用 `default` 变量（随存档走），静音状态用 `persistent.all_muted`（跨会话记住"我是被静音的"）——两份数据各有归属，正是本篇 config/preferences/persistent 三层分界的微缩演练。若把备份存进 persistent，读档后备份可能来自另一个存档位；若把静音状态存进普通变量，重启游戏后按钮文字与引擎真实状态脱节。
</details>

## 小结

- config.* 在 init 阶段用 define/init python 设定，运行时改不生效；速查按"窗口与身份、存档、开发者开关、性能"四类记；
- preferences 是玩家的运行时偏好：text_cps/afm_enable/afm_time/skip_unseen/fullscreen 等属性直接读写，音量走 set_mixer/get_mixer/set_mute/get_mute 四个方法；
- 分界口诀：玩家的意愿归 preferences（自动持久化），创作者的决策归 config（init 一次设定）；
- 设置屏两种写法：FieldValue/ToggleField 直绑 preferences 字段，Preference 动作封装标准项；
- 项目默认音量这类"没有 config 变量的默认值"，用 persistent 标志做一次性初始化。

## 参考与致谢

- config 变量与 preferences 属性、方法名对照 Ren'Py 官方文档 Configuration Variables 与 Preference Variables 章节核实后重写：https://www.renpy.org/doc/html/config.html 、https://www.renpy.org/doc/html/preferences.html （Ren'Py 文档为 CC BY-NC-ND 4.0 许可，本篇内容全部重新表述，代码示例为本仓库自己的实现）
