package com.fandex.app.update

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.FandexApp
import com.fandex.app.data.prefs.UpdatePreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File

/**
 * 更新自检状态管理 ViewModel
 *
 * 功能：统一管理更新检查、下载、安装的状态机，暴露 StateFlow 供 UI 订阅
 *
 * 与旧端（app-Android-old）的差异：
 * - 对齐新端架构约定：公开方法自行在 viewModelScope 内启动协程，
 *   不再要求 UI 层用协程包装 suspend 调用
 * - 偏好读写改用新端 UpdatePreferences（独立 DataStore 文件）
 *
 * 核心职责：
 *   1. 协调 UpdateChecker / UpdateDownloader / UpdateInstaller 三大组件
 *   2. 频率限制：手动检查 1h、自动检查 24h，避免短时间内重复请求
 *   3. 偏好联动：根据 autoCheckEnabled 与 ignoredVersion 决定是否提示
 *   4. 状态机维护：通过 MutableStateFlow 暴露可观察的状态
 */
class UpdateViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    /** 更新偏好（自动检查开关 / 忽略版本 / 上次检查时间） */
    private val updatePrefs: UpdatePreferences = container.updatePreferences

    /** 版本检查器实例（共享 OkHttpClient 单例，复用连接池） */
    private val updateChecker by lazy { UpdateChecker(application, UpdateChecker.DefaultClient) }

    /** APK 下载器实例 */
    private val updateDownloader by lazy { UpdateDownloader(application, UpdateChecker.DefaultClient) }

    /** APK 安装器实例 */
    private val updateInstaller by lazy { UpdateInstaller(application) }

    /** 检查状态：MutableStateFlow 内部可变，对外暴露为只读 StateFlow */
    private val _checkState = MutableStateFlow<CheckState>(CheckState.Idle)
    val checkState: StateFlow<CheckState> = _checkState.asStateFlow()

    /** 下载状态：MutableStateFlow 内部可变，对外暴露为只读 StateFlow */
    private val _downloadState = MutableStateFlow<DownloadState>(DownloadState.Idle)
    val downloadState: StateFlow<DownloadState> = _downloadState.asStateFlow()

    /** 上次检查时间戳：便于 UI 展示"上次检查时间" */
    private val _lastCheckTime = MutableStateFlow(0L)
    val lastCheckTime: StateFlow<Long> = _lastCheckTime.asStateFlow()

    /** 自动检查更新开关（抽屉设置区展示与切换） */
    val autoCheckEnabled: StateFlow<Boolean> = updatePrefs.autoCheckEnabled
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    /** 被用户忽略的更新版本号（空字符串表示未忽略任何版本） */
    val ignoredVersion: StateFlow<String> = updatePrefs.ignoredVersion
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    /** 已下载完成的 APK 文件（内存缓存，便于点击安装时直接复用） */
    private var downloadedApkFile: File? = null

    /** 防抖标志：避免检查请求并发重入 */
    private var checking = false

    init {
        /* 初始化时同步一次"上次检查时间"，供设置区展示 */
        viewModelScope.launch {
            _lastCheckTime.value = runCatching { updatePrefs.lastCheckTime.first() }.getOrDefault(0L)
        }
    }

    /**
     * 检查更新（入口）
     *
     * 输入：
     *   - manual：是否为手动触发（true=用户点击按钮，false=启动自动检查）
     *
     * 频率限制：
     *   - manual=true：1h 内不重复检查（上次检查失败时不限制，便于重试）
     *   - manual=false：24h 内不重复检查，且 autoCheckEnabled=true 才发起
     */
    fun checkForUpdate(manual: Boolean) {
        if (checking) return
        checking = true
        viewModelScope.launch {
            try {
                checkForUpdateInternal(manual)
            } finally {
                checking = false
            }
        }
    }

    /**
     * 检查更新内部实现（协程体）
     *
     * 流程：
     *   1. 读取偏好做频率限制与开关判断
     *   2. 调用 UpdateChecker.checkLatestRelease()
     *   3. 根据返回的 UpdateInfo 更新 checkState
     *   4. 更新 lastCheckTime 偏好（无论成功失败都更新，避免短时间重试）
     */
    private suspend fun checkForUpdateInternal(manual: Boolean) {
        /* 频率限制判定 */
        val lastTime = runCatching { updatePrefs.lastCheckTime.first() }.getOrDefault(0L)
        val now = System.currentTimeMillis()
        val minInterval = if (manual) MANUAL_CHECK_INTERVAL_MS else AUTO_CHECK_INTERVAL_MS

        if (manual) {
            /* 手动检查：1h 内不重复（上次失败时不限制） */
            if (now - lastTime < minInterval && _checkState.value !is CheckState.Failed) return
        } else {
            /* 自动检查：必须开关开启且 24h 未检查 */
            val autoEnabled = runCatching { updatePrefs.autoCheckEnabled.first() }.getOrDefault(false)
            if (!autoEnabled) return
            if (now - lastTime < minInterval) return
        }

        /* 进入检查中状态 */
        _checkState.value = CheckState.Checking

        try {
            /* 调用检查器获取最新版本信息 */
            val result = updateChecker.checkLatestRelease()

            /* 更新时间戳（无论成功失败都更新，避免短时间重试） */
            _lastCheckTime.value = now
            runCatching { updatePrefs.setLastCheckTime(now) }
                .onFailure { e -> Log.w(TAG, "持久化上次检查时间戳失败: ${e.message}") }

            val updateInfo = result.getOrElse { e ->
                _checkState.value = CheckState.Failed(e.message ?: "检查更新失败")
                return
            }

            /* 判断是否有更新可用 */
            if (!updateInfo.isUpdateAvailable) {
                _checkState.value = CheckState.UpToDate
                return
            }

            /* 检查用户是否已忽略该版本：被忽略的版本静默置为 UpToDate（不弹窗） */
            val ignoredVersion = runCatching { updatePrefs.ignoredVersion.first() }.getOrDefault("")
            if (ignoredVersion == updateInfo.latestVersion) {
                _checkState.value = CheckState.UpToDate
                return
            }

            /* 发现新版本 */
            _checkState.value = CheckState.Available(updateInfo)
        } catch (e: Exception) {
            _checkState.value = CheckState.Failed(e.message ?: "检查更新失败")
        }
    }

    /**
     * 下载 APK 更新包
     *
     * 流程：
     *   1. 从 checkState 中读取 UpdateInfo
     *   2. 重置 downloadState 为 Downloading(0, 0, -1)
     *   3. 调用 UpdateDownloader.download() 并接收进度
     *   4. 下载完成保存文件并更新为 Completed
     */
    fun downloadUpdate() {
        val updateInfo = (_checkState.value as? CheckState.Available)?.updateInfo
        if (updateInfo == null) {
            _downloadState.value = DownloadState.Failed("无可用更新")
            return
        }

        viewModelScope.launch {
            /* 进入下载中状态 */
            _downloadState.value = DownloadState.Downloading(0, 0L, -1L)

            try {
                val result = updateDownloader.download(updateInfo.downloadUrl) { progress, downloaded, total ->
                    _downloadState.value = DownloadState.Downloading(progress, downloaded, total)
                }

                val file = result.getOrElse { e ->
                    _downloadState.value = DownloadState.Failed(e.message ?: "下载失败")
                    return@launch
                }

                downloadedApkFile = file
                _downloadState.value = DownloadState.Completed(file)
            } catch (e: Exception) {
                _downloadState.value = DownloadState.Failed(e.message ?: "下载失败")
            }
        }
    }

    /**
     * 安装已下载的 APK
     *
     * 流程：
     *   1. 优先使用内存中的 downloadedApkFile
     *   2. 否则从 downloadState.Completed 中读取 file
     *   3. 调用 UpdateInstaller.install() 调起系统安装器
     */
    fun installUpdate() {
        val file = downloadedApkFile ?: (_downloadState.value as? DownloadState.Completed)?.file
        if (file == null || !file.exists()) {
            return
        }

        val success = try {
            updateInstaller.install(file)
        } catch (e: Exception) {
            Log.w(TAG, "调起 APK 安装界面失败: ${e.message}", e)
            false
        }

        if (!success) {
            _downloadState.value = DownloadState.Failed("无法启动安装界面，请检查权限设置")
        }
    }

    /**
     * 切换自动检查更新开关
     *
     * 持久化到 DataStore，并同步调度 / 取消每日周期任务：
     * - 开启：立即注册 WorkManager 周期任务（无需等待下次启动）
     * - 关闭：取消周期任务，避免后台空跑
     */
    fun setAutoCheckEnabled(enabled: Boolean) {
        viewModelScope.launch {
            runCatching { updatePrefs.setAutoCheckEnabled(enabled) }
                .onFailure { e -> Log.w(TAG, "持久化自动检查开关失败: ${e.message}") }
            runCatching {
                UpdateCheckWorker.scheduleDaily(getApplication(), enabled)
            }.onFailure { e -> Log.w(TAG, "调度每日更新检查任务失败: ${e.message}") }
        }
    }

    /**
     * 清除被忽略的版本号
     *
     * 清除后下次检查会重新提示该版本（若仍是新版本）
     */
    fun clearIgnoredVersion() {
        viewModelScope.launch {
            runCatching { updatePrefs.setIgnoredVersion("") }
                .onFailure { e -> Log.w(TAG, "清除忽略版本号失败: ${e.message}") }
        }
    }

    /**
     * 忽略指定版本
     *
     * 持久化到 DataStore，下次检查时不再提示该版本；随后重置 checkState 为 Idle（卡片消失）
     */
    fun ignoreVersion(version: String) {
        viewModelScope.launch {
            runCatching { updatePrefs.setIgnoredVersion(version) }
                .onFailure { e -> Log.w(TAG, "持久化忽略版本号失败: ${e.message}") }
            _checkState.value = CheckState.Idle
        }
    }

    /**
     * 重置更新状态为 Idle
     *
     * UI 上的"稍后提醒"或"关闭"按钮调用，让卡片消失；
     * 仅重置 checkState，不重置 downloadState（下载进度不应被简单 dismiss 打断）
     */
    fun dismissUpdate() {
        _checkState.value = CheckState.Idle
    }

    companion object {
        /** 日志 TAG */
        private const val TAG = "UpdateViewModel"

        /** 手动检查最小间隔：1 小时 */
        private const val MANUAL_CHECK_INTERVAL_MS = 60L * 60 * 1000

        /** 自动检查最小间隔：24 小时 */
        private const val AUTO_CHECK_INTERVAL_MS = 24L * 60 * 60 * 1000
    }
}
