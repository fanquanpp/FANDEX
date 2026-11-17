---
order: 130
title: SSH 密钥管理
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: 'SSH 密钥实战：ed25519 密钥生成、authorized_keys 管理与权限加固、ssh-agent 转发、SSH 证书与跳板机'
author: fanquanpp
updated: '2026-11-17'
related:
  - 'cybersecurity/520-SecurityBaseline'
  - 'cybersecurity/050-AsymmetricEncryption'
  - 'cybersecurity/470-FirewallConfig'
  - 'cybersecurity/100-OpenSSLCert'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

- **解决什么问题**：SSH 密钥是服务器管理的第一道门——比口令登录更抗爆破、更易审计、可按人按机轮换。本篇覆盖从生成、部署、agent 到 SSH 证书（CA 签发）的完整链路，重点是「理解每一步到底在验证什么」，命令只是这条链的落点。
- **容易怎么错**：默认思维还停在 RSA（现代首选 ed25519——密钥短、确定性签名、常数时间）；把私钥复制到服务器；known_hosts 变更当噪声忽略（可能是中间人信号）；agent forwarding 常开（等于把信任权交给链路上每一台中间机器）。
- **学完能做什么**：生成、部署、轮换 ed25519 密钥；解释 OpenSSH 10.0 起默认密钥交换改为后量子混合 `mlkem768x25519-sha256`（防「先截获后解密」的量子风险，10.1 起客户端还会对不支持 PQ 的服务器告警）；多机场景用 SSH 证书替代逐台放公钥。

## ssh-keygen 密钥生成

**基本写法：生成 RSA 密钥**
`ssh-keygen -t rsa -b <位数>`
```bash
# 生成 4096 位 RSA 密钥
ssh-keygen -t rsa -b 4096
```

**基本写法：生成 Ed25519 密钥**
`ssh-keygen -t ed25519`
```bash
# 生成 Ed25519 密钥（推荐）
ssh-keygen -t ed25519 -C "user@example.com"
```

**基本写法：生成 ECDSA 密钥**
`ssh-keygen -t ecdsa -b <位数>`
```bash
# 生成 521 位 ECDSA 密钥
ssh-keygen -t ecdsa -b 521
```

**基本写法：指定密钥文件名**
`ssh-keygen -f <文件名>`
```bash
# 指定密钥文件路径
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key
```

**基本写法：生成无密码密钥**
`ssh-keygen -t rsa -N ""`
```bash
# 生成无密码的密钥（用于自动化）
ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/auto_key
```

**基本写法：添加注释**
`ssh-keygen -t ed25519 -C "<注释>"`
```bash
# 添加注释标识密钥用途
ssh-keygen -t ed25519 -C "production-deploy-2026"
```

---

## 密钥管理

**基本写法：查看密钥指纹**
`ssh-keygen -l -f <公钥>`
```bash
# 查看公钥指纹
ssh-keygen -l -f ~/.ssh/id_rsa.pub
```

**基本写法：查看密钥指纹（SHA256）**
`ssh-keygen -l -E sha256 -f <公钥>`
```bash
# 查看 SHA256 格式指纹
ssh-keygen -l -E sha256 -f ~/.ssh/id_rsa.pub
```

**基本写法：查看密钥图形指纹**
`ssh-keygen -l -v -f <公钥>`
```bash
# 查看随机图形指纹
ssh-keygen -l -v -f ~/.ssh/id_rsa.pub
```

**基本写法：修改密钥密码**
`ssh-keygen -p -f <私钥>`
```bash
# 修改私钥的密码
ssh-keygen -p -f ~/.ssh/id_rsa
```

**基本写法：移除密钥密码**
`ssh-keygen -p -N "" -f <私钥>`
```bash
# 移除私钥密码
ssh-keygen -p -N "" -f ~/.ssh/id_rsa
```

---

## 密钥转换与导出

