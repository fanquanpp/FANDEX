# Deno KV 与队列

很多后台系统的第一块存储需求，其实用不上关系数据库：给歌曲计票、给歌姬存档案、给演唱会锁库存、给粉丝发确认通知——这些都是"按键读写"与"按键广播"。Deno 把这类需求内置成了 Deno KV：`Deno.openKv()` 一行打开，本地落在 SQLite，部署到 Deno Deploy 后自动变成跨节点的强一致数据库，代码一行不改。本篇围绕平台的打榜投票与购票流程，把 KV 的读写建模、原子事务、实时监听与内置消息队列一次讲透，最后划清它与 Postgres 的边界。

## 前置知识

- [Deno Web 开发与云端部署](/deno/004-DenoWebFrameworkDeploy)：已经用 Hono 暴露过 REST 接口并接触过 KV 的基础读写。
- [标准库与 npm 兼容](/deno/006-DenoStdLibNpmCompatibility)：理解依赖与权限管理，本篇示例的命令都遵循最小授权。
- [权限模型与安全实践](/deno/003-DenoPermissionsSecurity)：知道 `--allow-read` 等参数如何约束 KV 的本地存储文件。

## 学习目标

1. 会用 openKv 完成基本读写，并用 key 前缀为数组建模。
2. 能用原子操作与 versionstamp 实现乐观并发，解决抢票超卖问题。
3. 会用 kv.watch 监听数据变化，驱动实时大屏。
4. 能用 enqueue/listenQueue 解耦耗时任务，并处理失败重试。
5. 能判断一段业务该用 KV 还是该上 Postgres。

## 1. openKv 基本读写与 key 前缀建模

KV 的 key 是数组，数组就是层级：第一层放"集合名"，之后放实体 id。这个约定让前缀扫描天然可用。

```typescript
// kv_basic.ts —— 歌姬档案：以 ["singer", id] 前缀建模
const kv = await Deno.openKv() // 本地默认 SQLite 文件，云端自动切换托管 KV

// 写入两位歌姬的基础档案：key 是数组，value 是任意结构化值
await kv.set(["singer", "miku"], { name: "初音未来", theme: "#39c5bb" })
await kv.set(["singer", "teto"], { name: "重音 Teto", theme: "#eba9ee" })

// 按前缀列出全部歌姬：字典序扫描，等价于"全表遍历"
for await (const entry of kv.list({ prefix: ["singer"] })) {
  console.log(entry.key[1], entry.value.name, entry.value.theme)
}

// 单点读取与删除：get 返回 { key, value, versionstamp }
const miku = await kv.get(["singer", "miku"])
console.log("读取：", miku.value)
await kv.delete(["singer", "teto"]) // 下架歌姬
```

```bash
deno run --allow-read kv_basic.ts
```

**讲解：**

1. `Deno.openKv()` 零配置：本地把数据落在 SQLite 文件里，部署到 Deno Deploy 后是托管的强一致 KV，业务代码不需要改动。
2. key 用数组表达层级：`["singer", "miku"]`、`["vote", songId]`。建模口诀是"大集合放第一层，id 放第二层"，前缀扫描按 key 的字典序进行。
3. value 支持数字、字符串、对象与 Uint8Array（可存封面缩略图等二进制），底层用结构化克隆序列化。
4. KV 的写入在本地是强持久的：进程崩溃不丢已确认写入，这让"扣减库存、累计票数"这类关键计数可以放心直接放在 KV 上。
5. `get` 返回的 entry 自带 `versionstamp`——数据的版本指纹，下一节的原子操作靠它判断"我读到的数据有没有被别人改过"。
6. 同一次原子提交产生的多个 key 共享同一个 versionstamp，可以据此判断"这几条数据是同一批写入的"——对账、审计场景很实用。
7. list 还支持 `start` 分页：`kv.list({ prefix, start })` 从指定 key 之后继续扫，大集合按范围翻页比一次性全扫更稳。

## 2. 原子操作与乐观并发

"读出库存、减一、写回去"三步之间可以插进任何人的请求，高并发抢票必然超卖。Deno KV 的解法是把多个操作放进一次原子提交，用 check 校验版本、用 sum 原子累加。

