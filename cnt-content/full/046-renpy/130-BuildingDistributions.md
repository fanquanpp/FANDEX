---
order: 130
title: 打包发布与全平台分发
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 配置构建规则生成 Windows Mac Linux 安装包，了解移动端与 Web 发布路径及存档兼容要点
author: fanquanpp
updated: '2026-09-22'
related:
  - 'renpy/010-RenPyOverviewAndSetup'
  - 'renpy/100-SaveLoadAndRollback'
prerequisites:
  - 'renpy/010-RenPyOverviewAndSetup'
---

剧本写完、测试通过，最后一步是把游戏交到玩家手里。Ren'Py 的发布体系以 launcher 的 Build Distributions 为中心：配置少量构建规则，就能一次产出覆盖 Windows、Mac 与 Linux 的压缩包；Android、iOS 与 Web 等平台各有官方专项文档承接。发布环节还有一个常被忽视的要点——让老玩家的存档在新版本里继续可用。

本篇先给出发布前的检查清单，再讲默认包与基础构建配置，然后用 build.classify 讲清"哪些文件进入发行版"，最后覆盖归档、old-game 存档兼容与各平台路线图。

## 学习目标

- 掌握发布前的完整检查清单；
- 知道 Build Distributions 默认能构建哪几种包，以及二次打包的权限陷阱；
- 会配置 build.name、build.directory_name 与 build.executable_name，并放置平台图标；
- 会用 build.classify 决定哪些文件进入发行版；
- 会用 build.documentation 声明文档、用 build.package 定义自定义包、用 build.archive 建立归档；
- 理解 old-game 目录与旧存档兼容的关系及推荐流程；
- 知道 Android、iOS、Web 等平台的官方文档入口与最低系统要求。

## 发布前的检查清单

官方建议的发布流程依次是：

1. 更新 Ren'Py 到最新版本，并阅读 Incompatible Changes（不兼容变更）文档，确认游戏没有踩到行为变更点；
2. 用 launcher 的 Check Script (Lint) 检查潜在错误；
3. 选择 Build Distributions 生成压缩包；
4. 认真测试，也可以请朋友帮忙做 Beta 测试；
5. 发布到 itch.io 等平台；也可以提交到 Ren'Py Games List 与 Lemma Soft 论坛，让更多玩家看到作品。

Lint 值得单独强调：它会扫描未定义变量、缺失文件、标签冲突等几十类问题，相当于免费的质检员，发布前必跑一次。

## Build Distributions 默认能打出哪些包

不做任何配置，Build Distributions 就能构建这些包：

- PC: Windows and Linux：一个 zip，同时覆盖 Windows 与 Linux 的 x86_64 平台；
- Linux：tar.bz2 格式的 Linux 包；
- Macintosh：zip 格式，包含 Intel 与 Apple Silicon 两种架构，游戏数据收进 .app 内部；
- Windows：zip 格式；
- Windows, Mac, and Linux for Markets：面向 itch.io、Steam 等商店上传流程的整合包。

一个重要警告：zip 与 tar.bz2 中保存着 Linux/Mac 运行所需的权限信息。如果你在 Windows 上解开这些包再重新打包上传，玩家在 Linux/Mac 上运行将不受支持。发布时请直接上传构建产物，不要手工二次打包。

## 基础构建配置

构建变量写在 init python 块中，默认值可以在 options.rpy 里找到：

```renpy
init python:

    build.name = "mygame"
    build.directory_name = "mygame-1.0"
    build.executable_name = "mygame"
```

- build.name：自动生成的目录名与可执行名的基础，不应包含空格、冒号、分号；
- build.directory_name：压缩包内部的目录名；构建产物输出到项目旁的 <directory_name>-dists 文件夹；
- build.executable_name：玩家实际点击的可执行文件名——Windows 上是 mygame.exe，Mac 上是 mygame.app，Linux 上是 mygame.sh。

图标：把 icon.ico（Windows 图标）与 icon.icns（Mac 图标）放在 base 目录（项目根目录）下即可，格式转换需要自行完成。窗口内的图标则由 GUI 的 window_icon.png 负责，两者互不冲突。

## 用 build.classify 决定文件的归属

build.classify(pattern, file_list) 把匹配模式的文件归入指定列表，规则有四条：

- 模式从文件路径开头一直匹配到结尾，第一条命中的规则生效；
- / 匹配根目录；* 匹配不含目录分隔符的任意字符；** 匹配任意字符（含目录分隔符）；
- 七种默认文件列表：all、linux、mac、windows、renpy、android 与 archive（其中 archive 是归档列表）；
- 没有被任何规则匹配的文件默认进入 all，也就是进入所有平台的发行版；分类到 None 则表示把文件排除出发行版。

官方示例：

