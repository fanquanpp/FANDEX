---
order: 140
title: Spring Security 与 JWT：过滤器链上的无状态认证
description: 以「接口裸奔的三种死法与前后端分离后 Session 的别扭」引入：认证与授权之分、JWT 三段结构与签名的边界、SecurityFilterChain 过滤器链心智模型、lambda DSL 完整配置、登录签发到方法级授权的全流程，附 curl 四连实验与新旧写法对照表。
module: 'spring-boot'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-boot/060-SpringMvcRestApi'
  - 'spring-boot/030-IoCDependencyInjection'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'java/840-SpringBootSecurity'
  - 'java/950-JavaSecurity'
---

## 前置知识

- [Spring MVC 与 REST API](/spring-boot/060-SpringMvcRestApi)：知道 Filter 在请求进 Controller 之前执行——没读过也能跟，第 3 节现场补；
- [IoC 与依赖注入](/spring-boot/030-IoCDependencyInjection)：会用 @Bean 声明第三方组件——没读过也能跟。

## 学习目标

读完本文你将能够：

1. 区分认证与授权，说出 JWT 三段各放什么、签名保什么不保什么；
2. 画出 SecurityFilterChain 的过滤器队列，说清自己的 JWT 过滤器该插在哪、为什么；
3. 独立写出 Spring Security 6 的 SecurityFilterChain lambda DSL 完整配置；
4. 跑通「登录验密码签发 token → 过滤器解析塞 SecurityContext → @PreAuthorize 方法级授权」全流程；
5. 对照新旧写法读懂旧教程，避开 ROLE_ 前缀、放行路径、CSRF 三个高频坑。

预计 60 分钟。

## 1. 你现在要解决什么问题

新上线的图书 API 一行安全代码都没写，三种死法排着队来。其一，被爬：脚本零鉴权扫全量接口，书库一夜被搬空。其二，被越权：普通用户把 URL 里的 userId 改成别人的，读到他人订单；管理接口人人可调。其三，密码撞库：图省事明文存密码，拖库之后用户在所有网站复用的密码全部沦陷。你决定上鉴权，又碰上前端同事的灵魂拷问：前后端分离、部署两个实例，Session 放哪？放内存则负载均衡必须粘住同一实例，水平扩展被卡死；放共享存储则每个请求多一次查询；跨域场景 Cookie 还要额外折腾凭证传递。JWT（JSON Web Token）给出了另一条路：登录成功后签发一个自带身份、自带过期时间、签名防篡改的令牌，服务端不存任何会话状态——请求走到哪个实例都能验。本篇把这条路从过滤器链的原理走到 curl 验证。

## 2. 认证与授权：两个问题，两道关卡

认证（Authentication）回答「你是谁」；授权（Authorization）回答「你能干什么」。顺序固定：先认证后授权——不知道你是谁，谈不上允许你做什么。

JWT 是一段三节的自描述令牌，用点号相连：

```text
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZSIsInJvbGVzIjpbIlVTRVIiXX0.xK9f...(签名示意)

Header     {"alg":"HS256"}                                    用什么算法签名
Payload    {"sub":"alice","roles":["USER"],"exp":1790000000}   声明（claims）
Signature  HMACSHA256(base64url(Header) + "." + base64url(Payload), 密钥)
```

三段都是 base64url **编码**而非加密——任何人解开 Payload 就能读。所以关键认知是：**签名保完整，不保机密**。改一个字母，服务端重算签名对不上，直接拒收，篡改没有生存空间；但 Payload 里的手机号、密码对窥探者一目了然，绝不能放。服务器为什么敢信 Payload？因为只有持有密钥的人算得出这个签名——「内容没被改过」由数学保证。

## 3. 过滤器链心智模型：一条安检流水线

060 篇讲过 Filter 分层：请求先过过滤器链再进 DispatcherServlet。Spring Security 的本体就是**一条更长的过滤器链**（SecurityFilterChain），插在 Servlet 容器与你所有业务之间，内置十几个各司其职的过滤器依次排队：有的管 CSRF 令牌校验，有的管认证，最后一个管授权裁决。

```text
请求 → CSRF 过滤器 → … → JWT 过滤器（我们插入）→ … → 授权过滤器 → Controller
                              │                        │
                   解析 token、塞 SecurityContext    对照权限规则放行或拒绝
```

我们的全部工作因此只有两件：往链里插一个自己的 JWT 过滤器（验 token、把身份塞进 SecurityContext 这个请求级上下文）；在授权环节用声明式规则说清「什么路径要什么权限」。理解了「一切皆过滤器」，Security 的配置代码就不再是咒语，而是在描述这条流水线的排班表。

## 4. 准备现场：依赖与默认行为

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

只加 security starter 不写任何配置时，启动日志会出现一行 Using generated security password，所有接口被默认规则锁死、浏览器访问跳表单登录——这是框架的「默认安全」立场：宁可全锁，不可裸奔。下面用一条自定义 SecurityFilterChain 整体接管。

