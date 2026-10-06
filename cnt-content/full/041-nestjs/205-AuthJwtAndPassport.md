---
order: 230
title: 认证与授权：Passport 与 JWT
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: 用 Passport local/JWT 策略与 @nestjs/jwt 落地完整认证：bcrypt 口令存储、登录签发与刷新令牌轮换、@Public 装饰器与角色守卫的衔接、第三方 OAuth 最小接入。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'nestjs/200-GuardsAndLifecycle'
  - 'nestjs/202-MiddlewareCrossCutting'
  - 'nestjs/165-DiContainerAndProviders'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
  - 'nestjs/200-GuardsAndLifecycle'
---

## 知识点地图

- **知识类别**：认证（authentication，你是谁）与授权（authorization，你能干什么）——Passport 策略体系与 JWT 的完整落地。
- **解决什么问题**：200 篇的守卫解决了「怎么拦」，本篇解决「凭什么拦」：用户怎么登录、口令怎么存、令牌怎么签发校验、令牌过期了怎么续、第三方登录怎么接。
- **什么时候用到**：任何需要登录态的 API 项目；后台 RBAC 权限体系；接入微信/Google 等第三方登录。

前置：《守卫与请求生命周期》（nestjs/200-GuardsAndLifecycle）——本篇的 Passport 守卫就是 200 篇 CanActivate 的策略化形态；《依赖注入》（nestjs/165-DiContainerAndProviders）——JwtModule 工厂配置是 DI 用例。

## 1. 心智模型：认证两步走，Passport 管策略

一句话分清四个概念：

- **认证（authentication）**：验证「你是谁」——密码、令牌、OAuth 都在做这件事；
- **授权（authorization）**：验证「你能干什么」——角色、权限点；
- **Passport**：策略模式的认证框架，每种认证方式是一个 Strategy（本地密码、JWT、OAuth…），策略负责「从请求里认出用户」；
- **JWT（JSON Web Token）**：一种自包含的令牌格式——签名保证不可篡改，payload 携带身份信息，服务端无需存会话。

Nest 的管线视角：Passport 策略运行在**守卫层**（生命周期第 2 层）——`AuthGuard('jwt')` 是 200 篇 CanActivate 的现成实现，它调用对应策略把请求解析成 user 对象挂到 request 上。本篇与 200 的分工：200 讲守卫机制与角色元数据，本篇讲认证本身的落地。

## 2. 基础设施：bcrypt 与 @nestjs/jwt

### 2.1 口令存储：bcrypt

```bash
npm i bcrypt
npm i -D @types/bcrypt
```

```typescript
// src/auth/auth.service.ts（注册侧）
import * as bcrypt from "bcrypt"

async register(email: string, password: string) {
  const hash = await bcrypt.hash(password, 10)   // 10 = cost factor
  return this.prisma.user.create({ data: { email, passwordHash: hash } })
}

async verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)          // 比对而非解密
}
```

三条必须刻进肌肉记忆的规则：

1. **存哈希不存明文**，也**不存 MD5/SHA256**——通用哈希太快（GPU 每秒几十亿次），bcrypt/scrypt/argon2 的设计目标是「慢」，cost 10 约 100ms/次，暴力破解成本完全不同；
2. **bcrypt 自带盐**：`hash` 字符串里包含算法、cost、盐、摘要（`$2b$10$...` 四段），入库一列就够——不要自己再拼一层盐；
3. **比对用 compare 不用 hash 后比字符串**：盐是随机的，同样密码两次 hash 结果不同——「hash(输入) === 库里值」的写法永远为 false。

### 2.2 签发与校验：JwtModule

```typescript
// src/auth/auth.module.ts
import { JwtModule } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET"),        // 密钥来自环境配置（nestjs/220）
        signOptions: { expiresIn: "15m" }        // 访问令牌短命
      })
    })
  ],
  providers: [AuthService],
  exports: [JwtModule]                            // 导出后其他模块可复用 JwtService
})
export class AuthModule {}
```

```typescript
// 签发
const payload = { sub: user.id, email: user.email, role: user.role }
const accessToken = await this.jwt.signAsync(payload)
```

逐项讲解：

