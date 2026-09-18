---
order: 360
title: LISTEN/NOTIFY：数据库内置的消息总线
module: 'postgresql'
category: 数据库
difficulty: intermediate
description: LISTEN/NOTIFY 从语法到生产：事务性通知语义、psql 与驱动两种接收方式、触发器联动与 SKIP LOCKED 任务队列模式、载荷限制与队列积压治理。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'postgresql/380-TriggerEventTrigger'
  - 'postgresql/260-ParallelQuery'
  - 'postgresql/160-SystemArchitecture'
prerequisites:
  - 'postgresql/020-PsqlCLI'
---

## 问题引入：数据变了，怎么"喊一嗓子"

经典联动场景：订单表状态变更后，缓存服务要失效对应缓存、搜索服务要更新索引。轮询方案（每秒查一次"有没有变化"）延迟高且空转浪费。**LISTEN/NOTIFY** 是 PostgreSQL 内置的发布订阅机制：`NOTIFY` 发出一条带通道名与载荷的轻量通知，所有正在 `LISTEN` 该通道的会话即时收到——**数据库本身就是消息总线**，不引入任何中间件。

心智模型一句话：**它传递的是"发生了什么"的信号（几 KB 内的小载荷），不是数据本身**。大块数据先落表，通知里只带 ID。

## 语法骨架

```sql
-- 发送方（两种等价形式）
NOTIFY channel_name;                          -- 无载荷
NOTIFY channel_name, '{"id": 1001}';          -- 带载荷（字符串）
SELECT pg_notify('channel_name', '{"id": 1002}');  -- 函数形式：通道名可用参数拼接

-- 接收方
LISTEN channel_name;        -- 当前会话开始监听
UNLISTEN channel_name;      -- 停止监听该通道
UNLISTEN *;                 -- 停止全部

-- 自查
SELECT * FROM pg_listening_channels();           -- 本会话监听的通道
SELECT pg_notification_queue_usage();            -- 通知队列使用率（0 到 1）
```

## 关键语义一：通知是事务性的

```sql
BEGIN;
UPDATE orders SET status = 'paid' WHERE id = 1001;
NOTIFY order_event, '{"order_id": 1001, "status": "paid"}';
ROLLBACK;    -- 通知不会发出！
```

**NOTIFY 只有在所在事务成功提交时才真正投递**，回滚则通知凭空消失。这个语义是它最优雅的地方：通知与数据变更天然原子——"通知了但数据没改"或"改了但通知丢了（在提交前的崩溃窗口内）"两类消息系统经典难题在这里不存在。代价也明确：它不是可靠投递（无重试、无持久化），消费者离线期间的通知**不会补发**，恢复在线只能收到之后的新通知。需要"必达"的场景，请把事件先落表（本篇末尾的任务队列模式），NOTIFY 只当"来活了"的铃声。

## 关键语义二：载荷与队列限制

1. **载荷上限 8000 字节**（8.0 起从 8000 提升前是字符串长度限制，通道名 63 字节）——传 ID 不传数据；
2. **通知走内存队列**，容量约 8GB 总量与 `max_connections` 相关，单个监听会话消费不动时 `pg_notification_queue_usage()` 会攀升——超过 0.5 就要查消费端健康度；队列满时发送方会报错；
3. 一个事务发多条同名通知会被合并去重（同通道同载荷只投一次）——依赖"每条必达"的语义设计要避开这一点。

## 两种接收方式

**psql 手工验证**（学习与排障最快路径）：

```sql
-- 会话 A
LISTEN order_event;
-- 会话 B 执行：NOTIFY order_event, 'hello';
-- 会话 A 的 psql 立即打印：
-- Asynchronous notification "order_event" with payload "hello" received
```

**应用程序驱动**：接收是异步的——libpq 用 `PQnotifies()`，JDBC 用 `PGNotification`，node-postgres 在连接上挂 `notification` 事件。多数驱动需要连接上有活动才会处理通知，惯用做法是监听线程定期执行一个空查询（如 `SELECT 1`）或用驱动的专用等待 API（如 JDBC 的 `checkNotifications` 循环、node-pg 的专用 await 通知模式）。跨语言的共同心法：**LISTEN 占用的连接是长连接，别从连接池里随便借一个来监听**——专门开一条监听连接。

