# FANDEX Mobile 设计文档 — GEOCON 几何构成动效设计语言

> 本文档是 Flutter 移动端（iOS + Android）重写的唯一设计真源。
> 设计基调：几何构成主义（Constructivism）为骨架，现代二次元动感能量为表层。
> 硬性约束：不使用光斑与色散类装饰；任何输出不使用 emoji。

## 1. 范围与定位

- Flutter 为主体技术栈的移动端，同时产出 Android 与 iOS 双端。
- 完全替代已下线的 Kotlin 版 app-Android-new（applicationId 沿用 `com.fandexpp.fandex`，覆盖安装即完成迁移）。
- 功能集合对齐 Kotlin 版并补充学习进度持久化；明确不含"前端实验室"功能。
- 信息架构延续硬性指令：顶部 Dock 常驻 + 抽屉收纳，无底部导航栏。

## 2. 混合技术栈矩阵

| 层 | 语言/技术 | 职责 |
| --- | --- | --- |
| UI 与业务 | Dart | 全部界面、状态（Riverpod）、导航（go_router） |
| 动效背景 | GLSL 片元着色器 | 蓝图网格漂移、扫描线扫掠（Flutter FragmentProgram，Impeller 兼容） |
| 微动效 | Dart + flutter_animate | 入场编排、按压、脉冲、数值滚动 |
| 几何绘制 | CustomPainter | 角标括弧、线框多边形、刻度尺、斜切面 |
| Markdown 解析 | Dart（markdown 包） | AST 到块模型，与 web/Kotlin 版对齐 |
| 数学公式 | Dart（flutter_math_fork） | 块级与行内 LaTeX 原生渲染 |
| Mermaid 图 | JS + WebView | 复用离线 mermaid.min.js，Dart-JS 桥回报尺寸 |
| 代码高亮 | Dart（highlight 包） | 17+ 语言，令牌化配色 |
| 平台通道 | Kotlin / Swift | GeoHaptics 触感模式（Vibrator / UIImpactFeedbackGenerator）；Kotlin 侧 APK 更新安装（FileProvider） |
| 内容管线 | Node 脚本 | 从 cnt-content 生成 assets，契约与 Kotlin 版一致 |

## 3. GEOCON 视觉词汇表（十条）

1. **斜切即结构** — 所有面片以单一 45 度切角替代圆角（GeoClip），构图沿对角轴展开；模态与卡片同构。
2. **描边优先** — 线框多边形、括弧、刻度尺全部描边呈现；禁止发光、模糊、光斑。
3. **编号即导航** — 微型等宽标签 `01 // MODULE` 式编号贯穿模块、文档、阶段。
4. **平涂硬边** — 纯色平面 + 1px 硬边框，分类色作为构成色块直接参与构图。
5. **运动即反馈** — 任何操作必有过渡：按压、选择、导航、主题切换、过滤、复制。
6. **对角线扫掠** — 页面切换为对角 clip 展开转场；内容按 40ms 步进阶梯入场。
7. **动能括弧** — 聚焦卡片四角 L 形括弧滑入并带 1 段过冲；按压时闪烁一次。
8. **刻度尺进度** — 进度一律用刻度段（tick segments）与顶部标尺条表达，禁用圆环发光。
9. **速度线** — 转场瞬间叠加稀疏平行斜线组（速度线），二次元动感能量的唯一外化。
10. **蓝图网格** — 背景为缓慢漂移的蓝图网格着色器，低对比度，仅作空间深度。

## 4. 色板（真源 shd-shared/tokens，禁止私改）

- 颜色由 `generate-tokens-dart.ts` 从 DTCG JSON 生成到 `lib/core/token_colors.dart`（TokenPrimitive/TokenLight/TokenDark），GeoPalette 只做语义到组件角色的映射；`check-tokens-drift.mjs` 门禁逐值校验。
- 暗色：背景 #0A0A0A / #141414 / #1F1F1F；边框 #2A2A2A / #404040；正文 #EBEFF3 / 次级 #A3A3A3；强调 #39C5BB（hover #4FFFF2，active #00D6C7）；代码底（bg.sunken）#000000。
- 亮色：背景 #EBEFF3 / #E2E8EC；边框 #CCD5DB / #BCC8D0；正文 #0A0A0A；强调 #14716A（hover #0E655F，active #084743）；代码底 #DAE1E6。
- 语义色：success #22C55E/#16A34A，warning #F97316/#EA580C，danger #EF4444/#DC2626（暗/亮）。
- 8 分类色（真源 shd-shared/metadata/modules.json 的 categoryColors）：tools #0000FF、frontend #EE0000、backend #FF4004、database #00FFCC、cs #9900FF、math #9999FF、cloud #FF8800、gamedev #66CCFF。分类色驱动色块、序号、括弧与进度条。
- 转场速度线与括弧使用强调色或分类色，永不使用白色闪光。

## 5. 排版

- 展示层（模块编号、Dock 标题、统计数字）：尝试捆绑 Rajdhani 展示字体（半窄几何无衬线，OFL 许可）；获取失败回退系统无衬线 + 宽字距大写。
- 中文正文：系统字（MIUI/Roboto/SF），16sp/行高 1.625 基准；字号缩放 0.8-1.4 七档（延续既有规范）。
- 代码与标签：系统等宽，13sp/20；标签全大写、字距 +8%。
- 标题阶梯：H1 28、H2 24、H3 20、H4 17；标题左侧一律带 3px 分类色竖条或斜切面。

