# Publicar no GitHub e gerar APK — BlueScale DAs

1. Crie um **novo repositório privado** chamado `BlueScale-DAs` em https://github.com/new (sem README inicial). Nunca use um repositório de outro projeto.
2. Publique o conteúdo da raiz deste projeto no repositório usando `git push` (veja abaixo). Não publique `.env`, senhas nem dados pessoais.
3. Na aba **Actions**, clique em **BlueScale DAs - APK Android** > **Run workflow** e escolha:
   - `demo-offline`: APK para testar interface e dados fictícios, sem servidor;
   - `online`: APK que acessa a plataforma compartilhada, **após** hospedar o backend em HTTPS.
4. Espere o workflow terminar e baixe o arquivo da seção **Artifacts**. Dentro do ZIP está `app-debug.apk`.

## Enviar com Git

```bash
git clone <pasta-do-projeto-ou-bundle> bluescale
cd bluescale
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/BlueScale-DAs.git
git push -u origin main
```

Se usar o bundle distribuído, substitua a primeira linha por:

```bash
git clone BlueScale-DAs-publicacao-github.bundle bluescale
```

## Para compilação online

- Implante o Next.js e o PostgreSQL e confira `https://SEU_DOMINIO/api/health`.
- No GitHub abra **Settings > Secrets and variables > Actions > Variables > New repository variable**.
- Nome `BLUESCALE_URL`; valor `https://SEU_DOMINIO` (sem `/` final).
- Volte a **Actions**, rode manualmente escolhendo `online`.

**Atenção:** o APK online não contém o servidor ou banco de dados. Sem serviço HTTPS funcionando não há colaboração entre celulares. A compilação não publica o backend. O APK `debug` não substitui uma build release assinada de produção.
