# 运行时 Schema 校验

TypeScript 的类型在编译产物中被完全擦除：`interface Ticket` 在运行时的 JavaScript 里不存在，任何外部输入（接口响应、表单提交、环境变量、消息队列）到达时都只是"未经验证的 JSON"。`as` 断言只能说服编译器，拦不住脏数据。Schema 校验库（本篇以 zod 为例）用一份声明同时解决两个问题：运行时真正校验数据形状，编译期用 infer 推导出类型，让 schema 成为唯一事实来源。

## 前置知识

- [类型安全的环境变量](/module/typescript/043-TypeSafeEnvVar)：环境变量是最典型的运行时边界之一。
- [类型安全的表单校验](/module/typescript/044-TypeSafeFormValidation)：表单是另一个高频校验场景。
- [类型安全的 API Client](/module/typescript/041-TypeSafeAPIClient)：请求响应边界校验的工程化落地。

## 学习目标

- 能解释类型擦除与信任边界，说明 as 断言为何不提供任何运行时保护。
- 能用 zod 声明对象的 schema，并用 safeParse 得到类型化的成功或失败结果。
- 能用 z.infer 从 schema 推导类型，实现"类型与校验规则单源"。
- 能在请求、响应、环境变量三类边界上落地校验，并设计失败策略。
- 能使用 transform、refine 完成数据清洗与跨字段业务约束。

## 一、编译期类型 vs 运行时数据：类型擦除

TypeScript 的设计前提是"类型只用于编译期检查"。`tsc` 产出 JavaScript 的那一刻，所有接口、泛型、字面量联合都被删除，剩下的只有运行时数据。于是任何从外部进入程序的数据——网络响应、用户输入、环境变量——在运行时都只是形状未知的值。

```typescript
// 编译期的完美类型在运行时并不存在
interface Ticket {
  orderId: string;
  price: number;
  seatZone: 'S 区' | 'A 区' | 'B 区';
}

async function getTickets(): Promise<Ticket[]> {
  const res = await fetch('/api/tickets');
  // as 断言只是"说服编译器"：运行时 price 可能是 "660"（字符串）
  return (await res.json()) as Ticket[];
}

const tickets = await getTickets();
const total = tickets.reduce((sum, t) => sum + t.price, 0);
// 服务端一旦把 price 发成字符串，sum 会变成 NaN，编译期毫无预警
```

信任边界的概念由此而来：**程序内部**的类型经过编译器背书可以信任；**程序边界**上的数据（自己服务端返回的也算，因为版本可能不同步）必须先校验再使用。`as` 断言、`!` 非空断言都发生在编译期，对运行时数据零约束——它们不是校验手段，而是"声明我已另行保证"，没有另行保证时就是裸奔。

## 二、zod 基础与类型推导

zod 用链式调用描述数据形状，每个 schema 对象同时具备两种身份：编译期的类型来源，运行时的校验器。校验入口有两个：`parse` 失败时直接抛 `ZodError`；`safeParse` 永不抛错，返回可辨别的联合结果，更适合业务代码。

```typescript
import { z } from 'zod';

// 用 zod 描述"一张合法票券"的形状：schema 即校验器
const TicketSchema = z.object({
  orderId: z.string().min(6),               // 字符串且最少 6 位
  price: z.number().int().nonnegative(),    // 非负整数票价
  seatZone: z.enum(['S 区', 'A 区', 'B 区']), // 字面量联合
  giftCode: z.string().optional(),          // 可选字段
});

type Ticket = z.infer<typeof TicketSchema>; // 从 schema 推导出 TS 类型

// safeParse 返回可辨别的联合：success 为 true 时 data 才存在
const parsed = TicketSchema.safeParse({
  orderId: 'FDX2026',
  price: 660,
  seatZone: 'S 区',
});

if (parsed.success) {
  console.log(`票号 ${parsed.data.orderId}`); // parsed.data 类型为 Ticket
} else {
  console.log(parsed.error.issues[0]?.path, parsed.error.issues[0]?.message);
  // 例如 [ 'seatZone' ] 'Invalid enum value...'
}
```

`z.infer` 让类型完全从 schema 派生：字段改名、增删、改约束，类型自动跟着变，不需要同步两份代码。校验失败时 `error.issues` 携带路径与原因，足够生成人性化的错误提示；这是与手写 `if` 校验链相比最大的工程红利——规则、类型、错误信息集中在同一处声明。

与手写校验函数相比，schema 的价值不在于"能不能写"，而在于声明式带来的三合一：校验规则（票价必须是非负整数）、静态类型（`Ticket`）、错误信息（哪个字段、什么原因）集中在一条链式声明里，并且可组合、可复用、可在团队间作为契约讨论。手写校验链则把这三件事散落在函数体、类型声明与提示文案三处，天然容易漂移。

## 三、schema 与类型单源：用 infer 消灭两份真相

