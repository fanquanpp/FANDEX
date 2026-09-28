---
order: 170
title: 安全与移动测试
module: 'software-testing'
category: 云与基础设施
difficulty: advanced
description: '发布前的两类专项测试：安全测试从 OWASP Top 10 入手动手做，移动端从真机兼容到性能功耗，最后把专项挂进 CI 与质量内建流程。'
author: fanquanpp
updated: '2026-09-28'
related:
  - 'software-testing/080-FunctionalAndAutomatedTest'
  - 'software-testing/140-PerformanceInterfaceTest'
  - 'software-testing/230-CICDTest'
  - 'software-testing/030-TestLevels'
prerequisites:
  - 'software-testing/030-TestLevels'
  - 'software-testing/120-APIAutomationTest'
---

## 场景

你的产品下周发布：一个 Web 后台（登录、下单）和一个 Android App。功能测试都绿了，但老板问了两句让你睡不着的话："被人扫了怎么办？""用户那些破手机上能跑吗？"

这两类问题功能用例盖不住，需要专项测试。本篇按真实发布前的动作顺序走：先给 Web 做一轮安全测试（有工具也有要手写的用例），再做移动端兼容与性能检查，最后把这些专项挂进 CI，让它们从"发布前人肉跑一遍"变成"每次提交自动跑"。

## 一、安全测试：从清单到用例

### 1.1 四种安全测试，先分清谁干什么

| 类型 | 说明 | 谁来做 |
| :--- | :--- | :--- |
| 漏洞扫描 | 工具自动检测已知漏洞 | 开发/测试就能跑 |
| 渗透测试 | 模拟攻击者发现安全弱点 | 专业渗透人员 |
| 合规检查 | 验证是否符合安全标准与法规 | 审计人员 |
| 代码审计 | 审查源代码中的安全问题 | 安全开发人员 |

日常迭代里你能立刻动手的是前两类里的"扫描 + 写专项用例"，渗透测试是发布大版本时外购或专职团队做的事。

### 1.2 入口清单：OWASP Top 10

OWASP Top 10 是安全测试的"考试大纲"。2025 版（2025-11 正式发布）与 2021 版相比，「软件供应链失效」与「异常条件处理不当」为新晋类别，SSRF 与「过时组件」不再单列（并入供应链失效）：

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

怎么用这张表：不是每项都同等投入。对你的业务，A01（越权）几乎一定值得写专项用例，因为它工具扫不出来；A05（注入）可以固化成自动化回归；其余项靠扫描工具 + 发布检查单。

### 1.3 动手：把注入测试固化成自动化用例

SQL 注入的测试载荷可以直接写进 pytest，每次回归都跑：

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

XSS 同理，测的是"输入被原样回显且未转义"：

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

### 1.4 工具与扫描

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

### 1.5 最重要的提醒：越权靠人

工具能扫出注入，扫不出"用户 A 拿自己的 token 调用户 B 的订单接口返回了 200"。IDOR（不安全的直接对象引用）必须写专项用例：**两个账号互相请求对方资源，断言 403/404**。把这条加进你的验收清单，比装三个扫描器都有用。

## 二、移动应用测试

### 2.1 Appium：一套 API 打两端

| 特性 | 说明 |
| :--- | :--- |
| **跨平台** | 一套 API 适配 iOS 和 Android |
| **多语言** | 支持 Python、Java、JS 等 |
| **原生支持** | 原生、混合、移动 Web 应用 |
| **无需修改** | 不需要修改应用源码 |

环境搭建三步：

```bash
npm install -g appium
appium driver install uiautomator2   # Android 驱动
appium driver install xcuitest       # iOS 驱动
appium --address 127.0.0.1 --port 4723
```

### 2.2 动手：一个登录冒烟用例

```python
from appium import webdriver
from appium.options.android import UiAutomator2Options
import pytest

class TestAndroidApp:
    """Android 应用自动化测试"""

    def setup_method(self):
        options = UiAutomator2Options()
        options.platform_name = "Android"
        options.device_name = "emulator-5554"
        options.app = "/path/to/app.apk"
        options.app_package = "com.example.myapp"
        options.app_activity = ".MainActivity"
        options.automation_name = "UiAutomator2"
        options.no_reset = False

        self.driver = webdriver.Remote(
            "http://127.0.0.1:4723",
            options=options
        )

    def teardown_method(self):
        self.driver.quit()

    def test_login(self):
        """测试登录流程"""
        username = self.driver.find_element("id", "com.example.myapp:id/username")
        username.send_keys("admin")

        password = self.driver.find_element("id", "com.example.myapp:id/password")
        password.send_keys("123456")

        login_btn = self.driver.find_element("accessibility id", "登录")
        login_btn.click()

        welcome = self.driver.find_element("id", "com.example.myapp:id/welcome_text")
        assert "欢迎" in welcome.text

    def test_scroll_and_click(self):
        """滚动查找并点击"""
        self.driver.find_element(
            "android uiautomator",
            'new UiScrollable(new UiSelector().scrollable(true))'
            '.scrollIntoView(new UiSelector().text("设置"))'
        ).click()
```

