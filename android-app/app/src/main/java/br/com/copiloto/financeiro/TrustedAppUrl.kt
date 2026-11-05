package br.com.copiloto.financeiro

import java.net.URI

internal object TrustedAppUrl {
    private const val ALLOWED_HOST = "copiloto-financeir.gustavosena972.workers.dev"

    fun isAllowed(rawUrl: String?): Boolean {
        if (rawUrl.isNullOrBlank()) return false

        val uri = runCatching { URI(rawUrl) }.getOrNull() ?: return false
        return uri.scheme.equals("https", ignoreCase = true) &&
            uri.host.equals(ALLOWED_HOST, ignoreCase = true) &&
            (uri.port == -1 || uri.port == 443) &&
            uri.rawUserInfo == null &&
            uri.path.orEmpty().startsWith("/")
    }
}
