---
order: 120
title: GPG 加密与签名
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: 'GPG 实战命令：密钥生成与导出、文件加解密、数字签名与验签、公钥交换与信任模型'
author: fanquanpp
updated: '2026-11-17'
related:
  - 'cybersecurity/050-AsymmetricEncryption'
  - 'cybersecurity/110-OpenSSLEncrypt'
  - 'cybersecurity/080-DigitalCertificate'
  - 'cybersecurity/100-OpenSSLCert'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

- **解决什么问题**：GPG 解决「双方没有预共享密钥时如何安全交换数据」——公钥加密 + 私钥解密 + 签名防抵赖，是邮件加密、软件发布制品签名（发行方用 GPG 签名，用户核对指纹导入）与安全托管的常用工具。
- **容易怎么错**：只加密不签名（收方无法确认「这是谁发的」）；信任级别乱设（把别人的公钥标成 ultimate——它只能给「自己的密钥」）；上传公钥到密钥服务器后无法撤回（吊销证书要在上传前生成并备份）；混淆 GPG 1.x/2.x 的代理与格式行为差异。
- **学完能做什么**：生成一对现代 ECC 密钥、与他人交换公钥并完成「签名 + 加密」的文件往来；理解 PGP 信任网络与指纹核对的完整流程。

## GPG 密钥生成

**基本写法：生成 GPG 密钥对**
`gpg --generate-key`
```bash
# 交互式生成 GPG 密钥对
gpg --generate-key
```

**基本写法：完全交互式生成**
`gpg --full-generate-key`
```bash
# 完整选项生成密钥
gpg --full-generate-key
```

**基本写法：快速生成密钥**
`gpg --quick-generate-key <用户ID>`
```bash
# 快速生成密钥
gpg --quick-generate-key "user@example.com"
```

**基本写法：指定算法生成**
`gpg --full-generate-key --expert`
```bash
# 专家模式选择算法
gpg --full-generate-key --expert
```

---

## 密钥管理

**基本写法：列出公钥**
`gpg --list-keys`
```bash
# 列出所有公钥
gpg --list-keys
```

**基本写法：列出私钥**
`gpg --list-secret-keys`
```bash
# 列出所有私钥
gpg --list-secret-keys
```

**基本写法：列出密钥指纹**
`gpg --fingerprint <用户ID>`
```bash
# 查看密钥指纹
gpg --fingerprint user@example.com
```

**基本写法：导出公钥**
`gpg --export -a <用户ID> > <文件>`
```bash
# 导出 ASCII 格式公钥
gpg --export -a user@example.com > public.key
```

**基本写法：导出私钥**
`gpg --export-secret-keys -a <用户ID> > <文件>`
```bash
# 导出 ASCII 格式私钥
gpg --export-secret-keys -a user@example.com > private.key
```

**基本写法：导入密钥**
`gpg --import <文件>`
```bash
# 导入 GPG 密钥
gpg --import public.key
```

**基本写法：删除公钥**
`gpg --delete-keys <用户ID>`
```bash
# 删除公钥
gpg --delete-keys user@example.com
```

**基本写法：删除私钥**
`gpg --delete-secret-keys <用户ID>`
```bash
# 删除私钥
gpg --delete-secret-keys user@example.com
```

---

## 文件加密

**基本写法：对称加密文件**
`gpg -c <文件>`
```bash
# 使用密码对称加密文件
gpg -c secret.txt
```

**基本写法：使用公钥加密**
`gpg -e -r <接收者> <文件>`
```bash
# 使用接收者公钥加密
gpg -e -r user@example.com secret.txt
```

**基本写法：签名并加密**
`gpg -e -s -r <接收者> <文件>`
```bash
# 签名并加密文件
gpg -e -s -r user@example.com secret.txt
```

**基本写法：指定输出文件**
`gpg -o <输出文件> -e -r <接收者> <文件>`
```bash
# 指定输出文件名
gpg -o encrypted.gpg -e -r user@example.com secret.txt
```

**基本写法：加密为 ASCII 格式**
`gpg -a -e -r <接收者> <文件>`
```bash
# 输出 ASCII 装甲格式
gpg -a -e -r user@example.com secret.txt
```

---

## 文件解密

**基本写法：解密文件**
`gpg -d <文件>`
```bash
# 解密 GPG 文件
gpg -d secret.txt.gpg
```

**基本写法：解密到指定文件**
`gpg -o <输出文件> -d <文件>`
```bash
# 解密并保存到指定文件
gpg -o decrypted.txt -d secret.txt.gpg
```

**基本写法：解密对称加密文件**
`gpg -d <文件>`
```bash
# 解密对称加密的文件
gpg -d secret.txt.gpg > decrypted.txt
```

---

## 数字签名

**基本写法：签名文件**
`gpg -s <文件>`
```bash
# 为文件创建签名
gpg -s document.txt
```

**基本写法：分离签名**
`gpg -b <文件>`
```bash
# 创建分离的签名文件
gpg -b document.txt
```

