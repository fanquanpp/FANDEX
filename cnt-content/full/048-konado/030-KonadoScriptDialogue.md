---
order: 30
title: KonadoScript 基础：对话与语音
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 学习剧本文件规则与对话行语法，掌握三种说话者形式与打字速度语音标签
author: fanquanpp
updated: '2026-09-22'
related:
  - 'konado/020-KonadoArchitecture'
  - 'konado/040-KonadoStageAndCamera'
prerequisites:
  - 'konado/020-KonadoArchitecture'
---

KonadoScript 是 Konado 为视觉小说定制的创作语言。写故事的人用它讲故事：一行文本就是一句对话，不需要任何编程知识；需要演出变化时，再往行里添加指令。上一篇我们知道了 .ks 剧本会在导入或保存时被编译成虚拟机指令，本篇回到创作的起点，把你在 KonadoScript 里写得最多的一类行——对话行——彻底讲清楚：它的语法结构、说话者的三种书写形式、2.8 新增的命名参数，以及如何给一句话挂上语音。

## 学习目标

- 理解 KonadoScript 的设计理念：故事内容与程序逻辑分离。
- 记住剧本文件的基本规则：.ks 后缀、UTF-8 编码。
- 掌握对话行的语法结构：说话者、对话文本、配音标签与命名参数。
- 会写三种说话者形式：裸演员 ID、变量说话者与带引号署名。
- 会用 speed 与 interval 两个命名参数控制打字速度。
- 理解语音标签的解析方式与对话框的语音进度显示。
- 会用 showtextbox 与 hidetextbox 控制对话框显隐。

## 设计理念：故事内容与程序逻辑分离

KonadoScript 的每一条设计都围绕"故事内容与程序逻辑分离"这个核心理念展开：

- 编剧无需编程知识。对话就是一行文本，指令是少量固定的单词，编剧可以完全不看 GDScript。
- 资源通过标识符引用与脚本解耦。剧本里写的是 alice 这样的标识符，至于 alice 对应哪张贴图、哪个场景，由资源列表（例如角色列表 character_list）决定。换立绘不需要改剧本。
- 模块化指令集。登场、切背景、运镜、变量、选项各自是指令，按需组合，互不干扰。
- 文本格式跨平台、兼容 Git。纯文本的 .ks 可以用任何编辑器编写，Git 的逐行对比能清楚看到每次改动，方便团队协作。

文件规则只有两条：后缀为 .ks；编码为 UTF-8。UTF-8 不是可选项——无论手写还是从别处粘贴，保存成其他编码都可能让中文对话出问题，请在编辑器里确认编码设置。

## 对话行的语法结构

对话行的完整语法结构如下：

```text
[说话者] "对话文本" [配音标签] [参数=值 ...]
```

方括号表示该部分可以省略，也就是说最简单的一句对话只需要说话者与文本。逐段拆开：

- 说话者：三种形式之一，见下一节。
- 对话文本：角色要说的话，按语法约定写在英文双引号内。
- 配音标签：可选，写一个语音标识符，由 voice_list 资源解析成实际音频。
- 参数=值：可选的命名参数，例如 [speed=1.5]，这是 2.8 新增的特性。

## 说话者的三种形式

### 形式一：裸演员 ID

```konado
alice "你好，我叫爱丽丝！"
```

alice 是在角色资源列表（KonadoCharacterList）中注册的演员 ID。运行时系统根据 ID 找到对应角色资源，署名区显示角色名。这是最常用的形式，适合所有"有立绘、有档案"的角色。

### 形式二：变量说话者

```konado
set $speaker "alice"
$speaker "今天由变量决定谁在说话。"
set %current_speaker "alice"
%current_speaker "持久变量同样可以作为说话者。"
```

说话者位置也可以写 $var 或 %var 形式的变量，变量的值是演员 ID 字符串。适合"谁在说话要到运行时才知道"的桥段，比如变装、附身、电话另一头的神秘人。$ 开头是临时变量，% 开头是持久变量，变量系统的完整规则见本模块后续的变量篇，这里先认识写法。

### 形式三：带引号署名

```konado
"narrator" "暴风雨越来越猛烈了..."
```

说话者位置写一段带英文双引号的纯文本，它不对应任何演员资源，署名区原样显示这段文字，适合旁白（narrator）与不需要立绘的临时发言。这种署名支持插值——可以在其中引用变量，运行时替换为实际值；写成空字符串则会完全隐藏署名，做纯画面叙事时很有用。

## 命名参数：speed 与 interval

2.8 为对话行新增了命名参数（named parameters）特性，首先提供的是两个控制打字速度的参数：

- speed：本句的打字速度倍率，必须大于 0。1.5 表示比平时快一半，2.0 表示两倍速。
- interval：每个字符的打字间隔秒数，数值越小打得越快。

两者不能同时使用：给了 speed 就不要再给 interval。写法放在行尾的方括号中：

```konado
alice "这一句会显示得更快。" [speed=1.5]
alice "这一句每个字符间隔 0.1 秒。" [interval=0.1]
```

使用直觉：抢话、惊呼、紧张台词用 speed 提速；一句慢慢浮现的低语用更长的 interval 放慢节奏。

## 给对话挂语音

在对话行的配音标签位置写一个语音标识符，播放时由 voice_list 资源解析为实际音频：

