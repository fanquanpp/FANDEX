---
order: 750
title: sqlite3 标准库：轻量数据库的正确打开方式
module: 'python'
category: 后端技术
difficulty: beginner
description: 从「配置文件撑不住、装 MySQL 太重」的现场讲标准库 sqlite3：连接与游标、参数化查询防注入（对比字符串拼接的注入现场）、事务与 with、row_factory 让行变成字典、内存库做测试 fixture；造表练习移植 vocaloid 四表模型，结尾给「何时直接 sqlite3、何时上 ORM」决策表。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 标准库 `sqlite3`——嵌入式 SQL 数据库 SQLite 的官方驱动，是「数据持久化」两章（文件序列化与数据库）之间的桥。
- **解决什么问题**：数据量大到 JSON 文件读写变慢、且需要按条件查询/聚合/唯一约束时，文件方案崩溃；装 MySQL/PostgreSQL 又太重。SQLite 把整个数据库装进**一个文件**（或一段内存），零配置、零服务进程，Python 标准库自带驱动。
- **什么时候用到**：单机工具的存储层（记账 CLI、下载器状态库）、移动与桌面应用的本地数据、测试环境替代真实数据库、小型网站原型。它是 [SQLAlchemy 2.0](/python/830-PythonSQLAlchemy) 示例的默认数据库，也是 [毕业项目](/python/975-PythonCapstoneProject) 双存储后端之一的实现层；需要迁移与版本管理时进阶到 [数据库迁移](/python/800-PythonDatabaseMigration)。

## 你现在要解决什么问题

毕业项目的记账工具用 JSON 存账目（[文件 I/O](/python/300-FileIOContextManager) 篇的方案）撑到了三千条记录，新需求来了：按月份汇总支出、按分类排行、账目号不允许重复。JSON 方案要「整个读进内存、改完整个写回」，三千条还好、三万条就难受，而且「唯一约束」「范围查询」「并发写」都得手写。

另一个极端是直接上 MySQL：装服务、配账号、管连接池——对单机工具是杀鸡用牛刀。

SQLite 的位置正好在中间：**它是文件，也是数据库**。

```python
import sqlite3

conn = sqlite3.connect("ledger.db")   # 文件不存在会自动创建
conn.execute(
    "CREATE TABLE IF NOT EXISTS entry ("
    "  id INTEGER PRIMARY KEY,"
    "  category TEXT NOT NULL,"
    "  amount REAL NOT NULL,"
    "  note TEXT DEFAULT ''"
    ")"
)
conn.commit()
```

跑完这段，目录里多出一个 `ledger.db` 文件——这就是全部的「部署」。带着 SQL 的完整能力（索引、约束、事务、聚合），却像读写文件一样简单。

## 连接、游标与第一条查询

sqlite3 的两层对象模型：`Connection` 管连接与事务，`Cursor` 管执行与取结果：

```python
import sqlite3

conn = sqlite3.connect("ledger.db")
cur = conn.cursor()

cur.execute("INSERT INTO entry (category, amount, note) VALUES (?, ?, ?)",
            ("food", 32.5, "午餐"))
cur.execute("INSERT INTO entry (category, amount, note) VALUES (?, ?, ?)",
            ("book", 89.0, "算法图解"))
conn.commit()                        # 不 commit，写入不会落盘

cur.execute("SELECT id, category, amount FROM entry WHERE amount > ?", (50,))
for row in cur.fetchall():
    print(row)                       # (2, 'book', 89.0) —— 默认是元组
```

逐段解释：

- `conn.execute` 与 `cur.execute` 都能执行 SQL，前者每次隐式创建一个游标；需要复用游标（批量执行、取完再取）就显式建；
- `?` 是**占位符**（qmark 风格），参数以元组单独传入——这是防注入的关键，下节展开；
- `fetchall()` 取全部行，`fetchone()` 取一行，`fetchmany(n)` 取 n 行；结果默认是**元组**，按下标取字段。

易错点一：忘记 `commit()`。执行 INSERT/UPDATE/DELETE 后程序正常退出，看起来成功了，下次打开数据没了——没提交的事务在连接关闭时被丢弃。纪律：**写操作必 commit，或用 with 自动管理（见下节）**。

易错点二：`fetchall()` 之后再调 `fetchone()` 返回 None——游标的位置只前进不后退。要重新遍历就重新 `execute`。

## 参数化查询：一行之差，防住注入

先看注入现场。拼字符串版「按分类查账目」：

```python
def find_by_category_unsafe(category: str) -> list:
    conn = sqlite3.connect("ledger.db")
    sql = f"SELECT * FROM entry WHERE category = '{category}'"   # 危险写法
    return conn.execute(sql).fetchall()
```

调用 `find_by_category_unsafe("food' OR '1'='1")` 时，SQL 变成：

