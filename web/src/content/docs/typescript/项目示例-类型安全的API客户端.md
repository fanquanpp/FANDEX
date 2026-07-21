---
order: 110
tags:
  - typescript
  - project
difficulty: intermediate
title: 'TypeScript 项目示例：类型安全的 API 客户端'
module: typescript
category: 'TS Practice'
description: '综合运用泛型、装饰器与类型体操的类型安全 API 客户端。'
related:
  - typescript/tsconfig严格模式
  - typescript/装饰器标准实现
  - typescript/理论知识点
prerequisites:
  - typescript/语法速查
---

| 请求拦截器 | 请求前添加认证头、日志等       |
| ---------- | ------------------------------ |
| 响应拦截器 | 统一错误处理、响应转换         |
| 错误处理   | 类型化的错误类和错误处理链     |
| 请求取消   | AbortController 集成           |
| 重试机制   | 可配置的重试策略               |
| API 模块化 | 按资源分组的 API 方法定义      |
| 类型推断   | 自动推断响应类型，无需手动标注 |

## 需求分析

### 数据需求

- 支持常见 RESTful API 模式（GET/POST/PUT/DELETE）
- 请求参数和响应体有完整类型约束
- 支持分页、过滤、排序等查询参数

### 功能需求

- 泛型方法自动推断响应类型
- 拦截器链式调用
- 超时和重试配置
- 请求取消支持

### 非功能需求

- 零运行时依赖
- 编译后体积小
- 完整的类型导出

## 技术选型

| 技术点          | 选型           | 理由                   |
| --------------- | -------------- | ---------------------- |
| 泛型            | 多级泛型约束   | 请求/响应类型安全      |
| 接口            | API 定义接口   | 契约化设计             |
| 条件类型        | 响应类型推断   | 根据状态码推断不同响应 |
| 映射类型        | API 方法生成   | 减少重复代码           |
| fetch           | 原生 Fetch API | 现代浏览器原生支持     |
| AbortController | 请求取消       | 标准化的取消机制       |

## 完整代码

### 类型定义

