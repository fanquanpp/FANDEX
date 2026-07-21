---
order: 108
title: 元服务开发与发布
module: harmonyos
category: 'dev-lang'
difficulty: advanced
description: 'HarmonyOS元服务开发与发布详解：Atomic Service。'
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/分布式数据管理
  - harmonyos/跨设备调用
  - 'harmonyos/DevEco-Studio调试器'
prerequisites:
  - harmonyos/概述与环境搭建
---

# 元服务开发与发布详解

## 1. 概述与背景

### 1.1 什么是元服务

元服务(Atomic Service)是 HarmonyOS 提供的一种**免安装、轻量级、卡片优先**的应用形态。它打破了传统应用"必须先下载安装到桌面、再点击图标启动"的使用模式,转而以"服务直达、即点即用"为核心体验。用户通过服务卡片、负一屏推荐、智慧搜索、扫码、语音等多种入口即可调用元服务,无需经历冗长的安装流程,这正是 HarmonyOS "服务流转"理念在应用形态层面的具体落地。

从工程视角看,元服务是一种**约束更严格、体积更小、入口更丰富、生命周期更敏捷**的 HarmonyOS 应用变体。它在底层仍基于 Stage 模型与 ArkTS/ArkUI 技术栈构建,但在工程配置、入口组件、卡片系统、发布流程、体积限制等方面具有独立的规范。理解元服务,本质上是在已有 HarmonyOS 应用开发能力之上,再学习一套面向"轻量化、卡片化、服务化"的工程方法论。

元服务的"元"字,在 HarmonyOS 官方语境中取自"原子化服务"概念,意指服务被拆解为最小可用单元,用户在需要的场景下即点即用,用完即走,与传统"重应用"形成互补。这种设计理念与 iOS 平台的 App Clips、Android 平台的 Instant Apps 在产品定位上类似,但 HarmonyOS 通过 1+8+N 多设备分布式能力,使元服务可以跨手机、平板、手表、车机、智慧屏等设备无缝流转,这是其他平台不具备的差异化优势。

### 1.2 演进历史与生态定位

HarmonyOS 元服务的演进可以划分为三个阶段:

**第一阶段:孕育期(API 7-8,FA 模型时代)**。早期 HarmonyOS 通过 FA(Feature Ability)模型提供"服务卡片"能力,主要用于桌面卡片展示。此阶段卡片功能有限,本质上是桌面小部件的延伸,与系统服务的深度整合尚不充分。

**第二阶段:正式发布期(API 9,Stage 模型时代)**。HarmonyOS 3.0 发布了 Stage 模型,正式引入"元服务"概念。卡片系统重构为基于 ArkUI 声明式语法的现代化方案,支持 ArkTS 卡片、JS 卡片两类。元服务获得了独立的工程模板、独立的发布通道(AppGallery Connect 元服务专区)、独立的体积限制(10MB 以内)。这一阶段元服务具备了"独立应用形态"的雏形。

**第三阶段:成熟期(API 10+,鸿蒙生态繁荣期)**。HarmonyOS NEXT 推出后,元服务成为鸿蒙生态"全场景服务化"的核心载体。服务卡片支持更多尺寸(1x1、2x2、2x4、4x4、4x8 等)、支持动态卡片、支持跨设备同步、支持智慧搜索直达、支持语音唤醒。同时,华为推出了"鸿蒙原生元服务激励计划",鼓励开发者将高频轻量场景(天气、便签、扫码、运动记录、智能家居控制等)以元服务形态交付。

元服务在 HarmonyOS 生态中的定位可以用一张分层图理解:

```
+-------------------------------------------------+
|  传统应用 (Traditional Application)              |
|  - 完整功能、独立图标、需安装                       |
|  - 体积无限制、更新需用户确认                       |
+-------------------------------------------------+
|  元服务 (Atomic Service)                         |
|  - 免安装、卡片优先、入口丰富                       |
|  - 体积 < 10MB、即时更新                          |
|  - 适合轻量高频场景                                |
+-------------------------------------------------+
|  系统服务 (System Service)                       |
|  - 系统内置、开发者不可发布                         |
+-------------------------------------------------+
```

可以看到,元服务填补了"完整应用"与"系统内置服务"之间的生态空白,为开发者提供了一个面向轻量、即时、服务化场景的交付通道。

### 1.3 元服务与传统应用的对比

理解元服务最直接的方式是与传统应用做对比。下表从 12 个维度全面对比两者差异:

| 维度 | 元服务 (Atomic Service) | 传统应用 (Traditional App) |
| --- | --- | --- |
| 安装方式 | 免安装,即点即用 | 需用户确认下载安装 |
| 体积上限 | 10MB(含代码、资源、动态加载库) | 无硬性限制 |
| 入口形态 | 服务卡片、负一屏、智慧搜索、扫码、语音、分享 | 桌面图标、应用市场 |
| 启动速度 | 秒级开,首次加载 < 1s | 冷启动通常 1-3s |
| 图标 | 默认不显示桌面图标 | 必须有桌面图标 |
| 更新策略 | 后台静默更新,用户无感 | 需用户确认更新 |
| 卡片能力 | 必须支持服务卡片(可发布 0-N 张卡片) | 可选支持卡片 |
| 网络限制 | 后台运行受更严格管控 | 后台策略相对宽松 |
| 权限申请 | 部分敏感权限受限 | 完整权限体系 |
| ABI 限制 | 必须支持 HAR (HarmonyOS Archive) | 可使用 HAR 或 HAP |
| 分发渠道 | AppGallery 元服务专区 | AppGallery 应用专区 |
| 适用场景 | 工具类、信息查询类、IoT 控制类等轻量高频场景 | 完整业务流程、深度交互场景 |

理解这种差异对工程决策至关重要。例如,若产品定位是"一次性深度使用"(如视频编辑、大型游戏),传统应用更合适;若定位是"高频轻量触发"(如扫码、查天气、便签),元服务体验更佳。

### 1.4 元服务的工程价值

从工程视角看,元服务为开发者带来以下价值:

- **降低获客成本**——用户无需安装即可体验,转化率显著高于传统应用。华为官方数据表明,部分工具类元服务的转化率比传统应用高 3-5 倍
- **缩短开发周期**——体积限制倒逼功能聚焦,适合 MVP 验证。一个完整元服务通常 2-4 周即可交付
- **多入口曝光**——服务卡片常驻桌面、负一屏推荐、智慧搜索直达,曝光机会远多于传统应用
- **跨设备一致体验**——基于分布式能力,一次开发可在手机、平板、手表等多设备运行,无需重复适配
- **服务流转能力**——支持从一台设备无缝流转到另一台设备继续使用,这是元服务相比其他平台"轻应用"的核心优势
- **数据驱动迭代**——后台静默更新让产品可以高频小步迭代,A/B 测试更易实施

### 1.5 与其他平台轻应用方案的对比

为了帮助有跨平台经验的开发者快速理解,下表将 HarmonyOS 元服务与 iOS App Clips、Android Instant Apps、微信小程序进行对比:

| 维度 | HarmonyOS 元服务 | iOS App Clips | Android Instant Apps | 微信小程序 |
| --- | --- | --- | --- | --- |
| 体积上限 | 10MB | 10MB | 15MB | 主包 2MB,分包 20MB |
| 入口 | 卡片、搜索、扫码、语音、NFC | NFC、扫码、地图、Safari | 搜索、广告、链接 | 微信内入口、扫码 |
| 跨设备 | 支持(1+8+N) | 不支持 | 不支持 | 不支持(仅微信内) |
| 卡片能力 | 原生支持,常驻桌面 | 仅 App Clip Card,临时展示 | 无桌面卡片 | 无桌面卡片 |
| 编程语言 | ArkTS / JS | Swift / Objective-C | Kotlin / Java | WXML/WXSS/JS |
| UI 框架 | ArkUI | SwiftUI / UIKit | Android View / Compose | 自有框架 |
| 分发渠道 | AppGallery | App Store | Google Play | 微信平台 |
| 收益分成 | 与开发者按华为政策分成 | 苹果收取 15-30% | Google 收取 15-30% | 微信收取 10-30% |

可以看到,HarmonyOS 元服务在"卡片能力"与"跨设备流转"两个维度上具备独特优势,这是鸿蒙生态的差异化护城河。

## 2. 学习目标

完成本章学习后,读者应能够:

1. **概念层面**——准确解释元服务的定义、与传统应用的核心差异、在 HarmonyOS 生态中的定位,能够基于产品需求判断是否采用元服务形态
2. **工程层面**——能够使用 DevEco Studio 创建元服务工程,理解工程结构、`module.json5` 配置、FormAbility 配置、卡片尺寸规范等关键约束
3. **卡片开发**——熟练使用 ArkTS 卡片语法开发 1x1、2x2、2x4、4x4 等多尺寸服务卡片,掌握卡片数据绑定、刷新机制、事件交互
4. **数据通信**——理解元服务主体与卡片之间的数据传递机制,能够使用 `formProvider`、`FormBindingData`、SharedStorage 等完成主体到卡片的数据同步
5. **发布流程**——掌握元服务签名、打包、上架 AppGallery Connect 的完整流程,理解审核要点与常见拒审原因
6. **进阶能力**——能够实现卡片定时刷新、跨设备同步、深度链接跳转、卡片分享等高级功能
7. **性能与体积**——理解 10MB 体积约束下的代码与资源优化策略,能够通过 HAR 拆分、资源压缩、代码混淆等手段控制体积
8. **调试排错**——能够使用 DevEco Studio 的卡片预览器、日志查看器、真机调试等工具定位卡片渲染、数据同步、事件回调等问题

## 3. 前置知识

阅读本章前,建议读者具备以下基础:

- **ArkTS 基础**——熟悉 `struct`、装饰器、`async/await` 等语法,已阅读"ArkTS 与 TypeScript 差异"章节
- **ArkUI 基础**——熟练使用 `@Component`、`@Entry`、`@State`、`build()` 等构建 UI,已阅读"ArkUI 声明式语法"章节
- **Stage 模型**——理解 UIAbility、AbilityStage 等概念,已阅读"组件生命周期详解"章节
- **路由与导航**——理解 `router.pushUrl` 等基础路由能力,已阅读"路由跳转与路由栈"章节
- **资源管理**——了解 `$r('app.string.xxx')`、`$r('app.media.xxx')` 等资源引用方式
- **DevEco Studio 基础**——能够创建工程、运行调试、查看日志,已阅读"概述与环境搭建"章节

若读者对上述任何一项不熟悉,建议先完成对应章节学习再回到本章。元服务开发涉及的概念较多,前置知识不足会导致理解困难。

## 4. 核心概念

### 4.1 元服务的工程结构

元服务工程在 DevEco Studio 中使用专用模板创建,其目录结构与传统应用略有差异。一个典型的元服务工程结构如下:

