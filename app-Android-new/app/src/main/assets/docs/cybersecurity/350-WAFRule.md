---
order: 350
title: WAF 规则
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: Web 应用防火墙：部署形态、ModSecurity 与 OWASP CRS 规则引擎、常见绕过手法与自写规则的工程实践。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/170-InputValidation'
  - 'cybersecurity/520-SecurityBaseline'
  - 'cybersecurity/410-VulnerabilityScanTools'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 1. WAF 是什么、防什么

WAF（Web Application Firewall）部署在用户与 Web 应用之间，对 HTTP(S) 流量做
**请求/响应内容级检查**，拦截注入、XSS、扫描器、CC 刷接口等攻击。先给它定位：

- WAF 检查的是「请求长什么样」，应用层修复解决的是「代码怎么写的」。
- 因此 WAF 是**纵深防御中的一层**，不是修复手段的替代品；OWASP 的口径是
  「virtual patching（虚拟补丁）」——代码修复上线前，用规则先顶住已知攻击模式。

类比：应用代码修复是「换掉有缺陷的锁」，WAF 是「门口加一个安检员」。
安检员认识常见武器，拦得住大多数；但安检名单之外的新手法（0day）需要升级名单。

## 2. 部署形态

| 形态             | 原理                                   | 优缺点                             |
| :--------------- | :------------------------------------- | :--------------------------------- |
| 反向代理（最常见） | DNS 指向 WAF，WAF 转发到源站          | 可见性好、易上 TLS 卸载；需防源站直连绕过 |
| 透明桥接         | 串联在链路中不改 IP                    | 应用无感；TLS 需解密或只看明文     |
| 插件/模块        | Nginx/Envoy 内嵌模块（ModSecurity）    | 延迟最低；与应用生命周期耦合       |
| 云 WAF/SaaS      | 流量切到云端清洗                       | 免运维、抗 DDoS；合规与延迟需评估  |
| 主机 WAF         | Agent 进应用服务器                     | 粒度细；逐台管理成本高             |

关键架构提醒：**反向代理模式下必须限制源站只接受来自 WAF 的连接**（安全组/IP 白名单），
否则攻击者解析到源站真实 IP 即可完全绕过 WAF。

## 3. 规则引擎：ModSecurity 与 OWASP CRS

### 3.1 ModSecurity 规则语法

ModSecurity 是开源事实标准（v3/libmodsecurity 支持 Nginx/Apache/IIS），规则五要素：

```apache
# SecRule 变量 操作符 [动作]
#   变量      ：检查什么（ARGS=所有参数，REQUEST_HEADERS=请求头…）
#   操作符    ：怎么比（@rx 正则，@detectSQLi 检测 SQLi，@ge 地理位置…）
#   动作      ：命中后做什么（block/drop/pass、状态码、日志、id/rev/tag）

# 示例 1：拦截 URL 参数中的 UNION SELECT（SQL 注入特征）
SecRule ARGS "@rx (?i:union\s+(all\s+)?select)" \
    "id:10001,phase:2,block,msg:'SQLi: UNION SELECT',log,tag:attack-sqli"

# 示例 2：拦截 User-Agent 中的扫描器指纹
SecRule REQUEST_HEADERS:User-Agent "@rx (?i:(sqlmap|nikto|nessus))" \
    "id:10002,phase:1,deny,status:403,msg:'Scanner UA blocked'"

# 示例 3：单 IP 每分钟超过 120 次请求即封禁 5 分钟（CC 防护，配合 ip 集合）
SecRule IP:req_count "@gt 120" \
    "id:10003,phase:1,drop,expirevar:ip.req_count=300,msg:'Rate limit'"
```

`phase:1`（请求头）/`phase:2`（请求体）/`phase:3/4`（响应）决定检查时机；
阻断动作 `block` 交给管理配置决定实际行为（403 或 drop 连接），便于全局切换「仅告警」。

### 3.2 OWASP CRS（Core Rule Set）

CRS 是社区维护的通用规则集（SQLi/XSS/LFI/RFI/协议异常等 20+ 类别），采用**异常评分模式**：

```text
不直接一刀切，而是每条规则命中加分：
  入站异常分（inbound_anomaly_score）累计，超过阈值（默认 5）才阻断
  严重级别加权：CRITICAL=5, ERROR=4, WARNING=3, NOTICE=2
带来的工程空间：
  误报时不必关规则，而是「减分/排除该参数」（ctl:ruleRemoveTargetById）
```

```apache
# 误报治理示例：管理后台的富文本字段排除 XSS 规则（放行该参数而非整条规则）
SecRuleUpdateTargetById 942100 "!ARGS:content"    # 942100 为 CRS 中 XSS 检测规则
```

