---
order: 160
title: curl HTTP 请求
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: curl 实战学习笔记：从对接一个第三方 API 的真实场景出发，学会读 -v 详细输出、收发各类请求体、管理 Cookie 会话、设置超时重试与代理，并用 -w 时间分解定位延迟。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'networking/120-HTTPProtocol'
  - 'networking/370-ProxyConfig'
  - 'networking/290-NetworkTroubleshootTools'
prerequisites:
  - 'networking/120-HTTPProtocol'
---

## 场景：对接第三方 API，先用手把话说明白

你要给项目接一个天气 API。文档写着「POST /v1/query，JSON 体，Bearer 认证」。写代码之前，
先用 curl 把这一次对话完整地手动走通——参数对不对、返回什么结构、错误码长什么样，
一分钟内全部确认。等代码写完出了问题，curl 又是复现和切割责任的第一工具（CI 脚本、
服务器上没有 Postman，但 curl 无处不在）。

本文所有示例都可以对着真实站点练，比如本笔记库的网页端 `https://fanquanpp.github.io/FANDEX/`。

## 动手：第一个请求，以及如何看懂 -v

```bash
curl https://fanquanpp.github.io/FANDEX/ -o /dev/null -s -w "%{http_code}\n"
# 200
```

`-o /dev/null` 丢弃正文，`-w` 打印状态码——这是「只关心通不通」的最小请求。
接下来是 curl 最重要的一个开关，看完整对话：

```bash
curl -v https://example.com -o /dev/null
```

`-v` 输出分三种前缀，学会读它，后面 80% 的调试都靠它：

```text
* Host example.com:443 was resolved.        ← * 过程性信息：DNS、TCP、TLS 每一步
* Connected to example.com ... port 443
* TLS 1.3 connection using TLS_AES_256_GCM_SHA384
> GET / HTTP/2                              ← > 发出去的请求（你说了什么）
> Host: example.com
< HTTP/2 200                                ← < 收到的响应（对方回了什么）
< content-type: text/html; ...
```

排查「接口不对」时永远先 `-v`：确认发出去的请求真的是你以为的那样
（方法、头、请求体），再看响应。大多数「API 有 bug」最后发现是发错了东西。

## 收发数据：方法与请求体

```bash
# 表单格式（application/x-www-form-urlencoded），-d 隐含 POST
curl -d "name=John&age=30" https://api.example.com/users

# JSON：必须显式给 Content-Type，-d 不会自动设置
curl -H "Content-Type: application/json" \
     -d '{"name":"John","age":30}' https://api.example.com/users

# 请求体从文件读（大 JSON / 带特殊字符时救命的写法）
curl -H "Content-Type: application/json" -d @data.json https://api.example.com/users

# multipart 文件上传（-F 自动设置 multipart/form-data 边界）
curl -F "file=@photo.jpg" https://api.example.com/upload
```

其他方法照语义用：

```bash
curl -X PUT    -H "Content-Type: application/json" -d '{"name":"Jane"}' https://api.example.com/users/1
curl -X PATCH  -d '{"age":31}' https://api.example.com/users/1
curl -X DELETE https://api.example.com/users/1
curl -I https://example.com          # HEAD：只要响应头
```

注意语义：`-d` 一出现方法就默认变成 POST（覆盖 -d 但想 GET 的场景用 `-G` 把数据拼到
URL 上）；`-X` 只是显式指定方法，别用 `-X POST` 去「修」一个本来就该带请求体的请求。

## 头与认证

```bash
# 任意自定义头，可叠加
curl -H "Authorization: Bearer abc123" \
     -H "X-Request-Id: trace-42" https://api.example.com/secure

# 快捷方式：改 UA、伪造 Referer（测试防盗链时常用）
curl -A "Mozilla/5.0" https://example.com
curl -e "https://google.com" https://example.com

# HTTP Basic 认证（用户名:密码，curl 自动编码进 Authorization 头）
curl -u admin:secret https://api.example.com/admin

# mTLS 客户端证书（企业内网 API 网关常见）
curl --cert client.pem --key key.pem https://api.example.com
```

遇到自签证书/内网 CA 报 `SSL certificate problem` 时：

```bash
curl -k https://self-signed.example.com          # 临时诊断可用
curl --cacert internal-ca.pem https://internal.example.com   # 正解：指定信任的 CA
```

`-k` 只该出现在你**正在排查证书本身**的会话里；写进脚本等于给整个链路拆掉身份验证。
配套原理见 cybersecurity/090-HTTPSPrinciple。

## 会话：用 Cookie 文件模拟登录流

很多后台 API 要求先登录。用 `-c` 存、`-b` 取，两个动作可以指向同一文件：

```bash
# 第一步：登录，保存服务器下发的 Cookie
curl -c cookies.txt -d "user=admin&pass=secret" https://example.com/login

# 第二步：带着会话访问受保护页面
curl -b cookies.txt https://example.com/dashboard

# 一步到位的写法：读旧 + 存新（会话续期的标准姿势）
curl -b cookies.txt -c cookies.txt https://example.com/dashboard
```

也可以手工塞一个 Cookie 测试服务端行为：`curl -b "session=abc123" https://example.com/dashboard`。

## 超时与重试：无人值守脚本的生命线

```bash
curl --connect-timeout 5 https://example.com    # 连接（TCP+TLS）最多等 5 秒
curl --max-time 10 https://example.com          # 整个请求（含传输）最多 10 秒
curl --retry 3 --retry-delay 2 https://example.com   # 失败重试 3 次，间隔 2 秒
```

