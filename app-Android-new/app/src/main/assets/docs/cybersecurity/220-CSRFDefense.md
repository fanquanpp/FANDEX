---
order: 220
title: CSRF 防御命令与配置
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: 'CSRF 防御命令与配置：SameSite Cookie 属性、CSRF Token 实现与轮换、Origin/Referer 校验与双提交模式'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/210-CSRFAttack'
  - 'cybersecurity/200-XSSDefense'
  - 'cybersecurity/290-AuthenticationAuthorization'
  - 'cybersecurity/300-IdentityAccessManagement'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## CSRF Token 生成与校验

**基本写法:生成随机 CSRF Token**
`openssl rand -hex <字节数>`
```bash
# 生成 32 字节的随机 CSRF Token
openssl rand -hex 32
```

**基本写法:生成 Base64 格式 Token**
`openssl rand -base64 <字节数>`
```bash
# 生成 Base64 编码的 Token
openssl rand -base64 48
```

**基本写法:使用 urandom 生成 Token**
`head -c <字节数> /dev/urandom | xxd -p`
```bash
# 从 /dev/urandom 读取随机字节并转十六进制
head -c 32 /dev/urandom | xxd -p
```

**基本写法:Python 生成 Token**
`python3 -c "import secrets; print(secrets.token_hex(<字节数>))"`
```bash
# 使用 secrets 模块生成安全 Token
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**基本写法:校验 Token 长度**
`echo -n "<Token>" | wc -c`
```bash
# 检查 Token 字符长度是否符合要求
echo -n "a1b2c3d4e5f6" | wc -c
```

---

## Nginx CSRF 防护配置

**基本写法:校验 Origin 头**
`if ($http_origin !~* "^https://example\.com$") { return 403; }`
```bash
# Nginx 校验请求来源 Origin 头
if ($http_origin !~* "^https://example\.com$") {
    return 403;
}
```

**基本写法:校验 Referer 头**
`valid_referers none blocked server_names example.com; if ($invalid_referer) { return 403; }`
```bash
# Nginx 配置 Referer 校验防止 CSRF
valid_referers none blocked server_names example.com *.example.com;
if ($invalid_referer) {
    return 403;
}
```

**基本写法:设置 SameSite Cookie**
`proxy_cookie_path / "/; SameSite=Strict; Secure; HttpOnly";`
```bash
# 通过反向代理改写 Cookie 添加 SameSite 属性
proxy_cookie_path / "/; SameSite=Strict; Secure; HttpOnly";
```

**基本写法:添加自定义响应头**
`add_header X-Frame-Options "SAMEORIGIN" always;`
```bash
# 添加 X-Frame-Options 防止点击劫持配合 CSRF
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

---

## Apache CSRF 防护配置

**基本写法:启用 Referer 校验**
`SetEnvIf Referer "^https://example\.com/" local_ref=1`
```bash
# Apache 仅允许本站 Referer 访问
SetEnvIf Referer "^https://example\.com/" local_ref=1
Order Deny,Allow
Deny from all
Allow from env=local_ref
```

**基本写法:配置 SameSite Cookie**
`Header always edit Set-Cookie ^(.*)$ "$1; SameSite=Strict; Secure"`
```bash
# 强制为所有 Cookie 添加 SameSite 属性
Header always edit Set-Cookie ^(.*)$ "$1; SameSite=Strict; Secure"
```

**基本写法:禁用跨域嵌入**
`Header always set X-Frame-Options "SAMEORIGIN"`
```bash
# 禁止页面被嵌入跨域 iframe
Header always set X-Frame-Options "SAMEORIGIN"
```

**基本写法:CSRF Token 头校验**
`RewriteCond %{HTTP:X-CSRF-Token} ^$`
```bash
# 强制请求必须携带 X-CSRF-Token 头
RewriteCond %{HTTP:X-CSRF-Token} ^$
RewriteRule ^api/ - [F]
```

---

## Cookie 安全属性配置

**基本写法:查看当前 Cookie 属性**
`curl -I <URL> | grep -i set-cookie`
```bash
# 检查响应中的 Cookie 安全属性
curl -I https://example.com | grep -i set-cookie
```

**基本写法:测试 SameSite 属性**
`curl -s -I -H "Origin: https://evil.com" <URL>`
```bash
# 模拟跨域请求检查 Cookie 是否被发送
curl -s -I -H "Origin: https://evil.com" https://example.com
```

