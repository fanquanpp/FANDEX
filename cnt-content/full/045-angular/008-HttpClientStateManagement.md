---
order: 80
title: HttpClient 与状态管理
module: 'angular'
category: 前端技术
difficulty: intermediate
description: 从接口到界面：拦截器、resource 资源与信号化状态。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'angular/003-SignalsInputsOutputs'
  - 'angular/004-DependencyInjectionServices'
  - 'angular/007-DirectivesPipes'
prerequisites:
  - 'angular/007-DirectivesPipes'
  - 'angular/004-DependencyInjectionServices'
---

# HttpClient 与状态管理

票务页面的完整数据链路是：HttpClient 发请求、拦截器统一加令牌与处理错误、resource 把请求建模成带状态的数据源、服务内的 signal 承担跨组件共享状态、computed 派生视图模型，必要时再用 toSignal/toObservable 与 RxJS 互相桥接。本篇沿着这条链路从下往上走一遍，每一段都给出平台购票场景的可运行示例。

## 前置知识

- [依赖注入与 HTTP 服务](/angular/004-DependencyInjectionServices)：会注入服务与 HttpClient，理解 providedIn: "root" 的单例语义。
- [信号与组件通信](/angular/003-SignalsInputsOutputs)：掌握 signal/computed/effect 的读写与依赖追踪。
- [指令与管道](/angular/007-DirectivesPipes)：模板消费数据时用到的 @if/@for 与管道在本篇示例中大量出现。

## 学习目标

1. 会把接口请求收口到服务类，组件不直接接触 HttpClient。
2. 会写函数式拦截器，统一附加鉴权头与处理 401。
3. 能用 resource/rxResource 把请求建模成三态数据源。
4. 会用服务级 signal + computed 构建跨组件的共享状态。
5. 掌握 toSignal/toObservable 的互转场景与限制。

## 1. 服务化 HTTP：把请求收进 TicketService

```typescript
// ticket.service.ts —— 票务服务：HttpClient 统一收口
import { Injectable, inject } from "@angular/core"
import { HttpClient } from "@angular/common/http"

export interface Ticket {
  id: string
  concertId: string
  seat: string
  price: number
}

@Injectable({ providedIn: "root" })
export class TicketService {
  private http = inject(HttpClient)
  private base = "/api"

  /** 查询某场演唱会在售票档 */
  listTickets(concertId: string) {
    return this.http.get<Ticket[]>(`${this.base}/concerts/${concertId}/tickets`)
  }

  /** 购票：POST 返回生成的订单 */
  buy(concertId: string, seat: string) {
    return this.http.post<Ticket>(`${this.base}/concerts/${concertId}/buy`, { seat })
  }
}
```

```typescript
// app.config.ts（片段）—— 注册 HttpClient
import { provideHttpClient } from "@angular/common/http"

export const appConfig = {
  providers: [provideHttpClient()],
}
```

**讲解：**

1. 组件只依赖 TicketService，不依赖 HttpClient：接口路径变更、返回结构调整都只改服务一处，组件零感知。
2. 泛型 `get<Ticket[]>` 让响应具备类型，模板里的 `ticket.price` 有完整提示与检查。
3. `provideHttpClient()` 在 app.config 注册一次；`providedIn: "root"` 让服务成为全应用单例，这是下一节共享状态的前提。
4. 注册时顺带写上 `provideHttpClient(withFetch())` 显式选择 fetch 后端：SSR 与传输缓存都要求它，纯客户端项目也建议一次到位。
5. 服务粒度按业务域切：TicketService 只管票、SingerService 只管歌姬，而不是一个巨型 ApiService 装下所有接口——收口的目的是清晰，不是集中。

## 2. 函数式拦截器与鉴权

```typescript
// auth.interceptor.ts —— 函数式拦截器：附加令牌 + 401 统一跳转
import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http"
import { inject } from "@angular/core"
import { Router } from "@angular/router"
import { catchError, throwError } from "rxjs"

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem("fan_token") // 粉丝登录令牌
  // 请求不可变：加头必须用 clone 生成新请求
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        inject(Router).navigate(["/login"]) // 会话过期统一处理
      }
      return throwError(() => err)
    }),
  )
}
```

