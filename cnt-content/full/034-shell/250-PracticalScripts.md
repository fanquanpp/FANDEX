---
order: 250
title: 实战脚本案例
module: 'shell'
category: 工具链
difficulty: intermediate
description: 实战脚本案例：部署脚本模板、日志分析报表、定时备份、文件批量处理
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/200-TextProcessingTools'
  - 'shell/190-ScriptDebugging'
  - 'shell/180-FunctionsArguments'
prerequisites:
  - 'shell/180-FunctionsArguments'
  - 'shell/190-ScriptDebugging'
---


## 1. 从"菜谱集"说起

前 7 篇文档讲解了命令、三剑客、进程、环境变量、调试、函数。本篇用 **4 个完整案例**串联全部知识点——就像一本菜谱集，把前面的"单个技巧"组合成"完整菜品"。

**生产级脚本的共同特征**：

1. 开头 `set -euo pipefail`，失败立即停止（《脚本调试与严格模式》）
2. 参数有默认值或必填校验，`getopts` 解析（《函数与参数处理》）
3. 日志函数统一输出，带时间戳（《函数与参数处理》）
4. 关键动作可预览（dry-run），删除前确认（《命令行基础：文件与目录操作》）
5. 通过 `shellcheck` 静态检查（《脚本调试与严格模式》）

## 2. 案例一：部署脚本模板

```bash
#!/bin/bash
# deploy.sh - 通用部署脚本（前端/后端通用模板）
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/myapp}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
LOG_FILE="/var/log/deploy.log"

# 日志函数：输出到终端与日志文件
log() {
    local level="$1"; shift
    local line
    line="$(date '+%F %T') [$level] $*"
    echo "$line"
    echo "$line" >> "$LOG_FILE"
}

# 使用说明
usage() {
    echo "用法: $0 -v <版本号> [-d]"
    echo "  -v  必填：要部署的版本（git tag 或 commit）"
    echo "  -d  演练模式：只打印将要执行的命令"
    exit 1
}

dry_run=0
version=""
while getopts "v:dh" opt; do
    case "$opt" in
        v) version="$OPTARG" ;;
        d) dry_run=1 ;;
        *) usage ;;
    esac
done

[ -n "$version" ] || usage   # 版本号必填

run() {                       # 统一执行入口，支持演练模式
    if [ "$dry_run" = "1" ]; then
        echo "[演练] $*"
    else
        "$@"
    fi
}

log INFO "开始部署 v$version (dry_run=$dry_run)"

# 1. 拉取代码
run git -C "$APP_DIR" fetch --tags
run git -C "$APP_DIR" checkout "$version"

# 2. 备份当前版本（带时间戳）
ts="$(date '+%Y%m%d-%H%M%S')"
run tar -czf "$BACKUP_DIR/myapp-$ts.tar.gz" -C "$APP_DIR" --exclude=.git .
log INFO "已备份到 $BACKUP_DIR/myapp-$ts.tar.gz"

# 3. 构建
run bash -c "cd '$APP_DIR' && npm ci && npm run build"

# 4. 重启服务
if [ "$dry_run" = "0" ]; then
    systemctl restart myapp
    sleep 2
    systemctl is-active myapp || { log ERROR "服务启动失败"; exit 1; }
fi

log INFO "部署完成 v$version"
```

**设计亮点**：

- `run()` 封装所有危险命令，`-d` 演练模式只打印不执行——**部署前先演练是避免误操作的关键**
- 备份使用 `tar -czf` 带时间戳命名，`--exclude=.git` 排除仓库目录
- `systemctl is-active` 做服务健康校验，失败即退出
- 将脚本放入 crontab 或 CI 即可自动部署

## 3. 案例二：日志分析报表

```bash
#!/bin/bash
# log-report.sh - 生成访问日志分析日报
set -euo pipefail

LOG="${1:-/var/log/nginx/access.log}"     # 默认 nginx 日志路径
OUT="${2:-/tmp/report_$(date +%F).txt}"   # 默认输出文件

# 三个"为什么"：PV 多少、谁在访问、出过什么问题
{
    echo "============================================"
    echo " 访问日报 $(date '+%F %T')"
    echo "============================================"

    echo "1. 总请求数: $(wc -l < "$LOG")"

    echo "2. 独立 IP 数: $(awk '{print $1}' "$LOG" | sort -u | wc -l)"

    echo "3. 状态码分布:"
    awk '{print $9}' "$LOG" | sort | uniq -c | sort -rn

    echo "4. 访问量 TOP 10 IP:"
    awk '{print $1}' "$LOG" | sort | uniq -c | sort -rn | head -10

    echo "5. 访问量 TOP 10 页面:"
    awk '{print $7}' "$LOG" | sort | uniq -c | sort -rn | head -10

    echo "6. 404 错误页面（去重）:"
    awk '$9 == 404 {print $7}' "$LOG" | sort -u

    echo "7. 平均每秒请求数:"
    awk 'END {printf "  %.1f req/s\n", NR/3600}' "$LOG"
} | tee "$OUT"

echo "报表已生成: $OUT"
```

