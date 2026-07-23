# 通知与权限 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 通知管理 API

**导入通知模块**
`import notificationManager from '@ohos.notificationManager';`
```typescript
import notificationManager from '@ohos.notificationManager';
```

**发布基本文本通知**
`notificationManager.publish(<request: NotificationRequest>): Promise<void>`
```typescript
const request: notificationManager.NotificationRequest = {
  id: 1,
  content: {
    contentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
    normal: {
      title: '消息提醒',
      text: '您有一条新消息',
    },
  },
};

notificationManager
  .publish(request)
  .then(() => {
    console.info('通知发送成功');
  })
  .catch((error: Error) => {
    console.error(`通知发送失败: ${error.message}`);
  });
```

**发布长文本通知**
`notificationManager.publish(<request: NotificationRequest>): Promise<void>`
```typescript
const request: notificationManager.NotificationRequest = {
  id: 2,
  content: {
    contentType: notificationManager.ContentType.NOTIFICATION_CONTENT_LONG_TEXT,
    longText: {
      title: '系统更新',
      text: '点击查看详情',
      longText: '本次更新包含多项性能优化和安全修复,建议所有用户尽快升级。',
      briefText: '系统更新可用',
    },
  },
};

notificationManager.publish(request);
```

**发布多行文本通知**
`notificationManager.publish(<request: NotificationRequest>): Promise<void>`
```typescript
const request: notificationManager.NotificationRequest = {
  id: 3,
  content: {
    contentType: notificationManager.ContentType.NOTIFICATION_CONTENT_MULTILINE,
    multiLine: {
      title: '待办事项',
      text: '今日待办',
      briefText: '3项待办',
      lines: ['上午10:00 项目会议', '下午2:00 代码评审', '下午5:00 提交周报'],
    },
  },
};

notificationManager.publish(request);
```

**发布图片通知**
`notificationManager.publish(<request: NotificationRequest>): Promise<void>`
```typescript
const request: notificationManager.NotificationRequest = {
  id: 4,
  content: {
    contentType: notificationManager.ContentType.NOTIFICATION_CONTENT_PICTURE,
    picture: {
      title: '图片消息',
      text: '查看图片',
      expandedTitle: '图片详情',
      briefText: '图片通知',
      picture: {
        bundleName: 'com.example.app',
        moduleName: 'entry',
        abilityName: 'EntryAbility',
        src: '/resources/base/media/pic.png',
      },
    },
  },
};

notificationManager.publish(request);
```

**取消指定通知**
`notificationManager.cancel(<id: number>, [<label: string>]): Promise<void>`
```typescript
await notificationManager.cancel(1);
await notificationManager.cancel(2, 'label_name');
```

**取消所有通知**
`notificationManager.cancelAll(): Promise<void>`
```typescript
await notificationManager.cancelAll();
```

**获取通知槽**
`notificationManager.getSlot(<slotType: SlotType>): Promise<NotificationSlot>`
```typescript
const slot = await notificationManager.getSlot(
  notificationManager.SlotType.SOCIAL_COMMUNICATION
);
console.info(`通知槽级别: ${slot.level}`);
```

---

## ContentType 枚举

**ContentType 通知内容类型**
`notificationManager.ContentType.<TYPE>`
```typescript
notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT      // 基本文本
notificationManager.ContentType.NOTIFICATION_CONTENT_LONG_TEXT       // 长文本
notificationManager.ContentType.NOTIFICATION_CONTENT_MULTILINE       // 多行文本
notificationManager.ContentType.NOTIFICATION_CONTENT_PICTURE         // 图片
```

---

## NotificationRequest 对象

