# 集成与 MDX

Astro 的核心只管"页面、组件、内容"三件事，其余能力——MDX 混排、站点地图、框架岛屿、图标——都以**集成（Integration）**的形式挂上来。本篇先拆开集成机制看它到底做了什么，再以 MDX 为主角讲"在文档里直接用组件"的写作方式，最后给出官方集成的选型表与传参方法。

## 前置知识

- [Astro 组件与 Props](/astro/004-ComponentsProps)：MDX 里混排的正是这些组件。
- [Astro 内容集合](/astro/005-ContentCollections)：本篇的 MDX 内容以内容集合方式组织。
- [Astro 构建与部署](/astro/008-BuildDeploy)：sitemap 等集成的产物在构建期生成，需理解构建流程。

## 学习目标

1. 能说出集成是什么，以及 `astro add` 一条命令背后替你做了哪三件事。
2. 能安装并启用 @astrojs/mdx，在 MDX 文档中导入并使用平台组件。
3. 能通过 `components` 映射统一文档内标题、引用块等元素的渲染。
4. 能按场景从官方集成生态中选出需要的几个，并说明各自的启用时机。
5. 能给集成传参，理解 mdx 配置与全局 markdown 配置的继承关系。

## 1. 集成机制：一条 install 命令背后的三件事

集成本质上是一个 npm 包导出的**工厂函数**，返回一个带名字与钩子的对象。它不是运行时依赖，而是构建期"施工队"：Astro 启动构建时逐个调用集成的钩子，集成借机修改配置、注入脚本、注册路由、调整产物。

平时接入集成只需一条命令：

```bash
# 一条命令等价于三件事：安装包、写入 astro.config、生成必要配置
npx astro add mdx sitemap
```

这条命令替你完成了三件事：`pnpm add @astrojs/mdx @astrojs/sitemap` 装包；把 `mdx()` 与 `sitemap()` 追加进 `astro.config.mjs` 的 `integrations` 数组；必要时生成示例配置。手动等价写法如下：

```javascript
// astro.config.mjs：集成是挂在配置上的"功能插槽"
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  // sitemap 依赖 site 才能生成绝对链接，没配 site 等于白装
  site: 'https://fandex-music.example.com',
  integrations: [mdx(), sitemap()],
})
```

想看清集成的本质，可以看一眼最小骨架。绝大多数集成的全部工作都发生在 `astro:config:setup` 钩子里：

```javascript
// 一个最小集成：构建期注入全站前置脚本
export function fanBadgeIntegration(options = {}) {
  return {
    name: 'fan-badge', // 集成标识，日志与去重都靠它
    hooks: {
      'astro:config:setup': ({ injectScript, updateConfig }) => {
        // 注入全站前置脚本：为歌姬卡片绑定应援色描边逻辑
        injectScript('before-hydration', "import '../styles/fan-badge.js'")
        // 也可以用 updateConfig 修改 vite 配置，或用 injectRoute 注册新路由
      },
    },
  }
}
```

理解了"集成 = 构建期钩子"这个定位，就能解释两个常见疑问：为什么集成装完要重启 dev server（配置变了）；为什么集成不会拖慢页面运行时（它的产物在构建期就定型了）。

钩子清单再展开一层，集成的四类高频动作就有对应位置：`updateConfig` 修改 Vite 配置（注入别名、插件）；`injectScript` / `injectStyle` 注入全站脚本与样式；`injectRoute` 注册额外路由（把集成自带的页面挂进站点）；`astro:build:done` 这类后置钩子在产物生成后做收尾（写 sitemap 文件的就是它）。排查集成问题时，先看它的 README 声明了哪些钩子，再用 `astro sync` 与构建日志对照"声明了什么、实际做了什么"，比逐行读源码快得多。

## 2. MDX：在文档里直接使用组件

