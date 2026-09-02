---
order: 90
title: 动画与过渡
module: 'tailwind'
category: 前端技术
difficulty: intermediate
description: transition、animation 与新特性：让界面自然地动起来。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'tailwind/003-UtilityCore'
  - 'tailwind/005-ThemeCustomization'
prerequisites:
  - 'tailwind/003-UtilityCore'
---

# 动画与过渡

界面的"动"分两种：**transition** 是状态 A 到状态 B 的补间——按钮悬停变深、卡片展开收起，用户发起，浏览器补上中间帧；**animation** 是元素自己按关键帧循环表演——加载旋转、立绘悬浮、骨架屏呼吸。Tailwind 把两者都做成工具类，本篇讲清各自的用法、新版主题化写法，以及"动了但要动得对"的性能与无障碍底线。

## 前置知识

- [Tailwind 工具类核心机制](/tailwind/003-UtilityCore)：变体与修饰符的语法是本篇的地基。
- [Tailwind 主题定制与设计令牌](/tailwind/005-ThemeCustomization)：动画令牌与颜色令牌一样写进 @theme。
- [Tailwind 响应式与暗色模式](/tailwind/006-ResponsiveDark)：hover: 等状态变体在本篇大量复用。

## 学习目标

1. 能用 transition 系列工具类为状态切换补上平滑过渡，并按需指定过渡属性。
2. 能区分 transition 与 animation 的适用场景，用内置 animate-* 处理加载与骨架屏。
3. 能在 @theme 里用 --animate-* 命名空间注册自定义关键帧动画。
4. 能用状态变体（hover / data-* / aria-* 等）驱动条件动画。
5. 能守住动画的性能底线（只动合成属性）与无障碍底线（尊重减弱动态设置）。

## 1. transition：给状态变化补上"中间帧"

CSS transition 需要三件事：监听哪些属性（transition-property）、时长（duration）、缓动曲线（easing）。Tailwind 的工具类与之一一对应，默认组合是"常用属性 + 150ms + ease"：

```html
<!-- 应援色按钮：悬停时颜色、阴影、位移同时平滑过渡 -->
<button
  class="rounded-md bg-primary px-4 py-2 text-white
         transition duration-200 ease-out
         hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5
         active:translate-y-0 active:shadow-none"
>
  购买门票
</button>
```

裸 `transition` 覆盖 Tailwind 预设的属性集合（颜色、透明度、阴影、transform 等高频项），适合上面这种"多属性一起变"的场景。当只需要某一类属性过渡、其余保持瞬变时，用定向变体更精确：`transition-colors`（只有颜色）、`transition-transform`（只有位移旋转缩放）、`transition-opacity`。时长与延迟按刻度取值：`duration-200`、`delay-150`；缓动用 `ease-out`（入场，快起慢停）、`ease-in`（退场）、`ease-in-out`（来回对称）。经验搭配是"入场 150-200ms ease-out，退场 100-150ms ease-in"，比一律 300ms 干净利落得多。

补充一个与 will-change 的关系：transition 本身不创建合成层，元素动起来时浏览器按需提升；`will-change: transform` 则是提前声明"我要动了"，适合用在明确知道即将动画的元素上（如即将展开的卡片），写多了反而逼浏览器维护大量闲置的合成层，内存开销得不偿失。所以惯例是"transition 全员可用，will-change 点名使用"。

过渡与动画的边界判据可以一句话记住："最终停在哪个状态"由用户行为决定、需要平滑到达，用 transition；"运动本身就是内容"（加载、等待、强调）用 animation。两者混用（比如给循环动画再加 transition）通常说明该拆成两层元素：外层管位移状态，内层管循环表演。

## 2. animation 与关键帧：让元素自己动起来

animation 不依赖状态变化，元素挂上工具类就按 @keyframes 循环表演。Tailwind 内置四个高频动画：`animate-spin`（匀速旋转，加载指示器）、`animate-pulse`（呼吸式淡入淡出，骨架屏）、`animate-bounce`（弹跳，引导注意力）、`animate-ping`（扩散涟漪，提示新消息）。两个典型用例：

