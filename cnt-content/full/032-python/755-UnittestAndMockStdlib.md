---
order: 690
title: unittest 与 unittest.mock：标准库测试与替身
module: 'python'
category: 后端技术
difficulty: beginner
description: 标准库测试体系全景——unittest 的类式组织与 assert 断言族、setUp/tearDown 与 pytest fixture 的对应、unittest.mock 的 patch/MagicMock 打桩、call 断言与 speccing 防漂移、遗留 unittest 项目被 pytest 直接兼容运行的迁移路径；数据库仓储打桩、HTTP 超时分支替身、命令行集成测试三个工程场景逐行拆解。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 标准库的「测试与测试替身」——`unittest`（xUnit 家族的类式测试框架，JUnit 的 Python 直系）与 `unittest.mock`（测试替身：Mock、MagicMock、patch）。它们是 pytest 之外的第二套测试体系，**随解释器自带、零安装**。
- **解决什么问题**：运维脚本、一次性工具、不能引入第三方依赖的受限环境（离线内网、极简镜像）也需要测试；接手遗留项目时满屏 `class TestXxx(unittest.TestCase)` 与 `@patch`，不认识这套语法就没法改代码；pytest 官方也把 mock 的语义建立在 `unittest.mock` 之上（`mocker.patch` 是它的包装）——绕不开。
- **什么时候用到**：零依赖环境写测试、维护遗留 unittest 项目、理解 pytest 里 `mocker` 的底层语义、给 Python 标准库贡献代码（CPython 自身测试就是 unittest 风格）。pytest 侧的对应能力（fixture、monkeypatch、parametrize）见 [Python 测试](/python/750-PythonTest)，两篇是互补关系不是替代关系；被测对象里若出现 SQLAlchemy 会话、HTTP 客户端，打桩前的分层设计参考 [SQLAlchemy](/python/830-PythonSQLAlchemy) 与 [HTTP 客户端](/python/320-HttpClient)。

## unittest 的骨架：类式组织与断言族

### 心智模型：TestCase 类 = 一组共享环境设定的断言集合

pytest 是「函数 + 约定」风格，unittest 是「类 + 继承」风格：每个测试是一个方法，方法名以 `test` 开头；类里可以定义成对的钩子方法管理环境。最小可用样例先立骨架：

```python
# test_billing.py —— python -m unittest test_billing 直接运行，零配置
import unittest

from billing import split_bill

class TestSplitBill(unittest.TestCase):
    def test_even_split(self):
        self.assertEqual(split_bill(100, 4), (25, 0))

    def test_rejects_zero_people(self):
        with self.assertRaises(ValueError):
            split_bill(100, 0)

    def test_remainder_goes_to_first(self):
        self.assertEqual(split_bill(101, 4), (26, 25, 25, 25))

if __name__ == "__main__":
    unittest.main()
```

逐段解释：`unittest.main()` 让脚本可直接执行（它扫描当前模块的 TestCase 并运行）；命令行 `python -m unittest discover -s tests` 是发现整个目录的标准入口。断言用 `self.assertXxx(...)` 而不是裸 `assert`——这是与 pytest 最大的风格分歧。为什么坚持断言族方法而不是裸 assert：其一，`python -O` 会剥掉全部裸 assert，守卫失效；其二，断言族失败时输出结构化信息（`AssertionError: 25 != 26`），而裸 assert 只有表达式本身（pytest 的自省是它自己做的增强，unittest 没有）。换成裸 assert 的写法：测试「能过」但失败信息贫瘠且被 `-O` 一键瓦解，遗留代码 review 时见到要指出。

常用断言族按用途记忆（比背全表高效）：

