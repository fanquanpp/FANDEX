---
order: 70
title: 密码哈希
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 密码哈希学习笔记：从一次用户表泄露场景理解为什么必须用慢哈希，动手用 Argon2id/bcrypt/PBKDF2 生成与验证，掌握各语言与框架的落地命令、参数基线与迁移策略。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cybersecurity/060-HashAlgorithm'
  - 'cybersecurity/040-SymmetricEncryption'
  - 'cybersecurity/460-Hashcat'
  - 'cybersecurity/290-AuthenticationAuthorization'
prerequisites:
  - 'cybersecurity/060-HashAlgorithm'
---

## 场景：你的用户表被拖走了

假设某天运维在群里说：数据库备份文件泄露，users 表 50 万行全在外面。这时决定灾难大小的
往往只有一列——`password_hash` 存的是什么。

- 存明文：当场社会性死亡，全员密码作废。
- 存 SHA-256（快哈希）：攻击者拿 GPU 集群每秒可算数十亿次，跑一遍常见密码字典只需分钟级。
- 存 bcrypt/Argon2id（慢哈希 + 盐）：单次验证被刻意拖到几十毫秒、且消耗内存，穷举成本
  放大数百万倍，泄露后大部分用户密码依然安全。

所以「密码哈希」的关键不是算出一个唯一值，而是**把验证一次的成本抬到对登录用户无感
（约 100-500 毫秒）、对爆破者致命**的水平。

## 动手：哈希与验证一个密码

先亲眼看一遍完整流程。用 Python（装 `argon2-cffi`：`pip install argon2-cffi`）：

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()          # 默认即 Argon2id，自动生成随机盐
h = ph.hash("mypassword")
print(h)
# $argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$...  参数、盐、摘要全编码在字符串里

try:
    ph.verify(h, "mypassword")   # 正确 -> 返回 True
except VerifyMismatchError:
    print("密码错误")
```

再对比一下快哈希有多「快得危险」——同一台机器上量一量：

```python
import hashlib, time

t0 = time.perf_counter()
for _ in range(10000):
    hashlib.sha256(b"mypassword").digest()
print("SHA-256 x10000:", time.perf_counter() - t0, "秒")   # 毫秒级

t0 = time.perf_counter()
ph.hash("mypassword")            # 单次
print("Argon2id x1:", time.perf_counter() - t0, "秒")      # 数百毫秒级
```

十亿次与几万次每秒的差距，就是拖库之后攻击成本的差距。

### 哈希字符串里藏着什么

```
$argon2id$v=19$m=19456,t=2,p=1$<base64盐>$<base64摘要>
   算法   版本      参数         随机盐          摘要
```

盐随哈希一起存库是**设计如此**：盐的作用不是保密，而是让相同密码产生不同哈希，
废掉彩虹表和「撞库批量命中」。需要保密的只有摘要本身。

## 讲为什么：三个设计支点

1. **慢（可调工作因子）**：bcrypt 的 cost 每加 1，耗时翻倍；CPU 性能涨了就调参，
   这是快哈希永远给不了的「可调节安全垫」。
2. **盐（每个密码独立随机）**：同密码不同哈希，攻击者只能逐条爆破，无法一次命中整列。
3. **内存困难（Argon2/scrypt 特有）**：GPU/ASIC 靠并行计算单元取胜，强制占内存
   （Argon2 的 m 参数）直接掐住并行的喉咙。这也是 Argon2id 成为 2015 年 PHC 密码哈希
   竞赛冠军、当前首选的原因。

## 怎么选：算法与参数基线

按 OWASP Password Storage Cheat Sheet 的最低基线（生产应在此之上按机器调到单次验证
约 100-500 毫秒）：

| 算法     | 基线参数                        | 定位                                   |
| :------- | :------------------------------ | :------------------------------------- |
| Argon2id | m=19456 KiB(19 MiB), t=2, p=1   | 首选；内存不足时可换 t=5, m=7168 等组合 |
| scrypt   | N=2^17(131072), r=8, p=1        | 内存困难，Python/Node 标准库自带        |
| bcrypt   | cost=10 起步（服务端常用 12）   | 成熟可靠；密码最长 72 字节，超长静默截断 |
| PBKDF2   | HMAC-SHA256 迭代 600000+        | 弱于上面三者，但 FIPS 合规环境的必选项  |

参考：<https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>

明确废弃：MD5、SHA-1 做密码存储；直接 SHA-256 无盐慢迭代也不行。两者只可用于完整性
校验等非密码场景（见 cybersecurity/060-HashAlgorithm）。

合规注意：Argon2/scrypt/bcrypt 没有 FIPS 验证路线，过 FIPS 审计的系统选 PBKDF2
（NIST SP 800-132）。别把「FIPS 203（后量子算法 ML-KEM）」和密码哈希混淆，名字里都有
FIPS 但毫无关系。

## 各平台落地命令

### Python

```bash
# Argon2id（argon2-cffi）
python3 -c "from argon2 import PasswordHasher; print(PasswordHasher().hash('mypassword'))"
python3 -c "from argon2 import PasswordHasher; print(PasswordHasher().verify('\$argon2id\$...', 'mypassword'))"