## 5. SecurityFilterChain：lambda DSL 完整配置

```java
@Configuration
@EnableMethodSecurity                        // 打开 @PreAuthorize 方法级授权
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .exceptionHandling(e -> e.authenticationEntryPoint((req, resp, ex) -> {
                resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                resp.setContentType("application/json;charset=UTF-8");
                resp.getWriter().write("{\"code\":401,\"message\":\"未登录或凭证无效\"}");
            }))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(PasswordEncoder encoder) {
        return username -> {                              // 演示用内存用户；生产改为从库查询
            if (!"alice".equals(username)) {
                throw new UsernameNotFoundException("用户不存在");
            }
            // 存的是 BCrypt 哈希，不是明文
            return User.withUsername("alice").password(encoder.encode("user123")).roles("USER").build();
        };
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

逐行对号过滤器链。csrf 关闭：CSRF 攻击的燃料是「浏览器对站内请求自动带 Cookie」；JWT 放在 Authorization 头、浏览器不会自动携带，攻击者伪造不了——所以**无状态 API 才有资格关**。哪天你把 token 挪回 Cookie，就把这行删掉。sessionManagement 的 STATELESS：不创建 HttpSession，SecurityContext 不落 session，每个请求自证身份。authorizeHttpRequests 从上往下匹配、命中即停，anyRequest 兜底。exceptionHandling 的 entry point 给「未认证请求」定义回应——不配它，Security 6 对无凭证请求的默认回应是 403 而不是 401，很多教程照抄后发现状态码对不上，原因就在这。addFilterBefore 把我们的 JWT 过滤器插在用户名密码认证过滤器之前——锚点选它只是惯例，真正的要求是排在授权过滤器前面。

BCrypt 一句话：为什么同一个密码每次 encode 结果都不同还能校验通过？哈希里埋了随机盐，校验时从哈希串里取出盐重算比对——拖库者拿到哈希也建不出可用的彩虹表，撞库成本被抬高几个量级。

## 6. 登录接口：验密码、签 token

```java
@Component
public class JwtService {

    private static final SecretKey KEY = Keys.hmacShaKeyFor(
            "change-me-in-prod-at-least-32-bytes-long!!".getBytes(StandardCharsets.UTF_8));
    private static final long EXPIRE_MS = Duration.ofHours(2).toMillis();

    public String issue(String username, List<String> roles) {
        Date now = new Date();
        return Jwts.builder()
                .subject(username)
                .claim("roles", roles)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + EXPIRE_MS))
                .signWith(KEY)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(KEY).build().parseSignedClaims(token).getPayload();
    }
}
```

密钥必须至少 256 位（HS256 的要求），短了启动即抛 WeakKeyException；生产从配置读，绝不能提交进仓库。exp 过期声明由解析器自动校验，过期抛 ExpiredJwtException——过期语义不用自己写。

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public record LoginRequest(String username, String password) { }

    public record LoginResponse(String token) { }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest req) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        } catch (BadCredentialsException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
        }
        List<String> roles = List.of("USER");             // 生产：从库查用户角色
        return new LoginResponse(jwtService.issue(req.username(), roles));
    }
}
```

authenticate() 内部调 UserDetailsService 加载用户、BCrypt 比对密码，失败抛 BadCredentialsException，我们转成 401。签发的 token 里只有用户名、角色、签发与过期时间——没有任何敏感明文（第 2 节的纪律）。

## 7. JWT 过滤器与 @PreAuthorize

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    @SuppressWarnings("unchecked")
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);            // 没 token 不拦，交给授权环节裁决
            return;
        }
        try {
            Claims claims = jwtService.parse(header.substring(7));
            List<String> roles = (List<String>) claims.get("roles");
            var authorities = roles.stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList();
            var authentication = new UsernamePasswordAuthenticationToken(
                    claims.getSubject(), null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (JwtException | IllegalArgumentException e) {
            SecurityContextHolder.clearContext();         // 签名错、格式错、过期，一律当作未登录
        }
        chain.doFilter(request, response);
    }
}
```

三个设计决定值得说破。没带 token 时直接放行而不是立刻 401——这条过滤器只负责「能验就塞身份」，拦不拦由授权规则统一裁决，职责单一。验失败时 clearContext 后照样放行——结果一样是后续授权判它未认证。塞进 authorities 的字符串统一补 ROLE_ 前缀——这是与 hasRole 对表的约定，见坑清单。

业务侧的方法级授权：

```java
@RestController
public class BookController {

    @GetMapping("/api/books")
    public String books() {
        return "公开书单";
    }

