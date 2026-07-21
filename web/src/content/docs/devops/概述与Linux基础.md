---
order: 1
title: '概述与 Linux 基础'
module: devops
category: 运维
difficulty: beginner
description: 'DevOps/SRE 理念、Linux 系统管理、文件系统、用户权限、Shell 脚本与日志管理。'
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/网络与安全
  - devops/容器与Docker
  - git/语法速查
prerequisites: []
---

## 1. DevOps 与 SRE 理念

### 1.1 DevOps 定义

DevOps 是一种强调**开发（Development）与运维（Operations）协作**的文化和实践，旨在缩短交付周期、提高部署频率、降低变更失败率。

### 1.2 DevOps 与 SRE 对比

| 维度         | DevOps                 | SRE                  |
| :----------- | :--------------------- | :------------------- |
| **理念**     | 文化与协作             | 工程化方法论         |
| **目标**     | 加速交付               | 保证可靠性           |
| **方法**     | CI/CD、自动化          | SLI/SLO、错误预算    |
| **角色**     | 全栈工程师             | 可靠性工程师         |
| **核心指标** | 部署频率、变更前置时间 | 可用性、延迟、错误率 |

### 1.3 DevOps 核心实践

```
计划 → 编码 → 构建 → 测试 → 发布 → 部署 → 运维 → 监控
  ↑                                              │
  └──────────── 持续反馈 ←───────────────────────┘
```

| 实践       | 描述               | 工具                    |
| :--------- | :----------------- | :---------------------- |
| **CI/CD**  | 持续集成与持续交付 | GitHub Actions、Jenkins |
| **IaC**    | 基础设施即代码     | Terraform、Ansible      |
| **容器化** | 应用容器化部署     | Docker、Kubernetes      |
| **监控**   | 全链路可观测性     | Prometheus、Grafana     |
| **自动化** | 减少手动操作       | Ansible、Shell          |

## 2. Linux 系统管理

### 2.1 Linux 发行版

| 发行版           | 特点             | 适用场景       |
| :--------------- | :--------------- | :------------- |
| **Ubuntu**       | 用户友好、包丰富 | 开发环境、桌面 |
| **CentOS/Rocky** | 稳定、兼容 RHEL  | 生产服务器     |
| **Debian**       | 极致稳定         | 服务器、嵌入式 |
| **Alpine**       | 轻量（5MB）      | 容器镜像       |

### 2.2 常用系统命令

```bash
# 系统信息
uname -a                    # 内核版本
cat /etc/os-release         # 系统版本
hostname                    # 主机名
uptime                      # 运行时间和负载

# CPU 信息
lscpu                       # CPU 详细信息
nproc                       # CPU 核心数
top / htop                  # 实时进程监控

# 内存信息
free -h                     # 内存使用情况
vmstat 1 5                  # 虚拟内存统计

# 磁盘信息
df -h                       # 磁盘使用情况
du -sh /path/*              # 目录大小
lsblk                       # 块设备列表
fdisk -l                    # 磁盘分区

# 网络信息
ip addr                     # 网络接口
ip route                    # 路由表
ss -tlnp                    # 监听端口
```

## 3. 文件系统

### 3.1 目录结构

```
/           根目录
├── bin     基本命令（所有用户可用）
├── sbin    系统管理命令（root 可用）
├── etc     配置文件
├── home    用户主目录
├── root    root 用户主目录
├── var     可变数据（日志、缓存）
├── tmp     临时文件
├── usr     用户程序
│   ├── bin   用户命令
│   ├── lib   库文件
│   └── local 本地安装
├── opt     第三方软件
├── proc    进程信息（虚拟文件系统）
├── sys     系统信息（虚拟文件系统）
└── dev     设备文件
```

### 3.2 文件操作

