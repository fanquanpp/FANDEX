---
order: 90
title: 场景化资源与界面定制
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 用场景而非图片配置角色背景，实现状态别名与转场帧，自定义对话框与打字机效果
author: fanquanpp
updated: '2026-09-22'
related:
  - 'konado/070-KonadoDialogueManagerApi'
  - 'konado/100-KonadoLocalizationAndExtensions'
prerequisites:
  - 'konado/070-KonadoDialogueManagerApi'
---

几何构成（speed-rouge）的美术给主角做了一套 Live2D 模型， UI 同学想换掉默认对话框的配色——两件事都指向同一个问题：Konado 的资源能不能不是"一张图"？答案是：角色与背景本质上都是场景（Scene），图片只是场景的一种最简单形态。默认模板里的角色是一张张立绘图片、背景是一张张静图，这对快速起步足够了；但你想让角色是 Live2D 模型、背景是带动画的视频、对话框换自己的样式时，Konado 的回答不是"等官方支持"，而是本篇要讲的场景化协议。

本篇分两条线：前半部分讲"场景化资源"的协议——角色场景与背景场景如何被系统驱动，如何实现状态别名与像素交融转场；后半部分讲"界面定制"——替换对话框与打字机的方法与注意事项。

## 场景化资源理念

Konado 2.8 中，角色与背景资源从"图片字段"全面转向"场景"：资源列表（character_list、background_list）里保存的是 PackedScene 引用，而不是贴图路径。剧本命令因此只表达剧情意图——actor show kona normal at 2 的意思是"让 kona 以 normal 状态出现在 2 号位"，至于 kona 是一张 PNG、一个 Spine 骨骼动画、一个 Live2D 模型还是一段视频，剧本一概不知、也一概不关心，全部由资源场景自己负责表现。

这个理念换来极大的表现自由：图片、视频、Spine、Live2D、shader 都可以成为你的"立绘"或"背景"，只要它们被包装成符合协议的场景。

## 角色场景协议

自定义角色场景的写法是继承 KonadoCharacterSceneBase。系统实例化你的 character_scene 后，会调用它的 apply_status(status_name) 来驱动状态切换，而你的任务是覆写内部方法：

- _apply_status(resolved_status_name, original_status_name)：必需。状态真正应用的地方，resolved_status_name 是经过别名解析后的最终状态名，original_status_name 是剧本里的原始名。在这里切换动画、更换贴图、驱动 Live2D 参数；
- _has_status(...)：可选的状态查询，系统用来询问"你支持某个状态吗"。必须无副作用、幂等；
- _get_status_transition_frame(...) 与 _get_current_status_transition_frame(...)：可选的状态转场帧协议。

最小骨架如下：

```gdscript
extends KonadoCharacterSceneBase

# 必需：系统解析出状态后调用，负责真正切换表现
func _apply_status(resolved_status_name, original_status_name):
    # 例如切换到对应的动画或贴图
    pass
```

### 状态转场：像素交融与自动降级

当角色从 normal 切到 angry 时，怎么过渡？Konado 提供两条路径：

- 实现了转场帧协议的角色：在 _get_status_transition_frame / _get_current_status_transition_frame 中返回一个新建的独立 KonadoCharacterTransitionFrame 实例，系统就能用预乘 Alpha shader 做真正的像素交融（两张状态的画面逐像素混合），效果细腻；
- 未实现协议的角色：自动降级为"淡出、应用状态、淡入"的安全转场，简单可靠。

转场行为在 KonadoStageController（舞台控制器）的检查器里配置：actor_state_transition_enabled 控制是否启用（默认 true），actor_state_transition_duration 控制转场时长（默认 0.3 秒）。剧本会等转场完成后才继续执行，保证演出节奏可控。对于视频、Spine、Live2D 这类动态媒体，系统会自动降级处理，且不会重复运行动态内容。

## 状态别名 status_aliases

剧本里的状态名应该讲故事："angry""smile""cry"；而美术产出的资源名往往长这样："face_anger_01""face_smile_04"。状态别名（status_aliases）就是在两者之间做映射的配置表：把剧本语义名映射到资源实际名，例如 angry 映射到 face_anger_01。

配置后，剧本继续写 actor change kona angry，系统解析状态名时先查别名表，把 face_anger_01 传给你的 _apply_status。好处是双向的：编剧全程使用语义名，剧本可读性不受美术规范影响；美术改版重命名资源时，只需要更新别名表，剧本一行不动。

