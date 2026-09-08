---
order: 570
title: AIDE 文件完整性检查
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity AIDE 文件完整性检查 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## AIDE 安装与初始化

**基本写法:安装 AIDE**
`apt-get install aide`
```bash
# 安装 AIDE 文件完整性检查工具
sudo apt-get install aide
```

**基本写法:初始化 AIDE 数据库**
`aideinit`
```bash
# 初始化 AIDE 数据库(生成基础快照)
sudo aideinit
```

**基本写法:查看初始化输出**
`aideinit --output`
```bash
# 指定输出文件路径初始化
sudo aideinit --output /var/lib/aide/aide.db.new
```

**基本写法:手动生成数据库**
`aide --init`
```bash
# 手动初始化 AIDE 数据库
sudo aide --init
```

**基本写法:安装初始化数据库**
`cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db`
```bash
# 将新数据库设为当前基准数据库
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

---

## AIDE 检查与比对

**基本写法:执行完整性检查**
`aide --check`
```bash
# 比对当前文件与基准数据库
sudo aide --check
```

**基本写法:更新数据库(检查并更新)**
`aide --update`
```bash
# 检查文件变化并更新数据库
sudo aide --update
```

**基本写法:检查并输出到文件**
`aide --check --report=file:<文件>`
```bash
# 检查结果输出到文件
sudo aide --check --report=file:/tmp/aide-report.txt
```

**基本写法:检查并输出为 HTML**
`aide --check --report=html > <文件>`
```bash
# 生成 HTML 格式检查报告
sudo aide --check > /tmp/aide-report.html
```

**基本写法:详细检查输出**
`aide --check --verbose 5`
```bash
# 显示详细检查信息
sudo aide --check --verbose 5
```

---

## AIDE 配置文件

**基本写法:查看配置文件**
`cat /etc/aide/aide.conf`
```bash
# 查看 AIDE 配置文件
cat /etc/aide/aide.conf
```

**基本写法:定义规则**
`<规则名> = <属性>`
```bash
# 在配置文件中定义规则
# PERMS = p+i+n+u+g+acl
# LOG = p+i+n+u+g+S
# CONTENT = p+i+n+u+g+s+m+c+acl+selinux+sha512
```

**基本写法:应用规则到路径**
`<路径> <规则>`
```bash
# 为指定路径应用规则
# /etc PERMS
# /var/log LOG
# /bin CONTENT
```

**基本写法:排除路径**
`!<路径>`
```bash
# 排除不需要检查的目录
# !/var/log/.*
# !/tmp/.*
# !/proc/.*
```

**基本写法:测试配置文件**
`aide --config-check`
```bash
# 检查配置文件语法
sudo aide --config-check
```

---

## AIDE 数据库管理

**基本写法:查看数据库版本**
`aide --version`
```bash
# 查看 AIDE 工具版本
aide --version
```

**基本写法:备份数据库**
`cp /var/lib/aide/aide.db /var/lib/aide/aide.db.bak.$(date +%F)`
```bash
# 备份基准数据库
sudo cp /var/lib/aide/aide.db /var/lib/aide/aide.db.bak.$(date +%F)
```

**基本写法:压缩存储数据库**
`gzip /var/lib/aide/aide.db.new`
```bash
# 压缩新数据库节省空间
sudo gzip /var/lib/aide/aide.db.new
```

**基本写法:验证数据库完整性**
`sha256sum /var/lib/aide/aide.db`
```bash
# 计算数据库哈希验证完整性
sha256sum /var/lib/aide/aide.db
```

**基本写法:数据库归档**
`tar -czf aide-archive-$(date +%F).tar.gz /var/lib/aide/`
```bash
# 归档数据库到安全位置
sudo tar -czf /backup/aide-archive-$(date +%F).tar.gz /var/lib/aide/
```

---

## AIDE 报告分析

**基本写法:查看变更摘要**
`grep -E "added|removed|changed" <报告文件>`
```bash
# 提取变更摘要统计
grep -E "added|removed|changed" /tmp/aide-report.txt
```

**基本写法:统计变更文件数**
`grep -c "changed:" <报告文件>`
```bash
# 统计变更文件数量
grep -c "changed:" /tmp/aide-report.txt
```

**基本写法:提取新增文件**
`grep "added:" <报告文件>`
```bash
# 提取所有新增文件
grep "added:" /tmp/aide-report.txt
```

**基本写法:提取删除文件**
`grep "removed:" <报告文件>`
```bash
# 提取所有被删除文件
grep "removed:" /tmp/aide-report.txt
```

**基本写法:提取权限变更**
`grep -E "perm|user|group" <报告文件>`
```bash
# 查找权限与属主变更
grep -E "perm|user|group|acl" /tmp/aide-report.txt
```

---

## AIDE 定时任务

**基本写法:每日定时检查**
`crontab -e`
```bash
# 添加每天凌晨 3 点执行检查的定时任务
# 0 3 * * * /usr/bin/aide --check --report=file:/var/log/aide/aide-$(date +\%F).log
```

**基本写法:周报生成**
`crontab -e`
```bash
# 每周一 4 点生成周报告
# 0 4 * * 1 /usr/bin/aide --check > /var/log/aide/weekly-$(date +\%F).html
```

**基本写法:检查后邮件通知**
`crontab -e`
```bash
# 检查完成后发送邮件
# 0 3 * * * /usr/bin/aide --check | mail -s "AIDE 报告 $(date)" admin@example.com
```

**基本写法:检查异常退出处理**
`crontab -e`
```bash
# 检查异常时发送告警邮件
# 0 3 * * * /usr/bin/aide --check --report=file:/tmp/aide.log || mail -s "AIDE 告警" admin@example.com < /tmp/aide.log
```

**基本写法:定期更新数据库**
`crontab -e`
```bash
# 每月 1 号更新数据库
# 0 3 1 * * /usr/bin/aide --update && cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

