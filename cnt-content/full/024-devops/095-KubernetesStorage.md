---
order: 100
title: Kubernetes 存储体系
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: 为什么容器会丢数据、PV/PVC/StorageClass 三层抽象、动态供应链路、StatefulSet 存储模板与快照恢复，附双副本 Deployment 挂同一盘的经典面试题。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'devops/090-KubernetesCoreDetailed'
  - 'devops/410-DatabaseOps'
  - 'devops/330-Troubleshooting'
prerequisites:
  - 'devops/090-KubernetesCoreDetailed'
---

## 场景：一次误删 Pod 丢掉了整个数据库

新手第一次在 Kubernetes 里跑 MySQL 大都经历过这一幕：把 StatefulSet 的 Pod 删了重建，
连接上去发现表还在；把 Deployment 里的 MySQL 删了重建，数据全没了。更早一步，有人把
数据写进容器的 `/var/lib/mysql`，第二天镜像升级重新发布，一夜回到解放前。

原因只有一条：**容器文件系统的生命周期跟着 Pod 走**。Pod 被删除重建，容器层（镜像层
之上的可写层）整体丢弃。要保住数据，就必须把数据放到「生命周期独立于 Pod」的地方——
这就是 Kubernetes 存储体系要解决的全部问题。

## 心智模型：牛马之分与两级抽象

无状态应用（Deployment 管理的 Web 服务）是「牛」：死一头再拉一头，个体无所谓；有状态
应用（数据库、消息队列）是「马」：每一头都有自己的档案（数据），不能随便换。存储体系
的抽象就是围绕这个差别设计的：

```text
Pod 级抽象（临时数据）          集群级抽象（持久数据）
┌─────────────────┐            ┌──────────────────────────────────┐
│ volumes:        │            │ PVC  用户视角：我要 10Gi 可读写    │
│   emptyDir      │  Pod 死即弃 │   ↓ 绑定                          │
│   configMap     │            │ PV  集群视角：一块实际的存储        │
│   secret        │            │   ↑ 由谁供货？                     │
└─────────────────┘            │ StorageClass 存储的「商品目录」     │
                               └──────────────────────────────────┘
```

两级抽象各管一件事：Pod 的 `volumes` 字段声明「这个 Pod 要挂什么」；集群级的
PV/PVC/StorageClass 解决「持久卷从哪来、归谁、用完怎么办」。理解了分工，YAML 就只是
把模型写出来。

## 三个集群级对象

### PV：集群里的一块实际存储

PersistentVolume 是管理员（或供应器）准备好的一块存储，带容量、访问模式、回收策略：

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-manual-10g
spec:
  capacity:
    storage: 10Gi
  accessModes: ["ReadWriteOnce"]
  persistentVolumeReclaimPolicy: Retain     # 释放后保留数据（见下文）
  hostPath:                                  # 仅实验用；生产用 CSI 驱动
    path: /data/pv10g
```

### PVC：用户的「申请单」

应用永远不直接碰 PV——Pod 声明 PVC，Kubernetes 负责把申请单和库存匹配：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 5Gi          # 申请 5Gi，可绑到 10Gi 的 PV 上（取小的）
```

为什么要多这一层间接？**职责分离**：开发只说「我要多大的盘、什么访问模式」，不关心
背后是 NFS、云盘还是 Ceph；运维只管供货。申请单和库存解耦后，换存储后端不需要改任何
应用清单——这是 Kubernetes 一以贯之的「声明式 + 间接层」设计。

### StorageClass：供货目录与动态供应的开关

手工建 PV 再等 PVC 来绑（静态供应）只适合演示。生产的标准路径是**动态供应**：定义
StorageClass，PVC 里点名它，供应器自动造出 PV：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com        # CSI 驱动（旧示例里的 kubernetes.io/aws-ebs 是已废弃的内置路径）
parameters:
  type: gp3
reclaimPolicy: Delete               # 动态供应的默认回收策略
allowVolumeExpansion: true          # 允许 PVC 扩容
volumeBindingMode: WaitForFirstConsumer
```

```yaml
# PVC 侧点名商品目录
spec:
  storageClassName: fast-ssd
