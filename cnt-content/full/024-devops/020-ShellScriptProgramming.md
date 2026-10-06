---
order: 30
title: Shell 脚本编程
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: 以三个真实运维脚本为主线讲 Bash：日志轮转清理、服务健康巡检、批量部署——set -euo pipefail 等防御性写法与引号/分词陷阱逐段讲透
author: fanquanpp
updated: '2026-10-07'
related:
  - 'devops/015-LinuxSystemManagement'
  - 'devops/200-IaC'
  - 'devops/030-PackageManagementRepository'
prerequisites:
  - 'devops/015-LinuxSystemManagement'
---

## 知识点地图

- **知识类别**：DevOps 自动化 / Shell 脚本（命令退居配角，工程写法是主线）。
- **解决什么问题**：运维里"每天都要敲一遍的命令"该变成脚本；但随手写的脚本会在半夜的定时任务里爆炸——变量为空删错目录、管道中途失败没人知道、日志文件名带空格把循环炸了。
- **什么时候用到**：日志清理、健康巡检、批量部署三类高频场景；以及给 Ansible/IaC 之外的小型自动化补位。
- **前置阅读**：[Linux 系统管理与服务管理](/devops/015-LinuxSystemManagement)（systemd 与权限基础）。

## 心智模型：脚本的四个质量等级

```text
L0 能跑           —— 逐条命令堆一起
L1 可控           —— set -euo pipefail：出错即停、失败可见
L2 可复用         —— 函数化、参数化、可被 cron 与人同时调用
L3 可维护         —— 日志输出、幂等、trap 清理、可 dry-run
```

本篇三个脚本都按 L3 标准写。所有防御性写法归结为一条哲学：**脚本会以你没料到的方式失败，写法要保证"失败时停在原地并喊出来"，而不是"带着错误状态继续跑"**。

## 防御性写法四件套（每个脚本的开头）

```bash
#!/usr/bin/env bash
set -euo pipefail
# -e  任何命令失败立即退出（默认是继续执行下一条——灾难之源）
# -u  使用未定义变量直接报错（把 "$typo" 从"空字符串"变成"显式错误"）
# -o pipefail  管道中任何一段失败都算整体失败（默认只看最后一段）

IFS=$'\n\t'        # 词分割只认换行与 Tab——文件名带空格不再炸循环

# trap：脚本退出前清理（临时目录、锁文件）
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
```

为什么 `-e` 是第一条铁律：没有它，`cd /data/backup` 失败后下一句 `rm -rf *` 会在**当前目录**执行——这是真实删库事故的标准剧本。`set -e` 让第一处失败即停，配合 `-u` 把"变量名打错"从静默变报错。三个例外要背：`$?` 显式检查处、`if 命令` 条件处、`cmd || true` 容忍处——这三种写法内部不触发 `-e`。

引号与分词的三个陷阱（Bash 事故大户）：

```bash
# 陷阱 1：未加引号的变量会按空格分词
rm -rf "$TARGET_DIR"      # 正确
rm -rf $TARGET_DIR        # TARGET_DIR="/data/my app" 时变成删两个目录

# 陷阱 2：[ ] 与 [[ ]] 的区别
if [ "$name" = "prod" ]; then ... fi        # [ 是命令：空变量必须加引号
if [[ $name == "prod" && -f $cfg ]]; then   # [[ 是关键字：可免引号、支持 && 与模式匹配

# 陷阱 3：命令替换的退出码丢失
COUNT=$(cat counts | wc -l)      # cat 失败时 COUNT=0，错误被吞
COUNT=$(wc -l < counts)          # 更好：少一个进程；配合 -o pipefail 才能感知 cat 失败
```

## 脚本一：日志轮转清理（cron 每日跑）

需求：应用日志按天滚动，保留 30 天，磁盘告急时多删。要点：幂等（重复跑无害）、可见（删了什么有日志）、保守（路径白名单）。

