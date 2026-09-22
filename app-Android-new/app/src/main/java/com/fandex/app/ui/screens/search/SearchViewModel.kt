package com.fandex.app.ui.screens.search

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.FandexApp
import com.fandex.app.data.model.DocIndexEntry
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SearchViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _results = MutableStateFlow<List<DocIndexEntry>>(emptyList())
    val results: StateFlow<List<DocIndexEntry>> = _results.asStateFlow()

    private val _isSearching = MutableStateFlow(false)
    val isSearching: StateFlow<Boolean> = _isSearching.asStateFlow()

    private val _moduleTitles = MutableStateFlow<Map<String, String>>(emptyMap())
    val moduleTitles: StateFlow<Map<String, String>> = _moduleTitles.asStateFlow()

    private var searchJob: Job? = null

    init {
        viewModelScope.launch {
            _moduleTitles.value = container.moduleRepository.metadata()
                .modules.associate { it.id to it.title }
        }
    }

    fun updateQuery(newQuery: String) {
        _query.value = newQuery
        searchJob?.cancel()
        if (newQuery.isBlank()) {
            _results.value = emptyList()
            _isSearching.value = false
            return
        }
        searchJob = viewModelScope.launch {
            delay(300)
            _isSearching.value = true
            try {
                _results.value = container.docRepository.search(newQuery, _moduleTitles.value)
            } finally {
                _isSearching.value = false
            }
        }
    }
}
