---
order: 200
title: 环境变量 astro:env
module: 'astro'
category: 前端技术
difficulty: intermediate
description: 用 astro:env schema 声明环境变量：类型校验、secret/public 分离，与 PUBLIC_ 旧法的对照迁移。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'astro/080-BuildDeploy'
  - 'astro/131-AstroSessionsApi'
prerequisites:
  - 'astro/080-BuildDeploy'
---

## 知识点地图

- **知识类别**：环境变量（astro:env）——配置注入的类型化方案，Astro 5.0 引入，此前模块只在版本演进表中出现过这个名字，080 篇的部署指南还停留在 `PUBLIC_` 前缀旧法。
- **解决什么问题**：同一个代码库跑在 dev/prod/CI 三种环境要换数据源、换密钥；而旧法 `import.meta.env.PUBLIC_*` 没有类型、没有必填校验、拼错变量名静默变 undefined，密钥是否泄露全靠自觉。
- **什么时候用到**：接入任何需要 key 的第三方服务、切换 dev/prod 数据源、在 CI 与托管平台注入配置。凡是要"换个环境跑一遍"的站点都需要它。

## 学习目标

- 会用 `env.schema` 声明变量：context（客户端/服务端）、access（public 内联/secret 运行时）、类型与默认值
- 理解构建期内联与 SSR 运行时读取的机制差异，知道为什么 secret 绝不进客户端包
- 能把 `import.meta.env.PUBLIC_` 旧法代码迁移到 astro:env schema
- 会排查"启动期校验失败"与"部署平台变量未注入"两类报错

## 1. schema 声明：变量在配置里登记造册

```javascript
// astro.config.mjs：astro:env schema
import { defineConfig, envField } from 'astro/config'

export default defineConfig({
  env: {
    schema: {
      // 客户端可用、构建期内联：SDK 的公开 base URL
      FANCLUB_API_URL: envField.string({
        context: 'client',
        access: 'public',
        default: 'https://api.fanclub.example',
      }),
      // 服务端专属、运行时读取：第三方应援数据服务的 API key
      FANCLUB_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
      // 服务端数字变量，带枚举约束的另一个例子见第 3 节
      CACHE_TTL: envField.number({ context: 'server', access: 'public', default: 300 }),
    },
  },
})
```

每个变量两个字段四个维度：

- **context**：变量在哪些代码里可用——`client`（浏览器代码也能 import）或 `server`（仅服务端与适配器环境）。
- **access**：值怎么进代码——`public` 是**构建期内联**（构建时把值当常量替换进产物），`secret` 是**运行时读取**（每次请求经适配器从平台环境变量取，值永远不出现在构建产物里）。
- **type**：string / number / boolean / enum（`envField.enum({ values: [...] })`）。
- **default / optional**：有默认值就写 default；没有默认值又允许缺失要显式 `optional: true`——两者都不写的变量缺失时，`astro dev` 或 `astro build` **启动即报错**，指出哪个变量没配。

使用方式是普通的 import：

```typescript
// 服务端代码（页面 frontmatter、端点、中间件）
import { FANCLUB_API_URL, FANCLUB_API_KEY } from 'astro:env/server'

const res = await fetch(`${FANCLUB_API_URL}/votes`, {
  headers: { Authorization: `Bearer ${FANCLUB_API_KEY}` },
})

// 客户端代码（岛屿组件）
import { FANCLUB_API_URL } from 'astro:env/client'   // 只能拿到 context: client 的变量
```

启动期校验是 astro:env 相对旧法的根本优势：`FANCLUB_API_KEY` 忘配时，报错发生在 `astro build` 的第一秒（附变量名与原因），而不是上线后某个请求 500。类型错误同理——给 number 变量传 "abc" 构建就拦下。

## 2. 内联与运行时：机制差异决定密钥安全

`access: 'public'` 与 `access: 'secret'` 的差别是两套机制：

- **public 内联**：值在构建时被硬编码进 JS 产物。构建后改平台环境变量无效——必须重新构建。适合公开、随版本变化无所谓的数据源地址。
- **secret 运行时**：构建产物里只有 `getSecret("FANCLUB_API_KEY")` 这样的调用，真实值由 SSR 适配器在每次请求时从运行环境（平台环境变量、密钥管理服务）读取。改变量重启服务即生效，构建产物泄露也拿不到密钥。

由此推出两条硬规则。第一，**`context: 'server'` 加 `access: 'secret'` 是密钥的唯一正确组合**——`client + secret` 不是合法配置（客户端代码在用户机器上运行，secret 到了客户端就等于公开），Astro 会直接拒绝这种 schema。第二，`client + public` 的变量就是给全互联网看的：放 API 地址、公开功能开关，放任何不想公开的东西都是事故。

换成别的写法会怎样：第 2 节的 key 用旧法 `import.meta.env.FANCLUB_API_KEY` 读——值能读到（服务端代码里读非 PUBLIC_ 变量本身合法），但它绕过了 schema：没配不报错（值是 undefined，请求头变成 `Bearer undefined`，错误延迟到调用第三方失败才炸）、没有类型、也没人拦得住下一个同事把它改成 `PUBLIC_` 前缀搬进客户端。astro:env 的价值一半是校验，另一半是**把"密钥只能走服务端"从纪律变成类型系统约束**。

## 3. 三个不同场景的落地

**dev/prod 数据源切换**。应援数据 API 测试环境与生产环境地址不同，schema 配合平台变量自然分流：

