---
order: 87
title: Python与OAuth2
module: python
category: Python
difficulty: intermediate
description: OAuth2与JWT认证
author: fanquanpp
updated: '2026-06-14'
related:
  - python/并发编程
  - python/Python与数据库迁移
  - 'python/Python与WebSocket-2'
  - python/Python与向量数据库
prerequisites:
  - python/语法速查
---

## 什么是 OAuth2

OAuth2 是一个授权框架，允许用户在不暴露密码的情况下，让第三方应用访问用户在某平台上的资源。最常见的例子是"使用微信登录"或"使用 Google 登录"——你不需要在第三方网站上输入微信密码，而是跳转到微信授权页面，确认后第三方就能获取你的基本信息。

在 Python Web 开发中，OAuth2 主要用于两个方面：一是让用户通过第三方账号登录你的应用，二是保护你自己的 API 接口，确保只有经过授权的用户才能访问。

## 基础概念

### OAuth2 的四种授权模式

OAuth2 定义了四种授权方式，最常用的是前两种：

- 授权码模式（Authorization Code）：最安全、最常用的模式，适合有后端的 Web 应用。用户跳转到授权服务器登录，授权服务器返回一个授权码给应用后端，后端再用授权码换取令牌
- 密码模式（Password）：用户直接把用户名密码给应用，应用用密码换取令牌。只适合第一方应用（你自己的前端访问你自己的后端）
- 客户端凭证模式（Client Credentials）：应用用自己的凭证获取令牌，不涉及用户。适合服务间调用
- 隐式模式（Implicit）：已不推荐使用，存在安全风险

### JWT（JSON Web Token）

JWT 是一种令牌格式，由三部分组成：头部（Header）、载荷（Payload）、签名（Signature）。JWT 的优点是自包含——令牌本身就携带了用户信息，后端不需要每次都查数据库来验证令牌。

JWT 的工作流程：用户登录成功后，服务器生成一个 JWT 返回给客户端；客户端在后续请求的 Authorization 头中携带这个 JWT；服务器验证 JWT 的签名和有效期，从中提取用户信息。

### Access Token 与 Refresh Token

- Access Token：访问令牌，用于访问受保护的资源。有效期较短（如 30 分钟）
- Refresh Token：刷新令牌，用于获取新的 Access Token。有效期较长（如 7 天）。当 Access Token 过期时，用 Refresh Token 换取新的 Access Token，用户不需要重新登录

## 快速上手

### 安装依赖

```bash
# 安装 FastAPI 和 JWT 库
pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart
```

### 最简单的 JWT 认证

```python
from datetime import datetime, timedelta
from jose import jwt

# 密钥（生产环境中必须保密，从环境变量读取）
SECRET_KEY = "your-secret-key-keep-it-safe"
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = None):
    """创建 JWT 访问令牌"""
    to_encode = data.copy()
    # 设置过期时间
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    # 编码生成 JWT
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """解码并验证 JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.JWTError:
        return None

# 使用示例
token = create_access_token({"sub": "user123"})
print(f"生成的令牌: {token}")

payload = decode_access_token(token)
print(f"解码后的数据: {payload}")
```

### FastAPI 中的 OAuth2 密码模式

FastAPI 内置了 OAuth2 支持，可以快速实现密码模式的认证：

```python
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext

app = FastAPI()

# 配置
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 密码加密工具
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 令牌端点
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 模拟用户数据库
fake_users_db = {
    "alice": {
        "username": "alice",
        "hashed_password": pwd_context.hash("secret123"),
        "disabled": False,
    }
}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def authenticate_user(username: str, password: str):
    """验证用户"""
    user = fake_users_db.get(username)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    return user

def create_access_token(data: dict):
    """创建访问令牌"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# 登录接口：验证用户名密码，返回令牌
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

# 受保护的接口：需要令牌才能访问
@app.get("/me")
async def read_users_me(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="无效的令牌")
    return {"username": username}
```

## 详细用法

### 完整的用户认证系统

下面是一个更完整的认证系统，包含用户注册、登录、获取当前用户信息：

