package com.gustavosena.copilotofinanceiro;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.webkit.*;
import com.android.billingclient.api.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.*;

public final class MainActivity extends Activity implements PurchasesUpdatedListener {
 private static final String[] IDS={"copiloto_pro_30d","copiloto_max_30d","copiloto_ultra_30d"};
 private WebView web; private BillingClient billing; private final List<ProductDetails> products=new ArrayList<>(); private boolean ready=false;
 @Override public void onCreate(Bundle b){super.onCreate(b);web=new WebView(this);setContentView(web);
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(true);s.setAllowContentAccess(false);s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(true);
  web.setWebChromeClient(new WebChromeClient());web.setWebViewClient(new WebViewClient(){
   @Override public void onPageStarted(WebView v,String u,android.graphics.Bitmap f){if(u.startsWith("file:///android_asset/"))v.addJavascriptInterface(new NativeBridge(),"NativePlayBilling");}
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();if("file".equals(u.getScheme())&&u.toString().startsWith("file:///android_asset/"))return false;if("https".equals(u.getScheme())||"http".equals(u.getScheme())){startActivity(new Intent(Intent.ACTION_VIEW,u));return true;}return true;}
  });
  billing=BillingClient.newBuilder(this).setListener(this).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).build();connect();web.loadUrl("file:///android_asset/index.html");
 }
 private void connect(){if(billing.isReady())return;billing.startConnection(new BillingClientStateListener(){
  public void onBillingSetupFinished(BillingResult r){ready=r.getResponseCode()==BillingClient.BillingResponseCode.OK;if(ready){queryProducts();restore();}else emit("copiloto:play-error",obj("Google Play Billing indisponível."));}
  public void onBillingServiceDisconnected(){ready=false;}
 });}
 private void queryProducts(){if(!ready){connect();return;}List<QueryProductDetailsParams.Product> req=new ArrayList<>();for(String id:IDS)req.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
  billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(req).build(),(r,res)->{if(r.getResponseCode()!=BillingClient.BillingResponseCode.OK){emit("copiloto:play-error",obj("Falha ao carregar produtos da Google Play."));return;}products.clear();products.addAll(res.getProductDetailsList());JSONArray arr=new JSONArray();for(ProductDetails p:products){JSONObject j=new JSONObject();try{j.put("productId",p.getProductId());j.put("formattedPrice",p.getOneTimePurchaseOfferDetails()==null?"":p.getOneTimePurchaseOfferDetails().getFormattedPrice());arr.put(j);}catch(Exception ignored){}}JSONObject d=new JSONObject();try{d.put("products",arr);}catch(Exception ignored){}emit("copiloto:play-products",d.toString());});
 }
 private void restore(){if(!ready)return;billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(r,list)->{if(r.getResponseCode()!=BillingClient.BillingResponseCode.OK)return;for(Purchase p:list){if(p.getPurchaseState()==Purchase.PurchaseState.PURCHASED)sendPurchase(p,true);else if(p.getPurchaseState()==Purchase.PurchaseState.PENDING)emit("copiloto:play-pending",obj("Compra pendente na Google Play."));}});}
 private void buy(String id){if(!ready){connect();emit("copiloto:play-error",obj("Conectando à Google Play. Tente novamente."));return;}ProductDetails found=null;for(ProductDetails p:products)if(p.getProductId().equals(id))found=p;if(found==null){queryProducts();emit("copiloto:play-error",obj("Produto não encontrado na Google Play."));return;}
  BillingFlowParams.ProductDetailsParams dp=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(found).build();BillingResult r=billing.launchBillingFlow(this,BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(dp)).build());if(r.getResponseCode()!=BillingClient.BillingResponseCode.OK)emit("copiloto:play-error",obj("Não foi possível iniciar a compra."));
 }
 @Override public void onPurchasesUpdated(BillingResult r,List<Purchase> list){if(r.getResponseCode()==BillingClient.BillingResponseCode.OK&&list!=null){for(Purchase p:list){if(p.getPurchaseState()==Purchase.PurchaseState.PURCHASED)sendPurchase(p,false);else if(p.getPurchaseState()==Purchase.PurchaseState.PENDING)emit("copiloto:play-pending",obj("Compra aguardando confirmação da Google Play."));}}else if(r.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED)emit("copiloto:play-cancelled",obj("Compra cancelada."));else emit("copiloto:play-error",obj("A Google Play não concluiu a compra."));}
 private void sendPurchase(Purchase p,boolean restored){JSONArray ids=new JSONArray();for(String id:p.getProducts())ids.put(id);JSONObject d=new JSONObject();try{d.put("products",ids);d.put("purchaseToken",p.getPurchaseToken());d.put("purchaseState",p.getPurchaseState());}catch(Exception ignored){}emit(restored?"copiloto:play-existing-purchase":"copiloto:play-purchase",d.toString());}
 private String obj(String msg){JSONObject j=new JSONObject();try{j.put("message",msg);}catch(Exception ignored){}return j.toString();}
 private void emit(String event,String detail){runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.dispatchEvent(new CustomEvent("+JSONObject.quote(event)+",{detail:"+detail+"}));",null);});}
 private final class NativeBridge{@JavascriptInterface public void queryProducts(){runOnUiThread(()->MainActivity.this.queryProducts());}@JavascriptInterface public void purchase(String id){runOnUiThread(()->buy(id));}}
 @Override protected void onDestroy(){if(billing!=null&&billing.isReady())billing.endConnection();if(web!=null){web.removeJavascriptInterface("NativePlayBilling");web.destroy();}super.onDestroy();}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
}