```python
class AssertFamilyDemo(unittest.TestCase):
    def test_family(self):
        # 相等与近似
        self.assertEqual(1 + 1, 2)                     # == 与失败时 diff
        self.assertAlmostEqual(0.1 + 0.2, 0.3, places=7)   # 浮点必用
        # 布尔与成员
        self.assertTrue("a" in "abc")
        self.assertIn("error", "an error occurred")
        self.assertIsNone(None)                        # is None，不是 == None
        # 异常与警告
        with self.assertRaises(ValueError) as cm:
            int("not-a-number")
        self.assertIn("invalid literal", str(cm.exception))  # 断言异常消息
        # 类型与日志
        self.assertIsInstance([], list)
```

浮点为什么必须 `assertAlmostEqual`：`0.1 + 0.2 != 0.3` 是二进制浮点的表示误差（见 [十进制与分数](/python/230-DecimalFractions)），`assertEqual` 必红。`assertRaises` 的 `as cm` 写法能继续断言异常消息——异常类型对、消息错的服务端错误同样要拦住（异常体系见 [异常处理](/python/130-ExceptionHandling)）。

### setUp/tearDown：pytest fixture 的原型

unittest 的环境管理是四个钩子方法，与 pytest fixture 的对应关系值得背下来：

```python
class TestUserRepository(unittest.TestCase):
    def setUp(self):                    # 每个测试方法前各跑一次 ≈ pytest fixture（函数级）
        self.repo = UserRepository(":memory:")   # SQLite 内存库（见 825 篇）

    def tearDown(self):                 # 每个测试方法后各跑一次 ≈ fixture 的 yield 之后
        self.repo.close()

    @classmethod
    def setUpClass(cls):                # 整个类一次 ≈ fixture(scope="class")
        cls.config = load_test_config()

    @classmethod
    def tearDownClass(cls):             # 类结束时一次
        cls.config.cleanup()

    def test_create_user(self):
        uid = self.repo.create("ada")
        self.assertEqual(self.repo.get(uid).name, "ada")
```

与 pytest 的对照（750 篇的 fixture 知识直接迁移）：unittest 里**环境靠继承链传播**——子类 TestCase 自动获得父类的 setUp；pytest 里靠**参数名引用**传播（conftest.py 的约定式装配）。两个易错点：其一，setUp 中途抛异常时 tearDown **不会**执行（资源可能泄漏），需要确定性清理的资源用 `addCleanup`——它注册的清理函数无论 setUp 成败都会跑，语义更接近 pytest 的 yield-fixture；其二，setUpClass 里的状态是全类共享的，一个测试改了 `cls.config`，后面的测试全被污染——共享状态必须只读（与 750 篇「scope 慎共享」是同一条纪律）。

```python
class TestWithCleanup(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)   # 即使下一行抛异常也会清理
        self.repo = UserRepository(os.path.join(self.tmpdir.name, "db.sqlite"))
```

## unittest.mock：替身的完整体系

### 心智模型：Mock 是「会记录调用历史的假对象」

测试替身（test double）解决一个矛盾：被测代码依赖数据库、网络、时间这些**慢、不稳、有副作用**的东西，但测试要**快、稳、无副作用**。`unittest.mock` 的答案是一个万能假对象：调用它的任何方法都返回另一个 Mock、同时把「谁在什么参数下调了我」记下来供断言：

```python
from unittest.mock import MagicMock

def test_mock_intuition():
    db = MagicMock()                        # 万能假对象
    db.get_user(42).name = "Ada"            # 链式配置返回值

    result = process(db, 42)                # 被测代码拿着假 db 正常工作
    db.get_user.assert_called_once_with(42) # 断言「以 42 为参恰好调了一次」
```

Mock 的行为配置四件套与调用断言四件套：

```python
from unittest.mock import MagicMock, call

def test_configuration_and_assertions():
    svc = MagicMock()
    # 行为配置
    svc.fetch.return_value = [1, 2, 3]              # 固定返回值
    svc.fetch.side_effect = TimeoutError("slow")    # 抛异常；或给函数/可迭代实现动态返回
    svc.fetch_all.side_effect = lambda q: [q] * 2   # 用函数模拟真实逻辑
    # 调用断言
    svc.fetch("q1")
    svc.fetch.assert_called()                       # 调过（至少一次）
    svc.fetch.assert_called_once_with("q1")         # 恰好一次且参数正确
    svc.fetch.assert_called_with("q1")              # 最近一次参数正确
    assert svc.fetch.call_count == 1
    assert svc.fetch.call_args == call("q1")        # call 对象可比较
```

