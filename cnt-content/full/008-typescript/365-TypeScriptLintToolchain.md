---
order: 390
title: TypeScript 代码质量工具链
module: 'typescript'
category: 前端技术
difficulty: beginner
description: typescript-eslint 与类型感知规则：flat config 接入、parserOptions.project 的代价与收益、no-floating-promises 明星规则、与 tsc 严格模式的分工，以 FANDEX 仓库真实配置为例。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：TypeScript 工程化的代码质量工具链——以 typescript-eslint 为核心的静态检查体系。
- **解决什么问题**：`tsc` 只回答"类型对不对"，不管"写法健不健壮"：漂浮的 Promise、被误用为条件的 thenable、`catch` 里的空块，类型全部正确却埋着运行时炸弹。lint 用规则把这些模式揪出来。
- **什么时候用到**：项目初始化时接入；团队约定落地（命名、边界、禁用模式）；CI 卡口。查"为什么我的 async 函数没写 await 也没人报错"时读本篇。
- **前置**：[TypeScript 严格模式](/typescript/360-TsconfigStrictMode)（本篇与它分工）；[工程化配置](/typescript/350-TypeScriptEngineeringConfig)（tsconfig 是类型感知规则的地基）。

## 0. 一句话理解

> tsc 是语法老师（类型错不错），eslint 是习惯老师（写法稳不稳）。两者共用同一份 tsconfig，但检查的东西几乎不重叠——tsc 查不出的那一半，正是 no-floating-promises 这类"类型感知规则"的价值。

## 1. lint 与 tsc 的职责分工

两把尺子量的是不同的东西，用一张表划清边界：

| 检查项 | tsc | eslint（无类型信息） | eslint（类型感知） |
| :--- | :--- | :--- | :--- |
| `x: number = 'a'` | 报错 | 管不着 | 管不着（这是类型问题） |
| 未使用的变量 | `noUnusedLocals` 开了才报 | `no-unused-vars` 报 | 同左 |
| 漂浮 Promise（忘了 await） | 不报（类型上合法） | 不报 | `no-floating-promises` 报 |
| `if (promise)` 恒真条件 | 不报 | 不报 | `no-misused-promises` 报 |
| 空 catch、魔法数、命名风格 | 不管 | 管一部分 | 不管 |

三个例子感受"类型对但程序错"：

```typescript
// 1. 漂浮 Promise：saveDraft 返回 Promise，没人等它
// 报错被吞掉时页面看起来"保存成功"，实际失败了
function onEditDone() {
  saveDraft(draft); // 返回 Promise，异常静默丢失
}

// 2. thenable 被当条件：Promise 对象永远为真
async function submit(form: FormData) {
  if (validate(form)) {   // validate 是 async 函数，返回 Promise
    await doSubmit(form); // 这个分支永远走
  }
}

// 3. 类型正确但语义可疑的重载
const timer = setTimeout(...);
clearTimeout(timeout); // 拼错变量名，恰好另一个变量叫 timeout 且类型兼容
```

第 1 例没有任何类型错误——`saveDraft(draft)` 的返回值本来就可以不接。这种"结构上合法、意图上错误"的检查就是 eslint 的领地。

## 2. flat config 接入

eslint 9 起只认 flat config（`eslint.config.js`），旧的 `.eslintrc.json` 进入维护模式。TypeScript 项目的最小接入是 `typescript-eslint` 的 `config` 工厂：

```javascript
// eslint.config.js（与 FANDEX app-web 同构的最小骨架）
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'], // flat config 的"全局排除"必须是单独一项
  },
  js.configs.recommended,      // 原生 JS 规则（对 .ts 同样适用）
  ...tseslint.configs.recommended, // TS 感知规则，注意它是数组要展开
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
);
```

逐段讲为什么这样写：

- `tseslint.config(...)` 不是必需的语法糖，但它是**带类型提示的数组拼装器**，还能帮你把 `ignores` 单项识别为"全局排除"而不是"只对某些文件生效的规则块"——不用它的话，一条配置少了 `files` 字段含义会完全不同，这是 flat config 最常见的接入事故。
- `js.configs.recommended` 与 `tseslint.configs.recommended` 是**叠加**关系：前者管 JS 通用项，后者开启 parser 并追加 TS 专属规则。顺序很重要，后写的同名规则覆盖先写的。
- `recommended` 预设里的规则**不需要类型信息**（不配 `parserOptions.project` 也能跑），所以接入成本几乎为零。

预设从轻到重一共四档：`recommended` < `strict` < `recommendedTypeChecked` < `strictTypeChecked`。带 TypeChecked 的两档才包含类型感知规则，代价见下一节。**新项目建议直接 `recommended` 起步、按报错逐条收紧**，一上来 `strictTypeChecked` 会被几百条报错劝退。

## 3. 类型感知规则与 parserOptions.project

