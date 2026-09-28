---
order: 90
title: HTTPS 原理
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: HTTPS 学习笔记：动手观察一次真实 TLS 握手，理解 TLS 1.2/1.3 握手差异、ECDHE 前向保密、证书链验证与套件命名，掌握 Nginx 安全配置与 2026 年证书短寿命、后量子混合密钥交换动态。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cybersecurity/540-ComplianceAudit'
  - 'cybersecurity/080-DigitalCertificate'
  - 'cybersecurity/360-PenetrationTestingMethodology'
  - 'cybersecurity/380-InformationGathering'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 场景：给自己的服务上 HTTPS

你写好一个 API 服务，第一次对外发布。同事提醒：「上 HTTPS 了吗？没上的话，同一个
Wi-Fi 里的任何人都能看到用户的密码。」HTTPS 解决的正是三件事：

| 安全属性 | 描述               | 没有它会发生什么               |
| -------- | ------------------ | ------------------------------ |
| 机密性   | 数据加密传输       | 中间人直接读到明文             |
| 完整性   | 防止数据被篡改     | 运营商可往页面里插广告/脚本    |
| 身份认证 | 验证服务器身份     | 假站点伪造银行/API 无从分辨    |

HTTPS = HTTP + TLS。本文按「先看到、再理解、最后配对」的顺序走一遍。

## 动手 1：亲眼看一次真实握手

不用图形工具，openssl 一条命令看完整握手摘要：

```bash
openssl s_client -brief -connect fanquanpp.github.io:443 -servername fanquanpp.github.io </dev/null
# CONNECTION ESTABLISHED
# Protocol version: TLSv1.3          ← 协商出的版本
# Ciphersuite: TLS_AES_128_GCM_SHA256 ← 注意：1.3 的套件名里没有密钥交换算法了
# Server Temp Key: X25519, 253 bits  ← 临时椭圆曲线密钥（这就是前向保密的来源）
# Verification: OK                   ← 证书链验证通过
```

再验证「旧协议已被禁用」——主动请求 TLS 1.1 应当失败：

```bash
openssl s_client -connect example.com:443 -tls1_1 </dev/null
# 大概率得到 handshake failure 或 unsupported protocol
```

这两个观察先记住，下文解释它们为什么重要。

## 动手 2：亲手签一张证书

本地开发用 mkcert（自动信任到自己系统），公网服务用 Let's Encrypt（ACME 协议全自动）：

```bash
# 本地：mkcert 一条命令，浏览器不再报红锁
mkcert localhost 127.0.0.1

# 生产：certbot 按 Nginx 配置自动签发续期
certbot --nginx -d example.com -d www.example.com
```

ACME（RFC 8555）的流程：客户端向 CA 证明你控制该域名（HTTP-01 放一个验证文件或
DNS-01 加一条 TXT 记录）-> CA 签发证书 -> 定时自动续期。Let's Encrypt 免费且已被所有
主流环境信任，2026 年没有理由再用自签证书跑公网服务。

## 讲为什么 1：TLS 1.2 握手在做什么

```text
Client                                          Server
  |  1. ClientHello                               |
  |  (TLS版本, 密码套件, 随机数Rc, SNI)           |
  |----------------------------------------------->|
  |  2. ServerHello                               |
  |  (TLS版本, 选定套件, 随机数Rs)                |
  |  Certificate (服务器证书链)                    |
  |  ServerKeyExchange (DH参数)                   |
  |  ServerHelloDone                              |
  |<-----------------------------------------------|
  |  3. ClientKeyExchange (DH公钥)                |
  |  ChangeCipherSpec + Finished                  |
  |----------------------------------------------->|
  |  4. ChangeCipherSpec + Finished               |
  |<-----------------------------------------------|
  |  ========== 加密通信开始 =========            |
```

核心是第 2-3 步的 **ECDHE 密钥交换**（椭圆曲线临时 Diffie-Hellman）：

1. 双方交换各自的椭圆曲线公钥：$Q_A = d_A \cdot G$、$Q_B = d_B \cdot G$
2. 各自计算共享点（椭圆曲线标量乘法，非模幂运算）：
   $d_A \cdot Q_B = d_B \cdot Q_A = d_A d_B \cdot G$
3. 经 HKDF 从共享密钥推导主密钥与会话密钥（加密密钥、IV 等）

> 注意区分：$g^{ab} \bmod p$ 的模幂形式是**经典 DHE** 的计算方式；ECDHE 用的是椭圆曲线
> 点乘，安全性对应「椭圆曲线离散对数问题」。两者都属于「临时（ephemeral）」密钥交换，
> 私钥不落盘、每次会话重新生成——这就是**前向保密（PFS）**：日后服务器私钥即使泄露，
> 过去的会话记录也解不开。你在动手 1 里看到的 `Server Temp Key: X25519` 就是它。

### 密码套件名字拆解