# bcrypt
python3 -c "import bcrypt; print(bcrypt.hashpw(b'mypassword', bcrypt.gensalt(12)).decode())"
python3 -c "import bcrypt; print(bcrypt.checkpw(b'mypassword', b'\$2b\$12\$...'))"

# passlib（多算法统一接口）
python3 -c "from passlib.hash import bcrypt; print(bcrypt.using(rounds=12).hash('mypassword'))"

# PBKDF2（标准库自带）
python3 -c "import hashlib, binascii, os; salt=os.urandom(16); print(binascii.hexlify(hashlib.pbkdf2_hmac('sha256', b'mypassword', salt, 600000)).decode())"
```

### Node.js

```bash
# bcrypt（npm i bcrypt）
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('mypassword', 12).then(console.log)"
node -e "const bcrypt=require('bcrypt'); bcrypt.compare('mypassword', '\$2b\$...').then(console.log)"

# Argon2（npm i argon2）
node -e "const argon2=require('argon2'); argon2.hash('mypassword').then(console.log)"

# scrypt（crypto 内置，无需安装）
node -e "const crypto=require('crypto'); const salt=crypto.randomBytes(16); crypto.scrypt('mypassword', salt, 64, {N:131072}, (e,k)=>console.log(k.toString('hex')))"
```

### 命令行工具

```bash
# Apache htpasswd 生成/验证 bcrypt
htpasswd -nbB admin secret123
htpasswd -bv /etc/nginx/.htpasswd admin secret123

# openssl：Linux 系统密码格式的 SHA-512crypt（$6$）与 bcrypt
openssl passwd -6 mypassword
openssl passwd -bcrypt mypassword
openssl passwd -6 -salt abc123 mypassword     # 同盐同密码 -> 同哈希，可用于验证

# mkpasswd（whois 包附带）
mkpasswd -m sha-512 mypassword

# PBKDF2 / scrypt 派生密钥
openssl kdf -keylen 32 -kdfopts pass:password:salt:salt:iter:600000 PBKDF2
openssl kdf -keylen 32 -kdfopts pass:password:salt:salt:n:16384:r:8:p:1 scrypt

# argon2 命令行工具
# 注意：-m N 表示内存为 2^N KiB，-m 16 即 64 MiB（不是 16 KiB，也别当 65536 MiB）
echo -n "mypassword" | argon2 somesalt -id -t 3 -m 16 -p 1 -l 32
# 命令行传盐仅适合实验；生产务必用库函数自动生成随机盐
```

### Linux 系统密码（/etc/shadow）

```bash
# 看自己账号用的算法：第二字段前缀 $6$=SHA-512crypt，$2b$=bcrypt，$argon2id$=Argon2
grep $USER /etc/shadow | cut -d: -f2 | cut -c1-12