```typescript
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: QueryParams;
  timeout?: number;
  signal?: AbortSignal;
  retry?: RetryConfig;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryOn?: number[];
}

export interface HttpClientConfig {
  baseURL: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeout?: number;
  defaultRetry?: RetryConfig;
  onRequest?: RequestInterceptor;
  onResponse?: ResponseInterceptor;
  onError?: ErrorInterceptor;
}

export type RequestInterceptor = (
  request: RequestInit & { url: string }
) => (RequestInit & { url: string }) | Promise<RequestInit & { url: string }>;

export type ResponseInterceptor = <T>(response: Response, data: T) => T | Promise<T>;

export type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### HTTP 客户端核心

```typescript
export class HttpClient {
  private config: Required<Pick<HttpClientConfig, 'baseURL'>> & Omit<HttpClientConfig, 'baseURL'>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: HttpClientConfig) {
    this.config = {
      defaultTimeout: 10000,
      defaultRetry: { maxRetries: 0, retryDelay: 1000 },
      ...config,
    };

    if (config.onRequest) this.requestInterceptors.push(config.onRequest);
    if (config.onResponse) this.responseInterceptors.push(config.onResponse);
    if (config.onError) this.errorInterceptors.push(config.onError);
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  private buildURL(path: string, params?: QueryParams): string {
    const url = new URL(path, this.config.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url.toString();
  }

  private async applyRequestInterceptors(
    request: RequestInit & { url: string }
  ): Promise<RequestInit & { url: string }> {
    let result = request;
    for (const interceptor of this.requestInterceptors) {
      result = await interceptor(result);
    }
    return result;
  }

  private async applyResponseInterceptors<T>(response: Response, data: T): Promise<T> {
    let result = data;
    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(response, result);
    }
    return result;
  }

  private async applyErrorInterceptors(error: ApiError): Promise<ApiError> {
    let result = error;
    for (const interceptor of this.errorInterceptors) {
      result = await interceptor(result);
    }
    return result;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    const retryConfig = config?.retry ?? this.config.defaultRetry;
    let lastError: ApiError | null = null;
    const maxAttempts = (retryConfig?.maxRetries ?? 0) + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          config?.timeout ?? this.config.defaultTimeout ?? 10000
        );

        if (config?.signal) {
          config.signal.addEventListener('abort', () => controller.abort());
        }

        let requestInit: RequestInit & { url: string } = {
          url: this.buildURL(path, config?.params),
          method,
          headers: {
            'Content-Type': 'application/json',
            ...this.config.defaultHeaders,
            ...config?.headers,
          },
          signal: controller.signal,
        };

        if (body !== undefined && method !== 'GET') {
          requestInit.body = JSON.stringify(body);
        }

        requestInit = await this.applyRequestInterceptors(requestInit);

        const { url, ...fetchOptions } = requestInit;
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorBody: unknown;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = await response.text();
          }

          const error = new ApiError(
            typeof errorBody === 'object' && errorBody !== null && 'message' in errorBody
              ? String((errorBody as { message: unknown }).message)
              : `HTTP ${response.status}`,
            response.status,
            typeof errorBody === 'object' && errorBody !== null && 'code' in errorBody
              ? String((errorBody as { code: unknown }).code)
              : undefined,
            errorBody
          );

          if (retryConfig?.retryOn?.includes(response.status) && attempt < maxAttempts) {
            lastError = error;
            await this.delay(retryConfig.retryDelay * attempt);
            continue;
          }

          throw await this.applyErrorInterceptors(error);
        }

        const data: T = await response.json();
        return await this.applyResponseInterceptors(response, data);
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        const apiError = new ApiError(
          error instanceof Error ? error.message : 'Unknown error',
          0,
          'NETWORK_ERROR'
        );

        if (attempt < maxAttempts) {
          lastError = apiError;
          await this.delay(retryConfig?.retryDelay ?? 1000 * attempt);
          continue;
        }

        throw await this.applyErrorInterceptors(apiError);
      }
    }

    throw await this.applyErrorInterceptors(
      lastError ?? new ApiError('Max retries exceeded', 0, 'MAX_RETRIES')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', path, undefined, config);
  }

  async post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', path, body, config);
  }

  async put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', path, body, config);
  }

  async patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PATCH', path, body, config);
  }

  async delete<T = void>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', path, undefined, config);
  }
}
```

### API 模块定义

```typescript
export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  avatar?: string;
}

export interface UserListParams extends PaginationParams, SortParams {
  search?: string;
  role?: 'admin' | 'user';
}

export interface Article {
  id: number;
  title: string;
  content: string;
  summary: string;
  author: Pick<User, 'id' | 'username' | 'avatar'>;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleRequest {
  title: string;
  content: string;
  summary?: string;
  tags?: string[];
  status?: 'draft' | 'published';
}

export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface ArticleListParams extends PaginationParams, SortParams {
  search?: string;
  status?: 'draft' | 'published' | 'archived';
  tag?: string;
  authorId?: number;
}

export class UserAPI {
  constructor(private client: HttpClient) {}

  list(params?: UserListParams): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.client.get<ApiResponse<PaginatedResponse<User>>>('/users', {
      params: params as QueryParams,
    });
  }

  getById(id: number): Promise<ApiResponse<User>> {
    return this.client.get<ApiResponse<User>>(`/users/${id}`);
  }

  create(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.client.post<ApiResponse<User>>('/users', data);
  }

  update(id: number, data: UpdateUserRequest): Promise<ApiResponse<User>> {
    return this.client.put<ApiResponse<User>>(`/users/${id}`, data);
  }

  delete(id: number): Promise<ApiResponse<void>> {
    return this.client.delete<ApiResponse<void>>(`/users/${id}`);
  }
}

export class ArticleAPI {
  constructor(private client: HttpClient) {}

  list(params?: ArticleListParams): Promise<ApiResponse<PaginatedResponse<Article>>> {
    return this.client.get<ApiResponse<PaginatedResponse<Article>>>('/articles', {
      params: params as QueryParams,
    });
  }

  getById(id: number): Promise<ApiResponse<Article>> {
    return this.client.get<ApiResponse<Article>>(`/articles/${id}`);
  }