    @GetMapping("/api/me")
    public String me(Authentication authentication) {
        return "你好，" + authentication.getName();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/api/admin/books/{id}")
    public String remove(@PathVariable Long id) {
        return "已删除 " + id;
    }
}
```

## 8. 实验链：curl 五连

```bash
# 1. 公开接口放行
curl -i http://localhost:8080/api/books
# HTTP/1.1 200

# 2. 无 token 访问受保护接口
curl -i -X DELETE http://localhost:8080/api/admin/books/1
# HTTP/1.1 401  {"code":401,"message":"未登录或凭证无效"}

# 3. 登录拿 token
curl -s -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"alice","password":"user123"}'
# {"token":"eyJhbGciOiJIUzI1NiJ9.eyJzdWIi..."}

# 4. 带 token 但角色不够（alice 是 USER，接口要 ADMIN）
curl -i -X DELETE http://localhost:8080/api/admin/books/1 \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIi..."
# HTTP/1.1 403

# 5. 篡改 token（末尾加一个字母，签名对不上）
curl -i http://localhost:8080/api/me \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIi...x"
# HTTP/1.1 401
```

401 与 403 的分野在这条链里看得很清楚：**没登录 401，登录了但没权限 403**。再做一个附加实验：把第 3 步返回 token 的 Payload 段解 base64，把 roles 改成 ["ADMIN"] 再发请求——401。这就是「签名保完整」的现场：Payload 随便改，签名算不出来。

## 9. 新旧对照：读懂旧教程的路标

WebSecurityConfigurerAdapter 在 Spring Security 6（Spring Boot 3 起随之）已移除，网上旧教程的 extends 写法直接编译不过。对照表：

| 旧教程写法（Security 5.x 前中期） | Security 6 现代写法 |
| --- | --- |
| extends WebSecurityConfigurerAdapter | @Bean SecurityFilterChain |
| 重写 configure(HttpSecurity http) | lambda 链式 http.csrf(...) |
| authorizeRequests() | authorizeHttpRequests() |
| antMatchers("/api/**") | requestMatchers("/api/**") |
| @EnableGlobalMethodSecurity(prePostEnabled = true) | @EnableMethodSecurity（默认开启 prePost） |

看到旧代码先在脑内做这张映射再动手——语义几乎一一对应，只是换了表达形式。

## 10. 坑清单

- 放行路径写错仍在链里被拦：requestMatchers 匹配的是精确路径模式，context-path、末尾斜杠、通配层级差一个字就落到 anyRequest().authenticated()；排查时把规则临时改成 anyRequest().permitAll()，二分定位是规则写错还是过滤器没放行；
- ROLE_ 前缀双重添加：hasRole("ADMIN") 底层比较的字符串是 ROLE_ADMIN；roles("USER") 与手动 new SimpleGrantedAuthority("ROLE_" + r) 都会补前缀——若库里的角色本身已带 ROLE_，再拼一次就成了 ROLE_ROLE_ADMIN；用 hasAuthority 时前缀要自己写全、不加不减；
- 过滤器顺序：JWT 过滤器必须排在授权过滤器之前，否则身份还没塞进上下文授权就开始判了；addFilterBefore(UsernamePasswordAuthenticationFilter.class) 是惯例锚点；
- token 无法主动失效：无状态的代价——服务端不知道 token 在谁手里。登出只能两路缓解：短有效期（小时级）加 refresh token 轮换，或黑名单（把要作废的 token 记进 Redis，过滤器多查一次，黑名单有效期与 token 剩余寿命对齐）；网关统一鉴权与分布式会话属于微服务篇的深水区；
- 密钥管理：硬编码进仓库等于没加密钥；从环境变量或配置中心读，并支持轮换。

## 11. 升级瞭望与官方参考

Spring Boot 4.0（2025-11-20 GA）搭载 Spring Security 7：本篇的 lambda DSL、requestMatchers、@EnableMethodSecurity 都是现行标准且继续有效，Security 7 主要移除更早弃用的 API，升级前以官方迁移指南为准。

- Spring Security 架构（过滤器链的权威描述）：https://docs.spring.io/spring-security/reference/servlet/architecture.html
- JWT 集成：https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 认证与授权各回答什么问题？为什么顺序固定？
2. JWT 三段各放什么？签名保什么不保什么？为什么手机号绝不能进 Payload？
3. 画出本项目请求经过的过滤器队列；没带 token 时 JWT 过滤器为什么直接放行而不是回 401？
4. 无状态 API 关 CSRF 的完整论证是什么？什么情况下必须把这一行删掉？
5. hasRole("ADMIN") 底层比较的字符串是什么？ROLE_ROLE_ADMIN 是怎么被造出来的？
6. 401 与 403 的分野？实验链第 2 步和第 4 步各命中哪种？
7. BCrypt 为什么同一密码每次哈希不同还能校验？它防住了「密码撞库」死法里的哪一环？
8. WebSecurityConfigurerAdapter 写法为什么编译不过？五处新旧对照能背出几处？token 主动失效的两条缓解路各是什么？
