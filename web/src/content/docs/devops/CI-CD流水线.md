---
order: 5
title: 'CI/CD 流水线'
module: devops
category: 运维
difficulty: intermediate
description: 'CI/CD 原理、GitHub Actions、GitLab CI、Jenkins、ArgoCD 与发布策略。'
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/容器与Docker
  - devops/Kubernetes容器编排
  - devops/语法速查
  - devops/监控与可观测性
prerequisites: []
---

## 1. CI/CD 原理

### 1.1 核心概念

| 概念               | 描述                   | 目标           |
| :----------------- | :--------------------- | :------------- |
| **CI（持续集成）** | 频繁合并代码并自动验证 | 尽早发现问题   |
| **CD（持续交付）** | 自动化部署到预生产环境 | 随时可发布     |
| **CD（持续部署）** | 自动化部署到生产环境   | 每次提交都发布 |

### 1.2 流水线阶段

```
代码提交 → 构建 → 单元测试 → 集成测试 → 安全扫描
    → 制品发布 → 部署预发 → 验收测试 → 部署生产
```

## 2. GitHub Actions

### 2.1 基础配置

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码检查
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  # 单元测试
  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # 构建镜像
  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=semver,pattern={{version}}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # 部署
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/web web=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
          kubectl rollout status deployment/web --timeout=300s
```

### 2.2 常用 Action

| Action                        | 用途         |
| :---------------------------- | :----------- |
| `actions/checkout@v4`         | 检出代码     |
| `actions/setup-node@v4`       | 配置 Node.js |
| `actions/setup-python@v5`     | 配置 Python  |
| `docker/build-push-action@v5` | 构建推送镜像 |
| `actions/cache@v4`            | 缓存依赖     |

## 3. GitLab CI

### 3.1 基础配置

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - build
  - deploy

variables:
  DOCKER_REGISTRY: registry.example.com
  APP_IMAGE: $DOCKER_REGISTRY/myapp

# 缓存配置
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

# 代码检查
lint:
  stage: lint
  image: node:20-alpine
  script:
    - npm ci
    - npm run lint
    - npm run typecheck
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

# 测试
test:
  stage: test
  image: node:20-alpine
  services:
    - postgres:16-alpine
  variables:
    POSTGRES_DB: testdb
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://test:test@postgres:5432/testdb
  script:
    - npm ci
    - npm test -- --coverage
  coverage: '/Statements\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

# 构建镜像
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - echo $CI_REGISTRY_PASSWORD | docker login -u $CI_REGISTRY_USER --password-stdin $CI_REGISTRY
  script:
    - docker build -t $APP_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker push $APP_IMAGE:$CI_COMMIT_SHORT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# 部署生产
deploy:production:
  stage: deploy
  image: bitnami/kubectl
  script:
    - kubectl config use-context production
    - kubectl set image deployment/web web=$APP_IMAGE:$CI_COMMIT_SHORT_SHA
    - kubectl rollout status deployment/web --timeout=300s
  environment:
    name: production
    url: https://example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  when: manual
```

## 4. Jenkins

### 4.1 Jenkinsfile

```groovy
// Jenkinsfile (Declarative Pipeline)
pipeline {
    agent any

    environment {
        REGISTRY = 'registry.example.com'
        IMAGE = "${REGISTRY}/myapp"
        TAG = "${env.BUILD_NUMBER}"
    }

    tools {
        nodejs 'Node20'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test -- --coverage'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                    publishHTML(target: [
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage'
                    ])
                }
            }
        }

        stage('Build') {
            steps {
                sh "docker build -t ${IMAGE}:${TAG} ."
                sh "docker push ${IMAGE}:${TAG}"
            }
        }

        stage('Deploy') {
            steps {
                input 'Deploy to production?'
                sh "kubectl set image deployment/web web=${IMAGE}:${TAG}"
                sh 'kubectl rollout status deployment/web --timeout=300s'
            }
        }
    }

    post {
        success {
            slackSend(color: 'good', message: "Build ${TAG} deployed successfully!")
        }
        failure {
            slackSend(color: 'danger', message: "Build ${TAG} failed!")
        }
        always {
            cleanWs()
        }
    }
}
```

## 5. ArgoCD

### 5.1 GitOps 模式