易错点（本模块最高频翻车处）：`assert_called_once_with(x)` 与 `assert_called_with(x)` 一字之差——前者要求**全程恰好一次**，后者只检查**最近一次**；用错后测试「该红时绿」是最危险的测试失效。另一个：`MagicMock` 与 `Mock` 的区别只在前者预配置了魔术方法（`__len__`、`__iter__`、上下文协议），替身要进 `with` 或被迭代就必须用 `MagicMock`——用 `Mock` 顶上时 `TypeError` 才发现。`AsyncMock` 处理 `async def`（await 语义不同，[异步编程进阶](/python/670-AsyncProgrammingDetailed) 的 awaitable 协议）。

### patch：替换目标与「写错位置」的头号陷阱

`patch` 在测试期间把指定名字**临时替换**为 Mock，退出时还原——它就是 pytest `monkeypatch.setattr` 的装饰器化。它有一个必须刻进肌肉记忆的规则：

**patch 的目标是被测代码「使用」它的命名空间，不是「定义」它的命名空间。**

```python
# app/client.py —— 被测模块
import http.client

def fetch_status(host: str, path: str) -> int:
    conn = http.client.HTTPConnection(host, timeout=2)
    conn.request("GET", path)
    resp = conn.getresponse()
    return resp.status

# test_client.py
from unittest import mock
import unittest

class TestFetchStatus(unittest.TestCase):
    @mock.patch("app.client.http.client.HTTPConnection")   # 正确：patch 使用处
    def test_timeout_branch(self, mock_conn_cls):
        mock_conn_cls.side_effect = TimeoutError

        with self.assertRaises(TimeoutError):
            fetch_status("api.example.com", "/health")

    @mock.patch("http.client.HTTPConnection")               # 错误示范
    def test_wrong_target(self, mock_conn_cls):
        mock_conn_cls.side_effect = TimeoutError
        # fetch_status 里查的是 app.client.http 这个模块属性，
        # 拿到的仍是真实的 HTTPConnection —— 测试在打真网络，还可能「通过」
        fetch_status("api.example.com", "/health")
```

逐行解释为什么「使用处」才是正确目标：`import http.client` 之后，`app.client` 模块的名字空间里有一个指向 `http.client` **模块对象**的引用 `http`；`fetch_status` 运行时沿 `app.client.http.client.HTTPConnection` 这条属性链查找。`@mock.patch("http.client.HTTPConnection")` 改的是**源头**模块的属性——听起来也能生效？能，但有并发与次序问题：改源头影响**所有**正在使用它的模块（其他测试、其他线程都被波及），而且若被测代码用的是 `from http.client import HTTPConnection`（名字拷贝进自己命名空间），改源头**完全无效**。统一规则：**永远 patch 被测模块的名字**——`from X import y` 的代码要 patch `"app.client.y"`。验证 patch 生效没有猜的成分：在测试里 `print(mock_conn_cls.called)` 或故意 `side_effect = Exception`，跑一下看异常是否从被测代码里冒出来。

patch 的四种用法等价，按场景选：

```python
from unittest import mock

# 用法一：装饰器（最常见，参数逆序注入）
@mock.patch("app.client.http.client.HTTPConnection")
def test_a(mock_conn): ...

# 用法二：上下文管理器（只在这几行生效，不污染整个方法）
def test_b(self):
    with mock.patch("app.client.get_token", return_value="TEST"):
        ...

# 用法三：setUpClass/start-stop（整个类共享，手动控制）
# 用法四：patch.object(SomeClass, "method")（按对象而非字符串定位，重构友好）
def test_d(self):
    with mock.patch.object(UserRepository, "create", return_value=1):
        ...
```

