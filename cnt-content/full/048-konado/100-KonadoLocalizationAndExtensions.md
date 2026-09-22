---
order: 100
title: 本地化、编辑器与扩展组件
module: 'konado'
category: 游戏开发
difficulty: beginner
description: 做多语言剧情与界面切换，用好内置 KS 编辑器，接入设置成就与 C 井 Web 工具扩展
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'konado/090-KonadoSceneAssetsAndCustomization'
  - 'konado/010-KonadoOverviewAndInstall'
prerequisites:
  - 'konado/090-KonadoSceneAssetsAndCustomization'

这是 Konado 系列的最后一篇，收束三件事：让游戏说多种语言（界面本地化与剧情本地化）、让编写剧本这件事本身更高效（内置 KS 编辑器与日志诊断体系），以及把几个官方扩展组件纳入你的工具箱——设置系统、成就系统、C# 适配层 Konado.NET 与 Web 工具。文末还附了从 2.4 升级到 2.8 的注意事项摘要，供维护旧项目的读者查阅。

## 学习目标

- 理解 Konado 基于 Godot TranslationServer 的本地化体系，会做界面语言切换与剧情多语言；
- 掌握本地化剧本的文件命名、查找顺序，以及"可改演出、不可改结构"的约束；
- 会使用内置 KS 编辑器的补全、跳转、诊断与断点调试能力；
- 会读 KonadoLogger 日志与 runtime_failure_reported 故障字典，理解错误码体系；
- 了解四个扩展组件：KonadoSettings、KonadoAchievements、Konado.NET、Konado WebTool；
- 掌握从 2.4 升级到 2.8 的改名对照与不兼容要点。

## 本地化：站在 TranslationServer 肩上

Konado 的国际化（i18n）不另起炉灶：语言状态直接由 Godot 的 TranslationServer 管理，Konado 不维护第二套国际化机制。因此你的游戏主体与 Konado 界面共享同一个语言状态，切换一次，两边同步。

内置界面（对话框功能栏、存档面板、设置面板等）自带五种语言的翻译文件，使用原生 .po 格式，覆盖简体中文、繁体中文、英语、日语、韩语，位于 addons/konado/localization/translations/。

切换语言有两种粒度：

- 持久化切换（写进设置，下次启动仍生效）：KonadoSettings.set_setting("display", "language", "ja")；
- 仅当前会话：TranslationServer.set_locale("ja")。

需要响应语言变化的界面，监听节点的 NOTIFICATION_TRANSLATION_CHANGED 通知即可。这一机制在上一篇的界面定制里同样适用：自定义界面跟随 TranslationServer，而不是自己另写一套切换逻辑。

## 剧情本地化：一套结构，多种说法

界面好办，难的是剧情。Konado 的方案是"多文件、同结构"：同一个章节准备多个语言版本的 .ks 文件，命名规则是在基础文件名后附加语言码：

```text
chapter.ks            # 基础剧本（通常是默认语言）
chapter.zh_Hans.ks    # 简体中文
chapter.en.ks         # 英语
chapter.ja.ks         # 日语
```

运行时按语言查找的顺序是：完整语言码，然后推导出的语言与书写系统组合，再退回基础语言，最后落到默认剧情。例如玩家语言是 zh_Hans 时，先找 chapter.zh_Hans.ks，找不到再按推导顺序逐级回退，保证任何情况下都有内容可播。

### 演出可变，结构不可变

这是剧情本地化最重要的一条规则。本地化剧本允许改：

- 全部文本内容；
- 演出参数：演员、立绘、背景、镜头、音频、时长等。

本地化剧本不允许改：

- 指令类型与控制流（不许增删分支、选项、跳转）；
- 稳定指令 ID（每句对话的身份标识必须与基础剧本一致）。

原因在于存档与回退体系：玩家可能用日语存档、用中文读档，如果两个语言版本的结构不同，存档里记录的指令位置就会指向错误的剧情。因此 Konado 把结构差异定为错误（加载失败），而演出差异只给警告——表现不同没关系，骨架必须一致。

手动加载本地化剧本用编译器侧的入口：KonadoStoryLocalization.load_localized_script("res://dialogues/chapter.ks") 返回按当前语言解析的 KonadoShot；运行中的管理器则用 reload_localized_script(locale) -> bool 按目标语言重载，返回是否成功。做"游戏内切换语言立即生效"的功能，就是调它。

