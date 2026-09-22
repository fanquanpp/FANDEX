package com.fandex.app

import android.app.Application
import com.fandex.app.update.UpdateCheckWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class FandexApp : Application() {

    lateinit var container: AppContainer
        private set

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        scheduleDailyUpdateCheck()
    }

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
