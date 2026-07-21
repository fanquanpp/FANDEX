---
order: 59
title: 'C#与MAUI'
module: csharp
category: 'C#'
difficulty: intermediate
description: '.NET MAUI 跨平台应用开发：架构原理、XAML、数据绑定、平台特定代码、原生 API 互操作、性能优化、部署发布全流程'
author: fanquanpp
updated: '2026-07-21'
related:
  - 'csharp/CSharp与Unity游戏开发'
  - 'csharp/CSharp与Blazor'
  - 'csharp/CSharp与EF Core'
  - 'csharp/CSharp与依赖注入'
prerequisites:
  - csharp/概述与环境配置
---

## 0. 学习目标

本章节基于 Bloom 分类法组织学习目标，按认知层级递进，帮助学习者系统掌握 .NET MAUI 跨平台应用开发。

### 0.1 记忆层（Remember）

完成本章学习后，学习者应当能够：

- 复述 MAUI 的全称（.NET Multi-platform App UI）及其定位
- 列举 MAUI 支持的目标平台：Android、iOS、macOS、Windows
- 识别 MAUI 的核心命名空间 `Microsoft.Maui`、`Microsoft.Maui.Controls`
- 回忆 MAUI 项目结构中的关键目录：`Platforms/`、`Resources/`、`MauiProgram.cs`
- 列举至少 8 个常用 MAUI 控件：`Page`、`View`、`Button`、`Entry`、`Label`、`CollectionView`、`ScrollView`、`StackLayout`

### 0.2 理解层（Understand）

完成本章学习后，学习者应当应当能够：

- 解释 MAUI 与 Xamarin.Forms 的关系及演进路径
- 阐述 MAUI 的渲染机制（Handler vs Renderer）
- 说明 MAUI 如何通过单一项目结构管理多平台代码
- 解释 XAML 的编译过程与代码隐藏（Code-behind）模型
- 阐述数据绑定的模式（OneWay、TwoWay、OneWayToSource、OneTime）

### 0.3 应用层（Apply）

完成本章学习后，学习者应当能够：

- 使用 .NET CLI 或 Visual Studio 创建 MAUI 项目
- 在 XAML 中布局页面，并实现响应式设计
- 实现 ViewModel 与 View 之间的数据绑定
- 使用平台特定代码调用原生 API（如相机、地理位置）
- 使用 .NET MAUI Community Toolkit 扩展应用功能

### 0.4 分析层（Analyze）

完成本章学习后，学习者应当能够：

- 分析 MAUI 应用的启动流程与依赖注入配置
- 比较 MAUI Handler 架构与 Xamarin.Forms Renderer 架构的差异
- 拆解数据绑定的传播路径与变更通知机制
- 分析跨平台代码复用与平台特定代码的边界
- 识别 MAUI 应用的性能瓶颈（布局、绑定、图像）

### 0.5 评价层（Evaluate）

完成本章学习后，学习者应当能够：

- 评估 MAUI 相对于 Flutter、React Native、Kotlin Multiplatform 的优劣
- 判断何时应使用 MAUI 而非原生开发
- 评价 MAUI 应用的性能与启动时间是否符合生产标准
- 评估 MAUI 在大型企业应用中的可维护性
- 评估社区生态成熟度与长期支持前景

### 0.6 创造层（Create）

完成本章学习后，学习者应当能够：

- 设计并实现完整的 MAUI 跨平台应用，覆盖四端发布
- 构建自定义控件并实现跨平台 Handler
- 设计基于 MVVM 模式的可测试应用架构
- 实现自定义的依赖注入与配置系统
- 创造性地将 MAUI 与 .NET Aspire、Blazor Hybrid 等技术融合

---

## 1. 历史动机与背景

### 1.1 跨平台移动开发的演进

跨平台移动开发经历了多个阶段的演进：

| 阶段 | 时间 | 代表技术 | 特征 |
|------|------|----------|------|
| Web App | 2007-2010 | HTML5 + WebView | 跨平台但性能差，体验接近网页 |
| 混合开发 | 2010-2013 | PhoneGap、Ionic | WebView 包装为原生应用，体验仍受限 |
| 解释型跨平台 | 2013-2018 | React Native、Weex | JavaScript 解释执行，桥接原生控件 |
| 编译型跨平台 | 2018-2020 | Flutter、Xamarin.Forms | 编译为原生代码或自绘引擎 |
| 统一框架 | 2020-至今 | .NET MAUI、Kotlin Multiplatform | 多端统一 API，原生渲染 |

### 1.2 MAUI 的诞生背景

.NET MAUI（Multi-platform App UI）于 2022 年 5 月正式发布，是 Xamarin.Forms 的演进版本。其诞生源于以下动机：

**动机一：单一项目结构**

Xamarin.Forms 时代，开发者需要为每个平台维护独立的项目（iOS、Android、UWP），共享代码在独立的 .NET Standard 项目中。MAUI 引入单一项目结构，通过 `Platforms/` 子目录组织平台特定代码。

**动机二：统一资源管理**

Xamarin.Forms 需要在每个平台项目中分别管理图像、字体等资源。MAUI 提供统一的 `Resources/` 目录，构建时自动分发到各平台。

**动机三：Handler 架构取代 Renderer**

Xamarin.Forms 的 Renderer 架构存在性能问题（每个控件对应一个 Renderer 实例）。MAUI 引入 Handler 架构，将控件抽象与平台实现解耦，提升性能与可定制性。

**动机四：.NET 6+ 统一运行时**

MAUI 基于统一的 .NET 6+ 运行时，移除了 Xamarin 时代的 Mono 与 .NET Framework 分裂，所有平台使用同一套 BCL（Base Class Library）。

### 1.3 MAUI 与竞品对比

| 维度 | .NET MAUI | Flutter | React Native | Kotlin Multiplatform |
|------|-----------|---------|--------------|---------------------|
| 语言 | C# | Dart | JavaScript/TypeScript | Kotlin |
| 渲染 | 原生控件 | Skia 自绘 | 原生控件 | 原生控件 |
| 性能 | 高 | 极高 | 中等 | 高 |
| 包体积 | 中等（约 15MB） | 大（约 20MB+） | 小（约 10MB） | 小（约 5MB） |
| 生态 | 中等，依赖 .NET 生态 | 极丰富 | 极丰富 | 增长中 |
| 桌面支持 | 原生支持 | 官方 beta | 社区方案 | 原生支持 |
| 学习曲线 | 中等（C# + XAML） | 中等 | 低（JS 开发者） | 中等 |
| 微软支持 | 官方主推 | Google 主推 | Meta 主推 | JetBrains 主推 |

### 1.4 MAUI 解决的核心问题

**问题 1：代码复用率**

传统原生开发每个平台需要独立代码，复用率低于 30%。MAUI 可实现 90%+ 的 UI 与业务逻辑复用。

**问题 2：开发成本**

四端原生开发需要 4 套技术栈（Swift、Kotlin、C++/WinUI、Objective-C），MAUI 只需 C# 一套。

**问题 3：迭代速度**

修改一次代码，四端同步生效，缩短发布周期。

**问题 4：技术栈统一**

企业可统一使用 .NET 技术栈（C#、EF Core、ASP.NET Core、MAUI），降低人员培训成本。

---

## 2. 形式化定义

### 2.1 MAUI 架构的形式化模型

MAUI 的架构可以形式化为一个分层模型：

$$
\text{MAUI} = \langle \text{App}, \text{Controls}, \text{Handlers}, \text{Platforms}, \text{Services} \rangle
$$

其中：

- $\text{App}$：应用层，包含业务逻辑、ViewModel、数据模型
- $\text{Controls}$：抽象控件层，跨平台的 UI 抽象（如 `Button`、`Entry`）
- $\text{Handlers}$：处理器层，将抽象控件映射到平台原生控件
- $\text{Platforms}$：平台层，Android、iOS、macOS、Windows 的原生实现
- $\text{Services}$：服务层，提供设备能力访问（如文件、网络、传感器）

### 2.2 控件到原生控件的映射