```typescript
// app.config.ts（片段）—— 串联拦截器，数组顺序即执行顺序
import { provideHttpClient, withInterceptors } from "@angular/common/http"
import { authInterceptor } from "./auth.interceptor"
import { loggingInterceptor } from "./logging.interceptor"

providers: [provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor]))]
```

**讲解：**

1. 函数式拦截器是 `(req, next) => Observable` 的纯函数：比类式拦截器少一套类样板，注入依赖用 `inject()` 就地完成。
2. `req.clone({ setHeaders })` 是唯一的加头方式：HttpRequest 设计为不可变，直接改属性不会生效也不会报错，是最隐蔽的一类 bug。
3. 401 跳登录放在拦截器里，所有组件共享同一套会话过期策略；多个拦截器的执行顺序就是 `withInterceptors` 数组的顺序。
4. 拦截器按职责拆分：鉴权、日志、重试各自独立成函数，用数组顺序表达执行链——比一个巨型拦截器更好测（第 9 篇会专门测它们）。
5. 重试也是拦截器职责：对幂等的 GET 做有限次重试，POST 一律不重试——网络抖动的应对收敛在这一层，组件永远不用关心。
6. 拦截器还能短路：命中缓存的 GET 可以直接返回缓存响应而不调用 next——请求缓存、离线兜底、mock 网关都靠这个能力实现。

## 3. resource / rxResource 三态资源

请求有"加载中、成功、失败"三个状态，手写 isLoading/error 标志很容易漏。resource 把它建模成带状态的数据源，请求参数是信号，参数变化自动重新加载。

```typescript
// concert-tickets.component.ts —— resource：余票三态展示
import { Component, signal, resource } from "@angular/core"

@Component({
  selector: "app-concert-tickets",
  template: `
    @switch (tickets.status()) {
      @case ("loading") { <p>余票查询中...</p> }
      @case ("error") { <p>查询失败：{{ tickets.error()?.message }}</p> }
      @default {
        <ul>
          @for (t of tickets.value()!; track t.id) {
            <li>{{ t.seat }}，¥{{ t.price }}
              <button (click)="buy(t)">选购</button>
            </li>
          }
        </ul>
      }
    }
  `,
})
export class ConcertTicketsComponent {
  // 请求参数是信号：concertId 变化 -> 自动重新加载并进入 reloading
  concertId = signal("c001")

  tickets = resource({
    request: this.concertId,
    loader: ({ request }) =>
      fetch(`/api/concerts/${request}/tickets`).then((r) => r.json()),
  })

  buy(ticket: { id: string }) {
    console.log("选购票档：", ticket.id) // 调用 TicketService.buy 后刷新资源
  }
}
```

```typescript
// rxResource 版本：现有返回 Observable 的服务方法直接接入
import { rxResource } from "@angular/core/rxjs-interop"

private http = inject(HttpClient)

tickets = rxResource({
  request: this.concertId,
  loader: ({ request }) =>
    this.http.get<Ticket[]>(`/api/concerts/${request}/tickets`),
})
```

**讲解：**

1. `tickets.status()` 取值：idle/loading/reloading/resolved/error，模板按状态分支渲染，不再手写布尔标志。
2. `request` 必须是信号：它变化时资源自动重新加载并进入 reloading，组件切场次的场景零额外代码。
3. `rxResource` 用于存量代码：服务方法已经返回 Observable 时不必重写，套上 rxResource 即可获得同样的三态语义。
4. 需要手动重取数据时调用 `tickets.reload()`——"刷新余票"按钮就是典型场景，绕过 request 变化直接重新执行 loader。
5. value 是只读信号：要基于它派生（过滤、排序、合计）就再套一层 computed，而不是把派生逻辑塞回 loader——数据派生留在渲染侧，请求保持纯粹。
6. 读写分治：resource 适合"读"；购票这类"写"仍是普通方法调用，成功后手动 reload 或乐观更新——这是信号数据层当前的务实形态。

## 4. computed 视图模型与服务化状态

