---
order: 10
title: Bun 内置能力：SQLite、S3 与文件 I/O
module: 'bun'
category: 后端技术
difficulty: advanced
description: 深入 Bun.file 流式读写、bun:sqlite 预编译语句与事务实战，以及内置 S3 客户端管理演唱会素材。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'bun/002-BunQuickStart'
  - 'bun/003-BunBuiltinServerSQL'
  - 'bun/004-AdvancedRoadmap'
prerequisites:
  - 'bun/001-BunOverview'
  - 'bun/002-BunQuickStart'
---

## 前置知识

- [Bun 概览](/bun/001-BunOverview)：理解 Bun 作为运行时"一体多面"的定位，本文讲的是它内置能力中最常用的三块。
- [Bun 快速上手](/bun/002-BunQuickStart)：会运行 `bun run` 与单文件脚本，理解顶层 `await` 与 ESM 写法。
- [Bun 内置服务器、SQL 与数据库](/bun/003-BunBuiltinServerSQL)：已接触 `bun:sqlite` 的基础增删查改，本文向事务、性能与对象存储纵深推进。

## 学习目标

1. 能用 `Bun.file` 与 `Bun.write` 完成同步语义的异步文件读写，并解释它们快的原因。
2. 能管理 `bun:sqlite` 的预编译语句生命周期，使用命名参数编写安全的歌曲库查询。
3. 能用 `db.transaction()` 实现"扣库存 + 写订单"的购票事务，理解 WAL 模式对并发读的提升。
4. 能用内置 `S3Client` 上传、读取、签名演唱会素材，不再引入 aws-sdk 全家桶。
5. 能把文件 I/O、SQLite 与 S3 组合成一个"素材上传 + 本地缓存"的完整端点。

## 1. Bun.file 与 Bun.write：不需要思考的文件 I/O

Node 生态里读一个文件要在回调、Promise、Stream 三种 API 之间选型，还要担心编码与路径解析。Bun 把文件操作收敛成两个入口：`Bun.file(path)` 返回一个 `Blob`，`Bun.write(path, data)` 负责写入。它们底层直接调用操作系统的快速路径（`sendfile` 等），省掉多层包装。

```typescript
// files.ts：歌单缓存文件的读写
// 1) 读取：Bun.file 返回 Blob，惰性加载，调 .json() 才真正读盘
const setlist = await Bun.file('./data/setlist.json').json()

// 2) 文本与二进制同样自然
const readme = await Bun.file('./README.md').text()
const cover = await Bun.file('./assets/miku.png').arrayBuffer()

// 3) 写入：字符串、TypedArray、Blob、Response 都可以直接写
const written = await Bun.write(
  './data/cache/hot.json',
  JSON.stringify({ updatedAt: Date.now(), top: setlist.slice(0, 10) }),
)
console.log(`写入了 ${written} 字节`)

// 4) 大文件走流：一行接通文件流与响应流
const song = Bun.file('./assets/mero.mkv')
console.log(song.size, song.type) // 元信息无需读入内存
```

`Bun.file` 返回的对象实现了标准 `Blob` 接口，所以 `.text()` / `.json()` / `.arrayBuffer()` / `.stream()` 都可用——Web 标准 API 一套打天下，前端写惯的代码在服务端原样成立。`Bun.write` 还有一个细节：目标路径不存在时会**自动创建目录**，错误则统一抛异常，不需要 mkdir -p 前置步骤。判断文件存在用 `await Bun.file(path).exists()`，它是异步的，别再引入 `fs.existsSync`。

Blob 标准的真正威力在"接口互通"：`Request` 的 body 是 Blob、`Response` 的 body 是 Blob、`File` 继承自 Blob、S3 的 `s3.file()` 也是 Blob。于是"从请求收一个文件、直接写进磁盘或对象存储"全程不需要中间格式转换——本章第 5 节的整合代码里，`form.get('poster')` 拿到的 `File` 可以原样传给 `s3.write()`，一行类型转换都没有。把 Blob 当作这个生态的"通用物流箱"，文件、网络、数据库三条线路就统一了：所有 I/O 能力都在搬运同一种东西，学到一处、处处可用。

这种互通还能玩得更省：`Bun.write` 的第二个参数可以直接放一个 `fetch` 的响应——`await Bun.write('./posters/mirai.png', await fetch(cdnUrl))`，下载与落盘一步完成，底层走流式管道，响应体不会整块堆进内存。定时同步远端素材、把用户上传的封面转存本地缓存这类需求，一行代码解决。对照 Node 里"fetch -> arrayBuffer -> fs.writeFile"三段式，你会发现 Bun 文档里反复强调的"快"，一半来自内核路径，另一半正来自这种"接口之间零翻译"的设计。

