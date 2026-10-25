---
order: 110
title: 关系设计与范式
module: 'sql'
category: 数据库
difficulty: beginner
description: 从 ER 建模到关系模式：1NF/2NF/3NF/BCNF 的判定与分解，主外键与联合主键设计，反范式的取舍——用商品管理系统与学生成绩库两个真实项目讲
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：SQL 设计理论 / 关系建模与规范化。
- **解决什么问题**：建表前最贵的错误是表结构错了——冗余导致同一事实多处存储、更新一处漏一处；删除一行连带丢掉另一个独立事实（插入/删除异常）。范式就是一套"把事实拆干净"的检验标准。
- **什么时候用到**：新项目建库设计评审；接手老库判断"这坨冗余能不能拆"；面试里的"给你一张表判断第几范式"。
- **案例来源**：两个真实项目——商品管理系统七表（部门-岗位-员工外键链）与学生成绩库（联合主键经典）；外加 vocaloid 曲库四表模型。

## 心智模型：范式是"事实不重复"的递进检验

每一级范式都在回答一个问题：

| 范式 | 检验的问题 | 一句话判据 |
| --- | --- | --- |
| 1NF | 单元格里是不是只有一个值 | 不能有"逗号分隔的多值列" |
| 2NF | 非主属性是否依赖**整个**主键 | 只对联合主键有意义 |
| 3NF | 非主属性之间有没有依赖 | 不能"由别的非主属性推出来" |
| BCNF | 每个决定因素都是候选键 | 3NF 的彻底版 |

递进关系：满足 2NF 必先满足 1NF，以此类推。实践中 3NF 是常规目标，BCNF 用于联合主键场景的复核。

## 第一步：ER 建模 → 关系模式

以商品管理系统为例，业务是"部门设岗位、员工归属岗位、员工向客户销售商品"。ER 建模四步：

```text
1. 找实体：部门、岗位、员工、商品、客户、供应商、销售单
2. 定主键：每个实体一个天然或代理主键（部门 Department_id、员工 Employees_id）
3. 画关系（基数）：
   部门 1 ── n 岗位       岗位多对一部门 → 部门主键进岗位表当外键
   岗位 1 ── n 员工       同理
   员工 n ── n 客户       通过"销售"事件表解耦 → 销售表存双方主键
   商品 n ── n 供应商     同上（供货关系表）
4. 落地成表：每个实体一张表，多对多关系单独一张桥表
```

关键判断：**"多对多"永远落成桥表**。员工与客户的多对多如果直接在员工表里放"客户列表"列，1NF 就没了；拆出 Sales_info 销售表（存员工 id、客户 id、商品 id、数量、时间），多对多变成两个一对多，还白赚了销售事件本身的数据（时间、数量）。

落地片段（简化自项目 SQL）：

```sql
CREATE TABLE Department_info (
    Department_id   CHAR(4) PRIMARY KEY,
    Department_name VARCHAR(30) NOT NULL
);

CREATE TABLE Post_info (
    Post_id       CHAR(6) PRIMARY KEY,          -- xs1001 销售岗
    Post_name     VARCHAR(30) NOT NULL,
    Department_id CHAR(4) NOT NULL,
    FOREIGN KEY (Department_id) REFERENCES Department_info(Department_id)
);

CREATE TABLE Employees_info (
    Employees_id CHAR(8) PRIMARY KEY,
    Employees_name VARCHAR(20) NOT NULL,
    Employees_sex CHAR(2) DEFAULT '男' CHECK (Employees_sex IN ('男','女')),
    Identity_id   CHAR(18) CHECK (Identity_id REGEXP '^[0-9]{17}[0-9X]$'),
    Post_id       CHAR(6),
    Hiredate      DATETIME DEFAULT NOW(),
    FOREIGN KEY (Post_id) REFERENCES Post_info(Post_id)
);
```

三个设计点：**先父表后子表**的建表顺序（外键引用的表必须已存在，注释掉的 DROP 语句暗示了调试时反向删表也要先子后父）；性别用 `char(2) + CHECK in` 还是 `enum('男','女')`——同约束两种写法，enum 改值要 ALTER TABLE，CHECK 改值只改约束，长期演进 CHECK 更灵活；身份证正则放在 CHECK 里，非法数据在**写入时**被拦而不是查询时被 discover。

## 1NF：消灭多值列

反面教材——把订单的商品直接塞进一列：

```sql
-- 违反 1NF：一个单元格塞多值
CREATE TABLE bad_orders (
    order_id   int PRIMARY KEY,
    items      varchar(500)    -- '华为P20x2, 小米6x1'
);
```

症状清单：想统计"卖了多少个华为"要 LIKE 模糊扫；想改数量要**字符串替换**；两件同款商品只能靠人眼数分号。拆解方式就是上面的桥表思路——多值关系拆成子表，一格一值。

