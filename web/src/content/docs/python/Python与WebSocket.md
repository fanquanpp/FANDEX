---
order: 78
title: Python与WebSocket
module: python
category: Python
difficulty: intermediate
description: WebSocket实时通信
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与消息队列
  - python/Python与gRPC
  - 'python/Python与CI-CD'
  - python/Python与性能优化
prerequisites:
  - python/语法速查
---

## 什么是 WebSocket

WebSocket 是一种在客户端和服务器之间建立持久双向通信的协议。传统的 HTTP 请求是单向的：客户端发请求，服务器返回响应，然后连接就断开了。如果服务器想主动给客户端推送数据，HTTP 做不到。

WebSocket 解决了这个问题。客户端和服务器通过一次 HTTP 握手建立连接后，双方可以随时互相发送数据，连接会一直保持，直到某一方主动关闭。这使得 WebSocket 特别适合实时聊天、在线协作、实时数据推送等场景。

## 基础概念

### 与 HTTP 的区别

HTTP 是请求-响应模式，每次通信都需要客户端先发起请求。WebSocket 在建立连接后，服务器可以主动向客户端推送数据，不需要客户端反复轮询。

### 连接生命周期

WebSocket 连接经历三个阶段：

- 握手：客户端发送 HTTP 请求，携带 Upgrade: websocket 头，服务器同意后升级协议
- 通信：双方通过连接自由发送文本或二进制消息
- 关闭：任一方发送关闭帧，连接断开

### 消息类型

WebSocket 支持两种消息类型：

- 文本消息：UTF-8 编码的字符串，常用于 JSON 数据
- 二进制消息：原始字节数据，常用于图片、音频等

## 快速上手

### 安装依赖

```bash
# 安装 FastAPI 和 uvicorn
pip install fastapi uvicorn

# 安装 WebSocket 客户端库（用于测试）
pip install websockets
```

### 最简单的 WebSocket 服务端

```python
# server.py - 最简单的 WebSocket 服务端
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # 接受客户端连接
    await websocket.accept()
    try:
        while True:
            # 接收客户端发来的文本消息
            data = await websocket.receive_text()
            # 把消息原样发回（Echo 服务）
            await websocket.send_text(f"Echo: {data}")
    except Exception:
        # 客户端断开连接时退出循环
        pass
```

运行服务：

```bash
uvicorn server:app --reload
```

### 最简单的 WebSocket 客户端

```python
# client.py - 最简单的 WebSocket 客户端
import asyncio
import websockets

async def main():
    # 连接到 WebSocket 服务端
    async with websockets.connect("ws://localhost:8000/ws") as ws:
        # 发送消息
        await ws.send("Hello, WebSocket!")
        # 接收回复
        response = await ws.recv()
        print(f"收到回复: {response}")

asyncio.run(main())
```

## 详细用法

### 处理连接和断开事件

在实际应用中，你需要知道客户端何时连接、何时断开，以便做相应的处理（如更新在线用户列表）：

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# 保存所有已连接的客户端
connected_clients = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # 接受连接
    await websocket.accept()
    # 将新客户端加入列表
    connected_clients.append(websocket)
    print(f"客户端已连接，当前在线: {len(connected_clients)}")

    try:
        while True:
            data = await websocket.receive_text()
            # 处理收到的消息
            await websocket.send_text(f"你发送了: {data}")
    except WebSocketDisconnect:
        # 客户端断开连接
        connected_clients.remove(websocket)
        print(f"客户端已断开，当前在线: {len(connected_clients)}")
```

### 广播消息

广播是指将一条消息发送给所有已连接的客户端，这是聊天室等场景的核心功能：

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# 在线客户端列表
clients = []

async def broadcast(message: str):
    """向所有客户端广播消息"""
    for client in clients:
        try:
            await client.send_text(message)
        except Exception:
            # 发送失败说明客户端已断开
            clients.remove(client)

@app.websocket("/ws/chat")
async def chat_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            # 将消息广播给所有人
            await broadcast(data)
    except WebSocketDisconnect:
        clients.remove(websocket)
        await broadcast("有人离开了聊天室")
```

### 发送和接收 JSON 数据

大多数实际应用中，WebSocket 传输的是结构化的 JSON 数据：

