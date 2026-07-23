---
order: 50
title: Shell脚本编程
module: devops
category: 运维
difficulty: intermediate
description: Shell脚本编程：Bash语法、流程控制、函数、文本处理与自动化脚本
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/基础设施即代码
  - devops/云原生与SRE
  - devops/包管理与仓库
  - devops/服务网格
prerequisites:
  - devops/概述与Linux基础
---

## 1. Bash 基础语法

### 1.1 变量

```bash
# 变量赋值（等号两边不能有空格）
name="hello"
echo $name
echo ${name}

# 只读变量
readonly PI=3.14

# 环境变量
export MY_VAR="value"

# 特殊变量
$0    # 脚本名
$1~$9 # 位置参数
$#    # 参数个数
$@    # 所有参数（作为独立字符串）
$*    # 所有参数（作为单个字符串）
$?    # 上一个命令的退出码
$$    # 当前进程PID
```

### 1.2 字符串操作

```bash
str="Hello World"

# 字符串长度
echo ${#str}          # 11

# 子字符串
echo ${str:0:5}       # Hello
echo ${str:6}         # World

# 替换
echo ${str/World/Bash}    # Hello Bash（首次替换）
echo ${str//l/L}          # HeLLo WorLd（全局替换）

# 删除
echo ${str#Hello }        # World（从前删最短匹配）
echo ${str##*o}           # rld（从前删最长匹配）
echo ${str%World}         # Hello（从后删最短匹配）
echo ${str%%*o}           # Hell（从后删最长匹配）

# 默认值
echo ${undefined:-default}  # default
echo ${undefined:=default}  # default（同时赋值）
```

### 1.3 数组

```bash
# 定义数组
arr=(1 2 3 4 5)
arr[0]=10

# 访问
echo ${arr[0]}        # 10
echo ${arr[@]}        # 所有元素
echo ${#arr[@]}       # 元素个数
echo ${#arr[0]}       # 第一个元素的长度

# 遍历
for i in "${arr[@]}"; do
    echo $i
done

# 关联数组
declare -A map
map[name]="Alice"
map[age]=30
echo ${map[name]}
```

## 2. 流程控制

### 2.1 条件判断

```bash
# if-elif-else
if [ -f "/etc/passwd" ]; then
    echo "文件存在"
elif [ -d "/etc" ]; then
    echo "目录存在"
else
    echo "不存在"
fi

# 双括号（支持 &&, ||, <, >）
if [[ $a -gt $b && $a -lt 100 ]]; then
    echo "条件满足"
fi

# case
case $1 in
    start)   echo "启动服务" ;;
    stop)    echo "停止服务" ;;
    restart) echo "重启服务" ;;
    *)       echo "用法: $0 {start|stop|restart}" ;;
esac
```

### 2.2 文件测试操作符

| 操作符 | 含义           |
| ------ | -------------- |
| `-f`   | 是否为普通文件 |
| `-d`   | 是否为目录     |
| `-e`   | 是否存在       |
| `-r`   | 是否可读       |
| `-w`   | 是否可写       |
| `-x`   | 是否可执行     |
| `-s`   | 是否非空       |

### 2.3 循环

```bash
# for 循环
for i in {1..10}; do
    echo $i
done

for i in $(seq 1 2 20); do  # 步长2
    echo $i
done

# C 风格 for
for ((i=0; i<10; i++)); do
    echo $i
done

# while 循环
while read line; do
    echo "$line"
done < input.txt

# until 循环
until [ $count -gt 10 ]; do
    count=$((count + 1))
done
```

## 3. 函数

```bash
# 定义函数
greet() {
    local name=$1
    echo "Hello, $name"
    return 0
}

# 调用
greet "World"

# 返回值
get_status() {
    if systemctl is-active nginx > /dev/null; then
        echo "running"
    else
        echo "stopped"
    fi
}

status=$(get_status)
echo "Nginx status: $status"
```

## 4. 文本处理三剑客

### 4.1 grep

