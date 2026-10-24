---
order: 260
title: 测试数据管理
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: 测试数据构造模式（builder/工厂/Object Mother 演进）、脱敏与合成数据、数据库 seeding 与快照、并行执行的数据隔离。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：测试数据管理——用例的四要素之一（前置数据、操作、断言、清理）里最容易被乱写的一块。
- **解决什么问题**：测试里散落的 `"13800138000"` 和手拼 dict 让用例读不懂、改不动；生产数据裸拷进测试环境踩合规红线；并行执行的用例互相改到对方的数据，CI 随机红。
- **什么时候用到**：单元测试构造领域对象；集成/API 测试准备数据库前置数据；性能测试造十万级数据集；多环境（开发/测试/演示）数据准备与合规审计。

前置：fixture 机制见 [pytest](/software-testing/100-Pytest)（本文讲「造什么」，fixture 篇讲「怎么注入」）；API 测试的数据前置实践见 [API 自动化测试](/software-testing/120-APIAutomationTest)。

## 1. 心智模型：测试数据的三条铁律

1. **用例只声明「与断言有关的字段」**：断言手机号校验的用例，构造器里不该出现 17 个无关字段——无关字段是噪音，读用例的人分不清哪些数字重要。
2. **数据与用例同源可读**：一眼看出这条数据「特殊在哪」。`order(paid=True, total=Decimal("0.01"))` 比 `{"status": 2, "amount": 0.01}` 自解释。
3. **每条用例的数据互相独立**：并行执行、乱序执行、单独重跑任何一个都成立。共享可变数据是 CI 偶发红的第一来源。

三个场景对照铁律的必要性：

- **单元测试**：`UserBuilder().with_locked_account().build()`——断言「锁定用户不能下单」时，builder 把无关的昵称、地址都藏起来。
- **集成测试**：fixture 建订单 -> 用例操作 -> fixture 删订单，数据生命周期与用例绑定，两个用例并行也不共享。
- **性能测试**：造 10 万订单——复用同一构造函数批量生成，随机分布字段（金额、时间）让统计有意义，而不是 10 万条一模一样的记录。

## 2. 构造模式演进：三代 builder

以订单系统测试数据为例（工程场景：一个订单对象 17 个字段，历经三代演进）：

**第一代：每处用例手写字典。**

```python
order = {
    "id": "ORD-001", "user_id": "U-1", "status": "paid",
    "total": "199.00", "currency": "CNY", "created_at": "2026-09-01T10:00:00",
    # ... 还有 11 个字段
}
```

问题：断言手机号格式时用例里冒出 16 个无关字段；字段改名要全局搜索替换几十处；复制粘贴出来的数据悄悄漂移。

**第二代：Object Mother（工厂函数集合）。**

```python
def make_paid_order(**overrides):
    base = {"id": f"ORD-{uuid4().hex[:8]}", "user_id": "U-1", "status": "paid",
            "total": "199.00", "currency": "CNY", "created_at": now_iso(), ...}
    base.update(overrides)
    return Order(**base)

make_paid_order()                       # 标准 paid 单
make_paid_order(status="refunded")      # 改一个字段
```

改进：默认值收敛一处；`**overrides` 允许局部覆盖。问题：特殊场景的语义淹没在 override 里——`make_paid_order(status="cancelled", cancel_reason="user", refunded_amount="0")` 这种「矛盾的 paid 单」开始出现：名字说 paid、字段互相打架。

**第三代：Builder（链式、语义化、约束内建）。**

```python
@dataclass
class OrderBuilder:
    id: str = field(default_factory=lambda: f"ORD-{uuid4().hex[:8]}")
    user_id: str = "U-1"
    status: OrderStatus = OrderStatus.PAID
    total: Decimal = Decimal("199.00")
    ...
    def build(self) -> Order:
        return Order(**asdict(self))

    # 语义化场景：内部保证字段组合自洽
    def cancelled(self) -> "OrderBuilder":
        assert self.status == OrderStatus.PAID, "cancel 只能作用于 paid 单"
        self.status = OrderStatus.CANCELLED
        return self

    def refunded(self, amount: Decimal) -> "OrderBuilder":
        self.status = OrderStatus.REFUNDED
        self.refunded_amount = amount
        return self

# 用例读起来就是业务场景
order = OrderBuilder().cancelled().build()
```

