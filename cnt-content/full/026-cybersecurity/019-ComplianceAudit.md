---
order: 190
title: 合规与审计
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 合规与审计：等保2.0、GDPR、ISO27001、安全审计与合规自动化
author: fanquanpp
updated: '2026-09-08'
related:
  - 'cybersecurity/017-HashAlgorithm'
  - 'cybersecurity/018-SecureDevelopment'
  - 'cybersecurity/020-DigitalCertificate'
  - 'cybersecurity/021-HTTPSPrinciple'
prerequisites:
  - 'cybersecurity/001-SecurityBasicsDefense'
---

## 1. 合规体系

### 1.1 主要法规标准

| 标准     | 地区 | 范围     |
| -------- | ---- | -------- |
| 等保2.0  | 中国 | 信息系统 |
| GDPR     | 欧盟 | 个人数据 |
| ISO27001 | 全球 | 信息安全 |
| SOC2     | 美国 | 服务组织 |
| PCI DSS  | 全球 | 支付卡   |
| HIPAA    | 美国 | 医疗     |

### 1.2 合规管理流程

```
识别适用法规 → 差距分析 → 制定合规计划 → 实施控制 → 持续监控 → 审计评估
```

## 2. 等保2.0

### 2.1 定级流程

```
确定定级对象 → 初步确定等级 → 专家评审 → 主管部门审核 → 公安备案
```

### 2.2 三级等保要求

| 类别     | 要求                     |
| -------- | ------------------------ |
| 物理安全 | 机房门禁、监控、消防     |
| 网络安全 | 边界防护、入侵检测       |
| 主机安全 | 身份鉴别、审计、入侵防范 |
| 应用安全 | 访问控制、通信完整性     |
| 数据安全 | 数据完整性、保密性、备份 |
| 管理安全 | 制度、人员、运维         |

## 3. GDPR

### 3.1 核心原则

- 合法性、公平性、透明性
- 目的限制
- 数据最小化
- 准确性
- 存储限制
- 完整性和保密性
- 问责制

### 3.2 数据主体权利

| 权利       | 说明             |
| ---------- | ---------------- |
| 访问权     | 获取个人数据副本 |
| 更正权     | 修正不准确数据   |
| 删除权     | 被遗忘权         |
| 限制处理权 | 限制数据处理     |
| 数据可携权 | 转移数据         |
| 反对权     | 反对数据处理     |

### 3.3 违规处罚

- 一般违规：1000万欧元或全球营业额2%
- 严重违规：2000万欧元或全球营业额4%

## 4. 安全审计

### 4.1 审计类型

| 类型     | 审计者   | 频率      |
| -------- | -------- | --------- |
| 内部审计 | 内部团队 | 季度/半年 |
| 外部审计 | 第三方   | 年度      |
| 合规审计 | 监管机构 | 按要求    |

### 4.2 审计范围

- 访问控制审计
- 变更管理审计
- 日志审计
- 漏洞管理审计
- 备份恢复审计
- 人员安全审计

### 4.3 审计证据

| 类型     | 示例               |
| -------- | ------------------ |
| 文档证据 | 策略文档、流程文件 |
| 技术证据 | 配置截图、日志记录 |
| 访谈证据 | 人员访谈记录       |
| 观察证据 | 现场观察记录       |

## 5. 合规自动化

### 5.1 自动化工具

| 工具         | 用途         |
| ------------ | ------------ |
| AWS Config   | 资源合规检查 |
| Azure Policy | 策略强制执行 |
| OPA          | 策略即代码   |
| InSpec       | 合规测试     |
| Prowler      | AWS安全检查  |

### 5.2 合规即代码

```yaml
# OPA 策略：禁止公开S3桶
package aws.s3

deny[msg] {
bucket := input.resource.aws_s3_bucket[name]
bucket.acl == "public-read"
msg := sprintf("S3 bucket '%s' is publicly readable", [name])
}
```

### 5.3 持续合规

```
代码提交 → 合规检查 → 部署 → 运行时监控 → 合规报告
```

- IaC扫描：部署前检查
- CSPM：运行时检查
- 持续报告：仪表盘展示
## 系统账户加固

