---
order: 420
title: 抽象基类与协议：接口约定
module: 'python'
category: 后端技术
difficulty: beginner
description: 用 abc.ABC 与 typing.Protocol 定义接口约定——abstractmethod 强制实现、register 虚拟子类、__init_subclass__ 注册钩子、ABC 与 Protocol 的选型对比；支付渠道插件、存储后端适配器、插件注册表三个工程场景逐行拆解。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 的「接口约定」两件套——`abc` 模块的抽象基类（Abstract Base Class）与 `typing.Protocol` 的结构化协议。它们解决同一个问题（强制/声明「类必须能干什么」），机制相反（ABC 要继承、Protocol 只看形状）。
- **解决什么问题**：支付系统要接微信、支付宝、银联三个渠道，调用方不想写 `if channel == "wechat"` 分支——需要一个「所有渠道都实现 pay/refund」的硬约定；插件系统要让第三方注册实现，框架侧要在**实例化时刻**就能发现漏实现，而不是运行到一半 AttributeError。ABC 把约定变成继承契约（漏实现直接 TypeError），Protocol 把约定变成类型检查器的形状核对（运行时零成本）。
- **什么时候用到**：定义框架的扩展点（插件接口、驱动接口、存储后端）；在类型检查层面约束「传入对象必须有这些方法」（配合 mypy，见 [类型注解与 mypy](/python/530-TypeAnnotationMypy)）；为 [多态](/python/480-OOPAdvanced) 提供可检查的基座。「会写类」到「会设计类」的整体地图见 [面向对象进阶](/python/480-OOPAdvanced)；本篇是其中「抽象基类」一节的专篇展开。

## ABC：把约定变成实例化期的硬约束

### abstractmethod 的强制机制

480 篇的最小示例在这里展开成完整机制：

```python
from abc import ABC, abstractmethod

class PaymentChannel(ABC):
    @abstractmethod
    def pay(self, order_id: str, amount_cents: int) -> str: ...

    @abstractmethod
    def refund(self, transaction_id: str, amount_cents: int) -> bool: ...

    def channel_name(self) -> str:          # 普通方法：抽象类可以有实现
        return self.__class__.__name__

class WechatPay(PaymentChannel):
    def pay(self, order_id: str, amount_cents: int) -> str:
        return f"wx://pay/{order_id}/{amount_cents}"
    # 故意漏掉 refund

# WechatPay()  # TypeError: Can't instantiate abstract class WechatPay
#              # with abstract method refund —— 实例化瞬间被拦
```

逐段解释强制点的位置：`@abstractmethod` 标记的方法成为「未清偿的债务」——**债务在实例化时结算**，不是定义时。`WechatPay` 类定义本身完全合法（类能创建、能被引用），直到 `WechatPay()` 这一刻解释器扫描 `__abstractmethods__` 集合发现还剩 `refund`，抛 TypeError。为什么选实例化时刻而不是类定义时刻：子类可能仍是抽象的（多级继承中中间层就是设计成不实例化的），强制点后移到实例化才不误伤。易错点：抽象方法**有方法体也可以**（`pass` 或默认实现）——方法体只是默认行为，不加装饰器就没有强制力；这是 480 篇「常见陷阱」第一条的机制解释。另一个易错点：`@abstractmethod` 必须与 `ABC`（或 `metaclass=ABCMeta`）配合——单独装饰一个普通类的方法没有任何效果。

### 装饰器叠加的顺序陷阱

抽象属性、抽象类方法的写法里，装饰器顺序是高频错误：

```python
from abc import ABC, abstractmethod

class Repository(ABC):
    @property
    @abstractmethod
    def backend(self) -> str: ...        # 正确：property 在外、abstractmethod 在内

    @classmethod
    @abstractmethod
    def from_env(cls) -> "Repository": ...   # classmethod 在外、abstractmethod 在内

class PgRepository(Repository):
    @property
    def backend(self) -> str:
        return "postgresql"

    @classmethod
    def from_env(cls) -> "Repository":
        return cls()
```

逐段解释顺序规则：`@abstractmethod` 永远是**最内层**（紧贴函数定义）——它的工作是给函数对象打标记，外层的 `@property`/`@classmethod` 再把标记过的对象包装成描述符。写反（`@abstractmethod` 在外层）不报错但**强制力消失**：标记被打在 property 对象上，`__abstractmethods__` 扫描不到，子类漏实现不再被拦——典型的「测试全绿、约定失效」静默故障。