## 杀手级组合：触发器 + NOTIFY

让"表变更自动广播"完全数据库侧闭环：

```sql
CREATE OR REPLACE FUNCTION notify_order_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('order_event',
    json_build_object('id', NEW.id, 'action', TG_OP)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_notify
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION notify_order_change();
```

触发器语法细节见 [触发器](/postgresql/380-TriggerEventTrigger)；这里注意 `PERFORM`（plpgsql 里执行无返回值语句）与 `json_build_object` 组装载荷的惯用法。

## 实战模式：SKIP LOCKED 任务队列

LISTEN/NOTIFY + 表 + `FOR UPDATE SKIP LOCKED` 是 postgreSQL 生态著名的轻量任务队列配方（很多自研任务系统以此为核心）：

```sql
-- 生产者：任务落表（持久化、可追溯）+ 通知（实时唤醒）
INSERT INTO task_queue (task_type, payload) VALUES ('email', '{"to": "u@e.com"}');
NOTIFY task_available;

-- 消费者：LISTEN task_available；收到通知后抢占式取任务
SELECT id, payload FROM task_queue
WHERE status = 'pending'
ORDER BY id
FOR UPDATE SKIP LOCKED     -- 多消费者并发时不互相阻塞，各抢各的
LIMIT 1
FOR UPDATE;                -- 锁住选中的行（与上一行合并写法见驱动实现）
-- 处理成功后 UPDATE status = 'done'
```

这个配方的精髓是**分工明确**：表负责可靠存储（消费者挂了任务还在），NOTIFY 负责低延迟唤醒（不用轮询），SKIP LOCKED 负责多消费者的并发安全。它覆盖了"需要必达 + 实时"的大多数内部任务场景，也是评估"要不要引入 RabbitMQ"前应当先试的零依赖方案。

## 动手环节：两分钟跑通全链路

```sql
-- 打开两个 psql 会话 A/B

-- 会话 A：监听
LISTEN demo;

-- 会话 B：发送
NOTIFY demo, 'first message';
-- 会话 A 立刻显示通知

-- 会话 B：事务性验证
BEGIN;
NOTIFY demo, 'will vanish';
ROLLBACK;
-- 会话 A 毫无动静——事务语义亲测

-- 会话 B：载荷超限验证
SELECT pg_notify('demo', repeat('x', 9000));
-- ERROR: payload string too long —— 记住 8000 上限

-- 会话 B：队列使用率
SELECT pg_notification_queue_usage();   -- 接近 0（消费及时时）
```

## 常见困惑

**"LISTEN/NOTIFY 能替代 RabbitMQ 吗？"**——看需求矩阵：同实例内、允许"尽力而为"、载荷小 → 完全够用且零运维；跨服务跨实例、需要持久化重试/死信/多租户 → 专业消息中间件。中间态就是上面的"表 + 通知"配方，可靠性由你的表设计保证。

**"通知收不到/延迟高，怎么排查？"**——三条常见原因按序查：监听会话是否真的还活着（长连接被代理/防火墙静默掐断是高发事故，加心跳）；驱动是否需要轮询触发接收；`pg_notification_queue_usage()` 是否逼近上限（消费端处理太慢）。

**"为什么监听要专用长连接？"**——LISTEN 是会话级状态，连接还回池子后监听随会话终止失效。架构上固定 1 到 2 条监听连接（多一条做冗余），事件处理再借用池内连接查数据。

## 检验清单

- 能说出事务性语义的正反两面（天然原子 vs 不补发）与 8000 字节载荷上限；
- 会用两个 psql 会话跑通监听/发送/回滚不通知的验证；
- 会写触发器 + pg_notify 的自动广播函数（PERFORM 与 json_build_object 惯用法）；
- 能解释"表 + NOTIFY + SKIP LOCKED"任务队列的分工与适用边界；
- 知道监听需要专用长连接及三条收不到的排查路径。

## 下一步

让通知自动触发的触发器机制值得深挖：进入 [触发器与事件触发器](/postgresql/380-TriggerEventTrigger)，把数据库的"被动响应"能力系统化。