**基本写法：清除签名**
`gpg --clearsign <文件>`
```bash
# 创建清除签名（签名嵌入文本）
gpg --clearsign document.txt
```

**基本写法：验证签名**
`gpg --verify <签名文件>`
```bash
# 验证文件签名
gpg --verify document.txt.sig
```

**基本写法：验证分离签名**
`gpg --verify <签名文件> <原文件>`
```bash
# 验证分离的签名
gpg --verify document.txt.sig document.txt
```

**基本写法：验证清除签名**
`gpg --verify <文件>`
```bash
# 验证清除签名的文件
gpg --verify document.txt.asc
```

---

## 密钥服务器

**基本写法：发送密钥到服务器**
`gpg --send-keys <密钥ID> --keyserver <服务器>`
```bash
# 上传公钥到密钥服务器
gpg --send-keys ABC12345 --keyserver keys.gnupg.net
```

**基本写法：从服务器接收密钥**
`gpg --recv-keys <密钥ID>`
```bash
# 从密钥服务器下载公钥
gpg --recv-keys ABC12345
```

**基本写法：搜索密钥**
`gpg --search-keys <关键词>`
```bash
# 在密钥服务器搜索
gpg --search-keys user@example.com
```

**基本写法：刷新密钥**
`gpg --refresh-keys`
```bash
# 从服务器刷新本地密钥
gpg --refresh-keys
```

---

## 信任管理

**基本写法：编辑密钥信任度**
`gpg --edit-key <用户ID>`
```bash
# 交互式编辑密钥信任级别
gpg --edit-key user@example.com
# 然后输入 trust 命令
```

**基本写法：签名公钥**
`gpg --sign-key <用户ID>`
```bash
# 为他人公钥签名表示信任
gpg --sign-key user@example.com
```

**基本写法：检查签名**
`gpg --check-sigs <用户ID>`
```bash
# 查看密钥的签名情况
gpg --check-sigs user@example.com
```

---

## 加密目录

**基本写法：加密整个目录**
`tar czf - <目录> | gpg -c > <文件>`
```bash
# 压缩并加密整个目录
tar czf - /secret | gpg -c > secret.tar.gz.gpg
```

**基本写法：解密并解压目录**
`gpg -d <文件> | tar xzf -`
```bash
# 解密并解压目录
gpg -d secret.tar.gz.gpg | tar xzf - -C /restore
```

**基本写法：使用公钥加密目录**
`tar czf - <目录> | gpg -e -r <接收者> > <文件>`
```bash
# 压缩并用公钥加密目录
tar czf - /data | gpg -e -r user@example.com > data.tar.gz.gpg
```

---

## 批处理操作

**基本写法：批量加密**
`for f in *.txt; do gpg -e -r <接收者> "$f"; done`
```bash
# 批量加密所有 txt 文件
for f in *.txt; do gpg -e -r user@example.com "$f"; done
```

**基本写法：批量解密**
`for f in *.gpg; do gpg -d "$f" > "${f%.gpg}"; done`
```bash
# 批量解密所有 gpg 文件
for f in *.gpg; do gpg -d "$f" > "${f%.gpg}"; done
```

**基本写法：无交互加密**
`gpg --batch --yes -e -r <接收者> <文件>`
```bash
# 批处理模式无交互加密
gpg --batch --yes -e -r user@example.com secret.txt
```

---

## 实用 GPG 组合

**基本写法：安全删除原文件**
`gpg -c <文件> && shred -u <文件>`
```bash
# 加密后安全删除原文件
gpg -c secret.txt && shred -u secret.txt
```

**基本写法：验证并解密**
`gpg --verify <签名> && gpg -d <文件>`
```bash
# 先验证签名再解密
gpg --verify document.sig && gpg -d document.gpg
```

**基本写法：加密邮件内容**
`gpg -a -e -r <接收者> <邮件文件>`
```bash
# 加密邮件内容为 ASCII 格式
gpg -a -e -r recipient@example.com email.txt
```

**基本写法：备份 GPG 密钥**
`gpg --export-secret-keys -a > <文件>; gpg --export -a >> <文件>`
```bash
# 备份所有 GPG 密钥到文件
gpg --export-secret-keys -a > backup.key
gpg --export -a >> backup.key
```

## 自检

- 遮住「密钥生成」一节，写出「快速生成一对密钥 + 列出公钥指纹」的两条命令，并说出指纹在密钥交换里的作用（带外比对防中间人）。
- 「--encrypt --sign 一起用」时消息经过几层处理？为什么先签名后加密（内层签名不可被外层剥离，收方先解密再验签）。
- 遮住「文件加密」一节，写出「用对方公钥加密文件并附带签名」的命令组合。
- 信任级别里 ultimate 只能给谁？把陌生人的公钥标成 ultimate 会破坏什么（Web of Trust 的边界）。
- 遮住「备份」一节，写出「导出私钥 + 导出公钥」的备份命令，并说出吊销证书为什么要先于上传密钥服务器生成（上传后无法撤回）。
