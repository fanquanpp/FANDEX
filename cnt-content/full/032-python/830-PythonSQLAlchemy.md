---
order: 650
title: SQLAlchemy 2.0：从手拼 SQL 到 ORM
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以「设备管理后台的读写层」为场景，用 SQLAlchemy 2.0 风格走通 ORM 全流程：Engine 与连接池、Mapped 声明式模型、Session 增删改查、一对多关系与级联、selectinload 治理 N+1；附 DetachedInstanceError、异步懒加载、default 与 server_default 等十个高频坑点。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'python/880-PythonFastAPI'
  - 'python/800-PythonDatabaseMigration'
  - 'python/550-DataClassPydantic'
prerequisites:
  - 'python/550-DataClassPydantic'
---

## 前置知识

- 会写基本 SQL（SELECT/INSERT/JOIN 的含义）；
- [数据类与 Pydantic](/python/550-DataClassPydantic)：理解「类型注解描述数据形状」的思路——ORM 模型是它的数据库版。

## 你现在要解决什么问题

FoloToy 设备管理后台要落库：设备表、读数表，增删改查加统计。第一版用 `sqlite3` 手拼 SQL：

```python
cursor.execute(f"SELECT * FROM devices WHERE name = '{name}'")
```

问题一箩筐：`name` 里带个单引号就是 SQL 注入；换个数据库（SQLite 换 PostgreSQL）语法细节全要人肉过一遍；查回来的行是裸 tuple，字段靠下标取，改个列顺序全线崩。SQLAlchemy 干的就是这件事：**用 Python 类描述表结构，用 Python 对象承载行数据，SQL 由它生成**。注入、方言差异、字段映射一次性解决。本篇按 2026 年的主流写法（SQLAlchemy 2.0 风格）走通全流程。

```bash
pip install sqlalchemy
```

## 先动手：连接与第一张表

```python
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)
    online: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )
    readings: Mapped[list["Reading"]] = relationship(back_populates="device")

class Reading(Base):
    __tablename__ = "readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    value: Mapped[float]
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"))
    device: Mapped["Device"] = relationship(back_populates="readings")

engine = create_engine("sqlite:///toy.db", echo=True)   # echo 打印生成的 SQL
Base.metadata.create_all(engine)
```

几件事值得停一秒：

- `Mapped[int]` 注解不只是好看：ORM 从它推断出列类型（int 变 INTEGER、`str` 需要给长度、`Optional[X]` 自动 nullable），这是 2.0 风格与 1.x 最大的观感差别；
- `relationship` 声明的是**对象间导航**：`device.readings` 与 `reading.device` 互为反方向，`back_populates` 把两头接起来。SQL 里要手写 JOIN 的活，变成点属性；
- 引号里的 `"Reading"` 是字符串前向引用，允许模型互相引用而不关心定义顺序（也是规避循环导入的标准姿势）；
- `create_engine` 返回的不是单个连接，是**连接池 + 方言**。生产环境记得 `pool_pre_ping=True`（取连接前探活）与 `pool_recycle`（定期换血，避开数据库端超时踢连接）。

`create_all` 直接建表，适合原型与测试。生产环境表结构会演化，改用迁移工具 Alembic 管版本（见 [数据库迁移](/python/800-PythonDatabaseMigration)）。

## Session：一次工作单元

ORM 的读写都发生在 `Session` 里。把它理解成「你与数据库之间的一段草稿区」：

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

with Session(engine) as session:
    # 增
    device = Device(name="bedroom-01")
    session.add(device)
    session.add_all([
        Reading(value=23.5, device=device),
        Reading(value=24.1, device=device),
    ])
    session.commit()
    print(device.id)          # 提交后主键自动回填

    # 查
    stmt = select(Device).where(Device.name == "bedroom-01")
    device = session.execute(stmt).scalar_one()

    # 改：直接改属性，commit 时自动生成 UPDATE
    device.online = False
    session.commit()

    # 删
    session.delete(device)
    session.commit()
```

两个「为什么」在这里：

- **为什么改属性不用写 UPDATE？** Session 的工作单元（Unit of Work）模式会追踪加载进来的对象，commit 时对比「草稿区快照」算出最小变更集合，一次 flush。这也是为什么**循环里逐条 commit 是反模式**——把一千次提交攒成 `add_all` + 一次提交；
- **`with` 为什么重要？** Session 持有数据库连接，不关就占着连接池的坑。`with Session(engine) as session:` 保证退出即归还，这是最不该省的一行。

会话内同一行数据只会有一份 Python 对象（identity map）：`session.get(Device, 1)` 调两次拿到的是同一个对象，所以不会出现「同一行在内存里两个版本打架」。

## 查询速查：select 的常用形状

2.0 风格统一用 `select()` 构造语句，常用形状如下（`rows = session.execute(stmt).all()` 后取结果）：

```python
from sqlalchemy import func, or_, select

# 条件与组合
select(Device).where(Device.online == True)            # noqa: E712
select(Device).where(or_(Device.name == "a", Device.name == "b"))
select(Reading).where(Reading.value > 20, Reading.device_id == 1)   # 多参数即 AND

