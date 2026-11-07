package br.com.copiloto.financeiro

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppContentPolicyTest {
    @Test
    fun acceptsBundledFinanceAppAssetUrl() {
        assertTrue(
            AppContentPolicy.isTrustedUrl(
                scheme = "https",
                host = "appassets.androidplatform.net",
                path = "/assets/mobile.html"
            )
        )
    }

    @Test
    fun rejectsInstitutionalShowcaseAsAppContent() {
        assertFalse(
            AppContentPolicy.isTrustedUrl(
                scheme = "https",
                host = "gustavosena972-wq.github.io",
                path = "/copiloto-financeir/"
            )
        )
    }

    @Test
    fun rejectsUnexpectedSchemesAndPaths() {
        assertFalse(
            AppContentPolicy.isTrustedUrl(
                scheme = "http",
                host = "appassets.androidplatform.net",
                path = "/assets/mobile.html"
            )
        )
        assertFalse(
            AppContentPolicy.isTrustedUrl(
                scheme = "https",
                host = "appassets.androidplatform.net",
                path = "/other/mobile.html"
            )
        )
    }
}