```

动态供应的完整链路值得在脑中过一遍：Pod 创建 → 控制器发现 Pod 引用未绑定的 PVC →
PVC 带着调度结果找到 StorageClass → 对应 CSI 驱动在存储后端真实建盘 → 生成 PV 并与
PVC 绑定 → kubelet 在 Pod 所在节点挂载。`WaitForFirstConsumer` 的作用就藏在这条链里：
**等 Pod 先定下节点再建盘**，避免「盘建在了 A 可用区、Pod 被调度到 B 可用区」的尴尬
（第 7 节坑二）。

## 访问模式：RWO 不是「只能一个 Pod 读」

| 模式 | 全称 | 真实含义 |
| --- | --- | --- |
| RWO | ReadWriteOnce | 一个**节点**上可读写挂载（注意：单位是节点不是 Pod） |
| ROX | ReadOnlyMany | 多节点只读挂载 |
| RWX | ReadWriteMany | 多节点读写挂载（需要文件级共享存储：NFS、CephFS、EFS） |
| RWOP | ReadWriteOncePod | 一个 Pod 独占（1.27 引入，用前确认集群版本支持） |

这四项是**存储后端的能力声明**，不是 Kubernetes 的承诺：你给一块云盘（块设备）声明
RWX，绑定会永远 Pending，因为块设备物理上做不到多节点共享挂载。选型口诀：数据库用
RWO（块设备性能最好），配置与静态资源用 ROX，爬虫共享缓存、日志汇聚这类「多 Pod 同写
一个目录」才需要 RWX 的文件存储，并接受其性能上限。

## 回收策略：卷的「身后事」

PVC 被删除后，PV 何去何从由 `persistentVolumeReclaimPolicy` 决定：

| 策略 | 行为 | 适用 |
| --- | --- | --- |
| Retain | PV 进入 Released，数据保留，需人工清理再复用 | 数据库等有价数据（**改它要趁 PV 建立前**） |
| Delete | 删除 PV 及后端真实存储 | 动态供应默认；测试环境 |
| Recycle | 已废弃，不使用 | 历史名词 |

经典事故链：测试环境默认 Delete → 某天误删了「长得像测试库」的 PVC → 后端盘连带被删。
数据库类负载的清单里必须有一条：**动态供应也显式配 Retain，删 PVC 与删 PV 的操作纳入
变更流程**。

## StatefulSet 与 volumeClaimTemplates

有状态负载的存储需求是「每个副本一份独立、跟随实例名的盘」。Deployment 做不到（副本
可互换），StatefulSet 的 `volumeClaimTemplates` 专门解决：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels: { app: mysql }
  template:
    metadata:
      labels: { app: mysql }
    spec:
      containers:
        - name: mysql
          image: mysql:8.4
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
  volumeClaimTemplates:              # 每个副本自动生成一份 PVC
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

由此产生三条行为规则，全部可以从「模板 + 实例序号」推出来：

1. 副本 `mysql-0/1/2` 各自绑定 `data-mysql-0/1/2` 三份独立 PVC——**互不共享**；
2. 缩容只删 Pod，**PVC 保留**（数据比实例金贵），再扩容时新 Pod 捡回同名 PVC，数据还在；
3. 有序部署与有序回收（0 号先起、最后删），配合「先起主的再起从的」这类数据库初始化
   顺序——这正是 090 篇 StatefulSet 一节「身份即契约」的存储侧面。

## 快照与恢复

备份的 Kubernetes 原生表达是 VolumeSnapshot（需要集群装好 Snapshot CRD 与对应 CSI
驱动的 snapshotter）：

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mysql-snap-20261005
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: data-mysql-0
```

恢复路径是把快照作为新 PVC 的数据源（`dataSource` 字段），生成一块「回到过去」的新盘，
再挂给一个临时 Pod 或直接建新实例。注意两点边界：快照通常存在同一存储后端上，**它不是
异地容灾**；一致性要靠应用配合——数据库快照前先 `FLUSH TABLES WITH READ LOCK` 或使用
数据库原生备份工具，裸盘快照不等于数据库备份（与 410 篇数据库运维的备份策略衔接）。

## 常见坑

1. **Deployment 多副本 + RWO 的 Pending**：两个副本被调度到不同节点，第二块挂载永远
   等不到。RWO 语义是「单节点」，多副本要么各用各的卷（StatefulSet），要么换 RWX。
   这也是面试高频题「一个 RWO 的 PV 能被几个 Pod 用」的答案：同一节点上的多个 Pod
   可以，跨节点不行。