Markdown 适合写叙述文字，但当你要在文档里嵌入"歌曲卡片""票价表"这类结构化内容时，纯 Markdown 只能用 HTML 语法硬凑。MDX 的答案是：**Markdown 之上加上 import 与组件语法**，文件扩展名从 `.md` 变为 `.mdx`，其余心智不变。

安装启用后（`npx astro add mdx`），在内容集合里建 `.mdx` 文件即可：

```mdx
---
title: '千本樱听歌笔记'
order: 10
---

// MDX 顶部可以直接 import 组件——这是与普通 Markdown 的最大差异
import SongCard from '../../components/SongCard.astro'

# 千本樱：从 NICONICO 到魔法未来

<SongCard id="senbonzakura" showProducers />

整曲最"电"的瞬间出现在 2:14 的和声切分。下面这段副歌的
**演唱分配**值得反复听——普通 Markdown 语法全部可用。

> 注意 `<` 与 `{` 在 MDX 里是语法字符，写正文时要转义。
```

要点有三。第一，frontmatter 照常写，内容集合的 schema 校验对 `.mdx` 同样生效。第二，组件可以传 Props，渲染时机与普通 Astro 组件完全一致，构建期就已生成 HTML。第三，正文中 `<` 与 `{` 从"普通字符"变成了"语法字符"（标签与表达式），这是 MDX 写作中最需要适应的一点，普通文本里出现花括号要用 `{'{'}` 转义或干脆改写成代码块。

`.md` 与 `.mdx` 的选择标准值得提前定好，否则集合里会长期混着两种口味。判断依据是"组件密度与作者身份"：由平台开发者维护、需要嵌入结构化组件的教程与评测，用 `.mdx`；由内容团队或外部投稿、组件密度低的文章，留在 `.md` 并靠第 3 节的全站映射获得统一皮肤。全站统一映射加少量 `.mdx` 的组合，能把"MDX 语法门槛"限制在真正需要它的少数作者手里。

MDX 在内容集合里还保留一个贴心细节：渲染入口与 `.md` 完全一致，都是走 `render(entry)`（见 005 篇），页面层代码不需要感知"这一篇是 mdx 还是 md"。这意味着把某篇文档从 `.md` 升级为 `.mdx` 时，详情页一行不用改，迁移成本被压到文件本身——这种"格式切换零成本"，正是 MDX 集成与内容集合配合得当的地方。

## 3. components 映射：让文档元素穿上平台皮肤

MDX 可以"从文件内部"导入组件，但更多时候你想要反过来：**不改一篇篇文档，统一替换某种元素的全站渲染**。比如所有 `.md` 歌词引用块都要渲染成"歌词摘录卡片"，所有二级标题都要带应援色竖条。这用 `Content` 组件的 `components` 映射实现。

```astro
---
// src/pages/songs/reviews/[slug].astro：评测文章详情页
import { getEntry, render } from 'astro:content'
import ProseH2 from '../../components/ProseH2.astro'
import SongQuote from '../../components/SongQuote.astro'

const { slug } = Astro.params
const entry = await getEntry('songs', slug)
const { Content } = await render(entry)
---

<article>
  <Content
    components={{
      // 二级标题统一加应援色竖条（平台 UI 规范：用竖条替代圆点装饰）
      h2: ProseH2,
      // 引用块渲染成"歌词摘录"卡片
      blockquote: SongQuote,
    }}
  />
</article>
```

两层机制可以叠加使用：`components` 映射从外部替换元素实现，对 `.md` 与 `.mdx` 都有效；MDX 的文件内 import 则从内部精确引入。当两者冲突时，MDX 文件里显式 import 的组件优先——写文档的作者拥有最终决定权。平台的内容规范因此可以这样分工：`components` 映射负责"全站一致性"（标题、引用、表格），MDX 文件内 import 负责"这一篇的特殊内容"（谱面组件、投票组件）。

映射的能力边界也有必要说清：`components` 只能替换**渲染出的 HTML 元素**（h2、blockquote、a 等标准标签），不能替换 frontmatter 渲染流程，也不能拦截自定义组件。另外，映射函数接收的 Props 里 `children` 是已经渲染好的内容片段，所以 SongQuote 这类包装组件只做"加壳"（套上边框、应援色竖条），不应对 children 做解析改造——想在内容层面做深度处理，那是 remark/rehype 插件的职责。

## 4. 常用官方集成选型

官方集成生态覆盖了内容站的高频需求，选型可以按"什么时候需要"排列：

| 集成 | 解决什么 | 引入时机 |
| --- | --- | --- |
| @astrojs/mdx | 文档内混排组件 | 开始写教程、评测类长文时 |
| @astrojs/sitemap | 构建期生成 sitemap-index.xml | 上线前，需先配置 site |
| @astrojs/react / vue / svelte | 提供对应框架的岛屿支持 | 第一个交互岛屿出现时（006 篇已展开） |
| @astrojs/partytown | 把第三方脚本挪进 Web Worker | 统计、客服脚本拖慢主线程时 |
| @astrojs/rss | 生成 RSS 订阅源 | 提供"歌单周报"订阅时 |

两条经验：一是**按需引入**，集成本身零成本，但每多一个集成就多一分配置面，用不到的能力不要预装；二是**官网集成列表是第一入口**，官方集成遵循统一约定（`astro add` 可装、配置可序列化），优先于社区方案。平台站的典型组合是 mdx + sitemap + 一个框架集成，再按需加 rss。

引入与移除都要留痕。移除集成时 `npx astro remove sitemap`（或手动删包并从 integrations 数组移除），随后务必跑一次构建确认没有代码引用它的产物；反过来，升级集成大版本前先看变更日志里钩子签名的变化——集成运行在构建期，坏掉的钩子往往表现为构建报错而不是页面异常，报错栈里会直接给出集成名，定位成本很低。

集成还能组合出站点的"工程基建"：sitemap 负责搜索引擎入口，rss 负责订阅入口，两者都是构建期产物，部署成静态文件即可，不需要运行时参与。理解了这一点，就可以把"站点有哪些构建期产物"当成部署清单来核对：HTML 页面、`_astro` 资源目录、`sitemap-index.xml`、`rss.xml`——上线前逐项确认，少一个文件就是一次线上事故。

版本与 Astro 主版本的对齐也要留意：官方集成与 Astro 核心同步发版，大版本号尽量保持一致，混用新旧版本最常见的症状是构建期钩子参数缺失报错。锁定依赖时把集成与 astro 核心写进同一组升级变更里，避免只升一半。

## 5. 集成配置传参

集成工厂函数接受参数，写进 `integrations` 数组即可。以最常用的两个为例：

```javascript
// astro.config.mjs：给集成传参
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import remarkMath from 'remark-math'

export default defineConfig({
  site: 'https://fandex-music.example.com',
  integrations: [
    mdx({
      // MDX 默认继承全局 markdown 配置（含 remarkPlugins、shiki 主题等）；
      // 设为 false 可以完全另起一套
      extendMarkdownConfig: true,
      remarkPlugins: [remarkMath], // 让教程里的公式渲染成数学排版
    }),
    sitemap({
      // 后台页不进 sitemap
      filter: (page) => !page.includes('/admin/'),
      serialize(item) {
        // 歌曲页每周更新，给搜索引擎一个抓取节奏提示
        if (item.url.includes('/songs/')) item.changefreq = 'weekly'
        return item
      },
    }),
  ],
})
```

关于传参有三个值得记住的细节。其一，`extendMarkdownConfig` 的默认值是 `true`，这意味着全局 `markdown` 配置里加的 remark/rehype 插件会自动作用于 MDX——反过来想让 MDX 独享某个插件，就写进 `mdx({...})` 而不是全局配置。其二，`integrations` 数组**顺序有意义**：多数集成互不依赖时顺序无所谓，但涉及"后处理产物"的集成（如压缩类）应放在靠后位置。其三，同一个集成写两次会被按 `name` 合并而非报错，排查"配置怎么没生效"时先检查是不是重复添加被合并了。

语法高亮是另一个常被传参的配置项。MDX 继承全局 markdown 配置时，代码块由内置的 Shiki 渲染，主题与语言都在全局 `markdown.shikiConfig` 里指定；某篇教程需要不同的高亮主题时，不必打开 `extendMarkdownConfig: false` 整套重配——Shiki 支持双主题（亮暗各一）与 transformers 扩展，在全局配一次即可覆盖大多数需求。改完全局高亮配置后，旧页面的代码块不会自动变样，记得清一次缓存再构建。

传参之外，给集成加调试输出也有固定做法：自研集成直接在钩子里 `console.log`——构建期日志只打在终端，不会污染浏览器控制台，放心输出；多数官方集成则在 README 里写明了调试环境变量与日志开关。给自研集成统一加一个 `debug` 选项，打开后打印"处理了哪些文件、注入了什么"，是排障成本最低的提前投资。

## 易错点与最佳实践

1. **MDX 正文直接写 `{` 与 `<`**。它们是表达式与标签的起始字符，直接写会报语法错误：

   ```mdx
   <!-- 错误：{count} 会被当作表达式求值 -->
   应援棒举 {count} 次
   ```

   修正：改写为 `应援棒举 {'{'}count{'}'} 次`，或放入行内代码 `` `{count}` ``。

2. **MDX 里使用未导入的组件**。与普通 Markdown 不同，MDX 不享受页面作用域，文件里没 import 的组件直接抛 ReferenceError。修正：在每个用到组件的 `.mdx` 顶部显式 import。

3. **sitemap 装了却没产物**。90% 的原因是没在配置里设置 `site`。修正：`site: 'https://你的域名'`，构建后检查 `dist/sitemap-index.xml`。

4. **期望 components 映射改写 MDX 内 import 的组件**。文件内 import 优先级更高，映射不生效。修正：要么删掉文件内 import 交给全站映射，要么接受该文档的特殊化。

5. **把大量逻辑塞进集成钩子**。集成是构建期能力，运行时逻辑（请求处理、数据读写）应放在中间件、端点或 Actions（见 010 与 015 篇）。发现自己在 `astro:config:setup` 里写业务，方向就错了。

## 本篇小结

1. 集成是构建期的"功能插槽"：工厂函数返回带钩子的对象，`astro add` 一步完成装包、注册与生成配置。
2. MDX 在 Markdown 之上加了 import 与组件语法，`.mdx` 文件照常进内容集合、照常有 frontmatter 校验，代价是 `{` 与 `<` 变成语法字符。
3. `components` 映射从外部统一替换元素渲染，与 MDX 文件内 import 叠加时后者优先；全站一致性与单篇特殊性由此分工。
4. 官方集成按需引入：内容写作选 mdx，上线配 sitemap，交互岛屿配框架集成，第三方脚本慢配 partytown。
5. 集成传参写进 `integrations` 数组；`extendMarkdownConfig` 决定 MDX 是否继承全局 markdown 配置，数组顺序与重复添加的合并行为都需留意。

## 动手实践

1. **接入 MDX 并混排**：把 005 篇的歌曲集合升级为 MDX，在一篇听歌笔记里嵌入 SongCard 组件，再故意在正文写一个未 import 的组件名，观察报错信息。提示：报错会指向 MDX 文件行号，养成先看构建日志的习惯。
2. **全站引用块皮肤**：用 `components` 映射把所有 `blockquote` 渲染成带应援色竖条的"歌词摘录"卡片，验证对 `.md` 生效、对文件内自定义的 `.mdx` 不生效。提示：SongQuote 接收的 children 是渲染后的内容。
3. **上线三件套**：为平台配置 mdx、sitemap、rss 三个集成，给 sitemap 加 filter 排除 `/admin/` 路径。提示：先补 `site` 字段，再构建检查 `dist` 下的产物文件名。
