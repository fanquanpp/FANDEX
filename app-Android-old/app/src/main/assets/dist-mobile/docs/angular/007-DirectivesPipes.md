# 指令与管道

组件复用的是"一整块 UI"，而当需求缩小到"给一堆元素加同一种行为"或"把数据渲染成统一的格式"时，就该轮到指令与管道：指令附着在元素上改变它的外观、行为甚至存在与否；管道是模板里的纯函数，把 `#39c5bb` 变成"初音绿"、把时间戳变成"3 天后开票"。本篇讲清指令的三种形态与结构指令的底层原理，对比内置控制流 @if/@for 的现代写法，最后落到自定义管道与纯/非纯的取舍。

## 前置知识

- [Angular 组件与模板语法](/angular/002-QuickStartComponentTemplate)：会写插值、属性绑定与事件绑定，理解模板是"HTML 加绑定"。
- [信号与组件通信](/angular/003-SignalsInputsOutputs)：掌握 signal/computed 与 input()/output()，指令的输入同样用这套 API。
- [进阶学习路线图](/angular/006-AdvancedRoadmap)：了解本篇在"模板复用"一站中的位置。

## 学习目标

1. 能说出指令的三种形态及各自的适用场景。
2. 会写属性指令，并用 host 绑定集中管理样式与事件。
3. 理解结构指令的原理：TemplateRef、ViewContainerRef 与语法脱糖。
4. 会用内置控制流 @if/@for，并正确设置 track。
5. 会写自定义管道，能判断该用纯管道、非纯管道还是 computed。

## 1. 指令三分法

Angular 里"改变模板"的能力分三级：组件是带模板的指令，负责一整块视图；属性指令（Attribute Directive）附着在元素上，改变外观或行为，如 `ngClass`、`ngStyle`；结构指令（Structural Directive）通过增删 DOM 改变布局，如 `ngIf`、`ngFor`。三者用同一个 `@Directive` 装饰器声明，差别只在 selector 形态与是否操作视图容器。

| 形态 | selector 形态 | 改变什么 | 平台例子 |
| --- | --- | --- | --- |
| 组件 | 标签 `app-singer-card` | 一整块 UI | 歌姬卡片 |
| 属性指令 | `[appXxx]` | 元素样式/行为 | 应援色高亮 |
| 结构指令 | `*appXxx` | 增删 DOM | 有票才渲染购票入口 |

**讲解：**

1. 判断用哪种：改动"一个元素的样子与反应"用属性指令，改动"这块 DOM 存不存在"用结构指令，改动"一整块页面"直接写组件。
2. 现代项目里结构指令大多被内置控制流（第 4 节）替代，但理解其原理仍是读懂框架与第三方库的前提。
3. 指令与组件一样支持 `input()`/`output()` 与依赖注入，可以视为"没有模板的组件"。
4. 复用半径从大到小：组件复用一整块 UI，结构指令复用一块 DOM 的存在性，属性指令复用一种行为，管道复用一种格式——半径越小，实现越轻，优先用轻的。
5. 独立组件时代，指令与管道都要在使用它们的组件 `imports` 数组里显式登记——模板里"找不到指令"十有八九是忘了 import，而不是写法错了。

## 2. 属性指令与 host 绑定

```typescript
// theme-highlight.directive.ts —— 应援色高亮：属性指令
import { Directive, input, inject, ElementRef } from "@angular/core"

@Directive({
  selector: "[appThemeHighlight]",
  host: {
    // host 绑定集中声明：边框跟随应援色，激活时铺一层底色
    "[style.border-color]": "color()",
    "[style.background]": "active() ? color() + '22' : 'transparent'",
    "(click)": "onPick()",          // host 事件监听，取代手动 addEventListener
  },
})
export class ThemeHighlightDirective {
  // input() 与组件一致：required 强制调用方传应援色
  color = input.required<string>()
  active = input(false)

  private el = inject(ElementRef)

  onPick() {
    // 点击卡片平滑滚动到顶部投票区（示例行为）
    this.el.nativeElement.scrollIntoView({ behavior: "smooth" })
  }
}
```

```html
<!-- singer-card.component.html —— 指令名与输入同名，一写两用 -->
<div
  class="singer-card"
  [appThemeHighlight]="singer.theme"
  [active]="voting()"
>
  {{ singer.name }}
</div>
```

**讲解：**

