package com.fandex.app.data.prefs

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

/**
 * 主题模式
 *
 * 对齐 web 端 ThemeToggle 的三态切换
 */
enum class ThemeMode {
    /** 跟随系统 */
    SYSTEM,

    /** 强制浅色 */
    LIGHT,

    /** 强制深色 */
    DARK
}

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "fandex_prefs")

/**
 * 主题偏好存储
 *
 * 基于 DataStore Preferences 持久化主题模式选择与全局字号缩放
 * （字号缩放移植自旧端 HomeActivity 的 fontSizeScale 交互）
 */
class ThemePreferences(private val context: Context) {

    /**
     * 主题模式流（默认跟随系统）
     */
    val themeMode: Flow<ThemeMode> = context.dataStore.data.map { prefs ->
        when (prefs[KEY_THEME_MODE]) {
            ThemeMode.LIGHT.name -> ThemeMode.LIGHT
            ThemeMode.DARK.name -> ThemeMode.DARK
            else -> ThemeMode.SYSTEM
        }
    }

    /**
     * 写入主题模式
     */
    suspend fun setThemeMode(mode: ThemeMode) {
        context.dataStore.edit { prefs ->
            prefs[KEY_THEME_MODE] = mode.name
        }
    }

    /**
     * 全局字号缩放流（默认 1.0）
     */
    val fontScale: Flow<Float> = context.dataStore.data.map { prefs ->
        (prefs[KEY_FONT_SCALE] ?: DEFAULT_FONT_SCALE).coerceIn(MIN_FONT_SCALE, MAX_FONT_SCALE)
    }

    /**
     * 写入全局字号缩放（自动收敛到合法区间 0.8-1.4）
     */
    suspend fun setFontScale(scale: Float) {
        context.dataStore.edit { prefs ->
            prefs[KEY_FONT_SCALE] = scale.coerceIn(MIN_FONT_SCALE, MAX_FONT_SCALE)
        }
    }

    companion object {
        private val KEY_THEME_MODE = stringPreferencesKey("theme_mode")

        /** 字号缩放键 */
        private val KEY_FONT_SCALE = floatPreferencesKey("font_scale")

        /** 字号缩放下限（移植自旧端交互约定） */
        const val MIN_FONT_SCALE = 0.8f

        /** 字号缩放上限（移植自旧端交互约定） */
        const val MAX_FONT_SCALE = 1.4f

        /** 字号缩放默认值 */
        const val DEFAULT_FONT_SCALE = 1.0f

        /** 字号缩放步进（对齐旧端 Slider 的 7 档：0.8/0.9/1.0/1.1/1.2/1.3/1.4） */
        const val FONT_SCALE_STEP = 0.1f
    }
}
