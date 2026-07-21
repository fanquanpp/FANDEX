# FANDEX Tools 工具链

本目录存放 FANDEX 单仓库的工具链代码，负责 manifest 生成、ID 分配、Ed25519 签名与验签等离线/CI 任务。工具链以 TypeScript ESM 实现，通过 `tsx` 直接运行，无需预编译。

工具链是热更新机制的"生产端"，客户端（Desktop / Android）是"消费端"。两者通过 `shared/` 中的 JSON Schema 与 fixtures 实现跨语言契约对齐。

## 设计原则

1. **职责分离**：ID 生命周期（`id-registry`）与路径映射（`doc-id-map`）解耦，manifest 生成与签名分阶段执行
2. **ID 必须先分配**：`generate-manifest` 不在运行时分配 ID，强制要求先通过 `allocate-id` 分配并写入 `id-registry.json`
3. **跨语言一致性**：通过 `canonical-json` 模块确保 TS 与 Kotlin 端对相同数据产生相同字节流，签名可互验
4. **零信任分发**：所有 manifest / op-list 必须经 Ed25519 签名，客户端内置公钥列表验签，未签名或验签失败一律拒绝
5. **ID 永不复用**：`id-registry` 采用 `active` / `retired` 双状态，retired 后永久封存

## 目录结构

```
tools/
├── README.md                       # 本说明文档
├── package.json                    # 工具链依赖与 npm scripts
├── tsconfig.json                   # TypeScript 配置（ES2024 + ESNext + bundler）
├── keys/                           # 仓库内公钥存放目录（仅公钥，私钥不入库）
│   └── public-key.hex              # 公钥（hex 编码，可公开）
└── src/
    ├── lib/                        # 共享库模块
    │   ├── types.ts                # 共享 TypeScript 类型定义
    │   ├── canonical-json.ts       # 规范化 JSON 序列化（跨语言签名一致性基础）
    │   ├── ed25519.ts              # Ed25519 签名与验签核心
    │   ├── key-manager.ts          # 密钥对加载与保存
    │   ├── schema-loader.ts        # Ajv + JSON Schema 验证
    │   ├── id-registry.ts          # ID 注册表读写与分配/退役逻辑
    │   ├── doc-id-map.ts           # source_path ↔ doc_id 映射管理
    │   └── content-scanner.ts      # content/ 目录扫描与哈希计算
    ├── allocate-id.ts              # CLI: 分配/退役 module_id / doc_id
    ├── generate-manifest.ts        # CLI: 扫描内容生成未签名 manifest
    ├── sign-manifest.ts            # CLI: 对未签名 manifest/op-list 添加 Ed25519 签名
    └── verify-manifest.ts          # CLI: 验证已签名 manifest/op-list 的签名
```

## CLI 命令

### 1. `allocate-id` — 分配或退役 ID

维护 `id-registry.json` 与 `doc-id-map-{type}.json`，是其他命令的前置依赖。

```bash
# 分配新模块
pnpm allocate-id module --english-short rust --name "Rust"

# 分配新文档
pnpm allocate-id doc \
  --module-id Model_Java_00 \
  --source-path "java/快速入门.md" \
  --title "快速入门" \
  --manifest-type full

# 退役模块（同时退役其下所有 active 文档）
pnpm allocate-id retire-module --module-id Model_Java_00

# 退役文档
pnpm allocate-id retire-doc --doc-id Doc_Java_00_005

# 文档改名（doc_id 不变，仅更新 doc-id-map 中的 source_path）
pnpm allocate-id rename-doc \
  --doc-id Doc_Java_00_001 \
  --new-source-path "java/intro.md" \
  --manifest-type full

# 列出所有 ID
pnpm allocate-id list
```

### 2. `generate-manifest` — 扫描生成未签名 manifest

扫描 `content/{type}/` 目录，结合 `id-registry` 与 `doc-id-map`，输出未签名 manifest。

```bash
# 生成 full manifest（默认）
pnpm generate-manifest --type full

# 生成 mobile manifest，指定 app_compat_version
pnpm generate-manifest --type mobile --app-compat-version 3.1.0

# 通过 modules-meta 文件覆盖模块中文名、icon、color、description
pnpm generate-manifest --type full --modules-meta metadata/modules.json
```

