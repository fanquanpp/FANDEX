---
order: 440
title: Burp Suite 命令行
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: 'Burp Suite 命令行与自动化：目标范围配置、爬取与主动扫描、API/扩展集成与 CI 中的 DAST 思路'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/150-WebSecurityPenetrationTesting'
  - 'cybersecurity/420-NiktoScan'
  - 'cybersecurity/360-PenetrationTestingMethodology'
  - 'cybersecurity/180-SQLInjection'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## Burp Suite 启动配置

**基本写法:启动 Burp Suite GUI**
`java -jar burpsuite_pro.jar`
```bash
# 启动 Burp Suite 专业版
java -jar burpsuite_pro.jar
```

**基本写法:命令行模式启动**
`java -jar burpsuite_pro.jar --cmd`
```bash
# 命令行模式启动 Burp(用于自动化)
java -jar burpsuite_pro.jar --cmd
```

**基本写法:指定配置文件启动**
`java -jar burpsuite_pro.jar --config-file=<配置文件>`
```bash
# 使用指定配置文件启动
java -jar burpsuite_pro.jar --config-file=project.json
```

**基本写法:无界面启动(无 GUI)**
`java -jar burpsuite_pro.jar --cmd --project=<项目文件>`
```bash
# 无图形界面启动 Burp(适合服务器运行)
java -jar burpsuite_pro.jar --cmd --project=audit.burp
```

**基本写法:指定内存启动**
`java -Xmx<大小> -jar burpsuite_pro.jar`
```bash
# 分配 4GB 内存启动 Burp
java -Xmx4g -jar burpsuite_pro.jar
```

---

## Burp REST API 操作

**基本写法:启动 REST API 服务**
`java -jar burpsuite_pro.jar --api-key=<密钥>`
```bash
# 启动时指定 API 密钥
java -jar burpsuite_pro.jar --api-key=mysecretkey --project=audit.burp
```

**基本写法:获取 API 版本**
`curl -H "Authorization: <密钥>" http://127.0.0.1:1337/v0.1/version`
```bash
# 查询 Burp REST API 版本
curl -H "Authorization: mysecretkey" http://127.0.0.1:1337/v0.1/version
```

**基本写法:启动扫描任务**
`curl -X POST -H "Authorization: <密钥>" -H "Content-Type: application/json" http://127.0.0.1:1337/v0.1/scan -d '<JSON>'`
```bash
# 通过 API 启动站点扫描
curl -X POST -H "Authorization: mysecretkey" -H "Content-Type: application/json" http://127.0.0.1:1337/v0.1/scan -d '{"urls":["https://example.com"]}'
```

**基本写法:查看扫描状态**
`curl -H "Authorization: <密钥>" http://127.0.0.1:1337/v0.1/scan/<任务ID>`
```bash
# 查询指定扫描任务状态
curl -H "Authorization: mysecretkey" http://127.0.0.1:1337/v0.1/scan/abc123
```

**基本写法:获取扫描结果**
`curl -H "Authorization: <密钥>" http://127.0.0.1:1337/v0.1/scan/<任务ID>/issues`
```bash
# 获取扫描发现的问题列表
curl -H "Authorization: mysecretkey" http://127.0.0.1:1337/v0.1/scan/abc123/issues
```

---

## Burp Suite 扫描配置

**基本写法:配置爬虫深度**
`--crawl-depth=<深度>`
```bash
# 设置爬虫最大深度为 5
java -jar burpsuite_pro.jar --cmd --crawl-depth=5
```

**基本写法:设置爬虫超时**
`--crawl-timeout=<秒数>`
```bash
# 爬虫 600 秒后超时
java -jar burpsuite_pro.jar --cmd --crawl-timeout=600
```

**基本写法:配置并发连接**
`--max-connections=<数量>`
```bash
# 设置最大并发连接数
java -jar burpsuite_pro.jar --cmd --max-connections=20
```

**基本写法:配置请求间隔**
`--request-delay=<毫秒>`
```bash
# 请求间隔 200 毫秒(防止触发限流)
java -jar burpsuite_pro.jar --cmd --request-delay=200
```