**基本写法:检查空密码账户**
`awk -F: '($2 == "") {print $1}' /etc/shadow`
```bash
# 查找密码为空的用户账户
sudo awk -F: '($2 == "") {print $1}' /etc/shadow
```

**基本写法:锁定空密码账户**
`passwd -l <用户>`
```bash
# 锁定空密码账户
sudo passwd -l username
```

**基本写法:设置密码最长有效期**
`chage -M <天数> <用户>`
```bash
# 设置密码 90 天必须更换
sudo chage -M 90 username
```

**基本写法:查看密码策略**
`chage -l <用户>`
```bash
# 查看用户密码策略信息
chage -l root
```

**基本写法:设置密码最短长度**
`sed -i 's/PASS_MIN_LEN.*/PASS_MIN_LEN 12/' /etc/login.defs`
```bash
# 设置密码最小长度为 12 位
sudo sed -i 's/PASS_MIN_LEN.*/PASS_MIN_LEN 12/' /etc/login.defs
```

**基本写法:检查 UID 为 0 的用户**
`awk -F: '$3 == 0 {print $1}' /etc/passwd`
```bash
# 查找 UID 为 0 的用户(应只有 root)
awk -F: '$3 == 0 {print $1}' /etc/passwd
```

---

## SSH 服务加固

**基本写法:禁止 root 远程登录**
`sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config`
```bash
# 禁止 root 通过 SSH 登录
sudo sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
```

**基本写法:禁用密码认证**
`sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config`
```bash
# 仅允许密钥认证
sudo sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
```

**基本写法:修改默认端口**
`sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config`
```bash
# 修改 SSH 端口为 2222
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
```

**基本写法:限制登录用户**
`echo "AllowUsers <用户>" >> /etc/ssh/sshd_config`
```bash
# 仅允许特定用户 SSH 登录
echo "AllowUsers admin deploy" | sudo tee -a /etc/ssh/sshd_config
```

**基本写法:重启 SSH 服务**
`systemctl restart sshd`
```bash
# 重启 SSH 服务应用配置
sudo systemctl restart sshd
```

---

## 文件权限加固

**基本写法:查找无主文件**
`find / -nouser -o -nogroup 2>/dev/null`
```bash
# 查找无属主或无属组的文件
sudo find / -nouser -o -nogroup 2>/dev/null
```

**基本写法:查找世界可写文件**
`find / -perm -0002 -type f -not -path "/proc/*" 2>/dev/null`
```bash
# 查找世界可写文件
sudo find / -perm -0002 -type f -not -path "/proc/*" 2>/dev/null
```

**基本写法:查找 SUID 文件**
`find / -perm -4000 -type f 2>/dev/null`
```bash
# 查找所有 SUID 文件
sudo find / -perm -4000 -type f 2>/dev/null
```

**基本写法:查找 SGID 文件**
`find / -perm -2000 -type f 2>/dev/null`
```bash
# 查找所有 SGID 文件
sudo find / -perm -2000 -type f 2>/dev/null
```

**基本写法:加固关键文件权限**
`chmod 644 /etc/passwd; chmod 600 /etc/shadow`
```bash
# 设置关键系统文件权限
sudo chmod 644 /etc/passwd
sudo chmod 640 /etc/shadow
sudo chmod 644 /etc/group
sudo chmod 600 /etc/gshadow
```

---

## 内核参数加固

**基本写法:启用 SYN Cookies**
`sysctl -w net.ipv4.tcp_syncookies=1`
```bash
# 启用 SYN Cookies 防 SYN Flood
sudo sysctl -w net.ipv4.tcp_syncookies=1
```

**基本写法:禁用 IP 转发**
`sysctl -w net.ipv4.ip_forward=0`
```bash
# 禁用 IP 转发(非路由器场景)
sudo sysctl -w net.ipv4.ip_forward=0
```

**基本写法:禁用源路由**
`sysctl -w net.ipv4.conf.all.accept_source_route=0`
```bash
# 禁用源路由数据包
sudo sysctl -w net.ipv4.conf.all.accept_source_route=0
sudo sysctl -w net.ipv4.conf.default.accept_source_route=0
```

