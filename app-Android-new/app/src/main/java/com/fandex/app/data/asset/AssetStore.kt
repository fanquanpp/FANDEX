package com.fandex.app.data.asset

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.ConcurrentHashMap

class AssetStore(private val context: Context) {

    private val textCache = ConcurrentHashMap<String, String>()

    private val dirCache = ConcurrentHashMap<String, List<String>>()

    private val mutex = Mutex()

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

    suspend fun readTextOrThrow(path: String): String {
        return readText(path) ?: throw IllegalStateException("Asset not found: $path")
    }

    suspend fun listDir(path: String): List<String> {
        dirCache[path]?.let { return it }
        return withContext(Dispatchers.IO) {
            runCatching {
                context.assets.list(path)?.toList().orEmpty()
            }.getOrDefault(emptyList()).also { dirCache[path] = it }
        }
    }
}
