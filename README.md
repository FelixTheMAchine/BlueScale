# BlueScale DAs

Sistema de escalas para eventos universitários, desenvolvido por DAs.

> **Estado da publicação:** repositório inicializado; código-fonte completo ainda precisa ser enviado a partir do pacote BlueScale-DAs-publicacao-github.zip entregue nesta conversa. **Não use em produção antes de executar os testes e configurar infraestrutura HTTPS/PostgreSQL.**

## Instalação do código-fonte

1. Extraia `BlueScale-DAs-publicacao-github.zip` no computador.
2. Envie **o conteúdo extraído, mantendo as pastas**, a este repositório (não apenas o arquivo ZIP).
3. Quando `android-app/` e `.github/workflows/android-apk.yml` estiverem no repositório, acesse **Actions > BlueScale DAs - APK Android > Run workflow**, selecione `demo-offline` e faça o download do artefato.
4. A edição `online` só deve ser compilada depois de publicar o backend em HTTPS e configurar a variável `BLUESCALE_URL` nas variáveis de Actions.

## Segurança

- Nunca envie `.env`, credenciais ou arquivos com dados pessoais.
- O repositório está **público** neste momento. Para torná-lo privado: Settings > General > Danger Zone > Change repository visibility.
- O APK `demo-offline` usa dados locais de demonstração, e não sincroniza informações entre aparelhos.

Consulte o README completo que acompanha o pacote para arquitetura, banco de dados e testes.