```typescript
// cart.service.ts —— 购票车：服务级 signal 承担共享状态
import { Injectable, computed, signal } from "@angular/core"
import { Ticket } from "./ticket.service"

@Injectable({ providedIn: "root" })
export class CartService {
  private items = signal<Ticket[]>([])

  // computed 派生视图模型：组件直接读，不重复计算
  totalCount = computed(() => this.items().length)
  totalPrice = computed(() => this.items().reduce((sum, t) => sum + t.price, 0))
  byConcert = computed(() => {
    const map: Record<string, Ticket[]> = {}
    for (const t of this.items()) (map[t.concertId] ??= []).push(t)
    return map
  })

  add(ticket: Ticket) {
    // 不可变更新：引用变化才触发依赖它的 computed 重算
    this.items.update((list) => [...list, ticket])
  }

  remove(id: string) {
    this.items.update((list) => list.filter((t) => t.id !== id))
  }
}
```

```typescript
// cart-badge.component.ts —— 任意组件读取同一份状态
import { Component, inject } from "@angular/core"
import { CartService } from "./cart.service"

@Component({
  selector: "app-cart-badge",
  template: `<span>已选 {{ cart.totalCount() }} 张，合计 ¥{{ cart.totalPrice() }}</span>`,
})
export class CartBadgeComponent {
  cart = inject(CartService) // 根注入器单例：列表页与徽标读的是同一份数据
}
```

**讲解：**

1. 状态放服务级 signal：根注入器单例让"歌姬页加票、导航栏徽标变数"自动联动，无需事件广播。
2. computed 是视图模型层：总数、总价、按场次分组这些派生值只在依赖的 signal 变化时重算，模板直接消费，组件保持轻薄。
3. 更新永远走 `update` 与不可变操作（展开新数组、filter 新数组），引用不变就不触发派生——这是信号体系里最常见的静默失效原因。
4. 命名即契约：CartService 只暴露 totalCount/totalPrice/byConcert 三个只读视图与 add/remove 两个动作——读写面越小，调用方越难误用。
5. 进阶可了解 linkedSignal：适合"切换场次后选择重置回默认值"这类"参数变化即回初始"的状态，可以看作带重置逻辑的 computed；本篇的计数与分组用 computed 足够。
6. 状态持久化是独立决策：刷新后购物车保留属于产品需求，实现时在服务里读写 localStorage 并同步进 signal，与 computed 的派生机制互不掺和。
7. 避免上帝对象：票务购物车、收藏夹、播放队列各自一个服务，signal 与 computed 各自派生——状态拆分与服务拆分保持同构，注入图才清晰。
8. "清空已购"同样是 update：filter 掉对应项后返回新数组，computed 自动重算——永远不要对 signal 里的数组做 splice。

## 5. toSignal / toObservable 桥接

信号与 RxJS 不是二选一：新代码信号优先，遇到防抖、节流这类流控制借道 RxJS，两个转换函数是渡口。

```typescript
// song-search.component.ts —— 搜索防抖：信号 <-> RxJS 往返
import { Component, signal, inject } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { toObservable, toSignal } from "@angular/core/rxjs-interop"
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs"

@Component({
  selector: "app-song-search",
  template: `
    <input
      [value]="keyword()"
      (input)="keyword.set($any($event.target).value)"
      placeholder="搜索歌曲"
    />
    <ul>
      @for (s of results(); track s.id) { <li>{{ s.title }}</li> }
    </ul>
  `,
})
export class SongSearchComponent {
  private http = inject(HttpClient)

  keyword = signal("")
  keyword$ = toObservable(this.keyword)      // 信号 -> Observable

  results = toSignal(                        // Observable -> 信号，供模板消费
    this.keyword$.pipe(
      debounceTime(300),                     // 300ms 防抖
      distinctUntilChanged(),                // 内容未变不请求
      switchMap((kw) =>                      // 新请求自动取消旧请求
        this.http.get<{ id: string; title: string }[]>(`/api/songs?q=${kw}`),
      ),
    ),
    { initialValue: [] },
  )
}
```

**讲解：**