## 内置 KS 编辑器：不离开 Godot 写剧本

启用插件后，双击任意 .ks 文件，它会在 Godot 原生脚本工作区以文档标签页的形式打开，不需要切换到外部编辑器。左上角的脚本列表会变为组件与指令树，点击即可插入语句；成员大纲能显示 branch 结构。

编辑能力按使用频率排一遍：

- 语法高亮：由 KonadoScriptSyntaxHighlighter 提供，默认高亮资源在 res://addons/konado/editor/script_editor/konado_script_highlighter.tres；
- 补全：按当前指令上下文补全命名参数；还会补全项目里的资源标识符——演员、状态、动作、背景、音频、镜头，写 actor show 时直接弹出你配置过的角色名；
- 导航：Ctrl+点击跳转到资源或另一个剧本文件；悬停显示指令签名；支持转到定义、查找引用与安全重命名；
- 重构：右键格式化与快速修复；
- 实时诊断：多行独立报错，每处错误最多给出三条按可能性排序的修复建议；
- 调试：支持运行时断点，命中断点时会打开对应的 .ks 行，并显示当前镜头、节点、持久变量与临时变量的值。

保存行为也有讲究：保存时写回原始 .ks 并自动重新编译运行时的 KonadoShot；即使内容有错也允许保存（不会弄丢你的文本），但此时不会刷新 KonadoShot，等你修复错误再保存时才自动重新编译。"在线文档"按钮则按当前编辑器语言打开对应版本（2.4 LTS 或 latest）的官方文档。

对编剧的日常工作流来说，这套编辑器意味着：写错语法立刻有红色提示和修复建议，改完保存立即能跑，调试时能看到变量现场——几乎不需要离开 Godot。

## 日志与诊断：KonadoLogger 与错误码

KonadoLogger 基于 Godot Logger 构建，日志写入 user://konado_log.log（实际目录由操作系统与项目名决定，可用 OS.get_user_data_dir() 查看）。它发出 error_caught(msg) 与 message_caught(message, error) 两个信号；KonadoLogger 由 KonadoDialogueManager 进入场景树时创建注册，不是全局 Autoload。

运行时出错的默认表现：屏幕上弹出覆盖式日志窗口并中断运行（普通警告只写文件、不中断）。不想要覆盖层，把 KonadoDialogueManager 的 enable_overlay_log 设为 false 即可。

更结构化的是运行时故障通道：原子指令执行失败时，系统只写一条最终错误，并发出 runtime_failure_reported(failure) 信号。failure 是一个字典，字段包括：code/id（稳定错误码与标识）、message（消息）、function/owner（出错函数与归属）、resource_kind/resource_id（涉及的资源）、instruction_key/source_path/source_line（指令键与剧本位置）、severity（严重级别）。控制台输出以 [AC-001] 这类稳定错误码开头，并附上剧本位置（形如 res://sample/demo/demo.ks:12），点开剧本对应行就能定位现场。

错误码体系的设计原则是稳定编号加模块前缀，十个前缀覆盖全部子系统：

```text
AC  表演与舞台（AC-001 到 AC-023）
AH  成就
AU  音频
CA  相机
CP  编译与链接
DL  对话与选项
RS  资源校验
RT  运行时契约
SC  脚本与跳转
VA  变量与条件
```

级别分为错误、警告、提示三档。配套的 KonadoResult 约定了统一的返回形态：成功是 {"ok": true, "value": ...}，失败则通过 KonadoResult.error(code, message, context) 构造。写自己的扩展时沿用这套约定，错误就能被统一诊断。

## 扩展组件一：KonadoSettings 设置系统

KonadoSettings 是一个 Autoload 单例，负责游戏设置的定义、展示与持久化。设置项用 JSON 配置定义，默认文件在 res://addons/konado_settings/data/default_settings.json；每个设置项可指定三种控件类型之一：0 为 SLIDER（滑条）、1 为 TOGGLE（开关）、2 为 OPTION（选项），并支持按平台过滤（all、android、linux、macos、ios、windows、linuxbsd、debug、release、editor 等）。