上线节奏建议：**检测模式（只记日志）观察 1-2 周 → 治理误报 → 切阻断 → 逐步提高
Paranoia Level**（CRS 的严格度等级 1-4，PL1 适合起步）。

## 4. 绕过手法与对抗视角

理解绕过是为了评估规则强度——WAF 与攻击者的对抗是常态而非意外：

| 手法             | 示例                                            | WAF 对策                       |
| :--------------- | :---------------------------------------------- | :----------------------------- |
| 编码变形         | `%3Cscript%3E`、双重编码 `%253C`                | 解码后递归检查（最多 N 层）    |
| 语法等价替换     | `/**/` 代替空格、`or 1=1`→`|| '1'`              | SQLi 语义库（@detectSQLi）     |
| 分块传输         | Transfer-Encoding: chunked 切碎关键词           | 重组请求体后再检查（旧版漏洞） |
| HTTP 参数污染    | `?id=1&id=admin` 后端取值与 WAF 不一致          | 全部参数参与匹配 + 中间件统一  |
| 大小写/注释      | `SeLeCt`、`/*!50000select*/`                    | 正则 (?i) + 版本注释匹配       |
| 源站直连         | 历史解析记录找到真实 IP                         | 源站仅允许 WAF 出口 IP（架构） |

测试自家 WAF 时可复用这些思路做红队演练；历史漏洞（如 CVE-2019-11387 一类解析缺陷）
的教训是：**规则引擎自身的解析缺陷也是漏洞**，保持引擎与 CRS 升级同样重要。

## 5. 自定义规则的工程实践

### 5.1 何时自写规则

优先顺序：**修代码 > 官方规则集/厂商规则 > 自写规则**。自写规则的正当场景：

- 已知漏洞无补丁期间的虚拟补丁（如某接口的参数约束）；
- 业务语义规则（未登录用户 10 分钟内最多 3 次支付尝试）；
- 精准封禁（对爬虫 UA + 地理 + 频率组合策略）。

### 5.2 白名单优先的写法

```apache
# 用「正向约束」代替「穷举恶意」：业务允许的输入形态白名单
# 订单号只允许 16 位数字
SecRule ARGS:orderId "!@rx ^[0-9]{16}$" \
    "id:10010,phase:2,block,msg:'orderId format violation'"
```

### 5.3 速率限制与地理策略

```nginx
# Nginx + ModSecurity 之外，速率层可直接用 Nginx limit_req
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
location /api/ {
    limit_req zone=api burst=60 nodelay;
    limit_req_status 429;
}
# 地理封锁用 MaxMind 数据库 + geoip2 模块，按业务覆盖范围收紧
```

### 5.4 规则变更管理

```text
版本化：规则文件进 Git，变更走评审（谁改的、为何改、影响面）
灰度：先 detection-only 模式上线新规则，观察日志再阻断
回归：维护一组「必须拦截」与「必须放行」的请求样本，每次变更自动回放
监控：WAF 日志接入 SIEM（见 010-SOC），关注误拦率与拦截来源分布
```

## 6. 运营指标与常见陷阱

```text
有用指标：拦截量、误拦率（业务反馈闭环）、规则命中率 Top10、绕过事件数
无用指标：只看「今天拦了多少攻击」——扫描器噪音占比极高，无法说明防护有效性
```

| 陷阱                           | 事实                                                 |
| :----------------------------- | :--------------------------------------------------- |
| 买了 WAF 就不修漏洞            | 虚拟补丁有时效性，0day/语义级绕过随时出现            |
| 一上来就全量阻断               | 误伤业务与客服压力巨大，先检测模式再灰度             |
| 误报直接删规则                 | 应做参数级排除（SecRuleUpdateTargetById），保留检测面 |
| 源站暴露                       | 历史 DNS/证书透明度日志可还原真实 IP，白名单必须收紧 |
| 规则库三年不更新               | CRS/厂商规则与引擎都要随 CVE 与绕过研究持续升级      |

## 小结

- **初学者要点**：WAF 是纵深防御的一层「虚拟补丁」，不是代码修复的替代品。
  记住部署要点（源站只允许 WAF 回源）与开源双件套：ModSecurity 引擎 + OWASP CRS
  规则集（异常评分模式，先检测后阻断）。
- **进阶注意**：规则治理是主要工作量——参数级误报排除、灰度上线、样本回归；
  绕过对抗集中在编码变形、参数污染与源站直连，架构白名单比正则更可靠；
  自写规则优先白名单正向约束，并把 WAF 日志接入 SIEM 形成可度量的运营闭环。
