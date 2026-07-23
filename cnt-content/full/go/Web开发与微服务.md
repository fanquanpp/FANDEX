---
order: 10
title: 'Go Web 开发与微服务'
module: go
category: Go
difficulty: advanced
description: 'net/http 标准库、Gin/Echo/Fiber 框架、中间件模式、RESTful API、gRPC、数据库操作、项目结构与容器化部署。'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/泛型
  - go/标准库与工具链
  - go/切片原理
  - go/Map原理
prerequisites: []
---

## 1. net/http 标准库

### 1.1 基础 HTTP 服务器

```go
func main() {
    // 简单路由
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello, World!")
    })

    http.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodGet:
            listUsers(w, r)
        case http.MethodPost:
            createUser(w, r)
        default:
            w.WriteHeader(http.StatusMethodNotAllowed)
        }
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### 1.2 Go 1.22+ 增强路由

```go
mux := http.NewServeMux()

// 方法 + 路径模式
mux.HandleFunc("GET /users", listUsers)
mux.HandleFunc("POST /users", createUser)
mux.HandleFunc("GET /users/{id}", getUser)
mux.HandleFunc("PUT /users/{id}", updateUser)
mux.HandleFunc("DELETE /users/{id}", deleteUser)

// 路径参数
func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    json.NewEncoder(w).Encode(map[string]string{
        "id":   id,
        "name": "User " + id,
    })
}

// 尾部斜杠匹配
mux.HandleFunc("GET /files/{path...}", getFiles) // 匹配 /files/a/b/c

log.Fatal(http.ListenAndServe(":8080", mux))
```

### 1.3 自定义 Handler

```go
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}

type APIHandler struct {
    users map[string]*User
}

func (h *APIHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    // 路由逻辑...
}

// 使用
handler := &APIHandler{users: make(map[string]*User)}
http.ListenAndServe(":8080", handler)
```

### 1.4 HTTP 中间件

```go
// 中间件函数签名
type Middleware func(http.Handler) http.Handler

// 日志中间件
func Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}

// 恢复中间件
func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("panic: %v\n%s", err, debug.Stack())
                http.Error(w, "Internal Server Error", 500)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

// CORS 中间件
func CORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if r.Method == "OPTIONS" {
            w.WriteHeader(204)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// 链式中间件
func Chain(h http.Handler, mws ...Middleware) http.Handler {
    for i := len(mws) - 1; i >= 0; i-- {
        h = mws[i](h)
    }
    return h
}

// 使用
mux := http.NewServeMux()
mux.HandleFunc("/", handler)
chain := Chain(mux, Logging, Recovery, CORS)
http.ListenAndServe(":8080", chain)
```

## 2. Gin 框架

### 2.1 基础用法

```go
import "github.com/gin-gonic/gin"

func main() {
    r := gin.Default() // 包含 Logger 和 Recovery 中间件

    // 路由
    r.GET("/ping", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "pong"})
    })

    // 路径参数
    r.GET("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(200, gin.H{"id": id})
    })

    // 查询参数
    r.GET("/search", func(c *gin.Context) {
        q := c.Query("q")
        page := c.DefaultQuery("page", "1")
        c.JSON(200, gin.H{"query": q, "page": page})
    })

    // 请求体绑定
    r.POST("/users", func(c *gin.Context) {
        var user User
        if err := c.ShouldBindJSON(&user); err != nil {
            c.JSON(400, gin.H{"error": err.Error()})
            return
        }
        c.JSON(201, user)
    })

    r.Run(":8080")
}
```

### 2.2 路由分组

```go
func main() {
    r := gin.Default()

    // API 版本分组
    v1 := r.Group("/api/v1")
    {
        v1.GET("/users", listUsers)
        v1.POST("/users", createUser)
        v1.GET("/users/:id", getUser)
    }

    v2 := r.Group("/api/v2")
    {
        v2.GET("/users", listUsersV2)
    }

    // 中间件分组
    auth := r.Group("/admin", AuthMiddleware())
    {
        auth.GET("/dashboard", dashboard)
        auth.GET("/settings", settings)
    }

    r.Run()
}
```

### 2.3 Gin 中间件

```go
// 自定义中间件
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
            return
        }
        // 验证 token...
        userID, err := validateToken(token)
        if err != nil {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid token"})
            return
        }
        c.Set("userID", userID)
        c.Next()
    }
}

// 使用
r.Use(AuthMiddleware())
```

## 3. Echo 框架

```go
import "github.com/labstack/echo/v4"

