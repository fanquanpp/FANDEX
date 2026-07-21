---
order: 74
title: 类型安全的表单验证
module: typescript
category: TypeScript
difficulty: advanced
description: 构建类型安全的表单验证系统
author: fanquanpp
updated: '2026-07-21'
related:
  - typescript/类型安全的状态管理
  - typescript/类型安全的API客户端
  - typescript/类型安全的国际化
  - typescript/类型安全的路由
prerequisites:
  - typescript/语法速查
---

## 学习目标

完成本章学习后，读者应能够在以下认知层级（Bloom 分类法）达到相应能力：

1. **记忆（Remember）**：复述类型系统与运行时验证的对偶关系，列举主流 Schema 验证库（zod、io-ts、ajv、yup、valibot）的核心 API。
2. **理解（Understand）**：解释 TypeScript 静态类型在运行时被擦除的根本原因，说明 Schema 单源真理（Single Source of Truth）如何消除类型与验证逻辑的漂移。
3. **应用（Apply）**：使用 zod 或 io-ts 为真实表单编写端到端类型安全的验证代码，覆盖字符串、数字、日期、枚举、数组、对象等基础类型。
4. **分析（Analyze）**：对比静态类型与运行时验证的边界，识别两者语义不一致的场景（如 `string` 与 `NonEmptyString`、`number` 与 `FiniteNumber`）。
5. **评价（Evaluate）**：评估不同 Schema 库在性能、Bundle 体积、错误信息可读性、生态成熟度等维度的权衡，为项目选型给出依据。
6. **创造（Create）**：设计并实现一个支持异步验证、跨字段依赖、条件分支、国际化错误消息的通用表单验证框架。

## 历史动机与背景

表单验证是 Web 应用中最古老、最普遍、也最容易出错的需求之一。从 1995 年 JavaScript 诞生之初，开发者就在浏览器端编写手动的 `if` 判断来阻止非法输入提交到服务器。然而，三十年来表单验证的工程化演进并非线性，而是经历了多个阶段：

### 阶段一：命令式手动验证（1995-2010）

早期的表单验证完全依赖命令式代码：

```javascript
// 1990 年代末典型的表单验证代码
function validateForm() {
  var username = document.forms[0].username.value;
  var email = document.forms[0].email.value;
  var age = document.forms[0].age.value;

  if (username.length < 3) {
    alert('用户名至少 3 个字符');
    return false;
  }
  if (!email.includes('@')) {
    alert('邮箱格式不正确');
    return false;
  }
  if (isNaN(parseInt(age)) || parseInt(age) < 0) {
    alert('年龄必须是非负整数');
    return false;
  }
  return true;
}
```

这种模式的根本缺陷在于：

- **验证逻辑与 UI 强耦合**：每个表单字段都要重复写 `getElementById` 和 `alert`。
- **缺乏可复用性**：同一套邮箱校验规则散落在数十个页面中。
- **前后端规则漂移**：前端用正则 `/^\S+@\S+$/`，后端用 RFC 5322 完整规范，结果前端通过但后端拒绝，或反之。
- **不可测试**：验证逻辑嵌在事件处理器里，单元测试几乎无法编写。

### 阶段二：声明式验证库（2010-2018）

jQuery Validation（2006）、validator.js（2012）、yup（2014）等库引入了声明式 API：

```javascript
// yup 的声明式 Schema
const schema = yup.object({
  username: yup.string().min(3, '用户名至少 3 个字符').required(),
  email: yup.string().email('邮箱格式不正确').required(),
  age: yup.number().min(0, '年龄必须是非负整数').required(),
});

// 验证
schema.validate({ username: 'ab', email: 'invalid', age: -1 })
  .catch(err => console.log(err.errors));
// ["用户名至少 3 个字符"]
```

这一阶段的核心进步是**将验证规则从 UI 中抽离**，规则可复用、可组合、可测试。但问题依然存在：**Schema 定义的运行时类型与 TypeScript 静态类型是两套独立的系统**。开发者不得不为同一份数据维护两份类型定义：

```typescript
// 静态类型（编译时）
interface UserForm {
  username: string;
  email: string;
  age: number;
}

// Schema（运行时）
const userSchema = yup.object({
  username: yup.string().min(3).required(),
  email: yup.string().email().required(),
  age: yup.number().min(0).required(),
});

// 两份定义之间没有编译期约束，一旦 schema 变更而 interface 忘记同步，
// 类型检查仍然通过，但运行时行为与类型声明不一致
```

这种"两套类型"问题在 2017 年 TypeScript 普及后变得愈发突出。

### 阶段三：类型安全的 Schema 库（2018-至今）

io-ts（2017）首次系统性地解决了"两套类型"问题，其核心思想是：**Schema 本身就是类型定义**，通过 TypeScript 的类型推导能力，从运行时 Schema 自动生成静态类型。

```typescript
import * as t from 'io-ts';

// 一份定义同时服务运行时验证与编译时类型
const UserCodec = t.type({
  username: t.refinement(t.string, s => s.length >= 3, 'MinLength'),
  email: t.string,
  age: t.refinement(t.number, n => n >= 0, 'NonNegative'),
});

// 自动推导出静态类型
type User = t.TypeOf<typeof UserCodec>;
// 等价于 { username: string; email: string; age: number }
```

随后 zod（2020）、valibot（2022）等库进一步完善了这一理念，提供了更友好的 API、更小的 Bundle 体积和更强大的类型推导能力。本章将系统讲解这一范式的理论基础与工程实践。

### 阶段四：编译时验证与 RFC 9114 的启示（2022-至今）

近年来，TypeScript 模板字面量类型和递归类型的成熟使得部分验证逻辑可以在编译时完成。例如 `ts-pattern`、`type-fest` 等库利用类型系统实现了正则匹配、URL 解析等验证。然而，编译时验证受限于类型系统的图灵完备性边界，无法覆盖所有运行时场景（如网络请求、用户输入）。因此，**Schema 驱动的运行时验证仍然是表单验证的主流方案**，而编译时验证作为补充手段用于静态可判定的场景。

## 形式化定义

### 表单验证系统的形式化模型

一个完整的表单验证系统可以形式化为七元组：

$$
\mathcal{V} = (F, S, R, E, T, I, M)
$$

其中各分量定义如下：

