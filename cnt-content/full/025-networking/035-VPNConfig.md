---
order: 350
title: VPN 配置命令
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: Networking VPN 配置命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## OpenVPN 服务端配置

**基本写法:初始化 PKI 证书目录**
`./easyrsa init-pki`
```bash
# 进入 EasyRSA 目录并初始化 PKI
cd /etc/openvpn/easy-rsa
./easyrsa init-pki
```

**基本写法:构建 CA 根证书**
`./easyrsa build-ca`
```bash
# 构建证书颁发机构(输入 CA 名称和密码)
./easyrsa build-ca nopass
```

**基本写法:生成服务端证书**
`./easyrsa gen-req <名称> <参数>`
```bash
# 生成服务端证书请求和私钥
./easyrsa gen-req server nopass
```

**基本写法:签发服务端证书**
`./easyrsa sign-req server <名称>`
```bash
# 用 CA 签发服务端证书
./easyrsa sign-req server server
```

**基本写法:生成 Diffie-Hellman 参数**
`./easyrsa gen-dh`
```bash
# 生成 DH 参数文件(用于密钥交换)
./easyrsa gen-dh
```

**基本写法:生成 TLS-AUTH 密钥**
`openvpn --genkey --secret <文件>`
```bash
# 生成 tls-auth 共享密钥增强安全性
openvpn --genkey --secret /etc/openvpn/ta.key
```

---

## OpenVPN 服务配置文件

**基本写法:服务端主配置**
`port <端口>`
```bash
# /etc/openvpn/server.conf 主要参数
port 1194
proto udp
dev tun
ca ca.crt
cert server.crt
key server.key
dh dh.pem
server 10.8.0.0 255.255.255.0
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
keepalive 10 120
cipher AES-256-GCM
auth SHA256
user nobody
group nogroup
persist-key
persist-tun
status openvpn-status.log
verb 3
```

**基本写法:启动 OpenVPN 服务端**
`openvpn --config <配置文件>`
```bash
# 前台调试运行 OpenVPN
openvpn --config /etc/openvpn/server.conf
```

**基本写法:通过 systemd 启动服务**
`systemctl start openvpn@<实例>`
```bash
# 启动指定实例的 OpenVPN 服务
systemctl start openvpn@server
systemctl enable openvpn@server
```

**基本写法:启用 IP 转发**
`sysctl -w net.ipv4.ip_forward=1`
```bash
# 临时开启 IPv4 转发
sysctl -w net.ipv4.ip_forward=1

# 永久生效写入配置文件
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p
```

**基本写法:配置 NAT 转发**
`iptables -t nat -A POSTROUTING -s <网段> -o <出口网卡> -j MASQUERADE`
```bash
# 对 VPN 网段做 NAT 转发
iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
```

---

## OpenVPN 客户端配置

**基本写法:客户端配置文件**
`client`
```bash
# /etc/openvpn/client.conf 主要参数
client
dev tun
proto udp
remote your-server.example.com 1194
resolv-retry infinite
nobind
persist-key
persist-tun
ca ca.crt
cert client1.crt
key client1.key
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
verb 3
```

**基本写法:启动客户端连接**
`openvpn --config <配置文件>`
```bash
# 前台运行 OpenVPN 客户端
openvpn --config /etc/openvpn/client.conf
```

**基本写法:后台守护进程方式启动**
`openvpn --config <配置文件> --daemon`
```bash
# 以守护进程方式运行
openvpn --config /etc/openvpn/client.conf --daemon --log /var/log/openvpn.log
```

**基本写法:使用用户名密码认证**
`auth-user-pass <文件>`
```bash
# 客户端配置中使用密码文件
echo "username" > /etc/openvpn/pass.txt
echo "password" >> /etc/openvpn/pass.txt
chmod 600 /etc/openvpn/pass.txt
# 配置文件加入
# auth-user-pass /etc/openvpn/pass.txt
```

**基本写法:连接指定协议端口**
`remote <服务器> <端口> <协议>`
```bash
# 使用 TCP 协议连接 443 端口
# 在 client.conf 中配置
remote vpn.example.com 443 tcp
```

---

## OpenVPN 管理与调试

**基本写法:查看连接状态**
`cat /etc/openvpn/openvpn-status.log`
```bash
# 查看当前连接的客户端列表
cat /etc/openvpn/openvpn-status.log
```

**基本写法:开启管理接口**
`management <地址> <端口> <密码文件>`
```bash
# 在 server.conf 中启用管理接口
# management 127.0.0.1 7505
# 重启服务后连接
telnet 127.0.0.1 7505
```

**基本写法:查看路由表**
`ip route show`
```bash
# 查看是否成功注入 VPN 路由
ip route show
```

