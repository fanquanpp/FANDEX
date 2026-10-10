---
order: 320
title: CI/CD 测试门禁
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: CI/CD 测试门禁：质量门的分层设计、SonarQube Quality Gate、JaCoCo 与 Vitest 覆盖率卡点、flaky 测试治理与变异测试进阶。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'software-testing/070-WhiteBoxTestCoverage'
  - 'software-testing/190-TestDouble'
  - 'software-testing/200-TestDrivenDevelopment'
  - 'software-testing/235-AssetAuditAndScreenshotRegression'
  - 'software-testing/172-MobileAppTesting'
prerequisites:
  - 'software-testing/010-TestBasicsMethod'
---

## 知识点地图

- **知识类别**：CI/CD 测试门禁——把质量标准写进流水线的分层设计（lint/单测/覆盖率/变异/性能），与 flaky 治理。
- **解决什么问题**：没有门禁时「本地跑过」与「主分支可用」之间没有强制力；本文给出各层检查的取舍、阈值设定与误报治理。
- **什么时候用到**：搭建或整改流水线；设定覆盖率与质量门阈值；治理抖动用例；用变异测试检验断言强度。

## 1. 为什么需要测试门禁

没有门禁的团队常说「测试在本地跑过就行」，结果主分支上积累着一堆只在
某人机器上通过的代码。**测试门禁（Quality Gate）**把质量标准写进流水线：
任何变更必须先通过自动化检查才允许合并与部署，让「质量标准」从口头约定
变成机器强制。

类比：门禁像机场安检——不管你是谁、改动多小，不达标就不能「登机」；
安检项目（跑什么检查）和标准（阈值多少）公开透明，规则面前一律平等。

前置知识：测试层级（单元/集成/E2E）、覆盖率基本概念、CI 基本工作流。

### 1.1 门禁分层设计

```mermaid
flowchart LR
    P["提交 / PR"] --> L["第 1 层：静态检查<br/>lint、类型、格式<br/>秒级"]
    L --> U["第 2 层：单元测试 + 覆盖率<br/>分钟级"]
    U --> I["第 3 层：集成测试 / 契约测试<br/>分钟级"]
    I --> E["第 4 层：E2E 冒烟<br/>合并后运行"]
    E --> D["部署"]
```

分层原则：**越靠前的检查越快、失败率越高；慢的检查后置**。单元测试必须
秒级反馈，E2E 放到合并后跑，否则开发者会在等待中失去纪律。

### 1.2 门禁内容清单

| 检查         | 典型工具                       | 失败即阻断的项               |
| ------------ | ------------------------------ | ---------------------------- |
| 静态检查     | ESLint、ruff、Checkstyle       | 错误级规则、类型错误         |
| 单元测试     | Vitest、pytest、JUnit          | 任何测试失败                 |
| 覆盖率       | Vitest thresholds、JaCoCo      | 新增代码覆盖率低于阈值       |
| 代码质量     | SonarQube                      | Quality Gate 为 Failed       |
| 安全扫描     | 依赖审计、SAST（Semgrep 等）   | 高危漏洞                     |
| 构建产物     | 构建 + 冒烟                    | 构建失败、健康检查不过       |

## 2. 覆盖率门禁：卡新增，不卡存量

覆盖率门禁最常见的失败方式是「一刀切」：要求全库 80%，但存量代码只有
40%，门禁永远红，最后被大家默契地关掉。正确做法是**对增量代码设卡**：

- SonarQube 的 `new coverage` 条件只统计新代码/变更代码；
- diff-cover、undercover 等工具只检查本次 diff 被测试覆盖的比例；
- 存量债务单独立专项行动逐步偿还，不阻塞日常 PR。

### 2.1 JaCoCo（Java）的 check 配置

```xml
<!-- pom.xml：jacoco-maven-plugin 的 check 目标 -->
<execution>
  <id>check</id>
  <goals><goal>check</goal></goals>
  <configuration>
    <rules>
      <rule>
        <element>BUNDLE</element>
        <limits>
          <limit>
            <counter>BRANCH</counter>
            <value>COVEREDRATIO</value>
            <minimum>0.80</minimum>  <!-- 分支覆盖率不低于 80% -->
          </limit>
        </limits>
      </rule>
    </rules>
  </configuration>
</execution>
```

`mvn verify` 时低于阈值即构建失败；`counter` 可换 `LINE`、`INSTRUCTION`，
配合「分支覆盖」语义更严（见「白盒测试覆盖度」）。

### 2.2 Vitest thresholds（JavaScript/TypeScript）

```typescript
// vitest.config.ts
export default {
  test: {
    coverage: {
      provider: 'v8',              // 默认 v8，精确度经 AST 重映射后与 Istanbul 相当
      include: ['src/**'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
};
```

### 2.3 SonarQube Quality Gate

