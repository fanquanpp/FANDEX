# Vitest 测试集成

Vitest 的定位一句话可以说清：**用 Vite 的管线跑测试**。你的项目已经为 dev 与 build 配好的别名、插件、环境变量，测试时原样生效，不再需要为 Jest 单独维护一套转译配置。本篇从安装配置讲起，覆盖断言、mock、DOM 测试与覆盖率，最后给出从 Jest 迁移的对照表。

## 前置知识

- [Vite 环境变量与模式](/vite/010-ViteEnvModes)：测试模式与 import.meta.env 的关系。
- [Vite 配置文件](/vite/003-ConfigFile)：Vitest 配置是对 Vite 配置的扩展与合并。
- [Vite 构建与产物拆分](/vite/007-BuildSplit)：理解源码如何被转换，才能理解测试为何无需额外配置。

## 学习目标

1. 能安装并配置 Vitest，让测试与构建共享同一份 Vite 配置。
2. 能用 describe / it / expect 编写同步与异步测试。
3. 能用 vi.fn / vi.mock / vi.spyOn 替换外部依赖，并为 DOM 测试切换 jsdom 环境。
4. 能生成覆盖率报告并设置阈值门禁。
5. 能列出 Jest 与 Vitest 的关键差异，评估迁移成本。

## 1. 安装与配置：测试和构建共用一份管线

安装 Vitest（DOM 测试顺带装上 jsdom）：

```bash
pnpm add -D vitest jsdom
```

推荐单独建一个 `vitest.config.ts`，用 `mergeConfig` 显式合并 `vite.config.ts`——测试关心的东西（插件、别名）来自 Vite 配置，测试特有的东西（environment、include）写在这里：

```typescript
// vitest.config.ts：单独文件，显式合并 Vite 配置
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',   // 默认 node；DOM 测试见第 3 节
      globals: false,        // 显式 import describe/it，利于类型检查
      include: ['src/**/*.test.ts'],
    },
  }),
)
```

如果项目很简单，也可以直接在 `vite.config.ts` 里加 `test` 字段，但要在文件顶部加一行三斜线指令让 TypeScript 认识 `test` 属性：`/// <reference types="vitest/config" />`。脚本配置如下：

```bash
# package.json scripts
"test": "vitest run",          # 单次运行，CI 用
"test:watch": "vitest",        # 监听模式：只重跑受改动影响的用例
"test:coverage": "vitest run --coverage"
```

监听模式值得一提：它复用 Vite 的模块图做依赖追踪，只重新执行受影响文件的测试，比传统全量轮询快得多——这就是"同源管线"直接兑换的红利。

大型仓库里还有一层组织问题：monorepo 多个包都要跑测试时，用 `projects` 选项声明多个测试项目，每个项目继承不同的 environment 与 include——业务包用 node，组件库用 jsdom，一次 `vitest run` 全部覆盖。单个项目内则遵守"测试文件与被测文件同目录"的约定，`src/lib/queue.ts` 对应 `src/lib/queue.test.ts`，重构移动文件时测试不会被落下。

安装完成后先跑一条最小用例验证管线（`expect(1 + 1).toBe(2)`），比直接开写业务测试更稳妥：它能确认配置合并、别名解析、监听模式都正常，把环境问题隔离在业务代码之外。

类型层面还有一层保障：`vitest/config` 导出的 defineConfig 带有 test 字段的完整类型，配置写错（如 environment 拼错）会直接标红；把 include 精确到目录而不是全局 `**`，能避免把构建产物或依赖里的文件误当成测试跑出来。

## 2. 断言与异步测试

以点歌队列为例，覆盖同步断言与异步断言两种形态：

```typescript
// src/lib/queue.test.ts：点歌队列业务测试
import { describe, expect, it } from 'vitest'
import { enqueue, getQueue } from './queue'

describe('点歌队列', () => {
  it('先点先唱：按提交顺序排列', async () => {
    await enqueue('senbonzakura', 'fan-a')
    await enqueue('melt', 'fan-b')
    const names = (await getQueue()).map((s) => s.songId)
    expect(names).toEqual(['senbonzakura', 'melt']) // toEqual 做深度比较
  })

  it('重复点歌被拒绝并带原因', async () => {
    await enqueue('senbonzakura', 'fan-a')
    // rejects 断言异步函数抛错，toThrow 校验错误信息
    await expect(enqueue('senbonzakura', 'fan-b')).rejects.toThrow('已被点过')
  })
})
```

