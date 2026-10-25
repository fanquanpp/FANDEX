---
order: 490
title: hashcat 密码破解
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: '口令破解全景：在线服务爆破（Hydra）与离线哈希破解（hashcat/John the Ripper）的分工、哈希模式识别（-m）、字典/掩码/规则攻击、GPU 调优与授权边界'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cybersecurity/070-PasswordHash'
  - 'cybersecurity/140-HashTools'
  - 'cybersecurity/060-HashAlgorithm'
  - 'cybersecurity/315-JWTSecurityPractice'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 知识点地图

- **知识类别**：口令破解（credential cracking）——在线服务爆破与离线哈希破解两大工具族（Hydra / hashcat / John the Ripper）的操作手册。
- **解决什么问题**：「爆破」其实是两类完全不同的工作：**在线爆破**对着活的服务一个个试密码（受速率限制、留日志、动静大），工具是 Hydra；**离线破解**对着拿到的哈希数据库高速穷举（GPU 上每秒数十亿次），工具是 hashcat 与 John。混用概念会导致误判——比如对着在线接口跑 rockyou 全典，除了被封 IP 什么也得不到。本篇先立全景再讲操作。
- **什么时候用到**：
  - 授权渗透测试的弱口令验证环节（先小字典、后规则扩展）；
  - 应急响应/取证：从固件、内存、SAM 导出的哈希做口令恢复（见 [IoT 与工控安全](/cybersecurity/580-IoTOTSecurity) 固件分析、[应急响应](/cybersecurity/560-IncidentResponse)）；
  - 防御视角：给自家密码体系做「可破解性体检」，验证 [密码哈希](/cybersecurity/070-PasswordHash) 的算法与参数是否足够慢。
- **授权边界**：本文全部命令只用于书面授权的测试目标、CTF 靶场与自己导出的哈希；对未授权系统在线爆破在多数司法辖区构成犯罪（法规框架见 [IoT 与工控安全](/cybersecurity/580-IoTOTSecurity) 第 5 节）。

## 在线爆破与离线破解全景

| 维度 | 在线爆破（Hydra） | 离线破解（hashcat/John） |
| --- | --- | --- |
| 对象 | 活的服务登录口（SSH/FTP/HTTP 表单...） | 拿到手的哈希（数据库拖库、SAM 导出、固件提取） |
| 速度 | 每秒几十到几千次（受网络与限速） | GPU 每秒数十亿次（MD5 类） |
| 制约 | 账号锁定、验证码、日志告警、封 IP | 只受算力与算法慢度（bcrypt/Argon2 专门设计拖慢它） |
| 动静 | 极大——IDS/日志直接可见 | 零网络痕迹——哈希在本地算 |
| 典型场景 | 弱口令抽检（小字典 + 少量账号） | 泄露数据评估、密码策略体检 |

记忆：**在线爆破是「敲门」，离线破解是「配钥匙」**——敲门受门卫管，配钥匙只受锁的复杂度管。这也是 [密码哈希](/cybersecurity/070-PasswordHash) 强调 bcrypt/Argon2 慢哈希的原因：让「配钥匙」慢到不现实。

## Hydra 在线服务爆破

```bash
# SSH 爆破（-t 4 线程、-W 3 秒等待：刻意放慢避免触发限速）
hydra -l root -P /usr/share/wordlists/rockyou.txt \
  ssh://192.168.1.1 -t 4 -W 3

# FTP 爆破
hydra -l admin -P passwords.txt ftp://192.168.1.1

# HTTP POST 表单爆破（路径:参数模板:失败特征）
hydra -l admin -P passwords.txt 192.168.1.1 http-post-form \
  "/login:username=^USER^&password=^PASS^:Login failed"

# MySQL 爆破
hydra -l root -P passwords.txt mysql://192.168.1.1

# RDP 爆破
hydra -l administrator -P passwords.txt rdp://192.168.1.1

# 多协议批量爆破（-M 目标列表）
hydra -L users.txt -P passwords.txt -M targets.txt ssh
```

```bash
# 参数优化
-t 16              # 16 并发线程（注意目标限速，宁慢勿封）
-W 3               # 连接等待 3 秒
-s 2222            # 指定非标准端口
-f                 # 找到一个有效密码即停止
-e nsr             # n=null密码, s=same as login, r=reverse login
-o results.txt     # 输出结果到文件
```

