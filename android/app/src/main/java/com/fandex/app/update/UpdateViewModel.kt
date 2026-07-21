package com.fandex.app.update

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.data.DataStoreManager
import com.google.gson.Gson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import java.io.File

/**
 * 更新自检状态管理 ViewModel
 *
 * 功能：统一管理更新检查、下载、安装的状态机，暴露 StateFlow 供 UI 订阅
 *
 * 输入：Application 上下文
 * 输出：StateFlow<CheckState> 与 StateFlow<DownloadState>，UI 可订阅渲染
 *
 * 核心职责：
 *   1. 协调 UpdateChecker / UpdateDownloader / UpdateInstaller 三大组件
 *   2. 频率限制：手动检查 1h、自动检查 24h，避免短时间内重复请求
 *   3. 偏好联动：根据 autoCheckUpdate 与 ignoredUpdateVersion 决定是否弹窗
 *   4. 状态机维护：通过 MutableStateFlow 暴露可观察的状态
 *
 * 设计原则：
 *   - 所有公开方法均通过 viewModelScope 启动协程，避免泄漏
 *   - 所有网络与 IO 操作使用 try-catch 包裹，失败时更新对应 Failed 状态
 *   - lastCheckTime 暴露为 StateFlow 便于 UI 显示"上次检查时间"
 */
class UpdateViewModel(application: Application) : AndroidViewModel(application) {

    /** OkHttpClient 单例（共享 UpdateChecker.DefaultClient，复用连接池与线程池） */
    private val okHttpClient: OkHttpClient by lazy {
        UpdateChecker.DefaultClient
    }

    /** Gson 单例（懒加载） */
    private val gson: Gson by lazy { Gson() }

    /** 版本检查器实例 */
    private val updateChecker: UpdateChecker by lazy {
        UpdateChecker(application, okHttpClient, gson)
    }

    /** APK 下载器实例 */
    private val updateDownloader: UpdateDownloader by lazy {
        UpdateDownloader(application, okHttpClient)
    }

    /** APK 安装器实例 */
    private val updateInstaller: UpdateInstaller by lazy {
        UpdateInstaller(application)
    }

    /** 检查状态：MutableStateFlow 内部可变，对外暴露为只读 StateFlow */
    private val _checkState = MutableStateFlow<CheckState>(CheckState.Idle)
    val checkState: StateFlow<CheckState> = _checkState.asStateFlow()

    /** 下载状态：MutableStateFlow 内部可变，对外暴露为只读 StateFlow */
    private val _downloadState = MutableStateFlow<DownloadState>(DownloadState.Idle)
    val downloadState: StateFlow<DownloadState> = _downloadState.asStateFlow()

    /** 上次检查时间戳：MutableStateFlow 内部可变，对外暴露为只读 StateFlow */
    private val _lastCheckTime = MutableStateFlow(0L)
    val lastCheckTime: StateFlow<Long> = _lastCheckTime.asStateFlow()

    /** 已下载完成的 APK 文件（内存缓存，便于点击安装时直接复用） */
    private var downloadedApkFile: File? = null

