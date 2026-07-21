package com.fandex.app.data

import android.content.Context
import android.content.res.AssetManager
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream

/**
 * ContentLoader 单元测试
 *
 * 测试目标：
 * - loadIndex 正常解析路径：返回有效的 ContentIndex 对象
 * - loadIndex 文件不存在路径：assets.open 抛 IOException，返回 null
 * - loadIndex JSON 格式错误路径：Gson 解析失败，返回 null
 * - loadDocumentMarkdown 正常加载路径：返回 Markdown 字符串
 * - loadDocumentMarkdown 异常路径：assets.open 抛 IOException，返回 null
 *
 * 测试策略：
 * - 使用 Mockito mock Context 与 AssetManager，避免依赖真实文件系统
 * - 使用 ByteArrayInputStream 模拟 InputStream，控制返回内容
 * - 使用 runTest 协程测试调度器，验证 suspend 函数行为
 * - AssetManager 是 final 类，Mockito 5.x 默认 inline mock maker 支持 mock final 类
 */
class ContentLoaderTest {

    /** Context mock，用于传入 ContentLoader */
    private val mockContext: Context = mock()

    /** AssetManager mock，用于控制 assets.open() 行为 */
    private val mockAssets: AssetManager = mock()

    /**
     * 测试 loadIndex 正常解析路径
     *
     * 输入：有效的 index.json 内容
     * 期望：返回 ContentIndex 对象，version、categories、modules、documents 字段正确填充
     */
    @Test
    fun `loadIndex 正常解析返回有效 ContentIndex`() = runTest {
        // 准备：构造与 Models.kt 数据结构匹配的有效 JSON
        val json = """
            {
              "version": "1.0.0",
              "generatedAt": "2026-07-14",
              "categories": [
                {"id": "backend", "label": "后端", "color": "#1976D2"}
              ],
              "modules": [
                {"id": "java", "title": "Java", "category": "backend"}
              ],
              "documents": [
                {"slug": "java-basic", "title": "Java 基础", "module": "java"}
              ]
            }
        """.trimIndent()
        val stream: InputStream = ByteArrayInputStream(json.toByteArray(Charsets.UTF_8))

        // 桩：mockContext.assets 返回 mockAssets，open(index.json) 返回模拟流
        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/index.json")).thenReturn(stream)

        // 执行
        val result = ContentLoader.loadIndex(mockContext)

        // 验证：返回非 null，且各字段被正确解析
        assertNotNull(result)
        result!!
        assertEquals("1.0.0", result.version)
        assertEquals("2026-07-14", result.generatedAt)
        assertEquals(1, result.categories.size)
        assertEquals("backend", result.categories[0].id)
        assertEquals("后端", result.categories[0].label)
        assertEquals("#1976D2", result.categories[0].color)
        assertEquals(1, result.modules.size)
        assertEquals("java", result.modules[0].id)
        assertEquals("Java", result.modules[0].title)
        assertEquals("backend", result.modules[0].category)
        assertEquals(1, result.documents.size)
        assertEquals("java-basic", result.documents[0].slug)
        assertEquals("Java 基础", result.documents[0].title)
        assertEquals("java", result.documents[0].module)
    }

    /**
     * 测试 loadIndex 文件不存在路径
     *
     * 输入：assets.open 抛 IOException
     * 期望：catch 捕获异常，返回 null
     */
    @Test
    fun `loadIndex 文件不存在返回 null`() = runTest {
        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/index.json"))
            .thenThrow(IOException("file not found"))

        val result = ContentLoader.loadIndex(mockContext)

        assertNull(result)
    }

    /**
     * 测试 loadIndex JSON 格式错误路径
     *
     * 输入：格式错误的 JSON 字符串（categories 数组未闭合）
     * 期望：Gson.fromJson 抛 JsonSyntaxException，被 catch 捕获，返回 null
     */
    @Test
    fun `loadIndex JSON 格式错误返回 null`() = runTest {
        // 准备：构造格式错误的 JSON（数组未闭合）
        val brokenJson = """{ "version": "broken", "categories": [ }"""
        val stream: InputStream = ByteArrayInputStream(brokenJson.toByteArray(Charsets.UTF_8))

        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/index.json")).thenReturn(stream)

        val result = ContentLoader.loadIndex(mockContext)

        assertNull(result)
    }

    /**
     * 测试 loadDocumentMarkdown 正常加载路径
     *
     * 输入：模拟 Markdown 文件内容
     * 期望：返回与输入一致的 Markdown 字符串
     */
    @Test
    fun `loadDocumentMarkdown 正常加载返回内容`() = runTest {
        val markdown = "# 测试文档\n\n正文内容"
        val stream: InputStream = ByteArrayInputStream(markdown.toByteArray(Charsets.UTF_8))

        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/docs/java/java-basic.md")).thenReturn(stream)

        val result = ContentLoader.loadDocumentMarkdown(mockContext, "java", "java-basic")

        assertNotNull(result)
        assertEquals(markdown, result)
    }

    /**
     * 测试 loadDocumentMarkdown 异常路径
     *
     * 输入：assets.open 抛 IOException（模块或文档不存在）
     * 期望：catch 捕获异常，返回 null
     */
    @Test
    fun `loadDocumentMarkdown 异常路径返回 null`() = runTest {
        whenever(mockContext.assets).thenReturn(mockAssets)
        whenever(mockAssets.open("dist-mobile/docs/unknown/unknown.md"))
            .thenThrow(IOException("not found"))

        val result = ContentLoader.loadDocumentMarkdown(mockContext, "unknown", "unknown")

        assertNull(result)
    }
}
