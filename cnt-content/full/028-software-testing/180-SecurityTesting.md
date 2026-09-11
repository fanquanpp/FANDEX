---
order: 180
title: 安全测试
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: 安全测试方法与工具链：DAST/SAST 定位、OWASP ZAP、SQLMap、模糊测试（Go fuzzing、libFuzzer、OSS-Fuzz）现状与漏测防范。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/170-SecurityAndMobileTest'
  - 'software-testing/130-APIAutomationTestDetailed'
  - 'software-testing/160-StressAndStabilityTest'
prerequisites:
  - 'software-testing/170-SecurityAndMobileTest'
---

## 1. 安全测试在测什么

安全测试验证的不是「功能对不对」，而是「恶意输入与恶意用户面前，系统
是否守住边界」。它与功能测试的思维差异在于：功能测试假设用户按文档操作，
安全测试假设用户**故意违反文档**——提交超长字符串、构造畸形报文、越权
访问他人数据。

前置知识：OWASP Top 10 的基本概念（见「安全与移动测试」）、HTTP 协议、
SQL 与 Web 基础。

按介入时机分三层，安全测试主要落在后两层：

| 类型   | 时机         | 代表工具                 |
| ------ | ------------ | ------------------------ |
| SAST   | 编码期（白盒，看源码） | SonarQube、Semgrep、CodeQL |
| DAST   | 运行期（黑盒，看行为） | OWASP ZAP、Burp Suite     |
| 渗透测试 | 上线前/定期（人工为主） | 手工 + 工具辅助          |

## 2. OWASP ZAP：开源 DAST 代表

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

## 3. SQLMap：注入检测与验证

SQLMap 自动化检测并利用 SQL 注入点。**只允许对自有测试环境使用**——对
未授权目标运行属违法行为。

```bash
# 检测指定请求是否存在注入（-r 可复用抓包保存的原始请求）
sqlmap -u "https://test.example.com/items?id=1" --batch

# 指定参数与数据库类型，提高检测效率
sqlmap -u "https://test.example.com/items?id=1" \
  -p id --dbms=mysql --level=3
```

工程上更有价值的做法是把「注入防护」固化成功能测试：在自动化用例里对
所有查询入口回放 `' OR '1'='1`、`1; DROP TABLE` 类载荷，断言返回被拒绝
或被参数化处理——比事后扫描更早拦截。

## 4. Nmap：端口与服务发现

安全评估第一步是「搞清暴露面」：Nmap 扫描主机开放端口、运行服务与版本，
发现「被遗忘的测试后门」「不该开放的数据库端口」。

```bash
nmap -sV -p- 10.0.0.0/24   # 全端口 + 服务版本探测（内网授权环境）
```

发现结果直接转化为测试项：每个暴露的非必要端口都是一条待关闭的配置缺陷。

## 5. 模糊测试：让机器代替你猜恶意输入

### 5.1 原理与现状

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

### 5.2 Go 原生模糊测试示例

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

### 5.3 属性测试（JS/Python 侧的日常形态）

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

## 6. 左移：把安全检查做成日常门禁

事后扫描不如日常拦截。三类低成本的持续安全检查：

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

## 7. 常见陷阱

- **只在测试环境扫一遍就算安全测试**：DAST 有大量盲区（业务逻辑越权、
  二次注入、异步任务里的漏洞）。扫描是兜底不是全部，越权类问题要靠
  针对性用例（横向：A 用户访问 B 用户资源）。
- **把扫描器报告当结论**：工具报告存在误报与缺上下文的风险评级，需人工
  验证可利用性后再定级。
- **测试环境与生产配置不一致**：生产开 WAF/关调试端点，测试环境全开——
  扫描结论不可迁移。配置差异本身应纳入检查。
- **模糊测试当面子工程**：fuzz 一晚上没崩不代表安全；种子语料质量决定
  上限，历史缺陷输入、真实报文样本是最好的种子。
- **秘密入库**：安全测试脚本带着真实密钥进仓库，测试本身成了漏洞源。
  凭据一律走环境变量或密钥管理服务。

## 小结

- 初学者要点：SAST 看代码、DAST 看运行、渗透靠人；ZAP 做基线扫描、
  SQLMap 验证注入、Nmap 摸清暴露面；「恶意输入思维」是安全用例设计的
  起点。
- 进阶注意：API 安全测试先喂 OpenAPI 定义再扫；越权问题扫不出来，要写
  专项用例；模糊测试的现代表现形式是覆盖率引导（libFuzzer、Go 1.18+
  原生 fuzzing、OSS-Fuzz）与属性测试（Hypothesis/fast-check），把它纳入
  持续集成才能长期产生价值。
