---
order: 80
title: 项目初始化
module: 'shell'
category: 工具链
difficulty: beginner
description: 项目初始化流程、脚手架工具、模板选择与项目结构规范。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/090-BuildTool'
  - 'cs-fundamentals/040-ProgrammingParadigmBasics'
prerequisites:
  - 'shell/010-DevEnvSetup'
---

> 阅读建议：脚手架与项目结构是重点；Monorepo 属于进阶内容，0 基础学习者可先跳过。

## 1. 项目初始化概述

### 1.1 为什么需要规范化初始化

项目初始化不仅是创建文件和目录，更是建立**工程化基础设施**的关键步骤。良好的初始化可以：

- 统一团队开发规范
- 内置代码质量保障工具
- 自动化重复性操作
- 降低新人上手成本
- 避免后期补建基础设施的技术债

### 1.2 初始化检查清单

| 类别         | 项目                            | 说明           |
| :----------- | :------------------------------ | :------------- |
| **版本控制** | Git 仓库 + .gitignore           | 代码版本管理   |
| **依赖管理** | package.json / requirements.txt | 依赖声明与锁定 |
| **代码规范** | ESLint + Prettier               | 代码风格统一   |
| **提交规范** | Husky + commitlint              | 提交信息规范   |
| **测试框架** | Vitest / Jest / pytest          | 自动化测试     |
| **构建工具** | Vite / Webpack / Make           | 构建与打包     |
| **CI/CD**    | GitHub Actions / GitLab CI      | 持续集成与部署 |
| **文档**     | README + CHANGELOG              | 项目说明       |

## 2. 脚手架工具

### 2.1 前端脚手架

| 工具                 | 框架  | 特点                                       |
| :------------------- | :---- | :----------------------------------------- |
| **create-vue**       | Vue 3 | 官方脚手架，支持 TypeScript、Router、Pinia |
| **create-react-app** | React | 官方脚手架（已不推荐）                     |
| **Vite**             | 通用  | 极快的构建工具，支持多框架                 |
| **Next.js**          | React | SSR/SSG 全栈框架                           |
| **Nuxt**             | Vue 3 | SSR/SSG 全栈框架                           |

```bash
# Vue 3 项目
npm create vue@latest my-vue-app

# Vite 项目（选择框架）
npm create vite@latest my-project -- --template react-ts

# Next.js 项目
npx create-next-app@latest my-next-app --typescript --tailwind

# Nuxt 项目
npx nuxi@latest init my-nuxt-app
```

### 2.2 后端脚手架

```bash
# Python - FastAPI：官方 CLI 只有运行命令（fastapi dev / fastapi run），
# 没有官方脚手架；骨架靠手动或第三方工具（如 uvx fastapi-new）
pip install "fastapi[standard]"
mkdir my-api-project && cd my-api-project
# 写一个最小 main.py 后：
fastapi dev main.py        # 开发模式运行（自动热重载）

# Go - 标准项目
mkdir my-go-project && cd my-go-project
go mod init github.com/user/my-go-project

# Java - Spring Boot
# 使用 Spring Initializr: https://start.spring.io/
curl https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d groupId=com.example \
  -d artifactId=demo \
  -o demo.zip
```

### 2.3 自定义脚手架

使用 Yeoman 或自建 CLI 创建项目模板：

```javascript
// 简单脚手架实现
#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectName = process.argv[2];
const projectDir = path.join(process.cwd(), projectName);

// 创建目录
fs.mkdirSync(projectDir, { recursive: true });

// 初始化 Git
execSync('git init', { cwd: projectDir });

// 初始化 npm
execSync('npm init -y', { cwd: projectDir });

// 创建基础文件
const files = {
  'src/index.ts': '// Entry point\n',
  '.gitignore': 'node_modules/\ndist/\n.env\n',
  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      strict: true,
      outDir: './dist',
    },
    include: ['src/**/*'],
  }, null, 2),
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(projectDir, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

console.log(` Project ${projectName} created!`);
```

## 3. 项目结构规范

### 3.1 前端项目结构

```mermaid
flowchart TD
    T0["my-frontend-project/"]
    T1["public/                  # 静态资源"]
    T2["favicon.ico"]
    T3["src/"]
    T4["assets/             # 需要构建处理的资源"]
    T5["components/         # 可复用组件"]
    T6["common/         # 通用组件"]
    T7["business/       # 业务组件"]
    T8["composables/        # 组合式函数（Vue）/ Hooks（React）"]
    T9["layouts/            # 布局组件"]
    T10["pages/              # 页面组件"]
    T11["router/             # 路由配置"]
    T12["stores/             # 状态管理"]
    T13["styles/             # 全局样式"]
    T14["utils/              # 工具函数"]
    T15["types/              # TypeScript 类型定义"]
    T16["App.vue             # 根组件"]
    T17["main.ts             # 入口文件"]
    T18["tests/                  # 测试文件"]
    T19["eslint.config.js       # ESLint 配置（flat config，ESLint 9+ 默认）"]
    T20[".prettierrc             # Prettier 配置"]
    T21[".gitignore              # Git 忽略规则"]
    T22["index.html              # HTML 入口"]
    T23["package.json            # 项目配置"]
    T24["tsconfig.json           # TypeScript 配置"]
    T25["vite.config.ts          # Vite 配置"]
    T0 --> T1
    T2 --> T3
    T17 --> T18
    T17 --> T19
    T17 --> T20
    T17 --> T21
    T17 --> T22
    T17 --> T23
    T17 --> T24
    T17 --> T25
```

### 3.2 后端项目结构

