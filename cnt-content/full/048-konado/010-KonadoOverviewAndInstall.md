---
order: 10
title: Konado 是什么与插件安装
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 认识 Konado 的定位版本与三许可证模式，完成插件安装并按官方推荐配置好视觉小说项目
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'konado/020-KonadoArchitecture'
  - 'godot/160-KonadoVisualNovelFramework'

如果你想用 Godot Engine（戈多引擎）制作视觉小说、Galgame，或者为 RPG 编写大量剧情对话，却不想从零实现对话框、打字机、选项与存档系统，Konado 正是为这类需求准备的工具。Konado（中文名"可娜多"）是基于 Godot Engine 的视觉小说（Visual Novel）框架与通用对话解决方案，官方 README 对它的定位是：一个为 Godot Engine 打造的对话创建工具包（dialogue creation toolkit），通过模板（templates）与对话管理器（dialogue manager）帮助你快速构建视觉小说、Galgame、RPG 以及其他故事驱动的项目。它把视觉小说需要的一整套"舞台设备"做成开箱即用的组件，让创作者专注于故事叙述本身，而不陷入程序细节。

Konado 的成熟度有据可查：它已被收录进 Godot 官方维护的 awesome-godot 资源列表，2025 年获得 AtomGit 百大开源项目荣誉。官方团队还用它制作了《福尔摩斯：斑点带子案》《逃离精神病院》等完整作品，在官方作品展示页中可以直接体验，用来判断它是否符合你的项目形态再合适不过。

本模块是面向零基础读者的完整深入教程，全部内容按 2.8 及以上版本的 API 编写。本站的 godot 模块中另有三篇 Konado 概览文档（160/170/180），可作为快速入门的补充阅读。

## 学习目标

- 准确说出 Konado 的定位：Godot 插件形态的视觉小说框架与对话创建工具包。
- 了解版本线：2.4 LTS 与 2.8 系列（代号 Nanguoli）的差别，以及 2.4 到 2.8 的破坏性改名。
- 理解三许可证（tri-license）模式：MIT、BSD 3-Clause、木兰 PSL v2 三选一，以及各自的分发要求。
- 按官方四步完成插件安装，确认解压后的目录与入口脚本。
- 按官方推荐完成视觉小说项目的显示与启动配置。
- 用一句话说清 Konado 与 Ren'Py 的定位差异。

## 项目信息速览

动手之前，先把找资源的入口记全：

- 代码仓库：github.com/godothub/konado，项目创建于 2025 年 4 月 13 日。README、三份许可证文件、文档源码（docs/zh/latest/）、插件本体（addons/konado/）与官方示例项目（sample/demo/）都在仓库里。
- 大陆镜像：AtomGit 镜像仓库 atomgit.com/godothub/konado，下载 release 时速度通常更快，推荐大陆用户优先使用。
- 文档站：提供简体中文、繁体中文、英语、日语、韩语五种语言，版本切换器支持 2.4 与 latest 两条线。
- 社区：QQ 频道、Discord 与爱发电；联系邮箱 konado@godothub.com。
- 品牌形象：看板娘 IP "Kona"，2.0 主形象由画师 ioniccrystal 绘制。
- 官方作品展示页：godothub.com/game/visual-novel。

## 版本线：2.4 LTS 与 2.8 系列

Konado 文档站提供两个版本入口：标签为"2.4 LTS"的长期支持版（LTS, Long Term Support）与 latest（最新线）。LTS 版本（2.4）提供 18 个月的维护支持，适合追求稳定、不想追新的项目；latest 则跟随最新特性演进。

最新的正式发布是 v2.8.0，发布于 2026 年 9 月 7 日，2.8 系列使用代号 Nanguoli（南果梨）；上一个系列 2.7.x 的代号是 Wontons（馄饨）。仓库 main 分支的 plugin.cfg 已更新为 2.8.1，说明 2.8 系列仍在持续推进。

需要特别注意：2.4 到 2.8 是一次破坏性大版本升级，两代 API 不兼容。最直观的变化是节点与类的命名前缀：2.4 使用 KND_ 前缀，2.8 统一改为 Konado 前缀。如果你在网上搜到旧教程，代码里 KND_DialogueManager 之类的写法多半来自 2.4 时代。下面是关键改名对照的节选：

| 2.4 名称 | 2.8 名称 | 说明 |
| --- | --- | --- |
| KND_DialogueManager | KonadoDialogueManager | 对话管理器 |
| KND_Shot | KonadoShot | 剧情镜头 |
| KND_SaveSystem | KonadoSaveSystem | 存档系统 |
| KND_Settings | KonadoSettings | 设置系统 |
| KND_I18n | KonadoStoryLocalization | 剧情本地化 |
| KND_Actor | KonadoActor | 默认模板角色脚本 |
| KND_ActingInterface | KonadoStageController | 舞台控制器 |
| KND_AudioInterface | KonadoAudioController | 音频控制器 |
| KND_DialogueBox | KonadoDialogueBox | 对话框 |
| KND_VariableStore | KonadoVariableStore | 变量仓库 |
| KonadoCamera2D | KonadoCameraMarker | 机位标记 |
| KND_Logger | KonadoLogger | 日志 |

本模块所有示例与类名均按 2.8+ 编写，不涉及 2.4 的写法。

