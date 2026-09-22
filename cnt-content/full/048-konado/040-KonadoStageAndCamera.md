---
order: 40
title: 舞台演出：立绘背景与运镜
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 用 actor 指令族调度立绘，用 background 九种效果切场景，用 cam 与 asyncam 控制镜头
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'konado/030-KonadoScriptDialogue'
  - 'konado/060-KonadoAdvancedInstructions'
prerequisites:
  - 'konado/030-KonadoScriptDialogue'

视觉小说的"演出感"来自三件事：谁站在台上（立绘）、背后是什么（背景）、镜头怎么动（运镜）。Konado 把这三件事分别交给 actor 指令族、background 指令与 cam/asyncam 指令。本篇逐一讲清这些指令的语法与细节，最后用一段完整剧本把它们串起来。

## 学习目标

- 会用 actor show、actor exit、actor move、actor change、actor motion 调度立绘。
- 理解区块索引机制：division 等分与水平坐标的含义。
- 理解 actor change 的两种状态转场与动态媒体降级。
- 会用 background 指令搭配九种内置切换效果与自定义效果名。
- 会用 play bgm、stop bgm、play sfx 播放与停止音频。
- 会用同步 cam 与异步 asyncam 完成运镜，并知道何时选哪个。
- 理解 KonadoCameraMarker 机位节点的作用与放置方式。

## 舞台背后的分工

先花一分钟理解分工。Konado 的角色与背景资源不再是简单的图片路径字段，而是场景（PackedScene）：资源列表（character_list、background_list）保存场景引用，剧本命令只表达剧情意图（"让 alice 以 normal 状态登场在 2 号位"），资源场景自己负责具体表现——静态图片、视频、Spine、Live2D 乃至 shader 都可以。所以下面这些指令写的都是"意图"，实际效果由你的资源场景决定。

## 演员登场：actor show 与区块索引

```text
actor show [角色ID] [状态] at [水平坐标]
```

实际用起来是这样：

```konado
actor show alice normal at 2
```

这条指令创建并显示演员：alice 是角色 ID，normal 是状态（通常对应立绘的表情或姿态），at 后面是水平坐标。水平坐标不是像素，而是区块索引：舞台横向被等分为 division 份（默认 5，由 KonadoDialogueManager 的 horizontal_division 属性配置，可设 2 到 5），角色的中心点与对应分割线对齐。索引范围是 0 到 division（5 等分时即 0 到 5），0 与 division 是最左、最右边缘，官方建议日常使用 1 到 division-1 之间的位置，避免角色太贴边。

重复对同一个角色执行 show 是兼容的：已创建的节点会转为新状态，不会报错也不会重复创建。这个特性在综合示例里会用到。

## 退场、移动与状态切换

```konado
actor exit alice
actor move alice 3
actor change alice angry
```

- actor exit [角色ID]：演员退场，从舞台上移除。
- actor move [角色ID] [坐标]：把演员移动到指定区块位置，常用于两人换位、走近一步。
- actor change [角色] [新状态]：切换演员状态（例如 normal 换 angry），转场完成后剧情才继续。

actor change 的转场有两种实现：

1. 状态帧转场（像素交融）：角色场景能提供状态帧（KonadoCharacterTransitionFrame）时，用预乘 Alpha（premultiplied alpha）shader 做真正的像素交融，效果最细腻。
2. 默认淡出淡入：提供不了状态帧的角色，自动退回"淡出、应用状态、淡入"的安全转场。

转场行为在 KonadoStageController 的检查器里配置：actor_state_transition_enabled（默认开启）与 actor_state_transition_duration（默认 0.3 秒）。视频、Spine、Live2D 这类动态媒体会自动降级为安全转场，并且不会重复运行动态媒体。

## 舞台动作：actor motion

```konado
actor motion alice jump 0.5
```

actor motion [角色] [动作] [时长] 播放舞台动作——震动、跳跃这类作用于演员整体的效果，由 KonadoActorMotionLayer 播放角色场景里 AnimationPlayer 的同名动画（官方建议把动画作用在 CharacterMount 节点上）。时长参数有三种写法：

- 省略：按动画自身时长播放。
- 0：禁用，跳过播放。
- 正数：把动画缩放到该时长播放。

另外，actor 系各指令都可以携带命名参数 duration（数值，最小 0.0），用来控制该次演出的时长。

## 背景切换：background 与九种内置效果

```text
background <背景资源名> [效果类型]
```

效果类型省略时默认 none，即无动画直接切换。内置效果共九种，对应插件资源目录 assets/shaders/background_transitions/ 下的九个 shader：

- none：无动画直接切换（默认）。
- fade：淡化。
- erase：擦除。
- blinds：百叶窗。
- wave：波浪。
- vortex：旋涡。
- windmill：风车。
- cyberglitch：赛博故障。
- blink：眨眼。

效果类型也可以是自定义效果名。切换时背景场景可以用 AnimationPlayer 响应：基类按效果名优先查找对应动画（例如 fade 对应 enter_fade/exit_fade），找不到对应动画且效果非 none 时，以淡入淡出兜底。所以 background bg1 custom 这类写法是合法的——只要你的背景场景为 custom 准备了 enter_custom/exit_custom 等动画。

官方文档的四行示例：

```konado
background night_street fade
background memory_flash erase
background dream vortex
background bg1 custom
```

## 音频指令

