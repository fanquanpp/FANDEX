---
order: 560
title: SELinux/AppArmor 强制访问控制
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity SELinux/AppArmor 强制访问控制 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## SELinux 状态管理

**基本写法:查看 SELinux 状态**
`getenforce`
```bash
# 查看 SELinux 当前模式
getenforce
```

**基本写法:查看详细状态**
`sestatus`
```bash
# 查看 SELinux 详细状态与策略版本
sestatus
```

**基本写法:临时设置为 Enforcing**
`setenforce 1`
```bash
# 临时启用强制模式(重启失效)
sudo setenforce 1
```

**基本写法:临时设置为 Permissive**
`setenforce 0`
```bash
# 临时设为宽容模式(仅记录不拦截)
sudo setenforce 0
```

**基本写法:永久修改模式**
`sed -i 's/SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config`
```bash
# 永久设置为强制模式(需重启生效)
sudo sed -i 's/SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config
```

---

## SELinux 上下文管理

**基本写法:查看文件上下文**
`ls -Z <文件>`
```bash
# 查看文件的安全上下文
ls -Z /var/www/html/
```

**基本写法:查看进程上下文**
`ps -eZ | grep <进程名>`
```bash
# 查看进程的安全上下文
ps -eZ | grep nginx
```

**基本写法:修改文件上下文**
`chcon -t <类型> <文件>`
```bash
# 修改文件安全上下文类型
sudo chcon -t httpd_sys_content_t /var/www/html/index.html
```

**基本写法:递归修改上下文**
`chcon -R -t <类型> <目录>`
```bash
# 递归修改目录下所有文件上下文
sudo chcon -R -t httpd_sys_content_t /var/www/html/
```

**基本写法:恢复默认上下文**
`restorecon -Rv <目录>`
```bash
# 恢复文件到策略定义的默认上下文
sudo restorecon -Rv /var/www/html/
```

---

## SELinux 策略管理

**基本写法:查看策略包**
`semodule -l`
```bash
# 列出所有已安装的策略模块
sudo semodule -l
```

**基本写法:安装策略模块**
`semodule -i <模块文件>`
```bash
# 安装编译好的策略模块
sudo semodule -i mypolicy.pp
```

**基本写法:移除策略模块**
`semodule -r <模块名>`
```bash
# 移除已安装的策略模块
sudo semodule -r mypolicy
```

**基本写法:查看布尔值**
`getsebool -a`
```bash
# 列出所有布尔值开关
getsebool -a
```

**基本写法:设置布尔值**
`setsebool -P <布尔值> <on|off>`
```bash
# 永久启用 HTTPD 网络连接(需 -P 持久化)
sudo setsebool -P httpd_can_network_connect on
```

---

## SELinux 策略生成

**基本写法:生成策略模板**
`sepolgen <程序路径>`
```bash
# 为程序生成 SELinux 策略模板
sepolgen /usr/local/bin/myapp
```

**基本写法:使用 audit2allow 生成策略**
`audit2allow -a -m <模块名> -o <文件>`
```bash
# 从审计日志生成允许规则策略
sudo audit2allow -a -m myapp -o myapp.te
```

**基本写法:编译策略模块**
`checkmodule -M -m -o <模块名>.mod <模块名>.te`
```bash
# 编译 TE 文件为模块
checkmodule -M -m -o myapp.mod myapp.te
```

**基本写法:打包策略模块**
`semodule_package -o <模块名>.pp -m <模块名>.mod`
```bash
# 打包模块为可安装的 pp 文件
semodule_package -o myapp.pp -m myapp.mod
```

**基本写法:一键生成并安装**
`audit2allow -a -M <模块名> && semodule -i <模块名>.pp`
```bash
# 从审计日志一键生成并安装策略
sudo audit2allow -a -M myapp && sudo semodule -i myapp.pp
```

---

## SELinux 故障排查

**基本写法:查看 AVC 拒绝日志**
`ausearch -m avc -ts recent`
```bash
# 查看最近的 SELinux AVC 拒绝记录
sudo ausearch -m avc -ts recent
```

**基本写法:实时监控 AVC 日志**
`tail -f /var/log/audit/audit.log | grep AVC`
```bash
# 实时监控 SELinux 拒绝事件
sudo tail -f /var/log/audit/audit.log | grep AVC
```

**基本写法:统计拒绝类型**
`aureport -a | head -20`
```bash
# 统计 AVC 拒绝事件排行
sudo aureport -a | head -20
```

**基本写法:生成可读报告**
`sealert -a /var/log/audit/audit.log`
```bash
# 使用 sealert 分析并生成可读报告
sudo sealert -a /var/log/audit/audit.log > sealert.txt
```

**基本写法:查看进程 AVC 拒绝**
`grep "avc:.*denied" /var/log/audit/audit.log | grep "<进程名>"`
```bash
# 查看特定进程的 SELinux 拒绝
sudo grep "avc:.*denied" /var/log/audit/audit.log | grep "nginx"
```

---

## AppArmor 状态管理

**基本写法:查看 AppArmor 状态**
`apparmor_status`
```bash
# 查看 AppArmor 运行状态
sudo apparmor_status
```

**基本写法:启动 AppArmor 服务**
`systemctl start apparmor`
```bash
# 启动 AppArmor 服务
sudo systemctl start apparmor
sudo systemctl enable apparmor
```