反模式是"interface 一份、schema 一份"：两边迟早漂移，而且没人能确定哪份是对的。单源化后，schema 是唯一真相，类型只是它的投影。zod 的组合方法（pick、omit、extend、merge、union）让 schema 也能像类型一样被复用与派生。

```typescript
// 反模式：类型与 schema 各写一份，迟早漂移
// interface Concert { ... } + const ConcertSchema = z.object({ ... })

// 正解：只写 schema，类型用 infer 推导
const ConcertSchema = z.object({
  id: z.string(),
  title: z.string().min(1, '标题不能为空'),
  openDate: z.string(), // ISO 日期字符串
});
type Concert = z.infer<typeof ConcertSchema>;

// schema 组合：从"演唱会"派生出"购票请求"，复用且自动同步
const OrderSchema = ConcertSchema.pick({ id: true }).extend({
  count: z.number().int().min(1).max(4), // 每单限购 4 张
});
type Order = z.infer<typeof OrderSchema>;

const order: Order = OrderSchema.parse({ id: 'c42', count: 2 });
```

进一步可以用泛型工具封装"校验即解析"的高阶函数，让边界校验成为团队标准件：

```typescript
// 通用封装：传入 schema 与解析器，产出"已验证"的数据
function parseWith<S extends z.ZodType>(schema: S, raw: unknown): z.infer<S> {
  return schema.parse(raw); // 失败抛 ZodError，由调用方决定降级策略
}

const listSchema = z.array(TicketSchema);          // schema 也可组合为数组
const tickets = parseWith(listSchema, await res.json()); // 类型为 Ticket[]
```

这里 `z.ZodType` 与 `z.infer<S>` 的配合正是条件类型与 infer 的实战应用：泛型约束"必须是一个 schema"，推断"该 schema 对应的数据类型"。

## 四、边界校验：请求、响应与环境变量

**边界一：HTTP 响应**。原则是"先当 unknown，交给 schema，通过才进应用层"。这比 `as` 断言多花三行代码，换来的是服务端任何违约都会在边界处爆出明确错误，而不是在业务深处变成 NaN 或 undefined。

```typescript
// 边界一：响应校验——解析成功才进入应用层
export async function fetchConcert(id: string): Promise<Concert> {
  const res = await fetch(`/api/concerts/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const raw: unknown = await res.json(); // 先按 unknown 处理
  const parsed = ConcertSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`演唱会数据不合法：${parsed.error.issues[0]?.message}`);
  }
  return parsed.data; // 类型是 Concert，且运行时已被证明合法
}
```

**边界二：环境变量**。进程启动时一次性校验，缺配置立即退出（fail fast），绝不带着脏配置上线。

```typescript
// 边界二：环境变量校验——启动时 fail fast
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  TICKET_SECRET: z.string().min(32, '密钥至少 32 位'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsedEnv = EnvSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error('环境变量缺失或不合法：', parsedEnv.error.flatten().fieldErrors);
  process.exit(1); // 与其线上半夜报错，不如启动时立刻暴露
}
export const env = parsedEnv.data; // 全进程共享的已验证配置
```

**边界三：用户提交**（表单、API 请求体）值得单独一提：用户输入不仅可能"格式错误"，还可能"恶意构造"，服务端永远要重新校验，前端校验只算体验优化。三类边界的失败策略也不同——响应失败可降级展示旧数据，环境变量失败应终止进程，用户输入失败应逐字段回显错误。

校验的位置也有原则：同一份数据可能流经多层函数，校验应放在数据首次进入程序的入口——响应拦截器、启动脚本、提交处理器——而不是散落在每个业务函数里。入口处完成一次校验，之后由类型系统在编译期传递这份信任，业务代码内部不再出现重复的防御性判断，这正是"边界校验一次，链路全程可信"的含义。

## 五、进阶：transform、refine 与错误格式化

真实数据很少"拿来即用"：表单传来字符串数字、昵称带空格、应援色大小写混乱。zod 允许在 schema 内完成清洗（transform）与跨字段约束（refine），让"校验通过的数据"就是业务可直接使用的数据。

```typescript
// transform 与 refine：校验的同时完成清洗与业务约束
const PurchaseSchema = z
  .object({
    buyer: z.string().trim().min(2, '粉丝团昵称太短'),   // 自动去首尾空格
    quantity: z.coerce.number().int(),                    // "2" 自动转为数字 2
    themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '应援色必须是 6 位 HEX'),
  })
  .refine((v) => v.quantity <= 4, { message: '每单最多购买 4 张' })
  .refine((v) => v.themeColor !== '#FFFFFF', { message: '白色不可作为应援色' });

type Purchase = z.infer<typeof PurchaseSchema>;