### register：不继承也能成为「子类」

ABC 有一条继承之外的通道：`register` 把一个**已有类**登记为抽象基类的虚拟子类，`isinstance` 立刻生效：

```python
from abc import ABC

class Serializer(ABC): ...

class ThirdPartyXmlSerializer:        # 第三方类，改不了它的继承
    def serialize(self, obj) -> str: ...

Serializer.register(ThirdPartyXmlSerializer)

print(issubclass(ThirdPartyXmlSerializer, Serializer))   # True
print(isinstance(ThirdPartyXmlSerializer(), Serializer)) # True
```

逐段解释适用边界：`register` 只改写 `isinstance`/`issubclass` 的判定，**不检查**第三方类有没有实现约定的方法——它是个「信任声明」，漏方法照样运行到 AttributeError。与继承式子类的三个差异要记牢：虚拟子类不会继承任何实现；`super()` 调不通；`Serializer` 的 `__subclasshook__` 不参与（那是另一条机制）。判断器：能改类定义就用继承（拿到检查与实现复用）；改不了（第三方类、内建类型）才用 register，并自己保证方法齐。

### __init_subclass__：注册表钩子

插件系统的经典需求：每写一个子类，自动登记进框架的注册表，第三方「定义即注册」。`__init_subclass__`（3.7+）是比元类轻量的钩子：

```python
from abc import ABC, abstractmethod

class StorageBackend(ABC):
    registry: dict[str, type["StorageBackend"]] = {}

    def __init_subclass__(cls, /, scheme: str | None = None, **kwargs):
        super().__init_subclass__(**kwargs)
        if scheme is not None:              # 带了 scheme 关键字参数的才算插件
            cls.registry[scheme] = cls

    @abstractmethod
    def read(self, path: str) -> bytes: ...

    @abstractmethod
    def write(self, path: str, data: bytes) -> None: ...

class S3Backend(StorageBackend, scheme="s3"):
    def read(self, path: str) -> bytes: return b"s3-data"
    def write(self, path: str, data: bytes) -> None: ...

class InternalDraft(StorageBackend):      # 不带 scheme：中间抽象层，不进注册表
    pass

print(StorageBackend.registry)            # {'s3': <class S3Backend>}
```

逐段解释：`__init_subclass__` 在**每个子类定义完成时**自动以类对象为参数调用（不需要装饰器也不需要元类）；`scheme="s3"` 这样的关键字参数直接写在继承行上，被 `__init_subclass__` 接收——这是「类级配置」的标准语法。`/` 表示 scheme 之后只允许关键字（参数仅限关键字的标记，见 [函数详解](/python/100-FunctionDetailed)）。与元类的分工：只是「子类注册/校验」这类轻钩子用 `__init_subclass__`（可读性高、可叠加继承），要改写类的创建过程本身（拦截属性、修改命名空间）才上元类（见 [元类](/python/590-Metaclass)）。注意 `registry` 是类属性共享字典——多进程 fork 后各自一份，跨进程共享要换注册中心。

## Protocol：不继承的形状约定

### runtime_checkable 与它的边界

Protocol 的完整机制在 [类型注解与 mypy](/python/530-TypeAnnotationMypy) 的 Protocol 一节，这里补运行时一侧的边界：

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...

class DatabaseConn:
    def close(self) -> None: ...          # 零继承，形状匹配

class HalfBaked:                          # 有 close 属性但是个整数
    close = 42

print(isinstance(DatabaseConn(), Closeable))   # True —— 形状匹配
print(isinstance(HalfBaked(), Closeable))      # 也是 True！—— 只查「有没有」，不查「是不是方法」
```

逐段解释：`@runtime_checkable` 让 Protocol 可以进 `isinstance`，但检查机制是**只看属性名存在与否**（`hasattr` 语义），不看类型与签名——`close = 42` 也算「有 close」。所以运行时 isinstance 只是粗筛，真正的签名核对在 mypy 静态层。判断器：运行时需要严格的形状校验时，Protocol 的 isinstance 不够用，要么用 ABC 的继承检查（继承是真的实现关系），要么显式调用一次（AttributeError/TypeError 兜底）。

### ABC 与 Protocol 的选型对照

| 维度 | ABC | Protocol |
| --- | --- | --- |
| 约定方式 | 继承（显式声明「我是」） | 形状匹配（「能干就行」） |
| 强制时机 | 实例化时 TypeError | 仅静态检查（mypy），运行时不拦 |
| 可检查第三方类 | register 可挂，但无校验 | 天然支持（不要求改对方代码） |
| 实现复用 | 可带具体方法供子类用 | 无实现继承 |
| 运行时 isinstance | 可靠 | 仅属性名级粗筛 |

选型口诀：**框架扩展点用 ABC**（要运行时强制 + 实现复用 + 注册钩子，本篇三个例子全是这个形态）；**类型标注与静态约束用 Protocol**（函数参数声明「给我一个有 read 方法的对象」，不动继承树，[Python 测试](/python/750-PythonTest) 里测试替身天然满足 Protocol）。两者不互斥：对外接口用 ABC 定义，辅助函数的参数标注用 Protocol 收窄。

## 例子一（真实工程）：支付渠道插件接口

把开头的骨架变成可运行的完整回路：渠道实现 + 工厂按渠道名分发。调用方只认 `PaymentChannel`，新增渠道零改动调用侧：

```python
from abc import ABC, abstractmethod

