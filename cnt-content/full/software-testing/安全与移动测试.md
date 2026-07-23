---
order: 4
title: 安全与移动测试
module: 'software-testing'
category: 软件测试
difficulty: advanced
description: 安全测试方法、移动应用测试、持续集成中的测试、测试左移与质量内建。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'software-testing/功能与自动化测试'
  - 'software-testing/性能与接口测试'
  - 'software-testing/测试概念与原则'
  - 'software-testing/测试层级'
prerequisites: []
---

## 1. 安全测试方法

### 1.1 安全测试分类

| 类型         | 说明                       | 执行者       |
| :----------- | :------------------------- | :----------- |
| **漏洞扫描** | 使用工具自动检测已知漏洞   | 安全工程师   |
| **渗透测试** | 模拟攻击者发现安全弱点     | 渗透测试人员 |
| **合规检查** | 验证是否符合安全标准与法规 | 审计人员     |
| **代码审计** | 审查源代码中的安全问题     | 安全开发人员 |

### 1.2 OWASP Top 10

| 排名 | 风险                        | 测试方法                    |
| :--- | :-------------------------- | :-------------------------- |
| A01  | **失效的访问控制**          | 越权访问测试、IDOR 测试     |
| A02  | **加密机制失败**            | 传输加密验证、密钥管理检查  |
| A03  | **注入**                    | SQL 注入、XSS、命令注入测试 |
| A04  | **不安全的设计**            | 威胁建模、架构审查          |
| A05  | **安全配置错误**            | 默认配置检查、目录遍历测试  |
| A06  | **过时组件**                | 依赖版本扫描、CVE 检查      |
| A07  | **身份认证失败**            | 暴力破解测试、会话管理测试  |
| A08  | **软件和数据完整性失败**    | CI/CD 安全、更新验证        |
| A09  | **安全日志与监控失败**      | 日志完整性验证、告警测试    |
| A10  | **服务器端请求伪造 (SSRF)** | 内网探测测试、URL 限制绕过  |

### 1.3 SQL 注入测试

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

### 1.4 XSS 测试

```python
# XSS 测试用例
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

### 1.5 漏洞扫描工具

| 工具           | 类型      | 特点                    |
| :------------- | :-------- | :---------------------- |
| **OWASP ZAP**  | 开源      | 主动/被动扫描，API 支持 |
| **Burp Suite** | 商业+免费 | 功能强大，渗透测试首选  |
| **Nessus**     | 商业      | 基础设施漏洞扫描        |
| **Nuclei**     | 开源      | 基于模板的快速扫描      |
| **Trivy**      | 开源      | 容器镜像漏洞扫描        |

### 1.6 Nuclei 扫描示例

```bash
# 安装 Nuclei
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# 扫描目标
nuclei -u https://example.com -t cves/

# 自定义模板
# templates/custom-xss.yaml
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

## 2. 移动应用测试

### 2.1 Appium 框架

Appium 是跨平台移动应用自动化测试框架，支持 iOS 和 Android：

| 特性         | 说明                         |
| :----------- | :--------------------------- |
| **跨平台**   | 一套 API 适配 iOS 和 Android |
| **多语言**   | 支持 Python、Java、JS 等     |
| **原生支持** | 原生、混合、移动 Web 应用    |
| **无需修改** | 不需要修改应用源码           |

### 2.2 Appium 环境搭建

```bash
# 安装 Appium
npm install -g appium

# 安装 UIAutomator2 驱动（Android）
appium driver install uiautomator2

# 安装 XCUITest 驱动（iOS）
appium driver install xcuitest

# 启动 Appium 服务
appium --address 127.0.0.1 --port 4723
```

### 2.3 Android 自动化测试

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
        # 通过 ID 定位
        username = self.driver.find_element("id", "com.example.myapp:id/username")
        username.send_keys("admin")

        password = self.driver.find_element("id", "com.example.myapp:id/password")
        password.send_keys("123456")

        # 通过 Accessibility ID 定位
        login_btn = self.driver.find_element("accessibility id", "登录")
        login_btn.click()

        # 验证登录成功
        welcome = self.driver.find_element("id", "com.example.myapp:id/welcome_text")
        assert "欢迎" in welcome.text

    def test_scroll_and_click(self):
        """滚动查找并点击"""
        # 使用 UiScrollable 滚动查找
        self.driver.find_element(
            "android uiautomator",
            'new UiScrollable(new UiSelector().scrollable(true))'
            '.scrollIntoView(new UiSelector().text("设置"))'
        ).click()
