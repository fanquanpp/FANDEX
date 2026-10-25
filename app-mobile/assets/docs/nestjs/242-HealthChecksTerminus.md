---
order: 300
title: 健康检查与就绪探针
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: '@nestjs/terminus 健康检查端点、K8s liveness/readiness 探针对接、多实例部署的自检清单——上生产前的最后一道自检。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'nestjs/240-MicroservicesAndHealth'
  - 'nestjs/235-BullMQQueuesAndReliability'
  - 'nestjs/180-DatabaseIntegration'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
---

## 知识点地图

- **知识类别**：生产就绪——健康检查（health check）端点与编排平台的探针（probe）对接。
- **解决什么问题**：进程活着不等于服务可用（数据库连不上、队列断了）；负载均衡和 K8s 需要一个「问服务本身」的端点来决定流量给不给它。健康检查就是这个「服务自己的体检报告」。
- **什么时候用到**：上负载均衡前、进 K8s 前、做多实例部署的自检；发布流水线的前置检查。

前置：数据库集成（nestjs/180-DatabaseIntegration）——自定义指示器要摸数据库连接；缓存与队列（nestjs/230、nestjs/235）——Redis 依赖的检查对象。

## 0. 健康检查在部署链路里的位置（先读这里）

> 学习目标：理解「进程存活」与「服务可用」的区别；会用 @nestjs/terminus 暴露 /health 端点；能为 K8s 配 liveness 与 readiness 两类探针并理解它们的分工。

从原《微服务与健康检查》分家而来。部署链路上「服务可用」要回答三层问题：

| 问题 | 谁来问 | 怎么问 | 不健康的后果 |
| :--- | :--- | :--- | :--- |
| 进程还在吗 | K8s liveness / systemd | 探针 / Restart=always | 重启容器/进程 |
| 能接流量吗 | K8s readiness / 负载均衡 | 探针 / 健康检查 | 摘出负载均衡池 |
| 依赖都通吗 | 本篇的 /health 端点 | 检查数据库/队列/下游 | 看具体探针类型 |

**liveness 与 readiness 的分界**是最容易配错的知识点：liveness 失败触发**重启**（进程级动作），readiness 失败只触发**摘流量**（实例级动作）。把「数据库连不上」挂到 liveness 上会发生什么：数据库一抖，所有实例被集体重启——重启不解决数据库的问题，反而制造雪崩。所以**依赖故障归 readiness，进程自身故障（死锁、内存耗尽无法恢复）归 liveness**。

## 1. 健康检查：@nestjs/terminus

（搬移自原《微服务与健康检查》第 3 节，全部保留。）

```bash
npm i @nestjs/terminus
```

```typescript
// src/health/health.controller.ts
import { Controller, Get } from "@nestjs/common"
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator
} from "@nestjs/terminus"
import { PrismaService } from "../prisma/prisma.service"

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 堆内存超过 512MB 视为不健康
      () => this.memory.checkHeap("memory_heap", 512 * 1024 * 1024),
      // 自定义指示器：跑一条最轻的 SQL 确认数据库连接可用
      async () => {
        await this.prisma.$queryRaw`SELECT 1`
        return { database: { status: "up" } }
      }
    ])
  }
}
```

**讲解：**

1. 响应形如 `{ status: "ok", info: { memory_heap: {...}, database: {...} } }`；任一指示器失败则整体 `status: "error"` 并返回 503。
2. 用途直接：K8s 的 liveness/readiness 探针指向 `GET /health`，负载均衡按它摘除不健康实例，发布流水线用它做前置检查。
3. 健康检查要"轻"：只验证关键依赖的连通性（一条 `SELECT 1` 即可），不要在探针里做重查询，否则探针本身会拖垮服务。
4. 自定义指示器在 NestJS 11 起推荐基于 `HealthIndicatorService` 编写，与 Prisma、TypeORM 的现成指示器用法以官方文档为准。

「探针要轻」再强调一层：`/health` 的调用频率由平台决定（K8s 默认每 10 秒一次每实例），重查询指示器等于给自己加了一个定时压测工具——「自定义指示器跑业务聚合 SQL」是健康检查反模式的第一名。

## 2. 对接 K8s 探针：两类探针两个端点

生产级做法是**拆两个端点**，让 liveness 与 readiness 检查的东西不同：

```typescript
@Controller("health")
export class HealthController {
  // liveness：只查进程自身（内存），不碰外部依赖
  @Get("live")
  @HealthCheck()
  live() {
    return this.health.check([
      () => this.memory.checkHeap("memory_heap", 512 * 1024 * 1024)
    ])
  }

  // readiness：查依赖（数据库、队列），失败只摘流量不重启
  @Get("ready")
  @HealthCheck()
  ready() {
    return this.health.check([
      async () => {
        await this.prisma.$queryRaw`SELECT 1`
        return { database: { status: "up" } }
      }
    ])
  }
}
```

```yaml
# deployment.yaml 的探针片段
livenessProbe:
  httpGet: { path: /health/live, port: 3000 }
  initialDelaySeconds: 20   # 给应用启动时间，避免「还没起就被判死」的循环重启
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /health/ready, port: 3000 }
  initialDelaySeconds: 5
  periodSeconds: 5
```

逐项讲为什么这样配：

