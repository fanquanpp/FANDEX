package com.fandex.app.data.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/** 更新偏好独立 DataStore 文件（与主题、历史偏好隔离，避免键冲突） */
internal val Context.updateStore: DataStore<Preferences> by preferencesDataStore(name = "fandex_update_prefs")

/**
 * 更新偏好存储
 *
 * 基于 DataStore Preferences 持久化更新自检功能的用户配置与状态：
 * - autoCheckEnabled：自动检查更新开关（默认开启，启动后静默检查）
 * - ignoredVersion：用户主动忽略的更新版本号（该版本不再提示）
 * - lastCheckTime：上次检查更新的时间戳（用于频率限制：手动 1h / 自动 24h）
 */
class UpdatePreferences(private val context: Context) {

    /** 自动检查更新开关流（默认开启） */
    val autoCheckEnabled: Flow<Boolean> = context.updateStore.data.map { prefs ->
        prefs[KEY_AUTO_CHECK_ENABLED] ?: true
    }

    /** 被忽略的更新版本号流（默认空字符串表示未忽略任何版本） */
    val ignoredVersion: Flow<String> = context.updateStore.data.map { prefs ->
        prefs[KEY_IGNORED_VERSION] ?: ""
    }

    /** 上次检查更新的时间戳流（默认 0 表示从未检查） */
    val lastCheckTime: Flow<Long> = context.updateStore.data.map { prefs ->
        prefs[KEY_LAST_CHECK_TIME] ?: 0L
    }

    /** 写入自动检查更新开关 */
    suspend fun setAutoCheckEnabled(enabled: Boolean) {
        context.updateStore.edit { prefs ->
            prefs[KEY_AUTO_CHECK_ENABLED] = enabled
        }
    }

    /** 写入被忽略的更新版本号（传空字符串可取消忽略） */
    suspend fun setIgnoredVersion(version: String) {
        context.updateStore.edit { prefs ->
            prefs[KEY_IGNORED_VERSION] = version
        }
    }

    /** 写入上次检查更新的时间戳 */
    suspend fun setLastCheckTime(timestamp: Long) {
        context.updateStore.edit { prefs ->
            prefs[KEY_LAST_CHECK_TIME] = timestamp
        }
    }

    companion object {
        /** 自动检查更新开关键 */
        internal val KEY_AUTO_CHECK_ENABLED = booleanPreferencesKey("auto_check_enabled")

        /** 被忽略的更新版本号键 */
        internal val KEY_IGNORED_VERSION = stringPreferencesKey("ignored_version")

        /** 上次检查时间戳键 */
        internal val KEY_LAST_CHECK_TIME = longPreferencesKey("last_check_time")
    }
}

/**
 * 一次性读取自动检查开关（供 WorkManager Worker 使用）
 *
 * DataStore 异常（如文件损坏）时视为关闭，保证 Worker 静默跳过不崩溃
 */
internal suspend fun readAutoCheckEnabledOnce(context: Context): Boolean {
    return runCatching {
        context.updateStore.data.first()[UpdatePreferences.KEY_AUTO_CHECK_ENABLED] ?: true
    }.getOrDefault(false)
}

/**
 * 一次性读取被忽略的版本号（供 WorkManager Worker 使用）
 *
 * DataStore 异常时返回空字符串（不忽略任何版本）
 */
internal suspend fun readIgnoredVersionOnce(context: Context): String {
    return runCatching {
        context.updateStore.data.first()[UpdatePreferences.KEY_IGNORED_VERSION] ?: ""
    }.getOrDefault("")
}
