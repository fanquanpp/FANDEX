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

sealed class SyntaxDetailUiState {
    object Loading : SyntaxDetailUiState()
    data class Success(
        val cards: List<SyntaxCard>,
        val docTitleToSlug: Map<String, String> = emptyMap()
    ) : SyntaxDetailUiState()
    data class Error(val message: String) : SyntaxDetailUiState()
}

class SyntaxDetailViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    private val _state = MutableStateFlow<SyntaxDetailUiState>(SyntaxDetailUiState.Loading)
    val state: StateFlow<SyntaxDetailUiState> = _state.asStateFlow()

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _title = MutableStateFlow("")
    val title: StateFlow<String> = _title.asStateFlow()

    private val _accentHex = MutableStateFlow("#4F5BD5")
    val accentHex: StateFlow<String> = _accentHex.asStateFlow()

    fun loadModule(moduleId: String) {
        viewModelScope.launch {
            _state.value = SyntaxDetailUiState.Loading
            try {
                val language = container.syntaxRepository.languages()
                    .languages.find { it.id == moduleId }
                _title.value = language?.title ?: moduleId
                _accentHex.value = language?.color?.ifEmpty { "#4F5BD5" } ?: "#4F5BD5"

                val module = container.syntaxRepository.module(moduleId)
                if (module == null) {
                    _state.value = SyntaxDetailUiState.Error("语法数据不存在")
                    return@launch
                }

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

    fun updateQuery(query: String) {
        _query.value = query
    }

    companion object {
        private const val TAG = "SyntaxDetailViewModel"
    }
}
