package br.com.copiloto.financeiro

internal object AppContentPolicy {
    const val ASSET_HOST = "appassets.androidplatform.net"
    const val ASSET_PATH_PREFIX = "/assets/"
    const val START_URL = "https://$ASSET_HOST${ASSET_PATH_PREFIX}mobile.html"

    fun isTrustedUrl(scheme: String?, host: String?, path: String?): Boolean {
        return scheme == "https" &&
            host == ASSET_HOST &&
            path?.startsWith(ASSET_PATH_PREFIX) == true
    }
}
