---
order: 150
title: CI/CD 流水线
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: 以 FANDEX 真实流水线为例学 CI/CD：GitHub Actions 触发器、作业与密钥、缓存与矩阵构建、发布策略与排错命令。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'devops/050-ContainerDocker'
  - 'devops/160-GitLabCI'
  - 'devops/150-JenkinsPipeline'
  - 'devops/190-GitOpsArgoCD'
  - 'software-testing/230-CICDTest'
prerequisites: []
---

前置知识：会用 Git 提交和推送；知道命令行怎么用。不需要先学 Docker 或 Kubernetes——
本文的例子全部只依赖 GitHub，浏览器加终端就能跑通。

读完本文你应当能够：说清 CI、持续交付、持续部署三个词的区别；从零写出一条
能跑的 GitHub Actions 流水线；看懂一条真实项目流水线里每一步在防什么事故；
根据团队情况选择发布策略。

## 1. 场景：一次 push 之后发生了什么

先看一个真实项目——就是你正在读的这个 FANDEX 仓库。它是一个文档站，
部署在 GitHub Pages 上。往 `main` 分支 push 一次改动，几分钟后线上站点
就更新了。中间没有任何人手动操作：没有人在自己电脑上 build，没有人用
FTP 传文件，没有人发"请部署"的群消息。

这背后是一条流水线，定义在仓库的 `.github/workflows/deploy.yml` 里。
我们一会儿逐段读它。先把抽象结论放在前面：

- **CI（持续集成）**：每次提交都自动构建 + 测试，尽早发现"我这能跑，合上去就坏"的问题。
- **持续交付（CD）**：在 CI 之上，把产物准备好、随时可以发布，但发布要人点一下。
- **持续部署（CD）**：连"点一下"都省了，通过全部检查就自动上生产。FANDEX 属于这种。

三者的分界线只有一条：**通往生产环境要不要人批准**。不要背定义，
记住这条线就够。

## 2. 动手：先写一条最小的流水线

概念不重要，跑起来才算数。新建一个仓库（或用现有仓库），创建文件
`.github/workflows/ci.yml`，内容如下：

```yaml
name: CI

on:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

把这五个文件提交、push 到 GitHub，然后打开仓库的 Actions 标签页：
你会看到一个叫 "CI" 的运行记录，点进去能看到每个步骤的实时日志。

逐行拆解这个最小可用版本：

- `on: push: branches: [main]` 是**触发器**：什么事件启动流水线。
  常用的还有 `pull_request`（PR 时跑）、`workflow_dispatch`（手动按钮）、
  `schedule`（定时，写 cron 表达式）。
- `jobs` 下的每个键是一个**作业**，跑在一台全新的虚拟机（**runner**）上。
  `runs-on: ubuntu-latest` 指定操作系统。每个 job 默认拿到干净环境，
  所以第一件事几乎总是 checkout 代码。
- `steps` 是步骤序列。`uses:` 复用别人写好的动作（Action），
  `run:` 在 runner 的 shell 里执行命令。
- `actions/checkout@v7` 里的 `@v7` 是版本锁定。**永远锁 major 版本，
  绝不写 `@main`**——上游一个坏提交就会打穿你所有流水线，这是真实的
  供应链攻击路径。

现在你已经有一条流水线了。剩下的内容，都是在回答同一个问题：
**往这条骨架上加什么，才能让团队敢把自动部署的开关打开。**

## 3. 走读真实流水线：FANDEX 的 deploy.yml

下面这段是 FANDEX 真实配置的骨架（保留了关键行，略有精简）。
建议对照你手里仓库的 `.github/workflows/deploy.yml` 原文读。
它比上一节的最小版多出的每一块，都对应一类真实事故：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    paths:                      # 只监控和站点相关的路径
      - 'app-web/**'
      - 'cnt-content/**'
      - '.github/workflows/deploy.yml'
  pull_request:
    branches: [main]
    paths: [同上]
  workflow_dispatch:            # 留一个手动触发的口子

permissions:                    # 令牌最小权限：默认令牌本可写整个仓库
  contents: read
  pages: write
  id-token: write

concurrency:                    # 同一分支同时只跑一条，新PR顶掉旧PR
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  build:
    runs-on: ubuntu-24.04       # 锁定具体版本，避免 latest 突然换底
    timeout-minutes: 30         # 挂死的流水线最多烧 30 分钟
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0        # 完整历史，构建统计需要
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: '22'
          cache: pnpm           # 缓存依赖目录，装依赖从分钟级降到秒级
      - run: pnpm install --frozen-lockfile   # 锁文件不一致直接失败
      - run: pnpm --filter @fandex/web exec playwright install --with-deps chromium
      - run: pnpm -C app-web audit --prod --audit-level high  # 依赖漏洞卡点
      - run: pnpm --filter @fandex/web sync          # 补全内容 frontmatter
      - run: pnpm --filter @fandex/web exec node scripts/content-audit.mjs
      - run: pnpm typecheck
      - run: pnpm --filter @fandex/web lint
      - run: pnpm build:web     # 构建站点 + pagefind 生成搜索索引
      - run: pnpm --filter @fandex/web qa             # 构建后 QA 校验
      - uses: actions/upload-pages-artifact@v5
        with:
          path: app-web/dist

  deploy:
    needs: build                # build 成功才轮到 deploy
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    environment: github-pages   # 生产环境保护规则挂在这里
    steps:
      - uses: actions/deploy-pages@v5
```

