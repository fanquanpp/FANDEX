# FANDEX

综合技术自学资料库 (fanquanpp + memex) -- 覆盖编程语言、Web 前端、数据库、数据分析、算法与计算机基础。

在线阅读: [fanquanpp.github.io/FANDEX](https://fanquanpp.github.io/FANDEX/)

---

## 学习路径

```
入门:  Markdown --> Git --> GitHub --> HTML5 --> CSS --> JavaScript
前端:  JavaScript --> TypeScript --> Vue3
数据:  Python --> 数据分析 | MySQL
系统:  C --> C++ | Java
进阶:  算法与数据结构 --> 计算机基础
```

---

## 模块总览

### 基础工具

| 模块     | 内容                                         |
| :------- | :------------------------------------------- |
| 入门指南 | 环境搭建、学习规划、终端基础                 |
| Git      | 版本控制、分支管理、远程操作、内部原理       |
| GitHub   | 账户安全、PR 协作、Actions CI/CD、Pages 部署 |
| Markdown | 语法基础、高级语法、文档自动化               |

### 编程语言

| 模块       | 内容                                      |
| :--------- | :---------------------------------------- |
| C          | 语法、指针、结构体、文件 IO、系统编程     |
| C++        | 模板、STL、智能指针、OOP、内存管理        |
| Java       | OOP、集合、多线程、JVM、Spring Boot/Cloud |
| JavaScript | 原型链、异步、DOM、模块化、Node.js        |
| TypeScript | 类型系统、泛型、装饰器、工程化配置        |
| Python     | 语法、OOP、推导式、模块、数据分析基础     |
| Lua        | 语法、Table、闭包、协程、元表             |

### Web 前端

| 模块  | 内容                                       |
| :---- | :----------------------------------------- |
| HTML5 | 语义化、表单验证、Canvas、Web API、PWA     |
| CSS   | 选择器、Flex/Grid、定位、响应式、动画      |
| Vue3  | 组合式 API、响应式、Router、Pinia、TS 集成 |

### 数据技术

| 模块     | 内容                                       |
| :------- | :----------------------------------------- |
| MySQL    | SQL 语法、索引优化、事务锁、SQL 注入防御   |
| 数据分析 | NumPy、Pandas、Matplotlib、Seaborn、统计学 |

### 计算机科学

| 模块           | 内容                                         |
| :------------- | :------------------------------------------- |
| 算法与数据结构 | 排序、搜索、DP、贪心、图论、LeetCode 指南    |
| 计算机基础     | 体系结构、操作系统、网络、编译原理、设计模式 |

---

## 功能特性

- 学习进度追踪 (localStorage + IndexedDB 备份，支持导出/导入)
- 术语悬浮解释 (自动匹配文档中的专业术语)
- 交互式测验 (填空/选择/代码修正三种题型)
- 知识地图 (Mermaid 可视化概念关联)
- 前置知识提示 (模块间依赖关系展示)
- 全文搜索 (客户端搜索索引，支持中英文标题/描述/标签检索)
- 标签索引 (跨模块知识检索，按模块/难度/相关度筛选)
- 学习路线 (5 条职业方向路径可视化)
- 离线可用 (Service Worker 缓存)
- 暗色模式切换
- 响应式布局 (桌面端侧边栏 + 移动端抽屉导航)

---

## 技术栈

基于 Astro 5 SSG + Vue 3 Islands 构建的静态文档站点。

- Astro 5 静态站点生成 (SSG)
- Vue 3 交互式岛屿组件
- Shiki 双主题代码高亮 (构建时零 JS)
- 客户端搜索索引 (JSON, 221 篇文档)
- Mermaid 知识地图渲染
- Dark/Light 主题切换
- 响应式布局 (桌面侧边栏 + 移动端底部导航与抽屉模块切换)
- JSON-LD 结构化数据 (SEO)
- Service Worker 离线缓存

本地开发:

```bash
npm install
npm run dev
```

构建:

```bash
npm run build
```

---

## GitHub Pages 部署

仓库已配置 GitHub Actions 自动部署工作流 (`.github/workflows/deploy.yml`)。

1. 进入仓库 **Settings** --> **Pages**
2. **Source** 选择 **GitHub Actions**
3. 保存后，每次 push 到 main 分支会自动构建部署

---

## 项目结构

```
FANDEX/
├── .github/workflows/deploy.yml   # GitHub Actions 自动部署
├── .husky/pre-commit               # Git pre-commit 钩子
├── public/                         # 静态资源
│   ├── fonts/fonts.css             # 字体声明
│   ├── data/glossary-index.json    # 术语索引
│   ├── data/search-index.json      # 搜索索引
│   ├── sw.js                       # Service Worker
│   └── robots.txt                  # SEO
├── scripts/                        # 工具脚本
│   ├── build-glossary-index.mjs    # 术语索引构建
│   ├── build-search-index.mjs      # 搜索索引构建
│   ├── clean-true-prefix.mjs       # Obsidian 导出残留清理
│   ├── content-audit.mjs           # 内容质量审计
│   └── qa-check.mjs                # 预发布质量检查
├── src/                            # Astro 项目源码
│   ├── components/                 # Astro 组件
│   ├── content/                    # 内容集合 (唯一数据源)
│   │   ├── docs/{18 modules}/      # 文档内容
│   │   ├── glossary/{17 modules}/  # 术语表
│   │   └── config.ts               # Zod schema
│   ├── islands/                    # Vue 岛屿组件
│   │   ├── ThemeToggle.vue         # 主题切换
│   │   ├── ProgressToggle.vue      # 学习进度
│   │   └── QuizBlock.vue           # 交互测验
│   ├── lib/                        # 工具函数
│   │   ├── modules.ts              # 模块定义与依赖
│   │   ├── progress.ts             # 进度管理
│   │   └── term-tooltip.ts         # 术语悬浮
│   ├── pages/                      # 路由页面
│   └── styles/                     # 全局样式
├── astro.config.ts                 # Astro 配置
├── package.json                    # 依赖声明
└── tsconfig.json                   # TypeScript 配置
```

---

## 免责声明

本项目所有内容仅供个人学习与参考使用，不构成任何形式的专业建议、担保或承诺。

- 本项目中的技术文档、代码示例和配置方案基于公开资料整理编写，力求准确但不保证完全无误。使用时请以官方文档为准。
- 本项目可能包含指向第三方网站或资源的链接，这些外部内容不受本项目控制，对其准确性、合法性或可用性不作任何保证。
- 因使用本项目内容导致的任何直接或间接损失，作者不承担任何责任。
- 本项目中涉及的商标、产品名称等归其各自所有者所有，仅作引用说明之用，不构成任何关联或背书。
- 本项目内容可能随技术发展而过时，作者无义务及时更新，使用者应自行判断内容的时效性与适用性。

---

## 许可证

本项目仅供个人学习使用。未经授权，禁止将本项目内容用于商业用途。
