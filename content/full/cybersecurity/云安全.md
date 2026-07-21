---
order: 56
title: 云安全
module: cybersecurity
category: 网络安全
difficulty: advanced
description: 云安全：共享责任模型、CSPM、CWPP、云原生安全与合规
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/SSRF攻击
  - cybersecurity/恶意代码分析
  - cybersecurity/对称加密
  - cybersecurity/应急响应
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 共享责任模型

### 1.1 责任划分

| 层级     | 云厂商 | 客户       |
| -------- | ------ | ---------- |
| 物理安全 |        | -          |
| 基础设施 |        | -          |
| 网络     |        | 安全组/ACL |
| 操作系统 | -      |            |
| 运行时   | -      |            |
| 应用     | -      |            |
| 数据     | -      |            |

### 1.2 IaaS/PaaS/SaaS 责任

| 模式 | 客户责任   |
| ---- | ---------- |
| IaaS | OS以上     |
| PaaS | 应用和数据 |
| SaaS | 仅数据     |

## 2. CSPM（云安全态势管理）

### 2.1 检查项

| 类别 | 检查项           |
| ---- | ---------------- |
| 身份 | MFA、最小权限    |
| 网络 | 安全组、公开端口 |
| 存储 | 加密、公开访问   |
| 日志 | 审计日志启用     |
| 加密 | 传输/存储加密    |

### 2.2 常见错误配置

| 错误配置        | 风险       |
| --------------- | ---------- |
| S3公开读写      | 数据泄露   |
| 安全组0.0.0.0/0 | 暴露服务   |
| 无MFA           | 账号被入侵 |
| 硬编码凭证      | 凭证泄露   |
| 未加密EBS       | 数据泄露   |

## 3. CWPP（云工作负载保护）

### 3.1 保护层次

```
应用层：WAF、API安全
  ↓
容器层：镜像扫描、运行时保护
  ↓
OS层：HIDS、漏洞管理
  ↓
基础设施：网络策略、加密
```

### 3.2 容器安全

- 镜像扫描（Trivy）
- 运行时保护（Falco）
- 网络策略（NetworkPolicy）
- 安全上下文（SecurityContext）

## 4. 云原生安全

### 4.1 安全左移

| 阶段 | 安全措施          |
| ---- | ----------------- |
| 代码 | SAST、密钥扫描    |
| 构建 | 镜像扫描、签名    |
| 部署 | IaC扫描、策略检查 |
| 运行 | 运行时保护、监控  |

### 4.2 CNAPP

云原生应用保护平台，整合CSPM和CWPP：

- 代码到运行时全生命周期
- 统一安全策略
- 上下文关联分析

## 5. 云合规

### 5.1 合规标准

| 标准     | 适用     |
| -------- | -------- |
| SOC2     | 美国企业 |
| ISO27001 | 全球     |
| GDPR     | 欧盟数据 |
| PCI DSS  | 支付卡   |
| HIPAA    | 医疗     |
| 等保     | 中国     |

### 5.2 合规自动化

- AWS Config Rules
- Azure Policy
- GCP Organization Policy
- OPA/Gatekeeper
