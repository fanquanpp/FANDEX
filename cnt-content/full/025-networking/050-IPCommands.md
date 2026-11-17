---
order: 80
title: ip 命令
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: ip/ifconfig/route 常用网络命令：接口与地址管理、路由表操作、邻居表查看与持久化配置。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'networking/290-NetworkTroubleshootTools'
  - 'networking/080-PingTraceroute'
  - 'networking/060-ARPRouting'
prerequisites: []
---

## ip 命令为什么是主线

iproute2 的 `ip` 是 Linux 网络配置的现行主线：net-tools 家族（ifconfig/route/arp/netstat）
自 2001 年后基本停止维护，内核新特性（策略路由、多表、netns、网桥、隧道统一管理）只有
`ip` 支持。老教材与老脚本里的 ifconfig 语法还能在部分发行版上跑（补装 net-tools 即可），
但读任何现代文档、报错信息、容器与云环境，遇到的都是 ip 语法——学习投入应该直接落在
`ip` 上，ifconfig 只作为「看得懂旧系统」的对照保留。

与老语法的心智差异也值得记住：`ip` 命令的参数顺序是「对象 + 动作」（`ip addr`、`ip link`、
`ip route`），配置默认**不持久化**——重启即失效，永久生效靠发行版的网络管理器
（NetworkManager/nmcli、netplan、/etc/network/interfaces）。临时实验用 ip，落地要落配置。

## ip addr 地址管理

**基本写法：查看所有网络接口**
`ip addr`
```bash
# 查看所有接口和 IP 地址
ip addr
```

**基本写法：简写形式**
`ip a`
```bash
# 简写查看接口信息
ip a
```

**基本写法：查看指定接口**
`ip addr show <接口>`
```bash
# 查看 eth0 接口信息
ip addr show eth0
```

**基本写法：添加 IP 地址**
`ip addr add <IP>/<前缀> dev <接口>`
```bash
# 给 eth0 添加 IP 地址
ip addr add 192.168.1.100/24 dev eth0
```

**基本写法：删除 IP 地址**
`ip addr del <IP>/<前缀> dev <接口>`
```bash
# 删除 eth0 上的 IP 地址
ip addr del 192.168.1.100/24 dev eth0
```

---

## ip link 链路管理

**基本写法：查看链路状态**
`ip link show`
```bash
# 查看所有网络接口链路状态
ip link show
```

**基本写法：启用接口**
`ip link set <接口> up`
```bash
# 启用 eth0 接口
ip link set eth0 up
```

**基本写法：禁用接口**
`ip link set <接口> down`
```bash
# 禁用 eth0 接口
ip link set eth0 down
```

**基本写法：设置 MTU**
`ip link set <接口> mtu <大小>`
```bash
# 设置 eth0 的 MTU 为 1500
ip link set eth0 mtu 1500
```

**基本写法：修改 MAC 地址**
`ip link set <接口> address <MAC>`
```bash
# 修改 eth0 的 MAC 地址
ip link set eth0 address 00:11:22:33:44:55
```

---

## ip route 路由管理

**基本写法：查看路由表**
`ip route`
```bash
# 查看完整路由表
ip route
```

**基本写法：添加默认网关**
`ip route add default via <网关>`
```bash
# 设置默认网关
ip route add default via 192.168.1.1
```

**基本写法：添加静态路由**
`ip route add <目标网络>/<前缀> via <网关>`
```bash
# 添加到 10.0.0.0/24 的路由
ip route add 10.0.0.0/24 via 192.168.1.254
```

**基本写法：通过指定接口添加路由**
`ip route add <目标网络>/<前缀> dev <接口>`
```bash
# 通过 eth0 接口添加路由
ip route add 172.16.0.0/16 dev eth0
```

**基本写法：删除路由**
`ip route del <目标网络>/<前缀>`
```bash
# 删除指定路由
ip route del 10.0.0.0/24
```

**基本写法：查询路由决策**
`ip route get <目标IP>`
```bash
# 查看到 8.8.8.8 的路由决策（内核会选哪条路由、从哪个口出，不真的发包）
ip route get 8.8.8.8
```