- `registerAsync` + `useFactory` 是「依赖注入的工厂用例」（nestjs/165 第 4 节的模式）：密钥在配置服务初始化后才能拿到，静态 `register({ secret: "..." })` 写死密钥是配置管理反模式；
- `signOptions.expiresIn: "15m"`：**访问令牌必须短命**（15 分钟量级），泄漏后的损失窗口才有上界；「长效访问令牌」的便利是用安全换的，续期问题交给刷新令牌（第 5 节）；
- payload 里放 `sub`（subject，用户唯一标识）是 JWT 标准声明；role 放不放要权衡——放进去省一次查库但意味着**改角色后旧令牌还带着旧角色**（直到过期），敏感系统的做法是 payload 只放 id、守卫里查库取最新角色。

## 3. Passport 策略：local 登录与 JWT 校验

### 3.1 local 策略：认出「用户名密码正确的人」

```bash
npm i @nestjs/passport passport passport-local passport-jwt
npm i -D @types/passport-local @types/passport-jwt
```

```typescript
// src/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-local"
import { AuthService } from "../auth.service"

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly auth: AuthService) {
    super()                                        // 默认按 username/password 字段取参
  }

  async validate(email: string, password: string) {
    const user = await this.auth.validateUser(email, password) // 内部 bcrypt.compare
    if (!user) throw new UnauthorizedException("邮箱或密码错误")
    return user                                    // 返回值挂在 request.user 上
  }
}
```

### 3.2 jwt 策略：认出「带着有效令牌的人」

```typescript
// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt } from "passport-jwt"
import { ConfigService } from "@nestjs/config"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Authorization: Bearer <token>
      ignoreExpiration: false,                    // 过期令牌直接拒绝
      secretOrKey: config.get("JWT_SECRET")
    })
  }

  async validate(payload: { sub: string; email: string }) {
    // payload 是签发时的内容（已验签、未过期）
    return { userId: payload.sub, email: payload.email }       // 挂到 request.user
  }
}
```

两个策略的 `validate` 是同一模式：**策略负责「解析凭证」，validate 负责「凭证 -> 用户对象」**——local 的凭证是表单、jwt 的凭证是令牌，validate 的返回值统一成为 `request.user`，后续守卫与控制器只认这个对象。策略作为 Provider 注册进模块（`providers: [LocalStrategy, JwtStrategy]`），PassportStrategy 基类在构造时自动完成注册。

### 3.3 登录端点与守卫装配

```typescript
// src/auth/auth.controller.ts
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(AuthGuard("local"))                  // local 策略跑在守卫层
  @Post("login")
  async login(@Request() req) {
    return this.auth.login(req.user)              // validate 已认出用户，这里签发令牌
  }

  @UseGuards(AuthGuard("jwt"))                    // 需要 JWT 的接口
  @Get("profile")
  profile(@Request() req) {
    return req.user
  }
}
```

`AuthGuard("local")` 出现在**登录接口**上乍看反直觉：还没登录为什么要守卫？它的语义是「这次请求用 local 策略认证」——用户名密码就是这次请求的凭证。登录成功才换来 JWT，之后的请求用 `AuthGuard("jwt")`。

## 4. @Public 与全局守卫：与 200 篇的衔接

200 篇讲过全局守卫（`APP_GUARD`）。认证的标准装配是「全局 JWT 守卫 + 白名单」——默认全拦，公开接口显式声明：

```typescript
// src/auth/public.decorator.ts
export const IS_PUBLIC_KEY = "isPublic"
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

// src/auth/jwt-auth.guard.ts —— 全局守卫的豁免逻辑
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ])
    if (isPublic) return true                     // 公开接口直接放行
    return super.canActivate(context)             // 其余走 JWT 校验
  }
}

// AppModule：providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }]
```

「login/register/health 探针加 `@Public()`」是这套装配的固定动作——健康端点不豁免会被探针 401（nestjs/242 第 3 节的自检项）。角色授权复用 200 篇的 `@Roles` + Reflector 方案：JwtAuthGuard 先认人（认证），RolesGuard 再查角色（授权），全局注册顺序即执行顺序。

## 5. 刷新令牌与轮换

