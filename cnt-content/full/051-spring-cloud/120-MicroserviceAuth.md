---
order: 120
title: 微服务统一认证授权：登录态拆到八个服务之后放哪
description: 以「单体一个 Session 万事大吉，拆成八个服务后登录态放哪——复制八份的同步地狱还是每次去认证中心问的八倍往返」引入：方案谱系选型表、网关统一验签与头透传主线、内网信任边界与伪造头攻防、access/refresh 换发与登出黑名单闭环，附全链路鉴权与伪造头对照实验。
module: 'spring-cloud'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-cloud/060-ApiGateway'
  - 'spring-boot/120-SpringSecurityJwt'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/120-SpringSecurityJwt'
  - 'spring-cloud/060-ApiGateway'
---

## 前置知识

- [API 网关](/spring-cloud/060-ApiGateway)：知道请求先过网关、网关有 GlobalFilter 且长在 WebFlux 上——没读过也能跟，第 3 节沿用它的鉴权过滤器；
- [Spring Security 与 JWT](/spring-boot/120-SpringSecurityJwt)：知道「验签、从 token 解析出用户」这回事，知道单体篇留了「JWT 无法主动失效」的口子——没读过也能跟，第 6 节把这个口子焊上。

## 学习目标

读完本文你将能够：

1. 推演登录态在微服务下的两个死路——Session 复制八份的同步地狱、每请求问认证中心的八倍往返，说清 JWT 为什么能同时解开两个；
2. 用选型决策表在粘滞 Session、集中 Session、无状态 JWT、OAuth2/OIDC 认证中心之间做判断；
3. 走通主线全链路：登录签发 → 网关验签 → X-User-Id 与 X-User-Roles 头透传 → 下游构建认证上下文 → @PreAuthorize 方法级授权；
4. 说透「下游只信网关头」的安全前提，并亲手演示违背前提的伪造攻击与修复对照；
5. 设计 token 生命周期：access 与 refresh 的换发时序、登出黑名单的存法与判法。

预计 60 分钟，需要两个终端窗口。

## 1. 你现在要解决什么问题

单体时代，登录态从不是问题：登录成功把用户塞进 Session，一个过滤器拦截一切请求问一句「你是谁」，万事大吉。拆成八个服务之后，第一个问题立刻浮现：**Session 放哪？** 让每个服务各存一份，用户在订单服务登录、库存服务不认识他；要让八个都认识，就得把登录态复制八份并互相同步——改个昵称广播八处、过期策略八套配置，同步地狱。全部收归一个认证中心、每个服务每次都去问一句「这人是谁」？每个请求多一次跨服务往返，八个服务八倍往返，认证中心成为全站性能与可用性的单点——它抖一下，全站都不知道自己是谁。

矛盾的本质是**状态集中与性能天然相斥**：有状态就要同步或往返，无往返就要无状态。解法是把「这个人是谁」这个事实从服务端存储里搬出来，签成一张防伪的票据交还给客户端——JWT。请求带着票走，每个服务本地验签即可知道你是谁，零存储、零往返。但无状态票据立刻带来新问题：票能伪造吗（验签解决）、票丢了能作废吗（第 6 节解决）、服务之间怎么互信（第 5 节解决）。本篇把这套体系从方案谱系到工程落地一次走通。

## 2. 方案谱系：登录态放哪的四条路

| 方案 | 状态放哪 | 优点 | 代价 | 适用 |
| --- | --- | --- | --- | --- |
| Session 粘滞 | 某一台的内存 | 零改造 | 有状态：实例宕机登录态全丢、扩缩容要重哈希 | 历史包袱，别新增 |
| 集中 Session（Spring Session + Redis） | Redis | 应用近乎无感，改造成本最低 | 每请求一次 Redis 往返；Redis 成为硬依赖 | 服务少、求稳过渡 |
| 无状态 JWT | 票据本身（客户端持有） | 服务端零存储零往返，水平扩展天然成立 | 无法主动失效、票据变大 | 主流默认，本篇主线 |
| 认证中心（OAuth2/OIDC） | 授权服务器集中签发与治理 | SSO 单点登录、第三方接入、吊销协议齐全 | 复杂度最高，多一套基础设施 | 多端多团队、组织级 IAM、开放平台 |

