---
order: 4
title: 网络与数据持久化
module: harmonyos
category: 鸿蒙开发
difficulty: intermediate
description: 'HTTP 网络通信、WebSocket 长连接、数据持久化、分布式数据库、跨设备协同与数据同步。'
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/ArkTS与ArkUI
  - harmonyos/UI组件与动画
  - harmonyos/多媒体与设备能力
  - harmonyos/ArkTS语言特性
prerequisites: []
---

## 1. HTTP 网络通信

### 1.1 @ohos.net.http 模块

HarmonyOS 提供 `@ohos.net.http` 模块进行 HTTP 网络请求：

```typescript
import { http } from '@kit.NetworkKit';

// 权限声明（module.json5）
// "requestPermissions": [{ "name": "ohos.permission.INTERNET" }]
```

### 1.2 GET 请求

```typescript
import { http } from '@kit.NetworkKit';

function getRequest(): void {
  const httpRequest = http.createHttp();

  httpRequest.request(
    'https://api.example.com/users',
    {
      method: http.RequestMethod.GET,
      header: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_value',
      },
      connectTimeout: 60000,
      readTimeout: 60000,
    },
    (err, data) => {
      if (!err) {
        console.info(`响应状态码: ${data.responseCode}`);
        console.info(`响应头: ${JSON.stringify(data.header)}`);
        console.info(`响应体: ${data.result}`);
      } else {
        console.error(`请求失败: ${JSON.stringify(err)}`);
      }
      httpRequest.destroy(); // 释放资源
    }
  );
}
```

### 1.3 POST 请求

```typescript
import { http } from '@kit.NetworkKit';

function postRequest(): void {
  const httpRequest = http.createHttp();

  const requestData = {
    username: 'admin',
    password: '123456',
  };

  httpRequest.request(
    'https://api.example.com/login',
    {
      method: http.RequestMethod.POST,
      header: {
        'Content-Type': 'application/json',
      },
      extraData: requestData,
      connectTimeout: 60000,
      readTimeout: 60000,
    },
    (err, data) => {
      if (!err) {
        const result = JSON.parse(data.result as string);
        console.info(`登录结果: ${JSON.stringify(result)}`);
      } else {
        console.error(`登录失败: ${JSON.stringify(err)}`);
      }
      httpRequest.destroy();
    }
  );
}
```

### 1.4 封装网络请求工具

```typescript
// HttpUtil.ets
import { http } from '@kit.NetworkKit';

interface RequestConfig {
  url: string;
  method?: http.RequestMethod;
  data?: object;
  header?: object;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class HttpUtil {
  private static baseUrl: string = 'https://api.example.com';

  static async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const httpRequest = http.createHttp();

    try {
      const response = await httpRequest.request(`${this.baseUrl}${config.url}`, {
        method: config.method || http.RequestMethod.GET,
        header: {
          'Content-Type': 'application/json',
          ...config.header,
        },
        extraData: config.data,
        connectTimeout: 30000,
        readTimeout: 30000,
      });

      if (response.responseCode === 200) {
        return JSON.parse(response.result as string) as ApiResponse<T>;
      } else {
        throw new Error(`HTTP ${response.responseCode}`);
      }
    } finally {
      httpRequest.destroy();
    }
  }

  static get<T>(url: string, header?: object): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: http.RequestMethod.GET, header });
  }

  static post<T>(url: string, data?: object, header?: object): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: http.RequestMethod.POST, data, header });
  }

  static put<T>(url: string, data?: object, header?: object): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: http.RequestMethod.PUT, data, header });
  }

  static delete<T>(url: string, header?: object): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: http.RequestMethod.DELETE, header });
  }
}
```

### 1.5 在组件中使用

```typescript
interface UserInfo {
  id: number;
  name: string;
  email: string;
}

@Entry
@Component
struct NetworkDemo {
  @State userList: UserInfo[] = [];
  @State loading: boolean = false;

  async aboutToAppear() {
    await this.fetchUsers();
  }

  async fetchUsers() {
    this.loading = true;
    try {
      const response = await HttpUtil.get<UserInfo[]>('/users');
      if (response.code === 0) {
        this.userList = response.data;
      }
    } catch (error) {
      console.error(`获取用户列表失败: ${error}`);
    } finally {
      this.loading = false;
    }
  }

  build() {
    Column() {
      if (this.loading) {
        LoadingProgress()
          .width(48)
          .height(48)
          .color('#1a73e8')
      } else {
        List() {
          ForEach(this.userList, (user: UserInfo) => {
            ListItem() {
              Row() {
                Text(user.name).fontSize(16).layoutWeight(1)
                Text(user.email).fontSize(14).fontColor('#999999')
              }
              .padding(12)
            }
          })
        }
        .layoutWeight(1)
      }
    }
    .padding(16)
  }
}
```

## 2. WebSocket 长连接

### 2.1 创建 WebSocket 连接

