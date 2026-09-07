---
order: 10
title: 安全基础与防御
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: 防火墙策略配置、IDS/IPS入侵检测与防御、系统安全加固、对称/非对称加密算法、哈希算法、SSL/TLS协议。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'cybersecurity/002-WebSecurityPenetrationTesting'
  - 'cybersecurity/003-BinarySecurityAndIncidentResponse'
prerequisites: []
---

## 1. 防火墙策略配置

### 1.1 防火墙类型

| 类型         | 工作层次      | 特点                     | 典型产品            |
| :----------- | :------------ | :----------------------- | :------------------ |
| 包过滤       | 网络层        | 基于 IP/端口过滤，速度快 | iptables、ACL       |
| 状态检测     | 网络层/传输层 | 跟踪连接状态，安全性高   | 华为USG、Cisco ASA  |
| 应用层网关   | 应用层        | 深度包检测，可识别协议   | WAF、下一代防火墙   |
| 下一代防火墙 | 全层          | IPS+AV+应用识别一体化    | Palo Alto、Fortinet |

### 1.2 防火墙策略设计原则

```
1. 默认拒绝（Default Deny）— 仅放行必要流量
2. 最小权限（Least Privilege）— 精确到源/目的/端口/协议
3. 纵深防御（Defense in Depth）— 多层策略叠加
4. 策略顺序 — 从精确到宽泛，先匹配先生效
```

### 1.3 iptables 防火墙配置

```bash
# 查看当前规则
iptables -L -n -v --line-numbers

# 设置默认策略
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 允许回环接口
iptables -A INPUT -i lo -j ACCEPT

# 允许已建立的连接
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 允许 SSH（限速防暴力破解）
iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m recent --set --name SSH
iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m recent --update --seconds 60 --hitcount 4 --name SSH -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 允许 HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 允许 ICMP（限制速率）
iptables -A INPUT -p icmp --icmp-type echo-request \
  -m limit --limit 1/s --limit-burst 3 -j ACCEPT

# 记录被拒绝的流量
iptables -A INPUT -j LOG --log-prefix "IPTables-Dropped: " --log-level 4
iptables -A INPUT -j DROP

# 保存规则
iptables-save > /etc/iptables/rules.v4
```

### 1.4 华为防火墙安全策略配置

```bash
# 创建安全区域
[FW] firewall zone trust
[FW-zone-trust] add interface GigabitEthernet0/0/1
[FW] firewall zone untrust
[FW-zone-untrust] add interface GigabitEthernet0/0/2

# 配置安全策略
[FW] security-policy
[FW-policy-security] rule name Allow-Web
[FW-policy-security-rule-Allow-Web] source-zone trust
[FW-policy-security-rule-Allow-Web] destination-zone untrust
[FW-policy-security-rule-Allow-Web] destination-address 10.1.1.0 24
[FW-policy-security-rule-Allow-Web] service http https
[FW-policy-security-rule-Allow-Web] action permit

# NAT 策略
[FW] nat-policy
[FW-policy-nat] rule name SNAT
[FW-policy-nat-rule-SNAT] source-zone trust
[FW-policy-nat-rule-SNAT] destination-zone untrust
[FW-policy-nat-rule-SNAT] action source-nat easy-ip
```

## 2. 入侵检测系统（IDS）

### 2.1 IDS 与 IPS 对比

| 维度     | IDS（入侵检测）      | IPS（入侵防御）          |
| :------- | :------------------- | :----------------------- |
| 部署方式 | 旁路镜像             | 串联部署                 |
| 动作     | 仅告警               | 告警 + 阻断              |
| 延迟影响 | 无                   | 微量延迟                 |
| 误报影响 | 仅产生噪音告警       | 可能阻断正常业务         |
| 典型产品 | Snort、Suricata(IDS) | Suricata(IPS)、Snort IPS |

### 2.2 Snort 配置示例

