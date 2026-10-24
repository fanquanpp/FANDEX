---
order: 80
title: 定位与层叠上下文
module: 'tailwind'
category: 前端技术
difficulty: beginner
description: Tailwind CSS 定位体系：relative/absolute/fixed/sticky 四种定位、inset 家族、z-index 与层叠上下文规则，配 sticky 侧栏、卡片角标徽章、弹窗遮罩与悬浮操作按钮实战
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：CSS 定位（position）与层叠上下文（stacking context）在 Tailwind 里的工具类表达。
- 解决什么问题：元素需要"离开正常位置"的特殊摆放——头像角标、吸顶导航、滚动吸附侧栏、全屏弹窗遮罩、悬浮操作按钮。Flex 与 Grid 管"排"，定位管"钉"。
- 什么时候用到：任何悬浮层、角标徽章、吸顶/吸附场景；以及元素互相遮挡需要控制谁在上谁在下的时候。
- 排布本身（一排/一块版面）见[Flexbox 一维弹性布局](/tailwind/041-FlexboxLayout)与[Grid 网格布局](/tailwind/043-GridLayout)。

## 前置知识

- [Flexbox 一维弹性布局](/tailwind/041-FlexboxLayout)：sticky 侧栏实战用到了 Flex 骨架
- [盒模型、间距与尺寸](/tailwind/040-BoxModelSpacingSizing)：负 margin 与 relative 的层叠关系

## 学习目标

- 能用 `relative`/`absolute`/`fixed`/`sticky` 四种定位各解决一类场景，说出它们"相对谁定位、是否脱离文档流"。
- 能用 `inset-*` 家族与 `z-*` 完成角标、遮罩等悬浮层摆放。
- 理解层叠上下文的产生条件，能诊断"z-index 写了却压不住"的三种常见原因。
- 能用 `sticky top-*` + `h-fit` 完成文档站的滚动吸附侧栏，并说出 sticky 与 fixed 的本质区别。

## 0. 排布管"排"，定位管"钉"

Flex 与 Grid 解决的是"谁挨着谁、占多大地方"——元素仍然老老实实待在文档流里。但有一类需求要元素**飞出**这个秩序：徽章要悬在头像的右上角、弹窗要盖在整个页面之上、目录要滚到一定位置就停住。这就是定位（position）的领地：给元素一个"钉在哪里"的规则。

打个比方：文档流是教室里的座位表，Flex/Grid 是安排座位的老师；定位则是给个别学生发"随意走动证"——可以贴在黑板角上（absolute）、钉在窗边不动（fixed）、或者走到教室前门就站住（sticky）。发证的前提是知道"以什么为参照"，这正是本篇第一课。

## 1. 定位四件套：参照系与脱离流

| 类名 | 属性值 | 相对谁定位 | 是否脱离文档流 |
| --- | --- | --- | --- |
| `relative` | position: relative | 自身原位偏移 | 否（占位不变） |
| `absolute` | position: absolute | 最近的**已定位**祖先 | 是 |
| `fixed` | position: fixed | 浏览器视口 | 是 |
| `sticky` | position: sticky | 最近的可滚动祖先 | 否（滚动到阈值后"吸住"） |
| `inset-0` | top/right/bottom/left: 0 | 四边贴齐参照容器 | — |

```html
<!-- 头像上的未读徽标：父 relative + 子 absolute -->
<div class="relative inline-block">
  <img src="/avatar.png" alt="头像" class="h-16 w-16 rounded-full" />
  <span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">3</span>
</div>

<!-- 弹窗遮罩：fixed + inset-0 铺满视口 -->
<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
  <div class="w-96 rounded-xl bg-white p-6 shadow-xl">弹窗内容</div>
</div>
```

讲解：定位三件套是 `relative` + `absolute` + `z-*`：父元素加 `relative` 成为定位基准，子元素 `absolute` 精确定位到角落，`z-50` 保证悬浮层盖在其他内容之上。`absolute` 的参照是"最近的已定位祖先"——头像容器必须写 `relative`，否则徽章会以更外层的某个定位元素（极端情况下是整页）为基准，"飞"到意想不到的角落，这是定位体系的第一易错点。`fixed inset-0` 则是弹窗遮罩的标准骨架：相对视口铺满，不随滚动。

### 1.1 inset 家族与偏移方向

