---
order: 480
title: IDS/IPS 命令（Suricata/Snort）
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: 'Suricata 与 Snort 命令：规则语法与自定义签名、IDS/IPS 模式部署（NFQ）、eve.json 与告警日志分析'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/010-SecurityBasicsDefense'
  - 'cybersecurity/470-FirewallConfig'
  - 'cybersecurity/550-SOC'
  - 'cybersecurity/560-IncidentResponse'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## Suricata 基础操作

**基本写法:启动 Suricata**
`suricata -c <配置文件> -i <接口>`
```bash
# 启动 Suricata 监听 eth0 接口
sudo suricata -c /etc/suricata/suricata.yaml -i eth0
```

**基本写法:守护进程模式启动**
`suricata -c <配置文件> --pidfile <PID文件> -D`
```bash
# 后台守护进程运行 Suricata
sudo suricata -c /etc/suricata/suricata.yaml --pidfile /var/run/suricata.pid -D
```

**基本写法:使用 PCAP 文件离线分析**
`suricata -r <PCAP文件> -c <配置文件>`
```bash
# 离线分析 PCAP 抓包文件
suricata -r capture.pcap -c /etc/suricata/suricata.yaml
```

**基本写法:测试配置文件**
`suricata -T -c <配置文件>`
```bash
# 校验 Suricata 配置文件语法
suricata -T -c /etc/suricata/suricata.yaml
```

**基本写法:查看 Suricata 版本**
`suricata --build-info`
```bash
# 查看 Suricata 版本与编译信息
suricata --build-info
```

---

## Suricata 规则更新

**基本写法:更新规则库**
`suricata-update`
```bash
# 更新 Suricata 规则集
sudo suricata-update
```

**基本写法:指定规则源**
`suricata-update --source <源名>`
```bash
# 从指定源更新规则
sudo suricata-update --source et/open
```

**基本写法:列出规则源**
`suricata-update list-sources`
```bash
# 列出所有可用规则源
sudo suricata-update list-sources
```

**基本写法:启用规则源**
`suricata-update enable-source <源名>`
```bash
# 启用 ET Pro 规则源
sudo suricata-update enable-source et/pro
```

**基本写法:测试规则文件**
`suricata -T -S <规则文件> -c <配置文件>`
```bash
# 测试自定义规则文件语法
suricata -T -S /etc/suricata/rules/local.rules -c /etc/suricata/suricata.yaml
```

---

## Suricata 规则编写

**基本写法:检测特定端口流量**
`alert tcp any any -> <目标IP> <端口> (msg:"<描述>"; sid:<ID>; rev:1;)`
```bash
# 检测到 22 端口的 SSH 流量告警
# alert tcp $HOME_NET any -> $EXTERNAL_NET 22 (msg:"SSH traffic"; sid:1000001; rev:1;)
```

**基本写法:检测恶意 User-Agent**
`alert http any any -> any any (msg:"Malicious UA"; http.user_agent; content:"<UA>"; sid:<ID>; rev:1;)`
```bash
# 检测包含恶意 User-Agent 的请求
# alert http any any -> any any (msg:"Suspicious UA"; http.user_agent; content:"sqlmap"; sid:1000002; rev:1;)
```

**基本写法:检测 SQL 注入特征**
`alert http any any -> any any (msg:"SQL Injection Attempt"; content:"UNION"; nocase; sid:<ID>; rev:1;)`
```bash
# 检测 SQL 注入 UNION 关键字
# alert http any any -> any any (msg:"SQLi attempt"; content:"UNION SELECT"; nocase; sid:1000003; rev:1;)
```

**基本写法:规则中引用正则**
`alert http any any -> any any (msg:"XSS Attempt"; pcre:"/<script/i"; sid:<ID>; rev:1;)`
```bash
# 使用正则检测 XSS 攻击
# alert http any any -> any any (msg:"XSS attempt"; pcre:"/<script[^>]*>/i"; sid:1000004; rev:1;)
```

---

## Suricata 日志分析

**基本写法:查看告警日志**
`tail -f /var/log/suricata/fast.log`
```bash
# 实时查看 Suricata 告警
sudo tail -f /var/log/suricata/fast.log
```

