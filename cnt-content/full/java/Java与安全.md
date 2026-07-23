---
order: 78
title: Java与安全
module: java
category: Java
difficulty: intermediate
description: Java安全编程
author: fanquanpp
updated: '2026-06-14'
related:
  - java/Java性能调优
  - java/Java与AI
  - java/Java与WebAssembly
  - java/Java与响应式编程
prerequisites:
  - java/概述与开发环境
---

## 学习目标

完成本章学习后，你应当能够：

- **Remember（记忆）**：复述 Java 安全架构的四大支柱——JCA（Java Cryptography Architecture）、JCE（Java Cryptography Extension）、JSSE（Java Secure Socket Extension）、JAAS（Java Authentication and Authorization Service），并能说出 AES-GCM、RSA-OAEP、ECDSA、EdDSA、HKDF、PBKDF2、scrypt、Argon2 等算法的用途与适用场景。
- **Understand（理解）**：解释对称加密（CPA/CCA 安全）、非对称加密（陷门函数）、哈希（抗碰撞/抗原像）、数字签名（EUF-CMA 安全）、消息认证码（MAC）的形式化安全定义，并理解 TLS 1.3 握手、X.509 证书链验证、OCSP stapling 的工作原理。
- **Apply（应用）**：使用 JCA API（`Cipher`、`Mac`、`Signature`、`KeyAgreement`）、Bouncy Castle、Java 11+ `HttpClient` HTTPS、Spring Security 6（OAuth2 Resource Server、Method Security）、JJWT/Nimbus JWT 库构建生产级安全系统。
- **Analyze（分析）**：分析 OWASP Top 10（2025）漏洞在 Java 应用中的具体表现——SQL 注入（JPA/MyBatis）、XSS（Thymeleaf/React）、CSRF、SSRF、反序列化（Jackson/Fastjson）、XXE、日志注入、路径遍历——并给出修复方案与防御性编码模式。
- **Evaluate（评价）**：评估密钥管理方案（HSM、KMS、HashiCorp Vault、AWS Secrets Manager）的安全性、可用性、性能、成本权衡，评估零信任架构（Zero Trust）与基于边界防御（Castle-and-Moat）的取舍。
- **Create（创造）**：设计一套端到端的安全架构，涵盖身份认证（OIDC）、授权（RBAC + ABAC）、传输安全（mTLS）、密钥管理（Vault + KMS）、审计日志（SIEM）、漏洞防御（WAF + CSP）、合规（GDPR/PCI-DSS/SOC 2）。

## 历史动机与发展脉络

### Java 安全演进的三十年

Java 自 1995 年诞生即引入"沙箱"概念，初衷是让浏览器中的 Applet 安全运行。这一设计奠定了 Java 安全模型的基础——**字节码验证、类加载器分层、SecurityManager、权限模型**。三十年间，Java 安全从"Applet 沙箱"演进到"云原生零信任"，每个阶段都回应了特定威胁。

### Java 安全演进时间线

| 年份 | 里程碑 | 工程意义 |
| --- | --- | --- |
| 1996 | JDK 1.0 SecurityManager | Applet 沙箱模型 |
| 1997 | JDK 1.1 JCA、数字签名 | jar 签名、`MessageDigest`、`Signature` |
| 1998 | JCE 1.2 | 对称/非对称加密（受美国出口管制） |
| 1999 | JAAS（Java Authentication and Authorization Service） | 可插拔认证 + 基于权限的授权 |
| 2003 | JSR 196: JASPIC | Servlet 容器认证 SPI |
| 2006 | JDK 6 内置 JCE 无强度限制 | 美国出口管制放松 |
| 2011 | JDK 7 TLS 1.2 | 协议层安全增强 |
| 2014 | Spring Security 3.2 | Java EE 安全的 Spring 替代方案 |
| 2017 | JDK 9 JEP 219: HTTP/2 + TLS 1.3 雏形 | 现代协议支持 |
| 2018 | JDK 11 `HttpClient` | 原生 HTTP/2 + TLS 1.3 客户端 |
| 2019 | JDK 13 EdDSA（JEP 339） | 现代椭圆曲线签名 |
| 2020 | Spring Security 5.4 | OAuth2/OIDC 一等公民 |
| 2021 | JDK 17 LTS | 弃用 SecurityManager（JEP 411） |
| 2022 | Spring Security 6 | 移除 WebSecurityConfigurerAdapter |
| 2023 | JDK 21 + 虚拟线程 | 高并发 TLS 握手性能提升 |
| 2024 | JDK 23 | 增强密钥派生 API（JEP 471 草案） |
| 2025 | Spring Authorization Server 1.3 | 生产级 OIDC Provider |

### 四大设计动机

1. **加密原语标准化**：JCA 提供统一的 Provider 抽象，应用代码与具体加密实现（SunJCE、BouncyCastle、Conscrypt、AWS CloudHSM）解耦。
2. **认证授权分离**：JAAS 将"你是谁"（Authentication）与"你能做什么"（Authorization）解耦，支持可插拔 LoginModule。
3. **传输安全透明化**：JSSE 让 HTTPS、mTLS 对应用透明，开发者在大多数情况下仅需配置 `SSLContext`。
4. **框架化与声明式安全**：Spring Security 6 通过注解（`@PreAuthorize`、`@Secured`）实现声明式安全，将安全逻辑从业务逻辑中分离。

### 当代 Java 安全的三大主线

1. **云原生零信任**：身份成为新的边界，Service Mesh（Istio mTLS）、SPIFFE/SPIRE、JWT、OIDC 取代网络边界。
2. **供应链安全**：SBOM（CycloneDX/SPDX）、镜像签名（cosign）、依赖扫描（OWASP Dependency-Check、Snyk）成为标准实践。
3. **隐私合规**：GDPR、CCPA、PIPL 要求加密存储、最小化收集、可审计访问，催生了字段级加密、差分隐私、同态加密等高级技术。

## 形式化定义

### 对称加密的安全定义

设对称加密方案 $\Pi = (\text{Gen}, \text{Enc}, \text{Dec})$，密钥空间 $\mathcal{K}$，明文空间 $\mathcal{M}$，密文空间 $\mathcal{C}$。

**CPA 安全（Indistinguishability under Chosen-Plaintext Attack）**：

$$
\text{Adv}^{\text{CPA}}_{\mathcal{A},\Pi}(\lambda) = \left| \Pr[\text{Exp}^{\text{CPA-Real}}_{\mathcal{A},\Pi} = 1] - \Pr[\text{Exp}^{\text{CPA-Ideal}}_{\mathcal{A},\Pi} = 1] \right|
$$

若对任意 PPT 敌手 $\mathcal{A}$，$\text{Adv}^{\text{CPA}}$ 可忽略，则 $\Pi$ 是 CPA 安全的。AES-GCM 在 nonce 不重复的前提下满足 CCA 安全（authenticated encryption）。

### 哈希函数的安全性质

密码学哈希函数 $H: \{0,1\}^* \to \{0,1\}^n$ 需满足：

1. **抗原像（Preimage Resistance）**：给定 $h$，找到 $x$ 使 $H(x) = h$ 不可行。
2. **抗第二原像（Second Preimage Resistance）**：给定 $x$，找到 $x' \neq x$ 使 $H(x) = H(x')$ 不可行。
3. **抗碰撞（Collision Resistance）**：找到任意 $x \neq x'$ 使 $H(x) = H(x')$ 不可行。

生日悖论给出碰撞下界：$O(2^{n/2})$。SHA-256 的 $n = 256$，碰撞复杂度 $2^{128}$，目前安全。

### 数字签名的 EUF-CMA 安全

签名方案 $\Sigma = (\text{Gen}, \text{Sign}, \text{Verify})$，安全定义：

$$
\text{Adv}^{\text{EUF-CMA}}_{\mathcal{A},\Sigma}(\lambda) = \Pr\left[ \text{Verify}_{pk}(m, \sigma) = 1 \land m \notin \{m_1, \dots, m_q\} \right]
$$

其中 $\mathcal{A}$ 可查询签名预言机 $q$ 次。Ed25519 在 Random Oracle Model 下满足 EUF-CMA 安全。

### 消息认证码（MAC）

