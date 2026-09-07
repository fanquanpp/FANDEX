---
order: 370
title: IPv6 网络命令
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: Networking IPv6 网络命令 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## IPv6 地址配置

**基本写法:查看 IPv6 地址**
`ip -6 addr show`
```bash
# 查看所有接口的 IPv6 地址
ip -6 addr show
# 查看指定接口
ip -6 addr show dev eth0
```

**基本写法:添加 IPv6 地址**
`ip -6 addr add <IPv6/前缀> dev <接口>`
```bash
# 为 eth0 添加 IPv6 地址
ip -6 addr add 2001:db8::1/64 dev eth0
```

**基本写法:删除 IPv6 地址**
`ip -6 addr del <IPv6/前缀> dev <接口>`
```bash
# 删除指定 IPv6 地址
ip -6 addr del 2001:db8::1/64 dev eth0
```

**基本写法:启用 IPv6**
`sysctl -w net.ipv6.conf.all.disable_ipv6=0`
```bash
# 临时启用 IPv6
sysctl -w net.ipv6.conf.all.disable_ipv6=0
sysctl -w net.ipv6.conf.default.disable_ipv6=0
```

**基本写法:禁用 IPv6**
`sysctl -w net.ipv6.conf.all.disable_ipv6=1`
```bash
# 临时禁用 IPv6
sysctl -w net.ipv6.conf.all.disable_ipv6=1
```

---

## IPv6 路由配置

**基本写法:查看 IPv6 路由表**
`ip -6 route show`
```bash
# 查看 IPv6 路由表
ip -6 route show
```

**基本写法:添加默认路由**
`ip -6 route add default via <网关> dev <接口>`
```bash
# 添加 IPv6 默认路由
ip -6 route add default via 2001:db8::1 dev eth0
```

**基本写法:添加静态路由**
`ip -6 route add <网段> via <网关>`
```bash
# 添加到指定网段的 IPv6 路由
ip -6 route add 2001:db8:1::/64 via 2001:db8::1
```

**基本写法:删除路由**
`ip -6 route del <网段> via <网关>`
```bash
# 删除指定 IPv6 路由
ip -6 route del 2001:db8:1::/64 via 2001:db8::1
```

**基本写法:查看路由缓存**
`ip -6 route get <目标>`
```bash
# 查看到目标的实际路由
ip -6 route get 2001:db8::100
```

---

## IPv6 邻居发现

**基本写法:查看邻居表**
`ip -6 neigh show`
```bash
# 查看 IPv6 邻居发现缓存(类似 ARP)
ip -6 neigh show
```

**基本写法:添加静态邻居**
`ip -6 neigh add <IPv6> lladdr <MAC> dev <接口>`
```bash
# 添加静态邻居条目
ip -6 neigh add 2001:db8::2 lladdr 00:11:22:33:44:55 dev eth0
```

**基本写法:删除邻居条目**
`ip -6 neigh del <IPv6> dev <接口>`
```bash
# 删除指定邻居条目
ip -6 neigh del 2001:db8::2 dev eth0
```

**基本写法:刷新邻居缓存**
`ip -6 neigh flush dev <接口>`
```bash
# 刷新指定接口的邻居缓存
ip -6 neigh flush dev eth0
```

**基本写法:查看邻居代理**
`ip -6 neigh show proxy`
```bash
# 查看 IPv6 邻居代理
ip -6 neigh show proxy
```

---

## IPv6 ping 与探测

**基本写法:基本 ping6 测试**
`ping6 <目标>`
```bash
# 测试 IPv6 连通性
ping6 2001:db8::1
ping6 -c 4 2001:db8::1
```

**基本写法:指定接口 ping**
`ping6 -I <接口> <目标>`
```bash
# 通过指定接口 ping
ping6 -I eth0 fe80::1
```

**基本写法:链路本地地址 ping**
`ping6 -I <接口> fe80::<地址>`
```bash
# ping 链路本地地址必须指定接口
ping6 -I eth0 fe80::1
```

