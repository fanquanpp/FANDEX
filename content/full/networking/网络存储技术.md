---
order: 55
title: 网络存储技术
module: networking
category: 网络技术
difficulty: intermediate
description: 网络存储技术：SAN、NAS、iSCSI、FC、分布式存储与数据保护
author: fanquanpp
updated: '2026-06-14'
related:
  - networking/无线网络
  - networking/SDN与网络自动化
  - networking/网络故障诊断
  - networking/网络设计与规划
prerequisites:
  - networking/网络基础与协议
---

## 1. 存储架构

### 1.1 DAS/NAS/SAN

| 类型 | 协议         | 特点       | 适用     |
| ---- | ------------ | ---------- | -------- |
| DAS  | SCSI/SATA    | 直连，简单 | 小型     |
| NAS  | NFS/SMB/CIFS | 文件级共享 | 文件共享 |
| SAN  | FC/iSCSI     | 块级共享   | 数据库   |

### 1.2 块存储 vs 文件存储 vs 对象存储

| 类型     | 访问方式 | 协议     | 场景           |
| -------- | -------- | -------- | -------------- |
| 块存储   | 块设备   | FC/iSCSI | 数据库、虚拟机 |
| 文件存储 | 文件系统 | NFS/SMB  | 文件共享       |
| 对象存储 | REST API | S3/Swift | 备份、大数据   |

## 2. SAN 存储

### 2.1 FC SAN

```
服务器 ←→ HBA ←→ FC交换机 ←→ 存储阵列
              WWN标识
```

**FC 拓扑**：

| 拓扑   | 说明     | 适用     |
| ------ | -------- | -------- |
| 点对点 | 直连     | 简单     |
| FC-AL  | 仲裁环   | 少量设备 |
| Fabric | 交换网络 | 企业     |

### 2.2 iSCSI SAN

```
服务器 ←→ iSCSI Initiator ←→ IP网络 ←→ iSCSI Target ←→ 存储
```

```bash
# Linux iSCSI 配置
yum install iscsi-initiator-utils
systemctl start iscsid

# 发现目标
iscsiadm -m discovery -t st -p 10.0.0.100

# 登录目标
iscsiadm -m node -T iqn.2026-01.com.example:storage -p 10.0.0.100 -l
```

### 2.3 FCoE

FC over Ethernet，在以太网上传输 FC 帧：

- 需要无损以太网（DCB）
- 统一网络架构
- 减少 I/O 适配器

## 3. NAS 存储

### 3.1 NFS

```bash
# 服务端
mkdir /export/data
echo "/export/data 10.0.0.0/24(rw,sync,no_subtree_check)" >> /etc/exports
exportfs -a

# 客户端
mount -t nfs server:/export/data /mnt/data
```

**NFS 版本**：

| 版本    | 特点                  |
| ------- | --------------------- |
| NFSv3   | 无状态，UDP/TCP       |
| NFSv4   | 有状态，TCP，安全增强 |
| NFSv4.1 | pNFS 并行             |

### 3.2 SMB/CIFS

```bash
# Samba 配置
[share]
  path = /srv/samba/share
  browseable = yes
  read only = no
  valid users = @smbgroup
```

## 4. 分布式存储

### 4.1 Ceph

统一分布式存储：块(RBD)、文件(CephFS)、对象(RGW)

```
Ceph 架构：
  客户端 → MON(监控) → OSD(存储) → 磁盘
              ↑
           MDS(元数据，CephFS)
```

**CRUSH 算法**：确定性数据分布，避免查表。

$$\text{PG数} = \frac{\text{OSD数} \times 100}{\text{副本数}}$$

### 4.2 GlusterFS

无元数据服务器的分布式文件系统：

```
客户端 → GlusterFS Volume → Brick1(服务器1)
                            → Brick2(服务器2)
                            → Brick3(服务器3)
```

卷类型：

| 类型       | 说明   | 冗余 |
| ---------- | ------ | ---- |
| Distribute | 分布   | 无   |
| Replicate  | 复制   | 有   |
| Stripe     | 条带   | 无   |
| Disperse   | 纠删码 | 有   |

## 5. 数据保护

### 5.1 RAID

| 级别   | 最少盘 | 容错    | 利用率  | 适用     |
| ------ | ------ | ------- | ------- | -------- |
| RAID0  | 2      | 无      | 100%    | 临时数据 |
| RAID1  | 2      | 1盘     | 50%     | 系统盘   |
| RAID5  | 3      | 1盘     | (n-1)/n | 通用     |
| RAID6  | 4      | 2盘     | (n-2)/n | 重要数据 |
| RAID10 | 4      | 每组1盘 | 50%     | 数据库   |

### 5.2 快照

- 写时复制（COW）快照
- 重定向写（ROW）快照

### 5.3 备份策略

3-2-1 原则：3份副本、2种介质、1份异地。
