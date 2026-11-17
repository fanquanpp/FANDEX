---
order: 170
title: wget 文件下载
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: wget 下载：递归抓取与镜像站点、断点续传、限速与重试等常用参数。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'networking/130-CurlHTTPRequest'
  - 'networking/120-HTTPProtocol'
prerequisites:
  - 'networking/120-HTTPProtocol'
---

## wget 与 curl 的分工

同样是下载，wget 和 curl 的设计目标不同：wget 为「把东西拉下来」而生——递归抓站、断点
续传、后台运行、默认落盘，一条命令不用想输出；curl 为「跟 HTTP 协议对话」而生——精确控制
请求头、方法、认证，调试 API 见 [curl 实战](networking/130-CurlHTTPRequest)。经验法则：
镜像/批量/大文件选 wget，接口调试与脚本内可控输出选 curl。

递归抓站前必须理解的两件事：其一，wget 默认遵守目标站的 robots.txt（`robots=on` 是默认
值），抓取被拒说明对方不欢迎爬取，别关闭它去绕；其二，`-r`/`-m` 的默认深度与并发可能拖垮
小型站点，务必配合 `-l` 限深、`-w`/`--limit-rate` 限速，只对自己的站点或明确授权的站点
执行镜像。

GNU wget 1.x 仍是发行版默认安装的稳定版；下一代 wget2（异步并发、HTTP/2 支持）尚在
推进中，生产脚本以 wget 1.x 语法为准。

## wget 基本下载

**基本写法：下载文件**
`wget <URL>`
```bash
# 下载文件到当前目录
wget https://example.com/file.zip
```

**基本写法：指定保存文件名**
`wget -O <文件名> <URL>`
```bash
# 保存为指定文件名
wget -O archive.zip https://example.com/file.zip
```

**基本写法：指定保存目录**
`wget -P <目录> <URL>`
```bash
# 保存到指定目录
wget -P /tmp/downloads https://example.com/file.zip
```

**基本写法：静默下载**
`wget -q <URL>`
```bash
# 静默模式不显示输出
wget -q https://example.com/file.zip
```

**基本写法：显示进度条**
`wget --show-progress <URL>`
```bash
# 显示下载进度条
wget --show-progress https://example.com/file.zip
```

---

## 断点续传

**基本写法：继续中断的下载**
`wget -c <URL>`
```bash
# 断点续传下载大文件
wget -c https://example.com/bigfile.iso
```

**基本写法：限制重试次数**
`wget -t <次数> <URL>`
```bash
# 失败时重试 5 次
wget -t 5 https://example.com/file.zip
```

**基本写法：无限重试**
`wget -t inf <URL>`
```bash
# 无限重试直到成功
wget -t inf https://example.com/file.zip
```

**基本写法：设置重试间隔**
`wget --waitretry=<秒数> <URL>`
```bash
# 每次重试等待 10 秒
wget --waitretry=10 https://example.com/file.zip
```

---

## 递归下载

**基本写法：递归下载网站**
`wget -r <URL>`
```bash
# 递归下载整个网站
wget -r https://example.com/
```

**基本写法：指定递归深度**
`wget -r -l <深度> <URL>`
```bash
# 递归深度为 2
wget -r -l 2 https://example.com/
```

**基本写法：不追溯父目录**
`wget -r -np <URL>`
```bash
# 只下载指定目录下内容
wget -r -np https://example.com/docs/
```

**基本写法：转换为本地链接**
`wget -r -k <URL>`
```bash
# 下载后将链接转换为本地链接
wget -r -k https://example.com/
```

**基本写法：下载完整页面资源**
`wget -r -k -p <URL>`
```bash
# 下载页面所有依赖资源（图片、CSS、JS）
wget -r -k -p https://example.com/page.html
```

---

## 镜像网站

**基本写法：镜像整个网站**
`wget -m <URL>`
```bash
# 镜像网站（等同 -r -N -l inf）
wget -m https://example.com/
```

