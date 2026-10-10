---
order: 90
title: 统一响应与全局异常：让前端只需要写一种解析逻辑
description: 以「同一项目里有的接口返回裸对象、有的把异常堆栈甩给前端」的团队日常引入：Result 契约与业务码分段、业务码与 HTTP 状态码双轨制、BusinessException 加 @RestControllerAdvice 落地、报文与日志的分野，附从裸奔到统一的对照实验。
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/060-SpringMvcRestApi'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'spring-boot/080-BeanValidation'
  - 'spring-boot/120-SpringSecurityJwt'
---

## 前置知识

- [Spring MVC 与 REST API](/spring-boot/060-SpringMvcRestApi)：知道 DispatcherServlet 在控制器外面守着、HandlerExceptionResolver 是异常的接盘人——没读过也能跟，把它当成「Spring 自带的异常出口」即可；
- [Java 日志系统](/java/900-JavaLogSystem)：知道 log.error 是往日志里记一笔——没读过也能跟，本篇只用这一句。

## 学习目标

读完本文你将能够：

1. 定义团队级的统一响应体 Result，并用分段约定管住业务码的膨胀；
2. 说清业务码与 HTTP 状态码是给谁看的两套体系，并为一个场景给出两者的正确搭配；
3. 设计 BusinessException 与全局兜底的异常体系，说清「业务层抛、web 层翻译」的分工；
4. 用 @RestControllerAdvice 落地三类 handler，并解释兜底 handler 为什么日志留全栈、对外只给模糊文案；
5. 在 @ResponseStatus 与 ResponseStatusException 之间做出正确选择；
6. 列出 advice 不生效的三种常见原因并逐一排查。

预计 40 分钟，需要一个终端窗口跑 curl。

## 1. 你现在要解决什么问题

接手一个半年项目：用户接口返回裸对象，订单接口返回手拼的 map，商品接口出错时前端直接收到一大坨 HTML 错误页。前端同学为每个接口写一种解析逻辑，判断成功的条件都不一样；有人的代码里至今留着「响应里有没有 stacktrace 字段」的判断——因为某个版本真的把堆栈吐出去过。这不是代码风格问题，是缺了一纸契约：所有接口用同一种形状说话，成功长一个样，失败也长一个样，出错的翻译权集中在一处。本篇就立这份契约：统一响应体定形状，业务码定语义，@RestControllerAdvice 定异常的统一出口。

## 2. 准备现场：一个会成功也会翻车的用户接口

依赖沿用上一篇的 spring-boot-starter-web 即可，直接加两个类：

```java
@Service
public class UserService {

    private final Set<String> usernames = ConcurrentHashMap.newKeySet();

    public String register(String username) {
        if (usernames.contains(username)) {
            throw new IllegalStateException("Duplicate: " + username);   // 先故意用错异常，后面改
        }
        usernames.add(username);
        return username;
    }
}
```

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @PostMapping
    public String register(@RequestParam String username) {
        return service.register(username);
    }

    @GetMapping("/bug")
    public String bug() {
        String s = null;
        return s.length() + "";     // 故意埋一个 NPE，第 8 节实验要用
    }
}
```

此刻用 curl 打 register 与 bug，返回的都是 Boot 默认形状——先记住「裸奔」的样子，后面每一步都拿它对照。

## 3. 统一响应体：先立契约

契约三要素：业务码 code、给人和给前端提示用的 message、承载数据的 data。一个类定死全项目的应答形状：

```java
public record Result<T>(String code, String message, T data) {

    public static <T> Result<T> ok(T data) {
        return new Result<>("0000", "success", data);
    }

