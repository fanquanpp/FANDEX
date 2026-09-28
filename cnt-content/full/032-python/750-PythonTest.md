---
order: 530
title: 测试：给代码装上安全网
module: 'python'
category: 后端技术
difficulty: advanced
description: 以 AA 收款函数的 TDD 三步循环开篇，系统上手 pytest：断言自省与发现规则、fixture 与 conftest、parametrize、monkeypatch 隔离副作用、raises 与异常断言、coverage 覆盖率，进阶 hypothesis 属性测试与测试金字塔选型，附「测试实现细节」反模式与四类练习。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'python/510-DecoratorAdvanced'
  - 'python/530-TypeAnnotationMypy'
  - 'python/770-PythonCodeQuality'
  - 'python/780-PythonCICD'
  - 'python/975-PythonCapstoneProject'
prerequisites:
  - 'python/460-OOP'
  - 'python/510-DecoratorAdvanced'
  - 'python/520-ContextManager'
---

## 前置知识

- 会写函数与类，用过 [装饰器](/python/510-DecoratorAdvanced)（pytest 的语法面主要就是几个装饰器）；
- 用过 [上下文管理器](/python/520-ContextManager)（with 块在 raises 一节出场）；
- 装包与环境来自 [虚拟环境](/python/040-PythonVirtualEnv)。

> 先立一个判断：类型注解（上上篇）挡的是「形状错误」——参数传错类型、字段拼错名字；测试挡的是「逻辑错误」——代码形状全对、答案就是错的。两者互补，缺一不可。本文学的是后者，工具选 pytest：2026 年的 Python 项目事实标准。

## 学习目标

读完本文你将能够：

1. 亲历一次完整的「红 - 绿 - 重构」循环：先写失败测试，再写实现让它通过；
2. 掌握 pytest 五件套：裸 assert、测试发现规则、fixture、parametrize、raises；
3. 用 monkeypatch 与 tmp_path 把文件、时间、随机数等副作用隔离在测试之外；
4. 用 coverage.py 量化「测了多少」，并知道行覆盖率的局限；
5. 用 hypothesis 写属性测试，让机器替你找边界用例；
6. 判断一段代码该写单元测试、集成测试还是干脆不测（测试金字塔的落地版）。

预计 55 到 75 分钟，含 2 组动手实验与 4 道练习。

## 1. 你现在要解决什么问题

接着 490 篇那个 AA 收款程序。新需求：三人以上按人头分摊，支持「某人已垫付」。你写了第一版：

```python
def split_bill(total: float, people: list[str], payer: str) -> dict[str, float]:
    share = round(total / len(people), 2)
    result = {p: share for p in people}
    result[payer] = share * (len(people) - 1)
    return result
```

你手动跑了两三次觉得没问题，提交。三天后有人反馈：四个人、总额 100、其中一人垫付——`share * 3` 没问题；可两个人、总额 100、其中一人垫付呢？`share * 1`，对方也付 50，垫付人显示 50——好像对？那三人 100.01 呢，除不尽的余数去哪了？

你发现自己答不上来，因为「手动试」的覆盖完全靠运气。测试就是把这个「试」变成**可重复、可累积、机器自动执行**的代码：每个曾让你心虚的输入，都沉淀成一条断言，以后每次改代码，安全网自动兜底重验。

## 2. 先不要看解释，先试试看：红的循环

装好工具，建立最小项目：

```bash
uv add --dev pytest
mkdir -p src tests
```

按 TDD（测试驱动开发）的节奏走，第一遍体验「先红后绿」。

第一步，红：先写测试，函数还不存在。

```python
# tests/test_split.py
from src.split import split_bill

def test_two_people_split_evenly():
    result = split_bill(100.0, ["阿甜", "小满"], payer="阿甜")
    assert result == {"阿甜": 50.0, "小满": 50.0}
```

```bash
uv run pytest
```

```text
ERROR tests/test_split.py - ModuleNotFoundError: No module named 'src.split'
1 error in 0.1s
```

红色（报错就是红）——它精确告诉你缺什么。TDD 的意义就在这：**测试先定义「对」的标准，实现只是让标准通过的最短路径**。

第二步，绿：写最少的实现。新建 `src/split.py` 贴入上面的 `split_bill`，再跑：

