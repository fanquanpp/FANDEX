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

enum class ThemeMode {
    SYSTEM,

    LIGHT,

    DARK
}

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "fandex_prefs")

class ThemePreferences(private val context: Context) {

    val themeMode: Flow<ThemeMode> = context.dataStore.data.map { prefs ->
        when (prefs[KEY_THEME_MODE]) {
            ThemeMode.LIGHT.name -> ThemeMode.LIGHT
            ThemeMode.DARK.name -> ThemeMode.DARK
            else -> ThemeMode.SYSTEM
        }
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.dataStore.edit { prefs ->
            prefs[KEY_THEME_MODE] = mode.name
        }
    }

    val fontScale: Flow<Float> = context.dataStore.data.map { prefs ->
        (prefs[KEY_FONT_SCALE] ?: DEFAULT_FONT_SCALE).coerceIn(MIN_FONT_SCALE, MAX_FONT_SCALE)
    }

    suspend fun setFontScale(scale: Float) {
        context.dataStore.edit { prefs ->
            prefs[KEY_FONT_SCALE] = scale.coerceIn(MIN_FONT_SCALE, MAX_FONT_SCALE)
        }
    }

    companion object {
        private val KEY_THEME_MODE = stringPreferencesKey("theme_mode")

        private val KEY_FONT_SCALE = floatPreferencesKey("font_scale")

        const val MIN_FONT_SCALE = 0.8f

        const val MAX_FONT_SCALE = 1.4f

        const val DEFAULT_FONT_SCALE = 1.0f

        const val FONT_SCALE_STEP = 0.1f
    }
}
