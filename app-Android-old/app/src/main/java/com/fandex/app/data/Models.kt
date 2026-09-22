package com.fandex.app.data

import com.google.gson.annotations.SerializedName

data class ContentIndex(
    val version: String = "",
    @SerializedName("generatedAt") val generatedAt: String = "",
    val categories: List<Category> = emptyList(),
    val modules: List<Module> = emptyList(),
    val documents: List<Document> = emptyList()
)

data class Category(
    val id: String,
    val label: String,
    val color: String
)

data class Module(
    val id: String,
    val title: String,
    val category: String = "",
    val description: String = "",
    val documents: List<String> = emptyList()
)

data class Document(
    val slug: String,
    val title: String = "",
    val module: String = "",
    val category: String = "",
    val difficulty: String = "",
    val description: String = ""
)

fun ContentIndex.resolveDocuments(module: Module): List<Document> {
    val byKey = documents.associateBy { "${it.module}/${it.slug}" }
    return module.documents.map { slug ->
        byKey["${module.id}/$slug"] ?: Document(slug = slug, title = slug, module = module.id)
    }
}