三个实战要点：**失败特征字符串**（http-post-form 的第三段）选错会把成功判成失败——先手工发一个错误密码看响应原文；**用户名列表 `-L` 与密码列表 `-P` 组合会做笛卡尔积**，数量爆炸前先算清楚；企业环境在线爆破几乎必然触发账号锁定，工程做法是「每个账号只试 3-5 个最常见密码」的喷洒（password spray），而不是全字典轰炸。

## hashcat 基本用法

**基本写法：字典攻击**
`hashcat -m <模式> <哈希文件> <字典>`
```bash
# 使用字典破解 MD5 哈希
hashcat -m 0 hashes.txt rockyou.txt
```

**基本写法：指定哈希模式**
`hashcat -m <模式> <哈希> <字典>`
```bash
# 破解 SHA-256 哈希
hashcat -m 1400 sha256hashes.txt rockyou.txt
```

**基本写法：显示破解结果**
`hashcat -m <模式> <哈希文件> <字典> --show`
```bash
# 显示已破解的哈希和明文
hashcat -m 0 hashes.txt --show
```

**基本写法：指定攻击模式**
`hashcat -a <模式> -m <哈希模式> <哈希文件> [参数]`
```bash
# 使用攻击模式 0（字典攻击）
hashcat -a 0 -m 0 hashes.txt rockyou.txt
```

---

## 哈希模式

**基本写法：常见哈希模式**
```text
`0     - MD5
100   - SHA1
1400  - SHA256
1700  - SHA512
1000  - NTLM
1800  - sha512crypt ($6$)
500   - md5crypt ($1$)
3200  - bcrypt ($2a$/$2b$)`
```
```bash
# 查看所有支持的哈希模式
hashcat --help | grep -i "hash-type"
```

**基本写法：查看所有哈希模式**
`hashcat --help`
```bash
# 列出所有支持的哈希类型
hashcat --help
```

**基本写法：破解 NTLM 哈希**
`hashcat -m 1000 <哈希文件> <字典>`
```bash
# 破解 Windows NTLM 哈希
hashcat -m 1000 ntlm_hashes.txt rockyou.txt
```

**基本写法：破解 bcrypt 哈希**
`hashcat -m 3200 <哈希文件> <字典>`
```bash
# 破解 bcrypt 哈希（速度较慢）
hashcat -m 3200 bcrypt_hashes.txt rockyou.txt
```

---

## 攻击模式

**基本写法：字典攻击（模式 0）**
`hashcat -a 0 -m <模式> <哈希文件> <字典>`
```bash
# 标准字典攻击
hashcat -a 0 -m 0 hashes.txt rockyou.txt
```

**基本写法：组合字典攻击（模式 1）**
`hashcat -a 1 -m <模式> <哈希文件> <字典1> <字典2>`
```bash
# 组合两个字典
hashcat -a 1 -m 0 hashes.txt dict1.txt dict2.txt
```

**基本写法：掩码暴力破解（模式 3）**
`hashcat -a 3 -m <模式> <哈希文件> <掩码>`
```bash
# 暴力破解 8 位数字密码
hashcat -a 3 -m 0 hashes.txt ?d?d?d?d?d?d?d?d
```

**基本写法：基于规则的攻击（模式 6）**
`hashcat -a 6 -m <模式> <哈希文件> <字典> <掩码>`
```bash
# 字典 + 掩码组合攻击
hashcat -a 6 -m 0 hashes.txt rockyou.txt ?d?d?d?d
```

**基本写法：混合攻击（模式 7）**
`hashcat -a 7 -m <模式> <哈希文件> <掩码> <字典>`
```bash
# 掩码 + 字典组合攻击
hashcat -a 7 -m 0 hashes.txt ?d?d?d?d rockyou.txt
```

---

## 掩码字符集

**基本写法：内置字符集**
```text
`?l - 小写字母 a-z
?u - 大写字母 A-Z
?d - 数字 0-9
?s - 特殊字符
?a - 所有字符
?b - 二进制
?h - 十六进制小写
?H - 十六进制大写`
```
```bash
# 查看掩码字符集说明
hashcat --help | grep "Built-in"
```

**基本写法：自定义字符集**
`hashcat -<数字> <字符集> -a 3 -m <模式> <哈希文件> <掩码>`
```bash
# 自定义字符集只包含 abc123
hashcat -1 abc123 -a 3 -m 0 hashes.txt ?1?1?1?1?1
```