```python
import json
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            # 接收文本消息
            raw_data = await websocket.receive_text()
            # 解析 JSON
            data = json.loads(raw_data)

            # 根据消息类型做不同处理
            msg_type = data.get("type")

            if msg_type == "greeting":
                response = {
                    "type": "greeting_reply",
                    "message": f"你好, {data.get('name', '匿名')}!"
                }
            elif msg_type == "ping":
                response = {"type": "pong", "timestamp": data.get("timestamp")}
            else:
                response = {"type": "error", "message": "未知的消息类型"}

            # 发送 JSON 响应
            await websocket.send_text(json.dumps(response))
    except Exception:
        pass
```

客户端发送 JSON：

```python
import asyncio
import json
import websockets

async def main():
    async with websockets.connect("ws://localhost:8000/ws") as ws:
        # 发送 JSON 格式的消息
        message = {"type": "greeting", "name": "小明"}
        await ws.send(json.dumps(message))

        # 接收并解析 JSON 响应
        response = json.loads(await ws.recv())
        print(f"收到: {response}")

asyncio.run(main())
```

### 发送二进制数据

WebSocket 也支持发送二进制数据，适合传输图片、文件等：

```python
@app.websocket("/ws/binary")
async def binary_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            # 接收二进制数据
            data = await websocket.receive_bytes()

            # 处理二进制数据（例如图片缩略图）
            # 这里简单地把数据原样返回
            await websocket.send_bytes(data)
    except Exception:
        pass
```

### 使用 WebSocket 路径参数

你可以像普通路由一样在 WebSocket 路径中使用参数：

```python
@app.websocket("/ws/room/{room_id}")
async def room_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            # 消息属于哪个房间
            await websocket.send_text(f"[房间 {room_id}] {data}")
    except WebSocketDisconnect:
        pass
```

### 使用查询参数

客户端连接时可以通过查询参数传递信息（如用户名、token）：

```python
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)  # 从查询参数获取 token
):
    # 先验证 token
    user = verify_token(token)
    if not user:
        await websocket.close(code=4001, reason="认证失败")
        return

    await websocket.accept()
    # 正常通信...
```

客户端连接时带上查询参数：

```python
# 连接时在 URL 中带上 token
async with websockets.connect("ws://localhost:8000/ws?token=abc123") as ws:
    await ws.send("Hello")
```

## 常见场景

### 实时聊天应用

```python
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# 按房间分组的客户端字典
rooms: dict[str, list] = {}

@app.websocket("/ws/chat/{room_id}")
async def chat_room(websocket: WebSocket, room_id: str):
    await websocket.accept()

    # 初始化房间
    if room_id not in rooms:
        rooms[room_id] = []
    rooms[room_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            # 构建广播消息
            broadcast_msg = json.dumps({
                "user": msg.get("user", "匿名"),
                "text": msg.get("text", ""),
                "room": room_id
            })

            # 向房间内所有人广播
            for client in rooms[room_id]:
                try:
                    await client.send_text(broadcast_msg)
                except Exception:
                    rooms[room_id].remove(client)
    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)
        # 通知房间内其他人
        leave_msg = json.dumps({"system": True, "text": "有人离开了房间"})
        for client in rooms[room_id]:
            await client.send_text(leave_msg)
```

### 实时数据推送

服务器定时向客户端推送数据（如股票行情、系统监控）：

```python
import asyncio
import json
import random
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/ws/stock/{symbol}")
async def stock_price(websocket: WebSocket, symbol: str):
    await websocket.accept()

    try:
        while True:
            # 模拟实时股票价格
            price = round(random.uniform(100, 200), 2)
            change = round(random.uniform(-5, 5), 2)

            data = json.dumps({
                "symbol": symbol,
                "price": price,
                "change": change
            })

            await websocket.send_text(data)
            # 每秒推送一次
            await asyncio.sleep(1)
    except Exception:
        pass
```

### 进度通知

长时间运行的任务通过 WebSocket 实时报告进度：