两个值要分开理解：`--connect-timeout` 管「能不能连上」（对端挂了/防火墙 DROP 时会等
系统 TCP 超时，默认可长达两分钟）；`--max-time` 管「总共等多久」（防对端连上但慢慢吐字）。
生产脚本通常两个都设。

最大的坑在这里：**curl 遇到 HTTP 404/500 时退出码仍是 0**——脚本会把失败当成功继续跑。
写脚本务必加 `--fail`（HTTP 错误码时以退出码 22 失败；`--fail-with-body` 还能保留错误响应）：

```bash
curl -fsS --max-time 10 https://api.example.com/health || echo "health check failed"
```

## 代理：公司内网与抓包调试的必经之路

```bash
curl -x http://proxy.example.com:8080 https://example.com      # HTTP(S) 代理
curl --socks5 proxy.example.com:1080 https://example.com       # SOCKS5 代理
curl -x http://user:pass@proxy.example.com:8080 https://example.com   # 带认证
curl --noproxy "*" https://internal.example.com                # 对内网直连
```

curl 也读环境变量 `http_proxy` / `https_proxy` / `no_proxy`——「明明 curl 能通程序不通」
的排查第一步：`env | grep -i proxy`，环境变量里的旧代理配置是常见元凶。系统性的
代理配置见 networking/370-ProxyConfig。

## 测量：用 -w 把一次请求拆成时间线

这是 curl 对排障最有价值的形态。`-w` 支持一系列变量，一次看清延迟花在哪：

```bash
curl -o /dev/null -s \
  -w 'dns: %{time_namelookup}s  tcp: %{time_connect}s  tls: %{time_appconnect}s\nfirstbyte: %{time_starttransfer}s  total: %{time_total}s\nhttp: %{http_code}  size: %{size_download}B\n' \
  https://fanquanpp.github.io/FANDEX/
```

读法（相邻两行的差就是各阶段耗时）：

| 变量                  | 含义                     | 偏大说明什么             |
| :-------------------- | :----------------------- | :----------------------- |
| time_namelookup       | DNS 解析完成             | 解析器慢，或 DNS 链路问题 |
| time_connect          | TCP 握手完成             | 网络往返慢（远端机房？） |
| time_appconnect       | TLS 握手完成             | 证书链长/握手慢          |
| time_starttransfer    | 收到首字节               | 服务端处理慢             |
| time_total            | 全部完成                 | 传输量大或带宽瓶颈       |

对比测速神器：对同一 URL 跑 5 次取中位数，先于一切性能工具。

```bash
# 其他常用输出形态
curl -s https://api.example.com/data | python3 -m json.tool   # 美化 JSON（有 jq 换 jq）
curl -s https://example.com                                    # -s 静默，适合脚本与管道
```

## 下载控制

```bash
curl -O https://example.com/file.zip                 # 用 URL 里的文件名保存
curl -o myname.zip https://example.com/file.zip      # 自定义文件名
curl -C - -o bigfile.zip https://example.com/bigfile.zip   # 断点续传（-C - 自动找断点）
curl --limit-rate 1M -o file.zip https://example.com/file.zip  # 限速（模拟弱网测试）
curl -r 0-1024 -o part.bin https://example.com/file.bin        # Range 分段（断点/并发下载的底层）

# 管道直通：边下边解压安装包（官网安装脚本都是这个套路）
curl -sL https://example.com/archive.tar.gz | tar xz
```

`-L` 跟随重定向，下载场景几乎必带——很多下载链接是 302 出来的。

## 坑点与自检

| 坑点 | 事实 |
| :--- | :--- |
| 脚本裸用 curl | HTTP 404/500 退出码也是 0，必须 `-f`/`--fail-with-body` + `||` 处理 |
| 只设 max-time 不设 connect-timeout | 对端失联时会吃满系统 TCP 超时，脚本「卡死两分钟」多由此来 |
| JSON 忘了 Content-Type | 服务端按表单解析，报「参数缺失」，-v 一看便知 |
| `-k` 写进脚本 | 证书校验被整体关闭，中间人可自由替换内容；用 --cacert 指定内网 CA |
| 重试 POST 下单接口 | 非幂等请求盲目 --retry 会重复下单；先确认接口幂等性再重试 |
| 下载忘加 -L | 拿到的是 302 跳转页而不是文件 |

自检清单：能用 -v 的 `*`/`>`/`<` 三种行复述一次完整请求吗？能写出「带超时、失败重试、
HTTP 错误即失败」的脚本级 curl 吗？时间分解五段各自的含义说得出吗？

## 练习

1. 对 `https://fanquanpp.github.io/FANDEX/` 跑 -w 时间分解，共 5 次，标出最慢的阶段
   并解释（提示：TLS 握手占了从 0 到 time_appconnect 的全部）。
2. 用 httpbin.org 练习：`curl -v -d '{"x":1}' -H "Content-Type: application/json" https://httpbin.org/post`，
   在 `-v` 的 `<` 区确认服务端确实收到了你的头和请求体。
3. 把「登录存 Cookie -> 带 Cookie 访问」两步连成一个脚本，中途故意改错密码，
   观察 `-c` 文件里有没有会话。
4. 用 `--limit-rate 100k` 下载一个 5MB 文件，期间用 networking/270-Tcpdump 的命令抓包，
   对照观察慢速传输的包间隔。

## 下一步

- networking/140-WgetDownload：批量下载与递归抓取的场景该换工具了。
- networking/370-ProxyConfig：本文代理一节的全量展开。
- networking/120-HTTPProtocol：本文每个动作背后对应的协议语义。