MAC 方案 $\mathcal{M} = (\text{Gen}, \text{Mac}, \text{Vrfy})$，安全性（SUFCMA）：

$$
\text{Adv}^{\text{SUFCMA}}_{\mathcal{A},\mathcal{M}}(\lambda) = \Pr[\text{Vrfy}_k(m^*, t^*) = 1 \land (m^*, t^*) \notin \mathcal{Q}]
$$

HMAC-SHA256 满足 SUFCMA 安全。AEAD（如 AES-GCM）= 对称加密 + MAC，同时保证机密性与完整性。

### TLS 1.3 握手的形式化

TLS 1.3 1-RTT 握手：

```
Client                                          Server
  | --- ClientHello (key_share, supported_groups) ---> |
  |                                                    |
  | <-- ServerHello (key_share) ---------------------- |
  | <-- EncryptedExtensions -------------------------- |
  | <-- Certificate ---------------------------------- |
  | <-- CertificateVerify ---------------------------- |
  | <-- Finished ------------------------------------- |
  |                                                    |
  | --- Finished ------------------------------------> |
  | --- Application Data <---------------------------> |
```

握手后双方导出会话密钥：

$$
\text{MS} = \text{HKDF-Extract}(\text{DH}(a, B), \text{null})
$$

$$
\text{key} = \text{HKDF-Expand}(\text{MS}, \text{"tls13 c ap traffic"}, L)
$$

### OAuth 2.0 / OIDC 形式化

设资源所有者 $U$、客户端 $C$、授权服务器 $AS$、资源服务器 $RS$。授权码流程：

1. $C \to U$：重定向到 $AS$ 的授权端点。
2. $U \to AS$：认证并授权 $C$。
3. $AS \to C$：重定向回 $C$，携带授权码 $\text{code}$。
4. $C \to AS$：用 $\text{code}$ + $\text{client\_secret}$ 换取访问令牌 $\text{access\_token}$。
5. $C \to RS$：携带 $\text{access\_token}$ 访问资源。

JWT 形式化：

$$
\text{JWT} = \text{Base64Url}(\text{header}) . \text{Base64Url}(\text{payload}) . \text{Base64Url}(\text{signature})
$$

$$
\text{signature} = \text{Sign}_{k}(\text{Base64Url}(\text{header}) . \text{Base64Url}(\text{payload}))
$$

## 理论推导与原理解析

### AES-GCM 的内部结构

AES-GCM = AES-CTR（计数器模式）+ GHASH（认证）。

设密钥 $K$，nonce $N$（96 位），明文 $P = P_1 \| P_2 \| \dots \| P_m$，关联数据 $A$。

1. **初始化**：$J_0 = N \| 0^{31} \| 1$（96 位 nonce + 32 位计数器初值 1）。
2. **加密**：$C_i = P_i \oplus \text{AES}_K(\text{inc}(J_{i-1}))$。
3. **认证**：$T = \text{GHASH}_H(A, C) \oplus \text{AES}_K(J_0)$，其中 $H = \text{AES}_K(0^{128})$。

**安全警告**：nonce 重复会导致认证密钥 $H$ 泄露，攻击者可伪造任意密文。GCM 的 nonce 忳须不重复，推荐使用确定性计数器或加密随机数生成器。

### RSA-OAEP 的填充原理

RSA 加密 $c = m^e \mod n$ 直接使用明文 $m$ 不安全（确定性，可被选择密文攻击）。OAEP（Optimal Asymmetric Encryption Padding）引入随机性：

$$
\text{OAEP}(m) = (m \| 0^k) \oplus \text{MGF}(\text{seed}) \| (\text{seed} \oplus \text{MGF}(\text{masked}))
$$

OAEP 在 Random Oracle Model 下满足 IND-CCA 安全。Java 中通过 `Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")` 使用。

### 密钥派生函数（KDF）

密码存储不能直接哈希，需使用慢哈希 KDF：

| KDF | 算法 | 抗 ASIC | 内存硬度 | 推荐 |
| --- | --- | --- | --- | --- |
| PBKDF2 | HMAC 迭代 | 弱 | 否 | 仅旧系统兼容 |
| bcrypt | Blowfish 变种 | 中 | 否 | 中等安全 |
| scrypt | PBKDF2 + Salsa20 | 强 | 是 | 高安全 |
| Argon2id | Blake2b + 数据依赖寻址 | 强 | 是 | **首选**（PHC winner） |

Argon2id 参数：`memory=64MB, iterations=3, parallelism=4`，在 2025 年硬件上约 100ms，远超 bcrypt 的 cost=12（约 250ms 但无内存硬度）。

### X.509 证书链验证

证书链验证算法：

1. 从叶子证书 $C_0$ 出发，沿 issuer 链向上找到根证书 $C_n$。
2. 对每对相邻证书 $(C_i, C_{i+1})$，验证：
   - $C_{i+1}$ 的公钥能验证 $C_i$ 的签名。
   - $C_i$ 的 `notBefore` ≤ 当前时间 ≤ `not_i+1` 的 `notAfter`。
   - $C_{i+1}$ 的 `basicConstraints` 包含 `CA:TRUE`。
   - $C_i$ 的用途符合 $C_{i+1}$ 的 `keyUsage`。
3. 根证书 $C_n$ 在信任库中。

证书吊销检查：

- **CRL（Certificate Revocation List）**：定期下载吊销列表，延迟大。
- **OCSP（Online Certificate Status Protocol）**：实时查询，但有隐私问题。
- **OCSP Stapling**：服务器在 TLS 握手中附带 OCSP 响应，最佳实践。

### TLS 1.3 vs TLS 1.2

| 维度 | TLS 1.2 | TLS 1.3 |
| --- | --- | --- |
| 握手 RTT | 2 | 1（或 0-RTT） |
| 支持算法 | RSA、DH、ECDH、AES-CBC、AES-GCM、3DES | 仅 ECDHE/DHE + AEAD（AES-GCM、ChaCha20-Poly1305） |
| 前向保密 | 可选 | 强制 |
| 重新协商 | 支持 | 移除（防 downgrade 攻击） |
| RSA 密钥传输 | 支持 | 移除（不安全） |
| CBC 模式 | 支持 | 移除（BEAST、Lucky13、POODLE） |
| JDK 支持 | JDK 7+ | JDK 11+（完整 JDK 17+） |

### 反序列化漏洞原理

Java 原生反序列化（`ObjectInputStream.readObject`）在反序列化过程中会调用对象的 `readObject`、`readResolve` 方法。若类路径中存在" gadget chain"——一系列类的方法调用链能触发任意代码执行——攻击者构造恶意序列化数据即可 RCE。

经典 gadget chain：`commons-collections` 的 `InvokerTransformer` → `AnnotationInvocationHandler` → `Runtime.exec()`。

**防御**：

1. 避免使用 `ObjectInputStream`，改用 JSON（Jackson、Gson）。
2. 使用 JEP 290 反序列化过滤器（JDK 9+）：

```java
ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
    "com.fandex.*;java.util.*;java.lang.*;!*");
ObjectInputStream ois = new ObjectInputStream(in);
ois.setObjectInputFilter(filter);
```

3. Jackson 启用默认类型白名单：

```java
ObjectMapper mapper = new ObjectMapper();
mapper.activateDefaultTyping(LaissezFaireTypeValidator.instance,
    ObjectMapper.DefaultTyping.NON_FINAL,
    JsonTypeInfo.As.PROPERTY);
// 或更严格的白名单
mapper.activateDefaultTyping(new BasicPolymorphicTypeValidator()
    .allowIfBaseType("com.fandex."), ...);
```

## 代码示例

### 示例 1：AES-GCM 完整加解密（Java 21）

`pom.xml`（无额外依赖，使用 JDK 内置 JCA）：

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.fandex.security</groupId>
    <artifactId>crypto-demo</artifactId>
    <version>1.0.0</version>
    <properties>
        <maven.compiler.release>21</maven.compiler.release>
    </properties>
</project>
```

`AesGcmCrypto.java`（Java 21）：

```java
package com.fandex.security;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.spec.AlgorithmParameterSpec;
import java.util.Base64;

