---
order: 80
title: 文件上传下载与静态资源
description: Spring Boot 文件 IO：MultipartFile 单/多文件上传、大小与类型限制及异常路径、本地磁盘与对象存储取舍、下载与流式响应、静态资源映射，附头像上传、报表导出、前端产物托管三例与路径穿越安全
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/060-SpringMvcRestApi'
  - 'spring-boot/050-ConfigurationManagement'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'spring-boot/070-UnifiedResponseExceptionHandling'
  - 'spring-boot/190-CapstoneBlogApi'
---

## 前置知识

- [Spring MVC 与 REST API](/spring-boot/060-SpringMvcRestApi)：@RequestParam/@RequestBody 的装配机制——本篇的 MultipartFile 是它的第三种参数；
- [配置管理](/spring-boot/050-ConfigurationManagement)：会编辑 application.yml。

## 学习目标

读完本文你将能够：

1. 用 MultipartFile 接收单文件与多文件上传，说出 multipart 请求在消息转换器之外的特殊装配路径；
2. 配置上传大小限制，接住 MaxUploadSizeExceededException 返回友好错误；
3. 说清本地磁盘与对象存储的取舍，掌握「文件名不可信」的两个安全防线（路径穿越、重名覆盖）；
4. 用 ResponseEntity<Resource> 实现下载与流式响应，理解大文件不走内存的原因；
5. 用静态资源映射托管前端构建产物与用户上传文件的访问。

预计 40 分钟。

## 1. 你现在要解决什么问题

博客项目要加头像：前端把图片 POST 过来，后端存起来并能访问——中间有一串必须回答的问题：文件多大算超限？类型怎么校验？存哪里、叫什么名字、重了怎么办？下载时怎么告诉浏览器「这是文件不是网页」？以及最常见的翻车：把用户上传的文件名直接拼路径，被构造的 `../../etc/passwd` 写穿服务器。本篇把上传、存储、下载、静态托管四段链路一次讲清。

## 2. MultipartFile：multipart 请求的装配

表单带文件时，Content-Type 是 `multipart/form-data`，请求体被切成多个 part（普通字段一个 part、文件一个 part）。Spring MVC 对这类请求不走 @RequestBody 的消息转换器，而是由 **MultipartResolver** 在进入控制器前解析成 MultipartFile 对象：

```java
@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorage storage;

    FileController(FileStorage storage) { this.storage = storage; }

    // 单文件：字段名与前端 FormData 的 key 对应
    @PostMapping("/avatar")
    public Map<String, String> uploadAvatar(@RequestParam("file") MultipartFile file) throws IOException {
        String url = storage.save(file);
        return Map.of("url", url);
    }

    // 多文件：同名字段重复出现，或前端 append 多次同名 key
    @PostMapping("/gallery")
    public List<Map<String, String>> uploadGallery(@RequestParam("files") List<MultipartFile> files) {
        return files.stream()
                .map(f -> {
                    try {
                        return Map.of("url", storage.save(f));
                    } catch (IOException e) {
                        throw new IllegalStateException("保存失败", e);
                    }
                })
                .toList();
    }
}
```

细节三则：

- `@RequestParam("file")` 的名字必须与前端 `formData.append("file", blob)` 的 key 一致，不匹配时报 400（缺参数）而不是缺文件的语义——排障先对字段名；
- MultipartFile 的常用方法：`getOriginalFilename()`（客户端文件名，**不可信**，见第 4 节）、`getContentType()`（客户端声称的类型，同样不可信）、`getBytes()`/`getInputStream()`、`isEmpty()`（前端没传文件时拿到的是空文件而不是 null，判断要用 isEmpty）；
- 一次请求的所有 part 默认缓存在内存或临时文件，**临时文件在请求结束后自动清理**——自己把 InputStream 读进内存大数组再处理大文件，是 OOM 的常见来源，读流就够。

## 3. 大小与类型限制：配置与异常路径

### 3.1 大小限制

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 5MB       # 单个文件上限
      max-request-size: 20MB   # 整个请求（多文件之和）上限
