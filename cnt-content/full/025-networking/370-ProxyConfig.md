---
order: 410
title: 代理配置
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: '代理学习笔记：客户端环境变量让命令行走代理、自建 Squid 正向代理、Nginx/HAProxy 反向代理与负载均衡、SSH 隧道即 SOCKS 代理，附排错路径。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'networking/130-CurlHTTPRequest'
  - 'networking/120-HTTPProtocol'
  - 'networking/320-VPNConfig'
prerequisites:
  - 'networking/120-HTTPProtocol'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [HTTP 协议](/networking/120-HTTPProtocol)

## 场景

两个高频场景，覆盖"代理"这个词的两大方向：

1. **正向代理（帮你出去）**：办公网只有出口代理能上外网，你的 `curl`、`apt`、`git` 全都连不上远端。要么配好客户端，要么自己搭一个代理服务器。
2. **反向代理（帮外面进来）**：内网有三台应用服务器，需要统一入口对外提供 HTTPS 服务并分摊流量。这是 Nginx/HAProxy 的本职。

先解决客户端（每个开发者都会遇到），再自建服务器端，最后是开发者的随身工具——SSH 隧道。

## 一、客户端：让命令行走代理

### 1.1 环境变量是通用开关

绝大多数命令行工具（curl、git、pip、npm...）都认这套约定：

```bash
# 设置 HTTP 与 HTTPS 代理（大小写都导出，覆盖最广）
export http_proxy=http://proxy.example.com:8080
export HTTP_PROXY=http://proxy.example.com:8080
export https_proxy=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# 例外清单：这些地址不走代理（内网服务、本地调试）
export no_proxy=localhost,127.0.0.1,192.168.0.0/16,*.local
export NO_PROXY=localhost,127.0.0.1

# 带认证的代理（用户名密码嵌在 URL 里）
export http_proxy=http://user:password@proxy.example.com:8080

# 全部取消（排错第一步：先排除代理变量的干扰）
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY no_proxy NO_PROXY
```

两个坑：其一，`no_proxy` 里写 CIDR（如 `192.168.0.0/16`）只有部分工具支持，工具不认时老老实实枚举地址；其二，密码出现在环境变量里会进 shell 历史与进程列表，公网代理别这么干。

### 1.2 逐工具配置

环境变量管不到的工具单独配：

```bash
# curl：命令行临时指定
curl -x http://proxy.example.com:8080 http://target.com
# SOCKS5 代理
curl --socks5 127.0.0.1:1080 http://target.com

# wget
wget -e "http_proxy=http://proxy.example.com:8080" http://target.com

# SSH 经 SOCKS 代理跳板
ssh -o ProxyCommand="nc -X 5 -x 127.0.0.1:1080 %h %p" user@target.com
```

```bash
# apt 走代理（写入独立配置文件，不污染主配置）
echo 'Acquire::http::Proxy "http://proxy.example.com:8080";' > /etc/apt/apt.conf.d/proxy
echo 'Acquire::https::Proxy "http://proxy.example.com:8080";' >> /etc/apt/apt.conf.d/proxy
```

```bash
# yum 走代理
echo "proxy=http://proxy.example.com:8080" >> /etc/yum.conf
echo "proxy_username=user" >> /etc/yum.conf
echo "proxy_password=password" >> /etc/yum.conf
```

### 1.3 验证代理真的生效了

配完必须验证，标准做法是看"出口 IP 变没变"：

```bash
# 详细模式测试代理：CONNECT 建立过程一目了然
curl -v -x http://proxy.example.com:8080 http://httpbin.org/ip

# 验证 SOCKS5（注意两个选项的区别）
curl --socks5 127.0.0.1:1080 http://httpbin.org/ip
# socks5-hostname：连 DNS 解析都在代理侧做，防 DNS 泄漏
curl --socks5-hostname 127.0.0.1:1080 http://httpbin.org/ip

# 端口通不通（telnet 老三样或 nc）
nc -zv proxy.example.com 8080
```

