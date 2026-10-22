# BlueScale — Hospedagem e segurança

## Código aberto e dados privados

O repositório público guarda **somente o código-fonte e dados fictícios**. Não faça commits de listas reais de membros, telefones, endereços, senhas, planilhas reais, banco SQLite, backups, arquivos `.env` ou exportações da GP.

## Demonstração web no GitHub Pages

O workflow `.github/workflows/pages-demo.yml` publica apenas a pasta `demo/`. O endereço, quando ativado e implantado, é `https://felixthemachine.github.io/BlueScale/`. Essa demonstração usa `localStorage` **individual por navegador/dispositivo**. A edição em um celular **não aparece** no outro. Não usar com dados pessoais reais.

Se o workflow falhar na etapa `configure-pages`, ative **Settings → Pages → Build and deployment → Source → GitHub Actions** na interface do GitHub. O administrador precisa fazer isso uma única vez.

## Aplicação compartilhada de verdade

O app Next.js em `src/` depende de backend ativo, HTTPS, `DATABASE_URL` de PostgreSQL **privado**, segredo de sessão e credenciais de administrador fornecidas via variáveis de ambiente, não no GitHub.

Uma opção é Railway, que hospeda o serviço web e o PostgreSQL em serviços privados do mesmo projeto. Antes de subir:

1. Conecte Railway ao repositório público `FelixTheMAchine/BlueScale`.
2. Provisione PostgreSQL e associe a conexão privada à variável `DATABASE_URL` do serviço Next.js.
3. Configure `NEXTAUTH_URL` como a URL HTTPS pública, `NEXTAUTH_SECRET` gerado aleatoriamente, `ADMIN_EMAIL` e `ADMIN_PASSWORD` com senha forte. Nunca faça commit desses valores.
4. Aplique as migrações com `npx prisma migrate deploy`; execute um seed de administrador **sem** ativar dados demo em produção. Verifique a implementação do seed antes de usá-lo.
5. Garanta o serviço de otimização (ou fallback local validado), autenticação, backups, proteção de edição concorrente e logs.
6. Teste com duas contas de diretores em aparelhos diferentes e autorizações diferentes antes de adicionar membros reais.

**Atenção:** não confundir GitHub Pages com o servidor Next.js. GitHub Pages não hospeda PostgreSQL nem a API colaborativa.