SonarQube 用「条件集合」定义质量门，默认的「Sonar way」即：新代码覆盖率
达标、无新增阻断级问题、安全热点已评审、重复率与复杂度不超限。与 CI 集成
时流水线向 SonarQube 提交分析结果，再回调查询门禁结论决定放行：

```yaml
# GitHub Actions 片段（示意）
- run: mvn verify sonar:sonar -Dsonar.projectKey=demo
- run: |
    # 轮询 Quality Gate Status，非 OK 则退出非零，阻断合并
    bash ci/wait_for_quality_gate.sh
```

## 3. Flaky 测试：门禁可信度的头号敌人

**flaky（抖动）测试**指同一代码下结果时好时坏的测试。它对门禁的破坏是
根本性的：重跑能过，大家就开始「重跑文化」，门禁失去威慑力。

常见成因与治理：

| 成因                     | 治理手段                                   |
| ------------------------ | ------------------------------------------ |
| 用例间共享状态、执行顺序 | 每个用例自建自清；随机顺序运行暴露依赖     |
| 时间、时区、随机数       | 注入时钟/随机源，用固定种子                |
| 等待写死（sleep）        | 事件驱动等待（如 Playwright 自动等待）     |
| 真实外部依赖             | 替身化或本地化（Testcontainers、契约测试） |
| 并发竞争                 | 用例内避免并行断言同一资源                 |

工程实践：CI 中统计每条用例的失败率，高抖动用例自动移入「隔离区」
（标记隔离并开单修复），而不是允许无限重试；部分平台（如 Playwright、
JUnit 平台插件）能输出重试与稳定性报告辅助定位。

## 4. 进阶门禁：变异测试与性能预算

### 4.1 变异测试：检验测试的有效性

覆盖率说「代码被执行过」，变异测试问「测试真能发现错误吗」。它向代码注入
微小变异（把 `>` 改成 `>=`、删掉一次取反），每个变异体称为一个 mutant；
跑测试套件，**被测试杀死的 mutant 比例即变异分数**。存活 mutant 说明该处
逻辑没有任何断言保护。

**反例：覆盖率 100% 仍漏测。**

```java
// 被测代码：折扣计算
public BigDecimal discount(int quantity) {
    return quantity >= 10 ? new BigDecimal("0.9") : BigDecimal.ONE;
}

// 「完美」测试：行覆盖 100%，但它对折扣金额一个数字都没断言
@Test
void discountTest() {
    service.discount(15);    // 覆盖了 true 分支
    service.discount(5);     // 覆盖了 false 分支
}
```

两条用例把两个分支都跑过（覆盖率 100%），但把 `>=` 变异成 `>`（10 件恰好
不给折扣）没有任何用例会失败——mutant 存活，变异分数直接暴露「断言缺席」。
这就是覆盖率与有效性的差距：覆盖率统计「跑过」，变异分数统计「盯住」。

**PIT（Java/Kotlin）落地**——Maven 配置即用：

```xml
<plugin>
  <groupId>org.pitest</groupId>
  <artifactId>pitest-maven</artifactId>
  <version>1.16.1</version>
  <configuration>
    <targetClasses>
      <param>com.example.pricing.*</param>   <!-- 只变异核心计价逻辑 -->
    </targetClasses>
    <targetTests>
      <param>com.example.pricing.**</param>
    </targetTests>
    <mutationThreshold>70</mutationThreshold>  <!-- 低于 70% 构建失败 -->
    <excludedTestClasses>
      <param>*IT</param>                       <!-- 集成测试太慢，不参与变异判定 -->
    </excludedTestClasses>
  </configuration>
</plugin>
```

```bash
mvn org.pitest:pitest-maven:mutationCoverage   # 产出 HTML 报告：每个存活 mutant 标在源码上
```

- 配置要点：`targetClasses` 限定到**业务规则密集**的包（计价、风控、协议编解码）——变异这些包的性价比最高；对 DTO、配置类变异是烧机器。
- 报告解读：存活 mutant 分两类，**该杀未杀**（断言缺失，补断言）与**等价 mutant**（变异不改变可观察行为，如 `x <= y` 变 `x < y` 在 x≠y 时同值）——后者承认杀不掉，不要为凑分数写断言成本无限的测试。

**Stryker（JS/TS）落地**——`npx stryker init` 后的收紧版 `stryker.conf.json`：

```json
{
  "packageManager": "npm",
  "testRunner": "vitest",
  "mutate": ["src/pricing/**/*.ts"],      // 同理：只变异核心逻辑
  "coverageAnalysis": "perTest",          // 只跑覆盖到该 mutant 的测试，提速数倍
  "thresholds": { "high": 80, "low": 60, "break": 55 },
  "concurrency": 4,
  "timeoutMS": 5000
}
```