class PaymentChannel(ABC):
    channels: dict[str, "PaymentChannel"] = {}

    def __init_subclass__(cls, /, name: str, **kwargs):
        super().__init_subclass__(**kwargs)
        PaymentChannel.channels[name] = cls()      # 定义即实例化注册

    @abstractmethod
    def pay(self, order_id: str, amount_cents: int) -> str: ...

    @abstractmethod
    def refund(self, txn_id: str, amount_cents: int) -> bool: ...

class WechatPay(PaymentChannel, name="wechat"):
    def pay(self, order_id: str, amount_cents: int) -> str:
        return f"https://wx.tenpay.com/cgi-bin/mmpay?order={order_id}"
    def refund(self, txn_id: str, amount_cents: int) -> bool:
        return amount_cents > 0

class Alipay(PaymentChannel, name="alipay"):
    def pay(self, order_id: str, amount_cents: int) -> str:
        return f"https://openapi.alipay.com/gateway?out_trade_no={order_id}"
    def refund(self, txn_id: str, amount_cents: int) -> bool:
        return True

def checkout(channel: str, order_id: str, cents: int) -> str:
    return PaymentChannel.channels[channel].pay(order_id, cents)

print(checkout("wechat", "A001", 9900))
# https://wx.tenpay.com/cgi-bin/mmpay?order=A001
```

逐段解释组合设计：`__init_subclass__(cls, /, name: str, ...)` 强制每个插件必须声明渠道名（漏写 name 直接 TypeError，配置错误在定义期暴露）；`channels` 注册表存**实例**而非类——支付渠道通常无状态，实例化一次避免每次请求重建。新接银联只需新增一个子类，`checkout` 与既有渠道零改动——这就是 ABC + 注册钩子的「开闭原则」落地（设计模式全景见 [Python 设计模式](/python/610-PythonDesignPattern)，单例等模式的实现细节见 [单例模式](/python/600-SingletonPattern)）。换成 if-elif 分发会发生什么：每加一个渠道改两处（分支 + import），漏改一处只有运行到那一单才炸。

## 例子二（真实工程）：存储后端适配器

应用要同时支持本地盘与 S3，上传下载逻辑只写一份，靠接口抽象后端差异——这是「依赖倒置」在 ABC 上的最小实现：

```python
from abc import ABC, abstractmethod
from pathlib import Path

class ObjectStore(ABC):
    @abstractmethod
    def save(self, key: str, data: bytes) -> str: ...

    @abstractmethod
    def load(self, key: str) -> bytes: ...

class LocalStore(ObjectStore):
    def __init__(self, root: Path):
        self.root = root

    def save(self, key: str, data: bytes) -> str:
        target = self.root / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)                  # 文件 API 见 300/302 篇
        return str(target)

    def load(self, key: str) -> bytes:
        return (self.root / key).read_bytes()

class MemoryStore(ObjectStore):                   # 测试替身：同接口、零 IO
    def __init__(self) -> None:
        self._buckets: dict[str, bytes] = {}

    def save(self, key: str, data: bytes) -> str:
        self._buckets[key] = data
        return f"mem://{key}"

    def load(self, key: str) -> bytes:
        return self._buckets[key]

def upload_avatar(store: ObjectStore, user_id: int, image: bytes) -> str:
    return store.save(f"avatars/{user_id}.png", image)   # 只依赖抽象

