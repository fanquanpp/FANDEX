---
order: 190
title: 脚本生态：C# 与 GDExtension
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 总览 Godot 的脚本语言选择，了解 C# 开发工作流与 GDExtension 原生扩展的适用场景
author: fanquanpp
updated: '2026-10-11'
related:
  - 'gdscript/010-GDScriptLanguageOverview'
prerequisites: ['gdscript/010-GDScriptLanguageOverview']
---

Godot 并不强制你只使用一种语言写游戏。引擎内置并默认推荐的是 GDScript，但它同时为 .NET 开发者提供了完整的 C# 支持，并通过 GDExtension（引擎的原生扩展机制）允许任何语言以 C++ 动态库的形式接入 Godot。除了这三种官方路线，社区还有大量第三方语言绑定，例如下一篇要介绍的 Gode——让你直接用 TypeScript 编写 Godot 节点脚本。

本篇先给出整个脚本生态的全景图，然后按"上手成本从低到高"的顺序讲清两件事：C# 的开发工作流与易错点，以及 GDExtension 与官方 godot-cpp 绑定的能力边界、兼容性规则。读完你就能根据自己的团队背景与项目需求，选出合适的语言路线。

## 知识点地图

- **知识类别**：脚本生态与选型——GDScript / C# / C++ GDExtension / 第三方绑定四条路线的定位、工作流与取舍，对应 Godot 官方文档脚本各章的总览视角。
- **解决什么问题**：「我们的项目该用什么语言写」不是口味问题，而是由团队背景、生态需求、目标平台与性能热点共同决定的工程决策；每条路线都有隐藏的工作流规则（改导出变量要 Build、GDExtension 版本兼容），不知情就会踩坑。
- **什么时候用到**：立项时的技术选型；接手混合语言项目；把现有 .NET/C++ 资产带进 Godot；评估第三方语言绑定（Gode 等）。
- **真实工程锚点**：C# 工作流的门禁纪律取材花语花园 flower-card（mono 版 4.8.0-dev6 + .NET 8 实证，见「C# 工程的门禁纪律」小节）；「单例与事件总线的双生态写法」小节对照 flower-card（C#）与几何构成 speed-rouge（GDScript）两个真实项目的架构素材。
- **本篇不讲**：各语言的语法教学（GDScript 见 045-gdscript 模块）；Gode 的使用细节（见 [150 Gode 上手](/godot/150-GodeTypeScriptFramework) 与 [152 进阶](/godot/152-GodeInteropAndTooling)）。

## 学习目标

- 说清 Godot 四条脚本路线（GDScript、C#、C++ GDExtension、第三方扩展）各自的定位与取舍。
- 完成 C# 环境准备：安装 .NET SDK，理解首个 C# 脚本会生成哪些文件。
- 编写并理解第一个 C# 脚本：`partial class`、`_Ready()` 与 `_Process()` 覆写。
- 掌握 C# 与 Godot API 之间的命名约定差异，以及"改完导出变量要重新 Build"这类工作流规则。
- 识别并正确修复经典编译错误 CS1612。
- 理解 GDExtension 的优势、与 C++ 模块的取舍，以及版本与浮点精度兼容性规则。
- 学会用一张选型表为项目挑选脚本语言。

## Godot 的脚本语言全景

Godot 的脚本体系可以分成四层：

1. **GDScript**：引擎内置的专用脚本语言，随引擎一起发布，零配置、热重载体验最好，是官方文档与教程的默认语言。如果你刚入门，从这里开始（见前置篇 GDScript 语言概览）。
2. **C#**：面向 .NET 生态的官方支持。适合已有 C# 或 .NET 经验的团队，以及需要复用 NuGet 上大型类库的项目。需要自行安装 .NET SDK，并且有明确的平台限制（Web 平台不支持）。
3. **C++ GDExtension**：Godot 的原生扩展机制。允许你在**不重新编译引擎**的前提下，把 C++ 编译出的动态库加载进编辑器和导出的游戏，适合性能关键代码与复用现有 C++ 库。
4. **第三方扩展**：借助 GDExtension，社区把更多语言带进了 Godot。本模块下一篇介绍的 Gode 就是其中之一，它在引擎内嵌 Node.js，让你用 JavaScript 与 TypeScript 写节点脚本，并能直接使用 npm 生态。

一个常见误区是"性能不够就上 C++"。实际上 GDScript 对绝大多数 gameplay 逻辑已经足够快；C# 与 C++ 的价值更多在于**生态复用**（.NET 类库、C++ 库）与**特定热点**（密集数值计算、自定义物理等）。先用合适的最小工具把游戏做出来，再优化热点，是更稳妥的路线。