每个 MAUI 控件 $C$ 通过 Handler $H$ 映射到平台原生控件 $V_{\text{platform}}$：

$$
H : C \to \{ V_{text{Android}}, V_{\text{iOS}}, V_{\text{macOS}}, V_{\text{Windows}} \}
$$

Handler 维护一个映射表 $M$：

$$
M = \{ (C_i, H_i) \mid C_i \in \text{Controls}, H_i \in \text{Handlers} \}
$$

当控件属性变更时，Handler 负责将变更传播到原生控件：

$$
\text{PropertyChanged}(C, P, V) \xrightarrow{H} \text{UpdateNativeView}(V_P, V)
$$

### 2.3 数据绑定的形式化

数据绑定是 MAUI 的核心机制，可形式化为一个三元组：

$$
\text{Binding} = \langle \text{Source}, \text{Path}, \text{Target} \rangle
$$

绑定模式 $m$ 定义了数据流向：

$$
m \in \{ \text{OneWay}, \text{TwoWay}, \text{OneWayToSource}, \text{OneTime} \}
$$

绑定传播遵循以下规则：

- $\text{OneWay}$：$\text{Source} \to \text{Target}$
- $\text{TwoWay}$：$\text{Source} \leftrightarrow \text{Target}$
- $\text{OneWayToSource}$：$\text{Target} \to \text{Source}$
- $\text{OneTime}$：初始化时 $\text{Source} \to \text{Target}$，之后不再传播

绑定生效的前提是 Source 实现 `INotifyPropertyChanged`，目标属性是 `BindableProperty`。

### 2.4 MVVM 模式的代数表示

MVVM（Model-View-ViewModel）可形式化为：

$$
\begin{aligned}
\text{Model} &::= \text{Data} \times \text{Business Logic} \\
\text{ViewModel} &::= \text{State} \times \text{Commands} \times \text{INotifyPropertyChanged} \\
\text{View} &::= \text{XAML} \times \text{Bindings} \times \text{CodeBehind}
\end{aligned}
$$

ViewModel 通过数据绑定与 View 解耦：

$$
\text{View} \xleftrightarrow{\text{Binding}} \text{ViewModel} \xleftrightarrow{\text{Repository}} \text{Model}
$$

---

## 3. 理论推导

### 3.1 Handler 架构的性能分析

Xamarin.Forms 的 Renderer 架构中，每个控件实例对应一个 Renderer，Renderer 持有原生控件的强引用。这导致：

- 内存占用：$O(n \times k)$，$n$ 为控件数，$k$ 为 Renderer 平均大小
- 创建开销：每次控件创建触发 Renderer 实例化

MAUI 的 Handler 架构改进为：

- Handler 可复用，同一类型的控件共享 Handler 逻辑
- Handler 通过属性映射器（Property Mapper）响应变更，避免每控件一份委托

性能对比：

| 指标 | Renderer（Xamarin.Forms） | Handler（MAUI） | 改进 |
|------|---------------------------|-----------------|------|
| 控件创建时间 | $O(1)$，常数较大 | $O(1)$，常数较小 | 约 30-40% |
| 内存占用 | $O(n \times k)$ | $O(n + k)$ | 显著降低 |
| 属性变更响应 | 通过虚方法重写 | 通过映射表查找 | 更快 |

### 3.2 布局性能的复杂度分析

MAUI 的布局算法复杂度：

| 布局类型 | 时间复杂度 | 空间复杂度 | 适用场景 |
|----------|-----------|-----------|----------|
| `StackLayout` | $O(n)$ | $O(1)$ | 线性排列 |
| `Grid` | $O(n \times m)$ | $O(n + m)$ | 网格布局，$m$ 为行列数 |
| `FlexLayout` | $O(n^2)$ 最差 | $O(n)$ | 复杂响应式 |
| `AbsoluteLayout` | $O(n)$ | $O(1)$ | 绝对定位 |

对于大量数据展示，`CollectionView` 通过虚拟化（Virtualization）将复杂度降为 $O(\text{visible})$，仅渲染可见项。

### 3.3 XAML 编译的理论

XAML 编译分为两个阶段：

**阶段一：编译期（XamlC）**

将 XAML 文件编译为 IL 代码，避免运行时解析：

$$
\text{XAML} \xrightarrow{\text{XamlC}} \text{IL} \subset \text{Assembly}
$$

编译期检查包括：

- 类型存在性
- 属性可写性
- 资源引用正确性
- 绑定路径有效性（部分检查）

**阶段二：运行时初始化**

通过生成的 `InitializeComponent()` 方法加载编译后的 XAML：

$$
\text{InitializeComponent}() \to \text{LoadXaml}() \to \text{BuildControlTree}()
$$

启用 XamlC 可显著提升页面加载性能（约 5-10 倍），并减少内存分配。

### 3.4 跨平台资源解析

MAUI 的资源系统通过 **SVG 矢量图** + **多分辨率栅格化** 实现跨平台图像：

$$
\text{SVG} \xrightarrow{\text{Build}} \{ \text{PNG}_{\text{mdpi}}, \text{PNG}_{\text{hdpi}}, \text{PNG}_{\text{xhdpi}}, \cdots \}
$$

构建时为每个平台生成对应分辨率的栅格图像：

| 平台 | 资源目录 | 命名约定 |
|------|----------|----------|
| Android | `Resources/drawable-*` | `image.png`、`image@2x.png` |
| iOS | `Resources/` | `image.png`、`image@2x.png`、`image@3x.png` |
| Windows | `Resources/` | `image.scale-100.png`、`image.scale-200.png` |
| macOS | `Resources/` | `image.png`、`image@2x.png` |

---

## 4. 代码示例

### 4.1 创建第一个 MAUI 应用

```csharp
// MauiProgram.cs
using Microsoft.Maui.Controls.Hosting;
using Microsoft.Maui.Hosting;

/// <summary>
/// MAUI 应用程序入口
/// 负责配置服务、依赖注入、平台特定初始化
/// </summary>
public static class MauiProgram
{
    /// <summary>
    /// 创建并配置 MAUI 应用
    /// </summary>
    /// <returns>配置完成的 MauiApp 实例</returns>
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();

        // 使用 App 作为应用主类
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                // 注册自定义字体
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-SemiBold.ttf", "OpenSansSemibold");
            })
            .ConfigureMauiHandlers(handlers =>
            {
                // 注册自定义 Handler
                handlers.AddHandler(typeof(MyCustomEntry), typeof(PlatformsHandler));
            });

        // 注册应用服务
        builder.Services.AddSingleton<MainViewModel>();
        builder.Services.AddSingleton<IDataService, DataService>();
        builder.Services.AddTransient<DetailPage>();

        return builder.Build();
    }
}
```

```csharp
// App.xaml.cs
using Application = Microsoft.Maui.Controls.Application;

/// <summary>
/// 应用主类：管理应用生命周期与导航
/// </summary>
public partial class App : Application
{
    public App()
    {
        InitializeComponent();
    }

    /// <summary>
    /// 应用启动时创建主窗口
    /// </summary>
    protected override Window CreateWindow(IActivationState? activationState)
    {
        return new Window(new AppShell());
    }
}
```

### 4.2 XAML 页面与代码隐藏