### 例子一（真实工程）：给数据库仓储层打桩

服务层的单测不该真连数据库（慢、需要环境、状态难复位）。把仓储替换为 Mock，专注测服务层自身的编排逻辑：

被测实现（注意它依赖的是 repo 这个**参数**，而不是模块级单例——这正是替身能进场的前提）：

```python
# app/service.py
def transfer_points(repo, sender_id: int, receiver_id: int, amount: int) -> None:
    sender = repo.get_user(sender_id)
    if sender.points < amount:
        raise ValueError("余额不足")
    repo.update_points(sender_id, sender.points - amount)
    repo.update_points(receiver_id, sender.points + amount)

# tests/test_service.py
import unittest
from unittest import mock

from app.service import transfer_points

class TestTransferPoints(unittest.TestCase):
    def setUp(self):
        self.repo = mock.MagicMock()
        self.repo.get_user.return_value = mock.Mock(points=100)

    def test_happy_path_updates_both_sides(self):
        transfer_points(self.repo, sender_id=1, receiver_id=2, amount=30)

        self.repo.update_points.assert_has_calls(
            [mock.call(1, 70), mock.call(2, 130)]
        )
        self.assertEqual(self.repo.update_points.call_count, 2)

    def test_insufficient_balance_rejects(self):
        self.repo.get_user.return_value = mock.Mock(points=10)

        with self.assertRaises(ValueError):
            transfer_points(self.repo, 1, 2, 30)

        self.repo.update_points.assert_not_called()   # 拒绝路径必须零写入
```

逐段解释：`self.repo.get_user.return_value = mock.Mock(points=100)` 用 Mock 的**关键字参数构造**一步配置属性——比 `user = Mock(); user.points = 100` 少一行且意图更清楚。`assert_has_calls([call(...), call(...)])` 断言调用序列；注意它默认**不要求连续也不要求穷尽**，要「严格顺序」配 `any_order=False` 且自己核对 call_count（这是它比看起来弱的地方，易错点标注）。`assert_not_called` 是拒绝路径最有价值的断言：业务拒绝时**没有任何写操作**，比检查返回值更接近真实风险（多写一次就是资金事故）。为什么用 `Mock(points=100)` 而不是真 User 对象：这里只用到 points 一个属性，真对象会把测试与 ORM 模型的构造细节（必填字段、会话）耦合——替身只暴露被测逻辑真正消费的形状，这也呼应 750 篇「测行为不测实现」。

### 例子二（真实工程）：HTTP 客户端的超时分支替身

320 篇的 `fetch_status` 有三个分支：正常、超时、非 200。用 patch + side_effect 把三种路径全部收进毫秒级单测：

```python
import unittest
from unittest import mock

from app.client import fetch_status

class TestFetchStatusBranches(unittest.TestCase):
    def _mock_response(self, status: int) -> mock.Mock:
        resp = mock.Mock()
        resp.status = status
        return resp

    @mock.patch("app.client.http.client.HTTPConnection")
    def test_returns_status(self, cls):
        cls.return_value.getresponse.return_value = self._mock_response(200)
        self.assertEqual(fetch_status("h", "/x"), 200)

    @mock.patch("app.client.http.client.HTTPConnection")
    def test_timeout_maps_to_custom_error(self, cls):
        cls.side_effect = TimeoutError
        with self.assertRaisesRegex(TimeoutError, "健康检查超时"):
            fetch_status("h", "/x")

    @mock.patch("app.client.http.client.HTTPConnection")
    def test_503_still_returns_int(self, cls):
        cls.return_value.getresponse.return_value = self._mock_response(503)
        self.assertEqual(fetch_status("h", "/x"), 503)
```

超时映射的完整实现（被测侧），展示替身驱动的防御性编码：