**基本写法:启用反向路径过滤**
`sysctl -w net.ipv4.conf.all.rp_filter=1`
```bash
# 启用反向路径过滤防 IP 欺骗
sudo sysctl -w net.ipv4.conf.all.rp_filter=1
sudo sysctl -w net.ipv4.conf.default.rp_filter=1
```

**基本写法:永久保存配置**
`sysctl -p`
```bash
# 重新加载 sysctl 配置
sudo sysctl -p
```

---

## 服务最小化

**基本写法:列出启用服务**
`systemctl list-unit-files --state=enabled`
```bash
# 列出所有开机自启服务
systemctl list-unit-files --state=enabled
```

**基本写法:禁用不必要服务**
`systemctl disable <服务>`
```bash
# 禁用不需要的服务
sudo systemctl disable avahi-daemon
sudo systemctl disable cups
```

**基本写法:停止运行中服务**
`systemctl stop <服务>`
```bash
# 停止不必要的服务
sudo systemctl stop bluetooth
sudo systemctl stop modem-manager
```

**基本写法:查看监听端口**
`ss -tlnp`
```bash
# 查看所有监听端口与服务
sudo ss -tlnp
```

**基本写法:卸载不需要软件**
`apt-get purge <包名>`
```bash
# 卸载不需要的软件包
sudo apt-get purge rpcbind nfs-common
```

---

## 日志审计加固

**基本写法:启用审计服务**
`systemctl enable auditd`
```bash
# 启用 auditd 审计服务
sudo systemctl enable auditd
sudo systemctl start auditd
```

**基本写法:监控 passwd 文件**
`auditctl -w /etc/passwd -p wa -k passwd_change`
```bash
# 审计 passwd 文件变更
sudo auditctl -w /etc/passwd -p wa -k passwd_change
```

**基本写法:监控 sudo 使用**
`auditctl -w /var/log/sudo.log -p wa -k sudo_log`
```bash
# 审计 sudo 命令使用
sudo auditctl -w /var/log/sudo.log -p wa -k sudo_log
```

**基本写法:配置日志保留**
`sed -i 's/max_log_file.*/max_log_file = 50/' /etc/audit/auditd.conf`
```bash
# 配置审计日志保留大小
sudo sed -i 's/max_log_file.*/max_log_file = 50/' /etc/audit/auditd.conf
sudo sed -i 's/max_log_file_action.*/max_log_file_action = rotate/' /etc/audit/auditd.conf
```

**基本写法:启用远程日志**
`echo "*.* @<日志服务器>" >> /etc/rsyslog.conf`
```bash
# 配置远程日志服务器
echo "*.* @192.168.1.100" | sudo tee -a /etc/rsyslog.conf
sudo systemctl restart rsyslog
```

---

## 网络加固

**基本写法:配置防火墙默认策略**
`ufw default deny incoming`
```bash
# 默认拒绝所有入站流量
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

**基本写法:限制 SSH 连接速率**
`iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set`
```bash
# 限制 SSH 连接速率防爆破
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
```

**基本写法:禁用 ICMP 重定向**
`sysctl -w net.ipv4.conf.all.accept_redirects=0`
```bash
# 禁用 ICMP 重定向防中间人攻击
sudo sysctl -w net.ipv4.conf.all.accept_redirects=0
sudo sysctl -w net.ipv4.conf.default.accept_redirects=0
```

**基本写法:禁用 ICMP 广播**
`sysctl -w net.ipv4.icmp_echo_ignore_broadcasts=1`
```bash
# 禁用 ICMP 广播响应
sudo sysctl -w net.ipv4.icmp_echo_ignore_broadcasts=1
```

**基本写法:启用防火墙**
`ufw enable`
```bash
# 启用 ufw 防火墙
sudo ufw enable
sudo ufw allow 22/tcp
```

---

## 合规扫描工具

**基本写法:安装 Lynis**
`apt-get install lynis`
```bash
# 安装 Lynis 安全扫描工具
sudo apt-get install lynis
```

**基本写法:运行 Lynis 扫描**
`lynis audit system`
```bash
# 运行系统安全审计
sudo lynis audit system
```

**基本写法:输出扫描报告**
`lynis audit system --pentest`
```bash
# 以渗透测试视角运行扫描
sudo lynis audit system --pentest
```

**基本写法:查看扫描结果**
`cat /var/log/lynis.log | grep -E "Warning|Suggestion"`
```bash
# 查看 Lynis 扫描警告与建议
sudo cat /var/log/lynis.log | grep -E "Warning|Suggestion" | head -30
```

**基本写法:使用 OpenSCAP 扫描**
`oscap xccdf eval --profile <配置> <基准文件>`
```bash
# 使用 OpenSCAP 运行合规扫描
sudo oscap xccdf eval --profile xccdf_org.ssgproject.content_profile_pci_dss /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

