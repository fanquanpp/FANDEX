---
order: 960
title: MySQL Shell：并行导出导入与集群管理工具链
module: 'mysql'
category: 数据库
difficulty: beginner
description: 官方新一代客户端 mysqlsh 全景——SQL/JavaScript/Python 三种模式、util.dumpInstance/loadDump 并行导出导入与断点续传、util.checkForServerUpgrade 升级体检、AdminAPI 检视集群状态、与 mysql CLI 和 mysqladmin 的分工；T 级库并行迁移、升级前体检脚本、集群巡检三个工程场景，附遮代码自检练习。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：MySQL 官方工具链的新一代主力——**MySQL Shell（mysqlsh）**。它不只是客户端：SQL 模式之外还内置 JavaScript/Python 脚本引擎与三套 API（`util` 数据搬运、`dba` AdminAPI 集群管理、升级体检），官方已把「大库导出导入」「集群运维」「升级体检」的标准答案都放在它身上。
- **解决什么问题**：T 级库用单线程 mysqldump 导要一天、恢复再一天（util.dumpInstance 多线程 + 压缩 + 断点把两者都压到小时级）；升级 8.0 到 8.4 前想知道弃用变量、保留字冲突、不兼容表有哪些（util.checkForServerUpgrade 一条命令出报告）；InnoDB Cluster 的建集群、看状态、切主需要一套脚本化接口（dba/cluster AdminAPI）。mysql CLI 交互够用但脚本能力弱，mysqladmin 只管服务级动作（ping/status/shutdown），两者都接不住这三件事。
- **什么时候用到**：大库迁移与备份恢复（接 [逻辑备份](/mysql/560-LogicalBackup) 的工具选型）、版本升级前体检（接 [8.4 升级指南](/mysql/840-MySQL84UpgradeGuide)）、InnoDB Cluster 搭建与巡检（接 [InnoDB Cluster](/mysql/630-InnoDBCluster)）、日常脚本化运维。老主力 mysqldump 的完整用法在 [逻辑备份](/mysql/560-LogicalBackup)，服务级管理（ping/status/flush）在 [mysqladmin](/mysql/920-Mysqladmin)，交互式 SQL 客户端在 [CLI](/mysql/910-CLI)。

## 安装与三种模式

```bash
# 安装（独立于 MySQL Server，客户端机器即可）
#   官方 APT/YUM 仓库：mysql-shell 包；Windows 有 MSI 安装器
mysqlsh --version            # MySQL Shell 8.4.x

# 三种进入方式
mysqlsh root@localhost:3306              # 交互模式，默认 SQL 语言
mysqlsh --js root@localhost:3306         # 交互模式，JavaScript
mysqlsh --py root@localhost:3306         # 交互模式，Python

# 脚本化（-e 单条执行，--file 批量）
mysqlsh root@localhost:3306 -e "util.version()"                 # 默认 sql 模式下也能调 util
mysqlsh --js root@localhost:3306 -e "print(util.version())"
```

三种模式的分工心智模型：**SQL 模式**是 mysql CLI 的超集（补全、多行编辑、语法高亮），日常查询用它；**JavaScript/Python 模式**承载 `util`/`dba`/`cluster` 三套 API——这些 API 是脚本接口不是 SQL 语句，必须在 JS/Py 模式下调用。会话切换用 `\sql`、`\js`、`\py` 斜杠命令（`\help` 查全表）。连接目标用 `user@host:port` 的 URI 形式，支持 `--password` 交互输入或环境变量——**不要把密码写进命令行**（ps 可见）。

## util 工具族：并行导出导入

### dumpInstance / loadDump 的核心用法