**基本写法:设置扫描超时**
`--scan-timeout=<秒数>`
```bash
# 扫描 3600 秒后自动停止
java -jar burpsuite_pro.jar --cmd --scan-timeout=3600
```

---

## Burp 代理与证书

**基本写法:指定代理端口**
`--proxy-port=<端口>`
```bash
# 设置代理监听端口
java -jar burpsuite_pro.jar --proxy-port=8080
```

**基本写法:导出 CA 证书**
`curl -x http://127.0.0.1:8080 -o <文件> http://burp/cert`
```bash
# 通过代理获取 Burp CA 证书
curl -x http://127.0.0.1:8080 -o burp-cert.cer http://burp/cert
```

**基本写法:导入证书到系统**
`keytool -import -trustcacerts -alias burp -file <证书> -keystore <keystore>`
```bash
# 将 Burp CA 证书导入 Java keystore
keytool -import -trustcacerts -alias burp -file burp-cert.cer -keystore $JAVA_HOME/lib/security/cacerts
```

**基本写法:设置上游代理**
`--upstream-proxy=<代理URL>`
```bash
# 配置 Burp 使用上游代理
java -jar burpsuite_pro.jar --upstream-proxy=http://upstream-proxy:8081
```

**基本写法:配置 SOCKS 代理**
`--socks-proxy=<主机:端口>`
```bash
# 配置 SOCKS5 代理(配合 SSH 隧道)
java -jar burpsuite_pro.jar --socks-proxy=127.0.0.1:1080
```

---

## Burp 扫描自动化

**基本写法:命令行扫描单个 URL**
`java -jar burpsuite_pro.jar --cmd --scan-target=<URL>`
```bash
# 扫描单个目标 URL
java -jar burpsuite_pro.jar --cmd --scan-target=https://example.com
```

**基本写法:批量扫描 URL**
`java -jar burpsuite_pro.jar --cmd --scan-targets-file=<文件>`
```bash
# 从文件读取 URL 列表批量扫描
java -jar burpsuite_pro.jar --cmd --scan-targets-file=urls.txt
```

**基本写法:导入爬虫结果**
`java -jar burpsuite_pro.jar --cmd --import-file=<文件>`
```bash
# 导入之前保存的爬虫结果
java -jar burpsuite_pro.jar --cmd --import-file=crawl.xml
```

**基本写法:导出扫描报告**
`java -jar burpsuite_pro.jar --cmd --export-report=<文件>`
```bash
# 导出扫描报告为 HTML
java -jar burpsuite_pro.jar --cmd --export-report=report.html
```

**基本写法:指定报告格式**
`--report-format=<格式>`
```bash
# 导出 XML 格式报告
java -jar burpsuite_pro.jar --cmd --export-report=report.xml --report-format=xml
```

---

## Burp 扩展加载

**基本写法:加载扩展**
`--extension=<扩展文件>`
```bash
# 启动时加载扩展
java -jar burpsuite_pro.jar --extension=/path/to/extension.jar
```

**基本写法:从 BApp Store 加载**
`--bapp=<扩展名>`
```bash
# 加载 BApp Store 中的扩展
java -jar burpsuite_pro.jar --bapp=LoggerPlusPlus
```

**基本写法:列出已安装扩展**
`--list-extensions`
```bash
# 列出所有已安装的扩展
java -jar burpsuite_pro.jar --list-extensions
```

**基本写法:卸载扩展**
`--remove-extension=<扩展名>`
```bash
# 卸载指定扩展
java -jar burpsuite_pro.jar --remove-extension=LoggerPlusPlus
```

**基本写法:更新所有扩展**
`--update-extensions`
```bash
# 更新 BApp Store 中所有已安装扩展
java -jar burpsuite_pro.jar --update-extensions
```

---

## Burp Intruder 自动化