```xml
<!-- MainPage.xaml -->
<?xml version="1.0" encoding="utf-8" ?>
<ContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:viewmodels="clr-namespace:MauiApp.ViewModels"
             x:Class="MauiApp.MainPage"
             x:DataType="viewmodels:MainViewModel"
             Title="主页">

    <Grid RowDefinitions="Auto,*,Auto" Padding="20">

        <!-- 标题栏 -->
        <Label Grid.Row="0"
               Text="待办事项"
               FontSize="24"
               FontAttributes="Bold"
               HorizontalOptions="Center"
               Margin="0,0,0,20" />

        <!-- 任务列表 -->
        <CollectionView Grid.Row="1"
                        ItemsSource="{Binding Tasks}"
                        SelectionMode="Single"
                        SelectionChanged="OnTaskSelected">
            <CollectionView.ItemTemplate>
                <DataTemplate x:DataType="viewmodels:TaskItem">
                    <Grid ColumnDefinitions="Auto,*,Auto" Padding="10">
                        <CheckBox Grid.Column="0"
                                  IsChecked="{Binding IsCompleted}"
                                  CheckedChanged="OnTaskCompletedChanged" />
                        <Label Grid.Column="1"
                               Text="{Binding Title}"
                               VerticalOptions="Center"
                               LineBreakMode="TailTruncation" />
                        <Label Grid.Column="2"
                               Text="{Binding DueDate, StringFormat='{0:yyyy-MM-dd}'}"
                               TextColor="Gray"
                               VerticalOptions="Center" />
                    </Grid>
                </DataTemplate>
            </CollectionView.ItemTemplate>
        </CollectionView>

        <!-- 底部输入栏 -->
        <HorizontalStackLayout Grid.Row="2" Spacing="10" Margin="0,20,0,0">
            <Entry Placeholder="输入新任务..."
                   Text="{Binding NewTaskTitle}"
                   WidthRequest="200" />
            <Button Text="添加"
                    Command="{Binding AddTaskCommand}" />
        </HorizontalStackLayout>
    </Grid>
</ContentPage>
```

```csharp
// MainPage.xaml.cs
using Microsoft.Maui.Controls;

/// <summary>
/// 主页代码隐藏：处理 UI 事件，依赖 ViewModel 提供数据
/// </summary>
public partial class MainPage : ContentPage
{
    private readonly MainViewModel _viewModel;

    /// <summary>
    /// 构造函数：通过依赖注入接收 ViewModel
    /// </summary>
    public MainPage(MainViewModel viewModel)
    {
        InitializeComponent();
        _viewModel = viewModel;
        BindingContext = _viewModel;
    }

    /// <summary>
    /// 任务选中事件处理
    /// </summary>
    private async void OnTaskSelected(object? sender, SelectionChangedEventArgs e)
    {
        if (e.CurrentSelection.FirstOrDefault() is TaskItem task)
        {
            await Navigation.PushAsync(new DetailPage(task));
            ((CollectionView)sender!).SelectedItem = null;
        }
    }

    /// <summary>
    /// 任务完成状态变更处理
    /// </summary>
    private void OnTaskCompletedChanged(object? sender, CheckedChangedEventArgs e)
    {
        if (sender is BindableObject bindable && bindable.BindingContext is TaskItem task)
        {
            _viewModel.UpdateTaskStatus(task, e.Value);
        }
    }
}
```

### 4.3 MVVM 与数据绑定

```csharp
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;

/// <summary>
/// 主页 ViewModel：实现 INotifyPropertyChanged 与命令模式
/// </summary>
public class MainViewModel : INotifyPropertyChanged
{
    private readonly IDataService _dataService;
    private string _newTaskTitle = string.Empty;
    private bool _isLoading;

    /// <summary>
    /// 构造函数：通过依赖注入接收数据服务
    /// </summary>
    public MainViewModel(IDataService dataService)
    {
        _dataService = dataService;
        Tasks = new ObservableCollection<TaskItem>();
        AddTaskCommand = new Command(AddTask, () => !string.IsNullOrWhiteSpace(NewTaskTitle));
        LoadTasksCommand = new Command(async () => await LoadTasksAsync());
    }

    /// <summary>任务列表</summary>
    public ObservableCollection<TaskItem> Tasks { get; }

    /// <summary>新任务标题（双向绑定）</summary>
    public string NewTaskTitle
    {
        get => _newTaskTitle;
        set
        {
            if (_newTaskTitle != value)
            {
                _newTaskTitle = value;
                OnPropertyChanged();
                ((Command)AddTaskCommand).ChangeCanExecute();
            }
        }
    }

    /// <summary>是否正在加载</summary>
    public bool IsLoading
    {
        get => _isLoading;
        private set
        {
            if (_isLoading != value)
            {
                _isLoading = value;
                OnPropertyChanged();
            }
        }
    }

    public ICommand AddTaskCommand { get; }
    public ICommand LoadTasksCommand { get; }

    /// <summary>添加任务</summary>
    private async void AddTask()
    {
        var task = new TaskItem { Title = NewTaskTitle, DueDate = DateTime.Now.AddDays(7) };
        await _dataService.SaveTaskAsync(task);
        Tasks.Add(task);
        NewTaskTitle = string.Empty;
    }

    /// <summary>加载任务列表</summary>
    private async Task LoadTasksAsync()
    {
        IsLoading = true;
        try
        {
            var tasks = await _dataService.GetTasksAsync();
            Tasks.Clear();
            foreach (var t in tasks) Tasks.Add(t);
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>更新任务状态</summary>
    public async void UpdateTaskStatus(TaskItem task, bool isCompleted)
    {
        task.IsCompleted = isCompleted;
        await _dataService.UpdateTaskAsync(task);
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    /// <summary>属性变更通知</summary>
    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

/// <summary>任务项数据模型</summary>
public class TaskItem : INotifyPropertyChanged
{
    private bool _isCompleted;

    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }

    public bool IsCompleted
    {
        get => _isCompleted;
        set
        {
            if (_isCompleted != value)
            {
                _isCompleted = value;
                OnPropertyChanged();
            }
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

### 4.4 平台特定代码

```csharp
using System;

/// <summary>
/// 平台特定接口定义
/// 在共享代码中声明，在各平台项目中实现
/// </summary>
public interface IPlatformInfo
{
    /// <summary>获取平台名称</summary>
    string PlatformName { get; }

    /// <summary>获取操作系统版本</summary>
    string OperatingSystemVersion { get; }

    /// <summary>获取设备型号</summary>
    string DeviceModel { get; }
}
```

```csharp
// Platforms/Android/PlatformInfo.android.cs
using Android.OS;
using Android.Util;

namespace MauiApp.Platforms.Android;

/// <summary>
/// Android 平台特定实现
/// </summary>
public class PlatformInfo : IPlatformInfo
{
    public string PlatformName => "Android";

    public string OperatingSystemVersion =>
        // Android 版本号，如 "Android 13"
        $"Android {Build.VERSION.Release} (API {Build.VERSION.SdkInt})";

    public string DeviceModel
    {
        get
        {
            try
            {
                var manufacturer = Build.Manufacturer;
                var model = Build.Model;
                return $"{manufacturer} {model}";
            }
            catch
            {
                return "Unknown Android Device";
            }
        }
    }
}
```

```csharp
// Platforms/iOS/PlatformInfo.ios.cs
using System;
using UIKit;

namespace MauiApp.Platforms.iOS;

/// <summary>
/// iOS 平台特定实现
/// </summary>
public class PlatformInfo : IPlatformInfo
{
    public string PlatformName => "iOS";

    public string OperatingSystemVersion =>
        $"iOS {UIDevice.CurrentDevice.SystemVersion}";

    public string DeviceModel =>
        UIKit.UIDevice.CurrentDevice.Model ?? "Unknown iOS Device";
}
```

```csharp
// Platforms/Windows/PlatformInfo.windows.cs
using System;
using Windows.System.Profile;

namespace MauiApp.Platforms.Windows;

/// <summary>
/// Windows 平台特定实现
/// </summary>
public class PlatformInfo : IPlatformInfo
{
    public string PlatformName => "Windows";

    public string OperatingSystemVersion =>
        $"Windows {Environment.OSVersion.Version}";

    public string DeviceModel =>
        // Windows 上设备型号信息有限，返回通用值
        "Windows PC";
}
```

```csharp
// MauiProgram.cs 中注册平台特定服务
public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder.UseMauiApp<App>();

        // 通过条件编译注册平台特定服务
#if ANDROID
        builder.Services.AddSingleton<IPlatformInfo, MauiApp.Platforms.Android.PlatformInfo>();
#elif IOS
        builder.Services.AddSingleton<IPlatformInfo, MauiApp.Platforms.iOS.PlatformInfo>();
#elif WINDOWS
        builder.Services.AddSingleton<IPlatformInfo, MauiApp.Platforms.Windows.PlatformInfo>();
