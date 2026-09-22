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

internal val Context.updateStore: DataStore<Preferences> by preferencesDataStore(name = "fandex_update_prefs")

class UpdatePreferences(private val context: Context) {

    val autoCheckEnabled: Flow<Boolean> = context.updateStore.data.map { prefs ->
        prefs[KEY_AUTO_CHECK_ENABLED] ?: true
    }

    val ignoredVersion: Flow<String> = context.updateStore.data.map { prefs ->
        prefs[KEY_IGNORED_VERSION] ?: ""
    }

    val lastCheckTime: Flow<Long> = context.updateStore.data.map { prefs ->
        prefs[KEY_LAST_CHECK_TIME] ?: 0L
    }

    suspend fun setAutoCheckEnabled(enabled: Boolean) {
        context.updateStore.edit { prefs ->
            prefs[KEY_AUTO_CHECK_ENABLED] = enabled
        }
    }

    suspend fun setIgnoredVersion(version: String) {
        context.updateStore.edit { prefs ->
            prefs[KEY_IGNORED_VERSION] = version
        }
    }

    suspend fun setLastCheckTime(timestamp: Long) {
        context.updateStore.edit { prefs ->
            prefs[KEY_LAST_CHECK_TIME] = timestamp
        }
    }

    companion object {
        internal val KEY_AUTO_CHECK_ENABLED = booleanPreferencesKey("auto_check_enabled")

        internal val KEY_IGNORED_VERSION = stringPreferencesKey("ignored_version")

        internal val KEY_LAST_CHECK_TIME = longPreferencesKey("last_check_time")
    }
}

internal suspend fun readAutoCheckEnabledOnce(context: Context): Boolean {
    return runCatching {
        context.updateStore.data.first()[UpdatePreferences.KEY_AUTO_CHECK_ENABLED] ?: true
    }.getOrDefault(false)
}

internal suspend fun readIgnoredVersionOnce(context: Context): String {
    return runCatching {
        context.updateStore.data.first()[UpdatePreferences.KEY_IGNORED_VERSION] ?: ""
    }.getOrDefault("")
}