```konado
Kona "……" voice_01
```

语音成功播放时，对话框默认会显示这段音频的播放进度；如果你不想要这个进度显示，可以在 KonadoDialogueBox 的 show_voice_progress 属性中关闭。

两件配套的事值得知道：其一，语音标识与演员 ID 一样是"剧本里写名字、资源里给内容"的解耦设计，配音换文件不用动剧本；其二，插件自带语音进度显示模板 voice_progress_display.tscn，默认对话框的进度显示正是基于这套能力实现的。配音量大时，建议把语音文件命名与标识符对应好，便于批量维护。

## 官方示例逐行讲解

下面是官方文档中的完整示例，一次用齐了本篇所有知识点：

```konado
alice "你好，我叫爱丽丝！" alice_intro_01
alice "这一句会显示得更快。" [speed=1.5]
"narrator" "暴风雨越来越猛烈了..."
set $speaker "alice"
$speaker "今天由变量决定谁在说话。"
set %current_speaker "alice"
%current_speaker "持久变量同样可以作为说话者。"
set $guest_index 2
"访客 $guest_index" "很高兴见到你。"
```

逐行看：

1. 第 1 行：裸演员 ID 加配音标签。alice 说话，行尾的 alice_intro_01 是语音标识，由 voice_list 解析播放。
2. 第 2 行：同一说话者继续说，speed=1.5 让这句打字更快。
3. 第 3 行：带引号署名 "narrator"，纯文本旁白，不依赖任何演员资源。
4. 第 4 行：set 指令给临时变量 $speaker 赋值 "alice"。
5. 第 5 行：$speaker 作为说话者，运行时替换为 alice。
6. 第 6 行：set 给持久变量 %current_speaker 赋值。
7. 第 7 行：持久变量同样可以担任说话者。
8. 第 8 行：临时变量 $guest_index 存入数字 2。
9. 第 9 行：署名 "访客 $guest_index" 中发生插值，玩家实际看到"访客 2"。

其中 set 的"指令 变量 值"写法只是变量操作的一种形态，变量系统会在后续篇章完整展开。

## 控制对话框显隐：showtextbox 与 hidetextbox

```konado
hidetextbox 0.5
"narrator" "对话框隐藏后，画面完全交给立绘与背景。"
showtextbox 0.5
alice "我回来了。"
```

showtextbox 与 hidetextbox 分别显示和隐藏对话框，后面的 duration 参数决定行为：

- 省略或 0.0：立即显示或隐藏，不等待。
- 大于 0：播放淡入或淡出动画，并等动画完成后再继续下一行。
- hidetextbox 完成后还会清除角色名与文本内容，重新显示时是一块干净的面板。

典型用途：全屏立绘鉴赏、章节标题、需要玩家看清画面的关键桥段。

## 常见误区与检查清单

新手最常在以下四处踩坑，写完剧本照着检查一遍能省掉大部分报错：

- 编码不是 UTF-8。从 Word、聊天窗口粘贴文本后另存时，编码可能被改成 GBK 之类，中文对话会出问题。永远确认 .ks 文件以 UTF-8 保存。
- speed 与 interval 同时出现。两者互斥，给了 speed 就删掉 interval，反之亦然；speed 还必须大于 0。
- 引号用了中文全角引号。对话文本、署名、选项内容约定的都是英文双引号，全角引号不会被按语法解析。
- 以为 hidetextbox 只是"看不见"。它完成后会清除角色名与文本，如果后续想保留上一句内容再隐藏，应使用 KonadoDialogueBox 的 hide_dialogue_box 系列方法（保留内容、暂时隐藏），而不是剧本里的 hidetextbox。

## 小练习

试着不看答案，写一段三句对话，并让中间一句加速播放。

参考答案：

```konado
alice "第一句，正常速度。"
alice "第二句，加速播放。" [speed=2.0]
alice "第三句，恢复正常。"
```

把内容保存为 UTF-8 编码的 .ks 文件。启用插件后双击它即可在 Godot 内置的 KonadoScript 编辑器中打开（保存时会自动重新编译运行时数据），再通过模板场景播放验证，观察中间一句的打字速度差异。

## 小结

KonadoScript 以"故事内容与程序逻辑分离"为理念：编剧写纯文本就能推进剧情，资源靠标识符解耦，指令模块化组合，纯文本格式天然跨平台并兼容 Git。对话行的语法是 [说话者] "对话文本" [配音标签] [参数=值 ...]：说话者可以是裸演员 ID、值为演员 ID 的变量（$ 临时或 % 持久），或一段支持插值、空串隐藏署名的带引号文本；行尾可以挂语音标识（由 voice_list 解析，播放成功时对话框默认显示音频进度，可在 KonadoDialogueBox.show_voice_progress 关闭）；2.8 起还能用 speed（倍率，必须大于 0）或 interval（每字符间隔秒数，与 speed 互斥）微调打字节奏。showtextbox 与 hidetextbox 按 duration 控制对话框淡入淡出，hidetextbox 完成后清除角色名与文本。

## 参考链接

- [Konado 官方文档站主页](https://godothub.com/oss/konado/zh/latest/)
- [Konado GitHub 仓库（sample/demo 内含官方示例剧本）](https://github.com/godothub/konado)
- [错误码参考](https://godothub.com/oss/konado/zh/latest/tutorial/core/error-codes.html)