**基本写法:统计告警来源 IP**
`awk '{print $3}' /var/log/suricata/fast.log | sort | uniq -c | sort -rn`
```bash
# 统计告警来源 IP 排行
sudo awk '{print $3}' /var/log/suricata/fast.log | sort | uniq -c | sort -rn | head
```

**基本写法:检索特定规则告警**
`grep "<SID>" /var/log/suricata/fast.log`
```bash
# 查找特定规则 ID 的告警
grep "sid:1000001" /var/log/suricata/fast.log
```

**基本写法:分析 EVE JSON 日志**
`cat /var/log/suricata/eve.json | python3 -m json.tool | head -50`
```bash
# 格式化查看 EVE JSON 日志
cat /var/log/suricata/eve.json | python3 -m json.tool | head -50
```

**基本写法:提取告警事件**
`jq 'select(.event_type=="alert")' /var/log/suricata/eve.json`
```bash
# 使用 jq 提取所有告警事件
jq 'select(.event_type=="alert")' /var/log/suricata/eve.json
```

---

## Snort 基础操作

**基本写法:启动 Snort 监听**
`snort -i <接口> -c <配置文件>`
```bash
# 启动 Snort 监听 eth0
sudo snort -i eth0 -c /etc/snort/snort.conf
```

**基本写法:守护进程模式**
`snort -D -i <接口> -c <配置文件>`
```bash
# 后台运行 Snort
sudo snort -D -i eth0 -c /etc/snort/snort.conf -l /var/log/snort
```

**基本写法:测试配置**
`snort -T -c <配置文件>`
```bash
# 测试 Snort 配置文件
snort -T -c /etc/snort/snort.conf
```

**基本写法:读取 PCAP 文件**
`snort -r <PCAP文件> -c <配置文件>`
```bash
# 离线分析 PCAP 文件
snort -r capture.pcap -c /etc/snort/snort.conf -l /var/log/snort
```

**基本写法:查看 Snort 版本**
`snort -V`
```bash
# 查看 Snort 版本
snort -V
```

---

## Snort 规则编写

**基本写法:基础告警规则**
`alert tcp any any -> <目标> <端口> (msg:"<描述>"; sid:<ID>;)`
```bash
# 检测 ICMP 流量
# alert icmp any any -> any any (msg:"ICMP traffic"; sid:100001; rev:1;)
```

**基本写法:基于内容检测**
`alert tcp any any -> any 80 (msg:"<描述>"; content:"<关键字>"; nocase; sid:<ID>;)`
```bash
# 检测 HTTP 请求中的特定内容
# alert tcp any any -> any 80 (msg:"Directory traversal"; content:"../"; nocase; sid:100002; rev:1;)
```

**基本写法:基于正则匹配**
`alert tcp any any -> any 80 (msg:"<描述>"; pcre:"/<正则>/i"; sid:<ID>;)`
```bash
# 使用正则匹配 Web 攻击
# alert tcp any any -> any 80 (msg:"XSS attack"; pcre:"/<script.*alert/i"; sid:100003; rev:1;)
```

**基本写法:基于阈值限制告警**
`alert tcp any any -> any 80 (msg:"<描述>"; threshold:type threshold, track by_src, count 5, seconds 60; sid:<ID>;)`
```bash
# 60 秒内同一源 IP 最多告警 5 次
# alert tcp any any -> any 80 (msg:"HTTP scan"; threshold:type threshold, track by_src, count 5, seconds 60; sid:100004; rev:1;)
```

---

## Snort 日志分析

**基本写法:查看告警日志**
`tail -f /var/log/snort/alert`
```bash
# 实时查看 Snort 告警
sudo tail -f /var/log/snort/alert
```

**基本写法:统计告警次数**
`grep -c "alert" /var/log/snort/alert`
```bash
# 统计告警总数
grep -c "\[**\]" /var/log/snort/alert
```

**基本写法:提取告警类型**
`grep -oE "\[1:[0-9]+:[0-9]+\]" /var/log/snort/alert | sort | uniq -c | sort -rn`
```bash
# 提取告警规则 ID 并统计
grep -oE "\[1:[0-9]+:[0-9]+\]" /var/log/snort/alert | sort | uniq -c | sort -rn | head
```

**基本写法:检索特定规则告警**
`grep "<SID>" /var/log/snort/alert`
```bash
# 查找规则 ID 为 100001 的告警
grep "1:100001" /var/log/snort/alert
```

