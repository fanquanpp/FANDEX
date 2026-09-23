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
import com.fandex.app.R
import com.fandex.app.data.prefs.readAutoCheckEnabledOnce
import com.fandex.app.data.prefs.readIgnoredVersionOnce
import java.io.IOException
import java.util.concurrent.TimeUnit

class UpdateCheckWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "UpdateCheckWorker"

        const val UNIQUE_WORK_NAME = "fandex_update_check"

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

    private val channelId = "fandex_update_channel"

    private val notificationId = 1001

    override suspend fun doWork(): Result {
        return try {
            val context = applicationContext

            val autoEnabled = readAutoCheckEnabledOnce(context)
            if (!autoEnabled) return Result.success()

            val checker = UpdateChecker(context, UpdateChecker.DefaultClient)
            val result = checker.checkLatestRelease()

            result.fold(
                onSuccess = { info ->
                    val ignored = readIgnoredVersionOnce(context)
                    if (info.isUpdateAvailable && ignored != info.latestVersion) {
                        showUpdateNotification(info)
                    }
                    Result.success()
                },
                onFailure = { e ->
                    if (e is IOException) {
                        Result.retry()
                    } else {
                        Result.failure()
                    }
                }
            )
        } catch (e: Exception) {
            if (e is IOException) Result.retry() else Result.failure()
        }
    }

    private fun showUpdateNotification(info: UpdateInfo) {
        try {
            val context = applicationContext
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
                as? NotificationManager ?: return

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

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(info.htmlUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_notification)
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

            notificationManager.notify(notificationId, notification)
        } catch (e: Exception) {
            Log.e(TAG, "发送更新通知失败: ${e.message}", e)
        }
    }

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