访问令牌 15 分钟过期，用户不该 15 分钟登录一次——刷新令牌（refresh token）解决续期：

```typescript
async login(user: any) {
  const payload = { sub: user.id, email: user.email }
  return {
    accessToken: await this.jwt.signAsync(payload),                     // 15 分钟
    refreshToken: await this.jwt.signAsync(payload, { expiresIn: "7d" }) // 7 天
  }
}

async refresh(refreshToken: string) {
  // 1. 验签 + 校验类型（见下方防御）
  const payload = await this.jwt.verifyAsync(refreshToken)
  // 2. 轮换：旧刷新令牌作废，签发新的一对
  const user = await this.users.findById(payload.sub)
  return this.login(user)      // 新 accessToken + 新 refreshToken
}
```

刷新令牌的三个安全决策：

1. **类型区分**：两个令牌共用一个密钥时，刷新令牌能当访问令牌用（都是合法签名）——防御做法是 payload 加 `type: "access" | "refresh"`，JwtStrategy 校验 type，或刷新令牌用**不同密钥**签发；
2. **轮换（rotation）**：每次 refresh 签发新的 refresh token、旧的作废——存储在 Redis（`SET refresh:{userId}:{jti}` 带 TTL，签发写入、刷新时删除旧的）让「作废」可执行：无状态的 JWT 一旦签发无法撤销，**刷新令牌的服务端记录就是撤销能力的来源**；
3. **重用检测**：已轮换的旧令牌再次出现 = 大概率被盗，安全敏感系统会撤销该用户全部会话强制重新登录。

## 6. 工程场景

### 6.1 场景一：登录签发 + 无感刷新的前后端协作

前端用拦截器包一层：请求带 accessToken，收到 401 时自动调 `/auth/refresh`，成功后重放原请求——用户无感知。服务端配合点：`/auth/refresh` 要加节流（同一 refreshToken 并发刷新只放一个，其余等新令牌落地），否则前端并发请求同时 401 会触发多路刷新互相作废（轮换语义下「先到的作废了后到的正用的」）。落地：Redis `SET NX refresh:lock:{userId}` 锁 3 秒，锁内完成的刷新结果写 Redis 供并发方取。

### 6.2 场景二：后台 RBAC

管理后台三种角色（admin/editor/viewer），落地方案：JWT payload 带 role（改角色频繁的后台可接受「角色变更 15 分钟内生效延迟」，换来守卫零查库），控制器用 200 篇的 `@Roles("admin")` + RolesGuard。**易错点**：接口级权限（「editor 只能改自己创建的文章」）不是角色能表达的——那要资源级判断（Guard 里比对 `article.authorId === user.id`），别往角色里塞业务规则，「角色管大类、资源管细粒度」是 RBAC 不失控的分界。

### 6.3 场景三：第三方 OAuth 最小接入

以「Google 登录」为例的 Passport 形态：

```bash
npm i passport-google-oauth20
```

```typescript
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(config: ConfigService) {
    super({
      clientID: config.get("GOOGLE_CLIENT_ID"),
      clientSecret: config.get("GOOGLE_CLIENT_SECRET"),
      callbackURL: "/auth/google/callback",
      scope: ["email", "profile"]
    })
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // profile 是第三方认定的身份：找/建本地用户（upsert），返回统一 user 对象
    return this.users.upsertOAuthUser("google", profile.id, profile.emails[0].value)
  }
}

// 控制器
@Get("google")
@UseGuards(AuthGuard("google"))
googleLogin() {}                                   // 触发重定向到 Google

@Get("google/callback")
@UseGuards(AuthGuard("google"))
googleCallback(@Request() req) {
  return this.auth.login(req.user)                 // 与本地登录共用签发逻辑
}
```

OAuth 接入的关键认知：`validate` 拿到的 profile 是「Google 说这人是谁」，你的系统要决定「这个外部身份对应哪个本地用户」——首次登录 upsert 建号、之后按 (provider, providerId) 匹配。签发环节与本地登录完全共用（第 3.3 节的 login），**策略换了、令牌体系不变**——这正是 Passport 策略模式的价值。

## 7. 动手实践

