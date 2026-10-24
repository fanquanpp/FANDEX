---
order: 810
title: Python 与 FastAPI
module: 'python'
category: 后端技术
difficulty: intermediate
description: FastAPI 核心：路径操作、Pydantic 模型、依赖注入、中间件与生命周期。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'python/790-PythonDocker'
  - 'python/870-PythonOAuth2'
  - 'python/840-PythonRedis'
  - 'python/860-PythonCeleryDistributedTaskQueue'
prerequisites: []
---


## 知识点地图

- **知识类别**：FastAPI 的核心机制——路径操作、Pydantic 模型驱动的验证与序列化、依赖注入、中间件与生命周期、路由拆分。它是「类型注解驱动 Web 开发」范式的主力实现。
- **解决什么问题**：写 API 时验证、序列化、文档三件事反复写——FastAPI 用 Pydantic 模型声明请求/响应形状，一套注解同时产出运行时校验、JSON Schema 与交互式文档（/docs）；依赖注入把「数据库会话、当前用户」这类横切资源从每个函数的手工获取里解放出来。
- **什么时候用到**：构建 REST API 与内部服务；为 [异步编程](/python/670-AsyncProgrammingDetailed) 的协程提供真实流量出口；数据模型层与 [数据类与 Pydantic](/python/550-DataClassPydantic) 共用同一套 Pydantic 知识；鉴权的安全基础见 [OAuth2](/python/870-PythonOAuth2)。测试 FastAPI 应用（TestClient + 依赖覆盖）见 [Python 测试](/python/750-PythonTest) 与 [unittest 与 mock](/python/755-UnittestAndMockStdlib)。

## 什么是 FastAPI

FastAPI 是一个现代、高性能的 Python Web 框架，用于构建 API。它基于 Starlette（处理网络请求）和 Pydantic（数据验证），利用 Python 的类型注解实现自动的数据验证、序列化和 API 文档生成。

FastAPI 的性能在 Python Web 框架中处于第一梯队（与 Node.js、Go 的同级框架可比），它的设计理念是让开发者在写代码的同时就完成数据验证和文档编写，减少重复劳动。

## 基础概念

### 路径操作装饰器

FastAPI 使用装饰器来定义路由，如 @app.get、@app.post 等。每个装饰器对应一个 HTTP 方法。

### 路径参数与查询参数

路径参数是 URL 的一部分（如 /users/{user_id} 中的 user_id），查询参数是 URL 中 ? 后面的部分（如 ?page=1）。

### 请求体

POST 和 PUT 请求通常携带请求体（Request Body），FastAPI 使用 Pydantic 模型来验证请求体的数据结构和类型。

### 依赖注入

FastAPI 的依赖注入系统允许你声明代码所需的依赖，框架会自动解析和提供。常用于数据库连接、认证等场景。

### 自动文档

FastAPI 自动生成 OpenAPI 文档和交互式 API 文档（Swagger UI 和 ReDoc），访问 /docs 和 /redoc 即可查看。

## 快速上手

### 安装

```bash
pip install fastapi uvicorn
```

### 最简单的 API

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello, FastAPI!"}

@app.get("/items/{item_id}")
async def get_item(item_id: int):
    return {"item_id": item_id}
```

运行：

```bash
# 方式一：FastAPI CLI（fastapi[standard] 自带，推荐）
fastapi dev main.py

# 方式二：直接用 uvicorn
uvicorn main:app --reload
```

访问 http://127.0.0.1:8000/ 即可看到返回的 JSON。访问 http://127.0.0.1:8000/docs 可以看到自动生成的交互式 API 文档。

## 详细用法

### 路径参数

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    """路径参数：user_id 会自动转换为整数"""
    return {"user_id": user_id}

# 枚举类型的路径参数
from enum import Enum

class ModelName(str, Enum):
    alexnet = "alexnet"
    resnet = "resnet"

@app.get("/models/{model_name}")
async def get_model(model_name: ModelName):
    return {"model": model_name.value}
```

### 查询参数

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/items")
async def list_items(
    skip: int = 0,            # 有默认值的查询参数
    limit: int = 10,          # 有默认值的查询参数
    q: str | None = None,     # 可选的查询参数（PEP 604 联合类型写法）
):
    return {"skip": skip, "limit": limit, "q": q}

# 请求示例：/items?skip=10&limit=20&q=python
```

### 请求体（Pydantic 模型）

```python
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr
from datetime import datetime

app = FastAPI()

# 定义请求体模型
class UserCreate(BaseModel):
    username: str
    email: EmailStr          # 自动验证邮箱格式
    password: str
    age: int | None = None   # 可选字段

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

@app.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate):
    """创建用户，自动验证请求体"""
    # user.username、user.email 等已经过验证
    # 模拟创建用户
    return {
        "id": 1,
        "username": user.username,
        "email": user.email,
        "created_at": datetime.now()
    }