- 第三代的关键增益是**组合自洽**：`cancelled()` 在 builder 内部把 `refunded_amount` 清零，用例不可能再构造出矛盾数据。演进的红线：一旦 override 需要两个以上字段联动才能成立，就该升级成语义化方法。
- 易错点：builder 的默认值要**动态**（id 唯一、created_at 取当前时间）——写死的 `"ORD-001"` 让并行执行的用例撞主键。

## 3. 脱敏与合成数据：合规是硬约束

《个人信息保护法》与 GDPR 之下，生产数据裸拷进测试环境是违法行为（测试环境访问控制弱、日志随意打印）。两条合规路径：

1. **脱敏（masking）**：保留数据形态与统计特征，抹掉可识别性——手机号 `138****5678` 保位、身份证哈希替换、姓名用假名池映射（同一人名映射结果稳定，保住关联性）。
2. **合成数据（synthetic）**：程序生成形态逼真的假数据——与 builder 一脉相承，但在数据集规模上（万级、带分布）需要专门工具（Faker 及其方言扩展）。

```python
# 脱敏的两条纪律
# 1. 一致性映射：同一个真实用户在所有表里映射成同一个假身份，否则 join 后关联断裂
# 2. 可逆信息单独保管：脱敏映射表只留在数据治理侧，测试环境拿不到
def mask_phone(p: str, mapping: dict) -> str:
    return mapping.setdefault(p, "138" + uuid4().hex[:8])
```

- 取舍：合成数据合规上最干净（从头就没有真实个人信息），但分布真实性差（边界值、脏数据是生产特有的）；脱敏样本保留真实分布，代价是脱敏管线本身就是被审计对象。常见组合：功能测试用合成数据，性能与数据类测试用脱敏生产样本。
- 易错点：日志也是数据出口——测试环境把「脱敏后」的手机号打进日志没事，把**原始**入参打进日志等于没脱敏。数据脱敏要连同日志采集配置一起审。

**工程场景（脱敏生产样本构造性能数据集）**：给订单查询接口做性能测试，用「脱敏管线导出的 30 天真实订单（2 亿条形态分布）」按 5% 抽样构造 1000 万条测试集——保留了真实的金额长尾与时间分布，压出来的 P95 比合成数据可信得多；索引命中率也与生产行为一致，这是全合成数据做不到的。

## 4. 数据库 seeding 与快照

集成测试的前置数据怎么进数据库，三种形态：

| 方式 | 做法 | 适合 | 代价 |
| --- | --- | --- | --- |
| seeding 脚本 | 测试启动时执行种子 SQL/ORM 脚本 | 少量全局基础数据（字典表、默认配置） | 数据越多启动越慢 |
| 每用例 fixture 建删 | setup 建、teardown 删（pytest fixture / Spring @Sql） | 用例私有数据 | 并行要防冲突 |
| 快照（snapshot/模板库） | 预先备好数据模板库，测试前 restore | 大体量前置数据（性能测试、E2E） | 恢复耗时；快照过期 |

- 选型直觉：**全局基础数据 seeding 一次，用例私有数据 fixture 建删，性能测试用快照**。三层混用是常态。
- 易错点一：fixture 建的数据用「随机后缀」防撞（`user_{uuid4().hex[:6]}`），比「清理所有 user_%」式的扫尾安全——万一 teardown 漏跑，随机名不会毒害下一个用例，配合定期清理任务兜底。
- 易错点二：快照（如 Docker volume 快照、RDS 克隆）恢复后数据库连接池里可能有旧连接，测试框架要强制重建连接，否则查到的是旧会话的缓存。

## 5. 并行执行的数据隔离

pytest-xdist / JUnit 并行 / k6 分布式压测下，用例互相踩数据的三种隔离策略：

1. **命名空间隔离**：每个 worker 用独立前缀/独立 schema（PostgreSQL schema-per-worker），建删都在自己的空间里。
2. **实体池（resource pool）**：预先建 N 份账号/租户资源，用例从池里**租借**、用完归还——适合「实体创建慢但可复用」的场景（如带实名认证的测试账号）。
3. **唯一键隔离**：所有数据带 worker 唯一后缀，查询一律带条件——最弱但侵入最小，配合第 4 节的随机默认值天然成立。

