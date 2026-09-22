---
order: 10
title: Ren'Py 入门与项目创建
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 认识 Ren'Py 视觉小说引擎的定位版本与许可证，完成安装并创建第一个可运行的项目
author: fanquanpp
updated: '2026-09-22'
related: ['renpy/020-FirstScriptSayAndCharacters', 'renpy/130-BuildingDistributions']
prerequisites: []
---

想讲一个由文字、图像与声音交织而成、还能让读者做出选择的故事吗？Ren'Py 就是为此而生的引擎：它开源免费、可以商用，自带的脚本语言简单到零基础的创作者也能快速上手，同时又内嵌 Python，足以支撑复杂的模拟玩法。本篇带你认识 Ren'Py 的定位、版本与许可证，完成下载安装，并创建出第一个可以点击运行的项目，为后面编写剧本打好地基。

## 学习目标

- 说清 Ren'Py 的定位：视觉小说引擎（visual novel engine），以及它除了视觉小说还能做什么；
- 了解最新发行版 8.5.3，以及 8.4 与 8.5 两个版本线的主要新特性；
- 准确理解 Ren'Py 的许可证构成，知道分发游戏时需要满足 LGPL 要求；
- 在 Windows、macOS 或 Linux 上完成安装并启动 Launcher；
- 试玩两个官方示例项目 The Question 与 Tutorial；
- 用 Launcher 创建一个新项目，认识项目目录中每个文件夹与文件的作用。

## Ren'Py 是什么

官方对它的定义只有一句话："Ren'Py is a visual novel engine"，即 Ren'Py 是一个视觉小说引擎（visual novel engine）。它被全球数千名创作者使用，帮助创作者用文字、图像和声音讲述可交互的故事，作品可以运行在电脑与移动设备上。

"视觉小说"这个名字容易让人以为它只能做一种游戏，其实不然：Ren'Py 既能制作传统的视觉小说（visual novel，以对话文本推进的图文故事），也能制作人生模拟类游戏。这背后是两套能力的配合：

- 脚本语言：Ren'Py 自带一套非常易学的脚本语言，任何人都能高效编写大型视觉小说。写一段对话只需一行文本，写一个选项只需几行缩进块，完全不需要先系统学完一门编程语言。
- 内嵌 Python：脚本中可以直接使用 Python，其能力足以支撑复杂的模拟游戏。引擎本体也是用 Python 编写的，自 8.4 版起所有平台使用 Python 3.12。

对零基础的学习者来说，这意味着一条平滑的上升曲线：最初你只需写对话，之后按需逐步引入变量、条件、界面与动画，而不必一上来就面对完整的编程环境。

## 开源、免费与许可证

Ren'Py 是开源软件（open source software），免费用于商业用途——你可以用它做游戏并上架收费，不需要向引擎作者支付分成或授权费。

许可证（license）方面有两点需要准确理解：

- Ren'Py 的大部分代码采用 MIT 许可证（MIT License），这部分非常宽松；
- 另有一部分代码源自 GNU LGPL，因此用 Ren'Py 制作的游戏在分发时必须满足 LGPL 的要求。发布游戏前建议通读一遍官方许可证文档，确认自己的分发方式合规。

此外，Ren'Py 的二进制包还捆绑了若干第三方组件（如 ANGLE、FFmpeg、Freetype 等），它们各有各的许可证。日常使用无需操心，但如果你在做合规审查，可以逐项核对。

## 版本：8.4 与 8.5 带来了什么

截至本文写作时，最新的官方发行版是 8.5.3（2026 年 5 月发布）。从 8.4.0（2025 年 7 月发布）起，Ren'Py 不再维护与 8.x 配对的旧 7.x 版本线，新项目直接从 8.x 开始即可。

8.4 版本的主要新特性包括：

- 升级到 Python 3.12，报错信息可以定位到行内的具体子表达式，排查语法错误更方便；
- 大型项目的脚本加载时间减少约一半，游戏体量越大越能感受到差别；
- 新增 GLTF 模型加载（GLTFModel displayable）；
- 新增 Traceback Saves：脚本抛出异常时自动保存一个 _tracesave 存档槽，方便开发期回溯现场；
- 新增 libs 与 mods 目录约定（即 game/libs 与 game/mods）。

8.5 版本的主要新特性包括：

- Web 平台支持 Live2D；
- 引入自动化测试框架，可以为游戏编写测试；
- 支持 WOFF2 字体格式；
- 局部标签（local label）的声明规则放宽。

初学者不必逐条研究这些特性，先记住一个原则：直接使用最新版。等具体功能用到时，再回头查官方文档即可。

## 支持的平台

Ren'Py 制作的作品可以发布到相当广的平台：

```text
Windows 10+
Mac OS X 10.10+
Linux（x86_64 与 ARM）
Android 5.0+
iOS 11+
HTML5/WebAssembly（Web 版，目前为 Beta）
```

同一份剧本，稍加配置就能同时面向桌面、手机与浏览器玩家发布，这是 Ren'Py 相对许多同类工具的一大优势。

## 安装并启动 Launcher

安装过程在不同系统上略有差异：