1. `toObservable` 让信号流入 RxJS 管道，用操作符表达"何时发请求"；`toSignal` 把结果转回信号，模板与 computed 无缝消费。
2. `toSignal` 必须给 `initialValue`（除非源 Observable 会同步发出首值），否则组件创建时信号无值，模板会拿到 undefined。
3. `switchMap` 是搜索场景的关键：只保留最新请求的结果；换成 `concatMap` 或 `mergeMap`，快速键入时旧响应可能覆盖新响应。
4. 非纯管道的倒计时（见 [指令与管道](/angular/007-DirectivesPipes)）也有信号化的现代替代——interval 驱动的信号，组件销毁时清理定时器：

```typescript
// countdown.ts —— interval 信号：倒计时的现代写法
import { Component, signal, inject, DestroyRef } from "@angular/core"

@Component({
  selector: "app-countdown",
  template: `<p>距开票 {{ minutesLeft() }} 分钟</p>`,
})
export class CountdownComponent {
  minutesLeft = signal(0)
  private openAt = Date.parse("2026-09-05T19:00:00+08:00")

  constructor() {
    const id = setInterval(() => {
      const diff = this.openAt - Date.now()
      this.minutesLeft.set(diff > 0 ? Math.ceil(diff / 60000) : 0)
    }, 1000)
    inject(DestroyRef).onDestroy(() => clearInterval(id)) // 销毁即清理
  }
}
```

5. 两个转换函数只在组件或服务的注入上下文里调用：订阅要跟随宿主生命周期自动清理——这也是"不要在全局随手转信号"的原因。
6. 桥接的定位是"UI 流场景"：表单防抖、合并轮询这类流控制借 RxJS；纯数据获取直接用 resource，不必为了用而绕道 Observable。
7. 选择判断的落点：参数驱动重载用 resource（切场次自动刷新），输入驱动节流用 toObservable + switchMap（搜索防抖）——先问"谁触发重新请求"，再选工具。
8. resource 的 loader 里抛错会进入 error()，但请求取消由框架管理——不要在 loader 里手写"取消上一次请求"，那是 switchMap 时代的负担。

## 6. 组合实战：票务页数据流串讲

把前五节的能力接成一条完整链路：拦截器加令牌、resource 管请求状态、CartService 管共享状态、组件只做绑定。下面是票务页的最终形态，也是本篇所有零件的验收现场。

```typescript
// concert-page.component.ts —— 全链路：选场次 -> 查余票 -> 加购票车
import { Component, inject, signal } from "@angular/core"
import { rxResource } from "@angular/core/rxjs-interop"
import { TicketService } from "./ticket.service"
import { CartService } from "./cart.service"

@Component({
  selector: "app-concert-page",
  template: `
    <select [value]="concertId()" (change)="switchConcert($any($event.target).value)">
      <option value="c001">2026 魔法未来</option>
      <option value="c002">Thank You 音 fest</option>
    </select>

    @switch (tickets.status()) {
      @case ("loading") { <p>余票查询中...</p> }
      @case ("error") { <p>加载失败，请稍后重试</p> }
      @default {
        <ul>
          @for (t of tickets.value()!; track t.id) {
            <li>{{ t.seat }}，¥{{ t.price }}
              <button (click)="cart.add(t)">加入购票车</button>
            </li>
          }
        </ul>
      }
    }

    <footer>已选 {{ cart.totalCount() }} 张，合计 ¥{{ cart.totalPrice() }}</footer>
  `,
})
export class ConcertPageComponent {
  private api = inject(TicketService)
  cart = inject(CartService)

  concertId = signal("c001")
  // request 依赖 concertId：切换场次自动重新加载（第 3 节）
  tickets = rxResource({
    request: this.concertId,
    loader: ({ request }) => this.api.listTickets(request),
  })

  switchConcert(id: string) {
    this.concertId.set(id) // 一次 set：资源重载 + 模板刷新全部自动发生
  }
}
```

**讲解：**

