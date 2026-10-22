# BlueScale DAs — Android Online

**Este projeto é um wrapper WebView seguro, não uma cópia offline dos dados.** Ele abre a aplicação Next.js publicada em HTTPS; todos os aparelhos usam o mesmo PostgreSQL remoto. A área privada nunca é armazenada em assets do APK.

## Antes de compilar

1. Hospede o BlueScale web e configure `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` e conta admin.
2. Verifique `https://seu-dominio/api/health` e login em um navegador Android.
3. Defina `BLUESCALE_URL=https://seu-dominio` em variável de repositório do GitHub (`Settings → Secrets and variables → Actions → Variables`). A URL precisa ser HTTPS.
4. Envie os arquivos **desta pasta** para um repositório Android separado. O workflow está em `.github/workflows/android-apk.yml` dentro dela.
5. Execute `Actions → Build BlueScale DAs Android Online → Run workflow` e baixe o artefato `BlueScale-DAs-Online-APK`.

Também é possível compilar localmente com Android SDK 35, Java 17 e Gradle 8.9:

```bash
BLUESCALE_URL=https://seu-dominio gradle :app:assembleDebug
```

O resultado será `app/build/outputs/apk/debug/app-debug.apk`. **APK de debug, não pronto para Play Store.** Para publicação oficial, gerar assinatura release e cumprir requisitos das lojas.

**Segurança:** abre somente origem HTTPS configurada internamente; navegação externa usa browser; WebView não possui bridge JS nativa, acesso a arquivos locais desabilitado, TLS inválido é rejeitado; DownloadManager salva XLSX/CSV em Downloads com os cookies da sessão do próprio domínio. Testar download e login em aparelhos reais.

Quando nenhuma URL é configurada, a compilação local mostra uma tela de configuração e não faz conexões a servidores fictícios. O CI oficial bloqueia build sem variável de URL.
