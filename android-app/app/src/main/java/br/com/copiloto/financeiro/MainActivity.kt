package br.com.copiloto.financeiro

import android.app.Activity
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.view.WindowManager
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

class MainActivity : Activity(), PurchasesUpdatedListener {
    companion object {
        const val APP_ENTRY_URL = "https://appassets.androidplatform.net/assets/mobile.html?v=1.0.46"
        private const val APP_ASSET_ORIGIN = "https://appassets.androidplatform.net"
        const val ACCEPT_WEBVIEW_COOKIES = false
        const val ACCEPT_THIRD_PARTY_COOKIES = false
        private const val BILLING_BRIDGE_NAME = "CopilotoPlayBilling"
        private const val VOICE_BRIDGE_NAME = "CopilotoVoice"
    }

    private lateinit var webView: WebView
    private lateinit var tamanduaAlerts: TamanduaAlerts
    private lateinit var voiceInput: VoiceInput
    private lateinit var spreadsheetFiles: SpreadsheetFiles
    private lateinit var billingClient: BillingClient
    private var nativeBillingBridgeAvailable = false
    private var textToSpeech: TextToSpeech? = null
    private var nativeVoiceBridgeAvailable = false
    private var ttsReady = false

    private val productIds = listOf(
        "copiloto_pro_30d",
        "copiloto_max_30d",
        "copiloto_ultra_30d"
    )
    private val productDetails = mutableMapOf<String, ProductDetails>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        billingClient = BillingClient.newBuilder(this)
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .enableAutoServiceReconnection()
            .build()

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mediaPlaybackRequiresUserGesture = true
            setGeolocationEnabled(false)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                setSafeBrowsingEnabled(true)
            }
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(ACCEPT_WEBVIEW_COOKIES)
            setAcceptThirdPartyCookies(webView, ACCEPT_THIRD_PARTY_COOKIES)
        }

        voiceInput = VoiceInput(this) { event, payload ->
            if (isTrustedAppAssetUrl(webView.url.orEmpty())) dispatchToWeb(event, payload)
        }
        spreadsheetFiles = SpreadsheetFiles(this, webView)
        webView.webChromeClient = spreadsheetFiles.chromeClient
        spreadsheetFiles.register()
        tamanduaAlerts = TamanduaAlerts(this, webView) { event, payload ->
            if (isTrustedAppAssetUrl(webView.url.orEmpty())) dispatchToWeb(event, payload)
        }
        tamanduaAlerts.register()
        registerBillingBridge()
        initializeNativeVoice()
        registerVoiceBridge()

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest
            ) = assetLoader.shouldInterceptRequest(request.url)

            override fun shouldInterceptRequest(
                view: WebView?,
                url: String
            ) = assetLoader.shouldInterceptRequest(Uri.parse(url))

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val uri = request.url
                if (isTrustedAppAssetUrl(uri.toString())) return false

                // Never navigate an untrusted URL inside the privileged WebView.
                if (uri.scheme == "https" &&
                    uri.host != "appassets.androidplatform.net" &&
                    uri.userInfo == null
                ) {
                    openExternalUri(uri)
                } else if (
                    uri.scheme == "mailto" &&
                    uri.schemeSpecificPart.substringBefore('?')
                        .equals("gustavosena972@gmail.com", ignoreCase = true)
                ) {
                    openExternalUri(uri, android.content.Intent.ACTION_SENDTO)
                }
                return true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (url?.let(::isTrustedAppAssetUrl) == true) {
                    injectTamanduaEnhancements()
                    dispatchToWeb(
                        "copiloto:play-bridge-ready",
                        JSONObject().put("ready", nativeBillingBridgeAvailable).put("internalTest", BuildConfig.INTERNAL_TESTING)
                    )
                }
            }
        }

        setContentView(webView)
        webView.loadUrl(APP_ENTRY_URL)
        connectBilling()
    }

    private fun injectTamanduaEnhancements() {
        val script = runCatching {
            assets.open("tamandua-enhancements.js").bufferedReader().use { it.readText() }
        }.getOrNull() ?: return

        webView.evaluateJavascript(script, null)
    }

    private fun initializeNativeVoice() {
        textToSpeech = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                ttsReady = true
                textToSpeech?.language = Locale("pt", "BR")
                textToSpeech?.setSpeechRate(0.94f)
                textToSpeech?.setPitch(1.0f)
            } else {
                ttsReady = false
            }
        }
    }

    private fun registerVoiceBridge() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return

        WebViewCompat.addWebMessageListener(
            webView,
            VOICE_BRIDGE_NAME,
            setOf(APP_ASSET_ORIGIN)
        ) { _, message: WebMessageCompat, sourceOrigin, isMainFrame, _ ->
            if (!isTrustedBillingOrigin(
                    sourceOrigin.scheme,
                    sourceOrigin.host,
                    sourceOrigin.port,
                    isMainFrame
                )
            ) {
                return@addWebMessageListener
            }
            if (message.type != WebMessageCompat.TYPE_STRING) return@addWebMessageListener
            message.data?.let(::handleVoiceBridgeMessage)
        }
        nativeVoiceBridgeAvailable = true
    }

    private fun handleVoiceBridgeMessage(rawMessage: String) {
        val payload = runCatching { JSONObject(rawMessage) }.getOrNull() ?: return
        when (payload.optString("action")) {
            "recognize" -> runOnUiThread {
                val locale = resolveVoiceLocale(payload.optString("language")) ?: "pt-BR"
                voiceInput.start(payload.optString("requestId"), locale)
            }
            "setLanguage" -> {
                val locale = resolveVoiceLocale(payload.optString("language")) ?: return
                runOnUiThread {
                    if (ttsReady) {
                        val result = textToSpeech?.setLanguage(Locale.forLanguageTag(locale))
                        val supported = result != TextToSpeech.LANG_MISSING_DATA &&
                            result != TextToSpeech.LANG_NOT_SUPPORTED
                        if (!supported) {
                            textToSpeech?.setLanguage(Locale.forLanguageTag("pt-BR"))
                            dispatchToWeb(
                                "copiloto:voice-language-fallback",
                                JSONObject()
                                    .put("requestedLanguage", payload.optString("language"))
                                    .put("fallbackLanguage", "pt")
                            )
                        }
                    }
                }
            }

            "speak" -> {
                val text = payload.optString("text").trim().take(5000)
                if (text.isNotBlank()) {
                    runOnUiThread {
                        if (ttsReady) {
                            textToSpeech?.stop()
                            textToSpeech?.speak(
                                text,
                                TextToSpeech.QUEUE_FLUSH,
                                null,
                                "tamandua-response"
                            )
                        }
                    }
                }
            }

            "stop" -> runOnUiThread {
                textToSpeech?.stop()
                if (::voiceInput.isInitialized) voiceInput.cancel()
            }
        }
    }

    private fun registerBillingBridge() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return

        WebViewCompat.addWebMessageListener(
            webView,
            BILLING_BRIDGE_NAME,
            setOf(APP_ASSET_ORIGIN)
        ) { _, message: WebMessageCompat, sourceOrigin, isMainFrame, _ ->
            if (!isTrustedBillingOrigin(
                    sourceOrigin.scheme,
                    sourceOrigin.host,
                    sourceOrigin.port,
                    isMainFrame
                )
            ) {
                return@addWebMessageListener
            }
            if (message.type != WebMessageCompat.TYPE_STRING) return@addWebMessageListener
            message.data?.let(::handleBillingBridgeMessage)
        }
        nativeBillingBridgeAvailable = true
    }

    private fun handleBillingBridgeMessage(rawMessage: String) {
        val payload = runCatching { JSONObject(rawMessage) }.getOrNull() ?: return
        val action = payload.optString("action")
        val productId = payload.optString("productId").takeIf { it.isNotBlank() }

        if (!isAllowedBillingCommandForMode(action, productId, BuildConfig.INTERNAL_TESTING)) {
            if (action == "purchase") {
                dispatchToWeb(
                    "copiloto:play-error",
                    JSONObject().put("message", if (BuildConfig.INTERNAL_TESTING) "Pagamentos desativados nesta versão de teste." else "Produto não reconhecido.")
                )
            }
            return
        }

        when (action) {
            "queryProducts" -> runOnUiThread { connectBilling() }
            "purchase" -> runOnUiThread {
                val selectedProduct = productId ?: return@runOnUiThread
                if (billingClient.isReady) {
                    launchPurchase(selectedProduct)
                } else {
                    connectBilling()
                }
            }
        }
    }

    private fun openExternalUri(
        uri: Uri,
        action: String = android.content.Intent.ACTION_VIEW
    ) {
        try {
            startActivity(android.content.Intent(action, uri))
        } catch (_: android.content.ActivityNotFoundException) {
            dispatchToWeb(
                "copiloto:play-error",
                JSONObject().put("message", "Não foi possível abrir o link neste dispositivo.")
            )
        }
    }

    private fun connectBilling() {
        if (BuildConfig.INTERNAL_TESTING) return
        if (billingClient.isReady) {
            loadProducts()
            queryExistingPurchases()
            return
        }

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    loadProducts()
                    queryExistingPurchases()
                } else {
                    dispatchToWeb(
                        "copiloto:play-error",
                        JSONObject().put(
                            "message",
                            "Não foi possível conectar à Google Play."
                        )
                    )
                }
            }

            override fun onBillingServiceDisconnected() {
                // A reconexão automática está habilitada no BillingClient.
            }
        })
    }

    private fun loadProducts() {
        val products = productIds.map { id ->
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        }

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(products)
            .build()

        billingClient.queryProductDetailsAsync(params) { result, queryResult ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                dispatchToWeb(
                    "copiloto:play-error",
                    JSONObject().put(
                        "message",
                        "Não foi possível carregar os planos da Google Play."
                    )
                )
                return@queryProductDetailsAsync
            }

            productDetails.clear()
            queryResult.productDetailsList.forEach {
                productDetails[it.productId] = it
            }

            val items = JSONArray()
            queryResult.productDetailsList.forEach { item ->
                items.put(
                    JSONObject()
                        .put("productId", item.productId)
                        .put("title", item.title)
                        .put("description", item.description)
                        .put(
                            "formattedPrice",
                            item.oneTimePurchaseOfferDetails?.formattedPrice ?: ""
                        )
                )
            }

            dispatchToWeb(
                "copiloto:play-products",
                JSONObject().put("products", items)
            )
        }
    }

    private fun queryExistingPurchases() {
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()

        billingClient.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                return@queryPurchasesAsync
            }

            purchases
                .filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                .forEach {
                    dispatchPurchaseForServerVerification(
                        it,
                        "copiloto:play-existing-purchase"
                    )
                }
        }
    }

    private fun launchPurchase(productId: String) {
        val details = productDetails[productId]
        if (details == null) {
            loadProducts()
            dispatchToWeb(
                "copiloto:play-error",
                JSONObject().put(
                    "message",
                    "Plano indisponível no momento. Tente novamente."
                )
            )
            return
        }

        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(details)
            .build()

        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams))
            .build()

        val result = billingClient.launchBillingFlow(this, flowParams)

        if (result.responseCode != BillingClient.BillingResponseCode.OK) {
            dispatchToWeb(
                "copiloto:play-error",
                JSONObject().put(
                    "message",
                    result.debugMessage.ifBlank {
                        "Não foi possível iniciar a compra."
                    }
                )
            )
        }
    }

    override fun onPurchasesUpdated(
        result: BillingResult,
        purchases: MutableList<Purchase>?
    ) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases.orEmpty().forEach { purchase ->
                    when (purchase.purchaseState) {
                        Purchase.PurchaseState.PURCHASED ->
                            dispatchPurchaseForServerVerification(
                                purchase,
                                "copiloto:play-purchase"
                            )

                        Purchase.PurchaseState.PENDING ->
                            dispatchToWeb(
                                "copiloto:play-pending",
                                JSONObject().put(
                                    "message",
                                    "A compra ainda está pendente na Google Play."
                                )
                            )
                    }
                }
            }

            BillingClient.BillingResponseCode.USER_CANCELED ->
                dispatchToWeb(
                    "copiloto:play-cancelled",
                    JSONObject().put("message", "Compra cancelada.")
                )

            else ->
                dispatchToWeb(
                    "copiloto:play-error",
                    JSONObject().put(
                        "message",
                        result.debugMessage.ifBlank {
                            "Falha na compra Google Play."
                        }
                    )
                )
        }
    }

    private fun dispatchPurchaseForServerVerification(
        purchase: Purchase,
        eventName: String
    ) {
        val products = JSONArray()
        purchase.products.forEach { products.put(it) }

        dispatchToWeb(
            eventName,
            JSONObject()
                .put("purchaseToken", purchase.purchaseToken)
                .put("products", products)
                .put("purchaseState", "PURCHASED")
                .put("isAcknowledged", purchase.isAcknowledged)
        )
        // O servidor deve validar o token e aplicar idempotência antes de conceder acesso.
    }

    private fun dispatchToWeb(eventName: String, payload: JSONObject) {
        if (!::webView.isInitialized) return

        val safeName = JSONObject.quote(eventName)
        val safePayload = payload.toString()

        runOnUiThread {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent($safeName,{detail:$safePayload}));",
                null
            )
        }
    }

    override fun onBackPressed() {
        if (!::webView.isInitialized) {
            finish()
            return
        }

        webView.evaluateJavascript(
            "window.__copilotoHandleAndroidBack ? window.__copilotoHandleAndroidBack() : false"
        ) { handled ->
            if (handled == "true") return@evaluateJavascript

            if (webView.canGoBack()) {
                webView.goBack()
            } else {
                finish()
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (::voiceInput.isInitialized && voiceInput.handlePermissionResult(requestCode)) return
        if (::tamanduaAlerts.isInitialized) tamanduaAlerts.handlePermissionResult(requestCode)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        if (::voiceInput.isInitialized && voiceInput.handleResult(requestCode, resultCode, data)) return
        if (spreadsheetFiles.handleResult(requestCode, resultCode, data)) return
        super.onActivityResult(requestCode, resultCode, data)
    }

    override fun onStop() {
        if (::voiceInput.isInitialized) voiceInput.pause()
        super.onStop()
    }

    override fun onDestroy() {
        if (::voiceInput.isInitialized) voiceInput.close()
        if (::spreadsheetFiles.isInitialized) spreadsheetFiles.close()
        if (::webView.isInitialized) {
            webView.destroy()
        }

        if (::billingClient.isInitialized) {
            billingClient.endConnection()
        }

        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null

        super.onDestroy()
    }
}

internal fun isTrustedAppAssetUrl(rawUrl: String): Boolean = runCatching {
    val uri = java.net.URI(rawUrl)
    val path = uri.path ?: return@runCatching false

    uri.scheme == "https" &&
        uri.host == "appassets.androidplatform.net" &&
        uri.port == -1 &&
        uri.userInfo == null &&
        path.startsWith("/assets/") &&
        '\\' !in path &&
        path.split('/').none { it == "." || it == ".." }
}.getOrDefault(false)

internal fun isTrustedBillingOrigin(
    scheme: String?,
    host: String?,
    port: Int,
    isMainFrame: Boolean
): Boolean = isMainFrame &&
    scheme == "https" &&
    host == "appassets.androidplatform.net" &&
    port == -1

internal fun isAllowedBillingCommand(action: String, productId: String?): Boolean =
    when (action) {
        "queryProducts" -> productId == null
        "purchase" -> productId in setOf(
            "copiloto_pro_30d",
            "copiloto_max_30d",
            "copiloto_ultra_30d"
        )
        else -> false
    }

internal fun isAllowedBillingCommandForMode(action: String, productId: String?, internalTest: Boolean): Boolean =
    isAllowedBillingCommand(action, productId) && !(internalTest && action == "purchase")
