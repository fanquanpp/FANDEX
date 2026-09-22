package com.fandex.app.data.repository

import com.fandex.app.data.asset.AssetStore
import com.fandex.app.data.model.CategoryInfo
import com.fandex.app.data.model.Module
import com.fandex.app.data.model.ModulesMetadata
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json

class ModuleRepository(private val assetStore: AssetStore) {

    @Volatile
    private var cachedMetadata: ModulesMetadata? = null

    private val mutex = Mutex()

    suspend fun metadata(): ModulesMetadata {
        cachedMetadata?.let { return it }
        return mutex.withLock {
            cachedMetadata ?: loadMetadata().also { cachedMetadata = it }
        }
    }

    suspend fun categories(): List<CategoryInfo> {
        val metadata = metadata()
        return metadata.categoryOrder.map { categoryId ->
            CategoryInfo(
                id = categoryId,
                label = metadata.categoryLabels[categoryId] ?: categoryId,
                colorHex = metadata.categoryColors[categoryId] ?: DEFAULT_COLOR,
                modules = metadata.modules
                    .filter { it.categories.contains(categoryId) }
                    .sortedBy { it.folderOrder }
            )
        }.filter { it.modules.isNotEmpty() }
    }

    suspend fun module(moduleId: String): Module? {
        return metadata().modules.find { it.id == moduleId }
    }

    suspend fun categoryColorHex(moduleId: String): String? {
        val metadata = metadata()
        val module = metadata.modules.find { it.id == moduleId } ?: return null
        val primaryCategory = module.categories.firstOrNull() ?: return null
        return metadata.categoryColors[primaryCategory]
    }

    private suspend fun loadMetadata(): ModulesMetadata {
        val json = assetStore.readTextOrThrow("metadata/modules.json")
        return decoder.decodeFromString(json)
    }

    companion object {
        private const val DEFAULT_COLOR = "#4E5E6B"
    }

    private val decoder = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }
}