```
MyAtomicService/
├── entry/                          # 主模块(必需)
│   └── src/main/
│       ├── ets/
│       │   ├── entryability/
│       │   │   └── EntryAbility.ets      # 主 UIAbility
│       │   ├── pages/
│       │   │   └── Index.ets              # 主页面
│       │   └── widget/
│       │       └── pages/
│       │           └── WeatherCard.ets     # 卡片 UI 文件
│       ├── resources/
│       │   ├── base/media/                # 图片资源
│       │   └── base/profile/              # 配置文件
│       │       ├── form_config.json        # 卡片配置
│       │       └── main_pages.json        # 路由配置
│       └── module.json5                   # 模块配置(关键)
├── libs/                           # 三方库
├── build-profile.json5             # 构建配置
├── oh-package.json5                # 依赖配置
└── signingConfig/                  # 签名配置
```

与传统应用相比,关键差异在于:

1. **`module.json5`** 中的 `"type"` 字段必须为 `"feature"` 或 `"entry"`,且 `"installationFree"` 字段必须为 `true`,这是元服务的标识
2. **`extensionAbilities`** 中必须配置至少一个 `form` 类型的 ExtensionAbility,即 FormAbility,用于承载卡片能力
3. **`resources/base/profile/form_config.json`** 是卡片元数据配置文件,定义卡片的名称、尺寸、刷新周期等
4. 工程整体体积必须控制在 10MB 以内,包括代码、资源、动态加载库

### 4.2 `module.json5` 关键配置

`module.json5` 是元服务工程的核心配置文件。下表列出与元服务相关的关键字段:

| 字段 | 类型 | 说明 | 示例 |
| --- | --- | --- | --- |
| `name` | string | 模块名称 | `"entry"` |
| `type` | string | 模块类型 | `"entry"` 或 `"feature"` |
| `installationFree` | boolean | 是否免安装(元服务必填) | `true` |
| `srcEntry` | string | 入口代码路径 | `"./ets/entryability/EntryAbility.ets"` |
| `description` | string | 模块描述 | `"$string:module_desc"` |
| `mainElement` | string | 主入口 UIAbility 名称 | `"EntryAbility"` |
| `deviceTypes` | array | 支持设备类型 | `["phone","tablet","wearable"]` |
| `extensionAbilities` | array | ExtensionAbility 列表(含 FormAbility) | 见示例 |
| `metadata` | array | 元数据(指向卡片配置文件) | 见示例 |
| `abilities` | array | UIAbility 列表 | 见示例 |

一个完整的元服务 `module.json5` 示例:

```json5
{
  "module": {
    "name": "entry",
    "type": "entry",
    "description": "$string:module_desc",
    "mainElement": "EntryAbility",
    "deviceTypes": ["phone", "tablet"],
    "installationFree": true,
    "srcEntry": "./ets/entryability/EntryAbility.ets",
    "abilities": [
      {
        "name": "EntryAbility",
        "srcEntry": "./ets/entryability/EntryAbility.ets",
        "description": "$string:EntryAbility_desc",
        "label": "$string:EntryAbility_label",
        "icon": "$media:icon",
        "startWindowIcon": "$media:icon",
        "startWindowBackground": "$color:start_window_background"
      }
    ],
    "extensionAbilities": [
      {
        "name": "WeatherFormAbility",
        "srcEntry": "./ets/formability/WeatherFormAbility.ets",
        "type": "form",
        "metadata": [
          {
            "name": "ohos.extension.form",
            "resource": "$profile:form_config"
          }
        ]
      }
    ]
  }
}
```

关键字段解读:

- **`installationFree: true`**——声明此模块为元服务,系统将按元服务规则调度与分发
- **`extensionAbilities`** 中的 `type: "form"`——声明这是一个 FormAbility,用于承载服务卡片能力
- **`metadata`** 中的 `ohos.extension.form`——指向卡片配置文件,卡片的具体尺寸、刷新周期等元数据在配置文件中定义

### 4.3 卡片配置文件 `form_config.json`

卡片配置文件位于 `resources/base/profile/form_config.json`,定义卡片的元数据。每个元服务可发布多张卡片,每张卡片在 `forms` 数组中独立配置:

```json5
{
  "forms": [
    {
      "name": "weather_card_2x2",
      "displayName": "天气卡片",
      "description": "显示当前天气",
      "src": "./ets/widget/pages/WeatherCard.ets",
      "uiSyntax": "arkts",
      "window": {
        "designDimension": "720"
      },
      "isDefault": true,
      "colorMode": "auto",
      "supportDimensions": ["2x2"],
      "defaultDimension": "2x2",
      "updateEnabled": true,
      "scheduledUpdateTime": "10:30",
      "updateDuration": 1,
      "formConfigAbility": "com.example.myatomic_service.EntryAbility"
    },
    {
      "name": "weather_card_2x4",
      "displayName": "天气卡片(宽)",
      "description": "显示天气详情",
      "src": "./ets/widget/pages/WeatherCardLarge.ets",
      "uiSyntax": "arkts",
      "window": {
        "designDimension": "720"
      },
      "isDefault": false,
      "colorMode": "auto",
      "supportDimensions": ["2x4"],
      "defaultDimension": "2x4",
      "updateEnabled": true,
      "updateDuration": 1,
      "formConfigAbility": "com.example.myatomic_service.EntryAbility"
    }
  ]
}
```

关键字段详解:

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 卡片唯一标识,代码中通过此名称引用 |
| `displayName` | string | 卡片在用户桌面长按菜单中显示的名称 |
| `description` | string | 卡片描述,显示在卡片添加界面 |
| `src` | string | 卡片 UI 文件路径(ArkTS 卡片为 `.ets` 文件) |
| `uiSyntax` | string | UI 语法,`"arkts"` 或 `"hml"`(JS 卡片) |
| `window.designDimension` | string | 设计基准分辨率,通常 `"720"` |
| `isDefault` | boolean | 是否为默认卡片(用户添加时默认选中) |
| `colorMode` | string | 颜色模式,`"auto"` / `"light"` / `"dark"` |
| `supportDimensions` | array | 支持的尺寸列表,如 `["2x2", "2x4", "4x4"]` |
| `defaultDimension` | string | 默认尺寸,必须是 `supportDimensions` 之一 |
| `updateEnabled` | boolean | 是否开启定时刷新 |
| `scheduledUpdateTime` | string | 定时刷新时间(24 小时制,如 `"10:30"`) |
| `updateDuration` | number | 定时刷新间隔,单位为 30 分钟(如 `1` 表示 30 分钟,`2` 表示 60 分钟) |
| `formConfigAbility` | string | 卡片配置 Ability,用户长按卡片"配置"时跳转的 Ability |

### 4.4 卡片尺寸规范

HarmonyOS 支持的卡片尺寸遵循网格规范。手机设备上典型支持以下尺寸:

| 尺寸标识 | 网格占用 | 典型尺寸(px,720 设计基准) | 适用场景 |
| --- | --- | --- | --- |
| `1x1` | 1x1 格 | 168x168 | 单一信息(如开关、数字) |
| `2x2` | 2x2 格 | 342x168 | 信息展示(如天气简卡) |
| `2x4` | 2x4 格 | 342x348 | 信息列表(如待办) |
| `4x2` | 4x2 格 | 708x168 | 横向卡片(如音乐播放器) |
| `4x4` | 4x4 格 | 708x708 | 大型卡片(如地图、相册) |
| `2x8` | 2x8 格 | 342x720 | 长卡片(如长列表) |
| `4x8` | 4x8 格 | 708x720 | 全屏卡片 |

不同尺寸的卡片需要独立设计 UI,通常做法是:

- 共享同一份业务数据
- 根据尺寸切换 UI 布局(类似响应式设计)
- 小尺寸展示核心信息,大尺寸展示完整信息

卡片尺寸的网格坐标系可以用以下公式描述。设屏幕宽度为 $W$,网格列数为 $C$(手机通常为 6 列),则每个网格单元宽度为:

$$
g = \frac{W - (C + 1) \cdot m}{C}
$$

其中 $m$ 为网格间距。一张 $a \times b$ 卡片的实际像素宽度为:

$$
w_{card} = a \cdot g + (a - 1) \cdot m
$$

这种网格化设计保证了不同尺寸卡片在桌面布局时对齐美观。

### 4.5 FormAbility 详解

FormAbility 是元服务中专门管理卡片生命周期的 ExtensionAbility。它继承自 `FormExtensionAbility`,并实现以下核心回调:

| 回调 | 触发时机 | 典型用途 |
| --- | --- | --- |
| `onAddForm(want)` | 用户添加卡片到桌面 | 初始化卡片数据,返回初始数据 |
| `onCastToNormalForm(formId)` | 临时卡片转为普通卡片 | 数据迁移 |
| `onUpdateForm(formId)` | 卡片定时刷新触发 | 重新获取数据并刷新 |
| `onFormEvent(formId, message)` | 卡片内事件触发(如按钮点击) | 处理卡片交互 |
| `onAcquireFormState(want)` | 系统查询卡片状态 | 返回 `FORM_STATE_READY` 等 |
| `onVisibilityChange(formStatus)` | 卡片可见性变化 | 暂停/恢复数据刷新 |
| `onRouteTo(formId, baseInfo)` | 卡片点击跳转 | 跳转到元服务主体对应页面 |

一个最小化的 FormAbility 实现:

```typescript
import FormExtensionAbility from '@ohos.app.ability.FormExtensionAbility';
import formProvider from '@ohos.app.form.formProvider';
import formBindingData from '@ohos.app.form.formBindingData';

export default class WeatherFormAbility extends FormExtensionAbility {
  // 用户添加卡片时触发
  onAddForm(want): formBindingData.FormBindingData {
    console.info('WeatherFormAbility onAddForm');
    const formId = want.parameters?.['ohos.extra.param.key_form_identity'];
    // 返回卡片初始数据
    return formBindingData.createFormBindingData({
      city: 'Shanghai',
      temperature: '25°C',
      weather: 'Sunny'
    });
  }

  // 定时刷新时触发
  async onUpdateForm(formId): Promise<void> {
    console.info(`WeatherFormAbility onUpdateForm: ${formId}`);
    const data = await this.fetchWeather();
    // 通过 formProvider 更新卡片数据
    formProvider.updateForm(formId,
      formBindingData.createFormBindingData(data));
  }

  // 卡片内事件触发
  onFormEvent(formId, message): void {
    console.info(`WeatherFormAbility onFormEvent: ${formId}, ${JSON.stringify(message)}`);
    if (message.params === 'refresh') {
      this.onUpdateForm(formId);
    }
  }

  // 卡片点击跳转
  onRouteTo(formId, baseInfo): void {
    console.info(`WeatherFormAbility onRouteTo: ${formId}`);
    // 跳转到元服务主体
    this.context.startAbility({
      bundleName: 'com.example.myatomic_service',
      abilityName: 'EntryAbility',
      parameters: {
        source: 'weather_card',
        formId: formId
      }
    });
  }

  private async fetchWeather(): Promise<Record<string, string>> {
    // 模拟网络请求
    return {
      city: 'Shanghai',
      temperature: '26°C',
      weather: 'Cloudy'
    };
  }
}
```