**NotificationRequest 通知请求结构**
`const request: notificationManager.NotificationRequest = { ... }`
```typescript
const request: notificationManager.NotificationRequest = {
  id: 100,                              // 通知 ID
  slotType: notificationManager.SlotType.SOCIAL_COMMUNICATION,  // 通知槽类型
  isOngoing: false,                     // 是否进行中通知(不可滑动删除)
  isUnremovable: false,                 // 是否不可移除
  smallIcon: $r('app.media.icon'),      // 小图标
  largeIcon: $r('app.media.large'),     // 大图标
  wantAgent: pendingWantAgent,          // 点击意图
  template: {                           // 通知模板
    name: 'downloadTemplate',
    data: {
      progressValue: '50',
      progressMaxValue: '100',
    },
  },
  content: {
    contentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
    normal: {
      title: '标题',
      text: '内容',
      additionalText: '附加文本',
    },
  },
};
```

---

## NotificationSlot 通知槽

**创建通知槽**
`notificationManager.addSlot(<slot: NotificationSlot>): Promise<void>`
```typescript
const slot: notificationManager.NotificationSlot = {
  type: notificationManager.SlotType.SOCIAL_COMMUNICATION,
  level: notificationManager.SlotLevel.LEVEL_HIGH,
  desc: '社交消息通知',
  sound: '',                              // 空字符串使用默认声音
  vibrationValues: [100, 200, 100, 200],  // 振动模式(毫秒)
  badgeFlag: true,                        // 是否显示角标
  bannerFlag: true,                       // 是否显示横幅
  lightEnabled: true,                     // 是否启用呼吸灯
  lightColor: 0xFFFF0000,                 // 呼吸灯颜色
};

await notificationManager.addSlot(slot);
```

**删除通知槽**
`notificationManager.removeSlot(<slotType: SlotType>): Promise<void>`
```typescript
await notificationManager.removeSlot(
  notificationManager.SlotType.SOCIAL_COMMUNICATION
);
```

**获取所有通知槽**
`notificationManager.getSlots(): Promise<Array<NotificationSlot>>`
```typescript
const slots = await notificationManager.getSlots();
slots.forEach((slot) => {
  console.info(`类型: ${slot.type}, 级别: ${slot.level}`);
});
```

---

## SlotType 枚举

**SlotType 通知槽类型**
`notificationManager.SlotType.<TYPE>`
```typescript
notificationManager.SlotType.UNKNOWN_TYPE             // 未知类型
notificationManager.SlotType.SOCIAL_COMMUNICATION     // 社交通信
notificationManager.SlotType.SERVICE_INFORMATION      // 服务信息
notificationManager.SlotType.CONTENT_INFORMATION      // 内容信息
notificationManager.SlotType.LIVE_VIEW                // 实时视图
notificationManager.SlotType.CUSTOMER_SERVICE         // 客服消息
notificationManager.SlotType.OTHER_TYPES              // 其他类型
```

---

## SlotLevel 枚举

**SlotLevel 通知槽级别**
`notificationManager.SlotLevel.<LEVEL>`
```typescript
notificationManager.SlotLevel.LEVEL_NONE       // 无(不显示通知)
notificationManager.SlotLevel.LEVEL_MIN        // 最低级别(无提示)
notificationManager.SlotLevel.LEVEL_LOW        // 低级别(状态栏小图标)
notificationManager.SlotLevel.LEVEL_DEFAULT    // 默认级别(状态栏 + 通知栏)
notificationManager.SlotLevel.LEVEL_HIGH       // 高级别(横幅 + 通知栏)
```

---

## 进度通知

**下载进度通知**
`notificationManager.publish(<request: NotificationRequest>): Promise<void>`
```typescript
function sendProgressNotification(currentProgress: number) {
  const isOngoing = currentProgress < 100;

  const request: notificationManager.NotificationRequest = {
    id: 100,
    isOngoing: isOngoing,           // 进行中通知不可滑动删除
    isUnremovable: isOngoing,
    content: {
      contentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
      normal: {
        title: '文件下载',
        text: isOngoing ? `正在下载 ${currentProgress}%` : '下载完成',
      },
    },
  };

  // 设置进度条模板
  if (isOngoing) {
    request.template = {
      name: 'downloadTemplate',
      data: {
        progressValue: currentProgress.toString(),
        progressMaxValue: '100',
      },
    };
  }

  notificationManager.publish(request);
}
```

---

## 通知点击跳转

