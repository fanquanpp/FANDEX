package com.fandex.app.update

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

/**
 * 更新自检浮层宿主
 *
 * 功能：挂载在应用根部的更新流程 UI 集合，职责包括：
 *   1. 启动时按开关静默发起一次自动检查（内部有 24h 频率限制）
 *   2. 发现新版本时在顶部滑入"更新提示卡片"（Toast 模式，3 秒自动收起）
 *   3. 下载中在顶部展示"进度卡片"，完成后展示"安装就绪卡片"
 *
 * 视觉对齐旧端 UpdateCard / ProgressCard 的信息结构，
 * 组件风格遵循新端直角小圆角与扩展色板
 */
@Composable
fun UpdateOverlay(
    modifier: Modifier = Modifier,
    viewModel: UpdateViewModel = viewModel()
) {
    /* 首次组合时静默发起自动检查（manual=false，24h 频率限制） */
    LaunchedEffect(Unit) {
        viewModel.checkForUpdate(manual = false)
    }

    val checkState by viewModel.checkState.collectAsState()
    val downloadState by viewModel.downloadState.collectAsState()

    Column(modifier = modifier.fillMaxWidth()) {
        /* 下载流程卡片：优先级高于检查提示卡片 */
        when (val state = downloadState) {
            is DownloadState.Downloading -> {
                UpdateDownloadProgressCard(
                    state = state,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
            is DownloadState.Completed -> {
                UpdateInstallReadyCard(
                    onInstall = { viewModel.installUpdate() },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
            else -> Unit
        }

        /* 发现新版本提示卡片（Toast 模式） */
        if (checkState is CheckState.Available && downloadState !is DownloadState.Downloading) {
            UpdateToastCard(
                state = checkState as CheckState.Available,
                onDownload = { viewModel.downloadUpdate() },
                onDismiss = { viewModel.dismissUpdate() },
                onIgnore = {
                    val info = (checkState as? CheckState.Available)?.updateInfo
                    if (info != null) viewModel.ignoreVersion(info.latestVersion)
                    else viewModel.dismissUpdate()
                }
            )
        }
    }
}
