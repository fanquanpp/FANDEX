## 前置知识

- [Astro 页面与路由](/astro/003-PagesRouting)：理解多页面应用（MPA）的页面切换模型，知道一次导航就是一次完整文档加载。
- [Astro 岛屿与客户端组件](/astro/006-IslandsClientComponents)：掌握岛屿架构与 `client:*` 水合指令，本文的"持久化组件"正建立在岛屿之上。
- [Astro 7 新特性速览](/astro/009-Astro7Features)：了解 View Transitions 从 Astro 3 实验特性到 5.0 更名 ClientRouter 的演进脉络。

## 学习目标

1. 能解释 MPA 与 SPA 在页面切换体验上的差异，说出浏览器 View Transitions API 解决了什么问题。
2. 能在布局中启用 ClientRouter，并用 `transition:animate` 指令控制整页与元素的过渡动画。
3. 能用 `transition:name` 为歌姬封面、歌曲卡片实现跨页面的共享元素动画。
4. 能用 `transition:persist` 让音乐播放器岛屿在跨页面导航时保持播放状态。
5. 能区分 `astro:page-load` 等导航生命周期事件，正确编写"每次导航都要执行"的客户端脚本。

## 1. MPA 与 SPA 之间缺的那块拼图

Astro 默认输出多页面应用：每次点击链接，浏览器丢弃旧文档、加载新文档。这种方式天然快（零 JS、按需加载），但有两个体验短板：切换瞬间是"白屏一闪"，且页面间的 JS 状态（比如正在播放的歌曲）全部清零。SPA 用整页接管的方式换来了丝滑切换与状态存续，代价是把所有页面逻辑都搬进浏览器。

浏览器的 **View Transitions API** 给出了第三条路：文档照常加载（保留 MPA 的简单），但浏览器在旧文档与新文档之间录制一帧"旧画面"、渲染一帧"新画面"，然后由合成器把两帧做动画。整个过程发生在像素层，不依赖框架，开销极低。Astro 的 **ClientRouter**（早期版本叫 ViewTransitions 组件）把这个浏览器能力接管了下来：拦截同源链接点击，用 `fetch` 拿到新页面 HTML，替换 `<head>` 与 `<body>`，同时触发视图过渡——于是 MPA 拥有了接近 SPA 的切换体验，而不用把整个站点重写成 SPA。

对"虚拟歌手音乐平台"来说，这正合适：站点主体是歌曲页、歌姬主页这类内容页面，适合静态输出；只有底部播放器需要状态。与其为了一句动画引入整站 SPA，不如开一个路由器加几条指令。

把 ClientRouter 和传统 SPA 客户端路由摆在一起对比，差异会非常直观。SPA 路由器在内存里维护路由表，切换页面时销毁旧组件树、重建新组件树，页面的 HTML 从头到尾由 JS 渲染；ClientRouter 不理解你的组件，它只做两件事：取回新文档、替换 DOM，动画交给浏览器合成器。因此它没有"路由守卫""异步组件加载"这些概念，也不需要——路由仍然是文件系统（见 003 篇），JS 只负责"让切换好看"。理解了这个定位，你就不会在 ClientRouter 里寻找 SPA 框架的特性，也不会把本该由服务端渲染的逻辑搬进浏览器。

## 2. 启用 ClientRouter：一次导入，全站生效

ClientRouter 是一个普通 Astro 组件，放在公共布局的 `<head>` 里即可对使用该布局的所有页面生效。

```astro
---
// src/layouts/BaseLayout.astro
import { ClientRouter } from 'astro:transitions'
// 平台主题色作为站点级常量，头部横条使用应援色渐变
const themeColor = '#39C5BB'
interface Props {
  title: string
  singer?: string
}
const { title, singer = '虚拟歌手音乐平台' } = Astro.props
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>
    <!-- 启用客户端路由：所有指向本站链接的点击都会走视图过渡导航 -->
    <ClientRouter />
    <meta name="theme-color" content={themeColor} />
  </head>
  <body>
    <header>{singer}</header>
    <slot />
  </body>
</html>
```

启用后不需要写任何动画代码：默认情况下，根元素使用浏览器自带的淡入淡出式过渡（对应 `transition:animate="initial"`）。注意两个行为细节：

1. **导航不再是整页刷新**。浏览器地址栏会更新、历史记录会入栈，但 `<script>` 不会重新执行（模块脚本被去重），这直接引出第 6 节的脚本问题。
2. **降级策略是内置的**。不支持该 API 的浏览器会自动退回普通 MPA 导航，站点功能不受影响，动画只是"锦上添花"。

