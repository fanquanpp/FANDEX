---
order: 340
title: 安全开发
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 安全开发生命周期：SDL 阶段与安全左移、STRIDE 威胁建模实操、安全编码核心实践、SAST/DAST/SCA 工具链与代码审计。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/330-SecureCodingPrinciples'
  - 'cybersecurity/170-InputValidation'
  - 'cybersecurity/160-OWASPTop10Detailed'
  - 'cybersecurity/540-ComplianceAudit'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 1. SDL：把安全变成开发流程的一部分

SDL（Security Development Lifecycle，安全开发生命周期）回答一个问题：
**安全检查放进流程的哪个环节，才能用最低成本拦住最多问题**。答案是尽早——
缺陷暴露越晚，修复成本越高（业界常用的 1:10:100 直观估算：需求阶段修复 1 份成本，
编码阶段 10 份，生产阶段 100 份起）。

| 阶段 | 安全活动                       | 产出物                     |
| :--- | :------------------------------ | :------------------------- |
| 需求 | 安全需求、合规要求梳理          | 安全需求清单、数据分级     |
| 设计 | 威胁建模、攻击面分析            | 威胁清单与缓解方案         |
| 编码 | 安全编码规范、代码评审          | 符合基线的代码             |
| 测试 | SAST/DAST/SCA、渗透测试         | 漏洞报告与修复记录         |
| 发布 | 发布检查、制品签名              | 签名制品、发布基线         |
| 运维 | 漏洞响应、监控、事件复盘        | 补丁与规则回流             |

与瀑布式「上线前安全测试」相比，SDL 的关键动作是**左移**（设计期做威胁建模）与
**自动化**（每次提交都跑工具），后者在 DevSecOps 语境下落地为 CI 安全流水线。

## 2. 威胁建模实操（STRIDE）

威胁建模不是画完架构图就结束，而是系统地回答「哪里会被攻击」。
STRIDE 六类威胁与安全属性一一对应：

| 字母 | 威胁                    | 破坏属性 | 典型缓解                 |
| :--- | :---------------------- | :------- | :----------------------- |
| S    | Spoofing 身份伪造       | 认证     | MFA、请求签名            |
| T    | Tampering 数据篡改      | 完整性   | 签名/MAC、完整性校验     |
| R    | Repudiation 抵赖        | 不可否认 | 审计日志、时间戳         |
| I    | Information Disclosure 信息泄露 | 机密性 | 加密、最小化返回数据 |
| D    | Denial of Service 拒绝服务 | 可用性 | 限流、配额、冗余         |
| E    | Elevation of Privilege 提权 | 授权   | 最小权限、显式鉴权       |

四步流程（以「用户上传头像」功能为例）：

```text
1. 画数据流图，标出信任边界
   用户 → [边界1：API 网关] → 上传服务 → [边界2：内网] → 对象存储

2. 逐个数据流/存储元素套 STRIDE 提问
   上传服务接收文件（跨边界1）：
     T：文件名路径拼接？→ 路径遍历    → 白名单文件名 + 存储键随机化
     I：可上传任意类型？→ HTML 文件被同域访问变存储型 XSS → 强制 Content-Type 与域名隔离
     D：10GB 文件打满磁盘？          → 大小/类型/配额限制
   上传服务 → 对象存储（跨边界2）：
     E：上传凭证过宽？可列全部桶     → 限定 prefix 与操作的临时凭证
     S：上传回调可伪造？             → 回调签名校验

3. 每条威胁评估风险（可能性 x 影响），标记：缓解 / 接受 / 转移

4. 威胁清单进 backlog 跟踪，架构变更时重新过一遍
```

工具辅助：微软 Threat Modeling Tool、OWASP Threat Dragon；敏捷团队可用
「每迭代 15 分钟威胁站立会」的轻量形式维持习惯。

## 3. 安全编码核心实践

原则速览（展开见 025-SecureCodingPrinciples 与 026-InputValidation）：
最小权限、默认拒绝、纵深防御、失败安全、不信任输入。以下是评审中最容易漏的细节：