**基本写法:大包 ping 测试**
`ping6 -s <字节> <目标>`
```bash
# 发送大包测试
ping6 -s 1400 -c 4 2001:db8::1
```

**基本写法:持续 ping**
`ping6 <目标>`
```bash
# 持续 ping 直到手动停止
ping6 2001:db8::1
```

---

## IPv6 路由跟踪

**基本写法:traceroute6 跟踪**
`traceroute6 <目标>`
```bash
# IPv6 路由跟踪
traceroute6 2001:db8::1
```

**基本写法:指定跳数**
`traceroute6 -m <跳数> <目标>`
```bash
# 最多 15 跳
traceroute6 -m 15 2001:db8::1
```

**基本写法:指定探测次数**
`traceroute6 -q <次数> <目标>`
```bash
# 每跳探测 3 次
traceroute6 -q 3 2001:db8::1
```

**基本写法:tracepath6 跟踪**
`tracepath6 <目标>`
```bash
# 显示路径并探测 MTU
tracepath6 2001:db8::1
```

**基本写法:mtr6 跟踪**
`mtr -6 <目标>`
```bash
# 使用 mtr 的 IPv6 模式
mtr -6 2001:db8::1
```

---

## IPv6 网络服务

**基本写法:telnet IPv6 服务**
`telnet -6 <地址> <端口>`
```bash
# 测试 IPv6 端口连通性
telnet -6 2001:db8::1 80
```

**基本写法:curl IPv6**
`curl -6 http://[<IPv6>]:<端口>/`
```bash
# 通过 IPv6 访问 HTTP 服务
curl -6 -v http://[2001:db8::1]:8080/
```

**基本写法:ssh 通过 IPv6**
`ssh -6 <用户>@<IPv6>`
```bash
# SSH 连接到 IPv6 主机
ssh -6 user@2001:db8::1
```

**基本写法:netcat IPv6 测试**
`nc -6 <地址> <端口>`
```bash
# 使用 nc 测试 IPv6 端口
nc -6 -zv 2001:db8::1 80
```

**基本写法:wget 通过 IPv6**
`wget -6 http://[<IPv6>]/`
```bash
# 使用 wget 强制 IPv6 下载
wget -6 http://[2001:db8::1]/index.html
```

---

## IPv6 DNS 解析

**基本写法:AAAA 记录查询**
`dig AAAA <域名>`
```bash
# 查询域名 IPv6 地址
dig AAAA example.com
dig AAAA example.com +short
```

**基本写法:nslookup 查询 IPv6**
`nslookup -type=AAAA <域名>`
```bash
# 使用 nslookup 查询 IPv6
nslookup -type=AAAA example.com
```

**基本写法:host 查询 IPv6**
`host -t AAAA <域名>`
```bash
# 使用 host 命令查询
host -t AAAA example.com
```

**基本写法:反向 DNS 解析**
`dig -x <IPv6>`
```bash
# IPv6 反向解析
dig -x 2001:db8::1
```

**基本写法:指定 DNS 服务器查询**
`dig @<DNS服务器> AAAA <域名>`
```bash
# 通过指定 DNS 服务器查询 IPv6
dig @8.8.8.8 AAAA example.com
```

---

## IPv6 隧道配置

**基本写法:6to4 隧道**
`ip tunnel add <隧道> mode sit remote <IPv4> local <IPv4>`
```bash
# 创建 6to4 隧道
ip tunnel add tun6to4 mode sit remote any local 203.0.113.1
ip link set tun6to4 up
ip -6 addr add 2002:cb00:7101::1/16 dev tun6to4
ip -6 route add 2002::/16 dev tun6to4
```

**基本写法:GRE IPv6 隧道**
`ip tunnel add <名称> mode ip6gre remote <IPv6> local <IPv6>`
```bash
# 创建 IPv6 GRE 隧道
ip tunnel add gre6 mode ip6gre remote 2001:db8::2 local 2001:db8::1
ip link set gre6 up
```