- `coverageAnalysis: "perTest"` 是 Stryker 最大的提速开关：静态分析每个 mutant 被哪些用例覆盖，只跑这些用例；没有它大型项目一夜跑不完。
- `break` 阈值接入门禁：低于 55% 时 Stryker 以非零码退出，nightly 流水线变红。
- 运行节奏：变异测试是**重量级**检验，不进每个 PR；典型节奏是 nightly 跑核心包、发版前跑全量、覆盖率突增的大重构单独触发。

**变异分数的解读纪律**：它回答「断言强度」，不回答「用例数量够不够」——两套
指标互补。用变异分数做团队间排名同样会失真（不同模块的可变异逻辑密度不同），
只用于同模块的时间纵向对比与门禁底线。覆盖度语义的更多层次（行/分支/路径）
见 [白盒测试与覆盖率](/software-testing/070-WhiteBoxTestCoverage)。

### 4.2 性能预算进入流水线

性能回归也应被门禁拦截：k6 这类脚本化压测工具可在 CI 对关键接口跑小规模
基线压测，`thresholds` 定义「P95 响应时间、错误率」等阈值，超限即失败；
Lighthouse CI 则守卫前端性能预算。注意 CI 机器噪声大，阈值要留余量并把
绝对数值比较换成「与基线对比的相对变化」。

## 5. 完整流水线：专项测试挂进 CI 的写法

### 5.1 流水线里的顺序

```text
代码提交 → 代码扫描 → 单元测试 → 构建打包 → 集成测试 → 部署测试环境 → E2E测试 → 报告
```

排序原则只有一条：**越快的越靠前、越要强制**。安全扫描放最前（秒级），E2E 放后（分钟级），移动端专项放每日定时任务而不是每次提交（移动专项的执行方法见《移动应用测试》）。

### 5.2 GitHub Actions 示例

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

逐段解释这份 YAML 的三个设计点：`needs` 把 job 串成「单元 → 集成 → API」的依赖链，前一级失败后级不启动，省算力也让失败原因不混淆；`services.postgres` 用容器服务替代「先装数据库再跑」的脚本化初始化，环境即声明；`security-scan` 与测试链并行不串行——它不依赖构建产物，串进去只会拖慢反馈。

### 5.3 Jenkins 的等价写法

老基建团队会遇到 Jenkins，同样一套分层翻译过去：

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

两个生态的关键差异：Jenkins 的 `post { always }` 保证清理动作（`docker-compose down`）无论成败都执行——GitHub Actions 里对应写法是「测试与清理分步 + `if: always()`」；报告归档在 Jenkins 走 `junit`/`publishHTML` 插件，GitHub 侧走 artifact 上传。

## 6. 质量内建：门禁背后的文化

门禁只是制度化的末端。质量内建（Quality Built-in）的原则是**预防胜于检测、快速反馈、全员负责**：

| 原则 | 实践 |
| :--- | :--- |
| **预防胜于检测** | 代码规范、设计模式、架构评审 |
| **快速反馈** | 自动化测试、CI 流水线 |
| **全员负责** | 开发写测试、测试写工具 |
| **持续改进** | 缺陷复盘、流程优化 |
| **可视化** | 质量看板、测试覆盖率报告 |

门禁把「标准」变成「合并按钮上的硬条件」：

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

### 6.1 金字塔决定流水线形状

流水线的检查比例应复刻测试金字塔：

| 层级 | 比例 | 执行时间 | 维护成本 | 覆盖广度 |
| :--- | :--- | :--- | :--- | :--- |
| **单元测试** | 70% | 毫秒级 | 低 | 代码逻辑 |
| **集成测试** | 20% | 秒级 | 中 | 模块交互 |
| **E2E 测试** | 10% | 分钟级 | 高 | 用户流程 |

```mermaid
flowchart TD
    E[E2E 测试<br/>少量、慢速、高成本] --> I[集成/接口测试<br/>适量、中速、中成本]
    I --> U[单元测试<br/>大量、快速、低成本]
```

团队自评可以对着这张成熟度表找位置，下一步自然浮出来：

| 级别 | 特征 | 典型实践 |
| :--- | :--- | :--- |
| **L1 初始** | 手动测试为主，无规范 | 人工执行、无计划 |
| **L2 管理** | 有测试流程和规范 | 测试计划、用例管理 |
| **L3 定义** | 自动化测试覆盖核心功能 | 自动化框架、CI 集成 |
| **L4 量化** | 质量指标可度量、可预测 | 覆盖率监控、质量门禁 |
| **L5 优化** | 持续改进、质量内建 | 测试左移、AI 辅助测试 |

## 7. 真实项目的门禁链：游戏工程样本

教科书讲门禁容易停留在 Web 后端语境。看两个真实游戏项目的门禁清单，体会「门禁内容跟着项目风险走」：

