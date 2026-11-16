---
order: 140
title: DNS 查询
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: dig 与 nslookup：DNS 记录查询、+trace 追踪解析链路、指定服务器对比排查。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'networking/100-DNSDHCP'
  - 'networking/290-NetworkTroubleshootTools'
prerequisites: []
---

## 三个查询工具怎么分工

dig（bind-utils/dnsutils 包）是 DNS 排查的事实标准：输出直接呈现 DNS 报文的四个段
（QUESTION/ANSWER/AUTHORITY/ADDITIONAL）与查询耗时、服务器、TTL，`+trace` 能把「从根到
权威」的迭代链路完整打出来——这是 nslookup 做不到的。nslookup 跨平台（Windows 自带），
适合快速看一眼与教学演示；host 是 dig 的极简封装。学习投入放 dig。

读 dig 输出的方法比背选项重要：先看 ANSWER 段的 TTL（对比不同解析器可判断缓存差异），
再看 flags 里的 aa（权威应答）与查询耗时（server 字段确认实际问了谁）。排错的固定套路：
先 `dig +short` 看结果对不对，不对再对比指定解析器（`@8.8.8.8` vs `@1.1.1.1` vs 本地），
仍不对用 `+trace` 定位链路在哪一级出问题。

注意：`ANY` 查询在现行权威服务器上普遍不再返回完整记录集——RFC 8482（2019）规定改用
HINFO 简单应答以防放大攻击，所以「查全部记录」的正确姿势是逐类查询（A/AAAA/MX/TXT/NS）。

## dig 基本查询

**基本写法：查询域名 A 记录**
`dig <域名>`
```bash
# 查询 example.com 的 A 记录
dig example.com
```

**基本写法：指定记录类型**
`dig <域名> <类型>`
```bash
# 查询 MX 记录
dig example.com MX
```

**基本写法：查询简短输出**
`dig +short <域名>`
```bash
# 只输出解析的 IP 地址
dig +short example.com
```

**基本写法：指定 DNS 服务器**
`dig @<DNS服务器> <域名>`
```bash
# 使用 8.8.8.8 作为 DNS 服务器查询
dig @8.8.8.8 example.com
```

**基本写法：查询所有记录类型**
`dig <域名> ANY`
```bash
# 查询所有类型的 DNS 记录
dig example.com ANY
```
注意：现行权威服务器按 RFC 8482 对 ANY 通常只回 HINFO 提示（防放大攻击），真要枚举记录
请逐类查询（A/AAAA/MX/TXT/NS）。

---

## dig 常用记录类型

**基本写法：查询 A 记录（IPv4）**
`dig <域名> A`
```bash
# 查询 IPv4 地址
dig example.com A
```

**基本写法：查询 AAAA 记录（IPv6）**
`dig <域名> AAAA`
```bash
# 查询 IPv6 地址
dig example.com AAAA
```

**基本写法：查询 CNAME 记录**
`dig <域名> CNAME`
```bash
# 查询别名记录
dig www.example.com CNAME
```

**基本写法：查询 NS 记录**
`dig <域名> NS`
```bash
# 查询域名服务器记录
dig example.com NS
```

**基本写法：查询 TXT 记录**
`dig <域名> TXT`
```bash
# 查询 TXT 记录
dig example.com TXT
```

**基本写法：查询 SOA 记录**
`dig <域名> SOA`
```bash
# 查询起始授权机构记录
dig example.com SOA
```

---

## dig 高级选项

**基本写法：反向查询**
`dig -x <IP>`
```bash
# 反向解析 IP 地址
dig -x 8.8.8.8
```

**基本写法：追踪解析过程**
`dig +trace <域名>`
```bash
# 显示 DNS 解析的完整路径
dig +trace example.com
```

**基本写法：显示详细统计**
`dig +stats <域名>`
```bash
# 显示查询统计信息
dig +stats example.com
```

**基本写法：指定端口号**
`dig -p <端口> <域名>`
```bash
# 指定 DNS 服务器端口
dig -p 5353 @8.8.8.8 example.com
```

**基本写法：指定 TCP 协议**
`dig +tcp <域名>`
```bash
# 使用 TCP 协议查询
dig +tcp example.com
```

**基本写法：设置超时时间**
`dig +time=<秒数> <域名>`
```bash
# 设置 5 秒超时
dig +time=5 example.com
```

---

## nslookup 查询

**基本写法：基本查询**
`nslookup <域名>`
```bash
# 查询域名 IP 地址
nslookup example.com
```

**基本写法：指定 DNS 服务器**
`nslookup <域名> <DNS服务器>`
```bash
# 使用指定 DNS 服务器查询
nslookup example.com 8.8.8.8
```