**基本写法：常见密码模式**
```bash
`# 8 位数字密码
?d?d?d?d?d?d?d?d
# 6-8 位小写字母
?l?l?l?l?l?l?l?l
# 大写开头 + 小写 + 数字
?u?l?l?l?l?d?d`
```
```bash
# 8 位小写字母密码
hashcat -a 3 -m 0 hashes.txt ?l?l?l?l?l?l?l?l
```

---

## 规则文件

**基本写法：使用规则文件**
`hashcat -m <模式> <哈希文件> <字典> -r <规则文件>`
```bash
# 使用最佳 64 规则
hashcat -m 0 hashes.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule
```

**基本写法：组合多个规则**
`hashcat -m <模式> <哈希文件> <字典> -r <规则1> -r <规则2>`
```bash
# 组合多个规则文件
hashcat -m 0 hashes.txt rockyou.txt -r rules1.rule -r rules2.rule
```

**基本写法：常用规则文件**
```bash
`/usr/share/hashcat/rules/best64.rule
/usr/share/hashcat/rules/rockyou-30000.rule
/usr/share/hashcat/rules/d3ad0ne.rule
/usr/share/hashcat/rules/toggles5.rule`
```
```bash
# 使用 rockyou-30000 规则
hashcat -m 0 hashes.txt rockyou.txt -r /usr/share/hashcat/rules/rockyou-30000.rule
```

---

## 性能优化

**基本写法：指定工作负载**
`hashcat -w <级别> -m <模式> <哈希文件> <字典>`
```bash
# 设置工作负载为高（1-4）
hashcat -w 3 -m 0 hashes.txt rockyou.txt
```

**基本写法：指定设备类型**
`hashcat -D <设备> -m <模式> <哈希文件> <字典>`
```bash
# 使用 GPU 设备
hashcat -D 2 -m 0 hashes.txt rockyou.txt
```

**基本写法：显示性能测试**
`hashcat -b -m <模式>`
```bash
# 性能基准测试
hashcat -b -m 0
```

**基本写法：限制 GPU 速度**
`hashcat --gpu-temp-abort=<温度> -m <模式> <哈希文件> <字典>`
```bash
# GPU 温度超过 90 度时停止
hashcat --gpu-temp-abort=90 -m 0 hashes.txt rockyou.txt
```

**基本写法：启用优化内核**
`hashcat -O -m <模式> <哈希文件> <字典>`
```bash
# 启用优化内核提升性能
hashcat -O -m 0 hashes.txt rockyou.txt
```

---

## 会话管理

**基本写法：恢复会话**
`hashcat --session <名称> --restore`
```bash
# 恢复之前的破解会话
hashcat --session mysession --restore
```

**基本写法：指定会话名称**
`hashcat --session <名称> -m <模式> <哈希文件> <字典>`
```bash
# 启动命名会话
hashcat --session mysession -m 0 hashes.txt rockyou.txt
```

**基本写法：自动恢复**
`hashcat --restore`
```bash
# 恢复最近的会话
hashcat --restore
```

---

## 输出与结果

**基本写法：查看破解结果**
`hashcat -m <模式> <哈希文件> --show`
```bash
# 显示已破解的哈希
hashcat -m 0 hashes.txt --show
```

**基本写法：输出到文件**
`hashcat -m <模式> <哈希文件> <字典> -o <输出文件>`
```bash
# 将破解结果保存到文件
hashcat -m 0 hashes.txt rockyou.txt -o cracked.txt
```

**基本写法：输出格式化**
`hashcat -m <模式> <哈希文件> <字典> -o <输出文件> --outfile-format <格式>`
```bash
# 指定输出格式（2 = 哈希:明文）
hashcat -m 0 hashes.txt rockyou.txt -o cracked.txt --outfile-format 2
```

**基本写法：显示状态**
`hashcat -m <模式> <哈希文件> <字典> --status`
```bash
# 自动显示状态更新
hashcat -m 0 hashes.txt rockyou.txt --status
```

---

## 字典处理

**基本写法：使用多个字典**
`cat <字典1> <字典2> > <合并字典>`
```bash
# 合并多个字典文件
cat dict1.txt dict2.txt dict3.txt > combined.txt
hashcat -m 0 hashes.txt combined.txt
```