```python
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel

app = FastAPI()

# 配置
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 密码加密
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 用户模型
class User(BaseModel):
    username: str
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    username: str
    password: str

# 模拟数据库
users_db: dict[str, dict] = {}

def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_user(username: str) -> Optional[UserInDB]:
    """从数据库获取用户"""
    if username in users_db:
        return UserInDB(**users_db[username])
    return None

def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """验证用户身份"""
    user = get_user(username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """获取当前登录用户（依赖注入）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """获取当前活跃用户"""
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="用户已被禁用")
    return current_user

# 注册接口
@app.post("/register")
async def register(user: UserCreate):
    """用户注册"""
    if user.username in users_db:
        raise HTTPException(status_code=400, detail="用户名已存在")
    users_db[user.username] = {
        "username": user.username,
        "hashed_password": get_password_hash(user.password),
        "disabled": False,
    }
    return {"message": "注册成功"}

# 登录接口
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """用户登录，获取令牌"""
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

# 获取当前用户信息
@app.get("/me")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """获取当前登录用户的信息"""
    return current_user

# 受保护的资源
@app.get("/items")
async def read_items(current_user: User = Depends(get_current_active_user)):
    """获取受保护的资源列表"""
    return [{"item_id": 1, "owner": current_user.username}]
```

### 实现 Refresh Token

```python
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

app = FastAPI()

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 模拟存储 refresh token（生产环境用数据库或 Redis）
refresh_tokens_db: set[str] = set()

def create_tokens(username: str) -> dict:
    """同时创建 access token 和 refresh token"""
    # Access Token：有效期短
    access_expire = datetime.utcnow() + timedelta(minutes=30)
    access_token = jwt.encode(
        {"sub": username, "exp": access_expire, "type": "access"},
        SECRET_KEY, algorithm=ALGORITHM
    )

    # Refresh Token：有效期长
    refresh_expire = datetime.utcnow() + timedelta(days=7)
    refresh_token = jwt.encode(
        {"sub": username, "exp": refresh_expire, "type": "refresh"},
        SECRET_KEY, algorithm=ALGORITHM
    )

    # 存储 refresh token
    refresh_tokens_db.add(refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/refresh")
async def refresh_access_token(refresh_token: str):
    """用 refresh token 换取新的 access token"""
    # 检查 refresh token 是否有效
    if refresh_token not in refresh_tokens_db:
        raise HTTPException(status_code=401, detail="无效的 refresh token")

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        # 确保是 refresh token 而不是 access token
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="令牌类型错误")
        username = payload.get("sub")
    except JWTError:
        # refresh token 过期或无效，删除并要求重新登录
        refresh_tokens_db.discard(refresh_token)
        raise HTTPException(status_code=401, detail="refresh token 已过期，请重新登录")

    # 生成新的 access token
    new_access_expire = datetime.utcnow() + timedelta(minutes=30)
    new_access_token = jwt.encode(
        {"sub": username, "exp": new_access_expire, "type": "access"},
        SECRET_KEY, algorithm=ALGORITHM
    )

    return {"access_token": new_access_token, "token_type": "bearer"}

@app.post("/logout")
async def logout(refresh_token: str):
    """登出：删除 refresh token"""
    refresh_tokens_db.discard(refresh_token)
    return {"message": "已登出"}
```

### 权限控制（基于角色）

```python
from enum import Enum
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt

app = FastAPI()

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 定义角色
class Role(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

# 模拟用户数据（包含角色信息）
users_db = {
    "admin_user": {"username": "admin_user", "role": Role.ADMIN},
    "editor_user": {"username": "editor_user", "role": Role.EDITOR},
    "viewer_user": {"username": "viewer_user", "role": Role.VIEWER},
}

def require_role(*allowed_roles: Role):
    """创建一个依赖，检查用户是否有指定角色"""
    async def role_checker(token: str = Depends(oauth2_scheme)):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            user = users_db.get(username)
            if not user or user["role"] not in allowed_roles:
                raise HTTPException(status_code=403, detail="权限不足")
            return user
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="无效的令牌")
    return role_checker

# 只有管理员可以访问
@app.get("/admin/dashboard")
async def admin_dashboard(user = Depends(require_role(Role.ADMIN))):
    return {"message": f"欢迎，管理员 {user['username']}"}

# 管理员和编辑者可以访问
@app.get("/content/edit")
async def edit_content(user = Depends(require_role(Role.ADMIN, Role.EDITOR))):
    return {"message": f"编辑权限已确认，{user['username']}"}

# 所有登录用户可以访问
@app.get("/content/view")
async def view_content(user = Depends(require_role(Role.ADMIN, Role.EDITOR, Role.VIEWER))):
    return {"message": f"查看内容，{user['username']}"}
```

