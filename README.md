# BlueScale DAs — sistema colaborativo para escalas universitárias

**Versão:** `1.0.0-rc.1` · **Status:** código implementado, **não aprovado para produção** até passar build, banco real, E2E e testes Android.

O BlueScale é um aplicativo **mobile-first** que centraliza membros, eventos, turnos e escalas em PostgreSQL. Usuários em **celulares diferentes** acessam o mesmo servidor HTTPS com login individual. O projeto foi desenhado para a Gestão de Pessoas operar sem conhecimentos técnicos. Identidade azul elétrico/preto com logo exclusiva e assinatura **DAs**.

## Começar

**Quem só vai usar:** depois de publicado, abra o domínio HTTPS no celular. No Android/iOS é possível instalar como PWA na tela inicial. Nenhum usuário precisa de Docker, Node, código ou planilhas locais.

**Quem vai implantar:** consulte o passo a passo [docs/GO-LIVE.md](docs/GO-LIVE.md). Configure Postgres e hospedagem Next.js, crie `.env`, execute migrations e o bootstrap do admin; o banco **nasce sem membros e sem eventos**, não misturado com dados fictícios. O código antigo offline em `android-app` é um demonstrador; para múltiplos aparelhos use `android-live` ou o PWA online.

### Desenvolvimento local

Requisitos: Node.js 22+, npm, PostgreSQL 16+ (local/gerenciado) ou Docker Compose.

```bash
cp .env.example .env
# Configure NEXTAUTH_SECRET aleatório, ADMIN_EMAIL e ADMIN_PASSWORD >=12.
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed       # EM DEV: cria 60 membros fictícios e 5 postos
npm run dev
```

Abra `http://localhost:3000`. Conta de administrador: `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`. Os dados são persistidos no volume de PostgreSQL. Não inclua credenciais reais no Git.

### Backend + banco + solver local (opcional)

```bash
# Em .env: SOLVER_SERVICE_TOKEN=<segredo>; SOLVER_SERVICE_URL=http://solver:8090
# Configure NEXTAUTH_SECRET e ADMIN_PASSWORD.
docker compose --profile full --profile solver up -d --build
docker compose exec web npm run db:seed
```

O solver Python é **opcional**. Sem ele, o algoritmo TypeScript determinístico continua funcionando e verifica as restrições rígidas, mas não garante melhor solução global. O modo Python usa MILP (SciPy HiGHS), buscando primeiro cobertura viável, depois equidade e preferências. Leia [docs/ALGORITHM-ONLINE.md](docs/ALGORITHM-ONLINE.md).

### Primeiro lançamento com banco vazio

Em hospedagem de produção, rode `prisma migrate deploy` após configurar `DATABASE_URL` e `NEXTAUTH_SECRET`. Em seguida execute `NODE_ENV=production npm run db:seed` com ADMIN_EMAIL e ADMIN_PASSWORD. Em produção, este comando cria/atualiza **só o admin**; os 60 membros DEMO nunca são adicionados, exceto se a variável excepcional `ALLOW_DEMO_SEED=YES_I_UNDERSTAND` for configurada expressamente. Não use `prisma migrate reset` numa base com dados reais.

### APK Android

**GitHub:** a raiz contém o workflow `.github/workflows/android-apk.yml` para gerar o demonstrador offline automaticamente ao publicar a pasta no repositório e, sob demanda, gerar o APK online após configurar `BLUESCALE_URL` (servidor HTTPS já publicado). Veja [guia específico de GitHub e APK](docs/GITHUB-APK.md).


A pasta [`android-live/`](android-live/) contém um aplicativo WebView **HTTPS-only** com nova logo DAs, sessões do domínio e download de Excel/CSV para a pasta Downloads. Primeiro publique o servidor HTTPS. Configure `BLUESCALE_URL` como variável de repositório GitHub na versão Android e execute GitHub Actions para compilar `app-debug.apk`. [Instruções específicas](android-live/README.md). O APK não foi compilado nem testado em aparelho neste ambiente.

## Fluxo de uso para a GP

