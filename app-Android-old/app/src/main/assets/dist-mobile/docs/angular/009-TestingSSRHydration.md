# 测试与 SSR 水合

这是 angular 模块进阶路线的最后一站，两件事看似无关，实际共享同一个主题：**同一份组件代码要在不同环境下表现一致**——TestBed 在测试环境里替你搭好组件运行所需的注入器与 DOM，SSR 在 Node 服务端把组件渲染成静态 HTML，客户端水合再把静态 HTML"认领"回组件树。环境越多样，"写法是否环境无关"就越重要。本篇覆盖 TestBed 组件测试、HttpClientTesting 服务测试、@angular/ssr 接入、水合开启与水合错误规避；010 篇会对全模块做收官总结。

## 前置知识

- [HttpClient 与状态管理](/angular/008-HttpClientStateManagement)：了解拦截器与 resource，服务测试要替它们造假环境。
- [Angular 组件与模板语法](/angular/002-QuickStartComponentTemplate)：会写信号驱动的模板，被测组件都来自这些写法。
- [依赖注入与 HTTP 服务](/angular/004-DependencyInjectionServices)：理解 providers 覆盖机制，TestBed 的核心正是"替换 providers"。

## 学习目标

1. 会用 TestBed 编写组件单元测试，覆盖交互与渲染断言。
2. 会用 HttpClientTesting 伪造 HTTP 层测试服务与拦截器。
3. 能用 ng add @angular/ssr 接入服务端渲染并说明构建产物结构。
4. 会开启 provideClientHydration 与事件重放。
5. 能识别并规避三类常见水合错误。

## 1. TestBed 组件测试

```typescript
// ticket-button.component.ts —— 被测组件：购票按钮
import { Component, signal, output } from "@angular/core"

@Component({
  selector: "app-ticket-button",
  template: `
    <button (click)="buy()" [disabled]="stock() <= 0">
      {{ stock() > 0 ? "立即购票（余 " + stock() + "）" : "已售罄" }}
    </button>
  `,
})
export class TicketButtonComponent {
  stock = signal(3)
  bought = output<string>() // 成功购票时发出座位号

  buy() {
    if (this.stock() > 0) {
      this.stock.update((n) => n - 1)
      this.bought.emit(`A${this.stock()}`)
    }
  }
}
```

```typescript
// ticket-button.component.spec.ts —— TestBed 单元测试
import { TestBed, ComponentFixture } from "@angular/core/testing"
import { TicketButtonComponent } from "./ticket-button.component"

describe("TicketButtonComponent", () => {
  let fixture: ComponentFixture<TicketButtonComponent>
  let component: TicketButtonComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketButtonComponent], // 独立组件直接导入，无 NgModule
    }).compileComponents()
    fixture = TestBed.createComponent(TicketButtonComponent)
    component = fixture.componentInstance
  })

  it("点击后余票减一并发出座位号", () => {
    let received = ""
    component.bought.subscribe((seat) => (received = seat))

    component.buy()
    fixture.detectChanges() // 把信号变化同步到 DOM

    expect(component.stock()).toBe(2)
    expect(received).toBe("A2")
  })

  it("售罄时按钮禁用", () => {
    component.stock.set(0) // 直接给定边界状态
    fixture.detectChanges()

    const btn = fixture.nativeElement.querySelector("button") as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toContain("已售罄")
  })
})
```

**讲解：**

1. `TestBed.configureTestingModule` 搭建测试模块，独立组件放进 `imports`；`createComponent` 返回的 fixture 同时暴露组件实例（逻辑断言）与 nativeElement（DOM 断言）。
2. `detectChanges()` 手动触发变更检测：信号改完不调用，DOM 断言读到的仍是旧渲染。
3. 边界状态用 `signal.set` 直接给定，不需要绕道模拟点击；`output()` 的事件用 `subscribe` 捕获载荷。
4. 涉及 Promise 的异步动作之后用 `await fixture.whenStable()` 等待微任务队列清空再断言，比手写 setTimeout 更稳定也更可读。
5. spec 文件与组件同目录（xxx.component.spec.ts）是 CLI 约定：就近维护让"改组件必看测试"成为默认动线，也方便一起重构。
6. DOM 断言优先断言语义（disabled、textContent、aria 属性）而不是样式细节：语义断言在重构时依然成立，样式断言一碰就碎；真要验样式就断言 class 名，具体值交给样式表。

## 2. 服务测试与 HttpClientTesting

