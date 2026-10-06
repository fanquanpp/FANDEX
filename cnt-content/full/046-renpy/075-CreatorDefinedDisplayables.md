---
order: 110
title: Creator-Defined Displayables 自定义显示件
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 用 renpy.Displayable 子类与 render/event 交互周期绘制 screen 语言做不了的动态内容：打字速度小游戏、对话框粒子雨、点击收集小游戏，标注 Render 每帧新建与焦点处理易错点
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Creator-Defined Displayables（CDD，创作者自定义显示件）——用纯 Python 类继承 renpy.Displayable，接管"画什么"（render）与"收什么事件"（event）两个环节。
- **解决什么问题**：screen 语言与 ATL 擅长"摆现有的东西"，但逐帧变化的动态内容——小游戏、粒子特效、自定义动画曲线——需要自己控制每一帧画布。这正是 CDD 的领地：它是 Ren'Py 显示件体系的最后一层自由度。
- **什么时候用到**：内嵌小游戏、屏幕特效、自定义转场与进度条、任何"用图像 + 变换拼不出来"的视觉。若 ATL 与 screen 能做到（见 [ATL 变换与动画](/renpy/070-ATLTransformsAndAnimation)、[屏幕语言与界面](/renpy/080-ScreensAndScreenLanguage)），不要用 CDD——它的维护成本高一个量级。
- **边界声明**：本篇讲自定义绘制与事件；屏幕内的交互组件（button/input）见 [屏幕动作与交互](/renpy/085-ScreenActionsAndInteraction)。

## 学习目标

- 理解 CDD 与引擎的交互周期：render 负责画、event 负责听、renpy.redraw 安排下一帧；
- 会用 Render 对象的 blit 与 fill 组装画面，会用 renpy.render 把子显示件渲染进自己的画布；
- 理解 st 与 at 两个时钟的语义，会用它们做随时间变化的动画；
- 知道三类高频错误：render 返回对象被复用、事件不穿透/不消费、忘记 visit() 导致子显示件不参与交互。

## 与 screen/ATL 的分界：为什么需要 CDD

screen 回答"界面上有哪些东西"，ATL 回答"这些东西怎么动"。但两者都建立在"显示件"（displayable）之上——image、Transform、Frame 都是显示件。CDD 让你直接制造新的显示件类型：每一帧画布上画什么、响应哪些事件，完全由你的 Python 代码决定。

使用场景的判断标准：

- 需要**逐帧重算**的画面（粒子雨、频谱、打字机的判定框）——CDD；
- 需要**自定义事件语义**（把整个屏幕当游戏面板收指针与键盘）——CDD；
- 只是让图片平移缩放淡入淡出——ATL 足够；
- 只是摆按钮摆文本——screen 足够。

## render：把画面画出来

CDD 的核心协议：引擎在需要显示时调用你的 render 方法，你必须返回一个 Render 对象——引擎只认这个对象，它就是"这一帧的画布"。

```renpy
init python:
    import pygame_sdl2

    class RainDrop:
        def __init__(self, width, height):
            self.reset(width, height)
        def reset(self, width, height):
            self.x = renpy.random.randint(0, width)
            self.y = renpy.random.randint(-height, 0)
            self.speed = renpy.random.randint(6, 14)
            self.size = renpy.random.randint(1, 3)
        def fall(self, width, height):
            self.y += self.speed
            if self.y > height:
                self.reset(width, height)

    class RainDisplayable(renpy.Displayable):
        def __init__(self, count=60, **kwargs):
            super(RainDisplayable, self).__init__(**kwargs)
            self.width = 0
            self.height = 0
            self.drops = None
            self.count = count

        def render(self, width, height, st, at):
            # 每次进入都新建 Render 与粒子状态——见下文"每帧新建"易错点
            self.width = width
            self.height = height
            if self.drops is None or len(self.drops) != self.count:
                self.drops = [RainDrop(width, height) for _ in range(self.count)]

            render = renpy.Render(width, height)

            for drop in self.drops:
                drop.fall(width, height)
                color = (140, 170, 220, 160)
                render.fill(color, (drop.x, drop.y, drop.size, drop.size * 8))

            renpy.redraw(self, 0)          # 请求"下一帧尽快再画我"
            return render
```

逐段拆解：

