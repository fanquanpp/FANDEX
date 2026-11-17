---
order: 180
title: Jenkins Pipeline
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: Jenkins 声明式 Pipeline 速查：agent、stages、environment、credentials 与 post。
author: fanquanpp
updated: '2026-11-17'
related: []
prerequisites: []
---

## 先立骨架：Jenkinsfile 的心智模型

为什么要用 Pipeline 而不是在 Jenkins 网页上点配置？因为流水线一旦写成 `Jenkinsfile` 进 Git，它就获得了与代码同等的待遇：**可评审（改流水线要过 PR）、可重放（任何历史版本都能重跑）、可追溯（谁改的、为什么改，git log 说了算）**。网页配置做不到这三条，这也是"Pipeline as Code"成为 Jenkins 事实标准的原因。

声明式 Pipeline 的骨架只有六块，读任何 Jenkinsfile 都按这个地图走：

```text
pipeline {
  agent         在哪跑（节点/容器）
  environment   环境变量与凭据注入
  parameters    构建参数（手动触发时可输入）
  triggers      自动触发（cron/上游）
  stages        做什么（有序阶段 → 步骤，可 when 条件、可 parallel 并行）
  post          结束后做什么（成功/失败通知、清理、归档）
}
```

结构化心智：`stages` 是**主路**（业务步骤按失败代价排序），`post` 是** 无论成败都走的地毯**（通知与清理最该写在这里而不是最后一个 stage），`when`/`parallel` 是主路上的**岔口**。本篇按指令逐个给写法；概念与选型对比（Jenkins 与托管 CI 的取舍）见 [CI/CD 流水线](/devops/140-CICDPipeline)。版本现状（2026-11）：Jenkins 2.5xx LTS 为当前线（每 12 周一个 LTS，4 周一个补丁），声明式 Pipeline 语法多年稳定，本篇写法长期适用。

## pipeline 声明式流水线

**基本写法：定义声明式 pipeline**
```groovy
`pipeline {
    agent any
    stages {
        stage('<阶段名>') {
            steps {
                <步骤>
            }
        }
    }
}`
```
```groovy
// 基本声明式流水线
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
                sh 'make build'
            }
        }
    }
}
```

---

## agent 代理配置

**基本写法：使用任意节点**
`agent any`
```groovy
// 在任意可用节点执行
pipeline {
    agent any
}
```

**基本写法：使用指定标签节点**
`agent { label '<标签>' }`
```groovy
// 在带 docker 标签的节点执行
pipeline {
    agent { label 'docker' }
}
```

**基本写法：使用 Docker 镜像**
`agent { docker { image '<镜像>' } }`
```groovy
// 在 maven 容器中执行（3.8-openjdk-11 等旧镜像标签已下线，用 Temurin 标签）
pipeline {
    agent { docker { image 'maven:3.9-eclipse-temurin-17' } }
}
```

**基本写法：不分配节点**
`agent none`
```groovy
// 不分配节点，由各 stage 指定
pipeline {
    agent none
    stages {
        stage('Build') {
            agent { label 'build' }
            steps { sh 'make build' }
        }
    }
}
```

---

## environment 环境变量

**基本写法：定义环境变量**
```groovy
`environment {
    <变量名> = '<值>'
}`
```
```groovy
// 定义构建环境变量
pipeline {
    agent any
    environment {
        VERSION = '1.0.0'
        BUILD_ENV = 'production'
    }
    stages {
        stage('Build') {
            steps {
                echo "Building version ${VERSION}"
            }
        }
    }
}
```

**基本写法：使用 credentials**
```groovy
`environment {
    <变量> = credentials('<凭据ID>')
}`
```
```groovy
// 使用 Jenkins 存储的凭据
pipeline {
    agent any
    environment {
        DOCKER_PASSWORD = credentials('docker-hub-credentials')
    }
}
```

---

## stages 阶段定义

**基本写法：定义多个阶段**
```groovy
`stages {
    stage('<阶段1>') { steps { ... } }
    stage('<阶段2>') { steps { ... } }
}`
```
```groovy
// 完整的 CI/CD 阶段
pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Build') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
        stage('Deploy') {
            steps {
                sh 'kubectl apply -f k8s/'
            }
        }
    }
}
```

---

## steps 步骤

**基本写法：执行 shell 命令**
`sh '<命令>'`
```groovy
// 执行 shell 命令
steps {
    sh 'echo hello'
    sh 'make build'
}
```

**基本写法：执行脚本并获取结果**
`sh script: '<命令>', returnStdout: true`
```groovy
// 获取命令输出
steps {
    script {
        def version = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        echo "Commit: ${version}"
    }
}
```

**基本写法：打印消息**
`echo '<消息>'`
```groovy
// 打印消息
steps {
    echo 'Starting build process'
}
```

---

## when 条件执行

**基本写法：分支条件**
```groovy
`when {
    branch '<分支名>'
}`
```
```groovy
// 只在 main 分支执行部署
stage('Deploy') {
    when {
        branch 'main'
    }
    steps {
        sh 'kubectl apply -f k8s/'
    }
}
```

