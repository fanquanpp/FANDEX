---
order: 280
title: 消息队列与异步任务可靠性
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: BullMQ 异步任务：注册队列、生产者与消费者、重试退避、延迟任务、任务状态机与幂等消费，at-least-once 语义下的两层防线。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'nestjs/230-CachingAndQueues'
  - 'nestjs/180-DatabaseIntegration'
  - 'nestjs/190-Testing'
  - 'nestjs/240-MicroservicesAndHealth'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
---

## 知识点地图

- **知识类别**：异步任务与消息队列——BullMQ 在 NestJS 中的注册、生产、消费与可靠性保障（重试、退避、幂等）。
- **解决什么问题**：慢且可能失败的操作（发邮件、导报表、调第三方）拖死接口响应；重试不可靠、任务可能丢、可能重——队列把「立刻完成」换成「最终完成」，本篇讲怎么让「最终完成」靠得住。
- **什么时候用到**：接口里有超过一秒的操作、需要延迟/定时触发、需要失败重试与告警的任务。

前置：模块与依赖注入（nestjs/160-ModuleControllerService）；缓存与队列的取舍对照见《缓存与消息队列》前篇（nestjs/230-CachingAndQueues）——**本篇讲队列一侧，230 讲缓存一侧**。

## 0. 什么时候需要队列（先读这里）

> 学习目标：判断操作何时该进队列；会用 @nestjs/bullmq 注册队列、入队、消费；配置重试退避与延迟任务；用幂等键兜住 at-least-once 语义的「可能重」。

从原《缓存与消息队列》篇分家而来。缓存的交易模型（拿一致性换速度）对队列同样成立：**队列把「立刻完成」换成「最终完成」（请求返回时任务还没跑）**，代价是要随时能回答「丢了怎么办」与「重了怎么办」——本篇第 1、4 节分别回答这两问。

判断标准一句话：操作**慢**（>1 秒）、**可能失败**（依赖第三方）、**允许延后**——三条同时成立才进队列；同步能完成的操作不要为了时髦异步入队。

## 1. BullMQ 队列：注册、生产者与消费者

（搬移自原《缓存与消息队列》第 3 节，全部保留并扩写。）

```bash
npm i @nestjs/bullmq bullmq ioredis
```

```typescript
// src/app.module.ts
import { BullModule } from "@nestjs/bullmq"

@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: "localhost", port: 6379 } // Redis 连接全局复用
    }),
    BullModule.registerQueue({ name: "email" }) // 队列名即契约
  ]
})
export class AppModule {}
```

生产者：接口只负责入队，立即返回 202：

```typescript
// src/email/email.service.ts
import { Inject, Injectable } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bullmq"
import { Queue } from "bullmq"

export interface EmailJob {
  to: string
  subject: string
  body: string
}

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue("email") private readonly emailQueue: Queue<EmailJob>
  ) {}

  async sendWelcome(to: string) {
    await this.emailQueue.add(
      "welcome", // 任务名
      { to, subject: "欢迎注册", body: "..." },
      {
        attempts: 5, // 最多尝试 5 次
        backoff: { type: "exponential", delay: 3000 }, // 间隔 3s、6s、12s、24s、48s
        removeOnComplete: 100, // 完成记录最多保留 100 条，防 Redis 膨胀
        removeOnFail: 1000
      }
    )
  }
}
```

消费者：

```typescript
// src/email/email.processor.ts
import { Logger } from "@nestjs/common"
import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Job } from "bullmq"
import { EmailJob } from "./email.service"

@Processor("email", { concurrency: 5 }) // 同时处理 5 个任务
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name)

  async process(job: Job<EmailJob>): Promise<void> {
    this.logger.log(`任务 ${job.id} 第 ${job.attemptsMade + 1} 次尝试`)
    await mailer.send(job.data) // 抛异常 = 本轮失败，BullMQ 按策略重试
  }
}

// EmailModule 的 providers 中注册 EmailProcessor
```

**讲解：**