```bash
# 文件查看
cat file.txt               # 查看全部内容
less file.txt              # 分页查看
head -n 20 file.txt        # 前 20 行
tail -f /var/log/syslog    # 实时查看日志

# 文件搜索
find / -name "*.conf" 2>/dev/null     # 按名称搜索
find /var -size +100M                 # 按大小搜索
grep -r "error" /var/log/             # 按内容搜索
locate nginx.conf                     # 快速定位（需 updatedb）

# 文件权限
chmod 755 script.sh         # rwxr-xr-x
chmod +x script.sh          # 添加执行权限
chown user:group file.txt   # 修改所有者
chgrp group file.txt        # 修改所属组

# 软链接与硬链接
ln -s /path/target link     # 软链接（符号链接）
ln /path/target link        # 硬链接
```

### 3.3 文件系统类型

| 类型          | 特点             | 适用场景       |
| :------------ | :--------------- | :------------- |
| **ext4**      | Linux 默认、稳定 | 通用           |
| **XFS**       | 大文件性能好     | 数据库、大文件 |
| **Btrfs**     | 快照、压缩       | NAS、容器      |
| **ZFS**       | 数据完整性、快照 | 存储服务器     |
| **OverlayFS** | 联合挂载         | 容器           |

## 4. 用户与权限

### 4.1 用户管理

```bash
# 用户操作
useradd -m -s /bin/bash newuser    # 创建用户
passwd newuser                      # 设置密码
usermod -aG docker newuser         # 添加到组
userdel -r olduser                  # 删除用户及主目录

# 组操作
groupadd developers                 # 创建组
gpasswd -a user developers          # 添加用户到组
groups user                         # 查看用户所属组

# 切换用户
su - username                       # 切换用户
sudo command                        # 以 root 执行

# sudo 配置
visudo                              # 编辑 sudoers
# 添加: newuser ALL=(ALL) NOPASSWD: /usr/bin/docker
```

### 4.2 权限模型

```
-rwxr-xr-- 1 owner group 4096 Jun 14 10:00 file.txt
│├──┤├──┤├──┤
│ │   │   │
│ │   │   └── 其他用户: r-- (4)
│ │   └────── 组: r-x (5)
│ └────────── 所有者: rwx (7)
└──────────── 文件类型: - 普通文件, d 目录, l 链接
```

| 权限  | 数字 | 文件     | 目录          |
| :---- | :--- | :------- | :------------ |
| **r** | 4    | 读取内容 | 列出内容      |
| **w** | 2    | 修改内容 | 创建/删除文件 |
| **x** | 1    | 执行     | 进入目录      |

### 4.3 特殊权限

```bash
# SUID - 以文件所有者身份执行
chmod u+s /usr/bin/passwd    # 4755

# SGID - 以文件所属组身份执行 / 新文件继承组
chmod g+s /shared/dir        # 2755

# Sticky Bit - 只有所有者能删除
chmod +t /tmp                # 1777
```

## 5. Shell 脚本

### 5.1 基础语法

```bash
#!/bin/bash

# 变量
NAME="DevOps"
echo "Hello, $NAME"
echo "进程 PID: $$"
echo "脚本路径: $0"
echo "参数数量: $#"
echo "所有参数: $@"

# 条件判断
if [ -f "/etc/nginx/nginx.conf" ]; then
    echo "Nginx 配置文件存在"
elif [ -d "/etc/nginx" ]; then
    echo "Nginx 目录存在但无配置"
else
    echo "Nginx 未安装"
fi

# 循环
for i in {1..10}; do
    echo "第 $i 次循环"
done

while read line; do
    echo "处理: $line"
done < input.txt

# 函数
check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo "$service 运行中"
        return 0
    else
        echo "$service 未运行"
        return 1
    fi
}

check_service nginx
```

### 5.2 实用脚本