```

超限时 Spring 抛 `MaxUploadSizeExceededException`——注意它抛得**很早**（解析 multipart 时），还没进你的控制器方法，@ExceptionHandler 要放在全局 Advice 里才接得住：

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleTooLarge(MaxUploadSizeExceededException e) {
        return ResponseEntity.badRequest()
                .body(Map.of("code", "FILE_TOO_LARGE", "message", "文件超过 5MB 限制"));
    }
}
```

统一响应体的规范沿用[统一响应与异常处理](/spring-boot/070-UnifiedResponseExceptionHandling)篇。另一个隐蔽坑：把限制调大到 100MB 以上时，内嵌 Tomcat 还有自己的 `server.tomcat.max-swallow-size`（默认 2MB）——超限后 Tomcat 拒绝读完请求体，客户端可能收到连接重置而不是你的友好 JSON，大文件场景要一并调整。

### 3.2 类型校验：不信 Content-Type

`file.getContentType()` 读的是客户端自己声明的头，改成 `image/png` 只需一个 curl 参数。防住「改后缀名的可执行文件」要两道：

```java
// 第一道：扩展名白名单（防新手误传，挡不住改名）
private static final Set<String> ALLOWED = Set.of("jpg", "jpeg", "png", "webp");

// 第二道：魔数校验（文件的头部字节不会说谎）
private boolean isRealImage(MultipartFile file) throws IOException {
    byte[] head = new byte[8];
    try (InputStream in = file.getInputStream()) {
        if (in.read(head) != 8) return false;
    }
    return head[0] == (byte) 0x89 && head[1] == 'P'    // PNG: 89 50 4E 47
        || (head[0] == 'F' && head[1] == 'F' && head[2] == 'D' && head[3] == '8'); // JPEG: FF D8
}
```

产品级项目直接用 Apache Tika 等探测库替代手写魔数，思路相同：**扩展名与 Content-Type 都是声明，文件头才是事实**。

## 4. 存储落地：本地磁盘与对象存储

### 4.1 本地磁盘实现与两个安全易错点

```java
@Service
public class FileStorage {

    private final Path root;

    public FileStorage(@Value("${app.upload.dir:/var/fandex/uploads}") String dir) throws IOException {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public String save(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String ext = StringUtils.getFilenameExtension(original);
        String safeName = UUID.randomUUID() + (ext != null ? "." + ext.toLowerCase() : "");

        Path target = root.resolve(safeName).normalize();
        if (!target.startsWith(root)) {          // 路径穿越防线
            throw new SecurityException("非法路径");
        }
        file.transferTo(target);
        return "/uploads/" + safeName;
    }
}
```

两个安全易错点在这段代码里各有一道防线：

- **路径穿越**：用户文件名是外部输入，`report.txt` 背后可能是 `../../etc/cron.d/evil`。防线是「服务器生成文件名」——UUID 重命名后用户输入只剩扩展名，再配 `normalize() + startsWith(root)` 双保险（即使未来有人把用户输入拼回路径，normalize 会消化 `..`，startsWith 拦下越界）。**把 originalFilename 直接拼进存储路径是一票否决级的安全 bug**；
- **重名覆盖**：两个用户都传 `avatar.png`，后者覆盖前者——数据静默丢失且互相甩锅。防线同样是 UUID 重命名（或「用户 ID + 哈希」的确定性命名）。数据库里另存 originalFilename 供下载时还原展示名。

本地存储的适用边界：单机部署、文件量小、无 CDN 需求。一旦多实例部署就立刻失效——实例 A 存的文件实例 B 看不见（负载均衡把访问打到 B），这是「头像时有时无」线上问题的标准成因。

### 4.2 对象存储的取舍

| 维度 | 本地磁盘 | 对象存储（OSS/S3/MinIO） |
| --- | --- | --- |
| 多实例部署 | 失效（各存各的） | 天然共享 |
| 持久性 | 随机器磁盘走 | 多副本，几乎不丢 |
| 成本 | 免费 | 按 GB 月付 |
| 访问速度 | 走应用带宽 | 可配 CDN 边缘分发 |
| 依赖 | 无 | 外部服务与密钥管理 |

