package com.fandex.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ModulesMetadata(
    val version: String = "",
    @SerialName("categoryLabels") val categoryLabels: Map<String, String> = emptyMap(),
    @SerialName("categoryColors") val categoryColors: Map<String, String> = emptyMap(),
    @SerialName("categoryOrder") val categoryOrder: List<String> = emptyList(),
    val modules: List<Module> = emptyList()
)

@Serializable
data class Module(
    val id: String,
    val title: String,
    val icon: String = "",
    val description: String = "",
    val categories: List<String> = emptyList(),
    @SerialName("folder_order") val folderOrder: Int = 0,
    @SerialName("updatePriority") val updatePriority: Boolean = false,
    @SerialName("updateNote") val updateNote: String? = null,
    @SerialName("officialDocs") val officialDocs: List<OfficialDoc> = emptyList()
)

@Serializable
data class OfficialDoc(
    val label: String,
    val url: String,
    val type: String = "docs"
)

@Serializable
data class DocFrontmatter(
    val order: Int = 0,
    val title: String,
    val module: String = "",
    val category: String = "",
    val difficulty: String = "beginner",
    val description: String = "",
    val author: String = "fanquanpp",
    val updated: String = "",
    val related: List<String> = emptyList(),
    val prerequisites: List<String> = emptyList()
)

data class FandexDoc(
    val slug: String,
    val frontmatter: DocFrontmatter,
    val content: String
)

@Serializable
data class DocIndexEntry(
    val slug: String,
    val title: String,
    val module: String,
    val category: String = "",
    val difficulty: String = "beginner",
    val description: String = "",
    val order: Int = 0,
    val updated: String = ""
)

data class CategoryInfo(
    val id: String,
    val label: String,
    val colorHex: String,
    val modules: List<Module>
)

@Serializable
data class SyntaxLanguage(
    val id: String,
    val title: String,
    val icon: String = "",
    val color: String = "",
    val count: Int = 0,
    @SerialName("docCount") val docCount: Int = 0
)

@Serializable
data class SyntaxIndex(
    val version: Int = 1,
    @SerialName("generatedAt") val generatedAt: String = "",
    val languages: List<SyntaxLanguage> = emptyList()
)

@Serializable
data class SyntaxCard(
    val id: String = "",
    @SerialName("docTitle") val docTitle: String = "",
    val section: String = "",
    val name: String = "",
    val formula: String = "",
    val code: String = "",
    val lang: String = "",
    val truncated: Boolean = false
)

@Serializable
data class SyntaxModule(
    val module: String = "",
    val cards: List<SyntaxCard> = emptyList()
)

@Serializable
data class LearningPathIndex(
    val version: String = "",
    val order: List<String> = emptyList()
)

@Serializable
data class LearningPathStage(
    val id: String = "",
    val title: String = "",
    val subtitle: String = "",
    val nodes: List<LearningPathNode> = emptyList()
)

@Serializable
data class LearningPathNode(
    val id: String = "",
    val title: String = "",
    val doc: String = "",
    val desc: String = "",
    val difficulty: String = "beginner"
)

@Serializable
data class LearningPath(
    val version: String = "",
    val module: String = "",
    val summary: String = "",
    val stages: List<LearningPathStage> = emptyList()
)

data class LearningPathSummary(
    val moduleId: String,
    val title: String,
    val description: String,
    val stageCount: Int,
    val colorHex: String = "#4F5BD5"
)