---

## ip neigh 邻居表（ARP）

**基本写法：查看 ARP 表**
`ip neigh`
```bash
# 查看 ARP 邻居表
ip neigh
```

**基本写法：查看指定接口的 ARP**
`ip neigh show dev <接口>`
```bash
# 查看 eth0 接口的 ARP 表
ip neigh show dev eth0
```

**基本写法：删除 ARP 条目**
`ip neigh del <IP> dev <接口>`
```bash
# 删除指定 IP 的 ARP 条目
ip neigh del 192.168.1.100 dev eth0
```

**基本写法：刷新 ARP 缓存**
`ip neigh flush dev <接口>`
```bash
# 刷新 eth0 的 ARP 缓存
ip neigh flush dev eth0
```

---

## ip rule 策略路由

**基本写法：查看路由策略**
`ip rule`
```bash
# 查看策略路由规则
ip rule
```

**基本写法：添加策略路由规则**
`ip rule add from <源IP> table <表号>`
```bash
# 来自 192.168.1.100 的流量走表 100
ip rule add from 192.168.1.100 table 100
```

**基本写法：删除策略路由规则**
`ip rule del from <源IP> table <表号>`
```bash
# 删除策略路由规则
ip rule del from 192.168.1.100 table 100
```

---

## ip -s 统计信息

**基本写法：查看接口统计**
`ip -s link`
```bash
# 查看接口收发包统计
ip -s link
```

**基本写法：详细统计信息**
`ip -s -s link`
```bash
# 查看更详细的接口统计
ip -s -s link
```

**基本写法：查看指定接口统计**
`ip -s link show <接口>`
```bash
# 查看 eth0 的收发包统计
ip -s link show eth0
```

---

## ip monitor 监控

**基本写法：监控网络变化**
`ip monitor`
```bash
# 实时监控网络状态变化
ip monitor
```

**基本写法：监控特定类型**
`ip monitor <类型>`
```bash
# 只监控路由变化
ip monitor route
```

**基本写法：监控链路状态**
`ip monitor link`
```bash
# 监控网络接口状态变化
ip monitor link
```

---

## VLAN 与网桥

**基本写法：创建 VLAN 接口**
`ip link add link <接口> name <VLAN名> type vlan id <VLAN ID>`
```bash
# 在 eth0 上创建 VLAN 100
ip link add link eth0 name eth0.100 type vlan id 100
```

**基本写法：创建网桥**
`ip link add name <网桥名> type bridge`
```bash
# 创建 br0 网桥
ip link add name br0 type bridge
```

**基本写法：将接口加入网桥**
`ip link set <接口> master <网桥>`
```bash
# 将 eth0 加入 br0 网桥
ip link set eth0 master br0
```

**基本写法：从网桥移除接口**
`ip link set <接口> nomaster`
```bash
# 从网桥移除 eth0
ip link set eth0 nomaster
```

---

## 网络命名空间

**基本写法：创建命名空间**
`ip netns add <名称>`
```bash
# 创建名为 ns1 的网络命名空间
ip netns add ns1
```

**基本写法：列出所有命名空间**
`ip netns list`
```bash
# 列出所有网络命名空间
ip netns list
```

**基本写法：在命名空间中执行命令**
`ip netns exec <命名空间> <命令>`
```bash
# 在 ns1 中查看 IP 地址
ip netns exec ns1 ip addr
```

**基本写法：将接口移入命名空间**
`ip link set <接口> netns <命名空间>`
```bash
# 将 eth1 移入 ns1 命名空间
ip link set eth1 netns ns1
```

**基本写法：删除命名空间**
`ip netns del <名称>`
```bash
# 删除 ns1 命名空间
ip netns del ns1
```

---

## 隧道

**基本写法：创建 GRE 隧道**
`ip tunnel add <名称> mode gre remote <远端IP> local <本地IP>`
```bash
# 创建 GRE 隧道
ip tunnel add gre1 mode gre remote 10.0.0.2 local 10.0.0.1
```