```bash
# 安装 Snort
apt install snort -y

# 基本配置 /etc/snort/snort.conf
var HOME_NET 192.168.1.0/24
var EXTERNAL_NET !$HOME_NET

# 规则语法
# action protocol src_ip src_port -> dst_ip dst_port (options;)

# 检测 ICMP 洪水
alert icmp any any -> $HOME_NET any (msg:"ICMP Flood Detected"; \
  threshold:type both, track by_src, count 100, seconds 5; \
  sid:1000001; rev:1;)

# 检测 SQL 注入尝试
alert tcp any any -> $HOME_NET 80 (msg:"SQL Injection Attempt"; \
  flow:to_server,established; \
  content:"UNION SELECT"; nocase; \
  sid:1000002; rev:1;)

# 检测可疑 SSH 登录
alert tcp any any -> $HOME_NET 22 (msg:"SSH Brute Force"; \
  threshold:type both, track by_src, count 5, seconds 60; \
  sid:1000003; rev:1;)

# 启动 Snort（IDS 模式）
snort -A console -q -c /etc/snort/snort.conf -i eth0
```

### 2.3 Suricata IPS 模式

```bash
# 安装 Suricata
apt install suricata -y

# IPS 模式配置（NFQ）
suricata -c /etc/suricata/suricata.yaml -q 0

# iptables 将流量重定向到 Suricata
iptables -I FORWARD -j NFQUEUE --queue-num 0
iptables -I INPUT -j NFQUEUE --queue-num 0
iptables -I OUTPUT -j NFQUEUE --queue-num 0
```

## 3. 系统安全加固

### 3.1 Windows 安全加固

```powershell
# 账户策略
net accounts /maxpwage:90 /minpwage:1 /minpwlen:12 /uniquepw:5
net accounts /lockoutthreshold:5 /lockoutduration:30 /lockoutwindow:30

# 禁用危险服务
Set-Service -Name "Telnet" -StartupType Disabled -Status Stopped
Set-Service -Name "RemoteRegistry" -StartupType Disabled -Status Stopped

# 防火墙配置
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
Enable-NetFirewallRule -DisplayGroup "远程桌面"

# 审计策略
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Object Access" /success:enable /failure:enable
auditpol /set /subcategory:"Privilege Use" /success:enable /failure:enable

# 禁用 SMBv1
Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force

# Windows Defender
Set-MpPreference -DisableRealtimeMonitoring $false
Set-MpPreference -MAPSReporting 2
Update-MpSignature
```

### 3.2 Linux 安全加固

```bash
# SSH 安全配置 /etc/ssh/sshd_config
Port 2222                          # 修改默认端口
PermitRootLogin no                 # 禁止 root 登录
PasswordAuthentication no          # 禁用密码认证
PubkeyAuthentication yes           # 启用密钥认证
MaxAuthTries 3                     # 最大尝试次数
LoginGraceTime 30                  # 登录超时
AllowUsers admin@192.168.1.0/24    # 限制用户和来源

# 文件权限加固
chmod 700 /root
chmod 600 /etc/shadow
chmod 644 /etc/passwd
chattr +i /etc/passwd /etc/shadow  # 不可变属性

# 内核安全参数 /etc/sysctl.conf
net.ipv4.tcp_syncookies = 1        # SYN Flood 防护
net.ipv4.conf.all.rp_filter = 1    # 反向路径过滤
net.ipv4.icmp_echo_ignore_broadcasts = 1  # 忽略广播 ICMP
kernel.exec-shield = 1             # 执行保护
fs.suid_dumpable = 0               # 禁止 SUID 核心转储

# 生效
sysctl -p

# 禁用不必要的 SUID
find / -perm -4000 -type f 2>/dev/null
chmod u-s /bin/ping                # 按需移除 SUID
```

## 4. 对称加密算法

### 4.1 算法对比

| 算法     | 密钥长度   | 分组模式   | 速度 | 安全性   | 应用场景       |
| :------- | :--------- | :--------- | :--- | :------- | :------------- |
| DES      | 56 位      | 64 位分组  | 快   | 低(已破) | 遗留系统       |
| 3DES     | 112/168 位 | 64 位分组  | 慢   | 中       | 兼容旧系统     |
| AES-128  | 128 位     | 128 位分组 | 很快 | 高       | 通用加密       |
| AES-256  | 256 位     | 128 位分组 | 快   | 极高     | 军事/金融      |
| ChaCha20 | 256 位     | 流密码     | 极快 | 极高     | 移动端/TLS 1.3 |

### 4.2 AES 加密示例

```python
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
import os

# 生成随机密钥和 IV
key = os.urandom(32)   # AES-256
iv = os.urandom(16)

# 加密
cipher = AES.new(key, AES.MODE_CBC, iv)
plaintext = b"Hello, FANDEX Security!"
ciphertext = cipher.encrypt(pad(plaintext, AES.block_size))

# 解密
decipher = AES.new(key, AES.MODE_CBC, iv)
decrypted = unpad(decipher.decrypt(ciphertext), AES.block_size)
print(decrypted.decode())  # Hello, FANDEX Security!
```

