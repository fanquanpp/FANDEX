---
order: 500
title: 防火墙配置（ufw/firewalld）
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity 防火墙配置(ufw/firewalld) 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

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