**输出路径**：`dist/manifests/{type}.manifest.unsigned.json`

**约束**：
- 不在运行时分配 ID，所有 doc_id 必须已在 `id-registry` 中分配且 `active`
- 所有 source_path 必须能在 `doc-id-map-{type}` 中找到映射
- 输出文件不含 `signature` 字段，需后续 `sign-manifest` 完成签名

### 3. `sign-manifest` — Ed25519 签名

读取未签名 manifest / op-list，使用私钥计算 Ed25519 签名，输出已签名文件。

```bash
# 签名 full manifest（默认）
pnpm sign-manifest --type full

# 签名 op-list
pnpm sign-manifest --data-type op-list --type full \
  --input dist/op-lists/full.op-list.unsigned.json

# 指定密钥目录（默认 ~/.fandex/keys/）
pnpm sign-manifest --type mobile --keys-dir ~/.fandex/keys/

# 调试模式：跳过 Schema 验证
pnpm sign-manifest --type full --skip-schema-validate
```

**密钥加载优先级**：
1. 环境变量 `FANDEX_PRIVATE_KEY` / `FANDEX_PUBLIC_KEY`（CI 推荐）
2. 本地文件 `~/.fandex/keys/private-key.hex` / `public-key.hex`
3. 仓库内 `tools/keys/public-key.hex`（仅公钥）

**输出路径**：
- `dist/manifests/{type}.manifest.json`
- `dist/op-lists/{type}.op-list.json`

### 4. `verify-manifest` — 验证签名

验证已签名 manifest / op-list 的 Ed25519 签名，可选执行 Schema 验证。

```bash
# 验证 full manifest（默认）
pnpm verify-manifest --type full

# 验证 op-list
pnpm verify-manifest --data-type op-list --type full

# 指定公钥（覆盖文件/环境变量加载）
pnpm verify-manifest --type full --public-key <64字符hex>

# 仅验签，跳过 Schema 验证
pnpm verify-manifest --type full --skip-schema-validate
```

**公钥加载优先级**：
1. 命令行参数 `--public-key`
2. 环境变量 `FANDEX_PUBLIC_KEY`
3. 本地文件 `~/.fandex/keys/public-key.hex`
4. 仓库内 `tools/keys/public-key.hex`

**退出码**：
- `0`：验签成功
- `1`：参数错误、文件不存在、Schema 验证失败、签名不匹配

## 环境要求

- **Node.js**：`>= 24.0.0`（`engines` 约束，低于此版本会产生 `EBADENGINE` 警告，可能运行但不保证）
- **TypeScript**：`>= 5.7.0`
- **运行时**：通过 `tsx` 直接运行 ESM TypeScript，无需预编译

## 开发命令

```bash
# 安装依赖
npm install

# 类型检查（不输出文件）
npm run typecheck

# 编译为 JS（输出到 dist/，主要用于调试）
npm run build

# 运行单元测试（待补充）
npm test
```

## 关键设计要点

### 1. 规范化 JSON 序列化

`lib/canonical-json.ts` 实现规范化序列化，规则：
- 递归按 JSON key 字典序排序（仅对象，数组保持原序）
- 紧凑 JSON 输出（无空白字符）
- 数字格式：整数无小数点，浮点数保留必要精度
- 字符串转义：标准 JSON 转义（`\n`、`\t`、`\\`、`\"`、`\uXXXX`）

**跨语言对齐**：TS 端按 UTF-16 code unit 字典序排序，与 Kotlin 的 `String.compareTo` 一致。Kotlin 端需实现等价的规范化逻辑，通过 `shared/fixtures/` 中的黄金测试集验证字节流一致性。

### 2. ID 分配规则

- **模块 ID**：`Model_<EnglishShort>_<NN>`，如 `Model_Java_00`
  - `EnglishShort`：小写字母+数字，首字符为字母
  - `NN`：两位数字编号（00-99），扫描最小未占用值
- **文档 ID**：`Doc_<EnglishShort>_<NN>_<NNN>`，如 `Doc_Java_00_001`
  - `NNN`：三位数字编号（001-999），在所属模块下扫描最小未占用值