类型感知规则（type-aware rules）需要完整的类型程序（type program）才能判断，配置方式：

```javascript
export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,        // 推荐：复用编辑器同一个 tsconfig 程序
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
```

三种写法的取舍：

- `parserOptions.project: ['./tsconfig.json']`：老写法。显式列出 tsconfig，**不在这些项目里的文件**（如零散的 `.js` 脚本）会直接报 "parserOptions.project has been set" 错误，需要再配 `allowDefaultProject` 白名单。
- `parserOptions.projectService: true`：8.x 推荐写法，与 VS Code 共享同一个程序对象，配置漂移的风险最小。
- 不配置：只能用 `recommended` 档，类型感知规则全部不可用。

**代价要有预期**：类型感知 lint 需要加载整个类型程序，大型 monorepo 首次跑 lint 可能从几秒涨到一两分钟。所以社区的主流实践是**分层开启**——核心业务包开 TypeChecked，脚本文档目录只跑 recommended。这也正是 FANDEX 仓库的选择（见下一节）。

## 4. 两条明星规则：no-floating-promises 与 no-misused-promises

### 4.1 no-floating-promises

```typescript
// 报错：Promises must be awaited, end with a call to .catch,
// or use "void" to ignore
syncToRemote();          // Promise 被丢弃

// 三种修法，语义完全不同：
await syncToRemote();    // a. 等它：调用点变 async，错误向上抛
syncToRemote().catch(report); // b. 明确兜底：错误有去处
void syncToRemote();     // c. 明确"我就是要 fire-and-forget"
```

为什么这条规则必须类型感知：语法层面"调用一个函数不接返回值"再普通不过，`console.log()` 也是这么调的。只有拿到类型才知道返回值**是 Promise**。修法 c 的 `void` 运算符是把"故意丢弃"写进代码里，让 reviewer 与编译器都能区分"忘了 await"和"故意不等"——一条规则顺带逼出了一个意图表达。

### 4.2 no-misused-promises

```typescript
// 报错：Promises must not be tested truthiness
if (isValid(input)) { ... }        // isValid 是 async 函数

// 修法：把 await 写进条件
if (await isValid(input)) { ... }

// 同族报错：forEach 不认 async 回调
list.forEach(async item => { await save(item); }); // 报错
// 修法：for...of 或 Promise.all
for (const item of list) await save(item);
await Promise.all(list.map(item => save(item)));   // 二者语义不同，见并发控制
```

`forEach(async ...)` 这一格是**生产事故高发区**：循环看起来"发了"五个保存，实际上forEach 根本不等待回调，函数先返回了，错误也无人接。规则在这一格的价值是直接禁掉这种写法，逼你二选一并想清楚要串行还是并行。

## 5. 真实项目解析：FANDEX 的 eslint.config.js

以下配置来自本仓库 `app-web/eslint.config.js`（typescript-eslint 8.7x + eslint 10，flat config），逐段看每个决策的理由：

```javascript
export default tseslint.config(
  {
    ignores: ['dist/**', '.astro/**', 'src/data/**', 'reports/**', /* ... */],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,   // 注意：不是 TypeChecked 档
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: { /* 同款 no-unused-vars */ },
  },
);
```

五个值得停下来讲的决策：

1. **用 `recommended` 而不是 TypeChecked**：本仓库是 Astro islands 架构，`src` 里的 `.astro` 文件由 astro parser 单独处理，全量类型程序的成本与收益不成比例。`.mjs` 脚本目录（构建脚本）天然在 tsconfig 之外，开 TypeChecked 还得配 `allowDefaultProject`。这是第 3 节"分层开启"的实例。
2. **`ignoreRestSiblings: true`**：解构省略模式下故意丢弃的兄弟键不算未使用。没有它，`const { password, ...safeUser } = user` 里刚删掉敏感字段的 `password` 会被报"未使用"——这是脱敏场景的**标准写法**，不该被规则误伤。
3. **`argsIgnorePattern: '^_'`**：约定"下划线开头 = 故意不用的参数"。接口函数实现里常见"我只需要第二个参数"，占位符是比传真参再不用更诚实的表达。
4. **`.d.ts` 里关掉 `triple-slash-reference`**：声明文件里 `/// <reference types="..." />` 是三斜线指令的**正当用法**，通用规则会对它误报，所以要按文件类型精确豁免——这是"规则没错但用错了地方"的典型样本。
5. **`globals.browser` 与 `globals.node` 分目录**：`window` 在 `src` 里合法、在 `scripts` 里就是笔误。全局变量白名单按运行环境切分，能抓住"把浏览器 API 写进 Node 脚本"这类跨环境错乱。

CI 集成只有一行（`.github/workflows/deploy.yml`）：`run: pnpm --filter @fandex/web lint`。本地能跑 CI 就能跑，规则配置本身不依赖任何 CI 秘密——**lint 卡口的价值在可复现**，这一点与构建流水线完全同构。

