---
order: 250
title: 安全测试
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: '安全测试方法与工具链：SAST/DAST 定位、OWASP Top 10 对照、ZAP、SQLMap、Nuclei 模板化扫描、注入与 XSS 用例固化、模糊测试现状与漏测防范。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'software-testing/130-APITestToolchainAndContract'
  - 'software-testing/160-StressAndStabilityTest'
  - 'software-testing/230-CICDTest'
  - 'cybersecurity/160-OWASPTop10Detailed'
prerequisites:
  - 'software-testing/010-TestBasicsMethod'
---

## 知识点地图

- **知识类别**：安全测试（发布前专项测试家族）。
- **解决什么问题**：验证「恶意输入与恶意用户面前，系统是否守住边界」——功能测试假设用户按文档操作，安全测试假设用户**故意违反文档**。
- **什么时候用到**：日常迭代固化注入/越权回归用例时；发布大版本前的扫描与渗透安排；把安全检查做成 CI 门禁时。
- **同族文档**：把安全检查编排进流水线见《CI/CD 测试门禁》与本文第 7 节；移动端专项见《移动应用测试》。

前置知识：OWASP Top 10 的基本概念、HTTP 协议、SQL 与 Web 基础。

## 1. 安全测试在测什么、有哪几种

按手段分四种，先分清谁干什么：

| 类型 | 说明 | 谁来做 |
| :--- | :--- | :--- |
| 漏洞扫描 | 工具自动检测已知漏洞 | 开发/测试就能跑 |
| 渗透测试 | 模拟攻击者发现安全弱点 | 专业渗透人员 |
| 合规检查 | 验证是否符合安全标准与法规 | 审计人员 |
| 代码审计 | 审查源代码中的安全问题 | 安全开发人员 |

日常迭代里你能立刻动手的是「扫描 + 写专项用例」，渗透测试是发布大版本时外购或专职团队做的事。

按介入时机又分三层，安全测试主要落在后两层：

| 类型   | 时机         | 代表工具                 |
| ------ | ------------ | ------------------------ |
| SAST   | 编码期（白盒，看源码） | SonarQube、Semgrep、CodeQL |
| DAST   | 运行期（黑盒，看行为） | OWASP ZAP、Burp Suite     |
| 渗透测试 | 上线前/定期（人工为主） | 手工 + 工具辅助          |

## 2. 入口清单：OWASP Top 10 与四种测试的投入分配

OWASP Top 10 是安全测试的「考试大纲」。2025 版（2025-11 正式发布）与 2021 版相比，「软件供应链失效」与「异常条件处理不当」为新晋类别，SSRF 与「过时组件」不再单列（并入供应链失效）：

| 排名 | 风险（2025 版） | 测试方法 |
| :--- | :--- | :--- |
| A01 | **失效的访问控制** | 越权访问测试、IDOR 测试 |
| A02 | **安全配置错误** | 默认配置检查、目录遍历测试 |
| A03 | **软件供应链失效**（新增） | 依赖与构建链审计、锁定文件检查 |
| A04 | **加密机制失败** | 传输加密验证、密钥管理检查 |
| A05 | **注入** | SQL 注入、XSS、命令注入测试 |
| A06 | **不安全的设计** | 威胁建模、架构审查 |
| A07 | **身份认证失败** | 暴力破解测试、会话管理测试 |
| A08 | **软件或数据完整性失败** | CI/CD 安全、更新与签名验证 |
| A09 | **安全日志与告警失败** | 日志完整性验证、告警触发测试 |
| A10 | **异常条件处理不当**（新增） | 异常输入、错误路径与边界场景测试 |

> 2021 版（A01 失效的访问控制 ... A10 SSRF）仍被大量存量资料引用，对照阅读时注意版本差异；SSRF 测试在 2025 版中归入 A01 与 A03 的测试范围。

怎么用这张表：不是每项都同等投入。对你的业务，A01（越权）几乎一定值得写专项用例，因为它工具扫不出来；A05（注入）可以固化成自动化回归（第 4 节）；其余项靠扫描工具 + 发布检查单。

## 3. OWASP ZAP：开源 DAST 代表

ZAP 以代理模式工作：浏览器流量经过 ZAP，它记录并分析请求，既能被动扫描
（只观察，不影响流量），也能主动扫描（构造攻击载荷探测漏洞）。

- **被动扫描**：挂在代理上随使用积累发现（缺失安全头、Cookie 属性、
  泄露信息），适合日常；