- $F$：**表单数据空间**（Form Data Space），所有可能的输入数据构成的集合。在 TypeScript 中对应 `unknown` 或 `Record<string, unknown>`。
- $S$：**Schema 空间**（Schema Space），所有验证规则的集合。每个 Schema $s \in S$ 是一个从数据到验证结果的函数 $s: F \to \text{Result}$。
- $R$：**验证结果空间**（Result Space），$R = \{\text{Success}(v) \mid v \in V\} \cup \{\text{Failure}(e) \mid e \in E\}$，其中 $V$ 是合法值集合，$E$ 是错误集合。
- $E$：**错误空间**（Error Space），结构化错误的集合，包含字段路径、错误码、错误消息等。
- $T$：**类型映射函数**（Type Mapping），$T: S \to \text{Type}$，将运行时 Schema 映射到 TypeScript 静态类型。
- $I$：**解释器**（Interpreter），$I: S \times F \to R$，执行实际验证逻辑。
- $M$：**消息映射**（Message Map），$M: E \to \text{LocalizedString}$，将错误码映射到本地化消息。

### Schema 的代数结构

Schema 集合 $S$ 在组合操作下构成一个**幺半群（Monoid）**：

$$
(S, \otimes, \epsilon)
$$

其中：

- $\otimes$：Schema 组合操作（如 `intersection`、`merge`），满足结合律 $(s_1 \otimes s_2) \otimes s_3 = s_1 \otimes (s_2 \otimes s_3)$。
- $\epsilon$：单位元（如 `z.never()` 或空对象 Schema），满足 $s \otimes \epsilon = s = \epsilon \otimes s$。

这一代数性质保证了 Schema 可以任意组合而不破坏语义，是构建复杂表单验证的数学基础。

### 类型映射的保持性

类型映射函数 $T$ 应当满足以下**保持性（Preservation）**条件：

$$
\forall s_1, s_2 \in S: T(s_1 \otimes s_2) = T(s_1) \mathbin{\&} T(s_2)
$$

即 Schema 组合的类型映射应当等于类型组合（交叉类型）。类似地，对联合 Schema：

$$
T(s_1 \oplus s_2) = T(s_1) \mathbin{|} T(s_2)
$$

zod、io-ts 等库的设计严格遵循这一保持性，从而保证了"一份 Schema 定义，一份类型真理"。

### 验证正确性的形式化定义

对于给定的 Schema $s$ 和数据 $d \in F$，验证的正确性定义为：

$$
\text{Valid}(s, d) \iff d \in \text{Sem}(T(s))
$$

其中 $\text{Sem}(T(s))$ 是静态类型 $T(s)$ 的运行时语义解释集合。即数据 $d$ 通过 Schema $s$ 验证当且仅当 $d$ 属于该类型在运行时的合法值集合。理想情况下，Schema 应当是类型的**精确运行时证人（Exact Runtime Witness）**，既不放宽也不收紧。

## 理论推导

### 推导一：类型擦除定理

**定理**：TypeScript 的静态类型在运行时被完全擦除，无法用于运行时验证。

**证明**：

TypeScript 编译器将源代码翻译为 JavaScript，编译过程遵循以下规则：

