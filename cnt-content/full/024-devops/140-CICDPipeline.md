---
order: 140
title: CI/CD 流水线
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: CI/CD 原理、GitHub Actions、GitLab CI、Jenkins、ArgoCD 与发布策略。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'devops/050-ContainerDocker'
  - 'devops/080-Kubernetes'
  - 'devops/240-MonitorAndObservability'
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
  NODE_VERSION: '22' # Node 20 已于 2026-04 EOL，CI 默认建议 22/24 LTS
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码检查
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v5
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
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v5
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v5
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
      - uses: actions/checkout@v6
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
            type=sha,format=long # sha-<完整 commit SHA>，与部署步骤一致
            type=ref,event=branch
            type=semver,pattern={{version}}
      - uses: docker/build-push-action@v6
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
      - uses: actions/checkout@v6
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/web web=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
          kubectl rollout status deployment/web --timeout=300s
```

### 2.2 常用 Action

| Action                        | 用途         |
| :---------------------------- | :----------- |
| `actions/checkout@v6`         | 检出代码     |
| `actions/setup-node@v5`       | 配置 Node.js |
| `actions/setup-python@v5`     | 配置 Python  |
| `actions/upload-artifact@v4`  | 上传制品     |
| `docker/build-push-action@v6` | 构建推送镜像 |
| `actions/cache@v4`            | 缓存依赖     |

> 版本说明（2026-09）：`actions/checkout` 已有 v7（2026-06 GA，默认拒绝在
> `pull_request_target` 中检出不可信 fork 代码，防供应链攻击），v6 仍受支持；
> 官方 Action 运行时已全面迁至 Node 24（自 2026-06 起 runner 默认以 Node 24
> 执行 Action），引用旧 major（v4 及以下）会收到弃用警告。

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
  image: node:22-alpine
  script:
    - npm ci
    - npm run lint
    - npm run typecheck
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

# 测试
test:
  stage: test
  image: node:22-alpine
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
  image: docker:28 # Docker Engine 28（BuildKit 已是默认构建器）
  services:
    - docker:28-dind
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

```mermaid
flowchart LR
    D[开发者] -->|push| G[Git 仓库]
    A[ArgoCD] <-->|sync| G
    A -->|apply| K[Kubernetes]
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

```mermaid
flowchart LR
    subgraph 切换前
        B1[Blue v1 当前版本<br/>承接全部流量]
        G1[Green v2 新版本<br/>无流量，先验证]
    end
    subgraph 切换后
        B2[Blue v1 待命<br/>随时回滚]
        G2[Green v2 当前版本<br/>承接全部流量]
    end
    B1 -->|负载均衡一次切流| G2
    B1 -.回滚.-> B2
    G1 --> B1 -.->|原状态| G2
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
      - uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions
          aws-region: us-east-1

      # 审计第三方 Action
      - uses: actions/checkout@v6 # 锁定 major 版本（v7 默认拒绝 pull_request_target 检出不可信 fork），绝不使用 @main
```

## 9. 小结

CI/CD 是 DevOps 的核心实践：

1. **GitHub Actions** 适合开源项目和 GitHub 生态
2. **GitLab CI** 适合自托管和完整 DevOps 平台
3. **Jenkins** 适合复杂的企业级流水线
4. **ArgoCD** 实现 GitOps，声明式管理 K8s 部署
5. **金丝雀发布**是生产环境推荐策略，渐进式降低风险
6. 流水线设计需关注**快速反馈、安全扫描和制品不可变性**
## GitLab CI/CD

**基本用法:配置文件结构**
`.gitlab-ci.yml`

```yaml
# .gitlab-ci.yml GitLab CI 基础配置
stages:
  - build
  - test
  - deploy

variables:
  IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

build:
  stage: build
  image: docker:28
  services:
  - docker:28-dind
  script:
  - docker build -t $IMAGE .
  - docker push $IMAGE
  only:
  - main

test:
  stage: test
  image: node:22
  script:
  - npm ci
  - npm test
  artifacts:
    reports:
      junit: test-results.xml

deploy:
  stage: deploy
  script:
  - kubectl apply -f k8s/
  only:
  - main
  when: manual
```

---

**基本用法:常用命令**
`gitlab-runner register|list|verify|run`

```bash
# 注册 Runner
gitlab-runner register \
  --url https://gitlab.com \
  --token $RUNNER_TOKEN \
  --executor docker \
  --docker-image alpine:latest

# 列出已注册 Runner
gitlab-runner list

# 验证 Runner 连接
gitlab-runner verify

# 启动 Runner
gitlab-runner run

# 注意：gitlab-runner exec 已在 Runner 14+ 移除，本地调试改用
# gitlab-ci-local 或直接推分支验证
```

