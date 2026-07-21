package com.fandex.app.update

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.fandex.app.BuildConfig
import com.google.gson.Gson
import okhttp3.OkHttpClient
import java.io.IOException

/**
 * 更新检查 Worker（WorkManager 后台任务）
 *
 * 功能：在后台静默检查 GitHub Releases，发现新版本时显示通知
 *
 * 使用场景：
 *   - 应用启动后 5s 静默检查的备选方案（实际启动检查推荐在 SplashActivity/HomeActivity 中通过 LaunchedEffect 实现）
 *   - 周期性后台检查（每日一次，由调用方通过 PeriodicWorkRequest 调度）
 *
 * 输入：
 *   - context：应用上下文（由 WorkManager 注入）
 *   - params：Worker 参数（由 WorkManager 注入）
 *
 * 输出：Result
 *   - Result.success()：检查完成（无论是否发现新版本）
 *   - Result.failure()：检查失败（致命错误，不再重试）
 *   - Result.retry()：网络错误等可重试场景
 *
 * 设计原则：
 *   - 通过 WorkManager 自动初始化（无需修改 AndroidManifest）
 *   - 通知点击跳转 Release 页面（htmlUrl），用户可手动下载
 *   - POST_NOTIFICATIONS 权限在 Android 13+ 需运行时申请，
 *     Worker 中静默处理权限不足的情况（通知无法显示时不报错）
 *
 * 调度示例：
 *   val request = PeriodicWorkRequestBuilder<UpdateCheckWorker>(1, TimeUnit.DAYS).build()
 *   WorkManager.getInstance(context).enqueueUniquePeriodicWork(
 *       "fandex_update_check",
 *       ExistingPeriodicWorkPolicy.KEEP,
 *       request
 *   )
 */
class UpdateCheckWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        /** 日志 TAG */
        private const val TAG = "UpdateCheckWorker"
    }

    /** 通知渠道 ID */
    private val channelId = "fandex_update_channel"

    /** 通知 ID（固定值，避免重复通知） */
    private val notificationId = 1001

    /**
     * 后台执行检查逻辑
     *
     * 流程：
     *   1. 创建 OkHttpClient 与 Gson 实例
     *   2. 实例化 UpdateChecker 调用 checkLatestRelease()
     *   3. 若有新版本可用：发送通知
     *   4. 若无更新：静默返回 success
     *
     * 返回值策略：
     *   - 网络异常：Result.retry() 让 WorkManager 按指数退避重试
     *   - 业务异常（解析失败/无 APK）：Result.failure() 不重试
     *   - 成功：Result.success()
     */
    override suspend fun doWork(): Result {
        return try {
            val context = applicationContext

            /* 使用 UpdateChecker.DefaultClient 共享单例，复用连接池与线程池 */
            val client = UpdateChecker.DefaultClient
            val gson = Gson()
            val checker = UpdateChecker(context, client, gson)

            val result = checker.checkLatestRelease()

            result.fold(
                onSuccess = { info ->
                    if (info.isUpdateAvailable) {
                        /* 发现新版本，发送通知 */
                        showUpdateNotification(info)
                    }
                    /* 无论是否有更新，都返回 success */
                    Result.success()
                },
                onFailure = { e ->
                    /* 检查失败：根据异常类型决定是否重试 */
                    if (e is IOException) {
                        Result.retry()
                    } else {
                        Result.failure()
                    }
                }
            )
        } catch (e: Exception) {
            /* 兜底异常处理，避免 Worker 崩溃 */
            if (e is IOException) Result.retry() else Result.failure()
        }
    }

    /**
     * 显示更新可用通知
     *
     * 输入：UpdateInfo 更新信息
     * 输出：无（创建通知渠道并发送通知）
     *
     * 流程：
     *   1. 创建通知渠道（Android 8.0+ 必需）
     *   2. 构造 PendingIntent，点击跳转 Release 页面
     *   3. 构造 NotificationCompat.Builder 通知
     *   4. 通过 NotificationManager.notify 发送
     *
     * 异常处理：
     *   - 通知权限缺失（Android 13+）：静默忽略
     *   - 通知渠道创建失败：catch 异常后静默
     */
    private fun showUpdateNotification(info: UpdateInfo) {
        try {
            val context = applicationContext
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
                as? NotificationManager ?: return

            /* 创建通知渠道（Android 8.0+） */
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "应用更新",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "FANDEX 应用更新检查通知"
                    enableVibration(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            /* 构造点击 Intent：跳转 Release 页面 */
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(info.htmlUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            /* 构造通知 */
            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("发现新版本 v${info.latestVersion}")
                .setContentText("点击查看更新详情并下载")
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .bigText(
                            "当前版本 v${BuildConfig.VERSION_NAME}\n" +
                                "最新版本 v${info.latestVersion}\n" +
                                "大小：${formatFileSize(info.downloadSize)}\n" +
                                "点击查看更新详情并下载"
                        )
                )
                .build()

            /* 发送通知 */
            notificationManager.notify(notificationId, notification)
        } catch (e: Exception) {
            Log.e(TAG, "发送更新通知失败: ${e.message}", e)
        }
    }

    /**
     * 格式化文件大小
     *
     * 输入：字节数
     * 输出：人类可读字符串，如 "12.34 MB"
     */
    private fun formatFileSize(bytes: Long): String {
        if (bytes <= 0) return "未知"
        val units = arrayOf("B", "KB", "MB", "GB")
        var size = bytes.toDouble()
        var unitIndex = 0
        while (size >= 1024 && unitIndex < units.lastIndex) {
            size /= 1024
            unitIndex++
        }
        return String.format("%.2f %s", size, units[unitIndex])
    }
}