#elif MACCATALYST
        builder.Services.AddSingleton<IPlatformInfo, MauiApp.Platforms.MacCatalyst.PlatformInfo>();
#endif

        return builder.Build();
    }
}
```

### 4.5 调用原生 API：相机示例

```csharp
using System.Threading.Tasks;

/// <summary>
/// 相机服务接口：跨平台抽象
/// </summary>
public interface ICameraService
{
    /// <summary>检查设备是否有相机</summary>
    Task<bool> IsCameraAvailableAsync();

    /// <summary>拍照并返回图片字节</summary>
    Task<byte[]?> TakePhotoAsync();
}
```

```csharp
// Platforms/Android/CameraService.android.cs
using Android;
using Android.Content;
using Android.Content.PM;
using Android.Graphics;
using Android.Provider;
using AndroidX.Activity.Result;
using AndroidX.Activity.Result.Contract;
using Application = Microsoft.Maui.Controls.Application;

namespace MauiApp.Platforms.Android;

/// <summary>
/// Android 相机服务实现
/// 使用 Activity Result API 处理相机回调
/// </summary>
public class CameraService : ICameraService
{
    public Task<bool> IsCameraAvailableAsync()
    {
        var context = Application.Current?.MainPage?.Handler?.MauiContext?.Context;
        if (context == null) return Task.FromResult(false);

        var hasCamera = context.PackageManager?.HasSystemFeature(PackageManager.FeatureCamera) ?? false;
        return Task.FromResult(hasCamera);
    }

    public async Task<byte[]?> TakePhotoAsync()
    {
        // 实现略：使用 ActivityResultContracts.TakePicture 启动相机
        // 返回拍摄的照片字节
        // 注意：需要处理 Android 12+ 的相机权限请求
        await Task.Delay(100);
        return null;  // 实际实现返回照片字节
    }
}
```

### 4.6 自定义控件与 Handler

```csharp
using Microsoft.Maui.Controls;

/// <summary>
/// 自定义控件：带圆角阴影的卡片视图
/// 继承 ContentView，添加 CornerRadius 与 ShadowColor 属性
/// </summary>
public class CardView : ContentView
{
    /// <summary>圆角半径（BindableProperty）</summary>
    public static readonly BindableProperty CornerRadiusProperty =
        BindableProperty.Create(
            nameof(CornerRadius),
            typeof(double),
            typeof(CardView),
            8.0,
            propertyChanged: OnCornerRadiusChanged);

    /// <summary>阴影颜色</summary>
    public static readonly BindableProperty ShadowColorProperty =
        BindableProperty.Create(
            nameof(ShadowColor),
            typeof(Color),
            typeof(CardView),
            Colors.Gray);

    public double CornerRadius
    {
        get => (double)GetValue(CornerRadiusProperty);
        set => SetValue(CornerRadiusProperty, value);
    }

    public Color ShadowColor
    {
        get => (Color)GetValue(ShadowColorProperty);
        set => SetValue(ShadowColorProperty, value);
    }

    private static void OnCornerRadiusChanged(BindableObject bindable, object oldValue, object newValue)
    {
        // 触发 Handler 更新原生控件
        var card = (CardView)bindable;
        card.Handler?.UpdateValue(nameof(CornerRadius));
    }
}
```

```csharp
// Handlers/CardViewHandler.cs
using Microsoft.Maui.Handlers;

namespace MauiApp.Handlers;

/// <summary>
/// CardView 的跨平台 Handler 基类
/// 通过 PropertyMapper 响应属性变更
/// </summary>
public partial class CardViewHandler : ViewHandler<CardView, object>
{
    /// <summary>属性映射器：定义属性变更时的处理逻辑</summary>
    public static readonly PropertyMapper<CardView, CardViewHandler> PropertyMapper =
        new(ViewHandler.ViewMapper)
        {
            [nameof(CardView.CornerRadius)] = MapCornerRadius,
            [nameof(CardView.ShadowColor)] = MapShadowColor,
            [nameof(CardView.Content)] = MapContent
        };

    public CardViewHandler() : base(PropertyMapper)
    {
    }

    private static void MapCornerRadius(CardViewHandler handler, CardView view)
    {
        // 平台特定的实现将在 partial class 中定义
        handler.PlatformUpdateCornerRadius(view.CornerRadius);
    }

    private static void MapShadowColor(CardViewHandler handler, CardView view)
    {
        handler.PlatformUpdateShadowColor(view.ShadowColor);
    }

    private static void MapContent(CardViewHandler handler, CardView view)
    {
        handler.PlatformUpdateContent(view.Content);
    }

    // 平台特定的实现方法，由各平台的 partial class 实现
    partial void PlatformUpdateCornerRadius(double radius);
    partial void PlatformUpdateShadowColor(Color color);
    partial void PlatformUpdateContent(View? content);
}
```

### 4.7 依赖注入与服务注册

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Maui.Controls.Hosting;
using Microsoft.Maui.Hosting;

/// <summary>
/// 服务注册扩展：将服务注册集中管理，提升可维护性
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>注册应用核心服务</summary>
    public static IServiceCollection AddAppServices(this IServiceCollection services)
    {
        // 数据层：单例，应用生命周期内共享
        services.AddSingleton<IDatabaseService, SqliteDatabaseService>();
        services.AddSingleton<IDataService, DataService>();

        // HTTP 客户端：通过 IHttpClientFactory 管理
        services.AddHttpClient<IApiService, ApiService>(client =>
        {
            client.BaseAddress = new Uri("https://api.example.com");
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        // ViewModel：按页面生命周期注册
        services.AddTransient<MainViewModel>();
        services.AddTransient<DetailViewModel>();
        services transient<SettingsViewModel>();

        // 页面：与 ViewModel 一一对应
        services.AddTransient<MainPage>();
        services.AddTransient<DetailPage>();
        services.AddTransient<SettingsPage>();

        return services;
    }
}

/// <summary>
/// 使用示例：在 MauiProgram 中调用
/// </summary>
public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder.UseMauiApp<App>();
        builder.Services.AddAppServices();  // 集中注册
        return builder.Build();
    }
}
```

### 4.8 网络请求与错误处理

```csharp
using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

/// <summary>
/// API 服务：封装 HTTP 请求，统一错误处理
/// </summary>
public interface IApiService
{
    Task<T?> GetAsync<T>(string endpoint);
    Task<TResponse?> PostAsync<TRequest, TResponse>(string endpoint, TRequest data);
}

/// <summary>
/// API 服务实现：基于 IHttpClientFactory，支持重试与超时
/// </summary>
public class ApiService : IApiService
{
    private readonly HttpClient _httpClient;

    public ApiService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    /// <summary>
    /// GET 请求：返回指定类型数据
    /// </summary>
    public async Task<T?> GetAsync<T>(string endpoint)
    {
        try
        {
            var response = await _httpClient.GetAsync(endpoint);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<T>();
        }
        catch (HttpRequestException ex)
        {
            // 网络错误：记录日志，返回默认值
            System.Diagnostics.Debug.WriteLine($"GET {endpoint} 失败：{ex.Message}");
            return default;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"未知错误：{ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// POST 请求
    /// </summary>
    public async Task<TResponse?> PostAsync<TRequest, TResponse>(string endpoint, TRequest data)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync(endpoint, data);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<TResponse>();
        }
        catch (HttpRequestException ex)
        {
            System.Diagnostics.Debug.WriteLine($"POST {endpoint} 失败：{ex.Message}");
            return default;
        }
    }
}
```

### 4.9 本地数据存储