func main() {
    e := echo.New()

    // 中间件
    e.Use(middleware.Logger())
    e.Use(middleware.Recover())
    e.Use(middleware.CORS())

    // 路由
    e.GET("/", func(c echo.Context) error {
        return c.String(http.StatusOK, "Hello, World!")
    })

    e.GET("/users/:id", func(c echo.Context) error {
        id := c.Param("id")
        return c.JSON(200, map[string]string{"id": id})
    })

    // 请求绑定
    e.POST("/users", func(c echo.Context) error {
        u := new(User)
        if err := c.Bind(u); err != nil {
            return echo.NewHTTPError(400, err.Error())
        }
        if err := c.Validate(u); err != nil {
            return echo.NewHTTPError(400, err.Error())
        }
        return c.JSON(201, u)
    })

    e.Logger.Fatal(e.Start(":8080"))
}
```

## 4. RESTful API 设计

### 4.1 标准 RESTful 路由

```
GET    /api/v1/users          — 列表
POST   /api/v1/users          — 创建
GET    /api/v1/users/:id      — 详情
PUT    /api/v1/users/:id      — 全量更新
PATCH  /api/v1/users/:id      — 部分更新
DELETE /api/v1/users/:id      — 删除
```

### 4.2 统一响应格式

```go
type Response struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Data    any    `json:"data,omitempty"`
}

type PageResponse struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Data    any    `json:"data"`
    Total   int64  `json:"total"`
    Page    int    `json:"page"`
    Size    int    `json:"size"`
}

func Success(c *gin.Context, data any) {
    c.JSON(200, Response{Code: 0, Message: "success", Data: data})
}

func Error(c *gin.Context, status int, msg string) {
    c.JSON(status, Response{Code: status, Message: msg})
}
```

### 4.3 请求验证

```go
type CreateUserReq struct {
    Name  string `json:"name" binding:"required,min=2,max=50"`
    Email string `json:"email" binding:"required,email"`
    Age   int    `json:"age" binding:"required,gte=0,lte=150"`
}

func createUser(c *gin.Context) {
    var req CreateUserReq
    if err := c.ShouldBindJSON(&req); err != nil {
        Error(c, 400, err.Error())
        return
    }
    // 处理请求...
    Success(c, req)
}
```

## 5. gRPC

### 5.1 定义 Protobuf

```protobuf
// api/user.proto
syntax = "proto3";
package api;

option go_package = "github.com/example/api";

service UserService {
    rpc GetUser(GetUserRequest) returns (GetUserResponse);
    rpc ListUsers(ListUsersRequest) returns (stream User);
    rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
}

message GetUserRequest {
    string id = 1;
}

message GetUserResponse {
    User user = 1;
}

message User {
    string id = 1;
    string name = 2;
    string email = 3;
}

message ListUsersRequest {
    int32 page = 1;
    int32 size = 2;
}

message CreateUserRequest {
    string name = 1;
    string email = 2;
}

message CreateUserResponse {
    User user = 1;
}
```

### 5.2 服务端实现

```go
type server struct {
    pb.UnimplementedUserServiceServer
}

func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    user, err := db.GetUser(ctx, req.Id)
    if err != nil {
        return nil, status.Errorf(codes.NotFound, "user %s not found", req.Id)
    }
    return &pb.GetUserResponse{User: &pb.User{
        Id:    user.ID,
        Name:  user.Name,
        Email: user.Email,
    }}, nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer(
        grpc.UnaryInterceptor(interceptor.Logging),
    )
    pb.RegisterUserServiceServer(s, &server{})
    log.Fatal(s.Serve(lis))
}
```

### 5.3 客户端调用

```go
conn, _ := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
defer conn.Close()

client := pb.NewUserServiceClient(conn)

resp, err := client.GetUser(ctx, &pb.GetUserRequest{Id: "42"})
if err != nil {
    st, ok := status.FromError(err)
    fmt.Println(st.Code(), st.Message())
}
```

## 6. 数据库操作

### 6.1 database/sql

```go
import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
)

db, err := sql.Open("mysql", "user:password@tcp(localhost:3306)/dbname?parseTime=true")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

// 配置连接池
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(5 * time.Minute)

// 查询单行
var user User
err = db.QueryRowContext(ctx, "SELECT id, name, email FROM users WHERE id = ?", id).
    Scan(&user.ID, &user.Name, &user.Email)

// 查询多行
rows, err := db.QueryContext(ctx, "SELECT id, name FROM users LIMIT ?", limit)
defer rows.Close()
for rows.Next() {
    var u User
    rows.Scan(&u.ID, &u.Name)
}

// 插入
result, err := db.ExecContext(ctx,
    "INSERT INTO users (name, email) VALUES (?, ?)", name, email)
id, _ := result.LastInsertId()

// 更新
result, err := db.ExecContext(ctx,
    "UPDATE users SET name = ? WHERE id = ?", name, id)
affected, _ := result.RowsAffected()

// 事务
tx, _ := db.BeginTx(ctx, nil)
_, err = tx.ExecContext(ctx, "UPDATE accounts SET balance = balance - ? WHERE id = ?", amount, fromID)
if err != nil {
    tx.Rollback()
    return err
}
_, err = tx.ExecContext(ctx, "UPDATE accounts SET balance = balance + ? WHERE id = ?", amount, toID)
if err != nil {
    tx.Rollback()
    return err
}
tx.Commit()
```

### 6.2 GORM

```go
import "gorm.io/gorm"