```python
# app/client.py
import http.client

def fetch_status(host: str, path: str) -> int:
    try:
        conn = http.client.HTTPConnection(host, timeout=2)
        conn.request("GET", path)
        resp = conn.getresponse()
        return resp.status
    except (TimeoutError, ConnectionError) as exc:
        raise TimeoutError(f"健康检查超时: {host}") from exc   # 异常链见 130 篇
```

逐段解释测试设计：三个测试共享 `_mock_response` 工厂——Mock 配置代码也要去重，复制三份的测试文件读起来像事故现场。`cls.side_effect = TimeoutError` 让**构造连接**这一步就抛异常，精确模拟「握手超时」；若想模拟「请求发出后读响应超时」，把 side_effect 挪到 `cls.return_value.request` 上——替身可以精确控制故障发生在链路的哪一环，这是真实环境做不到的（真服务器没法只在你第二次调用时慢 0.1 秒）。`assertRaisesRegex` 连异常消息的模式一起断言。易错点：`cls.return_value.getresponse.return_value = ...` 这条链要沿被测代码的调用链逐级配置——漏掉一级，Mock 默认返回新 Mock，`resp.status` 不是 int 而是又一个 Mock，断言以离奇的方式失败（好在报错信息里会看到 Mock 的 repr）。

### 例子三（真实工程）：命令行入口的集成测试（不 patch 的场景）

不是所有测试都要替身。810 篇的 CLI 入口测试应该**只 patch 边界（sys.argv、stdout）**，让真实逻辑全链路运行——这是替身使用的另一面：知道哪里**不该**用：

```python
# app/cli.py
import argparse
import sys

from billing import split_bill

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="bill")
    parser.add_argument("total", type=int)
    parser.add_argument("people", type=int)
    args = parser.parse_args(argv)
    try:
        shares = split_bill(args.total, args.people)
    except ValueError as exc:
        print(f"错误: {exc}", file=sys.stderr)
        return 2
    print(" ".join(map(str, shares)))
    return 0
```

```python
# tests/test_cli.py —— unittest 风格的 CLI 集成测试
import contextlib
import io
import unittest

from app.cli import main

class TestCli(unittest.TestCase):
    def test_prints_shares_and_exit_zero(self):
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            code = main(["101", "4"])
        self.assertEqual(code, 0)
        self.assertEqual(stdout.getvalue().strip(), "26 25 25 25")

    def test_bad_input_gives_exit_two_and_stderr(self):
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            code = main(["100", "0"])
        self.assertEqual(code, 2)
        self.assertIn("错误", stderr.getvalue())
```

逐段解释为什么这里不用 patch `split_bill`：CLI 测试要验证的是「参数解析 → 业务调用 → 输出与退出码」的**整条链路**，把中间环节替换掉等于没测链路。patch 的对象只剩两个系统边界：stdout/stderr（用 `contextlib.redirect_*`，连 mock 都不需要）与 `argv`（靠 `main(argv)` 的参数化设计而不是 patch `sys.argv`——依赖注入优先，与 750 篇 monkeypatch 一节的结论一致）。`main(argv=None)` 这个默认值签名是可测试性的关键设计：生产入口 `main()` 从真实 argv 取值，测试传列表，无 patch 无还原。退出码用 `2` 而不是 `1`：argparse 自己的用法错误用 2，业务错误与之区分是 Unix 惯例。

## 遗留项目：unittest 与 pytest 的兼容运行

pytest 直接发现并运行 unittest 的 TestCase——不需要改一行测试代码。这给了遗留项目一条平滑迁移路径：**新测试用 pytest 风格写，旧测试原样跑，逐步消化**：

```bash
pytest tests/                      # unittest 的 TestCase 一样被收集运行
pytest tests/test_legacy.py -v     # 旧类式测试也吃 -v / -x / -k 全套选项
```

