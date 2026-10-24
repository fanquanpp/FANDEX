---
order: 530
title: RESTful API 设计
module: 'go'
category: 后端技术
difficulty: beginner
description: 资源建模、统一响应与业务错误码、请求验证、版本化与幂等键：把「能跑的接口」升级为「好用的 API 契约」的设计篇，附完整订单 API 推演与练习
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---


## 知识点地图

- **知识类别**：RESTful API 契约设计。470-GoHTTP 讲 HTTP 服务怎么写，
  480-GoMiddleware 讲横切关注点，本篇讲**接口长什么样**——资源建模、
  响应结构、错误码、验证与版本演进的团队约定。
- **解决什么问题**：同一份 CRUD 业务，十个开发者能写出十种接口风格；
  前端对接要反复沟通字段与错误含义；接口升级打碎所有调用方。好的
  API 设计把「每个接口都要问一遍的问题」变成全团队一次性的约定。
- **什么时候用到**：新服务定义接口规范、接手混乱的老接口做重构评审、
  编写对外开放 API、Code Review 里争论「这个接口该返回什么」时。

## 真实场景：同一个「用户接口」的两种命运

两个团队同时做用户管理模块。A 团队直接按页面需求写接口：
`/getUserList`、`/delUser?id=1`、`/saveUser`（POST 创建、PUT 更新全靠约定），
前端对接时要口头确认「del 是物理删还是逻辑删」「save 怎么区分新增更新」，
一年后接口文档与实现漂移，没人敢动。

B 团队先定契约：资源是 `/users`，动作由 HTTP 方法表达，错误走统一
`{code, message, data}` 信封，验证规则写在请求结构体上。新人看路由表
就能猜对行为，文档生成器（swaggo/oapi-codegen）从注解产出契约，
前后端并行开发。**差别不在技术，在「把命名权收归约定」**——本篇
就是把 B 团队的约定逐条拆开讲透。

## 1. 资源与路由：URL 是名词，方法是动词

REST 的第一性原则：URL 定位**资源**（名词），HTTP 方法表达**对资源的操作**。

```text
GET    /api/v1/users          列表（支持 ?page=&size=&q= 过滤参数）
POST   /api/v1/users          创建
GET    /api/v1/users/:id      详情
PUT    /api/v1/users/:id      全量替换
PATCH  /api/v1/users/:id      部分更新
DELETE /api/v1/users/:id      删除
GET    /api/v1/users/:id/orders   嵌套资源：某用户的订单列表
```

逐条约定的理由：

- **复数名词**（`/users` 不是 `/user`）：资源是集合语义，单个成员用
  `:id` 从集合中寻址——`/users/42` 读作「users 集合里的 42 号」，
  与 HTTP 语义（GET 集合 vs GET 成员）自然对齐；
- **层级表达从属**：`/users/:id/orders` 表示订单从属于用户；如果订单
  也要独立寻址（运营后台直接查订单），再提供顶层 `/orders`。两层
  以上（`/a/:id/b/:id/c`）几乎总是设计错误，用查询参数或拆资源；
- **PUT 与 PATCH 的区别是语义不是习惯**：PUT 是「用这份表示**替换**
  资源」，字段缺失会被置零——客户端必须发全量；PATCH 是「按这份
  文档**修改**」，缺的字段不动。把全量更新写成 PUT 却只发一个字段，
  是线上数据被清空的经典事故来源；
- **动作型端点是必要之恶**：转账 `/accounts/:id/transfer`、发布
  `/articles/:id/publish` 这类无法映射到 CRUD 的操作，允许把动词放在
  路径末级，但只放在末级——前四级仍是资源路径。

## 2. 统一响应结构与业务错误码

### 2.1 信封结构

```go
type Response struct {
    Code    int    `json:"code"`              // 业务码，0 表示成功
    Message string `json:"message"`           // 人读的解释
    Data    any    `json:"data,omitempty"`    // 业务数据
    TraceID string `json:"traceId,omitempty"` // 链路 ID（联动 510-GoDistributedTracing）
}

type PageData struct {
    Items any   `json:"items"`
    Total int64 `json:"total"`
}

func OK(c *gin.Context, data any) {
    c.JSON(http.StatusOK, Response{Code: 0, Message: "ok", Data: data})
}

func Fail(c *gin.Context, httpStatus, bizCode int, msg string) {
    c.JSON(httpStatus, Response{Code: bizCode, Message: msg})
}
```

