package com.fandex.app.ui.screens.home

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.FandexApp
import com.fandex.app.data.model.CategoryInfo
import com.fandex.app.data.prefs.HistoryEntry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * 首页状态
 */
sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(
        val categories: List<CategoryInfo>,
        val docCount: Int,
        val moduleCount: Int
    ) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}

/**
 * 首页 ViewModel
 *
 * 聚合分类模块视图与站点统计；主页开门见山直入内容，
 * Hero 与设置类信息已移除（设置收纳于抽屉）
 */
class HomeViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    private val _state = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    /** 最近浏览（最新在前） */
    val recentDocs: StateFlow<List<HistoryEntry>> = container.historyPreferences.history
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun load() {
        viewModelScope.launch {
            try {
                val categories = container.moduleRepository.categories()
                val stats = container.docRepository.stats()
                _state.value = HomeUiState.Success(
                    categories = categories,
                    docCount = stats.docCount,
                    moduleCount = stats.moduleCount
                )
            } catch (e: Exception) {
                Log.e(TAG, "首页数据加载失败", e)
                _state.value = HomeUiState.Error(e.message ?: "加载失败")
            }
        }
    }

    companion object {
        /** 日志 TAG */
        private const val TAG = "HomeViewModel"
    }
}
