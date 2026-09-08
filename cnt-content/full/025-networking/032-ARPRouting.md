---
order: 320
title: ARP 与路由
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: Networking ARP 与路由 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## arp 命令

**基本写法：查看 ARP 缓存**
`arp -a`
```bash
# 查看所有 ARP 缓存条目
arp -a
```

**基本写法：查看指定主机 ARP**
`arp <主机>`
```bash
# 查看指定 IP 的 ARP 条目
arp 192.168.1.1
```

**基本写法：数字格式查看**
`arp -an`
```bash
# 不解析主机名查看 ARP
arp -an
```

**基本写法：添加静态 ARP**
`arp -s <IP> <MAC>`
```bash
# 添加静态 ARP 绑定
arp -s 192.168.1.1 00:11:22:33:44:55
```

**基本写法：删除 ARP 条目**
`arp -d <IP>`
```bash
# 删除指定 IP 的 ARP 条目
arp -d 192.168.1.1
```

**基本写法：指定接口操作**
`arp -i <接口> -a`
```bash
# 查看 eth0 接口的 ARP
arp -i eth0 -a
```

---

## ip neigh 邻居管理

**基本写法：查看邻居表**
`ip neigh`
```bash
# 查看 ARP 邻居表
ip neigh
```

**基本写法：简写形式**
`ip n`
```bash
# 简写查看邻居表
ip n
```

**基本写法：查看指定接口邻居**
`ip neigh show dev <接口>`
```bash
# 查看 eth0 接口的邻居
ip neigh show dev eth0
```

**基本写法：添加邻居条目**
`ip neigh add <IP> lladdr <MAC> dev <接口>`
```bash
# 添加邻居条目
ip neigh add 192.168.1.100 lladdr 00:11:22:33:44:55 dev eth0
```

**基本写法：删除邻居条目**
`ip neigh del <IP> dev <接口>`
```bash
# 删除邻居条目
ip neigh del 192.168.1.100 dev eth0
```

**基本写法：刷新邻居缓存**
`ip neigh flush dev <接口>`
```bash
# 刷新 eth0 接口的邻居缓存
ip neigh flush dev eth0
```

---

## route 路由管理

**基本写法：查看路由表**
`route -n`
```bash
# 数字格式查看路由表
route -n
```

**基本写法：添加默认网关**
`route add default gw <网关>`
```bash
# 添加默认网关
route add default gw 192.168.1.1
```

**基本写法：删除默认网关**
`route del default gw <网关>`
```bash
# 删除默认网关
route del default gw 192.168.1.1
```

**基本写法：添加主机路由**
`route add -host <IP> gw <网关>`
```bash
# 添加到指定主机的路由
route add -host 10.0.0.1 gw 192.168.1.254
```

**基本写法：添加网络路由**
`route add -net <网络>/<前缀> gw <网关>`
```bash
# 添加到指定网络的路由
route add -net 10.0.0.0/24 gw 192.168.1.254
```

**基本写法：拒绝路由**
`route add -net <网络> reject`
```bash
# 拒绝到指定网络的路由
route add -net 10.0.0.0/24 reject
```

---

## ip route 路由管理

**基本写法：查看路由表**
`ip route`
```bash
# 查看完整路由表
ip route
```

**基本写法：简写形式**
`ip r`
```bash
# 简写查看路由表
ip r
```

**基本写法：添加默认路由**
`ip route add default via <网关>`
```bash
# 添加默认路由
ip route add default via 192.168.1.1
```

**基本写法：添加静态路由**
`ip route add <网络>/<前缀> via <网关>`
```bash
# 添加到 10.0.0.0/24 的路由
ip route add 10.0.0.0/24 via 192.168.1.254
```

**基本写法：通过接口添加路由**
`ip route add <网络>/<前缀> dev <接口>`
```bash
# 通过 eth1 添加路由
ip route add 172.16.0.0/16 dev eth1
```

**基本写法：设置路由度量值**
`ip route add <网络>/<前缀> via <网关> metric <值>`
```bash
# 添加带度量值的路由
ip route add 10.0.0.0/24 via 192.168.1.254 metric 100
```

**基本写法：删除路由**
`ip route del <网络>/<前缀>`
```bash
# 删除指定路由
ip route del 10.0.0.0/24
```

**基本写法：修改路由**
`ip route change <网络>/<前缀> via <网关>`
```bash
# 修改现有路由
ip route change 10.0.0.0/24 via 192.168.1.253
```

**基本写法：替换路由**
`ip route replace <网络>/<前缀> via <网关>`
```bash
# 替换或添加路由
ip route replace 10.0.0.0/24 via 192.168.1.254
```

