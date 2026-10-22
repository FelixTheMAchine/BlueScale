# Segurança e privacidade — escopo e próximos passos

## Realizado no código

- Segregação `User`/`Member`, hash bcrypt com custo 12, sessões JWT do Auth.js, cookies SameSite gerenciados pela biblioteca.
- Checagem explícita de perfis em rotas com consulta ao papel atual no banco a cada requisição, permitindo revogação; membro não pode informar disponibilidade de outra pessoa. Dados de membros são filtrados para coordenadores (não recebem e-mail via listagem).
- APIs Zod + Prisma parametrizado, validação de content-type e origem em mutações. Sem GPS, endereços completos ou informações de consumo de álcool.
- Limite de 1,5 MB/500 linhas para upload; unicidade no banco, importação que sinaliza duplicados sem mesclar.
- Auditoria básica de alterações sem registrar senhas, telefone ou endereços.

## Antes de uso real (pendente)

- Limitação de tentativas de login distribuída (reverse proxy/Redis) e proteção contra força bruta.
- HTTPS obrigatório no deploy, HSTS/CSP adequados, monitoramento de dependências e auditoria externa de autorização.
- Criptografia dos backups, políticas de retenção/eliminação e procedimento LGPD para direitos dos titulares.
- Revisão de autorização por recurso/evento: no MVP, papéis de gestor têm escopo institucional.
- Testes de segurança automatizados (CSRF, XSS, IDOR, concorrência real), revisão de logs e parametrização de segredos por serviço gerenciador.
- Revisão formal de competências para funções com exigência legal; competências em cadastro não substituem verificação documental humana.

## Backup e restauração (ambiente local)

```bash
# Backup local: arquivo .sql NÃO deve ser versionado
 docker compose exec -T db pg_dump -U bluescale -d bluescale > backup.sql
# Restauração em banco vazio (ação destrutiva):
 cat backup.sql | docker compose exec -T db psql -U bluescale -d bluescale
```

Em produção, usar snapshots gerenciados, cópias fora da zona principal, criptografia em repouso e ensaios periódicos de restauração.