**基本写法：查询指定记录类型**
`nslookup -type=<类型> <域名>`
```bash
# 查询 MX 记录
nslookup -type=mx example.com
```

**基本写法：交互模式**
`nslookup`
```bash
# 进入交互模式
nslookup
> server 8.8.8.8
> example.com
> exit
```

**基本写法：反向解析**
`nslookup <IP>`
```bash
# 反向解析 IP 地址
nslookup 8.8.8.8
```

**基本写法：调试模式**
`nslookup -debug <域名>`
```bash
# 显示详细查询过程
nslookup -debug example.com
```

---

## host 命令

**基本写法：查询域名 IP**
`host <域名>`
```bash
# 查询域名对应的 IP
host example.com
```

**基本写法：查询指定记录类型**
`host -t <类型> <域名>`
```bash
# 查询 MX 记录
host -t MX example.com
```

**基本写法：查询所有记录**
`host -a <域名>`
```bash
# 查询所有 DNS 记录
host -a example.com
```

**基本写法：反向解析**
`host <IP>`
```bash
# 反向解析 IP 地址
host 8.8.8.8
```

**基本写法：指定 DNS 服务器**
`host <域名> <DNS服务器>`
```bash
# 指定 DNS 服务器查询
host example.com 8.8.8.8
```

**基本写法：查询域名服务器**
`host -t ns <域名>`
```bash
# 查询域名的 NS 记录
host -t ns example.com
```

---

## DNS 故障排查

**基本写法：检查域名解析**
`dig +short <域名> A`
```bash
# 快速获取域名 IP
dig +short example.com A
```

**基本写法：对比不同 DNS 解析结果**
`dig @8.8.8.8 +short example.com; dig @1.1.1.1 +short example.com`
```bash
# 对比 Google 和 Cloudflare DNS 解析结果
dig @8.8.8.8 +short example.com
dig @1.1.1.1 +short example.com
```

**基本写法：检查 DNS 缓存**
`dig +nocmd +noall +answer <域名>`
```bash
# 只显示 ANSWER 部分
dig +nocmd +noall +answer example.com
```

**基本写法：检查 TTL 值**
`dig <域名> | grep -i ttl`
```bash
# 查看记录的 TTL 值
dig example.com | grep -i ttl
```

---

## whois 域名信息

**基本写法：查询域名注册信息**
`whois <域名>`
```bash
# 查询域名 whois 信息
whois example.com
```

**基本写法：查询 IP 持有者**
`whois <IP>`
```bash
# 查询 IP 地址归属
whois 8.8.8.8
```

**基本写法：指定 whois 服务器**
`whois -h <服务器> <域名>`
```bash
# 指定 whois 服务器查询
whois -h whois.verisign-grs.com example.com
```

---

## 批量 DNS 查询

**基本写法：批量查询域名**
`for d in <域名1> <域名2>; do dig +short $d; done`
```bash
# 批量查询多个域名
for d in google.com github.com; do echo "$d: $(dig +short $d)"; done
```

**基本写法：从文件批量查询**
`while read d; do dig +short $d; done < <文件>`
```bash
# 从文件读取域名批量查询
while read d; do echo "$d: $(dig +short $d)"; done < domains.txt
```

---

## DNS 协议详解查询

**基本写法：显示完整响应**
`dig +noall +answer <域名>`
```bash
# 只显示 ANSWER 段
dig +noall +answer example.com
```

**基本写法：显示 TTL 和详细信息**
`dig +noall +comments +answer <域名>`
```bash
# 显示注释和答案
dig +noall +comments +answer example.com
```

**基本写法：查询 DNSSEC 记录**
`dig +dnssec <域名>`
```bash
# 查询 DNSSEC 相关记录
dig +dnssec example.com
```

**基本写法：查询 CDN CNAME 链**
`dig +trace +nodnssec <域名>`
```bash
# 追踪 CNAME 链
dig +trace +nodnssec www.example.com
```

## 教学自检

按遮码自检法：遮住上文代码块，先自己写命令或推演答案，再对照。

- dig 输出的 ANSWER 段与 AUTHORITY 段各回答什么？flags 里 aa 为 0 意味着这次应答来自哪里？
- `dig +trace` 与「直接问 8.8.8.8」的本质区别是什么？（自己逐级迭代 vs 让递归解析器代劳）
- 用户反馈「网站打不开」，如何用 dig 区分「本地解析器坏了」和「权威记录错了」？写三步对比。
- TTL 的作用是什么？切换解析前为什么要先降 TTL？降晚了会观察到什么现象？
- nslookup 相比 dig 的优势场景是什么？它隐藏了 DNS 报文的哪些细节？
- 现在为什么不能靠 ANY 查一个域名的全部记录？正确做法是什么？（RFC 8482）