```sql
SELECT * FROM entry WHERE category = 'food' OR '1'='1'
```

`'1'='1'` 恒为真，**全表返回**。这还只是查——UPDATE/DELETE 场景的拼接能让一条用户输入清空你的表。用户输入是**数据**，但拼接后它变成了**代码**，这就是 SQL 注入的本质。

参数化版把数据与代码分离：

```python
def find_by_category(category: str) -> list:
    conn = sqlite3.connect("ledger.db")
    sql = "SELECT * FROM entry WHERE category = ?"
    return conn.execute(sql, (category,)).fetchall()
```

调用 `find_by_category("food' OR '1'='1")` 返回**空列表**——输入被当作一个完整的字符串值去精确匹配，攻击载荷失效。逐段解释：占位符 `?` 告诉驱动「这里是一个值」，驱动负责把它安全转义；参数以元组传入，**单元素元组必须写 `(category,)`**——`(category)` 只是加了括号的表达式，不是元组，会报 `Incorrect number of bindings`。

三种常见误用，全部错误：

```python
conn.execute("SELECT * FROM entry WHERE category = ?", (category,))   # 对
conn.execute(f"SELECT * FROM entry WHERE category = '{category}'")    # 注入
conn.execute("SELECT * FROM entry WHERE category = ?", category)      # 缺元组包裹
conn.execute("SELECT * FROM entry WHERE category = ?".replace(...))   # 换汤不换药
```

**表名、列名不能用占位符**（它们是标识符不是值）——动态表名的需求要白名单校验后用 f-string，且值仍走占位符：

```python
TABLES = {"entry", "entry_archive"}     # 白名单
def dump_table(name: str) -> list:
    if name not in TABLES:
        raise ValueError(f"非法表名: {name}")
    return conn.execute(f"SELECT * FROM {name}").fetchall()
```

## 事务与 with：让错误恢复自动化

SQLite 默认开启事务：每条写语句自动开始一个事务，`commit()` 提交、`rollback()` 回滚。转账式操作的原子性靠它保证：

```python
def transfer_budget(conn, from_cat: str, to_cat: str, amount: float) -> None:
    cur = conn.cursor()
    cur.execute("UPDATE entry SET amount = amount - ? WHERE category = ?",
                (amount, from_cat))
    cur.execute("UPDATE entry SET amount = amount + ? WHERE category = ?",
                (amount, to_cat))
    conn.commit()     # 两条 UPDATE 同生共死
```

第二条失败时不 commit 就关闭连接，第一条自动回滚——预算总数守恒。

更工程化的写法是 `with conn:`（Python 3.12 起 sqlite3 支持 `autocommit` 属性，显式控制更清晰）：

```python
def safe_transfer(conn, from_cat: str, to_cat: str, amount: float) -> None:
    with conn:                        # 正常退出 -> commit；抛异常 -> rollback
        conn.execute("UPDATE entry SET amount = amount - ? WHERE category = ?",
                     (amount, from_cat))
        conn.execute("UPDATE entry SET amount = amount + ? WHERE category = ?",
                     (amount, to_cat))
```

`with conn` 的语义：块内抛异常自动回滚，正常结束自动提交——把「记得 commit / 出错记得 rollback」这对人工纪律交给语言结构。与 [上下文管理器](/python/300-FileIOContextManager) 的 `with open` 同构：**凡是有「用完必须收尾」语义的资源，都用 with**。

易错点一：`with conn` 不关闭连接！它只管事务。长驻程序仍要 `conn.close()`（或用 `contextlib.closing` 包一层）。

易错点二：DDL（CREATE/DROP）在旧版 Python 的 sqlite3 中隐式提交事务——事务里建表会让前面的写操作「顺手」提交掉，回滚不掉。数据库篇（[MySQL 事务](/python/../016-sql/)）讲过的「DDL 隐式提交铁律」在 SQLite 同样成立。

## row_factory：让行从元组变成字典或对象

默认行是元组，`row[1]` 可读性差且列序一变全线崩。`row_factory` 换掉行的形态：

```python
import sqlite3

conn = sqlite3.connect("ledger.db")
conn.row_factory = sqlite3.Row          # 全局设置：所有行都是 Row 对象

row = conn.execute(
    "SELECT id, category, amount FROM entry WHERE id = ?", (1,)
).fetchone()
print(row["category"], row["amount"])   # 按名取
print(dict(row))                        # 可转字典：{'id': 1, 'category': 'food', ...}
print(row.keys())                       # ['id', 'category', 'amount']
```

逐段解释：`sqlite3.Row` 支持按名与按下标双通道访问、可哈希、转字典零成本；对比 SQLAlchemy 返回的对象，Row 是「轻一档」的选择——**没有类定义、没有关系加载，只有字段名**。