- `renpy.Render(width, height)` 创建本帧画布。**Render 必须在 render 方法内新建**——官方文档明确要求"不要复用上一次返回的 Render 对象"。原因：引擎会缓存并逐层合成 Render，复用旧对象轻则画面冻结，重则渲染管线崩溃。要修改画面，正确的姿势是重新构建一个新的 Render 再返回；
- `render.fill(color, rect)` 在画布上填一个矩形，color 是 (r, g, b, a) 元组。它是 Render 最朴素的绘制原语；要贴图片或子显示件则用 blit（下一节）；
- `renpy.redraw(self, 0)` 是"续帧"的关键：render 只在引擎认为需要时被调用，不调用它，画面画一帧就静止。redraw 的第二个参数是延迟秒数，0 表示"尽快再来一帧"。把 redraw 写在 render 内部（而不是事件回调里），就形成自驱动的动画循环；
- `st`（show time）与 `at`（animation time）是两个时钟：st 从本显示件被 show 起计时，at 从动画体系启动起计时。用 st 可以写出与显示时刻对齐的动画（比如"显示后 3 秒开始下雨"），用 at 可以对齐转场节奏。

在 screen 或脚本里使用：

```renpy
screen rain_layer():
    add RainDisplayable(80)

label start:
    scene bg street
    show screen rain_layer
    "雨下起来了。对话与雨层互不干扰。"
```

`add RainDisplayable(80)` 把 CDD 实例像普通图片一样加进屏幕；它也可以 `show expression RainDisplayable()` 直接上图层，进 scene 清理时的行为与普通显示件一致。

## blit 与子显示件：在画布上贴东西

fill 只能画矩形，真正的画面靠 blit 组装——把另一个显示件渲染成 Render 再贴上来：

```renpy
init python:
    class PulseIcon(renpy.Displayable):
        def __init__(self, child, **kwargs):
            # 调用基类构造并保存子显示件；child 可以是 Image("icon.png")
            super(PulseIcon, self).__init__(**kwargs)
            self.child = child

        def render(self, width, height, st, at):
            # renpy.render 把子显示件按指定尺寸渲染成 Render
            base = renpy.render(self.child, 64, 64, st, at)
            cw, ch = base.get_size()

            import math
            scale = 1.0 + 0.08 * math.sin(st * 4)   # 随 st 呼吸
            w, h = int(cw * scale), int(ch * scale)
            render = renpy.Render(64, 64)

            # 缩放交给 Transform 显示件：包一层再渲染，贴到画布中心
            render.blit(renpy.render(Transform(self.child, zoom=scale), 64, 64, st, at),
                        (int((64 - w) / 2), int((64 - h) / 2)))

            renpy.redraw(self, 0)
            return render

        def event(self, ev, x, y, st):
            return

        def visit(self):
            # 声明子显示件：参与交互、存档感知与销毁清理
            return [self.child]
```

逐段拆解：

- `renpy.render(displayable, width, height, st, at)` 是 CDD 的"借力"入口：把任何显示件（Image、Transform、甚至另一个 CDD）渲染成 Render。拿到后用 `render.blit(child_render, (x, y))` 贴到自己的画布上；
- 缩放、旋转这类画面运算**不要在 CDD 里自己发明**——Ren'Py 的惯例是把变换交给 Transform 显示件包一层再 render，复用引擎已经优化好的实现；
- `visit()` 返回子显示件列表。**忘记 visit 是高频静默 bug**：子显示件不参与焦点查找、不被 show/hide 正确清理、不随存档感知状态。凡是在 `__init__` 里保存了子显示件的 CDD，都必须在 visit 里交出去；
- `event` 返回 None 表示事件继续向后传递；本例不需要事件，但空实现能让意图明确。

## event：收事件与三个约定

event 方法在每次交互事件（鼠标移动、点击、按键）时被调用，参数 ev 是 pygame 事件对象，x/y 是**相对本显示件**的指针坐标，st 是 show 时钟：