## 角色内部动作与舞台动作

角色的"动作"分两层，归属不同：

- 内部动作（眨眼、呼吸、Live2D motion 等角色自己身上的细节）：由角色场景的 _play_action(action_name) 负责播放，完成后调用 finish_action(action_name) 通知系统动作结束；
- 舞台动作（震动、跳跃等整个角色的位移演出）：由剧本的 actor motion 指令触发，走 KonadoActorMotionLayer，它播放的是场景内 AnimationPlayer 里的同名动画。官方建议让动画作用在 CharacterMount 节点上。

actor motion 可带时长参数：不写时长按动画自身时长播放，写 0 禁用动画，写正数则把动画缩放到该时长。

## 背景场景协议

背景场景继承 KonadoBackgroundSceneBase。背景列表（background_list）的每一项由两个字段组成：background_name（剧本里写的名字）与 background_scene（场景引用）。

背景场景可以通过 AnimationPlayer 响应切换，动画命名遵循一套约定：

- enter / exit：兜底动画，任何切换效果都会尝试播放它们；
- enter_fade / exit_fade：fade（淡化）效果专用的进入与退出动画；
- enter_custom / exit_custom：custom 效果专用的进入与退出动画。

查找规则是按效果名优先：剧本写 background night_street fade 时，系统优先找 enter_fade/exit_fade；写 custom 时找 enter_custom/exit_custom；找不到对应动画且效果不是 none 时，基类默认用淡入淡出兜底，保证任何情况下切换都不至于生硬。

如果只是想用一张图片当背景，官方给出 TextureRect 的推荐配置：锚点铺满父节点（Full Rect）、Expand Mode 设为 Ignore Size、Stretch Mode 设为 Keep Aspect Covered。这三项保证图片在任意窗口比例下正确铺满且不变形。

### 背景转场的两条性能路径

切换背景时的转场画面怎么截取？默认路径是用 SubViewport 捕获完整的背景场景，通用但有一定开销。如果你的背景是静态图片，可以选用 DIRECT_TEXTURE 性能路径：系统会递归查找场景里第一个 TextureRect 或 Sprite2D 直接取其纹理；更彻底的办法是覆写 get_transition_texture() -> Texture2D，自己告诉系统转场该用哪张纹理。对以静图为主的视觉小说，这个优化能明显降低切换瞬间的开销。

## 自定义对话框

想换对话框样式？规则只有一条铁律：先复制模板 .tscn 到自己项目的目录（例如 res://ui/dialogue/）再修改副本，绝不直接改 res://addons/konado/ 内的文件——插件升级会覆盖你的修改。

步骤：

1. 把模板对话框场景复制到自己目录，改名为你自己的对话框（内含 KonadoDialogueBox）；
2. 在副本上随意改造：换皮肤、改布局、加装饰节点；
3. 把副本中的 KonadoDialogueBox 赋给 dialogue_manager.dialogue_box（检查器拖拽即可），管理器此后使用你的对话框。

### 显隐 API：hide 与 dismiss 的区别

KonadoDialogueBox 提供四个显隐方法，官方代码照录：

```gdscript
dialogue_box.hide_dialogue_box()                 # 保留内容，暂时隐藏
dialogue_box.hide_dialogue_box_with_duration(0.5)
dialogue_box.dismiss_dialogue_box()              # 隐藏并清除内容（hidetextbox 用此）
dialogue_box.dismiss_dialogue_box_with_duration(0.5)
```

两族方法的语义差异务必分清：hide_dialogue_box 系列（含 with_duration 变体）只是暂时隐藏，内容和角色名都还在，适合"暂时让出画面"的演出；dismiss_dialogue_box 系列隐藏的同时清除内容，剧本指令 hidetextbox 用的就是这一族。自定义界面若要复刻默认行为，按同样的语义选用。

## 打字机定制

KonadoTypewriterText（打字机文本）是 KonadoDialogueBox 里的文本展示核心，特性相当丰富：

- GPU 加速的逐字符淡入，使用专用 shader（typewriter_fade.gdshader），性能好、效果细腻；
- 支持 BBCode 富文本标签：b、i、u、s、color、font；
- 淡入方向支持任意角度，配合空间混合（spatial_blend）可以做出文字"从斜向光晕中浮现"的效果；
- 原生支持 CJK（中日韩）字符。