| 类名 | CSS | 效果 |
| --- | --- | --- |
| `top-0` / `bottom-4` / `left-2` / `right-0` | top/bottom/left/right | 单边偏移，走间距刻度 |
| `-top-1` / `-right-1` | 负值偏移 | 越出参照容器边缘（角标常用） |
| `inset-0` / `inset-x-0` / `inset-y-0` | 四边 / 左右 / 上下 | 贴齐参照容器 |
| `top-1/2 -translate-y-1/2` | top: 50% + 位移修正 | 垂直居中的定位写法 |

```html
<!-- 顶部横幅条：inset-x-0 只约束左右，top 定高 -->
<div class="fixed inset-x-0 top-0 z-50 bg-blue-600 py-2 text-center text-sm text-white">
  系统维护通知：今晚 02:00-04:00
</div>

<!-- 角标越界：负偏移让徽章压在头像边缘上 -->
<span class="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 text-xs text-white">NEW</span>
```

讲解：`inset-x-0` 比分别写 `left-0 right-0` 省字符且语义更清楚。负偏移 `-top-2` 与 040 篇的负 margin 是两种"越界"手段：负 margin 影响占位（后续元素会跟上来），负偏移不影响占位（纯视觉位移）——做角标用负偏移，做"破格"图片可以用负 margin。

### 1.2 z-index 与层叠上下文

`z-*` 控制同层元素的绘制先后，但它的生效前提常被忽略。z-index 只在同一个**层叠上下文**内比较，而层叠上下文不只是"有定位"就产生——`transform`、`opacity < 1`、`filter`、`isolation` 等属性都会创建新的层叠上下文。

| 类名 | 值 | 约定俗成的层级 |
| --- | --- | --- |
| `z-0` | z-index: 0 | 基准层 |
| `z-10` / `z-20` / `z-30` | 10/20/30 | 内容上的浮层 |
| `z-40` | 40 | 弹窗遮罩 |
| `z-50` | 50 | 导航、抽屉、悬浮按钮 |
| `z-auto` | auto | 不创建上下文，跟随文档顺序 |

z-index 失效三场景：其一，**参照系错了**——两个元素分属不同父级，而某个父级自己有 `transform`/`opacity`，整棵子树被"打包"成一个上下文，内部 z 再大也压不过外部（解法：把 z 设在打包的那个父级上，或移除打包属性）；其二，**没定位**——`z-*` 对普通流内元素无效，先给 `relative`；其三，**父级 overflow 裁剪**——子元素被父容器的 `overflow-hidden` 裁掉，不是 z 的问题（解法：去掉裁剪或调整结构）。

## 2. 工程实战一：sticky 侧栏

后台与文档站的经典需求：主内容很长往下滚，侧栏菜单要"跟到一定程度就停住"。`sticky` 是正常流内的吸附——**不脱离布局**，这是它与 `fixed` 的本质区别：

```html
<div class="flex gap-8 p-6">
  <!-- 侧栏：滚过自身高度后吸附在视口顶部下方 24px 处 -->
  <aside class="sticky top-24 h-fit w-56 shrink-0">
    <nav class="space-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <a class="block rounded-md px-3 py-2 hover:bg-gray-100" href="#basics">基础概念</a>
      <a class="block rounded-md px-3 py-2 hover:bg-gray-100" href="#api">API 参考</a>
      <a class="block rounded-md px-3 py-2 hover:bg-gray-100" href="#faq">常见问题</a>
    </nav>
  </aside>
  <main class="min-w-0 flex-1">
    <h2 id="basics" class="scroll-mt-24 text-xl font-bold">基础概念</h2>
    <p class="mt-2 leading-relaxed text-gray-600">（长正文……）</p>
  </main>
</div>
```

讲解：三个细节决定 sticky 成败。其一，`top-24` 给出吸附阈值——不写 `top-*` 的 sticky 元素永远不会"吸住"（阈值缺失等于没有触发条件），这是头号易错点。其二，`h-fit`（height: fit-content）让侧栏高度只等于内容高度，否则侧栏被拉伸成与正文等高、滚动全程都在"自己内部"，吸附形同虚设。其三，锚点跳转配合 `scroll-mt-24`（scroll-margin-top）给标题留出被吸顶元素遮挡的空隙。另外父容器不能有 `overflow: hidden`/`overflow: auto`——sticky 相对最近的可滚动祖先吸附，中间隔着一个内部滚动容器就会失效。

## 3. 工程实战二：悬浮操作按钮与角标

把定位四件套组合起来，完成两个常见悬浮部件。

### 3.1 卡片角标徽章

