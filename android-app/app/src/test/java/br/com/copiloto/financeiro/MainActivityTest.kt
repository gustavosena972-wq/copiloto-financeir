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

    @Test
    fun bundledFinanceUiUsesPremiumFintechVisualSystem() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("--surface:#ffffff"))
        assertTrue(html.contains("--primary:#146c43"))
        assertTrue(html.contains("data-ui=\"premium-fintech\""))
    }

    @Test
    fun bundledFinanceUiUsesWholeScreenMotionSystem() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-motion-world"))
        assertTrue(html.contains("cf-motion-image"))
        assertTrue(html.contains("data-motion-parallax"))
        assertTrue(html.contains("@keyframes cf-image-float"))
        assertTrue(html.contains("prefers-reduced-motion:reduce"))
    }
    @Test
    fun bundledFinanceUiUsesImmersiveInteractiveMotionWorld() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-motion-canvas"))
        assertTrue(html.contains("cf-motion-camera"))
        assertTrue(html.contains("cf-motion-orbit"))
        assertTrue(html.contains("cf-motion-ripple"))
        assertTrue(html.contains("visibilitychange"))
        assertTrue(html.contains("prefers-reduced-motion: reduce"))
        assertTrue(html.contains("data-motion-mode"))
    }
}