**工程场景（Playwright storageState 与 pytest fixture 的数据前置复用）**：E2E 用例都从登录开始，每次登录 3 秒、100 个用例浪费 5 分钟还让登录接口成为隐性单点。解法：`storageState`（Playwright 的会话快照）由全局 fixture 登录一次保存，所有用例直接带状态启动；pytest 侧对应 `scope="session"` 的登录 fixture 产出 token 供 API 用例复用。数据前置的复用边界：**只读会话可全局复用，会写数据的场景必须回到用例级隔离**——复用与隔离的边界就是「用例是否改变共享状态」。

## 动手实践

**任务**（背景取自 GZ034 赛题任务 2「设计测试数据」）：给「用户注册 + 下单」接口设计测试数据方案：

1. 为 `User` 与 `Order` 各写一个第三代 builder，含 2 个语义化场景方法（如 `vip()`、`overdrawn()`）；
2. 列出「手机号格式校验」用例组需要的 5 组边界数据（怎么用 builder 表达参数化输入）；
3. 写出并行执行的隔离方案（选一种策略并说明 2 个用例的互不干扰证据）；
4. 给「从生产导入 10 万用户做压测」写合规检查清单（3 条以上）。

<details>
<summary>参考要点（先自己写，再展开对照）</summary>

- builder 要点：默认值动态唯一（uuid 后缀）；`vip()` 同时设置 `level=VIP` 与 `discount_rate=0.9`（组合自洽在 builder 内完成）；`overdrawn()` 设置 `balance<0` 并断言前置状态合法。
- 手机号边界数据：合法 11 位、少一位、多一位、含字母、空串——用 pytest 参数化喂 `UserBuilder().phone(p).build()`，断言集中在 `phone` 一个字段。
- 隔离方案示例（命名空间式）：`pytest-xdist` 的 `worker_id` fixture 拼进数据前缀（`gw0_`/`gw1_`），每 worker 只查改自己前缀的数据；证据：两 worker 同时跑「改昵称」用例，各自的查询条件含 worker 前缀，互不可见。
- 合规检查清单：脱敏是否保一致性映射（跨表 join 不断裂）；日志与监控面板是否也脱敏；测试环境的访问权限是否收紧到压测人员；数据导入管线是否可审计（谁、何时、导入了什么）；压测结束的数据销毁方案。

</details>

## 常见陷阱

1. **用例里手写完整数据字典**：16 个无关字段淹没断言意图；用 builder 隐藏无关维度。
2. **builder 默认值写死**：并行撞主键；id、时间戳默认值必须动态生成。
3. **生产数据裸拷进测试**：个保法/GDPR 红线；脱敏或合成，日志一并审。
4. **teardown 依赖「清理所有 xx_%」**：漏跑一次毒害后续用例；随机名 + 定期清理更稳。
5. **复用登录态给写操作用例**：共享会话的写操作互相污染；只读复用、写入隔离。
6. **性能数据全同构**：10 万条一样的记录压不出真实分布；字段加随机分布。

## 相关阅读

- fixture 注入机制与作用域：[pytest](/software-testing/100-Pytest)
- API 测试中的数据前置与契约：[API 自动化测试](/software-testing/120-APIAutomationTest)
- 测试数据中的安全视角（注入用例数据）：[安全测试](/software-testing/180-SecurityTesting)
- 并行执行的框架层支持：[自动化测试框架对比](/software-testing/210-AutomationTestFrameworkComparison)

## 参考与致谢

- 测试数据构造模式（Object Mother / Test Data Builder）为 xUnit Patterns 公开模式名（Gerard Meszaros 等著，xunitpatterns.com），本文示例与演进叙述为原创。
- OWASP Testing Guide 数据脱敏章节（CC-BY-SA，仅作合规要点索引）：https://owasp.org/www-project-web-security-testing-guide/
- pytest fixture 与 Playwright storageState 用法分别见各自官方文档（MIT/Apache-2.0）。
