---
order: 510
title: 防火墙配置（ufw/firewalld）
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: '防火墙配置命令全景：ufw 与 firewalld 规则管理、iptables 高级语法、华为 USG 安全策略（区域与安全策略、NAT）、默认策略设计、日志审计与规则备份'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cybersecurity/010-SecurityBasicsDefense'
  - 'cybersecurity/390-NmapScan'
  - 'cybersecurity/480-IDSIPSCommands'
  - 'cybersecurity/520-SecurityBaseline'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 知识点地图

- **知识类别**：网络边界防御——主机与网络防火墙的规则配置。防火墙是「默认拒绝、按需放行」的执行者：没有它，一台服务器的所有端口对全网敞开。
- **解决什么问题**：同一件事在 Linux 世界有三套工具（ufw/simple、firewalld/zone、iptables/底层），企业硬件防火墙（华为 USG、Cisco ASA）又是一套区域化语法；不系统学一遍，就会出现「ufw 开了为什么端口还通」「云上安全组与本机防火墙谁在起作用」这类困惑。本篇按「易到难」排布三套 Linux 工具，再补华为防火墙策略与 NAT，最后是日志审计与备份恢复。
- **什么时候用到**：
  - 新服务器初始化：先锁默认策略，再放行业务端口；
  - 排查「端口通不通」：先查防火墙再查服务（Nmap 扫描见 [Nmap 扫描](/cybersecurity/390-NmapScan)）；
  - 企业网络：区域划分（trust/untrust/DMZ）与安全策略下发；
  - 合规检查：规则审计、日志留存（基线要求见 [安全基线](/cybersecurity/520-SecurityBaseline)）。
- **学完能做什么**：用 ufw 五分钟给一台新服务器上锁；读懂 firewalld 的 zone 模型；写出规范的 iptables 规则；在华为防火墙上配置安全策略与源 NAT。

## ufw 基础操作

**基本写法:启用 ufw 防火墙**
`ufw enable`
```bash
# 启用 ufw 防火墙(会提示会中断现有 SSH 连接)
sudo ufw enable
```

**基本写法:禁用 ufw 防火墙**
`ufw disable`
```bash
# 关闭 ufw 防火墙
sudo ufw disable
```

**基本写法:查看 ufw 状态**
`ufw status verbose`
```bash
# 查看 ufw 详细状态与规则
sudo ufw status verbose
```

**基本写法:重置 ufw 规则**
`ufw reset`
```bash
# 重置所有 ufw 规则到默认状态
sudo ufw reset
```

**基本写法:重载 ufw 规则**
`ufw reload`
```bash
# 重新加载 ufw 规则使配置生效
sudo ufw reload
```

---

## ufw 默认策略

**基本写法:设置默认拒绝入站**
`ufw default deny incoming`
```bash
# 默认拒绝所有入站流量
sudo ufw default deny incoming
```

**基本写法:设置默认允许出站**
`ufw default allow outgoing`
```bash
# 默认允许所有出站流量
sudo ufw default allow outgoing
```

**基本写法:设置默认拒绝转发**
`ufw default deny forward`
```bash
# 默认拒绝转发流量
sudo ufw default deny forward
```

**基本写法:查看默认策略**
`ufw status verbose | grep Default`
```bash
# 查看 ufw 当前默认策略
sudo ufw status verbose | grep Default
```

---

## ufw 规则管理

**基本写法:允许 SSH 服务**
`ufw allow <端口>/<协议>`
```bash
# 允许 SSH 服务
sudo ufw allow 22/tcp
```

