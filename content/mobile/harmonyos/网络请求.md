# 网络请求 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## HTTP 模块导入

**导入 @ohos.net.http 模块**
`import http from '@ohos.net.http'`
```typescript
import http from '@ohos.net.http';
```

**通过 NetworkKit 导入**
`import { http } from '@kit.NetworkKit'`
```typescript
import { http } from '@kit.NetworkKit';
```

**权限声明(module.json5)**
```json5
{
  module: {
    requestPermissions: [
      { name: 'ohos.permission.INTERNET' }
    ]
  }
}
```

---

## HTTP 请求对象

**创建请求对象**
`http.createHttp(): HttpRequest`
```typescript
const httpRequest = http.createHttp();
```

**销毁请求对象**
`httpRequest.destroy(): void`
```typescript
httpRequest.destroy();
```

**请求方法枚举**
`http.RequestMethod`
```typescript
enum RequestMethod {
  OPTIONS = 'OPTIONS',
  GET = 'GET',
  HEAD = 'HEAD',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  TRACE = 'TRACE',
  CONNECT = 'CONNECT'
}
```

---

## HTTP 请求 API

**发起请求(Promise)**
`httpRequest.request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>`
```typescript
const response = await httpRequest.request('https://api.example.com/data', {
  method: http.RequestMethod.GET,
  header: { 'Content-Type': 'application/json' },
  connectTimeout: 60000,
  readTimeout: 60000,
  expectDataType: http.HttpDataType.STRING,
  usingCache: true,
  priority: 0,
});
```

**发起请求(回调)**
`httpRequest.request(url: string, options: HttpRequestOptions, callback: AsyncCallback<HttpResponse>): void`
```typescript
httpRequest.request('https://api.example.com/data', {
  method: http.RequestMethod.GET,
  header: { 'Content-Type': 'application/json' }
}, (err, data) => {
  if (!err) {
    console.info(`响应码: ${data.responseCode}`);
    console.info(`响应体: ${data.result}`);
  }
  httpRequest.destroy();
});
```

---

## HttpRequestOptions 配置

**请求配置项**
```typescript
interface HttpRequestOptions {
  method?: http.RequestMethod;          // 请求方法,默认 GET
  header?: Object;                       // 请求头
  extraData?: string | Object | ArrayBuffer; // 请求体
  connectTimeout?: number;               // 连接超时(ms)
  readTimeout?: number;                  // 读取超时(ms)
  expectDataType?: http.HttpDataType;    // 期望数据类型
  usingCache?: boolean;                  // 是否使用缓存
  priority?: number;                     // 请求优先级
  usingProxy?: boolean;                  // 是否使用代理
}
```

**HttpDataType 枚举**
```typescript
enum HttpDataType {
  STRING = 0,
  OBJECT = 1,
  ARRAY_BUFFER = 2
}
```

---

## HttpResponse 响应

**响应对象结构**
```typescript
interface HttpResponse {
  responseCode: number;          // HTTP 状态码
  header: Object;                // 响应头
  cookies: string;               // 响应 Cookie
  result: string | Object | ArrayBuffer; // 响应体
  responseTime: number;          // 响应时间(ms)
  remoteTimings: Object;         // 远程时序信息
}
```

---

## GET 请求示例

**基础 GET 请求**
```typescript
async function getRequest(): Promise<void> {
  const httpRequest = http.createHttp();
  try {
    const response = await httpRequest.request('https://api.example.com/users', {
      method: http.RequestMethod.GET,
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token_value'
      },
      connectTimeout: 10000,
      readTimeout: 30000
    });
    if (response.responseCode === 200) {
      const data = JSON.parse(response.result as string);
      console.info(`数据: ${JSON.stringify(data)}`);
    }
  } finally {
    httpRequest.destroy();
  }
}
```

---

## POST 请求示例

**提交 JSON 数据**
```typescript
async function postRequest(): Promise<void> {
  const httpRequest = http.createHttp();
  try {
    const response = await httpRequest.request('https://api.example.com/login', {
      method: http.RequestMethod.POST,
      header: { 'Content-Type': 'application/json' },
      extraData: {
        username: 'admin',
        password: '123456'
      }
    });
    console.info(`响应码: ${response.responseCode}`);
  } finally {
    httpRequest.destroy();
  }
}
```

**上传文件**
```typescript
async function uploadFile(filePath: string): Promise<void> {
  const httpRequest = http.createHttp();
  try {
    const response = await httpRequest.request('https://api.example.com/upload', {
      method: http.RequestMethod.POST,
      header: { 'Content-Type': 'multipart/form-data' },
      extraData: { file: filePath }
    });
    console.info(`上传结果: ${response.responseCode}`);
  } finally {
    httpRequest.destroy();
  }
}
```

