---
order: 20
title: Linux 系统管理与服务管理
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: 系统信息与资源命令、文件系统与权限模型、用户与 sudo、systemd 服务单元编写与 journalctl 排障——一台 Linux 服务器的日常管理手册
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：DevOps 基础设施 / Linux 系统管理（服务器侧的日常操作层）。
- **解决什么问题**：拿到一台 Linux 服务器后的三件事——摸清资源（CPU/内存/磁盘）、管好访问（用户与权限）、管好服务（部署的应用怎么常驻、怎么开机自启、怎么看它的日志）。
- **什么时候用到**：接管新服务器；给应用写 systemd 服务单元；排查"服务挂了/起不来"；给团队分配服务器权限。
- **本篇承接**：[DevOps 与 SRE 概述](/devops/010-OverviewLinuxBasics)——理念篇在这里，动手篇从这里开始。

## 心智模型：服务器管理的四个圈层

```text
资源层   CPU/内存/磁盘/网络   → top、free、df、ip     （它还活着吗）
文件层   目录结构/权限/链接   → ls -l、chmod、ln       （东西放哪、谁能碰）
身份层   用户/组/sudo         → useradd、visudo        （谁能登进来、能做什么）
服务层   systemd 单元/日志    → systemctl、journalctl  （应用怎么常驻）
```

排查问题时从外到内走：资源层先看负载，服务层看进程与日志，身份层查权限，文件层查空间。

## 资源层：五条摸底命令

```bash
uname -a                     # 内核版本（问"内核几点几"先答这句）
cat /etc/os-release          # 发行版与版本
uptime                       # 运行时长 + 负载三兄弟（1/5/15 分钟平均）
free -h                      # 内存（-h 人类可读单位）
df -h                        # 各挂载点磁盘水位
du -sh /var/log/*            # 目录体积（配合 df 找空间去哪了）
ss -tlnp                     # 谁在监听哪些端口（-p 要 root）
```

两个判读要点：

- **load 与核数的关系**：load 1.0 = 一个核满载。8 核机器 load 6 属于忙而可控，load 16 就是过载——单看 load 数值不看核数是新手误判第一来源；
- **free -h 的 available 列才是真水位**：buff/cache 会被自动回收，看 free 列会误判"内存快用完了"。

## 文件层：目录结构与权限模型

关键目录的职责（放错位置的文件是排障迷宫的起点）：

```text
/etc     配置文件（改前备份）        /var/log    日志（涨满磁盘的头号嫌犯）
/home    普通用户主目录              /opt        第三方软件（自部署应用常放这）
/usr     发行版管理的程序            /proc       进程与内核信息（虚拟文件系统）
/tmp     临时文件（重启可能清空）    /dev        设备文件
```

权限位解析——`-rwxr-xr--` 从左到右：

```text
-      文件类型（- 文件 / d 目录 / l 链接）
rwx    所有者：读、写、执行（7）
r-x    所属组：读、执行，不可写（5）
r--    其他人：只读（4）
```

| 权限 | 数字 | 对文件 | 对目录 |
| --- | --- | --- | --- |
| r | 4 | 读取内容 | 列出条目 |
| w | 2 | 修改内容 | 创建/删除条目 |
| x | 1 | 执行 | 进入（cd） |

最常踩的两个坑都在目录的 x 权限上：目录没有 x，即使有 r 也进不去（只能看名字）；脚本没有 x，`./script.sh` 报 Permission denied（`chmod +x` 或 `bash script.sh` 绕过）。

```bash
chmod 755 deploy.sh        # rwxr-xr-x：自己全权、其他人读+执行
chown app:app /opt/myapp   # 递归改属主用 -R，生产操作先确认范围
ln -s /opt/app/releases/v12 /opt/app/current   # 发布惯例：current 软链指向新版本
```

软链接的发布模式值得单独记：`current` 永远是应用配置里写死的路径，发布只是把软链换指向——回滚就是把软链改回 v11。

## 身份层：用户、组与 sudo 最小授权

```bash
useradd -m -s /bin/bash deploy    # -m 建主目录、-s 指定 shell
passwd deploy                      # 设密码（交互）
usermod -aG docker deploy          # -aG 追加到组（丢 -a 会清掉原有组！）
groups deploy                      # 验证组成员身份
```

