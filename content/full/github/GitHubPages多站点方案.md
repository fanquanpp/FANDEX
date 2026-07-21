---
order: 80
tags:
  - github
difficulty: intermediate
title: 'GitHub Pages 多站点方案'
module: github
category: 'GitHub Advanced'
description: 'GitHub Pages 静态站点部署方案：Jekyll、VitePress、Hugo 构建与发布。'
author: Anonymous
related:
  - github/社区健康文件
  - github/PullRequest完整协作流程
  - github/GitHubActions与CICD
  - github/Actions触发器
prerequisites:
  - github/GitHub概述
---

## 1. 背景

**GitHub Pages** 可从分支或 **GitHub Actions** 发布静态文件到 `*.github.io` 或自定义域名。常见生成器：**Jekyll（Ruby）**、**VitePress（Vite + Vue 文档框架）**、**Hugo（Go）**。三者均输出 HTML/CSS/JS，差异在 **模板语言**、**构建速度** 与 **生态**。

## 2. GitHub Pages 概述

### 2.1 类型

- **用户/组织站点**：`username.github.io` 或 `orgname.github.io`，从 `main` 分支构建
- **项目站点**：`username.github.io/repo`，从 `gh-pages` 分支或 `main` 分支的 `docs` 目录构建

### 2.2 特点

- **免费**：GitHub Pages 是免费的静态站点托管服务
- **自动 HTTPS**：为所有站点提供免费的 HTTPS 证书
- **集成 GitHub**：与 GitHub 仓库无缝集成
- **支持自定义域名**：可以使用自己的域名
- **静态内容**：只支持静态文件，不支持服务器端脚本

## 3. 静态站点生成器对比

| 特性     | Jekyll                  | VitePress             | Hugo                 |
| -------- | ----------------------- | --------------------- | -------------------- |
| 语言     | Ruby                    | JavaScript (Vue)      | Go                   |
| 构建速度 | 中等                    | 快                    | 极快                 |
| 模板语言 | Liquid                  | Vue 模板              | Go 模板              |
| 生态系统 | 丰富（GitHub 官方支持） | 现代（Vue 生态）      | 快速（Go 生态）      |
| 学习曲线 | 中等                    | 中等（熟悉 Vue 者快） | 中等                 |
| 适用场景 | 博客、个人网站          | 技术文档              | 博客、文档、企业网站 |

## 4. 部署方式

### 4.1 从分支部署

1. **设置分支**：在仓库的 **Settings → Pages → Build and deployment** 中选择：

- **Source**：`Deploy from a branch`
- **Branch**：选择分支（如 `main` 或 `gh-pages`）和目录（如 `/` 或 `/docs`）

2. **推送代码**：将静态文件推送到选定的分支
3. **等待构建**：GitHub 会自动构建并部署站点

### 4.2 使用 GitHub Actions 部署

1. **设置 Pages**：在仓库的 **Settings → Pages → Build and deployment** 中选择：

- **Source**：`GitHub Actions`

2. **创建 workflow**：在 `.github/workflows/` 目录下创建部署 workflow 文件
3. **运行 workflow**：推送代码后，Actions 会自动构建并部署站点

## 5. 方案 A：Jekyll

### 5.1 环境搭建

```bash
 # 安装 Ruby 和 Bundler
 # Windows：使用 RubyInstaller
 # macOS：使用 Homebrew: brew install ruby
 # Linux：使用包管理器
 # 安装 Jekyll 和 Bundler
 gem install jekyll bundler
 # 检查安装
 jekyll -v
```

### 5.2 创建站点

```bash
 # 创建新站点
 jekyll new my-site
 cd my-site
 # 安装依赖
 bundle install
 # 本地预览
 bundle exec jekyll serve
 # 访问 http://localhost:4000
```

### 5.3 配置文件

`_config.yml`：