```
┌──────────┐    push    ┌──────────┐    sync    ┌──────────┐
│ 开发者    │ ────────→ │ Git 仓库  │ ←──────── │  ArgoCD  │
└──────────┘           └──────────┘           └──────────┘
                                                    │
                                              apply │
                                                    ↓
                                              ┌──────────┐
                                              │ Kubernetes│
                                              └──────────┘
```

### 5.2 ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/myapp-manifests.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## 6. 发布策略

### 6.1 蓝绿发布

```
┌──────────┐         ┌──────────┐
│ Blue (v1) │ ← 流量  │ Green(v2)│  无流量
│  当前版本  │         │  新版本   │
└──────────┘         └──────────┘
       ↓ 切换流量
┌──────────┐         ┌──────────┐
│ Blue (v1) │  无流量  │ Green(v2)│ ← 流量
│  旧版本   │         │  当前版本  │
└──────────┘         └──────────┘
```

```yaml
# 蓝绿发布 - ArgoCD + Service 切换
apiVersion: v1
kind: Service
metadata:
  name: web-active
spec:
  selector:
    app: web
    version: green # 切换时修改 blue/green
  ports:
    - port: 80
      targetPort: 8080
```

### 6.2 金丝雀发布

```yaml
# 使用 Argo Rollouts
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-rollout
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10 # 10% 流量到新版本
        - pause: { duration: 5m }
        - setWeight: 30 # 30% 流量
        - pause: { duration: 5m }
        - setWeight: 60 # 60% 流量
        - pause: { duration: 5m }
        - setWeight: 100 # 全量
      canaryService: web-canary
      stableService: web-stable
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: myapp:v2
```

### 6.3 发布策略对比

| 策略         | 回滚速度 | 风险 | 资源消耗  | 复杂度 |
| :----------- | :------- | :--- | :-------- | :----- |
| **滚动更新** | 中       | 中   | 低        | 低     |
| **蓝绿发布** | 快       | 低   | 高（2倍） | 中     |
| **金丝雀**   | 快       | 低   | 中        | 高     |
| **A/B 测试** | 快       | 低   | 高        | 高     |

## 7. 制品管理

### 7.1 制品仓库

| 仓库                  | 类型   | 特点                       |
| :-------------------- | :----- | :------------------------- |
| **Nexus**             | 通用   | 支持 Docker/NPM/Maven/PyPI |
| **Harbor**            | Docker | 企业级、漏洞扫描           |
| **JFrog Artifactory** | 通用   | 功能最全、商业产品         |
| **GitHub Packages**   | 通用   | 与 GitHub 集成             |

### 7.2 镜像标签策略

| 标签            | 用途      | 示例           |
| :-------------- | :-------- | :------------- |
| `latest`        | 最新版本  | 不推荐生产使用 |
| `sha-xxxxxx`    | Git SHA   | 精确追溯       |
| `v1.2.3`        | 语义版本  | 正式发布       |
| `main-20260614` | 分支+日期 | 持续部署       |

## 8. 流水线设计原则

### 8.1 最佳实践

| 原则           | 描述                              |
| :------------- | :-------------------------------- |
| **快速反馈**   | Lint 和单元测试先行，快速发现问题 |
| **并行执行**   | 独立任务并行运行，缩短总时间      |
| **缓存优化**   | 缓存依赖和构建产物                |
| **安全扫描**   | 集成 SAST/DAST/SCA                |
| **制品不可变** | 一次构建，多处部署                |
| **环境一致**   | 开发/测试/生产使用相同镜像        |
| **最小权限**   | CI/CD 凭证按需授权                |

### 8.2 流水线安全

```yaml
# GitHub Actions 安全实践
jobs:
  build:
    permissions:
      contents: read # 只读代码
      packages: write # 写入包
    steps:
      # 使用 OIDC 而非长期密钥
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions
          aws-region: us-east-1

      # 审计第三方 Action
      - uses: actions/checkout@v4 # 使用特定版本，不用 main
```

## 9. 小结

CI/CD 是 DevOps 的核心实践：

1. **GitHub Actions** 适合开源项目和 GitHub 生态
2. **GitLab CI** 适合自托管和完整 DevOps 平台
3. **Jenkins** 适合复杂的企业级流水线
4. **ArgoCD** 实现 GitOps，声明式管理 K8s 部署
5. **金丝雀发布**是生产环境推荐策略，渐进式降低风险
6. 流水线设计需关注**快速反馈、安全扫描和制品不可变性**