```typescript
// atomic.ts —— 乐观并发购票：版本校验 + 原子扣减
const kv = await Deno.openKv()

// 购票：读当前库存拿到版本号，再原子提交
async function buyTicket(concertId: string): Promise<boolean> {
  const current = await kv.get<number>(["ticket", concertId, "stock"])
  const stock = current.value
  if (stock === null || stock <= 0) return false // 已售罄，直接拒绝

  // check 校验版本未被他人抢先修改，set 才会生效；否则整批作废
  const res = await kv.atomic()
    .check({ key: ["ticket", concertId, "stock"], versionstamp: current.versionstamp })
    .set(["ticket", concertId, "stock"], stock - 1)
    .commit()

  return res.ok // 并发冲突时 ok 为 false，调用方重试即可
}

await kv.set(["ticket", "c001", "stock"], 100)

// 5 位粉丝同时抢票：必然只成功 5 次，库存不会减成负数
const results = await Promise.all(
  Array.from({ length: 5 }, () => buyTicket("c001")),
)
console.log("抢票成功：", results.filter(Boolean).length)
```

```typescript
// vote.ts —— 打榜投票：纯累加连"读"都不需要
const kv = await Deno.openKv()

// sum 在服务端原子加值，天然无并发冲突
await kv.atomic().sum(["vote", "song_42"], 1).commit()

const song = await kv.get<number>(["vote", "song_42"])
console.log(`歌曲 42 当前票数：${song.value}`)
```

**讲解：**

1. 原子操作链式构建：`kv.atomic()` 后跟若干 check/mutate，`commit()` 一次性提交，任何 check 失败则整批不生效。
2. 乐观并发的成本模型：冲突时 `res.ok === false`，调用方决定重试或放弃——适合冲突率不高的场景；冲突极频繁时改用 sum 这类服务端累加。
3. 计数类需求（票数、在线人数、浏览量）直接 `sum`，它不需要先读后写，从根本上避开了竞态。
4. 一次 atomic 里可以混多种操作（set/delete/sum）作用于不同 key，等价于一个小事务。
5. 单次原子提交的 mutate 数量有上限，批量导入要分批 commit；把大循环按几百条一批拆开，是 KV 批处理的常规写法。

## 3. kv.watch 实时监听

应援大屏要"票数一变就刷新"。轮询能做，但延迟高、浪费请求；KV 自带 watch，数据一变就推送。

```typescript
// watch.ts —— 应援大屏：监听投票数变化，实时刷新
const kv = await Deno.openKv()

// watch 接收一组 key，任一变化时推入与监听列表对齐的 entry 数组
const stream = kv.watch([["vote", "song_42"]])

for await (const entries of stream) {
  const vote = entries[0] // 监听几个 key，数组就有几项
  if (vote.value === null) {
    console.log("该歌曲已被移除榜单")
  } else {
    console.log(`歌曲 42 票数更新：${vote.value}`)
  }
}

// 监听多个 key：返回数组与监听列表按位置对齐
const multi = kv.watch([["vote", "song_42"], ["ticket", "c001", "stock"]])
for await (const [vote, stock] of multi) {
  console.log(`票数 ${vote.value}｜余票 ${stock.value}`)
}
```

**讲解：**

1. `kv.watch` 返回 `ReadableStream`：用 `for await` 消费，每条消息是与监听列表一一对应的 entry 数组，value 为 null 表示 key 已删除。
2. 多 key 监听用于"多指标大屏"：票数与余票一次订阅全部拿到，比开两条 watch 更省连接也保证两个指标的推送顺序一致。
3. watch 适合"少量热点 key"的大屏、在线人数、排行榜第一名变化；要监听整个榜单的变化，用一个专门的"汇总 key"（原子 sum 维护总数）比监听全前缀更高效。
4. 本地开发与 Deploy 云端行为一致，不需要自建 Redis 发布订阅——少一个中间件就少一份运维。
5. 推送的 entry 带 versionstamp 与完整 value：收到即最新快照，不需要再回查一次 KV，处理逻辑保持无状态。

## 4. enqueue 与 listenQueue：内置消息队列

购票成功后的"出票 + 发确认消息"不需要挡住主流程。KV 内置了消息队列：enqueue 入队，listenQueue 订阅处理，失败自动重试。