迁移时的几个语义差异要心里有数（都有现成对策）：其一，unittest 的 `setUp` 与 pytest fixture **不会互相感知**——同一测试类里混用两套环境管理，执行顺序是 setUpClass → fixture → setUp → 测试，排查环境问题时按这个顺序想；其二，`self.assertXxx` 在 pytest 下照常工作但失去 pytest 的自省增强（失败输出是 unittest 格式的），新代码建议裸 assert；其三，pytest 的 `mocker`（pytest-mock 插件）底层就是 `unittest.mock.patch`，`mocker.patch("app.client.get_token")` 与 `with mock.patch("app.client.get_token")` 行为一致、自动还原——读懂一个就懂了另一个。反过来（unittest 跑 pytest 风格的 fixture 函数）不成立：fixture 靠 pytest 的收集机制注入参数，裸 unittest 不会装配它们——所以迁移方向只能单向（逐步 pytest 化），不能双向混写。

## 动手实践

练习一（预测题）：下面的测试有几处问题？运行时会怎样？

```python
import unittest
from unittest import mock

from app.client import fetch_status

class TestClient(unittest.TestCase):
    @mock.patch("http.client.HTTPConnection")
    def test_status(self, mock_conn):
        mock_conn.return_value.getresponse.return_value.status = 200
        self.assertEqual(fetch_status("h", "/x"), 200)
```

提示：回想 patch 目标的规则，再想想 `fetch_status` 的 `from ... import` 与 `import` 两种导入方式对名字解析的影响。

<details>
<summary>参考实现</summary>

```python
@mock.patch("app.client.http.client.HTTPConnection")   # patch 使用处
def test_status(self, mock_conn):
    mock_conn.return_value.getresponse.return_value.status = 200
    self.assertEqual(fetch_status("h", "/x"), 200)
```

一处关键问题：patch 目标写在了**定义处**（`http.client`）而不是使用处（`app.client.http`）。由于 `app/client.py` 用的是 `import http.client`（模块引用而非名字拷贝），patch 源头模块属性时 `fetch_status` 经由 `app.client.http` 仍能「碰巧」看到被替换的属性——测试可能绿，但它同时篡改了全局 `http.client` 模块，波及所有并发使用方；若某天被测代码改成 `from http.client import HTTPConnection`，patch 立即静默失效、测试开始打真实网络。修法是统一 patch 被测模块的名字空间。验证方法：给 mock 加 `side_effect = Exception`，若异常没从 `fetch_status` 冒出来，说明 patch 没打中被测代码。
</details>

练习二（实战题）：给 `transfer_points` 补第三个测试：转账金额为负时应抛 `ValueError` 且仓储零调用（连同金额校验写进被测代码）。用 `assert_not_called` 收口。

提示：校验放在 `get_user` 之前还是之后？想想拒绝路径应该产生多少次仓储交互。

<details>
<summary>参考实现</summary>

```python
# app/service.py —— 增加
def transfer_points(repo, sender_id: int, receiver_id: int, amount: int) -> None:
    if amount <= 0:
        raise ValueError("金额必须为正")
    sender = repo.get_user(sender_id)
    if sender.points < amount:
        raise ValueError("余额不足")
    repo.update_points(sender_id, sender.points - amount)
    repo.update_points(receiver_id, sender.points + amount)

# tests/test_service.py —— 增加
def test_negative_amount_rejects_without_any_repo_call(self):
    repo = mock.MagicMock()
    with self.assertRaises(ValueError):
        transfer_points(repo, 1, 2, -5)
    repo.get_user.assert_not_called()          # 参数错误不应触碰仓储
    repo.update_points.assert_not_called()
```

设计要点：金额校验放在最前——参数非法的拒绝不该付出任何 I/O 成本（哪怕只是读）；测试同时断言 `get_user` 与 `update_points` 都没发生，把「拒绝路径零副作用」的契约完整钉住。
</details>

练习三（实战题）：把本篇 CLI 测试改写为 unittest + `mock.patch("sys.argv", ...)` 与不 patch 的两个版本，分别运行，体会 `main(argv)` 参数化设计与 patch `sys.argv` 的差异（至少说出一个：出错时堆栈、可读性、多入口场景）。

