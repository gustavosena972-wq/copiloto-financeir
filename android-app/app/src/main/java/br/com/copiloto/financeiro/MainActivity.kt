package br.com.copiloto.financeiro

import android.app.Activity
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
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

class MainActivity : Activity(), PurchasesUpdatedListener {
    companion object {
        const val APP_ENTRY_URL = "https://appassets.androidplatform.net/assets/mobile.html"
        private const val APP_ASSET_PREFIX = "https://appassets.androidplatform.net/assets/"
    }

    private lateinit var webView: WebView
    private lateinit var billingClient: BillingClient

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

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.settings.allowFileAccessFromFileURLs = false
        webView.settings.allowUniversalAccessFromFileURLs = false
        webView.settings.mixedContentMode =
            android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(PlayBillingBridge(), "CopilotoPlayBilling")

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
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return true
                if (uri.toString().startsWith(APP_ASSET_PREFIX)) return false

                if (uri.scheme == "https" || uri.scheme == "http") {
                    startActivity(
                        android.content.Intent(
                            android.content.Intent.ACTION_VIEW,
                            uri
                        )
                    )
                }
                return true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (url?.startsWith(APP_ASSET_PREFIX) == true) {
                    dispatchToWeb(
                        "copiloto:play-bridge-ready",
                        JSONObject().put("ready", true)
                    )
                }
            }
        }

        setContentView(webView)
        webView.loadUrl(APP_ENTRY_URL)

        connectBilling()
    }

    private fun connectBilling() {
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

    inner class PlayBillingBridge {
        @android.webkit.JavascriptInterface
        fun queryProducts() {
            runOnUiThread { connectBilling() }
        }

        @android.webkit.JavascriptInterface
        fun purchase(productId: String) {
            if (productId !in productIds) {
                dispatchToWeb(
                    "copiloto:play-error",
                    JSONObject().put("message", "Produto não reconhecido.")
                )
                return
            }

            runOnUiThread {
                if (billingClient.isReady) {
                    launchPurchase(productId)
                } else {
                    connectBilling()
                }
            }
        }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            finish()
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.removeJavascriptInterface("CopilotoPlayBilling")
            webView.destroy()
        }

        if (::billingClient.isInitialized) {
            billingClient.endConnection()
        }

        super.onDestroy()
    }
}