## 常见场景

### 第三方登录（GitHub OAuth2）

让用户通过 GitHub 账号登录你的应用：

```python
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse

app = FastAPI()

# GitHub OAuth2 配置
GITHUB_CLIENT_ID = "your-github-client-id"
GITHUB_CLIENT_SECRET = "your-github-client-secret"

@app.get("/auth/github")
async def github_login():
    """跳转到 GitHub 授权页面"""
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&scope=user:email"
    )
    return RedirectResponse(github_auth_url)

@app.get("/auth/github/callback")
async def github_callback(code: str):
    """GitHub 授权回调，用授权码换取令牌"""
    # 第一步：用授权码换取 access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"}
        )
        token_data = token_response.json()
        github_token = token_data.get("access_token")

        if not github_token:
            raise HTTPException(status_code=400, detail="GitHub 授权失败")

        # 第二步：用 GitHub 的 access token 获取用户信息
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {github_token}"}
        )
        github_user = user_response.json()

    # 第三步：在你的系统中创建或查找用户，生成你自己的 JWT
    # 这里简化处理，实际应该查找或创建数据库中的用户
    return {
        "username": github_user.get("login"),
        "name": github_user.get("name"),
        "avatar": github_user.get("avatar_url"),
    }
```

### API Key 认证

对于服务间调用或简单场景，可以使用 API Key 认证：

```python
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

app = FastAPI()

# API Key 列表（生产环境应存储在数据库中）
API_KEYS = {
    "key-abc-123": {"name": "服务A", "permissions": ["read"]},
    "key-def-456": {"name": "服务B", "permissions": ["read", "write"]},
}

# 定义 API Key 的获取方式
api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(api_key_header)):
    """验证 API Key"""
    if api_key not in API_KEYS:
        raise HTTPException(status_code=403, detail="无效的 API Key")
    return API_KEYS[api_key]

@app.get("/api/data")
async def get_data(client = Depends(verify_api_key)):
    """需要 API Key 的接口"""
    return {"data": "受保护的数据", "client": client["name"]}
```

## 注意事项与常见错误

### 密钥必须保密

SECRET_KEY 绝对不能硬编码在代码中，更不能提交到 Git 仓库。应该从环境变量读取：

```python
import os
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-fallback-key")
```

### JWT 不是加密

JWT 只是签名，不是加密。任何人都可以解码 JWT 的内容（头部和载荷是 Base64 编码，不是加密）。所以不要在 JWT 中存储敏感信息（如密码、身份证号）。

### 设置合理的过期时间

Access Token 的过期时间不宜太长（建议 15-30 分钟），太长会增加令牌泄露的风险。Refresh Token 可以设置较长的过期时间（7-30 天）。

### 使用 HTTPS

OAuth2 和 JWT 认证必须配合 HTTPS 使用。如果使用 HTTP，令牌可能被中间人截获。

### bcrypt 加密是慢的

passlib 的 bcrypt 加密是故意设计得很慢的（为了防止暴力破解），所以不要在性能敏感的路径上频繁调用密码验证。

## 进阶用法

### 使用 Authlib 实现完整的 OAuth2 服务端

Authlib 是一个功能完善的 OAuth2 库，支持所有 OAuth2 授权模式：

```bash
pip install authlib
```

```python
from authlib.integrations.starlette_client import OAuth
from fastapi import FastAPI, Request
from starlette.middleware.sessions import SessionMiddleware

app = FastAPI()
# Authlib 需要 session 中间件
app.add_middleware(SessionMiddleware, secret_key="some-secret")

# 配置 OAuth 客户端
oauth = OAuth()
oauth.register(
    name="google",
    client_id="your-google-client-id",
    client_secret="your-google-client-secret",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

@app.get("/auth/google")
async def google_login(request: Request):
    """跳转到 Google 登录页面"""
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/auth/google/callback")
async def google_callback(request: Request):
    """Google 登录回调"""
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo")
    return {"email": user_info["email"], "name": user_info["name"]}
```

### CORS 与认证

当前端和后端部署在不同域名时，需要配置 CORS 并确保浏览器能发送凭据：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.com"],  # 不要用 *
    allow_credentials=True,  # 允许发送 Cookie 和 Authorization 头
    allow_methods=["*"],
    allow_headers=["*"],
)
```
