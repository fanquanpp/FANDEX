# 项目配置文件 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## app.json5 应用级配置

**AppScope/app.json5 基本结构**
`{ app: { bundleName, vendor, versionCode, versionName, icon, label, ... } }`
```json5
{
  app: {
    bundleName: 'com.example.myapp',
    vendor: 'MyCompany',
    versionCode: 1000000,
    versionName: '1.0.0',
    icon: '$media:app_icon',
    label: '$string:app_name',
    minAPIVersion: 12,
    targetAPIVersion: 12,
    apiReleaseType: 'Release',
    debug: false
  }
}
```

**版本号字段**
`versionCode: <integer>; versionName: '<x.y.z>';`
```json5
{ versionCode: 1000000, versionName: '1.0.0' }
{ versionCode: 1000100, versionName: '1.1.0' }
{ versionCode: 2000000, versionName: '2.0.0' }
```

---

## module.json5 模块级配置

**entry/src/main/module.json5 基本结构**
`{ module: { name, type, mainElement, deviceTypes, pages, abilities, ... } }`
```json5
{
  module: {
    name: 'entry',
    type: 'entry',
    description: '$string:module_desc',
    mainElement: 'EntryAbility',
    deviceTypes: ['phone', 'tablet', '2in1'],
    deliveryWithInstall: true,
    installationFree: false,
    pages: '$profile:main_pages',
    abilities: []
  }
}
```

**ModuleType 模块类型**
`type: 'entry' | 'feature' | 'shared'`
```typescript
enum ModuleType {
  ENTRY = 'entry',
  FEATURE = 'feature',
  SHARED = 'shared'
}
```

**deviceTypes 设备类型**
`deviceTypes: Array<'phone' | 'tablet' | 'tv' | 'wearable' | 'car' | '2in1'>`
```json5
{ deviceTypes: ['phone', 'tablet', '2in1'] }
```

**Ability 配置**
`abilities: [{ name, srcEntry, description, icon, label, exported, skills }]`
```json5
{
  abilities: [{
    name: 'EntryAbility',
    srcEntry: './ets/entryability/EntryAbility.ets',
    description: '$string:EntryAbility_desc',
    icon: '$media:layered_image',
    label: '$string:EntryAbility_label',
    startWindowIcon: '$media:startIcon',
    startWindowBackground: '$color:start_window_background',
    exported: true,
    skills: [{
      entities: ['entity.system.home'],
      actions: ['action.system.home']
    }]
  }]
}
```

**ExtensionAbility 扩展配置**
`extensionAbilities: [{ name, srcEntry, type, metadata }]`
```json5
{
  extensionAbilities: [{
    name: 'FormExtensionAbility',
    srcEntry: './ets/formability/FormExtensionAbility.ets',
    type: 'form',
    metadata: [{ name: 'ohos.extension.form', resource: '$profile:form_config' }]
  }]
}
```

**requestPermissions 权限声明**
`requestPermissions: [{ name, reason, usedScene: { abilities, when } }]`
```json5
{
  module: {
    requestPermissions: [
      {
        name: 'ohos.permission.INTERNET',
        reason: '$string:reason_internet',
        usedScene: { abilities: ['EntryAbility'], when: 'inuse' }
      },
      {
        name: 'ohos.permission.LOCATION',
        reason: '$string:reason_location',
        usedScene: { abilities: ['EntryAbility'], when: 'always' }
      }
    ]
  }
}
```

**usedScene.when 使用时机**
`when: 'inuse' | 'always'`
```json5
{ usedScene: { abilities: ['EntryAbility'], when: 'inuse' } }
```

**metadata 元数据**
`metadata: [{ name, resource }]`
```json5
{ metadata: [{ name: 'ohos.extension.form', resource: '$profile:form_config' }] }
```

---

## build-profile.json5 项目构建配置

**项目级 build-profile.json5**
`{ app: { signingConfigs, products, buildModeName }, modules: [{ name, srcPath, targets }] }`
```json5
{
  app: {
    signingConfigs: [],
    products: [{
      name: 'default',
      signingConfig: 'default',
      compatibleSdkVersion: '5.0.0(12)',
      compileSdkVersion: '5.0.0(12)',
      targetSdkVersion: '5.0.0(12)',
      runtimeOS: 'HarmonyOS'
    }],
    buildModeName: 'release'
  },
  modules: [{
    name: 'entry',
    srcPath: './entry',
    targets: [{ name: 'default', applyToProducts: ['default'] }]
  }]
}
```

