# BlueScale DAs — release 1.0.0-rc.1 (candidato de implantação)

**Não confundir com versão aprovada para produção.** Nesta sessão o app Next.js não pôde ser compilado por ausência de dependências (`registry.npmjs.org` não resolvido), PostgreSQL/Docker não estavam disponíveis e o APK não pôde ser construído por ausência de Android SDK/Gradle. A suíte de CI prepara verificações reais quando rodar em infraestrutura com acesso a esses serviços.

## O que foi implementado em código

- **Banco único compartilhado**: PostgreSQL + Prisma; migração de vínculo coordenador-evento e de tentativas de login; dados são server-side, não no celular. Uma instalação nova inicia vazia: `prisma migrate deploy` não cadastra membros ou eventos; executar `db:seed` em produção cria apenas admin, salvo liberação explícita de DEMO.
- **Acesso**: login com senha bcrypt e sessão JWT/HTTP-only, contas pelo administrador `/usuarios`, papéis ADMIN/PEOPLE/EVENT_COORDINATOR/MEMBER, vínculo explícito de coordenadores a eventos.
- **Gerenciamento**: membros/CSV/XLSX, eventos e turnos, disponibilidade, validação, publicação, Excel/CSV, confirmações, substituições e registro de presença.
- **Colaboração**: revisões numéricas + transações SERIALIZABLE e respostas 409; as telas de escala atualizam a cada 20 segundos, avisando quando precisar atualizar.
- **Otimização**: servidor MILP opcional, com cobertura lexicográfica obrigatória, equidade histórica e preferências, heurística de fallback e validação TS independente antes de salvar.
- **Identidade**: logo BlueScale com assinatura DAs, app mobile-first, PWA instalável e wrapper Android HTTPS sem bridge JS e com download de XLSX/CSV.
- **Segurança**: controle de autorização no backend, rate limit persistente de login, acesso por evento, auditoria de operações, senhas resetáveis, planilhas sem dados residenciais ou telefones, export CSV protege formula injection.

## Evidências dos testes executados localmente

| Checagem | Resultado |
|---|---|
| `npm run test:core` | 16/16 passaram |
| `npm run test:mobile` | 4/4 passaram (estáticos) |
| `npm run test:security` | 8/8 passaram (checagens estáticas do código) |
| `npm run test:release` | 2/2 passaram, um deles valida 60 cenários de escalas |
| `python -m pytest solver-service/tests -q` | 7/7 passaram (18 seeds aleatórias incluídas) |
| Solver grande | 60 pessoas, 30 turnos, cobertura 100% em ~0,8s; exemplo sintético sem restrições especiais |
| Parser TypeScript/TSX | 67 arquivos, 0 falhas sintáticas após alterações |
| YAML Compose/GitHub Actions | arquivos interpretáveis por parser YAML; **não confirma execução** |

## Não verificados / faltantes para produção

1. `npm install`, `npm run typecheck`, `npm run lint`, `npm run build` e Vitest dependente de `node_modules`.
2. Aplicação de migrations em PostgreSQL real, usuário admin, sessão/Auth.js, proteção concorrente end-to-end, importação e exportação Excel real.
3. Playwright em navegador real; implantação Vercel/provedor PostgreSQL; segurança e performance sob tráfego simultâneo.
4. Build de `android-live` e instalação em Android real. APK só existirá após publicar backend HTTPS e executar GitHub Actions/Gradle.
5. Testes de UX com integrantes da GP; processos de retenção LGPD; backups e restauração executados.

## Recursos não concluídos nesta release

- Notificação push/email automática, drag-and-drop com desfazer/refazer completo, comparador visual entre versões, regeneração parcial ótima, configurações administrativas de pesos dos cinco critérios, otimização do fator de posto preferido e competências distribuídas no objetivo, exportação PDF, convites por e-mail, observabilidade gerenciada.
- O algoritmo MILP minimiza vagas descobertas primeiro; preferências e equidade vêm depois. Respeita os limites obrigatórios modelados. Não é a implementação CP-SAT OR-Tools inicialmente preferida: usa **SciPy HiGHS MILP**, escolhido para poder testar a otimização neste ambiente.

## Portas de liberação

**Antes de dar acesso a pessoas reais:** rodar CI verde + smoke E2E com dois celulares + validação de permissão e permuta + testes de backups + revisar LGPD/termos internos e usar domínio HTTPS com segredos novos. Nunca usar a demonstração offline como banco compartilhado.
