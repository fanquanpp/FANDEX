---
order: 140
title: Vite 插件开发：钩子体系与虚拟模块
module: 'vite'
category: 前端技术
difficulty: advanced
description: 以歌单数据与自创歌词格式为素材，端到端实现虚拟模块插件、transform 编译器与 dev 期 HMR 联动。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'vite/008-PluginSystem'
  - 'vite/006-DevServerHMR'
  - 'vite/009-Vite8Rolldown'
prerequisites:
  - 'vite/008-PluginSystem'
  - 'vite/003-ConfigFile'
---

## 前置知识

- [Vite 插件系统](/vite/008-PluginSystem)：已了解插件对象结构、钩子分类与 `enforce` / `apply` 顺序控制，本文在其基础上做端到端实战。
- [Vite 配置文件](/vite/003-ConfigFile)：会在 `vite.config.ts` 中注册插件并读取配置。
- [Vite 开发服务器与 HMR](/vite/006-DevServerHMR)：理解模块图与热更新边界，本文的 `handleHotUpdate` 会直接操作它们。

## 学习目标

1. 能独立实现一个虚拟模块插件：用 `resolveId` 注册虚构模块 ID，用 `load` 返回其内容。
2. 能编写 `transform` 钩子把自定义文件格式编译成 JavaScript 模块，并正确处理过滤与 sourcemap。
3. 能用 `configResolved` 保存最终配置，用插件 `api` 属性暴露能力给其他插件调用。
4. 能通过 `configureServer` 添加仅开发期可用的接口，用 `handleHotUpdate` 让数据文件变更时正确热更新虚拟模块。
5. 能用 vite-plugin-inspect 与 Vitest 调试、测试插件，并按社区约定命名发布。

## 1. 一个真实需求：歌单数据不该被复制三份

设想"虚拟歌手音乐平台"的首页要渲染本周歌单：歌曲名、P主、应援色都维护在 `src/data/setlist.json` 里。痛点来了——除了首页，播放器岛屿和"应援色主题"插件都需要同一份数据；如果各自 `import` 同一个 JSON 问题还不大，但需求很快变成：歌单要按 P主 分组、要过滤未上架歌曲、还要在构建期做一次播放量排序。这些逻辑写进每个组件就是三份复制。

插件给出的答案是**虚拟模块**（virtual module）：定义一个并不存在于磁盘的模块 ID（比如 `virtual:concert-setlist`），任何代码都可以 `import` 它；插件在构建管线里"凭空"生成这个模块的内容。数据加工逻辑只写一次、在插件里，消费方拿到的永远是加工好的成品。

这不是冷门技巧，而是 Vite 生态的常用构件：SVG 精灵图插件把整个目录的图标聚合成一个虚拟模块，i18n 插件把语言包文件汇编成虚拟模块，各类"约定路由"框架用虚拟模块暴露路由表。它们解决的都是同一类问题——**把"文件系统里的分散数据"包装成"一个普通的可导入模块"**。学会识别这种需求形态（多份数据、多处消费、构建期加工），你会在自己的工程里不断发现虚拟模块的用武之地。

## 2. 虚拟模块：resolveId 与 load 双钩子

虚拟模块由两个钩子协作完成：`resolveId` 负责"认领"这个 ID（告诉 Vite：这个模块归我），`load` 负责"供货"（返回模块源码）。

```typescript
// plugins/setlist.ts：虚拟模块插件
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

// 约定：虚拟模块 ID 用 \0 前缀，与磁盘模块和 npm 包区分开
const VIRTUAL_ID = 'virtual:concert-setlist'
const RESOLVED_ID = '\0' + VIRTUAL_ID

export function setlistPlugin(): Plugin {
  let root = ''

  // 读取最终配置：拿到项目根目录，供 load 阶段定位数据文件
  return {
    name: 'vocalive:setlist',
    configResolved(config) {
      root = config.root
    },
    // 认领模块 ID：只拦 virtual:concert-setlist，其余交给默认解析
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    // 供货：读取 JSON，加工成 JS 模块源码返回
    load(id) {
      if (id !== RESOLVED_ID) return
      const raw = JSON.parse(
        readFileSync(resolve(root, 'src/data/setlist.json'), 'utf-8'),
      ) as Song[]
      const onShelf = raw.filter((s) => !s.draft).sort((a, b) => b.plays - a.plays)
      // 以 ES 模块形式导出：默认导出数组，命名导出按 P主 分组的索引
      return {
        code: `export const songs = ${JSON.stringify(onShelf)};

export const byProducer = songs.reduce((map, song) => {
  (map[song.producer] ??= []).push(song);
  return map;
}, {});