## 6. 与严格模式的互补关系

[360 严格模式](/typescript/360-TsconfigStrictMode)与本篇的分工可以总结成一句话：**strict 挡住类型谎言，lint 挡住模式陷阱**。两道闸门各管一边，谁也替代不了谁：

```typescript
// strict 挡的（类型谎言）：
function get(id: string): User { return db.get(id); } // db.get 返回 User | undefined
// noImplicitAny / strictNullChecks 报错

// lint 挡的（模式陷阱，类型全对）：
async function handler() {
  db.get(id).then(render); // 没人 catch：类型对，rejection 无人接
}
```

工程顺序建议：先开 strict（编译期收益最大、无运行成本），再接 recommended（lint 秒级成本），最后按包评估 TypeChecked（分钟级成本换异步安全网）。三者全开的项目里，"这代码为什么报错"的排查入口是：**先看 tsc 报什么，再看 eslint 报什么**——两者用同一个 tsconfig，但规则编号体系完全独立（tsc 是 TS2339 这类错误码，eslint 是规则名），本模块的[错误诊断速查](/typescript/725-TypeScriptErrorDiagnosis)按前者组织。

## 7. 常见接入陷阱

- **规则不生效**：flat config 里 `ignores` 必须是**只有 `ignores` 一个键的独立配置项**；混进带 `rules` 的块里就变成"对这些文件生效的排除"，含义反转。
- **TypeChecked 档报 "parserOptions.project has been set"**：某个文件不在 tsconfig 的 include 里（比如根目录的散脚本），用 `projectService` 或 `allowDefaultProject` 处理，不要为此把整个 project 选项删掉。
- **旧 `.eslintrc.*` 残留**：eslint 9+ 直接忽略旧文件，但团队里有人装了老版本编辑器插件时会出现"本地和 CI 报告不一致"。接入 flat config 时删干净旧文件。
- **规则与格式化器打架**：本仓库把格式交给 Prettier 类工具，eslint 只管代码模式；如果 eslint 报的全是缩进引号问题，说明职责配错了。

## 8. 动手实践

任务：

1. 在一个空目录用 `pnpm init` 后接入 `typescript-eslint` 的 `recommended` 预设，写一个含"漂浮 Promise"的 `.ts` 文件，确认 `recommended` 档**不报**这条错。
2. 升级到 `recommendedTypeChecked` 并配置 `projectService`，确认第 1 题的文件开始报 `no-floating-promises`。
3. 用三种修法分别修掉报错（await / .catch / void），并为你的项目写下"什么场景允许哪种修法"的团队约定。
4. 给 `no-unused-vars` 加上 `ignoreRestSiblings`，验证 `const { password, ...rest } = user` 不再报错。

提示：第 1、2 题的对比是理解"类型感知"四个字的最短路径；第 3 题没有标准答案，写下来本身就是产出。

<details>
<summary>参考实现（命令序列与配置，先自己动手再对照）</summary>

```bash
pnpm init && pnpm add -D eslint typescript-eslint jiti
# 项目里需要有一个最小 tsconfig.json（projectService 要靠它工作）
echo '{ "compilerOptions": { "strict": true } }' > tsconfig.json
```

```javascript
// eslint.config.mjs
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
);
```

```typescript
// demo.ts：先写 save() 不 await，跑 pnpm eslint demo.ts 观察报错；
// 再依次用 await save() / save().catch(console.error) / void save() 修复并复跑
declare function save(): Promise<void>;
save();
```

第 3 题的约定示例：用户交互回调允许 `void`（错误已由全局兜底上报）；业务写路径必须 `await` 或 `.catch`；测试代码随意。把约定写进 CONTRIBUTING.md 才算完成。

</details>

## 9. 边界规则与插件生态

包边界（谁能 import 谁）在 monorepo 里靠 `eslint-plugin-import` 或 boundary 类插件守卫：

```javascript
// 示例：禁止 islands 直接 import 服务端专属模块
{
  files: ['src/islands/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{ group: ['*/server/*'], message: 'islands 不得依赖服务端模块' }],
    }],
  },
}
```

`no-restricted-imports` 是原生规则、零成本，先用它能解决八成边界诉求；需要按"层"（ui 不得依赖 api，api 不得依赖 ui）建模时再上专业插件。选型原则与 CI 卡口一致：**先让最便宜的规则挡住最贵的错误**。

## 参考与致谢

- typescript-eslint 官方文档（MIT 许可，已对照本地 node_modules 内 LICENSE 文件确认），https://typescript-eslint.io —— flat config 接入、parserOptions.project/projectService、no-floating-promises 与 no-misused-promises 的规则语义以该文档为准。
- 本仓库 `app-web/eslint.config.js` 与 `.github/workflows/deploy.yml`：第 5 节的真实配置解析与 CI 集成示例取自仓库自身。
