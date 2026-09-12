---
order: 430
title: OpenVAS 漏洞扫描
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: 'OpenVAS/GVM 命令：部署初始化与订阅更新、目标与任务管理（gvm-cli）、报告导出与 CVE 结果研判'
author: fanquanpp
updated: '2026-09-13'
related:
  - 'cybersecurity/400-VulnerabilityScan'
  - 'cybersecurity/410-VulnerabilityScanTools'
  - 'cybersecurity/420-NiktoScan'
  - 'cybersecurity/540-ComplianceAudit'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [安全基础与防御](/cybersecurity/010-SecurityBasicsDefense)

## OpenVAS/GVM 服务管理

**基本写法:启动 GVM 服务**
`gvm-start`
```bash
# 启动 Greenbone 漏洞管理服务
gvm-start
```

**基本写法:停止 GVM 服务**
`gvm-stop`
```bash
# 停止 GVM 所有服务
gvm-stop
```

**基本写法:查看服务状态**
`gvm-check-setup`
```bash
# 检查 GVM 安装与运行状态
gvm-check-setup
```

**基本写法:重启 GVM 服务**
`systemctl restart gvmd`
```bash
# 重启 gvmd 服务
sudo systemctl restart gvmd
sudo systemctl restart ospd-openvas
```

**基本写法:查看日志**
`journalctl -u gvmd -f`
```bash
# 实时查看 gvmd 服务日志
sudo journalctl -u gvmd -f
```

---

## gvm-tools 命令行操作

**基本写法:安装 gvm-tools**
`pip3 install gvm-tools`
```bash
# 安装 gvm-tools 命令行工具
pip3 install gvm-tools
```

**基本写法:连接 GVM**
`gvm-cli tls --hostname <主机> --port 9390 --gmp-username <用户> --gmp-password <密码>`
```bash
# 连接 GVM 服务(交互式)
gvm-cli tls --hostname 127.0.0.1 --port 9390 --gmp-username admin --gmp-password admin
```

**基本写法:执行 GMP 命令**
`gvm-cli tls --hostname <主机> --port 9390 --gmp-username <用户> --gmp-password <密码> --xml "<命令>"`
```bash
# 执行 GMP XML 命令获取版本
gvm-cli tls --hostname 127.0.0.1 --port 9390 --gmp-username admin --gmp-password admin --xml "<get_version/>"
```

**基本写法:从文件执行命令**
`gvm-cli tls --hostname <主机> --gmp-username <用户> --gmp-password <密码> <文件>`
```bash
# 从 XML 文件批量执行命令
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin commands.xml
```

**基本写法:使用 pyshell**
`gvm-pyshell --hostname <主机> --port 9390 --gmp-username <用户> --gmp-password <密码>`
```bash
# 启动交互式 Python Shell
gvm-pyshell tls --hostname 127.0.0.1 --port 9390 --gmp-username admin --gmp-password admin
```

---

## 目标与任务管理

**基本写法:创建目标**
`gvm-cli ... --xml "<create_target><name><名称></name><hosts><主机></hosts></create_target>"`
```bash
# 创建扫描目标
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<create_target><name>Target1</name><hosts>192.168.1.10</hosts></create_target>'
```

**基本写法:列出所有目标**
`gvm-cli ... --xml "<get_targets/>"`
```bash
# 获取所有扫描目标
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_targets/>'
```

**基本写法:创建扫描任务**
`gvm-cli ... --xml "<create_task><name>...</name><target id="..."/><config id="..."/></create_task>"`
```bash
# 创建扫描任务
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<create_task><name>Scan1</name><target id="target-id"/><config id="config-id"/><scanner id="scanner-id"/></create_task>'
```

**基本写法:启动扫描任务**
`gvm-cli ... --xml "<start_task task_id="<任务ID>"/>"`
```bash
# 启动指定扫描任务
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<start_task task_id="task-id"/>'
```

**基本写法:查看任务状态**
`gvm-cli ... --xml "<get_tasks task_id="<任务ID>"/>"`
```bash
# 查看任务执行状态
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_tasks task_id="task-id"/>'
```

---

## 扫描配置管理

**基本写法:列出扫描配置**
`gvm-cli ... --xml "<get_configs/>"`
```bash
# 获取所有可用扫描配置
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_configs/>'
```