## C# 开发环境与工作流

### 安装 .NET SDK

Godot 不内置 .NET 运行时，使用 C# 前需要自行安装 .NET SDK，官方要求 **.NET 8 或更高版本**；如果你的项目要导出到 Android，还需要 **.NET 9 或更高版本**。安装完 SDK 后，在 Godot 官网下载带 .NET 支持的编辑器版本即可开始使用。

### 首个 C# 脚本会生成什么

在项目中创建第一个 C# 脚本时，Godot 会自动为项目生成 .NET 解决方案结构，包括：

- `.sln` 解决方案文件；
- `.csproj` 项目文件；
- `.godot/mono/` 目录（编译产物与缓存）。

这些文件应纳入版本控制（`.godot/` 内的编译缓存除外，按项目惯例处理）。之后每次构建，Godot 会把 C# 代码编译成程序集（assembly）供引擎加载。

### 写一个最小的 C# 脚本

下面是官方文档中的示例，覆盖了 C# 脚本最核心的三个约定：

```csharp
using Godot;

public partial class YourCustomClass : Node
{
    private int _a = 2;

    public override void _Ready()
    {
        GD.Print("Hello from C# to Godot :)");
    }

    public override void _Process(double delta)
    {
    }
}
```

逐条解释：

- `public partial class`：C# 脚本类**必须是 partial class**（分部类）。Godot 会为你的类生成一部分补充代码（源生成器），用来桥接引擎与 .NET，缺了 `partial` 关键字就无法工作。
- 类名必须与 `.cs` 文件名一致，这与 GDScript 宽松的文件名规则不同。
- `_Ready()` 与 `_Process(double delta)`：对应 GDScript 的 `_ready()` 与 `_process(delta)`，C# 侧用 PascalCase 命名并通过 `override` 覆写；注意 `_Process` 的参数类型是 `double`，不是 `float`。
- `GD.Print(...)`：GDScript 里的全局函数（如 `print()`）在 C# 中集中在静态类 `GD` 上，例如 `GD.Print`、`GD.PrintErr`。

## 命名约定与工作流细节

### PascalCase API 与 snake_case 字符串

C# 的 Godot API 一律使用 PascalCase：属性 `Position`、方法 `AddChild()`。但有一类例外要特别小心——**凡是需要把方法名或信号名当作字符串传给引擎的地方，仍然要写 Godot 原生的 snake_case 名称**。例如 `CallDeferred("some_method", ...)`、`Connect("pressed", ...)` 中传入的字符串，与 GDScript 中写的名字完全一致。混用两种命名风格是 C# 新手最常见的笔误来源。

### 修改导出变量后必须重新 Build

在 C# 类中新增 `Godot.Export` 导出变量或信号后，**必须点击编辑器右上角的 Build 按钮重新构建程序集**，Inspector 里才会出现新属性。这与 GDScript 保存即生效的体验不同，忘记 Build 时容易误以为代码没有生效。

### 性能习惯：在循环中缓存属性

C# 与引擎之间的每次属性访问都要经过一层托管/原生边界转换。官方建议在循环中把反复使用的属性先缓存到局部变量，例如不要在 `for` 循环里每次都读写 `Position`，而是取出来改完再一次性赋回去。这也是下文 CS1612 问题出现的原因。

## 经典错误 CS1612

Godot C# API 中，`Position` 这类返回值类型（`Vector2`/`Vector3`）是结构体（struct），按值返回。直接修改其成员会触发编译器错误 CS1612（对临时值取成员赋值）：

```csharp
Position.X = 100.0f;                            // CS1612 错误
var p = Position; p.X = 100.0f; Position = p;   // 正确
Position = Position with { X = 100.0f };        // C# 10 起一行
```

三种写法的含义：

1. 第一行是**错误**写法：`Position` 返回的是副本，修改副本毫无意义，编译器直接拒绝。
2. 第二行是经典写法：把值取出到局部变量、修改字段、再整体赋回。
3. 第三行利用 C# 10 的 `with` 表达式，一行完成"复制并替换某个成员"，更简洁。

同样的规则适用于 `Rotation`、`Scale`、`Size` 等所有返回结构体的属性。

## C# 的平台支持

选择 C# 之前必须确认目标平台：