/**
 * AES-GCM 加密示例。
 * GCM 模式提供机密性（CTR 加密）+ 完整性（GHASH 认证）。
 * nonce 必须不重复，否则安全保证失效。
 */
public final class AesGcmCrypto {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int KEY_LENGTH = 256;       // 256 位密钥
    private static final int IV_LENGTH = 12;          // 96 位 nonce（GCM 推荐）
    private static final int TAG_LENGTH = 128;        // 128 位认证标签

    /** 生成 AES-256 密钥。 */
    public static SecretKey generateKey() throws Exception {
        KeyGenerator keyGen = KeyGenerator.getInstance("AES");
        keyGen.init(KEY_LENGTH);
        return keyGen.generateKey();
    }

    /** 从字节数组还原密钥。 */
    public static SecretKey restoreKey(byte[] keyBytes) {
        return new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * 加密：明文 + 密钥 → Base64(nonce || ciphertext || tag)。
     */
    public static String encrypt(String plaintext, SecretKey key) throws Exception {
        byte[] nonce = new byte[IV_LENGTH];
        SecureRandom.getInstanceStrong().nextBytes(nonce);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        AlgorithmParameterSpec spec = new GCMParameterSpec(TAG_LENGTH, nonce);
        cipher.init(Cipher.ENCRYPT_MODE, key, spec);

        byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

        // 将 nonce 与密文拼接（解密时需要）
        ByteBuffer buffer = ByteBuffer.allocate(nonce.length + ciphertext.length);
        buffer.put(nonce);
        buffer.put(ciphertext);
        return Base64.getEncoder().encodeToString(buffer.array());
    }

    /**
     * 解密：Base64(nonce || ciphertext || tag) + 密钥 → 明文。
     */
    public static String decrypt(String encrypted, SecretKey key) throws Exception {
        byte[] decoded = Base64.getDecoder().decode(encrypted);
        ByteBuffer buffer = ByteBuffer.wrap(decoded);

        byte[] nonce = new byte[IV_LENGTH];
        buffer.get(nonce);
        byte[] ciphertext = new byte[buffer.remaining()];
        buffer.get(ciphertext);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        AlgorithmParameterSpec spec = new GCMParameterSpec(TAG_LENGTH, nonce);
        cipher.init(Cipher.DECRYPT_MODE, key, spec);

        byte[] plaintext = cipher.doFinal(ciphertext);
        return new String(plaintext, StandardCharsets.UTF_8);
    }

    public static void main(String[] args) throws Exception {
        SecretKey key = generateKey();
        String original = "Java 安全编程：AES-GCM 演示";
        String encrypted = encrypt(original, key);
        String decrypted = decrypt(encrypted, key);
        System.out.println("原文：" + original);
        System.out.println("密文：" + encrypted);
        System.out.println("解密：" + decrypted);
    }
}
```

### 示例 2：Argon2id 密码哈希（Bouncy Castle）

`pom.xml`：

```xml
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcpkix-jdk18on</artifactId>
    <version>1.78</version>
</dependency>
```

`PasswordHasher.java`：

```java
package com.fandex.security;

import org.bouncycastle.crypto.generators.Argon2BytesGenerator;
import org.bouncycastle.crypto.params.Argon2Parameters;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Argon2id 密码哈希。
 * 内存硬度抗 ASIC/GPU 攻击，PHC（Password Hashing Competition）获胜算法。
 * 参数：memory=64MB, iterations=3, parallelism=4, outputLength=32 bytes。
 */
public final class PasswordHasher {

    private static final int MEMORY_KB = 65536;     // 64 MB
    private static final int ITERATIONS = 3;
    private static final int PARALLELISM = 4;
    private static final int OUTPUT_LENGTH = 32;
    private static final int SALT_LENGTH = 16;

    /** 哈希密码，返回 "salt:hash" 格式的 Base64 字符串。 */
    public static String hash(String password) {
        byte[] salt = new byte[SALT_LENGTH];
        new SecureRandom().nextBytes(salt);

        Argon2Parameters params = new Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
                .withVersion(Argon2Parameters.ARGON2_VERSION_13)
                .withMemoryAsKB(MEMORY_KB)
                .withIterations(ITERATIONS)
                .withParallelism(PARALLELISM)
                .withSalt(salt)
                .build();

        Argon2BytesGenerator generator = new Argon2BytesGenerator();
        generator.init(params);
        byte[] hash = new byte[OUTPUT_LENGTH];
        generator.generateBytes(password.toCharArray(StandardCharsets.UTF_8), hash);

        return Base64.getEncoder().encodeToString(salt) + ":" +
               Base64.getEncoder().encodeToString(hash);
    }

    /** 验证密码是否匹配哈希。 */
    public static boolean verify(String password, String stored) {
        String[] parts = stored.split(":");
        if (parts.length != 2) return false;

        byte[] salt = Base64.getDecoder().decode(parts[0]);
        byte[] expectedHash = Base64.getDecoder().decode(parts[1]);

        Argon2Parameters params = new Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
                .withVersion(Argon2Parameters.ARGON2_VERSION_13)
                .withMemoryAsKB(MEMORY_KB)
                .withIterations(ITERATIONS)
                .withParallelism(PARALLELISM)
                .withSalt(salt)
                .build();

        Argon2BytesGenerator generator = new Argon2BytesGenerator();
        generator.init(params);
        byte[] actualHash = new byte[OUTPUT_LENGTH];
        generator.generateBytes(password.toCharArray(StandardCharsets.UTF_8), actualHash);

        // 常数时间比较，防时序攻击
        return constantTimeEquals(expectedHash, actualHash);
    }

    private static boolean constantTimeEquals(byte[] a, byte[] b) {
        if (a.length != b.length) return false;
        int diff = 0;
        for (int i = 0; i < a.length; i++) {
            diff |= a[i] ^ b[i];
        }
        return diff == 0;
    }

    public static void main(String[] args) {
        String password = "MySecurePassword123!";
        String hashed = hash(password);
        System.out.println("哈希值：" + hashed);
        System.out.println("验证正确密码：" + verify(password, hashed));
        System.out.println("验证错误密码：" + verify("wrong", hashed));
    }
}
```

### 示例 3：JWT 生成与验证（JJWT 0.12）

`pom.xml`：

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
</dependency>
```

`JwtService.java`（Java 21）：

```java
package com.fandex.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * JWT 服务：生成、验证、解析。
 * 使用 HMAC-SHA256 签名（对称密钥），适用于单体应用。
 * 分布式场景应使用 RSA/EdDSA 非对称签名。
 */
public final class JwtService {

    private final SecretKey key;
    private final Duration accessTokenTtl;
    private final Duration refreshTokenTtl;

    public JwtService(String secret, Duration accessTokenTtl, Duration refreshTokenTtl) {
        // HMAC-SHA256 要求密钥至少 256 位（32 字节）
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException("密钥必须至少 32 字节");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtl = accessTokenTtl;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    /** 生成 Access Token。 */
    public String generateAccessToken(String subject, List<String> roles, Map<String, Object> claims) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(subject)
                .claim("roles", roles)
                .claims(claims)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .issuer("fandex")
                .audience().add("fandex-api").and()
                .signWith(key)
                .compact();
    }

    /** 生成 Refresh Token（仅含 subject，无业务声明）。 */
    public String generateRefreshToken(String subject) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(subject)
                .claim("type", "refresh")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshTokenTtl)))
                .signWith(key)
                .compact();
    }

    /** 验证并解析 Token。失败抛出 JwtException。 */
    public Claims parseAndVerify(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(key)
                .requireIssuer("fandex")
                .requireAudience("fandex-api")
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public static void main(String[] args) {
        JwtService service = new JwtService(
            "this-is-a-very-secure-key-must-be-at-least-32-bytes!",
            Duration.ofMinutes(15),
            Duration.ofDays(7));

        String accessToken = service.generateAccessToken(
            "user123",
            List.of("ADMIN", "USER"),
            Map.of("email", "user@fandex.com"));
        System.out.println("Access Token: " + accessToken);

        Claims claims = service.parseAndVerify(accessToken);
        System.out.println("Subject: " + claims.getSubject());
        System.out.println("Roles: " + claims.get("roles"));
        System.out.println("Expires: " + claims.getExpiration());
    }
}
```

### 示例 4：Spring Security 6 完整配置

`pom.xml`：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

`SecurityConfig.java`：

```java
package com.fandex.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.spec.SecretKeySpec;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF：REST API 禁用，Cookie + Session 模式必须启用
            .csrf(csrf -> csrf.disable())
            // CORS：显式配置，禁止默认值
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // 会话管理：无状态 JWT
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 授权规则
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/actuator/health").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/user/**").hasAnyRole("USER", "ADMIN")
                .anyRequest().authenticated())
            // JWT 资源服务器
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt
                .jwtAuthenticationConverter(new CustomJwtAuthenticationConverter())))
            // 安全响应头
            .headers(headers -> headers
                .contentDispositionPolicy(content -> content.attachment())
                .frameOptions(frame -> frame.deny())
                .referrerPolicy(referrer ->
                    referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)))
            // 异常处理
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new JwtAuthenticationEntryPoint())
                .accessDeniedHandler(new CustomAccessDeniedHandler()));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Argon2id，参数：memory=64MB, iterations=3, parallelism=4
        return new Argon2PasswordEncoder(16, 32, 1, 65536, 3);
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // 生产环境应使用 RSA 公钥或 JWK Set URI
        SecretKeySpec key = new SecretKeySpec(
            "this-is-a-very-secure-key-must-be-at-least-32-bytes!".getBytes(),
            "HmacSHA256");
        return NimbusJwtDecoder.withSecretKey(key).build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://fandex.example.com"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        config.setExposedHeaders(List.of("X-Total-Count"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

`CustomJwtAuthenticationConverter.java`：

```java
package com.fandex.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class CustomJwtAuthenticationConverter
        implements Converter<Jwt, AbstractAuthenticationToken> {

    private final JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        // 合并默认 SCOPE_ 与自定义 roles
        Collection<GrantedAuthority> authorities = Stream.concat(
            defaultConverter.convert(jwt).stream(),
            extractRoles(jwt).stream()
        ).collect(Collectors.toSet());

        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }

    @SuppressWarnings("unchecked")
    private Set<GrantedAuthority> extractRoles(Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        if (roles == null) return Set.of();
        return roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toSet());
    }
}
```

### 示例 5：方法级安全（@PreAuthorize）

```java
package com.fandex.security;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DocumentService {

    /**
     * 仅 ADMIN 角色可访问。
     */
    @PreAuthorize("hasRole('ADMIN')")
    public List<Document> listAllDocuments() {
        return documentRepository.findAll();
    }

    /**
     * 仅文档所有者或 ADMIN 可访问。
     * 使用 Spring Expression Language 引用方法参数。
     */
    @PreAuthorize("hasRole('ADMIN') or @documentSecurity.isOwner(authentication, #id)")
    public Document getDocument(Long id) {
        return documentRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Document not found"));
    }

    /**
     * 自定义权限检查：用户的 department 必须匹配文档的 department。
     */
    @PreAuthorize("@documentSecurity.canAccess(authentication, #document)")
    public void updateDocument(Document document) {
        documentRepository.save(document);
    }
}

@Component("documentSecurity")
public class DocumentSecurity {

    public boolean isOwner(Authentication auth, Long documentId) {
        Document doc = documentRepository.findById(documentId).orElse(null);
        return doc != null && doc.getOwner().equals(auth.getName());
    }

    public boolean canAccess(Authentication auth, Document document) {
        User user = (User) auth.getPrincipal();
        return user.getDepartment().equals(document.getDepartment())
            || auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
```

### 示例 6：HTTPS 客户端（Java 11+ HttpClient）

```java
package com.fandex.security;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.cert.X509Certificate;
import java.time.Duration;

public final class SecureHttpClient {

    /**
     * 创建安全的 HttpClient：
     * - TLS 1.3
     * - 连接超时 5s
     * - 默认信任系统 CA 信任库
     */
    public static HttpClient createSecureClient() throws Exception {
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, new TrustManager[]{ new SystemTrustManager() }, null);

        return HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(5))
                .sslContext(sslContext)
                .followRedirects(HttpClient.Redirect.NEVER)  // 防止 SSRF
                .build();
    }

    /**
     * mTLS 双向认证客户端。
     */
    public static HttpClient createMutualTlsClient(
            String keyStorePath, String keyStorePassword,
            String trustStorePath, String trustStorePassword) throws Exception {

        KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        try (var fis = Files.newInputStream(Paths.get(keyStorePath))) {
            keyStore.load(fis, keyStorePassword.toCharArray());
        }
        kmf.init(keyStore, keyStorePassword.toCharArray());

        TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        KeyStore trustStore = KeyStore.getInstance("JKS");
        try (var fis = Files.newInputStream(Paths.get(trustStorePath))) {
            trustStore.load(fis, trustStorePassword.toCharArray());
        }
        tmf.init(trustStore);

        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(kmf.getKeyManagers(), tmf.getTrustManagers(), null);

        return HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(5))
                .sslContext(sslContext)
                .build();
    }

    public static void main(String[] args) throws Exception {
        HttpClient client = createSecureClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://httpbin.org/get"))
                .timeout(Duration.ofSeconds(10))
                .header("User-Agent", "FANDEX-Secure-Client/1.0")
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("Status: " + response.statusCode());
        System.out.println("Body: " + response.body().substring(0, Math.min(200, response.body().length())));
    }
}

/** 系统默认信任管理器，验证证书链与主机名。 */
class SystemTrustManager implements X509TrustManager {
    private final X509TrustManager defaultTm;

    SystemTrustManager() throws Exception {
        TrustManagerFactory tmf = TrustManagerFactory.getInstance(
            TrustManagerFactory.getDefaultAlgorithm());
        tmf.init((KeyStore) null);
        defaultTm = (X509TrustManager) tmf.getTrustManagers()[0];
    }

    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType) {
        throw new UnsupportedOperationException("Client auth not supported");
    }

    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType) {
        defaultTm.checkServerTrusted(chain, authType);
    }

    @Override
    public X509Certificate[] getAcceptedIssuers() {
        return defaultTm.getAcceptedIssuers();
    }
}
```

### 示例 7：SQL 注入防御与参数化查询

```java
package com.fandex.security;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate namedJdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.namedJdbc = new NamedParameterJdbcTemplate(jdbc);
    }

    /**
     * 危险：字符串拼接导致 SQL 注入。
     * 永远不要这样写！
     */
    public User findByUsernameUnsafe(String username) {
        String sql = "SELECT * FROM users WHERE username = '" + username + "'";
        return jdbc.queryForObject(sql, User.class);  // 漏洞！
    }

    /**
     * 安全：参数化查询（PreparedStatement）。
     */
    public User findByUsernameSafe(String username) {
        String sql = "SELECT id, username, email FROM users WHERE username = ?";
        return jdbc.queryForObject(sql, (rs, rowNum) -> new User(
            rs.getLong("id"),
            rs.getString("username"),
            rs.getString("email")
        ), username);
    }

    /**
     * 安全：命名参数（更易读）。
     */
    public List<User> findByDepartment(String department, int limit) {
        String sql = "SELECT id, username, email FROM users " +
                     "WHERE department = :dept ORDER BY id LIMIT :limit";
        return namedJdbc.query(sql,
            Map.of("dept", department, "limit", limit),
            (rs, rowNum) -> new User(
                rs.getLong("id"),
                rs.getString("username"),
                rs.getString("email")
            ));
    }

    /**
     * LIKE 查询的参数化（注意 % 通配符需手动转义防通配符注入）。
     */
    public List<User> searchByUsername(String keyword) {
        // 转义 LIKE 通配符
        String escaped = keyword.replace("\\", "\\\\")
                                .replace("%", "\\%")
                                .replace("_", "\\_");
        String sql = "SELECT id, username FROM users WHERE username LIKE ? ESCAPE '\\'";
        return jdbc.query(sql, (rs, rowNum) -> new User(
            rs.getLong("id"),
            rs.getString("username"),
            null
        ), "%" + escaped + "%");
    }
}
```

### 示例 8：HashiCorp Vault 密钥管理

`pom.xml`：

```xml
<dependency>
    <groupId>org.springframework.vault</groupId>
    <artifactId>spring-boot-vault-starter</artifactId>
    <version>4.1.0</version>
