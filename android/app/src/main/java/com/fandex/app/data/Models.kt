package com.fandex.app.data

import com.google.gson.annotations.SerializedName

/**
 * 内容索引数据模型
 *
 * 对应 assets/dist-mobile/index.json 的数据结构
 * 输入：JSON 字符串
 * 输出：结构化的分类与模块数据
 */
data class ContentIndex(
    val version: String = "",
    @SerializedName("generatedAt") val generatedAt: String = "",
    val categories: List<Category> = emptyList(),
    val modules: List<Module> = emptyList(),
    val documents: List<Document> = emptyList()
)

/**
 * 分类数据模型
 *
 * 输入：JSON 中的分类对象
 * 输出：分类 ID、标签、颜色
 */
data class Category(
    val id: String,
    val label: String,
    val color: String
)

/**
 * 模块数据模型
 *
 * 输入：JSON 中的模块对象
 * 输出：模块 ID、标题、分类、文档列表
 */
data class Module(
    val id: String,
    val title: String,
    val category: String = "",
    val description: String = "",
    val documents: List<String> = emptyList()
)

/**
 * 文档数据模型
 *
 * 输入：JSON 中的文档对象
 * 输出：文档 slug、标题、所属模块、分类、难度、描述
 */
data class Document(
    val slug: String,
    val title: String = "",
    val module: String = "",
    val category: String = "",
    val difficulty: String = "",
    val description: String = ""
)
