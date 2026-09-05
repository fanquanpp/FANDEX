package com.fandex.app.update

import android.content.Context
import com.fandex.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * 更新检查器
 *
 * 功能：调用 GitHub Releases API 检查最新版本，对比当前版本号判断是否有更新可用
 *
 * 输入：
 *   - context：应用上下文（保留构造参数以维持调用方兼容性）
 *   - okHttpClient：OkHttp 客户端实例（由调用方注入，生产环境使用共享单例）
 *
 * 输出：Result<UpdateInfo>
 *   - 成功：返回 UpdateInfo（含最新版本号、下载地址、是否更新可用等）
 *   - 失败：返回 Result.failure(Exception)，异常消息可读
 *
 * 核心流程：
 *   1. 构造 GET 请求至 GitHub Releases API（URL 来自 BuildConfig.GITHUB_API_URL）
 *   2. 设置 User-Agent 与 Accept 头（GitHub API 强制要求）
 *   3. 使用 kotlinx.serialization 解析 JSON 响应为 GitHubRelease 模型
 *   4. 从 assets 列表中查找 FANDEX-*.apk 附件作为下载目标
 *   5. 将 GitHubRelease 转换为应用内 UpdateInfo
 *   6. 版本对比：解析 "v3.0.0" 与 BuildConfig.VERSION_NAME 比较大小
 *
 * 安全约束：
 *   - 仅访问白名单域名（api.github.com），符合 network_security_config.xml 配置
 *   - 依赖 GitHub 公开仓库的匿名 API 限额（60 次/小时/IP）
 */