## 2. bun:sqlite 进阶：预编译语句与命名参数

第 003 篇已经用过 `db.query()` 的基础形态，这里补上它的真实定位：`db.query(sql)` 是**预编译语句的缓存工厂**——同一个 SQL 字符串只会编译一次，之后每次调用都复用已编译的语句。高并发下这正是性能分水岭。

```typescript
// db.ts：歌曲库的访问层
import { Database } from 'bun:sqlite'

// 建议开启 WAL：写不再阻塞读，读多写少的业务几乎白拿性能
export const db = new Database('vocalive.db')
db.exec('PRAGMA journal_mode = WAL')

// 预编译 + 命名参数：:min 与 :singer 由对象提供，可读且防注入
const listBySinger = db.query(`
  SELECT s.id, s.name, v.name AS singer, s.plays
  FROM songs s JOIN vsingers v ON v.id = s.vsinger_id
  WHERE v.name = :singer AND s.plays >= :min
  ORDER BY s.plays DESC
`)

export function hotSongs(singer: string, minPlays = 10_000) {
  // .all() 返回全部行；同名语句第二次调用直接复用编译产物
  return listBySinger.all({ ':singer': singer, ':min': minPlays })
}

export function getSong(id: number) {
  return db.query('SELECT * FROM songs WHERE id = $id').get({ $id: id })
}
```

三种占位符（`$name`、`:name`、`@name`）都映射到对象的键，语义相同，团队统一一种即可。返回值 API 有一张小速查表：`.all()` 全部行、`.get()` 第一行（无结果返回 `null`）、`.run()` 只关心影响行数、`.values()` 只要值不要列名。初学者最常混淆的是 `.get()` 在无结果时返回 `null` 而不是抛错——调用处要做空值分支，不能假设每首歌都存在。

把它与第 003 篇的写法对照，还有一个升级点：位置参数（`?` 加一串位置实参）在列数增多后可读性骤降，命名参数则让 SQL 与调用处互相印证——SQL 里写 `:singer`，调用处就传 `':singer': value`，参数错位这种经典 bug 从机制上消失了。访问层封装的最后一块拼图是类型：把查询结果映射成 TypeScript 接口（`hotSongs` 返回 `{ id: number; name: string }[]`），配合 `bun:sqlite` 自带的类型定义，从 SQL 到调用方的整条链路都有提示。SQLite 本体是 C 写的，Bun 原生绑定后的执行速度在常见 ORM 之上——省下的不只是依赖，还有每一层抽象的开销。

## 3. 事务实战：一次购票的两步写

"扣库存 + 写订单"是事务存在的理由：两步必须同生共死，否则要么票卖了单没记，要么单记了票还在。`bun:sqlite` 提供声明式事务包装，普通函数一包就成了事务体。

```typescript
// ticket.ts：事务购票
import { db } from './db.ts'

// db.transaction 把函数包成事务体：内含 SQL 全部成功则提交，抛错则整体回滚
const purchase = db.transaction((concertId: string, userId: string) => {
  const stockRow = db
    .query('SELECT stock FROM concerts WHERE id = $id')
    .get({ $id: concertId })

  if (!stockRow || stockRow.stock <= 0) {
    throw new Error('SOLD_OUT') // 抛错 -> 整个事务回滚，库存不会被误减
  }

  db.run('UPDATE concerts SET stock = stock - 1 WHERE id = $id', { $id: concertId })
  db.run(
    'INSERT INTO orders (concert_id, user_id, created_at) VALUES ($c, $u, $t)',
    { $c: concertId, $u: userId, $t: Date.now() },
  )

  // 函数返回值就是事务的返回值
  return { concertId, userId, remaining: stockRow.stock - 1 }
})

export function buyTicket(concertId: string, userId: string) {
  try {
    return { ok: true as const, order: purchase(concertId, userId) }
  } catch (err) {
    const reason = err instanceof Error && err.message === 'SOLD_OUT' ? '已售罄' : '购票失败'
    return { ok: false as const, reason }
  }
}
```

`db.transaction(fn)` 有一个容易忽略的细节：SQLite 的单个连接是**串行**的，事务天然互斥，因此这套"扣减库存"在单机 SQLite 下是安全的；但代价是写操作会串行排队。读多写少的票务查询页毫无压力（WAL 允许读写并行），真正的海量抢票场景则需要把库存预热到内存队列或改用支持行级锁的数据库——工具的能力边界要和业务量级对齐。