- Windows：从官网下载后双击可执行文件，会解压出一个 renpy-<版本号> 文件夹，运行其中的 renpy.exe 即可；
- macOS：挂载下载的磁盘镜像后，把整个文件夹复制到电脑上的其他位置，再运行它，不要直接在镜像里运行；
- Linux：解压 tarball 后运行 renpy.sh。

启动后看到的就是 Launcher（启动器）。它是你创建项目、编辑脚本、试玩运行与打包发布的中枢，以后几乎所有操作都从这里出发。Launcher 支持多语言界面：点击窗口右下角的 preferences 即可切换语言，中文界面可以降低不少上手门槛。

## 先玩两个官方示例

在动笔写代码之前，建议先玩一遍 Launcher 首屏提供的两个官方示例项目：

- The Question：一个几分钟就能通关的微型视觉小说，展示了对话、选项、图像与结局的完整骨架；
- Tutorial：官方交互式教程，边玩边讲，覆盖脚本语言与常用功能。

在 Launcher 中选中示例项目，点击 "Launch Project" 即可预览。玩的时候不妨留意三件事：什么时候出现选项、画面如何切换、以及能不能用鼠标滚轮回看上文（这个功能叫回滚，rollback）。这些行为你很快就能亲手写出来。

## 创建第一个项目

点击 Launcher 首屏的 "Create New Project"，按向导走四步：

1. 选择项目目录：Ren'Py 会把你的所有项目放在同一个目录下统一管理；
2. 输入项目名；
3. 选择分辨率（resolution）：官方建议 1280x720，这是画质与文件体积之间的良好折中；
4. 选择配色方案（color scheme）：决定界面与对话框的配色基调。

完成后 Ren'Py 会生成一个立即可运行的模板项目：它自带占位图片素材，并且已经内置了回滚、存档与读档功能。这些通常需要开发者自己实现的"基础设施"，Ren'Py 全部白送。点击 "Launch Project" 就能玩到自己空白的第一个场景。

## 认识项目目录结构

打开项目文件夹，你会看到一套固定的组织方式：

```text
game/
    audio/          音频文件
    cache/          缓存，勿编辑
    gui/            界面（GUI）用图
    images/         图片素材
    tl/             翻译文件
    gui.rpy         界面变量
    options.rpy     项目配置与构建变量
    screens.rpy     界面定义
    script.rpy      剧本脚本
```

逐个说明：

- script.rpy 是你的剧本入口，但 Ren'Py 并不要求把所有内容写在这一个文件里——你可以随意增删任何 .rpy 文件，引擎会把它们合并看待。体量上来之后，按章节拆分成多个文件是好习惯。
- options.rpy 保存项目配置与构建（打包）变量；gui.rpy 保存界面变量；screens.rpy 定义界面。前期你主要和 script.rpy 打交道，其余文件认识即可。
- audio/ 用来放音频，images/ 用来放图片，gui/ 放界面用图，tl/ 放翻译文件；cache/ 是引擎的缓存目录，请勿编辑。
- 你可能还会看到 .rpyc 文件（例如 script.rpyc）。它们是 Ren'Py 从 .rpy 编译出来的产物，请勿手动编辑，也不要删除。
- .rpy 文件的命名有一个禁区：文件名不能以 00 开头，这个前缀保留给 Ren'Py 自己的文件使用。另外从 8.5.0 起，以点开头的 .rpy 文件不再被加载。

## 选择编辑器

在 Launcher 中选中项目后，在 "Edit File" 下方选择 script.rpy，Launcher 会调用编辑器打开它。第一次编辑时 Ren'Py 会要求你选择一个编辑器（editor），官方推荐 Visual Studio Code。选好之后，以后每次从 Launcher 点开脚本都会直接进入你熟悉的编辑器。

## 小结

- Ren'Py 是开源免费、可商用的视觉小说引擎，也能胜任人生模拟类游戏；脚本语言易学，自 8.4 起全平台内嵌 Python 3.12。
- 许可证以 MIT 为主，但包含源自 LGPL 的代码，分发游戏时须满足 LGPL 要求；捆绑的第三方组件另有各自的许可证。
- 最新发行版为 8.5.3（2026 年 5 月）；8.4 带来 Python 3.12、脚本加载提速约一半、GLTF、Traceback Saves 与 libs/mods 目录，8.5 带来 Web 端 Live2D、自动化测试框架与 WOFF2 字体。
- 作品可发布到 Windows 10+、macOS 10.10+、Linux、Android 5.0+、iOS 11+ 与 Web（Beta）。
- 安装后一切操作围绕 Launcher 展开；先玩 The Question 与 Tutorial，再以 1280x720 分辨率创建新项目。
- 项目由 audio/、gui/、images/、tl/ 等目录与 options.rpy、gui.rpy、screens.rpy、script.rpy 等文件组成；.rpyc 是编译产物勿手改，.rpy 文件名不能以 00 开头。

## 参考链接

- [Ren'Py 官网首页](https://www.renpy.org/)
- [Ren'Py 文档主页](https://www.renpy.org/doc/html/)
- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
- [更新日志（Changelog）](https://www.renpy.org/doc/html/changelog.html)
- [许可证（License）](https://www.renpy.org/doc/html/license.html)