```mermaid
flowchart TD
    T0["my-backend-project/"]
    T1["src/"]
    T2["controllers/        # 控制器"]
    T3["services/           # 业务逻辑"]
    T4["models/             # 数据模型"]
    T5["routes/             # 路由定义"]
    T6["middleware/          # 中间件"]
    T7["utils/              # 工具函数"]
    T8["config/             # 配置文件"]
    T9["app.ts              # 应用入口"]
    T10["tests/                  # 测试文件"]
    T11["migrations/             # 数据库迁移"]
    T12[".env.example            # 环境变量模板"]
    T13[".gitignore"]
    T14["Dockerfile              # Docker 构建"]
    T15["package.json"]
    T16["tsconfig.json"]
    T0 --> T1
    T9 --> T10
    T9 --> T11
    T9 --> T12
    T9 --> T13
    T9 --> T14
    T9 --> T15
    T9 --> T16
```

### 3.3 Monorepo 结构

```mermaid
flowchart TD
    T0["my-monorepo/"]
    T1["apps/"]
    T2["web/                # 前端应用"]
    T3["api/                # 后端 API"]
    T4["admin/              # 管理后台"]
    T5["packages/"]
    T6["ui/                 # 共享 UI 组件库"]
    T7["utils/              # 共享工具函数"]
    T8["config/             # 共享配置"]
    T9["pnpm-workspace.yaml     # pnpm 工作区配置"]
    T10["turbo.json              # Turborepo 配置"]
    T11["package.json"]
    T0 --> T1
    T4 --> T5
    T8 --> T9
    T8 --> T10
    T8 --> T11
```

## 4. 配置文件体系

### 4.1 核心配置文件

| 文件             | 用途                | 格式       |
| :--------------- | :------------------ | :--------- |
| `package.json`   | 项目元信息与依赖    | JSON       |
| `tsconfig.json`  | TypeScript 编译选项 | JSON       |
| `vite.config.ts` | Vite 构建配置       | TypeScript |
| `eslint.config.js` | 代码检查规则（ESLint 9+ 默认 flat config；旧式 `.eslintrc.*` 已弃用） | JavaScript |
| `.prettierrc`    | 代码格式化规则      | JSON       |
| `.gitignore`     | Git 忽略规则        | 文本       |
| `.env`           | 环境变量            | KEY=VALUE  |
| `Dockerfile`     | Docker 构建指令     | 文本       |

### 4.2 EditorConfig

`.editorconfig` 确保不同编辑器使用一致的格式：

```ini
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

## 5. Git 初始化最佳实践

### 5.1 初始提交

```bash
# 创建项目目录
mkdir my-project && cd my-project

# 初始化 Git
git init

# 创建 .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
EOF

# 创建 README
cat > README.md << 'EOF'
# My Project

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`
EOF

# 初始提交
git add .
git commit -m "chore: initial project setup"
```

### 5.2 分支初始化

```bash
# 创建开发分支
git checkout -b develop

# 创建功能分支
git checkout -b feature/setup-project

# 合并回开发分支
git checkout develop
git merge feature/setup-project

# 推送到远程
git remote add origin git@github.com:user/my-project.git
git push -u origin main
git push -u origin develop
```

## 6. 模板与预设

### 6.1 热门模板

| 模板              | 技术栈                    | 特点             |
| :---------------- | :------------------------ | :--------------- |
| **Vitesse**       | Vue 3 + Vite + TypeScript | Vue 社区流行模板 |
| **SvelteKit**     | Svelte + Vite             | Svelte 官方框架  |
| **T3 Stack**      | Next.js + tRPC + Prisma   | TypeScript 全栈  |
| **create-t3-app** | 同上                      | T3 Stack 脚手架  |

### 6.2 GitHub 模板仓库

GitHub 支持将仓库标记为**模板仓库**，其他用户可以基于模板创建新项目：

1. 仓库 Settings → 勾选 "Template repository"
2. 其他用户点击 "Use this template" 创建新仓库
3. 新仓库不包含 Git 历史，从零开始

## 7. 动手自检：遮住命令，说出每一步

先遮住参考答案，按题干自己写出验证步骤，再对照。

1. 不查文档，写出「新建一个 Vue 3 项目并初始化 Git、打好首个提交」的完整命令序列。
2. `.gitignore` 里 `node_modules/` 与 `.env` 这两条分别防什么？为什么 `.env.example` 反而要提交？
3. 为什么脚手架初始化的项目不建议直接 `git init` 在已有 README 的目录里？init 时 `main` 分支名靠什么配置保证？
4. Monorepo 把多个应用放进一个仓库，`.gitignore`、`package.json` 这类文件会怎么变化？

<details>
<summary>参考答案</summary>

1. `npm create vue@latest my-app && cd my-app && git init && git add . && git commit -m "chore: initial project setup"`——关键在 init.defaultBranch 已配为 main 时 init 即得 main，否则需要 `git branch -M main`（第 5 节）。
2. `node_modules/` 防把可再生的依赖目录提交进仓库（体积巨大且可由 lockfile 重建）；`.env` 防把密钥提交进历史（改文件删不掉历史里的密钥）。`.env.example` 只列变量名不含真实值，给协作者当配置模板（第 1.2 节与 100 篇的安全规则）。
3. 脚手架本身会生成 `.gitignore` 与初始 README，自己先 init 会让脚手架往「已提交历史」的目录里覆盖生成文件，容易产生混合状态；干净目录交给脚手架一次性生成是更可控的路径。
4. 会从「每仓一份」变成「仓库根共享一份」：根 package.json 只声明工作区（pnpm-workspace.yaml / turbo.json），`.gitignore` 也要补上各工作区共用的构建产物路径——单仓库的配置思维从「每项目自治」变成「根统一管理」。
</details>