```typescript
// ticket.service.spec.ts —— HttpClientTesting 替换真实后端
import { TestBed } from "@angular/core/testing"
import { provideHttpClient } from "@angular/common/http"
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing"
import { TicketService } from "./ticket.service"

describe("TicketService", () => {
  let service: TicketService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(TicketService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify()) // 校验没有"漏网"的请求

  it("查询余票命中正确 URL 与方法", () => {
    const mockData = [{ id: "t1", concertId: "c001", seat: "A12", price: 680 }]
    let result: typeof mockData | undefined

    service.listTickets("c001").subscribe((r) => (result = r))

    const req = httpMock.expectOne("/api/concerts/c001/tickets")
    expect(req.request.method).toBe("GET")
    req.flush(mockData) // 提供模拟响应

    expect(result).toEqual(mockData)
  })
})
```

**讲解：**

1. `provideHttpClientTesting()` 在 providers 层把真实后端替换为可编程的假后端：请求被 HttpTestingController 截获，不发网络。
2. `expectOne` 断言"恰好有一个请求命中该 URL"，`flush` 决定响应内容；配合拦截器测试时，providers 里保留真拦截器即可验证加头逻辑。
3. `afterEach(httpMock.verify())` 是纪律：捕捉没被 expectOne 认领的请求与未 flush 的挂起请求，防止用例间互相污染。
4. 拦截器测试用同一套组合拳：providers 同时提供真拦截器与假后端，`expectOne` 拿到请求后检查 `request.headers` 与 URL——鉴权头、重试逻辑都能这样验证。
5. 假数据形状要与真实接口对齐：Ticket 接口改字段时先改 spec 里的 mockData，让类型错误在测试期暴露——这就是泛型与 flush 的组合价值。
6. flush 也能模拟失败：`req.flush("服务不可用", { status: 500, statusText: "Server Error" })`——错误分支的测试与成功分支一样顺手。

## 3. @angular/ssr 接入

```bash
ng add @angular/ssr   # 一条命令接入：改构建配置并生成服务端入口
ng build               # 同时产出浏览器包与服务端包
```

```typescript
// src/app/app.config.server.ts —— 服务端配置（ng add 自动生成）
import { mergeApplicationConfig, ApplicationConfig } from "@angular/core"
import { provideServerRendering } from "@angular/ssr"
import { appConfig } from "./app.config"

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering()],
}

export const config = mergeApplicationConfig(appConfig, serverConfig)
```

**讲解：**

1. `ng add @angular/ssr` 自动完成：生成 server.ts（Node/Express 入口）、app.config.server.ts 与构建配置，本地 `ng serve` 即可体验 SSR。
2. 构建产物分两份：浏览器 bundle 负责交互与水合，服务端 bundle 在 Node 里执行组件树、把首屏渲染成完整 HTML。
3. 对演唱会页面的意义：首屏 HTML 直出让"场次、票价"在 JS 下载完成前可见，搜索引擎抓到的也是完整内容。
4. 本地调试 SSR 不需要先部署：`ng serve` 的开发服务器内建服务端渲染，浏览器里查看源代码即可看到直出 HTML；服务端报错直接打印在终端，比上线后再排查快得多。
5. 接入后排查两类依赖：只在浏览器存在的库（动画、图表、storage 封装）要么延后到浏览器端执行，要么用平台判断隔离——这是 SSR 项目最常见的构建后运行时错误来源。
6. 构建产物自查：dist 下 browser 与 server 两个目录，分别由静态服务与 Node 进程托管——路径配错是部署事故的头号来源，上线前本地跑一遍产物。

## 4. provideClientHydration 与事件重放

服务端渲染的静态 HTML 如果在客户端被整棵推倒重建，用户会看到闪烁，事件也会短暂失效。水合让客户端"认领"既有 DOM 而不是重绘。

```typescript
// src/app/app.config.ts（片段）—— 开启水合 + 事件重放
import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core"
import { provideRouter } from "@angular/router"
import { provideHttpClient, withFetch } from "@angular/common/http"
import { provideClientHydration, withEventReplay } from "@angular/platform-browser"

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter([]),
    provideHttpClient(withFetch()),            // 水合传输缓存要求 fetch 后端
    provideClientHydration(withEventReplay()), // 水合前点击被记录并在水合后重放
  ],
}
```

**讲解：**