```yaml
title: My Site
email: your-email@example.com
description: >- # this means to ignore newlines until "baseurl":
  Write an awesome description for your new site here. You can edit this
  line in _config.yml. It will appear in your document head meta (for
  Google search results) and in your feed.xml site description.
baseurl: '' # the subpath of your site, e.g. /blog
url: 'https://yourusername.github.io' # the base hostname & protocol for your site, e.g. http://example.com
twitter_username: jekyllrb
github_username: jekyll
# Build settings
theme: minima
plugins:
  - jekyll-feed
# Exclude from processing.
# The following items will not be processed, by default. Create a custom list
# to override the default setting.
exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor/bundle/
  - vendor/cache/
  - vendor/gems/
  - vendor/ruby/
```

### 5.4 目录结构

```
 my-site/
 ├── _config.yml
 ├── _data/
 ├── _drafts/
 ├── _includes/
 ├── _layouts/
 ├── _posts/
 ├── _sass/
 ├── assets/
 ├── Gemfile
 ├── Gemfile.lock
 └── index.md
```

### 5.5 GitHub Actions 部署

`.github/workflows/jekyll.yml`：

```yaml
 name: Deploy Jekyll site to Pages
 on:
  push:
  branches: [main]
  workflow_dispatch:
 permissions:
  contents: read
  pages: write
  id-token: write
 concurrency:
  group: "pages"
  cancel-in-progress:
 jobs:
  build:
  runs-on: ubuntu-latest
  steps:
  - name: Checkout
  uses: actions/checkout@v4
  - name: Setup Ruby
  uses: ruby/setup-ruby@v1
  with:
  ruby-version: '3.1'
  bundler-cache:
  - name: Build with Jekyll
  run: bundle exec jekyll build
  env:
  JEKYLL_ENV: production
  - name: Upload artifact
  uses: actions/upload-pages-artifact@v2
  deploy:
  needs: build
  runs-on: ubuntu-latest
  environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
  steps:
  - name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v2
```

## 6. 方案 B：VitePress

### 6.1 环境搭建

```bash
 # 安装 Node.js（推荐 16+）
 # 检查安装
 node -v
 npm -v
```

### 6.2 创建站点

```bash
 # 创建 VitePress 站点
 npm create vitepress@latest docs
 # 进入目录
 cd docs
 # 安装依赖
 npm install
 # 本地预览
 npm run docs:dev
 # 访问 http://localhost:5173
 # 构建
 npm run docs:build
 # 构建产物在 .vitepress/dist 目录
```

### 6.3 配置文件

`.vitepress/config.ts`：

```typescript
 import { defineConfig } from 'vitepress'
 export default defineConfig({
  title: 'My Site',
  description: 'A VitePress site',
  base: '/repo/', // 项目站点需要设置
  themeConfig: {
  nav: [
  { text: 'Home', link: '/' },
  { text: 'Guide', link: '/guide/' },
  { text: 'API', link: '/api/' }
  ],
  sidebar: {
  '/guide/': [
  { text: 'Introduction', link: '/guide/' },
  { text: 'Getting Started', link: '/guide/getting-started' }
  ],
  '/api/': [
  { text: 'Overview', link: '/api/' },
  { text: 'Reference', link: '/api/reference' }
  ]
  }
  }
 }
```

### 6.4 目录结构

```
 docs/
 ├── .vitepress/
 │ ├── config.ts
 │ └── dist/
 ├── guide/
 │ ├── index.md
 │ └── getting-started.md
 ├── api/
 │ ├── index.md
 │ └── reference.md
 └── index.md
```

### 6.5 GitHub Actions 部署

`.github/workflows/vitepress.yml`：

```yaml
 name: Deploy VitePress site to Pages
 on:
  push:
  branches: [main]
  workflow_dispatch:
 permissions:
  contents: read
  pages: write
  id-token: write
 concurrency:
  group: "pages"
  cancel-in-progress:
 jobs:
  build:
  runs-on: ubuntu-latest
  steps:
  - name: Checkout
  uses: actions/checkout@v4
  with:
  fetch-depth: 0
  - name: Setup Node.js
  uses: actions/setup-node@v4
  with:
  node-version: '18'
  cache: npm
  - name: Install dependencies
  run: npm ci
  - name: Build
  run: npm run docs:build
  - name: Upload artifact
  uses: actions/upload-pages-artifact@v2
  with:
  path: docs/.vitepress/dist
  deploy:
  needs: build
  runs-on: ubuntu-latest
  environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
  steps:
  - name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v2
```

