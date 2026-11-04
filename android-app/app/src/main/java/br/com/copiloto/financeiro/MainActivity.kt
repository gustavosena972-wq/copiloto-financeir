package br.com.copiloto.financeiro

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject
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

class MainActivity : Activity(), PurchasesUpdatedListener {
    private lateinit var webView: WebView
    private lateinit var billingClient: BillingClient
    private val allowedHost = "copiloto-financeir.gustavosena972.workers.dev"
    private val allowedPathPrefix = "/"
    private val productIds = listOf(
        "copiloto_pro_30d",
        "copiloto_max_30d",
        "copiloto_ultra_30d"
    )
    private val productDetails = mutableMapOf<String, ProductDetails>()
    private var pendingPurchaseProductId: String? = null
    private var isConnectingBilling = false
    private var isLoadingProductDetails = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        billingClient = BillingClient.newBuilder(this)
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .enableAutoServiceReconnection()
            .build()

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        webView.settings.javaScriptCanOpenWindowsAutomatically = false
        webView.settings.setSupportMultipleWindows(false)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            webView.settings.safeBrowsingEnabled = true
        }
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(PlayBillingBridge(), "CopilotoPlayBilling")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return true
                return !isTrustedAppUrl(uri.scheme, uri.host, uri.path)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                val parsed = runCatching { android.net.Uri.parse(url) }.getOrNull()
                if (parsed != null && isTrustedAppUrl(parsed.scheme, parsed.host, parsed.path)) {
                    dispatchToWeb("copiloto:play-bridge-ready", JSONObject().put("ready", true))
                }
            }
        }
        setContentView(webView)
        webView.loadUrl(BuildConfig.WEB_APP_URL)

        connectBilling()
    }

    private fun isTrustedAppUrl(scheme: String?, host: String?, path: String?): Boolean {
        return scheme == "https" && host == allowedHost &&
            (path == allowedPathPrefix.removeSuffix("/") || path?.startsWith(allowedPathPrefix) == true)
    }

    private fun connectBilling() {
        if (billingClient.isReady) {
            loadProducts()
            queryExistingPurchases()
            return
        }
        if (isConnectingBilling) return

        isConnectingBilling = true
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                isConnectingBilling = false
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    loadProducts()
                    queryExistingPurchases()
                } else {
                    pendingPurchaseProductId = null
                    dispatchToWeb(
                        "copiloto:play-error",
                        JSONObject().put("message", "Não foi possível conectar à Google Play.")
                    )
                }
            }

            override fun onBillingServiceDisconnected() {
                isConnectingBilling = false
                // A reconexão automática está habilitada no BillingClient.
            }
        })
    }

    private fun loadProducts() {
        if (isLoadingProductDetails || !billingClient.isReady) return
        isLoadingProductDetails = true
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
            isLoadingProductDetails = false
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseProductId = null
                dispatchToWeb(
                    "copiloto:play-error",
                    JSONObject().put("message", "Não foi possível carregar os planos da Google Play.")
                )
                return@queryProductDetailsAsync
            }

            productDetails.clear()
            queryResult.productDetailsList.forEach { productDetails[it.productId] = it }
            val items = JSONArray()
            queryResult.productDetailsList.forEach { item ->
                items.put(
                    JSONObject()
                        .put("productId", item.productId)
                        .put("title", item.title)
                        .put("description", item.description)
                        .put("formattedPrice", item.oneTimePurchaseOfferDetails?.formattedPrice ?: "")
                )
            }
            dispatchToWeb("copiloto:play-products", JSONObject().put("products", items))
            launchPendingPurchaseIfReady()
        }
    }

    private fun launchPendingPurchaseIfReady() {
        val productId = pendingPurchaseProductId ?: return
        if (!billingClient.isReady || isLoadingProductDetails) return

        if (productDetails[productId] == null) {
            pendingPurchaseProductId = null
            dispatchToWeb(
                "copiloto:play-error",
                JSONObject().put("message", "Este plano não está disponível na Google Play.")
            )
            return
        }

        pendingPurchaseProductId = null
        launchPurchase(productId)
    }

    private fun queryExistingPurchases() {
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()

        billingClient.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) return@queryPurchasesAsync
            purchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                .forEach { dispatchPurchaseForServerVerification(it, "copiloto:play-existing-purchase") }
        }
    }

    private fun launchPurchase(productId: String) {
        val details = productDetails[productId]
        if (details == null) {
            loadProducts()
            dispatchToWeb(
                "copiloto:play-error",
                JSONObject().put("message", "Plano indisponível no momento. Tente novamente.")
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
                JSONObject().put("message", result.debugMessage.ifBlank { "Não foi possível iniciar a compra." })
            )
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases.orEmpty().forEach { purchase ->
                    when (purchase.purchaseState) {
                        Purchase.PurchaseState.PURCHASED ->
                            dispatchPurchaseForServerVerification(purchase, "copiloto:play-purchase")
                        Purchase.PurchaseState.PENDING ->
                            dispatchToWeb(
                                "copiloto:play-pending",
                                JSONObject().put("message", "A compra ainda está pendente na Google Play.")
                            )
                    }
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED ->
                dispatchToWeb(
                    "copiloto:play-cancelled",
                    JSONObject().put("message", "Compra cancelada.")
                )
            else -> dispatchToWeb(
                "copiloto:play-error",
                JSONObject().put("message", result.debugMessage.ifBlank { "Falha na compra Google Play." })
            )
        }
    }

    private fun dispatchPurchaseForServerVerification(purchase: Purchase, eventName: String) {
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
        // Não conceder acesso nem consumir/confirmar no cliente.
        // O servidor precisa validar o token e aplicar idempotência primeiro.
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

    inner class PlayBillingBridge {
        @JavascriptInterface
        fun queryProducts() {
            runOnUiThread { connectBilling() }
        }

        @JavascriptInterface
        fun purchase(productId: String) {
            if (productId !in productIds) {
                dispatchToWeb(
                    "copiloto:play-error",
                    JSONObject().put("message", "Produto não reconhecido.")
                )
                return
            }
            runOnUiThread {
                pendingPurchaseProductId = productId
                if (billingClient.isReady) {
                    if (productDetails[productId] != null) {
                        launchPendingPurchaseIfReady()
                    } else {
                        loadProducts()
                    }
                } else {
                    connectBilling()
                }
            }
        }
    }

    @SuppressLint("MissingSuperCall")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else finish()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.removeJavascriptInterface("CopilotoPlayBilling")
            webView.destroy()
        }
        if (::billingClient.isInitialized) billingClient.endConnection()
        super.onDestroy()
    }
}
