---
order: 63
title: 卡片开发
module: harmonyos
category: HarmonyOS
difficulty: intermediate
description: 服务卡片与桌面小组件
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/分布式能力
  - harmonyos/通知与权限
  - harmonyos/数据持久化
  - harmonyos/动画系统
prerequisites:
  - harmonyos/概述与环境搭建
---

## 概述

服务卡片（Widget）是 HarmonyOS 的桌面小组件，用户可以在桌面上直接查看应用的关键信息，无需打开应用。卡片支持静态展示和动态更新，尺寸从 1x1 到 4x4 不等。合理使用卡片可以提升应用的可见性和用户粘性。

为什么需要卡片？用户每天查看手机桌面几十次，如果应用的关键信息能直接展示在桌面上，用户就不需要每次都打开应用。天气应用可以显示当前温度，待办应用可以显示今日任务，音乐应用可以显示播放控制。卡片让应用的信息触手可及。

## 基础概念

**卡片提供方**：应用中负责创建和更新卡片的部分。通过 FormExtensionAbility 实现卡片的生命周期管理。

**卡片使用方**：桌面系统，负责展示卡片和管理卡片的位置和大小。

**卡片管理方**：系统服务，协调卡片提供方和使用方之间的通信。

**卡片尺寸**：HarmonyOS 支持多种卡片尺寸，用网格数表示。常见尺寸有 1x2、2x2、2x4、4x4 等。

**卡片数据更新**：卡片支持定时更新和按需更新。定时更新通过 form_update_duration 配置，按需更新通过 formProvider 接口触发。

## 快速上手

### 创建卡片

在 DevEco Studio 中创建卡片：

1. 右键点击模块目录 -> New -> Service Widget
2. 选择卡片模板（如时钟、图片、图文等）
3. 配置卡片名称和尺寸

卡片配置在 form_config.json 中：

```json
{
  "forms": [
    {
      "name": "widget", // 卡片名称
      "displayName": "我的卡片", // 显示名称
      "description": "这是一个示例卡片", // 描述
      "src": "./ets/widget/pages/WidgetCard.ets", // 卡片页面路径
      "uiSyntax": "arkts", // UI 语法
      "window": {
        "designWidth": 720,
        "autoDesignWidth": true
      },
      "colorMode": "auto", // 颜色模式：auto/亮色/暗色
      "isDefault": true, // 是否为默认卡片
      "updateEnabled": true, // 是否允许更新
      "scheduledUpdateTime": "10:30", // 定时更新时间
      "updateDuration": 1, // 更新间隔（小时）
      "defaultDimension": "2*2", // 默认尺寸
      "supportDimensions": [
        // 支持的尺寸
        "2*2",
        "2*4",
        "4*4"
      ]
    }
  ]
}
```

### 最简单的卡片页面

```typescript
// WidgetCard.ets - 卡片界面
@Entry
@Component
struct WidgetCard {
  // 卡片数据，由 FormExtension 传入
  @State title: string = '待办事项'
  @State count: number = 0

  build() {
    Column() {
      Text(this.title)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor('#333333')

      Text(`今日 ${this.count} 项`)
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 8 })

      Text('点击查看详情')
        .fontSize(12)
        .fontColor('#999999')
        .margin({ top: 8 })
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#ffffff')
    .borderRadius(16)
    .onClick(() => {
      // 点击卡片跳转到应用
      postCardAction(this, {
        action: 'router',
        abilityName: 'EntryAbility',
        params: { page: 'todoList' }
      })
    })
  }
}
```

### 卡片生命周期

```typescript
// FormAbility.ets - 卡片扩展能力
import FormExtension from '@ohos.app.form.FormExtensionAbility';
import formProvider from '@ohos.app.form.formProvider';

export default class FormAbility extends FormExtension {
  // 创建卡片时调用
  onAddForm(want) {
    console.info('卡片创建');

    // 返回卡片的初始数据
    const formInfo = {
      title: '待办事项',
      count: 5,
      updateTime: new Date().toLocaleTimeString(),
    };

    return formBindingData.createFormBindingData(formInfo);
  }

  // 更新卡片时调用
  onUpdateForm(formId) {
    console.info(`卡片更新: ${formId}`);

    // 获取最新数据
    const formInfo = {
      title: '待办事项',
      count: getTodoCount(),
      updateTime: new Date().toLocaleTimeString(),
    };

    const formBindingData = formBindingData.createFormBindingData(formInfo);
    formProvider.updateForm(formId, formBindingData);
  }

  // 删除卡片时调用
  onRemoveForm(formId) {
    console.info(`卡片删除: ${formId}`);
  }

  // 卡片可见性变化时调用
  onVisibilityChange(newStatus) {
    console.info(`卡片可见性变化: ${JSON.stringify(newStatus)}`);
  }
}
```

