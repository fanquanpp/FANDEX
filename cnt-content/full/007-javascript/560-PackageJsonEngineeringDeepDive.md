---
order: 630
title: package.json 深入与前端工程化配置
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: package.json 全字段详解：exports 出口、engines、peerDependencies、包管理器脚本与 lint/format 工具链。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'javascript/540-NpmManager'
  - 'vite/150-PnpmMonorepoOverview'
prerequisites:
  - 'javascript/520-NodeJsInstall'
  - 'javascript/540-NpmManager'
---

## 0. 一句话理解

> package.json 不只是"依赖清单"：`exports` 决定包的公共 API 边界，`engines` 锁运行时版本，`peerDependencies` 声明宿主契约，`scripts` 串联生命周期，`packageManager` 固定工具链——它是 Node 生态的工程契约文件。

## 1. 双角色：应用清单 vs 包清单

同一份文件在两类项目里关注点完全不同：

- **应用**（网站、服务）：`dependencies`/`devDependencies`、`scripts`、`engines`、`packageManager` 是主角；
- **库**（发布到 npm）：`name`/`version`/`exports`/`files`/`peerDependencies`/`sideEffects` 是主角，对外暴露的每个字段都构成公共 API。

## 2. 依赖字段辨析

```json
{
  "dependencies": { "express": "^5.1.0" },
  "devDependencies": { "vitest": "^3.0.0" },
  "peerDependencies": { "react": ">=19" },
  "optionalDependencies": { "fsevents": "^2.3.3" },
  "overrides": { "semver": "^7.6.0" }
}
```

| 字段 | 语义 | 常见误用 |
| --- | --- | --- |
| dependencies | 运行时必需 | 把构建工具放进来 |
| devDependencies | 开发/构建/测试用 | 库作者把真正运行时依赖错放这里 |
| peerDependencies | 声明"宿主必须提供"，插件/组件库用 | 把工具库当 peer 装给应用 |
| optionalDependencies | 装不上不报错 | 把核心依赖写成 optional |
| overrides（npm）/ pnpm.overrides | 强制统一传递依赖版本 | 滥用掩盖版本冲突的真实原因 |

**版本范围**：`^5.1.0` 允许 5.x；`~5.1.0` 允许 5.1.x；精确版本 + lockfile 是应用项目的稳态；库项目避免锁死精确版本。

## 3. exports：现代包的公共 API 边界

```json
{
  "name": "@lib/core",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "default": "./dist/index.mjs"
    },
    "./utils": "./dist/utils.mjs",
    "./package.json": "./package.json"
  }
}
```

要点：

1. `exports` 存在时，未列出的子路径**一律禁止导入**——这是 API 收敛的最强手段；
2. 条件顺序有意义：`types` 必须在最前（TypeScript 按 `moduleResolution` 匹配），`import`/`require` 分别对应 ESM/CJS 消费方；
3. 旧字段 `main`/`module` 仍被部分工具读取，发布库时建议双写过渡；
4. `typesVersions`/`publishConfig` 用于发布前改写，避免仓库内路径与发布产物不一致。

## 4. engines 与 packageManager：锁定运行链路

```json
{
  "engines": { "node": ">=24", "pnpm": ">=10" },
  "packageManager": "pnpm@10.14.0",
  "type": "module"
}
```

1. `engines` 声明运行时门槛；npm 默认仅警告（`engine-strict=true` 转硬错误），pnpm 默认强校验；
2. `packageManager` 被 corepack 消费：团队成员 `corepack enable` 后自动使用同一版本包管理器，杜绝"我这里能装你那里不行"；
3. `"type": "module"` 让 `.js` 按 ESM 解析；纯 CJS 遗留包写 `"type": "commonjs"`，混排场景用 `.mjs`/`.cjs` 后缀精确控制。

## 5. scripts 与生命周期钩子

```json
{
  "scripts": {
    "predev": "node scripts/check-env.mjs",
    "dev": "vite",
    "build": "vite build",
    "postbuild": "node scripts/verify-dist.mjs",
    "test": "vitest run",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write ."
  }
}
```

1. `pre`/`post` 前缀自动串联（`npm run dev` 前先跑 `predev`）；
2. npm 注入的 `npm_package_*` 环境变量、`prepack`/`postinstall` 等发布/安装钩子是 CI 常用抓手；`postinstall` 脚本是供应链攻击的常见入口，第三方包的安装脚本要审（`--ignore-scripts` 可禁用）；
3. 跨平台写法：避免直接写 `&&` 与 Unix 命令，用 `node scripts/xx.mjs` 或 `cross-env` 保证 Windows CI 可跑。

## 6. files、sideEffects 与发布卫生

```json
{
  "files": ["dist", "README.md"],
  "sideEffects": ["*.css"],
  "publishConfig": { "registry": "https://registry.npmjs.org/" }
}
```