更彻底的定制：把行直接变成 `namedtuple` 或 dataclass（[collections 专用容器](/python/142-CollectionsSpecializedContainers) 与 [数据类](/python/550-DataClassPydantic) 的交叉点）：

```python
from dataclasses import dataclass

@dataclass
class Entry:
    id: int
    category: str
    amount: float

def entry_factory(cursor, row) -> Entry:
    return Entry(*row)

conn.row_factory = entry_factory
e = conn.execute("SELECT id, category, amount FROM entry LIMIT 1").fetchone()
print(e.category)      # 真正的属性访问，类型检查器还能校验字段
```

为什么这样写：Row 解决「列序耦合」，dataclass 工厂进一步解决「类型不显式」。手拼 SQL 的三个经典问题（注入、方言、行映射）到这里解决了一半——剩下「表结构与对象的映射」那半，交给 830 篇的 ORM。

## 内存库与测试 fixture

`:memory:` 参数把数据库放进内存——速度极快、进程结束即消失，是单元测试的标准道具：

```python
import sqlite3
import pytest

@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE entry (
            id INTEGER PRIMARY KEY,
            category TEXT NOT NULL,
            amount REAL NOT NULL
        );
        INSERT INTO entry (category, amount) VALUES ('food', 32.5);
        INSERT INTO entry (category, amount) VALUES ('book', 89.0);
    """)
    yield conn
    conn.close()

def test_total(db):
    total = db.execute("SELECT SUM(amount) FROM entry").fetchone()[0]
    assert total == pytest.approx(121.5)

def test_unique_category_list(db):
    cats = [r["category"] for r in db.execute("SELECT category FROM entry")]
    assert cats == ["food", "book"]
```

逐段解释：`executescript` 一次执行多语句，正好用来搭建表加造数；pytest 的 fixture 让每个测试拿到**全新的空库**，测试互不污染（[Python 测试](/python/750-PythonTest) 篇的 fixture 隔离原则）；测试跑在内存里，不碰磁盘文件，CI 无状态。

工程上更大的价值：**生产代码写的是 sqlite3，测试跑的是 sqlite3 内存库**——同一驱动，行为一致，测试结论可信。如果生产用 MySQL、测试用 SQLite，方言差异反而会让测试失真（这时该用容器化测试数据库，见 [Python 与 Docker](/python/790-PythonDocker)）。

## 练习：vocaloid 四表模型移植

把一个真实数据模型从 MySQL 移植到 SQLite：**曲库四表**——形象标志（logo）1 对多 歌姬（vsinger）1 对多 歌曲（music），多首歌曲归属于 1 位 P 主（producer）。先想清楚外键方向：

```text
logo 1 ──n vsinger 1 ──n music n ──1 producer
```

练习任务：实现 `init_db(conn)` 建四张表（含外键），实现 `seed(conn)` 插入以下数据（可重复执行不报错），再完成三个查询：某歌姬的全部歌曲、每位 P 主的作品数（0 作品的 P 主也要出现）、作品数最多的 P 主。

提示：外键加 `PRAGMA foreign_keys = ON`（SQLite 默认**不**强制外键，与 MySQL 不同）；「可重复执行」用 `INSERT OR IGNORE` 或先 DELETE；0 作品的 P 主用 LEFT JOIN。

<details>
<summary>参考实现</summary>

```python
import sqlite3

def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS producer (
            pid INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS logo (
            lid INTEGER PRIMARY KEY,
            brand TEXT NOT NULL,
            color TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS vsinger (
            vid INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            company TEXT NOT NULL,
            logo_id INTEGER NOT NULL REFERENCES logo(lid)
        );
        CREATE TABLE IF NOT EXISTS music (
            mid INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            vsinger_id INTEGER NOT NULL REFERENCES vsinger(vid),
            producer_id INTEGER NOT NULL REFERENCES producer(pid)
        );
    """)

def seed(conn: sqlite3.Connection) -> None:
    with conn:
        conn.executescript("""
            INSERT OR IGNORE INTO producer (pid, name) VALUES
                (1, '黒うさP'), (2, 'wowaka'), (3, 'ilem'), (4, 'COP');
            INSERT OR IGNORE INTO logo (lid, brand, color) VALUES
                (1, 'Vsinger', '#66CCFF'), (2, 'Crypton', '#39C5BB');
            INSERT OR IGNORE INTO vsinger (vid, name, company, logo_id) VALUES
                (1, '洛天依', '上海禾念', 1),
                (2, '乐正绫', '上海禾念', 1),
                (3, '初音未来', 'Crypton', 2);
            INSERT OR IGNORE INTO music (mid, title, vsinger_id, producer_id) VALUES
                (1, '普通DISCO', 1, 3),
                (2, '九九八十一', 1, 3),
                (3, '千年食谱颂', 2, 3),
                (4, '千本樱', 3, 1),
                (5, 'Rolling Girl', 3, 2);
        """)

def songs_of(conn, singer: str) -> list:
    sql = """
        SELECT m.title, p.name FROM music m
        JOIN vsinger v ON m.vsinger_id = v.vid
        JOIN producer p ON m.producer_id = p.pid
        WHERE v.name = ?
    """
    return conn.execute(sql, (singer,)).fetchall()

def producer_work_counts(conn) -> list:
    sql = """
        SELECT p.name, COUNT(m.mid) AS works FROM producer p
        LEFT JOIN music m ON m.producer_id = p.pid
        GROUP BY p.pid
        ORDER BY works DESC
    """
    return conn.execute(sql).fetchall()

conn = sqlite3.connect(":memory:")
conn.row_factory = sqlite3.Row
init_db(conn)
seed(conn)
seed(conn)   # 可重复执行验证
print([r["title"] for r in songs_of(conn, "初音未来")])
print(producer_work_counts(conn))   # COP 是 0 作品的 P 主，LEFT JOIN 保留
```