常用断言速览：`toBe`（原始值与引用）、`toEqual`（深度相等）、`toContain`（包含成员）、`toHaveLength`、`toThrow`。异步测试的两条路线：被测函数本身是 Promise 就 `await` 它；断言"最终会变成某个值"用 `await expect.poll(() => getStatus()).toBe('ready')`——`poll` 会按间隔反复求值直到满足或超时，适合轮询场景。 Vitest 3 起还内置了 `expect.soft`（软断言，收集全部失败而不是遇错即停），批量校验字段时很省事。

`poll` 补个具体例子：余量轮询场景里，`await expect.poll(async () => getStock('stand-s')).toBeLessThan(20)` 会在时限内反复求值直到满足或超时，比手写 sleep 循环稳定得多。

用例的可读性还有两条纪律。一是命名说"业务结果"而不是"代码动作"：写"重复点歌被拒绝并带原因"，不写"enqueue 第二次应抛错"——测试失败时，读用例名就知道哪条业务规则坏了。二是结构遵循准备、动作、断言三段式，一个用例只验证一条规则；把十条断言塞进一个用例的做法，会让失败信息失去定位价值——第一个断言失败后，后面的规则根本没被验证。

异步测试还有一种反模式值得点名：用 setTimeout 延时后断言来"等"异步完成，用例又慢又脆。正确姿势是被测函数返回 Promise 就 await；逻辑藏在回调里，就把它包成 Promise 或用 `vi.waitFor`（轮询等待条件满足）。让"等待"成为显式声明，而不是时间魔法。断言失败时的输出自带 diff，定位直观；`retry` 选项只对集成型用例开启（如 `retry: 1` 处理偶发抖动），单测禁用——用例持续抖动时不要靠重试掩盖，先找出共享状态、时间依赖这类不稳定因素。

## 3. mock 与 jsdom：替身与环境

单测的原则是隔离：点歌队列不该依赖真网络，DOM 测试不该真开浏览器。两类工具分别解决。

**mock 替换模块与函数**：

```typescript
// src/lib/playlist.test.ts：用 mock 隔离网络请求
import { describe, expect, it, vi } from 'vitest'

// vi.mock 会被提升到文件顶部执行，整个 ./http 模块被替换为替身
vi.mock('./http', () => ({ get: vi.fn() }))

import { get } from './http'
import { fetchFavoriteSongs } from './playlist'

describe('收藏歌单', () => {
  it('按应援色分组返回收藏歌曲', async () => {
    // 替身函数注入固定返回值，测试不真正发请求
    vi.mocked(get).mockResolvedValue([
      { name: '千本樱', themeColor: '#39C5BB' },
      { name: 'Melt', themeColor: '#39C5BB' },
      { name: 'God knows...', themeColor: '#FF66AA' },
    ])
    const groups = await fetchFavoriteSongs()
    expect(groups['#39C5BB']).toHaveLength(2)
    expect(get).toHaveBeenCalledTimes(1) // 还能校验调用行为
  })
})
```

**jsdom 提供浏览器环境**。Vitest 默认在 Node 里跑，没有 `document`。DOM 测试要么全局切换（`environment: 'jsdom'`），要么用文件首行注释按文件切换，推荐后者——纯逻辑测试继续留在轻快的 node 环境：

```typescript
// @vitest-environment jsdom
// src/components/PlayerControls.test.ts：渲染层面的行为测试
import { expect, it } from 'vitest'
import { createPlayButton } from './PlayerControls'

it('播放中按钮文案切换为暂停并带激活样式', () => {
  const btn = createPlayButton()
  document.body.append(btn)
  btn.click() // jsdom 会触发真实的事件监听器
  expect(btn.textContent).toBe('暂停')
  expect(btn.classList.contains('is-playing')).toBe(true)
})
```