### 4.3 分组模式

| 模式 | 特点              | 并行加密 | 随机访问 | 推荐   |
| :--- | :---------------- | :------- | :------- | :----- |
| ECB  | 相同明文→相同密文 | 是       | 是       | 不推荐 |
| CBC  | 链式，需要 IV     | 否       | 否       | 可用   |
| CTR  | 计数器模式，流式  | 是       | 是       | 推荐   |
| GCM  | 认证加密(AEAD)    | 是       | 是       | 最推荐 |

## 5. 非对称加密算法

### 5.1 算法对比

| 算法 | 数学基础         | 密钥长度(等效安全) | 速度 | 用途               |
| :--- | :--------------- | :----------------- | :--- | :----------------- |
| RSA  | 大整数分解       | 3072 位            | 慢   | 加密/签名/密钥交换 |
| ECC  | 椭圆曲线离散对数 | 256 位             | 快   | 移动端/IoT/签名    |
| DSA  | 离散对数         | 3072 位            | 慢   | 仅签名             |

### 5.2 RSA 示例

```python
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256

# 生成 RSA 密钥对
key = RSA.generate(2048)
private_key = key.export_key()
public_key = key.publickey().export_key()

# RSA 加密（小数据/密钥交换）
recipient_key = RSA.import_key(public_key)
cipher_rsa = PKCS1_OAEP.new(recipient_key)
ciphertext = cipher_rsa.encrypt(b"Secret Key: AES-256-Key-Here")

# RSA 解密
private_key_obj = RSA.import_key(private_key)
decipher_rsa = PKCS1_OAEP.new(private_key_obj)
plaintext = decipher_rsa.decrypt(ciphertext)

# RSA 签名
message = b"Important document content"
h = SHA256.new(message)
signature = pkcs1_15.new(private_key_obj).sign(h)

# RSA 验签
try:
    pkcs1_15.new(RSA.import_key(public_key)).verify(h, signature)
    print("签名验证通过")
except (ValueError, TypeError):
    print("签名验证失败")
```

## 6. 哈希算法

### 6.1 算法对比

| 算法    | 输出长度 | 速度     | 安全性   | 用途              |
| :------ | :------- | :------- | :------- | :---------------- |
| MD5     | 128 位   | 极快     | 低(碰撞) | 文件校验(非安全)  |
| SHA-1   | 160 位   | 快       | 低(碰撞) | 遗留系统          |
| SHA-256 | 256 位   | 快       | 高       | 通用哈希/数字签名 |
| SHA-384 | 384 位   | 中       | 很高     | 高安全场景        |
| SHA-512 | 512 位   | 中       | 极高     | 高安全场景        |
| bcrypt  | 184 位   | 慢(可调) | 高       | 密码存储          |
| Argon2  | 可变     | 慢(可调) | 最高     | 密码存储(推荐)    |

### 6.2 密码存储最佳实践

```python
import hashlib
import bcrypt
import argon2

#  不安全：明文存储
password = "P@ssw0rd"

#  不安全：简单哈希
md5_hash = hashlib.md5(password.encode()).hexdigest()

#  不安全：SHA256 无盐
sha256_hash = hashlib.sha256(password.encode()).hexdigest()

#  安全：bcrypt（自动加盐）
salt = bcrypt.gensalt(rounds=12)  # cost factor = 12
hashed = bcrypt.hashpw(password.encode(), salt)
# 验证
bcrypt.checkpw(password.encode(), hashed)  # True

#  最安全：Argon2id（抗 GPU/ASIC）
ph = argon2.PasswordHasher(
    time_cost=3,        # 迭代次数
    memory_cost=65536,  # 内存 64MB
    parallelism=4,      # 并行度
    hash_len=32,
    salt_len=16
)
hash_str = ph.hash(password)
# 验证
ph.verify(hash_str, password)  # True
```

## 7. SSL/TLS 协议

### 7.1 TLS 握手流程（TLS 1.3）