```javascript
FANCLUB_API_URL: envField.string({
  context: 'server',
  access: 'secret',        // 地址也走运行时：同一个构建产物可部署到多环境
}),
```

本地 `.env` 写 `FANCLUB_API_URL=http://localhost:8787`，生产平台变量写正式地址——同一个产物两处部署，改环境不改构建。这正是 secret 运行时读取优于内联的场景：内联版每次切环境都要重新构建。

**CI 与部署平台变量注入**。GitHub Actions 构建静态站时，public 内联变量来自工作流环境：

```yaml
# .github/workflows/deploy.yml（节选）
- run: pnpm build
  env:
    FANCLUB_API_URL: https://api.fanclub.example   # 内联变量在构建时注入
```

而 secret 变量在部署平台（Vercel/Netlify/Cloudflare 的环境变量面板）配置——因为它们是运行时读取的，构建环境根本不需要见到密钥。这条分界线（**构建需要什么配 CI，运行需要什么配平台**）正好对应 access 的两个值。

**枚举约束防拼错**。站点模式这类有限集合用 enum：

```javascript
SITE_MODE: envField.enum({
  context: 'server',
  access: 'public',
  values: ['normal', 'maintenance'],
  default: 'normal',
}),
```

`SITE_MODE=maintenace`（少个 n）在启动期就被 enum 拒绝，而不是线上发现维护模式没生效。

## 4. 从旧法迁移：把 080 篇的示例升级

080 篇部署指南对环境变量的表述还是 `PUBLIC_` 前缀旧法（"前缀为 PUBLIC_ 的变量才会暴露到浏览器端"）。那段话在旧法语境下正确，迁移到 astro:env 后等价写法如下：

```javascript
// 旧法：.env 里 PUBLIC_API_URL=xxx，代码 import.meta.env.PUBLIC_API_URL
// 新法：schema 登记，代码 import
FANCLUB_API_URL: envField.string({ context: 'client', access: 'public' })
//                                      ^^^^^^           ^^^^^^
//                等价于旧法的 PUBLIC_ 前缀（进客户端）与构建期内联

// 服务端密钥：旧法靠"只写服务端代码"的自觉
// 新法：类型系统强制
FANCLUB_API_KEY: envField.string({ context: 'server', access: 'secret' })
```

迁移判读：`PUBLIC_` 前缀对应 `context: 'client'`（再配 `access: 'public'` 内联）；无前缀且只在服务端用的变量对应 `context: 'server'`；其中密钥类再升级为 `access: 'secret'` 获得运行时读取。旧法并未废弃——`import.meta.env` 依然可用，适合一两个简单开关的微型项目；但只要变量超过三个、或开始接第三方 key，schema 的校验与分离就值得支付。

## 5. 动手实践

练习一（schema 化改造）。任务：找一个用 `import.meta.env` 的项目（或新建项目先故意用旧法接一个假想 API），把三个变量迁入 schema：公开 API 地址（client + public）、服务端 key（server + secret）、维护模式开关（server + public + enum）。然后故意删掉 key 的平台变量跑 `astro build`，观察启动期报错信息。提示：报错会点名缺失变量——这正是旧法做不到的。

<details>
<summary>参考实现要点（先自己写，再展开对照）</summary>

```javascript
env: {
  schema: {
    FANCLUB_API_URL: envField.string({ context: 'client', access: 'public' }),
    FANCLUB_API_KEY: envField.string({ context: 'server', access: 'secret' }),
    SITE_MODE: envField.enum({
      context: 'server', access: 'public',
      values: ['normal', 'maintenance'], default: 'normal',
    }),
  },
},
```

对照要点：本地开发把三个值写进项目根 `.env`（此文件加入 .gitignore，另提交一份 `.env.example` 模板）；build 报错信息形如 "The following environment variables are defined in the schema but missing from your environment: FANCLUB_API_KEY"——把变量名复制进 .env 再跑即过。若报 "client context cannot access secret"，说明 schema 里组合写错了，回去检查 context 与 access。

</details>

练习二（密钥不进产物的验证）。任务：跑一次 `astro build`，在 dist/ 里全局搜索你的 API key 值——secret 变量应当搜不到、public 内联变量应当搜得到；把 key 从 secret 改成 client+public 组合再构建，验证被 schema 拒绝。提示：`grep -r "你的key值" dist/`；第二个实验是亲手确认"客户端 secret 不合法"是引擎级约束而非文档提醒。

练习三（多环境一次构建）。任务：用 secret 读 API 地址，本地 `.env` 指向 mock 服务、平台指向生产，验证同一份构建产物在两个环境取到不同地址。提示：验证本地时 `astro dev` 与 `astro preview` 读 .env；确认内联变量改 .env 后必须重新构建而 secret 不用——两种 access 的差异在这步体现得最直观。

## 本篇小结

astro:env 把环境变量从"命名约定"升级为"登记造册"：schema 里每个变量声明 context（给谁用）与 access（怎么进代码），启动期完成类型与必填校验。public 内联随构建固化，secret 运行时经适配器读取且永不进产物——密钥的唯一正确组合是 server + secret。dev/prod 切换、CI 注入、平台配置各归其位：构建需要的配 CI，运行需要的配平台。`PUBLIC_` 旧法仍然可用，但密钥一旦出现，schema 的类型约束比任何纪律都可靠。

## 参考与致谢

- 本篇 astro:env 的 schema、envField 与 access 机制参照 Astro 官方文档 Environment Variables 指南整理改写；Astro 官方文档以 MIT 许可发布：https://docs.astro.build/en/guides/environment-variables/