理解 FormAbility 的关键点:

1. **`onAddForm` 必须返回 `FormBindingData`**——这是卡片的初始数据,卡片 UI 首次渲染时使用
2. **`onUpdateForm` 是异步的**——可以执行网络请求,完成后通过 `formProvider.updateForm` 推送新数据
3. **`onFormEvent` 是卡片与 FormAbility 的交互通道**——卡片内的按钮点击可通过 `postCardAction` 触发此回调
4. **`onRouteTo` 是卡片点击跳转的钩子**——通常用于跳转到元服务主体的对应页面

### 4.6 卡片 UI 文件结构

ArkTS 卡片 UI 文件使用 ArkUI 声明式语法,但有以下约束:

1. 不能使用 `@Entry` 装饰器(卡片不是页面入口)
2. 必须使用 `@Component` 装饰器,且组件名必须与文件名对应
3. 必须通过 `@State` 接收 `LocalStorage` 中的数据(数据来自 FormAbility 的 `onAddForm` 返回值)
4. 不能直接调用网络请求,所有数据必须通过 FormAbility 提供
5. 不能直接修改 `@State`,如需触发刷新,通过 `postCardAction` 通知 FormAbility

一个典型的 ArkTS 卡片 UI 文件:

```typescript
let storage = new LocalStorage();

@Entry(storage)
@Component
struct WeatherCard {
  @LocalStorageProp('city') city: string = '';
  @LocalStorageProp('temperature') temperature: string = '';
  @LocalStorageProp('weather') weather: string = '';

  build() {
    Column() {
      // 城市
      Text(this.city)
        .fontSize(14)
        .fontColor('#666666')

      // 温度(大字)
      Text(this.temperature)
        .fontSize(36)
        .fontWeight(FontWeight.Bold)
        .fontColor('#333333')
        .margin({ top: 8, bottom: 8 })

      // 天气
      Text(this.weather)
        .fontSize(14)
        .fontColor('#666666')

      // 刷新按钮
      Button('刷新')
        .fontSize(12)
        .margin({ top: 12 })
        .onClick(() => {
          postCardAction(this, {
            'action': 'message',
            'params': { 'action': 'refresh' }
          });
        })
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(16)
    .alignItems(HorizontalAlign.Center)
    .justifyContent(FlexAlign.Center)
  }
}
```

关键点解读:

- **`LocalStorage` 与 `@LocalStorageProp`**——卡片通过 LocalStorage 接收 FormAbility 传递的数据。`@LocalStorageProp('city')` 表示从 LocalStorage 中读取 `city` 字段作为状态
- **`postCardAction`**——卡片向 FormAbility 发送消息的全局函数。`action: 'message'` 表示发送消息,FormAbility 的 `onFormEvent` 会收到回调
- **样式约束**——卡片 UI 应使用相对单位(`'100%'`)或固定 px 值,避免使用 vp/vp 等 API(卡片环境不支持)

### 4.7 卡片与元服务主体的数据通信

元服务主体与卡片之间需要双向通信,常见场景包括:

- **主体 -> 卡片**:主体获取新数据后,主动推送刷新卡片
- **卡片 -> 主体**:卡片点击跳转到主体,并传递上下文(如点击的项 ID)
- **卡片 -> FormAbility**:卡片按钮触发 FormAbility 处理逻辑(如收藏、刷新)

#### 4.7.1 主体 -> 卡片:主动刷新

元服务主体在需要时可通过 `formProvider.updateForm` 主动刷新指定卡片:

```typescript
import formProvider from '@ohos.app.form.formProvider';
import formBindingData from '@ohos.app.form.formBindingData';

class WeatherService {
  // 主动刷新指定卡片
  async refreshCard(formId: string): Promise<void> {
    const data = await this.fetchLatestWeather();
    await formProvider.updateForm(
      formId,
      formBindingData.createFormBindingData(data)
    );
  }

  // 刷新该应用所有卡片
  async refreshAllCards(): Promise<void> {
    const forms = await formProvider.getFormsInfo({
      bundleName: 'com.example.myatomic_service'
    });
    for (const form of forms) {
      await this.refreshCard(form.id);
    }
  }

  private async fetchLatestWeather(): Promise<Record<string, string>> {
    return { city: 'Shanghai', temperature: '27°C', weather: 'Rainy' };
  }
}
```

#### 4.7.2 卡片 -> 主体:跳转传参

卡片点击触发跳转时,可通过 `router` action 携带参数:

```typescript
// 卡片 UI 文件中
Button('查看详情')
  .onClick(() => {
    postCardAction(this, {
      'action': 'router',
      'bundleName': 'com.example.myatomic_service',
      'abilityName': 'EntryAbility',
      'params': {
        'city': this.city,
        'source': 'weather_card_2x2'
      }
    });
  })
```

元服务主体的 `EntryAbility` 在 `onCreate` 或 `onNewWant` 中接收参数:

```typescript
import UIAbility from '@ohos.app.ability.UIAbility';

export default class EntryAbility extends UIAbility {
  onCreate(want, launchParam): void {
    const params = want.parameters;
    if (params?.source === 'weather_card_2x2') {
      // 来自卡片跳转
      const city = params.city as string;
      console.info(`Jumped from card, city: ${city}`);
      // 可以在这里持久化城市,或更新 UI 状态
    }
  }

  onNewWant(want, launchParam): void {
    // 应用已在后台,通过 onNewWant 接收新的跳转参数
    const params = want.parameters;
    console.info(`onNewWant: ${JSON.stringify(params)}`);
  }
}
```

#### 4.7.3 卡片 -> FormAbility:事件触发

卡片按钮通过 `message` action 向 FormAbility 发送消息,FormAbility 在 `onFormEvent` 中处理:

```typescript
// 卡片 UI 中点击收藏按钮
Button('收藏')
  .onClick(() => {
    postCardAction(this, {
      'action': 'message',
      'params': {
        'action': 'favorite',
        'city': this.city
      }
    });
  })

// FormAbility 中接收
onFormEvent(formId, message): void {
  const action = message.params?.action;
  if (action === 'favorite') {
    const city = message.params?.city;
    this.saveFavorite(formId, city);
  } else if (action === 'refresh') {
    this.onUpdateForm(formId);
  }
}

private async saveFavorite(formId: string, city: string): Promise<void> {
  // 保存到本地存储或上传到服务器
  console.info(`Favorite city ${city} for card ${formId}`);
}
```

### 4.8 卡片的数据模型与状态管理

卡片的数据通过 `FormBindingData` 传递,本质上是一个 `Record<string, Object>` 结构。需要理解以下几点:

1. **数据序列化**——`FormBindingData` 中的数据会被序列化后传递给卡片 UI,因此只能包含可序列化的值(基本类型、对象、数组),不能包含函数、类实例等
2. **数据大小限制**——单次 `updateForm` 的数据大小不能超过 1KB,大数据应分多次更新或通过 SharedStorage 共享
3. **数据一致性**——FormAbility 与卡片运行在独立进程中,数据通过 IPC 传递,不是直接内存共享

### 4.9 SharedStorage 跨进程共享

当卡片与主体需要共享较大数据时,可使用 `AppStorage` 的分布式变体或 SharedStorage。SharedStorage 提供跨进程读写能力:

```typescript
import preferences from '@ohos.data.preferences';

class SharedDataService {
  private storeName = 'weather_shared';

  async saveData(key: string, value: string): Promise<void> {
    const pref = await preferences.getPreferences(
      this.context, this.storeName);
    await pref.put(key, value);
    await pref.flush();
  }

  async loadData(key: string): Promise<string> {
    const pref = await preferences.getPreferences(
      this.context, this.storeName);
    return await pref.get(key, '') as string;
  }
}
```

FormAbility 与主体使用相同的 `storeName`,即可实现数据共享。

## 5. 代码示例

### 5.1 示例 1:最简单的 2x2 天气卡片

本示例演示一个最简单的天气卡片,展示静态数据。

**FormAbility 实现**:

```typescript
// WeatherFormAbility.ets
import FormExtensionAbility from '@ohos.app.ability.FormExtensionAbility';
import formBindingData from '@ohos.app.form.formBindingData';

export default class WeatherFormAbility extends FormExtensionAbility {
  onAddForm(want): formBindingData.FormBindingData {
    return formBindingData.createFormBindingData({
      city: 'Beijing',
      temperature: '22°C',
      weather: 'Sunny'
    });
  }
}
```

**卡片 UI 实现**:

```typescript
// WeatherCard.ets
let storage = new LocalStorage();

@Entry(storage)
@Component
struct WeatherCard {
  @LocalStorageProp('city') city: string = '';
  @LocalStorageProp('temperature') temperature: string = '';
  @LocalStorageProp('weather') weather: string = '';

  build() {
    Column() {
      Text(this.city)
        .fontSize(14)
        .fontColor('#666666')

      Text(this.temperature)
        .fontSize(36)
        .fontWeight(FontWeight.Bold)
        .fontColor('#333333')
        .margin({ top: 8, bottom: 8 })

      Text(this.weather)
        .fontSize(14)
        .fontColor('#666666')
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(16)
    .alignItems(HorizontalAlign.Center)
    .justifyContent(FlexAlign.Center)
  }
}
```

**`form_config.json` 配置**:

```json5
{
  "forms": [
    {
      "name": "weather_card",
      "displayName": "天气卡片",
      "description": "显示当前天气",
      "src": "./ets/widget/pages/WeatherCard.ets",
      "uiSyntax": "arkts",
      "window": { "designDimension": "720" },
      "isDefault": true,
      "colorMode": "auto",
      "supportDimensions": ["2x2"],
      "defaultDimension": "2x2",
      "updateEnabled": false,
      "formConfigAbility": "com.example.myatomic_service.EntryAbility"
    }
  ]
}
```

### 5.2 示例 2:定时刷新的动态卡片

本示例演示卡片每 30 分钟自动刷新一次数据。

**`form_config.json` 配置**:

```json5
{
  "forms": [
    {
      "name": "weather_card_dynamic",
      "displayName": "天气卡片(动态)",
      "src": "./ets/widget/pages/WeatherCard.ets",
      "uiSyntax": "arkts",
      "isDefault": true,
      "supportDimensions": ["2x2"],
      "defaultDimension": "2x2",
      "updateEnabled": true,
      "updateDuration": 1,
      "formConfigAbility": "com.example.myatomic_service.EntryAbility"
    }
  ]
}
```

**FormAbility 实现**:

```typescript
import FormExtensionAbility from '@ohos.app.ability.FormExtensionAbility';
import formProvider from '@ohos.app.form.formProvider';
import formBindingData from '@ohos.app.form.formBindingData';
import http from '@ohos.net.http';

interface WeatherData {
  city: string;
  temperature: string;
  weather: string;
  humidity: string;
}

export default class WeatherFormAbility extends FormExtensionAbility {
  onAddForm(want): formBindingData.FormBindingData {
    return formBindingData.createFormBindingData({
      city: 'Loading...',
      temperature: '--',
      weather: '--'
    });
  }

  async onUpdateForm(formId): Promise<void> {
    try {
      const data = await this.fetchWeatherFromServer();
      await formProvider.updateForm(
        formId,
        formBindingData.createFormBindingData(data)
      );
    } catch (e) {
      console.error(`Update weather card failed: ${e.message}`);
    }
  }

  private async fetchWeatherFromServer(): Promise<WeatherData> {
    // 实际项目中应调用真实 API
    const httpRequest = http.createHttp();
    try {
      const response = await httpRequest.request(
        'https://api.weather.example.com/current',
        { method: http.RequestMethod.GET }
      );
      const result = JSON.parse(response.result as string) as WeatherData;
      return result;
    } finally {
      httpRequest.destroy();
    }
  }
}
```

### 5.3 示例 3:多尺寸卡片适配

本示例演示同一份业务数据,适配 2x2 与 4x4 两种尺寸卡片。

**`form_config.json` 配置**:

```json5
{
  "forms": [
    {
      "name": "todo_card_small",
      "displayName": "待办(小)",
      "src": "./ets/widget/pages/TodoCardSmall.ets",
      "uiSyntax": "arkts",
      "supportDimensions": ["2x2"],
      "defaultDimension": "2x2",
      "updateEnabled": true,
      "updateDuration": 1
    },
    {
      "name": "todo_card_large",
      "displayName": "待办(大)",
      "src": "./ets/widget/pages/TodoCardLarge.ets",
      "uiSyntax": "arkts",
      "supportDimensions": ["4x4"],
      "defaultDimension": "4x4",
      "updateEnabled": true,
      "updateDuration": 1
    }
  ]
}
```

**小尺寸卡片 UI**:

```typescript
// TodoCardSmall.ets
let storage = new LocalStorage();

@Entry(storage)
@Component
struct TodoCardSmall {
  @LocalStorageProp('count') count: number = 0;
  @LocalStorageProp('nextTask') nextTask: string = '';

  build() {
    Column() {
      Text('待办')
        .fontSize(14)
        .fontColor('#666666')

      Text(`${this.count}`)
        .fontSize(40)
        .fontWeight(FontWeight.Bold)
        .fontColor('#333333')
        .margin({ top: 8, bottom: 8 })

      Text(this.nextTask)
        .fontSize(12)
        .fontColor('#999999')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(16)
    .alignItems(HorizontalAlign.Center)
    .justifyContent(FlexAlign.Center)
    .onClick(() => {
      postCardAction(this, {
        'action': 'router',
        'bundleName': 'com.example.myatomic_service',
        'abilityName': 'EntryAbility'
      });
    })
  }
}
```

**大尺寸卡片 UI**:

```typescript
// TodoCardLarge.ets
interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

let storage = new LocalStorage();

@Entry(storage)
@Component
struct TodoCardLarge {
  @LocalStorageProp('todos') todos: string = '';
  @LocalStorageProp('count') count: number = 0;

  private parsedTodos: TodoItem[] = [];

  aboutToAppear(): void {
    try {
      this.parsedTodos = JSON.parse(this.todos) as TodoItem[];
    } catch (e) {
      this.parsedTodos = [];
    }
  }

  build() {
    Column() {
      Row() {
        Text('待办列表')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
        Blank()
        Text(`共 ${this.count} 项`)
          .fontSize(12)
          .fontColor('#999999')
      }
      .width('100%')
      .margin({ bottom: 12 })

      List() {
        ForEach(this.parsedTodos.slice(0, 5), (item: TodoItem) => {
          ListItem() {
            Row() {
              Text(item.done ? '✓' : '○')
                .fontSize(14)
                .fontColor(item.done ? '#4CAF50' : '#999999')
                .width(24)
              Text(item.text)
                .fontSize(14)
                .fontColor(item.done ? '#999999' : '#333333')
                .layoutWeight(1)
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .width('100%')
            .padding({ top: 8, bottom: 8 })
          }
        }, (item: TodoItem) => item.id)
      }
      .layoutWeight(1)
      .width('100%')

      Button('查看全部')
        .fontSize(12)
        .margin({ top: 12 })
        .onClick(() => {
          postCardAction(this, {
            'action': 'router',
            'bundleName': 'com.example.myatomic_service',
            'abilityName': 'EntryAbility'
          });
        })
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(16)
  }
}
```

### 5.4 示例 4:卡片与主体数据联动

本示例演示主体更新数据后,主动推送刷新卡片。

**元服务主体**:

```typescript
// EntryAbility.ets
import UIAbility from '@ohos.app.ability.UIAbility';
import formProvider from '@ohos.app.form.formProvider';
import formBindingData from '@ohos.app.form.formBindingData';

export default class EntryAbility extends UIAbility {
  async onCreate(want, launchParam): Promise<void> {
    // 用户在主体内修改城市后,刷新所有卡片
    await this.refreshAllCards();
  }

  async refreshAllCards(): Promise<void> {
    const forms = await formProvider.getFormsInfo({
      bundleName: 'com.example.myatomic_service'
    });
    for (const form of forms) {
      await this.refreshCard(form.id);
    }
  }

  async refreshCard(formId: string): Promise<void> {
    const data = await this.fetchUserData();
    await formProvider.updateForm(
      formId,
      formBindingData.createFormBindingData(data)
    );
  }

  private async fetchUserData(): Promise<Record<string, Object>> {
    return {
      city: 'Shanghai',
      temperature: '24°C',
      weather: 'Cloudy',
      humidity: '65%',
      wind: 'NE 3'
    };
  }
}
```

## 6. 实战案例

### 6.1 案例:完整天气元服务

本案例演示一个完整的天气元服务,包含:

- 2x2 小卡片:展示城市、温度、天气
- 4x4 大卡片:展示完整天气信息(含湿度、风速、未来 3 天预报)
- 主体页面:城市管理、天气详情、设置
- 定时刷新:每 30 分钟更新一次
- 卡片交互:点击卡片跳转主体,点击刷新按钮触发 FormAbility

#### 6.1.1 工程结构

```
WeatherAtomicService/
├── entry/
│   └── src/main/
│       ├── ets/
│       │   ├── entryability/
│       │   │   └── EntryAbility.ets
│       │   ├── pages/
│       │   │   ├── Index.ets              # 首页(城市天气列表)
│       │   │   ├── CityDetail.ets          # 城市详情
│       │   │   └── Settings.ets            # 设置
│       │   ├── formability/
│       │   │   └── WeatherFormAbility.ets  # 卡片 FormAbility
│       │   ├── widget/
│       │   │   └── pages/
│       │   │       ├── WeatherCardSmall.ets   # 2x2 卡片
│       │   │       └── WeatherCardLarge.ets   # 4x4 卡片
│       │   ├── model/
│       │   │   ├── WeatherData.ets         # 数据模型
│       │   │   └── City.ets                # 城市模型
│       │   ├── service/
│       │   │   ├── WeatherService.ets      # 天气服务
│       │   │   ├── CityService.ets          # 城市服务
│       │   │   └── PreferencesService.ets  # 本地存储
│       │   └── common/
│       │       ├── Constants.ets           # 常量
│       │       └── Logger.ets              # 日志
│       └── resources/
│           ├── base/
│           │   ├── media/                  # 图片资源
│           │   ├── element/string.json     # 字符串
│           │   └── profile/
│           │       ├── form_config.json    # 卡片配置
│           │       └── main_pages.json    # 路由配置
│           └── zh_CN/element/string.json   # 中文字符串
├── build-profile.json5
├── oh-package.json5
└── signingConfig/
```

#### 6.1.2 数据模型定义

```typescript
// model/WeatherData.ets
export interface WeatherData {
  city: string;
  temperature: number;        // 当前温度(摄氏度)
  weather: string;            // 天气描述(Sunny/Cloudy/Rainy 等)
  humidity: number;           // 湿度百分比
  windSpeed: number;          // 风速 km/h
  windDirection: string;      // 风向
  forecast: ForecastItem[];   // 未来预报
  updatedAt: number;          // 更新时间戳
}

export interface ForecastItem {
  date: string;       // YYYY-MM-DD
  high: number;       // 最高温度
  low: number;        // 最低温度
  weather: string;
}

// model/City.ets
export interface City {
  id: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}
```

#### 6.1.3 天气服务实现

```typescript
// service/WeatherService.ets
import http from '@ohos.net.http';
import { WeatherData, ForecastItem } from '../model/WeatherData';

const API_BASE = 'https://api.weather.example.com';
const API_KEY = 'your_api_key_here';

export class WeatherService {
  async fetchWeather(lat: number, lon: number): Promise<WeatherData> {
    const httpRequest = http.createHttp();
    try {
      const response = await httpRequest.request(
        `${API_BASE}/v1/current?lat=${lat}&lon=${lon}&key=${API_KEY}`,
        { method: http.RequestMethod.GET,
          header: { 'Content-Type': 'application/json' },
          connectTimeout: 5000,
          readTimeout: 5000
        }
      );
      if (response.responseCode !== 200) {
        throw new Error(`API error: ${response.responseCode}`);
      }
      const raw = JSON.parse(response.result as string);
      return this.transform(raw);
    } finally {
      httpRequest.destroy();
    }
  }

  async fetchForecast(lat: number, lon: number): Promise<ForecastItem[]> {
    // 类似 fetchWeather,但调用预报接口
    return [];
  }

  private transform(raw: Record<string, Object>): WeatherData {
    return {
      city: raw.city as string,
      temperature: raw.temp as number,
      weather: raw.weather as string,
      humidity: raw.humidity as number,
      windSpeed: raw.wind_speed as number,
      windDirection: raw.wind_dir as string,
      forecast: [],
      updatedAt: Date.now()
    };
  }
}
```

#### 6.1.4 FormAbility 完整实现