$$
\frac{\Gamma \vdash e : \tau \quad \text{erase}(\tau) = \emptyset}{\Gamma \vdash \text{compile}(e) = e'}
$$

其中 $\text{erase}$ 函数将类型注解、泛型参数、接口定义等映射为空。考虑以下 TypeScript 代码：

```typescript
interface User { name: string; age: number }
const u: User = { name: 'Alice', age: 30 };
```

编译后为：

```javascript
const u = { name: 'Alice', age: 30 };
```

类型 `User` 在运行时不存在，因此无法通过 `typeof u === 'User'` 等方式判断数据是否合法。这一推导表明：**运行时验证必须依赖独立的运行时结构**，Schema 库正是填补这一空白的工具。

### 推导二：Schema 与类型的对偶性

**定理**：在类型映射 $T$ 满足保持性的前提下，Schema $s$ 与其类型 $T(s)$ 构成 Galois 连接。

**证明**：

定义偏序关系 $\leq_S$（Schema 严格性）和 $\leq_T$（类型子类型关系），满足：

$$
s_1 \leq_S s_2 \iff \text{Sem}(s_1) \subseteq \text{Sem}(s_2)
$$

$$
\tau_1 \leq_T \tau_2 \iff \tau_1 \text{ 是 } \tau_2 \text{ 的子类型}
$$

则存在单调函数 $T: S \to \text{Type}$ 和 $W: \text{Type} \to S$（$W$ 为类型到 Schema 的反向映射，即"证人生成"），使得：

$$
s \leq_S W(T(s)) \quad \text{且} \quad T(W(\tau)) \leq_T \tau
$$

这一 Galois 连接保证了 Schema 与类型之间的信息保持。当 $T(W(\tau)) = \tau$ 时，称该类型是**可完全证人化的**（Completely Witnessable），即存在一个 Schema 能精确刻画该类型的运行时语义。多数实用类型（如带约束的字符串、有限枚举、对象结构）是可完全证人化的，但存在例外（如函数类型、抽象类型）。

### 推导三：异步验证的可组合性

**定理**：异步验证函数在 `Promise.all` 组合下构成 Monad。

**证明**：

定义异步验证函数类型：

$$
\text{AsyncValidator}(A) = A \to \text{Promise}(\text{Result}(A))
$$

其 `return`（`pure`）和 `bind`（`flatMap`）操作为：

$$
\text{pure}(a) = \text{Promise.resolve}(\text{Success}(a))
$$

$$
\text{bind}(v, f) = v(a).\text{then}(r \Rightarrow r.\text{case}(\text{Success} \mapsto f, \text{Failure} \mapsto \text{Promise.resolve}))
$$

可以验证 Monad 三定律：

1. **左单位律**：$\text{bind}(\text{pure}(a), f) = f(a)$
2. **右单位律**：$\text{bind}(v, \text{pure}) = v$
3. **结合律**：$\text{bind}(\text{bind}(v, f), g) = \text{bind}(v, a \Rightarrow \text{bind}(f(a), g))$

这一性质意味着多个异步验证可以串行（`bind`）或并行（`Promise.all`）组合而不破坏语义，是构建复杂异步表单验证（如远程用户名查重、信用卡校验）的理论基础。

### 推导四：错误聚合的半群结构

**定理**：验证错误在合并操作下构成半群。

**证明**：

定义错误合并操作 $\oplus$：

$$
e_1 \oplus e_2 = \text{concat}(e_1.\text{path}, e_2.\text{path}).\text{concat}(\text{messages})
$$

满足结合律 $(e_1 \oplus e_2) \oplus e_3 = e_1 \oplus (e_2 \oplus e_3)$，但不存在单位元（空错误表示成功，不属于错误空间）。因此错误集合在 $\oplus$ 下构成半群而非幺半群。

这一定理解释了为何主流 Schema 库（zod、io-ts）提供 `.safeParse()` 返回所有错误而非在第一个错误处短路——错误聚合在数学上是自然的，而在第一个错误处短路是工程上的权衡。

## 代码示例

### 示例 1：zod 基础 Schema

```typescript
// 使用 zod 定义表单 Schema
import { z } from 'zod';

// 定义用户注册表单的 Schema
// 每个字段都包含类型约束与错误消息
const registerSchema = z.object({
  // 用户名：3-20 个字符，仅字母数字下划线
  username: z
    .string()
    .min(3, '用户名至少 3 个字符')
    .max(20, '用户名最多 20 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),

  // 邮箱：标准邮箱格式
  email: z
    .string()
    .min(1, '邮箱不能为空')
    .email('邮箱格式不正确'),

  // 密码：至少 8 个字符，包含字母和数字
  password: z
    .string()
    .min(8, '密码至少 8 个字符')
    .regex(/[a-zA-Z]/, '密码必须包含字母')
    .regex(/[0-9]/, '密码必须包含数字'),

  // 确认密码：使用 refine 进行跨字段验证
  confirmPassword: z.string(),

  // 年龄：18-120 之间的整数
  age: z
    .number()
    .int('年龄必须是整数')
    .min(18, '必须年满 18 岁')
    .max(120, '年龄不能超过 120'),

  // 同意条款：必须为 true
  agreeTerms: z
    .boolean()
    .refine(v => v === true, '必须同意服务条款'),
}).refine(
  // 跨字段验证：密码与确认密码必须一致
  data => data.password === data.confirmPassword,
  {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'], // 错误挂在 confirmPassword 字段上
  }
);

// 从 Schema 推导出 TypeScript 类型
type RegisterForm = z.infer<typeof registerSchema>;
// 等价于：
// {
//   username: string;
//   email: string;
//   password: string;
//   confirmPassword: string;
//   age: number;
//   agreeTerms: boolean;
// }

// 执行验证
const result = registerSchema.safeParse({
  username: 'ab',
  email: 'invalid-email',
  password: 'weak',
  confirmPassword: 'different',
  age: 15,
  agreeTerms: false,
});

if (!result.success) {
  // 输出所有错误，包含路径与消息
  result.error.issues.forEach(issue => {
    console.log(`${issue.path.join('.')}: ${issue.message}`);
  });
  // 输出：
  // username: 用户名至少 3 个字符
  // email: 邮箱格式不正确
  // password: 密码至少 8 个字符
  // password: 密码必须包含字母
  // password: 密码必须包含数字
  // age: 必须年满 18 岁
  // agreeTerms: 必须同意服务条款
  // confirmPassword: 两次输入的密码不一致
} else {
  // result.data 已是 RegisterForm 类型，类型安全
  console.log(result.data.username);
}
```

### 示例 2：io-ts 的 Either 模式

```typescript
import * as t from 'io-ts';
import { isRight, Either, fold } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

// io-ts 使用函数式编程风格，验证结果是 Either<Errors, A>
const UserCodec = t.type({
  // t.refinement 在基础类型上附加运行时谓词
  username: t.refinement(
    t.string,
    s => s.length >= 3 && s.length <= 20,
    'UsernameLength'
  ),
  email: t.string,
  age: t.refinement(
    t.number,
    n => Number.isInteger(n) && n >= 18 && n <= 120,
    'ValidAge'
  ),
});

// 自动推导类型
type User = t.TypeOf<typeof UserCodec>;

// 验证函数返回 Either
const validateUser = (input: unknown): Either<t.Errors, User> =>
  UserCodec.decode(input);

// 使用 fold 处理成功与失败分支
const handleMessage = fold(
  (errors: t.Errors) =>
    errors.map(e => `${e.context.map(c => c.key).join('.')}: 无效`).join('; '),
  (user: User) => `欢迎，${user.username}！`
);

// 测试
const testInput = { username: 'ab', email: 'invalid', age: 15 };
console.log(pipe(validateUser(testInput), fold(handleMessage, handleMessage)));
// "username: 无效; age: 无效"
```

### 示例 3：valibot 的轻量级 Schema

```typescript
import { object, string, number, boolean, minLength, email, minValue, parse } from 'valibot';

// valibot 采用函数式 API，Tree-shakable，Bundle 体积小
const registerSchema = object({
  username: string([minLength(3, '用户名至少 3 个字符')]),
  email: string([email('邮箱格式不正确')]),
  age: number([minValue(18, '必须年满 18 岁')]),
  agreeTerms: boolean(),
});

// 验证
const result = parse(registerSchema, {
  username: 'alice',
  email: 'alice@example.com',
  age: 25,
  agreeTerms: true,
});

// valibot 的输出类型自动推导
type RegisterForm = typeof registerSchema;
```

### 示例 4：异步验证（远程用户名查重）

```typescript
import { z } from 'zod';

// 异步验证函数：检查用户名是否已被占用
async function checkUsernameAvailable(username: string): Promise<boolean> {
  const response = await fetch(`/api/users/check?username=${encodeURIComponent(username)}`);
  const data = await response.json();
  return data.available === true;
}

// 使用 z.string().refine 的异步版本
// 注意：refine 的谓词可以返回 Promise<boolean>
const asyncUsernameSchema = z
  .string()
  .min(3, '用户名至少 3 个字符')
  .refine(
    checkUsernameAvailable,
    '该用户名已被占用'
  );

// 异步解析
async function validateUsername(input: string) {
  const result = await asyncUsernameSchema.safeParseAsync(input);
  if (!result.success) {
    console.log(result.error.issues[0].message);
    return false;
  }
  return true;
}

// 实际使用：防抖处理用户输入
let debounceTimer: ReturnType<typeof setTimeout>;
const usernameInput = document.querySelector('#username')!;

usernameInput.addEventListener('input', event => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const value = (event.target as HTMLInputElement).value;
    await validateUsername(value);
  }, 500);
});
```

### 示例 5：跨字段验证与条件分支

```typescript
import { z } from 'zod';

// 订单表单：根据配送方式不同，必填字段不同
const orderSchema = z.discriminatedUnion('shippingMethod', [
  // 自提：无需地址
  z.object({
    shippingMethod: z.literal('pickup'),
    storeId: z.string().min(1, '请选择自提门店'),
    contactPhone: z.string().regex(/^\d{11}$/, '手机号格式不正确'),
  }),
  // 快递：需要完整地址
  z.object({
    shippingMethod: z.literal('express'),
    address: z.object({
      province: z.string().min(1, '请选择省份'),
      city: z.string().min(1, '请选择城市'),
      detail: z.string().min(5, '详细地址至少 5 个字符'),
    }),
    contactPhone: z.string().regex(/^\d{11}$/, '手机号格式不正确'),
    // 优惠券：可选，但有则必须符合格式
    couponCode: z
      .string()
      .regex(/^[A-Z0-9]{8,12}$/, '优惠券码格式不正确')
      .optional(),
  }),
]);

type OrderForm = z.infer<typeof orderSchema>;

// TypeScript 会根据 shippingMethod 自动收窄类型
function processOrder(order: OrderForm) {
  if (order.shippingMethod === 'pickup') {
    // 此时 order 类型为 { shippingMethod: 'pickup'; storeId: string; contactPhone: string }
    console.log(`自提门店：${order.storeId}`);
  } else {
    // 此时 order 类型为 { shippingMethod: 'express'; address: {...}; ... }
    console.log(`配送至：${order.address.province}${order.address.city}`);
  }
}
```

### 示例 6：自定义错误消息与国际化

```typescript
import { z } from 'zod';

// 错误消息上下文：包含 locale 和参数
interface ErrorContext {
  locale: 'zh-CN' | 'en-US';
  params?: Record<string, string | number>;
}

// 错误消息映射表
const messages = {
  'zh-CN': {
    minLength: (params: { min: number }) => `至少 ${params.min} 个字符`,
    maxLength: (params: { max: number }) => `最多 ${params.max} 个字符`,
    email: () => '邮箱格式不正确',
    required: () => '此字段为必填项',
  },
  'en-US': {
    minLength: (params: { min: number }) => `At least ${params.min} characters`,
    maxLength: (params: { max: number }) => `At most ${params.max} characters`,
    email: () => 'Invalid email format',
    required: () => 'This field is required',
  },
};

// 创建带上下文的 Schema 工厂
function createLocalizedSchema(ctx: ErrorContext) {
  const t = messages[ctx.locale];
  return z.object({
    username: z
      .string()
      .min(3, t.minLength({ min: 3 }))
      .max(20, t.maxLength({ max: 20 })),
    email: z.string().email(t.email()),
    bio: z.string().optional(),
  });
}

// 根据用户语言切换 Schema
const schemaZh = createLocalizedSchema({ locale: 'zh-CN' });
const schemaEn = createLocalizedSchema({ locale: 'en-US' });
```

### 示例 7：表单状态管理（React Hook 集成）

```typescript
import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';

// 泛型表单 Hook：类型安全的状态管理与验证
function useForm<T extends z.ZodType<any>>(
  schema: T,
  initialValues: z.infer<T>
) {
  type Values = z.infer<T>;
  type Errors = Partial<Record<keyof Values, string>>;

  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 设置单个字段值
  const setField = useCallback(
    <K extends keyof Values>(key: K, value: Values[K]) => {
      setValues(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  // 验证整个表单
  const validate = useCallback((): boolean => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return true;
    }
    // 将 ZodError 转换为字段 -> 错误消息映射
    const newErrors: Errors = {};
    result.error.issues.forEach(issue => {
      const key = issue.path[0] as keyof Values;
      if (!newErrors[key]) {
        newErrors[key] = issue.message;
      }
    });
    setErrors(newErrors);
    return false;
  }, [schema, values]);

  // 提交处理
  const handleSubmit = useCallback(
    async (onSubmit: (values: Values) => Promise<void>) => {
      setIsSubmitting(true);
      try {
        if (validate()) {
          await onSubmit(values);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, values]
  );

  // 重置表单
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    setField,
    validate,
    handleSubmit,
    reset,
  };
}

// 使用示例
const userSchema = z.object({
  username: z.string().min(3, '用户名至少 3 个字符'),
  email: z.string().email('邮箱格式不正确'),
});

function UserForm() {
  const form = useForm(userSchema, { username: '', email: '' });

  return (
    <form onSubmit={e => {
      e.preventDefault();
      form.handleSubmit(async values => {
        console.log('提交：', values);
      });
    }}>
      <input
        value={form.values.username}
        onChange={e => form.setField('username', e.target.value)}
      />
      {form.errors.username && <span>{form.errors.username}</span>}
      <input
        value={form.values.email}
        onChange={e => form.setField('email', e.target.value)}
      />
      {form.errors.email && <span>{form.errors.email}</span>}
      <button type="submit" disabled={form.isSubmitting}>提交</button>
    </form>
  );
}
```

### 示例 8：分步验证（向导式表单）

```typescript
import { z } from 'zod';

// 多步骤表单的每一步定义独立 Schema
const step1Schema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
});

const step2Schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: '密码不一致',
});

const step3Schema = z.object({
  age: z.number().min(18),
  country: z.string().min(1),
});

// 完整表单 Schema 是各步骤的合并
const fullSchema = step1Schema.and(step2Schema).and(step3Schema);

// 向导状态管理
interface WizardState<T> {
  step: number;
  data: Partial<T>;
  errors: Record<string, string>;
}

class FormWizard<T extends z.ZodType<any>> {
  private steps: z.ZodTypeAny[];
  private state: WizardState<z.infer<T>>;

  constructor(steps: z.ZodTypeAny[], initialValues: Partial<z.infer<T>> = {}) {
    this.steps = steps;
    this.state = { step: 0, data: initialValues, errors: {} };
  }

  // 验证当前步骤
  validateCurrentStep(): boolean {
    const currentSchema = this.steps[this.state.step];
    const result = currentSchema.safeParse(this.state.data);
    if (result.success) {
      this.state.errors = {};
      return true;
    }
    this.state.errors = Object.fromEntries(
      result.error.issues.map(i => [i.path[0], i.message])
    );
    return false;
  }

  // 下一步
  next(): boolean {
    if (!this.validateCurrentStep()) return false;
    if (this.state.step < this.steps.length - 1) {
      this.state.step++;
    }
    return true;
  }

  // 上一步
  prev() {
    if (this.state.step > 0) this.state.step--;
  }

  // 完整验证
  validateAll(): boolean {
    const result = (this.steps.reduce((acc, s) => acc.and(s)) as z.ZodTypeAny)
      .safeParse(this.state.data);
    return result.success;
  }
}
```

### 示例 9：组合 Schema 的错误路径

```typescript
import { z } from 'zod';

// 嵌套对象的错误路径
const nestedSchema = z.object({
  user: z.object({
    profile: z.object({
      name: z.string().min(2, '名字至少 2 个字符'),
      addresses: z.array(
        z.object({
          city: z.string().min(1, '城市不能为空'),
          zip: z.string().regex(/^\d{6}$/, '邮编必须是 6 位数字'),
        })
      ).min(1, '至少需要一个地址'),
    }),
  }),
});

const result = nestedSchema.safeParse({
  user: {
    profile: {
      name: 'A',
      addresses: [
        { city: '', zip: '123' },
        { city: '上海', zip: 'abc123' },
      ],
    },
  },
});

if (!result.success) {
  result.error.issues.forEach(issue => {
    // path 数组表示嵌套路径
    // 例如 ['user', 'profile', 'addresses', 0, 'city']
    console.log(`${issue.path.join('.')}: ${issue.message}`);
  });
  // 输出：
  // user.profile.name: 名字至少 2 个字符
  // user.profile.addresses.0.city: 城市不能为空
  // user.profile.addresses.0.zip: 邮编必须是 6 位数字
  // user.profile.addresses.1.zip: 邮编必须是 6 位数字
}
```

### 示例 10：自定义类型与变换

```typescript
import { z } from 'zod';

// 自定义日期字符串 Schema：接受 'YYYY-MM-DD' 格式
const dateString = z.string().refine(
  s => /^\d{4}-\d{2}-\d{2}$/.test(s),
  '日期格式必须为 YYYY-MM-DD'
).transform(s => new Date(s));

// 使用 transform 将输入类型转换为输出类型
const eventSchema = z.object({
  name: z.string(),
  startDate: dateString,
  endDate: dateString,
}).refine(
  d => d.endDate >= d.startDate,
  '结束日期必须晚于开始日期'
);

type EventInput = z.input<typeof eventSchema>;
// { name: string; startDate: string; endDate: string }

type EventOutput = z.output<typeof eventSchema>;
// { name: string; startDate: Date; endDate: Date }

// 验证与变换
const result = eventSchema.parse({
  name: '会议',
  startDate: '2026-07-21',
  endDate: '2026-07-22',
});
// result.startDate 是 Date 对象，不是字符串
console.log(result.startDate.getFullYear()); // 2026
```

### 示例 11：API 客户端集成（端到端类型安全）

```typescript
import { z } from 'zod';

// 定义 API 响应 Schema
const userResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  role: z.enum(['admin', 'user', 'guest']),
});

type UserResponse = z.infer<typeof userResponseSchema>;

// 类型安全的 API 客户端
async function fetchUser(userId: number): Promise<UserResponse> {
  const res = await fetch(`/api/users/${userId}`);
  const json: unknown = await res.json();

  // 在 API 边界进行运行时验证
  const result = userResponseSchema.safeParse(json);
  if (!result.success) {
    console.error('API 响应不符合预期 Schema：', result.error);
    throw new Error('API 响应格式错误');
  }

  // 此后 result.data 是类型安全的
  return result.data;
}

// 调用方完全类型安全，无需手动断言
async function main() {
  const user = await fetchUser(123);
  // user.role 是 'admin' | 'user' | 'guest'，而非 string
  if (user.role === 'admin') {
    console.log(`管理员 ${user.username} 登录`);
  }
}
```

## 对比分析

### 主流 Schema 验证库对比

| 特性 | zod | io-ts | yup | ajv | valibot |
|---|---|---|---|---|---|
| **首次发布** | 2020 | 2017 | 2014 | 2011 | 2022 |
| **类型推导** | 优秀（`z.infer`） | 优秀（`t.TypeOf`） | 一般（手动） | 无（JSON Schema） | 优秀（自动） |
| **API 风格** | 链式 | 函数式 | 链式 | JSON Schema | 函数式 |
| **Bundle 体积** | 中（~14KB） | 中（依赖 fp-ts） | 中（~15KB） | 大（~120KB） | 极小（Tree-shakable） |
| **异步验证** | 原生支持 | 通过 TaskEither | 通过 validateAsync | 通过 $async | 原生支持 |
| **错误信息可定制** | 优秀 | 一般 | 优秀 | 一般 | 优秀 |
| **Tree-shaking** | 一般 | 差 | 差 | 差 | 优秀 |
| **TypeScript 友好度** | 极高 | 高（需 fp-ts） | 中 | 低 | 极高 |
| **JSON Schema 互转** | 通过 zod-to-json-schema | 无 | 无 | 原生 | 通过 valibot-json-schema |
| **生态成熟度** | 高 | 中 | 高 | 极高（JSON Schema 标准） | 成长中 |
| **学习曲线** | 低 | 高（需函数式基础） | 低 | 中 | 低 |

### 选型建议

1. **新项目首选 zod**：API 友好、类型推导强、生态丰富（与 tRPC、react-hook-form、Next.js 深度集成）。
2. **函数式偏好选 io-ts**：与 fp-ts 生态深度融合，适合崇尚函数式编程的团队。
3. **与后端 JSON Schema 互通选 ajv**：后端使用 JSON Schema 时，前端直接复用。
4. **极致体积敏感选 valibot**：移动端 H5、小程序场景下，Tree-shaking 可将体积压缩到 1KB 以内。
5. **遗留系统沿用 yup**：已有 yup 代码基础时无需迁移，新项目不推荐。

### Schema 驱动 vs 手动验证

| 维度 | Schema 驱动 | 手动 if/else |
|---|---|---|
| **类型安全** | 编译时与运行时一致 | 易漂移 |
| **可复用性** | 高（Schema 可组合） | 低（逻辑散落） |
| **错误信息聚合** | 自动聚合所有错误 | 通常短路在第一个错误 |
| **可测试性** | 高（纯函数） | 低（依赖 UI） |
| **跨端复用** | 可在后端、前端、CLI 复用 | 难复用 |
| **性能** | 略差（Schema 解释开销） | 最优 |
| **学习成本** | 中（需学习 Schema DSL） | 低 |

## 常见陷阱与反模式

### 陷阱 1：类型断言绕过验证（生产事故案例）

**场景**：2022 年某电商在结算页使用 `as` 断言将未验证的优惠券数据直接传入支付模块，导致恶意用户可提交负数优惠券，造成单日损失 120 万元。

```typescript
// 反模式：使用 as 断言绕过验证
async function applyCoupon(couponInput: unknown) {
  // 错误：直接断言为 Coupon 类型，未验证
  const coupon = couponInput as Coupon;
  // 若 couponInput 是 { discount: -100 }，这里会执行负数折扣
  return calculateDiscount(coupon);
}

// 正确模式：在边界使用 Schema 验证
async function applyCoupon(couponInput: unknown) {
  const result = couponSchema.safeParse(couponInput);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  // result.data 已通过验证，类型安全
  return calculateDiscount(result.data);
}
```

### 陷阱 2：跨字段验证遗漏

```typescript
// 反模式：仅验证单字段，遗漏跨字段约束
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  // 缺少 password === confirmPassword 的约束
});

// 正确模式：使用 refine 进行跨字段验证
const correctSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine(d => d.password === d.confirmPassword, {
  message: '密码不一致',
  path: ['confirmPassword'],
});
```

### 陷阱 3：异步验证未等待

```typescript
// 反模式：调用 parse 而非 parseAsync
const schema = z.object({
  username: z.string().refine(async s => {
    return await checkRemote(s);
  }, '用户名已存在'),
});

// 错误：parse 不会等待 Promise，refine 返回 Promise<boolean> 永远 truthy
const result = schema.parse({ username: 'alice' });

// 正确模式：使用 parseAsync
const result = await schema.parseAsync({ username: 'alice' });
```

### 陷阱 4：错误路径误用

```typescript
// 反模式：忽略错误路径，仅取第一个错误
const result = schema.safeParse(input);
if (!result.success) {
  // 错误：只显示第一个错误，用户需多次提交
  alert(result.error.issues[0].message);
}

// 正确模式：聚合所有错误并按字段显示
if (!result.success) {
  const fieldErrors: Record<string, string> = {};
  result.error.issues.forEach(issue => {
    const path = issue.path.join('.');
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  });
  renderErrors(fieldErrors);
}
```

### 陷阱 5：Schema 重复定义（两套类型）

```typescript
// 反模式：维护两份类型定义
interface User { username: string; email: string; }
const userSchema = z.object({
  username: z.string(),
  email: z.string().email(),
});
// 接口与 Schema 之间无编译期约束，易漂移

// 正确模式：单源真理
const userSchema = z.object({
  username: z.string(),
  email: z.string().email(),
});
type User = z.infer<typeof userSchema>; // 类型从 Schema 推导
```

### 陷阱 6：z.any() 与 z.unknown() 的误用

```typescript
// 反模式：在关键边界使用 z.any() 或 z.unknown()，等于不验证
const apiSchema = z.object({
  data: z.any(), // 等同于无验证
});

// 正确模式：明确定义嵌套结构
const apiSchema = z.object({
  data: z.object({
    id: z.number(),
    items: z.array(z.string()),
  }),
});
```

### 陷阱 7：错误消息硬编码导致国际化困难

```typescript
// 反模式：错误消息硬编码在 Schema 中
const schema = z.object({
  username: z.string().min(3, '用户名至少 3 个字符'),
});

// 当需要支持英文时，必须重写整个 Schema
const schemaEn = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

// 正确模式：使用错误消息映射表
const errors = {
  'zh-CN': { minLength: '用户名至少 {min} 个字符' },
  'en-US': { minLength: 'Username must be at least {min} characters' },
};

function makeSchema(locale: 'zh-CN' | 'en-US') {
  const t = errors[locale];
  return z.object({
    username: z.string().min(3, t.minLength.replace('{min}', '3')),
  });
}
```

### 陷阱 8：递归 Schema 未使用 lazy

```typescript
// 反模式：直接定义递归 Schema 导致类型循环
interface TreeNode {
  value: number;
  children: TreeNode[];
}
const treeSchema: z.ZodSchema<TreeNode> = z.object({
  value: z.number(),
  // 错误：直接引用 treeSchema 但其尚未定义完成
  children: z.array(treeSchema),
});

// 正确模式：使用 z.lazy 延迟定义
const treeSchema: z.ZodSchema<TreeNode> = z.lazy(() =>
  z.object({
    value: z.number(),
    children: z.array(treeSchema),
  })
);
```

## 工程实践

### 实践一：Schema 单源真理架构

在中大型项目中，Schema 应当作为类型的唯一来源（Single Source of Truth）。架构如下：

```
src/
├── schemas/                # Schema 定义层
│   ├── user.ts             # 用户相关 Schema
│   ├── order.ts            # 订单相关 Schema
│   └── common.ts           # 公共 Schema（如日期、ID）
├── types/                  # 类型从 Schema 自动推导
│   └── index.ts            # export type User = z.infer<typeof userSchema>
├── api/                    # API 客户端在边界处验证
│   └── client.ts           # 调用 schema.parse(response)
├── components/             # UI 组件消费类型
│   └── UserForm.tsx        # 使用 useForm(schema, initial)
└── pages/                  # 页面组合组件
```

**关键原则**：

1. **类型只从 Schema 推导**，禁止手写 `interface User` 与 Schema 并存。
2. **API 边界必须验证**，所有 `fetch` 返回的 `unknown` 必须经过 Schema 解析。
3. **Schema 可组合**，复杂 Schema 由简单 Schema 通过 `.and()`、`.or()` 组合而成。
4. **Schema 可测试**，每个 Schema 配套单元测试，覆盖合法与非法用例。

### 实践二：性能优化

Schema 验证并非免费，在高频场景（如每次输入触发验证）需考虑性能：

```typescript
import { z } from 'zod';
import { debounce } from 'lodash-es';

// 反模式：每次按键都触发完整验证
function BadForm() {
  const [values, setValues] = useState(initialValues);
  const validate = () => schema.parse(values);
  // 每次输入都调用 validate，性能差
}

// 正确模式 1：防抖验证
function DebouncedForm() {
  const validate = useMemo(
    () => debounce((v) => {
      const result = schema.safeParse(v);
      // 更新错误状态
    }, 300),
    []
  );
}

// 正确模式 2：分字段验证，避免全表单重新验证
function FieldLevelForm() {
  // 每个字段维护独立的 Schema 与错误状态
  const fieldSchemas = {
    username: z.string().min(3),
    email: z.string().email(),
  };

  const validateField = (key: keyof typeof fieldSchemas, value: string) => {
    const result = fieldSchemas[key].safeParse(value);
    // 仅更新该字段错误
  };
}

// 正确模式 3：仅在提交时验证全表单
function SubmitOnlyForm() {
  const handleSubmit = () => {
    const result = schema.safeParse(values);
    if (!result.success) {
      // 显示所有错误
    }
  };
}
```

### 实践三：测试策略

Schema 本身是纯函数，单元测试覆盖率高：

```typescript
import { describe, it, expect } from 'vitest';

describe('registerSchema', () => {
  // 合法用例
  it('接受合法的注册数据', () => {
    const valid = {
      username: 'alice123',
      email: 'alice@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      age: 25,
      agreeTerms: true,
    };
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  // 边界用例：每个约束的边界值
  it('用户名恰好 3 个字符时合法', () => {
    const result = registerSchema.safeParse({ ...validBase, username: 'abc' });
    expect(result.success).toBe(true);
  });

  it('用户名 2 个字符时非法', () => {
    const result = registerSchema.safeParse({ ...validBase, username: 'ab' });
    expect(result.success).toBe(false);
  });

  // 非法用例：覆盖所有错误路径
  it('密码不一致时 confirmPassword 字段报错', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      password: 'password123',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find(
        i => i.path[0] === 'confirmPassword'
      );
      expect(confirmError?.message).toBe('两次输入的密码不一致');
    }
  });

  // 属性测试：使用 fast-check 生成随机合法数据
  it('任意合法数据应通过验证', () => {
    fc.assert(fc.property(
      fc.record({
        username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        email: fc.string().filter(s => /.+@.+\..+/.test(s)),
        // ... 其他字段生成器
      }),
      data => registerSchema.safeParse(data).success
    ));
  });
});
```

### 实践四：渐进式迁移

已有项目从手动验证迁移到 Schema 驱动时，建议采用渐进式策略：

1. **第一步**：在 API 边界引入 Schema 验证，UI 层保持不变。
2. **第二步**：将手写 `interface` 替换为 `z.infer<typeof schema>`。
3. **第三步**：在新建表单中使用 Schema 驱动，旧表单维持原状。
4. **第四步**：逐步重构旧表单，统一到 Schema 驱动。

```typescript
// 第一步：API 边界验证
async function apiFetch<T>(schema: z.ZodSchema<T>, url: string): Promise<T> {
  const res = await fetch(url);
  const json: unknown = await res.json();
  return schema.parse(json);
}

// 调用
const user = await apiFetch(userSchema, '/api/users/1');
```

## 案例研究

### 案例一：react-hook-form + zod 集成

**背景**：react-hook-form 是 React 生态最流行的表单库，与 zod 集成后可同时获得高性能（非受控）与类型安全。

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 定义 Schema
const schema = z.object({
  username: z.string().min(3, '用户名至少 3 个字符'),
  email: z.string().email('邮箱格式不正确'),
  age: z.coerce.number().min(18, '必须年满 18 岁'),
});

type FormValues = z.infer<typeof schema>;

function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      email: '',
      age: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    // values 已通过 Schema 验证，类型安全
    await api.createUser(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('username')} />
      {errors.username && <span>{errors.username.message}</span>}

      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="number" {...register('age')} />
      {errors.age && <span>{errors.age.message}</span>}

      <button type="submit" disabled={isSubmitting}>提交</button>
    </form>
  );
}
```

**要点**：

- `zodResolver(schema)` 将 zod Schema 转换为 react-hook-form 的 resolver。
- `useForm<FormValues>` 的泛型从 Schema 推导，确保 `register('username')` 的字段名是类型安全的。
- `z.coerce.number()` 自动将 input 的字符串值转换为 number，避免类型不匹配。

### 案例二：tRPC 端到端类型安全

**背景**：tRPC 通过 Schema 在前后端之间共享类型，实现端到端类型安全，无需代码生成。

```typescript
// server/router.ts
import { z } from 'zod';
import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const appRouter = t.router({
  createUser: t.procedure
    .input(z.object({
      username: z.string().min(3),
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      // input 已通过 Schema 验证
      const user = await db.user.create({ data: input });
      return user;
    }),

  getUser: t.procedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.user.findUnique({ where: { id: input.id } });
    }),
});

