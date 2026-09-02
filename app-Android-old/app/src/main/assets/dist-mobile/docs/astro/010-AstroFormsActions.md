# 表单与 Actions

静态站点擅长"展示"，但音乐平台总有必须"收"进来的东西：演唱会购票、P主投稿、粉丝团报名。Astro 处理用户输入有三条路——在页面里直接处理 POST、写 API 路由端点、用 Actions 做带类型与校验的服务端函数。本篇以"演唱会购票"为主线，把三条路一次讲透，并回答最关键的选型问题：什么时候该用哪一条。

## 前置知识

- [Astro 页面与路由](/astro/003-PagesRouting)：表单的提交目标与 API 端点都建立在文件系统路由之上。
- [Astro 岛屿与客户端组件](/astro/006-IslandsClientComponents)：渐进增强的客户端部分要靠脚本或岛屿完成。
- [Astro 构建与部署](/astro/008-BuildDeploy)：理解静态输出与 SSR 适配器的差别，页面 POST 与 Actions 都需要服务端运行时。

## 学习目标

1. 能在 .astro 页面里处理 form 的 POST 提交，完成"校验、报错、重定向"完整闭环。
2. 能编写 API 路由端点（GET / POST），并说明它与页面路由的关系。
3. 能用 defineAction 定义带 zod 校验的 Action，并在服务端与客户端两个位置调用。
4. 能实现渐进增强：无 JavaScript 时表单照常工作，有 JavaScript 时无刷新提交。
5. 能为"购票、投稿、余量查询"等真实业务在三条路径之间做出选型。

## 1. 页面直接处理 POST：最朴素的完整闭环

Astro 是"服务端优先"的框架：只要部署时配置了 SSR 适配器，每个 .astro 页面的 frontmatter 都会在每次请求时真实执行一遍。这意味着页面文件本身就是表单处理器——请求方法、表单数据、校验逻辑、重定向，全部收在同一个文件里，不需要再建一个"处理提交"的文件。

```astro
---
// src/pages/concerts/[id]/ticket.astro：演唱会购票页
// 配有 SSR 适配器时，frontmatter 随每次请求执行，可以读取请求方法
const ticketTypes = [
  { id: 'stand-s', name: 'S 区站票', price: 680 },
  { id: 'seat-a', name: 'A 区坐票', price: 480 },
]

// 错误与用户已填的值先给默认值：GET 请求时直接渲染空表单
let errors: Record<string, string> = {}
const values = { name: '', ticketId: ticketTypes[0].id }

if (Astro.request.method === 'POST') {
  const form = await Astro.request.formData()
  values.name = String(form.get('name') ?? '').trim()
  values.ticketId = String(form.get('ticketId') ?? '')

  // 服务端校验：逻辑在服务端，绕过前端脚本也无法跳过
  if (!values.name) errors.name = '请填写购票人姓名'
  if (!ticketTypes.some((t) => t.id === values.ticketId)) {
    errors.ticketId = '票档不存在'
  }

  // 校验通过：先建订单再重定向（PRG 模式），刷新页面不会重复下单
  if (Object.keys(errors).length === 0) {
    return Astro.redirect(`/orders/${Date.now()}`)
  }
}
---

<form method="POST">
  <label>
    购票人 <input name="name" value={values.name} />
  </label>
  {errors.name && <p class="error">{errors.name}</p>}

  <select name="ticketId">
    {ticketTypes.map((t) => (
      <option value={t.id} selected={t.id === values.ticketId}>
        {t.name} ¥{t.price}
      </option>
    ))}
  </select>
  {errors.ticketId && <p class="error">{errors.ticketId}</p>}

  <button>提交订单</button>
</form>
```

三个细节值得画重点。第一，`form` 没写 `action` 属性，提交目标默认是当前 URL，"页面处理自己的表单"正是这种模式的惯用形态。第二，校验失败时**不重定向**，而是带着错误信息与用户已填的值重新渲染同一页面，用户不会因为填错一项就全部重填。第三，成功后必须 `Astro.redirect` 而不是渲染成功页：这是 Post/Redirect/Get（PRG）模式，防止用户刷新时浏览器重放 POST 造成重复下单。

这种模式的适用边界也要看清。页面 POST 的所有逻辑都写在本页 frontmatter 里，意味着它难以被第二个页面复用；校验规则散落在页面中，类型层面的保障为零——购票人字段是"字符串"还是"数字"，全靠手写约定。对于一两张低频表单（粉丝团报名、意见反馈），这些代价可以忽略；一旦业务变复杂（购票、投稿这类有明确领域规则的操作），就该看看后面两节能否把校验与逻辑收敛到更合适的位置。

