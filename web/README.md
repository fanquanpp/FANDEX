<div align="center">

# FANDEX-web

**零基础到本科毕业的完整自学路径** · 线上学习平台

一份无需任何先修门槛的计算机自学教程，以系统化的知识组织方式，帮助零基础自学者从第一行代码起步，逐步建立达到计算机专业本科毕业生水平的完整知识体系。六大领域环环相扣，51 个模块覆盖工具链、开发语言、数据库、计算机科学、工程基础设施与数据技术，1995 篇结构化文档陪伴每一位自学者走完从入门到精通的完整旅程。

[![在线阅读](https://img.shields.io/badge/在线阅读-fanquanpp.github.io%2FFANDEX--web-2563eb?style=for-the-badge&logo=github&logoColor=white)](https://fanquanpp.github.io/FANDEX-web/)
[![Astro 7](https://img.shields.io/badge/Astro-7-ff5d01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![文档数](https://img.shields.io/badge/文档-1995-0ea5e9?style=flat-square)](https://fanquanpp.github.io/FANDEX-web/)
[![模块数](https://img.shields.io/badge/模块-51-8b5cf6?style=flat-square)](https://fanquanpp.github.io/FANDEX-web/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)

</div>

---

## 核心特性

- **内容基准仓库**：FANDEX 知识体系的根本内容源，所有文档、索引及数据均以此为唯一蓝本
- **零基础友好**：不预设任何编程经验，从环境搭建与 Markdown 写作起步，模块间通过前置知识自然衔接
- **完整知识体系**：1995 篇文档覆盖 51 个模块，从工具链到 AI 工程的完整学习路径
- **交互学习**：内置进度追踪、术语悬浮、交互测验、知识地图、全文搜索等学习辅助功能
- **PWA 离线访问**：Service Worker 多策略缓存（Cache First + Network First + SWR），支持添加到主屏幕
- **双主题响应式**：Dark / Light 主题切换，桌面端侧边栏 + 移动端抽屉导航 + 底部导航栏
- **AI 辅助理念**：不内置 AI 功能，鼓励学习者使用外部 AI 工具自主学习，文档结构适配 AI 检索与问答

## 模块总览

| 类别 | 模块 |
| :--- | :--- |
| 工具链 | 入门指南 · Markdown · Git · GitHub |
| 开发语言 | HTML5 · CSS · JavaScript · TypeScript · Vue 3 · React · C · C++ · Java · Kotlin · C# · Python · Go · Lua · HarmonyOS |
| 数据库 | SQL · MySQL · PostgreSQL · Redis |
| 计算机科学 | 算法与数据结构 · 计算机基础 · 高等数学 · 离散数学 · 线性代数 · 概率论与数理统计 · 英语 |
| 工程与基础设施 | 运维 · 网络技术 · 网络安全 · 云计算 · 物联网 · 软件测试 · AI Agent · 软件工程 · 软件架构 · 工程实践 |
| 数据技术 | 数据分析 · 大数据 · 机器学习 · 深度学习 · AI工程 · 计算机视觉 · 自然语言处理 · 大语言模型 · 生成式AI · 多模态AI · AI伦理与安全 |

> 1995 篇文档 · 51 个模块 · 27 篇术语表 · 交互式测验 · 知识地图 · 10 条职业方向学习路线

## 快速开始

### 环境要求

- Node.js 22 LTS
- npm（或 pnpm / yarn）

### 常用命令

```bash
# 安装依赖
npm install

# 本地开发（端口 3000）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果（搜索功能需先 build）
npm run preview

# TypeScript 类型检查
npm run type-check

# 运行单元测试
npm run test
```

> 开发模式下 Pagefind 搜索索引未生成，搜索功能不可用。需 `npm run build` 后 `npm run preview` 才能使用搜索。

### 部署

仓库已配置 GitHub Actions 自动部署（`.github/workflows/deploy.yml`），push 到 `main` 分支即自动构建并部署至 GitHub Pages。

## 技术栈

| 层级 | 技术 | 说明 |
| :--- | :--- | :--- |
| 框架 | Astro 7 | 静态站点生成 (SSG)，岛屿架构，内容集合 |
| 交互 | Vue 3 | `client:load` / `client:visible` 按需水合 |
| 样式 | Tailwind CSS v4 | CSS-first 配置，原子化工具类 |
| 组件 | shadcn-vue (radix-vue) | 无障碍基础组件库 |
| 高亮 | Shiki | 双主题代码高亮，构建时零 JS |
| 搜索 | Pagefind + Fuse.js | 构建后索引 + Web Worker 模糊搜索双引擎 |
| 图表 | Mermaid 11 | 知识地图渲染，CDN 按需加载 |
| 代码运行 | Pyodide + Web Worker | JS/TS 沙箱执行 + Python 浏览器内执行 |
| 存储 | IndexedDB + localStorage | 进度双存储备份，导出/导入 JSON |
| SEO | JSON-LD + Sitemap | 结构化数据 + Open Graph + Twitter Card |
| 离线 | Service Worker | Cache First + Network First + SWR 多策略缓存 |

## 关联项目

FANDEX 生态包含以下关联仓库，各仓库代码互相独立、内容互相关联，内容基准统一以本仓库为准：

| 仓库 | 定位 | 特色 |
| :--- | :--- | :--- |
| [FANDEX-exe](https://github.com/fanquanpp/FANDEX-exe) | 跨平台桌面端 | Tauri 2 桌面应用，Windows / macOS / Linux 跨平台离线访问 |
| [FANDEX-App](https://github.com/fanquanpp/FANDEX-App) | 离线移动速查应用 | Android 原生应用，Kotlin + Jetpack Compose 原生渲染，公式化语法速查 |

## 内容说明

本仓库为全部项目的根本内容源，所有文档、索引及数据均以此为唯一蓝本。本仓库仅允许只读引用，其余仓库如需变更内容，须从本仓库复制后在其独立仓库内进行适配与优化。

本仓库所有内容均由人工与人工智能（AI）共同编写、搜集、整理与编排。受限于编撰方式与知识更新速度，内容可能存在遗漏、过时或错误之处，使用者应结合官方文档与权威资料进行独立验证。

## 许可证

本仓库所有内容基于 [MIT 许可证](./LICENSE) 完全开源。任何个人或机构均可自由获取、使用、修改和分发本仓库的全部内容，包括但不限于学习、研究、修改、分发及商业用途，无需获得作者授权，但须保留原始版权声明与许可声明。

## 免责声明

- 本仓库所有内容均由人工与人工智能技术协同编撰、搜集、整理与编排。受限于编撰方式及知识更新周期，内容可能存在遗漏、过时或错误之处。使用者应结合官方文档与权威资料进行独立验证与核实，切勿将本仓库内容作为唯一依据
- 因使用或引用本仓库内容所产生的一切直接或间接后果，均由使用者自行承担。本仓库作者及维护者不对使用后果承担任何形式的法律责任或连带责任
- 本仓库不保证内容的准确性、完整性、时效性或适用性。在任何情况下，本仓库作者及维护者均不对因使用本仓库内容而导致的任何损失或损害承担责任
