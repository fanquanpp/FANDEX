---
order: 330
title: 安全编码原则
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 六条安全编码原则各自在防什么：把「攻击者视角 + 失败模式思维」变成写代码时的默认反射，用数据流视角串起 OWASP Top 10，附时序攻击等底层原理与动手练习。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/170-InputValidation'
  - 'cybersecurity/340-SecureDevelopment'
  - 'cybersecurity/290-AuthenticationAuthorization'
  - 'cybersecurity/160-OWASPTop10Detailed'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 1. 心智模型：安全编码是「想问题的方式」，不是「要背的清单」

工具能扫出已知漏洞，但工具扫不出「这个接口的权限判断写在了错误的地方」。
安全编码的本质是养成两个反射：

1. **攻击者视角**：每次处理外部输入时问一句「这个值如果是恶意构造的，会走到
   什么意想不到的地方去？」——输入校验、SQL 注入、XSS、SSRF 全是这一问的展开。
2. **失败模式思维**：每次写错误处理时问一句「这一步失败之后，程序是倾向于
   拒绝还是放行？」——安全系统必须有默认立场：失败即拒绝（fail-safe）。

一句话概括本文所有内容：**攻击者不按你设计的路径使用你的程序，安全编码就是
把「他可能怎么走」提前写进代码的判断里**。流程层面的 SDL 与威胁建模在
340-SecureDevelopment 展开，本文聚焦写代码那一刻的判断力。

## 2. 六条原则各自在防什么

原则表谁都会抄，关键是知道每条原则针对哪类真实事故：

| 原则         | 一句话                                       | 防的事故类型                     |
| :----------- | :------------------------------------------- | :------------------------------- |
| 不信任输入   | 外部数据在验证前一律不可信                   | 注入类漏洞（SQLi/XSS/命令注入）  |
| 最小权限     | 只授予完成任务所需的最小访问                 | 越权、IDOR、横向移动             |
| 默认拒绝     | 没有显式允许的行为一律禁止                   | 忘写权限判断的「影子接口」       |
| 失败安全     | 异常路径也进入拒绝状态                       | 异常时放行的认证绕过             |
| 纵深防御     | 单层防线假设会失效，多层叠加                 | 单点绕过导致全线失守             |
| 关注点分离   | 安全判断集中在可控的少数位置                 | 判断散落各处、改漏一处           |

「默认拒绝 + 失败安全」这对组合最值得展开。反例（默认放行）：

```python
# 反面写法：白名单里没查到就抛异常，但异常被吞掉后继续执行
def check_permission(user, resource):
    try:
        return user.role in ALLOWED[resource.type]
    except KeyError:
        return True        # 资源类型没登记过——放行！
```

未知资源类型应该拒绝而不是放行；「except 之后 return True」是历史上无数次
越权事故的原型。正确姿势：未知即拒绝，异常也要落到拒绝分支。

## 3. 数据流视角：把 OWASP Top 10 串成一条线

OWASP Top 10 背表容易忘，换成数据流的视角只需记一句话：**攻击 = 把恶意数据
送进一条你没有设防的路径，让它抵达某个有杀伤力的终点**。防御就是在这条路径上
设卡：

```text
外部输入（HTTP 参数/头/Body/文件）
   ↓ 【卡点 1】入口验证：类型、长度、格式、白名单（见 170-InputValidation）
业务逻辑处理
   ↓ 【卡点 2】使用点隔离：参数化查询 / 上下文输出编码 / 命令数组化
持久化与缓存
   ↓ 【卡点 3】二次使用仍不可信：数据库读出的数据、日志、缓存同样要验证
输出（HTML/JSON/命令行/文件路径）
   ↓ 【卡点 4】按输出上下文选择正确防御（HTML 转义 ≠ URL 编码 ≠ 参数化）
```

这个视角解释了三件初学者常困惑的事：

- **为什么 SQL 要用参数化而不是拼接后转义**：转义是在「猜」注入语法，参数化
  从结构上把「代码」和「数据」分开——数据永远到不了语法层；
- **为什么「已经存进数据库的数据」还要转义**：存储型 XSS 的恶意数据第一次
  入库时可能是合法 JSON，读出来渲染时才变成攻击——卡点跟着使用点走；
- **为什么验证和编码不能互相替代**：验证发生在入口防的是「进来的东西对不对」，
  编码发生在出口防的是「出去的东西会不会被误执行」，中间隔着整个业务逻辑。