---

**基本用法:条件与规则**
`rules / only / except`

```yaml
# rules 现代条件控制
build:
  stage: build
  script: make build
  rules:
  - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    when: never
  - if: $CI_COMMIT_BRANCH == "main"
    changes:
    - src/**
    - Dockerfile
  - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/

# only/except 传统写法
deploy:
  script: deploy.sh
  only:
  - main
  - tags
  except:
  - branches
```

---

**基本用法:artifacts 与 cache**
`artifacts / cache`

```yaml
build:
  script: make build
  artifacts:
    paths:
    - bin/
    - dist/
    expire_in: 1 week
    reports:
      dotenv: build.env
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

test:
  script: npm test
  cache:
    key:
      files:
      - package-lock.json
    paths:
    - node_modules/
    policy: pull-push
```

---

## GitHub Actions

**基本用法:Workflow 配置**
`.github/workflows/ci.yml`

```yaml
# .github/workflows/ci.yml GitHub Actions 基础
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v5
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - run: npm test
    - run: npm run build
```

---

**基本用法:常用 actions**
`uses: <动作>@<版本>`

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v6
      with:
        fetch-depth: 0

    - uses: actions/setup-java@v5
      with:
        java-version: '21'
        distribution: 'temurin'
        cache: maven

    - uses: docker/setup-buildx-action@v3
    - uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - uses: docker/build-push-action@v6
      with:
        context: .
        push: true
        tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
```

---

**基本用法:环境变量与密钥**
`env / secrets`

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      APP_ENV: production
      REGISTRY: ghcr.io
    steps:
    - uses: actions/checkout@v6
    - name: Deploy
      env:
        KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
        DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
      run: |
        echo "$KUBE_CONFIG" | base64 -d > kubeconfig
        kubectl --kubeconfig kubeconfig apply -f k8s/

    - uses: aws-actions/configure-aws-credentials@v5
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
```

---

**基本用法:矩阵构建**
`strategy.matrix`

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: ['22', '24']
        include:
        - os: ubuntu-latest
          node-version: '24'
          coverage: true
    steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v5
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm ci
    - run: npm test