常用 API 与属性：set_bbcode(text, autoplay) 设置富文本、start() 开始播放、skip() 跳过、reset() 重置、is_playing() 与 is_finished() 查询状态、get_progress() 获取进度；属性 chars_per_second 默认 25.0（每秒字符数）、fade_width 默认 3.0（淡入渐变宽度）、fade_angle 控制淡入角度、spatial_blend 默认 0.15、auto_start 默认 true。信号有四个：typewriter_started、typewriter_finished、typewriter_skipped、character_revealed(index)，最后一个每揭示一个字符就发一次，做逐字音效或震动反馈就靠它。

官方示例照录：

```gdscript
var typewriter = $KonadoTypewriterText
typewriter.set_bbcode("[color=yellow]你好[/color]，[b]玩家[/b]！")
typewriter.start()
```

### 打字机音效配置

打字机音效在 KonadoDialogueBox 上配置，导出项包括：enable_typing_effect_audio（默认 true，开关）、typing_effect_audio（AudioStream 资源）、audio_trigger_chance（默认 0.8，触发概率）、min_audio_interval 与 max_audio_interval（默认 0.02 与 0.08 秒，触发间隔随机区间）、audio_volumn（默认 0.6，音量）。

一个必须照抄的细节：音量属性的官方实际拼写就是 audio_volumn（volume 的笔误）。在代码或文档里引用时请按实际拼写写，否则属性找不到。内置音效位于 res://addons/konado/assets/audio/typewriter/（typing_01 到 typing_04 四个 wav）；自定义音效文件应放在插件目录之外（比如你自己的 assets 目录），避免插件升级时被覆盖。

## 图层约定：别碰 120 及以上

自定义界面时最后一条红线是 CanvasLayer 图层占用。默认模板的约定是：1 为舞台与演出层，10 为对话框、选项与工具栏，50 为存档界面，100 为设置与成就等模态面板，110 为成就解锁等短时通知，120 为运行时错误提示。你的自定义界面可以选用空闲层级，但不要占用 120 及以上的层——那里是运行时错误提示的专属区，被遮挡会让你看不见故障信息。

## 坑点与自检

- 直接改 addons/konado/ 里的对话框模板，插件升级后改动全丢——复制到项目目录改副本，再赋回 dialogue_box；
- _has_status 里做了状态切换或播放动画——它是查询接口，必须无副作用、幂等，真正的切换在 _apply_status；
- 视频角色想实现像素交融转场，怎么都配不出来——动态媒体自动降级为安全转场，这是设计行为；
- 美术把 angry 重命名成 face_anger_01，剧本里批量改动——正确做法是改 status_aliases 别名表，剧本一行不动；
- 调打字机音量写 audio_volume 报属性不存在——官方拼写就是 audio_volumn，照抄；
- 自定义面板占了 CanvasLayer 120，运行时错误提示被盖住看不见——120 及以上是错误提示专属层，选空闲层级；
- 自检问题一：_apply_status 的两个参数分别是什么？（别名解析后的最终状态名；剧本里的原始状态名）
- 自检问题二：background night_street fade 的动画查找顺序？（先找 enter_fade/exit_fade，找不到且效果非 none 时退回淡入淡出兜底）
- 自检问题三：静态图片背景想降低转场开销怎么办？（DIRECT_TEXTURE 性能路径，或覆写 get_transition_texture 自己指定纹理）

## 练习

1. 写一个最小自定义角色场景：继承 KonadoCharacterSceneBase，覆写 _apply_status 用颜色块代替立绘切换状态，注册进 character_list 后用 actor change 验证；
2. 给你的角色配 status_aliases（语义名 angry 映射到任意资源名），然后故意改别名表而不改剧本，验证剧本行为不变；
3. 复制默认对话框改配色与布局，赋回 dialogue_box；再分别调用 hide_dialogue_box 与 dismiss_dialogue_box，观察"保留内容"与"清除内容"的差别。

## 参考链接

- [Konado 官方文档（中文）](https://godothub.com/oss/konado/zh/latest/)
- [Konado 开发定制教程](https://godothub.com/oss/konado/zh/latest/tutorial/develop/)
- [Konado 核心概念教程](https://godothub.com/oss/konado/zh/latest/tutorial/core/)
- [Konado GitHub 仓库](https://github.com/godothub/konado)
