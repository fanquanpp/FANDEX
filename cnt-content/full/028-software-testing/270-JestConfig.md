---
order: 270
title: Jest 配置与快照
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Jest 工程化：jest.config 核心配置项、testEnvironment 选择、路径别名与 setup、快照测试的正确用法与更新纪律、覆盖率阈值。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/240-JestBasics'
  - 'software-testing/230-CICDTest'
prerequisites:
  - 'software-testing/240-JestBasics'
---

## 1. 一份能用的基础配置

Jest 的卖点是「零配置」，但真实项目通常需要这五类配置：环境、文件匹配、
路径别名、代码转换、覆盖率。

```javascript
// jest.config.js —— 每一项都有明确目的
module.exports = {
  testEnvironment: 'node',              // 测浏览器代码改 'jsdom'
  testMatch: ['**/*.test.js'],          // 只把 *.test.js 当测试文件
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleNameMapper: {                   // 与构建工具的路径别名保持一致
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,                     // 每条用例后清 mock 调用记录
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.spec.js'],
  coverageDirectory: 'coverage',
};
```

`<rootDir>` 是 Jest 的根目录占位符（通常即 jest.config.js 所在目录），
配置里涉及路径的地方都用它拼绝对路径，避免相对路径在不同工作目录下漂移。

前置知识：「Jest 入门」、npm scripts、路径别名概念。

## 2. 关键配置项逐一说明

### 2.1 testEnvironment：node 还是 jsdom

| 环境     | 提供的全局对象              | 适用对象                       |
| -------- | --------------------------- | ------------------------------ |
| `node`   | Node.js API，无 DOM         | 后端、工具库、CLI              |
| `jsdom`  | window、document、localStorage | 组件与 DOM 相关代码         |

jsdom 不是真浏览器：没有布局、没有真实渲染，CSS 与视觉行为测不了——
那是 E2E（Playwright 等）的领地。jsdom 只负责让 DOM API 存在。

### 2.2 transform 与 preset

Jest 默认只认 CommonJS，ESM/TypeScript/JSX 需要转换器：

```javascript
module.exports = {
  preset: 'ts-jest',                          // 预设 = 一组打包好的配置
  // 或显式配置转换器（配合 Babel 处理 ESM/JSX）
  transform: { '^.+\\.[tj]sx?$': 'babel-jest' },
};
```

### 2.3 moduleNameMapper 的两个高频用途

```javascript
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',      // 用途一：路径别名
    '\\.(css|less|svg)$': 'identity-obj-proxy',  // 用途二：静态资源替身
  },
};
```

`identity-obj-proxy` 让 `import styles from './x.css'` 拿到「类名原样返回」
的对象，避免 jsdom 不认识 CSS 文件导致整条测试链路崩溃。

### 2.4 setup 文件：beforeAll 的全局版

```javascript
module.exports = {
  setupFiles: ['<rootDir>/jest.env.js'],            // 模块加载前执行（注入环境变量）
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],  // 每个测试文件执行前运行
};
```

```javascript
// jest.setup.js —— 扩展匹配器、全局 polyfill 放这里
require('@testing-library/jest-dom');   // 提供 toBeVisible 等 DOM 匹配器
```

记忆口诀：`setupFiles` 跑在框架加载前，`setupFilesAfterEnv` 跑在「测试
环境就绪后」——需要用 `expect` 或匹配器库的代码只能放后者。

### 2.5 覆盖率阈值

```javascript
module.exports = {
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
    './src/core/**': { branches: 95 },   // 核心目录单独收紧
  },
};
```

任一指标低于阈值，`jest --coverage` 以非零码退出，可直接作 CI 门禁
（门禁整体策略见「CI/CD 测试门禁」）。

## 3. 快照测试：序列化对比的利与刃

### 3.1 原理与基本用法

第一次运行 `toMatchSnapshot()` 时，Jest 把传入值的序列化结果写入
`__snapshots__/` 目录；之后每次运行都与快照文件对比，不一致即失败。

```javascript
test('生成的配置结构稳定', () => {
  const config = buildConfig({ name: 'demo', debug: false });
  expect(config).toMatchSnapshot();
  // 首次运行生成 __snapshots__/config.test.js.snap
  // 内容形如：{"name": "demo", "debug": false}
});
```

