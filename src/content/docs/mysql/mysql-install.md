---
order: 20
tags:
  - 'mysql'
  - 'database'
  - 'networking'
  - 'devops'
difficulty: 'beginner'
title: 'MySQL 环境搭建'
module: 'mysql'
category: 'MySQL Basics'
description: 'MySQL 安装、配置、启动与客户端工具使用。'
author: 'Anonymous'
---

## 目录

1. [安装方法对比](#安装方法对比)
2. [Docker 部署](#docker-部署)
3. [Windows 安装](#windows-安装)
4. [Linux 安装](#linux-安装)
5. [macOS 安装](#macos-安装)
6. [环境变量配置](#环境变量配置)
7. [MySQL 配置文件详解](#mysql-配置文件详解)
8. [管理工具](#管理工具)

---

## 1. 安装方法对比

| 安装方式     | 优点                           | 缺点                 | 推荐场景       |
| :----------- | :----------------------------- | :------------------- | :------------- |
| **Docker**   | 部署快速、可移植性强、环境隔离 | 需要 Docker 基础知识 | 开发、测试环境 |
| **二进制包** | 安装简单、性能好               | 需要手动配置         | 生产环境       |
| **源码编译** | 可定制、针对硬件优化           | 编译时间长           | 特殊需求场景   |
| **包管理器** | 安装便捷、自动更新             | 版本可能不是最新     | 快速部署       |

## 2. Docker 部署 (推荐)

Docker 部署是最便捷的方式，适合开发和测试环境：

### 2.1 基本 Docker 操作

```bash
 # 拉取 MySQL 镜像（推荐 8.0 或 8.4 LTS 版本）
 docker pull mysql:8.4
 # 查看本地镜像
 docker images mysql
 # 运行 MySQL 容器（基本配置）
 docker run --name mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -p 3306:3306 \
  -d mysql:8.4
 # 运行带持久化的 MySQL 容器
 docker run --name mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=mydb \
  -e MYSQL_USER=user \
  -e MYSQL_PASSWORD=user_password \
  -p 3306:3306 \
  -v mysql-data:/var/lib/mysql \
  -d mysql:8.4 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
 # 查看容器状态
 docker ps
 # 查看容器日志
 docker logs mysql
 # 进入容器
 docker exec -it mysql bash
 # 在容器内连接 MySQL
 mysql -u root -p
```

### 2.2 Docker Compose 部署

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'
services:
  mysql:
  image: mysql:8.4
  container_name: mysql
  environment:
  MYSQL_ROOT_PASSWORD: root_password
  MYSQL_DATABASE: mydb
  MYSQL_USER: dbuser
  MYSQL_PASSWORD: user_password
  ports:
    - '3306:3306'
  volumes:
    - mysql-data:/var/lib/mysql
    - ./my.cnf:/etc/mysql/conf.d/my.cnf
  command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
volumes:
  mysql-data:
```

启动命令：

```bash
 docker-compose up -d
```

### 2.3 生产环境 Docker 配置

```bash
 # 生产环境推荐配置
 docker run --name mysql \
  --restart=always \
  -e MYSQL_ROOT_PASSWORD=complex_password \
  -e MYSQL_DATABASE=production_db \
  -e MYSQL_USER=app_user \
  -e MYSQL_PASSWORD=app_password \
  -p 3306:3306 \
  -v /host/path/mysql/data:/var/lib/mysql \
  -v /host/path/mysql/conf.d:/etc/mysql/conf.d \
  -d mysql:8.4 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci \
  --max-connections=500 \
  --innodb-buffer-pool-size=2G
```

## 3. Windows 安装

### 3.1 使用 MySQL Installer 安装

1. **下载安装包**：从 [MySQL 官网](https://dev.mysql.com/downloads/installer/) 下载 MySQL Installer
2. **运行安装程序**：

- 选择 "Developer Default" 适合开发环境（包含 MySQL Server、Workbench、Visual Studio 插件等）
- 选择 "Server Only" 适合生产环境
- 选择 "Custom" 可自定义选择组件

3. **配置 MySQL**：

```text
 - 设置 root 密码（务必设置强密码）
 - 配置端口（默认 3306，建议在有冲突时修改）
 - 选择服务启动方式（自动启动/手动启动）
 - 配置高级选项（日志文件路径、字符集等）
```

4. **完成安装**：按照向导完成安装和配置
5. **验证安装**：

```cmd
 # 打开命令提示符
 mysql -u root -p
 # 查看版本
 mysql --version
```

### 3.2 使用压缩包手动安装

1. **下载压缩包**：从官网下载 mysql-8.4.x-winx64.zip
2. **解压到指定目录**：如 `C:\mysql`
3. **创建配置文件** `my.ini`：

```ini
 [mysqld]
 # 设置端口
 port=3306
 # 设置安装目录
 basedir=C:\mysql
 # 设置数据目录
 datadir=C:\mysql\data
 # 字符集
 character-set-server=utf8mb4
 collation-server=utf8mb4_unicode_ci
 [client]
 port=3306
```

4. **初始化数据库**：

```cmd
 cd C:\mysql\bin
 mysqld --initialize --console
```

5. **安装服务**：

```cmd
 mysqld --install MySQL --defaults-file=C:\mysql\my.ini
```

6. **启动服务**：

```cmd
 net start MySQL
```

## 4. Linux 安装

### 4.1 Ubuntu/Debian 安装

```bash
 # 更新包列表
 sudo apt update
 # 安装 MySQL 服务器
 sudo apt install mysql-server -y
 # 安全配置（设置 root 密码、移除匿名用户等）
 sudo mysql_secure_installation
 # 启动服务
 sudo systemctl start mysql
 sudo systemctl enable mysql
 # 检查服务状态
 sudo systemctl status mysql
 # 验证安装
 sudo mysql -u root
```

### 4.2 CentOS/RHEL 安装

```bash
 # 安装 MySQL 仓库
 sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm
 # 安装 MySQL 服务器
 sudo yum install -y mysql-community-server
 # 启动服务
 sudo systemctl start mysqld
 sudo systemctl enable mysqld
 # 获取临时密码
 sudo grep 'temporary password' /var/log/mysqld.log
 # 安全配置
 sudo mysql_secure_installation
 # 验证安装
 mysql -u root -p
```

### 4.3 Docker 方式（各 Linux 通用）

```bash
 # 安装 Docker（如果未安装）
 curl -fsSL https://get.docker.com | sh
 # 拉取并运行 MySQL
 docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -p 3306:3306 \
  -v /opt/mysql/data:/var/lib/mysql \
  mysql:8.4
```

## 5. macOS 安装

### 5.1 使用 Homebrew 安装

```bash
 # 如果未安装 Homebrew，先安装
 True/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
 # 更新 Homebrew
 brew update
 # 安装 MySQL
 brew install mysql
 # 启动 MySQL 服务
 brew services start mysql
 # 安全配置
 mysql_secure_installation
 # 连接 MySQL
 mysql -u root
```

### 5.2 使用 DMG 安装包

1. 从 [MySQL 官网](https://dev.mysql.com/downloads/mysql/) 下载 macOS DMG 安装包
2. 双击打开 DMG 文件
3. 运行 MySQL 安装程序
4. 完成安装向导
5. 通过系统偏好设置启动 MySQL

## 6. 环境变量配置

### 6.1 Windows 配置

1. 右键 "此电脑" → "属性" → "高级系统设置" → "环境变量"
2. 在 "系统变量" 中找到 "Path"，点击 "编辑"
3. 添加 MySQL 安装目录的 bin 文件夹路径：

- 如果使用 MySQL Installer：`C:\Program Files\MySQL\MySQL Server 8.4\bin`
- 如果使用压缩包：`C:\mysql\bin`

4. 点击 "确定" 保存配置
5. 重启命令行窗口使配置生效
6. 验证配置：

```cmd
 mysql --version
```

### 6.2 Linux/macOS 配置

```bash
 # 编辑环境变量文件
 sudo nano /etc/profile # 全局配置
 # 或
 nano ~/.bashrc # 用户级配置
 # 在文件末尾添加（根据实际安装路径）
 export PATH=$PATH:/usr/bin/mysql
 # 或
 export PATH=$PATH:/usr/local/mysql/bin
 # 使配置生效
 source /etc/profile # 全局配置
 # 或
 source ~/.bashrc # 用户级配置
 # 验证配置
 mysql --version
```

## 7. MySQL 配置文件详解

### 7.1 配置文件位置

| 操作系统 | 配置文件位置                              |
| :------- | :---------------------------------------- |
| Windows  | `my.ini`（MySQL 安装目录或 `C:\Windows`） |
| Linux    | `/etc/mysql/my.cnf` 或 `/etc/my.cnf`      |
| macOS    | `/usr/local/etc/my.cnf` 或 `~/.my.cnf`    |

### 7.2 配置文件结构

```ini
 [mysqld] # 服务器端配置
 port=3306
 basedir=/usr/local/mysql
 datadir=/var/lib/mysql
 character-set-server=utf8mb4
 collation-server=utf8mb4_unicode_ci
 max_connections=200
 [mysql] # 客户端配置
 default-character-set=utf8mb4
 [client] # 客户端连接配置
 port=3306
 host=localhost
```

### 7.3 常用配置参数

```ini
 [mysqld]
 # 基础配置
 port=3306
 bind-address=0.0.0.0
 # 字符集配置
 character-set-server=utf8mb4
 collation-server=utf8mb4_unicode_ci
 # InnoDB 配置
 innodb_buffer_pool_size=1G # 建议为服务器内存的 70-80%
 innodb_log_file_size=256M
 innodb_flush_log_at_trx_commit=1
 # 连接配置
 max_connections=200
 wait_timeout=600
 interactive_timeout=600
 # 日志配置
 slow_query_log=1
 slow_query_log_file=/var/log/mysql/slow.log
 long_query_time=2
 # 字符集
 character-set-server=utf8mb4
```

## 8. 管理工具

### 8.1 命令行工具详解

| 工具            | 功能             | 使用示例                                            |
| :-------------- | :--------------- | :-------------------------------------------------- |
| **mysql**       | 官方命令行客户端 | `mysql -u root -p`                                  |
| **mysqldump**   | 数据备份工具     | `mysqldump -u root -p database_name > backup.sql`   |
| **mysqladmin**  | 管理工具         | `mysqladmin -u root -p status`                      |
| **mysqlimport** | 数据导入工具     | `mysqlimport -u root -p database_name data.txt`     |
| **mysqld**      | MySQL 服务器进程 | `mysqld --defaults-file=/etc/my.cnf`                |
| **mysqlcheck**  | 检查表和修复     | `mysqlcheck -u root -p --auto-repair database_name` |
| **mysqlbinlog** | 查看二进制日志   | `mysqlbinlog mysql-bin.000001`                      |

### 8.2 mysqldump 备份示例

```bash
 # 备份单个数据库
 mysqldump -u root -p database_name > backup.sql
 # 备份多个数据库
 mysqldump -u root -p --databases db1 db2 > backup.sql
 # 备份所有数据库
 mysqldump -u root -p --all-databases > all_databases_backup.sql
 # 备份表结构（不包含数据）
 mysqldump -u root -p --no-data database_name > structure_only.sql
 # 备份数据（不包含表结构）
 mysqldump -u root -p --no-create-info database_name > data_only.sql
 # 压缩备份
 mysqldump -u root -p database_name | gzip > backup.sql.gz
 # 恢复数据库
 mysql -u root -p database_name < backup.sql
```

### 8.3 GUI 工具对比

| 工具                | 特点                                        | 适用场景                   | 价格 |
| :------------------ | :------------------------------------------ | :------------------------- | :--- |
| **MySQL Workbench** | 官方 GUI 工具，EER建模、SQL开发、服务器管理 | 开发、管理、设计数据库     | 免费 |
| **DBeaver**         | 开源跨平台，支持多种数据库，社区活跃        | 多数据库管理、SQL 开发     | 免费 |
| **Navicat**         | 商业工具，界面友好，功能强大，性能优秀      | 企业级数据库管理           | 付费 |
| **phpMyAdmin**      | Web 界面，适合远程管理，无需安装客户端      | 远程管理、简单操作         | 免费 |
| **HeidiSQL**        | 轻量级 Windows 工具，开源                   | Windows 环境下的数据库管理 | 免费 |
| **Sequel Pro**      | macOS 专用工具，轻量快速                    | macOS 环境下的数据库管理   | 免费 |
| **DataGrip**        | JetBrains 出品，强大的数据库 IDE            | 专业开发、复杂查询         | 付费 |

---

### 更新日志 (Changelog)

- 2026-05-27: 拆分为独立文件，添加元数据，版本升级至 v4.0.0
- 2026-04-30: 大幅细化内容，添加安装配置详细步骤、Docker Compose 部署、管理工具对比等
- 2026-04-05: 整合 MySQL 环境配置