## 三许可证模式：三选一

Konado 采用多许可证（tri-license，三许可证）模式：你在 MIT、BSD 3-Clause 与木兰宽松许可证 2.0 三者中选择一个遵守即可，不必同时满足全部。三个许可证的侧重点不同：

- MIT（LICENSE 文件）：限制最少，保留版权与许可声明后即可自由使用、修改与分发。
- BSD 3-Clause（LICENSE-BSD 文件）：宽松度与 MIT 相近，额外禁止用版权方的名称为衍生产品背书。
- 木兰宽松许可证 2.0 / Mulan PSL v2（LICENSE-MULANPSL 文件）：中文生态常用的宽松许可证，包含明确的专利许可条款。

无论选哪一个，分发（发布游戏）时都应保留你所选许可证要求的版权声明、许可证正文和免责声明。对商业项目友好的是：Konado 不强制要求在游戏启动画面展示 Konado 标识。另外，插件内置字体（Noto Sans、资源圆体）附带独立的许可证文件，如果你的成品中使用了这些字体，分发时注意一并查看其条款。

## 系统要求与安装四步

系统要求非常简单：Godot 4.7.1。这既是最低要求，也是官方开发者实际测试确认过的版本。安装前请确认你使用的是该版本的标准 Godot 编辑器。

下载渠道注意一点：Konado 不通过 Godot Asset Library（资产库）分发，正确做法是从 GitHub Releases 下载 ZIP 压缩包；大陆用户推荐走 AtomGit 镜像下载 release。生产环境建议选择稳定版，而非开发快照。

官方安装步骤共四步：

1. 在 Godot 工程目录新建插件文件夹 addons。
2. 下载 release 的插件 zip 包。
3. 解压到 addons 目录下。
4. 在 Godot 项目设置中启用插件，并重新加载当前项目。

解压后插件目录为 addons/konado/，入口脚本是 konado_editor_plugin.gd。第四步"启用插件"的位置在"项目设置 > 插件"列表中勾选即可。启用成功后，Godot 会获得 KonadoScript（.ks 剧本）的编辑器支持与全部对话模板。

## 推荐项目配置

官方针对视觉小说类型给出一组推荐的项目设置，建议新建项目后一次性配好：

| 项目设置路径 | 推荐值 | 说明 |
| --- | --- | --- |
| Display > Window > Size > Width / Height | 1920 / 1080 | 全高清基准分辨率 |
| Display > Window > Size > Resizable | true | 允许玩家调整窗口大小 |
| Display > Window > Stretch > Mode | viewport | 以视口方式缩放，画面在不同窗口尺寸下表现一致 |
| Display > Window > Stretch > Aspect | keep | 保持宽高比，避免画面拉伸变形 |
| Display > Window > Stretch > Scale | 1.0 | 默认缩放倍率 |
| Display > Window > Stretch > Scale Mode | fractional | 允许分数倍缩放，窗口缩放更平滑 |
| Display > Window > Allow HiDPI | true | 高分屏上按物理分辨率渲染，文字更清晰 |
| Application > Boot Splash > Image | 你的启动图像 | 自定义游戏启动画面 |

配置完成后，把对话模板场景拖进你自己的场景即可开始搭建对话：默认模板位于 res://addons/konado/templates/default/dialogue_runtime.tscn。下一篇将完整拆解这个场景的结构。

## 与 Ren'Py 的定位差异

用一句话区分：Konado 是运行在 Godot 引擎内的插件，你的项目始终是一个标准 Godot 项目，可以自由组合 Godot 的全部能力（自定义玩法、物理、3D、插件生态）；Ren'Py 则是一个独立的视觉小说引擎，不依赖 Godot。如果你的目标是"用 Godot 做一个带视觉小说演出的游戏"，Konado 这条路线更合适；如果只想做纯视觉小说并对独立引擎生态感兴趣，可以另行了解 Ren'Py（本站 renpy 模块有对应教程）。

## 小结

本篇认识了 Konado 的定位：基于 Godot Engine 的视觉小说框架与对话创建工具包，已收录进官方 awesome-godot，文档站支持五种语言，大陆用户可用 AtomGit 镜像加速下载。版本方面记住三件事：2.4 是提供 18 个月维护的 LTS；最新正式版是 2.8 系列（代号 Nanguoli）；2.4 到 2.8 是破坏性升级，KND_ 前缀统一改为 Konado 前缀。许可证为 MIT、BSD 3-Clause、木兰 PSL v2 三选一，不强制启动画面标识，内置字体有独立许可证。安装只需四步：建 addons 目录、下载 zip、解压、在项目设置中启用并重载项目，最低且经测试的引擎版本是 Godot 4.7.1。最后按官方推荐把分辨率、拉伸模式与 HiDPI 配好，项目地基就打好了。

## 参考链接

- [Konado 官方文档站主页](https://godothub.com/oss/konado/zh/latest/)
- [安装教程](https://godothub.com/oss/konado/zh/latest/tutorial/install.html)
- [2.8 升级指南](https://godothub.com/oss/konado/zh/latest/tutorial/upgrade-2.8.html)
- [Konado GitHub 仓库](https://github.com/godothub/konado)
- [AtomGit 镜像仓库](https://atomgit.com/godothub/konado)
- [官方作品展示页](https://godothub.com/game/visual-novel)