四条路不是四选一的并行世界，而是演进关系：粘滞是不得已，集中 Session 是过渡，JWT 是微服务默认答案，认证中心是「JWT 的签发方升级成一家专业机构」。它们还能组合：认证中心用 Spring Authorization Server 签发 OIDC token（知道有这么个东西即可，spring-boot 官方提供 oauth2 authorization server 与 resource server 两个 starter，具体以官方文档为准），网关与下游当作 JWT 照旧验签——本篇主线学会之后，接入认证中心只是换一个签发方。

## 3. 主线：网关统一验签与身份透传

全链路的分工先钉死：**认证收口在网关（你是不是登录用户），授权留在下游（你能不能动这个资源）**。060 篇已经写出网关的 JWT 校验过滤器，本篇在其上加两件事：角色透传与黑名单（第 6 节）。

登录接口负责签发票据，放在一个独立的认证服务或用户服务里（与网关共享同一个签名密钥，密钥管理用 030 篇的配置中心下发）：

```java
@PostMapping("/auth/login")
public TokenPair login(@RequestBody LoginRequest req) {
    User user = userService.verifyPassword(req);            // 密码校验略
    String access = Jwts.builder()
            .subject(String.valueOf(user.getId()))
            .claim("roles", user.getRoles())                // 角色：授权的原材料
            .id(UUID.randomUUID().toString())               // jti：token 身份证号，登出吊销要用
            .expiration(new Date(System.currentTimeMillis() + 15 * 60 * 1000))
            .signWith(KEY)
            .compact();
    return new TokenPair(access, issueRefreshToken(user));  // refresh 第 6 节展开
}
```

网关的 GlobalFilter 验签之后，把身份拆成两个头递给下游（060 篇代码的主体，此处补上角色）：

```java
Claims claims = Jwts.parser().verifyWith(KEY).build()
        .parseSignedClaims(auth.substring(7)).getPayload();
List<String> roles = claims.get("roles", List.class);
ServerHttpRequest downstream = exchange.getRequest().mutate()
        .header("X-User-Id", claims.getSubject())
        .header("X-User-Roles", String.join(",", roles))
        .build();
return chain.filter(exchange.mutate().request(downstream).build());
```

下游从此不引 jjwt、不碰签名密钥，只读网关递进来的头——验签逻辑一处维护，八个服务的鉴权代码整体删除，060 篇的「收编」到这里补完全貌。

## 4. 下游的信任装配：网关头变成 SecurityContext

下游拿到裸的头还不够——@PreAuthorize 认的是 SecurityContext 里的 Authentication。缺的是一段装配代码：把头翻译成认证对象塞进上下文。

```java
@Component
public class GatewayHeaderAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String userId = request.getHeader("X-User-Id");
        if (userId != null) {
            List<SimpleGrantedAuthority> authorities = Arrays.stream(Optional
                    .ofNullable(request.getHeader("X-User-Roles")).orElse("").split(","))
                    .filter(r -> !r.isBlank())
                    .map(r -> new SimpleGrantedAuthority("ROLE_" + r.trim()))
                    .toList();
            var auth = new UsernamePasswordAuthenticationToken(userId, "n/a", authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        chain.doFilter(request, response);
    }
}
```

```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain security(HttpSecurity http, GatewayHeaderAuthFilter filter) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(a -> a.anyRequest().authenticated())
                .build();
    }
}
```

装配完成之后，单体时代的整套方法级授权原样可用——角色来自网关透传，判断发生在业务现场：

```java
@DeleteMapping("/order/{id}")
@PreAuthorize("hasRole('ADMIN')")
public void cancel(@PathVariable Long id) { ... }
```

边界与 060 篇呼应：网关判「是不是登录用户」，下游判两件事——方法级角色（@PreAuthorize）与资源级归属（这张订单是不是你的，只有业务服务自己知道）。两级授权各守各的门，谁也不能替谁。