**基本写法:调试模式运行**
`openvpn --config <配置文件> --verb <级别>`
```bash
# 最高级别详细日志输出
openvpn --config /etc/openvpn/client.conf --verb 5
```

**基本写法:查看 OpenVPN 日志**
`tail -f /var/log/openvpn.log`
```bash
# 实时查看 OpenVPN 日志输出
tail -f /var/log/openvpn.log
```

---

## WireGuard 安装与初始化

**基本写法:安装 WireGuard**
`apt install wireguard`
```bash
# Debian/Ubuntu 安装 WireGuard
apt update && apt install -y wireguard wireguard-tools
```

**基本写法:生成服务端私钥**
`wg genkey > <文件>`
```bash
# 生成服务端私钥
wg genkey > /etc/wireguard/server_private.key
chmod 600 /etc/wireguard/server_private.key
```

**基本写法:生成服务端公钥**
`cat <私钥文件> | wg pubkey > <文件>`
```bash
# 由私钥派生公钥
cat /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
```

**基本写法:生成预共享密钥**
`wg genpsk > <文件>`
```bash
# 生成预共享密钥提升安全性
wg genpsk > /etc/wireguard/preshared.key
```

**基本写法:一次性生成密钥对**
`wg genkey | tee <私钥> | wg pubkey > <公钥>`
```bash
# 同时生成私钥和公钥
wg genkey | tee /etc/wireguard/client_private.key | wg pubkey > /etc/wireguard/client_public.key
```

---

## WireGuard 服务端配置

**基本写法:服务端配置文件**
`wg setconf wg0 <配置文件>`
```bash
# /etc/wireguard/wg0.conf 服务端配置
[Interface]
PrivateKey = <server_private_key>
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = <client_public_key>
PresharedKey = <preshared_key>
AllowedIPs = 10.0.0.2/32
```

**基本写法:启动 WireGuard 接口**
`wg-quick up <接口名>`
```bash
# 启动 wg0 接口
wg-quick up wg0
```

**基本写法:停止接口**
`wg-quick down <接口名>`
```bash
# 停止 wg0 接口
wg-quick down wg0
```

**基本写法:设置开机自启**
`systemctl enable wg-quick@<接口>`
```bash
# 设置 wg0 开机自启
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0
```

**基本写法:查看接口状态**
`wg show`
```bash
# 查看所有 WireGuard 接口状态
wg show
```

---

## WireGuard 客户端配置

**基本写法:客户端配置文件**
```bash
# /etc/wireguard/wg0.conf 客户端配置
[Interface]
PrivateKey = <client_private_key>
Address = 10.0.0.2/24
DNS = 8.8.8.8

[Peer]
PublicKey = <server_public_key>
PresharedKey = <preshared_key>
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

**基本写法:启动客户端**
`wg-quick up <接口>`
```bash
# 启动客户端 VPN 接口
wg-quick up wg0
```

**基本写法:AllowedIPs 全局代理**
`AllowedIPs = 0.0.0.0/0`
```bash
# 所有流量走 VPN(全局代理)
# 在 [Peer] 段配置
AllowedIPs = 0.0.0.0/0
```

**基本写法:仅代理特定网段**
`AllowedIPs = <网段>`
```bash
# 仅特定网段走 VPN(分流)
AllowedIPs = 10.0.0.0/24, 192.168.10.0/24
```

**基本写法:配置持久保活**
`PersistentKeepalive = <秒>`
```bash
# 每 25 秒发送保活包穿越 NAT
PersistentKeepalive = 25
```

---

## WireGuard 动态管理

**基本写法:动态添加 Peer**
`wg set <接口> peer <公钥> allowed-ips <网段>`
```bash
# 动态向 wg0 添加 Peer(无需重启)
wg set wg0 peer $(cat client_public.key) allowed-ips 10.0.0.3/32
```

**基本写法:动态删除 Peer**
`wg set <接口> peer <公钥> remove`
```bash
# 动态删除指定 Peer
wg set wg0 peer ABCD...KEY...XYZ= remove
```

**基本写法:查看 Peer 信息**
`wg show <接口>`
```bash
# 查看 wg0 接口详细状态
wg show wg0
```

**基本写法:查看接口握手时间**
`wg show all latest-handshakes`
```bash
# 查看所有接口的最近握手时间
wg show all latest-handshakes
```

**基本写法:保存当前配置**
`wg-quick save <接口>`
```bash
# 将当前运行时配置保存到配置文件
wg-quick save wg0
```

---

## IPsec strongSwan 配置

**基本写法:安装 strongSwan**
`apt install strongswan`
```bash
# 安装 strongSwan IPsec 套件
apt install -y strongswan strongswan-charon strongswan-starter
```

**基本写法:配置 IPsec 配置文件**
`/etc/ipsec.conf`
```bash
# /etc/ipsec.conf 主配置文件
config setup
    charondebug="ike 2, knl 2, cfg 2"
    uniqueids=no