prod = upload_avatar(LocalStore(Path("/data")), 42, b"\x89PNG...")
test = upload_avatar(MemoryStore(), 42, b"\x89PNG...")
```

逐段解释：`upload_avatar` 的参数类型是 `ObjectStore`——它对「数据在哪」全然不知，这就是依赖倒置（依赖抽象不依赖具体）。`MemoryStore` 是同一接口的测试替身，单测里传它就免了磁盘 IO 与清理（替身体系的另一面见 [unittest 与 mock](/python/755-UnittestAndMockStdlib) 与 [Python 测试](/python/750-PythonTest)）；新增 `S3Store` 时 `upload_avatar` 一行不改。与 Protocol 版的对比：本例的接口里**没有共享实现**、调用方在运行时也用不着 isinstance 强制，用 Protocol 标注 `store: ObjectStore(Protocol)` 同样成立——选 ABC 的理由是「存储后端」是长期演化的插件族，未来大概率要加 `exists`/`delete` 并带默认实现，ABC 的实现复用留好了口子。

## 例子三（真实工程）：插件注册表与 capability 协商

对应 860 篇插件化任务的骨架：框架定义能力接口，插件按能力注册，运行时按需取用：

```python
from abc import ABC, abstractmethod
from collections.abc import Iterator

class Extractor(ABC):
    """文档抽取器插件接口：每类一个子类，自动注册。"""

    capabilities: frozenset[str] = frozenset()

    def __init_subclass__(cls, /, **kwargs):
        super().__init_subclass__(**kwargs)
        EXTRACTOR_PLUGINS.append(cls())

    @abstractmethod
    def supports(self, filename: str) -> bool: ...

    @abstractmethod
    def extract(self, data: bytes) -> str: ...

EXTRACTOR_PLUGINS: list[Extractor] = []

class PdfExtractor(Extractor):
    capabilities = frozenset({"pdf", "ocr"})
    def supports(self, filename: str) -> bool:
        return filename.lower().endswith(".pdf")
    def extract(self, data: bytes) -> str:
        return "PDF 文本内容"

class TextExtractor(Extractor):
    capabilities = frozenset({"text"})
    def supports(self, filename: str) -> bool:
        return filename.lower().endswith((".txt", ".md"))
    def extract(self, data: bytes) -> str:
        return data.decode("utf-8", errors="replace")

def dispatch(filename: str, data: bytes) -> str:
    for plugin in EXTRACTOR_PLUGINS:          # 顺序 = 子类定义顺序
        if plugin.supports(filename):
            return plugin.extract(data)
    raise LookupError(f"没有插件支持 {filename}")

print(dispatch("doc.pdf", b"%PDF-"))          # PDF 文本内容
print(dispatch("notes.txt", "笔记".encode()))  # 笔记
```

逐段解释：`supports` + `extract` 两方法把「认领」与「干活」分开——比单一 `extract(filename, data)` 内部 if 判断干净（每个插件只管自己的类型判断）。`EXTRACTOR_PLUGINS` 定义在类**之后**（`__init_subclass__` 执行时它必须已存在，定义顺序是这类自动注册代码的隐形约束，放前面会 NameError）。`dispatch` 兜底 `LookupError`——「没有插件认领」是运行时才可能发生的业务事件，异常语义见 [异常处理](/python/130-ExceptionHandling)。import 时机即注册时机：插件模块被 import 就进表，配合包的 `__init__.py` 里 `pkgutil.iter_modules` 批量 import 即可实现目录级插件发现（包工程见 [模块与包](/python/720-ModulePackageEngineering)）。

## 常见坑点速记

- `@abstractmethod` 必须最内层（紧贴 def），外层套 property/classmethod——写反静默失去强制力；
- 强制点在**实例化**不在类定义：抽象子类可以继续被继承，`__abstractmethods__` 清空才能实例化；
- `register` 的虚拟子类只改 isinstance 判定，不校验方法、不继承实现——漏方法运行时才炸；
- `@runtime_checkable` 的 isinstance 只查属性存在（`close = 42` 也算），签名核对只在 mypy 静态层；
- `__init_subclass__` 里引用的模块级容器必须**先于基类定义**，插件注册表是「定义顺序敏感」的；
- 抽象方法可以有方法体（默认实现），但不加装饰器就没有强制力——「想要默认行为」与「想要强制约定」要分开决定；
- 框架扩展点选 ABC（强制 + 复用 + 钩子），函数参数的类型约束选 Protocol（零继承、测试替身友好）。

## 动手实践

练习一（预测题）：下面代码的每一步分别发生什么？

```python
from abc import ABC, abstractmethod