顺带把语义钉牢：`method="POST"` 不是可选项。表单默认以 GET 提交，数据会拼进 URL 的查询串——购票人姓名、票档选择出现在地址栏与访问日志里，既难看也不安全；POST 把数据放进请求体，才是表单提交的正确语义。另一个常见疑问是"要不要给按钮加 onclick"：在页面 POST 模式下完全不需要，浏览器原生的提交行为就是完整流程，这正是零 JavaScript 方案的魅力。

## 2. API 路由端点：给脚本与外部调用留一个入口

页面能"顺便"处理提交，但如果调用方不是页面本身呢——播放器岛屿要实时查询票档余量、移动端 App 要拉取演唱会列表，这时就需要 API 路由：放在 `src/pages/api/` 下、只导出 HTTP 方法函数的特殊文件。

```typescript
// src/pages/api/tickets/check.ts：票档余量查询端点
import type { APIRoute } from 'astro'

// GET /api/tickets/check?concertId=magic-mirai-2026
export const GET: APIRoute = async ({ url }) => {
  const concertId = url.searchParams.get('concertId')
  if (!concertId) {
    // 参数缺失：显式返回 400，而不是 200 加一个错误 JSON
    return new Response(
      JSON.stringify({ error: '缺少 concertId 参数' }),
      { status: 400 },
    )
  }
  // 实际项目里这里查数据库；示例返回固定余量
  const stock = { concertId, 'stand-s': 12, 'seat-a': 86 }
  return new Response(JSON.stringify(stock), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// 同一文件也可以再导出 POST，例如"下单前校验购票资格"
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()
  // ...资格校验逻辑
  return new Response(JSON.stringify({ eligible: true }), { status: 200 })
}
```

API 路由与页面共用同一套路由规则（见 003 篇）：`src/pages/api/tickets/check.ts` 对应路径 `/api/tickets/check`。它和"页面处理 POST"的分工很清楚——页面 POST 服务于**浏览器里的这张表单**，返回的是 HTML；API 路由服务于**任何调用方**（岛屿的 fetch、App、第三方），返回的是 JSON 或其他格式。平台里"侧栏余量角标"就是典型用法：岛屿挂载后 `fetch('/api/tickets/check?...')`，把余量渲染出来，页面本身不用为它写一行服务端代码。

写 API 路由时把响应的"形状"当成接口契约来对待。首先是状态码：参数缺失回 400，查不到资源回 404，服务端异常回 500，全程 200 会让调用方被迫解析 body 猜结果。其次是 Content-Type 与序列化保持一致：返回 JSON 就统一 `application/json`，避免调用方在不同端点上做差异化兼容。最后记得 API 路由同样跑在服务端运行时上，纯静态输出（`output: 'static'`）的站点里它不会生成——这与下一节 Actions 的前提一致，"有没有后端"是引入它们之前要先回答的问题。

## 3. Astro Actions：校验定义一次，两端复用

页面 POST 与 API 路由解决了"请求送进来"，但有两个老问题悬着：入参校验的规则要手写且没法复用，客户端调用没有类型提示。Astro Actions 把"一个业务操作"定义成带 schema 的服务端函数，一次定义，服务端与客户端都能调用，校验与类型由框架统一保证。

```typescript
// src/actions/index.ts：全站 Action 定义
import { defineAction, z } from 'astro:actions'

export const server = {
  ticket: {
    // input 定义入参契约：不合法的请求根本进不了 handler
    reserve: defineAction({
      input: z.object({
        concertId: z.string().min(1, '缺少演唱会 id'),
        ticketId: z.enum(['stand-s', 'seat-a']),
        count: z.number().int().min(1).max(4, '每单最多购买 4 张'),
      }),
      handler: async (input) => {
        // 走到这里说明校验已通过，input 有完整类型，可放心读写数据库
        const orderId = `ord-${Date.now()}`
        return { orderId, status: 'pending' as const }
      },
    }),
  },
}
```

服务端（页面 frontmatter）调用时用 `Astro.callAction`，配合 `isInputError` 把 zod 的问题整理成字段级错误：