```

### 表单数据与文件上传

```python
from fastapi import FastAPI, File, UploadFile, Form

app = FastAPI()

@app.post("/login")
async def login(username: str = Form(), password: str = Form()):
    """处理表单数据"""
    return {"username": username}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """处理文件上传"""
    content = await file.read()
    return {
        "filename": file.filename,
        "size": len(content),
        "content_type": file.content_type,
    }

@app.post("/upload-with-data")
async def upload_with_data(
    file: UploadFile = File(...),
    description: str = Form(...),
):
    """同时上传文件和表单数据"""
    return {
        "filename": file.filename,
        "description": description,
    }
```

### 依赖注入

```python
from fastapi import FastAPI, Depends, HTTPException, status
from typing import Annotated

app = FastAPI()

# 模拟数据库
fake_items_db = {"item1": "苹果", "item2": "香蕉"}

# 定义依赖
def get_item_or_404(item_id: str):
    """根据 ID 获取项目，不存在则返回 404"""
    if item_id not in fake_items_db:
        raise HTTPException(status_code=404, detail="项目不存在")
    return fake_items_db[item_id]

def common_parameters(q: str | None = None, skip: int = 0, limit: int = 100):
    """通用查询参数"""
    return {"q": q, "skip": skip, "limit": limit}

# 使用依赖
@app.get("/items/{item_id}")
async def read_item(item: str = Depends(get_item_or_404)):
    return {"item": item}

@app.get("/search")
async def search(params: dict = Depends(common_parameters)):
    return params

# 使用 Annotated 简化依赖声明
CommonParams = Annotated[dict, Depends(common_parameters)]

@app.get("/products")
async def list_products(params: CommonParams):
    return params
```

### 中间件

```python
from fastapi import FastAPI, Request
import time