```javascript
// ===== 导出（mysqlsh 连接源库）=====
util.dumpInstance("/backup/prod_full", {
  threads: 8,               // 并行线程（按表与数据块切分）
  consistent: true,         // 一致性快照（默认 true：短暂持锁 + 记录 GTID 位点）
  compression: "zstd",      // 默认 zstd；可选 gzip/none
  ocDirectory: null,        // 高级：OCI 对象存储直传（云上迁移）
  ddlOnly: false,           // true 只导结构
  chunks: "auto"            // 大表按行块切分并行（默认 auto）
})
// 产出是一个目录：@.json（元数据）、@.done.json（完成标记）、*.zst 数据块、*.sql

// ===== 恢复（mysqlsh 连接目标库）=====
util.loadDump("/backup/prod_full", {
  threads: 8,
  loadIndexes: false,       // 技巧一：先搬数据后建索引
  deferredTableIndexes: true,
  backgroundThreads: 4,
  progressFile: "/backup/prod_full/load-progress.json"   // 技巧二：断点续传
})
// 中断后重复执行同一命令，已完成表自动跳过
```

逐参数讲工程含义：`threads` 并行的粒度是「表内行块 + 表间并行」——传统单线程导出瓶颈是网络与单文件写入，这里每线程独立产块；`consistent: true` 用「短暂全局读锁 + 记录 binlog/GTID 位点」拿到一致性快照，恢复后可与主库接复制（这是它与「随导随改的 mysqldump --single-transaction」在位点上的关键差异）；`loadIndexes: false` + `deferredTableIndexes` 让二级索引在全部数据落库后统一重建——大表导入提速数倍的常规技巧（索引重建走批量排序，比逐行维护快）；`progressFile` 使 loadDump 可断点重跑，跨网络导入失败重试的保命参数。产出目录里 `@.done.json` 是完成标记——备份校验先看它存在与否，再对 `@.json` 里的行数汇总与源库对账。

### util 家族全景与选型

| API | 粒度 | 典型场景 |
| --- | --- | --- |
| `util.exportTable` | 单表 → TSV/CSV | 给下游系统的定格式导出（接 [批量导入导出](/mysql/115-LoadDataImportExport) 的对端） |
| `util.dumpTables` | 库内若干表 | 抽表迁移、问题表备份 |
| `util.dumpSchemas` | 多个库 | 按业务库分批迁移 |
| `util.dumpInstance` | 整实例 | 全量备份、整库迁移（含用户与位点） |
| `util.loadDump` | 对应恢复 | 并行恢复、断点续传 |
| `util.importTable` | CSV/TSV → 单表 | LOAD DATA 的并行替代（跨 secure_file_priv 限制走客户端流） |
| `util.importJson` | JSON 文件 → 集合/表 | 文档型数据导入 |

与既有工具的分工：小库、要纯 SQL 文本 → mysqldump（[逻辑备份](/mysql/560-LogicalBackup)）；中大型库备份与迁移 → util.dumpInstance/loadDump（本篇）；面向人的定格式导出 → SELECT INTO OUTFILE（[批量导入导出](/mysql/115-LoadDataImportExport)）；服务级动作（ping/shutdown）→ mysqladmin（[mysqladmin](/mysql/920-Mysqladmin)）。

### 例子一（真实工程）：T 级库的并行迁移

业务库 1.2 TB 要从自建 5.7 迁到新机房 8.4（停机窗口只有 4 小时）。完整作业单：

```bash
# 第 0 步：升级体检先跑（见下一节）——5.7 直升 8.4 必须先过体检
mysqlsh dba@old-host:3306 -e "util.checkForServerUpgrade()"

# 第 1 步：源库全量导出（提前一天做，zstd 压缩后约 300 GB）
mysqlsh dba@old-host:3306 --js -e "
util.dumpInstance('/backup/prod_full', {
  threads: 16, consistent: true, compression: 'zstd'
})"
# 第 2 步：rsync 到新机房（数小时，与导出可重叠）
# rsync -avP /backup/prod_full/ newhost:/backup/prod_full/

# 第 3 步：停写窗口内做增量追平 + 恢复
#   dump 记录了 GTID 位点；先用复制把增量追上（见 590 篇），再切流
mysqlsh dba@new-host:3306 --js -e "
util.loadDump('/backup/prod_full', {
  threads: 16, loadIndexes: false, progressFile: '/backup/prod_full/progress.json'
})"
```