1. `provideClientHydration()` 开启后，服务端渲染时会在 HTML 里嵌入"水合信息"，客户端据此把静态 DOM 与组件树对上号，跳过重复渲染。
2. `withEventReplay()` 解决时间窗口问题：HTML 已显示但水合未完成时用户点的按钮会被记录，水合完成后按序重放——急着抢票的粉丝不会白点。
3. `withFetch()` 是传输缓存（transfer cache）的前提：服务端发出的 HttpClient 请求结果被序列化进 HTML，客户端水合时直接复用，不再重复请求接口。
4. 传输缓存可用 `withHttpTransferCacheOptions` 微调：排除携带鉴权头的请求、调整缓存策略——"每个粉丝看到的余票都不同"这类接口就不该进 HTML 缓存。
5. 验证水合是否生效：DevTools 的 Performance 面板能看到水合阶段，或对比关闭水合时的首屏闪烁——直出 HTML 应当无重绘地"活"过来。
6. 验证事件重放：页面加载后立刻点一次"购票"（此时水合未完成），水合完成后动作应被补执行——"用户比代码快"是真实票务场景的常态。

## 5. 水合错误规避

水合的代价是"服务端与客户端首帧必须一致"。任何依赖运行环境的取值（当前时间、随机数、window 尺寸）都会造成两边渲染不同，触发水合不匹配错误（NG0500）。

```typescript
// countdown.component.ts —— 时间敏感内容的安全写法
import { Component, signal, afterNextRender } from "@angular/core"

@Component({
  selector: "app-ticket-countdown",
  template: `<p>{{ text() }}</p>`,
})
export class TicketCountdownComponent {
  // 初值固定：服务端与客户端首帧渲染出完全相同的文本
  text = signal("开票倒计时即将开始")

  constructor() {
    // 仅在浏览器端执行：水合完成后才更新为真实倒计时
    afterNextRender(() => {
      const openAt = new Date("2026-09-05T19:00:00+08:00").getTime()
      const diff = openAt - Date.now()
      this.text.set(diff > 0 ? `距开票 ${Math.ceil(diff / 60000)} 分钟` : "已开票")
    })
  }
}
```

**讲解：**

1. 模式总结：**服务端与客户端首帧相同（固定提示文本）-> 浏览器端 afterNextRender 再更新为环境相关值**。
2. 三类高危写法：模板里直接调用 `Date.now()`/`Math.random()`；构造器里访问 `window`/`document`（SSR 下直接 ReferenceError）；根据 localStorage 初始化 signal。分别用固定初值、afterNextRender、注入 PLATFORM_ID 判断平台来化解。
3. 确实无法对齐的子树（如第三方图表库挂载的容器），可对根元素加 `ngSkipHydration` 属性跳过水合，这是逃生门而不是常规手段——跳过意味着该子树丢掉水合的渲染收益。
4. 水合期间的导航要排队：客户端路由在水合完成后才接管，此前的点击由事件重放暂存——理解这个顺序，"偶发点击丢失"一类反馈就能解释。
5. `inject(PLATFORM_ID)` 配合 `isPlatformBrowser(platformId)` 是老牌写法，适合"整段逻辑只属于浏览器"的场景；新代码优先 afterNextRender，判断更少、意图更清晰。
6. 读报错定位：NG0500 的消息会给出两端渲染的节点差异，先读差异、再回模板找"哪次取值依赖了环境"，比全局搜索 Date.now 高效得多。

## 6. 组件测试进阶：信号输入与自动检测

第 1 节测的是"内部状态 + 交互"，实际组件更多依赖 `input()` 接收外部数据。信号输入不能靠 `component.xxx = value` 赋值——那会绕过输入信号的写入通道，视图不会更新；标准入口是 `fixture.componentRef.setInput`。

```typescript
// ticket-row.component.ts —— 带信号输入的展示组件
import { Component, input } from "@angular/core"

@Component({
  selector: "app-ticket-row",
  template: `<span>{{ stock() > 0 ? "余票 " + stock() : "售罄" }}</span>`,
})
export class TicketRowComponent {
  stock = input.required<number>()
}
```

```typescript
// ticket-row.component.spec.ts（片段）—— setInput 驱动信号输入
it("余票为 0 时渲染售罄", () => {
  const fixture = TestBed.createComponent(TicketRowComponent)
  fixture.componentRef.setInput("stock", 0) // 信号输入的标准写入入口
  fixture.detectChanges()

  const el = fixture.nativeElement as HTMLElement
  expect(el.textContent).toContain("售罄")
})

it("正常余票显示数量", () => {
  const fixture = TestBed.createComponent(TicketRowComponent)
  fixture.componentRef.setInput("stock", 3)
  fixture.detectChanges()
  expect((fixture.nativeElement as HTMLElement).textContent).toContain("余票 3")
})
```

**讲解：**