```text
test_split.py .                              [100%]
1 passed in 0.01s
```

第三步，重构：实现和测试都绿了之后，才允许改结构（比如把 round 换成 Decimal），每改一步跑一遍测试。红、绿、重构，就这么循环——纪律简单，威力在「每次改动都有网」。

顺带认识 pytest 的**发现规则**：文件 `test_*.py` 或 `*_test.py`、函数 `test_*`、类 `Test*`（无 __init__）。名字不合规的测试**静默不跑**——「为什么我的测试没执行」九成是名字。

## 3. assert 的超能力与五个必会姿势

pytest 直接用原生 assert，却在失败时给你详尽报告（叫断言自省：它重写了 assert，把两边的值打印出来）：

```text
E       assert {'阿甜': 50.0, ...} == {'阿甜': 50.0, ...}
E         Omitting 1 identical items
E         Differing items:
E         {'小满': 33.33} != {'小满': 50.0}
```

第一个必会姿势，**parametrize**：同一逻辑喂多组输入，不用写十个测试函数：

```python
import pytest

@pytest.mark.parametrize(
    ("total", "people", "payer", "expected"),
    [
        (100.0, ["a", "b"], "a", {"a": 50.0, "b": 50.0}),
        (30.0, ["a", "b", "c"], "b", {"a": 10.0, "b": 10.0, "c": 10.0}),
        (0.01, ["a"], "a", {"a": 0.01}),           # 单人也得能跑
    ],
)
def test_split(total, people, payer, expected):
    assert split_bill(total, people, payer) == expected
```

第二个，**raises**：验证「该炸的时候真的炸」，with 上下文包住调用：

```python
def test_rejects_zero_people():
    with pytest.raises(ValueError, match="至少一人"):
        split_bill(50.0, [], payer="a")
```

（实现里补上 `if not people: raise ValueError("至少一人")`，先红后绿。）第三个，**skip 与 xfail**：`@pytest.mark.skip(reason="环境缺 GPU")` 跳过已知不可跑的；`@pytest.mark.xfail` 标注「已知会挂，挂着别挡 CI」。

第四个，**固定与随机**：`random`、时间这类不确定性是测试的敌人，让它们可预测的手段就是下一节的 monkeypatch。第五个，**只跑需要的**：`pytest test_split.py::test_rejects_zero_people`、`pytest -k split`、`pytest -x`（首个失败即停）、`pytest -v`（逐条列名）——排查时天天用。

## 4. fixture：把「环境准备」变成可复用的零件

测试经常需要前置条件：一个临时目录、一份样例清单、一个连上测试库的对象。fixture 把「准备 + 清理」封装成具名零件，测试函数用参数名声明需要谁：

```python
import json
import pytest
from pathlib import Path

@pytest.fixture
def manifest(tmp_path: Path) -> Path:
    """一份素材清单文件，测试结束自动清理。"""
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps([
        {"vid": 1, "name": "miku", "palette": {"#39C5BB": "teal"}, "primary": "#39C5BB"},
    ]), encoding="utf-8")
    return path

def test_load_manifest(manifest: Path):
    assets = load_assets(manifest)
    assert assets[0].name == "miku"
```

`tmp_path` 是 pytest 内置 fixture（每个测试一个独立临时目录）；`manifest` 是你的 fixture，测试把它当参数收。清理靠 yield 写法：

```python
@pytest.fixture
def db():
    conn = connect_test_db()
    yield conn            # 到这里交出给测试用
    conn.close()          # 测试结束后执行
```

fixture 默认**每个测试独立一份**（测试互不污染的关键）；要共享昂贵的资源用 `@pytest.fixture(scope="module")`，但共享状态必须只读——这是新人翻车点。放在 `tests/conftest.py` 里的 fixture 对整个目录自动可见，不用 import——这是 pytest 的约定式装配。

修改实验一：给 split_bill 写一个 `@pytest.fixture` 提供「三人垫付」的标准场景，parametrize 与 fixture 各用一次，体会「数据组合用 parametrize、环境准备用 fixture」的分界。

## 5. 隔离副作用：monkeypatch 与边界

依赖时间、随机、网络的函数没法直接测——除非你能在测试里**换掉**它们。pytest 的 monkeypatch 专干这个：