export type AppRouter = typeof appRouter;

// client.ts
import { createTRPCProxyClient } from '@trpc/client';
import type { AppRouter } from './server/router';

const client = createTRPCProxyClient<AppRouter>({ url: '/api/trpc' });

// 调用时完全类型安全
const user = await client.createUser.mutate({
  username: 'alice',
  email: 'alice@example.com',
});
// 若传入 { username: 'ab' }，TypeScript 编译时即报错
```

**要点**：

- 前后端共享同一份 Schema，类型通过 `AppRouter` 类型导出传递。
- 前端调用时享受编译时类型检查，运行时由 tRPC 自动调用 Schema 验证。
- 无需 OpenAPI 或 GraphQL 等中间层，类型直接穿越网络边界。

### 案例三：动态表单（Schema 驱动 UI 生成）

**背景**：企业级应用常需根据后端配置动态生成表单。Schema 既是验证规则，也是 UI 渲染的元数据来源。

```typescript
import { z } from 'zod';

// 字段元数据扩展
interface FieldMeta {
  label: string;
  placeholder?: string;
  widget: 'text' | 'number' | 'select' | 'date';
  options?: { label: string; value: string }[];
  visible?: (values: Record<string, unknown>) => boolean;
}

// 动态表单配置
const dynamicFormConfig = z.object({
  fields: z.array(
    z.object({
      name: z.string(),
      schema: z.custom<z.ZodTypeAny>(), // 嵌套 Schema
      meta: z.custom<FieldMeta>(),
    })
  ),
});

