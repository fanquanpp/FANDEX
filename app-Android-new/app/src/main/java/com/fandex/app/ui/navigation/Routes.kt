package com.fandex.app.ui.navigation

object Routes {
    const val HOME = "home"
    const val MODULE = "module/{moduleId}"
    const val DOCUMENT = "doc/{moduleId}/{docSlug}"
    const val SYNTAX = "syntax"
    const val SYNTAX_DETAIL = "syntax/{moduleId}"
    const val LEARNING_PATH = "learning-path"
    const val LEARNING_PATH_DETAIL = "learning-path/{moduleId}"
    const val SEARCH = "search"

    fun module(moduleId: String) = "module/$moduleId"
    fun document(moduleId: String, docSlug: String) = "doc/$moduleId/$docSlug"
    fun syntaxDetail(moduleId: String) = "syntax/$moduleId"
    fun learningPathDetail(moduleId: String) = "learning-path/$moduleId"
}