**任务一**：跑通「注册 -> 登录 -> 带 token 访问 profile -> token 过期后 401」全链路。要求：注册时验证 bcrypt 后密码不是明文；登录后用 jwt.io 解开 accessToken 观察 payload；把 expiresIn 改成 5s 复现过期 401。

<details>
<summary>任务一参考观察</summary>

数据库里 passwordHash 形如 `$2b$10$N9qo8uLOickgx2ZMRZoMye...`（四段：算法/成本/盐/摘要）；jwt.io 解出的 payload 含 sub/email/iat/exp。5 秒过期复现后，401 的响应体是 `{"statusCode":401,"message":"Unauthorized"}`——过期由 JwtStrategy 的 ignoreExpiration=false 拦截。自查：401 与 403 的分界（未认证 vs 已认证但没权限）在你的异常过滤器里区分了吗？
</details>

**任务二**：给刷新令牌加类型区分与服务端记录。要求：payload 加 `type: "refresh"`、JwtStrategy 拒绝带 refresh 类型的令牌访问业务接口；refresh 签发时在 Redis 写 `refresh:{jti}`，刷新时验证存在并删除旧的（轮换）。

<details>
<summary>任务二参考实现</summary>

```typescript
async refresh(refreshToken: string) {
  const payload = await this.jwt.verifyAsync(refreshToken)
  if (payload.type !== "refresh") throw new UnauthorizedException("令牌类型错误")
  const exists = await this.redis.exists(`refresh:${payload.jti}`)
  if (!exists) throw new UnauthorizedException("刷新令牌已失效")   // 已轮换或已撤销
  await this.redis.del(`refresh:${payload.jti}`)                  // 轮换：旧令牌作废
  const user = await this.users.findById(payload.sub)
  return this.login(user)   // 新的 access + refresh（login 里生成新 jti 并写 Redis）
}
```

要点自查：签名校验（verifyAsync）+ 服务端存在性检查缺一不可——只验签名的话，撤销（用户改密码踢下线）无从谈起；`jti`（JWT ID 声明）是每个令牌的唯一编号，是「作废某一个令牌」的钥匙。
</details>

**任务三**：给自己的项目做一次认证审计。对照本篇检查：口令是不是 bcrypt（cost 多少）、密钥是否来自环境配置、访问令牌寿命、有没有刷新机制、@Public 白名单里有没有不该公开的接口。输出一份三栏清单（现状/风险/动作）。

<details>
<summary>任务三参考清单</summary>

典型发现：「JWT_SECRET 写在代码里且是弱值」（风险：密钥泄露即全线失守；动作：迁入环境配置并轮换密钥——轮换要考虑旧令牌失效的用户影响，双密钥过渡）；「访问令牌 7 天有效」（风险：泄露窗口 7 天；动作：拆出刷新令牌）；「/debug 接口忘了 @Public 之外的保护」（风险：信息泄露；动作：审计全局守卫日志逐个确认）。审计的价值顺序：密钥管理 > 令牌寿命 > 白名单边界 > 其他。
</details>

## 8. 下一步与延伸阅读

- 《守卫与请求生命周期》（nestjs/200-GuardsAndLifecycle）：AuthGuard 的机制、角色守卫与 @Roles 元数据；
- 《中间件与横切关注点》（nestjs/202-MiddlewareCrossCutting）：令牌解析之外的请求预处理层；
- 《依赖注入与 Providers》（nestjs/165-DiContainerAndProviders）：registerAsync 工厂注入的机制；
- 《OpenAPI/Swagger 文档生成》（nestjs/215-OpenApiSwaggerDocs）：鉴权 scheme 声明让文档带登录态调试。

## 参考与致谢

- NestJS 官方文档 Authentication（Passport 集成）：<https://docs.nestjs.com/security/authentication> 与 Authorization：<https://docs.nestjs.com/security/authorization>（官方文档可复用并注明）；
- Passport 官方文档 <http://www.passportjs.org/> 与 bcrypt 仓库 <https://github.com/kelektiv/node.bcrypt.js>；
- 本篇正文为教学重写；@Public 豁免模式沿用官方文档 Authorization 章的通行实现。
