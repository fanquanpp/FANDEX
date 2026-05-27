# MyNotebook v4

综合技术自学资料库 -- 覆盖编程语言、Web 前端、数据库、数据分析、算法与计算机基础。

在线阅读: [fanquanpp.github.io/MyNotebook](https://fanquanpp.github.io/MyNotebook/)

---

## 模块总览

### 基础工具

| 模块 | 目录 | 内容 |
|:---|:---|:---|
| Git | [git/](./git/) | 版本控制、分支管理、远程操作、内部原理 |
| GitHub | [github/](./github/) | 账户安全、PR 协作、Actions CI/CD、Pages 部署 |
| Markdown | [markdown/](./markdown/) | 语法基础、高级语法、文档自动化 |

### 编程语言

| 模块 | 目录 | 内容 |
|:---|:---|:---|
| C | [c/](./c/) | 语法、指针、结构体、文件 IO、系统编程 |
| Python | [python/](./python/) | 语法、OOP、推导式、模块、数据分析基础 |
| Java | [java/](./java/) | OOP、集合、多线程、JVM、Spring Boot/Cloud |
| JavaScript | [javascript/](./javascript/) | 原型链、异步、DOM、模块化、Node.js |
| TypeScript | [typescript/](./typescript/) | 类型系统、泛型、装饰器、工程化配置 |
| C++ | [cpp/](./cpp/) | 模板、STL、智能指针、OOP、内存管理 |
| Lua | [lua/](./lua/) | 语法、Table、闭包、协程、元表 |

### Web 前端

| 模块 | 目录 | 内容 |
|:---|:---|:---|
| HTML5 | [html5/](./html5/) | 语义化、表单验证、Canvas、Web API、PWA |
| CSS | [css/](./css/) | 选择器、Flex/Grid、定位、响应式、动画 |
| Vue3 | [vue3/](./vue3/) | 组合式 API、响应式、Router、Pinia、TS 集成 |

### 数据

| 模块 | 目录 | 内容 |
|:---|:---|:---|
| MySQL | [mysql/](./mysql/) | SQL 语法、索引优化、事务锁、SQL 注入防御 |
| 数据分析 | [data-analysis/](./data-analysis/) | NumPy、Pandas、Matplotlib、Seaborn、统计学 |

### 计算机科学

| 模块 | 目录 | 内容 |
|:---|:---|:---|
| 算法与数据结构 | [algorithm/](./algorithm/) | 排序、搜索、DP、贪心、图论、LeetCode 指南 |
| 计算机基础 | [cs-fundamentals/](./cs-fundamentals/) | 体系结构、操作系统、网络、编译原理、设计模式 |

---

## 学习路线

```
入门:  Markdown --> Git --> GitHub --> HTML5 --> CSS --> JavaScript
前端:  JavaScript --> TypeScript --> Vue3
数据:  Python --> 数据分析 | MySQL
系统:  C --> C++ | Java --> Spring
进阶:  算法与数据结构 --> 计算机基础
```

---

## 每个模块包含

| 文件类型 | 说明 |
|:---|:---|
| `overview.md` | 模块概述与环境搭建 |
| `*.md` | 各知识点详解，含代码示例与输出说明 |
| `glossary.md` / `*-glossary-*.md` | 名词注释速查表 |
| `theory.md` | 理论知识点（原理、设计思想、底层机制） |
| `project-example.md` | 完整项目实战示例 |
| `exercises/exercises.md` | 练习题（选择题 + 编程题，含参考答案） |
| `README.md` | 模块索引 |

---

## 技术站点

基于 Vue 3 + Vite + TypeScript 构建的文档阅读站点，位于 [site/](./site/) 目录。

功能:
- 模块导航与全文搜索
- Markdown 渲染 + Shiki 代码高亮
- 暗色 / 亮色主题切换
- 学习进度追踪 (localStorage)
- 响应式布局

本地开发:

```bash
cd site
npm install
npm run dev
```

构建:

```bash
cd site
npm run build-only
```

---

## GitHub Pages 部署

仓库已配置 GitHub Actions 自动部署工作流 (`.github/workflows/deploy.yml`)。

1. 进入仓库 **Settings** --> **Pages**
2. **Source** 选择 **GitHub Actions**
3. 保存后，每次 push 到 main 分支会自动构建部署

---

## Obsidian 知识库

本仓库可直接用 Obsidian 打开作为知识库使用:

- 配置目录: `.obsidian/`
- 导航索引: `MOC-Home.md`
- 学习模板: `.obsidian/templates/`
- 跨模块引用: 使用 `[[]]` wikilink 语法

---

## 项目结构

```
MyNotebook-main/
├── .github/workflows/deploy.yml   # GitHub Actions 自动部署
├── .obsidian/                     # Obsidian 知识库配置
├── site/                          # Vue3 文档站点源码
├── algorithm/                     # 算法与数据结构
├── c/                             # C 语言
├── cpp/                           # C++
├── css/                           # CSS
├── cs-fundamentals/               # 计算机基础
├── data-analysis/                 # 数据分析
├── git/                           # Git
├── github/                        # GitHub
├── html5/                         # HTML5
├── java/                          # Java
├── javascript/                    # JavaScript
├── lua/                           # Lua
├── markdown/                      # Markdown
├── mysql/                         # MySQL
├── python/                        # Python
├── typescript/                    # TypeScript
├── vue3/                          # Vue3
├── CONTEXT.md                     # 项目上下文
├── HANDOFF.md                     # 交接文档
├── MOC-Home.md                    # Obsidian 导航索引
└── README.md                      # 本文件
```

---

## 许可证

本项目仅供个人学习使用。