```python
# src/daily.py
from datetime import datetime

def greeting(name: str) -> str:
    hour = datetime.now().hour
    return f"早上好 {name}" if hour < 12 else f"下午好 {name}"
```

```python
# tests/test_daily.py
from datetime import datetime

def test_morning(monkeypatch):
    class FakeDateTime(datetime):
        @classmethod
        def now(cls):
            return cls(2026, 9, 28, 8, 0, 0)

    monkeypatch.setattr("src.daily.datetime", FakeDateTime)
    assert greeting("阿甜") == "早上好 阿甜"
```

测试结束后 monkeypatch 自动还原，全局状态零残留。同族操作：`monkeypatch.setenv("API_KEY", "test")` 设环境变量、`monkeypatch.chdir(tmp_path)` 换目录。更大的隔离对象（第三方 API、数据库）优先用**依赖注入**（把依赖做成参数，测试传假实现——上一篇的 Protocol 在这里正好当假实现的类型），Mock 体系（`mocker.patch`，需 pytest-mock 插件）留给改不动签名的遗留代码。

原则一句话：**测试在边界处替换外部世界，在内部只测你写的逻辑**。

## 6. 覆盖率：知道网有多大，也知道网有洞

装 coverage 插件，量化「多少代码被测试执行过」：

```bash
uv add --dev pytest-cov
uv run pytest --cov=src --cov-branch --cov-report=term-missing
```

```text
Name          Stmts   Miss Branch BrPart  Cover   Missing
---------------------------------------------------------
src/split.py      8      1      6      1    86%   12
```

`--cov-branch` 开分支覆盖（if 的真假两路都算），`Missing` 列直接告诉你哪些行没被任何测试碰过。两个必知的清醒剂：

- **覆盖率是下限指标不是质量指标**：100% 覆盖只说明每行被执行过，不说明断言对。`def test_nothing(): split_bill(100, ["a","b"], "a")` 不写 assert 也能刷高覆盖率；
- **接 CI 当闸门用阈值**：`--cov-fail-under=90` 让覆盖率倒退的合并失败。别追求 100%——分支死角（异常兜底、平台差异）为凑数写测试是负资产。

## 7. hypothesis：让机器替你找边界

上面的 parametrize 用例都是你想到的。hypothesis 换个思路：你声明「输入的范围」与「性质」（property），它随机生成成百上千个输入去找反例：

```python
from hypothesis import given, strategies as st

@given(st.lists(st.floats(min_value=0, max_value=10_000), min_size=1, max_size=8),
       st.sampled_from(["a", "b", "c"]))
def test_sum_never_loses_money(bills, people):
    total = sum(bills)
    shares = split_bill_many(total, people)
    assert sum(shares.values()) == pytest.approx(total, abs=0.01)   # 性质：分摊总和守恒
```

性质是「无论输入是什么都必须成立的不变量」：金额守恒、编码再解码相等、序列化往返一致。hypothesis 一旦找到反例，会把它**收缩**成最小反例并固定下来重放（写入 `.hypothesis/`），等于机器帮你写了一个 parametrize 用例。适合的场景恰是手写用例的盲区：除不尽的余数、空列表、极大值——本章开头的 100.01 案例让 hypothesis 跑一次，你大概率当场收获一个红。

## 8. 选型：什么测、怎么分

不是所有东西都值得同等测试。落地版金字塔：

| 层 | 测什么 | 依赖 | 占比感受 |
| --- | --- | --- | --- |
| 单元测试 | 一个函数 / 类的逻辑 | 无 IO，副作用全 mock | 最多，毫秒级，随手跑 |
| 集成测试 | 模块协作 + 真实边界 | 测试库、临时文件 | 少量，秒级 |
| 端到端 | 完整用户流程 | 起真服务 | 极少，最脆最慢 |

判断一个函数该不该测：**有分支逻辑、有边界、会再改的，测；纯粘合（把 A 调给 B）、一次性的胶水代码，值不值由改动频率定**。「测试实现细节」是最大反模式：断言 `internal_cache == {...}` 这类私有状态，重构一改实现测试全红——测试应锚定**可观察行为**（输入与输出、异常、公开接口），这也是「重构时测试不改」的前提。生态速览：基准测试用 pytest-benchmark（测的是性能回归不是正确性）、多环境矩阵用 tox/nox、异步测试用 pytest-asyncio（`@pytest.mark.asyncio` 直接 await，场景见异步两篇）、遗留项目里还会遇到标准库 unittest（类式风格，pytest 完全兼容直接跑）。