定位策略的选择顺序：`accessibility id`（顺便提升无障碍质量）> `id` > `android uiautomator` 兜底。写死 XPath 绝对路径的用例活不过一个 UI 迭代。

### 2.3 兼容性：矩阵思维，不是穷举

| 维度 | 测试内容 | 策略 |
| :--- | :--- | :--- |
| **屏幕尺寸** | 不同分辨率和屏幕密度 | 主流设备覆盖 |
| **系统版本** | 最低支持版本到最新版本 | 最低版本+最新版本+主流在用版本（如近 3-4 个大版本，按产品用户分布确定） |
| **网络环境** | WiFi/4G/5G/弱网/断网 | 模拟网络切换 |
| **内存压力** | 低内存设备运行 | 模拟内存限制 |
| **权限管理** | 授权/拒绝/部分授权 | 全组合测试 |
| **安装升级** | 全新安装/覆盖安装/降级安装 | 版本矩阵 |

关键取舍：全量真机既买不起也跑不完，用"用户分布 top 设备 + 系统版本矩阵"圈定必测集，云真机平台兜长尾。

### 2.4 性能功耗：adb 就是仪器

不需要采购平台，adb 命令就能拿到发布前该看的核心指标：

```bash
# CPU 使用率
adb shell top -n 1 | grep com.example.myapp

# 内存使用
adb shell dumpsys meminfo com.example.myapp

# 电量消耗
adb shell dumpsys batterystats com.example.myapp

# 启动时间（关注 TotalTime）
adb shell am start -W com.example.myapp/.MainActivity

# FPS 帧率
adb shell dumpsys gfxinfo com.example.myapp
```

发布前给这些指标定基线：冷启动 < 2s、目标页面稳定 55fps 以上、后台待机零唤醒。超过基线就是 bug，不要靠"感觉流畅"验收。

## 三、挂进 CI：专项测试的自动化

### 3.1 流水线里的顺序

```text
代码提交 → 代码扫描 → 单元测试 → 构建打包 → 集成测试 → 部署测试环境 → E2E测试 → 报告
```

排序原则只有一条：**越快的越靠前、越要强制**。安全扫描放最前（秒级），E2E 放后（分钟级），移动端专项放每日定时任务而不是每次提交。

### 3.2 GitHub Actions 示例

真实的工程语境：本仓库（FANDEX）就是一个多包 pnpm 项目，`deploy.yml` 按 `paths` 过滤触发、用 `concurrency` 防并发部署，另外跑 Lighthouse CI 做性能门禁；构建链的末端用 pagefind 重建搜索索引（`pnpm build:web` 的最后一步），发布后还有 Playwright 冒烟测试（`pnpm --filter @fandex/web test:smoke`）。测试挂 CI 时照着这些点设计：触发条件、并发控制、失败即阻塞合并。

一个带服务容器的通用测试流水线：

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run unit tests
        run: pytest tests/unit/ -v --cov=src --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: coverage.xml

  integration-test:
    needs: unit-test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        run: pytest tests/integration/ -v
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/testdb

  api-test:
    needs: integration-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start API server
        run: |
          docker-compose up -d api
          sleep 10
      - name: Run API tests
        run: newman run postman_collection.json -e test_environment.json

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
      - name: Run Bandit (Python SAST)
        run: |
          pip install bandit
          bandit -r src/ -f json -o bandit-report.json
