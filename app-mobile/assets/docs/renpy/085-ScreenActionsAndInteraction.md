---
order: 130
title: 屏幕动作与交互
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: action 协议、动作族清单、keysym 与 focus 导航、draggroup 拖放：屏幕交互的完整协议层
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：屏幕动作（Action）与交互事件——屏幕语言（见 [屏幕语言与界面](/renpy/080-ScreensAndScreenLanguage)）之下的交互协议层。
- **解决什么问题**：屏幕"样子"讲完后，"反应"如何组织？按钮点击做什么、悬停做什么、键盘手柄怎么导航、可拖拽界面怎么写——答案都落在 action 协议与交互属性上。080 篇只点到 button 的 action 与 hovered，本篇把协议展开。
- **什么时候用到**：写任何带交互的屏幕（背包、设置、图鉴）、需要键盘/手柄全导航的界面、拖拽排序（收纳、换装、拼图）。
- **边界声明**：use 嵌套复用属于屏幕语言本体，留在 080 篇；本篇承接动作与交互。存档槽界面用到的 FileAction 与 080 篇特殊屏幕一节互为表里，[存档、读档与回滚](/renpy/100-SaveLoadAndRollback) 篇讲存档语义。

## 学习目标

- 理解 action 协议：可调用对象、返回值语义、敏感度与选中态、动作列表的组合规则；
- 会按族使用常用动作：Jump/Return/Show/Hide、Set/Toggle/Increment 数据族、File 存档族、Function 与 Confirm；
- 会用 hovered/unhovered/keysym/alternate 绑定交互事件，实现键盘与手柄导航；
- 会用 draggroup 与 drag 实现拖放界面。

## action 协议

action 是一个可调用对象（callable）。按钮被点击（activate）时调用它；它还能反向决定按钮的状态：

- 返回值语义：动作被调用后若返回非 None 值，该值从当前交互中返回——call screen 的 _return 就是这么来的。Return() 动作本身就是这个协议的直白实现；
- 敏感度（sensitive）：动作可以声明"我现在不适用"，按钮随即变灰不可点。SetVariable 的目标不可写、FileLoad 的槽位为空，都靠敏感度把不可用直接画在界面上；
- 选中态（selected）：动作声明"当前处于选中"，按钮呈现 selected 样式。ToggleVariable 开着时按钮亮起，靠的就是它；
- 无参函数也能当动作用，但无法声明敏感度与选中态。

动作列表可以代替单个动作，按顺序执行；组合规则要背下来：列表的敏感状态取所有动作的交集（除非列表中包含 SensitiveIf），选中状态取并集（除非包含 SelectedIf）。换句话说，列表里任何一个动作不可用，整颗按钮就不可用——想"部分可用也执行"就要用 SensitiveIf 显式接管。

自定义动作继承 Action 类，重写这些方法即接入协议：

```renpy
init python:
    class GiveGift(Action):
        def __init__(self, item):
            self.item = item
        def get_sensitive(self):
            return store.inventory.get(self.item, 0) > 0
        def get_selected(self):
            return store.gifted_today
        def __call__(self):
            store.inventory[self.item] -= 1
            renpy.jump("gift_reaction")
```

get_sensitive 决定可点、get_selected 决定选中、__call__ 是点击本体。给动作起类名还有一层好处：Lint 与日志里动作可读（GiveGift(ring)），裸函数则只有一个地址。为什么不用 $ 包一段代码塞进 action：action 是描述"可被按钮持有的意图"的对象，屏幕每帧都会重新构建 action，把副作用写进去会被反复执行——这正是 080 篇"屏幕不得有副作用"约束的另一面。

## 动作族清单

按用途分组记，用到哪族翻哪族（完整清单见官方 Screen Actions 章）：

```text
控制     Jump / Return / Call / Show / ShowTransient / Hide / ToggleScreen
         Start / MainMenu / Quit / ShowMenu / Continue / NullAction
数据     SetVariable / SetScreenVariable / SetLocalVariable / SetField / SetDict
         ToggleVariable / ToggleScreenVariable / ToggleField / ToggleDict
         CycleVariable / IncrementVariable / AddToSet / RemoveFromSet / ToggleSetMembership
菜单     Confirm / Notify / Help / OpenURL / OpenDirectory / Screenshot
         Rollback / RollForward / Skip / With
文件     FileAction / FileSave / FileLoad / FileDelete / FilePage
         FilePageNext / FilePagePrevious / QuickSave / QuickLoad / FileTakeScreenshot
其他     Function / If / SelectedIf / SensitiveIf / InvertSelected / MouseMove
         CaptureFocus / ClearFocus / GetFocusRect / ToggleFocus / Scroll
音频     Play / Queue / Stop / SetMixer / SetMute / ToggleMute / PauseAudio
偏好     Preference（display、skip、音量、文字速度等全部设置项）
```

几个容易混用的成员：

