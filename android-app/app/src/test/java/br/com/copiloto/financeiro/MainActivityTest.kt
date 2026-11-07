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
        assertTrue(html.contains("cf-neural-mesh"))
        assertTrue(html.contains("cf-ai-node"))
        assertTrue(html.contains("rgba(91,205,137"))
        assertTrue(html.contains("visibilitychange"))
        assertTrue(html.contains("prefers-reduced-motion: reduce"))
        assertTrue(html.contains("setAttribute('data-motion-mode','inicio')"))
    }

    @Test
    fun bundledFinanceUiProvidesAnImmersiveOpeningHero() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-opening-scene"))
        assertTrue(html.contains("cf-holo-dashboard"))
        assertTrue(html.contains("cf-finance-orbit"))
        assertTrue(html.contains("cf-data-stream"))
        assertTrue(html.contains("cf-cursor-light"))
        assertTrue(html.contains("data-opening-interactive"))
        assertTrue(html.contains("cf-opening-reveal"))
    }

    @Test
    fun bundledFinanceUiProvidesAnimatedProductScreens() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("viewAnimatedScene"))
        assertTrue(html.contains("cf-screen-stage"))
        assertTrue(html.contains("cf-screen-ledger"))
        assertTrue(html.contains("cf-screen-orbit"))
        assertTrue(html.contains("cf-screen-health"))
        assertTrue(html.contains("cf-screen-goals"))
        assertTrue(html.contains("cf-screen-reports"))
        assertTrue(html.contains("cf-screen-family"))
        assertTrue(html.contains("cf-stage-scan"))
        assertTrue(html.contains("cf-screen-transition"))
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
        assertTrue(gradle.contains("versionCode = 9"))
        assertTrue(gradle.contains("versionName = \"1.0.8\""))
    }

    @Test
    fun bundledFinanceUiPinsCurrentSupabaseSdkAndSubresourceIntegrity() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("@supabase/supabase-js@2.119.0"))
        assertTrue(html.contains("integrity=\"sha384-uteMfOloLDGt042uDz+xHGF3ym63/WQ6rFq7murQRG8Ih7QrXGEGNtWd8688sb4O\""))
        assertTrue(html.contains("integrity=\"sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT\""))
        assertTrue(html.contains("integrity=\"sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k\""))
    }

    @Test
    fun authSessionDoesNotConsumeTokensFromNavigationUrls() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("detectSessionInUrl: false"))
        assertTrue(html.contains("scope:'local'"))
    }

    @Test
    fun internalTestersSeeAnExplicitNoPaymentTestModeBanner() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("MODO DE TESTE"))
        assertTrue(html.contains("Nenhuma compra ou cobrança é necessária nesta etapa"))
    }

    @Test
    fun privacyPolicyExplainsTheCookieAndSessionStorageModel() {
        val privacy = File("src/main/assets/privacidade.html").readText()
        assertTrue(privacy.contains("Cookies"))
        assertTrue(privacy.contains("localStorage"))
        assertTrue(privacy.contains("não utiliza cookies de publicidade"))
    }

    @Test
    fun webViewDisablesCookiesAndUsesTheOriginCheckedMessageBridge() {
        assertEquals(false, MainActivity.ACCEPT_WEBVIEW_COOKIES)
        assertEquals(false, MainActivity.ACCEPT_THIRD_PARTY_COOKIES)
        val activity = File("src/main/java/br/com/copiloto/financeiro/MainActivity.kt").readText()
        assertTrue(activity.contains("addWebMessageListener"))
        assertTrue(activity.contains("isTrustedBillingOrigin"))
        assertTrue(!activity.contains("addJavascriptInterface"))
    }

    @Test
    fun navigationOnlyKeepsTheExactBundledHttpsAssetOrigin() {
        assertTrue(isTrustedAppAssetUrl("https://appassets.androidplatform.net/assets/mobile.html"))
        assertTrue(isTrustedAppAssetUrl("https://appassets.androidplatform.net/assets/privacidade.html"))
        assertTrue(!isTrustedAppAssetUrl("http://appassets.androidplatform.net/assets/mobile.html"))
        assertTrue(!isTrustedAppAssetUrl("https://appassets.androidplatform.net.evil.test/assets/mobile.html"))
        assertTrue(!isTrustedAppAssetUrl("https://appassets.androidplatform.net:444/assets/mobile.html"))
        assertTrue(!isTrustedAppAssetUrl("https://appassets.androidplatform.net/assets/../secret.html"))
        assertTrue(!isTrustedAppAssetUrl("https://user@appassets.androidplatform.net/assets/mobile.html"))
    }

    @Test
    fun nativeBillingBridgeRejectsNonMainFramesAndUnknownOrigins() {
        assertTrue(isTrustedBillingOrigin("https", "appassets.androidplatform.net", -1, true))
        assertTrue(!isTrustedBillingOrigin("https", "evil.test", -1, true))
        assertTrue(!isTrustedBillingOrigin("http", "appassets.androidplatform.net", -1, true))
        assertTrue(!isTrustedBillingOrigin("https", "appassets.androidplatform.net", 8443, true))
        assertTrue(!isTrustedBillingOrigin("https", "appassets.androidplatform.net", -1, false))
    }

    @Test
    fun nativeBillingBridgeAcceptsOnlySafeCommandsAndKnownProducts() {
        assertTrue(isAllowedBillingCommand("queryProducts", null))
        assertTrue(isAllowedBillingCommand("purchase", "copiloto_pro_30d"))
        assertTrue(isAllowedBillingCommand("purchase", "copiloto_max_30d"))
        assertTrue(isAllowedBillingCommand("purchase", "copiloto_ultra_30d"))
        assertTrue(!isAllowedBillingCommand("purchase", "unknown_product"))
        assertTrue(!isAllowedBillingCommand("deleteAccount", null))
        assertTrue(!isAllowedBillingCommand("queryProducts", "copiloto_pro_30d"))
    }
}