还有一个边界要说清楚：ClientRouter 拦截的是**指向同源的 `<a>` 链接**。跨站链接、下载链接、带 `target="_blank"` 的链接、表单提交，都保持浏览器原生行为；页面内锚点（`#` 开头）会被平滑滚动处理而不是触发过渡。另外，路由器的生效范围由布局决定——哪个页面的 `<head>` 里有 `<ClientRouter />`，哪些页面之间的导航就走过渡。若某个页面（比如粉丝团登录页）特意没有引入公共布局，从它跳出去就是一次原生整页加载，这反而适合"进出敏感区域"的场景。

## 3. transition:animate：从整页到单个元素

`transition:animate` 作用于**根元素**时定义整页过渡，作用于**普通元素**时定义该元素进出动画。内置四档：`fade`（淡入淡出）、`slide`（旧页滑出新页滑入）、`none`（直接跳变）、`initial`（交给浏览器默认）。带参数的写法从 `astro:transitions` 导入动画工厂函数。

```astro
---
// src/pages/songs/index.astro：歌曲列表页
import { fade, slide } from 'astro:transitions'
const songs = [
  { id: 'senbonzakura', name: '千本樱', producer: '黑うつP' },
  { id: 'melt', name: 'Melt', producer: 'ryo' },
  { id: 'tell-your-world', name: 'Tell Your World', producer: 'livetune' },
]
---

<ul>
  {
    songs.map((song) => (
      <li transition:animate={fade({ duration: '0.4s', easing: 'ease-in-out' })}>
        <a href={`/songs/${song.id}/`}>{song.name}</a>
        <span>P主：{song.producer}</span>
      </li>
    ))
  }
</ul>

<!-- 整页改为滑入效果：离场在左，进场也在左，方向由导航方向决定 -->
<div class="page" transition:animate={slide({ duration: '0.35s' })}>
  <slot />
</div>
```

`fade` / `slide` 工厂都接受 `duration` 与 `easing`；若内置动画都不合适，还可以传入自定义动画对象，用 `name` 指向自己在全局 CSS 中定义的 `@keyframes`，Astro 会把它展开成 `old` / `new` 两套动画描述。原则是：**整页动画保持克制**（0.2 到 0.4 秒为宜），把最有表现力的部分留给下一节的共享元素。

从工程角度再补三点。第一，这些动画跑在合成器线程，改的是透明度与变换这类可合成的属性，主线程不被占用——这也是视图过渡比 JS 动画"显得顺"的根本原因；自定义 `@keyframes` 时尽量只用 `opacity` 与 `transform`，一旦写了 `width`、`top` 这类布局属性，动画就会掉帧。第二，过渡是有**方向感**的：前进与后退导航时，`slide` 会自动反转方向，这是浏览器根据导航类型推断的，不需要你写代码。第三，`transition:animate` 的值是构建期求值的表达式，可以按 `Astro.props` 传入参数做组件级定制，但不能在客户端运行时动态改变——它是模板的一部分，不是运行时 API。

## 4. transition:name：跨页面的共享元素动画

共享元素动画是视图过渡最有表现力的能力：列表页的封面图与详情页的封面图被认为是"同一个东西"，导航时旧页的那张图会平滑地飞到新页的位置与尺寸。做法是在两个页面上给对应元素写**相同的** `transition:name`。

```astro
---
// src/pages/songs/[id].astro：歌曲详情页
const { id } = Astro.params
const song = await getSong(id) // 从内容集合或 API 读取歌曲数据
---

<article>
  <!-- 与列表页封面同名：两张图之间自动产生位移动画 -->
  <img
    src={song.cover}
    alt={`${song.name} 封面`}
    width="960"
    height="540"
    transition:name={`song-cover-${id}`}
  />
  <h1 transition:name={`song-title-${id}`}>{song.name}</h1>
  <p>P主：{song.producer}，应援色：{song.themeColor}</p>
</article>
```

三个规则必须牢记：

1. **同一页面内 `transition:name` 必须唯一**。列表页有 30 首歌，就写 30 个不同的名字（上面用歌曲 id 拼接正是为此）。重复名字会导致动画错乱甚至整页过渡失效。
2. 两个页面只需**各自**标注重名元素，Astro 会在导航时自动配对。
3. 对动画要求不高的元素可加 `fallback="none"` 关闭降级动画，或用 `transition:animate="none"` 让它"原地不动"，只让封面和标题做飞行，避免画面里所有元素都在动。