```typescript
// formability/WeatherFormAbility.ets
import FormExtensionAbility from '@ohos.app.ability.FormExtensionAbility';
import formProvider from '@ohos.app.form.formProvider';
import formBindingData from '@ohos.app.form.formBindingData';
import preferences from '@ohos.data.preferences';
import { WeatherService } from '../service/WeatherService';
import { City } from '../model/City';

export default class WeatherFormAbility extends FormExtensionAbility {
  private weatherService = new WeatherService();

  async onAddForm(want): Promise<formBindingData.FormBindingData> {
    const formId = want.parameters?.['ohos.extra.param.key_form_identity'];
    const city = await this.getDefaultCity();
    const data = await this.fetchWeatherSafely(city);
    return formBindingData.createFormBindingData(data);
  }

  async onUpdateForm(formId): Promise<void> {
    try {
      const city = await this.getDefaultCity();
      const data = await this.fetchWeatherSafely(city);
      await formProvider.updateForm(
        formId, formBindingData.createFormBindingData(data));
    } catch (e) {
      console.error(`Update weather card failed: ${e.message}`);
    }
  }

  async onFormEvent(formId, message): Promise<void> {
    const action = message.params?.action;
    if (action === 'refresh') {
      await this.onUpdateForm(formId);
    } else if (action === 'switch_city') {
      await this.switchToNextCity();
      await this.onUpdateForm(formId);
    }
  }

  onRouteTo(formId, baseInfo): void {
    this.context.startAbility({
      bundleName: 'com.example.weather_service',
      abilityName: 'EntryAbility',
      parameters: { source: 'weather_card', formId }
    });
  }

  private async getDefaultCity(): Promise<City> {
    const pref = await preferences.getPreferences(
      this.context, 'weather_prefs');
    const cityJson = await pref.get('default_city', '') as string;
    if (cityJson.length === 0) {
      return { id: 'shanghai', name: '上海', province: '上海',
        latitude: 31.23, longitude: 121.47, isDefault: true };
    }
    return JSON.parse(cityJson) as City;
  }

  private async fetchWeatherSafely(city: City): Promise<Record<string, Object>> {
    try {
      const data = await this.weatherService.fetchWeather(
        city.latitude, city.longitude);
      return {
        city: city.name,
        temperature: `${data.temperature}°C`,
        weather: data.weather,
        humidity: `湿度 ${data.humidity}%`,
        wind: `${data.windDirection} ${data.windSpeed}km/h`,
        updatedAt: this.formatTime(data.updatedAt)
      };
    } catch (e) {
      return {
        city: city.name,
        temperature: '--',
        weather: '加载失败',
        humidity: '',
        wind: '',
        updatedAt: ''
      };
    }
  }

  private async switchToNextCity(): Promise<void> {
    // 切换到下一个城市
  }

  private formatTime(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
```

#### 6.1.5 2x2 卡片 UI

```typescript
// widget/pages/WeatherCardSmall.ets
let storage = new LocalStorage();

@Entry(storage)
@Component
struct WeatherCardSmall {
  @LocalStorageProp('city') city: string = '';
  @LocalStorageProp('temperature') temperature: string = '';
  @LocalStorageProp('weather') weather: string = '';
  @LocalStorageProp('updatedAt') updatedAt: string = '';

  build() {
    Column() {
      Row() {
        Text(this.city)
          .fontSize(14)
          .fontColor('#333333')
        Blank()
        Text(this.updatedAt)
          .fontSize(10)
          .fontColor('#999999')
      }
      .width('100%')

      Column() {
        Text(this.temperature)
          .fontSize(40)
          .fontWeight(FontWeight.Bold)
          .fontColor('#333333')

        Text(this.weather)
          .fontSize(14)
          .fontColor('#666666')
          .margin({ top: 4 })
      }
      .layoutWeight(1)
      .justifyContent(FlexAlign.Center)

      Row() {
        Button('刷新')
          .fontSize(10)
          .height(24)
          .padding({ left: 8, right: 8 })
          .backgroundColor('#F0F0F0')
          .fontColor('#333333')
          .onClick(() => {
            postCardAction(this, {
              'action': 'message',
              'params': { 'action': 'refresh' }
            });
          })
        Blank()
        Text('查看详情 >')
          .fontSize(10)
          .fontColor('#007DFF')
          .onClick(() => {
            postCardAction(this, {
              'action': 'router',
              'bundleName': 'com.example.weather_service',
              'abilityName': 'EntryAbility'
            });
          })
      }
      .width('100%')
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#FFFFFF')
    .borderRadius(16)
    .onClick(() => {
      postCardAction(this, {
        'action': 'router',
        'bundleName': 'com.example.weather_service',
        'abilityName': 'EntryAbility'
      });
    })
  }
}
```

#### 6.1.6 4x4 大卡片 UI

```typescript
// widget/pages/WeatherCardLarge.ets
let storage = new LocalStorage();

@Entry(storage)
@Component
struct WeatherCardLarge {
  @LocalStorageProp('city') city: string = '';
  @LocalStorageProp('temperature') temperature: string = '';
  @LocalStorageProp('weather') weather: string = '';
  @LocalStorageProp('humidity') humidity: string = '';
  @LocalStorageProp('wind') wind: string = '';
  @LocalStorageProp('updatedAt') updatedAt: string = '';

  build() {
    Column() {
      // 头部:城市 + 更新时间
      Row() {
        Text(this.city)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor('#333333')
        Blank()
        Text(this.updatedAt)
          .fontSize(10)
          .fontColor('#999999')
      }
      .width('100%')
      .margin({ bottom: 12 })

      // 主要信息:温度 + 天气
      Row() {
        Column() {
          Text(this.temperature)
            .fontSize(48)
            .fontWeight(FontWeight.Bold)
            .fontColor('#333333')
          Text(this.weather)
            .fontSize(14)
            .fontColor('#666666')
            .margin({ top: 4 })
        }
        .alignItems(HorizontalAlign.Start)
        .layoutWeight(1)

        // 天气图标占位(实际应使用 Image)
        Text('☀')
          .fontSize(48)
      }
      .width('100%')
      .margin({ bottom: 16 })

      // 次要信息:湿度 + 风速
      Row() {
        Column() {
          Text('湿度')
            .fontSize(10)
            .fontColor('#999999')
          Text(this.humidity)
            .fontSize(14)
            .fontColor('#333333')
            .margin({ top: 2 })
        }
        .layoutWeight(1)

        Column() {
          Text('风速')
            .fontSize(10)
            .fontColor('#999999')
          Text(this.wind)
            .fontSize(14)
            .fontColor('#333333')
            .margin({ top: 2 })
        }
        .layoutWeight(1)
      }
      .width('100%')
      .padding({ top: 12, bottom: 12 })
      .border({ width: { top: 1, bottom: 1 }, color: '#F0F0F0' })

      // 操作按钮
      Row() {
        Button('刷新')
          .fontSize(12)
          .height(32)
          .layoutWeight(1)
          .backgroundColor('#007DFF')
          .fontColor('#FFFFFF')
          .onClick(() => {
            postCardAction(this, {
              'action': 'message',
              'params': { 'action': 'refresh' }
            });
          })

        Button('切换城市')
          .fontSize(12)
          .height(32)
          .layoutWeight(1)
          .margin({ left: 8 })
          .backgroundColor('#F0F0F0')
          .fontColor('#333333')
          .onClick(() => {
            postCardAction(this, {
              'action': 'message',
              'params': { 'action': 'switch_city' }
            });
          })
      }
      .width('100%')
      .margin({ top: 12 })
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(16)
  }
}
```

#### 6.1.7 主体页面

```typescript
// pages/Index.ets
import { WeatherService } from '../service/WeatherService';
import { City } from '../model/City';
import formProvider from '@ohos.app.form.formProvider';
import formBindingData from '@ohos.app.form.formBindingData';

@Entry
@Component
struct IndexPage {
  @State cities: City[] = [];
  @State currentCity: City | null = null;
  @State weather: WeatherData | null = null;
  @State loading: boolean = false;

  private weatherService = new WeatherService();

  async aboutToAppear(): Promise<void> {
    await this.loadCities();
    await this.loadWeather();
  }

  private async loadCities(): Promise<void> {
    // 从本地存储加载城市列表
    this.cities = [
      { id: 'shanghai', name: '上海', province: '上海',
        latitude: 31.23, longitude: 121.47, isDefault: true },
      { id: 'beijing', name: '北京', province: '北京',
        latitude: 39.90, longitude: 116.40, isDefault: false }
    ];
    this.currentCity = this.cities.find(c => c.isDefault) ?? this.cities[0];
  }

  private async loadWeather(): Promise<void> {
    if (this.currentCity === null) return;
    this.loading = true;
    try {
      this.weather = await this.weatherService.fetchWeather(
        this.currentCity.latitude, this.currentCity.longitude);
      // 主动刷新卡片
      await this.refreshCards();
    } catch (e) {
      console.error(`Load weather failed: ${e.message}`);
    } finally {
      this.loading = false;
    }
  }

  private async refreshCards(): Promise<void> {
    try {
      const forms = await formProvider.getFormsInfo({
        bundleName: 'com.example.weather_service'
      });
      const data = this.buildCardData();
      for (const form of forms) {
        await formProvider.updateForm(
          form.id,
          formBindingData.createFormBindingData(data)
        );
      }
    } catch (e) {
      console.error(`Refresh cards failed: ${e.message}`);
    }
  }

  private buildCardData(): Record<string, string> {
    if (this.weather === null || this.currentCity === null) {
      return {};
    }
    return {
      city: this.currentCity.name,
      temperature: `${this.weather.temperature}°C`,
      weather: this.weather.weather,
      humidity: `湿度 ${this.weather.humidity}%`,
      wind: `${this.weather.windDirection} ${this.weather.windSpeed}km/h`,
      updatedAt: new Date().toLocaleTimeString()
    };
  }

  build() {
    Column() {
      // 顶部:城市选择
      Row() {
        Text(this.currentCity?.name ?? '')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
        Blank()
        Button('切换城市')
          .fontSize(12)
          .onClick(() => {
            // 跳转到城市选择页
          })
      }
      .width('100%')
      .padding(16)

      // 天气详情
      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48)
          Text('加载中...').fontSize(14).margin({ top: 12 })
        }
        .width('100%')
        .height('60%')
        .justifyContent(FlexAlign.Center)
      } else if (this.weather !== null) {
        Column() {
          Text(`${this.weather.temperature}°C`)
            .fontSize(72)
            .fontWeight(FontWeight.Bold)
          Text(this.weather.weather)
            .fontSize(18)
            .margin({ top: 8 })
          Row() {
            Text(`湿度: ${this.weather.humidity}%`)
            Text(`风速: ${this.weather.windSpeed}km/h`)
              .margin({ left: 24 })
          }
          .margin({ top: 16 })
        }
        .width('100%')
        .padding(16)
      }

      // 卡片管理入口
      Button('添加桌面卡片')
        .margin(16)
        .onClick(() => {
          this.openCardManager();
        })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }

  private openCardManager(): void {
    // 调用系统卡片管理器
  }
}
```

## 7. 进阶技巧

### 7.1 卡片尺寸响应式设计

当一张卡片需要支持多个尺寸时,可以根据 `formId` 对应的尺寸动态切换布局。但 ArkTS 卡片目前不直接支持运行时获取尺寸,推荐做法是为每个尺寸单独写 UI 文件,通过 `form_config.json` 配置多个 `forms` 项,各自指向不同的 UI 文件。