常用 API：get_setting 与 set_setting（读取、验证并持久化）、register_category 与 reset_category（注册与重置分类，注册新分类后需调用 rebuild() 刷新面板）、get_categories 与 get_category。所有值变化通过 setting_changed(category, key, value) 信号通知。持久化落在 user://konado_settings.cfg（ConfigFile 格式）。现成的设置面板场景在 res://addons/konado_settings/ui/konado_settings_panel.tscn，配合 UI 工厂（UIFactory.create_control）可以快速搭出选项界面。上一篇的界面语言持久化切换，底层正是 set_setting。

## 扩展组件二：KonadoAchievements 成就系统

成就系统轻量、数据驱动，可以随 Konado 联动，也可以独立运行（Autoload 到 root）。成就配置用 JSON，默认文件 res://addons/konado_achievement/data/default_achievements.json；条件类型有两种：counter（计数达标解锁）与 flag（标志等于目标值解锁）；成就属性包括 id、name、description、icon、hidden、category、points、conditions。

核心 API 与高级指令一篇的剧本指令一一对应：unlock_achievement(id)、increment_progress(key, 1.0)、set_flag(key, true)，另有 is_unlocked、get_achievement、get_all_achievements、get_unlocked/locked_achievements、get_unlock_percentage、show_panel/hide_panel/toggle_panel/is_panel_visible、reset_all、reset_achievement。信号方面有 achievement_unlocked(id, data)、achievement_progress_updated(id, current, target)、achievement_reset(id)、achievements_reset()、achievements_loaded()。

配置属性包括 config_path、save_path、popup_duration、popup_position（弹窗可停四角）、panel_layer（默认 100，成就面板层）、popup_layer（默认 110，解锁通知层）——正好对应模板的图层约定。剧本里的 achievement unlock/increment/set_flag 指令就是驱动这个组件的入口；它还支持自定义存取（custom_save_handler/custom_load_handler）与外部解锁回调（on_external_unlock），方便接入平台成就。

## 扩展组件三：Konado.NET（C# 适配层）

Konado.NET 让 C# 项目也能驱动 Konado。前提是：Konado 主插件已启用，并且使用支持 C# 的 Godot .NET 版本 4.7.1 及以上。启用顺序有讲究：先启用 Konado 主插件，然后构建 C# 项目，再启用 Konado.NET，最后重开项目。如果主插件未启用，Konado.NET 不会注册 Autoload。常见报错 "Unable to load addon script from path: 'res://addons/konado_dotnet/editor/KonadoDotNetPlugin.cs'" 的含义就是 C# 项目尚未完成构建。

C# 侧通过 KonadoApi 自动加载入口访问功能，KonadoApi.DialogueManagerApi 的主要方法覆盖管理器全部能力：IsReady、BindDialogueManager(node)、SetShot、InitDialogue、StartDialogue/StopDialogue、StartAutoplay、EmitWaitSignal、GetDialogueVariable、ReloadLocalizedScript，存档五件套 SaveGame/LoadGame/DeleteSave/GetSaveInfo/GetAllSaveInfo，以及回滚族 CanRollback/Rollback/GetExecutionHistory/ClearExecutionHistory/CreateCheckpoint/RestoreCheckpoint。C# 事件包括 ShotStart、ShotEnd、DialogueLineStart/End（带稳定指令 ID）、CustomSignal、RuntimeFailed、RuntimeFailureReported。另有 KonadoApi.StoryLocalizationApi（ResolveScriptPath、LoadLocalizedScript、warnOnFallback）处理剧情本地化，编译器侧为 KonadoScriptCompiler.CompileFile/CompileLine。

多管理器场景（场景里有多个 KonadoDialogueManager）需要手动按节点绑定，不依赖节点名称：

```csharp
// 多管理器场景需手动绑定（按节点绑定，不依赖节点名称）
Konado.Runtime.Api.KonadoApi.DialogueManagerApi?.BindDialogueManager(manager);
```

## 扩展组件四：Konado WebTool

把游戏导出到 Web 平台后会遇到一个经典问题：Godot 4.x 的 Web 导出会捕获全部键盘快捷键，导致浏览器自带的 F12 开发者工具、F5 刷新等全部失效，玩家和开发者都不方便。Konado WebTool 通过注入 JavaScript 放行浏览器快捷键，覆盖 F12、F5、F11、Ctrl+Shift+I、Ctrl+Shift+J、Ctrl+Shift+C、Ctrl+U、Ctrl+R，且每一个都可以单独开关。