**基本写法：完整镜像**
`wget -m -k -K -E <URL>`
```bash
# 镜像并转换链接为本地可浏览
wget -m -k -K -E https://example.com/
```

**基本写法：指定 User-Agent 镜像**
`wget -m --user-agent="<UA>" <URL>`
```bash
# 伪装浏览器镜像
wget -m --user-agent="Mozilla/5.0" https://example.com/
```

---

## 过滤下载

**基本写法：接受指定文件类型**
`wget -r -A <类型> <URL>`
```bash
# 只下载 PDF 文件
wget -r -A pdf https://example.com/
```

**基本写法：拒绝指定文件类型**
`wget -r -R <类型> <URL>`
```bash
# 不下载图片文件
wget -r -R jpg,jpeg,png,gif https://example.com/
```

**基本写法：接受指定文件模式**
`wget -r -A "<模式>" <URL>`
```bash
# 只下载特定模式的文件
wget -r -A "*.tar.gz" https://example.com/
```

**基本写法：拒绝指定目录**
`wget -r -X <目录> <URL>`
```bash
# 不下载指定目录
wget -r -X /private /admin https://example.com/
```

**基本写法：只下载指定目录**
`wget -r -I <目录> <URL>`
```bash
# 只下载指定目录
wget -r -I /docs,/api https://example.com/
```

---

## 认证下载

**基本写法：HTTP 基本认证**
`wget --http-user=<用户> --http-password=<密码> <URL>`
```bash
# HTTP 基本认证下载
wget --http-user=admin --http-password=secret https://example.com/file.zip
```

**基本写法：FTP 认证**
`wget --ftp-user=<用户> --ftp-password=<密码> <URL>`
```bash
# FTP 认证下载
wget --ftp-user=user --ftp-password=pass ftp://example.com/file.zip
```

**基本写法：从文件读取认证**
`wget --auth-no-challenge --http-user=<用户> --http-password=<密码> <URL>`
```bash
# 强制发送认证信息
wget --auth-no-challenge --http-user=admin --http-password=secret https://example.com/
```

---

## Cookie 处理

**基本写法：发送 Cookie**
`wget --header="Cookie: <cookie>" <URL>`
```bash
# 通过 Header 发送 Cookie
wget --header="Cookie: session=abc123" https://example.com/protected
```

**基本写法：加载 Cookie 文件**
`wget --load-cookies <文件> <URL>`
```bash
# 从文件加载 Cookie
wget --load-cookies cookies.txt https://example.com/
```

**基本写法：保存 Cookie**
`wget --save-cookies <文件> <URL>`
```bash
# 保存响应中的 Cookie
wget --save-cookies cookies.txt https://example.com/login
```

**基本写法：保持会话**
`wget --keep-session-cookies --save-cookies <文件> <URL>`
```bash
# 保持会话 Cookie
wget --keep-session-cookies --save-cookies cookies.txt https://example.com/
```

---

## 限速与超时

**基本写法：限制下载速度**
`wget --limit-rate=<速度> <URL>`
```bash
# 限制下载速度为 1MB/s
wget --limit-rate=1M https://example.com/file.zip
```

**基本写法：设置超时**
`wget -T <秒数> <URL>`
```bash
# 设置 30 秒超时
wget -T 30 https://example.com/file.zip
```

**基本写法：设置连接超时**
`wget --connect-timeout=<秒数> <URL>`
```bash
# 设置 10 秒连接超时
wget --connect-timeout=10 https://example.com/file.zip
```

**基本写法：等待间隔**
`wget -w <秒数> <URL>`
```bash
# 每次请求间隔 2 秒
wget -w 2 -r https://example.com/
```

**基本写法：随机等待**
`wget --random-wait -r <URL>`
```bash
# 随机等待 0.5-1.5 秒避免被封锁
wget --random-wait -r https://example.com/
```

---