    public static Result<Void> fail(String code, String message) {
        return new Result<>(code, message, null);
    }
}
```

业务码从第一天就要分段，否则三个月后满屏魔法数字没人敢动。一套够用的分段约定：

| 分段 | 含义 | 示例 |
| --- | --- | --- |
| 0000 | 成功 | 0000 |
| 1xxx | 通用错误（跨业务域） | 1001 参数不合法、1002 资源不存在、1500 系统内部错误 |
| 2xxx | 用户域 | 2101 用户名已存在、2102 密码错误 |
| 3xxx | 订单域 | 3101 库存不足、3102 订单状态不允许支付 |

分段的价值在维护：看到 3 开头就知道去订单模块找定义；新增错误先问「属于哪个域」，不导致码表失控。

## 4. 业务码与 HTTP 状态码：两套体系，都要正确

常见的争吵是「业务失败到底返回 200 还是 4xx」。先分清两套码各服务谁：HTTP 状态码是传输与运维层的语言，网关、监控、重试中间件按它行动；业务码是业务层的语言，前端按它走分支。谁都不该替代谁：

| 场景 | HTTP 状态码 | 业务码 | 谁在看它 |
| --- | --- | --- | --- |
| 查询成功 | 200 | 0000 | 前端拿 data 渲染 |
| 用户名已存在 | 200 | 2101 | 前端按 code 弹提示 |
| 参数不合法 | 400 | 1001 | 前端按 message 定位字段 |
| 未登录 | 401 | 1101 | 网关拦截、前端跳登录页 |
| 服务端 bug | 500 | 1500 | 监控告警，前端只见文案 |

「都要正确」的反面教材：把库存不足伪装成 500，告警群被打爆，真故障被淹没；把真 bug 伪装成 200 加个 code，监控对故障视而不见。团队内先定纪律（本项目取：业务失败一般 HTTP 200 加业务码，系统错误老实 500，认证问题 401），然后全项目一致——纪律本身可以争，不一致不能忍。

## 5. 异常体系：业务层抛，web 层翻译

三条分层原则。第一，业务异常在业务层抛：只有 service 知道「用户名已存在」是业务规则被破坏，所以它带业务码、message 是面向用户的中文。第二，报文在 web 层统一翻译：异常怎么变成 Result、配什么 HTTP 状态，由全局处理器一家说了算，service 不掺和。第三，谁都不许吞异常：catch 完返回 null 或空集合，现场就没了，线上只剩「接口返回了空」这种无头案。要记日志就在抛出点或翻译点记，别两头都记。

给业务异常定型：

```java
public class BusinessException extends RuntimeException {