class UpdateChecker(
    @Suppress("unused") private val context: Context,
    private val okHttpClient: OkHttpClient
) {

    /** JSON 解码器：忽略未知字段，容忍宽松输入（与仓库层 Decoder 配置一致） */
    private val decoder = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    /**
     * 检查最新版本
     *
     * 输入：无（自动从 BuildConfig 读取当前版本号）
     * 输出：Result<UpdateInfo>
     *
     * 流程：
     *   1. 切换至 IO 调度器，避免阻塞主线程
     *   2. 构造 OkHttp Request，附 User-Agent 与 Accept 头
     *   3. 发起同步请求（在 IO 调度器内）
     *   4. 校验 HTTP 状态码
     *   5. 解析响应体为 GitHubRelease
     *   6. 转换为 UpdateInfo 并返回
     *
     * 异常映射：所有异常统一包装为可读消息后返回 Result.failure
     */
    suspend fun checkLatestRelease(): Result<UpdateInfo> = withContext(Dispatchers.IO) {
        try {
            /* 构造 HTTP 请求 */
            val request = Request.Builder()
                .url(BuildConfig.GITHUB_API_URL)
                .header("User-Agent", "FANDEX-App/${BuildConfig.VERSION_NAME} (Android)")
                .header("Accept", "application/vnd.github+json")
                .get()
                .build()

            /* 确保客户端使用合适的超时配置（复用外部实例的连接池） */
            val client = ensureTimeouts(okHttpClient)

            /* 发起同步请求（在 IO 调度器中阻塞调用是安全的） */
            val response = client.newCall(request).execute()
            response.use { resp ->
                if (!resp.isSuccessful) {
                    return@withContext Result.failure(
                        IOException("GitHub 服务异常：HTTP ${resp.code}")
                    )
                }

                val body = resp.body.string()
                if (body.isEmpty()) {
                    return@withContext Result.failure(IOException("服务器响应为空"))
                }

                /* 解析 JSON 为 GitHubRelease 模型（kotlinx.serialization） */
                val release: GitHubRelease = try {
                    decoder.decodeFromString(body)
                } catch (e: Exception) {
                    return@withContext Result.failure(
                        IOException("服务器响应格式异常：${e.message}")
                    )
                }

                /* 转换为应用内 UpdateInfo */
                Result.success(mapToUpdateInfo(release))
            }
        } catch (e: IOException) {
            Result.failure(IOException("网络连接失败，请检查网络后重试"))
        } catch (e: Exception) {
            Result.failure(IOException("检查更新失败：${e.message}"))
        }
    }

    /**
     * 确保 OkHttpClient 配置了合适的超时时间
     *
     * 设计说明：
     * - 通过 newBuilder() 复用外部实例的连接池与拦截器配置，仅覆盖超时
     */
    private fun ensureTimeouts(client: OkHttpClient): OkHttpClient {
        return client.newBuilder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .callTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    /**
     * 将 GitHubRelease 转换为应用内 UpdateInfo
     *
     * 流程：
     *   1. 从 tagName 解析最新版本号（去 "v" 前缀）
     *   2. 从 assets 列表中查找 FANDEX-*.apk 附件
     *   3. 计算版本码并对比当前版本判断是否更新可用
     *
     * 异常处理：
     *   - 若 assets 为空或找不到 APK：抛出 IllegalStateException 提示用户
     *     （使用 IllegalStateException 而非 IOException，使其被外层 Exception catch 捕获，
     *      保留原始业务错误消息，避免被误归类为"网络连接失败"）
     */
    private fun mapToUpdateInfo(release: GitHubRelease): UpdateInfo {
        val latestVersion = parseVersionName(release.tagName)

        /* 优先查找新版主线命名 FANDEX-v*.apk，其次兼容历史 FANDEX-Legacy-v*.apk */
        val apkAsset = release.assets.firstOrNull { asset ->
            asset.name.startsWith("FANDEX", ignoreCase = true) &&
                asset.name.endsWith(".apk", ignoreCase = true)
        } ?: throw IllegalStateException("未找到可下载的 APK 文件")

        val currentVersion = BuildConfig.VERSION_NAME
        val latestCode = computeVersionCode(latestVersion)
        val currentCode = computeVersionCode(currentVersion)
        val isUpdateAvailable = latestCode > currentCode

        return UpdateInfo(
            latestVersion = latestVersion,
            latestVersionCode = latestCode,
            downloadUrl = apkAsset.downloadUrl,
            downloadSize = apkAsset.size,
            releaseNotes = release.body,
            publishedAt = release.publishedAt,
            htmlUrl = release.htmlUrl,
            isUpdateAvailable = isUpdateAvailable
        )
    }

    companion object {
        /**
         * OkHttpClient 默认单例（全应用共享）
         *
         * 设计说明：
         * - 复用连接池与线程池，避免每次请求重复创建客户端的开销
         * - 超时配置由 UpdateChecker / UpdateDownloader 通过 newBuilder() 覆盖
         */
        val DefaultClient: OkHttpClient = OkHttpClient()

        /**
         * 解析版本名，去除 "v" 或 "V" 前缀
         *
         * 输入：原始 tagName，如 "v3.0.0" / "V3.0.0" / "3.0.0"
         * 输出：纯版本号字符串，如 "3.0.0"
         *
         * 暴露为 internal 供单元测试覆盖（任务 E：版本比较逻辑测试）
         */
        internal fun parseVersionName(tagName: String): String {
            // 先剥离首尾空白再剥 "v" 前缀，保证 " v3.0.0 " 等带空白输入也能正确解析
            return tagName.trim().removePrefix("v").removePrefix("V").trim()
        }

        /**
         * 计算版本码
         *
         * 输入：版本号字符串，如 "3.0.0"
         * 输出：整数版本码（major * 10000 + minor * 100 + patch）
         *
         * 设计说明：
         * - 将语义化版本号转换为可比较的整数
         * - 假定每段不超过 99，足以覆盖常规版本管理
         * - 若某段无法解析为整数，按 0 处理
         *
         * 示例：
         *   "3.0.0"  -> 30000
         *   "3.1.5"  -> 30105
         *   "3.1.10" -> 30110
         *   "10.2.3" -> 100203
         *
         * 暴露为 internal 供单元测试覆盖（任务 E：版本比较逻辑测试）
         */
        internal fun computeVersionCode(version: String): Int {
            val parts = version.split(".").map { part ->
                part.filter { it.isDigit() }.toIntOrNull() ?: 0
            }
            val major = parts.getOrNull(0) ?: 0
            val minor = parts.getOrNull(1) ?: 0
            val patch = parts.getOrNull(2) ?: 0
            return major * 10000 + minor * 100 + patch
        }
    }
}
