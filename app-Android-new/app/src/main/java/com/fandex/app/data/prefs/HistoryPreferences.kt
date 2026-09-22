package com.fandex.app.data.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.historyStore: DataStore<Preferences> by preferencesDataStore(name = "fandex_history")

@Serializable
data class HistoryEntry(
    val module: String,
    val slug: String,
    val title: String,
    val moduleTitle: String = "",
    val timestamp: Long = 0
)

class HistoryPreferences(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true }

    val history: Flow<List<HistoryEntry>> = context.historyStore.data.map { prefs ->
        decode(prefs[KEY_HISTORY]).sortedByDescending { it.timestamp }
    }

    suspend fun record(entry: HistoryEntry) {
        context.historyStore.edit { prefs ->
            val current = decode(prefs[KEY_HISTORY])
                .filterNot { it.module == entry.module && it.slug == entry.slug }
            val next = (listOf(entry) + current).take(MAX_ENTRIES)
            prefs[KEY_HISTORY] = json.encodeToString(next)
        }
    }

    suspend fun clear() {
        context.historyStore.edit { prefs -> prefs.remove(KEY_HISTORY) }
    }

    private fun decode(raw: String?): List<HistoryEntry> {
        if (raw.isNullOrEmpty()) return emptyList()
        return runCatching { json.decodeFromString<List<HistoryEntry>>(raw) }.getOrDefault(emptyList())
    }

    companion object {
        private val KEY_HISTORY = stringPreferencesKey("doc_history")

        const val MAX_ENTRIES = 12
    }
}
