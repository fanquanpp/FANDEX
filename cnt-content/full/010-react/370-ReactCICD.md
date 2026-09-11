---
order: 370
title: React 与 CI/CD
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 项目 CI/CD 实战：GitHub Actions 完整流水线（缓存、typecheck/test/build）、环境变量安全边界、Playwright E2E、预览部署、包体积预算与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/350-ReactD3'
  - 'react/360-ReactStorybook'
  - 'react/380-ReactMonorepo'
  - 'react/390-ReactCompilerAutoMemoization'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

CI/CD 对 React 项目的意义：**每次推送自动验证（CI），合并后自动构建发布（CD）**，让"在我机器上是好的"这句借口失效。React 项目的流水线骨架是固定的五段：安装（带缓存）-> 静态检查（lint + typecheck）-> 单测 -> 构建 -> 部署/E2E。本文以 GitHub Actions（当前最主流）为例，其他平台（GitLab CI、Jenkins）概念一一对应。

## 2. 完整流水线：一个可直接使用的 workflow

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # pnpm + 缓存：依赖目录指纹不变则命中缓存，安装从分钟级降到秒级
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile # 锁文件不一致直接失败，防"隐式升级"

      - name: 类型检查
        run: pnpm typecheck
      - name: Lint
        run: pnpm lint
      - name: 单元测试
        run: pnpm test -- --coverage # 覆盖率随测试产出，可上传为 PR 检查

      - name: 构建
        run: pnpm build
        env:
          VITE_API_BASE: https://api.example.com # 构建期注入的"公开"配置

      - name: 产物体积预算
        run: node scripts/check-bundle-size.mjs dist --max-gzip 300 # 自定义阈值，超限失败

      - uses: actions/upload-artifact@v4 # 产物存档，供部署 job 或人工下载
        with:
          name: dist
          path: dist
```

设计要点：**快速失败**——类型与 lint 在测试前跑（秒级就能挡住多数提交）；`--frozen-lockfile` 保证 CI 装的依赖与锁文件完全一致；构建放测试后（构建贵，别让它掩盖更早的错误）。

## 3. 环境变量：安全边界必须刻在脑子里

Vite 约定：`VITE_` 前缀的变量会**被编译进客户端产物，任何访问者可见**。

- 可以放 `VITE_`：API 基础地址、公开的功能开关、埋点 key（客户端埋点 key 本来就公开）。
- 绝不能放 `VITE_`：数据库密码、服务端 API 密钥、第三方云服务的私密凭证。需要私密凭证时**必须经自己的后端/BFF 转发**，密钥只存在服务端环境变量里。

CI 中的操作：机密写入仓库 Settings > Secrets，YAML 里以 `secrets.XXX` 引用；只有 `VITE_` 类配置可以在 build 步骤用 `env:` 注入。每次发版密钥轮换后记得重跑构建——编译进去的值不会自动更新。

## 4. E2E：Playwright 进 CI

单测（Vitest + Testing Library，见[React 测试](/react/220-ReactTest)）覆盖组件行为，E2E 覆盖"整站能跑通"的关键路径：

```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: verify # 构建通过才跑，省钱且快
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium # 只装用到的浏览器
      - run: pnpm build
      - run: pnpm exec playwright test # playwright.config 里配 webServer 自动起本地服务
      - uses: actions/upload-artifact@v4
        if: failure() # 失败时保留截图与 trace，排障关键
        with: { name: playwright-report, path: playwright-report }