**speed-rouge（Godot 4 GDScript 横版平台）v0.67 的全量门禁**（记于其 CHANGELOG）：import 零错误、check-only 全绿、flow/native 两族共 17 个场景测试、stats、focus（零自有告警）、trait、ambience、transition、replay 三腿、recall、dual 七链、nettest，加上工具链审计门禁 tiledata/level_audit/door_audit/fontcover/progen 全 PASS。它的特点是：**测试对象一半是代码、一半是资源**——瓦片图集的物理属性、关卡数据、字体子集覆盖都各自有静态断言门禁（资源审计门禁的详细方法论见《资源审计与截图回归》）。

**flower-card（Godot mono + C#）的双门禁**：`dotnet build` 0 警告 0 错误 + `godot --headless --quit-after 120` 冒烟打印 `[SMOKE] Main ready` 且退出码为 0。README 里特别注明引擎侧 RID 清理告警属于强退噪声而非脚本错误——**门禁报告里区分「噪声」与「失败」是可维护门禁的前提**，否则噪声会把真实告警淹没。

两个项目互为对照：前者证明小团队也能养得起十几道门禁（前提是每道都秒级到分钟级、且各自盯一类风险），后者证明门禁贵精不贵多——两道门禁覆盖了「编译干净」与「能启动」这两个最大风险面。

## 8. 常见陷阱

- **红着 merge**：管理员权限绕过门禁救急一次，标准就永远回不去了。
  救急应走「回滚代码」而不是「跳过检查」。
- **门禁全红常态化**：阈值一步到位设 90%，全员习惯性无视。从现状出发
  设「新增代码」阈值，逐步收紧。
- **覆盖率指标博弈**：为达标写无断言测试。用变异测试抽查或评审把关。
- **慢门禁**：不并行、不缓存依赖、全量 E2E 每 PR 都跑，反馈时间超过
  15 分钟后开发者开始攒大 PR，恶性循环。用分片并行（sharding）、结果
  缓存、受影响测试选择（如 `pytest-testmon`、Nx affected）提速。
- **安全扫描只放报告不设门禁**：critical 漏洞照常上线。扫描进流水线必须配门禁硬卡 no-critical。
- **E2E 放流水线最前面**：反馈慢、随机失败阻塞全员。金字塔分层，快的在前。
- **专项测试人肉跑**：发布前才发现、经常跳过。挂 CI/定时任务，制度化。

## 动手实践

**任务**：给一个小项目（课程作业、个人项目皆可）搭一条最小可用的 CI 测试流水线。

提示：
- 第一步只挂「单元测试 + 一道静态检查」，全绿后再加第二道；
- 每道检查都要回答「它失败时阻不阻塞合并」——不阻塞的检查不叫门禁；
- 用第 7 节两个真实项目的思路检查自己：你的项目里「资源/配置」类风险有没有对应门禁？

参考实现（先自己写，再对照）：

```yaml
# .github/workflows/ci.yml 最小门禁
name: CI
on: [push, pull_request]

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements.txt
      - run: ruff check src/           # 第 1 道门禁：静态检查，秒级
      - run: pytest tests/ -q          # 第 2 道门禁：单元测试
      # 两步任一非零退出码，job 失败，PR 无法合并（分支保护里设 require status checks）
```

对照要点：`on: [push, pull_request]` 让同一份脚本在本地提交与 PR 双向生效；分支保护的 `require status checks` 才是门禁的「锁」——没有它，红了的检查照样能合并，流水线只是装饰。

## 自检

1. 门禁分层的原则是什么？为什么 E2E 不能放第一个 job？
2. 覆盖率门禁为什么「卡新增、不卡存量」？一刀切 80% 会发生什么？
3. 质量门禁和安全扫描报告的区别是什么？为什么前者才是「内建」？
4. speed-rouge 与 flower-card 两个门禁链样本，各自体现了什么门禁设计取舍？

## 练习

1. 给自己的项目搭「动手实践」一节的最小门禁，然后故意提交一个 `ruff` 会报错的文件，验证 PR 确实被拦。
2. 把一条耗时最长的测试链路用 `needs` 拆成两段并行 job，记录提速前后的流水线总时长。
3. 对照第 7 节的成熟度表给自己团队定级，并列出升到下一级需要补的三件事。

## 小结

- 初学者要点：门禁 = 机器强制的质量标准；分层排列（快检查在前）；
  覆盖率卡新增代码；失败必须修复或回滚，不允许静默重跑。
- 进阶注意：flaky 治理决定门禁可信度，隔离区机制比无限重试健康；
  变异测试（PIT/Stryker）检验测试有效性，适合定时任务；性能与安全
  检查同样是门禁的一等公民；门禁内容跟着项目风险走——游戏工程里
  资源与画面证据同样是门禁（见《资源审计与截图回归》）。