逐段讲作业设计：T 级导出的耗时大头在网络与压缩，`threads: 16` 按「源库 CPU 与 IO 上限」定（先 4 线程试跑测吞吐，别一步打满影响业务）；`consistent: true` 记录的 GTID 位点让「导出结束之后的增量」可以用复制通道追平（[复制](/mysql/590-Replication) 与 [GTID](/mysql/600-GTID)），把 4 小时停机窗口压缩成「追平增量 + 切流」的分钟级；`loadIndexes: false` 的索引后建在 1.2 TB 量级上省出小时级。回滚预案：源库保持只读运行一周，新库切流后出问题切回——迁移方案没有回滚预案不进窗口。

## util.checkForServerUpgrade：升级体检

### 报告的读法

```bash
# 目标版本用 --target-version 指定（默认按服务端版本）
mysqlsh dba@old-host:3306 -e "util.checkForServerUpgrade({'targetVersion': '8.4.0'})"
```

报告按四档分类（读法顺序即处理优先级）：

```text
Errors:    必须修——不改升级后直接不可用
           1) 用了已移除的变量 tx_isolation（配置文件 my.cnf 第 12 行）
           2) 表 t_order 使用了已移除的查询缓存相关语法
Warnings:  强烈建议修——升级后行为变化
           3) 表 t_log 的 TIMESTAMP 列未显式声明 DEFAULT（8.0 起行为收紧）
           4) 触发器使用了 sql_mode 依赖的隐式行为
Issues:    建议检查——语义可能有变
           5) 关键字冲突：表名 rank（8.0 新保留字，需加反引号或改名）
No issues: 无需处理
```

逐档讲处置：**Errors** 档不修完不进升级窗口（移除的变量改名见 [服务器 SQL 模式与系统变量](/mysql/855-ServerSqlModeAndVariables) 的改名表）；**Warnings** 档逐条评估行为差异（日期默认值、隐式转换收紧是高频）；**Issues** 档的保留字冲突要 `SHOW CREATE TABLE` 确认后决定改名或加反引号。体检覆盖「配置文件 + 库内对象 + 语句习惯」三层——它扫的是 my.cnf、information_schema 里的对象定义，不能扫应用代码里的 SQL（那部分靠升级前回归测试）。体检的输出也是与业务方对齐的沟通物：把 Warnings/Issues 清单按表归属分派给各业务负责人，升级窗口前排期消化。

### 例子二（真实工程）：升级前体检脚本

把体检做成「每次大版本演练的固定动作」，输出归档到工单系统：

```bash
#!/bin/bash
# upgrade_preflight.sh —— 升级演练日固定执行
set -euo pipefail
ENV=${1:?用法: upgrade_preflight.sh <环境: stg|prod>}
OUT="/var/log/mysql-upgrade/${ENV}-$(date +%Y%m%d)-report.txt"

mysqlsh dba@${ENV}-db-host:3306 -e \
  "util.checkForServerUpgrade({'targetVersion': '8.4.0'})" > "$OUT"

# 门禁：报告含 "Errors:" 且数量 > 0 则失败退出
if grep -A 20 "Errors:" "$OUT" | grep -qE "^\s+[0-9]+\)"; then
  echo "体检不通过：存在 Errors 级问题，见 $OUT" >&2
  exit 1
fi
echo "体检通过（Warnings/Issues 见 $OUT，需分派确认）"
```

逐段讲脚本设计：报告落盘带环境与日期——体检结论要可追溯（哪天查的、查的什么版本）；`grep` 门禁把「Errors 档非空」变成脚本的退出码，接进 CI/工单流水线后「体检通过」成为升级演练的硬前置；Warnings/Issues 不阻断但必须人工分派——自动化的边界是「机器拦硬伤，人评软差异」。体检要在**演练环境**先跑通全流程（恢复 + 回归），生产体检只是最后一道确认。

## AdminAPI：集群管理（dba 与 cluster）

### 与 630 篇的分工