**基本写法：从私钥提取公钥**
`ssh-keygen -y -f <私钥>`
```bash
# 从私钥提取公钥
ssh-keygen -y -f ~/.ssh/id_rsa > ~/.ssh/id_rsa.pub
```

**基本写法：转换密钥格式**
`ssh-keygen -p -m PEM -f <私钥>`
```bash
# 将密钥转换为 PEM 格式
ssh-keygen -p -m PEM -f ~/.ssh/id_rsa
```

**基本写法：生成 RFC4716 格式公钥**
`ssh-keygen -e -m RFC4716 -f <公钥>`
```bash
# 转换为 RFC4716 格式
ssh-keygen -e -m RFC4716 -f ~/.ssh/id_rsa.pub
```

**基本写法：从 RFC4716 转换回 OpenSSH**
`ssh-keygen -i -m RFC4716 -f <文件>`
```bash
# 从 RFC4716 格式导入
ssh-keygen -i -m RFC4716 -f public.key
```

---

## ssh-copy-id 部署公钥

**基本写法：复制公钥到远程**
`ssh-copy-id <用户>@<主机>`
```bash
# 部署公钥到远程主机
ssh-copy-id user@192.168.1.1
```

**基本写法：指定公钥文件**
`ssh-copy-id -i <公钥> <用户>@<主机>`
```bash
# 指定公钥文件部署
ssh-copy-id -i ~/.ssh/my_key.pub user@192.168.1.1
```

**基本写法：指定端口**
`ssh-copy-id -p <端口> <用户>@<主机>`
```bash
# 指定 SSH 端口
ssh-copy-id -p 2222 user@192.168.1.1
```

**基本写法：指定 SSH 选项**
`ssh-copy-id -o "<选项>" <用户>@<主机>`
```bash
# 传递 SSH 选项
ssh-copy-id -o "StrictHostKeyChecking=no" user@192.168.1.1
```

---

## known_hosts 管理

**基本写法：查看 known_hosts**
`cat ~/.ssh/known_hosts`
```bash
# 查看 known_hosts 文件内容
cat ~/.ssh/known_hosts
```

**基本写法：删除主机记录**
`ssh-keygen -R <主机>`
```bash
# 删除指定主机的记录
ssh-keygen -R 192.168.1.1
```

**基本写法：查看主机指纹**
`ssh-keygen -F <主机>`
```bash
# 查看 known_hosts 中主机的指纹
ssh-keygen -F 192.168.1.1
```

**基本写法：哈希 known_hosts**
`ssh-keygen -H`
```bash
# 哈希 known_hosts 文件中的主机名
ssh-keygen -H -f ~/.ssh/known_hosts
```

**基本写法：验证主机密钥**
`ssh-keygen -F <主机> -l`
```bash
# 查看主机密钥指纹
ssh-keygen -F github.com -l
```

---

## ssh-agent 代理

**基本写法：启动 ssh-agent**
`eval $(ssh-agent)`
```bash
# 启动 ssh-agent
eval $(ssh-agent)
```

**基本写法：添加密钥到 agent**
`ssh-add <私钥>`
```bash
# 添加私钥到 agent
ssh-add ~/.ssh/id_rsa
```

**基本写法：添加所有默认密钥**
`ssh-add`
```bash
# 添加默认密钥
ssh-add
```

**基本写法：列出已添加的密钥**
`ssh-add -l`
```bash
# 列出 agent 中的密钥指纹
ssh-add -l
```

**基本写法：列出密钥公钥**
`ssh-add -L`
```bash
# 列出 agent 中的密钥公钥
ssh-add -L
```

**基本写法：删除指定密钥**
`ssh-add -d <私钥>`
```bash
# 从 agent 中删除密钥
ssh-add -d ~/.ssh/id_rsa
```

**基本写法：删除所有密钥**
`ssh-add -D`
```bash
# 清空 agent 中所有密钥
ssh-add -D
```

**基本写法：锁定 agent**
`ssh-add -x`
```bash
# 用密码锁定 agent
ssh-add -x
```