```renpy
init python:
    class ClickGame(renpy.Displayable):
        def __init__(self, target_count=10, **kwargs):
            super(ClickGame, self).__init__(**kwargs)
            self.child = Image("gui/target.png")
            self.targets = []
            self.hits = 0
            self.target_count = target_count
            self.spawn(640, 400)

        def spawn(self, width, height):
            self.targets = []
            for _ in range(3):
                self.targets.append((renpy.random.randint(40, width - 40),
                                     renpy.random.randint(40, height - 40)))

        def render(self, width, height, st, at):
            render = renpy.Render(width, height)
            for (tx, ty) in self.targets:
                r = renpy.render(self.child, 80, 80, st, at)
                render.blit(r, (tx - 40, ty - 40))
            return render

        def event(self, ev, x, y, st):
            import pygame_sdl2

            if ev.type == pygame_sdl2.MOUSEBUTTONDOWN and ev.button == 1:
                for (tx, ty) in self.targets:
                    if abs(x - tx) < 40 and abs(y - ty) < 40:
                        self.hits += 1
                        self.spawn(config.screen_width, config.screen_height)
                        renpy.restart_interaction()   # 让依赖变量值的界面刷新
                        renpy.notify("命中 {} / {}".format(self.hits, self.target_count))
                        break

            if self.hits >= self.target_count:
                renpy.timeout(0)      # 请求立刻结束当前交互，回到脚本
                renpy.restart_interaction()

            renpy.redraw(self, 0)

        def visit(self):
            return [self.child]
```

event 的三个约定：

1. **坐标是显示件局部坐标**：x/y 已经过引擎换算（考虑了显示件的位置与缩放），直接与自己的绘制坐标比较即可，不要再去减全局偏移；
2. **要不要消费事件**：返回 `renpy.IgnoreEvent()` 可以"吃掉"这个事件，阻止它传给更下层的显示件（比如防止玩家在游戏面板上点击时顺带推进了对话）。不返回任何值则事件继续向下传播——小游戏悬浮在对话之上时，要不要挡对话推进是一个真实的设计决策；
3. **改动状态后通知引擎**：改了自己持有的变量后，`renpy.restart_interaction()` 让依赖这些值的界面重新求值，`renpy.timeout(0)` 让引擎尽快结束当前交互（配合 `call screen` 可以把"小游戏通关"作为返回值带回脚本）。

配套的收尾逻辑用 call screen 拿结果：

```renpy
label mini_game:
    call screen click_game
    if _return:
        "手感不错，奖励一枚徽章。"
    else:
        "下次再挑战吧。"
```

## 焦点与可交互 CDD

CDD 默认不可聚焦——键盘手柄无法把焦点交给它。需要键盘交互时设置 `focusable = True` 并给出 focus_mask，再用 `renpy.focus_coordinates()` 配合绘制高亮。多数小游戏面板走"鼠标 + 跳过键"就够，把 CDD 做成可聚焦组件属于进阶需求；做之前先确认 screen 的 button（见 085 篇）真的不够用。

## 易错点清单

1. **复用 Render 对象**：把上一次的 Render 存起来这次再返回——画面冻结或崩溃。每帧新建 Render 是硬规则；
2. **忘记 renpy.redraw**：画面只画一帧就静止，玩家以为"游戏卡了"。动画型 CDD 的 render 末尾必须有 redraw；
3. **忘记 visit()**：子显示件不清理、不参与焦点。保存了 child 就交出 visit；
4. **在 render 里做耗时计算**：render 每帧都跑，塞进重计算（大量碰撞检测、图片解码）直接掉帧。重活放到事件回调或预渲染缓存里；
5. **事件坐标当全局坐标用**：x/y 是显示件局部坐标，自己再做偏移换算反而错位；
6. **用 CDD 做静态排版**：一个纯摆放界面的需求写成 300 行 CDD，screen 十行能解决——先问 ATL/screen 行不行。

## 动手实践

**任务一：打字速度小游戏。** 实现一个 CDD：显示一句固定文本，玩家敲键盘逐字符匹配，正确字符变绿、错误闪红，打完显示用时并 `renpy.timeout(0)` 结束交互。提示：在 event 里收 `pygame_sdl2.KEYDOWN`，`ev.unicode` 取字符与文本逐位比较；用时直接读 st。

**任务二：对话框粒子雨。** 参考本篇 RainDisplayable，让粒子从屏幕顶部飘落且**避开底部对话区**（高度的底部 25% 不生成落点），叠加在 say 界面之下、背景之上。提示：用 zorder 控制图层（见 [显示件与图层](/renpy/035-DisplayablesAndLayers)）；生成 y 起点 `-height` 到 `height * 0.7`。

