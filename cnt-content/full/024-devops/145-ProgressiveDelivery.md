---
order: 170
title: 发布策略与渐进式交付
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: 部署不等于发布：滚动更新参数语义、蓝绿与金丝雀的取舍、指标驱动的自动回滚、特性开关与 expand-contract 数据库变更，附蓝绿切换动手实验。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'devops/140-CICDPipeline'
  - 'devops/130-ServiceMesh'
  - 'devops/310-OnCallPractice'
prerequisites:
  - 'devops/140-CICDPipeline'
---

## 场景：一次「成功」的全量发布

周五晚上发新版本：流水线全绿、构建成功、镜像推送、一次性替换全部 Pod。三十秒后错误率
从 0.1% 飙到 40%——新代码在一个小众的参数组合下崩溃，而它已经服务了所有用户。回滚
要重新走一遍构建和滚动替换，前后二十分钟，客服工单堆了两百张。

这次事故的教训可以压缩成一个判断：**发布的风险控制单元不该是「全部用户」，回滚的恢复
速度不该以分钟计**。渐进式交付（Progressive Delivery）就是围绕这两个判断发展出的一套
工程实践：把一次「全有或全无」的发布，拆成一串「小爆炸半径 + 可观测 + 可自动回退」的
小步发布。

## 心智模型：部署与发布是两件事

- **部署（deploy）**：新版本的二进制进入了生产环境；
- **发布（release）**：新版本开始承接用户流量。

滚动更新把两者捆死（部署完成即全量承接）；蓝绿用切换解耦；金丝雀用比例解耦；特性开关
解耦得最彻底——代码常驻生产，是否让用户看到由开关决定。**解耦程度越高，爆炸半径越小，
工程成本越高**。四种策略不是优劣关系，而是同一个旋钮的不同档位：

| 策略 | 部署与发布的关系 | 爆炸半径 | 回滚方式 | 成本 |
| --- | --- | --- | --- | --- |
| 滚动更新 | 捆绑 | 全量（分批过渡） | 反向滚动替换 | 低 |
| 蓝绿 | 切换瞬间解耦 | 全量但可秒回 | 切回旧环境 | 双倍资源 |
| 金丝雀 | 比例解耦 | 从 1% 起步 | 删掉新版本实例 | 中（需流量切分能力） |
| 特性开关 | 完全解耦 | 可精确到用户群 | 关开关，毫秒级 | 开关治理成本 |

## 滚动更新：默认档位的两个参数

Kubernetes Deployment 的滚动更新由两个参数控制节奏（既有 Deployment 语义，取整数或
百分比均可）：

```yaml
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%     # 更新过程中最多允许几个副本不可用
      maxSurge: 25%           # 更新过程中最多允许超出期望副本数几个
```

心智图：`maxSurge` 管「快」（允许多借多少资源并行建新），`maxUnavailable` 管「稳」
（允许服务容量最低掉到多少）。**但这两个参数有生效前提**：新 Pod 必须通过
readinessProbe 证明自己可用，控制器才会继续替换下一批。没有 readinessProbe 的滚动
更新是「盲滚」——新副本起来就算成功，起来但拒绝服务的 Pod 会持续承接流量，滚动更新
反而成了故障放大器。这是本篇所有策略的共同底座：**先有可信的健康信号，才谈得上渐进**。

## 蓝绿：用双倍资源换秒级回滚

蓝绿的结构：绿（当前生产）与蓝（新版）两套完整环境，流量由一个入口（Service、Ingress
或网关）指向其中一套。发布时蓝环境先完成部署与验证，然后入口一次性切到蓝：

```text
发布前：  用户 ──> Service ──> 绿 Pod（v1.2）
发布中：  蓝 Pod（v1.3）部署完成，冒烟验证
切换后：  用户 ──> Service ──> 蓝 Pod（v1.3）     绿保留，随时切回
```

Kubernetes 上的最小实现就是「两套 Deployment + 一个 Service 换 selector」：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    version: green        # 切换 = 把这一行改成 blue（kubectl patch 或改清单）
  ports:
    - port: 80
      targetPort: 8080
```

判断题：蓝绿适合什么场景？**回滚速度要求高于资源成本**的场景——结算入口、对外承诺
SLA 的核心 API。两个代价要诚实评估：资源双倍（哪怕只在发布窗口）；以及**数据库兼容
问题**——蓝绿切换的秒级回滚假设「新旧代码共享同一份状态」，一旦新版本带了不兼容的
schema 变更，切回绿环境一样跑不动。数据库变更的处理见第 7 节 expand-contract。

## 金丝雀：让 1% 的用户先替你踩雷

金丝雀的仪式感来自名字：矿井里金丝雀对毒气更敏感，先放下去探路。工程翻译：新版本先接
1% 流量，观察指标无异常再放到 10%、30%、100%：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web
spec:
  replicas: 10
  strategy:
    canary:
      canaryService: web-canary        # 指向新版本的 Service
      stableService: web-stable
      trafficRouting:
        nginx:
          stableIngress: web-ingress   # 由 Ingress 层做比例切分
      steps:
        - setWeight: 5
        - pause: { duration: 10m }     # 人工或指标把关的观察期
        - analysis:                    # 指标分析：不达标自动中止回滚
            templates:
              - templateName: error-rate-check
        - setWeight: 30
        - pause: { duration: 10m }
        - setWeight: 100
```