```astro
---
// src/pages/concerts/[id]/ticket.astro（Actions 版，节选）
import { actions, isInputError } from 'astro:actions'

let fieldErrors: Record<string, string[]> = {}
if (Astro.request.method === 'POST') {
  const form = await Astro.request.formData()
  const { data, error } = await Astro.callAction(actions.ticket.reserve, {
    concertId: Astro.params.id,
    ticketId: String(form.get('ticketId') ?? ''),
    count: Number(form.get('count') ?? 1),
  })
  if (isInputError(error)) {
    // zod 的问题已被整理成字段级结构：{ count: ['每单最多购买 4 张'] }
    fieldErrors = error.fields
  } else if (error) {
    fieldErrors._ = [error.message]
  } else {
    // data 类型完整：TS 知道这里有 orderId 字段
    return Astro.redirect(`/orders/${data!.orderId}`)
  }
}
---
```

客户端（脚本或岛屿）则直接导入 `actions`，返回结构与 `Astro.callAction` 完全一致：

```html
<!-- src/pages/concerts/[id]/ticket.astro 页尾脚本 -->
<script>
  // astro:actions 在客户端同样可用，且整个调用链都有类型提示
  import { actions } from 'astro:actions'

  const form = document.querySelector<HTMLFormElement>('#ticket-form')
  form?.addEventListener('submit', async (e) => {
    e.preventDefault() // 有 JS 时拦下整页提交，改走 Action
    const { data, error } = await actions.ticket.reserve({
      concertId: form.dataset.concertId ?? '',
      ticketId: (form.elements.namedItem('ticketId') as HTMLSelectElement).value,
      count: Number((form.elements.namedItem('count') as HTMLInputElement).value),
    })
    if (error) return renderErrors(error) // 复用页面里的错误渲染函数
    location.href = `/orders/${data!.orderId}`
  })
</script>
```

注意 Actions 的运行前提：生产环境需要 SSR 适配器。纯静态输出的站点在构建时就会报错，因为 Action 必须有一个真正的服务端来执行 handler。

Actions 还有两个值得用起来的进阶点。其一，`defineAction` 支持 `accept: 'form'`，让原生表单直接把 `action` 属性指向 Action 端点，框架自动把 formData 喂给 input schema——连页面 frontmatter 里的 `Astro.callAction` 都可以省掉。其二，`server` 对象支持多层嵌套命名（上面的 `ticket.reserve`），按业务域组织 Action 的目录结构，全站调用点在 IDE 里都能自动补全、点击跳转，这套"类型化 RPC"的体验正是 Actions 区别于裸 API 路由的核心价值。

## 4. 渐进增强与错误反馈

"渐进增强"四个字落到表单上就是一条铁律：**先让表单在零 JavaScript 下完整可用，再用脚本让它更好用**。Astro 的页面 POST 天然满足前半句——上面的购票表单没有一行脚本，禁用 JS 的浏览器也能买票。要补上后半句，只需在脚本里拦截 `submit`，同一套 Action 既服务无 JS 的整页提交，也服务有 JS 的无刷新提交，校验规则不会出现两份。

错误反馈则要始终以服务端渲染的版本为基准。两个实践点：

1. **字段级错误紧贴字段**。错误对象按字段组织（Actions 的 `error.fields` 天然如此），渲染时 `{errors.count && <p class="error">{errors.count[0]}</p>}` 放在对应输入框下面，别把所有问题堆在页面顶部。
2. **提交后聚焦第一个出错字段**。无刷新提交时页面不滚动、不刷新，错误出现在视野之外等于没提示。脚本里在渲染错误后执行 `form.querySelector('.error')?.previousElementSibling?.focus()`，配合 `aria-invalid` 属性让屏幕阅读器也能感知。

一个容易被忽略的同步问题是"双份渲染"。服务端渲染的错误提示与客户端无刷新提交渲染的错误提示是两条代码路径，稍不留神就会出现"整页提交显示 A 文案、无刷新提交显示 B 文案"。实践上让两者收敛到同一个渲染函数：服务端路径把 `fieldErrors` 传给模板，客户端路径拿到 `error.fields` 后调用同一个函数把错误节点放回对应字段下方。文案、样式、aria 属性只有一处定义，渐进增强的两条路径就永远不会漂移。

重复提交防护也值得内置到这个模式里：整页提交场景依赖浏览器的 PRG 行为兜底，无刷新场景则由脚本负责——发起请求前把按钮置为 `disabled` 并显示"提交中"，收到响应后恢复。两种路径都做到"提交期间不可重复点击"，订单系统最基本的防线就有了。

