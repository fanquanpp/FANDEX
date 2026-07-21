# 权限申请 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 权限声明配置

**module.json5 声明权限**
`"requestPermissions": [{ "name": ..., "reason": ..., "usedScene": ... }]`
```json
{
  "module": {
    "requestPermissions": [
      {
        "name": "ohos.permission.INTERNET",
        "reason": "$string:internet_reason",
        "usedScene": {
          "abilities": ["EntryAbility"],
          "when": "inuse"
        }
      },
      {
        "name": "ohos.permission.CAMERA",
        "reason": "$string:camera_reason",
        "usedScene": {
          "abilities": ["EntryAbility"],
          "when": "inuse"
        }
      }
    ]
  }
}
```

**requestPermissions 字段说明**
| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `name` | string | 是 | 权限名称,如 `ohos.permission.CAMERA` |
| `reason` | string | 否 | 申请原因的资源引用,如 `$string:camera_reason` |
| `usedScene` | object | 否 | 权限使用场景配置 |
| `usedScene.abilities` | Array<string> | 否 | 使用该权限的 Ability 名称列表 |
| `usedScene.when` | string | 否 | 使用时机:`inuse`(前台)/`always`(前后台) |

**usedScene.when 权限使用时机**
`"when": "<inuse | always>"`
```json
{
  "usedScene": {
    "abilities": ["EntryAbility"],
    "when": "inuse"
  }
}
```

**when 枚举值**
| 值 | 说明 |
| ---- | ---- |
| `inuse` | 前台使用:仅在 Ability 处于前台时需要该权限 |
| `always` | 前后台使用:Ability 在后台运行时也需要该权限 |

---

## 权限等级分类

**权限等级表**
| 等级 | 示例权限 | 授权方式 |
| ---- | ---- | ---- |
| `normal` | `ohos.permission.INTERNET`、`ohos.permission.GET_NETWORK_INFO`、`ohos.permission.GET_WIFI_INFO` | 安装时自动授予 |
| `system_basic` | `ohos.permission.CAMERA`、`ohos.permission.MICROPHONE`、`ohos.permission.LOCATION`、`ohos.permission.READ_MEDIA`、`ohos.permission.WRITE_MEDIA` | 运行时弹窗申请 |
| `system_core` | `ohos.permission.MANAGE_USERS`、`ohos.permission.REBOOT`、`ohos.permission.INSTALL_BUNDLE` | 仅系统应用可用 |

**常见权限列表**
```
// normal 级别(安装即授予)
ohos.permission.INTERNET                     // 网络访问
ohos.permission.GET_NETWORK_INFO             // 获取网络信息
ohos.permission.GET_WIFI_INFO                // 获取 WLAN 信息
ohos.permission.SET_WIFI_INFO                // 设置 WLAN 信息
ohos.permission.VIBRATE                      // 振动

// system_basic 级别(运行时申请)
ohos.permission.CAMERA                       // 相机
ohos.permission.MICROPHONE                   // 麦克风
ohos.permission.LOCATION                     // 精确位置
ohos.permission.APPROXIMATELY_LOCATION       // 模糊位置
ohos.permission.READ_MEDIA                   // 读取媒体文件
ohos.permission.WRITE_MEDIA                  // 写入媒体文件
ohos.permission.READ_CALENDAR                // 读取日历
ohos.permission.WRITE_CALENDAR               // 写入日历
ohos.permission.READ_CONTACTS                // 读取联系人
ohos.permission.WRITE_CONTACTS               // 写入联系人

// system_core 级别(仅系统应用)
ohos.permission.MANAGE_USERS                 // 管理用户
ohos.permission.REBOOT                       // 重启设备
ohos.permission.INSTALL_BUNDLE               // 安装应用
```

---

## 权限管理 API

**导入权限管理模块**
`import abilityAccessCtrl from '@ohos.abilityAccessCtrl';`
```typescript
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';
```

**创建权限管理器**
`abilityAccessCtrl.createAtManager(): AtManager`
```typescript
const atManager = abilityAccessCtrl.createAtManager();
```

---

## 权限检查 API