与滚动更新的本质区别在**观察与决策权**：滚动更新替换完上一批就开始下一批，金丝雀在
每个放量台阶上强制停下，用真实流量验证。真正的渐进式交付要求观察自动化——
AnalysisTemplate 把「看监控、人肉判断」变成声明式断言：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate-check
spec:
  metrics:
    - name: http-error-rate
      interval: 1m
      failureLimit: 2                 # 连续 2 次采样超标即失败
      successCondition: result[0] < 0.01
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{version="canary",code=~"5.."}[2m]))
            / sum(rate(http_requests_total{version="canary"}[2m]))
```

这套「放量台阶 + 指标断言 + 自动回滚」是金丝雀的全部精华，也是它与「手动分批发版」
的分界线。选型提醒：Argo Rollouts 与 FluxCD 的 Flagger 是这一层的两个主流实现；流量
切分也可以下沉到 Service Mesh（Istio 的 VirtualService），能力相同、位置不同，见
[Service Mesh](/devops/130-ServiceMesh)。

## 特性开关：解耦的终极形态

特性开关把「代码已部署」与「功能已发布」彻底断开：新代码带着 `if (flag) 新逻辑 else
旧逻辑` 上线，开关关闭时行为与旧版完全一致。发布动作退化为在开关平台拨一个开关——
零部署、毫秒级、可以按用户群灰度（内部员工、5% 用户、特定租户）。

开关的三种典型用法与各自的寿命预期：

| 用法 | 例子 | 寿命 |
| --- | --- | --- |
| 发布开关 | 功能未完成先合入主干，上线前打开 | 天级，必须清理 |
| 运维开关 | 降级重灾区、关闭昂贵特性 | 长期保留 |
| 实验开关 | A/B 实验，按用户分组 | 实验周期 |

**开关债**是这套实践的主要成本：每存活的开关都是一条永久 if 分支，组合爆炸后没人说得
清「全开」是什么状态。治理规则要写进团队约定：发布开关默认两周内移除，开关名带创建
日期与 owner，定期审计存量。

## 数据库变更：expand-contract 契约

所有「秒级回滚」策略都有一个共同的隐藏前提：**新旧版本都能在同一个 schema 上正确运行**。
破坏这个前提的典型操作是「发布 v2 时直接把列改名」——回滚到 v1 后代码找不到列，回滚
失效。工程标准答案是 expand-contract（先扩展后收缩）三步走：

```text
1. Expand：加新列 name_full，写入双写（新旧两列都写），发布 v2 代码（只读新列）
2. Migrate：后台把存量数据从 name 拷到 name_full，校验一致性
3. Contract：确认 v1 彻底退役后，下一个版本删掉旧列与双写逻辑
```

原则总结成一句话：**破坏性 schema 变更永远滞后于代码发布两个版本**。它可以配合任何
发布策略；跳过它的蓝绿与金丝雀，都只是把回滚速度做成了幻觉。

## 常见坑

1. **没有 readinessProbe 的金丝雀**：放量台阶形同虚设，新版本一起就接满流量。渐进式
   交付的全部前提是健康信号可信。
2. **金丝雀只看错误率**：5xx 归零不代表没事——延迟 P99、队列积压、下游依赖错误同样
   是事故信号；AnalysisTemplate 里应放多条指标，且用新版本的标签过滤（`version="canary"`），
   否则旧版本的指标会稀释信号。
3. **把 pause 当审批**：Argo Rollouts 的 `pause` 无 duration 会无限等人工恢复，适合
   强审批流程；带 duration 的 pause 是定时自动放行——别把后者当成了前者。
4. **蓝绿环境共享数据库还宣称秒回滚**：回滚要连带数据状态一起评估；有 schema 变更的
   发布，回滚预案必须写「数据怎么退」。
5. **滚动更新的 maxSurge 设 0**：更新期间容量只减不增，高峰期滚动等于主动限流；
   maxUnavailable 设 0 则要求集群始终有余量接收新副本，资源紧张的小集群会卡住更新。
6. **开关与代码版本错配**：开关状态是全局的，新代码依赖「开关开的语义」、旧实例还在
   跑「开关关的语义」，滚动窗口内两种语义并存——设计开关语义时要保证中间状态无害。

## 工具化落地：Argo Rollouts 与 Flagger

手工切 selector 与手调副本数适合理解原理，生产上的渐进交付交给专用控制器。两家 YAML 骨架如下（承接自旧 GitOps 篇拆出的渐进交付配置）：

**Argo Rollouts：声明式发布台阶 + 指标分析**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    canary:
      steps:                       # 放量台阶：停够时间才继续
        - setWeight: 10
        - pause: { duration: 5m }
        - setWeight: 30
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 80
        - pause: { duration: 5m }
      canaryService: myapp-canary
      stableService: myapp-stable
      trafficRouting:              # 流量精确切分交给网格
        istio:
          virtualServices:
            - name: myapp-vsvc
              routes: [primary]
      analysis:                    # 每个台阶自动做指标验证
        templates:
          - templateName: success-rate
        args:
          - name: service-name
            value: myapp-canary
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args: [{ name: service-name }]
  metrics:
    - name: success-rate
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status!~"5.."}[5m]))
            /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
      successCondition: result[0] >= 0.99   # 成功率跌破 99% 自动中止回滚
      interval: 30s
      count: 10
```