conn %default
    keyexchange=ikev2
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    dpdaction=clear
    dpddelay=300s
    rekey=no

conn ikev2-vpn
    auto=add
    compress=no
    type=tunnel
    fragmentation=yes
    left=0.0.0.0
    leftcert=server.cert.pem
    leftsendcert=always
    leftsubnet=0.0.0.0/0
    right=%any
    rightauth=eap-mschapv2
    rightsourceip=10.10.10.0/24
    rightdns=8.8.8.8
    eap_identity=%any
```

**基本写法:配置预共享密钥**
`/etc/ipsec.secrets`
```bash
# /etc/ipsec.secrets 认证密钥文件
: RSA "server.key.pem"
user1 : EAP "password123"
user2 : EAP "anotherpass"
# PSK 预共享密钥示例
%any %any : PSK "shared_secret_key"
```

**基本写法:启动 IPsec 服务**
`systemctl start ipsec`
```bash
# 启动 strongSwan IPsec 服务
systemctl start ipsec
systemctl enable ipsec
```

**基本写法:重载 IPsec 配置**
`ipsec reload`
```bash
# 重新加载 IPsec 配置
ipsec reload
```

---

## IPsec 状态与调试

**基本写法:查看 IPsec 状态**
`ipsec status`
```bash
# 查看 IPsec 连接状态
ipsec status
```

**基本写法:查看所有连接**
`ipsec statusall`
```bash
# 查看所有 IPsec 连接详细信息
ipsec statusall
```

**基本写法:发起连接**
`ipsec up <连接名>`
```bash
# 手动发起 IPsec 连接
ipsec up ikev2-vpn
```

**基本写法:断开连接**
`ipsec down <连接名>`
```bash
# 断开指定 IPsec 连接
ipsec down ikev2-vpn
```

**基本写法:查看安全关联**
`ipsec xfrm state`
```bash
# 查看 IPsec SA 状态
ipsec xfrm state
ipsec xfrm policy
```

**基本写法:查看 charon 日志**
`journalctl -u charon`
```bash
# 实时查看 charon 守护进程日志
journalctl -u charon -f
```

---

## VPN 防火墙配置

**基本写法:开放 OpenVPN 端口**
`iptables -A INPUT -p udp --dport <端口> -j ACCEPT`
```bash
# 开放 OpenVPN 默认 UDP 1194 端口
iptables -A INPUT -p udp --dport 1194 -j ACCEPT
```

**基本写法:开放 WireGuard 端口**
`iptables -A INPUT -p udp --dport 51820 -j ACCEPT`
```bash
# 开放 WireGuard 默认 UDP 51820 端口
iptables -A INPUT -p udp --dport 51820 -j ACCEPT
```

**基本写法:开放 IPsec 端口**
`iptables -A INPUT -p udp -m multiport --dports 500,4500 -j ACCEPT`
```bash
# 开放 IPsec IKE(500)和 NAT-T(4500)端口
iptables -A INPUT -p udp -m multiport --dports 500,4500 -j ACCEPT
iptables -A INPUT -p esp -j ACCEPT
```

**基本写法:允许 VPN 网段转发**
`iptables -A FORWARD -s <网段> -j ACCEPT`
```bash
# 允许 VPN 客户端网段转发
iptables -A FORWARD -s 10.8.0.0/24 -j ACCEPT
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
```

**基本写法:firewalld 添加服务**
`firewall-cmd --permanent --add-service=openvpn`
```bash
# 使用 firewalld 开放 OpenVPN 服务
firewall-cmd --permanent --add-service=openvpn
firewall-cmd --permanent --add-masquerade
firewall-cmd --reload
```

---

## VPN 故障排查

**基本写法:检查 VPN 接口**
`ip addr show <接口>`
```bash
# 查看 tun/wg 接口是否正常
ip addr show tun0
ip addr show wg0
```

**基本写法:测试 VPN 连通性**
`ping <VPN网关>`
```bash
# 测试到 VPN 网关的连通性
ping -c 4 10.8.0.1
```

**基本写法:跟踪路由路径**
`traceroute <目标>`
```bash
# 查看到目标的路径确认是否走 VPN
traceroute 8.8.8.8
```

**基本写法:验证 DNS 解析**
`nslookup <域名> <DNS>`
```bash
# 通过 VPN 的 DNS 服务器解析域名
nslookup example.com 8.8.8.8
```

**基本写法:抓包分析 VPN 流量**
`tcpdump -i <接口> -n`
```bash
# 抓取 VPN 接口数据包
tcpdump -i tun0 -n
tcpdump -i wg0 -n udp port 51820
```