## 4. 四个高频高危点的判断要点

### 4.1 密码存储：选对算法，其余交给库

```python
# 存储：bcrypt / Argon2id（慢哈希 + 自动盐）
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
# 验证：compare 函数内部做常数时间比较
ok = bcrypt.checkpw(password.encode(), hashed)
```

底层原理一句话：**普通哈希（MD5/SHA-256）太快**，GPU 每秒能算几十亿次，
拖库后爆破密码只是算力问题；bcrypt/Argon2 故意做得慢且耗内存，把离线爆破的
成本抬高几个数量级。所以「加盐」不是全部，「慢」才是关键设计。细节见
070-PasswordHash。

### 4.2 会话管理：Cookie 三属性是三种攻击的答案

```python
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,    # JS 读不到 → 缓解 XSS 偷 Cookie
    SESSION_COOKIE_SECURE=True,      # 仅 HTTPS 传输 → 防中间人嗅探
    SESSION_COOKIE_SAMESITE='Lax',   # 跨站不带 → 缓解 CSRF
    PERMANENT_SESSION_LIFETIME=3600, # 会话过期 → 压缩被窃后的利用窗口
)
```

每个属性都对应一类攻击（XSS、网络嗅探、CSRF），面试里常考「这三个属性分别
防什么」——把属性和攻击对应起来记，而不是背缩写。登录态相关攻击的完整攻防
见 210-CSRFAttack 与 190-XSSAttack。

### 4.3 错误处理：信息泄露的边界

```python
@app.errorhandler(Exception)
def handle_error(e):
    app.logger.error("Unhandled error", exc_info=True)   # 详情只进日志
    return "Internal Server Error", 500                  # 用户只拿笼统信息
```

原理：堆栈、SQL 语句、文件路径给攻击者画出了系统内部地图。经典事故是
数据库报错直接回显——错误页里一句 SQL 语法提示就能让盲注变成可视化注入。
原则：**给用户的是「发生了错误」，给日志的是「为什么错」，两者不要混**。

### 4.4 日志：既要记全，又不能记敏感

日志是入侵检测的原料（记少了 A09 日志监控不足），也可能成为泄露源
（记多了密码、Token、身份证号）。两个动作：

```python
SENSITIVE = {'password', 'token', 'secret', 'credit_card'}

def safe_log(message, **fields):
    redacted = {k: ('***' if k in SENSITIVE else v) for k, v in fields.items()}
    logging.info(message, extra=redacted)   # 统一出口做脱敏，别散在各处手写
```

把脱敏集中在日志函数这一个出口（关注点分离），比要求每个人记得手动脱敏
可靠得多。

## 5. 常见坑与底层原理

**坑一：时序侧信道——用 `==` 比较密钥或 MAC。** 普通 `==` 遇到第一个不等的
字节就返回，比较耗时随「匹配前缀长度」变化；攻击者远程测量响应时间可以逐字节
猜出密钥。安全场景用常数时间比较（`hmac.compare_digest`），原理是不管差在哪
都跑完全程。

**坑二：安全随机数用了 `random` 模块。** `random` 是伪随机（Mersenne Twister），
内部状态可被观测推演；安全用途必须用操作系统熵源的 CSPRNG
（`secrets` / `os.urandom`）。判断标准：这个随机值**有没有人需要猜不出来**——
有，就必须 CSPRNG。

**坑三：重定向不校验目标。** `return redirect(request.args.get('next'))` 是
钓鱼的经典载体：攻击者构造 `?next=https://evil.example`，把「登录成功跳转」
变成「凭证+用户一起送过去」。白名单校验目标再跳。

**坑四：在多个层级各写一套不一致的验证。** 前端拦了长度、后端拦了格式、
数据库拦了类型，但三处规则不一致时，绕过任何一处都能注入。「一致验证」
指的是规则同源（同一 schema 定义），而不是「各处都写了」。

## 6. 面试题思路

- 「如何防止 SQL 注入？」——按数据流答：入口验证（类型/白名单）→ 使用点
  参数化（根本解，结构与数据分离）→ ORM 不等于豁免（raw 查询同样要参数化）
  → 数据库账号最小权限兜底。只答「用参数化」说明没理解纵深防御。
