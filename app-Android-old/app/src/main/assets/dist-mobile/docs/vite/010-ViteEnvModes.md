# 环境变量与模式

同一套前端代码要跑在多个"场合"里：开发者本地连 Mock 服务、测试环境连灰度网关、生产连正式网关。把地址写死在代码里显然不行，Vite 的答案是两件配套工具：`.env` 文件家族负责"按场合存值"，模式（mode）负责"决定读哪份值"。本篇把加载顺序、暴露规则与安全边界一次讲清。

## 前置知识

- [Vite 配置文件](/vite/003-ConfigFile)：本篇会在配置里用 `loadEnv` 读取环境变量。
- [Vite 快速上手与项目结构](/vite/002-QuickStart)：.env 文件都放在项目根目录，与 index.html 平级。
- [Vite 开发服务器与 HMR](/vite/006-DevServerHMR)：dev server 与 build 默认对应两个不同模式。

## 学习目标

1. 能列出 .env 文件家族的成员，并说出它们同时存在时的加载优先级。
2. 能正确使用 `import.meta.env`，理解 VITE_ 前缀的暴露规则与四大内置变量。
3. 能说清 development / production 两个默认模式与命令的对应关系。
4. 能用 `--mode` 创建 staging 等自定义模式，并在配置文件里用 loadEnv 读值。
5. 能划清敏感变量的安全边界：什么能进客户端产物，什么必须留在服务端。

## 1. .env 文件家族与加载顺序

Vite 约定了一组从根目录读取的环境文件，每个文件是简单的 KEY=VALUE 格式：

```ini
# .env：所有模式都会加载的"公共值"
VITE_APP_NAME=虚拟歌手音乐平台

# .env.development：pnpm dev 时加载——开发连本地 Mock 票务服务
VITE_API_BASE=http://localhost:3000
VITE_TICKET_DEBUG=true

# .env.production：pnpm build 时加载——生产连正式网关
VITE_API_BASE=https://api.fandex-music.cn
```

当多个文件同时存在时，**越靠后加载的越"精确"，但优先级越高**。完整的优先级从高到低是：

```text
1. 进程里已存在的环境变量（如 CI 注入的，最高）
2. .env.[mode].local   —— 指定模式且本机私有
3. .env.[mode]         —— 指定模式
4. .env.local          —— 所有模式且本机私有
5. .env                —— 所有模式，优先级最低
```

两条工程纪律直接从这张表推出。其一，`.local` 结尾的文件是"本机私有"语义，默认就被 Vite 加进 `.gitignore`——**不要删掉这两行 ignore 规则**，本机调试用的临时地址、个人令牌都靠它隔离在仓库之外。其二，公共值放 `.env`，模式差异放 `.env.[mode]`，同名变量永远只在"更精确的一层"覆盖一次，避免维护时到处找"这个值到底配在哪"。

两个目录与作用域相关的补充：Vite 默认只读项目根目录下的环境文件，monorepo 里多个子包想共用一份配置时，用 `envDir` 指向仓库级目录，或由构建脚本在启动前注入进程变量（优先级最高，天然压过所有文件）；另外 .env 文件支持 `#` 注释与空行，值不需要引号，但值本身含 `#` 时必须加引号——这些解析细节第一次踩到时，很容易误判成"变量没生效"。

还有一个容易忽略的加载事实：环境文件按优先级"从上往下"合并，同名变量只保留最高优先级的值，其余被完全忽略而不是叠加——这意味着 .env 里写的兜底值，在 .env.production 里一旦出现就彻底消失。排查"哪来的旧值"时，按优先级表从高往低逐层找，通常一步就能定位。

## 2. import.meta.env 与 VITE_ 前缀

客户端代码通过 `import.meta.env` 读取变量。必须记住的规则是：**只有 VITE_ 开头的变量会被注入客户端**，其余变量只存在于 Node 侧（配置文件、SSR 服务端），这是刻意的防泄露设计。