```bash
#!/usr/bin/env bash
# cleanup_logs.sh — 清理过期应用日志（crontab: 30 2 * * *）
set -euo pipefail
IFS=$'\n\t'

LOG_DIRS=(
    "/var/log/myapp"
    "/var/log/nginx"
)
RETAIN_DAYS=30

log() { echo "[$(date '+%F %T')] $*"; }

total_freed=0
for dir in "${LOG_DIRS[@]}"; do
    # -u 用 -u：目录不存在只跳过不报错（配合 -e 不至于中断整个清理）
    [[ -d "$dir" ]] || { log "跳过不存在的目录: $dir"; continue; }

    # -print0/-xargs -0：文件名含空格/换行都安全
    freed=$(find "$dir" -type f -name '*.log*' -mtime +"$RETAIN_DAYS" -print0 |
            xargs -0 -r du -cb 2>/dev/null | tail -1 | cut -f1 || echo 0)
    find "$dir" -type f -name '*.log*' -mtime +"$RETAIN_DAYS" -print0 |
        xargs -0 -r rm -f

    log "清理 $dir：释放 $((freed / 1024 / 1024)) MB"
    total_freed=$((total_freed + freed))
done

log "共释放 $((total_freed / 1024 / 1024)) MB"

# 兜底：清完还超阈值就告警（对接监控见巡检脚本）
usage=$(df --output=pcent / | tail -1 | tr -d ' %')
if (( usage > 85 )); then
    log "告警：根分区仍使用 ${usage}%" >&2
    exit 1            # cron 会捕获非零退出码；配合监控按失败告警
fi
```

逐段讲解：

- `LOG_DIRS=( ... )` 数组 + `"${LOG_DIRS[@]}"`：数组展开永远加双引号，目录路径含空格安全；
- `find -print0 | xargs -0`：以 NUL 分隔文件名，是"文件名安全"的标准组合——普通管道按换行分割，文件名带换行就完蛋（攻击面之一）；
- `xargs -r`：输入为空时不执行（没有 `-r` 时空输入会执行一次 `rm`——GNU 特有的坑）；
- `freed=$( ... || echo 0)`：统计失败当作 0，**清理动作不因统计失败而中断**——分清"必须成功的步骤"与"尽力而为的步骤"；
- 最后一行 `exit 1`：让"清了还满"这个事实以非零退出码冒出来，cron 邮件或监控捕捉——**脚本对失败的正确反应是喊出来，不是装没事**。

## 脚本二：服务健康巡检（吸收自旧版健康检查脚本，工程化重写）

需求：每天巡检 CPU/内存/磁盘/关键服务，输出彩色报告，异常时非零退出。这是从旧篇搬入的健康检查脚本的加固版（原文来自 010，这里补上 `set` 防护与退出码语义）：

```bash
#!/usr/bin/env bash
# healthcheck.sh — 系统健康巡检（可人跑也可 cron 跑）
set -uo pipefail          # 注意：这里不用 -e——单项检查失败应该继续查其他项

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
FAILED=0

log_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; FAILED=$((FAILED + 1)); }

check_cpu() {
    local load cores threshold
    load=$(awk '{print $1}' /proc/loadavg)
    cores=$(nproc)
    threshold=$(awk "BEGIN{print $cores * 0.8}")
    if awk "BEGIN{exit !($load > $threshold)}"; then
        log_warn "CPU 负载过高: $load (阈值: $threshold)"
    else
        log_ok "CPU 负载正常: $load / ${cores}核"
    fi
}

check_memory() {
    local usage
    usage=$(free | awk '/Mem/{printf "%.1f", $3/$2*100}')
    if awk "BEGIN{exit !($usage > 90)}"; then
        log_fail "内存使用率过高: ${usage}%"
    elif awk "BEGIN{exit !($usage > 80)}"; then
        log_warn "内存使用率偏高: ${usage}%"
    else
        log_ok "内存使用率正常: ${usage}%"
    fi
}

check_disk() {
    local usage
    usage=$(df -h / | awk 'NR==2{gsub(/%/,""); print $5}')
    if (( usage > 90 )); then
        log_fail "磁盘使用率过高: ${usage}%"
    elif (( usage > 80 )); then
        log_warn "磁盘使用率偏高: ${usage}%"
    else
        log_ok "磁盘使用率正常: ${usage}%"
    fi
}

check_services() {
    local svc
    for svc in nginx docker sshd; do
        if systemctl is-active --quiet "$svc" 2>/dev/null; then
            log_ok "$svc 运行中"
        else
            log_fail "$svc 未运行"
        fi
    done
}

echo "===== 系统健康检查 $(date '+%F %T') ====="
check_cpu
check_memory
check_disk
check_services
echo "===== 完成：${FAILED} 项失败 ====="

# 退出码语义：0 全绿；1 有 FAIL——cron/CI 按退出码决定告警
exit $(( FAILED > 0 ? 1 : 0 ))
```

