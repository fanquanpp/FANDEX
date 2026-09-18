package com.fandex.app.ui.screens.syntax

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.FandexApp
import com.fandex.app.data.model.SyntaxCard
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 语法详情页状态
 */
sealed class SyntaxDetailUiState {
    object Loading : SyntaxDetailUiState()
    data class Success(
        val cards: List<SyntaxCard>,
        /** 卡片 docTitle -> 模块内文档 slug 的映射（用于跳转原文） */
        val docTitleToSlug: Map<String, String> = emptyMap()
    ) : SyntaxDetailUiState()
    data class Error(val message: String) : SyntaxDetailUiState()
}

/**
 * 语法详情 ViewModel
 *
 * 加载单语言语法卡片；解析卡片 docTitle 与模块文档标题的对应关系，
 * 支持卡片跳转到来源文档
 */
class SyntaxDetailViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    private val _state = MutableStateFlow<SyntaxDetailUiState>(SyntaxDetailUiState.Loading)
    val state: StateFlow<SyntaxDetailUiState> = _state.asStateFlow()

    /** 搜索关键词 */
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    /** 语言显示名（来自语法索引） */
    private val _title = MutableStateFlow("")
    val title: StateFlow<String> = _title.asStateFlow()

    /** 语言主题色（辅助装饰用多彩色，来自语法索引） */
    private val _accentHex = MutableStateFlow("#4F5BD5")
    val accentHex: StateFlow<String> = _accentHex.asStateFlow()

    fun loadModule(moduleId: String) {
        viewModelScope.launch {
            _state.value = SyntaxDetailUiState.Loading
            try {
                // 语言显示名与主题色（索引缺失时回退模块 ID）
                val language = container.syntaxRepository.languages()
                    .languages.find { it.id == moduleId }
                _title.value = language?.title ?: moduleId
                _accentHex.value = language?.color?.ifEmpty { "#4F5BD5" } ?: "#4F5BD5"

                val module = container.syntaxRepository.module(moduleId)
                if (module == null) {
                    _state.value = SyntaxDetailUiState.Error("语法数据不存在")
                    return@launch
                }

                // docTitle -> slug 映射：按模块文档索引匹配中文标题
                val moduleDocs = container.docRepository.docsByModule(moduleId)
                val titleToSlug = moduleDocs.associate { it.title to it.slug }

                _state.value = SyntaxDetailUiState.Success(
                    cards = module.cards,
                    docTitleToSlug = titleToSlug
                )
            } catch (e: Exception) {
                Log.e(TAG, "语法详情加载失败: $moduleId", e)
                _state.value = SyntaxDetailUiState.Error(e.message ?: "加载失败")
            }
        }
    }

    /**
     * 更新搜索关键词
     */
    fun updateQuery(query: String) {
        _query.value = query
    }

    companion object {
        /** 日志 TAG */
        private const val TAG = "SyntaxDetailViewModel"
    }
}