```python
# 1) 比较用常数时间函数，防止时序侧信道
import hmac
if not hmac.compare_digest(expected_token, provided_token):   # 而非 ==
    raise PermissionError

# 2) 随机数：安全场景必须用 CSPRNG
import secrets
session_id = secrets.token_hex(32)      # 而非 random.random()（可预测）

# 3) 异常处理：失败安全（拒绝而不是放行）
def check_permission(user, action):
    try:
        return policy_engine.evaluate(user, action)
    except PolicyEngineUnavailable:
        log.exception("policy engine down")
        return False    # 失败时默认拒绝，而不是 return True

# 4) 重定向只允许白名单目标
ALLOWED_HOSTS = {"example.com", "www.example.com"}
from urllib.parse import urlparse
def safe_redirect(url):
    host = urlparse(url).hostname
    return url if host in ALLOWED_HOSTS else "/"
```

## 4. 安全测试工具链

三类自动化测试各管一段，互相不可替代：

| 类型 | 对象       | 发现的问题           | 代表工具                     |
| :--- | :--------- | :------------------- | :--------------------------- |
| SAST | 源代码     | 注入点、危险函数调用 | Semgrep、CodeQL、SonarQube、Bandit |
| SCA  | 依赖清单   | 已知 CVE、许可证风险 | Trivy、Snyk、Dependabot、OWASP Dependency-Check |
| DAST | 运行中应用 | 可利用的真实漏洞     | OWASP ZAP、Burp Suite        |

### 4.1 CI 集成示例

```yaml
# .github/workflows/security.yml（节选）
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SAST（增量扫描当前 diff 优先）
        run: semgrep ci --config p/owasp-top-ten
      - name: SCA（产出 SBOM 并阻断严重漏洞）
        run: trivy fs --scanners vuln --exit-code 1 --severity CRITICAL,HIGH .
      - name: DAST（对预览环境跑基线扫描）
        run: |
          zap-baseline.py -t https://staging.example.com \
            -r zap-report.html || true   # 阶段一仅报告，稳定后改阻断
```

灰度策略：新引入的工具先「只报告不阻断」跑两周，把存量误报治理完，再开启
`--exit-code` 阻断，避免安全工具变成开发者的敌人。

### 4.2 人工代码审计

自动化覆盖不了业务逻辑与组合漏洞，审计时按危险汇聚点逆查：

```text
数据流追踪：用户输入 → [过滤了吗] → 危险函数
危险函数清单：SQL 执行、命令执行、文件操作、反序列化、SSRF 发起点（详见 009）
鉴权检查：每个敏感路由是否显式鉴权（对照路由表逐条勾选）
业务逻辑：支付金额/数量负数、优惠券叠加、状态机跳步
密钥检查：配置与日志中的硬编码密钥（gitleaks 全仓扫描）
```

## 5. 发布与运行期安全

```text
制品完整性：构建产物签名（cosign/jar 签名），部署时验签
依赖锁定  ：lockfile 提交仓库，CI 禁止隐式升级（npm ci / pip --require-hashes）
密钥管理  ：运行时从 KMS/Secret Manager 注入，仓库中零密钥
监控回流  ：生产 WAF/SIEM 告警按代码位置回流修复（见 010-SOC、035-WAFRule）
漏洞响应  ：对外披露渠道（security.txt），明确的 SLA：Critical 72h 内出补丁
```

## 6. 常见陷阱

| 陷阱                             | 事实                                                   |
| :------------------------------- | :----------------------------------------------------- |
| 威胁建模只在立项做一次           | 架构变更、新接口都要增量更新，否则文档迅速过期         |
| 安全工具一上就全量阻断           | 误报会摧毁信任，先报告模式治理存量再阻断               |
| 「过了 SAST 就安全」             | 工具只见代码形态，业务逻辑漏洞与组合利用需人工         |
| 把 SDL 做成安全团队的事          | SDL 的本质是开发者自助，安全团队提供规范与平台         |
| 忽视依赖的传递依赖               | SCA 要能解析锁文件全树，只扫顶层依赖会漏               |

## 小结

- **初学者要点**：SDL 把安全检查放进开发各阶段，越早越便宜；威胁建模用 STRIDE
  六问（伪造/篡改/抵赖/泄露/拒绝服务/提权）逐条过信任边界；自动化测试三件套
  SAST（代码）、SCA（依赖）、DAST（运行中的应用）在 CI 中各司其职。
- **进阶注意**：STRIDE 产出必须进 backlog 闭环；CI 安全门禁先灰度再阻断；
  人工审计以「危险汇聚点 + 鉴权矩阵 + 业务逻辑」为主线；发布期记住制品签名、
  依赖锁定、密钥零入库三条硬规则。