1. 组件里没有一行 fetch/HttpClient 调用、没有 loading 布尔值、没有订阅管理——这就是"收口"的成果：请求在服务（第 1 节），状态策略在拦截器（第 2 节），请求生命周期在 resource（第 3 节），共享状态在 CartService（第 4 节）。
2. `switchConcert` 只有一个 `signal.set`：下游的 resource 重载、@switch 分支、@for 列表、footer 总价全部由信号图自动驱动，这是信号体系"改数据、视图自新"的核心价值。
3. 数据流方向单向：用户操作 -> 修改 signal -> 派生资源/computed 更新 -> 模板重渲染。找不到"谁改了状态"时，顺着 signal 的写入点（set/update）排查，永远只有几处；这套纪律也把新成员的上手成本降到最低。
4. 页脚合计直接读 cart.totalPrice()，与选座列表天然同步——跨组件一致性不需要任何事件广播，这正是服务级信号相对输出事件方案的本质优势。
5. 验收方式：杀掉后端再刷新页面，@switch 应显示 error 分支而不是白屏；快速切换场次几次，网络面板应只见最后一次请求——前者是 resource 的功劳，后者是 switchMap 在兜底。
6. 验收完成后回头看一眼组件行数：数据流收口做得好，票务页的组件逻辑通常百行以内——超了就该再拆服务，而不是往模板里塞条件。

## 易错点与最佳实践

1. **拦截器里直接改 req**：HttpRequest 不可变，直接赋值不生效。一律 clone：

```typescript
// 错误：原地改头，请求原样发出
// req.headers.set("Authorization", token)
// 正确：clone 生成新请求再交给 next
const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
return next(authReq)
```

2. **resource 的 request 传普通值**：传字符串而不是信号，参数变化不会重新加载，页面切场次永远显示第一场的数据。用 `signal()` 包住参数。

3. **toSignal 漏 initialValue**：组件首帧模板读到 undefined，报 `cannot read properties of undefined`。凡是"晚于组件创建才发射"的源都给 `{ initialValue: ... }`。

4. **状态服务手动 new**：`new CartService()` 每次产生新实例，两个组件的状态互不相通。统一 `inject(CartService)`，实例由注入器管理（见 [依赖注入与 HTTP 服务](/angular/004-DependencyInjectionServices)）。

5. **搜索用 concatMap/不取消旧请求**：慢响应后到覆盖新结果，列表"倒着变"。防抖 + switchMap 是搜索的标准组合：

```typescript
// 错误：旧请求后到，覆盖新结果
// concatMap((kw) => this.http.get(...))
// 正确：切换到新请求时取消旧请求
switchMap((kw) => this.http.get(`/api/songs?q=${kw}`))
```

## 本篇小结

1. 请求收口到服务：组件依赖 TicketService 而非 HttpClient，`provideHttpClient()` 在 app.config 注册，泛型方法让响应有类型。
2. 函数式拦截器 `(req, next) => Observable` 统一鉴权与错误策略，加头必须 `req.clone`，多个拦截器按声明顺序执行。
3. resource/rxResource 把请求建模为三态资源：status/value/error 三件套替代手写 loading 标志，request 用信号、参数变即重载——状态变化全部由信号图驱动，没有手工刷新。
4. 共享状态 = 服务级 signal + computed 视图模型；更新走 update 与不可变操作，引用不变派生不触发。
5. toSignal/toObservable 是信号与 RxJS 的渡口：防抖、取消等流控制借 RxJS 表达，结果回到信号供模板消费；搜索场景记住"debounce + switchMap"，桥接函数成对出现，用哪个取决于数据流向。

## 动手实践

1. **票务页三态化**：把一个用布尔标志管理 loading 的余票列表页重构为 resource 版本，覆盖 loading/error/resolved 三种渲染，并验证切换 concertId 信号时自动重新加载。提示：loader 里故意抛错一次，观察 error 分支。
2. **拦截器链**：实现 loggingInterceptor（打印方法、URL 与耗时），与 authInterceptor 串联，验证顺序对请求头的影响；再模拟 401 观察自动跳转。提示：耗时统计放 rxjs 的 finalize 里。
3. **购票车联动**：完成 CartService 后做两个消费方——票档列表的"加入"按钮与导航栏徽标，验证一处 add、处处更新；再把 totalPrice 换成手写方法 `getTotal()` 体会 computed 的差异。提示：注意 update 内返回新数组而不是 push。最后用 Angular DevTools 的注入器树确认 CartService 全应用只有一个实例。
