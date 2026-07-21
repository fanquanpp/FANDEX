---
order: 88
title: 'Python与WebSocket-2'
module: python
category: Python
difficulty: advanced
description: WebSocket进阶与实时应用
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与WebSocket
  - python/Python与OAuth2
  - python/Python与向量数据库
  - python/并发编程
prerequisites:
  - python/语法速查
---

## 什么是 WebSocket 进阶

本文是"Python与WebSocket"的进阶篇，重点讲解 WebSocket 在生产环境中的实际应用，包括认证授权、连接管理、消息协议设计、与前端框架的配合等。如果你还没有了解 WebSocket 的基础知识，请先阅读"Python与WebSocket"。

## 基础概念

### WebSocket 认证

WebSocket 连接建立时是 HTTP 握手，因此可以在握手阶段进行认证。常见的认证方式有两种：一是在连接 URL 中携带 token 参数，二是在握手时的 HTTP 头中携带 Authorization。

### 消息协议

在复杂的实时应用中，WebSocket 传输的不仅仅是简单的文本消息，还需要定义消息格式和协议。常见的做法是使用 JSON 格式，包含消息类型、数据体等字段。

### 房间与频道

在聊天应用中，用户通常按"房间"或"频道"分组。同一房间内的消息只广播给该房间的成员。这需要在服务端维护房间与连接的映射关系。

### 心跳与重连

网络不稳定时 WebSocket 连接可能断开。客户端需要实现自动重连机制，服务端需要心跳检测来清理断开的连接。

## 快速上手

### 带认证的 WebSocket

```python
from fastapi import FastAPI, WebSocket, Query, WebSocketDisconnect
from jose import jwt, JWTError

app = FastAPI()

SECRET_KEY = "your-secret-key"

async def verify_token(token: str) -> dict | None:
    """验证 JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        return None

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)  # 从查询参数获取 token
):
    # 先验证 token
    payload = await verify_token(token)
    if not payload:
        # 认证失败，关闭连接
        await websocket.close(code=4001, reason="认证失败")
        return

    # 认证成功，接受连接
    await websocket.accept()

    username = payload.get("sub", "匿名")
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"[{username}] {data}")
    except WebSocketDisconnect:
        print(f"{username} 已断开")
```

客户端连接时携带 token：

```javascript
// JavaScript 客户端
const ws = new WebSocket('ws://localhost:8000/ws?token=your-jwt-token');
```

## 详细用法

### 完整的聊天室系统

```python
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from datetime import datetime

app = FastAPI()

class ChatRoom:
    """聊天室管理器"""

    def __init__(self):
        # 房间名 -> 成员列表
        self.rooms: dict[str, dict[str, WebSocket]] = {}

    async def join(self, room: str, username: str, websocket: WebSocket):
        """加入房间"""
        if room not in self.rooms:
            self.rooms[room] = {}
        self.rooms[room][username] = websocket
        # 通知房间内其他人
        await self.broadcast(room, {
            "type": "system",
            "message": f"{username} 加入了房间",
            "timestamp": datetime.now().isoformat()
        }, exclude=username)

    async def leave(self, room: str, username: str):
        """离开房间"""
        if room in self.rooms and username in self.rooms[room]:
            del self.rooms[room][username]
            if not self.rooms[room]:
                del self.rooms[room]
            else:
                await self.broadcast(room, {
                    "type": "system",
                    "message": f"{username} 离开了房间",
                    "timestamp": datetime.now().isoformat()
                })

    async def broadcast(self, room: str, message: dict, exclude: str = None):
        """向房间内所有人广播消息"""
        if room not in self.rooms:
            return
        raw = json.dumps(message, ensure_ascii=False)
        for username, ws in self.rooms[room].items():
            if username != exclude:
                try:
                    await ws.send_text(raw)
                except Exception:
                    # 发送失败，清理连接
                    del self.rooms[room][username]

    async def send_to_user(self, room: str, username: str, message: dict):
        """向房间内指定用户发送消息"""
        if room in self.rooms and username in self.rooms[room]:
            try:
                await self.rooms[room][username].send_text(
                    json.dumps(message, ensure_ascii=False)
                )
            except Exception:
                del self.rooms[room][username]

    def get_room_members(self, room: str) -> list[str]:
        """获取房间成员列表"""
        return list(self.rooms.get(room, {}).keys())

chat = ChatRoom()

@app.websocket("/ws/chat/{room}")
async def chat_endpoint(websocket: WebSocket, room: str, username: str = Query(...)):
    await websocket.accept()

    # 加入房间
    await chat.join(room, username, websocket)

    # 发送欢迎消息
    await chat.send_to_user(room, username, {
        "type": "welcome",
        "message": f"欢迎来到 {room} 房间",
        "members": chat.get_room_members(room)
    })

    try:
        while True:
            data = await websocket.receive_text()
            # 解析消息
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                msg = {"text": data}

            # 广播消息
            await chat.broadcast(room, {
                "type": "message",
                "username": username,
                "text": msg.get("text", ""),
                "timestamp": datetime.now().isoformat()
            })
    except WebSocketDisconnect:
        await chat.leave(room, username)
```

