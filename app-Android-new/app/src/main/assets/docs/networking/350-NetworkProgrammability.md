---
order: 350
title: 网络可编程与自动化
module: 'networking'
category: 云与基础设施
difficulty: advanced
description: 网络可编程与自动化：NETCONF/YANG、RESTCONF 与 gNMI 标准接口、Ansible 与 Nornir 自动化实践、幂等与回滚。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'networking/340-SDN'
  - 'networking/360-NetworkAutomation'
  - 'networking/330-NetworkNamespaceVirtualBridge'
prerequisites:
  - 'networking/010-NetworkBasicsAndProtocol'
---

前置知识：SDN 的架构思想（见 [SDN](networking/340-SDN)）与 CI/CD 基本概念
（见 [网络自动化](networking/360-NetworkAutomation)）。

学习目标：

- 区分「控制面可编程」（OpenFlow/SDN）与「管理面自动化」（NETCONF/Ansible）两条路线；
- 看懂 NETCONF 报文与 YANG 模型的关系，知道 RESTCONF/gNMI 在其中的位置；
- 能用 Ansible 或 Nornir 对一批网络设备下发配置并验证；
- 理解网络自动化区别于服务器自动化的三个要点：幂等、变更前后备份、回滚预案。

## 1. 两条自动化路线：控制面与管理面

SDN 一文讲的是**控制面可编程**：把转发决策从设备抽走交给控制器。而工程中更常见的日常需求是
**管理面自动化**——设备还是原来的设备，但配置不再靠人敲 CLI，而是由程序批量、可版本化地下
发。两条路线解决不同问题，经常并存：

| 维度     | 控制面可编程（SDN/OpenFlow） | 管理面自动化（NETCONF/Ansible） |
| :------- | :--------------------------- | :------------------------------ |
| 改什么   | 每条流的转发行为             | 设备的配置（VLAN、接口、路由协议） |
| 粒度     | 流级别、毫秒级联动           | 配置级别、分钟级变更窗口        |
| 改造对象 | 数据面（需要支持的硬件）     | 无需改造，现有设备即可          |
| 代表     | OpenFlow、P4、控制器         | NETCONF/YANG、Ansible、Nornir   |

本文聚焦后者。它的驱动力很朴素：设备数量上百后，逐台 CLI 变更既慢又错不起——而网络变更恰恰
是「错一步断全网」的高危操作，最需要自动化的审计、灰度与回滚能力。

## 2. 标准化配置接口：NETCONF/YANG 家族

### 2.1 从 CLI 到模型驱动

CLI（人读的文本）没有结构，脚本只能「发字符串、猜输出」，换厂商就要重写解析。标准化路线的
思路是两步拆解：

- **YANG（RFC 7950）**：数据建模语言，把「设备有哪些可配置的东西」定义成结构化的树；
- **NETCONF（RFC 6241）/ RESTCONF（RFC 8040）/ gNMI**：承载协议，负责把按模型编码的配置安全
  地送到设备并管理事务。

| 承载协议 | 传输            | 编码 | 特点                                       |
| :------- | :-------------- | :--- | :----------------------------------------- |
| NETCONF  | SSH（端口 830） | XML  | 事务能力（candidate 配置库、validate、commit）、主流厂商全面支持 |
| RESTCONF | HTTPS           | JSON/XML | 给 YANG 模型套 REST 外壳，适合与 Web 工具链集成 |
| gNMI     | gRPC/HTTP2      | protobuf | 低开销，最擅长**高频遥测订阅**（streaming telemetry） |

### 2.2 NETCONF 报文示例

```xml
<!-- 获取运行配置中的接口列表（netconf 客户端实际发送的 RPC） -->
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="101">
  <get-config>
    <source><running/></source>
    <filter type="subtree">
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces"/>
    </filter>
  </get-config>
</rpc>
```

对应的 YANG 模型片段（ietf-interfaces 的自建子集，说明建模风格）：

```yang
module example-interface {
  namespace "urn:example:interface";
  prefix ex;

  container interfaces {
    list interface {
      key name;                                  // 列表以 name 唯一标识
      leaf name { type string; }                 // 叶子节点 = 具体字段
      leaf enabled { type boolean; default true; }
      leaf description { type string; }
    }
  }
}
```

一次「有事务保障」的变更走 NETCONF 的 candidate 流程：锁定候选库 → 下发变更 → `validate` 校
验 → `commit` 生效 → 出错可 `rollback`。这四个动词是 CLI 世界没有的，也是自动化敢在生产跑
的底气。

## 3. Ansible 网络自动化

Ansible 是网络自动化的事实标准工具：无 agent、SSH 可达即可管理，厂商资源模块把 YANG/CLI 差
异封装掉。