class Base(ABC):
    @abstractmethod
    def run(self): ...

class Middle(Base):
    pass

class Leaf(Middle):
    def run(self):
        print("leaf run")

Base()
Middle()
Leaf()
```

提示：强制点在实例化；中间层没实现抽象方法意味着什么。

<details>
<summary>参考实现</summary>

`Base()` 抛 `TypeError: Can't instantiate abstract class Base with abstract method run`；`Middle()` 同样抛 TypeError（它没实现 run，`__abstractmethods__` 原样继承）——**多级继承中中间抽象层正是设计意图**；`Leaf()` 正常打印 `leaf run`（run 已实现，抽象集清空）。把 `Leaf.run` 的名字改成 `runs` 再跑：Leaf 也变成抽象类、实例化报错，错误信息列出缺失方法名——这就是 ABC 「报错即文档」的排障体验。
</details>

练习二（实战题）：给例子一的支付渠道补 `ApplePay`（`name="apple"`），并为 `PaymentChannel` 增加「渠道能力」声明：抽象属性 `supports_refund: bool`，让 `checkout_refund(channel, ...)` 在能力不支持时抛 `NotImplementedError`。要求强制声明在**类定义期**生效（漏写 supports_refund 的子类定义时就报错）。

提示：`supports_refund` 用 `__init_subclass__` 的必填关键字参数实现，比抽象属性更早暴露。

<details>
<summary>参考实现</summary>

```python
from abc import ABC, abstractmethod

class PaymentChannel(ABC):
    channels: dict[str, "PaymentChannel"] = {}

    def __init_subclass__(cls, /, name: str, supports_refund: bool, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.supports_refund = supports_refund
        PaymentChannel.channels[name] = cls()

    @abstractmethod
    def pay(self, order_id: str, amount_cents: int) -> str: ...
    @abstractmethod
    def refund(self, txn_id: str, amount_cents: int) -> bool: ...

class ApplePay(PaymentChannel, name="apple", supports_refund=False):
    def pay(self, order_id: str, amount_cents: int) -> str:
        return f"apple://pay/{order_id}"
    def refund(self, txn_id: str, amount_cents: int) -> bool:
        raise NotImplementedError

def checkout_refund(channel: str, txn_id: str, cents: int) -> bool:
    impl = PaymentChannel.channels[channel]
    if not impl.supports_refund:
        raise NotImplementedError(f"{channel} 不支持退款")
    return impl.refund(txn_id, cents)
```

设计取舍：能力开关放进 `__init_subclass__` 的必填参数，漏写的子类**定义时**就 TypeError——比抽象属性（实例化时才查）更早；`checkout_refund` 的统一前置检查把「能力协商」从各插件收口到框架层。
</details>

练习三（实战题）：把例子三的 `dispatch` 改造为「按 capability 过滤」：实现 `list_capable(capability: str) -> list[Extractor]` 返回声明了该能力的插件，并让 `dispatch` 优先挑支持该文件且声明了 "ocr" 能力的插件（没有再退回一般规则）。

提示：`capabilities` 是 frozenset，成员判断用 `in`；「优先级回退」用两次循环或排序键。

<details>
<summary>参考实现</summary>

```python
def list_capable(capability: str) -> list[Extractor]:
    return [p for p in EXTRACTOR_PLUGINS if capability in p.capabilities]

def dispatch_v2(filename: str, data: bytes) -> str:
    candidates = [p for p in EXTRACTOR_PLUGINS if p.supports(filename)]
    if not candidates:
        raise LookupError(f"没有插件支持 {filename}")
    ocr_first = sorted(candidates,
                       key=lambda p: "ocr" not in p.capabilities)  # 有 ocr 的排前
    return ocr_first[0].extract(data)

print([type(p).__name__ for p in list_capable("ocr")])   # ['PdfExtractor']
```

要点：`sorted` 的键用布尔表达式 `("ocr" not in ...)`——False（有 ocr）排 True（无）前面，一行完成优先级排序，无需两轮循环。能力声明做成 frozenset 而不是 list：成员判断 O(1) 且不可变，插件作者改不动框架的契约。
</details>

练习四（找错题）：这个抽象属性定义有两处问题，先找再修：

```python
from abc import ABC, abstractmethod

class ConfigSource(ABC):
    @abstractmethod
    @property
    def env(self) -> str: ...

class EnvFileSource(ConfigSource):
    @property
    def env(self) -> str:
        return "envfile"
```

