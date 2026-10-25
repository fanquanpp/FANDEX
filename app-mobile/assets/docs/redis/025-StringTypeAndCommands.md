---
order: 30
title: String 数据类型与命令
module: 'redis'
category: 数据库
difficulty: beginner
description: String 的三种内部编码（int/embstr/raw）、SET 全家桶（NX/XX/EX/PX/GET）与 APPEND/SETRANGE/STRLEN 等命令族，以及「为什么 SET NX EX 能替代 SETNX+EXPIRE」。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：String（字符串）数据类型——Redis 最基础的类型，覆盖内部编码切换与 SET 为核心的命令族。
- **解决什么问题**：缓存对象、计数器载体、分布式锁、幂等令牌、会话 token 全都建在 String 上；把「原子性设置 + 条件判断 + 过期」组合成单条命令，是大量正确性问题的根。
- **什么时候用到**：几乎所有 Redis 项目的第一步；特别是验证码防重放、会话管理、接口幂等这三个高频工程场景。

前置：会 redis-cli 连接（redis/010-OverviewCoreDataStructure）；SDS 内存布局的底层细节在《字符串 SDS 结构》（redis/260-StringSDSStructure），本篇讲命令行为层，两者互补。

## 1. 心智模型：String 是「字节数组 + 三种皮肤」

Redis 的 String 不是 C 字符串，而是带长度头的 SDS（简单动态字符串）——这也是它能存二进制（图片字节、序列化对象）的原因。对外一个类型，对内三种编码：

```
SET k 12345      → 编码 int    （值能放进 long long，8 字节有符号整数）
SET k hello      → 编码 embstr （长度 <= 44 字节，redisObject 与 SDS 一次分配）
SET k <45+字节>  → 编码 raw    （长度 > 44 字节，对象头与 SDS 分开两次分配）
```

用 `OBJECT ENCODING` 现场验证：

```bash
127.0.0.1:6379> SET n 42
OK
127.0.0.1:6379> OBJECT ENCODING n
"int"
127.0.0.1:6379> SET s "hello"
OK
127.0.0.1:6379> OBJECT ENCODING s
"embstr"
127.0.0.1:6379> SET big "$(python3 -c 'print("x"*45)')"
OK
127.0.0.1:6379> OBJECT ENCODING big
"raw"
```

三个编码各有一句话解释：

- **int**：`INCR/DECR` 类命令要求值是整数，int 编码让算术命令直接在指针上做（省一次字符串解析）。值为纯数字字符串时自动落在这个编码。
- **embstr**（embedded string）：对象头（16 字节）与字符串数据（3 字节头 + 内容 + 结尾符）拼进**一块连续内存**（jemalloc 的 64 字节分配单元：16+3+44+1=64），读时一次 cache line 命中。44 这个阈值就是这么来的。
- **raw**：超过 44 字节后拆成两块独立内存，多一次指针跳转，但支持就地修改。

**易错点（编码转换是单向的）**：embstr 是只读设计——对 embstr 键执行 `APPEND` 会立刻转成 raw，且**不会转回去**。频繁追加的场景（日志拼接、计数器字符串）从第一个字节起就是 raw，不必纠结；反过来，短小且只读的值保持 embstr 是默认且正确的行为。

```
 embstr（<=44B，一次分配，只读）
   │  任何写命令（APPEND/SETRANGE…）
   ▼
 raw（两次分配，可就地修改）—— 永不转回 embstr
```

## 2. SET 全家桶：一条命令解决「设置 + 条件 + 过期」

（本节为全篇核心，命令语义逐个拆。）

### 2.1 基本形态与选项

```
SET key value [NX | XX] [GET] [EX seconds | PX milliseconds | EXAT unix-sec | PXAT unix-ms | KEEPTTL]
```

| 选项   | 含义                       | 典型用途                     |
| :----- | :------------------------- | :--------------------------- |
| NX     | 键**不存在**才设置         | 加锁、防重复提交             |
| XX     | 键**存在**才设置           | 只更新已有数据，不造新键     |
| GET    | 返回旧值（6.2+）           | 原子换值并取旧值             |
| EX/PX  | 秒/毫秒过期                | 一切临时数据                 |
| KEEPTTL| 保留原 TTL（6.0+）         | 刷新值但不重置过期时钟       |

失败时的返回值：NX/XX 条件不满足返回 `nil`（Python/Java 里是 None/null），**不是报错**——业务代码要按返回值分支，不能假设 SET 总成功。