```html
<!-- 限时折扣角标：图片容器 relative，角标 absolute 到右上角并轻微旋转 -->
<article class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
  <div class="relative">
    <img src="/course.png" alt="课程封面" class="h-40 w-full object-cover" />
    <span class="absolute top-3 right-3 rotate-6 rounded-md bg-red-500 px-2 py-1 text-xs font-bold text-white shadow">
      限时 5 折
    </span>
  </div>
  <div class="p-4">
    <h3 class="font-semibold">Python 数据分析实战</h3>
  </div>
</article>
```

讲解：`relative` 加在**图片的直接包裹层**上而不是整张卡片上——参照系越贴近目标，偏移量越好算。角标配合 `rotate-6`（视觉特效篇的变换类）做出贴纸感。卡片外层的 `overflow-hidden` 与角标共存的前提是角标在容器**内部**；若想让角标一半露在卡外，就得把 `overflow-hidden` 移走或把角标挂到外层——裁剪与越界是一对约束。

### 3.2 悬浮操作按钮（FAB）

```html
<!-- 悬浮操作按钮：fixed 钉在视口右下角，不随内容滚动 -->
<div class="relative">
  <!-- 页面内容（长列表）…… -->
  <button
    class="fixed right-6 bottom-6 z-50 flex size-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-lg transition-transform hover:scale-105"
    aria-label="新建笔记"
  >
    +
  </button>
</div>
```

讲解：FAB 用 `fixed` 而不是 `absolute`——它要相对**视口**钉住，页面滚多远都在。`z-50` 压过内容层，但要低于全屏弹窗遮罩（惯例遮罩 `z-40`、导航与 FAB `z-50`、顶层 toast 更高，团队定一张层级表比逐处猜可靠）。按钮上的 `aria-label` 补上纯图标按钮的可访问性语义。

## 4. 常见错误与对策

| 错误场景 | 表现 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 定位基准错误 | absolute 元素"飞"到页面角落 | 祖先没有 `relative`，absolute 定位到更外层 | 在最近的定位父元素上加 `relative` |
| sticky 不吸附 | 滚动后元素跟着走 | 未设 `top-*` 阈值，或祖先有 `overflow: hidden/auto` | 补 `top-*`；检查中间祖先的 overflow；侧栏记得 `h-fit` |
| z-index 压不住 | z-9999 盖不过 z-10 | 两者不在同一层叠上下文（父级有 transform/opacity/filter） | 把 z 加到创建上下文的父级，或移除打包属性 |
| 遮罩盖不住导航 | 弹窗打开后导航仍浮在遮罩上 | 导航 z-50 高于遮罩 z-40 | 打开弹窗时隐藏导航，或统一层级表：遮罩高于导航 |
| 角标被裁剪 | 角标只显示一半 | 父容器 `overflow-hidden` | 调整角标挂载层或去掉裁剪 |
| fixed 在移动端漂移 | 键盘弹起时 FAB 位置错乱 | 移动端软键盘改变视口 | 关键浮层改 `absolute` 挂在应用根容器上 |

## 5. 动手实践

**任务一：文档页侧栏。** 给一篇长文档加"滚动吸附的目录侧栏"，目录滚到视口顶部下方 16px 处停住，正文标题锚点跳转不被遮挡。提示：`sticky top-4 h-fit` + `scroll-mt-*`；再故意给外层加 `overflow-hidden` 观察失效，把原因写成一行注释。

**任务二：消息列表未读角标。** 实现一个"头像 + 未读数"的会话条目：红色圆形角标悬在头像右上角并压住头像边缘，数字最多显示 99+。提示：父 `relative inline-block`、子 `absolute -top-1 -right-1`；角标本体用 `flex items-center justify-center` 居中数字。

**任务三：全屏确认弹窗。** 实现"删除确认"弹窗：半透明遮罩铺满视口、内容框双轴居中、点击遮罩区域空白处关闭（内容框点击不冒泡关闭）。提示：遮罩 `fixed inset-0 z-40 flex items-center justify-center`；内容框加 `@click.stop`（框架事件修饰）阻止冒泡。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现</summary>

```html
<div class="flex gap-8 p-6">
  <aside class="sticky top-4 h-fit w-48 shrink-0">
    <nav class="space-y-1 text-sm">
      <a href="#s1" class="block rounded px-3 py-2 hover:bg-gray-100">第一节</a>
      <a href="#s2" class="block rounded px-3 py-2 hover:bg-gray-100">第二节</a>
    </nav>
  </aside>
  <main class="min-w-0 flex-1 space-y-16">
    <section id="s1" class="scroll-mt-20">
      <h2 class="text-xl font-bold">第一节</h2>
      <p class="mt-2 text-gray-600">（长正文，写满几屏）</p>
    </section>
    <section id="s2" class="scroll-mt-20">
      <h2 class="text-xl font-bold">第二节</h2>
      <p class="mt-2 text-gray-600">（长正文，写满几屏）</p>
    </section>
  </main>
</div>
<!-- 注意：外层容器若加 overflow-hidden，sticky 立即失效——sticky 相对最近可滚动祖先吸附 -->
```