- Show 与 ShowTransient：前者按 tag 注册进屏幕栈（ShowMenu 能回来），后者临时显示、不走栈；主菜单按钮用 ShowMenu，游戏内临时提示用 ShowTransient；
- SetVariable 与 SetScreenVariable：前者改全局 store 变量，后者改屏幕局部变量（080 篇变量解析顺序一节）；写错目标时界面"看起来改了其实没改"；
- Function 与普通函数：Function(renpy.curry(fn), arg1) 延迟到点击时执行且支持参数；直接写 action=fn() 是立即执行函数再把返回值当动作——新手第一大坑；
- If(expr, a, b)：构建时按条件二选一，选出来的动作固定；这与 SensitiveIf(expr, a) 不同——后者始终执行 a，只是敏感度受控。

场景一：手柄操作设置菜单。设置项用 ToggleVariable 与 Preference 组合，焦点导航交给键盘/手柄，动作自己把状态画在按钮上：

```renpy
screen settings_pad():
    vbox:
        textbutton "全屏切换" action Preference("display", "toggle fullscreen")
        textbutton "跳过未读" action ToggleVariable("preferences.skip_unseen")
        textbutton "BGM 静音" action ToggleMute("music")
        textbutton "返回" action Return()
```

每个 Toggle 系动作自带选中态：玩家用手柄上下移动焦点、按确认键切换，按钮亮灭即状态——不用写一行"刷新界面"的代码，这正是协议层的收益。手柄按键到 UI 动作的映射由引擎焦点系统完成，开发者只管把 action 挂对。

场景二：用 File 动作做存档槽。与 080 篇特殊屏幕一节的 load 屏幕呼应，这里给出手写槽位的最小版：

```renpy
screen save_slots():
    grid 3 2:
        for i in range(1, 7):
            button:
                xysize (300, 200)
                if FileLoadable(i):
                    add FileScreenshot(i)
                    text FileTime(i, format="%Y-%m-%d %H:%M") xalign 0.5
                action FileAction(i)
```

FileLoadable(i) 决定槽位有无内容，FileScreenshot/FileTime 是取数据的函数（非动作），FileAction(i) 自动按当前屏幕是 save 还是 load 决定存或读——一个动作通吃两个界面。为什么不用自定义函数读写存档：引擎的截图、时间戳、槽位管理已封装好，File 族动作还负责敏感度（空槽不可读）。

## 交互事件：hovered、unhovered、keysym、activate

按钮与多数控件上有四个交互属性：

- hovered：指针进入时调用的动作或函数；unhovered：离开时。悬停提示、预览音效、选中项跟随都挂这里。GetTooltip 与 CaptureFocus 组合的弹出提示是标准用法；
- activate：点击时除 action 外的补充动作（如音效），与 action 并行不冲突；
- alternate：右键/长按触发；
- keysym：把快捷键绑到该控件——按下 keysym 等价于激活它：

```renpy
textbutton "全屏" action Preference("display", "toggle fullscreen") keysym "f"
imagebutton auto "btn_next_%s.png" action Jump("next") keysym "K_RETURN"
```

keysym 接按键名（"f"）或键位常量字符串（"K_RETURN"）；一张屏幕里多个控件可绑不同 keysym，形成"快捷键面板"。要注意 keysym 绑的是控件的激活，与 key 语句（直接把按键绑到 action，080 篇输入一节）分工：keysym 随焦点语义走，key 语句是屏幕级热键，两者别混用同名键。

## focus：键盘与手柄导航

引擎为每颗可交互控件维护焦点（focus）体系：方向键/手柄摇杆在控件间移动焦点，确认键激活当前焦点控件，焦点控件自动呈现 hover 样式。导航是自动的，但有几个手动钩子值得知道：

- CaptureFocus(name) / GetFocusRect(name)：给控件矩形起名存取，供弹出层定位——tooltip 弹出在"触发按钮旁边"就是 focus "tooltip" 的特殊协议；
- bar 之类非按钮控件同样参与焦点链，方向键调值；
- 焦点链默认按布局位置推断，复杂 fixed 布局可能跳得反直觉——用 Focus 动作族与布局调整修，不要试图手写焦点顺序。

场景三：背包物品拖拽 draggroup。拖放是交互协议的重头：drag 是可拖拽件，draggroup 是容纳并管理拖拽件的容器，拖拽碰撞、落点、交换由 draggroup 裁决：

```renpy
screen bag():
    draggroup:
        for i, slot in enumerate(slots):
            drag:
                drag_name slot.name
                drag_raise True
                dragged slot_dragged
                dropped slot_dropped
                xysize (96, 96)
                xpos (i % 4) * 110 + 20
                ypos (i // 4) * 110 + 20
                add slot.icon
```

- drag_name 给拖拽件起名，dragged/dropped 回调收到的参数里用名字识别"谁被拖、拖到了谁"；
- dragged 在拖动结束时以 (drag, dragged_x, dragged_y) 回调，dropped 在拖拽件被丢到另一 drag 上时以 (drag, dropped_onto) 回调——交换物品就写在 dropped 里；
- drag_raise True 让被拖件浮到组内最上层。

回调函数定义在剧本侧（init python 或运行期），例：

```renpy
init python:
    def slot_dropped(drags, dropped):
        store.slots[drags[0].drag_name], store.slots[dropped[0].drag_name] = \
            store.slots[dropped[0].drag_name], store.slots[drags[0].drag_name]
        renpy.restart_interaction()
```

