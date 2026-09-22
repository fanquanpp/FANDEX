package com.fandex.app.update

import android.content.Context
import com.fandex.app.BuildConfig
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.util.concurrent.TimeUnit

class UpdateChecker(
    private val context: Context,
    private val okHttpClient: OkHttpClient,
    private val gson: Gson
) {

    private val latestReleaseUrl: String
        get() = BuildConfig.GITHUB_API_URL

    suspend fun checkLatestRelease(): Result<UpdateInfo> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(latestReleaseUrl)
                .header("User-Agent", "FANDEX-App/${BuildConfig.VERSION_NAME} (Android)")
                .header("Accept", "application/vnd.github+json")
                .get()
                .build()

            val client = ensureTimeouts(okHttpClient)

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

                val release: GitHubRelease = try {
                    gson.fromJson(body, GitHubRelease::class.java)
                } catch (e: Exception) {
                    return@withContext Result.failure(
                        IOException("服务器响应格式异常：${e.message}")
                    )
                }

                val updateInfo = mapToUpdateInfo(release)
                Result.success(updateInfo)
            }
        } catch (e: IOException) {
            Result.failure(IOException("网络连接失败，请检查网络后重试"))
        } catch (e: Exception) {
            Result.failure(IOException("检查更新失败：${e.message}"))
        }
    }

    private fun ensureTimeouts(client: OkHttpClient): OkHttpClient {
        return client.newBuilder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .callTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    private fun mapToUpdateInfo(release: GitHubRelease): UpdateInfo {
        val latestVersion = parseVersionName(release.tagName)

        val apkAsset = release.assets.firstOrNull { asset ->
            asset.name.startsWith("FANDEX-Legacy-v", ignoreCase = true) &&
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

    private fun parseVersionName(tagName: String): String {
        return tagName.removePrefix("v").removePrefix("V").trim()
    }

    private fun computeVersionCode(version: String): Int {
        val parts = version.split(".").map { part ->
            part.filter { it.isDigit() }.toIntOrNull() ?: 0
        }
        val major = parts.getOrNull(0) ?: 0
        val minor = parts.getOrNull(1) ?: 0
        val patch = parts.getOrNull(2) ?: 0
        return major * 10000 + minor * 100 + patch
    }

    companion object {
        val DefaultClient: OkHttpClient = OkHttpClient()
    }
}