自检三问：没写 `top-4` 时目录还吸吗（不吸，缺阈值）；把 `h-fit` 去掉呢（侧栏被拉伸到与正文等高，吸附无从发生）；外层加 `overflow-hidden` 呢（失效，原因见注释）。三问都能答上来，sticky 这节就过关了。
</details>

<details>
<summary>任务二参考实现</summary>

```html
<button class="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-100">
  <span class="relative inline-block">
    <img src="/avatar-2.png" alt="对方头像" class="size-10 rounded-full object-cover" />
    <span class="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      99+
    </span>
  </span>
  <span class="min-w-0 flex-1">
    <span class="block truncate text-sm font-medium">项目群</span>
    <span class="block truncate text-xs text-gray-500">明早把评审意见发我……</span>
  </span>
</button>
```

三个细节：角标用 `min-w-5` 而不是固定 `w-5`——"3"和"99+"宽度不同，最小宽度让一位数保持圆形、多位数自然变胶囊；`text-[10px]` 任意值把角标字号压到 10px（预设刻度没有 10px 这一档，属于合理的例外值）；两行文本用 `truncate` 截断超长内容，保证会话条目单行高度稳定。角标压住头像边缘靠的是负偏移 `-top-1 -right-1`，头像自身的 `rounded-full` 与角标对齐后视觉上就是"咬合"效果。
</details>

<details>
<summary>任务三参考实现</summary>

```html
<!-- Vue 3 写法；React 用 e.stopPropagation() 同理 -->
<template>
  <div
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
    @click="close"
  >
    <div
      class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      role="alertdialog"
      aria-modal="true"
      @click.stop
    >
      <h3 class="text-lg font-bold">删除这条评论？</h3>
      <p class="mt-2 text-sm text-gray-500">删除后无法恢复。</p>
      <div class="mt-6 flex justify-end gap-3">
        <button class="rounded-md border border-gray-300 px-4 py-2 text-sm" @click="close">取消</button>
        <button class="rounded-md bg-red-600 px-4 py-2 text-sm text-white" @click="confirm">删除</button>
      </div>
    </div>
  </div>
</template>
```

`fixed inset-0` 铺满视口 + `flex items-center justify-center` 让内容框双轴居中——遮罩层兼职居中容器，不需要单独的定位计算。`@click.stop` 阻止事件冒泡到遮罩层，是"点内容不关闭、点空白关闭"的关键；漏掉它，在弹窗里选字的每一次点击都会把弹窗关掉。`role="alertdialog"` 与 `aria-modal="true"` 告诉屏幕阅读器这是一个模态确认框——遮罩拦得住鼠标，拦不住 Tab 键，完整的弹窗还要把焦点圈进内容框（进阶见无障碍相关资料）。
</details>

## 6. 一句话记忆

定位是"离开正常流"的手段：`relative` 作地基（同时是 absolute 的参照）、`absolute` 摆角标（参照最近的已定位祖先）、`fixed` 铺遮罩（相对视口）、`sticky` 要配 `top-*` 与 `h-fit`；`z-*` 只在同一个层叠上下文内比大小，父级带 transform/opacity 就会"打包"整棵子树。

## 7. 相关阅读

- Grid 搭骨架（本篇悬浮层的宿主版面）：[Grid 网格布局](/tailwind/043-GridLayout)
- sticky 侧栏用到的 Flex 骨架与 `min-w-0` 兜底：[Flexbox 一维弹性布局](/tailwind/041-FlexboxLayout)
- 负 margin 与负偏移的分工（占位 vs 位移）：[盒模型、间距与尺寸](/tailwind/040-BoxModelSpacingSizing)
- 角标上的 `rotate-*` 与 FAB 的 `scale-*`：[变换、滤镜与视觉特效](/tailwind/085-TailwindVisualEffects)
- 吸顶毛玻璃 `backdrop-blur` 与滚动吸附 `scroll-mt-*` 的滚动控制同类项：[交互控制与滚动工具类](/tailwind/088-InteractivityAndScrollUtilities)