1. 队列的价值：把"慢且可能失败"的操作移出请求-响应周期，接口耗时从 3 秒降到 20 毫秒，失败还能自动重试。
2. `attempts + backoff` 是可靠性下限：瞬时故障（网络抖动、下游限流）靠指数退避自愈；反复失败最终进入 failed 集合，留给人处理。
3. `job.data` 必须可 JSON 序列化：只传 id 等引用，消费者自己查库取最新数据，避免把大对象塞进 Redis。

为什么 `registerQueue` 的 name 是「契约」：生产者与消费者靠这个名字对上（`@InjectQueue("email")` 与 `@Processor("email")`），改名等于改接口——队列名的变更要走与 API 变更同级的评审，别随手改。

## 2. 延迟任务与消费可靠性

（搬移自原《缓存与消息队列》第 4 节，全部保留。）

```typescript
// 24 小时后发送回访邮件
await this.emailQueue.add(
  "follow-up",
  { to, subject: "使用得怎么样？" },
  { delay: 24 * 60 * 60 * 1000 }
)
```

任务状态机：

| 状态 | 含义 | 去向 |
| --- | --- | --- |
| waiting | 排队中 | active |
| active | 消费中 | completed / failed（重试回 waiting） |
| delayed | 等待触发时间 | 到期转 waiting |
| failed | 重试次数耗尽 | 人工介入 |

```typescript
// 队列事件监听：失败告警的最简实现
this.emailQueue.on("failed", (job, err) => {
  this.logger.error(`任务 ${job?.id} 失败：${err.message}`)
})
```

**讲解：**

1. delay 任务先进入 delayed 集合，到期自动转 waiting；状态存在 Redis，应用重启不丢任务。
2. 重试由"消费者抛异常"触发；对参数错误等重试无意义的失败，抛 `UnrecoverableError` 可跳过剩余重试。
3. 单元测试建议：直接测试 Processor 的 `process` 方法（传入伪造 Job），队列行为本身交给集成环境验证，与测试一篇的分层思路一致。

### 2.1 幂等：重试的另一半

（搬移自原 4.1 节，全部保留。）

`attempts: 5` 意味着一个前提必须成立：**任务可能已成功执行过一次，第二次重试还在跑**。超时后消费者被判失败、任务重新入队，但下游邮件服务可能已经把信发出去了——这就是"至少一次"（at-least-once）投递语义：**不丢，但可能重**。队列层没有"恰好一次"的免费午餐，恰好一次要业务层自己造，原料是幂等键：

```typescript
// 生产者：用业务唯一键做 jobId——BullMQ 对相同 jobId 的 waiting 任务去重
await this.emailQueue.add(
  "welcome",
  { to, subject: "欢迎注册", body: "..." },
  { jobId: `welcome:${userId}` }   // 同一用户重复触发不会重复排队
)

// 消费者：写操作用唯一约束兜底，重复消费变"冲突后放弃"而非"重复生效"
await this.prisma.couponGrant.create({ data: { userId, campaignId } })
// 重复到达时触发唯一约束冲突 → catch 后视为已处理，正常完成
```

两层防线各管一段：jobId 去重挡"重复入队"，唯一约束挡"重复消费"。设计任务时先问一句"这个任务跑两次会怎样"——答案是"发两封邮件、扣两次款"，就还没资格开重试。

### 2.2 死信的出口：failed 之后的流程

`attempts` 耗尽的任务停在 failed 集合（状态机最后一行「人工介入」），人工介入的落地形态三种：

1. **告警到人**：第 1 节的 `failed` 事件监听接入 IM/邮件告警，按队列名分级——支付相关 failed 必须分钟级响应，营销类可以天级；
2. **手动重放**：Bull Board 面板（小结延伸）或脚本调 `job.retry()`——重放前先确认根因消除，否则只是把失败重演一遍；
3. **定期清理**：`removeOnFail: 1000` 保留最近 1000 条供排查，更早的自动清掉——failed 集合不清理会慢慢吃掉 Redis 内存。

## 3. 动手实践：遮代码自检

先只读任务与提示，自己写完再对照参考实现。

**任务一**：给"发送生日优惠券"任务补幂等——用户每天最多领一次，任务可能被重试，如何保证不重复发放？