### 2.2 为什么 SET NX EX 必须替代 SETNX + EXPIRE

老教程里的两步写法：

```bash
SETNX lock:order:1 1        # 步骤一：不存在才设置
EXPIRE lock:order:1 30      # 步骤二：设置过期
```

致命缺陷：这是**两条命令**。第一条执行后、第二条执行前客户端崩溃，这把锁就永远不会过期——死锁。单线程救不了你：Redis 保证的是单条命令原子，不保证客户端两条命令之间不断。

正确写法把条件与过期压进一条命令：

```bash
SET lock:order:1 uuid-7f3a NX EX 30
# OK        → 拿到锁
# (nil)     → 已被别人持有
```

单条命令在 Redis 单线程执行模型下天然原子，「设置失败」与「忘记过期」两个问题同时消失。《分布式锁与 Redlock》（redis/250-RedlockDistributedLock）在此基础上继续讲释放与续期。

**同款陷阱清单**（模式相同，值得记成一页）：

```
SETNX + EXPIRE          → 换成 SET NX EX
INCR + EXPIRE（首次）   → 换成 Lua 判断返回值 1 时 EXPIRE，或 SET NX EX 后 INCR
HSET + EXPIRE（哈希过期）→ 换成 Lua 两键打包，或改用带 TTL 的整体序列化值
```

### 2.3 MSET / MGET 与原子性边界

```bash
MSET user:1:name "Alice" user:1:city "Beijing"   # 一次写多个键
MGET user:1:name user:1:city                     # 一次读多个键，返回值按入参顺序对齐

# MSET 原子：要么全部生效要么全不生效（单线程内多键打包执行）
# MGET 省的是往返：3 个键 1 次 RTT，对比 3 次 GET 的 3 次 RTT
```

**易错点一**：MSET/MGET **没有** NX/EX 版本（没有 MSETNX EX 这种组合），带过期的批量写入要用 Pipeline 包多条 SET（redis/230-PipeTransactionAtomic），或 Lua 脚本。

**易错点二**：集群模式下 MGET 的多个键必须同槽，否则报 CROSSSLOT——键设计时用 Hash Tag 收拢（redis/220-RedisClusterHashSlot §1.3）。

### 2.4 值内操作命令族

```bash
APPEND log:today "line1\n"     # 追加，返回总长度（不存在则当作空串创建）
STRLEN log:today               # 字节长度（不是字符数！中文 UTF-8 一字 3 字节）

SETRANGE key 10 "Redis"        # 从偏移 10 覆盖写入；空洞补零字节，文件式用法
GETRANGE key 0 4               # 取 [0,4] 闭区间子串，两端都含
```

`SETRANGE` 的一个巧用法是「预分配」：先 `SETRANGE bigfile 10485759 x`（写到最后一个字节），Redis 会把中间空洞填零字节，一次性分配满 10MB 的 SDS——之后任意位置的 SETRANGE 都不用再扩容。这模仿了文件系统的 fallocate，适合生成固定大小的二进制模板。

`GETRANGE` 与 Python 切片的差异：它是**字节**下标且闭区间；对含中文的值做子串截取时按字节切可能切出非法 UTF-8 序列，展示层要做一次解码容错。

### 2.5 SET 的 GET 选项与 PERSIST

```bash
# 6.2+ 原子「换值取旧值」：扣减库存前留底的场景不用再 GET+SET 两步
SET inventory:sku9 12 GET
# 1) "13"        ← 旧值
# 或 (nil)       ← 键原本不存在
```

注意 `SET key val GET` 在键不存在时返回 nil 而旧代码常误判为「取值成功但为空」。`PERSIST key` 移除过期时间让它变永久键——常用于「活动键转正式键」的配置切换，方向别搞反：没有 `SET key val PERSIST` 这种组合。

## 3. 工程场景一：短信验证码（TTL + NX 防重放）

需求：发送短信验证码；60 秒内不重复发（防骚扰），5 分钟有效（防重放），验证一次即失效。

