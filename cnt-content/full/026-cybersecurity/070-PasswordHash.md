---
order: 70
title: 密码哈希
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 密码哈希命令实操：bcrypt/Argon2/scrypt/PBKDF2 生成与验证、Linux crypt 哈希、Django/Spring/Node.js 框架实践与参数基线。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/060-HashAlgorithm'
  - 'cybersecurity/040-SymmetricEncryption'
  - 'cybersecurity/460-Hashcat'
  - 'cybersecurity/290-AuthenticationAuthorization'
prerequisites:
  - 'cybersecurity/060-HashAlgorithm'
---

## 为什么密码要用专用哈希

普通哈希（SHA-256）计算太快，GPU 每秒可算数十亿次，攻击者拿库后可离线穷举。
密码哈希函数（bcrypt/Argon2/scrypt/PBKDF2）的共同点是**刻意缓慢且消耗资源、
强制加盐**，把单次验证成本抬高到对用户无感、对爆破者致命的水平。原理与算法对比
见 017-HashAlgorithm 第 6 节；本文聚焦各平台可复制的命令。

## bcrypt 哈希

**基本写法：使用 Python 生成 bcrypt 哈希**
`python3 -c "import bcrypt; print(bcrypt.hashpw(b'<密码>', bcrypt.gensalt()).decode())"`
```bash
# 生成 bcrypt 哈希
python3 -c "import bcrypt; print(bcrypt.hashpw(b'mypassword', bcrypt.gensalt(12)).decode())"
```

**基本写法：指定计算成本**
`python3 -c "import bcrypt; print(bcrypt.hashpw(b'<密码>', bcrypt.gensalt(<成本>)).decode())"`
```bash
# 使用成本因子 12（默认 12）
python3 -c "import bcrypt; print(bcrypt.hashpw(b'mypassword', bcrypt.gensalt(14)).decode())"
```

**基本写法：验证 bcrypt 密码**
`python3 -c "import bcrypt; print(bcrypt.checkpw(b'<密码>', b'<哈希>'))"`
```bash
# 验证 bcrypt 密码
python3 -c "import bcrypt; print(bcrypt.checkpw(b'mypassword', b'\$2b\$12\$...'))"
```

**基本写法：使用 htpasswd 生成 bcrypt**
`htpasswd -nbB <用户> <密码>`
```bash
# 使用 Apache htpasswd 生成 bcrypt
htpasswd -nbB admin secret123
```

**基本写法：使用 Node.js 生成 bcrypt**
`node -e "const bcrypt=require('bcrypt'); console.log(bcrypt.hashSync('密码', 12))"`
```bash
# Node.js 生成 bcrypt
node -e "const bcrypt=require('bcrypt'); console.log(bcrypt.hashSync('mypassword', 12))"
```

---

## Argon2 哈希

**基本写法：使用 argon2 命令行工具**
`argon2 <盐> -id -t <迭代次数> -m <内存(2的幂)> -p <并行数> -l <长度>`
```bash
# 注意：-m N 表示内存为 2^N KiB，-m 16 即 64MiB（不是 65536）
echo -n "mypassword" | argon2 somesalt -id -t 3 -m 16 -p 1 -l 32
# 命令行传盐仅适合实验；生产请用库函数自动生成随机盐（见下方 Python 示例）
```

**基本写法：使用 Python argon2**
`python3 -c "from argon2 import PasswordHasher; ph=PasswordHasher(); print(ph.hash('<密码>'))"`
```bash
# 使用 argon2-cffi 库
python3 -c "from argon2 import PasswordHasher; ph=PasswordHasher(); print(ph.hash('mypassword'))"
```

**基本写法：验证 argon2 密码**
`python3 -c "from argon2 import PasswordHasher; ph=PasswordHasher(); print(ph.verify('<哈希>', '<密码>'))"`
```bash
# 验证 argon2 密码
python3 -c "from argon2 import PasswordHasher; ph=PasswordHasher(); print(ph.verify('\$argon2id\$...', 'mypassword'))"
```

**基本写法：使用 Node.js argon2**
`node -e "const argon2=require('argon2'); argon2.hash('密码').then(console.log)"`
```bash
# Node.js 生成 argon2
node -e "const argon2=require('argon2'); argon2.hash('mypassword').then(console.log)"
```

---

## PBKDF2 哈希

**基本写法：使用 Python PBKDF2**
`python3 -c "import hashlib, binascii, os; salt=os.urandom(16); print(binascii.hexlify(hashlib.pbkdf2_hmac('sha256', b'<密码>', salt, <迭代次数>)).decode())"`
```bash
# 使用 PBKDF2-SHA256 派生密钥
python3 -c "import hashlib, binascii, os; salt=os.urandom(16); print(binascii.hexlify(hashlib.pbkdf2_hmac('sha256', b'mypassword', salt, 600000)).decode())"
```