630 篇用 AdminAPI 从零搭建 InnoDB Cluster（`dba.configureInstance` → `dba.createCluster` → `cluster.addInstance`），那是「搭建」场景；本篇补齐**日常巡检与运维**的 API 面（完整搭建流程见 [InnoDB Cluster](/mysql/630-InnoDBCluster)）：

```javascript
// ===== 巡检：集群状态一屏读 =====
mysqlsh root@node1:3306 --js -e "
var c = dba.getCluster('myCluster');
var s = c.status();

print('PRIMARY : ' + s.defaultReplicaSet.primary);
for (var [name, m] of Object.entries(s.defaultReplicaSet.topology)) {
  print(name + ' : ' + m.status + ' lag=' + (m.replicationLag || 0));
}"

// ===== 运维动作 =====
c.rejoinInstance('root@node3:3306')      // 故障节点恢复后重新入组
c.setInstanceOption('node3', 'tag:hide', true)   // 摘流量（维护前）
c.forcePrimaryInstance('root@node2:3306') // 主库永久损坏时的手工指定新主
c.rescan()                                // 拓扑变化后刷新元数据
```

逐段讲巡检脚本与运维动作的边界：`status()` 的输出里盯三个字段——`primary`（当前主）、各节点 `status`（ONLINE/RECOVERING/MISSING/OFFLINE）、`replicationLag`（延迟秒数，持续增长说明有节点追不上，见 [复制延迟](/mysql/650-ReplicationDelayCauseSolution)）；`rejoinInstance` 与「自动回归」的分工——节点短时失联恢复后通常自动以 SECONDARY 回归，元数据损坏等场景才手工 rejoin；`tag:hide` 摘流量对应 Router 的读分流，是「安全下线一个节点」的第一步（先摘流量、再 stop、再维护）。巡检脚本接进 Zabbix/定时任务（`mysqlsh -e` 每分钟跑一次，输出给监控解析），就是集群的「体检心电」。

### 例子三（真实工程）：集群巡检脚本

给运维平台的定时巡检写一个可解析输出（JSON）的巡检命令：

```bash
#!/bin/bash
# cluster_patrol.sh —— 每分钟由 crontab 拉起，输出 JSON 供监控采集
mysqlsh root@node1:3306 --js -e "
var s = dba.getCluster('myCluster').status();
var out = {primary: s.defaultReplicaSet.primary, nodes: []};
for (var [name, m] of Object.entries(s.defaultReplicaSet.topology)) {
  out.nodes.push({node: name, status: m.status, lag: m.replicationLag || 0});
}
print(JSON.stringify(out));
" | tail -1
# {"primary":"node1:3306","nodes":[{"node":"node1:3306","status":"ONLINE","lag":0},
#  {"node":"node2:3306","status":"ONLINE","lag":1},{"node":"node3:3306","status":"RECOVERING","lag":142}]}
```

解读一次真实输出：node3 处于 `RECOVERING` 且 lag=142 秒——它在用克隆/增量方式追数据，此时它的只读分流（Router 的 6447 端口）不应有流量，巡检脚本要按「status != ONLINE 则告警」触发处理流程（rejoin 或人工介入）。巡检输出用 JSON 是为了监控解析零成本——`-e` 的 stdout 就是脚本的 stdout，`print(JSON.stringify(...))` 一行对接任意监控栈。这套「脚本化巡检 + 告警分流」与 620 篇的 MGR 状态表（performance_schema.replication_group_members）互为补充：Shell API 封装了语义（谁该是谁、差多少），原始表适合深挖。

## 与 mysql CLI 和 mysqladmin 的分工

三者不是替代关系，是三个层次：

| 能力 | mysql CLI | mysqladmin | MySQL Shell |
| --- | --- | --- | --- |
| 交互式 SQL 查询 | 基础 | 无 | 增强版（补全/高亮/多行） |
| 脚本执行 | SQL 脚本（source） | 无 | SQL + JS/Python 三语言 API |
| 并行导出导入 | 无 | 无 | util.dumpInstance/loadDump |
| 升级体检 | 无 | 无 | util.checkForServerUpgrade |
| 集群管理 | 无 | 无 | dba/cluster AdminAPI |
| 服务级动作（ping/status/flush/shutdown） | 需手写 SQL | **原生强项** | 部分（dba 体系内） |
| 连接资源占用 | 极轻 | 极轻 | 较重（带脚本引擎） |

