package br.com.copiloto.financeiro

import org.junit.Assert.assertEquals
import org.junit.Test

class MainActivityTest {
    @Test
    fun appStartsFromBundledFinanceUi() {
        assertEquals(
            "file:///android_asset/mobile.html",
            MainActivity.APP_ENTRY_URL
        )
    }
}