```csharp
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using SQLite;

/// <summary>
/// SQLite 数据库服务：跨平台本地存储
/// 使用 sqlite-net-pcl 库
/// </summary>
public class SqliteDatabaseService : IDatabaseService
{
    private readonly SQLiteAsyncConnection _connection;

    public SqliteDatabaseService()
    {
        // 获取应用本地数据目录
        var databasePath = Path.Combine(
            FileSystem.AppDataDirectory,
            "app.db3");

        _connection = new SQLiteAsyncConnection(databasePath);
    }

    /// <summary>初始化数据库表结构</summary>
    public async Task InitializeAsync()
    {
        await _connection.CreateTableAsync<TaskItem>();
        await _connection.CreateTableAsync<UserPreference>();
    }

    /// <summary>查询所有任务</summary>
    public async Task<List<TaskItem>> GetTasksAsync()
    {
        return await _connection.Table<TaskItem>().ToListAsync();
    }

    /// <summary>保存任务</summary>
    public async Task<int> SaveTaskAsync(TaskItem task)
    {
        if (task.Id == 0)
            return await _connection.InsertAsync(task);
        else
            return await _connection.UpdateAsync(task);
    }

    /// <summary>删除任务</summary>
    public async Task<int> DeleteTaskAsync(TaskItem task)
    {
        return await _connection.DeleteAsync(task);
    }
}
```

### 4.10 响应式布局

```xml
<!-- ResponsivePage.xaml：响应不同屏幕尺寸 -->
<?xml version="1.0" encoding="utf-8" ?>
<ContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             x:Class="MauiApp.ResponsivePage"
             Title="响应式布局">

    <!-- 使用 VisualStateManager 响应屏幕尺寸变化 -->
    <Grid x:Name="MainGrid">
        <VisualStateManager.VisualStateGroups>
            <VisualStateGroupList>
                <VisualStateGroup Name="SizeStates">
                    <!-- 小屏（手机竖屏）-->
                    <VisualState Name="Small">
                        <VisualState.Setters>
                            <Setter Property="MainGrid.ColumnDefinitions" Value="*" />
                            <Setter Property="MainGrid.RowDefinitions" Value="Auto,Auto,Auto" />
                        </VisualState.Setters>
                    </VisualState>
                    <!-- 大屏（平板/桌面）-->
                    <VisualState Name="Large">
                        <VisualState.Setters>
                            <Setter Property="MainGrid.ColumnDefinitions" Value="*,*,*" />
                            <Setter Property="MainGrid.RowDefinitions" Value="Auto" />
                        </VisualState.Setters>
                    </VisualState>
                </VisualStateGroup>
            </VisualStateGroupList>
        </VisualStateManager.VisualStateGroups>

        <Label Grid.Column="0" Text="面板 1" BackgroundColor="LightBlue" Padding="20" />
        <Label Grid.Column="1" Text="面板 2" BackgroundColor="LightCoral" Padding="20" />
        <Label Grid.Column="2" Text="面板 3" BackgroundColor="LightGreen" Padding="20" />
    </Grid>
</ContentPage>
```

```csharp
// ResponsivePage.xaml.cs
using Microsoft.Maui.Controls;

public partial class ResponsivePage : ContentPage
{
    public ResponsivePage()
    {
        InitializeComponent();
        SizeChanged += OnSizeChanged;
    }

    /// <summary>
    /// 屏幕尺寸变化时切换视觉状态
    /// </summary>
    private void OnSizeChanged(object? sender, EventArgs e)
    {
        var state = Width < 600 ? "Small" : "Large";
        VisualStateManager.GoToState(MainGrid, state);
    }
}
```

---

## 5. 对比分析

### 5.1 MAUI 与 Xamarin.Forms 对比

| 维度 | Xamarin.Forms | .NET MAUI |
|------|--------------|-----------|
| 发布年份 | 2014 | 2022 |
| 运行时 | Mono | .NET 6+ 统一运行时 |
| 项目结构 | 多项目（共享项目 + 平台项目） | 单一项目 + Platforms 子目录 |
| 控件映射架构 | Renderer | Handler |
| 桌面支持 | UWP（有限） | 原生 macOS、Windows |
| 包体积 | 较大 | 更小（AOT 优化） |
| 资源管理 | 各平台独立 | 统一 Resources 目录 |
| 微软支持 | 已停止 | 官方主推 |
| 学习曲线 | 平缓 | 中等（迁移成本） |
| 生态成熟度 | 高（多年积累） | 增长中 |

### 5.2 Handler vs Renderer 架构对比

| 特性 | Renderer（Xamarin.Forms） | Handler（MAUI） |
|------|--------------------------|-----------------|
| 实例关系 | 1 控件 : 1 Renderer | 1 控件类型 : 1 Handler 类 |
| 属性更新 | 虚方法重写 | 属性映射表 |
| 内存占用 | 较高 | 较低 |
| 自定义难度 | 复杂（需重写整个 Renderer） | 简单（修改映射表） |
| 性能 | 中等 | 更优 |
| 生命周期 | 与控件绑定 | 按需创建 |

### 5.3 MAUI 与 Blazor Hybrid 对比

| 特性 | .NET MAUI | Blazor Hybrid |
|------|-----------|---------------|
| UI 技术 | 原生控件 + XAML | HTML/CSS/JS + Blazor |
| 渲染 | 原生 | WebView |
| 性能 | 高 | 中等（WebView 开销） |
| 跨平台一致性 | 接近原生（平台差异） | 完全一致（统一 HTML） |
| 开发体验 | XAML + C# | Razor + C# |
| 适用场景 | 性能敏感、原生体验 | Web 技术栈团队、内容应用 |
| 包体积 | 中等 | 较大（含 WebView） |

### 5.4 数据绑定模式对比

| 模式 | 数据流向 | 适用场景 |
|------|----------|----------|
| OneWay | Source → Target | 只读显示 |
| TwoWay | Source ↔ Target | 表单输入 |
| OneWayToSource | Target → Source | 用户输入仅写回源 |
| OneTime | 初始化时同步 | 静态数据展示 |

### 5.5 跨平台方案选型决策矩阵

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| 企业内部应用 | MAUI | .NET 技术栈复用，原生性能 |
| 高性能游戏 | Unity / Godot | MAUI 不适合游戏渲染 |
| 内容展示应用 | Blazor Hybrid | Web 技术栈，快速开发 |
| 已有 Web 团队 | React Native | 复用 JS/TS 经验 |
| 已有 .NET 团队 | MAUI | 复用 C# 经验 |
| 极致性能需求 | 原生开发 | 无跨平台开销 |
| 复杂动画 | Flutter | Skia 自绘性能优 |
| 桌面优先 | MAUI 或 WPF | 原生桌面体验 |

---

## 6. 常见陷阱与反模式

### 6.1 在主线程执行阻塞操作

**生产事故**：某 MAUI 应用在加载数据时调用 `Task.Result` 阻塞主线程，导致 iOS 应用启动时被系统强杀。

```csharp
// 反模式：主线程同步等待
public void LoadData()
{
    var data = _service.GetDataAsync().Result;  // 死锁风险
    UpdateUI(data);
}

// 正确模式：异步等待
public async Task LoadDataAsync()
{
    var data = await _service.GetDataAsync();
    UpdateUI(data);
}
```

### 6.2 在数据绑定中使用匿名类型

```csharp
// 反模式：匿名类型无法实现 INotifyPropertyChanged
var items = tasks.Select(t => new { t.Title, t.IsCompleted });
// 视图无法感知属性变更

// 正确模式：使用具名类型实现 INotifyPropertyChanged
var items = tasks.Select(t => new TaskItemViewModel(t));
```

### 6.3 内存泄漏：事件订阅未取消

```csharp
// 反模式：订阅事件未取消订阅
public class MyPage : ContentPage
{
    public MyPage()
    {
        MessagingCenter.Subscribe<MainViewModel>(this, "Update", OnUpdate);
        // 页面销毁时未取消订阅，导致内存泄漏
    }
}

// 正确模式：在 OnDisappearing 或析构中取消订阅
public class MyPage : ContentPage
{
    public MyPage()
    {
        MessagingCenter.Subscribe<MainViewModel>(this, "Update", OnUpdate);
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        MessagingCenter.Unsubscribe<MainViewModel>(this, "Update");
    }
}
```

### 6.4 ObservableCollection 在后台线程修改