```text
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
 |    |     |           |       |    └─ PRF/HMAC 哈希
 |    |     |           |       └─ 加密模式：GCM（带认证的加密）
 |    |     |           └─ 加密算法与强度
 |    |     └─ 证书签名算法
 |    └─ 密钥交换：ECDHE（临时椭圆曲线 DH）
 └─ 协议版本
```

## 讲为什么 2：TLS 1.3 把握手砍了一半

```text
Client                                          Server
  |  1. ClientHello                              |
  |  (TLS 1.3, 套件, DH公钥share, 随机数)        |
  |---------------------------------------------->|
  |  2. ServerHello                              |
  |  (选定套件, DH公钥share)                     |
  |  EncryptedExtensions ← ServerHello 之后全部加密 |
  |  Certificate + CertificateVerify             |
  |  Finished                                    |
  |<----------------------------------------------|
  |  3. Finished                                 |
  |---------------------------------------------->|
  |  ========== 加密通信开始 =========           |
```

| 改进           | 描述                                                |
| -------------- | --------------------------------------------------- |
| 握手 1-RTT     | ClientHello 直接带上 DH share，一个来回即可发数据   |
| 0-RTT 恢复     | 会话恢复时把应用数据搭在第一个航班上，零往返        |
| 移除不安全算法 | 删除 RSA 静态密钥交换、CBC 模式、RC4、SHA-1 套件等  |
| 强制前向保密   | 仅保留 (EC)DHE 类临时密钥交换                       |
| 加密更多握手   | ServerHello 之后全部加密（证书也不再明文暴露）      |
| 套件命名简化   | 仅 5 个 AEAD 套件，如 TLS_AES_128_GCM_SHA256、TLS_CHACHA20_POLY1305_SHA256 |

解释动手 1 的两个观察：TLS 1.3 套件名里没有 ECDHE 字样，因为**所有**套件都强制
(E)DHE，无需再声明；`-tls1_1` 失败，因为主流服务端早已只留 TLS 1.2/1.3。

### 0-RTT 与重放风险

```text
Client → Server:  ClientHello + Early Data (PSK + DH share + 应用数据)
Server → Client:  ServerHello + New Session Ticket + Application Data
```

0-RTT 数据用 PSK 加密且不含服务器新鲜随机数，**可以被截获后原样重放**。规矩：
只放幂等操作（GET、查询）进 0-RTT；写操作一律等 1-RTT 握手完成。

## 证书验证：浏览器在替你查什么

证书把「域名」和「服务器公钥」用 CA 的签名绑定起来。验证五步：

```text
1. 签名验证：证书是否由可信 CA 签发（沿证书链逐级验到系统根证书）
2. 域名匹配：SAN/CN 是否包含你访问的域名
3. 有效期：notBefore/notAfter 是否覆盖当前时间
4. 吊销状态：OCSP/CRL（现代浏览器多用 OCSP Stapling 短路验证）
5. 证书链完整性：中间证书齐全、顺序正确
```

任何一步失败浏览器都会拦截并明示原因——这就是动手 2 里自签证书报红的那个原因。
另一个基础设施是 **CT（证书透明度）日志**：所有公信 CA 签发的证书必须公开记录，
任何人（包括你的域名）可监控是否有未授权证书被签出，发现误签可推动吊销。

用库验证时不要关主机名校验：

```python
import ssl, socket

context = ssl.create_default_context()   # 默认验证证书链与主机名
with socket.create_connection(('example.com', 443)) as sock:
    with context.wrap_socket(sock, server_hostname='example.com') as ssock:
        cert = ssock.getpeercert()
```

> 真实事故模式：代码里 `check_hostname=False`、`verify_mode=CERT_NONE`「为了跑通」，
> 等于把整套身份认证拆了，中间人可以随便伪造。生产代码永远保持默认验证。