```

Jenkins 的等价写法（老基建团队会遇到）：

```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('代码扫描') {
            steps {
                sh 'sonar-scanner -Dsonar.projectKey=myapp'
            }
        }

        stage('单元测试') {
            steps {
                sh 'pytest tests/unit/ --junitxml=unit-results.xml'
            }
            post {
                always {
                    junit 'unit-results.xml'
                }
            }
        }

        stage('构建') {
            steps {
                sh 'docker build -t myapp:test .'
            }
        }

        stage('集成测试') {
            steps {
                sh 'docker-compose -f docker-compose.test.yml up -d'
                sh 'pytest tests/integration/ --junitxml=integration-results.xml'
            }
            post {
                always {
                    sh 'docker-compose -f docker-compose.test.yml down'
                    junit 'integration-results.xml'
                }
            }
        }

        stage('性能测试') {
            steps {
                sh 'jmeter -n -t perf_test.jmx -l results.jtl'
                publishHTML(target: [
                    reportDir: 'report',
                    reportFiles: 'index.html',
                    reportName: 'Performance Report'
                ])
            }
        }
    }

    post {
        always {
            emailext(
                subject: "构建 ${currentBuild.result}: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "测试报告: ${env.BUILD_URL}",
                to: 'team@example.com'
            )
        }
    }
}
```

## 四、测试左移与质量内建：让专项不再是救火

### 4.1 左移：把测试搬进更早的阶段

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

对专项测试的含义：安全用例（1.3 节那种）在需求评审时就该问"这个接口谁能调谁不能调"，而不是等扫描器报漏洞。

### 4.2 质量内建与门禁

原则：**预防胜于检测、快速反馈、全员负责**。落点是三件制度化的工具——评审、门禁、自动化回归，而不是口号：

| 原则 | 实践 |
| :--- | :--- |
| **预防胜于检测** | 代码规范、设计模式、架构评审 |
| **快速反馈** | 自动化测试、CI 流水线 |
| **全员负责** | 开发写测试、测试写工具 |
| **持续改进** | 缺陷复盘、流程优化 |
| **可视化** | 质量看板、测试覆盖率报告 |

门禁把"标准"变成"合并按钮上的硬条件"：

```yaml
# 质量门禁配置示例
quality_gates:
  code_review:
    required_approvals: 2
    must_include_test: true

  unit_test:
    coverage_minimum: 80%
    all_tests_pass: true

  integration_test:
    critical_paths_pass: true
    error_rate_below: 0.1%

  security:
    no_critical_vulnerabilities: true
    no_high_vulnerabilities: true

  performance:
    p95_response_time_below: 500ms
    tps_above: 1000

  deployment:
    canary_success_rate_above: 99.5%
    rollback_on_failure: true
```

### 4.3 测试金字塔与成熟度

```mermaid
flowchart TD
    E[E2E 测试<br/>少量、慢速、高成本] --> I[集成/接口测试<br/>适量、中速、中成本]
    I --> U[单元测试<br/>大量、快速、低成本]
```

| 层级 | 比例 | 执行时间 | 维护成本 | 覆盖广度 |
| :--- | :--- | :--- | :--- | :--- |
| **单元测试** | 70% | 毫秒级 | 低 | 代码逻辑 |
| **集成测试** | 20% | 秒级 | 中 | 模块交互 |
| **E2E 测试** | 10% | 分钟级 | 高 | 用户流程 |

团队自评可以对着这张成熟度表找位置，下一步自然浮出来：

| 级别 | 特征 | 典型实践 |
| :--- | :--- | :--- |
| **L1 初始** | 手动测试为主，无规范 | 人工执行、无计划 |
| **L2 管理** | 有测试流程和规范 | 测试计划、用例管理 |
| **L3 定义** | 自动化测试覆盖核心功能 | 自动化框架、CI 集成 |
| **L4 量化** | 质量指标可度量、可预测 | 覆盖率监控、质量门禁 |
| **L5 优化** | 持续改进、质量内建 | 测试左移、AI 辅助测试 |

## 坑点清单

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| 只跑扫描器就宣布"安全" | 越权类漏洞全漏 | IDOR 专项用例 + 人工评审 |
| 移动兼容追求全量真机 | 成本失控、周期失控 | top 设备 + 版本矩阵 + 云真机兜尾 |
| 性能验收靠手感 | 版本间悄悄劣化 | adb 基线指标进发布检查单 |
| 安全扫描只放报告不设门禁 | critical 漏洞照常上线 | 门禁硬卡 no-critical |
| E2E 放流水线最前面 | 反馈慢、随机失败阻塞全员 | 金字塔分层，快的在前 |
| 专项测试人肉跑 | 发布前才发现、经常跳过 | 挂 CI/定时任务，制度化 |

## 自检

1. 你的登录接口被注入测试打出 200，问题最可能出在代码的哪一层？
2. 兼容性矩阵里"最低支持版本 + 最新 + 主流在用"为什么这样取，而不是均匀取样？
3. 质量门禁和安全扫描报告的区别是什么？为什么前者才是"内建"？

## 练习

1. 给任一公开测试站点（自己搭的 DVWA 或本团队的测试环境）跑一轮 ZAP 被动扫描，把高危项对照 OWASP 表归类。
2. 写一组 IDOR 用例：注册两个账号，互相请求对方的资源接口，断言全部拒绝。
3. 用 adb 测一个真实 App 的冷启动时间，连续 5 次取中位数，和官方基线比一比。
4. 把 1.3 节的注入用例接进一个 GitHub Actions 工作流，故意注入一个有漏洞的测试接口验证它能拦住合并。

## 下一步

- CI/CD 中测试的完整设计（分层、并行、门禁工程化）：见 [CI/CD 测试](/software-testing/230-CICDTest)。
- Web 安全的攻与防深入：见 [Web 安全渗透测试](/cybersecurity/150-WebSecurityPenetrationTesting) 与 [OWASP Top 10 详解](/cybersecurity/160-OWASPTop10Detailed)。
- 性能测试的方法论（不只是移动端）：见 [性能与接口测试](/software-testing/140-PerformanceInterfaceTest)。