`usermod -aG` 丢掉 `-a` 是真实事故级笔误：G 单独用表示"覆盖所有组"，用户瞬间被踢出 wheel/sudo 组，管理员自锁。改完身份**必须重登或 `newgrp`** 才生效——"加组了还不行"九成是这个。

sudo 的正确姿势是**最小授权白名单**而不是全员 NOPASSWD ALL：

```bash
sudo visudo     # 语法检查的编辑器（存盘前自动校验，直接改文件没有这层保护）
# deploy 可以免密重启应用服务，仅此而已：
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart myapp, /bin/systemctl status myapp
```

逐段解释这一行：`deploy` 用户、`(ALL)` 以任意目标用户、`NOPASSWD` 免密、后面是**精确到命令路径**的白名单。换成 `ALL=(ALL) NOPASSWD:ALL` 等于把 root 送人了——那次"图省事"会在三个月后的事故复盘里被点名。

## 服务层：systemd 服务单元编写

systemd 是现代 Linux 的服务管理标准（PID 1）。四类日常命令：

```bash
systemctl start myapp        # 启动
systemctl status myapp       # 状态（含最近几行日志与主 PID）
systemctl restart myapp      # 重启（断开连接）
systemctl reload myapp       # 重载配置（不断连，服务需支持）
systemctl enable myapp       # 开机自启（建符号链接，不等于启动）
systemctl enable --now myapp # 自启 + 立即启动（一步到位）
```

`enable` 与 `start` 是两个独立维度（"开机拉起"与"现在运行"）——配了 enable 忘了 start 是新手高频困惑，`--now` 一并解决。

自定义服务单元，从生产模板逐段读：

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application Service
After=network.target docker.service    # 启动顺序：等网络与 docker 就绪
Requires=docker.service                # 强依赖：docker 失败则本服务不启动

[Service]
Type=simple                 # 前台进程（ExecStart 就是主进程）
User=appuser                 # 降权运行——绝不用 root 跑应用
Group=appgroup
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/start.sh
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure           # 异常退出自动拉起
RestartSec=5                 # 崩溃后 5 秒再拉（防风暴循环）

Environment=NODE_ENV=production
Environment=PORT=3000

# 安全加固：默认拒绝，白名单放行
NoNewPrivileges=true         # 禁止提权
ProtectSystem=strict         # 文件系统只读
ProtectHome=true             # 家目录不可见
ReadWritePaths=/opt/myapp/data /var/log/myapp   # 唯二可写路径