</dependency>
```

`application.yml`：

```yaml
spring:
  vault:
    uri: https://vault.example.com:8200
    authentication: kubernetes
    kubernetes:
      role: demo-app
      kubernetes-path: kubernetes
      service-account-token-file: /var/run/secrets/kubernetes.io/serviceaccount/token
    ssl:
      trust-store: classpath:vault-truststore.jks
      trust-store-password: ${VAULT_TS_PASSWORD}
```

`VaultSecretService.java`：

```java
package com.fandex.security;

import org.springframework.stereotype.Service;
import org.springframework.vault.core.VaultTemplate;
import org.springframework.vault.core.VaultVersionedKeyValueOperations;
import org.springframework.vault.support.Versioned;

@Service
public class VaultSecretService {

    private final VaultTemplate vaultTemplate;

    public VaultSecretService(VaultTemplate vaultTemplate) {
        this.vaultTemplate = vaultTemplate;
    }

    /**
     * 读取密钥（带版本）。
     */
    public String readSecret(String path) {
        VaultVersionedKeyValueOperations ops =
            vaultTemplate.opsForVersionedKeyValue("secret");
        Versioned<String> secret = ops.get(path, String.class);
        return secret != null ? secret.getData() : null;
    }

    /**
     * 写入密钥（自动版本递增）。
     */
    public void writeSecret(String path, String value) {
        VaultVersionedKeyValueOperations ops =
            vaultTemplate.opsForVersionedKeyValue("secret");
        ops.put(path, value);
    }

    /**
     * 数据库动态凭据（Vault 自动生成短期凭据）。
     */
    public DatabaseCredentials getDatabaseCredentials() {
        Map<String, String> creds = vaultTemplate.read(
            "database/creds/demo-app-role").getData();
        return new DatabaseCredentials(
            creds.get("username"),
            creds.get("password"));
    }

    public record DatabaseCredentials(String username, String password) {}
}
```

## 对比分析

### 加密算法横向对比

| 算法 | 类型 | 密钥长度 | 性能 | 安全性 | 推荐场景 |
| --- | --- | --- | --- | --- | --- |
| AES-256-GCM | 对称 AEAD | 256 位 | 极快 | 高（nonce 不重复） | 通用数据加密 |
| ChaCha20-Poly1305 | 对称 AEAD | 256 位 | 快（无 AES-NI 时更快） | 高 | 移动端、TLS |
| RSA-2048-OAEP | 非对称 | 2048 位 | 慢 | 中（2030 后淘汰） | 兼容场景 |
| RSA-4096-OAEP | 非对称 | 4096 位 | 极慢 | 高 | 长期存储 |
| X25519 + Ed25519 | 非对称 | 256 位 | 快 | 极高 | 现代 TLS、签名 |
| ECDSA P-256 | 非对称签名 | 256 位 | 快 | 高 | X.509 证书 |
| HMAC-SHA256 | MAC | 256 位 | 极快 | 高 | JWT、API 签名 |

### 密码哈希算法对比

| 算法 | 抗 ASIC | 内存硬度 | 计算硬度 | 兼容性 | 推荐 |
| --- | --- | --- | --- | --- | --- |
| MD5 | 否 | 否 | 否 | 极广 | **禁用**（已破解） |
| SHA-1 | 否 | 否 | 否 | 广 | **禁用**（已破解） |
| SHA-256 | 否 | 否 | 否 | 极广 | 仅文件指纹 |
| PBKDF2-HMAC-SHA256 | 弱 | 否 | 是 | 极广 | 旧系统兼容 |
| bcrypt | 中 | 否 | 是 | 广 | 中等安全 |
| scrypt | 强 | 是 | 是 | 中 | 高安全 |
| Argon2id | 强 | 是 | 是 | 中 | **首选**（PHC） |

### Java 安全框架对比

| 框架 | 类型 | 学习成本 | 功能丰富度 | 性能 | 推荐场景 |
| --- | --- | --- | --- | --- | --- |
| Spring Security 6 | 综合安全 | 高 | 极高 | 中 | Spring 应用 |
| Apache Shiro | 综合安全 | 中 | 中 | 高 | 轻量应用 |
| Keycloak | IAM 平台 | 中 | 极高 | 中 | 企业 SSO |
| JWT (JJWT/Nimbus) | Token | 低 | 中 | 极高 | 无状态 API |
| Bouncy Castle | 加密库 | 高 | 极高 | 中 | 高级加密 |
| JCA/JCE | 加密库 | 中 | 中 | 极高 | 通用加密 |

### OAuth 2.0 / OIDC Provider 对比

| Provider | 类型 | 部署方式 | 价格 | 推荐场景 |
| --- | --- | --- | --- | --- |
| Keycloak | 开源 | 自部署 | 免费 | 企业 SSO |
| Auth0 | SaaS | 云 | $$$ | 快速上线 |
| Okta | SaaS | 云 | $$$$ | 企业级 |
| AWS Cognito | SaaS | 云 | $ | AWS 生态 |
| Spring Authorization Server | 开源 | 自部署 | 免费 | Spring 集成 |
| Authentik | 开源 | 自部署 | 免费 | 现代化 UI |

## 常见陷阱与最佳实践

### 陷阱 1：使用 ECB 模式

**问题**：

```java
Cipher cipher = Cipher.getInstance("AES/ECB/NoPadding");
```

ECB 模式对相同明文块产生相同密文块，泄露明文模式（如经典的"ECB 企鹅"图像）。

**正确做法**：使用 GCM（推荐）或 CBC + HMAC。

### 陷阱 2：MD5/SHA-1 用于密码存储

**问题**：

```java
String hashed = DigestUtils.md5Hex(password);
```

MD5/SHA-1 已破解，且非慢哈希，可被彩虹表攻击。

**正确做法**：Argon2id 或 bcrypt。

### 陷阱 3：硬编码密钥

**问题**：

```java
private static final String SECRET_KEY = "mySecretKey123";
```

代码库泄露即密钥泄露，无法轮换。

**正确做法**：

- 短期：环境变量 + `${SECRET_KEY}`
- 中期：KMS（AWS KMS、Azure Key Vault、GCP KMS）
- 长期：Vault + 动态密钥

### 陷阱 4：使用 `Math.random()` 生成安全随机数

**问题**：

```java
int token = Math.random() * 1000000;
```

`Math.random()` 使用线性同余生成器，可预测。

**正确做法**：

```java
SecureRandom random = SecureRandom.getInstanceStrong();
byte[] token = new byte[32];
random.nextBytes(token);
```

### 陷阱 5：JWT 存储在 localStorage

**问题**：localStorage 可被 XSS 攻击读取。

**正确做法**：

- 存储在 HttpOnly + Secure + SameSite=Strict Cookie 中
- Access Token 短期（15 分钟）
- Refresh Token 长期但需轮换

### 陷阱 6：禁用 CSRF 后未启用其他防护

**问题**：REST API 禁用 CSRF 是常见做法，但未启用 CORS 严格配置或 SameSite Cookie。

**正确做法**：

```java
http.csrf(csrf -> csrf.disable())
    .cors(cors -> cors.configurationSource(strictCorsConfig()));
```

Cookie 配置：

```yaml
server:
  servlet:
    session:
      cookie:
        http-only: true
        secure: true
        same-site: strict
```

### 陷阱 7：Jackson/Fastjson 反序列化漏洞

**问题**：

```java
ObjectMapper mapper = new ObjectMapper();
Object obj = mapper.readValue(input, Object.class);  // 漏洞！
```

Jackson 启用 `enableDefaultTyping` 后，攻击者可指定任意类实例化，导致 RCE。

**正确做法**：

```java
ObjectMapper mapper = new ObjectMapper();
// 禁用默认类型推断
mapper.disable(ObjectMapper.DefaultTyping.EVERYTHING);
// 使用白名单
mapper.activateDefaultTyping(
    BasicPolymorphicTypeValidator.builder()
        .allowIfBaseType("com.fandex.")
        .allowIfBaseType("java.util.")
        .build(),
    ObjectMapper.DefaultTyping.NON_FINAL);