**基本写法:Python 设置安全 Cookie**
`python3 -c "print('Set-Cookie: session=abc; SameSite=Lax; Secure; HttpOnly')"`
```bash
# 输出符合安全规范的 Cookie 头
python3 -c "print('Set-Cookie: session=abc; SameSite=Lax; Secure; HttpOnly')"
```

**基本写法:批量检查 Cookie 配置**
`curl -s -I <URL> | grep -i "set-cookie\|csrf"`
```bash
# 一次性检查 Cookie 与 CSRF 相关响应头
curl -s -I https://example.com | grep -i "set-cookie\|csrf\|x-frame"
```

---

## CSRF 漏洞检测命令

**基本写法:检测表单是否含 Token**
`curl -s <URL> | grep -i "csrf\|token\|authenticity"`
```bash
# 抓取页面查找 CSRF Token 字段
curl -s https://example.com/login | grep -i "csrf\|token\|authenticity"
```

**基本写法:测试无 Token 的 POST 请求**
`curl -X POST <URL> -d "username=admin&password=test"`
```bash
# 测试 POST 是否需要 Token 校验
curl -X POST https://example.com/api/transfer -d "amount=1000&to=attacker"
```

**基本写法:跨域请求模拟**
`curl -X POST <URL> -H "Origin: https://evil.com" -H "Referer: https://evil.com/"`
```bash
# 模拟恶意跨域请求测试 CSRF 防护
curl -X POST https://example.com/api/delete -H "Origin: https://evil.com" -H "Referer: https://evil.com/" -d "id=1"
```

**基本写法:使用 wget 抓取表单分析**
`wget -qO- <URL> | grep -oE 'name="[^"]*"'`
```bash
# 分析表单字段判断是否有 CSRF 防护
wget -qO- https://example.com/form | grep -oE 'name="[^"]*"'
```

---

## OWASP ZAP CSRF 扫描

**基本写法:命令行启动 ZAP 扫描**
`zap-cli quick-scan <URL>`
```bash
# 使用 OWASP ZAP 命令行快速扫描
zap-cli quick-scan https://example.com
```

**基本写法:运行 CSRF 规则**
`zap-cli active-scan -s 10202 <URL>`
```bash
# 仅运行 CSRF 扫描规则(规则 ID 10202)
zap-cli active-scan -s 10202 https://example.com
```

**基本写法:导出扫描报告**
`zap-cli report -f <格式> -o <输出文件>`
```bash
# 导出 HTML 格式扫描报告
zap-cli report -f html -o csrf-report.html
```

**基本写法:守护模式启动 ZAP**
`zap-cli start -p <端口>`
```bash
# 以守护进程方式启动 ZAP 代理
zap-cli start -p 8080
```

---

## Django CSRF 配置

**基本写法:查看 Django CSRF 设置**
`python3 -c "import django.conf; print(getattr(django.conf.settings, 'CSRF_COOKIE_NAME', None))"`
```bash
# 查看 Django 项目 CSRF Cookie 名称配置
python3 -c "import django.conf; print(getattr(django.conf.settings, 'CSRF_COOKIE_NAME', None))"
```

**基本写法:生成 Django CSRF Token**
`python3 -c "from django.middleware.csrf import get_token; print(get_token(request))"`
```bash
# 在视图函数中获取 CSRF Token(需在请求上下文中)
python3 -c "from django.middleware.csrf import get_token; print(get_token(request))"
```

**基本写法:校验 Django CSRF 中间件**
`grep -i csrf <Django配置>`
```bash
# 检查 settings.py 中 CSRF 中间件是否启用
grep -i csrf settings.py
```

**基本写法:测试 Django CSRF 校验**
`curl -X POST <URL> -H "X-CSRFToken: <Token>" -H "Cookie: csrftoken=<Token>"`
```bash
# 携带 CSRF Token 测试 POST 请求
curl -X POST http://localhost:8000/form -H "X-CSRFToken: abc123" -H "Cookie: csrftoken=abc123" -d "data=test"
```

---

## Rails CSRF 配置

**基本写法:检查 Rails CSRF 配置**
`grep -i "protect_from_forgery" <控制器文件>`
```bash
# 检查 Rails 控制器是否启用 CSRF 防护
grep -i "protect_from_forgery" app/controllers/application_controller.rb
```