export default songs;`,
        map: null, // 数据文件无需 sourcemap
      }
    },
  }
}

interface Song {
  name: string
  producer: string
  themeColor: string
  plays: number
  draft?: boolean
}
```

```typescript
// vite.config.ts：注册插件
import { defineConfig } from 'vite'
import { setlistPlugin } from './plugins/setlist'

export default defineConfig({
  plugins: [setlistPlugin()],
})
```

```ts
// src/pages/Home.tsx：消费虚拟模块，像 import 普通模块一样自然
import songs from 'virtual:concert-setlist'

export function HotSongs() {
  return (
    <ul>
      {/* 已在插件里过滤草稿并按播放量降序，组件只管渲染 */}
      {songs.slice(0, 10).map((song) => (
        <li key={song.name} style={{ borderLeft: `3px solid ${song.themeColor}` }}>
          {song.name} - {song.producer}
        </li>
      ))}
    </ul>
  )
}
```

`\0` 前缀不是可有可无的装饰：它是生态约定，表示"这是内存中的模块"，防止被其他插件（尤其处理磁盘文件的）误伤，也让 Vite 在生成产物命名时正确处理。此外还要给 TypeScript 补一个声明，否则消费方会在类型检查时失败：在 `src/vite-env.d.ts` 中加 `declare module 'virtual:concert-setlist' { const songs: Song[]; export default songs; }`。

`load` 与 `resolveId` 的配合还有一个值得点破的细节：`resolveId` 收到的 `id` 是"用户写的导入说明符"（如 `virtual:concert-setlist`），而 `load` 收到的是解析后的最终 ID（带 `\0` 前缀）。两钩子各自做一次精确比对，中间那次"转换"正是插件声明所有权的过程。调试这类插件时，在 `resolveId` 里 `console.log` 原始 id、在 `load` 里打印收到的 id，两行日志就能定位九成"模块找不到"的问题——不匹配几乎总是前缀或大小写写岔了。

## 3. transform：把自定义歌词格式编译成模块

`load` 生成完整模块，`transform` 则对**经过的每个模块**做加工——这正是编译自定义文件格式的入口。假设平台设计了 `.vlyric` 歌词格式：纯文本，每行 `毫秒数|歌词`，供滚动歌词组件消费。

```typescript
// plugins/vlyric.ts：自定义格式编译插件
import type { Plugin } from 'vite'

// 只处理 .vlyric 文件：过滤放在 transform 最前面，避免无谓开销
const VLYRIC_RE = /\.vlyric$/

export function vlyricPlugin(): Plugin {
  return {
    name: 'vocalive:vlyric',
    transform(code, id) {
      if (!VLYRIC_RE.test(id)) return // 返回 undefined 表示本插件不动这个模块

      // 逐行解析 "毫秒数|歌词"，容错跳过空行与注释
      const lines: { t: number; text: string }[] = []
      for (const line of code.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const [ms, ...rest] = trimmed.split('|')
        lines.push({ t: Number(ms), text: rest.join('|') })
      }

      return {
        code: `export const lyrics = ${JSON.stringify(lines)};

export function seek(currentMs) {
  // 二分查找当前时间对应的歌词行
  let lo = 0, hi = lyrics.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1;
    if (lyrics[mid].t <= currentMs) lo = mid; else hi = mid - 1; }
  return lyrics[lo] ?? null;
}`,
        map: null, // 生产级插件应返回真实 sourcemap
      }
    },
  }
}
```

使用处毫无特殊感：`import { seek } from './senbonzakura.vlyric'`。三个工程要点：其一，**过滤必须前置**——`transform` 会被成百上千个模块调用，先用正则短路能省下绝大部分开销；Vite 8 / Rolldown 还支持声明式 `filter` 属性，把过滤下沉到原生层进一步提速（见 009 篇）。其二，`return undefined` 与 `return null` 是"不处理"，与返回空 `code` 完全不同，别把整条链路拦断。其三，返回 `map: null` 会破坏下游插件的 sourcemap 链，发布级插件请用 `magic-string` 等库生成真实 map。

设计一个自定义格式时，还有一个边界问题要提前想清楚：**这个格式与标准模块系统如何互操作**。`.vlyric` 的答案很顺——它编译成 ES 模块后，可以被任何 JS 文件导入、可以参与摇树、可以被打包拆分，因为它"变成"了标准模块。但如果格式里允许 `import` 其他文件（比如歌词引用另一首的副歌），你的编译器就要负责改写这些导入并返回正确的模块依赖信息，复杂度陡增。经验法则是：自定义格式保持"叶子节点"（不含导入），把组合关系留在 JS 层，插件的复杂度就能维持在一个下午能读完的水平。

## 4. 插件状态与插件间协作