# Python 生成系统格式哈希
# 注意：crypt 模块在 Python 3.13 中已被移除（3.11 起弃用），
# 新代码改用 passlib 或直接 openssl passwd -6
python3 -c "import crypt; print(crypt.crypt('mypassword', crypt.mksalt(crypt.METHOD_SHA512)))"
```

### 框架内置（别绕开它们）

```python
# Django：默认 PBKDF2，PASSWORD_HASHERS 第一项可换 Argon2id（需 pip install argon2-cffi）
python3 -c "from django.contrib.auth.hashers import make_password; print(make_password('mypassword'))"
python3 -c "from django.contrib.auth.hashers import make_password; print(make_password('mypassword', hasher='argon2'))"
python3 -c "from django.contrib.auth.hashers import check_password; print(check_password('mypassword', 'pbkdf2_sha256\$...'))"
```

```java
// Spring Security：生产应配 DelegatingPasswordEncoder（{bcrypt}... 前缀自动路由）
BCryptPasswordEncoder bEncoder = new BCryptPasswordEncoder(12);
String hash = bEncoder.encode("mypassword");
boolean match = bEncoder.matches("mypassword", hash);

Argon2PasswordEncoder aEncoder = new Argon2PasswordEncoder();
String hash2 = aEncoder.encode("mypassword");
```

## 坑点与自检

| 坑点 | 事实 |
| :--- | :--- |
| 自己拼 `sha256(password + salt)` | 没有慢化因子，等同裸奔；用库函数，别手搓 |
| bcrypt 收长密码 | 72 字节截断是算法定义，超长部分静默丢弃；先做口令短语拆分或换 Argon2 |
| 命令行 argon2 传盐演示后直接上生产 | 固定盐 = 彩虹表复活；生产代码必须每次随机生成盐 |
| Python 3.13 里 `import crypt` 报错 | crypt 模块已移除；用 passlib/argon2-cffi 或 openssl passwd |
| 一次全量「升级」用户表 | 正确姿势是登录时重哈希（工作因子/算法变了就 rehash 并回写），逐步迁移 |
| 强制复杂度正则 + 90 天改密 | NIST SP 800-63B 的现代口径：长度优先、查泄露口令黑名单、不强制定期改密；复杂度正则只配当 UI 提示 |

## 2026 视角：密码哈希正在「退居二线」但不会消失

Passkeys（WebAuthn/FIDO2）把认证从「共享秘密（密码）」换成「设备私钥 + 站点公钥」，
服务器从此**无密码可泄露**，大平台已全面铺开。但这不意味着可以删掉本文：任何支持
passkey 回退到密码的系统，密码哈希仍是最后一道墙。务实路线是 passkey 优先 + 高基线
密码哈希兜底；纯密码系统则应把参数调到位并准备登录时重哈希的迁移通道。

## 练习

1. 在本机用本文代码量出 SHA-256 与 Argon2id 默认参数的单次耗时，把 m 调到 65536、t=3
   再量一次，体会「参数换安全」。
2. 用 `htpasswd -nbB` 生成一条 bcrypt 哈希，再用 Python `bcrypt.checkpw` 验证通过，
   理解「哈希格式是跨工具通用的」。
3. 检查你手头项目（或练习项目）的用户表哈希前缀，对照本文表格判断算法与参数是否达标。
4. 给练习项目实现「登录时重哈希」：checkPassword 后检测 cost/参数是否低于当前基线，
   低则用新参数重新哈希并更新数据库。

## 下一步

- cybersecurity/060-HashAlgorithm：普通哈希与密码哈希的原理分野，SHA-2/SHA-3 家族。
- cybersecurity/460-Hashcat：理解攻击者拿到库之后如何估算爆破成本（防御视角的测算）。
- cybersecurity/290-AuthenticationAuthorization：密码只是认证的一半，会话与授权同样关键。