## 2NF：非主属性要依赖整个主键（联合主键专属）

学生成绩库的标准案例。`Mark` 表用**联合主键**表达"一个学生一门课一条成绩"：

```sql
CREATE TABLE Mark (
    StudentNo CHAR(8) NOT NULL,
    CourseNo  CHAR(8) NOT NULL,
    Score     FLOAT(4,1),
    PRIMARY KEY (StudentNo, CourseNo),            -- 联合主键
    FOREIGN KEY (StudentNo) REFERENCES Student(StudentNo),
    FOREIGN KEY (CourseNo)  REFERENCES Course(CourseNo)
);
```

现在往这张表里放一个"学生姓名"列会发生什么：

```sql
-- 违反 2NF：StudentName 只依赖联合主键的一半（StudentNo）
(StudentNo, CourseNo) → Score     合规：完整依赖，Score 是本表的事
(StudentNo)           → StudentName  部分依赖，姓名是学生表的事
```

症状：张强选 6 门课，姓名重复存 6 次；改名要改 6 处，漏一处数据自相矛盾；张强一门课没选（现实中真有——成绩库特意留了"张强无成绩记录"这个数据伏笔），**姓名在成绩表里就没有落点**，这就是插入异常。分解：姓名挪回 Student 表，Mark 只留"成绩这个关系自己的属性"。

判定技巧：**单列主键的表不可能违反 2NF**（主键没有"一半"）——所以 2NF 判定只在联合主键/联合唯一键场景出场。

## 3NF：消灭非主属性之间的依赖

商品表里的反面设计：

```sql
CREATE TABLE bad_commodity (
    Commodity_id   CHAR(8) PRIMARY KEY,
    Commodity_name VARCHAR(50),
    Category_id    CHAR(4),
    Category_name  VARCHAR(30)    -- 违反 3NF：由 Category_id 决定
);
```

`Category_name` 传递依赖：`Commodity_id → Category_id → Category_name`。分类改名要更新 N 行商品而不是 1 行分类表；新分类还没上架商品时在商品表里无处安放。分解成 Commodity 表 + Category 表，外键连接——这与"实体拆表"是同一件事，只是从依赖角度再看一遍。

3NF 的口诀：**每个非主属性只准依赖键**（"the key, the whole key, and nothing but the key"——这句英文口诀同时覆盖 2NF 与 3NF）。

## BCNF：联合主键场景的复核

BCNF 要求**每个非平凡函数依赖的决定因素都是候选键**。成绩库的 Mark 表是教科书级正例：主键 (StudentNo, CourseNo)，表里唯一的非主属性 Score，依赖 `(StudentNo, CourseNo) → Score`——决定因素就是主键本身，BCNF 达成。

一个经典反例帮助理解：教师、课程、教材表，约束是"每门课由多位教师任课，每位教师只教一门课、每门课固定一本教材"：

```text
依赖：Teacher → Course（教师决定课程）、Course → Text（课程决定教材）
候选键只有 (Teacher, Course)，而 Teacher → Course 的决定因素不是候选键 → 违反 BCNF
```

症状：新课程还没排教师时，"课程-教材"的对应无处存储。分解：拆出 (Course, Text) 独立表。BCNF 的实用价值就在这类"约束藏得很深"的表——3NF 检查不出它。

## 联合主键 vs 代理主键的取舍

成绩库用联合主键是**有依据的**：业务规则"一个学生一门课只有一条成绩"就是要数据库层硬保证——联合主键天然实现这条唯一性。什么时候用代理键（自增 id）：

| 场景 | 推荐 | 理由 |
| --- | --- | --- |
| 交集表只存关系本身（如成绩） | 联合主键 | 唯一性即业务规则，白赚约束 |
| 业务键可能变（身份证换证、手机号换号） | 代理键 | 外键引用稳定，改业务键只动一行 |
| ORM 框架友好 | 代理键 | 多数框架对联合主键支持笨拙 |
| 桥表还要挂事件属性（下单时间） | 代理键 + 联合唯一索引 | 事件表有自己的生命周期 |

实践主流是"**代理主键 + 业务唯一约束**"双保险：`id BIGINT AUTO_INCREMENT PRIMARY KEY` 照建，业务唯一性单独 `UNIQUE KEY (StudentNo, CourseNo)`。这样外键引用稳定、约束不丢。

## 反范式：什么时候故意冗余

范式管一致性，反范式管读性能。三个正当理由：

1. **高频报表免 JOIN**：订单表冗余"下单时商品名称快照"——历史订单必须显示**当时**的名称，商品改名不该改历史，这其实是业务正确性而非纯性能；
2. **计数字段**：帖子表存 reply_count，触发器/应用层维护，列表页免 COUNT 子查询；
3. **跨库/跨服务**：微服务边界内无法 JOIN，冗余对方的主档字段（配同步机制）。