`happy-dom` 是 jsdom 的轻量替代，速度更快但兼容面略窄；常规项目二选一即可，不必同时引入。

mock 的第三种形态是 `vi.spyOn`：不整体替换模块，而是"监听"某个对象上的既有方法，可保留原实现、也可用 `mockImplementation` 覆盖。它最适合验证"交互行为"——比如点击播放按钮后是否调用了播放器的 `play` 方法，用 spy 断言调用参数与次数，比断言 DOM 状态更贴近意图。三种形态的选择顺序：优先 spyOn（侵入最小），模块级依赖用 vi.mock，凭空造的回调用 vi.fn。

mock 粒度也有讲究：优先 mock 自己的边界模块（http、存储），而不是深层第三方库——前者是平台的稳定契约，替换后语义仍清晰；后者版本一升级，mock 结构全要跟着改。发现 mock 代码比业务代码还长时，通常是模块边界没切好，先重构再测试。

## 4. 覆盖率报告：让核心逻辑不许裸奔

覆盖率回答一个朴素的问题：改了这些代码，有没有测试护着。安装 V8 覆盖率扩展并在配置里声明策略：

```bash
pnpm add -D @vitest/coverage-v8
```

```typescript
// vitest.config.ts（追加 test.coverage 段）
test: {
  coverage: {
    provider: 'v8',            // 基于 V8 引擎，快；istanbul 兼容面更广
    include: ['src/lib/**', 'src/components/**'],
    exclude: ['src/**/*.test.ts', 'src/main.ts'],
    thresholds: { lines: 70, branches: 60 }, // 低于阈值测试直接失败
    reporter: ['text', 'html'],
  },
}
```

策略比数字重要。`include` 圈出"必须护住"的范围（票务、点歌这类业务核心），`exclude` 排除入口文件与测试自身；阈值定得现实一些（核心模块 70 行、60 分支比全仓库 100% 有意义得多）。`pnpm test:coverage` 后终端输出每个文件的三列数字，`html` 报告输出到 `coverage/` 目录，浏览器打开可以看到逐行高亮——**绿色是护住的，红色是裸奔的**，比任何百分比都直观。

覆盖率报告在 CI 里还可以再进一步：把文本摘要打进 PR 评论，阈值跌破直接标红；报告产物用构建工件归档，评审时能逐行点开看。要提醒的是覆盖率是"下限指标"——它证明跑过的分支没错，不能证明漏写的场景存在，阈值之外仍靠评审守住"新功能必须带测试"的纪律。

分支覆盖（branches）值得单独盯着：行覆盖高但分支低，往往意味着"错误路径没测"——队列满、参数非法、网络失败这些 if 的另一半没被走到。把核心函数的失败分支列成清单再写用例，比盯着百分比凑数更能提升真实质量。阈值数字记得同步到 README，让它是"团队共识"而不是某个人的配置。

## 5. 与 Jest 迁移对比

| 维度 | Jest | Vitest |
| --- | --- | --- |
| 与 Vite 配置的关系 | 需另行配置转换器、别名 | 原生共享同一份配置与插件 |
| ESM 支持 | 需要转换与开关组合 | 原生 ESM |
| 监听模式速度 | 自研依赖图，较慢 | 复用 Vite 模块图，增量快 |
| API | describe / it / expect | 同一套，几乎零成本 |
| mock | jest.mock（babel 插件提升） | vi.mock（原生提升） |
| 环境 | jsdom | jsdom / happy-dom / node |

测试代码层面的迁移成本极低：全局替换 `jest.` 前缀为 `vi.`，`jest.fn` 对应 `vi.fn`、`jest.spyOn` 对应 `vi.spyOn`、快照行为一致。真正的工作量在配置：Jest 的 `moduleNameMapper`、`transform`、`testEnvironment` 三大块，在 Vitest 里分别收敛为"共享的 vite.config 别名、无需转换、environment 字段"。如果项目已是 Vite + ESM，迁移通常是半天内的事；反过来，若 Jest 配置里堆满了自定义 transformer，则要逐一确认 Vitest 插件生态的等价物。判断标准：**Vite 项目默认选 Vitest，不为迁移而迁移**。