```html
<!-- 票务接口请求中：旋转加载指示器 -->
<div
  class="size-6 animate-spin rounded-md border-2 border-primary border-t-transparent"
  role="status"
  aria-label="加载中"
></div>

<!-- 演唱会页面骨架屏：内容未到时的呼吸动画 -->
<div class="animate-pulse space-y-3">
  <div class="h-6 w-1/3 rounded-md bg-surface-muted"></div>
  <div class="h-4 w-2/3 rounded-md bg-surface-muted"></div>
</div>
```

自定义动画在 Tailwind 4 里走**主题令牌**路线——与颜色、字体一样，动画也是设计令牌的一种，声明在 `@theme` 块里：

```css
/* src/styles/global.css：把"歌姬立绘悬浮"注册为动画令牌 */
@import "tailwindcss";

@theme {
  /* --animate-* 命名空间：声明后自动生成 animate-float 工具类 */
  --animate-float: float 6s ease-in-out infinite;

  /* 关键帧写在 @theme 内部：只有对应工具类被用到时才输出进产物 */
  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-12px);
    }
  }
}
```

```html
<!-- 歌姬立绘：缓慢上下悬浮，营造"站在舞台上"的感觉 -->
<img src="/singer.png" alt="歌姬立绘" class="animate-float" />
```

这套写法有两个红利：一是**按需输出**，写死在普通 CSS 里的 @keyframes 全站生效，而 @theme 内的关键帧只有真正用到 `animate-float` 的页面才会被打包；二是**全局一致**，时长、缓动集中在令牌里，想全站把悬浮动画放慢只改一行。一次性动画也可以用任意值语法 `animate-[wiggle_1s_ease-in-out_infinite]` 直接写在类名里，但它绕过了令牌体系，仅建议在真正"只用一次"时使用。

第一个例子里 `border-t-transparent` 是个小技巧：四条边框只有顶边透明，旋转起来就形成经典的"缺口环"效果，配合 `size-6` 固定尺寸。`role="status"` 与 `aria-label` 让屏幕阅读器知道"这里是加载中"，对无障碍来说这比旋转本身更重要。

动画令牌同样享受变体体系：`hover:animate-float`、`motion-safe:animate-float`、`dark:animate-float` 全部开箱即用，因为它本质就是一个普通工具类。设计上还有一层复用思路——同一套 @keyframes 可以被多个令牌引用（`--animate-float: float 6s ...` 与 `--animate-float-fast: float 2s ...` 共享 float 关键帧），改一次关键帧，快慢两档动画同时更新。

骨架屏的节奏还有一处细节：animate-pulse 默认 2 秒一个循环，长列表整片同频呼吸会显得"发闷"，用 `motion-safe:animate-pulse` 兜底无障碍，再给部分行加 animation-delay 错开相位，观感会自然许多——动画的"高级感"常常就在这些节奏微调里。

## 3. 新版本动画特性概览

Tailwind 4 之后的动画相关演进集中在"贴着现代 CSS 走"这条线上，有四点值得纳入日常：

1. **@theme 动画命名空间**（上文已演示）：`--animate-*` 令牌即工具类，替代了旧版"在 config 里配 keyframes + animation"的两段式。
2. **关键帧摇树**：@theme 内的 @keyframes 只在使用对应工具类时输出，避免全站产物被无关动画撑大。
3. **原生 CSS 新能力即插即用**：Tailwind 不封装的 modern CSS 可以直接写进样式层，例如用 `@starting-style` 让元素"插入即淡入"、配合 `transition-behavior: allow-discrete` 实现 display 切换的过渡——这些补足了传统 transition 无法处理"元素出现/消失"的短板：

```css
/* 弹层进场：首次渲染也从透明开始过渡（现代 CSS @starting-style） */
.dialog {
  opacity: 0;
  transition: opacity 0.3s, display 0.3s allow-discrete;
}
.dialog[data-open='true'] {
  opacity: 1;
}
@starting-style {
  .dialog[data-open='true'] {
    opacity: 0;
  }
}
```

4. **色彩空间升级的连带收益**：主题里的 OKLCH 颜色让"同色系渐变过渡"在感知亮度上更均匀，颜色过渡不再出现忽明忽暗（色板体系见 005 篇）。