---

## AIDE 规则定制

**基本写法:自定义哈希算法**
`<规则名> = p+i+n+sha256+sha512`
```bash
# 配置使用 SHA256 与 SHA512 哈希
# CONTENT_HASH = p+i+n+sha256+sha512
```

**基本写法:启用 SELinux 属性检查**
`<规则名> = p+selinux`
```bash
# 检查 SELinux 上下文变化
# SELINUX_RULE = p+i+n+selinux
```

**基本写法:启用 ACL 检查**
`<规则名> = p+acl+xattrs`
```bash
# 检查 ACL 与扩展属性
# ACL_RULE = p+i+n+acl+xattrs
```

**基本写法:排除特定文件类型**
`!<路径>/*.tmp`
```bash
# 排除临时文件
# !/var/log/.*.log
# !/tmp/.*
# !/var/tmp/.*
```

**基本写法:针对不同目录设置不同规则**
`<路径> <规则>`
```bash
# 关键目录严格检查,日志目录宽松检查
# /etc p+i+n+u+g+s+m+c+acl+selinux+sha512
# /bin p+i+n+u+g+s+m+c+sha512
# /var/log p+i+n+u+g
```

---

## AIDE 与监控集成

**基本写法:集成到 Nagios 监控**
`check_aide.sh`
```bash
# Nagios 检查脚本
# #!/bin/bash
# RESULT=$(sudo aide --check 2>&1 | tail -1)
# if echo "$RESULT" | grep -q "All files match"; then
#     echo "OK - AIDE check passed"
#     exit 0
# else
#     echo "CRITICAL - AIDE detected changes"
#     exit 2
# fi
```

**基本写法:集成到 Zabbix**
`zabbix-agentd.conf`
```bash
# Zabbix 自定义监控项
# UserParameter=aide.check,sudo /usr/bin/aide --check 2>&1 | grep -c "changed:"
```

**基本写法:集成到 Prometheus**
`aide_exporter.py`
```bash
# 通过脚本暴露 AIDE 指标
# #!/usr/bin/env python3
# import subprocess
# result = subprocess.run(['sudo', 'aide', '--check'], capture_output=True, text=True)
# changed = result.stdout.count('changed:')
# print(f'aide_files_changed {changed}')
```

**基本写法:与 SIEM 联动**
`rsyslog.conf`
```bash
# 将 AIDE 日志转发到 SIEM
# if $programname == 'aide' then @@siem.example.com:514
```

---

## AIDE 安全最佳实践

**基本写法:数据库离线存储**
`scp /var/lib/aide/aide.db <安全主机>:<路径>`
```bash
# 将数据库复制到离线主机存储
scp /var/lib/aide/aide.db admin@secure-host:/backup/aide.db
```

**基本写法:只读介质存储**
`cp /var/lib/aide/aide.db /media/cdrom/`
```bash
# 将数据库写入只读介质防止篡改
cp /var/lib/aide/aide.db /mnt/readonly/
```

**基本写法:数字签名数据库**
`gpg --sign /var/lib/aide/aide.db`
```bash
# 使用 GPG 对数据库签名
gpg --sign /var/lib/aide/aide.db
```

**基本写法:验证数据库签名**
`gpg --verify /var/lib/aide/aide.db.gpg`
```bash
# 验证数据库签名是否被篡改
gpg --verify /var/lib/aide/aide.db.gpg
```

**基本写法:关键系统文件检查清单**
`cat /etc/aide/aide.conf | grep -E "^/" | head -20`
```bash
# 查看当前监控的关键路径
grep -E "^/" /etc/aide/aide.conf | head -20
```