**基本写法:生成 Rails CSRF Token**
`ruby -e "require 'securerandom'; puts SecureRandom.hex(32)"`
```bash
# 使用 Ruby 生成 CSRF Token
ruby -e "require 'securerandom'; puts SecureRandom.hex(32)"
```

**基本写法:Rails 测试 CSRF 例外**
`grep -i "skip_before_action :verify_authenticity_token" <文件>`
```bash
# 查找被豁免 CSRF 校验的控制器
grep -ri "skip_before_action :verify_authenticity_token" app/controllers/
```

**基本写法:Rails 检查 Token 蒙版**
`grep -i "form_authenticity_token" <视图文件>`
```bash
# 检查表单中是否包含 CSRF Token
grep -ri "form_authenticity_token\|csrf_meta_tags" app/views/
```

---

## Express(Node.js)CSRF 防护

**基本写法:安装 csurf 中间件**
`npm install csurf`
```bash
# 安装 Express CSRF 防护中间件
npm install csurf
```

**基本写法:检查 csurf 配置**
`grep -ri "csurf\|csrf" <项目目录>`
```bash
# 检查 Express 项目是否配置 CSRF 防护
grep -ri "csurf\|csrf" src/
```

**基本写法:生成 Express CSRF Token**
`node -e "const crypto=require('crypto'); console.log(crypto.randomBytes(32).toString('hex'))"`
```bash
# 使用 Node.js crypto 生成 Token
node -e "const crypto=require('crypto'); console.log(crypto.randomBytes(32).toString('hex'))"
```

**基本写法:测试 Express CSRF 中间件**
`curl -X POST <URL> -H "x-csrf-token: <Token>"`
```bash
# 携带 CSRF Token 测试 Express API
curl -X POST http://localhost:3000/api -H "x-csrf-token: abc123" -d "data=test"
```

---

## CSRF 日志审计

**基本写法:统计 CSRF 校验失败**
`grep -i "csrf\|forgery" <访问日志> | wc -l`
```bash
# 统计 Nginx 日志中 CSRF 相关失败次数
grep -i "csrf\|forgery" /var/log/nginx/access.log | wc -l
```

**基本写法:提取 CSRF 攻击源 IP**
`grep -i "csrf" <日志> | awk '{print $1}' | sort | uniq -c | sort -rn`
```bash
# 提取 CSRF 失败请求的来源 IP 排行
grep -i "csrf" /var/log/nginx/error.log | awk '{print $1}' | sort | uniq -c | sort -rn | head
```

**基本写法:监控跨域异常请求**
`tail -f <日志> | grep -i "origin.*evil\|referer.*external"`
```bash
# 实时监控可疑的跨域请求
tail -f /var/log/nginx/access.log | grep -i "origin.*evil\|referer.*external"
```

**基本写法:统计 Referer 异常**
`awk -F'"' '{print $6}' <日志> | grep -v "<合法域名>" | sort | uniq -c`
```bash
# 统计非本站 Referer 的请求
awk -F'"' '{print $6}' /var/log/nginx/access.log | grep -v "example.com" | sort | uniq -c | sort -rn | head
```

---

## CSRF 防护自检脚本

**基本写法:批量检查站点 Cookie**
`for url in <URL列表>; do echo "$url: $(curl -sI $url | grep -i set-cookie)"; done`
```bash
# 批量检查多个站点 Cookie 安全属性
for url in https://a.com https://b.com; do echo "$url: $(curl -sI $url | grep -i set-cookie)"; done
```

**基本写法:检查表单 Token 覆盖率**
`curl -s <URL> | grep -c "csrf\|authenticity_token"`
```bash
# 统计页面中包含 CSRF Token 的表单数量
curl -s https://example.com | grep -c "csrf\|authenticity_token"
```

**基本写法:自动化 CSRF 检测**
`curl -s -X POST <URL> -H "Origin: https://evil.com" -w "%{http_code}" -o /dev/null`
```bash
# 检查跨域 POST 请求返回状态码判断防护
curl -s -X POST https://example.com/api -H "Origin: https://evil.com" -w "%{http_code}" -o /dev/null
```

**基本写法:检查响应头安全配置**
`curl -sI <URL> | grep -iE "x-frame|x-content|set-cookie"`
```bash
# 一次性检查 CSRF 相关安全响应头
curl -sI https://example.com | grep -iE "x-frame|x-content|set-cookie|strict-transport"
```