```

只跑关键路径（登录、下单、核心浏览），控制在 10 分钟内；失败必须上传 trace/截图，否则 E2E 失败将不可调试。

## 5. 预览部署与发布

- **PR 预览**：Vercel/Netlify/Cloudflare Pages 对每个 PR 自动生成临时环境（评审者点开链接就能体验），这是前端评审方式的最大升级；GitHub Pages 需自建 workflow 上传产物。
- **主干发布**：合并到 main 后构建并部署生产；静态产物（SPA）发布 = 上传 `dist` 到对象存储/CDN，注意 SPA 需配置"所有路径回退 index.html"。
- **原子发布与回滚**：产物按 commit hash 目录上传 + 切换指针（或直接依赖 CDN 版本化），回滚就是指回旧版本，而不是重新构建旧分支。
- **自动化版本**：changesets（monorepo 友好）或 release-please 管理 npm 包发版；纯应用项目用 tag 触发 release workflow。

## 6. 包体积预算与质量门禁

流水线里值得加的额外门禁：

```js
// scripts/check-bundle-size.mjs（示意）
import { readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const files = readdirSync('dist/assets').filter((f) => f.endsWith('.js'));
const totalGzip = files.reduce((sum, f) => {
  const buf = statSync(`dist/assets/${f}`); // 简化示意：真实实现需读文件再 gzip
  return sum + buf.size;
}, 0);
const max = Number(process.argv.at(-1)) * 1024;
if (totalGzip > max) {
  console.error(`bundle gzip 总量超预算：${totalGzip} > ${max}`);
  process.exit(1); // 非零退出码 = CI 失败
}
```

进阶可用 bundlesize / size-limit（对具体 chunk 设阈值）配合 Lighthouse CI（性能分数门禁）。原则：**预算写进 CI 才是预算**，写在文档里只是愿望。

## 7. 常见陷阱

- **机密进了前端产物**：`VITE_` 前缀误用是最常见的安全事故；上线前用产物检索工具扫一遍密钥片段。
- **没有锁文件冻结**：`pnpm install` 不带 `--frozen-lockfile`，CI 可能装出与本地不同的依赖版本，测试结果不可信。
- **缓存键设计错误**：缓存了 `node_modules` 却没绑定锁文件哈希，锁文件更新后仍用旧依赖；用平台原生缓存（`cache: pnpm`）而不是手搓目录缓存。
- **E2E 无 trace、flaky 不治理**：失败就重跑直到绿，掩盖真实回归；失败必须留证据，连续 flaky 的用例修或删。
- **构建环境差异**：本地 Node 22、CI Node 18，构建产物不同甚至报错；用 `engines` 字段 + setup-node 指定同版本。
- **每次全量跑所有 job**：文档站、Storybook 构建、E2E 全量并行在小型 PR 上浪费时间；用 `paths` 过滤与 `needs` 依赖做增量。

## 8. 小结

初学者要点：

- 流水线五段：安装（带缓存与 frozen-lockfile）-> typecheck/lint -> 单测 -> 构建 -> 部署/E2E，快速失败。
- `VITE_` 前缀 = 编译进产物、公开可见；机密只走 Secrets 与服务端。
- PR 预览环境让评审从"看代码"升级为"点体验"。

进阶注意：

- E2E 只保关键路径、失败必留 trace；webServer 配置让 Playwright 自动起服务。
- 包体积预算与 Lighthouse 门禁写进 CI；产物按版本化发布，回滚即切指针。
- monorepo 场景用 turbo/Nx 的任务缓存与 `--filter` 做增量流水线，见[React 与 Monorepo](/react/380-ReactMonorepo)。

## 速查

**最小 CI 步骤**

```yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with: { node-version: 22, cache: pnpm }
- run: pnpm install --frozen-lockfile
- run: pnpm typecheck && pnpm test && pnpm build
```

**机密与公开变量**

```yaml
env:
  VITE_API_BASE: https://api.example.com   # 公开，编译进产物
  DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }} # 机密，仅服务端/部署步骤可见
```

**Playwright CI**

```yaml
- run: pnpm exec playwright install --with-deps chromium
- run: pnpm exec playwright test
- if: failure()
  uses: actions/upload-artifact@v4
  with: { name: report, path: playwright-report }
```

**体积门禁**

```bash
npx size-limit --why      # 或 size-limit / bundlesize 配置 chunk 阈值
node scripts/check-bundle-size.mjs dist --max-gzip 300
```