## 5. 安全边界：只信网关的前提

「下游只信 X-User-Id 头」这句话有一个隐藏前提，必须亲手打破一次才记得牢。假设有人拿到了内网机器（懂内网的员工、被攻破的办公网），直接 curl 下游端口：

```bash
curl -X DELETE -H "X-User-Id: 1" -H "X-User-Roles: ADMIN" \
     http://10.0.3.21:8081/order/1001
```

```text
200 OK        ← 没有网关、没有 token，冒充的 admin 把别人的订单删了
```

下游分不清这个头是网关递的还是 curl 塞的——**内网头没有任何密码学保护，可被任何人伪造**。所以「只信网关」成立的前提是**网络隔离**，三条铁律：

1. 业务服务端口只监听内网，且网络策略只允许网关访问（云上安全组、K8s NetworkPolicy，部署形态不同写法不同，目标是同一个）；
2. 网关是唯一对外出口，业务端口一个都不暴露公网；
3. 内网调用方不止网关时（服务间互调），要么统一走网关签发的内部凭证（服务账号 token，内部通信专用、短有效期），要么上 mTLS 双向证书认证——把「我是谁」从 HTTP 头下沉到传输层。服务网格（如 Istio）能把 mTLS 做成基础设施，本篇知道格局即可。

第 8 节实验给出完整的攻防对照：同一个 DELETE，伪造头直连得手；堵上网络之后连接被拒绝——防线从「约定」升格为「拓扑」。

## 6. Token 生命周期：access/refresh 与登出吊销

单体篇留的口子现在焊上：JWT 验签通过就放行，签出去的票在过期前收不回来。微服务下的完整答案是「短票 + 换发 + 网关黑名单」三件套。

```text
T0  登录：签发 access（15 分钟）+ refresh（7 天），refresh 存服务端记录
T1  日常：请求只带 access；15 分钟后过期，前端用 refresh 换新 access
T2  换发：refresh 一次一换——旧 refresh 作废，发新 refresh（防长期裸奔）
T3  登出：把 access 的 jti 写进 Redis 黑名单，TTL = token 剩余寿命
T4  每个请求过网关：验签 + 查黑名单，命中即 401
```

为什么要两张票：**access 活得短，是被盗窗口；refresh 活得长但只对换发端点使用**，且服务端留了记录、可单独吊销——「改密码踢全端」就是删掉该用户所有 refresh 记录。黑名单的存与判钉死：存的是 `black:jti:{jti}`（值为 1，TTL 等于 access 剩余寿命——token 自然过期后，黑名单条目同时失去意义，过期即自清理）；网关验签后查 jti 是否命中。

网关长在 WebFlux 上，060 篇的铁律在此生效：查 Redis 不能阻塞事件循环，黑名单校验必须写成响应式链条——

```java
return reactiveRedis.hasKey("black:jti:" + claims.getId())
        .flatMap(black -> black
                ? unauthorized(exchange)
                : chain.filter(exchange.mutate().request(downstream).build()));
```

至此闭环：JWT 「无法主动失效」在无状态层面依然为真，但网关这一层的黑名单把「主动失效」变成了每次请求多一次 Redis 查询的代价——用微服务本来就有的收口点，补单体时代补不上的课。

## 7. 三个容易翻车的工程细节

**票据放哪个头。** 惯例是 Authorization: Bearer &lt;token&gt;，网关解析后**必须把原头剥离或覆盖**再转发——不剥掉原头，下游就同时存在「网关的头」与「原始 token」两条身份线索，两套逻辑迟早打架。自定义头（如 X-Auth-Token）也可以，但要全链路约定并写进团队的接入文档。

**票据别当仓库用。** JWT 越塞越大，每个请求都背着它走一遍，HTTP 头有大小上限（常见服务器默认 8KB 量级），roles 里塞几十个业务标签、user 里塞完整资料，迟早把头撑爆。纪律：token 里只放「身份判定需要的最小集」（用户 id、角色、过期、jti），其余资料下游按 user id 回查或走缓存——token 是票据，不是档案袋。