### 消息协议设计

在复杂应用中，需要定义统一的消息格式：

```python
import json
from enum import Enum
from dataclasses import dataclass, asdict
from datetime import datetime

class MessageType(str, Enum):
    """消息类型枚举"""
    CHAT = "chat"           # 聊天消息
    SYSTEM = "system"       # 系统消息
    JOIN = "join"           # 加入房间
    LEAVE = "leave"         # 离开房间
    TYPING = "typing"       # 正在输入
    READ = "read"           # 已读回执
    ERROR = "error"         # 错误消息

@dataclass
class Message:
    """统一的消息格式"""
    type: str               # 消息类型
    data: dict              # 消息数据
    timestamp: str = None   # 时间戳
    sender: str = None      # 发送者
    room: str = None        # 房间名

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

    def to_json(self) -> str:
        """序列化为 JSON"""
        return json.dumps(asdict(self), ensure_ascii=False)

    @classmethod
    def from_json(cls, raw: str) -> "Message":
        """从 JSON 反序列化"""
        data = json.loads(raw)
        return cls(**data)

# 使用示例
msg = Message(
    type=MessageType.CHAT,
    data={"text": "你好"},
    sender="张三",
    room="general"
)
print(msg.to_json())
```

### 心跳检测

```python
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}

    async def add(self, user_id: str, websocket: WebSocket):
        self.connections[user_id] = websocket

    def remove(self, user_id: str):
        self.connections.pop(user_id, None)

    async def heartbeat_check(self, interval: int = 30):
        """定期检查连接是否存活"""
        while True:
            await asyncio.sleep(interval)
            dead = []
            for user_id, ws in self.connections.items():
                try:
                    # 发送心跳 ping
                    await ws.send_json({"type": "ping"})
                except Exception:
                    dead.append(user_id)
            # 清理断开的连接
            for user_id in dead:
                self.remove(user_id)
                print(f"心跳超时，清理连接: {user_id}")

manager = ConnectionManager()

@app.on_event("startup")
async def startup():
    # 启动心跳检测任务
    asyncio.create_task(manager.heartbeat_check())

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    await manager.add(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            # 客户端回复 pong
            if msg.get("type") == "pong":
                continue
            # 处理其他消息...
    except WebSocketDisconnect:
        manager.remove(user_id)
```

### 前端 JavaScript 客户端

```javascript
class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnectInterval: 3000, // 重连间隔
      maxReconnectAttempts: 10, // 最大重连次数
      heartbeatInterval: 30000, // 心跳间隔
      ...options,
    };
    this.ws = null;
    this.reconnectAttempts = 0;
    this.handlers = {};
  }

  // 连接
  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket 已连接');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // 心跳响应
      if (data.type === 'pong') return;
      // 触发事件处理器
      if (this.handlers[data.type]) {
        this.handlers[data.type](data);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket 已断开');
      this.stopHeartbeat();
      this.tryReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket 错误', error);
    };
  }

  // 发送消息
  send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  // 注册事件处理器
  on(type, handler) {
    this.handlers[type] = handler;
  }

  // 心跳
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send('ping', {});
    }, this.options.heartbeatInterval);
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatTimer);
  }

  // 自动重连
  tryReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连');
      return;
    }
    setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`尝试重连 (${this.reconnectAttempts})...`);
      this.connect();
    }, this.options.reconnectInterval);
  }
}

// 使用
const client = new WebSocketClient('ws://localhost:8000/ws/chat/general?username=张三');
client.on('message', (data) => {
  console.log(`${data.username}: ${data.text}`);
});
client.on('system', (data) => {
  console.log(`[系统] ${data.message}`);
});
client.connect();
```