- **主动扫描**：对目标站点发送攻击向量（注入、XSS 探测），适合测试环境；
- **API 扫描**：导入 OpenAPI/SOAP 定义后按接口定义系统性探测，比盲扫
  覆盖好得多——**先给 ZAP 喂接口定义，再开扫**是 API 安全测试的正确姿势。

```bash
# 以 Docker 方式对测试环境做基线扫描（被动为主，输出 HTML 报告）
docker run -t zaproxy/zap-stable zap-baseline.py \
  -t https://test.example.com -r zap-report.html
```

### 3.1 工具地图与 Nuclei 模板化扫描

| 工具 | 类型 | 特点 |
| :--- | :--- | :--- |
| **OWASP ZAP** | 开源 | 主动/被动扫描，API 支持，可进 CI |
| **Burp Suite** | 商业+免费 | 功能强大，渗透测试首选 |
| **Nessus** | 商业 | 基础设施漏洞扫描 |
| **Nuclei** | 开源 | 基于模板的快速扫描 |
| **Trivy** | 开源 | 容器镜像/依赖漏洞扫描 |

Nuclei 的思路值得学一遍：扫描 = 模板（请求 + 匹配规则）。写自定义模板就是把你的专项用例变成团队可复用资产：

```bash
# 安装 Nuclei
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# 用模板扫描目标
nuclei -u https://example.com -t cves/
```

```yaml
# templates/custom-xss.yaml 自定义模板
id: custom-xss-test
info:
  name: Custom XSS Test
  severity: medium
http:
  - method: POST
    path:
      - "{{BaseURL}}/api/comments"
    body: 'content=<script>alert(1)</script>'
    matchers:
      - type: word
        words:
          - "<script>alert(1)</script>"
        negative: true
```

模板的 `negative: true` 含义：响应里**不应**出现原样回显的脚本——把「XSS 修复了」这条断言变成可复用的扫描资产，而不是散落在某个人脑袋里的检查项。

## 4. 把注入与 XSS 固化成自动化用例

SQLMap 自动化检测并利用 SQL 注入点。**只允许对自有测试环境使用**——对
未授权目标运行属违法行为。

```bash
# 检测指定请求是否存在注入（-r 可复用抓包保存的原始请求）
sqlmap -u "https://test.example.com/items?id=1" --batch

# 指定参数与数据库类型，提高检测效率
sqlmap -u "https://test.example.com/items?id=1" \
  -p id --dbms=mysql --level=3
```

工程上更有价值的做法是把「注入防护」固化成功能测试：载荷直接写进 pytest，
每次回归都跑：

```python
# SQL 注入测试用例
sql_injection_payloads = [
    # 经典注入
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "1' UNION SELECT NULL--",
    "1' UNION SELECT username,password FROM users--",

    # 盲注
    "' AND 1=1--",
    "' AND 1=2--",
    "' AND SLEEP(5)--",

    # 编码绕过
    "%27%20OR%20%271%27%3D%271",
    "1%27%20UNION%20SELECT%20NULL--",
]

def test_sql_injection(base_url):
    """测试登录接口的 SQL 注入"""
    for payload in sql_injection_payloads:
        response = requests.post(
            f"{base_url}/api/login",
            json={"username": payload, "password": "any"}
        )
        # 不应返回 200（成功登录）
        assert response.status_code != 200, f"SQL注入成功: {payload}"
        # 不应泄露数据库错误信息
        assert "SQL" not in response.text
        assert "syntax error" not in response.text.lower()
```

XSS 同理，测的是「输入被原样回显且未转义」：

```python
xss_payloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '"><script>alert("XSS")</script>',
    "'-alert('XSS')-'",
    '<svg/onload=alert("XSS")>',
    'javascript:alert("XSS")',
]

def test_xss(base_url):
    """测试评论接口的 XSS"""
    for payload in xss_payloads:
        response = requests.post(
            f"{base_url}/api/comments",
            json={"content": payload},
            headers={"Authorization": "Bearer valid_token"}
        )
        # 响应中不应原样返回未转义的脚本
        assert '<script>' not in response.text
        assert 'onerror=' not in response.text
```

为什么值得固化：这类用例不依赖业务语义、永远不该失败、失败即是真漏洞——是自动化回归的理想形状。注入攻防的原理深入见 [SQL 注入](/cybersecurity/180-SQLInjection) 与 [XSS 攻击](/cybersecurity/190-XSSAttack)。

### 4.1 最重要的提醒：越权靠人

