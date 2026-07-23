---
order: 75
title: Go与配置管理
module: go
category: Go
difficulty: intermediate
description: Viper与配置
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与代码生成
  - go/Go与依赖注入
  - go/Go与日志
  - go/Go与模板
prerequisites:
  - go/概述与环境配置
---

## 概述

配置管理是应用程序读取和管理运行参数的机制。一个应用通常需要数据库连接地址、端口号、日志级别等配置信息。这些信息不应该硬编码在代码中，而应该从配置文件、环境变量或远程配置中心读取。Go 社区最流行的配置管理库是 Viper，它支持多种配置格式和来源，可以灵活组合使用。

## 基础概念

在开始编码之前，需要理解配置管理的几个核心概念：

- **配置文件**：存储配置信息的文件，常见格式有 JSON、YAML、TOML、ENV 等。
- **环境变量**：操作系统级别的变量，适合存储敏感信息（如密码）和部署相关参数。
- **配置优先级**：当同一配置项在多个来源中存在时，Viper 按优先级选择：命令行标志 > 环境变量 > 配置文件 > 默认值。
- **热加载**：运行时监听配置文件变化，自动重新加载，无需重启应用。
- **配置键**：Viper 使用点号分隔的路径访问嵌套配置，如 `database.host`。

## 快速上手

首先安装 Viper：

```bash
go get github.com/spf13/viper
```

最简单的配置读取示例：

```go
package main

import (
    "fmt"
    "github.com/spf13/viper"
)

func main() {
    // 设置默认值
    viper.SetDefault("server.port", 8080)
    viper.SetDefault("server.mode", "debug")

    // 设置配置文件名和路径
    viper.SetConfigName("config")   // 文件名（不含扩展名）
    viper.AddConfigPath(".")        // 当前目录
    viper.AddConfigPath("./config") // config 目录

    // 读取配置文件
    err := viper.ReadInConfig()
    if err != nil {
        fmt.Println("未找到配置文件，使用默认值:", err)
    }

    // 读取配置项
    port := viper.GetInt("server.port")
    mode := viper.GetString("server.mode")
    dbURL := viper.GetString("database.url")

    fmt.Printf("端口: %d, 模式: %s, 数据库: %s\n", port, mode, dbURL)
}
```

对应的 `config.yaml` 文件：

```yaml
server:
  port: 9090
  mode: release
database:
  url: 'postgres://localhost:5432/mydb'
  max_connections: 20
```

## 详细用法

### 1. 支持多种配置格式

Viper 自动根据文件扩展名识别格式：

```go
viper.SetConfigName("config") // 不含扩展名
viper.AddConfigPath(".")

// Viper 会依次尝试：config.json, config.yaml, config.toml, config.ini 等
viper.ReadInConfig()
```

也可以显式指定格式：

```go
viper.SetConfigType("yaml") // 强制使用 YAML 格式
```

### 2. 环境变量

环境变量适合存储敏感信息和部署相关参数：

```go
import "github.com/spf13/viper"

// 启用环境变量支持
viper.AutomaticEnv()

// 设置环境变量前缀，避免冲突
viper.SetEnvPrefix("APP")

// 环境变量名映射（默认用下划线替代点号）
// APP_SERVER_PORT 对应 server.port
// APP_DATABASE_URL 对应 database.url

// 自定义环境变量名映射
viper.BindEnv("database.url", "DB_CONNECTION_STRING")
```

运行时设置环境变量：

```bash
# Linux/Mac
export APP_SERVER_PORT=3000
export DB_CONNECTION_STRING="postgres://prod-db:5432/mydb"

# Windows
set APP_SERVER_PORT=3000
set DB_CONNECTION_STRING=postgres://prod-db:5432/mydb
```

### 3. 命令行参数

配合 cobra 库使用命令行参数：

```go
import "github.com/spf13/cobra"

var rootCmd = &cobra.Command{
    Use: "myapp",
    Run: func(cmd *cobra.Command, args []string) {
        // 命令行参数会自动绑定到 viper
        fmt.Println("端口:", viper.GetInt("port"))
    },
}

func init() {
    // 定义命令行标志并绑定到 viper
    rootCmd.Flags().IntP("port", "p", 8080, "服务端口")
    viper.BindPFlag("port", rootCmd.Flags().Lookup("port"))
}
```

### 4. 读取嵌套配置

Viper 使用点号路径访问嵌套配置：

```yaml
# config.yaml
database:
  primary:
    host: localhost
    port: 5432
  replica:
    host: replica-db
    port: 5433
```

```go
// 读取嵌套配置
primaryHost := viper.GetString("database.primary.host")
primaryPort := viper.GetInt("database.primary.port")
replicaHost := viper.GetString("database.replica.host")
```

### 5. 将配置反序列化到结构体

将整个配置映射到 Go 结构体，类型更安全：

```go
type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
}

type ServerConfig struct {
    Port int    `mapstructure:"port"`
    Mode string `mapstructure:"mode"`
}

type DatabaseConfig struct {
    URL            string `mapstructure:"url"`
    MaxConnections int    `mapstructure:"max_connections"`
}

var cfg Config
err := viper.Unmarshal(&cfg)
if err != nil {
    panic(err)
}

fmt.Printf("端口: %d, 数据库: %s\n", cfg.Server.Port, cfg.Database.URL)
```