```bash
# 基本搜索
grep "pattern" file.txt

# 常用选项
grep -i "pattern" file     # 忽略大小写
grep -r "pattern" dir/     # 递归搜索
grep -n "pattern" file     # 显示行号
grep -c "pattern" file     # 统计匹配行数
grep -v "pattern" file     # 反向匹配
grep -E "pat1|pat2" file   # 扩展正则

# 实用正则
grep -E "^[0-9]+" file           # 以数字开头
grep -E "\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b" file  # 邮箱
```

### 4.2 sed

```bash
# 替换
sed 's/old/new/' file           # 替换每行第一个
sed 's/old/new/g' file          # 全局替换
sed -i 's/old/new/g' file       # 原地修改

# 删除
sed '/^$/d' file                # 删除空行
sed '1,5d' file                 # 删除1-5行

# 插入和追加
sed '3i\inserted line' file     # 第3行前插入
sed '3a\appended line' file     # 第3行后追加

# 多命令
sed -e 's/a/A/g' -e 's/b/B/g' file
```

### 4.3 awk

```bash
# 基本用法
awk '{print $1, $3}' file       # 打印第1、3列
awk -F: '{print $1}' /etc/passwd  # 指定分隔符

# 条件
awk '$3 > 100 {print $1, $3}' file

# BEGIN/END
awk 'BEGIN{sum=0} {sum+=$1} END{print "Total:", sum}' file

# 内置变量
# NR: 行号  NF: 字段数  FS: 字段分隔符
awk '{print NR, NF, $0}' file

# 格式化输出
awk '{printf "%-10s %5d\n", $1, $2}' file
```

## 5. 实用脚本示例

### 5.1 系统监控脚本

```bash
#!/bin/bash
# 系统资源监控

THRESHOLD=80

check_cpu() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d. -f1)
    if [ "$cpu_usage" -gt "$THRESHOLD" ]; then
        echo "WARNING: CPU usage ${cpu_usage}%"
    fi
}

check_memory() {
    local mem_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2*100)}')
    if [ "$mem_usage" -gt "$THRESHOLD" ]; then
        echo "WARNING: Memory usage ${mem_usage}%"
    fi
}

check_disk() {
    local disk_usage=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
    if [ "$disk_usage" -gt "$THRESHOLD" ]; then
        echo "WARNING: Disk usage ${disk_usage}%"
    fi
}

check_cpu
check_memory
check_disk
```

### 5.2 日志分析脚本

```bash
#!/bin/bash
# Nginx 日志分析

LOG_FILE="/var/log/nginx/access.log"

echo "=== 访问量 Top 10 IP ==="
awk '{print $1}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10

echo "=== 状态码统计 ==="
awk '{print $9}' "$LOG_FILE" | sort | uniq -c | sort -rn

echo "=== 访问量 Top 10 URL ==="
awk '{print $7}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10

echo "=== 每小时访问量 ==="
awk '{print $4}' "$LOG_FILE" | cut -d: -f2 | sort | uniq -c | sort -n
```

### 5.3 自动备份脚本

```bash
#!/bin/bash
# 数据库自动备份

BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份所有数据库
mysqldump -u root -p"$MYSQL_PASS" --all-databases | gzip > "${BACKUP_DIR}/all_${DATE}.sql.gz"

# 清理过期备份
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: all_${DATE}.sql.gz"
```

## 6. 调试与最佳实践

### 6.1 调试技巧

```bash
# 调试模式
bash -x script.sh       # 打印每条命令
bash -n script.sh       # 语法检查

# 在脚本中启用
set -x    # 开启调试
set +x    # 关闭调试

# 严格模式
set -euo pipefail
# -e: 命令失败时退出
# -u: 使用未定义变量时报错
# -o pipefail: 管道中任一命令失败则整个管道失败
```

### 6.2 最佳实践

- 使用 `shellcheck` 检查脚本
- 变量引用加双引号：`"$var"`
- 使用 `local` 声明局部变量
- 使用 `[[ ]]` 替代 `[ ]`
- 使用 `$()` 替代反引号
- 总是处理错误返回值
- 使用 `mktemp` 创建临时文件
