# FANDEX Shared 共享契约

本目录存放 FANDEX 单仓库中跨子项目（Web / Desktop / Android）共享的契约文件，是热更新机制的权威数据源与跨语言逻辑对齐基准。

## 目录结构

```
shared/
├── README.md                          # 本说明文档
├── manifest.schema.json               # 内容清单 Schema（manifest 的 JSON Schema）
├── op-list.schema.json                # 热更新操作列表 Schema（op-list 的 JSON Schema）
├── id-registry.schema.json            # ID 注册表 Schema（工具链内部状态文件 Schema）
└── fixtures/                          # 黄金测试集（用于 TS/Kotlin 跨语言逻辑对齐）
    ├── manifest-full.sample.json      # full manifest 标准样本
    ├── manifest-mobile.sample.json    # mobile manifest 标准样本
    ├── op-list.sample.json            # op-list 标准样本（覆盖五种操作）
    └── id-registry.sample.json        # id-registry 标准样本
```

## 核心概念

### 1. Manifest（内容清单）

manifest 是描述当前内容快照的权威 JSON 文件，包含所有模块与文档的元数据。manifest 分两类：

- **full manifest**：对应 `content/full/`，Web + Desktop 共用基线内容
- **mobile manifest**：对应 `content/mobile/`，Android 端重编排专用内容

两类 manifest 独立分发、独立签名、独立归档。客户端通过 manifest 比对本地与远端内容差异，执行增量更新。

### 2. Op-List（操作列表）

op-list 描述两个 manifest 版本之间的差异，是一组有序的原子操作。客户端按 op-list 顺序执行增量更新。支持五种操作类型：

| 操作类型 | 说明 |
|---------|------|
| `add-module` | 新增模块（可携带初始文档） |
| `modify-doc` | 修改文档（含改名、内容更新、标签变更） |
| `add-doc` | 在已有模块内新增文档 |
| `remove-doc` | 删除文档 |
| `remove-module` | 删除模块（含其下所有文档） |

op-list 同样需要 Ed25519 签名，客户端验签失败拒绝执行。

### 3. ID-Registry（ID 注册表）

id-registry 是工具链内部使用的本地状态文件，**不公开分发，不进入客户端**。它追踪所有已分配的 module_id 与 doc_id，防止 ID 复用。

分配规则：
- 模块编号：00-99（两位数字）
- 文档编号：001-999（三位数字）
- 一旦分配，永久占用，永不复用
- 模块/文档删除后，对应 ID 进入 `retired` 段，永久封存

## ID 命名规则

### 模块 ID

格式：`Model_<EnglishShort>_<NN>`

- `Model_`：固定前缀
- `<EnglishShort>`：模块英文简称（小写字母 + 数字，如 `java`、`python`、`react`）
- `<NN>`：两位数字编号（00-99）

示例：`Model_Java_00`、`Model_Python_01`、`Model_React_02`

### 文档 ID

格式：`Doc_<EnglishShort>_<NN>_<NNN>`

- `Doc_`：固定前缀
- `<EnglishShort>`：模块英文简称（与所属模块一致）
- `<NN>`：模块编号（与所属模块一致）
- `<NNN>`：三位数字编号（001-999）

示例：`Doc_Java_00_001`、`Doc_Python_01_038`、`Doc_React_02_001`

### 改名场景处理

文档改名时，**doc_id 保持不变**，仅 `title` 与 `source_path` 字段变化。客户端以 doc_id 为锚点执行增量更新：

1. 下载新 `source_path` 文件到临时位置
2. 校验 `sha256` 通过
3. 删除旧 `source_path` 文件
4. 原子重命名临时文件为目标文件

此机制避免新旧文件并存，是热更新机制的核心设计点。

## 签名机制

### 签名算法

采用 Ed25519（EdDSA）签名算法。签名对象为 JSON 中除 `signature` 字段外的所有字段，规范化序列化规则：

1. 递归按 JSON key 字典序排序
2. 序列化为紧凑 JSON（无空白字符）
3. 对 UTF-8 字节流做 Ed25519 签名
4. 签名值以 base64 编码

### 密钥管理

- **私钥**：仅存于本地（开发者机器），**严禁**上传远程仓库
- **公钥**：可上传远程仓库，客户端内置公钥列表
- **公钥指纹**：SHA-256 前 16 字符（hex），用于快速匹配验签公钥
- **密钥轮换**：通过更新 `public_key_fingerprint` 实现，客户端需同步更新内置公钥

### 客户端验签流程