一张表说明每块配置在防什么：

| 配置块                    | 防的事故                                             |
| :------------------------ | :--------------------------------------------------- |
| `paths` 过滤              | 改个 README 也全量构建，排队 20 分钟                 |
| `permissions` 最小权限    | 流水线被注入恶意步骤后拿到仓库写权限                 |
| `concurrency` 并发组      | PR 连推 5 次，5 条流水线互相抢部署、互相覆盖         |
| `timeout-minutes`         | 测试死循环挂住 runner，白烧计费分钟                  |
| `--frozen-lockfile`       | CI 里"顺手"升级了依赖，本地复现不出线上 bug          |
| `audit` 卡点              | 带高危漏洞的依赖悄悄进入生产                         |
| `needs: build`            | 构建失败照样部署，把半成品推上线                     |
| `environment`             | 任何人 push main 就直接发生产，无审批无回滚预案      |

注意 build 作业里步骤的**排列顺序**：快的、便宜的检查在前（sync、audit、
typecheck），最贵的构建和 QA 在最后。lint 三十秒失败和 build 十分钟后才失败，
浪费的等待时间完全不同。这叫**快速失败**，是流水线设计的头号原则。

## 4. 继续加料：缓存、矩阵与密钥

### 4.1 缓存：CI 速度的一半在装依赖

`setup-node` 的 `cache: pnpm` 一行，本质是把包管理器的全局缓存目录在
多次运行之间存取。没有缓存时每个 job 都从网上重新下载全部依赖。
换成 Maven 项目等价写法是：

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.m2/repository
    key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
    restore-keys: ${{ runner.os }}-maven-
```

自检方法：看 Actions 日志里安装依赖那步的耗时。缓存命中时应是秒级；
如果还是分钟级，多半是 key 没写对，每次都算 miss。

### 4.2 矩阵构建：一份配置测多个环境

库要同时支持 Node 22 和 24、三大操作系统时，不复制粘贴五个 job，
用 `strategy.matrix` 展开成多个组合：

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false        # 一个组合挂了，其余组合继续跑完
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: ['22', '24']
        include:              # 额外补一个组合：只在 ubuntu+24 出覆盖率
          - os: ubuntu-latest
            node-version: '24'
            coverage: true
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

`fail-fast: false` 值得强调：默认行为是一个组合失败立刻取消其余组合，
但调试时你通常想一次看到所有平台的失败，省得修一个跑一轮。

### 4.3 密钥：永远不进代码

数据库密码、云凭证放仓库的 Settings - Secrets and variables - Actions，
在 YAML 里用 `${{ secrets.XXX }}` 引用，日志里会自动打码：

```yaml
deploy:
  steps:
    - name: Deploy
      env:
        KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
      run: |
        echo "$KUBE_CONFIG" | base64 -d > kubeconfig
        kubectl --kubeconfig kubeconfig apply -f k8s/
```

更现代的做法是**短时凭证**：云厂商的 OIDC 集成让流水线临时换取一段
几分钟有效期的凭证，仓库里连长期密钥都不存。AWS 的写法：

```yaml
permissions:
  id-token: write   # 允许签发 OIDC 令牌
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v5
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions
      aws-region: us-east-1