---

## CIS 基准检查

**基本写法:检查密码策略**
`cat /etc/pam.d/common-password`
```bash
# 查看 PAM 密码策略配置
cat /etc/pam.d/common-password
```

**基本写法:检查登录失败锁定**
`cat /etc/pam.d/common-auth | grep pam_tally`
```bash
# 检查是否配置账户锁定策略
grep -i "pam_tally\|pam_faillock" /etc/pam.d/common-auth
```

**基本写法:配置登录失败锁定**
`echo "auth required pam_tally2.so deny=5 unlock_time=600" >> /etc/pam.d/common-auth`
```bash
# 配置 5 次失败后锁定 10 分钟
echo "auth required pam_tally2.so deny=5 unlock_time=600" | sudo tee -a /etc/pam.d/common-auth
```

**基本写法:检查会话超时**
`cat /etc/profile | grep -i TMOUT`
```bash
# 检查是否配置会话超时
grep -i "TMOUT" /etc/profile
```

**基本写法:配置会话超时**
`echo "export TMOUT=600" >> /etc/profile`
```bash
# 配置 10 分钟无操作自动登出
echo "export TMOUT=600" | sudo tee -a /etc/profile
```

---

## 补丁管理

**基本写法:检查可用更新**
`apt-get update && apt list --upgradable`
```bash
# 列出所有可升级软件包
sudo apt-get update && apt list --upgradable
```

**基本写法:安装安全更新**
`apt-get upgrade`
```bash
# 安装所有可用更新
sudo apt-get upgrade -y
```

**基本写法:仅安装安全更新**
`unattended-upgrade --dry-run -v`
```bash
# 仅检查安全更新
sudo unattended-upgrade --dry-run -v
```

**基本写法:启用自动安全更新**
`dpkg-reconfigure -plow unattended-upgrades`
```bash
# 配置自动安装安全更新
sudo dpkg-reconfigure -plow unattended-upgrades
```

**基本写法:查看已安装补丁**
`apt list --installed | grep -i security`
```bash
# 查看已安装的安全更新
sudo apt list --installed | grep -i security
```

---

## 加固自检脚本

**基本写法:综合安全检查**
`#!/bin/bash ...`
```bash
# 综合安全检查脚本
echo "=== 用户检查 ==="
awk -F: '$3 == 0 {print "UID 0 用户:", $1}' /etc/passwd
echo "=== SSH 配置 ==="
grep -E "PermitRootLogin|PasswordAuthentication|Port" /etc/ssh/sshd_config
echo "=== 监听端口 ==="
sudo ss -tlnp
echo "=== SUID 文件 ==="
sudo find / -perm -4000 -type f 2>/dev/null
```

**基本写法:检查服务状态**
`systemctl list-unit-files --state=enabled | wc -l`
```bash
# 统计启用服务数量
systemctl list-unit-files --state=enabled | wc -l
```

**基本写法:验证防火墙状态**
`ufw status`
```bash
# 验证防火墙启用状态
sudo ufw status verbose
```

**基本写法:生成加固报告**
`lynis audit system > hardening_report.txt 2>&1`
```bash
# 生成系统加固报告
sudo lynis audit system > hardening_report.txt 2>&1
echo "加固评分: $(grep "Hardening index" /var/log/lynis-report.dat | cut -d= -f2)"
```

**基本写法:对比加固前后**
`diff <(cat /etc/ssh/sshd_config) <(cat sshd_config.backup)`
```bash
# 对比配置文件变更
diff /etc/ssh/sshd_config /backup/sshd_config.backup
```