分工口诀：**敲 SQL 用 CLI，管服务用 mysqladmin，搬数据/管集群/做体检用 Shell**。运维机器三者并存是常态；容器镜像里为省体积只装 Shell 时，服务级动作可用 `mysqlsh --sql -e "SHOW GLOBAL STATUS LIKE 'Uptime'"` 替代，但 shutdown 类动作仍推荐 mysqladmin（语义更明确）。

## 常见坑点速记

- `util`/`dba`/`cluster` API 在 **JS/Py 模式**下调用，SQL 模式里报「util is not defined」——先 `\js` 切模式；
- dumpInstance 产出是**目录**不是单文件：`@.done.json` 是完成标记，备份校验先看它；
- loadDump 的 `loadIndexes: false` 是大库导入提速主力，但前提是数据能一次性导完再统一建索引；
- 断点续传靠 `progressFile`：跨网络导入必配，中断后重跑同一命令自动跳过已完成表；
- `consistent: true` 记录的 GTID 位点是增量追平的钥匙——迁移方案要把「导出位点 + 复制追平」写进作业单；
- 体检报告的 Errors 档不修完不进升级窗口；Warnings 要逐条分派，Issues 的保留字冲突查 `SHOW CREATE TABLE`；
- 巡检盯三个字段：primary、节点 status、replicationLag——RECOVERING 节点不该有读流量；
- 密码不进命令行：用交互输入或连接配置文件（`mysqlsh --save-passwords` 存安全凭据库）。

## 动手实践

练习一（预测题）：在 mysql CLI 里执行下面的命令会得到什么？

```bash
mysql -u root -p -e "util.dumpInstance('/backup/full')"
```

提示：util 是哪个层的东西？

<details>
<summary>参考实现</summary>

报错 `ERROR 1064 (42000): You have an error in your SQL syntax`——`util.dumpInstance(...)` 不是 SQL 语句，mysql CLI 只会把它交给 SQL 解析器。正确做法：`mysqlsh --js root@localhost:3306 -e "util.dumpInstance('/backup/full')"`。这个错误映射了本篇的层次模型：API 在 Shell 的脚本引擎里，不在 SQL 层——「搬数据/管集群用 Shell」口诀的另一面是「Shell 的 API 不能用 mysql 客户端跑」。
</details>

练习二（实战题）：写一个导出校验脚本：dumpInstance 完成后，校验 `@.done.json` 存在、解析 `@.json` 里的表清单与行数汇总，与源库 `SELECT SUM(table_rows) FROM information_schema.tables WHERE table_schema='mydb'` 对账（information_schema 的行数是估算值，允许 5% 偏差，精确对账用 COUNT）。

提示：done.json 与 @.json 都是 JSON；偏差比较用 bc 或 python。

<details>
<summary>参考实现</summary>

```bash
#!/bin/bash
set -euo pipefail
DUMP_DIR=${1:?用法: verify_dump.sh /backup/prod_full}
DB=${2:-mydb}

[ -f "$DUMP_DIR/@.done.json" ] || { echo "缺完成标记，导出未完成"; exit 1; }

# information_schema 估算行数（InnoDB 为近似值）
EST=$(mysql -N -B -u ro -p"$PW" -e \
  "SELECT SUM(table_rows) FROM information_schema.tables WHERE table_schema='$DB'")

# dump 元数据里的行数（@.json 的 includedTables 汇总字段，结构随版本微调，以实际为准）
DUMP_ROWS=$(python3 - "$DUMP_DIR" <<'EOF'
import json, sys
meta = json.load(open(sys.argv[1] + "/@.json"))
rows = meta.get("export", {}).get("rowsDumped", 0)
print(rows)
EOF
)

python3 -c "
est, dump = int('$EST'), int('$DUMP_ROWS')
diff = abs(est - dump) / max(dump, 1)
print(f'estimate={est} dumped={dump} diff={diff:.1%}')
exit(0 if diff <= 0.05 else 1)
" || { echo "行数偏差超 5%，需精确 COUNT 对账"; exit 1; }
echo "校验通过（估算口径）"
```

