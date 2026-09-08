---
order: 410
title: GPG 加密与签名
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity GPG 加密与签名 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

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