**基本写法：表达式条件**
```groovy
`when {
    expression { <条件> }
}`
```
```groovy
// 满足条件时执行
stage('Deploy') {
    when {
        expression { env.BRANCH_NAME == 'main' && params.DEPLOY == true }
    }
    steps {
        sh 'deploy.sh'
    }
}
```

**基本写法：环境变量条件**
```groovy
`when {
    environment name: '<变量>', value: '<值>'
}`
```
```groovy
// 根据 DEPLOY_TO 变量执行
stage('Deploy Prod') {
    when {
        environment name: 'DEPLOY_TO', value: 'production'
    }
    steps {
        sh 'deploy-prod.sh'
    }
}
```

---

## post 构建后操作

**基本写法：成功后操作**
```groovy
`post {
    success { <步骤> }
}`
```
```groovy
// 构建成功后通知
pipeline {
    agent any
    stages { /* ... */ }
    post {
        success {
            echo 'Build succeeded!'
            sh 'curl -X POST https://hooks.slack.com/...'
        }
    }
}
```

**基本写法：失败后操作**
```groovy
`post {
    failure { <步骤> }
}`
```
```groovy
// 构建失败后通知
post {
    failure {
        echo 'Build failed!'
        emailext to: 'team@example.com', subject: 'Build Failed', body: 'Check logs'
    }
}
```

**基本写法：总是执行**
```groovy
`post {
    always { <步骤> }
}`
```
```groovy
// 无论成功失败都清理
post {
    always {
        sh 'docker system prune -f'
        cleanWs()
    }
}
```

---

## parameters 参数化构建

**基本写法：字符串参数**
```groovy
`parameters {
    string(name: '<名称>', defaultValue: '<默认值>', description: '<描述>')
}`
```
```groovy
// 定义字符串参数
pipeline {
    agent any
    parameters {
        string(name: 'BRANCH', defaultValue: 'main', description: '构建分支')
    }
    stages {
        stage('Build') {
            steps {
                git branch: params.BRANCH, url: 'https://github.com/repo.git'
            }
        }
    }
}
```

**基本写法：布尔参数**
```groovy
`parameters {
    booleanParam(name: '<名称>', defaultValue: <布尔值>, description: '<描述>')
}`
```
```groovy
// 定义部署开关
parameters {
    booleanParam(name: 'DEPLOY', defaultValue: false, description: '是否部署')
}
```

**基本写法：选项参数**
```groovy
`parameters {
    choice(name: '<名称>', choices: ['<选项1>', '<选项2>'], description: '<描述>')
}`
```
```groovy
// 定义环境选择
parameters {
    choice(name: 'ENV', choices: ['dev', 'staging', 'prod'], description: '部署环境')
}
```

---

## script 脚本块

**基本写法：执行 Groovy 脚本**
```groovy
`script {
    <Groovy 代码>
}`
```
```groovy
// 在 pipeline 中执行 Groovy
steps {
    script {
        def servers = ['server1', 'server2', 'server3']
        for (server in servers) {
            sh "ssh ${server} 'deploy.sh'"
        }
    }
}
```

---

## 并行执行

**基本写法：并行阶段**
```groovy
`parallel {
    stage('<阶段1>') { steps { ... } }
    stage('<阶段2>') { steps { ... } }
}`
```
```groovy
// 并行执行测试
stage('Test') {
    parallel {
        stage('Unit Test') {
            steps {
                sh 'npm run test:unit'
            }
        }
        stage('Integration Test') {
            steps {
                sh 'npm run test:integration'
            }
        }
    }
}
```

---

## artifacts 归档

**基本写法：归档构建产物**
`archiveArtifacts '<路径>'`
```groovy
// 归档构建产物
steps {
    sh 'make build'
    archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
}
```

**基本写法：归档测试报告**
`junit '<报告路径>'`
```groovy
// 归档 JUnit 测试报告
steps {
    sh 'npm test'
    junit 'reports/**/*.xml'
}
```

---

## 触发器

**基本写法：定时触发**
```groovy
`triggers {
    cron('<Cron 表达式>')
}`
```
```groovy
// 每天凌晨 2 点构建
pipeline {
    agent any
    triggers {
        cron('H 2 * * *')
    }
    stages { /* ... */ }
}
```

**基本写法：上游触发**
```groovy
`triggers {
    upstream(upstreamProjects: '<项目>', threshold: hudson.model.Result.SUCCESS)
}`
```
```groovy
// 上游项目成功后触发
triggers {
    upstream(upstreamProjects: 'my-app-build', threshold: hudson.model.Result.SUCCESS)
}
```

## 自检

- 遮住骨架图，默写声明式 pipeline 六大块及各自职责：agent/environment/parameters/triggers/stages/post——哪块是"无论成败都走的地毯"？
- 凭据注入怎么写：遮住 environment 的 credentials 示例，说出 `credentials('db-password')` 与直接写密码的区别、变量在日志里会不会被打码。
- when 与 parallel 各解决什么问题？给"master 分支才部署 + 单测/集测并行"写出 stage 骨架再对照。
- post 里 success/failure/always 三种条件各放什么？为什么清理逻辑不该放在最后一个 stage？
- 定时触发的 cron 写法为什么推荐 `H 2 * * *` 而不是 `0 2 * * *`？（提示：所有任务都在整点挤爆 Jenkins）
