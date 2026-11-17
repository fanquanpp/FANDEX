---
order: 190
title: GitLab CI/CD
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: GitLab CI/CD 作业配置速查：stages、rules、cache、artifacts、services 与 retry。
author: fanquanpp
updated: '2026-11-17'
related: []
prerequisites: []
---

## 先立骨架：GitLab CI 的心智模型

GitLab CI 的全部配置都在仓库根的 `.gitlab-ci.yml`：**每个作业（job）= 一台 runner 容器 + 一段 script**，同一 `stage` 的作业并行跑、不同 `stage` 按序跑，上一 stage 全绿才进下一 stage。心智地图按"四个问题"组织：

```text
跑什么？      script（+ before/after_script 包夹）
在哪跑？      image（作业容器）+ services（旁挂的 DB/Redis 等）
什么时候跑？  stages 决定顺序，rules 决定这个作业要不要进本次流水线
东西怎么传？  cache 是"给下次构建提速的依赖缓存"，artifacts 是"给下游作业
              与人取用的产物"——两者的生命周期与消费者完全不同
```

最易混的一组概念就是 cache 与 artifacts：cache 面向**速度**（node_modules 装得快），丢了能重建；artifacts 面向**传递**（build 出的 dist 要给 deploy 作业用），是流水线的"接力棒"。选型与流水线设计原则见 [CI/CD 流水线](/devops/140-CICDPipeline)；本篇按配置块逐个给写法。

## .gitlab-ci.yml 基本结构

**基本写法：定义流水线**
```yaml
`stages:
  - <阶段1>
  - <阶段2>
<作业名>:
  stage: <阶段>
  script:
    - <命令>`
```
```yaml
# 基本的 GitLab CI 流水线
stages:
  - build
  - test
  - deploy
build:
  stage: build
  script:
    - echo "Building the app"
    - make build
```

---

## image 镜像配置

**基本写法：全局镜像**
```yaml
`image: <镜像>`
```
```yaml
# 全局使用 node 镜像
image: node:22
stages:
  - build
build:
  stage: build
  script:
    - npm install
```

**基本写法：作业级镜像**
```yaml
`<作业名>:
  image: <镜像>
  script:
    - <命令>`
```
```yaml
# 不同作业使用不同镜像
build:
  image: maven:3.9-eclipse-temurin-17
  script:
    - mvn package
test:
  image: node:22
  script:
    - npm test
```

---

## stages 阶段定义

**基本写法：定义阶段顺序**
```yaml
`stages:
  - <阶段1>
  - <阶段2>
  - <阶段3>`
```
```yaml
# 定义完整的 CI/CD 阶段
stages:
  - build
  - test
  - deploy
  - cleanup
```

---

## script 执行命令

**基本写法：单行命令**
```yaml
`<作业名>:
  script:
    - <命令>`
```
```yaml
# 执行单条命令
build:
  script:
    - echo "Hello GitLab CI"
```

**基本写法：多行命令**
```yaml
`<作业名>:
  script:
    - <命令1>
    - <命令2>
    - <命令3>`
```
```yaml
# 执行多条命令
build:
  script:
    - npm install
    - npm run build
    - npm run test
```

**基本写法：多行脚本块**
```yaml
`<作业名>:
  script:
    - |
      <多行脚本>`
```
```yaml
# 使用多行脚本块
build:
  script:
    - |
      echo "Starting build"
      npm install
      npm run build
      echo "Build complete"
```

---

## before_script/after_script

**基本写法：全局前置脚本**
```yaml
`before_script:
  - <命令>`
```
```yaml
# 全局前置命令
before_script:
  - apt-get update -y
  - apt-get install -y curl
stages:
  - build
build:
  script:
    - make build
```

**基本写法：作业级前置脚本**
```yaml
`<作业名>:
  before_script:
    - <命令>
  script:
    - <命令>`
```
```yaml
test:
  before_script:
    - npm install
  script:
    - npm test
```

**基本写法：后置脚本**
```yaml
`after_script:
  - <命令>`
```
```yaml
# 全局后置命令
after_script:
  - echo "Pipeline finished"
  - docker system prune -f
```

---

## rules 规则控制

**基本写法：分支规则**
```yaml
`<作业名>:
  rules:
    - if: '$CI_COMMIT_BRANCH == "<分支>"'`
```
```yaml
# 只在 main 分支执行
# 注意：when 的合法值是 on_success/on_failure/always/never/manual/delayed，
# 不存在 when: on；规则省略 when 时默认 on_success
deploy:
  stage: deploy
  script:
    - kubectl apply -f k8s/
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

**基本写法：多条件规则**
```yaml
`<作业名>:
  rules:
    - if: '<条件1>'
    - if: '<条件2>'
      when: never`
```
```yaml
# 多条件控制
deploy:
  script:
    - deploy.sh
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: never
```

**基本写法：变更文件触发**
```yaml
`<作业名>:
  rules:
    - changes:
        - <文件路径>`
```
```yaml
# 文件变更时触发
build:
  script:
    - make build
  rules:
    - changes:
        - src/**/*
        - Dockerfile
```

---

## only/except 作业控制

> `only/except` 是旧版语法，GitLab 官方已用 `rules:`（见上节）取代它，
> 新流水线一律写 `rules:`；存量配置里见到时读懂即可，不要在新代码里用。

**基本写法：指定分支执行**
```yaml
`<作业名>:
  only:
    - <分支>`