## 部署清单：Nginx 参考配置

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/ssl/certs/example.com.pem;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    # 只留现代协议
    ssl_protocols TLSv1.2 TLSv1.3;
    # 仅 (EC)DHE + AEAD 套件（前向保密）
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    # 强制 HTTPS 一年，覆盖所有子域
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # OCSP Stapling：服务器代取吊销状态，客户端免直连 CA
    ssl_stapling on;
    ssl_stapling_verify on;
}
```

配套的安全响应头与 80 端口跳转：

| 头                        | 值                                    | 作用           |
| ------------------------- | ------------------------------------- | -------------- |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | 强制 HTTPS     |
| X-Content-Type-Options    | `nosniff`                             | 防 MIME 嗅探   |
| X-Frame-Options           | `DENY`                                | 防点击劫持     |

```nginx
server { listen 80; return 301 https://$host$request_uri; }  # 80 -> 443
```

真实参照：本仓库网页端部署在 GitHub Pages 上，平台自动签发证书并对
`*.github.io` 强制 HTTPS。可以自己验证 `curl -sI https://fanquanpp.github.io/FANDEX/ | grep -i strict`——
看它下发了什么 HSTS 头；CSP 等应用层安全头则是仓库自己在模板里控制
（见 cybersecurity/200-XSSDefense 的案例解读）。

## TLS 攻击一览（理解为何旧版本必须禁）

| 攻击       | 目标            | 防御             |
| ---------- | --------------- | ---------------- |
| BEAST      | TLS 1.0 CBC     | 升级到 TLS 1.2+  |
| POODLE     | SSL 3.0         | 禁用 SSL 3.0     |
| Heartbleed | OpenSSL 实现缺陷 | 升级 OpenSSL    |
| Logjam     | 弱 DH 参数（512 位） | 使用 2048+ 位 DH |
| ROBOT      | RSA PKCS#1 v1.5 | 弃用 RSA 密钥交换 |
| 降级攻击   | 协议/套件协商   | TLS 1.3 内建降级保护，只留 1.2/1.3 |

规律：出事的要么是旧协议版本，要么是被 1.3 删掉的算法（RSA 静态交换、CBC、SHA-1）。
「只开 TLS 1.2/1.3」不是保守，是把已证伪的历史打包扔掉。

## 2026 动态一：公共证书有效期正在腰斩再腰斩

CA/Browser Forum SC-081v3 已通过分阶段压缩，自动化续期从「最佳实践」变成「生存必需」：

| 生效时间   | 公共 TLS 证书最长有效期 |
| :--------- | :---------------------- |
| 2026-03 起 | 200 天                  |
| 2027-03 起 | 100 天                  |
| 2029-03 起 | 47 天                   |

域名验证数据的复用期同步缩短（最终仅 10 天）；Let's Encrypt 等已提供更短的数天级证书。
工程含义：任何依赖人工换证书的流程都不可持续，务必全量 ACME 自动化（含内网专用 CA 的自动化）。

## 2026 动态二：后量子混合密钥交换已在默认开启

RSA/ECC 面临「先截获后解密」的量子威胁。主流浏览器与 CDN 已在 TLS 1.3 中默认启用
**X25519 + ML-KEM（FIPS 203）混合密钥交换**（如 X25519MLKEM768 组合）：两类算法其一
未被攻破即可保证前向机密。新部署的服务端网关应确认 TLS 栈（OpenSSL 3.5+ 等）支持
混合组——这是平滑过渡的现成方案，不需要等「量子计算机落地」才开始。验证方式：

```bash
openssl s_client -brief -connect www.cloudflare.com:443 </dev/null 2>&1 | grep -i "temp key"
# Server Temp Key: X25519MLKEM768, ...  ← 混合组已生效（若服务端支持）
```

## 坑点与自检

| 坑点 | 事实 |
| :--- | :--- |
| 证书链不全（漏中间证书） | 浏览器有缓存时正常、新设备报错，极难排查；用 `openssl s_client` 看完整链 |
| 代码里关掉证书校验 | 等于裸奔给中间人；调试期也应保持默认验证，用正确信任源解决 |
| 0-RTT 放行写操作 | Early Data 可重放，写操作必须等 1-RTT |
| HSTS 一上来就 max-age 巨大 + preload | 配错证书会被浏览器硬缓存一年，先小 max-age 试运行再上调 |
| RSA 密钥交换「还能用就行」 | 无前向保密、屡被打穿，1.3 已删除；1.2 下也应只选 ECDHE 套件 |
| 人工续期流程 | 47 天时代活不下去，全量 ACME 自动化是唯一正解 |

自检清单：能说清前向保密为什么要求「临时」密钥吗？能拆解一条 1.2 套件名的五段含义吗？
证书验证五步各自挡住什么攻击？你的部署里 1.2 以下协议、非 ECDHE 套件、明文 80 端口
分别怎么处理？

## 练习

1. 用 `openssl s_client -brief` 对比三个站点：`fanquanpp.github.io`、一个国内大厂站点、
   一个你自己的服务，记录协议版本、套件、Temp Key 类型差异。
2. 给练习项目跑一遍 certbot，然后人为把证书路径改错，观察 Nginx 报错并恢复——
   故障演练比一次成功的部署记得牢。
3. 用 Python `ssl.create_default_context()` 写 20 行脚本抓取某 HTTPS API，然后故意
   加 `check_hostname=False`，思考脚本在什么场景下会被中间人利用。
4. 在 hstspreload.org 与 crt.sh 上分别查你的域名：HSTS 预加载状态、CT 日志里
   有哪些证书（是否都是你认识的签发者）。
5. 配置一条 `curl --tlsv1.2 --tls-max 1.2` 的对照测试，确认服务端确实拒绝旧协议。

## 下一步

- cybersecurity/080-DigitalCertificate：证书格式、证书链与 CA 体系的完整展开。
- cybersecurity/100-OpenSSLCert：openssl 命令行生成与自查证书的实操手册。
- cybersecurity/030-CryptographyApplication：本文反复出现的 ECDHE、HKDF、AEAD 的密码学底层。
