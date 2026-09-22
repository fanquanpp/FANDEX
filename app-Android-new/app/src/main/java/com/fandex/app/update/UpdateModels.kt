package com.fandex.app.update

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.io.File

@Serializable
data class GitHubRelease(
    @SerialName("tag_name") val tagName: String = "",
    @SerialName("name") val name: String = "",
    @SerialName("body") val body: String = "",
    @SerialName("published_at") val publishedAt: String = "",
    @SerialName("html_url") val htmlUrl: String = "",
    @SerialName("assets") val assets: List<GitHubAsset> = emptyList()
)

@Serializable
data class GitHubAsset(
    @SerialName("name") val name: String = "",
    @SerialName("size") val size: Long = 0,
    @SerialName("browser_download_url") val downloadUrl: String = "",
    @SerialName("content_type") val contentType: String = ""
)

data class UpdateInfo(
    val latestVersion: String,
    val latestVersionCode: Int,
    val downloadUrl: String,
    val downloadSize: Long,
    val releaseNotes: String,
    val publishedAt: String,
    val htmlUrl: String,
    val isUpdateAvailable: Boolean
)

sealed class DownloadState {
    data object Idle : DownloadState()

    data class Downloading(
        val progress: Int,
        val downloadedBytes: Long,
        val totalBytes: Long
    ) : DownloadState()

    data class Completed(val file: File) : DownloadState()

    data class Failed(val message: String) : DownloadState()
}

sealed class CheckState {
    data object Idle : CheckState()

    data object Checking : CheckState()

    data class Available(val updateInfo: UpdateInfo) : CheckState()

    data object UpToDate : CheckState()

    data class Failed(val message: String) : CheckState()
}
