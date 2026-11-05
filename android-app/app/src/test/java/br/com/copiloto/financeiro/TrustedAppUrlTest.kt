package br.com.copiloto.financeiro

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TrustedAppUrlTest {
    @Test
    fun allowsCanonicalHttpsOrigin() {
        assertTrue(TrustedAppUrl.isAllowed("https://copiloto-financeir.gustavosena972.workers.dev/"))
    }

    @Test
    fun allowsNestedPathsOnCanonicalOrigin() {
        assertTrue(TrustedAppUrl.isAllowed("https://copiloto-financeir.gustavosena972.workers.dev/conta/recuperar"))
    }

    @Test
    fun rejectsHttpAndLookalikeHosts() {
        assertFalse(TrustedAppUrl.isAllowed("http://copiloto-financeir.gustavosena972.workers.dev/"))
        assertFalse(TrustedAppUrl.isAllowed("https://copiloto-financeir.gustavosena972.workers.dev.evil.example/"))
        assertFalse(TrustedAppUrl.isAllowed("https://evil.example/copiloto-financeir.gustavosena972.workers.dev/"))
    }

    @Test
    fun rejectsUnexpectedPortsAndUserInfo() {
        assertFalse(TrustedAppUrl.isAllowed("https://copiloto-financeir.gustavosena972.workers.dev:8443/"))
        assertFalse(TrustedAppUrl.isAllowed("https://evil.example@copiloto-financeir.gustavosena972.workers.dev/"))
    }

    @Test
    fun rejectsMalformedAndNonHttpUrls() {
        assertFalse(TrustedAppUrl.isAllowed(null))
        assertFalse(TrustedAppUrl.isAllowed(""))
        assertFalse(TrustedAppUrl.isAllowed("javascript:alert(1)"))
        assertFalse(TrustedAppUrl.isAllowed("file:///android_asset/index.html"))
        assertFalse(TrustedAppUrl.isAllowed("not a url"))
    }
}
