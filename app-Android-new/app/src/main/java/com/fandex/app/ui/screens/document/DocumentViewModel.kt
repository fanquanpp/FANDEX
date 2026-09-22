package com.fandex.app.ui.screens.document

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.FandexApp
import com.fandex.app.data.model.DocIndexEntry
import com.fandex.app.data.model.FandexDoc
import com.fandex.app.data.prefs.HistoryEntry
import com.fandex.app.data.repository.ReadingTime
import com.fandex.app.ui.markdown.MarkdownBlock
import com.fandex.app.ui.markdown.MarkdownRenderer
import com.fandex.app.ui.markdown.TocEntry
import com.fandex.app.ui.markdown.extractToc
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed class DocumentUiState {
    object Loading : DocumentUiState()

    data class Success(
        val doc: FandexDoc,
        val blocks: List<MarkdownBlock>,
        val toc: List<TocEntry>,
        val readingTime: Int,
        val prev: DocIndexEntry? = null,
        val next: DocIndexEntry? = null,
        val related: List<DocIndexEntry> = emptyList(),
        val prerequisites: List<DocIndexEntry> = emptyList(),
        val accentHex: String = "#4F5BD5"
    ) : DocumentUiState()

    data class Error(val message: String) : DocumentUiState()
}

class DocumentViewModel(application: Application) : AndroidViewModel(application) {

    private val container = (application as FandexApp).container
    private val docRepository = container.docRepository

    private val _state = MutableStateFlow<DocumentUiState>(DocumentUiState.Loading)
    val state: StateFlow<DocumentUiState> = _state.asStateFlow()

    fun loadDoc(moduleId: String, docSlug: String) {
        viewModelScope.launch {
            _state.value = DocumentUiState.Loading
            try {
                val doc = docRepository.doc(moduleId, docSlug)
                if (doc == null) {
                    _state.value = DocumentUiState.Error("文档不存在")
                    return@launch
                }

                val blocks = withContext(Dispatchers.Default) {
                    MarkdownRenderer().parse(doc.content)
                }
                val toc = extractToc(blocks)
                val readingTime = ReadingTime.compute(doc.content)

                val (prev, next) = docRepository.navigation(moduleId, docSlug)
                val related = docRepository.relatedDocs(moduleId, docSlug)
                val prerequisites = docRepository.prerequisites(moduleId, docSlug)

                _state.value = DocumentUiState.Success(
                    doc = doc,
                    blocks = blocks,
                    toc = toc,
                    readingTime = readingTime,
                    prev = prev,
                    next = next,
                    related = related,
                    prerequisites = prerequisites,
                    accentHex = container.moduleRepository.categoryColorHex(moduleId)
                        ?: "#4F5BD5"
                )

                container.historyPreferences.record(
                    HistoryEntry(
                        module = moduleId,
                        slug = docSlug,
                        title = doc.frontmatter.title,
                        moduleTitle = container.moduleRepository.module(moduleId)?.title ?: "",
                        timestamp = System.currentTimeMillis()
                    )
                )
            } catch (e: Exception) {
                Log.e(TAG, "文档加载失败: $moduleId/$docSlug", e)
                _state.value = DocumentUiState.Error(e.message ?: "加载失败")
            }
        }
    }

    companion object {
        private const val TAG = "DocumentViewModel"
    }
}