type User struct {
    ID        uint           `gorm:"primaryKey" json:"id"`
    Name      string         `gorm:"size:100;not null" json:"name"`
    Email     string         `gorm:"size:255;uniqueIndex" json:"email"`
    Age       int            `json:"age"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// 连接
db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})

// 自动迁移
db.AutoMigrate(&User{})

// CRUD
db.Create(&User{Name: "Alice", Email: "alice@example.com", Age: 30})

var user User
db.First(&user, 1)                           // 按主键
db.First(&user, "email = ?", "alice@ex.com") // 条件查询

db.Model(&user).Update("age", 31)
db.Model(&user).Updates(User{Name: "Alice2", Age: 31})
db.Delete(&user) // 软删除

// 查询构建器
var users []User
db.Where("age > ?", 20).Order("name").Limit(10).Find(&users)
db.Select("name, age").Where("name LIKE ?", "%ali%").Find(&users)

// 预加载关联
db.Preload("Orders").Find(&users)

// 分页
func Paginate(page, size int) func(db *gorm.DB) *gorm.DB {
    return func(db *gorm.DB) *gorm.DB {
        offset := (page - 1) * size
        return db.Offset(offset).Limit(size)
    }
}

var users []User
var total int64
db.Model(&User{}).Count(&total)
db.Scopes(Paginate(1, 10)).Find(&users)
```

## 7. 项目结构

### 7.1 标准项目布局

```
myapp/
├── cmd/
│   └── server/
│       └── main.go          # 入口
├── internal/
│   ├── handler/             # HTTP 处理器
│   │   └── user.go
│   ├── service/             # 业务逻辑
│   │   └── user.go
│   ├── repository/          # 数据访问
│   │   └── user.go
│   ├── model/               # 数据模型
│   │   └── user.go
│   └── middleware/           # 中间件
│       └── auth.go
├── pkg/                     # 可复用公共库
│   ├── response/
│   └── validator/
├── api/                     # API 定义
│   └── proto/
├── configs/                 # 配置文件
│   └── config.yaml
├── migrations/              # 数据库迁移
├── scripts/                 # 脚本
├── go.mod
├── go.sum
├── Makefile
└── Dockerfile
```

### 7.2 分层架构

```go
// handler 层 — 处理 HTTP 请求/响应
type UserHandler struct {
    svc *UserService
}

func (h *UserHandler) Get(c *gin.Context) {
    id := c.Param("id")
    user, err := h.svc.Get(c.Request.Context(), id)
    if err != nil {
        Error(c, 500, err.Error())
        return
    }
    Success(c, user)
}

// service 层 — 业务逻辑
type UserService struct {
    repo UserRepository
}

func (s *UserService) Get(ctx context.Context, id string) (*User, error) {
    return s.repo.FindByID(ctx, id)
}

// repository 层 — 数据访问
type UserRepository interface {
    FindByID(ctx context.Context, id string) (*User, error)
    Create(ctx context.Context, user *User) error
}

// 依赖注入
func main() {
    db, _ := gorm.Open(mysql.Open(dsn))
    repo := NewGormUserRepository(db)
    svc := NewUserService(repo)
    handler := NewUserHandler(svc)

    r := gin.Default()
    r.GET("/users/:id", handler.Get)
    r.Run()
}
```

## 8. 配置管理

```go
// 使用 Viper 管理配置
import "github.com/spf13/viper"

type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    Redis    RedisConfig    `mapstructure:"redis"`
}

type ServerConfig struct {
    Port int    `mapstructure:"port"`
    Mode string `mapstructure:"mode"`
}

type DatabaseConfig struct {
    DSN             string `mapstructure:"dsn"`
    MaxOpenConns    int    `mapstructure:"max_open_conns"`
    MaxIdleConns    int    `mapstructure:"max_idle_conns"`
    ConnMaxLifetime int    `mapstructure:"conn_max_lifetime"`
}

func LoadConfig() (*Config, error) {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath("./configs")
    viper.AutomaticEnv() // 读取环境变量

    if err := viper.ReadInConfig(); err != nil {
        return nil, err
    }

    var cfg Config
    if err := viper.Unmarshal(&cfg); err != nil {
        return nil, err
    }
    return &cfg, nil
}
```

## 9. 部署与容器化

### 9.1 Dockerfile（多阶段构建）

```dockerfile
# 构建阶段
FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# 运行阶段
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/configs ./configs

EXPOSE 8080
CMD ["./server"]
```

### 9.2 Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '8080:8080'
    environment:
      - DB_DSN=user:pass@tcp(mysql:3306)/app?parseTime=true
      - REDIS_ADDR=redis:6379
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: app
    ports:
      - '3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  mysql_data:
```

### 9.3 Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 3
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
  type: LoadBalancer
```

### 9.4 健康检查

```go
r := gin.Default()

r.GET("/healthz", func(c *gin.Context) {
    // 检查数据库连接
    if err := db.Ping(); err != nil {
        c.JSON(503, gin.H{"status": "unhealthy", "db": "down"})
        return
    }
    c.JSON(200, gin.H{"status": "healthy"})
})

r.GET("/readyz", func(c *gin.Context) {
    c.JSON(200, gin.H{"ready": true})
})
```
