---
order: 480
title: 数据类与 Pydantic：字段声明之后，谁来校验
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以「接口进来的 JSON 不可信」为场景，先用 dataclass 建模再暴露校验缺口，切到 Pydantic v2 体验类型强制转换与验证器；附 dataclass/attrs/Pydantic/msgspec 选型表、v1 到 v2 API 对照表与高频坑点（可变默认值、继承默认值顺序、Optional 语义变化）。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'python/560-DataClassFieldDefault'
  - 'python/880-PythonFastAPI'
  - 'python/530-TypeAnnotationMypy'
prerequisites:
  - 'python/530-TypeAnnotationMypy'
---

## 前置知识

- [类型注解与 mypy](/python/530-TypeAnnotationMypy)：会写 `name: str` 这类注解；
- [OOP 基础](/python/460-OOP)：知道 `__init__` 与实例属性。

## 你现在要解决什么问题

你在给 FoloToy 设备管理后台加一个注册接口：前端发来一段 JSON，后端要拿它构造设备对象。第一反应是标准库 `dataclass`——注解一标，`__init__` 就有了：

```python
from dataclasses import dataclass

@dataclass
class Device:
    name: str
    volume: int = 50

Device(name="bedroom-01", volume=80)   # 干净利落
```

但接口进来的是不可信数据。试着喂点脏的：

```python
device = Device(name="", volume=99999)      # 空名字、音量爆表，照样构造成功
device = Device(name="客厅设备", volume="很响")  # 类型注解是 str/int，也没人拦
print(device.volume, type(device.volume))
```

```text
很响 <class 'str'>
```

**dataclass 不校验任何东西**——注解只是给 mypy 和人看的。这没有错，它是设计目标：标准库保持零依赖、零开销。但 API 边界上必须有另一道闸。这道闸的流行答案是 Pydantic，本篇就把它接上。

## 先动手：同一个模型换成 Pydantic

```bash
pip install pydantic
```

把 `@dataclass` 换成继承 `BaseModel`，其余不动：

```python
from pydantic import BaseModel

class Device(BaseModel):
    name: str
    volume: int = 50

d = Device(name="bedroom-01", volume="80")   # 注意：传的是字符串
print(d.volume, type(d.volume))
```

```text
80 <class 'int'>
```

两个立刻能观察到的差别：

1. **字符串 `"80"` 被转成了 int**。Pydantic 的默认模式是宽松转换（lax mode）：`"42"` 可以变 `42`，`"3.5"` 变 `float`。要严格模式（类型不对直接报错）就在构造时传 `Device.model_validate(data, strict=True)` 或按字段配置；
2. 不合法的值真的会被拦下：

```python
Device(name="bedroom-01", volume="很响")
```

```text
Traceback (most recent call last):
  ...
pydantic_core._pydantic_core.ValidationError: 1 validation error for Device
volume
  Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='很响', ...]
```

`ValidationError` 的信息精确到字段名、期望类型和原始输入，这就是它比「自己写 if」值得的原因。

## 加上业务规则：约束与验证器

类型对还不够，音量得在 0 到 100 之间。Pydantic v2 推荐用 `Annotated` 把约束写在类型旁边：

```python
from typing import Annotated
from pydantic import BaseModel, Field

Volume = Annotated[int, Field(ge=0, le=100)]

class Device(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=32)]
    volume: Volume = 50
    tags: list[str] = []

Device(name="bedroom-01", volume=150)
```

```text
pydantic_core._pydantic_core.ValidationError: 1 validation error for Device
volume
  Input should be less than or equal to 100 [type=less_than_equal, input_value=150, ...]
```

类型转换管不到的规则（比如「名字必须包含型号前缀」）用验证器：

```python
from pydantic import BaseModel, field_validator

class Device(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_must_have_prefix(cls, v: str) -> str:
        if not v.startswith("room-"):
            raise ValueError("设备名必须以 room- 开头")
        return v
```

`mode="before"` 的验证器在类型转换**之前**跑（收到的是原始值，常用于清洗），不带参数时默认 `mode="after"`（收到的是已转换的值）。跨字段的校验用 `@model_validator(mode="after")`，它拿到的是整个模型实例。执行顺序固定：`before` 验证器、类型转换与约束、`after` 验证器、`model_validator`。

## 序列化：模型与 dict/JSON/ORM 之间

校验的另一面是输出。Pydantic v2 的出口方法清一色 `model_` 前缀：

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class Device(BaseModel):
    model_config = ConfigDict(from_attributes=True)   # 允许从 ORM 对象读属性
    name: str
    volume: int
    created_at: datetime