**检查权限授权状态**
`atManager.checkAccessToken(<tokenID: number>, <permissionName: string>): Promise<GrantStatus>`
```typescript
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';

const atManager = abilityAccessCtrl.createAtManager();
const tokenId = getContext(this).applicationInfo.accessTokenId;

const grantStatus = await atManager.checkAccessToken(
  tokenId,
  'ohos.permission.CAMERA'
);

if (grantStatus === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED) {
  console.info('相机权限已授予');
} else {
  console.info('相机权限未授予');
}
```

**批量检查权限**
`atManager.checkAccessToken(<tokenID: number>, <permissionName: string>): Promise<GrantStatus>`
```typescript
async function checkMultiplePermissions(): Promise<Record<string, boolean>> {
  const atManager = abilityAccessCtrl.createAtManager();
  const tokenId = getContext(this).applicationInfo.accessTokenId;

  const permissions = [
    'ohos.permission.CAMERA',
    'ohos.permission.MICROPHONE',
    'ohos.permission.LOCATION',
    'ohos.permission.READ_MEDIA',
  ];

  const result: Record<string, boolean> = {};

  for (const permission of permissions) {
    const status = await atManager.checkAccessToken(tokenId, permission);
    result[permission] = status === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED;
  }

  return result;
}
```

---

## GrantStatus 枚举

**GrantStatus 权限授权状态**
`abilityAccessCtrl.GrantStatus.<STATUS>`
```typescript
abilityAccessCtrl.GrantStatus.PERMISSION_DENIED     // 权限被拒绝 (-1)
abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED    // 权限已授予 (0)
```

---

## 权限请求 API

**请求单个权限**
`atManager.requestPermissionsFromUser(<context: Context>, <permList: Array<string>>): Promise<PermissionRequestResult>`
```typescript
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';

async function requestCameraPermission(context: Context): Promise<boolean> {
  const atManager = abilityAccessCtrl.createAtManager();

  try {
    const result = await atManager.requestPermissionsFromUser(context, [
      'ohos.permission.CAMERA',
    ]);

    if (result.authResults[0] === 0) {
      console.log('权限已授予');
      return true;
    } else {
      console.log('权限被拒绝');
      return false;
    }
  } catch (err) {
    console.error('申请权限失败:', err);
    return false;
  }
}
```

**批量请求权限**
`atManager.requestPermissionsFromUser(<context: Context>, <permList: Array<string>>): Promise<PermissionRequestResult>`
```typescript
async function requestMultiplePermissions(context: Context) {
  const atManager = abilityAccessCtrl.createAtManager();

  const permissions: string[] = [
    'ohos.permission.CAMERA',
    'ohos.permission.MICROPHONE',
    'ohos.permission.LOCATION',
    'ohos.permission.APPROXIMATELY_LOCATION',
  ];

  try {
    const result = await atManager.requestPermissionsFromUser(context, permissions);

    const granted: string[] = [];
    const denied: string[] = [];

    permissions.forEach((permission, index) => {
      if (result.authResults[index] === 0) {
        granted.push(permission);
      } else {
        denied.push(permission);
      }
    });

    console.info(`已授权: ${granted.join(', ')}`);
    console.info(`被拒绝: ${denied.join(', ')}`);

    return { granted, denied };
  } catch (error) {
    console.error(`权限请求失败: ${error}`);
    return { granted: [], denied: permissions };
  }
}
```

**PermissionRequestResult 返回结果**
`interface PermissionRequestResult { authResults: Array<number>, permissions: Array<string> }`
```typescript
interface PermissionRequestResult {
  authResults: Array<number>;     // 授权结果数组: 0=已授予, -1=被拒绝
  permissions: Array<string>;     // 请求的权限名称数组
}
```

**authResults 授权结果值**
| 值 | 说明 |
| ---- | ---- |
| `0` | 权限已授予(PERMISSION_GRANTED) |
| `-1` | 权限被拒绝(PERMISSION_DENIED) |
| `-2` | 权限被永久拒绝(用户勾选不再询问) |

---

## 权限请求 UI 控制

**请求权限时显示理由**
`atManager.requestPermissionsFromUser(<context>, <permList>, [<permissionsReasons>])`
```typescript
const result = await atManager.requestPermissionsFromUser(
  getContext(this),
  ['ohos.permission.CAMERA', 'ohos.permission.MICROPHONE'],
  [
    {
      code: 0,
      msg: '需要相机权限用于扫描二维码',
      permissions: ['ohos.permission.CAMERA'],
    },
    {
      code: 1,
      msg: '需要麦克风权限用于语音输入',
      permissions: ['ohos.permission.MICROPHONE'],
    },
  ]
);
```