1. selector 写成 `[appThemeHighlight]` 表示"属性形态"，宿主元素写上该属性指令即生效；把输入名与指令名取成同一个，`[appThemeHighlight]="singer.theme"` 同时完成"挂载 + 传值"。
2. `host` 对象把宿主元素的绑定与事件集中到一处：样式跟随信号自动更新，不需要在代码里手动操作 class 或 style。
3. 属性指令是"最小侵入"的复用单元：一行 HTML 让任意元素获得高亮行为，不必为它包一层组件、多出一层 DOM。
4. 属性指令天然支持叠加：同一张卡片同时挂 appThemeHighlight 与 NgClass，各自管理各自的样式维度，互不冲突——把"行为"拆成小指令正是价值所在。
5. 指令与组件的 selector 可以落在同一个元素上：`<div class="card" appSongCard [appThemeHighlight]="theme">` 各自独立生效，指令不关心宿主是不是组件。
6. 指令也能对外发事件：host 里绑定 output()，属性指令同样可以"收输入、发输出"，不是只进不出的哑挂件。

## 3. 结构指令原理与 TemplateRef

`*appXxx` 语法糖的背后是 ng-template：Angular 把宿主元素包进模板，指令决定这张"图纸"要不要渲染成真实 DOM。

```typescript
// ticket-if.directive.ts —— 自定义结构指令：有票才渲染购票入口
import {
  Directive, input, effect, inject,
  TemplateRef, ViewContainerRef, EmbeddedViewRef,
} from "@angular/core"

@Directive({ selector: "[appTicketIf]" })
export class TicketIfDirective {
  private templateRef = inject(TemplateRef)         // 包裹的模板"图纸"
  private viewContainer = inject(ViewContainerRef)  // 创建/销毁视图的容器
  private view?: EmbeddedViewRef<unknown>

  // *appTicketIf="stock() > 0" 脱糖为 [appTicketIf]，值流入同名输入
  condition = input.required<boolean>({ alias: "appTicketIf" })

  constructor() {
    // 条件变化时增删内嵌视图——这就是结构指令的全部秘密
    effect(() => {
      const show = this.condition()
      if (show && !this.view) {
        this.view = this.viewContainer.createEmbeddedView(this.templateRef)
      } else if (!show && this.view) {
        this.view.destroy()
        this.view = undefined
      }
    })
  }
}
```

```html
<!-- 用法：星号形态 -->
<button *appTicketIf="stock() > 0">立即购票（余 {{ stock() }}）</button>
```

**讲解：**

1. 脱糖规则：`<button *appTicketIf="stock() > 0">` 等价于 `<ng-template [appTicketIf]="stock() > 0"><button>...</button></ng-template>`——宿主元素被搬进 ng-template，由指令决定何时实例化。
2. `TemplateRef` 是图纸本身，`ViewContainerRef` 是施工点；`createEmbeddedView` 才真正产生 DOM，`destroy` 把它连根移除，事件监听一并清理。
3. 结构指令不渲染时的元素"不存在于 DOM"：这与 `[hidden]` 只隐藏样式有本质区别，权限控制必须用前者。
4. 结构指令还支持 microsyntax 上下文：`createEmbeddedView(templateRef, { $implicit: value })` 传入上下文对象后，模板里就能用 `let item`、`as` 语法取值——ngFor 的 `let i = index` 正是这么实现的。
5. selector 还能写组合约束：`selector: "[appTicketIf][open]"` 要求元素同时具备两个属性才激活指令——多条件激活的标准技巧。
6. 调试技巧：ng-template 内容不渲染时，先在 createEmbeddedView 与 destroy 各打一条日志——视图是否创建、何时销毁一目了然。
7. 与内置控制流的分工：@if/@for 覆盖日常分支与循环，"权限、特征开关、票务状态"这类有业务语义的条件渲染才值得封装成结构指令。

## 4. 内置控制流 @if/@for 与 track

```typescript
// setlist.component.ts —— 内置控制流：@if/@for 取代 NgIf/NgFor
import { Component, signal } from "@angular/core"

interface Song { id: number; title: string; producer: string }

@Component({
  selector: "app-setlist",
  template: `
    @if (stock() > 0) {
      <button class="buy">立即购票（余 {{ stock() }}）</button>
    } @else {
      <p class="soldout">本场已售罄</p>
    }

    @for (song of setlist(); track song.id) {
      <li>{{ song.title }}（P主：{{ song.producer }}）</li>
    } @empty {
      <li>曲单整理中，敬请期待</li>
    }
  `,
})
export class SetlistComponent {
  stock = signal(120)
  setlist = signal<Song[]>([
    { id: 1, title: "星之歌", producer: "DECO*27" },
    { id: 2, title: "回声", producer: "古川本铺" },
  ])
}
```

**讲解：**