**基本写法：使用 OpenSSL PBKDF2**
`openssl kdf -keylen <长度> -kdfopts pass:<密码>:salt:<盐>:iter:<迭代次数> PBKDF2`
```bash
# OpenSSL 生成 PBKDF2 密钥
openssl kdf -keylen 32 -kdfopts pass:password:salt:salt:iter:600000 PBKDF2
```

**基本写法：使用 Django PBKDF2**
`python3 -c "from django.contrib.auth.hashers import PBKDF2PasswordHasher; h=PBKDF2PasswordHasher(); print(h.encode('<密码>', h.salt()))"`
```bash
# Django 风格 PBKDF2 哈希
python3 -c "from django.contrib.auth.hashers import PBKDF2PasswordHasher; h=PBKDF2PasswordHasher(); print(h.encode('mypassword', h.salt()))"
```

---

## scrypt 哈希

**基本写法：使用 OpenSSL scrypt**
`openssl kdf -keylen <长度> -kdfopts pass:<密码>:salt:<盐>:n:<N>:r:<r>:p:<p> scrypt`
```bash
# 使用 scrypt 派生密钥
openssl kdf -keylen 32 -kdfopts pass:password:salt:salt:n:16384:r:8:p:1 scrypt
```

**基本写法：使用 Python scrypt**
`python3 -c "import hashlib; print(hashlib.scrypt(b'<密码>', salt=b'<盐>', n=16384, r=8, p=1, dklen=32).hex())"`
```bash
# Python 生成 scrypt 哈希
python3 -c "import hashlib; print(hashlib.scrypt(b'mypassword', salt=b'salt', n=16384, r=8, p=1, dklen=32).hex())"
```

**基本写法：使用 Node.js scrypt**
`node -e "const crypto=require('crypto'); console.log(crypto.scryptSync('密码', '盐', 64).toString('hex'))"`
```bash
# Node.js 生成 scrypt 哈希
node -e "const crypto=require('crypto'); console.log(crypto.scryptSync('mypassword', 'salt', 64).toString('hex'))"
```

---

## Linux 系统密码哈希

**基本写法：使用 mkpasswd**
`mkpasswd -m <算法> <密码>`
```bash
# 生成 SHA-512 密码哈希
mkpasswd -m sha-512 mypassword
```

**基本写法：使用 openssl 生成 crypt 哈希**
`openssl passwd -6 <密码>`
```bash
# 生成 SHA-512crypt 哈希
openssl passwd -6 mypassword
```

**基本写法：使用 openssl 生成 bcrypt**
`openssl passwd -bcrypt <密码>`
```bash
# 生成 bcrypt 哈希
openssl passwd -bcrypt mypassword
```

**基本写法：使用 Python crypt**
`python3 -c "import crypt; print(crypt.crypt('<密码>', crypt.mksalt(crypt.METHOD_SHA512)))"`
```bash
# 生成 SHA-512crypt 密码哈希
# 注意：crypt 模块在 Python 3.13 中已被移除（3.11 起弃用），
# 新代码请改用 passlib 或直接调用 openssl passwd
python3 -c "import crypt; print(crypt.crypt('mypassword', crypt.mksalt(crypt.METHOD_SHA512)))"
```

---

## 密码哈希验证

**基本写法：使用 Python crypt 验证**
`python3 -c "import crypt; print(crypt.crypt('<密码>', '<哈希>') == '<哈希>')"`
```bash
# 验证密码哈希
python3 -c "import crypt; print(crypt.crypt('mypassword', '\$6\$...') == '\$6\$...')"
```

**基本写法：使用 openssl 验证**
`openssl passwd -6 -salt <盐> <密码>`
```bash
# 验证密码哈希
openssl passwd -6 -salt abc123 mypassword
```

**基本写法：使用 htpasswd 验证**
`htpasswd -bv <密码文件> <用户> <密码>`
```bash
# 验证 htpasswd 中的密码
htpasswd -bv /etc/nginx/.htpasswd admin secret123
```

---

## Django 密码哈希

**基本写法：使用 Django 生成密码哈希**
`python3 -c "from django.contrib.auth.hashers import make_password; print(make_password('<密码>'))"`
```bash
# Django 生成 PBKDF2 密码哈希
python3 -c "from django.contrib.auth.hashers import make_password; print(make_password('mypassword'))"
```

