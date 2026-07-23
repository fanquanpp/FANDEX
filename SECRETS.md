# FANDEX GitHub Secrets 配置清单

本文档列出 FANDEX 单仓库在 GitHub Actions 中所需配置的全部 Secrets，包含生成方式、用途说明与配置步骤。

## Secrets 总览

共 **8 个** Secrets，按用途分为三组：

| 分组 | Secret 名称 | 用途 | 必填 |
|------|-------------|------|------|
| Manifest 签名 | `FANDEX_PRIVATE_KEY` | Ed25519 私钥，签名 content manifest | 是 |
| Manifest 签名 | `FANDEX_PUBLIC_KEY` | Ed25519 公钥，验证 manifest 签名 | 是 |
| Tauri 更新签名 | `TAURI_PRIVATE_KEY` | Tauri updater 签名私钥（签名 Windows 更新包） | 是 |
| Tauri 更新签名 | `TAURI_KEY_PASSWORD` | Tauri updater 私钥密码 | 是（如私钥有密码） |
| Android 签名 | `FANDEX_KEYSTORE_BASE64` | Android keystore 文件（base64 编码） | 是 |
| Android 签名 | `FANDEX_KEYSTORE_PASSWORD` | keystore 文件密码 | 是 |
| Android 签名 | `FANDEX_KEY_PASSWORD` | keystore 中 key 的密码 | 是 |
| Android 签名 | `FANDEX_KEY_ALIAS` | keystore 中 key 的别名 | 是 |

> `GITHUB_TOKEN` 由 GitHub 自动注入，无需手动配置。

---

## 1. Manifest 签名密钥（Ed25519）

### 用途

`content-manifest.yml` workflow 使用此密钥对对 `content/full/` 与 `content/mobile/` 生成的 manifest 进行 Ed25519 签名，确保文档热更新分发的完整性与不可篡改性。

- **私钥**：仅本地保存与 CI Secrets，**严禁入库**
- **公钥**：可公开，客户端通过公钥验证 manifest 签名

### 生成方式

在本地执行（需先完成阶段8 的 tools 工具链初始化）：

```powershell
cd c:\Atian\Project\Trae\FANDEX-pj\FANDEX\tools
npm install
# 生成密钥对到 ~/.fandex/keys/ 目录
node --experimental-strip-types src/lib/key-manager.ts
# 或者使用专门的生成脚本（阶段8 会实现）
```

生成后会得到两个文件：
- `~/.fandex/keys/private-key.hex` — 64 字符 hex 编码私钥
- `~/.fandex/keys/public-key.hex` — 64 字符 hex 编码公钥

### 配置步骤

1. 读取私钥内容（仅 hex 字符串，不含换行）：
   ```powershell
   Get-Content "$env:USERPROFILE\.fandex\keys\private-key.hex" -Raw
   ```
2. 在 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret
3. 名称：`FANDEX_PRIVATE_KEY`，值：粘贴私钥 hex 字符串
4. 重复上述步骤配置 `FANDEX_PUBLIC_KEY`（公钥同样存为 Secret，避免 CI 中明文出现在日志）

### 验证

配置完成后，可手动触发 `content-manifest.yml` workflow 验证签名流程是否正常。

---

## 2. Tauri Updater 签名密钥

### 用途

`desktop-release.yml` workflow 使用此密钥对 Windows 安装包（NSIS .exe）进行签名，生成 `.sig` 签名文件。客户端通过 Tauri updater 协议（`latest.json` + `.sig`）验证更新包完整性。

### 生成方式

使用 Tauri CLI 生成：

```powershell
cd c:\Atian\Project\Trae\FANDEX-pj\FANDEX\desktop
pnpm install
pnpm tauri signer generate -w C:\Atian\Project\Trae\FANDEX-pj\FANDEX\tools\keys\tauri-private.key
```

执行时会提示输入密码（可留空，但建议设置密码以增强安全性）。

生成后会得到：
- `tools/keys/tauri-private.key` — 私钥文件（**严禁入库**，已在 .gitignore 排除）
- 公钥会输出到控制台，需保存到 `desktop/src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey` 字段

### 配置步骤

1. 读取私钥内容：
   ```powershell
   Get-Content "c:\Atian\Project\Trae\FANDEX-pj\FANDEX\tools\keys\tauri-private.key" -Raw
   ```
2. 在 GitHub 仓库 → Settings → Secrets → New repository secret
3. 名称：`TAURI_PRIVATE_KEY`，值：粘贴私钥完整内容
4. 名称：`TAURI_KEY_PASSWORD`，值：生成时设置的密码（如未设密码可填空字符串）

### 配置公钥到 tauri.conf.json

将生成的公钥（以 `dW50cnVzdGVkIGNvbW1l...` 开头的 base64 字符串）填入：

```json
{
  "plugins": {
    "updater": {
      "pubkey": "<这里粘贴公钥>"
    }
  }
}
```

文件路径：`desktop/src-tauri/tauri.conf.json`

---

## 3. Android 签名 Keystore

### 用途

`android-release.yml` workflow 使用此 keystore 对 release APK 进行签名，确保 APK 来源可信且可升级（同一签名允许覆盖安装升级）。