## 常见场景

### 实时协作编辑

```python
import asyncio
from fastapi import FastAPI, WebSocket

app = FastAPI()

# 文档状态
documents: dict[str, str] = {}
# 文档的编辑者
editors: dict[str, list[WebSocket]] = {}

@app.websocket("/ws/doc/{doc_id}")
async def doc_edit(websocket: WebSocket, doc_id: str):
    await websocket.accept()

    if doc_id not in editors:
        editors[doc_id] = []
    editors[doc_id].append(websocket)

    # 发送当前文档内容
    await websocket.send_json({
        "type": "init",
        "content": documents.get(doc_id, "")
    })

    try:
        while True:
            data = await websocket.receive_json()
            if data["type"] == "edit":
                # 更新文档
                documents[doc_id] = data["content"]
                # 通知其他编辑者
                for editor in editors[doc_id]:
                    if editor != websocket:
                        try:
                            await editor.send_json({
                                "type": "update",
                                "content": data["content"]
                            })
                        except Exception:
                            editors[doc_id].remove(editor)
    except Exception:
        editors[doc_id].remove(websocket)
```

### 实时通知系统

```python
import asyncio
import json
from fastapi import FastAPI, WebSocket

app = FastAPI()

# 用户 -> WebSocket 连接
user_connections: dict[int, WebSocket] = {}

@app.websocket("/ws/notifications/{user_id}")
async def notification_ws(websocket: WebSocket, user_id: int):
    await websocket.accept()
    user_connections[user_id] = websocket

    try:
        while True:
            # 保持连接，等待服务端推送
            await websocket.receive_text()
    except Exception:
        user_connections.pop(user_id, None)

async def send_notification(user_id: int, notification: dict):
    """向指定用户发送通知"""
    ws = user_connections.get(user_id)
    if ws:
        try:
            await ws.send_json(notification)
        except Exception:
            user_connections.pop(user_id, None)

# 在其他接口中触发通知
@app.post("/notify/{user_id}")
async def notify_user(user_id: int, message: str):
    await send_notification(user_id, {
        "type": "notification",
        "message": message
    })
    return {"status": "sent"}
```

## 注意事项与常见错误

### WebSocket 连接不是永久的

网络环境复杂，WebSocket 连接随时可能断开。客户端必须实现自动重连机制，服务端必须处理连接断开后的资源清理。

### 消息顺序不保证

在分布式环境中，消息的顺序可能无法保证。如果顺序很重要，需要在消息中添加序列号。

### 内存泄漏

如果断开的连接没有被正确清理，会导致内存泄漏。务必在异常处理中移除断开的连接。

### 并发安全

多个协程可能同时操作共享数据（如连接列表），需要注意并发安全。使用 asyncio 的锁或确保操作是原子的。

## 进阶用法

### 使用 Redis 实现跨进程通信

当应用运行多个进程时，不同进程的 WebSocket 连接无法直接通信。通过 Redis Pub/Sub 实现跨进程消息传递：

```python
import asyncio
import json
import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()
redis_client = redis.from_url("redis://localhost:6379")
local_connections: dict[str, WebSocket] = {}

async def redis_subscriber():
    """订阅 Redis 频道"""
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("ws_broadcast")
    async for message in pubsub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            target = data.get("target")
            if target and target in local_connections:
                try:
                    await local_connections[target].send_text(data["content"])
                except Exception:
                    del local_connections[target]

@app.on_event("startup")
async def startup():
    asyncio.create_task(redis_subscriber())

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    local_connections[user_id] = websocket

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            target = msg.get("target")
            if target:
                # 通过 Redis 发布消息（其他进程的连接也能收到）
                await redis_client.publish("ws_broadcast", json.dumps({
                    "target": target,
                    "content": data
                }))
    except WebSocketDisconnect:
        local_connections.pop(user_id, None)
```

### WebSocket 与 HTTP 长轮询降级

不是所有环境都支持 WebSocket。可以使用 Socket.IO 等库实现自动降级：

```bash
pip install python-socketio
```

```python
import socketio

sio = socketio.AsyncServer(async_mode='asgi')
app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    print(f"客户端连接: {sid}")

@sio.event
async def disconnect(sid):
    print(f"客户端断开: {sid}")

@sio.event
async def message(sid, data):
    # 广播消息
    await sio.emit('message', data)
```