典型组合是：封面用共享元素动画，标题用共享元素动画，其余内容用整页默认淡入淡出——用户的视线自然跟着封面从列表"落"到详情。

命名策略值得提前定好，因为它会随着页面数量增长而变得难管。推荐用"组件前缀 + 业务 ID"的两段式：`song-cover-`、`singer-avatar-` 各成一族，排查时一眼看出某对动画属于哪个组件。反过来，两个容易忽略的细节：其一，`transition:name` 会被编译成 CSS 的 `view-transition-name` 属性，名字里不能有空格等非法字符，用 kebab-case 最稳；其二，如果两个页面里同名元素在渲染条件上互斥（比如详情页 404 时没有封面），配对会静默失败并退回整页过渡，不会报错——调试"动画怎么不飞了"时，先检查两边元素是否都真实渲染了。

## 5. transition:persist：让播放器岛屿跨页面存活

音乐平台最要命的体验断裂：点进一首歌，播放器开始放《千本樱》，用户一跳转页面，歌停了。整页导航会把 DOM 连同岛屿状态一起销毁，而 `transition:persist` 告诉 ClientRouter：**导航时不要替换这个元素，把旧页的 DOM 节点原封不动搬进新页**。

```astro
---
// src/layouts/BaseLayout.astro（追加）
import Player from '../components/Player.jsx'
---

<body>
  <!--
    transition:persist：跨页面保留该岛屿的 DOM 与状态（正在播放、进度、音量）。
    水合指令与持久化可以共存：client:load 保证首屏即可用。
  -->
  <Player client:load transition:persist="global-player" />

  <main>
    <slot />
  </main>
</body>
```

```jsx
// src/components/Player.jsx：极简播放器岛屿，内部状态在导航间存活
import { useState, useEffect } from 'react'

export default function Player() {
  const [current, setCurrent] = useState(null)
  const [playing, setPlaying] = useState(false)

  // 监听平台自定义事件：歌曲详情页点击"试听"时广播
  useEffect(() => {
    const play = (e) => {
      setCurrent(e.detail) // { id, name, src, themeColor }
      setPlaying(true)
    }
    window.addEventListener('player:play', play)
    return () => window.removeEventListener('player:play', play)
  }, [])

  return (
    <footer style={{ borderTop: `4px solid ${current?.themeColor ?? '#39C5BB'}` }}>
      {current ? `${playing ? '正在播放' : '已暂停'}：${current.name}` : '播放器待机中'}
      <button onClick={() => setPlaying(!playing)}>{playing ? '暂停' : '继续'}</button>
    </footer>
  )
}
```

两个进阶点：

1. `transition:persist` 的值（如 `global-player`）是**配对键**。不传值时按组件身份配对；对列表中的多个岛屿，必须传值区分。`<audio>`、`<video>` 这类浏览器原生元素同样适用——媒体元素的状态本来就在 DOM 里，持久化它们最直接。
2. 持久化岛屿**不会**拿到新页面的新 Props，旧 Props 会一直沿用；确需随页面更新 Props 时，在岛屿元素上追加 `transition:persist-props`。

`transition:persist` 不限于框架岛屿：任何元素加上它，导航时都会保留旧 DOM 节点。一个实用例子是歌单页顶部的"搜索关键词"输入框——用户翻页浏览时输入内容不该被清空，给这个 `<input>` 加上持久化即可，连一行脚本都不用写。但代价要想明白：被保留的节点不再反映新页面的服务端渲染结果，如果该元素的内容依赖每页数据（比如歌单页头部的歌单名），持久化就会显示上一页的旧值。判断标准很简单：**状态属于用户（播放进度、输入内容）就持久化，内容属于数据（标题、列表）就不持久化**。

## 6. 导航生命周期事件：重写你的监听脚本

启用 ClientRouter 后最大的坑是脚本：模块脚本在每个页面只执行一次，跨页导航不会重跑。假设歌姬主页有一段"演唱会倒计时"脚本，用户从主页跳到别的页再跳回来，倒计时不会重新启动。解决办法是把逻辑挂到 `astro:page-load` 事件上——它在**首次加载**和**每次导航完成**时都会触发。