```mermaid
flowchart TD
    T0["客户端                                    服务器"]
    T1["ClientHello"]
    T2["(支持的密码套件、密钥共享)"]
    T3["ServerHello"]
    T4["(选定套件、密钥共享、证书)"]
    T5["Certificate"]
    T6["CertificateVerify"]
    T7["Finished"]
    T8["Finished"]
    T9["安全通信开始"]
    T0 --> T1
    T0 --> T2
    T0 --> T3
    T0 --> T4
    T0 --> T5
    T0 --> T6
    T0 --> T7
    T0 --> T8
    T0 --> T9
```

### 7.2 TLS 版本对比

| 版本    | 安全性 | 主要改进                           | 状态     |
| :------ | :----- | :--------------------------------- | :------- |
| SSL 3.0 | 极低   | -                                  | 已废弃   |
| TLS 1.0 | 低     | SSL 3.0 升级                       | 已废弃   |
| TLS 1.1 | 低     | 安全性增强                         | 已废弃   |
| TLS 1.2 | 高     | AEAD 密码套件、SHA-256             | 当前主流 |
| TLS 1.3 | 极高   | 1-RTT 握手、0-RTT 恢复、移除弱算法 | 推荐     |

### 7.3 Nginx TLS 配置

```nginx
server {
    listen 443 ssl http2;
    server_name www.fandex.local;

    # 证书配置
    ssl_certificate     /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    # 仅允许 TLS 1.2 和 1.3
    ssl_protocols TLSv1.2 TLSv1.3;

    # 密码套件（优先 ECDHE + AEAD）
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:
                ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:
                ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    # HSTS（强制 HTTPS）
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 会话恢复
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
}
```
## JWT 生成与解析

**基本写法:生成 HS256 Token**
`python3 -c "import jwt; print(jwt.encode({'<字段>':'<值>'}, '<密钥>', algorithm='HS256'))"`
```bash
# 生成 HS256 算法 JWT Token
python3 -c "import jwt; print(jwt.encode({'user':'admin','exp':1893456000}, 'secretkey', algorithm='HS256'))"
```

**基本写法:解析 JWT Token**
`python3 -c "import jwt; print(jwt.decode('<Token>', '<密钥>', algorithms=['HS256']))"`
```bash
# 解析并验证 JWT Token
python3 -c "import jwt; print(jwt.decode('eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.signature', 'secretkey', algorithms=['HS256']))"
```

**基本写法:无验证解析 Token**
`python3 -c "import jwt; print(jwt.decode('<Token>', options={'verify_signature': False}))"`
```bash
# 不验证签名直接解析 Token(仅用于调试)
python3 -c "import jwt; print(jwt.decode('eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.signature', options={'verify_signature': False}))"
```

**基本写法:使用 jq 解析 Header/Payload**
`echo "<Token>" | cut -d. -f2 | base64 -d 2>/dev/null`
```bash
# 手动解码 JWT Payload 部分
echo "eyJ1c2VyIjoiYWRtaW4ifQ" | base64 -d 2>/dev/null
```

**基本写法:使用 jwt-cli 工具**
`jwt decode <Token>`
```bash
# 使用 jwt-cli 命令行工具解码
jwt decode eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.signature
```

---

## JWT 算法检测

**基本写法:查看 Token Header 算法**
`echo "<Token>" | cut -d. -f1 | base64 -d 2>/dev/null`
```bash
# 查看 JWT 使用的签名算法
echo "eyJhbGciOiJIUzI1NiJ9" | base64 -d 2>/dev/null
```

**基本写法:Python 提取算法**
`python3 -c "import jwt; print(jwt.get_unverified_header('<Token>'))"`
```bash
# 提取 JWT Header 不验证签名
python3 -c "import jwt; print(jwt.get_unverified_header('eyJhbGciOiJIUzI1NiJ9.payload.sig'))"
```

**基本写法:检测 none 算法漏洞**
`python3 -c "import jwt; t=jwt.encode({'user':'admin'}, '', algorithm='none'); print(t)"`
```bash
# 生成 alg=none 的 Token 检测目标是否接受
python3 -c "import jwt; t=jwt.encode({'user':'admin'}, '', algorithm='none'); print(t)"
```

**基本写法:测试 none 算法绕过**
`curl -H "Authorization: Bearer <Token>" <URL>`
```bash
# 使用 none 算法 Token 测试绕过
curl -H "Authorization: Bearer eyJhbGciOiJub25lIn0.eyJ1c2VyIjoiYWRtaW4ifQ." https://example.com/api
```

---

## JWT 弱密钥检测

