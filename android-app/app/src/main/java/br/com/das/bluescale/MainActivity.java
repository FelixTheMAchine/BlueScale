package br.com.das.bluescale;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.OutputStream;

/** Demo offline. No credentials or personal member data should be used. */
public class MainActivity extends Activity {
    private static final int CREATE_FILE = 631;
    private static final int MAX_BYTES = 15 * 1024 * 1024;
    private WebView webView;
    private byte[] fileToSave;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(android.graphics.Color.rgb(8, 13, 25));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(8, 13, 25));
        webView = new WebView(this);
        setContentView(webView);
        WebSettings opts = webView.getSettings();
        opts.setJavaScriptEnabled(true);
        opts.setDomStorageEnabled(true);
        opts.setAllowFileAccess(true);
        opts.setAllowContentAccess(false);
        opts.setAllowFileAccessFromFileURLs(false);
        opts.setAllowUniversalAccessFromFileURLs(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                return !("file".equals(uri.getScheme()) && "/android_asset/index.html".equals(uri.getPath()));
            }
        });
        webView.addJavascriptInterface(new ExportBridge(), "BlueScaleAndroid");
        webView.loadUrl("file:///android_asset/index.html");
    }

    public final class ExportBridge {
        @JavascriptInterface
        public void saveBase64(String value, String name, String mime) {
            if (value == null || value.length() > MAX_BYTES * 2) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Arquivo muito grande", Toast.LENGTH_LONG).show());
                return;
            }
            try {
                final byte[] bytes = Base64.decode(value, Base64.DEFAULT);
                if (bytes.length > MAX_BYTES) throw new IllegalArgumentException("too large");
                String filename = name == null ? "BlueScale.xlsx" : name.replaceAll("[^a-zA-Z0-9._-]", "_");
                String type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                if ("application/json".equals(mime)) type="application/json";
                else if (mime != null && mime.startsWith("text/csv")) type="text/csv";
                final String exportMime=type;
                runOnUiThread(() -> {
                    fileToSave = bytes;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(exportMime);
                    intent.putExtra(Intent.EXTRA_TITLE, filename);
                    startActivityForResult(intent, CREATE_FILE);
                });
            } catch (Exception ex) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Falha ao preparar arquivo", Toast.LENGTH_LONG).show());
            }
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != CREATE_FILE) return;
        if (resultCode == RESULT_OK && data != null && data.getData() != null && fileToSave != null) {
            try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                if (out == null) throw new IllegalStateException("No output stream");
                out.write(fileToSave);
                Toast.makeText(this, "Arquivo salvo com sucesso", Toast.LENGTH_SHORT).show();
            } catch (Exception ex) {
                Toast.makeText(this, "Erro ao salvar arquivo", Toast.LENGTH_LONG).show();
            }
        }
        fileToSave = null;
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (webView != null) { webView.removeJavascriptInterface("BlueScaleAndroid"); webView.destroy(); }
        super.onDestroy();
    }
}
