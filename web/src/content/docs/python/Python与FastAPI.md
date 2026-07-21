---
order: 56
title: Python与FastAPI
module: python
category: Python
difficulty: intermediate
description: FastAPI框架
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与Docker
  - python/Python与OAuth2
  - python/Python与Redis
  - python/Python与Celery
prerequisites:
  - python/语法速查
---

## 什么是 FastAPI

FastAPI 是一个现代、高性能的 Python Web 框架，用于构建 API。它基于 Starlette（处理网络请求）和 Pydantic（数据验证），利用 Python 的类型注解实现自动的数据验证、序列化和 API 文档生成。

FastAPI 的性能接近 Go 和 Node.js，是 Python 中最快的 Web 框架之一。它的设计理念是让开发者在写代码的同时就完成数据验证和文档编写，减少重复劳动。

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
from typing import Optional

app = FastAPI()

@app.get("/items")
async def list_items(
    skip: int = 0,              # 有默认值的查询参数
    limit: int = 10,            # 有默认值的查询参数
    q: Optional[str] = None,    # 可选的查询参数
):
    return {"skip": skip, "limit": limit, "q": q}

# 请求示例：/items?skip=10&limit=20&q=python
```

### 请求体（Pydantic 模型）

```python
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

app = FastAPI()

# 定义请求体模型
class UserCreate(BaseModel):
    username: str
    email: EmailStr          # 自动验证邮箱格式
    password: str
    age: Optional[int] = None  # 可选字段

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

def common_parameters(q: Optional[str] = None, skip: int = 0, limit: int = 100):
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
from typing import Optional, List

app = FastAPI()

# 数据模型
class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
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

@app.get("/items", response_model=List[ItemResponse])
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