- **退役规则**：retired 后永久封存，编号不复用，状态不可逆

### 3. 签名流程

```
未签名 manifest ──sign-manifest──> 已签名 manifest
        │                                  │
        │ 读取                              │ 写入
        ▼                                  ▼
dist/manifests/{type}.manifest.unsigned.json
                                          │
                                          ▼
                              dist/manifests/{type}.manifest.json
                              （含 signature 字段）
```

签名对象为 manifest 中除 `signature` 字段外的所有字段，规范化序列化为 UTF-8 字节流后做 Ed25519 签名。`signature` 字段结构：

```json
{
  "algorithm": "EdDSA",
  "public_key_fingerprint": "16字符hex（公钥SHA-256前16位）",
  "value": "base64编码的签名值"
}
```

### 4. 密钥管理

- **私钥**：仅存本地 `~/.fandex/keys/private-key.hex`，**严禁入库**
- **公钥**：可公开，存于仓库 `tools/keys/public-key.hex`，客户端内置
- **CI 环境**：通过 GitHub Secrets 注入 `FANDEX_PRIVATE_KEY`，不落盘
- **密钥轮换**：公钥指纹写入 manifest，客户端通过 `public_key_fingerprint` 比对，支持密钥轮换场景

## 与其他模块的关系

| 模块 | 关系 |
|------|------|
| `shared/` | 提供 JSON Schema 与 fixtures，工具链通过 `schema-loader` 加载并验证 |
| `content/full/` | full manifest 的物理内容源，由 `content-scanner` 扫描 |
| `content/mobile/` | mobile manifest 的物理内容源 |
| `id-registry.json` | 工具链内部状态文件，位于仓库根，git 跟踪 |
| `doc-id-map-{type}.json` | 工具链内部状态文件，位于仓库根，git 跟踪 |
| `dist/manifests/` | 工具链输出目录，CI 构建产物，**不入库**（gitignore 排除） |
| `desktop/` | Desktop 客户端，消费已签名 manifest 与 op-list |
| `android/` | Android 客户端，消费已签名 manifest 与 op-list |
| `.github/workflows/` | CI 流水线，调用工具链 CLI 完成自动化构建与发布 |

## 安全注意事项

1. **私钥不入库**：`tools/keys/` 目录仅存放公钥，`.gitignore` 必须排除 `private-key.hex`
2. **CI 密钥注入**：GitHub Actions 通过 `secrets.FANDEX_PRIVATE_KEY` 注入，日志自动脱敏
3. **签名算法固定**：仅支持 `EdDSA`（Ed25519），不支持其他算法，防止算法降级攻击
4. **公钥指纹校验**：客户端验签时需同时校验 `public_key_fingerprint` 与内置公钥列表匹配
5. **Schema 验证不跳过**：生产环境签名与验签必须开启 Schema 验证，`--skip-schema-validate` 仅用于调试

## 故障排查

### 常见问题

**Q：`Cannot find module './lib/xxx'`**
A：CLI 入口位于 `src/`，lib 模块位于 `src/lib/`，导入路径必须用 `./lib/`（不能用 `../lib/`）。

**Q：`EBADENGINE Unsupported engine`**
A：Node.js 版本低于 24.0.0。可升级 Node.js 或忽略警告（功能可能正常但不保证）。

**Q：签名验证失败，但文件未被篡改**
A：可能原因：
1. 公钥不匹配（密钥已轮换但客户端未更新内置公钥列表）
2. 规范化 JSON 实现差异（TS 与 Kotlin 字节流不一致，需通过 fixtures 对齐）
3. 签名时使用了不同的私钥

**Q：`generate-manifest` 报错"doc_id 未分配"**
A：所有文档必须先通过 `allocate-id doc` 分配 doc_id 并写入 `id-registry`，否则 `generate-manifest` 拒绝生成 manifest。

**Q：`allocate-id doc` 报错"source_path 已被占用"**
A：同一 `manifest_type` 下，一个 source_path 只能映射到一个 doc_id。若需改名，使用 `rename-doc` 子命令而非重新分配。