```csharp
// 反模式：在后台线程直接修改 ObservableCollection
async Task LoadDataAsync()
{
    await Task.Run(() =>
    {
        // 抛出 InvalidOperationException：跨线程访问 UI 集合
        Tasks.Add(new TaskItem());
    });
}

// 正确模式：使用 MainThread 调度
async Task LoadDataAsync()
{
    var items = await Task.Run(() => _service.GetData());

    await MainThread.InvokeOnMainThreadAsync(() =>
    {
        foreach (var item in items)
            Tasks.Add(item);
    });
}
```

### 6.5 过度使用绝对布局

```xml
<!-- 反模式：使用 AbsoluteLayout 硬编码坐标，无法适配不同屏幕 -->
<AbsoluteLayout>
    <Button AbsoluteLayout.LayoutBounds="100,200,200,50" />
    <Button AbsoluteLayout.LayoutBounds="350,200,200,50" />
</AbsoluteLayout>

<!-- 正确模式：使用 StackLayout/Grid 响应式布局 -->
<StackLayout Orientation="Horizontal" Spacing="20" Padding="20">
    <Button Text="按钮 1" HorizontalOptions="FillAndExpand" />
    <Button Text="按钮 2" HorizontalOptions="FillAndExpand" />
</StackLayout>
```

### 6.6 在 XAML 中使用字符串硬编码

```xml
<!-- 反模式：硬编码字符串，无法本地化 -->
<Label Text="欢迎使用" />
<Button Text="确定" />

<!-- 正确模式：使用资源文件 + x:Static -->
<Label Text="{x:Static resources:AppResources.WelcomeMessage}" />
<Button Text="{x:Static resources:AppResources.OkButton}" />
```

### 6.7 频繁触发数据绑定

```csharp
// 反模式：高频更新 ObservableCollection
foreach (var item in Enumerable.Range(0, 1000))
{
    Tasks.Add(new TaskItem { Title = $"任务 {item}" });
    // 每次添加触发 CollectionChanged，1000 次 UI 刷新
}

// 正确模式：批量更新或使用 Range
foreach (var item in Enumerable.Range(0, 1000))
{
    Tasks.Add(new TaskItem { Title = $"任务 {item}" });
}
// .NET 8+ 支持 ObservableCollection.AddRange，单次刷新
```

### 6.8 在构造函数中执行耗时操作

```csharp
// 反模式：构造函数中执行网络请求
public class MainPage : ContentPage
{
    public MainPage()
    {
        InitializeComponent();
        LoadData();  // 阻塞页面构造
    }
}

// 正确模式：在 OnAppearing 中异步加载
public class MainPage : ContentPage
{
    public MainPage()
    {
        InitializeComponent();
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await LoadDataAsync();
    }
}
```

---

## 7. 工程实践

### 7.1 项目架构分层

```
MauiApp/
├── MauiApp/                    # 主项目
│   ├── Models/                 # 数据模型
│   │   ├── TaskItem.cs
│   │   └── UserPreference.cs
│   ├── ViewModels/             # ViewModel
│   │   ├── MainViewModel.cs
│   │   └── BaseViewModel.cs
│   ├── Views/                  # 视图（XAML + Code-behind）
│   │   ├── MainPage.xaml
│   │   └── DetailPage.xaml
│   ├── Services/               # 业务服务
│   │   ├── IDataService.cs
│   │   ├── DataService.cs
│   │   └── IApiService.cs
│   ├── Handlers/               # 自定义 Handler
│   │   └── CardViewHandler.cs
│   ├── Controls/               # 自定义控件
│   │   └── CardView.cs
│   ├── Platforms/              # 平台特定代码
│   │   ├── Android/
│   │   ├── iOS/
│   │   ├── Windows/
│   │   └── MacCatalyst/
│   ├── Resources/              # 跨平台资源
│   │   ├── Images/
│   │   ├── Fonts/
│   │   └── AppResources/
│   ├── App.xaml
│   └── MauiProgram.cs          # 应用入口
├── MauiApp.Tests/              # 单元测试
└── MauiApp.UITests/            # UI 测试
```

### 7.2 BaseViewModel 抽象

```csharp
using System.ComponentModel;
using System.Runtime.CompilerServices;

/// <summary>
/// ViewModel 基类：封装 INotifyPropertyChanged 与常用功能
/// 所有 ViewModel 继承此类，减少样板代码
/// </summary>
public abstract class BaseViewModel : INotifyPropertyChanged
{
    private bool _isBusy;
    private string _title = string.Empty;

    /// <summary>是否正在加载</summary>
    public bool IsBusy
    {
        get => _isBusy;
        set => SetProperty(ref _isBusy, value);
    }

    /// <summary>页面标题</summary>
    public string Title
    {
        get => _title;
        set => SetProperty(ref _title, value);
    }

    /// <summary>
    /// 属性设置方法：检查并触发变更通知
    /// </summary>
    protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value))
            return false;

        field = value;
        OnPropertyChanged(propertyName);
        return true;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

### 7.3 命令封装

```csharp
using System.Windows.Input;

/// <summary>
/// 异步命令封装：处理异步操作的命令模式
/// 避免直接使用 Command 类处理异步逻辑的陷阱
/// </summary>
public class AsyncCommand : ICommand
{
    private readonly Func<Task> _execute;
    private readonly Func<bool>? _canExecute;
    private readonly Action<Exception>? _onError;
    private bool _isExecuting;

    public AsyncCommand(Func<Task> execute, Func<bool>? canExecute = null, Action<Exception>? onError = null)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
        _onError = onError;
    }

    public event EventHandler? CanExecuteChanged;

    public bool CanExecute()
    {
        return !_isExecuting && (_canExecute?.Invoke() ?? true);
    }

    public bool CanExecute(object? parameter) => CanExecute();

    public async void Execute(object? parameter)
    {
        if (!CanExecute()) return;

        _isExecuting = true;
        RaiseCanExecuteChanged();

        try
        {
            await _execute();
        }
        catch (Exception ex)
        {
            _onError?.Invoke(ex);
        }
        finally
        {
            _isExecuting = false;
            RaiseCanExecuteChanged();
        }
    }

    public void RaiseCanExecuteChanged() =>
        CanExecuteChanged?.Invoke(this, EventArgs.Empty);
}

/// <summary>泛型版本</summary>
public class AsyncCommand<T> : ICommand
{
    private readonly Func<T?, Task> _execute;
    private readonly Func<T?, bool>? _canExecute;

    public AsyncCommand(Func<T?, Task> execute, Func<T?, bool>? canExecute = null)
    {
        _execute = execute;
        _canExecute = canExecute;
    }

    public event EventHandler? CanExecuteChanged;

    public bool CanExecute(object? parameter) =>
        _canExecute?.Invoke((T?)parameter) ?? true;

    public async void Execute(object? parameter)
    {
        await _execute((T?)parameter);
    }
}
```

### 7.4 性能优化策略

**策略一：启用 XAML 编译**

```xml
<!-- 在 XAML 根元素添加 x:Compile -->
<ContentPage xmlns="..."
             x:Class="..."
             x:Compile="True">
```

**策略二：使用 CompiledBindings**

```xml
<!-- 启用编译时绑定检查，提升绑定性能 -->
<ContentPage xmlns="..."
             xmlns:x="..."
             xmlns:vm="clr-namespace:App.ViewModels"
             x:DataType="vm:MainViewModel">
    <Label Text="{Binding UserName}" />
</ContentPage>
```

**策略三：CollectionView 替代 ListView**

```xml
<!-- ListView 已不推荐，CollectionView 性能更好 -->
<CollectionView ItemsSource="{Binding Items}">
    <CollectionView.ItemTemplate>
        <DataTemplate>
            <!-- 模板内容 -->
        </DataTemplate>
    </CollectionView.ItemTemplate>
</CollectionView>
```

**策略四：图像缓存与延迟加载**

```csharp
// 使用 UriImageSource 自动缓存
var image = new Image
{
    Source = new UriImageSource
    {
        Uri = new Uri("https://example.com/image.jpg"),
        CachingEnabled = true,
        CacheValidity = TimeSpan.FromDays(7)
    }
};
```

**策略五：减少绑定次数**

```csharp
// 反模式：每个属性单独绑定，频繁触发
// 正确模式：批量更新，使用 BatchUpdate
using (Binding.Batch())
{
    viewModel.Name = "新名称";
    viewModel.Age = 30;
    viewModel.Email = "test@example.com";
}  // 一次触发变更通知
```

### 7.5 测试策略

```csharp
using NUnit.Framework;
using Moq;