**基本写法:使用 jwt_tool 爆破密钥**
`python3 jwt_tool.py <Token> -C -d <字典>`
```bash
# 使用字典爆破 HS256 签名密钥
python3 jwt_tool.py eyJhbGciOiJIUzI1NiJ9.payload.sig -C -d passwords.txt
```

**基本写法:使用 hashcat 爆破**
`hashcat -m 16500 <Token> <字典>`
```bash
# 使用 hashcat 模式 16500 爆破 JWT 密钥
hashcat -m 16500 eyJhbGciOiJIUzI1NiJ9.payload.sig rockyou.txt
```

**基本写法:使用 john 爆破**
`python3 jwt2john.py <Token> > <hash文件>; john <hash文件> --wordlist=<字典>`
```bash
# 使用 John the Ripper 爆破 JWT
python3 jwt2john.py eyJhbGciOiJIUzI1NiJ9.payload.sig > jwt.hash
john jwt.hash --wordlist=passwords.txt
```

**基本写法:验证弱密钥**
`python3 -c "import jwt; print(jwt.decode('<Token>', 'secret', algorithms=['HS256']))"`
```bash
# 测试常见弱密钥 secret/123456 等
python3 -c "import jwt; print(jwt.decode('eyJhbGciOiJIUzI1NiJ9.payload.sig', 'secret', algorithms=['HS256']))"
```

---

## JWT 密钥混淆攻击检测

**基本写法:RS256 公钥提取**
`openssl x509 -pubkey -noout -in <证书> > <公钥文件>`
```bash
# 从证书提取公钥用于算法混淆检测
openssl x509 -pubkey -noout -in cert.pem > public.pem
```

**基本写法:使用 jwt_tool 测试混淆**
`python3 jwt_tool.py <Token> -X k -pk <公钥文件>`
```bash
# 使用公钥作为 HS256 密钥构造混淆 Token
python3 jwt_tool.py eyJhbGciOiJSUzI1NiJ9.payload.sig -X k -pk public.pem
```

**基本写法:构造 RS256 转 HS256 攻击**
`python3 -c "import jwt; print(jwt.encode({'user':'admin'}, open('public.pem').read(), algorithm='HS256'))"`
```bash
# 使用公钥作为 HMAC 密钥构造 Token
python3 -c "import jwt; print(jwt.encode({'user':'admin'}, open('public.pem').read(), algorithm='HS256'))"
```

**基本写法:验证目标是否受影响**
`curl -H "Authorization: Bearer <构造Token>" <URL>`
```bash
# 使用混淆 Token 测试目标是否接受
curl -H "Authorization: Bearer <混淆Token>" https://example.com/api
```

---

## JWT 声明校验

**基本写法:校验 exp 过期时间**
`python3 -c "import jwt; print(jwt.decode('<Token>', '<密钥>', algorithms=['HS256']))"`
```bash
# 默认会校验 exp 字段
python3 -c "import jwt; print(jwt.decode('eyJ...', 'secret', algorithms=['HS256']))"
```

**基本写法:忽略过期校验检测**
`python3 -c "import jwt; print(jwt.decode('<Token>', '<密钥>', options={'verify_exp': False}))"`
```bash
# 测试目标是否校验 exp
python3 -c "import jwt; print(jwt.decode('eyJ...', 'secret', algorithms=['HS256'], options={'verify_exp': False}))"
```

**基本写法:校验签发者 iss**
`python3 -c "import jwt; print(jwt.decode('<Token>', '<密钥>', issuer='<签发者>', algorithms=['HS256']))"`
```bash
# 校验 JWT 签发者字段
python3 -c "import jwt; print(jwt.decode('eyJ...', 'secret', issuer='auth.example.com', algorithms=['HS256']))"
```

**基本写法:校验受众 aud**
`python3 -c "import jwt; print(jwt.decode('<Token>', '<密钥>', audience='<受众>', algorithms=['HS256']))"`
```bash
# 校验 JWT 受众字段
python3 -c "import jwt; print(jwt.decode('eyJ...', 'secret', audience='api.example.com', algorithms=['HS256']))"
```

---

## JWT 安全生成

**基本写法:生成带过期时间的 Token**
`python3 -c "import jwt, time; print(jwt.encode({'user':'admin','exp':int(time.time())+3600}, 'secret', algorithm='HS256'))"`
```bash
# 生成有效期 1 小时的 Token
python3 -c "import jwt, time; print(jwt.encode({'user':'admin','exp':int(time.time())+3600}, 'secret', algorithm='HS256'))"
```