## 5. 三条路径如何选型

| 方案 | 返回什么 | 适合场景 | 平台示例 |
| --- | --- | --- | --- |
| 页面 POST | HTML（重渲染本页） | 表单与页面强绑定、逻辑简单 | 粉丝团报名表 |
| API 路由 | JSON / 文件等 | 调用方多样、格式自由 | 余量查询、RSS、Webhook |
| Actions | 带类型的联合结果 | 平台自己的核心业务，需要校验与复用 | 购票下单、P主投稿 |

经验法则是：**Actions 做业务，API 路由做接口，页面 POST 做补充**。核心业务逻辑（下单、投稿）走 Actions，校验和类型只写一遍；需要被第三方或脚本直接消费的能力暴露成 API 路由；一两处的一次性小表单犯不着建 Action，页面 POST 就够。三者并不互斥——购票页完全可以是"页面渲染表单 + Actions 处理下单 + API 路由供岛屿查余量"的组合。

选型还允许演进。一个务实的路径是：新功能先在页面 POST 里跑通闭环（改动最小、部署要求最低）；当校验规则膨胀、第二个调用方出现时，把处理逻辑抽成 Action，页面改为 `Astro.callAction` 调用，客户端顺势获得类型；当出现非页面调用方（App、第三方）时，再在 API 路由里做一层薄封装转发到同一个 Action。最终形态是"Action 承载业务、页面与端点都是它的外壳"，每一步演进都不推翻上一步。

## 易错点与最佳实践

1. **成功后不重定向**。错误写法是校验通过后直接渲染"下单成功"：

   ```astro
   ---
   // 错误：刷新一次浏览器就重放一次 POST，重复下单
   ---
   <p>下单成功</p>
   ```

   修正：`return Astro.redirect('/orders/xxx')`，让后续刷新落在 GET 请求上。

2. **校验只写在前端**。客户端脚本里的校验只是体验优化，不是安全边界：

   ```astro
   ---
   // 错误：信任表单值直接入库
   const count = Number(form.get('count')) // 可能是 99999
   ---
   ```

   修正：把规则写进 Action 的 `input` schema，`count: z.number().int().min(1).max(4)`。

3. **API 路由漏了状态码与响应头**。`new Response(JSON.stringify(data))` 默认 200、无 Content-Type，调用方 `res.json()` 可能解析失败。修正：显式传 `status` 与 `headers: { 'Content-Type': 'application/json' }`。

4. **客户端调用 Action 不判错就取 data**。返回是 `{ data, error }` 联合结构，出错时 `data` 为 `undefined`。修正：先 `if (error) return ...`，再访问 `data`（可用非空断言或可选链）。

5. **静态站点误用 Actions**。没有 SSR 适配器时 `astro:actions` 在构建期报错；要么加适配器，要么把该功能降级为 API 路由加静态页面。

## 本篇小结

1. 配置 SSR 适配器后，.astro 页面的 frontmatter 随每次请求执行，可以直接处理 POST：校验失败带值重渲染，成功后重定向（PRG）。
2. API 路由是 `src/pages/api/` 下导出 HTTP 方法函数的文件，服务于岛屿与第三方调用，返回 JSON 等格式。
3. Actions 用 `defineAction` + zod 把业务操作定义成带校验与类型的服务端函数，`Astro.callAction` 服务端调用，`import { actions } from 'astro:actions'` 客户端调用。
4. 渐进增强的顺序是"零 JS 可用，再叠加无刷新提交"；错误反馈以服务端渲染的版本为基准，字段级展示并聚焦首个错误。
5. 选型口诀：Actions 做业务、API 路由做接口、页面 POST 做补充，三者按页面自由组合。

## 动手实践

1. **购票页双形态**：把第 1 节的购票页改造成 Actions 版，验证禁用 JavaScript 后表单仍能提交并显示字段错误，再启用脚本对比无刷新体验。提示：错误渲染函数要在两种路径下复用同一套标记结构。
2. **余量角标**：实现 `/api/tickets/check` 端点，并在歌姬主页的侧栏岛屿中轮询展示"剩余 N 张"。提示：接口要处理缺少参数的情况并返回 400。
3. **投稿校验**：为 P主投稿定义 `submission.create` Action，规则包括"曲名 1-60 字、音频链接必须是 https"。提示：用 zod 的 `z.string().url().startsWith('https://')` 组合表达，然后故意提交非法值观察 `error.fields` 的结构。
