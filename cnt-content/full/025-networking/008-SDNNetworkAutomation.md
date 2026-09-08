---
order: 80
title: SDN 与网络自动化
module: 'networking'
category: 云与基础设施
difficulty: advanced
description: SDN与网络自动化：OpenFlow、NETCONF/YANG、Ansible网络、网络可编程
author: fanquanpp
updated: '2026-09-08'
related:
  - 'networking/006-NetworkSecurityTech'
  - 'networking/007-WirelessNetwork'
  - 'networking/009-NetworkStorageTechnology'
  - 'networking/010-NetworkDiagnosis'
prerequisites:
  - 'networking/001-NetworkBasicsAndProtocol'
---


## 1. SDN 架构

### 1.1 三层架构

```
应用层：网络应用（负载均衡、防火墙）
    ↕ 北向API（REST）
控制层：SDN控制器
    ↕ 南向API（OpenFlow）
基础设施层：交换机/路由器
```

### 1.2 SDN 优势

- 集中控制：全局视图
- 可编程：灵活部署服务
- 开放接口：设备解耦
- 自动化：减少人工配置

## 2. OpenFlow 协议

### 2.1 流表结构

| 字段     | 说明                       |
| -------- | -------------------------- |
| 匹配字段 | 入端口、MAC、IP、TCP端口等 |
| 优先级   | 匹配规则优先级             |
| 计数器   | 匹配包数、字节数           |
| 动作     | 转发、修改、丢弃、发控制器 |

### 2.2 流表操作

```
数据包 → 匹配流表 → 执行动作
              ↓ 无匹配
         发送到控制器
```

## 3. NETCONF/YANG

### 3.1 NETCONF 协议

基于 XML 的网络配置协议：

```xml
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <get-config>
    <source><running/></source>
    <filter type="subtree">
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces"/>
    </filter>
  </get-config>
</rpc>
```

### 3.2 YANG 建模

```yang
module example-interface {
  namespace "urn:example:interface";
  prefix ex;

  container interfaces {
    list interface {
      key name;
      leaf name { type string; }
      leaf enabled { type boolean; default true; }
      leaf description { type string; }
    }
  }
}
```

## 4. 网络自动化

### 4.1 Ansible 网络模块

```yaml
- name: Configure switch
  cisco.ios.ios_config:
    lines:
      - interface GigabitEthernet0/1
      - description Web Server
      - switchport mode access
      - switchport access vlan 10
```

### 4.2 Python 网络编程

```python
from netmiko import ConnectHandler

device = {
    'device_type': 'cisco_ios',
    'host': '192.168.1.1',
    'username': 'admin',
    'password': 'password',
}

with ConnectHandler(**device) as conn:
    output = conn.send_command('show ip interface brief')
    print(output)

    config = [
        'interface Gi0/1',
        'description Configured by Python',
        'no shutdown'
    ]
    conn.send_config_set(config)
```

### 4.3 Nornir 并行框架

```python
from nornir import InitNornir
from nornir_utils.plugins.functions import print_result
from nornir_netmiko import netmiko_send_command

nr = InitNornir(config_file="nornir.yaml")
result = nr.run(task=netmiko_send_command, command_string="show version")
print_result(result)
```