**Flagger：约定优先的金丝雀**（自带负载测试钩子，配置量更小）：

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 5            # 连续失败 5 次才回滚
    maxWeight: 50           # 金丝雀最多吃到 50% 流量
    stepWeight: 10          # 每分钟加 10%
    metrics:
      - name: request-success-rate
        thresholdRange: { min: 99 }
        interval: 1m
      - name: request-duration
        thresholdRange: { max: 500 }   # 延迟 500ms 红线
        interval: 1m
    webhooks:
      - name: load-test
        url: http://flagger-loadtester/
        timeout: 5s
        metadata:
          cmd: 'hey -z 1m -q 10 -c 2 http://myapp:8080/'
```

选型一句话：要精细控制台阶与自定义分析模板选 Argo Rollouts（与 ArgoCD 同生态）；要"零配置起步、约定优于配置"选 Flagger。

四种发布策略终局对比：

| 策略 | 流量切换 | 回滚速度 | 资源开销 | 风险 |
| --- | --- | --- | --- | --- |
| 滚动更新 | 逐步 | 中 | 低 | 中 |
| 蓝绿部署 | 一次性 | 快 | 高（2 倍） | 低 |
| 金丝雀 | 渐进 | 快 | 中 | 低 |
| 影子测试 | 复制流量 | 即时 | 高 | 最低 |

## 实践

在 kind 或 minikube 上完成，约 40 分钟。目标：亲手做一次「切 selector 的蓝绿」，
再感知一次滚动更新的参数效果。

蓝绿切换实验（15 分钟）：创建 `web-green`（镜像 `nginx:1.27`）与 `web-blue`
（`nginx:1.25`）两个 Deployment（label 分别 `version: green/blue`），加一个 selector
指向 green 的 Service。验收：切换 selector 到 blue 后，`kubectl describe svc web`
的 Endpoints 变化，且 curl 始终正常返回（用的哪版镜像从返回头 Server 字段分辨）。

提示（思路方向）：切换动作是一条 patch 命令；观察点是 Endpoints 的 IP 从绿 Pod 换成
蓝 Pod。先自己写清单，再对照关键命令：

```bash
kubectl patch svc web -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl get endpoints web -w        # 观察切换前后 Endpoints 变化
# 回滚就是把 version 改回 green——这就是「秒级」的来源
```

滚动参数实验（15 分钟）：把 replicas 设为 6，故意把新版本镜像写成不存在的 tag，分别
在 `maxUnavailable: 0` 与 `maxUnavailable: 2` 两种配置下观察 `kubectl get pods -w`。
验收：能说清两种配置下「旧副本保留几个、新副本处于什么状态、服务容量各剩多少」。

提示：镜像拉取失败的 Pod 会卡在 ImagePullBackOff；`maxUnavailable: 0` 时旧副本一个
都不删（容量不减），`maxUnavailable: 2` 时最多 2 个旧副本先被删。参考观察命令：

```bash
kubectl set image deployment/web nginx=nginx:does-not-exist
kubectl get pods -w                  # 对比新旧副本数量变化
kubectl rollout undo deployment/web  # 实验结束回滚
```

设计题（10 分钟）：给「结算服务」和「营销页」各选一种发布策略，写清选择依据与各自的
回滚预案（回滚什么、多快、什么条件触发）。验收：理由里至少出现「爆炸半径」「回滚速度」
「资源成本」三个维度中的两个。

提示（思路方向）：结算服务怕错、回滚要快，倾向蓝绿或小步金丝雀 + 指标自动回滚；营销页
无状态、错误可容忍，滚动更新足够。参考答案要点——结算服务：金丝雀 5% 起步，错误率与
P99 超标自动回滚，配合 expand-contract 保证 schema 兼容；营销页：默认滚动更新即可，
加 readinessProbe 保证不盲滚。

## 下一步

- 金丝雀分析依赖的指标从哪来：[Prometheus](/devops/250-Prometheus) 与
  [监控告警体系](/devops/240-MonitorAndObservability)；
- 把放量清单放进 Git、由 ArgoCD 驱动的完整闭环见 [GitOps 与 ArgoCD](/devops/190-GitOpsArgoCD)；
- 发布失败后的应急与复盘流程见 [OnCall 实践](/devops/310-OnCallPractice)。