**模块级 build-profile.json5(entry/build-profile.json5)**
`{ apiType, buildOption, buildOptionSet, targets }`
```json5
{
  apiType: 'stageMode',
  buildOption: {
    arm64V8a: { enable: true },
    x86_64: { enable: false }
  },
  buildOptionSet: [
    { name: 'release', arkOptions: { obfuscation: { ruleFiles: ['./obfuscation-rules.txt'], enable: true } } },
    { name: 'debug', arkOptions: { sourceMap: { enable: true } } }
  ],
  targets: [{ name: 'default', runtimeOS: 'HarmonyOS' }]
}
```

**BuildMode 构建模式**
`buildModeName: 'debug' | 'release'`
```typescript
enum BuildMode { DEBUG = 'debug', RELEASE = 'release' }
```

**RuntimeOS 运行系统**
`runtimeOS: 'HarmonyOS' | 'OpenHarmony'`
```typescript
enum RuntimeOS { HARMONYOS = 'HarmonyOS', OPENHARMONY = 'OpenHarmony' }
```

---

## oh-package.json5 包依赖配置

**项目级 oh-package.json5**
`{ name, version, dependencies, devDependencies }`
```json5
{
  name: 'my-application',
  version: '1.0.0',
  dependencies: {},
  devDependencies: {
    '@ohos/hypium': '1.0.6',
    '@ohos/hvigor-ohos-plugin': '5.0.0'
  }
}
```

**模块级 oh-package.json5**
`{ name, version, dependencies: { '<kit>': '<version> | file:<path> | git+<url>' } }`
```json5
{
  name: 'entry',
  version: '1.0.0',
  dependencies: {
    '@kit.ArkUI': 'file:./libs/arkui',
    '@ohos/hypium': '1.0.6',
    'shared-library': 'file:../shared',
    'my-library': 'git+https://github.com/user/repo.git#v1.0.0'
  }
}
```

---

## 资源引用语法

**资源引用前缀**
`'$<type>:<name>'`
```typescript
'$media:app_icon'              // resources/base/media/
'$string:app_name'             // resources/base/element/string.json
'$color:start_window_background' // resources/base/element/color.json
'$profile:main_pages'          // resources/base/profile/
'$plural:app_count'            // 复数资源
```

**main_pages.json 页面路由配置**
`{ src: ['pages/<Page1>', 'pages/<Page2>', ...] }`
```json5
{
  src: [
    'pages/Index',
    'pages/HomePage',
    'pages/DetailPage',
    'pages/SettingsPage'
  ]
}
```

**string.json 字符串资源**
`{ string: [{ name, value }] }`
```json5
{ string: [{ name: 'app_name', value: 'FANDEX' }] }
```

**color.json 颜色资源**
`{ color: [{ name, value }] }`
```json5
{ color: [{ name: 'primary_color', value: '#007DFF' }] }
```

---

## 多模块项目配置

**项目级 build-profile.json5 多模块**
`modules: [{ name, srcPath, targets: [{ name, applyToProducts }] }]`
```json5
{
  modules: [
    { name: 'entry', srcPath: './entry', targets: [{ name: 'default', applyToProducts: ['default'] }] },
    { name: 'feature1', srcPath: './feature1', targets: [{ name: 'default', applyToProducts: ['default'] }] },
    { name: 'shared', srcPath: './shared', targets: [{ name: 'default', applyToProducts: ['default'] }] }
  ]
}
```

**feature 模块 module.json5**
`type: 'feature'`
```json5
{
  module: {
    name: 'feature1',
    type: 'feature',
    deviceTypes: ['phone', 'tablet'],
    deliveryWithInstall: true,
    installationFree: false,
    pages: '$profile:main_pages'
  }
}
```

**shared 模块 module.json5**
`type: 'shared'`
```json5
{
  module: {
    name: 'shared',
    type: 'shared',
    deviceTypes: ['phone', 'tablet'],
    deliveryWithInstall: true
  }
}
```
