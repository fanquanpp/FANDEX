# AOF 日志持久化

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 工作流程

**函数源码写法：命令追加到 AOF 缓冲区**
`void feedAppendOnlyFile(struct redisCommand *cmd, int argc, robj **argv)`
```c
// 将命令转换为 RESP 协议格式并追加到 aof_buf
void feedAppendOnlyFile(struct redisCommand *cmd, int argc, robj **argv) {
    buf = catAppendOnlyGenericCommand(argc, argv);
    aof_buf = sdscatlen(aof_buf, buf, sdslen(buf));
}
```

**函数源码写法：写入文件并根据策略刷盘**
`void flushAppendOnlyFile(int force)`
```c
// 将 aof_buf 写入 AOF 文件并根据 appendfsync 策略决定是否 fsync
void flushAppendOnlyFile(int force) {
    nwritten = write(server.aof_fd, server.aof_buf, sdslen(server.aof_buf));
    if (server.aof_fsync == APPENDFSYNC_ALWAYS) {
        fsync(server.aof_fd);
    }
}
```

---

## appendfsync 策略

**基本写法：每条命令都 fsync**
`appendfsync always`
```bash
# 每条写命令执行后立即调用 fsync
appendfsync always
```

**基本写法：每秒 fsync（默认推荐）**
`appendfsync everysec`
```bash
# 每秒调用一次 fsync
appendfsync everysec
```

**基本写法：由操作系统决定刷盘**
`appendfsync no`
```bash
# 不主动 fsync，由操作系统决定刷盘时机
appendfsync no
```

---

## AOF 重写

**基本写法：手动触发 AOF 重写**
`BGREWRITEAOF`
```bash
# 手动触发 AOF 重写
BGREWRITEAOF
```

**基本写法：配置重写增长百分比阈值**
`auto-aof-rewrite-percentage <percentage>`
```bash
# AOF 文件大小比上次重写后增长 100% 时触发重写
auto-aof-rewrite-percentage 100
```

**基本写法：配置重写最小文件大小**
`auto-aof-rewrite-min-size <size>`
```bash
# AOF 文件最小 64MB 才触发重写
auto-aof-rewrite-min-size 64mb
```

**基本写法：重写时合并列表操作**
`RPUSH <key> <values>`
```bash
# 重写后将多次 RPUSH 和 LPOP 合并为一条命令
RPUSH list b c d e f
```

---

## AOF 文件格式

**基本写法：RESP 协议格式**
`*<count>\r\n$<len>\r\n<command>\r\n...`
```bash
# AOF 文件使用 RESP 协议格式存储命令
*2
$6
SELECT
$1
0
```

**基本写法：SET 命令的 RESP 格式**
`*3\r\n$3\r\nSET\r\n$<keylen>\r\n<key>\r\n$<vallen>\r\n<value>\r\n`
```bash
# SET key1 value1 的 RESP 格式
*3
$3
SET
$4
key1
$6
value1
```

**基本写法：MULTI/EXEC 合并格式（Redis 4.0+）**
`*1\r\n$5\r\nMULTI\r\n...*1\r\n$4\r\nEXEC\r\n`
```bash
# Redis 4.0+ 使用 MULTI/EXEC 包裹多条命令减少文件体积
*1
$5
MULTI
*3
$3
SET
$3
key
$5
value
*1
$4
EXEC
```

---

## AOF 文件恢复

**基本写法：开启 AOF 持久化**
`appendonly yes`
```bash
# 开启 AOF，Redis 启动时自动加载 AOF 文件
appendonly yes
```

**基本写法：检查 AOF 文件**
`redis-check-aof <file>`
```bash
# 检查 AOF 文件完整性
redis-check-aof appendonly.aof
```

**基本写法：修复 AOF 文件**
`redis-check-aof --fix <file>`
```bash
# 修复 AOF 文件，截断损坏部分
redis-check-aof --fix appendonly.aof
```

---

## 配置优化

**基本写法：开启 AOF**
`appendonly yes`
```bash
# 开启 AOF 持久化
appendonly yes
```

**基本写法：设置 AOF 文件名**
`appendfilename <name>`
```bash
# 设置 AOF 文件名
appendfilename "appendonly.aof"
```

**基本写法：设置刷盘策略**
`appendfsync <strategy>`
```bash
# 设置刷盘策略为每秒
appendfsync everysec
```

**基本写法：设置自动重写增长百分比**
`auto-aof-rewrite-percentage <percentage>`
```bash
# 设置自动重写增长百分比为 100
auto-aof-rewrite-percentage 100
```

**基本写法：设置自动重写最小文件大小**
`auto-aof-rewrite-min-size <size>`
```bash
# 设置自动重写最小文件大小为 64MB
auto-aof-rewrite-min-size 64mb
```

**基本写法：重写期间禁止 fsync**
`no-appendfsync-on-rewrite <yes|no>`
```bash
# AOF 重写期间不执行 fsync
no-appendfsync-on-rewrite yes
```

**基本写法：加载时忽略不完整命令**
`aof-load-truncated <yes|no>`
```bash
# 加载时忽略最后一条不完整命令
aof-load-truncated yes
```

**基本写法：设置 AOF 文件存储目录**
`dir <path>`
```bash
# 设置 AOF 文件存储目录
dir /var/lib/redis
```