用 `db.transaction` 时还应注意函数的边界划分：事务体应该"短而完整"——只包住必须原子执行的几条 SQL，把校验、通知、写日志这类非关键动作放在事务外。示例里把"读库存、扣减、插订单"三步包进一个函数正是这个原则：多一步无谓的 IO（比如在事务里调外部 HTTP 接口），连接就被无谓占用，排队延迟会被放大到所有并发写者身上。异常的语义也顺带明确：事务内抛出的任何错误都会触发回滚，所以用 `throw new Error('SOLD_OUT')` 表达业务失败是安全的——错误信息就成了业务状态机的一部分，由调用方捕获后翻译成用户语言。

## 4. S3 客户端：对象存储也内置了

从 Bun 1.2 起，对象存储客户端直接进了运行时：`Bun.S3Client`。上传、下载、签名 URL、删除、批量列举，全部零依赖——不必再把 aws-sdk 的几百个传递依赖拖进 lockfile。

```typescript
// s3.ts：演唱会素材的对象存储访问层
import { S3Client } from 'bun'

// 凭据可显式传入，也可省略：Bun 会自动读取 S3_ACCESS_KEY_ID 等环境变量
const s3 = new S3Client({
  bucket: 'vocalive-assets',
  region: 'ap-northeast-1',
  // 自建兼容存储（MinIO 等）再加 endpoint 与 virtualHostedStyle
})

// 1) 上传：字符串、Blob、ArrayBuffer 通吃
await s3.write('posters/mirai-2026.json', JSON.stringify({ title: '魔法未来 2026' }))

// 2) 读取：s3.file 返回类 Blob 对象，与本地 Bun.file 同一套 API
const poster = await s3.file('posters/mirai-2026.json').json()

// 3) 预签名 URL：把下载授权交给前端，服务端不转发大流量
const url = s3.presign('audio/senbonzakura.flac', { expiresIn: 3600 })
console.log('试听链接（1 小时有效）:', url)

// 4) 探测与删除
const has = await s3.exists('posters/mirai-2026.json')
if (has) await s3.delete('posters/mirai-2026.json')
```

`S3Client` 与本地文件的 API 刻意对齐（`s3.file()` 的行为等同于 `Bun.file()`），意味着"本地缓存目录"和"远端对象桶"可以在业务代码里互换。预签名 URL 是省流量的关键设计：音频试听、海报下载这类大文件，服务端只签发限时 URL，真正的字节流从对象存储直达浏览器。若素材有前缀层级（如按歌姬分目录），`S3Folder` 客户端可以把前缀固定下来，写法更短。

实际接入时最常纠结的是"兼容存储怎么办"：MinIO、云厂商的 S3 兼容层都靠 `endpoint` 指向自定义地址，必要时配合 `virtualHostedStyle: false` 切回路径风格寻址。凭据来源要立规矩：本地开发读 `.env`（`S3_ACCESS_KEY_ID` 等前缀变量会被自动识别），生产环境由部署平台的密钥注入——代码里出现明文密钥的插件代码评审必须打回。最后，写操作默认覆盖同名键，"重复上传同键"是覆盖还是报错取决于业务语义：海报用 UUID 键天然不冲突，头像固定键则期待覆盖，行为差异要在设计阶段就想清楚。

## 5. 实战整合：素材上传端点与本地缓存

把三块能力串成一个完整端点：接收上传的海报，写进 S3，同时在本地留一份小尺寸元数据缓存，供列表页快速读取。

```typescript
// api.ts：素材上传与列表
import { Database } from 'bun:sqlite'
import { S3Client } from 'bun'

const s3 = new S3Client({ bucket: 'vocalive-assets' })
const db = new Database('vocalive.db')

Bun.serve({
  port: 3000,
  async fetch(request) {
    const { pathname } = new URL(request.url)

    // 上传：multipart 表单里的 poster 字段直达对象存储
    if (request.method === 'POST' && pathname === '/posters') {
      const form = await request.formData()
      const file = form.get('poster')
      if (!(file instanceof File)) {
        return Response.json({ error: '缺少 poster 文件' }, { status: 400 })
      }
      const key = `posters/${crypto.randomUUID()}-${file.name}`
      await s3.write(key, file) // File 本身就是 Blob，直接写入 S3
      await db.run('INSERT INTO posters (key, name, size) VALUES ($k, $n, $s)', {
        $k: key,
        $n: file.name,
        $s: file.size,
      })
      return Response.json({ key, presigned: s3.presign(key, { expiresIn: 600 }) }, { status: 201 })
    }

    // 列表：从本地 SQLite 读元数据（快），前端再用预签名 URL 取图（省）
    if (request.method === 'GET' && pathname === '/posters') {
      const rows = db.query('SELECT key, name, size FROM posters ORDER BY rowid DESC').all()
      return Response.json(rows)
    }

    return new Response('Not Found', { status: 404 })
  },
})
```

