package com.fandex.app.update

import com.google.gson.annotations.SerializedName
import java.io.File

data class GitHubRelease(
    @SerializedName("tag_name") val tagName: String = "",
    @SerializedName("name") val name: String = "",
    @SerializedName("body") val body: String = "",
    @SerializedName("published_at") val publishedAt: String = "",
    @SerializedName("html_url") val htmlUrl: String = "",
    @SerializedName("assets") val assets: List<GitHubAsset> = emptyList()
)

data class GitHubAsset(
    @SerializedName("name") val name: String = "",
    @SerializedName("size") val size: Long = 0,
    @SerializedName("browser_download_url") val downloadUrl: String = "",
    @SerializedName("content_type") val contentType: String = ""
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
    object Idle : DownloadState()

    data class Downloading(
        val progress: Int,
        val downloadedBytes: Long,
        val totalBytes: Long
    ) : DownloadState()

    data class Completed(val file: File) : DownloadState()

    data class Failed(val message: String) : DownloadState()
}

sealed class CheckState {
    object Idle : CheckState()

    object Checking : CheckState()

    data class Available(val updateInfo: UpdateInfo) : CheckState()

    object UpToDate : CheckState()

    data class Failed(val message: String) : CheckState()
}