提示：装饰器顺序；再想想 abc 对「抽象方法体写成 ...」与 property 的组合有没有额外要求。

<details>
<summary>参考实现</summary>

```python
class ConfigSource(ABC):
    @property
    @abstractmethod
    def env(self) -> str: ...
```

核心问题一处：`@abstractmethod` 在了**外层**——它把标记打在 property 对象上而非函数上，`__abstractmethods__` 收集不到，`env` 失去强制力：任何子类不实现 env 也能实例化，约定静默失效。修复即调换顺序（property 在外、abstractmethod 在内）。第二处（检查点）：子类 `EnvFileSource` 实现正确（同样 property 形态），若它写成普通方法 `def env(self)`，实例化不报错但调用 `source.env` 拿到的是方法对象而不是字符串——抽象声明的形态（property）子类也必须保持，这正是例子二把「渠道能力」改成 `__init_subclass__` 参数而不是抽象属性的原因：属性形态的约定比参数形态更脆。
</details>

练习五（实战题）：用 Protocol 重写例子二的 `upload_avatar` 约束（不改 LocalStore/MemoryStore 的任何代码），并用 mypy 验证：删掉 MemoryStore 的 load 方法后 mypy 报错而运行不受影响。写出 Protocol 定义与两个版本的行为差异总结。

提示：`class StoreProto(Protocol): ...` + 方法签名；mypy 命令 `uv run --with mypy mypy check.py`（工具用法见 030/530 篇）。

<details>
<summary>参考实现</summary>

```python
from typing import Protocol

class StoreProto(Protocol):
    def save(self, key: str, data: bytes) -> str: ...
    def load(self, key: str) -> bytes: ...

def upload_avatar_proto(store: StoreProto, user_id: int, image: bytes) -> str:
    return store.save(f"avatars/{user_id}.png", image)
```

验证与总结：给 MemoryStore 注释掉 `load` 方法后运行 `mypy`——报 `[arg-type]` 类错误（实参缺 load 方法，不满足 StoreProto 形状）；而直接 `python` 运行 upload_avatar_proto 完全正常（Protocol 对运行时零干预，只有 mypy 在静态层拦）。两版差异一句话：ABC 版漏实现**实例化时炸**（运行时防线），Protocol 版漏实现**mypy 时炸**（静态防线、运行时无感）；框架插件点用前者，纯类型约束用后者。
</details>

## 与之前和之后的知识的关系

- 往前：类与继承的语法基础见 [面向对象基础](/python/460-OOP)；多态与 `__slots__` 等类设计主线见 [面向对象进阶](/python/480-OOPAdvanced)；Protocol 的类型系统语义见 [类型注解与 mypy](/python/530-TypeAnnotationMypy)；`__init_subclass__` 与元类钩子的对照见 [元类](/python/590-Metaclass)。
- 往后：接口约定的模式化应用（策略、适配器、注册表）见 [Python 设计模式](/python/610-PythonDesignPattern)；插件的包组织与发现见 [模块与包工程](/python/720-ModulePackageEngineering)；`__init_subclass__` 注册的 Pydantic 模型见 [数据类与 Pydantic](/python/550-DataClassPydantic)；测试替身与接口的配合见 [unittest 与 mock](/python/755-UnittestAndMockStdlib)。

## 参考与致谢

- abc —— Abstract Base Classes：https://docs.python.org/3/library/abc.html（PSF License）
- typing —— Support for type hints（Protocol、runtime_checkable）：https://docs.python.org/3/library/typing.html（PSF License）
- PEP 544（Protocols：Structural subtyping）、PEP 487（`__init_subclass__` 钩子）：https://peps.python.org/
- 本篇 API 语义（abstractmethod 强制时机、register 行为、runtime_checkable 的 hasattr 语义）均以以上官方文档为依据。

## 自我检查

- 能解释 `@abstractmethod` 的强制点为什么在实例化而不是类定义，并演示多级继承中的中间抽象层；
- 能写出 property/classmethod 与 abstractmethod 叠加的正确顺序，并说出写反的静默后果；
- 能说明 `register` 虚拟子类改了什么、没改什么（isinstance 生效、不校验、不继承）；
- 能用 `__init_subclass__` 实现「定义即注册」的插件表，并说出注册容器的定义顺序约束；
- 能陈述 runtime_checkable 的 isinstance 只查属性名（`close = 42` 也通过）这一边界；
- 能按「框架扩展点用 ABC、类型约束用 Protocol」给新需求选型并说出理由。