为什么 transition 处理不了 display 会是一个长期痛点？因为元素一旦 `display: none`，过渡的起点状态根本不存在，浏览器只能"瞬切"。`@starting-style` 与 `allow-discrete` 的组合正是补上这块：前者声明"元素首次渲染时的起始样式"，后者允许 display 这类离散属性参与过渡，两者配合后"弹层的出现与消失"才第一次有了纯 CSS 的平滑方案。这类能力 Tailwind 不急着封装，直接写进样式层反而语义最清楚。

升级视角看，旧项目的迁移要点只有两处：配置文件里的 keyframes + animation 两段式搬进 @theme（关键帧挪进块内、动画名改成 `--animate-*` 令牌）；原来靠 tailwindcss-animate 这类插件实现的状态动画，优先改用内置变体加令牌表达，确有复杂进出场需求再考虑继续用插件。迁移完成的标准是配置文件里不再有 animation 相关条目。

## 4. 条件动画与状态切换

动画的触发权在状态手里，Tailwind 的所有状态变体都能修饰动画工具类。最常用的是悬停与展开收起：

```html
<!-- 演唱会卡片：展开态由 data 属性驱动，动画全部写在类名里 -->
<article
  data-open="false"
  class="overflow-hidden data-[open=true]:max-h-96 data-[open=false]:max-h-24
         transition-[max-height] duration-300 ease-in-out"
>
  <h3>魔法未来 2026</h3>
  <p>场地：横滨体育馆，开票时间 09-10 20:00，全价票 ¥680 起。</p>
</article>
```

```javascript
// 点击卡片切换展开态：JS 只改状态，样式交给 data-* 变体
document.querySelector('article')?.addEventListener('click', (e) => {
  const card = e.currentTarget
  card.dataset.open = card.dataset.open === 'true' ? 'false' : 'true'
})
```

这个模式的关键在于**职责切分**：JavaScript 只负责翻转状态（data-open、class 里的 is-playing），CSS 负责"状态如何呈现"，动画因此天然可预测、可回退。同理可用的还有 `hover:animate-none`（悬停时暂停）、`group-hover:`（进入父级才动）、`motion-safe:`（下节展开）、`dark:`（暗色下换动画节奏）。比起在 JS 里手写 setTimeout 加 class，这套组合更少出错，也让"动画策略"全部集中在模板一处可查。

表单校验是另一个高频的"条件动画"场景。校验态用 aria 属性承载：`aria-[invalid=true]:animate-none aria-[invalid=true]:border-danger` 让出错字段瞬时显眼而不再参与花哨过渡——错误提示要快、要稳定，缓动反而耽误阅读。与之互补的是成功态的轻反馈（如提交按钮短暂上浮），一快一慢对比下来，状态变化的语义会清晰很多。

还有一类"条件动画"出现在数据加载期：列表加载中给容器挂 animate-pulse 的骨架，数据到位后整体摘除。实现上只需要一个 isLoading 状态类，过渡由 transition 补间；要避免的是"骨架到内容"的硬切——给容器加 opacity 过渡，内容淡入，观感立刻完整。

## 5. 性能与可访问性：动得对，才算动得好

**性能底线：只动合成属性。** 浏览器把 `transform` 与 `opacity` 交给合成线程处理，不触发重排与重绘；而 `width`、`top`、`margin` 的每次变化都会引发重新布局，掉帧几乎不可避免：

```html
<!-- 错误：悬停改变宽度，每次都触发布局计算，列表越长越卡 -->
<a class="block w-48 hover:w-64 transition-all">歌曲详情</a>

<!-- 修正：位移交给 transform，合成线程独立完成 -->
<a class="block w-48 transition-transform hover:translate-x-4">歌曲详情</a>
```

另外 `will-change` 只应加给"确定马上要动"的元素，全站滥加反而放大内存开销。无限循环动画（animate-float 这类）还要留意"看不见也在跑"：元素滚出视口或被遮挡时仍消耗电量，长列表里尤其明显，条件允许时用状态类在不可见时移除动画。