**基本写法：使用 Django 验证密码**
`python3 -c "from django.contrib.auth.hashers import check_password; print(check_password('<密码>', '<哈希>'))"`
```bash
# Django 验证密码
python3 -c "from django.contrib.auth.hashers import check_password; print(check_password('mypassword', 'pbkdf2_sha256\$...'))"
```

**基本写法：使用 Django Argon2**
`python3 -c "from django.contrib.auth.hashers import make_password; print(make_password('<密码>', hasher='argon2'))"`
```bash
# Django 使用 Argon2 哈希
python3 -c "from django.contrib.auth.hashers import make_password; print(make_password('mypassword', hasher='argon2'))"
```

---

## Spring Security 密码编码

**基本写法：使用 BCryptPasswordEncoder**
```java
`BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
String hash = encoder.encode("密码");
boolean match = encoder.matches("密码", hash);`
```
```java
// Spring Security BCrypt 编码
BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
String hash = encoder.encode("mypassword");
boolean match = encoder.matches("mypassword", hash);
```

**基本写法：使用 Argon2PasswordEncoder**
```java
`Argon2PasswordEncoder encoder = new Argon2PasswordEncoder();
String hash = encoder.encode("密码");`
```
```java
// Spring Security Argon2 编码
Argon2PasswordEncoder encoder = new Argon2PasswordEncoder();
String hash = encoder.encode("mypassword");
```

---

## Node.js 密码哈希

**基本写法：使用 bcrypt**
`node -e "const bcrypt=require('bcrypt'); bcrypt.hash('密码', 12).then(console.log)"`
```bash
# Node.js bcrypt 哈希
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('mypassword', 12).then(console.log)"
```

**基本写法：验证 bcrypt**
`node -e "const bcrypt=require('bcrypt'); bcrypt.compare('密码', '哈希').then(console.log)"`
```bash
# Node.js 验证 bcrypt
node -e "const bcrypt=require('bcrypt'); bcrypt.compare('mypassword', '\$2b\$...').then(console.log)"
```

**基本写法：使用 scrypt**
`node -e "const crypto=require('crypto'); const hash=crypto.scryptSync('密码','盐',64).toString('hex'); console.log(hash)"`
```bash
# Node.js 内置 scrypt
node -e "const crypto=require('crypto'); const hash=crypto.scryptSync('mypassword','salt',64).toString('hex'); console.log(hash)"
```

---

## 密码强度检测

**基本写法：检查密码长度**
`python3 -c "p='<密码>'; print(len(p) >= 12 and '足够' or '不足')"`
```bash
# 检查密码长度是否至少 12 位
python3 -c "p='mypassword'; print('OK' if len(p) >= 12 else 'Too short')"
```

**基本写法：检查密码复杂度**
`python3 -c "import re; p='<密码>'; print(bool(re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@\$!%*?&]).{12,}$', p)))"`
```bash
# 检查密码是否包含大小写字母数字特殊字符
python3 -c "import re; p='MyP@ssw0rd2026'; print(bool(re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@\$!%*?&]).{12,}$', p)))"
```

**基本写法：使用 passlib 检测**
`python3 -c "from passlib.hash import bcrypt; print(bcrypt.using(rounds=12).hash('<密码>'))"`
```bash
# 使用 passlib 库生成 bcrypt
python3 -c "from passlib.hash import bcrypt; print(bcrypt.using(rounds=12).hash('mypassword'))"
```

---

## 密码哈希最佳实践

**基本写法：推荐算法对比**
```text
`算法       推荐参数                  说明
Argon2id   memory=64MB, iter=3      首选，抗 GPU/ASIC
bcrypt     cost=12+                 成熟可靠
scrypt     N=16384, r=8, p=1        内存困难函数
PBKDF2     iterations=600000+       兼容性最好但较弱`
```
```text
# 密码哈希算法推荐顺序
1. Argon2id（PHC 竞赛冠军，当前首选）
2. bcrypt（成熟，cost >= 12；密码最长 72 字节需注意）
3. scrypt（内存困难，N=16384）
4. PBKDF2（兼容性，迭代 >= 600000；FIPS 环境下的合规选择，见 NIST SP 800-132）
# 注意：Argon2 并非 FIPS 认证算法（FIPS 203 是后量子算法 ML-KEM，勿混淆）；
# 需过 FIPS 合规审计的系统选 PBKDF2
```

**基本写法：弱算法警告**
```text
`已废弃：MD5、SHA1、DES、3DES、RC4
不推荐：直接使用 SHA256 哈希密码
推荐：使用专门的密码哈希函数 bcrypt/Argon2`
```
```bash
# 检查 /etc/shadow 中的哈希算法
grep $USER /etc/shadow | cut -d: -f2 | cut -d$ -f2
```
