---
order: 52
title: 开源许可证选择
module: github
category: GitHub
difficulty: beginner
description: 开源许可证对比与选择：MIT、Apache、GPL等许可证的核心区别与适用场景。
author: fanquanpp
updated: '2026-06-14'
related:
  - github/分支模型与分支保护规则
  - github/Gitignore配置
  - github/依赖安全选项
  - github/Fork工作流
prerequisites:
  - github/GitHub概述
---

## 1. 开源许可证概述

### 1.1 为什么需要许可证

没有许可证的代码默认受**版权保护**，他人无权使用、修改或分发。开源许可证明确授予这些权利。

### 1.2 许可证分类

```
开源许可证
├── 宽松型（Permissive）
│   ├── MIT
│   ├── Apache 2.0
│   └── BSD
└── 传染型（Copyleft）
    ├── GPL v2
    ├── GPL v3
    └── AGPL
```

## 2. 主要许可证对比

| 特性               | MIT | Apache 2.0 | GPL v3 | AGPL v3 |
| :----------------- | :-- | :--------- | :----- | :------ |
| **商业使用**       |     |            |        |         |
| **修改**           |     |            |        |         |
| **分发**           |     |            |        |         |
| **专利授权**       |     |            |        |         |
| **闭源使用**       |     |            |        |         |
| **必须开源**       |     |            |        |         |
| **网络使用需开源** |     |            |        |         |
| **保留版权声明**   |     |            |        |         |
| **声明变更**       |     |            |        |         |

## 3. 许可证详解

### 3.1 MIT License

最流行的宽松许可证，**几乎无限制**：

- 可商业使用、修改、分发
- 可闭源使用
- 不提供专利保护
- 要求：保留版权声明和许可证文本

**适用**：希望最大程度推广的项目、库和工具

### 3.2 Apache License 2.0

比 MIT 更完善的宽松许可证：

- 所有 MIT 的权利
- **专利授权**：贡献者自动授予专利许可
- 商标保护：不授予商标权
- 要求：保留版权声明、声明变更、包含 NOTICE 文件

**适用**：企业级项目、需要专利保护的项目

### 3.3 GPL v3

最流行的传染型许可证：

- 商业使用、修改、分发
- **不能闭源分发**：分发时必须提供源代码
- 专利授权
- 反 DRM（Tivoization）
- **传染性**：衍生作品必须使用 GPL

**适用**：希望确保代码永远开源的项目

### 3.4 AGPL v3

GPL 的网络增强版：

- 所有 GPL v3 的条款
- **网络使用也算分发**：通过网络提供服务也必须开源
- **适用**：SaaS 场景，防止云厂商闭源使用

## 4. 选择决策

### 4.1 决策树

```
你希望别人如何使用你的代码？
├── 任意使用（包括闭源）→ MIT
├── 任意使用但需专利保护 → Apache 2.0
├── 衍生作品必须开源 → GPL v3
└── 网络服务也必须开源 → AGPL v3
```

### 4.2 按项目类型选择

| 项目类型      | 推荐许可证       | 理由         |
| :------------ | :--------------- | :----------- |
| **工具库**    | MIT              | 最大程度推广 |
| **框架**      | MIT / Apache 2.0 | 便于商业采用 |
| **应用程序**  | GPL v3           | 保护开源生态 |
| **SaaS 服务** | AGPL v3          | 防止闭源服务 |
| **企业项目**  | Apache 2.0       | 专利保护     |

## 5. 在 GitHub 上添加许可证

### 5.1 通过 GitHub 界面

1. 仓库 → Add file → Create new file
2. 输入 `LICENSE`
3. GitHub 提供模板选择
4. 选择许可证并提交

### 5.2 通过命令行

```bash
# 下载 MIT 许可证
curl -o LICENSE https://raw.githubusercontent.com/github/choosealicense.com/gh-pages/_licenses/mit.txt

# 编辑填入年份和姓名
```

### 5.3 package.json 中声明

```json
{
  "license": "MIT"
}
```