## 7. 方案 C：Hugo

### 7.1 环境搭建

```bash
 # 安装 Hugo（推荐 Extended 版本）
 # Windows：使用 Chocolatey: choco install hugo-extended
 # macOS：使用 Homebrew: brew install hugo
 # Linux：使用包管理器或二进制文件
 # 检查安装
 hugo version
```

### 7.2 创建站点

```bash
 # 创建新站点
 hugo new site my-site --format yaml
 cd my-site
 # 添加主题（使用 git submodule）
 git init
 git submodule add https://github.com/theNewDynamic/gohugo-theme-ananke.git themes/ananke
 # 配置主题
 echo 'theme: ananke' >> config.yaml
 # 创建内容
 hugo new posts/my-first-post.md
 # 本地预览
 hugo server -D
 # 访问 http://localhost:1313
 # 构建
 hugo --minify
 # 构建产物在 public 目录
```

### 7.3 配置文件

`config.yaml`：

```yaml
baseURL: https://yourusername.github.io/repo/ # 项目站点需要设置
languageCode: en-us
title: My New Hugo Site
theme: ananke
params:
  description: 'My Hugo site'
  author: 'Your Name'
  social:
  twitter: 'yourusername'
  github: 'yourusername'
```

### 7.4 目录结构

```
 my-site/
 ├── archetypes/
 ├── content/
 │ └── posts/
 │ └── my-first-post.md
 ├── data/
 ├── layouts/
 ├── static/
 ├── themes/
 │ └── ananke/
 ├── config.yaml
 └── go.mod
```

### 7.5 GitHub Actions 部署

`.github/workflows/hugo.yml`：

```yaml
 name: Deploy Hugo site to Pages
 on:
  push:
  branches: [main]
  workflow_dispatch:
 permissions:
  contents: read
  pages: write
  id-token: write
 concurrency:
  group: "pages"
  cancel-in-progress:
 jobs:
  build:
  runs-on: ubuntu-latest
  steps:
  - name: Checkout
  uses: actions/checkout@v4
  with:
  submodules:
  fetch-depth: 0
  - name: Setup Hugo
  uses: peaceiris/actions-hugo@v2
  with:
  hugo-version: 'latest'
  extended:
  - name: Build
  run: hugo --minify
  - name: Upload artifact
  uses: actions/upload-pages-artifact@v2
  deploy:
  needs: build
  runs-on: ubuntu-latest
  environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
  steps:
  - name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v2
```

## 8. 自定义域名设置

### 8.1 配置 DNS

1. **A 记录**：指向 GitHub Pages 的 IP 地址

- 185.199.108.153
- 185.199.109.153
- 185.199.110.153
- 185.199.111.153

2. **CNAME 记录**：指向 `username.github.io`

### 8.2 仓库设置

1. 在仓库的 **Settings → Pages → Custom domain** 中输入自定义域名
2. 点击 **Save**
3. 等待 GitHub 验证域名
4. 启用 **Enforce HTTPS** 选项

### 8.3 验证配置

```bash
 # 验证 DNS 配置
 dig yourdomain.com +noall +answer
 # 验证 HTTPS
 curl -I https://yourdomain.com
```

## 9. 常见问题与解决方案

### 9.1 资源 404 错误

- **问题**：静态资源（CSS、JS、图片）无法加载
- **解决方案**：

1.  检查 base URL 配置是否正确
2.  确保资源路径使用相对路径
3.  检查构建输出目录结构

### 9.2 CNAME 文件被覆盖

- **问题**：构建后 CNAME 文件被删除
- **解决方案**：