提示：argparse 的 `parse_args(None)` 才会去读 `sys.argv[1:]`。

<details>
<summary>参考实现</summary>

```python
# 版本 A：patch sys.argv（不推荐，仅作对照）
class TestCliPatchArgv(unittest.TestCase):
    def test_main(self):
        argv = ["bill", "101", "4"]
        with mock.patch("sys.argv", argv), \
             contextlib.redirect_stdout(io.StringIO()) as out:
            main()                                # main 内部 parse_args(None) 读 sys.argv
        self.assertIn("26 25 25 25", out.getvalue())

# 版本 B：参数化 main(argv)（本篇正文的做法）
class TestCliInjected(unittest.TestCase):
    def test_main(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = main(["101", "4"])
        self.assertEqual(code, 0)
        self.assertEqual(out.getvalue().strip(), "26 25 25 25")
```

差异点：版本 A 的 patch 目标是全局状态，argparse 报错信息里会打印 `sys.argv` 的内容，调试时容易把测试参数误当成真实调用；多进程/多入口（同一进程里两个不同 argv 的调用）在 A 里会互相覆盖。版本 B 零 patch，`main` 的依赖显式出现在签名里——这就是「依赖注入优先，patch 兜底」在最小尺度上的样子。
</details>

练习四（找错题）：这个测试想断言「日志函数把告警同时发给两个渠道」，但断言总是失败或总是通过，找出两处问题：

```python
def test_alerts_both_channels(self):
    pager = mock.Mock()
    slack = mock.Mock()

    alert_all([pager, slack], "磁盘 91%")

    pager.send.assert_called_with("磁盘 91%")
    slack.send.assert_called_with("磁盘 91%")
    pager.send.assert_called_once_with("磁盘 91%")
```

提示：`alert_all` 内部对每个渠道调用 `send` 时若用了关键字参数（`send(msg=...)`），`assert_called_with` 的位置参数形式比对结果是什么？`assert_called_once_with` 挂在 pager 上，能证明 slack 的情况吗？

<details>
<summary>参考实现</summary>

```python
def test_alerts_both_channels(self):
    pager = mock.Mock()
    slack = mock.Mock()

    alert_all([pager, slack], "磁盘 91%")

    pager.send.assert_called_once_with("磁盘 91%")     # 用 once 断言次数
    slack.send.assert_called_once_with("磁盘 91%")     # slack 也要自己断言
    # 若被测实现是 send(msg=text)，则改为：
    # pager.send.assert_called_once_with(msg="磁盘 91%")
```

两处问题：其一，`assert_called_with` 只检查**最近一次**调用——若 `alert_all` 对每个渠道重试两次，位置参数版本仍然绿（最近一次参数对），次数契约要 `assert_called_once_with` 才守得住；其二，`assert_called_once_with` 只挂在 pager 上，slack 从头到尾没被断言——「两个渠道」的契约缺了一半；顺带，参数形式必须与实现一致（位置参数与关键字参数在 call 比对中不相等），这也是 mock 测试「测了实现细节」争议的来源：对调用方式的断言越细，重构越容易被误伤——只断言业务真正关心的调用（发出、发对内容）就够了。
</details>

练习五（实战题）：为 `check_for_update(latest_client, current="1.4.2")` 写三个替身测试：最新版更高返回建议升级字符串、相等返回 None、客户端抛网络异常时返回降级提示。要求全部零网络。

提示：`latest_client.latest_version()` 是替身要配置的唯一方法；异常用 `side_effect = ConnectionError`。

<details>
<summary>参考实现</summary>