**基本写法:查看配置详情**
`gvm-cli ... --xml "<get_configs config_id="<配置ID>"/>"`
```bash
# 查看指定扫描配置详情
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_configs config_id="config-id"/>'
```

**基本写法:导入扫描配置**
`gvm-cli ... --xml "<create_config><get_configs_response>...</create_config>"`
```bash
# 从 XML 导入扫描配置
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml config.xml
```

**基本写法:导出扫描配置**
`gvm-cli ... --xml "<get_configs config_id="<配置ID>" details="1"/>" > <文件>`
```bash
# 导出扫描配置到 XML 文件
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_configs config_id="config-id" details="1"/>' > config.xml
```

---

## 扫描结果与报告

**基本写法:获取扫描结果**
`gvm-cli ... --xml "<get_results task_id="<任务ID>"/>"`
```bash
# 获取任务扫描结果
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_results task_id="task-id"/>'
```

**基本写法:获取报告**
`gvm-cli ... --xml "<get_reports report_id="<报告ID>"/>"`
```bash
# 获取指定报告详情
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_reports report_id="report-id"/>'
```

**基本写法:导出 PDF 报告**
`gvm-cli ... --xml '<get_reports report_id="<报告ID>" format_id="..."/>' > <文件>`
```bash
# 导出 PDF 格式报告
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_reports report_id="report-id" format_id="pdf-format-id"/>' > report.pdf
```

**基本写法:导出 XML 报告**
`gvm-cli ... --xml '<get_reports report_id="<报告ID>"/>' > <文件>`
```bash
# 导出 XML 格式报告
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_reports report_id="report-id"/>' > report.xml
```

**基本写法:获取漏洞详情**
`gvm-cli ... --xml '<get_results result_id="<结果ID>"/>'`
```bash
# 获取单个漏洞详情
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_results result_id="result-id" details="1"/>'
```

---

## NVT 更新管理

**基本写法:更新 NVT 漏洞库**
`greenbone-nvt-sync`
```bash
# 同步 NVT 漏洞检测脚本库
sudo greenbone-nvt-sync
```

**基本写法:更新 SCAP 数据**
`greenbone-scapdata-sync`
```bash
# 同步 SCAP 安全内容数据
sudo greenbone-scapdata-sync
```

**基本写法:更新 CERT 数据**
`greenbone-certdata-sync`
```bash
# 同步 CERT 通告数据
sudo greenbone-certdata-sync
```

**基本写法:更新 GVMD 数据**
`greenbone-feed-sync --type <类型>`
```bash
# 同步指定类型的数据源
sudo greenbone-feed-sync --type gvmd-data
```

**基本写法:查看同步状态**
`gvmd --rebuild-gvmd-data=all`
```bash
# 重建 gvmd 数据缓存
sudo gvmd --rebuild-gvmd-data=all
```

---

## 凭据与认证管理

**基本写法:创建凭据**
`gvm-cli ... --xml '<create_credential><name>...</name><login>...</login><password>...</password></create_credential>'`
```bash
# 创建扫描使用的认证凭据
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<create_credential><name>SSH-Cred</name><login>root</login><password>password</password><type>up</type></create_credential>'
```

**基本写法:列出所有凭据**
`gvm-cli ... --xml '<get_credentials/>'`
```bash
# 获取所有已创建凭据
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_credentials/>'
```

**基本写法:为目标添加凭据**
`gvm-cli ... --xml '<modify_target target_id="..."><ssh_credential credential_id="..."/>...'`
```bash
# 为扫描目标关联 SSH 凭据
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<modify_target target_id="target-id"><ssh_credential credential_id="cred-id" port="22"/></modify_target>'
```

**基本写法:创建管理员用户**
`gvmd --create-user=<用户> --password=<密码> --role=Admin`
```bash
# 创建 GVM 管理员账户
sudo gvmd --create-user=scanner --password=scanner123 --role=Admin
```

**基本写法:删除用户**
`gvmd --delete-user=<用户>`
```bash
# 删除 GVM 用户
sudo gvmd --delete-user=scanner
```

---

## 调度任务管理

**基本写法:创建定时扫描**
`gvm-cli ... --xml '<create_schedule><name>...</name><first_time>...</first_time></create_schedule>'`
```bash
# 创建定时扫描任务
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<create_schedule><name>Daily-Scan</name><first_time><minute>0</minute><hour>2</hour><day_of_month>1</day_of_month><month>1</month><year>2026</year></first_time><period><hour>24</hour></period></create_schedule>'
```