## 详细用法

### 卡片数据更新

```typescript
import formProvider from '@ohos.app.form.formProvider';
import formBindingData from '@ohos.app.form.formBindingData';

// 主动更新卡片数据
async function updateWidget(formId: string, data: Record<string, Object>) {
  try {
    const formBindingDataObj = formBindingData.createFormBindingData(data);
    await formProvider.updateForm(formId, formBindingDataObj);
    console.info('卡片更新成功');
  } catch (error) {
    console.error(`卡片更新失败: ${error}`);
  }
}

// 更新所有卡片
async function updateAllWidgets() {
  try {
    // 获取所有卡片 ID
    const formIds = await formProvider.getAllFormsInfo();

    for (const formInfo of formIds) {
      await updateWidget(formInfo.formId, {
        title: '待办事项',
        count: getTodoCount(),
        updateTime: new Date().toLocaleTimeString(),
      });
    }
  } catch (error) {
    console.error(`更新所有卡片失败: ${error}`);
  }
}
```

### 卡片点击事件

```typescript
@Entry
@Component
struct WidgetCardWithActions {
  @State title: string = '天气'
  @State temp: string = '25°C'

  build() {
    Column() {
      Text(this.title).fontSize(16).fontWeight(FontWeight.Bold)
      Text(this.temp).fontSize(32).fontWeight(FontWeight.Bold)

      Row() {
        // router 事件：点击跳转到应用页面
        Button('查看详情')
          .fontSize(12)
          .onClick(() => {
            postCardAction(this, {
              action: 'router',
              abilityName: 'EntryAbility',
              params: { page: 'weather_detail' }
            })
          })

        // call 事件：点击调用 Ability 的方法（不跳转）
        Button('刷新')
          .fontSize(12)
          .onClick(() => {
            postCardAction(this, {
              action: 'call',
              abilityName: 'FormAbility',
              params: {
                method: 'refresh',
                formId: '42'
              }
            })
          })
      }
    }
    .width('100%')
    .height('100%')
    .padding(12)
  }
}
```

### 多尺寸卡片

```typescript
// 根据卡片尺寸显示不同内容
@Entry
@Component
struct MultiSizeWidget {
  // 卡片尺寸由系统传入
  @State dimension: string = '2*2'
  @State title: string = '待办'
  @State count: number = 5
  @State items: string[] = ['买菜', '开会', '写报告']

  build() {
    Column() {
      if (this.dimension === '2*2') {
        // 小尺寸：只显示摘要
        Text(this.title).fontSize(14).fontWeight(FontWeight.Bold)
        Text(`${this.count} 项待办`).fontSize(20)
      } else if (this.dimension === '2*4') {
        // 中等尺寸：显示摘要和前两项
        Text(this.title).fontSize(16).fontWeight(FontWeight.Bold)
        Text(`${this.count} 项待办`).fontSize(20)
        ForEach(this.items.slice(0, 2), (item: string) => {
          Text(item).fontSize(14).margin({ top: 4 })
        })
      } else {
        // 大尺寸：显示完整列表
        Text(this.title).fontSize(18).fontWeight(FontWeight.Bold)
        ForEach(this.items, (item: string) => {
          Row() {
            Text(item).fontSize(14).layoutWeight(1)
          }
          .margin({ top: 4 })
        })
      }
    }
    .width('100%')
    .height('100%')
    .padding(12)
  }
}
```

### 卡片样式美化

```typescript
@Entry
@Component
struct StyledWidget {
  @State temp: number = 25
  @State city: string = '北京'
  @State weather: string = '晴'

  build() {
    Stack() {
      // 背景渐变
      Column()
        .width('100%')
        .height('100%')
        .linearGradient({
          direction: GradientDirection.BottomRight,
          colors: [['#4facfe', 0.0], ['#00f2fe', 1.0]]
        })
        .borderRadius(16)

      // 内容
      Column() {
        Text(this.city)
          .fontSize(16)
          .fontColor(Color.White)

        Text(`${this.temp}°`)
          .fontSize(48)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)

        Text(this.weather)
          .fontSize(14)
          .fontColor('#ffffffcc')
      }
      .width('100%')
      .height('100%')
      .padding(16)
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .height('100%')
  }
}
```

## 常见场景

### 天气卡片