```typescript
// queue.ts —— 购票主流程与出票任务解耦
const kv = await Deno.openKv()

// 1) 入队：消息体任意可序列化值；keysIfUndelivered 指定"死信"落点
await kv.enqueue(
  { orderId: "o1001", concertId: "c001", seat: "A12" },
  {
    delay: 0,                                       // 可选：延迟毫秒数，做定时任务
    keysIfUndelivered: [["deadLetter", "ticket"]],  // 重试耗尽后归档，便于补偿
  },
)

// 2) 订阅：进程重启后未完成的消息会继续投递
kv.listenQueue(async (msg: { orderId: string; concertId: string; seat: string }) => {
  // 幂等写入：以 orderId 为 key，重复投递也不会生成两张票
  await kv.set(["issued", msg.orderId], { seat: msg.seat, status: "已出票" })
  console.log(`订单 ${msg.orderId} 已出票：${msg.seat}`)
})
```

**讲解：**

1. `enqueue` 把消息交给运行时托管队列，`listenQueue` 注册处理器；部署到 Deploy 后投递由平台保证，本地开发即时执行。
2. `delay` 实现延迟任务，比如演出前 24 小时发送提醒；`keysIfUndelivered` 让重试耗尽的消息落到指定 key，配合补偿逻辑兜底。
3. 队列至少一次投递：处理器抛错会触发重试，所以副作用必须幂等——用消息里的业务 id（订单号）做 key 去重是标准手法。
4. 消息体保持小而扁平：大负载先落 KV、队列里只传 id，投递快、重试代价低——幂等与小消息一起构成队列使用的两条纪律。

## 5. 适用边界与 Postgres 对比

| 维度 | Deno KV | Postgres |
| --- | --- | --- |
| 数据模型 | 分层 key + 前缀扫描 | 关系表、SQL 联结 |
| 一致性 | 强一致（串行化原子操作） | 可调隔离级别 |
| 查询能力 | 按 key / 前缀，无 SQL | 全功能 SQL、聚合、索引 |
| 运维成本 | 零配置，内置 | 需要部署、备份与连接管理 |
| 典型场景 | 计数、会话、配置、队列 | 报表、多实体关联、复杂事务 |

经验法则：数据以"单个实体的按键读写"为主，用 KV——打榜计数、粉丝会话、座位库存都符合。一旦出现"统计每个 P 主全部歌曲的总票数"这类跨实体聚合，或多表联结、范围查询，就该上 Postgres（`npm:postgres` / `npm:pg`）。两者也可以混用：KV 扛热点计数与会话，Postgres 做主存储，投票时先 sum 进 KV，再异步落库对账。

迁移路径同样是渐进的：初创期全量 KV 起步，零运维上线；业务出现聚合与报表需求后，引入 Postgres 承接主存储；KV 退守计数、会话与队列，两个系统以"先写 KV、异步对账落库"的方式衔接，哪一侧都不必一次性推翻重写。

## 6. 组合应用：打榜服务串讲

把前四节的能力放进同一个模块，就是一个最小的打榜服务：投票用原子累加，大屏用 watch，异步落库用队列。这段代码同时示范了"各能力各守其位"的组合方式。

```typescript
// rank.ts —— 打榜服务：计数、监听与异步归档的组合
const kv = await Deno.openKv()

// 1) 投票：一次原子提交同时累加单曲票数与全局总数
export async function vote(songId: string) {
  await kv.atomic()
    .sum(["vote", songId], 1)
    .sum(["voteTotal"], 1)
    .commit()
}

// 2) 大屏：订阅汇总 key，全站票数一变即推送
export function totalStream() {
  return kv.watch([["voteTotal"]])
}

// 3) 归档：定时任务把快照投进队列，由队列处理持久化
export async function snapshotDaily() {
  const votes: Record<string, number> = {}
  for await (const e of kv.list({ prefix: ["vote"] })) {
    votes[String(e.key[1])] = e.value as number
  }
  await kv.enqueue(votes, { keysIfUndelivered: [["deadLetter", "archive"]] })
}

// 4) 队列端：写入归档 key，失败自动重试
kv.listenQueue(async (snap: Record<string, number>) => {
  for (const [songId, count] of Object.entries(snap)) {
    await kv.set(["archive", songId], { votes: count })
  }
})
```

**讲解：**