设计要点：`@.done.json` 是第一道闸——没有它一切行数都无意义（可能中途失败）；information_schema 的 table_rows 是统计估算（误差常态 10%+），所以门禁放 5% 只作「明显缺数据」的粗检，精确对账要按表 COUNT——粗检拦事故、精检走抽表，是大数据量校验的成本分层。
</details>

练习三（实战题）：写 `read_only_lag_check.js`（mysqlsh JS 脚本）：遍历集群全部节点，找出 `replicationLag` 超过 30 秒或 `status != ONLINE` 的节点并打印告警行（格式 `ALERT node=x reason=y`），全部健康打印一行 OK。

提示：status() 的 topology 遍历见本篇巡检段；lag 字段可能缺失（主库没有 lag）。

<details>
<summary>参考实现</summary>

```javascript
// patrol.js —— mysqlsh --js -f patrol.js 或 mysqlsh root@node1 --js < patrol.js
var s = dba.getCluster().status();
var alerts = 0;

for (var [name, m] of Object.entries(s.defaultReplicaSet.topology)) {
  var lag = (typeof m.replicationLag === 'number') ? m.replicationLag : 0;
  if (m.status !== 'ONLINE') {
    print(`ALERT node=${name} reason=status_${m.status}`);
    alerts++;
  } else if (lag > 30) {
    print(`ALERT node=${name} reason=lag_${lag}s`);
    alerts++;
  }
}
print(alerts === 0 ? 'OK all nodes healthy' : `${alerts} alert(s)`);
```

要点：`replicationLag` 缺失时的 `typeof` 防御——主库与部分状态码下该字段不存在，直接取值是 undefined（参与比较为 false，行为碰巧对但代码在撒谎）；显式归零让「无 lag 概念」与「lag=0」语义分离。脚本退出码可再接 `process.exit(alerts)` 让 cron/监控按退出码告警（Shell 端 `mysqlsh --js --interactive=false -f patrol.js; echo $?`）。
</details>

练习四（找错题）：这个迁移脚本有三处问题，先找再修：

```bash
mysqlsh dba@old-host:3306 --js -e "util.dumpInstance('/backup/full', {threads: 64})"
rsync -avP /backup/full/ newhost:/backup/full/
mysqlsh dba@new-host:3306 --js -e "util.loadDump('/backup/full')"
mysqlsh dba@old-host:3306 -e "util.checkForServerUpgrade()"
```

提示：线程数怎么定？迁移完成后才体检？进度文件呢？

<details>
<summary>参考实现</summary>

```bash
# 第 1 步：先体检（Errors 档不修完不迁移）
mysqlsh dba@old-host:3306 -e "util.checkForServerUpgrade({'targetVersion': '8.4.0'})"
# 第 2 步：试跑定线程（从 4 起步观测源库 IO/CPU，不一步 64）
mysqlsh dba@old-host:3306 --js -e "util.dumpInstance('/backup/full', {threads: 8, progressFile: '/backup/full/dump-progress.json'})"
# 第 3 步：传输 + 带进度与索引后建的恢复
mysqlsh dba@new-host:3306 --js -e "util.loadDump('/backup/full', {threads: 8, loadIndexes: false, progressFile: '/backup/full/load-progress.json'})"
```

三处问题：其一，`threads: 64` 直接打满——并行度由源库 IO 上限决定，盲调大只会把生产库压垮（先小值试跑测吞吐）；其二，体检排在迁移之后——体检发现 Errors 时导出已白做，顺序必须是「体检 → 导出 → 传输 → 恢复」；其三，两端都没有 progressFile——跨机房 rsync 传输后 loadDump 失败一次就要从头来，断点续传参数是 T 级作业的保命配置。顺带：loadDump 缺 loadIndexes: false 在 1 TB 级上多花小时级，见正文技巧。
</details>