1. `@if/@else` 与 `@for` 是模板内建语法：编译后同样走 ViewContainerRef 增删视图，但可读性与编译期检查都优于自定义结构指令，日常优先使用。
2. `@for` 的 `track` 必填：告诉框架用 `song.id` 识别每个元素的身份，列表增删、排序时只移动既有 DOM 而不是整表重建，这是列表性能的关键。
3. `track` 要用稳定唯一值；`track $index` 会让"插入到头部"变成全部元素更新，带内部状态的行还会错位。
4. `@empty` 分支处理空列表，不再需要 `@if (list().length === 0)` 的额外判断。
5. 内建控制流还有 @switch 与 @defer：多分支枚举渲染用 @switch 替代连续 @if，重型区块（图表、播放器）用 @defer 延迟加载，两者同样无需任何导入。
6. @for 还有隐式变量可用：$index、$count、$first、$last 覆盖序号列、奇偶行斑马纹等常见诉求，不需要为此写管道或组件逻辑。

## 5. 自定义管道与纯/非纯

```typescript
// theme-name.pipe.ts —— 纯管道：应援色 hex -> 展示名
import { Pipe, PipeTransform } from "@angular/core"

const THEME_NAMES: Record<string, string> = {
  "#39c5bb": "初音绿",
  "#eba9ee": "Teto 粉",
}

@Pipe({ name: "themeName" })
export class ThemeNamePipe implements PipeTransform {
  transform(hex: string): string {
    return THEME_NAMES[hex.toLowerCase()] ?? "未收录色"
  }
}
```

```typescript
// countdown.pipe.ts —— 非纯管道：依赖时间的倒计时（示意，慎用）
import { Pipe, PipeTransform } from "@angular/core"

@Pipe({ name: "countdown", pure: false })   // pure: false = 非纯
export class CountdownPipe implements PipeTransform {
  transform(openAt: string): string {
    const diff = new Date(openAt).getTime() - Date.now()
    return diff > 0 ? `距开票 ${Math.ceil(diff / 60000)} 分钟` : "已开票"
  }
}
```

```html
<!-- 模板中链式使用：先转名，再统一大写 -->
<span>{{ singer.theme | themeName }}</span>
<span class="uppercase">{{ ticket.price | number: "1.0-0" }} CNY</span>
```

**讲解：**

1. 管道是模板里的纯函数：`transform` 输入转输出，不持有状态、不产生副作用，这是它与方法的本质区别（方法在每次变更检测都会重跑）。
2. 纯管道（默认）只在输入引用变化时执行：信号值一变、管道重算一次，性能可靠，90% 的格式化需求都该是纯管道。
3. 非纯管道（`pure: false`）在每次变更检测都执行，只有像倒计时这种"输入不变、输出也该变"的场景才需要；更现代的替代是用 `computed` 加 `interval` 维护一个倒计时信号，把"时间流动"显式建模（见 [HttpClient 与状态管理](/angular/008-HttpClientStateManagement)）。
4. 内置管道（number、date、currency、json）优先于自造轮子，链式管道从左到右依次执行；date 的日期格式、number 的千分位、currency 的货币符号覆盖了八成格式化需求，先查内置再自己写。
5. 管道也能依赖注入（transform 之外可以 inject 服务），但注入只会强化"管道变胖"的倾向：数据准备留给 computed，管道保持纯粹的格式化。
6. 管道测试不必 TestBed：`new ThemeNamePipe().transform("#39c5bb")` 直接断言返回值——纯函数就该有纯函数的测试法，又快又稳。

## 6. 组合实战：票档卡片组件

单个能力各自成篇，价值要在组合里体现。下面这个票档卡片组件把本篇三种复用——属性指令、内置控制流、管道——放进同一个模板，这也是日常业务组件的典型形态。

```typescript
// tier-card.component.ts —— 指令 + 控制流 + 管道的组合
import { Component, signal } from "@angular/core"
import { ThemeHighlightDirective } from "./theme-highlight.directive"
import { ThemeNamePipe } from "./theme-name.pipe"

interface Tier { name: string; price: number }

@Component({
  selector: "app-tier-card",
  imports: [ThemeHighlightDirective, ThemeNamePipe], // 独立组件：用谁导入谁
  template: `
    <div class="tier" [appThemeHighlight]="singer().theme">
      <h3>{{ singer().name }}｜{{ singer().theme | themeName }}</h3>

      @for (tier of tiers(); track tier.name) {
        <span class="price">{{ tier.name }} {{ tier.price | number: "1.0-0" }} 元</span>
      } @empty {
        <span>票档未公布</span>
      }

      @if (tiers().length > 0) {
        <button class="buy">进入选座</button>
      }
    </div>
  `,
})
export class TierCardComponent {
  singer = signal({ name: "初音未来", theme: "#39c5bb" })
  tiers = signal<Tier[]>([
    { name: "内场", price: 1280 },
    { name: "看台", price: 480 },
  ])
}
```