插件是普通对象，闭包里的变量就是它的"私有状态"；钩子在不同时机读写的正是这份状态。两条实用模式：

```typescript
// plugins/annotator.ts：跨钩子状态与插件间 API
import type { Plugin } from 'vite'

export function annotatorPlugin(): Plugin {
  // 私有状态：记录构建期收集到的所有歌曲标题
  const collected = new Set<string>()
  let isBuild = false

  const plugin: Plugin = {
    name: 'vocalive:annotator',
    configResolved(config) {
      // configResolved 钩子拿到的是最终配置：在这里区分 serve 与 build 端
      isBuild = config.build.ssr === true
    },
    transform(code, id) {
      // 只关注歌单相关的模块，其余一律放行
      if (id.includes('setlist')) {
        // 演示性质的收集逻辑：真实插件可在此做标签提取
        for (const m of code.matchAll(/"name":"([^"]+)"/g)) collected.add(m[1])
      }
      return null // 返回 null 表示本插件不修改该模块
    },
    buildEnd() {
      console.log(`[annotator] 共收集歌曲标题 ${collected.size} 个（${isBuild ? 'SSR' : '客户端'}端）`)
    },
  }

  return Object.assign(plugin, {
    // api 属性：暴露给其他插件调用的能力面
    api: {
      getTitles: () => [...collected],
    },
  })
}

// 另一个插件读取它：
// const titles = otherPlugin.api?.getTitles?.()
```

钩子执行顺序的规则（同钩子按数组顺序、`enforce` 分层）在 008 篇已系统讲过，这里只强调实战结论：**有依赖关系的插件，调用方排在被调方之后**；如果发现顺序敏感，把"读数据"挪到 `configResolved` / `buildStart` 这类早期钩子完成，把"用数据"留在 `transform` / `generateBundle`，能大幅降低对顺序的敏感度。

`api` 属性的用法再往前推一步就是插件生态的分工模式：一个插件专职"采集"（扫描全站模块、汇总信息），一批插件专职"消费"（生成报告、注入产物、输出断言）。采集方通过 `api` 暴露稳定接口，消费方在 `buildStart` 后读取——这种解耦让你可以单独替换采集实现而不动消费方。写 `api` 时给它配一份类型声明（`export interface AnnotatorApi { getTitles(): string[] }`），其他插件作者拿到类型就知道能力边界，这比文档里的形容词有效得多。

## 5. 区分 serve 与 build：dev 接口与 HMR 联动

虚拟模块有个致命细节：数据文件 `setlist.json` 变了，Vite 不知道要失效 `virtual:concert-setlist`——它只监听被 import 的磁盘文件。`handleHotUpdate` 负责补上这条"失效链"。顺手用 `configureServer` 加一个仅开发期存在的接口，模拟"正在播放"推送。

```typescript
// plugins/setlist.ts（追加到插件对象内）
import type { ModuleNode, ViteDevServer } from 'vite'

{
  name: 'vocalive:setlist',
  // 仅开发期执行：注册一个 dev 专用接口
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/api/now-playing', (_req, res) => {
      // 开发期模拟：生产环境该接口由后端网关提供
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ song: '千本樱', singer: '初音未来', themeColor: '#39C5BB' }))
    })
  },
  // 数据文件变更时：让虚拟模块热更新
  handleHotUpdate({ file, server, modules }) {
    if (!file.endsWith('setlist.json')) return
    // 找到消费虚拟模块的模块节点，让 Vite 使它们失效并推送更新
    const virtualModule = server.moduleGraph.getModuleById('\0virtual:concert-setlist')
    const affected = virtualModule ? [...modules, virtualModule] : modules
    return affected // 返回数组 = 交给 Vite 按常规 HMR 处理
  },
}
```

`configureServer` 里的中间件挂载在内部中间件**之前**执行，适合做 mock 接口；若需要排在后面（例如先让 Vite 处理静态资源），用返回函数的写法 `configureServer(server) { return () => { /* 后置 */ } }`。`handleHotUpdate` 返回模块数组表示"这些模块失效了，推送更新"；如果什么都不返回，Vite 会按默认规则处理——对虚拟模块来说默认规则是"无动于衷"，所以这一步不能省。

热更新最终推给浏览器的是"模块级替换"还是"整页刷新"，取决于失效模块是否接受更新：虚拟模块的下游组件若没有热边界（比如普通 React 组件没接 Fast Refresh），Vite 会自动退化为整页刷新。这在开发体验上完全可以接受，但如果你想精细控制（比如数据变更只更新列表而不闪屏），可以在虚拟模块的 `load` 输出末尾追加 `import.meta.hot.accept(...)` 自定义更新逻辑。先让默认行为工作，再谈精细控制——热更新的调试成本高，永远小步验证。