```
```yaml
# 只在 main 分支执行
deploy:
  only:
    - main
  script:
    - deploy.sh
```

**基本写法：排除分支**
```yaml
`<作业名>:
  except:
    - <分支>`
```
```yaml
# 除 main 分支外都执行
test:
  except:
    - main
  script:
    - npm test
```

**基本写法：标签触发**
```yaml
`<作业名>:
  only:
    - tags`
```
```yaml
# 只在打标签时执行
release:
  only:
    - tags
  script:
    - publish.sh
```

---

## variables 变量

**基本写法：全局变量**
```yaml
`variables:
  <变量名>: "<值>"`
```
```yaml
# 定义全局变量
variables:
  IMAGE_NAME: "myapp"
  IMAGE_TAG: "latest"
build:
  script:
    - docker build -t $IMAGE_NAME:$IMAGE_TAG .
```

**基本写法：作业级变量**
```yaml
`<作业名>:
  variables:
    <变量名>: "<值>"`
```
```yaml
deploy_prod:
  variables:
    ENV: "production"
  script:
    - deploy.sh $ENV
```

---

## cache 缓存

**基本写法：缓存路径**
```yaml
`cache:
  paths:
    - <路径>`
```
```yaml
# 缓存 node_modules
cache:
  paths:
    - node_modules/
build:
  script:
    - npm install
    - npm run build
```

**基本写法：缓存键**
```yaml
`cache:
  key: <键>
  paths:
    - <路径>`
```
```yaml
# 按分支缓存
cache:
  key: $CI_COMMIT_REF_SLUG
  paths:
    - node_modules/
    - .npm/
```

**基本写法：缓存策略**
```yaml
`cache:
  paths:
    - <路径>
  policy: <策略>`
```
```yaml
# 拉取缓存但不更新
test:
  cache:
    paths:
      - node_modules/
    policy: pull
  script:
    - npm test
```

---

## artifacts 产物

**基本写法：归档产物**
```yaml
`<作业名>:
  artifacts:
    paths:
      - <路径>`
```
```yaml
# 归档构建产物
build:
  script:
    - make build
  artifacts:
    paths:
      - target/*.jar
```

**基本写法：设置产物过期时间**
```yaml
`<作业名>:
  artifacts:
    paths:
      - <路径>
    expire_in: <时间>`
```
```yaml
# 产物保留 1 周
build:
  artifacts:
    paths:
      - target/*.jar
    expire_in: 1 week
```

**基本写法：归档测试报告**
```yaml
`<作业名>:
  artifacts:
    reports:
      junit: <报告路径>`
```
```yaml
# 归档 JUnit 测试报告
test:
  artifacts:
    reports:
      junit: reports/**/*.xml
  script:
    - npm test
```

---

## environment 部署环境

**基本写法：定义环境**
```yaml
`<作业名>:
  environment:
    name: <环境名>`
```
```yaml
# 部署到生产环境
deploy_prod:
  stage: deploy
  environment:
    name: production
  script:
    - kubectl apply -f k8s/prod/
  only:
    - main
```

**基本写法：指定环境 URL**
```yaml
`<作业名>:
  environment:
    name: <环境名>
    url: <URL>`
```
```yaml
# 部署到 staging 环境并指定 URL
deploy_staging:
  environment:
    name: staging
    url: https://staging.example.com
  script:
    - deploy.sh staging
```

---

## services 服务

**基本写法：使用服务容器**
```yaml
`services:
  - <镜像>`
```
```yaml
# 使用 MySQL 服务
services:
  - mysql:8.0
variables:
  MYSQL_DATABASE: testdb
  MYSQL_ROOT_PASSWORD: secret
test:
  script:
    - npm test
```

**基本写法：给服务设置别名**
```yaml
`services:
  - name: <镜像>
    alias: <别名>`
```
```yaml
# 使用 redis 服务并设置别名
services:
  - name: redis:7
    alias: redis-cache
test:
  script:
    - REDIS_HOST=redis-cache npm test
```

---

## retry 重试

**基本写法：作业重试**
```yaml
`<作业名>:
  retry: <次数>`
```
```yaml
# 失败时重试 2 次
test:
  retry: 2
  script:
    - npm test
```

**基本写法：指定重试条件**
```yaml
`<作业名>:
  retry:
    max: <次数>
    when: <条件>`
```
```yaml
# 仅在 runner 失败时重试
deploy:
  retry:
    max: 2
    when: runner_system_failure
  script:
    - deploy.sh
```

## 自检

- 遮住骨架段，回答四问：跑什么、在哪跑、什么时候跑、东西怎么传——每问写出对应的关键字。
- cache 与 artifacts 的区别是本篇第一考点：面向速度还是传递？下游作业怎么拿到上游产物？`needs` 对取产物有什么影响（提前启动 + 精确依赖）？
- rules 与 only/except 谁是新写法？把 `only: [main]` 换算成 rules 的 if 表达式。
- services 解决什么问题：为什么集成测试要连数据库时用 services 而不是在 script 里手动起一个？（提示：作业生命周期与端口可达）
- retry 的 `when` 该怎么选：网络抖动用 `runner_system_failure`，测试失败该重试吗——为什么"测试红了重试"是坏味道？