工具能扫出注入，扫不出「用户 A 拿自己的 token 调用户 B 的订单接口返回了 200」。IDOR（不安全的直接对象引用）必须写专项用例：**两个账号互相请求对方资源，断言 403/404**。把这条加进你的验收清单，比装三个扫描器都有用。

## 5. Nmap：端口与服务发现

安全评估第一步是「搞清暴露面」：Nmap 扫描主机开放端口、运行服务与版本，
发现「被遗忘的测试后门」「不该开放的数据库端口」。

```bash
nmap -sV -p- 10.0.0.0/24   # 全端口 + 服务版本探测（内网授权环境）
```

发现结果直接转化为测试项：每个暴露的非必要端口都是一条待关闭的配置缺陷。

## 6. 模糊测试：让机器代替你猜恶意输入

### 6.1 原理与现状

模糊测试（fuzzing）用**大量随机或变异的输入**轰击程序，捕获崩溃、挂死、
内存越界等异常。现代主流是**覆盖率引导**：记录每个输入触发了哪些代码路径，
优先变异「走到新路径」的输入，效率远高于纯随机。截至 2026-09 的生态：

- **libFuzzer**（LLVM）：C/C++ 进程内覆盖率引导模糊测试的事实标准引擎；
- **Go 原生模糊测试**：Go 1.18 起内置，测试文件里写 `FuzzXxx` 函数即可，
  与 `go test` 体系同构；OSS-Fuzz 以 libFuzzer 兼容模式运行 Go 目标；
- **OSS-Fuzz**：Google 的开源项目持续模糊测试服务，已为数百个关键开源
  项目（OpenSSL、curl 等）累计发现上万级漏洞；
- Python/JS 生态则以**属性测试 + 变异**路线为主（Hypothesis、fast-check），
  严格意义的覆盖率引导 fuzzing 支持较弱。

### 6.2 Go 原生模糊测试示例

```go
// fuzz_test.go —— go test 会先跑种子用例，再自动变异探索
package parser

import "testing"

func FuzzParseAmount(f *testing.F) {
    // 种子输入：正常值 + 历史出过问题的边界值
    f.Add("100")
    f.Add("-1")
    f.Add("")
    f.Add("99999999999999999999")

    f.Fuzz(func(t *testing.T, s string) {
        v, err := ParseAmount(s)
        if err == nil && v < 0 {
            t.Fatalf("解析出负金额: %q -> %d", s, v)
        }
        // 不崩溃、不挂死、不变量不破，即为通过
    })
}
```

```bash
go test -fuzz=FuzzParseAmount -fuzztime=60s ./...
```

### 6.3 属性测试（JS/Python 侧的日常形态）

没有 libFuzzer 级基础设施时，属性测试是同等思想的轻量替代：声明「对任意
输入成立的性质」，框架自动生成大量随机用例：

```javascript
// fast-check：任意两个日期区间，先 serialize 再 parse 必须还原
import fc from 'fast-check';

test('日期序列化往返一致', () => {
  fc.assert(fc.property(fc.date(), (d) => {
    expect(parse(serialize(d))).toEqual(d);
  }));
});
```

```python
# Hypothesis：性质同上
from hypothesis import given, strategies as st

@given(st.integers(min_value=0, max_value=10**9))
def test_amount_roundtrip(n):
    assert parse_amount(format_amount(n)) == n
```

## 7. 左移：把安全检查做成日常门禁

事后扫描不如日常拦截。**左移**指把质量活动搬进更早的阶段：

```text
传统模式：需求 → 设计 → 编码 → [测试] → 发布
测试左移：[需求评审] → [设计评审] → [TDD] → [持续测试] → 发布
```

| 实践 | 阶段 | 说明 |
| :--- | :--- | :--- |
| **需求评审** | 需求阶段 | 测试人员参与需求评审 |
| **测试用例前置** | 设计阶段 | 在编码前设计测试用例 |
| **TDD** | 编码阶段 | 先写测试再写实现 |
| **代码审查** | 编码阶段 | 包含测试代码的审查 |
| **静态分析** | 编码阶段 | 自动化代码质量检查 |
| **契约测试** | 集成阶段 | 验证服务间接口契约 |

对安全专项的含义：安全用例（第 4 节那种）在需求评审时就该问「这个接口谁能调谁不能调」，而不是等扫描器报漏洞。

三类低成本的持续安全检查：

| 检查         | 工具示例                     | 门禁做法                       |
| ------------ | ---------------------------- | ------------------------------ |
| 依赖漏洞审计 | `npm audit`、`pip-audit`、OWASP Dependency-Check | 高危依赖阻断合并 |
| 静态安全扫描 | Semgrep、CodeQL、SonarQube 安全规则 | 新增高危规则命中阻断     |
| 秘密泄露扫描 | gitleaks、trufflehog         | 检出真实密钥即阻断提交         |

