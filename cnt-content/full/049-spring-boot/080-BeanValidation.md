---
order: 100
title: Bean Validation：把十几行 if 从接口里赶出去
description: 以「注册接口要校验用户名、手机号、年龄，改一条规则要全局搜索」引入：声明式校验心智模型、常用注解表与三兄弟分野、@Valid 与 @Validated 与分组校验、自定义 @PhoneNumber 校验器、嵌套校验静默失效实验，附 curl 逐条观察 400 报文。
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/060-SpringMvcRestApi'
  - 'spring-boot/070-UnifiedResponseExceptionHandling'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/070-UnifiedResponseExceptionHandling'
---

## 前置知识

- [Spring MVC 与 REST API](/spring-boot/060-SpringMvcRestApi)：知道 @RequestBody 在参数装配环节把 JSON 变对象——没读过也能跟，把「参数绑定」当成「JSON 变对象」即可；
- [统一响应与全局异常](/spring-boot/070-UnifiedResponseExceptionHandling)：知道 Result 与全局 advice——没读过也能跟，把本篇的 400 报文当成「统一出口翻译的结果」。

## 学习目标

读完本文你将能够：

1. 说清声明式校验的心智模型：规则写在哪、框架在什么时机执行、失败抛给谁；
2. 对着字段挑对注解：@NotNull、@NotEmpty、@NotBlank 三兄弟与 @Size、@Pattern、@Email、@Past 各管什么；
3. 区分 @Valid 与 @Validated，并用分组给 Create 与 Update 两套规则；
4. 让 List 请求体的每个元素都被校验，说出它走的是哪条异常通道；
5. 实现一个自定义校验注解，解释 isValid 里 null 放行的惯例；
6. 识别「嵌套对象漏 @Valid 校验静默失效」这个最高频踩坑。

预计 40 分钟，需要一个终端窗口跑 curl。

## 1. 你现在要解决什么问题

注册接口要校验：用户名 3 到 20 个字符、手机号 11 位且 1 开头、年龄 14 到 120、生日在过去。十几行 if 写在接口里，订单接口又要校验收货地址，同样规则散落各处；产品经理说「用户名放宽到 25 个字符」，你得全局搜索每一个出现的地方。更糟的是 if 校验把业务逻辑挤成配角，读代码的人分不清哪段是业务、哪段是门禁。要的是把规则声明在字段上，执行交给框架——这就是声明式校验。

## 2. 准备现场：给依赖和 DTO 定好位

先补一个必须显式声明的依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

点名一个历史坑：Boot 2.3 起，web starter 不再默认携带它。所以「注解全写了却完全没有校验效果」的第一嫌疑就是缺这个依赖，排查从它开始。

注册请求的 DTO 与控制器：

```java
public record UserCreateReq(

        @NotBlank(message = "用户名不能为空白")
        @Size(min = 3, max = 20, message = "用户名长度须在 3-20 之间")
        String username,

        @NotBlank
        @Pattern(regexp = "^1\\d{10}$", message = "手机号格式不正确")
        String phone,

        @NotNull
        @Min(value = 14, message = "年龄不能小于 14")
        @Max(120)
        Integer age,

        @Email(message = "邮箱格式不正确")
        String email,

        @NotNull
        @Past(message = "生日必须是过去的时间")
        LocalDate birthday
) {}
```

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @PostMapping
    public String create(@Valid @RequestBody UserCreateReq req) {
        return "ok: " + req.username();
    }
}
```

record 组件上的约束注解会传播到字段与构造参数，Hibernate Validator 完整支持。执行时机藏在 @Valid 与 @RequestBody 的协作里，下一节说清。

## 3. 心智模型：声明式校验的三个角色

一句话心智模型：规则与数据同居，执行与翻译外包。规则直接写在 DTO 字段上——哪里能挂规则，哪里就写着；执行不归你管——Spring MVC 在「请求体反序列化完成之后、控制器方法执行之前」这个固定时机，把对象交给校验引擎跑一遍全部规则；失败也不归你管——抛 MethodArgumentNotValidException，交给 070 篇的全局出口翻译成统一报文。

三层角色各司其职：

- Jakarta Bean Validation：规范本身，jakarta.validation 包里那套注解与接口，只定标准不管实现；
- Hibernate Validator：参考实现，真正逐条执行规则的引擎，随上面的 starter 自动带入；
- Spring MVC：触发者，负责「什么时候校验、失败了抛什么」。

分清三层，报错才知道查谁：注解语义疑惑查规范文档，执行结果不对查 Hibernate Validator，「压根没执行」查 Spring 的触发条件与依赖。

## 4. 常用注解与三兄弟分野

| 注解 | 管什么 | 值为 null 时 |
| --- | --- | --- |
| @NotNull | 任何类型不为 null | 违规 |
| @NotEmpty | 字符串、集合、Map 非空且长度大于 0 | 违规 |
| @NotBlank | 字符串去掉空白后非空 | 违规 |
| @Size(min, max) | 字符串长度或集合元素数 | 放行 |
| @Min / @Max | 数值边界 | 放行 |
| @Pattern | 正则匹配 | 放行 |
| @Email | 邮箱形状 | 放行 |
| @Past / @Future | 时间在过去 / 将来 | 放行 |

String 上的三兄弟分野要一次钉死。@NotNull 只挡 null，空串 "" 与空格 " " 都能过；@NotEmpty 挡 null 与 ""，但 " " 能过；@NotBlank 三者全挡。惯例：文本字段默认 @NotBlank，只有「允许留空但填了就得合法」的字段才用组合拳（可空交给 null 放行，形状交给 @Pattern 或 @Email）。

注意表格右列的规律：所有「值约束」对 null 一律放行。这是刻意的组合式设计——每条注解只管一种罪，「可空性」的罪统一交给 @NotNull 管，想要两道闸就叠两条注解。记住它，第 8 节自定义校验器会沿用这个惯例。

## 5. @Valid 与 @Validated：级联、容器与分组

两个注解长得像，能力不同。@Valid 是 Jakarta Bean Validation 规范注解，用在参数与字段上，独门能力是级联：对象里的对象，字段上加 @Valid 才会深入校验。@Validated 是 Spring 的注解，独门能力有二：携带分组、放在类上开启方法级校验。常用组合：入口参数用 @Valid（要级联），分组切换时换成 @Validated（@Valid 没有 groups 属性），类上 @Validated 配方法参数约束做方法级校验（第 9 节）。

先看级联怎么写、以及不写会怎样：

```java
public record AddressReq(
        @NotBlank(message = "城市不能为空") String city,
        @NotBlank String street
) {}