```python
import asyncio
from fastapi import FastAPI, WebSocket

app = FastAPI()

async def long_running_task(websocket: WebSocket, task_id: str):
    """模拟一个耗时任务，逐步报告进度"""
    total_steps = 10
    for step in range(1, total_steps + 1):
        # 执行一步任务
        await asyncio.sleep(1)

        # 报告进度
        progress = int(step / total_steps * 100)
        await websocket.send_json({
            "task_id": task_id,
            "progress": progress,
            "status": "running" if progress < 100 else "completed"
        })

@app.websocket("/ws/task/{task_id}")
async def task_progress(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        await long_running_task(websocket, task_id)
    except Exception:
        pass
```

## 注意事项与常见错误

### 必须调用 accept()

在 FastAPI 中，WebSocket 处理函数的第一步必须是调用 `await websocket.accept()`，否则客户端无法建立连接。

### 处理断开连接

客户端可能随时断开连接（网络中断、用户关闭页面等），你的代码必须能正确处理这种情况。使用 try-except 捕获 WebSocketDisconnect 异常，清理资源。

### 不要在 WebSocket 中执行阻塞操作

WebSocket 处理函数是异步的，不要在其中执行阻塞的同步操作（如 time.sleep、同步数据库查询），否则会阻塞整个事件循环。使用 asyncio.sleep 替代 time.sleep。

### 连接数限制

每个 WebSocket 连接都会占用服务器资源。如果你的应用需要支持大量并发连接，需要注意：

- 使用负载均衡分散连接
- 设置心跳机制及时清理断开的连接
- 考虑使用专业的 WebSocket 服务（如 Redis Pub/Sub 做消息分发）

### 心跳保活

某些网络环境（如反向代理、防火墙）会自动关闭长时间空闲的连接。通过定期发送心跳消息来保持连接：

```python
import asyncio
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # 启动心跳任务
    async def heartbeat():
        while True:
            await asyncio.sleep(30)  # 每 30 秒发送一次心跳
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break

    heartbeat_task = asyncio.create_task(heartbeat())

    try:
        while True:
            data = await websocket.receive_text()
            # 处理消息...
    except Exception:
        pass
    finally:
        heartbeat_task.cancel()
```

## 进阶用法

### 使用连接管理器封装

对于复杂的应用，建议把连接管理逻辑封装到一个类中：

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List

class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        # 按组管理的连接字典
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group: str):
        """接受新连接并加入指定组"""
        await websocket.accept()
        if group not in self.active_connections:
            self.active_connections[group] = []
        self.active_connections[group].append(websocket)

    def disconnect(self, websocket: WebSocket, group: str):
        """断开连接并从组中移除"""
        if group in self.active_connections:
            self.active_connections[group].remove(websocket)
            if not self.active_connections[group]:
                del self.active_connections[group]

    async def broadcast(self, message: str, group: str):
        """向指定组的所有连接广播消息"""
        if group not in self.active_connections:
            return
        for connection in self.active_connections[group]:
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection, group)

    async def send_personal(self, message: str, websocket: WebSocket):
        """向单个连接发送消息"""
        try:
            await websocket.send_text(message)
        except Exception:
            pass

# 使用连接管理器
manager = ConnectionManager()
app = FastAPI()

@app.websocket("/ws/{group}")
async def websocket_endpoint(websocket: WebSocket, group: str):
    await manager.connect(websocket, group)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, group)
    except WebSocketDisconnect:
        manager.disconnect(websocket, group)
```

### 配合 Redis 实现跨进程通信

当你的应用运行多个进程时，不同进程的 WebSocket 连接无法直接通信。通过 Redis 的发布/订阅功能可以实现跨进程消息传递：

```python
import asyncio
import json
import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# Redis 客户端
redis_client = redis.from_url("redis://localhost:6379")

# 本进程的连接管理
local_connections: list[WebSocket] = []

async def redis_subscriber():
    """订阅 Redis 频道，接收其他进程的消息"""
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("chat_channel")
    async for message in pubsub.listen():
        if message["type"] == "message":
            data = message["data"].decode()
            # 向本进程的所有连接广播
            for ws in local_connections[:]:
                try:
                    await ws.send_text(data)
                except Exception:
                    local_connections.remove(ws)

# 应用启动时启动 Redis 订阅
@app.on_event("startup")
async def startup():
    asyncio.create_task(redis_subscriber())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    local_connections.append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            # 发布到 Redis，让所有进程都能收到
            await redis_client.publish("chat_channel", data)
    except WebSocketDisconnect:
        local_connections.remove(websocket)
```