2. **PVC 一直 Pending 找不出原因**：按固定顺序查——StorageClass 名字写对了吗？
   provisioner 装了吗？声明的 accessModes 后端支持吗？`WaitForFirstConsumer` 模式下
   是不是还没有任何 Pod 引用它（这是正常等待，不是故障）？
3. **回收策略建 PV 之后改不动**：`reclaimPolicy` 只能在 PV 对象上改且部分字段受供应器
   限制，动态供应的盘要 Retain 就必须在 StorageClass 里声明。事后补救只能
   `kubectl patch pv <name> -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'`
   逐个改。
4. **扩容卡住**：PVC 扩容要求 StorageClass `allowVolumeExpansion: true` **且**是在
   扩容前就设置好的；文件系统在线扩容由 CSI 驱动完成，个别驱动要求 Pod 重启才生效。
5. **emptyDir 当持久化用**：emptyDir 随 Pod 生死，只适合临时缓存、排序缓冲；把
   session 数据放进去，滚动更新一次用户全体掉线。
6. **把 hostPath 当 PV 上生产**：hostPath 把 Pod 和特定节点焊死，节点故障数据即失，
   仅限单机实验与特权 DaemonSet 场景。

## 实践

以下实验在 kind / minikube / 单节点集群上完成，约 30 分钟。先确认集群里有默认
StorageClass：`kubectl get sc`（没有就先装 local-path-provisioner 或开 minikube 的
默认 addon）。

动态供应实验（10 分钟）：创建一个 PVC（2Gi，不写 storageClassName，走默认 SC）和一个
把 PVC 挂到 `/usr/share/nginx/html` 的单副本 Deployment，进入 Pod 写一个 index.html，
删除 Pod 等重建后验证文件还在。验收：新 Pod 里 `curl localhost` 仍返回你写的内容。

提示（思路方向）：验证点是「Pod 换了、卷没换」。先自己动手，卡住再看参考命令：

```bash
kubectl get pvc                     # STATUS 应为 Bound
kubectl exec deploy/web -- sh -c 'echo hello-pv > /usr/share/nginx/html/index.html'
kubectl delete pod -l app=web       # 让副本重建
kubectl exec deploy/web -- cat /usr/share/nginx/html/index.html   # hello-pv
```

StatefulSet 实验（15 分钟）：部署三副本 nginx + volumeClaimTemplates（1Gi），观察生成的
PVC 名字规律；缩容到 2 副本再扩回 3，验证 PVC 数量与数据存留。验收：能说出「缩容删的
是 Pod 不是 PVC」并给出 `kubectl get pvc` 的前后对比。

提示：PVC 命名格式是 `<模板名>-<StatefulSet名>-<序号>`。参考命令：

```bash
kubectl apply -f sts.yaml
kubectl get pvc                     # data-web-0, data-web-1, data-web-2
kubectl exec sts/web --container nginx -- sh -c 'echo from-0 > /usr/share/nginx/html/i.html' # 在 0 号写标记
kubectl scale sts web --replicas=2
kubectl get pvc                     # 仍是 3 份
kubectl scale sts web --replicas=3
kubectl exec web-0 -- cat /usr/share/nginx/html/i.html   # from-0：数据跟卷走
```

回收策略实验（5 分钟）：把实验 1 的 PVC 删掉，观察 PV 的状态与后端文件是否还在
（local-path 默认 Delete；若你按第 6 节 patch 成 Retain，会看到 Released 状态）。验收：
能复述 Retain/Delete 在你集群上的实际表现差异。

提示：`kubectl get pv` 看 STATUS（Bound → Released），`kubectl describe pv <name>`
看事件。Retain 的 PV 需要人工清掉 `claimRef` 才能被新 PVC 复用——这就是「人工清理再
复用」的具体动作。

面试题（5 分钟）：「一个 RWO 的 PV 能同时被几个 Pod 使用？」回答三要素：RWO 的语义
单位是节点、同节点多 Pod 可以、跨节点不行；补一句 RWX 的适用场景与代价。验收：30 秒
内讲清且不把 Once 说成 Pod。

## 下一步

- StatefulSet 的身份模型与有序性设计见 [K8s 核心机制详解](/devops/090-KubernetesCoreDetailed)；
- 数据库上容器的备份策略与一致性快照的运维视角见 [数据库运维](/devops/410-DatabaseOps)；
- PVC 绑定异常是集群排障的高频入口，系统排查思路见 [故障排查方法论](/devops/330-Troubleshooting)。