如果希望复用业务逻辑,可以抽取公共的 `@Builder` 方法:

```typescript
// widget/common/WeatherBuilders.ets
@Builder
function WeatherHeader(city: string, updatedAt: string) {
  Row() {
    Text(city)
      .fontSize(14)
      .fontWeight(FontWeight.Bold)
    Blank()
    Text(updatedAt)
      .fontSize(10)
      .fontColor('#999999')
  }
  .width('100%')
}

@Builder
function WeatherMain(temperature: string, weather: string, fontSize: number) {
  Column() {
    Text(temperature)
      .fontSize(fontSize)
      .fontWeight(FontWeight.Bold)
    Text(weather)
      .fontSize(fontSize / 3)
      .margin({ top: 4 })
  }
}
```

不同尺寸卡片引入并使用:

```typescript
// 2x2 卡片
WeatherHeader(this.city, this.updatedAt)
WeatherMain(this.temperature, this.weather, 36)

// 4x4 卡片
WeatherHeader(this.city, this.updatedAt)
WeatherMain(this.temperature, this.weather, 60)
```

### 7.2 卡片定时刷新策略

`updateDuration` 字段的最小单位是 30 分钟,即 `updateDuration: 1` 表示 30 分钟,`updateDuration: 2` 表示 60 分钟。最小刷新间隔不能小于 30 分钟,这是系统级限制,避免频繁刷新耗电。

若业务确实需要更高频率刷新,有以下两种变通方案:

1. **基于事件触发**——不依赖系统定时,通过主体在数据变化时主动调用 `formProvider.updateForm`
2. **基于消息回调**——卡片上提供"刷新"按钮,用户主动点击时通过 `onFormEvent` 触发刷新

两种方案结合使用,既能保证数据时效性,又能控制耗电。推荐策略:

```
默认 updateDuration = 2(60 分钟)
+ 主体数据变化时主动刷新
+ 卡片提供手动刷新按钮
```

### 7.3 跨设备卡片同步

HarmonyOS 支持卡片在多设备间同步。例如用户在手机上添加的天气卡片,可以同步到平板或手表。这通过分布式数据管理实现:

```typescript
import distributedKVStore from '@ohos.data.distributedKVStore';

class CardSyncService {
  private kvStore: distributedKVStore.SingleKVStore | null = null;

  async init(): Promise<void> {
    const kvManager = distributedKVStore.createKVManager({
      context: this.context,
      bundleName: 'com.example.weather_service'
    });
    this.kvStore = await kvManager.getKVStore({
      appId: 'weather_card_sync',
      storeId: 'card_data'
    });
  }

  async syncCardData(formId: string, data: Record<string, Object>): Promise<void> {
    if (this.kvStore === null) return;
    await this.kvStore.put(formId, JSON.stringify(data));
  }

  async loadCardData(formId: string): Promise<Record<string, Object> | null> {
    if (this.kvStore === null) return null;
    const json = await this.kvStore.get(formId) as string;
    return json ? JSON.parse(json) : null;
  }
}
```

通过分布式 KV Store,数据自动在登录同一华为账号的设备间同步。当用户在新设备上添加卡片时,FormAbility 的 `onAddForm` 可以先从 KV Store 读取已有数据,实现"卡片即添加即有数据"的体验。

### 7.4 深度链接与卡片分享

元服务支持通过 URL scheme 触发跳转,即"深度链接"。例如:

```
weatheratomic://detail?city=shanghai
```

配置方式是在 `module.json5` 中添加 `uris` 字段:

```json5
{
  "module": {
    "abilities": [
      {
        "name": "EntryAbility",
        "uris": [
          {
            "scheme": "weatheratomic",
            "host": "detail",
            "pathStartWith": "/"
          }
        ]
      }
    ]
  }
}
```

主体 Ability 在 `onCreate` 中解析 URL:

```typescript
import uri from '@ohos.uri';

export default class EntryAbility extends UIAbility {
  onCreate(want, launchParam): void {
    if (want.uri) {
      const url = uri.parse(want.uri);
      const city = url.getQueryParameter('city');
      console.info(`Deep link city: ${city}`);
      // 跳转到详情页
    }
  }
}
```

卡片分享则是另一种传播方式。用户长按卡片可触发"分享"菜单,将卡片分享给其他用户。分享机制由系统处理,开发者只需确保卡片在不同设备上能正确加载即可。

### 7.5 卡片与元服务主体的状态同步

当元服务主体修改了用户偏好(如默认城市、单位),需要同步到卡片。最佳实践是使用 `preferences` 本地存储,FormAbility 与主体共用同一份数据:

```typescript
// service/PreferencesService.ets
import preferences from '@ohos.data.preferences';

export class PreferencesService {
  private storeName = 'weather_prefs';

  async setDefaultCity(context: Context, city: City): Promise<void> {
    const pref = await preferences.getPreferences(context, this.storeName);
    await pref.put('default_city', JSON.stringify(city));
    await pref.flush();
  }

  async getDefaultCity(context: Context): Promise<City | null> {
    const pref = await preferences.getPreferences(context, this.storeName);
    const json = await pref.get('default_city', '') as string;
    return json ? JSON.parse(json) as City : null;
  }

  async setUnit(context: Context, unit: 'metric' | 'imperial'): Promise<void> {
    const pref = await preferences.getPreferences(context, this.storeName);
    await pref.put('unit', unit);
    await pref.flush();
  }

  async getUnit(context: Context): Promise<'metric' | 'imperial'> {
    const pref = await preferences.getPreferences(context, this.storeName);
    return (await pref.get('unit', 'metric')) as 'metric' | 'imperial';
  }
}
```

注意 FormAbility 的 `this.context` 与主体的 `context` 是不同的 Context 对象,但只要使用相同的 `storeName`,即可访问同一份数据。

### 7.6 静默刷新与可见性优化

当卡片不可见时(如用户切换到其他桌面页),继续刷新会浪费电。`onVisibilityChange` 回调可用于感知可见性变化:

```typescript
export default class WeatherFormAbility extends FormExtensionAbility {
  private visibleForms: Set<string> = new Set();

  onVisibilityChange(formStatus): void {
    for (const [formId, status] of Object.entries(formStatus)) {
      if (status === 'visible') {
        this.visibleForms.add(formId);
      } else {
        this.visibleForms.delete(formId);
      }
    }
  }

  async onUpdateForm(formId): Promise<void> {
    // 不可见的卡片不刷新
    if (!this.visibleForms.has(formId)) {
      return;
    }
    // 执行刷新逻辑
  }
}
```

但需注意,系统定时刷新(`updateDuration`)仍会触发 `onUpdateForm`,即使卡片不可见。开发者可在 `onUpdateForm` 内部根据可见性判断是否跳过。

### 7.7 卡片与 1+8+N 多设备适配

元服务可运行在手机、平板、手表、车机、智慧屏等多种设备上。卡片 UI 需要根据设备类型适配:

```typescript
import deviceInfo from '@ohos.deviceInfo';

let storage = new LocalStorage();

@Entry(storage)
@Component
struct WeatherCard {
  @LocalStorageProp('city') city: string = '';
  @LocalStorageProp('temperature') temperature: string = '';
  @LocalStorageProp('weather') weather: string = '';

  private get deviceType(): string {
    return deviceInfo.deviceType;
  }

  build() {
    if (this.deviceType === 'wearable') {
      // 手表:简化布局,只显示核心信息
      Column() {
        Text(this.temperature)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
        Text(this.city)
          .fontSize(10)
          .fontColor('#999999')
      }
      .width('100%')
      .height('100%')
      .alignItems(HorizontalAlign.Center)
      .justifyContent(FlexAlign.Center)
    } else {
      // 手机/平板:标准布局
      Column() {
        Text(this.city).fontSize(14)
        Text(this.temperature).fontSize(36)
        Text(this.weather).fontSize(14)
      }
      .width('100%')
      .height('100%')
      .padding(16)
    }
  }
}
```

### 7.8 卡片国际化

卡片 UI 应支持多语言。通过资源文件 `resources/base/element/string.json` 与 `resources/en_US/element/string.json`、`resources/zh_CN/element/string.json` 等分别提供不同语言字符串:

```json5
// resources/base/element/string.json
[
  { "name": "card_refresh", "value": "Refresh" }
]

// resources/zh_CN/element/string.json
[
  { "name": "card_refresh", "value": "刷新" }
]
```

在卡片 UI 中通过 `$r('app.string.card_refresh')` 引用:

```typescript
Button($r('app.string.card_refresh'))
  .onClick(() => {
    postCardAction(this, { 'action': 'message', 'params': { 'action': 'refresh' } });
  })
```

## 8. 性能优化

### 8.1 体积控制(10MB 约束)

元服务的硬性体积上限是 10MB,包括代码、资源、动态加载库。超出此限制将无法上架。体积控制策略:

1. **资源压缩**——所有图片使用 WebP 格式(相比 PNG 节省 30-50%),对 SVG 进行 minify
2. **删除冗余资源**——`resources/` 下未引用的图片、字符串必须清理
3. **代码混淆**——开启 R8/ProGuard 混淆,移除未使用代码
4. **动态加载拆分**——将非首屏功能拆分为独立 HAR,运行时按需加载
5. **避免引入大型三方库**——优先使用系统 API,谨慎引入 axios、lodash 等库

体积监控可在 `build-profile.json5` 中配置:

```json5
{
  "app": {
    "signingConfigs": [],
    "products": [
      {
        "name": "default",
        "signingConfig": "default",
        "compileSdkVersion": 11,
        "compatibleSdkVersion": 10,
        "targetSdkVersion": 11,
        "runtimeOS": "HarmonyOS"
      }
    ],
    "buildMode": "release"
  }
}
```

构建后通过 `hdc shell du -sh /data/app/...` 查看实际安装包大小。

### 8.2 首屏加载优化

元服务的首屏加载速度直接影响用户体验。目标:首次打开 < 1 秒。优化策略:

1. **避免在 `aboutToAppear` 执行同步高耗时操作**——所有耗时操作改为异步
2. **预加载关键资源**——在 AbilityStage 中提前加载图片、字体
3. **使用骨架屏**——加载完成前显示骨架屏,避免白屏
4. **LazyForEach**——长列表使用 LazyForEach,只渲染可见项
5. **避免在 `build()` 中创建对象**——`build()` 会被频繁调用,对象创建应在 `aboutToAppear`

骨架屏示例:

```typescript
@Entry
@Component
struct IndexPage {
  @State loading: boolean = true;

  build() {
    Column() {
      if (this.loading) {
        // 骨架屏
        Column() {
          Column().width('80%').height(20).backgroundColor('#F0F0F0').borderRadius(4)
          Column().width('60%').height(20).backgroundColor('#F0F0F0').borderRadius(4).margin({ top: 8 })
        }
        .padding(16)
      } else {
        // 真实内容
        Text('Loaded content')
      }
    }
  }
}
```

