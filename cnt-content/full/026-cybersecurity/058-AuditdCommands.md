---
order: 580
title: auditd 审计命令
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity auditd 审计命令 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## auditd 服务管理

**基本写法:启动 auditd 服务**
`systemctl start auditd`
```bash
# 启动 auditd 审计服务
sudo systemctl start auditd
sudo systemctl enable auditd
```

**基本写法:查看服务状态**
`systemctl status auditd`
```bash
# 查看 auditd 服务运行状态
sudo systemctl status auditd
```

**基本写法:重启 auditd 服务**
`systemctl restart auditd`
```bash
# 重启 auditd 服务
sudo systemctl restart auditd
```

**基本写法:重载规则配置**
`systemctl reload auditd`
```bash
# 重新加载 auditd 配置不中断服务
sudo systemctl reload auditd
```

**基本写法:查看 auditd 版本**
`auditd -v`
```bash
# 查看 auditd 版本信息
auditd -v
```

---

## 审计规则管理

**基本写法:查看已加载规则**
`auditctl -l`
```bash
# 查看当前已加载的所有审计规则
sudo auditctl -l
```

**基本写法:添加文件监控规则**
`auditctl -w <文件> -p <权限> -k <键值>`
```bash
# 监控 /etc/passwd 文件的读写与属性变更
sudo auditctl -w /etc/passwd -p rwa -k passwd_change
```

**基本写法:监控目录**
`auditctl -w <目录> -p <权限> -k <键值>`
```bash
# 监控 /etc 目录所有变化
sudo auditctl -w /etc/ -p wa -k etc_changes
```

**基本写法:监控系统调用**
`auditctl -a always,exit -S <系统调用> -F <过滤条件> -k <键值>`
```bash
# 监控 unlink 系统调用记录文件删除
sudo auditctl -a always,exit -S unlink -S unlinkat -F auid>=1000 -k file_delete
```

**基本写法:删除规则**
`auditctl -d <规则>`
```bash
# 删除指定审计规则
sudo auditctl -d -w /etc/passwd -p rwa -k passwd_change
```

**基本写法:清空所有规则**
`auditctl -D`
```bash
# 清空所有已加载审计规则
sudo auditctl -D
```

---

## 审计规则配置文件

**基本写法:查看规则配置**
`cat /etc/audit/audit.rules`
```bash
# 查看持久化审计规则配置
cat /etc/audit/audit.rules
```

**基本写法:添加持久化规则**
`echo '<规则>' >> /etc/audit/audit.rules`
```bash
# 添加永久审计规则
echo '-w /etc/passwd -p rwa -k passwd_change' | sudo tee -a /etc/audit/audit.rules
```

**基本写法:重载规则文件**
`augenrules --load`
```bash
# 从 rules.d 目录加载规则
sudo augenrules --load
```

**基本写法:测试规则配置**
`augenrules --check`
```bash
# 检查规则配置文件语法
sudo augenrules --check
```

**基本写法:查看规则目录**
`ls /etc/audit/rules.d/`
```bash
# 列出 rules.d 目录中的规则文件
ls -l /etc/audit/rules.d/
```

---

## 审计日志查询

**基本写法:查看所有审计日志**
`cat /var/log/audit/audit.log`
```bash
# 查看审计日志文件
sudo tail -n 100 /var/log/audit/audit.log
```

**基本写法:按键值查询**
`ausearch -k <键值>`
```bash
# 查询特定键值的审计事件
sudo ausearch -k passwd_change
```

**基本写法:按时间查询**
`ausearch -ts <开始时间> -te <结束时间>`
```bash
# 查询指定时间范围的审计事件
sudo ausearch -ts today
sudo ausearch -ts "2026-07-31 10:00:00" -te "2026-07-31 12:00:00"
```

**基本写法:按用户查询**
`ausearch -ua <UID>`
```bash
# 查询特定用户的活动
sudo ausearch -ua 1000
```

**基本写法:按事件类型查询**
`ausearch -m <事件类型>`
```bash
# 查询登录相关审计事件
sudo ausearch -m LOGIN
```

---

## 审计报告生成

**基本写法:生成摘要报告**
`aureport`
```bash
# 生成审计日志摘要报告
sudo aureport
```

**基本写法:生成失败事件报告**
`aureport --failed`
```bash
# 生成所有失败事件报告
sudo aureport --failed
```

**基本写法:生成成功事件报告**
`aureport --success`
```bash
# 生成所有成功事件报告
sudo aureport --success
```

**基本写法:生成用户报告**
`aureport -u`
```bash
# 生成按用户分类的报告
sudo aureport -u
```

**基本写法:生成文件访问报告**
`aureport -f`
```bash
# 生成文件访问报告
sudo aureport -f
```

**基本写法:生成命令执行报告**
`aureport -x`
```bash
# 生成执行命令报告
sudo aureport -x | head -20
```

---

## 审计日志分析

**基本写法:统计登录失败次数**
`aureport --failed --summary -i`
```bash
# 统计失败事件概要
sudo aureport --failed --summary -i
```

**基本写法:查看登录失败用户**
`aureport -u --failed -i | awk '{print $4}' | sort | uniq -c`
```bash
# 统计登录失败用户排行
sudo aureport -u --failed -i | awk '{print $4}' | sort | uniq -c | sort -rn | head
```