| 平台 | 支持情况 |
|---|---|
| 桌面平台 | 自 Godot 4.0 起支持 |
| Android | 自 4.2 起（实验性） |
| iOS | 自 4.2 起（实验性） |
| Web | 不支持 |

也就是说，如果你的目标是网页游戏，C# 目前不是可用选项；同样地，Godot 的 Web 导出也有自己的渲染器限制。移动平台虽可用但仍标记为实验性，发布前需要在真机上充分测试。

## GDExtension：用 C++ 扩展引擎

### 它解决什么问题

GDExtension 是 Godot 的原生扩展机制，官方维护的 C++ 绑定库叫 godot-cpp。它允许你在**不重新编译引擎**的情况下使用 C++ 原生代码库，并且扩展可以随项目一起用于导出后的游戏——玩家不需要额外安装任何东西。

在 GDExtension 出现之前，向引擎添加 C++ 代码意味着把它做成引擎模块并重新编译整个引擎；GDExtension 把这件事变成了"编译一个动态库"，这也是它最大的卖点。

### GDExtension 的优势

- 无需编译引擎，扩展作为独立动态库加载；
- 同一份编译产物既可以用于编辑器，也可以用于导出项目，不用维护两套构建；
- 增量编译快，改一行 C++ 不用等整个引擎重编；
- 适合发布高性能插件：物理、寻路、音视频解码、大型第三方库集成等。

### 与 C++ 模块的取舍

如果你需要修改引擎底层行为本身（例如给渲染器加特性），引擎模块仍然是对的选择；如果只是"在游戏里跑高性能 C++ 代码"，GDExtension 几乎总是更合适——它不绑定引擎版本构建流程，分发插件也更容易。

### 兼容性规则

GDExtension 有明确的兼容性约定，使用前务必核对：

- **向前兼容**：面向旧版本 Godot 编译的扩展，可以在更新的次要版本上使用（反之不行）。
- **4.x 大版本内的断裂点**：面向 Godot 4.0 编译的扩展**不兼容 4.1 及以后**的版本；升级引擎版本时要重新编译或获取匹配版本的扩展。
- **浮点精度必须匹配**：Godot 有单精度与双精度两种构建，扩展的浮点精度配置必须与引擎构建一致，否则行为未定义。

从 Godot 4.7 开始，项目设置（Project Settings）中新增了专门的 GDExtension 专区，扩展相关的配置有了集中入口。

## C# 工程的门禁纪律（flower-card 实证）

花语花园（flower-card）是一个 Godot mono 版 + C# 的真实挂机项目（Godot.NET.Sdk/4.8.0-dev.6 + net8.0），它的 README 把 C# 工作流固化成三条可执行纪律（本机扫描素材，c-projects 044 节第 3 条）：

```bash
# 门禁一：编译必须 0 警告 0 错误
dotnet build flower-card.csproj

# 新增资源（新 .tscn/.tres/贴图）后先跑导入，避免编辑器外引用悬空
godot --headless --import --path .

# 日常运行与冒烟
godot --path .
godot --headless --quit-after 120        # 配合 [SMOKE] Main ready 标记，见 127 篇
```

为什么是这三条：`dotnet build` 在编辑器之外独立验证编译——Godot 编辑器内的 Build 按钮本质也是调它，但 CI 里没有编辑器；`--headless --import` 处理「同事提交了新资源、你这边还没导入」的悬空引用；`godot --path .` 显式指定项目目录，脚本与文档里永远写全，避免「在哪个目录跑的」这类低级变量。这套纪律与 [127 调试篇](/godot/127-DebuggingAndProfiling) 的冒烟门禁合并使用，就是 C# 项目的完整质量链。

## 单例与事件总线的双生态写法

同一套架构纪律（全局事件总线 + 单例），C# 与 GDScript 各有惯用形态，来自两个真实项目的对照（c-projects 044 节第 4 条素材）：

| 关注点 | C#（flower-card 的 EventBus） | GDScript（speed-rouge 的 SaveManager） |
| --- | --- | --- |
| 事件通道 | `public Action<...>` 字段，发射方 `?.Invoke` | 信号（signal）+ `emit_signal` |
| 单例赋值时机 | `_EnterTree` 中给静态字段 `I` 赋值 | `_init` 中赋静态 I |
| 退出清理 | 订阅纪律：`_Ready` 订阅、`_ExitTree` 退订（委托存字段，禁止 lambda 直接订阅） | `_exit_tree` 判等后清空静态 I，防悬挂引用 |
| 为什么这样 | C# 的 lambda 闭包无法匿名退订，必须持有委托引用 | GDScript 闭包捕获 freed 对象会踩空（045-gdscript 的头号坑），生命周期上要显式判等清理 |

