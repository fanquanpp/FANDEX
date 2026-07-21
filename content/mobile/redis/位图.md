# 位图

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本操作

**基本写法：设置指定位的值**
`SETBIT <key> <offset> <value>`
```bash
# 设置用户42在第100天登录
SETBIT user:login:2026 42 1
```

**基本写法：获取指定位的值**
`GETBIT <key> <offset>`
```bash
# 检查用户42是否在第100天登录
GETBIT user:login:2026 42
```

**基本写法：统计为 1 的位数**
`BITCOUNT <key> [start end]`
```bash
# 统计2026年登录用户数
BITCOUNT user:login:2026
```

**基本写法：查找第一个 0/1 的位置**
`BITPOS <key> <bit> [start end]`
```bash
# 查找第一个为1的位置
BITPOS user:login:2026 1
```

---

## 位运算操作

**基本写法：AND 交集运算**
`BITOP AND <destkey> <key> [key ...]`
```bash
# 对 key1 和 key2 执行 AND 交集运算
BITOP AND result key1 key2
```

**基本写法：OR 并集运算**
`BITOP OR <destkey> <key> [key ...]`
```bash
# 对 key1 和 key2 执行 OR 并集运算
BITOP OR result key1 key2
```

**基本写法：XOR 异或运算**
`BITOP XOR <destkey> <key> [key ...]`
```bash
# 对 key1 和 key2 执行 XOR 异或运算
BITOP XOR result key1 key2
```

**基本写法：NOT 取反运算**
`BITOP NOT <destkey> <key>`
```bash
# 对 key1 执行 NOT 取反运算
BITOP NOT result key1
```

---

## 用户在线状态

**基本写法：标记用户上线**
`SETBIT <online_key> <user_id> 1`
```bash
# 用户42上线
SETBIT online:users 42 1
```

**基本写法：标记用户下线**
`SETBIT <online_key> <user_id> 0`
```bash
# 用户42下线
SETBIT online:users 42 0
```

**基本写法：检查用户是否在线**
`GETBIT <online_key> <user_id>`
```bash
# 检查用户42是否在线
GETBIT online:users 42
```

**基本写法：统计在线人数**
`BITCOUNT <online_key>`
```bash
# 统计当前在线人数
BITCOUNT online:users
```

---

## 用户标签

**基本写法：为用户打标签**
`SETBIT <user_tags_key> <tag_id> 1`
```bash
# 用户42拥有标签0
SETBIT user:42:tags 0 1
```

**多标签写法：为用户打多个标签**
`SETBIT <user_tags_key> <tag_id> 1`
```bash
# 用户42拥有标签0和标签3
SETBIT user:42:tags 0 1
SETBIT user:42:tags 3 1
```

**基本写法：统计用户标签数**
`BITCOUNT <user_tags_key>`
```bash
# 统计用户42的标签数量
BITCOUNT user:42:tags
```

---

## 活跃用户统计

**基本写法：记录每日活跃用户**
`SETBIT <dau_key> <user_id> 1`
```bash
# 记录用户42在2026-06-14活跃
SETBIT dau:2026-06-14 42 1
```

**换行写法：计算月活跃用户（OR 运算合并）**
`BITOP OR <destkey> <key> [key ...]`
```bash
# 计算月活跃用户（OR运算合并每日数据）
BITOP OR mau:2026-06 dau:2026-06-01 dau:2026-06-02 dau:2026-06-03
```

**基本写法：获取月活跃用户数**
`BITCOUNT <mau_key>`
```bash
# 获取2026年6月的月活跃用户数
BITCOUNT mau:2026-06
```