1.  在静态目录中添加 CNAME 文件
2.  配置构建工具保留 CNAME 文件
3.  在 CI 流程中重新创建 CNAME 文件

### 9.3 构建失败

- **问题**：GitHub Actions 构建失败
- **解决方案**：

1.  查看 Actions 日志，了解失败原因
2.  确保依赖安装正确
3.  检查配置文件语法
4.  确认主题或插件正确安装

### 9.4 部署权限不足

- **问题**：GitHub Actions 部署失败，提示权限不足
- **解决方案**：

1.  在 workflow 文件中添加正确的权限配置
2.  确保 `GITHUB_TOKEN` 有足够的权限
3.  检查仓库的 Pages 设置

## 10. 最佳实践

### 10.1 性能优化

- **压缩资源**：启用 minify 选项
- **缓存策略**：设置合理的缓存头
- **图片优化**：使用适当的图片格式和尺寸
- **CDN**：使用 CDN 加速静态资源
- **按需加载**：实现代码分割和按需加载

### 10.2 SEO 优化

- **元标签**：设置合适的 title、description 和其他元标签
- **站点地图**：生成并提交 sitemap.xml
- **robots.txt**：配置 robots.txt 文件
- **结构化数据**：添加 JSON-LD 结构化数据
- **canonical URL**：设置规范 URL

### 10.3 维护与更新

- **定期更新**：定期更新依赖和主题
- **备份**：定期备份站点内容
- **监控**：监控站点状态和性能
- **测试**：在部署前进行本地测试
- **版本控制**：使用 Git 管理站点源码

### 10.4 安全

- **HTTPS**：启用 HTTPS
- **依赖扫描**：使用 Dependabot 扫描安全漏洞
- **访问控制**：合理设置仓库访问权限
- **输入验证**：确保用户输入安全

## 11. 实际应用案例

### 11.1 个人博客

- **生成器**：Jekyll 或 Hugo
- **主题**：选择适合博客的主题
- **内容**：定期更新博客文章
- **部署**：使用 GitHub Actions 自动部署

### 11.2 技术文档

- **生成器**：VitePress
- **结构**：清晰的文档结构和导航
- **搜索**：启用文档搜索功能
- **版本**：支持多版本文档

### 11.3 企业网站

- **生成器**：Hugo
- **设计**：定制化主题和设计
- **内容**：公司介绍、产品信息、联系方式
- **集成**：集成表单和其他服务

## 12. 与其他静态站点托管服务对比

| 服务             | 优势                             | 劣势                   |
| ---------------- | -------------------------------- | ---------------------- |
| GitHub Pages     | 免费、与 GitHub 集成、自动 HTTPS | 构建时间限制、功能有限 |
| Netlify          | 功能丰富、CI/CD 集成、自定义域名 | 免费计划有流量限制     |
| Vercel           | 速度快、Next.js 优化、自动 HTTPS | 免费计划有项目数量限制 |
| GitLab Pages     | 免费、与 GitLab 集成、CI/CD      | 界面不如 GitHub 友好   |
| Cloudflare Pages | 速度快、CDN 集成、免费           | 功能相对有限           |

## 13. 延伸阅读

- [GitHub Pages 文档](https://docs.github.com/en/pages) <!-- nofollow -->
- [Jekyll 文档](https://jekyllrb.com/docs/) <!-- nofollow -->
- [VitePress 文档](https://vitepress.dev/) <!-- nofollow -->
- [Hugo 文档](https://gohugo.io/documentation/) <!-- nofollow -->
- [静态站点生成器对比](https://jamstack.org/generators/) <!-- nofollow -->

## 更新日志

- **2026-04-05**：初版。
- **2026-05-03**：扩展内容，添加 GitHub Pages 的详细介绍和特点、三种静态站点生成器的详细对比、每种生成器的详细配置和使用指南、GitHub Actions 部署的详细配置、自定义域名的详细设置步骤、常见问题的详细解决方案、更多最佳实践和实际应用案例、性能优化和SEO建议、与其他静态站点托管服务的对比。
