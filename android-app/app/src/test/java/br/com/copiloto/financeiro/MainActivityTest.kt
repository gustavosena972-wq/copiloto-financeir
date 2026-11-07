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
        assertTrue(html.contains("cf-motion-camera"))
        assertTrue(html.contains("@keyframes cf-scene-float-a"))
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
        assertTrue(html.contains("setAttribute('data-motion-mode','inicio')"))
    }

    @Test
    fun bundledFinanceUiProvidesScrollRevealGlassAndInteractiveDepthMotion() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("IntersectionObserver"))
        assertTrue(html.contains("data-motion-reveal"))
        assertTrue(html.contains("data-motion-tilt"))
        assertTrue(html.contains("cf-motion-liquid"))
        assertTrue(html.contains("backdrop-filter"))
        assertTrue(html.contains("prefers-reduced-motion: reduce"))
    }

    @Test
    fun bundledFinanceUiProvidesAnExpandableLocalMotionVideo() {
        val html = File("src/main/assets/mobile.html").readText()
        val video = File("src/main/assets/copiloto-motion-preview.mp4")
        assertTrue(html.contains("data-motion-expand"))
        assertTrue(html.contains("cf-motion-dialog"))
        assertTrue(html.contains("<video"))
        assertTrue(html.contains("copiloto-motion-preview.mp4"))
        assertTrue(html.contains("playsinline"))
        assertTrue(html.contains("muted"))
        assertTrue(video.isFile)
        assertTrue(video.length() > 15_000)
    }

    @Test
    fun androidPackageIncludesCurrentLegalPages() {
        val assets = File("src/main/assets")
        val privacy = File(assets, "privacidade.html")
        val terms = File(assets, "termos.html")
        val deletion = File(assets, "excluir-conta.html")
        assertTrue(privacy.isFile && privacy.readText().contains("Política de Privacidade"))
        assertTrue(terms.isFile && terms.readText().contains("Termos de Uso"))
        assertTrue(deletion.isFile && deletion.readText().contains("Exclusão de Conta"))
        assertTrue(deletion.readText().contains("mobile.html"))
    }

    @Test
    fun demoEntryOpensTheBundledMotionPreview() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("data-motion-expand aria-label=\"Assistir à prévia animada do aplicativo\""))
        assertTrue(!html.contains("href=\"demo.html\""))
        assertTrue(!html.contains("target=\"_blank\""))
    }

    @Test
    fun releaseVersionMatchesTheAuditedAndroidPackage() {
        val gradle = File("build.gradle.kts").readText()
        assertTrue(gradle.contains("versionCode = 6"))
        assertTrue(gradle.contains("versionName = \"1.0.5\""))
    }
}
