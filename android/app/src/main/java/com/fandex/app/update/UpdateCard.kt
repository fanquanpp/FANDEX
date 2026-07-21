package com.fandex.app.update

import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fandex.app.ui.enhancements.GlassCard
import kotlinx.coroutines.delay

/** 日志 TAG */
private const val TAG = "UpdateCard"

/**
 * 非侵入式更新提示卡片（Toast 模式）
 *
 * 功能：从顶部滑入的玻璃质感卡片，展示新版本信息与操作按钮，3 秒后自动收起
 *
 * 输入：
 *   - state：检查状态（CheckState.Available）
 *   - onDownload：点击"立即下载"回调
 *   - onDismiss：点击"稍后提醒"或自动消失回调
 *   - onIgnore：点击"忽略此版本"回调
 *   - modifier：布局修饰符
 *
 * 输出：AnimatedVisibility 包裹的 GlassCard 组件
 *
 * 设计原则：
 *   - 非阻塞：使用 AnimatedVisibility 而非 Dialog，不拦截用户操作
 *   - 自动消失：3 秒后自动调用 onDismiss
 *   - 玻璃质感：复用 GlassCard 保持视觉一致性
 *   - 暗色/亮色自适应：所有颜色使用 MaterialTheme.colorScheme
 */
@Composable
fun UpdateToastCard(
    state: CheckState.Available,
    onDownload: () -> Unit,
    onDismiss: () -> Unit,
    onIgnore: () -> Unit,
    modifier: Modifier = Modifier
) {
    val info = state.updateInfo
    /* 控制卡片可见性，3 秒后自动消失 */
    var visible by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        delay(3000)
        visible = false
        delay(300) /* 等待退出动画完成 */
        onDismiss()
    }

    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
        modifier = modifier
    ) {
        UpdateCardContent(
            info = info,
            onDownload = {
                visible = false
                onDownload()
            },
            onDismiss = {
                visible = false
                onDismiss()
            },
            onIgnore = onIgnore,
            showCloseButton = true,
            maxReleaseNotesLines = 3
        )
    }
}

/**
 * 全屏对话框版本（Detail 模式）
 *
 * 功能：用户点击"查看详情"后展示完整的更新说明与操作按钮
 *
 * 输入：
 *   - state：检查状态（CheckState.Available）
 *   - onDownload：点击下载回调
 *   - onDismiss：关闭对话框回调
 *   - onIgnore：忽略此版本回调
 *
 * 输出：GlassCard 容器，展示完整 Release Notes
 */
@Composable
fun UpdateDialog(
    state: CheckState.Available,
    onDownload: () -> Unit,
    onDismiss: () -> Unit,
    onIgnore: () -> Unit,
    modifier: Modifier = Modifier
) {
    val info = state.updateInfo
    UpdateCardContent(
        info = info,
        onDownload = onDownload,
        onDismiss = onDismiss,
        onIgnore = onIgnore,
        showCloseButton = true,
        maxReleaseNotesLines = Int.MAX_VALUE,
        modifier = modifier
    )
}

/**
 * 更新卡片内部内容组件
 *
 * 功能：统一的卡片内容渲染，被 ToastCard 与 Dialog 复用
 *
 * 输入：
 *   - info：UpdateInfo 业务数据
 *   - onDownload：立即下载回调
 *   - onDismiss：关闭/稍后回调
 *   - onIgnore：忽略版本回调
 *   - showCloseButton：是否显示右上角关闭按钮
 *   - maxReleaseNotesLines：Release Notes 最大行数
 *
 * 输出：完整的 GlassCard 内容布局
 */
@Composable
private fun UpdateCardContent(
    info: UpdateInfo,
    onDownload: () -> Unit,
    onDismiss: () -> Unit,
    onIgnore: () -> Unit,
    showCloseButton: Boolean,
    maxReleaseNotesLines: Int,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    GlassCard(
        modifier = modifier.fillMaxWidth(),
        cornerRadius = 16.dp,
        contentPadding = 16.dp
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            /* 标题行：图标 + 版本号 + 关闭按钮 */
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Filled.Download,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "发现新版本 v${info.latestVersion}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (showCloseButton) {
                    IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = "关闭",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            /* 文件大小信息行 */
            Text(
                text = "大小：${formatFileSize(info.downloadSize)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            /* 更新说明（Markdown 原文，最多 N 行） */
            if (info.releaseNotes.isNotBlank()) {
                Text(
                    text = info.releaseNotes,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = maxReleaseNotesLines,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            /* 操作按钮行 */
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                /* 立即下载（primary） */
                Button(
                    onClick = onDownload,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Download,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "立即下载")
                }

                /* 查看详情（次要，跳转 htmlUrl） */
                if (info.htmlUrl.isNotBlank()) {
                    OutlinedButton(
                        onClick = {
                            try {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(info.htmlUrl))
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                context.startActivity(intent)
                            } catch (e: Exception) {
                                Log.w(TAG, "启动浏览器查看更新详情失败: ${e.message}", e)
                            }
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.OpenInNew,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "查看详情")
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            /* 次要操作行：忽略此版本 / 稍后提醒 */
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onIgnore) {
                    Text(
                        text = "忽略此版本",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(modifier = Modifier.width(4.dp))
                TextButton(onClick = onDismiss) {
                    Text(
                        text = "稍后提醒",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/**
 * 下载进度卡片
 *
 * 功能：下载过程中展示进度条与已下载字节数
 *
 * 输入：
 *   - state：DownloadState.Downloading 下载状态
 *   - onCancel：取消下载回调
 *
 * 输出：GlassCard 容器，包含进度条与百分比文本
 */
@Composable
fun UpdateDownloadProgressCard(
    state: DownloadState.Downloading,
    onCancel: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier.fillMaxWidth(),
        cornerRadius = 16.dp,
        contentPadding = 16.dp
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "正在下载新版本",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = if (state.progress >= 0) "${state.progress}%" else "下载中",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            LinearProgressIndicator(
                progress = {
                    if (state.progress >= 0) state.progress / 100f else 0f
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp)),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val downloadedText = formatFileSize(state.downloadedBytes)
                val totalText = if (state.totalBytes > 0) formatFileSize(state.totalBytes) else "未知"
                Text(
                    text = "$downloadedText / $totalText",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                TextButton(onClick = onCancel) {
                    Text(
                        text = "取消",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
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
