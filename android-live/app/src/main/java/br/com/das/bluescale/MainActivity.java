package br.com.das.bluescale;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/** HTTPS-only online client. No JS bridge, stored offline secrets or bypass of TLS errors. */
public final class MainActivity extends Activity {
    private WebView view;
    private Uri site;
    private boolean allowed(Uri url) {
        return url != null && "https".equalsIgnoreCase(url.getScheme()) &&
               site.getHost() != null && site.getHost().equalsIgnoreCase(url.getHost()) &&
               site.getPort() == url.getPort();
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        site = Uri.parse(BuildConfig.APP_URL);
        getWindow().setStatusBarColor(Color.rgb(8,16,32));
        getWindow().setNavigationBarColor(Color.rgb(8,16,32));
        view = new WebView(this);setContentView(view);
        WebSettings s=view.getSettings();
        s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);s.setAllowContentAccess(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(view,false);
        view.setWebChromeClient(new WebChromeClient());
        view.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest req) {
                Uri url=req.getUrl();
                if(allowed(url))return false;
                if("http".equalsIgnoreCase(url.getScheme())||"https".equalsIgnoreCase(url.getScheme())||
                   "mailto".equalsIgnoreCase(url.getScheme())||"tel".equalsIgnoreCase(url.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,url)); }catch(Exception ex) {
                        Toast.makeText(MainActivity.this,"Não foi possível abrir o link",Toast.LENGTH_SHORT).show();
                    }
                }
                return true;
            }
            @Override public void onReceivedSslError(WebView webView,SslErrorHandler handler,SslError error) {
                handler.cancel();
                Toast.makeText(MainActivity.this,"Conexão insegura bloqueada",Toast.LENGTH_LONG).show();
            }
        });
        view.setDownloadListener((url,userAgent,contentDisposition,mimeType,contentLength)->{
            Uri uri=Uri.parse(url);if(!allowed(uri)){
                Toast.makeText(this,"Download de outro domínio bloqueado",Toast.LENGTH_LONG).show();return;
            }
            try {
                String filename=android.webkit.URLUtil.guessFileName(url,contentDisposition,mimeType)
                        .replaceAll("[^a-zA-Z0-9._-]","_");
                DownloadManager.Request request=new DownloadManager.Request(uri);
                request.addRequestHeader("Cookie",CookieManager.getInstance().getCookie(url)==null?"":CookieManager.getInstance().getCookie(url));
                request.addRequestHeader("User-Agent",userAgent);
                request.setMimeType(mimeType==null?"application/octet-stream":mimeType);
                request.setTitle(filename);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,filename);
                ((DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(request);
                Toast.makeText(this,"Salvando em Downloads",Toast.LENGTH_SHORT).show();
            }catch(Exception ex){Toast.makeText(this,"Erro ao baixar. Tente pelo navegador.",Toast.LENGTH_LONG).show();}
        });
        if(!allowed(site)||"bluescale.example.invalid".equals(site.getHost())) {
            android.widget.TextView msg=new android.widget.TextView(this);
            msg.setText("BlueScale DAs\n\nConfigure BLUESCALE_URL no build com o endereço HTTPS real do servidor.");
            msg.setTextColor(Color.WHITE);msg.setTextSize(18);msg.setPadding(36,80,36,36);
            msg.setBackgroundColor(Color.rgb(8,16,32));setContentView(msg);
        }else view.loadUrl(BuildConfig.APP_URL);
    }
    @Override public void onBackPressed(){if(view!=null&&view.canGoBack())view.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(view!=null){view.stopLoading();view.destroy();}super.onDestroy();}
}