---

## 路由查询

**基本写法：查询到目标的路由**
`ip route get <目标IP>`
```bash
# 查询到 8.8.8.8 的路由
ip route get 8.8.8.8
```

**基本写法：从指定源查询路由**
`ip route get <目标IP> from <源IP>`
```bash
# 从指定源 IP 查询路由
ip route get 8.8.8.8 from 192.168.1.100
```

**基本写法：指定 TOS 查询路由**
`ip route get <目标IP> tos <TOS>`
```bash
# 指定 TOS 查询路由
ip route get 8.8.8.8 tos 0x10
```

---

## 策略路由

**基本写法：查看路由策略**
`ip rule`
```bash
# 查看策略路由规则
ip rule
```

**基本写法：基于源 IP 的策略路由**
`ip rule add from <源IP> table <表号>`
```bash
# 来自 192.168.1.100 的流量走表 100
ip rule add from 192.168.1.100 table 100
```

**基本写法：基于目标 IP 的策略路由**
`ip rule add to <目标IP> table <表号>`
```bash
# 到 10.0.0.1 的流量走表 200
ip rule add to 10.0.0.1 table 200
```

**基本写法：基于端口的策略路由**
`ip rule add sport <端口> table <表号>`
```bash
# 来自 80 端口的流量走表 100
ip rule add sport 80 table 100
```

**基本写法：设置规则优先级**
`ip rule add from <IP> table <表号> priority <优先级>`
```bash
# 设置规则优先级为 100
ip rule add from 192.168.1.100 table 100 priority 100
```

**基本写法：删除策略路由规则**
`ip rule del from <源IP> table <表号>`
```bash
# 删除策略路由规则
ip rule del from 192.168.1.100 table 100
```

---

## 路由表管理

**基本写法：查看指定路由表**
`ip route show table <表号>`
```bash
# 查看表 100 的路由
ip route show table 100
```

**基本写法：添加路由到指定表**
`ip route add <网络>/<前缀> via <网关> table <表号>`
```bash
# 添加路由到表 100
ip route add default via 192.168.1.1 table 100
```

**基本写法：清空路由表**
`ip route flush table <表号>`
```bash
# 清空表 100 的所有路由
ip route flush table 100
```

---

## 多路径路由

**基本写法：添加多路径路由**
`ip route add <网络>/<前缀> nexthop via <网关1> nexthop via <网关2>`
```bash
# 添加多路径负载均衡路由
ip route add 10.0.0.0/24 nexthop via 192.168.1.1 weight 1 nexthop via 192.168.1.2 weight 1
```

**基本写法：指定多路径接口**
`ip route add <网络>/<前缀> nexthop dev <接口1> nexthop dev <接口2>`
```bash
# 通过多个接口负载均衡
ip route add default nexthop dev eth0 nexthop dev eth1
```

---

## 路由持久化

**基本写法：Ubuntu 持久化路由**
`# /etc/netplan/01-routes.yaml`
```yaml
# Netplan 持久化路由配置
network:
  version: 2
  ethernets:
    eth0:
      routes:
        - to: 10.0.0.0/24
          via: 192.168.1.254
        - to: 172.16.0.0/16
          via: 192.168.1.253
```

**基本写法：CentOS 持久化路由**
`# /etc/sysconfig/network-scripts/route-<接口>`
```bash
# 持久化路由配置
echo "10.0.0.0/24 via 192.168.1.254 dev eth0" > /etc/sysconfig/network-scripts/route-eth0
```

**基本写法：RHEL 8+ 持久化路由**
`nmcli connection modify <连接> +ipv4.routes "<网络>/<前缀> <网关>"`
```bash
# 通过 nmcli 添加持久路由
nmcli connection modify eth0 +ipv4.routes "10.0.0.0/24 192.168.1.254"
nmcli connection up eth0
```

---

## ARP 排查

**基本写法：检查 ARP 冲突**
`arping -D <IP>`
```bash
# 检测 IP 地址冲突
arping -D 192.168.1.100
```

**基本写法：清除 ARP 缓存**
`ip neigh flush all`
```bash
# 清除所有 ARP 缓存
ip neigh flush all
```

**基本写法：查看 ARP 请求**
`tcpdump -i eth0 arp`
```bash
# 抓取 ARP 协议流量
tcpdump -i eth0 arp
```

**基本写法：统计 ARP 表**
`ip neigh | wc -l`
```bash
# 统计 ARP 表条目数
ip neigh | wc -l
```