**基本写法:查看加载的配置文件**
`apparmor_status --profiled`
```bash
# 查看已加载的配置文件数量
apparmor_status --profiled
```

**基本写法:查看进程关联的配置**
`aa-status`
```bash
# 查看各进程的 AppArmor 模式
sudo aa-status
```

**基本写法:查看特定进程模式**
`cat /proc/<pid>/attr/current`
```bash
# 查看指定进程的 AppArmor 模式
cat /proc/1234/attr/current
```

---

## AppArmor 配置文件管理

**基本写法:列出所有配置文件**
`ls /etc/apparmor.d/`
```bash
# 列出所有 AppArmor 配置文件
ls -l /etc/apparmor.d/
```

**基本写法:加载配置文件**
`apparmor_parser -r /etc/apparmor.d/<配置>`
```bash
# 重新加载指定配置文件
sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx
```

**基本写法:卸载配置文件**
`apparmor_parser -R /etc/apparmor.d/<配置>`
```bash
# 卸载指定配置文件
sudo apparmor_parser -R /etc/apparmor.d/usr.sbin.nginx
```

**基本写法:设置 complain 模式**
`aa-complain /etc/apparmor.d/<配置>`
```bash
# 将配置设为告警模式(仅记录不拦截)
sudo aa-complain /etc/apparmor.d/usr.sbin.nginx
```

**基本写法:设置 enforce 模式**
`aa-enforce /etc/apparmor.d/<配置>`
```bash
# 将配置设为强制模式
sudo aa-enforce /etc/apparmor.d/usr.sbin.nginx
```

---

## AppArmor 配置生成

**基本写法:生成配置模板**
`aa-genprof <程序路径>`
```bash
# 为程序生成 AppArmor 配置文件
sudo aa-genprof /usr/local/bin/myapp
```

**基本写法:更新现有配置**
`aa-logprof`
```bash
# 分析日志并更新现有配置
sudo aa-logprof
```

**基本写法:自动学习模式**
`aa-autodep <程序路径>`
```bash
# 自动生成依赖项配置
sudo aa-autodep /usr/local/bin/myapp
```

**基本写法:配置文件语法检查**
`apparmor_parser -Q -T /etc/apparmor.d/<配置>`
```bash
# 测试配置文件语法
sudo apparmor_parser -Q -T /etc/apparmor.d/usr.sbin.nginx
```

---

## AppArmor 日志审计

**基本写法:查看 AppArmor 日志**
`tail -f /var/log/syslog | grep -i apparmor`
```bash
# 实时查看 AppArmor 日志
sudo tail -f /var/log/syslog | grep -i apparmor
```

**基本写法:查看拒绝事件**
`grep "DENIED" /var/log/syslog | grep apparmor`
```bash
# 查看 AppArmor 拒绝事件
sudo grep "DENIED" /var/log/syslog | grep apparmor
```

**基本写法:统计拒绝次数**
`grep "DENIED" /var/log/syslog | grep -oE "profile=[^ ]+" | sort | uniq -c`
```bash
# 统计各配置文件的拒绝次数
sudo grep "DENIED" /var/log/syslog | grep -oE "profile=[^ ]+" | sort | uniq -c | sort -rn
```

**基本写法:查看特定程序拒绝**
`dmesg | grep -i apparmor | grep <程序名>`
```bash
# 查看内核日志中的 AppArmor 拒绝
sudo dmesg | grep -i apparmor | grep nginx
```

---

## MAC 策略审计

**基本写法:SELinux 策略完整性检查**
`semodule --verify=extend`
```bash
# 验证 SELinux 策略完整性
sudo semodule --verify=extend
```

**基本写法:对比策略差异**
`sedismod <模块>`
```bash
# 反汇编策略模块查看规则
sedismod myapp.pp
```

**基本写法:查看策略允许规则**
`sesearch -A -s <源类型> -t <目标类型>`
```bash
# 查询源到目标类型的允许规则
sesearch -A -s httpd_t -t httpd_sys_content_t
```

**基本写法:查看策略布尔值影响**
`sesearch -A -b <布尔值>`
```bash
# 查询布尔值影响的规则
sesearch -A -b httpd_can_network_connect
```

**基本写法:AppArmor 配置审计**
`aa-status --audit`
```bash
# 审计 AppArmor 配置完整性
sudo aa-status
```

---

## MAC 与服务集成

**基本写法:为 Web 服务启用 SELinux**
`setsebool -P httpd_enable_homedirs on`
```bash
# 允许 HTTPD 访问用户主目录
sudo setsebool -P httpd_enable_homedirs on
```

**基本写法:为数据库启用 SELinux**
`setsebool -P mysqld_disable_trans off`
```bash
# 启用 MySQL 的 SELinux 策略
sudo setsebool -P mysqld_disable_trans off
```

**基本写法:为 Nginx 配置 AppArmor**
`aa-enforce /etc/apparmor.d/usr.sbin.nginx`
```bash
# 启用 Nginx 的 AppArmor 强制模式
sudo aa-enforce /etc/apparmor.d/usr.sbin.nginx
```

**基本写法:为容器配置 SELinux**
`docker run --security-opt label:type:<类型> <镜像>`
```bash
# Docker 容器使用 SELinux 隔离
docker run --security-opt label:type:svirt_apache_t nginx
```

**基本写法:验证服务配置**
`getsebool -a | grep <服务名>`
```bash
# 查看 HTTPD 相关布尔值
getsebool -a | grep httpd
```