**为什么这样写**：HTTP 状态码表达「传输与协议层发生了什么」，
`code` 表达「业务层发生了什么」——两套编号混在一套里，业务错误
（余额不足）就会被迫挤进 4xx/5xx 的缝隙里，或者错用 200 携带错误
（调用方必须解析 body 才知道失败，重试与监控全乱套）。

**换成别的写法会发生什么**：只用 HTTP 状态码的「纯 REST」派在简单
场景成立，但业务错误种类远超状态码的表达力（409 Conflict 表达不了
「库存不足 vs 重复下单」的区别），约定业务码是工程折衷。反过来
「一切皆 200 + code」的国内早期风格让 CDN/网关/监控全部失明
（它们只看状态码），故障时连「哪些请求失败了」都统计不出来。
**两层并用、各管一层**是当前的主流共识。

### 2.2 错误码分段

业务码不做全局唯一流水号（团队间必然冲突），按域分段：

```text
0          成功
1xxxx      通用错误：10001 参数无效 / 10002 未认证 / 10003 无权限 / 10004 资源不存在
2xxxx      用户域：20001 用户名已存在 ...
3xxxx      订单域：30001 库存不足 / 30002 重复下单 ...
```

约定写进一个 `errcode` 包，任何 handler 禁止手写字面量——
**错误码散落在代码里等价于没有错误码**（前端拿到的 30002 与 30003
是什么含义全靠考古）。

### 2.3 错误处理与信封的接线

handler 层不再手写 Fail 分支，错误统一向上抛、中间件统一转换
（模式见 480-GoMiddleware 与 090-ErrorHandlingAdvanced 的错误包装）：

```go
func (h *OrderHandler) Create(c *gin.Context) (any, error) {
    var req CreateOrderReq
    if err := c.ShouldBindJSON(&req); err != nil {
        return nil, errcode.InvalidParam.WithCause(err)
    }
    order, err := h.svc.Create(c.Request.Context(), req)
    if err != nil {
        return nil, err // 业务错误带业务码向上抛
    }
    return order, nil
}
```

包装中间件把 `error` 映射为 `(httpStatus, bizCode, message)`：业务
错误类型实现了 `Code() int` 与 `HTTPStatus() int` 接口，映射规则
只有一处。换写法（每个 handler 自己 if-else 转 HTTP）的后果是
同一个错误在不同接口返回不同状态码——调用方无法建立稳定预期。

## 3. 请求验证：把规则写在类型上

```go
type CreateOrderReq struct {
    SkuID   int64   `json:"skuId" binding:"required,gt=0"`
    Count   int     `json:"count" binding:"required,gte=1,lte=99"`
    Address string  `json:"address" binding:"required,max=200"`
    Coupon  *string `json:"coupon,omitempty" binding:"omitempty,len=16"`
}

func (h *OrderHandler) Create(c *gin.Context) (any, error) {
    var req CreateOrderReq
    if err := c.ShouldBindJSON(&req); err != nil {
        return nil, errcode.InvalidParam.WithCause(err)
    }
    ...
}
```

逐行讲解：

- `binding` 标签由 validator 库解析，`ShouldBindJSON` 一次完成
  反序列化 + 验证；用 `BindJSON`（大写）会在验证失败时直接写 400
  响应——看起来省事，但错误格式绕过了统一信封，调用方收到两种
  错误形态，**宁可手动处理 err 也不要让框架替你写响应**；
- 指针 + `omitempty` 组合（`Coupon *string`）区分「没传」与「传了空」，
  值类型无法表达这个区别——部分更新（PATCH）接口必须用指针字段；
- 验证规则放在请求类型上而不是 handler 里，OpenAPI 文档与
  oapi-codegen 能直接消费这些标签生成契约。

边界划分：**语法验证**（类型、长度、必填）在 binding 层；
**业务验证**（库存够不够、优惠券是否过期）在 service 层——
把业务验证塞进 binding 标签会让请求类型依赖数据库，测试噩梦由此开始。

## 4. 版本化与幂等性

### 4.1 URI 版本

```text
/api/v1/users     当前版本
/api/v2/users     字段语义变更时新开版本，v1 冻结只修 bug
```

版本升级的真实触发条件是**破坏性变更**：删除字段、改字段类型、
改字段语义。加字段不是破坏性变更（旧调用方忽略新字段）。
管理约定：v1 的代码路径冻结（只允许修安全漏洞），新功能只进 v2，
并公示 v1 的下线日期——「先冻结再下线」是开放 API 的行业标准
（对照 GitHub/Stripe 的版本公告机制）。