**基本写法:生成 RS256 Token**
`python3 -c "import jwt; print(jwt.encode({'user':'admin'}, open('private.pem').read(), algorithm='RS256'))"`
```bash
# 使用 RSA 私钥生成 Token
python3 -c "import jwt; print(jwt.encode({'user':'admin'}, open('private.pem').read(), algorithm='RS256'))"
```

**基本写法:生成强随机密钥**
`openssl rand -base64 48`
```bash
# 生成 HS256 使用的强随机密钥
openssl rand -base64 48
```

**基本写法:生成 jti 唯一标识**
`python3 -c "import jwt, uuid; print(jwt.encode({'jti':str(uuid.uuid4())}, 'secret', algorithm='HS256'))"`
```bash
# 生成带唯一标识的 Token 防重放
python3 -c "import jwt, uuid; print(jwt.encode({'jti':str(uuid.uuid4()),'user':'admin'}, 'secret', algorithm='HS256'))"
```

---

## JWT 安全配置(Nginx)

**基本写法:Nginx 校验 Authorization 头**
`if ($http_authorization !~ "^Bearer ") { return 401; }`
```bash
# Nginx 校验 Authorization 头格式
if ($http_authorization !~ "^Bearer ") {
    return 401;
}
```

**基本写法:转发 Token 到后端**
`proxy_set_header Authorization $http_authorization;`
```bash
# 反向代理转发 Authorization 头
proxy_set_header Authorization $http_authorization;
```

**基本写法:限制 Token 长度**
`client_header_buffer_size <大小>; large_client_header_buffers <数量> <大小>;`
```bash
# 限制请求头大小防止超大 Token
client_header_buffer_size 4k;
large_client_header_buffers 4 8k;
```

**基本写法:使用 auth_request 校验**
`auth_request /auth;`
```bash
# 使用子请求校验 JWT
location /api {
    auth_request /auth;
}
location = /auth {
    proxy_pass http://auth_service/verify;
}
```

---

## JWT 审计与监控

**基本写法:检索日志中 JWT 使用**
`grep -oE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*" <日志>`
```bash
# 从日志中提取所有 JWT Token
grep -oE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*" /var/log/nginx/access.log
```

**基本写法:统计 Token 使用频率**
`grep -oE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" <日志> | sort | uniq -c | sort -rn`
```bash
# 统计各 Token 使用频率检测异常
grep -oE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" /var/log/nginx/access.log | sort | uniq -c | sort -rn | head
```

**基本写法:检测 none 算法攻击**
`grep -i "eyJhbGciOiJub25lIn0\|eyJhbGciOiJub25lI" <日志>`
```bash
# 检测使用 none 算法的攻击 Token
grep -i "eyJhbGciOiJub25lIn0\|eyJhbGciOiJub25lI" /var/log/nginx/access.log
```

**基本写法:监控 Token 异常使用**
`tail -f <日志> | grep -i "bearer\|jwt"`
```bash
# 实时监控 JWT 相关请求
tail -f /var/log/nginx/access.log | grep -i "bearer\|jwt\|eyJ"
```

---

## JWT 安全自检

**基本写法:检查密钥强度**
`echo -n "<密钥>" | wc -c`
```bash
# 检查 JWT 签名密钥长度是否足够(建议 32 字节以上)
echo -n "secretkey" | wc -c
```

**基本写法:验证是否使用强算法**
`echo "<Token>" | cut -d. -f1 | base64 -d 2>/dev/null | grep -i "alg"`
```bash
# 检查 Token 是否使用 HS256/RS256 而非 none
echo "eyJhbGciOiJIUzI1NiJ9" | base64 -d 2>/dev/null
```

**基本写法:检查代码是否校验算法**
`grep -rn "algorithms=\[" <项目目录>`
```bash
# 检查代码是否显式指定允许的算法
grep -rn "algorithms=\[" src/
```

**基本写法:批量验证 Token 配置**
`python3 -c "import jwt; h=jwt.get_unverified_header('<Token>'); print(h)"`
```bash
# 批量检查 Token 配置
python3 -c "import jwt; h=jwt.get_unverified_header('eyJ...'); print('算法:', h.get('alg')); print('类型:', h.get('typ'))"
```