内联版本把快照直接写进测试文件，更直观但 diff 噪声大：

```javascript
test('内联快照', () => {
  expect(buildConfig({ name: 'demo' })).toMatchInlineSnapshot(`
    {
      "debug": false,
      "name": "demo",
    }
  `);
});
```

### 3.2 更新快照：一把需要纪律的钥匙

```bash
npx jest --updateSnapshot    # 或 npx jest -u：重写所有失败快照
```

`-u` 会**无差别接受当前输出为新基准**。错误用法：CI 挂了 → 本地 `-u` →
全绿提交。正确流程：先 review 快照 diff 确认变化是预期行为变更，再更新，
并在提交信息里说明。养成「快照 diff 必须逐行看」的习惯，快照才是护栏
而不是橡皮图章。

### 3.3 快照适合什么

| 适合                             | 不适合                       |
| -------------------------------- | ---------------------------- |
| 稳定的结构化输出（配置、AST、报文） | 频繁变动的 UI 结构         |
| 错误信息文案（`toThrowErrorMatchingSnapshot`） | 含时间戳/随机 id 的输出（用序列化过滤后再快照） |
| 大型对象的关键结构防回归         | 替代显式业务断言             |

大快照是反模式：几百行的快照没人会逐行 review，失败时所有人只会无脑 `-u`。
宁可拆成多条小断言。

## 4. Monorepo：projects 多包配置

一个仓库里前端 + 后端 + 工具库共存时，用 `projects` 让每个包拥有独立
配置（环境、转换器不同），一份命令统一执行：

```javascript
// jest.config.js（仓库根）
module.exports = {
  projects: [
    '<rootDir>/packages/web',      // 内部各自有 jest.config.js，jsdom 环境
    '<rootDir>/packages/server',   // node 环境
    '<rootDir>/packages/shared',
  ],
};
```

```bash
npx jest --selectProjects server   # 只跑某个子项目
npx jest                           # 三个项目按各自配置并行执行
```

若使用 Vitest/构建工具的工作区，也可以让子包配置继承同一份基础配置
再覆盖差异（如仅 web 需要 jsdom 与 CSS 映射），避免三份配置漂移。

## 5. 命令行工作流

```bash
npx jest                        # 全量
npx jest user.test.js           # 指定文件
npx jest -t "更新快照"           # 按用例名过滤
npx jest --watch                # 开发常驻：只跑改动相关
npx jest --coverage             # 覆盖率报告
npx jest --ci --bail=1          # CI 模式：非交互、首败即停
npx jest --changedSince=origin/dev   # 只跑相对基线变更的测试
```

## 6. 常见陷阱

- **jsdom 当真浏览器**：测布局、动画、滚动行为注定失败，这些交给 E2E。
- **别名不同步**：构建工具与 Jest 各配一份 `moduleNameMapper`，改一处
  忘另一处，出现「能构建不能测」。抽成共享配置或用 tsconfig 插件同步。
- **快照含不稳定字段**：时间戳、自增 id 让快照每次必挂。序列化前过滤
  （如 `JSON.parse(JSON.stringify(obj, ['name', 'count']))`）再快照。
- **`clearMocks` 与 `restoreMocks` 混淆**：`clearMocks` 只清调用记录，
  不会恢复被 `spyOn` 接管的实现；需要恢复用 `restoreMocks: true` 或手动
  `mockRestore()`。
- **配置只活在一个人机器上**：`testEnvironment`、transform 漂移会导致
  「我这就通过」。配置入库，用 `--ci` 固定 CI 行为。

## 小结

- 初学者要点：先掌握 testEnvironment、testMatch、moduleNameMapper 三项
  就能跑通绝大多数项目；快照 = 序列化 + 对比，更新快照前必须 review diff；
  覆盖率阈值一行配置即可接入门禁。
- 进阶注意：`setupFilesAfterEnv` 才能用 expect 扩展；大快照是维护负债；
  `--changedSince` 让本地反馈只聚焦变更相关测试；jsdom 的能力边界要
  心里有数，视觉与交互验证属于 E2E 层。