```typescript
import { webSocket } from '@kit.NetworkKit';

class WebSocketManager {
  private ws: webSocket.WebSocket = webSocket.createWebSocket();
  private url: string = 'wss://api.example.com/ws';

  connect() {
    // 注册事件监听
    this.ws.on('open', (err, value) => {
      if (!err) {
        console.info('WebSocket 连接已建立');
        this.send({ type: 'ping' });
      }
    });

    this.ws.on('message', (err, value) => {
      if (!err) {
        const data = JSON.parse(value.data as string);
        console.info(`收到消息: ${JSON.stringify(data)}`);
        this.handleMessage(data);
      }
    });

    this.ws.on('close', (err, value) => {
      console.info(`WebSocket 关闭: code=${value.code}, reason=${value.reason}`);
      // 自动重连
      setTimeout(() => this.connect(), 3000);
    });

    this.ws.on('error', (err) => {
      console.error(`WebSocket 错误: ${JSON.stringify(err)}`);
    });

    // 建立连接
    this.ws.connect(this.url);
  }

  send(data: object) {
    this.ws.send(JSON.stringify(data));
  }

  close() {
    this.ws.close();
  }

  handleMessage(data: object) {
    // 处理业务消息
  }
}
```

## 3. 数据持久化

### 3.1 Preferences 轻量存储

适用于小量键值对数据（如用户设置、配置信息）：

```typescript
import { preferences } from '@kit.ArkData';

class PreferencesUtil {
  private static store: preferences.Preferences | null = null;

  // 初始化
  static async init(context: Context): Promise<void> {
    try {
      this.store = await preferences.getPreferences(context, 'app_settings');
    } catch (error) {
      console.error(`初始化 Preferences 失败: ${error}`);
    }
  }

  // 存储数据
  static async put(key: string, value: preferences.ValueType): Promise<void> {
    if (this.store) {
      await this.store.put(key, value);
      await this.store.flush(); // 持久化到磁盘
    }
  }

  // 读取数据
  static async get(
    key: string,
    defaultValue: preferences.ValueType
  ): Promise<preferences.ValueType> {
    if (this.store) {
      return await this.store.get(key, defaultValue);
    }
    return defaultValue;
  }

  // 删除数据
  static async delete(key: string): Promise<void> {
    if (this.store) {
      await this.store.delete(key);
      await this.store.flush();
    }
  }
}
```

### 3.2 在组件中使用 Preferences

```typescript
@Entry
@Component
struct PreferencesDemo {
  @State theme: string = 'light';
  @State fontSize: number = 16;

  async aboutToAppear() {
    await PreferencesUtil.init(getContext(this));
    this.theme = (await PreferencesUtil.get('theme', 'light')) as string;
    this.fontSize = (await PreferencesUtil.get('fontSize', 16)) as number;
  }

  build() {
    Column({ space: 16 }) {
      Text(`当前主题: ${this.theme}`)
        .fontSize(this.fontSize)

      Row({ space: 12 }) {
        Button('浅色')
          .onClick(async () => {
            this.theme = 'light';
            await PreferencesUtil.put('theme', 'light');
          })
        Button('深色')
          .onClick(async () => {
            this.theme = 'dark';
            await PreferencesUtil.put('theme', 'dark');
          })
      }

      Slider({
        value: this.fontSize,
        min: 12,
        max: 28,
        step: 2
      })
        .width('80%')
        .onChange(async (value: number) => {
          this.fontSize = value;
          await PreferencesUtil.put('fontSize', value);
        })
    }
    .padding(16)
  }
}
```

### 3.3 关系型数据库

适用于结构化数据存储：

```typescript
import { relationalStore } from '@kit.ArkData';

const STORE_CONFIG: relationalStore.StoreConfig = {
  name: 'AppDatabase.db',
  securityLevel: relationalStore.SecurityLevel.S1,
};

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`;

class DatabaseHelper {
  private store: relationalStore.RdbStore | null = null;

  async init(context: Context): Promise<void> {
    this.store = await relationalStore.getRdbStore(context, STORE_CONFIG);
    await this.store.executeSql(CREATE_TABLE_SQL);
  }

  // 插入数据
  async insertContact(name: string, phone: string, email?: string): Promise<number> {
    const valueBucket: relationalStore.ValuesBucket = {
      name,
      phone,
      email: email || null,
    };
    return await this.store!.insert('contacts', valueBucket);
  }

  // 查询数据
  async queryContacts(keyword?: string): Promise<relationalStore.ResultSet> {
    const predicates = new relationalStore.RdbPredicates('contacts');
    if (keyword) {
      predicates.like('name', `%${keyword}%`);
    }
    predicates.orderByDesc('created_at');
    return await this.store!.query(predicates, ['id', 'name', 'phone', 'email']);
  }

  // 更新数据
  async updateContact(id: number, name: string, phone: string): Promise<number> {
    const valueBucket: relationalStore.ValuesBucket = { name, phone };
    const predicates = new relationalStore.RdbPredicates('contacts');
    predicates.equalTo('id', id);
    return await this.store!.update(valueBucket, predicates);
  }