`httpbin.org/ip` 返回请求来源 IP：显示代理 IP 说明成功，显示本机 IP 说明代理没接管。`--socks5` 与 `--socks5-hostname` 的差别是 DNS 解析位置——要防"DNS 泄漏"就用后者，这个细节在访问内网域名时也是关键（内网域名只有代理那边能解析）。

## 二、服务端：自建正向代理（Squid）

场景：团队内网多台机器需要统一出口，还要按时间、域名做管控——这时需要一个代理服务器。Squid 是经典选择。

```bash
# 安装（RHEL 系 / Debian 系）
yum install -y squid
apt install -y squid
```

### 2.1 最小配置

```text
# /etc/squid/squid.conf 主配置
http_port 3128
cache_dir ufs /var/spool/squid 100 16 256
cache_mem 256 MB
maximum_object_size 100 MB
access_log /var/log/squid/access.log
cache_log /var/log/squid/cache.log
visible_hostname proxy.example.com

# 允许本地网段访问
acl localnet src 192.168.0.0/16
acl localnet src 10.0.0.0/8
http_access allow localnet
http_access deny all
```

Squid 配置的心智模型：**先定义 acl（条件），再用 http_access 按顺序裁决**。规则自上而下匹配，命中即停——所以 `deny all` 必须在最后，这条顺序错了要么全放行要么全拒绝。

### 2.2 访问控制：acl 的五种玩法

```text
# 按时间：只在工作时间放行
acl workhours time MTWHF 09:00-18:00
acl weekend time SA
http_access allow localnet workhours
http_access deny all

# 按目标域名
acl allowed_sites dstdomain .example.com .google.com
acl blocked_sites dstdomain .badsite.com
http_access deny blocked_sites
http_access allow localnet allowed_sites

# 按 URL 正则：拦可执行文件下载
acl blockfiles urlpath_regex -i \.mp4$ \.avi$ \.exe$
http_access deny blockfiles

# 按目标端口
acl allowed_ports port 80 443 8080
http_access deny !allowed_ports

# 按来源 IP
acl allowed_clients src 192.168.1.0/24
http_access allow allowed_clients
http_access deny all
```

### 2.3 加上认证

让代理要求用户名密码：

```bash
# 生成密码文件（-c 只在创建时用，追加用户去掉）
htpasswd -c /etc/squid/passwd user1
htpasswd /etc/squid/passwd user2
```

```text
# /etc/squid/squid.conf 追加
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic children 5
auth_param basic realm Squid Proxy
auth_param basic credentialsttl 2 hours
acl authenticated proxy_auth REQUIRED
http_access allow authenticated
http_access deny all
```

### 2.4 启动与验证

```bash
systemctl start squid
systemctl enable squid
systemctl reload squid      # 改配置后 reload 平滑生效

# 客户端按第一节的方法验证
curl -v -x http://proxy.example.com:3128 http://httpbin.org/ip

# 看谁在用代理
tail -f /var/log/squid/access.log
```

## 三、服务端：反向代理与负载均衡

方向反过来：客户端直连的是代理，代理背后才是真实服务器。Nginx 与 HAProxy 都能干，分工大致是：Nginx 顺带做静态资源/缓存/重写，HTTP 七层能力丰富；HAProxy 更专注负载均衡，健康检查与统计更强。

### 3.1 Nginx 反向代理

