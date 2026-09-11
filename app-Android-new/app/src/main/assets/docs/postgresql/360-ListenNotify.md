---
order: 360
title: LISTEN/NOTIFY 监听通知语法速查手册
module: 'postgresql'
category: 数据库
difficulty: beginner
description: LISTEN/NOTIFY 监听通知 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## NOTIFY 发送通知

**基本写法：发送通知**
`NOTIFY <通道名>[, '<载荷>'];`

```sql
-- 发送通道通知（无载荷）
NOTIFY user_update;
-- 发送带载荷的通知（载荷必须是字符串）
NOTIFY order_event, '{"order_id":1001,"action":"created"}';
```

**基本写法：pg_notify 函数发送通知**
`SELECT pg_notify('<通道名>', '<载荷>');`

```sql
-- 使用函数形式发送（载荷支持任意字符串）
SELECT pg_notify('task_queue', '{"task":"send_email","to":"user@example.com"}');
```

**基本写法：事务提交时触发通知**
`NOTIFY <通道> -- 在事务中`

```sql
-- 通知在事务提交时才真正发送（事务回滚则不发）
BEGIN;
UPDATE orders SET status = 'paid' WHERE id = 1001;
NOTIFY order_event, '{"order_id":1001,"status":"paid"}';
COMMIT;
```

---

## LISTEN 监听通道

**基本写法：监听通道**
`LISTEN <通道名>;`

```sql
-- 当前会话开始监听指定通道
LISTEN order_event;
-- 监听后该通道的通知会被异步推送到此会话
```

**基本写法：取消监听**
`UNLISTEN <通道名>;`

```sql
-- 停止监听指定通道
UNLISTEN order_event;
-- 停止所有通道监听
UNLISTEN *;
```

---

## 接收通知

**基本写法：psql 接收通知**
`LISTEN <通道>;`

```sql
-- 在 psql 中监听后，通知会自动显示
LISTEN order_event;
-- 当其他会话执行 NOTIFY 时，本会话显示:
-- Asynchronous notification "order_event" with payload "..." received from server process PID xxx.
```

**基本写法：应用轮询接收**
`SELECT 1; -- 触发通知接收`

```sql
-- 驱动通常需执行任意查询才能拉取排队中的通知
-- libpq 使用 PQnotifies 获取通知
-- JDBC 使用 PGNotification 接口
LISTEN order_event;
-- 定期执行轻量查询拉取通知
SELECT pg_notification_queue_usage();  -- 查看队列使用率
```

**基本写法：查看监听状态**
`SELECT * FROM pg_listening_channels();`

```sql
-- 查看当前会话监听的所有通道
SELECT pg_listening_channels();
-- 查看所有会话的监听（需超级用户）
SELECT pid, channel FROM pg_stat_activity
WHERE query LIKE 'LISTEN%';
```

---

## 实战模式

**基本写法：触发器配合 NOTIFY**
`CREATE TRIGGER ... AFTER ... DO NOTIFY <通道>, '<载荷>';`

```sql
-- 表变更时自动通知（监听方据载荷处理）
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

**基本写法：队列模式（任务分发）**
`NOTIFY <通道>, '<任务JSON>'`

```sql
-- 生产者插入任务并通知
INSERT INTO task_queue (task_type, payload)
VALUES ('email', '{"to":"u@e.com"}');
NOTIFY task_available;
-- 消费者监听并拉取处理
LISTEN task_available;
-- 收到通知后查询并锁定任务
SELECT id, payload FROM task_queue
WHERE status = 'pending'
FOR UPDATE SKIP LOCKED LIMIT 1;
```

---

## 注意事项

**基本写法：载荷大小限制**
`NOTIFY <通道>, '<载荷>' -- 载荷不超过 8000 字节`

```sql
-- 载荷字符串需小于 8000 字节
-- 大数据建议只传 ID，监听方再查表
NOTIFY large_change, '{"id": 1001}';  -- 仅传 ID
-- 监听方接收后再查表
-- SELECT * FROM changes WHERE id = 1001;
```

**基本写法：查看通知队列使用率**
`SELECT pg_notification_queue_usage();`

```sql
-- 查看通知队列使用率（0-1，超过 0.5 需注意消费速度）
SELECT pg_notification_queue_usage();
```

**基本写法：清理堆积通知**
`UNLISTEN <通道>; LISTEN <通道>;`

```sql
-- 重新监听可清空当前会话已排队但未消费的通知
UNLISTEN order_event;
LISTEN order_event;
```