读法：两列不是「谁更好」，而是**同一条纪律在不同语言约束下的落地形态**——「订阅与退订配对、单例生命周期与场景树对齐」在两个生态里都必须成立，只是 C# 用「存字段」解决、GDScript 用「判等清空」解决。跨语言团队定架构时，先把这类纪律写成约定，再让各语言按自己的惯用法实现。

## 动手实践

任务：给一个最小 C# 项目跑通「编译门禁 + 双写法对照」。

1. 建 C# 项目（mono 版编辑器创建首个 C# 脚本），在终端跑 `dotnet build`，故意写一个类型错误后再跑，观察输出差异——建立「编辑器之外独立验证编译」的体感；
2. 仿 EventBus 写一个 `public static EventBus I` + `public Action<int> ScoreChanged` 的最小事件总线：一个按钮 `_Ready` 订阅、`_ExitTree` 退订（委托存字段），另一个节点发射事件；验证「注释掉退订代码、反复进出场景」时订阅是否叠加；
3. 用 GDScript 复刻同一结构（signal + 静态 I + `_exit_tree` 判等清空），对照两版的代码形态与生命周期注释；
4. 新增一个带 `@export`（C# 里 `[Export]`）的变量后不 Build 直接 F5，观察 Inspector 是否出现新字段，再 Build 后对比——亲证「改导出变量必须重新 Build」。

<details>
<summary>参考现象与解释（先自己试，再展开对照）</summary>

第 2 题：不退订时，场景每重载一次订阅就叠加一次——事件触发时回调执行 N 次（N = 进出场景次数），且旧场景的节点引用被总线持有无法释放（内存泄漏）。这就是「_Ready 订阅、_ExitTree 退订」纪律的实验证明。

第 4 题：不 Build 时新字段不出现在 Inspector（引擎加载的是上一次编译的程序集）；Build 后出现。「改了导出变量但 Inspector 没变」的九成排查结论就是这一条。

</details>

## 语言选型建议

把本篇内容收敛成一张决策表：

| 语言 | 适用场景 | 主要代价 |
|---|---|---|
| GDScript | 默认选择；教学、原型、绝大多数 gameplay 逻辑 | 需要复用 .NET/C++ 生态时要写桥接 |
| C# | 团队有 .NET 经验；需要 NuGet 大型类库 | 需自装 .NET SDK；移动端实验性；不支持 Web；改导出变量要 Build |
| C++ GDExtension | 性能关键热点；复用现有 C++ 库；发布高性能插件 | 需掌握 C++ 与构建工具链；遵守版本与精度兼容规则 |
| TypeScript（Gode） | 前端背景团队；想直接用 npm 生态 | 依赖第三方插件；细节见下一篇 |

## 小结

- Godot 脚本生态分四层：内置的 GDScript 是默认答案，C# 服务于 .NET 生态，GDExtension 面向原生 C++，第三方扩展（如 Gode）带来更多语言。
- C# 需要 .NET 8+（Android 导出需 .NET 9+）；首个脚本生成 `.sln`/`.csproj`/`.godot/mono`；类必须是 `partial` 且与文件名同名；生命周期回调是 `_Ready()` 与 `_Process(double delta)`。
- C# API 用 PascalCase，但 `CallDeferred`/`Connect` 等传字符串处仍是 snake_case；新增导出变量或信号后必须重新 Build；循环中缓存属性、用 `with` 表达式规避 CS1612。
- C# 平台支持：桌面自 4.0，Android/iOS 自 4.2 实验性，Web 不支持。
- GDExtension + godot-cpp 让你免编译引擎使用 C++，同一产物通吃编辑器与导出项目；注意向前兼容规则与浮点精度匹配；4.7 在项目设置中新增了 GDExtension 专区。
- 选型优先级：没有特殊理由就用 GDScript；有 .NET/C++ 生态需求再引入对应语言；下一篇介绍面向前端开发者的 TypeScript 路线 Gode。

## 参考链接

- [C# 基础](https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/c_sharp_basics.html)
- [关于 godot-cpp（GDExtension 绑定）](https://docs.godotengine.org/en/stable/tutorials/scripting/cpp/about_godot_cpp.html)
- [编写第一个脚本](https://docs.godotengine.org/en/stable/getting_started/step_by_step/scripting_first_script.html)
- [导出项目](https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html)
