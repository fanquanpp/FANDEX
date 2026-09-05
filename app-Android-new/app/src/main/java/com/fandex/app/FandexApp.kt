package com.fandex.app

import android.app.Application
import com.fandex.app.update.UpdateCheckWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * FANDEX 应用入口
 *
 * 持有全局依赖容器 AppContainer，供 ViewModel 获取数据仓库；
 * 应用启动时若"自动检查更新"开关开启，则调度每日一次的
 * WorkManager 后台更新检查（UpdateCheckWorker 内部还会二次校验开关）
 */
class FandexApp : Application() {

    /** 依赖容器（应用生命周期内单例） */
    lateinit var container: AppContainer
        private set

    /** 应用级协程作用域（仅用于启动期的调度任务，与 UI 生命周期解耦） */
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        scheduleDailyUpdateCheck()
    }

    /**
     * 调度每日更新检查
     *
     * 异步读取自动检查开关偏好（DataStore 读取为挂起操作，不阻塞主线程），
     * 开关开启时注册唯一周期任务，关闭时不注册；
     * 具体调度逻辑统一收敛在 UpdateCheckWorker.scheduleDaily()
     */
    private fun scheduleDailyUpdateCheck() {
        appScope.launch {
            val enabled = runCatching {
                container.updatePreferences.autoCheckEnabled.first()
            }.getOrDefault(false)
            if (!enabled) return@launch
            UpdateCheckWorker.scheduleDaily(this@FandexApp, enabled = true)
        }
    }
}