```bash
# 依赖审计：--audit-level 决定阻断阈值
npm audit --audit-level=high
pip-audit -r requirements.txt --strict

# 秘密扫描：对整个历史扫描一次，之后在 CI 只查增量
gitleaks detect --source . --report-path leaks.json
```

安全左移的最后一块是**用例化**：把高危场景写成常规自动化用例——
未登录访问受保护接口应 401、A 用户调用 B 用户资源应 403、提交
`<script>alert(1)</script>` 应被转义——安全回归与功能回归同节奏运行，
比季度性扫描有效得多。

## 8. 常见陷阱

- **只跑扫描器就宣布「安全」**：越权类漏洞全漏。DAST 有大量盲区（业务
  逻辑越权、二次注入、异步任务里的漏洞），扫描是兜底不是全部，越权要靠
  IDOR 专项用例 + 人工评审（第 4.1 节）。
- **把扫描器报告当结论**：工具报告存在误报与缺上下文的风险评级，需人工
  验证可利用性后再定级。
- **测试环境与生产配置不一致**：生产开 WAF/关调试端点，测试环境全开——
  扫描结论不可迁移。配置差异本身应纳入检查。
- **模糊测试当面子工程**：fuzz 一晚上没崩不代表安全；种子语料质量决定
  上限，历史缺陷输入、真实报文样本是最好的种子。
- **秘密入库**：安全测试脚本带着真实密钥进仓库，测试本身成了漏洞源。
  凭据一律走环境变量或密钥管理服务。

## 动手实践

**任务**：给自己搭的测试环境（如 DVWA 或团队的 staging）做一轮「扫描 + 专项用例」组合拳，并写出结论。

提示：
- 先用 ZAP 被动扫描拿基线报告，高危项对照第 2 节 OWASP 表归类；
- 注入回归直接复用第 4 节载荷表，指向自己的登录接口；
- IDOR 用例需要两个账号：A 的 token 请求 B 的资源，断言拒绝；
- 结论要回答「哪些风险已被自动化覆盖、哪些仍靠人」。

参考实现（先自己写，再对照）：

```python
# idor_test.py：两个账号互相越权的最小断言集
import requests

BASE = "https://test.example.com"

def login(user):
    r = requests.post(f"{BASE}/api/login", json=user, timeout=5)
    return r.json()["token"]

alice = {"username": "alice", "password": "Alice#123"}
bob = {"username": "bob", "password": "Bob#12345"}

def test_alice_cannot_read_bob_order():
    alice_token = login(alice)
    bob_token = login(bob)
    bob_order_id = requests.get(
        f"{BASE}/api/orders", headers={"Authorization": f"Bearer {bob_token}"}, timeout=5
    ).json()[0]["id"]
    resp = requests.get(
        f"{BASE}/api/orders/{bob_order_id}",
        headers={"Authorization": f"Bearer {alice_token}"}, timeout=5,
    )
    assert resp.status_code in (403, 404), f"越权成功: {resp.status_code}"
    assert "bob" not in resp.text.lower()   # 拒绝响应也不应泄露对方数据
```

对照要点：`assert resp.status_code in (403, 404)` 而不是死断言 403——两种拒绝语义都算守住边界，写死一种会把实现细节变成脆弱断言；第二条断言专抓「拒绝但泄露」的半失效形态。

## 自检

1. 你的登录接口被注入测试打出 200，问题最可能出在代码的哪一层？
2. 为什么 IDOR（越权）必须写专项用例而扫描器解决不了？
3. 安全扫描报告与安全门禁的区别是什么？为什么前者可以「知道了」而后者才是「拦住了」？

## 练习

1. 给任一公开测试站点（自己搭的 DVWA 或本团队的测试环境）跑一轮 ZAP 被动扫描，把高危项对照 OWASP 表归类。
2. 写一组 IDOR 用例：注册两个账号，互相请求对方的资源接口，断言全部拒绝。
3. 把第 4 节的注入用例接进一个 GitHub Actions 工作流，故意注入一个有漏洞的测试接口验证它能拦住合并。

## 下一步

- 把安全扫描编排进流水线门禁：见《CI/CD 测试门禁》。
- Web 安全的攻与防深入：见《Web 安全渗透测试》与《OWASP Top 10 详解》（cybersecurity 模块）。
- 接口测试的方法与三层断言：见《接口测试方法》。