```python
import random

def send_code(phone):
    # 键一：发送频控——NX 保证 60 秒窗口内只有第一次请求真正发短信
    ok = r.set(f"sms:limit:{phone}", 1, nx=True, ex=60)
    if not ok:
        return {"error": "发送过于频繁，请 60 秒后再试"}

    code = f"{random.randint(0, 999999):06d}"
    # 键二：验证码本体——EX 保证 5 分钟后自动消失，不留活口
    r.set(f"sms:code:{phone}", code, ex=300)
    sms_provider.send(phone, code)
    return {"ok": True}

def verify_code(phone, code):
    # GETDEL（6.2+）：读取与删除原子完成，天然防重放——第二次提交同一码必失败
    stored = r.getdel(f"sms:code:{phone}")
    return stored is not None and stored == code
```

逐段讲为什么：

- **频控用 NX**：`SET NX EX 60` 返回 nil 即「60 秒内已发过」，这条判断与写入是一条命令，两个并发请求只有一个能通过——用 GET 再判断再 SET 就存在并发竞态。
- **验证码用 EX 不用手动清理**：过期即删，不需要定时任务扫表。TTL 的语义就是「数据生命周期」，凡是「 X 分钟后作废」的数据第一反应都该是 EX。
- **验证用 GETDEL 而不是 GET**：如果只 GET，攻击者拿到一次有效码可以在 5 分钟内反复提交（重放）；GETDEL 让验证码变成一次性票据。Redis 6.2 之前的等价写法是 Lua 脚本（GET + DEL 原子化），思路相同。
- **易错点**：验证码值要定长格式化（`:06d`），否则 "1234" 与 "001234" 的字符串比较问题会在客户端出现；以及所有键都带手机号前缀隔离，避免「用户 A 的频控挡住用户 B」。

## 4. 工程场景二：登录会话 token

需求：登录后签发 token，服务端存会话；支持「活跃续期」（滑动过期），登出立即失效，会话信息能扩展。

```python
import secrets, json

def create_session(user_id):
    token = secrets.token_urlsafe(32)
    session = {"user_id": user_id, "login_at": int(time.time()), "roles": ["viewer"]}
    r.set(f"session:{token}", json.dumps(session), ex=7200)   # 2 小时
    return token

def touch_session(token):
    # 滑动过期：活跃用户不用重新登录
    r.expire(f"session:{token}", 7200)

def get_session(token):
    raw = r.get(f"session:{token}")
    if raw is None:
        return None
    touch_session(token)          # 读即续期（读多写少场景可改成概率续期）
    return json.loads(raw)

def logout(token):
    r.delete(f"session:{token}")  # 登出即失效，JWT 方案做不到的事
```

为什么选 String 存 JSON 而不是 Hash 存字段：会话是「整体读写、整体过期」的单元，没有字段级更新需求——String 序列化一次网络往返搞定；Hash 适合字段要独立读写的对象（如购物车，见 redis/030-HashCommand）。

设计细节：

- **键里带随机 token 而不是 user_id**：一个用户多端登录互不干扰，登出单端只删一个键。若按 `session:{user_id}` 设计，多端登录会互相覆盖。
- **「读即续期」的成本**：每次读多一条 EXPIRE 命令（可并入 Pipeline）。QPS 极高时改成概率续期（`if random.random() < 0.1: touch`），统计上等效且省流量。
- **大促场景的会话预热与降级**：会话键属于可丢数据，Redis 挂了可选「降级为无登录态」而不是全站 500——分层设计时把「会话」与「业务数据」放不同实例。

## 5. 工程场景三：接口幂等令牌

需求：支付下单接口，客户端因网络重试会重复提交；要求同一笔操作只执行一次。

「token 进DB前先取号」模式：

```python
def issue_token():
    token = secrets.token_urlsafe(16)
    r.set(f"idempotent:{token}", "init", ex=600)   # 取号：10 分钟有效
    return token

def submit_order(token, order):
    # 用 SET NX 语义「消费」令牌：init → processing 只有一个请求能成功
    ok = r.set(f"idempotent:{token}", "processing", xx=True, get=True)
    # xx=True 键必须存在；get=True 返回旧值
    if ok is None:
        return {"error": "令牌无效或已过期"}
    if ok != b"init" and ok != "init":
        # 已被处理中/处理完成：拒绝二次执行（前端应轮询结果）
        return {"error": "订单正在处理，请勿重复提交"}

    try:
        result = create_order(order)               # 真正的业务（可能耗时）
        r.setex(f"idempotent:{token}:result", 600, json.dumps(result))
        return result
    except Exception:
        # 失败要回滚令牌为 init，允许客户端换 token 或重试
        r.set(f"idempotent:{token}", "init", xx=True, ex=600)
        raise
```

逐行讲关键设计：

