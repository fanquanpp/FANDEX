# 组件生命周期详解 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 自定义组件生命周期

**aboutToAppear 创建后**
`aboutToAppear(): void { ... }`
```typescript
@Component
struct Demo {
  aboutToAppear() {
    console.info('组件创建完成,即将显示')
    this.loadData()
    this.registerListeners()
  }

  private async loadData() {
    this.data = await fetchData()
  }

  build() { Text('Demo') }
}
```

**aboutToDisappear 销毁前**
`aboutToDisappear(): void { ... }`
```typescript
@Component
struct Demo {
  private timer: number = -1

  aboutToDisappear() {
    console.info('组件即将销毁')
    clearInterval(this.timer)
    this.releaseResources()
  }

  build() { Text('Demo') }
}
```

**aboutToReuse 复用前**
`aboutToReuse(params: Record<string, Object>): void { ... }`
```typescript
@Reusable
@Component
struct ListItem {
  @State data: string = ''

  aboutToReuse(params: Record<string, Object>) {
    this.data = params.data as string
    console.info(`组件复用,新数据: ${this.data}`)
  }

  build() { Text(this.data) }
}
```

**aboutToRecycle 回收前**
`aboutToRecycle(): void { ... }`
```typescript
@Reusable
@Component
struct ListItem {
  @State data: string = ''

  aboutToRecycle() {
    console.info('组件即将回收复用')
    this.reset()
  }

  private reset() {
    this.data = ''
  }

  build() { Text(this.data) }
}
```

**onBackPress 返回键**
`onBackPress(): boolean { ... }`
```typescript
@Component
struct EditorPage {
  @State hasUnsavedData: boolean = false

  onBackPress(): boolean {
    if (this.hasUnsavedData) {
      this.showConfirmDialog()
      return true  // 拦截返回
    }
    return false  // 默认返回行为
  }

  build() { Text('Editor') }
}
```

**onLayout 布局变化**
`onLayout(layoutInfo: LayoutInfo): void { ... }`
```typescript
@Component
struct Demo {
  onLayout(layoutInfo: LayoutInfo) {
    console.info(`width: ${layoutInfo.width}, height: ${layoutInfo.height}`)
    console.info(`x: ${layoutInfo.x}, y: ${layoutInfo.y}`)
  }

  build() { Column() {} }
}
```

---

## 组件显示事件

**onAppear 显示**
`<Component>.onAppear(() => { ... })`
```typescript
Column()
  .onAppear(() => {
    console.info('组件显示')
  })
```

**onDisappear 隐藏**
`<Component>.onDisappear(() => { ... })`
```typescript
Column()
  .onDisappear(() => {
    console.info('组件隐藏')
  })
```

**onAreaChange 区域变化**
`<Component>.onAreaChange((old, new) => { ... })`
```typescript
Column()
  .onAreaChange((oldValue: Area, newValue: Area) => {
    console.info(`old: ${oldValue.width}, new: ${newValue.width}`)
  })
```

**onVisibleAreaChange 可见区域变化**
`<Component>.onVisibleAreaChange([<ratios>], (isDetect, ratio) => { ... })`
```typescript
Column()
  .onVisibleAreaChange([0.0, 0.5, 1.0], (isDetect: boolean, ratio: number) => {
    console.info(`可见比例: ${ratio}`)
  })
```

---

## UIAbility 生命周期

**onCreate 创建**
`onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void { ... }`
```typescript
import { UIAbility, AbilityConstant, Want } from '@kit.AbilityKit'

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    console.info('[EntryAbility] onCreate')
    console.info(`want: ${JSON.stringify(want)}`)
    console.info(`launchParam: ${JSON.stringify(launchParam)}`)
  }
}
```

**onDestroy 销毁**
`onDestroy(): void { ... }`
```typescript
onDestroy(): void {
  console.info('[EntryAbility] onDestroy')
  this.releaseResources()
}
```

**onWindowStageCreate 窗口创建**
`onWindowStageCreate(windowStage: window.WindowStage): void { ... }`
```typescript
import { window } from '@kit.ArkUI'

onWindowStageCreate(windowStage: window.WindowStage): void {
  console.info('[EntryAbility] onWindowStageCreate')
  windowStage.loadContent('pages/Index', (err, data) => {
    if (err.code) {
      console.error(`加载失败: ${JSON.stringify(err)}`)
      return
    }
    console.info('加载成功')
  })
}
```

**onWindowStageDestroy 窗口销毁**
`onWindowStageDestroy(): void { ... }`
```typescript
onWindowStageDestroy(): void {
  console.info('[EntryAbility] onWindowStageDestroy')
}
```

**onForeground 切到前台**
`onForeground(): void { ... }`
```typescript
onForeground(): void {
  console.info('[EntryAbility] onForeground')
  this.resumeAnimation()
}
```

**onBackground 切到后台**
`onBackground(): void { ... }`
```typescript
onBackground(): void {
  console.info('[EntryAbility] onBackground')
  this.pauseAnimation()
  this.saveState()
}
```

---

## Ability 生命周期回调

**onNewWant 新 Want**
`onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void { ... }`
```typescript
onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void {
  console.info('[EntryAbility] onNewWant')
  console.info(`uri: ${want.uri}`)
  this.handleNewWant(want)
}
```

**onConfigurationUpdated 配置变化**
`onConfigurationUpdated(newConfig: Configuration): void { ... }`
```typescript
import { Configuration } from '@ohos.app.ability.Configuration'

onConfigurationUpdated(newConfig: Configuration): void {
  console.info(`language: ${newConfig.language}`)
  console.info(`colorMode: ${newConfig.colorMode}`)
  if (newConfig.colorMode === 'dark') {
    this.applyDarkTheme()
  }
}
```