1. Administração abre **Acessos** e cria contas com papéis. Pode vincular conta a membro, alterar permissões ou senha.
2. GP cadastra ou importa equipe e cria festa, postos, horários e habilitações. Coordenadores são designados por evento.
3. Membros informam disponibilidade e preferências em **Minha Conta/Meus turnos**.
4. GP gera uma escala (MILP opcional), verifica descobertos, ajusta atribuições em rascunho, trava casos fixos e publica.
5. A versão publicada fica visível para coordenadores do evento e para cada membro **apenas em seus próprios turnos**.
6. Membros confirmam/recusam, pedem troca; GP e coordenação vinculada aprovam somente substitutos habilitados e disponíveis. Presenças são registradas em cada turno.
7. A GP exporta **Excel com cinco abas** ou CSV. Conteúdo sensível como telefone e localização residencial não é incluído.

Mudanças em rascunhos exigem revisão otimista; edições concorrentes retornam HTTP 409 e a UI atualiza a escala. A visualização consulta novas versões periodicamente (20 segundos). **Não há edição offline compartilhada nem WebSocket nesta release**.

## Stack e estrutura

| Camada | Tecnologias |
|---|---|
| Web/mobile | Next.js 15 App Router, React 19, TypeScript, Tailwind 4, PWA |
| Backend e acesso | Auth.js/NextAuth v4, RBAC + autorização por evento, Zod |
| Dados | PostgreSQL 16+, Prisma 6, migrations SQL, auditoria |
| Escala | Validador TS + heurística; microserviço Python/FastAPI/SciPy MILP opcional |
| Relatórios | ExcelJS (XLSX), CSV seguro |
| Qualidade | Node Test Runner, Vitest, Playwright, pytest, GitHub Actions |
| Android APK | Java 17/Android SDK 35, wrapper HTTPS |

Diretórios: `src/app` telas/rotas, `src/components` UI, `src/lib` autenticação/algoritmo/relatórios, `prisma` schema/migrations/seed, `solver-service` otimização matemática, `android-live` APK online, `tests` testes, `.github` CI, `docs` operação, riscos e arquitetura.

## Verificações disponíveis

```bash
node scripts.check-schema.mjs
npm run test:core
npm run test:mobile
npm run test:release
npm run test:security
python -m pytest solver-service/tests -q
# Quando houver npm, PostgreSQL, SDK e browser instalados:
npm run typecheck && npm run lint && npm run test && npm run build
npm run test:e2e
```

**Nesta entrega:** 16 testes Node do núcleo, quatro testes estáticos mobile, dois testes adicionais de release (um deles cobre 60 cenários variados), oito verificações estáticas de segurança e sete testes do solver Python passaram; total **37 casos de teste** (com dezenas de instâncias aleatórias dentro de casos). 20 modelos e oito enums conferidos contra migrations. Não houve Next build, Prisma migrate contra PostgreSQL, Vitest, Playwright real ou APK build neste ambiente por falta de dependências/infraestrutura.

Para informações detalhadas: [Resultado da release](docs/RELEASE-V1.md), [Operação e implantação](docs/GO-LIVE.md), [Segurança](docs/SECURITY-REVIEW-RC.md), [Otimização](docs/ALGORITHM-ONLINE.md).

## Segurança e produção

Mantenha segredos fora do repositório, PostgreSQL com backups automáticos e TLS, limite de tráfego via gateway/WAF e reporte de incidentes; teste restauração em base separada. A interface minimiza dados pessoais, não coleta GPS e não exporta dados residenciais. O service worker não guarda respostas autenticadas. Não libere para uso real até que a CI e os testes com dois aparelhos estejam verdes.

## Demonstração web no GitHub Pages

Após ativar Pages (Settings → Pages → Source: GitHub Actions), o workflow publica apenas a demonstração em [BlueScale DAs Web](https://felixthemachine.github.io/BlueScale/). **Dados permanecem no dispositivo e não sincronizam.** O [guia de hospedagem e privacidade](docs/HOSPEDAGEM-E-PRIVACIDADE.md) explica como hospedar a versão colaborativa de modo seguro.