```

### 2.4 设备兼容性测试

| 维度         | 测试内容                   | 策略              |
| :----------- | :------------------------- | :---------------- |
| **屏幕尺寸** | 不同分辨率和屏幕密度       | 主流设备覆盖      |
| **系统版本** | Android 10-14 / iOS 15-17  | 最低版本+最新版本 |
| **网络环境** | WiFi/4G/5G/弱网/断网       | 模拟网络切换      |
| **内存压力** | 低内存设备运行             | 模拟内存限制      |
| **权限管理** | 授权/拒绝/部分授权         | 全组合测试        |
| **安装升级** | 全新安装/覆盖安装/降级安装 | 版本矩阵          |

### 2.5 移动端性能功耗测试

```bash
# Android 性能分析
# CPU 使用率
adb shell top -n 1 | grep com.example.myapp

# 内存使用
adb shell dumpsys meminfo com.example.myapp

# 电量消耗
adb shell dumpsys batterystats com.example.myapp

# 网络流量
adb shell cat /proc/uid_stat/$(adb shell ps | grep com.example.myapp | awk '{print $2}')/tcp_snd

# 启动时间
adb shell am start -W com.example.myapp/.MainActivity

# FPS 帧率
adb shell dumpsys gfxinfo com.example.myapp
```

## 3. 持续集成中的测试

### 3.1 CI 测试流程

```
代码提交 → 代码扫描 → 单元测试 → 构建打包 → 集成测试 → 部署测试环境 → E2E测试 → 报告
```

### 3.2 GitHub Actions 测试配置

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

### 3.3 Jenkins 测试流水线

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

## 4. 测试左移与质量内建

### 4.1 测试左移

将测试活动**前移到开发早期**，从源头预防缺陷：

```
传统模式：需求 → 设计 → 编码 → [测试] → 发布
测试左移：[需求评审] → [设计评审] → [TDD] → [持续测试] → 发布
```

| 实践             | 阶段     | 说明                 |
| :--------------- | :------- | :------------------- |
| **需求评审**     | 需求阶段 | 测试人员参与需求评审 |
| **测试用例前置** | 设计阶段 | 在编码前设计测试用例 |
| **TDD**          | 编码阶段 | 先写测试再写实现     |
| **代码审查**     | 编码阶段 | 包含测试代码的审查   |
| **静态分析**     | 编码阶段 | 自动化代码质量检查   |
| **契约测试**     | 集成阶段 | 验证服务间接口契约   |

### 4.2 质量内建

将质量保障融入开发全流程，而非依赖最终测试：

| 原则             | 实践                         |
| :--------------- | :--------------------------- |
| **预防胜于检测** | 代码规范、设计模式、架构评审 |
| **快速反馈**     | 自动化测试、CI 流水线        |
| **全员负责**     | 开发写测试、测试写工具       |
| **持续改进**     | 缺陷复盘、流程优化           |
| **可视化**       | 质量看板、测试覆盖率报告     |

### 4.3 质量门禁

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

### 4.4 测试金字塔

```
          ╱  E2E 测试  ╲           少量、慢速、高成本
        ╱─────────────────╲
      ╱   集成/接口测试     ╲       适量、中速、中成本
    ╱─────────────────────────╲
  ╲/     单元测试               ╲   大量、快速、低成本
```

| 层级         | 比例 | 执行时间 | 维护成本 | 覆盖广度 |
| :----------- | :--- | :------- | :------- | :------- |
| **单元测试** | 70%  | 毫秒级   | 低       | 代码逻辑 |
| **集成测试** | 20%  | 秒级     | 中       | 模块交互 |
| **E2E 测试** | 10%  | 分钟级   | 高       | 用户流程 |

### 4.5 测试成熟度模型

| 级别        | 特征                   | 典型实践              |
| :---------- | :--------------------- | :-------------------- |
| **L1 初始** | 手动测试为主，无规范   | 人工执行、无计划      |
| **L2 管理** | 有测试流程和规范       | 测试计划、用例管理    |
| **L3 定义** | 自动化测试覆盖核心功能 | 自动化框架、CI 集成   |
| **L4 量化** | 质量指标可度量、可预测 | 覆盖率监控、质量门禁  |
| **L5 优化** | 持续改进、质量内建     | 测试左移、AI 辅助测试 |