// 根据配置渲染表单
function DynamicForm({ config }: { config: z.infer<typeof dynamicFormConfig> }) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  // 从所有字段 Schema 组合出完整 Schema
  const fullSchema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    config.fields.forEach(f => {
      shape[f.name] = f.schema;
    });
    return z.object(shape);
  }, [config]);

  const handleSubmit = () => {
    const result = fullSchema.safeParse(values);
    if (!result.success) {
      // 渲染错误
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {config.fields.map(field => {
        // 条件可见性
        if (field.meta.visible && !field.meta.visible(values)) return null;
        // 根据 widget 类型渲染不同输入控件
        switch (field.meta.widget) {
          case 'text':
            return <input placeholder={field.meta.placeholder} />;
          case 'select':
            return (
              <select>
                {field.meta.options?.map(o => (
                  <option value={o.value}>{o.label}</option>
                ))}
              </select>
            );
          // ... 其他控件
        }
      })}
    </form>
  );
}
```

**要点**：

- Schema 同时承载验证规则与 UI 元数据，实现"配置即表单"。
- 字段间的条件可见性通过 `visible` 谓词实现，无需在 UI 层硬编码。
- 新增字段只需修改配置，无需改动组件代码，符合开闭原则。

### 案例四：多步骤表单状态持久化

**背景**：长表单（如贷款申请）需分多步填写，且用户可能中途离开后返回。Schema 可用于验证持久化的中间状态。

```typescript
import { z } from 'zod';

