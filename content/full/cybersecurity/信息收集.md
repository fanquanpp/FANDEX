---
order: 62
title: 信息收集
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: 信息收集技术：被动侦察、主动扫描、OSINT、子域名枚举与指纹识别详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/HTTPS原理
  - cybersecurity/渗透测试方法论
  - cybersecurity/漏洞扫描
  - cybersecurity/安全编码原则
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 信息收集概述

### 1.1 分类

| 类型     | 描述             | 特点             |
| -------- | ---------------- | ---------------- |
| 被动收集 | 不与目标直接交互 | 隐蔽、信息有限   |
| 主动收集 | 与目标直接交互   | 详细、可能被发现 |

### 1.2 收集目标

- 基础设施信息（IP、域名、网络拓扑）
- 技术栈信息（框架、中间件、CMS）
- 人员信息（员工、邮箱、组织架构）
- 业务信息（业务流程、合作伙伴）

## 2. 被动信息收集

### 2.1 DNS 信息

```bash
# 查询 A 记录
dig example.com A

# 查询所有记录
dig example.com ANY

# 区域传送（若配置不当）
dig axfr example.com @ns1.example.com

# 反向 DNS
dig -x 1.2.3.4
```

### 2.2 子域名枚举

| 工具      | 方法          | 特点       |
| --------- | ------------- | ---------- |
| subfinder | 被动 API 聚合 | 快速、全面 |
| Amass     | 被动+主动     | 最全面     |
| dnsrecon  | 字典+暴力     | 主动发现   |
| crt.sh    | 证书透明度    | 免费、有效 |

```bash
# subfinder
subfinder -d example.com -o subs.txt

# 证书透明度查询
curl -s "https://crt.sh/?q=%25.example.com&output=json" | jq -r '.[].name_value'

# DNS 暴力破解
dnsrecon -d example.com -D wordlist.txt -t brt
```

### 2.3 搜索引擎技巧

```
# Google Dork
site:example.com
site:example.com filetype:pdf
site:example.com inurl:admin
site:example.com intitle:"index of"
"example.com" filetype:sql
"example.com" filetype:conf
```

### 2.4 网络空间搜索

| 平台    | 特点          |
| ------- | ------------- |
| Shodan  | IoT、工业设备 |
| FOFA    | 国内资产      |
| Censys  | 证书、服务    |
| ZoomEye | 国内资产      |

### 2.5 WHOIS 与历史记录

```bash
# WHOIS 查询
whois example.com

# 历史记录
# whois-history.com
# viewdns.info
```

## 3. 主动信息收集

### 3.1 端口扫描

```bash
# 常用扫描
nmap -sV -sC -O -p- target

# SYN 扫描（隐蔽）
nmap -sS target

# UDP 扫描
nmap -sU --top-ports 100 target

# 脚本扫描
nmap --script=vuln target
```

**Nmap 扫描类型**：

| 参数 | 类型       | 特点           |
| ---- | ---------- | -------------- |
| -sS  | SYN 扫描   | 半开连接、快速 |
| -sT  | TCP 全连接 | 完整握手       |
| -sU  | UDP 扫描   | 较慢           |
| -sV  | 版本探测   | 识别服务版本   |
| -O   | OS 探测    | 识别操作系统   |

### 3.2 Web 指纹识别

| 工具       | 识别内容          |
| ---------- | ----------------- |
| Wappalyzer | CMS、框架、服务器 |
| WhatWeb    | Web 技术栈        |
| Wapplyzer  | 批量识别          |
| BuiltWith  | 技术栈分析        |

```bash
# WhatWeb
whatweb example.com

# Wappalyzer CLI
wappalyzer https://example.com
```

### 3.3 目录扫描

```bash
# dirsearch
dirsearch -u https://example.com -e php,html,js

# gobuster
gobuster dir -u https://example.com -w wordlist.txt

# feroxbuster
feroxbuster -u https://example.com -w wordlist.txt
```

### 3.4 漏洞扫描

```bash
# Nmap 漏洞脚本
nmap --script=vuln target

# Nikto（Web 漏洞扫描）
nikto -h https://example.com

# Nuclei（模板化扫描）
nuclei -u https://example.com -t cves/
```

## 4. OSINT 框架

### 4.1 常用框架

| 框架         | 特点           |
| ------------ | -------------- |
| Maltego      | 图形化关联分析 |
| SpiderFoot   | 自动化 OSINT   |
| Recon-ng     | 模块化侦察     |
| theHarvester | 邮箱/域名收集  |

### 4.2 社交媒体情报

| 平台     | 信息类型           |
| -------- | ------------------ |
| LinkedIn | 员工、职位、技术栈 |
| GitHub   | 代码泄露、仓库     |
| Twitter  | 技术讨论、泄露     |
| Pastebin | 数据泄露           |

### 4.3 代码仓库泄露

```bash
# 搜索 GitHub 泄露
# 关键词：password、secret、api_key、token、private_key

# truffleHog
trufflehog https://github.com/target/repo

# gitLeaks
gitleaks detect --repo-url=https://github.com/target/repo
```

## 5. 信息整理与分析

### 5.1 攻击面映射

```
域名 → IP → 端口 → 服务 → 版本 → 漏洞
  ↓
子域名 → 邮箱 → 员工 → 社工
```

### 5.2 工具链

```
subfinder → httpx → nuclei → 报告
  ↓          ↓        ↓
子域名   存活检测   漏洞扫描
```