### 4.2 幂等性矩阵与幂等键

网络会超时，超时会重试——**调用方无法区分「请求没到达」与「响应丢失」**，
所以接口必须回答「重复执行同一请求会怎样」：

| 方法 | 天然幂等？ | 原因 |
| --- | --- | --- |
| GET | 是 | 只读 |
| PUT | 是 | 全量替换，重复替换结果一致 |
| DELETE | 是 | 重复删除同一资源，结果一致 |
| POST | **否** | 重复提交创建两个订单 |

POST 的幂等靠**幂等键**补齐：客户端为每个业务操作生成唯一键，
服务端据此去重：

```go
func (h *OrderHandler) Create(c *gin.Context) (any, error) {
    idem := c.GetHeader("Idempotency-Key")
    if idem == "" {
        return nil, errcode.InvalidParam.WithMessage("missing Idempotency-Key")
    }
    // 首次执行：SETNX 记录幂等键，后续相同键直接返回首响应
    // （存储实现可用 Redis SETNX + TTL，见 550-GoRedis）
    ...
}
```

**换成别的写法会发生什么**：不做幂等键，前端通常用「提交后禁用按钮」
兜底——只防了手抖，防不了网络重试与用户刷新；服务端用「业务唯一
约束」（订单号唯一索引）兜底是更硬的保障，幂等键是它在接口层的
入口形态，两者并用。

## 5. 完整示例：给订单 API 走一遍全套约定

把前四节约定串成一张接口清单（节选自一个电商后端的真实风格）：

```text
POST   /api/v1/orders              创建订单；请求体带 Idempotency-Key
GET    /api/v1/orders?page&size    我的订单列表（认证后从 token 取用户）
GET    /api/v1/orders/:id          订单详情（404 或 403 视权限模型）
PATCH  /api/v1/orders/:id          修改收货地址（仅待支付状态，否则 30005）
POST   /api/v1/orders/:id/pay      动作型端点：支付；支持幂等键
DELETE /api/v1/orders/:id          取消订单（逻辑删除，返回 204）
```

错误响应统一形态（curl 视角）：

```bash
curl -X POST https://api.example.com/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 7f9c3a10d8e426b1" \
  -d '{"skuId": 1001, "count": 2, "address": "Mars, Sector 7"}'

# 库存不足时：
# HTTP/1.1 409 Conflict
# {"code":30001,"message":"insufficient stock","data":null,"traceId":"a1b2c3"}
```

逐项对照约定：状态码 409 表达「请求合法但与资源当前状态冲突」
（协议层语义），code 30001 表达具体业务原因（业务层语义），
traceId 让用户报障时能直接捞出这条请求的全链路日志。

## 常见陷阱与调试

- **坑 1：把动词写进资源路径**（`/api/getUserById?id=`）。表面是命名
  问题，实际后果是 HTTP 语义全部失效——缓存中间件不敢缓存 GET、
  网关的限流按方法区分失效、文档生成器无法推断操作类型。
- **坑 2：PATCH 用值类型接收。** `Count int` 在 JSON 里缺字段时是 0，
  无法区分「不改」与「改成 0」；用 `*int` 才能区分。老接口迁移时
  这个 bug 通常表现为「不传的字段被清空」。
- **坑 3：业务码越用越随意。** 没有分段约定后每个接口自造编号，
  一年后前端维护一张 200 行的错误码映射表。错误码必须集中在一个包、
  由 code review 把关。
- **坑 4：幂等键存了但没存响应。** 只记录「这个键已处理」而不缓存
  首次响应，重试方收到「重复请求」错误而不是原结果——调用方要的
  是「告诉我上次的结果」，不是「告诉我你重复了」。
- **坑 5：v2 里复用 v1 的 handler。** 版本分叉后「顺手共享」会把
  v1 的字段耦合回 v2，冻结承诺随之破产。共享只允许发生在 service
  层以下。

## 动手实践

**任务**：给一个「待办事项」资源实现完整 REST 契约——路由、统一
信封、验证、PATCH 部分更新、POST 幂等键，全部在一个 main.go 里可跑。

1. 路由：`GET/POST /todos`、`GET/PATCH/DELETE /todos/:id`
   （Go 1.22 的 `http.NewServeMux` 方法路由即可，不必上框架）；
2. 信封：`{code, message, data}`，业务错误定义为实现 `Code()` 的类型；
3. 请求类型：`Title string` 必填 1-50、`Done *bool` 部分更新字段；
4. 幂等：POST 支持 `Idempotency-Key`，用内存 map + 互斥锁去重并缓存首次响应。