---

## Zeek(原 Bro)分析

**基本写法:启动 Zeek 监听**
`zeekctl deploy`
```bash
# 部署 Zeek 配置并启动
sudo zeekctl deploy
```

**基本写法:查看 Zeek 状态**
`zeekctl status`
```bash
# 查看 Zeek 各节点状态
sudo zeekctl status
```

**基本写法:分析 PCAP 文件**
`zeek -r <PCAP文件>`
```bash
# 离线分析 PCAP 生成 Zeek 日志
zeek -r capture.pcap
```

**基本写法:查看连接日志**
`cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p`
```bash
# 提取连接日志中的源 IP 目标 IP 端口
cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p | head
```

**基本写法:统计 HTTP 访问**
`cat http.log | zeek-cut host uri | sort | uniq -c | sort -rn`
```bash
# 统计 HTTP 访问的目标主机和 URI
cat http.log | zeek-cut host uri | sort | uniq -c | sort -rn | head
```

---

## IDS 规则管理

**基本写法:加载自定义规则**
`echo 'include /etc/suricata/rules/local.rules' >> <配置文件>`
```bash
# 在 Suricata 配置中加载自定义规则
echo 'include /etc/suricata/rules/local.rules' | sudo tee -a /etc/suricata/suricata.yaml
```

**基本写法:统计规则数量**
`grep -c "^alert\|^drop" <规则文件>`
```bash
# 统计规则文件中规则数量
grep -c "^alert\|^drop" /etc/suricata/rules/local.rules
```

**基本写法:禁用特定规则**
`sed -i 's/^alert.*sid:<SID>.*/#&/' <规则文件>`
```bash
# 注释掉指定 SID 的规则
sudo sed -i 's/^alert.*sid:1000001.*/#&/' /etc/suricata/rules/local.rules
```

**基本写法:Snort 加载自定义规则**
`echo 'include $RULE_PATH/local.rules' >> /etc/snort/snort.conf`
```bash
# 在 Snort 配置中加载自定义规则
echo 'include $RULE_PATH/local.rules' | sudo tee -a /etc/snort/snort.conf
```

---

## IDS 性能调优

**基本写法:查看 Suricata 运行统计**
`suricatasc -c uptime`
```bash
# 通过 Suricata 控制接口查看运行时间
suricatasc -c uptime
```

**基本写法:查看抓包统计**
`cat /var/log/suricata/stats.log | grep -i "drop"`
```bash
# 查看数据包丢弃情况
cat /var/log/suricata/stats.log | grep -i "drop\|drop_alert"
```

**基本写法:优化抓包模式**
`suricata --set af-packet.0.cluster-type=cluster_flow`
```bash
# 设置 AF_PACKET 集群模式为按流分发
sudo suricata --set af-packet.0.cluster-type=cluster_flow -c /etc/suricata/suricata.yaml -i eth0
```

**基本写法:调整运行模式**
`suricata --runmode=workers -c <配置文件> -i <接口>`
```bash
# 使用 workers 模式提高性能
sudo suricata --runmode=workers -c /etc/suricata/suricata.yaml -i eth0
```

**基本写法:查看 CPU 使用**
`top -p $(pidof suricata)`
```bash
# 监控 Suricata 进程 CPU 占用
top -p $(pgrep -d, suricata)
```

---

## IDS 部署验证

**基本写法:发送测试流量**
`curl -A "sqlmap/1.0" http://<目标>/test?id=1`
```bash
# 发送模拟攻击流量验证 IDS 检测
curl -A "sqlmap/1.0" "http://192.168.1.10/test?id=1' UNION SELECT 1--"
```

**基本写法:发送 ICMP 测试**
`ping -c 1 <目标>`
```bash
# 发送 ICMP 包触发 ICMP 规则
ping -c 1 192.168.1.10
```

**基本写法:使用 nmap 触发规则**
`nmap -sS -p 1-1000 <目标>`
```bash
# 端口扫描触发扫描检测规则
nmap -sS -p 1-1000 192.168.1.10
```

**基本写法:验证告警是否生成**
`tail -f /var/log/suricata/fast.log | grep "test"`
```bash
# 实时查看测试流量触发的告警
sudo tail -f /var/log/suricata/fast.log | grep -i "test\|sqlmap"
```