## 6. 动效系统 KINETIC（时值与曲线真源 shd-shared/tokens/primitive/motion.json）

- 时值：instant 75ms / fast 150ms / normal 250ms / slow 400ms / slower 600ms。
- 曲线：default (0.4,0,0.2,1)；out (0,0,0.2,1) 入场推荐；spring (0.34,1.56,0.64,1) 按压与选择；bounce (0.68,-0.55,0.265,1.55) 仅徽章。
- 编排：列表入场步进 40ms，上限 240ms；页面入场 = 对角 clip 展开（slow）+ 内容阶梯（fast 步进）。
- 必备动效清单（无遗漏要求）：
  - 启动：Logo 线框六边形展开 + 网格淡入，600ms 后释放。
  - 页面导航：对角 wipe（slow）+ 速度线（150ms 内消散）+ 内容阶梯。
  - 返回：逆向对角收拢。
  - 按压：scale 0.97 + 括弧闪（fast，spring 回弹）。
  - 抽屉：本体斜向滑入 + 背景网格反向视差 + 项阶梯。
  - Dock 分段：指示斜切面弹簧位移 + 图标缩放淡切。
  - 主题切换：对角扇形扫掠覆盖层 + 全 scheme 颜色 320ms 插值。
  - 分类过滤：网格项重排 spring + 重阶梯。
  - 搜索：结果按相关度阶梯浮现；空态线框三角旋转。
  - 阅读进度：Dock 下沿标尺条实时推移；目录抽屉斜向升起。
  - 代码复制：按钮图标勾选形变 + 刻度闪光。
  - 数学块/图表块：滚动入视口时 clip 展开（fast）。
  - 加载：线框多边形旋转 + 顶点脉冲；错误：线框三角 + 抖动一次。
  - 字号调整：预览段落实时 spring 缩放。
  - 更新浮层：自顶部斜切滑入，下载进度为刻度尺。

## 7. 信息架构与路由

- 常驻顶部 GeoDock：左 leading（首页=抽屉，详情=返回）+ 斜切强调面 + 标题 + 页内动作 + 右侧分段组（语法/路线/搜索/源仓库/主题快切）。
- 抽屉：品牌区 + 统计 + 快捷导航 + 主题三段 + 字号刻度 + 更新中心 + 分类模块索引。
- 路由：home、module/:moduleId、doc/:moduleId/:slug、syntax、syntax/:lang、paths、paths/:module、search。
- Android 预测性返回与 iOS 边缘滑返均承接自定义转场。

## 8. 渲染管线

- Markdown 以块模型渲染（标题/段落/列表/引用/警告块 15 种/表格/代码/数学/图/分割线），正文不使用 WebView。
- 警告块左缘斜切色面 + 描边；表格描边 + 分类色表头刻度。
- 数学：flutter_math_fork 同步渲染，块级居中、行内占位。
- Mermaid：webview_flutter 加载本地宿主页，JS 桥回报高度，手势缩放由原生手势层接管。
- 图片：占位斜切面 + alt 文案（内容库当前不含外链图）。

## 9. 数据契约（assets，与 Kotlin 版一致）

- `assets/docs/<moduleId>/<slug>.md`：全量正文，LF 归一化。
- `assets/metadata/modules.json`：模块与分类真源（含 categoryColors/labels/order）。
- `assets/metadata/doc-index.json`：slug/title/module/category/difficulty/description/order/updated。
- `assets/metadata/learning-path/`：index.json + 各模块路径图。
- `assets/metadata/syntax-index.json` + `assets/syntax-data/*.json`：语法速查数据（忽略 web 预渲染 codeHtml，本地高亮纯 code）。
- `assets/mermaid/`：离线渲染宿主页。
- 新增 `assets/version.json`：随包版本号，供更新比较。

## 10. 状态与持久化

- Riverpod：AsyncNotifier 仓储（modules/docs/paths/syntax/search），UiState 三态 Loading/Success/Error。
- shared_preferences：主题模式、字号档、阅读历史（JSON 数组，上限 12）、学习进度（docKey 到完成刻度）、更新偏好、忽略版本。
- 学习进度（新增能力）：文档页 Dock 动作"标记完成"，刻度在模块页与学习路径页联动点亮。

## 11. 平台通道

- `fandex/haptics`：pattern 枚举 tick/doubleTick/thud/success；Kotlin 用 Vibrator VibrationEffect，Swift 用 UIImpactFeedbackGenerator/UINotificationFeedbackGenerator。
- `fandex/updater`（仅 Android）：downloadApk 进度流、installApk（FileProvider + REQUEST_INSTALL_PACKAGES）。
- 更新检查逻辑纯 Dart：GitHub Releases API，版本比较 major*10000+minor*100+patch。

## 12. 双端构建

- Android：Windows 本机构建，`flutter build apk --release`（或 gradle assembleDebug），JDK 25 + SDK 37。
- iOS：需 macOS + Xcode（Windows 上仅维护 ios/ 工程与 Swift 通道代码）；Swift Package Manager 为默认依赖管理。
- 内容再生成：`node app-mobile/scripts/generate-content.mjs`。
