---
order: 180
title: SSH 远程连接
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: SSH 远程管理：密钥登录与免密配置、端口转发与跳板、服务端安全加固要点。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'networking/260-NetcatNmap'
  - 'networking/320-VPNConfig'
  - 'networking/230-IptablesFirewall'
prerequisites: []
---

## SSH 为什么是远程管理的基石

SSH 解决的是「在不安全网络上安全地操作远程主机」这一件事，并把认证（谁有资格连）、加密
（内容不泄露）、完整性（不被篡改）、通道复用（端口转发/SFTP/SCP 全走同一连接）做在一起。
理解它的主线是**密钥认证替代密码认证**：生成一对 Ed25519 密钥，公钥放服务端
（`~/.ssh/authorized_keys`），私钥留在本地——服务器永远不保存能冒充你的材料，暴力破解
也无从下手，所以加固的第一步永远是把 `PasswordAuthentication no` 与密钥登录组合起来。

版本与算法现状（截至 2026）：OpenSSH 10.x 是当前主线；Ed25519 是默认推荐的密钥类型
（RSA 的 SHA-1 签名 `ssh-rsa` 自 8.8 起默认禁用，老对端要用 rsa-sha2 系列签名）；抗量子
混合密钥交换的默认化分两步：9.0（2022）起默认 `sntrup761x25519`，9.9（2024-09）加入
`mlkem768x25519-sha256` 支持，10.0（2025-04）起后者成为默认 KEX。新密钥直接生成
Ed25519，无需再选 RSA 位数。

主机密钥确认（TOFU）是新手最容易跳过的安全机制：首次连接记录服务端指纹，之后指纹变化
意味着中间人或服务器重装。跳过检查的正确姿势是 `-o StrictHostKeyChecking=accept-new`
（接受新指纹、拒绝变更），而不是 `-o StrictHostKeyChecking=no`（对变更也无提示，生产环境
禁用）。

服务单元名注意：RHEL/Fedora 叫 `sshd`，Debian/Ubuntu 叫 `ssh`，脚本里用
`systemctl is-active sshd 2>/dev/null || systemctl is-active ssh` 兼容两者。

## ssh 基本连接

**基本写法：连接远程主机**
`ssh <用户>@<主机>`
```bash
# 以 root 用户连接到 192.168.1.1
ssh root@192.168.1.1
```

**基本写法：指定端口连接**
`ssh -p <端口> <用户>@<主机>`
```bash
# 连接到 2222 端口
ssh -p 2222 root@192.168.1.1
```

**基本写法：指定私钥文件**
`ssh -i <私钥> <用户>@<主机>`
```bash
# 使用指定私钥连接
ssh -i ~/.ssh/id_rsa user@192.168.1.1
```

**基本写法：执行远程命令**
`ssh <用户>@<主机> <命令>`
```bash
# 在远程主机执行命令
ssh root@192.168.1.1 "df -h"
```

**基本写法：分配伪终端**
`ssh -t <用户>@<主机> <命令>`
```bash
# 远程执行需要终端的命令
ssh -t root@192.168.1.1 "top"
```

---

## ssh 配置文件

**基本写法：配置主机别名**
`~/.ssh/config 中写 Host 块`
```sshconfig
# 配置 SSH 主机别名
Host prod
    HostName 192.168.1.100
    User deploy
    Port 22
    IdentityFile ~/.ssh/prod_key
```

**基本写法：使用别名连接**
`ssh <别名>`
```bash
# 使用配置的别名连接
ssh prod
```

**基本写法：禁用严格主机密钥检查**
`ssh -o StrictHostKeyChecking=<模式> <用户>@<主机>`
```bash
# 跳过主机密钥确认
ssh -o StrictHostKeyChecking=no root@192.168.1.1
```
安全提示：`no` 对「指纹变更」也不加提示，生产环境禁用；自动化场景用
`accept-new`（接受首次指纹、拒绝变更）代替。

**基本写法：保持连接活跃**
`ssh -o ServerAliveInterval=<秒数> <用户>@<主机>`
```bash
# 每 60 秒发送心跳保持连接
ssh -o ServerAliveInterval=60 user@192.168.1.1
```

---

## ssh-agent 密钥代理

**基本写法：启动 ssh-agent**
`eval $(ssh-agent)`
```bash
# 启动 ssh-agent
eval $(ssh-agent)
```

**基本写法：添加私钥到 agent**
`ssh-add <私钥>`
```bash
# 添加私钥到 agent
ssh-add ~/.ssh/id_rsa
```

**基本写法：添加所有默认私钥**
`ssh-add`
```bash
# 添加默认私钥
ssh-add
```

**基本写法：列出已加载的密钥**
`ssh-add -l`
```bash
# 列出 agent 中的密钥指纹
ssh-add -l
```

**基本写法：删除密钥**
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

---

## ssh 端口转发

**基本写法：本地端口转发**
`ssh -L <本地端口>:<目标主机>:<目标端口> <用户>@<SSH主机>`
```bash
# 将本地 8080 转发到远程的 80
ssh -L 8080:localhost:80 user@192.168.1.1
```

**基本写法：远程端口转发**
`ssh -R <远程端口>:<目标主机>:<目标端口> <用户>@<SSH主机>`
```bash
# 将远程 8080 转发到本地 80
ssh -R 8080:localhost:80 user@192.168.1.1
```

**基本写法：动态端口转发（SOCKS 代理）**
`ssh -D <本地端口> <用户>@<SSH主机>`
```bash
# 创建 SOCKS5 代理
ssh -D 1080 user@192.168.1.1
```

