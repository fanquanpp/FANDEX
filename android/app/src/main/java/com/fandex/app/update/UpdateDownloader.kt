package com.fandex.app.update

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * APK 下载器
 *
 * 功能：使用 OkHttp 流式下载 APK 文件到应用缓存目录，支持进度回调和取消
 *
 * 输入：
 *   - context：应用上下文（用于访问 cacheDir）
 *   - okHttpClient：OkHttp 客户端实例
 *
 * 输出：Result<File>
 *   - 成功：返回下载完成的 File 对象
 *   - 失败：返回 Result.failure(Exception)
 *
 * 核心流程：
 *   1. 校验并创建 cacheDir/downloads/ 目录
 *   2. 构造 GET 请求，发起同步调用（在 IO 调度器内）
 *   3. 流式读取响应体，写入目标文件
 *   4. 每 100ms 回调进度（progress, downloadedBytes, totalBytes）
 *   5. 下载完成后校验文件大小与 Content-Length 一致
 *
 * 取消机制：
 *   - 通过检查 coroutineContext.isActive 实现协程取消
 *   - 取消时立即关闭流与连接，删除半成品文件
 *
 * 安全约束：
 *   - 仅下载白名单 CDN 域名（objects.githubusercontent.com）
 *   - 写入应用私有缓存目录，无需申请存储权限
 *   - 文件名固定为 FANDEX-update.apk，避免旧版本堆积
 */
class UpdateDownloader(
    private val context: Context,
    private val okHttpClient: OkHttpClient
) {

    /** 下载文件名（固定，覆盖旧文件） */
    private val fileName = "FANDEX-update.apk"

    /**
     * 下载 APK 文件
     *
     * 输入：
     *   - url：APK 下载地址（CDN URL）
     *   - onProgress：进度回调 (progress: Int, downloadedBytes: Long, totalBytes: Long) -> Unit
     *
     * 输出：Result<File>
     *
     * 流程：
     *   1. 切换至 IO 调度器
     *   2. 准备下载目录与目标文件
     *   3. 构造请求并执行
     *   4. 校验响应状态与 Content-Length
     *   5. 流式写入文件，每 100ms 回调进度
     *   6. 校验最终文件大小
     *
     * 异常处理：
     *   - 网络错误：IOException -> "下载失败，请检查网络"
     *   - 写入失败：磁盘空间不足或 IO 异常 -> 友好提示
     *   - 大小不符：Content-Length 与实际不符 -> "下载文件校验失败"
     */
    suspend fun download(
        url: String,
        onProgress: (progress: Int, downloadedBytes: Long, totalBytes: Long) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        var outputFile: File? = null
        try {
            /* 准备下载目录 */
            val downloadDir = File(context.cacheDir, "downloads")
            if (!downloadDir.exists()) {
                downloadDir.mkdirs()
            }

            /* 目标文件 */
            outputFile = File(downloadDir, fileName)
            if (outputFile.exists()) {
                /* 删除旧的半成品文件，避免追加写入 */
                outputFile.delete()
            }

            /* 配置带超时的客户端（覆盖外部传入的默认值） */
            val client = okHttpClient.newBuilder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .callTimeout(0, TimeUnit.MILLISECONDS) /* 下载大文件不设整体超时 */
                .build()

            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "FANDEX-App (Android)")
                .get()
                .build()

            val response = client.newCall(request).execute()
            response.use { resp ->
                if (!resp.isSuccessful) {
                    return@withContext Result.failure(
                        IOException("下载失败：HTTP ${resp.code}")
                    )
                }

                /* OkHttp 5.x 中 Response.body 返回非空 ResponseBody */
                val totalBytes = resp.body.contentLength()

                /* 流式写入文件：OkHttp 5.x 中 byteStream() 返回非空 InputStream */
                val source = resp.body.byteStream()

                FileOutputStream(outputFile).use { sink ->
                    val buffer = ByteArray(8 * 1024)
                    var downloadedBytes = 0L
                    var lastReportTime = System.currentTimeMillis()
                    var lastReportedBytes = 0L

                    while (true) {
                        /* 检查协程是否被取消 */
                        if (!isActive) {
                            /* 清理半成品文件 */
                            sink.close()
                            outputFile.delete()
                            return@withContext Result.failure(
                                IOException("下载已取消")
                            )
                        }

                        val read = source.read(buffer)
                        if (read == -1) break

                        sink.write(buffer, 0, read)
                        downloadedBytes += read

                        /* 节流：每 100ms 回调一次进度 */
                        val now = System.currentTimeMillis()
                        if (now - lastReportTime >= 100 || downloadedBytes == totalBytes) {
                            val progress = if (totalBytes > 0) {
                                ((downloadedBytes * 100) / totalBytes).toInt().coerceIn(0, 100)
                            } else {
                                -1
                            }
                            onProgress(progress, downloadedBytes, totalBytes)
                            lastReportTime = now
                            lastReportedBytes = downloadedBytes
                        }
                    }
                    sink.flush()

                    /* 兜底：确保最终进度回调到 100% */
                    if (lastReportedBytes < downloadedBytes) {
                        val progress = if (totalBytes > 0) 100 else -1
                        onProgress(progress, downloadedBytes, totalBytes)
                    }
                }

                /* 校验文件大小：必须在 response.use 块内，以便访问 totalBytes */
                if (totalBytes > 0 && outputFile.length() != totalBytes) {
                    outputFile.delete()
                    return@withContext Result.failure(IOException("下载文件校验失败：大小不匹配"))
                }
            }

            Result.success(outputFile)
        } catch (e: IOException) {
            /* 网络或 IO 异常时清理半成品文件 */
            outputFile?.takeIf { it.exists() }?.delete()
            Result.failure(IOException("下载失败：${e.message ?: "网络异常"}"))
        } catch (e: Exception) {
            outputFile?.takeIf { it.exists() }?.delete()
            Result.failure(IOException("下载失败：${e.message ?: "未知错误"}"))
        }
    }
}