**时钟偏移与白名单纪律。** 多台机器的系统时钟差几分钟，就会出现「刚签发就被判过期」的灵异现象——服务器全量开 NTP 是前提，解析端可留少量时钟偏移容忍（所用 JWT 库的 clock skew 配置，以文档为准）。网关放行路径的白名单（登录、注册、健康检查）要收口成一份配置而不是散在过滤器代码里：每加一个免登录接口都该是有意识的决定，否则「临时放行」会滚成安全债。

## 8. 实验：全链路鉴权与伪造头攻防

环境：网关（9000）、订单服务（8081）、认证服务，均按 020 篇注册进 Nacos；网关配置 060 篇的鉴权过滤器加本篇第 6 节的黑名单校验。

第一幕，走通全链路：

```bash
# 登录拿 token
curl -s -X POST localhost:9000/api/auth/login \
     -H "Content-Type: application/json" -d '{"username":"alice","password":"..."}'
# 带 token 查订单：网关验签 → 透传头 → 下游放行
curl -H "Authorization: Bearer <access>" localhost:9000/api/order/1001
# 带 token 删订单：alice 只有 USER 角色
curl -X DELETE -H "Authorization: Bearer <access>" localhost:9000/api/order/1001
```

```text
{"orderId":1001,...}          ← GET 放行：登录用户即可
{"status":403}                ← DELETE 被 @PreAuthorize 拦下：有身份，没角色
```

给 alice 加上 ADMIN 角色重新登录再删：200——授权材料从登录签发、经网关透传、到下游裁决，三段证据链连起来了。

第二幕，伪造头攻防。绕过网关直连下游，塞上冒充的头：

```bash
curl -X DELETE -H "X-User-Id: 1" -H "X-User-Roles: ADMIN" http://localhost:8081/order/1001
```

本地环境端口全开，删除得手——这就是第 5 节说的事故。修复对照：给订单服务加网络策略只允许网关访问（本地可以简单模拟为「订单服务只绑定内网网卡」，K8s 里是一条 NetworkPolicy），再打同一发 curl：

```text
curl: (7) Failed to connect to localhost port 8081   ← 连接被拒：防线前移到了拓扑层
```

第三幕，登出吊销。登出后立刻用同一个 access 再查订单：

```text
{"status":401}        ← 验签仍然通过（票没过期），但 jti 命中黑名单
```

这一幕值得盯着 Redis 看完：登出瞬间 `black:jti:{jti}` 出现，TTL 递减；15 分钟后 token 自然过期，黑名单条目也随之消失——存储不自增，这是 TTL 等于剩余寿命的设计意义。

## 官方参考

- Spring Security 架构与过滤器链：https://docs.spring.io/spring-security/reference/
- Spring Authorization Server（OAuth2/OIDC 签发方）：https://spring.io/projects/spring-authorization-server
- Spring Cloud Gateway 官方文档：https://docs.spring.io/spring-cloud-gateway/reference/
- jjwt 的解析 API 与密钥长度要求随版本演进，以所用版本文档为准。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. Session 复制与中心化认证各死在哪？JWT 用什么性质同时解开两个死结，又带来什么新问题？
2. 四条路选型：三个服务的管理后台、八端 C 端应用、要接第三方开放平台——各选哪条，为什么？
3. 认证与授权的分工边界在哪？@PreAuthorize 检查的 authorities 是从哪一层传到哪一层的？
4. 下游的信任装配做了什么？为什么过滤器要加在 UsernamePasswordAuthenticationFilter 之前？
5. 「只信网关头」的安全前提是什么？违背前提的攻击长什么样，修复后防线发生了什么变化？
6. access 与 refresh 的常用配方各是多久、为什么这样配？refresh 为什么一次一换？
7. 登出黑名单存什么、判什么、TTL 怎么定？为什么 token 过期后条目可以放心过期？
8. 网关是 WebFlux，黑名单查询为什么不能阻塞？响应式写法的关键形态是什么？