配置属性有两个：developer_shortcuts_enabled（默认 true，总开关）与 allow_in_release（默认 false——正式发布版本默认不注入，避免影响玩家浏览器的正常行为）。修改配置后需要调用 KonadoWebTool.refresh_shortcuts() 使其生效。

## 从 2.4 升级到 2.8：注意事项摘要

如果你的项目还停留在 2.4 LTS（它仍提供 18 个月的维护支持），升级到 2.8 前先记住三件事：

1. 全部节点与类名从 KND_ 前缀改为 Konado 前缀，两代 API 不兼容。关键改名对照如下：

| 2.4 名称 | 2.8 名称 |
| --- | --- |
| KND_DialogueManager | KonadoDialogueManager |
| KND_Shot | KonadoShot |
| KND_SaveSystem | KonadoSaveSystem |
| KND_Settings | KonadoSettings |
| KND_AchievementManager | KonadoAchievements |
| KND_I18n | KonadoStoryLocalization |
| KND_Actor | KonadoActor |
| KND_ActingInterface | KonadoStageController |
| KND_AudioInterface | KonadoAudioController |
| KND_DialogueBox | KonadoDialogueBox |
| KND_VariableStore | KonadoVariableStore |
| KonadoCamera2D | KonadoCameraMarker |
| KND_Logger | KonadoLogger |

2. 存档不兼容：2.4 的存档无法在 2.8 中读取，升级意味着老存档作废，需要在产品层面决定如何过渡（例如引导重新开始）。
3. 用户代码需手动改：编辑器工具可以帮助场景资源迁移，但你手写的 GDScript/C# 里的类型名必须按上表手动替换。

完整升级步骤、逐项差异与迁移工具用法，以官方升级文档为准：https://godothub.com/oss/konado/zh/latest/tutorial/upgrade-2.8.html

## 小结

- 本地化直接复用 Godot TranslationServer：持久化切换用 KonadoSettings.set_setting("display", "language", ...)，会话级用 TranslationServer.set_locale；内置界面自带五语 .po 翻译；
- 剧情本地化按 chapter.zh_Hans.ks 等命名，查找顺序为完整语言码、推导语言与书写系统、基础语言、默认剧情；演出参数可改，指令类型、控制流与稳定指令 ID 必须与基础一致（演出差异警告、结构差异错误）；运行时切换用 reload_localized_script(locale)；
- 内置 KS 编辑器提供指令树插入、语法高亮、参数与资源补全、Ctrl+点击跳转、悬停签名、查找引用与安全重命名、最多三条修复建议的实时诊断，以及带变量现场的断点调试；保存自动重编译 KonadoShot，无效内容可保存但不刷新；
- 诊断体系：KonadoLogger 写 user://konado_log.log，覆盖层可经 enable_overlay_log 关闭；runtime_failure_reported 携带完整 failure 字典；错误码按 AC/AH/AU/CA/CP/DL/RS/RT/SC/VA 十个模块前缀稳定编号，KonadoResult 以 ok 字段约定成败；
- 扩展组件：KonadoSettings（JSON 配置、三种控件、平台过滤、setting_changed 信号）、KonadoAchievements（counter/flag 条件、剧本 achievement 指令联动、可独立运行、面板层 100 与弹窗层 110）、Konado.NET（先主插件再构建 C# 再启用适配层的顺序、KonadoApi 全能力映射、多管理器 BindDialogueManager）、Konado WebTool（放行浏览器快捷键、allow_in_release 默认 false、改配置后 refresh_shortcuts）；
- 2.4 升级 2.8：KND_ 全面改名为 Konado 前缀、存档不兼容、用户代码需手动替换类型名。

## 参考链接

- [Konado 官方文档（中文）](https://godothub.com/oss/konado/zh/latest/)
- [Konado 2.8 升级指南](https://godothub.com/oss/konado/zh/latest/tutorial/upgrade-2.8.html)
- [Konado 错误码参考](https://godothub.com/oss/konado/zh/latest/tutorial/core/error-codes.html)
- [Konado GitHub 仓库](https://github.com/godothub/konado)
- [Konado AtomGit 镜像](https://atomgit.com/godothub/konado)