**基本写法：解锁 agent**
`ssh-add -X`
```bash
# 解锁 agent
ssh-add -X
```

---

## SSH 配置文件

**基本写法：配置主机别名**
```sshconfig
# SSH 配置文件 ~/.ssh/config
Host prod
    HostName 192.168.1.100
    User deploy
    Port 22
    IdentityFile ~/.ssh/prod_key
```

**基本写法：通配符配置**
```sshconfig
# 配置所有 *.example.com 主机
Host *.example.com
    User admin
    IdentityFile ~/.ssh/work_key
```

**基本写法：安全配置**
```sshconfig
# 全局安全配置
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    StrictHostKeyChecking yes
```

---

## 证书认证

**基本写法：生成 CA 密钥**
`ssh-keygen -t ed25519 -f <CA密钥>`
```bash
# 生成 SSH CA 密钥
ssh-keygen -t ed25519 -f ~/.ssh/ca_key
```

**基本写法：签名用户公钥**
`ssh-keygen -s <CA密钥> -I <标识> -n <用户> <用户公钥>`
```bash
# 用 CA 签名用户公钥
ssh-keygen -s ~/.ssh/ca_key -I user_alice -n alice ~/.ssh/alice.pub
```

**基本写法：签名主机密钥**
`ssh-keygen -s <CA密钥> -I <标识> -h -n <主机名> <主机公钥>`
```bash
# 用 CA 签名主机密钥
ssh-keygen -s ~/.ssh/ca_key -I host_server1 -h -n server1.example.com /etc/ssh/ssh_host_ed25519_key.pub
```

**基本写法：信任 CA**
`# /etc/ssh/sshd_config`
```bash
# 配置服务器信任 CA
echo "TrustedUserCAKeys /etc/ssh/ca_key.pub" >> /etc/ssh/sshd_config
systemctl restart sshd
```

---

## 安全最佳实践

**基本写法：禁用密码登录**
`# /etc/ssh/sshd_config`
```bash
# 禁用密码认证只允许密钥
sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

**基本写法：禁止 root 登录**
`# /etc/ssh/sshd_config`
```bash
# 禁止 root 直接登录
sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd
```

**基本写法：限制登录尝试**
`# /etc/ssh/sshd_config`
```bash
# 限制最大认证尝试次数
echo "MaxAuthTries 3" >> /etc/ssh/sshd_config
systemctl restart sshd
```

**基本写法：限制用户组**
`# /etc/ssh/sshd_config`
```bash
# 只允许特定组登录
echo "AllowGroups ssh-users" >> /etc/ssh/sshd_config
systemctl restart sshd
```

**基本写法：设置登录宽限时间**
`# /etc/ssh/sshd_config`
```bash
# 设置登录宽限时间 30 秒
echo "LoginGraceTime 30" >> /etc/ssh/sshd_config
systemctl restart sshd
```

## 自检

- 遮住「ssh-keygen 密钥生成」一节，写出「生成 ed25519 密钥（带注释） → 部署公钥到服务器 → 用指定私钥登录」三步命令再对照。
- `ssh-copy-id` 实际做了什么？手动做的话改哪个文件、两端权限要求是什么？（把公钥追加到远端 `~/.ssh/authorized_keys`；`~/.ssh` 目录 700、文件 600，权限过宽会被 sshd 拒用。）
- known_hosts 报主机密钥变更时，安全处置流程是什么？（先经带外渠道确认真是对方重装/换主机——核对指纹——再 `ssh-keygen -R` 删单条记录；绝不无脑清空整份文件。）
- 为什么 ed25519 成为默认推荐？RSA-4096 在什么场景仍有价值？（兼容极老设备/旧系统；ed25519 短、快、常数时间。）
- 说出 OpenSSH 10.0 默认密钥交换算法的名字与它组合的两部分（ML-KEM-768 + X25519），并回答它防的威胁模型（Harvest Now, Decrypt Later）。