**基本写法：创建 IPIP 隧道**
`ip tunnel add <名称> mode ipip remote <远端IP> local <本地IP>`
```bash
# 创建 IPIP 隧道
ip tunnel add tunl0 mode ipip remote 10.0.0.2 local 10.0.0.1
```

**基本写法：查看隧道**
`ip tunnel show`
```bash
# 查看所有隧道
ip tunnel show
```

**基本写法：删除隧道**
`ip tunnel del <名称>`
```bash
# 删除 gre1 隧道
ip tunnel del gre1
```

## ifconfig 接口配置

<!-- 来源: cnt-content/full/025-networking/010-NetworkBasicsAndProtocol.md 的 "ifconfig 接口配置" 小节 -->

**基本写法：查看所有接口**
`ifconfig`
```bash
# 查看所有网络接口
ifconfig
```

**基本写法：查看指定接口**
`ifconfig <接口>`
```bash
# 查看 eth0 接口信息
ifconfig eth0
```

**基本写法：配置 IP 地址**
`ifconfig <接口> <IP> netmask <掩码>`
```bash
# 配置 eth0 的 IP 地址
ifconfig eth0 192.168.1.100 netmask 255.255.255.0
```

**基本写法：启用接口**
`ifconfig <接口> up`
```bash
# 启用 eth0 接口
ifconfig eth0 up
```

**基本写法：禁用接口**
`ifconfig <接口> down`
```bash
# 禁用 eth0 接口
ifconfig eth0 down
```

**基本写法：设置 MTU**
`ifconfig <接口> mtu <大小>`
```bash
# 设置 MTU 为 1500
ifconfig eth0 mtu 1500
```

## ethtool 网卡工具

<!-- 来源: cnt-content/full/025-networking/010-NetworkBasicsAndProtocol.md 的 "ethtool 网卡工具" 小节 -->

**基本写法：查看网卡信息**
`ethtool <接口>`
```bash
# 查看 eth0 网卡信息
ethtool eth0
```

**基本写法：查看网卡驱动**
`ethtool -i <接口>`
```bash
# 查看网卡驱动信息
ethtool -i eth0
```

**基本写法：查看网卡统计**
`ethtool -S <接口>`
```bash
# 查看网卡统计信息
ethtool -S eth0
```

**基本写法：设置网卡速率**
`ethtool -s <接口> speed <速率> duplex <模式>`
```bash
# 设置网卡为 1000M 全双工
ethtool -s eth0 speed 1000 duplex full autoneg off
```

**基本写法：查看网卡支持的特性**
`ethtool -k <接口>`
```bash
# 查看网卡支持的卸载特性
ethtool -k eth0
```

## 网络命名规范

<!-- 来源: cnt-content/full/025-networking/010-NetworkBasicsAndProtocol.md 的 "网络命名规范" 小节 -->

**基本写法：查看接口命名规则**
`ip link show`
```bash
# 查看所有网络接口
ip link show
```

**基本写法：重命名网络接口**
`ip link set <接口> name <新名称>（先 down）`
```bash
# 重命名 eth0 为 wan0（改名前必须 down）
ip link set eth0 down
ip link set eth0 name wan0
ip link set wan0 up
```

## 教学自检

按遮码自检法：遮住上文代码块，先自己写命令或推演答案，再对照。

- `ip addr add` 加的地址重启后还在吗？要让它永久生效应该动哪些配置？
- `ip addr` 与 `ip link` 的输出差在哪一层信息？判断「接口有地址但没 UP」该看哪个？
- `ip route get 8.8.8.8` 和 `ip route show` 各回答什么问题？为什么 get 是排错利器？
  （提示：它直接回答「这个包会从哪个口、按哪条路由出去」）
- 同一网卡挂多个 IP 时，出向流量的源地址按什么规则选？
- `ip neigh` 里 REACHABLE、STALE、FAILED 各表示什么？ARP 学不到条目时先查哪个环节？
- 策略路由里 `table 100` 的路由表内容还没建，规则会生效吗？完整配置缺哪一步？
- 把接口改名前必须做什么？为什么？