// 各步骤 Schema
const step1Schema = z.object({
  personalInfo: z.object({
    name: z.string().min(1),
    idNumber: z.string().regex(/^\d{18}$/),
  }),
});

const step2Schema = z.object({
  financialInfo: z.object({
    monthlyIncome: z.number().positive(),
    employmentYears: z.number().int().min(0),
  }),
});

const step3Schema = z.object({
  loanDetails: z.object({
    amount: z.number().positive().max(1000000),
    term: z.number().int().min(1).max(30),
  }),
});

// 持久化的中间状态：每个步骤的数据是 Partial
const persistedStateSchema = z.object({
  currentStep: z.number().int().min(0).max(2),
  data: z.object({
    // 每个步骤的数据可能尚未填写，使用 partial
    personalInfo: step1Schema.shape.personalInfo.partial().optional(),
    financialInfo: step2Schema.shape.financialInfo.partial().optional(),
    loanDetails: step3Schema.shape.loanDetails.partial().optional(),
  }),
});

type PersistedState = z.infer<typeof persistedStateSchema>;

// 从 localStorage 恢复并验证
function restoreState(): PersistedState | null {
  const raw = localStorage.getItem('loanFormState');
  if (!raw) return null;
  const result = persistedStateSchema.safeParse(JSON.parse(raw));
  if (!result.success) {
    // 持久化数据损坏，清除并重新开始
    localStorage.removeItem('loanFormState');
    return null;
  }
  return result.data;
}