    private final String code;

    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
```

UserService 里的 IllegalStateException 换掉：

```java
throw new BusinessException("2101", "用户名已存在");
```

框架自己抛的异常也要单独归类，它们是有家族的：HttpMessageNotReadableException（请求体读不了）、MethodArgumentNotValidException（参数校验失败，080 篇主角）、HttpRequestMethodNotSupportedException（方法不支持）、NoResourceFoundException（找不到资源）。每类给一个专属 handler 才能给准确文案，兜底 Exception 只收没人认领的。

## 6. @RestControllerAdvice 落地：把翻译权集中到一处

@RestControllerAdvice 是 @ControllerAdvice 加 @ResponseBody：前者声明「我来管所有控制器的异常」，后者保证 handler 的返回值直接序列化进响应体。三个 handler 按序落地：

```java
package com.example.demo;

import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusiness(BusinessException ex) {
        return Result.fail(ex.getCode(), ex.getMessage());   // 不加注解默认 HTTP 200
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + " " + err.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return Result.fail("1001", detail);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<Void> handleUnknown(Exception ex) {
        log.error("unhandled exception", ex);                // 全栈留给日志
        return Result.fail("1500", "系统开小差了，请稍后重试"); // 对外只给模糊提示
    }
}
```

兜底 handler 的两个「必须」是一枚硬币的两面：必须 log.error 带全栈——排查靠它，翻译环节是记日志的最后一个好位置；必须对外只给模糊文案——具体异常信息对前端毫无用处，对攻击者却是地图（下一节实验让你亲眼看）。MethodArgumentNotValidException 的 handler 此刻还不会被触发，等 080 篇把校验打开它就上岗。

## 7. 状态码的两种声明：@ResponseStatus 与 ResponseStatusException

场景一，一类异常永远对应一个状态码：在异常类上标 @ResponseStatus(HttpStatus.NOT_FOUND)，谁抛谁就是 404，声明式，一次定义处处生效。场景二，不值得为它专门建类的临时语义：直接抛 ResponseStatusException（060 篇的 404 就是这么来的）：

```java
throw new ResponseStatusException(HttpStatus.CONFLICT, "订单状态不允许取消");
```

两者与 advice 的关系：ResponseStatusException 也会进 HandlerExceptionResolver 链，advice 里恰好有认领它的 handler 就走你的，没有就用它自带的翻译（状态码加默认报文）。它是「快速通道」，不是绕过统一契约的后门——对外形状仍应尽量归拢到 Result。

## 8. 实验：从裸奔到统一的三幕剧

第一幕，裸奔。先临时打开堆栈输出（不少团队为了「方便前端报障」真把它带上了生产，我们用它看看泄漏长什么样）：

```yaml
server:
  error:
    include-stacktrace: always   # 只为演示，看完立刻删
```

```bash
curl -i http://localhost:8080/api/users/bug
```

```text
HTTP/1.1 500
Content-Type: application/json

{"timestamp":"2026-10-03T10:15:30.123+00:00","status":500,
 "error":"Internal Server Error","path":"/api/users/bug",
 "trace":"java.lang.NullPointerException: Cannot invoke \"String.length()\"
 because \"s\" is null
  at com.example.demo.UserController.bug(UserController.java:24) ..."}
```

观察两点：前端收到一大坨无法解析的 trace 文本，解析逻辑根本没法写；堆栈里有类名、方法、行号、包结构——攻击者拿它对照版本找已知漏洞，等于把家底递出去。Boot 默认其实是藏堆栈的（include-stacktrace 默认 never），这正说明默认值是对的，别手贱改。

第二幕，统一。删掉上面的 yml 配置，加上第 6 节的 GlobalExceptionHandler，重启后再打同一个接口：

```text
HTTP/1.1 500
Content-Type: application/json

{"code":"1500","message":"系统开小差了，请稍后重试","data":null}
```

报文干净了，再看服务端日志——全栈原样躺在里面。排查能力零损失，泄漏归零。

第三幕，业务码透传。连发两次注册：

```bash
curl -i -X POST "http://localhost:8080/api/users?username=ada"
curl -i -X POST "http://localhost:8080/api/users?username=ada"
```

```text
HTTP/1.1 200    {"code":"0000","message":"success","data":"ada"}
HTTP/1.1 200    {"code":"2101","message":"用户名已存在","data":null}
```

service 里一句 throw，报文里就是标准业务码——业务层抛、web 层翻译的分工在报文里看得见。

## 9. 边界与坑

就近优先。控制器类内部自己写的 @ExceptionHandler 优先于全局 advice；异常类型匹配取最具体的——NPE 平时落进 Exception 兜底，但如果有人写了 NullPointerException 的 handler 就归它。兜底是收容所，不是第一响应人。

advice 不生效的三种常见原因。一，类不在主类所在包及子包内，没被组件扫描到——它本质也是个 Bean；二，抛出去的产物是 Error 而非 Exception，@ExceptionHandler(Exception.class) 接不到 OutOfMemoryError；三，异常压根不走 MVC 通道：Filter 里抛的（发生在 DispatcherServlet 之前）、@Async 与定时任务线程里的（没有请求上下文，150 篇展开）、消息监听这类非 Web 入口。

一个隐蔽坑：返回值序列化阶段（advice 已处理完、Jackson 正在写响应）再出异常，此时响应头已提交，翻译不动了。所以 handler 本身要简单可靠，别在里面再调可能失败的重逻辑。

## 自检

1. 为什么对外绝不能返回堆栈？一次泄漏具体送出去了哪些信息？
2. @RestControllerAdvice 的工作时机在请求链的哪个环节？（提示：控制器抛异常之后、响应写出之前）
3. 业务码 0000 与 HTTP 200 是一回事吗？它们分别给谁看、各管什么？
4. 兜底 handler 里为什么必须 log.error 全栈，却只回给前端一句模糊文案？
5. 控制器类里自己写了 @ExceptionHandler，全局 advice 还有机会处理这个控制器的异常吗？
6. @Async 线程里抛的异常会被全局 advice 捕获吗？为什么？
7. BusinessException 应该在哪一层抛出、在哪一层翻译成报文？为什么不能在 service 里 catch 完返回 null？
8. include-stacktrace=always 为什么绝不能带上生产？Boot 对堆栈的默认策略是什么？
