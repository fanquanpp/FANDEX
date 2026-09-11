---
order: 380
title: 网络存储技术
module: 'networking'
category: 云与基础设施
difficulty: intermediate
description: 网络存储：DAS/NAS/SAN 架构对比、iSCSI/FC 与 NFS/SMB 实操、Ceph 分布式存储、RAID 与数据保护策略。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'networking/180-NetworkDesignPlanning'
  - 'networking/330-NetworkNamespaceVirtualBridge'
  - 'networking/190-NetworkDiagnosis'
prerequisites:
  - 'networking/010-NetworkBasicsAndProtocol'
---

前置知识：IP 网络基础（见 [网络基础与协议](networking/010-NetworkBasicsAndProtocol)）与 Linux
基本操作；存储网络在企业组网中的位置见 [网络设计规划](networking/180-NetworkDesignPlanning)。

学习目标：

- 用「访问粒度」一句话区分 DAS/NAS/SAN：块、文件、对象三种存储形态各自给应用什么接口；
- 理解 iSCSI 如何把块设备搬上以太网，能完成一次「发现-登录-使用」的完整流程；
- 掌握 NFS/SMB 文件共享的配置骨架与版本差异；
- 理解 Ceph 的 MON/OSD/CRUSH 基本模型与 RAID 级别的取舍。

## 1. 存储架构：按「谁管理文件系统」分类

存储方案的选择本质是一个问题：**文件系统放在哪一侧？**

```text
DAS：  [服务器 own 文件系统] --直连线缆-- [磁盘]              → 块，独占
SAN：  [服务器 own 文件系统] --存储专用网络-- [磁盘阵列]       → 块，共享/独占
NAS：  [客户端挂载] --以太网-- [NAS 自带文件系统，导出目录]    → 文件，共享
对象：  [应用代码]  --HTTP REST-- [对象存储自管理一切]         → 对象，海量
```

> 类比：DAS 是家里自己的书架（自己整理，只有自己用）；SAN 是图书馆把「一整层书库」租给你，
> 你自己决定怎么上架（块级）；NAS 是图书馆的借阅台（人家管好分类，你按书名借还，文件级）；
> 对象存储是自动寄存柜（凭条取件，不问内部结构）。

| 类型 | 接口层级 | 协议          | 特点               | 典型用途               |
| ---- | -------- | ------------- | ------------------ | ---------------------- |
| DAS  | 块       | SCSI/SATA     | 直连，简单，独占   | 单机扩盘               |
| SAN  | 块       | FC / iSCSI    | 高性能，可共享磁盘 | 数据库、虚拟化         |
| NAS  | 文件     | NFS/SMB       | 部署快，跨平台共享 | 文件服务、共享目录     |
| 对象 | 对象/API | S3/Swift      | 海量、扁平命名空间 | 备份归档、图片视频     |

## 2. SAN：把块设备搬上网络

### 2.1 FC SAN 与 iSCSI 的定位

| 维度     | FC SAN                    | iSCSI SAN                |
| :------- | :------------------------ | :----------------------- |
| 载体     | 专用 FC 交换机与 HBA 卡   | 普通以太网（万兆起）     |
| 寻址     | WWN 世界宽名称            | IP + IQN 名称            |
| 性能/成本| 性能强、延迟低；昂贵      | 够用；复用现有网络，便宜 |
| 适用     | 核心数据库、金融          | 中小型、虚拟化、测试     |

FC 拓扑从点对点、仲裁环（FC-AL）演进到交换式 Fabric（企业主流）；FCoE 曾试图「FC 帧跑以太网」，
需要 DCB 无损以太网支撑，现网热度已明显让位于纯 iSCSI 与 NVMe-oF。

### 2.2 iSCSI 完整流程（可复现）

角色：Target（存储侧，导出块设备）与 Initiator（服务器侧，使用块设备）。

```bash
# ===== 存储侧（targetcli，导出一块 LUN）=====
sudo targetcli
# /> backstores/block create store0 /dev/sdb     # 后端用一块物理盘
# /> iscsi/ create iqn.2026-01.com.example:storage0
# /> iscsi/iqn.2026-01.com.example:storage0/tpg1/luns create /backstores/block/store0
# /> iscsi/iqn.2026-01.com.example:storage0/tpg1/acls create \
#      iqn.1998-01.com.example:server01          # 只允许指定发起端接入
# /> exit

# ===== 服务器侧（Initiator）=====
sudo apt install open-iscsi            # 或 yum install iscsi-initiator-utils
sudo systemctl start iscsid
# 设置本端 IQN 后发现目标
sudo iscsiadm -m discovery -t st -p 10.0.0.100
# 预期输出：
# 10.0.0.100:3260,1 iqn.2026-01.com.example:storage0

sudo iscsiadm -m node -T iqn.2026-01.com.example:storage0 -p 10.0.0.100 -l
# 预期输出含：Login to [iface: default, target: ...] successful.
lsblk
# 预期：多出一块新盘（如 sdb），之后像本地盘一样分区/格式化/挂载
```

生产要点：多路径（multipath，两条链路两个 IP 冗余）、专用 VLAN/网段承载存储流量、ACLS 限定
IQN 白名单——iSCSI 本身明文，安全边界靠网络隔离与 CHAP/IP 白名单。

## 3. NAS：文件级共享

### 3.1 NFS（Linux 生态主流）