真要动手迁移时，按四步走可以把风险摊平：第一步全局把 `jest.` 前缀换成 `vi.` 并跑通单个文件；第二步在配置层用 mergeConfig 挂上别名与插件，替换 moduleNameMapper；第三步迁移 setup 文件与全局 mock；第四步在 CI 里并行跑两套测试一周，确认零失败后再移除 Jest。整个过程测试代码的改动通常很小，大部分时间花在配置对齐上——这也反过来印证了两者的同源程度。

两个生态里容易忽略的差异也列一下：快照文件与测试同目录的约定一致；setup 文件、覆盖率阈值等配置项命名几乎照搬。差异集中在"与构建器相关"的部分——这正是迁移项目里配置比代码先改完的原因，也是"同源管线"最有说服力的注脚。

最后一条团队约定：测试文件里不保留被跳过的用例（it.skip、条件跳过）——失败就修，修不了就在用例名里注明原因并用 `it.fails` 表达"预期失败"，让"跳过的测试"无处藏身。跳过是最容易被遗忘的债务，因为绿灯会掩盖一切。

## 易错点与最佳实践

1. **vi.mock 的提升陷阱**。`vi.mock` 调用会被提升到 import 之前，工厂函数里不能引用外部普通变量：

   ```typescript
   // 错误：工厂里引用了外部变量，提升后变量尚未初始化
   const fakeSongs = []
   vi.mock('./songStore', () => ({ list: () => fakeSongs }))
   ```

   修正：用 `vi.hoisted(() => [])` 创建同样被提升的数据，或在工厂内直接写死返回值。

2. **mock 状态在用例间泄漏**。第一个用例 `mockResolvedValue` 的返回值会延续到后面的用例。修正：配置里加 `test: { clearMocks: true }`，或在每个用例前 `vi.clearAllMocks()`；更彻底的做法是用 `mockResolvedValueOnce` 表达"只对本次生效"。

3. **忘了切换环境导致 document is not defined**。默认 node 环境没有 DOM。修正：文件首行加 `// @vitest-environment jsdom`，或在配置里针对目录用 `environmentMatchGlobs` 批量指定。

4. **覆盖率阈值定在错误的范围上**。把 `include` 留空时统计的是"所有被加载的文件"，入口文件的低覆盖会稀释数字。修正：显式圈定核心业务目录，排除样板代码后再谈阈值。

5. **用例之间共享可变单例**。第 2 节的队列如果是模块级单例，用例顺序变化会导致断言失败。修正：导出工厂函数 `createQueue()`，每个用例自建实例；坚持不了就在 `beforeEach` 里重建状态。

## 本篇小结

1. Vitest 用 `mergeConfig` 显式合并 Vite 配置，别名与插件零重复维护；监听模式复用 Vite 模块图，增量执行极快。
2. 断言覆盖同步（toBe / toEqual / toContain）与异步（rejects / poll）两类形态，`soft` 断言可批量收集失败。
3. `vi.mock` 替换模块、`vi.fn` 制造替身函数、`vi.spyOn` 监控已有方法；DOM 测试按文件切换 `@vitest-environment jsdom`。
4. 覆盖率先圈范围（include/exclude）再谈阈值，HTML 报告逐行高亮比百分比更有行动价值。
5. Vitest 与 Jest 的测试 API 几乎同构，迁移主要是配置工作；Vite 项目默认选 Vitest。

## 动手实践

1. **给点歌队列补测试**：为 `enqueue` 增加边界用例（队列满 20 首、空歌名），再实现"粉丝团团长可以插队"的新规则，保持测试先行。提示：先写 `expect(enqueue(...)).rejects.toThrow('队列已满')` 再改实现。
2. **mock 注水数据**：把 `fetchFavoriteSongs` 的数据源从 HTTP 换成本地 IndexedDB，验证只需改 `vi.mock` 的目标，测试主体一行不动。提示：体会 mock 让"数据源可替换"的价值。
3. **门禁落地**：为核心业务目录设置覆盖率阈值并接入 CI，故意删掉一条测试让阈值触发失败。提示：阈值失败时 Vitest 会列出未达标项，据此补测试而不是调低阈值。