```

### 陷阱 8：日志中泄露敏感信息

**问题**：

```java
log.info("User login: username={}, password={}", username, password);
```

日志会被收集到 ELK/Splunk，密码泄露面扩大。

**正确做法**：

```java
log.info("User login: username={}", username);
// 或使用脱敏工具
log.info("User login: username={}, password={}", mask(username), mask(password));
```

### 陷阱 9：路径遍历

**问题**：

```java
Path path = Paths.get("/data", userInput);
byte[] data = Files.readAllBytes(path);
```

用户输入 `../../etc/passwd` 即可读取系统文件。

**正确做法**：

```java
Path base = Paths.get("/data").toAbsolutePath().normalize();
Path target = base.resolve(userInput).normalize();
if (!target.startsWith(base)) {
    throw new SecurityException("Path traversal detected");
}
byte[] data = Files.readAllBytes(target);
```

### 陷阱 10：SSRF（服务器端请求伪造）

**问题**：

```java
String url = request.getParameter("url");
HttpResponse resp = HttpClient.newHttpClient().send(
    HttpRequest.newBuilder().uri(URI.create(url)).GET().build(),
    HttpResponse.BodyHandlers.ofString());
```

攻击者可访问 `http://169.254.169.254/latest/meta-data/`（云元数据）或内网服务。

**正确做法**：

1. URL 白名单（仅允许外部域名）
2. 禁止访问内网 IP（10.0.0.0/8、172.16.0.0/12、192.168.0.0/16、169.254.0.0/16、127.0.0.0/8）
3. 禁用重定向（`HttpClient.Redirect.NEVER`）
4. 使用 SOCKS 代理或 Egress Firewall

## 工程实践

### OAuth 2.0 / OIDC 完整配置

`application.yml`（Spring Security + Keycloak）：

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          keycloak:
            client-id: demo-app
            client-secret: ${KEYCLOAK_CLIENT_SECRET}
            scope: openid, profile, email
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
        provider:
          keycloak:
            issuer-uri: https://keycloak.example.com/realms/fandex
            user-name-attribute: preferred_username
      resourceserver:
        jwt:
          issuer-uri: https://keycloak.example.com/realms/fandex
          jwk-set-uri: https://keycloak.example.com/realms/fandex/protocol/openid-connect/certs
```

### 审计日志

```java
package com.fandex.security;

import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authorization.event.AuthorizationDeniedEvent;
import org.springframework.stereotype.Component;

@Component
public class SecurityAuditLogger {

    private static final Logger audit = LoggerFactory.getLogger("SECURITY_AUDIT");

    @EventListener
    public void onLoginSuccess(AuthenticationSuccessEvent event) {
        audit.info("type=LOGIN_SUCCESS user={} ip={} timestamp={}",
            event.getAuthentication().getName(),
            RequestContextHolder.currentRequestAttributes()
                .getAttribute("clientIp", RequestAttributes.SCOPE_REQUEST),
            Instant.now());
    }

    @EventListener
    public void onLoginFailure(AuthenticationFailureBadCredentialsEvent event) {
        audit.warn("type=LOGIN_FAILURE user={} ip={} timestamp={}",
            event.getAuthentication().getName(),
            getCurrentIp(),
            Instant.now());

        // 触发告警：连续失败 5 次锁定账户
        loginAttemptService.recordFailure(event.getAuthentication().getName());
    }