### 3.1 最小可用项目

```yaml
# inventory.yaml —— 设备清单与连接变量
all:
  hosts:
    sw-01:
      ansible_host: 192.168.8.11
    sw-02:
      ansible_host: 192.168.8.12
  vars:
    ansible_connection: ansible.netcommon.network_cli
    ansible_network_os: cisco.ios.ios
    ansible_user: admin
```

```yaml
# playbook.yaml —— 批量配置接口描述并保存
- name: Configure access ports
  hosts: all
  gather_facts: false
  tasks:
    - name: Set interface description and vlan
      cisco.ios.ios_config:
        lines:
          - description web-server
          - switchport mode access
          - switchport access vlan 10
        parents: interface GigabitEthernet0/1
        backup: true            # 变更前自动备份到 backup/ 目录
      register: result

    - name: Save running-config
      cisco.ios.ios_config:
        save_when: modified     # 只有真改了才 write memory
      when: result.changed
```

```bash
ansible-playbook -i inventory.yaml playbook.yaml --check --diff
# --check 干跑（不实际变更），--diff 显示将要下发的差异行，先看后跑是标准动作
```

`ios_config` 这类资源模块**自带幂等性**：配置已存在时 `changed=false`，重复执行不产生多余变
更——这是选「资源模块」而不是裸 `ios_command` 敲配置行的核心理由。

### 3.2 模板化：Jinja2

同构设备只差参数（主机名、VLAN 列表）时，用模板描述结构、用变量描述差异：

```jinja2
{# templates/vlan_config.j2 —— VLAN 配置模板 #}
hostname {{ hostname }}
!
{% for vlan in vlans %}
vlan {{ vlan.id }}
 name {{ vlan.name }}
{% endfor %}
!
{% for iface in interfaces %}
interface {{ iface.name }}
 description {{ iface.description }}
 switchport mode {{ iface.mode }}
{% if iface.vlan is defined %}
 switchport access vlan {{ iface.vlan }}
{% endif %}
{% endfor %}
```

## 4. Nornir：Python 原生的并行自动化

需要比 Playbook 更灵活的编程逻辑（查表决策、对接 CMDB、复杂并发）时，Nornir 提供 inventory +
任务模型：

```python
from nornir import InitNornir
from nornir_utils.plugins.functions import print_result
from nornir_netmiko import netmiko_send_command

nr = InitNornir(config_file="nornir.yaml")

def collect_version(task):
    # task.host 即当前设备上下文，结果自动按设备归档
    return task.run(task=netmiko_send_command, command_string="show version")

result = nr.run(task=collect_version)
print_result(result)          # 并行跑完全部设备，逐台打印结果
```

工具选型直觉：声明式批量配置选 Ansible；需要把网络操作嵌进更大的 Python 系统（监控、自愈、
资源调度）选 Nornir/Netmiko；两者可混用。

## 5. 陷阱与工程纪律

1. **先干跑后实跑**：`--check --diff` 是 Ansible 的安全带；没有干跑的变更脚本不应进生产；
2. **幂等性自测**：同一 playbook 连跑两次，第二次必须 `changed=0`；做不到说明用了命令式敲
   配置而非资源模块；
3. **变更前后必须有据可查**：`backup: true` 的配置快照入库（Git），配合回滚 playbook——网
   络自动化的信任是靠「每次都能退回」建立的；
4. **凭据管理**：设备密码不入 Git，用 Ansible Vault 或外部密钥管理系统注入；
5. **厂商差异是常态**：模块行为、能力协商（NETCONF 能力交换）因厂商与版本而异，灰度先拿一
   台测试设备验证，别全量直发；
6. **别自动化你手工都不会的变更**：自动化放大的是既有流程，流程本身（变更窗口、审批、验收）
   仍需先于脚本存在。

## 6. 小结

**初学者要点**

- 网络自动化主流是管理面：用标准化接口 + 工具把「敲 CLI」变成「跑代码」；
- 记住三个接口名：NETCONF（SSH/XML/事务）、RESTCONF（HTTP/JSON）、gNMI（gRPC/遥测），底层数
  据模型都是 YANG；
- Ansible 无 agent、模块幂等，是入门首选；Nornir/Netmiko 适合嵌入 Python 工程。

**进阶注意**

- NETCONF 的 candidate/validate/commit/rollback 事务流是生产敢自动化的关键，选型时优先确认
  设备支持程度；
- 纪律高于工具：干跑、幂等自测、备份回滚、凭据不入库，这四条比「用什么框架」更决定成败；
- 控制面编程（OpenFlow/控制器）与管理面自动化互补而非替代，规模化的数据中心两者都需要。
