package com.fandex.app.ui.screens.learningpath

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.FandexApp
import com.fandex.app.data.model.LearningPathSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LearningPathUiState {
    object Loading : LearningPathUiState()
    data class Success(val paths: List<LearningPathSummary>) : LearningPathUiState()
    data class Error(val message: String) : LearningPathUiState()
}

class LearningPathViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    private val _state = MutableStateFlow<LearningPathUiState>(LearningPathUiState.Loading)
    val state: StateFlow<LearningPathUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.value = LearningPathUiState.Loading
            try {
                _state.value = LearningPathUiState.Success(container.learningPathRepository.paths())
            } catch (e: Exception) {
                Log.e(TAG, "学习路径列表加载失败", e)
                _state.value = LearningPathUiState.Error(e.message ?: "加载失败")
            }
        }
    }

    companion object {
        private const val TAG = "LearningPathViewModel"
    }
}