**创建 WantAgent 意图**
`wantAgent.getWantAgent(<info: WantAgentInfo>): Promise<WantAgent>`
```typescript
import wantAgent from '@ohos.app.ability.wantAgent';

const wantAgentInfo: wantAgent.WantAgentInfo = {
  wants: [
    {
      bundleName: 'com.example.app',
      abilityName: 'DetailAbility',
      parameters: {
        id: '123',
      },
    },
  ],
  operationType: wantAgent.OperationType.START_ABILITY,
  requestCode: 0,
  wantAgentFlags: [wantAgent.WantAgentFlags.CONSTANT_FLAG],
};

const pendingWantAgent = await wantAgent.getWantAgent(wantAgentInfo);

const request: notificationManager.NotificationRequest = {
  id: 200,
  wantAgent: pendingWantAgent,
  content: {
    contentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
    normal: {
      title: '订单通知',
      text: '您的订单已发货,点击查看详情',
    },
  },
};

notificationManager.publish(request);
```

**OperationType 意图类型枚举**
`wantAgent.OperationType.<TYPE>`
```typescript
wantAgent.OperationType.UNKNOWN_TYPE              // 未知类型
wantAgent.OperationType.START_ABILITY             // 启动 Ability
wantAgent.OperationType.START_ABILITIES           // 启动多个 Ability
wantAgent.OperationType.START_SERVICE             // 启动服务
wantAgent.OperationType.SEND_COMMON_EVENT         // 发送公共事件
```

**WantAgentFlags 意图标志枚举**
`wantAgent.WantAgentFlags.<FLAG>`
```typescript
wantAgent.WantAgentFlags.CONSTANT_FLAG            // 常量标志
wantAgent.WantAgentFlags.UPDATE_PRESENT_FLAG      // 更新当前意图
wantAgent.WantAgentFlags.READ_ONLY_FLAG           // 只读标志
wantAgent.WantAgentFlags.ONLY_ONE_WANT_AGENT_FLAG // 仅一个意图
```

---

## 通知组管理

**设置通知组**
`notificationManager.publish(<request with groupKey>): Promise<void>`
```typescript
const request: notificationManager.NotificationRequest = {
  id: 301,
  groupName: '消息组',           // 通知组名称
  groupKey: 'message_group',     // 通知组键
  content: {
    contentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
    normal: {
      title: '消息 1',
      text: '内容 1',
    },
  },
};

notificationManager.publish(request);
```

---

## 权限管理 API

**导入权限模块**
`import abilityAccessCtrl from '@ohos.abilityAccessCtrl';`
```typescript
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';
```

**创建权限管理器**
`abilityAccessCtrl.createAtManager(): AtManager`
```typescript
const atManager = abilityAccessCtrl.createAtManager();
```

**检查权限授权状态**
`atManager.checkAccessToken(<tokenID: number>, <permissionName: string>): Promise<GrantStatus>`
```typescript
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

**请求单个权限**
`atManager.requestPermissionsFromUser(<context: Context>, <permList: Array<string>>): Promise<PermissionRequestResult>`
```typescript
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

## 权限声明配置

