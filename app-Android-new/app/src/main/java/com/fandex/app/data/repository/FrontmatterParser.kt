package com.fandex.app.data.repository

import com.fandex.app.data.model.DocFrontmatter
import com.fandex.app.data.model.FandexDoc

/**
 * Markdown frontmatter 解析器
 *
 * 从 DocRepository 提取为独立 internal 对象，便于单元测试覆盖；
 * 解析行为与原 DocRepository 私有实现完全一致。
 *
 * 覆盖 FANDEX 标准 10 字段：order, title, module, category, difficulty,
 * description, author, updated, related, prerequisites
 */
internal object FrontmatterParser {

    /** frontmatter 围栏正则：文件开头 --- 包裹的 YAML 块 */
    private val frontmatterRegex = Regex("""^---\s*\n(.*?)\n---\s*\n""", RegexOption.DOT_MATCHES_ALL)

    /**
     * 解析 Markdown：分离 frontmatter（YAML）与正文
     *
     * @param content 原始 Markdown 文本
     * @param slug 文档 slug（无 frontmatter 或缺 title 时作为标题兜底）
     */
    fun parseMarkdown(content: String, slug: String): FandexDoc {
        val match = frontmatterRegex.find(content)

        if (match == null) {
            // 无 frontmatter：整篇作为正文，标题以 slug 兜底
            return FandexDoc(
                slug = slug,
                frontmatter = DocFrontmatter(title = slug),
                content = content
            )
        }

        val body = content.substring(match.range.last + 1).trim()
        return FandexDoc(
            slug = slug,
            frontmatter = parseFrontmatter(match.groupValues[1], slug),
            content = body
        )
    }

    /**
     * 简易 YAML frontmatter 解析
     *
     * 仅支持"键: 值"与列表项"- 'xxx'"两种形态，足够覆盖标准字段；
     * 缺失字段按默认值兜底（order=0、difficulty=beginner、author=fanquanpp 等）
     */
    fun parseFrontmatter(yaml: String, slug: String): DocFrontmatter {
        var order = 0
        var title = slug
        var module = ""
        var category = ""
        var difficulty = "beginner"
        var description = ""
        var author = "fanquanpp"
        var updated = ""
        val related = mutableListOf<String>()
        val prerequisites = mutableListOf<String>()

        // 当前正在收集的列表字段（related / prerequisites 二选一，非空即结束）
        var currentList: MutableList<String>? = null

        for (rawLine in yaml.split("\n")) {
            val trimmed = rawLine.trim()
            if (trimmed.isEmpty()) continue

            // 处理列表项（related / prerequisites 的 "- 'module/文件名'" 行）
            if (currentList != null && trimmed.startsWith("- ")) {
                currentList.add(trimmed.removePrefix("- ").trim().trim('\'', '"'))
                continue
            }
            currentList = null

            val colonIndex = trimmed.indexOf(':')
            if (colonIndex <= 0) continue

            val key = trimmed.substring(0, colonIndex).trim()
            val value = trimmed.substring(colonIndex + 1).trim().trim('\'', '"')

            when (key) {
                "order" -> order = value.toIntOrNull() ?: 0
                "title" -> title = value
                "module" -> module = value
                "category" -> category = value
                "difficulty" -> difficulty = value
                "description" -> description = value
                "author" -> author = value
                "updated" -> updated = value
                // 值为空表示列表字段开始，后续 "- x" 行进入收集
                "related" -> if (value.isEmpty()) currentList = related
                "prerequisites" -> if (value.isEmpty()) currentList = prerequisites
            }
        }

        return DocFrontmatter(
            order = order,
            title = title,
            module = module,
            category = category,
            difficulty = difficulty,
            description = description,
            author = author,
            updated = updated,
            related = related,
            prerequisites = prerequisites
        )
    }
}