d = Device(name="bedroom-01", volume=80, created_at=datetime(2026, 9, 28, 12, 0))
print(d.model_dump())          # datetime 仍是 datetime 对象
print(d.model_dump(mode="json"))  # datetime 变 ISO 字符串
print(d.model_dump_json())
```

```text
{'name': 'bedroom-01', 'volume': 80, 'created_at': datetime.datetime(2026, 9, 28, 12, 0)}
{'name': 'bedroom-01', 'volume': 80, 'created_at': '2026-09-28T12:00:00'}
{"name":"bedroom-01","volume":80,"created_at":"2026-09-28T12:00:00"}
```

`from_attributes=True` 是连接数据库 ORM 的桥：`Device.model_validate(orm_obj)` 直接把 SQLAlchemy 查出来的行对象变成 API 响应模型（完整用法见 [SQLAlchemy](/python/830-PythonSQLAlchemy)）。自定义输出格式用 `@field_serializer`，敏感字段（密码、密钥）用 `SecretStr` 类型——`model_dump_json()` 时自动打码，要原文得显式 `get_secret_value()`。

与前端团队联调时最常见的配置是**驼峰别名**——前端 JSON 用 `userId`，Python 字段按规范叫 `user_id`：

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class APIResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,   # user_id -> userId 自动生成别名
        populate_by_name=True,      # 两个字段名都接受（内部代码用 snake_case）
        str_strip_whitespace=True,  # 字符串自动去首尾空白
    )
    user_id: int
    user_name: str

resp = APIResponse.model_validate_json('{"userId": 1, "userName": "mia"}')
print(resp.user_name)               # mia
print(resp.model_dump(by_alias=True))   # 序列化回驼峰：{'userId': 1, 'userName': 'mia'}
```

逐段解释：`alias_generator` 只改「外界看到的名字」，`populate_by_name=True` 让两种名字都能进——不加它就只能用别名输入，内部代码传参会报错。导出 JSON Schema 用 `Model.model_json_schema()`，可直接交给 OpenAPI/前端类型生成器。

环境变量配置同样吃这套模型，`pip install pydantic-settings` 后继承 `BaseSettings` 即可（配置分层见 [配置管理](/python/900-ConfigManagement)）。

## 选型：什么时候用 dataclass，什么时候用 Pydantic

| | dataclass（标准库） | Pydantic v2 |
| --- | --- | --- |
| 校验 | 无 | 类型转换 + 约束 + 验证器 |
| 依赖 | 零 | 第三方（含 Rust 扩展 pydantic-core） |
| JSON 序列化 | 手写 | 内置，还产 JSON Schema |
| 实例化开销 | 最小 | 大约贵几倍 |
| 典型位置 | 内部数据结构、值对象 | API/消息边界、配置 |

一句话决策：**数据从不可信的外部进来，用 Pydantic；只在自己代码内部流动，用 dataclass**。中间地带两个旁支：`attrs` 功能与 dataclass 相近但配置更细（老代码库常见），`msgspec` 比 Pydantic 再快数倍且支持 MessagePack（极致吞吐场景）。Pydantic 靠 Rust 内核在 v2 把验证开销降了一个数量级，多数 Web 场景不再是瓶颈，但「每次属性赋值都重新校验」（`validate_assignment=True`）这类开关仍要慎开。

`attrs` 的看家本领是**声明式校验器与转换器**——dataclass 没有对应物，Pydantic 有但形态不同：

```python
import attrs

@attrs.define
class User:
    name: str = attrs.field(validator=attrs.validators.min_len(2))
    email: str = attrs.field()

    @email.validator
    def _check_email(self, attribute, value):
        if "@" not in value:
            raise ValueError("邮箱格式不合法")

@attrs.define
class Config:
    port: int = attrs.field(converter=int, default=8080)   # "8080" 也能进来
    debug: bool = attrs.field(converter=lambda x: str(x).lower() == "true", default=False)

print(Config(port="9000").port)    # 9000 —— converter 在赋值前自动转型
```

逐段解释：`validator` 在构造时执行，不合法直接抛 `ValueError`；`converter` 更进一步——它不是校验而是**转换**，任何输入先过一遍函数再落字段。对比三者的分工：dataclass 全不管（自己写 `__post_init__`），attrs 声明式管，Pydantic 全家桶管（含类型强制与 JSON Schema）。接手老代码库看到 `@attr.s` / `@attrs.define` 与 `attr.ib()`，按本段语义翻译即可。

## 读老代码必备：v1 到 v2 对照表

Pydantic v2（2023 年发布）是一次几乎完全的重写，网上大量教程还是 v1 写法。对不上的 API 查这张表：