---

## 请求事件监听

**监听响应头事件**
`httpRequest.on('headersReceive', callback: (header: Object) => void): void`
```typescript
httpRequest.on('headersReceive', (header) => {
  console.info(`收到响应头: ${JSON.stringify(header)}`);
});
```

**取消监听响应头事件**
`httpRequest.off('headersReceive'): void`
```typescript
httpRequest.off('headersReceive');
```

---

## HTTP 请求封装

**HttpClient 封装**
```typescript
interface RequestConfig {
  url: string;
  method?: http.RequestMethod;
  data?: object;
  header?: object;
  timeout?: number;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

class HttpClient {
  private baseUrl: string = 'https://api.example.com';
  private token: string = '';

  setToken(token: string): void {
    this.token = token;
  }

  async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const httpRequest = http.createHttp();
    try {
      const header: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.header as Record<string, string>)
      };
      if (this.token) {
        header['Authorization'] = `Bearer ${this.token}`;
      }
      const response = await httpRequest.request(`${this.baseUrl}${config.url}`, {
        method: config.method || http.RequestMethod.GET,
        header: header,
        extraData: config.data,
        connectTimeout: config.timeout || 10000,
        readTimeout: config.timeout || 30000
      });
      if (response.responseCode === 200) {
        return JSON.parse(response.result as string) as ApiResponse<T>;
      } else if (response.responseCode === 401) {
        throw new Error('未授权,请重新登录');
      } else {
        throw new Error(`请求失败: ${response.responseCode}`);
      }
    } finally {
      httpRequest.destroy();
    }
  }

  async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: http.RequestMethod.GET });
  }

  async post<T>(url: string, data?: object): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: http.RequestMethod.POST, data });
  }

  async put<T>(url: string, data?: object): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: http.RequestMethod.PUT, data });
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: http.RequestMethod.DELETE });
  }
}
```

---

## 请求重试机制

**带重试的请求**
```typescript
async function requestWithRetry(url: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    const httpRequest = http.createHttp();
    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.GET,
        connectTimeout: 10000,
        readTimeout: 30000
      });
      if (response.responseCode === 200) {
        return response.result as string;
      }
      if (response.responseCode >= 500) {
        lastError = new Error(`服务器错误: ${response.responseCode}`);
        continue;
      }
      throw new Error(`请求失败: ${response.responseCode}`);
    } catch (error) {
      lastError = error as Error;
    } finally {
      httpRequest.destroy();
    }
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw lastError;
}
```

---

## WebSocket 模块

**导入 WebSocket 模块**
`import webSocket from '@ohos.net.webSocket'`
```typescript
import webSocket from '@ohos.net.webSocket';
```

**创建 WebSocket 实例**
`webSocket.createWebSocket(): WebSocket`
```typescript
const ws = webSocket.createWebSocket();
```

---

## WebSocket 连接 API

**建立连接**
`ws.connect(url: string, options?: WebSocketRequestOptions): Promise<boolean>`
```typescript
await ws.connect('wss://api.example.com/ws', {
  header: { 'Authorization': 'Bearer token' }
});
```

**发送消息**
`ws.send(data: string | ArrayBuffer): Promise<boolean>`
```typescript
await ws.send('Hello Server');
await ws.send(JSON.stringify({ type: 'ping' }));
```

**关闭连接**
`ws.close(options?: WebSocketCloseOptions): Promise<boolean>`
```typescript
await ws.close({
  code: 1000,
  reason: 'Normal closure'
});
```

---

## WebSocket 事件监听

**监听连接打开**
`ws.on('open', callback: (err: BusinessError, value: Object) => void): void`
```typescript
ws.on('open', (err, value) => {
  if (!err) {
    console.info('WebSocket 连接已建立');
  }
});
```

**监听消息接收**
`ws.on('message', callback: (err: BusinessError, value: string | ArrayBuffer) => void): void`
```typescript
ws.on('message', (err, value) => {
  if (!err) {
    console.info(`收到消息: ${value}`);
  }
});
```

**监听连接关闭**
`ws.on('close', callback: (err: BusinessError, value: WebSocketCloseOptions) => void): void`
```typescript
ws.on('close', (err, value) => {
  console.info(`连接关闭: code=${value.code}, reason=${value.reason}`);
});
```

**监听错误事件**
`ws.on('error', callback: (err: BusinessError) => void): void`
```typescript
ws.on('error', (err) => {
  console.error(`WebSocket 错误: ${JSON.stringify(err)}`);
});
```

