# 测试与调试

购票、下单这类功能写错一行，损失是真金白银。Astro 站点的质量保障由四层组成：Vitest 测纯逻辑与组件渲染、Playwright 测完整用户流程、`astro check` 做 `.astro` 文件的类型诊断、CI 把前两者固定成每次提交的门禁。本篇按"从快到慢"的顺序搭建这套体系，并穿插服务端渲染特有的调试技巧。

## 前置知识

- [Astro 表单与 Actions](/astro/010-AstroFormsActions)：本篇的测试对象主要是那里的购票逻辑。
- [Astro 岛屿与客户端组件](/astro/006-IslandsClientComponents)：组件测试需要区分服务端渲染与岛屿水合。
- [Astro 构建与部署](/astro/008-BuildDeploy)：CI 的最终门禁是构建，E2E 建议跑在 preview 产物上。

## 学习目标

1. 能配置 Vitest 并通过 `getViteConfig` 复用 Astro 的 Vite 能力。
2. 能为工具函数写单元测试，用容器 API 对 .astro 组件做渲染测试。
3. 能用 Playwright 编写并运行购票流程的端到端测试。
4. 能用 `astro check` 做 `.astro` 文件的类型检查，掌握服务端与浏览器两处的调试方法。
5. 能把 check、单元测试、构建、E2E 组织成一条 CI 流水线。

## 1. Vitest 环境配置：测试复用构建的管线

Vitest 与 Vite 同源，但 Astro 项目不能直接拿 `vite.config.ts` 跑测试——`astro:content`、`astro:actions` 这些模块别名是 Astro 注入的。官方给出的方案是用 `getViteConfig` 包装：

```bash
pnpm add -D vitest
```

```typescript
// vitest.config.ts：测试配置复用 Astro 的 Vite 能力
import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    environment: 'node', // 纯逻辑测试用 node；DOM 测试见后文 jsdom
    include: ['src/**/*.test.ts'],
    globals: false, // 显式 import describe/it，利于类型检查
  },
})
```

`getViteConfig` 做的事：把 Astro 的别名、插件、TypeScript 配置注入 Vitest，让测试文件里可以像页面代码一样 `import { getCollection } from 'astro:content'` 并获得完整类型。没有这层包装，测试会大量报"找不到模块"。配置好后加上脚本即可运行：

```bash
# package.json scripts
"test": "vitest run",        # 单次运行，CI 用
"test:watch": "vitest"       # 监听模式，本地开发用
```

这里补一个"为什么不能直接用 vite.config.ts"的深层原因：Astro 对 Vite 的扩展不只是加几个别名，还包括为 `astro:content`、`astro:actions` 这类虚拟模块注册真实的模块工厂——它们在页面构建时由 Astro 运行时提供实现。Vitest 拿到 `getViteConfig` 的产物后，测试文件里的 `import { getCollection } from 'astro:content'` 会命中同一份工厂，返回的是"测试期实现"（内容集合在测试里同样可读），而不是打包期内联的静态产物。理解这一点，就不会试图绕过包装手搓别名——那只会让虚拟模块全部解析失败。

## 2. 组件与工具函数测试

先测最便宜也最该多写的部分：工具函数。以票务价格逻辑为例：

```typescript
// src/lib/pricing.test.ts：票务价格工具测试
import { describe, expect, it } from 'vitest'
import { earlyBirdDiscount, formatPrice } from './pricing'

describe('票务价格工具', () => {
  it('输出带货币符号的价格字符串', () => {
    expect(formatPrice(680)).toBe('¥680')
  })

  it('早鸟折扣按比例计算', () => {
    expect(earlyBirdDiscount(680, 0.8)).toBe(544)
  })

  it('异常折扣率被收敛为原价', () => {
    expect(earlyBirdDiscount(680, 1.5)).toBe(680)
  })
})
```

`.astro` 组件是构建期函数，同样可以测——用 Astro 官方的容器 API 把它渲染成 HTML 字符串再断言：