```renpy
# Include README.txt
build.classify("README.txt", "all")
# But exclude all other txt files.
build.classify("**.txt", None)
# Add png and jpg files in the game directory into an archive.
build.classify("game/**.png", "archive")
build.classify("game/**.jpg", "archive")
```

四行读完就能体会模式匹配的用法：README.txt 单独放行进 all，其余 txt 全部排除，game 目录下的图片收进归档。注意第一条规则优先生效，所以"先写特例、再写通配"是标准写法。

## 文档文件与自定义包

build.documentation("*.txt") 声明哪些文件是文档。文档文件会被放两份：Mac 应用内一份、应用外一份，方便用户在解开压缩包后直接阅读。

默认包不够用时，用 build.package 定义自己的包：

```renpy
build.package("all-premium", "zip", "windows mac linux renpy all bonus")
```

三个参数依次是包名、包类型（zip、tar.bz2 或 directory）与文件列表组合。想给赞助者发一个含额外素材的"豪华版"，就是在这条语句上做文章。

## 归档：把游戏数据收进 .rpa

默认情况下，archive 列表里的文件会打进 archive.rpa 归档文件。想自己组织归档，先用 build.archive 声明：

```renpy
build.archive("scripts", "all")
```

之后再 classify 到 scripts 列表的文件就会进入 scripts.rpa。官方同时提醒：归档要谨慎。保持文件以普通形式开放，有利于游戏在未来新平台上直接运行，也便于排查问题——归档换来的只是"文件不易被翻看"，却可能挡住未来的兼容性。

## old-game：保住老玩家的存档

游戏发新版本后，脚本内容变了，老玩家的存档还能读吗？Ren'Py 的方案是 old-game 目录：在项目根目录下建一个 old-game/（与 game/ 结构相同），里面保存上一发行版对应的 .rpyc 编译文件。

构建新版本时，引擎借助 old-game 中的旧 .rpyc 保持对话与场景 ID 的稳定，从而兼容旧存档。这正是存档篇讲过的"控制流路径不保存、只存当前语句位置"机制的配套设计：只要语句身份不变，旧存档才能找回自己的位置。

推荐流程：构建新版本前，在 launcher 中启用 Force Recompile（强制重新编译），并执行 Update old-game（更新 old-game 目录），让旧版编译产物与新脚本保持同步。

## 平台专项路线

电脑三平台之外，Ren'Py 还有各自的专项发布路径，官方提供独立文档页：

- Android：https://www.renpy.org/doc/html/android.html
- iOS：https://www.renpy.org/doc/html/ios.html
- Web（HTML5，Beta）：https://www.renpy.org/doc/html/web.html
- ChromeOS：https://www.renpy.org/doc/html/chromeos.html
- 树莓派（Raspberry Pi）：https://www.renpy.org/doc/html/raspi.html

进阶功能同样有专页：应用内购买（iap.html）、游戏更新器（updater.html）、大游戏下载器（downloader.html），完整地址形如 https://www.renpy.org/doc/html/updater.html。

最后交代硬件门槛：Ren'Py 8 大致要求 Windows 10 及以上、macOS 10.10 及以上、Linux 以 Ubuntu 20.04 及以上为基准；移动端要求 Android 5.0+ 与 iOS 11+。目标玩家的设备系统低于这些版本时，发行计划要提前调整。

## 小结

- 发布五步：更新引擎读 Incompatible Changes、跑 Lint、Build Distributions、认真测试（可加 Beta）、上架 itch.io 等平台；
- 默认包覆盖 PC 双平台 zip、Linux tar.bz2、Mac zip、Windows zip 与面向商店的 Markets 包；
- zip/tar.bz2 带权限信息，Windows 上解包再打包会导致 Linux/Mac 运行不受支持；
- build.name、build.directory_name、build.executable_name 三个名字各司其职；icon.ico 与 icon.icns 放 base 目录；
- build.classify 首条规则生效，未分类进 all，分类到 None 即排除；
- build.documentation 声明文档，build.package 定义自定义包，build.archive 组织 .rpa 归档，归档需谨慎；
- old-game/ 保存上一发行版的 .rpyc 以稳定对话与场景 ID，配合 Force Recompile 与 Update old-game 兼容旧存档；
- Android、iOS、Web、ChromeOS、树莓派各有官方专项文档页，另有 iap、updater、downloader 等进阶功能页。

## 参考链接

- [打包发布（官方文档）](https://www.renpy.org/doc/html/build.html)
- [快速上手（官方文档）](https://www.renpy.org/doc/html/quickstart.html)
- [Android 打包（官方文档）](https://www.renpy.org/doc/html/android.html)
- [iOS 打包（官方文档）](https://www.renpy.org/doc/html/ios.html)
- [Web（HTML5）发布（官方文档）](https://www.renpy.org/doc/html/web.html)
- [存档、读档与回滚（官方文档）](https://www.renpy.org/doc/html/save_load_rollback.html)