**提示**：两层防线各用什么键？（第 2.1 节）jobId 去重键要包含"用户 + 当天日期"，否则跨天也发不出第二天的券；消费侧唯一约束落在哪两个字段上？

**参考实现**（先自己写完再看）：

```typescript
// 生产者
await this.couponQueue.add(
  "birthday-grant",
  { userId },
  { jobId: `birthday:${userId}:${dayjs().format("YYYY-MM-DD")}` } // 键含日期：跨天可再领
)

// 消费者
async process(job: Job<{ userId: string }>): Promise<void> {
  const { userId } = job.data
  try {
    await this.prisma.couponGrant.create({
      data: { userId, campaignId: "birthday", date: new Date() }
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return // 唯一约束冲突 = 已发放过：视为成功，避免无谓重试
    }
    throw e  // 其余异常照常抛出，交给 attempts/backoff
  }
}
```

要点自查：jobId 挡"同一天重复入队"，`(userId, campaignId, date)` 唯一约束挡"重试重复消费"——两道防线缺一不可；`P2002` 冲突按成功处理是幂等消费的标准姿势，吞掉它换来的就是"恰好一次"的效果。

**任务二**：给导报表任务加"取消与超时"。要求：a) 消费者处理超过 5 分钟视为失败（超时重试）；b) 用户取消导出时，已排队未执行的任务能被移除；c) 思考：正在执行中的任务怎么处理取消请求？

**提示**：a 看 `@Processor` 的 job 级配置（locks）；b 查 Queue 的 `removeJobs`/job 的 `remove()`；c 想一想「协作式取消」——任务内部定期检查一个取消标记。

<details>
<summary>任务二参考设计</summary>

```typescript
// a) 超时：消费侧设置 stalledInterval 之外，最直接的是 job 级超时由业务计时
@Processor("export", { concurrency: 2 })
export class ExportProcessor extends WorkerHost {
  async process(job: Job<ExportJob>): Promise<void> {
    const deadline = Date.now() + 5 * 60 * 1000
    // 分批处理时每批检查一次
    for (const batch of batches) {
      if (Date.now() > deadline) throw new Error("导出超时")  // 走正常重试/失败路径
      await this.processBatch(batch)
    }
  }
}

// b) 取消排队中的任务
await this.exportQueue.removeJobs(`export:${exportId}`)  // 按 jobId 前缀移除

// c) 执行中的任务：写取消标记，任务内协作检查
await this.redis.set(`export:cancel:${exportId}`, "1")
// 任务内每批之间：
if (await this.redis.get(`export:cancel:${job.data.exportId}`)) {
  throw new UnrecoverableError("用户取消")  // 跳过剩余重试
}
```

要点自查：队列层没有「杀掉正在运行的任务」的远程开关，执行中的取消只能协作式（任务自己定期看标记）；超时抛普通 Error 会触发重试，若超时不应重试（重跑还是超时），抛 `UnrecoverableError` 直接进 failed。
</details>

## 4. 小结与延伸

- 心智模型：队列在拿一致性换吞吐——回答"丢了怎么办"（attempts + backoff + 状态存 Redis）与"重了怎么办"（jobId 去重 + 业务唯一约束）。
- 注册到消费的固定五件套：`forRoot` 连接、`registerQueue` 声明、`add` 入队、`@Processor` 消费、`failed` 事件告警。
- at-least-once 是队列的物理事实，幂等是消费的前提；"这个任务跑两次会怎样"是设计队列任务的第一问。
- 延伸：Bull Board 面板可视化队列积压；多队列按业务域拆分（email/export/report 各一队列，互不阻塞）；队列与微服务事件（nestjs/240）的分工——队列管「必达的任务」，事件管「通知感兴趣的人」。

## 参考与致谢

- BullMQ 官方文档 <https://docs.bullmq.io/>（MIT 许可的开源项目文档）与 @nestjs/bullmq 集成文档 <https://docs.nestjs.com/techniques/queues>；
- 本篇由《缓存与消息队列》拆分而来：原第 3 节（队列注册/生产者/消费者）、第 4 节（延迟任务/状态机/幂等）、动手实践的队列侧任务（任务二）全部搬移至本篇落位；缓存侧内容保留于 230 号。