# 排序分页
select(Reading).order_by(Reading.value.desc()).limit(10).offset(20)

# 聚合与分组
select(Reading.device_id, func.count(Reading.id)).group_by(Reading.device_id)

# JOIN：取对象对
select(Device, Reading).join(Reading.device).where(Device.name == "bedroom-01")
```

取结果的三个常用出口：`.scalar_one()`（恰好一行取单值，多了少了都报错）、`.scalars().all()`（一行一对象的列表）、`.first()`（没有就 None）。报错信息里 `NoResultFound` 与 `MultipleResultsFound` 就是 `scalar_one` 在替你做防线。

## N+1：ORM 的头号性能事故

关系导航有个隐性代价。打印每个设备的所有读数：

```python
for device in session.execute(select(Device)).scalars():
    print(device.name, len(device.readings))   # 每次访问都发一条 SQL！
```

`echo=True` 下看得很清楚：1 条查设备，之后**每个设备再发 1 条查读数**——100 个设备就是 101 条 SQL，即 N+1。属性访问触发延迟加载（lazy load）是默认行为。治理手段是预加载：

```python
from sqlalchemy.orm import selectinload, joinedload

# 一对多集合：selectinload，两条 SQL（设备一条、读数 IN 一条）
stmt = select(Device).options(selectinload(Device.readings))

# 多对一：joinedload，一条 JOIN SQL
stmt = select(Reading).options(joinedload(Reading.device))
```

经验法则：**集合用 selectinload，单一对象用 joinedload**。开发期想强制自己不漏配，加 `raiseload("*")` 让任何懒加载直接抛错，N+1 在测试阶段就现形。

## 常见坑点

坑一：会话关了还摸属性（`DetachedInstanceError`）。Session 关闭后对象还在手里，但再访问未加载的 `device.readings` 就炸——懒加载需要会话。修法：在会话内用完数据，或提前 `selectinload`，或对读多写少的场景设 `expire_on_commit=False`。

坑二：异步下懒加载直接 `MissingGreenlet`。async 引擎里懒加载要切换事件循环，SQLAlchemy 禁止。异步代码里必须显式预加载（`selectinload`），不存在「忘了配也能跑」的侥幸。

坑三：全局共享一个 Session。多请求共用会话等于多人共用一张草稿纸，事务互相污染。正确粒度是**每请求一个 Session**——Web 框架里做成依赖注入（FastAPI 的写法见 [Python FastAPI](/python/880-PythonFastAPI)）。

坑四：`default` 与 `server_default` 是两层。`default=True` 是 Python 在 INSERT 时补的值，绕过 ORM 的批量导入不经过它；`server_default="true"` 写进表结构，数据库层兜底。要「任何路径写入都有默认」就两个都写。

坑五：还在用 1.x 的 `session.query()`。2.0 已将其列为遗留风格，报错与文档会越来越少。新代码一律 `select()` + `session.execute()`；AI 生成或老教程里的 `query()` 看到就换算。

坑六：唯一约束冲突不当回事。`IntegrityError` 在 `commit()` 时才抛（flush 顺序的缘故），包住 commit 做回滚才是完整的写入路径：`try: session.commit() except IntegrityError: session.rollback()`。

坑七：长事务占死连接池。一个开着事务睡 60 秒的会话，能让默认 5 大小的池子瞬间枯竭。原则：事务里只放数据库操作，慢活（调接口、算数据）移出事务；必要时 `pool_size` 与 `max_overflow` 调大，但要先看数据库端 `max_connections`。

## 自我检查

- 能解释 Engine、Session、Connection 三者的层次与生命周期；
- 能默写一个带 `Mapped` 注解与双向 `relationship` 的两张表模型；
- 能说出「改属性为什么不用 UPDATE」背后的 Unit of Work 机制；
- 拿到一段循环里访问关系的代码，能指出 N+1 并用 selectinload 修掉；
- 知道 `DetachedInstanceError` 与 `MissingGreenlet` 各自的成因与预防。

## 练习

1. 预测题：`session.get(Device, 1)` 连续调用两次，`a is b` 的结果是什么？commit 之后呢？
2. 修改题：给 `Device` 加 `tags: Mapped[list[str]]` 多对多关联（需要第三张关联表），实现「找出带某标签的全部设备」的查询。
3. 实战题：把本篇模型落到 SQLite，插入 5 台设备各 100 条读数；分别用裸访问与 `selectinload` 遍历打印，用 `echo=True` 数一数两种写法的 SQL 条数。
4. 挑战题：写一个函数 `page_readings(device_id, page, size)`，返回按时间倒序的一页读数与总条数（两个查询，或窗口函数一条搞定），并用断言验证翻页边界（最后一页不满时长度正确）。

## 下一步

- 表结构上线后的演化管理：[数据库迁移](/python/800-PythonDatabaseMigration)；
- ORM 对象直接变成 API 响应模型：[Python FastAPI](/python/880-PythonFastAPI)；
- ORM 深入后的对象状态机（transient/pending/detached）与异步引擎，查官方教程：https://docs.sqlalchemy.org/en/20/tutorial/ 与 https://docs.sqlalchemy.org/en/20/orm/quickstart.html
