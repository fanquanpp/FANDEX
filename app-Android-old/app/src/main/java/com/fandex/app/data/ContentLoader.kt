package com.fandex.app.data

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStreamReader

object ContentLoader {

    private const val TAG = "ContentLoader"

    private const val INDEX_PATH = "dist-mobile/index.json"

    private val gson = Gson()

    suspend fun loadIndex(context: Context): ContentIndex? = withContext(Dispatchers.IO) {
        return@withContext try {
            context.assets.open(INDEX_PATH).use { inputStream ->
                InputStreamReader(inputStream, "UTF-8").use { reader ->
                    gson.fromJson(reader, ContentIndex::class.java)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "加载内容索引失败: ${e.message}", e)
            null
        }
    }

    suspend fun loadDocumentMarkdown(context: Context, module: String, slug: String): String? =
        withContext(Dispatchers.IO) {
            return@withContext try {
                val path = "dist-mobile/docs/$module/$slug.md"
                context.assets.open(path).use { inputStream ->
                    InputStreamReader(inputStream, "UTF-8").use { reader ->
                        reader.readText()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "加载文档 Markdown 内容失败: ${e.message}", e)
                null
            }
        }
}
