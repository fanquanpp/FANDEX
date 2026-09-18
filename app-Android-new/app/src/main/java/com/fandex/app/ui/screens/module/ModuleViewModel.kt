package com.fandex.app.ui.screens.module

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.FandexApp
import com.fandex.app.data.model.DocIndexEntry
import com.fandex.app.data.model.Module
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 模块页状态
 */
sealed class ModuleUiState {
    object Loading : ModuleUiState()
    data class Success(
        val module: Module,
        val docs: List<DocIndexEntry>,
        /** 模块主分类色（辅助装饰用多彩色） */
        val accentHex: String = "#4F5BD5"
    ) : ModuleUiState()
    data class Error(val message: String) : ModuleUiState()
}

/**
 * 模块页 ViewModel
 *
 * 组合模块元数据与模块文档索引
 */
class ModuleViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    private val _state = MutableStateFlow<ModuleUiState>(ModuleUiState.Loading)
    val state: StateFlow<ModuleUiState> = _state.asStateFlow()

    fun loadModule(moduleId: String) {
        viewModelScope.launch {
            _state.value = ModuleUiState.Loading
            try {
                val module = container.moduleRepository.module(moduleId)
                val docs = container.docRepository.docsByModule(moduleId)
                if (module != null) {
                    val accent = container.moduleRepository.categoryColorHex(moduleId)
                        ?: "#4F5BD5"
                    _state.value = ModuleUiState.Success(module, docs, accent)
                } else {
                    _state.value = ModuleUiState.Error("模块不存在")
                }
            } catch (e: Exception) {
                Log.e(TAG, "模块文档列表加载失败: $moduleId", e)
                _state.value = ModuleUiState.Error(e.message ?: "加载失败")
            }
        }
    }

    companion object {
        /** 日志 TAG */
        private const val TAG = "ModuleViewModel"
    }
}