**基本写法:允许 HTTP/HTTPS**
`ufw allow <服务名>`
```bash
# 允许 Web 服务
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**基本写法:限制特定 IP 访问**
`ufw allow from <IP> to any port <端口>`
```bash
# 仅允许特定 IP 访问 SSH
sudo ufw allow from 192.168.1.100 to any port 22
```

**基本写法:拒绝特定 IP**
`ufw deny from <IP>`
```bash
# 拒绝特定 IP 所有访问
sudo ufw deny from 203.0.113.10
```

**基本写法:限制连接速率**
`ufw limit <端口>/<协议>`
```bash
# 限制 SSH 连接速率防爆破
sudo ufw limit 22/tcp
```

**基本写法:删除规则**
`ufw delete allow <端口>/<协议>`
```bash
# 删除指定端口允许规则
sudo ufw delete allow 80/tcp
```

---

## ufw IPv6 与应用配置

**基本写法:启用 IPv6 支持**
`sed -i 's/IPV6=no/IPV6=yes/' /etc/default/ufw`
```bash
# 修改 ufw 配置启用 IPv6
sudo sed -i 's/IPV6=no/IPV6=yes/' /etc/default/ufw
```

**基本写法:使用应用配置文件**
`ufw app list`
```bash
# 列出所有可用应用配置
sudo ufw app list
```

**基本写法:启用应用配置**
`ufw allow <应用名>`
```bash
# 使用应用配置文件开放端口
sudo ufw allow "Nginx Full"
```

**基本写法:查看应用信息**
`ufw app info <应用名>`
```bash
# 查看应用配置文件详情
sudo ufw app info "Nginx Full"
```

**基本写法:创建自定义应用配置**
`cat /etc/ufw/applications.d/<应用>`
```bash
# 创建自定义应用配置文件
sudo tee /etc/ufw/applications.d/myapp << 'EOF'
[myapp]
title=My Application
description=Custom application
ports=8080/tcp
EOF
```

---

## firewalld 基础操作

**基本写法:启动 firewalld**
`systemctl start firewalld`
```bash
# 启动 firewalld 服务
sudo systemctl start firewalld
sudo systemctl enable firewalld
```

**基本写法:查看 firewalld 状态**
`firewall-cmd --state`
```bash
# 查看 firewalld 运行状态
sudo firewall-cmd --state
```

**基本写法:重载 firewalld 配置**
`firewall-cmd --reload`
```bash
# 重载防火墙配置不中断连接
sudo firewall-cmd --reload
```

**基本写法:完全重载**
`firewall-cmd --complete-reload`
```bash
# 完全重载会中断现有连接
sudo firewall-cmd --complete-reload
```

**基本写法:panic 模式**
`firewall-cmd --panic-on`
```bash
# 紧急情况阻断所有流量
sudo firewall-cmd --panic-on
```

---

## firewalld 区域管理

**基本写法:列出所有区域**
`firewall-cmd --get-zones`
```bash
# 列出所有预定义区域
sudo firewall-cmd --get-zones
```

**基本写法:查看默认区域**
`firewall-cmd --get-default-zone`
```bash
# 查看默认区域
sudo firewall-cmd --get-default-zone
```

**基本写法:设置默认区域**
`firewall-cmd --set-default-zone=<区域>`
```bash
# 设置默认区域
sudo firewall-cmd --set-default-zone=public
```

**基本写法:查看区域配置**
`firewall-cmd --zone=<区域> --list-all`
```bash
# 查看 public 区域详细配置
sudo firewall-cmd --zone=public --list-all
```

**基本写法:更改接口区域**
`firewall-cmd --zone=<区域> --change-interface=<接口>`
```bash
# 将 eth0 接口加入 trusted 区域
sudo firewall-cmd --zone=trusted --change-interface=eth0
```

---

## firewalld 服务与端口管理

**基本写法:添加服务**
`firewall-cmd --permanent --add-service=<服务>`
```bash
# 永久添加 HTTP 服务
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

**基本写法:开放端口**
`firewall-cmd --permanent --add-port=<端口>/<协议>`
```bash
# 永久开放 8080 端口
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

**基本写法:限制特定 IP 访问**
`firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<IP>" port port="<端口>" protocol="<协议>" accept'`
```bash
# 仅允许特定 IP 访问 MySQL
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.100" port port="3306" protocol="tcp" accept'
sudo firewall-cmd --reload
```

**基本写法:拒绝特定 IP**
`firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<IP>" reject'`
```bash
# 拒绝特定 IP 所有访问
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="203.0.113.10" reject'
sudo firewall-cmd --reload
```

**基本写法:端口转发**
`firewall-cmd --permanent --add-forward-port=port=<端口>:proto=<协议>:toport=<目标端口>`
```bash
# 端口转发 80 到 8080
sudo firewall-cmd --permanent --add-forward-port=port=80:proto=tcp:toport=8080
sudo firewall-cmd --reload
```

---

## iptables 高级配置

**基本写法:查看 iptables 规则**
`iptables -L -n -v --line-numbers`
```bash
# 查看所有链的规则带行号
sudo iptables -L -n -v --line-numbers
```

**基本写法:阻止 IP**
`iptables -A INPUT -s <IP> -j DROP`
```bash
# 丢弃特定 IP 所有数据包
sudo iptables -A INPUT -s 203.0.113.10 -j DROP
```

**基本写法:限速防爆破**
`iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP`
```bash
# 60 秒内超过 4 次 SSH 连接则丢弃
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
```

**基本写法:保存 iptables 规则**
`iptables-save > <文件>`
```bash
# 保存 iptables 规则到文件
sudo iptables-save > /etc/iptables/rules.v4
```

**基本写法:恢复 iptables 规则**
`iptables-restore < <文件>`
```bash
# 从文件恢复 iptables 规则
sudo iptables-restore < /etc/iptables/rules.v4
```

---

## 华为防火墙安全策略

Linux 三件套之外，企业边界普遍是硬件防火墙。以华为 USG 系列为例，它的模型与 Linux 最大的不同是**先分区、再定策略**：接口先划入安全区域（trust/untrust/DMZ），流量控制以「区域到区域」为单位，而不是逐条端口规则。

