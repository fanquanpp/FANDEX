---
order: 380
title: 代理配置
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: Networking 代理配置 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 环境变量代理

**基本写法:设置 HTTP 代理**
`export http_proxy=http://<代理>:<端口>`
```bash
# 设置 HTTP 代理环境变量
export http_proxy=http://proxy.example.com:8080
export HTTP_PROXY=http://proxy.example.com:8080
```

**基本写法:设置 HTTPS 代理**
`export https_proxy=http://<代理>:<端口>`
```bash
# 设置 HTTPS 代理环境变量
export https_proxy=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

**基本写法:设置不代理地址**
`export no_proxy=<地址列表>`
```bash
# 设置不走代理的地址
export no_proxy=localhost,127.0.0.1,192.168.0.0/16,*.local
export NO_PROXY=localhost,127.0.0.1
```

**基本写法:带认证的代理**
`export http_proxy=http://<用户>:<密码>@<代理>:<端口>`
```bash
# 设置带用户名密码认证的代理
export http_proxy=http://user:password@proxy.example.com:8080
```

**基本写法:取消代理设置**
`unset http_proxy https_proxy`
```bash
# 取消所有代理环境变量
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY no_proxy NO_PROXY
```

---

## Squid 代理服务器

**基本写法:安装 Squid**
`yum install squid`
```bash
# 安装 Squid 代理服务器
yum install -y squid
# Debian/Ubuntu
apt install -y squid
```

**基本写法:Squid 基本配置**
`/etc/squid/squid.conf`
```bash
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

**基本写法:配置认证代理**
`/etc/squid/squid.conf`
```bash
# 配置基本认证
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic children 5
auth_param basic realm Squid Proxy
auth_param basic credentialsttl 2 hours
acl authenticated proxy_auth REQUIRED
http_access allow authenticated
http_access deny all
```

**基本写法:生成认证密码文件**
`htpasswd -c /etc/squid/passwd <用户>`
```bash
# 创建 Squid 认证密码文件
htpasswd -c /etc/squid/passwd user1
htpasswd /etc/squid/passwd user2
```

**基本写法:启动 Squid**
`systemctl start squid`
```bash
# 启动 Squid 服务
systemctl start squid
systemctl enable squid
systemctl reload squid
```

---

## Squid 访问控制

**基本写法:基于时间控制**
`acl <名称> time <时间>`
```bash
# 工作时间访问控制
acl workhours time MTWHF 09:00-18:00
acl weekend time SA
http_access allow localnet workhours
http_access deny all
```

**基本写法:基于域名控制**
`acl <名称> dstdomain <域名>`
```bash
# 域名访问控制
acl allowed_sites dstdomain .example.com .google.com
acl blocked_sites dstdomain .badsite.com
http_access deny blocked_sites
http_access allow localnet allowed_sites
```

**基本写法:基于 URL 正则**
`acl <名称> url_regex <正则>`
```bash
# 通过 URL 关键字过滤
acl blockfiles urlpath_regex -i \.mp4$ \.avi$ \.exe$
http_access deny blockfiles
```

**基本写法:基于端口控制**
`acl <名称> port <端口>`
```bash
# 限制可访问端口
acl allowed_ports port 80 443 8080
http_access deny !allowed_ports
```

**基本写法:基于源 IP 限制**
`acl <名称> src <IP>`
```bash
# 基于源 IP 限制
acl allowed_clients src 192.168.1.0/24
http_access allow allowed_clients
http_access deny all
```

---

## HAProxy 负载均衡

**基本写法:安装 HAProxy**
`yum install haproxy`
```bash
# 安装 HAProxy
yum install -y haproxy
apt install -y haproxy
```

**基本写法:HAProxy 基本配置**
`/etc/haproxy/haproxy.cfg`
```bash
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

**基本写法:基于域名的转发**
`/etc/haproxy/haproxy.cfg`
```bash
# 基于域名分发
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

**基本写法:TCP 模式负载均衡**
`/etc/haproxy/haproxy.cfg`
```bash
# TCP 模式(用于 MySQL 等)
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

**基本写法:启动 HAProxy**
`systemctl start haproxy`
```bash
# 启动 HAProxy
systemctl start haproxy
systemctl enable haproxy
systemctl reload haproxy
```

---

## HAProxy 监控与统计

**基本写法:开启统计页面**
`/etc/haproxy/haproxy.cfg`
```bash
# 开启 HAProxy 统计页面
listen stats
    bind *:8080
    mode http
    stats enable
    stats uri /stats
    stats realm HAProxy\ Statistics
    stats auth admin:password
    stats admin if TRUE
```

**基本写法:健康检查配置**
`option httpchk <方法> <路径>`
```bash
# HTTP 健康检查
backend http_back
    option httpchk GET /health
    http-check expect status 200
    server web1 192.168.1.10:80 check inter 2000 rise 2 fall 3
```

**基本写法:会话保持**
`cookie <名称>`
```bash
# 基于 cookie 的会话保持
backend http_back
    cookie SERVERID insert indirect nocache
    server web1 192.168.1.10:80 cookie server1 check
    server web2 192.168.1.11:80 cookie server2 check
```

**基本写法:访问控制列表**
`acl <名称> <条件>`
```bash
# ACL 综合应用
frontend http_front
    bind *:80
    acl is_https dst_port 80
    acl blocked_ip src 192.168.1.100
    http-request deny if blocked_ip
    default_backend http_back
```

