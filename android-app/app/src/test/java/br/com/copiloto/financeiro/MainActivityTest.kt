package br.com.copiloto.financeiro

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MainActivityTest {
    @Test
    fun appStartsFromBundledFinanceUi() {
        assertEquals(
            "https://appassets.androidplatform.net/assets/mobile.html",
            MainActivity.APP_ENTRY_URL
        )
    }

    @Test
    fun bundledFinanceUiUsesControlledInternalTesterAccessCheck() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("sb.rpc('is_internal_tester')"))
        assertTrue(html.contains("S.internalTester"))
    }
}