```typescript
// src/components/TicketBadge.test.ts：Astro 组件渲染测试
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { expect, test } from 'vitest'
import TicketBadge from './TicketBadge.astro'

test('票档徽章渲染出票名与应援色', async () => {
  const container = await AstroContainer.create()
  const html = await container.renderToString(TicketBadge, {
    props: { ticket: { name: 'S 区站票', color: '#39C5BB' } },
  })
  expect(html).toContain('S 区站票')
  expect(html).toContain('#39C5BB')
})
```

边界要说清楚：容器 API 只渲染 `.astro` 组件本身（此时还没有浏览器），测的是"给定 Props 输出的 HTML"。React/Vue 岛屿的交互行为属于浏览器领域，要么用对应框架的测试库（如 Testing Library）单独测，要么交给下一节的 E2E。把"服务端渲染结果"与"浏览器行为"分开测，是 Astro 测试的第一条分界线。

渲染测试之外，内容集合驱动的数据函数也值得直接测。比如"按票档聚合订单"的工具函数吃的是集合条目数组，断言输入输出即可，不需要伪造网络层；这类测试跑得飞快，适合把领域规则（早鸟折扣收敛、余量下限）全部覆盖。配比上的参考：核心业务工具函数追求接近全覆盖，`.astro` 组件只测"给定 Props 输出的关键 HTML"，两者都不需要浏览器，CI 里秒级完成。

如果想测岛屿在浏览器里的行为而不起完整 E2E，可以按框架补齐测试层：React 组件用 @testing-library/react 配 jsdom，Svelte 用 @testing-library/svelte。测试环境里框架组件以"客户端形态"渲染，测的是交互逻辑而不是服务端 HTML——与容器 API 的渲染测试互为补充，使用时别拿错了对象。

组件测试的用例设计也有讲究：TicketBadge 这类纯展示组件测三种输入——常规值、缺省值、极端值（超长票名），断言不崩且关键文本有省略处理。展示组件的状态少，测试密度可以低；逻辑组件（表单块、订单摘要）才是重点，它们的 Props 组合直接决定页面正确性。

错误信息的断言也有价值：对"必须失败"的边界，用 `rejects.toThrow` 拿到错误消息片段做断言，比只断言"抛错了"更能锁住行为——错误文案也是契约的一部分，平台会把它展示给购票用户。

## 3. Playwright E2E：把购票流程完整演一遍

单元测试证明"零件没问题"，E2E 证明"整台机器能转"。购票流程横跨表单、Action、订单页，值得一条 E2E 兜底：

```bash
pnpm create playwright   # 生成 playwright.config.ts、e2e/ 目录与示例
```

```typescript
// playwright.config.ts：测试前自动拉起 Astro 站点
import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    // CI 里先 build 再 preview，测的是生产形态；本地可改用 pnpm dev
    command: 'pnpm build && pnpm preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
  },
  use: { baseURL: 'http://localhost:4321' },
  testDir: 'e2e',
})
```

```typescript
// e2e/ticket.spec.ts：购票流程端到端测试
import { expect, test } from '@playwright/test'

test('歌迷可以完成一张票的预订', async ({ page }) => {
  await page.goto('/concerts/magic-mirai-2026/ticket')

  await page.getByLabel('购票人').fill('初音厨')
  await page.getByLabel('票档').selectOption('stand-s')
  await page.getByRole('button', { name: '提交订单' }).click()

  // 提交成功后应跳转到订单页并显示待支付状态
  await expect(page).toHaveURL(/\/orders\//)
  await expect(page.getByText('待支付')).toBeVisible()
})

test('不填购票人提交时显示服务端错误', async ({ page }) => {
  await page.goto('/concerts/magic-mirai-2026/ticket')
  await page.getByRole('button', { name: '提交订单' }).click()
  // 渐进增强路径：禁用 JS 也能走到的服务端校验
  await expect(page.getByText('请填写购票人姓名')).toBeVisible()
})
```

用例按"用户可见行为"编写（`getByLabel`、`getByRole`），不依赖 CSS 类名——这样重构样式不会弄断测试。第二条用例特意覆盖了渐进增强路径，它验证的正是 010 篇强调的"服务端校验是安全边界"。

