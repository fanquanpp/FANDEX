package com.fandex.app.data.asset

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.ConcurrentHashMap

/**
 * Assets 数据源
 *
 * 负责从 APK assets 目录读取文本与目录列表，并提供内存缓存：
 * - 元数据 JSON（modules.json、doc-index.json 等）在首次读取后常驻内存，
 *   避免搜索、列表页等高频场景反复解析
 * - 文档正文以原始文本形态缓存（assets 内容不可变）；结构化解析结果
 *   由上层 DocRepository 的 LRU 缓存管理，避免长文档对象常驻内存
 */
class AssetStore(private val context: Context) {

    /** 文本缓存：路径 -> 内容 */
    private val textCache = ConcurrentHashMap<String, String>()

    /** 目录列表缓存：路径 -> 子项名列表 */
    private val dirCache = ConcurrentHashMap<String, List<String>>()

    /** 串行化 assets IO，避免并发读取同一文件时的重复解析 */
    private val mutex = Mutex()

    /**
     * 读取文本文件（带缓存）
     *
     * @param path assets 相对路径
     * @return 文件内容；不存在时返回 null
     */
    suspend fun readText(path: String): String? {
        textCache[path]?.let { return it }
        return mutex.withLock {
            textCache[path]?.let { return it }
            withContext(Dispatchers.IO) {
                runCatching {
                    context.assets.open(path).use { input ->
                        BufferedReader(InputStreamReader(input, Charsets.UTF_8)).use { reader ->
                            reader.readText()
                        }
                    }
                }.getOrNull()?.also { textCache[path] = it }
            }
        }
    }

    /**
     * 读取文本文件，不存在时抛出异常
     */
    suspend fun readTextOrThrow(path: String): String {
        return readText(path) ?: throw IllegalStateException("Asset not found: $path")
    }

    /**
     * 列出目录下的子项名（带缓存）
     *
     * @return 子项名列表；目录不存在时返回空列表
     */
    suspend fun listDir(path: String): List<String> {
        dirCache[path]?.let { return it }
        return withContext(Dispatchers.IO) {
            runCatching {
                context.assets.list(path)?.toList().orEmpty()
            }.getOrDefault(emptyList()).also { dirCache[path] = it }
        }
    }
}