**基本写法:启动 Intruder 任务**
`curl -X POST -H "Authorization: <密钥>" http://127.0.0.1:1337/v0.1/intruder -d '<JSON>'`
```bash
# 通过 API 启动 Intruder 任务
curl -X POST -H "Authorization: mysecretkey" -H "Content-Type: application/json" http://127.0.0.1:1337/v0.1/intruder -d '{"target":"https://example.com/login"}'
```

**基本写法:使用 burprepeater 命令行**
`curl -X POST -H "Authorization: <密钥>" http://127.0.0.1:1337/v0.1/repeater -d '<JSON>'`
```bash
# 通过 API 发送 Repeater 请求
curl -X POST -H "Authorization: mysecretkey" -H "Content-Type: application/json" http://127.0.0.1:1337/v0.1/repeater -d '{"request":"GET / HTTP/1.1\r\nHost: example.com\r\n\r\n"}'
```

**基本写法:加载 payload 文件**
`--payload-file=<文件>`
```bash
# 加载字典文件用于 Intruder
java -jar burpsuite_pro.jar --payload-file=passwords.txt
```

**基本写法:设置 payload 编码**
`--payload-encoding=<编码>`
```bash
# 设置 payload URL 编码
java -jar burpsuite_pro.jar --payload-encoding=url
```

---

## Burp 日志与分析

**基本写法:启用请求日志**
`--log-file=<文件>`
```bash
# 启动时记录所有请求到日志
java -jar burpsuite_pro.jar --log-file=traffic.log
```

**基本写法:启用详细日志**
`--verbose`
```bash
# 输出详细日志信息
java -jar burpsuite_pro.jar --cmd --verbose
```

**基本写法:统计请求数量**
`grep -c "Request:" <日志文件>`
```bash
# 统计日志中请求数量
grep -c "GET\|POST" traffic.log
```

**基本写法:提取异常响应**
`grep "500 Internal\|403 Forbidden" <日志文件>`
```bash
# 提取服务器错误响应
grep -E "500 Internal|403 Forbidden|401 Unauthorized" traffic.log
```

**基本写法:监控实时请求**
`tail -f <日志文件> | grep -E "POST|PUT|DELETE"`
```bash
# 实时监控危险方法请求
tail -f traffic.log | grep -E "POST|PUT|DELETE"
```

---

## Burp 项目管理

**基本写法:创建临时项目**
`--project=temporary`
```bash
# 创建临时项目(关闭后丢弃)
java -jar burpsuite_pro.jar --project=temporary
```

**基本写法:打开指定项目**
`--project=<项目文件>`
```bash
# 打开已存在的项目文件
java -jar burpsuite_pro.jar --project=audit.burp
```

**基本写法:保存项目**
`--save-project=<文件>`
```bash
# 命令行退出时保存项目
java -jar burpsuite_pro.jar --cmd --save-project=audit.burp
```

**基本写法:导出配置**
`--export-config=<文件>`
```bash
# 导出当前配置到文件
java -jar burpsuite_pro.jar --export-config=settings.json
```

**基本写法:导入配置**
`--import-config=<文件>`
```bash
# 从配置文件导入设置
java -jar burpsuite_pro.jar --import-config=settings.json
```

---

## Burp 认证配置

**基本写法:设置代理认证**
`--proxy-auth=<用户>:<密码>`
```bash
# 配置代理需要认证
java -jar burpsuite_pro.jar --proxy-auth=user:pass
```

**基本写法:设置平台认证**
`--platform-authentication`
```bash
# 启用平台认证集成
java -jar burpsuite_pro.jar --platform-authentication
```

**基本写法:加载 Cookie 文件**
`--cookie-jar=<文件>`
```bash
# 从文件加载 Cookie 用于扫描
java -jar burpsuite_pro.jar --cookie-jar=cookies.txt
```

**基本写法:设置 HTTP 头**
`--header="<头>:<值>"`
```bash
# 添加自定义请求头
java -jar burpsuite_pro.jar --header="Authorization: Bearer token123"
```

**基本写法:忽略 SSL 证书错误**
`--ignore-ssl-errors`
```bash
# 忽略 SSL 证书校验错误
java -jar burpsuite_pro.jar --ignore-ssl-errors
```