要点复盘：`INSERT OR IGNORE` 靠 UNIQUE 约束实现幂等，等价于 MySQL 的 `INSERT IGNORE`；外键不开启 PRAGMA 就形同虚设——插入不存在的 vid 也不会报错；LEFT JOIN 让 0 作品的 P 主（COP）以 works=0 出现，INNER JOIN 会把它丢掉——这是 SQL 教学里「外连接保留无匹配行」的经典设计（[MySQL](/python/../017-mysql/) 篇的成绩库同理）。
</details>

## 何时直接 sqlite3，何时上 ORM

| 判断点 | 直接 sqlite3 | SQLAlchemy（[830 篇](/python/830-PythonSQLAlchemy)） |
| --- | --- | --- |
| 表数量 | 个位数，结构稳定 | 多表关联、关系复杂 |
| SQL 能力 | 会写 SQL，想完全掌控 | 不想手写 SQL 与方言差异 |
| 行数据形态 | Row/dict 够用 | 需要对象图、关系加载、级联 |
| 未来换库 | 大概率一直 SQLite | 可能迁 PostgreSQL/MySQL |
| 团队规模 | 个人工具、脚本 | 多人协作、长期维护的服务 |
| 迁移需求 | 无（或手工 SQL 脚本） | 需要 Alembic（[迁移篇](/python/800-PythonDatabaseMigration)） |

一句话：**单机工具直接 sqlite3，长生命周期多表服务上 ORM**。中间态（想保留 SQL 控制力又要对象化行）可用 SQLAlchemy Core 或 `row_factory` + dataclass 的组合——工具选型跟着约束走，不跟风。

## 常见坑点速记

- 写操作忘 commit：连接关闭即回滚，「看起来成功了」是最大错觉；
- 占位符参数必须传元组，单元素写 `(x,)`；表名列名不能占位，要白名单；
- SQLite 默认不强制外键，须 `PRAGMA foreign_keys = ON` 且每个连接都要设；
- `with conn` 只管事务不管关闭，长驻程序仍要 close；
- 多线程共享连接会撞 `ProgrammingError`——每线程独立连接，或开 `check_same_thread=False` 并自备锁；
- `:memory:` 库随连接消失，「内存库怎么数据没了」的提问九成来自多连接各开各的内存库。

## 与之前和之后的知识的关系

- 往前：文件持久化的天花板见 [序列化：JSON 往返与 pickle 的边界](/python/310-SerializationJsonAndPickle)；with 的资源管理机制见 [文件 I/O 与上下文管理器](/python/300-FileIOContextManager)；SQL 本体（SELECT/JOIN/事务语义）见 [SQL](/python/../016-sql/) 与 [MySQL](/python/../017-mysql/) 模块；
- 往后：手拼 SQL 的痛点收口于 [SQLAlchemy 2.0](/python/830-PythonSQLAlchemy)；毕业项目（[记账与统计 CLI](/python/975-PythonCapstoneProject)）P4 的 SQLite 后端按本文「存储接口 + sqlite3 实现」落地；结构变化需要版本化迁移时进 [数据库迁移](/python/800-PythonDatabaseMigration)。

## 官方文档

- sqlite3 标准库参考：https://docs.python.org/zh-cn/3/library/sqlite3.html
- SQLite 本体文档（方言与 PRAGMA）：https://sqlite.org/docs.html

## 自我检查

- 能说出 Connection 与 Cursor 的分工，以及 fetchone/fetchall/fetchmany 的游标语义；
- 能复现一次注入现场并解释参数化为什么能防住它；
- 能说明 `with conn` 管什么、不管什么；
- 能给 `:memory:` 库的三个使用纪律（单连接、随进程消失、适合测试）；
- 能按决策表对一个新项目说明选 sqlite3 还是 ORM 的理由。