```konado
play bgm main_theme
stop bgm
play sfx door_open
```

- play bgm [音乐名称]：播放背景音乐，即时执行、不阻塞对话。
- stop bgm：停止背景音乐。
- play sfx [音效名称]：播放音效，同样即时执行、不阻塞。

音频名称来自对应的资源列表（background_music_list 等）。语音不走这三条指令——语音挂在对话行的配音标签上，由 voice_list 解析，见上一篇。

## 同步运镜：cam

Konado 的默认模板自带相机，剧本用 cam 指令控制它：

- cam move [目标镜头ID] [过渡类型] [过渡时间]：把镜头移动到目标机位，阻塞至动画完成才继续剧情。过渡类型有三种：不填或 none 表示无动画直接切；linear 线性过渡；ease_in_out 缓入缓出。写了过渡类型但不写时间时，默认 1.0 秒。
- cam reset [过渡类型] [过渡时间]：重置到默认位置（屏幕中心、缩放 1.0）。
- cam shake [持续时间]：随机抖动，强度从强到弱，结束后自动复位，默认 1.0 秒，适合爆炸、撞击、巨大声响的瞬间。

目标镜头 ID 对应背景场景中的机位节点，下一节细说。

## 异步运镜：asyncam

```text
asyncam move | reset | shake | stop
```

asyncam 是 cam 的异步版本，四个子命令与 cam 对应指令用法一致，区别只有一条：不阻塞对话，玩家可以继续点击推进剧情。asyncam stop 会强制终止所有异步相机 Tween 并瞬间定格到最终目标，对同步 cam 没有影响。

选择建议：情绪重点镜头（告白特写、重要台词前的缓推）用同步 cam，让玩家和镜头一起等待；氛围性动效（缓慢摇移、轻微震动）用 asyncam，不打断叙事节奏。

## 机位：KonadoCameraMarker

机位是在背景场景中放置的 KonadoCameraMarker 节点：

- 在背景场景中添加名称唯一的 KonadoCameraMarker 节点，一个背景可以放置多个机位。
- 它只保存位置与缩放数据，不渲染任何画面，真正的渲染由模板中的相机完成。
- 不要把普通背景相机替换成 KonadoCameraMarker——两者职责不同，一个是数据标记，一个是渲染者。

剧本里 cam move 写的镜头 ID，就是这些 marker 节点的名称。

## 综合示例

把本篇全部指令串成一段放学后的场景。假设背景场景 school_gate 中定义了名为 closeup 的机位：

```konado
background school_gate fade
play bgm school_theme

"旁白" "放学后的校门口，风把樱花吹得漫天都是。"

actor show yuki normal at 1
actor show ren normal at 3

yuki "你终于来了。我等了你整整二十分钟。" yuki_pout_01
ren "抱歉抱歉，社团临时开了个会。"

actor change yuki angry
actor motion yuki jump 0.5
yuki "下次再迟到，我就把你锁在体育馆！"
play sfx stomp
asyncam shake

actor move ren 2
ren "别生气，今天我有礼物赔罪。"

actor change yuki surprised
actor motion yuki jump

cam move closeup ease_in_out 1.5
ren "生日快乐，小雪。"

actor show yuki happy at 1
background classroom erase
"旁白" "两人的影子被夕阳拉得很长。"

actor exit ren
cam reset linear
yuki "谢谢你。我们回家吧。"
```

逐段拆解：

- 开场用 fade 淡入背景并起 BGM，两名角色分别登场在 1 号与 3 号区块。
- yuki 通过两次 actor change 完成情绪变化（normal 转 angry 再转 surprised）；后面再次 actor show yuki happy 用的是重复 show 兼容用法——节点已存在时直接转为新状态。
- 怒气桥段配 play sfx 与 asyncam shake：抖动不必阻塞台词，玩家可以立即点击。
- ren 用 actor move 走近一步到 2 号位；cam move 推向 closeup 机位给告白特写，同步阻塞 1.5 秒保证情绪完整。
- 收尾连续三步：erase 擦除切换到教室背景，actor exit 送走 ren，cam reset 回到默认机位。

## 小结

舞台演出三件套各有分工。立绘交给 actor 指令族：show 按"区块索引"（画面等分 division 份，默认 5，建议用 1 到 division-1）登场，重复 show 转为新状态；exit 退场；move 换位；change 切状态，能提供状态帧的角色用预乘 Alpha 像素交融，否则淡出淡入（actor_state_transition_enabled 与 actor_state_transition_duration 可配置，动态媒体自动降级）；motion 播放舞台动作，时长省略按动画自身、0 禁用、正数缩放。背景交给 background：九种内置效果 none/fade/erase/blinds/wave/vortex/windmill/cyberglitch/blink，也接受自定义效果名并回退淡入淡出。音频 play bgm/stop bgm/play sfx 即时执行不阻塞。运镜分同步 cam（move/reset/shake，阻塞）与异步 asyncam（不阻塞，stop 定格全部异步 Tween）；机位由背景场景中名称唯一的 KonadoCameraMarker 定义，它只存数据，渲染交给模板相机。

## 参考链接

- [Konado 官方文档站主页](https://godothub.com/oss/konado/zh/latest/)
- [Konado GitHub 仓库（sample/demo 内含背景特效与动作示例剧本）](https://github.com/godothub/konado)
- [错误码参考](https://godothub.com/oss/konado/zh/latest/tutorial/core/error-codes.html)