**提示**：Go 1.22 的 mux 支持 `mux.HandleFunc("PATCH /todos/{id}", ...)`
与 `r.PathValue("id")`；部分更新实现上先把已存在项拷贝一份，
再逐字段判断指针是否非 nil 后覆盖——不要整体替换。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```go
package main

import (
    "encoding/json"
    "fmt"
    "errors"
    "net/http"
    "sync"
)

type todo struct {
    ID    int64  `json:"id"`
    Title string `json:"title"`
    Done  bool   `json:"done"`
}

type createReq struct {
    Title string `json:"title"`
}

type patchReq struct {
    Title *string `json:"title"` // 指针：nil = 不改
    Done  *bool   `json:"done"`
}

type bizErr struct {
    status int
    code   int
    msg    string
}

func (e *bizErr) Error() string { return e.msg }

var (
    errNoTitle   = &bizErr{400, 10001, "title required"}
    errNotFound  = &bizErr{404, 10004, "todo not found"}
)

type store struct {
    mu     sync.Mutex
    seq    int64
    items  map[int64]*todo
    idem   map[string]*todo // 幂等键 -> 首次创建结果
}

func write(w http.ResponseWriter, status, code int, msg string, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]any{
        "code": code, "message": msg, "data": data,
    })
}

func main() {
    s := &store{items: map[int64]*todo{}, idem: map[string]*todo{}}
    mux := http.NewServeMux()
    mux.HandleFunc("POST /todos", func(w http.ResponseWriter, r *http.Request) {
        key := r.Header.Get("Idempotency-Key")
        var req createReq
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil ||
            req.Title == "" || len(req.Title) > 50 {
            write(w, 400, 10001, "invalid title", nil)
            return
        }
        s.mu.Lock()
        defer s.mu.Unlock()
        if key != "" {                       // 幂等命中：返回首次结果
            if prev, ok := s.idem[key]; ok {
                write(w, 200, 0, "ok (replayed)", prev)
                return
            }
        }
        s.seq++
        t := &todo{ID: s.seq, Title: req.Title}
        s.items[t.ID] = t
        if key != "" {
            s.idem[key] = t
        }
        write(w, 201, 0, "created", t)
    })
    mux.HandleFunc("PATCH /todos/{id}", func(w http.ResponseWriter, r *http.Request) {
        var id int64
        if _, err := fmt.Sscanf(r.PathValue("id"), "%d", &id); err != nil {
            write(w, 400, 10001, "bad id", nil)
            return
        }
        var req patchReq
        json.NewDecoder(r.Body).Decode(&req)
        s.mu.Lock()
        defer s.mu.Unlock()
        t, ok := s.items[id]
        if !ok {
            write(w, 404, 10004, errNotFound.msg, nil)
            return
        }
        if req.Title != nil {                // 只覆盖显式传入的字段
            if *req.Title == "" || len(*req.Title) > 50 {
                write(w, 400, 10001, errNoTitle.msg, nil)
                return
            }
            t.Title = *req.Title
        }
        if req.Done != nil {
            t.Done = *req.Done
        }
        write(w, 200, 0, "ok", t)
    })
    http.ListenAndServe(":8080", mux)
}
```

**逐段讲解**：`patchReq` 全指针字段是部分更新的前提——nil 判定
决定「不动」，值类型做不到；幂等 map 存的是**首次响应的完整结果**
而不是布尔标记（坑 4），锁保证检查与写入的原子性（并发下的
check-then-act，对照 190-RaceDetectionAtomic 的竞态分类；生产实现
换成 Redis SETNX+TTL 即可横扩，见 550-GoRedis）；`write` 函数是
统一信封的唯一出口，任何 handler 不允许直接 `w.Write` 裸 JSON。
省略的 GET/DELETE 留作练习（GET 加分页参数，DELETE 逻辑删除）。

</details>

## 参考与致谢

- RFC 9110 HTTP Semantics（https://httpwg.org/specs/rfc9110.html ，开放标准）
- OpenAPI Specification 3.1（https://spec.openapis.org/oas/v3.1.0 ，Apache-2.0）
- Microsoft REST API Guidelines（https://github.com/microsoft/api-guidelines ，CC-BY 4.0 / MIT 双许可）
- 原始素材：本仓库 590-GoWebDevelopmentMicroservice §4 全量搬移扩写