**任务三：点击收集小游戏。** 在 ClickGame 基础上改成"限时 10 秒收集 15 个目标"：倒计时显示在角落，时间到未达标判定失败，用 call screen 把胜负带回脚本。提示：deadline 用 st 推算并在 render 里画倒计时条；超时判定放 event 顶部。

先自己写，再对照参考实现（任务三）：

<details>
<summary>任务三参考实现</summary>

```renpy
init python:
    class CollectGame(renpy.Displayable):
        def __init__(self, need=15, seconds=10, **kwargs):
            super(CollectGame, self).__init__(**kwargs)
            self.child = Image("gui/star.png")
            self.need = need
            self.seconds = seconds
            self.start_st = None
            self.hits = 0
            self.targets = []
            self.done = None      # None 进行中；True/False 结束

        def render(self, width, height, st, at):
            if self.start_st is None:
                self.start_st = st
                self.spawn(width, height)

            render = renpy.Render(width, height)
            for (tx, ty) in self.targets:
                render.blit(renpy.render(self.child, 64, 64, st, at), (tx - 32, ty - 32))

            elapsed = st - self.start_st
            remain = max(0.0, self.seconds - elapsed)
            # 顶部倒计时条：宽随剩余时间收缩
            render.fill((80, 160, 255, 200), (20, 20, int((width - 40) * remain / self.seconds), 12))
            render.fill((255, 255, 255, 255), (20, 20, 3, 12))

            if remain <= 0.0 and self.done is None:
                self.done = self.hits >= self.need
                renpy.timeout(0)

            renpy.redraw(self, 0)
            return render

        def spawn(self, width, height):
            self.targets = [(renpy.random.randint(40, width - 40),
                             renpy.random.randint(40, height - 40)) for _ in range(4)]

        def event(self, ev, x, y, st):
            import pygame_sdl2

            if ev.type == pygame_sdl2.MOUSEBUTTONDOWN and ev.button == 1 and self.done is None:
                for (tx, ty) in self.targets:
                    if abs(x - tx) < 32 and abs(y - ty) < 32:
                        self.hits += 1
                        if self.hits >= self.need:
                            self.done = True
                            renpy.timeout(0)
                        else:
                            self.spawn(config.screen_width, config.screen_height)
                        break
            renpy.redraw(self, 0)
```

```renpy
screen collect_game():
    add CollectGame()

label collect:
    call screen collect_game
    if _return:
        "收齐了！星星币 +15。"
        $ persistent.star_coins += 15
    else:
        "差一点点……再来一次？"
```

对照要点：计时基准 `start_st` 在第一帧 render 里落定——比在 `__init__` 里取时间可靠，因为 st 只在这里可信；倒计时条是 fill 矩形随 remain 收缩，是 CDD"用最朴素的绘制原语做 UI"的典型手法；胜负判定统一走 `renpy.timeout(0)` + `call screen` 的返回值通道，让游戏结果回到脚本语言层面继续叙事（persistent 奖励的写入见 [存档、读档与回滚](/renpy/100-SaveLoadAndRollback) 篇）。注意两个超时/达标判定都只触发一次（`self.done is None` 保护），否则 timeout 会在结束前一帧内重复请求。
</details>

## 小结

- CDD 继承 renpy.Displayable，render 返回当帧画布、event 收事件、visit 交出子显示件；
- Render 每帧新建是硬规则；renpy.redraw(self, 0) 驱动动画循环；renpy.render 把任意显示件渲染后 blit 上画布；
- st 与 at 是两个时钟，动画计时以 st 为准（首帧落定基准）；
- 事件坐标是局部坐标；IgnoreEvent 消费事件、restart_interaction 刷新界面、timeout(0) 结束交互把控制权交回脚本；
- 选用判断：ATL 与 screen 做不了的动态内容才用 CDD。

## 参考与致谢

- 本篇的结构与 API 口径对照 Ren'Py 官方文档 Creator-Defined Displayables 章节重写：https://www.renpy.org/doc/html/cdd.html （Ren'Py 文档为 CC BY-NC-ND 4.0 许可，本篇内容全部重新表述，代码示例为本仓库自己的实现）