1. 拉取 manifest / op-list
2. 提取 `signature.public_key_fingerprint`
3. 在内置公钥列表中匹配对应公钥
4. 用公钥验签 `signature.value`
5. 验签失败拒绝应用更新，保留本地内容不变

## 版本兼容性

### app_compat_version

manifest 中的 `app_compat_version` 字段表示此 manifest 兼容的应用最低版本。客户端在拉取 manifest 后：

- 若客户端版本 >= `app_compat_version`：正常应用文档更新
- 若客户端版本 < `app_compat_version`：跳过本次文档热更新，提示用户升级应用

此机制实现应用更新与文档热更的联动。

### doc.compat_version（可选）

单个文档可附加 `compat_version` 字段，表示此文档需要的最低应用版本。客户端版本低于此值时，跳过此文档的更新并提示用户升级。

## 归档策略

manifest 被 newer 版本替代后，旧版本会被移动到 `archive/` 目录并附加 `archive_of` 字段记录原版本号。归档清理策略：

- 仅保留最近 5 个版本的归档 manifest
- 超出 5 个版本的旧归档自动删除
- 客户端仅下载最新 manifest，归档 manifest 仅用于版本追溯

op-list 的归档策略与 manifest 一致。

## 分发源

### CDN（默认）

- 主分发源：jsDelivr CDN
- URL 格式：`https://cdn.jsdelivr.net/gh/<owner>/<repo>@<ref>/<path>`
- 优点：全球加速、低延迟、高可用

### GitHub Raw（备选）

- 备选分发源：GitHub Raw
- URL 格式：`https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path>`
- 触发时机：CDN 不可用时自动切换，或用户手动切换
- 优点：直接从 GitHub 拉取，无 CDN 中间层

客户端默认使用 CDN，CDN 不可用时回退到 GitHub Raw。用户可在设置中手动切换分发源。

## 热更新触发时机

### 启动自动检测（可关闭）

应用启动时自动拉取最新 manifest，与本地比对后执行增量更新。用户可在设置中关闭此行为。

### 手动检查按钮

用户可在设置界面手动触发检查更新，无视自动检测开关状态。

### 不做定时检查

不实现定时后台检查（避免后台资源占用与隐私 concerns）。

## 黄金测试集（fixtures/）

`fixtures/` 目录下的样本文件用于跨语言逻辑对齐验证：

- **TS 端**（`tools/`）：工具链开发与测试时加载 fixtures 验证 Schema 解析、签名验证、op-list 应用等逻辑
- **Kotlin 端**（`android/`）：Android 端 updater 实现时加载相同 fixtures 验证逻辑一致性

两端对相同 fixtures 的处理结果必须一致，确保热更新机制的跨平台可靠性。

### 样本说明

| 样本文件 | 说明 |
|---------|------|
| `manifest-full.sample.json` | full manifest 标准样本，含 2 个模块、4 篇文档 |
| `manifest-mobile.sample.json` | mobile manifest 标准样本，含 1 个模块、2 篇文档 |
| `op-list.sample.json` | op-list 标准样本，覆盖五种操作类型各一例 |
| `id-registry.sample.json` | id-registry 标准样本，含 active 与 retired 状态记录 |

注意：样本中的 `sha256`、`signature.value` 均为占位符，仅用于 Schema 验证与逻辑对齐测试，非真实签名值。

## 使用方式

### 工具链引用

`tools/` 下的工具脚本通过相对路径引用 Schema 与 fixtures：

```typescript
import manifestSchema from '../shared/manifest.schema.json' with { type: 'json' };
import sampleManifest from '../shared/fixtures/manifest-full.sample.json' with { type: 'json' };
```

### Android 引用

Android 端通过相对路径或 assets 复制方式引用 fixtures：

```kotlin
val sampleManifest = context.assets.open("fixtures/manifest-full.sample.json").bufferedReader().use { it.readText() }
```

### Schema 验证

使用 Ajv（TS）或 everit-org/json-schema（Kotlin）等库对 manifest / op-list / id-registry 进行 Schema 验证，确保数据结构合法。

## 相关工具链

shared/ 契约由以下工具链使用（详见 `tools/`）：

| 工具 | 用途 |
|------|------|
| `generate-manifest` | 扫描 content/ 生成 manifest，引用 manifest.schema.json |
| `allocate-id` | 分配新 module_id / doc_id，维护 id-registry |
| `sign-manifest` | 对 manifest / op-list 进行 Ed25519 签名 |
| `verify-manifest` | 验证 manifest / op-list 签名 |
| `updater` | 客户端 updater 逻辑，应用 op-list 执行增量更新 |

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 1.0.0 | 2026-07-21 | 初始版本，定义 manifest / op-list / id-registry 三类契约 |
