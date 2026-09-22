package com.fandex.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

object DataStoreManager {

    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "fandex_settings")

    private val KEY_IS_DARK_MODE = booleanPreferencesKey("is_dark_mode")

    private val KEY_FONT_SIZE_SCALE = floatPreferencesKey("font_size_scale")

    private val KEY_IS_SPLASH_ENABLED = booleanPreferencesKey("is_splash_enabled")

    private val KEY_DYNAMIC_BACKGROUND = booleanPreferencesKey("dynamic_background")

    private val KEY_AUTO_CHECK_UPDATE = booleanPreferencesKey("auto_check_update")

    private val KEY_IGNORED_UPDATE_VERSION = stringPreferencesKey("ignored_update_version")

    private val KEY_LAST_UPDATE_CHECK_TIME = androidx.datastore.preferences.core.longPreferencesKey("last_update_check_time")

    fun getDarkMode(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { it[KEY_IS_DARK_MODE] ?: true }
    }

    suspend fun saveDarkMode(context: Context, isDark: Boolean) {
        context.dataStore.edit { it[KEY_IS_DARK_MODE] = isDark }
    }

    fun getFontSizeScale(context: Context): Flow<Float> {
        return context.dataStore.data.map { it[KEY_FONT_SIZE_SCALE] ?: 1.0f }
    }

    suspend fun saveFontSizeScale(context: Context, scale: Float) {
        val clamped = scale.coerceIn(0.8f, 1.4f)
        context.dataStore.edit { it[KEY_FONT_SIZE_SCALE] = clamped }
    }

    fun getSplashEnabled(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { it[KEY_IS_SPLASH_ENABLED] ?: true }
    }

    suspend fun saveSplashEnabled(context: Context, enabled: Boolean) {
        context.dataStore.edit { it[KEY_IS_SPLASH_ENABLED] = enabled }
    }

    fun getDynamicBackground(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { it[KEY_DYNAMIC_BACKGROUND] ?: true }
    }

    suspend fun saveDynamicBackground(context: Context, enabled: Boolean) {
        context.dataStore.edit { it[KEY_DYNAMIC_BACKGROUND] = enabled }
    }

    fun getAutoCheckUpdate(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { it[KEY_AUTO_CHECK_UPDATE] ?: true }
    }

    suspend fun saveAutoCheckUpdate(context: Context, enabled: Boolean) {
        context.dataStore.edit { it[KEY_AUTO_CHECK_UPDATE] = enabled }
    }

    fun getIgnoredUpdateVersion(context: Context): Flow<String> {
        return context.dataStore.data.map { it[KEY_IGNORED_UPDATE_VERSION] ?: "" }
    }

    suspend fun saveIgnoredUpdateVersion(context: Context, version: String) {
        context.dataStore.edit { it[KEY_IGNORED_UPDATE_VERSION] = version }
    }

    fun getLastUpdateCheckTime(context: Context): Flow<Long> {
        return context.dataStore.data.map { it[KEY_LAST_UPDATE_CHECK_TIME] ?: 0L }
    }

    suspend fun saveLastUpdateCheckTime(context: Context, timestamp: Long) {
        context.dataStore.edit { it[KEY_LAST_UPDATE_CHECK_TIME] = timestamp }
    }
}
