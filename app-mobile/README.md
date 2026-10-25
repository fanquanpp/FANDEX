# app-mobile — FANDEX Flutter 移动端

以 Flutter 为主体技术栈的 FANDEX 移动端，同时产出 Android 与 iOS 双端。
设计语言 GEOCON（几何构成主义 + 现代二次元动能），设计真源见 [DESIGN.md](DESIGN.md)。

完全替代已下线的 Kotlin 版 app-Android-new：applicationId 沿用 `com.fandexpp.fandex`，在旧设备上覆盖安装即完成迁移（应用数据不共享，属预期）。
功能集合对齐 Kotlin 版并新增学习进度持久化；明确不含前端实验室功能。

## 混合技术栈

| 层 | 技术 |
| --- | --- |
| UI / 状态 / 导航 | Dart + Riverpod 3 + go_router（自定义对角扫掠转场） |
| 动效背景 | GLSL 片元着色器（assets/shaders/grid.frag，加载失败自动回退 CustomPainter） |
| 微动效 | 内置 Animated 体系 + GeoPress 按压反馈 + GeoHaptics 触感 |
| Markdown | markdown 包解析为块模型后原生组件渲染（正文零 WebView） |
| 数学公式 | flutter_math_fork（渲染失败回退原始文本） |
| Mermaid | WebView + 离线 mermaid.min.js（assets/mermaid/host.html，JS 桥回报高度） |
| 代码高亮 | highlight 包 + GEOCON 令牌配色 |
| 颜色真源 | DTCG JSON（shd-shared/tokens）生成 lib/core/token_colors.dart，check-tokens-drift 门禁校验 |
| 平台通道 | Kotlin：触感 / APK 安装 / 外链；Swift：触感 |
| 内容管线 | Node 脚本 generate-content.mjs |

## 环境要求

- Flutter 3.47.x stable（本机安装于 C:\Atian\flutter，未加入 PATH 时按下方命令临时注入）
- Android：JDK 17+（本机 JDK 25 可用）、Android SDK（本机位于 C:/Users/fanqu/AppData/Local/Android/Sdk，android/local.properties 已指向）
- iOS：macOS + Xcode（Windows 上只维护 ios/ 工程与 Swift 代码，无法本机构建）
- 中国镜像：PUB_HOSTED_URL=https://pub.flutter-io.cn，FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn；Gradle wrapper 已指向腾讯镜像

## 内容再生成

内容唯一源为仓库根 `cnt-content/full/` 与 `shd-shared/metadata/`。改动内容后执行：

```bash
node app-mobile/scripts/generate-content.mjs
```

产出 `app-mobile/assets/`（docs 全量 / metadata / syntax-data / version.json），数据契约与 Kotlin 版一致。
注意：Flutter 目录资产只展开一层，脚本会把每个模块目录以 `# BEGIN/END content-assets`
标记块形式登记进 pubspec.yaml，勿手改该块；mermaid.min.js 为随仓库提交的 vendored 文件。

## 构建（Android / Windows 本机）

```bash
export PATH=/c/Atian/flutter/bin:$PATH
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn

cd app-mobile
flutter pub get
flutter analyze        # 门禁：0 issue
flutter test           # 门禁：全过
flutter build apk --debug        # 产物 build/app/outputs/flutter-apk/app-debug.apk
flutter build apk --release      # 发布需另行配置签名
```

## 构建（iOS / 需 macOS）

```bash
cd app-mobile
flutter pub get
flutter build ios --no-codesign   # 真机分发再走 Xcode 签名
```

iOS 侧依赖管理为 Swift Package Manager（Flutter 3.44+ 默认）。平台通道只有 `fandex/haptics`（ios/Runner/AppDelegate.swift）。

## 目录结构

```
lib/
  main.dart               入口（SharedPreferences 注入）
  app/                    MaterialApp 装配 / go_router 路由与转场
  core/                   令牌镜像 tokens.dart / 模型 / frontmatter 解析
  data/                   仓库与 Riverpod Provider / 偏好与进度持久化
  design/                 GEOCON 组件：Dock、抽屉、括弧、多边形、刻度、着色器背景、转场
  features/               home / module / reader(+markdown) / syntax / paths / search
  platform/               haptics / updater / external 平台通道
assets/
  docs/                   全量正文（管线生成）
  metadata/               modules.json / doc-index.json / learning-path / syntax-index.json
  syntax-data/            语法速查数据
  mermaid/                离线渲染宿主（host.html + mermaid.min.js）
  shaders/grid.frag       蓝图网格片元着色器
  version.json            随包版本（更新比较用）
```

## 动效清单（GEOCON KINETIC）

所有交互均有动效，规范详见 DESIGN.md 第 6 节：页面斜切 wipe + 速度线、内容 40ms 阶梯入场、按压缩放 + 括弧闪现 + 触感、抽屉斜向滑入、Dock 指示面弹簧位移、主题 320ms 全 scheme 插值、代码复制勾选形变、完成标记弹性勾、加载线框多边形旋转、错误三角抖动、阅读进度顶部标尺条。

## 约束

- 不使用光斑与色散类装饰（fx 体系硬性约束全平台适用）
- 任何输出不使用 emoji（仓库 AGENTS.md 最高优先级约束）
- 颜色真源在 shd-shared/tokens：改色后运行 `pnpm --filter @fandex/tokens generate:dart` 重新生成 token_colors.dart，禁止手改（check-tokens-drift 门禁逐值校验）
