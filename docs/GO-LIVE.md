# Como colocar o BlueScale DAs em funcionamento na Gestão de Pessoas

## 1) Implantação central

Você precisará de um serviço Node 22 (por exemplo Vercel/Render/Fly.io) e PostgreSQL gerenciado. O Docker é opcional para quem desenvolve e desnecessário nos celulares. Configure:

- `DATABASE_URL`: string PostgreSQL com TLS do provedor (usar modo adequado a Prisma, pooling ou conexão direta nas migrations).
- `NEXTAUTH_URL`: endereço HTTPS real, sem barra ao final.
- `NEXTAUTH_SECRET`: 32+ bytes aleatórios (por exemplo `openssl rand -hex 32`). Nunca salvar no Git.
- `ADMIN_EMAIL` e `ADMIN_PASSWORD`: credenciais do primeiro administrador (senha forte).
- `SOLVER_SERVICE_URL` e `SOLVER_SERVICE_TOKEN` opcionais: serviço Python solver privado e alcançável pelo backend.

Aplique `npx prisma migrate deploy`. **Banco começa vazio**. Execute `npm run db:seed` em ambiente de produção **uma única vez** para criar/atualizar a conta inicial ADMIN; ele deliberadamente não importa 60 membros fictícios nem uma festa. Em desenvolvimento `npm run db:seed` cria o conjunto fictício. Não modifique `ALLOW_DEMO_SEED` em produção.

O endpoint `GET /api/health` deve retornar `{"status":"ok"}`. Configure TLS, domínio e política de backup com o provedor. Para backups manuais, use `scripts/backup.sh` com cliente `pg_dump`; testem restore em banco separado.

## 2) Ativar a equipe

1. Admin abre `https://seu-dominio/login` e troca sua senha em **Configurações**.
2. Cadastra seis diretorias e membros. Diretoria/permissões são conceitos diferentes: o membro está em uma diretoria, e a conta determina o acesso.
3. Abre **Acessos** e cria logins para diretores, GP, coordenadores e membros (senha provisória entregue em privado). Os membros precisam ter a conta vinculada a um cadastro.
4. Em **Eventos**, cria uma festa e seus postos. No detalhe, seleciona **Coordenadores desta festa**. Quem não for designado recebe 403 ao acessar o evento.
5. Os membros abrem **Meus turnos** para informar disponibilidade. A GP gera, revisa lacunas, publica e exporta.
6. Em aparelhos diferentes, gerentes veem a mesma escala compartilhada; atualizações são verificadas periodicamente. Se dois usuários editarem a mesma revisão, uma edição falha com 409 e solicita atualizar.
7. Membros confirmam, recusam ou indicam substitutos; GP ou coordenação vinculada analisa trocas. A aprovação refaz o verificador de restrições em transação.

## 3) Android / iOS

**Mais rápido:** abra HTTPS no Chrome/Safari e use **Adicionar à Tela de Início**. Logo DAs aparece no ícone, sem APK nem loja.

**APK Android:** pegue `android-live/`, configure `BLUESCALE_URL` no GitHub como variável de repositório e execute o workflow Android. Leia `android-live/README.md`. O APK é cliente web do servidor remoto; sem servidor HTTPS publicado não há banco multiaparelho.

## 4) Teste de aceite com dois aparelhos

- Celular A (ADMIN/PEOPLE) cria evento e gera escala; Celular B (PEOPLE) abre a mesma escala e visualiza.
- A e B editam a mesma revisão: um recebe `409` em vez de sobrescrever a outra alteração.
- Celular C (MEMBER) vê só seus turnos publicados, confirma, pede troca.
- Coordenador não designado tenta evento alheio: deve receber HTTP 403.
- Coordenador designado registra presença e aprova troca; pessoa indisponível não pode ser aprovada.
- Exportar e abrir cinco abas XLSX no celular; comparar com interface.
- Reiniciar app, desconectar/reconectar internet e confirmar dados persistidos no PostgreSQL.
- Simular cobertura insuficiente e conferir que nenhuma regra obrigatória foi violada.

## 5) Riscos a observar

- Não informe `DATABASE_URL` de produção em chats ou prints. Revogue segredos vazados.
- PostgreSQL deve ter backups automáticos diários e restauração ensaiada.
- Em caso de erro de autenticação ou Prisma, consulte logs sem armazenar senhas, dados residenciais ou tokens.
- Trocas são transacionais e atualizam a escala publicada; audite com registros `AuditLog`.
- A interface faz refresh a cada 20s e pode pedir atualização após mudanças simultâneas. Não há WebSocket ou modo offline multiusuário.