### 生成方式

使用 keytool 生成（JDK 自带）：

```powershell
keytool -genkeypair `
  -keystore "c:\Atian\Project\Trae\FANDEX-pj\FANDEX\android\fandex-release.jks" `
  -alias fandex `
  -keyalg RSA `
  -keysize 2048 `
  -validity 36500 `
  -storepass "<your-store-password>" `
  -keypass "<your-key-password>"
```

参数说明：
- `-alias fandex` — key 别名（建议保持 `fandex`）
- `-keysize 2048` — RSA 2048 位（Android 标准要求）
- `-validity 36500` — 100 年有效期（避免过期导致无法升级）

执行后会在 `android/fandex-release.jks` 生成 keystore 文件。

### 配置步骤

#### 3.1 将 keystore 文件 base64 编码

```powershell
$bytes = [System.IO.File]::ReadAllBytes("c:\Atian\Project\Trae\FANDEX-pj\FANDEX\android\fandex-release.jks")
$base64 = [System.Convert]::ToBase64String($bytes)
$base64 | Set-Content -NoNewline "$env:TEMP\fandex-keystore-base64.txt"
Write-Host "Base64 编码已保存到 $env:TEMP\fandex-keystore-base64.txt"
Write-Host "文件大小: $((Get-Item "$env:TEMP\fandex-keystore-base64.txt").Length) 字符"
```

#### 3.2 在 GitHub 配置 4 个 Secrets

在 GitHub 仓库 → Settings → Secrets → New repository secret：

| Secret 名称 | 值 | 说明 |
|--------------|-----|------|
| `FANDEX_KEYSTORE_BASE64` | `$env:TEMP\fandex-keystore-base64.txt` 文件内容 | base64 编码后的 keystore 文件 |
| `FANDEX_KEYSTORE_PASSWORD` | `<your-store-password>` | keystore 文件密码 |
| `FANDEX_KEY_PASSWORD` | `<your-key-password>` | key 的密码（通常与 store 密码相同） |
| `FANDEX_KEY_ALIAS` | `fandex` | key 别名 |

### 本地开发配置

本地构建时，CI Secrets 不可用，需通过 `android/local.properties` 注入（已在 .gitignore 排除）：

```properties
# android/local.properties
sdk.dir=C\:\\Users\\<your-username>\\AppData\\Local\\Android\\Sdk
storePassword=<your-store-password>
keyPassword=<your-key-password>
keyAlias=fandex
```

---

## 安全注意事项

1. **私钥永不入库**：所有私钥、keystore、.env 文件已在根 `.gitignore` 中排除
2. **本地密钥目录**：`~/.fandex/keys/` 与 `tools/keys/` 仅本地保存，不通过 Git 同步
3. **密钥备份**：建议将私钥文件加密备份到离线存储（如 USB 加密盘），丢失后无法补发（Ed25519 密钥对具有唯一性）
4. **密钥轮换**：如怀疑密钥泄露，需立即生成新密钥对，更新所有 Secrets，并在客户端发布新版本内置新公钥
5. **权限最小化**：GitHub Actions 的 `permissions` 字段已按最小权限原则配置（仅 `contents: write`、`pages: write`、`id-token: write`）

## 故障排查

### Q1: content-manifest.yml 报错 "私钥未找到"

- 检查 `FANDEX_PRIVATE_KEY` Secret 是否配置
- 检查值是否为 64 字符 hex 编码（不含换行符）
- 检查是否意外包含了文件末尾的换行符

### Q2: desktop-release.yml 报错 "Tauri signer key not found"

- 检查 `TAURI_PRIVATE_KEY` Secret 是否配置
- 检查 `tauri.conf.json` 中的 `pubkey` 字段是否填入公钥
- 如私钥有密码，检查 `TAURI_KEY_PASSWORD` 是否正确

### Q3: android-release.yml 报错 "keystore file not found"

- 检查 `FANDEX_KEYSTORE_BASE64` Secret 是否配置
- 检查 base64 内容是否完整（不包含 PowerShell 输出的换行符）
- 本地验证：将 base64 内容解码后与原 .jks 文件比较 sha256

### Q4: APK 签名不一致导致无法升级

- 确保 keystore 文件未更换（同一应用必须使用同一 keystore 签名）
- 检查 `FANDEX_KEY_ALIAS` 是否与历史版本一致
- 如需更换 keystore，需让用户先卸载旧版本再安装新版本

---

## 配置完成检查清单

配置完所有 8 个 Secrets 后，按顺序手动触发以下 workflow 验证：

- [ ] 触发 `content-manifest.yml`（workflow_dispatch）→ 验证 manifest 生成与签名
- [ ] 触发 `web-deploy.yml`（workflow_dispatch）→ 验证 Web 站点部署
- [ ] 触发 `desktop-release.yml`（workflow_dispatch，version=3.1.1）→ 验证 Windows 安装包构建
- [ ] 触发 `android-release.yml`（workflow_dispatch，version=3.7.1）→ 验证 APK 构建与签名
- [ ] 等待 `archive-cleanup.yml` 下一次定时触发（或手动触发）→ 验证归档清理

所有 workflow 通过后，Secrets 配置即视为完成。