E2E 的层级配比也需要管理。经典的"测试金字塔"在 Astro 项目里同样成立：数量最多的是 Vitest 单测（毫秒级），其上是组件渲染测试（十毫秒级），E2E 最少但最接近真实（秒级起）。把 E2E 控制在关键路径（购票下单、登录、投稿提交）上，其余分支交给单测覆盖，CI 时长才能保持克制；发现 E2E 数量持续膨胀时，通常意味着有业务规则该下沉到单测层了。

Playwright 还有两件日常武器：trace（`pnpm exec playwright test --trace on`，失败后打开 trace viewer 逐步回放每个动作与网络请求）与多视口矩阵（在 `projects` 里声明桌面与手机两种 viewport），购票页在 375px 宽度下是否可用，一条配置就能纳入回归。

测试数据的管理同样有模式：E2E 优先使用"构建期可见"的种子内容（测试专用的内容集合条目），而不是在测试里登录后台造数——E2E 应该假设数据已就绪，只验证流程。确需动态数据时，把造数步骤封装进 fixture，用例之间不共享可变状态。

## 4. astro check 与调试技巧

`.astro` 文件的模板部分是 TypeScript 盲区，`tsc --noEmit` 覆盖不到。官方的补位工具是 `astro check`：

```bash
pnpm add -D @astrojs/check typescript
npx astro check   # 诊断 .astro 文件 frontmatter 与模板表达式中的类型错误
```

调试方面，先记住 Astro 的一个基本事实：**frontmatter 的 console.log 打在终端（服务端），岛屿脚本的 console.log 打在浏览器**。新手最常见的困惑是"日志怎么到处找都找不到"——先分清这段代码在哪一侧执行，再决定看终端还是看 DevTools。两个实用技巧：

1. `astro dev --verbose` 输出路由匹配、内容集合解析等内部日志，排查"页面 404""集合没识别"时第一步就开它。
2. VS Code 里用"JavaScript 调试终端"启动 `pnpm dev`，即可在 frontmatter 代码里直接下断点——断点命中时请求挂起，配合 Variables 面板检查 `Astro.params` 与 `Astro.props`，比连环 log 高效得多。

内容集合的报错也值得单独熟悉。构建期最常见的 frontmatter 校验错误会列出"哪个文件、哪个字段、期望什么类型"，配合 005 篇的 schema 定义去读，几乎都是一分钟修复；反过来，如果报错指向 `render()` 或 `getEntry` 返回了空值，多半是 slug 大小写或目录层级写错。把这些高频报错的解读整理进团队手册，新成员的排障时间能省下一大截。

联调阶段常用 `astro dev --host` 把 dev server 暴露到局域网，手机真机直接访问开发机 IP，测试响应式与触摸交互；配合 015 篇的中间件打请求日志，真机上"看不到 console"的问题也能在终端追到。

组件测试与 E2E 的分工争议可以用一句话仲裁："渲染对不对"归容器 API，"流程通不通"归 Playwright，重叠区（如按钮点击后的状态变化）放在成本低的那一层。分工写进 README，团队就不会在"这个用例该写在哪"上反复内耗。

## 5. CI 接入：把门禁固定下来

四层检查按"快到慢、先便宜后昂贵"排序进流水线，任何一层失败立即终止：

```yaml
# .github/workflows/quality.yml：推送与 PR 的质量门禁
name: Quality
on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm astro check        # 最快：静态类型诊断
      - run: pnpm vitest run         # 其次：单元与组件测试
      - run: pnpm build              # 构建：内容与 frontmatter 校验也在这一步
      - run: pnpm exec playwright install --with-deps
      - run: pnpm exec playwright test  # 最慢：E2E，跑在生产形态的 preview 上
```

注意两点：`astro build` 本身就是一道内容校验关卡（frontmatter schema 违规会构建失败），所以它必须排在 E2E 之前；Playwright 的 `webServer` 配置里 `reuseExistingServer: true` 让本地调试复用已开的服务，而 CI 里服务不存在会自动拉起，两边行为都对。