逐段讲解：

- 这里**故意不用 `-e`**：巡检是"查完所有项再汇总"，单项失败（比如 `free` 不在）不该终止整体——与脚本一的取舍相反，**-e 用不用取决于"失败后继续有没有意义"**；
- `FAILED` 计数器 + 最终 `exit 1`：让脚本成为可编排的积木——cron 按退出码告警、CI 按退出码卡门禁，人看彩色输出，机器看退出码，一份脚本两种消费者；
- 浮点比较 `awk "BEGIN{exit !($load > $threshold)}"`：Bash 不支持浮点，`(( ))` 只能整数——浮点比较交给 awk 是标准解法；`exit !(...)` 把比较结果翻译成退出码。

## 脚本三：批量部署（滚动 + 失败即停）

需求：把构建产物分发到 5 台应用机并重启服务，逐台滚动、一台失败立即中止。

```bash
#!/usr/bin/env bash
# deploy.sh <产物包> — 滚动部署到 HOSTS
set -euo pipefail
IFS=$'\n\t'

ARTIFACT="${1:?用法: $0 <产物包.tar.gz>}"      # :? 缺参即报错退出
HOSTS=(web1 web2 web3 web4 web5)
APP_DIR=/opt/myapp
DEPLOY_LOCK=/tmp/myapp-deploy.lock

# 防并发：同一时刻只允许一个部署（flock 文件锁）
exec 200>"$DEPLOY_LOCK"
flock -n 200 || { echo "已有部署在进行" >&2; exit 1; }

[[ -f "$ARTIFACT" ]] || { echo "产物不存在: $ARTIFACT" >&2; exit 1; }

for host in "${HOSTS[@]}"; do
    echo "===== 部署 $host ====="

    # 上传（scp 失败即整体失败——-e 保证）
    scp -q "$ARTIFACT" "$host:/tmp/myapp-new.tar.gz"

    # 远程执行：注意引号嵌套——单引号内的 $ 是远端展开
    ssh -o BatchMode=yes "$host" bash -s <<'REMOTE'
        set -euo pipefail
        tar -xzf /tmp/myapp-new.tar.gz -C /opt/myapp --strip-components=1
        sudo systemctl restart myapp
        sleep 2
        curl -fsS http://localhost:8080/healthz > /dev/null   # 健康检查不过即失败
        echo "远端部署完成"
REMOTE

    echo "$host OK"
done

echo "全部完成：${#HOSTS[@]} 台"
```

逐段讲解：

- `ARTIFACT="${1:?用法...}"`：参数缺失时打印用法并退出——比 `if [ -z "$1" ]` 少三行且不可绕过；
- `flock -n 200`：两个部署并发时第二个立即失败。没锁会发生什么：两份产物交叉解压、服务被重启两次——"低概率但必然发生"的事故；
- `ssh host bash -s <<'REMOTE'`：heredoc **带引号定界符**（`<<'REMOTE'`）让本地不做任何变量展开，`$` 全部原样送到远端执行——写成 `<<REMOTE`（无引号）时本地的 `$HOME` 等会先被展开，远端拿到的是错的；
- 远端脚本同样 `set -euo pipefail` + 健康检查：**部署的判定标准是"健康检查通过"而不是"命令没报错"**——restart 成功但应用起不来是常态，没有 curl 这一行，脚本会在全员挂掉后还报告"全部完成"。

## 常见困惑

