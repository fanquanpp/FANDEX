---
order: 360
title: 网络自动化
module: 'networking'
category: 云与基础设施
difficulty: advanced
description: NetDevOps 实践：配置即代码与 Git 工作流、变更流水线（干跑/Batfish 验证/灰度）、合规巡检与配置漂移治理。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'networking/350-NetworkProgrammability'
  - 'networking/100-DNSDHCP'
  - 'networking/210-LoadBalanceAlgorithm'
  - 'networking/250-KeepalivedDualHotStandby'
prerequisites:
  - 'networking/010-NetworkBasicsAndProtocol'
---

前置知识：设备配置的标准化接口与 Ansible/Nornir 用法见
[SDN 与网络自动化](networking/350-NetworkProgrammability)；本文讲**工程化流程**——怎么把「会写
脚本」变成「敢在生产跑」。

学习目标：

- 理解「配置即代码」的四个性质：版本化、评审、可重复、可回滚；
- 掌握一条完整的网络变更流水线：lint → 干跑 → 离线验证 → 灰度 → 全量 → 巡检；
- 能用 Batfish 在不碰真机的情况下验证配置意图；
- 建立配置漂移（drift）的检测意识与处理流程。

## 1. NetDevOps：把软件工程搬到网络

传统网络变更流程：工单 → 值班工程师深夜 SSH → 手工敲配置 → 祈祷。问题不在人，在流程：
无评审、无预演、无回滚脚本、变更完不审计。NetDevOps 的做法是把应用开发的成熟实践平移过来：

| 软件工程实践     | 网络领域的对应物                       |
| :--------------- | :------------------------------------- |
| 源码版本控制     | 设备配置与模板入 Git（真源在仓库）     |
| 代码评审（PR）   | 变更单即 PR，同事评审后才可合并        |
| 单元/集成测试    | 干跑 + Batfish 离线验证 + 测试设备灰度 |
| CI/CD 流水线     | 合并即自动下发，人工只管审批           |
| 监控告警         | 合规巡检 + 漂移检测                    |

> 类比：把网络设备当作「不会自己改代码，但会被各种人手工改动」的服务器——正因为总有绕过流
> 程的手工变更，巡检与漂移检测才成为刚需。

## 2. 配置即代码：Git 工作流

仓库结构建议把「意图（数据）」与「实现（模板/任务）」分离，配置由两者渲染生成：

```text
network-repo/
├── inventory/           # 设备清单与分组（数据）
│   └── production.yaml
├── host_vars/           # 每台设备的参数（数据）
│   └── sw-01.yaml       # vlans: [{id: 10, name: users}, ...]
├── templates/           # Jinja2 配置模板（实现）
│   └── vlan_config.j2
├── playbooks/           # Ansible 任务（实现）
└── tests/               # Batfish/pyATS 验证脚本
```

分支模型（简化版 trunk-based）：

```text
main（受保护：与生产配置一致，只能经 PR 合入）
  ↑ PR + 评审 + 流水线通过
feature/vlan-30-expansion（变更分支：改 host_vars + 模板）
```

关键纪律：**main 才是真源**。任何人在设备上的手工变更都是「漂移」，巡检发现后要么回滚设备、
要么补 PR 把变更收编入仓库——不允许「设备上改了但仓库不知道」长期存在。

## 3. 变更流水线：每一关拦什么

```text
PR 提交 → ① lint → ② 渲染检查 → ③ Batfish 离线验证 → ④ 人工评审
       → ⑤ 测试设备灰度 → ⑥ 全量下发 → ⑦ 巡检收口
```

| 阶段       | 工具               | 拦截的问题                             |
| :--------- | :----------------- | :------------------------------------- |
| lint       | yamllint / ansible-lint | 语法错误、危险写法（如缺 backup） |
| 渲染检查   | ansible --check --diff  | 模板渲染结果不符合预期             |
| 离线验证   | Batfish            | ACL 死锁、路由黑洞、意图破坏           |
| 灰度       | 同构测试设备       | 厂商版本差异、模块行为不符             |
| 全量下发   | ansible-playbook   | -（前四关都过了才走到这）              |
| 巡检       | 定时任务 + 漂移比对 | 手工变更绕过、配置老化                 |

### 3.1 Batfish：不碰真机的配置验证

Batfish 把设备配置「编译」成网络行为模型，离线回答「这条流能不能通、这个 ACL 哪行是死的」，
是变更前最有价值的一道闸：