## 9. 什么时候应该 / 不应该

应该：新代码先想「怎么证明它对」，能写成断言的就写成测试；修 bug 先写一条复现测试（红）再修（绿），bug 永不复发；CI 全量跑、本地跑相关的（`-k`）。

不应该：追 100% 覆盖率而写无断言测试；测试私有实现细节；在单元测试里连真实网络与真库；让测试互相依赖执行顺序（每个测试必须能独立跑）。

## 10. 与之前和之后的知识的关系

- 往前：[装饰器](/python/510-DecoratorAdvanced) 是 pytest 语法面的全部秘密（fixture、parametrize、raises 都是装饰器与参数注入）；[类型注解与 mypy](/python/530-TypeAnnotationMypy) 挡形状错误，本文挡逻辑错误，两者是互补的安全网；
- 往后：[代码质量](/python/770-PythonCodeQuality) 的 lint 与 [CI/CD](/python/780-PythonCICD) 把 pytest 接成合并闸门；[毕业项目](/python/975-PythonCapstoneProject) 要求为 ledger 工具建立完整 pytest 安全网，本文是它的直接技术准备；mock 与假实现的类型姿势回到 [Protocol](/python/530-TypeAnnotationMypy)。

## 11. 官方文档

- pytest 文档（fixture 与 parametrize 两章最值得精读）：https://docs.pytest.org/en/stable/
- coverage.py：https://coverage.readthedocs.io/
- hypothesis：https://hypothesis.readthedocs.io/

## 12. 自我检查

- 能复述红 - 绿 - 重构循环并说出每步的判定标准；
- 能默写 pytest 发现规则，解释「测试没跑」的排查顺序；
- 能说清 fixture 与 parametrize 的分界（环境准备 vs 数据组合）与 conftest.py 的作用；
- 能用 monkeypatch 替换 datetime.now 并解释「测试后自动还原」；
- 能指出行覆盖率的两个局限（无断言也能刷高、分支死角）；
- 能说出「测试行为而非实现细节」及它在重构时的意义。

## 练习

预测题：文件名 `split_tests.py` 里的 `def check_two(): assert split_bill(...) == ...` 会被 pytest 执行吗？两个名字各违反哪条规则？

修改题：给 split_bill 补上「金额为负」的 ValueError 分支：先写 raises 测试（红），再实现（绿）；顺手把 100.01 三人分摊的用例加进 parametrize，观察当前实现会不会让你红——红了就修（余数给最后一人或垫付人，方案自定，测试先行）。

排错题：同事报告「conftest.py 里的 fixture 在 test_api 子目录不生效」。说出最可能的原因（fixture 定义在了另一个子目录的 conftest 里，作用域只覆盖同级与子级），并给出两个修法。

挑战题：为 `load_assets(manifest_path)`（读 JSON 清单返回 Asset 列表）建立三层安全网：tmp_path + fixture 的正常路径测试、raises 的坏 JSON 测试、hypothesis 的往返性质测试（dump 再 load 必须相等）。全部通过后，故意把 load 里的字段名改错一个字母，验证哪一层先红。

## 本章总结

测试是把「手动验证」固化为可重复断言：TDD 红绿重构让标准先行；pytest 五件套——裸 assert 自省、名字发现规则、fixture 管环境准备（conftest 装配、yield 清理、scope 慎共享）、parametrize 管数据组合、raises 管异常契约；monkeypatch 在边界替换时间随机与环境，依赖注入优先、Mock 兜底；coverage 量化安全网面积，阈值进 CI、别刷百分比；hypothesis 用性质与随机生成专攻手写用例的盲区；金字塔分主次，测行为不测实现——安全网的意义不是证明代码没错，而是让你改代码时敢下手。

## 下一步

测试有了，下一步是让它在每次提交时自动执行并拦截坏代码：进入 [Python 与 CI/CD](/python/780-PythonCICD)，把 pytest、类型检查、lint 接成仓库的自动守门员。
