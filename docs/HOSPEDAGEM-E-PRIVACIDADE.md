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
4. O contêiner executa automaticamente `npx prisma migrate deploy` e `npm run db:bootstrap` (administrador apenas quando ainda não existe). Não execute o seed de demonstração em produção.
5. Garanta o serviço de otimização (ou fallback local validado), autenticação, backups, proteção de edição concorrente e logs.
6. Teste com duas contas de diretores em aparelhos diferentes e autorizações diferentes antes de adicionar membros reais.

**Atenção:** não confundir GitHub Pages com o servidor Next.js. GitHub Pages não hospeda PostgreSQL nem a API colaborativa.

## Railway preparado para implantação móvel

O `railway.json` determina build Docker e healthcheck real; o `Dockerfile` não embute qualquer string real de banco e executa migrations/primeiro administrador. São obrigatórias as variáveis **privadas** `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Depois que a base tiver um administrador, mudanças em `ADMIN_PASSWORD` no ambiente **não redefinem** a senha existente. Troque senhas pelo próprio aplicativo.

**Situação em 21/10/2026:** Railway apresentou incidente público com builds e novas implantações suspensos e a API temporariamente afetada. A criação automatizada do projeto falhou com `Paused temporarily`; não houve provisionamento nem contratação.
