package com.fandex.app.update

import android.content.Context
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.fandex.app.BuildConfig
import com.fandex.app.data.prefs.readAutoCheckEnabledOnce
import com.fandex.app.data.prefs.readIgnoredVersionOnce
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * 更新检查 Worker（WorkManager 后台任务）
 *
 * 功能：在后台静默检查 GitHub Releases，发现新版本时显示通知
 *
 * 使用场景：
 *   - 每日一次的周期性后台检查（由 AppContainer 调度 PeriodicWorkRequest）
 *   - Worker 内部自行读取自动检查开关偏好：开关关闭时静默跳过，
 *     因此调度方可无条件注册任务，无需先读 DataStore
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
 *   - 通过 WorkManager 自动初始化（无需修改 AndroidManifest 的 provider 声明）
 *   - 通知点击跳转 Release 页面（htmlUrl），用户可手动下载
 *   - POST_NOTIFICATIONS 权限在 Android 13+ 需运行时申请，
 *     Worker 中静默处理权限不足的情况（通知无法显示时不报错）
 */
class UpdateCheckWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        /** 日志 TAG */
        private const val TAG = "UpdateCheckWorker"

        /** 唯一周期任务名（App 启动调度与 Worker 复用同一标识） */
        const val UNIQUE_WORK_NAME = "fandex_update_check"

        /**
         * 按开关调度每日一次的更新检查任务
         *
         * - enabled=true：注册唯一周期任务（KEEP 策略：已有任务不重复调度），
         *   附带网络约束，仅在联网状态下执行
         * - enabled=false：取消周期任务，避免开关关闭后仍空跑
         *
         * 供应用启动（FandexApp）与抽屉开关切换（UpdateViewModel）复用
         */
        fun scheduleDaily(context: Context, enabled: Boolean) {
            val workManager = WorkManager.getInstance(context)
            if (!enabled) {
                workManager.cancelUniqueWork(UNIQUE_WORK_NAME)
                return
            }
            val request = PeriodicWorkRequestBuilder<UpdateCheckWorker>(1, TimeUnit.DAYS)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()
            workManager.enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }
    }

    /** 通知渠道 ID */
    private val channelId = "fandex_update_channel"

    /** 通知 ID（固定值，避免重复通知） */
    private val notificationId = 1001

    /**
     * 后台执行检查逻辑
     *
     * 流程：
     *   1. 读取自动检查开关，关闭时静默返回 success
     *   2. 实例化 UpdateChecker 调用 checkLatestRelease()
     *   3. 若有新版本可用且未被忽略：发送通知
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

            /* 自动检查开关关闭时静默跳过（偏好读取失败视为关闭） */
            val autoEnabled = readAutoCheckEnabledOnce(context)
            if (!autoEnabled) return Result.success()

            /* 使用 UpdateChecker.DefaultClient 共享单例，复用连接池与线程池 */
            val checker = UpdateChecker(context, UpdateChecker.DefaultClient)
            val result = checker.checkLatestRelease()

            result.fold(
                onSuccess = { info ->
                    /* 发现新版本且未被用户忽略时发送通知 */
                    val ignored = readIgnoredVersionOnce(context)
                    if (info.isUpdateAvailable && ignored != info.latestVersion) {
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