1. `files` 白名单决定发布内容（`npm pack --dry-run` 预览），配合 `.npmignore` 双保险；
2. `sideEffects: false` 告诉打包器"本包可安全 Tree Shaking"，含副作用的文件（CSS、polyfill）单独列出（原理见 `javascript/390-ModuleDynamicImportCodeSplitting` 相关章节）；
3. 发布前动作清单：`npm pack --dry-run` 查体积与内容 → `npm publish --dry-run` → 带 2FA 正式发布；monorepo 用 Changesets 管版本（见 `vite/210-ChangesetsRelease`）。

## 7. lint 与 format：代码质量工具链

### 7.1 ESLint（flat config）

```javascript
// eslint.config.js（扁平配置，ESLint 9+ 默认）
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
```

### 7.2 Prettier 与 Biome

```json
{
  "scripts": {
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "devDependencies": { "@biomejs/biome": "^2.0.0" }
}
```

- 传统组合：**ESLint（规则）+ Prettier（格式）**，需处理两者规则冲突（eslint-config-prettier）；
- 新选择：**Biome** 一体化（Rust 实现，lint + format 单二进制，速度快一个量级），新项目可直接起步；
- 提交门禁：husky/lefthook 挂 pre-commit 跑 lint-staged，只检查暂存文件。

## 8. 安全与供应链

1. `npm audit` / `pnpm audit` 结合 CI 门禁，新增高危依赖阻断合并；
2. `overrides` 修传递依赖的安全版本（例如强制 `semver` 无漏洞版本），修完删除临时 override；
3. 锁文件（`package-lock.json`/`pnpm-lock.yaml`）必须入库；应用项目建议 `npm ci`/`pnpm install --frozen-lockfile` 安装；
4. lockfile 是审计与可复现构建的基石——它记录的是"解析后的确切依赖图"。

## 9. 动手试试

1. 给一个库项目配置 `exports`（双格式 + types 条件），并验证 `require` 与 `import` 两条消费路径；
2. 用 `npm pack --dry-run` 检查发布内容，把测试文件从包里剔除；
3. 在 monorepo 根配置 `packageManager` 与 corepack，让两个包管理器版本并存的问题消失；
4. 把项目的 ESLint 迁移到 flat config，或用 Biome 替代并对比单次全量 lint 耗时。

## 10. 一句话记住

> package.json 是工程契约：exports 圈定公共 API、engines/packageManager 锁工具链、peerDependencies 立宿主契约、sideEffects 换 Tree Shaking；质量门禁交给 ESLint/Biome，锁文件永远入库。

## 教学自检

> 用法：遮住正文里的示例配置，先自己写，再展开要点对照；写不出就回到对应小节重读。

1. `dependencies`、`devDependencies`、`peerDependencies` 三者的语义差异各是什么？`react` 若被一个组件库声明进 `dependencies` 而不是 `peerDependencies`，会出什么实际问题；
2. `^1.2.3` 与 `~1.2.3` 各允许升级到什么范围？为什么团队项目真正锁版本的是锁文件而不是这两个符号；
3. `exports` 字段写了 `"."` 之后，用户还能 `import 'pkg/src/internal.js'` 吗？这条设计「逼」库作者做什么；
4. `engines` 与 `packageManager` 字段各约束什么？哪个是真的会拦截安装（在什么配置下）；
5. `sideEffects: false` 向打包器承诺了什么？什么样的模块不能这么写（举一例）。

<details>
<summary>参考要点（先自己写再展开）</summary>

- 第 1 问：dependencies 是运行必需、随库安装；devDependencies 只在开发与 CI 装；peerDependencies 声明「我是插件，宿主必须自己提供某依赖」——组件库若自带 react，宿主应用会出现两个 React 实例，hooks 状态与 context 全部断开；
- 第 2 问：^ 允许 1.x.x（不动首位），~ 允许 1.2.x（不动次位）；但 `npm install` 实际安装的版本由 package-lock.json 固定，符号只在「从零解析」时生效——锁文件入库 + `npm ci` 才是真正的版本锁；
- 第 3 问：不能——exports 是封闭清单，未列出的路径全部禁止深导入；它逼库作者明确公共 API 面积，重构内部结构不再破坏用户（用户也拿不到「内部路径」的承诺）；
- 第 4 问：engines 声明 Node/npm 版本兼容范围，配合 `.npmrc` 的 `engine-strict=true`（或 pnpm 默认严格）才会拦截安装；packageManager 由 Corepack 读取，直接固定包管理器及其版本，保证团队构建可复现；
- 第 5 问：承诺「本包所有模块无副作用，未用到的导出可安全删除」；有副作用的模块（如 CSS-in-JS 的 import 'reset.css'、polyfill、装饰注册表 import './register'）不能打 false，要用数组白名单列出这些文件，否则打包器会把关键副作用摇掉。
</details>