```bash
# 创建安全区域并把接口划入
[FW] firewall zone trust
[FW-zone-trust] add interface GigabitEthernet0/0/1
[FW] firewall zone untrust
[FW-zone-untrust] add interface GigabitEthernet0/0/2

# 配置安全策略：trust 内网 10.1.1.0/24 允许访问 untrust 的 Web 服务
[FW] security-policy
[FW-policy-security] rule name Allow-Web
[FW-policy-security-rule-Allow-Web] source-zone trust
[FW-policy-security-rule-Allow-Web] destination-zone untrust
[FW-policy-security-rule-Allow-Web] destination-address 10.1.1.0 24
[FW-policy-security-rule-Allow-Web] service http https
[FW-policy-security-rule-Allow-Web] action permit

# NAT 策略：内网出口做源 NAT（easy-ip 复用出接口地址）
[FW] nat-policy
[FW-policy-nat] rule name SNAT
[FW-policy-nat-rule-SNAT] source-zone trust
[FW-policy-nat-rule-SNAT] destination-zone untrust
[FW-policy-nat-rule-SNAT] action source-nat easy-ip
```

对照讲解，帮你在两套模型之间翻译：

- **zone 对比 iptables 的接口维度**：iptables 按接口（`-i eth0`）区分内外，华为按 zone——一个 zone 可含多个接口，DMZ 就是第三个 zone。安全级别（trust 85 > DMZ 50 > untrust 5）决定默认的域间流动方向；
- **security-policy 对比 iptables 规则链**：同样「从上到下先匹配先生效」，同样最后一条兜底（华为默认域间包过滤为 deny，等价于 iptables 的 `-P INPUT DROP`）；
- **`service http https` 对比 `--dport 80,443`**：服务对象是预定义的，复杂业务自定义 service object——等价于 ipset/自定义链的组织方式；
- **SNAT `easy-ip` 对比 MASQUERADE**：复用出接口公网地址做源地址转换，正是 iptables `-j MASQUERADE` 的企业版。

运维提示：策略改动都要 `commit` 才生效（对比 firewalld 的 `--permanent` + `reload`）；排障先看会话表 `display firewall session table`——连接是否被策略放行、命中了哪条规则一目了然，这是 Linux 三件套没有的内置可观测性。

---

## 防火墙日志审计

**基本写法:启用 ufw 日志**
`ufw logging on`
```bash
# 开启 ufw 日志记录
sudo ufw logging on
sudo ufw logging medium
```

**基本写法:查看 ufw 日志**
`tail -f /var/log/ufw.log`
```bash
# 实时查看 ufw 日志
sudo tail -f /var/log/ufw.log
```

**基本写法:统计被拦截的 IP**
`grep "UFW BLOCK" /var/log/ufw.log | awk '{print $NF}' | sort | uniq -c | sort -rn`
```bash
# 统计被 ufw 拦截的 IP 排行
sudo grep "UFW BLOCK" /var/log/ufw.log | grep -oE "SRC=[0-9.]+" | sort | uniq -c | sort -rn | head
```

**基本写法:firewalld 日志查看**
`journalctl -u firewalld -f`
```bash
# 查看 firewalld 服务日志
sudo journalctl -u firewalld -f
```

**基本写法:iptables 记录日志**
`iptables -A INPUT -j LOG --log-prefix "iptables-drop: " --log-level 4`
```bash
# 记录被丢弃的数据包
sudo iptables -A INPUT -j LOG --log-prefix "iptables-drop: " --log-level 4
sudo iptables -A INPUT -j DROP
```

---

## 防火墙安全自检

**基本写法:扫描开放端口**
`nmap -sT -p- <本机IP>`
```bash
# 扫描本机所有开放端口
nmap -sT -p- 127.0.0.1
```

**基本写法:从外部验证端口**
`nc -zv <IP> <端口>`
```bash
# 测试目标端口是否可达
nc -zv 192.168.1.10 22
```

**基本写法:检查 ufw 规则顺序**
`ufw status numbered`
```bash
# 查看带编号的 ufw 规则
sudo ufw status numbered
```

**基本写法:批量检查防火墙配置**
`ufw status && firewall-cmd --list-all && iptables -L -n`
```bash
# 一次性查看各类防火墙配置
sudo ufw status verbose && sudo firewall-cmd --list-all && sudo iptables -L -n
```

---

## 防火墙规则备份与恢复

**基本写法:备份 ufw 规则**
`tar -czf ufw-backup.tar.gz /etc/ufw /lib/ufw`
```bash
# 备份 ufw 配置文件
sudo tar -czf ufw-backup-$(date +%F).tar.gz /etc/ufw /lib/ufw
```

**基本写法:备份 firewalld 配置**
`tar -czf firewalld-backup.tar.gz /etc/firewalld`
```bash
# 备份 firewalld 配置
sudo tar -czf firewalld-backup-$(date +%F).tar.gz /etc/firewalld
```

**基本写法:导出 firewalld 配置**
`firewall-cmd --permanent --list-all-zones > <文件>`
```bash
# 导出所有区域配置到文件
sudo firewall-cmd --permanent --list-all-zones > firewalld-export.txt
```

**基本写法:导出 iptables 规则**
`iptables-save > <文件>; ip6tables-save > <文件>`
```bash
# 导出 IPv4 与 IPv6 规则
sudo iptables-save > iptables-v4.rules
sudo ip6tables-save > iptables-v6.rules
```
