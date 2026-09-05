package com.fandex.app.update

import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import com.fandex.app.ui.components.FdxIconButton
import com.fandex.app.ui.theme.LocalExtendedColors
import kotlinx.coroutines.delay

/** 日志 TAG */
private const val TAG = "UpdateCard"

/**
 * 非侵入式更新提示卡片（Toast 模式）
 *
 * 功能：从顶部滑入的卡片，展示新版本信息与操作按钮，3 秒后自动收起
 *
 * 输入：
 *   - state：检查状态（CheckState.Available）
 *   - onDownload：点击"立即下载"回调
 *   - onDismiss：点击"稍后提醒"或自动消失回调
 *   - onIgnore：点击"忽略此版本"回调
 *   - modifier：布局修饰符
 *
 * 视觉对齐新端组件风格：bgElevated 底 + 1dp 边框 + 4dp 直角小圆角，
 * 不使用旧端的 GlassCard 玻璃拟态（新端无该组件）
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
            maxReleaseNotesLines = 3
        )
    }
}

/**
 * 更新卡片内部内容组件
 *
 * 功能：统一的卡片内容渲染，信息结构与旧端 UpdateToastCard / ProgressCard 对齐：
 *   标题行（图标 + 版本号 + 关闭）-> 文件大小 -> 更新说明 -> 主操作行 -> 次要操作行
 *
 * 输入：
 *   - info：UpdateInfo 业务数据
 *   - onDownload：立即下载回调
 *   - onDismiss：关闭/稍后回调
 *   - onIgnore：忽略版本回调
 *   - maxReleaseNotesLines：Release Notes 最大行数
 */
@Composable
private fun UpdateCardContent(
    info: UpdateInfo,
    onDownload: () -> Unit,
    onDismiss: () -> Unit,
    onIgnore: () -> Unit,
    maxReleaseNotesLines: Int,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val extendedColors = LocalExtendedColors.current

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(4.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, extendedColors.borderDefault, RoundedCornerShape(4.dp))
            .padding(16.dp)
    ) {
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
            FdxIconButton(
                icon = Icons.Filled.Close,
                contentDescription = "关闭",
                onClick = onDismiss,
                iconSize = 18.dp
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        /* 文件大小信息行 */
        Text(
            text = "大小：${formatFileSize(info.downloadSize)}",
            style = MaterialTheme.typography.labelSmall,
            color = extendedColors.fgSecondary
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

        /* 操作按钮行：立即下载（primary 填充） + 查看详情（描边，跳转 Release 页面） */
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.primary)
                    .clickable(onClick = onDownload)
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "立即下载",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            }

            if (info.htmlUrl.isNotBlank()) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(4.dp))
                        .background(extendedColors.bgElevated)
                        .border(1.dp, extendedColors.borderDefault, RoundedCornerShape(4.dp))
                        .clickable {
                            try {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(info.htmlUrl))
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                context.startActivity(intent)
                            } catch (e: Exception) {
                                Log.w(TAG, "启动浏览器查看更新详情失败: ${e.message}", e)
                            }
                        }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "查看详情",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
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
            Text(
                text = "忽略此版本",
                style = MaterialTheme.typography.labelSmall,
                color = extendedColors.fgSecondary,
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .clickable(onClick = onIgnore)
                    .padding(horizontal = 8.dp, vertical = 6.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "稍后提醒",
                style = MaterialTheme.typography.labelSmall,
                color = extendedColors.fgSecondary,
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .clickable(onClick = onDismiss)
                    .padding(horizontal = 8.dp, vertical = 6.dp)
            )
        }
    }
}

/**
 * 下载进度卡片
 *
 * 功能：下载过程中展示进度条与已下载字节数（信息结构与旧端 ProgressCard 对齐）
 *
 * 输入：
 *   - state：DownloadState.Downloading 下载状态
 *   - onCancel：取消下载回调
 */
@Composable
fun UpdateDownloadProgressCard(
    state: DownloadState.Downloading,
    onCancel: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val extendedColors = LocalExtendedColors.current

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(4.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, extendedColors.borderDefault, RoundedCornerShape(4.dp))
            .padding(16.dp)
    ) {
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
            trackColor = extendedColors.bgSunken
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
                color = extendedColors.fgSecondary
            )
            Text(
                text = "取消",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .clickable(onClick = onCancel)
                    .padding(horizontal = 8.dp, vertical = 6.dp)
            )
        }
    }
}

/**
 * 下载完成提示浮层
 *
 * 功能：下载完成后展示"安装"入口，避免仅靠 LaunchedEffect 一次性调起
 *       在权限缺失等场景下没有重试入口的问题
 */
@Composable
fun UpdateInstallReadyCard(
    onInstall: () -> Unit,
    modifier: Modifier = Modifier
) {
    val extendedColors = LocalExtendedColors.current
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, extendedColors.borderDefault, RoundedCornerShape(4.dp))
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Filled.OpenInNew,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(18.dp)
        )
        Text(
            text = "新版本下载完成",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = "安装",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .clip(RoundedCornerShape(4.dp))
                .clickable(onClick = onInstall)
                .padding(horizontal = 8.dp, vertical = 6.dp)
        )
    }
}

/**
 * 格式化文件大小
 *
 * 输入：字节数
 * 输出：人类可读字符串，如 "12.34 MB"
 */
internal fun formatFileSize(bytes: Long): String {
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