### 6. 热加载配置

监听配置文件变化，自动重新加载：

```go
viper.WatchConfig()
viper.OnConfigChange(func(e fsnotify.Event) {
    fmt.Println("配置文件已变更:", e.Name)
    // 重新读取配置并更新应用状态
    reloadConfig()
})
```

### 7. 写入配置

Viper 也可以写入配置文件：

```go
// 设置配置值
viper.Set("server.port", 3000)

// 写入文件
viper.WriteConfig()             // 写回当前配置文件
viper.SafeWriteConfig()         // 仅在文件不存在时写入
viper.WriteConfigAs("new.yaml") // 写入指定文件
```

### 8. 多配置文件合并

```go
// 读取主配置
viper.SetConfigName("config")
viper.ReadInConfig()

// 合并覆盖配置（如生产环境专用配置）
viper.SetConfigName("config.production")
viper.MergeInConfig()
```

## 常见场景

### 场景一：多环境配置

开发、测试、生产环境使用不同配置：

```go
func LoadConfig() *Config {
    // 1. 读取基础配置
    viper.SetConfigName("config")
    viper.AddConfigPath(".")
    viper.ReadInConfig()

    // 2. 根据环境变量覆盖
    env := viper.GetString("APP_ENV") // dev / staging / prod
    if env != "" {
        viper.SetConfigName("config." + env)
        viper.MergeInConfig()
    }

    // 3. 环境变量覆盖（最高优先级）
    viper.AutomaticEnv()

    var cfg Config
    viper.Unmarshal(&cfg)
    return &cfg
}
```

### 场景二：配置验证

读取配置后进行验证，确保必要参数存在：

```go
func LoadAndValidate() (*Config, error) {
    viper.SetConfigName("config")
    viper.AddConfigPath(".")
    if err := viper.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("读取配置失败: %w", err)
    }

    var cfg Config
    if err := viper.Unmarshal(&cfg); err != nil {
        return nil, fmt.Errorf("解析配置失败: %w", err)
    }

    // 验证必填项
    if cfg.Database.URL == "" {
        return nil, fmt.Errorf("database.url 不能为空")
    }
    if cfg.Server.Port < 1 || cfg.Server.Port > 65535 {
        return nil, fmt.Errorf("server.port 必须在 1-65535 之间")
    }

    return &cfg, nil
}
```

### 场景三：配置结构体嵌套

复杂配置的结构体设计：

```go
type AppConfig struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    Redis    RedisConfig    `mapstructure:"redis"`
    Log      LogConfig      `mapstructure:"log"`
}

type ServerConfig struct {
    Port         int           `mapstructure:"port"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

type DatabaseConfig struct {
    URL            string        `mapstructure:"url"`
    MaxOpen        int           `mapstructure:"max_open"`
    MaxIdle        int           `mapstructure:"max_idle"`
    ConnMaxLife    time.Duration `mapstructure:"conn_max_life"`
}

type RedisConfig struct {
    Addr     string `mapstructure:"addr"`
    Password string `mapstructure:"password"`
    DB       int    `mapstructure:"db"`
}

type LogConfig struct {
    Level  string `mapstructure:"level"`
    Format string `mapstructure:"format"` // json / text
}
```

## 注意事项与常见错误

1. **mapstructure 标签**：使用 `Unmarshal` 将配置映射到结构体时，必须使用 `mapstructure` 标签而非 `json` 标签。两者的命名规则不同。

2. **环境变量名规则**：Viper 默认将配置键中的 `.` 替换为 `_`，并转为大写。`server.port` 对应 `APP_SERVER_PORT`（假设前缀为 APP）。

3. **配置文件找不到**：`ReadInConfig` 在文件不存在时返回错误。如果配置文件是可选的，应该先设置默认值，然后忽略文件不存在的错误。

4. **类型转换**：Viper 的 `GetInt`、`GetString` 等方法会尝试类型转换，但如果转换失败会返回零值。建议使用结构体映射，类型更安全。

5. **热加载的局限**：`WatchConfig` 只能检测文件修改，无法检测文件删除或重命名。且修改后需要手动更新应用状态。

6. **并发安全**：Viper 本身是并发安全的，可以多个 goroutine 同时读取。但写入配置时需要注意。

## 进阶用法

### 远程配置中心

Viper 支持从 etcd、Consul 等远程配置中心读取：

```go
import _ "github.com/spf13/viper/remote"

// 从 Consul 读取配置
viper.AddRemoteProvider("consul", "localhost:8500", "config/myapp")
viper.SetConfigType("yaml")
viper.ReadRemoteConfig()

// 监听远程配置变更
viper.WatchRemoteConfigOnChannel()
```

### 自定义默认值函数

```go
// 使用 SetDefault 批量设置默认值
viper.SetDefault("server", map[string]interface{}{
    "port":         8080,
    "mode":         "debug",
    "read_timeout": "5s",
})
```

### 子配置提取

```go
// 提取某个键下的子配置
sub := viper.Sub("database")
// sub 现在只包含 database 下的配置
host := sub.GetString("host")
port := sub.GetInt("port")
```