  create(data: CreateArticleRequest): Promise<ApiResponse<Article>> {
    return this.client.post<ApiResponse<Article>>('/articles', data);
  }

  update(id: number, data: UpdateArticleRequest): Promise<ApiResponse<Article>> {
    return this.client.patch<ApiResponse<Article>>(`/articles/${id}`, data);
  }

  delete(id: number): Promise<ApiResponse<void>> {
    return this.client.delete<ApiResponse<void>>(`/articles/${id}`);
  }
}
```

### API 客户端门面

```typescript
export class ApiClient {
  readonly users: UserAPI;
  readonly articles: ArticleAPI;
  private httpClient: HttpClient;

  constructor(config: HttpClientConfig) {
    this.httpClient = new HttpClient(config);
    this.users = new UserAPI(this.httpClient);
    this.articles = new ArticleAPI(this.httpClient);
  }

  static create(baseURL: string, authToken?: string): ApiClient {
    return new ApiClient({
      baseURL,
      defaultHeaders: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      onRequest: (request) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          request.headers = {
            ...request.headers,
            Authorization: `Bearer ${token}`,
          };
        }
        return request;
      },
      onResponse: (_response, data) => {
        if (data && typeof data === 'object' && 'code' in data) {
          const apiResponse = data as ApiResponse;
          if (apiResponse.code !== 0 && apiResponse.code !== 200) {
            console.warn(`API warning: ${apiResponse.message}`);
          }
        }
        return data;
      },
      onError: (error) => {
        if (error.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return error;
      },
    });
  }

  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.httpClient.addRequestInterceptor(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.httpClient.addResponseInterceptor(interceptor);
  }
}
```

### 使用示例

```typescript
const api = ApiClient.create('https://api.example.com/v1');

async function demo() {
  try {
    const usersResult = await api.users.list({
      page: 1,
      pageSize: 10,
      role: 'admin',
    });
    console.log('Users:', usersResult.data.items);

    const newUser = await api.users.create({
      username: 'john',
      email: 'john@example.com',
      password: 'secure123',
    });
    console.log('Created user:', newUser.data);

    const articlesResult = await api.articles.list({
      page: 1,
      status: 'published',
      tag: 'typescript',
    });
    console.log('Articles:', articlesResult.data.items);

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const article = await api.articles.getById(42, { signal: controller.signal });
    console.log('Article:', article.data);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error [${error.status}]: ${error.message}`);
      if (error.code === 'NETWORK_ERROR') {
        console.error('Network error, please check your connection.');
      }
    }
  }
}
```

## 运行说明

### 安装依赖

```bash
npm install typescript --save-dev
```

### 编译

```bash
npx tsc --init
npx tsc
```

### tsconfig.json 关键配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "outDir": "./dist"
  }
}
```

## 扩展方向

1. **OpenAPI 生成** -- 从 Swagger/OpenAPI 规范自动生成类型定义
2. **缓存层** -- 基于 ETag/Last-Modified 的缓存策略
3. **请求去重** -- 相同请求合并，避免重复发送
4. **Mock 模式** -- 开发环境自动切换到 Mock 数据
5. **WebSocket** -- 扩展支持 WebSocket 实时通信
6. **上传下载** -- 文件上传/下载进度追踪
7. **GraphQL** -- 适配 GraphQL 查询

---

## 关键代码速查

### 泛型请求方法

```typescript
async request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(url, options);
  return response.json() as Promise<T>;
}
```

### 接口定义 API 契约

```typescript
interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}
interface User {
  id: number;
  username: string;
  email: string;
}
```

### 泛型 API 类

```typescript
class UserAPI {
  constructor(private client: HttpClient) {}
  list(params?: UserListParams): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.client.get('/users', { params });
  }
}
```

### 拦截器类型

```typescript
type RequestInterceptor = (
  req: RequestInit & { url: string }
) => (RequestInit & { url: string }) | Promise<RequestInit & { url: string }>;
```

### 错误类

```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}
```

### AbortController 取消

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
await api.users.list({}, { signal: controller.signal });
```