观察数据的走向：**大字节流**（图片本体）只经过一次内存——`request.formData()` 到 `s3.write()`，全程是 Blob 引用而非复制；**小元数据**（键名、文件名、大小）落进 SQLite 供列表查询。这就是内置能力组合的设计取向：每块能力都围绕 Blob 标准接口设计，彼此之间传递的是引用，不是拷贝。

把这个端点补成生产级，还有三处待打磨。一是**上传校验**：`file.type` 与大小上限在写 S3 之前检查，拒绝非图片与超大文件，避免桶被当免费网盘；二是**幂等上传**：前端重试导致同素材双份时，用内容哈希做键（`crypto.subtle.digest` 算 SHA-256 再拼键名）可天然去重；三是**错误语义**：S3 写失败返回 502、校验失败返回 400、库写失败返回 500，让调用方能按状态码重试或提示。内置能力给了趁手的零件，可靠性仍然要靠这些朴素的判断组装——这大概是本章最想传达的一句实话。

## 6. 何时仍需要外部数据库

`bun:sqlite` 是内嵌库（进程内、文件级），它的舒适区是单机或读多写少的服务。遇到以下信号就该考虑外部数据库：多实例水平扩容（SQLite 文件无法共享）、高频并发写（单连接串行成为瓶颈）、需要在线备份与主从。Bun 同样提供了基于 C 驱动的 `Bun.sql`（PostgreSQL/MySQL 支持）与内置 Redis 客户端（见 003 篇），升级路径仍在"零依赖"哲学之内：从 `bun:sqlite` 到 `Bun.sql`，业务 SQL 大多原样迁移，改的是连接方式与部署形态。

升级的时机判断可以量化：看两个数字——单实例的写入峰值 QPS 与多副本部署的需求。写入峰值在几百 QPS 以内、部署形态是单实例或"一写多读缓存"，`bun:sqlite` 都在舒适区；写入逼近千级 QPS 或团队要求多实例无状态部署，就该把 concert、orders 这类热点表迁去 PostgreSQL，而海报、日志这类大对象顺路归入 S3。有意思的是，这份"存储选型清单"里 Bun 内置能力已经覆盖了前两级：内嵌 SQLite 与对象存储各就各位，剩下的决策只是"什么时候引入真正的数据库服务"，而不是"每个项目都从装数据库开始"。

## 易错点与最佳实践

1. **把 `.get()` 的 null 当数据用**：查询无结果返回 `null`，直接 `.plays` 会抛 `TypeError`。访问层返回前做空值归一，调用方拿到稳定形状。
2. **忘记开 WAL**：默认 journal 模式下写会阻塞读，表格页偶发卡顿多半是这个原因。建库后第一行 `PRAGMA journal_mode = WAL` 当作肌肉记忆。
3. **在热路径里重复编译 SQL**：把 SQL 字符串写进循环内的 `db.prepare()` 会反复编译。用 `db.query()` 的语句缓存，或把语句提升到模块顶层。
4. **S3 凭据硬编码**：凭据交给环境变量（`S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_REGION` / `S3_BUCKET`），代码里只配置 endpoint 这类非敏感项。
5. **预签名 URL 过期设置失当**：试听链接给 1 小时以上等于半公开；分发即时的封面图可以短一些。过期策略要按素材敏感度分级。

## 本篇小结

1. `Bun.file` / `Bun.write` 把文件 I/O 收敛为 Blob 标准接口，底层走操作系统快速路径，写目录自动创建。
2. `bun:sqlite` 的 `db.query()` 是预编译语句缓存，命名参数防注入，`.all()` / `.get()` / `.run()` / `.values()` 各司其职。
3. `db.transaction()` 用普通函数表达事务，抛错即回滚；WAL 模式让读多写少业务免于读写互锁。
4. `Bun.S3Client` 内置对象存储客户端：write / file / presign / exists / delete 零依赖，预签名 URL 让大流量绕开服务端。
5. 数据组合的取向是"Blob 引用传递"：大字节流直达对象存储，小元数据进 SQLite，每块能力各守其位。

## 动手实践

1. **歌单缓存层**：实现一个 `getSetlistCached()`：优先读本地 `cache/hot.json`，超过 60 秒则重新计算并 `Bun.write` 回写。提示：用 `Bun.file(path).exists()` 与文件 mtime 判断新鲜度。
2. **购票压测**：为事务版购票端点写一个 100 并发的压测脚本，验证库存永远不会减成负数；再把 UPDATE 与 INSERT 拆出事务重跑，观察数据不一致。提示：对比两种跑法的最终 `stock` 与 `orders` 计数。
3. **素材管理小工具**：用 `S3Folder` 实现按歌姬分目录的海报上传与列举，给每张图生成 5 分钟有效的预签名 URL。提示：MinIO 起一个本地兼容端点即可，无需真实云账号。