1. 一次 atomic 里对两个 key 各调一次 `sum`：单曲票数与全站总数永远同步推进，不存在"总数加了、单曲没加"的中间态。
2. 大屏只监听 `["voteTotal"]` 一个热点 key，而不是监听整个 `["vote"]` 前缀——用"维护汇总 key"换"大量 watch 连接"，是 KV 实时化的常用取舍。
3. 归档走队列而不是请求路径内直接写：投票接口的延迟只剩原子提交，落库快慢不影响粉丝手感；队列失败重试配合幂等写入（按 songId 覆盖 set）保证归档正确。
4. 这也是第 5 节边界的示范：计数、监听、队列全在 KV 内完成；只有"跨月报表、多条件查询"才需要引入 Postgres。
5. 这个骨架可以直接部署：投票接口、实时大屏与归档队列放在同一个 Deno 服务里推上 Deploy，边缘节点就近读写强一致 KV，无需改动一行业务代码。

## 易错点与最佳实践

1. **用 get + set 代替原子操作**：三步之间存在竞态窗口，抢票必超卖。改成 atomic + check，或计数场景直接 sum：

```typescript
// 错误：读改写三步不原子，并发下互相覆盖
// const s = await kv.get(["ticket", "c001", "stock"])
// await kv.set(["ticket", "c001", "stock"], s.value - 1)
// 正确：服务端原子累加 / check 版本后扣减
await kv.atomic().sum(["ticket", "c001", "stock"], -1).commit()
```

2. **key 第一层放可变部分**：`["c001", "stock"]` 把演唱会 id 放在第一层，想列全部库存就无从下手。把集合名放第一层：`["ticket", "c001", "stock"]`，前缀 `["ticket"]` 即可扫描全部。

3. **listenQueue 副作用不幂等**：至少一次投递意味着可能重复执行，不幂等就会重复出票。用业务 id 做写入 key：

```typescript
// 错误：append 语义，重试后重复出票
// await kv.set([crypto.randomUUID()], msg)
// 正确：以订单号为 key，天然去重
await kv.set(["issued", msg.orderId], { seat: msg.seat })
```

4. **把 KV 当关系库全前缀扫描**：在百万级前缀上 `kv.list` 做过滤统计，性能与可维护性都崩塌。出现聚合需求立刻换 Postgres，或用原子 sum 维护汇总 key 以空间换时间。

5. **把大对象塞进 value**：KV 适合小而频繁的读写，几 MB 的封面原图、整份音频文件塞进 value 会显著拖慢读写并占用存储配额。大内容交给对象存储或文件系统，KV 里只存引用与元数据（URL、大小、时长），读写保持轻快。

## 本篇小结

1. `Deno.openKv()` 是零配置的强一致键值存储：本地 SQLite、云端托管，代码不变；key 用数组表达层级，前缀扫描就是"遍历集合"。
2. 并发正确性靠原子操作：`check` 校验 versionstamp 实现乐观锁，`sum` 做无竞态计数，一批操作 `commit()` 要么全成要么全不做。
3. `kv.watch` 把"数据变化"变成流，实时大屏不再轮询；监听少量热点 key，汇总数据用专用 key 维护。
4. `enqueue`/`listenQueue` 内置了消息队列：延迟任务、失败重试、死信归档都有官方答案，副作用务必用业务 id 保证幂等。
5. 边界判断一句话：按键读写用 KV，SQL 聚合与多表关联上 Postgres，两者混用时 KV 管热点、Postgres 管事实。

## 动手实践

1. **打榜排行榜**：为每首歌维护 `["vote", songId]` 计数与一个 `["voteTotal"]` 汇总 key，投票接口用一次 atomic 同时更新两者。提示：sum 可以在一次 atomic 里对两个 key 各调一次。
2. **抢票压测**：模拟 50 人并发抢 10 张票，验证最终库存恰好为 0 且没有第 11 人成功；再把 check 拿掉重跑，观察超卖。提示：`Promise.all` 发起并发，`res.ok` 统计成功数。
3. **异步出票链路**：购票接口只做扣减与 enqueue，listenQueue 里完成出票写入与"死信"归档；手动抛错一次，观察重试行为。提示：在处理器里按 orderId 幂等写入，再用 `["deadLetter", "ticket"]` 键查看失败消息。最后对比本地 SQLite 与云端托管 KV 的行为差异，把结论记进笔记。