**讲解：**

1. `imports` 数组是独立组件的依赖声明：指令与管道同组件一样"用谁导入谁"，没有 NgModule 的隐式全局。
2. 三个复用各司其职：指令负责"卡片跟随应援色"的外观复用，@for/@empty 负责列表结构，管道负责数字与主题名的展示格式——模板从上读下来就是业务本身，没有一行格式化代码混在逻辑里。
3. 数据来自信号（见 [信号与组件通信](/angular/003-SignalsInputsOutputs)）：tiers() 变化时 @for 按 track 增量更新，指令与管道自动跟随，无需手动刷新。
4. 复用的判定顺序：能用内置管道不写自定义管道，能用 @if 不写结构指令，只有"多处出现同样的行为"才封装成指令——复用是为业务服务的，不是为复用而复用；新增前先搜一遍现有指令与管道，避免重复造轮子。

## 易错点与最佳实践

1. **@for 忘记 track 或用 $index**：框架退化为"全列表重建"，长列表滚动卡顿、行内状态错乱。用稳定业务 id：

```typescript
// 错误：按索引跟踪，排序时全部行被重建
// @for (song of setlist(); track $index) { ... }
// 正确：按唯一 id 跟踪，DOM 复用
@for (song of setlist(); track song.id) { ... }
```

2. **非纯管道承担重计算**：`pure: false` 的管道每次变更检测都跑，列表过滤放进去就是性能灾难。过滤/聚合移到 `computed`，管道只做展示层格式化：

```typescript
// 错误：非纯管道里过滤大列表
// transform(songs) { return songs.filter(s => s.onSale) }
// 正确：computed 派生，管道只格式化单个值
onSale = computed(() => this.songs().filter((s) => s.onSale))
```

3. **结构指令绕过 ViewContainerRef 直接改 DOM**：手动 appendChild 绕开了框架的视图管理，销毁时机失控。增删 DOM 一律通过 `viewContainer.createEmbeddedView`/`destroy`。

4. **权限控制用 [hidden] 代替结构移除**：`[hidden]="!isAdmin"` 只是 CSS 隐藏，DOM 与数据仍在，按 F12 即可绕过。涉及权限的 UI 必须用 @if 或结构指令真正移除。

5. **管道里做请求或写状态**：transform 触发频率不可控，副作用放管道里会被反复调用。请求进服务、状态进 signal，管道保持纯函数。

## 本篇小结

1. 指令三分法：组件带模板管一整块，属性指令管元素样式与行为，结构指令管 DOM 存在与否；三者共享 input()/output() 与依赖注入。
2. 属性指令用 host 绑定集中声明样式与事件，输入与指令同名可"一写两用"，是侵入最小的复用单元。
3. 结构指令的本质是 TemplateRef + ViewContainerRef：星号语法脱糖为 ng-template，指令决定图纸何时实例化。
4. 内置控制流 @if/@for 是结构指令的现代替代：`track` 必填且要用稳定唯一 id，`@empty` 处理空列表；两者与自定义结构指令在编译产物上等价，选择标准是可读性。
5. 管道是模板纯函数：默认纯管道按引用变化执行；倒计时类场景要么非纯管道、要么 computed + interval 显式建模，重计算永远放 computed。

## 动手实践

1. **应援色指令扩展**：给 ThemeHighlightDirective 增加"按主题色生成文字色"的逻辑（深色底配白字），并支持 `host` 上的鼠标悬停缩放效果。提示：在 host 里补 `"(mouseenter)"` 与 `"(mouseleave)"`，用一个内部 signal 记录悬停态。
2. **appUntil 结构指令**：实现与 appTicketIf 相反语义的 `*appUntil="deadlinePast()"`——条件为假才渲染（用于"售票未开始"提示）。提示：复制 TicketIfDirective，反转 effect 中的判断；再用 @if 对照实现，比较两种写法。
3. **票档管道组**：写三个纯管道——priceCNY（分转元并格式化）、seatZone（A 区/ B 区前缀映射）、stockLabel（余票数转"充足/紧张/售罄"），在票档列表里链式使用。提示：每个管道控制在 10 行内，用同一份票档数据验证组合输出。完成后为每个管道补一条纯类测试：直接实例化调用 transform，不依赖 TestBed。
