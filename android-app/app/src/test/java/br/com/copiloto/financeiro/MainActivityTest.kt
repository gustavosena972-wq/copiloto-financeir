package br.com.copiloto.financeiro

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MainActivityTest {
    // 1.0.15 mobile-first workspace contract
    // Release artifact trigger: keep production APK/AAB build aligned with main.
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
    fun bundledFinanceUiDisablesDecorativeBackgroundImages() {
        val html = File("src/main/assets/mobile.html").readText()
        val cleanup = html.substringAfter("<style id=\"cf-mobile-visual-cleanup\">").substringBefore("</style>")
        assertTrue(html.contains("--cf-scene:none;"))
        assertTrue(!html.contains("data:image/webp;base64"))
        assertTrue(cleanup.contains(".cf-motion-world{display:none!important}"))

    }
    @Test
    fun mobileAppDoesNotInjectAmbientParticlesOrOrbitCanvas() {
        val html = File("src/main/assets/mobile.html").readText()
        val script = html.substringAfter("<script id=\"cf-whole-screen-motion-js\">").substringBefore("</script>")
        assertTrue(script.contains("removeDecorativeMotionLayer"))
        assertTrue(!script.contains("requestAnimationFrame"))
        assertTrue(!script.contains("canvas.getContext"))

    }

    @Test
    fun landingPageKeepsTheDashboardPreviewInsideItsShowcase() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("<div class=\"landing-showcase\">"))
        assertTrue(html.contains("<section class=\"cf-preview\""))
        assertTrue(html.contains("<div class=\"cf-preview-window\">"))
        assertTrue(html.contains("Prévia ilustrativa da interface do Copiloto Financeiro"))

    }

    @Test
    fun financialViewsRemainAvailableInTheRestoredUi() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("const TL={planilha:'Lançamentos',ano:'Visão do ano',checape:'Checape',plan:'Planejamento',família:'Família e ajustes'}"))
        assertTrue(html.contains("function viewPlanilha("))
        assertTrue(html.contains("function viewAno("))
        assertTrue(html.contains("function viewChecape("))
        assertTrue(html.contains("class=\"app-shell\""))

    }

    @Test
    fun mobilePreviewUsesNaturalSizingWithoutTiltOrBlur() {
        val html = File("src/main/assets/mobile.html").readText()
        val cleanup = html.substringAfter("<style id=\"cf-mobile-visual-cleanup\">").substringBefore("</style>")
        assertTrue(cleanup.contains("width:100%!important"))
        assertTrue(cleanup.contains("max-width:100%!important"))
        assertTrue(cleanup.contains("transform:none!important"))
        assertTrue(cleanup.contains("filter:none!important"))
        assertTrue(cleanup.contains("opacity:1!important"))

    }

    @Test
    fun landingPreviewDoesNotRequireAnAdditionalVideoOverlay() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-preview-window"))
        assertTrue(!html.contains("copiloto-motion-preview.mp4"))
        assertTrue(!html.contains("<video"))

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
    fun landingNavigationUsesInternalRoutesForPrimaryActions() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("data-public-route=\"recursos\""))
        assertTrue(html.contains("data-public-route=\"planos\""))
        assertTrue(html.contains("data-public-route=\"login\""))
    }

    @Test
    fun bundledFinanceUiUsesAnExplicitSupabaseSdkVersion() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("@supabase/supabase-js@2.45.4"))
        assertTrue(!html.contains("@supabase/supabase-js@latest"))

    }

    @Test
    fun authSessionLoadsThroughTheBundledSupabaseClient() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("const sb=supabase.createClient(SB_URL,SB_KEY)"))
        assertTrue(html.contains("sb.auth.getSession()"))
        assertTrue(html.contains("sb.auth.onAuthStateChange"))
        assertEquals("https://appassets.androidplatform.net/assets/mobile.html", MainActivity.APP_ENTRY_URL)

    }

    @Test
    fun internalTesterAccessIsResolvedByTheBackendBeforePaywallDecision() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("sb.rpc('is_internal_tester')"))
        assertTrue(html.contains("S.internalTester=testerCheck.data===true"))
        assertTrue(html.contains("if(!S.admin&&!S.internalTester"))

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

    @Test
    fun decorativeMotionDoesNotObserveOrRepaintTheFinanceAppTree() {
        val html = File("src/main/assets/mobile.html").readText()
        val script = html.substringAfter("<script id=\"cf-whole-screen-motion-js\">").substringBefore("</script>")
        assertTrue(!script.contains("MutationObserver"))
        assertTrue(!script.contains("requestAnimationFrame"))
        assertTrue(script.contains("removeDecorativeMotionLayer"))

    }

    @Test
    fun launchTablesRemainHorizontallyScrollableWithinTheMobileViewport() {
        val html = File("src/main/assets/mobile.html").readText()
        val cleanup = html.substringAfter("<style id=\"cf-mobile-visual-cleanup\">").substringBefore("</style>")
        assertTrue(html.contains(".scroll{overflow-x:auto;"))
        assertTrue(html.contains("table{width:100%;border-collapse:collapse;min-width:860px}"))
        assertTrue(cleanup.contains("html,body,#app{max-width:100%;overflow-x:hidden}"))

    }

    @Test
    fun bundledFinanceUiUsesTheCurrentPremiumFintechVisualSystem() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("--surface:#ffffff"))
        assertTrue(html.contains("--primary:#146c43"))
        assertTrue(html.contains("body[data-ui=\"premium-fintech\"]"))
        assertTrue(html.contains("mobile-app-fit"))
    }

    @Test
    fun bundledFinanceUiRetainsItsPremiumFintechPalette() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("--surface:#ffffff"))
        assertTrue(html.contains("--primary:#146c43"))
        assertTrue(html.contains("body[data-ui=\"premium-fintech\"]"))

    }

    @Test
    fun bundledFinanceUiKeepsItsCurrentFinancialSections() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("Planilha mensal"))
        assertTrue(html.contains("Visão do ano"))
        assertTrue(html.contains("Checape"))
        assertTrue(html.contains("Planejamento"))
        assertTrue(html.contains("Família e ajustes"))
        assertTrue(html.contains("function viewPlanilha("))

    }

    @Test
    fun bundledFinanceUiRemovesDecorativeCoinsAndBackgroundImageLayers() {
        val html = File("src/main/assets/mobile.html").readText()
        val cleanup = html.substringAfter("<style id=\"cf-mobile-visual-cleanup\">").substringBefore("</style>")
        assertTrue(cleanup.contains(".cf-motion-world{display:none!important}"))
        assertTrue(cleanup.contains(".coin,.coin-stack,.coin-float{display:none!important}"))
        assertTrue(cleanup.contains("body[data-ui=\"premium-fintech\"] .app-main:before"))
        assertTrue(cleanup.contains("content:none!important"))
        val motionScript = html.substringAfter("<script id=\"cf-whole-screen-motion-js\">").substringBefore("</script>")
        assertTrue(motionScript.contains("removeDecorativeMotionLayer"))
        assertTrue(!motionScript.contains("world.innerHTML="))
        assertTrue(!motionScript.contains("requestAnimationFrame"))
    }

    @Test
    fun landingPreviewFitsInsideMobileViewportWithoutCroppingOrNegativeMargins() {
        val html = File("src/main/assets/mobile.html").readText()
        val cleanup = html.substringAfter("<style id=\"cf-mobile-visual-cleanup\">").substringBefore("</style>")
        assertTrue(cleanup.contains("width:100%!important"))
        assertTrue(cleanup.contains("max-width:100%!important"))
        assertTrue(cleanup.contains("margin:22px 0 0!important"))
        assertTrue(cleanup.contains("transform:none!important"))
        assertTrue(cleanup.contains("@media(max-width:390px)"))
        assertTrue(cleanup.contains(".cf-preview-sidebar{display:none!important}"))
        assertTrue(cleanup.contains("overflow-x:hidden"))
    }


    @Test
    fun mobileNavigationUsesPrimaryDestinationsAndAnAccessibleMoreMenu() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("class=\"mobile-bottom-nav\""))
        assertTrue(html.contains("aria-label=\"Navegação principal do aplicativo\""))
        assertTrue(html.contains("data-mobile-nav=\"launches\""))
        assertTrue(html.contains("data-mobile-nav=\"year\""))
        assertTrue(html.contains("data-mobile-nav=\"checkup\""))
        assertTrue(html.contains("data-mobile-nav=\"planning\""))
        assertTrue(html.contains("data-act=\"mobilemore\""))
        assertTrue(html.contains("class=\"mobile-more-panel\""))
        assertTrue(html.contains("data-v=\"família\""))
        assertTrue(html.contains("data-v=\"relatorios\""))

    }

    @Test
    fun mobileTransactionsUseExpandableRowsAndTheYearUsesTapToOpenSummaries() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("class=\"mobile-entry-table\""))
        assertTrue(html.contains("class=\"mobile-entry-row\""))
        assertTrue(html.contains("class=\"mobile-entry-details\""))
        assertTrue(html.contains("class=\"mobile-year-list\""))
        assertTrue(html.contains("class=\"mobile-year-open\""))
        assertTrue(html.contains("data-label=\"Valor\""))
        assertTrue(html.contains("data-label=\"Meta cartão\""))
        assertTrue(html.contains(".desktop-year-table{display:none!important}"))

    }

    @Test
    fun mobileWorkspaceUsesFullWidthSafeAreasAndTouchSizedControls() {
        val html = File("src/main/assets/mobile.html").readText()
        val mobile = html.substringAfter("<style id=\"cf-mobile-first-1-0-15\">").substringBefore("</style>")
        assertTrue(mobile.contains("width:100vw"))
        assertTrue(mobile.contains("min-height:100dvh"))
        assertTrue(mobile.contains("min-height:48px"))
        assertTrue(mobile.contains("overflow-x:hidden"))
        assertTrue(mobile.contains("env(safe-area-inset-bottom)"))
        assertTrue(mobile.contains("grid-template-columns:repeat(5,minmax(0,1fr))"))
        assertTrue(mobile.contains(".desktop-transactions{display:none!important}"))
        assertTrue(mobile.contains(".mobile-entry-table{display:block!important"))

    }


    @Test
    fun everyMobileWorkspaceScreenIncludesContextualHowToInstructions() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("function mobileGuide(view)"))
        assertTrue(html.contains("class=\"mobile-guide\""))
        assertTrue(html.contains("Como usar os lançamentos"))
        assertTrue(html.contains("Como usar a visão do ano"))
        assertTrue(html.contains("Como usar o checape"))
        assertTrue(html.contains("Como usar o planejamento"))
        assertTrue(html.contains("Como usar a área da família"))
        assertTrue(html.contains("aria-controls=\"mobile-guide-content\""))
    }

    @Test
    fun mobileNewLaunchActionOpensTheExistingValidatedLaunchForm() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("data-act=\"mobileadd\""))
        assertTrue(html.contains("id=\"mobile-add-launch\""))
        assertTrue(html.contains("S.mobileAddOpen"))
        assertTrue(html.contains("else if(a==='mobileadd')"))
        assertTrue(html.contains("else if(a==='add')"))
    }

    @Test
    fun mobileMoreMenuKeepsReportsFamilyAdminAndSignOutReachable() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("S.mobileMore"))
        assertTrue(html.contains("data-act=\"mobilemore\""))
        assertTrue(html.contains("data-act=\"view\" data-v=\"família\""))
        assertTrue(html.contains("data-act=\"view\" data-v=\"relatorios\""))
        assertTrue(html.contains("data-act=\"view\" data-v=\"admin\""))
        assertTrue(html.contains("data-act=\"sair\""))
    }


    @Test
    fun androidSystemBackClosesMobileOverlaysBeforeExitingTheApp() {
        val html = File("src/main/assets/mobile.html").readText()
        val activity = File("src/main/java/br/com/copiloto/financeiro/MainActivity.kt").readText()
        assertTrue(html.contains("window.__copilotoHandleAndroidBack"))
        assertTrue(html.contains("S.mobileMore"))
        assertTrue(html.contains("S.mobileAddOpen"))
        assertTrue(html.contains("document.querySelectorAll('.app-main details[open]')"))
        assertTrue(html.contains("if(S.view!=='planilha'&&S.fam)"))
        assertTrue(activity.contains("__copilotoHandleAndroidBack"))
        assertTrue(activity.contains("webView.evaluateJavascript"))
    }


    @Test
    fun mobileCashFlowVisualizationUsesRealMonthlyIncomeAndExpenseTotals() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("const totalFluxo=rec+des;"))
        assertTrue(html.contains("class=\"mobile-flow-track\""))
        assertTrue(html.contains("brl(rec)"))
        assertTrue(html.contains("brl(des)"))
        assertTrue(html.contains("Entradas"))
        assertTrue(html.contains("Saídas"))
    }

        @Test
    fun androidV016UsesV0InspiredLightFintechMobileShell() {
        val html = File("src/main/assets/mobile.html").readText()
        val mobile = html.substringAfter("<style id=\"cf-android-v0-mobile-1-0-16\">").substringBefore("</style>")
        assertTrue(mobile.contains("--v0-bg:#f6f5ef"))
        assertTrue(mobile.contains("--v0-green:#146c43"))
        assertTrue(mobile.contains("--v0-lime:#d8f24a"))
        assertTrue(mobile.contains(".v0-mobile-dashboard"))
        assertTrue(html.contains("class=\"card v0-mobile-balance\""))
        assertTrue(html.contains("v0-mobile-action-grid"))
        assertTrue(html.contains("mobile-bottom-nav"))
    }

    @Test
    fun androidV016KeepsFinanceViewsInsideTheV0MobileSystem() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("data-v=\"planilha\""))
        assertTrue(html.contains("data-v=\"ano\""))
        assertTrue(html.contains("data-v=\"checape\""))
        assertTrue(html.contains("data-v=\"plan\""))
        assertTrue(html.contains("data-v=\"família\""))
        assertTrue(html.contains(".v0-mobile-section-title"))
        assertTrue(html.contains(".v0-mobile-transaction-list"))
    }

    @Test
    fun androidV016UsesTouchSizedControlsAndSafeAreaSpacing() {
        val html = File("src/main/assets/mobile.html").readText()
        val mobile = html.substringAfter("<style id=\"cf-android-v0-mobile-1-0-16\">").substringBefore("</style>")
        assertTrue(mobile.contains("min-height:48px"))
        assertTrue(mobile.contains("padding-bottom:calc(84px + env(safe-area-inset-bottom))"))
        assertTrue(mobile.contains("grid-template-columns:repeat(5,minmax(0,1fr))"))
        assertTrue(mobile.contains("overflow-x:hidden"))
    }

    @Test
    fun androidV016SeparatesMobileFinanceSectionsIntoDedicatedButtons() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("v0-mobile-quick-nav"))
        assertTrue(html.contains("data-v=\"planilha\""))
        assertTrue(html.contains("data-v=\"ano\""))
        assertTrue(html.contains("data-v=\"checape\""))
        assertTrue(html.contains("data-v=\"plan\""))
        assertTrue(html.contains("data-v=\"família\""))
        assertTrue(html.contains("v0-mobile-quick-nav-item"))
    }

        @Test
    fun androidV016KeepsQuickNavigationTouchFriendly() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains(".v0-mobile-quick-nav-item{"))
        assertTrue(html.contains("min-height:64px!important"))
        assertTrue(html.contains("grid-template-columns:repeat(2,minmax(0,1fr))!important"))
    }

        @Test
    fun androidV017KeepsTheMobileWorkspaceVisuallySeparatedByPurpose() {
        val html = File("src/main/assets/mobile.html").readText()
        val mobile = html.substringAfter("<style id=\"cf-android-v0-mobile-1-0-17\">").substringBefore("</style>")
        assertTrue(mobile.contains(".app-sidebar{display:none!important}"))
        assertTrue(mobile.contains("padding:14px 16px 6px!important"))
        assertTrue(html.contains(".v0-mobile-quick-nav-primary"))
        assertTrue(html.contains(".v0-mobile-quick-nav-item"))
        assertTrue(html.contains(".v0-mobile-section-divider"))
        assertTrue(html.contains("function mobileNavigation()"))
        assertTrue(html.contains(".mobile-bottom-nav"))
    }

    @Test
    fun androidV017KeepsTheSpreadsheetAsThePrimaryMobileWorkspace() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("data-v=\"planilha\""))
        assertTrue(html.contains("Planilha mensal"))
        assertTrue(html.contains("Lançamentos, receitas, despesas e saldo"))
        assertTrue(html.contains("data-v=\"ano\""))
        assertTrue(html.contains("data-v=\"checape\""))
        assertTrue(html.contains("data-v=\"plan\""))
        assertTrue(html.contains("data-v=\"família\""))
    }

    @Test
    fun androidV018DefersHeavyOptionalLibrariesUntilTheyAreNeeded() {
        val html = File("src/main/assets/mobile.html").readText()
        assertFalse(html.contains("cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js</script>"))
        assertFalse(html.contains("cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js</script>"))
        assertTrue(html.contains("function ensureXlsx()"))
        assertTrue(html.contains("function ensureQrCode()"))
        assertTrue(html.contains("await ensureXlsx()"))
    }

        @Test
    fun androidV018UsesMobileFirstPerformanceDefaults() {
        val html = File("src/main/assets/mobile.html").readText()
        val mobile = html.substringAfter("<style id=\"cf-android-v0-mobile-1-0-18\">").substringBefore("</style>")
        assertTrue(mobile.contains("content-visibility:auto"))
        assertTrue(mobile.contains("backdrop-filter:none!important"))
        assertTrue(mobile.contains(".mobile-bottom-nav{min-height:72px!important}"))
        assertTrue(mobile.contains(".mobile-nav-item{min-height:54px!important}"))
    }

    @Test
    fun androidV019AddsPremiumMobileCommandBarAndConnectionStatus() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-mobile-premium-1-0-19"))
        assertTrue(html.contains("mobile-command-bar"))
        assertTrue(html.contains("mobile-connection-status"))
        assertTrue(html.contains("mobile-command-add"))
        assertTrue(html.contains("mobile-command-more"))
    }

    @Test
    fun androidV019AddsClientSideTransactionSearchWithoutChangingTheDataLayer() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("mobile-transaction-search"))
        assertTrue(html.contains("function bindMobileTransactionSearch()"))
        assertTrue(html.contains("mobile-transaction-count"))
        assertTrue(html.contains("dataset.mobileSearchBound"))
        assertTrue(html.contains("row.hidden=hidden"))
    }

    @Test
    fun androidV019UsesSafeAndroidHapticsAndAccessibleMobileFeedback() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("function mobileHaptic()"))
        assertTrue(html.contains("navigator.vibrate"))
        assertTrue(html.contains("aria-live=\"polite\""))
        assertTrue(html.contains("prefers-reduced-motion:reduce"))
    }

    @Test
    fun androidV019ImprovesMobileTouchAndScrollBehaviorForAHighQualityAppShell() {
        val html = File("src/main/assets/mobile.html").readText()
        val mobile = html.substringAfter("<style id=\"cf-mobile-premium-1-0-19\">").substringBefore("</style>")
        assertTrue(mobile.contains("overscroll-behavior-y:contain"))
        assertTrue(mobile.contains("-webkit-tap-highlight-color:transparent"))
        assertTrue(mobile.contains("scroll-margin-top:96px"))
        assertTrue(mobile.contains("touch-action:manipulation"))
    }

    @Test
    fun androidV020LoadsCriticalMonthDataBeforeSecondaryAnnualAggregates() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("async function loadMes(rd=true,refreshAggregates=true)"))
        assertTrue(html.contains("const[l,s]=await Promise.all(["))
        assertTrue(html.contains("if(rd)render();"))
        assertTrue(html.contains("if(refreshAggregates)"))
    }

    @Test
    fun androidV020ReusesAnnualAggregatesWhenSwitchingMonthsInTheSameYear() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("S._aggregateYearId"))
        assertTrue(html.contains("const refreshAggregates=!S._aggregateYearId||S._aggregateYearId!==S.ano.id;"))
        assertTrue(html.contains("await loadMes(true,refreshAggregates);"))
        assertTrue(html.contains("else if(a==='mes'){S.mes=S.meses.find(m=>m.mes==b.dataset.m);await loadMes(true,false)}"))
    }

    @Test
    fun androidV020KeepsAnnualAndCardDataRefreshableAfterFinancialMutations() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("async function loadMes(rd=true,refreshAggregates=true)"))
        assertTrue(html.contains("if(refreshAggregates){"))
        assertTrue(html.contains("S.resumo=rs;S.meta=mc;S._aggregateYearId=S.ano.id"))
        assertTrue(html.contains("await loadMes()"))
    }

    @Test
    fun androidV021SeparatesFamilyWorkspaceIntoClearInterfaceAreasWithEditActions() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-family-area-shell"))
        assertTrue(html.contains("cf-family-area-header"))
        assertTrue(html.contains("editfamily"))
        assertTrue(html.contains("editcategories"))
        assertTrue(html.contains("editaccount"))
        assertTrue(html.contains("Membros da família"))
        assertTrue(html.contains("Convites e acessos"))
        assertTrue(html.contains("Categorias e grupos"))
        assertTrue(html.contains("Conta e privacidade"))
    }

    @Test
    fun androidV021KeepsFamilyAreaActionsSeparatedInsteadOfMixingControls() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-family-area-actions"))
        assertTrue(html.contains("cf-family-area-body"))
        assertTrue(html.contains("aria-expanded"))
    }

        @Test
    fun androidV022AddsAnIntelligentFinancialBriefingToTheMobileWorkspace() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("function mobileSmartContext()"))
        assertTrue(html.contains("cf-mobile-insight"))
        assertTrue(html.contains("Próximo passo") || html.contains("PRÓXIMO PASSO"))
        assertFalse(html.contains("smartHealthScore"))
        assertFalse(html.contains("safeToSpend"))
    }

        @Test
    fun androidV022AddsSmartSignalsForBillsGoalsAndSpendingWithoutInventingData() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("contas atrasadas"))
        assertTrue(html.contains("próximos vencimentos"))
        assertTrue(html.contains("Maior categoria"))
        assertTrue(html.contains("Sem dados suficientes") || html.contains("Comece pelo primeiro lançamento"))
        assertTrue(html.contains("smartgo"))
    }

    @Test
    fun androidV022KeepsTestersOutOfThePaymentWall() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("S.internalTester=testerCheck.data===true"))
        assertTrue(html.contains("!S.internalTester&&!(S.fam.acesso_ate"))
        assertTrue(html.contains("TESTE INTERNO · PAGAMENTOS DESATIVADOS"))
    }

        @Test
    fun releaseVersionAdvancesToTheCompanionGuidanceIteration() {
        val gradle = File("build.gradle.kts").readText()
        assertTrue(gradle.contains("versionCode = 28"))
        assertTrue(gradle.contains("versionName = \"1.0.28\""))
    }

    @Test
    fun androidV022ReplacesBareLoadingTextWithBrandedMobileStartupFeedback() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-mobile-startup"))
        assertTrue(html.contains("cf-mobile-startup-logo"))
        assertTrue(html.contains("cf-mobile-startup-shimmer"))
        assertTrue(html.contains("Preparando seu financeiro"))
    }


    @Test
    fun androidV023ProvidesContextualGuidanceWithoutExpandingThePrimaryNavigation() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-companion"))
        assertTrue(html.contains("cf-companion-speech"))
        assertTrue(html.contains("function mobileCompanionSpeech"))
        assertTrue(html.contains("Planilha mensal"))
        assertTrue(html.contains("Checape"))
        assertTrue(html.contains("Família"))
        assertTrue(html.contains("aria-label=\"Mostrar fala do Copiloto\""))
        assertFalse(html.contains("data-v=\"ajuda\""))
    }

    @Test
    fun androidV023AddsAnInteractiveTamanduaCompanionUsingLocalAssetsOnly() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("Tamanduá"))
        assertTrue(html.contains("cf-companion-animal"))
        assertTrue(html.contains("cf-companion-tail"))
        assertTrue(html.contains("cf-companion-face"))
        assertTrue(html.contains("cf-companion-speech"))
        assertFalse(html.contains("http://"))
        val companionMarkup=html.substringAfter("function mobileCompanionMarkup()").substringBefore("function mobileCompanionGuide()")
        assertFalse(companionMarkup.contains("http://"))
        assertFalse(companionMarkup.contains("https://"))
    }

    @Test
    fun androidV023DoesNotDelayStartupForTheCompanion() {
        val html = File("src/main/assets/mobile.html").readText()
        val companion = html.substringAfter("<style id=\"cf-android-v0-mobile-1-0-23-companion\">").substringBefore("</style>")
        assertTrue(companion.contains("pointer-events:none"))
        assertTrue(companion.contains("min(280px,calc(100vw - 104px))"))
        assertTrue(companion.contains("prefers-reduced-motion:reduce"))
        assertFalse(companion.contains("backdrop-filter:blur"))
    }

    @Test
    fun androidV023UsesShortNaturalTamanduaSpeechInsteadOfALargeGuidePanel() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-companion-speech"))
        assertTrue(html.contains("function mobileCompanionSpeech"))
        assertTrue(html.contains("Vamos conferir como está seu mês?"))
        assertTrue(html.contains("Tem contas atrasadas aqui. Vale conferir antes de planejar novos gastos."))
        assertTrue(html.contains("Encontrei alguns pontos para você revisar."))
        assertFalse(html.contains("cf-companion-panel"))
        assertFalse(html.contains("cf-companion-guide-row"))
        assertFalse(html.contains("Guia rápido da área atual"))
    }

        @Test
    fun androidV023SpeechIsContextualAndUsesRealFinancialState() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("S.lanc"))
        assertTrue(html.contains("S.view"))
        assertTrue(html.contains("data-v=\"planilha\""))
        assertTrue(html.contains("data-v=\"checape\""))
        assertTrue(html.contains("data-v=\"plan\""))
        assertTrue(html.contains("mobileCompanionSpeech"))
        assertTrue(html.contains("dados suficientes"))
        assertTrue(html.contains("próximos vencimentos"))
    }

    @Test
    fun androidV023CompanionSpeechDoesNotAddNavigationOrDelayStartup() {
        val html = File("src/main/assets/mobile.html").readText()
        assertFalse(html.contains("data-v=\"ajuda\""))
        assertFalse(html.contains("setTimeout(mobileCompanionSpeech"))
        assertFalse(html.contains("await mobileCompanionSpeech"))
        assertTrue(html.contains("mountMobileCompanion()"))
    }

        @Test
    fun androidV024ShowsFirstRunTamanduaIntroductionBeforeTheFinanceWorkspace() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-tamandua-intro"))
        assertTrue(html.contains("function tamanduaIntroMarkup"))
        assertTrue(html.contains("Oi, eu sou o Tamanduá."))
        assertTrue(html.contains("Eu sou seu ajudante das finanças."))
        assertTrue(html.contains("Conhecer o Copiloto"))
        assertTrue(html.contains("function tamanduaStorageKey"))
        assertTrue(html.contains("tamanduaStorageKey('intro')"))
    }

        @Test
    fun androidV024IntroducesTheTamanduaWithShortRectangularSpeechCards() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-tamandua-intro-card"))
        assertTrue(html.contains("cf-tamandua-intro-card-text"))
        assertTrue(html.contains("cf-tamandua-intro-character"))
        assertTrue(html.contains("<b>Eu explico</b>"))
        assertTrue(html.contains("<b>Eu acompanho</b>"))
        assertTrue(html.contains("<b>Eu me adapto</b>"))
    }

        @Test
    fun androidV024CollectsUserNeedsWithCheckboxQuestionsAndStoresACompanionProfile() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-tamandua-question"))
        assertTrue(html.contains("type=\"checkbox\""))
        assertTrue(html.contains("Qual é a sua principal necessidade hoje?"))
        assertTrue(html.contains("Tem alguma área da sua vida que você quer melhorar porque baixou o app?"))
        assertTrue(html.contains("Você tem dificuldade para controlar e organizar suas finanças?"))
        assertTrue(html.contains("Você tem dificuldade para economizar?"))
        assertTrue(html.contains("localStorage.setItem(profileKey"))
        assertTrue(html.contains("S.tamanduaProfile"))
    }

        @Test
    fun androidV024UsesTheAnswersToPersonalizeTamanduaSpeechWithoutChangingThePrimaryNavigation() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("function mobileCompanionSpeech"))
        assertTrue(html.contains("S.tamanduaProfile"))
        assertTrue(html.contains("economizar"))
        assertTrue(html.contains("organizar"))
        assertTrue(html.contains("planejar"))
        assertTrue(html.contains("data-act=\"tamandua-intro-finish\""))
        assertFalse(html.contains("data-v=\"tamandua\""))
    }

        @Test
    fun androidV024DoesNotShowTheOnboardingAgainAfterCompletionAndDoesNotDelayNormalStartup() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("localStorage.getItem(introKey)"))
        assertTrue(html.contains("tamanduaIntroCompleted"))
        assertTrue(html.contains("renderWorkspaceOrKeepTamandua()"))
        assertFalse(html.contains("setTimeout(tamanduaIntro"))
        assertFalse(html.contains("await tamanduaIntro"))
        assertFalse(html.contains("tamandua-intro-skip"))
    }



    @Test
    fun androidV025UsesACompactMobileCommandSurfaceInsteadOfDesktopLikePanels() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("cf-mobile-v025"))
        assertTrue(html.contains("cf-mobile-command"))
        assertTrue(html.contains("cf-mobile-balance"))
        assertTrue(html.contains("cf-mobile-insight"))
        assertTrue(html.contains("env(safe-area-inset-bottom)"))
    }

    @Test
    fun androidV025UsesRealFinancialContextWithoutArtificialScoresOrSpendLimits() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("function mobileSmartContext()"))
        assertTrue(html.contains("cf-mobile-insight"))
        assertTrue(html.contains("contas atrasadas"))
        assertTrue(html.contains("próximos vencimentos"))
        assertFalse(html.contains("smartHealthScore"))
        assertFalse(html.contains("safeToSpend"))
        assertFalse(html.contains("Pode gastar*"))
        assertFalse(html.contains("Indicador de organização"))
    }

    @Test
    fun androidV025HardensTheWebViewProductionSurface() {
        val activity = File("src/main/java/br/com/copiloto/financeiro/MainActivity.kt").readText()
        assertTrue(activity.contains("WindowManager.LayoutParams.FLAG_SECURE"))
        assertTrue(activity.contains("WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)"))
        assertTrue(activity.contains("setSafeBrowsingEnabled(true)"))
        assertTrue(activity.contains("allowFileAccess = false"))
        assertTrue(activity.contains("allowUniversalAccessFromFileURLs = false"))
    }

    @Test
    fun androidV025KeepsCleartextTrafficDisabled() {
        val manifest = File("src/main/AndroidManifest.xml").readText()
        assertTrue(manifest.contains("android:usesCleartextTraffic=\"false\""))
    }

    @Test
    fun androidV025KeepsTheTamanduaAsContextualAssistanceWithoutAddingANewTab() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("function mobileCompanionSpeech()"))
        assertTrue(html.contains("function mountMobileCompanion()"))
        assertFalse(html.contains("data-mobile-nav=\"tamandua\""))
    }


    @Test
    fun androidV026MakesTamanduaOnboardingMandatoryBeforeShowingTheFinanceWorkspace() {
        val html = File("src/main/assets/mobile.html").readText()
        val loadMes = html.substringAfter("async function loadMes").substringBefore("/* ---------- telas de entrada ----------")
        assertTrue(loadMes.contains("renderWorkspaceOrKeepTamandua()"))
        assertTrue(html.contains("function renderWorkspaceOrKeepTamandua()"))
        assertFalse(html.contains("tamandua-intro-skip"))
        assertFalse(html.contains("Pular por enquanto"))
        assertFalse(html.contains("Agora não"))
    }

    @Test
    fun androidV027PersistsTamanduaLearningInTheSharedIntelligenceDatabase() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("async function loadTamanduaProfile()"))
        assertTrue(html.contains("ia_aprendizados"))
        assertTrue(html.contains("ia_eventos"))
        assertTrue(html.contains("upsert(payload,{onConflict:'familia_id,usuario_id,chave'})"))
        assertTrue(html.contains("await mobileLearnFromInteraction(profile)"))
        assertTrue(html.contains("localStorage.setItem(introKey"))
        assertFalse(html.contains("localStorage.getItem(profileKey)"))
        assertFalse(html.contains("localStorage.setItem(profileKey"))
    }

    @Test
    fun androidV027ScopesTamanduaLearningToTheAuthenticatedUserAndFamily() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains(".eq('usuario_id',S.user.id)"))
        assertTrue(html.contains(".eq('familia_id',S.fam.id)"))
        assertTrue(html.contains("familia_id:S.fam.id"))
        assertTrue(html.contains("usuario_id:S.user.id"))
    }

    @Test
    fun androidV026RequiresAnAnswerForEveryTamanduaQuestionBeforeEnteringTheApp() {
        val html = File("src/main/assets/mobile.html").readText()
        val finish = html.substringAfter("function finishTamanduaIntro()").substringBefore("function mostrarErroInicial(e)")
        assertTrue(finish.contains("unanswered"))
        assertTrue(finish.contains("Marque ao menos uma opção em cada pergunta"))
        assertTrue(finish.contains("if(unanswered.length)"))
        assertTrue(finish.contains("render()"))
    }

    @Test
    fun androidV026KeepsInternalTestersOutsideThePlanAndPaymentGate() {
        val html = File("src/main/assets/mobile.html").readText()
        val boot = html.substringAfter("async function boot()").substringBefore("async function loadAno")
        assertTrue(boot.contains("S.internalTester=testerCheck.data===true"))
        assertTrue(boot.contains("if(!S.admin&&!S.internalTester&&!(S.fam.acesso_ate"))
        assertTrue(boot.contains("await loadAno()"))
        assertTrue(html.contains("ACESSO DE TESTE · SEM COBRANÇA"))
    }

    @Test
    fun androidV026KeepsTamanduaVisibleAsTheContextualGuideAfterOnboarding() {
        val html = File("src/main/assets/mobile.html").readText()
        assertTrue(html.contains("function mobileCompanionMarkup()"))
        assertTrue(html.contains("function mobileCompanionSpeech()"))
        assertTrue(html.contains("mountMobileCompanion()"))
        assertTrue(html.contains("S.tamanduaProfile"))
        assertFalse(html.contains("data-mobile-nav=\"tamandua\""))
    }

}
