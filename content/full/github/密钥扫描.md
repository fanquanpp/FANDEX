---
order: 60
title: 密钥扫描
module: github
category: GitHub
difficulty: intermediate
description: GitHub密钥扫描：自动检测泄露的密钥、推送保护与补救措施。
author: fanquanpp
updated: '2026-06-14'
related:
  - github/依赖自动更新
  - 'github/Issues模板-标签与里程碑'
  - github/CodeQL代码扫描
  - github/命令行工具
prerequisites:
  - github/GitHub概述
---

## 1. 密钥扫描概述

### 1.1 为什么需要密钥扫描

意外将密钥（API Key、Token、密码）推送到公开仓库是常见的安全事故。密钥扫描可以**自动检测**并阻止泄露。

### 1.2 GitHub 密钥扫描功能

| 功能             | 说明                 | 可用性       |
| :--------------- | :------------------- | :----------- |
| **密钥扫描**     | 扫描仓库中的密钥     | 公开仓库免费 |
| **推送保护**     | 阻止推送含密钥的代码 | 免费启用     |
| **Partner 模式** | 与服务提供商联动撤销 | 自动         |

## 2. 支持的密钥类型

### 2.1 常见密钥

| 类型               | 模式示例            | 服务   |
| :----------------- | :------------------ | :----- |
| **GitHub Token**   | `ghp_xxxx`          | GitHub |
| **AWS Access Key** | `AKIAxxxx`          | AWS    |
| **Google API Key** | `AIza...`           | Google |
| **Slack Token**    | `xoxb-...`          | Slack  |
| **Stripe Key**     | `sk_live_...`       | Stripe |
| **私钥**           | `-----BEGIN RSA...` | 通用   |

GitHub 支持检测超过 200 种密钥类型。

## 3. 推送保护

### 3.1 启用推送保护

1. 仓库 Settings → Code security → Push protection → Enable

### 3.2 推送保护工作流程

```
git push
    ↓
GitHub 检查推送内容
    ↓
发现密钥？
├── 是 → 阻止推送，显示警告
│         ↓
│    选项1: 修改代码移除密钥
│    选项2: 如果是误报，允许推送
│
└── 否 → 正常推送
```

### 3.3 绕过推送保护

```bash
# 如果确认不是真实密钥（如测试数据）
git push --force
# 或在推送时添加标记
# 在 commit message 中添加 "@allow"
```

## 4. 密钥泄露补救

### 4.1 立即行动

```bash
# 1. 撤销泄露的密钥
# 在对应服务平台重新生成密钥

# 2. 从 Git 历史中移除
git filter-repo --path .env --invert-paths

# 3. 强制推送
git push --force

# 4. 通知团队
```

### 4.2 使用环境变量

```bash
#  硬编码密钥
const API_KEY = "sk_live_abc123";

#  使用环境变量
const API_KEY = process.env.API_KEY;
```

### 4.3 使用 GitHub Secrets

```yaml
# .github/workflows/deploy.yml
env:
  API_KEY: ${{ secrets.API_KEY }}
```

## 5. 自定义模式

### 5.1 添加自定义密钥模式

组织 Settings → Code security → Custom patterns

```regex
# 示例：检测自定义 API Key
MYCOMPANY_API_KEY=[A-Za-z0-9]{32}
```

## 6. 最佳实践

- 启用推送保护
- 使用 `.gitignore` 排除敏感文件
- 使用 GitHub Secrets 存储 CI/CD 密钥
- 使用环境变量而非硬编码
- 定期轮换密钥
- 使用预提交钩子检测密钥

```bash
# 安装 detect-secrets 预提交钩子
pip install detect-secrets
detect-secrets scan > .secrets.baseline
pre-commit install
```