```text
# /etc/nginx/conf.d/proxy.conf
server {
    listen 80;
    server_name proxy.example.com;

    location / {
        proxy_pass http://192.168.1.10:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

为什么那三行 `proxy_set_header` 不能省：不加的话后端看到的请求来源永远是代理 IP，日志、限流、风控全部失真。`X-Forwarded-For` 是"转发链"的标准载体，一层层代理往后追加。

### 3.2 Nginx 负载均衡

```text
# /etc/nginx/conf.d/lb.conf
upstream backend {
    server 192.168.1.10:8080 weight=3;
    server 192.168.1.11:8080 weight=2;
    server 192.168.1.12:8080;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

三种算法怎么选：

```text
upstream backend_round {
    # 轮询(默认)：机器同构时最简单
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
}

upstream backend_ip {
    # IP 哈希(会话保持)：同一客户端固定打到同一台
    ip_hash;
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
}

upstream backend_least {
    # 最少连接：请求耗时不均时最公平
    least_conn;
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
}
```

无状态服务优先轮询/最少连接；确实有内存态会话又来不及改造时才用 ip_hash——它会破坏负载均匀性。

### 3.3 Nginx 进阶四件套

HTTPS 卸载（对外加密、对内明文，后端不用管证书）：

```text
# /etc/nginx/conf.d/ssl-proxy.conf
server {
    listen 443 ssl;
    server_name proxy.example.com;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    location / {
        proxy_pass http://192.168.1.10:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

被动健康检查（失败 N 次暂拉出轮换）：

```text
upstream backend {
    server 192.168.1.10:8080 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:8080 max_fails=3 fail_timeout=30s;
}
```

代理缓存：

```text
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

server {
    location / {
        proxy_cache my_cache;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_pass http://backend;
    }
}
```

WebSocket 代理（缺这三行的话握手必失败，是高频坑）：

```text
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

超时与路径重写：

```text
location / {
    proxy_pass http://backend;
    proxy_connect_timeout 5s;
    proxy_send_timeout 30s;
    proxy_read_timeout 60s;
    proxy_buffering on;
    proxy_buffer_size 16k;
    proxy_buffers 8 32k;
}

location /api/ {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass http://backend;
}
```

改完配置永远先验证再重载：

```bash
nginx -t                 # 语法检查
systemctl reload nginx   # 平滑重载，不断连接
systemctl restart nginx  # 整个重启（仅必要时）
tail -f /var/log/nginx/access.log
```

### 3.4 HAProxy：更专的负载均衡器

```bash
yum install -y haproxy
apt install -y haproxy
```

```text
# /etc/haproxy/haproxy.cfg
global
    log /dev/log local0
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance roundrobin
    server web1 192.168.1.10:80 check
    server web2 192.168.1.11:80 check
```

结构是 frontend（入口）→ backend（池子）。按域名分发多个站点：

```text
frontend http_front
    bind *:80
    acl is_site1 hdr(host) -i site1.example.com
    acl is_site2 hdr(host) -i site2.example.com
    use_backend site1_back if is_site1
    use_backend site2_back if is_site2
    default_backend site1_back

backend site1_back
    server web1 192.168.1.10:80 check

backend site2_back
    server web2 192.168.1.11:80 check
```

TCP 模式代理数据库（四层，不解协议）：

```text
frontend mysql_front
    bind *:3306
    mode tcp
    default_backend mysql_back

backend mysql_back
    mode tcp
    balance leastconn
    server db1 192.168.1.20:3306 check
    server db2 192.168.1.21:3306 check
```

主动健康检查与 cookie 会话保持：

```text
backend http_back
    option httpchk GET /health
    http-check expect status 200
    server web1 192.168.1.10:80 check inter 2000 rise 2 fall 3

backend sticky_back
    cookie SERVERID insert indirect nocache
    server web1 192.168.1.10:80 cookie server1 check
    server web2 192.168.1.11:80 cookie server2 check
```

`inter 2000 rise 2 fall 3` 的含义值得读一遍：每 2 秒检查一次，连续成功 2 次才标记恢复（防抖），连续失败 3 次才判死。恢复比判死更保守，避免抖动节点反复进出池子。

统计页面与访问控制：

```text
listen stats
    bind *:8080
    mode http
    stats enable
    stats uri /stats
    stats realm HAProxy\ Statistics
    stats auth admin:password
    stats admin if TRUE

frontend http_front
    bind *:80
    acl is_https dst_port 80
    acl blocked_ip src 192.168.1.100
    http-request deny if blocked_ip
    default_backend http_back
```

```bash
systemctl start haproxy
systemctl enable haproxy
systemctl reload haproxy
tail -f /var/log/haproxy.log
```

## 四、开发者的随身代理：SSH 隧道

不装任何代理软件，一台能 SSH 的服务器就是一个 SOCKS5 代理——远程办公访问内网系统的最轻方案：

```bash
# 在本机 1080 端口开 SOCKS5 代理，流量经 remote 服务器出去
ssh -D 1080 user@remote.example.com

# 后台运行 + 仅转发不执行远程命令 + 压缩
ssh -fN -D 1080 -C user@remote.example.com
```

然后按第一节的验证方法测试：

```bash
curl --socks5-hostname 127.0.0.1:1080 http://httpbin.org/ip
```

需要常驻的企业级 SOCKS 服务器则用 dante：

```text
# /etc/sockd.conf dante 服务器配置
logoutput: /var/log/sockd.log
internal: eth0 port = 1080
external: eth0
socksmethod: username
user.privileged: root
user.notprivileged: nobody

client pass {
    from: 192.168.0.0/16
    to: 0.0.0.0/0
    log: connect disconnect error
}

socks pass {
    from: 192.168.0.0/16
    to: 0.0.0.0/0
    log: connect disconnect error
}
```

## 五、排错路径

代理问题排错有个固定顺序，从近到远：

```bash
# 1. 环境变量先排除（unset 后能不能通？能通就是代理配置问题）
# 2. 代理端口通不通
nc -zv proxy.example.com 8080
telnet proxy.example.com 8080

# 3. 详细模式看握手过程（CONNECT 何时失败一目了然）
curl -v -x http://proxy.example.com:8080 http://httpbin.org/ip

# 4. 看代理侧日志（请求到底有没有到达代理）
systemctl status squid
systemctl status haproxy
systemctl status nginx
tail -f /var/log/squid/access.log

# 5. 抓包：代理端口上到底在跑什么
tcpdump -i eth0 port 3128 -n
tcpdump -i eth0 port 8080 -n -A
```

| 现象 | 多半是 |
| :--- | :--- |
| 直连通、走代理不通 | 代理规则（acl）或认证问题 |
| 内网域名解析失败 | 该域名该进 no_proxy，或用 socks5-hostname 让代理侧解析 |
| 走代理后后端日志全是代理 IP | 反向代理漏配 X-Forwarded-For / X-Real-IP |
| WebSocket 连不上 | Upgrade/Connection 头没透传 |
| 时通时断 | 健康检查参数太激进，节点抖动进出池子 |

## 自检

1. `no_proxy` 应该包含哪些地址？漏掉 `localhost` 会发生什么？
2. Nginx 反向代理不加 `X-Forwarded-For`，后端应用拿到的客户端 IP 是什么？影响哪些功能？
3. HAProxy 的 `rise 2 fall 3` 为什么两个数字不对称？

## 练习

1. 在虚拟机里装 Squid，配一条"只允许工作时间访问"的 acl，分别在配置内外的时间用 curl 验证放行与拒绝。
2. 用 Nginx 搭两节点负载均衡，在其中一台上 `systemctl stop` 后端服务，观察 `max_fails` 生效后流量全部切到另一台。
3. 用 `ssh -D` 对自己的云服务器开一条 SOCKS 隧道，配置浏览器走它，访问 `httpbin.org/ip` 确认出口 IP 变化，并对比 `--socks5` 与 `--socks5-hostname` 访问内网域名的差异。

## 下一步

- HTTP 报文与 CONNECT 隧道的协议细节：见 [HTTP 协议](/networking/120-HTTPProtocol)。
- curl 的更多调试用法：见 [curl 与 HTTP 请求](/networking/130-CurlHTTPRequest)。
- 加密隧道与远程组网：见 [VPN 配置](/networking/320-VPNConfig)。