[Install]
WantedBy=multi-user.target   # 挂到多用户运行级（enable 的落点）
```

三个必懂的键：

- `Type=simple` vs `Type=forking`：应用是前台进程就 simple（现代应用的标准形态）；老式守护进程自己 fork 到后台的才用 forking；
- `Restart=on-failure` vs `always`：on-failure 在**非零退出**时拉起，被 systemctl stop 不拉——运维主动停服不会被"顶回来"；always 连正常退出也拉，适合必须永远在线的进程；
- `ProtectSystem=strict` + `ReadWritePaths`：整个文件系统对服务只读、只放行声明的路径——应用被打穿时写不了系统关键位置。加安全项后服务起不来的排查路径：`systemctl status` 看 cgroup 报错 + journalctl 找 "Permission denied"。

改完单元文件必须 `daemon-reload`，否则 systemd 用的是内存里的旧定义：

```bash
sudo systemctl daemon-reload     # 重读单元定义
sudo systemctl enable --now myapp
```

## journalctl：服务日志的正门

systemd 服务的 stdout/stderr 自动进 journal，不用自己写日志文件：

```bash
journalctl -u myapp               # 本服务的全部日志
journalctl -u myapp -f            # 实时跟踪（等效 tail -f）
journalctl -u myapp --since "1 hour ago" --until "2026-10-07 12:00"
journalctl -u myapp -p err        # 只看错误级别
journalctl --disk-usage           # journal 占了多少磁盘
sudo journalctl --vacuum-time=30d # 只留 30 天（磁盘告急的急救命令）
```

排障套路：**status 看状态 → journalctl -u 服务 -f 起服务看现场 → -p err 过滤**。三个高频谜题的答案：

1. "服务日志去哪了？"——journal 里，`journalctl -u`；应用自己写文件日志的另算；
2. "journal 占满磁盘？"——`--vacuum-time` 或在 `/etc/systemd/journald.conf` 设 `SystemMaxUse=1G` 持久上限；
3. "重启后日志没了？"——journal 默认易失（重启清空），要持久化设 `Storage=persistent`。

## 实战场景：三个不同角色的操作清单

**场景一：给一个 Node 应用写 systemd 单元**。按本篇模板改四处——ExecStart 指向 `node /opt/myapp/dist/server.js`、User 指向专用应用账号、ReadWritePaths 给数据与日志目录、enable --now 上线。验证：`systemctl status` 看主 PID、kill 掉进程看 `Restart=on-failure` 是否 5 秒拉起。

**场景二：新人入职给服务器权限**。useradd -m + usermod -aG（追加专属组）+ visudo 白名单（restart/status 两条命令）+ 验证 `sudo -l -U 用户名` 列出其可执行命令。全程不给密码、不给 ALL。

**场景三：磁盘告警 90%**。`df -h` 定位挂载点 → `du -sh` 逐层下钻找大头（常见：/var/log 旧日志、journal、应用日志未轮转）→ journalctl --vacuum-time 急救 → 给应用日志配轮转（logrotate 配置与日志治理见[日志管理](/devops/270-LogManagement)）。

## 动手实践：从零把一个脚本变成服务

任务：写一个每 10 秒输出心跳的脚本，用 systemd 管起来——

1. 写 `/opt/heartbeat/beat.sh`（while 循环 + echo + sleep），chmod +x；
2. 建专用系统账号 heartbeat（不给登录 shell：`useradd -r -s /usr/sbin/nologin`）；
3. 写单元文件：User 指向专用账号、Restart=always、安全加固三项；
4. enable --now 启动，journalctl -f 观察心跳输出；
5. 故意 kill 掉进程，验证 always 拉起；再故意把脚本权限改成 700 属主 root，观察服务失败与 journalctl 里的报错。

<details>
<summary>参考实现（先自己写再展开）</summary>

```bash
# 1
sudo mkdir -p /opt/heartbeat
sudo tee /opt/heartbeat/beat.sh >/dev/null <<'EOF'
#!/bin/bash
while true; do
  echo "beat $(date +%T)"
  sleep 10
done
EOF
sudo chmod 755 /opt/heartbeat/beat.sh

# 2
sudo useradd -r -s /usr/sbin/nologin heartbeat

# 3
sudo tee /etc/systemd/system/heartbeat.service >/dev/null <<'EOF'
[Unit]
Description=Heartbeat demo service
After=network.target

[Service]
Type=simple
User=heartbeat
ExecStart=/opt/heartbeat/beat.sh
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/heartbeat

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now heartbeat

# 4
journalctl -u heartbeat -f        # 每 10 秒一行 beat

# 5
pkill -f beat.sh                  # 3 秒后被拉起，journalctl 可见重启记录
sudo chmod 700 /opt/heartbeat/beat.sh   # heartbeat 用户读不到
sudo systemctl restart heartbeat
systemctl status heartbeat        # failed
journalctl -u heartbeat -p err    # Permission denied / status=203/EXEC
```

判读要点：任务 5 的 status=203/EXEC 就是"脚本不可执行/不可读"的 systemd 报错形态；修回权限后 systemctl start 恢复。
</details>

## 检验清单

- 能用五条命令完成新服务器摸底，并正确解读 load 与 available 内存；
- 能解析权限串并说出"目录 x 权限"与"脚本 +x"两个坑；
- 能写出最小授权的 sudoers 条目，并解释 `usermod -aG` 丢 -a 的后果；
- 能从零写一个含降权与安全加固的 systemd 单元，并区分 enable/start、simple/forking、on-failure/always；
- 会用 journalctl 排障并处理 journal 磁盘占用。

## 下一步

- [Shell 脚本编程](/devops/020-ShellScriptProgramming)：把本篇的命令串成自动化脚本；
- [包管理与仓库](/devops/030-PackageManagementRepository)：软件从哪装、版本谁管；
- [Kubernetes 核心资源](/devops/090-KubernetesCoreDetailed)：服务常驻的下一代答案（容器编排）。

## 参考与致谢

- systemd 官方文档（systemd.unit / systemd.exec 手册页，LGPLv2.1+）：<https://www.freedesktop.org/wiki/Software/systemd/>
- Linux man-pages 项目（GPLv2+ 文档许可）：<https://man7.org/linux/man-pages/>
- 本篇系统命令/权限/systemd 段落承接自旧篇 010 并按教学化重写扩写。