```html
<!-- src/components/Countdown.astro：演唱会倒计时组件 -->
<script>
  function startCountdown() {
    const el = document.querySelector('#concert-countdown')
    if (!el) return // 当前页面没有倒计时元素时直接退出

    const openTime = new Date(el.dataset.open).getTime()
    const tick = () => {
      const left = Math.max(0, openTime - Date.now())
      el.textContent = `魔法未来 2026 开票倒计时：${Math.floor(left / 1000)} 秒`
    }
    tick()
    // 存到元素上，重复导航时先清掉旧定时器，避免叠加多个 tick
    clearInterval(Number(el.dataset.timer))
    el.dataset.timer = String(setInterval(tick, 1000))
  }

  // 首次加载与每次视图过渡导航完成后都会触发
  document.addEventListener('astro:page-load', startCountdown)
</script>

<div id="concert-countdown" data-open="2026-09-10T20:00:00+09:00"></div>
```

常用事件按发生顺序排列：`astro:before-preparation`（开始拉取新页）、`astro:after-preparation`（新页内容就绪）、`astro:before-swap`（即将替换 DOM，可在这里改写 `newDocument`，比如按粉丝团等级注入内容）、`astro:after-swap`（DOM 已替换）、`astro:page-load`（新页可见、可交互，**业务脚本首选**）。还有一个惯例：传统脚本里常见的 `window.addEventListener('load', ...)`、`DOMContentLoaded` 在视图过渡导航中不会再次触发，全部迁移到 `astro:page-load` 即可，它在首次加载时也会补发一次，所以写法是统一的。

除了"重跑脚本"，这组事件还有两类高阶用法。一是**切换前介入**：在 `astro:before-preparation` 里可以启动一个顶栏加载条，在 `astro:after-preparation` 里收起，用户在网络慢时也能感知"导航正在进行"；事件对象上还能读到导航方向与来源表单，据此决定过渡动画的方向。二是**滚动与焦点管理**：默认行为是进入新页回到顶部，若想保留上一页的滚动位置（比如从详情页返回列表页），在 `astro:before-swap` 中设置交换策略即可。这些能力都属于"需要时再查"的进阶项，先把业务脚本挂上 `astro:page-load`，是启用视图过渡后的第一步重构。

## 易错点与最佳实践

1. **脚本不重跑**：启用 ClientRouter 后，顶层模块脚本只执行一次。任何"每个页面都要执行"的逻辑（埋点、倒计时、表单增强）都必须挂 `astro:page-load`，并在处理函数里判断目标元素是否存在。
2. **`transition:name` 不唯一**：列表页循环渲染时最容易踩。用稳定的业务 id（歌曲 id、歌姬 id）拼接名字，禁止用数组下标——排序一变动画就配错对。
3. **持久化岛屿的 Props 不更新**：`transition:persist` 保留 DOM 的同时也保留了旧 Props。需要新数据的岛屿要么重新拉取，要么显式加 `transition:persist-props`。
4. **动画克制与无障碍**：整页过渡控制在 0.3 秒左右；对开启"减弱动态效果"的用户，用 `@media (prefers-reduced-motion: reduce)` 把 `transition:animate` 设为 `none`。
5. **不要把 ClientRouter 当 SPA 用**：它的定位是"MPA 的体验补丁"。页面之间靠文档区分、交互靠岛屿，一旦发现大量状态需要在页面间共享，先考虑是不是该用客户端路由框架。

## 本篇小结

1. ClientRouter 用浏览器 View Transitions API 给 MPA 补上切换动画与状态存续，布局 `<head>` 放一行 `<ClientRouter />` 即可全站生效。
2. `transition:animate` 控制整页与元素动画，内置 `fade` / `slide` / `none` / `initial`，可用工厂函数调参或自定义 `@keyframes`。
3. `transition:name` 实现共享元素动画，页面内唯一、跨页同名，是列表到详情的标配体验。
4. `transition:persist` 让播放器这类岛屿跨页面存活，媒体状态不再被导航打断；`transition:persist-props` 控制 Props 是否同步。
5. 客户端脚本一律挂在 `astro:page-load` 上，兼顾首次加载与导航后执行。

## 动手实践

1. **封面飞行**：给歌曲列表页与详情页的封面、标题加上 `transition:name`，再用 `slide` 改造整页过渡，对比三种 `duration`（0.2s / 0.35s / 0.6s）下的观感差异。提示：列表页名字必须含歌曲 id，否则会撞名。
2. **不停播的播放器**：把第 5 节的 Player 挂到全局布局并持久化，然后在三个页面之间连续跳转，验证歌曲不中断；再试试去掉 `transition:persist="global-player"` 观察差异。提示：注意持久化后 Props 不再变化的影响。
3. **倒计时不失灵**：实现歌姬主页的演唱会倒计时，从主页跳到歌曲页再返回，确认倒计时仍在走且只有一个定时器在跑。提示：用 `astro:page-load` 启动、在启动前先清理旧定时器。