const result = PurchaseSchema.safeParse(formData);
if (!result.success) {
  // flatten 把 issues 整理为"字段名 -> 错误列表"，直接喂给表单组件
  const fieldErrors = result.error.flatten().fieldErrors;
  showFormErrors(fieldErrors); // 例如 { quantity: ['每单最多购买 4 张'] }
  return;
}
submitOrder(result.data); // 已清洗、已校验、类型精确
```

使用上有一条分寸：`transform` 适合"无损或约定明确的转换"（trim、coerce、日期解析），不适合隐藏大逻辑；`refine` 每次只表达一条业务规则，报错信息面向用户可读。复杂转换若超过三五行，应在校验通过后放到独立的业务函数中，保持 schema 声明的可读性。

错误格式化是用户体验的一部分：`issues` 中的 `path` 可以映射为表单字段名，`code` 可以映射为文案模板。对国际化产品，更稳的做法是在 schema 中只保留稳定的错误码，把文案交给 i18n 层按语言渲染，避免把某种语言的提示硬编码进校验声明。

## 六、与 TypeSafe 系列实践的衔接

Schema 校验是模块内多条 TypeSafe 实践的共同地基，它们共享"单源 + 边界"两个思想：

- **类型安全的 API Client**：响应拦截器中统一 `safeParse`，把"未验证数据不得入内"固化为架构约束，本篇第四节的 `fetchConcert` 就是其最小内核。
- **类型安全的环境变量**：EnvSchema 模式即启动时 fail fast 的标准实现，配合 default 与 enum 可以覆盖绝大多数配置形态。
- **类型安全的表单校验**：`error.flatten().fieldErrors` 的结构与常见表单库的字段错误模型一一对应，schema 可直接作为表单校验源（配合适配器即可接入）。

贯穿三者的决策准则是：**在离数据产生最近的地方校验，在离使用最远的地方信任类型**。schema 声明放在边界层（api 客户端、config 模块、表单提交入口），业务代码只消费推导出的静态类型，不再出现任何防御性判断。

## 易错点与最佳实践

1. **用 as 断言替代校验**。错误代码与修正：

```typescript
// const data = (await res.json()) as Concert[]; // 反例：运行时零保护

// 修正：unknown 进入，schema 校验，data 既有类型又有运行时保证
const raw: unknown = await res.json();
const data = z.array(ConcertSchema).parse(raw);
```

2. **parse 与 safeParse 混用导致未捕获异常**。`parse` 失败会抛 `ZodError`，在没包 try/catch 的请求处理器里就是一次 500。修正：库代码与中间件里统一用 `safeParse` 加显式分支；确定"非法即致命"的场景才用 `parse` 并在更上层兜底。

3. **schema 与手写类型并存**。团队里出现 `interface Concert` 与 `ConcertSchema` 两份定义后，约束变更只改其一，类型形同虚设。修正：删除手写类型，导出 `type Concert = z.infer<typeof ConcertSchema>`，并在代码评审中禁止出现与 schema 平行的 interface。

4. **滥用 coerce 掩盖数据问题**。`z.coerce.number()` 会把空串、null 分别转成 0 与 0 或报错，静默转换可能把脏数据洗成合法值。修正：仅在输入格式约定明确（如表单字符串数字）的字段使用，接口响应等可信赖结构化来源应要求原始类型正确。

5. **错误信息直接透出给用户**。`issues` 的默认文案面向开发者（"Invalid enum value"），不适合直接展示。修正：用自定义 message 或按 issue 的 path 与 code 映射为用户语言。

## 本篇小结

- 类型在编译产物中被擦除，边界上的数据必须运行时校验；as 断言不提供任何保护。
- zod schema 一份声明同时产出校验器与类型：safeParse 给出可辨别结果，z.infer 推导静态类型。
- 单源原则：schema 是唯一真相，类型是投影；pick、extend、array 等组合方法让 schema 可复用。
- 三类边界各有失败策略：响应失败可降级、环境变量失败即退出、用户输入失败逐字段回显。
- transform 负责清洗、refine 负责业务约束，校验通过的数据应能被业务直接消费。

## 动手实践

1. **响应校验中间件**：为 API Client 实现 `withSchema(schema, fetcher)` 包装器，所有响应先过 schema 再返回。思路：封装 safeParse 分支，失败时抛出携带 schema 名与 issue 摘要的自定义错误；为不同接口建立 schema 注册表。

2. **购票表单的完整链路**：用 PurchaseSchema 同时驱动前端表单校验与服务端请求体校验，观察两端报错信息是否一致。思路：前端用 flatten 结果渲染字段错误；服务端复用同一 schema（放共享包），对比"单源"与"两端各写一套"的维护成本。

3. **环境变量启动自检**：为本项目设计 EnvSchema，包含必填、可选默认与格式约束三类字段，故意注入错误配置观察 fail fast 行为。思路：把 `env` 对象设为模块单例导出；思考为什么校验必须发生在任何业务代码执行之前。
