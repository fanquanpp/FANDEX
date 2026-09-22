package com.fandex.app.data.repository

import com.fandex.app.data.model.DocFrontmatter
import com.fandex.app.data.model.FandexDoc

internal object FrontmatterParser {

    private val frontmatterRegex = Regex("""^---\s*\n(.*?)\n---\s*\n""", RegexOption.DOT_MATCHES_ALL)

    fun parseMarkdown(content: String, slug: String): FandexDoc {
        val normalized = content.replace("\r\n", "\n").replace('\r', '\n')
        val match = frontmatterRegex.find(normalized)

        if (match == null) {
            return FandexDoc(
                slug = slug,
                frontmatter = DocFrontmatter(title = slug),
                content = normalized
            )
        }

        val body = normalized.substring(match.range.last + 1).trim()
        return FandexDoc(
            slug = slug,
            frontmatter = parseFrontmatter(match.groupValues[1], slug),
            content = body
        )
    }

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

        var currentList: MutableList<String>? = null

        for (rawLine in yaml.split("\n")) {
            val trimmed = rawLine.trim()
            if (trimmed.isEmpty()) continue

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
