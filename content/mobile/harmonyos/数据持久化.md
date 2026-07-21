# 数据持久化 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## Preferences 模块导入

**导入 preferences 模块**
`import dataPreferences from '@ohos.data.preferences'`
```typescript
import dataPreferences from '@ohos.data.preferences';
```

**通过 ArkData 导入**
`import { preferences } from '@kit.ArkData'`
```typescript
import { preferences } from '@kit.ArkData';
```

**支持的数据类型**
`preferences.ValueType`
```typescript
type ValueType = number | string | boolean | Array<number> | Array<string> | Array<boolean> | Uint8Array;
```

---

## Preferences API

**获取 Preferences 实例**
`preferences.getPreferences(context: Context, name: string): Promise<Preferences>`
```typescript
const prefs = await preferences.getPreferences(getContext(this), 'app_settings');
```

**写入数据**
`prefs.put(key: string, value: ValueType): Promise<void>`
```typescript
await prefs.put('username', '张三');
await prefs.put('fontSize', 16);
await prefs.put('notifications', true);
await prefs.put('tags', ['work', 'life']);
```

**刷写到磁盘**
`prefs.flush(): Promise<void>`
```typescript
await prefs.flush();
```

**读取数据**
`prefs.get(key: string, defaultValue: ValueType): Promise<ValueType>`
```typescript
const username = await prefs.get('username', '未设置') as string;
const fontSize = await prefs.get('fontSize', 14) as number;
const notifications = await prefs.get('notifications', true) as boolean;
```

**检查键是否存在**
`prefs.has(key: string): Promise<boolean>`
```typescript
const exists = await prefs.has('username');
```

**删除指定键**
`prefs.delete(key: string): Promise<void>`
```typescript
await prefs.delete('username');
await prefs.flush();
```

**清空所有数据**
`prefs.clear(): Promise<void>`
```typescript
await prefs.clear();
await prefs.flush();
```

**获取所有键**
`prefs.getAll(): Promise<Object>`
```typescript
const allData = await prefs.getAll();
```

---

## Preferences 数据变更监听

**注册监听**
`prefs.on('change', callback: (data: ChangeInfo) => void): void`
```typescript
prefs.on('change', (data: preferences.ChangeInfo) => {
  if (data.keys.includes('theme')) {
    console.info('主题已变更');
  }
});
```

**取消监听**
`prefs.off('change', callback?: (data: ChangeInfo) => void): void`
```typescript
prefs.off('change');
```

---

## Preferences 管理器封装

**PreferencesManager 封装**
```typescript
class PreferencesManager {
  private prefs: preferences.Preferences | null = null;

  async init(context: Context): Promise<void> {
    this.prefs = await preferences.getPreferences(context, 'my_app');
  }

  async putString(key: string, value: string): Promise<void> {
    if (this.prefs) {
      await this.prefs.put(key, value);
      await this.prefs.flush();
    }
  }

  async putNumber(key: string, value: number): Promise<void> {
    if (this.prefs) {
      await this.prefs.put(key, value);
      await this.prefs.flush();
    }
  }

  async putBoolean(key: string, value: boolean): Promise<void> {
    if (this.prefs) {
      await this.prefs.put(key, value);
      await this.prefs.flush();
    }
  }

  async getString(key: string, defaultValue: string = ''): Promise<string> {
    if (this.prefs) {
      return (await this.prefs.get(key, defaultValue)) as string;
    }
    return defaultValue;
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    if (this.prefs) {
      return (await this.prefs.get(key, defaultValue)) as number;
    }
    return defaultValue;
  }

  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    if (this.prefs) {
      return (await this.prefs.get(key, defaultValue)) as boolean;
    }
    return defaultValue;
  }

  async remove(key: string): Promise<void> {
    if (this.prefs) {
      await this.prefs.delete(key);
      await this.prefs.flush();
    }
  }

  async has(key: string): Promise<boolean> {
    if (this.prefs) {
      return await this.prefs.has(key);
    }
    return false;
  }

  async clear(): Promise<void> {
    if (this.prefs) {
      await this.prefs.clear();
      await this.prefs.flush();
    }
  }
}
```

---

## 关系型数据库 RDB 模块

**导入 relationalStore**
`import relationalStore from '@ohos.data.relationalStore'`
```typescript
import relationalStore from '@ohos.data.relationalStore';
```

