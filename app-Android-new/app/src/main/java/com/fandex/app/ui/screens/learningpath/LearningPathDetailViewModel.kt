package com.fandex.app.ui.screens.learningpath

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.FandexApp
import com.fandex.app.data.model.LearningPath
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LearningPathDetailUiState {
    object Loading : LearningPathDetailUiState()
    data class Success(val path: LearningPath) : LearningPathDetailUiState()
    data class Error(val message: String) : LearningPathDetailUiState()
}

class LearningPathDetailViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    private val _state = MutableStateFlow<LearningPathDetailUiState>(LearningPathDetailUiState.Loading)
    val state: StateFlow<LearningPathDetailUiState> = _state.asStateFlow()

    private val _title = MutableStateFlow("")
    val title: StateFlow<String> = _title.asStateFlow()

    private val _accentHex = MutableStateFlow("#4F5BD5")
    val accentHex: StateFlow<String> = _accentHex.asStateFlow()

    fun loadPath(moduleId: String) {
        viewModelScope.launch {
            _state.value = LearningPathDetailUiState.Loading
            try {
                _title.value = container.moduleRepository.module(moduleId)?.title ?: moduleId
                _accentHex.value = container.moduleRepository.categoryColorHex(moduleId)
                    ?: "#4F5BD5"

                val path = container.learningPathRepository.path(moduleId)
                if (path != null) {
                    _state.value = LearningPathDetailUiState.Success(path)
                } else {
                    _state.value = LearningPathDetailUiState.Error("学习路径不存在")
                }
            } catch (e: Exception) {
                Log.e(TAG, "学习路径详情加载失败: $moduleId", e)
                _state.value = LearningPathDetailUiState.Error(e.message ?: "加载失败")
            }
        }
    }

    companion object {
        private const val TAG = "LearningPathDetailViewModel"
    }
}
