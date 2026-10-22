# BlueScale DAs — Aplicativo Android demonstrativo (v0.4)

Este é um projeto Android nativo **compilável** que embute uma demonstração offline do BlueScale.
Não inclui o backend Next.js / PostgreSQL do MVP web e **não é um aplicativo multiusuário**.
É um ambiente para testar interface, geração e exportação .xlsx pelo celular.

## Criar o APK sem Docker, direto pelo GitHub

1. Crie um **repositório privado novo** no seu GitHub.
2. Envie o **conteúdo desta pasta** `android-app/` para a raiz do repositório, incluindo `.github/workflows/android-apk.yml`.
3. Abra a guia **Actions** no GitHub e execute o fluxo "APK Android BlueScale DAs" (ou faça push à branch `main`).
4. Abra a execução concluída, seção **Artifacts**, e baixe `BlueScale-DAs-Demo-Android.zip`.
5. Extraia e instale o arquivo `app-debug.apk` no Android. O sistema poderá pedir autorização para instalar APKs dessa origem.

O GitHub Actions instala o ambiente Android/Gradle e compila o APK. É necessário que o workflow tenha permissão de execução e acesso à rede do GitHub. O APK de depuração é assinado automaticamente com chave de debug. **Não use como distribuição pública.**

## Android Studio (alternativa)

1. Instale Android Studio (com SDK Android API 35, Build Tools e JDK 17).
2. Abra esta pasta `android-app` no Android Studio.
3. Execute **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. APK esperado: `app/build/outputs/apk/debug/app-debug.apk`.

## O que funciona no APK

- Sem servidor e sem Docker: inicia offline e armazena alterações **somente no próprio aparelho** (WebView localStorage).
- 60 membros fictícios, equipe, diretoria, eventos, turnos, regras simples e quadros.
- Geração determinística segura para as restrições básicas do motor de demonstração.
- Edição manual com validação, confirmação, travamento e publicação **local**.
- Exportação XLSX, CSV e backup JSON para a pasta escolhida, via seletor de documentos Android.
- Modo claro/escuro, cores, assinatura DAs e navegação por abas.

## O que NÃO funciona / limites

- Sem autenticação real, sincronização, convites, notificações, banco na nuvem, sistema RBAC ou troca entre celulares.
- Sem solver CP-SAT ou garantia de cobertura ótima. Pode deixar vagas descobertas mesmo quando outra solução combinatória seria viável.
- O período disponível é representado na demonstração por horas relativas ao início do evento, não por agenda semanal.
- Não usar dados pessoais reais: dados locais em armazenamento WebView não são criptografados especificamente pelo BlueScale.
- Este pacote contém o projeto e **não contém APK compilado**, caso o compilador Android não tenha sido executado.

## Arquitetura de evolução

A versão de produção deverá apontar para o BlueScale web com backend hospedado em HTTPS e autenticação, com PWA ou contêiner Android remoto autenticado. Esta versão offline se destina exclusivamente à experiência e teste de usabilidade, sem depender dos serviços externos.
