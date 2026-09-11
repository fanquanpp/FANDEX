---
order: 380
title: 信息收集
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 信息收集技术：被动侦察、主动扫描、OSINT、子域名枚举与指纹识别详解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/090-HTTPSPrinciple'
  - 'cybersecurity/360-PenetrationTestingMethodology'
  - 'cybersecurity/400-VulnerabilityScan'
  - 'cybersecurity/330-SecureCodingPrinciples'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
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

## 6. 完整工作流示例（授权目标）

把上面的散点命令串成一次可复现的侦察流程（假定已获得 example.com 的测试授权）：

```bash
# 第 1 步：被动收集资产（不触碰目标网络）
subfinder -d example.com -passive -o subs.txt
curl -s "https://crt.sh/?q=%25.example.com&output=json" | jq -r '.[].name_value' | sort -u >> subs.txt
sort -u subs.txt -o subs.txt && wc -l subs.txt

# 第 2 步：存活与 Web 指纹（开始主动接触，注意流量可见）
cat subs.txt | httpx -title -tech-detect -status-code -o live.txt

# 第 3 步：目录与敏感路径探测（只对授权资产）
gobuster dir -u https://test.example.com -w /usr/share/wordlists/dirb/common.txt \
  -x php,bak,sql,env -o dirs.txt

# 第 4 步：已知漏洞模板扫描（先用轻量标签，避免破坏性模块）
nuclei -l live.txt -severity low,medium,high,critical -exclude-tags intrusive -o vulns.txt

# 第 5 步：人工研判，把结果整理为「资产 → 发现 → 证据」结构，进入漏洞验证阶段
```

每一步的产出都是下一步的输入；把 1-4 步写成脚本定期重跑，就成了轻量级
「攻击面监控」，能发现「忘删的测试子域」「新上线未配 TLS 的服务」这类真实泄露源。

## 7. 合法性与隐蔽性边界

信息收集是渗透测试中**最容易越界**的环节，两条红线必须写进授权书：

```text
1. 范围红线：只收集授权范围内的资产。证书透明度日志与搜索引擎收录属于公开信息，
   但对它们的「目标」发起任何主动探测仍需授权；泛域名（*.example.com）要逐个确认
   是否归属同一组织，避免碰到同一托管上的第三方站点。
2. 强度红线：主动扫描的速率与并发要约定上限；目录爆破、子域爆破对目标可能产生
   与小型 DDoS 等效的日志量与负载。
```

隐蔽性方面（红队场景）的注意事项：

- 被动优先：能从公开渠道拿到的信息，就不要用扫描器去「撞」。
- 分散与降频：主动枚举使用低速线程（gobuster `-t 10` 以下）、错峰执行。
- 注意留痕义务：授权测试的「隐蔽」是针对攻击者视角，操作仍需在测试记录中可审计。

## 8. 常见陷阱

| 陷阱                             | 事实                                                   |
| :------------------------------- | :----------------------------------------------------- |
| 只扫主域名                       | 泄露常发生在被遗忘的测试/内部子域与备份文件            |
| 把 crt.sh 结果全当存活资产       | CT 日志含大量历史证书，需 httpx 存活验证后再纳入       |
| 信任单工具的指纹结论             | Wappalyzer/WhatWeb 均有误判，关键结论用响应头交叉验证  |
| 信息收集阶段就打全量漏扫         | 高强度扫描过早暴露测试行为，也违反最小影响原则         |
| 忽视人员面信息                   | 钓鱼与密码喷洒的成功率高度依赖 OSINT 人员情报          |

## 小结

- **初学者要点**：信息收集分被动（不接触目标：DNS 记录、证书透明度、搜索引擎、
  空间测绘）与主动（接触目标：端口扫描、目录爆破、指纹识别）两类，先被动后主动；
  工具链主线 subfinder → httpx → nuclei 覆盖八成自动化需求。
- **进阶注意**：范围与强度是法律红线，泛域名资产要确认归属；CT 日志历史证书要过滤；
  侦察结果要沉淀为可重跑的攻击面监控；渗透全流程的方法论衔接见
  022-PenetrationTestingMethodology。