**无障碍底线：尊重系统的"减弱动态效果"。** 前庭功能敏感的用户会在系统里开启减弱动态，网页应当响应这个设置。Tailwind 提供成对的变体：`motion-safe:` 只在允许动画时生效，`motion-reduce:` 只在要求减弱时生效：

```html
<!-- 修正：只在用户未开启"减弱动态"时才播放悬浮动画 -->
<img src="/singer.png" alt="歌姬立绘" class="motion-safe:animate-float" />
```

把"装饰性动画一律 motion-safe 修饰"定为团队规范，是成本最低的无障碍改进——信息不依赖动画传达，动画只是锦上添花。

排查动画性能有个固定套路：DevTools 的 Performance 面板录制一次交互，看主线程上有没有布局与绘制的长条——纯合成动画的帧几乎全部落在合成通道。列表滚动时掉帧，多半来自"滚动的祖先上挂着无限动画"，逐个摘掉装饰性动画再复测，通常能直接定位元凶。性能优化先测量再动手，这个顺序在动画上尤其明显。

低端设备之外还有一个常被忽视的场景：打印。长列表页打印时，无限动画元素可能定格在中间帧，用 `print:animate-none` 把装饰动画关掉，给"打印成 PDF 存档"的用户一个干净版面。

## 易错点与最佳实践

1. **给布局属性做动画**。见第 5 节错误示例，`hover:w-64`、`hover:top-2` 都会触发重排。修正：用 transform 系（translate / scale / rotate）与 opacity 表达同样的视觉效果。

2. **关键帧定义在 @theme 之外**。普通 CSS 里写的 @keyframes 不会与令牌联动，且全站输出：

   ```css
   /* 错误：游离在主题外的关键帧，无法摇树也无法统一管理 */
   @keyframes float {
     from { transform: translateY(0); }
   }
   ```

   修正：移入 `@theme` 块，配合 `--animate-float` 令牌声明。

3. **令牌名与工具类名对不上**。`--animate-floaty` 声明的令牌对应 `animate-floaty`，类名里手滑写成 `animate-float` 会被当作不存在的类静默忽略（无样式输出、无报错）。修正：命名后先在模板里敲一遍并确认产物里出现了对应动画。

4. **无限动画常驻低端设备**。立绘悬浮、光晕呼吸在滚动长列表里叠加成"动画风暴"。修正：装饰性动画加 `motion-safe:`；不可见区域用状态类摘除动画；同屏无限动画控制在个位数。

5. **transition-all 当万能钥匙**。`transition-all` 让所有属性参与过渡，新属性一加就"意外地动起来"，还会把本该瞬变的属性拖慢。修正：默认写定向的 `transition-colors` / `transition-transform`，确有多属性需求再用裸 `transition`。

## 本篇小结

1. transition 处理"状态 A 到 B"的补间，transition 属性集合、duration、ease 三件套按需组合；入场 150-200ms ease-out 是安全默认。
2. animation 处理自发表演，内置 animate-spin / pulse / bounce / ping 覆盖加载与骨架屏场景。
3. 自定义动画走 @theme 的 `--animate-*` 命名空间：令牌即工具类，关键帧按需摇树，全局一致可调。
4. 条件动画用状态变体驱动，JS 只翻状态、CSS 管呈现，动画策略集中在模板一处。
5. 性能底线是只动 transform 与 opacity，无障碍底线是装饰性动画一律加 `motion-safe:`。

## 动手实践

1. **购票按钮三态**：为购票按钮实现默认、悬停、按下三态过渡，分别用 150ms、200ms、100ms 与对应的 ease 曲线，对比"一律 300ms"的观感差异。提示：active 态把 translate 收回 0 即可形成"按压"手感。
2. **注册舞台动画**：在 @theme 里注册 `--animate-float` 与 `--animate-glow` 两个令牌，给歌姬立绘加悬浮、给应援色标题加呼吸光晕，然后检查未使用页面的产物里是否被摇树。提示：grep 产物 CSS 里的 @keyframes 数量。
3. **减弱动态演练**：在系统设置里开启"减弱动态效果"，检查立绘悬浮与骨架屏呼吸是否全部停止。提示：DevTools 的 Rendering 面板可以模拟 prefers-reduced-motion。
