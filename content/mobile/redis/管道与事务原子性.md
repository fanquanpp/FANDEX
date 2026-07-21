# 管道与事务原子性

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## Pipeline 管道

**基本写法：Python 批量发送命令减少 RTT**
`pipe = r.pipeline()`
```python
# Python redis-py 使用 Pipeline 批量发送命令
import redis
r = redis.Redis()

pipe = r.pipeline()
for i in range(10000):
    pipe.set(f'key:{i}', f'value:{i}')
pipe.execute()
```

---

## 事务基本用法

**基本写法：开启并提交事务**
`MULTI ... EXEC`
```bash
# 开启事务，命令入队后统一执行
MULTI
SET key1 val1
SET key2 val2
INCR counter
EXEC
```

**基本写法：取消事务**
`MULTI ... DISCARD`
```bash
# 取消事务，所有入队命令不执行
MULTI
SET key1 val1
DISCARD
```

---

## WATCH 乐观锁

**基本写法：CAS 乐观锁**
`WATCH <key> [key ...] ... MULTI ... EXEC`
```bash
# 监视 counter 键，读取后开启事务设置新值
WATCH counter
GET counter
MULTI
SET counter 6
EXEC
```

**基本写法：被监视键被修改时事务失败**
`WATCH <key> ... MULTI ... EXEC`
```bash
# 事务A监视counter，事务B修改counter后事务A的EXEC返回nil
WATCH counter
GET counter
MULTI
SET counter 6
EXEC
```

**基本写法：Python WATCH 秒杀乐观锁重试**
`r.watch(<key>)`
```python
# Python 乐观锁重试秒杀
import redis

def seckill(user_id, item_id):
    r = redis.Redis()
    key = f'stock:{item_id}'

    while True:
        try:
            r.watch(key)
            stock = int(r.get(key) or 0)
            if stock <= 0:
                r.unwatch()
                return False

            pipe = r.pipeline()
            pipe.multi()
            pipe.decr(key)
            pipe.sadd(f'users:{item_id}', user_id)
            pipe.execute()
            return True
        except redis.WatchError:
            continue
```

---

## Pipeline + 事务

**基本写法：Pipeline 中使用事务**
`pipe.multi()`
```python
# Pipeline 中开启事务，兼顾性能与原子性
pipe = r.pipeline()
pipe.multi()
pipe.set('key1', 'v1')
pipe.set('key2', 'v2')
pipe.incr('counter')
pipe.execute()
```

**基本写法：Pipeline 事务模式快捷方式**
`pipe = r.pipeline(True)`
```python
# transaction=True 等价于先 pipeline 再 multi
pipe = r.pipeline(True)
pipe.set('key1', 'v1')
pipe.set('key2', 'v2')
pipe.incr('counter')
pipe.execute()
```

---

## Lua 脚本替代方案

**基本写法：Lua 原子性秒杀**
`EVAL <script> <numkeys> <key> [key ...] <arg> [arg ...]`
```bash
# 使用 Lua 脚本保证秒杀操作的原子性
EVAL "local stock = tonumber(redis.call('GET', KEYS[1])) if stock and stock > 0 then redis.call('DECR', KEYS[1]) redis.call('SADD', KEYS[2], ARGV[1]) return 1 end return 0" 2 stock:item1 users:item1 user42
```