```

密钥类事故几乎都源于同一个习惯——"先放代码里跑通再说"。反弹式教训：
一旦密钥进过一次 commit 历史，哪怕下个 commit 删掉也等于泄露
（历史还在），必须作废重发。

## 5. 三大工具怎么选

GitHub Actions、GitLab CI、Jenkins 都能搭出等价的流水线，差异在
托管程度和生态位置：

| 维度       | GitHub Actions          | GitLab CI              | Jenkins                  |
| :--------- | :---------------------- | :--------------------- | :----------------------- |
| 配置文件   | `.github/workflows/`    | `.gitlab-ci.yml`       | `Jenkinsfile`（Groovy）  |
| runner     | 官方托管，按分钟计费    | 官方托管或自建 runner  | 必须自建和维护           |
| 适合       | 代码在 GitHub 的团队    | 用 GitLab 全家桶的团队 | 深度定制、内网合规场景   |
| 心智负担   | 低                      | 低到中                 | 高（插件维护是长期成本） |

本模块另有三篇专文深入：GitLab CI 作业配置见《GitLab CI》、Jenkins 流水线
语法见《Jenkins Pipeline》、GitOps 部署见《GitOps 与 ArgoCD》。这里只补
GitLab 独有的一个概念——**runner 需要自己注册到项目**，CI 任务才有地方跑：

```bash
# 在自建机器上把 runner 注册给 GitLab 实例
gitlab-runner register \
  --url https://gitlab.com \
  --token $RUNNER_TOKEN \
  --executor docker \
  --docker-image alpine:latest

gitlab-runner list      # 列出已注册 runner
gitlab-runner verify    # 验证连接
gitlab-runner run       # 前台启动
```

选型建议就一句：**新项目无脑选代码托管平台自带的 CI**（GitHub 项目用
Actions，GitLab 项目用 GitLab CI），Jenkins 只在有存量系统或严格内网
要求时才引入。

## 6. 从"能部署"到"敢部署"：发布策略

流水线打通后，最后一公里是怎么把新版本放到生产而不出大事。四种主流策略：

| 策略     | 做法                       | 回滚速度 | 资源消耗 | 适用                   |
| :------- | :------------------------- | :------- | :------- | :--------------------- |
| 滚动更新 | 逐批替换旧实例             | 中       | 低       | 默认选择，K8s 原生支持 |
| 蓝绿发布 | 两套环境，流量一次性切换   | 快       | 双倍     | 需要秒级整体回滚       |
| 金丝雀   | 小比例流量给新版，逐步放量 | 快       | 中       | 用户量大、怕全局事故   |
| A/B 测试 | 按用户特征分流             | 快       | 高       | 产品实验而非发布       |

金丝雀的核心是**渐进放量 + 自动观察指标**。Kubernetes 上通常用 Argo Rollouts
声明放量节奏：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-rollout
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10      # 10% 流量到新版本
        - pause: { duration: 5m }
        - setWeight: 30
        - pause: { duration: 5m }
        - setWeight: 100
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

判断标准：**回滚多快、多疼**。滚动更新回滚要重新走一遍替换流程；
蓝绿把旧环境留着，切换回去是秒级；金丝雀出事只影响 10% 用户。
越靠后的策略工程成本越高，团队从滚动更新起步完全正常。

## 7. 坑点与自检

高频坑，按出现频率排序：

1. **第三步 Action 不锁版本**（`@main` 或不写版本）。上游一改，全公司的
   流水线同时坏。锁 major，升级靠主动改版本号。
2. **Secrets 打进日志**。在 `run` 里 `echo $MY_SECRET` 调试，值会出现在
   公开仓库的日志里。日志打码只对 `${{ secrets.* }}` 直接引用可靠，
   转存到文件再 cat 的花样不作保。
3. **PR 流水线绿了，合并后挂了**。PR 跑的是合并预览分支，`schedule`、
   缓存污染、环境差异都会让"合上去"那一次才是第一次真跑。关键检查
   在 main 上再跑一遍。
4. **缓存了不该缓存的**。把 `dist/` 这类构建产物也塞进依赖缓存，换了
   代码还在用旧产物。缓存 key 一定绑 lockfile 哈希，产物走 artifacts。
5. **流水线成功 = 部署成功？** `kubectl apply` 返回 0 只说明提交了声明，
   Pod 可能还在 CrashLoopBackOff。部署后必须跟等待与验证
   （`kubectl rollout status --timeout` 或 ArgoCD 的健康检查）。

流水线自检清单：

- [ ] 每个 Action 都锁了 major 版本
- [ ] 顶层声明了最小 `permissions`
- [ ] 装依赖步骤有缓存，且 key 绑定 lockfile
- [ ] 最便宜的检查排在最前（快速失败）
- [ ] 部署步骤有超时和部署后验证
- [ ] 任何一个密钥都没有出现在代码和历史中
- [ ] PR 与 push 的触发范围符合预期（用 paths 过滤过）

## 8. 练习

1. 给自己的任意仓库写一条最小 CI：push 时跑 lint 和测试。故意提交一个
   lint 错误，观察邮件与 Actions 页面的失败提示长什么样。
2. 把 FANDEX 的 `.github/workflows/deploy.yml` 完整读一遍，对照第 3 节的
   表格，找出本文没提到的配置块并查官方文档弄懂它。
3. 给第 2 节的流水线加矩阵构建（两个 Node 版本），再故意让其中一个版本
   失败，验证 `fail-fast` 两种取值的区别。
4. 用 `act`（本地跑 Actions 的开源工具）在自己机器上执行一个 job，
   观察它与真实 runner 的差异。

## 9. 下一步

- 测试怎么嵌进流水线、覆盖率卡点怎么做：见《CI/CD 测试门禁》（software-testing 模块）。
- 部署清单交给 Git 管理、集群自动对齐：见《GitOps 与 ArgoCD》《ArgoCD 实战》。
- 流水线产物是镜像时的安全检查：见《容器安全》。
- 部署之后怎么知道服务还好不好：见《监控与可观测性》。

## 附录 A：流水线排错命令速查

```bash
# GitHub Actions 日志与跟踪
gh run list                          # 列出最近的运行
gh run view <run-id> --log           # 看某次运行的完整日志
gh run watch <run-id>                # 实时跟踪运行进度