```typescript
@Entry
@Component
struct WeatherWidget {
  @State city: string = '北京'
  @State temp: number = 25
  @State weather: string = '晴'
  @State highTemp: number = 28
  @State lowTemp: number = 18

  build() {
    Column() {
      Row() {
        Text(this.city).fontSize(14).fontColor('#ffffffcc')
        Text(new Date().toLocaleDateString()).fontSize(12).fontColor('#ffffff99')
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceBetween)

      Row() {
        Text(`${this.temp}°`).fontSize(40).fontWeight(FontWeight.Bold).fontColor(Color.White)
        Text(this.weather).fontSize(16).fontColor('#ffffffcc').margin({ left: 8 })
      }
      .margin({ top: 12 })

      Text(`${this.lowTemp}° / ${this.highTemp}°`)
        .fontSize(12)
        .fontColor('#ffffff99')
        .margin({ top: 4 })
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .linearGradient({
      direction: GradientDirection.Bottom,
      colors: [['#667eea', 0.0], ['#764ba2', 1.0]]
    })
    .borderRadius(16)
    .onClick(() => {
      postCardAction(this, {
        action: 'router',
        abilityName: 'EntryAbility',
        params: { page: 'weather' }
      })
    })
  }
}
```

### 待办事项卡片

```typescript
@Entry
@Component
struct TodoWidget {
  @State todos: string[] = ['完成报告', '团队会议', '代码评审']
  @State completedCount: number = 2
  @State totalCount: number = 5

  build() {
    Column() {
      Row() {
        Text('今日待办').fontSize(14).fontWeight(FontWeight.Bold)
        Text(`${this.completedCount}/${this.totalCount}`).fontSize(12).fontColor('#999999')
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceBetween)

      ForEach(this.todos, (todo: string, index: number) => {
        Row() {
          Text(index < this.completedCount ? 'v' : 'o')
            .fontSize(12)
            .fontColor(index < this.completedCount ? '#4caf50' : '#cccccc')
          Text(todo)
            .fontSize(13)
            .margin({ left: 8 })
            .decoration({ type: index < this.completedCount ? TextDecorationType.LineThrough : TextDecorationType.None })
        }
        .margin({ top: 8 })
      })
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .backgroundColor('#ffffff')
    .borderRadius(16)
    .onClick(() => {
      postCardAction(this, {
        action: 'router',
        abilityName: 'EntryAbility',
        params: { page: 'todo' }
      })
    })
  }
}
```

## 注意事项

**卡片资源限制**：卡片运行在独立的环境中，不能直接访问应用的资源。图片等资源需要放在卡片的资源目录中。

**卡片不支持所有组件**：卡片只支持部分 ArkUI 组件，不支持 Canvas、Web 等复杂组件。具体支持列表请参考官方文档。

**卡片更新频率**：系统限制了卡片的更新频率，最短间隔为 30 分钟。不要尝试高频更新卡片。

**卡片内存限制**：卡片的内存使用有限制，不要在卡片中加载大量数据或大图。

**暗色模式**：卡片应支持暗色模式，使用 `colorMode: "auto"` 让系统自动切换。

## 进阶用法

### 卡片与主应用通信

```typescript
// 在 FormAbility 中处理 call 事件
export default class FormAbility extends FormExtension {
  onFormEvent(formId: string, message: string) {
    // 处理从卡片发来的消息
    const data = JSON.parse(message);
    if (data.method === 'refresh') {
      // 刷新卡片数据
      this.refreshFormData(formId);
    } else if (data.method === 'complete') {
      // 标记任务完成
      this.markTodoComplete(data.todoId);
      this.refreshFormData(formId);
    }
  }

  private async refreshFormData(formId: string) {
    const todos = await loadTodos();
    const formInfo = {
      todos: todos.map((t) => t.title),
      completedCount: todos.filter((t) => t.done).length,
      totalCount: todos.length,
    };
    const bindingData = formBindingData.createFormBindingData(formInfo);
    formProvider.updateForm(formId, bindingData);
  }
}
```

### 定时更新卡片

```typescript
import reminderAgentManager from '@ohos.reminderAgentManager';

// 设置后台定时任务来更新卡片
async function setupWidgetUpdate() {
  const reminderRequest: reminderAgentManager.ReminderRequestTimer = {
    reminderType: reminderAgentManager.ReminderType.REMINDER_TYPE_TIMER,
    triggerTimeInSeconds: 3600, // 每小时触发一次
    actionButton: [
      {
        title: '更新卡片',
        type: reminderAgentManager.ActionButtonType.ACTION_BUTTON_TYPE_CUSTOM,
      },
    ],
  };

  const reminderId = await reminderAgentManager.publishReminder(reminderRequest);
  console.info(`定时提醒已设置: ${reminderId}`);
}
```
