---
order: 57
title: 应急响应
module: cybersecurity
category: 网络安全
difficulty: advanced
description: 应急响应：事件分类、取证分析、遏制策略、恢复流程与复盘
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/云安全
  - cybersecurity/对称加密
  - cybersecurity/非对称加密
  - cybersecurity/哈希算法
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 应急响应框架

### 1.1 PICERL 模型

| 阶段            | 说明 |
| --------------- | ---- |
| Preparation     | 准备 |
| Identification  | 识别 |
| Containment     | 遏制 |
| Eradication     | 根除 |
| Recovery        | 恢复 |
| Lessons Learned | 复盘 |

### 1.2 事件分类

| 类别     | 示例             |
| -------- | ---------------- |
| 恶意代码 | 病毒、木马、勒索 |
| 拒绝服务 | DDoS             |
| 入侵     | 未授权访问       |
| 信息泄露 | 数据外泄         |
| 钓鱼     | 社会工程         |

## 2. 取证分析

### 2.1 取证原则

- 不修改原始证据
- 记录所有操作
- 维护证据链
- 使用写保护设备

### 2.2 内存取证

```bash
# 获取内存镜像
winpmem -o memory.raw

# Volatility 分析
vol -f memory.raw windows.pslist
vol -f memory.raw windows.netscan
vol -f memory.raw windows.malfind
```

### 2.3 磁盘取证

```bash
# 创建磁盘镜像
dd if=/dev/sda of=disk.img bs=4M

# 挂载只读
mount -o ro,loop disk.img /mnt/evidence

# 文件恢复
foremost -i disk.img -o recovered/
```

### 2.4 网络取证

```bash
# 抓包
tcpdump -i eth0 -w evidence.pcap

# 分析
wireshark evidence.pcap
tshark -r evidence.pcap -Y "http.request"
```

## 3. 遏制策略

### 3.1 网络遏制

| 策略      | 方法       | 影响       |
| --------- | ---------- | ---------- |
| IP封禁    | 防火墙规则 | 阻断攻击源 |
| 网络隔离  | VLAN调整   | 限制扩散   |
| DNS重定向 | 修改DNS    | 阻断C2     |
| 断网      | 物理断开   | 最极端     |

### 3.2 主机遏制

- 隔离感染主机
- 禁用受感染账号
- 重置凭证
- 终止恶意进程

## 4. 勒索软件响应

### 4.1 响应步骤

```
1. 隔离感染主机（不断电）
2. 保留内存镜像
3. 识别勒索软件家族
4. 检查是否有解密工具
5. 评估备份可用性
6. 恢复或支付（不推荐）
```

### 4.2 预防措施

- 离线备份
- 邮件安全网关
- 端点保护
- 网络分段
- 最小权限

## 5. 复盘与改进

### 5.1 复盘会议

- 时间线回顾
- 根因分析
- 响应评估
- 改进措施

### 5.2 改进跟踪

| 改进项  | 负责人 | 截止日期 | 状态   |
| ------- | ------ | -------- | ------ |
| 部署EDR | 安全组 | 2周      | 进行中 |
| 启用MFA | IT组   | 1周      | 完成   |
| 更新IRP | 安全组 | 3周      | 待开始 |