```typescript
// src/lib/api.ts：按环境选择网关地址
const base = import.meta.env.VITE_API_BASE

export async function fetchSongList() {
  const res = await fetch(`${base}/api/songs`)
  if (!res.ok) throw new Error(`拉取歌单失败：${res.status}`)
  return res.json()
}

// 开发环境才打印调试信息。import.meta.env.DEV 在生产构建里被静态
// 替换为 false，这整段代码会被压缩器直接摇掉，不占产物体积
if (import.meta.env.DEV) {
  console.log('[票务调试] 当前模式：', import.meta.env.MODE)
}
```

除了自定义变量，`import.meta.env` 上还挂着四个内置变量：`MODE`（当前模式名）、`DEV`（是否开发）、`PROD`（是否生产）、`BASE_URL`（部署基础路径）。给自定义变量补上类型声明后，IDE 提示与拼写检查都会工作：

```typescript
// src/env.d.ts：给自定义变量补类型，避免到处 any
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_API_BASE: string
  readonly VITE_TICKET_DEBUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

还有一个实现层的要点：环境变量是**构建期的静态字符串替换**。Vite 在打包时把 `import.meta.env.VITE_API_BASE` 这段代码直接替换成字符串字面量，因此运行时改动环境变量不会生效，也不能用 `import.meta.env[key]` 这种动态索引（替换器找不到对应的静态写法，客户端拿到的是 undefined）。

静态替换是"限制"更是"特性"。因为替换发生在打包期，生产产物里只有真正用到的变量字面量，`import.meta.env.DEV` 这类判断直接退化为布尔常量，配合压缩器的死代码消除，开发专用的调试分支一点体积都不占。同样因为替换在打包期，变量在客户端是"只读快照"——想拿"运行时可变"的配置（比如运营随时切换的活动开关），那属于接口数据的范畴，走 fetch 而不是环境变量。

前缀规则的另一半是"内置变量不受前缀约束"：MODE、DEV、PROD、BASE_URL 无需 VITE_ 开头就暴露给客户端，因为它们由 Vite 生成、天然不含机密。自定义变量则没有豁免——拼写时把 VITE_ 写成 VITR_ 这类手误不会有任何报错，客户端只会拿到 undefined，所以补类型声明（上文 env.d.ts）不只是开发体验，也是一道拼写保险。

## 3. development 与 production 两个默认模式

模式由命令决定：`vite`（dev server）默认 `development` 模式，`vite build` 默认 `production` 模式。这两个名字同时决定了加载哪份 `.env.[mode]`，也让 `import.meta.env.MODE`、`DEV`、`PROD` 各得其所。

容易混淆的是模式（mode）与 `NODE_ENV` 的关系。Vite 会按模式为 `NODE_ENV` 设置合理默认值（development / production），但两者并不锁死：`NODE_ENV` 是 Node 生态的通用约定，很多库（如 Vue、React）会据此切换开发/生产构建；`mode` 则是 Vite 自己的"场合"概念，一个模式里完全可以让 `NODE_ENV` 保持 production（第 4 节的 staging 就是这样）。**判断代码行为用 `import.meta.env.PROD / DEV`，判断当前场合用 `import.meta.env.MODE`**，不要直接读 `process.env.NODE_ENV`——它在浏览器里根本不存在。

模式与命令是可以交叉组合的：`vite build --mode development` 完全合法，产物是"生产打包强度 + development 模式的变量"。这个组合偶尔用于"复现线上包里的开发配置"，但日常不要让两套语义错位。

两个默认模式在实际项目里的差异通常是一张清单：开发模式开着 source map、关着压缩、HMR 全开，方便定位问题；生产模式关掉或隐藏 source map（错误监控还原用）、开压缩、产物带内容哈希做长缓存。这份差异由 Vite 按模式给出默认值，团队要做的只是检查默认值是否满足平台需求——例如错误监控要求上传 source map，就要在生产配置里显式打开 `build.sourcemap` 并接入上报流程。

与 CI 的配合值得一提：同一份代码在流水线里既跑测试又跑构建，测试命令不指定 mode 时走 development，构建走 production；需要在测试里读 production 的变量时，用 `vitest --mode production` 显式指定——但更推荐的做法是让测试不依赖特定模式的变量值，保持用例在任何模式下可复现。

## 4. 自定义 mode：staging 的完整落地

介于开发与生产之间的预发布（staging）是自定义模式最典型的场景：它要打包成生产强度，却要连灰度网关、打开灰度开关。

```bash
# package.json scripts：预发布构建
"build:staging": "vite build --mode staging"
```

```ini
# .env.staging：预发布环境——连预发网关，并打开新功能灰度
VITE_API_BASE=https://staging-api.fandex-music.cn
VITE_GRAY_CONCERT=true
```

运行 `pnpm build:staging` 后，`import.meta.env.MODE` 是 `staging`，`VITE_GRAY_CONCERT` 可在客户端读取，而打包强度与 `pnpm build` 完全一致。配置文件里读取变量则要用 `loadEnv`——因为配置文件运行在 Node 侧，`import.meta.env` 还不存在：

```typescript
// vite.config.ts：配置文件里读取 env 用 loadEnv
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // 第三个参数传空串表示读取全部变量（含不带 VITE_ 前缀的）
  const env = loadEnv(mode, process.cwd(), '')
  return {
    define: {
      // 把 Node 侧的私有值注入为编译期常量，客户端按需使用
      __CONCERT_VERSION__: JSON.stringify(env.CONCERT_VERSION ?? 'dev'),
    },
  }
})
```

`loadEnv` 的第三个参数是前缀过滤：传 `'VITE_'` 只拿会被暴露的公开变量，传空串拿全部（包括私有值）。这个设计把"公开/私有"的分界显式交到你手上——**在配置里读到私有值是正常的，把它 define 给客户端之前先三思**。

CI 场景下自定义模式还有个便利属性：进程环境变量的优先级高于所有文件，所以预发布特有的值（灰度比例、临时网关）可以由流水线直接注入，仓库里只留稳定默认值。反过来提醒一句：既然进程变量能压过文件，本地试验完要记得 `unset` 干净，否则会出现"我明明改了 .env 怎么没变化"的悬案。

## 5. 敏感变量安全边界：VITE_ 前缀等于公开发布

安全规则只有一句话：**任何带 VITE_ 前缀的变量都会被静态替换进最终产物，等于公开发布**。产物会被 CDN 分发、会被用户浏览器完整下载，文本编辑器打开即可检索：

```bash
# 错误示范：密钥加了 VITE_ 前缀，被打进 js 产物，全网可查
VITE_TICKET_MASTER_SECRET=sk-live-xxxxxxxx
```

修正方案是把密钥留在服务端，客户端只跟自己的后端说话。开发期用代理转发，密钥由 Node 侧拼进请求头：

```typescript
// vite.config.ts：密钥只留在服务端，dev 代理转发给票务网关
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      proxy: {
        // 浏览器只请求同源的 /ticket-api，密钥由代理侧附加
        '/ticket-api': {
          target: 'https://ticket-master.example.com',
          changeOrigin: true,
          headers: { Authorization: `Bearer ${env.TICKET_MASTER_SECRET}` },
        },
      },
    },
  }
})
```

生产环境同理：密钥配置在部署平台的环境变量里（CI 注入的进程变量优先级最高，正好被 `loadEnv` 读到），由 SSR 服务或后端网关持有。记住这个链路后，"前端永远不持有密钥"就不再是一句口号，而是 Vite 的前缀机制替你守住的第一道门。

工程化收尾还有三件小事。其一，仓库里提交一份 `.env.example`，列出全部变量名与示例值（不含真实值），新成员照抄成本地文件即可跑通；其二，给密钥建立轮换节奏，安全假设要建立在"总有一天会泄露"之上；其三，代码评审时把"新增了 VITE_ 变量"列为敏感检查项，确认它确实不含机密。安全边界不是一条规则，而是一组让规则自动被执行的流程。

再看这条边界在平台里的落点：应援色、票档名称这类公开配置走 VITE_ 前缀与 .env 文件；票务签名密钥、支付回调密钥走部署平台的进程变量，只出现在配置与 SSR 服务端代码里。两类的命名、存放位置、评审流程都不同——物理隔离比"小心一点"可靠。

最后补一个检查口诀，评审环境相关 PR 时过一遍：新变量是否需要进客户端（决定前缀）；是否含机密（决定存放位置）；三份 .env 是否同步更新；.env.example 是否补行。口诀看起来琐碎，但它把"环境变量"从散落的个人习惯变成了有 checklist 的工程实践——新人照着问一遍，就能得到和老兵一样的结果。

## 易错点与最佳实践

1. **客户端读到 undefined**。变量写进了 .env 却没加 VITE_ 前缀：

   ```bash
   # 错误：API_BASE 不会出现在客户端
   API_BASE=https://api.fandex-music.cn
   ```

   修正：改为 `VITE_API_BASE`；或确认这段代码本该在 Node 侧运行，改用 `loadEnv` / `process.env`。

2. **动态索引环境变量**。

   ```typescript
   // 错误：静态替换器无法处理动态 key，客户端拿到 undefined
   const value = import.meta.env[someKey]
   ```

   修正：把有限的取值写成显式分支 `someKey === 'api' ? import.meta.env.VITE_API_BASE : ...`，静态写法才可被替换。

3. **改了 .env 不生效就怀疑 Vite**。环境文件只在启动时读取，修改后必须重启 dev server。最佳实践：把"改了 env 记得重启"写进团队 README，节省每个人的半小时。

4. **.env.local 被提交进仓库**。它承载本机私有配置，误提交可能泄露令牌。修正：保持 .gitignore 中 `.env.local` 与 `.env.*.local` 两行，并定期用 `git log --all -- .env.local` 自查历史。

5. **用 NODE_ENV 区分业务场合**。`process.env.NODE_ENV` 在浏览器不存在，且它不等于 mode。修正：客户端用 `import.meta.env.MODE` 判断场合、用 `import.meta.env.PROD` 判断打包形态。

## 本篇小结

1. .env 文件家族按"进程变量 > .env.[mode].local > .env.[mode] > .env.local > .env"的优先级加载，.local 文件只存本机私有值。
2. 只有 VITE_ 前缀的变量进入客户端 `import.meta.env`；替换发生在构建期，因此必须是静态写法、修改后要重启。
3. `vite` 与 `vite build` 分别默认 development / production 模式；判断行为用 `PROD / DEV`，判断场合用 `MODE`。
4. `--mode staging` 配合 `.env.staging` 落地预发布环境；配置文件里用 `loadEnv` 读值，第三参数控制前缀过滤。
5. 安全边界一句话：VITE_ 前缀等于公开发布，密钥留在服务端，客户端通过同源代理或自有后端访问敏感能力。

## 动手实践

1. **三环境切换**：为平台配置 development / staging / production 三份网关地址，构建 staging 包并检查产物里的地址替换是否正确。提示：用 `grep -r "staging-api" dist/assets/` 验证替换结果。
2. **类型补全**：给所有自定义变量补上 `ImportMetaEnv` 声明，然后故意把 `VITE_TICKET_DEBUG` 拼成 `VITE_TICKET_DEBUGG`，观察 TypeScript 报错。提示：声明文件要放在 tsconfig 包含的目录内。
3. **密钥自查**：在产物里检索 `sk-`、`secret` 等关键词，确认没有任何密钥进入客户端；再把一个误加 VITE_ 前缀的假密钥改回无前缀并走代理方案。提示：`grep -r "sk-" dist/` 应当零命中。