public record OrderCreateReq(
        @NotBlank String title,
        @NotNull @Valid AddressReq receiver    // @Valid 在这里，少了它内部规则全部静默失效
) {}
```

List 请求体的元素校验用容器元素注解——@Valid 写进泛型里：

```java
@RestController
@Validated                                        // 类上开启方法级校验，元素校验靠它触发
@RequestMapping("/api/user-batches")
public class UserBatchController {

    @PostMapping
    public int batch(@RequestBody List<@Valid UserCreateReq> items) {
        return items.size();
    }
}
```

List 本身不是 Bean，规则写在元素类型上，框架逐个元素校验。它与 @Valid 加在单个对象参数上走的是两条通道：前者抛 MethodArgumentNotValidException，后者（方法级校验，Spring 6.1 起内置于 MVC）抛 HandlerMethodValidationException——两个都要在 070 篇的 advice 里给 handler，第 7 节补上。

## 6. 分组校验：Create 与 Update 两套规则

同一个 DTO，新增不要求有 id，更新必须有 id。给规则挂组：

```java
public interface OnCreate {}
public interface OnUpdate {}

public record UserSaveReq(

        @Null(groups = OnCreate.class, message = "新增时不要携带 id")
        @NotNull(groups = OnUpdate.class, message = "更新必须携带 id")
        Long id,

        @NotBlank(groups = {OnCreate.class, OnUpdate.class}, message = "用户名不能为空白")
        String username
) {}
```

```java
@PostMapping
public String create(@Validated(OnCreate.class) @RequestBody UserSaveReq req) {
    return "created";
}

@PutMapping("/{id}")
public String update(@Validated(OnUpdate.class) @RequestBody UserSaveReq req) {
    return "updated";
}
```

一个必须知道的陷阱：指定分组后，只执行挂在该组上的规则——没挂组的注解属于默认组 Default，此时不会执行。所以要么给每条规则都挂组（如上），要么把公共规则挂成 {OnCreate.class, Default.class} 的并集，别让规则悄悄失察。

## 7. 校验失败的统一出口：接回 070 篇

校验失败只是抛异常，报文长什么样由 070 篇的 GlobalExceptionHandler 决定。把两个 handler 补进去：

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
@ResponseStatus(HttpStatus.BAD_REQUEST)
public Result<Void> handleValidation(MethodArgumentNotValidException ex) {
    String detail = ex.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + " " + err.getDefaultMessage())
            .collect(Collectors.joining("; "));
    return Result.fail("1001", detail);
}

@ExceptionHandler(HandlerMethodValidationException.class)
@ResponseStatus(HttpStatus.BAD_REQUEST)
public Result<Void> handleMethodValidation(HandlerMethodValidationException ex) {
    String detail = ex.getAllErrors().stream()
            .map(MessageSourceResolvable::getDefaultMessage)
            .collect(Collectors.joining("; "));
    return Result.fail("1001", detail);
}
```

