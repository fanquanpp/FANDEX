---
order: 59
title: Mermaid图表
module: markdown
category: 'Markdown Basics'
difficulty: intermediate
description: Mermaid图表语法：流程图、时序图、甘特图、类图与状态图的完整用法。
author: fanquanpp
updated: '2026-06-14'
related:
  - markdown/下标与上标
  - markdown/LaTeX数学公式
  - markdown/编辑器功能
  - markdown/链接与图片
prerequisites:
  - markdown/语法指南
---

## 1. Mermaid 概述

### 1.1 什么是 Mermaid

Mermaid 是一种基于文本的图表描述语言，允许在 Markdown 中使用代码块创建图表。它将图表定义从图形编辑器转移到文本，使图表可以纳入版本控制。

### 1.2 基本语法

````markdown
```mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[执行]
    B -->|否| D[结束]
    C --> D
```
````

### 1.3 支持的图表类型

| 图表类型     | 关键字            | 用途               |
| :----------- | :---------------- | :----------------- |
| **流程图**   | `graph`           | 算法流程、业务流程 |
| **时序图**   | `sequenceDiagram` | 交互流程、API 调用 |
| **甘特图**   | `gantt`           | 项目进度、任务排期 |
| **类图**     | `classDiagram`    | 面向对象设计       |
| **状态图**   | `stateDiagram-v2` | 状态机、生命周期   |
| **ER 图**    | `erDiagram`       | 数据库设计         |
| **饼图**     | `pie`             | 数据占比           |
| **思维导图** | `mindmap`         | 知识结构           |
| **Git 图**   | `gitGraph`        | 分支策略           |

## 2. 流程图

### 2.1 方向

| 关键字      | 方向     |
| :---------- | :------- |
| `TB` / `TD` | 从上到下 |
| `BT`        | 从下到上 |
| `LR`        | 从左到右 |
| `RL`        | 从右到左 |

### 2.2 节点形状

```mermaid
graph LR
    A[矩形] --> B(圆角矩形)
    B --> C{菱形}
    C --> D[(数据库)]
    D --> E[[子流程]]
    E --> F[(圆柱体)]
    F --> G>旗帜]
```

| 语法       | 形状     | 用途      |
| :--------- | :------- | :-------- |
| `[文本]`   | 矩形     | 普通步骤  |
| `(文本)`   | 圆角矩形 | 开始/结束 |
| `{文本}`   | 菱形     | 判断/条件 |
| `[(文本)]` | 圆柱体   | 数据库    |
| `[[文本]]` | 子流程   | 子过程    |
| `((文本))` | 圆形     | 连接点    |

### 2.3 连接线

| 语法 | 样式 | 说明 |
| :----- | :--------- | :-------- | ------ | -------- |
| `-->` | 实线箭头 | 默认连接 |
| `---` | 实线无箭头 | 无方向 |
| `-.->` | 虚线箭头 | 可选/条件 |
| `==>` | 粗线箭头 | 强调 |
| `-->   | 文本       | ` | 带标签 | 条件说明 |

### 2.4 完整示例

```mermaid
graph TD
    A[用户请求] --> B{已登录?}
    B -->|是| C[验证权限]
    B -->|否| D[跳转登录]
    D --> E[输入凭证]
    E --> F{验证通过?}
    F -->|是| C
    F -->|否| G[显示错误]
    G --> E
    C --> H{有权限?}
    H -->|是| I[返回数据]
    H -->|否| J[403 禁止访问]
```

## 3. 时序图

### 3.1 基本语法

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant B as 后端
    participant D as 数据库

    U->>F: 点击登录
    F->>B: POST /api/login
    B->>D: 查询用户
    D-->>B: 返回用户数据
    B->>B: 验证密码
    B-->>F: 返回 Token
    F-->>U: 登录成功
```

### 3.2 消息类型

| 语法   | 样式         | 说明      |
| :----- | :----------- | :-------- |
| `->>`  | 实线箭头     | 同步请求  |
| `-->>` | 虚线箭头     | 返回/响应 |
| `--)`  | 实线开放箭头 | 异步消息  |
| `--)`  | 虚线开放箭头 | 异步响应  |

### 3.3 高级特性

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Server
    participant DB

    Note over Client,Server: HTTP 请求阶段
    Client->>Server: GET /api/users

    activate Server
    Server->>DB: SELECT * FROM users
    activate DB
    DB-->>Server: 返回结果
    deactivate DB

    alt 成功
        Server-->>Client: 200 OK + 数据
    else 失败
        Server-->>Client: 500 Error
    end
    deactivate Server
```

