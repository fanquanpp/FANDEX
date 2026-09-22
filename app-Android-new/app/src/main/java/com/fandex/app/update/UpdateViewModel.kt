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

class UpdateViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    private val updatePrefs: UpdatePreferences = container.updatePreferences

    private val updateChecker by lazy { UpdateChecker(application, UpdateChecker.DefaultClient) }

    private val updateDownloader by lazy { UpdateDownloader(application, UpdateChecker.DefaultClient) }

    private val updateInstaller by lazy { UpdateInstaller(application) }

    private val _checkState = MutableStateFlow<CheckState>(CheckState.Idle)
    val checkState: StateFlow<CheckState> = _checkState.asStateFlow()

    private val _downloadState = MutableStateFlow<DownloadState>(DownloadState.Idle)
    val downloadState: StateFlow<DownloadState> = _downloadState.asStateFlow()

    private val _lastCheckTime = MutableStateFlow(0L)
    val lastCheckTime: StateFlow<Long> = _lastCheckTime.asStateFlow()

    val autoCheckEnabled: StateFlow<Boolean> = updatePrefs.autoCheckEnabled
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    val ignoredVersion: StateFlow<String> = updatePrefs.ignoredVersion
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    private var downloadedApkFile: File? = null

    private var checking = false

    init {
        viewModelScope.launch {
            _lastCheckTime.value = runCatching { updatePrefs.lastCheckTime.first() }.getOrDefault(0L)
        }
    }

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

    private suspend fun checkForUpdateInternal(manual: Boolean) {
        val lastTime = runCatching { updatePrefs.lastCheckTime.first() }.getOrDefault(0L)
        val now = System.currentTimeMillis()
        val minInterval = if (manual) MANUAL_CHECK_INTERVAL_MS else AUTO_CHECK_INTERVAL_MS

        if (manual) {
            if (now - lastTime < minInterval && _checkState.value !is CheckState.Failed) return
        } else {
            val autoEnabled = runCatching { updatePrefs.autoCheckEnabled.first() }.getOrDefault(false)
            if (!autoEnabled) return
            if (now - lastTime < minInterval) return
        }

        _checkState.value = CheckState.Checking

        try {
            val result = updateChecker.checkLatestRelease()

            _lastCheckTime.value = now
            runCatching { updatePrefs.setLastCheckTime(now) }
                .onFailure { e -> Log.w(TAG, "持久化上次检查时间戳失败: ${e.message}") }

            val updateInfo = result.getOrElse { e ->
                _checkState.value = CheckState.Failed(e.message ?: "检查更新失败")
                return
            }

            if (!updateInfo.isUpdateAvailable) {
                _checkState.value = CheckState.UpToDate
                return
            }

            val ignoredVersion = runCatching { updatePrefs.ignoredVersion.first() }.getOrDefault("")
            if (ignoredVersion == updateInfo.latestVersion) {
                _checkState.value = CheckState.UpToDate
                return
            }

            _checkState.value = CheckState.Available(updateInfo)
        } catch (e: Exception) {
            _checkState.value = CheckState.Failed(e.message ?: "检查更新失败")
        }
    }

    fun downloadUpdate() {
        val updateInfo = (_checkState.value as? CheckState.Available)?.updateInfo
        if (updateInfo == null) {
            _downloadState.value = DownloadState.Failed("无可用更新")
            return
        }

        viewModelScope.launch {
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

    fun setAutoCheckEnabled(enabled: Boolean) {
        viewModelScope.launch {
            runCatching { updatePrefs.setAutoCheckEnabled(enabled) }
                .onFailure { e -> Log.w(TAG, "持久化自动检查开关失败: ${e.message}") }
            runCatching {
                UpdateCheckWorker.scheduleDaily(getApplication(), enabled)
            }.onFailure { e -> Log.w(TAG, "调度每日更新检查任务失败: ${e.message}") }
        }
    }

    fun clearIgnoredVersion() {
        viewModelScope.launch {
            runCatching { updatePrefs.setIgnoredVersion("") }
                .onFailure { e -> Log.w(TAG, "清除忽略版本号失败: ${e.message}") }
        }
    }

    fun ignoreVersion(version: String) {
        viewModelScope.launch {
            runCatching { updatePrefs.setIgnoredVersion(version) }
                .onFailure { e -> Log.w(TAG, "持久化忽略版本号失败: ${e.message}") }
            _checkState.value = CheckState.Idle
        }
    }

    fun dismissUpdate() {
        _checkState.value = CheckState.Idle
    }

    companion object {
        private const val TAG = "UpdateViewModel"

        private const val MANUAL_CHECK_INTERVAL_MS = 60L * 60 * 1000

        private const val AUTO_CHECK_INTERVAL_MS = 24L * 60 * 60 * 1000
    }
}