练习五（实战题）：用 util.importTable 把一份 800 万行的 CSV 导入单表（要求：先查清它对 `local_infile`/`secure_file_priv` 的依赖，与 mysqlimport 的 LOCAL 版本对比安全边界），并说明它在什么场景下优于 `util.loadDump`（反过来呢？）。

提示：importTable 读客户端文件流式并行导入；loadDump 消费的是 dumpInstance 的产物目录。

<details>
<summary>参考实现</summary>

```javascript
// mysqlsh --js 下（连接目标库）
util.importTable("/data/orders_20261007.csv", {
  schema: "green",
  table: "orders",
  dialect: "csv-unix",          // 逗号 + \n；另有 csv-unix/csv-tdsv/tsv 等预设
  skipHeader: 1,
  threads: 8,
  characterSet: "utf8mb4"
})
```

依赖与边界：importTable 从**客户端**读文件流式分块并行导入（`LOAD DATA LOCAL` 的并行版），所以不受服务端 secure_file_priv 目录限制，但要求服务端 `local_infile=ON` 且仅在受信网络使用（LOCAL 通道的安全边界与 [批量导入导出](/mysql/115-LoadDataImportExport) 的 mysqlimport 一致，Shell 的 threads 让它在海量行上更快）。与 loadDump 的分工：importTable 管「外部 CSV → 单表」的一次性灌入；loadDump 管「dumpInstance 产物 → 整库/多表」的结构化恢复（含建表、索引、视图、位点）。反过来：只有 CSV 没有元数据时用不了 loadDump；要从数据库定格式出文件给下游，用 exportTable（它们是同一通道的两个方向）。
</details>

## 与之前和之后的知识的关系

- 往前：mysqldump 的单线程基线与小库用法见 [逻辑备份](/mysql/560-LogicalBackup)；物理备份的并行对照（XtraBackup）见 [物理备份](/mysql/570-PhysicalBackup)；服务级管理动作见 [mysqladmin](/mysql/920-Mysqladmin)；LOAD DATA 的服务器侧通道见 [批量导入导出](/mysql/115-LoadDataImportExport)。
- 往后：集群搭建的完整流程（本篇只管巡检与运维动作）见 [InnoDB Cluster](/mysql/630-InnoDBCluster)；升级的完整决策与步骤见 [8.4 升级指南](/mysql/840-MySQL84UpgradeGuide)；体检报出的变量改名见 [服务器 SQL 模式与系统变量](/mysql/855-ServerSqlModeAndVariables)；导出位点接复制追平见 [复制](/mysql/590-Replication) 与 [GTID](/mysql/600-GTID)。

## 参考与致谢

- MySQL Shell 8.4 官方文档（安装、语言模式、API 总览）：https://dev.mysql.com/doc/mysql-shell/8.4/en/（GPL/CC 许可）
- MySQL Shell 实用工具（dumpInstance/loadDump/importTable/upgrade check）：https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities.html（GPL/CC 许可）
- MySQL Shell AdminAPI（dba/cluster 与 InnoDB Cluster 管理）：https://dev.mysql.com/doc/mysql-shell/8.4/en/admin-api.html（GPL/CC 许可）
- 本篇 API 签名、参数语义（consistent/progressFile/loadIndexes）与体检报告分级均以官方文档为依据。

## 自我检查

- 能说出 Shell 三种语言模式的分工与 util/dba/cluster 三套 API 的归属；
- 能默写 dumpInstance/loadDump 的核心参数并解释 progressFile 的断点机制；
- 能按「体检 → 导出（记录位点）→ 传输 → 恢复（索引后建）→ 增量追平」排出 T 级迁移作业单；
- 能读体检报告的四档分级并说出各档的处置纪律；
- 能写可解析输出的集群巡检脚本并说出三个关键状态字段；
- 能给「敲 SQL / 管服务 / 搬数据」三种需求选对 CLI、mysqladmin、Shell。