- `autonumber`：自动编号
- `Note over A,B`：跨参与者注释
- `activate`/`deactivate`：显示激活状态
- `alt`/`else`：条件分支
- `loop`：循环
- `opt`：可选

## 4. 甘特图

### 4.1 基本语法

```mermaid
gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD
    axisFormat %m/%d

    section 需求阶段
    需求分析       :done, req1, 2026-01-01, 10d
    需求评审       :done, req2, after req1, 3d

    section 开发阶段
    前端开发       :active, dev1, after req2, 20d
    后端开发       :active, dev2, after req2, 25d

    section 测试阶段
    集成测试       :test1, after dev1, 10d
    性能测试       :test2, after test1, 5d

    section 上线阶段
    预发布         :rel1, after test2, 3d
    正式发布       :milestone, rel2, after rel1, 0d
```

### 4.2 任务状态

| 关键字      | 样式             | 说明           |
| :---------- | :--------------- | :------------- |
| `done`      | 已完成（灰色）   | 已完成的任务   |
| `active`    | 进行中（蓝色）   | 当前执行的任务 |
| （默认）    | 未开始（浅色）   | 待执行的任务   |
| `milestone` | 里程碑（菱形）   | 关键节点       |
| `crit`      | 关键路径（红色） | 必须按时完成   |

## 5. 类图

### 5.1 基本语法

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
        +move() void
    }

    class Dog {
        +String breed
        +fetch() void
        +bark() void
    }

    class Cat {
        +String color
        +purr() void
    }

    class Shelter {
        -List~Animal~ animals
        +addAnimal(Animal a) void
        +findByName(String name) Animal
    }

    Animal <|-- Dog
    Animal <|-- Cat
    Shelter o-- Animal
```

### 5.2 关系类型

| 语法    | 关系         | 说明                 |
| :------ | :----------- | :------------------- |
| `<\|--` | 继承         | 子类继承父类         |
| `*\--`  | 组合         | 强拥有，生命周期一致 |
| `o--`   | 聚合         | 弱拥有，可独立存在   |
| `-->`   | 关联         | 单向引用             |
| `--`    | 关联（双向） | 双向引用             |
| `..>`   | 依赖         | 使用关系             |
| `..\|>` | 实现         | 接口实现             |

## 6. 状态图

### 6.1 基本语法

```mermaid
stateDiagram-v2
    [*] --> 待提交
    待提交 --> 审核中: 提交申请
    审核中 --> 已批准: 审核通过
    审核中 --> 已拒绝: 审核拒绝
    已拒绝 --> 待提交: 重新提交
    已批准 --> 执行中: 开始执行
    执行中 --> 已完成: 执行完成
    执行中 --> 已取消: 取消执行
    已完成 --> [*]
    已取消 --> [*]
```

### 6.2 复合状态

```mermaid
stateDiagram-v2
    [*] --> 空闲

    state 运行中 {
        [*] --> 初始化
        初始化 --> 处理中
        处理中 --> 等待响应
        等待响应 --> 处理中
    }

    空闲 --> 运行中: 启动
    运行中 --> 空闲: 停止
```

## 7. 平台支持

| 平台           | Mermaid 支持 | 说明                |
| :------------- | :----------- | :------------------ |
| **GitHub**     |              | 原生支持            |
| **GitLab**     |              | 原生支持            |
| **Obsidian**   |              | 原生支持            |
| **Typora**     |              | 原生支持            |
| **Hugo**       |              | 需 shortcode 或插件 |
| **Jekyll**     |              | 需插件              |
| **CommonMark** |              | 不支持              |

## 8. 调试技巧

- 使用 [Mermaid Live Editor](https://mermaid.live/) 在线编辑和预览
- 语法错误时图表不渲染，检查控制台错误信息
- 节点 ID 不能包含空格，使用文本标签代替
- 中文文本在某些渲染器中可能需要引号包裹