**通过 ArkData 导入**
`import { relationalStore } from '@kit.ArkData'`
```typescript
import { relationalStore } from '@kit.ArkData';
```

---

## RDB 数据库配置

**StoreConfig 配置**
`relationalStore.StoreConfig`
```typescript
const STORE_CONFIG: relationalStore.StoreConfig = {
  name: 'AppDatabase.db',
  securityLevel: relationalStore.SecurityLevel.S1,
  encrypt: false
};
```

**安全级别枚举**
`relationalStore.SecurityLevel`
```typescript
enum SecurityLevel {
  S1 = 1,
  S2 = 2,
  S3 = 3,
  S4 = 4
}
```

**获取数据库实例**
`relationalStore.getRdbStore(context: Context, config: StoreConfig): Promise<RdbStore>`
```typescript
const store = await relationalStore.getRdbStore(getContext(this), STORE_CONFIG);
```

**删除数据库**
`relationalStore.deleteRdbStore(context: Context, name: string): Promise<void>`
```typescript
await relationalStore.deleteRdbStore(getContext(this), 'AppDatabase.db');
```

---

## RDB SQL 执行

**执行 SQL 语句**
`store.executeSql(sql: string): Promise<void>`
```typescript
await store.executeSql(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age INTEGER,
  email TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
)`);
```

**建表示例**
```typescript
const SQL_CREATE_CONTACTS = `CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
)`;
await store.executeSql(SQL_CREATE_CONTACTS);
```

---

## RDB 数据操作

**插入数据**
`store.insert(table: string, values: ValuesBucket): Promise<number>`
```typescript
const valueBucket: relationalStore.ValuesBucket = {
  name: '张三',
  phone: '13800138000',
  email: 'zhang@example.com'
};
const rowId = await store.insert('contacts', valueBucket);
```

**批量插入(带事务)**
```typescript
async function batchInsert(items: Array<relationalStore.ValuesBucket>): Promise<void> {
  try {
    store.beginTransaction();
    for (const item of items) {
      await store.insert('contacts', item);
    }
    store.commit();
  } catch (error) {
    store.rollBack();
    throw error;
  }
}
```

**查询数据**
`store.query(predicates: RdbPredicates, columns?: Array<string>): Promise<ResultSet>`
```typescript
const predicates = new relationalStore.RdbPredicates('contacts');
predicates.equalTo('name', '张三');
predicates.orderByDesc('id');
const resultSet = await store.query(predicates, ['id', 'name', 'phone', 'email']);
```

**更新数据**
`store.update(values: ValuesBucket, predicates: RdbPredicates): Promise<number>`
```typescript
const valueBucket: relationalStore.ValuesBucket = {
  name: '李四',
  phone: '13900139000'
};
const predicates = new relationalStore.RdbPredicates('contacts');
predicates.equalTo('id', 1);
const rowsAffected = await store.update(valueBucket, predicates);
```

**删除数据**
`store.delete(predicates: RdbPredicates): Promise<number>`
```typescript
const predicates = new relationalStore.RdbPredicates('contacts');
predicates.equalTo('id', 1);
const rowsAffected = await store.delete(predicates);
```

---

## RdbPredicates 条件构造

**等于条件**
`predicates.equalTo(field: string, value: ValueType): RdbPredicates`
```typescript
predicates.equalTo('id', 1);
```

**不等于条件**
`predicates.notEqualTo(field: string, value: ValueType): RdbPredicates`
```typescript
predicates.notEqualTo('status', 'deleted');
```

**大于/小于**
`predicates.greaterThan(field: string, value: ValueType): RdbPredicates`
`predicates.lessThan(field: string, value: ValueType): RdbPredicates`
`predicates.greaterThanOrEqualTo(field: string, value: ValueType): RdbPredicates`
`predicates.lessThanOrEqualTo(field: string, value: ValueType): RdbPredicates`
```typescript
predicates.greaterThan('age', 18);
predicates.lessThan('age', 60);
```

**模糊匹配**
`predicates.like(field: string, value: string): RdbPredicates`
```typescript
predicates.like('name', '%张%');
```

**范围条件**
`predicates.between(field: string, low: ValueType, high: ValueType): RdbPredicates`
```typescript
predicates.between('age', 18, 60);
```

**IN 条件**
`predicates.in(field: string, value: Array<ValueType>): RdbPredicates`
```typescript
predicates.in('id', [1, 2, 3, 5, 8]);
```

**排序**
`predicates.orderByAsc(field: string): RdbPredicates`
`predicates.orderByDesc(field: string): RdbPredicates`
```typescript
predicates.orderByDesc('created_at');
```

**分页**
`predicates.limit(count: number, offset: number): RdbPredicates`
```typescript
predicates.limit(10, 0);
predicates.limit(20, 20);
```

**分组**
`predicates.groupBy(fields: Array<string>): RdbPredicates`
```typescript
predicates.groupBy(['category']);
```

---

## ResultSet 结果集 API

**移动到下一行**
`resultSet.goToNextRow(): boolean`
```typescript
while (resultSet.goToNextRow()) {
  // 读取数据
}
```

**移动到第一行**
`resultSet.goToFirstRow(): boolean`
```typescript
resultSet.goToFirstRow();
```

**获取列索引**
`resultSet.getColumnIndex(columnName: string): number`
```typescript
const idIndex = resultSet.getColumnIndex('id');
const nameIndex = resultSet.getColumnIndex('name');
```

**获取字段值**
`resultSet.getLong(columnIndex: number): number`
`resultSet.getString(columnIndex: number): string`
`resultSet.getDouble(columnIndex: number): number`
`resultSet.getBlob(columnIndex: number): Uint8Array`
`resultSet.getBoolean(columnIndex: number): boolean`
```typescript
const id = resultSet.getLong(resultSet.getColumnIndex('id'));
const name = resultSet.getString(resultSet.getColumnIndex('name'));
const age = resultSet.getLong(resultSet.getColumnIndex('age'));
```

**获取列数与行数**
`resultSet.columnCount: number`
`resultSet.rowCount: number`
```typescript
const columns = resultSet.columnCount;
const rows = resultSet.rowCount;
```

**关闭结果集**
`resultSet.close(): void`
```typescript
resultSet.close();
```

---

## RDB 事务

**开启事务**
`store.beginTransaction(): void`
```typescript
store.beginTransaction();
```

**提交事务**
`store.commit(): void`
```typescript
store.commit();
```

**回滚事务**
`store.rollBack(): void`
```typescript
store.rollBack();
```

---

## RDB 加密

**创建加密数据库**
```typescript
const store = await relationalStore.getRdbStore(context, {
  name: 'secure.db',
  securityLevel: relationalStore.SecurityLevel.S3,
  encrypt: true
});
```

---

## 分布式 KV 存储

**导入 distributedKVStore**
`import distributedKVStore from '@ohos.data.distributedKVStore'`
```typescript
import distributedKVStore from '@ohos.data.distributedKVStore';
```

**KVStoreConfig 配置**
```typescript
const KV_CONFIG: distributedKVStore.KVStoreConfig = {
  bundleName: 'com.example.app',
  options: {
    createIfMissing: true,
    encrypt: false,
    backup: false,
    autoSync: true,
    kvStoreType: distributedKVStore.KVStoreType.SINGLE_VERSION,
    securityLevel: distributedKVStore.SecurityLevel.S1
  }
};
```

**创建 KVManager**
`distributedKVStore.createKVManager(config: KVStoreConfig): KVManager`
```typescript
const kvManager = distributedKVStore.createKVManager(KV_CONFIG);
```

**获取 KVStore**
`kvManager.getKVStore(storeId: string, options: KVStoreOptions): Promise<KVStore>`
```typescript
const kvStore = await kvManager.getKVStore('distributed_store', KV_CONFIG.options);
```

**写入数据**
`kvStore.put(key: string, value: ValueType): Promise<void>`
```typescript
await kvStore.put('sync_key', 'sync_value');
```

**读取数据**
`kvStore.get(key: string): Promise<ValueType>`
```typescript
const value = await kvStore.get('sync_key');
```

**删除数据**
`kvStore.delete(key: string): Promise<void>`
```typescript
await kvStore.delete('sync_key');
```

**监听数据变更**
`kvStore.on('dataChange', type: SubscribeType, callback: (data: ChangeNotification) => void): void`
```typescript
kvStore.on('dataChange', distributedKVStore.SubscribeType.SUBSCRIBE_TYPE_ALL, (data) => {
  console.info(`数据变更: ${JSON.stringify(data)}`);
});
```