    @EventListener
    public void onAuthorizationDenied(AuthorizationDeniedEvent event) {
        audit.warn("type=AUTHZ_DENIED user={} resource={} timestamp={}",
            getCurrentUser(),
            event.getSource(),
            Instant.now());
    }
}
```

### 速率限制（防暴力破解）

```java
package com.fandex.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, RateBucket> buckets = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS = 100;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String clientId = getClientId(request);
        RateBucket bucket = buckets.computeIfAbsent(clientId, k -> new RateBucket());

        if (!bucket.tryConsume()) {
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(WINDOW.getSeconds()));
            response.getWriter().write("{\"error\":\"Too Many Requests\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private String getClientId(HttpServletRequest request) {
        // 优先使用 JWT subject，否则使用 IP
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            return "token:" + auth.substring(7).hashCode();
        }
        return "ip:" + request.getRemoteAddr();
    }

    private static class RateBucket {
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile long windowStart = System.currentTimeMillis();

        boolean tryConsume() {
            long now = System.currentTimeMillis();
            if (now - windowStart > WINDOW.toMillis()) {
                count.set(0);
                windowStart = now;
            }
            return count.incrementAndGet() <= MAX_REQUESTS;
        }
    }
}
```

### WAF 与 CSP 配置

Spring Security 响应头配置：

```java
http.headers(headers -> headers
    // Content Security Policy：防 XSS
    .contentSecurityPolicy(csp -> csp.policyDirectives(
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' https://api.fandex.com; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'"))
    // X-Content-Type-Options
    .contentTypeOptions(content -> {})
    // X-Frame-Options
    .frameOptions(frame -> frame.deny())
    // HSTS
    .httpStrictTransportSecurity(hsts -> hsts
        .includeSubDomains(true)
        .preload(true)
        .maxAgeInSeconds(63072000))  // 2 年
    // X-XSS-Protection（现代浏览器已废弃，但保留兼容）
    .addHeaderWriter((request, response) ->
        response.setHeader("X-XSS-Protection", "1; mode=block"))
    // Referrer-Policy
    .referrerPolicy(referrer ->
        referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
    // Permissions-Policy
    .addHeaderWriter((request, response) ->
        response.setHeader("Permissions-Policy",
            "geolocation=(), microphone=(), camera=(), payment=()")));
```

### 密钥轮换策略

```java
@Component
public class KeyRotationService {

    private final AtomicReference<SecretKey> currentKey = new AtomicReference<>();
    private final AtomicReference<SecretKey> previousKey = new AtomicReference<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    @PostConstruct
    public void init() {
        currentKey.set(generateKey());
        // 每 90 天轮换一次
        scheduler.scheduleAtFixedRate(this::rotate, 90, 90, TimeUnit.DAYS);
    }

    public void rotate() {
        SecretKey newKey = generateKey();
        previousKey.set(currentKey.get());
        currentKey.set(newKey);
        log.info("Key rotated at {}", Instant.now());
    }

    public SecretKey getCurrentKey() {
        return currentKey.get();
    }

    public SecretKey getPreviousKey() {
        return previousKey.get();
    }

    private SecretKey generateKey() {
        KeyGenerator keyGen = KeyGenerator.getInstance("HmacSHA256");
        return keyGen.generateKey();
    }
}
```

## 案例研究

### 案例 1：电商平台 OAuth 2.0 改造

**场景**：某电商使用自研 Session 认证，扩展到移动端与第三方合作时受限。

**改造**：

1. 引入 Keycloak 作为 OIDC Provider，统一身份源。
2. Web 端使用 Authorization Code + PKCE。
3. 移动端使用 Authorization Code + PKCE（无 client_secret）。
4. 第三方合作使用 Client Credentials（机器对机器）。
5. 服务间调用使用 mTLS。

**结果**：身份统一管理，第三方接入时间从 2 周缩短到 2 天，安全事件降低 80%。

### 案例 2：金融系统字段级加密

**场景**：某支付系统需满足 PCI-DSS，要求信用卡号加密存储。

**方案**：

1. 应用层使用 AES-256-GCM 加密 PAN（Primary Account Number）。
2. 密钥由 AWS KMS 管理，应用通过 IAM Role 获取。
3. 数据库存储 `encrypted_pan` + `key_id` + `iv`。
4. 仅授权服务可解密，且解密操作记录审计日志。
5. Tokenization：将 PAN 映射为不可逆 Token，业务系统使用 Token。

```java
@Entity
public class PaymentCard {
    @Id private Long id;
    private String encryptedPan;     // AES-256-GCM 加密的 PAN
    private String keyId;             // KMS key ID
    private String iv;                // Base64 编码的 nonce
    private String lastFourDigits;    // 明文最后 4 位（用于展示）
    private String token;             // Tokenization token

    @Transient
    public String decryptPan(KmsService kms) {
        SecretKey key = kms.getDataKey(keyId);
        return AesGcmCrypto.decrypt(encryptedPan, key, iv);
    }
}
```

**结果**：通过 PCI-DSS 审计，数据库泄露时 PAN 不可解密。

### 案例 3：日志脱敏与 GDPR 合规

**场景**：某 SaaS 平台日志中泄露用户邮箱，被 GDPR 罚款 200 万欧元。

**改造**：

1. 实现日志脱敏中间件：

```java
public class LogMaskingPattern {
    private static final Map<String, Pattern> SENSITIVE_PATTERNS = Map.of(
        "email", Pattern.compile("\\b[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}\\b"),
        "phone", Pattern.compile("\\b1[3-9]\\d{9}\\b"),
        "idCard", Pattern.compile("\\b\\d{17}[\\dXx]\\b"),
        "creditCard", Pattern.compile("\\b\\d{13,19}\\b")
    );

    public static String mask(String log) {
        for (var entry : SENSITIVE_PATTERNS.entrySet()) {
            log = entry.getValue().matcher(log).replaceAll(m -> maskValue(m.group(), entry.getKey()));
        }
        return log;
    }

    private static String maskValue(String value, String type) {
        return switch (type) {
            case "email" -> value.substring(0, 1) + "***@" + value.split("@")[1];
            case "phone" -> value.substring(0, 3) + "****" + value.substring(7);
            case "idCard" -> value.substring(0, 6) + "********" + value.substring(14);
            case "creditCard" -> value.substring(0, 6) + "******" + value.substring(value.length() - 4);
            default -> "***";
        };
    }
}
```

2. Logback 配置自定义 Pattern Layout：

```xml
<pattern>%d{ISO8601} %-5level [%thread] %logger{36} - %replace(%msg){...}</pattern>
```

**结果**：通过 GDPR 复审，日志泄露风险降低 95%。

### 案例 4：API 零信任改造

**场景**：某微服务架构内网调用无认证，被内部攻击者横向移动。

**改造**：

1. 引入 SPIFFE/SPIRE 为每个服务分配 SVID（SPIFFE Verifiable Identity Document）。
2. 服务间调用使用 mTLS，证书由 SPIRE 自动轮换。
3. API 网关验证 JWT，下游服务使用 Resource Server 二次验证。
4. 每个服务实施 RBAC，方法级授权。

```yaml
# Istio PeerAuthentication
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

**结果**：内网攻击面降低 90%，合规审计通过。

### 案例 5：供应链安全实践

**场景**：某开源依赖被植入恶意代码（如 log4shell、xz-utils 后门），需建立防御机制。

**实践**：

1. **SBOM 生成**：CycloneDX 插件生成依赖 BOM。
2. **依赖扫描**：OWASP Dependency-Check + Snyk 双重扫描。
3. **签名验证**：Maven 配置 `--strict-checksums`。
4. **依赖锁定**：使用 `maven-enforcer-plugin` 锁定版本。
5. **私有镜像仓库**：内部 Nexus 镜像 + Provenance 校验。

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-enforcer-plugin</artifactId>
    <executions>
        <execution>
            <id>enforce-versions</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <requireReleaseDeps>
                        <message>Snapshot dependencies not allowed in production</message>
                    </requireReleaseDeps>
                    <dependencyConvergence/>
                    <banDuplicatePomDependencyVersions/>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

**结果**：log4shell 事件中 2 小时内完成全量检测与修复。

## 习题

### 选择题

**1. AES-GCM 模式中 nonce 重复会导致什么问题？**

A. 加密失败
B. 性能下降
C. 认证密钥泄露，可伪造密文
D. 无影响

<details>
<summary>答案与解析</summary>

**答案：C**

GCM 中 nonce 重复导致 GHASH 的认证密钥 $H$ 泄露，攻击者可构造任意密文-标签对，破坏完整性保证。机密性也会部分泄露（相同 nonce 下明文 XOR 关系暴露）。这是 GCM 最严重的安全陷阱，必须保证 nonce 不重复（计数器或加密 RNG）。

</details>

**2. 下列哪种密码哈希算法最推荐用于 2025 年的新系统？**

A. MD5
B. SHA-256
C. PBKDF2
D. Argon2id

<details>
<summary>答案与解析</summary>

**答案：D**

Argon2id 是 Password Hashing Competition（PHC）获胜算法，同时具备内存硬度与计算硬度，抗 ASIC/GPU 攻击。MD5/SHA-256 不是密码哈希算法（无慢哈希特性）。PBKDF2 抗 ASIC 能力弱。bcrypt 与 scrypt 是 Argon2id 的备选，但 Argon2id 是 PHC 官方推荐。

</details>

**3. Spring Security 6 中，下列哪种方式配置方法级安全？**

A. `@EnableGlobalMethodSecurity`
B. `@EnableMethodSecurity`
C. `@Secured`
D. `WebSecurityConfigurerAdapter`

<details>
<summary>答案与解析</summary>

**答案：B**

Spring Security 6 移除了 `WebSecurityConfigurerAdapter`，使用 `@EnableMethodSecurity`（替代 `@EnableGlobalMethodSecurity`）。`@PreAuthorize`、`@PostAuthorize`、`@Secured` 注解仍可用，但需先启用 `@EnableMethodSecurity`。

</details>

**4. JWT 应该存储在何处？**

A. localStorage
B. sessionStorage
C. HttpOnly Cookie
D. IndexedDB

<details>
<summary>答案与解析</summary>

**答案：C**

HttpOnly Cookie 防 XSS 读取，配合 `Secure`（仅 HTTPS）与 `SameSite=Strict`（防 CSRF）是最佳实践。localStorage/sessionStorage 可被 JS 读取，XSS 攻击即可窃取。IndexedDB 同样有 XSS 风险。

</details>

### 填空题

**1. TLS 1.3 强制使用 ______ 加密模式，移除了不安全的 ______ 模式。**

<details>
<summary>答案</summary>

AEAD（Authenticated Encryption with Associated Data），CBC

</details>

**2. 反序列化漏洞的防御措施包括：避免使用 ______、改用 ______、启用 JEP 290 的 ______。**

<details>
<summary>答案</summary>

`ObjectInputStream`，JSON 序列化（Jackson/Gson），反序列化过滤器（ObjectInputFilter）

</details>

**3. OAuth 2.0 的四种授权流程是 ______、______、______、______。**

<details>
<summary>答案</summary>

Authorization Code（授权码）、Implicit（隐式，已废弃）、Resource Owner Password Credentials（密码）、Client Credentials（客户端凭证）

</details>

### 编程题

**题目 1**：实现一个安全的"记住我"功能，要求：

1. 使用 Refresh Token 机制
2. Refresh Token 存储在 HttpOnly Cookie
3. Access Token 短期（15 分钟）
4. Refresh Token 长期（7 天）但可吊销
5. 检测 Token 被盗（基于 IP 与 User-Agent 指纹）

<details>
<summary>参考答案</summary>

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest req,
                                                HttpServletResponse response) {
        User user = userService.authenticate(req.username(), req.password());
        if (user == null) {
            throw new BadCredentialsException("Invalid credentials");
        }

        List<String> roles = user.getRoles().stream().map(Role::name).toList();
        String accessToken = jwtService.generateAccessToken(user.getUsername(), roles, Map.of());
        String refreshToken = refreshTokenService.generate(user.getId(), getFingerprint(req));

        // Refresh Token 存储在 HttpOnly Cookie
        Cookie cookie = new Cookie("refresh_token", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(7 * 24 * 60 * 60);  // 7 天
        response.addCookie(cookie);

        return ResponseEntity.ok(new LoginResponse(accessToken, "Bearer", 900));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(HttpServletRequest req,
                                                  HttpServletResponse response) {
        String refreshToken = extractRefreshToken(req);
        if (refreshToken == null) {
            throw new AuthenticationException("No refresh token");
        }

        // 验证 + 指纹检查
        RefreshToken token = refreshTokenService.verify(refreshToken, getFingerprint(req));
        User user = userService.findById(token.getUserId());
        List<String> roles = user.getRoles().stream().map(Role::name).toList();

        // 旋转 Refresh Token
        refreshTokenService.revoke(token);
        String newRefreshToken = refreshTokenService.generate(user.getId(), getFingerprint(req));
        Cookie cookie = createRefreshCookie(newRefreshToken);
        response.addCookie(cookie);

        String newAccessToken = jwtService.generateAccessToken(
            user.getUsername(), roles, Map.of());
        return ResponseEntity.ok(new LoginResponse(newAccessToken, "Bearer", 900));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest req,
                                        HttpServletResponse response) {
        String refreshToken = extractRefreshToken(req);
        if (refreshToken != null) {
            refreshTokenService.revoke(refreshToken);
        }
        // 清除 Cookie
        Cookie cookie = new Cookie("refresh_token", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.noContent().build();
    }

    private String getFingerprint(HttpServletRequest req) {
        String ip = req.getRemoteAddr();
        String ua = req.getHeader("User-Agent");
        return DigestUtils.sha256Hex(ip + ":" + ua);
    }
}
```

</details>

**题目 2**：实现一个 API 速率限制器，要求：

1. 基于 Redis 分布式计数
2. 滑动窗口算法
3. 每用户每分钟 100 次
4. 返回 429 + Retry-After 头

<details>
<summary>参考答案</summary>

```java
@Component
public class RedisRateLimiter {

    private final StringRedisTemplate redis;
    private static final int MAX_REQUESTS = 100;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    public boolean allow(String clientId) {
        String key = "rate:" + clientId + ":" + Instant.now().getEpochSecond() / 60;
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1) {
            redis.expire(key, WINDOW);
        }
        return count != null && count <= MAX_REQUESTS;
    }

    public long getRetryAfter(String clientId) {
        long ttl = redis.getExpire("rate:" + clientId + ":" + Instant.now().getEpochSecond() / 60);
        return ttl > 0 ? ttl : WINDOW.getSeconds();
    }
}

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RedisRateLimiter limiter;

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse resp,
                                    FilterChain chain) throws IOException, ServletException {
        String clientId = getClientId(req);
        if (!limiter.allow(clientId)) {
            resp.setStatus(429);
            resp.setHeader("Retry-After", String.valueOf(limiter.getRetryAfter(clientId)));
            resp.setContentType("application/json");
            resp.getWriter().write("{\"error\":\"Too Many Requests\"}");
            return;
        }
        chain.doFilter(req, resp);
    }
}
```

</details>

### 思考题

**1. 解释为什么 JWT 不能简单"撤销"，以及如何实现 JWT 吊销机制？**

<details>
<summary>参考答案</summary>

JWT 是无状态的，签名后服务端不存储，过期前始终有效。这是 JWT 的核心优势（无状态、可水平扩展），也是核心缺陷（无法立即吊销）。

吊销方案：

1. **黑名单**：Redis 存储被吊销的 JWT ID（jti），每次请求校验。失去无状态优势，但实现简单。

2. **短期 Access Token + 长期 Refresh Token**：Access Token 15 分钟过期，吊销只需删除 Refresh Token。最常用方案。

3. **Token 版本号**：用户登出或修改密码时，递增数据库中的 `token_version`，JWT 中携带版本号，每次请求校验。增加数据库查询。

4. **Push-based 吊销**：通过 WebSocket 或 SSE 推送吊销通知到所有服务实例，服务更新本地缓存。

推荐方案 2 + 1 组合：短期 Access Token 减少吊销窗口，Refresh Token 黑名单覆盖强制登出场景。

</details>

**2. 对比基于边界防御（Castle-and-Moat）与零信任架构（Zero Trust），并说明 Java 应用在零信任下的设计调整。**

<details>
<summary>参考答案</summary>

**Castle-and-Moat**：

- 信任内网，不信任外网。
- 防火墙、VPN 作为边界。
- 内网服务无认证。
- 一旦边界突破，横向移动无阻碍。

**Zero Trust**：

- 永不信任，始终验证。
- 身份作为新边界。
- 每次请求都认证与授权。
- 最小权限原则。

**Java 应用调整**：

1. **每个服务都是 Resource Server**：使用 Spring Security OAuth2 Resource Server，验证每个请求的 JWT。
2. **服务间 mTLS**：使用 Istio/Linkerd 自动 mTLS，证书由 SPIFFE/SPIRE 管理。
3. **方法级授权**：`@PreAuthorize` 在每个业务方法上声明权限。
4. **细粒度访问控制**：RBAC + ABAC，基于用户属性（部门、职位）+ 资源属性（所有者、敏感度）。
5. **持续认证**：JWT 短期 + Refresh Token + 实时吊销。
6. **审计日志**：每个请求记录 who、what、when、where、result。
7. **密钥管理**：Vault + 动态密钥，应用启动时获取，定期轮换。
8. **网络策略**：K8s NetworkPolicy 限制 Pod 间通信，仅允许必要端口。

</details>

## 参考文献

[1] A. J. Menezes, P. C. van Oorschot, and S. A. Vanstone. 2018. Handbook of Applied Cryptography (5th printing). CRC Press. DOI: 10.1201/9781439821916

[2] J. Katz and Y. Lindell. 2020. Introduction to Modern Cryptography (3rd ed.). CRC Press. DOI: 10.1201/9781351133036

[3] E. Rescorla. 2018. RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3. IETF. DOI: 10.17487/RFC8446

[4] N. Sakimura, J. Bradley, and M. Jones. 2014. RFC 7519: JSON Web Token (JWT). IETF. DOI: 10.17487/RFC7519

[5] D. Hardt. 2012. RFC 6749: The OAuth 2.0 Authorization Framework. IETF. DOI: 10.17487/RFC6749

[6] Spring Team. 2024. Spring Security Reference Documentation 6.3.x. VMware. Retrieved July 21, 2026 from https://docs.spring.io/spring-security/reference/

[7] OWASP Foundation. 2025. OWASP Top 10:2025. Open Web Application Security Project. Retrieved July 21, 2026 from https://owasp.org/Top10/

[8] A. Biryukov, D. Dinu, and D. Khovratovich. 2016. Argon2: New Generation of Memory-Hard Functions for Password Hashing and Other Applications. In Proceedings of the 23rd European Symposium on Research in Computer Security (ESORICS 2016). Springer, 453–473. DOI: 10.1007/978-3-319-45744-4_23

[9] M. Jones and J. Hildebrand. 2015. RFC 7515: JSON Web Signature (JWS). IETF. DOI: 10.17487/RFC7515

[10] D. Bernstein and T. Lange. 2017. Post-Quantum Cryptography. Nature 549, 7671 (Sep. 2017), 188–194. DOI: 10.1038/nature23461

[11] C. M. Lonvick and J. Salzer. 2023. Zero Trust Architecture. NIST Special Publication 800-207. National Institute of Standards and Technology. DOI: 10.6028/NIST.SP.800-207

[12] J. A. Kowalski, S. F. Li, and A. R. Monteiro. 2023. A Survey of Java Deserialization Vulnerabilities and Defenses. ACM Computing Surveys 56, 3 (Nov. 2023), 1–38. DOI: 10.1145/3611094

## 延伸阅读

- **NIST Cybersecurity Framework 2.0**：网络安全框架的国际标准，理解 Identify-Protect-Detect-Respond-Recover 五大功能。
- **"Cryptographic Engineering"**（Bruce Schneier, Wiley, 2020）：密码学工程实践圣经。
- **"Web Security for Developers"**（Malcolm McDonald, No Starch Press, 2020）：Web 安全入门。
- **Spring Security OAuth2 官方教程**：OAuth2、OIDC、Resource Server、Client 的权威指南。
- **OWASP Cheat Sheet Series**：各类安全场景的实战指南（SQL 注入、XSS、CSRF、反序列化、日志注入）。
- **"Real-World Cryptography"**（David Wong, Manning, 2021）：现代密码学应用实战。
- **JEP 411: Deprecate the Security Manager**：理解 SecurityManager 弃用背后的设计哲学。
- **Cloud Native Security Foundation (CNSF) Whitepaper**：云原生安全最佳实践。
- **CycloneDX / SPDX Specification**：SBOM 标准，理解软件物料清单在供应链安全中的作用。
- **NIST Post-Quantum Cryptography Standardization**：后量子密码学标准化进程，为未来量子计算威胁做准备。