# GitLab 流水线
glab ci trace <job-id>               # 实时跟踪 job 日志
gitlab-ci-lint .gitlab-ci.yml        # 仅做 YAML 语法校验

# 本地复现流水线
act -j build                         # 用 act 本地跑 GitHub Actions 的 build job
act push -j build -v                 # 指定 push 事件并输出详细日志
gitlab-ci-local build                # GitLab 流水线本地执行
                                     # （gitlab-runner exec 已在 Runner 14 移除）

# 构建环境自查
env | grep -E 'CI_|GITHUB_'          # 查看 CI 注入的环境变量
du -sh dist/ target/                 # 检查构建产物大小是否异常
```

## 附录 B：制品与通知速查

镜像怎么构建推送见《Docker 容器入门》，镜像仓库与 Harbor 见
cloud-computing 模块《Harbor 镜像仓库》。这里收录流水线周边的零散命令：

```bash
# 镜像签名：证明"这个镜像是我的流水线构建的"（供应链加固）
cosign sign --key cosign.key myapp:latest

# 多平台构建并推送（buildx）
docker buildx build --platform linux/amd64,linux/arm64 \
  -t myapp:latest --push .

# Nexus：上传 Maven / npm / PyPI 制品
curl -u admin:pass --upload-file target/app-1.0.jar \
  "http://nexus:8081/repository/maven-releases/com/example/app/1.0/app-1.0.jar"
npm publish --registry http://nexus:8081/repository/npm-private/
twine upload --repository-url http://nexus:8081/repository/pypi-hosted/ dist/*.whl

# JFrog Artifactory 上传/下载与制品晋升
jfrog rt upload target/app.jar maven-releases/com/example/app/1.0/
jfrog rt download maven-releases/com/example/app/1.0/app.jar
jfrog rt move maven-snapshots maven-releases --props="version=1.0.0"
```

```bash
# 钉钉机器人：流水线结束推通知（企业微信同理，换 webhook 地址与字段名）
curl -X POST 'https://oapi.dingtalk.com/robot/send?access_token=xxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "msgtype": "markdown",
    "markdown": {
      "title": "构建通知",
      "text": "## 构建成功\n项目: '"$CI_PROJECT_NAME"'\n[查看详情]('"$CI_PIPELINE_URL"')"
    }
  }'
```