| v1 写法 | v2 写法 |
| --- | --- |
| `.dict()` | `.model_dump()` |
| `.json()` | `.model_dump_json()` |
| `.parse_obj(d)` | `.model_validate(d)` |
| `.parse_raw(s)` | `.model_validate_json(s)` |
| `.copy()` | `.model_copy()` |
| `class Config:` | `model_config = ConfigDict(...)` |
| `orm_mode = True` | `from_attributes = True` |
| `@validator` | `@field_validator`（`pre=True` 对应 `mode="before"`） |
| `@root_validator` | `@model_validator` |
| `update_forward_refs()` | `model_rebuild()` |
| `Field(..., env=...)` | 移到独立的 pydantic-settings 包 |

另一个语义变化专坑迁移：v1 里 `x: Optional[int]` 不写默认值也默认 `None`；v2 不再隐式补默认，可选字段必须显式 `x: int | None = None`，只写注解不写默认值就是必填字段。

## 常见坑点

坑一：可变默认值。dataclass 直接写 `items: list[int] = []` 会在类创建时抛 `ValueError: mutable default ... use default_factory`——这是保护不是故障：

```python
from dataclasses import dataclass, field

@dataclass
class Device:
    tags: list[str] = field(default_factory=list)   # 每个实例一份新列表
```

Pydantic 的 `BaseModel` 内部深拷贝默认值，`tags: list[str] = []` 反而安全；但跨两种风格写代码时，统一用 `default_factory` 最省心（机制详解见 [dataclass 字段与默认值](/python/560-DataClassFieldDefault)）。

坑二：dataclass 继承的字段顺序。子类字段排在父类之后，若父类字段没默认值、子类字段有，生成的 `__init__` 会「无默认参数跟在有默认参数后面」：

```python
@dataclass
class Base:
    name: str            # 无默认

@dataclass
class Child(Base):
    level: int = 1       # 有默认
```

```text
TypeError: non-default argument 'name' follows default argument
```

修法：给父类字段也补默认值，或全链路用 `@dataclass(kw_only=True)`（3.10 起）让字段只收关键字参数，顺序问题直接消失。

坑三：frozen dataclass 里改不动 `__post_init__`。`frozen=True` 禁止赋值，派生字段要绕道底层：

```python
@dataclass(frozen=True)
class Point:
    x: float
    y: float
    norm: float = 0.0

    def __post_init__(self):
        object.__setattr__(self, "norm", (self.x ** 2 + self.y ** 2) ** 0.5)
```

坑四：`model_config` 继承是整体替换不是合并。子类写 `model_config = ConfigDict(extra="allow")` 会把父类的 `frozen=True` 等设置一并冲掉，要显式带全：`ConfigDict(**Parent.model_config, extra="allow")`。

坑五：验证器里的 `return v` 不能忘。`@field_validator` 的返回值就是最终赋进模型的值，只写检查不写 return，字段会悄悄变成 `None`。

## 性能小抄

数据可信时绕过校验：`M.model_construct(x=42)` 不跑验证器，从数据库回读已知干净数据时快数倍。批量校验用 `TypeAdapter` 一次验证整个列表，别在循环里逐个 `Model(**row)`：

```python
from pydantic import TypeAdapter

devices = TypeAdapter(list[Device]).validate_python(raw_rows)
```

## 自我检查

- 能复述「dataclass 不校验，Pydantic 校验」的分工边界与一句话决策规则；
- 能写出 `Annotated[int, Field(ge=0, le=100)]` 风格的约束字段并解释宽松转换的含义；
- 看到报错 `Input should be a valid integer` 能定位到字段与原始输入；
- 能默写 `.dict()` 对应的 v2 方法名；
- 知道可选字段在 v2 必须显式 `= None`。

## 练习

1. 预测题：`Device(name="x", volume="60")` 在 dataclass 版本和 Pydantic 版本里分别发生什么？先写结论再运行验证。
2. 修改题：给本文 `Device` 加字段 `status: str`，要求只能取 `"online"` 或 `"offline"`（提示：`Literal` 类型）。
3. 实战题：写函数 `parse_devices(raw: str) -> list[Device]`，输入一段 JSON 数组字符串，用 `model_validate_json` 一次性解析并校验；喂一条 `volume` 超界的脏数据，确认 `ValidationError` 输出里含行号信息。
4. 挑战题：把一个 dataclass 版模型改造成 frozen + slots，并用 `sys.getsizeof` 或 `pympler` 对比百万实例的内存差； slots 从 3.10 起才受 `@dataclass(slots=True)` 支持，注意版本。

## 下一步

- dataclass 字段机制（`field`、`__post_init__`、初始化顺序）的完整展开：[dataclass 字段与默认值](/python/560-DataClassFieldDefault)；
- FastAPI 如何把本篇的模型变成自动文档与请求校验：[Python FastAPI](/python/880-PythonFastAPI)；
- 校验要持久化到数据库时，模型如何映射表结构：[SQLAlchemy](/python/830-PythonSQLAlchemy)。
