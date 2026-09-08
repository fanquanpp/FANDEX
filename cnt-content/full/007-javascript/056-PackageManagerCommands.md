---
order: 560
title: JavaScript 包管理命令速查（npm/pnpm/yarn）
module: 'javascript'
category: 前端技术
difficulty: beginner
description: JavaScript 包管理命令速查（npm/pnpm/yarn） 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 初始化项目

**基本写法：生成 package.json**
`npm init [-y]` | `pnpm init` | `yarn init [-y]`
```bash
# -y 使用默认值跳过提问
npm init -y
pnpm init
yarn init -y
```

---

## 安装依赖

**基本写法：安装全部依赖**
`npm install` | `pnpm install` | `yarn`
```bash
# 读取 lock 文件安装
npm install        # npm
pnpm install       # pnpm
yarn               # yarn
```

---

**基本写法：添加单个包**
`npm install <包> [-D|-g]`
```bash
# -D 开发依赖 -g 全局
npm install lodash            # 生产依赖
npm install -D vitest         # 开发依赖
npm install -g typescript     # 全局安装
pnpm add lodash
pnpm add -D vitest
yarn add lodash
yarn add --dev vitest
```

---

**基本写法：指定版本安装**
`npm install <包>@<版本>`
```bash
# 版本范围
npm install react@18.2.0
npm install react@"^18.0.0"
npm install react@latest
pnpm add react@18.2.0
yarn add react@18.2.0
```

---

## 卸载与更新

**基本写法：卸载依赖**
`npm uninstall <包>` | `pnpm remove <包>` | `yarn remove <包>`
```bash
npm uninstall lodash
pnpm remove lodash
yarn remove lodash
```

---

**基本写法：更新依赖**
`npm update [<包>]` | `pnpm update [<包>]` | `yarn upgrade [<包>]`
```bash
npm update react
pnpm update react
yarn upgrade react
```

---

## 运行脚本

**基本写法：执行 package.json scripts**
`npm run <脚本>` | `pnpm <脚本>` | `yarn <脚本>`
```bash
# package.json: "scripts": { "dev": "vite" }
npm run dev
pnpm dev          # pnpm 可省略 run
yarn dev          # yarn 也可省略 run
```

---

**基本写法：npx 执行本地命令**
`npx <命令>`
```bash
# 执行 node_modules/.bin 下的命令
npx tsc --noEmit
npx create-vite my-app
pnpm dlx create-vite my-app   # pnpm 等价
yarn dlx create-vite my-app
```

---

## 锁文件与严格安装

**基本写法：按 lock 文件严格安装**
`npm ci` | `pnpm install --frozen-lockfile` | `yarn install --frozen-lockfile`
```bash
# CI 环境推荐，不修改 lock
npm ci
pnpm install --frozen-lockfile
yarn install --frozen-lockfile
```

---

## 工作区 Monorepo

**基本写法：定义工作区**
`<根 package.json>: "workspaces": ["packages/*"]`
```json
{
  "private": true,
  "workspaces": ["packages/*", "apps/*"]
}
```

---

**基本写法：工作区命令**
`npm -w <包> <命令>` | `pnpm --filter <包> <命令>` | `yarn workspace <包> <命令>`
```bash
# 在指定工作区执行
npm -w @a/core run build
pnpm --filter @a/core build
yarn workspace @a/core build
```

---

**基本写法：安装工作区包**
`npm -w <包A> i <包B>` | `pnpm add <包B> --filter <包A>`
```bash
# 给 app 安装内部包
npm -w apps/web i @a/core
pnpm add @a/core --filter apps/web
yarn workspace apps/web add @a/core
```

---

## 查询信息

**基本写法：查看包信息**
`npm view <包> [<字段>]`
```bash
npm view react version
npm view react versions --json
pnpm view react version
```

---

**基本写法：列出依赖树**
`npm ls [<包>]` | `pnpm list` | `yarn list`
```bash
npm ls react
npm ls --depth=1
pnpm why react    # 解释为何依赖
```

---

## 清理与缓存

**基本写法：清理 node_modules**
`rm -rf node_modules` + 重装
```bash
# 彻底重装
rm -rf node_modules package-lock.json
npm install
```

---

**基本写法：缓存管理**
`npm cache clean --force` | `pnpm store prune`
```bash
npm cache clean --force
pnpm store prune
yarn cache clean
```

---

## 发布与镜像

**基本写法：设置镜像源**
`npm config set registry <url>`
```bash
npm config set registry https://registry.npmmirror.com
npm config get registry
pnpm config set registry https://registry.npmmirror.com
```

---

**基本写法：发布包**
`npm publish`
```bash
npm publish           # 发布到 registry
npm publish --access public  # 公开 scoped 包
npm deprecate <包>@<版本> "废弃说明"
```

---

## pnpm 硬链接特性

**基本写法：pnpm 全局存储**
`pnpm config set store-dir <路径>`
```bash
# pnpm 用硬链接复用全局存储，节省磁盘
pnpm config get store-dir
pnpm install   # 自动链接 store
```

## 核心知识点

> 一句话记住包管理：`npm install` 装依赖，`-D` 开发依赖，`npx` 直接跑工具，`package.json` 是项目清单，锁文件保证版本一致。

- `npm install <pkg>` 安装；`-D` 开发依赖；`-g` 全局；
- `npx <cmd>` 执行本地工具（vite、tsc）；
- `package.json`：`scripts`/`dependencies`/`devDependencies`；
- `package-lock.json` 锁定版本；
- 常用脚本：`npm run dev/build/test`；
- pnpm 更省磁盘、更严格。

## 动手试试

1. 初始化项目并安装一个依赖，观察 package.json 变化；
2. 用 `npx` 运行一次性的工具；
3. 查看 `npm ls` 的依赖树；
4. 进阶挑战：对比 npm 与 pnpm 的安装结果。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 不提交锁文件 | 版本漂移 | 提交 package-lock.json |
| 全局装工具 | 版本冲突 | 用 npx 或项目依赖 |
| 依赖过时 | 安全漏洞 | 定期 `npm audit` |

## 扩展学习

- Monorepo：`pnpm-monorepo/` 模块；
- 模块：`javascript/038-JavaScriptModular`；
- 构建：`javascript/040-ModuleBundlingAndTreeShaking`。