结论一句话：**开发与演示用本地，正式产品用对象存储**。迁移成本低（接口抽象出 FileStorage，换实现类），所以第一版用本地不丢人，但接口要一开始就抽出来。对象存储直传（前端拿临时凭证直接 PUT 到 OSS，后端只发凭证）是大文件场景的进阶优化，上传流量不再过应用服务器。

## 5. 下载与流式响应

下载的关键是三件套：Content-Type 告诉浏览器是什么类型、Content-Disposition 告诉浏览器「当文件存」、响应体是流：

```java
@GetMapping("/reports/{month}")
public ResponseEntity<Resource> downloadReport(@PathVariable String month) throws IOException {
    Path file = Path.of("/var/fandex/reports", "sales-" + month + ".xlsx").normalize();
    if (!file.startsWith("/var/fandex/reports")) {   // 下载路径同样要防穿越
        return ResponseEntity.notFound().build();
    }

    String downloadName = URLEncoder.encode("销售报表-" + month + ".xlsx", StandardCharsets.UTF_8);

    return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename*=UTF-8''" + downloadName)
            .body(new FileSystemResource(file));
}
```

逐段拆解：

- `Content-Disposition: attachment` 让浏览器下载而不是尝试渲染；`filename*=UTF-8''` 是 RFC 5987 写法，解决中文文件名乱码（比 `filename=` 的老写法可靠）；
- `FileSystemResource` 是惰性Resource：响应写出时才逐块读文件，**1GB 的报表不会先占 1GB 堆内存**——这是流式响应的核心收益，返回 `byte[]` 的写法做不到；
- month 参数同样经过 normalize + startsWith 校验：下载接口是路径穿越的高发地（`GET /reports/../../application.yml` 把配置文件下载走），上传与下载两个方向都要防。

Excel 报表导出（场景）就是这条链路：服务端用 Apache POI/EasyExcel 写 workbook 到临时文件或 ByteArrayOutputStream，包成 ByteArrayResource 走同样的响应头。数据量小直接内存生成，量大写临时文件再流式返回。

## 6. 静态资源映射

### 6.1 内置静态目录与访问用户上传文件