/// <summary>
/// ViewModel 单元测试示例
/// 隔离 UI 层，专注业务逻辑测试
/// </summary>
[TestFixture]
public class MainViewModelTests
{
    private Mock<IDataService> _dataServiceMock = null!;
    private MainViewModel _viewModel = null!;

    [SetUp]
    public void Setup()
    {
        _dataServiceMock = new Mock<IDataService>();
        _viewModel = new MainViewModel(_dataServiceMock.Object);
    }

    [Test]
    public void AddTask_ValidTitle_TaskAdded()
    {
        // Arrange
        _viewModel.NewTaskTitle = "测试任务";

        // Act
        _viewModel.AddTaskCommand.Execute(null);

        // Assert
        Assert.AreEqual(1, _viewModel.Tasks.Count);
        Assert.AreEqual("测试任务", _viewModel.Tasks[0].Title);
    }

    [Test]
    public void AddTask_EmptyTitle_CommandDisabled()
    {
        // Arrange
        _viewModel.NewTaskTitle = "";

        // Act & Assert
        Assert.IsFalse(_viewModel.AddTaskCommand.CanExecute(null));
    }

    [Test]
    public async Task LoadTasksAsync_ServiceReturnsData_TasksLoaded()
    {
        // Arrange
        var mockTasks = new List<TaskItem>
        {
            new() { Title = "任务 1" },
            new() { Title = "任务 2" }
        };
        _dataServiceMock.Setup(s => s.GetTasksAsync()).ReturnsAsync(mockTasks);

        // Act
        _viewModel.LoadTasksCommand.Execute(null);
        await Task.Delay(100);  // 等待异步操作完成

        // Assert
        Assert.AreEqual(2, _viewModel.Tasks.Count);
    }
}
```

---

## 8. 案例研究

### 8.1 案例一：跨平台任务管理应用

**项目背景**：某团队需要开发跨四端（iOS、Android、Windows、macOS）的任务管理应用，要求代码复用率 90%+。

**架构设计**：

```
TaskApp/
├── Core/                    # 共享业务逻辑
│   ├── Models/
│   ├── Services/            # 接口定义
│   └── ViewModels/
├── TaskApp/                 # MAUI 应用
│   ├── Views/
│   ├── Platforms/           # 平台特定实现
│   └── Resources/
└── TaskApp.Tests/           # 单元测试
```

**关键决策**：

1. **MVVM 模式**：业务逻辑与 UI 完全解耦，便于测试与维护
2. **依赖注入**：通过接口隔离平台特定实现
3. **本地存储**：SQLite 跨平台数据库
4. **同步**：通过 Web API 实现多设备同步

```csharp
// 同步服务实现
public class SyncService
{
    private readonly IApiService _apiService;
    private readonly IDatabaseService _databaseService;

    public SyncService(IApiService apiService, IDatabaseService databaseService)
    {
        _apiService = apiService;
        _databaseService = databaseService;
    }

    /// <summary>双向同步：上传本地变更，下载远端更新</summary>
    public async Task SyncAsync()
    {
        // 1. 获取本地未同步的任务
        var localTasks = await _databaseService.GetUnsyncedTasksAsync();

        // 2. 上传到服务器
        foreach (var task in localTasks)
        {
            var serverTask = await _apiService.PostAsync<TaskItem, TaskItem>("tasks", task);
            if (serverTask != null)
            {
                task.RemoteId = serverTask.Id;
                task.IsSynced = true;
                await _databaseService.UpdateTaskAsync(task);
            }
        }

        // 3. 下载远端更新
        var remoteTasks = await _apiService.GetAsync<List<TaskItem>>("tasks");
        if (remoteTasks != null)
        {
            foreach (var remote in remoteTasks)
            {
                var local = await _databaseService.GetByRemoteIdAsync(remote.Id);
                if (local == null)
                {
                    await _databaseService.SaveTaskAsync(remote);
                }
                else if (remote.UpdatedAt > local.UpdatedAt)
                {
                    // 远端更新，覆盖本地
                    await _databaseService.UpdateTaskAsync(remote);
                }
            }
        }
    }
}
```

### 8.2 案例二：设备管理应用

**项目背景**：企业设备管理应用，需要调用蓝牙、NFC、相机等原生能力，覆盖 iOS 与 Android。

**关键挑战**：原生 API 差异大，权限模型不同。

**解决方案**：使用接口抽象 + 平台特定实现。

```csharp
// 蓝牙服务接口
public interface IBluetoothService
{
    Task<bool> RequestPermissionsAsync();
    Task<IEnumerable<BluetoothDevice>> ScanAsync(TimeSpan duration);
    Task ConnectAsync(BluetoothDevice device);
    Task DisconnectAsync();
    Task<byte[]> ReceiveAsync();
    Task SendAsync(byte[] data);
}

// Android 实现使用 Android.Bluetooth
// iOS 实现使用 CoreBluetooth
// 在 MauiProgram.cs 中按平台注册
```

### 8.3 案例三：离线优先应用

**项目背景**：野外作业场景，网络不稳定，需要离线可用、在线同步。

**架构设计**：

- 本地 SQLite 作为主数据源
- 后台服务定期同步
- 冲突解决：Last-Write-Wins 或用户手动解决

```csharp
public class OfflineFirstRepository<T> where T : class, ISyncable, new()
{
    private readonly IDatabaseService _db;
    private readonly IApiService _api;
    private readonly ConnectivityService _connectivity;

    public async Task<IEnumerable<T>> GetAllAsync()
    {
        // 优先从本地加载
        var local = await _db.GetAllAsync<T>();

        // 如果在线，触发后台同步
        if (_connectivity.IsOnline)
        {
            _ = SyncInBackgroundAsync();  // 不阻塞 UI
        }

        return local;
    }

    public async Task SaveAsync(T entity)
    {
        // 总是先保存到本地
        entity.IsDirty = true;
        await _db.SaveAsync(entity);

        // 如果在线，立即同步
        if (_connectivity.IsOnline)
        {
            await SyncEntityAsync(entity);
        }
    }

    private async Task SyncInBackgroundAsync()
    {
        var dirty = await _db.GetDirtyAsync<T>();
        foreach (var entity in dirty)
        {
            await SyncEntityAsync(entity);
        }
    }
}
```

---

## 9. 习题

### 9.1 基础题

**习题 1**：使用 .NET CLI 创建一个新的 MAUI 项目，并说明项目结构中 `Platforms/`、`Resources/`、`MauiProgram.cs` 的作用。

参考答案要点：

- `Platforms/`：存放平台特定代码，每个子目录对应一个平台
- `Resources/`：跨平台共享资源，如字体、图像、本地化字符串
- `MauiProgram.cs`：应用入口，配置服务、依赖注入、Handler

**习题 2**：解释 MAUI 中 Handler 架构相对于 Xamarin.Forms Renderer 架构的改进。

参考答案要点：Handler 通过属性映射表响应变更，避免每控件一个 Renderer 实例；内存占用从 $O(n \times k)$ 降为 $O(n + k)$；自定义更简单（修改映射表而非重写 Renderer）。

**习题 3**：实现一个简单的 ViewModel，包含一个 `Name` 属性与 `SubmitCommand` 命令。

```csharp
public class SimpleViewModel : BaseViewModel
{
    private string _name = string.Empty;
    public string Name
    {
        get => _name;
        set => SetProperty(ref _name, value);
    }

    public ICommand SubmitCommand { get; }

    public SimpleViewModel()
    {
        SubmitCommand = new Command(Submit, () => !string.IsNullOrEmpty(Name));
    }