```bash
#!/bin/bash
# 系统健康检查脚本

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }

# CPU 检查
check_cpu() {
    local load=$(awk '{print $1}' /proc/loadavg)
    local cores=$(nproc)
    local threshold=$(echo "$cores * 0.8" | bc)
    if (( $(echo "$load > $threshold" | bc -l) )); then
        log_warn "CPU 负载过高: $load (阈值: $threshold)"
    else
        log_ok "CPU 负载正常: $load"
    fi
}

# 内存检查
check_memory() {
    local usage=$(free | awk '/Mem/{printf("%.1f"), $3/$2*100}')
    if (( $(echo "$usage > 90" | bc -l) )); then
        log_fail "内存使用率过高: ${usage}%"
    elif (( $(echo "$usage > 80" | bc -l) )); then
        log_warn "内存使用率偏高: ${usage}%"
    else
        log_ok "内存使用率正常: ${usage}%"
    fi
}

# 磁盘检查
check_disk() {
    local usage=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
    if [ "$usage" -gt 90 ]; then
        log_fail "磁盘使用率过高: ${usage}%"
    elif [ "$usage" -gt 80 ]; then
        log_warn "磁盘使用率偏高: ${usage}%"
    else
        log_ok "磁盘使用率正常: ${usage}%"
    fi
}

# 服务检查
check_services() {
    for svc in nginx docker sshd; do
        if systemctl is-active --quiet "$svc" 2>/dev/null; then
            log_ok "$svc 运行中"
        else
            log_warn "$svc 未运行"
        fi
    done
}

echo "===== 系统健康检查 $(date) ====="
check_cpu
check_memory
check_disk
check_services
echo "===== 检查完成 ====="
```

## 6. 包管理

### 6.1 APT（Debian/Ubuntu）

```bash
# 更新源
sudo apt update && sudo apt upgrade -y

# 安装/卸载
sudo apt install nginx -y
sudo apt remove nginx --purge
sudo apt autoremove

# 搜索
apt search nginx
apt show nginx

# 添加 PPA
sudo add-apt-repository ppa:nginx/stable
```

### 6.2 YUM/DNF（RHEL/CentOS）

```bash
# 更新
sudo dnf update -y

# 安装
sudo dnf install nginx -y
sudo dnf remove nginx

# 搜索
dnf search nginx
dnf info nginx

# 添加仓库
sudo dnf config-manager --add-repo https://repo.example.com/repo.rpm
```

## 7. systemd 服务管理

### 7.1 常用命令

```bash
# 服务管理
systemctl start nginx       # 启动
systemctl stop nginx        # 停止
systemctl restart nginx     # 重启
systemctl reload nginx      # 重载配置
systemctl status nginx      # 查看状态
systemctl enable nginx      # 开机自启
systemctl disable nginx     # 禁用自启

# 日志查看
journalctl -u nginx         # 服务日志
journalctl -f               # 实时日志
journalctl --since "1 hour ago"
journalctl -p err           # 错误级别日志
```

### 7.2 自定义 Service

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application Service
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=appuser
Group=appgroup
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/start.sh
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

# 安全加固
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/myapp/data /var/log/myapp

[Install]
WantedBy=multi-user.target
```

```bash
# 启用自定义服务
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp
```

## 8. 日志管理

### 8.1 日志位置

| 日志         | 路径                    | 内容         |
| :----------- | :---------------------- | :----------- |
| **系统日志** | `/var/log/syslog`       | 系统消息     |
| **认证日志** | `/var/log/auth.log`     | 登录认证     |
| **内核日志** | `/var/log/kern.log`     | 内核消息     |
| **服务日志** | `journalctl -u service` | systemd 服务 |

### 8.2 日志轮转

```bash
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 appuser appgroup
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true
    endspostrotate
}
```

### 8.3 日志分析

```bash
# 统计 HTTP 状态码
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# 统计访问量 Top 10 IP
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10

# 查找错误
grep -E "ERROR|CRITICAL|FATAL" /var/log/app.log | tail -50

# 按时间段统计
awk '$4 >= "[14/Jun/2026:00:00" && $4 <= "[14/Jun/2026:23:59"' access.log | wc -l
```

## 9. 小结

Linux 基础是 DevOps 工程师的必备技能：

1. **DevOps 理念**强调协作和自动化，SRE 强调可靠性和量化
2. **Linux 系统管理**涵盖 CPU、内存、磁盘、网络的监控和排查
3. **文件系统**理解目录结构和权限模型是安全运维的基础
4. **Shell 脚本**是自动化运维的核心工具，需掌握条件、循环和函数
5. **systemd** 是现代 Linux 的服务管理标准，需熟练编写 Service 文件
6. **日志管理**是故障排查的关键，需掌握日志轮转和分析技巧
