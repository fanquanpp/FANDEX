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

class UpdateViewModel(application: Application) : AndroidViewModel(application) {

    private val okHttpClient: OkHttpClient by lazy {
        UpdateChecker.DefaultClient
    }

    private val gson: Gson by lazy { Gson() }

    private val updateChecker: UpdateChecker by lazy {
        UpdateChecker(application, okHttpClient, gson)
    }

    private val updateDownloader: UpdateDownloader by lazy {
        UpdateDownloader(application, okHttpClient)
    }

    private val updateInstaller: UpdateInstaller by lazy {
        UpdateInstaller(application)
    }

    private val _checkState = MutableStateFlow<CheckState>(CheckState.Idle)
    val checkState: StateFlow<CheckState> = _checkState.asStateFlow()

    private val _downloadState = MutableStateFlow<DownloadState>(DownloadState.Idle)
    val downloadState: StateFlow<DownloadState> = _downloadState.asStateFlow()

    private val _lastCheckTime = MutableStateFlow(0L)
    val lastCheckTime: StateFlow<Long> = _lastCheckTime.asStateFlow()

    private var downloadedApkFile: File? = null

    suspend fun checkForUpdate(manual: Boolean) {
        val context = getApplication<Application>()

        val lastTime = DataStoreManager.getLastUpdateCheckTime(context).first()
        val now = System.currentTimeMillis()
        val minInterval = if (manual) MANUAL_CHECK_INTERVAL_MS else AUTO_CHECK_INTERVAL_MS

        if (manual) {
            if (now - lastTime < minInterval && _checkState.value !is CheckState.Failed) {
                return
            }
        } else {
            val autoEnabled = DataStoreManager.getAutoCheckUpdate(context).first()
            if (!autoEnabled) return
            if (now - lastTime < minInterval) return
        }

        _checkState.value = CheckState.Checking

        try {
            val result = updateChecker.checkLatestRelease()

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

            if (!updateInfo.isUpdateAvailable) {
                _checkState.value = CheckState.UpToDate
                return
            }

            val ignoredVersion = DataStoreManager.getIgnoredUpdateVersion(context).first()
            if (ignoredVersion == updateInfo.latestVersion) {
                _checkState.value = CheckState.UpToDate
                return
            }

            _checkState.value = CheckState.Available(updateInfo)
        } catch (e: Exception) {
            _checkState.value = CheckState.Failed(e.message ?: "检查更新失败")
        }
    }

    suspend fun downloadUpdate() {
        val currentState = _checkState.value
        val updateInfo = (currentState as? CheckState.Available)?.updateInfo
            ?: run {
                _downloadState.value = DownloadState.Failed("无可用更新")
                return
            }

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

    suspend fun ignoreVersion(version: String) {
        val context = getApplication<Application>()
        try {
            DataStoreManager.saveIgnoredUpdateVersion(context, version)
        } catch (e: Exception) {
            Log.w(TAG, "持久化忽略版本号失败: ${e.message}", e)
        }
        _checkState.value = CheckState.Idle
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