```python
import unittest
from unittest import mock

def check_for_update(latest_client, current: str) -> str | None:
    try:
        newest = latest_client.latest_version()
    except ConnectionError:
        return "无法检查更新，请稍后再试"
    if newest != current:
        return f"发现新版本 {newest}（当前 {current}）"
    return None

class TestCheckForUpdate(unittest.TestCase):
    def test_newer_available(self):
        client = mock.Mock()
        client.latest_version.return_value = "1.5.0"
        self.assertEqual(check_for_update(client, "1.4.2"), "发现新版本 1.5.0（当前 1.4.2）")

    def test_up_to_date_returns_none(self):
        client = mock.Mock()
        client.latest_version.return_value = "1.4.2"
        self.assertIsNone(check_for_update(client, "1.4.2"))

    def test_network_error_degrades(self):
        client = mock.Mock()
        client.latest_version.side_effect = ConnectionError
        result = check_for_update(client, "1.4.2")
        self.assertIn("无法检查更新", result)
```

三个测试覆盖「正常、边界、故障」三种行为路径，总耗时毫秒级且永不抖动——替身的价值就在把外部依赖的不可控（对方服务挂了、限流、慢）变成测试里的一行配置。注意版本比较用字符串不等而不是大小比较：语义化版本排序是另一个话题（`packaging.version`），这里的行为契约只是「不同则提示」。
</details>

## 常见坑点速记

- patch 目标写「使用处」：`from X import y` 之后要 patch `"当前模块.y"`；patch 定义处要么无效要么波及全局；
- `assert_called_once_with`（恰好一次）与 `assert_called_with`（最近一次）一字之差，用错后测试该红不红；
- setUp 抛异常时 tearDown 不执行——确定性清理用 `addCleanup`；
- setUpClass 的状态全类共享，一个测试改了它，后续测试全被污染（共享必须只读）；
- 替身要进 `with`、被迭代、取长度，必须 `MagicMock`（预配置魔术方法）；`async def` 用 `AsyncMock`；
- `assert_has_calls` 默认不要求连续、不要求穷尽，严格契约要自己补 call_count；
- 裸 assert 在 `python -O` 下被剥除——unittest 项目坚持 `self.assertXxx`；
- CLI 入口用 `main(argv=None)` 参数化设计替代 patch `sys.argv`，patch 只留给不可注入的系统边界。

## 与之前和之后的知识的关系

- 往前：类与继承（TestCase 的组织机制）见 [面向对象基础](/python/460-OOP)；装饰器（patch 的语法面）见 [装饰器](/python/500-Decorator)；异常体系与 `raise ... from` 见 [异常处理](/python/130-ExceptionHandling)；pytest 侧的对应概念见 [Python 测试](/python/750-PythonTest)。
- 往后：CLI 的完整工程实践见 [Python CLI](/python/810-PythonCLI)；把测试接进 CI 门禁见 [Python CI/CD](/python/780-PythonCICD)；FastAPI 服务的测试客户端（TestClient 的依赖覆盖与 mock 的配合）见 [FastAPI](/python/880-PythonFastAPI)；异步代码的测试（AsyncMock 与 pytest-asyncio）见 [异步编程进阶](/python/670-AsyncProgrammingDetailed)。

## 参考与致谢

- unittest —— Unit testing framework：https://docs.python.org/3/library/unittest.html（PSF License）
- unittest.mock —— mock object library：https://docs.python.org/3/library/unittest.mock.html（PSF License）
- 本篇 API 语义（断言族清单、patch 目标解析规则、filter/autospecc 行为）均以以上官方文档为依据。

## 自我检查

- 能写出含 setUp/assertRaises/addCleanup 的 TestCase 并说出四种钩子的执行时序；
- 能解释「patch 使用处而非定义处」的规则，并演示 `import` 与 `from ... import` 两种写法下各自的正确目标；
- 能用 MagicMock 配置返回值、异常、动态函数三种行为，并用 call 断言调用契约；
- 能说出 MagicMock/Mock/AsyncMock 的分工边界；
- 能描述 unittest 项目被 pytest 兼容运行的机制与两套体系不能双向混写的边界；
- 能判断一个测试「该用替身还是该跑真的」（本篇例子三是分界示范：只 patch 系统边界）。