// 保存状态到 localStorage
function saveState(state: PersistedState) {
  localStorage.setItem('loanFormState', JSON.stringify(state));
}
```

**要点**：

- 持久化数据来自不可信存储（localStorage），必须在恢复时验证。
- 使用 `.partial()` 表达"该步骤可能尚未填写"的语义。
- 验证失败时优雅降级，清除损坏数据而非崩溃。

## 习题

### 基础题

1. **概念理解**：解释 TypeScript 静态类型在运行时被擦除的原因，并说明这对表单验证意味着什么。

2. **Schema 定义**：使用 zod 为以下用户注册表单定义 Schema：
   - 用户名：3-20 个字符，仅字母数字
   - 邮箱：标准邮箱格式
   - 密码：8-32 个字符，至少包含字母和数字
   - 确认密码：必须与密码一致

3. **类型推导**：给定以下 zod Schema，写出 `z.infer<typeof schema>` 的等价 TypeScript 类型：
   ```typescript
   const schema = z.object({
     id: z.number(),
     name: z.string(),
     tags: z.array(z.string()),
     metadata: z.record(z.string(), z.unknown()).optional(),
   });
   ```

4. **错误处理**：编写函数 `validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T`，在验证失败时抛出包含所有错误路径的 `ValidationError`。

### 进阶题

5. **跨字段验证**：为订单表单定义 Schema，满足：
   - 配送方式为 'express' 时必填地址
   - 配送方式为 'pickup' 时必填门店 ID
   - 使用优惠券时，优惠券金额不能超过订单总额的 50%

6. **异步验证**：实现一个异步 Schema，验证用户名是否在远程服务可用，要求：
   - 防抖 500ms
   - 并发请求时取消旧请求
   - 错误时降级为"验证失败，请重试"

7. **递归 Schema**：使用 `z.lazy` 定义一个树形结构的 Schema：
   ```typescript
   interface TreeNode {
     value: number;
     children: TreeNode[];
   }
   ```

8. **错误国际化**：设计一个错误消息系统，支持中英文切换，且消息可包含参数（如 `{min}`、`{max}`）。

### 挑战题

9. **端到端类型安全**：实现一个完整的 API 客户端封装，满足：
   - 所有请求与响应都通过 Schema 验证
   - 请求参数类型从 Schema 推导
   - 响应类型从 Schema 推导
   - 错误时返回类型安全的 `Result<T, E>` 而非抛异常

10. **动态表单引擎**：设计一个 Schema 驱动的动态表单引擎，要求：
    - 字段配置从后端获取，含验证规则与 UI 元数据
    - 支持字段间条件可见性
    - 支持自定义控件注册
    - 支持分步验证与最终全量验证

11. **性能基准**：对比 zod、io-ts、ajv 在以下场景的性能：
    - 浅层对象验证（10 个字段）
    - 深层嵌套对象验证（5 层嵌套）
    - 大数组验证（10000 个元素）
    - 写出测试代码并分析结果

## 参考文献

1. Carter, A. (2020). *Zod: TypeScript-first schema validation with static type inference*. GitHub. https://github.com/colinhacks/zod

2. Giulio, G. (2017). *io-ts: Runtime type system for IO decoding/encoding*. GitHub. https://github.com/gcanti/io-ts

3. Quelhas, R. (2022). *Valibot: The modular and functional schema library*. GitHub. https://github.com/fabian-hiller/valibot

4. Epstein, J. (2014). *Yup: Dead simple Object schema validation*. GitHub. https://github.com/jquense/yup

5. Korobov, E. (2011). *Ajv: Another JSON Schema Validator*. GitHub. https://github.com/ajv-validator/ajv

6. Pierce, B. C. (2002). *Types and programming languages*. MIT Press. https://doi.org/10.7551/mitpress/4236.001.0001

7. Pierce, B. C. (2004). *Advanced topics in types and programming languages*. MIT Press. https://doi.org/10.7551/mitpress/4236.001.0001

8. Wadler, P., & Blott, S. (1989). *How to make ad-hoc polymorphism less ad hoc*. Proceedings of the 16th ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages (POPL '89), 60-76. https://doi.org/10.1145/75277.75283

9. Minsky, Y., Madhavapeddy, A., & Hickey, J. (2013). *Real-world OCaml: Functional programming for the masses*. O'Reilly Media. (Chapter on phantom types and runtime validation.)

10. Chlipala, A. (2013). *Certified programming with dependent types*. MIT Press. https://doi.org/10.7551/mitpress/9153.001.0001

11. JSON Schema Organization. (2020). *JSON Schema Specification, Draft 2020-12*. https://json-schema.org/draft/2020-12/json-schema-validation.html

12. Microsoft. (2024). *TypeScript Handbook: Type narrowing*. https://www.typescriptlang.org/docs/handbook/2/narrowing.html

## 延伸阅读

- **tRPC 文档**：https://trpc.io/docs — 端到端类型安全的 RPC 框架，与 zod 深度集成。
- **react-hook-form 文档**：https://react-hook-form.com — 高性能表单库，支持 Schema resolver。
- **fp-ts 文档**：https://gcanti.github.io/fp-ts — 函数式编程库，io-ts 的基础。
- **effect/schema**：https://effect.website/docs/schema/introduction — Effect 生态的 Schema 库，与 io-ts 理念相近但更强大。
- **TypeScript 类型体操**：https://github.com/type-challenges/type-challenges — 通过练习深入理解类型系统，有助于理解 Schema 库的类型推导原理。
- **Runtype**：https://github.com/pelotom/runtypes — 另一个类型安全的运行时验证库，API 风格与 io-ts 类似。
- *Software Foundations*（Pierce 等著）：https://softwarefoundations.cis.upenn.edu — 用 Coq 讲解类型系统与程序验证，深入理解形式化基础。
- *Domain Modeling Made Functional*（Scott Wlaschin 著）：用 F# 讲解领域建模与类型驱动设计，理念可迁移到 TypeScript。