1. `componentRef.setInput("stock", 0)` 是唯一正确的测试期写入方式：它走输入信号的完整写入路径，模板同步更新；直接 `component.stock.set(0)` 虽然对信号本身有效，但对外部传入的输入语义是不成立的。
2. 断言密集的用例可以改用 `fixture.autoDetectChanges()`，免去每步手动 detectChanges；代价是失去"精确控制渲染时机"的能力，常规用例仍推荐手动调用。
3. 涉及 resource/Promise 的异步渲染用 `await fixture.whenStable()` 等待挂起任务完成后再断言，避免"状态还没到就查 DOM"。
4. 与第 2 节的 HttpClientTesting 组合即可覆盖"输入 -> 请求 -> 渲染"全链路：setInput 给参数、假后端给数据、DOM 断言收尾——一条用例串起三节内容。
5. autoDetectChanges 与 setInput 组合适用于"信号输入 + 多状态断言"的密集用例：一条用例里连续给多档输入、验证多档渲染。
6. spec 文件之间不互相 import：每个用例文件独立可跑，共享数据与工具收敛到 helper——测试代码同样要有模块边界；helper 里的假数据工厂与业务类型保持同步，接口一改编译期即报错。

## 易错点与最佳实践

1. **模板直接调用环境相关函数**：服务端 12:00:00 渲染的倒计时与客户端 12:00:01 的不一致，水合报 NG0500。首帧用固定提示文本，浏览器端再更新：

```typescript
// 错误：两端取值必然不同
// <p>{{ Date.now() > openAt ? "已开票" : "售票中" }}</p>
// 正确：固定初值 + afterNextRender 更新（见上节组件）
text = signal("开票倒计时即将开始")
```

2. **构造器访问 window/document**：SSR 下没有浏览器对象，服务端直接抛错。用平台判断或浏览器端钩子：

```typescript
// 错误：服务端执行到这一行就崩
// constructor() { console.log(window.innerWidth) }
// 正确：只在浏览器执行
constructor() {
  afterNextRender(() => console.log(window.innerWidth))
}
```

3. **忘记 fixture.detectChanges()**：signal 改了但没同步渲染，DOM 断言永远读到旧值，排查半天组件逻辑。逻辑断言后跟一次 detectChanges 再断言 DOM。

4. **afterEach 漏 httpMock.verify()**：没 flush 的挂起请求静默通过，下一条用例莫名超时。verify 放 afterEach 是标准姿势。

5. **水合开启却仍用 XHR 后端**：不写 withFetch 时传输缓存不生效，客户端会对接口重复请求一遍，SSR 的性能收益减半。provideHttpClient(withFetch()) 与 provideClientHydration 成对出现。

## 本篇小结

1. TestBed 是"组件级沙箱"：configureTestingModule 搭环境，fixture 同时供逻辑断言与 DOM 断言，detectChanges 手动驱动渲染；spec 命名与断言写得像文档，测试才真正服务排障。
2. 服务测试用 provideHttpClientTesting：expectOne 断言请求、flush 提供响应、verify 兜底检查漏网请求。
3. `ng add @angular/ssr` 一条命令接入 SSR：构建产出浏览器与服务端两份 bundle，首屏 HTML 直出。
4. provideClientHydration 让客户端认领静态 DOM 而非重绘；withEventReplay 补上水合窗口期的点击；withFetch 才有传输缓存——三者是 SSR 首屏性能的三件套，缺一不可。
5. 水合纪律：首帧两端一致（固定提示文本），环境相关值一律延后到 afterNextRender；window/document 访问必须在浏览器端钩子内。

## 动手实践

1. **购票按钮全覆盖**：为 TicketButtonComponent 补齐"连点三次后售罄"与"售罄后点击不再发事件"两条用例，全部通过后才算完成。提示：循环调用 buy() 三次断言 stock() 为 0，再订阅 bought 验证无新事件。
2. **拦截器测试**：为 authInterceptor 写测试——providers 里同时提供真拦截器与 HttpClientTesting，断言带令牌时请求头包含 Authorization、401 响应触发 Router 导航。提示：Router 可在 providers 里用 provideRouter([]) 取真实实例，用 inject 捕获后断言 url。
3. **SSR 水合演练**：给演唱会页接入 @angular/ssr，模板里故意写一次 `{{ Date.now() }}` 观察 NG0500 报错，再用"固定初值 + afterNextRender"修复；最后对比开启水合前后的网络面板请求数。提示：报错信息里会给出不匹配的节点片段，学会读它是本次练习的隐藏目标。把这次的报错原文与排错步骤记录下来，沉淀成团队的 SSR 检查清单。