dropped 回调交换数据后调用 renpy.restart_interaction() 让屏幕按新数据重排——数据驱动界面，拖拽只负责手势。换装系统、拼图小游戏、自由布局 HUD，全是 draggroup 一套协议的变体。

## 动手实践

**任务一：四态按钮与动作组合（约 20 分钟）**

写一个"技能开关面板"：4 个技能各一颗按钮，用 ToggleVariable 绑定四个 default 布尔变量；把两颗按钮组成动作列表（ToggleVariable 加 Notify），验证"列表选中态取并集、敏感态取交集"的规则——给其中一颗配 SensitiveIf(level > 5) 观察整颗按钮何时变灰。

提示：Notify 是无副作用的提示动作，适合观察列表行为。参考片段：

```renpy
textbutton "火球术" action [ ToggleVariable("skill_fire"), Notify("火球术状态已切换") ]
textbutton "禁咒" action [ ToggleVariable("skill_forbidden"), Notify("禁咒状态已切换") ] sensitive level > 5
```

对照实验：去掉 SensitiveIf 改用 If(level > 5, ToggleVariable("skill_forbidden"), Notify("等级不足"))，观察"选中态"表现差异——If 在不满足时根本不切换。

**任务二：手柄可达的设置页（约 25 分钟）**

不接手柄也能验证：写一页只用键盘可完整操作的设置屏（方向键移动焦点、回车切换、F 键全屏），每个开关用 Toggle/Preference 系动作呈现选中态，加一颗 keysym 绑定 Escape 的返回按钮。

提示：键盘导航引擎自动做，你要做的是保证"没有焦点死区"——布局留够间距，避免控件互相遮挡。参考骨架：

```renpy
screen keyboard_settings():
    vbox:
        spacing 8
        textbutton "跳过未读文本" action Preference("skip", "toggle")
        textbutton "自动前进" action Preference("auto-forward after click", "toggle")
        textbutton "静音" action ToggleMute("music")
        textbutton "返回" action Return() keysym "K_ESCAPE"
```

验收点：全程不碰鼠标走完一次"切换三个开关再返回"，选中态与实际行为一致。

**任务三：拖拽换位背包（约 30 分钟）**

用 draggroup 做一个 4x2 背包：8 个物品可任意拖拽交换位置，交换后位置数据落在 store 数组里；重启游戏读档验证位置被存档带走。

提示：dropped 回调交换两个槽位数据再 restart_interaction；物品图标用 add 进 drag。参考实现骨架：

```renpy
default bag_items = ["sword", "shield", "potion", "key", "ring", "map", "bread", "book"]

init python:
    def bag_dropped(drags, dropped):
        a = int(drags[0].drag_name)
        b = int(dropped[0].drag_name)
        store.bag_items[a], store.bag_items[b] = store.bag_items[b], store.bag_items[a]
        renpy.restart_interaction()

screen bag_grid():
    draggroup:
        for i in range(8):
            drag:
                drag_name str(i)
                drag_raise True
                dropped bag_dropped
                xysize (96, 96)
                xpos (i % 4) * 110 + 100
                ypos (i // 4) * 110 + 100
                add "item_" + store.bag_items[i] + ".png"
```

drag_name 用槽位序号字符串，回调里转回 int 做下标——图标显示始终读 store.bag_items[i]，拖拽交换的是数据而非控件，读档自然还原。

## 小结

- action 是可调用对象协议：返回非 None 即交互返回值，get_sensitive 与 get_selected 反向决定按钮可用与选中，自定义动作继承 Action 并起类名便于调试。
- 动作列表按序执行：敏感取交集、选中取并集，SensitiveIf 与 SelectedIf 显式接管；Function 延迟执行，action=fn() 立即执行是第一大坑。
- 动作按族记忆：控制（Jump/Return/Show/Hide/Start/ShowMenu）、数据（Set/Toggle/Cycle/Increment 五矩阵）、文件（FileAction 族通吃存读）、偏好（Preference）、焦点（CaptureFocus/GetFocusRect）。
- 交互属性 hovered/unhovered/alternate/keysym 绑事件；键盘手柄导航由焦点体系自动完成，弹出定位用 focus "tooltip" 协议。
- draggroup 加 drag 实现拖放：dragged/dropped 回调改数据后 restart_interaction，保持"数据驱动界面"。

## 参考与致谢

- [Screen Actions, Values, and Functions（Ren'Py 官方文档）](https://www.renpy.org/doc/html/screen_actions.html)——CC 许可，动作族清单与敏感/选中规则以此为底本整理改写；
- [Screens（Ren'Py 官方文档）](https://www.renpy.org/doc/html/screens.html)——keysym、hovered 与 draggroup 机制来源；
- [Drag and Drop（Ren'Py 官方文档）](https://www.renpy.org/doc/html/drag_drop.html)
- 本仓库 [屏幕语言与界面](/renpy/080-ScreensAndScreenLanguage)、[存档、读档与回滚](/renpy/100-SaveLoadAndRollback) 交叉引用。
