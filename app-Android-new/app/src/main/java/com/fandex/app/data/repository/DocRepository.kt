package com.fandex.app.data.repository

import com.fandex.app.data.asset.AssetStore
import com.fandex.app.data.model.DocIndexEntry
import com.fandex.app.data.model.FandexDoc
import android.util.LruCache
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json

class DocRepository(private val assetStore: AssetStore) {

    @Volatile
    private var cachedIndex: List<DocIndexEntry>? = null

    private val parsedDocCache = LruCache<String, FandexDoc>(MAX_PARSED_DOCS)

    private val mutex = Mutex()

    private val decoder = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    suspend fun docIndex(): List<DocIndexEntry> {
        cachedIndex?.let { return it }
        return mutex.withLock {
            cachedIndex ?: loadIndex().also { cachedIndex = it }
        }
    }

    suspend fun docsByModule(moduleId: String): List<DocIndexEntry> {
        return docIndex().filter { it.module == moduleId }.sortedBy { it.order }
    }

    suspend fun latestDocOf(moduleId: String): DocIndexEntry? {
        return docIndex().filter { it.module == moduleId }.maxByOrNull { it.order }
    }

    suspend fun doc(entry: DocIndexEntry): FandexDoc? {
        return doc(entry.module, entry.slug)
    }

    suspend fun doc(moduleId: String, docSlug: String): FandexDoc? {
        val path = "docs/$moduleId/$docSlug.md"
        parsedDocCache.get(path)?.let { return it }
        val content = assetStore.readText(path) ?: return null
        return parseMarkdown(content, docSlug).also { parsedDocCache.put(path, it) }
    }

    suspend fun navigation(moduleId: String, docSlug: String): Pair<DocIndexEntry?, DocIndexEntry?> {
        val moduleDocs = docsByModule(moduleId)
        val index = moduleDocs.indexOfFirst { it.slug == docSlug }
        if (index < 0) return null to null
        val prev = if (index > 0) moduleDocs[index - 1] else null
        val next = if (index < moduleDocs.size - 1) moduleDocs[index + 1] else null
        return prev to next
    }

    suspend fun relatedDocs(moduleId: String, docSlug: String): List<DocIndexEntry> {
        val current = docsByModule(moduleId).find { it.slug == docSlug } ?: return emptyList()
        val doc = doc(current) ?: return emptyList()
        val refs = doc.frontmatter.related
        if (refs.isEmpty()) return emptyList()

        val refSet = refs.toSet()
        return docIndex().filter { entry ->
            val fullRef = "${entry.module}/${entry.slug}"
            refSet.contains(entry.slug) || refSet.contains(fullRef)
        }
    }

    suspend fun prerequisites(moduleId: String, docSlug: String): List<DocIndexEntry> {
        val current = docsByModule(moduleId).find { it.slug == docSlug } ?: return emptyList()
        val doc = doc(current) ?: return emptyList()
        val refs = doc.frontmatter.prerequisites
        if (refs.isEmpty()) return emptyList()

        val refSet = refs.toSet()
        return docIndex().filter { entry ->
            val fullRef = "${entry.module}/${entry.slug}"
            refSet.contains(entry.slug) || refSet.contains(fullRef)
        }
    }

    suspend fun search(query: String, moduleTitles: Map<String, String> = emptyMap()): List<DocIndexEntry> {
        val lowerQuery = query.lowercase().trim()
        if (lowerQuery.isEmpty()) return emptyList()
        return docIndex().filter { entry ->
            entry.title.lowercase().contains(lowerQuery) ||
                entry.description.lowercase().contains(lowerQuery) ||
                entry.module.lowercase().contains(lowerQuery) ||
                moduleTitles[entry.module]?.lowercase()?.contains(lowerQuery) == true
        }
    }

    suspend fun stats(): DocStats {
        val index = docIndex()
        return DocStats(
            docCount = index.size,
            moduleCount = index.map { it.module }.distinct().size
        )
    }

    private suspend fun loadIndex(): List<DocIndexEntry> {
        val json = assetStore.readTextOrThrow("metadata/doc-index.json")
        return decoder.decodeFromString<List<DocIndexEntry>>(json)
            .sortedWith(compareBy({ it.module }, { it.order }))
    }

    private fun parseMarkdown(content: String, slug: String): FandexDoc {
        return FrontmatterParser.parseMarkdown(content, slug)
    }
}

data class DocStats(
    val docCount: Int,
    val moduleCount: Int
)

private const val MAX_PARSED_DOCS = 32

object ReadingTime {

    fun compute(body: String): Int {
        val stripped = body
            .replace(Regex("```[\\s\\S]*?```"), "")
            .replace(Regex("[#*`~\\[\\]()>_\\-!|]"), "")
        val chars = stripped.replace(Regex("\\s"), "").length
        return maxOf(1, ceilDiv(chars, 300))
    }

    private fun ceilDiv(a: Int, b: Int): Int = (a + b - 1) / b
}