```

---

## Jenkins Pipeline

**基本用法:声明式 Pipeline**
`Jenkinsfile`

```groovy
// Jenkinsfile 声明式 Pipeline
pipeline {
    agent any
    environment {
        IMAGE = "registry.example.com/myapp:${env.BUILD_NUMBER}"
        DOCKER_CREDENTIALS = credentials('docker-registry')
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Build') {
            steps {
                sh 'docker build -t $IMAGE .'
            }
        }
        stage('Test') {
            steps {
                sh 'npm test'
            }
            post {
                always {
                    junit 'test-results.xml'
                    publishHTML([
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh 'docker push $IMAGE'
                sh 'kubectl apply -f k8s/'
            }
        }
    }
    post {
        success {
            slackSend channel: '#deploy', message: "Build ${env.BUILD_NUMBER} succeeded"
        }
        failure {
            slackSend channel: '#alerts', message: "Build ${env.BUILD_NUMBER} failed"
        }
    }
}
```

---

**基本用法:脚本式 Pipeline**
`node { stage('...') { ... } }`

```groovy
// 脚本式 Pipeline
node('docker') {
    stage('Checkout') {
        git 'https://github.com/org/repo.git'
    }

    stage('Build') {
        def image = docker.build('myapp:latest')
        image.inside {
            sh 'make build'
        }
    }

    stage('Test') {
        try {
            sh 'make test'
        } catch (Exception e) {
            currentBuild.result = 'UNSTABLE'
            emailext subject: 'Tests failed',
                     body: 'Tests failed in build ${BUILD_NUMBER}',
                     to: 'team@example.com'
        }
    }

    stage('Deploy') {
        if (env.BRANCH_NAME == 'main') {
            sh 'make deploy'
        } else {
            echo "Skip deploy for branch ${env.BRANCH_NAME}"
        }
    }
}
```

---

**基本用法:Jenkins CLI**
`java -jar jenkins-cli.jar`

```bash
# 下载 CLI jar
wget http://jenkins:8080/jnlpJars/jenkins-cli.jar

# 列出 jobs
java -jar jenkins-cli.jar -s http://jenkins:8080 list-jobs

# 触发构建
java -jar jenkins-cli.jar -s http://jenkins:8080 build my-app

# 触发构建(带参数)
java -jar jenkins-cli.jar -s http://jenkins:8080 build my-app -p BRANCH=develop

# 查看构建日志
java -jar jenkins-cli.jar -s http://jenkins:8080 console my-app 123

# 重新加载配置
java -jar jenkins-cli.jar -s http://jenkins:8080 reload-configuration
```

---

## 通用工具命令

**基本用法:Docker 构建**
`docker build [选项] <上下文>`

```bash
# 基本构建
docker build -t myapp:latest .

# 指定 Dockerfile
docker build -f Dockerfile.prod -t myapp:prod .

# 构建并打多标签
docker build -t myapp:latest -t myapp:v1.0 .

# 使用构建参数
docker build --build-arg VERSION=1.0 -t myapp:1.0 .

# 使用 BuildKit
DOCKER_BUILDKIT=1 docker build -t myapp:latest .

# 构建后扫描漏洞
docker build -t myapp:latest .
docker scout cves myapp:latest
```

---

**基本用法:镜像推送**
`docker push <镜像>`

```bash
# 登录仓库（-p 明文密码已被 CLI 弃用，生产用 --password-stdin 或凭证助手）
docker login registry.example.com -u user --password-stdin <<< "$REGISTRY_PASSWORD"

# 推送镜像
docker push myapp:latest

# 推送所有标签
docker push --all-tags myapp

# 推送后签名(cosign)
cosign sign --key cosign.key myapp:latest

# 推送多平台镜像
docker buildx build --platform linux/amd64,linux/arm64 \
  -t myapp:latest --push .
```

---

**基本用法:Kubernetes 部署**
`kubectl apply -f <清单>`

```bash
# 部署 YAML 清单
kubectl apply -f k8s/deployment.yaml -n production

# 部署整个目录
kubectl apply -f k8s/ -n production

# 从 Kustomize 部署
kubectl apply -k k8s/overlays/production

# 滚动重启
kubectl rollout restart deployment web -n production

# 等待部署完成
kubectl rollout status deployment web -n production --timeout=5m
```

---

## Helm 部署

**基本用法:CI/CD 中使用 Helm**
`helm upgrade --install <release> <chart>`

```bash
# 部署/升级 Helm Chart
helm upgrade --install myapp ./chart \
  -f values-production.yaml \
  --namespace production --create-namespace \
  --wait --timeout 5m

# 使用原子部署(失败自动回滚)
helm upgrade --install myapp ./chart \
  -f values-production.yaml \
  --namespace production \
  --atomic --wait

# 查看部署差异
helm diff upgrade myapp ./chart -f values-production.yaml

# 部署前 dry-run
helm upgrade --install myapp ./chart \
  -f values-production.yaml \
  --dry-run --debug
```

---

## 制品仓库管理

**基本用法:Nexus 制品仓库**
`curl -u <用户>:<密码> <仓库>/...`

```bash
# 上传 Docker 镜像
docker push nexus.example.com:8082/myapp:v1

# 上传 Maven 制品
curl -u admin:pass --upload-file target/app-1.0.jar \
  "http://nexus:8081/repository/maven-releases/com/example/app/1.0/app-1.0.jar"

# 上传 npm 包
npm publish --registry http://nexus:8081/repository/npm-private/

# 上传 PyPI 包
twine upload --repository-url http://nexus:8081/repository/pypi-hosted/ \
  dist/*.whl -u admin -p pass
```

---

**基本用法:JFrog Artifactory**
`jfrog rt upload|download`

```bash
# 上传制品
jfrog rt upload target/app.jar maven-releases/com/example/app/1.0/

# 下载制品
jfrog rt download maven-releases/com/example/app/1.0/app.jar

# 推送 Docker 镜像
docker push artifactory.example.com/docker/myapp:v1

# 提升制品(晋升)
jfrog rt move maven-snapshots maven-releases \
  --props="version=1.0.0"
```

---

## 通知与集成

**基本用法:Slack 通知**
`curl -X POST <webhook-url> -d '<json>'`

```bash
# 发送 Slack 通知
curl -X POST -H 'Content-Type: application/json' \
  https://hooks.slack.com/services/xxx \
  -d '{
    "text": "Build '"$CI_PIPELINE_ID"' succeeded",
    "channel": "#deploy",
    "attachments": [{
      "color": "good",
      "fields": [
        {"title": "Repository", "value": "'"$CI_PROJECT_NAME"'"},
        {"title": "Branch", "value": "'"$CI_COMMIT_BRANCH"'"}
      ]
    }]
  }'
```

---

**基本用法:钉钉/企业微信通知**
`curl -X POST <webhook-url>`

```bash
# 钉钉机器人通知
curl -X POST 'https://oapi.dingtalk.com/robot/send?access_token=xxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "msgtype": "markdown",
    "markdown": {
      "title": "构建通知",
      "text": "## 构建成功\n项目: '"$CI_PROJECT_NAME"'\n分支: '"$CI_COMMIT_BRANCH"'\n[查看详情]('"$CI_PIPELINE_URL"')"
    }
  }'

# 企业微信通知
curl -X POST 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "msgtype": "markdown",
    "markdown": {
      "content": "## 构建成功\n> 项目: '"$CI_PROJECT_NAME"'\n> 分支: '"$CI_COMMIT_BRANCH"'"
    }
  }'
```

---

## 安全扫描

**基本用法:Trivy 漏洞扫描**
`trivy image <镜像>`

```bash
# 扫描镜像漏洞
trivy image myapp:latest

# 扫描指定严重级别
trivy image --severity HIGH,CRITICAL myapp:latest

# 输出 JSON 格式
trivy image --format json --output report.json myapp:latest

# 扫描文件系统（新版用 --scanners，旧参数 --security-checks 已弃用）
trivy fs --scanners vuln,config .

# 扫描代码仓库
trivy repo https://github.com/org/repo
```

---

**基本用法:其他扫描工具**
`<工具> <参数>`

```bash
# Grype 漏洞扫描
grype myapp:latest

# Snyk 漏洞扫描
snyk container test myapp:latest

# Hadolint Dockerfile lint
hadolint Dockerfile

# kubeconform 校验 K8s 清单（kubeval 已停止维护，kubeconform 是社区继任者）
kubeconform -strict k8s/*.yaml

# conftest 策略检查
conftest test k8s/deployment.yaml -p policies/
```

---

## 缓存与优化

**基本用法:Docker 缓存**
`--cache-from / --cache-to`

```bash
# GitHub Actions 中使用缓存
docker buildx build \
  --cache-from type=gha \
  --cache-to type=gha,mode=max \
  -t myapp:latest .

# GitLab CI 中使用 registry 缓存
docker build \
  --cache-from $CI_REGISTRY_IMAGE:cache \
  -t $CI_REGISTRY_IMAGE:cache \
  -t $CI_REGISTRY_IMAGE:latest .

# 使用 BuildKit 缓存挂载
DOCKER_BUILDKIT=1 docker build \
  --build-arg BUILDKIT_CACHE_MOUNT_NS=app \
  -t myapp:latest .
```

---

**基本用法:依赖缓存**
`cache: <配置>`

```yaml
# GitLab CI npm 缓存
test:
  cache:
    key:
      files:
      - package-lock.json
    paths:
    - node_modules/
    - .npm/
  script:
  - npm ci --cache .npm --prefer-offline

# GitHub Actions 缓存
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'
- run: npm ci

# Maven 缓存
- uses: actions/cache@v4
  with:
    path: ~/.m2/repository
    key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
    restore-keys: ${{ runner.os }}-maven-
```

---

## 排查与调试

**基本用法:本地测试 Pipeline**
`act / gitlab-runner exec`

```bash
# 使用 act 本地运行 GitHub Actions
act -j build

# 指定 event
act push -j build

# 详细输出
act -j build -v

# GitLab 流水线本地执行（gitlab-runner exec 已移除，社区工具替代）
gitlab-ci-local build

# 仅做 YAML 语法校验
gitlab-ci-lint .gitlab-ci.yml
```

---

**基本用法:查看构建日志**
`<CI-CLI> logs <job>`

```bash
# GitLab 查看 job 日志
glab ci trace <job-id>

# GitHub Actions 日志
gh run view <run-id> --log

# Jenkins 构建日志
java -jar jenkins-cli.jar console my-app 123

# 实时跟踪日志
gh run watch <run-id>
```

---

**基本用法:排查构建失败**
`<检查步骤>`

```bash
# 进入 CI 容器调试
docker run -it --rm node:22 sh

# 重新运行 job 并保留容器
gitlab-runner exec docker build --docker-keep-cache

# 检查 CI 环境变量
env | grep -E 'CI_|GITHUB_'

# 检查 Docker 守护进程
docker info
docker system df

# 查看构建产物大小
du -sh target/ dist/
```