```bash
# ===== 服务端 =====
sudo apt install nfs-kernel-server
sudo mkdir -p /export/data
echo '/export/data 10.0.0.0/24(rw,sync,no_subtree_check,no_root_squash)' | \
  sudo tee -a /etc/exports
sudo exportfs -ra                      # 重载导出表（幂等）

# ===== 客户端 =====
sudo apt install nfs-common
sudo mount -t nfs -o vers=4.2 server:/export/data /mnt/data
df -h /mnt/data
# 预期：server:/export/data 挂载成功，容量与远端一致
```

| 版本    | 关键特性                                          |
| ------- | ------------------------------------------------- |
| NFSv3   | 无状态，UDP/TCP，依赖 portmapper 等辅助端口       |
| NFSv4   | 有状态、单一 2049 端口、内建认证（Kerberos 可选） |
| NFSv4.1 | pNFS 并行访问、会话 trunking                      |
| NFSv4.2 | 服务端复制、稀疏文件等增强                        |

安全提醒：`no_root_squash` 让客户端 root 等价于服务端 root，仅调试用；生产默认 `root_squash`。

### 3.2 SMB（Windows/跨平台）

```ini
# /etc/samba/smb.conf 最小共享段
[share]
  path = /srv/samba/share
  browseable = yes
  read only = no
  valid users = @smbgroup
```

选型直觉：纯 Linux 之间用 NFS（权限映射更顺）；有 Windows 终端或 AD 域用 SMB。

## 4. 分布式存储：Ceph 与 GlusterFS

单机阵列有容量与可靠性上限，超大规模需要把一堆普通服务器组成存储池。

### 4.1 Ceph：统一三种接口

```text
客户端请求 → MON 集群（集群地图 cluster map）
          → CRUSH 算法直接算出数据在哪些 OSD（不查中心表）
          → OSD（每块盘一个守护进程）读写
CephFS（文件）另需 MDS 元数据服务
```

- **MON**：维护集群拓扑与状态（奇数个做仲裁）；
- **OSD**：数据守护进程，一块盘/一个 NVMe 一个 OSD；
- **CRUSH**：确定性哈希分布算法——数据放哪「算」出来而非「查」出来，天然无中心瓶颈；
- 三种门面：RBD（块，OpenStack/K8s 常用）、RGW（对象，兼容 S3）、CephFS（文件）。

PG 数量的经典经验公式（新版 Luminous 后有 pg-autoscaler 可托管）：

$$PG_{num} \approx \frac{OSD 数 \times 100}{副本数}\ \text{并取 2 的幂向上对齐}$$

### 4.2 GlusterFS

无中心元数据服务器的分布式文件系统，卷直接由多台服务器的 Brick 拼成，配置简单；但小文件与
元数据密集场景弱于 Ceph。卷类型：

| 卷类型     | 语义   | 冗余   |
| ---------- | ------ | ------ |
| Distribute | 按文件分布 | 无 |
| Replicate  | 按文件复制 | 有 |
| Disperse   | 纠删码条带 | 有（空间效率高） |

选型：需要块+文件+对象统一、生态强（K8s/OpenStack）选 Ceph；纯文件共享、想省心选 GlusterFS
或直接用商业 NAS。

## 5. 数据保护

### 5.1 RAID 级别

| 级别   | 最少盘 | 容错        | 空间利用率 | 适用     |
| ------ | ------ | ----------- | ---------- | -------- |
| RAID0  | 2      | 无          | 100%       | 临时数据 |
| RAID1  | 2      | 坏 1 盘     | 50%        | 系统盘   |
| RAID5  | 3      | 坏 1 盘     | (n-1)/n    | 通用     |
| RAID6  | 4      | 坏 2 盘     | (n-2)/n    | 重要数据 |
| RAID10 | 4      | 每组坏 1 盘 | 50%        | 数据库   |

警惕「重建窗口」：大容量盘（20TB+）坏一块后重建需要数天，期间第二块盘故障即数据全毁——大盘
时代 RAID6/纠删码是底线，RAID5 已不推荐用于关键数据。

### 5.2 快照与备份

- 快照：写时复制（COW，改前搬旧块）与重定向写（ROW，改后写新址）两类，秒级回滚但**不能替代
  备份**（存储整体故障时快照一起没）；
- 备份 3-2-1 原则：3 份副本、2 种介质、1 份异地；现代增强版 3-2-1-1-0 再加 1 份离线（防勒
  索）与 0 错误（定期恢复演练验证）。

## 6. 小结

**初学者要点**

- 分类一句话：DAS 直连块、SAN 网络块、NAS 网络文件、对象存储 API；「文件系统在谁那」是唯一
  判据；
- iSCSI 三步：discovery 发现 → login 登录 → lsblk 看到新盘；NFS 服务端写 exports、客户端
  mount 即用；
- RAID 记三档：RAID1 系统盘、RAID6 重要数据、RAID10 数据库；快照不等于备份。

**进阶注意**

- iSCSI 生产三件套：专用网段、multipath 多路径、IQN ACL/CHAP 接入控制；
- 大盘重建窗口让 RAID5 退场，关键数据用 RAID6 或纠删码；备份演进到 3-2-1-1-0 并做恢复演练；
- 超大规模选型看接口需求：块+对象+文件统一找 Ceph（CRUSH 无中心分布是核心机制），纯文件共
  享 GlusterFS/商业 NAS 更省心。
