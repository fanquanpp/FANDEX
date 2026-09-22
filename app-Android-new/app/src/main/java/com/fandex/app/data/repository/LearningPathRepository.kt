package com.fandex.app.data.repository

import com.fandex.app.data.asset.AssetStore
import com.fandex.app.data.model.LearningPath
import com.fandex.app.data.model.LearningPathIndex
import com.fandex.app.data.model.LearningPathSummary
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import java.util.concurrent.ConcurrentHashMap

class LearningPathRepository(
    private val assetStore: AssetStore,
    private val moduleRepository: ModuleRepository
) {

    @Volatile
    private var cachedIndex: LearningPathIndex? = null

    private val pathCache = ConcurrentHashMap<String, LearningPath>()

    private val pathMutex = Mutex()

    private val indexMutex = Mutex()

    private val decoder = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    suspend fun paths(): List<LearningPathSummary> = coroutineScope {
        val metadata = moduleRepository.metadata()
        val byId = metadata.modules.associateBy { it.id }
        val index = indexPath()
        val orderedIds = index.order.ifEmpty { byId.keys.toList() }

        orderedIds.filter { !pathCache.containsKey(it) }
            .map { id -> async { id to loadPath(id) } }
            .awaitAll()
            .forEach { (id, path) -> if (path != null) pathCache[id] = path }

        orderedIds.mapNotNull { moduleId ->
            byId[moduleId]?.let { module ->
                val accent = module.categories.firstOrNull()
                    ?.let { metadata.categoryColors[it] } ?: "#4F5BD5"
                LearningPathSummary(
                    moduleId = module.id,
                    title = module.title,
                    description = module.description,
                    stageCount = pathCache[moduleId]?.stages?.size ?: 0,
                    colorHex = accent
                )
            }
        }
    }

    suspend fun path(moduleId: String): LearningPath? = loadPathCached(moduleId)

    private suspend fun loadPathCached(moduleId: String): LearningPath? {
        pathCache[moduleId]?.let { return it }
        return pathMutex.withLock {
            pathCache[moduleId] ?: loadPath(moduleId)?.also { pathCache[moduleId] = it }
        }
    }

    private suspend fun indexPath(): LearningPathIndex {
        cachedIndex?.let { return it }
        return indexMutex.withLock {
            cachedIndex ?: loadIndex().also { cachedIndex = it }
        }
    }

    private suspend fun loadIndex(): LearningPathIndex {
        val json = assetStore.readText("metadata/learning-path/index.json")
            ?: return LearningPathIndex()
        return runCatching { decoder.decodeFromString<LearningPathIndex>(json) }
            .getOrDefault(LearningPathIndex())
    }

    private suspend fun loadPath(moduleId: String): LearningPath? {
        val json = assetStore.readText("metadata/learning-path/$moduleId.json") ?: return null
        return runCatching { decoder.decodeFromString<LearningPath>(json) }.getOrNull()
    }
}