反范式的三条款：**列出冗余字段清单**（写进设计文档，评审有据可查）；**写路径单一**（一处写入多处读，避免双写点）；**配一致性机制**（触发器、应用层同步、或接受 T+1）。无纪律的"看着方便就冗余一列"是所有数据事故的起点。

## 用 vocaloid 四表模型自查一遍

`logo 1─n vsinger 1─n music n─1 producer`：

- logo 表存应援色 HEX——为什么独立成表而不是塞 vsinger 列？因为多个歌姬共用一个企划 logo，颜色改一次只动一行（3NF）；
- music 表外键指向 vsinger 与 producer，两端都是一对多——直接外键落位，不需要桥表；
- 想加"合作演唱"（一首歌多歌姬）功能？现有 music.vsinger_id 单外键表达不了，要拆 `music_vsinger` 桥表——这就是"建模赶不上需求"时范式化的增量路径。

## 动手实践：给成绩库做一次范式体检

任务：

1. 往 Mark 表加 `StudentName varchar(20)` 列，分别用 SQL 演示"张强改名"要 UPDATE 几行；再演示"插入学籍但暂无选课"会发生什么；
2. 把 Mark 表还原成 BCNF 正解（去掉 StudentName），用联合主键验证重复插入被拒；
3. 商品管理系统的 Sales_info 若没有单独成表，改为在 Employees_info 加 `customers varchar(500)` 列——列出三种会坏掉的查询；
4. 为 vocaloid 库设计"歌姬换公司"（历史归属记录）功能：判断该改外键还是加桥表，写出 DDL。

<details>
<summary>参考实现（先自己写再展开）</summary>

```sql
-- 1
ALTER TABLE Mark ADD COLUMN StudentName CHAR(20);
UPDATE Mark SET StudentName = '张强' WHERE StudentNo = 'xx100105';  -- 有 N 门课改 N 行
-- 张强无成绩记录时：
INSERT INTO Mark (StudentNo, CourseNo, StudentName) VALUES ('xx100105', NULL, '张强');
-- CourseNo 是主键成分，插 NULL 直接报错 → 姓名无处安放（插入异常实锤）
ALTER TABLE Mark DROP COLUMN StudentName;

-- 2
INSERT INTO Mark (StudentNo, CourseNo, Score) VALUES ('xx100101', 'kc1001', 90);
-- ERROR 1062: Duplicate entry 'xx100101-kc1001' for key 'PRIMARY' → 业务唯一性由主键保证

-- 3 会坏掉的查询：
-- a) 统计"王小妮买过哪些商品"：LIKE '%王小妮%' 误匹配（名字是别的子串一部分）
-- b) 统计每个客户的订单数：必须先字符串拆行（没有可 GROUP 的行）
-- c) 删除员工：客户购买记录作为属性列一起消失（删除异常）

-- 4：历史归属必须加桥表（改外键会丢历史）
CREATE TABLE vsinger_company (
    vsinger_id BIGINT NOT NULL,
    company    VARCHAR(50) NOT NULL,
    joined_on  DATE NOT NULL,
    left_on    DATE NULL,
    PRIMARY KEY (vsinger_id, company, joined_on)
);
```

判读要点：任务 1 的两个实验就是 2NF 违例的"更新异常 + 插入异常"现场演示；任务 4 的判断依据是"新需求是历史事实还是当前状态"——历史事实永远桥表（拉链表雏形）。
</details>

## 检验清单

- 能把一段业务描述走完 ER 四步并指出多对多的桥表落点；
- 能对任意表逐级判定 1NF/2NF/3NF，并说出"单列主键表不会违反 2NF"；
- 能解释成绩库联合主键为什么是对的（业务唯一性），以及代理键 + 唯一索引的折中；
- 能列出反范式的三个正当理由与三条款纪律；
- 能用"更新/插入/删除异常"三个词向非技术同事解释为什么要拆表。

## 下一步

- [约束](/sql/100-Constraint)：范式落成 DDL 后由谁守门；
- [数据类型](/sql/090-DataType)：字段类型选型；
- [查询反模式](/sql/460-SQLAntipattern)：设计层面的反模式清单。

## 参考与致谢

- 案例改编自仓库扫描素材：商品管理系统建表 SQL、学生成绩库综合训练（教学课堂材料）、vocaloid 曲库四表模型（自建教学数据）。
- 范式定义对照 Codd 关系模型原始论文与维基教科书 Database Design/Normalization（CC BY-SA）：<https://en.wikibooks.org/wiki/Database_Design/Normalization>