**module.json5 权限声明**
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
      },
      {
        "name": "ohos.permission.MICROPHONE",
        "reason": "$string:mic_reason",
        "usedScene": {
          "abilities": ["EntryAbility"],
          "when": "inuse"
        }
      },
      {
        "name": "ohos.permission.LOCATION",
        "reason": "$string:location_reason",
        "usedScene": {
          "abilities": ["EntryAbility"],
          "when": "inuse"
        }
      }
    ]
  }
}
```

**usedScene.when 权限使用时机**
`"when": "<inuse | always>"`
```json
{
  "usedScene": {
    "abilities": ["EntryAbility"],
    "when": "inuse"        // inuse: 前台使用 | always: 前后台使用
  }
}
```

---

## 权限等级分类

**权限等级表**
| 等级 | 示例权限 | 授权方式 |
| ---- | ---- | ---- |
| `normal` | `ohos.permission.INTERNET`、`ohos.permission.GET_NETWORK_INFO` | 安装时自动授予 |
| `system_basic` | `ohos.permission.CAMERA`、`ohos.permission.MICROPHONE`、`ohos.permission.LOCATION` | 运行时弹窗申请 |
| `system_core` | `ohos.permission.MANAGE_USERS`、`ohos.permission.REBOOT` | 仅系统应用可用 |

---

## 提醒服务 API

**导入提醒服务模块**
`import reminderAgentManager from '@ohos.reminderAgentManager';`
```typescript
import reminderAgentManager from '@ohos.reminderAgentManager';
```

**发布倒计时提醒**
`reminderAgentManager.publishReminder(<reminder: ReminderRequest>): Promise<number>`
```typescript
const reminderRequest: reminderAgentManager.ReminderRequestTimer = {
  reminderType: reminderAgentManager.ReminderType.REMINDER_TYPE_TIMER,
  triggerTimeInSeconds: 3600,     // 1 小时后触发
  actionButton: [
    {
      title: '关闭',
      type: reminderAgentManager.ActionButtonType.ACTION_BUTTON_TYPE_CLOSE,
    },
    {
      title: '自定义',
      type: reminderAgentManager.ActionButtonType.ACTION_BUTTON_TYPE_CUSTOM,
    },
  ],
  wantAgent: {
    pkgName: 'com.example.app',
    abilityName: 'EntryAbility',
  },
  maxScreenWantAgent: {
    pkgName: 'com.example.app',
    abilityName: 'EntryAbility',
  },
  notificationId: 100,
  title: '提醒标题',
  content: '提醒内容',
};

const reminderId = await reminderAgentManager.publishReminder(reminderRequest);
console.info(`提醒已发布, ID: ${reminderId}`);
```

**发布日历提醒**
`reminderAgentManager.publishReminder(<reminder: ReminderRequestCalendar>): Promise<number>`
```typescript
const calendarReminder: reminderAgentManager.ReminderRequestCalendar = {
  reminderType: reminderAgentManager.ReminderType.REMINDER_TYPE_CALENDAR,
  dateTime: {
    year: 2026,
    month: 12,
    day: 31,
    hour: 23,
    minute: 59,
  },
  daysOfWeek: [1, 2, 3, 4, 5],   // 周一到周五重复
  title: '下班提醒',
  content: '该下班啦',
  notificationId: 101,
};

const reminderId = await reminderAgentManager.publishReminder(calendarReminder);
```

**取消提醒**
`reminderAgentManager.cancelReminder(<reminderId: number>): Promise<void>`
```typescript
await reminderAgentManager.cancelReminder(reminderId);
```

**取消所有提醒**
`reminderAgentManager.cancelAllReminders(): Promise<void>`
```typescript
await reminderAgentManager.cancelAllReminders();
```

**获取有效提醒**
`reminderAgentManager.getValidReminders(): Promise<Array<ReminderRequest>>`
```typescript
const reminders = await reminderAgentManager.getValidReminders();
reminders.forEach((reminder) => {
  console.info(`提醒 ID: ${reminder.notificationId}`);
});
```

---

## ReminderType 枚举

**ReminderType 提醒类型**
`reminderAgentManager.ReminderType.<TYPE>`
```typescript
reminderAgentManager.ReminderType.REMINDER_TYPE_TIMER      // 倒计时提醒
reminderAgentManager.ReminderType.REMINDER_TYPE_CALENDAR   // 日历提醒
reminderAgentManager.ReminderType.REMINDER_TYPE_ALARM      // 闹钟提醒
```

**ActionButtonType 按钮类型**
`reminderAgentManager.ActionButtonType.<TYPE>`
```typescript
reminderAgentManager.ActionButtonType.ACTION_BUTTON_TYPE_CLOSE     // 关闭按钮
reminderAgentManager.ActionButtonType.ACTION_BUTTON_TYPE_CUSTOM     // 自定义按钮
reminderAgentManager.ActionButtonType.ACTION_BUTTON_TYPE_SNOOZE     // 稍后提醒按钮
```