- `initialDelaySeconds`：liveness 的这个值要**大于应用冷启动时间**（NestJS 加载全部模块、连接数据库的耗时），配小了是「启动竞速」——应用还在启动就被判不健康、被重启、再启动、再被重启的循环；
- readiness 的 `periodSeconds` 比 liveness 密（5 秒 vs 10 秒）：摘流量的代价小、恢复快，探勤一点；重启的代价大，探稀一点还要配合失败阈值；
- 探针超时（`timeoutSeconds`，默认 1 秒）：`SELECT 1` 正常毫秒级，数据库抖动时它也会变慢——超时判不健康正是想要的行为。

队列依赖要不要进 readiness？要，但按消费角色区分：跑 BullMQ Worker 的实例把队列连通性放进 readiness（Redis 断了 worker 无法消费，摘流量是对的）；纯 API 实例不用查队列。**检查清单跟着实例的职责走**，不是所有实例一份清单。

## 3. 多实例部署的自检

健康检查的最终用途是「多实例部署时每一份都可信」。发布自检清单：

1. **滚动发布不丢流量**：新实例 readiness 通过前，旧实例不被摘——K8s 的滚动更新天然按 readiness 轮替，自建负载均衡要确认「摘除实例前把存量请求处理完」（drain）；
2. **`/health` 不经过鉴权**：探针是平台发给每个实例的，带不上业务 token——健康端点必须在鉴权中间件之外（nestjs/200 的守卫要用 `@Public` 或路径排除）；
3. **失败要能定位**：`status: "error"` 的响应里 `details` 会列出每个指示器的状态——告警规则盯 `/health/ready` 的 503 率，定位看 details 里是 database 还是 redis；
4. **优雅停机配合**：收到 SIGTERM 后先 `app.close()` 让 NestJS 摘除 readiness、处理完存量请求再退出——不配合优雅停机的健康检查，滚动发布仍然掉请求。

## 4. 动手实践

**任务一**：给第 1 节的 `/health` 加 Redis 指示器。用 terminus 的 `RedisHealthIndicator`（或自写 `redis.ping()` 指示器），停掉 Redis 后观察响应的 `status` 与 `details` 结构变化。

<details>
<summary>任务一参考观察</summary>

Redis 正常时 `status: "ok"`；`docker stop redis` 后响应变 `status: "error"` 且 HTTP 状态码 503，`details` 里 `redis: { status: "down", message: ... }` 与 `database: { status: "up" }` 并列——按指示器粒度报告是 terminus 的设计，告警与定位都靠这个结构。自查：你的指示器超时设了吗？不设的话 Redis 网络黑洞时探针会挂起，比失败更糟。
</details>

**任务二**：体验「liveness 配错依赖」的雪崩。把数据库检查挂进 liveness 端点（临时），用 Docker 给数据库制造网络延迟（`docker pause` 或 tc 模拟），观察多个实例被重启的时序；恢复后把检查移回 readiness 端点，重复同样的故障对比。

<details>
<summary>任务二参考观察</summary>

错误配置下：数据库延迟 → 所有实例 liveness 失败 → K8s 逐个重启 → 重启期间 readiness 也失败 → 全实例不可用，数据库恢复后还要等实例陆续起来；正确配置下：同样故障只有 readiness 失败 → 实例被摘出负载均衡池但进程活着 → 数据库恢复后 readiness 自动转绿，无重启。这题是把第 0 节的分工规则变成身体记忆的关键练习。
</details>

**任务三**：写一份你自己项目的部署自检清单。对照第 3 节四条（滚动发布、鉴权排除、失败定位、优雅停机），逐条检查你的项目现状，标记「已具备 / 缺失 / 不适用」，缺失项写出补齐动作。

<details>
<summary>任务三参考设计</summary>

典型的现状：`/health` 已有但挂在全局守卫之后（缺失项 2，动作是守卫里加 `@Public` 或 `/health` 白名单）；滚动发布用 K8s 但没配 readinessProbe（缺失项 1）；优雅停机没处理 SIGTERM（缺失项 4，动作是 `app.enableShutdownHooks()` 加生命周期钩子里关数据库连接）。不适用项要写理由（如单体部署没有滚动发布），而不是留空——清单的价值在「每一条都有明确状态」，写「不适用」的过程本身会逼你确认部署形态。
</details>

## 5. 小结与延伸

- 健康检查是上生产前的最后一道自检：探针要轻、指标要真、对接 K8s 或负载均衡。
- liveness 管进程自身（失败重启）、readiness 管依赖（失败摘流量）——把依赖挂进 liveness 是健康检查配置的第一事故源。
- 健康检查跟着实例职责走：worker 实例查队列、API 实例不查；多实例的自检清单逐条落地才有意义。
- 延伸：terminus 的 gRPC/DNS/磁盘指示器；微服务传输层与 ClientProxy 见《微服务与消息模式》（nestjs/240-MicroservicesAndHealth）；队列 worker 的失败告警见 nestjs/235 的 failed 事件。

## 参考与致谢

- NestJS 官方文档 Health Checks (Terminus)：<https://docs.nestjs.com/recipes/terminus>；
- Kubernetes 官方文档 Configure Liveness, Readiness and Startup Probes：<https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/>（CC-BY 4.0）；
- 本篇由《微服务与健康检查》拆分而来：原第 3 节健康检查全部内容搬移至本篇第 1 节，探针对接与多实例自检为本篇扩写。