## 代理设置

**基本写法：使用 HTTP 代理**
`wget -e "http_proxy=<代理>" <URL>`
```bash
# 通过 HTTP 代理下载
wget -e "http_proxy=http://proxy.example.com:8080" https://example.com/
```

**基本写法：使用环境变量代理**
`export http_proxy=<代理> && export https_proxy=<代理>`
```bash
# 通过环境变量设置代理
export http_proxy=http://proxy.example.com:8080
export https_proxy=http://proxy.example.com:8080
wget https://example.com/
```

**基本写法：使用 HTTPS 代理**
`wget -e "https_proxy=<代理>" <URL>`
```bash
# 通过 HTTPS 代理下载
wget -e "https_proxy=http://proxy.example.com:8080" https://example.com/
```

---

## 批量下载

**基本写法：从文件读取 URL 批量下载**
`wget -i <文件>`
```bash
# 从 urls.txt 读取 URL 列表下载
wget -i urls.txt
```

**基本写法：指定输入文件并断点续传**
`wget -c -i <文件>`
```bash
# 批量断点续传下载
wget -c -i urls.txt
```

**基本写法：后台批量下载**
`wget -b -i <文件>`
```bash
# 后台批量下载
wget -b -i urls.txt
```

**基本写法：使用 URL 模板批量下载**
`wget <URL模式>`
```bash
# 批量下载编号文件
wget https://example.com/file{1..100}.zip
```

---

## 后台下载

**基本写法：后台运行下载**
`wget -b <URL>`
```bash
# 后台下载文件
wget -b https://example.com/bigfile.iso
```

**基本写法：指定日志文件**
`wget -b -o <日志> <URL>`
```bash
# 后台下载并记录日志
wget -b -o download.log https://example.com/file.zip
```

**基本写法：追加日志**
`wget -b -a <日志> <URL>`
```bash
# 后台下载并追加日志
wget -b -a download.log https://example.com/file.zip
```

---

## 实用下载组合

**基本写法：下载并解压**
`wget -qO- <URL> | tar xz`
```bash
# 下载 tar.gz 并直接解压
wget -qO- https://example.com/archive.tar.gz | tar xz
```

**基本写法：下载到标准输出**
`wget -qO- <URL>`
```bash
# 输出到标准输出而非文件
wget -qO- https://example.com/script.sh | bash
```

**基本写法：检查 URL 是否存在**
`wget --spider <URL>`
```bash
# 只检查 URL 可用性不下载
wget --spider https://example.com/file.zip
```

**基本写法：下载完整网站用于离线浏览**
`wget --mirror --convert-links --adjust-extension --page-requisites --no-parent <URL>`
```bash
# 完整镜像网站用于离线浏览
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent https://example.com/
```

**基本写法：模拟浏览器下载**
`wget --user-agent="<UA>" --referer="<来源>" <URL>`
```bash
# 伪装浏览器来源下载
wget --user-agent="Mozilla/5.0" --referer="https://google.com" https://example.com/file.zip
```

## 教学自检

按遮码自检法：遮住上文代码块，先自己写命令或推演答案，再对照。

- 断点续传的前提是什么？服务器不支持 Range 请求时 `-c` 的行为是什么？
  （提示：-c 依赖 HTTP Range 头，不支持时重头下）
- `-r -l 2 -np` 三个选项合起来回答了什么问题？少了 -np 会发生什么？
- `-k` 转换链接是把什么改成什么？离线浏览为什么还需要 `-p` 和 `-E` 配合？
- wget 与 curl 各自适合什么任务？在脚本里读 API 响应体应该用哪个、怎么写？
- `--spider` 除了检查 URL 还有什么用法？（递归校验死链）
- 镜像一个不属于自己的网站前，除技术限制外还应确认什么？robots.txt 起什么作用？
- `wget -qO- url | bash` 这个惯用法方便但有风险，风险在哪？至少要先做什么？