**onMemoryLevel 内存告警**
`onMemoryLevel(level: AbilityConstant.MemoryLevel): void { ... }`
```typescript
import { AbilityConstant } from '@kit.AbilityKit'

onMemoryLevel(level: AbilityConstant.MemoryLevel): void {
  switch (level) {
    case AbilityConstant.MemoryLevel.MEMORY_LEVEL_MODERATE:
      console.info('内存告警:中等')
      this.releaseCache()
      break
    case AbilityConstant.MemoryLevel.MEMORY_LEVEL_LOW:
      console.info('内存告警:低')
      this.releaseNonCritical()
      break
    case AbilityConstant.MemoryLevel.MEMORY_LEVEL_CRITICAL:
      console.info('内存告警:严重')
      this.releaseAll()
      break
  }
}
```

---

## 状态保存与恢复

**onSaveAbilityState 保存状态**
`onSaveAbilityState(reason: AbilityConstant.StateType, wantParam: Record<string, Object>): void { ... }`
```typescript
onSaveAbilityState(reason: AbilityConstant.StateType, wantParam: Record<string, Object>): void {
  console.info(`保存原因: ${reason}`)
  wantParam['currentUser'] = this.currentUser
  wantParam['lastPage'] = this.lastPage
}
```

**onRestoreAbilityState 恢复状态**
`onRestoreAbilityState(wantParam: Record<string, Object>): void { ... }`
```typescript
onRestoreAbilityState(wantParam: Record<string, Object>): void {
  this.currentUser = wantParam['currentUser'] as User
  this.lastPage = wantParam['lastPage'] as string
  console.info('状态已恢复')
}
```

---

## 多实例生命周期

**onActive 激活**
`onActive(): void { ... }`
```typescript
onActive(): void {
  console.info('[EntryAbility] onActive')
}
```

**onInactive 失活**
`onInactive(): void { ... }`
```typescript
onInactive(): void {
  console.info('[EntryAbility] onInactive')
}
```

---

## ExtensionAbility 生命周期

**onAddForm 添加卡片**
`onAddForm(want: Want): formBindingData.FormBindingData { ... }`
```typescript
import FormExtensionAbility from '@ohos.app.form.FormExtensionAbility'

export default class FormAbility extends FormExtensionAbility {
  onAddForm(want: Want) {
    return formBindingData.createFormBindingData({
      title: 'Hello',
      updated: Date.now()
    })
  }
}
```

**onCastToNormalForm 转换为普通卡片**
`onCastToNormalForm(formId: string): void { ... }`
```typescript
onCastToNormalForm(formId: string): void {
  console.info(`卡片 ${formId} 转换为普通`)
}
```

**onUpdateForm 更新卡片**
`onUpdateForm(formId: string): void { ... }`
```typescript
onUpdateForm(formId: string): void {
  const formData = { title: 'Updated', updated: Date.now() }
  formProvider.updateForm(formId, formBindingData.createFormBindingData(formData))
}
```

---

## Page 生命周期

**onPageShow 页面显示**
`onPageShow(): void { ... }`
```typescript
@Entry
@Component
struct MyPage {
  onPageShow() {
    console.info('页面显示')
    this.refreshData()
  }
  build() { Text('Page') }
}
```

**onPageHide 页面隐藏**
`onPageHide(): void { ... }`
```typescript
@Entry
@Component
struct MyPage {
  onPageHide() {
    console.info('页面隐藏')
    this.saveDraft()
  }
  build() { Text('Page') }
}
```

**onPageBackPress 页面返回键**
`onPageBackPress(): boolean { ... }`
```typescript
@Entry
@Component
struct MyPage {
  onPageBackPress(): boolean {
    return this.handleBack()
  }
  build() { Text('Page') }
}
```

---

## 完整生命周期示例

**UIAbility 完整生命周期**
```typescript
import { UIAbility, AbilityConstant, Want } from '@kit.AbilityKit'
import { window } from '@kit.ArkUI'

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    console.info('[Ability] onCreate')
  }

  onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    console.info('[Ability] onNewWant')
  }

  onDestroy(): void {
    console.info('[Ability] onDestroy')
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    console.info('[Ability] onWindowStageCreate')
    windowStage.loadContent('pages/Index')
  }

  onWindowStageDestroy(): void {
    console.info('[Ability] onWindowStageDestroy')
  }

  onForeground(): void {
    console.info('[Ability] onForeground')
  }

  onBackground(): void {
    console.info('[Ability] onBackground')
  }
}
```

**自定义组件完整生命周期**
```typescript
@Reusable
@Component
struct LifecycleDemo {
  @State data: string = ''

  // 1. 组件创建后调用
  aboutToAppear() {
    console.info('[Component] aboutToAppear')
    this.loadData()
  }

  // 2. 组件即将销毁
  aboutToDisappear() {
    console.info('[Component] aboutToDisappear')
    this.cleanup()
  }

  // 3. 组件复用前(仅 @Reusable)
  aboutToReuse(params: Record<string, Object>) {
    console.info('[Component] aboutToReuse')
    this.data = params.data as string
  }

  // 4. 组件回收前(仅 @Reusable)
  aboutToRecycle() {
    console.info('[Component] aboutToRecycle')
  }

  // 5. 返回键拦截
  onBackPress(): boolean {
    console.info('[Component] onBackPress')
    return false
  }

  build() {
    Column() {
      Text(this.data)
    }
  }
}
```