- **取号与消费分离**：先领 token 再提交，token 本身就是「客户端预先生成的唯一键」——这正是「防重复提交」与「防重放」的分界：重试会带同一个 token（幂等放行或拒绝），攻击重放通常拿不到新号。
- **`SET xx get` 的组合语义**：只在键存在时改值并返回旧值，一个命令同时完成「存在性校验 + 状态机推进」。旧值是 `init` 才放行，是 `processing`/其他就拒绝——CAS（比较并交换）的 Redis 版。
- **状态写回失败路径**：异常时把令牌置回 `init`，否则一次业务抖动会烧掉客户端手里的号，用户只能重新走取号流程。
- **结果缓存键**：`{token}:result` 让「重复提交」的第二个请求有东西可查（配合前端轮询），而不是简单报错。
- **易错点**：这套设计幂等的是「提交」这一步；如果 `create_order` 成功后、写 result 前进程崩溃，令牌停在 processing——生产上要有对账任务扫 processing 超时的令牌到业务侧反查真实状态。

## 6. 动手实践

任务一：观察编码转换。分别 `SET` 一个 44 字节与 45 字节的字符串查 `OBJECT ENCODING`；然后对 44 字节的 embstr 键执行 `APPEND` 再查编码，验证「embstr 写一次就变 raw 且不可逆」。

<details>
<summary>任务一参考观察</summary>

44 字节是 embstr、45 字节是 raw；对 embstr 执行 APPEND 后编码变为 raw，且即使 APPEND 后长度回落到 44 以内编码仍是 raw。44 字节边界的来历：jemalloc 64 字节分配单元 = 16（redisObject）+ 3（sdshdr8 头）+ 44（内容）+ 1（结尾符）。想深挖内存布局读《字符串 SDS 结构》（redis/260-StringSDSStructure）。
</details>

任务二：复现 SETNX 死锁。终端 A 执行 `SETNX lock:demo 1`，**不要**执行 EXPIRE（模拟客户端在两步之间崩溃）；再写一个每秒检查 `TTL lock:demo` 的循环，确认它永远是 -1（永不过期）；然后用 `SET lock:demo2 x NX EX 5` 重复实验，观察 5 秒后 TTL 变 -2（键已删除）。

<details>
<summary>任务二参考观察与结论</summary>

TTL 返回 -1 表示「键存在但无过期时间」，正是 SETNX+EXPIRE 两步间断电留下的死锁现场；-2 表示键不存在。结论：带过期语义的「条件设置」必须单命令完成（SET NX EX），凡是「先判断后写」的两步 Redis 操作都要用 SET 的选项或 Lua 合并。
</details>

任务三：把幂等令牌示例的「消费令牌」改写成纯 `SET ... NX` 版本（不用 xx+get），对比两种写法各自能防什么、防不了什么。

<details>
<summary>任务三参考分析</summary>

纯 NX 版：`SET idempotent:{t} processing NX EX 600`——能防「并发重复提交」（只有第一个请求能设置成功），但**防不了**「令牌被用过后的第三次重放」（NX 对已存在键永远失败，但失败原因分不清是处理中还是已完成），也无法在业务失败后让同一令牌重试（键已存在）。结论：需要状态机语义（init/processing/done）时用 xx+get 或 Lua；只需要「一次放行」时 NX 足够——按需求选复杂度。
</details>

## 7. 下一步与延伸阅读

- 《字符串 SDS 结构》（redis/260-StringSDSStructure）：int/embstr/raw 背后的内存布局与扩容策略；
- 《数值与统计命令》（redis/050-NumberStats）：int 编码上的 INCR 家族与计数器模式；
- 《键管理与过期策略》（redis/020-KeyManagement）：EX/KEEPTTL 之外的过期机制全景；
- 《管道、事务与原子性》（redis/230-PipeTransactionAtomic）：批量 SET 的正确打包方式。

## 参考与致谢

- Redis 官方文档 Strings：<https://redis.io/docs/latest/develop/data-types/strings>（Redis Public Source License / CC-BY-SA 4.0 授权文档），编码说明与命令列表；
- Redis 官方命令页 SET：<https://redis.io/docs/latest/commands/set/>（同上许可），NX/XX/GET/EX/PX/KEEPTTL 选项语义；
- 本篇正文为教学重写，命令行为以官方文档为准（SET 的 GET 选项与 GETDEL 为 6.2+，KEEPTTL 为 6.0+）。
