package com.fandex.app.data

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStreamReader

/**
 * 内容索引加载服务
 *
 * 功能：从 assets/dist-mobile/ 加载并解析内容索引和文档
 * 输入：Context（用于访问 assets）
 * 输出：ContentIndex 数据对象、文档内容字符串
 * 流程：打开 assets 文件 -> 读取 JSON/文本 -> 解析/返回
 *
 * 说明：所有 IO 操作均为 suspend 函数，内部使用 withContext(Dispatchers.IO)
 *      切换至 IO 调度器，避免阻塞主线程。
 */
object ContentLoader {

    /** 日志 TAG */
    private const val TAG = "ContentLoader"

    /** 索引文件路径 */
    private const val INDEX_PATH = "dist-mobile/index.json"

    /** JSON 解析器（线程安全，全局复用） */
    private val gson = Gson()

    /**
     * 加载内容索引
     *
     * 输入：Context
     * 输出：ContentIndex 或 null（加载失败时）
     * 流程：切换至 IO 线程 -> 打开文件流 -> InputStreamReader 读取 -> Gson 反序列化
     */
    suspend fun loadIndex(context: Context): ContentIndex? = withContext(Dispatchers.IO) {
        return@withContext try {
            /* 使用 use {} 块自动关闭资源，避免手动 try-finally 遗漏关闭 */
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

    /**
     * 加载指定文档的 Markdown 内容
     *
     * 输入：Context、模块 ID、文档 slug
     * 输出：Markdown 字符串或 null
     * 流程：切换至 IO 线程 -> 拼接路径 -> 打开文件流 -> 读取为字符串
     */
    suspend fun loadDocumentMarkdown(context: Context, module: String, slug: String): String? =
        withContext(Dispatchers.IO) {
            return@withContext try {
                val path = "dist-mobile/docs/$module/$slug.md"
                /* 使用 use {} 块自动关闭资源，避免手动 try-finally 遗漏关闭 */
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