## 6. 调试、测试与发布

调试首选 **vite-plugin-inspect**：注册后访问 `/_inspect` 面板，能看到每个模块被哪些插件按什么顺序改写、每一步 diff 是什么。虚拟模块问题九成出在 `resolveId` 没认领或 ID 大小写/前缀不一致，在 inspect 里一眼可见。

单元测试可以直接起一个内存 Vite 服务来验证插件行为：

```typescript
// plugins/setlist.test.ts：用 Vitest 验证虚拟模块输出
import { expect, test } from 'vitest'
import { createServer } from 'vite'
import { setlistPlugin } from './setlist'

test('虚拟模块导出过滤后的歌单', async () => {
  const server = await createServer({
    root: './fixtures/demo-project', // 准备一个最小 fixture 项目
    plugins: [setlistPlugin()],
    server: { middlewareMode: true },
    logLevel: 'error',
  })
  // 直接向模块图请求虚拟模块的转换结果
  const mod = await server.ssrLoadModule('virtual:concert-setlist')
  expect(mod.songs.length).toBeGreaterThan(0)
  // 草稿歌曲已被过滤
  expect(mod.songs.every((s: { draft?: boolean }) => !s.draft)).toBe(true)
  await server.close()
})
```

发布遵循社区命名约定：Vite 专属插件用 `vite-plugin-` 前缀（如 `vite-plugin-setlist`），支持多打包器（unplugin）则用 `unplugin-` 前缀；`peerDependencies` 声明 `vite`，入口同时提供默认导出的工厂函数与类型声明。仓库 README 里放一个"5 行接入"示例——评价一个插件好不好用，接入行数是最诚实的指标。

工程化收尾还有三件事值得在 1.0 版本前做完：其一，插件参数要收敛成一个带默认值的选项对象（工厂函数 `setlistPlugin({ dataFile } = {})`），从第一天就别用位置参数；其二，把"开发期行为"与"构建期行为"各写一条冒烟测试（分别 `createServer` 与 `build`），CI 里两条都要跑——大量插件 bug 只在其中一半生命周期出现；其三，版本发布前跑一遍 `publint` 类工具检查包的 exports 字段与类型入口，现代打包器对包结构的解析越来越严格，早检查早省事。

## 易错点与最佳实践

1. **虚拟模块忘了 `\0` 前缀**：可能与真实文件同名冲突，也会被其他磁盘文件类插件误处理。认领与消费两端用同一常量，杜绝手写字符串。
2. **transform 全量扫描**：不加过滤的 `transform` 让每个模块都跑一遍解析，dev 启动明显变慢。正则前置判断，或使用 Vite 8 的声明式 `filter`。
3. **返回 `map: null` 破坏调试**：源码被改写却没给 sourcemap，浏览器报错的行号全部错位。改写源码的插件务必生成 map。
4. **数据文件变更不热更新**：虚拟模块不在文件监听范围内，必须用 `handleHotUpdate` 显式失效，并返回受影响的模块数组。
5. **钩子里做重 IO**：`load` / `transform` 是高频路径，读文件要缓存结果（用模块 ID 做 key），大 JSON 解析放到 `buildStart` 一次完成。

## 本篇小结

1. 虚拟模块 = `resolveId` 认领虚构 ID + `load` 供货，`\0` 前缀是身份标识，让"数据加工逻辑只写一次"成为可能。
2. `transform` 是自定义格式编译的入口，过滤前置、谨慎返回、sourcemap 必须真实。
3. 插件状态放在闭包里，`configResolved` 保存最终配置，`api` 属性构成插件间的公开接口。
4. `configureServer` 提供 dev 专用中间件，`handleHotUpdate` 打通数据文件到虚拟模块的失效链。
5. 用 vite-plugin-inspect 观察管线、用 Vitest 起内存服务测插件，按 `vite-plugin-` 约定发布。

## 动手实践

1. **给歌单加"新歌标记"**：扩展 `virtual:concert-setlist`，新增命名导出 `newSongs`（发布时间在 14 天内的歌曲），并补上类型声明。提示：比较 `plays` 字段的位置即可复用现有插件骨架。
2. **编译 `.vlyric` 完整版**：给 vlyric 插件增加校验——毫秒数必须递增，否则抛出带行号的错误信息，阻止构建继续。提示：在 `transform` 中 throw，Vite 会把它呈现在 dev 覆盖层与构建错误里。
3. **联调 HMR**：把 setlist 插件跑起来，修改 `setlist.json` 中的应援色，观察首页在不刷新的情况下变色；然后注释掉 `handleHotUpdate` 再试一次，解释现象。提示：inspect 面板中查看 `virtual:concert-setlist` 的失效记录。