```python
# tests/verify_change.py —— 依赖：pip install pybatfish
from pybatfish.client.session import Session
from pybatfish.datamodel.flow import HeaderConstraints, PathConstraints

bf = Session(host="batfish")            # Batfish 服务地址（docker 部署）
bf.set_network("campus")
bf.init_snapshot("network_configs/")    # 指向渲染出的待下发配置

# 1) ACL/防火墙可达性诊断：找出永远匹配不到的死规则
print(bf.q.filterLineReachability().answer().frame())

# 2) 意图验证：从 host1 到 host2 的 TCP/443 必须可达
flow_ok = bf.q.reachability(
    pathConstraints=PathConstraints(startLocation="host1", endLocation="host2"),
    headers=HeaderConstraints(dstIps="10.20.0.5", applications=["HTTPS"]),
).answer().frame()
assert (flow_ok["Flow_Status"] == "ACCEPTED").all(), "变更破坏了既有可达性"
```

把这段脚本接进 CI：PR 里任何渲染后的配置若让断言失败，合并直接被拒——相当于给网络上了「单
元测试」。

## 4. 合规巡检与自动修复

### 4.1 巡检：用测试代码表达「应该是什么样」

巡检脚本自包含可运行（依赖 netmiko 与 pytest），对全量设备断言基线：

```python
# tests/test_compliance.py —— 依赖：pip install pytest netmiko
import pytest
from netmiko import ConnectHandler

DEVICES = [
    {"device_type": "cisco_ios", "host": "192.168.8.11",
     "username": "audit", "password": "***"},
    {"device_type": "cisco_ios", "host": "192.168.8.12",
     "username": "audit", "password": "***"},
]

@pytest.mark.parametrize("device", DEVICES, ids=lambda d: d["host"])
def test_ntp_configured(device):
    with ConnectHandler(**device) as conn:
        output = conn.send_command("show running-config | include ntp")
    assert "ntp server" in output, f'{device["host"]} 未配置 NTP'

@pytest.mark.parametrize("device", DEVICES, ids=lambda d: d["host"])
def test_no_telnet(device):
    with ConnectHandler(**device) as conn:
        output = conn.send_command("show running-config | include transport input")
    assert "telnet" not in output, f'{device["host"]} 仍允许 Telnet'
```

```bash
pytest tests/test_compliance.py -v
# 预期：每台设备两组断言全 PASSED；任何 FAIL 输出会精确到设备与违规项
```

厂商级替代是 Cisco pyATS（`pyats.aetest`），功能更强但绑定 testbed 描述文件，适合已有
Cisco 生态的团队；上面的 pytest 方案胜在零门槛、任何厂商可混。

### 4.2 自动修复：先告警，后自动化

「发现 BGP 邻居掉线就自动 `clear bgp`」这类自愈脚本收益高但风险同样高——错误的自动修复会把
局部故障放大成全局事故。成熟顺序是：

1. 只告警 + runbook（人工按手册处理）；
2. 低风险动作自动化（如重启一个无状态探针、清计数器）；
3. 高风险动作保留人工，自动化只负责「准备好回滚」。

自动执行的写法与 Ansible 任务（`when` 条件触发、`changed_when` 控制）在
[SDN 与网络自动化](networking/350-NetworkProgrammability) 一文有基础范式，此处强调的是**分级**
而非实现。

## 5. 陷阱与工程纪律

1. **配置漂移是常态而非例外**：交换机被临时改动、防火墙被应急放行都会制造漂移；每天定时跑
   「备份 + diff 仓库版本」的巡检任务，漂移当日清零；
2. **备份与回滚不是可选件**：任何下发任务必须前置 `backup: true` 或等价的配置快照入库，并且
   回滚脚本与下发脚本同时评审；
3. **并行下发的爆炸半径**：对核心设备 `serial: 1` 串行、`max_fail_percentage` 控制失败阈值，
   避免一条坏配置同时打到全网；
4. **凭据与审计**：设备密码走 Vault/密管，所有变更留操作者与 PR 编号痕迹——出事故时「谁改
   的、依据什么工单」必须十秒内可查；
5. **测试环境失真**：Batfish 验证的是配置语义，不含硬件转发表溢出、QoS 队列这类物理现实；
   灰度设备不能省；
6. **不要自动化无人理解的配置**：接手遗留网络时先补文档与基线巡检，再谈自动化——自动化复
   制的是你对现状的理解，理解错了就批量复制错误。

## 6. 小结

**初学者要点**

- NetDevOps = 配置入 Git + 变更走 PR + 流水线自动验证 + 定时巡检；
- 变更流水线记六关：lint、干跑、离线验证、灰度、全量、巡检——核心思想是「问题拦在合并前」；
- 巡检就是给网络写测试：用 pytest/netmiko 断言「NTP 必须有、Telnet 必须无」这类基线。

**进阶注意**

- Batfish 让「配置合并前就能验证意图」，是网络测试金字塔的地基，但替代不了真机灰度；
- 自动修复分级推进：先告警 runbook，再低风险自动化，高风险动作永远人工 + 预备回滚；
- 治理漂移的成败在流程：仓库是唯一真源，设备上的任何手工变更要么回滚、要么收编，没有第三种
  状态。