    /**
     * 检查更新
     *
     * 输入：
     *   - manual：是否为手动触发（true=用户点击按钮，false=启动自动检查）
     *
     * 输出：无（通过 checkState StateFlow 通知 UI）
     *
     * 流程：
     *   1. 读取上次检查时间戳
     *   2. 频率限制：
     *      - manual=true：1h 内不重复检查
     *      - manual=false：24h 内不重复检查 + 读取 autoCheckUpdate 偏好
     *   3. 读取 ignoredUpdateVersion 偏好，若最新版本被忽略则不弹窗
     *   4. 调用 UpdateChecker.checkLatestRelease()
     *   5. 根据返回的 UpdateInfo 更新 checkState
     *   6. 更新 lastUpdateCheckTime 偏好
     *
     * 异常处理：
     *   - 频率限制命中：直接返回，不修改状态
     *   - autoCheckUpdate 关闭：自动检查时直接返回
     *   - 检查失败：更新 checkState 为 Failed
     */
    suspend fun checkForUpdate(manual: Boolean) {
        val context = getApplication<Application>()

        /* 频率限制判定 */
        val lastTime = DataStoreManager.getLastUpdateCheckTime(context).first()
        val now = System.currentTimeMillis()
        val minInterval = if (manual) MANUAL_CHECK_INTERVAL_MS else AUTO_CHECK_INTERVAL_MS

        if (manual) {
            /* 手动检查：1h 内不重复 */
            if (now - lastTime < minInterval && _checkState.value !is CheckState.Failed) {
                return
            }
        } else {
            /* 自动检查：必须 24h 未检查 + autoCheckUpdate=true */
            val autoEnabled = DataStoreManager.getAutoCheckUpdate(context).first()
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
            try {
                DataStoreManager.saveLastUpdateCheckTime(context, now)
            } catch (e: Exception) {
                Log.w(TAG, "持久化上次检查时间戳失败: ${e.message}", e)
            }

            val updateInfo = result.getOrElse { e ->
                _checkState.value = CheckState.Failed(e.message ?: "检查更新失败")
                return
            }

            /* 判断是否有更新可用 */
            if (!updateInfo.isUpdateAvailable) {
                _checkState.value = CheckState.UpToDate
                return
            }

            /* 检查用户是否已忽略该版本 */
            val ignoredVersion = DataStoreManager.getIgnoredUpdateVersion(context).first()
            if (ignoredVersion == updateInfo.latestVersion) {
                /* 被忽略的版本，静默置为 UpToDate（不弹窗） */
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
     * 输入：无（依赖当前 checkState 中的 UpdateInfo）
     * 输出：无（通过 downloadState StateFlow 通知 UI）
     *
     * 流程：
     *   1. 从 checkState 中读取 UpdateInfo
     *   2. 重置 downloadState 为 Downloading(0, 0, -1)
     *   3. 调用 UpdateDownloader.download() 并接收进度
     *   4. 进度回调更新 downloadState
     *   5. 下载完成保存文件并更新为 Completed
     *
     * 异常处理：
     *   - 无可用更新：直接返回 Failed("无可用更新")
     *   - 下载失败：更新为 Failed(message)
     */
    suspend fun downloadUpdate() {
        val currentState = _checkState.value
        val updateInfo = (currentState as? CheckState.Available)?.updateInfo
            ?: run {
                _downloadState.value = DownloadState.Failed("无可用更新")
                return
            }

        /* 进入下载中状态 */
        _downloadState.value = DownloadState.Downloading(0, 0L, -1L)

        try {
            val result = updateDownloader.download(updateInfo.downloadUrl) { progress, downloaded, total ->
                _downloadState.value = DownloadState.Downloading(progress, downloaded, total)
            }

            val file = result.getOrElse { e ->
                _downloadState.value = DownloadState.Failed(e.message ?: "下载失败")
                return
            }

            downloadedApkFile = file
            _downloadState.value = DownloadState.Completed(file)
        } catch (e: Exception) {
            _downloadState.value = DownloadState.Failed(e.message ?: "下载失败")
        }
    }

    /**
     * 安装已下载的 APK
     *
     * 输入：无（使用内部缓存的 downloadedApkFile 或 downloadState.Completed）
     * 输出：无（调起系统安装界面）
     *
     * 流程：
     *   1. 优先使用内存中的 downloadedApkFile
     *   2. 否则从 downloadState.Completed 中读取 file
     *   3. 调用 UpdateInstaller.install() 调起系统安装器
     *
     * 异常处理：
     *   - 文件不存在：直接返回（无操作）
     *   - 调起失败：将 downloadState 置为 Failed
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
     * 忽略指定版本
     *
     * 输入：version 要忽略的版本号字符串
     * 输出：无（持久化到 DataStore，下次检查时不再弹窗该版本）
     */
    suspend fun ignoreVersion(version: String) {
        val context = getApplication<Application>()
        try {
            DataStoreManager.saveIgnoredUpdateVersion(context, version)
        } catch (e: Exception) {
            Log.w(TAG, "持久化忽略版本号失败: ${e.message}", e)
        }
        /* 重置 checkState 为 Idle，UI 卡片消失 */
        _checkState.value = CheckState.Idle
    }

    /**
     * 重置更新状态为 Idle
     *
     * 功能：UI 上的"稍后提醒"或"关闭"按钮调用，让卡片消失
     *
     * 设计说明：仅重置 checkState，不重置 downloadState
     *           （下载进度不应被简单的 dismiss 操作打断）
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