---

## 完整权限申请示例

**先检查后申请的完整流程**
```typescript
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';

class PermissionHelper {
  private atManager: abilityAccessCtrl.AtManager;

  constructor() {
    this.atManager = abilityAccessCtrl.createAtManager();
  }

  // 检查单个权限
  async checkPermission(permission: string): Promise<boolean> {
    const tokenId = getContext(this).applicationInfo.accessTokenId;
    const status = await this.atManager.checkAccessToken(tokenId, permission);
    return status === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED;
  }

  // 请求单个权限(先检查,已授权则跳过)
  async ensurePermission(context: Context, permission: string): Promise<boolean> {
    const granted = await this.checkPermission(permission);
    if (granted) {
      return true;
    }

    const result = await this.atManager.requestPermissionsFromUser(
      context,
      [permission]
    );
    return result.authResults[0] === 0;
  }

  // 批量请求权限
  async ensurePermissions(
    context: Context,
    permissions: string[]
  ): Promise<Record<string, boolean>> {
    const needRequest: string[] = [];

    // 过滤已授权权限
    for (const permission of permissions) {
      const granted = await this.checkPermission(permission);
      if (!granted) {
        needRequest.push(permission);
      }
    }

    if (needRequest.length === 0) {
      const result: Record<string, boolean> = {};
      permissions.forEach((p) => (result[p] = true));
      return result;
    }

    // 请求未授权权限
    const result = await this.atManager.requestPermissionsFromUser(
      context,
      needRequest
    );

    const finalResult: Record<string, boolean> = {};
    permissions.forEach((permission) => {
      const index = needRequest.indexOf(permission);
      if (index === -1) {
        finalResult[permission] = true;
      } else {
        finalResult[permission] = result.authResults[index] === 0;
      }
    });

    return finalResult;
  }
}
```

**在 UIAbility 中使用**
```typescript
import UIAbility from '@ohos.app.ability.UIAbility';
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';
import window from '@ohos.window';

export default class EntryAbility extends UIAbility {
  async onWindowStageCreate(windowStage: window.WindowStage) {
    const atManager = abilityAccessCtrl.createAtManager();

    // 应用启动时申请必要权限
    const result = await atManager.requestPermissionsFromUser(this.context, [
      'ohos.permission.CAMERA',
      'ohos.permission.MICROPHONE',
      'ohos.permission.LOCATION',
    ]);

    const allGranted = result.authResults.every((r) => r === 0);
    if (allGranted) {
      console.info('所有权限已授予');
    } else {
      console.warn('部分权限被拒绝');
    }

    windowStage.loadContent('pages/Index');
  }
}
```

**在组件中使用**
```typescript
@Entry
@Component
struct CameraPage {
  @State hasPermission: boolean = false;

  async aboutToAppear() {
    await this.checkCameraPermission();
  }

  async checkCameraPermission() {
    const atManager = abilityAccessCtrl.createAtManager();
    const tokenId = getContext(this).applicationInfo.accessTokenId;

    const status = await atManager.checkAccessToken(
      tokenId,
      'ohos.permission.CAMERA'
    );
    this.hasPermission = status === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED;
  }

  async requestPermission() {
    const atManager = abilityAccessCtrl.createAtManager();
    const result = await atManager.requestPermissionsFromUser(getContext(this), [
      'ohos.permission.CAMERA',
    ]);
    this.hasPermission = result.authResults[0] === 0;
  }

  build() {
    Column({ space: 16 }) {
      if (this.hasPermission) {
        Text('相机权限已授予,可以开始拍照')
          .fontSize(16)
          .fontColor('#4CAF50')
        Button('开始拍照')
          .onClick(() => {
            // 启动相机
          })
      } else {
        Text('需要相机权限才能拍照')
          .fontSize(16)
          .fontColor('#F44336')
        Button('申请权限')
          .onClick(() => this.requestPermission())
      }
    }
    .padding(20)
  }
}
```