**设计亮点**：

- `{ ... }` 分组把多段输出合并成一次管道，`tee` 同时写文件与终端
- 所有统计复用《文本处理三剑客》的三段式 `sort | uniq -c | sort -rn`
- 此脚本可放入 crontab 每天 0 点生成日报，运维同学每天查看即可掌握站点健康度

## 4. 案例三：定时备份脚本

```bash
#!/bin/bash
# backup.sh - 备份指定目录，保留最近 N 份
set -euo pipefail

SRC="${1:?用法: $0 <源目录> [保留份数]}"
KEEP="${2:-7}"
BACKUP_ROOT="/backups/$(basename "$SRC")"
LOG="/var/log/backup.log"

mkdir -p "$BACKUP_ROOT"
stamp="$(date '+%Y%m%d-%H%M%S')"
archive="$BACKUP_ROOT/$(basename "$SRC")-$stamp.tar.gz"

log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

log "开始备份 $SRC -> $archive"

# 1. 打包（--exclude 排除缓存与临时文件）
tar -czf "$archive" \
    --exclude='*/node_modules' \
    --exclude='*/.git' \
    --exclude='*.log' \
    -C "$(dirname "$SRC")" "$(basename "$SRC")"

# 2. 校验压缩包完整性
tar -tzf "$archive" > /dev/null && log "压缩包校验通过"

# 3. 清理过期备份（按时间排序，保留最近 KEEP 份）
ls -1t "$BACKUP_ROOT"/*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
    echo "删除过期备份: $old"
    rm -f "$old"
done

log "备份完成，共 $(du -h "$archive" | cut -f1)"
```

```bash
# 配合 crontab 每天凌晨 2 点执行（crontab -e 编辑；环境陷阱与 flock 见《定时任务与调度》）
0 2 * * * /usr/local/bin/backup.sh /var/www/myapp 7 >> /var/log/backup_cron.log 2>&1
```

**设计亮点**：

- `tar -tzf` 列出包内容校验可读性，**防止备份损坏而不知情**
- 过期清理用 `ls -1t`（按时间倒序）+ `tail -n +K` 挑出"第 K 份之后的旧包"逐一删除，实现滚动保留
- crontab 五个字段分别表示分、时、日、月、星期，`0 2 * * *` 即每天 2 点
- **备份脚本务必先本地验证一轮再上定时任务**

## 5. 案例四：文件批量处理

```bash
#!/bin/bash
# batch-process.sh - 批量重命名与归类（演练模式安全预览）
set -euo pipefail

# 场景 1：批量重命名，把 IMG_*.JPG 改为 2026-photo-NNNN.jpg
counter=1
for file in IMG_*.JPG; do
    [ -e "$file" ] || continue          # 无匹配文件时跳过
    new_name=$(printf "2026-photo-%04d.jpg" "$counter")
    echo "重命名: $file -> $new_name"
    mv "$file" "$new_name"
    counter=$((counter + 1))
done

# 场景 2：按扩展名归类到子目录
for file in *; do
    [ -f "$file" ] || continue
    ext="${file##*.}"                   # 取扩展名
    case "$ext" in
        jpg|png|gif) target="images" ;;
        md|txt)      target="docs" ;;
        sh|py)       target="scripts" ;;
        *)           target="misc" ;;
    esac
    mkdir -p "$target"
    mv "$file" "$target/"
done
echo "批量处理完成"
```

**设计亮点**：

- `[ -e "$file" ] || continue` 是"通配符可能无匹配"的防御（见《命令行基础：文件与目录操作》陷阱三）
- `printf "%04d"` 生成四位补零序号
- `${file##*.}` 用参数扩展取扩展名，比 `sed`/`awk` 更轻快
- **批量脚本一律先打印再执行（演练模式），确认无误后再去掉 echo 落盘**

## 6. 脚本上线检查清单

写完一个脚本、准备投入使用前，按清单检查：

1. `bash -n script.sh` 语法检查；
2. `shellcheck script.sh` 静态检查，0 warning；
3. 用 `-d` 或注释掉危险命令先演练一遍；
4. 在临时目录用测试数据跑通；
5. 检查 `set -euo pipefail`、日志函数、参数校验是否齐全；
6. 正式使用后保留日志，便于事后追溯。

## 7. 常见误区

**误区一：生产脚本不设演练模式。** → 删除、重启、覆盖等危险操作，没有 dry-run 就是在"赌运气"。

**误区二：备份不做校验。** → `tar -tzf` 校验只花一秒钟，却能避免"备份了但损坏了"的灾难。

**误区三：脚本写完就上 crontab。** → 定时任务没有交互确认，必须先在命令行手工验证。

**误区四：删过期文件不留余地。** → 保留份数（KEEP）设大一点，宁多勿少——删除容易恢复难。
