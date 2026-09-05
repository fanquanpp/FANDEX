package com.fandex.app

import com.fandex.app.data.repository.FrontmatterParser
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * frontmatter 解析单元测试
 *
 * 覆盖：标准 10 字段、列表字段、无 frontmatter、缺字段兜底、
 * 引号剥离、非法 order 数值兜底
 */
class FrontmatterParserTest {

    /** 标准 10 字段文档：全部字段正确解析 */
    @Test
    fun parsesAllTenStandardFields() {
        val markdown = """
            ---
            order: 40
            title: 标题
            module: 'getting-started'
            category: 工具链
            difficulty: intermediate
            description: 一句话描述。
            author: fanquanpp
            updated: '2026-08-01'
            related:
              - 'markdown/001-Overview'
              - "git/002-Basic"
            prerequisites:
              - 'getting-started/001-Intro'
            ---

            # 正文标题

            正文内容。
        """.trimIndent()

        val doc = FrontmatterParser.parseMarkdown(markdown, "040-Doc")

        assertEquals(40, doc.frontmatter.order)
        assertEquals("标题", doc.frontmatter.title)
        assertEquals("getting-started", doc.frontmatter.module)
        assertEquals("工具链", doc.frontmatter.category)
        assertEquals("intermediate", doc.frontmatter.difficulty)
        assertEquals("一句话描述。", doc.frontmatter.description)
        assertEquals("fanquanpp", doc.frontmatter.author)
        assertEquals("2026-08-01", doc.frontmatter.updated)
        assertEquals(listOf("markdown/001-Overview", "git/002-Basic"), doc.frontmatter.related)
        assertEquals(listOf("getting-started/001-Intro"), doc.frontmatter.prerequisites)

        // 正文应剔除 frontmatter 围栏
        assertEquals("# 正文标题\n\n正文内容。", doc.content)
        assertEquals("040-Doc", doc.slug)
    }

    /** 无 frontmatter：整篇作为正文，标题以 slug 兜底 */
    @Test
    fun parsesMarkdownWithoutFrontmatter() {
        val markdown = "# 只有正文\n\n没有 frontmatter 围栏。"
        val doc = FrontmatterParser.parseMarkdown(markdown, "fallback-slug")

        assertEquals("fallback-slug", doc.frontmatter.title)
        assertEquals(markdown, doc.content)
        assertEquals(0, doc.frontmatter.order)
        assertEquals(emptyList<String>(), doc.frontmatter.related)
        assertEquals(emptyList<String>(), doc.frontmatter.prerequisites)
    }

    /** 部分字段缺失：缺失字段按默认值兜底 */
    @Test
    fun fillsDefaultsForMissingFields() {
        val markdown = """
            ---
            title: 只有标题与正文
            ---

            正文。
        """.trimIndent()

        val doc = FrontmatterParser.parseMarkdown(markdown, "030-Partial")

        assertEquals("只有标题与正文", doc.frontmatter.title)
        assertEquals(0, doc.frontmatter.order)                 // order 缺失 -> 0
        assertEquals("", doc.frontmatter.module)               // module 缺失 -> 空串
        assertEquals("beginner", doc.frontmatter.difficulty)   // difficulty 兜底
        assertEquals("fanquanpp", doc.frontmatter.author)      // author 兜底
        assertEquals("", doc.frontmatter.updated)
        assertEquals("正文。", doc.content)
    }

    /** 标题缺失：以 slug 兜底 */
    @Test
    fun fallsBackToSlugWhenTitleMissing() {
        val markdown = "---\norder: 10\n---\n\n正文。"
        val doc = FrontmatterParser.parseMarkdown(markdown, "010-NoTitle")
        assertEquals("010-NoTitle", doc.frontmatter.title)
        assertEquals(10, doc.frontmatter.order)
    }

    /** 非法 order 数值：兜底为 0 */
    @Test
    fun invalidOrderFallsBackToZero() {
        val doc = FrontmatterParser.parseFrontmatter("order: abc", "slug")
        assertEquals(0, doc.order)
    }

    /** frontmatter 后无正文：正文为空字符串 */
    @Test
    fun emptyBodyAfterFrontmatter() {
        val markdown = "---\ntitle: T\n---\n"
        val doc = FrontmatterParser.parseMarkdown(markdown, "slug")
        assertEquals("", doc.content)
        assertEquals("T", doc.frontmatter.title)
    }

    /** 直解 frontmatter YAML（不经围栏切分），列表项无缩进也可解析 */
    @Test
    fun parsesRawYamlDirectly() {
        val fm = FrontmatterParser.parseFrontmatter("title: '带引号标题'\nrelated:\n- 'a/001'", "slug")
        assertEquals("带引号标题", fm.title)
        assertEquals(listOf("a/001"), fm.related)
    }
}