  // 删除数据
  async deleteContact(id: number): Promise<number> {
    const predicates = new relationalStore.RdbPredicates('contacts');
    predicates.equalTo('id', id);
    return await this.store!.delete(predicates);
  }
}
```

### 3.4 解析查询结果

```typescript
async function printContacts(resultSet: relationalStore.ResultSet): Promise<void> {
  const contacts: object[] = [];

  while (resultSet.goToNextRow()) {
    const id = resultSet.getLong(resultSet.getColumnIndex('id'));
    const name = resultSet.getString(resultSet.getColumnIndex('name'));
    const phone = resultSet.getString(resultSet.getColumnIndex('phone'));
    const email = resultSet.getString(resultSet.getColumnIndex('email'));
    contacts.push({ id, name, phone, email });
  }

  console.info(`查询结果: ${JSON.stringify(contacts)}`);
  resultSet.close(); // 记得关闭
}
```

## 4. 分布式数据库

### 4.1 概述

分布式数据服务（Distributed Data Service）支持多设备间的数据同步：

| 特性         | 说明                         |
| :----------- | :--------------------------- |
| **自动同步** | 数据变更自动同步到同账号设备 |
| **离线支持** | 本地优先，网络恢复后自动同步 |
| **冲突解决** | 支持自定义冲突解决策略       |

### 4.2 使用分布式 KV 存储

```typescript
import { distributedKVStore } from '@kit.ArkData';

const KV_CONFIG: distributedKVStore.KVStoreConfig = {
  bundleName: 'com.example.myapp',
  options: {
    createIfMissing: true,
    encrypt: false,
    backup: false,
    autoSync: true,
    kvStoreType: distributedKVStore.KVStoreType.SINGLE_VERSION,
    securityLevel: distributedKVStore.SecurityLevel.S1,
  },
};

async function initDistributedKV(context: Context) {
  const kvManager = distributedKVStore.createKVManager(KV_CONFIG);
  const kvStore = await kvManager.getKVStore('distributed_store', KV_CONFIG.options);

  // 写入数据
  await kvStore.put('sync_key', 'sync_value');

  // 读取数据
  const value = await kvStore.get('sync_key');
  console.info(`读取到: ${value}`);

  // 监听数据变更
  kvStore.on('dataChange', distributedKVStore.ChangeType.SUBSCRIBE_TYPE_ALL, (data) => {
    console.info(`数据变更: ${JSON.stringify(data)}`);
  });
}
```

## 5. 跨设备协同

### 5.1 设备发现与连接

```typescript
import { deviceManager } from '@kit.DistributedServiceKit';

class DeviceManager {
  private dmInstance: deviceManager.DeviceManager | null = null;

  async init() {
    this.dmInstance = deviceManager.createDeviceManager('com.example.myapp');

    // 监听设备发现
    this.dmInstance.on('deviceFound', (data) => {
      console.info(`发现设备: ${JSON.stringify(data)}`);
    });

    // 监听设备状态变化
    this.dmInstance.on('deviceStateChange', (data) => {
      console.info(`设备状态变化: ${JSON.stringify(data)}`);
    });
  }

  // 开始发现设备
  startDiscovery() {
    const subscribeInfo: deviceManager.SubscribeInfo = {
      subscribeId: 1,
      mode: deviceManager.DiscoverMode.DISCOVER_MODE_ACTIVE,
      medium: deviceManager.ExchangeMedium.AUTO,
      freq: deviceManager.ExchangeFreq.HIGH,
    };
    this.dmInstance?.startDeviceDiscovery(subscribeInfo);
  }

  // 停止发现
  stopDiscovery() {
    this.dmInstance?.stopDeviceDiscovery(1);
  }

  // 获取可信设备列表
  getTrustedDevices(): Array<deviceManager.DeviceInfo> {
    return this.dmInstance?.getTrustedDeviceListSync() || [];
  }
}
```

### 5.2 分布式能力迁移

```typescript
// 在 UIAbility 中实现迁移
import { UIAbility, AbilityConstant, Want } from '@kit.AbilityKit';
import { distributedMissionManager } from '@kit.MissionKit';

export default class MigrationAbility extends UIAbility {
  // 保存迁移数据
  onContinue(wantParam: Record<string, Object>): AbilityConstant.OnContinueResult {
    wantParam['userData'] = JSON.stringify({
      currentPage: 'detail',
      itemId: 12345,
    });
    return AbilityConstant.OnContinueResult.AGREE;
  }

  // 恢复迁移数据
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    if (launchParam.launchReason === AbilityConstant.LaunchReason.CONTINUATION) {
      const userData = JSON.parse((want.parameters?.userData as string) || '{}');
      console.info(`恢复页面: ${userData.currentPage}`);
    }
  }
}
```

## 6. 数据同步策略

| 策略         | 适用场景           | 实现方式                 |
| :----------- | :----------------- | :----------------------- |
| **实时同步** | 即时通讯、协作编辑 | WebSocket + 分布式 KV    |
| **定时同步** | 配置信息、离线数据 | 后台任务 + HTTP          |
| **按需同步** | 大文件、媒体资源   | 用户触发 + HTTP 断点续传 |
| **增量同步** | 数据库记录变更     | 时间戳 + 关系型数据库    |
| **冲突解决** | 多设备同时修改     | 版本号 + 自定义合并逻辑  |
