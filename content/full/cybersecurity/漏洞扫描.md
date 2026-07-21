---
order: 63
title: 漏洞扫描
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: '漏洞扫描工具与方法：Nessus、OpenVAS、Nuclei、Nikto 等扫描工具详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/渗透测试方法论
  - cybersecurity/信息收集
  - cybersecurity/安全编码原则
  - cybersecurity/输入验证
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 漏洞扫描概述

### 1.1 扫描类型

| 类型     | 描述             | 工具            |
| -------- | ---------------- | --------------- |
| 网络扫描 | 主机、端口、服务 | Nmap, Masscan   |
| 漏洞扫描 | 已知漏洞检测     | Nessus, OpenVAS |
| Web 扫描 | Web 应用漏洞     | Nikto, Nuclei   |
| 代码扫描 | 源代码漏洞       | SonarQube, SAST |

### 1.2 扫描策略

| 策略     | 描述              | 速度 | 准确度 |
| -------- | ----------------- | ---- | ------ |
| 快速扫描 | 常用端口+高危插件 | 快   | 中     |
| 标准扫描 | 全端口+标准插件   | 中   | 高     |
| 深度扫描 | 全端口+全部插件   | 慢   | 最高   |

## 2. Nessus

### 2.1 概述

Nessus 是最流行的商业漏洞扫描器，由 Tenable 开发。

| 版本                | 特点             |
| ------------------- | ---------------- |
| Nessus Essentials   | 免费、16 IP 限制 |
| Nessus Professional | 商业、无限制     |
| Nessus Manager      | 企业管理         |

### 2.2 扫描策略

| 策略                  | 用途         |
| --------------------- | ------------ |
| Basic Network Scan    | 通用网络扫描 |
| Advanced Scan         | 自定义扫描   |
| Web Application Tests | Web 应用     |
| Malware Scan          | 恶意软件     |
| Compliance Audit      | 合规审计     |

### 2.3 扫描流程

```
1. 创建扫描策略
2. 配置目标（IP/域名）
3. 设置凭据（可选，提高准确度）
4. 执行扫描
5. 分析结果
6. 导出报告
```

## 3. OpenVAS

### 3.1 概述

OpenVAS 是开源漏洞扫描器，是 Nessus 的分支。

### 3.2 安装与使用

```bash
# 安装（Kali Linux）
sudo apt install openvas
sudo gvm-setup

# 启动
sudo gvm-start

# 命令行扫描
gvm-cli socket --xml '<create_target><name>Test</name><hosts>192.168.1.0/24</hosts></create_target>'
```

### 3.3 与 Nessus 对比

| 对比项   | Nessus   | OpenVAS |
| -------- | -------- | ------- |
| 授权     | 商业     | 开源    |
| 插件更新 | 实时     | 延迟    |
| 界面     | 友好     | 一般    |
| 准确度   | 高       | 中      |
| 社区     | 商业支持 | 社区    |

## 4. Nuclei

### 4.1 概述

Nuclei 是基于模板的快速漏洞扫描器，由 ProjectDiscovery 开发。

### 4.2 核心特性

- YAML 模板驱动
- 并发扫描
- 社区模板库（5000+）
- 多协议支持

### 4.3 使用示例

```bash
# 基础扫描
nuclei -u https://example.com

# 使用特定模板
nuclei -u https://example.com -t cves/2023/

# 批量扫描
nuclei -l urls.txt -o results.txt

# 自定义模板
nuclei -u https://example.com -t custom-template.yaml
```

### 4.4 自定义模板

```yaml
id: custom-xss-check

info:
  name: Custom XSS Check
  author: security-team
  severity: medium

http:
  - method: GET
    path:
      - '{{BaseURL}}/search?q=<script>alert(1)</script>'
    matchers:
      - type: word
        words:
          - '<script>alert(1)</script>'
```

## 5. Nikto

### 5.1 概述

Nikto 是开源 Web 服务器扫描器，检测危险文件、过时组件、配置问题。

### 5.2 使用示例

```bash
# 基础扫描
nikto -h https://example.com

# 指定端口
nikto -h example.com -p 8080

# 使用代理
nikto -h example.com -useproxy http://proxy:8080

# 输出报告
nikto -h example.com -o report.html -Format htm
```

### 5.3 检测内容

| 类别       | 示例                   |
| ---------- | ---------------------- |
| 危险文件   | .git、.env、backup.sql |
| 过时组件   | 旧版 PHP、Apache       |
| 配置问题   | 目录列表、默认页面     |
| 服务器信息 | Server 头、版本        |

## 6. 扫描结果分析

### 6.1 误报处理

```
1. 确认漏洞是否真实存在
2. 手动验证扫描结果
3. 检查目标环境是否匹配
4. 排除已知误报模式
```

### 6.2 报告优先级

| 优先级 | 条件               |
| ------ | ------------------ |
| P0     | RCE、未授权访问    |
| P1     | SQL 注入、认证绕过 |
| P2     | XSS、CSRF          |
| P3     | 信息泄露、配置问题 |
| P4     | 低危、信息级       |

### 6.3 持续扫描

```
CI/CD 集成 → 每次部署自动扫描
定期扫描 → 每周/每月全量扫描
合规扫描 → 每季度合规审计
```