app = FastAPI()

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """添加处理时间头的中间件"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# CORS 中间件
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 允许的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 异常处理

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

items = {"item1": "苹果", "item2": "香蕉"}

@app.get("/items/{item_id}")
async def get_item(item_id: str):
    if item_id not in items:
        # 抛出 HTTP 异常
        raise HTTPException(
            status_code=404,
            detail=f"项目 {item_id} 不存在"
        )
    return {"item": items[item_id]}
```

### 后台任务

```python
from fastapi import FastAPI, BackgroundTasks

app = FastAPI()

def send_email(email: str, message: str):
    """模拟发送邮件（后台执行）"""
    print(f"发送邮件到 {email}: {message}")

@app.post("/send-notification")
async def send_notification(
    email: str,
    background_tasks: BackgroundTasks,
):
    """在后台发送邮件，不阻塞响应"""
    background_tasks.add_task(send_email, email, "欢迎注册")
    return {"message": "通知已加入后台队列"}
```

## 常见场景

### 完整的 CRUD API

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel

app = FastAPI()

# 数据模型
class ItemCreate(BaseModel):
    name: str
    description: str | None = None
    price: float

class ItemResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    price: float

# 模拟数据库
db: dict[int, dict] = {}
next_id = 1

@app.post("/items", response_model=ItemResponse, status_code=201)
async def create_item(item: ItemCreate):
    global next_id
    db[next_id] = {"id": next_id, **item.model_dump()}
    result = db[next_id]
    next_id += 1
    return result

@app.get("/items", response_model=list[ItemResponse])
async def list_items(skip: int = 0, limit: int = 10):
    return list(db.values())[skip:skip + limit]

@app.get("/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="项目不存在")
    return db[item_id]

@app.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, item: ItemCreate):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="项目不存在")
    db[item_id] = {"id": item_id, **item.model_dump()}
    return db[item_id]

@app.delete("/items/{item_id}")
async def delete_item(item_id: int):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="项目不存在")
    del db[item_id]
    return {"message": "已删除"}
```

## 注意事项与常见错误

### async 与同步函数

如果你的函数中调用了同步的阻塞操作（如同步数据库查询、requests 库），应该使用 def 而不是 async def。在 async def 中调用阻塞操作会阻塞整个事件循环。

### Pydantic v2 变化

FastAPI 0.100+ 使用 Pydantic v2，一些 API 有变化：

- model.dict() 改为 model.model_dump()
- model.parse_obj() 改为 model.model_validate()
- Config 类改为 model_config

### 路由顺序

路由的匹配是按定义顺序的。如果两个路由可能冲突，更具体的路由应该放在前面：

```python
# 正确：具体的路径在前
@app.get("/users/me")
async def get_current_user(): ...

@app.get("/users/{user_id}")
async def get_user(user_id: int): ...

# 错误：{user_id} 会匹配 "me"，导致 get_current_user 永远不会被调用
```

## 进阶用法

### 数据库集成

```python
from fastapi import FastAPI, Depends
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(100))

# 创建表
Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users")
async def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

### 生命周期事件

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 应用启动时执行
    print("应用启动")
    yield
    # 应用关闭时执行
    print("应用关闭")

app = FastAPI(lifespan=lifespan)
```

### APIRouter 分模块

```python
# routers/users.py
from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")
async def list_users():
    return [{"id": 1, "name": "张三"}]

@router.get("/{user_id}")
async def get_user(user_id: int):
    return {"id": user_id, "name": "张三"}
```

```python
# main.py
from fastapi import FastAPI
from routers.users import router as users_router

app = FastAPI()
app.include_router(users_router)
```

## 动手实践

练习一（预测题）：客户端 `POST /items` 提交 JSON `{"name": "扳手", "price": "12.5", "tags": null}`，路由签名如下。响应状态码与内容是什么？

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ItemIn(BaseModel):
    name: str
    price: float
    tags: list[str] = []

@app.post("/items", status_code=201)
async def create(item: ItemIn) -> ItemIn:
    return item
```

提示：Pydantic 会不会做类型强制转换？`tags: null` 与默认值的关系？

<details>
<summary>参考实现</summary>

返回 `201` 与 `{"name": "扳手", "price": 12.5, "tags": []}`。解析过程：`price` 收到字符串 `"12.5"`，Pydantic v2 在**严格模式关闭（默认）**下做类型强制转换转成 float 12.5——这是它区别于 dataclass「注解不校验」的核心能力；`tags` 收到 `null`，Optional 语义上 `None` 不等于「未提供」，但 v2 里 `list[str] = []` 对显式 null 会报验证错误吗？——实际行为：默认 lax 模式下 `None` 不能转成 list，会返回 `422` 与字段级错误 `tags: Input should be a valid list`。修正方式是把注解写成 `list[str] | None = []`（或 `Field(default_factory=list)` 并要求前端不传 null）。这道题的两个考点：v2 的强制转换边界（字符串数字可转、null 不可转 list）与 422 是 FastAPI 验证失败的统一出口（不是 400）。
</details>

练习二（实战题）：写一个「待办事项」API：内存字典当存储，路由 `GET /todos`、`POST /todos`、`DELETE /todos/{id}`；POST 用 Pydantic 模型校验（title 必填、1-50 字符），删除不存在的 id 返回 404（HTTPException）。写完用 TestClient 写三个测试（见 [Python 测试](/python/750-PythonTest)）。

提示：404 用 `raise HTTPException(status_code=404, detail=...)`；TestClient 从 `fastapi.testclient` 导入。

<details>
<summary>参考实现</summary>

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()
DB: dict[int, dict] = {}
_seq = 0

class TodoIn(BaseModel):
    title: str = Field(min_length=1, max_length=50)

def _new_id() -> int:
    global _seq
    _seq += 1
    return _seq

@app.post("/todos", status_code=201)
async def create(todo: TodoIn):
    tid = _new_id()
    DB[tid] = {"id": tid, **todo.model_dump()}
    return DB[tid]

@app.get("/todos")
async def list_all():
    return list(DB.values())

@app.delete("/todos/{tid}", status_code=204)
async def remove(tid: int):
    if tid not in DB:
        raise HTTPException(status_code=404, detail="todo 不存在")
    del DB[tid]

# tests
from fastapi.testclient import TestClient

def test_todo_crud():
    client = TestClient(app)
    resp = client.post("/todos", json={"title": "买牛奶"})
    assert resp.status_code == 201
    tid = resp.json()["id"]
    assert len(client.get("/todos").json()) == 1
    assert client.delete(f"/todos/{tid}").status_code == 204
    assert client.delete(f"/todos/{tid}").status_code == 404

def test_title_length_validated():
    client = TestClient(app)
    assert client.post("/todos", json={"title": ""}).status_code == 422
```

要点：`Field(min_length, max_length)` 是模型层的边界约束，非法输入在进入函数体之前就被 422 拦下——控制器里不再写防御性 if；404 用 HTTPException 表达「资源不存在」这一 HTTP 语义；TestClient 让三个用例毫秒级跑完（不启真实端口）。
</details>

练习三（实战题）：写一个依赖 `get_db_session()`（yield 一个假会话对象，请求结束后打印 "session closed"），并在两个路由中使用它；再用 `app.dependency_overrides` 在测试里替换成无副作用版本。

提示：yield 依赖的清理段在请求结束时执行（见 [上下文管理器](/python/520-ContextManager) 的同一机制）；override 写法 `app.dependency_overrides[get_db_session] = fake_session`。

<details>
<summary>参考实现</summary>

```python
from fastapi import FastAPI, Depends

app = FastAPI()

class FakeSession:
    def query(self, sql: str) -> list:
        return [{"id": 1}]

def get_db_session():
    session = FakeSession()
    try:
        yield session                    # yield 之前是进入，之后是清理
    finally:
        print("session closed")

@app.get("/users")
async def users(db=Depends(get_db_session)):
    return db.query("SELECT * FROM users")

# 测试：替换依赖，无输出无副作用
def fake_session_override():
    class Quiet:
        def query(self, sql): return []
    yield Quiet()

def test_users():
    app.dependency_overrides[get_db_session] = fake_session_override
    client = TestClient(app)
    assert client.get("/users").json() == [{"id": 1}]
    app.dependency_overrides.clear()     # 用完清掉，别污染其他测试
```

要点：yield 依赖等价于「每请求一个 with 上下文」——进入时构造、请求结束（含异常）走 finally；`dependency_overrides` 是 FastAPI 对测试替身的官方入口，替代在深层函数里 patch（patch 的取舍见 [unittest 与 mock](/python/755-UnittestAndMockStdlib)）——依赖注入良好的服务，测试几乎不需要 mock 库。
</details>

练习四（找错题）：这个中间件想给所有响应加耗时头，但每次请求都返回 500，先找再修：

```python
import time
from fastapi import FastAPI, Request

app = FastAPI()

@app.middleware("http")
async def timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.body += f"took={time.perf_counter() - start}".encode()
    return response
```

提示：改 body 之前，Content-Length 头还是旧的吗？能不能只加 header 不动 body？

<details>
<summary>参考实现</summary>

```python
@app.middleware("http")
async def timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.perf_counter() - start:.6f}"
    return response
```

两处问题：其一，`response.body += ...` 把响应体改长但 `Content-Length` 头没变——客户端按旧长度截断或按新长度等待，协议层直接错乱（ASGI 层对 body 的修改要在生成前做，普通 http 中间件里 body 已定型）；其二，耗时信息本质是**元数据**，放响应头（`X-Process-Time`）才是 HTTP 的正位——头部是可变的、body 定型，问题随之消失。若确需改 body，用 `response = JSONResponse(content=...)` 重新构造响应，或改用纯 ASGI 中间件在流层面拦截。
</details>

练习五（实战题）：把「路由拆分」做一遍：创建 `routers/orders.py`（含 APIRouter、两个路由），主应用 `include_router(prefix="/api/v1", tags=["orders"])`；再给整个 orders 路由加一个路由级依赖（校验请求头 `X-Client` 存在）。用 TestClient 验证缺头时 403。

提示：`APIRouter(dependencies=[Depends(check_client)])` 是路由级依赖的挂法；依赖抛 HTTPException 即可中断请求。

<details>
<summary>参考实现</summary>

```python
# routers/orders.py
from fastapi import APIRouter, Depends, Header, HTTPException

def check_client(x_client: str = Header(default="")):
    if x_client != "web":
        raise HTTPException(status_code=403, detail="非法客户端")

router = APIRouter(prefix="/orders", dependencies=[Depends(check_client)])

@router.get("")
async def list_orders():
    return [{"id": 1, "total": 9900}]

@router.get("/{oid}")
async def get_order(oid: int):
    return {"id": oid, "total": 9900}

# main.py
from fastapi import FastAPI
from routers.orders import router as orders_router

app = FastAPI()
app.include_router(orders_router, prefix="/api/v1", tags=["orders"])

# test
from fastapi.testclient import TestClient

def test_client_header_required():
    client = TestClient(app)
    assert client.get("/api/v1/orders").status_code == 403
    assert client.get("/api/v1/orders", headers={"X-Client": "web"}).status_code == 200
    assert client.get("/api/v1/orders/1", headers={"X-Client": "web"}).status_code == 200
```

要点：路由级 `dependencies=[...]` 对整个 router 生效——鉴权这类横切约束写一次，新增路由自动被覆盖，漏保护的「人因风险」随之消失；`prefix` 在 include 时拼接，最终路径 `/api/v1/orders/...`；`tags` 让 /docs 里分组展示。缺头请求返回 403 而不是 422：Header 参数带 `default=""` 时验证层放过、业务依赖里主动拒绝——「认证失败是权限问题，不是参数问题」。
</details>

## 自我检查

- 能解释 Pydantic 模型如何同时驱动验证、序列化与 /docs 三件事；
- 能说出验证失败返回 422 而字段强制转换（"12.5" 到 12.5）在默认 lax 模式下的边界；
- 能写一个 yield 依赖并用 `dependency_overrides` 在测试中替换它；
- 能解释为什么中间件里不能直接改 response.body，正确做法是加响应头；
- 能用 APIRouter 拆分路由并挂路由级依赖（鉴权收口）；
- 能说出 FastAPI 的异步路由与 [异步编程进阶](/python/670-AsyncProgrammingDetailed) 中事件循环的关系。