**基本写法：从字典文件读取**
`hashcat -m <模式> <哈希文件> <字典>`
```bash
# 使用 rockyou 字典
hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt
```

**基本写法：解压 rockyou 字典**
`gunzip /usr/share/wordlists/rockyou.txt.gz`
```bash
# 解压 rockyou 字典文件
gunzip /usr/share/wordlists/rockyou.txt.gz
```

---

## 实用破解组合

**基本写法：常见密码模式破解**
`hashcat -a 3 -m <模式> <哈希文件> ?d?d?d?d?d?d?d?d`
```bash
# 破解 8 位数字密码
hashcat -a 3 -m 0 hashes.txt ?d?d?d?d?d?d?d?d
```

**基本写法：字典 + 规则破解**
`hashcat -m <模式> <哈希文件> <字典> -r <规则>`
```bash
# 字典 + 规则组合攻击
hashcat -m 0 hashes.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule
```

**基本写法：渐进式破解**
```bash
`# 1. 先用常用字典
hashcat -m 0 hashes.txt rockyou.txt
# 2. 再用规则扩展
hashcat -m 0 hashes.txt rockyou.txt -r best64.rule
# 3. 最后暴力破解
hashcat -a 3 -m 0 hashes.txt ?a?a?a?a?a?a?a?a`
```
```bash
# 渐进式破解策略
hashcat -m 0 hashes.txt rockyou.txt
hashcat -m 0 hashes.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -a 3 -m 0 hashes.txt ?a?a?a?a?a?a?a?a
```

---

## John the Ripper 对照

hashcat 强在 GPU 与速度，John 强在**格式覆盖与自动识别**——面对不认识的哈希，先用 John 的 `*2john` 家族转换、自动识别，再决定交给谁跑。

**基本写法：破解哈希文件**
`john --wordlist=<字典> <哈希文件>`
```bash
# 使用 John the Ripper 破解
john --wordlist=rockyou.txt hashes.txt
```

**基本写法：显示破解结果**
`john --show <哈希文件>`
```bash
# 显示已破解的密码
john --show hashes.txt
```

**基本写法：指定哈希格式**
`john --format=<格式> --wordlist=<字典> <哈希文件>`
```bash
# 指定 MD5 格式破解
john --format=raw-md5 --wordlist=rockyou.txt hashes.txt
```

**基本写法：破解 SSH 密钥密码**
`ssh2john <密钥> > <哈希文件>; john <哈希文件>`
```bash
# 破解 SSH 私钥密码
ssh2john id_rsa > ssh_hash.txt
john ssh_hash.txt
```

**基本写法：系统口令与压缩包的格式转换全家**
`unshadow/samdump2/zip2john/rar2john`
```bash
# Linux：passwd 与 shadow 合并成 John 可读格式
unshadow /etc/passwd /etc/shadow > combined.txt
john --wordlist=/usr/share/wordlists/rockyou.txt combined.txt

# Windows：从注册表导出的 SAM 数据库转 NT 哈希
samdump2 SYSTEM SAM > hashes.txt
john --format=NT hashes.txt

# 压缩包与归档
zip2john protected.zip > zip_hash.txt
john zip_hash.txt
rar2john protected.rar > rar_hash.txt
john rar_hash.txt
```

**基本写法：模式与规则**
`john --rules / --incremental`
```bash
# 字典模式
john --wordlist=dict.txt hash.txt

# 规则模式（基于字典变体：大小写变换、数字追加、l33t 替换等自动应用）
john --wordlist=dict.txt --rules hash.txt

# 增量模式（纯暴力破解，按字符集）
john --incremental hash.txt
john --incremental=Lower hash.txt       # 仅小写
john --incremental=Digits hash.txt      # 仅数字

# 自定义规则（john.conf）
[List.Rules:Custom]
$[0-9]$[0-9]     # 追加两位数字
^[_!@#]          # 前缀特殊字符
c                 # 首字母大写

john --wordlist=dict.txt --rules=Custom hash.txt
```

hashcat 与 John 的规则语法互不相通（best64.rule 是 hashcat 语法，john.conf 是 John 语法），团队内先统一工具再共享规则库。两边共享的只有字典本身——rockyou 与自建的「业务定制字典」（公司名 + 年份 + 项目代号拼接）是弱口令验证效率最高的组合。