拼法的好处：message 里带着字段名，前端能直接定位到输入框。注解上的 message 文案此刻成了对外报文，写的时候按「给用户看」的标准写。

## 8. 自定义校验：一个完整的 @PhoneNumber

内置注解不够用时，自己造一枚。三个部件：注解定义、校验器实现、使用。

```java
@Documented
@Constraint(validatedBy = PhoneNumberValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface PhoneNumber {

    String message() default "手机号格式不正确";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
```

```java
public class PhoneNumberValidator implements ConstraintValidator<PhoneNumber, String> {

    private static final Pattern PATTERN = Pattern.compile("^1\\d{10}$");

    @Override
    public void initialize(PhoneNumber annotation) {
        // 注解若带参数（如允许的号段），在这里读出来存成字段；本例规则固定，无需动作
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;    // null 一律放行：可不可空由 @NotNull 单独管，见第 4 节惯例
        }
        return PATTERN.matcher(value).matches();
    }
}
```

isValid 的两阶段先认清楚：initialize 在字段绑定时调用一次，负责从注解上拿参数；isValid 每次校验都会调用，负责裁决。null 放行是必须遵守的惯例：校验体系里「值约束不管 null」是全局契约，你的自定义注解若擅自把 null 判死，就破坏了「可空性归 @NotNull 管」的组合式设计，字段本可留空时会被冤枉。

使用即组合：

```java
@NotBlank
@PhoneNumber
String phone,
```

## 9. 方法级校验：防同事不防用户

web 层校验挡的是外部输入，但 service 方法也会被同事用错——传 null、传空串。@Validated 放类上、约束放参数上，Spring 用 AOP 代理在方法进入前校验：

```java
@Service
@Validated
public class TaskService {

    public String rename(@NotNull Long id,
                         @NotBlank @Size(max = 50, message = "标题最长 50 字") String title) {
        return "ok";
    }
}
```

与 web 层校验的分野：web 层管「外部输入的形状」，方法级校验管「内部调用的契约」；失败抛 jakarta.validation.ConstraintViolationException，同样要在 advice 里翻译。两个限制记牢：它靠 AOP 代理实现，同类内部 this 调用绕过代理不触发；它的报错时机在方法进入前，拿不到 BindingResult 那套字段级详情。

## 10. 实验：curl 逐条踩，再制造一次静默失效

```bash
# 合法请求：200
curl -i -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"ada","phone":"13800138000","age":30,"email":"ada@ex.com","birthday":"1995-06-01"}'

# 用户名是空白：400
curl -i -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"  ","phone":"13800138000","age":30,"birthday":"1995-06-01"}'

# 手机号少一位：400
curl -i -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"ada","phone":"1380013800","age":30,"birthday":"1995-06-01"}'

# 生日在未来：400
curl -i -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"ada","phone":"13800138000","age":30,"birthday":"2995-06-01"}'
```

用户名那一条的预期报文（以你的 handler 拼法为准）：

```text
HTTP/1.1 400
Content-Type: application/json

{"code":"1001","message":"username 用户名长度须在 3-20 之间","data":null}
```

重头戏，静默失效实验。把 OrderCreateReq 里 receiver 字段上的 @Valid 临时删掉，只留 @NotNull，然后发一个 city 为空串的请求：

```bash
curl -i -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"title":"买键盘","receiver":{"city":"","street":"某某路 1 号"}}'
```

结果：200，请求通过——@NotNull 看到 receiver 非 null 就放行了，内部的 @NotBlank 一条都没执行，而且没有任何报错或警告。把 @Valid 加回去，同一个请求立刻 400，报文里是 receiver.city 城市不能为空。这就是本篇最贵的实验结论：级联校验是显式声明，你不写 @Valid，框架不会替你递归进去。

## 自检

1. @NotNull、@NotEmpty、@NotBlank 用在 String 上各是什么行为？" " 这个值三个分别过不过？
2. @Email 对 null 判不判违规？这套「值约束放行 null」的设计惯例叫什么？
3. 嵌套对象字段不加 @Valid 会发生什么？为什么它不报错而是静默通过？
4. @Valid 与 @Validated 各自的独门能力是什么？分组校验为什么必须用 @Validated？
5. 「注解全写了却完全没校验」，第一嫌疑是什么？历史原因是什么？
6. MethodArgumentNotValidException 与 HandlerMethodValidationException 分别从哪条路抛出？
7. 自定义校验器的 isValid 里为什么对 null 返回 true？擅自判死 null 会破坏什么？
8. service 类上加 @Validated 后，同类内部方法互调会触发校验吗？为什么？
