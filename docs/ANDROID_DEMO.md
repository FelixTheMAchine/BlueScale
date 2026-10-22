# BlueScale DAs — Android v0.4, entrega técnica

## Natureza do artefato

O projeto Android foi criado e o HTML offline foi validado por 3 testes Node. Não foi compilado em APK neste ambiente, pois Android SDK / Gradle e acesso à rede de downloads estão indisponíveis. Os plugins conectados oferecem execução e inspeção de APK no emulador, mas não fazem a compilação por si só. O ZIP Android é **código-fonte**, não um APK, e uma execução GitHub Actions ou Android Studio é necessária para gerar o arquivo instalável.

## O que foi entregue

- Aplicativo Android Java mínimo com WebView contendo assets HTML/CSS/JS offline.
- Exportação de XLSX, CSV e JSON via ponte nativa Android (`ACTION_CREATE_DOCUMENT`).
- Interface mobile-first, tema escuro de azul elétrico, alternativas claro/ciano/violeta e assinatura DAs.
- Demonstração funcional sem backend com 60 membros fictícios, 6 diretorias, criação de festa, turnos, gerenciamento, validação, geração, publicação **local** e planilha de cinco abas.
- GitHub Actions `android-apk.yml` para compilar APK debug sem Android Studio local.
- Arquivo HTML portátil individual e pasta demo para abrir no navegador sem backend.

## Observações de segurança

A interface de demonstração não representa autenticação, LGPD, autorização RBAC ou infraestrutura de produção. Não deve ser usada com dados reais. Não há sincronização entre celulares. O motor não é CP-SAT nem garante ótimo global. Publicação nesta demo significa apenas que a versão foi marcada como publicada no aparelho.

## Próximas fases de produção

- Hospedagem HTTPS Next.js + Postgres com backups, autenticação e autorização por evento.
- Melhorias no algoritmo de otimização e diagnóstico, revisão de segurança e coleta de disponibilidade.
- Empacotamento do PWA remoto com Android Trusted Web Activity / Capacitor, incluindo login real.
- Testes em smartphones reais e CI android compile + testes E2E.