Spring Boot 默认从 classpath 的 `/static`、`/public`、`/resources`、`/META-INF/resources` 四个目录提供静态文件。用户上传的文件在磁盘上、不在 classpath 里，要把目录映射成可访问的 URL：

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")                       // URL 前缀
                .addResourceLocations("file:/var/fandex/uploads/");      // 磁盘目录
    }
}
```

第 4 节 save() 返回的 `/uploads/8f3a....png` 由此变成可直接访问的 URL。注意目录末尾的 `/` 不能省，否则映射失效——静态文件 404 的头号原因。

### 6.2 托管前端构建产物

前后端同域部署（省掉 CORS，[Spring MVC](/spring-boot/060-SpringMvcRestApi) 篇讲过 CORS 的麻烦）时，把前端 `npm run build` 的产物（dist/）挂到 Spring Boot：

```java
@Override
public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String resourcePath, Resource location) throws IOException {
                    Resource requested = location.createRelative(resourcePath);
                    // SPA 路由兜底：文件不存在时回退到 index.html，交给前端路由
                    return requested.exists() && requested.isReadable()
                            ? requested
                            : location.createRelative("index.html");
                }
            });
}
```

重写 PathResourceResolver 的价值在 SPA（Vue/React）路由：用户直接访问 `/articles/42` 时磁盘上并没有这个文件，默认返回 404；回退到 index.html 后前端路由接管，刷新不再 404。API 与静态资源共存时注意次序：`/api/**` 的控制器优先于 `/**` 的资源映射，Spring MVC 本来就是这个次序，不要为静态资源抢 `/api` 前缀。

## 7. 动手实践

**任务一：给博客项目加头像上传。** 实现 `POST /api/users/{id}/avatar`：接收图片、白名单 + 魔数双校验、UUID 落盘、返回访问 URL，并把 URL 存到用户表。超限与类型错误返回统一错误体。提示：这正好是 [Capstone 博客 API](/spring-boot/190-CapstoneBlogApi) 的扩展点；先写异常路径的测试（上传 10MB 文件断言 400）再写正常路径。

**任务二：CSV 报表导出。** 实现一个用户列表导出接口：查询数据写 CSV，以中文文件名下载。提示：CSV 用 UTF-8 with BOM（`\uFEFF` 开头）否则 Excel 打开乱码；文件名用 `filename*=UTF-8''` 编码；数据先写临时文件再流式返回，避免大列表占堆。

**任务三：SPA 前端托管。** 用任意 Vue/React 项目 build 后，把 dist 内容放进 `src/main/resources/static`，验证「首页可访问、刷新深层路由不 404、/api 请求不被静态映射拦截」。提示：任务核心是 PathResourceResolver 的回退逻辑；故意把 index.html 改名观察差异，理解回退发生的位置。

先自己写，再对照参考实现（任务一）：

<details>
<summary>任务一参考实现（头像上传）</summary>

```java
@Service
public class AvatarStorage extends FileStorage {

    private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "webp");

    public AvatarStorage(@Value("${app.upload.dir}") String dir) throws IOException {
        super(dir);
    }

    public String saveAvatar(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new BadRequestException("未选择文件");
        }
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (ext == null || !ALLOWED_EXT.contains(ext.toLowerCase())) {
            throw new BadRequestException("仅支持 jpg/png/webp");
        }
        if (!isRealImage(file)) {
            throw new BadRequestException("文件内容不是图片");
        }
        return save(file);   // 复用父类的 UUID 命名 + 路径校验
    }
}
```

```java
@RestController
@RequestMapping("/api/users")
public class AvatarController {

    private final AvatarStorage storage;
    private final UserRepository users;

    @PostMapping("/{id}/avatar")
    public Map<String, String> upload(@PathVariable Long id,
                                      @RequestParam("file") MultipartFile file) throws IOException {
        String url = storage.saveAvatar(file);
        users.findById(id).ifPresent(u -> u.setAvatarUrl(url));
        return Map.of("url", url);
    }
}
```

验收清单：上传 6MB 图片返回统一错误体的 FILE_TOO_LARGE；把 txt 改名 .png 上传被魔数校验拦下；连传两次不同文件，两次返回不同 URL（UUID 防重名覆盖）；磁盘上查看文件名已与原名无关（路径穿越失去入口）。BadRequestException 的映射沿用统一异常篇的 Advice——存储层抛业务异常、Advice 统一转响应，控制器保持薄。
</details>

## 8. 小结

- multipart 请求由 MultipartResolver 解析成 MultipartFile，字段名对齐是 400 的头号排查项；
- 大小限制在 multipart 配置里设，超限异常在全局 Advice 接；类型校验不信 Content-Type，扩展名白名单 + 魔数双道防线；
- 存储文件名一律服务器生成（UUID），路径穿越与重名覆盖两个安全点一并解决；多实例部署时本地磁盘失效，对象存储是正式答案；
- 下载三件套：Content-Type + Content-Disposition（UTF-8 文件名）+ Resource 流式响应；下载路径同样防穿越；
- 静态资源默认四个 classpath 目录；用户上传目录用 addResourceHandlers 映射；SPA 托管要 PathResourceResolver 回退 index.html。

## 9. 相关阅读

- 参数装配与 CORS：[Spring MVC 与 REST API](/spring-boot/060-SpringMvcRestApi)
- 统一错误体与全局异常处理：[统一响应与异常处理](/spring-boot/070-UnifiedResponseExceptionHandling)
- 头像字段的落点（用户表与关联查询）：[Spring Data JPA](/spring-boot/090-SpringDataJpa)
- 多实例部署下的共享存储背景：[打包部署](/spring-boot/180-PackagingDeployment)