成本与缓存是流水线长期运行的另一半功课。pnpm 的 store 缓存由 `cache: pnpm` 托管；Playwright 的浏览器二进制体积大，用 `actions/cache` 按 Playwright 版本号缓存浏览器目录，能把流水线从几分钟压到一分多钟。另外给每个 job 设置超时上限，防止偶发的挂起占住 runner——门禁本身的可用性，也是质量保障的一部分。

流水线之外，本地还有一道更快的防线：把 `astro check` 与 `vitest run` 接进 pre-commit 钩子（配合 husky 与 lint-staged 只检查暂存文件），把"最便宜的失败"挡在提交之前。CI 保留全量门禁，本地拦截高频错误，两层各司其职。

最后把"何时跑什么"固化成约定：本地监听跑单测、提交前跑 check 与单测、PR 跑全量、合并主干后加跑构建产物检查。约定写进仓库 README，比"记得跑测试"的口头提醒有效得多。

依赖升级后的第一件事是全量跑一遍测试：Astro 与 Vite 的大版本升级常常改变虚拟模块行为或适配器默认值，测试套件是最快的回归探测器。升级 PR 单独开分支，先跑测试再人工抽查关键页面。

## 易错点与最佳实践

1. **组件测试断言整个 HTML**。`expect(html).toBe('<section>...</section>')` 对格式极敏感，加一个空格就红。修正：断言关键内容 `toContain('S 区站票')`，必要时配合 `toContain('--badge-color')` 检查样式变量。

2. **E2E 只跑 dev server**。开发服务器与生产构建在压缩、适配器、错误处理上都有差异，dev 通过不代表线上通过。修正：CI 用 `build && preview`，如上面配置所示。

3. **测试文件找不到 astro:content 等模块**。裸装 Vitest、自己写 `defineConfig` 缺少 Astro 注入：

   ```typescript
   // 错误：没有 Astro 别名，import { getCollection } from 'astro:content' 直接报错
   import { defineConfig } from 'vitest/config'
   export default defineConfig({ test: { include: ['src/**/*.test.ts'] } })
   ```

   修正：改用 `getViteConfig` 包装（第 1 节）。

4. **在浏览器控制台里找服务端日志**。frontmatter 的输出只在终端，浏览器永远看不到。修正：先判断代码执行侧，岛屿脚本才看 DevTools。

5. **E2E 选择器绑定实现细节**。`page.locator('.btn-primary-x8f2')` 随一次样式重构就失效。修正：一律用 `getByRole`、`getByLabel` 这类面向用户语义的查询。

## 本篇小结

1. Vitest 通过 `getViteConfig` 复用 Astro 的 Vite 管线，`astro:content` 等别名与类型在测试中照常可用。
2. 工具函数用纯单元测试；`.astro` 组件用容器 API 测服务端渲染结果；岛屿交互交由框架测试库或 E2E——先分清"渲染侧"与"浏览器侧"。
3. Playwright 负责跨页面的完整流程，用例写"用户可见行为"，并且应覆盖禁用 JS 的渐进增强路径。
4. `astro check` 补上 `.astro` 文件的类型盲区；调试先分清服务端与浏览器两侧，服务端用调试终端下断点。
5. CI 按 check、单测、build、E2E 的顺序组织，快的在前，build 本身也是内容校验关卡。

## 动手实践

1. **给票务逻辑补测试**：为 010 篇的 `earlyBirdDiscount` 补齐边界用例（0 张、负数、非整数），再把折扣规则改成"第 2 张半价"，体验"测试先红后绿"的节奏。提示：先把期望值写进测试再改实现。
2. **订单页 E2E**：为订单页补一条用例——直接访问不存在的订单 id 时应显示"订单不存在"。提示：注意这条用例应访问静态可预期的 URL，不要依赖测试间共享状态。
3. **跑通 CI 门禁**：把第 5 节的 workflow 提交到个人仓库，故意在某个 `.astro` 文件里把 `Astro.props.title` 拼错类型，观察流水线在哪一层拦住它。提示：`astro check` 应当最先变红。