**基本写法：后台端口转发**
`ssh -fNL <本地端口>:<目标>:<端口> <用户>@<主机>`
```bash
# 后台运行本地端口转发
ssh -fNL 8080:localhost:80 user@192.168.1.1
```

**基本写法：指定绑定地址**
`ssh -L <地址>:<本地端口>:<目标>:<端口> <用户>@<主机>`
```bash
# 绑定到所有地址
ssh -L 0.0.0.0:8080:localhost:80 user@192.168.1.1
```

---

## scp 远程拷贝

**基本写法：上传文件到远程**
`scp <本地文件> <用户>@<主机>:<远程路径>`
```bash
# 上传文件到远程主机
scp file.txt root@192.168.1.1:/tmp/
```

**基本写法：从远程下载文件**
`scp <用户>@<主机>:<远程文件> <本地路径>`
```bash
# 从远程主机下载文件
scp root@192.168.1.1:/var/log/syslog ./
```

**基本写法：递归拷贝目录**
`scp -r <目录> <用户>@<主机>:<路径>`
```bash
# 上传整个目录
scp -r ./project root@192.168.1.1:/opt/
```

**基本写法：指定端口**
`scp -P <端口> <文件> <用户>@<主机>:<路径>`
```bash
# 指定端口 2222
scp -P 2222 file.txt root@192.168.1.1:/tmp/
```

**基本写法：压缩传输**
`scp -C <文件> <用户>@<主机>:<路径>`
```bash
# 启用压缩传输
scp -C bigfile.tar root@192.168.1.1:/tmp/
```

**基本写法：限速传输**
`scp -l <速率> <文件> <用户>@<主机>:<路径>`
```bash
# 限制速率为 1000 Kbps
scp -l 1000 file.txt root@192.168.1.1:/tmp/
```

---

## sftp 安全文件传输

**基本写法：连接 SFTP**
`sftp <用户>@<主机>`
```bash
# 连接到 SFTP 服务器
sftp user@192.168.1.1
```

**基本写法：上传文件**
`sftp> put <本地文件> [远程路径]`
```bash
# 在 sftp 交互模式中上传
sftp> put file.txt /tmp/
```

**基本写法：下载文件**
`sftp> get <远程文件> [本地路径]`
```bash
# 在 sftp 交互模式中下载
sftp> get /var/log/syslog ./
```

**基本写法：递归上传目录**
`sftp> put -r <本地目录>`
```bash
# 递归上传整个目录
sftp> put -r ./project
```

**基本写法：递归下载目录**
`sftp> get -r <远程目录>`
```bash
# 递归下载整个目录
sftp> get -r /var/log
```

---

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

**基本写法：指定密钥文件名**
`ssh-keygen -f <文件名>`
```bash
# 指定密钥文件路径
ssh-keygen -f ~/.ssh/my_key
```

**基本写法：不设置密码**
`ssh-keygen -t rsa -N ""`
```bash
# 生成无密码的密钥
ssh-keygen -t rsa -N "" -f ~/.ssh/deploy_key
```

**基本写法：更改密钥密码**
`ssh-keygen -p -f <私钥>`
```bash
# 修改密钥的密码
ssh-keygen -p -f ~/.ssh/id_rsa
```

**基本写法：查看密钥指纹**
`ssh-keygen -l -f <公钥>`
```bash
# 查看公钥指纹
ssh-keygen -l -f ~/.ssh/id_rsa.pub
```

---

## ssh-copy-id 部署公钥

**基本写法：复制公钥到远程**
`ssh-copy-id <用户>@<主机>`
```bash
# 将公钥部署到远程主机
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
# 指定端口部署公钥
ssh-copy-id -p 2222 user@192.168.1.1
```

---

## sshd 服务管理

**基本写法：重启 SSH 服务**
`systemctl restart sshd`
```bash
# 重启 SSH 服务
systemctl restart sshd
```

**基本写法：查看 SSH 服务状态**
`systemctl status sshd`
```bash
# 查看 SSH 服务运行状态
systemctl status sshd
```

**基本写法：测试 sshd 配置**
`sshd -t`
```bash
# 测试配置文件语法
sshd -t
```

**基本写法：禁止 root 登录**
`# 修改 /etc/ssh/sshd_config`
```bash
# 编辑 sshd_config 配置
sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd
```

**基本写法：禁止密码登录**
`# 修改 /etc/ssh/sshd_config`
```bash
# 只允许密钥登录
sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

## 教学自检

按遮码自检法：遮住上文代码块，先自己写命令或推演答案，再对照。

- 密钥登录的信任链条是什么？为什么服务端不需要保存私钥？authorized_keys 里一行对应什么？
- 改完 sshd_config 直接 restart，如果配置错了会发生什么？为什么改 SSH 配置要「保持已有
  会话不断开、另开窗口验证」？（提示：sshd -t + 双窗口，否则可能把自己锁在外面）
- `-L`、`-R`、`-D` 三种转发各解决什么问题？-R 把「内网服务暴露给外网」的模型说清楚。
- `ssh -L 8080:localhost:80 user@host` 中两个 localhost 分别指哪台机器？改成
  `-L 8080:db.internal:3306` 时，db.internal 由谁的视角解析？
- scp 与 sftp 的关系？为什么现代工具链推荐 sftp/rsync？
- scp 与 ssh 的端口参数为什么一个是 `-P` 一个是 `-p`？各自的 `-p`/`-P` 保留给什么语义？
- Ed25519 相比 RSA 在安全性与密钥长度上好在哪？`ssh-rsa` 被默认禁用是因为什么算法退役？
- TOFU 的完整含义是什么？指纹变化时正确与错误的处理分别是什么？