### 8.3 内存优化

元服务内存占用应控制在 50MB 以下(系统建议)。优化策略:

1. **及时释放资源**——`aboutToDisappear` 中清理订阅、定时器、文件句柄
2. **图片内存缓存**——使用 `Image` 组件的内存缓存,避免重复解码
3. **避免内存泄漏**——使用 `CallbackGuard` 模式,防止异步回调到已销毁组件
4. **大数据不存内存**——大数据应存入文件或数据库,而非内存变量

CallbackGuard 示例:

```typescript
@Component
struct MyPage {
  @State data: string = '';
  private isAlive: boolean = true;

  aboutToAppear(): void {
    this.isAlive = true;
    this.fetchData();
  }

  aboutToDisappear(): void {
    this.isAlive = false;
  }

  private async fetchData(): Promise<void> {
    const result = await fetchSomething();
    // 检查组件是否仍然存活
    if (!this.isAlive) return;
    this.data = result;
  }
}
```

### 8.4 卡片刷新性能

卡片刷新涉及 IPC 通信与 UI 重建,频繁刷新会增加 CPU 与内存负担。优化策略:

1. **合并刷新**——多个数据源变化时,合并为一次 `updateForm` 调用
2. **差分更新**——只更新变化的数据字段,减少 IPC 传输量
3. **避免大数据**——单次 `updateForm` 数据不超过 1KB,大数据通过 SharedStorage
4. **可见性过滤**——不可见的卡片跳过刷新

### 8.5 启动速度优化

元服务冷启动速度受以下因素影响:

1. **代码体积**——体积越大,加载越慢。优化手段见 8.1
2. **AbilityStage 初始化**——避免在 AbilityStage 中执行耗时操作
3. **首屏组件数量**——首屏组件过多导致 `build()` 耗时长
4. **资源加载**——图片资源在首屏渲染前加载完毕

可以通过 `console.time` 与 `console.timeEnd` 测量关键路径耗时:

```typescript
export default class EntryAbility extends UIAbility {
  async onCreate(want, launchParam): Promise<void> {
    console.time('EntryAbility.onCreate');
    await this.initServices();
    console.timeEnd('EntryAbility.onCreate');
  }

  private async initServices(): Promise<void> {
    console.time('initServices');
    // 初始化各服务
    console.timeEnd('initServices');
  }
}
```

## 9. 调试排错

### 9.1 卡片预览

DevEco Studio 提供卡片预览器,可在不部署到设备的情况下查看卡片渲染效果。打开方式:

1. 打开卡片 `.ets` 文件
2. 点击右上角"Previewer"按钮
3. 在预览器中选择卡片尺寸(2x2 / 2x4 / 4x4 等)
4. 可切换浅色/深色模式

预览器支持的数据注入:

- 在 `.ets` 文件顶部添加 `@LocalStorageProp` 默认值
- 预览器会使用默认值渲染
- 修改默认值即可看到不同数据下的渲染效果

### 9.2 真机调试卡片

真机调试时,卡片运行在独立进程中,日志与主体日志分开。查看卡片日志:

```bash
hdc shell hilog | grep "FormExtensionAbility"
hdc shell hilog | grep "WeatherFormAbility"
```

也可通过 DevEco Studio 的 Log 窗口过滤:

- 进程:选择元服务进程(通常包含 `form` 标识)
- 标签:`FormExtensionAbility`、`formProvider`、`formBindingData`

### 9.3 常见错误与排查

#### 9.3.1 卡片添加后无数据显示

**可能原因**:

1. `onAddForm` 返回的数据字段名与卡片 `@LocalStorageProp` 不匹配
2. `onAddForm` 未正确返回 `FormBindingData`
3. `form_config.json` 中 `src` 路径错误

**排查步骤**:

1. 检查 FormAbility 日志,确认 `onAddForm` 被调用
2. 检查返回的数据字段名是否与 `@LocalStorageProp('xxx')` 中的 `xxx` 完全一致
3. 检查 `form_config.json` 中 `src` 指向的文件路径是否正确

#### 9.3.2 卡片定时刷新不生效

**可能原因**:

1. `updateEnabled` 未设为 `true`
2. `updateDuration` 设为 `0`
3. 设备进入省电模式,系统暂停刷新
4. FormAbility 的 `onUpdateForm` 抛出异常

**排查步骤**:

1. 检查 `form_config.json` 中 `updateEnabled` 与 `updateDuration`
2. 检查设备是否进入省电模式(设置 -> 电池)
3. 查看日志,确认 `onUpdateForm` 是否被调用,是否有异常

#### 9.3.3 卡片点击无反应

**可能原因**:

1. 卡片未注册 `onClick` 或 `postCardAction` 参数错误
2. `module.json5` 中未配置 `formConfigAbility`
3. `postCardAction` 中 `bundleName` 或 `abilityName` 错误

**排查步骤**:

1. 检查卡片 UI 是否绑定了 `onClick` 回调
2. 检查 `postCardAction` 参数格式:`action`、`bundleName`、`abilityName` 是否正确
3. 检查 `module.json5` 中 `formConfigAbility` 是否指向正确的 Ability

#### 9.3.4 体积超限无法上架

**可能原因**:

1. 引入了大型三方库(如完整的图表库、网络库)
2. 资源文件未压缩(大尺寸 PNG)
3. 多语言资源过多

**排查步骤**:

1. 使用 DevEco Studio 的"Analyze APK"功能分析体积构成
2. 移除未使用的资源
3. 压缩图片资源
4. 移除非必要的多语言资源(只保留 base + zh_CN + en_US)

#### 9.3.5 卡片白屏或闪烁

**可能原因**:

1. `@LocalStorageProp` 默认值为空字符串,首次渲染显示空白
2. 数据更新频繁导致 UI 重建闪烁
3. 卡片 UI 中使用了不支持的 API(如 `vp` 单位)

**排查步骤**:

1. 为 `@LocalStorageProp` 设置合理的默认值
2. 合并数据更新,避免短时间内多次 `updateForm`
3. 检查卡片 UI 是否仅使用支持的 API

### 9.4 DevEco Studio 调试技巧

- **断点调试**——可在 FormAbility 中设置断点,调试卡片添加、刷新、事件回调
- **日志过滤**——使用 `[FormAbility]` 前缀统一格式化日志,便于过滤
- **性能分析**——使用 DevEco Studio Profiler 分析卡片刷新耗时、内存占用
- **多设备预览**——在 Previewer 中切换设备类型,验证多设备适配

## 10. 最佳实践

### 10.1 元服务设计原则

1. **单一职责**——一个元服务应聚焦一个核心场景(如天气、待办、扫码),避免功能堆砌
2. **卡片优先**——首屏体验应优先通过卡片交付,主体作为补充
3. **轻量交互**——卡片内交互应简单(点击、按钮),复杂交互跳转到主体
4. **数据驱动**——所有 UI 状态由数据驱动,避免卡片内维护复杂状态
5. **跨设备一致**——同一份数据,不同设备展示不同布局,但语义一致

### 10.2 卡片 UX 规范

1. **视觉层次**——主要信息突出(大字号),次要信息弱化(小字号)
2. **留白与对齐**——充足的内边距(建议 12-16px),信息按网格对齐
3. **色彩克制**——卡片背景使用浅色(白/浅灰),强调色仅用于关键信息
4. **图标辅助**——复杂信息用图标辅助理解(如天气用太阳/云图标)
5. **交互反馈**——按钮点击应有视觉反馈(按下变色、波纹动画)
6. **避免信息过载**——2x2 卡片信息字段不超过 4 个,4x4 不超过 8 个

### 10.3 数据安全

1. **不硬编码密钥**——API Key、Secret 必须通过后端中转,不能硬编码在元服务中
2. **HTTPS 强制**——所有网络请求必须使用 HTTPS,禁止明文 HTTP
3. **本地存储加密**——敏感数据存储到 `preferences` 时应先加密
4. **权限最小化**——只申请必要的权限,不申请"全部权限"

### 10.4 签名与发布

元服务发布需要正式签名证书。流程:

1. 在 AppGallery Connect 创建元服务应用
2. 在 DevEco Studio 中配置签名(使用 AGC 提供的证书)
3. 构建发布包(`Build -> Build Hap(s)/APP(s) -> Build APP(s)`)
4. 在 AGC 上传发布包,提交审核
5. 审核通过后上架

签名配置示例:

```json5
// build-profile.json5
{
  "app": {
    "signingConfigs": [
      {
        "name": "default",
        "type": "HarmonyOS",
        "material": {
          "certpath": "D:/sign/myatomic.cer",
          "storePassword": "your_store_password",
          "keyAlias": "myatomic_alias",
          "keyPassword": "your_key_password",
          "profile": "D:/sign/myatomic.p7b",
          "signAlg": "SHA256withECDSA",
          "storeFile": "D:/sign/myatomic.p12"
        }
      }
    ]
  }
}
```

### 10.5 审核要点

AppGallery Connect 对元服务的审核要点:

1. **功能完整性**——卡片必须可用,不能是空白或占位
2. **体积合规**——总包大小不超过 10MB
3. **权限合理**——申请的权限必须与功能匹配,不能申请"无关权限"
4. **内容合规**——内容必须符合华为内容政策,无违规信息
5. **隐私政策**——必须提供隐私政策链接,明确数据收集与使用
6. **稳定性**——不能频繁崩溃,需通过稳定性测试

常见拒审原因:

- 卡片显示空白或加载失败
- 主体功能不完整,核心流程断裂
- 申请了与功能无关的敏感权限
- 体积超出 10MB 限制
- 缺少隐私政策

### 10.6 版本迭代策略

元服务的版本迭代应遵循"小步快跑"原则:

1. **小版本高频迭代**——每次版本只增加少量功能,快速验证用户反馈
2. **A/B 测试**——通过服务端开关控制功能可见性,小范围验证
3. **数据驱动**——监控卡片使用数据(添加数、点击率、刷新率),指导优化方向
4. **灰度发布**——AGC 支持灰度发布,先对 10% 用户开放新版本

### 10.7 监控与运维

元服务上线后,可通过 AGC 提供的运维能力监控:

- **崩溃统计**——查看崩溃率、Top 崩溃堆栈
- **性能监控**——卡片刷新耗时、首屏加载耗时
- **用户行为**——卡片添加量、点击率、活跃用户数
- **版本分布**——各版本用户占比,指导推送策略

建议建立"日报"机制,每天查看关键指标,发现异常及时处理。

## 11. 总结回顾

### 11.1 核心知识图谱