**基本写法:列出所有调度**
`gvm-cli ... --xml '<get_schedules/>'`
```bash
# 获取所有定时任务
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_schedules/>'
```

**基本写法:为任务关联调度**
`gvm-cli ... --xml '<modify_task task_id="..."><schedule id="..."/></modify_task>'`
```bash
# 关联调度到扫描任务
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<modify_task task_id="task-id"><schedule id="schedule-id"/></modify_task>'
```

**基本写法:停止运行中任务**
`gvm-cli ... --xml '<stop_task task_id="<任务ID>"/>'`
```bash
# 停止运行中的扫描任务
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<stop_task task_id="task-id"/>'
```

---

## 报告格式与导出

**基本写法:列出报告格式**
`gvm-cli ... --xml '<get_report_formats/>'`
```bash
# 获取所有可用报告格式
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_report_formats/>'
```

**基本写法:导出 CSV 报告**
`gvm-cli ... --xml '<get_reports report_id="<报告ID>" format_id="..."/>' > <文件>`
```bash
# 导出 CSV 格式报告
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_reports report_id="report-id" format_id="csv-format-id"/>' > report.csv
```

**基本写法:导出 HTML 报告**
`gvm-cli ... --xml '<get_reports report_id="<报告ID>" format_id="..."/>' > <文件>`
```bash
# 导出 HTML 格式报告
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_reports report_id="report-id" format_id="html-format-id"/>' > report.html
```

**基本写法:解析 JSON 结果**
`python3 -c "import json; data=json.load(open('<文件>')); print(len(data['report']['results']))"`
```bash
# 解析 JSON 报告统计漏洞数
python3 -c "import json; data=json.load(open('report.json')); print('漏洞数:', len(data['report']['results']))"
```

---

## OpenVAS 自动化集成

**基本写法:Python 脚本调用**
`python3 -c "from gvm.connections import TLSConnection; ..."`
```bash
# Python 脚本调用 GVM API
python3 -c "
from gvm.connections import TLSConnection
from gvm.protocols.gmp import Gmp
connection = TLSConnection(hostname='127.0.0.1', port=9390)
gmp = Gmp(connection)
gmp.authenticate('admin', 'admin')
print(gmp.get_version())
"
```

**基本写法:批量扫描脚本**
`for host in $(cat <文件>); do gvm-cli ... --xml "<create_target>...</create_target>"; done`
```bash
# 批量创建扫描目标
for host in $(cat hosts.txt); do
  gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml "<create_target><name>$host</name><hosts>$host</hosts></create_target>"
done
```

**基本写法:结合邮件通知**
`gvm-cli ... --xml '<get_reports/>' | mail -s "扫描报告" <邮箱>`
```bash
# 扫描完成后邮件通知
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_reports report_id="report-id"/>' | mail -s "OpenVAS 扫描报告" admin@example.com
```

**基本写法:与 SIEM 集成**
`gvm-cli ... --xml '<get_results/>' | python3 <解析脚本>`
```bash
# 提取结果发送到 SIEM
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<get_results task_id="task-id"/>' | python3 parse_results.py | curl -X POST -d @- http://siem:9200/vulns/_bulk
```

---

## OpenVAS 性能与维护

**基本写法:调整扫描并发**
`gvm-cli ... --xml '<modify_config config_id="..."><preference><name>...</name><value>...</value></preference></modify_config>'`
```bash
# 调整最大并发 NVT 数量
gvm-cli tls --hostname 127.0.0.1 --gmp-username admin --gmp-password admin --xml '<modify_config config_id="config-id"><preference><name>Max concurrently executed NVTs per host</name><value>10</value></preference></modify_config>'
```

**基本写法:重建数据库**
`gvmd --rebuild`
```bash
# 重建 gvmd 数据库
sudo gvmd --rebuild
```

**基本写法:清理数据库**
`gvmd --optimize`
```bash
# 优化数据库性能
sudo gvmd --optimize
```

**基本写法:查看磁盘使用**
`du -sh /var/lib/gvm/*`
```bash
# 查看 GVM 数据目录磁盘占用
du -sh /var/lib/gvm/*
```
