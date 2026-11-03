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

class MainActivity : Activity(), PurchasesUpdatedListener {
    private lateinit var webView: WebView
    private lateinit var billingClient: BillingClient
    private val allowedHost = "gustavosena972-wq.github.io"
    private val productIds = listOf(
        "copiloto_pro_30d",
        "copiloto_max_30d",
        "copiloto_ultra_30d"
    )
    private val productDetails = mutableMapOf<String, ProductDetails>()

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

        connectBilling()

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(PlayBillingBridge(), "CopilotoPlayBilling")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return true
                return uri.scheme != "https" || uri.host != allowedHost
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (url?.startsWith("https://$allowedHost/") == true) {
                    dispatchToWeb("copiloto:play-bridge-ready", JSONObject().put("ready", true))
                }
            }
        }
        setContentView(webView)
        webView.loadUrl(BuildConfig.WEB_APP_URL)
    }

    private fun connectBilling() {
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    loadProducts()
                    queryExistingPurchases()
                } else {
                    dispatchToWeb(
                        "copiloto:play-error",
                        JSONObject().put("message", "Não foi possível conectar à Google Play.")
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
        }
    }

    private fun queryExistingPurchases() {
        val params = QueryProductDetailsParams.newBuilder()
        // Compras existentes serão reconciliadas pelo servidor quando a verificação
        // da Google Play Developer API estiver configurada.
        // Não liberar acesso nem consumir/confirmar compras somente pelo cliente.
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
                        Purchase.PurchaseState.PURCHASED -> {
                            val products = JSONArray()
                            purchase.products.forEach { products.put(it) }
                            dispatchToWeb(
                                "copiloto:play-purchase",
                                JSONObject()
                                    .put("purchaseToken", purchase.purchaseToken)
                                    .put("products", products)
                                    .put("purchaseState", "PURCHASED")
                                    .put("isAcknowledged", purchase.isAcknowledged)
                            )
                            // IMPORTANTE: não conceder acesso nem consumir/confirmar aqui.
                            // O backend deve validar o token antes de qualquer ação.
                        }
                        Purchase.PurchaseState.PENDING -> {
                            dispatchToWeb(
                                "copiloto:play-pending",
                                JSONObject().put("message", "A compra ainda está pendente na Google Play.")
                            )
                        }
                    }
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                dispatchToWeb(
                    "copiloto:play-cancelled",
                    JSONObject().put("message", "Compra cancelada.")
                )
            }
            else -> dispatchToWeb(
                "copiloto:play-error",
                JSONObject().put("message", result.debugMessage.ifBlank { "Falha na compra Google Play." })
            )
        }
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
            runOnUiThread {
                if (billingClient.isReady) loadProducts() else connectBilling()
            }
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
            runOnUiThread { launchPurchase(productId) }
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