**基本写法:删除隧道**
`ip tunnel del <隧道名>`
```bash
# 删除隧道接口
ip tunnel del tun6to4
```

**基本写法:查看隧道**
`ip tunnel show`
```bash
# 查看所有隧道
ip tunnel show
```

**基本写法:6in4 隧道配置**
```bash
# Hurricane Electric 隧道 broker 配置示例
ip tunnel add he-ipv6 mode sit remote 216.66.84.42 local 203.0.113.1
ip link set he-ipv6 up
ip addr add 2001:470:xxxx::2/64 dev he-ipv6
ip -6 route add default dev he-ipv6
```

---

## IPv6 多播与组管理

**基本写法:查看多播组**
`ip -6 maddr show`
```bash
# 查看 IPv6 多播组
ip -6 maddr show
```

**基本写法:查看接口多播**
`ip -6 maddr show dev <接口>`
```bash
# 查看指定接口多播组
ip -6 maddr show dev eth0
```

**基本写法:加入多播组**
`ip -6 maddr add <多播地址> dev <接口>`
```bash
# 加入指定多播组
ip -6 maddr add ff02::1 dev eth0
```

**基本写法:查看 MLD**
`netstat -g -6`
```bash
# 查看 MLD(组播侦听者发现)
netstat -gn
```

**基本写法:多播路由**
`ip -6 mroute show`
```bash
# 查看 IPv6 多播路由
ip -6 mroute show
```

---

## IPv6 防火墙

**基本写法:ip6tables 基本规则**
`ip6tables -A INPUT -p tcp --dport <端口> -j ACCEPT`
```bash
# 允许 IPv6 SSH
ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT
# 允许 ICMPv6(必需)
ip6tables -A INPUT -p icmpv6 -j ACCEPT
```

**基本写法:允许 ICMPv6**
`ip6tables -A INPUT -p icmpv6 -j ACCEPT`
```bash
# ICMPv6 对 IPv6 必需(邻居发现等)
ip6tables -A INPUT -p icmpv6 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 -j ACCEPT
```

**基本写法:设置默认策略**
`ip6tables -P INPUT DROP`
```bash
# 设置默认策略
ip6tables -P INPUT DROP
ip6tables -P FORWARD DROP
ip6tables -P OUTPUT ACCEPT
```

**基本写法:查看规则**
`ip6tables -L -n -v`
```bash
# 查看 IPv6 防火墙规则
ip6tables -L -n -v
ip6tables -L -n --line-numbers
```

**基本写法:保存规则**
`ip6tables-save > /etc/iptables/rules.v6`
```bash
# 保存 IPv6 防火墙规则
ip6tables-save > /etc/iptables/rules.v6
ip6tables-restore < /etc/iptables/rules.v6
```

---

## IPv6 故障排查

**基本写法:验证 IPv6 启用**
`cat /proc/sys/net/ipv6/conf/all/disable_ipv6`
```bash
# 检查 IPv6 是否启用
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# 0 表示启用,1 表示禁用
```

**基本写法:测试 IPv6 连通性**
`ping6 -c 3 2001:4860:4860::8888`
```bash
# 测试到 Google IPv6 DNS 的连通性
ping6 -c 3 2001:4860:4860::8888
```

**基本写法:查看 IPv6 监听端口**
`ss -6 -tlnp`
```bash
# 查看服务是否监听 IPv6
ss -6 -tlnp
netstat -6 -tlnp
```

**基本写法:抓包分析 IPv6**
`tcpdump -i <接口> ip6 -n`
```bash
# 抓取 IPv6 数据包
tcpdump -i eth0 ip6 -n
tcpdump -i eth0 icmp6 -n
```

**基本写法:检查 IPv6 路由**
`ip -6 route show`
```bash
# 检查 IPv6 路由配置是否正确
ip -6 route show
ip -6 rule show
```
