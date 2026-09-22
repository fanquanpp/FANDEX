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

class UpdateDownloader(
    private val context: Context,
    private val okHttpClient: OkHttpClient
) {

    private val fileName = "FANDEX-update.apk"

    suspend fun download(
        url: String,
        onProgress: (progress: Int, downloadedBytes: Long, totalBytes: Long) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        var outputFile: File? = null
        try {
            val downloadDir = File(context.cacheDir, "downloads")
            if (!downloadDir.exists()) {
                downloadDir.mkdirs()
            }

            outputFile = File(downloadDir, fileName)
            if (outputFile.exists()) {
                outputFile.delete()
            }

            val client = okHttpClient.newBuilder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .callTimeout(0, TimeUnit.MILLISECONDS)
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

                val totalBytes = resp.body.contentLength()

                val source = resp.body.byteStream()

                FileOutputStream(outputFile).use { sink ->
                    val buffer = ByteArray(8 * 1024)
                    var downloadedBytes = 0L
                    var lastReportTime = System.currentTimeMillis()
                    var lastReportedBytes = 0L

                    while (true) {
                        if (!isActive) {
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

                    if (lastReportedBytes < downloadedBytes) {
                        val progress = if (totalBytes > 0) 100 else -1
                        onProgress(progress, downloadedBytes, totalBytes)
                    }
                }

                if (totalBytes > 0 && outputFile.length() != totalBytes) {
                    outputFile.delete()
                    return@withContext Result.failure(IOException("下载文件校验失败：大小不匹配"))
                }
            }

            Result.success(outputFile)
        } catch (e: IOException) {
            outputFile?.takeIf { it.exists() }?.delete()
            Result.failure(IOException("下载失败：${e.message ?: "网络异常"}"))
        } catch (e: Exception) {
            outputFile?.takeIf { it.exists() }?.delete()
            Result.failure(IOException("下载失败：${e.message ?: "未知错误"}"))
        }
    }
}