```
元服务 (Atomic Service)
├── 工程结构
│   ├── module.json5 (installationFree: true)
│   ├── form_config.json (卡片元数据)
│   └── FormAbility (ExtensionAbility)
├── 卡片系统
│   ├── 卡片尺寸 (1x1, 2x2, 2x4, 4x4, 4x8)
│   ├── ArkTS 卡片 UI (@LocalStorageProp)
│   ├── postCardAction (message/router)
│   └── 多尺寸适配
├── 数据通信
│   ├── FormBindingData (onAddForm/onUpdateForm)
│   ├── formProvider.updateForm (主动刷新)
│   ├── formProvider.getFormsInfo (查询卡片)
│   └── preferences (跨进程共享)
├── 生命周期
│   ├── onAddForm (添加卡片)
│   ├── onUpdateForm (定时刷新)
│   ├── onFormEvent (事件回调)
│   ├── onRouteTo (跳转)
│   └── onVisibilityChange (可见性)
├── 进阶能力
│   ├── 定时刷新 (updateDuration)
│   ├── 跨设备同步 (distributedKVStore)
│   ├── 深度链接 (URL scheme)
│   └── 卡片分享
├── 性能优化
│   ├── 体积控制 (<10MB)
│   ├── 首屏加载 (<1s)
│   ├── 内存优化 (<50MB)
│   └── 卡片刷新优化
└── 发布流程
    ├── 签名配置
    ├── AGC 上架
    ├── 审核要点
    └── 版本迭代
```

### 11.2 关键 API 速查表

| API | 用途 | 示例 |
| --- | --- | --- |
| `FormExtensionAbility` | FormAbility 基类 | `extends FormExtensionAbility` |
| `onAddForm(want)` | 添加卡片回调 | 返回初始数据 |
| `onUpdateForm(formId)` | 定时刷新回调 | 调用 `formProvider.updateForm` |
| `onFormEvent(formId, msg)` | 事件回调 | 处理卡片按钮点击 |
| `onRouteTo(formId, info)` | 跳转回调 | 跳转到主体 |
| `formProvider.updateForm` | 主动刷新卡片 | `formProvider.updateForm(formId, data)` |
| `formProvider.getFormsInfo` | 查询所有卡片 | `formProvider.getFormsInfo({bundleName})` |
| `formBindingData.createFormBindingData` | 创建数据 | `createFormBindingData({...})` |
| `postCardAction` | 卡片发送动作 | `postCardAction(this, {action:'router'})` |
| `@LocalStorageProp` | 卡片接收数据 | `@LocalStorageProp('city') city: string` |
| `preferences` | 跨进程存储 | `preferences.getPreferences(ctx, name)` |

### 11.3 常见错误清单

1. `installationFree` 未设为 `true`,导致无法识别为元服务
2. `form_config.json` 中 `src` 路径错误,卡片无法加载
3. `onAddForm` 返回 `undefined` 而非 `FormBindingData`,卡片无数据
4. `@LocalStorageProp` 字段名与 `onAddForm` 返回数据字段名不一致
5. `postCardAction` 中 `action` 拼写错误(如 `'router'` 写成 `'Router'`)
6. `updateDuration` 设为 `0` 但 `updateEnabled` 为 `true`,导致刷新不触发
7. 卡片 UI 使用了 `vp`、`fp` 等不支持的单位
8. 卡片 UI 中直接调用网络请求,违反"卡片不直接请求"约束
9. 单次 `updateForm` 数据超过 1KB,导致更新失败
10. 主体与 FormAbility 使用不同的 `storeName`,导致数据无法共享

### 11.4 学习路径建议

- **入门阶段**——按本章示例 1 完成"最简天气卡片",理解基础流程
- **进阶阶段**——按示例 2-4 实现动态刷新、多尺寸适配、主体联动
- **实战阶段**——按实战案例完成"完整天气元服务",覆盖工程全流程
- **优化阶段**——按第 8 章优化体积、性能、内存
- **发布阶段**——按第 10 章完成签名、上架、审核

### 11.5 练习题

1. **基础题**——简述元服务与传统应用在 5 个维度上的核心差异
2. **配置题**——编写 `module.json5` 与 `form_config.json`,实现一个 2x2 待办卡片
3. **代码题**——实现一个 FormAbility,在 `onAddForm` 时从 `preferences` 读取用户偏好,返回卡片初始数据
4. **场景题**——用户在主体修改了默认城市,如何同步到已添加的卡片?请编写代码
5. **优化题**——某元服务体积 9.8MB,接近上限,如何进一步压缩到 8MB 以下?给出 5 种具体策略
6. **排错题**——卡片添加后显示空白,FormAbility 日志显示 `onAddForm` 已被调用并返回了数据,问题最可能出在哪里?
7. **设计题**——为"扫码支付"场景设计一个元服务,包括卡片尺寸、卡片内容、主体功能、交互流程

### 11.6 术语表

| 术语 | 英文 | 说明 |
| --- | --- | --- |
| 元服务 | Atomic Service | HarmonyOS 免安装轻量应用形态 |
| 服务卡片 | Service Widget/Form | 元服务的桌面卡片展示 |
| FormAbility | Form Extension Ability | 管理卡片生命周期的 ExtensionAbility |
| 卡片尺寸 | Form Dimension | 卡片在桌面网格中的占位(如 2x2) |
| 卡片刷新 | Form Update | 卡片数据更新机制(定时/主动) |
| FormBindingData | Form Binding Data | 卡片数据载体,通过 IPC 传递 |
| SharedStorage | Shared Preferences | 跨进程共享的本地存储 |
| 深度链接 | Deep Link | 通过 URL 触发元服务跳转 |
| 卡片分享 | Card Share | 用户将卡片分享给其他用户 |
| 1+8+N | One Plus Eight Plus N | 华为全场景智慧生活战略 |
| AGC | AppGallery Connect | 华为应用市场开发者平台 |
| HAR | HarmonyOS Archive | HarmonyOS 静态共享包 |
| HAP | HarmonyOS Ability Package | HarmonyOS 应用安装包 |

### 11.7 扩展阅读

完成本章学习后,建议进一步探索:

- **分布式数据管理**——`distributedKVStore` 的完整能力,实现多设备数据同步
- **跨设备调用**——`startAbility` 跨设备启动 Ability,实现服务流转
- **DevEco Studio 调试器**——卡片预览、性能分析、日志查看等高级调试能力
- **服务流转**——`continueAbility` 跨设备流转,实现"在哪用,在哪继续"
- **HarmonyOS 设计规范**——卡片的视觉设计规范、交互模式、动效指南

## 12. 参考资料

### 12.1 官方文档

- HarmonyOS Developer 官方文档:元服务开发指南
  - https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/atomic-service
- HarmonyOS Application Forms Development Guide
  - https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-ui-widget
- HarmonyOS API Reference:FormExtensionAbility
  - https://developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-app-form-formextensionability
- HarmonyOS API Reference:formProvider
  - https://developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-app-form-formprovider
- HarmonyOS API Reference:formBindingData
  - https://developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-app-form-formbindingdata
- AppGallery Connect 元服务发布指南
  - https://developer.huawei.com/consumer/cn/doc/agc/atomic-service-publish

### 12.2 设计规范

- HarmonyOS Design Guidelines:Service Widgets
  - https://developer.huawei.com/consumer/cn/doc/harmonyos-design/design-widgets
- HarmonyOS UX 规范:卡片视觉与交互
- Material Design:Widgets Best Practices(参考借鉴)
- Apple Human Interface Guidelines:Widgets(参考借鉴)

### 12.3 开源示例

- HarmonyOS 官方 Samples:FormSample
  - https://gitee.com/harmonyos_samples/formsample
- HarmonyOS 官方 Samples:WeatherSample
- 华为开发者社区:元服务实战案例集

### 12.4 相关章节

- ArkTS 与 TypeScript 差异——理解 ArkTS 语言基础
- ArkUI 声明式语法——掌握 ArkUI 组件与状态管理
- 组件生命周期详解——理解组件与 UIAbility 生命周期
- 路由跳转与路由栈——理解路由机制用于卡片跳转
- 分布式数据管理——深入 `distributedKVStore` 实现跨设备同步
- 跨设备调用——深入 `startAbility` 跨设备启动 Ability
- DevEco Studio 调试器——掌握卡片预览、性能分析、日志查看

### 12.5 学习建议

元服务开发是 HarmonyOS 应用开发的进阶能力,建议按以下顺序逐步深入:

1. **先掌握 ArkTS 与 ArkUI 基础**——本章前置知识,务必扎实
2. **完成最简卡片**——按示例 1 跑通基础流程,建立感性认识
3. **理解数据通信**——按 4.7 节理解卡片与主体的数据流
4. **实战完整案例**——按第 6 章完成天气元服务,串联所有知识点
5. **优化与发布**——按第 8、10 章完成体积优化与上架
6. **探索进阶能力**——按第 7 章尝试跨设备、深度链接、卡片分享

完成本章学习后,读者应具备独立开发并发布一个完整元服务的能力。建议结合实际项目反复练习,在实践中深化理解。

---

**附:HarmonyOS 元服务开发速查卡**

```
+------------------------------------------------------------------+
|  元服务核心配置                                                    |
|  module.json5: installationFree: true                             |
|  extensionAbilities: type: "form", metadata: $profile:form_config|
|  form_config.json: forms[].src, supportDimensions, updateDuration |
+------------------------------------------------------------------+
|  FormAbility 关键回调                                              |
|  onAddForm(want) -> FormBindingData (返回初始数据)                  |
|  onUpdateForm(formId) -> formProvider.updateForm (定时刷新)        |
|  onFormEvent(formId, msg) (卡片按钮触发)                          |
|  onRouteTo(formId, info) (卡片点击跳转)                            |
|  onVisibilityChange(formStatus) (可见性变化)                     |
+------------------------------------------------------------------+
|  卡片 UI 关键模式                                                  |
|  let storage = new LocalStorage();                               |
|  @Entry(storage) @Component struct XxxCard {                       |
|    @LocalStorageProp('field') field: string = '';                 |
|    build() { ... postCardAction(this, {action:'router'}) }       |
|  }                                                                |
+------------------------------------------------------------------+
|  主体主动刷新卡片                                                  |
|  formProvider.getFormsInfo({bundleName}) -> forms[]               |
|  formProvider.updateForm(formId, formBindingData.createFormBindingData(data))
+------------------------------------------------------------------+
|  跨进程共享数据                                                    |
|  preferences.getPreferences(ctx, 'storeName')                     |
|  pref.put(key, value); pref.flush();                             |
+------------------------------------------------------------------+
|  体积与性能红线                                                    |
|  体积 < 10MB | 首屏 < 1s | 内存 < 50MB | 刷新间隔 >= 30min       |
+------------------------------------------------------------------+
```

掌握以上核心模式,即可覆盖 90% 的元服务开发场景。在实际项目中遇到具体问题时,再回到对应章节查阅详细说明。

---

本章到此结束。希望读者通过本章学习,能够独立完成元服务的开发与发布,将这一鸿蒙生态的特色能力应用到实际产品中,为用户带来"即点即用、跨设备流转"的现代服务体验。