- 「前端做了验证，后端还要做吗？」——要。前端验证防的是正常用户的误操作
  （体验），HTTP 请求可以用 curl 直接构造（绕过一切前端逻辑），后端验证
  才是安全边界。
- 「bcrypt 和 SHA-256 加盐有什么区别？」——考点是「慢哈希的威胁模型」：
  SHA-256 设计目标是快，加盐防彩虹表但防不了 GPU 离线爆破；bcrypt 用
  work factor 把单次计算拖到几十毫秒量级，且可随硬件升级调参。
- 「什么是失败安全？举个例子。」——认证中间件抛异常时返回 500 拒绝而非
  放行、权限查询超时时默认无权限、配置加载失败时服务不启动而不是用默认
  宽松配置起服务。

## 7. 动手实践

练习任务（先自己写，再看自检区）：

1. 给一个「查询用户资料」接口写完整的防御链：入口验证用户 ID 格式，参数化
   查询，输出前做所有权判断（防 IDOR），错误处理不回显 SQL。
2. 把第 2 节的反面 `check_permission` 改成失败安全版本。
3. 写一个登录限流函数：同一账号 5 次失败锁定 10 分钟，要求用 CSPRNG 生成
   一次性令牌并做常数时间比较。

遮代码自检——先想再对：

提示一：任务 1 的四道卡点分别放在哪个函数里？参考骨架：

```python
import re
from flask import abort

def get_profile(user_id, current_user):
    # 卡点 1：入口验证（格式白名单，而非黑名单过滤恶意值）
    if not re.fullmatch(r'[0-9]{1,10}', str(user_id)):
        abort(400)
    # 卡点 2：参数化查询（结构由占位符定死，用户数据进不了语法层）
    row = db.execute(
        "SELECT id, name, email FROM users WHERE id = %s", (user_id,)
    ).fetchone()
    if row is None:
        abort(404)
    # 卡点 3：所有权判断（防水平越权/IDOR——有数据不等于能用数据）
    if row['id'] != current_user.id and not current_user.is_admin:
        abort(403)
    return row
# 全局错误处理器兜底卡点 4：异常记日志、对用户只返回笼统 500
```

提示二：任务 2 「失败安全」的关键是哪两条分支？

```python
def check_permission(user, resource):
    allowed = ALLOWED.get(resource.type)
    if allowed is None:
        return False                      # 未登记的资源类型：拒绝
    try:
        return user.role in allowed
    except Exception:
        return False                      # 任何异常路径：都落在拒绝侧
```

提示三：任务 3 里「安全随机」和「常数时间比较」各用哪个库函数？

```python
import secrets, hmac, time

def issue_reset_token():
    return secrets.token_urlsafe(32)      # CSPRNG，不是 random.choice

def verify_token(submitted, stored):
    return hmac.compare_digest(submitted, stored)   # 常数时间，防时序侧信道
```

## 8. 常见误区

| 误区                                   | 事实                                                     |
| :------------------------------------- | :------------------------------------------------------- |
| 「参数化查询包治注入」                  | 它只管 SQL 这一个终点；命令注入、XSS、路径遍历各有各的卡点 |
| 「哈希加盐就够安全」                    | 快哈希加盐仍可 GPU 爆破，密码必须慢哈希（bcrypt/Argon2）  |
| 「错误信息不含密码就不算泄露」          | 堆栈、SQL、路径都是攻击地图，笼统化是给用户的默认姿势      |
| 「安全检查写在前端等于做了」             | 前端逻辑可被完全绕过，安全边界永远在后端                  |
| 「工具扫过了就是安全」                  | SAST 抓已知模式，抓不住「权限判断放错地方」这类逻辑缺陷    |

## 小结

- **初学者要点**：记住两个反射——「外部输入不可信」（攻击者视角）与
  「失败即拒绝」（失败安全）；OWASP Top 10 可以全部还原成「恶意数据沿
  没设防的路径抵达有杀伤力的终点」，防御就是在入口、使用点、出口设卡。
- **进阶注意**：参数化/编码/验证各管一段不可互相替代；密码存储的关键设计是
  「慢」与会话 Cookie 三属性各对一类攻击；时序侧信道与 CSPRNG 是两个容易被
  忽略的底层细节；SDL、威胁建模与工具链在 340-SecureDevelopment，输入验证
  语法细节在 170-InputValidation。