---

## Nginx 反向代理

**基本写法:基本反向代理**
`/etc/nginx/conf.d/proxy.conf`
```bash
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

**基本写法:负载均衡代理**
`/etc/nginx/conf.d/lb.conf`
```bash
# Nginx 负载均衡
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

**基本写法:负载均衡算法**
```bash
# 不同负载均衡算法
upstream backend_round {
    # 轮询(默认)
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
}

upstream backend_ip {
    # IP 哈希(会话保持)
    ip_hash;
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
}

upstream backend_least {
    # 最少连接
    least_conn;
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
}
```

**基本写法:HTTPS 反向代理**
`/etc/nginx/conf.d/ssl-proxy.conf`
```bash
# HTTPS 反向代理到 HTTP 后端
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

**基本写法:健康检查被动模式**
```bash
# Nginx 被动健康检查
upstream backend {
    server 192.168.1.10:8080 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:8080 max_fails=3 fail_timeout=30s;
}
```

---

## Nginx 代理高级配置

**基本写法:缓存配置**
`/etc/nginx/nginx.conf`
```bash
# 代理缓存配置
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

**基本写法:WebSocket 代理**
```bash
# 支持 WebSocket 的反向代理
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

**基本写法:超时控制**
```bash
# 代理超时配置
location / {
    proxy_pass http://backend;
    proxy_connect_timeout 5s;
    proxy_send_timeout 30s;
    proxy_read_timeout 60s;
    proxy_buffering on;
    proxy_buffer_size 16k;
    proxy_buffers 8 32k;
}
```

**基本写法:重定向后端**
```bash
# 路径重写
location /api/ {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass http://backend;
}
```

**基本写法:Nginx 启动与重载**
`nginx -t && systemctl reload nginx`
```bash
# 测试配置并重载
nginx -t
systemctl reload nginx
systemctl restart nginx
```

---

## 代理客户端配置

**基本写法:curl 使用代理**
`curl -x <代理> <URL>`
```bash
# curl 指定 HTTP 代理
curl -x http://proxy.example.com:8080 http://target.com
# SOCKS5 代理
curl --socks5 127.0.0.1:1080 http://target.com
```

**基本写法:wget 使用代理**
`wget -e "http_proxy=<代理>" <URL>`
```bash
# wget 指定代理
wget -e "http_proxy=http://proxy.example.com:8080" http://target.com
```

**基本写法:SSH 通过代理**
`ssh -o ProxyCommand="nc -X 5 -x <代理> %h %p" <主机>`
```bash
# SSH 通过 SOCKS 代理连接
ssh -o ProxyCommand="nc -X 5 -x 127.0.0.1:1080 %h %p" user@target.com
```

**基本写法:apt 使用代理**
`/etc/apt/apt.conf.d/proxy`
```bash
# 配置 apt 走代理
echo 'Acquire::http::Proxy "http://proxy.example.com:8080";' > /etc/apt/apt.conf.d/proxy
echo 'Acquire::https::Proxy "http://proxy.example.com:8080";' >> /etc/apt/apt.conf.d/proxy
```

**基本写法:YUM 使用代理**
`/etc/yum.conf`
```bash
# 配置 yum 走代理
echo "proxy=http://proxy.example.com:8080" >> /etc/yum.conf
echo "proxy_username=user" >> /etc/yum.conf
echo "proxy_password=password" >> /etc/yum.conf
```

---

## 代理故障排查

**基本写法:测试代理连通性**
`curl -v -x <代理> http://<目标>`
```bash
# 详细模式测试代理
curl -v -x http://proxy.example.com:8080 http://httpbin.org/ip
```

**基本写法:检查代理端口**
`telnet <代理> <端口>`
```bash
# 测试代理端口是否开放
telnet proxy.example.com 8080
nc -zv proxy.example.com 8080
```

**基本写法:查看代理日志**
`tail -f /var/log/squid/access.log`
```bash
# 实时查看 Squid 访问日志
tail -f /var/log/squid/access.log
tail -f /var/log/haproxy.log
tail -f /var/log/nginx/access.log
```

**基本写法:抓包分析代理流量**
`tcpdump -i <接口> port <端口>`
```bash
# 抓取代理端口流量
tcpdump -i eth0 port 3128 -n
tcpdump -i eth0 port 8080 -n -A
```

**基本写法:检查代理状态**
`systemctl status squid`
```bash
# 检查代理服务状态
systemctl status squid
systemctl status haproxy
systemctl status nginx
```

---

## SOCKS 代理

**基本写法:SSH 创建 SOCKS 代理**
`ssh -D <端口> <主机>`
```bash
# 通过 SSH 创建本地 SOCKS5 代理
ssh -D 1080 user@remote.example.com
# 后台运行
ssh -fN -D 1080 user@remote.example.com
```

**基本写法:动态端口转发**
`ssh -D <本地端口> -N <主机>`
```bash
# 仅做端口转发不执行命令
ssh -D 1080 -N -C user@remote.example.com
```

**基本写法:使用 dante SOCKS 服务器**
`/etc/sockd.conf`
```bash
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

**基本写法:验证 SOCKS 代理**
`curl --socks5 <代理> http://<目标>`
```bash
# 验证 SOCKS5 代理
curl --socks5 127.0.0.1:1080 http://httpbin.org/ip
# SOCKS5 远程 DNS 解析
curl --socks5-hostname 127.0.0.1:1080 http://httpbin.org/ip
```