**"bash 与 sh 的区别？"**——`sh` 在多数系统是 bash 的 POSIX 模式或 dash：不支持数组、`[[ ]]`、`local` 的部分行为。脚本一律 `#!/usr/bin/env bash` 并用 bash 语法，别让 shebang 与语法打架。

**"脚本里 sudo 怎么处理？"**——cron 环境没有 tty，交互输密码不可行。要么配 sudoers 白名单（见[Linux 系统管理](/devops/015-LinuxSystemManagement)），要么整个脚本由 root 跑但内部 `su` 降权执行业务命令。

**"要不要学 awk/sed 深水区？"**——巡检与日志场景的 awk 用法（本篇三处）够覆盖 80%；复杂的文本变换出现时，那是该换 Python 的信号——脚本长度超过 200 行或出现复杂数据结构，维护成本会反噬。

## 动手实践：把三个脚本跑起来

任务：

1. 写 cleanup_logs.sh，造 40 天前的假日志验证 `find -mtime +30` 命中，跑两遍验证幂等（第二遍 freed=0）；
2. 把 healthcheck.sh 的 check_disk 阈值改成 1%，验证 FAIL 路径与退出码 1（`echo $?`）；
3. 给 deploy.sh 演练：两台 Docker+sshd 容器当目标机，故意让第二台 healthz 失败，验证"第一台成功保留、脚本中止"；
4. （陷阱实验）写一个不含引号的 `rm -rf $TARGET` 脚本，TARGET 带空格，在安全的临时目录里观察分词后果。

<details>
<summary>参考实现（先自己写再展开）</summary>

```bash
# 1
mkdir -p /tmp/logtest && touch -d "40 days ago" /tmp/logtest/old.log
touch /tmp/logtest/new.log
# 脚本里 LOG_DIRS=(/tmp/logtest) RETAIN_DAYS=30，跑两遍：
bash cleanup_logs.sh    # 释放 0 MB（old.log 极小）但能从输出确认命中清理
bash cleanup_logs.sh    # 第二遍无事可做——幂等验证

# 2：阈值 1 后
bash healthcheck.sh; echo "exit=$?"   # exit=1，磁盘项 [FAIL]

# 3：第二台容器的应用只监听 80（healthz 是 404）时
bash deploy.sh app.tar.gz
# 输出 web1 OK 后中止；web1 上的新版本仍在服务——滚动语义保留成功部分

# 4
TARGET="/tmp/safe dir1 dir2"
mkdir -p /tmp/safe "dir1" "dir2" 2>/dev/null || true
rm -rf $TARGET      # 分词成 rm -rf /tmp/safe dir1 dir2 —— 三条路径都删了
```

判读要点：任务 4 的输出就是"少写一个引号删三个目录"的现场——这也是本篇把引号陷阱放在开头讲的原因。
</details>

## 检验清单

- 能解释 `set -euo pipefail` 三个开关各自防什么事故，并说出三个不触发 `-e` 的例外；
- 能背出引号与分词的三个陷阱及 `-print0 | xargs -0` 的适用场景；
- 能说明三个脚本对 `-e` 的不同取舍（清理要停、巡检要继续、部署要停）及理由；
- 会用 flock 防并发部署，用 heredoc 带引号定界符写远端脚本；
- 能给脚本设计退出码语义让 cron/CI 正确告警。

## 下一步

- [Linux 系统管理与服务管理](/devops/015-LinuxSystemManagement)：脚本要操作的服务与权限层；
- [IaC](/devops/200-IaC) 与 [Ansible](/devops/220-AnsiblePlaybookConfigManagement)：脚本规模失控后的进阶方向；
- [K8s 排障](/devops/098-KubernetesTroubleshooting)：容器时代的巡检对象变了，方法论没变。

## 参考与致谢

- Bash 官方手册（GNU Free Documentation License）：<https://www.gnu.org/software/bash/manual/>
- Google Shell Style Guide（Apache-2.0，风格参考）：<https://google.github.io/styleguide/shellguide.html>
- 巡检脚本承接自本模块旧篇 010 的健康检查示例并加固重写（补 set 防护、退出码语义与浮点比较修正）。