    private void Submit() { /* 提交逻辑 */ }
}
```

### 9.2 进阶题

**习题 4**：实现一个自定义控件 `CircularProgress`，显示圆形进度条，并通过 Handler 在各平台实现。

参考答案要点：

- 定义 `BindableProperty`：`Progress`（0-1）、`Color`、`StrokeWidth`
- 创建 Handler 类，定义 PropertyMapper
- 各平台实现：Android 使用 `Canvas` 绘制，iOS 使用 `CAShapeLayer`，Windows 使用 `Microsoft.UI.Xaml.Shapes`

**习题 5**：实现一个支持离线优先的数据仓储，处理在线/离线切换与冲突解决。

参考答案要点：参考第 8.3 节实现，注意：

- 本地数据库为主数据源
- 网络状态监听
- 冲突解决策略（时间戳、手动合并）
- 同步队列与重试

**习题 6**：分析以下 XAML 中的数据绑定问题并修复：

```xml
<Label Text="{Binding User.Name}" />
```
假设 `User` 属性变更后 `Name` 不会触发更新。

参考答案要点：嵌套属性的绑定需要中间属性也实现 `INotifyPropertyChanged`，或使用 `BindingMode.OneWay` + 手动触发变更通知。

### 9.3 挑战题

**习题 7**：设计一个 MAUI 应用的完整测试策略，包括单元测试、集成测试、UI 测试。

参考答案要点：

- **单元测试**：测试 ViewModel 与 Service，使用 Moq 隔离依赖
- **集成测试**：测试 Service 与数据库集成，使用内存数据库
- **UI 测试**：使用 Xamarin.UITest 或 Appium 自动化测试
- **平台特定测试**：每个平台的设备/模拟器测试
- **CI/CD**：GitHub Actions 配置多平台构建与测试

**习题 8**：实现一个 MAUI 应用，支持插件化架构，允许运行时加载扩展模块。

参考答案要点：

- 使用 `Assembly.LoadFrom` 动态加载程序集
- 定义插件接口 `IMauiPlugin`
- 通过反射发现插件并注册到 DI 容器
- 处理插件依赖与版本兼容性

**习题 9**：分析 MAUI 应用启动性能优化的所有可能方向。

参考答案要点：

- 启用 XAML 编译（XamlC）
- 启用 AOT 编译（Native AOT）
- 延迟加载非首屏页面
- 减少启动时服务初始化
- 使用 `MauiAppBuilder` 的 `ConfigureLifecycleEvents` 优化生命周期
- 平台特定：Android 使用 Profiled AOT，iOS 使用启动图

**习题 10**：比较 MAUI Blazor Hybrid 与纯 MAUI 的架构差异，并给出选型建议。

参考答案要点：

| 维度 | MAUI Blazor Hybrid | 纯 MAUI |
|------|-------------------|---------|
| UI 技术 | HTML/CSS + Razor | XAML |
| 性能 | 中等（WebView） | 高（原生） |
| 一致性 | 完全一致 | 接近原生 |
| 团队技能 | Web + .NET | .NET + XAML |
| 适用场景 | 内容应用、Web 团队 | 性能敏感、原生体验 |

---

## 10. 参考文献

1. Microsoft. (2024). *.NET MAUI documentation*. Microsoft Learn. Retrieved from https://learn.microsoft.com/dotnet/maui/

2. Bartolucci, J. (2022). *Mobile Development with .NET MAUI*. O'Reilly Media. ISBN: 978-1098131916.

3. Peppas, K. (2022). *Building Cross-Platform Applications with .NET MAUI*. Apress. DOI: [10.1007/978-1-4842-8083-2](https://doi.org/10.1007/978-1-4842-8083-2)

4. Hejlsberg, A., Torgersen, M., Wiltamuth, S., & Golde, P. (2010). *The C# Programming Language* (4th ed.). Addison-Wesley Professional. ISBN: 978-0-321-74176-9.

5. Microsoft. (2024). *.NET MAUI GitHub repository*. Retrieved from https://github.com/dotnet/maui

6. Microsoft. (2024). *.NET MAUI Community Toolkit*. Retrieved from https://learn.microsoft.com/dotnet/communitytoolkit/maui/

7. Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley Professional. ISBN: 978-0321127426.

8. Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley Professional. ISBN: 978-0201633610.

9. Mac Lane, S. (1971). *Categories for the Working Mathematician* (2nd ed.). Springer-Verlag. DOI: [10.1007/978-1-4612-9839-7](https://doi.org/10.1007/978-1-4612-9839-7)

10. Petricek, T., & Skeet, J. (2010). *Real-World Functional Programming: With Examples in F# and C#*. Manning Publications. ISBN: 978-1933988924.

11. Skeet, J. (2019). *C# in Depth* (4th ed.). Manning Publications. ISBN: 978-1617294532.

12. Nystrom, R. (2014). *Game Programming Patterns*. Genever Benning. ISBN: 978-0990582908.

---

## 11. 延伸阅读

### 11.1 官方文档

- **.NET MAUI 文档**：https://learn.microsoft.com/dotnet/maui/
- **MAUI 教程**：https://learn.microsoft.com/dotnet/maui/tutorials/
- **MAUI Community Toolkit**：https://learn.microsoft.com/dotnet/communitytoolkit/maui/
- **MAUI 性能优化**：https://learn.microsoft.com/dotnet/maui/performance
- **MAUI 部署发布**：https://learn.microsoft.com/dotnet/maui/deployment

### 11.2 经典教材

- **Mobile Development with .NET MAUI** (Jesse Bartolucci)：MAUI 实战指南
- **Building Cross-Platform Applications with .NET MAUI** (Konsantas Peppas)：跨平台开发详解
- **C# in Depth** (Jon Skeet)：C# 语言深度
- **Pro .NET MAUI** (Matthew Soucoup)：高级 MAUI 开发

### 11.3 前沿论文与社区资源

- **.NET MAUI GitHub**：https://github.com/dotnet/maui —— 源码与 issue 跟踪
- **MAUI 博客**：https://devblogs.microsoft.com/dotnet/category/maui/
- **James Montemagno 博客**：https://montemagno.com/ —— MAUI 大神
- **MAUI 中文社区**：https://github.com/dotnet/maui/discussions

### 11.4 相关开源项目

- **MAUI Community Toolkit**：https://github.com/CommunityToolkit/Maui
- **MAUI Samples**：https://github.com/dotnet/maui-samples
- **MAUI Weather App**：https://github.com/jamesmontemagno/WeatherTwentyOne
- **MvvmCross**：https://github.com/MvvmCross/MvvmCross —— MVVM 框架
- **SQLite-net**：https://github.com/praeclarum/sqlite-net —— 跨平台 SQLite

### 11.5 进阶主题

- **.NET 8 Native AOT for MAUI**：编译期优化，减少启动时间
- **Blazor Hybrid 与 MAUI 集成**：Web 技术栈与原生混合
- **.NET Aspire 与 MAUI**：云原生应用编排
- **MAUI 在嵌入式场景**：.NET nanoFramework 等
- **YARP 与 MAUI**：反向代理与移动应用

---

## 12. 小结

.NET MAUI 是微软跨平台应用开发的下一代框架，通过统一的项目结构、Handler 架构、XAML 与 C# 技术栈，为开发者提供了四端统一的开发体验。掌握 MAUI 不仅是掌握一组 API，更是理解跨平台开发的核心思想：

1. **架构维度**：MAUI 通过 Handler 架构与属性映射器实现控件抽象与平台实现的解耦，性能与可定制性优于 Xamarin.Forms
2. **工程维度**：单一项目结构、统一资源管理、依赖注入、MVVM 模式共同支撑了 90%+ 的代码复用率
3. **平台维度**：通过接口抽象与平台特定实现，开发者可以在保持代码复用的同时调用原生 API
4. **演进维度**：MAUI 与 .NET 运行时同步演进，受益于 AOT、Source Generator 等持续优化

通过本章节的学习，读者应当能够：

- 创建并发布四端 MAUI 应用
- 运用 MVVM 模式构建可测试的应用架构
- 调用平台特定原生 API
- 识别并避免常见性能陷阱
- 在 MAUI 与其他跨平台方案间做出合理选型

下一章节将深入探讨 C# 面向对象编程，作为理解 MAUI 控件继承体系与设计模式的基础。
