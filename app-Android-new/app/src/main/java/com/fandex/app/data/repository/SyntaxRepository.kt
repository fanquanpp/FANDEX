package com.fandex.app.data.repository

import com.fandex.app.data.asset.AssetStore
import com.fandex.app.data.model.SyntaxIndex
import com.fandex.app.data.model.SyntaxModule
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json

class SyntaxRepository(private val assetStore: AssetStore) {

    @Volatile
    private var cachedIndex: SyntaxIndex? = null

    @Volatile
    private var cachedModules: MutableMap<String, SyntaxModule>? = null

    private val indexMutex = Mutex()
    private val moduleMutex = Mutex()

    private val decoder = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    suspend fun languages(): SyntaxIndex {
        cachedIndex?.let { return it }
        return indexMutex.withLock {
            cachedIndex ?: loadIndex().also { cachedIndex = it }
        }
    }

    suspend fun module(moduleId: String): SyntaxModule? {
        cachedModules?.get(moduleId)?.let { return it }
        return moduleMutex.withLock {
            val cache = cachedModules ?: mutableMapOf<String, SyntaxModule>().also { cachedModules = it }
            cache[moduleId] ?: loadModule(moduleId)?.also { cache[moduleId] = it }
        }
    }

    suspend fun totalCards(): Int {
        return languages().languages.sumOf { it.count }
    }

    private suspend fun loadIndex(): SyntaxIndex {
        val json = assetStore.readText("metadata/syntax-index.json")
            ?: return SyntaxIndex()
        return runCatching { decoder.decodeFromString<SyntaxIndex>(json) }
            .getOrDefault(SyntaxIndex())
    }

    private suspend fun loadModule(moduleId: String): SyntaxModule? {
        val json = assetStore.readText("syntax-data/$moduleId.json") ?: return null
        return runCatching { decoder.decodeFromString<SyntaxModule>(json) }.getOrNull()
    }
}