**基本写法:查找可疑文件访问**
`ausearch -k <键值> | grep -i "denied\|error"`
```bash
# 查找被拒绝的文件访问
sudo ausearch -k etc_changes | grep -i "denied\|error"
```

**基本写法:统计系统调用频率**
`ausearch -m SYSCALL | grep -oE "syscall=[0-9]+" | sort | uniq -c | sort -rn`
```bash
# 统计系统调用频率排行
sudo ausearch -m SYSCALL | grep -oE "syscall=[0-9]+" | sort | uniq -c | sort -rn | head
```

**基本写法:监控特定进程**
`ausearch -sc <系统调用> | grep <进程名>`
```bash
# 查找特定进程的系统调用
sudo ausearch -sc execve | grep "nginx"
```

---

## 高级审计规则

**基本写法:监控特权命令执行**
`auditctl -a always,exit -F path=<命令路径> -F perm=x -k <键值>`
```bash
# 监控 sudo 命令执行
sudo auditctl -a always,exit -F path=/usr/bin/sudo -F perm=x -k privilege
```

**基本写法:监控用户切换**
`auditctl -w /bin/su -p x -k user_switch`
```bash
# 监控 su 命令使用
sudo auditctl -w /bin/su -p x -k user_switch
```

**基本写法:监控 SSH 登录**
`auditctl -w /var/log/lastlog -p wa -k ssh_login`
```bash
# 监控 SSH 登录事件
sudo auditctl -w /var/log/lastlog -p wa -k ssh_login
```

**基本写法:监控内核模块加载**
`auditctl -w /sbin/insmod -p x -k module_load`
```bash
# 监控内核模块加载
sudo auditctl -w /sbin/insmod -p x -k module_load
sudo auditctl -w /sbin/modprobe -p x -k module_load
```

**基本写法:监控权限变更**
`auditctl -a always,exit -S chmod -S chown -F auid>=1000 -k perms`
```bash
# 监控文件权限变更
sudo auditctl -a always,exit -S chmod -S chown -S chmodat -F auid>=1000 -k perms
```

---

## 审计日志轮转

**基本写法:查看日志轮转配置**
`cat /etc/audit/auditd.conf`
```bash
# 查看 auditd 配置文件
cat /etc/audit/auditd.conf | grep -i "max\|rotate\|size"
```

**基本写法:配置日志大小限制**
`num_logs = <数量>`
```bash
# 保留 10 个日志文件
# num_logs = 10
# max_log_file = 50
# max_log_file_action = rotate
```

**基本写法:手动轮转日志**
`kill -USR1 $(pidof auditd)`
```bash
# 手动触发日志轮转
sudo kill -USR1 $(pidof auditd)
```

**基本写法:压缩归档日志**
`gzip /var/log/audit/audit.log.1`
```bash
# 压缩归档日志文件
sudo gzip /var/log/audit/audit.log.1
```

**基本写法:清理旧日志**
`find /var/log/audit/ -name "audit.log.*" -mtime +30 -delete`
```bash
# 删除 30 天前的归档日志
sudo find /var/log/audit/ -name "audit.log.*" -mtime +30 -delete
```

---

## 审计性能优化

**基本写法:查看审计速率限制**
`auditctl -s | grep rate`
```bash
# 查看审计日志速率限制
sudo auditctl -s
```

**基本写法:设置速率限制**
`auditctl -r <每秒条数>`
```bash
# 限制每秒最多记录 100 条
sudo auditctl -r 100
```

**基本写法:设置缓冲区大小**
`auditctl -b <缓冲区大小>`
```bash
# 设置审计缓冲区为 8192 条
sudo auditctl -b 8192
```

**基本写法:设置积压阈值**
`auditctl -f <级别>`
```bash
# 设置积压失败级别(2 为打印到控制台)
sudo auditctl -f 2
```

**基本写法:查看审计状态**
`auditctl -s`
```bash
# 查看 auditd 运行状态与参数
sudo auditctl -s
```

---

## 审计规则模板

**基本写法:监控所有 sudo 操作**
`auditctl -w /var/log/sudo.log -p wa -k sudo_log`
```bash
# 监控 sudo 日志文件变化
sudo auditctl -w /var/log/sudo.log -p wa -k sudo_log
```

**基本写法:监控 cron 任务变更**
`auditctl -w /etc/crontab -p wa -k cron_change`
```bash
# 监控计划任务变更
sudo auditctl -w /etc/crontab -p wa -k cron_change
sudo auditctl -w /etc/cron.d/ -p wa -k cron_change
```

**基本写法:监控网络配置变更**
`auditctl -w /etc/network/ -p wa -k network_change`
```bash
# 监控网络配置文件变更
sudo auditctl -w /etc/network/ -p wa -k network_change
sudo auditctl -w /etc/hosts -p wa -k network_change
```

**基本写法:监控 SSH 配置变更**
`auditctl -w /etc/ssh/sshd_config -p wa -k ssh_config`
```bash
# 监控 SSH 配置文件变更
sudo auditctl -w /etc/ssh/sshd_config -p wa -k ssh_config
```

**基本写法:监控用户与组变更**
`auditctl -w /etc/passwd -p wa -k user_change`
```bash
# 监控用户和组文件变更
sudo auditctl -w /etc/passwd -p wa -k user_change
sudo auditctl -w /etc/shadow -p wa -k user_change
sudo auditctl -w /etc/group -p wa -k user_change
```
